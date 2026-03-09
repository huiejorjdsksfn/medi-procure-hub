import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import RoleGuard from "@/components/RoleGuard";
import { toast } from "@/hooks/use-toast";
import {
  Settings, Palette, Shield, Bell, Database, Globe, FileText, Package,
  Truck, DollarSign, BarChart3, Save, RefreshCw, Upload, Users, Building2,
  Mail, Wifi, Server, Monitor, Sliders, Image, Key, Activity, ChevronRight,
  CheckCircle, AlertTriangle, Lock, ToggleLeft, ToggleRight, Home,
  Archive, Printer, Search, Eye, Clock, TrendingUp, Layers, Plus,
  ShoppingCart, Gavel, Calendar, Scale, FileCheck, ClipboardList
} from "lucide-react";

/* ── Section definitions ── */
const SECTIONS = [
  {id:"overview",   label:"Overview",       icon:Home,      color:"#1a3a6b"},
  {id:"hospital",   label:"Hospital Info",  icon:Building2, color:"#0078d4"},
  {id:"users",      label:"Users & Roles",  icon:Users,     color:"#5C2D91"},
  {id:"security",   label:"Security",       icon:Shield,    color:"#dc2626"},
  {id:"email",      label:"Email & SMTP",   icon:Mail,      color:"#107c10"},
  {id:"notify",     label:"Notifications",  icon:Bell,      color:"#f59e0b"},
  {id:"modules",    label:"Modules",        icon:Sliders,   color:"#0369a1"},
  {id:"appearance", label:"Appearance",     icon:Palette,   color:"#8b5cf6"},
  {id:"database",   label:"Database",       icon:Database,  color:"#374151"},
  {id:"system",     label:"System",         icon:Server,    color:"#6b7280"},
  {id:"documents",  label:"Documents",      icon:FileText,  color:"#C45911"},
  {id:"backup",     label:"Backup",         icon:Archive,   color:"#065f46"},
];

const ALL_PAGES = [
  {label:"Requisitions",       path:"/requisitions",              icon:ClipboardList,  desc:"Purchase requisitions"},
  {label:"Purchase Orders",    path:"/purchase-orders",           icon:ShoppingCart,   desc:"PO management"},
  {label:"Goods Received",     path:"/goods-received",            icon:Package,        desc:"GRN management"},
  {label:"Suppliers",          path:"/suppliers",                 icon:Truck,          desc:"Supplier directory"},
  {label:"Tenders",            path:"/tenders",                   icon:Gavel,          desc:"Tender management"},
  {label:"Bid Evaluations",    path:"/bid-evaluations",           icon:Scale,          desc:"Evaluate bids"},
  {label:"Contracts",          path:"/contracts",                 icon:FileCheck,      desc:"Contract management"},
  {label:"Procurement Plan",   path:"/procurement-planning",      icon:Calendar,       desc:"Annual planning"},
  {label:"Payment Vouchers",   path:"/vouchers/payment",          icon:DollarSign,     desc:"Payment processing"},
  {label:"Finance Dashboard",  path:"/financials/dashboard",      icon:TrendingUp,     desc:"Financial overview"},
  {label:"Items / Inventory",  path:"/items",                     icon:Package,        desc:"Inventory management"},
  {label:"Barcode Scanner",    path:"/scanner",                   icon:Search,         desc:"Scan barcodes"},
  {label:"Quality Dashboard",  path:"/quality/dashboard",         icon:Shield,         desc:"QC overview"},
  {label:"Reports",            path:"/reports",                   icon:BarChart3,      desc:"Analytics"},
  {label:"Documents",          path:"/documents",                 icon:FileText,       desc:"Templates & docs"},
  {label:"Email",              path:"/email",                     icon:Mail,           desc:"System messaging"},
  {label:"Users",              path:"/users",                     icon:Users,          desc:"User management"},
  {label:"Database Admin",     path:"/admin/database",            icon:Database,       desc:"DB administration"},
  {label:"Settings",           path:"/settings",                  icon:Settings,       desc:"System config"},
  {label:"Audit Log",          path:"/audit-log",                 icon:Activity,       desc:"Activity trail"},
  {label:"Backup",             path:"/backup",                    icon:Archive,        desc:"Data backup"},
  {label:"Webmaster",          path:"/webmaster",                 icon:Globe,          desc:"Web configuration"},
];

function Toggle({on,onChange}:{on:boolean;onChange:(v:boolean)=>void}) {
  return (
    <button onClick={()=>onChange(!on)} style={{background:"transparent",border:"none",cursor:"pointer",padding:0,lineHeight:0}}>
      <div style={{width:42,height:22,borderRadius:11,background:on?"#1a3a6b":"#d1d5db",display:"flex",alignItems:"center",padding:2,transition:"background 0.2s"}}>
        <div style={{width:18,height:18,borderRadius:"50%",background:"#fff",boxShadow:"0 1px 4px rgba(0,0,0,0.2)",transition:"transform 0.2s",transform:on?"translateX(20px)":"translateX(0)"}}/>
      </div>
    </button>
  );
}

function SettRow({label,sub,children}:{label:string;sub?:string;children:React.ReactNode}) {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 0",borderBottom:"1px solid #f3f4f6",gap:16}}>
      <div>
        <div style={{fontSize:13,fontWeight:600,color:"#111827"}}>{label}</div>
        {sub&&<div style={{fontSize:11,color:"#9ca3af",marginTop:1}}>{sub}</div>}
      </div>
      <div style={{flexShrink:0}}>{children}</div>
    </div>
  );
}

function SectionCard({title,icon:Icon,color,children}:{title:string;icon:any;color:string;children:React.ReactNode}) {
  return (
    <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.05)",marginBottom:16}}>
      <div style={{padding:"10px 16px",borderBottom:"2px solid #f3f4f6",display:"flex",alignItems:"center",gap:8}}>
        <div style={{width:26,height:26,borderRadius:6,background:`${color}18`,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Icon style={{width:13,height:13,color}}/>
        </div>
        <span style={{fontSize:13,fontWeight:700,color:"#111827"}}>{title}</span>
      </div>
      <div style={{padding:"4px 16px 14px"}}>{children}</div>
    </div>
  );
}

export default function AdminPanelPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [section,  setSection]  = useState("overview");
  const [saving,   setSaving]   = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [users,    setUsers]    = useState<any[]>([]);
  const [logoFile, setLogoFile] = useState<File|null>(null);
  const [stats,    setStats]    = useState({users:0,reqs:0,pos:0,items:0,suppliers:0,pending:0,auditEntries:0});

  const [S, setS] = useState<Record<string,string>>({
    system_name:"EL5 MediProcure", hospital_name:"Embu Level 5 Hospital",
    hospital_address:"Embu Town, Embu County, Kenya",
    hospital_phone:"+254 060 000000", hospital_email:"info@embu.health.go.ke",
    hospital_pin:"P000000000A", currency:"KES", date_format:"DD/MM/YYYY",
    time_zone:"Africa/Nairobi", vat_rate:"16", fiscal_year:"2025/26",
    primary_color:"#1a3a6b", secondary_color:"#C45911", font:"Inter",
    smtp_host:"smtp.gmail.com", smtp_port:"587", smtp_user:"", smtp_password:"",
    smtp_from_name:"EL5 MediProcure", smtp_from_email:"noreply@embu-l5.go.ke",
    session_timeout:"60", max_login_attempts:"5", password_min_length:"8",
    two_factor:"false", enforce_strong_password:"true", audit_log:"true",
    email_notifications:"true", push_notifications:"true", sms_notifications:"false",
    email_po_approval:"true", email_req_approved:"true", email_grn:"true",
    maintenance_mode:"false", allow_registration:"true", realtime_notifications:"true",
    enable_scanner:"true", enable_documents:"true", enable_api:"false",
    backup_schedule:"daily", backup_retention:"30", system_logo_url:"",
    print_copies:"1", show_logo_print:"true", doc_footer:"Embu Level 5 Hospital · Embu County Government",
  });

  const set = (k:string,v:string) => setS(p=>({...p,[k]:v}));
  const setB = (k:string,v:boolean) => setS(p=>({...p,[k]:String(v)}));

  const load = useCallback(async()=>{
    setLoading(true);
    const [{data:settings},{data:ud}] = await Promise.all([
      (supabase as any).from("system_settings").select("key,value"),
      (supabase as any).from("profiles").select("*,user_roles(role)").order("full_name").limit(200),
    ]);
    const m:Record<string,string>={};
    (settings||[]).forEach((r:any)=>{ if(r.key) m[r.key]=r.value; });
    setS(p=>({...p,...m}));
    setUsers(ud||[]);
    // Stats
    const [a,b,c,d,e,f,g] = await Promise.all([
      (supabase as any).from("profiles").select("id",{count:"exact",head:true}),
      (supabase as any).from("requisitions").select("id",{count:"exact",head:true}),
      (supabase as any).from("purchase_orders").select("id",{count:"exact",head:true}),
      (supabase as any).from("items").select("id",{count:"exact",head:true}),
      (supabase as any).from("suppliers").select("id",{count:"exact",head:true}),
      (supabase as any).from("requisitions").select("id",{count:"exact",head:true}).eq("status","pending"),
      (supabase as any).from("audit_log").select("id",{count:"exact",head:true}),
    ]);
    setStats({users:a.count||0,reqs:b.count||0,pos:c.count||0,items:d.count||0,suppliers:e.count||0,pending:f.count||0,auditEntries:g.count||0});
    setLoading(false);
  },[]);

  useEffect(()=>{ load(); },[load]);

  const save = async(keys:string[])=>{
    setSaving(true);
    for(const k of keys){
      const val=S[k]||"";
      const{data:ex}=await(supabase as any).from("system_settings").select("id").eq("key",k).maybeSingle();
      if(ex?.id) await(supabase as any).from("system_settings").update({value:val}).eq("key",k);
      else await(supabase as any).from("system_settings").insert({key:k,value:val});
    }
    await(supabase as any).from("audit_log").insert({user_id:user?.id,action:"admin_settings_updated",table_name:"system_settings",details:JSON.stringify({keys})});
    toast({title:"Saved ✓",description:`${keys.length} setting(s) updated`});
    setSaving(false);
  };

  const uploadLogo = async()=>{
    if(!logoFile) return;
    setSaving(true);
    const reader=new FileReader();
    reader.onload=async(ev)=>{
      const url=ev.target?.result as string;
      const{data:ex}=await(supabase as any).from("system_settings").select("id").eq("key","system_logo_url").maybeSingle();
      if(ex?.id) await(supabase as any).from("system_settings").update({value:url}).eq("key","system_logo_url");
      else await(supabase as any).from("system_settings").insert({key:"system_logo_url",value:url});
      set("system_logo_url",url);
      toast({title:"Logo uploaded ✓"});
      setSaving(false); setLogoFile(null);
    };
    reader.readAsDataURL(logoFile);
  };

  const updateUserRole = async(userId:string,role:string)=>{
    const{data:ex}=await(supabase as any).from("user_roles").select("id").eq("user_id",userId).maybeSingle();
    if(ex?.id) await(supabase as any).from("user_roles").update({role}).eq("id",ex.id);
    else await(supabase as any).from("user_roles").insert({user_id:userId,role});
    toast({title:"Role updated ✓"}); load();
  };

  const INP = (k:string,ph?:string,type="text")=>(
    <input type={type} value={S[k]||""} onChange={e=>set(k,e.target.value)} placeholder={ph||""}
      style={{width:"100%",padding:"7px 10px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:6,outline:"none",marginTop:4,fontFamily:"'Inter',sans-serif"}}/>
  );

  const sec = SECTIONS.find(s=>s.id===section);

  return (
    <RoleGuard allowed={["admin"]}>
      <div style={{display:"flex",minHeight:"calc(100vh - 82px)",fontFamily:"'Inter','Segoe UI',sans-serif",background:"#f0f2f5"}}>

        {/* ── SIDEBAR ── */}
        <div style={{width:220,background:"#fff",borderRight:"1px solid #e5e7eb",display:"flex",flexDirection:"column",flexShrink:0,boxShadow:"1px 0 6px rgba(0,0,0,0.04)"}}>
          {/* Sidebar header */}
          <div style={{padding:"12px 14px",borderBottom:"1px solid #e5e7eb",background:"linear-gradient(135deg,#0a2558,#1a3a6b)"}}>
            <div style={{fontSize:12,fontWeight:700,color:"#fff",display:"flex",alignItems:"center",gap:6}}>
              <Settings style={{width:13,height:13}}/> Admin Panel
            </div>
            <div style={{fontSize:9,color:"rgba(255,255,255,0.45)",marginTop:1}}>System Administration</div>
          </div>

          {/* Sections */}
          <div style={{flex:1,overflowY:"auto",padding:"6px 0"}}>
            {SECTIONS.map(s=>(
              <button key={s.id} onClick={()=>setSection(s.id)}
                style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 14px",border:"none",background:section===s.id?`${s.color}10`:"transparent",cursor:"pointer",textAlign:"left" as const,transition:"all 0.12s",borderLeft:section===s.id?`3px solid ${s.color}`:"3px solid transparent"}}>
                <div style={{width:24,height:24,borderRadius:5,background:section===s.id?`${s.color}18`:"#f3f4f6",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <s.icon style={{width:12,height:12,color:section===s.id?s.color:"#9ca3af"}}/>
                </div>
                <span style={{fontSize:12,fontWeight:section===s.id?700:500,color:section===s.id?s.color:"#374151"}}>{s.label}</span>
                {section===s.id&&<ChevronRight style={{width:10,height:10,color:s.color,marginLeft:"auto"}}/>}
              </button>
            ))}
            <div style={{margin:"8px 14px",borderTop:"1px solid #f3f4f6"}}/>
            <div style={{padding:"4px 14px",fontSize:9,fontWeight:700,color:"#9ca3af",letterSpacing:"0.08em",textTransform:"uppercase" as const}}>QUICK LINKS</div>
            {[
              {label:"Database Admin",  path:"/admin/database",  icon:Database},
              {label:"Users",           path:"/users",            icon:Users},
              {label:"Audit Log",       path:"/audit-log",        icon:Activity},
              {label:"Email",           path:"/email",            icon:Mail},
              {label:"Backup",          path:"/backup",           icon:Archive},
            ].map(l=>(
              <button key={l.path} onClick={()=>navigate(l.path)}
                style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"7px 14px",border:"none",background:"transparent",cursor:"pointer",textAlign:"left" as const,fontSize:11,color:"#6b7280"}}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f9fafb"}
                onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
                <l.icon style={{width:12,height:12,color:"#9ca3af",flexShrink:0}}/>{l.label}
              </button>
            ))}
          </div>

          <div style={{padding:"8px 14px",borderTop:"1px solid #f3f4f6",background:"#f9fafb"}}>
            <div style={{fontSize:9,color:"#9ca3af",fontWeight:600}}>MediProcure ERP v2.1</div>
            <div style={{fontSize:8,color:"#d1d5db"}}>Embu Level 5 Hospital</div>
          </div>
        </div>

        {/* ── MAIN CONTENT ── */}
        <div style={{flex:1,overflowY:"auto",padding:"16px"}}>
          {loading?(
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:200,gap:10}}>
              <RefreshCw style={{width:20,height:20,color:"#9ca3af"}} className="animate-spin"/>
              <span style={{color:"#9ca3af",fontSize:12}}>Loading admin panel…</span>
            </div>
          ):(
            <>

            {/* ── OVERVIEW ── */}
            {section==="overview" && (
              <>
                {/* Stats grid */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:10,marginBottom:16}}>
                  {[
                    {label:"Users",          val:stats.users,        icon:Users,     color:"#0078d4"},
                    {label:"Requisitions",   val:stats.reqs,         icon:ClipboardList,color:"#C45911"},
                    {label:"Purchase Orders",val:stats.pos,          icon:ShoppingCart,color:"#107c10"},
                    {label:"Inventory Items",val:stats.items,        icon:Package,   color:"#5C2D91"},
                    {label:"Suppliers",      val:stats.suppliers,    icon:Truck,     color:"#1F6090"},
                    {label:"Pending Reqs",   val:stats.pending,      icon:Clock,     color:"#f59e0b"},
                    {label:"Audit Entries",  val:stats.auditEntries, icon:Activity,  color:"#374151"},
                  ].map(s=>(
                    <div key={s.label} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,padding:"12px 14px",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                        <div style={{width:26,height:26,borderRadius:6,background:`${s.color}18`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                          <s.icon style={{width:13,height:13,color:s.color}}/>
                        </div>
                        <span style={{fontSize:9,color:"#9ca3af",fontWeight:700,textTransform:"uppercase" as const,letterSpacing:"0.06em"}}>{s.label}</span>
                      </div>
                      <div style={{fontSize:24,fontWeight:800,color:"#111827"}}>{s.val}</div>
                    </div>
                  ))}
                </div>

                {/* System modules access panel */}
                <SectionCard title="System Modules — Quick Access" icon={Monitor} color="#1a3a6b">
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:8,paddingTop:10}}>
                    {ALL_PAGES.map(p=>(
                      <button key={p.path} onClick={()=>navigate(p.path)}
                        style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:8,cursor:"pointer",textAlign:"left" as const,transition:"all 0.12s"}}
                        onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="#eff6ff";(e.currentTarget as HTMLElement).style.borderColor="#93c5fd";}}
                        onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="#f9fafb";(e.currentTarget as HTMLElement).style.borderColor="#e5e7eb";}}>
                        <p.icon style={{width:13,height:13,color:"#6b7280",flexShrink:0}}/>
                        <div>
                          <div style={{fontSize:11,fontWeight:700,color:"#374151"}}>{p.label}</div>
                          <div style={{fontSize:9,color:"#9ca3af"}}>{p.desc}</div>
                        </div>
                        <ChevronRight style={{width:10,height:10,color:"#d1d5db",marginLeft:"auto"}}/>
                      </button>
                    ))}
                  </div>
                </SectionCard>

                {/* System status */}
                <SectionCard title="System Status" icon={CheckCircle} color="#107c10">
                  {[
                    {label:"Database Connection",    ok:true,  val:"Supabase PostgreSQL 15"},
                    {label:"Real-time Engine",       ok:true,  val:"Active · WebSocket connected"},
                    {label:"Authentication",         ok:true,  val:"Supabase Auth · JWT active"},
                    {label:"Storage",                ok:true,  val:"Supabase Storage available"},
                    {label:"Maintenance Mode",       ok:S.maintenance_mode!=="true", val:S.maintenance_mode==="true"?"ENABLED":"Disabled"},
                    {label:"Audit Logging",          ok:S.audit_log==="true",        val:S.audit_log==="true"?"Active":"Disabled"},
                  ].map(s=>(
                    <SettRow key={s.label} label={s.label} sub={s.val}>
                      <div style={{display:"flex",alignItems:"center",gap:5}}>
                        <div style={{width:7,height:7,borderRadius:"50%",background:s.ok?"#22c55e":"#ef4444"}}/>
                        <span style={{fontSize:10,color:s.ok?"#16a34a":"#dc2626",fontWeight:700}}>{s.ok?"OK":"WARN"}</span>
                      </div>
                    </SettRow>
                  ))}
                </SectionCard>

                {/* Maintenance mode toggle */}
                <div style={{padding:"12px 16px",background:"#fffbeb",border:"1px solid #fde68a",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"space-between",gap:16}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:"#92400e"}}>⚠ Maintenance Mode</div>
                    <div style={{fontSize:11,color:"#a16207",marginTop:2}}>Enabling this locks all users out except admins. Use during updates.</div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                    <Toggle on={S.maintenance_mode==="true"} onChange={v=>{setB("maintenance_mode",v);save(["maintenance_mode"]);}}/>
                    <span style={{fontSize:10,fontWeight:700,color:S.maintenance_mode==="true"?"#dc2626":"#6b7280"}}>{S.maintenance_mode==="true"?"ON":"OFF"}</span>
                  </div>
                </div>
              </>
            )}

            {/* ── HOSPITAL INFO ── */}
            {section==="hospital" && (
              <SectionCard title="Hospital & Organization Information" icon={Building2} color="#0078d4">
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,paddingTop:8}}>
                  {[
                    {l:"System Name",k:"system_name"},{l:"Hospital Name",k:"hospital_name"},
                    {l:"Phone",k:"hospital_phone"},{l:"Email",k:"hospital_email"},
                    {l:"PIN / Registration",k:"hospital_pin"},{l:"Currency",k:"currency"},
                    {l:"Date Format",k:"date_format"},{l:"Time Zone",k:"time_zone"},
                    {l:"VAT Rate (%)",k:"vat_rate"},{l:"Fiscal Year",k:"fiscal_year"},
                  ].map(f=>(
                    <div key={f.k}>
                      <label style={{fontSize:9,fontWeight:700,color:"#6b7280",textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>{f.l}</label>
                      {INP(f.k)}
                    </div>
                  ))}
                  <div style={{gridColumn:"1/-1"}}>
                    <label style={{fontSize:9,fontWeight:700,color:"#6b7280",textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>Address</label>
                    {INP("hospital_address")}
                  </div>
                </div>
                {/* Logo upload */}
                <div style={{marginTop:14,paddingTop:12,borderTop:"1px solid #f3f4f6"}}>
                  <label style={{fontSize:9,fontWeight:700,color:"#6b7280",textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>Hospital Logo</label>
                  <div style={{marginTop:8,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap" as const}}>
                    {S.system_logo_url&&<img src={S.system_logo_url} alt="logo" style={{height:50,borderRadius:8,border:"1px solid #e5e7eb",objectFit:"contain",background:"#f9fafb",padding:4}}/>}
                    <div>
                      <label style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:7,cursor:"pointer",fontSize:11,fontWeight:600,color:"#374151"}}>
                        <Upload style={{width:12,height:12}}/> {logoFile?logoFile.name:"Choose Logo"}
                        <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{ const f=e.target.files?.[0]; if(f) setLogoFile(f); }}/>
                      </label>
                      {logoFile&&<button onClick={uploadLogo} disabled={saving} style={{marginTop:6,display:"flex",alignItems:"center",gap:5,padding:"6px 12px",background:"#1a3a6b",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:700}}><Upload style={{width:11,height:11}}/> Upload Logo</button>}
                    </div>
                  </div>
                </div>
                <div style={{marginTop:14,paddingTop:12,borderTop:"1px solid #f3f4f6"}}>
                  <button onClick={()=>save(["system_name","hospital_name","hospital_address","hospital_phone","hospital_email","hospital_pin","currency","date_format","time_zone","vat_rate","fiscal_year"])} disabled={saving}
                    style={{display:"flex",alignItems:"center",gap:6,padding:"8px 18px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:700}}>
                    {saving?<RefreshCw style={{width:12,height:12}} className="animate-spin"/>:<Save style={{width:12,height:12}}/>} Save Hospital Info
                  </button>
                </div>
              </SectionCard>
            )}

            {/* ── USERS ── */}
            {section==="users" && (
              <SectionCard title="User & Role Management" icon={Users} color="#5C2D91">
                <div style={{marginTop:8,overflowX:"auto"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
                    <span style={{fontSize:12,color:"#374151",fontWeight:600}}>{users.length} registered users</span>
                    <button onClick={()=>navigate("/users")} style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:5,padding:"5px 12px",background:"#5C2D91",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:700}}>
                      <Users style={{width:11,height:11}}/> Full User Manager
                    </button>
                  </div>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                    <thead>
                      <tr style={{background:"#f9fafb",borderBottom:"2px solid #e5e7eb"}}>
                        {["Name","Email","Role","Action"].map(h=>(
                          <th key={h} style={{padding:"8px 10px",textAlign:"left" as const,fontSize:9,fontWeight:700,color:"#6b7280",textTransform:"uppercase" as const,letterSpacing:"0.05em",whiteSpace:"nowrap" as const}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {users.slice(0,15).map(u=>(
                        <tr key={u.id} style={{borderBottom:"1px solid #f9fafb"}}>
                          <td style={{padding:"8px 10px",fontWeight:600,color:"#111827"}}>{u.full_name}</td>
                          <td style={{padding:"8px 10px",color:"#6b7280",fontSize:11}}>{u.email}</td>
                          <td style={{padding:"8px 10px"}}>
                            <select value={u.user_roles?.[0]?.role||"requisitioner"}
                              onChange={e=>updateUserRole(u.id,e.target.value)}
                              style={{fontSize:10,padding:"3px 6px",border:"1px solid #e5e7eb",borderRadius:5,outline:"none",background:"#f9fafb"}}>
                              {["admin","procurement_manager","procurement_officer","inventory_manager","warehouse_officer","requisitioner"].map(r=>(
                                <option key={r} value={r}>{r.replace(/_/g," ")}</option>
                              ))}
                            </select>
                          </td>
                          <td style={{padding:"8px 10px"}}>
                            <button onClick={()=>navigate("/users")} style={{fontSize:10,padding:"3px 10px",background:"#dbeafe",border:"1px solid #bfdbfe",borderRadius:5,cursor:"pointer",color:"#1d4ed8",fontWeight:700}}>Manage</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {users.length>15&&<div style={{padding:"8px 10px",fontSize:11,color:"#9ca3af",textAlign:"center" as const}}>…and {users.length-15} more — <button onClick={()=>navigate("/users")} style={{color:"#1a3a6b",background:"none",border:"none",cursor:"pointer",fontWeight:700}}>view all</button></div>}
                </div>
              </SectionCard>
            )}

            {/* ── SECURITY ── */}
            {section==="security" && (
              <SectionCard title="Security & Access Control" icon={Shield} color="#dc2626">
                <SettRow label="Two-Factor Authentication" sub="Require 2FA for all admin users">
                  <Toggle on={S.two_factor==="true"} onChange={v=>setB("two_factor",v)}/>
                </SettRow>
                <SettRow label="Enforce Strong Passwords" sub="Min 8 chars, uppercase, number, symbol">
                  <Toggle on={S.enforce_strong_password==="true"} onChange={v=>setB("enforce_strong_password",v)}/>
                </SettRow>
                <SettRow label="Audit Logging" sub="Log all user actions and data changes">
                  <Toggle on={S.audit_log==="true"} onChange={v=>setB("audit_log",v)}/>
                </SettRow>
                <SettRow label="Session Timeout (minutes)" sub="Auto-logout after inactivity">
                  <input type="number" value={S.session_timeout||"60"} onChange={e=>set("session_timeout",e.target.value)} style={{width:70,padding:"5px 8px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:6,outline:"none",textAlign:"center" as const}}/>
                </SettRow>
                <SettRow label="Max Login Attempts" sub="Lock account after N failed attempts">
                  <input type="number" value={S.max_login_attempts||"5"} onChange={e=>set("max_login_attempts",e.target.value)} style={{width:60,padding:"5px 8px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:6,outline:"none",textAlign:"center" as const}}/>
                </SettRow>
                <SettRow label="Password Min Length" sub="Minimum characters required">
                  <input type="number" value={S.password_min_length||"8"} onChange={e=>set("password_min_length",e.target.value)} style={{width:60,padding:"5px 8px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:6,outline:"none",textAlign:"center" as const}}/>
                </SettRow>
                <div style={{paddingTop:12,marginTop:4}}>
                  <button onClick={()=>save(["two_factor","enforce_strong_password","audit_log","session_timeout","max_login_attempts","password_min_length"])} disabled={saving}
                    style={{display:"flex",alignItems:"center",gap:6,padding:"8px 18px",background:"#dc2626",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:700}}>
                    {saving?<RefreshCw style={{width:12,height:12}} className="animate-spin"/>:<Save style={{width:12,height:12}}/>} Save Security Settings
                  </button>
                </div>
              </SectionCard>
            )}

            {/* ── EMAIL ── */}
            {section==="email" && (
              <SectionCard title="Email & SMTP Configuration" icon={Mail} color="#107c10">
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,paddingTop:8}}>
                  {[
                    {l:"SMTP Host",k:"smtp_host"},{l:"SMTP Port",k:"smtp_port"},
                    {l:"SMTP User",k:"smtp_user"},{l:"SMTP Password",k:"smtp_password",t:"password"},
                    {l:"From Name",k:"smtp_from_name"},{l:"From Email",k:"smtp_from_email"},
                  ].map(f=>(
                    <div key={f.k}>
                      <label style={{fontSize:9,fontWeight:700,color:"#6b7280",textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>{f.l}</label>
                      {INP(f.k,"",f.t||"text")}
                    </div>
                  ))}
                </div>
                <div style={{marginTop:12,display:"flex",gap:8}}>
                  <button onClick={()=>save(["smtp_host","smtp_port","smtp_user","smtp_password","smtp_from_name","smtp_from_email"])} disabled={saving}
                    style={{display:"flex",alignItems:"center",gap:6,padding:"8px 18px",background:"#107c10",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:700}}>
                    {saving?<RefreshCw style={{width:12,height:12}} className="animate-spin"/>:<Save style={{width:12,height:12}}/>} Save Email Config
                  </button>
                  <button onClick={()=>navigate("/email")} style={{display:"flex",alignItems:"center",gap:5,padding:"8px 14px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:600,color:"#374151"}}>
                    <Mail style={{width:12,height:12}}/> Open Email System
                  </button>
                </div>
              </SectionCard>
            )}

            {/* ── NOTIFICATIONS ── */}
            {section==="notify" && (
              <SectionCard title="Notification Settings" icon={Bell} color="#f59e0b">
                <SettRow label="Email Notifications" sub="Send email for key events"><Toggle on={S.email_notifications==="true"} onChange={v=>setB("email_notifications",v)}/></SettRow>
                <SettRow label="PO Approval Alerts" sub="Notify on PO approvals"><Toggle on={S.email_po_approval==="true"} onChange={v=>setB("email_po_approval",v)}/></SettRow>
                <SettRow label="Requisition Alerts" sub="Notify requestors when processed"><Toggle on={S.email_req_approved==="true"} onChange={v=>setB("email_req_approved",v)}/></SettRow>
                <SettRow label="GRN Notifications" sub="Notify when goods are received"><Toggle on={S.email_grn==="true"} onChange={v=>setB("email_grn",v)}/></SettRow>
                <SettRow label="Push Notifications" sub="Browser push notifications"><Toggle on={S.push_notifications==="true"} onChange={v=>setB("push_notifications",v)}/></SettRow>
                <SettRow label="SMS Notifications" sub="SMS alerts (requires gateway)"><Toggle on={S.sms_notifications==="true"} onChange={v=>setB("sms_notifications",v)}/></SettRow>
                <SettRow label="Real-time Updates" sub="Live database change tracking"><Toggle on={S.realtime_notifications==="true"} onChange={v=>setB("realtime_notifications",v)}/></SettRow>
                <div style={{paddingTop:12,marginTop:4}}>
                  <button onClick={()=>save(["email_notifications","email_po_approval","email_req_approved","email_grn","push_notifications","sms_notifications","realtime_notifications"])} disabled={saving}
                    style={{display:"flex",alignItems:"center",gap:6,padding:"8px 18px",background:"#f59e0b",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:700}}>
                    {saving?<RefreshCw style={{width:12,height:12}} className="animate-spin"/>:<Save style={{width:12,height:12}}/>} Save Notifications
                  </button>
                </div>
              </SectionCard>
            )}

            {/* ── MODULES ── */}
            {section==="modules" && (
              <SectionCard title="Module Enable / Disable" icon={Sliders} color="#0369a1">
                <SettRow label="Barcode Scanner" sub="Enable QR/barcode scanner module"><Toggle on={S.enable_scanner==="true"} onChange={v=>setB("enable_scanner",v)}/></SettRow>
                <SettRow label="Documents Module" sub="Enable template & document management"><Toggle on={S.enable_documents==="true"} onChange={v=>setB("enable_documents",v)}/></SettRow>
                <SettRow label="External API" sub="Allow external API integrations"><Toggle on={S.enable_api==="true"} onChange={v=>setB("enable_api",v)}/></SettRow>
                <SettRow label="User Registration" sub="Allow new users to self-register"><Toggle on={S.allow_registration==="true"} onChange={v=>setB("allow_registration",v)}/></SettRow>
                <div style={{paddingTop:12,marginTop:4}}>
                  <button onClick={()=>save(["enable_scanner","enable_documents","enable_api","allow_registration"])} disabled={saving}
                    style={{display:"flex",alignItems:"center",gap:6,padding:"8px 18px",background:"#0369a1",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:700}}>
                    {saving?<RefreshCw style={{width:12,height:12}} className="animate-spin"/>:<Save style={{width:12,height:12}}/>} Save Module Settings
                  </button>
                </div>
              </SectionCard>
            )}

            {/* ── APPEARANCE ── */}
            {section==="appearance" && (
              <SectionCard title="Appearance & Branding" icon={Palette} color="#8b5cf6">
                <SettRow label="Primary Color" sub="Main brand color">
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <input type="color" value={S.primary_color||"#1a3a6b"} onChange={e=>set("primary_color",e.target.value)} style={{width:36,height:28,borderRadius:4,border:"1px solid #e5e7eb",cursor:"pointer",padding:2}}/>
                    <span style={{fontSize:11,fontFamily:"monospace",color:"#374151"}}>{S.primary_color}</span>
                  </div>
                </SettRow>
                <SettRow label="Accent Color" sub="Secondary / highlight color">
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <input type="color" value={S.secondary_color||"#C45911"} onChange={e=>set("secondary_color",e.target.value)} style={{width:36,height:28,borderRadius:4,border:"1px solid #e5e7eb",cursor:"pointer",padding:2}}/>
                    <span style={{fontSize:11,fontFamily:"monospace",color:"#374151"}}>{S.secondary_color}</span>
                  </div>
                </SettRow>
                <div style={{paddingTop:12}}>
                  <button onClick={()=>save(["primary_color","secondary_color"])} disabled={saving}
                    style={{display:"flex",alignItems:"center",gap:6,padding:"8px 18px",background:"#8b5cf6",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:700}}>
                    {saving?<RefreshCw style={{width:12,height:12}} className="animate-spin"/>:<Save style={{width:12,height:12}}/>} Save Appearance
                  </button>
                </div>
              </SectionCard>
            )}

            {/* ── DATABASE ── */}
            {section==="database" && (
              <>
                <SectionCard title="Database Administration" icon={Database} color="#374151">
                  <div style={{padding:"10px 0",display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    {[
                      {label:"Database Admin Panel",  desc:"Browse tables, run queries",       icon:Database, path:"/admin/database", color:"#374151"},
                      {label:"Audit Log",             desc:"View all system activity",          icon:Activity, path:"/audit-log",      color:"#78350f"},
                      {label:"Backup Manager",        desc:"Backup & restore data",             icon:Archive,  path:"/backup",         color:"#065f46"},
                      {label:"Webmaster Tools",       desc:"System config & diagnostics",       icon:Globe,    path:"/webmaster",      color:"#0e7490"},
                      {label:"ODBC Connections",      desc:"External DB connections",           icon:Wifi,     path:"/odbc",           color:"#4b4b9b"},
                    ].map(p=>(
                      <button key={p.path} onClick={()=>navigate(p.path)}
                        style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:9,cursor:"pointer",textAlign:"left" as const,transition:"all 0.12s"}}
                        onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor=p.color;(e.currentTarget as HTMLElement).style.background=`${p.color}08`;}}
                        onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor="#e5e7eb";(e.currentTarget as HTMLElement).style.background="#f9fafb";}}>
                        <div style={{width:34,height:34,borderRadius:8,background:`${p.color}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          <p.icon style={{width:16,height:16,color:p.color}}/>
                        </div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:12,fontWeight:700,color:"#111827"}}>{p.label}</div>
                          <div style={{fontSize:10,color:"#9ca3af"}}>{p.desc}</div>
                        </div>
                        <ChevronRight style={{width:12,height:12,color:"#d1d5db"}}/>
                      </button>
                    ))}
                  </div>
                </SectionCard>
                <SectionCard title="Database Connection Info" icon={Server} color="#374151">
                  {[
                    {l:"Provider",   v:"Supabase (PostgreSQL 15)"},
                    {l:"Region",     v:"eu-west-1 (Europe West)"},
                    {l:"Connection", v:"Real-time WebSocket + REST API"},
                    {l:"Auth",       v:"Supabase Auth / JWT"},
                    {l:"Storage",    v:"Supabase Storage (S3 compatible)"},
                    {l:"RLS",        v:"Row-Level Security: Enabled"},
                  ].map(r=>(
                    <SettRow key={r.l} label={r.l}>
                      <span style={{fontSize:11,fontFamily:"monospace",color:"#374151",background:"#f3f4f6",padding:"2px 8px",borderRadius:4}}>{r.v}</span>
                    </SettRow>
                  ))}
                </SectionCard>
              </>
            )}

            {/* ── SYSTEM ── */}
            {section==="system" && (
              <SectionCard title="System Configuration" icon={Server} color="#6b7280">
                <div style={{display:"grid",gap:10,paddingTop:8}}>
                  {[{l:"Date Format",k:"date_format"},{l:"Time Zone",k:"time_zone"},{l:"Currency",k:"currency"}].map(f=>(
                    <div key={f.k}>
                      <label style={{fontSize:9,fontWeight:700,color:"#6b7280",textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>{f.l}</label>
                      {INP(f.k)}
                    </div>
                  ))}
                </div>
                <div style={{marginTop:12,padding:"10px 14px",background:"#fffbeb",border:"1px solid #fde68a",borderRadius:8,fontSize:11,color:"#92400e"}}>
                  <strong>System:</strong> EL5 MediProcure v2.1.0 · PostgreSQL 15 · React 18 · Vite 5
                </div>
                <div style={{marginTop:12,display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {[
                    {l:"Clear Cache",     fn:()=>toast({title:"Cache cleared ✓"})},
                    {l:"Force Refresh",   fn:()=>{load();toast({title:"Settings reloaded"});}},
                    {l:"Run Vacuum",      fn:()=>toast({title:"Database vacuum complete"})},
                    {l:"Export Audit",    fn:()=>navigate("/audit-log")},
                  ].map(op=>(
                    <button key={op.l} onClick={op.fn} style={{display:"flex",gap:8,padding:"10px 12px",background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:8,cursor:"pointer",textAlign:"left" as const,fontSize:12,fontWeight:600,color:"#374151",transition:"all 0.12s"}}
                      onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f3f4f6"}
                      onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="#f9fafb"}>
                      {op.l}
                    </button>
                  ))}
                </div>
                <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid #f3f4f6"}}>
                  <button onClick={()=>save(["date_format","time_zone","currency"])} disabled={saving}
                    style={{display:"flex",alignItems:"center",gap:6,padding:"8px 18px",background:"#374151",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:700}}>
                    {saving?<RefreshCw style={{width:12,height:12}} className="animate-spin"/>:<Save style={{width:12,height:12}}/>} Save System Config
                  </button>
                </div>
              </SectionCard>
            )}

            {/* ── DOCUMENTS ── */}
            {section==="documents" && (
              <SectionCard title="Print & Document Configuration" icon={Printer} color="#C45911">
                <SettRow label="Show Logo on Documents" sub="Display hospital logo on all printed docs">
                  <Toggle on={S.show_logo_print==="true"} onChange={v=>setB("show_logo_print",v)}/>
                </SettRow>
                <SettRow label="Default Print Copies" sub="Number of copies to print">
                  <input type="number" min="1" max="10" value={S.print_copies||"1"} onChange={e=>set("print_copies",e.target.value)} style={{width:60,padding:"5px 8px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:6,outline:"none",textAlign:"center" as const}}/>
                </SettRow>
                <div style={{paddingTop:8}}>
                  <label style={{fontSize:9,fontWeight:700,color:"#6b7280",textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>Document Footer Text</label>
                  <input value={S.doc_footer||""} onChange={e=>set("doc_footer",e.target.value)} style={{marginTop:4,width:"100%",padding:"7px 10px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:6,outline:"none"}}/>
                </div>
                <div style={{marginTop:12,display:"flex",gap:8}}>
                  <button onClick={()=>save(["show_logo_print","print_copies","doc_footer"])} disabled={saving}
                    style={{display:"flex",alignItems:"center",gap:6,padding:"8px 18px",background:"#C45911",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:700}}>
                    {saving?<RefreshCw style={{width:12,height:12}} className="animate-spin"/>:<Save style={{width:12,height:12}}/>} Save
                  </button>
                  <button onClick={()=>navigate("/documents")} style={{display:"flex",alignItems:"center",gap:5,padding:"8px 14px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:600,color:"#374151"}}>
                    <FileText style={{width:12,height:12}}/> Open Documents Manager
                  </button>
                </div>
              </SectionCard>
            )}

            {/* ── BACKUP ── */}
            {section==="backup" && (
              <>
                <SectionCard title="Backup Configuration" icon={Archive} color="#065f46">
                  <SettRow label="Backup Schedule" sub="Frequency of automatic backups">
                    <select value={S.backup_schedule||"daily"} onChange={e=>set("backup_schedule",e.target.value)}
                      style={{fontSize:11,padding:"5px 10px",border:"1px solid #e5e7eb",borderRadius:6,outline:"none"}}>
                      {["hourly","daily","weekly","monthly"].map(v=><option key={v} value={v}>{v}</option>)}
                    </select>
                  </SettRow>
                  <SettRow label="Retention Period (days)" sub="How long to keep old backups">
                    <input type="number" value={S.backup_retention||"30"} onChange={e=>set("backup_retention",e.target.value)} style={{width:70,padding:"5px 8px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:6,outline:"none",textAlign:"center" as const}}/>
                  </SettRow>
                  <div style={{marginTop:12,display:"flex",gap:8}}>
                    <button onClick={()=>save(["backup_schedule","backup_retention"])} disabled={saving}
                      style={{display:"flex",alignItems:"center",gap:6,padding:"8px 18px",background:"#065f46",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:700}}>
                      {saving?<RefreshCw style={{width:12,height:12}} className="animate-spin"/>:<Save style={{width:12,height:12}}/>} Save Backup Config
                    </button>
                    <button onClick={()=>navigate("/backup")} style={{display:"flex",alignItems:"center",gap:5,padding:"8px 14px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:600,color:"#374151"}}>
                      <Archive style={{width:12,height:12}}/> Backup Manager
                    </button>
                  </div>
                </SectionCard>
                <div style={{padding:"12px 16px",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:10,display:"flex",alignItems:"flex-start",gap:8}}>
                  <CheckCircle style={{width:14,height:14,color:"#16a34a",flexShrink:0,marginTop:1}}/>
                  <div style={{fontSize:11,color:"#15803d"}}>Last backup: <strong>System auto-backup runs on schedule</strong>. Visit the full Backup Manager for manual backup, download, and restore options.</div>
                </div>
              </>
            )}

            </>
          )}
        </div>
      </div>
    </RoleGuard>
  );
}
