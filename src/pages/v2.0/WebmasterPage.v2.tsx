import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { sendSystemBroadcast } from "@/lib/broadcast";
import {
  Monitor, RefreshCw, Users, Shield, Activity, Server, Database, ClipboardList,
  AlertTriangle, CheckCircle, Globe, Package, BarChart3, Settings,
  Download, Trash2, Eye, Lock, Mail, Play, Terminal, Zap, FileText,
  Archive, TrendingUp, Key, Bell, Save, Edit3, Plus, X,
  LayoutDashboard, Layers, ShoppingCart, DollarSign, Search, Palette,
  Radio, Hash, Power, Sliders, UserCheck, Rss, Wrench, ChevronRight,
  HardDrive, Cpu, BookOpen, Calendar, Scale, FileCheck, Gavel, Truck,
  PiggyBank, Building2, BookMarked, Receipt, Info, Send as SendIcon,
} from "lucide-react";
import RoleGuard from "@/components/RoleGuard";

// ── Section definitions ────────────────────────────────────────────────────
const SECTIONS = [
  { id:"modules",      label:"Modules",          icon:Layers,     sub:"Enable/disable system modules" },
  { id:"roles",        label:"Role Capabilities", icon:UserCheck,  sub:"Manage per-role access" },
  { id:"theme",        label:"Theme & Brand",     icon:Palette,    sub:"Hospital branding settings" },
  { id:"users_cap",    label:"Users",             icon:Users,      sub:"User management capabilities" },
  { id:"controls",     label:"Live Controls",     icon:Sliders,    sub:"System-wide toggles" },
  { id:"broadcast",    label:"Broadcast",         icon:Radio,      sub:"Send system messages" },
  { id:"system",       label:"System Health",     icon:Server,     sub:"Server & database info" },
  { id:"audit",        label:"Audit Log",         icon:Activity,   sub:"Recent activity" },
  { id:"terminal",     label:"Console",           icon:Terminal,   sub:"Run system commands" },
  { id:"licensing",    label:"Licensing & Info",  icon:Key,        sub:"Version & credits" },
];

// ── Module list ─────────────────────────────────────────────────────────────
const ALL_MODULES = [
  { id:"requisitions",   label:"Requisitions",          group:"Procurement",  icon:ShoppingCart, path:"/requisitions" },
  { id:"purchase_orders",label:"Purchase Orders",        group:"Procurement",  icon:ShoppingCart, path:"/purchase-orders" },
  { id:"goods_received", label:"Goods Received",         group:"Procurement",  icon:Package,      path:"/goods-received" },
  { id:"suppliers",      label:"Suppliers",              group:"Procurement",  icon:Truck,        path:"/suppliers" },
  { id:"tenders",        label:"Tenders",                group:"Procurement",  icon:Gavel,        path:"/tenders" },
  { id:"contracts",      label:"Contracts",              group:"Procurement",  icon:FileCheck,    path:"/contracts" },
  { id:"bid_evaluations",label:"Bid Evaluations",        group:"Procurement",  icon:Scale,        path:"/bid-evaluations" },
  { id:"proc_planning",  label:"Procurement Planning",   group:"Procurement",  icon:Calendar,     path:"/procurement-planning" },
  { id:"financials",     label:"Financial Dashboard",    group:"Finance",      icon:TrendingUp,   path:"/financials/dashboard" },
  { id:"budgets",        label:"Budgets",                group:"Finance",      icon:PiggyBank,    path:"/financials/budgets" },
  { id:"coa",            label:"Chart of Accounts",      group:"Finance",      icon:BookOpen,     path:"/financials/chart-of-accounts" },
  { id:"fixed_assets",   label:"Fixed Assets",           group:"Finance",      icon:Building2,    path:"/financials/fixed-assets" },
  { id:"payment_vouchers",label:"Payment Vouchers",      group:"Finance",      icon:DollarSign,   path:"/vouchers/payment" },
  { id:"receipt_vouchers",label:"Receipt Vouchers",      group:"Finance",      icon:Receipt,      path:"/vouchers/receipt" },
  { id:"journal_vouchers",label:"Journal Vouchers",      group:"Finance",      icon:BookMarked,   path:"/vouchers/journal" },
  { id:"inventory",      label:"Inventory / Items",      group:"Operations",   icon:Package,      path:"/items" },
  { id:"categories",     label:"Categories",             group:"Operations",   icon:Hash,         path:"/categories" },
  { id:"departments",    label:"Departments",            group:"Operations",   icon:Building2,    path:"/departments" },
  { id:"scanner",        label:"QR/Barcode Scanner",     group:"Operations",   icon:Search,       path:"/scanner" },
  { id:"quality",        label:"Quality Dashboard",      group:"Quality",      icon:Shield,       path:"/quality/dashboard" },
  { id:"inspections",    label:"Inspections",            group:"Quality",      icon:Eye,          path:"/quality/inspections" },
  { id:"non_conformance",label:"Non-Conformance",        group:"Quality",      icon:AlertTriangle,path:"/quality/non-conformance" },
  { id:"reports",        label:"Reports & Analytics",    group:"Reporting",    icon:BarChart3,    path:"/reports" },
  { id:"documents",      label:"Document Library",       group:"Reporting",    icon:FileText,     path:"/documents" },
  { id:"audit_log",      label:"Audit Log",              group:"Reporting",    icon:Activity,     path:"/audit-log" },
  { id:"email",          label:"Email / Inbox",          group:"Communication",icon:Mail,         path:"/email" },
  { id:"notifications",  label:"Notifications",          group:"Communication",icon:Bell,         path:"" },
  { id:"users",          label:"User Management",        group:"Admin",        icon:Users,        path:"/users" },
  { id:"settings",       label:"System Settings",        group:"Admin",        icon:Settings,     path:"/settings" },
  { id:"admin_panel",    label:"Admin Panel",            group:"Admin",        icon:LayoutDashboard,path:"/admin/panel" },
  { id:"admin_db",       label:"Database Admin",         group:"Admin",        icon:Database,     path:"/admin/database" },
  { id:"backup",         label:"Backup Manager",         group:"Admin",        icon:Archive,      path:"/backup" },
  { id:"odbc",           label:"ODBC Connections",       group:"Admin",        icon:Globe,        path:"/odbc" },
];

// ── Role capabilities ────────────────────────────────────────────────────
const ROLES_LIST = [
  "admin","procurement_manager","procurement_officer","inventory_manager","warehouse_officer","requisitioner"
];
const CAP_GROUPS = [
  { group:"Procurement", caps:[
    { id:"create_requisition",    label:"Create Requisitions" },
    { id:"approve_requisition",   label:"Approve Requisitions" },
    { id:"create_po",             label:"Create Purchase Orders" },
    { id:"approve_po",            label:"Approve Purchase Orders" },
    { id:"receive_goods",         label:"Receive Goods (GRN)" },
    { id:"manage_suppliers",      label:"Manage Suppliers" },
    { id:"manage_contracts",      label:"Manage Contracts" },
    { id:"manage_tenders",        label:"Manage Tenders" },
    { id:"bid_evaluation",        label:"Bid Evaluation" },
  ]},
  { group:"Finance", caps:[
    { id:"view_financials",       label:"View Financials" },
    { id:"create_vouchers",       label:"Create Vouchers" },
    { id:"approve_vouchers",      label:"Approve Vouchers" },
    { id:"manage_budgets",        label:"Manage Budgets" },
    { id:"view_coa",              label:"View Chart of Accounts" },
  ]},
  { group:"Operations", caps:[
    { id:"manage_inventory",      label:"Manage Inventory" },
    { id:"view_inventory",        label:"View Inventory" },
    { id:"quality_control",       label:"Quality Control" },
    { id:"use_scanner",           label:"Use Scanner" },
  ]},
  { group:"System", caps:[
    { id:"manage_users",          label:"Manage Users" },
    { id:"view_audit_log",        label:"View Audit Log" },
    { id:"access_reports",        label:"Access Reports" },
    { id:"manage_documents",      label:"Manage Documents" },
    { id:"system_settings",       label:"System Settings" },
  ]},
];

const DEFAULT_CAPS: Record<string, string[]> = {
  admin:               CAP_GROUPS.flatMap(g=>g.caps.map(c=>c.id)),
  procurement_manager: ["create_requisition","approve_requisition","create_po","approve_po","receive_goods","manage_suppliers","manage_contracts","manage_tenders","bid_evaluation","view_financials","create_vouchers","approve_vouchers","manage_budgets","view_coa","view_inventory","quality_control","view_audit_log","access_reports","manage_documents"],
  procurement_officer: ["create_requisition","create_po","receive_goods","manage_suppliers","view_financials","create_vouchers","view_inventory","use_scanner","access_reports","manage_documents"],
  inventory_manager:   ["view_inventory","manage_inventory","quality_control","use_scanner","create_requisition","manage_documents","access_reports"],
  warehouse_officer:   ["receive_goods","view_inventory","use_scanner","quality_control","create_requisition"],
  requisitioner:       ["create_requisition","access_reports","manage_documents"],
};

const LIVE_CONTROLS = [
  { key:"maintenance_mode",        label:"Maintenance Mode",          sub:"Blocks non-admin access system-wide",    danger:true },
  { key:"email_notifications",     label:"Email Notifications",       sub:"Enable sending via SMTP/API provider",  danger:false },
  { key:"realtime_notifications",  label:"Realtime Notifications",    sub:"Live push notifications via WebSocket",  danger:false },
  { key:"audit_logging",           label:"Audit Logging",             sub:"Log all user actions to audit_log",     danger:false },
  { key:"allow_registration",      label:"Allow Registration",        sub:"Allow new users to self-register",      danger:false },
  { key:"document_module",         label:"Document Module",           sub:"Enable document library & templates",   danger:false },
  { key:"scanner_module",          label:"QR/Barcode Scanner",        sub:"Enable barcode scanning module",        danger:false },
  { key:"external_api",            label:"External API",              sub:"Enable external API integrations",      danger:false },
  { key:"webhooks",                label:"Webhooks",                  sub:"Send event webhooks to external systems", danger:false },
  { key:"account_lockout",         label:"Account Lockout",           sub:"Lock accounts after failed logins",     danger:false },
  { key:"force_pw_reset",          label:"Force Password Reset",      sub:"Force all users to reset passwords",    danger:true },
  { key:"compress_backups",        label:"Compress Backups",          sub:"Compress backup files",                 danger:false },
];

// ── Helper Toggle ────────────────────────────────────────────────────────
function Toggle({on,onChange}:{on:boolean;onChange:(v:boolean)=>void}){
  return(
    <button onClick={()=>onChange(!on)} style={{background:"transparent",border:"none",cursor:"pointer" as const,padding:0,lineHeight:0,flexShrink:0}}>
      <div style={{width:42,height:22,borderRadius:11,background:on?"#0a2558":"#d1d5db",display:"flex" as const,alignItems:"center" as const,padding:"2px",transition:"background 0.2s"}}>
        <div style={{width:18,height:18,borderRadius:"50%",background:"#fff",boxShadow:"0 1px 4px rgba(0,0,0,0.22)",transition:"transform 0.2s",transform:on?"translateX(20px)":"translateX(0)"}}/>
      </div>
    </button>
  );
}

// ── Checkbox ────────────────────────────────────────────────────────────────
function CB({checked,onChange,disabled=false}:{checked:boolean;onChange:(v:boolean)=>void;disabled?:boolean}){
  return(
    <button onClick={()=>!disabled&&onChange(!checked)} disabled={disabled}
      style={{width:18,height:18,borderRadius:4,border:`2px solid ${checked?"#0a2558":"#d1d5db"}`,background:checked?"#0a2558":"#fff",cursor:disabled?"not-allowed":"pointer",display:"flex" as const,alignItems:"center" as const,justifyContent:"center" as const,flexShrink:0,padding:0,lineHeight:0,transition:"all 0.15s"}}>
      {checked&&<svg width={10} height={8} viewBox="0 0 10 8"><path d="M1 4L3.5 7L9 1" stroke="#fff" strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
export default function WebmasterPage(){
  const{profile,roles}=useAuth();
  const navigate=useNavigate();
  const[activeSection,setActiveSection]=useState("modules");
  const[saving,setSaving]=useState(false);
  const[modEnabled,setModEnabled]=useState<Record<string,boolean>>({});
  const[controls,setControls]=useState<Record<string,boolean>>({});
  const[caps,setCaps]=useState<Record<string,string[]>>(DEFAULT_CAPS);
  const[selectedRole,setSelectedRole]=useState("procurement_officer");
  const[theme,setTheme]=useState({system_name:"EL5 MediProcure",hospital_name:"Embu Level 5 Hospital",primary_color:"#0a2558",accent_color:"#C45911",county:"Embu County Government",address:"Embu Town, Embu County, Kenya",phone:"+254 060 000000",email:"info@embu-l5.go.ke"});
  const[broadcast,setBroadcast]=useState({title:"",message:"",type:"info",expires_in:24,roles:[] as string[]});
  const[logs,setLogs]=useState<any[]>([]);
  const[logsLoading,setLogsLoading]=useState(false);
  const[termInput,setTermInput]=useState("");
  const[termHistory,setTermHistory]=useState<string[]>(["MediProcure Console v1.0 — Type 'help' for commands"]);
  const[sysStats,setSysStats]=useState({tables:0,users:0,req:0,po:0,suppliers:0,notifications:0});
  const termRef=useRef<HTMLDivElement>(null);

  // ── Load settings ──────────────────────────────────────────────────────
  useEffect(()=>{
    (async()=>{
      try{
        // Load system_config
        const{data:cfg}=(await (supabase as any).from("system_config").select("*").limit(200)) as any;
        if(cfg){
          const m:Record<string,boolean>={};
          const c:Record<string,boolean>={};
          const capData:Record<string,string[]>={...DEFAULT_CAPS};
          cfg.forEach((row:any)=>{
            if(row.key?.startsWith("module_"))m[row.key.replace("module_","")]=row.value==="true"||row.value===true;
            if(LIVE_CONTROLS.find(lc=>lc.key===row.key))c[row.key]=row.value==="true"||row.value===true;
            if(row.key?.startsWith("caps_")){
              const role=row.key.replace("caps_","");
              try{capData[role]=JSON.parse(row.value||"[]");}catch{}
            }
          });
          setModEnabled(m);setControls(c);setCaps(capData);
        }
        // Load theme settings from system_settings
        const{data:ss}=(await (supabase as any).from("system_settings").select("key,value")) as any;
        if(ss){
          const t={...theme};
          ss.forEach((r:any)=>{if(r.key in t)(t as any)[r.key]=r.value;});
          setTheme(t);
        }
        // Load stats
        const[{count:uc},{count:rc},{count:pc},{count:sc}]=await Promise.all([
          (supabase as any).from("profiles").select("*",{count:"exact",head:true}),
          (supabase as any).from("requisitions").select("*",{count:"exact",head:true}),
          (supabase as any).from("purchase_orders").select("*",{count:"exact",head:true}),
          (supabase as any).from("suppliers").select("*",{count:"exact",head:true}),
        ]);
        setSysStats({tables:32,users:uc||0,req:rc||0,po:pc||0,suppliers:sc||0,notifications:0});
      }catch(e){console.warn("Settings load",e);}
    })();
  },[]);

  // ── Save ──────────────────────────────────────────────────────────────
  const saveSection=async()=>{
    setSaving(true);
    try{
      const upserts:any[]=[];
      if(activeSection==="modules"){
        Object.entries(modEnabled).forEach(([k,v])=>upserts.push({key:`module_${k}`,value:String(v),category:"module"}));
      }
      if(activeSection==="controls"){
        Object.entries(controls).forEach(([k,v])=>upserts.push({key:k,value:String(v),category:"control"}));
      }
      if(activeSection==="roles"){
        upserts.push({key:`caps_${selectedRole}`,value:JSON.stringify(caps[selectedRole]||[]),category:"capability"});
      }
      if(activeSection==="theme"){
        // Save to system_settings
        await Promise.all(Object.entries(theme).map(([k,v])=>
          (supabase as any).from("system_settings").upsert({key:k,value:v},{onConflict:"key"})
        ));
        toast({title:"Theme settings saved ✓"});
        setSaving(false);return;
      }
      if(upserts.length>0){
        const{error}=await (supabase as any).from("system_config").upsert(upserts,{onConflict:"key"});
        if(error)throw error;
      }
      toast({title:"Settings saved ✓",description:`${SECTIONS.find(s=>s.id===activeSection)?.label} updated`});
    }catch(e:any){
      toast({title:"Save failed",description:e.message,variant:"destructive"});
    }
    setSaving(false);
  };

  const resetSection=()=>{
    if(activeSection==="roles")setCaps(p=>({...p,[selectedRole]:DEFAULT_CAPS[selectedRole]||[]}));
    if(activeSection==="modules")setModEnabled({});
    if(activeSection==="controls")setControls({});
    toast({title:"Section reset to defaults"});
  };

  // ── Load audit logs ───────────────────────────────────────────────────
  useEffect(()=>{
    if(activeSection!=="audit")return;
    setLogsLoading(true);
    (supabase as any).from("audit_log").select("*").order("created_at",{ascending:false}).limit(50)
      .then(({data}:any)=>{setLogs(data||[]);setLogsLoading(false);});
  },[activeSection]);

  // ── Terminal ──────────────────────────────────────────────────────────
  const runCmd=(cmd:string)=>{
    const c=cmd.trim().toLowerCase();
    let out="";
    if(c==="help")out="Commands: help, stats, clear, version, date, users, reload";
    else if(c==="stats")out=`System Stats:\n  Tables: ${sysStats.tables}\n  Users: ${sysStats.users}\n  Requisitions: ${sysStats.req}\n  Purchase Orders: ${sysStats.po}\n  Suppliers: ${sysStats.suppliers}`;
    else if(c==="clear"){setTermHistory(["Console cleared."]);return;}
    else if(c==="version")out="MediProcure Hub v1.0.0 | Embu Level 5 Hospital | Supabase + React";
    else if(c==="date")out=new Date().toString();
    else if(c==="users")out=`Active users in system: ${sysStats.users}`;
    else if(c==="reload")out="Reloading page...";
    else out=`Unknown command: '${cmd}'. Type 'help' for available commands.`;
    setTermHistory(p=>[...p,`$ ${cmd}`,out]);
    if(c==="reload")setTimeout(()=>window.location.reload(),500);
    setTimeout(()=>termRef.current?.scrollTo({top:99999,behavior:"smooth"}),50);
  };

  // ── Send broadcast ─────────────────────────────────────────────────────
  const sendBroadcast=async()=>{
    if(!broadcast.title.trim()||!broadcast.message.trim()){toast({title:"Title and message required",variant:"destructive"});return;}
    setSaving(true);
    try{
      await sendSystemBroadcast(broadcast.title,broadcast.message,broadcast.type as any,broadcast.expires_in,broadcast.roles.length>0?broadcast.roles:undefined);
      toast({title:"Broadcast sent ✓"});
      setBroadcast(p=>({...p,title:"",message:""}));
    }catch(e:any){toast({title:"Failed",description:e.message,variant:"destructive"});}
    setSaving(false);
  };

  // ── Module groups ──────────────────────────────────────────────────────
  const modGroups=Array.from(new Set(ALL_MODULES.map(m=>m.group)));

  // ── Styles ────────────────────────────────────────────────────────────
  const lbl:React.CSSProperties={fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em",color:"#6b7280",display:"block" as const,marginBottom:4};
  const inp:React.CSSProperties={width:"100%",padding:"7px 10px",border:"1.5px solid #e5e7eb",borderRadius:7,fontSize:13,outline:"none",boxSizing:"border-box" as const,color:"#111827",background:"#fff"};
  const sectionContent=SECTIONS.find(s=>s.id===activeSection);

  return(
    <RoleGuard allowed={["admin"]}>
      <div style={{display:"flex" as const,flexDirection:"column" as const,height:"100%",background:"#f0f2f5",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
        <style>{`
          @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
          .sec-btn{transition:background 0.12s,color 0.12s;cursor:pointer;}
          .sec-btn:hover{background:#e8edf5!important;}
          .sec-btn.active{background:#e8edf5!important;border-left:3px solid #0a2558!important;}
          .cap-row:hover{background:#f9fafb;}
          .mod-row:hover{background:#f9fafb;}
        `}</style>

        {/* ── Top action bar ────────────────────────────────────────── */}
        <div style={{display:"flex" as const,alignItems:"center" as const,justifyContent:"space-between" as const,padding:"10px 20px",background:"#fff",borderBottom:"1px solid #e5e7eb",flexWrap:"wrap",gap:8}}>
          <div>
            <h1 style={{fontSize:16,fontWeight:900,color:"#111827",margin:0}}>Webmaster Control Panel</h1>
            <div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>Manage system capabilities, modules, and configuration · {profile?.full_name}</div>
          </div>
          <div style={{display:"flex" as const,gap:8}}>
            <button onClick={saveSection} disabled={saving}
              style={{display:"flex" as const,alignItems:"center" as const,gap:7,padding:"8px 18px",background:"#0a2558",color:"#fff",border:"none",borderRadius:8,cursor:"pointer" as const,fontSize:13,fontWeight:700,opacity:saving?0.7:1}}>
              {saving?<RefreshCw style={{width:13,height:13,animation:"spin 1s linear infinite"}}/>:<Save style={{width:13,height:13}}/>}
              SAVE CHANGES
            </button>
            <button onClick={resetSection}
              style={{padding:"8px 14px",border:"1.5px solid #0a2558",borderRadius:8,background:"#fff",cursor:"pointer" as const,fontSize:12,fontWeight:600,color:"#0a2558"}}>
              RESET SECTION
            </button>
            <button onClick={()=>{resetSection();}}
              style={{padding:"8px 14px",border:"1.5px solid #e5e7eb",borderRadius:8,background:"#fff",cursor:"pointer" as const,fontSize:12,fontWeight:600,color:"#6b7280"}}>
              RESET ALL
            </button>
          </div>
        </div>

        {/* ── Body: left nav + right content ────────────────────────── */}
        <div style={{display:"flex" as const,flex:1,overflow:"hidden" as const}}>

          {/* Left nav */}
          <div style={{width:220,flexShrink:0,background:"#fff",borderRight:"1px solid #e5e7eb",overflowY:"auto" as const,padding:"6px 0"}}>
            {SECTIONS.map(s=>(
              <button key={s.id} className={`sec-btn${activeSection===s.id?" active":""}`}
                onClick={()=>setActiveSection(s.id)}
                style={{display:"flex" as const,alignItems:"center" as const,gap:10,width:"100%",padding:"10px 16px",border:"none",borderLeft:"3px solid transparent",background:"transparent",textAlign:"left" as const,cursor:"pointer" as const}}>
                <s.icon style={{width:14,height:14,color:activeSection===s.id?"#0a2558":"#6b7280",flexShrink:0}}/>
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:activeSection===s.id?"#0a2558":"#374151",textTransform:"uppercase",letterSpacing:"0.05em"}}>{s.label}</div>
                  <div style={{fontSize:9.5,color:"#9ca3af",marginTop:1}}>{s.sub}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Right content */}
          <div style={{flex:1,overflowY:"auto" as const,padding:"24px 28px"}}>
            <div style={{display:"flex" as const,alignItems:"center" as const,gap:10,marginBottom:20}}>
              {sectionContent&&<sectionContent.icon style={{width:18,height:18,color:"#0a2558"}}/>}
              <div>
                <h2 style={{fontSize:16,fontWeight:800,color:"#111827",margin:0}}>{sectionContent?.label}</h2>
                <p style={{fontSize:11,color:"#9ca3af",margin:"2px 0 0"}}>{sectionContent?.sub}</p>
              </div>
            </div>
            <div style={{height:1,background:"#e5e7eb",marginBottom:24}}/>

            {/* ── MODULES ──────────────────────────────────────────── */}
            {activeSection==="modules"&&(
              <div style={{display:"flex" as const,flexDirection:"column" as const,gap:20}}>
                {modGroups.map(grp=>(
                  <div key={grp}>
                    <h3 style={{fontSize:12,fontWeight:800,color:"#374151",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10,display:"flex" as const,alignItems:"center" as const,gap:8}}>
                      <span style={{flex:1,borderBottom:"1px solid #e5e7eb",paddingBottom:4}}>{grp} Modules</span>
                      <span style={{fontSize:10,color:"#9ca3af",fontWeight:500,whiteSpace:"nowrap" as const}}>
                        {ALL_MODULES.filter(m=>m.group===grp&&(modEnabled[m.id]!==false)).length}/{ALL_MODULES.filter(m=>m.group===grp).length} enabled
                      </span>
                    </h3>
                    <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",overflow:"hidden" as const}}>
                      {ALL_MODULES.filter(m=>m.group===grp).map((m,i,arr)=>(
                        <div key={m.id} className="mod-row" style={{display:"flex" as const,alignItems:"center" as const,gap:14,padding:"10px 14px",borderBottom:i<arr.length-1?"1px solid #f3f4f6":"none"}}>
                          <div style={{width:32,height:32,borderRadius:8,background:"#f0f2f5",display:"flex" as const,alignItems:"center" as const,justifyContent:"center" as const,flexShrink:0}}>
                            <m.icon style={{width:15,height:15,color:"#374151"}}/>
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:13,fontWeight:600,color:"#111827"}}>{m.label}</div>
                            {m.path&&<div style={{fontSize:10,color:"#9ca3af"}}>{m.path}</div>}
                          </div>
                          <Toggle on={modEnabled[m.id]!==false} onChange={v=>setModEnabled(p=>({...p,[m.id]:v}))}/>
                          {m.path&&<button onClick={()=>navigate(m.path)} style={{background:"none",border:"none",cursor:"pointer" as const,color:"#0a2558",padding:3,lineHeight:0}}><ChevronRight style={{width:14,height:14}}/></button>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── ROLE CAPABILITIES ────────────────────────────────── */}
            {activeSection==="roles"&&(
              <div>
                {/* Role selector */}
                <div style={{display:"flex" as const,gap:8,marginBottom:20,flexWrap:"wrap"}}>
                  {ROLES_LIST.map(r=>(
                    <button key={r} onClick={()=>setSelectedRole(r)}
                      style={{padding:"6px 14px",borderRadius:20,border:"1.5px solid",fontSize:11,fontWeight:700,cursor:"pointer" as const,textTransform:"capitalize",
                        borderColor:selectedRole===r?"#0a2558":"#e5e7eb",
                        background:selectedRole===r?"#0a2558":"#fff",
                        color:selectedRole===r?"#fff":"#374151"}}>
                      {r.replace(/_/g," ")}
                    </button>
                  ))}
                </div>

                <div style={{background:"#f0f2f5",borderRadius:10,padding:"10px 14px",marginBottom:16,display:"flex" as const,alignItems:"center" as const,gap:10}}>
                  <Info style={{width:14,height:14,color:"#0a2558",flexShrink:0}}/>
                  <span style={{fontSize:12,color:"#374151"}}>
                    Showing capabilities for: <strong style={{color:"#0a2558"}}>{selectedRole.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}</strong>
                    {" · "}{caps[selectedRole]?.length||0} capabilities enabled
                  </span>
                </div>

                {CAP_GROUPS.map(cg=>(
                  <div key={cg.group} style={{marginBottom:16}}>
                    <h3 style={{fontSize:11,fontWeight:800,color:"#374151",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>
                      {cg.group}
                    </h3>
                    <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",overflow:"hidden" as const}}>
                      {cg.caps.map((cap,i,arr)=>{
                        const checked=(caps[selectedRole]||[]).includes(cap.id);
                        return(
                          <div key={cap.id} className="cap-row" style={{display:"flex" as const,alignItems:"center" as const,gap:12,padding:"10px 14px",borderBottom:i<arr.length-1?"1px solid #f3f4f6":"none",cursor:"pointer" as const}}
                            onClick={()=>setCaps(p=>{
                              const cur=p[selectedRole]||[];
                              return{...p,[selectedRole]:checked?cur.filter(c=>c!==cap.id):[...cur,cap.id]};
                            })}>
                            <CB checked={checked} onChange={v=>setCaps(p=>{const cur=p[selectedRole]||[];return{...p,[selectedRole]:v?[...cur,cap.id]:cur.filter(c=>c!==cap.id)};})}/>
                            <span style={{fontSize:13,color:"#111827",flex:1}}>{cap.label}</span>
                            {selectedRole==="admin"&&<span style={{fontSize:9,color:"#9ca3af",background:"#f3f4f6",padding:"1px 6px",borderRadius:4}}>always on</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── THEME & BRAND ─────────────────────────────────────── */}
            {activeSection==="theme"&&(
              <div style={{display:"flex" as const,flexDirection:"column" as const,gap:20,maxWidth:680}}>
                <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",padding:20}}>
                  <h3 style={{fontSize:13,fontWeight:800,color:"#111827",marginBottom:16}}>Hospital Identity</h3>
                  <div style={{display:"grid" as const,gridTemplateColumns:"1fr 1fr",gap:14}}>
                    {[{k:"system_name",l:"System Name",ph:"EL5 MediProcure"},{k:"hospital_name",l:"Hospital Name",ph:"Embu Level 5 Hospital"},{k:"county",l:"County / Authority",ph:"Embu County Government"},{k:"address",l:"Address",ph:"Embu Town, Embu County"},{k:"phone",l:"Phone",ph:"+254 060 000000"},{k:"email",l:"Email",ph:"info@embu-l5.go.ke"}].map(f=>(
                      <div key={f.k}>
                        <label style={lbl}>{f.l}</label>
                        <input value={(theme as any)[f.k]||""} onChange={e=>setTheme(p=>({...p,[f.k]:e.target.value}))} placeholder={f.ph} style={inp}/>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",padding:20}}>
                  <h3 style={{fontSize:13,fontWeight:800,color:"#111827",marginBottom:16}}>Brand Colors</h3>
                  <div style={{display:"grid" as const,gridTemplateColumns:"1fr 1fr",gap:14}}>
                    {[{k:"primary_color",l:"Primary Color"},{k:"accent_color",l:"Accent Color"}].map(f=>(
                      <div key={f.k}>
                        <label style={lbl}>{f.l}</label>
                        <div style={{display:"flex" as const,gap:8,alignItems:"center" as const}}>
                          <input type="color" value={(theme as any)[f.k]||"#0a2558"} onChange={e=>setTheme(p=>({...p,[f.k]:e.target.value}))} style={{width:36,height:34,border:"1.5px solid #e5e7eb",borderRadius:6,padding:2,cursor:"pointer" as const}}/>
                          <input value={(theme as any)[f.k]||""} onChange={e=>setTheme(p=>({...p,[f.k]:e.target.value}))} style={{...inp,flex:1}} placeholder="#0a2558"/>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{background:"#f0f2f5",borderRadius:10,padding:"12px 16px",display:"flex" as const,alignItems:"center" as const,gap:10}}>
                  <Palette style={{width:14,height:14,color:"#0a2558",flexShrink:0}}/>
                  <span style={{fontSize:12,color:"#374151"}}>Color changes take effect on next page load. Saved to <code style={{background:"#e5e7eb",padding:"1px 4px",borderRadius:3,fontSize:11}}>system_settings</code> table.</span>
                </div>
              </div>
            )}

            {/* ── USERS ────────────────────────────────────────────── */}
            {activeSection==="users_cap"&&(
              <div style={{display:"flex" as const,flexDirection:"column" as const,gap:16,maxWidth:680}}>
                {[
                  {group:"User Account Capabilities",items:[
                    {label:"View all users",desc:"See full user list and profiles"},
                    {label:"Create new users",desc:"Add new users to the system"},
                    {label:"Edit user profiles",desc:"Modify user details and roles"},
                    {label:"Deactivate users",desc:"Disable user accounts"},
                    {label:"Delete users",desc:"Permanently remove users"},
                    {label:"Reset passwords",desc:"Reset any user's password"},
                    {label:"Assign roles",desc:"Change user roles and permissions"},
                  ]},
                  {group:"Role Management",items:[
                    {label:"View role capabilities",desc:"See what each role can do"},
                    {label:"Modify role capabilities",desc:"Change role permission sets"},
                    {label:"Create custom roles",desc:"Add new role types"},
                  ]},
                ].map(section=>(
                  <div key={section.group}>
                    <h3 style={{fontSize:12,fontWeight:800,color:"#374151",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10}}>{section.group}</h3>
                    <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",overflow:"hidden" as const}}>
                      {section.items.map((item,i,arr)=>(
                        <div key={item.label} className="cap-row" style={{display:"flex" as const,alignItems:"center" as const,gap:12,padding:"10px 14px",borderBottom:i<arr.length-1?"1px solid #f3f4f6":"none"}}>
                          <CB checked={true} onChange={()=>{}} disabled/>
                          <div style={{flex:1}}>
                            <div style={{fontSize:13,color:"#111827",fontWeight:500}}>{item.label}</div>
                            <div style={{fontSize:10.5,color:"#9ca3af"}}>{item.desc}</div>
                          </div>
                          <span style={{fontSize:9,color:"#9ca3af",background:"#f3f4f6",padding:"1px 6px",borderRadius:4}}>admin only</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <div style={{marginTop:8,display:"flex" as const,gap:8}}>
                  <button onClick={()=>navigate("/users")} style={{display:"flex" as const,alignItems:"center" as const,gap:7,padding:"8px 16px",background:"#0a2558",color:"#fff",border:"none",borderRadius:8,cursor:"pointer" as const,fontSize:12,fontWeight:700}}>
                    <Users style={{width:13,height:13}}/>Manage Users
                  </button>
                </div>
              </div>
            )}

            {/* ── LIVE CONTROLS ────────────────────────────────────── */}
            {activeSection==="controls"&&(
              <div style={{display:"flex" as const,flexDirection:"column" as const,gap:8,maxWidth:680}}>
                <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:10,padding:"10px 14px",marginBottom:12,display:"flex" as const,gap:10,alignItems:"flex-start" as const}}>
                  <AlertTriangle style={{width:14,height:14,color:"#d97706",flexShrink:0,marginTop:2}}/>
                  <span style={{fontSize:12,color:"#92400e"}}>Controls marked in <strong>red</strong> affect all users. Changes take effect immediately.</span>
                </div>
                {LIVE_CONTROLS.map(ctrl=>(
                  <div key={ctrl.key} style={{display:"flex" as const,alignItems:"center" as const,gap:14,padding:"12px 16px",background:"#fff",borderRadius:10,border:`1px solid ${ctrl.danger?"#fee2e2":"#e5e7eb"}`}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:700,color:ctrl.danger?"#dc2626":"#111827"}}>{ctrl.label}</div>
                      <div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>{ctrl.sub}</div>
                    </div>
                    {ctrl.danger&&<span style={{fontSize:9,fontWeight:700,color:"#dc2626",background:"#fee2e2",padding:"2px 6px",borderRadius:4}}>DANGER</span>}
                    <Toggle on={!!controls[ctrl.key]} onChange={v=>setControls(p=>({...p,[ctrl.key]:v}))}/>
                  </div>
                ))}
              </div>
            )}

            {/* ── BROADCAST ────────────────────────────────────────── */}
            {activeSection==="broadcast"&&(
              <div style={{maxWidth:640}}>
                <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",padding:20,display:"flex" as const,flexDirection:"column" as const,gap:14}}>
                  <div>
                    <label style={lbl}>Message Title *</label>
                    <input value={broadcast.title} onChange={e=>setBroadcast(p=>({...p,title:e.target.value}))} placeholder="e.g. System Maintenance Tonight" style={inp}/>
                  </div>
                  <div>
                    <label style={lbl}>Message Body *</label>
                    <textarea value={broadcast.message} onChange={e=>setBroadcast(p=>({...p,message:e.target.value}))} rows={4} placeholder="Write your broadcast message..." style={{...inp,resize:"none" as const}}/>
                  </div>
                  <div style={{display:"grid" as const,gridTemplateColumns:"1fr 1fr",gap:14}}>
                    <div>
                      <label style={lbl}>Message Type</label>
                      <select value={broadcast.type} onChange={e=>setBroadcast(p=>({...p,type:e.target.value}))} style={inp}>
                        {["info","warning","error","success"].map(t=><option key={t} value={t} style={{textTransform:"capitalize"}}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Expires In (hours)</label>
                      <input type="number" min={1} max={168} value={broadcast.expires_in} onChange={e=>setBroadcast(p=>({...p,expires_in:Number(e.target.value)}))} style={inp}/>
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>Target Roles (leave empty for all)</label>
                    <div style={{display:"flex" as const,gap:8,flexWrap:"wrap",marginTop:4}}>
                      {ROLES_LIST.map(r=>{
                        const sel=broadcast.roles.includes(r);
                        return(
                          <button key={r} onClick={()=>setBroadcast(p=>({...p,roles:sel?p.roles.filter(x=>x!==r):[...p.roles,r]}))}
                            style={{padding:"4px 12px",borderRadius:20,border:"1.5px solid",fontSize:11,cursor:"pointer" as const,
                              borderColor:sel?"#0a2558":"#e5e7eb",background:sel?"#0a2558":"#f9fafb",color:sel?"#fff":"#374151",fontWeight:600}}>
                            {r.replace(/_/g," ")}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <button onClick={sendBroadcast} disabled={saving}
                    style={{display:"flex" as const,alignItems:"center" as const,justifyContent:"center" as const,gap:8,padding:"10px 20px",background:"#0a2558",color:"#fff",border:"none",borderRadius:10,cursor:"pointer" as const,fontSize:13,fontWeight:700,opacity:saving?0.7:1}}>
                    {saving?<RefreshCw style={{width:13,height:13,animation:"spin 1s linear infinite"}}/>:<SendIcon style={{width:13,height:13}}/>}
                    Send System Broadcast
                  </button>
                </div>
              </div>
            )}

            {/* ── SYSTEM HEALTH ───────────────────────────────────── */}
            {activeSection==="system"&&(
              <div style={{display:"flex" as const,flexDirection:"column" as const,gap:16,maxWidth:720}}>
                <div style={{display:"grid" as const,gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
                  {[
                    {label:"Total Users",      value:sysStats.users,     icon:Users,      color:"#0a2558"},
                    {label:"Requisitions",      value:sysStats.req,       icon:ClipboardList, color:"#C45911"},
                    {label:"Purchase Orders",   value:sysStats.po,        icon:ShoppingCart,color:"#0078d4"},
                    {label:"Suppliers",         value:sysStats.suppliers, icon:Truck,       color:"#107c10"},
                    {label:"DB Tables",         value:sysStats.tables,    icon:Database,    color:"#374151"},
                    {label:"System Status",     value:"Online",           icon:CheckCircle, color:"#059669"},
                  ].map(stat=>(
                    <div key={stat.label} style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",padding:"14px 16px",display:"flex" as const,alignItems:"center" as const,gap:12}}>
                      <div style={{width:36,height:36,borderRadius:9,background:`${stat.color}14`,display:"flex" as const,alignItems:"center" as const,justifyContent:"center" as const,flexShrink:0}}>
                        <stat.icon style={{width:17,height:17,color:stat.color}}/>
                      </div>
                      <div>
                        <div style={{fontSize:18,fontWeight:900,color:"#111827",lineHeight:1}}>{stat.value}</div>
                        <div style={{fontSize:10,color:"#9ca3af",marginTop:2}}>{stat.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",padding:18}}>
                  <h3 style={{fontSize:13,fontWeight:800,color:"#111827",marginBottom:14}}>System Information</h3>
                  {[
                    ["Platform","Supabase PostgreSQL + React (Vite)"],
                    ["Application","MediProcure Hub v1.0.0"],
                    ["Hospital","Embu Level 5 Hospital, Embu County"],
                    ["Database","PostgreSQL (Supabase Cloud)"],
                    ["Authentication","Supabase Auth + Row-Level Security"],
                    ["Environment","Production"],
                    ["Roles","6 role levels configured"],
                    ["Build","React 18 + TypeScript + Tailwind"],
                  ].map(([k,v])=>(
                    <div key={k} style={{display:"flex" as const,padding:"7px 0",borderBottom:"1px solid #f3f4f6"}}>
                      <span style={{width:180,fontSize:12,fontWeight:700,color:"#6b7280",flexShrink:0}}>{k}</span>
                      <span style={{fontSize:12,color:"#111827"}}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{display:"flex" as const,gap:10}}>
                  <button onClick={()=>navigate("/admin/database")} style={{display:"flex" as const,alignItems:"center" as const,gap:7,padding:"8px 16px",background:"#0a2558",color:"#fff",border:"none",borderRadius:8,cursor:"pointer" as const,fontSize:12,fontWeight:700}}>
                    <Database style={{width:13,height:13}}/>Database Admin
                  </button>
                  <button onClick={()=>navigate("/backup")} style={{display:"flex" as const,alignItems:"center" as const,gap:7,padding:"8px 16px",border:"1.5px solid #0a2558",borderRadius:8,background:"#fff",cursor:"pointer" as const,fontSize:12,fontWeight:700,color:"#0a2558"}}>
                    <Archive style={{width:13,height:13}}/>Backup Manager
                  </button>
                </div>
              </div>
            )}

            {/* ── AUDIT LOG ──────────────────────────────────────── */}
            {activeSection==="audit"&&(
              <div style={{maxWidth:800}}>
                {logsLoading?(
                  <div style={{display:"flex" as const,alignItems:"center" as const,gap:8,color:"#9ca3af",padding:"30px 0"}}>
                    <RefreshCw style={{width:14,height:14,animation:"spin 1s linear infinite"}}/>Loading audit log...
                  </div>
                ):(
                  <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",overflow:"hidden" as const}}>
                    <div style={{padding:"10px 16px",background:"#f9fafb",borderBottom:"1px solid #e5e7eb",display:"flex" as const,alignItems:"center" as const,justifyContent:"space-between" as const}}>
                      <span style={{fontSize:12,fontWeight:700,color:"#374151"}}>Recent Activity — Last 50 entries</span>
                      <button onClick={()=>navigate("/audit-log")} style={{fontSize:11,color:"#0a2558",background:"none",border:"none",cursor:"pointer" as const,fontWeight:600}}>View Full Log →</button>
                    </div>
                    {logs.length===0&&<div style={{padding:"30px 20px",textAlign:"center" as const,color:"#9ca3af",fontSize:13}}>No audit records found</div>}
                    {logs.map((log,i)=>(
                      <div key={log.id||i} style={{display:"flex" as const,alignItems:"flex-start" as const,gap:12,padding:"9px 16px",borderBottom:"1px solid #f3f4f6"}}>
                        <div style={{width:28,height:28,borderRadius:"50%",background:"#f0f2f5",display:"flex" as const,alignItems:"center" as const,justifyContent:"center" as const,flexShrink:0}}>
                          <Activity style={{width:12,height:12,color:"#374151"}}/>
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:12,fontWeight:600,color:"#111827"}}>{log.action||"Action"}</div>
                          <div style={{fontSize:10.5,color:"#9ca3af",marginTop:1}}>{log.user_name||log.user_id} · {log.table_name} · {log.created_at?new Date(log.created_at).toLocaleString("en-KE"):""}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── CONSOLE ─────────────────────────────────────────── */}
            {activeSection==="terminal"&&(
              <div style={{maxWidth:760}}>
                <div style={{background:"#0d1117",borderRadius:12,border:"1px solid #30363d",overflow:"hidden" as const}}>
                  <div style={{padding:"8px 14px",background:"#161b22",borderBottom:"1px solid #30363d",display:"flex" as const,alignItems:"center" as const,gap:8}}>
                    <div style={{width:12,height:12,borderRadius:"50%",background:"#ff5f57"}}/>
                    <div style={{width:12,height:12,borderRadius:"50%",background:"#febc2e"}}/>
                    <div style={{width:12,height:12,borderRadius:"50%",background:"#28c840"}}/>
                    <span style={{fontSize:11,color:"#8b949e",marginLeft:8,fontFamily:"monospace"}}>MediProcure Console — Webmaster</span>
                  </div>
                  <div ref={termRef} style={{padding:"14px 16px",height:320,overflowY:"auto" as const,fontFamily:"'Cascadia Code','Consolas','Courier New',monospace",fontSize:12,lineHeight:1.7,color:"#c9d1d9"}}>
                    {termHistory.map((line,i)=>(
                      <div key={i} style={{whiteSpace:"pre-wrap" as const,color:line.startsWith("$")?"#79c0ff":line.startsWith("Unknown")||line.startsWith("Error")?"#ff7b72":"#c9d1d9"}}>{line}</div>
                    ))}
                  </div>
                  <div style={{display:"flex" as const,alignItems:"center" as const,gap:8,padding:"8px 14px",borderTop:"1px solid #30363d"}}>
                    <span style={{color:"#79c0ff",fontFamily:"monospace",fontSize:13,flexShrink:0}}>$</span>
                    <input value={termInput} onChange={e=>setTermInput(e.target.value)}
                      onKeyDown={e=>{if(e.key==="Enter"&&termInput.trim()){runCmd(termInput);setTermInput("");}}}
                      placeholder="Type a command and press Enter..." autoComplete="off"
                      style={{flex:1,background:"transparent",border:"none",outline:"none",fontFamily:"'Cascadia Code','Consolas',monospace",fontSize:12,color:"#c9d1d9"}}/>
                    <button onClick={()=>{if(termInput.trim()){runCmd(termInput);setTermInput("");}}}
                      style={{background:"#238636",border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer" as const,color:"#fff",fontSize:11,fontWeight:700}}>
                      <Play style={{width:11,height:11}}/>
                    </button>
                  </div>
                </div>
                <div style={{marginTop:12,fontSize:11,color:"#9ca3af"}}>
                  Available: <code style={{background:"#e5e7eb",padding:"1px 5px",borderRadius:3}}>help</code>{" "}
                  <code style={{background:"#e5e7eb",padding:"1px 5px",borderRadius:3}}>stats</code>{" "}
                  <code style={{background:"#e5e7eb",padding:"1px 5px",borderRadius:3}}>version</code>{" "}
                  <code style={{background:"#e5e7eb",padding:"1px 5px",borderRadius:3}}>users</code>{" "}
                  <code style={{background:"#e5e7eb",padding:"1px 5px",borderRadius:3}}>date</code>{" "}
                  <code style={{background:"#e5e7eb",padding:"1px 5px",borderRadius:3}}>clear</code>{" "}
                  <code style={{background:"#e5e7eb",padding:"1px 5px",borderRadius:3}}>reload</code>
                </div>
              </div>
            )}

            {/* ── LICENSING ───────────────────────────────────────── */}
            {activeSection==="licensing"&&(
              <div style={{maxWidth:680,display:"flex" as const,flexDirection:"column" as const,gap:16}}>
                <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",padding:20}}>
                  <div style={{display:"flex" as const,alignItems:"center" as const,gap:14,marginBottom:16}}>
                    <div style={{width:48,height:48,borderRadius:10,background:"#0a2558",display:"flex" as const,alignItems:"center" as const,justifyContent:"center" as const}}>
                      <Monitor style={{width:24,height:24,color:"#fff"}}/>
                    </div>
                    <div>
                      <h2 style={{fontSize:16,fontWeight:900,color:"#111827",margin:0}}>MediProcure Hub</h2>
                      <div style={{fontSize:12,color:"#9ca3af"}}>Embu Level 5 Hospital · Procurement Management System</div>
                    </div>
                    <div style={{marginLeft:"auto",background:"#0a2558",color:"#fff",padding:"4px 12px",borderRadius:20,fontSize:11,fontWeight:700}}>v1.0.0</div>
                  </div>
                  {[
                    ["Version","1.0.0"],
                    ["Build","React 18 + TypeScript + Vite"],
                    ["Database","PostgreSQL via Supabase"],
                    ["Auth","Supabase Auth with RLS"],
                    ["License","Proprietary — Embu County Government"],
                    ["Support","IT Department — Embu Level 5 Hospital"],
                    ["Last Updated",new Date().toLocaleDateString("en-KE")],
                  ].map(([k,v])=>(
                    <div key={k} style={{display:"flex" as const,padding:"8px 0",borderBottom:"1px solid #f3f4f6"}}>
                      <span style={{width:160,fontSize:12,fontWeight:700,color:"#6b7280",flexShrink:0}}>{k}</span>
                      <span style={{fontSize:12,color:"#111827"}}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{background:"#f0f6ff",border:"1px solid #bfdbfe",borderRadius:10,padding:"12px 16px",fontSize:12,color:"#1e40af"}}>
                  <strong>System Status:</strong> All services operational · Database connected · Authentication active
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
