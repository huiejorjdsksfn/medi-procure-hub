/**
 * ProcurBosse - IP Access Control & Realtime User Activity Monitor v5.0
 * Live IP logging · Geo data · Device/browser fingerprint · User profiles
 * Full user session timeline · Block/allow rules · Network whitelist CRUD
 * EL5 MediProcure - Embu Level 5 Hospital
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { toast } from "@/hooks/use-toast";
import { T } from "@/lib/theme";
import { getClientIp, getIpGeo, detectNetworkType, parseUserAgent, logAccess } from "@/lib/ipRestriction";
import {
  Shield, Plus, Trash2, RefreshCw, Globe, Save, Activity,
  Monitor, MapPin, Clock, Users, Network, Radio, TrendingUp,
  Ban, X, Check, Database, Signal, Smartphone, Laptop,
  Zap, Search,
} from "lucide-react";

const db = supabase as any;

/* ── Styles ── */
const card: React.CSSProperties = {
  background: T.card, border: `1px solid ${T.border}`,
  borderRadius: T.rLg, padding: "16px 20px",
};
const inp: React.CSSProperties = {
  width: "100%", background: T.bg, border: `1px solid ${T.border}`,
  borderRadius: T.r, padding: "8px 12px", color: T.fg,
  fontSize: 13, outline: "none", boxSizing: "border-box",
};
const btn = (bg: string, bd?: string): React.CSSProperties => ({
  display: "inline-flex", alignItems: "center", gap: 7,
  padding: "8px 14px", background: bg,
  color: bd ? T.fgMuted : "#fff",
  border: `1px solid ${bd || "transparent"}`,
  borderRadius: T.r, fontSize: 12, fontWeight: 700, cursor: "pointer",
});
const chip = (col: string): React.CSSProperties => ({
  display: "inline-flex", alignItems: "center", gap: 4,
  padding: "2px 8px", borderRadius: 99, fontSize: 9, fontWeight: 700,
  background: col + "20", color: col, border: `1px solid ${col}44`,
});

const Pulse = ({ color = T.success }: { color?: string }) => (
  <span style={{ position: "relative", display: "inline-flex", width: 8, height: 8 }}>
    <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: color, opacity: .4, animation: "ping 1.5s infinite" }} />
    <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "block" }} />
  </span>
);

const DeviceIcon = ({ ua }: { ua: string }) => {
  const { device } = parseUserAgent(ua || "");
  const Icon = device === "Mobile" ? Smartphone : Laptop;
  return <Icon size={12} color={T.fgDim} />;
};

function netColor(n: string) {
  return n === "public" ? T.primary : n === "private" ? "#7c3aed" : T.fgDim;
}

const fmt = (s: string) => new Date(s).toLocaleString("en-KE", {
  timeZone: "Africa/Nairobi", day: "2-digit", month: "short",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
});
const fmtAgo = (s: string) => {
  const d = Date.now() - new Date(s).getTime();
  if (d < 60000)    return `${Math.floor(d / 1000)}s ago`;
  if (d < 3600000)  return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
};
const fmtDate = (s: string | null) => s
  ? new Date(s).toLocaleDateString("en-KE", { timeZone: "Africa/Nairobi" }) : "—";

type Tab = "monitor" | "users" | "whitelist" | "logs" | "settings";

/* ════════════════════════════════════════════════════════ */
export default function IpAccessPage() {
  const { user } = useAuth();
  const { get }  = useSystemSettings();

  const [tab, setTab]             = useState<Tab>("monitor");
  const [whitelist, setWhitelist] = useState<any[]>([]);
  const [logs, setLogs]           = useState<any[]>([]);
  const [profiles, setProfiles]   = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [search, setSearch]       = useState("");
  const [form, setForm]           = useState({ label: "", cidr: "", type: "private", notes: "", active: true });

  const [myIP, setMyIP]           = useState("");
  const [myGeo, setMyGeo]         = useState<any>(null);
  const [myPrivIPs, setMyPrivIPs] = useState<string[]>([]);
  const [detecting, setDetecting] = useState(false);

  const [rtEvents, setRtEvents]   = useState<any[]>([]);
  const [activeIPs, setActiveIPs] = useState<Map<string, any>>(new Map());
  const [stats, setStats]         = useState({ total: 0, blocked: 0, allowed: 0, unique: 0 });
  const logRef                    = useRef<HTMLDivElement>(null);

  const profileMap = useMemo(() => {
    const m: Record<string, any> = {};
    profiles.forEach(p => { m[p.id] = p; });
    return m;
  }, [profiles]);

  /* ── Load ── */
  const load = useCallback(async () => {
    setLoading(true);
    const [wl, lg, pr] = await Promise.all([
      db.from("network_whitelist").select("*").order("active", { ascending: false }).order("created_at"),
      db.from("ip_access_log").select("*").order("created_at", { ascending: false }).limit(1000),
      db.from("profiles").select("id,full_name,email,role,department,is_active,is_locked,last_ip,last_login,last_seen,failed_logins,phone_number,created_at").limit(500),
    ]);
    setWhitelist(wl.data || []);
    const logData: any[] = lg.data || [];
    setLogs(logData);
    setProfiles(pr.data || []);
    const blocked = logData.filter(l => !l.allowed).length;
    setStats({ total: logData.length, blocked, allowed: logData.length - blocked, unique: new Set(logData.map(l => l.ip_address)).size });
    const cutoff = new Date(Date.now() - 30 * 60_000).toISOString();
    const ipMap  = new Map<string, any>();
    logData.filter(l => l.created_at > cutoff).forEach(l => {
      if (!ipMap.has(l.ip_address) || l.created_at > ipMap.get(l.ip_address).created_at)
        ipMap.set(l.ip_address, l);
    });
    setActiveIPs(ipMap);
    setLoading(false);
  }, []);

  /* ── Detect my IPs ── */
  const detectMyIPs = useCallback(async () => {
    setDetecting(true);
    const ip  = await getClientIp();
    const geo = await getIpGeo(ip);
    setMyIP(ip); setMyGeo(geo);
    try {
      const ips: string[] = [];
      const pc  = new (window as any).RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel("");
      await pc.createOffer().then((o: any) => pc.setLocalDescription(o));
      await new Promise<void>(res => {
        pc.onicecandidate = (e: any) => {
          if (e?.candidate?.candidate) {
            const m = e.candidate.candidate.match(/(\d{1,3}(\.\d{1,3}){3})/);
            if (m && !ips.includes(m[1])) ips.push(m[1]);
          } else res();
        };
        setTimeout(res, 2000);
      });
      pc.close();
      setMyPrivIPs(ips.length ? ips : ["127.0.0.1"]);
    } catch { setMyPrivIPs(["127.0.0.1"]); }
    await logAccess(ip, detectNetworkType(ip), true, "ip_monitor_view", user?.id, user?.email, geo);
    setDetecting(false);
  }, [user]);

  useEffect(() => { load(); detectMyIPs(); }, [load, detectMyIPs]);

  /* ── Realtime ── */
  useEffect(() => {
    const ch = db.channel("ip:rt:v3")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ip_access_log" }, (p: any) => {
        const row = { ...p.new, _new: true };
        setRtEvents(prev => [row, ...prev.slice(0, 99)]);
        setLogs(prev => [row, ...prev.slice(0, 999)]);
        setStats(prev => ({ ...prev, total: prev.total + 1, blocked: !row.allowed ? prev.blocked + 1 : prev.blocked, allowed: row.allowed ? prev.allowed + 1 : prev.allowed }));
        setActiveIPs(prev => { const m = new Map(prev); m.set(row.ip_address, row); return m; });
        if (logRef.current) logRef.current.scrollTop = 0;
      })
      .subscribe();
    const iv = setInterval(load, 45_000);
    return () => { db.removeChannel(ch); clearInterval(iv); };
  }, [load]);

  /* ── CRUD ── */
  const saveRule   = async () => {
    if (!form.cidr.trim()) { toast({ title: "IP/CIDR required", variant: "destructive" }); return; }
    setSaving(true);
    await db.from("network_whitelist").insert({ ...form, created_at: new Date().toISOString(), created_by: user?.id });
    toast({ title: "Rule added" }); setShowForm(false);
    setForm({ label: "", cidr: "", type: "private", notes: "", active: true });
    setSaving(false); load();
  };
  const deleteRule = async (id: string) => { await db.from("network_whitelist").delete().eq("id", id); toast({ title: "Removed" }); load(); };
  const toggleRule = async (id: string, active: boolean) => { await db.from("network_whitelist").update({ active: !active }).eq("id", id); load(); };
  const blockIP    = async (ip: string) => {
    await db.from("network_whitelist").insert({
      cidr: ip, label: `Block ${ip}`, type: "blocked", active: true,
      notes: `Blocked by ${user?.email||"admin"} at ${new Date().toLocaleString("en-KE")}`,
      created_at: new Date().toISOString(), created_by: user?.id
    });
    toast({ title: `🚫 Blocked ${ip}`, variant: "destructive" });
    load();
  };
  const allowIP    = async (ip: string) => {
    await db.from("network_whitelist").insert({ cidr: ip, label: `Allow ${ip}`, type: "public", active: true, notes: `Allowed ${new Date().toLocaleString("en-KE")}`, created_at: new Date().toISOString(), created_by: user?.id });
    toast({ title: `Allowed ${ip}` }); load();
  };
  const unlockUser = async (userId: string) => { await db.from("profiles").update({ is_locked: false, failed_logins: 0 }).eq("id", userId); toast({ title: "User unlocked" }); load(); };

  const filteredLogs = search.trim()
    ? logs.filter(l => l.ip_address?.includes(search) || l.user_email?.toLowerCase().includes(search.toLowerCase()) || profileMap[l.user_id]?.full_name?.toLowerCase().includes(search.toLowerCase()) || l.city?.toLowerCase().includes(search.toLowerCase()) || l.country?.toLowerCase().includes(search.toLowerCase()))
    : logs;

  const TABS: { id: Tab; label: string; icon: any; count?: number }[] = [
    { id: "monitor",   label: "Live Monitor",  icon: Activity, count: activeIPs.size },
    { id: "users",     label: "User Sessions", icon: Users,    count: profiles.length },
    { id: "whitelist", label: "Rules",         icon: Shield,   count: whitelist.length },
    { id: "logs",      label: "Access Logs",   icon: Database, count: logs.length },
    { id: "settings",  label: "Settings",      icon: Monitor },
  ];

  return (
    <div style={{ padding: 20, minHeight: "100vh", background: T.bg }}>
      <style>{`
        @keyframes ping    { 0%{transform:scale(1);opacity:.6} 75%,100%{transform:scale(2.2);opacity:0} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(10px)} to{opacity:1;transform:translateX(0)} }
        @keyframes fadeIn  { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.4} }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <div style={{ width: 42, height: 42, borderRadius: 10, background: `linear-gradient(135deg,${T.primary},#7c3aed)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Shield size={20} color="#fff" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: T.fg }}>IP Access Control & Network Monitor</h1>
          <div style={{ fontSize: 11, color: T.fgDim, marginTop: 2 }}>Realtime IP logging · Geo detection · Device fingerprint · User activity</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={detectMyIPs} disabled={detecting} style={btn(T.bg, T.border)}>
            {detecting ? <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Globe size={13} />}
            {detecting ? "Detecting..." : "Detect My IP"}
          </button>
          <button onClick={load} style={btn(T.bg, T.border)}><RefreshCw size={13} /> Refresh</button>
          <button onClick={() => setShowForm(true)} style={btn(T.primary)}><Plus size={13} /> Add Rule</button>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 16 }}>
        {[
          { label: "Total Logged", value: stats.total,    color: T.fg,      icon: Database },
          { label: "Allowed",      value: stats.allowed,  color: T.success,  icon: Check },
          { label: "Blocked",      value: stats.blocked,  color: T.error,    icon: Ban },
          { label: "Unique IPs",   value: stats.unique,   color: T.primary,  icon: Globe },
          { label: "Active (30m)", value: activeIPs.size, color: "#f59e0b",  icon: Zap },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} style={{ ...card, padding: "12px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <Icon size={14} color={color} />
              <span style={{ fontSize: 10, fontWeight: 700, color: T.fgDim, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, color, fontFamily: "monospace" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* My IP banner */}
      {myIP && (
        <div style={{ ...card, marginBottom: 16, borderColor: T.primary + "44", background: `linear-gradient(135deg,${T.card},${T.primary}08)` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Pulse color={T.success} />
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: T.fgDim, textTransform: "uppercase", letterSpacing: "0.1em" }}>Your Public IP</div>
                <code style={{ fontSize: 22, fontWeight: 900, color: T.primary, fontFamily: "monospace" }}>{myIP}</code>
              </div>
            </div>
            {myGeo && (
              <div style={{ fontSize: 12, color: T.fgMuted, display: "flex", gap: 16, flexWrap: "wrap" }}>
                <span><MapPin size={11} style={{ verticalAlign: "middle", marginRight: 4 }} />{[myGeo.city, myGeo.country].filter(Boolean).join(", ")}</span>
                {myGeo.org && <span><Signal size={11} style={{ verticalAlign: "middle", marginRight: 4 }} />{myGeo.org}</span>}
                {myGeo.lat && <span>📍 {myGeo.lat?.toFixed(3)}, {myGeo.lon?.toFixed(3)}</span>}
              </div>
            )}
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <button onClick={() => allowIP(myIP)} style={{ ...btn(T.successBg, T.success), color: T.success, padding: "5px 12px", fontSize: 11 }}><Check size={11} /> Allow</button>
              <button onClick={() => blockIP(myIP)} style={{ ...btn(T.errorBg, T.error), color: T.error, padding: "5px 12px", fontSize: 11 }}><Ban size={11} /> Block</button>
            </div>
          </div>
          {myPrivIPs.length > 0 && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.border}`, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 10, color: T.fgDim, fontWeight: 700 }}>PRIVATE / LOCAL:</span>
              {myPrivIPs.map(ip => (
                <span key={ip} style={{ ...chip("#7c3aed"), fontSize: 11, fontFamily: "monospace", gap: 6 }}>
                  {ip}
                  <button onClick={() => allowIP(ip)} style={{ background: "none", border: "none", cursor: "pointer", color: T.success, padding: 0, lineHeight: 1 }}><Check size={9} /></button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, marginBottom: 16, borderBottom: `1px solid ${T.border}` }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            display: "flex", alignItems: "center", gap: 7, padding: "9px 16px",
            background: "transparent", border: "none",
            borderBottom: `2px solid ${tab === t.id ? T.primary : "transparent"}`,
            color: tab === t.id ? T.primary : T.fgMuted,
            fontSize: 12, fontWeight: 700, cursor: "pointer",
          }}>
            <t.icon size={13} />
            {t.label}
            {t.count !== undefined && <span style={{ ...chip(tab === t.id ? T.primary : T.fgDim), fontSize: 9, padding: "1px 6px" }}>{t.count}</span>}
          </button>
        ))}
      </div>

      {/* ── MONITOR ── */}
      {tab === "monitor" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 14 }}>
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Pulse color={T.success} />
              <span style={{ fontWeight: 800, fontSize: 14, color: T.fg }}>Active IPs — last 30 min</span>
              <span style={chip(T.success)}>{activeIPs.size} online</span>
            </div>
            {activeIPs.size === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: T.fgDim }}>
                <Activity size={32} style={{ display: "block", margin: "0 auto 10px" }} />No recent activity
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                    {["IP Address", "Network", "User", "Location", "Device", "Last Seen", "Status", "Actions"].map(h => (
                      <th key={h} style={{ padding: "7px 10px", textAlign: "left", fontSize: 10, fontWeight: 700, color: T.fgDim }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...activeIPs.entries()].map(([ip, log]) => {
                    const net     = log.network || detectNetworkType(ip);
                    const profile = profileMap[log.user_id];
                    const { browser, os } = parseUserAgent(log.user_agent || "");
                    const isBlocked = whitelist.some(w => w.type === "blocked" && w.active && w.cidr === ip);
                    return (
                      <tr key={ip} style={{ borderBottom: `1px solid ${T.border}18` }}
                        onMouseEnter={e => (e.currentTarget.style.background = T.bg)}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                        <td style={{ padding: "8px 10px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                            <Pulse color={isBlocked ? T.error : T.success} />
                            <code style={{ fontSize: 12, fontFamily: "monospace" }}>{ip}</code>
                          </div>
                        </td>
                        <td style={{ padding: "8px 10px" }}><span style={chip(netColor(net))}>{net}</span></td>
                        <td style={{ padding: "8px 10px" }}>
                          <div style={{ fontWeight: 600, fontSize: 12, color: T.fg }}>{profile?.full_name || "—"}</div>
                          <div style={{ fontSize: 10, color: T.fgDim }}>{log.user_email || profile?.email || "—"}</div>
                        </td>
                        <td style={{ padding: "8px 10px", fontSize: 11, color: T.fgMuted }}>{[log.city, log.country].filter(Boolean).join(", ") || "—"}</td>
                        <td style={{ padding: "8px 10px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: T.fgMuted }}>
                            <DeviceIcon ua={log.user_agent || ""} />{browser}
                          </div>
                          <div style={{ fontSize: 9, color: T.fgDim }}>{os}</div>
                        </td>
                        <td style={{ padding: "8px 10px", fontSize: 10, color: T.fgDim }}>{fmtAgo(log.created_at)}</td>
                        <td style={{ padding: "8px 10px" }}><span style={chip(isBlocked ? T.error : T.success)}>{isBlocked ? "Blocked" : "Active"}</span></td>
                        <td style={{ padding: "8px 10px" }}>
                          {!isBlocked
                            ? <button onClick={() => blockIP(ip)} style={{ ...btn(T.errorBg, T.error), padding: "3px 8px", fontSize: 10, color: T.error }}><Ban size={10} /> Block</button>
                            : <button onClick={() => allowIP(ip)} style={{ ...btn(T.successBg, T.success), padding: "3px 8px", fontSize: 10, color: T.success }}><Check size={10} /> Allow</button>
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Live stream */}
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Radio size={14} color={T.accent} />
              <span style={{ fontWeight: 800, fontSize: 13, color: T.fg }}>Live Stream</span>
              <span style={{ ...chip(T.accent), animation: "pulse 2s infinite" }}>● LIVE</span>
            </div>
            <div ref={logRef} style={{ height: 520, overflowY: "auto", display: "flex", flexDirection: "column", gap: 5 }}>
              {(rtEvents.length ? rtEvents : logs.slice(0, 50)).map((log, i) => {
                const net     = log.network || detectNetworkType(log.ip_address || "");
                const profile = profileMap[log.user_id];
                const { browser } = parseUserAgent(log.user_agent || "");
                return (
                  <div key={i} style={{
                    padding: "8px 10px", borderRadius: 8,
                    background: log._new && i === 0 ? T.primary + "12" : T.bg,
                    border: `1px solid ${log._new && i === 0 ? T.primary + "44" : T.border}`,
                    animation: log._new && i === 0 ? "slideIn .25s" : undefined,
                  }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: log.allowed ? T.success : T.error, flexShrink: 0 }} />
                      <code style={{ fontSize: 11, fontFamily: "monospace", flex: 1, color: T.fg }}>{log.ip_address || "?"}</code>
                      <span style={{ fontSize: 9, color: netColor(net), fontWeight: 700 }}>{net}</span>
                      {!log.allowed && <span style={{ fontSize: 9, color: T.error, fontWeight: 700 }}>BLOCKED</span>}
                    </div>
                    <div style={{ fontSize: 11, color: T.fg, fontWeight: 600 }}>{profile?.full_name || log.user_email || "Anonymous"}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: T.fgDim, marginTop: 2 }}>
                      <span><DeviceIcon ua={log.user_agent || ""} />{" "}{browser} · {[log.city, log.country].filter(Boolean).join(", ") || "—"}</span>
                      <span>{fmtAgo(log.created_at)}</span>
                    </div>
                    {log.path && log.path !== "/" && <div style={{ fontSize: 9, color: T.fgDim, marginTop: 2, fontFamily: "monospace" }}>{log.path}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── USER SESSIONS ── */}
      {tab === "users" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
            {[
              { label: "Total Users",  value: profiles.length, color: T.primary },
              { label: "Active",       value: profiles.filter(p => p.is_active).length, color: T.success },
              { label: "Locked",       value: profiles.filter(p => p.is_locked).length, color: T.error },
              { label: "Online Today", value: profiles.filter(p => p.last_seen && (Date.now() - new Date(p.last_seen).getTime()) < 86400000).length, color: "#f59e0b" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ ...card, padding: "12px 16px" }}>
                <div style={{ fontSize: 10, color: T.fgDim, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
                <div style={{ fontSize: 28, fontWeight: 900, color, fontFamily: "monospace", marginTop: 4 }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <Users size={16} color={T.primary} />
              <span style={{ fontWeight: 800, fontSize: 14, color: T.fg }}>User Profiles & Session Data</span>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                <Search size={13} color={T.fgDim} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." style={{ ...inp, width: 200, padding: "6px 10px", fontSize: 12 }} />
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.border}`, background: T.bg }}>
                    {["User", "Role", "Department", "Last IP", "Location", "Last Login", "Last Seen", "Status", "Failed Logins", "Actions"].map(h => (
                      <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 10, fontWeight: 700, color: T.fgDim, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {profiles
                    .filter(p => !search || p.full_name?.toLowerCase().includes(search.toLowerCase()) || p.email?.toLowerCase().includes(search.toLowerCase()))
                    .map(p => {
                      const lastLog = logs.find(l => l.user_id === p.id);
                      const { browser } = parseUserAgent(lastLog?.user_agent || "");
                      const isOnline = p.last_seen && (Date.now() - new Date(p.last_seen).getTime()) < 5 * 60_000;
                      return (
                        <tr key={p.id} style={{ borderBottom: `1px solid ${T.border}18` }}
                          onMouseEnter={e => (e.currentTarget.style.background = T.bg)}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                          <td style={{ padding: "10px 10px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ width: 32, height: 32, borderRadius: "50%", background: T.primary + "22", border: `2px solid ${isOnline ? T.success : T.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative" }}>
                                <span style={{ fontSize: 13, fontWeight: 800, color: T.primary }}>{p.full_name?.[0]?.toUpperCase() || "?"}</span>
                                {isOnline && <span style={{ position: "absolute", bottom: -1, right: -1, width: 8, height: 8, borderRadius: "50%", background: T.success, border: "2px solid white" }} />}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: T.fg }}>{p.full_name}</div>
                                <div style={{ fontSize: 10, color: T.fgDim }}>{p.email}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "10px 10px" }}><span style={{ ...chip(T.primary), textTransform: "capitalize", fontSize: 10 }}>{p.role?.replace(/_/g, " ") || "—"}</span></td>
                          <td style={{ padding: "10px 10px", fontSize: 11, color: T.fgMuted }}>{p.department || "—"}</td>
                          <td style={{ padding: "10px 10px" }}>
                            <code style={{ fontSize: 11, fontFamily: "monospace", color: T.fg }}>{p.last_ip || "—"}</code>
                            {p.last_ip && <div><button onClick={() => blockIP(p.last_ip)} style={{ background: "none", border: "none", cursor: "pointer", color: T.error, fontSize: 9, padding: 0 }}><Ban size={9} /> Block</button></div>}
                          </td>
                          <td style={{ padding: "10px 10px", fontSize: 11, color: T.fgMuted }}>{[lastLog?.city, lastLog?.country].filter(Boolean).join(", ") || "—"}</td>
                          <td style={{ padding: "10px 10px", fontSize: 11, color: T.fgMuted, whiteSpace: "nowrap" }}>
                            {p.last_login ? fmtAgo(p.last_login) : "Never"}
                            <div style={{ fontSize: 9, color: T.fgDim }}>{fmtDate(p.last_login)}</div>
                          </td>
                          <td style={{ padding: "10px 10px", whiteSpace: "nowrap" }}>
                            {isOnline ? <span style={chip(T.success)}>● Online</span> : <span style={{ fontSize: 11, color: T.fgMuted }}>{p.last_seen ? fmtAgo(p.last_seen) : "—"}</span>}
                          </td>
                          <td style={{ padding: "10px 10px" }}>
                            <span style={chip(p.is_locked ? T.error : p.is_active ? T.success : T.fgDim)}>
                              {p.is_locked ? "🔒 Locked" : p.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td style={{ padding: "10px 10px", textAlign: "center" }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: (p.failed_logins || 0) > 2 ? T.error : T.fgDim }}>{p.failed_logins || 0}</span>
                          </td>
                          <td style={{ padding: "10px 10px" }}>
                            {p.is_locked && <button onClick={() => unlockUser(p.id)} style={{ ...btn(T.successBg, T.success), padding: "3px 8px", fontSize: 10, color: T.success }}><Check size={10} /> Unlock</button>}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── WHITELIST ── */}
      {tab === "whitelist" && (
        <div style={card}>
          <div style={{ fontWeight: 800, color: T.fg, fontSize: 14, marginBottom: 14 }}>Access Rules ({whitelist.length})</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}`, background: T.bg }}>
                {["Label", "IP / CIDR", "Type", "Active", "Notes", "Created", "Actions"].map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: T.fgDim }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {whitelist.map(w => {
                const tc = w.type === "blocked" ? T.error : w.type === "private" ? "#7c3aed" : T.success;
                return (
                  <tr key={w.id} style={{ borderBottom: `1px solid ${T.border}18` }}
                    onMouseEnter={e => (e.currentTarget.style.background = T.bg)}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <td style={{ padding: "9px 12px", fontWeight: 600, color: T.fg }}>{w.label || "—"}</td>
                    <td style={{ padding: "9px 12px" }}><code style={{ color: T.primary, fontFamily: "monospace" }}>{w.cidr}</code></td>
                    <td style={{ padding: "9px 12px" }}><span style={chip(tc)}>{w.type}</span></td>
                    <td style={{ padding: "9px 12px" }}>
                      <button onClick={() => toggleRule(w.id, w.active)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                        <span style={{ display: "inline-flex", width: 36, height: 20, borderRadius: 10, background: w.active ? T.success : T.border, alignItems: "center", padding: 2, transition: "background .2s" }}>
                          <span style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "transform .2s", transform: w.active ? "translateX(16px)" : "translateX(0)", boxShadow: "0 1px 2px rgba(0,0,0,.3)" }} />
                        </span>
                      </button>
                    </td>
                    <td style={{ padding: "9px 12px", fontSize: 11, color: T.fgDim, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.notes || "—"}</td>
                    <td style={{ padding: "9px 12px", fontSize: 10, color: T.fgDim, whiteSpace: "nowrap" }}>{fmtDate(w.created_at)}</td>
                    <td style={{ padding: "9px 12px" }}>
                      <button onClick={() => deleteRule(w.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: T.error, padding: 4 }}><Trash2 size={13} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── LOGS ── */}
      {tab === "logs" && (
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <Database size={16} color={T.primary} />
            <span style={{ fontWeight: 800, fontSize: 14, color: T.fg }}>Access Log</span>
            <span style={chip(T.primary)}>{filteredLogs.length} entries</span>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
              <Search size={13} color={T.fgDim} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter by IP, user, city..." style={{ ...inp, width: 220, padding: "6px 10px", fontSize: 12 }} />
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}`, background: T.bg }}>
                  {["Time (EAT)", "IP Address", "Network", "User", "Location", "Device", "Path", "Status", "Reason"].map(h => (
                    <th key={h} style={{ padding: "7px 10px", textAlign: "left", fontSize: 10, fontWeight: 700, color: T.fgDim, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredLogs.slice(0, 500).map((log, i) => {
                  const net     = log.network || detectNetworkType(log.ip_address || "");
                  const profile = profileMap[log.user_id];
                  const { browser, os } = parseUserAgent(log.user_agent || "");
                  return (
                    <tr key={i} style={{ borderBottom: `1px solid ${T.border}10` }}
                      onMouseEnter={e => (e.currentTarget.style.background = T.bg)}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <td style={{ padding: "5px 10px", color: T.fgDim, whiteSpace: "nowrap", fontSize: 10 }}>{fmt(log.created_at)}</td>
                      <td style={{ padding: "5px 10px" }}><code style={{ fontSize: 11, fontFamily: "monospace", color: T.fg }}>{log.ip_address || "—"}</code></td>
                      <td style={{ padding: "5px 10px" }}><span style={chip(netColor(net))}>{net}</span></td>
                      <td style={{ padding: "5px 10px", maxWidth: 130 }}>
                        <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile?.full_name || "—"}</div>
                        <div style={{ fontSize: 9, color: T.fgDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.user_email || "—"}</div>
                      </td>
                      <td style={{ padding: "5px 10px", fontSize: 10, color: T.fgMuted, whiteSpace: "nowrap" }}>{[log.city, log.country].filter(Boolean).join(", ") || "—"}</td>
                      <td style={{ padding: "5px 10px", fontSize: 10, color: T.fgMuted }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}><DeviceIcon ua={log.user_agent || ""} />{browser}</div>
                        <div style={{ fontSize: 9, color: T.fgDim }}>{os}</div>
                      </td>
                      <td style={{ padding: "5px 10px", fontSize: 9, color: T.fgDim, fontFamily: "monospace", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.path || "—"}</td>
                      <td style={{ padding: "5px 10px" }}><span style={chip(log.allowed ? T.success : T.error)}>{log.allowed ? "✓ OK" : "✗ Blocked"}</span></td>
                      <td style={{ padding: "5px 10px", fontSize: 9, color: T.fgDim, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={log.reason}>{log.reason || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SETTINGS ── */}
      {tab === "settings" && (
        <div style={{ maxWidth: 560 }}>
          <div style={card}>
            <div style={{ fontWeight: 800, color: T.fg, fontSize: 14, marginBottom: 16 }}>IP Restriction Settings</div>
            {[
              { key: "ip_restriction_enabled", label: "Enable IP Restriction",       desc: "Block IPs not in whitelist" },
              { key: "allow_all_private",       label: "Allow All Private IPs",       desc: "Auto-allow 10.x, 192.168.x, 172.16.x" },
              { key: "log_all_ips",             label: "Log All Access",              desc: "Record every access attempt" },
              { key: "revoke_on_ip_change",     label: "Revoke Session on IP Change", desc: "Force re-auth if IP changes mid-session" },
            ].map(({ key, label, desc }) => {
              const enabled = get(key, "false") === "true";
              return (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 0", borderBottom: `1px solid ${T.border}22` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.fg }}>{label}</div>
                    <div style={{ fontSize: 11, color: T.fgDim, marginTop: 2 }}>{desc}</div>
                  </div>
                  <button onClick={async () => {
                    await db.from("system_settings").upsert({ key, value: enabled ? "false" : "true", category: "security" }, { onConflict: "key" });
                    toast({ title: `${label}: ${enabled ? "Disabled" : "Enabled"}` });
                  }} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                    <span style={{ display: "inline-flex", width: 44, height: 24, borderRadius: 12, background: enabled ? T.success : T.border, alignItems: "center", padding: 2, transition: "background .2s" }}>
                      <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "transform .2s", transform: enabled ? "translateX(20px)" : "translateX(0)", boxShadow: "0 1px 3px rgba(0,0,0,.3)" }} />
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ADD RULE MODAL ── */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,.65)", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setShowForm(false)}>
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: T.rXl, padding: 28, width: 500, animation: "fadeIn .2s" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
              <span style={{ fontWeight: 800, fontSize: 15, color: T.fg }}>Add IP Rule</span>
              <button onClick={() => setShowForm(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: T.fgDim }}><X size={16} /></button>
            </div>
            {(myIP || myPrivIPs.length > 0) && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: T.fgDim, marginBottom: 6 }}>Quick-fill from detected IPs:</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {myIP && <button onClick={() => setForm(f => ({ ...f, cidr: myIP, label: `Public ${myIP}`, type: "public" }))} style={{ ...btn(T.primary), padding: "4px 10px", fontSize: 10 }}>{myIP}</button>}
                  {myPrivIPs.filter(ip => ip !== "127.0.0.1").map(ip => (
                    <button key={ip} onClick={() => setForm(f => ({ ...f, cidr: ip, label: `Private ${ip}`, type: "private" }))} style={{ ...btn("#7c3aed"), padding: "4px 10px", fontSize: 10 }}>{ip}</button>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={{ fontSize: 11, color: T.fgDim, display: "block", marginBottom: 4 }}>Label</label>
                <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} style={inp} placeholder="e.g. Hospital LAN" />
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={{ fontSize: 11, color: T.fgDim, display: "block", marginBottom: 4 }}>IP / CIDR *</label>
                <input value={form.cidr} onChange={e => setForm(f => ({ ...f, cidr: e.target.value }))} style={inp} placeholder="192.168.1.0/24 or 203.1.2.3" />
              </div>
              <div>
                <label style={{ fontSize: 11, color: T.fgDim, display: "block", marginBottom: 4 }}>Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={inp}>
                  <option value="private">Private (allow)</option>
                  <option value="public">Public (allow)</option>
                  <option value="blocked">Block</option>
                  <option value="vpn">VPN</option>
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 22 }}>
                <label style={{ fontSize: 11, color: T.fgDim }}>Active immediately</label>
                <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} style={{ width: 16, height: 16, accentColor: T.primary }} />
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={{ fontSize: 11, color: T.fgDim, display: "block", marginBottom: 4 }}>Notes</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={inp} placeholder="Optional" />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button onClick={() => setShowForm(false)} style={btn(T.bg, T.border)}>Cancel</button>
              <button onClick={saveRule} disabled={saving} style={btn(T.primary)}>
                {saving ? <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={13} />}
                {saving ? "Saving..." : "Add Rule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
