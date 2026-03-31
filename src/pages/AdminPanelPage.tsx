/**
 * ProcurBosse — Admin Control Panel v5.0
 * Brand new clean build — sidebar + live KPIs + full settings
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSystemSettings, saveSettings } from "@/hooks/useSystemSettings";
import { sendSystemBroadcast } from "@/lib/broadcast";
import { toast } from "@/hooks/use-toast";
import RoleGuard from "@/components/RoleGuard";
import logoImg from "@/assets/logo.png";
import {
  LayoutDashboard, Building2, Sliders, Shield, Mail, Phone, Palette,
  Printer, Radio, Database, Code2, Server, RefreshCw, Save,
  Users, Activity, Package, ShoppingCart, Truck, Gavel, FileCheck,
  DollarSign, BookOpen, PiggyBank, Eye, AlertTriangle, BarChart2,
  FileText, Globe, Folder, FolderOpen, Play, Settings, UserCheck,
  ChevronRight
} from "lucide-react";

// ── Nav sections ─────────────────────────────────────────────────────────────
const SECTIONS = [
  { id:"overview",   label:"Overview",      icon:LayoutDashboard, color:"#4f46e5" },
  { id:"hospital",   label:"Hospital Info",  icon:Building2,       color:"#0078d4" },
  { id:"modules",    label:"Modules",        icon:Sliders,         color:"#0369a1" },
  { id:"users",      label:"Users",          icon:UserCheck,       color:"#7c3aed" },
  { id:"security",   label:"Security",       icon:Shield,          color:"#dc2626" },
  { id:"email",      label:"Email / SMTP",   icon:Mail,            color:"#059669" },
  { id:"sms",        label:"SMS / Twilio",   icon:Phone,           color:"#7c3aed" },
  { id:"appearance", label:"Appearance",     icon:Palette,         color:"#8b5cf6" },
  { id:"print",      label:"Print",          icon:Printer,         color:"#C45911" },
  { id:"broadcast",  label:"Broadcast",      icon:Radio,           color:"#d97706" },
  { id:"database",   label:"Database",       icon:Database,        color:"#374151" },
  { id:"codebase",   label:"Source Code",    icon:Code2,           color:"#0f766e" },
  { id:"system",     label:"System",         icon:Server,          color:"#6b7280" },
];

const ALL_MODULES = [
  { label:"Dashboard",        path:"/",                               icon:LayoutDashboard, color:"#4f46e5" },
  { label:"Requisitions",     path:"/requisitions",                  icon:ShoppingCart,    color:"#0078d4" },
  { label:"Purchase Orders",  path:"/purchase-orders",               icon:Package,         color:"#C45911" },
  { label:"Goods Received",   path:"/goods-received",                icon:Truck,           color:"#059669" },
  { label:"Suppliers",        path:"/suppliers",                     icon:Truck,           color:"#374151" },
  { label:"Tenders",          path:"/tenders",                       icon:Gavel,           color:"#1F6090" },
  { label:"Contracts",        path:"/contracts",                     icon:FileCheck,       color:"#1a3a6b" },
  { label:"Inventory",        path:"/items",                         icon:Package,         color:"#059669" },
  { label:"Payment Vouchers", path:"/vouchers/payment",              icon:DollarSign,      color:"#C45911" },
  { label:"Journal Vouchers", path:"/vouchers/journal",              icon:BookOpen,        color:"#374151" },
  { label:"Budgets",          path:"/financials/budgets",            icon:PiggyBank,       color:"#059669" },
  { label:"Chart of Accounts",path:"/financials/chart-of-accounts",  icon:BookOpen,        color:"#1a3a6b" },
  { label:"Fixed Assets",     path:"/financials/fixed-assets",      icon:Building2,       color:"#d97706" },
  { label:"QC Dashboard",     path:"/quality/dashboard",             icon:Eye,             color:"#7c3aed" },
  { label:"Inspections",      path:"/quality/inspections",           icon:Eye,             color:"#059669" },
  { label:"Non-Conformance",  path:"/quality/non-conformance",       icon:AlertTriangle,   color:"#dc2626" },
  { label:"Documents",        path:"/documents",                     icon:FileText,        color:"#374151" },
  { label:"Email",            path:"/email",                         icon:Mail,            color:"#7c3aed" },
  { label:"Users",            path:"/users",                         icon:Users,           color:"#0369a1" },
  { label:"Audit Log",        path:"/audit-log",                     icon:Activity,        color:"#C45911" },
  { label:"IP Access",        path:"/admin/ip-access",               icon:Shield,          color:"#dc2626" },
  { label:"ODBC / SQL",       path:"/odbc",                          icon:Database,        color:"#0a2558" },
  { label:"Settings",         path:"/settings",                      icon:Settings,        color:"#6b7280" },
  { label:"Webmaster",        path:"/webmaster",                     icon:Globe,           color:"#059669" },
];

const CODE_FILES: Record<string, string[]> = {
  "src/pages":            ["AdminPanelPage.tsx","SettingsPage.tsx","DashboardPage.tsx","RequisitionsPage.tsx","PurchaseOrdersPage.tsx","GoodsReceivedPage.tsx","SuppliersPage.tsx","TendersPage.tsx","ContractsPage.tsx","ItemsPage.tsx","DocumentsPage.tsx","DocumentEditorPage.tsx"],
  "src/pages/financials": ["BudgetsPage.tsx","ChartOfAccountsPage.tsx","FixedAssetsPage.tsx"],
  "src/pages/quality":    ["QualityDashboardPage.tsx","InspectionsPage.tsx","NonConformancePage.tsx"],
  "src/pages/vouchers":   ["PaymentVouchersPage.tsx","ReceiptVouchersPage.tsx","JournalVouchersPage.tsx"],
  "src/lib":              ["printDocument.ts","audit.ts","broadcast.ts","sms.ts","ipRestriction.ts"],
  "src/hooks":            ["useSystemSettings.ts","usePermissions.ts"],
  ".github/workflows":    ["build-exe.yml","build-v5.yml","build-v6.yml","build-v7.yml","build-desktop.yml"],
};

// ── Sub-components ────────────────────────────────────────────────────────────
function Tog({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  const bg = on ? "#4f46e5" : "#e2e8f0";
  return (
    <button
      onClick={() => onChange(!on)}
      style={{ background:"none",border:"none",cursor:"pointer",padding:0,flexShrink:0,lineHeight:0 }}
    >
      <span style={{ display:"inline-flex",width:46,height:24,borderRadius:12,background:bg,alignItems:"center",padding:"2px",transition:"background 0.2s",border:`1px solid ${on?"#4f46e5":"rgba(255,255,255,0.2)"}` }}>
        <span style={{ display:"block",width:20,height:20,borderRadius:"50%",background:"#fff",transition:"transform 0.2s",transform:on?"translateX(22px)":"translateX(0)",boxShadow:"0 1px 3px rgba(0,0,0,0.3)" }} />
      </span>
    </button>
  );
}

function FR({ label, sub, color, children }: { label: string; sub?: string; color?: string; children: React.ReactNode }) {
  return (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid #f1f5f9",gap:12 }}>
      <div style={{ flex:1 }}>
        {color && <span style={{ display:"inline-block",width:3,height:12,borderRadius:2,background:color,marginRight:8,verticalAlign:"middle" }} />}
        <span style={{ fontSize:13,fontWeight:500,color:"#1e293b" }}>{label}</span>
        {sub && <div style={{ fontSize:11,color:"#64748b",marginTop:2 }}>{sub}</div>}
      </div>
      <div style={{ flexShrink:0 }}>{children}</div>
    </div>
  );
}

function Sect({ title, icon: Icon, color, children }: { title: string; icon: any; color: string; children: React.ReactNode }) {
  return (
    <div style={{ background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:12,padding:"16px 20px",marginBottom:16 }}>
      <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:14,paddingBottom:10,borderBottom:"1px solid #e2e8f0" }}>
        <div style={{ width:32,height:32,borderRadius:8,background:color,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
          <Icon style={{ width:16,height:16,color:"#fff" }} />
        </div>
        <span style={{ fontSize:14,fontWeight:600,color:"#1e293b" }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
function AdminInner() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { settings, get: getSetting, bool: getBool } = useSystemSettings();

  const [sec, setSec] = useState("overview");
  const [cfg, setCfg] = useState<Record<string,string>>({});
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<Record<string,number>>({});
  const [loading, setLoading] = useState(true);
  const [tree, setTree] = useState(new Set(["src/pages"]));
  const [bcast, setBcast] = useState({ title:"", body:"", type:"info" });
  const [bcasting, setBcasting] = useState(false);

  // Sync settings into local cfg
  useEffect(() => {
    if (settings && Object.keys(settings).length > 0) {
      setCfg({ ...settings });
    }
  }, [settings]);

  const set = (k: string, v: string) => setCfg(p => ({ ...p, [k]: v }));

  const inp: React.CSSProperties = {
    padding:"8px 11px", border:"1px solid #e2e8f0",
    borderRadius:7, fontSize:13, color:"#1e293b",
    background:"#e2e8f0", outline:"none", width:"100%",
  };

  const btn = (bg: string): React.CSSProperties => ({
    padding:"8px 16px", borderRadius:8, border:"none", background:bg,
    color:"#fff", fontWeight:600, fontSize:13, cursor:"pointer",
    display:"inline-flex", alignItems:"center", gap:6,
  });

  const loadStats = useCallback(async () => {
    setLoading(true);
    const tables = ["requisitions","purchase_orders","suppliers","items","goods_received","payment_vouchers","tenders","profiles"];
    const counts: Record<string,number> = {};
    await Promise.all(tables.map(async t => {
      try {
        const { count } = await (supabase as any).from(t).select("*", { count:"exact", head:true });
        counts[t] = count || 0;
      } catch { counts[t] = 0; }
    }));
    setStats(counts);
    setLoading(false);
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  async function doSave() {
    setSaving(true);
    const toSave = Object.fromEntries(
      Object.entries(cfg).filter(([, v]) => v !== undefined && v !== null)
    );
    const res = await saveSettings(toSave);
    if (res.ok) {
      toast({ title:"✅ Settings saved and propagated to all users" });
    } else {
      toast({ title:"Save failed: " + (res.error || "Unknown error"), variant:"destructive" });
    }
    setSaving(false);
  }

  async function doBroadcast() {
    if (!bcast.title.trim()) { toast({ title:"Title required", variant:"destructive" }); return; }
    if (!bcast.body.trim())  { toast({ title:"Message required", variant:"destructive" }); return; }
    setBcasting(true);
    try {
      await sendSystemBroadcast({ title:bcast.title, message:bcast.body, type:bcast.type as any });
      toast({ title:"📡 Broadcast sent to all users" });
      setBcast({ title:"", body:"", type:"info" });
    } catch (e:any) {
      toast({ title:"Broadcast failed: " + e.message, variant:"destructive" });
    }
    setBcasting(false);
  }

  const KPI = [
    { label:"Requisitions",    n:stats.requisitions,     color:"#4f46e5", path:"/requisitions",    icon:ShoppingCart },
    { label:"Purchase Orders", n:stats.purchase_orders,  color:"#C45911", path:"/purchase-orders",  icon:Package },
    { label:"Suppliers",       n:stats.suppliers,        color:"#059669", path:"/suppliers",        icon:Truck },
    { label:"Items",           n:stats.items,            color:"#0369a1", path:"/items",            icon:Package },
    { label:"Users",           n:stats.profiles,         color:"#7c3aed", path:"/users",            icon:Users },
    { label:"GRN Records",     n:stats.goods_received,   color:"#374151", path:"/goods-received",   icon:Truck },
    { label:"Vouchers",        n:stats.payment_vouchers, color:"#dc2626", path:"/vouchers/payment", icon:DollarSign },
    { label:"Tenders",         n:stats.tenders,          color:"#d97706", path:"/tenders",          icon:Gavel },
  ];

  return (
    <div style={{ minHeight:"100vh",background:"linear-gradient(135deg,#070d1a 0%,#0d1b35 50%,#0a1225 100%)",color:"#1e293b",fontFamily:"var(--font-sans)" }}>

      {/* Top bar */}
      <div style={{ background:"rgba(79,70,229,0.12)",borderBottom:"1px solid rgba(79,70,229,0.25)",padding:"10px 20px",display:"flex",alignItems:"center",gap:12,position:"sticky",top:0,zIndex:100,backdropFilter:"blur(10px)" }}>
        <img src={logoImg} alt="EL5H" style={{ width:32,height:32,borderRadius:8,objectFit:"contain",background:"#f1f5f9",padding:4 }} />
        <div>
          <div style={{ fontSize:15,fontWeight:700,color:"#1e293b" }}>Admin Control Panel</div>
          <div style={{ fontSize:10,color:"#64748b" }}>EL5 MediProcure · Embu Level 5 Hospital</div>
        </div>
        <div style={{ marginLeft:"auto",display:"flex",gap:8 }}>
          <button onClick={loadStats} style={{ ...btn("#e2e8f0"),padding:"7px 10px" }}>
            <RefreshCw style={{ width:13,height:13 }} />
          </button>
          <button onClick={() => navigate("/settings")} style={btn("#e2e8f0")}>
            <Settings style={{ width:13,height:13 }} /> Settings
          </button>
          <button onClick={doSave} disabled={saving} style={btn("linear-gradient(135deg,#4f46e5,#7c3aed)")}>
            <Save style={{ width:13,height:13 }} />{saving ? "Saving…" : "Save All"}
          </button>
        </div>
      </div>

      {/* Layout */}
      <div style={{ display:"grid",gridTemplateColumns:"196px 1fr",minHeight:"calc(100vh - 60px)" }}>

        {/* Sidebar */}
        <div style={{ background:"rgba(0,0,0,0.35)",borderRight:"1px solid #e2e8f0",paddingTop:8 }}>
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setSec(s.id)}
              style={{ width:"100%",display:"flex",alignItems:"center",gap:9,padding:"9px 14px",background:sec===s.id?"rgba(79,70,229,0.18)":"transparent",border:"none",borderLeft:sec===s.id?`3px solid ${s.color}`:"3px solid transparent",cursor:"pointer",transition:"all 0.15s" }}
            >
              <s.icon style={{ width:14,height:14,color:sec===s.id?s.color:"#475569",flexShrink:0 }} />
              <span style={{ fontSize:12.5,fontWeight:sec===s.id?600:400,color:sec===s.id?"#f1f5f9":"#64748b" }}>{s.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding:"20px 26px",overflowY:"auto",maxHeight:"calc(100vh - 60px)" }}>

          {/* OVERVIEW */}
          {sec === "overview" && (
            <div>
              <div style={{ fontSize:15,fontWeight:700,marginBottom:14,color:"#1e293b" }}>System Overview</div>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:20 }}>
                {KPI.map(k => (
                  <button key={k.label} onClick={() => navigate(k.path)} style={{ padding:14,borderRadius:10,border:"1px solid #e2e8f0",background:"#f8fafc",cursor:"pointer",textAlign:"left" }}>
                    <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8 }}>
                      <div style={{ width:26,height:26,borderRadius:7,background:k.color,display:"flex",alignItems:"center",justifyContent:"center" }}>
                        <k.icon style={{ width:13,height:13,color:"#fff" }} />
                      </div>
                      <span style={{ fontSize:10,color:"#64748b" }}>{k.label}</span>
                    </div>
                    <div style={{ fontSize:22,fontWeight:700,color:"#1e293b" }}>{loading ? "…" : (k.n||0).toLocaleString()}</div>
                  </button>
                ))}
              </div>
              <div style={{ fontSize:12,fontWeight:600,color:"#64748b",marginBottom:8 }}>All Modules</div>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:5 }}>
                {ALL_MODULES.map(m => (
                  <button key={m.path} onClick={() => navigate(m.path)} style={{ display:"flex",alignItems:"center",gap:7,padding:"7px 10px",borderRadius:8,border:"1px solid #e2e8f0",background:"#f8fafc",cursor:"pointer" }}>
                    <div style={{ width:22,height:22,borderRadius:5,background:`${m.color}22`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                      <m.icon style={{ width:11,height:11,color:m.color }} />
                    </div>
                    <span style={{ fontSize:11,color:"#374151",fontWeight:500 }}>{m.label}</span>
                    <ChevronRight style={{ width:10,height:10,color:"#475569",marginLeft:"auto",flexShrink:0 }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* HOSPITAL */}
          {sec === "hospital" && (
            <Sect title="Hospital Information" icon={Building2} color="#0078d4">
              {[
                {k:"hospital_name",   l:"Hospital Name",   p:"Embu Level 5 Hospital"},
                {k:"county_name",     l:"County",          p:"Embu County Government"},
                {k:"department_name", l:"Department",      p:"Department of Health"},
                {k:"system_name",     l:"System Name",     p:"EL5 MediProcure"},
                {k:"hospital_address",l:"Address",         p:"Embu Town, Kenya"},
                {k:"po_box",          l:"P.O. Box",        p:"P.O. Box 591-60100"},
                {k:"hospital_phone",  l:"Phone",           p:"+254 060 000000"},
                {k:"hospital_email",  l:"Email",           p:"info@embu.health.go.ke"},
                {k:"currency_symbol", l:"Currency",        p:"KES"},
                {k:"vat_rate",        l:"VAT Rate (%)",    p:"16"},
              ].map(f => (
                <FR key={f.k} label={f.l} color="#0078d4">
                  <input value={cfg[f.k]||""} onChange={e=>set(f.k,e.target.value)} placeholder={f.p} style={{...inp,width:260}} />
                </FR>
              ))}
              <div style={{ marginTop:12 }}>
                <button onClick={doSave} disabled={saving} style={btn("#0078d4")}>
                  <Save style={{ width:13,height:13 }} />{saving?"Saving…":"Save"}
                </button>
              </div>
            </Sect>
          )}

          {/* MODULES */}
          {sec === "modules" && (
            <Sect title="Module Toggles" icon={Sliders} color="#0369a1">
              {[
                {k:"enable_procurement",    l:"Procurement",         s:"Requisitions, POs, GRN, Suppliers"},
                {k:"enable_financials",     l:"Finance",             s:"Vouchers, Budgets, Chart of Accounts"},
                {k:"enable_quality",        l:"Quality Control",     s:"Inspections, NCR, QA Dashboard"},
                {k:"enable_tenders",        l:"Tenders & Contracts", s:"Tender management"},
                {k:"enable_documents",      l:"Documents",           s:"Document library & editor"},
                {k:"enable_scanner",        l:"QR Scanner",          s:"Barcode and QR scanning"},
                {k:"enable_email",          l:"Email System",        s:"Internal mail"},
                {k:"realtime_notifications",l:"Real-time Alerts",    s:"Live Supabase notifications"},
                {k:"maintenance_mode",      l:"Maintenance Mode",    s:"⚠ Blocks all non-admin users"},
              ].map(f => (
                <FR key={f.k} label={f.l} sub={f.s} color={f.k==="maintenance_mode"?"#dc2626":"#0369a1"}>
                  <Tog on={(cfg[f.k]||"true")!=="false"} onChange={v=>set(f.k,v?"true":"false")} />
                </FR>
              ))}
              <div style={{ marginTop:12 }}>
                <button onClick={doSave} disabled={saving} style={btn("#0369a1")}>
                  <Save style={{ width:13,height:13 }} />{saving?"Saving…":"Save & Apply"}
                </button>
              </div>
            </Sect>
          )}

          {/* USERS */}
          {sec === "users" && (
            <Sect title="Users & Access" icon={UserCheck} color="#7c3aed">
              <FR label="Default Role" color="#7c3aed">
                <select value={cfg["default_user_role"]||"requisitioner"} onChange={e=>set("default_user_role",e.target.value)} style={{...inp,width:220}}>
                  {["admin","procurement_manager","procurement_officer","inventory_manager","warehouse_officer","requisitioner"].map(r=><option key={r}>{r}</option>)}
                </select>
              </FR>
              <FR label="Allow Self-Registration" sub="Users sign up without admin" color="#7c3aed">
                <Tog on={cfg["allow_registration"]==="true"} onChange={v=>set("allow_registration",v?"true":"false")} />
              </FR>
              <FR label="Audit All Logins" color="#7c3aed">
                <Tog on={(cfg["audit_logins"]||"true")!=="false"} onChange={v=>set("audit_logins",v?"true":"false")} />
              </FR>
              <div style={{ marginTop:14,display:"flex",gap:8 }}>
                <button onClick={() => navigate("/users")} style={btn("#7c3aed")}>Manage Users →</button>
                <button onClick={doSave} disabled={saving} style={btn("#f1f5f9")}>
                  <Save style={{ width:13,height:13 }} />{saving?"Saving…":"Save"}
                </button>
              </div>
            </Sect>
          )}

          {/* SECURITY */}
          {sec === "security" && (
            <Sect title="Security & IP" icon={Shield} color="#dc2626">
              {[
                {k:"ip_restriction_enabled",l:"IP Restriction",    s:"Block unauthorized IPs"},
                {k:"allow_all_private",      l:"Allow Private IPs", s:"Auto-allow 10.x, 192.168.x"},
                {k:"log_all_ips",            l:"Log All Access",    s:"Record every IP check"},
              ].map(f => (
                <FR key={f.k} label={f.l} sub={f.s} color="#dc2626">
                  <Tog on={cfg[f.k]==="true"} onChange={v=>set(f.k,v?"true":"false")} />
                </FR>
              ))}
              <FR label="Session Timeout (min)" color="#dc2626">
                <input value={cfg["session_timeout"]||"480"} onChange={e=>set("session_timeout",e.target.value)} style={{...inp,width:80}} type="number" />
              </FR>
              <FR label="Max Login Attempts" color="#dc2626">
                <input value={cfg["max_login_attempts"]||"5"} onChange={e=>set("max_login_attempts",e.target.value)} style={{...inp,width:80}} type="number" />
              </FR>
              <div style={{ marginTop:14,display:"flex",gap:8 }}>
                <button onClick={() => navigate("/admin/ip-access")} style={btn("#dc2626")}>IP Access Manager →</button>
                <button onClick={doSave} disabled={saving} style={btn("#f1f5f9")}>
                  <Save style={{ width:13,height:13 }} />{saving?"Saving…":"Save"}
                </button>
              </div>
            </Sect>
          )}

          {/* EMAIL */}
          {sec === "email" && (
            <Sect title="Email & SMTP" icon={Mail} color="#059669">
              {[
                {k:"smtp_host",      l:"SMTP Host",    p:"smtp.gmail.com"},
                {k:"smtp_port",      l:"SMTP Port",    p:"587"},
                {k:"smtp_user",      l:"Username",     p:"noreply@embu.go.ke"},
                {k:"smtp_from_name", l:"From Name",    p:"EL5 MediProcure"},
                {k:"smtp_from_email",l:"From Email",   p:"noreply@embu.go.ke"},
              ].map(f => (
                <FR key={f.k} label={f.l} color="#059669">
                  <input value={cfg[f.k]||""} onChange={e=>set(f.k,e.target.value)} placeholder={f.p} style={{...inp,width:260}} />
                </FR>
              ))}
              <FR label="SMTP Password" color="#059669">
                <input type="password" value={cfg["smtp_pass"]||""} onChange={e=>set("smtp_pass",e.target.value)} style={{...inp,width:260}} placeholder="••••••••" />
              </FR>
              <FR label="Enable TLS" color="#059669">
                <Tog on={(cfg["smtp_tls"]||"true")!=="false"} onChange={v=>set("smtp_tls",v?"true":"false")} />
              </FR>
              <FR label="Enable SMTP" color="#059669">
                <Tog on={cfg["smtp_enabled"]==="true"} onChange={v=>set("smtp_enabled",v?"true":"false")} />
              </FR>
              <div style={{ marginTop:12 }}>
                <button onClick={doSave} disabled={saving} style={btn("#059669")}>
                  <Save style={{ width:13,height:13 }} />{saving?"Saving…":"Save"}
                </button>
              </div>
            </Sect>
          )}

          {/* SMS */}
          {sec === "sms" && (
            <Sect title="SMS / Twilio" icon={Phone} color="#7c3aed">
              <FR label="Enable Twilio SMS" color="#7c3aed">
                <Tog on={cfg["twilio_enabled"]==="true"} onChange={v=>set("twilio_enabled",v?"true":"false")} />
              </FR>
              {[
                {k:"twilio_account_sid",  l:"Account SID",  p:"ACxxxx"},
                {k:"twilio_auth_token",   l:"Auth Token",   p:"••••", pw:true},
                {k:"twilio_phone_number", l:"Twilio Phone", p:"+12025551234"},
              ].map(f => (
                <FR key={f.k} label={f.l} color="#7c3aed">
                  <input type={(f as any).pw?"password":"text"} value={cfg[f.k]||""} onChange={e=>set(f.k,e.target.value)} placeholder={f.p} style={{...inp,width:260}} />
                </FR>
              ))}
              <div style={{ marginTop:12 }}>
                <button onClick={doSave} disabled={saving} style={btn("#7c3aed")}>
                  <Save style={{ width:13,height:13 }} />{saving?"Saving…":"Save"}
                </button>
              </div>
            </Sect>
          )}

          {/* APPEARANCE */}
          {sec === "appearance" && (
            <Sect title="Appearance" icon={Palette} color="#8b5cf6">
              {[{k:"primary_color",l:"Primary Colour"},{k:"accent_color",l:"Accent Colour"}].map(f => (
                <FR key={f.k} label={f.l} color="#8b5cf6">
                  <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                    <input type="color" value={cfg[f.k]||"#1a3a6b"} onChange={e=>set(f.k,e.target.value)} style={{ width:36,height:30,borderRadius:6,border:"1px solid rgba(255,255,255,0.2)",background:"transparent",cursor:"pointer",padding:2 }} />
                    <input value={cfg[f.k]||""} onChange={e=>set(f.k,e.target.value)} style={{...inp,width:100}} placeholder="#1a3a6b" />
                  </div>
                </FR>
              ))}
              <FR label="Theme" color="#8b5cf6">
                <select value={cfg["theme"]||"dark"} onChange={e=>set("theme",e.target.value)} style={{...inp,width:140}}>
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="system">System</option>
                </select>
              </FR>
              <div style={{ marginTop:12 }}>
                <button onClick={doSave} disabled={saving} style={btn("#8b5cf6")}>
                  <Save style={{ width:13,height:13 }} />{saving?"Saving…":"Save & Propagate"}
                </button>
              </div>
            </Sect>
          )}

          {/* PRINT */}
          {sec === "print" && (
            <Sect title="Print & Documents" icon={Printer} color="#C45911">
              <FR label="Print Font" color="#C45911">
                <select value={cfg["print_font"]||"Times New Roman"} onChange={e=>set("print_font",e.target.value)} style={{...inp,width:200}}>
                  {["Times New Roman","Arial","Calibri","Georgia","Cambria"].map(f=><option key={f}>{f}</option>)}
                </select>
              </FR>
              <FR label="Font Size (pt)" color="#C45911">
                <input value={cfg["print_font_size"]||"11"} onChange={e=>set("print_font_size",e.target.value)} style={{...inp,width:70}} type="number" min="8" max="16" />
              </FR>
              <FR label="Paper Size" color="#C45911">
                <select value={cfg["paper_size"]||"A4"} onChange={e=>set("paper_size",e.target.value)} style={{...inp,width:120}}>
                  {["A4","Letter","Legal","A5"].map(s=><option key={s}>{s}</option>)}
                </select>
              </FR>
              <FR label="Printer Type" color="#C45911">
                <select value={cfg["printer_type"]||"generic"} onChange={e=>set("printer_type",e.target.value)} style={{...inp,width:200}}>
                  <option value="generic">Generic / Auto-detect</option>
                  <option value="kyocera">Kyocera ECOSYS</option>
                  <option value="hp_laserjet">HP LaserJet</option>
                  <option value="hp_deskjet">HP DeskJet</option>
                  <option value="hp_color">HP Color LaserJet</option>
                  <option value="thermal_80mm">Thermal 80mm</option>
                  <option value="thermal_58mm">Thermal 58mm</option>
                </select>
              </FR>
              <FR label="Show Logo on Prints" color="#C45911">
                <Tog on={(cfg["show_logo_print"]||"true")!=="false"} onChange={v=>set("show_logo_print",v?"true":"false")} />
              </FR>
              <FR label="Show Stamp Box" color="#C45911">
                <Tog on={(cfg["show_stamp"]||"true")!=="false"} onChange={v=>set("show_stamp",v?"true":"false")} />
              </FR>
              <FR label="Confidential Notice" color="#C45911">
                <Tog on={(cfg["print_confidential"]||"true")!=="false"} onChange={v=>set("print_confidential",v?"true":"false")} />
              </FR>
              <div style={{ marginTop:12 }}>
                <button onClick={doSave} disabled={saving} style={btn("#C45911")}>
                  <Save style={{ width:13,height:13 }} />{saving?"Saving…":"Save"}
                </button>
              </div>
            </Sect>
          )}

          {/* BROADCAST */}
          {sec === "broadcast" && (
            <Sect title="System Broadcast" icon={Radio} color="#d97706">
              <FR label="Title" color="#d97706">
                <input value={bcast.title} onChange={e=>setBcast(p=>({...p,title:e.target.value}))} placeholder="System Alert" style={{...inp,width:300}} />
              </FR>
              <div style={{ padding:"10px 0",borderBottom:"1px solid #f1f5f9" }}>
                <div style={{ fontSize:12,fontWeight:500,color:"#1e293b",marginBottom:6 }}>Message</div>
                <textarea value={bcast.body} onChange={e=>setBcast(p=>({...p,body:e.target.value}))} placeholder="Message to all active users…" style={{...inp,height:80,resize:"vertical"}} />
              </div>
              <FR label="Type" color="#d97706">
                <select value={bcast.type} onChange={e=>setBcast(p=>({...p,type:e.target.value}))} style={{...inp,width:160}}>
                  {["info","warning","success","error","maintenance","announcement"].map(t=><option key={t}>{t}</option>)}
                </select>
              </FR>
              <div style={{ marginTop:14 }}>
                <button onClick={doBroadcast} disabled={bcasting} style={btn("#d97706")}>
                  <Play style={{ width:13,height:13 }} />{bcasting?"Sending…":"Send to All Users"}
                </button>
              </div>
            </Sect>
          )}

          {/* DATABASE */}
          {sec === "database" && (
            <Sect title="Database" icon={Database} color="#374151">
              <FR label="Supabase Project ID" color="#374151">
                <code style={{ fontSize:12,color:"#64748b" }}>yvjfehnzbzjliizjvuhq</code>
              </FR>
              <FR label="Region" color="#374151">
                <span style={{ color:"#64748b" }}>af-south-1 · Africa/Nairobi</span>
              </FR>
              <FR label="PostgreSQL" color="#374151">
                <span style={{ color:"#64748b" }}>57+ tables · RLS enabled on all</span>
              </FR>
              <div style={{ marginTop:14,display:"flex",gap:8,flexWrap:"wrap" as const }}>
                {[
                  {l:"DB Admin →",    p:"/admin/database",  c:"#374151"},
                  {l:"ODBC / SQL →",  p:"/odbc",            c:"#0a2558"},
                  {l:"Audit Log →",   p:"/audit-log",       c:"#C45911"},
                ].map(b => (
                  <button key={b.p} onClick={() => navigate(b.p)} style={btn(b.c)}>{b.l}</button>
                ))}
              </div>
            </Sect>
          )}

          {/* CODEBASE */}
          {sec === "codebase" && (
            <div>
              <div style={{ fontSize:13,fontWeight:600,marginBottom:10,color:"#64748b" }}>Source Code — ProcurBosse v2.0</div>
              <div style={{ background:"rgba(0,0,0,0.4)",borderRadius:10,border:"1px solid #e2e8f0",overflow:"hidden" }}>
                {Object.entries(CODE_FILES).map(([folder, files]) => {
                  const isOpen = tree.has(folder);
                  return (
                    <div key={folder}>
                      <button
                        onClick={() => setTree(p => { const s = new Set(p); s.has(folder) ? s.delete(folder) : s.add(folder); return s; })}
                        style={{ width:"100%",display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:isOpen?"rgba(79,70,229,0.1)":"transparent",border:"none",borderBottom:"1px solid #f8fafc",cursor:"pointer" }}
                      >
                        {isOpen
                          ? <FolderOpen style={{ width:13,height:13,color:"#d97706" }} />
                          : <Folder style={{ width:13,height:13,color:"#d97706" }} />}
                        <span style={{ fontSize:11.5,fontFamily:"var(--font-mono)",fontWeight:600,color:"#374151" }}>{folder}/</span>
                        <span style={{ fontSize:10,color:"#475569",marginLeft:"auto" }}>{files.length} files</span>
                      </button>
                      {isOpen && files.map(file => (
                        <div key={file} style={{ display:"flex",alignItems:"center",gap:7,padding:"4px 12px 4px 32px",borderBottom:"1px solid #f0f7ff" }}>
                          <Code2 style={{ width:10,height:10,color:file.endsWith(".ts")||file.endsWith(".tsx")?"#61afef":"#abb2bf",flexShrink:0 }} />
                          <span style={{ fontSize:11,fontFamily:"var(--font-mono)",color:"#64748b" }}>{file}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop:8,fontSize:11,color:"#475569" }}>
                Repo: <a href="https://github.com/huiejorjdsksfn/medi-procure-hub" target="_blank" rel="noreferrer" style={{ color:"#4f46e5" }}>github.com/huiejorjdsksfn/medi-procure-hub</a>
              </div>
            </div>
          )}

          {/* SYSTEM */}
          {sec === "system" && (
            <Sect title="System Configuration" icon={Server} color="#6b7280">
              <FR label="Version" color="#6b7280">
                <span style={{ fontFamily:"var(--font-mono)",color:"#818cf8",fontWeight:700 }}>v2.0.0 — ProcurBosse</span>
              </FR>
              <FR label="Date Format" color="#6b7280">
                <select value={cfg["date_format"]||"DD/MM/YYYY"} onChange={e=>set("date_format",e.target.value)} style={{...inp,width:160}}>
                  {["DD/MM/YYYY","MM/DD/YYYY","YYYY-MM-DD"].map(f=><option key={f}>{f}</option>)}
                </select>
              </FR>
              <FR label="Timezone" color="#6b7280">
                <input value={cfg["timezone"]||"Africa/Nairobi"} onChange={e=>set("timezone",e.target.value)} style={{...inp,width:200}} />
              </FR>
              <FR label="Max Upload (MB)" color="#6b7280">
                <input value={cfg["max_upload_mb"]||"25"} onChange={e=>set("max_upload_mb",e.target.value)} style={{...inp,width:80}} type="number" />
              </FR>
              <FR label="Maintenance Mode" sub="⚠ Blocks all non-admin users" color="#dc2626">
                <Tog on={cfg["maintenance_mode"]==="true"} onChange={v=>set("maintenance_mode",v?"true":"false")} />
              </FR>
              <div style={{ marginTop:12 }}>
                <button onClick={doSave} disabled={saving} style={btn("#6b7280")}>
                  <Save style={{ width:13,height:13 }} />{saving?"Saving…":"Save & Apply"}
                </button>
              </div>
            </Sect>
          )}

        </div>
      </div>
    </div>
  );
}

export default function AdminPanelPage() {
  return (
    <RoleGuard allowed={["admin","webmaster"]}>
      <AdminInner />
    </RoleGuard>
  );
}
