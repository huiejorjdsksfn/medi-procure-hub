import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPER = ["superadmin", "webmaster", "admin"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ allowed: false, error: "missing_token" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { required?: string[]; mode?: "any" | "all" } = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const required = Array.isArray(body.required) ? body.required : [];
  const mode = body.mode === "all" ? "all" : "any";

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } },
  );
  const token = auth.replace("Bearer ", "");
  const { data: claims, error } = await supabase.auth.getClaims(token);
  if (error || !claims?.claims) {
    return new Response(JSON.stringify({ allowed: false, error: "invalid_token" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: rows } = await supabase
    .from("user_roles").select("role").eq("user_id", claims.claims.sub);
  const roles = (rows || []).map((r: any) => r.role);

  // Superadmin/webmaster/admin always allowed
  if (SUPER.some((s) => roles.includes(s))) {
    return new Response(JSON.stringify({ allowed: true, roles, bypass: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const allowed = required.length === 0
    ? true
    : mode === "all"
      ? required.every((r) => roles.includes(r))
      : required.some((r) => roles.includes(r));

  return new Response(JSON.stringify({ allowed, roles, required, mode }), {
    status: allowed ? 200 : 403,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});