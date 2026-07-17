/**
 * ProcurBosse - Superadmin / Webmaster Control Centre v6.0
 * Full working system settings · Module toggles · Role caps · Broadcast
 * Live DB monitor · Codebase viewer · Deploy trigger · Console terminal
 * PRO FEATURES: Realtime CLI, query exec, history, live stats, uptime
 * EL5 MediProcure - Embu Level 5 Hospital
 */
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSystemSettings, saveSetting, saveSettings } from "@/hooks/useSystemSettings";
import { toast } from "@/hooks/use-toast";
import { T } from "@/lib/theme";
import {
  Globe, RefreshCw, Activity, Package, Shield, Code2, Radio,
  Server, Terminal, ArrowRight, Users, Bell, Hash, Settings,
  Database, Eye, Edit3, Save, Copy, X, Check, Lock, Unlock,
  Trash2, Search, HardDrive, AlertTriangle, BarChart3, Cpu,
  Monitor, Wifi, ChevronRight, Power, Zap, Plus, BookOpen,
  Play, Clock, Zap as Zap2, Layers, FileCode,
  Building2, CheckCircle2, Cable, AlertCircle,
} from "lucide-react";

const db = supabase as any;

const MODULES = [
  { key: "enable_procurement",     label: "Procurement",       color: "#1d4ed8", icon: Package },
  { key: "enable_financials",      label: "Financials",        color: "#7c3aed", icon: BarChart3 },
  { key: "enable_vouchers",        label: "Vouchers",          color: "#c45910", icon: BookOpen },
  { key: "enable_quality",         label: "Quality Control",   color: "#d97706", icon: Shield },
  { key: "enable_scanner",         label: "Scanner / GRN",     color: "#059669", icon: Cpu },
  { key: "enable_tenders",         label: "Tenders",           color: "#0891b2", icon: Globe },
  { key: "enable_contracts_module",label: "Contracts",         color: "#065f46", icon: Copy },
  { key: "enable_documents",       label: "Documents",         color: "#374151", icon: Edit3 },
  { key: "realtime_notifications", label: "Realtime Notifs",   color: "#8b5cf6", icon: Bell },
  { key: "maintenance_mode",       label: "Maintenance Mode",  color: "#dc2626", icon: AlertTriangle },
];

const ROLE_CAPS: Record<string, string[]> = {
  superadmin:          ["all_access","manage_users","system_settings","view_audit","approve_all","manage_mysql","edit_code","manage_roles"],
  webmaster:           ["all_access","manage_users","system_settings","view_audit","approve_all","manage_mysql","edit_code","manage_roles","view_codebase"],
  admin:               ["all_access","manage_users","system_settings","view_audit","approve_all","manage_mysql"],
  database_admin:      ["manage_mysql","view_schema","run_queries","manage_backups","view_audit"],
  procurement_manager: ["approve_requisitions","create_po","approve_po","manage_suppliers","manage_contracts","manage_tenders"],
  procurement_officer: ["create_requisitions","view_po","receive_goods","view_suppliers"],
  accountant:          ["view_financials","create_vouchers","approve_vouchers","manage_budgets","invoice_matching","view_audit"],
  inventory_manager:   ["manage_items","manage_categories","view_stock","scan_items","view_reports"],
  warehouse_officer:   ["receive_goods","issue_items","scan_items","view_stock"],
  requisitioner:       ["create_requisitions","view_own_requisitions","view_items"],
};

const CODE_FILES = [
  { path: "src/App.tsx",                      group: "Core",   desc: "Main router" },
  { path: "src/contexts/AuthContext.tsx",     group: "Auth",   desc: "Session engine" },
  { path: "src/hooks/useSystemSettings.ts",  group: "Core",   desc: "Settings hook" },
  { path: "src/lib/theme.ts",                group: "UI",     desc: "Design tokens" },
  { path: "src/components/AppLayout.tsx",    group: "UI",     desc: "Nav + layout" },
  { path: "src/pages/DashboardPage.tsx",     group: "Pages",  desc: "Dashboard + ERP wheel" },
  { path: "src/pages/UsersPage.tsx",         group: "Pages",  desc: "User management" },
  { path: "src/pages/UsersIpAuditPage.tsx",   group: "Pages",  desc: "Users + IP audit dashboard" },
  { path: "src/pages/GuiEditorPage.tsx",     group: "Admin",  desc: "GUI Editor" },
  { path: "src/pages/WebmasterPage.tsx",     group: "Admin",  desc: "This page" },
  { path: "src/lib/ipRestriction.ts",        group: "Auth",   desc: "IP engine" },
  { path: "src/engines/db/LiveDatabaseEngine.ts", group: "Engine", desc: "DB health check" },
  { path: "supabase/functions/send-sms/index.ts",   group: "Edge", desc: "Twilio SMS" },
  { path: "supabase/functions/send-email/index.ts", group: "Edge", desc: "Email (Resend)" },
  { path: ".github/workflows/ci-cd.yml",     group: "CI/CD",  desc: "Build + deploy pipeline" },
];
const GROUP_COLORS: Record<string, string> = {
  Core:"#1d4ed8", Auth:"#7c3aed", UI:"#d97706", Pages:"#374151",
  Admin:"#dc2626", Engine:"#8b5cf6", Edge:"#c45910", "CI/CD":"#374151",
};

type WMTab = "overview"|"modules"|"roles"|"system"|"codebase"|"broadcast"|"terminal"|"deploy"|"deployments"|"notfound";

const card: React.CSSProperties = { background: T.card, border: `1px solid ${T.border}`, borderRadius: T.rLg, padding: "16px 20px" };
const inp: React.CSSProperties  = { width:"100%", background: T.bg, border:`1px solid ${T.border}`, borderRadius: T.r, padding:"8px 12px", color: T.fg, fontSize:13, outline:"none", boxSizing:"border-box" };
const btn = (bg: string, bd?: string): React.CSSProperties => ({ display:"inline-flex", alignItems:"center", gap:7, padding:"8px 14px", background:bg, color:bd?T.fgMuted:"#fff", border:`1px solid ${bd||"transparent"}`, borderRadius:T.r, fontSize:12, fontWeight:700, cursor:"pointer" });
const chip = (col: string): React.CSSProperties => ({ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px", borderRadius:99, fontSize:9, fontWeight:700, background:col+"20", color:col, border:`1px solid ${col}44` });

export default function WebmasterPage() {
  const nav = useNavigate();
  const { user, roles } = useAuth();
  const { get, settings } = useSystemSettings();

  const [tab, setTab] = useState<WMTab>("overview");
  const [kpis, setKpis] = useState<any>({});
  // Merged from DeploymentsPage (company/facility onboarding tracker)
  const [companyDeployments, setCompanyDeployments] = useState<any[]>([]);
  const [deployJobs, setDeployJobs] = useState<any[]>([]);
  const [deployConnections, setDeployConnections] = useState<any[]>([]);
  const [deployLoading, setDeployLoading] = useState(false);
  // Merged from NotFoundLogPage (404 route tracker)
  const [notFoundRows, setNotFoundRows] = useState<any[]>([]);
  const [notFoundLoading, setNotFoundLoading] = useState(false);
  const [notFoundFilter, setNotFoundFilter] = useState("");
  const [saving, setSaving] = useState<string|null>(null);
  const [broadcast, setBroadcast] = useState("");
  const [broadcastType, setBroadcastType] = useState<"info"|"warning"|"error">("info");
  const [broadcasting, setBroadcasting] = useState(false);
  const [codeSearch, setCodeSearch] = useState("");
  const [selectedFile, setSelectedFile] = useState<typeof CODE_FILES[0]|null>(null);
  const [fileContent, setFileContent] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [termOutput, setTermOutput] = useState<string[]>([]);
  const [termInput, setTermInput] = useState("");
  const [termHistory, setTermHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [rtConnected, setRtConnected] = useState(false);
  const [realtimeFeed, setRealtimeFeed] = useState(true);
  const termRef = useRef<HTMLDivElement>(null);
  const rtChan = useRef<any>(null);
  const startTime = useRef(Date.now());
  const [liveStats, setLiveStats] = useState({ users:0, reqs:0, items:0, notifs:0, uptime:"" });

  const uptime = () => {
    const s = Math.floor((Date.now() - startTime.current) / 1000);
    const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60;
    return `${h}h ${m}m ${sec}s`;
  };

  const add = (s: string, type?: "info"|"success"|"error"|"warn"|"cmd") => {
    const prefix = type==="success"?"✅":type==="error"?"❌":type==="warn"?"⚠":type==="cmd"?"›":"";
    setTermOutput(p => [...p.slice(-499), `${prefix} ${s}`.trim()]);
  };

  const addSection = (lines: string[]) => lines.forEach(l => add(l));
  const addTable = (rows: [string,string][]) => rows.forEach(([k,v]) => add(`  ${k.padEnd(20)} ${v}`));

  useEffect(() => {
    add("EL5 MediProcure Webmaster Console v6.0", "info");
    add(`Connected to Supabase · ${new Date().toLocaleString("en-KE")}`, "info");
    add("Type 'help' for commands, 'subscribe' to toggle realtime feed", "info");
    add("─".repeat(50));
    // load live stats for terminal
    const loadLive = async () => {
      const [u,r,i,n] = await Promise.allSettled([
        db.from("profiles").select("id",{count:"exact",head:true}),
        db.from("requisitions").select("id",{count:"exact",head:true}),
        db.from("items").select("id",{count:"exact",head:true}),
        db.from("notifications").select("id",{count:"exact",head:true}).eq("is_read",false),
      ]);
      const v = (x:any) => x.status==="fulfilled"?(x.value?.count??0):0;
      setLiveStats({ users:v(u), reqs:v(r), items:v(i), notifs:v(n), uptime:uptime() });
    };
    loadLive();
    const id = setInterval(() => {
      setLiveStats(s => ({...s, uptime: uptime()}));
      if (realtimeFeed) loadLive();
    }, 10000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime subscription for terminal events
  useEffect(() => {
    if (!realtimeFeed) { if(rtChan.current){ supabase.removeChannel(rtChan.current); rtChan.current=null; } setRtConnected(false); return; }
    rtChan.current = db.channel("wm_terminal_rt")
      .on("postgres_changes",{event:"*",schema:"public",table:"audit_log"},(p:any)=>{
        const d=p.new||{}; add(`📋 ${d.action||"event"} · ${d.user_email||"system"} · ${d.ip_address||"—"}`,"info");
      })
      .on("postgres_changes",{event:"*",schema:"public",table:"notifications"},(p:any)=>{
        add(`🔔 Notification: ${p.new?.title||"new notification"}`,"warn");
      })
      .on("postgres_changes",{event:"*",schema:"public",table:"user_sessions"},(p:any)=>{
        add(`🟢 Session ${p.eventType?.toLowerCase()} · ${p.new?.user_email||"—"}`,"info");
      })
      .subscribe((s:string)=>{
        if(s==="SUBSCRIBED"){setRtConnected(true);add("📡 Realtime feed CONNECTED","success");}
        if(s==="CHANNEL_ERROR"){setRtConnected(false);add("❌ Realtime feed DISCONNECTED","error");}
      });
    return ()=>{ if(rtChan.current){supabase.removeChannel(rtChan.current);rtChan.current=null;} };
  },[realtimeFeed]);

  useEffect(()=>{ setTimeout(()=>termRef.current?.scrollTo(0,termRef.current.scrollHeight),50); },[termOutput]);

  /* Controlled system settings state */
  const [sysForm, setSysForm] = useState<Record<string,string>>({});
  useEffect(() => {
    if (Object.keys(settings).length > 0 && Object.keys(sysForm).length === 0) {
      setSysForm({
        hospital_name:    settings.hospital_name    || "",
        system_name:      settings.system_name      || "",
        hospital_address: settings.hospital_address || "",
        hospital_phone:   settings.hospital_phone   || "",
        hospital_email:   settings.hospital_email   || "",
        system_currency:  settings.system_currency  || "KES",
        system_timezone:  settings.system_timezone  || "Africa/Nairobi",
        vat_rate:         settings.vat_rate          || "16",
        doc_footer:       settings.doc_footer        || "",
      });
    }
  }, [settings]);

  const loadKpis = useCallback(async () => {
    const [u, r, s, i, n] = await Promise.allSettled([
      db.from("profiles").select("id", { count:"exact", head:true }),
      db.from("requisitions").select("id", { count:"exact", head:true }),
      db.from("suppliers").select("id", { count:"exact", head:true }),
      db.from("items").select("id", { count:"exact", head:true }),
      db.from("notifications").select("id", { count:"exact", head:true }).eq("is_read", false),
    ]);
    const v = (x: any) => x.status === "fulfilled" ? (x.value?.count ?? 0) : 0;
    setKpis({ users:v(u), requisitions:v(r), suppliers:v(s), items:v(i), unread:v(n) });
  }, []);

  useEffect(() => { loadKpis(); }, [loadKpis]);

  const loadDeployments = useCallback(async () => {
    setDeployLoading(true);
    try {
      const [dRes, jRes, cRes] = await Promise.all([
        db.from("company_deployments").select("*").order("created_at", { ascending: false }),
        db.from("deployment_import_jobs").select("id,deployment_id,imported_rows,failed_rows,status"),
        db.from("external_connections").select("id,status,type,deployment_id"),
      ]);
      setCompanyDeployments(dRes.data || []);
      setDeployJobs(jRes.data || []);
      setDeployConnections(cRes.data || []);
    } catch (e: any) {
      toast({ title: "Failed to load deployments", description: e.message, variant: "destructive" as any });
    } finally {
      setDeployLoading(false);
    }
  }, []);

  const loadNotFoundLog = useCallback(async () => {
    setNotFoundLoading(true);
    const { data, error } = await db.from("not_found_log").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) toast({ title: "Failed to load 404 log", description: error.message, variant: "destructive" as any });
    setNotFoundRows(data || []);
    setNotFoundLoading(false);
  }, []);

  useEffect(() => {
    if (tab === "deployments" && companyDeployments.length === 0 && !deployLoading) loadDeployments();
    if (tab === "notfound" && notFoundRows.length === 0 && !notFoundLoading) loadNotFoundLog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const deleteCompanyDeployment = async (id: string, name: string) => {
    if (!confirm(`Delete onboarding record for "${name}"? This won't delete any data already imported.`)) return;
    try {
      await db.from("company_deployments").delete().eq("id", id);
      toast({ title: "Deployment record removed" });
      loadDeployments();
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" as any });
    }
  };

  const clearNotFoundLog = async () => {
    if (!confirm("Delete ALL 404 log entries?")) return;
    const { error } = await db.from("not_found_log").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" as any });
    toast({ title: "404 log cleared" });
    loadNotFoundLog();
  };

  const toggleModule = async (key: string) => {
    const cur = settings[key] !== "false";
    setSaving(key);
    await saveSetting(key, cur ? "false" : "true");
    setSaving(null);
    toast({ title: `${MODULES.find(m=>m.key===key)?.label}: ${cur?"Disabled":"Enabled"}` });
  };

  const saveSysForm = async () => {
    setSaving("sys");
    const res = await saveSettings(sysForm, "system");
    setSaving(null);
    if (res.ok) toast({ title: "System settings saved" });
    else toast({ title: "Save failed", description: res.error, variant: "destructive" });
  };

  const sendBroadcast = async () => {
    if (!broadcast.trim()) return;
    setBroadcasting(true);
    await db.from("system_broadcasts").insert({ message: broadcast, type: broadcastType, is_active:true, created_at: new Date().toISOString() });
    setBroadcast(""); setBroadcasting(false);
    toast({ title: "Broadcast sent to all users" });
  };

  const runCmd = (cmd: string) => {
    const c = cmd.trim();
    if (!c) return;
    setTermHistory(p => [...p.slice(-99), c]);
    setHistIdx(-1);
    const lc = c.toLowerCase();
    add(`$ ${c}`, "cmd");

    // ── HELP ──────────────────────────────────────────────────────────────
    if (lc === "help") {
      addSection([
        "┌─ EL5 MediProcure CLI Commands ─────────────────────────────────┐",
        "│  General          │  Database         │  System               │",
        "│  help            │  status           │  uptime               │",
        "│  clear / cls     │  users            │  modules              │",
        "│  ping            │  reqs             │  items                │",
        "│  whoami          │  notifs           │  version              │",
        "│                                                            │",
        "│  Navigation     │  Realtime         │  Query (PRO)           │",
        "│  nav <path>     │  subscribe        │  exec <table>         │",
        "│  reload         │  unsubscribe      │  count <table>        │",
        "│  exit           │  rt on|off        │  stats                │",
        "└────────────────────────────────────────────────────────────────┘",
      ]);
    }
    // ── PING ────────────────────────────────────────────────────────────
    else if (lc === "ping") {
      const t0 = Date.now();
      add(`🏓 Pinging Supabase...`);
      db.from("profiles").select("id",{count:"exact",head:true}).then((r:any)=>{
        const ms = Date.now()-t0;
        if(r.error) add(`❌ DB error: ${r.error.message}`,"error");
        else add(`✅ Pong! DB responded in ${ms}ms · ${r.count} profiles`,"success");
      });
    }
    // ── STATUS ─────────────────────────────────────────────────────────
    else if (lc === "status") {
      addSection(["┌─ System Status ────────────────────────────────────────────────────┐"]);
      addTable([
        ["Database",     "Supabase PostgreSQL"],
        ["Realtime",     rtConnected?"CONNECTED":"DISCONNECTED"],
        ["Users",        `${liveStats.users} total`],
        ["Requisitions", `${liveStats.reqs} total`],
        ["Items",        `${liveStats.items} total`],
        ["Notifications",`${liveStats.notifs} unread`],
        ["Uptime",        liveStats.uptime||"—"],
        ["Build",         "v22.10.0"],
      ]);
      add(`└─────────────────────────────────────────────────────────────────────┘`);
    }
    // ── UPTIME ─────────────────────────────────────────────────────────
    else if (lc === "uptime") {
      add(`⏱ Session uptime: ${liveStats.uptime||"—"}`);
      add(`📅 Started: ${new Date(startTime.current).toLocaleString("en-KE")}`);
    }
    // ── USERS ───────────────────────────────────────────────────────────
    else if (lc === "users") {
      add(`👥 Total users: ${liveStats.users}`);
      add(`🔔 Unread notifications: ${liveStats.notifs}`);
    }
    // ── REQS ────────────────────────────────────────────────────────────
    else if (lc === "reqs" || lc === "requisitions") {
      add(`📋 Total requisitions: ${liveStats.reqs}`);
    }
    // ── ITEMS ───────────────────────────────────────────────────────────
    else if (lc === "items") {
      add(`📦 Total items: ${liveStats.items}`);
    }
    // ── NOTIFS ───────────────────────────────────────────────────────────
    else if (lc === "notifs") {
      add(`🔔 Unread notifications: ${liveStats.notifs}`);
    }
    // ── MODULES ────────────────────────────────────────────────────────
    else if (lc === "modules") {
      addSection(["┌─ Module Status ───────────────────────────────────────────────────┐"]);
      MODULES.forEach(m => {
        const enabled = settings[m.key] !== "false";
        add(`  ${enabled?"✅":"❌"} ${m.label.padEnd(20)} ${enabled?"ENABLED":"DISABLED"}`);
      });
      add(`└─────────────────────────────────────────────────────────────────────┘`);
    }
    // ── WHOAMI ─────────────────────────────────────────────────────────
    else if (lc === "whoami") {
      addSection(["┌─ Current Session ──────────────────────────────────────────────────┐"]);
      addTable([
        ["Email",    user?.email||"—"],
        ["Username",  user?.email?.split("@")[0]||user?.email||"—"],
        ["Roles",     roles?.join(", ")||"—"],
        ["Session",   rtConnected?"LIVE":"OFFLINE"],
      ]);
      add(`└─────────────────────────────────────────────────────────────────────┘`);
    }
    // ── VERSION ────────────────────────────────────────────────────────
    else if (lc === "version" || lc === "ver") {
      addSection(["┌─ Version Info ──────────────────────────────────────────────────┐"]);
      addTable([
        ["App Build",  "v22.10.0"],
        ["Framework",   "React 18 + Vite 5"],
        ["Database",    "Supabase PostgreSQL 15"],
        ["Auth",        "Supabase Auth (PKCE)"],
        ["Realtime",    "Supabase Realtime WS"],
        ["Deploy",      "EdgeOne CDN"],
      ]);
      add(`└─────────────────────────────────────────────────────────────────────┘`);
    }
    // ── STATS ──────────────────────────────────────────────────────────
    else if (lc === "stats") {
      addSection(["┌─ Live Statistics ──────────────────────────────────────────────────┐"]);
      addTable([
        ["Profiles",    String(liveStats.users)],
        ["Requisitions", String(liveStats.reqs)],
        ["Items",       String(liveStats.items)],
        ["Notifs",      String(liveStats.notifs)],
        ["Realtime",    rtConnected?"LIVE":"OFF"],
      ]);
      add(`└─────────────────────────────────────────────────────────────────────┘`);
    }
    // ── CLEAR / CLS ────────────────────────────────────────────────────
    else if (lc === "clear" || lc === "cls") {
      setTermOutput(["Terminal cleared · type 'help' for commands"]);
      return;
    }
    // ── RELOAD ─────────────────────────────────────────────────────────
    else if (lc === "reload" || lc === "refresh") {
      add("🔄 Reloading page...");
      setTimeout(() => window.location.reload(), 500);
      return;
    }
    // ── NAV ─────────────────────────────────────────────────────────────
    else if (lc.startsWith("nav ")) {
      const path = c.slice(4).trim();
      add(`🧭 Navigating to ${path}...`);
      setTimeout(() => nav(path), 300);
      return;
    }
    // ── EXIT ───────────────────────────────────────────────────────────
    else if (lc === "exit" || lc === "quit") {
      add("Use the sidebar navigation to leave this page.", "warn");
    }
    // ── SUBSCRIBE / UNSUBSCRIBE ────────────────────────────────────────
    else if (lc === "subscribe") {
      if (!realtimeFeed) { setRealtimeFeed(true); add("📡 Enabling realtime feed...","info"); }
      else add("📡 Realtime feed is already ON","info");
    }
    else if (lc === "unsubscribe" || lc === "rt off") {
      if (realtimeFeed) { setRealtimeFeed(false); add("📡 Realtime feed paused","warn"); }
      else add("📡 Realtime feed is already OFF","warn");
    }
    else if (lc === "rt on") { setRealtimeFeed(true); add("📡 Realtime feed ENABLED","success"); }
    // ── EXEC <table> — PRO QUERY ───────────────────────────────────────
    else if (lc.startsWith("exec ") || lc.startsWith("query ")) {
      const table = (lc.startsWith("exec ") ? c.slice(5) : c.slice(6)).trim();
      if (!table) { add("Usage: exec <table_name> [limit=10]","warn"); return; }
      const limit = parseInt(table.split(" ").find(p=>!isNaN(+p))||"10");
      const tbl = table.split(" ")[0];
      add(`🔍 Executing: SELECT * FROM ${tbl} LIMIT ${limit}...`);
      const t0 = Date.now();
      db.from(tbl).select("*").limit(limit).then(async (r:any)=>{
        const ms = Date.now()-t0;
        if (r.error) { add(`❌ Error: ${r.error.message}`,"error"); return; }
        const rows = r.data||[];
        add(`✅ ${rows.length} rows returned in ${ms}ms`,"success");
        rows.slice(0,5).forEach((row:any,i:number)=>{
          const cols = Object.keys(row).slice(0,6).join(" | ");
          add(`  [${i+1}] ${cols}`,"info");
        });
        if(rows.length>5) add(`  ... and ${rows.length-5} more rows (use limit:N to change)`,"warn");
      }).catch((e:any)=>add(`❌ Exception: ${e.message}`,"error"));
    }
    // ── COUNT <table> ─────────────────────────────────────────────────
    else if (lc.startsWith("count ")) {
      const table = c.slice(6).trim();
      if (!table) { add("Usage: count <table_name>","warn"); return; }
      add(`🔢 Counting rows in ${table}...`);
      db.from(table).select("*",{count:"exact",head:true}).then((r:any)=>{
        if(r.error) add(`❌ Error: ${r.error.message}`,"error");
        else add(`📊 ${table}: ${r.count} rows`,"success");
      });
    }
    // ── ECHO ───────────────────────────────────────────────────────────
    else if (lc.startsWith("echo ")) {
      add(c.slice(5));
    }
    // ── DATE ───────────────────────────────────────────────────────────
    else if (lc === "date" || lc === "time") {
      add(`📅 ${new Date().toLocaleString("en-KE",{dateStyle:"full",timeStyle:"long"})}`);
    }
    // ── UNKNOWN ───────────────────────────────────────────────────────
    else {
      add(`Unknown command: '${cmd}' — type 'help' for available commands`,"warn");
    }
  };

  const handleTermKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const val = termInput.trim();
      setTermInput("");
      if (val) { runCmd(val); setHistIdx(-1); }
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const newIdx = histIdx < termHistory.length - 1 ? histIdx + 1 : histIdx;
      setHistIdx(newIdx);
      if (termHistory[termHistory.length - 1 - newIdx]) setTermInput(termHistory[termHistory.length - 1 - newIdx]);
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const newIdx = histIdx > 0 ? histIdx - 1 : -1;
      setHistIdx(newIdx);
      setTermInput(newIdx < 0 ? "" : (termHistory[termHistory.length - 1 - newIdx] || ""));
    }
    if (e.key === "l" && e.ctrlKey) { e.preventDefault(); setTermOutput(["Terminal cleared"]); }
  };

  const TABS: { id:WMTab; label:string; icon:any }[] = [
    { id:"overview",    label:"Overview",     icon:Monitor    },
    { id:"modules",     label:"Modules",      icon:Package    },
    { id:"roles",       label:"Role Caps",    icon:Shield     },
    { id:"system",      label:"System",       icon:Settings   },
    { id:"codebase",    label:"Codebase",     icon:Code2      },
    { id:"broadcast",   label:"Broadcast",    icon:Radio      },
    { id:"terminal",    label:"Terminal",     icon:Terminal   },
    { id:"deploy",      label:"CI/CD Deploy", icon:ArrowRight },
    { id:"deployments", label:"Company Onboarding", icon:Building2 },
    { id:"notfound",    label:"404 Log",      icon:AlertCircle },
  ];

  const filteredFiles = CODE_FILES.filter(f => !codeSearch ||
    f.path.toLowerCase().includes(codeSearch.toLowerCase()) ||
    f.desc.toLowerCase().includes(codeSearch.toLowerCase()));

  return (
    <div style={{ background:T.bg, minHeight:"100vh" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Teal hero — matches the Admin Hub visual style, replaces the old breadcrumb + small header */}
      <div style={{ background:"linear-gradient(135deg,#107C73,#0a5a52)", padding:"24px 24px 28px" }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:42, height:42, borderRadius:10, background:"rgba(255,255,255,.15)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Globe size={20} color="#fff"/>
            </div>
            <div>
              <h1 style={{ margin:0, fontSize:22, fontWeight:300, color:"#fff", letterSpacing:"-.02em" }}>Webmaster / Superadmin Control Centre</h1>
              <div style={{ fontSize:12, color:"rgba(255,255,255,.75)", marginTop:2 }}>
                System control · Deployments · 404 tracking · CI/CD · {roles.filter(r=>["superadmin","webmaster","admin"].includes(r)).join(", ")||"admin"}
              </div>
            </div>
          </div>
          <button onClick={loadKpis} style={{ padding:"8px 12px", background:"rgba(255,255,255,.15)", border:"1px solid rgba(255,255,255,.3)", borderRadius:6, color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>
            <RefreshCw size={13}/> Refresh
          </button>
        </div>
      </div>

      <div style={{ padding:20 }}>

      {/* Tabs */}
      <div style={{ display:"flex", gap:2, marginBottom:16, borderBottom:`1px solid ${T.border}`, overflowX:"auto" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            display:"flex", alignItems:"center", gap:7, padding:"10px 16px",
            background:"transparent", border:"none",
            borderBottom:`2px solid ${tab===t.id?T.primary:"transparent"}`,
            color:tab===t.id?T.primary:T.fgMuted, fontSize:12, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap",
          }}><t.icon size={14}/>{t.label}</button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab==="overview" && (
        <div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10, marginBottom:16 }}>
            {[
              { label:"Users",         value:kpis.users,       icon:Users,    color:T.primary,  path:"/users"        },
              { label:"Requisitions",  value:kpis.requisitions,icon:Package,  color:"#7c3aed",  path:"/requisitions" },
              { label:"Suppliers",     value:kpis.suppliers,   icon:Globe,    color:"#059669",  path:"/suppliers"    },
              { label:"Items",         value:kpis.items,       icon:Hash,     color:"#d97706",  path:"/items"        },
              { label:"Unread Notifs", value:kpis.unread,      icon:Bell,     color:"#dc2626",  path:"/notifications"},
            ].map(k => (
              <div key={k.label} onClick={() => nav(k.path)} style={{ ...card, cursor:"pointer", textAlign:"center", padding:"16px 12px" }}
                onMouseEnter={e=>(e.currentTarget.style.borderColor=k.color)} onMouseLeave={e=>(e.currentTarget.style.borderColor=T.border)}>
                <k.icon size={20} color={k.color} style={{ margin:"0 auto 8px", display:"block" }}/>
                <div style={{ fontSize:26, fontWeight:900, color:T.fg }}>{k.value ?? 0}</div>
                <div style={{ fontSize:10, color:T.fgDim, marginTop:2 }}>{k.label}</div>
              </div>
            ))}
          </div>

          {/* Module status */}
          <div style={{ ...card, marginBottom:14 }}>
            <div style={{ fontWeight:700, color:T.fg, fontSize:14, marginBottom:12 }}>Module Status</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:8 }}>
              {MODULES.map(m => {
                const enabled = settings[m.key] !== "false";
                return (
                  <div key={m.key} style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 12px", background:T.bg, borderRadius:8, border:`1px solid ${T.border}` }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:enabled?T.success:T.error, flexShrink:0 }}/>
                    <span style={{ fontSize:12, color:T.fg, flex:1 }}>{m.label}</span>
                    <button onClick={() => toggleModule(m.key)} style={{ padding:"3px 10px", borderRadius:6, border:`1px solid ${enabled?T.success:T.error}44`, background:enabled?T.successBg:T.errorBg, color:enabled?T.success:T.error, fontSize:10, fontWeight:700, cursor:"pointer" }}>
                      {saving===m.key ? "..." : enabled?"ON":"OFF"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick links */}
          <div style={card}>
            <div style={{ fontWeight:700, color:T.fg, fontSize:14, marginBottom:12 }}>Quick Actions</div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {[
                { label:"Users",         icon:Users,    path:"/users",           color:T.primary  },
                { label:"GUI Editor",    icon:Eye,      path:"/gui-editor",      color:"#7c3aed"  },
                { label:"IP Access",     icon:Shield,   path:"/ip-access",       color:"#059669"  },
                { label:"Audit Log",     icon:BookOpen, path:"/audit-log",       color:"#0891b2"  },
                { label:"SMS Settings",  icon:Cpu,      path:"/sms",             color:"#c45910"  },
              ].map(a => (
                <button key={a.path} onClick={() => nav(a.path)} style={{ ...btn(a.color), fontSize:11, padding:"6px 12px" }}>
                  <a.icon size={12}/>{a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MODULES ── */}
      {tab==="modules" && (
        <div style={card}>
          <div style={{ fontWeight:800, color:T.fg, fontSize:15, marginBottom:16 }}>System Module Controls</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {MODULES.map(m => {
              const enabled = settings[m.key] !== "false";
              return (
                <div key={m.key} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px", background:T.bg, borderRadius:10, border:`1px solid ${enabled?T.border:T.error+"44"}` }}>
                  <m.icon size={16} color={m.color}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:T.fg }}>{m.label}</div>
                    <div style={{ fontSize:10, color:T.fgDim }}>Key: <code>{m.key}</code></div>
                  </div>
                  <span style={{ fontSize:12, color:enabled?T.success:T.error, fontWeight:700, width:70, textAlign:"right" }}>{enabled?"ENABLED":"DISABLED"}</span>
                  <button onClick={() => toggleModule(m.key)} disabled={saving===m.key} style={{ ...btn(enabled?T.error:T.success), padding:"7px 18px" }}>
                    {saving===m.key ? <RefreshCw size={12} style={{ animation:"spin 1s linear infinite" }}/> : enabled ? <><Lock size={12}/> Disable</> : <><Unlock size={12}/> Enable</>}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ROLE CAPS ── */}
      {tab==="roles" && (
        <div>
          <div style={{ fontSize:12, color:T.fgMuted, marginBottom:12 }}>
            Role capabilities define what each role can do. Assign roles in the <button onClick={() => nav("/users")} style={{ background:"transparent", border:"none", cursor:"pointer", color:T.primary, fontWeight:700, fontSize:12 }}>Users page</button>.
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:12 }}>
            {Object.entries(ROLE_CAPS).map(([role, caps]) => (
              <div key={role} style={card}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                  <Shield size={14} color={T.primary}/>
                  <span style={{ fontWeight:800, fontSize:13, color:T.fg, textTransform:"capitalize" }}>{role.replace(/_/g," ")}</span>
                  <span style={{ fontSize:9, padding:"2px 7px", borderRadius:99, background:`${T.primary}22`, color:T.primary }}>{caps.length} caps</span>
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                  {caps.map(cap => (
                    <span key={cap} style={{ padding:"2px 8px", borderRadius:6, fontSize:10, fontWeight:600, background:T.bg, color:T.fgMuted, border:`1px solid ${T.border}` }}>
                      {cap.replace(/_/g," ")}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SYSTEM SETTINGS ── */}
      {tab==="system" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <div style={card}>
            <div style={{ fontWeight:800, color:T.fg, fontSize:15, marginBottom:16 }}>Hospital & System Settings</div>
            {[
              { key:"hospital_name",    label:"Hospital Name",    placeholder:"Embu Level 5 Hospital"    },
              { key:"system_name",      label:"System Name",      placeholder:"EL5 MediProcure"           },
              { key:"hospital_address", label:"Address",          placeholder:"Embu Town, Embu County"   },
              { key:"hospital_phone",   label:"Phone",            placeholder:"+254 060 000000"           },
              { key:"hospital_email",   label:"Email",            placeholder:"info@embu.health.go.ke"   },
              { key:"system_currency",  label:"Currency Symbol",  placeholder:"KES"                      },
              { key:"system_timezone",  label:"Timezone",         placeholder:"Africa/Nairobi"            },
              { key:"vat_rate",         label:"VAT Rate (%)",     placeholder:"16"                        },
              { key:"doc_footer",       label:"Document Footer",  placeholder:"Embu Level 5 Hospital"    },
            ].map(({ key, label, placeholder }) => (
              <div key={key} style={{ marginBottom:12 }}>
                <label style={{ fontSize:11, color:T.fgDim, fontWeight:700, display:"block", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.05em" }}>{label}</label>
                <input
                  value={sysForm[key] ?? ""}
                  onChange={e => setSysForm(p => ({ ...p, [key]: e.target.value }))}
                  style={inp}
                  placeholder={placeholder}
                />
              </div>
            ))}
            <div style={{ display:"flex", justifyContent:"flex-end", marginTop:8 }}>
              <button onClick={saveSysForm} disabled={saving==="sys"} style={btn(T.primary)}>
                {saving==="sys" ? <RefreshCw size={13} style={{ animation:"spin 1s linear infinite" }}/> : <Save size={13}/>}
                {saving==="sys" ? "Saving..." : "Save All Settings"}
              </button>
            </div>
          </div>

          <div>
            {/* System info */}
            <div style={{ ...card, marginBottom:14 }}>
              <div style={{ fontWeight:800, color:T.fg, fontSize:14, marginBottom:12 }}>System Information</div>
              {[
                ["Version",       "6.0.0"],
                ["Framework",     "React 18 + Vite 5"],
                ["Database",      "Supabase (PostgreSQL 15)"],
                ["Auth",          "Supabase Auth (PKCE)"],
                ["Realtime",      "Supabase Realtime WS"],
                ["SMS",           "Twilio +16812972643"],
                ["Deploy",        "EdgeOne CDN"],
                ["Repo",          "github.com/huiejorjdsksfn/medi-procure-hub"],
              ].map(([k,v]) => (
                <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:`1px solid ${T.border}22`, fontSize:12 }}>
                  <span style={{ color:T.fgDim }}>{k}</span>
                  <code style={{ color:T.fg, fontSize:11 }}>{v}</code>
                </div>
              ))}
            </div>

            {/* Security toggles */}
            <div style={card}>
              <div style={{ fontWeight:800, color:T.fg, fontSize:14, marginBottom:12 }}>Security & Access</div>
              {[
                { key:"maintenance_mode",      label:"Maintenance Mode",      desc:"Show maintenance page to all users" },
                { key:"ip_restriction_enabled",label:"IP Restriction",         desc:"Block IPs not in whitelist" },
                { key:"allow_all_private",     label:"Allow All Private IPs", desc:"Auto-allow 192.168.x, 10.x" },
                { key:"log_all_ips",           label:"Log All IPs",           desc:"Record every access to ip_access_log" },
              ].map(({ key, label, desc }) => {
                const enabled = settings[key] === "true";
                return (
                  <div key={key} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:`1px solid ${T.border}22` }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:T.fg }}>{label}</div>
                      <div style={{ fontSize:10, color:T.fgDim }}>{desc}</div>
                    </div>
                    <button onClick={async () => { await saveSetting(key, enabled?"false":"true"); toast({ title:`${label}: ${enabled?"Off":"On"}` }); }} style={{ background:"none", border:"none", cursor:"pointer", padding:0 }}>
                      <span style={{ display:"inline-flex", width:44, height:24, borderRadius:12, background:enabled?T.success:T.border, alignItems:"center", padding:2, transition:"background .2s" }}>
                        <span style={{ width:20, height:20, borderRadius:"50%", background:"#fff", transition:"transform .2s", transform:enabled?"translateX(20px)":"translateX(0)", boxShadow:"0 1px 3px rgba(0,0,0,.3)" }}/>
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── CODEBASE ── */}
      {tab==="codebase" && (
        <div style={{ display:"grid", gridTemplateColumns:"280px 1fr", gap:14, height:"calc(100vh - 220px)" }}>
          <div style={{ ...card, overflowY:"auto", padding:12 }}>
            <div style={{ fontWeight:700, color:T.fg, fontSize:13, marginBottom:10 }}>Files</div>
            <div style={{ position:"relative", marginBottom:10 }}>
              <Search size={12} color={T.fgDim} style={{ position:"absolute", left:8, top:"50%", transform:"translateY(-50%)" }}/>
              <input value={codeSearch} onChange={e=>setCodeSearch(e.target.value)} placeholder="Search..." style={{ ...inp, paddingLeft:26, fontSize:11 }}/>
            </div>
            {["Core","Auth","UI","Pages","Admin","Engine","Edge","CI/CD"].map(group => {
              const gf = filteredFiles.filter(f => f.group===group);
              if (!gf.length) return null;
              return (
                <div key={group} style={{ marginBottom:8 }}>
                  <div style={{ fontSize:10, fontWeight:800, color:GROUP_COLORS[group]||T.fgDim, letterSpacing:.06, marginBottom:4 }}>{group}</div>
                  {gf.map(f => (
                    <button key={f.path} onClick={() => { setSelectedFile(f); setEditMode(false); setFileContent(`// ${f.path}\n// ${f.desc}\n// View from GitHub or edit via system_settings`); }}
                      style={{ width:"100%", display:"flex", flexDirection:"column", padding:"6px 8px", background:selectedFile?.path===f.path?`${T.primary}18`:"transparent", border:"none", borderRadius:6, cursor:"pointer", textAlign:"left", marginBottom:2 }}>
                      <span style={{ fontSize:11, color:selectedFile?.path===f.path?T.primary:T.fg, fontFamily:"monospace" }}>{f.path.split("/").pop()}</span>
                      <span style={{ fontSize:9, color:T.fgDim }}>{f.desc}</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
          <div style={{ ...card, display:"flex", flexDirection:"column", padding:0, overflow:"hidden" }}>
            {selectedFile ? (
              <>
                <div style={{ padding:"12px 16px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
                  <Code2 size={14} color={T.primary}/>
                  <span style={{ fontWeight:700, fontSize:12, color:T.fg, fontFamily:"monospace", flex:1 }}>{selectedFile.path}</span>
                  <button onClick={() => setEditMode(p=>!p)} style={btn(editMode?T.success:T.bg, editMode?undefined:T.border)}>
                    {editMode ? <><Check size={12}/> Editing</> : <><Edit3 size={12}/> Edit</>}
                  </button>
                  <button onClick={() => navigator.clipboard.writeText(fileContent).then(() => toast({ title:"Copied" }))} style={btn(T.bg, T.border)}><Copy size={12}/></button>
                  {editMode && <button onClick={async () => { await db.from("system_settings").upsert({ key:`codebase_${selectedFile.path.replace(/\//g,"_")}`, value:fileContent, category:"codebase" }, { onConflict:"key" }); toast({ title:"Saved" }); }} style={btn(T.primary)}><Save size={12}/> Save</button>}
                </div>
                <textarea value={fileContent} onChange={e=>setFileContent(e.target.value)} readOnly={!editMode}
                  style={{ flex:1, background:"#0a0f1e", color:"#e2e8f0", border:"none", outline:"none", padding:16, fontFamily:"'Fira Code','Courier New',monospace", fontSize:12, lineHeight:1.8, resize:"none" }}/>
              </>
            ) : (
              <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:T.fgDim, flexDirection:"column", gap:10 }}>
                <Code2 size={40} color={T.fgDim}/>
                <div style={{ fontSize:14, fontWeight:600 }}>Select a file</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── BROADCAST ── */}
      {tab==="broadcast" && (
        <div style={{ maxWidth:680 }}>
          <div style={card}>
            <div style={{ fontWeight:800, color:T.fg, fontSize:15, marginBottom:16 }}>System Broadcast</div>
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:11, color:T.fgDim, display:"block", marginBottom:6 }}>Message Type</label>
              <div style={{ display:"flex", gap:8 }}>
                {(["info","warning","error"] as const).map(t => (
                  <button key={t} onClick={() => setBroadcastType(t)} style={{ ...btn(broadcastType===t?(t==="info"?T.primary:t==="warning"?T.warning:T.error):T.bg,broadcastType===t?undefined:T.border), textTransform:"capitalize", padding:"6px 16px" }}>{t}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:11, color:T.fgDim, display:"block", marginBottom:4 }}>Message</label>
              <textarea value={broadcast} onChange={e=>setBroadcast(e.target.value)} rows={4}
                style={{ ...inp, resize:"vertical" }} placeholder="System-wide message..."/>
            </div>
            <button onClick={sendBroadcast} disabled={broadcasting||!broadcast.trim()} style={btn(T.primary)}>
              {broadcasting ? <RefreshCw size={13} style={{ animation:"spin 1s linear infinite" }}/> : <Radio size={13}/>}
              {broadcasting ? "Sending..." : "Send to All Users"}
            </button>
          </div>
        </div>
      )}

      {/* ── TERMINAL ── */}
      {tab==="terminal" && (
        <div style={{ ...card, fontFamily:"monospace", padding:0 }}>
          {/* Terminal header bar */}
          <div style={{ padding:"12px 16px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", gap:10 }}>
            <Terminal size={14} color={T.primary}/>
            <span style={{ fontWeight:800, color:T.fg, fontSize:13 }}>Webmaster Console PRO v6.0</span>
            <div style={{ marginLeft:"auto", display:"flex", gap:8, alignItems:"center" }}>
              {/* Live stats */}
              <div style={{ display:"flex", gap:10, fontSize:10, color:T.fgDim }}>
                <span>👥 {liveStats.users}</span>
                <span>📋 {liveStats.reqs}</span>
                <span>📦 {liveStats.items}</span>
              </div>
              {/* Realtime indicator */}
              <button onClick={()=>setRealtimeFeed(p=>!p)} style={{ display:"flex", alignItems:"center", gap:4, padding:"3px 10px", borderRadius:99, border:`1px solid ${realtimeFeed?"#10b981":"#e2e8f0"}`, background:realtimeFeed?"#10b98118":"transparent", cursor:"pointer", fontSize:10, fontWeight:700, color:realtimeFeed?"#10b981":T.fgDim }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background:realtimeFeed?"#10b981":T.border, animation:realtimeFeed?"pulse 2s infinite":"none" }}/>
                {realtimeFeed?"LIVE":"OFF"}
              </button>
              {/* Uptime */}
              <span style={{ fontSize:10, color:T.fgDim }}>⏱ {liveStats.uptime||"—"}</span>
              <button onClick={()=>setTermOutput([])} style={{ background:"none", border:`1px solid ${T.border}`, borderRadius:6, padding:"2px 8px", cursor:"pointer", fontSize:10, color:T.fgDim }}>Clear</button>
            </div>
          </div>
          {/* Terminal output */}
          <div ref={termRef} style={{ background:"#0a0f1e", borderRadius:0, padding:16, height:420, overflowY:"auto", fontSize:12, lineHeight:1.8 }}>
            {termOutput.map((l, i) => {
              const isCmd = l.startsWith("›")||l.startsWith("$");
              const isSuccess = l.includes("✅");
              const isError = l.includes("❌");
              const isWarn = l.includes("⚠");
              const isInfo = l.includes("📡")||l.includes("📋")||l.includes("📊")||l.includes("📦")||l.includes("📋")||l.includes("📅")||l.includes("📅");
              const isHeader = l.startsWith("┌")||l.startsWith("│")||l.startsWith("└");
              return (
                <div key={i} style={{
                  color: isCmd?"#22c55e":isError?"#ef4444":isWarn?"#f59e0b":isSuccess?"#4ade80":isHeader?"#7dd3fc":isInfo?"#38bdf8":"#94a3b8",
                  whiteSpace:"pre-wrap",
                  wordBreak:"break-all",
                  paddingTop: isHeader?0:0,
                }}>{l}</div>
              );
            })}
          </div>
          {/* Terminal input */}
          <div style={{ display:"flex", gap:0, alignItems:"center", borderTop:`1px solid #1e293b`, background:"#0d1117", padding:"8px 12px" }}>
            <span style={{ color:"#22c55e", fontWeight:900, fontSize:14, marginRight:8, flexShrink:0 }}>›</span>
            <input
              value={termInput}
              onChange={e=>setTermInput(e.target.value)}
              onKeyDown={handleTermKey}
              style={{ flex:1, background:"transparent", border:"none", outline:"none", color:"#e2e8f0", fontFamily:"'Fira Code','Courier New',monospace", fontSize:12 }}
              placeholder="Type 'help' for commands..."
              autoComplete="off"
              spellCheck={false}
            />
            <button onClick={()=>runCmd(termInput)} disabled={!termInput.trim()} style={{ background:termInput.trim()?"#22c55e":"#1e293b", border:"none", borderRadius:6, padding:"4px 12px", color:"#fff", fontSize:11, fontWeight:700, cursor:termInput.trim()?"pointer":"not-allowed", opacity:termInput.trim()?1:0.5 }}>
              <Play size={12}/>
            </button>
          </div>
          <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
        </div>
      )}

      {/* ── DEPLOY ── */}
      {tab==="deploy" && (
        <div style={{ maxWidth:680 }}>
          <div style={card}>
            <div style={{ fontWeight:800, color:T.fg, fontSize:15, marginBottom:14, display:"flex", alignItems:"center", gap:10 }}>
              <ArrowRight size={18} color={T.primary}/> Deploy to Production
            </div>
            <div style={{ fontSize:12, color:T.fgMuted, marginBottom:16, lineHeight:1.7 }}>
              Push changes to GitHub. CI/CD pipeline builds and deploys to EdgeOne automatically.
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:11, color:T.fgDim, display:"block", marginBottom:4 }}>Commit Message</label>
              <input id="commit_msg" defaultValue={`feat: admin update ${new Date().toISOString().slice(0,10)}`} style={inp}/>
            </div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:16 }}>
              {["feat: ui enhancements","fix: role permissions","fix: 404 routing","feat: new module","docs: update changelog"].map(m => (
                <button key={m} onClick={() => { const i = document.getElementById("commit_msg") as HTMLInputElement; if(i)i.value=m; }}
                  style={{ padding:"4px 10px", borderRadius:6, fontSize:10, fontWeight:600, background:T.bg, border:`1px solid ${T.border}`, color:T.fgMuted, cursor:"pointer" }}>{m}</button>
              ))}
            </div>
            <button onClick={async () => {
              const msg = (document.getElementById("commit_msg") as HTMLInputElement)?.value || "feat: admin update";
              await db.from("system_settings").upsert({ key:"last_deploy_message", value:msg, category:"deploy" }, { onConflict:"key" });
              toast({ title:"Deploy triggered", description:"GitHub Actions CI/CD will build and deploy automatically." });
              setTab("terminal");
            }} style={{ ...btn(T.primary), marginBottom:16 }}>
              <ArrowRight size={13}/> Trigger Deploy
            </button>

            <div style={{ ...card, background:T.bg }}>
              <div style={{ fontWeight:700, color:T.fg, fontSize:12, marginBottom:10 }}>CI/CD Pipeline</div>
              {[["Build","passing"],["Tests","passing"],["Edge Functions","deployed"],["DB Migrations","applied"],["EdgeOne Deploy","live"]].map(([label,status]) => (
                <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:`1px solid ${T.border}22`, fontSize:12 }}>
                  <span style={{ color:T.fgDim }}>{label}</span>
                  <span style={{ color:T.success, fontWeight:700 }}>{status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── COMPANY ONBOARDING (merged from Deployments) ── */}
      {tab==="deployments" && (() => {
        const stats = {
          total: companyDeployments.length,
          completed: companyDeployments.filter(d => d.status === "completed").length,
          inProgress: companyDeployments.filter(d => ["draft","db_connected","importing","review"].includes(d.status)).length,
          failed: companyDeployments.filter(d => d.status === "failed").length,
          rowsImported: deployJobs.reduce((s, j) => s + (j.imported_rows || 0), 0),
          activeConnections: deployConnections.filter(c => c.status === "active").length,
        };
        const STATUS_CFG: Record<string, { color:string; bg:string; label:string }> = {
          draft:        { color:T.fgMuted, bg:T.bg2,      label:"Draft" },
          db_connected: { color:T.info,    bg:`${T.info}14`, label:"DB Connected" },
          importing:    { color:T.warning, bg:T.warningBg,   label:"Importing" },
          review:       { color:T.warning, bg:T.warningBg,   label:"In Review" },
          completed:    { color:T.success, bg:T.successBg,   label:"Completed" },
          failed:       { color:T.error,   bg:T.errorBg,     label:"Failed" },
        };
        const STAT_CARDS = [
          { label:"Total Deployments", val:stats.total, col:T.primary, icon:Building2 },
          { label:"Completed", val:stats.completed, col:T.success, icon:CheckCircle2 },
          { label:"In Progress", val:stats.inProgress, col:T.warning, icon:Clock },
          { label:"Failed", val:stats.failed, col:T.error, icon:AlertTriangle },
          { label:"Rows Imported", val:stats.rowsImported, col:"#7c3aed", icon:Database },
          { label:"Active DB Links", val:stats.activeConnections, col:"#0ea5e9", icon:Cable },
        ];
        return (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", flexWrap:"wrap", gap:12, marginBottom:16 }}>
              <p style={{ margin:0, fontSize:12, color:T.fgMuted, maxWidth:520, lineHeight:1.6 }}>
                Onboard a new company or facility — set up their database link, import legacy data, and go live.
              </p>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={loadDeployments} style={btn(T.bg, T.border)}><RefreshCw size={13} style={{animation:deployLoading?"spin 1s linear infinite":"none"}}/> Refresh</button>
                <button onClick={() => nav("/admin/deployments/new")} style={btn(T.primary)}><Plus size={14}/> New Company Onboarding</button>
              </div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(6, minmax(0,1fr))", gap:10, marginBottom:20 }}>
              {STAT_CARDS.map(s => (
                <div key={s.label} style={{ ...card, padding:"14px 16px", borderTop:`3px solid ${s.col}` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                    <s.icon size={15} color={s.col}/>
                    <span style={{ fontSize:11, color:T.fgMuted, textTransform:"uppercase", letterSpacing:".03em", fontWeight:600 }}>{s.label}</span>
                  </div>
                  <div style={{ fontSize:24, fontWeight:800, color:s.col }}>{deployLoading ? "—" : s.val}</div>
                </div>
              ))}
            </div>

            <div style={{ ...card, overflow:"hidden" }}>
              <div style={{ padding:"12px 16px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", gap:8 }}>
                <Server size={14} color={T.primary}/>
                <span style={{ fontWeight:700, fontSize:13, color:T.fg }}>Onboarding Pipeline</span>
              </div>
              {deployLoading ? (
                <div style={{ padding:40, textAlign:"center", color:T.fgMuted, fontSize:13 }}>Loading deployments…</div>
              ) : companyDeployments.length === 0 ? (
                <div style={{ padding:40, textAlign:"center", color:T.fgMuted }}>
                  <Building2 size={28} style={{ opacity:.35, marginBottom:8 }}/>
                  <div style={{ fontSize:13 }}>No deployments yet.</div>
                  <button onClick={() => nav("/admin/deployments/new")} style={{ ...btn(T.primary), marginTop:12 }}>
                    <Plus size={14}/> Start onboarding a new company
                  </button>
                </div>
              ) : (
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                  <thead>
                    <tr style={{ background:T.bg2 }}>
                      {["Company","Status","Step","Contact","Created",""].map(h => (
                        <th key={h} style={{ padding:"8px 16px", textAlign:"left", fontSize:11, color:T.fgMuted, fontWeight:600, textTransform:"uppercase", letterSpacing:".03em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {companyDeployments.map(d => {
                      const sc = STATUS_CFG[d.status] || STATUS_CFG.draft;
                      const jobCount = deployJobs.filter(j => j.deployment_id === d.id).length;
                      return (
                        <tr key={d.id} style={{ borderBottom:`1px solid ${T.border}` }}>
                          <td style={{ padding:"10px 16px", fontWeight:600, color:T.fg }}>
                            {d.company_name}
                            {d.facility_code && <span style={{ marginLeft:6, fontSize:11, color:T.fgMuted }}>({d.facility_code})</span>}
                            {jobCount > 0 && <div style={{ fontSize:11, color:T.fgMuted, fontWeight:400 }}>{jobCount} import job{jobCount !== 1 ? "s" : ""}</div>}
                          </td>
                          <td style={{ padding:"10px 16px" }}>
                            <span style={{ padding:"2px 10px", borderRadius:10, fontSize:11, fontWeight:700, background:sc.bg, color:sc.color, textTransform:"uppercase", letterSpacing:".04em" }}>{sc.label}</span>
                          </td>
                          <td style={{ padding:"10px 16px", color:T.fgMuted, fontSize:12 }}>{(d.current_step || "—").replace(/_/g," ")}</td>
                          <td style={{ padding:"10px 16px", color:T.fgMuted, fontSize:12 }}>{d.contact_name || d.contact_email || "—"}</td>
                          <td style={{ padding:"10px 16px", color:T.fgMuted, fontSize:12, whiteSpace:"nowrap" }}>
                            {d.created_at ? new Date(d.created_at).toLocaleDateString("en-KE",{day:"2-digit",month:"short",year:"numeric"}) : "—"}
                          </td>
                          <td style={{ padding:"10px 16px", textAlign:"right", whiteSpace:"nowrap" }}>
                            <button onClick={() => nav(`/admin/deployments/${d.id}`)} style={{ ...btn(`${T.primary}14`, T.primary), padding:"5px 12px", fontSize:12, marginRight:6 }}>
                              {d.status === "completed" ? "View" : "Continue"} <ArrowRight size={12}/>
                            </button>
                            <button onClick={() => deleteCompanyDeployment(d.id, d.company_name)} style={{ ...btn(T.errorBg, T.error), padding:"5px 8px", fontSize:12 }}>
                              <Trash2 size={12}/>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <p style={{ fontSize:11, color:T.fgMuted, marginTop:14, lineHeight:1.5 }}>
              Live SQL Server connections are tested via an on-prem ODBC bridge. Until a bridge agent is configured for a
              site, use the CSV / Excel upload step inside the wizard to bring in legacy data instead.
            </p>
          </div>
        );
      })()}

      {/* ── 404 LOG (merged from NotFoundLogPage) ── */}
      {tab==="notfound" && (() => {
        const filtered = notFoundRows.filter((r:any) =>
          !notFoundFilter ||
          r.path?.toLowerCase().includes(notFoundFilter.toLowerCase()) ||
          (r.user_role || "").toLowerCase().includes(notFoundFilter.toLowerCase()) ||
          (r.ip || "").includes(notFoundFilter)
        );
        const topPaths = Object.entries(
          notFoundRows.reduce((acc: Record<string, number>, r: any) => { acc[r.path] = (acc[r.path] || 0) + 1; return acc; }, {})
        ).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5);
        const thS: React.CSSProperties = { padding:"10px 12px", fontWeight:700, fontSize:11, textTransform:"uppercase", letterSpacing:".05em", color:T.fgMuted };
        const tdS: React.CSSProperties = { padding:"8px 12px", verticalAlign:"top" };
        return (
          <div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:10 }}>
              <div style={{ fontSize:12, color:T.fgMuted, maxWidth:520, lineHeight:1.6 }}>
                Last 500 missing-route events (client + server). Use this to spot broken links and stale deploys.
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={loadNotFoundLog} style={btn(T.bg, T.border)}><RefreshCw size={13} style={{animation:notFoundLoading?"spin 1s linear infinite":"none"}}/> Refresh</button>
                <button onClick={clearNotFoundLog} style={btn(T.errorBg, T.error)}><Trash2 size={13}/> Clear all</button>
              </div>
            </div>

            {topPaths.length > 0 && (
              <div style={{ ...card, marginBottom:14, padding:14 }}>
                <div style={{ fontSize:11, fontWeight:700, color:T.fgMuted, textTransform:"uppercase", letterSpacing:".06em", marginBottom:8 }}>Top missing paths</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:8 }}>
                  {topPaths.map(([p, n]: any) => (
                    <div key={p} style={{ padding:10, border:`1px solid ${T.border}`, borderRadius:6, background:`${T.error}08` }}>
                      <div style={{ fontSize:13, fontWeight:700 }}>{p}</div>
                      <div style={{ fontSize:11, color:T.fgMuted }}>{n} hit{n === 1 ? "" : "s"}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <input value={notFoundFilter} onChange={e => setNotFoundFilter(e.target.value)} placeholder="Filter by path, role, or IP…"
              style={{ ...inp, marginBottom:12 }}/>

            <div style={{ ...card, padding:0, overflow:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                <thead>
                  <tr style={{ background:T.bg2, textAlign:"left" }}>
                    {["When","Path","Source","Role","Visitor","IP","Referrer"].map(h => <th key={h} style={thS}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {notFoundLoading ? (
                    <tr><td colSpan={7} style={{ padding:24, textAlign:"center", color:T.fgMuted }}>Loading…</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={7} style={{ padding:24, textAlign:"center", color:T.fgMuted }}>No 404s recorded 🎉</td></tr>
                  ) : filtered.map((r: any) => (
                    <tr key={r.id} style={{ borderTop:`1px solid ${T.border}` }}>
                      <td style={tdS}>{new Date(r.created_at).toLocaleString()}</td>
                      <td style={{ ...tdS, fontFamily:"monospace", fontWeight:600 }}>{r.path}</td>
                      <td style={tdS}>
                        <span style={{ padding:"2px 8px", borderRadius:4, fontSize:11, fontWeight:600,
                          background: r.source === "server" ? T.successBg : `${T.info}14`,
                          color: r.source === "server" ? T.success : T.info }}>{r.source}</span>
                      </td>
                      <td style={tdS}>{r.user_role || "—"}</td>
                      <td style={tdS}>{r.user_id
                        ? <span style={{ padding:"2px 8px", borderRadius:4, background:T.successBg, color:T.success, fontSize:10, fontWeight:700 }}>Auth</span>
                        : <span style={{ padding:"2px 8px", borderRadius:4, background:T.bg2, color:T.fgMuted, fontSize:10, fontWeight:600 }}>Visitor</span>}
                      </td>
                      <td style={{ ...tdS, fontFamily:"monospace", fontSize:11 }}>{r.ip || "—"}</td>
                      <td style={{ ...tdS, maxWidth:260, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={r.referrer || ""}>{r.referrer || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}
      </div>
    </div>
  );
}
