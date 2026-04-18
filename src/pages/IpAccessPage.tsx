/**
 * ProcurBosse v21.2 -- IP Access Control & Live Network Monitor
 * Real-time IP detection * Geo lookup * Whitelist/Blacklist CRUD * Activity feed
 * EL5 MediProcure | Embu Level 5 Hospital | Kenya
 * BUILD-SAFE: zero non-ASCII chars
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { T } from "@/lib/theme";
import {
  Shield, Plus, Trash2, RefreshCw, Globe, Wifi, Lock,
  AlertTriangle, Save, Activity, Monitor, Server, MapPin,
  Clock, Users, Network, Ban, X, Check, Signal, ChevronRight,
  Eye, Download, Unlock, Radio
} from "lucide-react";
import * as XLSX from "xlsx";

const db = supabase as any;

const S = {
  page: { background: T.bg, minHeight: "100%", fontFamily: "'Segoe UI','Inter',system-ui,sans-serif" } as React.CSSProperties,
  hdr:  { background: "#0369a1", padding: "0 24px", display: "flex", alignItems: "stretch", minHeight: 44, boxShadow: "0 2px 6px rgba(0,60,120,.3)" } as React.CSSProperties,
  bc:   { background: "#fff", padding: "7px 24px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.fgMuted } as React.CSSProperties,
  body: { padding: "16px 24px" } as React.CSSProperties,
  card: { background: "#fff", border: `1px solid ${T.border}`, borderRadius: T.rLg, boxShadow: "0 1px 4px rgba(0,0,0,.06)", overflow: "hidden", marginBottom: 16 } as React.CSSProperties,
  ch:   (col: string): React.CSSProperties => ({ padding: "11px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 8, background: col + "0a" }),
  inp:  { border: `1px solid ${T.border}`, borderRadius: T.r, padding: "7px 11px", fontSize: 13, outline: "none", background: "#fff", color: T.fg, fontFamily: "inherit", width: "100%", boxSizing: "border-box" as const } as React.CSSProperties,
  th:   { padding: "8px 12px", textAlign: "left" as const, fontSize: 10, fontWeight: 700, color: T.fgDim, borderBottom: `1px solid ${T.border}`, background: T.bg, whiteSpace: "nowrap" as const },
  td:   { padding: "8px 12px", fontSize: 12, color: T.fg, borderBottom: `1px solid ${T.border}18` },
};
const btn = (bg: string, fg = "white", bd?: string): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: bg, color: fg, border: `1px solid ${bd || bg}`, borderRadius: T.r, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" });
const badge = (col: string): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: col + "20", color: col, border: `1px solid ${col}44` });

/* ---- helpers ---- */
const IP_APIS = ["https://api.ipify.org?format=json", "https://api64.ipify.org?format=json"];
async function detectPublicIP(): Promise<string> {
  for (const url of IP_APIS) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
      const d = await r.json();
      if (d.ip && /^\d{1,3}(\.\d{1,3}){3}$|^[0-9a-f:]+$/i.test(d.ip)) return d.ip;
    } catch { /* try next */ }
  }
  return "";
}
async function geoLookup(ip: string): Promise<any> {
  try {
    const r = await fetch(`https://ipapi.co/${ip}/json/`, { signal: AbortSignal.timeout(5000) });
    return await r.json();
  } catch { return null; }
}
function classifyIP(ip: string): "public" | "private" | "loopback" {
  if (/^127\.|^::1$/.test(ip)) return "loopback";
  if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(ip)) return "private";
  return "public";
}

interface IPEntry {
  id: string; ip_address: string; type: "whitelist" | "blacklist"; label?: string;
  country?: string; city?: string; isp?: string; added_by?: string; created_at: string; notes?: string;
}
interface LogEntry {
  id: string; ip_address: string; country?: string; city?: string; action: string;
  user_id?: string; created_at: string; profiles?: { full_name: string };
}

export default function IpAccessPage() {
  const nav = useNavigate();
  const { user, profile } = useAuth();

  const [tab, setTab] = useState<"monitor" | "whitelist" | "blacklist" | "log">("monitor");
  const [myIP, setMyIP] = useState("");
  const [myGeo, setMyGeo] = useState<any>(null);
  const [ipLoading, setIpLoading] = useState(true);
  const [entries, setEntries] = useState<IPEntry[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [liveIPs, setLiveIPs] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  // Add form
  const [newIP, setNewIP] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newType, setNewType] = useState<"whitelist" | "blacklist">("whitelist");
  const [adding, setAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Lookup
  const [lookupIP, setLookupIP] = useState("");
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [looking, setLooking] = useState(false);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadEntries = useCallback(async () => {
    const { data } = await db.from("ip_whitelist").select("*").order("created_at", { ascending: false });
    setEntries(data || []);
  }, []);

  const loadLog = useCallback(async () => {
    const { data } = await db.from("ip_access_log")
      .select("*,profiles(full_name)").order("created_at", { ascending: false }).limit(100);
    setLog(data || []);
  }, []);

  const loadSessions = useCallback(async () => {
    const { data } = await db.from("user_sessions")
      .select("id,user_id,ip_address,started_at,last_seen_at,profiles(full_name,email)")
      .eq("is_active", true).order("last_seen_at", { ascending: false }).limit(30);
    setSessions(data || []);
    // Build unique live IPs from sessions
    const ipMap = new Map<string, any>();
    (data || []).forEach((s: any) => {
      if (s.ip_address && !ipMap.has(s.ip_address)) ipMap.set(s.ip_address, s);
    });
    setLiveIPs(Array.from(ipMap.values()));
  }, []);

  const detectMyIP = useCallback(async () => {
    setIpLoading(true);
    const ip = await detectPublicIP();
    if (ip) {
      setMyIP(ip);
      const geo = await geoLookup(ip);
      setMyGeo(geo);
      // Log the detection
      await db.from("ip_access_log").insert({
        ip_address: ip, action: "admin_view",
        user_id: user?.id, country: geo?.country_name, city: geo?.city,
        created_at: new Date().toISOString(),
      }).catch(() => {});
    }
    setIpLoading(false);
  }, [user?.id]);

  useEffect(() => {
    detectMyIP();
    loadEntries();
    loadLog();
    loadSessions();
    pollingRef.current = setInterval(() => { loadSessions(); loadLog(); }, 15000);
    const ch = db.channel("ip_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_sessions" }, loadSessions)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ip_access_log" }, loadLog)
      .subscribe();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      db.removeChannel(ch);
    };
  }, [detectMyIP, loadEntries, loadLog, loadSessions]);

  const addEntry = async () => {
    if (!newIP.trim()) { toast({ title: "IP address required", variant: "destructive" }); return; }
    setAdding(true);
    try {
      const geo = await geoLookup(newIP.trim());
      const { error } = await db.from("ip_whitelist").insert({
        ip_address: newIP.trim(), type: newType, label: newLabel || null,
        notes: newNotes || null, country: geo?.country_name || null,
        city: geo?.city || null, isp: geo?.org || null,
        added_by: user?.id, created_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast({ title: `IP ${newType === "whitelist" ? "whitelisted" : "blacklisted"}: ${newIP}` });
      setNewIP(""); setNewLabel(""); setNewNotes(""); setShowAddForm(false);
      loadEntries();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setAdding(false); }
  };

  const removeEntry = async (id: string, ip: string) => {
    await db.from("ip_whitelist").delete().eq("id", id);
    toast({ title: `Removed: ${ip}` });
    loadEntries();
  };

  const blockIP = async (ip: string) => {
    const { error } = await db.from("ip_whitelist").insert({
      ip_address: ip, type: "blacklist", label: "Admin blocked",
      added_by: user?.id, created_at: new Date().toISOString(),
    });
    if (!error) { toast({ title: `Blocked: ${ip}` }); loadEntries(); }
  };

  const doLookup = async () => {
    if (!lookupIP.trim()) return;
    setLooking(true);
    setLookupResult(null);
    const geo = await geoLookup(lookupIP.trim());
    setLookupResult(geo || { error: "No data found" });
    setLooking(false);
  };

  const exportLog = () => {
    const data = filteredLog.map(r => ({
      "IP Address": r.ip_address, "Country": r.country || "", "City": r.city || "",
      "Action": r.action, "User": r.profiles?.full_name || "",
      "Timestamp": new Date(r.created_at).toLocaleString("en-KE"),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "IP Log");
    XLSX.writeFile(wb, `ip_log_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const whitelist = entries.filter(e => e.type === "whitelist");
  const blacklist = entries.filter(e => e.type === "blacklist");
  const filteredLog = log.filter(r => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return r.ip_address.includes(q) || (r.country || "").toLowerCase().includes(q) || (r.city || "").toLowerCase().includes(q);
  });

  const TABS = [
    { id: "monitor",   label: "Live Monitor",  icon: Activity, col: "#0369a1" },
    { id: "whitelist", label: `Whitelist (${whitelist.length})`, icon: Check, col: T.success },
    { id: "blacklist", label: `Blacklist (${blacklist.length})`, icon: Ban,   col: T.error },
    { id: "log",       label: `Access Log (${log.length})`,      icon: Clock, col: "#374151" },
  ];

  return (
    <div style={S.page}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}} @keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>

      {/* Header */}
      <div style={S.hdr}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
          <Shield size={20} color="#fff" />
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#fff" }}>IP Access Control & Network Monitor</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,.5)" }}>Real-time IP monitoring | EL5 MediProcure</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 8px" }}>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,.5)" }}>{sessions.length} active sessions</span>
          <button onClick={() => { loadSessions(); loadLog(); loadEntries(); detectMyIP(); }} style={btn("rgba(255,255,255,.12)", "#fff", "rgba(255,255,255,.2)")}><RefreshCw size={13} />Refresh</button>
          <button onClick={() => nav("/dashboard")} style={btn("rgba(255,255,255,.07)", "#fff", "rgba(255,255,255,.12)")}>Dashboard</button>
        </div>
      </div>

      {/* Breadcrumb */}
      <div style={S.bc}>
        <span style={{ cursor: "pointer", color: T.primary }} onClick={() => nav("/dashboard")}>Home</span>
        <ChevronRight size={12} /><span>Admin</span><ChevronRight size={12} /><span style={{ fontWeight: 600 }}>IP Access Control</span>
      </div>

      <div style={S.body}>
        {/* My IP card */}
        <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: T.rLg, padding: 16, marginBottom: 16, display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" as const }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.fgMuted, marginBottom: 6 }}>YOUR CURRENT IP ADDRESS</div>
            {ipLoading ? (
              <div style={{ fontSize: 12, color: T.fgDim }}>Detecting...</div>
            ) : (
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#0369a1", fontFamily: "monospace" }}>{myIP || "Unknown"}</div>
                {myGeo && (
                  <div style={{ fontSize: 11, color: T.fgMuted, marginTop: 4 }}>
                    <span style={{ marginRight: 12 }}>{myGeo.country_name} {myGeo.country_code}</span>
                    <span style={{ marginRight: 12 }}>{myGeo.city}</span>
                    <span>{myGeo.org}</span>
                  </div>
                )}
                <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                  <span style={badge("#0369a1")}>{classifyIP(myIP)} IP</span>
                  {myGeo?.timezone && <span style={badge(T.fgDim)}>{myGeo.timezone}</span>}
                  <span style={badge(T.success)}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.success, display: "inline-block", animation: "pulse 2s infinite" }} />
                    Connected
                  </span>
                </div>
              </div>
            )}
          </div>
          {/* Live sessions summary */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            {[
              { l: "Active Sessions", v: sessions.length, c: "#0369a1" },
              { l: "Unique IPs", v: liveIPs.length, c: "#7719aa" },
              { l: "Blocked IPs", v: blacklist.length, c: T.error },
            ].map(k => (
              <div key={k.l} style={{ background: T.bg, borderRadius: T.r, padding: "10px 14px", textAlign: "center" as const }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: T.fgMuted }}>{k.l}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: k.c }}>{k.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 0, borderBottom: `2px solid ${T.border}`, marginBottom: 16 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: tab === t.id ? 700 : 400, color: tab === t.id ? t.col : T.fgMuted, borderBottom: `2px solid ${tab === t.id ? t.col : "transparent"}`, marginBottom: -2, transition: "all .12s" }}>
              <t.icon size={14} />{t.label}
            </button>
          ))}
          {/* IP Lookup */}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
            <input value={lookupIP} onChange={e => setLookupIP(e.target.value)} onKeyDown={e => e.key === "Enter" && doLookup()} placeholder="Lookup any IP..." style={{ ...S.inp, width: 160 }} />
            <button onClick={doLookup} disabled={looking} style={btn(looking ? T.fgDim : "#0369a1")}>{looking ? <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Globe size={13} />}Lookup</button>
          </div>
        </div>

        {/* Lookup result */}
        {lookupResult && (
          <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: T.rLg, padding: 16, marginBottom: 16, animation: "fadeIn .2s" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>Lookup: {lookupIP}</span>
              <button onClick={() => setLookupResult(null)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }}><X size={14} /></button>
            </div>
            {lookupResult.error ? (
              <div style={{ color: T.error, fontSize: 12 }}>{lookupResult.error}</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                {[["Country", lookupResult.country_name], ["City", lookupResult.city], ["Region", lookupResult.region], ["ISP", lookupResult.org], ["Timezone", lookupResult.timezone], ["Latitude", lookupResult.latitude], ["Longitude", lookupResult.longitude], ["Currency", lookupResult.currency]].map(([l, v]) => (
                  <div key={l} style={{ background: T.bg, borderRadius: T.r, padding: "8px 12px" }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: T.fgDim }}>{l}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.fg }}>{v || "-"}</div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
              <button onClick={() => blockIP(lookupIP)} style={btn(T.errorBg, T.error, T.error + "33")}><Ban size={12} />Block this IP</button>
              <button onClick={() => { setNewIP(lookupIP); setNewType("whitelist"); setShowAddForm(true); setTab("whitelist"); }} style={btn(T.successBg, T.success, T.success + "33")}><Check size={12} />Whitelist this IP</button>
            </div>
          </div>
        )}

        {/* MONITOR TAB */}
        {tab === "monitor" && (
          <div>
            <div style={S.card}>
              <div style={S.ch("#0369a1")}><Activity size={15} color="#0369a1" /><span style={{ fontWeight: 700, fontSize: 13 }}>Live Active Sessions ({sessions.length})</span></div>
              {sessions.length === 0 ? (
                <div style={{ padding: 30, textAlign: "center" as const, color: T.fgDim, fontSize: 12 }}>No active sessions right now</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr><th style={S.th}>User</th><th style={S.th}>IP Address</th><th style={S.th}>Type</th><th style={S.th}>Session Start</th><th style={S.th}>Last Seen</th><th style={S.th}>Actions</th></tr></thead>
                  <tbody>
                    {sessions.map((s: any) => (
                      <tr key={s.id} onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.bg} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}>
                        <td style={S.td}><div style={{ fontWeight: 600, fontSize: 12 }}>{s.profiles?.full_name || s.user_id?.slice(0, 8)}</div><div style={{ fontSize: 10, color: T.fgMuted }}>{s.profiles?.email}</div></td>
                        <td style={{ ...S.td, fontFamily: "monospace", fontSize: 11 }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block", animation: "pulse 2s infinite" }} />
                            {s.ip_address || "unknown"}
                          </span>
                        </td>
                        <td style={S.td}><span style={badge(s.ip_address ? "#0369a1" : T.fgDim)}>{s.ip_address ? classifyIP(s.ip_address) : "unknown"}</span></td>
                        <td style={{ ...S.td, fontSize: 11 }}>{s.started_at ? new Date(s.started_at).toLocaleString("en-KE") : "-"}</td>
                        <td style={{ ...S.td, fontSize: 11 }}>{s.last_seen_at ? new Date(s.last_seen_at).toLocaleString("en-KE") : "-"}</td>
                        <td style={S.td}>
                          <div style={{ display: "flex", gap: 6 }}>
                            {s.ip_address && <button onClick={() => blockIP(s.ip_address)} style={{ ...btn(T.errorBg, T.error, T.error + "33"), padding: "3px 8px", fontSize: 11 }}><Ban size={11} />Block</button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* WHITELIST TAB */}
        {tab === "whitelist" && (
          <div>
            <div style={{ marginBottom: 12, display: "flex", gap: 10 }}>
              <button onClick={() => setShowAddForm(!showAddForm)} style={btn(T.success)}><Plus size={14} />Add IP to Whitelist</button>
            </div>
            {showAddForm && (
              <div style={{ ...S.card, padding: 16, marginBottom: 16, animation: "fadeIn .2s" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div><label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.fgMuted, marginBottom: 4 }}>IP Address *</label><input value={newIP} onChange={e => setNewIP(e.target.value)} placeholder="e.g. 196.216.1.1" style={S.inp} /></div>
                  <div><label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.fgMuted, marginBottom: 4 }}>Label</label><input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="e.g. Admin Office" style={S.inp} /></div>
                  <div><label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.fgMuted, marginBottom: 4 }}>Type</label>
                    <select value={newType} onChange={e => setNewType(e.target.value as any)} style={S.inp}>
                      <option value="whitelist">Whitelist (Allow)</option>
                      <option value="blacklist">Blacklist (Block)</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}><label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.fgMuted, marginBottom: 4 }}>Notes</label><input value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="Optional notes" style={S.inp} /></div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={addEntry} disabled={adding} style={btn(adding ? T.fgDim : T.success)}>
                    {adding ? <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={13} />}
                    {adding ? "Adding..." : "Add IP"}
                  </button>
                  <button onClick={() => setShowAddForm(false)} style={btn("#fff", T.fg, T.border)}>Cancel</button>
                </div>
              </div>
            )}
            <div style={S.card}>
              <div style={S.ch(T.success)}><Check size={15} color={T.success} /><span style={{ fontWeight: 700, fontSize: 13 }}>Whitelisted IPs ({whitelist.length})</span></div>
              <IPTable entries={whitelist} onRemove={removeEntry} />
            </div>
          </div>
        )}

        {/* BLACKLIST TAB */}
        {tab === "blacklist" && (
          <div>
            <div style={{ marginBottom: 12, display: "flex", gap: 10 }}>
              <button onClick={() => { setNewType("blacklist"); setShowAddForm(true); setTab("whitelist"); }} style={btn(T.error)}><Ban size={14} />Add IP to Blacklist</button>
            </div>
            <div style={S.card}>
              <div style={S.ch(T.error)}><Ban size={15} color={T.error} /><span style={{ fontWeight: 700, fontSize: 13 }}>Blocked IPs ({blacklist.length})</span></div>
              <IPTable entries={blacklist} onRemove={removeEntry} />
            </div>
          </div>
        )}

        {/* LOG TAB */}
        {tab === "log" && (
          <div>
            <div style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "center" }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search IP, country, city..." style={{ ...S.inp, width: 280 }} />
              <span style={{ fontSize: 12, color: T.fgMuted }}>{filteredLog.length} records</span>
              <button onClick={exportLog} style={{ ...btn(T.success), marginLeft: "auto" }}><Download size={13} />Export Excel</button>
              <button onClick={() => { loadLog(); loadSessions(); }} style={btn(T.bg, T.fg, T.border)}><RefreshCw size={13} />Refresh</button>
            </div>
            <div style={S.card}>
              <div style={S.ch("#374151")}><Clock size={15} color="#374151" /><span style={{ fontWeight: 700, fontSize: 13 }}>Access Log</span></div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr><th style={S.th}>IP Address</th><th style={S.th}>Country</th><th style={S.th}>City</th><th style={S.th}>Action</th><th style={S.th}>User</th><th style={S.th}>Timestamp</th></tr></thead>
                  <tbody>
                    {filteredLog.length === 0 ? (
                      <tr><td colSpan={6} style={{ ...S.td, textAlign: "center" as const, padding: 30, color: T.fgDim }}>No log records</td></tr>
                    ) : filteredLog.map((r, i) => (
                      <tr key={r.id || i} onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.bg} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}>
                        <td style={{ ...S.td, fontFamily: "monospace", fontSize: 11 }}>{r.ip_address}</td>
                        <td style={S.td}>{r.country || "-"}</td>
                        <td style={S.td}>{r.city || "-"}</td>
                        <td style={S.td}><span style={badge(r.action === "blocked" ? T.error : r.action === "admin_view" ? "#0369a1" : T.success)}>{r.action || "access"}</span></td>
                        <td style={S.td}><span style={{ fontSize: 11 }}>{r.profiles?.full_name || "-"}</span></td>
                        <td style={{ ...S.td, fontSize: 11 }}>{new Date(r.created_at).toLocaleString("en-KE")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function IPTable({ entries, onRemove }: { entries: IPEntry[]; onRemove: (id: string, ip: string) => void }) {
  const S2 = {
    th: { padding: "8px 12px", textAlign: "left" as const, fontSize: 10, fontWeight: 700, color: T.fgDim, borderBottom: `1px solid ${T.border}`, background: T.bg },
    td: { padding: "8px 12px", fontSize: 12, color: T.fg, borderBottom: `1px solid ${T.border}18` },
  };
  if (entries.length === 0) return <div style={{ padding: 24, textAlign: "center" as const, color: T.fgDim, fontSize: 12 }}>No entries</div>;
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead><tr><th style={S2.th}>IP Address</th><th style={S2.th}>Label</th><th style={S2.th}>Country</th><th style={S2.th}>ISP</th><th style={S2.th}>Added</th><th style={S2.th}>Actions</th></tr></thead>
      <tbody>
        {entries.map(e => (
          <tr key={e.id} onMouseEnter={x => (x.currentTarget as HTMLElement).style.background = T.bg} onMouseLeave={x => (x.currentTarget as HTMLElement).style.background = ""}>
            <td style={{ ...S2.td, fontFamily: "monospace", fontSize: 11, fontWeight: 600 }}>{e.ip_address}</td>
            <td style={S2.td}>{e.label || "-"}</td>
            <td style={S2.td}>{e.country || "-"}</td>
            <td style={S2.td}><span style={{ fontSize: 11, color: T.fgMuted }}>{e.isp || "-"}</span></td>
            <td style={{ ...S2.td, fontSize: 11 }}>{new Date(e.created_at).toLocaleDateString("en-KE")}</td>
            <td style={S2.td}>
              <button onClick={() => onRemove(e.id, e.ip_address)} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", background: T.errorBg, border: `1px solid ${T.error}33`, borderRadius: T.r, cursor: "pointer", fontSize: 11, color: T.error, fontFamily: "inherit" }}>
                <Trash2 size={11} />Remove
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
