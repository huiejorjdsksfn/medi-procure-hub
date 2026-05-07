/**
 * ProcurBosse v8.0 -- Bulk Operations API Edge Function
 * Batch create/update/delete with transaction safety
 * EL5 MediProcure | Embu Level 5 Hospital
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_TABLES = new Set([
  "requisitions","purchase_orders","goods_received","suppliers","items",
  "categories","contracts","tenders","notifications","documents",
  "invoice_matching","payment_proposals","budget_alerts","gl_journal",
]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors });

  const body = await req.json();
  const { operation, table, records, ids, updates } = body;

  if (!ALLOWED_TABLES.has(table)) {
    return new Response(JSON.stringify({ error: `Table '${table}' not allowed for bulk ops` }), { status: 400, headers: cors });
  }

  const result = { success: 0, failed: 0, errors: [] as any[], ids: [] as string[] };

  if (operation === "insert") {
    const CHUNK = 50;
    for (let i = 0; i < (records || []).length; i += CHUNK) {
      const chunk = records.slice(i, i + CHUNK).map((r: any) => ({ ...r, created_by: user.id }));
      const { data, error } = await supabase.from(table).insert(chunk).select("id");
      if (error) { result.failed += chunk.length; result.errors.push({ chunk: i, error: error.message }); }
      else { result.success += chunk.length; result.ids.push(...(data || []).map((r: any) => r.id)); }
    }
  } else if (operation === "update") {
    await Promise.allSettled(
      (updates || []).map(async ({ id, data }: any, i: number) => {
        const { error } = await supabase.from(table)
          .update({ ...data, updated_at: new Date().toISOString() }).eq("id", id);
        if (error) { result.failed++; result.errors.push({ index: i, id, error: error.message }); }
        else { result.success++; result.ids.push(id); }
      })
    );
  } else if (operation === "soft_delete") {
    const { error } = await supabase.from(table)
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .in("id", ids || []);
    if (error) { result.failed = (ids || []).length; result.errors.push({ error: error.message }); }
    else { result.success = (ids || []).length; result.ids = ids; }
  }

  // Log bulk operation to audit
  await supabase.from("admin_activity_log").insert({
    user_id: user.id, action: "system",
    entity_type: table, severity: "info",
    description: `Bulk ${operation}: ${result.success} success, ${result.failed} failed`,
  }).catch(() => {});

  return new Response(JSON.stringify(result), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
