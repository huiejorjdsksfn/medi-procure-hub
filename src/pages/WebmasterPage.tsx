import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  Monitor, RefreshCw, Users, Shield, Activity, Server, Database,
  AlertTriangle, CheckCircle, Clock, Globe, Wifi, Cpu, HardDrive,
  BarChart3, Settings, Download, Trash2, Eye, Lock, Unlock, Mail,
  Play, Square, Terminal, Zap, Package, FileText, Archive,
  TrendingUp, Key, Code, Bell, Save, Edit3, Plus, X,
  ChevronRight, ExternalLink, LayoutDashboard, Layers,
  BookOpen, ShoppingCart, DollarSign, Search
} from "lucide-react";
import RoleGuard from "@/components/RoleGuard";
import * as XLSX from "xlsx";

const TABS = [
  {id:"overview",  label:"Overview",    icon:LayoutDashboard, color:"#0078d4"},
  {id:"users",     label:"Users",       icon:Users,           color:"#5b21b6"},
  {id:"system",    label:"System",      icon:Server,          color:"#374151"},
  {id:"modules",   label:"Modules",     icon:Layers,          color:"#059669"},
  {id:"audit",     label:"Audit Log",   icon:Activity,        color:"#C45911"},
  {id:"theme",     label:"Theme",       icon:Monitor,         color:"#8b5cf6"},
  {id:"terminal",  label:"Console",     icon:Terminal,        color:"#111827"},
];

const ALL_MODULES = [
  {id:"procurement",   label:"Procurement",    path:"/requisitions",        icon:ShoppingCart, color:"#C45911"},
  {id:"pos",           label:"Purchase Orders",path:"/purchase-orders",     icon:ShoppingCart, color:"#0078d4"},
  {id:"grn",           label:"Goods Received", path:"/goods-received",      icon:Package,      color:"#107c10"},
  {id:"suppliers",     label:"Suppliers",      path:"/suppliers",           icon:Layers,       color:"#374151"},
  {id:"tenders",       label:"Tenders",        path:"/tenders",             icon:Globe,        color:"#1F6090"},
  {id:"contracts",     label:"Contracts",      path:"/contracts",           icon:FileText,     color:"#0369a1"},
  {id:"vouchers",      label:"Vouchers",       path:"/vouchers",            icon:DollarSign,   color:"#5C2D91"},
  {id:"financials",    label:"Financials",     path:"/financials/dashboard",icon:TrendingUp,   color:"#0369a1"},
  {id:"inventory",     label:"Inventory",      path:"/items",               icon:Package,      color:"#107c10"},
  {id:"quality",       label:"Quality Control",path:"/quality/dashboard",   icon:Shield,       color:"#059669"},
  {id:"documents",     label:"Documents",      path:"/documents",           icon:FileText,     color:"#92400e"},
  {id:"scanner",       label:"Scanner",        path:"/scanner",             icon:Search,       color:"#0e7490"},
  {id:"reports",       label:"Reports",        path:"/reports",             icon:BarChart3,    color:"#9333ea"},
  {id:"email",         label:"Email / Inbox",  path:"/email",               icon:Mail,         color:"#c0185a"},
  {id:"users_mgmt",    label:"User Mgmt",      path:"/users",               icon:Users,        color:"#4b4b9b"},
  {id:"settings",      label:"Settings",       path:"/settings",            icon:Settings,     color:"#6b7280"},
  {id:"admin_db",      label:"Database Admin", path:"/admin/database",      icon:Database,     color:"#1e3a5f"},
  {id:"audit_log",     label:"Audit Log",      path:"/audit-log",           icon:Activity,     color:"#78350f"},
  {id:"backup",        label:"Backup",         path:"/backup",              icon:Archive,      color:"#374151"},
  {id:"odbc",          label:"ODBC / Links",   path:"/odbc",                icon:Globe,        color:"#0369a1"},
  {id:"admin_panel",   label:"Admin Panel",    path:"/admin/panel",         icon:LayoutDashboard,color:"#0a2558"},
  {id:"procurement_plan",label:"Proc. Planning",path:"/procurement-planning",icon:BookOpen,   color:"#065f46"},
];

const STATUS_ITEMS = [
  {label:"Supabase DB",    key:"db",  nominal:true},
  {label:"Authentication", key:"auth",nominal:true},
  {label:"Realtime",       key:"rt",  nominal:true},
  {label:"Storage",        key:"st",  nominal:true},
  {label:"Edge Functions", key:"ef",  nominal:true},
  {label:"REST API",       key:"api", nominal:true},
];

function Badge({color,bg,children}:{color:string;bg:string;children:React.ReactNode}) {
  return <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:bg,color,whiteSpace:"nowrap" as const}}>{children}</span>;
}

function StatCard({label,value,icon:Icon,color,sub}:{label:string;value:any;icon:any;color:string;sub?:string}) {
  return (
    <div style={{background:"#fff",borderRadius:10,padding:"16px",border:"1px solid #e5e7eb",boxShadow:"0 2px 6px rgba(0,0,0,0.05)"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
        <div style={{width:36,height:36,borderRadius:8,background:`${color}14`,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Icon style={{width:16,height:16,color}}/>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:11,fontWeight:700,color:"#9ca3af",textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>{label}</div>
          {sub&&<div style={{fontSize:10,color:"#d1d5db"}}>{sub}</div>}
        </div>
      </div>
      <div style={{fontSize:28,fontWeight:900,color:"#111827"}}>{value??<span style={{fontSize:16,color:"#d1d5db"}}>—</span>}</div>
    </div>
  );
}

function WebmasterInner() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [tab,     setTab]    = useState("overview");
  const [users,   setUsers]  = useState<any[]>([]);
  const [audit,   setAudit]  = useState<any[]>([]);
  const [settings,setSettings] = useState<any>({});
  const [stats,   setStats]  = useState({totalUsers:0,activeUsers:0,totalAudit:0,tables:32,totalDocs:0,totalReqs:0});
  const [loading, setLoading] = useState(true);
  const [sysLog,  setSysLog] = useState<string[]>([]);
  const [modStates, setModStates] = useState<Record<string,boolean>>({});
  const [cmdInput, setCmdInput] = useState("");
  const [editUser, setEditUser] = useState<any|null>(null);
  const [auditSearch, setAuditSearch] = useState("");
  const logRef = useRef<HTMLDivElement>(null);

  // Theme state
  const [primaryColor,   setPrimaryColor]   = useState("#1a3a6b");
  const [accentColor,    setAccentColor]     = useState("#C45911");
  const [navPosition,    setNavPosition]     = useState("top");
  const [density,        setDensity]         = useState("normal");
  const [sidebarWidth,   setSidebarWidth]    = useState(240);
  const [btnRadius,      setBtnRadius]       = useState(8);
  const [tableStyle,     setTableStyle]      = useState("stripe");
  const [fontScale,      setFontScale]       = useState(1.0);
  const [themePreset,    setThemePreset]     = useState("navy");

  const addLog = (msg:string) => {
    const t = new Date().toLocaleTimeString("en-KE");
    setSysLog(p=>[`[${t}] ${msg}`,...p.slice(0,99)]);
  };

  const load = useCallback(async()=>{
    setLoading(true);
    const [uRes,aRes,sRes,dRes,rRes] = await Promise.all([
      (supabase as any).from("profiles").select("*,user_roles(role)").order("created_at",{ascending:false}),
      (supabase as any).from("audit_log").select("*").order("created_at",{ascending:false}).limit(200),
      (supabase as any).from("system_settings").select("key,value").limit(200),
      (supabase as any).from("documents").select("id",{count:"exact",head:true}),
      (supabase as any).from("requisitions").select("id",{count:"exact",head:true}),
    ]);
    const u=uRes.data||[]; const a=aRes.data||[];
    const m:any={}; (sRes.data||[]).forEach((x:any)=>{ if(x.key) m[x.key]=x.value; });
    setUsers(u); setAudit(a); setSettings(m);
    setStats({totalUsers:u.length, activeUsers:u.filter((x:any)=>x.is_active!==false).length, totalAudit:a.length, tables:32, totalDocs:dRes.count||0, totalReqs:rRes.count||0});
    if(m.primary_color) setPrimaryColor(m.primary_color);
    if(m.accent_color)  setAccentColor(m.accent_color);
    // Load module states
    const ms:Record<string,boolean>={};
    ALL_MODULES.forEach(mod=>{ ms[mod.id]=m[`enable_${mod.id}`]!=="false"; });
    setModStates(ms);
    setLoading(false);
  },[]);

  useEffect(()=>{ load(); },[load]);

  const saveTheme = async() => {
    const pairs = [["primary_color",primaryColor],["accent_color",accentColor],["ui_density",density],["font_scale",String(fontScale)]];
    for(const [k,v] of pairs) {
      const{data:ex}=await (supabase as any).from("system_settings").select("id").eq("key",k).maybeSingle();
      if(ex?.id) await (supabase as any).from("system_settings").update({value:v}).eq("key",k);
      else       await (supabase as any).from("system_settings").insert({key:k,value:v,category:"appearance",label:k});
    }
    toast({title:"Theme saved ✓"});
    addLog(`Theme updated: ${primaryColor} | ${accentColor}`);
  };

  const toggleModule = async(modId:string, val:boolean) => {
    const k=`enable_${modId}`;
    const{data:ex}=await (supabase as any).from("system_settings").select("id").eq("key",k).maybeSingle();
    if(ex?.id) await (supabase as any).from("system_settings").update({value:String(val)}).eq("key",k);
    else       await (supabase as any).from("system_settings").insert({key:k,value:String(val),category:"modules",label:k});
    setModStates(p=>({...p,[modId]:val}));
    addLog(`Module ${modId} ${val?"enabled":"disabled"}`);
    toast({title:`Module ${val?"enabled":"disabled"} ✓`});
  };

  const toggleUserActive = async(u:any) => {
    await (supabase as any).from("profiles").update({is_active:!u.is_active}).eq("id",u.id);
    addLog(`User ${u.full_name||u.email} ${!u.is_active?"activated":"deactivated"}`);
    toast({title:`User ${!u.is_active?"activated":"deactivated"} ✓`});
    load();
  };

  const updateUserRole = async(uid:string,role:string,name:string) => {
    const{data:ex}=await (supabase as any).from("user_roles").select("id").eq("user_id",uid).maybeSingle();
    if(ex?.id) await (supabase as any).from("user_roles").update({role}).eq("id",ex.id);
    else       await (supabase as any).from("user_roles").insert({user_id:uid,role});
    addLog(`Role updated: ${name} → ${role}`);
    toast({title:"Role updated ✓"}); load();
  };

  const runCmd = (cmd:string) => {
    const c = cmd.trim().toLowerCase();
    addLog(`> ${cmd}`);
    if(c==="clear") { setSysLog([]); setCmdInput(""); return; }
    if(c==="reload") { load(); addLog("Reloading data…"); setCmdInput(""); return; }
    if(c==="status") { addLog(`Users: ${stats.totalUsers} | Audit: ${stats.totalAudit} | Tables: ${stats.tables}`); }
    else if(c.startsWith("help")) { addLog("Commands: clear, reload, status, users, modules, version"); }
    else if(c==="users") { addLog(`Total: ${stats.totalUsers} | Active: ${stats.activeUsers} | Inactive: ${stats.totalUsers-stats.activeUsers}`); }
    else if(c==="modules") { addLog(`${ALL_MODULES.length} modules registered | ${Object.values(modStates).filter(Boolean).length} enabled`); }
    else if(c==="version") { addLog("EL5 MediProcure v3.0 | Supabase + React + TypeScript"); }
    else { addLog(`Unknown command: "${cmd}" — type 'help' for commands`); }
    setCmdInput("");
    setTimeout(()=>{ if(logRef.current) logRef.current.scrollTop=0; },50);
  };

  const exportAudit = () => {
    const ws = XLSX.utils.json_to_sheet(audit.map(a=>({Date:new Date(a.created_at).toLocaleString("en-KE"),Action:a.action,Table:a.table_name,Details:a.details||"",UserID:a.user_id})));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Audit Log");
    XLSX.writeFile(wb,"audit_log.xlsx");
    addLog("Audit log exported to XLSX");
  };

  const clearAuditOld = async() => {
    if(!confirm("Delete audit log entries older than 90 days?")) return;
    const cutoff = new Date(Date.now()-90*24*60*60*1000).toISOString();
    await (supabase as any).from("audit_log").delete().lt("created_at",cutoff);
    addLog("Old audit entries cleared (>90 days)");
    toast({title:"Old audit entries cleared ✓"}); load();
  };

  const filteredAudit = auditSearch
    ? audit.filter(a=>[a.action,a.table_name,a.user_id].some(v=>(v||"").toLowerCase().includes(auditSearch.toLowerCase())))
    : audit;

  const PRESETS = [
    {id:"navy",    name:"Navy Blue",    primary:"#1a3a6b", accent:"#C45911"},
    {id:"forest",  name:"Forest Green", primary:"#166534", accent:"#b45309"},
    {id:"crimson", name:"Crimson",      primary:"#991b1b", accent:"#f59e0b"},
    {id:"slate",   name:"Slate Grey",   primary:"#334155", accent:"#06b6d4"},
    {id:"purple",  name:"Purple",       primary:"#5b21b6", accent:"#f59e0b"},
    {id:"teal",    name:"Teal",         primary:"#0f766e", accent:"#f97316"},
  ];

  return (
    <div style={{minHeight:"100%",background:"#f0f2f5",fontSize:14,fontFamily:"'Inter','Segoe UI',sans-serif"}}>

      {/* Top bar */}
      <div style={{background:"linear-gradient(135deg,#0a2558,#1a3a6b)",padding:"14px 20px",display:"flex",alignItems:"center",gap:12}}>
        <Monitor style={{width:18,height:18,color:"#fff"}}/>
        <div style={{flex:1}}>
          <div style={{fontSize:16,fontWeight:800,color:"#fff"}}>Webmaster Control Panel</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>Full system administration, theming, modules and monitoring</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <div style={{display:"flex",alignItems:"center",gap:5,padding:"5px 12px",background:"rgba(16,185,129,0.2)",border:"1px solid rgba(16,185,129,0.35)",borderRadius:20}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:"#10b981"}} className="animate-pulse"/>
            <span style={{fontSize:11,fontWeight:700,color:"#6ee7b7"}}>ONLINE</span>
          </div>
          <button onClick={load} style={{padding:"7px 10px",background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:7,cursor:"pointer",color:"rgba(255,255,255,0.7)",lineHeight:0}}>
            <RefreshCw style={{width:13,height:13}} className={loading?"animate-spin":""}/>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",background:"#fff",borderBottom:"1px solid #e5e7eb",overflowX:"auto"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{display:"flex",alignItems:"center",gap:7,padding:"12px 20px",border:"none",background:"transparent",cursor:"pointer",fontSize:13,fontWeight:tab===t.id?700:500,color:tab===t.id?t.color:"#6b7280",borderBottom:tab===t.id?`2px solid ${t.color}`:"2px solid transparent",transition:"all 0.12s",whiteSpace:"nowrap" as const,flexShrink:0}}>
            <t.icon style={{width:14,height:14}}/>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{padding:20}}>

        {/* ── OVERVIEW ── */}
        {tab==="overview"&&(
          <>
            {/* Stats grid */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:14,marginBottom:24}}>
              <StatCard label="Total Users"    value={stats.totalUsers}    icon={Users}       color="#0078d4"/>
              <StatCard label="Active Users"   value={stats.activeUsers}   icon={CheckCircle} color="#107c10"/>
              <StatCard label="Audit Records"  value={stats.totalAudit}    icon={Activity}    color="#C45911"/>
              <StatCard label="DB Tables"      value={stats.tables}        icon={Database}    color="#5b21b6"/>
              <StatCard label="Requisitions"   value={stats.totalReqs}     icon={ShoppingCart}color="#0369a1"/>
              <StatCard label="Documents"      value={stats.totalDocs}     icon={FileText}    color="#92400e"/>
            </div>

            {/* Two column: modules grid + system status */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:20}}>

              {/* Modules quick access */}
              <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",overflow:"hidden"}}>
                <div style={{padding:"12px 16px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:8}}>
                  <Layers style={{width:14,height:14,color:"#374151"}}/>
                  <span style={{fontSize:14,fontWeight:700,color:"#111827"}}>All System Modules</span>
                  <span style={{fontSize:11,color:"#9ca3af",marginLeft:"auto"}}>{ALL_MODULES.length} modules</span>
                </div>
                <div style={{padding:"12px 16px",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:8}}>
                  {ALL_MODULES.map(mod=>(
                    <button key={mod.id} onClick={()=>navigate(mod.path)}
                      style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:`${mod.color}08`,border:`1px solid ${mod.color}25`,borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,color:"#374151",transition:"all 0.12s",textAlign:"left" as const}}
                      onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=`${mod.color}18`;(e.currentTarget as HTMLElement).style.borderColor=`${mod.color}50`;}}
                      onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background=`${mod.color}08`;(e.currentTarget as HTMLElement).style.borderColor=`${mod.color}25`;}}>
                      <mod.icon style={{width:13,height:13,color:mod.color,flexShrink:0}}/>
                      <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{mod.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* System status */}
              <div style={{display:"flex",flexDirection:"column" as const,gap:14}}>
                <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",overflow:"hidden"}}>
                  <div style={{padding:"12px 16px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:8}}>
                    <Server style={{width:14,height:14,color:"#374151"}}/>
                    <span style={{fontSize:14,fontWeight:700,color:"#111827"}}>System Status</span>
                  </div>
                  <div style={{padding:"8px 16px"}}>
                    {STATUS_ITEMS.map(si=>(
                      <div key={si.key} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 0",borderBottom:"1px solid #f9fafb"}}>
                        <span style={{fontSize:13,color:"#374151",fontWeight:500}}>{si.label}</span>
                        <div style={{display:"flex",alignItems:"center",gap:5}}>
                          <div style={{width:6,height:6,borderRadius:"50%",background:"#10b981"}}/>
                          <span style={{fontSize:11,fontWeight:700,color:"#10b981"}}>Operational</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick actions */}
                <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",padding:"12px 16px"}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#111827",marginBottom:10}}>Quick Actions</div>
                  {[
                    {label:"Database Admin",   icon:Database, color:"#1e3a5f", path:"/admin/database"},
                    {label:"View Audit Log",   icon:Activity, color:"#78350f", path:"/audit-log"},
                    {label:"Backup Manager",   icon:Archive,  color:"#374151", path:"/backup"},
                    {label:"ODBC Connections", icon:Globe,    color:"#0369a1", path:"/odbc"},
                    {label:"System Settings",  icon:Settings, color:"#6b7280", path:"/settings"},
                    {label:"User Management",  icon:Users,    color:"#4b4b9b", path:"/users"},
                  ].map(a=>(
                    <button key={a.path} onClick={()=>navigate(a.path)}
                      style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"9px 10px",border:"none",background:"transparent",cursor:"pointer",fontSize:13,fontWeight:600,color:"#374151",borderRadius:7,transition:"background 0.1s",marginBottom:2}}
                      onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f3f4f6"}
                      onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
                      <a.icon style={{width:14,height:14,color:a.color,flexShrink:0}}/> {a.label}
                      <ChevronRight style={{width:11,height:11,color:"#d1d5db",marginLeft:"auto"}}/>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── USERS ── */}
        {tab==="users"&&(
          <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",overflow:"hidden"}}>
            <div style={{padding:"12px 18px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap" as const}}>
              <Users style={{width:14,height:14,color:"#5b21b6"}}/>
              <span style={{fontSize:14,fontWeight:700,color:"#111827",flex:1}}>All Users ({users.length})</span>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>{ const ws=XLSX.utils.json_to_sheet(users.map(u=>({Name:u.full_name,Email:u.email,Dept:u.department,Role:u.user_roles?.[0]?.role||"—",Active:u.is_active!==false?"Yes":"No",Joined:u.created_at?.slice(0,10)}))); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Users"); XLSX.writeFile(wb,"users.xlsx"); addLog("Users exported"); }}
                  style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:700,color:"#374151"}}>
                  <Download style={{width:12,height:12}}/> Export
                </button>
              </div>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr style={{background:"#f9fafb"}}>
                  {["Name","Email","Department","Phone","Role","Joined","Status","Actions"].map(h=>(
                    <th key={h} style={{padding:"10px 14px",textAlign:"left" as const,fontSize:11,fontWeight:700,color:"#6b7280",borderBottom:"1px solid #f3f4f6",textTransform:"uppercase" as const,letterSpacing:"0.04em",whiteSpace:"nowrap" as const}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {users.map((u,i)=>(
                    <tr key={u.id} style={{borderBottom:"1px solid #f9fafb",background:i%2===0?"#fff":"#fafafa"}}>
                      <td style={{padding:"10px 14px",fontWeight:600,color:"#111827",whiteSpace:"nowrap" as const}}>{u.full_name||"—"}</td>
                      <td style={{padding:"10px 14px",color:"#6b7280",fontSize:12}}>{u.email}</td>
                      <td style={{padding:"10px 14px",color:"#6b7280",fontSize:12}}>{u.department||"—"}</td>
                      <td style={{padding:"10px 14px",color:"#6b7280",fontSize:12}}>{u.phone||"—"}</td>
                      <td style={{padding:"10px 14px"}}>
                        <select value={u.user_roles?.[0]?.role||"requisitioner"} onChange={e=>updateUserRole(u.id,e.target.value,u.full_name||u.email)}
                          style={{padding:"5px 8px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:6,outline:"none",fontFamily:"inherit",cursor:"pointer",fontWeight:600,color:"#1a3a6b",background:"#eff6ff"}}>
                          {["admin","procurement_manager","procurement_officer","finance_officer","inventory_manager","warehouse_officer","requisitioner","quality_officer","viewer"].map(r=>(
                            <option key={r} value={r}>{r.replace(/_/g," ")}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{padding:"10px 14px",color:"#9ca3af",fontSize:11,whiteSpace:"nowrap" as const}}>{u.created_at?.slice(0,10)||"—"}</td>
                      <td style={{padding:"10px 14px"}}>
                        <span style={{fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:20,background:u.is_active!==false?"#dcfce7":"#fee2e2",color:u.is_active!==false?"#15803d":"#dc2626"}}>
                          {u.is_active!==false?"Active":"Inactive"}
                        </span>
                      </td>
                      <td style={{padding:"10px 14px"}}>
                        <div style={{display:"flex",gap:5}}>
                          <button onClick={()=>toggleUserActive(u)} title={u.is_active!==false?"Deactivate":"Activate"}
                            style={{padding:"5px 10px",fontSize:11,fontWeight:700,borderRadius:6,border:"1px solid #e5e7eb",cursor:"pointer",background:u.is_active!==false?"#fee2e2":"#dcfce7",color:u.is_active!==false?"#dc2626":"#15803d",whiteSpace:"nowrap" as const}}>
                            {u.is_active!==false?<Lock style={{width:11,height:11}}/>:<Unlock style={{width:11,height:11}}/>}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── SYSTEM ── */}
        {tab==="system"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            {/* Settings overview */}
            <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",overflow:"hidden"}}>
              <div style={{padding:"12px 16px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:8}}>
                <Settings style={{width:14,height:14,color:"#374151"}}/>
                <span style={{fontSize:14,fontWeight:700,color:"#111827"}}>Current Config</span>
                <button onClick={()=>navigate("/settings")} style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:5,padding:"5px 10px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:700,color:"#374151"}}>
                  <Edit3 style={{width:10,height:10}}/> Edit in Settings
                </button>
              </div>
              <div style={{padding:"8px 0"}}>
                {[
                  {k:"hospital_name",l:"Hospital"},
                  {k:"system_name",l:"System Name"},
                  {k:"time_zone",l:"Time Zone"},
                  {k:"currency",l:"Currency"},
                  {k:"date_format",l:"Date Format"},
                  {k:"fiscal_year",l:"Fiscal Year"},
                  {k:"vat_rate",l:"VAT Rate"},
                  {k:"primary_color",l:"Primary Color"},
                  {k:"smtp_host",l:"SMTP Host"},
                  {k:"backup_schedule",l:"Backup Schedule"},
                ].map(f=>(
                  <div key={f.k} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 16px",borderBottom:"1px solid #f9fafb"}}>
                    <span style={{fontSize:12,color:"#6b7280",fontWeight:600}}>{f.l}</span>
                    <span style={{fontSize:12,color:"#111827",fontWeight:600,fontFamily:f.k.includes("color")?"monospace":"inherit"}}>{settings[f.k]||"—"}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* System operations */}
            <div style={{display:"flex",flexDirection:"column" as const,gap:16}}>
              <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",padding:"16px"}}>
                <div style={{fontSize:14,fontWeight:700,color:"#111827",marginBottom:12}}>System Operations</div>
                {[
                  {label:"Open Settings",    icon:Settings, color:"#6b7280", path:"/settings",          desc:"Full system configuration"},
                  {label:"Database Admin",   icon:Database, color:"#1e3a5f", path:"/admin/database",    desc:"SQL editor, table browser"},
                  {label:"Backup & Restore", icon:Archive,  color:"#374151", path:"/backup",            desc:"Manage database backups"},
                  {label:"Audit Log",        icon:Activity, color:"#78350f", path:"/audit-log",         desc:"All user activity"},
                  {label:"ODBC Connections", icon:Globe,    color:"#0369a1", path:"/odbc",              desc:"External data sources"},
                  {label:"Admin Panel",      icon:LayoutDashboard,color:"#0a2558",path:"/admin/panel",  desc:"Comprehensive admin"},
                ].map(a=>(
                  <button key={a.path} onClick={()=>navigate(a.path)}
                    style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px 12px",border:"1px solid #e5e7eb",background:"#f9fafb",cursor:"pointer",fontSize:13,fontWeight:600,color:"#374151",borderRadius:8,transition:"all 0.1s",marginBottom:8,textAlign:"left" as const}}
                    onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="#eff6ff";(e.currentTarget as HTMLElement).style.borderColor="#bfdbfe";}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="#f9fafb";(e.currentTarget as HTMLElement).style.borderColor="#e5e7eb";}}>
                    <div style={{width:32,height:32,borderRadius:8,background:`${a.color}14`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <a.icon style={{width:14,height:14,color:a.color}}/>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700}}>{a.label}</div>
                      <div style={{fontSize:11,color:"#9ca3af"}}>{a.desc}</div>
                    </div>
                    <ChevronRight style={{width:12,height:12,color:"#d1d5db"}}/>
                  </button>
                ))}
              </div>

              <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",padding:"16px"}}>
                <div style={{fontSize:14,fontWeight:700,color:"#111827",marginBottom:10}}>System Stats</div>
                {[{l:"DB Version",v:"PostgreSQL 15"},{l:"Framework",v:"React + Vite"},{l:"Backend",v:"Supabase"},{l:"Auth",v:"Supabase Auth"},{l:"Realtime",v:"Supabase Realtime"},{l:"Storage",v:"Supabase Storage"}].map(x=>(
                  <div key={x.l} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #f9fafb",fontSize:13}}>
                    <span style={{color:"#6b7280",fontWeight:500}}>{x.l}</span>
                    <span style={{color:"#111827",fontWeight:600,fontFamily:"monospace",fontSize:12}}>{x.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── MODULES ── */}
        {tab==="modules"&&(
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
              <div style={{fontSize:14,fontWeight:700,color:"#111827"}}>Module Control</div>
              <span style={{fontSize:12,color:"#9ca3af"}}>— Enable or disable system modules globally</span>
              <span style={{marginLeft:"auto",fontSize:12,color:"#059669",fontWeight:700}}>{Object.values(modStates).filter(Boolean).length}/{ALL_MODULES.length} enabled</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
              {ALL_MODULES.map(mod=>(
                <div key={mod.id} style={{background:"#fff",borderRadius:10,border:`1px solid ${modStates[mod.id]?"#bbf7d0":"#e5e7eb"}`,padding:"14px 16px",display:"flex",alignItems:"center",gap:12,transition:"border-color 0.2s"}}>
                  <div style={{width:38,height:38,borderRadius:9,background:`${mod.color}14`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <mod.icon style={{width:16,height:16,color:mod.color}}/>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,color:"#111827"}}>{mod.label}</div>
                    <button onClick={()=>navigate(mod.path)} style={{fontSize:11,color:"#9ca3af",background:"transparent",border:"none",cursor:"pointer",padding:0,fontFamily:"inherit"}}>
                      {mod.path} ↗
                    </button>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:10,fontWeight:700,color:modStates[mod.id]?"#15803d":"#9ca3af"}}>{modStates[mod.id]?"ON":"OFF"}</span>
                    <button onClick={()=>toggleModule(mod.id,!modStates[mod.id])}
                      style={{padding:0,border:"none",background:"transparent",cursor:"pointer",lineHeight:0}}>
                      <div style={{width:44,height:24,borderRadius:12,background:modStates[mod.id]?"#059669":"#d1d5db",display:"flex",alignItems:"center",padding:"2px",transition:"background 0.2s"}}>
                        <div style={{width:20,height:20,borderRadius:"50%",background:"#fff",boxShadow:"0 1px 4px rgba(0,0,0,0.2)",transition:"transform 0.2s",transform:modStates[mod.id]?"translateX(20px)":"translateX(0)"}}/>
                      </div>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── AUDIT LOG ── */}
        {tab==="audit"&&(
          <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",overflow:"hidden"}}>
            <div style={{padding:"12px 18px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap" as const}}>
              <Activity style={{width:14,height:14,color:"#C45911"}}/>
              <span style={{fontSize:14,fontWeight:700,color:"#111827",flex:1}}>Audit Log ({filteredAudit.length})</span>
              <div style={{position:"relative"}}>
                <Search style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",width:12,height:12,color:"#9ca3af"}}/>
                <input value={auditSearch} onChange={e=>setAuditSearch(e.target.value)} placeholder="Search…"
                  style={{paddingLeft:28,padding:"6px 10px 6px 28px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:6,outline:"none",width:200}}/>
              </div>
              <div style={{display:"flex",gap:6}}>
                <button onClick={exportAudit} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:700,color:"#374151"}}>
                  <Download style={{width:12,height:12}}/> Export XLSX
                </button>
                <button onClick={clearAuditOld} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",background:"#fee2e2",border:"1px solid #fecaca",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:700,color:"#dc2626"}}>
                  <Trash2 style={{width:12,height:12}}/> Clear Old
                </button>
              </div>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr style={{background:"#f9fafb"}}>
                  {["Timestamp","Action","Table","User","Details"].map(h=>(
                    <th key={h} style={{padding:"10px 14px",textAlign:"left" as const,fontSize:11,fontWeight:700,color:"#6b7280",borderBottom:"1px solid #f3f4f6",textTransform:"uppercase" as const,letterSpacing:"0.04em",whiteSpace:"nowrap" as const}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {filteredAudit.slice(0,100).map((a,i)=>(
                    <tr key={a.id} style={{borderBottom:"1px solid #f9fafb",background:i%2===0?"#fff":"#fafafa"}}>
                      <td style={{padding:"9px 14px",color:"#6b7280",fontSize:11,whiteSpace:"nowrap" as const}}>{new Date(a.created_at).toLocaleString("en-KE",{dateStyle:"short",timeStyle:"short"})}</td>
                      <td style={{padding:"9px 14px"}}><span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:4,background:"#eff6ff",color:"#1d4ed8"}}>{a.action||"—"}</span></td>
                      <td style={{padding:"9px 14px",color:"#374151",fontSize:12,fontFamily:"monospace"}}>{a.table_name||"—"}</td>
                      <td style={{padding:"9px 14px",color:"#6b7280",fontSize:11,fontFamily:"monospace"}}>{(a.user_id||"—").slice(0,12)}…</td>
                      <td style={{padding:"9px 14px",color:"#9ca3af",fontSize:11,maxWidth:220,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{a.details||"—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredAudit.length>100&&<div style={{padding:"10px 16px",fontSize:12,color:"#9ca3af",textAlign:"center" as const}}>Showing 100 of {filteredAudit.length} — export for full log</div>}
            </div>
          </div>
        )}

        {/* ── THEME ── */}
        {tab==="theme"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:20}}>
            <div style={{display:"flex",flexDirection:"column" as const,gap:16}}>
              {/* Colour presets */}
              <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",padding:"16px"}}>
                <div style={{fontSize:14,fontWeight:800,color:"#111827",marginBottom:12}}>Colour Presets</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                  {PRESETS.map(p=>(
                    <button key={p.id} onClick={()=>{ setPrimaryColor(p.primary); setAccentColor(p.accent); setThemePreset(p.id); }}
                      style={{padding:"12px",borderRadius:9,border:`2px solid ${themePreset===p.id?"#111827":"#e5e7eb"}`,cursor:"pointer",background:"#f9fafb",transition:"border-color 0.15s"}}>
                      <div style={{display:"flex",gap:4,marginBottom:6}}>
                        <div style={{width:20,height:20,borderRadius:4,background:p.primary}}/>
                        <div style={{width:20,height:20,borderRadius:4,background:p.accent}}/>
                      </div>
                      <div style={{fontSize:12,fontWeight:600,color:"#374151"}}>{p.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Colour pickers */}
              <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",padding:"16px"}}>
                <div style={{fontSize:14,fontWeight:800,color:"#111827",marginBottom:12}}>Custom Colours</div>
                {[{l:"Primary Color",v:primaryColor,s:setPrimaryColor},{l:"Accent Color",v:accentColor,s:setAccentColor}].map(f=>(
                  <div key={f.l} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 0",borderBottom:"1px solid #f3f4f6"}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:"#111827"}}>{f.l}</div>
                      <div style={{fontSize:11,color:"#9ca3af",fontFamily:"monospace"}}>{f.v}</div>
                    </div>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <input type="color" value={f.v} onChange={e=>f.s(e.target.value)} style={{width:48,height:36,border:"1px solid #e5e7eb",borderRadius:7,cursor:"pointer",padding:2}}/>
                      <input value={f.v} onChange={e=>f.s(e.target.value)} style={{width:100,padding:"7px 10px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:6,outline:"none",fontFamily:"monospace"}}/>
                    </div>
                  </div>
                ))}
              </div>

              {/* Layout / Density */}
              <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",padding:"16px"}}>
                <div style={{fontSize:14,fontWeight:800,color:"#111827",marginBottom:12}}>Layout & Spacing</div>
                {[{l:"UI Density",v:density,s:setDensity,opts:[{v:"compact",l:"Compact"},{v:"normal",l:"Normal"},{v:"comfortable",l:"Comfortable"}]},{l:"Navigation",v:navPosition,s:setNavPosition,opts:[{v:"top",l:"Top Bar"},{v:"left",l:"Left Sidebar"}]}].map(f=>(
                  <div key={f.l} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid #f3f4f6"}}>
                    <div style={{fontSize:13,fontWeight:600,color:"#111827"}}>{f.l}</div>
                    <select value={f.v} onChange={e=>f.s(e.target.value)} style={{padding:"7px 10px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:6,outline:"none"}}>
                      {f.opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                    </select>
                  </div>
                ))}
                {[{l:"Sidebar Width (px)",v:sidebarWidth,s:setSidebarWidth,min:180,max:360},{l:"Button Radius (px)",v:btnRadius,s:setBtnRadius,min:0,max:20},{l:"Font Scale",v:fontScale,s:setFontScale,min:0.8,max:1.4,step:0.05}].map(f=>(
                  <div key={f.l} style={{padding:"10px 0",borderBottom:"1px solid #f3f4f6"}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                      <span style={{fontSize:13,fontWeight:600,color:"#111827"}}>{f.l}</span>
                      <span style={{fontSize:12,fontFamily:"monospace",color:"#374151",fontWeight:700}}>{f.v}</span>
                    </div>
                    <input type="range" min={f.min} max={f.max} step={(f as any).step||1} value={f.v} onChange={e=>f.s(parseFloat(e.target.value) as any)}
                      style={{width:"100%",accentColor:"#1a3a6b"}}/>
                  </div>
                ))}
              </div>

              <button onClick={saveTheme} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"12px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",color:"#fff",border:"none",borderRadius:9,cursor:"pointer",fontSize:14,fontWeight:800,boxShadow:"0 4px 14px rgba(10,37,88,0.35)"}}>
                <Save style={{width:15,height:15}}/> Save Theme Globally
              </button>
            </div>

            {/* Preview */}
            <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",overflow:"hidden",height:"fit-content"}}>
              <div style={{padding:"10px 14px",borderBottom:"1px solid #f3f4f6",fontSize:13,fontWeight:700,color:"#111827"}}>Live Preview</div>
              <div style={{padding:16}}>
                <div style={{background:primaryColor,borderRadius:8,padding:"12px 16px",marginBottom:12}}>
                  <div style={{fontSize:13,fontWeight:800,color:"#fff"}}>Navigation Bar</div>
                  <div style={{fontSize:10,color:"rgba(255,255,255,0.5)"}}>EL5 MediProcure System</div>
                </div>
                <div style={{display:"flex",gap:6,marginBottom:12}}>
                  <button style={{padding:"7px 14px",background:primaryColor,color:"#fff",border:"none",borderRadius:btnRadius,fontSize:12,fontWeight:700,cursor:"default"}}>Primary</button>
                  <button style={{padding:"7px 14px",background:accentColor,color:"#fff",border:"none",borderRadius:btnRadius,fontSize:12,fontWeight:700,cursor:"default"}}>Accent</button>
                  <button style={{padding:"7px 14px",background:"#f3f4f6",color:"#374151",border:"1px solid #e5e7eb",borderRadius:btnRadius,fontSize:12,fontWeight:700,cursor:"default"}}>Default</button>
                </div>
                <div style={{background:`${primaryColor}10`,border:`1px solid ${primaryColor}30`,borderRadius:7,padding:"10px 12px",marginBottom:8}}>
                  <div style={{fontSize:12,fontWeight:700,color:primaryColor}}>Primary section card</div>
                  <div style={{fontSize:11,color:"#6b7280",marginTop:2}}>Sample card with your brand color</div>
                </div>
                <div style={{background:`${accentColor}10`,border:`1px solid ${accentColor}30`,borderRadius:7,padding:"10px 12px"}}>
                  <div style={{fontSize:12,fontWeight:700,color:accentColor}}>Accent highlight card</div>
                  <div style={{fontSize:11,color:"#6b7280",marginTop:2}}>Sample accent-colored card</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TERMINAL / CONSOLE ── */}
        {tab==="terminal"&&(
          <div style={{background:"#111827",borderRadius:12,overflow:"hidden",border:"1px solid #374151",height:520}}>
            <div style={{padding:"10px 16px",background:"#1f2937",borderBottom:"1px solid #374151",display:"flex",alignItems:"center",gap:8}}>
              <Terminal style={{width:13,height:13,color:"#6ee7b7"}}/>
              <span style={{fontSize:13,fontWeight:700,color:"#e5e7eb"}}>System Console</span>
              <span style={{fontSize:11,color:"#6b7280",marginLeft:"auto"}}>EL5 MediProcure · Webmaster</span>
              <button onClick={()=>setSysLog([])} style={{padding:"3px 8px",background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:4,cursor:"pointer",fontSize:10,color:"#9ca3af",fontFamily:"monospace"}}>CLEAR</button>
            </div>
            <div ref={logRef} style={{height:410,overflowY:"auto",padding:"12px 16px",fontFamily:"'Fira Code','Courier New',monospace",fontSize:12,lineHeight:1.7}}>
              {sysLog.length===0&&(
                <div style={{color:"#4b5563",fontSize:12}}>
                  <div style={{color:"#6ee7b7",fontWeight:700,marginBottom:8}}>EL5 MediProcure Webmaster Console v3.0</div>
                  <div>Type <span style={{color:"#93c5fd"}}>'help'</span> for available commands</div>
                </div>
              )}
              {[...sysLog].reverse().map((line,i)=>(
                <div key={i} style={{color:line.startsWith("[")&&line.includes("] >")?"#fbbf24":line.includes("error")||line.includes("Error")?"#f87171":line.includes("✓")||line.includes("success")?"#6ee7b7":"#d1d5db",marginBottom:2}}>
                  {line}
                </div>
              ))}
            </div>
            <div style={{padding:"8px 12px",background:"#1f2937",borderTop:"1px solid #374151",display:"flex",gap:8,alignItems:"center"}}>
              <span style={{fontSize:12,color:"#6ee7b7",fontFamily:"monospace",flexShrink:0}}>$</span>
              <input value={cmdInput} onChange={e=>setCmdInput(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter"&&cmdInput.trim()) runCmd(cmdInput); }}
                placeholder="Type command (help, reload, status, clear, users, modules, version)…"
                style={{flex:1,background:"transparent",border:"none",outline:"none",color:"#e5e7eb",fontSize:12,fontFamily:"'Fira Code','Courier New',monospace"}}/>
              <button onClick={()=>{ if(cmdInput.trim()) runCmd(cmdInput); }}
                style={{padding:"5px 12px",background:"#374151",border:"1px solid #4b5563",borderRadius:5,cursor:"pointer",color:"#9ca3af",fontSize:11,fontFamily:"monospace"}}>
                ↵ Run
              </button>
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
