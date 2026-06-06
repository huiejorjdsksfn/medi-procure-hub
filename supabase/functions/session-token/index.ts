/**
 * session-token Edge Function v1.0
 * EL5 MediProcure / ProcurBosse
 *
 * Issues, validates, and refreshes session tokens that carry
 * the user's roles and profile — eliminating repeated DB round-trips
 * on every page load/refresh.
 *
 * Actions:
 *   POST { action: "issue" }                → issues a new token for the calling user
 *   POST { action: "validate", token }      → validates token, returns roles + profile
 *   POST { action: "refresh", token }       → extends expiry 24h
 *   POST { action: "revoke",  token }       → marks token revoked
 *   POST { action: "revoke_all" }           → revokes all tokens for calling user
 *   GET  ?action=validate&token=xxx         → GET form of validate (for middleware use)
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY     = Deno.env.get("SUPABASE_ANON_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function generateToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return "ept_" + Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  // ── Auth: get calling user from JWT ──────────────────────────
  const authHeader = req.headers.get("authorization") || "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");

  // Admin client (service role) for token ops
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // User client to verify JWT
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });

  let action: string;
  let body: Record<string, string> = {};

  if (req.method === "GET") {
    const url = new URL(req.url);
    action = url.searchParams.get("action") || "validate";
    body.token = url.searchParams.get("token") || "";
  } else {
    try { body = await req.json(); } catch { body = {}; }
    action = body.action || "issue";
  }

  // ── ACTION: issue ─────────────────────────────────────────────
  if (action === "issue") {
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return json({ ok: false, error: "Unauthorized" }, 401);

    // Fetch roles
    const { data: roleRows } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const roles = (roleRows || []).map((r: any) => r.role as string);

    // Fetch profile
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name,department,phone_number,avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    const token = generateToken();
    const now   = new Date();
    const exp   = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const { error: insertErr } = await admin.from("user_session_tokens").insert({
      user_id:    user.id,
      token,
      roles,
      profile:    profile || {},
      issued_at:  now.toISOString(),
      expires_at: exp.toISOString(),
      user_agent: req.headers.get("user-agent") || null,
      ip_address: req.headers.get("x-forwarded-for")?.split(",")[0].trim() || null,
    });

    if (insertErr) return json({ ok: false, error: insertErr.message }, 500);

    return json({
      ok: true,
      token,
      roles,
      profile: profile || {},
      user_id: user.id,
      expires_at: exp.toISOString(),
    });
  }

  // ── ACTION: validate ──────────────────────────────────────────
  if (action === "validate") {
    const token = body.token;
    if (!token) return json({ ok: false, valid: false, error: "No token" }, 400);

    const { data: row, error } = await admin
      .from("user_session_tokens")
      .select("*")
      .eq("token", token)
      .eq("is_revoked", false)
      .maybeSingle();

    if (error || !row) return json({ ok: true, valid: false, error: "Token not found" });
    if (new Date(row.expires_at) < new Date()) {
      return json({ ok: true, valid: false, expired: true });
    }

    // Touch last_used_at
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
    });
  }

  // ── ACTION: refresh ───────────────────────────────────────────
  if (action === "refresh") {
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return json({ ok: false, error: "Unauthorized" }, 401);

    const token = body.token;
    if (!token) return json({ ok: false, error: "No token" }, 400);

    // Re-fetch roles from DB for fresh data
    const { data: roleRows } = await admin
      .from("user_roles").select("role").eq("user_id", user.id);
    const roles = (roleRows || []).map((r: any) => r.role as string);

    const { data: profile } = await admin
      .from("profiles")
      .select("full_name,department,phone_number,avatar_url")
      .eq("id", user.id).maybeSingle();

    const exp = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const { error } = await admin.from("user_session_tokens")
      .update({
        roles,
        profile:       profile || {},
        expires_at:    exp.toISOString(),
        last_used_at:  new Date().toISOString(),
        is_revoked:    false,
      })
      .eq("token", token)
      .eq("user_id", user.id);

    if (error) return json({ ok: false, error: error.message }, 500);

    return json({ ok: true, roles, profile: profile || {}, expires_at: exp.toISOString() });
  }

  // ── ACTION: revoke ────────────────────────────────────────────
  if (action === "revoke") {
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return json({ ok: false, error: "Unauthorized" }, 401);

    const { error } = await admin.from("user_session_tokens")
      .update({ is_revoked: true })
      .eq("token", body.token)
      .eq("user_id", user.id);

    return json({ ok: !error, error: error?.message });
  }

  // ── ACTION: revoke_all ────────────────────────────────────────
  if (action === "revoke_all") {
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return json({ ok: false, error: "Unauthorized" }, 401);

    const { error } = await admin.from("user_session_tokens")
      .update({ is_revoked: true })
      .eq("user_id", user.id);

    return json({ ok: !error, error: error?.message });
  }

  return json({ ok: false, error: `Unknown action: ${action}` }, 400);
});
