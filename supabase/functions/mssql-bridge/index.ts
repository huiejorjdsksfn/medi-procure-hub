/**
 * mssql-bridge v1 — proxies requests to the admin's real SQL Server bridge
 * service over HTTPS.
 *
 * Deno Edge Functions can only make HTTP/HTTPS calls — they cannot open a
 * raw TCP socket to speak SQL Server's TDS protocol. That's a real platform
 * constraint (confirmed: Supabase's own Deno runtime has no TCP networking
 * for outbound connections), not something any code here can work around.
 * The honest architecture: a small companion service (see
 * /tools/mssql-bridge-server in the repo) runs on a machine that DOES have
 * real network access to SQL Server, and exposes a small authenticated
 * HTTPS API. This function is the live link between the app and that
 * service — when the bridge is running and enabled, everything below is a
 * real live round trip to real SQL Server; when it's off, this says so
 * honestly rather than faking data.
 */
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  try {
    const url = env("SUPABASE_URL");
    const anon = env("SUPABASE_ANON_KEY");
    const svc = env("SUPABASE_SERVICE_ROLE_KEY");

    const auth = req.headers.get("Authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : auth;
    if (!token) return json({ ok: false, error: "Missing Authorization header" }, 401);

    const callerClient = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: ud, error: ue } = await callerClient.auth.getUser();
    if (ue || !ud?.user?.id) return json({ ok: false, error: "Invalid session" }, 401);

    const admin = createClient(url, svc, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", ud.user.id);
    const isAdmin = (roles || []).some((r: any) => ["admin", "superadmin", "database_admin", "webmaster"].includes(r.role));
    if (!isAdmin) return json({ ok: false, error: "Forbidden — admin/database_admin required" }, 403);

    const body = await req.json().catch(() => ({}));
    const { action } = body; // "ping" | "schema" | "test_connection" | "query"

    const { data: cfg } = await admin.from("sqlserver_bridge_config").select("*").limit(1).maybeSingle();

    if (!cfg?.is_enabled || !cfg?.bridge_url) {
      return json({
        ok: true,
        connected: false,
        reason: !cfg?.bridge_url ? "No bridge URL configured" : "Bridge disabled by admin",
      });
    }

    const started = Date.now();
    try {
      const bridgeResp = await fetch(`${cfg.bridge_url.replace(/\/$/, "")}/${action || "ping"}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Bridge-Secret": cfg.shared_secret || "",
        },
        body: JSON.stringify(body.params || {}),
        signal: AbortSignal.timeout(15000),
      });
      const latencyMs = Date.now() - started;
      const data = await bridgeResp.json().catch(() => ({}));

      await admin.from("sqlserver_bridge_config").update({
        last_ping_at: new Date().toISOString(),
        last_status: bridgeResp.ok ? "connected" : "error",
        last_error: bridgeResp.ok ? null : (data?.error || `HTTP ${bridgeResp.status}`),
      }).eq("id", cfg.id);

      if (!bridgeResp.ok) {
        return json({ ok: true, connected: false, reason: data?.error || `Bridge returned HTTP ${bridgeResp.status}` });
      }
      return json({ ok: true, connected: true, latency_ms: latencyMs, data });
    } catch (fetchErr: any) {
      await admin.from("sqlserver_bridge_config").update({
        last_ping_at: new Date().toISOString(),
        last_status: "unreachable",
        last_error: fetchErr?.message || "Bridge unreachable",
      }).eq("id", cfg.id);
      return json({ ok: true, connected: false, reason: `Bridge unreachable: ${fetchErr?.message}` });
    }
  } catch (err: any) {
    return json({ ok: false, error: err?.message || "internal server error" }, 500);
  }
});

function env(k: string) {
  const v = Deno.env.get(k);
  if (!v) throw new Error(`${k} is not configured`);
  return v;
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}
