/**
 * EL5 MediProcure — Users & IP Audit v3.0
 * Real-time data from ip_access_log, audit_log, profiles
 * Embu Level 5 Hospital
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Users, Shield, Globe, MapPin, Monitor, Smartphone, Laptop, Wifi,
  Clock, CheckCircle, XCircle, AlertTriangle, RefreshCw, Download,
  Search, Eye, Ban, Trash2, Lock, Zap, Plus, ChevronRight,
  UserCheck, BarChart3, Database, Activity, Building2, Home, Terminal,
  Network, Signal, Calendar, User,
} from "lucide-react";

const db = supabase as any;

type TabType = "overview" | "users" | "ip_audit" | "access_log" | "geo";

interface AuditLog {
  id: string;
  user_name?: string | null;
  action: string;
  ip_address?: string | null;
  user_agent?: string | null;
  module: string;
  created_at: string;
}

interface AccessLogEntry {
  id: string;
  ip_address: string;
  user_email?: string | null;
  user_agent?: string | null;
  city?: string | null;
  country?: string | null;
  allowed: boolean;
  reason?: string | null;
  path?: string | null;
  created_at?: string | null;
}

interface UserProfile {
  id: string;
  email?: string | null;
  full_name: string;
  department?: string | null;
  is_active?: boolean | null;
  is_locked?: boolean | null;
  last_ip?: string | null;
  last_seen?: string | null;
  role?: string | null;
}

const D = {
  blue:    "#0078d4", blueLt:  "#deecf9",
  bg:      "#f3f2f1", card:    "#ffffff",
  border:  "#edebe9", borderMd:"#c8c6c4",
  text:    "#323130", textSub: "#605e5c", textMt:  "#a19f9d",
  success: "#107c10", successLt:"#dff6dd",
  warn:    "#ff8c00", warnLt:  "#fff4ce",
  danger:  "#a4262c", dangerLt:"#fde7e9",
  teal:    "#038387", tealLt:  "#d1f2f4",
  purple:  "#8764b8", purpleLt:"#e8d0f7",
  shadow:  "0 1.6px 3.6px rgba(0,0,0,.132)",
  radius:  "4px",
  font:    "'Segoe UI','Segoe UI Web','Arial',sans-serif",
};

function ago(s?: string | null): string {
  if (!s) return "—";
  const d = Date.now() - new Date(s).getTime();
  if (d < 60000) return `${Math.floor(d / 1000)}s ago`;
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
}

function parseDeviceType(ua?: string | null): "desktop" | "mobile" | "tablet" {
  if (!ua) return "desktop";
  if (ua.includes("Mobile") || ua.includes("Android")) return "mobile";
  if (ua.includes("iPad") || ua.includes("Tablet")) return "tablet";
  return "desktop";
}

function parseBrowser(ua?: string | null): string {
  if (!ua) return "Unknown";
  if (ua.includes("Edg")) return "Edge";
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari")) return "Safari";
  return "Other";
}

function parseOS(ua?: string | null): string {
  if (!ua) return "Unknown";
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Mac")) return "macOS";
  if (ua.includes("Linux")) return "Linux";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("iOS") || ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
  return "Other";
}

function DeviceIcon({ ua }: { ua?: string | null }) {
  const t = parseDeviceType(ua);
  if (t === "mobile") return <Smartphone size={12} />;
  if (t === "tablet") return <Laptop size={12} />;
  return <Monitor size={12} />;
}

function cs(extra?: any) {
  return { background: D.card, borderRadius: "6px", boxShadow: D.shadow, border: `1px solid ${D.border}`, ...extra };
}

const TABS: { id: TabType; label: string; I: any }[] = [
  { id: "overview",    label: "Overview",    I: Shield    },
  { id: "users",       label: "Users",       I: Users     },
  { id: "ip_audit",    label: "IP Audit",    I: Globe     },
  { id: "access_log",  label: "Access Log",  I: Clock     },
  { id: "geo",         label: "Geo & Device",I: MapPin    },
];

export default function UsersIpAuditPage() {
  const [tab, setTab] = useState<TabType>("overview");
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [accessLog, setAccessLog] = useState<AccessLogEntry[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [liveActivity, setLiveActivity] = useState<string[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [logsRes, accessRes, usersRes] = await Promise.allSettled([
        db.from("audit_log").select("*").order("created_at", { ascending: false }).limit(500),
        db.from("ip_access_log").select("*").order("created_at", { ascending: false }).limit(500),
        db.from("profiles").select("id,email,full_name,department,is_active,is_locked,last_ip,last_seen,role").order("full_name").limit(500),
      ]);
      if (logsRes.status === "fulfilled") setAuditLogs(logsRes.value.data || []);
      if (accessRes.status === "fulfilled") setAccessLog(accessRes.value.data || []);
      if (usersRes.status === "fulfilled") setUsers(usersRes.value.data || []);
    } catch (e) { console.error("Load error:", e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      loadAll();
      setLiveActivity(prev => [`${new Date().toLocaleTimeString("en-KE")} — Data refreshed`, ...prev.slice(0, 9)]);
    }, 20000);
    return () => clearInterval(id);
  }, [autoRefresh, loadAll]);

  // Real-time subscriptions on actual tables
  useEffect(() => {
    const ch = db.channel("users_ip_audit_v3")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_log" }, (payload: any) => {
        const log: AuditLog = payload.new;
        setAuditLogs(prev => [log, ...prev.slice(0, 499)]);
        setLiveActivity(prev => [
          `${new Date().toLocaleTimeString("en-KE")} — AUDIT: ${log.action} | ${log.user_name || "system"} | ${log.ip_address || "?"} | ${log.module}`,
          ...prev.slice(0, 9),
        ]);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ip_access_log" }, (payload: any) => {
        const entry: AccessLogEntry = payload.new;
        setAccessLog(prev => [entry, ...prev.slice(0, 499)]);
        setLiveActivity(prev => [
          `${new Date().toLocaleTimeString("en-KE")} — ${entry.allowed ? "ALLOWED" : "BLOCKED"}: ${entry.ip_address} | ${entry.user_email || "anonymous"} | ${[entry.city, entry.country].filter(Boolean).join(", ") || "?"}`,
          ...prev.slice(0, 9),
        ]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, () => loadAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadAll]);

  // Stats
  const stats = useMemo(() => ({
    totalUsers:     users.length,
    activeUsers:    users.filter(u => u.is_active !== false).length,
    lockedUsers:    users.filter(u => u.is_locked).length,
    totalAccess:    accessLog.length,
    allowedAccess:  accessLog.filter(e => e.allowed).length,
    blockedAccess:  accessLog.filter(e => !e.allowed).length,
    uniqueIPs:      [...new Set(accessLog.map(e => e.ip_address))].length,
    auditEvents:    auditLogs.length,
    todayAccess:    accessLog.filter(e => e.created_at && new Date(e.created_at).toDateString() === new Date().toDateString()).length,
    countries:      [...new Set(accessLog.map(e => e.country).filter(Boolean))].length,
  }), [users, accessLog, auditLogs]);

  // IP stats per user (from access log)
  const userIPMap = useMemo(() => {
    const map: Record<string, { ips: Set<string>; allowed: number; blocked: number; lastSeen?: string | null; cities: Set<string>; countries: Set<string> }> = {};
    for (const e of accessLog) {
      const key = e.user_email || "anonymous";
      if (!map[key]) map[key] = { ips: new Set(), allowed: 0, blocked: 0, lastSeen: e.created_at, cities: new Set(), countries: new Set() };
      map[key].ips.add(e.ip_address);
      if (e.allowed) map[key].allowed++; else map[key].blocked++;
      if (e.city) map[key].cities.add(e.city);
      if (e.country) map[key].countries.add(e.country);
    }
    return map;
  }, [accessLog]);

  // IP stats from access_log
  const ipStats = useMemo(() => {
    const map: Record<string, { count: number; allowed: number; blocked: number; users: Set<string>; city?: string | null; country?: string | null; lastSeen?: string | null; ua?: string | null }> = {};
    for (const e of accessLog) {
      if (!map[e.ip_address]) map[e.ip_address] = { count: 0, allowed: 0, blocked: 0, users: new Set(), city: e.city, country: e.country, lastSeen: e.created_at, ua: e.user_agent };
      map[e.ip_address].count++;
      if (e.allowed) map[e.ip_address].allowed++; else map[e.ip_address].blocked++;
      if (e.user_email) map[e.ip_address].users.add(e.user_email);
    }
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count);
  }, [accessLog]);

  function riskLevel(blocked: number, total: number): "low" | "medium" | "high" | "critical" {
    if (total === 0) return "low";
    const r = blocked / total;
    if (r > 0.7) return "critical";
    if (r > 0.4) return "high";
    if (r > 0.15) return "medium";
    return "low";
  }

  const riskColors: Record<string, { bg: string; color: string }> = {
    low:      { bg: D.successLt, color: D.success },
    medium:   { bg: D.warnLt,    color: D.warn    },
    high:     { bg: "#fde8d8",   color: "#ca5010"  },
    critical: { bg: D.dangerLt,  color: D.danger   },
  };

  function exportCSV() {
    const rows = ["IP,Users,Total,Allowed,Blocked,City,Country,Last Seen",
      ...ipStats.map(([ip, d]) => `"${ip}","${[...d.users].join(";")}",${d.count},${d.allowed},${d.blocked},"${d.city || ""}","${d.country || ""}","${d.lastSeen || ""}"`)
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "ip_audit.csv";
    a.click(); URL.revokeObjectURL(url);
    toast({ title: "Exported IP audit CSV" });
  }

  const filteredUsers = useMemo(() => {
    if (!search) return users;
    const q = search.toLowerCase();
    return users.filter(u => (u.full_name?.toLowerCase() || "").includes(q) || (u.email?.toLowerCase() || "").includes(q) || (u.department?.toLowerCase() || "").includes(q) || (u.last_ip || "").includes(q));
  }, [users, search]);

  const filteredIPs = useMemo(() => {
    if (!search) return ipStats;
    const q = search.toLowerCase();
    return ipStats.filter(([ip, d]) => ip.includes(q) || (d.city?.toLowerCase() || "").includes(q) || (d.country?.toLowerCase() || "").includes(q) || [...d.users].some(u => u.toLowerCase().includes(q)));
  }, [ipStats, search]);

  const filteredAudit = useMemo(() => {
    if (!search) return auditLogs;
    const q = search.toLowerCase();
    return auditLogs.filter(l => l.action.toLowerCase().includes(q) || (l.user_name?.toLowerCase() || "").includes(q) || (l.ip_address || "").includes(q) || l.module.toLowerCase().includes(q));
  }, [auditLogs, search]);

  return (
    <div style={{ background: D.bg, minHeight: "100vh", fontFamily: D.font, color: D.text }}>
      <div style={{ background: D.blue, height: 4 }} />

      {/* Breadcrumb */}
      <div style={{ background: D.card, borderBottom: `1px solid ${D.border}`, padding: "5px 24px", display: "flex", alignItems: "center", gap: 6 }}>
        <Home size={11} color={D.textMt} />
        <span style={{ fontSize: 11, color: D.textMt }}>Admin</span>
        <ChevronRight size={9} color={D.textMt} />
        <span style={{ fontSize: 11, color: D.blue, fontWeight: 600 }}>Users & IP Audit</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 10, color: D.success, display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: D.success, display: "inline-block", animation: "pulse 2s infinite" }} />
            Real-time active
          </span>
          <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: D.textSub, cursor: "pointer" }}>
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} style={{ margin: 0 }} />
            Auto-refresh
          </label>
        </div>
      </div>

      {/* Header */}
      <div style={{ background: D.card, borderBottom: `1px solid ${D.border}`, padding: "7px 20px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: D.radius, background: D.teal, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Globe size={15} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: D.text }}>Users & IP Audit</div>
            <div style={{ fontSize: 10, color: D.textMt }}>Live IP tracking · User activity · Geo intelligence</div>
          </div>
        </div>
        <div style={{ width: 1, height: 26, background: D.border }} />
        <button onClick={exportCSV}
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", background: "transparent", border: `1px solid ${D.borderMd}`, borderRadius: D.radius, fontSize: 12, cursor: "pointer", color: D.text }}>
          <Download size={11} /> Export
        </button>
        <button onClick={loadAll} disabled={loading}
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", background: "transparent", border: `1px solid ${D.borderMd}`, borderRadius: D.radius, fontSize: 12, cursor: "pointer", color: D.text }}>
          <RefreshCw size={11} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} /> Refresh
        </button>
        <div style={{ flex: 1 }} />
        <div style={{ position: "relative" }}>
          <Search size={11} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: D.textMt, pointerEvents: "none" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users, IPs, locations…"
            style={{ padding: "5px 8px 5px 24px", border: `1px solid ${D.borderMd}`, borderRadius: D.radius, fontSize: 12, outline: "none", width: 210, fontFamily: D.font }} />
          {search && <button onClick={() => setSearch("")} style={{ position: "absolute", right: 5, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: D.textMt, lineHeight: 1 }}>×</button>}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: D.card, borderBottom: `1px solid ${D.border}`, padding: "0 20px", display: "flex", gap: 0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", background: "transparent", border: "none", borderBottom: tab === t.id ? `2px solid ${D.blue}` : "2px solid transparent", color: tab === t.id ? D.blue : D.textSub, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all .1s" }}>
            <t.I size={12} />{t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: "14px 20px 24px" }}>

        {/* OVERVIEW */}
        {tab === "overview" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 8, marginBottom: 14 }}>
              {[
                { label: "Total Users",   val: stats.totalUsers,   color: D.purple, bg: D.purpleLt, I: Users      },
                { label: "Active Users",  val: stats.activeUsers,  color: D.success,bg: D.successLt,I: UserCheck   },
                { label: "Locked",        val: stats.lockedUsers,  color: D.danger, bg: D.dangerLt, I: Lock        },
                { label: "Access Events", val: stats.totalAccess,  color: D.blue,   bg: D.blueLt,   I: Clock       },
                { label: "Allowed",       val: stats.allowedAccess,color: D.success,bg: D.successLt,I: CheckCircle },
                { label: "Blocked",       val: stats.blockedAccess,color: D.danger, bg: D.dangerLt, I: XCircle     },
                { label: "Unique IPs",    val: stats.uniqueIPs,    color: D.teal,   bg: D.tealLt,   I: Network     },
                { label: "Countries",     val: stats.countries,    color: D.warn,   bg: D.warnLt,   I: Globe       },
                { label: "Audit Events",  val: stats.auditEvents,  color: D.textSub,bg: D.bg,        I: Activity   },
                { label: "Today Access",  val: stats.todayAccess,  color: D.blue,   bg: D.blueLt,   I: Signal      },
              ].map(k => (
                <div key={k.label} style={{ ...cs(), padding: "12px 14px", borderTop: `3px solid ${k.color}` }}>
                  <div style={{ width: 22, height: 22, borderRadius: D.radius, background: k.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                    <k.I size={11} color={k.color} />
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: k.color, lineHeight: 1, marginBottom: 4 }}>{loading ? "—" : k.val}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: D.text, textTransform: "uppercase", letterSpacing: ".04em" }}>{k.label}</div>
                </div>
              ))}
            </div>

            {/* Live activity stream */}
            <div style={cs()}>
              <div style={{ padding: "11px 16px", borderBottom: `1px solid ${D.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: D.text, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: D.success, display: "inline-block", animation: "pulse 2s infinite" }} />
                  Live Activity Stream
                </span>
                <button onClick={() => setLiveActivity([])} style={{ fontSize: 11, color: D.textMt, background: "none", border: "none", cursor: "pointer" }}>Clear</button>
              </div>
              <div style={{ background: "#0d1117", minHeight: 120, padding: "12px 16px", fontFamily: "monospace", fontSize: 11 }}>
                {liveActivity.length === 0 ? (
                  <div style={{ color: "#58a6ff" }}>$ Monitoring audit_log · ip_access_log · profiles — waiting for events…</div>
                ) : liveActivity.map((line, i) => (
                  <div key={i} style={{ color: line.includes("BLOCKED") ? "#f85149" : line.includes("ALLOWED") ? "#3fb950" : line.includes("AUDIT") ? "#e3b341" : "#58a6ff", marginBottom: 4 }}>
                    {line}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {tab === "users" && (
          <div style={cs()}>
            <div style={{ padding: "11px 16px", borderBottom: `1px solid ${D.border}`, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: D.text }}>All Users</span>
              <span style={{ fontSize: 11, color: D.textMt }}>{filteredUsers.length} users</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: D.bg }}>
                    {["Status", "Name", "Email", "Role", "Department", "Last IP", "Last Seen", "IPs Used", "Access Events"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: D.textSub, fontSize: 11, whiteSpace: "nowrap", borderBottom: `1px solid ${D.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => {
                    const uip = userIPMap[u.email || ""];
                    return (
                      <tr key={u.id} style={{ borderBottom: `1px solid ${D.border}` }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = D.bg; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ""; }}>
                        <td style={{ padding: "8px 12px" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 7px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: u.is_locked ? D.dangerLt : u.is_active !== false ? D.successLt : "#f0f0f0", color: u.is_locked ? D.danger : u.is_active !== false ? D.success : D.textMt }}>
                            {u.is_locked ? <Lock size={8} /> : <CheckCircle size={8} />}
                            {u.is_locked ? "LOCKED" : u.is_active !== false ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </td>
                        <td style={{ padding: "8px 12px", fontWeight: 600, color: D.text, whiteSpace: "nowrap" }}>{u.full_name}</td>
                        <td style={{ padding: "8px 12px", color: D.textSub, fontSize: 11 }}>{u.email || "—"}</td>
                        <td style={{ padding: "8px 12px" }}>
                          {u.role && <span style={{ padding: "1px 6px", borderRadius: 3, background: D.purpleLt, color: D.purple, fontSize: 10, fontWeight: 700 }}>{u.role.replace(/_/g, " ")}</span>}
                        </td>
                        <td style={{ padding: "8px 12px", color: D.textSub }}>{u.department || "—"}</td>
                        <td style={{ padding: "8px 12px", fontFamily: "monospace", color: D.blue, fontSize: 11 }}>{u.last_ip || "—"}</td>
                        <td style={{ padding: "8px 12px", color: D.textMt, whiteSpace: "nowrap", fontSize: 11 }}>{ago(u.last_seen)}</td>
                        <td style={{ padding: "8px 12px", color: D.text, fontWeight: uip ? 700 : 400 }}>{uip ? uip.ips.size : 0}</td>
                        <td style={{ padding: "8px 12px" }}>
                          {uip ? (
                            <span style={{ fontSize: 11 }}>
                              <span style={{ color: D.success }}>{uip.allowed}</span>
                              {uip.blocked > 0 && <span style={{ color: D.danger, marginLeft: 6 }}>/{uip.blocked} blocked</span>}
                            </span>
                          ) : <span style={{ color: D.textMt }}>—</span>}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <tr><td colSpan={9} style={{ padding: "32px", textAlign: "center", color: D.textMt }}>No users found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* IP AUDIT TAB */}
        {tab === "ip_audit" && (
          <div style={cs()}>
            <div style={{ padding: "11px 16px", borderBottom: `1px solid ${D.border}`, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: D.text }}>IP Audit Report</span>
              <span style={{ fontSize: 11, color: D.textMt }}>{filteredIPs.length} unique IPs</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: D.bg }}>
                    {["Risk", "IP Address", "Total", "Allowed", "Blocked", "Users", "City", "Country", "Browser", "Last Seen"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: D.textSub, fontSize: 11, whiteSpace: "nowrap", borderBottom: `1px solid ${D.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredIPs.slice(0, 150).map(([ip, d]) => {
                    const rl = riskLevel(d.blocked, d.count);
                    const rc = riskColors[rl];
                    return (
                      <tr key={ip} style={{ borderBottom: `1px solid ${D.border}` }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = D.bg; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ""; }}>
                        <td style={{ padding: "8px 12px" }}>
                          <span style={{ padding: "2px 7px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: rc.bg, color: rc.color, textTransform: "uppercase" }}>{rl}</span>
                        </td>
                        <td style={{ padding: "8px 12px", fontFamily: "monospace", fontWeight: 700, color: D.blue }}>{ip}</td>
                        <td style={{ padding: "8px 12px", fontWeight: 700 }}>{d.count}</td>
                        <td style={{ padding: "8px 12px", color: D.success, fontWeight: 600 }}>{d.allowed}</td>
                        <td style={{ padding: "8px 12px", color: d.blocked > 0 ? D.danger : D.textMt, fontWeight: d.blocked > 0 ? 700 : 400 }}>{d.blocked}</td>
                        <td style={{ padding: "8px 12px", color: D.text }}>{d.users.size}</td>
                        <td style={{ padding: "8px 12px", color: D.textSub }}>{d.city || "—"}</td>
                        <td style={{ padding: "8px 12px", color: D.textSub }}>{d.country || "—"}</td>
                        <td style={{ padding: "8px 12px", color: D.textMt }}><div style={{ display: "flex", alignItems: "center", gap: 4 }}><DeviceIcon ua={d.ua} /> {parseBrowser(d.ua)}</div></td>
                        <td style={{ padding: "8px 12px", color: D.textMt, whiteSpace: "nowrap", fontSize: 11 }}>{ago(d.lastSeen)}</td>
                      </tr>
                    );
                  })}
                  {filteredIPs.length === 0 && (
                    <tr><td colSpan={10} style={{ padding: "32px", textAlign: "center", color: D.textMt }}>No IP data yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ACCESS LOG TAB */}
        {tab === "access_log" && (
          <div style={cs()}>
            <div style={{ padding: "11px 16px", borderBottom: `1px solid ${D.border}`, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: D.text }}>System Audit Log</span>
              <span style={{ fontSize: 11, color: D.textMt }}>{filteredAudit.length} events</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: D.bg }}>
                    {["Action", "User", "Module", "IP Address", "Time"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: D.textSub, fontSize: 11, whiteSpace: "nowrap", borderBottom: `1px solid ${D.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredAudit.slice(0, 200).map(e => (
                    <tr key={e.id} style={{ borderBottom: `1px solid ${D.border}` }}
                      onMouseEnter={ev => { (ev.currentTarget as HTMLElement).style.background = D.bg; }}
                      onMouseLeave={ev => { (ev.currentTarget as HTMLElement).style.background = ""; }}>
                      <td style={{ padding: "7px 12px", fontWeight: 500, color: D.text }}>{e.action}</td>
                      <td style={{ padding: "7px 12px", color: D.textSub }}>{e.user_name || <span style={{ color: D.textMt }}>system</span>}</td>
                      <td style={{ padding: "7px 12px" }}>
                        <span style={{ padding: "1px 6px", borderRadius: 3, background: D.blueLt, color: D.blue, fontSize: 10, fontWeight: 600 }}>{e.module}</span>
                      </td>
                      <td style={{ padding: "7px 12px", fontFamily: "monospace", color: D.blue, fontSize: 11 }}>{e.ip_address || "—"}</td>
                      <td style={{ padding: "7px 12px", color: D.textMt, whiteSpace: "nowrap", fontSize: 11 }}>{ago(e.created_at)}</td>
                    </tr>
                  ))}
                  {filteredAudit.length === 0 && (
                    <tr><td colSpan={5} style={{ padding: "32px", textAlign: "center", color: D.textMt }}>No audit events found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* GEO & DEVICE TAB */}
        {tab === "geo" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={cs()}>
              <div style={{ padding: "11px 16px", borderBottom: `1px solid ${D.border}` }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: D.text }}>Traffic by Country</span>
              </div>
              <div style={{ padding: "14px 16px" }}>
                {(() => {
                  const map: Record<string, { total: number; allowed: number; blocked: number }> = {};
                  for (const e of accessLog) {
                    const k = e.country || "Unknown";
                    if (!map[k]) map[k] = { total: 0, allowed: 0, blocked: 0 };
                    map[k].total++;
                    if (e.allowed) map[k].allowed++; else map[k].blocked++;
                  }
                  const sorted = Object.entries(map).sort((a, b) => b[1].total - a[1].total);
                  const total = accessLog.length || 1;
                  return sorted.slice(0, 12).map(([country, d]) => (
                    <div key={country} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
                        <span style={{ color: D.text, fontWeight: 500 }}>{country}</span>
                        <span style={{ fontSize: 11, color: D.textMt }}>{d.total} ({Math.round(d.total / total * 100)}%)</span>
                      </div>
                      <div style={{ display: "flex", height: 5, borderRadius: 99, overflow: "hidden", background: D.border }}>
                        <div style={{ height: 5, background: D.success, width: `${(d.allowed / d.total) * 100}%` }} />
                        <div style={{ height: 5, background: D.danger, width: `${(d.blocked / d.total) * 100}%` }} />
                      </div>
                    </div>
                  ));
                })()}
                {accessLog.length === 0 && <div style={{ color: D.textMt, fontSize: 12, textAlign: "center", padding: "20px 0" }}>No geo data yet</div>}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={cs()}>
                <div style={{ padding: "11px 16px", borderBottom: `1px solid ${D.border}` }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: D.text }}>Device & Browser</span>
                </div>
                <div style={{ padding: "14px 16px" }}>
                  {(() => {
                    const browserMap: Record<string, number> = {};
                    const osMap: Record<string, number> = {};
                    for (const e of accessLog) {
                      const b = parseBrowser(e.user_agent);
                      const o = parseOS(e.user_agent);
                      browserMap[b] = (browserMap[b] || 0) + 1;
                      osMap[o] = (osMap[o] || 0) + 1;
                    }
                    const total = accessLog.length || 1;
                    return (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: D.textSub, textTransform: "uppercase", marginBottom: 8 }}>Browsers</div>
                        {Object.entries(browserMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([b, n]) => (
                          <div key={b} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5, alignItems: "center" }}>
                            <span style={{ color: D.text }}>{b}</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{ width: 80, height: 4, background: D.border, borderRadius: 99 }}>
                                <div style={{ height: 4, background: D.blue, borderRadius: 99, width: `${(n / total) * 100}%` }} />
                              </div>
                              <span style={{ color: D.textMt, fontSize: 11, minWidth: 24, textAlign: "right" }}>{n}</span>
                            </div>
                          </div>
                        ))}
                        <div style={{ fontSize: 11, fontWeight: 700, color: D.textSub, textTransform: "uppercase", marginTop: 14, marginBottom: 8 }}>Operating Systems</div>
                        {Object.entries(osMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([o, n]) => (
                          <div key={o} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5, alignItems: "center" }}>
                            <span style={{ color: D.text }}>{o}</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{ width: 80, height: 4, background: D.border, borderRadius: 99 }}>
                                <div style={{ height: 4, background: D.teal, borderRadius: 99, width: `${(n / total) * 100}%` }} />
                              </div>
                              <span style={{ color: D.textMt, fontSize: 11, minWidth: 24, textAlign: "right" }}>{n}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                  {accessLog.length === 0 && <div style={{ color: D.textMt, fontSize: 12, textAlign: "center", padding: "20px 0" }}>No device data yet</div>}
                </div>
              </div>

              <div style={cs({ padding: "14px 16px" })}>
                <div style={{ fontSize: 11, fontWeight: 700, color: D.textSub, textTransform: "uppercase", marginBottom: 10 }}>Top Cities</div>
                {(() => {
                  const cityMap: Record<string, number> = {};
                  for (const e of accessLog) { const k = e.city || "Unknown"; cityMap[k] = (cityMap[k] || 0) + 1; }
                  return Object.entries(cityMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([city, n]) => (
                    <div key={city} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5, padding: "4px 0", borderBottom: `1px solid ${D.border}` }}>
                      <span style={{ color: D.text, display: "flex", alignItems: "center", gap: 5 }}><MapPin size={10} color={D.teal} />{city}</span>
                      <span style={{ fontWeight: 700, color: D.teal }}>{n}</span>
                    </div>
                  ));
                })()}
                {accessLog.length === 0 && <div style={{ color: D.textMt, fontSize: 12, textAlign: "center" }}>No city data yet</div>}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.4 } }
      `}</style>
    </div>
  );
}
