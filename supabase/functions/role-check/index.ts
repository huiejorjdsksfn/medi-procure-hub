/**
 * EL5 MediProcure — role-check Edge Function v2.0
 * Fixed: replaced non-existent getClaims() with getUser()
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPER = ["superadmin", "webmaster", "admin", "database_admin"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ allowed: false, error: "missing_token" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { required?: string[]; mode?: "any" | "all" } = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const required = Array.isArray(body.required) ? body.required : [];
  const mode = body.mode === "all" ? "all" : "any";

  try {
    // Use service role to validate the user token
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Use anon client with user's token to get their identity
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    // getUser() is the correct v2 method (getClaims does not exist)
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ allowed: false, error: "invalid_token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch roles using service role client (bypasses RLS)
    const { data: rows } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", user.id);
    const roles = (rows || []).map((r: any) => r.role as string);

    // Superadmin / webmaster / admin always allowed
    if (SUPER.some((s) => roles.includes(s))) {
      return new Response(JSON.stringify({ allowed: true, roles, bypass: true, user_id: user.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allowed = required.length === 0
      ? true
      : mode === "all"
        ? required.every((r) => roles.includes(r))
        : required.some((r) => roles.includes(r));

    return new Response(JSON.stringify({ allowed, roles, required, mode, user_id: user.id }), {
      status: allowed ? 200 : 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    console.error("[role-check] Fatal:", e.message);
    return new Response(JSON.stringify({ allowed: false, error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
