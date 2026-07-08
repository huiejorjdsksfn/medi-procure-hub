/**
 * EL5 MediProcure — Admin Security Tracker v2.1
 * ADMIN-ONLY · /admin/tracker
 *
 * Tabs:
 *  🖥 Device Tracker   — OS · browser · screen · timezone · language
 *  🌍 Geo / Location   — IP geolocation · city · ISP · lat/lng · map link
 *  🟢 Live Sessions    — active sessions · kill · force-logout
 *  📡 Real-Time Feed   — live Supabase realtime event console
 *  📋 Access Log       — denied attempts, login/logout, resource access
 *  💾 Session Cache    — inspect & clear cached page states per user
 *
 * SECURITY FIX v2.1: removed Password Vault tab — it displayed real
 * user passwords in plaintext. Credential capture has been fully
 * decommissioned (see passwordVault.ts).
 *
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ERP, erpStyles } from "@/lib/erpTheme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { MobileTable } from "@/components/MobileTable";
import { getAllDeviceSessions } from "@/lib/deviceTracker";
import AdminBreadcrumb from "@/components/AdminBreadcrumb";
import procurementBg from "@/assets/procurement-bg.jpg";

const db = supabase as any;

type Tab = "devices" | "geo" | "sessions" | "realtime" | "access_log" | "cache" | "edgeone";

function fmtDT(s: string) {
  if (!s) return "—";
  return new Date(s).toLocaleString("en-KE", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}
function ago(s: string) {
  if (!s) return "—";
  const d = Date.now() - new Date(s).getTime();
  if (d < 60000)   return `${Math.floor(d / 1000)}s ago`;
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000)return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
}

function SC({ s }: { s: string }) { return <span style={erpStyles.statusChip(s)}>{s}</span>; }

interface AccessLog {
  id: string; user_email?: string; action: string; ip_address?: string;
  details?: any; created_at: string; resource_type?: string;
}

interface CacheEntry { key: string; userId: string; page: string; size: number; ts?: number; }

function getCacheEntries(): CacheEntry[] {
  const entries: CacheEntry[] = [];
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i)!;
      if (!k.startsWith("el5_")) continue;
      const val = sessionStorage.getItem(k) || "";
      const parts = k.replace("el5_vs_", "").split("_");
      entries.push({ key: k, userId: parts[0] || "?", page: parts.slice(1).join("_") || k, size: val.length, ts: (() => { try { return JSON.parse(val).ts; } catch { return 0; } })() });
    }
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      if (!k.startsWith("el5_vp_")) continue;
      const val = localStorage.getItem(k) || "";
      entries.push({ key: "[LS]"+k, userId: k.replace("el5_vp_",""), page: "last_valid_path", size: val.length });
    }
  } catch (_e) { /* ignore */ }
  return entries.sort((a, b) => (b.ts||0) - (a.ts||0));
}

const TABS: { id: Tab; label: string; icon: string; col: string }[] = [
  { id: "devices",    label: "Device Tracker",   icon: "🖥", col: "#1d4ed8" },
  { id: "geo",        label: "Geo / Location",   icon: "🌍", col: "#059669" },
  { id: "sessions",   label: "Live Sessions",    icon: "🟢", col: "#16a34a" },
  { id: "realtime",   label: "Real-Time Feed",   icon: "📡", col: "#0369a1" },
  { id: "access_log", label: "Access Log",       icon: "📋", col: "#c2410c" },
  { id: "cache",      label: "Session Cache",    icon: "💾", col: "#0891b2" },
  { id: "edgeone",    label: "EdgeOne CDN",      icon: "🌐", col: "#7c3aed" },
];

export default function AdminTrackerPage() {
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<Tab>("devices");
  const [devices,   setDevices]   = useState<any[]>([]);
  const [sessions,  setSessions]  = useState<any[]>([]);
  const [accessLog, setAccessLog] = useState<AccessLog[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [searchDev,    setSearchDev]    = useState("");
  const [searchGeo,    setSearchGeo]    = useState("");
  const [searchLog,    setSearchLog]    = useState("");
  const [rtLines, setRtLines] = useState<string[]>(["📡 Connecting to realtime…"]);
  const [rtActive, setRtActive] = useState(false);
  const [cacheEntries, setCacheEntries] = useState<CacheEntry[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const rtChan = useRef<any>(null);
  const inp: React.CSSProperties = { ...erpStyles.inp, fontSize: 11 };

  /* ── EdgeOne CDN state ──────────────────────────────────────── */
  const [eoData,       setEoData]       = useState<any>(null);
  const [eoLoading,    setEoLoading]    = useState(false);
  const [eoPurging,    setEoPurging]    = useState(false);
  const [eoLastFetch,  setEoLastFetch]  = useState<string|null>(null);
  const [eoDomains,    setEoDomains]    = useState<any[]>([]);
  const [eoBusyId,     setEoBusyId]     = useState<string|null>(null);
  const [eoAutoRefresh,setEoAutoRefresh]= useState(false);

  const SUPA_URL  = import.meta.env.VITE_SUPABASE_URL  ?? "";
  const SUPA_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";

  const loadEdgeOne = useCallback(async () => {
    setEoLoading(true);
    try {
      const res = await fetch(`${SUPA_URL}/functions/v1/edgeone-stats?action=overview`, {
        headers: { Authorization: `Bearer ${SUPA_ANON}`, "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        setEoData(data);
        setEoLastFetch(new Date().toLocaleString("en-KE"));
      } else {
        const err = await res.text();
        setEoData({ error: `HTTP ${res.status}: ${err.slice(0, 200)}` });
      }
    } catch (e: any) {
      setEoData({ error: e.message });
    }
    setEoLoading(false);
  }, [SUPA_URL, SUPA_ANON]);

  const eoCall = useCallback(async (action: string, method: "GET"|"POST" = "GET", id?: string) => {
    const qs = id ? `&id=${encodeURIComponent(id)}` : "";
    const res = await fetch(`${SUPA_URL}/functions/v1/edgeone-stats?action=${action}${qs}`, {
      method,
      headers: { Authorization: `Bearer ${SUPA_ANON}`, "Content-Type": "application/json" },
    });
    return { ok: res.ok, data: await res.json().catch(() => ({})) };
  }, [SUPA_URL, SUPA_ANON]);

  const loadDomains = useCallback(async () => {
    const { ok, data } = await eoCall("domains");
    if (ok) setEoDomains(data?.domains || []);
  }, [eoCall]);

  const rollbackDeployment = async (id: string) => {
    if (!window.confirm(`Redeploy deployment ${id.slice(-8)} as the new live version?`)) return;
    setEoBusyId(id);
    const { data } = await eoCall("rollback", "POST", id);
    if (data?.triggered) toast({ title: "✅ Rollback triggered", description: `Redeploying #${id.slice(-8)}` });
    else toast({ title: "⚠️ Rollback failed", description: JSON.stringify(data).slice(0,140), variant: "destructive" });
    setEoBusyId(null);
    await loadEdgeOne();
  };

  const cancelDeployment = async (id: string) => {
    if (!window.confirm(`Cancel in-progress deployment ${id.slice(-8)}?`)) return;
    setEoBusyId(id);
    const { data } = await eoCall("cancel", "POST", id);
    if (data?.triggered) toast({ title: "🛑 Cancel requested", description: `#${id.slice(-8)}` });
    else toast({ title: "⚠️ Cancel failed", description: JSON.stringify(data).slice(0,140), variant: "destructive" });
    setEoBusyId(null);
    await loadEdgeOne();
  };

  const triggerPurge = async () => {
    if (!window.confirm("Trigger EdgeOne CDN cache purge + redeploy? This will push the latest build live.")) return;
    setEoPurging(true);
    try {
      const res = await fetch(`${SUPA_URL}/functions/v1/edgeone-stats?action=purge`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SUPA_ANON}`, "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.triggered) {
        toast({ title: "🚀 EdgeOne cache purge triggered", description: `Deployment ID: ${data.deployment_id}` });
      } else {
        toast({ title: "⚠️ Purge result", description: JSON.stringify(data).slice(0, 120), variant: "destructive" });
      }
      await loadEdgeOne();
    } catch (e: any) {
      toast({ title: "Purge failed", description: e.message, variant: "destructive" });
    }
    setEoPurging(false);
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [devRes, sessRes, logRes] = await Promise.allSettled([
      getAllDeviceSessions(),
      db.from("user_sessions").select("*").order("last_activity", { ascending: false }).limit(150),
      db.from("audit_log").select("*").order("created_at", { ascending: false }).limit(500),
    ]);
    if (devRes.status   === "fulfilled") setDevices(devRes.value);
    if (sessRes.status  === "fulfilled") setSessions(sessRes.value.data || []);
    if (logRes.status   === "fulfilled") setAccessLog(logRes.value.data || []);
    setCacheEntries(getCacheEntries());
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Load EdgeOne stats when that tab is opened
  useEffect(() => {
    if (tab === "edgeone" && !eoData) { loadEdgeOne(); loadDomains(); }
  }, [tab, eoData, loadEdgeOne, loadDomains]);

  // EdgeOne auto-refresh (every 20s while tab is open)
  useEffect(() => {
    if (tab !== "edgeone" || !eoAutoRefresh) return;
    const id = setInterval(() => loadEdgeOne(), 20000);
    return () => clearInterval(id);
  }, [tab, eoAutoRefresh, loadEdgeOne]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(loadAll, 15000);
    return () => clearInterval(id);
  }, [autoRefresh, loadAll]);

  // Realtime feed
  useEffect(() => {
    if (!rtActive) { if (rtChan.current) { supabase.removeChannel(rtChan.current); rtChan.current = null; } return; }
    const push = (line: string) => setRtLines(p => [line, ...p.slice(0, 199)]);
    rtChan.current = db.channel("admin_tracker_rt_v2")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_log" }, (p: any) => {
        const l = p.new;
        push(`${new Date().toLocaleTimeString("en-KE")} | ${l.action} | ${l.user_email || "system"} | ${l.ip_address || "?"} | ${l.resource_type || ""}`);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "user_sessions" }, (p: any) => {
        push(`${new Date().toLocaleTimeString("en-KE")} | SESSION_${p.eventType} | ${p.new?.user_email || p.old?.user_email || "?"} | ${p.new?.ip_address || "?"}`);
        loadAll();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "ip_access_rules" }, (p: any) => {
        push(`${new Date().toLocaleTimeString("en-KE")} | IP_RULE_${p.eventType} | ${p.new?.ip_address || p.old?.ip_address || "?"} | ${p.new?.rule_type || ""}`);
      })
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") push("✅ Realtime connected — listening to audit_log, user_sessions, ip_access_rules");
        if (status === "CHANNEL_ERROR") push("❌ Realtime error — check Supabase subscription");
      });
    return () => { if (rtChan.current) supabase.removeChannel(rtChan.current); };
  }, [rtActive, loadAll]);

  async function killSession(id: string, email: string) {
    if (!window.confirm(`Force-end session for ${email}?`)) return;
    const { error } = await db.from("user_sessions").update({ is_active: false, last_activity: new Date().toISOString() }).eq("id", id);
    if (!error) {
      // Log the kill action
      await db.from("audit_log").insert({ action: "session_kill", user_email: email, details: { killed_by: "admin", session_id: id }, resource_type: "session", created_at: new Date().toISOString() });
      toast({ title: `✓ Session killed for ${email}` });
      loadAll();
    } else toast({ title: "Error: " + error.message, variant: "destructive" });
  }

  async function killAllSessions() {
    if (!window.confirm("Kill ALL active sessions? This will force everyone to log out.")) return;
    const { error } = await db.from("user_sessions").update({ is_active: false }).eq("is_active", true);
    if (!error) { toast({ title: "✓ All sessions terminated" }); loadAll(); }
    else toast({ title: "Error: " + error.message, variant: "destructive" });
  }

  function clearCacheEntry(key: string) {
    try {
      if (key.startsWith("[LS]")) localStorage.removeItem(key.replace("[LS]",""));
      else sessionStorage.removeItem(key);
      setCacheEntries(getCacheEntries());
      toast({ title: "✓ Cache entry cleared" });
    } catch (_e) { /* ignore */ }
  }

  function clearAllCache() {
    if (!window.confirm("Clear all session caches? Users will lose their tab/filter state.")) return;
    try {
      const ssKeys = Object.keys(sessionStorage).filter(k => k.startsWith("el5_"));
      const lsKeys = Object.keys(localStorage).filter(k => k.startsWith("el5_vp_") || k.startsWith("el5_vs_"));
      ssKeys.forEach(k => sessionStorage.removeItem(k));
      lsKeys.forEach(k => localStorage.removeItem(k));
      setCacheEntries([]);
      toast({ title: `✓ Cleared ${ssKeys.length + lsKeys.length} cache entries` });
    } catch (_e) { /* ignore */ }
  }

  function exportDevices() {
    const rows = ["User,OS,Browser,Device,Screen,City,Country,ISP,IP,Timezone,Last Seen",
      ...devices.map(d => `"${d.userEmail||""}","${d.device?.os||""} ${d.device?.os_version||""}","${d.device?.browser||""}","${d.device?.device_type||""}","${d.device?.screen_w||""}x${d.device?.screen_h||""}","${d.geo?.city||""}","${d.geo?.country||""}","${d.geo?.isp||""}","${d.geo?.ip||""}","${d.device?.timezone||""}","${d.timestamp||d._updated||""}"`)];
    const b = new Blob([rows.join("\n")], { type: "text/csv" });
    const u = URL.createObjectURL(b); const a = document.createElement("a");
    a.href = u; a.download = `device_tracker_${new Date().toISOString().split("T")[0]}.csv`; a.click();
    URL.revokeObjectURL(u);
  }

  function exportGeo() {
    const rows = ["User,IP,City,Region,Country,ISP,Org,Latitude,Longitude,Timezone",
      ...devices.filter(d => d.geo).map(d => `"${d.userEmail||""}","${d.geo.ip||""}","${d.geo.city||""}","${d.geo.region||""}","${d.geo.country||""}","${d.geo.isp||""}","${d.geo.org||""}","${d.geo.latitude||""}","${d.geo.longitude||""}","${d.geo.timezone||""}"`)];
    const b = new Blob([rows.join("\n")], { type: "text/csv" });
    const u = URL.createObjectURL(b); const a = document.createElement("a");
    a.href = u; a.download = `geo_report_${new Date().toISOString().split("T")[0]}.csv`; a.click();
    URL.revokeObjectURL(u);
  }

  const filteredDevices = devices.filter(d => !searchDev || [d.userEmail, d.device?.os, d.device?.browser, d.geo?.city, d.geo?.country].some(f => f?.toLowerCase().includes(searchDev.toLowerCase())));
  const geoDevices      = devices.filter(d => d.geo).filter(d => !searchGeo || [d.userEmail, d.geo?.city, d.geo?.country, d.geo?.isp, d.geo?.ip].some(f => f?.toLowerCase().includes(searchGeo.toLowerCase())));
  const deniedLogs      = accessLog.filter(l => l.action === "access_denied");
  const filteredLog     = accessLog.filter(l => !searchLog || [l.user_email, l.action, l.ip_address].some(f => f?.toLowerCase().includes(searchLog.toLowerCase())));

  const activeSessions = sessions.filter(s => s.is_active);

  // Geo analytics
  const uniqueCountries = [...new Set(devices.map(d => d.geo?.country).filter(Boolean))];
  const uniqueCities    = [...new Set(devices.map(d => d.geo?.city).filter(Boolean))];
  const uniqueISPs      = [...new Set(devices.map(d => d.geo?.isp).filter(Boolean))];

  const KPIs = [
    { label: "DEVICES SEEN",   val: devices.length,          col: "#1d4ed8", icon: "🖥" },
    { label: "COUNTRIES",      val: uniqueCountries.length,  col: "#059669", icon: "🌍" },
    { label: "ACTIVE SESSIONS",val: activeSessions.length,   col: "#16a34a", icon: "🟢" },
    { label: "DENIED ATTEMPTS",val: deniedLogs.length,       col: "#cc0000", icon: "🚫" },
    { label: "AUDIT EVENTS",   val: accessLog.length,        col: "#c2410c", icon: "📋" },
    { label: "CDN STATUS",     val: eoData?.health?.ok ? "UP" : eoData ? "?" : "—", col: eoData?.health?.ok ? "#7c3aed" : "#6b7280", icon: "🌐" },
  ];

  return (
    <div style={{ backgroundImage: `url(${procurementBg})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed', minHeight: "100vh", fontFamily: ERP.fontFamily, fontSize: 12, color: "#fff" }}>
      <div style={{ background: "rgba(15,0,30,0.92)", minHeight: "100vh" }}>
      <AdminBreadcrumb />
      {/* Title Bar */}
      <div style={{ background: "linear-gradient(135deg,#2d0050,#1a0030)", color: "#fff", padding: "7px 12px", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #4a0080" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🔐</span>
          <div>
            <div>Admin Security Tracker v2.1</div>
            <div style={{ fontSize: 10, fontWeight: 400, opacity: .7 }}>EL5 MediProcure · Embu Level 5 Hospital · RESTRICTED ACCESS</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setAutoRefresh(v => !v)} style={{ padding: "3px 10px", background: autoRefresh ? "#7c3aed" : "#fff2", border: "1px solid #7c3aed", borderRadius: 4, color: "#fff", fontSize: 10, cursor: "pointer" }}>
            {autoRefresh ? "🔴 Live" : "▶ Auto"}
          </button>
          <button onClick={loadAll} style={{ padding: "3px 10px", background: "#fff2", border: "1px solid #4a0080", borderRadius: 4, color: "#fff", fontSize: 10, cursor: "pointer" }}>↻ Refresh</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, background: "#120020", padding: "6px 10px", borderBottom: "1px solid #4a0080", flexWrap: "wrap" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: isMobile ? "5px 8px" : "6px 14px", borderRadius: 5, fontSize: isMobile ? 10 : 11, fontWeight: tab === t.id ? 700 : 500, cursor: "pointer", border: "1px solid", borderColor: tab === t.id ? t.col : "#4a0080", background: tab === t.id ? t.col : "transparent", color: "#fff", whiteSpace: "nowrap" }}>
            {isMobile ? t.icon : `${t.icon} ${t.label}`}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(3,1fr)" : "repeat(6,1fr)", borderBottom: "1px solid #4a0080" }}>
        {KPIs.map((k, i) => (
          <div key={i} style={{ padding: isMobile ? "8px 10px" : "10px 16px", borderRight: "1px solid #4a0080", background: "#1e0035" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 14 }}>{k.icon}</span>
              <span style={{ fontWeight: 800, fontSize: isMobile ? 18 : 22, color: k.col }}>{k.val}</span>
            </div>
            <div style={{ fontSize: 9, color: "#a78bfa", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Content */}
      <div style={{ margin: isMobile ? "4px" : "6px 8px", paddingBottom: 44 }}>

        {/* ══════ DEVICE TRACKER ══════ */}
        {tab === "devices" && (
          <div>
            <div style={{ background: "#0c1f4a", border: "1px solid #1d4ed844", padding: "8px 12px", marginBottom: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", borderRadius: 4 }}>
              <span style={{ fontSize: 12, color: "#93c5fd", fontWeight: 700 }}>🖥 Device Fingerprints — OS · Browser · Screen · Language · Touch</span>
              <input value={searchDev} onChange={e => setSearchDev(e.target.value)} placeholder="Search user, OS, browser…" style={{ ...inp, width: 200, background: "#0a1628", borderColor: "#1d4ed844", color: "#fff" }} />
              <span style={{ fontSize: 11, color: "#60a5fa", marginLeft: "auto" }}>{filteredDevices.length} records</span>
              <button onClick={exportDevices} style={{ padding: "3px 10px", background: "#1d4ed822", border: "1px solid #1d4ed8", borderRadius: 4, color: "#93c5fd", fontSize: 10, cursor: "pointer" }}>↓ Export CSV</button>
            </div>
            {/* Device type breakdown */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 8, marginBottom: 8 }}>
              {[
                { label: "Desktop", icon: "🖥", filter: "desktop" },
                { label: "Mobile",  icon: "📱", filter: "mobile"  },
                { label: "Tablet",  icon: "📟", filter: "tablet"  },
                { label: "Unknown", icon: "❓", filter: "unknown" },
              ].map(d => (
                <div key={d.label} style={{ background: "#1e0035", border: "1px solid #4a0080", padding: "8px 12px", borderRadius: 4 }}>
                  <div style={{ fontSize: 18 }}>{d.icon}</div>
                  <div style={{ fontWeight: 800, fontSize: 20, color: "#c4b5fd" }}>{devices.filter(dev => dev.device?.device_type === d.filter).length}</div>
                  <div style={{ fontSize: 10, color: "#a78bfa" }}>{d.label}</div>
                </div>
              ))}
            </div>
            <div style={{ background: "#0a1628", border: "1px solid #1d4ed844" }}>
              <MobileTable<any>
                loading={loading}
                rows={filteredDevices}
                rowKey={d => d._key || d.userEmail}
                emptyText="No device data — users must sign in to populate"
                cols={[
                  { key: "userEmail", label: "User", primary: true, render: d => <span style={{ color: "#93c5fd", fontWeight: 600 }}>{d.userEmail || "—"}</span> },
                  {
                    key: "os", label: "OS",
                    render: d => {
                      const dev = d.device || {};
                      const icon = dev.os?.includes("Windows") ? "🪟" : dev.os?.includes("Mac") ? "🍎" : dev.os?.includes("Linux") ? "🐧" : dev.os?.includes("Android") ? "🤖" : dev.os?.includes("iOS") || dev.os?.includes("iPad") ? "📱" : "💻";
                      return <span>{icon} {dev.os || "?"} {dev.os_version || ""}</span>;
                    },
                  },
                  {
                    key: "browser", label: "Browser",
                    render: d => {
                      const dev = d.device || {};
                      const icon = dev.browser === "Chrome" ? "🌐" : dev.browser === "Firefox" ? "🦊" : dev.browser === "Safari" ? "🧭" : dev.browser === "Edge" ? "🔷" : "❔";
                      return <span>{icon} {dev.browser || "?"} {dev.browser_version?.split(".")[0] || ""}</span>;
                    },
                  },
                  { key: "device_type", label: "Type", render: d => { const dt = d.device?.device_type || "?"; return <span>{dt === "mobile" ? "📱" : dt === "tablet" ? "📟" : dt === "desktop" ? "🖥" : "❓"} {dt}</span>; } },
                  { key: "screen", label: "Screen", mobileHide: true, render: d => <code style={{ fontSize: 11 }}>{d.device?.screen_w || "?"}×{d.device?.screen_h || "?"}</code> },
                  { key: "tz", label: "Timezone", mobileHide: true, render: d => <span style={{ fontSize: 11, color: "#60a5fa" }}>{d.device?.timezone || "—"}</span> },
                  { key: "lang", label: "Lang", mobileHide: true, render: d => <span style={{ fontSize: 11 }}>{d.device?.language || "—"}</span> },
                  { key: "touch", label: "Touch", mobileHide: true, render: d => <span>{d.device?.touch ? "✅" : "❌"}</span> },
                  { key: "_updated", label: "Last Seen", render: d => <span style={{ fontSize: 11, color: "#6b7280" }}>{ago(d.timestamp || d._updated || "")}</span> },
                ]}
              />
            </div>
          </div>
        )}

        {/* ══════ GEO / LOCATION ══════ */}
        {tab === "geo" && (
          <div>
            <div style={{ background: "#052e16", border: "1px solid #15803d44", padding: "8px 12px", marginBottom: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", borderRadius: 4 }}>
              <span style={{ fontSize: 12, color: "#86efac", fontWeight: 700 }}>🌍 IP Geolocation — City · Country · ISP · Coordinates</span>
              <input value={searchGeo} onChange={e => setSearchGeo(e.target.value)} placeholder="Search city, country, ISP…" style={{ ...inp, width: 200, background: "#0a1f14", borderColor: "#15803d44", color: "#fff" }} />
              <span style={{ fontSize: 11, color: "#4ade80", marginLeft: "auto" }}>{geoDevices.length} geo records</span>
              <button onClick={exportGeo} style={{ padding: "3px 10px", background: "#15803d22", border: "1px solid #15803d", borderRadius: 4, color: "#86efac", fontSize: 10, cursor: "pointer" }}>↓ Export CSV</button>
            </div>
            {/* Country pills */}
            <div style={{ background: "#0a1f14", border: "1px solid #15803d44", padding: "8px 12px", marginBottom: 8, borderRadius: 4 }}>
              <div style={{ fontSize: 11, color: "#4ade80", fontWeight: 700, marginBottom: 6 }}>
                🌐 {uniqueCountries.length} countries · {uniqueCities.length} cities · {uniqueISPs.length} ISPs
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {uniqueCountries.map(c => (
                  <span key={c as string} style={{ padding: "2px 8px", background: "#15803d22", border: "1px solid #15803d44", borderRadius: 10, fontSize: 11, color: "#86efac" }}>{c as string}</span>
                ))}
              </div>
            </div>
            <div style={{ background: "#0a1f14", border: "1px solid #15803d44" }}>
              <MobileTable<any>
                loading={loading}
                rows={geoDevices}
                rowKey={d => d._key}
                emptyText="No geolocation data — requires network access on user login"
                cols={[
                  { key: "userEmail", label: "User", primary: true, render: d => <span style={{ color: "#86efac", fontWeight: 600 }}>{d.userEmail || "—"}</span> },
                  { key: "ip", label: "IP", render: d => <code style={{ fontSize: 11 }}>{d.geo?.ip || "—"}</code> },
                  { key: "city", label: "City", render: d => <span style={{ fontSize: 11 }}>{d.geo?.city || "—"}</span> },
                  { key: "region", label: "Region", mobileHide: true, render: d => <span style={{ fontSize: 11, color: "#4ade80" }}>{d.geo?.region || "—"}</span> },
                  { key: "country", label: "Country", render: d => <span style={{ fontWeight: 600 }}>{d.geo?.country || "—"} {d.geo?.country_code ? `(${d.geo.country_code})` : ""}</span> },
                  { key: "isp", label: "ISP/Org", mobileHide: false, render: d => <span style={{ fontSize: 11, color: "#4ade80" }}>{d.geo?.isp || d.geo?.org || "—"}</span> },
                  {
                    key: "coords", label: "Coordinates", mobileHide: true,
                    render: d => d.geo?.latitude ? (
                      <a href={`https://maps.google.com/?q=${d.geo.latitude},${d.geo.longitude}`} target="_blank" rel="noreferrer"
                        style={{ color: "#86efac", fontSize: 11, textDecoration: "none" }}>
                        📍 {d.geo.latitude.toFixed(3)}, {d.geo.longitude.toFixed(3)}
                      </a>
                    ) : <span style={{ color: "#6b7280" }}>—</span>,
                  },
                  { key: "tz_geo", label: "Timezone", mobileHide: true, render: d => <span style={{ fontSize: 11, color: "#4ade80" }}>{d.geo?.timezone || "—"}</span> },
                  { key: "_updated", label: "Seen", render: d => <span style={{ fontSize: 11, color: "#6b7280" }}>{ago(d.timestamp || d._updated || "")}</span> },
                ]}
              />
            </div>
          </div>
        )}

        {/* ══════ LIVE SESSIONS ══════ */}
        {tab === "sessions" && (
          <div>
            <div style={{ background: "#052e16", border: "1px solid #16a34a44", padding: "8px 12px", marginBottom: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", borderRadius: 4 }}>
              <span style={{ fontSize: 12, color: "#86efac", fontWeight: 700 }}>🟢 Live Sessions — {activeSessions.length} active · {sessions.length} total</span>
              <span style={{ marginLeft: "auto", fontSize: 11, color: "#4ade80" }}></span>
              <button onClick={killAllSessions} style={{ padding: "3px 10px", background: "#ef444422", border: "1px solid #ef4444", borderRadius: 4, color: "#fca5a5", fontSize: 10, cursor: "pointer" }}>💀 Kill All</button>
              <button onClick={loadAll} style={{ padding: "3px 10px", background: "#16a34a22", border: "1px solid #16a34a", borderRadius: 4, color: "#86efac", fontSize: 10, cursor: "pointer" }}>↻ Refresh</button>
            </div>
            <div style={{ background: "#0a1f14", border: "1px solid #15803d44" }}>
              <MobileTable<any>
                loading={loading}
                rows={sessions}
                rowKey={s => s.id}
                emptyText="No session data"
                cols={[
                  { key: "user_email", label: "User", primary: true, render: s => <span style={{ color: "#86efac", fontWeight: 600 }}>{s.user_email || s.user_name || s.full_name || "Unknown User"}</span> },
                  { key: "ip_address", label: "IP", render: s => <code style={{ fontSize: 11 }}>{s.ip_address || "—"}</code> },
                  { key: "location", label: "Location", mobileHide: false, render: s => <span style={{ fontSize: 11 }}>{s.location || "—"}</span> },
                  { key: "is_active", label: "Status", render: s => <SC s={s.is_active ? "active" : "ended"} /> },
                  { key: "started_at", label: "Started", mobileHide: true, render: s => <span style={{ fontSize: 11, color: "#4ade80" }}>{fmtDT(s.started_at)}</span> },
                  { key: "last_activity", label: "Last Active", render: s => <span style={{ fontSize: 11, color: "#6b7280" }}>{ago(s.last_activity || s.started_at)}</span> },
                  { key: "request_count", label: "Reqs", mobileHide: true, render: s => <span style={{ textAlign: "center" }}>{s.request_count || "—"}</span>, tdStyle: { textAlign: "center" } },
                  {
                    key: "id" as any, label: "Action",
                    render: s => s.is_active ? (
                      <button onClick={() => killSession(s.id, s.user_email)} style={{ padding: "2px 8px", background: "#ef444422", border: "1px solid #ef4444", borderRadius: 3, color: "#fca5a5", fontSize: 10, cursor: "pointer" }}>💀 Kill</button>
                    ) : <span style={{ fontSize: 10, color: "#4b5563" }}>ended</span>,
                  },
                ]}
              />
            </div>
          </div>
        )}

        {/* ══════ REAL-TIME FEED ══════ */}
        {tab === "realtime" && (
          <div>
            <div style={{ background: "#0c1a2e", border: "1px solid #0369a144", padding: "8px 12px", marginBottom: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", borderRadius: 4 }}>
              <span style={{ fontSize: 12, color: "#7dd3fc", fontWeight: 700 }}>📡 Realtime Event Console — audit_log · user_sessions · ip_access_rules</span>
              <button onClick={() => setRtActive(v => !v)} style={{ padding: "3px 10px", background: rtActive ? "#0369a1" : "#0369a122", border: "1px solid #0369a1", borderRadius: 4, color: "#7dd3fc", fontSize: 10, cursor: "pointer" }}>
                {rtActive ? "🔴 Disconnect" : "▶ Connect"}
              </button>
              <button onClick={() => setRtLines([])} style={{ padding: "3px 10px", background: "#ffffff11", border: "1px solid #ffffff22", borderRadius: 4, color: "#94a3b8", fontSize: 10, cursor: "pointer" }}>Clear</button>
              <span style={{ fontSize: 11, color: "#0369a1", marginLeft: "auto" }}>{rtLines.length} events</span>
            </div>
            <div style={{ background: "#050a14", border: "1px solid #0369a144", borderRadius: 4, fontFamily: "monospace", fontSize: 11, padding: 12, maxHeight: isMobile ? 400 : "calc(100vh - 280px)", overflow: "auto" }}>
              {rtLines.map((line, i) => (
                <div key={i} style={{ color: i === 0 ? "#7dd3fc" : i < 5 ? "#93c5fd" : "#475569", padding: "2px 0", borderBottom: "1px solid #0f172a" }}>
                  <span style={{ color: "#1e3a5f" }}>{`>`}</span> {line}
                </div>
              ))}
              {!rtActive && <div style={{ color: "#334155", padding: "30px 0", textAlign: "center" }}>Feed is stopped. Click ▶ Connect to begin.</div>}
            </div>
          </div>
        )}

        {/* ══════ ACCESS LOG ══════ */}
        {tab === "access_log" && (
          <div>
            <div style={{ background: "#2d1005", border: "1px solid #c2410c44", padding: "8px 12px", marginBottom: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", borderRadius: 4 }}>
              <span style={{ fontSize: 12, color: "#fdba74", fontWeight: 700 }}>📋 Access Log — denied attempts · logins · logouts · resource access</span>
              <input value={searchLog} onChange={e => setSearchLog(e.target.value)} placeholder="Search user, action, IP…" style={{ ...inp, width: 200, background: "#1a0a02", borderColor: "#c2410c44", color: "#fff" }} />
              <div style={{ display: "flex", gap: 8, marginLeft: "auto", flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, padding: "2px 8px", background: "#ef444422", border: "1px solid #ef444444", borderRadius: 10, color: "#fca5a5" }}>🚫 {deniedLogs.length} denied</span>
                <span style={{ fontSize: 11, color: "#fb923c" }}>{filteredLog.length} total</span>
              </div>
            </div>
            <div style={{ background: "#1a0a02", border: "1px solid #c2410c44" }}>
              <MobileTable<AccessLog>
                loading={loading}
                rows={filteredLog}
                rowKey={l => l.id}
                emptyText="No access events"
                maxHeight={isMobile ? undefined : "calc(100vh - 280px)"}
                cols={[
                  { key: "created_at", label: "Time", primary: true, render: l => <span style={{ fontFamily: "monospace", fontSize: 11, color: "#fb923c", whiteSpace: "nowrap" }}>{ago(l.created_at)}</span> },
                  { key: "action", label: "Event", render: l => <SC s={l.action} /> },
                  { key: "user_email", label: "User", render: l => <span style={{ color: "#fdba74" }}>{l.user_email || "—"}</span> },
                  { key: "ip_address", label: "IP", mobileHide: false, render: l => <code style={{ fontSize: 11 }}>{l.ip_address || "—"}</code> },
                  {
                    key: "details", label: "Details", mobileHide: true,
                    render: l => {
                      const d = l.details || {};
                      if (l.action === "access_denied") return <span style={{ fontSize: 11, color: "#fca5a5" }}>Needs: {(d.required_roles||[]).join(",")} | Has: {(d.user_roles||[]).join(",")}</span>;
                      if (l.action === "session_start" || l.action === "session_kill") return <span style={{ fontSize: 11, color: "#fb923c" }}>{d.os||""} {d.browser||""} {d.city||""} {d.country||""}</span>;
                      return <span style={{ fontSize: 11, color: "#6b7280" }}>{JSON.stringify(d).slice(0,70)}</span>;
                    },
                    tdStyle: { maxWidth: 280 },
                  },
                ]}
              />
            </div>
          </div>
        )}

        {/* ══════ SESSION CACHE ══════ */}
        {tab === "cache" && (
          <div>
            <div style={{ background: "#0c2233", border: "1px solid #0891b244", padding: "8px 12px", marginBottom: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", borderRadius: 4 }}>
              <span style={{ fontSize: 12, color: "#67e8f9", fontWeight: 700 }}>💾 Session Cache — per-user tab · filter · scroll position state</span>
              <span style={{ marginLeft: "auto", fontSize: 11, color: "#22d3ee" }}>{cacheEntries.length} entries</span>
              <button onClick={() => setCacheEntries(getCacheEntries())} style={{ padding: "3px 10px", background: "#0891b222", border: "1px solid #0891b2", borderRadius: 4, color: "#67e8f9", fontSize: 10, cursor: "pointer" }}>↻ Refresh</button>
              <button onClick={clearAllCache} style={{ padding: "3px 10px", background: "#ef444422", border: "1px solid #ef4444", borderRadius: 4, color: "#fca5a5", fontSize: 10, cursor: "pointer" }}>🗑 Clear All</button>
            </div>
            <div style={{ background: "#051622", border: "1px solid #0891b244", padding: "10px 14px", marginBottom: 6, borderRadius: 4 }}>
              <div style={{ fontSize: 11, color: "#67e8f9", marginBottom: 6, fontWeight: 700 }}>ℹ️ How Session Cache Works</div>
              <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.7 }}>
                When a user is silently redirected by RoleGuard (no "access denied" error shown), the system saves their last tab, search filter, and scroll position. On return, their state is restored automatically. Admins can inspect or clear these cached states below.
              </div>
            </div>
            <div style={{ background: "#0a1628", border: "1px solid #0891b244" }}>
              <MobileTable<CacheEntry>
                loading={false}
                rows={cacheEntries}
                rowKey={c => c.key}
                emptyText="No session cache entries — users have not navigated any pages yet"
                cols={[
                  { key: "userId", label: "User / Session", primary: true, render: c => <code style={{ fontSize: 11, color: "#67e8f9" }}>{c.userId.slice(0,20)}</code> },
                  { key: "page", label: "Page / State Key", render: c => <span style={{ fontSize: 11, color: "#22d3ee" }}>{c.page}</span> },
                  { key: "size", label: "Size (bytes)", render: c => <span style={{ fontSize: 11, color: "#94a3b8" }}>{c.size.toLocaleString()} B</span>, tdStyle: { textAlign: "right" } },
                  { key: "ts", label: "Saved", mobileHide: false, render: c => <span style={{ fontSize: 11, color: "#6b7280" }}>{c.ts ? ago(new Date(c.ts).toISOString()) : "—"}</span> },
                  {
                    key: "key" as any, label: "Del",
                    render: c => <button onClick={() => clearCacheEntry(c.key)} style={{ padding: "2px 6px", background: "#ef444422", border: "1px solid #ef4444", borderRadius: 3, color: "#fca5a5", fontSize: 10, cursor: "pointer" }}>✕</button>,
                  },
                ]}
              />
            </div>
          </div>
        )}

        {/* ══════ EDGEONE CDN ══════ */}
        {tab === "edgeone" && (() => {
          const health  = eoData?.health ?? null;
          const stats   = eoData?.stats  ?? null;
          const project = eoData?.project ?? null;
          const deploys: any[] = eoData?.deployments ?? [];
          const statusColor = (s: string) =>
            s === "success" || s === "active" || s === "published" ? "#4ade80"
            : s === "failed" || s === "error" ? "#f87171"
            : s === "building" || s === "deploying" ? "#fbbf24"
            : "#94a3b8";

          return (
            <div>
              {/* Toolbar */}
              <div style={{ background: "#1a0040", border: "1px solid #7c3aed44", padding: "8px 12px", marginBottom: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", borderRadius: 4 }}>
                <span style={{ fontSize: 12, color: "#c4b5fd", fontWeight: 700 }}>🌐 EdgeOne CDN — procurbosse.edgeone.app</span>
                <span style={{ fontSize: 10, color: "#7c3aed", marginLeft: 4 }}>
                  {eoLastFetch ? `Updated: ${eoLastFetch}` : "Not loaded"}
                </span>
                <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                  <button onClick={loadEdgeOne} disabled={eoLoading} style={{ padding: "3px 10px", background: "#7c3aed22", border: "1px solid #7c3aed", borderRadius: 4, color: "#c4b5fd", fontSize: 10, cursor: "pointer", opacity: eoLoading ? 0.5 : 1 }}>
                    {eoLoading ? "⏳ Loading…" : "↻ Refresh"}
                  </button>
                  <button onClick={triggerPurge} disabled={eoPurging || eoLoading} style={{ padding: "3px 10px", background: "#7c3aed", border: "1px solid #a78bfa", borderRadius: 4, color: "#fff", fontSize: 10, cursor: "pointer", fontWeight: 700, opacity: eoPurging ? 0.6 : 1 }}>
                    {eoPurging ? "🚀 Purging…" : "🚀 Purge Cache"}
                  </button>
                  <a href="https://procurbosse.edgeone.app" target="_blank" rel="noreferrer" style={{ padding: "3px 10px", background: "#ffffff11", border: "1px solid #7c3aed44", borderRadius: 4, color: "#c4b5fd", fontSize: 10, cursor: "pointer", textDecoration: "none" }}>↗ Open Site</a>
                </div>
              </div>

              {eoData?.error && (
                <div style={{ background: "#3b0000", border: "1px solid #ef4444", borderRadius: 4, padding: "10px 14px", marginBottom: 8, color: "#fca5a5", fontSize: 11 }}>
                  ❌ EdgeOne API Error: {eoData.error}
                </div>
              )}

              {eoLoading && !eoData && (
                <div style={{ textAlign: "center", padding: 40, color: "#7c3aed" }}>⏳ Fetching EdgeOne data…</div>
              )}

              {eoData && !eoData.error && (
                <>
                  {/* Health + Stats KPIs */}
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(5,1fr)", gap: 8, marginBottom: 10 }}>
                    {[
                      { icon: "🟢", label: "SITE STATUS",      val: health?.ok ? "ONLINE" : "⚠️ DOWN", col: health?.ok ? "#4ade80" : "#f87171" },
                      { icon: "⚡", label: "LATENCY",          val: health?.latency_ms != null ? `${health.latency_ms} ms` : "—", col: health?.latency_ms < 300 ? "#4ade80" : health?.latency_ms < 800 ? "#fbbf24" : "#f87171" },
                      { icon: "📦", label: "TOTAL DEPLOYS",    val: stats?.total ?? 0,    col: "#c4b5fd" },
                      { icon: "✅", label: "SUCCESSFUL",       val: stats?.success ?? 0,  col: "#4ade80" },
                      { icon: "❌", label: "FAILED DEPLOYS",   val: stats?.failed ?? 0,   col: stats?.failed > 0 ? "#f87171" : "#6b7280" },
                    ].map((k, i) => (
                      <div key={i} style={{ background: "#1e0050", border: "1px solid #7c3aed44", padding: "10px 14px", borderRadius: 4 }}>
                        <div style={{ fontSize: 16 }}>{k.icon}</div>
                        <div style={{ fontWeight: 800, fontSize: isMobile ? 16 : 20, color: k.col, marginTop: 2 }}>{String(k.val)}</div>
                        <div style={{ fontSize: 9, color: "#a78bfa", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 3 }}>{k.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Health Details */}
                  {health && (
                    <div style={{ background: "#0d0020", border: "1px solid #7c3aed44", borderRadius: 4, padding: "10px 14px", marginBottom: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#c4b5fd", marginBottom: 8 }}>🩺 Live Health Check — {health.url}</div>
                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 8 }}>
                        {[
                          { label: "HTTP Status",   val: health.status ?? "—",          col: health.status === 200 ? "#4ade80" : "#f87171" },
                          { label: "Response Time", val: health.latency_ms != null ? `${health.latency_ms}ms` : "—", col: "#c4b5fd" },
                          { label: "Cache-Control", val: health.cache_control ?? "not set", col: health.cache_control?.includes("no-store") ? "#4ade80" : "#fbbf24" },
                          { label: "CDN Cache",     val: health.cf_cache ?? "—",         col: "#94a3b8" },
                          { label: "Server",        val: health.server ?? "—",            col: "#94a3b8" },
                          { label: "Age",           val: health.age != null ? `${health.age}s` : "—", col: Number(health.age) > 0 ? "#fbbf24" : "#4ade80" },
                          { label: "Via",           val: health.via ?? "—",               col: "#94a3b8" },
                          { label: "Checked At",    val: health.checked_at ? new Date(health.checked_at).toLocaleTimeString("en-KE") : "—", col: "#6b7280" },
                        ].map((r, i) => (
                          <div key={i} style={{ background: "#1a0040", borderRadius: 3, padding: "6px 10px" }}>
                            <div style={{ fontSize: 9, color: "#7c3aed", fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>{r.label}</div>
                            <div style={{ fontSize: 11, color: r.col, fontWeight: 600, wordBreak: "break-all" }}>{r.val}</div>
                          </div>
                        ))}
                      </div>
                      {health.error && <div style={{ marginTop: 8, color: "#f87171", fontSize: 11 }}>❌ Error: {health.error}</div>}
                    </div>
                  )}

                  {/* Project Info */}
                  {project && (
                    <div style={{ background: "#0d0020", border: "1px solid #7c3aed44", borderRadius: 4, padding: "10px 14px", marginBottom: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#c4b5fd", marginBottom: 8 }}>📁 Project Details</div>
                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 6 }}>
                        {Object.entries(project).filter(([, v]) => typeof v !== "object").slice(0, 9).map(([k, v]) => (
                          <div key={k} style={{ background: "#1a0040", borderRadius: 3, padding: "5px 10px" }}>
                            <div style={{ fontSize: 9, color: "#7c3aed", fontWeight: 700, textTransform: "uppercase" }}>{k.replace(/_/g, " ")}</div>
                            <div style={{ fontSize: 11, color: "#c4b5fd", marginTop: 1, wordBreak: "break-all" }}>{String(v ?? "—")}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Deployments List */}
                  <div style={{ background: "#0d0020", border: "1px solid #7c3aed44", borderRadius: 4, padding: "10px 14px", marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#c4b5fd", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
                      <span>🚀 Recent Deployments ({deploys.length})</span>
                      {stats?.latest_at && <span style={{ fontSize: 10, color: "#7c3aed" }}>Latest: {new Date(stats.latest_at).toLocaleString("en-KE")}</span>}
                    </div>
                    {deploys.length === 0 && (
                      <div style={{ color: "#6b7280", fontSize: 11, textAlign: "center", padding: "16px 0" }}>
                        No deployments found — deploy via GitHub Actions or EdgeOne CLI
                      </div>
                    )}
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 320, overflowY: "auto" }}>
                      {deploys.map((d: any, i: number) => (
                        <div key={d.id ?? i} style={{ background: i === 0 ? "#2d0060" : "#1a0040", border: `1px solid ${i === 0 ? "#7c3aed" : "#3a0080"}`, borderRadius: 3, padding: "7px 12px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                          {i === 0 && <span style={{ fontSize: 9, fontWeight: 800, background: "#7c3aed", color: "#fff", padding: "1px 6px", borderRadius: 10, flexShrink: 0 }}>LATEST</span>}
                          <span style={{ fontSize: 9, fontFamily: "monospace", color: "#7c3aed", flexShrink: 0 }}>#{(d.id ?? "").slice(-8) || `${i + 1}`}</span>
                          <span style={{ fontWeight: 700, fontSize: 11, color: statusColor(d.status ?? ""), flexShrink: 0 }}>
                            {d.status === "success" || d.status === "active" || d.status === "published" ? "✅"
                              : d.status === "failed" || d.status === "error" ? "❌"
                              : d.status === "building" || d.status === "deploying" ? "⏳" : "❓"} {d.status ?? "unknown"}
                          </span>
                          {d.commit_message && <span style={{ fontSize: 10, color: "#94a3b8", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.commit_message}</span>}
                          {d.branch && <span style={{ fontSize: 9, color: "#7c3aed", background: "#3a0080", padding: "1px 6px", borderRadius: 4 }}>⎇ {d.branch}</span>}
                          {d.url && <a href={d.url} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: "#c4b5fd", textDecoration: "none" }}>↗ View</a>}
                          <span style={{ fontSize: 9, color: "#4b5563", marginLeft: "auto", flexShrink: 0 }}>
                            {d.created_at ? new Date(d.created_at).toLocaleString("en-KE") : d.updated_at ? new Date(d.updated_at).toLocaleString("en-KE") : "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Raw API response toggle */}
                  <details style={{ background: "#0a0018", border: "1px solid #3a0080", borderRadius: 4, padding: "6px 10px" }}>
                    <summary style={{ fontSize: 10, color: "#7c3aed", cursor: "pointer", userSelect: "none" }}>🔍 Raw EdgeOne API response</summary>
                    <pre style={{ fontSize: 9, color: "#6b7280", overflowX: "auto", marginTop: 6, maxHeight: 200, overflowY: "auto" }}>
                      {JSON.stringify(eoData, null, 2).slice(0, 3000)}
                    </pre>
                  </details>
                </>
              )}
            </div>
          );
        })()}

      </div>

      {/* Status Bar */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#120020", borderTop: "1px solid #4a0080", padding: "2px 10px", fontSize: 11, color: "#a78bfa", display: "flex", gap: 10, flexWrap: "wrap", zIndex: 100 }}>
        <span>🖥 {devices.length} devices</span>
        <span>|</span><span>🌍 {uniqueCountries.length} countries</span>
        <span>|</span><span>🟢 {activeSessions.length} active</span>
        <span>|</span><span>🚫 {deniedLogs.length} denied</span>
        <span>|</span><span>💾 {cacheEntries.length} cache</span>
        <span>|</span><span style={{ color: eoData?.health?.ok ? "#a78bfa" : "#6b7280" }}>🌐 CDN {eoData?.health?.ok ? `✅ ${eoData.health.latency_ms}ms` : eoData ? "⚠️" : "—"}</span>
        {rtActive && <><span>|</span><span style={{ color: "#7dd3fc", fontWeight: 700 }}>📡 LIVE</span></>}
        {autoRefresh && <><span>|</span><span style={{ color: "#22c55e", fontWeight: 700 }}>🔴 AUTO 15s</span></>}
        <span style={{ marginLeft: "auto" }}>EL5 Admin Tracker v2.1 · RESTRICTED · {new Date().toLocaleTimeString("en-KE")}</span>
      </div>
      </div>
    </div>
  );
}
