/**
 * EL5 MediProcure — keepalive-bot Edge Function v1.0
 * Pings the database every second in the background.
 * Invoked by Supabase pg_cron (every minute) or external cron.
 * Internally loops for 55 seconds at 1-second intervals per invocation.
 * Trims the heartbeat table to last 10,000 rows to prevent bloat.
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOOP_SECONDS      = 55;   // run for 55s per invocation (cron fires every minute)
const PING_INTERVAL_MS  = 1000; // 1 second between pings
const MAX_ROWS          = 10_000;

const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function ping(): Promise<{ latency_ms: number; status: string; db_version: string; active_conns: number; table_counts: Record<string, number> }> {
  const t0 = Date.now();
  try {
    // Core ping — SELECT 1
    const { error: pingErr } = await db.rpc("pg_sleep", { seconds: 0 }).maybeSingle().catch(() => ({ error: null }));

    // Gather health stats in one query
    const { data, error } = await db.rpc("get_db_health_stats").maybeSingle();
    const latency_ms = Date.now() - t0;

    if (error) {
      // Fallback: plain SELECT 1
      const { error: e2 } = await db.from("db_heartbeat").select("id").limit(1);
      return {
        latency_ms,
        status: e2 ? "degraded" : "ok",
        db_version: "unknown",
        active_conns: 0,
        table_counts: {},
      };
    }

    return {
      latency_ms,
      status: "ok",
      db_version: data?.db_version ?? "unknown",
      active_conns: data?.active_conns ?? 0,
      table_counts: data?.table_counts ?? {},
    };
  } catch (e: any) {
    return {
      latency_ms: Date.now() - t0,
      status: `error: ${e.message}`,
      db_version: "unknown",
      active_conns: 0,
      table_counts: {},
    };
  }
}

async function insertHeartbeat(stats: Awaited<ReturnType<typeof ping>>) {
  await db.from("db_heartbeat").insert({
    pinged_at:   new Date().toISOString(),
    latency_ms:  stats.latency_ms,
    status:      stats.status,
    source:      "keepalive-bot",
    db_version:  stats.db_version,
    active_conns: stats.active_conns,
    table_counts: stats.table_counts,
  });
}

async function trim() {
  // Delete oldest rows beyond MAX_ROWS
  await db.rpc("trim_heartbeat", { keep: MAX_ROWS }).catch(() => {
    // Fallback if RPC not available
    return db.from("db_heartbeat")
      .delete()
      .lt("id", db.from("db_heartbeat").select("id").order("id", { ascending: false }).range(MAX_ROWS, MAX_ROWS));
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  // Manual single-ping mode (GET or POST with action=ping)
  const url = new URL(req.url);
  const isSinglePing = req.method === "GET" || url.searchParams.get("action") === "ping";

  if (isSinglePing) {
    const stats = await ping();
    await insertHeartbeat(stats);
    return new Response(JSON.stringify({ ok: true, ...stats, mode: "single" }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  // Loop mode — runs for LOOP_SECONDS, pinging every second
  const results: Array<{ t: string; latency_ms: number; status: string }> = [];
  const deadline = Date.now() + LOOP_SECONDS * 1000;
  let pingCount = 0;
  let trimDone  = false;

  while (Date.now() < deadline) {
    const stats = await ping();
    await insertHeartbeat(stats);
    results.push({ t: new Date().toISOString(), latency_ms: stats.latency_ms, status: stats.status });
    pingCount++;

    // Trim once per invocation after 10th ping
    if (!trimDone && pingCount === 10) {
      await trim();
      trimDone = true;
    }

    // Sleep until next second boundary
    const elapsed = Date.now() % PING_INTERVAL_MS;
    const sleepMs = elapsed > 0 ? PING_INTERVAL_MS - elapsed : PING_INTERVAL_MS;
    if (Date.now() + sleepMs < deadline) {
      await new Promise((r) => setTimeout(r, sleepMs));
    } else break;
  }

  const avg = results.length
    ? Math.round(results.reduce((s, r) => s + r.latency_ms, 0) / results.length)
    : 0;
  const degraded = results.filter((r) => r.status !== "ok").length;

  return new Response(JSON.stringify({
    ok: true,
    pings: pingCount,
    avg_latency_ms: avg,
    degraded_count: degraded,
    mode: "loop",
    results,
  }), { headers: { ...CORS, "Content-Type": "application/json" } });
});
