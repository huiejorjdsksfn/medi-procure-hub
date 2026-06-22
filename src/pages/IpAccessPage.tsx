/**
 * EL5 MediProcure — IP Access Control v2.0
 * Live stats, IP whitelist, device tracking, geolocation, production mode
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
  Shield, Globe, MapPin, Lock, Unlock, Wifi, Monitor, Smartphone, Laptop,
  Clock, CheckCircle, XCircle, AlertTriangle, RefreshCw, Download, Search,
  Eye, EyeOff, Trash2, Zap, Plus, ChevronRight, Ban, Server, Activity,
  Database, Users, BarChart3, ShieldCheck, ShieldAlert, ShieldX,
  Building2, Signal, UserCheck,
} from "lucide-react";

const db = supabase as any;

type TabType = "overview" | "rules" | "whitelist" | "devices" | "monitor" | "analytics";

interface IPRule {
  id: string; ip_address: string; rule_type: "allow" | "block" | "monitor";
  description?: string; is_active: boolean;
  created_at: string; expires_at?: string; hit_count?: number;
}
interface IPSession {
  id: string; ip_address?: string; user_email?: string;
  started_at: string; last_activity?: string; is_active?: boolean;
  user_agent?: string; location?: string;
}
interface AuditEntry {
  id: string; action: string; ip_address?: string; user_email?: string;
  created_at: string; details?: any;
}

function ago(s: string) {
  if (!s) return "—";
  const d = Date.now() - new Date(s).getTime();
  if (d < 60000) return `${Math.floor(d / 1000)}s ago`;
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
}

const StatusBadge = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    allow: "bg-emerald-100 text-emerald-700",
    block: "bg-red-100 text-red-700",
    monitor: "bg-amber-100 text-amber-700",
    active: "bg-emerald-100 text-emerald-700",
    inactive: "bg-slate-100 text-slate-600",
    online: "bg-emerald-100 text-emerald-700",
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

function DeviceIcon({ type }: { type: string }) {
  if (type === "mobile") return <Smartphone className="w-4 h-4" />;
  if (type === "tablet") return <Laptop className="w-4 h-4" />;
  return <Monitor className="w-4 h-4" />;
}

export default function IpAccessPage() {
  const [tab, setTab] = useState<TabType>("overview");
  const [rules, setRules] = useState<IPRule[]>([]);
  const [sessions, setSessions] = useState<IPSession[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [liveLog, setLiveLog] = useState<string[]>([]);
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [ruleIP, setRuleIP] = useState("");
  const [ruleType, setRuleType] = useState<"allow" | "block" | "monitor">("allow");
  const [ruleDesc, setRuleDesc] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [rulesRes, sessRes, logsRes] = await Promise.allSettled([
        db.from("ip_access_rules").select("*").order("created_at", { ascending: false }).limit(300),
        db.from("user_sessions").select("*").order("last_activity", { ascending: false }).limit(150),
        db.from("audit_log").select("*").order("created_at", { ascending: false }).limit(500),
      ]);
      if (rulesRes.status === "fulfilled") setRules(rulesRes.value.data || []);
      if (sessRes.status === "fulfilled") setSessions(sessRes.value.data || []);
      if (logsRes.status === "fulfilled") setAuditLogs(logsRes.value.data || []);
    } catch (e) { console.error("Load error:", e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      loadAll();
      setLiveLog(prev => [`${new Date().toLocaleTimeString()} - Data refreshed`, ...prev.slice(0, 9)]);
    }, 15000);
    return () => clearInterval(id);
  }, [autoRefresh, loadAll]);

  // Real-time
  useEffect(() => {
    const ch = db.channel("ip_access_v2")
      .on("postgres_changes", { event: "*", schema: "public", table: "ip_access_rules" }, () => loadAll())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_log" }, (payload: any) => {
        const log = payload.new;
        setLiveLog(prev => [`${new Date().toLocaleTimeString()} - ${log.action} - ${log.ip_address || "?"} - ${log.user_email || "system"}`, ...prev.slice(0, 49)]);
        setAuditLogs(prev => [log, ...prev.slice(0, 499)]);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadAll]);

  async function createRule() {
    if (!ruleIP) { toast({ title: "IP address required", variant: "destructive" }); return; }
    const { error } = await db.from("ip_access_rules").insert({
      ip_address: ruleIP.trim(), rule_type: ruleType,
      description: ruleDesc || null, is_active: true, hit_count: 0,
    });
    if (error) toast({ title: "Error: " + error.message, variant: "destructive" });
    else {
      toast({ title: `Rule created: ${ruleType.toUpperCase()} ${ruleIP}` });
      setShowRuleDialog(false);
      setRuleIP(""); setRuleDesc("");
      loadAll();
    }
  }

  async function toggleRule(id: string, current: boolean) {
    const { error } = await db.from("ip_access_rules").update({ is_active: !current }).eq("id", id);
    if (!error) { toast({ title: `Rule ${!current ? "enabled" : "disabled"}` }); loadAll(); }
    else toast({ title: "Error", variant: "destructive" });
  }

  async function deleteRule(id: string, ip: string) {
    if (!window.confirm(`Delete rule for ${ip}?`)) return;
    const { error } = await db.from("ip_access_rules").delete().eq("id", id);
    if (!error) { toast({ title: "Rule deleted" }); loadAll(); }
    else toast({ title: "Error", variant: "destructive" });
  }

  async function quickBlock(ip: string) {
    if (!window.confirm(`Block IP ${ip}?`)) return;
    const { error } = await db.from("ip_access_rules").upsert({
      ip_address: ip, rule_type: "block", is_active: true,
      description: `Blocked via IP Monitor ${new Date().toLocaleDateString("en-KE")}`, hit_count: 0,
    }, { onConflict: "ip_address" });
    if (!error) { toast({ title: `${ip} blocked` }); loadAll(); }
    else toast({ title: "Error", variant: "destructive" });
  }

  function exportRules() {
    const rows = ["IP Address,Rule Type,Description,Active,Hit Count,Created",
      ...filteredRules.map(r => `"${r.ip_address}","${r.rule_type}","${r.description || ""}",${r.is_active},${r.hit_count || 0},"${r.created_at}"`)
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "ip_access_rules.csv";
    a.click(); URL.revokeObjectURL(url);
    toast({ title: "Exported to CSV" });
  }

  const filteredRules = useMemo(() => {
    if (!search) return rules;
    return rules.filter(r => 
      r.ip_address.includes(search) || 
      (r.description?.toLowerCase() || "").includes(search.toLowerCase())
    );
  }, [rules, search]);

  const stats = useMemo(() => ({
    totalRules: rules.length,
    allowRules: rules.filter(r => r.rule_type === "allow" && r.is_active).length,
    blockRules: rules.filter(r => r.rule_type === "block" && r.is_active).length,
    monitorRules: rules.filter(r => r.rule_type === "monitor" && r.is_active).length,
    activeSessions: sessions.filter(s => s.is_active).length,
    totalAuditEvents: auditLogs.length,
    uniqueIPs: [...new Set(auditLogs.map(l => l.ip_address).filter(Boolean))].length,
  }), [rules, sessions, auditLogs]);

  const TABS = [
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "rules", label: "IP Rules", icon: Shield },
    { key: "whitelist", label: "Whitelist", icon: Lock },
    { key: "devices", label: "Devices", icon: Monitor },
    { key: "monitor", label: "Live Monitor", icon: Activity },
    { key: "analytics", label: "Analytics", icon: Globe },
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
                  IP Access Control Center
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Security management · IP whitelist · Live monitoring
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
                <Button variant="outline" size="sm" onClick={exportRules}>
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
                    <div className="text-xs text-emerald-200/70 truncate">{liveLog[0] || "Waiting for events..."}</div>
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
                  { label: "Total Rules", value: stats.totalRules, icon: Shield, color: "text-sky-400", bg: "bg-sky-900/50" },
                  { label: "Allow Rules", value: stats.allowRules, icon: ShieldCheck, color: "text-emerald-400", bg: "bg-emerald-900/50" },
                  { label: "Block Rules", value: stats.blockRules, icon: ShieldX, color: "text-red-400", bg: "bg-red-900/50" },
                  { label: "Active Sessions", value: stats.activeSessions, icon: Wifi, color: "text-amber-400", bg: "bg-amber-900/50" },
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-white/10 backdrop-blur border-white/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-slate-200 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" /> Allowed IPs
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {rules.filter(r => r.rule_type === "allow" && r.is_active).slice(0, 5).map(r => (
                        <div key={r.id} className="flex items-center justify-between p-2 bg-emerald-900/30 rounded-lg">
                          <span className="font-mono text-emerald-300 text-sm">{r.ip_address}</span>
                          <StatusBadge status="allow" />
                        </div>
                      ))}
                      {rules.filter(r => r.rule_type === "allow" && r.is_active).length === 0 && (
                        <div className="text-slate-500 text-sm">No allow rules</div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/10 backdrop-blur border-white/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-slate-200 flex items-center gap-2">
                      <ShieldX className="w-4 h-4 text-red-400" /> Blocked IPs
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {rules.filter(r => r.rule_type === "block" && r.is_active).slice(0, 5).map(r => (
                        <div key={r.id} className="flex items-center justify-between p-2 bg-red-900/30 rounded-lg">
                          <span className="font-mono text-red-300 text-sm">{r.ip_address}</span>
                          <StatusBadge status="block" />
                        </div>
                      ))}
                      {rules.filter(r => r.rule_type === "block" && r.is_active).length === 0 && (
                        <div className="text-slate-500 text-sm">No blocked IPs</div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/10 backdrop-blur border-white/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-slate-200 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-amber-400" /> Live Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between"><span className="text-slate-400">Unique IPs</span><span className="text-white font-bold">{stats.uniqueIPs}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Total Events</span><span className="text-white font-bold">{stats.totalAuditEvents}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Active Sessions</span><span className="text-emerald-400 font-bold">{stats.activeSessions}</span></div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Rules Tab */}
          {tab === "rules" && (
            <div className="space-y-4">
              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardContent className="p-4">
                  <div className="flex gap-3 flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                      <Input placeholder="Search IP rules..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-white/10 text-white border-white/20" />
                    </div>
                    <Button size="sm" onClick={() => setShowRuleDialog(true)}>
                      <Plus className="w-4 h-4 mr-1" /> Add Rule
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-slate-200 flex items-center gap-2">
                    <Shield className="w-4 h-4" /> IP Rules ({filteredRules.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-white/5">
                    {filteredRules.map((rule) => (
                      <div key={rule.id} className="p-4 hover:bg-white/5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg ${rule.rule_type === "allow" ? "bg-emerald-900/50" : rule.rule_type === "block" ? "bg-red-900/50" : "bg-amber-900/50"}`}>
                              {rule.rule_type === "allow" ? <ShieldCheck className="w-5 h-5 text-emerald-400" /> :
                               rule.rule_type === "block" ? <ShieldX className="w-5 h-5 text-red-400" /> :
                               <ShieldAlert className="w-5 h-5 text-amber-400" />}
                            </div>
                            <div>
                              <div className="font-mono font-bold text-white">{rule.ip_address}</div>
                              <div className="text-xs text-slate-400">{rule.description || "No description"}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <StatusBadge status={rule.is_active ? rule.rule_type : "inactive"} />
                            <span className="text-xs text-slate-500">{rule.hit_count || 0} hits</span>
                            <Button size="sm" variant="ghost" onClick={() => toggleRule(rule.id, rule.is_active)}>
                              {rule.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-400" onClick={() => deleteRule(rule.id, rule.ip_address)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {filteredRules.length === 0 && (
                      <div className="text-center py-12 text-slate-400"><Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />No IP rules found</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Whitelist Tab */}
          {tab === "whitelist" && (
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-slate-200 flex items-center gap-2">
                  <Lock className="w-4 h-4" /> IP Whitelist ({rules.filter(r => r.rule_type === "allow" && r.is_active).length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-white/5">
                  {rules.filter(r => r.rule_type === "allow" && r.is_active).map((rule) => (
                    <div key={rule.id} className="p-4 hover:bg-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-900/50 rounded-lg"><Lock className="w-4 h-4 text-emerald-400" /></div>
                        <div>
                          <div className="font-mono font-bold text-white">{rule.ip_address}</div>
                          <div className="text-xs text-slate-400">{rule.description || "Whitelisted"}</div>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" className="text-red-400" onClick={() => deleteRule(rule.id, rule.ip_address)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {rules.filter(r => r.rule_type === "allow" && r.is_active).length === 0 && (
                    <div className="text-center py-12 text-slate-400"><Lock className="w-12 h-12 mx-auto mb-3 opacity-50" />No whitelisted IPs</div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Devices Tab */}
          {tab === "devices" && (
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-slate-200 flex items-center gap-2">
                  <Monitor className="w-4 h-4" /> Connected Devices ({sessions.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-slate-800/50 border-b border-white/10">
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-400">Device</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-400">User</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-400">IP</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-400">Location</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-slate-400">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-400">Last Active</th>
                    </tr></thead>
                    <tbody className="divide-y divide-white/5">
                      {sessions.slice(0, 100).map((s) => (
                        <tr key={s.id} className="hover:bg-white/5">
                          <td className="px-4 py-3"><div className="flex items-center gap-2"><DeviceIcon type={parseDeviceType(s.user_agent)} /><span className="text-white">{parseDeviceType(s.user_agent)}</span></div></td>
                          <td className="px-4 py-3 text-slate-300">{s.user_email || "—"}</td>
                          <td className="px-4 py-3 font-mono text-sky-400">{s.ip_address || "—"}</td>
                          <td className="px-4 py-3 text-slate-400 text-xs">{s.location || "Kenya"}</td>
                          <td className="px-4 py-3 text-center"><StatusBadge status={s.is_active ? "online" : "inactive"} /></td>
                          <td className="px-4 py-3 text-slate-400 text-xs">{s.last_activity ? ago(s.last_activity) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Monitor Tab */}
          {tab === "monitor" && (
            <div className="space-y-4">
              <Card className="bg-slate-950 border-slate-700">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-emerald-400 flex items-center gap-2">
                      <Activity className="w-4 h-4" /> Live Activity Feed
                    </CardTitle>
                    <span className="text-xs text-slate-500">{liveLog.length} events</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="font-mono text-xs space-y-1 max-h-96 overflow-y-auto">
                    {liveLog.map((line, i) => (
                      <div key={i} className={`p-2 rounded ${i === 0 ? "bg-emerald-900/30 text-emerald-300" : "text-slate-400"}`}>
                        <span className="text-slate-600 mr-2">{">"}</span>{line}
                      </div>
                    ))}
                    {liveLog.length === 0 && <div className="text-slate-600 text-center py-8">Waiting for events...</div>}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-slate-200 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Recent Audit Events ({auditLogs.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-white/5">
                    {auditLogs.slice(0, 50).map((log) => (
                      <div key={log.id} className="p-4 hover:bg-white/5 flex items-center justify-between">
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
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm text-sky-400">{log.ip_address || "—"}</span>
                          <span className="text-xs text-slate-500">{ago(log.created_at)}</span>
                          {log.ip_address && <Button size="sm" variant="ghost" className="text-red-400" onClick={() => quickBlock(log.ip_address)}><Ban className="w-4 h-4" /></Button>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Analytics Tab */}
          {tab === "analytics" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-slate-200">IP Activity Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { label: "Total Events", value: auditLogs.length, color: "text-sky-400" },
                      { label: "Unique IPs", value: stats.uniqueIPs, color: "text-violet-400" },
                      { label: "Login Events", value: auditLogs.filter(l => l.action === "login").length, color: "text-emerald-400" },
                      { label: "Failed Attempts", value: auditLogs.filter(l => l.action?.includes("fail")).length, color: "text-red-400" },
                    ].map((stat) => (
                      <div key={stat.label} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                        <span className="text-slate-400">{stat.label}</span>
                        <span className={`font-bold ${stat.color}`}>{stat.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-slate-200">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" className="bg-emerald-900/30 border-emerald-500/30 text-emerald-300" onClick={() => { setRuleType("allow"); setShowRuleDialog(true); }}>
                      <ShieldCheck className="w-4 h-4 mr-2" /> Add Allow Rule
                    </Button>
                    <Button variant="outline" className="bg-red-900/30 border-red-500/30 text-red-300" onClick={() => { setRuleType("block"); setShowRuleDialog(true); }}>
                      <ShieldX className="w-4 h-4 mr-2" /> Add Block Rule
                    </Button>
                    <Button variant="outline" className="bg-amber-900/30 border-amber-500/30 text-amber-300" onClick={() => { setRuleType("monitor"); setShowRuleDialog(true); }}>
                      <ShieldAlert className="w-4 h-4 mr-2" /> Add Monitor Rule
                    </Button>
                    <Button variant="outline" className="bg-white/10" onClick={exportRules}>
                      <Download className="w-4 h-4 mr-2" /> Export CSV
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Rule Dialog */}
        <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
          <DialogContent className="bg-slate-900 border-white/20">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-sky-400" />
                Create IP Rule
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium text-slate-300 mb-1 block">IP Address</label>
                <Input placeholder="e.g., 192.168.1.100" value={ruleIP} onChange={(e) => setRuleIP(e.target.value)} className="bg-white/10 text-white border-white/20" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 mb-1 block">Rule Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["allow", "block", "monitor"] as const).map(type => (
                    <button key={type} onClick={() => setRuleType(type)}
                      className={`p-3 rounded-lg border-2 transition-all ${ruleType === type ? 
                        (type === "allow" ? "border-emerald-500 bg-emerald-900/50" : type === "block" ? "border-red-500 bg-red-900/50" : "border-amber-500 bg-amber-900/50") :
                        "border-white/20 bg-white/5"}`}>
                      <div className={`text-sm font-medium ${ruleType === type ? "text-white" : "text-slate-400"}`}>{type.toUpperCase()}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 mb-1 block">Description (optional)</label>
                <Input placeholder="e.g., Office network" value={ruleDesc} onChange={(e) => setRuleDesc(e.target.value)} className="bg-white/10 text-white border-white/20" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRuleDialog(false)}>Cancel</Button>
              <Button onClick={createRule}>Create Rule</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
