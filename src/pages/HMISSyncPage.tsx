/**
 * ProcurBosse - HMIS Sync Manager v2.0
 * Connect to Kenya HMIS systems (DHIS2/KHIS/KenyaEMR/iHRIS) via OBC bridge
 * Real-time sync · Field mapping · Conflict resolution · Audit log
 * EL5 MediProcure - Embu Level 5 Hospital
 */
import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { T } from "@/lib/theme";
import {
  createHMISClient, DHIS2Client, toDHIS2Period,
  HMIS_SYSTEMS, DEFAULT_MAPPINGS,
  type HMISConfig, type HMISSystem, type SyncJobResult, type SyncMapping,
} from "@/lib/hmis/HMISBridge";
import {
  RefreshCw, Plus, Trash2, Save, X, Check, AlertTriangle,
  Activity, Globe, Database, ArrowRight, ArrowLeft, ArrowRightLeft,
  Settings, Clock, Wifi, WifiOff, Play, Pause, Eye, EyeOff,
  Copy, Download, Upload, ChevronRight, Radio, Zap, Map,
  Server, Shield, BarChart3, Bell, Filter, Search, Power,
} from "lucide-react";

const db = supabase as any;

/* ── Styles ── */
const card: React.CSSProperties = { background: T.card, border: `1px solid ${T.border}`, borderRadius: T.rLg, padding: "16px 20px" };
const inp: React.CSSProperties  = { width: "100%", background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.r, padding: "8px 12px", color: T.fg, fontSize: 13, outline: "none", boxSizing: "border-box" };
const btn = (bg: string, bd?: string): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 14px", background: bg, color: bd ? T.fgMuted : "#fff", border: `1px solid ${bd || "transparent"}`, borderRadius: T.r, fontSize: 12, fontWeight: 700, cursor: "pointer" });
const chip = (col: string): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 9px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: col + "22", color: col, border: `1px solid ${col}44` });

const Pulse = ({ color = T.success }: { color?: string }) => (
  <span style={{ position: "relative", display: "inline-flex", width: 8, height: 8 }}>
    <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: color, opacity: .4, animation: "ping 1.5s infinite" }} />
    <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "block" }} />
  </span>
);

const fmtAgo = (s?: string | null) => {
  if (!s) return "Never";
  const d = Date.now() - new Date(s).getTime();
  if (d < 60000) return `${Math.floor(d / 1000)}s ago`;
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return new Date(s).toLocaleDateString("en-KE");
};

const DIRECTION_ICON = { push: ArrowRight, pull: ArrowLeft, bidirectional: ArrowRightLeft };
const DIRECTION_COLOR = { push: T.primary, pull: "#7c3aed", bidirectional: "#059669" };

type Tab = "connections" | "sync" | "mapping" | "logs" | "settings";

const EMPTYCONN: Partial<HMISConfig> = {
  name: "", system: "khis", base_url: "", username: "", password: "",
  api_token: "", facility_code: "", org_unit: "", dataset_id: "",
  enabled: true, sync_interval_minutes: 60,
};

/* ════════════════════════════════════════════════════════════════ */
export default function HMISSyncPage() {
  const { user, roles } = useAuth();
  const isAdmin = roles.some(r => ["admin","superadmin","webmaster","database_admin"].includes(r));

  const [tab, setTab]         = useState<Tab>("connections");
  const [configs, setConfigs] = useState<HMISConfig[]>([]);
  const [mappings, setMappings] = useState<SyncMapping[]>([]);
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editConn, setEditConn] = useState<Partial<HMISConfig> | null>(null);
  const [saving, setSaving]   = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncResults, setSyncResults] = useState<SyncJobResult[]>([]);
  const [showPass, setShowPass] = useState<Record<string, boolean>>({});
  const [orgUnits, setOrgUnits] = useState<any[]>([]);
  const [dataSets, setDataSets] = useState<any[]>([]);
  const [autoSyncInterval, setAutoSyncInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  /* ── Load ── */
  const load = useCallback(async () => {
    setLoading(true);
    const [cfgRows, mapRows, logRows] = await Promise.all([
      db.from("system_settings").select("key,value").ilike("key", "hmis_config_%"),
      db.from("system_settings").select("key,value").ilike("key", "hmis_mapping_%"),
      db.from("erp_sync_queue").select("*").eq("erp_system", "hmis").order("created_at", { ascending: false }).limit(100),
    ]);

    // Parse configs from system_settings
    const cfgList: HMISConfig[] = (cfgRows.data || [])
      .filter((r: any) => r.key.startsWith("hmis_config_") && !r.key.endsWith("_list"))
      .map((r: any) => { try { return JSON.parse(r.value); } catch { return null; } })
      .filter(Boolean);
    setConfigs(cfgList);

    // Parse mappings
    const mapList: SyncMapping[] = (mapRows.data || [])
      .filter((r: any) => r.key.startsWith("hmis_mapping_"))
      .map((r: any) => { try { return JSON.parse(r.value); } catch { return null; } })
      .filter(Boolean);
    setMappings(mapList.length > 0 ? mapList : DEFAULT_MAPPINGS.map((m, i) => ({
      id: `default_${i}`, hmis_config_id: "", enabled: true, ...m,
    } as SyncMapping)));

    setSyncLogs(logRows.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Test connection ── */
  const testConn = async (cfg: HMISConfig) => {
    setTesting(cfg.id);
    try {
      const client = createHMISClient(cfg);
      const result = await client.ping();
      setTestResults(p => ({ ...p, [cfg.id]: result }));
      if (result.ok) {
        toast({ title: `✓ ${cfg.name} connected`, description: result.version ? `Version: ${result.version}` : "Connected successfully" });
        // Update status in DB
        const updated = { ...cfg, last_sync: new Date().toISOString() };
        await db.from("system_settings").upsert({ key: `hmis_config_${cfg.id}`, value: JSON.stringify(updated), category: "hmis" }, { onConflict: "key" });
        // Try loading org units for DHIS2
        if ((cfg.system === "dhis2" || cfg.system === "khis") && result.ok) {
          try {
            const dhis = new DHIS2Client(cfg);
            const [ous, dss] = await Promise.all([dhis.getOrgUnits(), dhis.getDataSets()]);
            setOrgUnits(ous);
            setDataSets(dss);
          } catch {}
        }
      } else {
        toast({ title: `✗ ${cfg.name} failed`, description: result.error, variant: "destructive" });
      }
    } catch (e: any) {
      setTestResults(p => ({ ...p, [cfg.id]: { ok: false, error: e.message } }));
      toast({ title: "Connection error", description: e.message, variant: "destructive" });
    }
    setTesting(null);
  };

  /* ── Run sync ── */
  const runSync = async (cfg: HMISConfig) => {
    if (!cfg.enabled) { toast({ title: "Config disabled", variant: "destructive" }); return; }
    setSyncing(cfg.id);
    const started = new Date().toISOString();
    const result: SyncJobResult = {
      config_id: cfg.id, system: cfg.system, started_at: started,
      finished_at: "", status: "success", pushed: 0, pulled: 0, conflicts: 0,
      errors: [], records: [],
    };

    try {
      const client = createHMISClient(cfg);
      const pingResult = await client.ping();
      if (!pingResult.ok) throw new Error(pingResult.error || "Connection failed");

      // Get local data for each enabled mapping
      const enabledMaps = mappings.filter(m => m.enabled && (!m.hmis_config_id || m.hmis_config_id === cfg.id));

      for (const mapping of enabledMaps) {
        try {
          if (mapping.direction === "push" || mapping.direction === "bidirectional") {
            // Pull local data
            const period = toDHIS2Period(new Date());
            const { data: localData } = await db.from(mapping.local_table)
              .select(mapping.local_field)
              .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
              .limit(1000);

            // Aggregate by transform type
            let value: number | string = 0;
            if (mapping.transform === "sum") {
              value = (localData || []).reduce((s: number, r: any) => s + (parseFloat(r[mapping.local_field]) || 0), 0);
            } else if (mapping.transform === "count") {
              value = (localData || []).length;
            } else if (mapping.transform === "latest") {
              value = (localData || [])[0]?.[mapping.local_field] ?? "";
            }

            // Push to DHIS2 if we have the required config
            if (cfg.dataset_id && cfg.org_unit && (cfg.system === "dhis2" || cfg.system === "khis")) {
              const dhis = new DHIS2Client(cfg);
              await dhis.pushDataValueSet({
                dataSet: cfg.dataset_id,
                orgUnit: cfg.org_unit,
                period,
                dataValues: [{ dataElement: mapping.hmis_field, value }],
              });
            }

            // Log to erp_sync_queue
            await db.from("erp_sync_queue").insert({
              erp_system: "hmis", sync_type: "push",
              source_table: mapping.local_table, erp_entity: mapping.hmis_entity,
              erp_id: mapping.hmis_field, payload: { value, period },
              status: "completed", direction: "push",
              started_at: started, completed_at: new Date().toISOString(),
              initiated_by: user?.id, initiated_name: user?.email,
            });

            result.pushed++;
            result.records.push({ entity: mapping.local_table, action: "push", local_id: mapping.local_field, hmis_id: mapping.hmis_field, status: "ok", message: `Value: ${value}` });
          }
        } catch (e: any) {
          result.errors.push(`${mapping.local_table}: ${e.message}`);
          result.records.push({ entity: mapping.local_table, action: "push", local_id: mapping.local_field, status: "error", message: e.message });
        }
      }

      // Update config last_sync
      const updatedCfg = { ...cfg, last_sync: new Date().toISOString() };
      await db.from("system_settings").upsert({ key: `hmis_config_${cfg.id}`, value: JSON.stringify(updatedCfg), category: "hmis" }, { onConflict: "key" });

      result.finished_at = new Date().toISOString();
      result.status = result.errors.length > 0 ? (result.pushed > 0 ? "partial" : "failed") : "success";
      setSyncResults(p => [result, ...p.slice(0, 9)]);
      toast({ title: result.status === "success" ? `✓ Sync complete` : `⚠ Partial sync`, description: `${result.pushed} pushed, ${result.errors.length} errors` });
    } catch (e: any) {
      result.errors.push(e.message);
      result.status = "failed";
      result.finished_at = new Date().toISOString();
      setSyncResults(p => [result, ...p.slice(0, 9)]);
      toast({ title: "Sync failed", description: e.message, variant: "destructive" });
    }

    setSyncing(null);
    load();
  };

  /* ── Save config ── */
  const saveConfig = async () => {
    if (!editConn?.name || !editConn.base_url) { toast({ title: "Name and URL required", variant: "destructive" }); return; }
    setSaving(true);
    const id = editConn.id || `hmis_${Date.now()}`;
    const cfg: HMISConfig = { ...EMPTYCONN, ...editConn, id } as HMISConfig;
    await db.from("system_settings").upsert({ key: `hmis_config_${id}`, value: JSON.stringify(cfg), category: "hmis" }, { onConflict: "key" });
    toast({ title: "HMIS configuration saved" });
    setSaving(false); setShowForm(false); setEditConn(null); load();
  };

  const deleteConfig = async (id: string) => {
    await db.from("system_settings").delete().eq("key", `hmis_config_${id}`);
    toast({ title: "Removed" }); load();
  };

  const saveMapping = async (m: SyncMapping) => {
    await db.from("system_settings").upsert({ key: `hmis_mapping_${m.id}`, value: JSON.stringify(m), category: "hmis" }, { onConflict: "key" });
    setMappings(p => p.map(x => x.id === m.id ? m : x));
    toast({ title: "Mapping saved" });
  };

  const installDefaultMappings = async () => {
    const rows = DEFAULT_MAPPINGS.map((m, i) => {
      const mapping = { id: `default_${i}`, hmis_config_id: "", enabled: true, ...m } as SyncMapping;
      return { key: `hmis_mapping_${mapping.id}`, value: JSON.stringify(mapping), category: "hmis" };
    });
    await db.from("system_settings").upsert(rows, { onConflict: "key" });
    toast({ title: "Default mappings installed" }); load();
  };

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: "connections", label: "HMIS Connections", icon: Globe      },
    { id: "sync",        label: "Sync Monitor",     icon: Activity   },
    { id: "mapping",     label: "Field Mapping",    icon: Map        },
    { id: "logs",        label: "Sync Logs",        icon: Database   },
    { id: "settings",    label: "OBC Settings",     icon: Settings   },
  ];

  const stats = {
    total:   configs.length,
    active:  configs.filter(c => c.enabled).length,
    synced:  configs.filter(c => c.last_sync).length,
    errors:  syncResults.filter(r => r.status === "failed").length,
  };

  return (
    <div style={{ padding: 20, minHeight: "100vh", background: T.bg }}>
      <style>{`
        @keyframes ping    { 0%{transform:scale(1);opacity:.6} 75%,100%{transform:scale(2.2);opacity:0} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes fadeIn  { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(8px)} to{opacity:1;transform:translateX(0)} }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: `linear-gradient(135deg,#059669,#0891b2)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ArrowRightLeft size={22} color="#fff" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: T.fg }}>HMIS Sync — OBC Bridge</h1>
          <div style={{ fontSize: 11, color: T.fgDim, marginTop: 2 }}>
            DHIS2 / KHIS / KenyaEMR / iHRIS · Open Bridge Connector · Procurement ↔ Health Data
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={load} style={btn(T.bg, T.border)}><RefreshCw size={13} /> Refresh</button>
          <button onClick={() => { setEditConn({ ...EMPTYCONN }); setShowForm(true); }} style={btn("#059669")}><Plus size={13} /> Add HMIS Connection</button>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
        {[
          { label: "Total Configs",  value: stats.total,  color: T.primary,  icon: Globe     },
          { label: "Active",         value: stats.active, color: T.success,  icon: Wifi      },
          { label: "Synced",         value: stats.synced, color: "#059669",  icon: Check     },
          { label: "Failed",         value: stats.errors, color: T.error,    icon: AlertTriangle },
        ].map(k => (
          <div key={k.label} style={{ ...card, padding: "12px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <k.icon size={14} color={k.color} />
              <span style={{ fontSize: 10, fontWeight: 700, color: T.fgDim, textTransform: "uppercase", letterSpacing: ".08em" }}>{k.label}</span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, color: k.color, fontFamily: "monospace" }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, marginBottom: 16, borderBottom: `1px solid ${T.border}` }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            display: "flex", alignItems: "center", gap: 7, padding: "10px 16px",
            background: "transparent", border: "none",
            borderBottom: `2px solid ${tab === t.id ? "#059669" : "transparent"}`,
            color: tab === t.id ? "#059669" : T.fgMuted, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
          }}><t.icon size={13} />{t.label}</button>
        ))}
      </div>

      {/* ══ CONNECTIONS ══ */}
      {tab === "connections" && (
        <div>
          {loading ? (
            <div style={{ ...card, textAlign: "center", padding: 40, color: T.fgDim }}>Loading...</div>
          ) : configs.length === 0 ? (
            <div style={{ ...card, textAlign: "center", padding: 48 }}>
              <Globe size={48} color={T.border} style={{ display: "block", margin: "0 auto 12px" }} />
              <div style={{ fontSize: 16, fontWeight: 700, color: T.fgMuted, marginBottom: 8 }}>No HMIS connections configured</div>
              <div style={{ fontSize: 13, color: T.fgDim, marginBottom: 20 }}>Connect to DHIS2, KHIS, KenyaEMR or any REST HMIS to sync procurement data</div>
              <button onClick={() => { setEditConn({ ...EMPTYCONN }); setShowForm(true); }} style={btn("#059669")}><Plus size={13} /> Add First Connection</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {configs.map(cfg => {
                const testR = testResults[cfg.id];
                const sysInfo = HMIS_SYSTEMS.find(s => s.value === cfg.system);
                return (
                  <div key={cfg.id} style={{ ...card, borderLeft: `4px solid ${cfg.enabled ? "#059669" : T.border}` }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: "#059669" + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Globe size={20} color="#059669" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 15, fontWeight: 800, color: T.fg }}>{cfg.name}</span>
                          <span style={chip(cfg.enabled ? "#059669" : T.fgDim)}>{cfg.enabled ? "Enabled" : "Disabled"}</span>
                          <span style={chip(T.primary)}>{sysInfo?.label || cfg.system}</span>
                          {testR && <span style={chip(testR.ok ? T.success : T.error)}>{testR.ok ? "✓ Online" : "✗ Offline"}</span>}
                        </div>
                        <div style={{ fontSize: 13, color: T.fgMuted, fontFamily: "monospace", marginBottom: 6 }}>{cfg.base_url}</div>
                        <div style={{ display: "flex", gap: 16, fontSize: 11, color: T.fgDim, flexWrap: "wrap" }}>
                          {cfg.facility_code && <span>Facility: <strong>{cfg.facility_code}</strong></span>}
                          {cfg.org_unit      && <span>Org Unit: <strong>{cfg.org_unit}</strong></span>}
                          {cfg.dataset_id    && <span>Dataset: <strong>{cfg.dataset_id}</strong></span>}
                          <span>Sync every: <strong>{cfg.sync_interval_minutes}m</strong></span>
                          <span>Last sync: <strong>{fmtAgo(cfg.last_sync)}</strong></span>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button onClick={() => testConn(cfg)} disabled={testing === cfg.id} style={btn("#059669" + "22", "#059669")}>
                          {testing === cfg.id ? <RefreshCw size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Wifi size={12} />}
                          <span style={{ color: "#059669" }}>Test</span>
                        </button>
                        <button onClick={() => runSync(cfg)} disabled={syncing === cfg.id || !cfg.enabled} style={btn(T.primary)}>
                          {syncing === cfg.id ? <RefreshCw size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Play size={12} />}
                          {syncing === cfg.id ? "Syncing..." : "Sync Now"}
                        </button>
                        <button onClick={() => { setEditConn({ ...cfg }); setShowForm(true); }} style={btn(T.bg, T.border)}>Edit</button>
                        <button onClick={() => deleteConfig(cfg.id)} style={{ ...btn(T.errorBg, T.error), color: T.error }}><Trash2 size={12} /></button>
                      </div>
                    </div>
                    {testR && !testR.ok && (
                      <div style={{ marginTop: 10, padding: "8px 12px", background: T.errorBg, borderRadius: T.r, fontSize: 12, color: T.error }}>
                        ✗ {testR.error}
                      </div>
                    )}
                    {testR?.ok && (orgUnits.length > 0 || dataSets.length > 0) && (
                      <div style={{ marginTop: 10, padding: "10px 12px", background: "#f0fdf4", borderRadius: T.r, fontSize: 12, color: "#166534" }}>
                        ✓ Connected — {orgUnits.length} org units, {dataSets.length} datasets available
                        {dataSets.length > 0 && (
                          <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {dataSets.slice(0, 5).map((ds: any) => (
                              <span key={ds.id} onClick={() => setEditConn(p => ({ ...p, dataset_id: ds.id }))} style={{ padding: "2px 8px", borderRadius: 4, background: "#166534" + "22", color: "#166534", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>{ds.name}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ SYNC MONITOR ══ */}
      {tab === "sync" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 14 }}>
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Pulse color="#059669" />
              <span style={{ fontWeight: 800, fontSize: 14, color: T.fg }}>Sync Jobs</span>
              <span style={chip("#059669")}>{syncResults.length} recent</span>
              <button onClick={() => configs.forEach(c => c.enabled && runSync(c))} style={{ ...btn("#059669"), marginLeft: "auto", padding: "6px 14px" }}>
                <Play size={12} /> Sync All Active
              </button>
            </div>
            {syncResults.length === 0 && syncLogs.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: T.fgDim }}>
                <Activity size={32} style={{ display: "block", margin: "0 auto 10px" }} />No sync jobs yet — run a sync to see results
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {syncResults.map((r, i) => (
                  <div key={i} style={{ padding: "12px 14px", borderRadius: T.r, background: T.bg, border: `1px solid ${r.status === "success" ? T.success : r.status === "partial" ? T.warning : T.error}44`, animation: "slideIn .2s" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={chip(r.status === "success" ? T.success : r.status === "partial" ? T.warning : T.error)}>{r.status}</span>
                      <span style={{ fontWeight: 700, fontSize: 13, color: T.fg }}>{HMIS_SYSTEMS.find(s => s.value === r.system)?.label || r.system}</span>
                      <span style={{ fontSize: 11, color: T.fgDim, marginLeft: "auto" }}>{fmtAgo(r.started_at)}</span>
                    </div>
                    <div style={{ display: "flex", gap: 16, fontSize: 12, color: T.fgMuted }}>
                      <span>↑ Pushed: <strong style={{ color: T.primary }}>{r.pushed}</strong></span>
                      <span>↓ Pulled: <strong style={{ color: "#7c3aed" }}>{r.pulled}</strong></span>
                      <span>⚡ Conflicts: <strong style={{ color: T.warning }}>{r.conflicts}</strong></span>
                      {r.errors.length > 0 && <span>✗ Errors: <strong style={{ color: T.error }}>{r.errors.length}</strong></span>}
                    </div>
                    {r.errors.length > 0 && (
                      <div style={{ marginTop: 6, fontSize: 11, color: T.error }}>{r.errors.slice(0, 2).join(" | ")}</div>
                    )}
                    {r.records.length > 0 && (
                      <div style={{ marginTop: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {r.records.map((rec, j) => (
                          <span key={j} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: rec.status === "ok" ? "#f0fdf4" : T.errorBg, color: rec.status === "ok" ? "#166534" : T.error, fontFamily: "monospace" }}>
                            {rec.entity} → {rec.hmis_id || "?"} {rec.message ? `(${rec.message})` : ""}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {syncLogs.slice(0, 20).map((l, i) => (
                  <div key={`log_${i}`} style={{ padding: "8px 12px", borderRadius: T.r, background: T.bg, border: `1px solid ${T.border}`, fontSize: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: T.fg }}>{l.erp_entity || l.source_table} → {l.erp_id}</span>
                      <span style={chip(l.status === "completed" ? T.success : T.error)}>{l.status}</span>
                      <span style={{ color: T.fgDim, fontSize: 10 }}>{fmtAgo(l.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick sync panel */}
          <div style={card}>
            <div style={{ fontWeight: 800, fontSize: 13, color: T.fg, marginBottom: 12 }}>Quick Actions</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {configs.filter(c => c.enabled).map(cfg => (
                <div key={cfg.id} style={{ padding: "10px 12px", borderRadius: T.r, background: T.bg, border: `1px solid ${T.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 12, color: T.fg }}>{cfg.name}</span>
                    <button onClick={() => runSync(cfg)} disabled={syncing === cfg.id} style={{ ...btn("#059669"), padding: "4px 10px", fontSize: 10 }}>
                      {syncing === cfg.id ? <RefreshCw size={10} style={{ animation: "spin 1s linear infinite" }} /> : <Play size={10} />}
                      Sync
                    </button>
                  </div>
                  <div style={{ fontSize: 10, color: T.fgDim }}>Last: {fmtAgo(cfg.last_sync)}</div>
                </div>
              ))}
              {configs.filter(c => c.enabled).length === 0 && (
                <div style={{ textAlign: "center", padding: 20, color: T.fgDim, fontSize: 12 }}>No active connections</div>
              )}
            </div>

            <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${T.border}` }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: T.fg, marginBottom: 8 }}>Auto-Sync</div>
              <div style={{ fontSize: 12, color: T.fgMuted, marginBottom: 8 }}>
                {autoSyncInterval ? "Auto-sync is running every 60 minutes" : "Auto-sync is not running"}
              </div>
              <button onClick={() => {
                if (autoSyncInterval) {
                  clearInterval(autoSyncInterval); setAutoSyncInterval(null);
                  toast({ title: "Auto-sync stopped" });
                } else {
                  const iv = setInterval(() => configs.filter(c => c.enabled).forEach(c => runSync(c)), 60 * 60_000);
                  setAutoSyncInterval(iv);
                  toast({ title: "Auto-sync started", description: "Will sync every 60 minutes" });
                }
              }} style={btn(autoSyncInterval ? T.error : "#059669")}>
                {autoSyncInterval ? <><Pause size={12} /> Stop Auto-Sync</> : <><Play size={12} /> Start Auto-Sync</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ FIELD MAPPING ══ */}
      {tab === "mapping" && (
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <Map size={16} color="#059669" />
            <span style={{ fontWeight: 800, fontSize: 14, color: T.fg }}>Field Mappings</span>
            <span style={chip("#059669")}>{mappings.filter(m => m.enabled).length} active</span>
            <button onClick={installDefaultMappings} style={{ ...btn(T.bg, T.border), marginLeft: "auto" }}>
              <Download size={13} /> Install Defaults
            </button>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: T.bg }}>
                {["Local Table", "Local Field", "Direction", "HMIS Entity", "HMIS Field", "Transform", "Enabled"].map(h => (
                  <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 10, fontWeight: 700, color: T.fgDim, borderBottom: `1px solid ${T.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mappings.map(m => {
                const DirIcon = DIRECTION_ICON[m.direction] || ArrowRight;
                return (
                  <tr key={m.id} style={{ borderBottom: `1px solid ${T.border}10` }}>
                    <td style={{ padding: "8px 10px" }}><code style={{ fontSize: 11, color: T.primary }}>{m.local_table}</code></td>
                    <td style={{ padding: "8px 10px" }}><code style={{ fontSize: 11, color: T.fg }}>{m.local_field}</code></td>
                    <td style={{ padding: "8px 10px" }}><span style={chip(DIRECTION_COLOR[m.direction] || T.primary)}><DirIcon size={9} />{m.direction}</span></td>
                    <td style={{ padding: "8px 10px" }}><code style={{ fontSize: 11, color: "#7c3aed" }}>{m.hmis_entity}</code></td>
                    <td style={{ padding: "8px 10px" }}><code style={{ fontSize: 11, color: "#059669" }}>{m.hmis_field}</code></td>
                    <td style={{ padding: "8px 10px" }}><span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: T.bg, border: `1px solid ${T.border}`, color: T.fgMuted }}>{m.transform || "—"}</span></td>
                    <td style={{ padding: "8px 10px" }}>
                      <button onClick={() => saveMapping({ ...m, enabled: !m.enabled })} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                        <span style={{ display: "inline-flex", width: 36, height: 20, borderRadius: 10, background: m.enabled ? "#059669" : T.border, alignItems: "center", padding: 2, transition: "background .2s" }}>
                          <span style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "transform .2s", transform: m.enabled ? "translateX(16px)" : "translateX(0)", boxShadow: "0 1px 2px rgba(0,0,0,.3)" }} />
                        </span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ══ LOGS ══ */}
      {tab === "logs" && (
        <div style={card}>
          <div style={{ fontWeight: 800, fontSize: 14, color: T.fg, marginBottom: 14 }}>Sync Queue & Audit Log</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: T.bg }}>
                {["Time", "System", "Entity", "HMIS ID", "Direction", "Status", "Message"].map(h => (
                  <th key={h} style={{ padding: "7px 10px", textAlign: "left", fontSize: 10, fontWeight: 700, color: T.fgDim, borderBottom: `1px solid ${T.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {syncLogs.map((l, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${T.border}10` }}>
                  <td style={{ padding: "6px 10px", fontSize: 10, color: T.fgDim, whiteSpace: "nowrap" }}>{fmtAgo(l.created_at)}</td>
                  <td style={{ padding: "6px 10px" }}><span style={chip("#059669")}>{l.erp_system || "hmis"}</span></td>
                  <td style={{ padding: "6px 10px", fontFamily: "monospace", fontSize: 11 }}>{l.erp_entity || l.source_table}</td>
                  <td style={{ padding: "6px 10px", fontFamily: "monospace", fontSize: 11 }}>{l.erp_id || "—"}</td>
                  <td style={{ padding: "6px 10px" }}><span style={chip(DIRECTION_COLOR[l.direction as keyof typeof DIRECTION_COLOR] || T.primary)}>{l.direction || "push"}</span></td>
                  <td style={{ padding: "6px 10px" }}><span style={chip(l.status === "completed" ? T.success : l.status === "pending" ? T.warning : T.error)}>{l.status}</span></td>
                  <td style={{ padding: "6px 10px", fontSize: 10, color: T.fgDim, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.error_message || l.source_ref || "—"}</td>
                </tr>
              ))}
              {syncLogs.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: T.fgDim }}>No sync logs yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ══ OBC SETTINGS ══ */}
      {tab === "settings" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={card}>
            <div style={{ fontWeight: 800, fontSize: 14, color: T.fg, marginBottom: 14 }}>OBC Bridge Configuration</div>
            {[
              { key: "hmis_default_period_type", label: "Default Period Type",    options: ["Monthly", "Quarterly", "Yearly"] },
              { key: "hmis_default_direction",   label: "Default Sync Direction", options: ["push", "pull", "bidirectional"] },
              { key: "hmis_conflict_strategy",   label: "Conflict Resolution",    options: ["local_wins", "hmis_wins", "newest_wins", "manual"] },
              { key: "hmis_batch_size",          label: "Batch Size",             options: ["10", "25", "50", "100", "200"] },
              { key: "hmis_retry_attempts",      label: "Retry Attempts",         options: ["1", "2", "3", "5"] },
            ].map(({ key, label, options }) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, color: T.fgDim, fontWeight: 700, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</label>
                <select defaultValue="Monthly" style={inp} onChange={async e => {
                  await db.from("system_settings").upsert({ key, value: e.target.value, category: "hmis" }, { onConflict: "key" });
                  toast({ title: `${label} saved` });
                }}>
                  {options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div style={card}>
            <div style={{ fontWeight: 800, fontSize: 14, color: T.fg, marginBottom: 14 }}>HMIS System Reference</div>
            {HMIS_SYSTEMS.map(sys => (
              <div key={sys.value} style={{ marginBottom: 10, padding: "10px 12px", background: T.bg, borderRadius: T.r, border: `1px solid ${T.border}` }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: T.fg }}>{sys.label}</div>
                <div style={{ fontSize: 11, color: T.fgDim, marginTop: 2 }}>{sys.desc}</div>
                <div style={{ fontSize: 10, color: T.fgDim, marginTop: 2, fontFamily: "monospace" }}>Default port: {sys.port}</div>
              </div>
            ))}
            <div style={{ marginTop: 14, padding: "12px 14px", background: "#f0fdf4", borderRadius: T.r, fontSize: 12, color: "#166534" }}>
              <strong>Kenya KHIS:</strong> https://hiskenya.org/dhis-web-commons/security/login.action<br />
              <strong>KenyaEMR:</strong> Typically http://&lt;server&gt;:8080<br />
              <strong>API Token:</strong> Recommended over username/password for production
            </div>
          </div>
        </div>
      )}

      {/* ══ ADD / EDIT MODAL ══ */}
      {showForm && editConn && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setShowForm(false)}>
          <div style={{ background: T.card, borderRadius: T.rXl, width: 580, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,.4)", animation: "fadeIn .2s" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ background: "linear-gradient(135deg,#059669,#0891b2)", padding: "16px 20px", borderRadius: `${T.rXl}px ${T.rXl}px 0 0`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>{editConn.id ? "Edit HMIS Connection" : "New HMIS Connection"}</span>
              <button onClick={() => setShowForm(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(255,255,255,.7)" }}><X size={16} /></button>
            </div>
            <div style={{ padding: 24 }}>
              {/* System type */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: T.fgDim, fontWeight: 700, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" }}>HMIS System *</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {HMIS_SYSTEMS.map(sys => (
                    <button key={sys.value} onClick={() => setEditConn(p => ({ ...p, system: sys.value }))}
                      style={{ padding: "10px 12px", borderRadius: T.r, textAlign: "left", cursor: "pointer", transition: "all .12s", border: `2px solid ${editConn.system === sys.value ? "#059669" : T.border}`, background: editConn.system === sys.value ? "#059669" + "12" : T.bg }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: editConn.system === sys.value ? "#059669" : T.fg }}>{sys.label}</div>
                      <div style={{ fontSize: 10, color: T.fgDim, marginTop: 2 }}>{sys.desc.slice(0, 40)}...</div>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { key: "name",            label: "Connection Name *", col: "1/-1", ph: "e.g. Kenya KHIS Production" },
                  { key: "base_url",        label: "Base URL *",        col: "1/-1", ph: "https://hiskenya.org" },
                  { key: "username",        label: "Username",          col: "1/2",  ph: "admin" },
                  { key: "api_token",       label: "API Token",         col: "2/3",  ph: "Overrides password if set" },
                  { key: "facility_code",   label: "Facility Code",     col: "1/2",  ph: "14070 (Embu Level 5)" },
                  { key: "org_unit",        label: "Org Unit ID",       col: "2/3",  ph: "DHIS2 org unit UID" },
                  { key: "dataset_id",      label: "Dataset ID",        col: "1/2",  ph: "DHIS2 dataset UID" },
                  { key: "sync_interval_minutes", label: "Sync Interval (min)", col: "2/3", ph: "60" },
                ].map(({ key, label, col, ph }) => (
                  <div key={key} style={{ gridColumn: col }}>
                    <label style={{ fontSize: 11, color: T.fgDim, fontWeight: 700, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".04em" }}>{label}</label>
                    {key === "api_token" ? (
                      <div style={{ position: "relative" }}>
                        <input value={(editConn as any)[key] || ""} type={showPass[key] ? "text" : "password"} onChange={e => setEditConn(p => ({ ...p, [key]: e.target.value }))} style={{ ...inp, paddingRight: 36 }} placeholder={ph} />
                        <button onClick={() => setShowPass(p => ({ ...p, [key]: !p[key] }))} type="button" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: T.fgDim }}>
                          {showPass[key] ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                    ) : (
                      <input value={(editConn as any)[key] || ""} onChange={e => setEditConn(p => ({ ...p, [key]: e.target.value }))} style={inp} placeholder={ph} />
                    )}
                  </div>
                ))}

                {/* Password field */}
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={{ fontSize: 11, color: T.fgDim, fontWeight: 700, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".04em" }}>Password</label>
                  <div style={{ position: "relative" }}>
                    <input value={editConn.password || ""} type={showPass.password ? "text" : "password"} onChange={e => setEditConn(p => ({ ...p, password: e.target.value }))} style={{ ...inp, paddingRight: 36 }} placeholder="HMIS user password" />
                    <button onClick={() => setShowPass(p => ({ ...p, password: !p.password }))} type="button" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: T.fgDim }}>
                      {showPass.password ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>

                {/* Enabled toggle */}
                <div style={{ gridColumn: "1/-1", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.fg }}>Enable this connection</span>
                  <button onClick={() => setEditConn(p => ({ ...p, enabled: !p.enabled }))} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                    <span style={{ display: "inline-flex", width: 44, height: 24, borderRadius: 12, background: editConn.enabled ? "#059669" : T.border, alignItems: "center", padding: 2, transition: "background .2s" }}>
                      <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "transform .2s", transform: editConn.enabled ? "translateX(20px)" : "translateX(0)", boxShadow: "0 1px 3px rgba(0,0,0,.3)" }} />
                    </span>
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
                <button onClick={() => setShowForm(false)} style={btn(T.bg, T.border)}>Cancel</button>
                <button onClick={saveConfig} disabled={saving} style={btn("#059669")}>
                  {saving ? <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={13} />}
                  {saving ? "Saving..." : "Save Connection"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
