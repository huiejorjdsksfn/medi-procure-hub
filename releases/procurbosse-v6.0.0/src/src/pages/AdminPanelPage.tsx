/**
 * ProcurBosse — Admin Control Panel v4.0 (NUCLEAR REWRITE)
 * Sidebar navigation + live KPIs + full system control
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
  LayoutDashboard, Building2, Sliders, Users, Shield, Mail, Palette,
  Printer, Radio, Database, Code2, Server, RefreshCw, Save, ChevronRight,
  Activity, Package, ShoppingCart, Truck, Gavel, FileCheck, DollarSign,
  BookOpen, PiggyBank, Eye, AlertTriangle, BarChart2, FileText, Globe,
  Folder, FolderOpen, Phone, Play, UserCheck, Settings
} from "lucide-react";

const NAV = [
  { id:"overview",   label:"Overview",      icon:LayoutDashboard, color:"#4f46e5" },
  { id:"hospital",   label:"Hospital Info",  icon:Building2,       color:"#0078d4" },
  { id:"modules",    label:"Modules",        icon:Sliders,         color:"#0369a1" },
  { id:"users",      label:"Users & Access", icon:UserCheck,       color:"#7c3aed" },
  { id:"security",   label:"Security / IP",  icon:Shield,          color:"#dc2626" },
  { id:"email",      label:"Email & SMTP",   icon:Mail,            color:"#059669" },
  { id:"sms",        label:"SMS / Twilio",   icon:Phone,           color:"#7c3aed" },
  { id:"appearance", label:"Appearance",     icon:Palette,         color:"#8b5cf6" },
  { id:"print",      label:"Print & Docs",   icon:Printer,         color:"#C45911" },
  { id:"broadcast",  label:"Broadcast",      icon:Radio,           color:"#d97706" },
  { id:"database",   label:"Database",       icon:Database,        color:"#374151" },
  { id:"codebase",   label:"Source Code",    icon:Code2,           color:"#0f766e" },
  { id:"system",     label:"System",         icon:Server,          color:"#6b7280" },
];

const MODULES = [
  { label:"Dashboard",        path:"/",                              icon:LayoutDashboard, color:"#4f46e5" },
  { label:"Requisitions",     path:"/requisitions",                 icon:ShoppingCart,    color:"#0078d4" },
  { label:"Purchase Orders",  path:"/purchase-orders",              icon:Package,         color:"#C45911" },
  { label:"Goods Received",   path:"/goods-received",               icon:Truck,           color:"#059669" },
  { label:"Suppliers",        path:"/suppliers",                    icon:Truck,           color:"#374151" },
  { label:"Tenders",          path:"/tenders",                      icon:Gavel,           color:"#1F6090" },
  { label:"Contracts",        path:"/contracts",                    icon:FileCheck,       color:"#1a3a6b" },
  { label:"Inventory",        path:"/items",                        icon:Package,         color:"#059669" },
  { label:"Payment Vouchers", path:"/vouchers/payment",             icon:DollarSign,      color:"#C45911" },
  { label:"Receipt Vouchers", path:"/vouchers/receipt",             icon:DollarSign,      color:"#059669" },
  { label:"Journal Vouchers", path:"/vouchers/journal",             icon:BookOpen,        color:"#374151" },
  { label:"Finance",          path:"/financials",                   icon:BarChart2,       color:"#1F6090" },
  { label:"Budgets",          path:"/financials/budgets",           icon:PiggyBank,       color:"#059669" },
  { label:"Chart of Accounts",path:"/financials/chart-of-accounts",icon:BookOpen,        color:"#1a3a6b" },
  { label:"Fixed Assets",     path:"/financials/fixed-assets",     icon:Building2,       color:"#d97706" },
  { label:"QC Dashboard",     path:"/quality/dashboard",            icon:Eye,             color:"#7c3aed" },
  { label:"Inspections",      path:"/quality/inspections",          icon:Eye,             color:"#059669" },
  { label:"Non-Conformance",  path:"/quality/non-conformance",      icon:AlertTriangle,   color:"#dc2626" },
  { label:"Reports",          path:"/reports",                      icon:BarChart2,       color:"#1a3a6b" },
  { label:"Documents",        path:"/documents",                    icon:FileText,        color:"#374151" },
  { label:"Email",            path:"/email",                        icon:Mail,            color:"#7c3aed" },
  { label:"Users",            path:"/users",                        icon:Users,           color:"#0369a1" },
  { label:"Audit Log",        path:"/audit-log",                    icon:Activity,        color:"#C45911" },
  { label:"IP Access",        path:"/admin/ip-access",              icon:Shield,          color:"#dc2626" },
  { label:"ODBC / SQL",       path:"/odbc",                         icon:Database,        color:"#0a2558" },
  { label:"Settings",         path:"/settings",                     icon:Settings,        color:"#6b7280" },
  { label:"Webmaster",        path:"/webmaster",                    icon:Globe,           color:"#059669" },
];

const CODE_TREE: Record<string,string[]> = {
  "src/pages":           ["AdminPanelPage.tsx","SettingsPage.tsx","DashboardPage.tsx","RequisitionsPage.tsx","PurchaseOrdersPage.tsx","GoodsReceivedPage.tsx","SuppliersPage.tsx","TendersPage.tsx","ContractsPage.tsx","ItemsPage.tsx","UsersPage.tsx","ODBCPage.tsx","IpAccessPage.tsx"],
  "src/pages/financials":["BudgetsPage.tsx","ChartOfAccountsPage.tsx","FixedAssetsPage.tsx"],
  "src/pages/quality":   ["QualityDashboardPage.tsx","InspectionsPage.tsx","NonConformancePage.tsx"],
  "src/pages/vouchers":  ["PaymentVouchersPage.tsx","ReceiptVouchersPage.tsx","JournalVouchersPage.tsx"],
  "src/lib":             ["printDocument.ts","audit.ts","broadcast.ts","sms.ts","ipRestriction.ts","notify.ts"],
  "src/hooks":           ["useSystemSettings.ts","usePermissions.ts"],
  "src/components":      ["AppLayout.tsx","NetworkGuard.tsx","RoleGuard.tsx"],
  "supabase/functions":  ["send-email/index.ts","send-sms/index.ts"],
  ".github/workflows":   ["build-exe.yml","build-v5.yml","build-v6.yml","build-v7.yml","build-desktop.yml"],
};

const Toggle = ({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) => (
  <button onClick={() => onChange(!on)} style={{ background:"none",border:"none",cursor:"pointer",padding:0 }}>
    <div style={{ width:46,height:24,borderRadius:12,background:on?"#4f46e5":"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",padding:"2px",transition:"background 0.2s",border:`1px solid ${on?"#4f46e5":"rgba(255,255,255,0.2)"}` }}>
      <div style={{ width:20,height:20,borderRadius:"50%",background:"#fff",transition:"transform 0.2s",transform:on?"translateX(22px)":"translateX(0)",boxShadow:"0 1px 3px rgba(0,0,0,0.3)" }} />
    </div>
  </button>
);

const Row = ({ label, sub, color, children }: any) => (
  <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,0.06)",gap:12 }}>
    <div style={{ flex:1 }}>
      {color && <span style={{ display:"inline-block",width:3,height:12,borderRadius:2,background:color,marginRight:8,verticalAlign:"middle" }} />}
      <span style={{ fontSize:13,fontWeight:500,color:"#f1f5f9" }}>{label}</span>
      {sub && <div style={{ fontSize:11,color:"#64748b",marginTop:2 }}>{sub}</div>}
    </div>
    <div style={{ flexShrink:0 }}>{children}</div>
  </div>
);

const Card = ({ title, icon: Icon, color, children }: any) => (
  <div style={{ background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:"16px 20px",marginBottom:16 }}>
    <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:14,paddingBottom:10,borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
      <div style={{ width:32,height:32,borderRadius:8,background:color,display:"flex",alignItems:"center",justifyContent:"center" }}>
        <Icon style={{ width:16,height:16,color:"#fff" }} />
      </div>
      <span style={{ fontSize:14,fontWeight:600,color:"#f1f5f9" }}>{title}</span>
    </div>
    {children}
  </div>
);

export default function AdminPanelPage() {
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const { settings } = useSystemSettings();
  const [active,   setActive]   = useState("overview");
  const [cfg,      setCfg]      = useState<Record<string,string>>({});
  const [saving,   setSaving]   = useState(false);
  const [stats,    setStats]    = useState<Record<string,number>>({});
  const [loading,  setLoading]  = useState(true);
  const [expanded, setExpanded] = useState(new Set(["src/pages"]));
  const [bcast,    setBcast]    = useState({ title:"",body:"",type:"info" });
  const [bcasting, setBcasting] = useState(false);

  const inp = { padding:"8px 11px",border:"1px solid rgba(255,255,255,0.12)",borderRadius:7,fontSize:13,color:"#f1f5f9",background:"rgba(255,255,255,0.06)",outline:"none",width:"100%" };
  const btn = (bg: string) => ({ padding:"8px 18px",borderRadius:8,border:"none",background:bg,color:"#fff",fontWeight:600 as const,fontSize:13,cursor:"pointer",display:"inline-flex" as const,alignItems:"center" as const,gap:6 });

  useEffect(() => { setCfg({...settings}); }, [settings]);

  const loadStats = useCallback(async () => {
    setLoading(true);
    const tbls = ["requisitions","purchase_orders","suppliers","items","goods_received","payment_vouchers","documents","tenders","profiles","audit_log"];
    const counts: Record<string,number> = {};
    await Promise.all(tbls.map(async t => {
      const { count } = await (supabase as any).from(t).select("*",{count:"exact",head:true});
      counts[t] = count || 0;
    }));
    setStats(counts); setLoading(false);
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const set = (k: string, v: string) => setCfg(p => ({...p,[k]:v}));

  async function doSave() {
    setSaving(true);
    const res = await saveSettings(cfg);
    if (res.ok) toast({ title:"✅ Settings saved and propagated" });
    else toast({ title:"Save failed",variant:"destructive" });
    setSaving(false);
  }

  async function doBroadcast() {
    if (!bcast.title||!bcast.body){ toast({title:"Title and message required",variant:"destructive"}); return; }
    setBcasting(true);
    await sendSystemBroadcast({ title:bcast.title,message:bcast.body,type:bcast.type as any });
    toast({ title:"📡 Broadcast sent" });
    setBcast({title:"",body:"",type:"info"});
    setBcasting(false);
  }

  const KPI = [
    { label:"Requisitions",   n:stats.requisitions,    color:"#4f46e5",path:"/requisitions",   icon:ShoppingCart },
    { label:"Purchase Orders",n:stats.purchase_orders, color:"#C45911",path:"/purchase-orders", icon:Package },
    { label:"Suppliers",      n:stats.suppliers,       color:"#059669",path:"/suppliers",       icon:Truck },
    { label:"Items",          n:stats.items,           color:"#0369a1",path:"/items",           icon:Package },
    { label:"Users",          n:stats.profiles,        color:"#7c3aed",path:"/users",           icon:Users },
    { label:"GRN Records",    n:stats.goods_received,  color:"#374151",path:"/goods-received",  icon:Truck },
    { label:"Vouchers",       n:stats.payment_vouchers,color:"#dc2626",path:"/vouchers/payment",icon:DollarSign },
    { label:"Tenders",        n:stats.tenders,         color:"#d97706",path:"/tenders",         icon:Gavel },
  ];

  return (
    <RoleGuard allowed={["admin","webmaster"]}>
      <div style={{ minHeight:"100vh",background:"linear-gradient(135deg,#070d1a 0%,#0d1b35 50%,#0a1225 100%)",color:"#f1f5f9",fontFamily:"var(--font-sans)" }}>

        {/* Top bar */}
        <div style={{ background:"rgba(79,70,229,0.12)",borderBottom:"1px solid rgba(79,70,229,0.25)",padding:"12px 24px",display:"flex",alignItems:"center",gap:14,position:"sticky",top:0,zIndex:50,backdropFilter:"blur(10px)" }}>
          <img src={logoImg} alt="EL5H" style={{ width:34,height:34,borderRadius:8,objectFit:"contain",background:"rgba(255,255,255,0.1)",padding:4 }} />
          <div>
            <div style={{ fontSize:16,fontWeight:700,color:"#f1f5f9" }}>Admin Control Panel</div>
            <div style={{ fontSize:11,color:"#64748b" }}>EL5 MediProcure · Embu Level 5 Hospital</div>
          </div>
          <div style={{ marginLeft:"auto",display:"flex",gap:8 }}>
            <button onClick={loadStats} style={{ ...btn("rgba(255,255,255,0.08)"),padding:"8px 12px" }}><RefreshCw style={{ width:13,height:13 }} /></button>
            <button onClick={doSave} disabled={saving} style={btn("linear-gradient(135deg,#4f46e5,#7c3aed)")}><Save style={{ width:13,height:13 }} />{saving?"Saving…":"Save All"}</button>
          </div>
        </div>

        <div style={{ display:"grid",gridTemplateColumns:"200px 1fr",minHeight:"calc(100vh - 60px)" }}>

          {/* Sidebar */}
          <div style={{ background:"rgba(0,0,0,0.35)",borderRight:"1px solid rgba(255,255,255,0.05)",paddingTop:8 }}>
            {NAV.map(n => (
              <button key={n.id} onClick={() => setActive(n.id)}
                style={{ width:"100%",display:"flex",alignItems:"center",gap:9,padding:"9px 14px",background:active===n.id?`rgba(79,70,229,0.18)`:"transparent",border:"none",borderLeft:active===n.id?`3px solid ${n.color}`:"3px solid transparent",cursor:"pointer",transition:"all 0.15s" }}>
                <n.icon style={{ width:14,height:14,color:active===n.id?n.color:"#475569",flexShrink:0 }} />
                <span style={{ fontSize:12.5,fontWeight:active===n.id?600:400,color:active===n.id?"#f1f5f9":"#64748b" }}>{n.label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{ padding:"22px 28px",overflowY:"auto",maxHeight:"calc(100vh - 60px)" }}>

            {active==="overview" && (
              <div>
                <div style={{ fontSize:16,fontWeight:700,marginBottom:14,color:"#f1f5f9" }}>System Overview</div>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:20 }}>
                  {KPI.map(k => (
                    <button key={k.label} onClick={() => navigate(k.path)}
                      style={{ padding:14,borderRadius:10,border:"1px solid rgba(255,255,255,0.07)",background:"rgba(255,255,255,0.04)",cursor:"pointer",textAlign:"left" }}>
                      <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8 }}>
                        <div style={{ width:26,height:26,borderRadius:7,background:k.color,display:"flex",alignItems:"center",justifyContent:"center" }}>
                          <k.icon style={{ width:13,height:13,color:"#fff" }} />
                        </div>
                        <span style={{ fontSize:11,color:"#64748b" }}>{k.label}</span>
                      </div>
                      <div style={{ fontSize:22,fontWeight:700,color:"#f1f5f9" }}>{loading?"…":(k.n||0).toLocaleString()}</div>
                    </button>
                  ))}
                </div>
                <div style={{ fontSize:13,fontWeight:600,color:"#64748b",marginBottom:10 }}>All Modules — Quick Access</div>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:6 }}>
                  {MODULES.map(m => (
                    <button key={m.path} onClick={() => navigate(m.path)}
                      style={{ display:"flex",alignItems:"center",gap:7,padding:"7px 10px",borderRadius:8,border:"1px solid rgba(255,255,255,0.07)",background:"rgba(255,255,255,0.03)",cursor:"pointer" }}>
                      <div style={{ width:24,height:24,borderRadius:6,background:`${m.color}22`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                        <m.icon style={{ width:12,height:12,color:m.color }} />
                      </div>
                      <span style={{ fontSize:11,color:"#cbd5e1",fontWeight:500 }}>{m.label}</span>
                      <ChevronRight style={{ width:10,height:10,color:"#475569",marginLeft:"auto",flexShrink:0 }} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {active==="hospital" && (
              <Card title="Hospital Information" icon={Building2} color="#0078d4">
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
                  <Row key={f.k} label={f.l} color="#0078d4">
                    <input value={cfg[f.k]||""} onChange={e=>set(f.k,e.target.value)} placeholder={f.p} style={{...inp,width:260}} />
                  </Row>
                ))}
                <div style={{ marginTop:12 }}><button onClick={doSave} disabled={saving} style={btn("#0078d4")}><Save style={{ width:13,height:13 }} />{saving?"Saving…":"Save"}</button></div>
              </Card>
            )}

            {active==="modules" && (
              <Card title="Module Toggles" icon={Sliders} color="#0369a1">
                {[
                  {k:"enable_procurement",    l:"Procurement",         s:"Requisitions, POs, GRN, Suppliers"},
                  {k:"enable_financials",      l:"Finance",             s:"Vouchers, Budgets, Chart of Accounts"},
                  {k:"enable_quality",         l:"Quality Control",    s:"Inspections, NCR, QA Dashboard"},
                  {k:"enable_tenders",         l:"Tenders & Contracts",s:"Tender management"},
                  {k:"enable_documents",       l:"Documents",          s:"Document library"},
                  {k:"enable_email",           l:"Email System",       s:"Internal mail"},
                  {k:"realtime_notifications", l:"Real-time Alerts",   s:"Live notifications"},
                  {k:"maintenance_mode",       l:"Maintenance Mode",   s:"⚠ Blocks all non-admin users"},
                ].map(f => (
                  <Row key={f.k} label={f.l} sub={f.s} color={f.k==="maintenance_mode"?"#dc2626":"#0369a1"}>
                    <Toggle on={(cfg[f.k]||"true")!=="false"} onChange={v=>set(f.k,v?"true":"false")} />
                  </Row>
                ))}
                <div style={{ marginTop:12 }}><button onClick={doSave} disabled={saving} style={btn("#0369a1")}><Save style={{ width:13,height:13 }} />{saving?"Saving…":"Save & Apply"}</button></div>
              </Card>
            )}

            {active==="users" && (
              <Card title="Users & Access Control" icon={UserCheck} color="#7c3aed">
                <Row label="Default Role" color="#7c3aed">
                  <select value={cfg["default_user_role"]||"requisitioner"} onChange={e=>set("default_user_role",e.target.value)} style={{...inp,width:220}}>
                    {["admin","procurement_manager","procurement_officer","inventory_manager","warehouse_officer","requisitioner"].map(r=><option key={r}>{r}</option>)}
                  </select>
                </Row>
                <Row label="Allow Self-Registration" sub="Users can sign up without admin" color="#7c3aed">
                  <Toggle on={cfg["allow_registration"]==="true"} onChange={v=>set("allow_registration",v?"true":"false")} />
                </Row>
                <Row label="Audit All Logins" color="#7c3aed">
                  <Toggle on={(cfg["audit_logins"]||"true")!=="false"} onChange={v=>set("audit_logins",v?"true":"false")} />
                </Row>
                <div style={{ marginTop:14,display:"flex",gap:8 }}>
                  <button onClick={()=>navigate("/users")} style={btn("#7c3aed")}>Manage Users →</button>
                  <button onClick={doSave} disabled={saving} style={btn("rgba(255,255,255,0.1)")}><Save style={{ width:13,height:13 }} />{saving?"Saving…":"Save"}</button>
                </div>
              </Card>
            )}

            {active==="security" && (
              <Card title="Security & IP Restriction" icon={Shield} color="#dc2626">
                {[
                  {k:"ip_restriction_enabled",l:"IP Restriction Active", s:"Block unauthorized IP addresses"},
                  {k:"allow_all_private",      l:"Allow All Private IPs",s:"Auto-allow 10.x, 192.168.x"},
                  {k:"log_all_ips",            l:"Log All Access",       s:"Record every IP check"},
                  {k:"revoke_on_ip_change",    l:"Revoke on IP Change",  s:"Force re-login if IP changes"},
                  {k:"force_network_check",    l:"Strict IP Check",      s:"Verify IP on every navigation"},
                ].map(f => (
                  <Row key={f.k} label={f.l} sub={f.s} color="#dc2626">
                    <Toggle on={cfg[f.k]==="true"} onChange={v=>set(f.k,v?"true":"false")} />
                  </Row>
                ))}
                <Row label="Session Timeout (min)" color="#dc2626">
                  <input value={cfg["session_timeout"]||"480"} onChange={e=>set("session_timeout",e.target.value)} style={{...inp,width:80}} type="number" />
                </Row>
                <Row label="Max Login Attempts" color="#dc2626">
                  <input value={cfg["max_login_attempts"]||"5"} onChange={e=>set("max_login_attempts",e.target.value)} style={{...inp,width:80}} type="number" />
                </Row>
                <div style={{ marginTop:14,display:"flex",gap:8 }}>
                  <button onClick={()=>navigate("/admin/ip-access")} style={btn("#dc2626")}>IP Access Manager →</button>
                  <button onClick={doSave} disabled={saving} style={btn("rgba(255,255,255,0.1)")}><Save style={{ width:13,height:13 }} />{saving?"Saving…":"Save"}</button>
                </div>
              </Card>
            )}

            {active==="email" && (
              <Card title="Email & SMTP" icon={Mail} color="#059669">
                {[
                  {k:"smtp_host",      l:"SMTP Host",    p:"smtp.gmail.com"},
                  {k:"smtp_port",      l:"SMTP Port",    p:"587"},
                  {k:"smtp_user",      l:"Username",     p:"noreply@embu.go.ke"},
                  {k:"smtp_from_name", l:"From Name",    p:"EL5 MediProcure"},
                  {k:"smtp_from_email",l:"From Email",   p:"noreply@embu.go.ke"},
                ].map(f => (
                  <Row key={f.k} label={f.l} color="#059669">
                    <input value={cfg[f.k]||""} onChange={e=>set(f.k,e.target.value)} placeholder={f.p} style={{...inp,width:260}} />
                  </Row>
                ))}
                <Row label="SMTP Password" color="#059669">
                  <input type="password" value={cfg["smtp_pass"]||""} onChange={e=>set("smtp_pass",e.target.value)} style={{...inp,width:260}} placeholder="••••••••" />
                </Row>
                <Row label="Enable TLS" color="#059669"><Toggle on={(cfg["smtp_tls"]||"true")!=="false"} onChange={v=>set("smtp_tls",v?"true":"false")} /></Row>
                <Row label="Enable SMTP" color="#059669"><Toggle on={cfg["smtp_enabled"]==="true"} onChange={v=>set("smtp_enabled",v?"true":"false")} /></Row>
                <div style={{ marginTop:12 }}><button onClick={doSave} disabled={saving} style={btn("#059669")}><Save style={{ width:13,height:13 }} />{saving?"Saving…":"Save"}</button></div>
              </Card>
            )}

            {active==="sms" && (
              <Card title="SMS / Twilio" icon={Phone} color="#7c3aed">
                <Row label="Enable Twilio SMS" color="#7c3aed"><Toggle on={cfg["twilio_enabled"]==="true"} onChange={v=>set("twilio_enabled",v?"true":"false")} /></Row>
                {[
                  {k:"twilio_account_sid",  l:"Account SID",  p:"ACxxxx"},
                  {k:"twilio_auth_token",   l:"Auth Token",   p:"your_auth_token",  pw:true},
                  {k:"twilio_phone_number", l:"Twilio Phone", p:"+12025551234"},
                  {k:"sms_hospital_name",   l:"SMS Sender",   p:"EL5 MediProcure"},
                ].map(f => (
                  <Row key={f.k} label={f.l} color="#7c3aed">
                    <input type={(f as any).pw?"password":"text"} value={cfg[f.k]||""} onChange={e=>set(f.k,e.target.value)} placeholder={f.p} style={{...inp,width:260}} />
                  </Row>
                ))}
                <div style={{ margin:"8px 0 12px",padding:"8px 12px",background:"rgba(124,58,237,0.1)",borderRadius:8,fontSize:11,color:"#a78bfa" }}>
                  Get credentials at <a href="https://www.twilio.com/console" target="_blank" rel="noreferrer" style={{ color:"#818cf8" }}>twilio.com/console</a>
                </div>
                <button onClick={doSave} disabled={saving} style={btn("#7c3aed")}><Save style={{ width:13,height:13 }} />{saving?"Saving…":"Save"}</button>
              </Card>
            )}

            {active==="appearance" && (
              <Card title="Appearance" icon={Palette} color="#8b5cf6">
                {[{k:"primary_color",l:"Primary Colour"},{k:"accent_color",l:"Accent Colour"}].map(f => (
                  <Row key={f.k} label={f.l} color="#8b5cf6">
                    <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                      <input type="color" value={cfg[f.k]||"#1a3a6b"} onChange={e=>set(f.k,e.target.value)} style={{ width:36,height:30,borderRadius:6,border:"1px solid rgba(255,255,255,0.2)",background:"transparent",cursor:"pointer",padding:2 }} />
                      <input value={cfg[f.k]||""} onChange={e=>set(f.k,e.target.value)} style={{...inp,width:100}} placeholder="#1a3a6b" />
                    </div>
                  </Row>
                ))}
                <Row label="Theme" color="#8b5cf6">
                  <select value={cfg["theme"]||"dark"} onChange={e=>set("theme",e.target.value)} style={{...inp,width:140}}>
                    <option value="dark">Dark</option><option value="light">Light</option><option value="system">System</option>
                  </select>
                </Row>
                <div style={{ marginTop:12 }}><button onClick={doSave} disabled={saving} style={btn("#8b5cf6")}><Save style={{ width:13,height:13 }} />{saving?"Saving…":"Save & Propagate"}</button></div>
              </Card>
            )}

            {active==="print" && (
              <Card title="Print & Documents" icon={Printer} color="#C45911">
                <Row label="Print Font" color="#C45911">
                  <select value={cfg["print_font"]||"Times New Roman"} onChange={e=>set("print_font",e.target.value)} style={{...inp,width:200}}>
                    {["Times New Roman","Arial","Calibri","Georgia","Cambria"].map(f=><option key={f}>{f}</option>)}
                  </select>
                </Row>
                <Row label="Font Size (pt)" color="#C45911"><input value={cfg["print_font_size"]||"11"} onChange={e=>set("print_font_size",e.target.value)} style={{...inp,width:70}} type="number" min="8" max="16" /></Row>
                <Row label="Paper Size" color="#C45911">
                  <select value={cfg["paper_size"]||"A4"} onChange={e=>set("paper_size",e.target.value)} style={{...inp,width:120}}>
                    {["A4","Letter","Legal","A5"].map(s=><option key={s}>{s}</option>)}
                  </select>
                </Row>
                <Row label="Show Logo on Prints" color="#C45911"><Toggle on={(cfg["show_logo_print"]||"true")!=="false"} onChange={v=>set("show_logo_print",v?"true":"false")} /></Row>
                <Row label="Show Official Stamp Box" color="#C45911"><Toggle on={(cfg["show_stamp"]||"true")!=="false"} onChange={v=>set("show_stamp",v?"true":"false")} /></Row>
                <Row label="Confidential Notice" color="#C45911"><Toggle on={(cfg["print_confidential"]||"true")!=="false"} onChange={v=>set("print_confidential",v?"true":"false")} /></Row>
                <div style={{ marginTop:12 }}><button onClick={doSave} disabled={saving} style={btn("#C45911")}><Save style={{ width:13,height:13 }} />{saving?"Saving…":"Save"}</button></div>
              </Card>
            )}

            {active==="broadcast" && (
              <Card title="System Broadcast" icon={Radio} color="#d97706">
                <Row label="Title" color="#d97706"><input value={bcast.title} onChange={e=>setBcast(p=>({...p,title:e.target.value}))} placeholder="System Alert" style={{...inp,width:300}} /></Row>
                <div style={{ padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize:13,fontWeight:500,color:"#f1f5f9",marginBottom:6 }}>Message</div>
                  <textarea value={bcast.body} onChange={e=>setBcast(p=>({...p,body:e.target.value}))} style={{...inp,height:80,resize:"vertical" as const}} placeholder="Message to all active users…" />
                </div>
                <Row label="Type" color="#d97706">
                  <select value={bcast.type} onChange={e=>setBcast(p=>({...p,type:e.target.value}))} style={{...inp,width:160}}>
                    {["info","warning","success","error","maintenance","announcement"].map(t=><option key={t}>{t}</option>)}
                  </select>
                </Row>
                <div style={{ marginTop:14 }}>
                  <button onClick={doBroadcast} disabled={bcasting} style={btn("#d97706")}><Play style={{ width:13,height:13 }} />{bcasting?"Sending…":"Send to All Users"}</button>
                </div>
              </Card>
            )}

            {active==="database" && (
              <Card title="Database" icon={Database} color="#374151">
                <Row label="Supabase Project ID" color="#374151"><code style={{ fontSize:12,color:"#94a3b8" }}>yvjfehnzbzjliizjvuhq</code></Row>
                <Row label="Region" color="#374151"><span style={{ color:"#94a3b8" }}>af-south-1 (Africa / Nairobi)</span></Row>
                <Row label="PostgreSQL" color="#374151"><span style={{ color:"#94a3b8" }}>57 tables · RLS enabled on all</span></Row>
                <div style={{ marginTop:14,display:"flex",gap:8,flexWrap:"wrap" as const }}>
                  {[
                    {l:"DB Admin →",     p:"/admin/database",   c:"#374151"},
                    {l:"ODBC / SQL →",   p:"/odbc",             c:"#0a2558"},
                    {l:"Backup →",       p:"/backup",           c:"#065f46"},
                    {l:"Audit Log →",    p:"/audit-log",        c:"#C45911"},
                  ].map(b=>(
                    <button key={b.p} onClick={()=>navigate(b.p)} style={btn(b.c)}>{b.l}</button>
                  ))}
                </div>
              </Card>
            )}

            {active==="codebase" && (
              <div>
                <div style={{ fontSize:14,fontWeight:600,marginBottom:10,color:"#94a3b8" }}>Source Code — ProcurBosse v2.0</div>
                <div style={{ background:"rgba(0,0,0,0.4)",borderRadius:10,border:"1px solid rgba(255,255,255,0.07)",overflow:"hidden" }}>
                  {Object.entries(CODE_TREE).map(([folder,files]) => {
                    const open = expanded.has(folder);
                    return (
                      <div key={folder}>
                        <button onClick={() => setExpanded(p => { const s=new Set(p); s.has(folder)?s.delete(folder):s.add(folder); return s; })}
                          style={{ width:"100%",display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:open?"rgba(79,70,229,0.1)":"transparent",border:"none",borderBottom:"1px solid rgba(255,255,255,0.04)",cursor:"pointer" }}>
                          {open?<FolderOpen style={{ width:13,height:13,color:"#d97706" }} />:<Folder style={{ width:13,height:13,color:"#d97706" }} />}
                          <span style={{ fontSize:11.5,fontFamily:"var(--font-mono)",fontWeight:600,color:"#cbd5e1" }}>{folder}/</span>
                          <span style={{ fontSize:10,color:"#475569",marginLeft:"auto" }}>{files.length} files</span>
                        </button>
                        {open && files.map(file => (
                          <div key={file} style={{ display:"flex",alignItems:"center",gap:7,padding:"4px 12px 4px 32px",borderBottom:"1px solid rgba(255,255,255,0.03)" }}>
                            <Code2 style={{ width:10,height:10,color:file.endsWith(".ts")||file.endsWith(".tsx")?"#61afef":file.endsWith(".yml")?"#98c379":"#abb2bf",flexShrink:0 }} />
                            <span style={{ fontSize:11,fontFamily:"var(--font-mono)",color:"#94a3b8" }}>{file}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop:10,fontSize:11,color:"#475569" }}>
                  Repo: <a href="https://github.com/huiejorjdsksfn/medi-procure-hub" target="_blank" rel="noreferrer" style={{ color:"#4f46e5" }}>github.com/huiejorjdsksfn/medi-procure-hub</a>
                </div>
              </div>
            )}

            {active==="system" && (
              <Card title="System Configuration" icon={Server} color="#6b7280">
                <Row label="Version" color="#6b7280"><span style={{ fontFamily:"var(--font-mono)",color:"#818cf8" }}>v2.0.0 — ProcurBosse</span></Row>
                <Row label="Date Format" color="#6b7280">
                  <select value={cfg["date_format"]||"DD/MM/YYYY"} onChange={e=>set("date_format",e.target.value)} style={{...inp,width:160}}>
                    {["DD/MM/YYYY","MM/DD/YYYY","YYYY-MM-DD"].map(f=><option key={f}>{f}</option>)}
                  </select>
                </Row>
                <Row label="Timezone" color="#6b7280"><input value={cfg["timezone"]||"Africa/Nairobi"} onChange={e=>set("timezone",e.target.value)} style={{...inp,width:200}} /></Row>
                <Row label="Max Upload (MB)" color="#6b7280"><input value={cfg["max_upload_mb"]||"25"} onChange={e=>set("max_upload_mb",e.target.value)} style={{...inp,width:80}} type="number" /></Row>
                <Row label="Maintenance Mode" sub="⚠ Blocks all non-admin users" color="#dc2626">
                  <Toggle on={cfg["maintenance_mode"]==="true"} onChange={v=>set("maintenance_mode",v?"true":"false")} />
                </Row>
                <div style={{ marginTop:12 }}><button onClick={doSave} disabled={saving} style={btn("#6b7280")}><Save style={{ width:13,height:13 }} />{saving?"Saving…":"Save & Apply"}</button></div>
              </Card>
            )}

          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
