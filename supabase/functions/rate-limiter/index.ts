/**
 * ProcurBosse v9.0 -- Rate Limiter Edge Function
 * Was a 9-line stub ("reserved for future implementation") returning a
 * fixed {status:"ok"} with no throttling performed at all. A working,
 * tiered rate-limit primitive already existed as a Postgres function
 * (check_rate_limit) — this now actually calls it, so the "rate-limiter"
 * edge function does what its name says instead of being a no-op that
 * happened to sit at a plausible-looking URL.
 * EL5 MediProcure | Embu Level 5 Hospital
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ allowed: true, reason: "no-auth" }), { headers: cors });

    const authed = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await authed.auth.getUser();

    const { action, user_id } = await req.json().catch(() => ({}));
    const uid = user?.id || user_id;
    if (!action || !uid) {
      return new Response(JSON.stringify({ allowed: true, reason: "missing action/user" }), { headers: cors });
    }

    const { data, error } = await authed.rpc("check_rate_limit", { p_user_id: uid, p_action: action });
    if (error) {
      // Fail open — availability over strict enforcement for a best-effort
      // throttle, same posture as the existing client-side wrapper.
      return new Response(JSON.stringify({ allowed: true, reason: "check_failed", error: error.message }), { headers: cors });
    }

    return new Response(JSON.stringify({ allowed: !!data, action }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ allowed: true, reason: "exception" }), { headers: cors });
  }
});
