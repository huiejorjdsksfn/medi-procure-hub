/**
 * session-token Edge Function v2.0 — SECURITY HARDENED
 * EL5 MediProcure / ProcurBosse
 *
 * Issues, validates, and refreshes session tokens that carry
 * the user's roles and profile — eliminating repeated DB round-trips
 * on every page load/refresh.
 *
 * SECURITY FIXES (v2.0):
 *   1. `validate` previously trusted ANY token string with NO ownership
 *      check — a leaked/stolen token (XSS, shared device, log exposure)
 *      could be replayed from anywhere, forever, to pull another user's
 *      roles + profile. Now requires a valid Supabase JWT and verifies
 *      the JWT's user matches the token's owner before returning data.
 *   2. GET-with-token-in-querystring removed entirely — query strings
 *      leak into server logs, proxies, and browser history. POST only.
 *   3. `refresh` now ROTATES the opaque token value (issues a new one,
 *      invalidates the old) instead of reusing the same string forever.
 *      This caps a leaked token's useful lifetime to one refresh cycle
 *      (≤30 min) instead of indefinitely.
 *   4. CORS origin is now configurable via ALLOWED_ORIGINS env var
 *      (comma-separated) instead of a permissive wildcard, with a safe
 *      same-origin reflection fallback.
 *
 * Actions (POST only):
 *   { action: "issue" }                → issues a new token for the calling user
 *   { action: "validate", token }      → validates token; requires caller's JWT
 *                                         to match the token's owner
 *   { action: "refresh", token }       → rotates token, extends expiry 24h
 *   { action: "revoke",  token }       → marks token revoked
 *   { action: "revoke_all" }           → revokes all tokens for calling user
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY     = Deno.env.get("SUPABASE_ANON_KEY")!;

// Configurable allow-list; falls back to reflecting the request origin
// (safer than a blanket "*" while not requiring a hardcoded domain here).
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") || "")
  .split(",").map(s => s.trim()).filter(Boolean);

function corsHeaders(origin: string | null) {
  let allowOrigin = "null";
  if (ALLOWED_ORIGINS.length > 0) {
    allowOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  } else if (origin) {
    allowOrigin = origin; // reflect — still safe since every action below requires JWT/ownership
  }
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(data: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function generateToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return "ept_" + Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const CORS = corsHeaders(origin);

  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  // POST only — GET-with-token-in-querystring removed (log/history leak risk)
  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405, CORS);
  }

  // ── Auth: get calling user from JWT ──────────────────────────
  const authHeader = req.headers.get("authorization") || "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");

  // Admin client (service role) for token storage ops — bypasses RLS,
  // so every action that touches it MUST independently verify ownership.
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // User client to verify JWT and resolve the authenticated caller
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });

  let body: Record<string, string> = {};
  try { body = await req.json(); } catch { body = {}; }
  const action = body.action || "issue";

  // Resolve the authenticated caller once — every action below needs it.
  const { data: { user: caller }, error: callerErr } = await userClient.auth.getUser();
  const isAuthenticated = !callerErr && !!caller;

  // ── ACTION: issue ─────────────────────────────────────────────
  if (action === "issue") {
    if (!isAuthenticated) return json({ ok: false, error: "Unauthorized" }, 401, CORS);

    const { data: roleRows } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);
    const roles = (roleRows || []).map((r: any) => r.role as string);

    const { data: profile } = await admin
      .from("profiles")
      .select("full_name,department,phone_number,avatar_url")
      .eq("id", caller.id)
      .maybeSingle();

    const token = generateToken();
    const now   = new Date();
    const exp   = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const { error: insertErr } = await admin.from("user_session_tokens").insert({
      user_id:    caller.id,
      token,
      roles,
      profile:    profile || {},
      issued_at:  now.toISOString(),
      expires_at: exp.toISOString(),
      user_agent: req.headers.get("user-agent") || null,
      ip_address: req.headers.get("x-forwarded-for")?.split(",")[0].trim() || null,
    });

    if (insertErr) return json({ ok: false, error: insertErr.message }, 500, CORS);

    return json({
      ok: true,
      token,
      roles,
      profile: profile || {},
      user_id: caller.id,
      expires_at: exp.toISOString(),
    }, 200, CORS);
  }

  // ── ACTION: validate ──────────────────────────────────────────
  // SECURITY FIX: now requires a valid JWT AND verifies the JWT's user
  // matches the token's owner. A bare token string is no longer enough
  // to pull roles/profile — closing the token-replay-without-auth hole.
  if (action === "validate") {
    if (!isAuthenticated) return json({ ok: false, valid: false, error: "Unauthorized" }, 401, CORS);

    const token = body.token;
    if (!token) return json({ ok: false, valid: false, error: "No token" }, 400, CORS);

    const { data: row, error } = await admin
      .from("user_session_tokens")
      .select("*")
      .eq("token", token)
      .eq("is_revoked", false)
      .maybeSingle();

    if (error || !row) return json({ ok: true, valid: false, error: "Token not found" }, 200, CORS);

    // Ownership check — the JWT holder must be the token's original owner
    if (row.user_id !== caller.id) {
      return json({ ok: true, valid: false, error: "Token does not belong to caller" }, 200, CORS);
    }

    if (new Date(row.expires_at) < new Date()) {
      return json({ ok: true, valid: false, expired: true }, 200, CORS);
    }

    await admin.from("user_session_tokens")
      .update({ last_used_at: new Date().toISOString() })
      .eq("token", token);

    return json({
      ok:         true,
      valid:      true,
      user_id:    row.user_id,
      roles:      row.roles,
      profile:    row.profile,
      issued_at:  row.issued_at,
      expires_at: row.expires_at,
    }, 200, CORS);
  }

  // ── ACTION: refresh ───────────────────────────────────────────
  // SECURITY FIX: rotates the opaque token value on every refresh.
  // The old token string is invalidated immediately, so a leaked old
  // token stops working as soon as the legitimate client's background
  // refresh cycle fires (≤30 min), instead of being valid indefinitely.
  if (action === "refresh") {
    if (!isAuthenticated) return json({ ok: false, error: "Unauthorized" }, 401, CORS);

    const oldToken = body.token;
    if (!oldToken) return json({ ok: false, error: "No token" }, 400, CORS);

    // Confirm the old token actually belongs to this caller before rotating
    const { data: existing } = await admin
      .from("user_session_tokens")
      .select("user_id")
      .eq("token", oldToken)
      .eq("is_revoked", false)
      .maybeSingle();

    if (!existing || existing.user_id !== caller.id) {
      return json({ ok: false, error: "Unauthorized" }, 401, CORS);
    }

    // Re-fetch roles from DB for fresh data
    const { data: roleRows } = await admin
      .from("user_roles").select("role").eq("user_id", caller.id);
    const roles = (roleRows || []).map((r: any) => r.role as string);

    const { data: profile } = await admin
      .from("profiles")
      .select("full_name,department,phone_number,avatar_url")
      .eq("id", caller.id).maybeSingle();

    const newToken = generateToken();
    const exp = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Rotate: write the new token value onto the same row, invalidating the old string
    const { error } = await admin.from("user_session_tokens")
      .update({
        token:         newToken,
        roles,
        profile:       profile || {},
        expires_at:    exp.toISOString(),
        last_used_at:  new Date().toISOString(),
        is_revoked:    false,
      })
      .eq("token", oldToken)
      .eq("user_id", caller.id);

    if (error) return json({ ok: false, error: error.message }, 500, CORS);

    return json({
      ok: true, token: newToken, roles, profile: profile || {}, expires_at: exp.toISOString(),
    }, 200, CORS);
  }

  // ── ACTION: revoke ────────────────────────────────────────────
  if (action === "revoke") {
    if (!isAuthenticated) return json({ ok: false, error: "Unauthorized" }, 401, CORS);

    const { error } = await admin.from("user_session_tokens")
      .update({ is_revoked: true })
      .eq("token", body.token)
      .eq("user_id", caller.id);

    return json({ ok: !error, error: error?.message }, 200, CORS);
  }

  // ── ACTION: revoke_all ────────────────────────────────────────
  if (action === "revoke_all") {
    if (!isAuthenticated) return json({ ok: false, error: "Unauthorized" }, 401, CORS);

    const { error } = await admin.from("user_session_tokens")
      .update({ is_revoked: true })
      .eq("user_id", caller.id);

    return json({ ok: !error, error: error?.message }, 200, CORS);
  }

  return json({ ok: false, error: `Unknown action: ${action}` }, 400, CORS);
});
