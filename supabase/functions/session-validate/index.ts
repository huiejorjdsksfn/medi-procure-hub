/**
 * session-validate v3 — fixed getClaims→getUser
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ valid: false, error: "missing_token" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } },
  );

  // FIX: use getUser() — getClaims() does not exist in supabase-js v2
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return new Response(JSON.stringify({ valid: false, error: "invalid_token" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: roles } = await supabase
    .from("user_roles").select("role").eq("user_id", user.id);

  return new Response(JSON.stringify({
    valid: true,
    user_id: user.id,
    email: user.email,
    expires_at: user.confirmation_sent_at,
    roles: (roles || []).map((r: any) => r.role),
    server_time: Math.floor(Date.now() / 1000),
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
