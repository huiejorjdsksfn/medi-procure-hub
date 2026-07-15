/**
 * admin-delete-user v1 — true full delete
 * Removes user_roles, profile, and the actual auth.users account (not just
 * the profile row, which previously left an orphaned login with no profile).
 * Caller-auth pattern matches admin-create-user.
 */
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
  "Access-Control-Max-Age": "86400",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (req.method === "GET") {
    return json({ ok: true, version: 1, ts: new Date().toISOString() });
  }

  try {
    const url  = env("SUPABASE_URL");
    const anon = env("SUPABASE_ANON_KEY");
    const svc  = env("SUPABASE_SERVICE_ROLE_KEY");

    // ── Caller auth ──────────────────────────────────────────────────────
    const auth = req.headers.get("Authorization") || req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : auth;
    if (!token) return json({ error: "Missing Authorization header" }, 401);

    const callerClient = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: ud, error: ue } = await callerClient.auth.getUser();
    if (ue || !ud?.user?.id) {
      return json({ error: `Auth validation failed: ${ue?.message || "invalid token"}` }, 401);
    }
    const callerId = ud.user.id;

    const adminClient = createClient(url, svc, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: cRoles } = await adminClient
      .from("user_roles").select("role").eq("user_id", callerId);
    const isAdmin = (cRoles || []).some((r: any) =>
      ["admin", "superadmin", "webmaster"].includes(r.role)
    );
    if (!isAdmin) return json({ error: "Forbidden — admin/superadmin/webmaster required" }, 403);

    // ── Parse body ─────────────────────────────────────────────────────────
    const body = await req.json().catch(() => ({}));
    const { user_id } = body;
    if (!user_id) return json({ error: "user_id is required" }, 400);
    if (user_id === callerId) return json({ error: "You cannot delete your own account" }, 400);

    // ── Step 1: remove role assignments ─────────────────────────────────────
    const { error: rolesErr } = await adminClient.from("user_roles").delete().eq("user_id", user_id);
    if (rolesErr) return json({ error: `Failed to remove roles: ${rolesErr.message}` }, 500);

    // ── Step 2: remove the profile row ──────────────────────────────────────
    // (Foreign keys from audit/log/business tables to profiles(id) are
    // ON DELETE SET NULL, so history is preserved — this no longer fails.)
    const { error: profileErr } = await adminClient.from("profiles").delete().eq("id", user_id);
    if (profileErr) return json({ error: `Failed to delete profile: ${profileErr.message}` }, 500);

    // ── Step 3: remove the actual auth account ──────────────────────────────
    const { error: authErr } = await adminClient.auth.admin.deleteUser(user_id);
    if (authErr) {
      // Profile is already gone; surface this clearly rather than silently
      // leaving an orphaned auth account with no profile.
      return json({ error: `Profile deleted, but auth account removal failed: ${authErr.message}`, partial: true }, 500);
    }

    // ── Step 4: audit log (best-effort) ─────────────────────────────────────
    await adminClient.from("admin_activity_log").insert({
      user_id: callerId,
      action: "user_deleted",
      entity_type: "profiles",
      entity_id: user_id,
      severity: "warning",
      description: `Admin ${callerId} fully deleted user ${user_id} (auth + profile + roles)`,
    }).then(() => {}).catch(() => {});

    return json({ ok: true, deleted_user_id: user_id });
  } catch (err: any) {
    return json({ error: err?.message || "internal server error" }, 500);
  }
});

function env(k: string) {
  const v = Deno.env.get(k);
  if (!v) throw new Error(`${k} is not configured`);
  return v;
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
