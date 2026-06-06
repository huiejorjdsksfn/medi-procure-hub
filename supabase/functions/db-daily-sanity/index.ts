/**
 * EL5 MediProcure — db-daily-sanity Edge Function
 * Daily database wake/sanity check:
 *   1. Inserts a tagged test heartbeat row.
 *   2. Reads it back to confirm write+read path is healthy.
 *   3. Deletes ALL sanity-test rows so no test data lingers.
 * Wire up with pg_cron to invoke once per day.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const TAG = "sanity-test";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const t0 = Date.now();
  const report: Record<string, unknown> = { tag: TAG, started_at: new Date().toISOString() };

  // 1) INSERT test row
  const { data: inserted, error: insErr } = await db.from("db_heartbeat").insert({
    pinged_at:   new Date().toISOString(),
    latency_ms:  0,
    status:      TAG,
    source:      "db-daily-sanity",
    db_version:  "test",
    active_conns: 0,
    table_counts: {},
  }).select("id").maybeSingle();
  report.insert_ok = !insErr;
  report.insert_error = insErr?.message ?? null;
  report.inserted_id = inserted?.id ?? null;

  // 2) READ it back
  if (inserted?.id) {
    const { data: row, error: rdErr } = await db.from("db_heartbeat")
      .select("id,status,source").eq("id", inserted.id).maybeSingle();
    report.read_ok = !rdErr && row?.status === TAG;
    report.read_error = rdErr?.message ?? null;
  } else {
    report.read_ok = false;
  }

  // 3) DELETE all sanity rows (cleanup test data)
  const { error: delErr, count } = await db.from("db_heartbeat")
    .delete({ count: "exact" }).eq("source", "db-daily-sanity");
  report.cleanup_ok = !delErr;
  report.cleanup_error = delErr?.message ?? null;
  report.deleted_rows = count ?? 0;

  report.duration_ms = Date.now() - t0;
  report.healthy = report.insert_ok && report.read_ok && report.cleanup_ok;

  return new Response(JSON.stringify(report), {
    status: report.healthy ? 200 : 500,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
});