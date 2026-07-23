/**
 * Admin Connectivity Dashboard — live Supabase status, retry counts,
 * queue/backlog size, and heartbeat/audit table growth.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { liveDbEngine, type DbEngineSnapshot } from "@/engines/db/LiveDatabaseEngine";
import { netEngine } from "@/lib/networkEngine";
import AppLayout from "@/components/AppLayout";

const db = supabase as any;

interface Growth { table: string; rows: number; growth24h: number; latestAt?: string | null; }

export default function AdminConnectivityPage() {
  const [snap, setSnap] = useState<DbEngineSnapshot | null>(liveDbEngine.getSnapshot());
  const [growth, setGrowth] = useState<Growth[]>([]);
  const [net, setNet] = useState(netEngine.connection.get());
  const [queueSize, setQueueSize] = useState<number>(0);
  const [retries, setRetries] = useState<number>(0);

  useEffect(() => {
    const off = liveDbEngine.onSnapshot(setSnap);
    const offNet = netEngine.onConnectionChange(setNet);
    if (!liveDbEngine.isRunning()) liveDbEngine.start(60_000);
    return () => { off(); offNet(); };
  }, []);

  useEffect(() => {
    const load = async () => {
      const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
      const tables = ["db_heartbeat", "audit_log", "ip_access_log", "notifications", "erp_sync_queue", "crash_reports"];
      // Was 6 tables × 2 sequential awaits each = 12 serial round trips on
      // every page load. Same data, fired in parallel instead.
      const rows: Growth[] = await Promise.all(tables.map(async (t): Promise<Growth> => {
        try {
          const { count: total } = await db.from(t).select("id", { count: "exact", head: true });
          const { count: recent } = await db.from(t).select("id", { count: "exact", head: true }).gte("created_at", dayAgo);
          return { table: t, rows: total || 0, growth24h: recent || 0 };
        } catch (e: any) {
          return { table: t, rows: 0, growth24h: 0, latestAt: e?.message };
        }
      }));
      setGrowth(rows);

      try {
        const { count } = await db.from("erp_sync_queue").select("id", { count: "exact", head: true }).eq("status", "pending");
        setQueueSize(count || 0);
      } catch { /* noop */ }

      try {
        const { count } = await db.from("erp_sync_queue").select("id", { count: "exact", head: true }).gt("attempts", 0);
        setRetries(count || 0);
      } catch { /* noop */ }
    };
    load();
    const iv = setInterval(load, 30_000);
    return () => clearInterval(iv);
  }, []);

  const stat = (label: string, val: string | number, sub?: string, ok?: boolean) => (
    <div style={{ background: "#fff", border: "1px solid #d5dee9", borderRadius: 6, padding: 14, minWidth: 160 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#68788a", letterSpacing: ".06em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: ok === false ? "#c0392b" : "#1B5CA8", marginTop: 4 }}>{val}</div>
      {sub && <div style={{ fontSize: 11, color: "#7a8798", marginTop: 2 }}>{sub}</div>}
    </div>
  );

  const healthy = snap?.healthyTables ?? 0;
  const total = snap?.totalTables ?? 0;
  const health = total ? Math.round((healthy / total) * 100) : 0;

  return (
    <AppLayout>
      <div style={{ padding: 24, fontFamily: "'Segoe UI','IBM Plex Sans',sans-serif" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0f2c5c", margin: 0 }}>System Connectivity</h1>
        <div style={{ color: "#6b7a8b", fontSize: 13, marginTop: 4, marginBottom: 18 }}>
          Live Supabase health, retry counts, backlog, and heartbeat growth. Refresh: 30s.
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {stat("Supabase Ping", snap ? `${snap.dbLatency} ms` : "—", "REST round-trip", snap ? snap.dbLatency < 900 : undefined)}
          {stat("Tables Healthy", `${healthy}/${total}`, `${health}% up`, health >= 90)}
          {stat("Realtime", snap?.realtimeConnected ? "Connected" : "Disconnected", "postgres_changes", !!snap?.realtimeConnected)}
          {stat("Twilio", snap?.twilioStatus ?? "—", "SMS engine", snap?.twilioStatus === "active")}
          {stat("Queue Backlog", queueSize, "pending sync jobs", queueSize < 50)}
          {stat("Retries", retries, "jobs with attempts > 0")}
          {stat("Network Quality", net.quality, `${net.rttMs} ms RTT`, net.quality === "fast" || net.quality === "medium")}
          {stat("Engine Cycle", snap?.runNumber ?? 0, "poll #")}
        </div>

        <h2 style={{ fontSize: 15, fontWeight: 800, color: "#0f2c5c", marginTop: 28, marginBottom: 8 }}>Heartbeat & Audit Growth (24h)</h2>
        <div style={{ background: "#fff", border: "1px solid #d5dee9", borderRadius: 6, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead style={{ background: "#f2f6fb" }}>
              <tr>
                <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 700, color: "#495769" }}>Table</th>
                <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 700, color: "#495769" }}>Total rows</th>
                <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 700, color: "#495769" }}>New (24h)</th>
                <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 700, color: "#495769" }}>Growth rate</th>
              </tr>
            </thead>
            <tbody>
              {growth.map(g => {
                const rate = g.rows > 0 ? ((g.growth24h / g.rows) * 100).toFixed(1) : "0.0";
                return (
                  <tr key={g.table} style={{ borderTop: "1px solid #eef2f7" }}>
                    <td style={{ padding: "8px 12px", fontFamily: "monospace" }}>{g.table}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right" }}>{g.rows.toLocaleString()}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: g.growth24h > 1000 ? "#c0392b" : "#1B5CA8", fontWeight: 700 }}>+{g.growth24h}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: "#6b7a8b" }}>{rate}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {snap && (
          <>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: "#0f2c5c", marginTop: 28, marginBottom: 8 }}>Per-table Latency</h2>
            <div style={{ background: "#fff", border: "1px solid #d5dee9", borderRadius: 6, maxHeight: 340, overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead style={{ background: "#f2f6fb", position: "sticky", top: 0 }}>
                  <tr>
                    <th style={{ textAlign: "left", padding: "6px 12px" }}>Table</th>
                    <th style={{ textAlign: "left", padding: "6px 12px" }}>Group</th>
                    <th style={{ textAlign: "right", padding: "6px 12px" }}>Rows</th>
                    <th style={{ textAlign: "right", padding: "6px 12px" }}>ms</th>
                    <th style={{ textAlign: "center", padding: "6px 12px" }}>OK</th>
                  </tr>
                </thead>
                <tbody>
                  {snap.tables.map(t => (
                    <tr key={t.table} style={{ borderTop: "1px solid #eef2f7" }}>
                      <td style={{ padding: "6px 12px", fontFamily: "monospace" }}>{t.table}</td>
                      <td style={{ padding: "6px 12px", color: "#6b7a8b" }}>{t.group}</td>
                      <td style={{ padding: "6px 12px", textAlign: "right" }}>{t.rows}</td>
                      <td style={{ padding: "6px 12px", textAlign: "right", color: t.ms > 800 ? "#c0392b" : "#495769" }}>{t.ms}</td>
                      <td style={{ padding: "6px 12px", textAlign: "center" }}>{t.ok ? "✅" : "❌"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
