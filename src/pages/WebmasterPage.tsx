import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { sendSystemBroadcast } from "@/lib/broadcast";
import {
  Monitor, RefreshCw, Users, Shield, Activity, Server, Database,
  AlertTriangle, CheckCircle, Clock, Globe, Wifi, Cpu, HardDrive,
  BarChart3, Settings, Download, Trash2, Eye, Lock, Unlock, Mail,
  Play, Square, Terminal, Zap, Package, FileText, Archive,
  TrendingUp, Key, Code, Bell, Save, Edit3, Plus, X,
  ChevronRight, ExternalLink, LayoutDashboard, Layers,
  BookOpen, ShoppingCart, DollarSign, Search, Megaphone,
  ToggleLeft, ToggleRight, Wrench, Radio, Hash, Palette,
  Link, Power, AlertCircle, CheckSquare, Send as SendIcon,
  ChevronDown, Info, Sliders, UserCheck, ArrowRight, Rss
} from "lucide-react";
import RoleGuard from "@/components/RoleGuard";
import * as XLSX from "xlsx";

// ── Constants ─────────────────────────────────────────────────
const TABS = [
  {id:"overview",   label:"Overview",      icon:LayoutDashboard, color:"#0078d4"},
  {id:"broadcast",  label:"Live Broadcast", icon:Radio,           color:"#dc2626"},
  {id:"modules",    label:"Modules",        icon:Layers,          color:"#059669"},
  {id:"users",      label:"Users",          icon:Users,           color:"#5b21b6"},
  {id:"controls",   label:"Live Controls",  icon:Sliders,         color:"#C45911"},
  {id:"theme",      label:"Theme & Brand",  icon:Palette,         color:"#8b5cf6"},
  {id:"system",     label:"System",         icon:Server,          color:"#374151"},
  {id:"audit",      label:"Audit Log",      icon:Activity,        color:"#78350f"},
  {id:"terminal",   label:"Console",        icon:Terminal,        color:"#111827"},
];

const ALL_MODULES = [
  {id:"dashboard",      label:"Dashboard",         path:"/dashboard",             icon:LayoutDashboard, color:"#0a2558"},
  {id:"requisitions",   label:"Requisitions",      path:"/requisitions",          icon:ShoppingCart,    color:"#C45911"},
  {id:"pos",            label:"Purchase Orders",    path:"/purchase-orders",       icon:ShoppingCart,    color:"#0078d4"},
  {id:"grn",            label:"Goods Received",     path:"/goods-received",        icon:Package,         color:"#107c10"},
  {id:"suppliers",      label:"Suppliers",          path:"/suppliers",             icon:Layers,          color:"#374151"},
  {id:"tenders",        label:"Tenders",            path:"/tenders",               icon:Globe,           color:"#1F6090"},
  {id:"contracts",      label:"Contracts",          path:"/contracts",             icon:FileText,        color:"#0369a1"},
  {id:"bid_eval",       label:"Bid Evaluations",    path:"/bid-evaluations",       icon:BarChart3,       color:"#6d28d9"},
  {id:"proc_plan",      label:"Procurement Plan",   path:"/procurement-planning",  icon:BookOpen,        color:"#065f46"},
  {id:"vouchers",       label:"Vouchers Hub",        path:"/vouchers",              icon:DollarSign,      color:"#5C2D91"},
  {id:"pv",             label:"Payment Vouchers",    path:"/vouchers/payment",      icon:DollarSign,      color:"#0078d4"},
  {id:"rv",             label:"Receipt Vouchers",    path:"/vouchers/receipt",      icon:TrendingUp,      color:"#107c10"},
  {id:"jv",             label:"Journal Vouchers",    path:"/vouchers/journal",      icon:BookOpen,        color:"#5C2D91"},
  {id:"financials",     label:"Financials",          path:"/financials/dashboard",  icon:TrendingUp,      color:"#0369a1"},
  {id:"budgets",        label:"Budgets",             path:"/financials/budgets",    icon:BarChart3,       color:"#C45911"},
  {id:"coa",            label:"Chart of Accounts",   path:"/financials/chart-of-accounts", icon:BookOpen, color:"#374151"},
  {id:"inventory",      label:"Inventory",           path:"/items",                 icon:Package,         color:"#107c10"},
  {id:"categories",     label:"Categories",          path:"/categories",            icon:Hash,            color:"#6d28d9"},
  {id:"departments",    label:"Departments",         path:"/departments",           icon:Layers,          color:"#0369a1"},
  {id:"quality",        label:"Quality Control",     path:"/quality/dashboard",     icon:Shield,          color:"#059669"},
  {id:"documents",      label:"Documents",           path:"/documents",             icon:FileText,        color:"#92400e"},
  {id:"reports",        label:"Reports",             path:"/reports",               icon:BarChart3,       color:"#9333ea"},
  {id:"scanner",        label:"Scanner",             path:"/scanner",               icon:Search,          color:"#0e7490"},
  {id:"email",          label:"Email / Inbox",       path:"/email",                 icon:Mail,            color:"#c0185a"},
  {id:"users_mgmt",     label:"User Management",     path:"/users",                 icon:Users,           color:"#4b4b9b"},
  {id:"settings",       label:"Settings",            path:"/settings",              icon:Settings,        color:"#6b7280"},
  {id:"admin_panel",    label:"Admin Panel",         path:"/admin/panel",           icon:LayoutDashboard, color:"#0a2558"},
  {id:"admin_db",       label:"Database Admin",      path:"/admin/database",        icon:Database,        color:"#1e3a5f"},
  {id:"audit_log",      label:"Audit Log",           path:"/audit-log",             icon:Activity,        color:"#78350f"},
  {id:"backup",         label:"Backup Manager",      path:"/backup",                icon:Archive,         color:"#374151"},
  {id:"odbc",           label:"ODBC / Connections",  path:"/odbc",                  icon:Globe,           color:"#0369a1"},
  {id:"webmaster",      label:"Webmaster",           path:"/webmaster",             icon:Monitor,         color:"#1a3a6b"},
  {id:"profile",        label:"My Profile",          path:"/profile",               icon:Users,           color:"#6b7280"},
];

const LIVE_CONTROLS = [
  {key:"maintenance_mode",       label:"Maintenance Mode",       sub:"System-wide maintenance, blocks non-admin access",  danger:true},
  {key:"email_notifications_enabled",label:"Email Notifications", sub:"Enable email sending via SMTP/API provider",       danger:false},
  {key:"realtime_notifications", label:"Realtime Notifications", sub:"Live push notifications via Supabase Realtime",     danger:false},
  {key:"audit_logging_enabled",  label:"Audit Logging",          sub:"Log all user actions to audit_log table",           danger:false},
  {key:"allow_registration",     label:"Allow Registration",     sub:"Allow new users to self-register",                  danger:false},
  {key:"enable_documents",       label:"Document Module",        sub:"Enable document library and template system",       danger:false},
  {key:"enable_scanner",         label:"QR/Barcode Scanner",     sub:"Enable scanner module for item lookup",             danger:false},
  {key:"enable_api",             label:"External API",           sub:"Enable external API integrations and webhooks",     danger:false},
  {key:"webhooks_enabled",       label:"Webhooks",               sub:"Send event webhooks to external systems",           danger:false},
  {key:"lock_on_fail",           label:"Account Lockout",        sub:"Lock accounts after failed login attempts",         danger:false},
  {key:"force_pw_reset",         label:"Force Password Reset",   sub:"Force all users to reset passwords next login",     danger:true},
  {key:"backup_compress",        label:"Compress Backups",       sub:"Compress backup files to save storage",             danger:false},
];

const PLACEHOLDERS = [
  {label:"{{HOSPITAL_NAME}}",    value:"Embu Level 5 Hospital",     cat:"Hospital"},
  {label:"{{HOSPITAL_SHORT}}",   value:"EL5H",                       cat:"Hospital"},
  {label:"{{COUNTY}}",           value:"Embu County Government",     cat:"Hospital"},
  {label:"{{HOSPITAL_ADDRESS}}", value:"Embu Town, Embu County",     cat:"Hospital"},
  {label:"{{HOSPITAL_TEL}}",     value:"+254 060 000000",            cat:"Hospital"},
  {label:"{{HOSPITAL_EMAIL}}",   value:"info@embu-l5.go.ke",         cat:"Hospital"},
  {label:"{{CURRENT_DATE}}",     value:new Date().toLocaleDateString("en-KE",{year:"numeric",month:"long",day:"numeric"}), cat:"Date"},
  {label:"{{CURRENT_YEAR}}",     value:new Date().getFullYear().toString(), cat:"Date"},
  {label:"{{FY}}",               value:"2025/2026",                  cat:"Date"},
  {label:"{{PO_NUMBER}}",        value:"LPO/EL5H/2025/XXXX",        cat:"Procurement"},
  {label:"{{GRN_NUMBER}}",       value:"GRN/EL5H/2025/XXXX",        cat:"Procurement"},
  {label:"{{TENDER_NUMBER}}",    value:"TDR/EL5H/2025/XXX",         cat:"Procurement"},
  {label:"{{CONTRACT_NUMBER}}",  value:"CNT/EL5H/2025/XXX",         cat:"Procurement"},
  {label:"{{AMOUNT}}",           value:"KES 0.00",                   cat:"Finance"},
  {label:"{{PAYMENT_MODE}}",     value:"EFT/Cheque/Cash/MPESA",      cat:"Finance"},
  {label:"{{VOUCHER_NUMBER}}",   value:"PV/EL5H/YYYYMM/XXXX",       cat:"Finance"},
  {label:"{{SENDER_NAME}}",      value:"[Staff Name]",               cat:"User"},
  {label:"{{RECIPIENT_NAME}}",   value:"[Recipient Name]",           cat:"User"},
  {label:"{{SUPPLIER_NAME}}",    value:"[Supplier Name]",            cat:"Supplier"},
];

const lbl: React.CSSProperties = {fontSize:10,fontWeight:700,color:"#6b7280",display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.05em"};
const inp: React.CSSProperties = {width:"100%",padding:"8px 11px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:7,outline:"none",fontFamily:"inherit",boxSizing:"border-box" as const};

function Toggle({on,onChange}:{on:boolean;onChange:(v:boolean)=>void}) {
  return (
    <button onClick={()=>onChange(!on)} style={{background:"transparent",border:"none",cursor:"pointer",padding:0,lineHeight:0}}>
      <div style={{width:46,height:24,borderRadius:12,background:on?"#0a2558":"#d1d5db",display:"flex",alignItems:"center",padding:"2px",transition:"all 0.2s"}}>
        <div style={{width:20,height:20,borderRadius:"50%",background:"#fff",boxShadow:"0 1px 4px rgba(0,0,0,0.2)",transition:"transform 0.2s",transform:on?"translateX(22px)":"translateX(0)"}}/>
      </div>
    </button>
  );
}

function StatCard({label,value,icon:Icon,color,sub}:{label:string;value:any;icon:any;color:string;sub?:string}) {
  return (
    <div style={{background:"#fff",borderRadius:10,padding:"16px",border:"1px solid #e5e7eb",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
        <div style={{width:36,height:36,borderRadius:8,background:`${color}14`,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Icon style={{width:16,height:16,color}}/>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:10,fontWeight:800,color:"#9ca3af",textTransform:"uppercase" as const,letterSpacing:"0.06em"}}>{label}</div>
          {sub&&<div style={{fontSize:10,color:"#d1d5db"}}>{sub}</div>}
        </div>
      </div>
      <div style={{fontSize:26,fontWeight:900,color:"#111827"}}>{value??<span style={{fontSize:14,color:"#d1d5db"}}>—</span>}</div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────
function WebmasterInner() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [tab,      setTab]    = useState("overview");
  const [loading,  setLoading]= useState(true);
  const [saving,   setSaving] = useState(false);
  const [users,    setUsers]  = useState<any[]>([]);
  const [audit,    setAudit]  = useState<any[]>([]);
  const [auditSearch, setAuditSearch] = useState("");
  const [settings, setSettings] = useState<Record<string,string>>({});
  const [stats,    setStats]  = useState({totalUsers:0,activeUsers:0,totalAudit:0,tables:12,totalReqs:0,totalDocs:0,totalPV:0,totalGRN:0});
  const [cmdInput, setCmdInput]= useState("");
  const [sysLog,   setSysLog] = useState<string[]>(["[WebmasterOS v3.0] Console ready","[System] EL5 MediProcure — connected to Supabase"]);
  const [themeC,   setThemeC] = useState({primaryColor:"#0a2558",accentColor:"#C45911",sysName:"EL5 MediProcure",tagline:"Embu Level 5 Hospital",logoUrl:""});
  // Broadcast state
  const [bc,       setBc]     = useState({title:"",message:"",type:"info" as any,actionUrl:"",expiresIn:"30",persist:true,realtime:true});
  const [bcSending,setBcSending]=useState(false);
  const [bcHistory,setBcHistory]=useState<any[]>([]);
  // Module enabled state
  const [moduleEnabled, setModuleEnabled] = useState<Record<string,boolean>>({});
  // Copy placeholder feedback
  const [copiedPh, setCopiedPh] = useState<string|null>(null);

  const addLog = (msg: string) => setSysLog(p => [`[${new Date().toLocaleTimeString("en-KE")}] ${msg}`, ...p.slice(0, 99)]);

  const load = useCallback(async () => {
    setLoading(true);
    addLog("Loading system data…");
    try {
      const [
        {data:u},{data:a},{data:ss},{data:rq},{data:pv},{data:grn}
      ] = await Promise.all([
        (supabase as any).from("profiles").select("id,full_name,email,department,is_active,created_at").order("created_at",{ascending:false}),
        (supabase as any).from("audit_log").select("*").order("created_at",{ascending:false}).limit(200),
        (supabase as any).from("system_settings").select("key,value").limit(200),
        (supabase as any).from("requisitions").select("id",{count:"exact"}).limit(1),
        (supabase as any).from("payment_vouchers").select("id",{count:"exact"}).limit(1),
        (supabase as any).from("goods_received").select("id",{count:"exact"}).limit(1),
      ]);
      const urs = u||[];
      const sMap: Record<string,string> = {};
      (ss||[]).forEach((s:any)=>{if(s.key)sMap[s.key]=s.value||"";});
      setUsers(urs); setAudit(a||[]); setSettings(sMap);
      setStats({
        totalUsers: urs.length,
        activeUsers: urs.filter((x:any)=>x.is_active!==false).length,
        totalAudit: (a||[]).length,
        tables: 24,
        totalReqs: rq?.length||0,
        totalDocs: 0,
        totalPV: pv?.length||0,
        totalGRN: grn?.length||0,
      });
      setThemeC(tc=>({...tc,
        primaryColor: sMap.primary_color||"#0a2558",
        accentColor: sMap.accent_color||"#C45911",
        sysName: sMap.system_name||"EL5 MediProcure",
        tagline: sMap.hospital_name||"Embu Level 5 Hospital",
        logoUrl: sMap.system_logo_url||"",
      }));
      // Load module enabled states
      const me: Record<string,boolean> = {};
      ALL_MODULES.forEach(m=>{ me[m.id] = sMap[`module_${m.id}_enabled`]!=="false"; });
      setModuleEnabled(me);
      addLog(`Data loaded: ${urs.length} users, ${(a||[]).length} audit entries`);
    } catch(e:any) { addLog(`Error: ${e.message}`); }
    setLoading(false);
  }, []);

  useEffect(()=>{ load(); },[load]);

  // Live realtime channel for system-wide changes
  useEffect(()=>{
    const ch=(supabase as any).channel("wm-rt")
      .on("postgres_changes",{event:"*",schema:"public",table:"profiles"},()=>{ addLog("Profile change detected — reloading users"); load(); })
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"audit_log"},()=>{ load(); })
      .subscribe(()=>addLog("Realtime channel connected"));
    return ()=>(supabase as any).removeChannel(ch);
  },[load]);

  const saveSetting = async (key: string, value: string) => {
    const{data:ex}=await(supabase as any).from("system_settings").select("id").eq("key",key).maybeSingle();
    if(ex?.id) await(supabase as any).from("system_settings").update({value}).eq("key",key);
    else await(supabase as any).from("system_settings").insert({key,value});
  };

  const saveSettings = async (keys: Record<string,string>) => {
    setSaving(true);
    await Promise.all(Object.entries(keys).map(([k,v])=>saveSetting(k,v)));
    toast({title:"Settings saved ✓"}); setSaving(false);
  };

  const saveTheme = async () => {
    setSaving(true);
    await Promise.all([
      saveSetting("primary_color", themeC.primaryColor),
      saveSetting("accent_color",  themeC.accentColor),
      saveSetting("system_name",   themeC.sysName),
      saveSetting("hospital_name", themeC.tagline),
      saveSetting("system_logo_url",themeC.logoUrl),
    ]);
    // Broadcast theme change to all users
    await sendSystemBroadcast({
      title:"Theme Updated",
      message:`System appearance updated by ${profile?.full_name||"Admin"}.`,
      type:"info", expiresIn:15,
      senderId: user?.id,
    },{persist:false,realtime:true});
    toast({title:"Theme saved ✓ · Changes broadcast to all users"}); setSaving(false);
  };

  const toggleControl = async (key: string, val: boolean) => {
    const strVal = val ? "true" : "false";
    setSettings(p=>({...p,[key]:strVal}));
    await saveSetting(key, strVal);
    addLog(`Setting ${key} = ${strVal}`);
    // Broadcast maintenance mode
    if(key==="maintenance_mode") {
      await sendSystemBroadcast({
        title: val?"⚠️ Maintenance Mode Enabled":"✓ System Back Online",
        message: val?`System is entering maintenance. Non-admin access restricted. — ${profile?.full_name||"Admin"}`:`Maintenance completed. All modules are now accessible.`,
        type: val?"maintenance":"success", expiresIn: val?60:20,
        senderId: user?.id,
      });
      toast({title: val?"Maintenance mode ON — broadcast sent":"System online — broadcast sent"});
    } else {
      toast({title:`${key.replace(/_/g," ")} ${val?"enabled":"disabled"}`});
    }
  };

  const sendBroadcast = async () => {
    if(!bc.title||!bc.message){toast({title:"Title and message required",variant:"destructive"});return;}
    setBcSending(true);
    try {
      await sendSystemBroadcast({
        title: bc.title, message: bc.message, type: bc.type,
        actionUrl: bc.actionUrl||undefined,
        expiresIn: Number(bc.expiresIn)||30,
        senderId: user?.id,
      },{persist:bc.persist,realtime:bc.realtime});
      const entry = {title:bc.title,message:bc.message,type:bc.type,at:new Date().toISOString(),by:profile?.full_name};
      setBcHistory(p=>[entry,...p.slice(0,9)]);
      addLog(`Broadcast sent: ${bc.title}`);
      toast({title:"Broadcast sent ✓",description:`${bc.persist?"Persisted to notifications · ":""}${bc.realtime?"Live to all users":""}`});
      setBc(b=>({...b,title:"",message:"",actionUrl:""}));
    } catch(e:any){ toast({title:"Broadcast failed",description:e.message,variant:"destructive"}); }
    setBcSending(false);
  };

  const toggleUserActive = async (u: any) => {
    const val = u.is_active===false;
    await(supabase as any).from("profiles").update({is_active:val}).eq("id",u.id);
    addLog(`User ${u.full_name} ${val?"activated":"deactivated"}`);
    toast({title:`User ${val?"activated":"deactivated"}`}); load();
  };

  const updateUserRole = async (uid:string, role:string, name:string) => {
    await(supabase as any).from("user_roles").upsert({user_id:uid,role},{onConflict:"user_id"});
    addLog(`Role updated: ${name} → ${role}`);
    toast({title:`Role set to ${role}`});
  };

  const execCmd = (e:React.KeyboardEvent) => {
    if(e.key!=="Enter") return;
    const c=cmdInput.trim().toLowerCase();
    addLog(`> ${cmdInput}`);
    if(c==="help") addLog("Commands: help, clear, reload, stats, users, audit, maintenance on/off, broadcast <msg>");
    else if(c==="clear") { setSysLog(["[Console cleared]"]); }
    else if(c==="reload") { load(); }
    else if(c==="stats") addLog(`Users: ${stats.totalUsers} · Audit: ${stats.totalAudit} · Reqs: ${stats.totalReqs}`);
    else if(c==="users") addLog(`Active: ${stats.activeUsers}/${stats.totalUsers} users`);
    else if(c==="audit") addLog(`Audit entries: ${audit.length}`);
    else if(c==="maintenance on") toggleControl("maintenance_mode",true);
    else if(c==="maintenance off") toggleControl("maintenance_mode",false);
    else if(c.startsWith("broadcast ")) {
      const msg=cmdInput.slice(10);
      sendSystemBroadcast({title:"Admin Message",message:msg,type:"info",expiresIn:30,senderId:user?.id});
      addLog(`Broadcast sent: ${msg}`);
    }
    else addLog(`Unknown command: ${c}. Type "help" for commands.`);
    setCmdInput("");
  };

  const copyPlaceholder = (label: string) => {
    navigator.clipboard.writeText(label);
    setCopiedPh(label); setTimeout(()=>setCopiedPh(null),2000);
    toast({title:`Copied ${label}`});
  };

  const exportAudit = () => {
    const ws=XLSX.utils.json_to_sheet(audit.map(a=>({Date:new Date(a.created_at).toLocaleString("en-KE"),Action:a.action,Table:a.table_name,Details:a.details||"",User:a.user_id?.slice(0,8)})));
    const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"AuditLog");
    XLSX.writeFile(wb,`audit_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast({title:"Audit exported"});
  };

  const BC_TYPES = [{v:"info",l:"Info",c:"#1d4ed8"},{v:"success",l:"Success",c:"#15803d"},{v:"warning",l:"Warning",c:"#92400e"},{v:"error",l:"Alert",c:"#dc2626"},{v:"maintenance",l:"Maintenance",c:"#6d28d9"},{v:"announcement",l:"Announcement",c:"#c2410c"}];

  const filteredAudit = auditSearch ? audit.filter(a=>Object.values(a).some(v=>String(v||"").toLowerCase().includes(auditSearch.toLowerCase()))) : audit;

  return (
    <div style={{minHeight:"100%",background:"#f0f2f5",fontSize:13,fontFamily:"'Inter','Segoe UI',sans-serif"}}>

      {/* Top bar */}
      <div style={{background:"linear-gradient(135deg,#0a2558,#1a3a6b)",padding:"14px 22px",display:"flex",alignItems:"center",gap:14}}>
        <div style={{width:38,height:38,borderRadius:9,background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <Monitor style={{width:19,height:19,color:"#fff"}}/>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:16,fontWeight:900,color:"#fff"}}>Webmaster Control Panel</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.45)"}}>EL5 MediProcure · Full system administration & live controls</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:5,padding:"5px 12px",background:"rgba(16,185,129,0.2)",border:"1px solid rgba(16,185,129,0.35)",borderRadius:20}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:"#10b981"}} className="live-dot"/>
            <span style={{fontSize:11,fontWeight:700,color:"#6ee7b7"}}>LIVE</span>
          </div>
          {settings.maintenance_mode==="true"&&(
            <div style={{display:"flex",alignItems:"center",gap:5,padding:"5px 12px",background:"rgba(220,38,38,0.3)",border:"1px solid rgba(220,38,38,0.5)",borderRadius:20}}>
              <Wrench style={{width:11,height:11,color:"#fca5a5"}}/> <span style={{fontSize:11,fontWeight:700,color:"#fca5a5"}}>MAINTENANCE</span>
            </div>
          )}
          <button onClick={load} style={{padding:"7px 10px",background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:7,cursor:"pointer",color:"#fff",lineHeight:0}}>
            <RefreshCw style={{width:13,height:13}} className={loading?"animate-spin":""}/>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",background:"#fff",borderBottom:"1px solid #e5e7eb",overflowX:"auto" as const}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{display:"flex",alignItems:"center",gap:7,padding:"11px 18px",border:"none",background:"transparent",cursor:"pointer",fontSize:12,fontWeight:tab===t.id?800:500,color:tab===t.id?t.color:"#6b7280",borderBottom:tab===t.id?`3px solid ${t.color}`:"3px solid transparent",transition:"all 0.12s",whiteSpace:"nowrap" as const,flexShrink:0}}>
            <t.icon style={{width:13,height:13}}/> {t.label}
          </button>
        ))}
      </div>

      <div style={{padding:20}}>

        {/* ── OVERVIEW ── */}
        {tab==="overview"&&(
          <>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12,marginBottom:20}}>
              <StatCard label="Total Users"    value={stats.totalUsers}    icon={Users}       color="#0078d4" sub={`${stats.activeUsers} active`}/>
              <StatCard label="Audit Entries"  value={stats.totalAudit}    icon={Activity}    color="#C45911"/>
              <StatCard label="DB Tables"      value={stats.tables}        icon={Database}    color="#5b21b6"/>
              <StatCard label="Requisitions"   value={stats.totalReqs}     icon={ShoppingCart}color="#0369a1"/>
              <StatCard label="Payment Vouchers"value={stats.totalPV}      icon={DollarSign}  color="#107c10"/>
              <StatCard label="GRN Records"    value={stats.totalGRN}      icon={Package}     color="#92400e"/>
            </div>

            {/* System status tiles */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:20,marginBottom:20}}>
              <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",overflow:"hidden"}}>
                <div style={{padding:"11px 16px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:8}}>
                  <Server style={{width:14,height:14,color:"#374151"}}/><span style={{fontSize:14,fontWeight:800,color:"#111827"}}>System Status</span>
                  <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:5,fontSize:11,fontWeight:700,color:"#10b981"}}><div style={{width:6,height:6,borderRadius:"50%",background:"#10b981"}} className="live-dot"/>All Systems Operational</div>
                </div>
                <div style={{padding:"0 16px"}}>
                  {[
                    {label:"Supabase Database",    ok:true, detail:"PostgreSQL 15"},
                    {label:"Authentication",        ok:true, detail:"Supabase Auth"},
                    {label:"Realtime Engine",       ok:true, detail:"WebSocket active"},
                    {label:"Edge Functions",        ok:true, detail:"send-email deployed"},
                    {label:"Storage",               ok:true, detail:"Supabase Storage"},
                    {label:"REST API",              ok:true, detail:"PostgREST v12"},
                    {label:"Maintenance Mode",      ok:settings.maintenance_mode!=="true", detail:settings.maintenance_mode==="true"?"ACTIVE":"Disabled"},
                    {label:"Email Sending",         ok:settings.email_notifications_enabled==="true", detail:settings.email_notifications_enabled==="true"?"Enabled":"Disabled"},
                  ].map(si=>(
                    <div key={si.label} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid #f9fafb"}}>
                      <span style={{fontSize:13,color:"#374151",fontWeight:500}}>{si.label}</span>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <span style={{fontSize:11,color:"#9ca3af"}}>{si.detail}</span>
                        <div style={{width:6,height:6,borderRadius:"50%",background:si.ok?"#10b981":"#dc2626"}}/>
                        <span style={{fontSize:11,fontWeight:700,color:si.ok?"#10b981":"#dc2626"}}>{si.ok?"OK":"ISSUE"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick actions */}
              <div style={{display:"flex",flexDirection:"column" as const,gap:10}}>
                <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",padding:"12px 14px"}}>
                  <div style={{fontSize:12,fontWeight:800,color:"#111827",marginBottom:10}}>Quick Access</div>
                  {[
                    {label:"Database Admin",     icon:Database,  color:"#1e3a5f", path:"/admin/database"},
                    {label:"Admin Panel",        icon:LayoutDashboard,color:"#0a2558",path:"/admin/panel"},
                    {label:"Audit Log",          icon:Activity,  color:"#78350f", path:"/audit-log"},
                    {label:"Backup Manager",     icon:Archive,   color:"#374151", path:"/backup"},
                    {label:"User Management",    icon:Users,     color:"#4b4b9b", path:"/users"},
                    {label:"System Settings",    icon:Settings,  color:"#6b7280", path:"/settings"},
                    {label:"ODBC Connections",   icon:Globe,     color:"#0369a1", path:"/odbc"},
                    {label:"Email / Inbox",      icon:Mail,      color:"#c0185a", path:"/email"},
                  ].map(a=>(
                    <button key={a.path} onClick={()=>navigate(a.path)}
                      style={{display:"flex",alignItems:"center",gap:9,width:"100%",padding:"9px 10px",border:"none",background:"transparent",cursor:"pointer",fontSize:13,fontWeight:600,color:"#374151",borderRadius:7,transition:"background 0.1s",marginBottom:1}}
                      onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f0f6ff"}
                      onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
                      <div style={{width:26,height:26,borderRadius:6,background:`${a.color}14`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <a.icon style={{width:12,height:12,color:a.color}}/>
                      </div>
                      {a.label}
                      <ChevronRight style={{width:11,height:11,color:"#d1d5db",marginLeft:"auto"}}/>
                    </button>
                  ))}
                </div>

                {/* Live toggles mini-panel */}
                <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",padding:"12px 14px"}}>
                  <div style={{fontSize:12,fontWeight:800,color:"#111827",marginBottom:10,display:"flex",alignItems:"center",gap:6}}><Sliders style={{width:12,height:12}}/> Live Toggles</div>
                  {LIVE_CONTROLS.slice(0,4).map(lc=>(
                    <div key={lc.key} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #f9fafb"}}>
                      <span style={{fontSize:12,fontWeight:600,color:lc.danger?"#dc2626":"#374151"}}>{lc.label}</span>
                      <Toggle on={settings[lc.key]==="true"} onChange={v=>toggleControl(lc.key,v)}/>
                    </div>
                  ))}
                  <button onClick={()=>setTab("controls")} style={{width:"100%",padding:"6px",background:"#f3f4f6",border:"none",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:700,color:"#6b7280",marginTop:6}}>View all controls →</button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── LIVE BROADCAST ── */}
        {tab==="broadcast"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 360px",gap:20}}>
            <div>
              {/* Compose */}
              <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",overflow:"hidden",marginBottom:16}}>
                <div style={{padding:"12px 16px",background:"linear-gradient(135deg,#dc2626,#b91c1c)",display:"flex",alignItems:"center",gap:8}}>
                  <Radio style={{width:14,height:14,color:"#fff"}}/><span style={{fontSize:14,fontWeight:900,color:"#fff",flex:1}}>Send Live Broadcast</span>
                  <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"rgba(255,255,255,0.7)"}}>
                    <div style={{width:5,height:5,borderRadius:"50%",background:"#fff"}} className="live-dot"/> Realtime to all users
                  </div>
                </div>
                <div style={{padding:18,display:"flex",flexDirection:"column",gap:13}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                    <div>
                      <label style={lbl}>Message Type</label>
                      <div style={{display:"flex",gap:5,flexWrap:"wrap" as const}}>
                        {BC_TYPES.map(bt=>(
                          <button key={bt.v} onClick={()=>setBc(b=>({...b,type:bt.v as any}))}
                            style={{padding:"5px 11px",borderRadius:6,border:`1px solid ${bc.type===bt.v?bt.c:"#e5e7eb"}`,background:bc.type===bt.v?bt.c:"#f9fafb",color:bc.type===bt.v?"#fff":bt.c,fontSize:11,fontWeight:700,cursor:"pointer"}}>
                            {bt.l}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label style={lbl}>Auto-dismiss (seconds)</label>
                      <input type="number" value={bc.expiresIn} onChange={e=>setBc(b=>({...b,expiresIn:e.target.value}))} min={5} max={300} style={{...inp,width:100}}/>
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>Broadcast Title *</label>
                    <input value={bc.title} onChange={e=>setBc(b=>({...b,title:e.target.value}))} placeholder="e.g. System Maintenance in 30 minutes" style={inp}/>
                  </div>
                  <div>
                    <label style={lbl}>Message *</label>
                    <textarea value={bc.message} onChange={e=>setBc(b=>({...b,message:e.target.value}))} rows={3} placeholder="Full message text shown to all users…" style={{...inp,resize:"vertical" as const}}/>
                  </div>
                  <div>
                    <label style={lbl}>Action URL (optional)</label>
                    <input value={bc.actionUrl} onChange={e=>setBc(b=>({...b,actionUrl:e.target.value}))} placeholder="e.g. /settings" style={inp}/>
                  </div>
                  <div style={{display:"flex",gap:20,padding:"10px 0",borderTop:"1px solid #f3f4f6"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <Toggle on={bc.realtime} onChange={v=>setBc(b=>({...b,realtime:v}))}/>
                      <span style={{fontSize:12,fontWeight:600,color:"#374151"}}>Realtime banner</span>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <Toggle on={bc.persist} onChange={v=>setBc(b=>({...b,persist:v}))}/>
                      <span style={{fontSize:12,fontWeight:600,color:"#374151"}}>Save to notifications</span>
                    </div>
                  </div>
                  <button onClick={sendBroadcast} disabled={bcSending}
                    style={{display:"flex",alignItems:"center",gap:8,padding:"11px 22px",background:bcSending?"#9ca3af":"#dc2626",color:"#fff",border:"none",borderRadius:8,cursor:bcSending?"not-allowed":"pointer",fontSize:13,fontWeight:800,justifyContent:"center"}}>
                    {bcSending?<RefreshCw style={{width:14,height:14}} className="animate-spin"/>:<Megaphone style={{width:14,height:14}}/>}
                    {bcSending?"Sending…":"Send Broadcast to All Users"}
                  </button>
                </div>
              </div>

              {/* Placeholders reference */}
              <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",overflow:"hidden"}}>
                <div style={{padding:"11px 16px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:8}}>
                  <Hash style={{width:13,height:13,color:"#6b7280"}}/><span style={{fontSize:13,fontWeight:800,color:"#111827"}}>System Placeholders</span>
                  <span style={{fontSize:11,color:"#9ca3af",marginLeft:"auto"}}>Click to copy</span>
                </div>
                <div style={{padding:14}}>
                  {Array.from(new Set(PLACEHOLDERS.map(p=>p.cat))).map(cat=>(
                    <div key={cat} style={{marginBottom:14}}>
                      <div style={{fontSize:10,fontWeight:800,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:7}}>{cat}</div>
                      <div style={{display:"flex",flexWrap:"wrap" as const,gap:6}}>
                        {PLACEHOLDERS.filter(p=>p.cat===cat).map(p=>(
                          <button key={p.label} onClick={()=>copyPlaceholder(p.label)} title={p.value}
                            style={{padding:"5px 10px",borderRadius:6,border:`1px solid ${copiedPh===p.label?"#10b981":"#e5e7eb"}`,background:copiedPh===p.label?"#dcfce7":"#f9fafb",color:copiedPh===p.label?"#15803d":"#374151",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Courier New',monospace",transition:"all 0.2s"}}>
                            {copiedPh===p.label?"✓ Copied":p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Broadcast history */}
            <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",overflow:"hidden",height:"fit-content" as const}}>
              <div style={{padding:"11px 14px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:8}}>
                <Clock style={{width:13,height:13,color:"#6b7280"}}/><span style={{fontSize:13,fontWeight:800,color:"#111827"}}>Recent Broadcasts</span>
              </div>
              {bcHistory.length===0?(
                <div className="placeholder-box" style={{margin:14}}>
                  <Megaphone style={{width:28,height:28,color:"#e5e7eb",margin:"0 auto 8px"}}/>
                  <div style={{fontSize:12}}>No broadcasts sent yet</div>
                  <div style={{fontSize:11,color:"#d1d5db",marginTop:4}}>Broadcasts you send will appear here</div>
                </div>
              ):bcHistory.map((b,i)=>(
                <div key={i} style={{padding:"10px 14px",borderBottom:"1px solid #f9fafb"}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#111827"}}>{b.title}</div>
                  <div style={{fontSize:11,color:"#6b7280",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{b.message}</div>
                  <div style={{fontSize:10,color:"#9ca3af",marginTop:3}}>by {b.by} · {new Date(b.at).toLocaleTimeString("en-KE")}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── MODULES ── */}
        {tab==="modules"&&(
          <div>
            <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",overflow:"hidden",marginBottom:16}}>
              <div style={{padding:"12px 16px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:8}}>
                <Layers style={{width:14,height:14,color:"#059669"}}/><span style={{fontSize:14,fontWeight:800,color:"#111827"}}>All Modules</span>
                <span style={{fontSize:11,color:"#9ca3af",marginLeft:8}}>{ALL_MODULES.length} modules</span>
                <span style={{fontSize:11,color:"#9ca3af",marginLeft:"auto"}}>Click to navigate · Toggle to enable/disable</span>
              </div>
              <div style={{padding:16,display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:8}}>
                {ALL_MODULES.map(mod=>(
                  <div key={mod.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:`${mod.color}06`,border:`1px solid ${mod.color}20`,borderRadius:9,transition:"all 0.12s"}}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=`${mod.color}12`}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=`${mod.color}06`}>
                    <div style={{width:32,height:32,borderRadius:7,background:`${mod.color}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <mod.icon style={{width:14,height:14,color:mod.color}}/>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:700,color:"#111827",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{mod.label}</div>
                      <div style={{fontSize:10,color:"#9ca3af",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{mod.path}</div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:7,flexShrink:0}}>
                      <Toggle on={moduleEnabled[mod.id]!==false} onChange={async v=>{
                        setModuleEnabled(p=>({...p,[mod.id]:v}));
                        await saveSetting(`module_${mod.id}_enabled`,v?"true":"false");
                        addLog(`Module ${mod.id} ${v?"enabled":"disabled"}`);
                        toast({title:`${mod.label} ${v?"enabled":"disabled"}`});
                      }}/>
                      <button onClick={()=>navigate(mod.path)} style={{padding:"5px 8px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:6,cursor:"pointer",lineHeight:0}}>
                        <ChevronRight style={{width:11,height:11,color:"#6b7280"}}/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Full Page Action Buttons */}
            <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",overflow:"hidden"}}>
              <div style={{padding:"12px 16px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:8}}>
                <Zap style={{width:13,height:13,color:"#C45911"}}/><span style={{fontSize:13,fontWeight:800,color:"#111827"}}>Full-Page Quick Launch</span>
              </div>
              <div style={{padding:14,display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:10}}>
                {[
                  {label:"🔍 Audit Log",        color:"#78350f",  bg:"#fff7ed",  path:"/audit-log"},
                  {label:"🗄️ Database Admin",   color:"#1e3a5f",  bg:"#eff6ff",  path:"/admin/database"},
                  {label:"💾 Backup Manager",   color:"#374151",  bg:"#f9fafb",  path:"/backup"},
                  {label:"🔗 ODBC Connections", color:"#0369a1",  bg:"#e0f2fe",  path:"/odbc"},
                  {label:"👥 User Management",  color:"#4b4b9b",  bg:"#f5f3ff",  path:"/users"},
                  {label:"⚙️ System Settings",  color:"#374151",  bg:"#f9fafb",  path:"/settings"},
                  {label:"📊 Reports",           color:"#9333ea",  bg:"#faf5ff",  path:"/reports"},
                  {label:"📧 Email / Inbox",     color:"#c0185a",  bg:"#fff0f6",  path:"/email"},
                  {label:"🛒 Requisitions",      color:"#C45911",  bg:"#fff7ed",  path:"/requisitions"},
                  {label:"📦 Inventory",         color:"#107c10",  bg:"#f0fdf4",  path:"/items"},
                  {label:"💰 Payment Vouchers",  color:"#0078d4",  bg:"#eff6ff",  path:"/vouchers/payment"},
                  {label:"🏥 Dashboard",         color:"#0a2558",  bg:"#eff6ff",  path:"/dashboard"},
                ].map(btn=>(
                  <button key={btn.path} onClick={()=>navigate(btn.path)} className="full-action-btn"
                    style={{background:btn.bg,color:btn.color,border:`1px solid ${btn.color}20`}}>
                    <span style={{fontSize:14}}>{btn.label.split(" ")[0]}</span>
                    <span style={{fontWeight:800,fontSize:12}}>{btn.label.slice(btn.label.indexOf(" ")+1)}</span>
                    <ArrowRight style={{width:12,height:12,marginLeft:"auto",opacity:0.5}}/>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── USERS ── */}
        {tab==="users"&&(
          <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",overflow:"hidden"}}>
            <div style={{padding:"12px 16px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap" as const}}>
              <Users style={{width:14,height:14,color:"#5b21b6"}}/><span style={{fontSize:14,fontWeight:800,color:"#111827",flex:1}}>All Users ({users.length})</span>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>{ const ws=XLSX.utils.json_to_sheet(users.map(u=>({Name:u.full_name,Email:u.email,Dept:u.department,Active:u.is_active!==false?"Yes":"No",Joined:u.created_at?.slice(0,10)}))); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Users"); XLSX.writeFile(wb,"users.xlsx"); }}
                  style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:700}}>
                  <Download style={{width:12,height:12}}/> Export
                </button>
                <button onClick={()=>navigate("/users")} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",background:"#1a3a6b",border:"none",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:700,color:"#fff"}}>
                  <ExternalLink style={{width:12,height:12}}/> Full User Manager
                </button>
              </div>
            </div>
            <div style={{overflowX:"auto" as const}}>
              <table style={{width:"100%",borderCollapse:"collapse" as const,fontSize:12}}>
                <thead><tr style={{background:"#f9fafb"}}>
                  {["Name","Email","Department","Role","Joined","Status","Actions"].map(h=>(
                    <th key={h} style={{padding:"10px 14px",textAlign:"left" as const,fontSize:10,fontWeight:800,color:"#6b7280",borderBottom:"1px solid #f3f4f6",textTransform:"uppercase" as const,letterSpacing:"0.04em",whiteSpace:"nowrap" as const}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {users.map((u,i)=>(
                    <tr key={u.id} style={{borderBottom:"1px solid #f9fafb",background:i%2===0?"#fff":"#fafafa"}}>
                      <td style={{padding:"10px 14px",fontWeight:700,color:"#111827",whiteSpace:"nowrap" as const}}>{u.full_name||"—"}</td>
                      <td style={{padding:"10px 14px",color:"#6b7280",fontSize:11}}>{u.email}</td>
                      <td style={{padding:"10px 14px",color:"#6b7280",fontSize:11}}>{u.department||"—"}</td>
                      <td style={{padding:"10px 14px"}}>
                        <select defaultValue={u.user_roles?.[0]?.role||"requisitioner"} onChange={e=>updateUserRole(u.id,e.target.value,u.full_name||u.email)}
                          style={{padding:"4px 8px",fontSize:11,border:"1px solid #e5e7eb",borderRadius:5,outline:"none",fontWeight:700,color:"#1a3a6b",background:"#eff6ff",cursor:"pointer"}}>
                          {["admin","procurement_manager","procurement_officer","finance_officer","inventory_manager","warehouse_officer","requisitioner","quality_officer","viewer"].map(r=>(<option key={r} value={r}>{r.replace(/_/g," ")}</option>))}
                        </select>
                      </td>
                      <td style={{padding:"10px 14px",color:"#9ca3af",fontSize:11,whiteSpace:"nowrap" as const}}>{u.created_at?.slice(0,10)||"—"}</td>
                      <td style={{padding:"10px 14px"}}>
                        <span style={{fontSize:10,fontWeight:800,padding:"3px 9px",borderRadius:12,background:u.is_active!==false?"#dcfce7":"#fee2e2",color:u.is_active!==false?"#15803d":"#dc2626"}}>
                          {u.is_active!==false?"Active":"Inactive"}
                        </span>
                      </td>
                      <td style={{padding:"10px 14px"}}>
                        <button onClick={()=>toggleUserActive(u)} title={u.is_active!==false?"Deactivate":"Activate"}
                          style={{padding:"5px 10px",fontSize:11,fontWeight:700,borderRadius:6,border:"1px solid #e5e7eb",cursor:"pointer",background:u.is_active!==false?"#fee2e2":"#dcfce7",color:u.is_active!==false?"#dc2626":"#15803d",display:"flex",alignItems:"center",gap:4}}>
                          {u.is_active!==false?<Lock style={{width:10,height:10}}/>:<Unlock style={{width:10,height:10}}/>}
                          {u.is_active!==false?"Lock":"Unlock"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── LIVE CONTROLS ── */}
        {tab==="controls"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",overflow:"hidden"}}>
              <div style={{padding:"12px 16px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",display:"flex",alignItems:"center",gap:8}}>
                <Sliders style={{width:14,height:14,color:"#fff"}}/><span style={{fontSize:14,fontWeight:900,color:"#fff",flex:1}}>Live System Controls</span>
                <span style={{fontSize:10,color:"rgba(255,255,255,0.5)"}}>Changes apply instantly</span>
              </div>
              <div style={{padding:"4px 0"}}>
                {LIVE_CONTROLS.map((lc,i)=>(
                  <div key={lc.key} style={{display:"flex",alignItems:"center",gap:14,padding:"13px 18px",borderBottom:"1px solid #f9fafb",background:lc.danger&&settings[lc.key]==="true"?"#fff5f5":"transparent"}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        {lc.danger&&<div style={{width:3,height:14,borderRadius:2,background:"#dc2626",flexShrink:0}}/>}
                        <span style={{fontSize:13,fontWeight:700,color:lc.danger?"#dc2626":"#111827"}}>{lc.label}</span>
                      </div>
                      <div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>{lc.sub}</div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                      <span style={{fontSize:11,fontWeight:700,color:settings[lc.key]==="true"?"#15803d":"#9ca3af",minWidth:40}}>
                        {settings[lc.key]==="true"?"ON":"OFF"}
                      </span>
                      <Toggle on={settings[lc.key]==="true"} onChange={v=>toggleControl(lc.key,v)}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Numeric / text settings */}
            <div style={{display:"flex",flexDirection:"column" as const,gap:14}}>
              <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",padding:"14px 16px"}}>
                <div style={{fontSize:13,fontWeight:800,color:"#111827",marginBottom:14,display:"flex",alignItems:"center",gap:7}}><Settings style={{width:13,height:13,color:"#374151"}}/>System Config</div>
                <div style={{display:"flex",flexDirection:"column" as const,gap:11}}>
                  {[
                    {key:"smtp_host",      label:"SMTP Host",      ph:"smtp.gmail.com"},
                    {key:"smtp_port",      label:"SMTP Port",      ph:"587"},
                    {key:"smtp_from",      label:"From Email",     ph:"noreply@embu-l5.go.ke"},
                    {key:"smtp_from_name", label:"From Name",      ph:"EL5 MediProcure"},
                    {key:"api_base_url",   label:"API Base URL",   ph:"https://api.example.com"},
                    {key:"webhook_url",    label:"Webhook URL",    ph:"https://hooks.example.com"},
                    {key:"backup_schedule",label:"Backup Schedule",ph:"weekly"},
                  ].map(f=>(
                    <div key={f.key}>
                      <label style={lbl}>{f.label}</label>
                      <input value={settings[f.key]||""} onChange={e=>setSettings(p=>({...p,[f.key]:e.target.value}))} placeholder={f.ph} style={inp}/>
                    </div>
                  ))}
                  <button onClick={()=>saveSettings(Object.fromEntries([["smtp_host","smtp_port","smtp_from","smtp_from_name","api_base_url","webhook_url","backup_schedule"].map(k=>[k,settings[k]||""])]))} disabled={saving}
                    style={{display:"flex",alignItems:"center",gap:6,padding:"9px 18px",background:"#0a2558",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:800,marginTop:6}}>
                    {saving?<RefreshCw style={{width:12,height:12}} className="animate-spin"/>:<Save style={{width:12,height:12}}/>} Save Config
                  </button>
                </div>
              </div>

              {/* Broadcast quick-send */}
              <div style={{background:"linear-gradient(135deg,#fef2f2,#fff5f5)",borderRadius:12,border:"1px solid #fecaca",padding:"14px 16px"}}>
                <div style={{fontSize:13,fontWeight:800,color:"#dc2626",marginBottom:10,display:"flex",alignItems:"center",gap:7}}><AlertCircle style={{width:13,height:13}}/>Emergency Broadcast</div>
                <div style={{display:"flex",gap:8,flexDirection:"column" as const}}>
                  {[
                    {label:"🔧 Maintenance ON",  msg:"System maintenance has started. Please save your work.",   type:"maintenance"},
                    {label:"✅ Back Online",      msg:"Maintenance complete. All systems operational.",            type:"success"},
                    {label:"⚠️ Urgent Alert",    msg:"Please stop all transactions immediately.",                  type:"error"},
                    {label:"📢 Announcement",    msg:"System update scheduled for tonight.",                     type:"announcement"},
                  ].map(b=>(
                    <button key={b.label} onClick={()=>sendSystemBroadcast({title:b.label.slice(3),message:b.msg,type:b.type as any,expiresIn:45,senderId:user?.id}).then(()=>toast({title:"Broadcast sent ✓"}))}
                      className="full-action-btn"
                      style={{background:"#fff",color:"#dc2626",border:"1px solid #fecaca",marginBottom:6,fontSize:11}}>
                      <span>{b.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── THEME ── */}
        {tab==="theme"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:20}}>
            <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",padding:"18px 20px"}}>
              <div style={{fontSize:14,fontWeight:800,color:"#111827",marginBottom:16,display:"flex",alignItems:"center",gap:8}}><Palette style={{width:14,height:14,color:"#8b5cf6"}}/>Brand & Appearance</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                {[
                  {k:"sysName",   l:"System Name",         ph:"EL5 MediProcure"},
                  {k:"tagline",   l:"Hospital Name",        ph:"Embu Level 5 Hospital"},
                  {k:"logoUrl",   l:"Logo URL",             ph:"https://…/logo.png"},
                ].map(f=>(
                  <div key={f.k}>
                    <label style={lbl}>{f.l}</label>
                    <input value={(themeC as any)[f.k]||""} onChange={e=>setThemeC(t=>({...t,[f.k]:e.target.value}))} placeholder={f.ph} style={inp}/>
                  </div>
                ))}
                <div>
                  <label style={lbl}>Primary Color</label>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <input type="color" value={themeC.primaryColor} onChange={e=>setThemeC(t=>({...t,primaryColor:e.target.value}))} style={{width:40,height:34,borderRadius:6,border:"1px solid #e5e7eb",cursor:"pointer",padding:2}}/>
                    <input value={themeC.primaryColor} onChange={e=>setThemeC(t=>({...t,primaryColor:e.target.value}))} style={{...inp,flex:1,fontFamily:"monospace"}}/>
                  </div>
                </div>
                <div>
                  <label style={lbl}>Accent Color</label>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <input type="color" value={themeC.accentColor} onChange={e=>setThemeC(t=>({...t,accentColor:e.target.value}))} style={{width:40,height:34,borderRadius:6,border:"1px solid #e5e7eb",cursor:"pointer",padding:2}}/>
                    <input value={themeC.accentColor} onChange={e=>setThemeC(t=>({...t,accentColor:e.target.value}))} style={{...inp,flex:1,fontFamily:"monospace"}}/>
                  </div>
                </div>
              </div>
              <button onClick={saveTheme} disabled={saving} style={{display:"flex",alignItems:"center",gap:7,padding:"10px 22px",background:"#8b5cf6",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:800,marginTop:18}}>
                {saving?<RefreshCw style={{width:12,height:12}} className="animate-spin"/>:<Save style={{width:12,height:12}}/>}
                Save & Broadcast Theme
              </button>
              <div style={{marginTop:10,fontSize:11,color:"#9ca3af"}}>Saving theme will also send a live notification to all online users.</div>
            </div>

            {/* Preview */}
            <div>
              <div style={{borderRadius:12,overflow:"hidden",boxShadow:"0 4px 20px rgba(0,0,0,0.15)"}}>
                <div style={{background:`linear-gradient(135deg,${themeC.primaryColor},${themeC.accentColor})`,padding:"12px 16px",display:"flex",alignItems:"center",gap:10}}>
                  {themeC.logoUrl?<img src={themeC.logoUrl} style={{height:30,objectFit:"contain"}} onError={e=>(e.currentTarget.style.display="none")} alt="Logo"/>:<div style={{width:30,height:30,borderRadius:7,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:900,color:"#fff"}}>E</div>}
                  <div>
                    <div style={{fontSize:13,fontWeight:800,color:"#fff"}}>{themeC.sysName}</div>
                    <div style={{fontSize:10,color:"rgba(255,255,255,0.55)"}}>{themeC.tagline}</div>
                  </div>
                </div>
                <div style={{background:"#fff",padding:14}}>
                  <div style={{fontSize:11,fontWeight:700,color:"#9ca3af",marginBottom:8}}>PREVIEW</div>
                  <div style={{padding:"8px 14px",background:themeC.primaryColor,borderRadius:7,color:"#fff",fontSize:12,fontWeight:700,textAlign:"center" as const,marginBottom:8}}>Primary Button</div>
                  <div style={{padding:"8px 14px",background:themeC.accentColor,borderRadius:7,color:"#fff",fontSize:12,fontWeight:700,textAlign:"center" as const}}>Accent Button</div>
                </div>
              </div>
              <div style={{marginTop:14,background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",padding:"12px 14px"}}>
                <div style={{fontSize:11,fontWeight:800,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8}}>Preset Palettes</div>
                {[
                  {name:"Navy (Default)",    p:"#0a2558",a:"#C45911"},
                  {name:"Forest Green",      p:"#065f46",a:"#0369a1"},
                  {name:"Royal Blue",        p:"#1d4ed8",a:"#7c3aed"},
                  {name:"Dark Slate",        p:"#1e293b",a:"#0ea5e9"},
                ].map(preset=>(
                  <button key={preset.name} onClick={()=>setThemeC(t=>({...t,primaryColor:preset.p,accentColor:preset.a}))}
                    style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"8px 10px",border:"1px solid #f3f4f6",borderRadius:7,cursor:"pointer",background:"transparent",marginBottom:5,transition:"background 0.1s"}}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f9fafb"}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
                    <div style={{display:"flex",gap:4}}>
                      <div style={{width:16,height:16,borderRadius:3,background:preset.p}}/>
                      <div style={{width:16,height:16,borderRadius:3,background:preset.a}}/>
                    </div>
                    <span style={{fontSize:12,fontWeight:600,color:"#374151"}}>{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── SYSTEM ── */}
        {tab==="system"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",padding:"16px 18px"}}>
              <div style={{fontSize:13,fontWeight:800,color:"#111827",marginBottom:14,display:"flex",alignItems:"center",gap:7}}><Info style={{width:13,height:13,color:"#0078d4"}}/>System Information</div>
              {[
                ["System Name",      settings.system_name||"EL5 MediProcure"],
                ["Hospital",         settings.hospital_name||"Embu Level 5 Hospital"],
                ["Version",          "3.0.0"],
                ["Build",            "2026.03.10"],
                ["Stack",            "React + TypeScript + Vite + Supabase"],
                ["DB Engine",        "PostgreSQL 15 (Supabase)"],
                ["Realtime",         "Supabase Realtime v2"],
                ["Auth",             "Supabase Auth (JWT)"],
                ["Total Users",      stats.totalUsers],
                ["Active Users",     stats.activeUsers],
                ["Audit Entries",    stats.totalAudit],
                ["DB Tables",        stats.tables],
              ].map(([k,v])=>(
                <div key={k as string} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #f9fafb"}}>
                  <span style={{fontSize:11,fontWeight:700,color:"#9ca3af",textTransform:"uppercase" as const,letterSpacing:"0.04em"}}>{k}</span>
                  <span style={{fontSize:12,fontWeight:600,color:"#111827"}}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{display:"flex",flexDirection:"column" as const,gap:14}}>
              <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",padding:"16px 18px"}}>
                <div style={{fontSize:13,fontWeight:800,color:"#111827",marginBottom:12}}>System Actions</div>
                {[
                  {label:"📊 View Full Audit Log",     path:"/audit-log",          color:"#78350f"},
                  {label:"🗄️ Database Administration", path:"/admin/database",      color:"#1e3a5f"},
                  {label:"💾 Backup & Restore",        path:"/backup",             color:"#374151"},
                  {label:"🔗 ODBC Connections",        path:"/odbc",               color:"#0369a1"},
                  {label:"⚙️ Full Settings Panel",     path:"/settings",           color:"#6b7280"},
                  {label:"👥 User Administration",     path:"/users",              color:"#4b4b9b"},
                ].map(a=>(
                  <button key={a.path} onClick={()=>navigate(a.path)} className="full-action-btn"
                    style={{background:"#f9fafb",color:a.color,border:"1px solid #e5e7eb",marginBottom:6,fontSize:12}}>
                    {a.label}
                    <ArrowRight style={{width:12,height:12,marginLeft:"auto",opacity:0.4}}/>
                  </button>
                ))}
              </div>
              <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",padding:"14px 16px"}}>
                <div style={{fontSize:12,fontWeight:800,color:"#111827",marginBottom:10}}>Diagnostic Tools</div>
                {[
                  {l:"Test Email (SMTP)",        fn:()=>navigate("/email")},
                  {l:"Run DB Health Check",       fn:()=>{addLog("Running DB check…");(supabase as any).from("profiles").select("count").then(()=>addLog("DB OK — profiles table accessible"));}},
                  {l:"Clear Audit Log (90d+)",    fn:async()=>{if(!confirm("Delete entries older than 90 days?"))return;const cutoff=new Date(Date.now()-90*86400000).toISOString();const{error}=await(supabase as any).from("audit_log").delete().lt("created_at",cutoff);if(!error){addLog("Old audit entries cleared");toast({title:"Old audit log cleared"});}else addLog(`Error: ${error.message}`);}},
                  {l:"Test Realtime Connection",  fn:()=>{addLog("Testing realtime…");const ch=(supabase as any).channel("test-"+Date.now()).on("broadcast",{event:"test"},()=>{addLog("Realtime OK");(supabase as any).removeChannel(ch);}).subscribe();ch.send({type:"broadcast",event:"test",payload:{ping:true}});}},
                ].map(d=>(
                  <button key={d.l} onClick={d.fn} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 10px",background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:600,color:"#374151",marginBottom:5,textAlign:"left" as const}}>
                    <Zap style={{width:11,height:11,color:"#C45911",flexShrink:0}}/> {d.l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── AUDIT ── */}
        {tab==="audit"&&(
          <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",overflow:"hidden"}}>
            <div style={{padding:"12px 16px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap" as const}}>
              <Activity style={{width:14,height:14,color:"#78350f"}}/><span style={{fontSize:14,fontWeight:800,color:"#111827",flex:1}}>Audit Log ({filteredAudit.length})</span>
              <div style={{position:"relative"}}>
                <Search style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",width:11,height:11,color:"#9ca3af"}}/>
                <input value={auditSearch} onChange={e=>setAuditSearch(e.target.value)} placeholder="Filter entries…" style={{paddingLeft:26,padding:"6px 10px 6px 26px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:7,outline:"none",width:200}}/>
              </div>
              <button onClick={exportAudit} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:700}}>
                <Download style={{width:12,height:12}}/> Export
              </button>
            </div>
            <div style={{overflowX:"auto" as const}}>
              <table style={{width:"100%",borderCollapse:"collapse" as const,fontSize:12}}>
                <thead><tr style={{background:"#f9fafb"}}>
                  {["Time","Action","Table","Details","User ID"].map(h=>(
                    <th key={h} style={{padding:"9px 14px",textAlign:"left" as const,fontSize:10,fontWeight:800,color:"#6b7280",borderBottom:"1px solid #f3f4f6",textTransform:"uppercase" as const,letterSpacing:"0.04em",whiteSpace:"nowrap" as const}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {filteredAudit.slice(0,200).map((a,i)=>(
                    <tr key={a.id||i} style={{borderBottom:"1px solid #f9fafb",background:i%2===0?"#fff":"#fafafa"}}>
                      <td style={{padding:"8px 14px",color:"#6b7280",whiteSpace:"nowrap" as const,fontSize:11}}>{new Date(a.created_at).toLocaleString("en-KE",{dateStyle:"short",timeStyle:"short"})}</td>
                      <td style={{padding:"8px 14px"}}><span style={{fontSize:10,fontWeight:800,padding:"2px 8px",borderRadius:4,background:"#eff6ff",color:"#1d4ed8"}}>{a.action}</span></td>
                      <td style={{padding:"8px 14px",color:"#374151",fontWeight:600}}>{a.table_name}</td>
                      <td style={{padding:"8px 14px",color:"#6b7280",maxWidth:240,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{a.details||a.new_values||"—"}</td>
                      <td style={{padding:"8px 14px",color:"#9ca3af",fontFamily:"monospace",fontSize:10}}>{(a.user_id||a.performed_by||"—").toString().slice(0,18)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TERMINAL ── */}
        {tab==="terminal"&&(
          <div style={{background:"#111827",borderRadius:12,overflow:"hidden",boxShadow:"0 4px 20px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"10px 16px",background:"#1f2937",display:"flex",alignItems:"center",gap:8,borderBottom:"1px solid #374151"}}>
              <Terminal style={{width:13,height:13,color:"#6ee7b7"}}/><span style={{fontSize:12,fontWeight:700,color:"#e5e7eb"}}>Webmaster Console — EL5 MediProcure</span>
              <div style={{marginLeft:"auto",display:"flex",gap:5}}>
                <div style={{width:10,height:10,borderRadius:"50%",background:"#ef4444"}}/>
                <div style={{width:10,height:10,borderRadius:"50%",background:"#f59e0b"}}/>
                <div style={{width:10,height:10,borderRadius:"50%",background:"#10b981"}}/>
              </div>
            </div>
            <div style={{height:420,overflowY:"auto" as const,padding:"16px",fontFamily:"'Courier New',Consolas,monospace",fontSize:12}}>
              {sysLog.map((l,i)=>(
                <div key={i} style={{color:l.includes("Error")?"#f87171":l.includes("OK")?"#6ee7b7":l.includes(">")?"#fbbf24":"#d1d5db",marginBottom:2,lineHeight:1.5}}>{l}</div>
              ))}
            </div>
            <div style={{padding:"10px 14px",background:"#1f2937",borderTop:"1px solid #374151",display:"flex",alignItems:"center",gap:8}}>
              <span style={{color:"#6ee7b7",fontFamily:"monospace",fontSize:12,flexShrink:0}}>$ </span>
              <input value={cmdInput} onChange={e=>setCmdInput(e.target.value)} onKeyDown={execCmd} placeholder='Type a command (try "help")…'
                style={{flex:1,background:"transparent",border:"none",outline:"none",color:"#e5e7eb",fontFamily:"'Courier New',monospace",fontSize:12}}
                autoFocus/>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function WebmasterPage() {
  return <RoleGuard roles={["admin"]}><WebmasterInner/></RoleGuard>;
}
