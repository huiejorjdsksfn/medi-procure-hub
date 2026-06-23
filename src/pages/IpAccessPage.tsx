/**
 * EL5 MediProcure — IP Access Control v3.0
 * Real-time data from ip_access_log + network_whitelist + audit_log
 * Embu Level 5 Hospital
 */
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import AdminBreadcrumb from "@/components/AdminBreadcrumb";
import {
  Shield, Globe, Lock, Unlock, Monitor, Smartphone, Laptop,
  Clock, CheckCircle, XCircle, RefreshCw, Download, Search,
  Trash2, Plus, Activity,
  Users, ShieldCheck, Signal, Network,
  Terminal,
} from "lucide-react";

const db = supabase as any;

type TabType = "overview" | "access_log" | "whitelist" | "monitor" | "analytics";

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

interface WhitelistEntry {
  id: string;
  cidr: string;
  label: string;
  active?: boolean | null;
  type?: string | null;
  notes?: string | null;
  created_at?: string | null;
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
  shadowHov:"0 6.4px 14.4px rgba(0,0,0,.132)",
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
  { id: "access_log",  label: "Access Log",  I: Clock     },
  { id: "whitelist",   label: "Whitelist",   I: ShieldCheck },
  { id: "monitor",     label: "Live Monitor",I: Terminal  },
  { id: "analytics",   label: "Analytics",   I: Activity  },
];

export default function IpAccessPage() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<TabType>("overview");
  const [accessLog, setAccessLog] = useState<AccessLogEntry[]>([]);
  const [whitelist, setWhitelist] = useState<WhitelistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [liveLog, setLiveLog] = useState<string[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newCidr, setNewCidr] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState("allow");
  const [newNotes, setNewNotes] = useState("");
  const liveRef = useRef<HTMLDivElement>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [logRes, wlRes] = await Promise.allSettled([
        db.from("ip_access_log").select("*").order("created_at", { ascending: false }).limit(500),
        db.from("network_whitelist").select("*").order("created_at", { ascending: false }).limit(200),
      ]);
      if (logRes.status === "fulfilled") setAccessLog(logRes.value.data || []);
      if (wlRes.status === "fulfilled") setWhitelist(wlRes.value.data || []);
    } catch (e) { console.error("Load error:", e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Auto-refresh every 20s
  useEffect(() => {
    const id = setInterval(() => {
      loadAll();
      setLiveLog(prev => [`${new Date().toLocaleTimeString("en-KE")} — Data refreshed`, ...prev.slice(0, 49)]);
    }, 20000);
    return () => clearInterval(id);
  }, [loadAll]);

  // Real-time subscriptions on actual tables
  useEffect(() => {
    const ch = db.channel("ip_access_control_v3")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ip_access_log" }, (payload: any) => {
        const row: AccessLogEntry = payload.new;
        setAccessLog(prev => [row, ...prev.slice(0, 499)]);
        const status = row.allowed ? "✅ ALLOWED" : "🚫 BLOCKED";
        const loc = [row.city, row.country].filter(Boolean).join(", ") || "Unknown";
        setLiveLog(prev => [
          `${new Date().toLocaleTimeString("en-KE")} — ${status} ${row.ip_address} | ${row.user_email || "anonymous"} | ${loc} | ${row.path || "/"}`,
          ...prev.slice(0, 49),
        ]);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "network_whitelist" }, () => loadAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadAll]);

  // Scroll live monitor
  useEffect(() => {
    if (liveRef.current) liveRef.current.scrollTop = 0;
  }, [liveLog]);

  const stats = useMemo(() => ({
    total:    accessLog.length,
    allowed:  accessLog.filter(e => e.allowed).length,
    blocked:  accessLog.filter(e => !e.allowed).length,
    uniqueIPs:[...new Set(accessLog.map(e => e.ip_address))].length,
    uniqueUsers:[...new Set(accessLog.map(e => e.user_email).filter(Boolean))].length,
    wlActive: whitelist.filter(w => w.active !== false).length,
    wlTotal:  whitelist.length,
    today:    accessLog.filter(e => e.created_at && new Date(e.created_at).toDateString() === new Date().toDateString()).length,
  }), [accessLog, whitelist]);

  const ipFrequency = useMemo(() => {
    const map: Record<string, { count: number; allowed: number; blocked: number; lastSeen?: string | null; user?: string | null; city?: string | null; country?: string | null }> = {};
    for (const e of accessLog) {
      if (!map[e.ip_address]) map[e.ip_address] = { count: 0, allowed: 0, blocked: 0, lastSeen: e.created_at, user: e.user_email, city: e.city, country: e.country };
      map[e.ip_address].count++;
      if (e.allowed) map[e.ip_address].allowed++;
      else map[e.ip_address].blocked++;
    }
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count);
  }, [accessLog]);

  const filteredLog = useMemo(() => {
    if (!search) return accessLog;
    const q = search.toLowerCase();
    return accessLog.filter(e =>
      e.ip_address.includes(q) ||
      (e.user_email?.toLowerCase() || "").includes(q) ||
      (e.city?.toLowerCase() || "").includes(q) ||
      (e.country?.toLowerCase() || "").includes(q) ||
      (e.reason?.toLowerCase() || "").includes(q)
    );
  }, [accessLog, search]);

  const filteredWhitelist = useMemo(() => {
    if (!search) return whitelist;
    const q = search.toLowerCase();
    return whitelist.filter(w =>
      w.cidr.includes(q) || (w.label?.toLowerCase() || "").includes(q) || (w.notes?.toLowerCase() || "").includes(q)
    );
  }, [whitelist, search]);

  async function addWhitelist() {
    if (!newCidr || !newLabel) { toast({ title: "CIDR and label required", variant: "destructive" }); return; }
    const { error } = await db.from("network_whitelist").insert({
      cidr: newCidr.trim(), label: newLabel.trim(),
      type: newType, notes: newNotes || null, active: true,
      added_by: profile?.id || null,
    });
    if (error) toast({ title: "Error: " + error.message, variant: "destructive" });
    else {
      toast({ title: `Added: ${newLabel} (${newCidr})` });
      setShowAddDialog(false);
      setNewCidr(""); setNewLabel(""); setNewNotes("");
      loadAll();
    }
  }

  async function toggleWhitelist(id: string, current: boolean | null) {
    const { error } = await db.from("network_whitelist").update({ active: !current, updated_by: profile?.id || null }).eq("id", id);
    if (!error) { toast({ title: `Entry ${!current ? "enabled" : "disabled"}` }); loadAll(); }
    else toast({ title: "Error", variant: "destructive" });
  }

  async function deleteWhitelist(id: string, label: string) {
    if (!window.confirm(`Remove "${label}" from whitelist?`)) return;
    const { error } = await db.from("network_whitelist").delete().eq("id", id);
    if (!error) { toast({ title: "Entry removed" }); loadAll(); }
    else toast({ title: "Error", variant: "destructive" });
  }

  function exportLog() {
    const rows = ["IP,User,City,Country,Status,Path,Time",
      ...filteredLog.map(e => `"${e.ip_address}","${e.user_email || ""}","${e.city || ""}","${e.country || ""}","${e.allowed ? "ALLOWED" : "BLOCKED"}","${e.path || ""}","${e.created_at || ""}"`)
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "ip_access_log.csv";
    a.click(); URL.revokeObjectURL(url);
    toast({ title: "Exported to CSV" });
  }

  return (
    <div style={{ background: D.bg, minHeight: "100vh", fontFamily: D.font, color: D.text }}>
      <AdminBreadcrumb />

      {/* Header bar */}
      <div style={{ background: D.card, borderBottom: `1px solid ${D.border}`, padding: "7px 20px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: D.radius, background: D.danger, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Shield size={15} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: D.text }}>IP Access Control</div>
            <div style={{ fontSize: 10, color: D.textMt }}>Network whitelist · Access logs · Real-time monitor</div>
          </div>
        </div>
        <div style={{ width: 1, height: 26, background: D.border }} />
        <button onClick={() => setShowAddDialog(true)}
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", background: D.blue, color: "#fff", border: "none", borderRadius: D.radius, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          <Plus size={12} /> Add to Whitelist
        </button>
        <button onClick={exportLog}
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search IPs, users, locations…"
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
            {/* KPI row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 8, marginBottom: 14 }}>
              {[
                { label: "Total Events",   val: stats.total,        color: D.blue,    bg: "#deecf9", I: Clock   },
                { label: "Allowed",        val: stats.allowed,      color: D.success, bg: D.successLt, I: CheckCircle },
                { label: "Blocked",        val: stats.blocked,      color: D.danger,  bg: D.dangerLt, I: XCircle },
                { label: "Unique IPs",     val: stats.uniqueIPs,    color: D.teal,    bg: D.tealLt,   I: Globe   },
                { label: "Unique Users",   val: stats.uniqueUsers,  color: D.purple,  bg: D.purpleLt, I: Users   },
                { label: "Today",          val: stats.today,        color: D.warn,    bg: D.warnLt,   I: Signal  },
                { label: "Whitelist",      val: stats.wlActive,     color: D.success, bg: D.successLt,I: ShieldCheck },
              ].map(k => (
                <div key={k.label} style={{ ...cs(), padding: "12px 14px", borderTop: `3px solid ${k.color}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ width: 22, height: 22, borderRadius: D.radius, background: k.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <k.I size={11} color={k.color} />
                    </div>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: k.color, lineHeight: 1, marginBottom: 4 }}>
                    {loading ? "—" : k.val}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: D.text, textTransform: "uppercase", letterSpacing: ".04em" }}>{k.label}</div>
                </div>
              ))}
            </div>

            {/* Top IPs table */}
            <div style={cs()}>
              <div style={{ padding: "11px 16px", borderBottom: `1px solid ${D.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: D.text }}>Top IP Addresses</span>
                <span style={{ fontSize: 11, color: D.textMt }}>{ipFrequency.length} unique IPs</span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: D.bg }}>
                      {["IP Address", "Total", "Allowed", "Blocked", "Block%", "Location", "User", "Last Seen"].map(h => (
                        <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: D.textSub, fontSize: 11, whiteSpace: "nowrap", borderBottom: `1px solid ${D.border}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ipFrequency.slice(0, 20).map(([ip, d]) => {
                      const blockPct = d.count > 0 ? Math.round((d.blocked / d.count) * 100) : 0;
                      return (
                        <tr key={ip} style={{ borderBottom: `1px solid ${D.border}` }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = D.bg; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ""; }}>
                          <td style={{ padding: "8px 12px", fontFamily: "monospace", fontWeight: 600, color: D.blue }}>{ip}</td>
                          <td style={{ padding: "8px 12px", fontWeight: 700 }}>{d.count}</td>
                          <td style={{ padding: "8px 12px", color: D.success, fontWeight: 600 }}>{d.allowed}</td>
                          <td style={{ padding: "8px 12px", color: d.blocked > 0 ? D.danger : D.textMt, fontWeight: d.blocked > 0 ? 700 : 400 }}>{d.blocked}</td>
                          <td style={{ padding: "8px 12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{ width: 50, height: 4, background: D.border, borderRadius: 99 }}>
                                <div style={{ width: `${blockPct}%`, height: 4, background: blockPct > 50 ? D.danger : blockPct > 20 ? D.warn : D.success, borderRadius: 99 }} />
                              </div>
                              <span style={{ fontSize: 10, color: blockPct > 50 ? D.danger : D.textMt }}>{blockPct}%</span>
                            </div>
                          </td>
                          <td style={{ padding: "8px 12px", color: D.textSub, fontSize: 11 }}>{[d.city, d.country].filter(Boolean).join(", ") || "—"}</td>
                          <td style={{ padding: "8px 12px", color: D.textMt, fontSize: 11, maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.user || "—"}</td>
                          <td style={{ padding: "8px 12px", color: D.textMt, fontSize: 11, whiteSpace: "nowrap" }}>{ago(d.lastSeen)}</td>
                        </tr>
                      );
                    })}
                    {ipFrequency.length === 0 && (
                      <tr><td colSpan={8} style={{ padding: "24px", textAlign: "center", color: D.textMt }}>No access log data yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ACCESS LOG */}
        {tab === "access_log" && (
          <div style={cs()}>
            <div style={{ padding: "11px 16px", borderBottom: `1px solid ${D.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: D.text }}>Access Log</span>
              <span style={{ fontSize: 11, color: D.textMt }}>{filteredLog.length.toLocaleString()} entries</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: D.bg }}>
                    {["Status", "IP Address", "User", "City", "Country", "Browser", "Path", "Reason", "Time"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: D.textSub, fontSize: 11, whiteSpace: "nowrap", borderBottom: `1px solid ${D.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredLog.slice(0, 200).map(e => (
                    <tr key={e.id} style={{ borderBottom: `1px solid ${D.border}` }}
                      onMouseEnter={ev => { (ev.currentTarget as HTMLElement).style.background = D.bg; }}
                      onMouseLeave={ev => { (ev.currentTarget as HTMLElement).style.background = ""; }}>
                      <td style={{ padding: "7px 12px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 7px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: e.allowed ? D.successLt : D.dangerLt, color: e.allowed ? D.success : D.danger }}>
                          {e.allowed ? <CheckCircle size={9} /> : <XCircle size={9} />}
                          {e.allowed ? "ALLOWED" : "BLOCKED"}
                        </span>
                      </td>
                      <td style={{ padding: "7px 12px", fontFamily: "monospace", color: D.blue, fontWeight: 600 }}>{e.ip_address}</td>
                      <td style={{ padding: "7px 12px", color: D.text, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.user_email || <span style={{ color: D.textMt }}>anonymous</span>}</td>
                      <td style={{ padding: "7px 12px", color: D.textSub }}>{e.city || "—"}</td>
                      <td style={{ padding: "7px 12px", color: D.textSub }}>{e.country || "—"}</td>
                      <td style={{ padding: "7px 12px", color: D.textMt }}><div style={{ display: "flex", alignItems: "center", gap: 4 }}><DeviceIcon ua={e.user_agent} /> {parseBrowser(e.user_agent)}</div></td>
                      <td style={{ padding: "7px 12px", color: D.textMt, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "monospace", fontSize: 11 }}>{e.path || "/"}</td>
                      <td style={{ padding: "7px 12px", color: D.textMt, fontSize: 11, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.reason || "—"}</td>
                      <td style={{ padding: "7px 12px", color: D.textMt, whiteSpace: "nowrap", fontSize: 11 }}>{ago(e.created_at)}</td>
                    </tr>
                  ))}
                  {filteredLog.length === 0 && (
                    <tr><td colSpan={9} style={{ padding: "32px", textAlign: "center", color: D.textMt }}>No entries match your search</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {filteredLog.length > 200 && (
              <div style={{ padding: "10px 16px", textAlign: "center", color: D.textMt, fontSize: 11, borderTop: `1px solid ${D.border}` }}>
                Showing 200 of {filteredLog.length} entries — export CSV for full data
              </div>
            )}
          </div>
        )}

        {/* WHITELIST */}
        {tab === "whitelist" && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
              <button onClick={() => setShowAddDialog(true)}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", background: D.blue, color: "#fff", border: "none", borderRadius: D.radius, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                <Plus size={12} /> Add Network
              </button>
            </div>
            <div style={cs()}>
              <div style={{ padding: "11px 16px", borderBottom: `1px solid ${D.border}` }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: D.text }}>Network Whitelist</span>
                <span style={{ fontSize: 11, color: D.textMt, marginLeft: 8 }}>{filteredWhitelist.length} entries · {stats.wlActive} active</span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: D.bg }}>
                      {["Status", "CIDR / IP", "Label", "Type", "Notes", "Added", "Actions"].map(h => (
                        <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: D.textSub, fontSize: 11, whiteSpace: "nowrap", borderBottom: `1px solid ${D.border}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWhitelist.map(w => (
                      <tr key={w.id} style={{ borderBottom: `1px solid ${D.border}`, opacity: w.active === false ? 0.5 : 1 }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = D.bg; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ""; }}>
                        <td style={{ padding: "8px 12px" }}>
                          <span style={{ padding: "2px 7px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: w.active !== false ? D.successLt : "#f0f0f0", color: w.active !== false ? D.success : D.textMt }}>
                            {w.active !== false ? "Active" : "Disabled"}
                          </span>
                        </td>
                        <td style={{ padding: "8px 12px", fontFamily: "monospace", fontWeight: 600, color: D.blue }}>{w.cidr}</td>
                        <td style={{ padding: "8px 12px", fontWeight: 600, color: D.text }}>{w.label}</td>
                        <td style={{ padding: "8px 12px" }}>
                          <span style={{ padding: "2px 7px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: w.type === "block" ? D.dangerLt : D.successLt, color: w.type === "block" ? D.danger : D.success }}>
                            {w.type || "allow"}
                          </span>
                        </td>
                        <td style={{ padding: "8px 12px", color: D.textMt, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.notes || "—"}</td>
                        <td style={{ padding: "8px 12px", color: D.textMt, whiteSpace: "nowrap", fontSize: 11 }}>{ago(w.created_at)}</td>
                        <td style={{ padding: "8px 12px" }}>
                          <div style={{ display: "flex", gap: 4 }}>
                            <button onClick={() => toggleWhitelist(w.id, w.active !== false)}
                              style={{ padding: "3px 8px", fontSize: 11, border: `1px solid ${D.borderMd}`, borderRadius: D.radius, cursor: "pointer", background: "transparent", color: D.text }}>
                              {w.active !== false ? <><Unlock size={10} /> Disable</> : <><Lock size={10} /> Enable</>}
                            </button>
                            <button onClick={() => deleteWhitelist(w.id, w.label)}
                              style={{ padding: "3px 7px", fontSize: 11, border: `1px solid ${D.dangerLt}`, borderRadius: D.radius, cursor: "pointer", background: D.dangerLt, color: D.danger }}>
                              <Trash2 size={10} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredWhitelist.length === 0 && (
                      <tr><td colSpan={7} style={{ padding: "32px", textAlign: "center", color: D.textMt }}>
                        No whitelist entries. <button onClick={() => setShowAddDialog(true)} style={{ color: D.blue, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Add one</button>
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* LIVE MONITOR */}
        {tab === "monitor" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 12 }}>
            <div style={cs()}>
              <div style={{ padding: "11px 16px", borderBottom: `1px solid ${D.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: D.text, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: D.success, display: "inline-block", animation: "pulse 2s infinite" }} />
                  Live Terminal
                </span>
                <button onClick={() => setLiveLog([])} style={{ fontSize: 11, color: D.textMt, background: "none", border: "none", cursor: "pointer" }}>Clear</button>
              </div>
              <div ref={liveRef} style={{ background: "#0d1117", minHeight: 400, maxHeight: 600, overflowY: "auto", padding: "14px 16px", fontFamily: "monospace", fontSize: 12 }}>
                {liveLog.length === 0 ? (
                  <div style={{ color: "#58a6ff" }}>
                    <div>$ Waiting for real-time events…</div>
                    <div style={{ color: "#3fb950", marginTop: 8 }}>▶ Connected to ip_access_log · network_whitelist</div>
                    <div style={{ color: "#e3b341", marginTop: 4 }}>ℹ New access events will appear here instantly</div>
                  </div>
                ) : liveLog.map((line, i) => (
                  <div key={i} style={{ color: line.includes("BLOCKED") ? "#f85149" : line.includes("ALLOWED") ? "#3fb950" : line.includes("refreshed") ? "#58a6ff" : "#c9d1d9", marginBottom: 3, borderBottom: "1px solid #21262d", paddingBottom: 3 }}>
                    {line}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={cs({ padding: "14px" })}>
                <div style={{ fontSize: 11, fontWeight: 700, color: D.textSub, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 10 }}>Live Statistics</div>
                {[
                  { l: "Events Today",    v: stats.today,      c: D.blue    },
                  { l: "Allowed Today",   v: accessLog.filter(e => e.allowed && e.created_at && new Date(e.created_at).toDateString() === new Date().toDateString()).length, c: D.success },
                  { l: "Blocked Today",   v: accessLog.filter(e => !e.allowed && e.created_at && new Date(e.created_at).toDateString() === new Date().toDateString()).length, c: D.danger },
                  { l: "Unique IPs",      v: stats.uniqueIPs,  c: D.teal    },
                  { l: "Active Users",    v: stats.uniqueUsers,c: D.purple  },
                ].map(s => (
                  <div key={s.l} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${D.border}` }}>
                    <span style={{ fontSize: 12, color: D.textSub }}>{s.l}</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: s.c }}>{s.v}</span>
                  </div>
                ))}
              </div>

              <div style={cs({ padding: "14px" })}>
                <div style={{ fontSize: 11, fontWeight: 700, color: D.textSub, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 10 }}>Recent Events</div>
                {accessLog.slice(0, 10).map(e => (
                  <div key={e.id} style={{ display: "flex", gap: 8, padding: "5px 0", borderBottom: `1px solid ${D.border}`, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 10, color: e.allowed ? D.success : D.danger, fontWeight: 700, flexShrink: 0 }}>{e.allowed ? "✅" : "🚫"}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontFamily: "monospace", color: D.blue, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.ip_address}</div>
                      <div style={{ fontSize: 10, color: D.textMt, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.user_email || "anonymous"}</div>
                    </div>
                    <span style={{ fontSize: 10, color: D.textMt, flexShrink: 0 }}>{ago(e.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ANALYTICS */}
        {tab === "analytics" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {/* Country breakdown */}
            <div style={cs()}>
              <div style={{ padding: "11px 16px", borderBottom: `1px solid ${D.border}` }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: D.text }}>Traffic by Country</span>
              </div>
              <div style={{ padding: "12px 16px" }}>
                {(() => {
                  const countryMap: Record<string, number> = {};
                  for (const e of accessLog) { const k = e.country || "Unknown"; countryMap[k] = (countryMap[k] || 0) + 1; }
                  const sorted = Object.entries(countryMap).sort((a, b) => b[1] - a[1]);
                  const total = accessLog.length || 1;
                  return sorted.slice(0, 10).map(([country, count]) => (
                    <div key={country} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
                        <span style={{ color: D.text, fontWeight: 500 }}>{country}</span>
                        <span style={{ color: D.textMt, fontSize: 11 }}>{count} ({Math.round(count / total * 100)}%)</span>
                      </div>
                      <div style={{ height: 4, background: D.border, borderRadius: 99 }}>
                        <div style={{ height: 4, background: D.blue, borderRadius: 99, width: `${(count / total) * 100}%` }} />
                      </div>
                    </div>
                  ));
                })()}
                {accessLog.length === 0 && <div style={{ color: D.textMt, fontSize: 12, textAlign: "center", padding: "20px 0" }}>No data yet</div>}
              </div>
            </div>

            {/* Block/allow ratio by day */}
            <div style={cs()}>
              <div style={{ padding: "11px 16px", borderBottom: `1px solid ${D.border}` }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: D.text }}>Daily Access Summary</span>
              </div>
              <div style={{ padding: "12px 16px" }}>
                {(() => {
                  const dayMap: Record<string, { allowed: number; blocked: number }> = {};
                  for (const e of accessLog) {
                    if (!e.created_at) continue;
                    const day = new Date(e.created_at).toLocaleDateString("en-KE", { day: "2-digit", month: "short" });
                    if (!dayMap[day]) dayMap[day] = { allowed: 0, blocked: 0 };
                    if (e.allowed) dayMap[day].allowed++;
                    else dayMap[day].blocked++;
                  }
                  return Object.entries(dayMap).slice(0, 7).map(([day, d]) => (
                    <div key={day} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
                        <span style={{ color: D.text, fontWeight: 500 }}>{day}</span>
                        <span style={{ fontSize: 11 }}>
                          <span style={{ color: D.success }}>{d.allowed} allowed</span>
                          {d.blocked > 0 && <span style={{ color: D.danger, marginLeft: 8 }}>{d.blocked} blocked</span>}
                        </span>
                      </div>
                      <div style={{ display: "flex", height: 5, borderRadius: 99, overflow: "hidden", background: D.border }}>
                        <div style={{ height: 5, background: D.success, width: `${(d.allowed / (d.allowed + d.blocked)) * 100}%` }} />
                        <div style={{ height: 5, background: D.danger, width: `${(d.blocked / (d.allowed + d.blocked)) * 100}%` }} />
                      </div>
                    </div>
                  ));
                })()}
                {accessLog.length === 0 && <div style={{ color: D.textMt, fontSize: 12, textAlign: "center", padding: "20px 0" }}>No data yet</div>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Whitelist Dialog */}
      {showAddDialog && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: D.card, borderRadius: "8px", boxShadow: "0 24px 48px rgba(0,0,0,.25)", width: 400, padding: 24 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: D.text, marginBottom: 16 }}>Add to Network Whitelist</div>
            {[
              { label: "CIDR / IP Address *", val: newCidr, set: setNewCidr, ph: "e.g. 192.168.1.0/24 or 10.0.0.1" },
              { label: "Label *",             val: newLabel, set: setNewLabel, ph: "e.g. Hospital LAN" },
              { label: "Notes",               val: newNotes, set: setNewNotes, ph: "Optional notes" },
            ].map(f => (
              <div key={f.label} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: D.textSub, marginBottom: 4 }}>{f.label}</div>
                <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                  style={{ width: "100%", padding: "7px 10px", border: `1px solid ${D.borderMd}`, borderRadius: D.radius, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: D.font }} />
              </div>
            ))}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: D.textSub, marginBottom: 4 }}>Type</div>
              <select value={newType} onChange={e => setNewType(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", border: `1px solid ${D.borderMd}`, borderRadius: D.radius, fontSize: 13, outline: "none", fontFamily: D.font }}>
                <option value="allow">Allow</option>
                <option value="block">Block</option>
                <option value="monitor">Monitor</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => { setShowAddDialog(false); setNewCidr(""); setNewLabel(""); setNewNotes(""); }}
                style={{ padding: "7px 14px", border: `1px solid ${D.borderMd}`, borderRadius: D.radius, fontSize: 12, cursor: "pointer", background: "transparent", color: D.text }}>Cancel</button>
              <button onClick={addWhitelist}
                style={{ padding: "7px 14px", background: D.blue, color: "#fff", border: "none", borderRadius: D.radius, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Add Entry</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.4 } }
      `}</style>
    </div>
  );
}
