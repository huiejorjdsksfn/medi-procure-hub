import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  ChevronRight, ChevronDown, User, Building2, Shield, Bell, Palette,
  Database, Globe, Mail, Key, Clock, FileText, Printer, Monitor,
  Package, Truck, DollarSign, BarChart3, Settings, Save, RefreshCw,
  Eye, EyeOff, Check, X, Info, AlertTriangle, Sliders,
} from "lucide-react";

// ── TREE STRUCTURE (Image 1 left panel) ───────────────────────────────────
const TREE: { id: string; label: string; icon: any; children?: { id: string; label: string }[] }[] = [
  { id:"general",     label:"General",          icon: Settings,    children: [
    { id:"general.org",      label:"Organization" },
    { id:"general.system",   label:"System" },
    { id:"general.locale",   label:"Locale & Region" },
  ]},
  { id:"appearance",  label:"Appearance",       icon: Palette,     children: [
    { id:"appearance.theme",  label:"Theme & Colors" },
    { id:"appearance.layout", label:"Layout Options" },
  ]},
  { id:"users",       label:"Users & Security", icon: Shield,      children: [
    { id:"users.auth",        label:"Authentication" },
    { id:"users.password",    label:"Password Policy" },
    { id:"users.roles",       label:"Default Roles" },
    { id:"users.sessions",    label:"Sessions" },
  ]},
  { id:"procurement", label:"Procurement",      icon: Truck,       children: [
    { id:"procurement.req",   label:"Requisitions" },
    { id:"procurement.po",    label:"Purchase Orders" },
    { id:"procurement.tender",label:"Tenders" },
    { id:"procurement.approval",label:"Approval Workflow" },
  ]},
  { id:"finance",     label:"Finance",          icon: DollarSign,  children: [
    { id:"finance.vouchers",  label:"Vouchers" },
    { id:"finance.budgets",   label:"Budgets" },
    { id:"finance.vat",       label:"Tax & VAT" },
    { id:"finance.fy",        label:"Financial Year" },
  ]},
  { id:"inventory",   label:"Inventory",        icon: Package,     children: [
    { id:"inventory.stock",   label:"Stock Control" },
    { id:"inventory.reorder", label:"Reorder Rules" },
    { id:"inventory.scanner", label:"Scanner / Barcode" },
  ]},
  { id:"notifications",label:"Notifications",  icon: Bell,        children: [
    { id:"notifications.email",  label:"Email Alerts" },
    { id:"notifications.inapp",  label:"In-App Alerts" },
  ]},
  { id:"reports",     label:"Reports & Audit",  icon: FileText,    children: [
    { id:"reports.format",    label:"Output Format" },
    { id:"reports.audit",     label:"Audit Trail" },
    { id:"reports.export",    label:"Export Options" },
  ]},
  { id:"integration", label:"Integrations",     icon: Globe,       children: [
    { id:"integration.email", label:"Email Server (SMTP)" },
    { id:"integration.api",   label:"API Keys" },
    { id:"integration.backup",label:"Backup & Restore" },
  ]},
  { id:"database",    label:"Database",         icon: Database,    children: [
    { id:"database.conn",     label:"Connection Info" },
    { id:"database.maint",    label:"Maintenance" },
    { id:"database.perf",     label:"Performance" },
  ]},
];

// ── DEFAULT SETTINGS VALUES ──────────────────────────────────────────────
const DEFAULTS: Record<string, any> = {
  org_name: "Embu Level 5 Hospital", org_short: "EL5H", org_county: "Embu County",
  org_phone: "+254 060 000000", org_email: "info@embu.health.go.ke", org_website: "embu.health.go.ke",
  sys_version: "2.0.0", sys_environment: "production", sys_timezone: "Africa/Nairobi",
  locale_currency: "KES", locale_date: "DD/MM/YYYY", locale_lang: "en-KE", locale_decimal: "2",
  theme_mode: "light", theme_primary: "#0078d4", theme_density: "comfortable",
  layout_sidebar: "pinned", layout_breadcrumb: "true", layout_animations: "true",
  auth_mfa: "false", auth_provider: "email", auth_lockout: "5",
  pwd_min: "8", pwd_uppercase: "true", pwd_numbers: "true", pwd_special: "false", pwd_expiry: "90",
  session_timeout: "480", session_concurrent: "3",
  req_prefix: "REQ", req_autonum: "true", req_approval_levels: "2", req_max_value: "50000",
  po_prefix: "PO", po_autonum: "true", po_default_terms: "30",
  tender_open_days: "21", tender_min_bids: "3",
  approval_levels: "2", approval_escalate: "48",
  voucher_prefix_pv: "PV", voucher_prefix_rv: "RV", voucher_prefix_jv: "JV",
  budget_warning: "80", budget_block: "100", fy_start: "July",
  vat_rate: "16", vat_exempt: "false",
  stock_negative: "false", reorder_auto: "true", scanner_type: "barcode",
  email_alerts: "true", email_approval: "true", email_lowstock: "true",
  report_format: "PDF", report_logo: "true", audit_retention: "365",
  smtp_host: "smtp.embu.health.go.ke", smtp_port: "587", smtp_tls: "true",
  smtp_from: "noreply@embu.health.go.ke",
  db_host: "yvjfehnzbzjliizjvuhq.supabase.co", db_name: "postgres",
  backup_auto: "true", backup_freq: "daily",
};

// ── PANEL CONTENT MAP ─────────────────────────────────────────────────────
function PanelContent({ id, vals, onChange }: { id: string; vals: Record<string,any>; onChange: (k:string, v:string)=>void }) {
  const field = (label: string, key: string, type: "text"|"select"|"bool"|"number"|"email"|"url"|"color"|"password" = "text", opts?: string[]) => (
    <div key={key} className="flex items-center py-2.5 border-b border-gray-100 last:border-0">
      <label className="text-xs text-gray-600 w-44 shrink-0">{label}</label>
      {type==="bool" ? (
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" checked={vals[key]==="true"} onChange={e=>onChange(key, e.target.checked?"true":"false")} className="sr-only peer"/>
          <div className="w-9 h-5 bg-gray-200 peer-checked:bg-blue-600 rounded-full transition-all after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4"/>
        </label>
      ) : type==="select" ? (
        <select value={vals[key]||""} onChange={e=>onChange(key,e.target.value)}
          className="text-xs border border-gray-200 rounded px-2 py-1.5 w-56 focus:outline-none focus:border-blue-400 bg-white">
          {opts?.map(o=><option key={o} value={o}>{o}</option>)}
        </select>
      ) : type==="color" ? (
        <div className="flex items-center gap-2">
          <input type="color" value={vals[key]||"#0078d4"} onChange={e=>onChange(key,e.target.value)} className="w-8 h-8 border border-gray-200 rounded cursor-pointer"/>
          <span className="text-xs font-mono text-gray-500">{vals[key]||"#0078d4"}</span>
        </div>
      ) : (
        <input type={type} value={vals[key]||""} onChange={e=>onChange(key,e.target.value)}
          className="text-xs border border-gray-200 rounded px-2.5 py-1.5 w-56 focus:outline-none focus:border-blue-400 bg-white"
          style={type==="password"?{}:{}}
        />
      )}
    </div>
  );

  const section = (title: string, children: React.ReactNode) => (
    <div className="mb-6">
      <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1 pb-1 border-b border-gray-200">{title}</h3>
      <div>{children}</div>
    </div>
  );

  if (id === "general.org" || id === "general") return (
    <>{section("Organization Details", <>
      {field("Organization Name","org_name")}
      {field("Short Name / Abbreviation","org_short")}
      {field("County","org_county")}
      {field("Phone Number","org_phone")}
      {field("Email Address","org_email","email")}
      {field("Website","org_website","url")}
    </>)}
    {section("System Identification", <>
      {field("System Version","sys_version")}
      {field("Environment","sys_environment","select",["production","staging","development"])}
    </>)}</>
  );
  if (id === "general.system") return (
    <>{section("System Settings", <>
      {field("Timezone","sys_timezone","select",["Africa/Nairobi","UTC","Africa/Kampala"])}
      {field("System Version","sys_version")}
      {field("Environment","sys_environment","select",["production","staging","development"])}
    </>)}</>
  );
  if (id === "general.locale") return (
    <>{section("Locale & Regional", <>
      {field("Currency","locale_currency","select",["KES","USD","EUR","GBP"])}
      {field("Date Format","locale_date","select",["DD/MM/YYYY","MM/DD/YYYY","YYYY-MM-DD"])}
      {field("Language","locale_lang","select",["en-KE","en-US","sw-KE"])}
      {field("Decimal Places","locale_decimal","select",["0","1","2","3"])}
    </>)}</>
  );
  if (id === "appearance" || id === "appearance.theme") return (
    <>{section("Theme", <>
      {field("Mode","theme_mode","select",["light","dark","system"])}
      {field("Primary Color","theme_primary","color")}
      {field("UI Density","theme_density","select",["compact","comfortable","spacious"])}
    </>)}
    {section("Layout", <>
      {field("Sidebar Behavior","layout_sidebar","select",["pinned","collapsible","hidden"])}
      {field("Show Breadcrumbs","layout_breadcrumb","bool")}
      {field("Enable Animations","layout_animations","bool")}
    </>)}</>
  );
  if (id === "appearance.layout") return (
    <>{section("Layout Options", <>
      {field("Sidebar Behavior","layout_sidebar","select",["pinned","collapsible","hidden"])}
      {field("Show Breadcrumbs","layout_breadcrumb","bool")}
      {field("Enable Animations","layout_animations","bool")}
    </>)}</>
  );
  if (id === "users" || id === "users.auth") return (
    <>{section("Authentication", <>
      {field("Auth Provider","auth_provider","select",["email","email+phone","SSO"])}
      {field("Require MFA","auth_mfa","bool")}
      {field("Max Login Attempts","auth_lockout","number")}
    </>)}
    {section("Session", <>
      {field("Session Timeout (mins)","session_timeout","number")}
      {field("Concurrent Sessions","session_concurrent","number")}
    </>)}</>
  );
  if (id === "users.password") return (
    <>{section("Password Policy", <>
      {field("Minimum Length","pwd_min","number")}
      {field("Require Uppercase","pwd_uppercase","bool")}
      {field("Require Numbers","pwd_numbers","bool")}
      {field("Require Special Chars","pwd_special","bool")}
      {field("Expiry (days, 0=never)","pwd_expiry","number")}
    </>)}</>
  );
  if (id === "users.roles") return (
    <div className="text-xs text-gray-500 py-4">Configure default roles in Users & Roles management (Admin → Database → user_roles).</div>
  );
  if (id === "users.sessions") return (
    <>{section("Session Settings", <>
      {field("Timeout (minutes)","session_timeout","number")}
      {field("Max Concurrent","session_concurrent","number")}
    </>)}</>
  );
  if (id === "procurement" || id === "procurement.req") return (
    <>{section("Requisitions", <>
      {field("Requisition Prefix","req_prefix")}
      {field("Auto-numbering","req_autonum","bool")}
      {field("Approval Levels","req_approval_levels","select",["1","2","3"])}
      {field("Max Value (KES)","req_max_value","number")}
    </>)}
    {section("Purchase Orders", <>
      {field("PO Prefix","po_prefix")}
      {field("Auto-numbering","po_autonum","bool")}
      {field("Default Payment Terms (days)","po_default_terms","number")}
    </>)}</>
  );
  if (id === "procurement.po") return (
    <>{section("Purchase Orders", <>
      {field("PO Number Prefix","po_prefix")}
      {field("Auto-numbering","po_autonum","bool")}
      {field("Default Payment Terms","po_default_terms","number")}
    </>)}</>
  );
  if (id === "procurement.tender") return (
    <>{section("Tender Settings", <>
      {field("Default Open Period (days)","tender_open_days","number")}
      {field("Min Required Bids","tender_min_bids","number")}
    </>)}</>
  );
  if (id === "procurement.approval") return (
    <>{section("Approval Workflow", <>
      {field("Approval Levels","approval_levels","select",["1","2","3","4"])}
      {field("Escalation After (hrs)","approval_escalate","number")}
    </>)}</>
  );
  if (id === "finance" || id === "finance.vouchers") return (
    <>{section("Voucher Prefixes", <>
      {field("Payment Voucher Prefix","voucher_prefix_pv")}
      {field("Receipt Voucher Prefix","voucher_prefix_rv")}
      {field("Journal Voucher Prefix","voucher_prefix_jv")}
    </>)}
    {section("Budget Controls", <>
      {field("Warning Threshold (%)","budget_warning","number")}
      {field("Block Over-spend (%)","budget_block","number")}
      {field("Financial Year Start","fy_start","select",["January","April","July","October"])}
    </>)}</>
  );
  if (id === "finance.budgets") return (
    <>{section("Budget Settings", <>
      {field("Warning Threshold (%)","budget_warning","number")}
      {field("Block Over-spend (%)","budget_block","number")}
      {field("Financial Year Start","fy_start","select",["January","April","July","October"])}
    </>)}</>
  );
  if (id === "finance.vat") return (
    <>{section("Tax Settings", <>
      {field("VAT Rate (%)","vat_rate","number")}
      {field("VAT Exempt by Default","vat_exempt","bool")}
    </>)}</>
  );
  if (id === "finance.fy") return (
    <>{section("Financial Year", <>
      {field("FY Start Month","fy_start","select",["January","April","July","October"])}
    </>)}</>
  );
  if (id === "inventory" || id === "inventory.stock") return (
    <>{section("Stock Control", <>
      {field("Allow Negative Stock","stock_negative","bool")}
      {field("Auto Reorder","reorder_auto","bool")}
    </>)}
    {section("Scanner", <>
      {field("Scanner Type","scanner_type","select",["barcode","qrcode","both"])}
    </>)}</>
  );
  if (id === "inventory.reorder") return (
    <>{section("Reorder Rules", <>
      {field("Auto Reorder Enabled","reorder_auto","bool")}
      {field("Allow Negative Stock","stock_negative","bool")}
    </>)}</>
  );
  if (id === "inventory.scanner") return (
    <>{section("Scanner / Barcode", <>
      {field("Scanner Type","scanner_type","select",["barcode","qrcode","both"])}
    </>)}</>
  );
  if (id === "notifications" || id === "notifications.email") return (
    <>{section("Email Notifications", <>
      {field("Enable Email Alerts","email_alerts","bool")}
      {field("Approval Requests","email_approval","bool")}
      {field("Low Stock Alerts","email_lowstock","bool")}
    </>)}</>
  );
  if (id === "notifications.inapp") return (
    <>{section("In-App Notifications", <>
      {field("Enable In-App Alerts","email_alerts","bool")}
    </>)}</>
  );
  if (id === "reports" || id === "reports.format") return (
    <>{section("Report Output", <>
      {field("Default Format","report_format","select",["PDF","Excel","CSV","HTML"])}
      {field("Include Hospital Logo","report_logo","bool")}
      {field("Audit Log Retention (days)","audit_retention","number")}
    </>)}</>
  );
  if (id === "reports.audit") return (
    <>{section("Audit Trail", <>
      {field("Retention Period (days)","audit_retention","number")}
    </>)}</>
  );
  if (id === "reports.export") return (
    <>{section("Export Options", <>
      {field("Default Format","report_format","select",["PDF","Excel","CSV","HTML"])}
      {field("Include Logo on Export","report_logo","bool")}
    </>)}</>
  );
  if (id === "integration" || id === "integration.email") return (
    <>{section("SMTP Email Server", <>
      {field("SMTP Host","smtp_host")}
      {field("SMTP Port","smtp_port","number")}
      {field("Use TLS","smtp_tls","bool")}
      {field("From Address","smtp_from","email")}
    </>)}</>
  );
  if (id === "integration.api") return (
    <div className="space-y-3">
      <div className="bg-blue-50 border border-blue-100 rounded p-3 flex items-start gap-2 text-xs text-blue-700">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        API keys are managed in the Supabase dashboard. The anon key is used by the frontend client.
      </div>
      {section("Connection", <>
        {field("Project URL","db_host")}
        {field("Database Name","db_name")}
      </>)}
    </div>
  );
  if (id === "integration.backup") return (
    <>{section("Backup", <>
      {field("Auto Backup","backup_auto","bool")}
      {field("Backup Frequency","backup_freq","select",["hourly","daily","weekly"])}
    </>)}</>
  );
  if (id === "database" || id === "database.conn") return (
    <>{section("Connection Info", <>
      {field("Host","db_host")}
      {field("Database","db_name")}
    </>)}
    <div className="bg-amber-50 border border-amber-100 rounded p-3 flex items-start gap-2 text-xs text-amber-700 mt-2">
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5"/>
      Database connection settings are managed via Supabase. Do not change these unless migrating.
    </div></>
  );
  if (id === "database.maint") return (
    <div className="space-y-3">
      <div className="bg-amber-50 border border-amber-100 rounded p-3 text-xs text-amber-700 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5"/>
        Maintenance operations should be performed from the Admin Database page.
      </div>
      <p className="text-xs text-gray-500">Go to Admin → Database Administration → SQL Runner for maintenance queries.</p>
    </div>
  );
  if (id === "database.perf") return (
    <div className="text-xs text-gray-500 py-2">Performance settings are auto-managed by Supabase. Monitor via the Supabase Dashboard.</div>
  );
  return <div className="text-xs text-gray-400 py-4 text-center">Select a sub-category from the left panel.</div>;
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["general"]));
  const [selected, setSelected] = useState("general.org");
  const [vals, setVals] = useState<Record<string,any>>({...DEFAULTS});
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  const toggle = (id: string) => setExpanded(e => { const n = new Set(e); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const select = (id: string) => setSelected(id);
  const onChange = (k: string, v: string) => { setVals(p => ({...p, [k]: v})); setDirty(true); };

  const save = async () => {
    setSaved(true); setDirty(false);
    toast({ title: "✅ Settings saved", description: "System preferences updated successfully." });
    setTimeout(() => setSaved(false), 2000);
  };

  const reset = () => { setVals({...DEFAULTS}); setDirty(false); toast({ title: "Settings reset to defaults" }); };

  const selectedNode = (() => {
    const parts = selected.split(".");
    const top = TREE.find(t => t.id === parts[0]);
    if (!top) return null;
    if (parts.length === 1) return { label: top.label, parent: null };
    const child = top.children?.find(c => c.id === selected);
    return child ? { label: child.label, parent: top.label } : null;
  })();

  return (
    <div className="h-full flex flex-col bg-gray-100" style={{ fontFamily:"Segoe UI, system-ui, sans-serif", minHeight:"calc(100vh - 56px)" }}>
      {/* Title bar (Image 1 top) */}
      <div className="bg-white border-b border-gray-200 px-5 py-2.5 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-gray-800 flex items-center justify-center">
            <Sliders className="w-4 h-4 text-white"/>
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900">Preferences</h1>
            <p className="text-[10px] text-gray-500">System configuration · MediProcure ERP</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {dirty && <span className="text-[10px] text-amber-600 flex items-center gap-1 mr-2"><AlertTriangle className="w-3 h-3"/>Unsaved changes</span>}
          <button onClick={reset} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded hover:bg-gray-50 text-gray-600 transition-colors">
            <RefreshCw className="w-3.5 h-3.5"/>Reset
          </button>
          <button onClick={save} className={`flex items-center gap-1.5 px-4 py-1.5 text-xs rounded font-semibold text-white transition-all ${saved ? "bg-green-600" : "bg-blue-600 hover:bg-blue-700"}`}>
            {saved ? <><Check className="w-3.5 h-3.5"/>Saved</> : <><Save className="w-3.5 h-3.5"/>Save</>}
          </button>
        </div>
      </div>

      {/* Body: left tree + right panel */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left panel — IDE tree (Image 1) */}
        <div className="w-56 bg-white border-r border-gray-200 flex flex-col min-h-0 shrink-0 shadow-sm">
          <div className="flex-1 overflow-y-auto py-2">
            {TREE.map(node => (
              <div key={node.id}>
                {/* Parent row */}
                <button
                  onClick={() => { toggle(node.id); select(node.id); }}
                  className={`w-full flex items-center gap-1.5 px-3 py-2 text-left text-xs font-semibold transition-colors group ${selected === node.id ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"}`}
                >
                  {expanded.has(node.id)
                    ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0"/>
                    : <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0"/>}
                  <node.icon className={`w-3.5 h-3.5 shrink-0 ${selected===node.id?"text-blue-600":"text-gray-400"}`}/>
                  <span className="truncate">{node.label}</span>
                </button>
                {/* Children */}
                {expanded.has(node.id) && node.children?.map(child => (
                  <button key={child.id} onClick={() => select(child.id)}
                    className={`w-full flex items-center gap-1.5 pl-8 pr-3 py-1.5 text-left text-xs transition-colors border-l-2 ml-0 ${selected===child.id ? "border-blue-500 bg-blue-50 text-blue-700 font-medium" : "border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}>
                    <span className="w-1 h-1 rounded-full bg-gray-300 shrink-0"/>
                    <span className="truncate">{child.label}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Right panel — settings form (Image 1) */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Sub-header (Image 1 top of right panel) */}
          <div className="bg-white border-b border-gray-100 px-6 py-2.5 flex items-center gap-2 shrink-0">
            {selectedNode?.parent && (
              <>
                <span className="text-xs text-gray-400">{selectedNode.parent}</span>
                <ChevronRight className="w-3 h-3 text-gray-300"/>
              </>
            )}
            <span className="text-sm font-semibold text-gray-800">{selectedNode?.label || "General"}</span>
          </div>

          {/* Form area */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl">
              {!isAdmin && (
                <div className="mb-4 bg-amber-50 border border-amber-200 rounded p-3 flex items-center gap-2 text-xs text-amber-700">
                  <AlertTriangle className="w-4 h-4 shrink-0"/>
                  View-only mode. Admin access required to save changes.
                </div>
              )}
              <PanelContent id={selected} vals={vals} onChange={isAdmin ? onChange : ()=>{}} />
            </div>
          </div>

          {/* Bottom bar (Image 1 bottom: OK / Cancel buttons) */}
          <div className="bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
            <p className="text-[10px] text-gray-400">Changes take effect immediately after saving</p>
            <div className="flex items-center gap-2">
              <button onClick={reset} className="px-5 py-1.5 text-xs border border-gray-200 rounded hover:bg-gray-50 text-gray-600 transition-colors">Cancel</button>
              <button onClick={save} disabled={!isAdmin} className="px-6 py-1.5 text-xs rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors">OK</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
