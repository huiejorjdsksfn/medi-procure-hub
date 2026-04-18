/**
 * ProcurBosse v8.0 -- Concurrency API Edge Function
 * Optimistic locking and conflict resolution for 2000+ concurrent users
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
  const { operation, table, record_id, updates, expected_version } = await req.json().catch(() => ({}));

  if (operation === "lock") {
    const key = `lock:${table}:${record_id}`;
    const expires = new Date(Date.now() + 15000).toISOString();
    const { error } = await supabase.from("system_settings").upsert({ key, value: JSON.stringify({ userId: user.id, expires }), category: "lock" }, { onConflict: "key" });
    return new Response(JSON.stringify({ locked: !error }), { headers: { ...cors, "Content-Type":"application/json" } });
  }

  if (operation === "unlock") {
    const key = `lock:${table}:${record_id}`;
    await supabase.from("system_settings").delete().eq("key", key).eq("value", JSON.stringify({ userId: user.id }));
    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, "Content-Type":"application/json" } });
  }

  if (operation === "update_if_unchanged") {
    const ALLOWED = new Set(["requisitions","purchase_orders","suppliers","items","contracts","tenders"]);
    if (!ALLOWED.has(table)) return new Response(JSON.stringify({ error:"Table not allowed" }), { status:400, headers:cors });
    const { data, error } = await supabase.from(table)
      .update({ ...updates, version: (expected_version || 0) + 1, updated_at: new Date().toISOString() })
      .eq("id", record_id).eq("version", expected_version || 0).select("id");
    const success = !error && data && data.length > 0;
    return new Response(JSON.stringify({ success, conflict: !success }), { headers: { ...cors, "Content-Type":"application/json" } });
  }

  return new Response(JSON.stringify({ error:"Unknown operation" }), { status:400, headers:cors });
});
