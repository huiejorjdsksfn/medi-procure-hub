/**
 * EL5 MediProcure — IP Access Management v11
 * Enhanced: mobile responsive, real-time monitoring, analytics, data control
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

interface IPRule {
  id: string; ip_address: string; rule_type: "allow" | "block" | "monitor";
  description?: string; created_by?: string; is_active: boolean;
  last_seen?: string; hit_count?: number; created_at: string; expires_at?: string;
}
interface IPSession {
  id: string; ip_address?: string; user_email?: string; user_id?: string;
  started_at: string; last_activity?: string; is_active?: boolean;
  user_agent?: string; location?: string; request_count?: number;
}

function fmtDateTime(s: string) { if (!s) return "—"; return new Date(s).toLocaleString("en-KE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); }
function fmtDate(s: string)     { if (!s) return "—"; return new Date(s).toLocaleDateString("en-KE", { day: "2-digit", month: "2-digit", year: "numeric" }); }
function ago(s: string) {
  const d = Date.now() - new Date(s).getTime();
  if (d < 60000) return `${Math.floor(d / 1000)}s ago`;
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
}

function StatusChip({ status }: { status: string }) {
  return <span style={erpStyles.statusChip(status)}>{status}</span>;
}

const RULE_COLORS: Record<string, string> = { allow: "#007700", block: "#cc0000", monitor: "#cc6600" };
type IPTab = "rules" | "sessions" | "analytics" | "monitor";

export default function IpAccessPage() {
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<IPTab>("rules");
  const [rules, setRules] = useState<IPRule[]>([]);
  const [sessions, setSessions] = useState<IPSession[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [ruleTypeFilter, setRuleTypeFilter] = useState("ALL");
  const [form, setForm] = useState({ ip_address: "", rule_type: "allow" as "allow"|"block"|"monitor", description: "", expires_at: "" });
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [editRule, setEditRule] = useState<IPRule | null>(null);
  const [liveLog, setLiveLog] = useState<string[]>([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [rulesRes, sessRes, logsRes] = await Promise.allSettled([
        db.from("ip_access_rules").select("*").order("created_at", { ascending: false }).limit(300),
        db.from("user_sessions").select("*").order("started_at", { ascending: false }).limit(150),
        db.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(500),
      ]);
      if (rulesRes.status === "fulfilled") setRules(rulesRes.value.data || []);
      if (sessRes.status  === "fulfilled") setSessions(sessRes.value.data || []);
      if (logsRes.status  === "fulfilled") setAuditLogs(logsRes.value.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetchAll, 20000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchAll]);

  // Real-time
  useEffect(() => {
    const ch = db.channel("ip_access_rt_v11")
      .on("postgres_changes", { event: "*", schema: "public", table: "ip_access_rules" }, () => fetchAll())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_logs" }, (payload: any) => {
        const l = payload.new;
        setLiveLog(prev => [`${new Date().toLocaleTimeString("en-KE")} — ${l.action} — ${l.ip_address || "?"} — ${l.user_email || "system"}`, ...prev.slice(0, 49)]);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchAll]);

  async function createRule() {
    if (!form.ip_address) { toast({ title: "IP address required", variant: "destructive" }); return; }
    setSaving(true);
    const { error } = await db.from("ip_access_rules").insert({
      ip_address: form.ip_address.trim(), rule_type: form.rule_type,
      description: form.description || null, is_active: true,
      expires_at: form.expires_at || null, hit_count: 0,
    });
    setSaving(false);
    if (error) { toast({ title: "Error: " + error.message, variant: "destructive" }); return; }
    toast({ title: `✓ Rule created: ${form.rule_type.toUpperCase()} ${form.ip_address}` });
    setShowNew(false);
    setForm({ ip_address: "", rule_type: "allow", description: "", expires_at: "" });
    fetchAll();
  }

  async function saveEdit() {
    if (!editRule) return;
    setSaving(true);
    const { error } = await db.from("ip_access_rules").update({
      ip_address: editRule.ip_address, rule_type: editRule.rule_type,
      description: editRule.description, expires_at: editRule.expires_at || null,
    }).eq("id", editRule.id);
    setSaving(false);
    if (error) toast({ title: "Error: " + error.message, variant: "destructive" });
    else { toast({ title: "✓ Rule updated" }); setEditRule(null); fetchAll(); }
  }

  async function toggleRule(id: string, current: boolean) {
    const { error } = await db.from("ip_access_rules").update({ is_active: !current }).eq("id", id);
    if (!error) { toast({ title: `✓ Rule ${!current ? "enabled" : "disabled"}` }); fetchAll(); }
    else toast({ title: "Error: " + error.message, variant: "destructive" });
  }

  async function deleteRule(id: string, ip: string) {
    if (!window.confirm(`Delete IP rule for ${ip}?`)) return;
    const { error } = await db.from("ip_access_rules").delete().eq("id", id);
    if (!error) { toast({ title: "✓ Rule deleted" }); fetchAll(); }
    else toast({ title: "Error: " + error.message, variant: "destructive" });
  }

  async function quickBlock(ip: string) {
    if (!window.confirm(`Block IP ${ip}?`)) return;
    const { error } = await db.from("ip_access_rules").upsert({
      ip_address: ip, rule_type: "block", is_active: true,
      description: `Blocked via IP Monitor ${new Date().toLocaleDateString("en-KE")}`,
      hit_count: 0,
    }, { onConflict: "ip_address" });
    if (!error) { toast({ title: `✓ ${ip} blocked` }); fetchAll(); }
  }

  function exportRules() {
    const rows = ["IP Address,Rule Type,Description,Active,Hit Count,Created,Expires",
      ...filteredRules.map(r => `"${r.ip_address}","${r.rule_type}","${r.description || ""}",${r.is_active},${r.hit_count || 0},"${fmtDate(r.created_at)}","${fmtDate(r.expires_at || "")}"`)
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "ip_access_rules.csv"; a.click();
    URL.revokeObjectURL(url); toast({ title: "✓ Exported" });
  }

  const ipAnalytics = useMemo(() => {
    const map: Record<string, { count: number; lastSeen: string; users: Set<string>; actions: string[] }> = {};
    for (const log of auditLogs) {
      const ip = log.ip_address; if (!ip) continue;
      if (!map[ip]) map[ip] = { count: 0, lastSeen: log.created_at, users: new Set(), actions: [] };
      map[ip].count++;
      if (log.user_email) map[ip].users.add(log.user_email);
      if (log.action) map[ip].actions.push(log.action);
      if (log.created_at > map[ip].lastSeen) map[ip].lastSeen = log.created_at;
    }
    return Object.entries(map).map(([ip, d]) => ({
      ip, count: d.count, lastSeen: d.lastSeen, users: d.users.size,
      topAction: d.actions.sort((a, b) => d.actions.filter(x => x === b).length - d.actions.filter(x => x === a).length)[0] || "—",
      isBlocked: rules.some(r => r.ip_address === ip && r.rule_type === "block" && r.is_active),
      todayCount: d.actions.length, // simplification
    })).sort((a, b) => b.count - a.count);
  }, [auditLogs, rules]);

  const filteredRules = useMemo(() => rules.filter(r => {
    const q = search.toLowerCase();
    const matchS = !search || r.ip_address.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q);
    const matchT = ruleTypeFilter === "ALL" || r.rule_type === ruleTypeFilter.toLowerCase();
    return matchS && matchT;
  }), [rules, search, ruleTypeFilter]);

  const expiredRules = useMemo(() => rules.filter(r => r.expires_at && new Date(r.expires_at) < new Date()), [rules]);

  const kpiData = [
    { label: "TOTAL RULES",    val: rules.length,                                       col: "#1a3580", icon: "🛡" },
    { label: "ALLOW",          val: rules.filter(r => r.rule_type === "allow" && r.is_active).length,  col: "#007700", icon: "✅" },
    { label: "BLOCKED",        val: rules.filter(r => r.rule_type === "block" && r.is_active).length,  col: "#cc0000", icon: "🚫" },
    { label: "MONITOR",        val: rules.filter(r => r.rule_type === "monitor" && r.is_active).length,col: "#cc6600", icon: "👁" },
    { label: "SESSIONS",       val: sessions.filter(s => s.is_active).length,           col: "#2255cc", icon: "🖥" },
    { label: "EXPIRED",        val: expiredRules.length,                                col: "#cc0000", icon: "⏰" },
  ];

  const inp: React.CSSProperties = { ...erpStyles.inp, width: "100%", boxSizing: "border-box" as any };

  const TABS: { id: IPTab; label: string; icon: string }[] = [
    { id: "rules",     label: "Access Rules",     icon: "🛡" },
    { id: "sessions",  label: "Sessions",          icon: "🖥" },
    { id: "analytics", label: "Analytics",         icon: "📊" },
    { id: "monitor",   label: "Live Monitor",      icon: "📡" },
  ];

  return (
    <div style={{ background: "#f0f0f0", minHeight: "100vh", fontFamily: ERP.fontFamily, fontSize: 12 }}>
      <AdminBreadcrumb />
      {/* Title Bar */}
      <div style={{ background: ERP.titleBar, color: "#fff", padding: "5px 10px", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${ERP.titleBarBorder}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>🌐</span>
          <div>
            <div>EL5 MediProcure — IP Access Control</div>
            <div style={{ fontSize: 10, fontWeight: 400, opacity: .85 }}>Embu Level 5 Hospital · Network Security v11</div>
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
        <button onClick={() => setShowNew(v => !v)} style={{ ...erpStyles.btn(true), color: "#fff" }}>+ Add Rule</button>
        <button onClick={fetchAll} style={erpStyles.btn(false)}>↻ Refresh</button>
        <button onClick={exportRules} style={erpStyles.btn(false)}>↓ Export CSV</button>
        {expiredRules.length > 0 && (
          <span style={{ fontSize: 10, color: "#cc0000", fontWeight: 700, padding: "2px 8px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10 }}>
            ⏰ {expiredRules.length} expired rule{expiredRules.length !== 1 ? "s" : ""}
          </span>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 4, flexWrap: "wrap" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ ...erpStyles.btn(tab === t.id), background: tab === t.id ? ERP.tabActive : ERP.tabInactive, color: tab === t.id ? "#fff" : "#333", border: `1px solid ${tab === t.id ? ERP.tabActiveBorder : ERP.toolbarBorder}`, fontSize: isMobile ? 11 : 12 }}>
              {isMobile ? t.icon : `${t.icon} ${t.label}`}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(3,1fr)" : "repeat(6,1fr)", borderBottom: "1px solid #aaa" }}>
        {kpiData.map((k, i) => (
          <div key={i} style={{ padding: isMobile ? "8px 10px" : "10px 16px", borderRight: "1px solid #aaa", background: "#fff" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 14 }}>{k.icon}</span>
              <span style={{ fontWeight: 800, fontSize: isMobile ? 16 : 20, color: k.col }}>{k.val}</span>
            </div>
            <div style={{ fontSize: 9, color: "#666", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Content */}
      <div style={{ margin: isMobile ? "4px" : "6px 8px", paddingBottom: 40 }}>

        {/* ── Add/Edit Rule Form ─────────────────────────────────── */}
        {(showNew || editRule) && (
          <div style={{ background: "#fff", border: "2px solid #2255cc", padding: 14, marginBottom: 8, borderRadius: 4 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#1a3580", marginBottom: 10, borderBottom: "1px solid #ddd", paddingBottom: 6 }}>
              {editRule ? "✏️ Edit IP Rule" : "🛡️ Add IP Access Rule"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(4,1fr)", gap: 10 }}>
              <div style={{ gridColumn: isMobile ? "1" : "span 2" }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: "#555", display: "block", marginBottom: 3 }}>IP Address or CIDR Range *</label>
                <input
                  value={editRule ? editRule.ip_address : form.ip_address}
                  onChange={e => editRule ? setEditRule({ ...editRule, ip_address: e.target.value }) : setForm(p => ({ ...p, ip_address: e.target.value }))}
                  placeholder="e.g. 192.168.1.0/24 or 10.0.0.1" style={inp} />
                <div style={{ fontSize: 9, color: "#888", marginTop: 2 }}>IPv4, CIDR, or wildcard. Example: 192.168.0.0/24</div>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: "#555", display: "block", marginBottom: 3 }}>Rule Type</label>
                <select
                  value={editRule ? editRule.rule_type : form.rule_type}
                  onChange={e => editRule ? setEditRule({ ...editRule, rule_type: e.target.value as any }) : setForm(p => ({ ...p, rule_type: e.target.value as any }))}
                  style={inp}>
                  <option value="allow">✅ Allow</option>
                  <option value="block">🚫 Block</option>
                  <option value="monitor">👁 Monitor</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: "#555", display: "block", marginBottom: 3 }}>Expires (optional)</label>
                <input type="date"
                  value={editRule ? (editRule.expires_at?.split("T")[0] || "") : form.expires_at}
                  onChange={e => editRule ? setEditRule({ ...editRule, expires_at: e.target.value }) : setForm(p => ({ ...p, expires_at: e.target.value }))}
                  style={inp} />
              </div>
              <div style={{ gridColumn: isMobile ? "1" : "span 4" }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: "#555", display: "block", marginBottom: 3 }}>Description / Reason</label>
                <input
                  value={editRule ? (editRule.description || "") : form.description}
                  onChange={e => editRule ? setEditRule({ ...editRule, description: e.target.value }) : setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Reason for this rule..." style={inp} />
              </div>
            </div>
            <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
              <button onClick={editRule ? saveEdit : createRule} disabled={saving} style={{ ...erpStyles.btn(true), color: "#fff" }}>
                {saving ? "⏳ Saving..." : editRule ? "💾 Save Changes" : "💾 Add Rule"}
              </button>
              <button onClick={() => { setShowNew(false); setEditRule(null); }} style={erpStyles.btn(false)}>Cancel</button>
            </div>
          </div>
        )}

        {/* ── Rules Tab ─────────────────────────────────────────── */}
        {tab === "rules" && (
          <div>
            <div style={{ background: "#f5f5f5", border: "1px solid #ccc", padding: "5px 10px", marginBottom: 4, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search IP, description..." style={{ ...erpStyles.inp, width: isMobile ? "100%" : 220, fontSize: 11 }} />
              <select value={ruleTypeFilter} onChange={e => setRuleTypeFilter(e.target.value)} style={{ ...erpStyles.inp, fontSize: 11 }}>
                {["ALL", "ALLOW", "BLOCK", "MONITOR"].map(t => <option key={t}>{t}</option>)}
              </select>
              <span style={{ marginLeft: "auto", fontSize: 11, color: "#888" }}>{filteredRules.length} rules</span>
            </div>

            <div style={{ background: "#fff", border: "1px solid #ccc" }}>
              <MobileTable<IPRule>
                loading={loading}
                rows={filteredRules}
                rowKey={r => r.id}
                emptyText="No IP rules configured — click + Add Rule to begin"
                maxHeight={isMobile ? undefined : "calc(100vh - 300px)"}
                cols={[
                  {
                    key: "ip_address", label: "IP Address / CIDR", primary: true,
                    render: r => (
                      <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 12, color: RULE_COLORS[r.rule_type] || "#333" }}>
                        {r.ip_address}
                      </span>
                    ),
                  },
                  {
                    key: "rule_type", label: "Type",
                    render: r => (
                      <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700,
                        background: `${RULE_COLORS[r.rule_type]}18`, color: RULE_COLORS[r.rule_type],
                        border: `1px solid ${RULE_COLORS[r.rule_type]}44`, textTransform: "uppercase" }}>
                        {r.rule_type}
                      </span>
                    ),
                  },
                  {
                    key: "description", label: "Description",
                    render: r => <span style={{ fontSize: 11, color: "#555" }}>{r.description || "—"}</span>,
                    tdStyle: { maxWidth: 200 },
                  },
                  {
                    key: "is_active", label: "Status",
                    render: r => <StatusChip status={r.is_active ? "active" : "inactive"} />,
                  },
                  {
                    key: "hit_count", label: "Hits", mobileHide: false,
                    render: r => <span style={{ fontWeight: 700 }}>{(r.hit_count || 0).toLocaleString()}</span>,
                    tdStyle: { textAlign: "center" },
                  },
                  {
                    key: "last_seen", label: "Last Hit", mobileHide: true,
                    render: r => <span style={{ fontSize: 11, color: "#555" }}>{r.last_seen ? fmtDateTime(r.last_seen) : "—"}</span>,
                  },
                  {
                    key: "expires_at", label: "Expires", mobileHide: true,
                    render: r => (
                      <span style={{ fontSize: 11, color: r.expires_at && new Date(r.expires_at) < new Date() ? "#cc0000" : "#555" }}>
                        {fmtDate(r.expires_at || "")}
                        {r.expires_at && new Date(r.expires_at) < new Date() && <span style={{ marginLeft: 4, fontSize: 9, color: "#cc0000" }}>EXPIRED</span>}
                      </span>
                    ),
                  },
                  {
                    key: "created_at", label: "Created", mobileHide: true,
                    render: r => <span style={{ fontSize: 11, color: "#555" }}>{fmtDate(r.created_at)}</span>,
                  },
                  {
                    key: "id" as any, label: "Actions",
                    render: r => (
                      <div style={{ display: "flex", gap: 4, flexWrap: "nowrap" }}>
                        <button onClick={e => { e.stopPropagation(); setEditRule(r); }} style={{ ...erpStyles.btn(false), fontSize: 10, padding: "2px 6px" }}>✏</button>
                        <button onClick={e => { e.stopPropagation(); toggleRule(r.id, r.is_active); }} style={{ ...erpStyles.btn(false), fontSize: 10, padding: "2px 6px", color: r.is_active ? "#cc6600" : "#007700" }}>
                          {r.is_active ? "Off" : "On"}
                        </button>
                        <button onClick={e => { e.stopPropagation(); deleteRule(r.id, r.ip_address); }} style={{ ...erpStyles.btn(false), fontSize: 10, padding: "2px 6px", color: "#cc0000" }}>Del</button>
                      </div>
                    ),
                    tdStyle: { whiteSpace: "nowrap" },
                  },
                ]}
              />
            </div>
          </div>
        )}

        {/* ── Sessions Tab ─────────────────────────────────────────── */}
        {tab === "sessions" && (
          <div style={{ background: "#fff", border: "1px solid #ccc" }}>
            <MobileTable<IPSession>
              loading={loading}
              rows={sessions}
              rowKey={s => s.id}
              emptyText="No session data available"
              maxHeight={isMobile ? undefined : "calc(100vh - 220px)"}
              cols={[
                {
                  key: "user_email", label: "User", primary: true,
                  render: s => <span style={{ color: "#2255cc" }}>{s.user_email || s.user_id?.slice(0, 16) || "—"}</span>,
                },
                {
                  key: "ip_address", label: "IP Address",
                  render: s => <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{s.ip_address || "—"}</span>,
                },
                {
                  key: "started_at", label: "Started",
                  render: s => <span style={{ fontSize: 11, color: "#555" }}>{fmtDateTime(s.started_at)}</span>,
                },
                {
                  key: "last_activity", label: "Last Activity", mobileHide: false,
                  render: s => <span style={{ fontSize: 11, color: "#555" }}>{s.last_activity ? ago(s.last_activity) : "—"}</span>,
                },
                {
                  key: "is_active", label: "Status",
                  render: s => <StatusChip status={s.is_active ? "active" : "ended"} />,
                },
                {
                  key: "request_count", label: "Requests", mobileHide: true,
                  render: s => <span style={{ textAlign: "center" }}>{s.request_count || "—"}</span>,
                  tdStyle: { textAlign: "center" },
                },
                {
                  key: "user_agent", label: "User Agent", mobileHide: true,
                  render: s => <span style={{ fontSize: 10, color: "#666", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{s.user_agent || "—"}</span>,
                  tdStyle: { maxWidth: 180 },
                },
              ]}
            />
          </div>
        )}

        {/* ── Analytics Tab ─────────────────────────────────────────── */}
        {tab === "analytics" && (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8 }}>
            {/* Top IPs */}
            <div style={{ background: "#fff", border: "1px solid #ccc" }}>
              <div style={{ background: ERP.sidebarHeader, color: "#fff", padding: "5px 10px", fontSize: 11, fontWeight: 700 }}>
                📊 Top IP Addresses by Activity
              </div>
              <MobileTable<(typeof ipAnalytics)[0]>
                rows={ipAnalytics.slice(0, 30)}
                rowKey={ip => ip.ip}
                emptyText="No IP activity data"
                cols={[
                  {
                    key: "ip", label: "IP Address", primary: true,
                    render: ip => (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontFamily: "monospace", fontWeight: 700, color: ip.isBlocked ? "#cc0000" : "#2255cc" }}>{ip.ip}</span>
                        {ip.isBlocked && <span style={{ fontSize: 9, color: "#cc0000", border: "1px solid #fca5a5", padding: "1px 4px", borderRadius: 3 }}>BLOCKED</span>}
                      </div>
                    ),
                  },
                  { key: "count", label: "Total", render: ip => <b>{ip.count}</b>, tdStyle: { textAlign: "center" } },
                  { key: "users", label: "Users", render: ip => String(ip.users), tdStyle: { textAlign: "center" } },
                  { key: "topAction", label: "Top Action", mobileHide: false, render: ip => <StatusChip status={ip.topAction} /> },
                  {
                    key: "ip" as any, label: "Actions", mobileHide: true,
                    render: ip => ip.isBlocked ? <span style={{ fontSize: 10, color: "#cc0000" }}>BLOCKED</span> :
                      <button onClick={() => quickBlock(ip.ip)} style={{ ...erpStyles.btn(false), fontSize: 10, padding: "2px 6px", color: "#cc0000" }}>🚫 Block</button>,
                  },
                ]}
              />
            </div>

            {/* Summary stats */}
            <div>
              <div style={{ background: "#fff", border: "1px solid #ccc", padding: 14, marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: "#1a3580", marginBottom: 10, borderBottom: "1px solid #eee", paddingBottom: 6 }}>🛡️ Access Control Summary</div>
                {[
                  { label: "Total Rules", val: rules.length, col: "#1a1a1a" },
                  { label: "Active Allow Rules", val: rules.filter(r => r.rule_type === "allow" && r.is_active).length, col: "#007700" },
                  { label: "Active Block Rules", val: rules.filter(r => r.rule_type === "block" && r.is_active).length, col: "#cc0000" },
                  { label: "Monitor Rules", val: rules.filter(r => r.rule_type === "monitor" && r.is_active).length, col: "#cc6600" },
                  { label: "Disabled Rules", val: rules.filter(r => !r.is_active).length, col: "#888" },
                  { label: "Expired Rules", val: expiredRules.length, col: "#cc0000" },
                  { label: "Unique IPs (logs)", val: ipAnalytics.length, col: "#2255cc" },
                  { label: "Active Sessions", val: sessions.filter(s => s.is_active).length, col: "#007700" },
                ].map(row => (
                  <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #f0f0f0", fontSize: 12 }}>
                    <span style={{ color: "#555" }}>{row.label}</span>
                    <span style={{ fontWeight: 700, color: row.col }}>{row.val}</span>
                  </div>
                ))}
              </div>
              {/* Quick Actions */}
              <div style={{ background: "#fff", border: "1px solid #ccc", padding: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: "#1a3580", marginBottom: 8 }}>⚡ Quick Actions</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    { label: "🚫 Block an IP Address", col: "#cc0000", action: () => { setShowNew(true); setForm(p => ({ ...p, rule_type: "block" })); setTab("rules"); } },
                    { label: "✅ Whitelist an IP",    col: "#007700", action: () => { setShowNew(true); setForm(p => ({ ...p, rule_type: "allow" })); setTab("rules"); } },
                    { label: "👁 Monitor an IP",     col: "#cc6600", action: () => { setShowNew(true); setForm(p => ({ ...p, rule_type: "monitor" })); setTab("rules"); } },
                    { label: "↓ Export Rules CSV",   col: "#333",    action: exportRules },
                    { label: "↻ Refresh All Data",   col: "#2255cc", action: fetchAll },
                  ].map(a => (
                    <button key={a.label} onClick={a.action} style={{ ...erpStyles.btn(false), justifyContent: "flex-start", color: a.col, border: `1px solid ${a.col}33`, fontSize: 11 }}>
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Live Monitor Tab ─────────────────────────────────────── */}
        {tab === "monitor" && (
          <div>
            <div style={{ background: "#fff", border: "1px solid #ccc", padding: 12, marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#1a3580" }}>📡 Real-Time Activity Monitor</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => setAutoRefresh(v => !v)} style={{ ...erpStyles.btn(autoRefresh), fontSize: 11 }}>
                    {autoRefresh ? "🔴 Stop" : "▶ Start"} Live Feed
                  </button>
                  <button onClick={() => setLiveLog([])} style={{ ...erpStyles.btn(false), fontSize: 11 }}>Clear</button>
                </div>
              </div>
              {autoRefresh && (
                <div style={{ fontSize: 11, color: "#007700", padding: "4px 8px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 4, marginBottom: 8 }}>
                  🔴 LIVE — receiving events in real-time via Supabase realtime
                </div>
              )}
              <div style={{ background: "#0f172a", borderRadius: 4, padding: 10, maxHeight: isMobile ? 300 : 420, overflow: "auto", fontFamily: "monospace", fontSize: 11 }}>
                {liveLog.length > 0 ? liveLog.map((line, i) => (
                  <div key={i} style={{ color: i === 0 ? "#22c55e" : "#94a3b8", padding: "2px 0", borderBottom: "1px solid #1e293b" }}>
                    <span style={{ color: "#64748b" }}>{`>`}</span> {line}
                  </div>
                )) : (
                  <div style={{ color: "#64748b", padding: "20px 0", textAlign: "center" }}>
                    Waiting for events… {autoRefresh ? "Live mode ON" : 'Click "▶ Start Live Feed" to begin monitoring'}
                  </div>
                )}
              </div>
            </div>

            {/* Recent audit log */}
            <div style={{ background: "#fff", border: "1px solid #ccc" }}>
              <div style={{ background: ERP.sidebarHeader, color: "#fff", padding: "5px 10px", fontSize: 11, fontWeight: 700 }}>
                📋 Recent Activity (last 50 events)
              </div>
              {auditLogs.slice(0, 50).map((l, i) => (
                <div key={l.id} style={{ display: "flex", gap: 10, padding: "5px 10px", borderBottom: "1px solid #f0f0f0", background: i % 2 === 0 ? "#fff" : "#f9f9f9", fontSize: 11 }}>
                  <span style={{ color: "#888", flexShrink: 0, fontFamily: "monospace", width: 55 }}>{ago(l.created_at)}</span>
                  <StatusChip status={l.action} />
                  <span style={{ color: "#2255cc", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.user_email || "system"}</span>
                  {!isMobile && <span style={{ color: "#888", fontFamily: "monospace", flexShrink: 0, fontSize: 10 }}>{l.ip_address || "—"}</span>}
                  {!isMobile && (
                    <button onClick={() => quickBlock(l.ip_address)} disabled={!l.ip_address} style={{ ...erpStyles.btn(false), fontSize: 9, padding: "1px 5px", color: "#cc0000", flexShrink: 0 }}>
                      🚫
                    </button>
                  )}
                </div>
              ))}
              {auditLogs.length === 0 && !loading && (
                <div style={{ padding: 30, textAlign: "center", color: "#888" }}>No audit log data</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#e0e0e0", borderTop: "1px solid #aaa", padding: "2px 10px", fontSize: 11, color: "#555", display: "flex", gap: 10, flexWrap: "wrap", zIndex: 100 }}>
        <span>Rules: {rules.length}</span>
        <span>|</span><span>Blocked: {rules.filter(r => r.rule_type === "block" && r.is_active).length}</span>
        <span>|</span><span>Sessions: {sessions.filter(s => s.is_active).length}</span>
        {autoRefresh && <><span>|</span><span style={{ color: "#007700", fontWeight: 700 }}>🔴 LIVE</span></>}
        <span style={{ marginLeft: "auto" }}>EL5 MediProcure v11 · IP Access Control</span>
      </div>
    </div>
  );
}
