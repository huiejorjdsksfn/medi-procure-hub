import type React from "react";
/**
 * EL5 MediProcure — IP Access Management v10
 * Classic ERP Financial Management System UI
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ERP, erpStyles } from "@/lib/erpTheme";

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

function fmtDateTime(s: string) {
  if(!s) return "—";
  return new Date(s).toLocaleString("en-KE",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});
}
function fmtDate(s: string) {
  if(!s) return "—";
  return new Date(s).toLocaleDateString("en-KE",{day:"2-digit",month:"2-digit",year:"numeric"});
}
function StatusChip({ status }: { status: string }) {
  return <span style={erpStyles.statusChip(status)}>{status}</span>;
}

type IPTab = "rules" | "sessions" | "analytics";

export default function IpAccessPage() {
  const [tab, setTab] = useState<IPTab>("rules");
  const [rules, setRules] = useState<IPRule[]>([]);
  const [sessions, setSessions] = useState<IPSession[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [ruleTypeFilter, setRuleTypeFilter] = useState("ALL");
  const [form, setForm] = useState({ ip_address: "", rule_type: "allow" as const, description: "", expires_at: "" });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [rulesRes, sessRes, logsRes] = await Promise.allSettled([
        db.from("ip_access_rules").select("*").order("created_at", { ascending: false }).limit(200),
        db.from("user_sessions").select("*").order("started_at", { ascending: false }).limit(100),
        db.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(300),
      ]);
      setRules(rulesRes.status === "fulfilled" ? (rulesRes.value.data || []) : []);
      setSessions(sessRes.status === "fulfilled" ? (sessRes.value.data || []) : []);
      setAuditLogs(logsRes.status === "fulfilled" ? (logsRes.value.data || []) : []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function createRule() {
    if (!form.ip_address) { toast({ title: "IP address required", variant: "destructive" }); return; }
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$|^\*$/;
    if (!ipRegex.test(form.ip_address) && !form.ip_address.includes("*")) {
      toast({ title: "Invalid IP format (e.g. 192.168.1.0/24 or 10.0.0.1)", variant: "destructive" }); return;
    }
    setSaving(true);
    const { error } = await db.from("ip_access_rules").insert({
      ip_address: form.ip_address.trim(),
      rule_type: form.rule_type,
      description: form.description || null,
      is_active: true,
      expires_at: form.expires_at || null,
      hit_count: 0,
    });
    setSaving(false);
    if (error) { toast({ title: "Error: " + error.message, variant: "destructive" }); return; }
    toast({ title: `✓ Rule created: ${form.rule_type.toUpperCase()} ${form.ip_address}` });
    setShowNew(false);
    setForm({ ip_address: "", rule_type: "allow", description: "", expires_at: "" });
    fetchAll();
  }

  async function toggleRule(id: string, current: boolean) {
    const { error } = await db.from("ip_access_rules").update({ is_active: !current }).eq("id", id);
    if (!error) { toast({ title: `✓ Rule ${!current ? "enabled" : "disabled"}` }); fetchAll(); }
  }

  async function deleteRule(id: string) {
    if (!window.confirm("Delete this IP rule?")) return;
    const { error } = await db.from("ip_access_rules").delete().eq("id", id);
    if (!error) { toast({ title: "✓ Rule deleted" }); fetchAll(); }
    else toast({ title: "Error: " + error.message, variant: "destructive" });
  }

  function exportRules() {
    const rows = [
      "IP Address,Rule Type,Description,Active,Hit Count,Created,Expires",
      ...filteredRules.map(r =>
        `${r.ip_address},${r.rule_type},${r.description || ""},${r.is_active},${r.hit_count || 0},${fmtDate(r.created_at)},${fmtDate(r.expires_at || "")}`
      )
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "ip_access_rules.csv"; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "✓ Exported" });
  }

  // Build IP analytics from audit logs
  const ipAnalytics = (() => {
    const map: Record<string, { count: number; lastSeen: string; users: Set<string>; actions: string[] }> = {};
    for (const log of auditLogs) {
      const ip = log.ip_address;
      if (!ip) continue;
      if (!map[ip]) map[ip] = { count: 0, lastSeen: log.created_at, users: new Set(), actions: [] };
      map[ip].count++;
      if (log.user_email) map[ip].users.add(log.user_email);
      if (log.action) map[ip].actions.push(log.action);
      if (log.created_at > map[ip].lastSeen) map[ip].lastSeen = log.created_at;
    }
    return Object.entries(map)
      .map(([ip, d]) => ({
        ip,
        count: d.count,
        lastSeen: d.lastSeen,
        users: d.users.size,
        topAction: d.actions.sort((a, b) =>
          d.actions.filter(x => x === b).length - d.actions.filter(x => x === a).length
        )[0] || "—",
        isBlocked: rules.some(r => r.ip_address === ip && r.rule_type === "block" && r.is_active),
      }))
      .sort((a, b) => b.count - a.count);
  })();

  const filteredRules = rules.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !search || r.ip_address.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q);
    const matchType = ruleTypeFilter === "ALL" || r.rule_type === ruleTypeFilter.toLowerCase();
    return matchSearch && matchType;
  });

  const kpiData = [
    { label: "TOTAL RULES", val: rules.length },
    { label: "ALLOW RULES", val: rules.filter(r => r.rule_type === "allow" && r.is_active).length },
    { label: "BLOCK RULES", val: rules.filter(r => r.rule_type === "block" && r.is_active).length },
    { label: "ACTIVE SESSIONS", val: sessions.filter(s => s.is_active).length },
    { label: "UNIQUE IPs (LOGS)", val: new Set(auditLogs.map(l => l.ip_address).filter(Boolean)).size },
  ];

  const inp: React.CSSProperties = { ...erpStyles.inp, width: "100%", boxSizing: "border-box" };

  const TABS: { id: IPTab; label: string }[] = [
    { id: "rules", label: "🛡️ Access Rules" },
    { id: "sessions", label: "🖥️ Sessions" },
    { id: "analytics", label: "📊 Analytics" },
  ];

  const RULE_COLORS: Record<string, string> = {
    allow: "#007700",
    block: "#cc0000",
    monitor: "#cc6600",
  };

  return (
    <div style={{ background: "#f0f0f0", minHeight: "100vh", fontFamily: ERP.fontFamily, fontSize: 12 }}>
      {/* Title Bar */}
      <div style={{ background: ERP.titleBar, color: "#fff", padding: "5px 10px", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${ERP.titleBarBorder}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>🌐</span>
          <div>
            <div>EL5 MediProcure — IP Access Control</div>
            <div style={{ fontSize: 10, fontWeight: 400, opacity: .85 }}>Embu Level 5 Hospital · Network Security Management</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {["0", "1", "r"].map(c => (
            <div key={c} style={{ width: 16, height: 14, background: "linear-gradient(180deg,#f0f0f0,#dcdcdc)", border: "1px solid #888", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 10, color: "#333", fontWeight: 700 }}>{c}</div>
          ))}
        </div>
      </div>

      {/* Menu */}
      <div style={{ background: "#f5f5f5", borderBottom: "1px solid #ccc", padding: "2px 8px", display: "flex", gap: 16, fontSize: 12 }}>
        {["File", "View", "Reports", "Help"].map(m => (
          <span key={m} style={{ cursor: "pointer", padding: "2px 4px" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#dce9ff")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <u>{m[0]}</u>{m.slice(1)}
          </span>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ ...erpStyles.toolbar, padding: "5px 10px", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 28, height: 28, background: "linear-gradient(135deg,#1a3580,#2a4fa3)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontSize: 14 }}>🏥</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: 11, color: "#1a3580" }}>IP Access Control</span>
        </div>
        <button onClick={fetchAll} style={erpStyles.btn(false)}>↻ Refresh</button>
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              ...erpStyles.btn(tab === t.id),
              background: tab === t.id ? ERP.tabActive : ERP.tabInactive,
              color: tab === t.id ? "#fff" : "#333",
              border: `1px solid ${tab === t.id ? ERP.tabActiveBorder : ERP.toolbarBorder}`,
            }}>{t.label}</button>
          ))}
          <button onClick={exportRules} style={erpStyles.btn(false)}>- Export</button>
          <button style={erpStyles.btn(false)}>- Print</button>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: "flex", borderBottom: "1px solid #aaa" }}>
        {kpiData.map((k, i) => (
          <div key={i} style={{ flex: 1, padding: "10px 16px", borderRight: i < kpiData.length - 1 ? "1px solid #aaa" : "none", background: "#fff" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ color: "#c0392b", fontWeight: 700, fontSize: 11 }}>-</span>
              <span style={{ fontWeight: 800, fontSize: 20, color: "#1a1a1a" }}>{k.val}</span>
            </div>
            <div style={{ fontSize: 10, color: "#666", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Content */}
      <div style={{ margin: "6px 8px" }}>

        {/* Rules Tab */}
        {tab === "rules" && (
          <div>
            <div style={{ marginBottom: 6, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <button onClick={() => setShowNew(v => !v)} style={erpStyles.btn(true)}>+ Add Rule</button>
              <button onClick={fetchAll} style={erpStyles.btn(false)}>↻ Refresh</button>
              <div style={{ display: "flex", gap: 4 }}>
                <span style={{ fontSize: 11, alignSelf: "center" }}>Search:</span>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="IP address, description..." style={{ ...erpStyles.inp, width: 200, fontSize: 11 }} />
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <span style={{ fontSize: 11, alignSelf: "center" }}>Type:</span>
                <select value={ruleTypeFilter} onChange={e => setRuleTypeFilter(e.target.value)} style={{ ...erpStyles.inp, fontSize: 11 }}>
                  {["ALL", "ALLOW", "BLOCK", "MONITOR"].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <span style={{ marginLeft: "auto", fontSize: 11, color: "#888" }}>{filteredRules.length} rules</span>
            </div>

            {/* Add Rule Form */}
            {showNew && (
              <div style={{ background: "#fff", border: "1px solid #ccc", padding: "12px 16px", marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: "#1a3580", marginBottom: 10, borderBottom: "1px solid #ddd", paddingBottom: 6 }}>
                  🛡️ Add IP Access Rule
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                  <div style={{ gridColumn: "span 2" }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "#555", display: "block", marginBottom: 3 }}>IP Address or CIDR Range *</label>
                    <input value={form.ip_address} onChange={e => setForm(p => ({ ...p, ip_address: e.target.value }))}
                      placeholder="e.g. 192.168.1.0/24 or 10.0.0.1" style={inp} />
                    <div style={{ fontSize: 9, color: "#888", marginTop: 2 }}>IPv4, CIDR (e.g. 192.168.0.0/24), or * for all</div>
                  </div>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "#555", display: "block", marginBottom: 3 }}>Rule Type</label>
                    <select value={form.rule_type} onChange={e => setForm(p => ({ ...p, rule_type: e.target.value as "allow" | "block" | "monitor" }))} style={inp}>
                      <option value="allow">Allow</option>
                      <option value="block">Block</option>
                      <option value="monitor">Monitor</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "#555", display: "block", marginBottom: 3 }}>Expires (optional)</label>
                    <input type="date" value={form.expires_at} onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))} style={inp} />
                  </div>
                  <div style={{ gridColumn: "span 4" }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "#555", display: "block", marginBottom: 3 }}>Description / Reason</label>
                    <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                      placeholder="Reason for this rule..." style={inp} />
                  </div>
                </div>
                <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                  <button onClick={createRule} disabled={saving} style={erpStyles.btn(true)}>
                    {saving ? "⏳ Saving..." : "💾 Add Rule"}
                  </button>
                  <button onClick={() => setShowNew(false)} style={erpStyles.btn(false)}>Cancel</button>
                </div>
              </div>
            )}

            {/* Rules Grid */}
            <div style={{ background: "#fff", border: "1px solid #ccc", maxHeight: "calc(100vh - 260px)", overflow: "auto" }}>
              {loading ? (
                <div style={{ padding: 40, textAlign: "center", color: "#888" }}>Loading IP rules...</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                    <tr>
                      {["IP Address / CIDR", "Rule Type", "Description", "Status", "Hit Count", "Last Seen", "Expires", "Created", "Actions"].map(h => (
                        <th key={h} style={erpStyles.gridTh}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRules.map((r, i) => (
                      <tr key={r.id} style={{ background: i % 2 === 0 ? "#fff" : "#f7f7f7" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#dce9ff")}
                        onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#f7f7f7")}>
                        <td style={{ ...erpStyles.gridTd, fontFamily: "monospace", fontWeight: 700, fontSize: 12, color: RULE_COLORS[r.rule_type] || "#333" }}>
                          {r.ip_address}
                        </td>
                        <td style={erpStyles.gridTd}>
                          <span style={{
                            display: "inline-block", padding: "2px 8px", borderRadius: 10, fontSize: 10,
                            fontWeight: 700, background: `${RULE_COLORS[r.rule_type]}18`,
                            color: RULE_COLORS[r.rule_type], border: `1px solid ${RULE_COLORS[r.rule_type]}44`,
                            textTransform: "uppercase",
                          }}>
                            {r.rule_type}
                          </span>
                        </td>
                        <td style={{ ...erpStyles.gridTd, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {r.description || "—"}
                        </td>
                        <td style={erpStyles.gridTd}>
                          <StatusChip status={r.is_active ? "active" : "inactive"} />
                        </td>
                        <td style={{ ...erpStyles.gridTd, textAlign: "center", fontWeight: 700 }}>
                          {(r.hit_count || 0).toLocaleString()}
                        </td>
                        <td style={{ ...erpStyles.gridTd, fontSize: 11, color: "#555" }}>
                          {r.last_seen ? fmtDateTime(r.last_seen) : "—"}
                        </td>
                        <td style={{ ...erpStyles.gridTd, fontSize: 11, color: r.expires_at && new Date(r.expires_at) < new Date() ? "#cc0000" : "#555" }}>
                          {fmtDate(r.expires_at || "")}
                        </td>
                        <td style={{ ...erpStyles.gridTd, fontSize: 11, color: "#555" }}>{fmtDate(r.created_at)}</td>
                        <td style={erpStyles.gridTd}>
                          <div style={{ display: "flex", gap: 3 }}>
                            <button onClick={() => toggleRule(r.id, r.is_active)} style={{ ...erpStyles.btn(false), fontSize: 10, padding: "2px 6px", color: r.is_active ? "#cc6600" : "#007700" }}>
                              {r.is_active ? "Disable" : "Enable"}
                            </button>
                            <button onClick={() => deleteRule(r.id)} style={{ ...erpStyles.btn(false), fontSize: 10, padding: "2px 6px", color: "#cc0000" }}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredRules.length === 0 && (
                      <tr><td colSpan={9} style={{ padding: 30, textAlign: "center", color: "#888" }}>No IP rules configured</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Sessions Tab */}
        {tab === "sessions" && (
          <div style={{ background: "#fff", border: "1px solid #ccc", maxHeight: "calc(100vh - 200px)", overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                <tr>
                  {["User", "IP Address", "Started", "Last Activity", "Status", "Requests", "User Agent"].map(h => (
                    <th key={h} style={erpStyles.gridTh}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ padding: 30, textAlign: "center" }}>Loading sessions...</td></tr>
                ) : sessions.length > 0 ? sessions.map((s, i) => (
                  <tr key={s.id} style={{ background: i % 2 === 0 ? "#fff" : "#f7f7f7" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#dce9ff")}
                    onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#f7f7f7")}>
                    <td style={{ ...erpStyles.gridTd, color: "#2255cc" }}>{s.user_email || s.user_id?.slice(0, 16) || "—"}</td>
                    <td style={{ ...erpStyles.gridTd, fontFamily: "monospace", fontWeight: 700 }}>{s.ip_address || "—"}</td>
                    <td style={{ ...erpStyles.gridTd, fontSize: 11, color: "#555" }}>{fmtDateTime(s.started_at)}</td>
                    <td style={{ ...erpStyles.gridTd, fontSize: 11, color: "#555" }}>{s.last_activity ? fmtDateTime(s.last_activity) : "—"}</td>
                    <td style={erpStyles.gridTd}><StatusChip status={s.is_active ? "active" : "ended"} /></td>
                    <td style={{ ...erpStyles.gridTd, textAlign: "center" }}>{s.request_count || "—"}</td>
                    <td style={{ ...erpStyles.gridTd, fontSize: 10, color: "#666", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.user_agent || "—"}
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={7} style={{ padding: 30, textAlign: "center", color: "#888" }}>No session data available</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Analytics Tab */}
        {tab === "analytics" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {/* Top IPs */}
            <div style={{ background: "#fff", border: "1px solid #ccc" }}>
              <div style={{ background: ERP.sidebarHeader, color: "#fff", padding: "5px 10px", fontSize: 11, fontWeight: 700 }}>
                📊 Top IP Addresses by Activity
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["IP Address", "Requests", "Users", "Top Action", "Status"].map(h => (
                      <th key={h} style={erpStyles.gridTh}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ipAnalytics.slice(0, 20).map((ip, i) => (
                    <tr key={ip.ip} style={{ background: i % 2 === 0 ? "#fff" : "#f7f7f7" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#dce9ff")}
                      onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#f7f7f7")}>
                      <td style={{ ...erpStyles.gridTd, fontFamily: "monospace", fontWeight: 700, color: ip.isBlocked ? "#cc0000" : "#2255cc" }}>
                        {ip.ip}
                      </td>
                      <td style={{ ...erpStyles.gridTd, fontWeight: 700, textAlign: "center" }}>{ip.count}</td>
                      <td style={{ ...erpStyles.gridTd, textAlign: "center" }}>{ip.users}</td>
                      <td style={{ ...erpStyles.gridTd, fontSize: 11 }}>{ip.topAction}</td>
                      <td style={erpStyles.gridTd}>
                        {ip.isBlocked
                          ? <span style={erpStyles.statusChip("block")}>blocked</span>
                          : <span style={erpStyles.statusChip("active")}>allowed</span>}
                      </td>
                    </tr>
                  ))}
                  {ipAnalytics.length === 0 && (
                    <tr><td colSpan={5} style={{ padding: 20, textAlign: "center", color: "#888" }}>No IP activity data</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Summary Stats */}
            <div>
              <div style={{ background: "#fff", border: "1px solid #ccc", padding: 12, marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: "#1a3580", marginBottom: 10, borderBottom: "1px solid #ddd", paddingBottom: 6 }}>
                  🛡️ Access Control Summary
                </div>
                {[
                  { label: "Total Rules", val: rules.length, col: "#1a1a1a" },
                  { label: "Active Allow Rules", val: rules.filter(r => r.rule_type === "allow" && r.is_active).length, col: "#007700" },
                  { label: "Active Block Rules", val: rules.filter(r => r.rule_type === "block" && r.is_active).length, col: "#cc0000" },
                  { label: "Monitor Rules", val: rules.filter(r => r.rule_type === "monitor" && r.is_active).length, col: "#cc6600" },
                  { label: "Disabled Rules", val: rules.filter(r => !r.is_active).length, col: "#888" },
                  { label: "Expired Rules", val: rules.filter(r => r.expires_at && new Date(r.expires_at) < new Date()).length, col: "#cc0000" },
                  { label: "Total IP Log Entries", val: auditLogs.length, col: "#2255cc" },
                  { label: "Unique Tracked IPs", val: ipAnalytics.length, col: "#1a3580" },
                ].map(row => (
                  <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #f0f0f0", fontSize: 12 }}>
                    <span style={{ color: "#555" }}>{row.label}</span>
                    <span style={{ fontWeight: 700, color: row.col }}>{row.val}</span>
                  </div>
                ))}
              </div>

              {/* Quick Actions */}
              <div style={{ background: "#fff", border: "1px solid #ccc", padding: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: "#1a3580", marginBottom: 10, borderBottom: "1px solid #ddd", paddingBottom: 6 }}>
                  ⚡ Quick Actions
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <button onClick={() => { setTab("rules"); setShowNew(true); setForm(p => ({ ...p, rule_type: "block" })); }}
                    style={{ ...erpStyles.btn(false), justifyContent: "flex-start", color: "#cc0000", border: "1px solid #cc000044" }}>
                    🚫 Block an IP Address
                  </button>
                  <button onClick={() => { setTab("rules"); setShowNew(true); setForm(p => ({ ...p, rule_type: "allow" })); }}
                    style={{ ...erpStyles.btn(false), justifyContent: "flex-start", color: "#007700", border: "1px solid #00770044" }}>
                    ✅ Whitelist an IP
                  </button>
                  <button onClick={exportRules}
                    style={{ ...erpStyles.btn(false), justifyContent: "flex-start" }}>
                    📤 Export All Rules
                  </button>
                  <button onClick={fetchAll}
                    style={{ ...erpStyles.btn(false), justifyContent: "flex-start" }}>
                    ↻ Refresh All Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#e0e0e0", borderTop: "1px solid #aaa", padding: "2px 10px", fontSize: 11, color: "#555", display: "flex", gap: 16 }}>
        <span>Rules: {rules.length}</span>
        <span>|</span>
        <span>Blocked IPs: {rules.filter(r => r.rule_type === "block" && r.is_active).length}</span>
        <span>|</span>
        <span>Active Sessions: {sessions.filter(s => s.is_active).length}</span>
        <span style={{ marginLeft: "auto" }}>EL5 MediProcure v10 · IP Access Control</span>
      </div>
    </div>
  );
}

