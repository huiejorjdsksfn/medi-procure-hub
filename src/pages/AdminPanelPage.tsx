/**
 * ProcurBosse — Admin Control Panel v3.0
 * Full redesign: dark glass dashboard, live KPIs, complete control suite
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import RoleGuard from "@/components/RoleGuard";
import { toast } from "@/hooks/use-toast";
import { useSystemSettings, saveSettings } from "@/hooks/useSystemSettings";
import { sendSystemBroadcast } from "@/lib/broadcast";
import {
  Settings, Shield, Bell, Database, Globe, FileText, Package,
  Truck, DollarSign, BarChart3, Save, RefreshCw, Users, Building2,
  Mail, Server, Monitor, Sliders, Activity, Home,
  Archive, Printer, Search, Eye, TrendingUp, Layers, ShoppingCart,
  Gavel, FileCheck, ClipboardList, PiggyBank, BookOpen, Cpu, Code2,
  CheckCircle, AlertTriangle, Zap, Lock, Folder, ChevronRight,
  ChevronDown, Hash, Wifi, Terminal, Radio, Play, X, Plus,
  ArrowUp, ArrowDown, LayoutDashboard, UserCheck, Key, Palette,
  BookMarked, Receipt
} from "lucide-react";

// ── Sidebar sections ─────────────────────────────────────────────────────────
const SECTIONS = [
  { id:"overview",   label:"Overview",      icon:LayoutDashboard, color:"#4f46e5" },
  { id:"hospital",   label:"Hospital",      icon:Building2,       color:"#0078d4" },
  { id:"modules",    label:"Modules",       icon:Sliders,         color:"#0369a1" },
  { id:"users",      label:"Users & Roles", icon:UserCheck,       color:"#5C2D91" },
  { id:"security",   label:"Security",      icon:Shield,          color:"#dc2626" },
  { id:"email",      label:"Email & SMTP",  icon:Mail,            color:"#059669" },
  { id:"appearance", label:"Appearance",    icon:Palette,         color:"#8b5cf6" },
  { id:"print",      label:"Print & Docs",  icon:Printer,         color:"#C45911" },
  { id:"broadcast",  label:"Broadcast",     icon:Radio,           color:"#d97706" },
  { id:"database",   label:"Database",      icon:Database,        color:"#374151" },
  { id:"codebase",   label:"Codebase",      icon:Code2,           color:"#0f766e" },
  { id:"system",     label:"System",        icon:Server,          color:"#6b7280" },
];

const ALL_MODULES = [
  { label:"Requisitions",     path:"/requisitions",              icon:ClipboardList,  color:"#0078d4", key:"enable_procurement" },
  { label:"Purchase Orders",  path:"/purchase-orders",           icon:ShoppingCart,   color:"#C45911", key:"enable_procurement" },
  { label:"Goods Received",   path:"/goods-received",            icon:Package,        color:"#059669", key:"enable_procurement" },
  { label:"Suppliers",        path:"/suppliers",                 icon:Truck,          color:"#374151", key:"enable_procurement" },
  { label:"Tenders",          path:"/tenders",                   icon:Gavel,          color:"#1F6090", key:"enable_tenders" },
  { label:"Contracts",        path:"/contracts",                 icon:FileCheck,      color:"#1a3a6b", key:"enable_contracts_module" },
  { label:"Inventory Items",  path:"/items",                     icon:Layers,         color:"#059669", key:"enable_procurement" },
  { label:"Departments",      path:"/departments",               icon:Building2,      color:"#374151", key:"enable_procurement" },
  { label:"Payment Vouchers", path:"/vouchers/payment",          icon:DollarSign,     color:"#C45911", key:"enable_financials" },
  { label:"Receipt Vouchers", path:"/vouchers/receipt",          icon:Receipt,        color:"#059669", key:"enable_financials" },
  { label:"Journal Vouchers", path:"/vouchers/journal",          icon:BookMarked,     color:"#374151", key:"enable_financials" },
  { label:"Finance Dashboard",path:"/financials",                icon:BarChart3,      color:"#1F6090", key:"enable_financials" },
  { label:"Budgets",          path:"/financials/budgets",        icon:PiggyBank,      color:"#059669", key:"enable_financials" },
  { label:"Chart of Accounts",path:"/financials/chart-of-accounts",icon:BookOpen,   color:"#1a3a6b", key:"enable_financials" },
  { label:"QC Inspections",   path:"/quality/inspections",       icon:Eye,            color:"#059669", key:"enable_quality" },
  { label:"Non-Conformance",  path:"/quality/non-conformance",   icon:AlertTriangle,  color:"#dc2626", key:"enable_quality" },
  { label:"Reports",          path:"/reports",                   icon:BarChart3,      color:"#1a3a6b", key:"enable_procurement" },
  { label:"Documents",        path:"/documents",                 icon:FileText,       color:"#374151", key:"enable_documents" },
  { label:"Email",            path:"/email",                     icon:Mail,           color:"#7c3aed", key:"enable_email" },
  { label:"Users",            path:"/users",                     icon:Users,          color:"#0369a1", key:"enable_procurement" },
  { label:"Audit Log",        path:"/audit-log",                 icon:Activity,       color:"#C45911", key:"enable_procurement" },
  { label:"ODBC/SQL Server",  path:"/odbc",                      icon:Database,       color:"#0a2558", key:"enable_procurement" },
  { label:"IP Access",        path:"/admin/ip-access",           icon:Shield,         color:"#dc2626", key:"enable_procurement" },
  { label:"Settings",         path:"/settings",                  icon:Settings,       color:"#6b7280", key:"enable_procurement" },
  { label:"Webmaster",        path:"/webmaster",                 icon:Globe,          color:"#059669", key:"enable_procurement" },
];

const CODEBASE = {
  "src/pages":           ["DashboardPage.tsx","RequisitionsPage.tsx","PurchaseOrdersPage.tsx","GoodsReceivedPage.tsx","SuppliersPage.tsx","TendersPage.tsx","ContractsPage.tsx","ItemsPage.tsx","SettingsPage.tsx","AdminPanelPage.tsx","WebmasterPage.tsx","ODBCPage.tsx","IpAccessPage.tsx","UsersPage.tsx"],
  "src/lib":             ["printDocument.ts","audit.ts","broadcast.ts","sms.ts","ipRestriction.ts","sqlServerMigration.ts","notify.ts"],
  "src/hooks":           ["useSystemSettings.ts","usePermissions.ts","useProcurement.ts"],
  "src/components":      ["AppLayout.tsx","NetworkGuard.tsx","RoleGuard.tsx","ERPWheelButton.tsx"],
  "supabase/functions":  ["send-email/index.ts","send-sms/index.ts","notify-requisition/index.ts"],
  "electron":            ["main.js","preload.js"],
  ".github/workflows":   ["build-exe.yml","build-desktop.yml"],
};

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} style={{ background:"transparent",border:"none",cursor:"pointer",padding:0,lineHeight:0,flexShrink:0 }}>
      <div style={{ width:48,height:26,borderRadius:13,background:on?"#4f46e5":"#d1d5db",display:"flex",alignItems:"center",padding:"3px",transition:"background 0.2s" }}>
        <div style={{ width:20,height:20,borderRadius:"50%",background:"#fff",boxShadow:"0 1px 4px rgba(0,0,0,0.2)",transition:"transform 0.2s",transform:on?"translateX(22px)":"translateX(0)" }}/>
      </div>
    </button>
  );
}

function Row({ label, sub, children, color }: any) {
  return (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 0",borderBottom:"1px solid rgba(255,255,255,0.06)",gap:16 }}>
      <div style={{ flex:1 }}>
        { color && <div style={{ width:3,height:14,borderRadius:2,background:color,display:"inline-block",marginRight:8,verticalAlign:"middle" }}/> }
        <span style={{ fontSize:13.5,fontWeight:600,color:"#f1f5f9" }}>{label}</span>
        { sub && <div style={{ fontSize:11.5,color:"#64748b",marginTop:2 }}>{sub}</div> }
      </div>
      <div style={{ flexShrink:0 }}>{children}</div>
    </div>
  );
}

function Card({ title, icon: Icon, color, children }: any) {
  return (
    <div style={{ background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,padding:"18px 22px",marginBottom:20 }}>
      <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:14,paddingBottom:12,borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ width:34,height:34,borderRadius:9,background:color,display:"flex",alignItems:"center",justifyContent:"center" }}>
          <Icon style={{ width:17,height:17,color:"#fff" }}/>
        </div>
        <span style={{ fontSize:14,fontWeight:700,color:"#f1f5f9" }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

export default function AdminPanelPage() {
  const navigate = useNavigate();
  const { user, profile, roles } = useAuth();
  const { settings } = useSystemSettings();
  const [section, setSection] = useState("overview");
  const [localSettings, setLocalSettings] = useState<Record<string,string>>({});
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<Record<string,number>>({});
  const [statsLoading, setStatsLoading] = useState(true);
  const [broadcast, setBroadcast] = useState({ title:"", message:"", type:"info" });
  const [broadcasting, setBroadcasting] = useState(false);
  const [codeExpanded, setCodeExpanded] = useState<Set<string>>(new Set(["src/pages"]));

  const inp = { width:"100%", padding:"8px 11px", border:"1px solid rgba(255,255,255,0.12)", borderRadius:7, fontSize:13, color:"#f1f5f9", background:"rgba(255,255,255,0.06)", outline:"none" };
  const btn = (c: string, p = "8px 18px") => ({ padding:p, borderRadius:8, border:"none", background:c, color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" });

  useEffect(() => { setLocalSettings({...settings}); }, [settings]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    const tbls = ["requisitions","purchase_orders","suppliers","goods_received","payment_vouchers","profiles","documents","tenders"];
    const counts: Record<string,number> = {};
    for (const t of tbls) {
      const { count } = await (supabase as any).from(t).select("*",{count:"exact",head:true});
      counts[t] = count || 0;
    }
    setStats(counts);
    setStatsLoading(false);
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const set = (k: string, v: string) => setLocalSettings(p => ({...p, [k]: v}));
  const toggle = (k: string) => setLocalSettings(p => ({...p, [k]: p[k]==="true"?"false":"true"}));

  async function doSave() {
    setSaving(true);
    const res = await saveSettings(localSettings);
    if (res.ok) {
      toast({ title:"✅ Settings saved and propagated to all users" });
    } else {
      toast({ title:"Save failed", variant:"destructive" });
    }
    setSaving(false);
  }

  async function doBroadcast() {
    if (!broadcast.title || !broadcast.message) {
      toast({ title:"Title and message required", variant:"destructive" }); return;
    }
    setBroadcasting(true);
    await sendSystemBroadcast({ title: broadcast.title, message: broadcast.message, type: broadcast.type as any });
    toast({ title:"📡 Broadcast sent to all users" });
    setBroadcast({ title:"", message:"", type:"info" });
    setBroadcasting(false);
  }

  const KPI = [
    { label:"Requisitions",    n:stats.requisitions,    color:"#4f46e5", icon:ClipboardList, path:"/requisitions" },
    { label:"Purchase Orders", n:stats.purchase_orders, color:"#C45911", icon:ShoppingCart,  path:"/purchase-orders" },
    { label:"Suppliers",       n:stats.suppliers,       color:"#059669", icon:Truck,         path:"/suppliers" },
    { label:"Active Users",    n:stats.profiles,        color:"#8b5cf6", icon:Users,         path:"/users" },
    { label:"GRN Records",     n:stats.goods_received,  color:"#374151", icon:Package,       path:"/goods-received" },
    { label:"Vouchers",        n:stats.payment_vouchers,color:"#dc2626", icon:DollarSign,    path:"/vouchers/payment" },
    { label:"Documents",       n:stats.documents,       color:"#0369a1", icon:FileText,      path:"/documents" },
    { label:"Tenders",         n:stats.tenders,         color:"#d97706", icon:Gavel,         path:"/tenders" },
  ];

  const sidebarW = 200;

  return (
    <RoleGuard allowed={["admin","webmaster"]}>
      <div style={{ minHeight:"100%", background:"linear-gradient(135deg,#0a0f1e 0%,#0d1b35 50%,#0a1628 100%)", color:"#f1f5f9" }}>
        {/* Header */}
        <div style={{ background:"rgba(79,70,229,0.1)", borderBottom:"1px solid rgba(79,70,229,0.2)", padding:"14px 22px", display:"flex", alignItems:"center", gap:14, position:"sticky", top:0, zIndex:100, backdropFilter:"blur(12px)" }}>
          <div style={{ width:40,height:40,borderRadius:10,background:"linear-gradient(135deg,#4f46e5,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center" }}>
            <Settings style={{ width:20,height:20,color:"#fff" }}/>
          </div>
          <div>
            <div style={{ fontSize:17,fontWeight:800,color:"#f1f5f9" }}>Admin Control Panel</div>
            <div style={{ fontSize:11,color:"#64748b" }}>EL5 MediProcure · Embu Level 5 Hospital</div>
          </div>
          <div style={{ marginLeft:"auto",display:"flex",gap:8 }}>
            <button onClick={loadStats} style={{ ...btn("rgba(255,255,255,0.08)","8px 12px"),display:"flex",alignItems:"center",gap:5 }}>
              <RefreshCw style={{ width:13,height:13 }}/>
            </button>
            <button onClick={doSave} disabled={saving} style={{ ...btn("linear-gradient(135deg,#4f46e5,#7c3aed)"),display:"flex",alignItems:"center",gap:6 }}>
              <Save style={{ width:13,height:13 }}/>{saving ? "Saving…" : "Save All"}
            </button>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:`${sidebarW}px 1fr`, minHeight:"calc(100vh - 70px)" }}>
          {/* Sidebar */}
          <div style={{ background:"rgba(0,0,0,0.3)", borderRight:"1px solid rgba(255,255,255,0.05)", padding:"12px 0" }}>
            {SECTIONS.map(sec => (
              <button key={sec.id} onClick={() => setSection(sec.id)} style={{ width:"100%",display:"flex",alignItems:"center",gap:10,padding:"9px 14px",background:section===sec.id?`rgba(79,70,229,0.15)`:"transparent",border:"none",cursor:"pointer",borderLeft:section===sec.id?`3px solid ${sec.color}`:"3px solid transparent",transition:"all 0.15s" }}>
                <sec.icon style={{ width:15,height:15,color:section===sec.id?sec.color:"#475569",flexShrink:0 }}/>
                <span style={{ fontSize:12.5,fontWeight:section===sec.id?700:400,color:section===sec.id?"#f1f5f9":"#64748b" }}>{sec.label}</span>
              </button>
            ))}
          </div>

          {/* Main */}
          <div style={{ padding:"22px 28px", overflowY:"auto", maxHeight:"calc(100vh - 70px)" }}>

            {/* OVERVIEW */}
            {section === "overview" && (
              <div>
                <div style={{ fontSize:17,fontWeight:800,marginBottom:16,color:"#f1f5f9" }}>System Overview</div>
                {/* KPI grid */}
                <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:20 }}>
                  {KPI.map(k => (
                    <button key={k.label} onClick={() => navigate(k.path)} style={{ padding:"14px",borderRadius:12,border:"1px solid rgba(255,255,255,0.07)",background:"rgba(255,255,255,0.04)",cursor:"pointer",textAlign:"left",transition:"all 0.15s" }}>
                      <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8 }}>
                        <div style={{ width:28,height:28,borderRadius:7,background:k.color,display:"flex",alignItems:"center",justifyContent:"center" }}>
                          <k.icon style={{ width:14,height:14,color:"#fff" }}/>
                        </div>
                        <span style={{ fontSize:11,color:"#64748b" }}>{k.label}</span>
                      </div>
                      <div style={{ fontSize:24,fontWeight:800,color:"#f1f5f9" }}>{statsLoading?"…":(k.n||0).toLocaleString()}</div>
                    </button>
                  ))}
                </div>
                {/* Quick access modules */}
                <div style={{ fontSize:14,fontWeight:700,marginBottom:12,color:"#94a3b8" }}>Quick Access — All Modules</div>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(155px,1fr))",gap:6 }}>
                  {ALL_MODULES.map(m => (
                    <button key={m.path} onClick={() => navigate(m.path)} style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 11px",borderRadius:8,border:"1px solid rgba(255,255,255,0.07)",background:"rgba(255,255,255,0.03)",cursor:"pointer",textAlign:"left" }}>
                      <div style={{ width:26,height:26,borderRadius:6,background:`${m.color}22`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                        <m.icon style={{ width:13,height:13,color:m.color }}/>
                      </div>
                      <span style={{ fontSize:11.5,color:"#cbd5e1",fontWeight:500 }}>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* HOSPITAL INFO */}
            {section === "hospital" && (
              <Card title="Hospital Information" icon={Building2} color="#0078d4">
                {[
                  { k:"hospital_name",    l:"Hospital Name",     p:"Embu Level 5 Hospital" },
                  { k:"county_name",      l:"County Name",       p:"Embu County Government" },
                  { k:"department_name",  l:"Department",        p:"Department of Health" },
                  { k:"system_name",      l:"System Name",       p:"EL5 MediProcure" },
                  { k:"hospital_address", l:"Address",           p:"Embu Town, Kenya" },
                  { k:"po_box",           l:"P.O. Box",          p:"P.O. Box 591-60100" },
                  { k:"hospital_phone",   l:"Phone",             p:"+254 060 000000" },
                  { k:"hospital_email",   l:"Email",             p:"info@embu.health.go.ke" },
                  { k:"doc_footer",       l:"Document Footer",   p:"Embu Level 5 Hospital · Dept of Health" },
                  { k:"currency_symbol",  l:"Currency Symbol",   p:"KES" },
                  { k:"vat_rate",         l:"VAT Rate (%)",      p:"16" },
                  { k:"logo_url",         l:"Logo URL",          p:"https://…/logo.png" },
                  { k:"seal_url",         l:"Seal URL",          p:"https://…/seal.png" },
                ].map(f => (
                  <Row key={f.k} label={f.l} color="#0078d4">
                    <input value={localSettings[f.k]||""} onChange={e=>set(f.k,e.target.value)} style={{...inp,width:260}} placeholder={f.p}/>
                  </Row>
                ))}
                <div style={{ marginTop:16 }}>
                  <button onClick={doSave} disabled={saving} style={btn("linear-gradient(135deg,#0078d4,#0047ab)")}>{saving?"Saving…":"Save & Propagate"}</button>
                </div>
              </Card>
            )}

            {/* MODULES */}
            {section === "modules" && (
              <Card title="Module Toggles" icon={Sliders} color="#0369a1">
                {[
                  { k:"enable_procurement",      l:"Procurement Module",     s:"Requisitions, POs, GRN, Suppliers" },
                  { k:"enable_financials",        l:"Finance Module",         s:"Vouchers, Budgets, Chart of Accounts" },
                  { k:"enable_quality",           l:"Quality Control",        s:"Inspections, NCR, QA Dashboard" },
                  { k:"enable_tenders",           l:"Tenders & Contracts",    s:"Tender management and contracts" },
                  { k:"enable_documents",         l:"Document Library",       s:"Document management and sharing" },
                  { k:"enable_scanner",           l:"QR/Barcode Scanner",     s:"Inventory scanning module" },
                  { k:"enable_email",             l:"Email System",           s:"Internal email and notifications" },
                  { k:"realtime_notifications",   l:"Real-time Notifications",s:"Live system alerts via Supabase" },
                  { k:"maintenance_mode",         l:"Maintenance Mode",       s:"Block all users except admin" },
                ].map(f => (
                  <Row key={f.k} label={f.l} sub={f.s} color="#0369a1">
                    <Toggle on={localSettings[f.k]!=="false"} onChange={v=>set(f.k,v?"true":"false")}/>
                  </Row>
                ))}
                <div style={{ marginTop:16 }}>
                  <button onClick={doSave} disabled={saving} style={btn("#0369a1")}>{saving?"Saving…":"Save & Apply"}</button>
                </div>
              </Card>
            )}

            {/* USERS */}
            {section === "users" && (
              <div>
                <Card title="User Management" icon={UserCheck} color="#5C2D91">
                  <Row label="Default New User Role" color="#5C2D91">
                    <select value={localSettings["default_user_role"]||"requisitioner"} onChange={e=>set("default_user_role",e.target.value)} style={{...inp,width:220}}>
                      {["admin","procurement_manager","procurement_officer","inventory_manager","warehouse_officer","requisitioner"].map(r=>(
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </Row>
                  <Row label="Allow Self-Registration" sub="Let new users sign up without admin" color="#5C2D91">
                    <Toggle on={localSettings["allow_registration"]==="true"} onChange={v=>set("allow_registration",v?"true":"false")}/>
                  </Row>
                  <Row label="Audit All Logins" sub="Log every login attempt" color="#5C2D91">
                    <Toggle on={localSettings["audit_logins"]!=="false"} onChange={v=>set("audit_logins",v?"true":"false")}/>
                  </Row>
                  <div style={{ marginTop:14,display:"flex",gap:8 }}>
                    <button onClick={()=>navigate("/users")} style={btn("#5C2D91")}>Manage Users →</button>
                    <button onClick={doSave} disabled={saving} style={btn("rgba(255,255,255,0.1)")}>{saving?"Saving…":"Save"}</button>
                  </div>
                </Card>
              </div>
            )}

            {/* SECURITY */}
            {section === "security" && (
              <Card title="Security & Access Control" icon={Shield} color="#dc2626">
                {[
                  { k:"ip_restriction_enabled", l:"IP Restriction Active",    s:"Block unauthorized IP addresses" },
                  { k:"force_network_check",     l:"Check IP on Every Load",  s:"Strict mode — verify on navigation" },
                  { k:"allow_all_private",       l:"Allow All Private IPs",   s:"Auto-allow 192.168.x.x, 10.x.x.x" },
                  { k:"log_all_ips",             l:"Log All Access Attempts", s:"Record every IP check" },
                  { k:"revoke_on_ip_change",     l:"Revoke on IP Change",     s:"Force re-login if IP changes" },
                ].map(f => (
                  <Row key={f.k} label={f.l} sub={f.s} color="#dc2626">
                    <Toggle on={localSettings[f.k]==="true"} onChange={v=>set(f.k,v?"true":"false")}/>
                  </Row>
                ))}
                <Row label="Session Timeout (min)" color="#dc2626">
                  <input value={localSettings["session_timeout"]||"480"} onChange={e=>set("session_timeout",e.target.value)} style={{...inp,width:80}} type="number"/>
                </Row>
                <Row label="Max Login Attempts" color="#dc2626">
                  <input value={localSettings["max_login_attempts"]||"5"} onChange={e=>set("max_login_attempts",e.target.value)} style={{...inp,width:80}} type="number"/>
                </Row>
                <Row label="Allowed IPs" sub="Comma-separated CIDR, e.g. 192.168.1.0/24" color="#dc2626">
                  <input value={localSettings["allowed_ips"]||""} onChange={e=>set("allowed_ips",e.target.value)} style={{...inp,width:300}} placeholder="192.168.1.0/24, 10.0.0.0/8"/>
                </Row>
                <div style={{ marginTop:14,display:"flex",gap:8 }}>
                  <button onClick={()=>navigate("/admin/ip-access")} style={btn("#dc2626")}>IP Access Manager →</button>
                  <button onClick={doSave} disabled={saving} style={btn("rgba(255,255,255,0.1)")}>{saving?"Saving…":"Save"}</button>
                </div>
              </Card>
            )}

            {/* EMAIL */}
            {section === "email" && (
              <Card title="Email & SMTP Configuration" icon={Mail} color="#059669">
                {[
                  { k:"smtp_host",      l:"SMTP Host",     p:"smtp.gmail.com" },
                  { k:"smtp_port",      l:"SMTP Port",     p:"587" },
                  { k:"smtp_user",      l:"SMTP Username", p:"noreply@embu.go.ke" },
                  { k:"smtp_from_name", l:"From Name",     p:"EL5 MediProcure" },
                  { k:"smtp_from_email",l:"From Email",    p:"noreply@embu.go.ke" },
                ].map(f => (
                  <Row key={f.k} label={f.l} color="#059669">
                    <input value={localSettings[f.k]||""} onChange={e=>set(f.k,e.target.value)} style={{...inp,width:260}} placeholder={f.p}/>
                  </Row>
                ))}
                <Row label="SMTP Password" color="#059669">
                  <input type="password" value={localSettings["smtp_pass"]||""} onChange={e=>set("smtp_pass",e.target.value)} style={{...inp,width:260}} placeholder="••••••••"/>
                </Row>
                <Row label="Enable TLS" color="#059669"><Toggle on={localSettings["smtp_tls"]!=="false"} onChange={v=>set("smtp_tls",v?"true":"false")}/></Row>
                <Row label="Enable SMTP" sub="Use SMTP for email delivery" color="#059669"><Toggle on={localSettings["smtp_enabled"]==="true"} onChange={v=>set("smtp_enabled",v?"true":"false")}/></Row>
                <Row label="Twilio SMS Enabled" sub="SMS notifications via Twilio" color="#059669"><Toggle on={localSettings["twilio_enabled"]==="true"} onChange={v=>set("twilio_enabled",v?"true":"false")}/></Row>
                {[
                  { k:"twilio_account_sid",  l:"Twilio Account SID", p:"ACxxxx" },
                  { k:"twilio_phone_number", l:"Twilio From Number",  p:"+12025551234" },
                ].map(f => (
                  <Row key={f.k} label={f.l} color="#059669">
                    <input value={localSettings[f.k]||""} onChange={e=>set(f.k,e.target.value)} style={{...inp,width:260}} placeholder={f.p}/>
                  </Row>
                ))}
                <div style={{ marginTop:14 }}>
                  <button onClick={doSave} disabled={saving} style={btn("#059669")}>{saving?"Saving…":"Save & Apply"}</button>
                </div>
              </Card>
            )}

            {/* APPEARANCE */}
            {section === "appearance" && (
              <Card title="Appearance & UI" icon={Palette} color="#8b5cf6">
                {[{ k:"primary_color",l:"Primary Color" },{ k:"accent_color",l:"Accent Color" }].map(f=>(
                  <Row key={f.k} label={f.l} color="#8b5cf6">
                    <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                      <input type="color" value={localSettings[f.k]||"#1a3a6b"} onChange={e=>set(f.k,e.target.value)} style={{ width:40,height:32,borderRadius:6,cursor:"pointer",border:"1px solid rgba(255,255,255,0.2)",padding:2,background:"transparent" }}/>
                      <input value={localSettings[f.k]||""} onChange={e=>set(f.k,e.target.value)} style={{...inp,width:100}} placeholder="#1a3a6b"/>
                    </div>
                  </Row>
                ))}
                <div style={{ marginTop:14 }}>
                  <button onClick={doSave} disabled={saving} style={btn("#8b5cf6")}>{saving?"Saving…":"Save & Propagate"}</button>
                </div>
              </Card>
            )}

            {/* PRINT */}
            {section === "print" && (
              <Card title="Print & Document Settings" icon={Printer} color="#C45911">
                <Row label="Print Font" color="#C45911">
                  <select value={localSettings["print_font"]||"Times New Roman"} onChange={e=>set("print_font",e.target.value)} style={{...inp,width:200}}>
                    {["Times New Roman","Arial","Calibri","Georgia","Cambria"].map(f=><option key={f}>{f}</option>)}
                  </select>
                </Row>
                <Row label="Font Size (pt)" color="#C45911">
                  <input value={localSettings["print_font_size"]||"11"} onChange={e=>set("print_font_size",e.target.value)} style={{...inp,width:60}} type="number" min="8" max="16"/>
                </Row>
                <Row label="Paper Size" color="#C45911">
                  <select value={localSettings["paper_size"]||"A4"} onChange={e=>set("paper_size",e.target.value)} style={{...inp,width:120}}>
                    {["A4","Letter","Legal","A5"].map(s=><option key={s}>{s}</option>)}
                  </select>
                </Row>
                <Row label="Show Hospital Logo" color="#C45911"><Toggle on={localSettings["show_logo_print"]!=="false"} onChange={v=>set("show_logo_print",v?"true":"false")}/></Row>
                <Row label="Show Official Stamp Box" color="#C45911"><Toggle on={localSettings["show_stamp"]!=="false"} onChange={v=>set("show_stamp",v?"true":"false")}/></Row>
                <Row label="Confidential Notice" sub="'Note: Private and Confidential'" color="#C45911"><Toggle on={localSettings["print_confidential"]!=="false"} onChange={v=>set("print_confidential",v?"true":"false")}/></Row>
                <div style={{ marginTop:14 }}>
                  <button onClick={doSave} disabled={saving} style={btn("#C45911")}>{saving?"Saving…":"Save & Apply"}</button>
                </div>
              </Card>
            )}

            {/* BROADCAST */}
            {section === "broadcast" && (
              <Card title="System Broadcast" icon={Radio} color="#d97706">
                <div style={{ marginBottom:10 }}>
                  <label style={{ fontSize:12,color:"#94a3b8",display:"block",marginBottom:4 }}>Broadcast Title</label>
                  <input value={broadcast.title} onChange={e=>setBroadcast(p=>({...p,title:e.target.value}))} style={{...inp}} placeholder="System Alert"/>
                </div>
                <div style={{ marginBottom:10 }}>
                  <label style={{ fontSize:12,color:"#94a3b8",display:"block",marginBottom:4 }}>Message</label>
                  <textarea value={broadcast.message} onChange={e=>setBroadcast(p=>({...p,message:e.target.value}))} style={{...inp,height:80,resize:"vertical"}} placeholder="Broadcast message to all users…"/>
                </div>
                <div style={{ marginBottom:14 }}>
                  <label style={{ fontSize:12,color:"#94a3b8",display:"block",marginBottom:4 }}>Type</label>
                  <select value={broadcast.type} onChange={e=>setBroadcast(p=>({...p,type:e.target.value}))} style={{...inp,width:160}}>
                    {["info","warning","success","error","maintenance","announcement"].map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <button onClick={doBroadcast} disabled={broadcasting} style={{ ...btn("#d97706"),display:"flex",alignItems:"center",gap:6 }}>
                  <Play style={{ width:13,height:13 }}/>{broadcasting?"Sending…":"Send to All Users"}
                </button>
              </Card>
            )}

            {/* DATABASE */}
            {section === "database" && (
              <Card title="Database" icon={Database} color="#374151">
                <Row label="Supabase Project ID" color="#374151"><span style={{ fontFamily:"monospace",fontSize:12,color:"#94a3b8" }}>yvjfehnzbzjliizjvuhq</span></Row>
                <Row label="Supabase URL" color="#374151"><span style={{ fontFamily:"monospace",fontSize:11,color:"#64748b" }}>https://yvjfehnzbzjliizjvuhq.supabase.co</span></Row>
                <Row label="Region" color="#374151"><span style={{ color:"#94a3b8" }}>af-south-1 (Africa)</span></Row>
                <div style={{ marginTop:14,display:"flex",gap:8,flexWrap:"wrap" }}>
                  <button onClick={()=>navigate("/admin/database")} style={btn("#374151")}>DB Admin (DBGate) →</button>
                  <button onClick={()=>navigate("/odbc")} style={btn("#0a2558")}>ODBC / SQL Server →</button>
                  <button onClick={()=>navigate("/backup")} style={btn("#065f46")}>Backup Manager →</button>
                  <button onClick={()=>navigate("/audit-log")} style={btn("#C45911")}>Audit Log →</button>
                </div>
              </Card>
            )}

            {/* CODEBASE */}
            {section === "codebase" && (
              <div>
                <div style={{ fontSize:14,fontWeight:700,marginBottom:12,color:"#94a3b8" }}>Source Code — ProcurBosse v2.0</div>
                <div style={{ background:"rgba(0,0,0,0.4)",borderRadius:12,border:"1px solid rgba(255,255,255,0.07)",overflow:"hidden" }}>
                  {Object.entries(CODEBASE).map(([folder, files]) => {
                    const expanded = codeExpanded.has(folder);
                    return (
                      <div key={folder}>
                        <button onClick={() => setCodeExpanded(prev => { const s=new Set(prev); s.has(folder)?s.delete(folder):s.add(folder); return s; })}
                          style={{ width:"100%",display:"flex",alignItems:"center",gap:8,padding:"9px 14px",background:expanded?"rgba(79,70,229,0.1)":"transparent",border:"none",borderBottom:"1px solid rgba(255,255,255,0.04)",cursor:"pointer" }}>
                          {expanded ? <ChevronDown style={{ width:13,height:13,color:"#94a3b8" }}/> : <ChevronRight style={{ width:13,height:13,color:"#64748b" }}/>}
                          <Folder style={{ width:14,height:14,color:"#d97706" }}/>
                          <span style={{ fontSize:12,fontFamily:"monospace",fontWeight:600,color:"#cbd5e1" }}>{folder}/</span>
                          <span style={{ fontSize:10,color:"#475569",marginLeft:"auto" }}>{files.length} files</span>
                        </button>
                        {expanded && files.map(file => (
                          <div key={file} style={{ display:"flex",alignItems:"center",gap:8,padding:"5px 14px 5px 36px",borderBottom:"1px solid rgba(255,255,255,0.03)" }}>
                            <FileText style={{ width:11,height:11,color: file.endsWith(".ts")||file.endsWith(".tsx")?"#61afef": file.endsWith(".yml")?"#98c379":"#abb2bf",flexShrink:0 }}/>
                            <span style={{ fontSize:11,fontFamily:"monospace",color:"#94a3b8" }}>{file}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop:12,fontSize:12,color:"#475569" }}>
                  Repo: <a href="https://github.com/huiejorjdsksfn/medi-procure-hub" target="_blank" rel="noreferrer" style={{ color:"#4f46e5" }}>github.com/huiejorjdsksfn/medi-procure-hub</a>
                </div>
              </div>
            )}

            {/* SYSTEM */}
            {section === "system" && (
              <Card title="System Configuration" icon={Server} color="#6b7280">
                <Row label="System Version" color="#6b7280"><span style={{ fontFamily:"monospace",fontWeight:700,color:"#4f46e5" }}>v2.0.0 — ProcurBosse</span></Row>
                <Row label="Date Format" color="#6b7280">
                  <select value={localSettings["date_format"]||"DD/MM/YYYY"} onChange={e=>set("date_format",e.target.value)} style={{...inp,width:150}}>
                    {["DD/MM/YYYY","MM/DD/YYYY","YYYY-MM-DD"].map(f=><option key={f}>{f}</option>)}
                  </select>
                </Row>
                <Row label="Timezone" color="#6b7280">
                  <input value={localSettings["timezone"]||"Africa/Nairobi"} onChange={e=>set("timezone",e.target.value)} style={{...inp,width:200}}/>
                </Row>
                <Row label="Max Upload (MB)" color="#6b7280">
                  <input value={localSettings["max_upload_mb"]||"25"} onChange={e=>set("max_upload_mb",e.target.value)} style={{...inp,width:80}} type="number"/>
                </Row>
                <Row label="Maintenance Mode" sub="Blocks all non-admin users" color="#dc2626">
                  <Toggle on={localSettings["maintenance_mode"]==="true"} onChange={v=>set("maintenance_mode",v?"true":"false")}/>
                </Row>
                <div style={{ marginTop:14 }}>
                  <button onClick={doSave} disabled={saving} style={btn("#6b7280")}>{saving?"Saving…":"Save & Apply"}</button>
                </div>
              </Card>
            )}

          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
