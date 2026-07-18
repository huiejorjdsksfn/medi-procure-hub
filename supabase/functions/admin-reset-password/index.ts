/**
 * admin-reset-password v1 — real, server-side password reset.
 *
 * The frontend previously called `supabase.auth.admin.updateUserById(...)`
 * directly from the browser client. That namespace does not exist on the
 * anon/browser SDK at all (admin.* requires the service_role key, which must
 * never be shipped to a browser) — so the call silently resolved to
 * `undefined`, no error was ever thrown, and the UI showed "✓ Password
 * reset" while nothing had actually changed. This function does the real
 * thing, server-side, with the service role key that never leaves the edge
 * runtime.
 *
 * Important: this SETS a new password chosen by the admin. It cannot ever
 * retrieve, display, or "get" a user's existing password — Supabase Auth
 * only stores a one-way hash, which is by design impossible to reverse.
 */
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
  "Access-Control-Max-Age": "86400",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method === "GET") return json({ ok: true, version: 1, ts: new Date().toISOString() });

  try {
    const url  = env("SUPABASE_URL");
    const anon = env("SUPABASE_ANON_KEY");
    const svc  = env("SUPABASE_SERVICE_ROLE_KEY");

    const auth = req.headers.get("Authorization") || req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : auth;
    if (!token) return json({ error: "Missing Authorization header" }, 401);

    const callerClient = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: ud, error: ue } = await callerClient.auth.getUser();
    if (ue || !ud?.user?.id) return json({ error: `Auth validation failed: ${ue?.message || "invalid token"}` }, 401);
    const callerId = ud.user.id;

    const adminClient = createClient(url, svc, { auth: { autoRefreshToken: false, persistSession: false } });

    const { data: cRoles } = await adminClient.from("user_roles").select("role").eq("user_id", callerId);
    const isAdmin = (cRoles || []).some((r: any) => ["admin", "superadmin", "webmaster"].includes(r.role));
    if (!isAdmin) return json({ error: "Forbidden — admin/superadmin/webmaster required" }, 403);

    const body = await req.json().catch(() => ({}));
    const { user_id, new_password } = body;
    if (!user_id) return json({ error: "user_id is required" }, 400);
    if (!new_password || String(new_password).length < 8) {
      return json({ error: "new_password must be at least 8 characters" }, 400);
    }

    const { error: updateErr } = await adminClient.auth.admin.updateUserById(user_id, { password: new_password });
    if (updateErr) return json({ error: `Password reset failed: ${updateErr.message}` }, 500);

    await adminClient.from("admin_activity_log").insert({
      user_id: callerId,
      action: "password_reset",
      entity_type: "profiles",
      entity_id: user_id,
      severity: "warning",
      description: `Admin ${callerId} reset the password for user ${user_id}`,
    }).then(() => {}).catch(() => {});

    return json({ ok: true, user_id });
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
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}
