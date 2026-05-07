/**
 * ProcurBosse v8.0 -- Search API Edge Function
 * Global full-text search across all ERP modules
 * EL5 MediProcure | Embu Level 5 Hospital
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type" };

const TABLES = [
  { name:"requisitions",    label:"requisition_number", sub:"purpose"       },
  { name:"purchase_orders", label:"po_number",          sub:"vendor_name"   },
  { name:"suppliers",       label:"company_name",       sub:"contact_person"},
  { name:"items",           label:"name",               sub:"description"   },
  { name:"contracts",       label:"contract_number",    sub:"supplier_name" },
  { name:"tenders",         label:"tender_number",      sub:"title"         },
  { name:"documents",       label:"name",               sub:"category"      },
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error:"Unauthorized" }), { status:401, headers:cors });
  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", { global:{ headers:{ Authorization:authHeader } } });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error:"Unauthorized" }), { status:401, headers:cors });
  const { query, limit = 20, tables } = await req.json().catch(() => ({}));
  if (!query || query.length < 2) return new Response(JSON.stringify([]), { headers: { ...cors, "Content-Type":"application/json" } });
  const q = query.toLowerCase().trim();
  const results: any[] = [];
  const targetTables = tables ? TABLES.filter(t => tables.includes(t.name)) : TABLES;
  await Promise.allSettled(targetTables.map(async t => {
    const { data } = await supabase.from(t.name)
      .select(`id,${t.label},${t.sub}`).or(`${t.label}.ilike.%${q}%,${t.sub}.ilike.%${q}%`).limit(Math.ceil(limit / targetTables.length) + 2);
    (data || []).forEach((row: any) => {
      const lbl = row[t.label] || "";
      results.push({ id:row.id, table:t.name, label:lbl, subtitle:row[t.sub]||"", url:`/${t.name.replace("_","-")}`, score: lbl.toLowerCase().startsWith(q)?2:1 });
    });
  }));
  results.sort((a,b) => b.score - a.score);
  return new Response(JSON.stringify(results.slice(0, limit)), { headers: { ...cors, "Content-Type":"application/json" } });
});
