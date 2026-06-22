/**
 * EL5 MediProcure — Users & IP Audit v11
 * Enhanced: mobile responsive, risk scoring, real-time, bulk actions, data manipulation
 */
import type React from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ERP, erpStyles } from "@/lib/erpTheme";
import { MobileTable } from "@/components/MobileTable";
import { useIsMobile } from "@/hooks/useIsMobile";
import AdminBreadcrumb from "@/components/AdminBreadcrumb";

const db = supabase as any;

interface AuditLog {
  id: string; user_id?: string; user_email?: string; action: string;
  ip_address?: string; user_agent?: string; details?: any;
  created_at: string; resource_type?: string; resource_id?: string;
}
interface UserProfile {
  id: string; email?: string; full_name?: string; department?: string;
  is_active?: boolean; last_sign_in_at?: string; created_at?: string; roles?: string[];
}
interface IPStat {
  ip: string; count: number; lastSeen: string;
  users: string[]; risk: "low" | "medium" | "high" | "critical";
  actions: Record<string, number>; isBlocked: boolean; todayCount: number;
}

function fmtDate(s: string) { if (!s) return "—"; return new Date(s).toLocaleDateString("en-KE", { day: "2-digit", month: "2-digit", year: "numeric" }); }
function fmtDT(s: string) { if (!s) return "—"; return new Date(s).toLocaleString("en-KE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); }
function ago(s: string) {
  const d = Date.now() - new Date(s).getTime();
  if (d < 60000) return `${Math.floor(d / 1000)}s ago`;
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
}
function calcRisk(count: number, todayCount: number, failedActions: number): "low" | "medium" | "high" | "critical" {
  if (todayCount > 200 || failedActions > 20) return "critical";
  if (todayCount > 100 || failedActions > 10) return "high";
  if (todayCount > 50 || count > 500) return "medium";
  return "low";
}
const RISK_COLORS = { low: "#22c55e", medium: "#f59e0b", high: "#f97316", critical: "#ef4444" };
const RISK_BG    = { low: "#f0fdf4", medium: "#fffbeb", high: "#fff7ed", critical: "#fef2f2" };

function StatusChip({ status }: { status: string }) {
  return <span style={erpStyles.statusChip(status)}>{status}</span>;
}
function RiskBadge({ level }: { level: "low" | "medium" | "high" | "critical" }) {
  const c = RISK_COLORS[level];
  return (
    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700,
      background: `${c}18`, color: c, border: `1px solid ${c}44`, textTransform: "uppercase", fontFamily: ERP.fontFamily }}>
      {level}
    </span>
  );
}

type AuditTab = "activity" | "users" | "ip_audit" | "timeline" | "data_control";

export default function UsersIpAuditPage() {
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<AuditTab>("activity");
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState(new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0]);
  const [selectedLogs, setSelectedLogs] = useState<Set<string>>(new Set());
  const [selectedIP, setSelectedIP] = useState<IPStat | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [userSearch, setUserSearch] = useState("");
  const [blockingIP, setBlockingIP] = useState<string | null>(null);
  const [dcAction, setDcAction] = useState("purge_old");
  const [dcDays, setDcDays] = useState("90");
  const [dcRunning, setDcRunning] = useState(false);
  const [dcResult, setDcResult] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [logsRes, usersRes] = await Promise.allSettled([
        db.from("audit_logs").select("*")
          .gte("created_at", dateFrom + "T00:00:00")
          .lte("created_at", dateTo + "T23:59:59")
          .order("created_at", { ascending: false }).limit(500),
        db.from("profiles").select("*").order("created_at", { ascending: false }).limit(200),
      ]);
      setAuditLogs(logsRes.status === "fulfilled" ? (logsRes.value.data || []) : []);
      setUsers(usersRes.status === "fulfilled" ? (usersRes.value.data || []) : []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [dateFrom, dateTo]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => fetchAll(), 30000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchAll]);

  // Real-time subscription
  useEffect(() => {
    const ch = db.channel("audit_realtime_v11")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_logs" }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchAll]);

  // Computed
  const filteredLogs = useMemo(() => auditLogs.filter(l => {
    const q = search.toLowerCase();
    const matchS = !search || [l.user_email, l.action, l.ip_address, l.resource_type].some(f => f?.toLowerCase().includes(q));
    const matchA = actionFilter === "ALL" || l.action?.toLowerCase().includes(actionFilter.toLowerCase());
    return matchS && matchA;
  }), [auditLogs, search, actionFilter]);

  const filteredUsers = useMemo(() => users.filter(u => {
    if (!userSearch) return true;
    const q = userSearch.toLowerCase();
    return [u.full_name, u.email, u.department].some(f => f?.toLowerCase().includes(q));
  }), [users, userSearch]);

  const today = new Date().toDateString();
  const uniqueIPs = useMemo(() => [...new Set(auditLogs.map(l => l.ip_address).filter(Boolean))], [auditLogs]);

  const ipStats: IPStat[] = useMemo(() => uniqueIPs.map(ip => {
    const ipLogs = auditLogs.filter(l => l.ip_address === ip);
    const todayLogs = ipLogs.filter(l => new Date(l.created_at).toDateString() === today);
    const failedActions = ipLogs.filter(l => l.action?.includes("fail") || l.action?.includes("error") || l.action?.includes("reject")).length;
    const actionMap: Record<string, number> = {};
    ipLogs.forEach(l => { if (l.action) actionMap[l.action] = (actionMap[l.action] || 0) + 1; });
    return {
      ip: ip!,
      count: ipLogs.length,
      todayCount: todayLogs.length,
      lastSeen: ipLogs[0]?.created_at || "",
      users: [...new Set(ipLogs.map(l => l.user_email || l.user_id).filter(Boolean))] as string[],
      risk: calcRisk(ipLogs.length, todayLogs.length, failedActions),
      actions: actionMap,
      isBlocked: false, // would check ip_access_rules
    };
  }).sort((a, b) => b.count - a.count), [uniqueIPs, auditLogs, today]);

  const filteredIpStats = useMemo(() => riskFilter === "ALL" ? ipStats : ipStats.filter(s => s.risk === riskFilter.toLowerCase()), [ipStats, riskFilter]);

  const kpiData = [
    { label: "AUDIT RECORDS", val: auditLogs.length, color: "#1a3580", icon: "📋" },
    { label: "UNIQUE IPs", val: uniqueIPs.length, color: "#2255cc", icon: "🌐" },
    { label: "ACTIVE USERS", val: users.filter(u => u.is_active !== false).length, color: "#007700", icon: "👥" },
    { label: "HIGH RISK IPs", val: ipStats.filter(s => s.risk === "high" || s.risk === "critical").length, color: "#cc0000", icon: "⚠️" },
    { label: "TODAY'S EVENTS", val: auditLogs.filter(l => new Date(l.created_at).toDateString() === today).length, color: "#cc6600", icon: "📅" },
    { label: "FAILED ACTIONS", val: auditLogs.filter(l => l.action?.includes("fail") || l.action?.includes("error")).length, color: "#cc0000", icon: "✗" },
  ];

  function exportCSV() {
    const src = filteredLogs;
    const rows = ["User,Action,IP Address,Resource,Date",
      ...src.map(l => `"${l.user_email || l.user_id || ""}","${l.action || ""}","${l.ip_address || ""}","${l.resource_type || ""}","${fmtDT(l.created_at)}"`)
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `audit_log_${new Date().toISOString().split("T")[0]}.csv`; a.click();
    URL.revokeObjectURL(url); toast({ title: `✓ Exported ${src.length} records` });
  }

  function exportIPReport() {
    const rows = ["IP Address,Risk,Requests,Today,Unique Users,Last Seen",
      ...filteredIpStats.map(s => `"${s.ip}","${s.risk}",${s.count},${s.todayCount},${s.users.length},"${fmtDT(s.lastSeen)}"`)
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `ip_audit_${new Date().toISOString().split("T")[0]}.csv`; a.click();
    URL.revokeObjectURL(url); toast({ title: `✓ Exported ${filteredIpStats.length} IPs` });
  }

  async function blockIP(ip: string) {
    if (!window.confirm(`Block IP ${ip}? This will add it to access rules.`)) return;
    setBlockingIP(ip);
    const { error } = await db.from("ip_access_rules").upsert({
      ip_address: ip, rule_type: "block", description: `Blocked via IP Audit — ${new Date().toLocaleDateString("en-KE")}`,
      is_active: true, hit_count: 0,
    }, { onConflict: "ip_address" });
    setBlockingIP(null);
    if (error) toast({ title: "Error: " + error.message, variant: "destructive" });
    else toast({ title: `✓ IP ${ip} blocked` });
  }

  async function runDataControl() {
    setDcRunning(true); setDcResult(null);
    try {
      if (dcAction === "purge_old") {
        const cutoff = new Date(Date.now() - Number(dcDays) * 86400000).toISOString();
        const { count, error } = await db.from("audit_logs").delete().lt("created_at", cutoff).select("id", { count: "exact", head: true });
        if (error) throw error;
        await fetchAll();
        setDcResult(`✓ Purged ${count ?? "some"} records older than ${dcDays} days`);
      } else if (dcAction === "purge_user") {
        const email = window.prompt("Enter user email to clear their audit logs:");
        if (!email) { setDcRunning(false); return; }
        const { count, error } = await db.from("audit_logs").delete().eq("user_email", email).select("id", { count: "exact", head: true });
        if (error) throw error;
        await fetchAll();
        setDcResult(`✓ Purged ${count ?? "some"} records for ${email}`);
      } else if (dcAction === "purge_failed") {
        const { count, error } = await db.from("audit_logs").delete()
          .or("action.ilike.%fail%,action.ilike.%error%").select("id", { count: "exact", head: true });
        if (error) throw error;
        await fetchAll();
        setDcResult(`✓ Purged ${count ?? "some"} failed action records`);
      } else if (dcAction === "recount") {
        const stats = {
          total: auditLogs.length,
          unique_ips: uniqueIPs.length,
          unique_users: new Set(auditLogs.map(l => l.user_email).filter(Boolean)).size,
          actions: Object.entries(auditLogs.reduce((acc: any, l) => { acc[l.action] = (acc[l.action] || 0) + 1; return acc; }, {}))
            .sort(([, a], [, b]) => (b as number) - (a as number)).slice(0, 5).map(([k, v]) => `${k}:${v}`).join(", "),
        };
        setDcResult(`✓ Stats — Total: ${stats.total} | IPs: ${stats.unique_ips} | Users: ${stats.unique_users} | Top: ${stats.actions}`);
      }
    } catch (e: any) {
      setDcResult("✗ Error: " + e.message);
    }
    setDcRunning(false);
  }

  // Timeline data — actions by hour for today
  const timelineData = useMemo(() => {
    const hours: { hour: number; count: number }[] = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));
    auditLogs.filter(l => new Date(l.created_at).toDateString() === today)
      .forEach(l => { const h = new Date(l.created_at).getHours(); hours[h].count++; });
    return hours;
  }, [auditLogs, today]);
  const maxTL = Math.max(1, ...timelineData.map(h => h.count));

  const TABS: { id: AuditTab; label: string; icon: string }[] = [
    { id: "activity",     label: "Activity",      icon: "📋" },
    { id: "users",        label: "Users",          icon: "👥" },
    { id: "ip_audit",     label: "IP Audit",       icon: "🌐" },
    { id: "timeline",     label: "Timeline",       icon: "⏱" },
    { id: "data_control", label: "Data Control",   icon: "🗄" },
  ];

  const inp: React.CSSProperties = { ...erpStyles.inp, fontSize: 11 };

  return (
    <div style={{ background: "#f0f0f0", minHeight: "100vh", fontFamily: ERP.fontFamily, fontSize: 12 }}>
      <AdminBreadcrumb />
      {/* Title Bar */}
      <div style={{ background: ERP.titleBar, color: "#fff", padding: isMobile ? "6px 10px" : "5px 10px", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${ERP.titleBarBorder}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>🔐</span>
          <div>
            <div>EL5 MediProcure — Users &amp; IP Audit</div>
            <div style={{ fontSize: 10, fontWeight: 400, opacity: .85 }}>Embu Level 5 Hospital · Security &amp; Access Control v11</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button onClick={() => setAutoRefresh(v => !v)} style={{ ...erpStyles.btn(autoRefresh), fontSize: 10, padding: "2px 8px", color: autoRefresh ? "#fff" : "#333" }}>
            {autoRefresh ? "🔴 Live" : "▶ Live"}
          </button>
          {!isMobile && ["0", "1", "r"].map(c => (
            <div key={c} style={{ width: 16, height: 14, background: "linear-gradient(180deg,#f0f0f0,#dcdcdc)", border: "1px solid #888", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 10, color: "#333", fontWeight: 700 }}>{c}</div>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ ...erpStyles.toolbar, padding: "5px 10px", gap: 6, flexWrap: "wrap" }}>
        <button onClick={fetchAll} style={erpStyles.btn(false)}>↻ Refresh</button>
        {/* Date range */}
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <span style={{ fontSize: 10 }}>From:</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ ...inp, width: 110 }} />
          <span style={{ fontSize: 10 }}>To:</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ ...inp, width: 110 }} />
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 4, flexWrap: "wrap" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ ...erpStyles.btn(tab === t.id), background: tab === t.id ? ERP.tabActive : ERP.tabInactive, color: tab === t.id ? "#fff" : "#333", border: `1px solid ${tab === t.id ? ERP.tabActiveBorder : ERP.toolbarBorder}`, fontSize: isMobile ? 11 : 12 }}>
              {isMobile ? t.icon : `${t.icon} ${t.label}`}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(3, 1fr)" : "repeat(6, 1fr)", borderBottom: "1px solid #aaa" }}>
        {kpiData.map((k, i) => (
          <div key={i} style={{ padding: isMobile ? "8px 10px" : "10px 16px", borderRight: "1px solid #aaa", background: "#fff" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 14 }}>{k.icon}</span>
              <span style={{ fontWeight: 800, fontSize: isMobile ? 16 : 20, color: k.color }}>{k.val}</span>
            </div>
            <div style={{ fontSize: 9, color: "#666", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Content */}
      <div style={{ margin: isMobile ? "4px" : "6px 8px", paddingBottom: 36 }}>

        {/* ── Activity Tab ────────────────────────────────────────────── */}
        {tab === "activity" && (
          <div>
            {/* Filter bar */}
            <div style={{ background: "#f5f5f5", border: "1px solid #ccc", padding: "5px 10px", marginBottom: 4, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 700, fontSize: 11, color: "#555" }}>Filter & Search</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search user, action, IP..." style={{ ...inp, width: isMobile ? "100%" : 200 }} />
              <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} style={{ ...inp }}>
                {["ALL", "login", "logout", "create", "update", "delete", "view", "approve", "reject", "fail", "error"].map(a => <option key={a}>{a}</option>)}
              </select>
              <span style={{ marginLeft: "auto", fontSize: 11, color: "#888" }}>{filteredLogs.length} records</span>
              <button onClick={exportCSV} style={erpStyles.btn(true)}>↓ Export CSV</button>
            </div>
            {/* Bulk actions bar */}
            {selectedLogs.size > 0 && (
              <div style={{ background: "#fffbeb", border: "1px solid #f59e0b", padding: "4px 10px", marginBottom: 4, display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
                <span style={{ fontWeight: 700, color: "#92400e" }}>{selectedLogs.size} selected</span>
                <button onClick={() => setSelectedLogs(new Set())} style={{ ...erpStyles.btn(false), fontSize: 10 }}>Clear</button>
                <button onClick={() => {
                  const src = filteredLogs.filter(l => selectedLogs.has(l.id));
                  const rows = ["User,Action,IP,Date", ...src.map(l => `"${l.user_email || ""}","${l.action}","${l.ip_address || ""}","${fmtDT(l.created_at)}"`)];
                  const b = new Blob([rows.join("\n")], { type: "text/csv" });
                  const u = URL.createObjectURL(b); const a = document.createElement("a");
                  a.href = u; a.download = "selected_audit.csv"; a.click(); URL.revokeObjectURL(u);
                }} style={{ ...erpStyles.btn(false), fontSize: 10 }}>↓ Export Selected</button>
              </div>
            )}

            <div style={{ background: "#fff", border: "1px solid #ccc", maxHeight: isMobile ? "auto" : "calc(100vh - 300px)", overflow: isMobile ? "visible" : "auto" }}>
              <MobileTable<AuditLog>
                loading={loading}
                rows={filteredLogs}
                rowKey={l => l.id}
                emptyText="No audit records in date range"
                cols={[
                  {
                    key: "created_at", label: "Date/Time", primary: true,
                    render: l => <span style={{ fontFamily: "monospace", fontSize: 11, color: "#555", whiteSpace: "nowrap" }}>{fmtDT(l.created_at)}</span>,
                    tdStyle: { whiteSpace: "nowrap" },
                  },
                  {
                    key: "user_email", label: "User",
                    render: l => <span style={{ color: "#2255cc" }}>{l.user_email || l.user_id?.slice(0, 16) || "system"}</span>,
                  },
                  {
                    key: "action", label: "Action",
                    render: l => <StatusChip status={l.action} />,
                  },
                  {
                    key: "ip_address", label: "IP Address",
                    render: l => <span style={{ fontFamily: "monospace", fontSize: 11 }}>{l.ip_address || "—"}</span>,
                  },
                  {
                    key: "resource_type", label: "Resource", mobileHide: false,
                    render: l => <span style={{ fontSize: 11 }}>{l.resource_type || "—"}{l.resource_id ? " · " + l.resource_id.slice(-6) : ""}</span>,
                  },
                  {
                    key: "details", label: "Details", mobileHide: true,
                    render: l => <span style={{ fontSize: 11, color: "#666", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{l.details ? JSON.stringify(l.details).slice(0, 60) : "—"}</span>,
                    tdStyle: { maxWidth: 160 },
                  },
                ]}
              />
            </div>
          </div>
        )}

        {/* ── Users Tab ───────────────────────────────────────────────── */}
        {tab === "users" && (
          <div>
            <div style={{ background: "#f5f5f5", border: "1px solid #ccc", padding: "5px 10px", marginBottom: 4, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 700, fontSize: 11, color: "#555" }}>System Users</span>
              <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search name, email, department..." style={{ ...inp, width: isMobile ? "100%" : 220 }} />
              <span style={{ marginLeft: "auto", fontSize: 11, color: "#888" }}>{filteredUsers.length} users</span>
            </div>
            <div style={{ background: "#fff", border: "1px solid #ccc" }}>
              <MobileTable<UserProfile>
                loading={loading}
                rows={filteredUsers}
                rowKey={u => u.id}
                emptyText="No users found"
                cols={[
                  {
                    key: "full_name", label: "Full Name", primary: true,
                    render: u => <span style={{ fontWeight: 600 }}>{u.full_name || "—"}</span>,
                  },
                  {
                    key: "email", label: "Email",
                    render: u => <span style={{ color: "#2255cc" }}>{u.email || "—"}</span>,
                  },
                  { key: "department", label: "Department", render: u => u.department || "—" },
                  {
                    key: "roles", label: "Roles", mobileHide: false,
                    render: u => <span style={{ fontSize: 11 }}>{(u.roles || []).join(", ") || "—"}</span>,
                  },
                  {
                    key: "is_active", label: "Status",
                    render: u => <StatusChip status={u.is_active !== false ? "active" : "inactive"} />,
                  },
                  {
                    key: "last_sign_in_at", label: "Last Login", mobileHide: false,
                    render: u => <span style={{ fontSize: 11, color: "#555" }}>{u.last_sign_in_at ? fmtDate(u.last_sign_in_at) : "Never"}</span>,
                  },
                  {
                    key: "created_at", label: "Joined", mobileHide: true,
                    render: u => <span style={{ fontSize: 11, color: "#555" }}>{fmtDate(u.created_at || "")}</span>,
                  },
                ]}
              />
            </div>
          </div>
        )}

        {/* ── IP Audit Tab ─────────────────────────────────────────────── */}
        {tab === "ip_audit" && (
          <div>
            {/* Filter + actions */}
            <div style={{ background: "#f5f5f5", border: "1px solid #ccc", padding: "5px 10px", marginBottom: 4, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 700, fontSize: 11, color: "#555" }}>IP Address Intelligence</span>
              <select value={riskFilter} onChange={e => setRiskFilter(e.target.value)} style={inp}>
                {["ALL", "LOW", "MEDIUM", "HIGH", "CRITICAL"].map(r => <option key={r}>{r}</option>)}
              </select>
              <span style={{ marginLeft: "auto", fontSize: 11, color: "#888" }}>{filteredIpStats.length} IPs</span>
              <button onClick={exportIPReport} style={erpStyles.btn(false)}>↓ Export</button>
            </div>

            {/* Detail panel */}
            {selectedIP && (
              <div style={{ background: "#fff", border: "2px solid #2255cc", padding: 12, marginBottom: 8, borderRadius: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, fontFamily: "monospace", color: "#1a3580" }}>{selectedIP.ip}</div>
                    <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>Detailed intelligence report</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => blockIP(selectedIP.ip)} disabled={!!blockingIP} style={{ ...erpStyles.btn(false), color: "#cc0000", border: "1px solid #cc000044", fontSize: 11 }}>
                      {blockingIP === selectedIP.ip ? "Blocking..." : "🚫 Block IP"}
                    </button>
                    <button onClick={() => setSelectedIP(null)} style={{ ...erpStyles.btn(false), fontSize: 11 }}>✕ Close</button>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 10, marginTop: 10 }}>
                  {[
                    { label: "Total Requests", val: selectedIP.count, col: "#1a3580" },
                    { label: "Today's Requests", val: selectedIP.todayCount, col: "#cc6600" },
                    { label: "Unique Users", val: selectedIP.users.length, col: "#007700" },
                    { label: "Risk Level", val: <RiskBadge level={selectedIP.risk} />, col: RISK_COLORS[selectedIP.risk] },
                  ].map(item => (
                    <div key={item.label} style={{ background: "#f8f8f8", padding: "8px 12px", border: "1px solid #e5e5e5", borderRadius: 4 }}>
                      <div style={{ fontSize: 10, color: "#888", fontWeight: 700, textTransform: "uppercase" }}>{item.label}</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: item.col as string, marginTop: 2 }}>{item.val}</div>
                    </div>
                  ))}
                </div>
                {/* Users from this IP */}
                <div style={{ marginTop: 8, fontSize: 11 }}>
                  <span style={{ fontWeight: 700, color: "#555" }}>Users from this IP: </span>
                  {selectedIP.users.slice(0, 10).map(u => (
                    <span key={u} style={{ display: "inline-block", margin: "0 4px 4px 0", padding: "1px 6px", background: "#e8f0fe", border: "1px solid #c5d9f1", borderRadius: 10, color: "#2255cc", fontSize: 10 }}>{u}</span>
                  ))}
                  {selectedIP.users.length > 10 && <span style={{ color: "#888", fontSize: 10 }}>+{selectedIP.users.length - 10} more</span>}
                </div>
                {/* Top actions */}
                <div style={{ marginTop: 8, fontSize: 11 }}>
                  <span style={{ fontWeight: 700, color: "#555" }}>Top actions: </span>
                  {Object.entries(selectedIP.actions).sort(([, a], [, b]) => b - a).slice(0, 6).map(([k, v]) => (
                    <span key={k} style={{ marginRight: 6 }}><StatusChip status={k} /> <span style={{ color: "#888" }}>×{v}</span></span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ background: "#fff", border: "1px solid #ccc" }}>
              <MobileTable<IPStat>
                loading={loading}
                rows={filteredIpStats}
                rowKey={s => s.ip}
                emptyText="No IP activity recorded"
                onRowClick={s => setSelectedIP(s.ip === selectedIP?.ip ? null : s)}
                cols={[
                  {
                    key: "ip", label: "IP Address", primary: true,
                    render: s => (
                      <span style={{ fontFamily: "monospace", fontWeight: 700, color: s.isBlocked ? "#cc0000" : "#2255cc", cursor: "pointer" }}>
                        {s.ip}
                        {s.isBlocked && <span style={{ marginLeft: 4, fontSize: 9, color: "#cc0000" }}>BLOCKED</span>}
                      </span>
                    ),
                  },
                  {
                    key: "risk", label: "Risk",
                    render: s => <RiskBadge level={s.risk} />,
                  },
                  {
                    key: "count", label: "Total Req.",
                    render: s => <span style={{ fontWeight: 700 }}>{s.count.toLocaleString()}</span>,
                    tdStyle: { textAlign: "center" },
                  },
                  {
                    key: "todayCount", label: "Today",
                    render: s => <span style={{ color: s.todayCount > 50 ? "#cc0000" : "#333" }}>{s.todayCount}</span>,
                    tdStyle: { textAlign: "center" },
                  },
                  {
                    key: "users", label: "Users",
                    render: s => <span>{s.users.length}</span>,
                    tdStyle: { textAlign: "center" },
                  },
                  {
                    key: "lastSeen", label: "Last Seen", mobileHide: false,
                    render: s => <span style={{ fontSize: 11, color: "#555" }}>{ago(s.lastSeen)}</span>,
                  },
                  {
                    key: "id" as any, label: "Actions", mobileHide: true,
                    render: s => (
                      <button onClick={ev => { ev.stopPropagation(); blockIP(s.ip); }} disabled={!!blockingIP}
                        style={{ ...erpStyles.btn(false), fontSize: 10, padding: "2px 6px", color: "#cc0000" }}>
                        🚫 Block
                      </button>
                    ),
                  },
                ]}
              />
            </div>
          </div>
        )}

        {/* ── Timeline Tab ──────────────────────────────────────────────── */}
        {tab === "timeline" && (
          <div>
            <div style={{ background: "#fff", border: "1px solid #ccc", padding: 12, marginBottom: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#1a3580", marginBottom: 12 }}>⏱ Today's Activity Timeline — Requests by Hour</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 120, padding: "0 4px" }}>
                {timelineData.map(h => (
                  <div key={h.hour} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ fontSize: 9, color: "#888", marginBottom: 2 }}>{h.count > 0 ? h.count : ""}</div>
                    <div style={{
                      width: "100%", background: h.count > 0
                        ? `linear-gradient(0deg, #2a5fc3, #4a7fe3)`
                        : "#e5e7eb",
                      height: `${Math.max(2, (h.count / maxTL) * 90)}px`,
                      borderRadius: "2px 2px 0 0",
                      minHeight: 2,
                      title: `${h.hour}:00 — ${h.count} events`,
                    }} title={`${h.hour}:00 — ${h.count} events`} />
                    <div style={{ fontSize: 8, color: "#aaa", marginTop: 2 }}>{h.hour}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 10, color: "#888", textAlign: "center", marginTop: 4 }}>Hour of day (0–23)</div>
            </div>

            {/* Recent activity feed */}
            <div style={{ background: "#fff", border: "1px solid #ccc", padding: 0, maxHeight: isMobile ? "auto" : "calc(100vh - 420px)", overflow: "auto" }}>
              <div style={{ background: ERP.sidebarHeader, color: "#fff", padding: "5px 10px", fontSize: 11, fontWeight: 700 }}>📡 Live Activity Feed (last {Math.min(50, filteredLogs.length)} events)</div>
              {filteredLogs.slice(0, 50).map((l, i) => (
                <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 10px", borderBottom: "1px solid #f0f0f0", background: i % 2 === 0 ? "#fff" : "#f9f9f9" }}>
                  <div style={{ width: 60, fontSize: 10, color: "#888", flexShrink: 0, fontFamily: "monospace" }}>
                    {ago(l.created_at)}
                  </div>
                  <StatusChip status={l.action} />
                  <div style={{ flex: 1, fontSize: 11, color: "#2255cc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {l.user_email || l.user_id?.slice(0, 16) || "system"}
                  </div>
                  {!isMobile && <div style={{ fontSize: 10, color: "#888", fontFamily: "monospace", flexShrink: 0 }}>{l.ip_address || "—"}</div>}
                  {!isMobile && <div style={{ fontSize: 10, color: "#aaa", flexShrink: 0 }}>{l.resource_type || "—"}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Data Control Tab ──────────────────────────────────────────── */}
        {tab === "data_control" && (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8 }}>
            {/* Operations */}
            <div style={{ background: "#fff", border: "1px solid #ccc", padding: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#1a3580", marginBottom: 12, borderBottom: "1px solid #eee", paddingBottom: 8 }}>
                🗄 Audit Log Data Control
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: "#555", display: "block", marginBottom: 4 }}>Operation</label>
                <select value={dcAction} onChange={e => setDcAction(e.target.value)} style={{ ...inp, width: "100%", marginBottom: 8 }}>
                  <option value="purge_old">Purge Old Records (by age)</option>
                  <option value="purge_user">Purge Records by User Email</option>
                  <option value="purge_failed">Purge Failed Action Records</option>
                  <option value="recount">Recount & Statistics</option>
                </select>

                {dcAction === "purge_old" && (
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "#555", display: "block", marginBottom: 4 }}>Records older than (days)</label>
                    <input type="number" value={dcDays} onChange={e => setDcDays(e.target.value)} min={7} max={3650} style={{ ...inp, width: "100%" }} />
                    <div style={{ fontSize: 10, color: "#888", marginTop: 4 }}>
                      Will remove records before {new Date(Date.now() - Number(dcDays) * 86400000).toLocaleDateString("en-KE")}
                    </div>
                  </div>
                )}

                <button onClick={runDataControl} disabled={dcRunning} style={{ ...erpStyles.btn(true), marginTop: 12, width: "100%", justifyContent: "center" }}>
                  {dcRunning ? "⏳ Running..." : "▶ Execute Operation"}
                </button>

                {dcResult && (
                  <div style={{ marginTop: 10, padding: "8px 12px", background: dcResult.startsWith("✗") ? "#fef2f2" : "#f0fdf4", border: `1px solid ${dcResult.startsWith("✗") ? "#fca5a5" : "#86efac"}`, borderRadius: 4, fontSize: 11, color: dcResult.startsWith("✗") ? "#cc0000" : "#007700", fontWeight: 600 }}>
                    {dcResult}
                  </div>
                )}
              </div>

              <div style={{ borderTop: "1px solid #eee", paddingTop: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 11, color: "#555", marginBottom: 6 }}>Quick Actions</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <button onClick={exportCSV} style={{ ...erpStyles.btn(false), justifyContent: "flex-start", fontSize: 11 }}>↓ Export All Logs (CSV)</button>
                  <button onClick={exportIPReport} style={{ ...erpStyles.btn(false), justifyContent: "flex-start", fontSize: 11 }}>↓ Export IP Report (CSV)</button>
                  <button onClick={fetchAll} style={{ ...erpStyles.btn(false), justifyContent: "flex-start", fontSize: 11 }}>↻ Reload All Data</button>
                  <button onClick={() => { setDateFrom(new Date().toISOString().split("T")[0]); setDateTo(new Date().toISOString().split("T")[0]); }} style={{ ...erpStyles.btn(false), justifyContent: "flex-start", fontSize: 11 }}>📅 Filter to Today</button>
                  <button onClick={() => { setDateFrom(new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0]); setDateTo(new Date().toISOString().split("T")[0]); }} style={{ ...erpStyles.btn(false), justifyContent: "flex-start", fontSize: 11 }}>📅 Last 7 Days</button>
                </div>
              </div>
            </div>

            {/* Stats panel */}
            <div>
              <div style={{ background: "#fff", border: "1px solid #ccc", padding: 14, marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#1a3580", marginBottom: 10, borderBottom: "1px solid #eee", paddingBottom: 6 }}>📊 Audit Statistics</div>
                {[
                  { label: "Total Records (selected range)", val: auditLogs.length, col: "#1a3580" },
                  { label: "Unique IP Addresses", val: uniqueIPs.length, col: "#2255cc" },
                  { label: "Unique Users Logged", val: new Set(auditLogs.map(l => l.user_email).filter(Boolean)).size, col: "#007700" },
                  { label: "Today's Events", val: auditLogs.filter(l => new Date(l.created_at).toDateString() === today).length, col: "#cc6600" },
                  { label: "Login Events", val: auditLogs.filter(l => l.action === "login" || l.action?.includes("sign_in")).length, col: "#22c55e" },
                  { label: "Failed / Error Actions", val: auditLogs.filter(l => l.action?.includes("fail") || l.action?.includes("error")).length, col: "#cc0000" },
                  { label: "High Risk IPs", val: ipStats.filter(s => s.risk === "high" || s.risk === "critical").length, col: "#f97316" },
                  { label: "Date Range Days", val: Math.ceil((new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / 86400000 + 1), col: "#555" },
                ].map(r => (
                  <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #f0f0f0", fontSize: 12 }}>
                    <span style={{ color: "#555" }}>{r.label}</span>
                    <span style={{ fontWeight: 700, color: r.col }}>{r.val}</span>
                  </div>
                ))}
              </div>

              {/* Top actions breakdown */}
              <div style={{ background: "#fff", border: "1px solid #ccc", padding: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: "#1a3580", marginBottom: 10 }}>🎯 Top Actions</div>
                {Object.entries(auditLogs.reduce((acc: any, l) => { if (l.action) acc[l.action] = (acc[l.action] || 0) + 1; return acc; }, {}))
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .slice(0, 8)
                  .map(([action, count]) => {
                    const pct = Math.round((count as number) / Math.max(1, auditLogs.length) * 100);
                    return (
                      <div key={action} style={{ marginBottom: 6 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2, fontSize: 11 }}>
                          <StatusChip status={action} />
                          <span style={{ color: "#555" }}>{count as number} ({pct}%)</span>
                        </div>
                        <div style={{ background: "#e5e7eb", height: 4, borderRadius: 2 }}>
                          <div style={{ background: "#2a5fc3", height: 4, borderRadius: 2, width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#e0e0e0", borderTop: "1px solid #aaa", padding: "2px 10px", fontSize: 11, color: "#555", display: "flex", gap: 10, flexWrap: "wrap", zIndex: 100 }}>
        <span>Records: {auditLogs.length}</span>
        <span>|</span><span>Users: {users.length}</span>
        <span>|</span><span>IPs: {uniqueIPs.length}</span>
        {autoRefresh && <><span>|</span><span style={{ color: "#007700", fontWeight: 700 }}>🔴 LIVE — auto-refresh 30s</span></>}
        <span style={{ marginLeft: "auto" }}>EL5 MediProcure v11 · Users &amp; IP Audit</span>
      </div>
    </div>
  );
}
