import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  ChevronRight, ChevronDown, Sliders, Palette, Shield, Bell,
  Database, Globe, FileText, Package, Truck, DollarSign, BarChart3,
  Save, RefreshCw, Check, AlertTriangle, Info, Eye, Lock,
  Mail, Wifi, Server, Users, Building2, Monitor, Zap,
} from "lucide-react";

// ─── SETTINGS TREE (IDE Preferences style, Image 1) ───────────────────────
const TREE = [
  { id: "general",      label: "General",          icon: Sliders,      kids: [
    { id: "g.org",      label: "Organization" },
    { id: "g.sys",      label: "System" },
    { id: "g.locale",   label: "Locale & Region" },
  ]},
  { id: "appearance",   label: "Appearance",        icon: Palette,      kids: [
    { id: "a.theme",    label: "Theme & Colors" },
    { id: "a.layout",   label: "Layout Options" },
    { id: "a.modules",  label: "Module Colors" },
  ]},
  { id: "security",     label: "Users & Security",  icon: Shield,       kids: [
    { id: "s.auth",     label: "Authentication" },
    { id: "s.pwd",      label: "Password Policy" },
    { id: "s.roles",    label: "Role Permissions" },
    { id: "s.sess",     label: "Session Config" },
  ]},
  { id: "procurement",  label: "Procurement",       icon: Truck,        kids: [
    { id: "p.req",      label: "Requisitions" },
    { id: "p.po",       label: "Purchase Orders" },
    { id: "p.tender",   label: "Tenders & Bids" },
    { id: "p.appr",     label: "Approval Workflow" },
  ]},
  { id: "finance",      label: "Finance",           icon: DollarSign,   kids: [
    { id: "f.vouch",    label: "Vouchers" },
    { id: "f.budget",   label: "Budgets & Controls" },
    { id: "f.tax",      label: "Tax & VAT" },
    { id: "f.fy",       label: "Financial Year" },
  ]},
  { id: "inventory",    label: "Inventory",         icon: Package,      kids: [
    { id: "i.stock",    label: "Stock Control" },
    { id: "i.reorder",  label: "Reorder Rules" },
    { id: "i.scan",     label: "Scanner / Barcode" },
  ]},
  { id: "notify",       label: "Notifications",     icon: Bell,         kids: [
    { id: "n.email",    label: "Email Alerts" },
    { id: "n.inapp",    label: "In-App Notifications" },
  ]},
  { id: "reports",      label: "Reports & Audit",   icon: BarChart3,    kids: [
    { id: "r.format",   label: "Output Format" },
    { id: "r.audit",    label: "Audit Settings" },
    { id: "r.export",   label: "Export Options" },
  ]},
  { id: "integration",  label: "Integrations",      icon: Wifi,         kids: [
    { id: "int.smtp",   label: "Email (SMTP)" },
    { id: "int.api",    label: "API & Keys" },
    { id: "int.backup", label: "Backup & Restore" },
  ]},
  { id: "database",     label: "Database",          icon: Database,     kids: [
    { id: "d.conn",     label: "Connection Info" },
    { id: "d.maint",    label: "Maintenance" },
    { id: "d.perf",     label: "Performance" },
  ]},
];

// ─── DEFAULT VALUES ───────────────────────────────────────────────────────
const DFLT: Record<string, string> = {
  org_name:"Embu Level 5 Hospital", org_short:"EL5H", org_county:"Embu County",
  org_phone:"+254 060 000000", org_email:"info@embu.health.go.ke", org_web:"embu.health.go.ke",
  sys_ver:"2.0.0", sys_env:"production", sys_tz:"Africa/Nairobi",
  l_curr:"KES", l_date:"DD/MM/YYYY", l_lang:"en-KE", l_dec:"2",
  t_mode:"light", t_color:"#1565c0", t_density:"comfortable",
  t_sidebar:"pinned", t_bread:"true", t_anim:"true",
  mc_proc:"#1a1a2e", mc_vouch:"#C45911", mc_fin:"#1F6090",
  mc_inv:"#375623", mc_qual:"#00695C", mc_admin:"#333333",
  auth_mfa:"false", auth_prov:"email", auth_lock:"5",
  pwd_min:"8", pwd_up:"true", pwd_num:"true", pwd_sp:"false", pwd_exp:"90",
  ses_to:"480", ses_cc:"3",
  req_pfx:"REQ", req_auto:"true", req_lvl:"2", req_max:"50000",
  po_pfx:"PO", po_auto:"true", po_terms:"30",
  tend_days:"21", tend_bids:"3",
  appr_lvl:"2", appr_esc:"48",
  pv_pfx:"PV", rv_pfx:"RV", jv_pfx:"JV",
  bud_warn:"80", bud_blk:"100", fy_st:"July",
  vat_rate:"16", vat_ex:"false",
  stk_neg:"false", ro_auto:"true", scan_type:"barcode",
  em_en:"true", em_appr:"true", em_stk:"true", em_grn:"true",
  rep_fmt:"PDF", rep_logo:"true", aud_days:"365",
  smtp_host:"smtp.embu.health.go.ke", smtp_port:"587", smtp_tls:"true",
  smtp_from:"noreply@embu.health.go.ke",
  db_host:"yvjfehnzbzjliizjvuhq.supabase.co", db_name:"postgres",
  bk_auto:"true", bk_freq:"daily",
};

const ROLES_DEF = [
  { id:"admin",               label:"Administrator",       color:"#a4262c", desc:"Full system access — all modules, settings, user management" },
  { id:"procurement_manager", label:"Procurement Manager", color:"#ca5010", desc:"Approve requisitions & POs, manage tenders and contracts" },
  { id:"procurement_officer", label:"Procurement Officer", color:"#c47911", desc:"Create & process purchase orders, manage suppliers" },
  { id:"inventory_manager",   label:"Inventory Manager",   color:"#107c10", desc:"Manage items, categories, stock levels and reorder rules" },
  { id:"warehouse_officer",   label:"Warehouse Officer",   color:"#005b70", desc:"Receive goods, update stock movements, barcode scanning" },
  { id:"requisitioner",       label:"Requisitioner",       color:"#5c2d91", desc:"Create and submit requisitions only" },
];

// ─── SMALL FIELD COMPONENT ────────────────────────────────────────────────
function Field({ label, k, type = "text", opts, val, onChange, disabled }:
  { label:string; k:string; type?:string; opts?:string[]; val:string; onChange:(k:string,v:string)=>void; disabled:boolean }) {
  return (
    <div className="flex items-start py-2 border-b border-gray-100 last:border-0 gap-3">
      <label className="text-[11px] text-gray-600 w-52 shrink-0 pt-1.5 leading-tight">{label}</label>
      {type === "bool" ? (
        <label className={`relative inline-flex items-center cursor-pointer mt-1 ${disabled?"opacity-50 cursor-not-allowed":""}`}>
          <input type="checkbox" disabled={disabled} checked={val === "true"}
            onChange={e => onChange(k, e.target.checked ? "true" : "false")} className="sr-only peer"/>
          <div className={`w-8 h-4.5 rounded-full transition-all relative ${val==="true" ? "bg-blue-600" : "bg-gray-200"}`}
            style={{ width:34, height:18 }}>
            <div className="absolute top-[2px] rounded-full bg-white transition-all shadow-sm"
              style={{ width:14, height:14, left: val==="true" ? 18 : 2 }}/>
          </div>
        </label>
      ) : type === "sel" ? (
        <select value={val || ""} disabled={disabled} onChange={e => onChange(k, e.target.value)}
          className={`text-[11px] border border-gray-200 rounded px-2 py-1.5 w-52 focus:outline-none focus:border-blue-400 bg-white ${disabled?"opacity-50 cursor-not-allowed":""}`}>
          {opts?.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : type === "color" ? (
        <div className="flex items-center gap-2.5 pt-0.5">
          <input type="color" value={val || "#1565c0"} disabled={disabled}
            onChange={e => onChange(k, e.target.value)}
            className={`w-8 h-8 rounded-md border border-gray-200 cursor-pointer ${disabled?"opacity-50 cursor-not-allowed":""}`}/>
          <code className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded font-mono">{val || "#1565c0"}</code>
        </div>
      ) : (
        <input type={type} value={val || ""} disabled={disabled}
          onChange={e => onChange(k, e.target.value)}
          className={`text-[11px] border border-gray-200 rounded px-2.5 py-1.5 w-52 focus:outline-none focus:border-blue-400 bg-white ${disabled?"opacity-50 cursor-not-allowed bg-gray-50":""}`}/>
      )}
    </div>
  );
}

function Sect({ title, children }: { title:string; children:React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-gray-200">
        <span className="text-[9px] font-black uppercase tracking-[0.22em] text-gray-400">{title}</span>
      </div>
      {children}
    </div>
  );
}

// ─── PANEL CONTENT ────────────────────────────────────────────────────────
function Panel({ sel, vals, onChange, disabled, users, userRoles, onAddRole, onRemoveRole }: any) {
  const F = (label:string, k:string, type="text", opts?:string[]) =>
    <Field key={k} label={label} k={k} type={type} opts={opts} val={vals[k]||""} onChange={onChange} disabled={disabled}/>;

  if (sel === "general" || sel === "g.org") return (<>
    <Sect title="Organization Details">
      {F("Organization Name","org_name")}{F("Short Name / Code","org_short")}{F("County","org_county")}
      {F("Phone Number","org_phone")}{F("Email","org_email","email")}{F("Website","org_web")}
    </Sect>
    <Sect title="System Identity">
      {F("System Version","sys_ver")}{F("Environment","sys_env","sel",["production","staging","development"])}
    </Sect>
  </>);
  if (sel === "g.sys") return (<>
    <Sect title="System Settings">
      {F("Timezone","sys_tz","sel",["Africa/Nairobi","UTC","Africa/Kampala","Africa/Johannesburg"])}
      {F("Environment","sys_env","sel",["production","staging","development"])}
      {F("App Version","sys_ver")}
    </Sect>
  </>);
  if (sel === "g.locale") return (<>
    <Sect title="Regional Preferences">
      {F("Currency","l_curr","sel",["KES","USD","EUR","GBP","UGX","TZS"])}
      {F("Date Format","l_date","sel",["DD/MM/YYYY","MM/DD/YYYY","YYYY-MM-DD"])}
      {F("Language","l_lang","sel",["en-KE","en-US","sw-KE"])}
      {F("Decimal Places","l_dec","sel",["0","1","2","3"])}
    </Sect>
  </>);
  if (sel === "appearance" || sel === "a.theme") return (<>
    <Sect title="Theme">
      {F("Color Mode","t_mode","sel",["light","dark","system"])}
      {F("Primary Accent Color","t_color","color")}
      {F("UI Density","t_density","sel",["compact","comfortable","spacious"])}
    </Sect>
    <Sect title="Layout">
      {F("Sidebar Behavior","t_sidebar","sel",["pinned","collapsible","hidden"])}
      {F("Show Breadcrumbs","t_bread","bool")}
      {F("Enable Animations","t_anim","bool")}
    </Sect>
  </>);
  if (sel === "a.layout") return (<>
    <Sect title="Layout Options">
      {F("Sidebar","t_sidebar","sel",["pinned","collapsible","hidden"])}
      {F("Show Breadcrumbs","t_bread","bool")}{F("Animations","t_anim","bool")}
    </Sect>
  </>);
  if (sel === "a.modules") return (<>
    <Sect title="Module Navigation Colors">
      {F("Procurement","mc_proc","color")}{F("Vouchers","mc_vouch","color")}
      {F("Financials","mc_fin","color")}{F("Inventory","mc_inv","color")}
      {F("Quality","mc_qual","color")}{F("Admin","mc_admin","color")}
    </Sect>
  </>);
  if (sel === "security" || sel === "s.auth") return (<>
    <Sect title="Authentication">
      {F("Auth Provider","auth_prov","sel",["email","email+phone","SSO/SAML"])}
      {F("Require MFA","auth_mfa","bool")}
      {F("Max Failed Login Attempts","auth_lock","number")}
    </Sect>
    <Sect title="Session">
      {F("Idle Timeout (minutes)","ses_to","number")}
      {F("Max Concurrent Sessions","ses_cc","number")}
    </Sect>
  </>);
  if (sel === "s.pwd") return (<>
    <Sect title="Password Policy">
      {F("Minimum Length","pwd_min","number")}
      {F("Require Uppercase","pwd_up","bool")}{F("Require Numbers","pwd_num","bool")}
      {F("Require Special Characters","pwd_sp","bool")}
      {F("Expiry (days, 0 = never)","pwd_exp","number")}
    </Sect>
  </>);
  if (sel === "s.roles") return (
    <div className="space-y-3">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5"/>
        <p className="text-[11px] text-blue-700">Click user badges to toggle roles. Blue = has role, Gray = no role. Changes saved immediately to Supabase.</p>
      </div>
      {ROLES_DEF.map(role => {
        const roleUsers = users?.filter((u:any) => userRoles.some((r:any) => r.user_id === u.id && r.role === role.id)) || [];
        const noRoleUsers = users?.filter((u:any) => !userRoles.some((r:any) => r.user_id === u.id && r.role === role.id)) || [];
        return (
          <div key={role.id} className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: role.color }}/>
              <span className="text-[11px] font-bold text-gray-800">{role.label}</span>
            </div>
            <p className="text-[9px] text-gray-500 ml-4 mb-2">{role.desc}</p>
            <div className="ml-4 flex flex-wrap gap-1">
              {roleUsers.map((u:any) => (
                <button key={u.id} disabled={disabled} title={`Remove ${role.label} from ${u.full_name||u.email}`}
                  onClick={() => !disabled && onRemoveRole(u.id, role.id)}
                  className="px-2 py-0.5 rounded text-[9px] font-bold bg-blue-600 text-white hover:bg-red-500 disabled:cursor-not-allowed transition-colors">
                  ✓ {(u.full_name || u.email || "").slice(0, 16)}
                </button>
              ))}
              {noRoleUsers.map((u:any) => (
                <button key={u.id} disabled={disabled} title={`Grant ${role.label} to ${u.full_name||u.email}`}
                  onClick={() => !disabled && onAddRole(u.id, role.id)}
                  className="px-2 py-0.5 rounded text-[9px] font-bold bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-700 disabled:cursor-not-allowed transition-colors">
                  + {(u.full_name || u.email || "").slice(0, 16)}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
  if (sel === "s.sess") return (<>
    <Sect title="Session Management">
      {F("Idle Timeout (min)","ses_to","number")}{F("Max Concurrent","ses_cc","number")}
    </Sect>
  </>);
  if (sel === "procurement" || sel === "p.req") return (<>
    <Sect title="Requisitions">
      {F("Number Prefix","req_pfx")}{F("Auto-Numbering","req_auto","bool")}
      {F("Approval Levels Required","req_lvl","sel",["1","2","3","4"])}
      {F("Max Value Without Tender (KES)","req_max","number")}
    </Sect>
    <Sect title="Purchase Orders">
      {F("PO Prefix","po_pfx")}{F("Auto-Numbering","po_auto","bool")}
      {F("Default Payment Terms (days)","po_terms","number")}
    </Sect>
  </>);
  if (sel === "p.po") return (<><Sect title="Purchase Orders">{F("PO Prefix","po_pfx")}{F("Auto-Numbering","po_auto","bool")}{F("Payment Terms (days)","po_terms","number")}</Sect></>);
  if (sel === "p.tender") return (<><Sect title="Tenders">{F("Default Open Period (days)","tend_days","number")}{F("Min Required Bids","tend_bids","number")}</Sect></>);
  if (sel === "p.appr") return (<><Sect title="Approval Workflow">{F("Approval Levels","appr_lvl","sel",["1","2","3","4"])}{F("Escalate After (hours)","appr_esc","number")}</Sect></>);
  if (sel === "finance" || sel === "f.vouch") return (<>
    <Sect title="Voucher Prefixes">
      {F("Payment Voucher","pv_pfx")}{F("Receipt Voucher","rv_pfx")}{F("Journal Voucher","jv_pfx")}
    </Sect>
    <Sect title="Budget Controls">
      {F("Warning Threshold (% spent)","bud_warn","number")}{F("Block Overspend at (%)","bud_blk","number")}
      {F("Financial Year Start","fy_st","sel",["January","April","July","October"])}
    </Sect>
  </>);
  if (sel === "f.budget") return (<><Sect title="Budget">{F("Warning (%)","bud_warn","number")}{F("Block (%)","bud_blk","number")}{F("FY Start Month","fy_st","sel",["January","April","July","October"])}</Sect></>);
  if (sel === "f.tax") return (<><Sect title="Tax / VAT">{F("Default VAT Rate (%)","vat_rate","number")}{F("VAT Exempt Default","vat_ex","bool")}</Sect></>);
  if (sel === "f.fy") return (<><Sect title="Financial Year">{F("FY Start Month","fy_st","sel",["January","April","July","October"])}</Sect></>);
  if (sel === "inventory" || sel === "i.stock") return (<><Sect title="Stock Control">{F("Allow Negative Stock","stk_neg","bool")}{F("Enable Auto Reorder","ro_auto","bool")}</Sect></>);
  if (sel === "i.reorder") return (<><Sect title="Reorder Rules">{F("Enable Auto Reorder","ro_auto","bool")}{F("Allow Negative Stock","stk_neg","bool")}</Sect></>);
  if (sel === "i.scan") return (<><Sect title="Scanner">{F("Scanner Mode","scan_type","sel",["barcode","qrcode","both"])}</Sect></>);
  if (sel === "notify" || sel === "n.email") return (<><Sect title="Email Notifications">{F("Enable Email Alerts","em_en","bool")}{F("Approval Requests","em_appr","bool")}{F("Low Stock Alerts","em_stk","bool")}{F("Goods Received","em_grn","bool")}</Sect></>);
  if (sel === "n.inapp") return (<><Sect title="In-App">{F("Enable In-App Alerts","em_en","bool")}</Sect></>);
  if (sel === "reports" || sel === "r.format") return (<><Sect title="Report Output">{F("Default Format","rep_fmt","sel",["PDF","Excel","CSV","HTML"])}{F("Include Hospital Logo","rep_logo","bool")}</Sect><Sect title="Audit">{F("Audit Log Retention (days)","aud_days","number")}</Sect></>);
  if (sel === "r.audit") return (<><Sect title="Audit Trail">{F("Retention Period (days)","aud_days","number")}</Sect></>);
  if (sel === "r.export") return (<><Sect title="Export">{F("Default Format","rep_fmt","sel",["PDF","Excel","CSV","HTML"])}{F("Include Logo","rep_logo","bool")}</Sect></>);
  if (sel === "integration" || sel === "int.smtp") return (<><Sect title="SMTP Email Server">{F("SMTP Host","smtp_host")}{F("SMTP Port","smtp_port","number")}{F("Use TLS/SSL","smtp_tls","bool")}{F("From Address","smtp_from","email")}</Sect></>);
  if (sel === "int.api") return (
    <div className="space-y-3">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5"/>
        <p className="text-[11px] text-blue-700">API keys are managed in the Supabase Dashboard. Do not expose service role keys in client code.</p>
      </div>
      <Sect title="Supabase Connection">{F("Project URL","db_host")}{F("Database","db_name")}</Sect>
    </div>
  );
  if (sel === "int.backup") return (<><Sect title="Backup">{F("Auto Backup","bk_auto","bool")}{F("Frequency","bk_freq","sel",["hourly","daily","weekly","monthly"])}</Sect></>);
  if (sel === "database" || sel === "d.conn") return (<>
    <Sect title="Connection">
      {F("Host","db_host")}{F("Database Name","db_name")}
    </Sect>
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5"/>
      <p className="text-[11px] text-amber-700">Database connection is managed by Supabase. Modifying these values may break the application.</p>
    </div>
  </>);
  if (sel === "d.maint") return (
    <div className="space-y-3">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5"/>
        <p className="text-[11px] text-amber-700">Use Admin → Database Administration → SQL Runner for all maintenance operations.</p>
      </div>
    </div>
  );
  if (sel === "d.perf") return <p className="text-[11px] text-gray-500 py-4">Performance is auto-managed by Supabase. Monitor via the Supabase Dashboard → Reports.</p>;
  return <p className="text-[11px] text-gray-400 py-8 text-center">Select a subcategory from the left.</p>;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["general"]));
  const [sel, setSel] = useState("g.org");
  const [vals, setVals] = useState<Record<string,string>>({...DFLT});
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [userRoles, setUserRoles] = useState<any[]>([]);

  useEffect(() => {
    if (!isAdmin) return;
    (supabase as any).from("profiles").select("id, full_name, email").order("full_name").then(({data}:any)=>setUsers(data||[]));
    (supabase as any).from("user_roles").select("*").then(({data}:any)=>setUserRoles(data||[]));
  }, [isAdmin]);

  const onChange = useCallback((k: string, v: string) => {
    setVals(p => ({...p, [k]: v}));
    setDirty(true);
  }, []);

  const handleSave = () => {
    setSaved(true); setDirty(false);
    toast({ title: "✅ Preferences Saved", description: "System configuration updated successfully." });
    setTimeout(() => setSaved(false), 2500);
  };

  const handleReset = () => {
    setVals({...DFLT}); setDirty(false);
    toast({ title: "Settings reset to defaults" });
  };

  const addRole = async (userId: string, role: string) => {
    const { error } = await (supabase as any).from("user_roles").insert([{ user_id: userId, role }]);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    const {data} = await (supabase as any).from("user_roles").select("*");
    setUserRoles(data||[]);
    toast({ title: `✅ Role '${role}' granted` });
  };

  const removeRole = async (userId: string, role: string) => {
    await (supabase as any).from("user_roles").delete().eq("user_id", userId).eq("role", role);
    const {data} = await (supabase as any).from("user_roles").select("*");
    setUserRoles(data||[]);
    toast({ title: `Role '${role}' removed` });
  };

  // Find node label for breadcrumb
  const selNode = (() => {
    for (const n of TREE) {
      if (n.id === sel) return { label: n.label, parent: null };
      const k = n.kids.find(k => k.id === sel);
      if (k) return { label: k.label, parent: n.label };
    }
    return { label: "Settings", parent: null };
  })();

  return (
    <div className="h-full flex flex-col bg-[#f0f0f0] overflow-hidden" style={{ fontFamily:"Segoe UI, system-ui, sans-serif", minHeight:"calc(100vh - 56px)" }}>
      
      {/* ── Top title bar (Image 1 — Preferences dialog header) ───────── */}
      <div className="bg-white border-b border-gray-300 px-5 py-2.5 flex items-center justify-between shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-gray-700 flex items-center justify-center">
            <Sliders className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-tight">Preferences</h1>
            <p className="text-[10px] text-gray-400 leading-tight">MediProcure ERP · System Configuration</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isAdmin && (
            <span className="flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
              <Eye className="w-3 h-3"/>View Only
            </span>
          )}
          {dirty && (
            <span className="text-[10px] text-amber-600 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3"/>Unsaved changes
            </span>
          )}
          <button onClick={handleReset} disabled={!isAdmin}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-600 disabled:opacity-40 transition-colors">
            <RefreshCw className="w-3.5 h-3.5"/>Reset
          </button>
          <button onClick={handleSave} disabled={!isAdmin}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs rounded font-semibold text-white transition-all disabled:opacity-40 ${saved ? "bg-green-600" : "bg-blue-600 hover:bg-blue-700"}`}>
            {saved ? <><Check className="w-3.5 h-3.5"/>Saved!</> : <><Save className="w-3.5 h-3.5"/>Save</>}
          </button>
        </div>
      </div>

      {/* ── Body: tree + form (Image 1 main content) ─────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden border-t border-gray-300">

        {/* LEFT: IDE-style tree panel */}
        <div className="w-[220px] bg-[#f8f8f8] border-r border-gray-300 flex flex-col min-h-0 shrink-0"
          style={{ background:"linear-gradient(180deg, #f8f8f8, #f4f4f4)" }}>
          <div className="flex-1 overflow-y-auto py-1 select-none">
            {TREE.map(node => (
              <div key={node.id}>
                {/* Parent node */}
                <button
                  onClick={() => {
                    setExpanded(e => { const n = new Set(e); n.has(node.id) ? n.delete(node.id) : n.add(node.id); return n; });
                    setSel(node.id);
                  }}
                  className={`w-full flex items-center gap-1.5 px-2.5 py-[6px] text-left text-[11px] font-semibold transition-colors hover:bg-white/70 ${sel === node.id ? "bg-white border-l-2 border-blue-500 text-blue-700 shadow-sm" : "text-gray-700"}`}
                >
                  {expanded.has(node.id)
                    ? <ChevronDown className="w-3 h-3 text-gray-400 shrink-0"/>
                    : <ChevronRight className="w-3 h-3 text-gray-400 shrink-0"/>}
                  <node.icon className={`w-3.5 h-3.5 shrink-0 ${sel === node.id ? "text-blue-500" : "text-gray-400"}`}/>
                  <span className="truncate">{node.label}</span>
                </button>
                {/* Child nodes */}
                {expanded.has(node.id) && node.kids.map(k => (
                  <button key={k.id} onClick={() => setSel(k.id)}
                    className={`w-full flex items-center gap-1.5 pl-8 pr-2.5 py-[5px] text-left text-[11px] transition-colors hover:bg-white/60 border-l-2 ${sel === k.id ? "bg-white border-blue-500 text-blue-700 font-semibold shadow-sm" : "border-transparent text-gray-600"}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-40 shrink-0"/>
                    <span className="truncate">{k.label}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: form panel */}
        <div className="flex-1 flex flex-col min-h-0 bg-white overflow-hidden">
          {/* Breadcrumb bar */}
          <div className="px-5 py-2 border-b border-gray-200 flex items-center gap-1.5 text-xs text-gray-500 bg-white shrink-0">
            {selNode.parent && (
              <><span className="text-gray-400">{selNode.parent}</span><ChevronRight className="w-3 h-3 text-gray-300"/></>
            )}
            <span className="font-semibold text-gray-800">{selNode.label}</span>
          </div>

          {/* Scrollable form content */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="max-w-xl">
              <Panel sel={sel} vals={vals} onChange={isAdmin ? onChange : ()=>{}} disabled={!isAdmin}
                users={users} userRoles={userRoles} onAddRole={addRole} onRemoveRole={removeRole}/>
            </div>
          </div>

          {/* Bottom OK/Cancel bar (Image 1 exact match) */}
          <div className="border-t border-gray-200 bg-[#f0f0f0] px-5 py-2.5 flex items-center justify-between shrink-0">
            <p className="text-[10px] text-gray-400">MediProcure ERP v2.0.0 · Embu Level 5 Hospital</p>
            <div className="flex items-center gap-2">
              <button onClick={handleReset} disabled={!isAdmin}
                className="px-5 py-1.5 text-xs border border-gray-300 rounded bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-40 transition-colors shadow-sm">
                Cancel
              </button>
              <button onClick={handleSave} disabled={!isAdmin}
                className="px-7 py-1.5 text-xs rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors shadow-sm">
                OK
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
