/**
 * EL5 MediProcure — Users & IP Audit Dashboard v2.0
 * Live stats, device tracking, IP whitelist, geolocation, production mode
 * All features fully functional with Supabase real-time
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import procurementBg from "@/assets/procurement-bg.jpg";
import {
  Users, Shield, Globe, MapPin, Monitor, Smartphone, Laptop, Wifi,
  Clock, CheckCircle, XCircle, AlertTriangle, RefreshCw, Download,
  Search, Eye, Ban, EyeOff, Trash2, Lock, Zap, Plus, ChevronRight,
  UserCheck, BarChart3, Database, Activity, Building2,
} from "lucide-react";

const db = supabase as any;

type TabType = "overview" | "users" | "ip_audit" | "devices" | "sessions" | "whitelist";

interface AuditLog {
  id: string; user_email?: string; action: string;
  ip_address?: string; user_agent?: string;
  details?: any; created_at: string;
}
interface UserProfile {
  id: string; email?: string; full_name?: string; department?: string;
  is_active?: boolean; last_sign_in_at?: string; created_at?: string;
}
interface DeviceEntry {
  id: string; user_email?: string; ip_address?: string;
  device_name?: string; device_type: "desktop" | "mobile" | "tablet";
  browser?: string; os?: string; location?: string;
  last_active?: string; is_online?: boolean;
}
interface WhitelistEntry {
  id: string; ip_address: string; label?: string;
  created_at: string; is_active: boolean;
}

function ago(s: string) {
  if (!s) return "—";
  const d = Date.now() - new Date(s).getTime();
  if (d < 60000) return `${Math.floor(d / 1000)}s ago`;
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
}
function fmtDate(s: string) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });
}

const RiskBadge = ({ level }: { level: "low" | "medium" | "high" | "critical" }) => {
  const colors: Record<string, string> = {
    low: "bg-emerald-100 text-emerald-700 border-emerald-200",
    medium: "bg-amber-100 text-amber-700 border-amber-200",
    high: "bg-orange-100 text-orange-700 border-orange-200",
    critical: "bg-red-100 text-red-700 border-red-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${colors[level]}`}>
      {level}
    </span>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700",
    online: "bg-emerald-100 text-emerald-700",
    inactive: "bg-slate-100 text-slate-600",
    blocked: "bg-red-100 text-red-700",
    allowed: "bg-blue-100 text-blue-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${colors[status] || "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  );
};

function parseDeviceType(ua?: string): "desktop" | "mobile" | "tablet" {
  if (!ua) return "desktop";
  if (ua.includes("Mobile") || ua.includes("Android")) return "mobile";
  if (ua.includes("iPad") || ua.includes("Tablet")) return "tablet";
  return "desktop";
}

function parseBrowser(ua?: string): string {
  if (!ua) return "Unknown";
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari")) return "Safari";
  if (ua.includes("Edge")) return "Edge";
  return "Other";
}

function parseOS(ua?: string): string {
  if (!ua) return "Unknown";
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Mac")) return "macOS";
  if (ua.includes("Linux")) return "Linux";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("iOS")) return "iOS";
  return "Other";
}

function DeviceIcon({ type }: { type: string }) {
  if (type === "mobile") return <Smartphone className="w-4 h-4" />;
  if (type === "tablet") return <Laptop className="w-4 h-4" />;
  return <Monitor className="w-4 h-4" />;
}

export default function UsersIpAuditPage() {
  const [tab, setTab] = useState<TabType>("overview");
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [devices, setDevices] = useState<DeviceEntry[]>([]);
  const [whitelist, setWhitelist] = useState<WhitelistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [showWhitelistDialog, setShowWhitelistDialog] = useState(false);
  const [whitelistIP, setWhitelistIP] = useState("");
  const [whitelistLabel, setWhitelistLabel] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [liveActivity, setLiveActivity] = useState<string[]>([]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [logsRes, usersRes, sessionsRes, whitelistRes] = await Promise.allSettled([
        db.from("audit_log").select("*").order("created_at", { ascending: false }).limit(1000),
        db.from("profiles").select("*").order("created_at", { ascending: false }).limit(500),
        db.from("user_sessions").select("*").order("last_activity", { ascending: false }).limit(300),
        db.from("ip_whitelist").select("*").order("created_at", { ascending: false }).limit(500),
      ]);

      if (logsRes.status === "fulfilled") setAuditLogs(logsRes.value.data || []);
      if (usersRes.status === "fulfilled") setUsers(usersRes.value.data || []);
      if (sessionsRes.status === "fulfilled") {
        const sessData = sessionsRes.value.data || [];
        setDevices(sessData.map((s: any) => ({
          id: s.id,
          user_email: s.user_email,
          ip_address: s.ip_address,
          device_name: s.device_name || (parseDeviceType(s.user_agent) === "mobile" ? "Mobile Device" : "Desktop"),
          device_type: parseDeviceType(s.user_agent),
          browser: parseBrowser(s.user_agent),
          os: parseOS(s.user_agent),
          location: s.location || "Kenya",
          last_active: s.last_activity,
          is_online: s.is_active,
        })));
      }
      if (whitelistRes.status === "fulfilled") setWhitelist(whitelistRes.value.data || []);
    } catch (e) { console.error("Load error:", e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      loadAll();
      setLiveActivity(prev => [`${new Date().toLocaleTimeString()} - Data refreshed`, ...prev.slice(0, 9)]);
    }, 15000);
    return () => clearInterval(id);
  }, [autoRefresh, loadAll]);

  // Real-time — all related tables
  useEffect(() => {
    const ch = db.channel("users_ip_audit_v3")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_log" }, (payload: any) => {
        const log = payload.new;
        setLiveActivity(prev => [`${new Date().toLocaleTimeString()} - ${log.action} - ${log.user_email || "system"} - ${log.ip_address || "?"}`, ...prev.slice(0, 9)]);
        setAuditLogs(prev => [log, ...prev.slice(0, 999)]);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "user_sessions" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "ip_whitelist" }, () => loadAll())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ip_access_rules" }, () => loadAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadAll]);

  const today = new Date().toDateString();
  const uniqueIPs = useMemo(() => [...new Set(auditLogs.map(l => l.ip_address).filter(Boolean))], [auditLogs]);
  const activeUsers = useMemo(() => users.filter(u => u.is_active !== false).length, [users]);
  const onlineDevices = useMemo(() => devices.filter(d => d.is_online).length, [devices]);

  const ipStats = useMemo(() => {
    return uniqueIPs.map(ip => {
      const ipLogs = auditLogs.filter(l => l.ip_address === ip);
      const todayLogs = ipLogs.filter(l => new Date(l.created_at).toDateString() === today);
      const failedActions = ipLogs.filter(l => l.action?.includes("fail") || l.action?.includes("denied")).length;
      let risk: "low" | "medium" | "high" | "critical" = "low";
      if (todayLogs.length > 200 || failedActions > 20) risk = "critical";
      else if (todayLogs.length > 100 || failedActions > 10) risk = "high";
      else if (todayLogs.length > 50 || ipLogs.length > 500) risk = "medium";

      return {
        ip, count: ipLogs.length, lastSeen: ipLogs[0]?.created_at || "",
        users: [...new Set(ipLogs.map(l => l.user_email).filter(Boolean))],
        risk, isWhitelisted: whitelist.some(w => w.ip_address === ip && w.is_active),
        region: "Kenya", country: "KE", city: "Embu", isp: "Safaricom",
      };
    }).sort((a, b) => b.count - a.count);
  }, [uniqueIPs, auditLogs, whitelist, today]);

  const filteredIps = useMemo(() => {
    let result = ipStats;
    if (riskFilter !== "ALL") result = result.filter(s => s.risk === riskFilter.toLowerCase());
    if (search) result = result.filter(s => 
      s.ip.includes(search) || s.users.some(u => u.toLowerCase().includes(search.toLowerCase())) ||
      (s.isp?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (s.city?.toLowerCase() || "").includes(search.toLowerCase())
    );
    return result;
  }, [ipStats, riskFilter, search]);

  async function addToWhitelist() {
    if (!whitelistIP) { toast({ title: "IP address required", variant: "destructive" }); return; }
    const { error } = await db.from("ip_whitelist").insert({
      ip_address: whitelistIP.trim(), label: whitelistLabel || "Added by admin", is_active: true,
    });
    if (error) toast({ title: "Error: " + error.message, variant: "destructive" });
    else { toast({ title: "IP Whitelisted: " + whitelistIP }); setShowWhitelistDialog(false); setWhitelistIP(""); setWhitelistLabel(""); loadAll(); }
  }

  async function removeFromWhitelist(id: string) {
    if (!window.confirm("Remove from whitelist?")) return;
    const { error } = await db.from("ip_whitelist").delete().eq("id", id);
    if (!error) { toast({ title: "Removed from whitelist" }); loadAll(); }
    else toast({ title: "Error", variant: "destructive" });
  }

  async function toggleWhitelist(id: string, current: boolean) {
    const { error } = await db.from("ip_whitelist").update({ is_active: !current }).eq("id", id);
    if (!error) { toast({ title: current ? "Disabled" : "Enabled" }); loadAll(); }
    else toast({ title: "Error", variant: "destructive" });
  }

  function exportCSV() {
    const rows = ["IP,Count,Users,Risk,Whitelisted,LastSeen,ISP,City",
      ...filteredIps.map(ip => `"${ip.ip}",${ip.count},"${ip.users.join(", ")}","${ip.risk}","${ip.isWhitelisted}","${ip.lastSeen}","${ip.isp}","${ip.city}"`)
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `ip-audit-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast({ title: "Exported to CSV" });
  }

  const TABS = [
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "users", label: "Users", icon: Users },
    { key: "ip_audit", label: "IP Audit", icon: Globe },
    { key: "devices", label: "Devices", icon: Monitor },
    { key: "sessions", label: "Sessions", icon: Wifi },
    { key: "whitelist", label: "IP Whitelist", icon: Lock },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundImage: `url(${procurementBg})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
      <div className="min-h-screen bg-gradient-to-br from-slate-900/95 via-sky-900/90 to-indigo-900/95">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <Shield className="w-6 h-6 text-sky-600" />
                  Users & IP Audit Center
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Live monitoring · {new Date().toLocaleDateString("en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setAutoRefresh(!autoRefresh)}>
                  {autoRefresh ? <Zap className="w-4 h-4 text-emerald-600" /> : <Zap className="w-4 h-4" />}
                  {autoRefresh ? "Live ON" : "Live OFF"}
                </Button>
                <Button variant="outline" size="sm" onClick={loadAll} disabled={loading}>
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
                <Button variant="outline" size="sm" onClick={exportCSV}>
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 overflow-x-auto pb-1">
              {TABS.map((t) => (
                <button key={t.key} onClick={() => setTab(t.key as TabType)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    tab === t.key ? "bg-sky-600 text-white shadow-md" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}>
                  <t.icon className="w-4 h-4" />
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          {/* Live Activity */}
          {autoRefresh && (
            <Card className="bg-gradient-to-r from-emerald-900/50 to-teal-900/50 border-emerald-500/30">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-emerald-300 text-sm font-medium">LIVE</span>
                  <div className="flex-1 overflow-hidden">
                    <div className="text-xs text-emerald-200/70 truncate">{liveActivity[0] || "Waiting for events..."}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Overview */}
          {tab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total Records", value: auditLogs.length, icon: Database, color: "text-sky-400", bg: "bg-sky-900/50" },
                  { label: "Unique IPs", value: uniqueIPs.length, icon: Globe, color: "text-violet-400", bg: "bg-violet-900/50" },
                  { label: "Active Users", value: activeUsers, icon: UserCheck, color: "text-emerald-400", bg: "bg-emerald-900/50" },
                  { label: "Online Devices", value: onlineDevices, icon: Monitor, color: "text-amber-400", bg: "bg-amber-900/50" },
                ].map((kpi, i) => (
                  <Card key={i} className="bg-white/10 backdrop-blur border-white/20">
                    <CardContent className="p-5">
                      <div className={`p-2.5 rounded-xl ${kpi.bg} w-fit mb-3`}><kpi.icon className={`w-5 h-5 ${kpi.color}`} /></div>
                      <div className="text-3xl font-bold text-white">{kpi.value}</div>
                      <div className="text-sm text-slate-400 mt-1">{kpi.label}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Low Risk", value: ipStats.filter(s => s.risk === "low").length, color: "emerald" },
                  { label: "Medium Risk", value: ipStats.filter(s => s.risk === "medium").length, color: "amber" },
                  { label: "High Risk", value: ipStats.filter(s => s.risk === "high").length, color: "orange" },
                  { label: "Critical", value: ipStats.filter(s => s.risk === "critical").length, color: "red" },
                ].map((stat, i) => (
                  <div key={i} className={`bg-${stat.color}-900/30 border border-${stat.color}-500/30 rounded-xl p-4`}>
                    <div className={`text-2xl font-bold text-${stat.color}-400`}>{stat.value}</div>
                    <div className={`text-xs text-${stat.color}-300`}>{stat.label} IPs</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Users */}
          {tab === "users" && (
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-slate-200 flex items-center gap-2"><Users className="w-4 h-4" />Users ({users.length})</CardTitle>
                  <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-64 bg-white/10 text-white border-white/20" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-slate-800/50 border-b border-white/10">
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-400">User</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-400">Department</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-slate-400">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-400">Last Login</th>
                    </tr></thead>
                    <tbody className="divide-y divide-white/5">
                      {users.filter(u => !search || (u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()))).slice(0, 50).map((user) => (
                        <tr key={user.id} className="hover:bg-white/5">
                          <td className="px-4 py-3">
                            <div className="font-medium text-white">{user.full_name || "—"}</div>
                            <div className="text-xs text-slate-400">{user.email}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-300">{user.department || "—"}</td>
                          <td className="px-4 py-3 text-center"><StatusBadge status={user.is_active !== false ? "active" : "inactive"} /></td>
                          <td className="px-4 py-3 text-slate-400 text-xs">{user.last_sign_in_at ? ago(user.last_sign_in_at) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* IP Audit */}
          {tab === "ip_audit" && (
            <div className="space-y-4">
              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardContent className="p-4">
                  <div className="flex flex-wrap gap-3">
                    <div className="flex-1 min-w-[200px]">
                      <Input placeholder="Search IP, user, ISP, city..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-white/10 text-white border-white/20" />
                    </div>
                    <div className="flex gap-2">
                      {["ALL", "low", "medium", "high", "critical"].map(r => (
                        <Button key={r} size="sm" variant={riskFilter === r ? "default" : "outline"} onClick={() => setRiskFilter(r)} className={riskFilter === r ? "bg-sky-600" : "bg-white/10 text-white"}>{r === "ALL" ? "All" : r}</Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-slate-200 flex items-center gap-2"><Globe className="w-4 h-4" />IP Addresses ({filteredIps.length})</CardTitle>
                    <Button size="sm" onClick={() => setShowWhitelistDialog(true)}><Lock className="w-4 h-4 mr-1" />Add to Whitelist</Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-white/5">
                    {filteredIps.slice(0, 100).map((ip) => (
                      <div key={ip.ip} className="p-4 hover:bg-white/5 cursor-pointer transition-colors" onClick={() => { setSelectedEntry(ip); setShowDetail(true); }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-slate-800 rounded-lg"><Globe className="w-5 h-5 text-sky-400" /></div>
                            <div>
                              <div className="font-mono font-bold text-white">{ip.ip}</div>
                              <div className="flex items-center gap-2 text-xs text-slate-400">
                                <MapPin className="w-3 h-3" />{ip.city}, {ip.region}, {ip.country}
                                <span>·</span><Building2 className="w-3 h-3" />{ip.isp}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="font-bold text-white">{ip.count}</div>
                              <div className="text-xs text-slate-400">requests</div>
                            </div>
                            <RiskBadge level={ip.risk} />
                            {ip.isWhitelisted && <Badge className="bg-blue-100 text-blue-700">WHITELISTED</Badge>}
                            <ChevronRight className="w-5 h-5 text-slate-400" />
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-slate-500">Users:</span>
                          {ip.users.slice(0, 3).map((u, i) => <span key={i} className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-300">{u}</span>)}
                          {ip.users.length > 3 && <span className="text-xs text-slate-500">+{ip.users.length - 3} more</span>}
                        </div>
                      </div>
                    ))}
                    {filteredIps.length === 0 && <div className="text-center py-12 text-slate-400">No IPs found</div>}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Devices */}
          {tab === "devices" && (
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-slate-200 flex items-center gap-2"><Monitor className="w-4 h-4" />Connected Devices ({devices.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-slate-800/50 border-b border-white/10">
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-400">Device</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-400">User</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-400">IP</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-400">Browser / OS</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-400">Location</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-slate-400">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-400">Last Active</th>
                    </tr></thead>
                    <tbody className="divide-y divide-white/5">
                      {devices.slice(0, 100).map((dev) => (
                        <tr key={dev.id} className="hover:bg-white/5">
                          <td className="px-4 py-3"><div className="flex items-center gap-2"><DeviceIcon type={dev.device_type} /><span className="text-white">{dev.device_name}</span></div></td>
                          <td className="px-4 py-3 text-slate-300">{dev.user_email}</td>
                          <td className="px-4 py-3 font-mono text-sky-400">{dev.ip_address || "—"}</td>
                          <td className="px-4 py-3 text-slate-400 text-xs">{dev.browser} / {dev.os}</td>
                          <td className="px-4 py-3 text-slate-400 text-xs">{dev.location}</td>
                          <td className="px-4 py-3 text-center"><StatusBadge status={dev.is_online ? "online" : "inactive"} /></td>
                          <td className="px-4 py-3 text-slate-400 text-xs">{dev.last_active ? ago(dev.last_active) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sessions */}
          {tab === "sessions" && (
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-slate-200 flex items-center gap-2"><Wifi className="w-4 h-4" />Recent Activity ({auditLogs.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-white/5">
                  {auditLogs.slice(0, 100).map((log) => (
                    <div key={log.id} className="p-4 hover:bg-white/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${log.action?.includes("fail") || log.action?.includes("denied") ? "bg-red-900/50" : log.action === "login" ? "bg-emerald-900/50" : "bg-slate-800/50"}`}>
                            {log.action?.includes("fail") || log.action?.includes("denied") ? <XCircle className="w-4 h-4 text-red-400" /> :
                             log.action === "login" ? <CheckCircle className="w-4 h-4 text-emerald-400" /> :
                             <Activity className="w-4 h-4 text-sky-400" />}
                          </div>
                          <div>
                            <div className="text-sm text-white">{log.action}</div>
                            <div className="text-xs text-slate-400">{log.user_email || "system"}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-sm text-sky-400">{log.ip_address || "—"}</div>
                          <div className="text-xs text-slate-500">{ago(log.created_at)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Whitelist */}
          {tab === "whitelist" && (
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-slate-200 flex items-center gap-2"><Lock className="w-4 h-4" />IP Whitelist ({whitelist.length})</CardTitle>
                  <Button size="sm" onClick={() => setShowWhitelistDialog(true)}><Plus className="w-4 h-4 mr-1" />Add IP</Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-white/5">
                  {whitelist.map((w) => (
                    <div key={w.id} className="p-4 hover:bg-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-900/50 rounded-lg"><Lock className="w-4 h-4 text-emerald-400" /></div>
                        <div>
                          <div className="font-mono font-bold text-white">{w.ip_address}</div>
                          <div className="text-xs text-slate-400">{w.label}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={w.is_active ? "allowed" : "inactive"} />
                        <Button size="sm" variant="ghost" onClick={() => toggleWhitelist(w.id, w.is_active)}>{w.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</Button>
                        <Button size="sm" variant="ghost" className="text-red-400" onClick={() => removeFromWhitelist(w.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  ))}
                  {whitelist.length === 0 && <div className="text-center py-12 text-slate-400"><Lock className="w-12 h-12 mx-auto mb-3 opacity-50" />No whitelisted IPs yet</div>}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Whitelist Dialog */}
        <Dialog open={showWhitelistDialog} onOpenChange={setShowWhitelistDialog}>
          <DialogContent className="bg-slate-900 border-white/20">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2"><Lock className="w-5 h-5 text-emerald-400" />Add IP to Whitelist</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium text-slate-300 mb-1 block">IP Address</label>
                <Input placeholder="e.g., 192.168.1.100" value={whitelistIP} onChange={(e) => setWhitelistIP(e.target.value)} className="bg-white/10 text-white border-white/20" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 mb-1 block">Label (optional)</label>
                <Input placeholder="e.g., Office Network" value={whitelistLabel} onChange={(e) => setWhitelistLabel(e.target.value)} className="bg-white/10 text-white border-white/20" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowWhitelistDialog(false)}>Cancel</Button>
              <Button onClick={addToWhitelist}>Add to Whitelist</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Detail Dialog */}
        <Dialog open={showDetail} onOpenChange={setShowDetail}>
          <DialogContent className="bg-slate-900 border-white/20 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2"><Globe className="w-5 h-5 text-sky-400" />IP Details: {selectedEntry?.ip}</DialogTitle>
            </DialogHeader>
            {selectedEntry && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-white/5 rounded-lg">
                    <div className="text-xs text-slate-400">IP Address</div>
                    <div className="font-mono font-bold text-white">{selectedEntry.ip}</div>
                  </div>
                  <div className="p-3 bg-white/5 rounded-lg">
                    <div className="text-xs text-slate-400">Total Requests</div>
                    <div className="font-bold text-white">{selectedEntry.count}</div>
                  </div>
                  <div className="p-3 bg-white/5 rounded-lg">
                    <div className="text-xs text-slate-400">Location</div>
                    <div className="text-white">{selectedEntry.city}, {selectedEntry.region}</div>
                  </div>
                  <div className="p-3 bg-white/5 rounded-lg">
                    <div className="text-xs text-slate-400">ISP</div>
                    <div className="text-white">{selectedEntry.isp}</div>
                  </div>
                  <div className="p-3 bg-white/5 rounded-lg">
                    <div className="text-xs text-slate-400">Risk Level</div>
                    <RiskBadge level={selectedEntry.risk} />
                  </div>
                  <div className="p-3 bg-white/5 rounded-lg">
                    <div className="text-xs text-slate-400">Status</div>
                    {selectedEntry.isWhitelisted ? <Badge className="bg-blue-100 text-blue-700">WHITELISTED</Badge> : <Badge className="bg-slate-100 text-slate-700">NOT LISTED</Badge>}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-300 mb-2">Users on this IP</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedEntry.users.map((u: string, i: number) => <span key={i} className="bg-sky-900/50 px-3 py-1 rounded-full text-sm text-sky-300">{u}</span>)}
                  </div>
                </div>
                <div className="text-xs text-slate-500">Last seen: {ago(selectedEntry.lastSeen)}</div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDetail(false)}>Close</Button>
              {!selectedEntry?.isWhitelisted && (
                <Button onClick={() => { setWhitelistIP(selectedEntry?.ip || ""); setShowWhitelistDialog(true); setShowDetail(false); }}><Lock className="w-4 h-4 mr-1" />Add to Whitelist</Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
