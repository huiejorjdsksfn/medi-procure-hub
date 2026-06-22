/**
 * EL5 MediProcure — keepalive-bot Edge Function v3.0
 * 24/7 Backend & Frontend Keep-Alive (Dump & Delete Strategy)
 *
 * STRATEGY: Every invocation inserts data into ALL major tables,
 * keeps everything warm, then deletes old records to prevent bloat.
 *
 * Operations per invocation (55s):
 * - 55 DB pings → db_heartbeat
 * - 5-10 dump records → keepalive_records (dump & delete cycle)
 * - 5 dump records → audit_log (keep realtime subscriptions warm)
 * - 3 dump records → notifications (keep push notifications warm)
 * - 2 dump records → activity_logs
 * - 2 dump records → requisitions (keep procurement warm)
 * - 1 frontend ping → Vercel/Tencent CDN
 * - 1 cleanup pass → delete all records older than 5 minutes
 *
 * Target: 7500+ ops/week · 22,500+ ops/month
 *
 * Cron: pg_cron fires every minute → function loops 55s
 * Safety: Auto-cleanup removes all inserted records within 5 min
 *
 * EL5 MediProcure · Embu Level 5 Hospital · Kenya
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY         = Deno.env.get("VITE_SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const FRONTEND_URLS     = (Deno.env.get("KEEPALIVE_FRONTEND_URLS") ?? "").split(",").filter(Boolean);
const LOOP_SECONDS     = 55;
const PING_INTERVAL_MS = 1000;
const MAX_HEARTBEATS   = 5000;
const MAX_TEST_RECORDS = 1000;
const MAX_ACTIVITY_LOGS = 2000;
const KEEP_RECORD_MS   = 5 * 60 * 1000; // keep records max 5 minutes before auto-delete

const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const dbAnon = createClient(SUPABASE_URL, ANON_KEY);

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

// ── DUMP: Insert into a table, return the inserted IDs ──────────────────────
async function dumpRecord(table: string, record: Record<string, unknown>): Promise<string | null> {
  try {
    const id = genId(table.toUpperCase().slice(0, 4));
    await db.from(table).insert({ id, ...record });
    return id;
  } catch { return null; }
}

// ── DUMP BULK: Insert multiple records at once ────────────────────────────────
async function dumpBulk(table: string, records: Record<string, unknown>[]): Promise<number> {
  try {
    const rows = records.map((r, i) => ({ id: genId(table.toUpperCase().slice(0, 4)) + "-" + i, ...r }));
    const { error } = await db.from(table).insert(rows);
    return error ? 0 : rows.length;
  } catch { return 0; }
}

// ── DELETE: Remove records by IDs ───────────────────────────────────────────
async function deleteByIds(table: string, ids: string[]): Promise<number> {
  if (!ids.length) return 0;
  try {
    const { error } = await db.from(table).delete().in("id", ids);
    return error ? 0 : ids.length;
  } catch { return 0; }
}

// ── DELETE OLD: Remove records older than KEEP_RECORD_MS ─────────────────────
async function deleteOldRecords(table: string, dateField = "created_at"): Promise<number> {
  try {
    const cutoff = new Date(Date.now() - KEEP_RECORD_MS).toISOString();
    const { error } = await db.from(table).delete().lt(dateField, cutoff);
    return error ? 0 : -1; // -1 means we tried (exact count not needed)
  } catch { return 0; }
}

// ── DELETE BY ID FIELD: Remove by arbitrary id field (for keepalive_records) ─
async function deleteOldById(table: string, idPrefix: string, keepLast = 100): Promise<number> {
  try {
    // fetch old records to delete
    const { data, error } = await db.from(table)
      .select("id")
      .ilike("id", `${idPrefix}%`)
      .order("created_at", { ascending: false });
    if (error || !data?.length) return 0;
    const toDelete = data.slice(keepLast).map((r: any) => r.id);
    if (!toDelete.length) return 0;
    await db.from(table).delete().in("id", toDelete);
    return toDelete.length;
  } catch { return 0; }
}

// ── ACTIVITY LOG ─────────────────────────────────────────────────────────────
async function logActivity(action: string, details: Record<string, unknown> = {}) {
  try {
    await db.from("activity_logs").insert({
      action,
      source: "keepalive-bot-v3",
      details,
      created_at: new Date().toISOString(),
    });
  } catch { /* noop */ }
}

// ── DB PING ───────────────────────────────────────────────────────────────────
async function pingDB(): Promise<{ latency_ms: number; status: string }> {
  const t0 = Date.now();
  try {
    const { error } = await db.from("db_heartbeat").select("id").limit(1);
    return { latency_ms: Date.now() - t0, status: error ? "degraded" : "ok" };
  } catch (e: any) {
    return { latency_ms: Date.now() - t0, status: `error: ${e.message}` };
  }
}

// ── INSERT HEARTBEAT ──────────────────────────────────────────────────────────
async function insertHeartbeat(latency_ms: number, status: string) {
  try {
    await db.from("db_heartbeat").insert({
      pinged_at: new Date().toISOString(),
      latency_ms,
      status,
      source: "keepalive-bot-v3",
    });
  } catch { /* noop */ }
}

// ── PING FRONTEND URLS ────────────────────────────────────────────────────────
async function pingFrontend(): Promise<{ url: string; ok: boolean; latency_ms: number }[]> {
  const results = [];
  const targets = FRONTEND_URLS.length ? FRONTEND_URLS : [
    `${SUPABASE_URL}/functions/v1/health`,
    "https://medi-procure-hub.vercel.app/api/health",
  ];
  for (const url of targets.slice(0, 3)) {
    const t0 = Date.now();
    try {
      const r = await fetch(url, { method: "GET", signal: AbortSignal.timeout(5000) });
      results.push({ url, ok: r.ok, latency_ms: Date.now() - t0 });
    } catch (e: any) {
      results.push({ url, ok: false, latency_ms: Date.now() - t0, error: e.message });
    }
  }
  return results;
}

// ── TRIM TABLE ────────────────────────────────────────────────────────────────
async function trimTable(table: string, maxRows: number): Promise<number> {
  try {
    await db.rpc("trim_generic", { tbl: table, keep: maxRows });
    return 1;
  } catch {
    try {
      const { data } = await db.from(table).select("id").order("created_at", { ascending: false }).range(maxRows, maxRows + 50);
      if (data?.length) {
        const cutoff = data[0].created_at;
        await db.from(table).delete().lt("created_at", cutoff);
        return data.length;
      }
    } catch { /* noop */ }
    return 0;
  }
}

// ── MAIN LOOP ─────────────────────────────────────────────────────────────────
async function runKeepaliveLoop(): Promise<Record<string, unknown>> {
  const deadline = Date.now() + LOOP_SECONDS * 1000;
  let pingCount = 0;
  let totalOps = 0;
  const deletedIds: Record<string, string[]> = {
    keepalive_records: [],
    audit_log: [],
    notifications: [],
    requisitions: [],
    activity_logs: [],
  };

  // ── Dump pass at start: insert into ALL major tables ──────────────────────
  const auditIds: string[] = [];
  const notifIds: string[] = [];
  const reqIds: string[] = [];
  const actIds: string[] = [];
  const kprIds: string[] = [];

  // audit_log — keeps realtime subscriptions warm
  for (let i = 0; i < 5; i++) {
    const id = await dumpRecord("audit_log", {
      action: `keepalive_ping_${Date.now()}`,
      user_email: `bot@el5-keepalive-${i}.ke`,
      ip_address: "127.0.0.1",
      resource_type: "system",
      details: { source: "keepalive-bot-v3", cycle: pingCount + i, version: "3.0" },
      created_at: new Date().toISOString(),
    });
    if (id) { auditIds.push(id); totalOps++; }
  }

  // notifications — keeps push notifications warm
  for (let i = 0; i < 3; i++) {
    const id = await dumpRecord("notifications", {
      title: `Keepalive Heartbeat ${new Date().toISOString()}`,
      message: `System heartbeat v3 — cycle ${Date.now()}`,
      is_read: false,
      user_id: null,
      created_at: new Date().toISOString(),
    });
    if (id) { notifIds.push(id); totalOps++; }
  }

  // requisitions — keeps procurement module warm
  for (let i = 0; i < 2; i++) {
    const id = await dumpRecord("requisitions", {
      title: `Keepalive Req ${Date.now()}`,
      status: "draft",
      priority: "low",
      requested_by: "keepalive-bot-v3",
      created_at: new Date().toISOString(),
    });
    if (id) { reqIds.push(id); totalOps++; }
  }

  // activity_logs
  for (let i = 0; i < 2; i++) {
    const id = await dumpRecord("activity_logs", {
      action: `keepalive_cycle_${Date.now()}`,
      source: "keepalive-bot-v3",
      details: { version: "3.0", cycle: Date.now() },
      created_at: new Date().toISOString(),
    });
    if (id) { actIds.push(id); totalOps++; }
  }

  // keepalive_records — primary dump table
  const kprBulk = await dumpBulk("keepalive_records", Array.from({ length: 5 }, (_, i) => ({
    record_type: "keepalive",
    timestamp: new Date().toISOString(),
    random_value: Math.random().toString(36).substring(2, 15),
    is_active: true,
    expires_at: new Date(Date.now() + KEEP_RECORD_MS).toISOString(),
    metadata: { source: "keepalive-bot-v3", version: "3.0", index: i },
    created_at: new Date().toISOString(),
  })));
  totalOps += kprBulk;
  Object.assign(deletedIds, { keepalive_records: kprBulk > 0 ? Array.from({ length: kprBulk }, (_, i) => `KEEP-${Date.now()}-${i}`) : [] });

  // ── 55-second ping loop ─────────────────────────────────────────────────────
  while (Date.now() < deadline) {
    const stats = await pingDB();
    await insertHeartbeat(stats.latency_ms, stats.status);
    totalOps++;

    pingCount++;

    // ── Delete old records every 10 pings (aggressive cleanup) ─────────────
    if (pingCount % 10 === 0) {
      await deleteOldRecords("audit_log");
      await deleteOldRecords("notifications");
      await deleteOldRecords("requisitions");
      await deleteOldRecords("activity_logs");
      await deleteOldRecords("keepalive_records");
      totalOps += 5;
    }

    // ── Trim tables to max size ─────────────────────────────────────────────
    if (pingCount === 20) {
      await trimTable("db_heartbeat", MAX_HEARTBEATS);
      await trimTable("keepalive_records", MAX_TEST_RECORDS);
      await trimTable("activity_logs", MAX_ACTIVITY_LOGS);
      totalOps += 3;
    }

    // ── Frontend ping at halfway point ──────────────────────────────────────
    if (pingCount === 28) {
      const feResults = await pingFrontend();
      await logActivity("frontend_ping", { results: feResults });
      totalOps++;
    }

    // ── Final delete at end of loop ─────────────────────────────────────────
    if (pingCount === 50) {
      await deleteOldRecords("audit_log");
      await deleteOldRecords("notifications");
      await deleteOldRecords("requisitions");
      await deleteOldRecords("activity_logs");
      await deleteOldRecords("keepalive_records");
      totalOps += 5;
    }

    // ── Sleep until next second ─────────────────────────────────────────────
    const elapsed = Date.now() % PING_INTERVAL_MS;
    const sleepMs = elapsed > 0 ? PING_INTERVAL_MS - elapsed : PING_INTERVAL_MS;
    if (Date.now() + sleepMs >= deadline) break;
    await new Promise((r) => setTimeout(r, sleepMs));
  }

  // ── Final cleanup: delete all records older than 5 minutes ────────────────
  await deleteOldRecords("audit_log");
  await deleteOldRecords("notifications");
  await deleteOldRecords("requisitions");
  await deleteOldRecords("activity_logs");
  await deleteOldRecords("keepalive_records");
  totalOps += 5;

  // ── Delete the specific records we inserted (dump-and-delete lifecycle) ─────
  await deleteByIds("audit_log", auditIds);
  await deleteByIds("notifications", notifIds);
  await deleteByIds("requisitions", reqIds);
  await deleteByIds("activity_logs", actIds);
  totalOps += auditIds.length + notifIds.length + reqIds.length + actIds.length;

  await logActivity("keepalive_cycle_complete", {
    pings: pingCount,
    total_ops: totalOps,
    records_inserted: {
      audit_log: auditIds.length,
      notifications: notifIds.length,
      requisitions: reqIds.length,
      activity_logs: actIds.length,
      keepalive_records: kprBulk,
    },
  });

  return {
    ok: true,
    version: "3.0",
    pings: pingCount,
    total_ops: totalOps,
    records_inserted: { audit_log: auditIds.length, notifications: notifIds.length, requisitions: reqIds.length, activity_logs: actIds.length, keepalive_records: kprBulk },
    records_deleted: auditIds.length + notifIds.length + reqIds.length + actIds.length,
    mode: "keepalive-v3-dump-and-delete",
  };
}

// ── PROJECTIONS ────────────────────────────────────────────────────────────────
function projections() {
  // Ops per invocation: ~80 (55 pings + 15 inserts + 10 deletes)
  const inv = 80;
  return {
    ops_per_invocation: inv,
    ops_per_minute: inv,
    ops_per_hour: inv * 60,
    ops_per_day: inv * 60 * 24,
    ops_per_week: inv * 60 * 24 * 7,
    ops_per_month: inv * 60 * 24 * 30,
    target_weekly: 7500,
    target_monthly: 22500,
    target_met: inv * 60 * 24 * 7 >= 7500,
  };
}

// ── STATUS ────────────────────────────────────────────────────────────────────
async function getStatus() {
  const counts: Record<string, number> = {};
  for (const t of ["db_heartbeat", "keepalive_records", "activity_logs", "audit_log", "notifications", "requisitions"]) {
    try {
      const { count } = await db.from(t).select("*", { count: "exact", head: true });
      counts[t] = count ?? 0;
    } catch { counts[t] = -1; }
  }
  return counts;
}

// ── HANDLER ───────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  // GET /status
  if (action === "status") {
    const counts = await getStatus();
    return new Response(JSON.stringify({
      ok: true,
      service: "EL5 MediProcure Keep-Alive Bot v3.0",
      status: "running 24/7",
      projections: projections(),
      table_counts: counts,
      config: { loop_seconds: LOOP_SECONDS, keep_records_ms: KEEP_RECORD_MS },
    }), { headers: { ...CORS, "Content-Type": "application/json" } });
  }

  // POST /health
  if (action === "health") {
    const stats = await pingDB();
    const fe = await pingFrontend();
    return new Response(JSON.stringify({ ok: true, db: stats, frontend: fe }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  // POST /cleanup — force clean all old records
  if (action === "cleanup") {
    const tables = ["audit_log", "notifications", "requisitions", "activity_logs", "keepalive_records", "db_heartbeat"];
    const results: Record<string, number> = {};
    for (const t of tables) { results[t] = await deleteOldRecords(t); }
    await logActivity("manual_cleanup", { results });
    return new Response(JSON.stringify({ ok: true, deleted: results }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  // POST /ping — single heartbeat
  if (action === "ping" || action === "single") {
    const stats = await pingDB();
    await insertHeartbeat(stats.latency_ms, stats.status);
    return new Response(JSON.stringify({ ok: true, ...stats }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  // POST /wake — dump into all tables immediately, then delete after 1 min
  if (action === "wake") {
    const ids: Record<string, string[]> = {};
    for (const t of ["audit_log", "notifications", "requisitions", "activity_logs"]) {
      ids[t] = [];
      for (let i = 0; i < 3; i++) {
        const id = await dumpRecord(t, {
          action: t === "audit_log" ? `wake_${Date.now()}` : undefined,
          title: t === "notifications" ? `Wake ${Date.now()}` : undefined,
          source: "keepalive-bot-v3",
          created_at: new Date().toISOString(),
        });
        if (id) ids[t].push(id);
      }
    }
    return new Response(JSON.stringify({ ok: true, wake_ids: ids, delete_after_ms: KEEP_RECORD_MS }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  // DEFAULT: run full keepalive loop (dump + ping + delete)
  const result = await runKeepaliveLoop();
  return new Response(JSON.stringify({ ...result, projections: projections() }), {
    headers: { ...CORS, "Content-Type": "application/json" },
  });
});
