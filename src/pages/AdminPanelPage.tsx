import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import RoleGuard from "@/components/RoleGuard";
import { toast } from "@/hooks/use-toast";
import { saveSettings } from "@/hooks/useSystemSettings";
import { sendSystemBroadcast } from "@/lib/broadcast";
import {
  Settings, Palette, Shield, Bell, Database, Globe, FileText, Package,
  Truck, DollarSign, BarChart3, Save, RefreshCw, Upload, Users, Building2,
  Mail, Server, Monitor, Sliders, Key, Activity, ChevronRight, Home,
  Archive, Printer, Search, Eye, TrendingUp, Layers, ShoppingCart,
  Gavel, FileCheck, ClipboardList, PiggyBank, BookOpen, Cpu, X,
  CheckCircle, AlertTriangle, Terminal, Zap, Lock, Edit3, Code2,
  FolderOpen, ChevronDown, Copy, Hash, GitBranch, Folder
} from "lucide-react";

const SECTIONS = [
  {id:"overview",   label:"Overview",       icon:Home,      color:"#1a3a6b"},
  {id:"hospital",   label:"Hospital Info",   icon:Building2, color:"#0078d4"},
  {id:"users",      label:"Users & Roles",   icon:Users,     color:"#5C2D91"},
  {id:"security",   label:"Security",        icon:Shield,    color:"#dc2626"},
  {id:"email",      label:"Email / SMTP",    icon:Mail,      color:"#107c10"},
  {id:"modules",    label:"Modules",         icon:Sliders,   color:"#0369a1"},
  {id:"appearance", label:"Appearance",      icon:Palette,   color:"#8b5cf6"},
  {id:"print",      label:"Print & Docs",    icon:Printer,   color:"#C45911"},
  {id:"database",   label:"Database",        icon:Database,  color:"#374151"},
  {id:"codebase",   label:"Codebase",        icon:Code2,     color:"#0f766e"},
  {id:"system",     label:"System",          icon:Server,    color:"#6b7280"},
  {id:"backup",     label:"Backup",          icon:Archive,   color:"#065f46"},
];

const ALL_MODULES = [
  {label:"Requisitions",      path:"/requisitions",              icon:ClipboardList, color:"#0078d4"},
  {label:"Purchase Orders",   path:"/purchase-orders",           icon:ShoppingCart,  color:"#C45911"},
  {label:"Goods Received",    path:"/goods-received",            icon:Package,       color:"#107c10"},
  {label:"Suppliers",         path:"/suppliers",                 icon:Truck,         color:"#374151"},
  {label:"Tenders",           path:"/tenders",                   icon:Gavel,         color:"#1F6090"},
  {label:"Contracts",         path:"/contracts",                 icon:FileCheck,     color:"#1a3a6b"},
  {label:"Inventory Items",   path:"/items",                     icon:Layers,        color:"#059669"},
  {label:"Departments",       path:"/departments",               icon:Building2,     color:"#374151"},
  {label:"Payment Vouchers",  path:"/vouchers/payment",          icon:DollarSign,    color:"#C45911"},
  {label:"Finance Dashboard", path:"/financials",                icon:BarChart3,     color:"#1F6090"},
  {label:"Budgets",           path:"/financials/budgets",        icon:TrendingUp,    color:"#059669"},
  {label:"QC Inspections",    path:"/quality/inspections",       icon:Eye,           color:"#059669"},
  {label:"Reports",           path:"/reports",                   icon:BarChart3,     color:"#1a3a6b"},
  {label:"Documents",         path:"/documents",                 icon:FileText,      color:"#374151"},
  {label:"Email",             path:"/email",                     icon:Mail,          color:"#7c3aed"},
  {label:"User Manager",      path:"/users",                     icon:Users,         color:"#0369a1"},
  {label:"Audit Log",         path:"/audit-log",                 icon:Activity,      color:"#C45911"},
  {label:"ODBC / SQL Server", path:"/odbc",                      icon:Database,      color:"#0a2558"},
  {label:"Database Admin",    path:"/admin/database",            icon:Database,      color:"#374151"},
  {label:"Settings",          path:"/settings",                  icon:Settings,      color:"#6b7280"},
  {label:"Webmaster",         path:"/webmaster",                 icon:Globe,         color:"#059669"},
];

// Codebase tree — all key source files
const CODEBASE_TREE: Record<string, string[]> = {
  "src/pages": [
    "DashboardPage.tsx","RequisitionsPage.tsx","PurchaseOrdersPage.tsx","GoodsReceivedPage.tsx",
    "SuppliersPage.tsx","TendersPage.tsx","ContractsPage.tsx","BidEvaluationsPage.tsx",
    "ItemsPage.tsx","CategoriesPage.tsx","DepartmentsPage.tsx","ScannerPage.tsx",
    "VouchersPage.tsx","ReportsPage.tsx","DocumentsPage.tsx","AuditLogPage.tsx",
    "UsersPage.tsx","SettingsPage.tsx","AdminPanelPage.tsx","AdminDatabasePage.tsx",
    "WebmasterPage.tsx","ODBCPage.tsx","BackupPage.tsx","EmailPage.tsx","InboxPage.tsx","LoginPage.tsx",
  ],
  "src/pages/financials": ["FinancialDashboardPage.tsx","ChartOfAccountsPage.tsx","BudgetsPage.tsx","FixedAssetsPage.tsx"],
  "src/pages/vouchers": ["PaymentVouchersPage.tsx","ReceiptVouchersPage.tsx","JournalVouchersPage.tsx","PurchaseVouchersPage.tsx","SalesVouchersPage.tsx"],
  "src/pages/quality": ["QualityDashboardPage.tsx","InspectionsPage.tsx","NonConformancePage.tsx"],
  "src/components": ["AppLayout.tsx","ERPWheelButton.tsx","RoleGuard.tsx","ProtectedRoute.tsx","SystemBroadcastBanner.tsx","ForwardEmailDialog.tsx","NavLink.tsx"],
  "src/lib": ["printDocument.ts","audit.ts","broadcast.ts","utils.ts","pdf.ts","export.ts","notify.ts","sqlServerMigration.ts"],
  "src/hooks": ["useSystemSettings.ts","usePermissions.ts","useProcurement.ts","useRealtimeTable.ts","useExport.ts"],
  "src/integrations/supabase": ["client.ts","types.ts"],
  "electron": ["main.js","preload.js"],
  ".github/workflows": ["build-exe.yml","build-desktop.yml"],
  "supabase/migrations": ["(SQL migration files)"],
  "root": ["package.json","electron-builder.yml","vite.config.ts","tailwind.config.ts","tsconfig.json"],
};

const FILE_COLORS: Record<string, string> = {
  ".tsx":"#61afef",".ts":"#c678dd",".js":"#e5c07b",".yml":"#98c379",".json":"#e06c75",".sql":"#56b6c2",
};

function getFileColor(name: string): string {
  const ext = name.match(/(\.[^.]+)$/)?.[1]||"";
  return FILE_COLORS[ext]||"#abb2bf";
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean)=>void }) {
  return (
    <button onClick={()=>onChange(!on)} style={{background:"transparent",border:"none",cursor:"pointer",padding:0,lineHeight:0,flexShrink:0}}>
      <div style={{width:44,height:24,borderRadius:12,background:on?"#1a3a6b":"#d1d5db",display:"flex",alignItems:"center",padding:"2px",transition:"background 0.2s"}}>
        <div style={{width:20,height:20,borderRadius:"50%",background:"#fff",boxShadow:"0 1px 4px rgba(0,0,0,0.2)",transition:"transform 0.2s",transform:on?"translateX(20px)":"translateX(0)"}}/>
      </div>
    </button>
  );
}

function FR({ label, sub, children, color }: any) {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 0",borderBottom:"1px solid #f3f4f6",gap:16}}>
      <div style={{flex:1}}>
        {color && <div style={{width:3,height:14,borderRadius:2,background:color,display:"inline-block",marginRight:8,verticalAlign:"middle"}}/>}
        <div style={{fontSize:13.5,fontWeight:600,color:"#111",display:"inline"}}>{label}</div>
        {sub && <div style={{fontSize:11.5,color:"#9ca3af",marginTop:2}}>{sub}</div>}
      </div>
      <div style={{flexShrink:0}}>{children}</div>
    </div>
  );
}

export default function AdminPanelPage() {
  const navigate = useNavigate();
  const { user, profile, roles } = useAuth();
  const [section, setSection] = useState("overview");
  const [settings, setSettings] = useState<Record<string,string>>({});
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<Record<string,number>>({});
  const [statsLoading, setStatsLoading] = useState(true);
  // Codebase
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["src/pages","src/lib"]));
  const [selectedFile, setSelectedFile] = useState<string|null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [fileLoading, setFileLoading] = useState(false);
  const [codeSearch, setCodeSearch] = useState("");

  const inp = { width:"100%", padding:"7px 10px", border:"1px solid #d1d5db", borderRadius:6, fontSize:13, color:"#111", background:"#fff", outline:"none" };
  const btn = (c="#1a3a6b")=>({ padding:"7px 16px", borderRadius:7, border:"none", background:c, color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" });

  const loadSettings = useCallback(async () => {
    const { data } = await (supabase as any).from("system_settings").select("key,value");
    if (data) {
      const map: Record<string,string> = {};
      data.forEach((r: any) => map[r.key] = r.value);
      setSettings(map);
    }
  }, []);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    const tables = ["requisitions","purchase_orders","suppliers","goods_received","payment_vouchers","profiles","documents","audit_logs"];
    const counts: Record<string,number> = {};
    for (const tbl of tables) {
      const { count } = await (supabase as any).from(tbl).select("*",{count:"exact",head:true});
      counts[tbl] = count||0;
    }
    setStats(counts);
    setStatsLoading(false);
  }, []);

  useEffect(() => { loadSettings(); loadStats(); }, [loadSettings, loadStats]);

  const set = (key: string, val: string) => setSettings(p => ({...p, [key]: val}));
  const toggle = (key: string) => setSettings(p => ({...p, [key]: p[key]==="true"?"false":"true"}));

  async function saveSection() {
    setSaving(true);
    try {
      await saveSettings(settings);
      await sendSystemBroadcast("settings_update","admin",{ updatedBy: profile?.full_name||user?.email, section });
      toast({ title:"✅ Settings saved & propagated to all users", description:"All pages will reflect changes immediately." });
    } catch {
      toast({ title:"Save failed", variant:"destructive" });
    } finally { setSaving(false); }
  }

  async function loadFileContent(folder: string, file: string) {
    if (file.startsWith("(")) return;
    setSelectedFile(`${folder}/${file}`);
    setFileLoading(true);
    setFileContent("");
    // Simulate: in production this would call an API or electron IPC
    // Show metadata as placeholder
    setTimeout(()=>{
      setFileContent(
        `// File: ${folder}/${file}\n// Part of ProcurBosse — EL5 MediProcure v2.0\n// Embu Level 5 Hospital, Embu County Government\n//\n// To view full source:\n//   git clone https://github.com/huiejorjdsksfn/medi-procure-hub\n//   open ${folder}/${file}\n//\n// File type: ${file.match(/(\.[^.]+)$/)?.[1]||"unknown"}\n// Last updated: ${new Date().toLocaleDateString("en-KE")}`
      );
      setFileLoading(false);
    }, 300);
  }

  const S = { background:"rgba(255,255,255,0.97)", borderRadius:12, boxShadow:"0 2px 8px rgba(0,0,0,0.06)", padding:"18px 22px", marginBottom:18, border:"1px solid #e5e7eb" };

  const filteredTree = codeSearch
    ? Object.fromEntries(Object.entries(CODEBASE_TREE).map(([f,files])=>[f, files.filter(fn=>fn.toLowerCase().includes(codeSearch.toLowerCase()))]).filter(([,files])=>files.length>0))
    : CODEBASE_TREE;

  return (
    <RoleGuard allowed={["admin","webmaster"]}>
      <div style={{padding:16,maxWidth:1300,margin:"0 auto"}}>
        {/* Header */}
        <div style={{background:"linear-gradient(135deg,#0a2558,#1a3a6b)",borderRadius:14,padding:"16px 22px",marginBottom:18,color:"#fff",display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:46,height:46,borderRadius:12,background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center"}}><Settings style={{width:24,height:24,color:"#fff"}}/></div>
          <div>
            <div style={{fontSize:19,fontWeight:800}}>Admin Control Panel</div>
            <div style={{fontSize:12,opacity:.8}}>System settings · Codebase · Database · All propagated to all users</div>
          </div>
          <div style={{marginLeft:"auto",display:"flex",gap:8}}>
            <button onClick={loadSettings} style={{...btn("rgba(255,255,255,0.15)"),display:"flex",alignItems:"center",gap:6}}><RefreshCw style={{width:13,height:13}}/>Refresh</button>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"200px 1fr",gap:16}}>
          {/* Sidebar */}
          <div style={{background:"rgba(255,255,255,0.95)",borderRadius:12,border:"1px solid #e5e7eb",padding:"8px 0",height:"fit-content",position:"sticky",top:16}}>
            {SECTIONS.map(sec=>(
              <button key={sec.id} onClick={()=>setSection(sec.id)} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"9px 14px",background:section===sec.id?`${sec.color}12`:"transparent",border:"none",cursor:"pointer",borderLeft:section===sec.id?`3px solid ${sec.color}`:"3px solid transparent"}}>
                <sec.icon style={{width:15,height:15,color:section===sec.id?sec.color:"#9ca3af",flexShrink:0}}/>
                <span style={{fontSize:12.5,fontWeight:section===sec.id?700:500,color:section===sec.id?sec.color:"#374151"}}>{sec.label}</span>
              </button>
            ))}
          </div>

          {/* Main content */}
          <div>
            {/* ── Overview ── */}
            {section==="overview" && (
              <div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
                  {[
                    {label:"Requisitions",count:stats.requisitions,color:"#0078d4",icon:ClipboardList},
                    {label:"Purchase Orders",count:stats.purchase_orders,color:"#C45911",icon:ShoppingCart},
                    {label:"Suppliers",count:stats.suppliers,color:"#107c10",icon:Truck},
                    {label:"Active Users",count:stats.profiles,color:"#5C2D91",icon:Users},
                    {label:"GRN Records",count:stats.goods_received,color:"#374151",icon:Package},
                    {label:"Vouchers",count:stats.payment_vouchers,color:"#dc2626",icon:DollarSign},
                    {label:"Documents",count:stats.documents,color:"#0369a1",icon:FileText},
                    {label:"Audit Events",count:stats.audit_logs,color:"#059669",icon:Activity},
                  ].map(s=>(
                    <div key={s.label} style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",padding:"12px 14px",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                        <div style={{width:30,height:30,borderRadius:8,background:`${s.color}15`,display:"flex",alignItems:"center",justifyContent:"center"}}><s.icon style={{width:15,height:15,color:s.color}}/></div>
                        <div style={{fontSize:11.5,color:"#6b7280",fontWeight:500}}>{s.label}</div>
                      </div>
                      <div style={{fontSize:22,fontWeight:800,color:s.color}}>{statsLoading?"…":(s.count||0).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
                <div style={{...S}}>
                  <div style={{fontWeight:700,fontSize:15,color:"#1a3a6b",marginBottom:12}}>Quick Access — All Modules</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:8}}>
                    {ALL_MODULES.map(m=>(
                      <button key={m.path} onClick={()=>navigate(m.path)} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:8,border:"1px solid #e5e7eb",background:"#fff",cursor:"pointer",textAlign:"left",transition:"all 0.15s"}}>
                        <div style={{width:28,height:28,borderRadius:7,background:`${m.color}15`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><m.icon style={{width:14,height:14,color:m.color}}/></div>
                        <span style={{fontSize:12,color:"#374151",fontWeight:500}}>{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Hospital Info ── */}
            {section==="hospital" && (
              <div style={S}>
                <div style={{fontWeight:700,fontSize:15,color:"#0078d4",marginBottom:14}}>🏥 Hospital Information</div>
                {[
                  {label:"Hospital Name",key:"hospital_name",placeholder:"Embu Level 5 Hospital"},
                  {label:"County Name",key:"county_name",placeholder:"Embu County Government"},
                  {label:"Department",key:"department_name",placeholder:"Department of Health"},
                  {label:"System Name",key:"system_name",placeholder:"EL5 MediProcure"},
                  {label:"Physical Address",key:"hospital_address",placeholder:"Embu Town, Embu County"},
                  {label:"P.O. Box",key:"po_box",placeholder:"P.O. Box 591-60100, Embu"},
                  {label:"Phone Number",key:"hospital_phone",placeholder:"+254 060 000000"},
                  {label:"Email Address",key:"hospital_email",placeholder:"info@embu.health.go.ke"},
                  {label:"Document Footer",key:"doc_footer",placeholder:"Embu Level 5 Hospital · Embu County Government"},
                  {label:"Currency Symbol",key:"currency_symbol",placeholder:"KES"},
                  {label:"VAT Rate (%)",key:"vat_rate",placeholder:"16"},
                ].map(f=>(
                  <FR key={f.key} label={f.label} color="#0078d4">
                    <input value={settings[f.key]||""} onChange={e=>set(f.key,e.target.value)} style={{...inp,width:260}} placeholder={f.placeholder}/>
                  </FR>
                ))}
                <FR label="Hospital Logo URL" sub="URL of logo image shown in letterheads & prints" color="#0078d4">
                  <input value={settings["logo_url"]||""} onChange={e=>set("logo_url",e.target.value)} style={{...inp,width:260}} placeholder="https://…/logo.png"/>
                </FR>
                <FR label="Hospital Seal URL" sub="Circular seal shown center of letterhead" color="#0078d4">
                  <input value={settings["seal_url"]||""} onChange={e=>set("seal_url",e.target.value)} style={{...inp,width:260}} placeholder="https://…/seal.png"/>
                </FR>
                <div style={{marginTop:14}}><button onClick={saveSection} disabled={saving} style={btn()}>{saving?"Saving…":"Save & Propagate to All Pages"}</button></div>
              </div>
            )}

            {/* ── Modules ── */}
            {section==="modules" && (
              <div style={S}>
                <div style={{fontWeight:700,fontSize:15,color:"#0369a1",marginBottom:14}}>🔧 Module Toggles</div>
                {[
                  {label:"Procurement Module",key:"enable_procurement",sub:"Requisitions, POs, GRN, Suppliers"},
                  {label:"Tenders & Contracts",key:"enable_tenders",sub:"Tender management and contracts"},
                  {label:"Finance Module",key:"enable_financials",sub:"Vouchers, Budgets, Chart of Accounts"},
                  {label:"Quality Control",key:"enable_quality",sub:"Inspections, NCR, QA Dashboard"},
                  {label:"Document Library",key:"enable_documents",sub:"Document management & sharing"},
                  {label:"QR/Barcode Scanner",key:"enable_scanner",sub:"Inventory scanning"},
                  {label:"Email System",key:"enable_email",sub:"Internal email & inbox"},
                  {label:"Real-time Notifications",key:"realtime_notifications",sub:"Live system alerts"},
                  {label:"Maintenance Mode",key:"maintenance_mode",sub:"Block all users except admin"},
                ].map(f=>(
                  <FR key={f.key} label={f.label} sub={f.sub} color="#0369a1">
                    <Toggle on={settings[f.key]!=="false"} onChange={v=>set(f.key,v?"true":"false")}/>
                  </FR>
                ))}
                <div style={{marginTop:14}}><button onClick={saveSection} disabled={saving} style={btn("#0369a1")}>{saving?"Saving…":"Save & Propagate"}</button></div>
              </div>
            )}

            {/* ── Appearance ── */}
            {section==="appearance" && (
              <div style={S}>
                <div style={{fontWeight:700,fontSize:15,color:"#8b5cf6",marginBottom:14}}>🎨 Appearance & UI</div>
                {[
                  {label:"Primary Color",key:"primary_color",type:"color"},
                  {label:"Accent Color",key:"accent_color",type:"color"},
                ].map(f=>(
                  <FR key={f.key} label={f.label} color="#8b5cf6">
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <input type="color" value={settings[f.key]||"#1a3a6b"} onChange={e=>set(f.key,e.target.value)} style={{width:40,height:32,border:"1px solid #d1d5db",borderRadius:6,cursor:"pointer",padding:2}}/>
                      <input value={settings[f.key]||""} onChange={e=>set(f.key,e.target.value)} style={{...inp,width:120}} placeholder="#1a3a6b"/>
                    </div>
                  </FR>
                ))}
                {[
                  {label:"System Theme",key:"theme"},
                ].map(f=>(
                  <FR key={f.key} label={f.label} color="#8b5cf6">
                    <select value={settings[f.key]||"light"} onChange={e=>set(f.key,e.target.value)} style={{...inp,width:160}}>
                      <option value="light">Light</option><option value="dark">Dark</option><option value="system">System</option>
                    </select>
                  </FR>
                ))}
                <div style={{marginTop:14}}><button onClick={saveSection} disabled={saving} style={btn("#8b5cf6")}>{saving?"Saving…":"Save & Propagate"}</button></div>
              </div>
            )}

            {/* ── Print & Docs ── */}
            {section==="print" && (
              <div style={S}>
                <div style={{fontWeight:700,fontSize:15,color:"#C45911",marginBottom:14}}>🖨️ Print & Document Settings</div>
                <FR label="Print Font" color="#C45911">
                  <select value={settings["print_font"]||"Times New Roman"} onChange={e=>set("print_font",e.target.value)} style={{...inp,width:200}}>
                    {["Times New Roman","Arial","Calibri","Georgia","Cambria","Palatino"].map(f=><option key={f}>{f}</option>)}
                  </select>
                </FR>
                <FR label="Font Size (pt)" color="#C45911">
                  <input value={settings["print_font_size"]||"11"} onChange={e=>set("print_font_size",e.target.value)} style={{...inp,width:80}} type="number" min="8" max="16"/>
                </FR>
                <FR label="Paper Size" color="#C45911">
                  <select value={settings["paper_size"]||"A4"} onChange={e=>set("paper_size",e.target.value)} style={{...inp,width:120}}>
                    {["A4","Letter","Legal","A5"].map(s=><option key={s}>{s}</option>)}
                  </select>
                </FR>
                <FR label="Show Hospital Logo on Prints" color="#C45911"><Toggle on={settings["show_logo_print"]!=="false"} onChange={v=>set("show_logo_print",v?"true":"false")}/></FR>
                <FR label="Show Official Stamp Box" color="#C45911"><Toggle on={settings["show_stamp"]!=="false"} onChange={v=>set("show_stamp",v?"true":"false")}/></FR>
                <FR label="Show Watermark" color="#C45911"><Toggle on={settings["show_watermark"]==="true"} onChange={v=>set("show_watermark",v?"true":"false")}/></FR>
                <FR label="Confidential Notice on All Docs" sub="'Note: Private and Confidential'" color="#C45911"><Toggle on={settings["print_confidential"]!=="false"} onChange={v=>set("print_confidential",v?"true":"false")}/></FR>
                <div style={{marginTop:14}}><button onClick={saveSection} disabled={saving} style={btn("#C45911")}>{saving?"Saving…":"Save & Propagate"}</button></div>
              </div>
            )}

            {/* ── Email ── */}
            {section==="email" && (
              <div style={S}>
                <div style={{fontWeight:700,fontSize:15,color:"#107c10",marginBottom:14}}>📧 Email & SMTP Configuration</div>
                {[
                  {label:"SMTP Host",key:"smtp_host",placeholder:"smtp.gmail.com"},
                  {label:"SMTP Port",key:"smtp_port",placeholder:"587"},
                  {label:"SMTP Username",key:"smtp_user",placeholder:"noreply@embu.go.ke"},
                  {label:"From Name",key:"smtp_from_name",placeholder:"EL5 MediProcure"},
                  {label:"Reply-To Address",key:"smtp_reply_to",placeholder:"admin@embu.go.ke"},
                ].map(f=>(
                  <FR key={f.key} label={f.label} color="#107c10">
                    <input value={settings[f.key]||""} onChange={e=>set(f.key,e.target.value)} style={{...inp,width:260}} placeholder={f.placeholder}/>
                  </FR>
                ))}
                <FR label="SMTP Password" color="#107c10">
                  <input type="password" value={settings["smtp_pass"]||""} onChange={e=>set("smtp_pass",e.target.value)} style={{...inp,width:260}} placeholder="••••••••"/>
                </FR>
                <FR label="TLS/SSL" color="#107c10"><Toggle on={settings["smtp_tls"]!=="false"} onChange={v=>set("smtp_tls",v?"true":"false")}/></FR>
                <FR label="Email Notifications Active" color="#107c10"><Toggle on={settings["enable_email"]!=="false"} onChange={v=>set("enable_email",v?"true":"false")}/></FR>
                <div style={{marginTop:14}}><button onClick={saveSection} disabled={saving} style={btn("#107c10")}>{saving?"Saving…":"Save & Propagate"}</button></div>
              </div>
            )}

            {/* ── Security ── */}
            {section==="security" && (
              <div style={S}>
                <div style={{fontWeight:700,fontSize:15,color:"#dc2626",marginBottom:14}}>🔒 Security & Access Control</div>
                <FR label="Session Timeout (minutes)" color="#dc2626">
                  <input value={settings["session_timeout"]||"480"} onChange={e=>set("session_timeout",e.target.value)} style={{...inp,width:120}} type="number"/>
                </FR>
                <FR label="Max Login Attempts" color="#dc2626">
                  <input value={settings["max_login_attempts"]||"5"} onChange={e=>set("max_login_attempts",e.target.value)} style={{...inp,width:80}} type="number"/>
                </FR>
                <FR label="Force 2FA for Admins" color="#dc2626"><Toggle on={settings["force_2fa_admin"]==="true"} onChange={v=>set("force_2fa_admin",v?"true":"false")}/></FR>
                <FR label="IP Restriction" sub="Only allow listed IPs" color="#dc2626"><Toggle on={settings["ip_restriction"]==="true"} onChange={v=>set("ip_restriction",v?"true":"false")}/></FR>
                <FR label="Allowed IPs" sub="Comma-separated, e.g. 192.168.1.0/24" color="#dc2626">
                  <input value={settings["allowed_ips"]||""} onChange={e=>set("allowed_ips",e.target.value)} style={{...inp,width:300}} placeholder="192.168.1.0/24, 10.0.0.0/8"/>
                </FR>
                <FR label="Audit Every Login" color="#dc2626"><Toggle on={settings["audit_logins"]!=="false"} onChange={v=>set("audit_logins",v?"true":"false")}/></FR>
                <div style={{marginTop:14}}><button onClick={saveSection} disabled={saving} style={btn("#dc2626")}>{saving?"Saving…":"Save & Propagate"}</button></div>
              </div>
            )}

            {/* ── Database ── */}
            {section==="database" && (
              <div style={S}>
                <div style={{fontWeight:700,fontSize:15,color:"#374151",marginBottom:14}}>🗄️ Database Info</div>
                <FR label="Supabase Project ID" color="#374151"><span style={{fontFamily:"monospace",fontSize:12,color:"#374151"}}>yvjfehnzbzjliizjvuhq</span></FR>
                <FR label="Supabase URL" color="#374151"><span style={{fontFamily:"monospace",fontSize:11}}>https://yvjfehnzbzjliizjvuhq.supabase.co</span></FR>
                <FR label="Region" color="#374151"><span>af-south-1 (Africa)</span></FR>
                <FR label="SQL Server / ODBC" color="#374151">
                  <button onClick={()=>navigate("/odbc")} style={btn("#374151")}>Manage ODBC Connections →</button>
                </FR>
                <FR label="Database Admin (DBGate)" color="#374151">
                  <button onClick={()=>navigate("/admin/database")} style={btn("#0a2558")}>Open DB Admin →</button>
                </FR>
              </div>
            )}

            {/* ── Codebase ── */}
            {section==="codebase" && (
              <div style={{display:"grid",gridTemplateColumns:"260px 1fr",gap:12}}>
                {/* File tree */}
                <div style={{...S,padding:"12px 0",height:"fit-content",maxHeight:"80vh",overflowY:"auto"}}>
                  <div style={{padding:"8px 14px",borderBottom:"1px solid #e5e7eb",marginBottom:6}}>
                    <div style={{fontWeight:700,fontSize:13,color:"#1a3a6b",marginBottom:6,display:"flex",alignItems:"center",gap:6}}><Code2 style={{width:14,height:14}}/>ProcurBosse Codebase</div>
                    <input value={codeSearch} onChange={e=>setCodeSearch(e.target.value)} placeholder="Search files…" style={{...inp,padding:"5px 8px",fontSize:12}}/>
                  </div>
                  {Object.entries(filteredTree).map(([folder, files])=>{
                    const expanded = expandedFolders.has(folder);
                    return (
                      <div key={folder}>
                        <button onClick={()=>setExpandedFolders(p=>{const s=new Set(p);s.has(folder)?s.delete(folder):s.add(folder);return s;})}
                          style={{width:"100%",display:"flex",alignItems:"center",gap:6,padding:"5px 14px",background:"transparent",border:"none",cursor:"pointer",color:"#374151"}}>
                          {expanded?<ChevronDown style={{width:12,height:12}}/>:<ChevronRight style={{width:12,height:12}}/>}
                          <Folder style={{width:13,height:13,color:"#f59e0b"}}/>
                          <span style={{fontSize:11.5,fontWeight:600,fontFamily:"monospace"}}>{folder}/</span>
                        </button>
                        {expanded && files.map(file=>(
                          <button key={file} onClick={()=>loadFileContent(folder,file)}
                            style={{width:"100%",display:"flex",alignItems:"center",gap:6,padding:"3px 14px 3px 32px",background:selectedFile===`${folder}/${file}`?"#e0e7ff":"transparent",border:"none",cursor:file.startsWith("(")?"default":"pointer"}}>
                            <FileText style={{width:11,height:11,color:getFileColor(file),flexShrink:0}}/>
                            <span style={{fontSize:11,fontFamily:"monospace",color:file.startsWith("(")?"#6b7280":getFileColor(file)}}>{file}</span>
                          </button>
                        ))}
                      </div>
                    );
                  })}
                  <div style={{padding:"8px 14px",marginTop:8,fontSize:10,color:"#9ca3af"}}>
                    Repo: github.com/huiejorjdsksfn/medi-procure-hub
                  </div>
                </div>

                {/* File viewer */}
                <div style={{...S,minHeight:400}}>
                  {selectedFile ? (
                    <>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,paddingBottom:10,borderBottom:"1px solid #e5e7eb"}}>
                        <Code2 style={{width:15,height:15,color:"#0f766e"}}/>
                        <span style={{fontFamily:"monospace",fontSize:13,fontWeight:700,color:"#1a3a6b"}}>{selectedFile}</span>
                        <button onClick={()=>navigator.clipboard?.writeText(selectedFile||"").then(()=>toast({title:"Path copied"}))} style={{...btn("#6b7280"),padding:"3px 8px",fontSize:11,marginLeft:"auto"}}><Copy style={{width:11,height:11}}/></button>
                      </div>
                      {fileLoading ? <div style={{color:"#6b7280",fontSize:13}}>Loading…</div> : (
                        <pre style={{background:"#1e1e1e",color:"#d4d4d4",padding:14,borderRadius:8,overflow:"auto",maxHeight:500,fontSize:11.5,lineHeight:1.6,fontFamily:"'Consolas','Courier New',monospace",whiteSpace:"pre-wrap"}}>
                          {fileContent}
                        </pre>
                      )}
                      <div style={{marginTop:10,fontSize:11,color:"#6b7280"}}>
                        <a href={`https://github.com/huiejorjdsksfn/medi-procure-hub/blob/main/${selectedFile}`} target="_blank" rel="noreferrer" style={{color:"#0078d4"}}>View on GitHub →</a>
                      </div>
                    </>
                  ) : (
                    <div style={{textAlign:"center",padding:60,color:"#9ca3af"}}>
                      <Code2 style={{width:36,height:36,margin:"0 auto 10px",opacity:.3}}/>
                      <div>Select a file from the tree to view details</div>
                      <div style={{fontSize:12,marginTop:6}}>
                        <a href="https://github.com/huiejorjdsksfn/medi-procure-hub" target="_blank" rel="noreferrer" style={{color:"#0078d4"}}>Open full repo on GitHub →</a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── System ── */}
            {section==="system" && (
              <div style={S}>
                <div style={{fontWeight:700,fontSize:15,color:"#6b7280",marginBottom:14}}>⚙️ System Configuration</div>
                <FR label="System Version" color="#6b7280"><span style={{fontFamily:"monospace",fontWeight:700,color:"#1a3a6b"}}>v2.0.0 — ProcurBosse</span></FR>
                <FR label="Application Name" color="#6b7280">
                  <input value={settings["system_name"]||"EL5 MediProcure"} onChange={e=>set("system_name",e.target.value)} style={{...inp,width:220}}/>
                </FR>
                <FR label="Max File Upload (MB)" color="#6b7280">
                  <input value={settings["max_upload_mb"]||"25"} onChange={e=>set("max_upload_mb",e.target.value)} style={{...inp,width:80}} type="number"/>
                </FR>
                <FR label="Date Format" color="#6b7280">
                  <select value={settings["date_format"]||"DD/MM/YYYY"} onChange={e=>set("date_format",e.target.value)} style={{...inp,width:160}}>
                    {["DD/MM/YYYY","MM/DD/YYYY","YYYY-MM-DD"].map(f=><option key={f}>{f}</option>)}
                  </select>
                </FR>
                <FR label="Time Zone" color="#6b7280">
                  <input value={settings["timezone"]||"Africa/Nairobi"} onChange={e=>set("timezone",e.target.value)} style={{...inp,width:200}}/>
                </FR>
                <FR label="Maintenance Mode" sub="Blocks all user access" color="#dc2626"><Toggle on={settings["maintenance_mode"]==="true"} onChange={v=>set("maintenance_mode",v?"true":"false")}/></FR>
                <div style={{marginTop:14}}><button onClick={saveSection} disabled={saving} style={btn()}>{saving?"Saving…":"Save & Propagate"}</button></div>
              </div>
            )}

            {/* ── Backup ── */}
            {section==="backup" && (
              <div style={S}>
                <div style={{fontWeight:700,fontSize:15,color:"#065f46",marginBottom:14}}>💾 Backup & Restore</div>
                <div style={{display:"flex",gap:10}}>
                  <button onClick={()=>navigate("/backup")} style={btn("#065f46")}>Open Backup Manager →</button>
                  <button onClick={()=>navigate("/admin/database")} style={btn("#374151")}>Open DB Admin →</button>
                </div>
              </div>
            )}

            {/* ── Users ── */}
            {section==="users" && (
              <div style={S}>
                <div style={{fontWeight:700,fontSize:15,color:"#5C2D91",marginBottom:14}}>👥 Users & Roles</div>
                <div style={{display:"flex",gap:10,marginBottom:14}}>
                  <button onClick={()=>navigate("/users")} style={btn("#5C2D91")}>Manage Users →</button>
                </div>
                <FR label="Default New User Role" color="#5C2D91">
                  <select value={settings["default_user_role"]||"requisitioner"} onChange={e=>set("default_user_role",e.target.value)} style={{...inp,width:220}}>
                    {["admin","procurement_manager","procurement_officer","inventory_manager","warehouse_officer","requisitioner"].map(r=><option key={r}>{r}</option>)}
                  </select>
                </FR>
                <FR label="Allow Self-Registration" color="#5C2D91"><Toggle on={settings["allow_registration"]==="true"} onChange={v=>set("allow_registration",v?"true":"false")}/></FR>
                <div style={{marginTop:14}}><button onClick={saveSection} disabled={saving} style={btn("#5C2D91")}>{saving?"Saving…":"Save"}</button></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
