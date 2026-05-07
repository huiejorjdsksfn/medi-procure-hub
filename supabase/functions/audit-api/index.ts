/**
 * ProcurBosse v8.0 -- Audit API Edge Function
 * Tamper-proof audit trail for all system events
 * EL5 MediProcure | Embu Level 5 Hospital
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type" };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error:"Unauthorized" }), { status:401, headers:cors });
  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", { global:{ headers:{ Authorization:authHeader } } });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error:"Unauthorized" }), { status:401, headers:cors });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const body = await req.json().catch(() => ({}));
  const { action, entity_type, entity_id, old_values, new_values, severity = "info", description, metadata } = body;
  const { data, error } = await supabase.from("admin_activity_log").insert({
    user_id: user.id, action, entity_type, entity_id, old_values, new_values, severity, description,
    metadata: { ...metadata, ip_address: ip }, created_at: new Date().toISOString()
  }).select("id").single();
  if (error) return new Response(JSON.stringify({ error: error.message }), { status:400, headers:cors });
  return new Response(JSON.stringify({ id: data?.id, ok: true }), { headers: { ...cors, "Content-Type":"application/json" } });
});
