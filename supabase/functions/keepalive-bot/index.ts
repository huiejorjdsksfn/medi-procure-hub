/**
 * EL5 MediProcure — keepalive-bot Edge Function v2.1
 * v2.1 FIX: healthCheck() was calling send-email with POST + a JSON body
 * ({action:"status"}) instead of send-email's actual status contract
 * (GET ?action=status). That made every health-check cycle fall through
 * into the real send handler, which correctly rejected it for missing
 * to/subject — producing a 400 on send-email every ~60s, 24/7, forever.
 * Fixed to call the real status endpoint.
 *
 * Pings the database every second + manages data for activity targets:
 * - Target: 7500+ operations/week (22,500+/month)
 * - Pings database every second (55 per invocation)
 * - Inserts test data records
 * - Deletes old records to maintain table size
 * - Sends periodic health checks
 * - Logs all activity
 *
 * Invoked by Supabase pg_cron (every minute) or external cron.
 * Internally loops for 55 seconds at 1-second intervals per invocation.
 *
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
const LOOP_SECONDS      = 55;
const PING_INTERVAL_MS  = 1000;
const MAX_ROWS          = 10_000;
const MAX_TEST_RECORDS  = 5000;
const MAX_HEARTBEATS    = 10000;

const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function genId(prefix: string = "TEST"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

async function insertTestRecord(table: string, recordType: string = "keepalive") {
  try {
    await db.from(table).insert({
      id: genId(recordType.toUpperCase()),
      record_type: recordType,
      timestamp: new Date().toISOString(),
      random_value: Math.random().toString(36).substring(2, 15),
      is_active: true,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      metadata: JSON.stringify({
        version: "2.1",
        cycle: Math.floor(Date.now() / 60000),
        source: "keepalive-bot-v2",
      }),
    });
    return true;
  } catch { return false; }
}

async function logActivity(action: string, details: Record<string, unknown>) {
  try {
    await db.from("activity_logs").insert({
      action,
      source: "keepalive-bot-v2",
      details: JSON.stringify(details),
      created_at: new Date().toISOString(),
    });
    return true;
  } catch { return false; }
}

async function deleteOldRecords(table: string, maxRows: number) {
  try {
    const { data } = await db.from(table)
      .select("id,created_at").order("id", { ascending: false }).range(maxRows, maxRows + 100);
    if ((data as any[])?.length > 0) {
      const cutoff = (data as any[])[0].id;
      await db.from(table).delete().lt("id", cutoff);
      return data.length;
    }
    return 0;
  } catch { return 0; }
}

async function countRecords(table: string): Promise<number> {
  try {
    const { count } = await db.from(table).select("*", { count: "exact" });
    return count || 0;
  } catch { return 0; }
}

async function healthCheck() {
  const checks = {
    supabase: false,
    twilio: false,
    email: false,
    timestamp: new Date().toISOString(),
  };

  try {
    const { error } = await db.from("system_settings").select("key").limit(1);
    checks.supabase = !error;
  } catch { checks.supabase = false; }

  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/send-sms?action=status`, {
      headers: { "apikey": Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") || "" },
    });
    checks.twilio = r.ok;
  } catch { checks.twilio = false; }

  try {
    // FIXED v2.1: send-email's status contract is GET ?action=status, not a
    // POST body. The old POST here always fell through to the real send
    // handler and got rejected for missing to/subject — a false "down"
    // signal plus a needless 400 in the logs every single cycle.
    const r = await fetch(`${SUPABASE_URL}/functions/v1/send-email?action=status`, {
      method: "GET",
    });
    checks.email = r.ok;
  } catch { checks.email = false; }

  return checks;
}

async function ping(): Promise<{ latency_ms: number; status: string; db_version: string; active_conns: number; table_counts: Record<string, number> }> {
  const t0 = Date.now();
  try {
    let data: any = null, error: any = null;
    try {
      const res = await db.rpc("get_db_health_stats").maybeSingle();
      data = res.data; error = res.error;
    } catch (e: any) { error = e; }
    const latency_ms = Date.now() - t0;

    if (error) {
      const { error: e2 } = await db.from("db_heartbeat").select("id").limit(1);
      return { latency_ms, status: e2 ? "degraded" : "ok", db_version: "unknown", active_conns: 0, table_counts: {} };
    }

    return {
      latency_ms, status: "ok", db_version: data?.db_version ?? "unknown",
      active_conns: data?.active_conns ?? 0, table_counts: data?.table_counts ?? {},
    };
  } catch (e: any) {
    return { latency_ms: Date.now() - t0, status: `error: ${e.message}`, db_version: "unknown", active_conns: 0, table_counts: {} };
  }
}

async function insertHeartbeat(stats: Awaited<ReturnType<typeof ping>>) {
  await db.from("db_heartbeat").insert({
    pinged_at: new Date().toISOString(), latency_ms: stats.latency_ms, status: stats.status,
    source: "keepalive-bot-v2", db_version: stats.db_version, active_conns: stats.active_conns, table_counts: stats.table_counts,
  });
}

async function trim(table: string, maxRows: number) {
  try {
    await db.rpc("trim_heartbeat", { keep: maxRows });
  } catch {
    try {
      const { data } = await db.from(table).select("id").order("id", { ascending: false }).range(maxRows, maxRows);
      const cutoff = (data as any)?.[0]?.id;
      if (cutoff) await db.from(table).delete().lt("id", cutoff);
    } catch {}
  }
}

async function runEnhancedLoop() {
  const results: Array<{ t: string; latency_ms: number; status: string; ops: number }> = [];
  const deadline = Date.now() + LOOP_SECONDS * 1000;
  let pingCount = 0;
  let testInsertCount = 0;
  let trimDone = false;
  let healthCheckDone = false;
  let activityLogDone = false;

  while (Date.now() < deadline) {
    const stats = await ping();
    await insertHeartbeat(stats);
    let opsThisSecond = 1;

    if (pingCount > 0 && pingCount % 25 === 0) {
      await insertTestRecord("keepalive_records");
      await insertTestRecord("sms_log");
      opsThisSecond += 2;
      testInsertCount += 2;
    }

    if (!activityLogDone && pingCount === 30) {
      await logActivity("keepalive_cycle", { pings: pingCount, test_inserts: testInsertCount, timestamp: new Date().toISOString() });
      activityLogDone = true;
    }

    results.push({ t: new Date().toISOString(), latency_ms: stats.latency_ms, status: stats.status, ops: opsThisSecond });
    pingCount++;

    if (!trimDone && pingCount === 10) {
      await trim("db_heartbeat", MAX_HEARTBEATS);
      await trim("keepalive_records", MAX_TEST_RECORDS);
      trimDone = true;
    }

    if (!healthCheckDone && pingCount === 50) {
      const health = await healthCheck();
      await insertTestRecord("keepalive_records", "health_check");
      await logActivity("health_check", health);
      healthCheckDone = true;
    }

    const elapsed = Date.now() % PING_INTERVAL_MS;
    const sleepMs = elapsed > 0 ? PING_INTERVAL_MS - elapsed : PING_INTERVAL_MS;
    if (Date.now() + sleepMs < deadline) {
      await new Promise((r) => setTimeout(r, sleepMs));
    } else break;
  }

  const avg = results.length ? Math.round(results.reduce((s, r) => s + r.latency_ms, 0) / results.length) : 0;
  const degraded = results.filter((r) => r.status !== "ok").length;

  return { pings: pingCount, test_inserts: testInsertCount, avg_latency_ms: avg, degraded_count: degraded, mode: "enhanced-loop-v2" };
}

function calculateProjections() {
  const perInvocation = 58;
  const perMinute = perInvocation * 1;
  const perHour = perInvocation * 60;
  const perDay = perHour * 24;
  const perWeek = perDay * 7;
  const perMonth = perDay * 30;
  return {
    ops_per_invocation: perInvocation, ops_per_minute: perMinute, ops_per_hour: perHour,
    ops_per_day: perDay, ops_per_week: perWeek, ops_per_month: perMonth,
    target_weekly: 7500, target_monthly: 22500,
    target_met: perWeek >= 7500, target_met_monthly: perMonth >= 22500,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  if (action === "status") {
    const heartbeatCount = await countRecords("db_heartbeat");
    const testCount = await countRecords("keepalive_records");
    const activityCount = await countRecords("activity_logs");
    return new Response(JSON.stringify({
      ok: true, service: "EL5 MediProcure Keep-Alive Bot v2.1", version: "2.1", status: "running",
      projections: calculateProjections(),
      current_records: { heartbeats: heartbeatCount, test_records: testCount, activity_logs: activityCount },
      config: { loop_seconds: LOOP_SECONDS, ping_interval_ms: PING_INTERVAL_MS, max_heartbeats: MAX_HEARTBEATS, max_test_records: MAX_TEST_RECORDS },
    }), { headers: { ...CORS, "Content-Type": "application/json" } });
  }

  if (action === "health") {
    const health = await healthCheck();
    return new Response(JSON.stringify({ ok: true, ...health }), { headers: { ...CORS, "Content-Type": "application/json" } });
  }

  if (action === "ping" || action === "single") {
    const stats = await ping();
    await insertHeartbeat(stats);
    return new Response(JSON.stringify({ ok: true, ...stats, mode: "single" }), { headers: { ...CORS, "Content-Type": "application/json" } });
  }

  if (action === "cleanup") {
    const deletedHeartbeats = await deleteOldRecords("db_heartbeat", MAX_HEARTBEATS);
    const deletedTests = await deleteOldRecords("keepalive_records", MAX_TEST_RECORDS);
    await logActivity("cleanup", { deletedHeartbeats, deletedTests });
    return new Response(JSON.stringify({ ok: true, deleted: { heartbeats: deletedHeartbeats, test_records: deletedTests } }), { headers: { ...CORS, "Content-Type": "application/json" } });
  }

  const result = await runEnhancedLoop();
  return new Response(JSON.stringify({ ok: true, ...result, projections: calculateProjections() }), { headers: { ...CORS, "Content-Type": "application/json" } });
});
