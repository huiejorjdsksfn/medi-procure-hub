import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import RoleGuard from "@/components/RoleGuard";
import { toast } from "@/hooks/use-toast";
import { notifyAdmins } from "@/lib/notify";
import {
  Settings, Palette, Shield, Bell, Database, Globe, FileText, Package,
  Truck, DollarSign, BarChart3, Save, RefreshCw, Upload, Users, Building2,
  Mail, Server, Monitor, Sliders, Key, Activity, ChevronRight, Home,
  Archive, Printer, Search, Eye, TrendingUp, Layers, ShoppingCart,
  Gavel, FileCheck, ClipboardList, PiggyBank, BookOpen, Cpu, X,
  CheckCircle, AlertTriangle, Terminal, Zap, Lock, Edit3
} from "lucide-react";
import procBg from "@/assets/procurement-bg.jpg";

const SECTIONS = [
  {id:"overview",   label:"Overview",      icon:Home,      color:"#1a3a6b"},
  {id:"hospital",   label:"Hospital Info", icon:Building2, color:"#0078d4"},
  {id:"users",      label:"Users & Roles", icon:Users,     color:"#5C2D91"},
  {id:"security",   label:"Security",      icon:Shield,    color:"#dc2626"},
  {id:"email",      label:"Email / SMTP",  icon:Mail,      color:"#107c10"},
  {id:"notify",     label:"Notifications", icon:Bell,      color:"#f59e0b"},
  {id:"modules",    label:"Modules",       icon:Sliders,   color:"#0369a1"},
  {id:"appearance", label:"Appearance",    icon:Palette,   color:"#8b5cf6"},
  {id:"database",   label:"Database",      icon:Database,  color:"#374151"},
  {id:"system",     label:"System",        icon:Server,    color:"#6b7280"},
  {id:"print",      label:"Print / Docs",  icon:Printer,   color:"#C45911"},
  {id:"backup",     label:"Backup",        icon:Archive,   color:"#065f46"},
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
  {label:"Categories",        path:"/categories",                icon:Cpu,           color:"#6b7280"},
  {label:"Procurement Plan",  path:"/procurement-planning",      icon:TrendingUp,    color:"#0a2558"},
  {label:"Payment Vouchers",  path:"/vouchers/payment",          icon:DollarSign,    color:"#C45911"},
  {label:"Receipt Vouchers",  path:"/vouchers/receipt",          icon:PiggyBank,     color:"#107c10"},
  {label:"Journal Vouchers",  path:"/vouchers/journal",          icon:BookOpen,      color:"#374151"},
  {label:"Finance Dashboard", path:"/financials",                icon:BarChart3,     color:"#1F6090"},
  {label:"Chart of Accounts", path:"/financials/chart-of-accounts",icon:FileText,    color:"#1a3a6b"},
  {label:"Budgets",           path:"/financials/budgets",        icon:TrendingUp,    color:"#059669"},
  {label:"QC Inspections",    path:"/quality/inspections",       icon:Eye,           color:"#059669"},
  {label:"Non-Conformance",   path:"/quality/non-conformance",   icon:AlertTriangle, color:"#dc2626"},
  {label:"Reports",           path:"/reports",                   icon:BarChart3,     color:"#1a3a6b"},
  {label:"Documents",         path:"/documents",                 icon:FileText,      color:"#374151"},
  {label:"Email",             path:"/email",                     icon:Mail,          color:"#7c3aed"},
  {label:"Inbox",             path:"/inbox",                     icon:Bell,          color:"#f59e0b"},
  {label:"User Manager",      path:"/users",                     icon:Users,         color:"#0369a1"},
  {label:"Settings",          path:"/settings",                  icon:Settings,      color:"#374151"},
  {label:"Audit Log",         path:"/audit-log",                 icon:Activity,      color:"#C45911"},
  {label:"DB Admin",          path:"/admin/database",            icon:Database,      color:"#0a2558"},
  {label:"Webmaster",         path:"/webmaster",                 icon:Globe,         color:"#5C2D91"},
  {label:"Scanner",           path:"/scanner",                   icon:Search,        color:"#059669"},
  {label:"Backup",            path:"/backup",                    icon:Archive,       color:"#065f46"},
  {label:"ODBC",              path:"/odbc",                      icon:Sliders,       color:"#374151"},
];

function Toggle({on,onChange}:{on:boolean;onChange:(v:boolean)=>void}) {
  return (
    <button onClick={()=>onChange(!on)} style={{background:"transparent",border:"none",cursor:"pointer",padding:0,lineHeight:0}}>
      <div style={{width:44,height:24,borderRadius:12,background:on?"#1a3a6b":"#d1d5db",display:"flex",alignItems:"center",padding:2,transition:"all 0.2s"}}>
        <div style={{width:20,height:20,borderRadius:"50%",background:"#fff",boxShadow:"0 1px 4px rgba(0,0,0,0.2)",transition:"transform 0.2s",transform:on?"translateX(20px)":"translateX(0)"}}/>
      </div>
    </button>
  );
}

function SRow({label,sub,children}:{label:string;sub?:string;children:React.ReactNode}) {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 0",borderBottom:"1px solid #f3f4f6",gap:16}}>
      <div>
        <div style={{fontSize:14,fontWeight:600,color:"#111827"}}>{label}</div>
        {sub&&<div style={{fontSize:12,color:"#9ca3af",marginTop:2}}>{sub}</div>}
      </div>
      <div style={{flexShrink:0}}>{children}</div>
    </div>
  );
}

function Panel({title,icon:Icon,color,children}:{title:string;icon:any;color:string;children:React.ReactNode}) {
  return (
    <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.05)",marginBottom:16}}>
      <div style={{padding:"12px 16px",borderBottom:"2px solid #f3f4f6",display:"flex",alignItems:"center",gap:9}}>
        <div style={{width:30,height:30,borderRadius:7,background:`${color}18`,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Icon style={{width:15,height:15,color}}/>
        </div>
        <span style={{fontSize:14,fontWeight:700,color:"#111827"}}>{title}</span>
      </div>
      <div style={{padding:"4px 16px 16px"}}>{children}</div>
    </div>
  );
}

function AdminInner() {
  const {user,profile,roles} = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState("overview");
  const [saving,  setSaving]  = useState(false);
  const [loading, setLoading] = useState(true);
  const [sysStats,setSysStats]= useState({users:0,reqs:0,pos:0,grns:0,suppliers:0,items:0,notifications:0,auditEntries:0});
  const [users_,  setUsers_]  = useState<any[]>([]);

  const [S, setS] = useState<Record<string,string>>({
    system_name:"EL5 MediProcure", hospital_name:"Embu Level 5 Hospital",
    hospital_address:"Embu Town, Embu County, Kenya",
    hospital_email:"info@embu.health.go.ke", hospital_phone:"+254 060 000000",
    smtp_host:"smtp.gmail.com", smtp_port:"587", smtp_user:"", smtp_password:"",
    smtp_from_name:"EL5 MediProcure", smtp_from_email:"",
    two_factor:"false", enforce_strong_password:"true",
    audit_log:"true", session_timeout:"60", max_login_attempts:"5",
    email_notifications:"true", push_notifications:"true", sms_notifications:"false",
    email_req_submitted:"true", email_req_approved:"true",
    email_po_created:"true", email_grn:"true", email_payment_done:"true",
    enable_procurement:"true", enable_financials:"true",
    enable_quality:"true", enable_scanner:"true",
    primary_color:"#1a3a6b", accent_color:"#C45911",
    maintenance_mode:"false", realtime_notifications:"true",
    backup_schedule:"daily", backup_retention:"30",
    show_logo_print:"true", show_stamp_print:"true",
    doc_footer:"Embu Level 5 Hospital · Embu County Government",
    system_logo_url:"",
  });
  const sv=(k:string,v:string)=>setS(p=>({...p,[k]:v}));
  const sb=(k:string,v:boolean)=>setS(p=>({...p,[k]:String(v)}));

  const load = useCallback(async()=>{
    setLoading(true);
    const [settR,usersR,statsR] = await Promise.all([
      (supabase as any).from("system_settings").select("key,value").limit(200),
      (supabase as any).from("profiles").select("*,user_roles(role)").order("created_at",{ascending:false}).limit(20),
      Promise.all([
        (supabase as any).from("requisitions").select("id",{count:"exact",head:true}),
        (supabase as any).from("purchase_orders").select("id",{count:"exact",head:true}),
        (supabase as any).from("goods_received").select("id",{count:"exact",head:true}),
        (supabase as any).from("suppliers").select("id",{count:"exact",head:true}),
        (supabase as any).from("items").select("id",{count:"exact",head:true}),
        (supabase as any).from("profiles").select("id",{count:"exact",head:true}),
        (supabase as any).from("notifications").select("id",{count:"exact",head:true}),
        (supabase as any).from("audit_log").select("id",{count:"exact",head:true}),
      ])
    ]);
    const [reqR,poR,grnR,supR,itmR,usrR,nfR,audR]=statsR;
    setSysStats({reqs:reqR.count||0,pos:poR.count||0,grns:grnR.count||0,suppliers:supR.count||0,items:itmR.count||0,users:usrR.count||0,notifications:nfR.count||0,auditEntries:audR.count||0});
    setUsers_(usersR.data||[]);
    const m:Record<string,string>={};
    (settR.data||[]).forEach((r:any)=>{if(r.key)m[r.key]=r.value;});
    setS(p=>({...p,...m}));
    setLoading(false);
  },[]);

  useEffect(()=>{ load(); },[load]);

  const saveSection = async(keys:string[])=>{
    setSaving(true);
    for(const k of keys){
      const val=S[k]??"";
      const{data:ex}=await(supabase as any).from("system_settings").select("id").eq("key",k).maybeSingle();
      if(ex?.id) await(supabase as any).from("system_settings").update({value:val}).eq("key",k);
      else await(supabase as any).from("system_settings").insert({key:k,value:val,category:section});
    }
    if(keys.includes("maintenance_mode")||keys.includes("primary_color")){
      await notifyAdmins({title:"Admin Panel: Settings Changed",message:`${profile?.full_name||"Admin"} updated ${section} settings`,type:"system",module:"Admin"});
    }
    toast({title:"Saved ✓",description:`${keys.length} settings updated globally`});
    setSaving(false);
  };

  const updateRole = async(uid:string,role:string)=>{
    const{data:ex}=await(supabase as any).from("user_roles").select("id").eq("user_id",uid).maybeSingle();
    if(ex?.id) await(supabase as any).from("user_roles").update({role}).eq("id",ex.id);
    else await(supabase as any).from("user_roles").insert({user_id:uid,role});
    toast({title:"Role updated ✓"}); load();
  };

  const INP=(k:string,ph?:string,type="text")=>(
    <input type={type} value={S[k]||""} onChange={e=>sv(k,e.target.value)} placeholder={ph||""}
      style={{width:"100%",padding:"9px 12px",fontSize:13,border:"1px solid #e5e7eb",borderRadius:7,outline:"none"}}/>
  );

  const SB=({keys,label,color="#1a3a6b"}:{keys:string[];label?:string;color?:string})=>(
    <button onClick={()=>saveSection(keys)} disabled={saving}
      style={{display:"flex",alignItems:"center",gap:6,padding:"9px 20px",background:color,color:"#fff",border:"none",borderRadius:7,cursor:saving?"not-allowed":"pointer",fontSize:13,fontWeight:700,marginTop:14,opacity:saving?0.8:1}}>
      {saving?<RefreshCw style={{width:13,height:13}} className="animate-spin"/>:<Save style={{width:13,height:13}}/>}
      {saving?"Saving…":`Save ${label||""}`}
    </button>
  );

  const STAT_CARDS = [
    {l:"Users",         v:sysStats.users,         icon:Users,     c:"#0078d4", path:"/users"},
    {l:"Requisitions",  v:sysStats.reqs,          icon:ClipboardList,c:"#C45911",path:"/requisitions"},
    {l:"Purchase Orders",v:sysStats.pos,          icon:ShoppingCart,c:"#107c10",path:"/purchase-orders"},
    {l:"GRNs",          v:sysStats.grns,          icon:Package,   c:"#1F6090", path:"/goods-received"},
    {l:"Suppliers",     v:sysStats.suppliers,     icon:Truck,     c:"#374151", path:"/suppliers"},
    {l:"Inventory Items",v:sysStats.items,        icon:Layers,    c:"#059669", path:"/items"},
    {l:"Notifications", v:sysStats.notifications, icon:Bell,      c:"#f59e0b", path:"/inbox"},
    {l:"Audit Entries", v:sysStats.auditEntries,  icon:Activity,  c:"#dc2626", path:"/audit-log"},
  ];

  return (
    <div style={{display:"flex",minHeight:"calc(100vh - 82px)",fontFamily:"'Inter','Segoe UI',sans-serif",background:"#f0f2f5"}}>

      {/* ── LEFT SIDEBAR ── */}
      <div style={{width:220,background:"#fff",borderRight:"1px solid #e5e7eb",display:"flex",flexDirection:"column",flexShrink:0,boxShadow:"1px 0 4px rgba(0,0,0,0.04)"}}>
        <div style={{padding:"12px 14px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)"}}>
          <div style={{fontSize:14,fontWeight:800,color:"#fff",display:"flex",alignItems:"center",gap:7}}><Settings style={{width:14,height:14}}/> Admin Panel</div>
          <div style={{fontSize:10,color:"rgba(255,255,255,0.45)"}}>EL5 MediProcure Control</div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"5px 0"}}>
          {SECTIONS.map(s=>(
            <button key={s.id} onClick={()=>setSection(s.id)}
              style={{display:"flex",alignItems:"center",gap:9,width:"100%",padding:"9px 14px",border:"none",background:section===s.id?`${s.color}10`:"transparent",cursor:"pointer",textAlign:"left" as const,borderLeft:section===s.id?`3px solid ${s.color}`:"3px solid transparent",transition:"all 0.1s"}}>
              <div style={{width:26,height:26,borderRadius:6,background:section===s.id?`${s.color}18`:"#f3f4f6",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <s.icon style={{width:13,height:13,color:section===s.id?s.color:"#9ca3af"}}/>
              </div>
              <span style={{fontSize:13,fontWeight:section===s.id?700:500,color:section===s.id?s.color:"#374151"}}>{s.label}</span>
              {section===s.id&&<ChevronRight style={{width:10,height:10,color:s.color,marginLeft:"auto"}}/>}
            </button>
          ))}
        </div>
        <div style={{padding:"8px 12px",borderTop:"1px solid #f3f4f6",background:"#f9fafb",fontSize:10,color:"#9ca3af",fontWeight:600}}>
          EL5 MediProcure v2.1
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={{flex:1,overflowY:"auto"}}>

        {/* ── OVERVIEW ── */}
        {section==="overview"&&(
          <>
            {/* Hero banner */}
            <div style={{position:"relative",height:140,overflow:"hidden"}}>
              <img src={procBg} alt="" style={{width:"100%",height:"100%",objectFit:"cover",filter:"brightness(0.22)"}}/>
              <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",padding:"0 24px",gap:16}}>
                <div>
                  <div style={{fontSize:20,fontWeight:900,color:"#fff",lineHeight:1.2}}>{S.hospital_name||"Embu Level 5 Hospital"}</div>
                  <div style={{fontSize:13,color:"rgba(255,255,255,0.6)",marginTop:4}}>{S.system_name||"EL5 MediProcure"} · Admin Control Panel · {new Date().toLocaleDateString("en-KE",{dateStyle:"long"})}</div>
                  <div style={{marginTop:8,display:"flex",gap:8}}>
                    <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:5,background:"rgba(255,255,255,0.15)",color:"#fff",border:"1px solid rgba(255,255,255,0.2)"}}>
                      {profile?.full_name||"Admin"} · {roles[0]||"admin"}
                    </span>
                    {S.maintenance_mode==="true"&&<span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:5,background:"#dc2626",color:"#fff"}}>⚠ MAINTENANCE MODE</span>}
                  </div>
                </div>
              </div>
            </div>

            <div style={{padding:16}}>
              {/* Stats grid */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12,marginBottom:18}}>
                {STAT_CARDS.map(c=>(
                  <button key={c.l} onClick={()=>navigate(c.path)}
                    style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,padding:"14px 16px",cursor:"pointer",textAlign:"left" as const,transition:"all 0.12s",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}
                    onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor=c.c;(e.currentTarget as HTMLElement).style.transform="translateY(-2px)";}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor="#e5e7eb";(e.currentTarget as HTMLElement).style.transform="none";}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                      <div style={{width:28,height:28,borderRadius:6,background:`${c.c}18`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <c.icon style={{width:13,height:13,color:c.c}}/>
                      </div>
                    </div>
                    <div style={{fontSize:26,fontWeight:900,color:"#111827",lineHeight:1}}>{loading?"…":c.v.toLocaleString()}</div>
                    <div style={{fontSize:11,fontWeight:600,color:"#9ca3af",marginTop:4,textTransform:"uppercase" as const,letterSpacing:"0.04em"}}>{c.l}</div>
                  </button>
                ))}
              </div>

              {/* System Modules grid */}
              <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.05)",marginBottom:16}}>
                <div style={{padding:"12px 16px",borderBottom:"2px solid #f3f4f6",display:"flex",alignItems:"center",gap:8}}>
                  <Globe style={{width:14,height:14,color:"#1a3a6b"}}/>
                  <span style={{fontSize:14,fontWeight:700,color:"#111827",flex:1}}>All System Modules</span>
                  <span style={{fontSize:11,color:"#9ca3af"}}>{ALL_MODULES.length} modules</span>
                </div>
                <div style={{padding:12,display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:8}}>
                  {ALL_MODULES.map(m=>(
                    <button key={m.path} onClick={()=>navigate(m.path)}
                      style={{display:"flex",alignItems:"center",gap:9,padding:"9px 12px",background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:8,cursor:"pointer",textAlign:"left" as const,transition:"all 0.12s"}}
                      onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=`${m.color}10`;(e.currentTarget as HTMLElement).style.borderColor=m.color;}}
                      onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="#f9fafb";(e.currentTarget as HTMLElement).style.borderColor="#e5e7eb";}}>
                      <div style={{width:28,height:28,borderRadius:6,background:`${m.color}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <m.icon style={{width:13,height:13,color:m.color}}/>
                      </div>
                      <span style={{fontSize:12,fontWeight:600,color:"#374151",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* System status + maintenance toggle */}
              <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
                <div style={{padding:"12px 16px",borderBottom:"2px solid #f3f4f6"}}>
                  <span style={{fontSize:14,fontWeight:700,color:"#111827"}}>System Status</span>
                </div>
                <div style={{padding:"0 16px 12px"}}>
                  <SRow label="Maintenance Mode" sub="Locks non-admin users out of the system">
                    <Toggle on={S.maintenance_mode==="true"} onChange={v=>{sb("maintenance_mode",v);saveSection(["maintenance_mode"]);}}/>
                  </SRow>
                  <SRow label="Real-time Notifications" sub="Live WebSocket updates across all users">
                    <Toggle on={S.realtime_notifications==="true"} onChange={v=>{sb("realtime_notifications",v);saveSection(["realtime_notifications"]);}}/>
                  </SRow>
                  <SRow label="Audit Logging" sub="Track all user actions and data changes">
                    <Toggle on={S.audit_log==="true"} onChange={v=>{sb("audit_log",v);saveSection(["audit_log"]);}}/>
                  </SRow>
                  {[
                    {label:"Database Admin",   path:"/admin/database",icon:Database,  color:"#374151"},
                    {label:"Webmaster Panel",  path:"/webmaster",     icon:Globe,     color:"#5C2D91"},
                    {label:"Audit Log",        path:"/audit-log",     icon:Activity,  color:"#C45911"},
                    {label:"Backup Manager",   path:"/backup",        icon:Archive,   color:"#065f46"},
                    {label:"ODBC Connections", path:"/odbc",          icon:Sliders,   color:"#374151"},
                  ].map(b=>(
                    <button key={b.path} onClick={()=>navigate(b.path)}
                      style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px 0",borderBottom:"1px solid #f9fafb",background:"transparent",border:"none",cursor:"pointer",textAlign:"left" as const}}>
                      <div style={{width:28,height:28,borderRadius:6,background:`${b.color}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <b.icon style={{width:13,height:13,color:b.color}}/>
                      </div>
                      <span style={{fontSize:13,fontWeight:600,color:"#374151",flex:1}}>{b.label}</span>
                      <ChevronRight style={{width:12,height:12,color:"#d1d5db"}}/>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── HOSPITAL INFO ── */}
        {section==="hospital"&&(
          <div style={{padding:16}}>
            <Panel title="Hospital & Organization Info" icon={Building2} color="#0078d4">
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,paddingTop:10}}>
                {[{l:"System Name",k:"system_name"},{l:"Hospital Name",k:"hospital_name"},{l:"Email",k:"hospital_email"},{l:"Phone",k:"hospital_phone"},{l:"Website",k:"hospital_website"},{l:"County",k:"hospital_county"},{l:"KRA PIN",k:"hospital_pin"},{l:"Director / CEO",k:"org_ceo"}].map(f=>(
                  <div key={f.k}><label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>{f.l}</label>{INP(f.k)}</div>
                ))}
                <div style={{gridColumn:"1/-1"}}><label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>Physical Address</label>{INP("hospital_address")}</div>
              </div>
              <SB keys={["system_name","hospital_name","hospital_email","hospital_phone","hospital_address","hospital_county","hospital_pin","org_ceo"]} label="Hospital Info" color="#0078d4"/>
            </Panel>
          </div>
        )}

        {/* ── USERS ── */}
        {section==="users"&&(
          <div style={{padding:16}}>
            <Panel title="Users & Role Management" icon={Users} color="#5C2D91">
              <div style={{display:"flex",justifyContent:"flex-end",gap:8,paddingTop:8}}>
                <button onClick={()=>navigate("/users")} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 16px",background:"#5C2D91",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:13,fontWeight:700}}>
                  <Users style={{width:13,height:13}}/> Open Full User Manager
                </button>
              </div>
              <div style={{overflowX:"auto",marginTop:10}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead>
                    <tr style={{background:"#f9fafb",borderBottom:"2px solid #e5e7eb"}}>
                      {["Name","Email","Role","Status","Quick Actions"].map(h=>(
                        <th key={h} style={{padding:"9px 12px",textAlign:"left" as const,fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users_.map(u=>(
                      <tr key={u.id} style={{borderBottom:"1px solid #f9fafb"}}
                        onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#fafafa"}
                        onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
                        <td style={{padding:"9px 12px",fontWeight:700,color:"#111827"}}>{u.full_name}</td>
                        <td style={{padding:"9px 12px",color:"#6b7280",fontSize:12}}>{u.email}</td>
                        <td style={{padding:"9px 12px"}}>
                          <select value={u.user_roles?.[0]?.role||"requisitioner"} onChange={e=>updateRole(u.id,e.target.value)}
                            style={{fontSize:11,padding:"4px 8px",border:"1px solid #e5e7eb",borderRadius:5,outline:"none",background:"#f9fafb",color:"#374151"}}>
                            {["admin","procurement_manager","procurement_officer","inventory_manager","warehouse_officer","requisitioner"].map(r=>(
                              <option key={r} value={r}>{r.replace(/_/g," ")}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{padding:"9px 12px"}}>
                          <span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:4,background:u.is_active!==false?"#dcfce7":"#fee2e2",color:u.is_active!==false?"#15803d":"#dc2626"}}>{u.is_active!==false?"Active":"Inactive"}</span>
                        </td>
                        <td style={{padding:"9px 12px"}}>
                          <button onClick={()=>navigate("/users")} style={{fontSize:11,padding:"3px 10px",background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:5,cursor:"pointer",color:"#1d4ed8",fontWeight:700}}>Full Edit</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        )}

        {/* ── SECURITY ── */}
        {section==="security"&&(
          <div style={{padding:16}}>
            <Panel title="Security Configuration" icon={Shield} color="#dc2626">
              {[["Two-Factor Auth","two_factor","Require 2FA for login"],["Enforce Strong Password","enforce_strong_password","Password complexity requirements"],["Audit All Actions","audit_log","Log every user action and data change"],["Maintenance Mode","maintenance_mode","Lock non-admin users out"]].map(([l,k,s])=>(
                <SRow key={k} label={l} sub={s}><Toggle on={S[k]==="true"} onChange={v=>sb(k,v)}/></SRow>
              ))}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,paddingTop:10}}>
                {[{l:"Session Timeout (min)",k:"session_timeout"},{l:"Max Login Attempts",k:"max_login_attempts"},{l:"Min Password Length",k:"password_min_length"}].map(f=>(
                  <div key={f.k}><label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>{f.l}</label>
                    <input type="number" value={S[f.k]||""} onChange={e=>sv(f.k,e.target.value)} style={{width:"100%",padding:"9px 12px",fontSize:13,border:"1px solid #e5e7eb",borderRadius:7,outline:"none"}}/></div>
                ))}
              </div>
              <SB keys={["two_factor","enforce_strong_password","audit_log","maintenance_mode","session_timeout","max_login_attempts","password_min_length"]} label="Security" color="#dc2626"/>
            </Panel>
          </div>
        )}

        {/* ── EMAIL ── */}
        {section==="email"&&(
          <div style={{padding:16}}>
            <Panel title="Email / SMTP Settings" icon={Mail} color="#107c10">
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,paddingTop:10}}>
                {[{l:"SMTP Host",k:"smtp_host",ph:"smtp.gmail.com"},{l:"SMTP Port",k:"smtp_port",ph:"587"},{l:"Username",k:"smtp_user"},{l:"Password",k:"smtp_password",t:"password"},{l:"From Name",k:"smtp_from_name"},{l:"From Email",k:"smtp_from_email"}].map(f=>(
                  <div key={f.k}><label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>{f.l}</label>{INP(f.k,f.ph,f.t)}</div>
                ))}
              </div>
              <div style={{display:"flex",gap:8}}>
                <SB keys={["smtp_host","smtp_port","smtp_user","smtp_password","smtp_from_name","smtp_from_email"]} label="Email Config" color="#107c10"/>
                <button onClick={()=>navigate("/email")} style={{display:"flex",alignItems:"center",gap:5,padding:"9px 14px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:7,cursor:"pointer",fontSize:13,fontWeight:600,color:"#374151",marginTop:14}}>
                  <Mail style={{width:13,height:13}}/> Open Email
                </button>
              </div>
            </Panel>
          </div>
        )}

        {/* ── NOTIFICATIONS ── */}
        {section==="notify"&&(
          <div style={{padding:16}}>
            <Panel title="Notification Settings" icon={Bell} color="#f59e0b">
              {[["Email Notifications","email_notifications","Global email system"],["Push Notifications","push_notifications","In-app browser notifications"],["SMS Notifications","sms_notifications","SMS via gateway"],["Notify on Req Submitted","email_req_submitted","Alert when requisition is submitted"],["Notify on Req Approved","email_req_approved","Alert requester on approval"],["Notify on PO Created","email_po_created","Alert on new purchase order"],["Notify on GRN","email_grn","Alert on goods receipt"],["Notify on Payment","email_payment_done","Alert on payment processing"],["Real-time Updates","realtime_notifications","Live WebSocket notifications"]].map(([l,k,s])=>(
                <SRow key={k} label={l} sub={s}><Toggle on={S[k]==="true"} onChange={v=>sb(k,v)}/></SRow>
              ))}
              <SB keys={["email_notifications","push_notifications","sms_notifications","email_req_submitted","email_req_approved","email_po_created","email_grn","email_payment_done","realtime_notifications"]} label="Notifications" color="#f59e0b"/>
            </Panel>
          </div>
        )}

        {/* ── MODULES ── */}
        {section==="modules"&&(
          <div style={{padding:16}}>
            <Panel title="Module Toggles" icon={Sliders} color="#0369a1">
              {[["Procurement Module","enable_procurement","Requisitions, POs, Tenders, Contracts"],["Financial Module","enable_financials","Vouchers, Budgets, Chart of Accounts"],["Quality Module","enable_quality","Inspections, Non-Conformance Reports"],["Barcode Scanner","enable_scanner","Physical goods scanning & lookup"]].map(([l,k,s])=>(
                <SRow key={k} label={l} sub={s}><Toggle on={S[k]==="true"} onChange={v=>sb(k,v)}/></SRow>
              ))}
              <SB keys={["enable_procurement","enable_financials","enable_quality","enable_scanner"]} label="Modules" color="#0369a1"/>
            </Panel>
          </div>
        )}

        {/* ── APPEARANCE ── */}
        {section==="appearance"&&(
          <div style={{padding:16}}>
            <Panel title="Appearance & Branding" icon={Palette} color="#8b5cf6">
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,paddingTop:10}}>
                {[{l:"Primary Color",k:"primary_color",def:"#1a3a6b"},{l:"Accent Color",k:"accent_color",def:"#C45911"}].map(f=>(
                  <div key={f.k}>
                    <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:6,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>{f.l}</label>
                    <div style={{display:"flex",gap:10,alignItems:"center"}}>
                      <input type="color" value={S[f.k]||f.def} onChange={e=>sv(f.k,e.target.value)} style={{width:44,height:36,borderRadius:6,border:"1px solid #e5e7eb",cursor:"pointer",padding:2}}/>
                      <input value={S[f.k]||f.def} onChange={e=>sv(f.k,e.target.value)} style={{flex:1,padding:"9px 12px",fontSize:12,fontFamily:"monospace",border:"1px solid #e5e7eb",borderRadius:7,outline:"none"}}/>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{marginTop:12,padding:"12px 16px",background:"#f9fafb",borderRadius:8,border:"1px solid #e5e7eb",display:"flex",gap:10,alignItems:"center",flexWrap:"wrap" as const}}>
                <span style={{fontSize:11,color:"#9ca3af",fontWeight:700}}>PREVIEW:</span>
                <button style={{padding:"7px 16px",background:S.primary_color||"#1a3a6b",color:"#fff",border:"none",borderRadius:7,fontSize:13,fontWeight:700}}>Primary</button>
                <button style={{padding:"7px 16px",background:S.accent_color||"#C45911",color:"#fff",border:"none",borderRadius:7,fontSize:13,fontWeight:700}}>Accent</button>
                <span style={{padding:"3px 10px",background:`${S.primary_color||"#1a3a6b"}18`,color:S.primary_color||"#1a3a6b",borderRadius:4,fontSize:12,fontWeight:700}}>Badge</span>
              </div>
              <SB keys={["primary_color","accent_color"]} label="Appearance" color="#8b5cf6"/>
            </Panel>
          </div>
        )}

        {/* ── DATABASE ── */}
        {section==="database"&&(
          <div style={{padding:16}}>
            <Panel title="Database & System Tools" icon={Database} color="#374151">
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,paddingTop:10}}>
                {[
                  {l:"Database Admin",  icon:Database,  color:"#374151", path:"/admin/database",desc:"DBHawk-style SQL runner, table browser"},
                  {l:"Audit Log",       icon:Activity,  color:"#C45911", path:"/audit-log",     desc:"View all user actions and changes"},
                  {l:"Backup Manager",  icon:Archive,   color:"#065f46", path:"/backup",         desc:"Export and restore database tables"},
                  {l:"ODBC Connections",icon:Sliders,   color:"#374151", path:"/odbc",           desc:"Manage external DB connections"},
                  {l:"Webmaster Panel", icon:Globe,     color:"#5C2D91", path:"/webmaster",      desc:"Advanced system diagnostics & API keys"},
                  {l:"Scanner",         icon:Search,    color:"#059669", path:"/scanner",         desc:"Barcode & QR code lookup tool"},
                ].map(b=>(
                  <button key={b.path} onClick={()=>navigate(b.path)}
                    style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:9,cursor:"pointer",textAlign:"left" as const,transition:"all 0.12s"}}
                    onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor=b.color;(e.currentTarget as HTMLElement).style.background=`${b.color}08`;}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor="#e5e7eb";(e.currentTarget as HTMLElement).style.background="#f9fafb";}}>
                    <div style={{width:36,height:36,borderRadius:8,background:`${b.color}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <b.icon style={{width:16,height:16,color:b.color}}/>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:700,color:"#374151"}}>{b.l}</div>
                      <div style={{fontSize:11,color:"#9ca3af"}}>{b.desc}</div>
                    </div>
                    <ChevronRight style={{width:12,height:12,color:"#d1d5db",flexShrink:0}}/>
                  </button>
                ))}
              </div>
            </Panel>
          </div>
        )}

        {/* ── SYSTEM ── */}
        {section==="system"&&(
          <div style={{padding:16}}>
            <Panel title="System Configuration" icon={Server} color="#6b7280">
              {[["Maintenance Mode","maintenance_mode","Locks non-admin users out"],["Allow Registration","allow_registration","Let new users self-register"],["Real-time Notifications","realtime_notifications","Live WebSocket event streaming"]].map(([l,k,s])=>(
                <SRow key={k} label={l} sub={s}><Toggle on={S[k]==="true"} onChange={v=>sb(k,v)}/></SRow>
              ))}
              <SB keys={["maintenance_mode","allow_registration","realtime_notifications"]} label="System" color="#6b7280"/>
            </Panel>
          </div>
        )}

        {/* ── PRINT ── */}
        {section==="print"&&(
          <div style={{padding:16}}>
            <Panel title="Print & Document Settings" icon={Printer} color="#C45911">
              {[["Show Logo","show_logo_print","Display hospital logo on prints"],["Show Stamp","show_stamp_print","Include official stamp field"]].map(([l,k,s])=>(
                <SRow key={k} label={l} sub={s}><Toggle on={S[k]==="true"} onChange={v=>sb(k,v)}/></SRow>
              ))}
              <div style={{paddingTop:10}}>
                <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>Document Footer</label>
                {INP("doc_footer")}
              </div>
              <div style={{display:"flex",gap:8}}>
                <SB keys={["show_logo_print","show_stamp_print","doc_footer"]} label="Print Settings" color="#C45911"/>
                <button onClick={()=>navigate("/documents")} style={{display:"flex",alignItems:"center",gap:5,padding:"9px 14px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:7,cursor:"pointer",fontSize:13,fontWeight:600,color:"#374151",marginTop:14}}>
                  <FileText style={{width:13,height:13}}/> Documents
                </button>
              </div>
            </Panel>
          </div>
        )}

        {/* ── BACKUP ── */}
        {section==="backup"&&(
          <div style={{padding:16}}>
            <Panel title="Backup Configuration" icon={Archive} color="#065f46">
              <div style={{paddingTop:10}}>
                <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>Backup Schedule</label>
                <select value={S.backup_schedule||"daily"} onChange={e=>sv("backup_schedule",e.target.value)} style={{width:"100%",padding:"9px 12px",fontSize:13,border:"1px solid #e5e7eb",borderRadius:7,outline:"none"}}>
                  {["hourly","daily","weekly","monthly"].map(o=><option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div style={{paddingTop:10}}>
                <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>Retention (days)</label>
                <input type="number" value={S.backup_retention||"30"} onChange={e=>sv("backup_retention",e.target.value)} style={{width:"100%",padding:"9px 12px",fontSize:13,border:"1px solid #e5e7eb",borderRadius:7,outline:"none"}}/>
              </div>
              <div style={{display:"flex",gap:8}}>
                <SB keys={["backup_schedule","backup_retention"]} label="Backup Config" color="#065f46"/>
                <button onClick={()=>navigate("/backup")} style={{display:"flex",alignItems:"center",gap:5,padding:"9px 14px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:7,cursor:"pointer",fontSize:13,fontWeight:600,color:"#374151",marginTop:14}}>
                  <Archive style={{width:13,height:13}}/> Backup Manager
                </button>
              </div>
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminPanelPage() {
  return <RoleGuard allowed={["admin"]}><AdminInner/></RoleGuard>;
}
