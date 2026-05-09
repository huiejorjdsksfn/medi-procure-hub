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

  const token = auth.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims) {
    return new Response(JSON.stringify({ valid: false, error: "invalid_token" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const sub = data.claims.sub;
  const exp = data.claims.exp;
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", sub);

  return new Response(JSON.stringify({
    valid: true,
    user_id: sub,
    email: data.claims.email,
    expires_at: exp,
    roles: (roles || []).map((r: any) => r.role),
    server_time: Math.floor(Date.now() / 1000),
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});