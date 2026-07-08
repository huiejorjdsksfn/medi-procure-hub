/**
 * SystemHealthWidget — ProcurBosse v12.0.0
 * Real-time system health: DB ping, edge function latency, cache hit rate
 * Renders as a compact status pill in AppLayout header
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type Health = "healthy" | "degraded" | "offline" | "checking";

interface Stats {
  dbLatency: number | null;
  status: Health;
  lastChecked: Date;
  cacheAge: number | null;
}

const STATUS_COLORS: Record<Health, { bg: string; text: string; dot: string }> = {
  healthy:  { bg:"#dcfce7", text:"#15803d", dot:"#22c55e" },
  degraded: { bg:"#fef9c3", text:"#a16207", dot:"#eab308" },
  offline:  { bg:"#fee2e2", text:"#dc2626", dot:"#ef4444" },
  checking: { bg:"#f1f5f9", text:"#64748b", dot:"#94a3b8" },
};

export default function SystemHealthWidget() {
  const [stats, setStats] = useState<Stats>({ dbLatency: null, status: "checking", lastChecked: new Date(), cacheAge: null });
  const [expanded, setExpanded] = useState(false);

  const ping = useCallback(async () => {
    const start = performance.now();
    try {
      const { error } = await supabase.from("system_settings").select("key").limit(1).maybeSingle();
      const latency = Math.round(performance.now() - start);
      setStats({
        dbLatency: latency,
        status: error ? "degraded" : latency < 500 ? "healthy" : "degraded",
        lastChecked: new Date(),
        cacheAge: null,
      });
    } catch {
      setStats(s => ({ ...s, status: "offline", lastChecked: new Date() }));
    }
  }, []);

  useEffect(() => {
    ping();
    const interval = setInterval(ping, 60_000); // ping every minute
    return () => clearInterval(interval);
  }, [ping]);

  const { bg, text, dot } = STATUS_COLORS[stats.status];
  // Pill UI hidden from the header per request; the ping above keeps running in the background.
  // eslint-disable-next-line no-constant-condition
  if (true) return null;
  const label = stats.status === "checking" ? "Checking…" :
                stats.status === "healthy"  ? `${stats.dbLatency}ms` :
                stats.status === "degraded" ? "Slow" : "Offline";

  return (
    <div style={{ position:"relative" }}>
      <button onClick={() => setExpanded(e => !e)}
        style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 10px", background:bg, border:"none", borderRadius:99, cursor:"pointer" }}>
        <span style={{ width:8, height:8, borderRadius:"50%", background:dot,
          boxShadow: stats.status === "healthy" ? `0 0 0 3px ${dot}40` : "none",
          animation: stats.status === "checking" ? "pulse 1s infinite" : "none" }} />
        <span style={{ fontSize:11, fontWeight:700, color:text }}>
          {stats.status === "offline" ? "⚠ Offline" : `DB ${label}`}
        </span>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
      </button>

      {expanded && (
        <div style={{ position:"absolute", top:"calc(100% + 8px)", right:0, width:240, background:"#fff",
          border:"1px solid #e5e7eb", borderRadius:12, boxShadow:"0 8px 30px rgba(0,0,0,0.12)", padding:16, zIndex:1000 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#0f172a", marginBottom:12 }}>⚡ System Health</div>
          <Row label="Database"      value={stats.dbLatency ? `${stats.dbLatency} ms` : "—"} ok={stats.status === "healthy"} />
          <Row label="Status"        value={stats.status.charAt(0).toUpperCase() + stats.status.slice(1)} ok={stats.status === "healthy"} />
          <Row label="Last Check"    value={stats.lastChecked.toLocaleTimeString()} ok />
          <Row label="Service"       value="Supabase PostgreSQL" ok />
          <Row label="Region"        value="eu-west-1" ok />
          <Row label="Version"       value="ProcurBosse v12.0.0" ok />
          <div style={{ marginTop:12, paddingTop:12, borderTop:"1px solid #f1f5f9", display:"flex", justifyContent:"space-between" }}>
            <button onClick={ping} style={{ fontSize:11, color:"#0078d4", background:"none", border:"none", cursor:"pointer", fontWeight:600 }}>↻ Refresh</button>
            <button onClick={() => setExpanded(false)} style={{ fontSize:11, color:"#94a3b8", background:"none", border:"none", cursor:"pointer" }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
      <span style={{ fontSize:11, color:"#64748b" }}>{label}</span>
      <span style={{ fontSize:11, fontWeight:600, color: ok ? "#15803d" : "#dc2626" }}>{value}</span>
    </div>
  );
}
