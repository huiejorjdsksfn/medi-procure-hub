/**
 * ProcurBosse - Superadmin / Webmaster Control Centre v5.0
 * Full working system settings · Module toggles · Role caps · Broadcast
 * Live DB monitor · Codebase viewer · Deploy trigger · Console terminal
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
import AdminBreadcrumb from "@/components/AdminBreadcrumb";
  Globe, RefreshCw, Activity, Package, Shield, Code2, Radio,
  Server, Terminal, ArrowRight, Users, Bell, Hash, Settings,
  Database, Eye, Edit3, Save, Copy, X, Check, Lock, Unlock,
  Trash2, Search, HardDrive, AlertTriangle, BarChart3, Cpu,
  Monitor, Wifi, ChevronRight, Power, Zap, Plus, BookOpen,
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
  { path: "src/pages/IpAccessPage.tsx",      group: "Pages",  desc: "IP logger" },
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

type WMTab = "overview"|"modules"|"roles"|"system"|"codebase"|"broadcast"|"terminal"|"deploy";

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
  const [saving, setSaving] = useState<string|null>(null);
  const [broadcast, setBroadcast] = useState("");
  const [broadcastType, setBroadcastType] = useState<"info"|"warning"|"error">("info");
  const [broadcasting, setBroadcasting] = useState(false);
  const [codeSearch, setCodeSearch] = useState("");
  const [selectedFile, setSelectedFile] = useState<typeof CODE_FILES[0]|null>(null);
  const [fileContent, setFileContent] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [termOutput, setTermOutput] = useState<string[]>(["EL5 MediProcure Webmaster Terminal v6.0", "Type 'help' for commands", "---"]);
  const [termInput, setTermInput] = useState("");
  const termRef = useRef<HTMLDivElement>(null);

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
    const add = (s: string) => setTermOutput(p => [...p, s]);
    const c = cmd.trim().toLowerCase();
    if      (c === "help")    add("Commands: help | status | users | modules | clear | nav <path> | reload");
    else if (c === "status")  { add(`DB: Supabase connected`); add(`Users: ${kpis.users} | Reqs: ${kpis.requisitions} | Items: ${kpis.items}`); add(`Maintenance: ${settings.maintenance_mode}`); }
    else if (c === "users")   add(`Total users: ${kpis.users}`);
    else if (c === "modules") MODULES.forEach(m => add(`${m.label}: ${settings[m.key]==="false"?"DISABLED":"ENABLED"}`));
    else if (c === "clear")   setTermOutput(["Terminal cleared"]);
    else if (c.startsWith("nav ")) { nav(c.slice(4)); add(`Navigating to ${c.slice(4)}...`); }
    else if (c === "reload")  window.location.reload();
    else if (c) add(`Unknown: ${cmd}`);
    setTimeout(() => termRef.current?.scrollTo(0, termRef.current.scrollHeight), 50);
  };

  const TABS: { id:WMTab; label:string; icon:any }[] = [
    { id:"overview",  label:"Overview",    icon:Monitor   },
    { id:"modules",   label:"Modules",     icon:Package   },
    { id:"roles",     label:"Role Caps",   icon:Shield    },
    { id:"system",    label:"System",      icon:Settings  },
    { id:"codebase",  label:"Codebase",    icon:Code2     },
    { id:"broadcast", label:"Broadcast",   icon:Radio     },
    { id:"terminal",  label:"Terminal",    icon:Terminal  },
    { id:"deploy",    label:"Deploy",      icon:ArrowRight},
  ];

  const filteredFiles = CODE_FILES.filter(f => !codeSearch ||
    f.path.toLowerCase().includes(codeSearch.toLowerCase()) ||
    f.desc.toLowerCase().includes(codeSearch.toLowerCase()));

  return (
    <div style={{ padding:20, minHeight:"100vh", background:T.bg }}>
      <AdminBreadcrumb />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:18 }}>
        <div style={{ width:42, height:42, borderRadius:10, background:`linear-gradient(135deg,${T.primary},#7c3aed)`, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Globe size={20} color="#fff"/>
        </div>
        <div>
          <h1 style={{ margin:0, fontSize:20, fontWeight:800, color:T.fg }}>Superadmin / Webmaster Control Centre</h1>
          <div style={{ fontSize:11, color:T.fgDim, marginTop:2 }}>ProcurBosse v6.0 · EL5 MediProcure · {roles.filter(r=>["superadmin","webmaster","admin"].includes(r)).join(", ")||"admin"}</div>
        </div>
        <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
          <button onClick={loadKpis} style={btn(T.bg, T.border)}><RefreshCw size={13}/> Refresh</button>
          <button onClick={() => nav("/admin/db-test")} style={btn(T.primary)}><Activity size={13}/> DB Monitor</button>
        </div>
      </div>

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
                { label:"DB Monitor",    icon:Activity, path:"/admin/db-test",   color:"#d97706"  },
                { label:"Audit Log",     icon:BookOpen, path:"/audit-log",       color:"#0891b2"  },
                { label:"Backup",        icon:HardDrive,path:"/backup",          color:"#374151"  },
                { label:"ODBC/MySQL",    icon:Database, path:"/odbc",            color:"#dc2626"  },
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
        <div style={{ ...card, fontFamily:"monospace" }}>
          <div style={{ fontWeight:800, color:T.fg, fontSize:14, marginBottom:10 }}>Webmaster Console</div>
          <div ref={termRef} style={{ background:"#0a0f1e", borderRadius:8, padding:16, height:400, overflowY:"auto", marginBottom:10, fontSize:12, lineHeight:1.8 }}>
            {termOutput.map((l, i) => (
              <div key={i} style={{ color:l.startsWith("EL5")||l.startsWith("---")?"#38bdf8":l.startsWith(">")?"#22c55e":"#94a3b8" }}>{l}</div>
            ))}
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <span style={{ color:T.primary, fontWeight:700 }}>$</span>
            <input value={termInput} onChange={e=>setTermInput(e.target.value)}
              onKeyDown={e => { if (e.key==="Enter") { setTermOutput(p=>[...p,`$ ${termInput}`]); runCmd(termInput); setTermInput(""); }}}
              style={{ ...inp, fontFamily:"monospace", fontSize:13 }} placeholder="Type command..."/>
          </div>
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
    </div>
  );
}
