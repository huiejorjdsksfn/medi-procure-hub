/**
 * ProcurBosse v8.0 -- Export API Edge Function
 * Server-side Excel/PDF/CSV export for large datasets
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
  const { format, table, data, columns } = await req.json().catch(() => ({}));
  if (!data || !Array.isArray(data)) return new Response(JSON.stringify({ error:"No data" }), { status:400, headers:cors });

  if (format === "csv") {
    const cols = columns || Object.keys(data[0] || {});
    const header = cols.join(",");
    const rows = data.map((row: any) => cols.map((c: string) => {
      const v = row[c] ?? ""; return typeof v === "string" ? `"${v.replace(/"/g,'""')}"` : v;
    }).join(",")).join("\n");
    return new Response(`${header}\n${rows}`, { headers: { ...cors, "Content-Type":"text/csv", "Content-Disposition":`attachment; filename="${table}-export.csv"` } });
  }

  if (format === "json") {
    return new Response(JSON.stringify(data, null, 2), { headers: { ...cors, "Content-Type":"application/json", "Content-Disposition":`attachment; filename="${table}-export.json"` } });
  }

  return new Response(JSON.stringify({ error:"Use client-side Excel/PDF export for this format" }), { status:400, headers:cors });
});
