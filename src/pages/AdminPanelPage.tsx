import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import RoleGuard from "@/components/RoleGuard";
import { toast } from "@/hooks/use-toast";
import procBg from "@/assets/procurement-bg.jpg";
import {
  Settings, Palette, Shield, Bell, Database, Globe, FileText, Package,
  Truck, DollarSign, BarChart3, Save, RefreshCw, Upload, Users, Building2,
  Mail, Server, Monitor, Sliders, Key, Activity, ChevronRight,
  CheckCircle, AlertTriangle, Lock, Home, Archive, Printer, Search, Eye,
  Clock, TrendingUp, Layers, Plus, ShoppingCart, Gavel, Calendar, Scale,
  FileCheck, ClipboardList, PiggyBank, BookOpen, Cpu, ToggleLeft, ToggleRight,
  ExternalLink, Edit3, Trash2, UserPlus, X, Check, Terminal
} from "lucide-react";

const SECTIONS = [
  {id:"overview",   label:"Overview",      icon:Home,      color:"#1a3a6b"},
  {id:"hospital",   label:"Hospital Info", icon:Building2, color:"#0078d4"},
  {id:"users",      label:"Users & Roles", icon:Users,     color:"#5C2D91"},
  {id:"security",   label:"Security",      icon:Shield,    color:"#dc2626"},
  {id:"email",      label:"Email/SMTP",    icon:Mail,       color:"#107c10"},
  {id:"notify",     label:"Notifications", icon:Bell,      color:"#f59e0b"},
  {id:"modules",    label:"Modules",       icon:Sliders,   color:"#0369a1"},
  {id:"appearance", label:"Appearance",    icon:Palette,   color:"#8b5cf6"},
  {id:"database",   label:"Database",      icon:Database,  color:"#374151"},
  {id:"system",     label:"System",        icon:Server,    color:"#6b7280"},
  {id:"print",      label:"Print/Docs",    icon:Printer,   color:"#C45911"},
  {id:"backup",     label:"Backup",        icon:Archive,   color:"#065f46"},
];

const ALL_PAGES = [
  {label:"Requisitions",      path:"/requisitions",              icon:ClipboardList, desc:"Purchase requisitions",   color:"#0078d4"},
  {label:"Purchase Orders",   path:"/purchase-orders",           icon:ShoppingCart,  desc:"PO management",           color:"#C45911"},
  {label:"Goods Received",    path:"/goods-received",            icon:Package,       desc:"GRN management",          color:"#107c10"},
  {label:"Suppliers",         path:"/suppliers",                 icon:Truck,         desc:"Supplier directory",      color:"#374151"},
  {label:"Tenders",           path:"/tenders",                   icon:Gavel,         desc:"Tender management",       color:"#1F6090"},
  {label:"Bid Evaluations",   path:"/bid-evaluations",           icon:Scale,         desc:"Evaluate bids",           color:"#581c87"},
  {label:"Contracts",         path:"/contracts",                 icon:FileCheck,     desc:"Contract management",     color:"#1a3a6b"},
  {label:"Procurement Plan",  path:"/procurement-planning",      icon:Calendar,      desc:"Annual planning",         color:"#065f46"},
  {label:"Payment Vouchers",  path:"/vouchers/payment",          icon:DollarSign,    desc:"Payment processing",      color:"#5C2D91"},
  {label:"Finance Dashboard", path:"/financials/dashboard",      icon:TrendingUp,    desc:"Financial overview",      color:"#0369a1"},
  {label:"Chart of Accounts", path:"/financials/chart-of-accounts",icon:BookOpen,    desc:"Accounts",                color:"#0369a1"},
  {label:"Budgets",           path:"/financials/budgets",        icon:PiggyBank,     desc:"Budget management",       color:"#b45309"},
  {label:"Fixed Assets",      path:"/financials/fixed-assets",   icon:Building2,     desc:"Asset register",          color:"#1e40af"},
  {label:"Items / Inventory", path:"/items",                     icon:Package,       desc:"Inventory management",    color:"#00695C"},
  {label:"Barcode Scanner",   path:"/scanner",                   icon:Search,        desc:"Scan barcodes",           color:"#0e7490"},
  {label:"QC Dashboard",      path:"/quality/dashboard",         icon:Shield,        desc:"Quality control",         color:"#059669"},
  {label:"Reports",           path:"/reports",                   icon:BarChart3,     desc:"Analytics",               color:"#9333ea"},
  {label:"Documents",         path:"/documents",                 icon:FileText,      desc:"Templates & docs",        color:"#92400e"},
  {label:"Email",             path:"/email",                     icon:Mail,          desc:"System messaging",        color:"#c0185a"},
  {label:"Users",             path:"/users",                     icon:Users,         desc:"User management",         color:"#4b4b9b"},
  {label:"Database Admin",    path:"/admin/database",            icon:Database,      desc:"DB administration",       color:"#374151"},
  {label:"Settings",          path:"/settings",                  icon:Settings,      desc:"System config",           color:"#6b7280"},
  {label:"Audit Log",         path:"/audit-log",                 icon:Activity,      desc:"Activity trail",          color:"#78350f"},
  {label:"Backup",            path:"/backup",                    icon:Archive,       desc:"Data backup",             color:"#065f46"},
  {label:"Webmaster",         path:"/webmaster",                 icon:Globe,         desc:"Web configuration",       color:"#1a3a6b"},
  {label:"ODBC",              path:"/odbc",                      icon:Cpu,           desc:"ODBC connections",        color:"#374151"},
];

function Toggle({on,onChange}:{on:boolean;onChange:(v:boolean)=>void}) {
  return (
    <button onClick={()=>onChange(!on)} style={{background:"transparent",border:"none",cursor:"pointer",padding:0,lineHeight:0}}>
      <div style={{width:38,height:20,borderRadius:10,background:on?"#1a3a6b":"#d1d5db",display:"flex",alignItems:"center",padding:2,transition:"background 0.2s"}}>
        <div style={{width:16,height:16,borderRadius:"50%",background:"#fff",boxShadow:"0 1px 4px rgba(0,0,0,0.18)",transform:on?"translateX(18px)":"translateX(0)",transition:"transform 0.2s"}}/>
      </div>
    </button>
  );
}

function StatCard({label,value,icon:Icon,color}:{label:string;value:string|number;icon:any;color:string}) {
  return (
    <div style={{background:"#fff",borderRadius:10,padding:"14px 16px",border:`1px solid #e5e7eb`,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:36,height:36,borderRadius:9,background:`${color}14`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <Icon style={{width:16,height:16,color}}/>
        </div>
        <div>
          <div style={{fontSize:18,fontWeight:800,color:"#111827",lineHeight:1}}>{value}</div>
          <div style={{fontSize:10,color:"#9ca3af",marginTop:2,fontWeight:500}}>{label}</div>
        </div>
      </div>
    </div>
  );
}

export default function AdminPanelPage() {
  return <RoleGuard allowedRoles={["admin"]}><AdminPanelInner/></RoleGuard>;
}

function AdminPanelInner() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [active, setActive] = useState("overview");
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Record<string,string>>({});
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({users:0,reqs:0,pos:0,items:0,suppliers:0,tenders:0});
  const [dbTables, setDbTables] = useState<any[]>([]);
  const [sysStatus, setSysStatus] = useState({db:"ok",realtime:"ok",storage:"ok"});
  const [mobileTab, setMobileTab] = useState(false);

  useEffect(()=>{
    (supabase as any).from("system_settings").select("key,value").limit(100)
      .then(({data}:any)=>{ const m:Record<string,string>={}; data?.forEach((r:any)=>m[r.key]=r.value); setSettings(m); });
    (supabase as any).from("profiles").select("id,full_name,email,created_at").order("created_at",{ascending:false}).limit(50)
      .then(({data}:any)=>setUsers(data||[]));
    Promise.all([
      (supabase as any).from("profiles").select("id",{count:"exact",head:true}),
      (supabase as any).from("requisitions").select("id",{count:"exact",head:true}),
      (supabase as any).from("purchase_orders").select("id",{count:"exact",head:true}),
      (supabase as any).from("items").select("id",{count:"exact",head:true}),
      (supabase as any).from("suppliers").select("id",{count:"exact",head:true}),
      (supabase as any).from("tenders").select("id",{count:"exact",head:true}),
    ]).then(([u,r,p,i,s,t])=>setStats({users:u.count||0,reqs:r.count||0,pos:p.count||0,items:i.count||0,suppliers:s.count||0,tenders:t.count||0}));
  },[]);

  const saveSetting = async(key:string,value:string)=>{
    setSaving(true);
    const{error}=await(supabase as any).from("system_settings").upsert({key,value},{onConflict:"key"});
    if(error) toast({title:"Save failed",description:error.message,variant:"destructive"});
    else { setSettings(p=>({...p,[key]:value})); toast({title:"Saved ✓"}); }
    setSaving(false);
  };

  const S = (k:string,fallback="")=>settings[k]||fallback;

  const inputStyle:React.CSSProperties = {width:"100%",padding:"8px 10px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:6,outline:"none",fontFamily:"inherit"};
  const labelStyle:React.CSSProperties = {fontSize:10,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.04em"};

  return (
    <div style={{display:"flex",minHeight:"calc(100vh - 80px)",fontFamily:"'Inter','Segoe UI',sans-serif"}}>

      {/* ── LEFT SECTION TABS ── */}
      <div style={{
        width:200,flexShrink:0,background:"#fff",borderRight:"1px solid #e5e7eb",
        display:"flex",flexDirection:"column",overflow:"hidden",
      }}>
        {/* Header */}
        <div style={{
          padding:"12px",
          backgroundImage:`linear-gradient(rgba(10,37,88,0.88),rgba(10,37,88,0.88)),url(${procBg})`,
          backgroundSize:"cover",backgroundPosition:"center",
          borderBottom:"1px solid rgba(255,255,255,0.1)",
        }}>
          <div style={{fontSize:11,fontWeight:800,color:"#fff",letterSpacing:"0.04em"}}>ADMIN PANEL</div>
          <div style={{fontSize:9,color:"rgba(255,255,255,0.45)",marginTop:1}}>System Administration</div>
        </div>

        <nav style={{flex:1,overflowY:"auto",padding:"6px 0"}}>
          {SECTIONS.map(s=>(
            <button key={s.id} onClick={()=>setActive(s.id)}
              style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 12px",border:"none",cursor:"pointer",textAlign:"left" as const,background:active===s.id?`${s.color}10`:"transparent",borderLeft:active===s.id?`3px solid ${s.color}`:"3px solid transparent",transition:"all 0.1s"}}
              onMouseEnter={e=>{if(active!==s.id)(e.currentTarget as HTMLElement).style.background="#f9fafb";}}
              onMouseLeave={e=>{if(active!==s.id)(e.currentTarget as HTMLElement).style.background="transparent";}}>
              <s.icon style={{width:13,height:13,color:active===s.id?s.color:"#9ca3af",flexShrink:0}}/>
              <span style={{fontSize:11.5,fontWeight:active===s.id?700:500,color:active===s.id?s.color:"#6b7280"}}>{s.label}</span>
            </button>
          ))}
        </nav>

        <div style={{padding:"8px 12px",borderTop:"1px solid #f3f4f6",background:"#f9fafb"}}>
          <div style={{fontSize:9,color:"#9ca3af"}}>Logged in as</div>
          <div style={{fontSize:10,fontWeight:700,color:"#374151",marginTop:1}}>{profile?.full_name||"Admin"}</div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{flex:1,overflowY:"auto",background:"#f0f2f5"}}>

        {/* OVERVIEW */}
        {active==="overview"&&(
          <div style={{padding:"20px"}}>
            <div style={{marginBottom:18}}>
              <h2 style={{fontSize:16,fontWeight:800,color:"#111827",margin:0}}>System Overview</h2>
              <div style={{fontSize:12,color:"#9ca3af",marginTop:2}}>MediProcure ERP — Admin Dashboard</div>
            </div>

            {/* Stats */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:10,marginBottom:18}}>
              <StatCard label="Total Users"    value={stats.users}     icon={Users}        color="#5C2D91"/>
              <StatCard label="Requisitions"   value={stats.reqs}      icon={ClipboardList} color="#0078d4"/>
              <StatCard label="Purchase Orders"value={stats.pos}       icon={ShoppingCart} color="#C45911"/>
              <StatCard label="Stock Items"    value={stats.items}     icon={Package}      color="#107c10"/>
              <StatCard label="Suppliers"      value={stats.suppliers} icon={Truck}        color="#374151"/>
              <StatCard label="Tenders"        value={stats.tenders}   icon={Gavel}        color="#1F6090"/>
            </div>

            {/* System status */}
            <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",padding:"14px 16px",marginBottom:18}}>
              <div style={{fontSize:12,fontWeight:700,color:"#111827",marginBottom:12}}>System Status</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:8}}>
                {[
                  {label:"Database",        status:"Connected", color:"#22c55e"},
                  {label:"Real-time",       status:"Active",    color:"#22c55e"},
                  {label:"Auth Service",    status:"Running",   color:"#22c55e"},
                  {label:"Storage",         status:"Available", color:"#22c55e"},
                  {label:"Email Service",   status:S("smtp_host")?"Configured":"Not Set", color:S("smtp_host")?"#22c55e":"#f59e0b"},
                  {label:"Backup",          status:"Manual",    color:"#f59e0b"},
                ].map(s=>(
                  <div key={s.label} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",background:"#f9fafb",borderRadius:7,border:"1px solid #f3f4f6"}}>
                    <span style={{fontSize:11,color:"#374151",fontWeight:500}}>{s.label}</span>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <div style={{width:6,height:6,borderRadius:"50%",background:s.color}}/>
                      <span style={{fontSize:10,color:s.color,fontWeight:600}}>{s.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* All pages grid */}
            <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",padding:"14px 16px"}}>
              <div style={{fontSize:12,fontWeight:700,color:"#111827",marginBottom:12}}>All System Modules</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:8}}>
                {ALL_PAGES.map(p=>(
                  <button key={p.path} onClick={()=>navigate(p.path)}
                    style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:"#f9fafb",border:"1px solid #f3f4f6",borderRadius:7,cursor:"pointer",textAlign:"left" as const,transition:"all 0.12s"}}
                    onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.background=`${p.color}10`;el.style.borderColor=`${p.color}40`;}}
                    onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.background="#f9fafb";el.style.borderColor="#f3f4f6";}}>
                    <div style={{width:28,height:28,borderRadius:7,background:`${p.color}14`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <p.icon style={{width:13,height:13,color:p.color}}/>
                    </div>
                    <div style={{minWidth:0}}>
                      <div style={{fontSize:11,fontWeight:700,color:"#111827",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{p.label}</div>
                      <div style={{fontSize:9,color:"#9ca3af"}}>{p.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* HOSPITAL INFO */}
        {active==="hospital"&&(
          <div style={{padding:"20px",maxWidth:700}}>
            <h2 style={{fontSize:15,fontWeight:800,color:"#111827",marginBottom:16}}>Hospital Information</h2>
            <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",padding:"18px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                {[
                  {k:"hospital_name",   label:"Hospital Name",    placeholder:"Embu Level 5 Hospital"},
                  {k:"system_name",     label:"System Name",      placeholder:"EL5 MediProcure"},
                  {k:"hospital_address",label:"Address",          placeholder:"Embu Town, Embu County"},
                  {k:"hospital_phone",  label:"Phone",            placeholder:"+254 ..."},
                  {k:"hospital_email",  label:"Email",            placeholder:"info@embu5.go.ke"},
                  {k:"hospital_pin",    label:"KRA PIN",          placeholder:"P000..."},
                  {k:"currency",        label:"Currency",         placeholder:"KES"},
                  {k:"date_format",     label:"Date Format",      placeholder:"DD/MM/YYYY"},
                ].map(f=>(
                  <div key={f.k} style={{gridColumn:f.k==="hospital_address"?"1 / -1":undefined}}>
                    <label style={labelStyle}>{f.label}</label>
                    <input defaultValue={S(f.k)} placeholder={f.placeholder} style={inputStyle}
                      onBlur={e=>{ if(e.target.value!==S(f.k)) saveSetting(f.k,e.target.value); }}/>
                  </div>
                ))}
              </div>
              <div style={{marginTop:14,padding:"10px 12px",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:7,fontSize:11,color:"#166534"}}>
                <CheckCircle style={{width:12,height:12,display:"inline",marginRight:5}}/>
                Changes are saved automatically on field blur.
              </div>
            </div>
          </div>
        )}

        {/* USERS & ROLES */}
        {active==="users"&&(
          <div style={{padding:"20px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
              <h2 style={{fontSize:15,fontWeight:800,color:"#111827",margin:0}}>Users & Roles</h2>
              <button onClick={()=>navigate("/users")}
                style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",background:"#1a3a6b",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:11,fontWeight:700}}>
                <ExternalLink style={{width:12,height:12}}/> Manage Users
              </button>
            </div>
            <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse" as const}}>
                <thead>
                  <tr style={{background:"#f9fafb",borderBottom:"1px solid #e5e7eb"}}>
                    {["Name","Email","Joined","Action"].map(h=><th key={h} style={{padding:"9px 12px",fontSize:10,fontWeight:700,color:"#6b7280",textAlign:"left" as const,textTransform:"uppercase" as const,letterSpacing:"0.04em"}}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {users.slice(0,15).map((u,i)=>(
                    <tr key={u.id} style={{borderBottom:i<users.length-1?"1px solid #f9fafb":"none"}}
                      onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#fafafa"}
                      onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
                      <td style={{padding:"9px 12px",fontSize:12,fontWeight:600,color:"#111827"}}>{u.full_name||"—"}</td>
                      <td style={{padding:"9px 12px",fontSize:11,color:"#6b7280"}}>{u.email||"—"}</td>
                      <td style={{padding:"9px 12px",fontSize:10,color:"#9ca3af"}}>{u.created_at?new Date(u.created_at).toLocaleDateString("en-KE"):"—"}</td>
                      <td style={{padding:"9px 12px"}}>
                        <button onClick={()=>navigate("/users")} style={{fontSize:10,padding:"3px 8px",background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:4,cursor:"pointer",color:"#1d4ed8",fontWeight:600}}>Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length>15&&<div style={{padding:"8px 12px",fontSize:11,color:"#9ca3af",textAlign:"center" as const}}>+{users.length-15} more users — <button onClick={()=>navigate("/users")} style={{background:"none",border:"none",cursor:"pointer",color:"#1a3a6b",fontWeight:600}}>View all</button></div>}
            </div>
          </div>
        )}

        {/* SECURITY */}
        {active==="security"&&(
          <div style={{padding:"20px",maxWidth:600}}>
            <h2 style={{fontSize:15,fontWeight:800,color:"#111827",marginBottom:16}}>Security Settings</h2>
            <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",padding:"18px",display:"flex",flexDirection:"column",gap:12}}>
              {[
                {k:"two_factor_auth",   label:"Two-Factor Authentication",  desc:"Require 2FA for all admin users"},
                {k:"strong_passwords",  label:"Strong Password Policy",     desc:"Min 8 chars, uppercase, numbers"},
                {k:"audit_logging",     label:"Audit Logging",              desc:"Log all user actions to audit trail"},
                {k:"session_timeout",   label:"Session Auto-Timeout",       desc:"Auto-logout after inactivity"},
              ].map(s=>(
                <div key={s.k} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 12px",background:"#f9fafb",borderRadius:7,border:"1px solid #f3f4f6"}}>
                  <div>
                    <div style={{fontSize:12,fontWeight:600,color:"#111827"}}>{s.label}</div>
                    <div style={{fontSize:10,color:"#9ca3af",marginTop:1}}>{s.desc}</div>
                  </div>
                  <Toggle on={S(s.k)!=="false"} onChange={v=>saveSetting(s.k,String(v))}/>
                </div>
              ))}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:4}}>
                {[
                  {k:"session_timeout_mins",label:"Session Timeout (min)", placeholder:"30"},
                  {k:"max_login_attempts",  label:"Max Login Attempts",   placeholder:"5"},
                ].map(f=>(
                  <div key={f.k}>
                    <label style={labelStyle}>{f.label}</label>
                    <input type="number" defaultValue={S(f.k)||f.placeholder} style={inputStyle}
                      onBlur={e=>saveSetting(f.k,e.target.value)}/>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* EMAIL SMTP */}
        {active==="email"&&(
          <div style={{padding:"20px",maxWidth:600}}>
            <h2 style={{fontSize:15,fontWeight:800,color:"#111827",marginBottom:16}}>Email / SMTP Configuration</h2>
            <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",padding:"18px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                {[
                  {k:"smtp_host",      label:"SMTP Host",     placeholder:"smtp.gmail.com"},
                  {k:"smtp_port",      label:"SMTP Port",     placeholder:"587"},
                  {k:"smtp_user",      label:"SMTP User",     placeholder:"user@gmail.com"},
                  {k:"smtp_password",  label:"SMTP Password", placeholder:"••••••••",type:"password"},
                  {k:"smtp_from",      label:"From Email",    placeholder:"noreply@hospital.ke"},
                  {k:"smtp_from_name", label:"From Name",     placeholder:"EL5 MediProcure"},
                ].map(f=>(
                  <div key={f.k}>
                    <label style={labelStyle}>{f.label}</label>
                    <input type={f.type||"text"} defaultValue={S(f.k)} placeholder={f.placeholder} style={inputStyle}
                      onBlur={e=>saveSetting(f.k,e.target.value)}/>
                  </div>
                ))}
              </div>
              <div style={{marginTop:12,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 12px",background:"#f9fafb",borderRadius:7,border:"1px solid #f3f4f6"}}>
                <div><div style={{fontSize:12,fontWeight:600,color:"#111827"}}>Use TLS/SSL</div><div style={{fontSize:10,color:"#9ca3af"}}>Encrypt SMTP connection</div></div>
                <Toggle on={S("smtp_tls")!=="false"} onChange={v=>saveSetting("smtp_tls",String(v))}/>
              </div>
              <button style={{marginTop:12,padding:"8px 16px",background:"#1a3a6b",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:11,fontWeight:700,width:"100%"}}>
                <Mail style={{width:12,height:12,display:"inline",marginRight:6}}/>Test Connection
              </button>
            </div>
          </div>
        )}

        {/* NOTIFICATIONS */}
        {active==="notify"&&(
          <div style={{padding:"20px",maxWidth:600}}>
            <h2 style={{fontSize:15,fontWeight:800,color:"#111827",marginBottom:16}}>Notification Settings</h2>
            <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",padding:"18px",display:"flex",flexDirection:"column",gap:10}}>
              {[
                {k:"email_notifications_enabled",label:"Email Notifications",     desc:"Send system emails"},
                {k:"email_on_po_approve",         label:"PO Approval Emails",      desc:"Email on PO approval"},
                {k:"email_on_req_approve",        label:"Requisition Emails",      desc:"Email on req. approval"},
                {k:"email_on_grn",                label:"GRN Emails",              desc:"Email on goods received"},
                {k:"email_on_tender_close",       label:"Tender Close Emails",     desc:"Email when tender closes"},
                {k:"realtime_notifications",      label:"Real-time Notifications", desc:"Browser push notifications"},
              ].map(s=>(
                <div key={s.k} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 12px",background:"#f9fafb",borderRadius:7,border:"1px solid #f3f4f6"}}>
                  <div><div style={{fontSize:12,fontWeight:600,color:"#111827"}}>{s.label}</div><div style={{fontSize:10,color:"#9ca3af",marginTop:1}}>{s.desc}</div></div>
                  <Toggle on={S(s.k)!=="false"} onChange={v=>saveSetting(s.k,String(v))}/>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MODULES */}
        {active==="modules"&&(
          <div style={{padding:"20px",maxWidth:700}}>
            <h2 style={{fontSize:15,fontWeight:800,color:"#111827",marginBottom:16}}>Module Controls</h2>
            <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",padding:"18px",display:"flex",flexDirection:"column",gap:10}}>
              {[
                {k:"enable_documents", label:"Documents Module",    desc:"Enable document templates & uploads"},
                {k:"enable_scanner",   label:"Barcode Scanner",     desc:"Enable QR/barcode scanner"},
                {k:"enable_api",       label:"External API",        desc:"Enable external API integrations"},
                {k:"webhooks_enabled", label:"Webhooks",            desc:"Enable webhook notifications"},
                {k:"maintenance_mode", label:"Maintenance Mode",    desc:"Lock system for maintenance"},
                {k:"allow_registration",label:"User Registration",  desc:"Allow new user self-registration"},
                {k:"audit_logging_enabled",label:"Audit Logging",   desc:"Enable comprehensive audit trail"},
              ].map(s=>(
                <div key={s.k} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 12px",background:"#f9fafb",borderRadius:7,border:"1px solid #f3f4f6"}}>
                  <div><div style={{fontSize:12,fontWeight:600,color:"#111827"}}>{s.label}</div><div style={{fontSize:10,color:"#9ca3af",marginTop:1}}>{s.desc}</div></div>
                  <Toggle on={S(s.k)!=="false"} onChange={v=>saveSetting(s.k,String(v))}/>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* APPEARANCE */}
        {active==="appearance"&&(
          <div style={{padding:"20px",maxWidth:600}}>
            <h2 style={{fontSize:15,fontWeight:800,color:"#111827",marginBottom:16}}>Appearance</h2>
            <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",padding:"18px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                {[
                  {k:"primary_color",label:"Primary Color",  defaultV:"#0a2558"},
                  {k:"accent_color", label:"Accent Color",   defaultV:"#C45911"},
                ].map(f=>(
                  <div key={f.k}>
                    <label style={labelStyle}>{f.label}</label>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <input type="color" defaultValue={S(f.k)||f.defaultV}
                        style={{width:40,height:34,borderRadius:6,border:"1px solid #e5e7eb",cursor:"pointer",padding:2}}
                        onBlur={e=>saveSetting(f.k,e.target.value)}/>
                      <input value={S(f.k)||f.defaultV} onChange={e=>setSettings(p=>({...p,[f.k]:e.target.value}))}
                        style={{flex:1,...inputStyle}} onBlur={e=>saveSetting(f.k,e.target.value)}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* DATABASE */}
        {active==="database"&&(
          <div style={{padding:"20px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
              <h2 style={{fontSize:15,fontWeight:800,color:"#111827",margin:0}}>Database Administration</h2>
              <button onClick={()=>navigate("/admin/database")}
                style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",background:"#1a3a6b",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:11,fontWeight:700}}>
                <ExternalLink style={{width:12,height:12}}/> Full DB Admin
              </button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:10,marginBottom:16}}>
              {[
                {label:"Database",   val:"PostgreSQL 15", icon:Database,  color:"#1a3a6b"},
                {label:"Host",       val:"Supabase Cloud",icon:Server,    color:"#107c10"},
                {label:"Status",     val:"Connected",     icon:CheckCircle,color:"#22c55e"},
                {label:"Tables",     val:"30+",           icon:Layers,    color:"#0369a1"},
              ].map(s=>(
                <div key={s.label} style={{background:"#fff",borderRadius:9,border:"1px solid #e5e7eb",padding:"12px 14px",display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:34,height:34,borderRadius:8,background:`${s.color}14`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <s.icon style={{width:15,height:15,color:s.color}}/>
                  </div>
                  <div><div style={{fontSize:12,fontWeight:700,color:"#111827"}}>{s.val}</div><div style={{fontSize:10,color:"#9ca3af"}}>{s.label}</div></div>
                </div>
              ))}
            </div>
            <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",padding:"14px 16px"}}>
              <div style={{fontSize:12,fontWeight:700,color:"#111827",marginBottom:10}}>Quick Table Access</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:6}}>
                {["profiles","requisitions","purchase_orders","goods_received","items","suppliers","tenders","audit_log","notifications","documents","budgets","contracts"].map(t=>(
                  <button key={t} onClick={()=>navigate("/admin/database")}
                    style={{display:"flex",alignItems:"center",gap:6,padding:"7px 10px",background:"#f9fafb",border:"1px solid #f3f4f6",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:600,color:"#374151"}}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#eff6ff"}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="#f9fafb"}>
                    <Database style={{width:11,height:11,color:"#6b7280"}}/>{t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SYSTEM */}
        {active==="system"&&(
          <div style={{padding:"20px",maxWidth:700}}>
            <h2 style={{fontSize:15,fontWeight:800,color:"#111827",marginBottom:16}}>System Settings</h2>
            <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",padding:"18px",display:"flex",flexDirection:"column",gap:16}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                {[
                  {k:"date_format",label:"Date Format",   placeholder:"DD/MM/YYYY"},
                  {k:"timezone",   label:"Time Zone",     placeholder:"Africa/Nairobi"},
                  {k:"currency",   label:"Currency Code", placeholder:"KES"},
                  {k:"vat_rate",   label:"VAT Rate (%)",  placeholder:"16"},
                ].map(f=>(
                  <div key={f.k}>
                    <label style={labelStyle}>{f.label}</label>
                    <input defaultValue={S(f.k)} placeholder={f.placeholder} style={inputStyle}
                      onBlur={e=>saveSetting(f.k,e.target.value)}/>
                  </div>
                ))}
              </div>
              <div style={{borderTop:"1px solid #f3f4f6",paddingTop:14}}>
                <div style={{fontSize:11,fontWeight:700,color:"#374151",marginBottom:10}}>System Actions</div>
                <div style={{display:"flex",flexWrap:"wrap" as const,gap:8}}>
                  {[
                    {label:"Clear Cache",    icon:RefreshCw,  color:"#0369a1"},
                    {label:"Force Refresh",  icon:RefreshCw,  color:"#059669"},
                    {label:"Vacuum DB",      icon:Database,   color:"#374151"},
                    {label:"Export Audit",   icon:Archive,    color:"#78350f"},
                    {label:"Webmaster",      icon:Globe,      fn:()=>navigate("/webmaster")},
                    {label:"ODBC",           icon:Cpu,        fn:()=>navigate("/odbc")},
                  ].map(a=>(
                    <button key={a.label} onClick={(a as any).fn||undefined}
                      style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:7,cursor:"pointer",fontSize:11,fontWeight:600,color:"#374151"}}
                      onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#eff6ff"}
                      onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="#f9fafb"}>
                      <a.icon style={{width:12,height:12,color:(a as any).color||"#6b7280"}}/>{a.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PRINT */}
        {active==="print"&&(
          <div style={{padding:"20px",maxWidth:600}}>
            <h2 style={{fontSize:15,fontWeight:800,color:"#111827",marginBottom:16}}>Print & Documents</h2>
            <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",padding:"18px",display:"flex",flexDirection:"column",gap:12}}>
              {[
                {k:"print_logo",   label:"Logo on Print Output",   desc:"Show hospital logo on printed docs"},
                {k:"print_footer", label:"Footer on Printed Pages", desc:"Add footer to all print output"},
              ].map(s=>(
                <div key={s.k} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 12px",background:"#f9fafb",borderRadius:7,border:"1px solid #f3f4f6"}}>
                  <div><div style={{fontSize:12,fontWeight:600,color:"#111827"}}>{s.label}</div><div style={{fontSize:10,color:"#9ca3af",marginTop:1}}>{s.desc}</div></div>
                  <Toggle on={S(s.k)!=="false"} onChange={v=>saveSetting(s.k,String(v))}/>
                </div>
              ))}
              <div>
                <label style={labelStyle}>Print Copies (default)</label>
                <input type="number" min="1" max="10" defaultValue={S("print_copies")||"1"} style={inputStyle} onBlur={e=>saveSetting("print_copies",e.target.value)}/>
              </div>
              <div>
                <label style={labelStyle}>Footer Text</label>
                <textarea defaultValue={S("print_footer_text")||"Embu Level 5 Hospital — Procurement Management System"} rows={2}
                  style={{...inputStyle,resize:"vertical"}} onBlur={e=>saveSetting("print_footer_text",e.target.value)}/>
              </div>
              <button onClick={()=>navigate("/documents")}
                style={{padding:"8px 14px",background:"#1a3a6b",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:11,fontWeight:700,width:"100%"}}>
                <FileText style={{width:12,height:12,display:"inline",marginRight:6}}/>Open Document Templates
              </button>
            </div>
          </div>
        )}

        {/* BACKUP */}
        {active==="backup"&&(
          <div style={{padding:"20px",maxWidth:600}}>
            <h2 style={{fontSize:15,fontWeight:800,color:"#111827",marginBottom:16}}>Backup & Restore</h2>
            <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",padding:"18px",display:"flex",flexDirection:"column",gap:12}}>
              <div style={{padding:"12px",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8}}>
                <div style={{fontSize:12,fontWeight:700,color:"#166534"}}>Last Backup</div>
                <div style={{fontSize:11,color:"#15803d",marginTop:2}}>No automated backups configured — use manual backup below.</div>
              </div>
              <button onClick={()=>navigate("/backup")}
                style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"10px 14px",background:"#1a3a6b",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:700}}>
                <Archive style={{width:13,height:13}}/> Open Backup Manager
              </button>
              <div style={{fontSize:10,color:"#9ca3af",textAlign:"center" as const}}>Full backup and restore options available in the Backup Manager</div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
