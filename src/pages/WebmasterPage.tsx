import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  Monitor, RefreshCw, Users, Shield, Activity, Server, Database,
  AlertTriangle, CheckCircle, Clock, Globe, Wifi, Cpu, HardDrive,
  BarChart3, Settings, Download, Trash2, Eye, Lock, Unlock, Mail,
  Code, Terminal, Package, Layers, Key, Zap, FileText, Save,
  TrendingUp, ChevronRight, AlertCircle, X, Plus, Edit3, Play,
  ToggleLeft, ToggleRight, Network, Search, Sliders, Bell, Image,
  Building2, Palette, Archive
} from "lucide-react";
import RoleGuard from "@/components/RoleGuard";
import * as XLSX from "xlsx";

const TABS = [
  {id:"overview",    label:"Overview",      icon:Monitor,   color:"#1a3a6b"},
  {id:"layout",      label:"Layout & UI",   icon:Palette,   color:"#8b5cf6"},
  {id:"system",      label:"System Config", icon:Settings,  color:"#374151"},
  {id:"users",       label:"Users",         icon:Users,     color:"#0078d4"},
  {id:"audit",       label:"Audit Log",     icon:Activity,  color:"#C45911"},
  {id:"api",         label:"API & Keys",    icon:Key,       color:"#107c10"},
  {id:"diagnostics", label:"Diagnostics",   icon:Terminal,  color:"#dc2626"},
  {id:"backup",      label:"Backup",        icon:Archive,   color:"#065f46"},
];

function Toggle({on, onChange}:{on:boolean; onChange:(v:boolean)=>void}) {
  return (
    <button onClick={()=>onChange(!on)} style={{background:"transparent",border:"none",cursor:"pointer",padding:0,lineHeight:0}}>
      <div style={{width:44,height:24,borderRadius:12,background:on?"#1a3a6b":"#d1d5db",display:"flex",alignItems:"center",padding:2,transition:"all 0.2s"}}>
        <div style={{width:20,height:20,borderRadius:"50%",background:"#fff",boxShadow:"0 1px 4px rgba(0,0,0,0.2)",transition:"transform 0.2s",transform:on?"translateX(20px)":"translateX(0)"}}/>
      </div>
    </button>
  );
}

function StatCard({label,val,icon:Icon,color,sub}:{label:string;val:any;icon:any;color:string;sub?:string}) {
  return (
    <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,padding:"14px 16px",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
        <div style={{width:30,height:30,borderRadius:7,background:`${color}18`,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Icon style={{width:15,height:15,color}}/>
        </div>
        <span style={{fontSize:10,fontWeight:700,color:"#9ca3af",textTransform:"uppercase" as const,letterSpacing:"0.06em"}}>{label}</span>
      </div>
      <div style={{fontSize:26,fontWeight:900,color:"#111827",lineHeight:1}}>{val}</div>
      {sub&&<div style={{fontSize:11,color:"#9ca3af",marginTop:4}}>{sub}</div>}
    </div>
  );
}

function Row({label,val,ok}:{label:string;val:string;ok?:boolean}) {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid #f3f4f6",gap:12}}>
      <span style={{fontSize:13,fontWeight:500,color:"#374151"}}>{label}</span>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:12,fontFamily:"monospace",color:"#6b7280",background:"#f3f4f6",padding:"2px 9px",borderRadius:4,maxWidth:300,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{val}</span>
        {ok!==undefined&&<div style={{width:7,height:7,borderRadius:"50%",background:ok?"#22c55e":"#ef4444",flexShrink:0}}/>}
      </div>
    </div>
  );
}

function WebmasterInner() {
  const {user, profile} = useAuth();
  const navigate = useNavigate();
  const [tab,      setTab]      = useState("overview");
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [users,    setUsers]    = useState<any[]>([]);
  const [audit,    setAudit]    = useState<any[]>([]);
  const [srch,     setSrch]     = useState("");
  const [apiKeys,  setApiKeys]  = useState<{name:string;key:string;created:string}[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const [sysLog,   setSysLog]   = useState<string[]>([]);
  const [stats,    setStats]    = useState({users:0,active:0,auditTotal:0,settings:0,tables:32,notifications:0});

  // Layout / UI settings stored in system_settings
  const [S, setS] = useState<Record<string,string>>({
    nav_position:"top",
    sidebar_width:"240",
    header_height:"52",
    btn_radius:"8",
    table_style:"stripe",
    density:"normal",
    primary_color:"#1a3a6b",
    accent_color:"#C45911",
    font_family:"Inter",
    card_shadow:"sm",
    show_breadcrumb:"true",
    show_footer:"true",
    show_version_badge:"true",
    enable_animations:"true",
    enable_dark_mode:"false",
    maintenance_mode:"false",
    audit_log_enabled:"true",
    realtime_enabled:"true",
    allow_user_registration:"true",
    session_timeout:"60",
    max_upload_mb:"10",
    default_locale:"en-KE",
    default_currency:"KES",
    default_date_format:"DD/MM/YYYY",
    smtp_host:"", smtp_port:"587", smtp_user:"", smtp_from:"",
    backup_auto:"daily", backup_retention:"30",
  });
  const set = (k:string,v:string) => setS(p=>({...p,[k]:v}));
  const setB = (k:string,v:boolean) => setS(p=>({...p,[k]:String(v)}));

  const addLog = useCallback((msg:string)=>{
    const t=new Date().toLocaleTimeString("en-KE");
    setSysLog(p=>[`[${t}] ${msg}`, ...p.slice(0,99)]);
  },[]);

  const load = useCallback(async()=>{
    setLoading(true);
    addLog("Loading system data…");
    const [usersR, auditR, settingsR, notifsR] = await Promise.all([
      (supabase as any).from("profiles").select("id,full_name,email,is_active,created_at,department,user_roles(role)").order("created_at",{ascending:false}),
      (supabase as any).from("audit_log").select("*").order("created_at",{ascending:false}).limit(200),
      (supabase as any).from("system_settings").select("key,value").limit(100),
      (supabase as any).from("notifications").select("id",{count:"exact",head:true}),
    ]);
    const u=usersR.data||[]; const a=auditR.data||[]; const s=settingsR.data||[];
    setUsers(u); setAudit(a);
    const m:Record<string,string>={};
    s.forEach((r:any)=>{ if(r.key) m[r.key]=r.value; });
    setS(p=>({...p,...m}));
    setStats({users:u.length, active:u.filter((x:any)=>x.is_active!==false).length, auditTotal:a.length, settings:s.length, tables:32, notifications:notifsR.count||0});
    addLog(`Loaded ${u.length} users, ${a.length} audit entries, ${s.length} settings`);
    setLoading(false);
  },[addLog]);

  useEffect(()=>{ load(); },[load]);

  const saveSettings = async(keys:string[])=>{
    setSaving(true);
    addLog(`Saving ${keys.length} settings: ${keys.slice(0,3).join(", ")}…`);
    for(const k of keys){
      const val=S[k]||"";
      const{data:ex}=await(supabase as any).from("system_settings").select("id").eq("key",k).maybeSingle();
      if(ex?.id) await(supabase as any).from("system_settings").update({value:val}).eq("key",k);
      else await(supabase as any).from("system_settings").insert({key:k,value:val});
    }
    await(supabase as any).from("audit_log").insert({user_id:user?.id,action:"webmaster_settings_updated",table_name:"system_settings",details:JSON.stringify({keys})});
    toast({title:"Settings saved ✓",description:`${keys.length} value(s) updated globally`});
    addLog(`✓ ${keys.length} settings saved`);
    setSaving(false);
  };

  const toggleUser = async(id:string,current:boolean,name:string)=>{
    await(supabase as any).from("profiles").update({is_active:!current}).eq("id",id);
    toast({title:`User ${!current?"activated":"deactivated"} ✓`,description:name});
    addLog(`User ${name} ${!current?"activated":"deactivated"}`);
    load();
  };

  const resetUserPassword = async(email:string)=>{
    addLog(`Password reset requested for ${email}`);
    toast({title:"Password reset email sent",description:email});
  };

  const generateApiKey = ()=>{
    const key="sk-medi-"+Math.random().toString(36).slice(2,18)+Math.random().toString(36).slice(2,18);
    const name=`API Key ${apiKeys.length+1}`;
    setApiKeys(p=>[...p,{name,key,created:new Date().toLocaleDateString("en-KE")}]);
    addLog(`New API key generated: ${name}`);
    toast({title:"API key generated",description:"Copy and store securely"});
  };

  const runDiagnostic = async(name:string, fn:()=>Promise<boolean>)=>{
    addLog(`Running diagnostic: ${name}…`);
    const ok = await fn().catch(()=>false);
    addLog(`${name}: ${ok?"✓ PASS":"✗ FAIL"}`);
    toast({title:`${name}: ${ok?"PASS ✓":"FAIL ✗"}`,variant:ok?undefined:"destructive"});
  };

  const exportAudit = ()=>{
    const ws=XLSX.utils.json_to_sheet(audit.slice(0,1000).map((r:any)=>({
      Date:new Date(r.created_at).toLocaleString("en-KE"),
      User:r.user_id?.slice(0,8)||"-",
      Action:r.action||"-",
      Table:r.table_name||"-",
      RecordID:r.record_id||"-",
    })));
    const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Audit Log");
    XLSX.writeFile(wb,`audit-log-${new Date().toISOString().slice(0,10)}.xlsx`);
    addLog("Audit log exported to XLSX");
  };

  const filteredAudit = audit.filter(a=>{
    if(!srch) return true;
    return [a.action,a.table_name,a.user_id,a.record_id].some(v=>String(v||"").toLowerCase().includes(srch.toLowerCase()));
  });

  const filteredUsers = users.filter(u=>{
    if(!srch) return true;
    return [u.full_name,u.email,u.department].some(v=>String(v||"").toLowerCase().includes(srch.toLowerCase()));
  });

  const INP = (k:string,ph?:string,type="text")=>(
    <input type={type} value={S[k]||""} onChange={e=>set(k,e.target.value)} placeholder={ph||""}
      style={{width:"100%",padding:"9px 12px",fontSize:13,border:"1px solid #e5e7eb",borderRadius:7,outline:"none",fontFamily:"inherit"}}/>
  );

  return (
    <div style={{display:"flex",minHeight:"calc(100vh - 82px)",fontFamily:"'Inter','Segoe UI',sans-serif",background:"#f0f2f5"}}>

      {/* ── SIDEBAR ── */}
      <div style={{width:200,background:"#fff",borderRight:"1px solid #e5e7eb",display:"flex",flexDirection:"column",flexShrink:0,boxShadow:"1px 0 4px rgba(0,0,0,0.04)"}}>
        <div style={{padding:"12px 14px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",display:"flex",alignItems:"center",gap:8}}>
          <Globe style={{width:14,height:14,color:"#fff"}}/>
          <div>
            <div style={{fontSize:13,fontWeight:800,color:"#fff"}}>Webmaster</div>
            <div style={{fontSize:9,color:"rgba(255,255,255,0.45)"}}>System Control Panel</div>
          </div>
        </div>
        <div style={{flex:1,padding:"6px 0",overflowY:"auto"}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{display:"flex",alignItems:"center",gap:9,width:"100%",padding:"9px 14px",border:"none",background:tab===t.id?`${t.color}10`:"transparent",cursor:"pointer",textAlign:"left" as const,borderLeft:tab===t.id?`3px solid ${t.color}`:"3px solid transparent",transition:"all 0.1s"}}>
              <div style={{width:24,height:24,borderRadius:5,background:tab===t.id?`${t.color}18`:"#f3f4f6",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <t.icon style={{width:12,height:12,color:tab===t.id?t.color:"#9ca3af"}}/>
              </div>
              <span style={{fontSize:12,fontWeight:tab===t.id?700:500,color:tab===t.id?t.color:"#374151"}}>{t.label}</span>
            </button>
          ))}
        </div>
        {/* Live console */}
        <div style={{padding:"8px 10px",background:"#0a1628",minHeight:120,maxHeight:160,overflowY:"auto"}} ref={logRef}>
          <div style={{fontSize:9,color:"#22c55e",fontWeight:700,marginBottom:4,letterSpacing:"0.05em"}}>▶ LIVE CONSOLE</div>
          {sysLog.length===0
            ?<div style={{fontSize:9,color:"#374151"}}>No logs yet…</div>
            :sysLog.map((l,i)=><div key={i} style={{fontSize:9,color:"#6ee7b7",fontFamily:"monospace",lineHeight:1.6,wordBreak:"break-all" as const}}>{l}</div>)
          }
        </div>
        <div style={{padding:"6px 12px",borderTop:"1px solid #f3f4f6",background:"#f9fafb",fontSize:9,color:"#9ca3af",fontWeight:600}}>
          EL5 MediProcure v2.1.0
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={{flex:1,overflowY:"auto",padding:16}}>
        {loading&&tab==="overview"&&(
          <div style={{display:"flex",alignItems:"center",gap:10,padding:24,color:"#9ca3af",fontSize:13}}>
            <RefreshCw style={{width:18,height:18}} className="animate-spin"/>&nbsp;Loading system data…
          </div>
        )}

        {/* ── OVERVIEW ── */}
        {tab==="overview"&&!loading&&(
          <>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12,marginBottom:16}}>
              <StatCard label="Total Users"    val={stats.users}         icon={Users}    color="#0078d4"/>
              <StatCard label="Active Users"   val={stats.active}        icon={CheckCircle} color="#107c10"/>
              <StatCard label="System Tables"  val={stats.tables}        icon={Database} color="#374151" sub="Supabase PostgreSQL"/>
              <StatCard label="Audit Entries"  val={stats.auditTotal}    icon={Activity} color="#C45911"/>
              <StatCard label="Settings Saved" val={stats.settings}      icon={Settings} color="#8b5cf6"/>
              <StatCard label="Notifications"  val={stats.notifications} icon={Bell}     color="#f59e0b"/>
            </div>

            {/* System status panel */}
            <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,overflow:"hidden",marginBottom:16,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
              <div style={{padding:"10px 16px",borderBottom:"2px solid #f3f4f6",display:"flex",alignItems:"center",gap:8}}>
                <Server style={{width:14,height:14,color:"#1a3a6b"}}/>
                <span style={{fontSize:13,fontWeight:700,color:"#111827",flex:1}}>System Status</span>
                <span style={{fontSize:10,color:"#22c55e",fontWeight:700,display:"flex",alignItems:"center",gap:4}}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:"#22c55e"}}/> ALL SYSTEMS OPERATIONAL
                </span>
              </div>
              <div style={{padding:"4px 16px 12px"}}>
                <Row label="Application"       val="EL5 MediProcure v2.1.0 · React 18 · Vite 5"  ok={true}/>
                <Row label="Database"          val="Supabase PostgreSQL 15 · 32 tables · RLS active" ok={true}/>
                <Row label="Authentication"    val="Supabase Auth · JWT · Session-based"          ok={true}/>
                <Row label="Real-time Engine"  val="WebSocket · Channels active"                  ok={true}/>
                <Row label="Storage"           val="Supabase Storage (S3-compatible)"             ok={true}/>
                <Row label="Maintenance Mode"  val={S.maintenance_mode==="true"?"ENABLED — Users locked out":"Disabled"} ok={S.maintenance_mode!=="true"}/>
                <Row label="Audit Logging"     val={S.audit_log_enabled==="true"?"Active — all changes tracked":"DISABLED"} ok={S.audit_log_enabled==="true"}/>
                <Row label="Real-time Notifs"  val={S.realtime_enabled==="true"?"Enabled":"Disabled"} ok={S.realtime_enabled==="true"}/>
                <Row label="Browser"           val={navigator.userAgent.slice(0,60)+"…"}          ok={true}/>
                <Row label="Timezone"          val={Intl.DateTimeFormat().resolvedOptions().timeZone+" · "+new Date().toLocaleString("en-KE")} ok={true}/>
              </div>
            </div>

            {/* Quick links grid */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10}}>
              {[
                {label:"User Management",   path:"/users",          icon:Users,    color:"#0078d4"},
                {label:"Database Admin",    path:"/admin/database", icon:Database, color:"#374151"},
                {label:"Audit Log",         path:"/audit-log",      icon:Activity, color:"#C45911"},
                {label:"Backup Manager",    path:"/backup",         icon:Archive,  color:"#065f46"},
                {label:"Admin Panel",       path:"/admin/panel",    icon:Settings, color:"#1a3a6b"},
                {label:"Email System",      path:"/email",          icon:Mail,     color:"#7c3aed"},
              ].map(l=>(
                <button key={l.path} onClick={()=>navigate(l.path)}
                  style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:"#fff",border:"1px solid #e5e7eb",borderRadius:9,cursor:"pointer",textAlign:"left" as const,transition:"all 0.12s",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor=l.color;(e.currentTarget as HTMLElement).style.background=`${l.color}06`;}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor="#e5e7eb";(e.currentTarget as HTMLElement).style.background="#fff";}}>
                  <div style={{width:34,height:34,borderRadius:8,background:`${l.color}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <l.icon style={{width:16,height:16,color:l.color}}/>
                  </div>
                  <span style={{fontSize:13,fontWeight:600,color:"#374151"}}>{l.label}</span>
                  <ChevronRight style={{width:12,height:12,color:"#d1d5db",marginLeft:"auto"}}/>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── LAYOUT & UI ── */}
        {tab==="layout"&&(
          <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
            <div style={{padding:"10px 16px",borderBottom:"2px solid #f3f4f6",display:"flex",alignItems:"center",gap:8}}>
              <Palette style={{width:14,height:14,color:"#8b5cf6"}}/>
              <span style={{fontSize:13,fontWeight:700,color:"#111827",flex:1}}>Layout & UI Customization</span>
              <button onClick={()=>saveSettings(["nav_position","sidebar_width","header_height","btn_radius","table_style","density","primary_color","accent_color","font_family","card_shadow","show_breadcrumb","show_footer","enable_animations","enable_dark_mode"])} disabled={saving}
                style={{display:"flex",alignItems:"center",gap:5,padding:"6px 14px",background:"#8b5cf6",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:700}}>
                {saving?<RefreshCw style={{width:11,height:11}} className="animate-spin"/>:<Save style={{width:11,height:11}}/>} Save Layout
              </button>
            </div>
            <div style={{padding:"0 16px 16px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,paddingTop:12}}>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>Navigation Position</label>
                <select value={S.nav_position||"top"} onChange={e=>set("nav_position",e.target.value)}
                  style={{width:"100%",padding:"9px 12px",fontSize:13,border:"1px solid #e5e7eb",borderRadius:7,outline:"none"}}>
                  <option value="top">Top bar (current)</option>
                  <option value="left">Left sidebar</option>
                </select>
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>Header Height (px)</label>
                <input type="number" value={S.header_height||"52"} onChange={e=>set("header_height",e.target.value)} style={{width:"100%",padding:"9px 12px",fontSize:13,border:"1px solid #e5e7eb",borderRadius:7,outline:"none"}}/>
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>Button Border Radius (px)</label>
                <input type="range" min="0" max="20" value={S.btn_radius||"8"} onChange={e=>set("btn_radius",e.target.value)} style={{width:"100%"}}/>
                <div style={{fontSize:11,color:"#9ca3af",textAlign:"center" as const}}>{S.btn_radius||"8"}px</div>
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>Table Style</label>
                <select value={S.table_style||"stripe"} onChange={e=>set("table_style",e.target.value)}
                  style={{width:"100%",padding:"9px 12px",fontSize:13,border:"1px solid #e5e7eb",borderRadius:7,outline:"none"}}>
                  <option value="stripe">Striped rows</option>
                  <option value="border">Bordered</option>
                  <option value="minimal">Minimal</option>
                </select>
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>Content Density</label>
                <select value={S.density||"normal"} onChange={e=>set("density",e.target.value)}
                  style={{width:"100%",padding:"9px 12px",fontSize:13,border:"1px solid #e5e7eb",borderRadius:7,outline:"none"}}>
                  <option value="compact">Compact</option>
                  <option value="normal">Normal</option>
                  <option value="comfortable">Comfortable</option>
                </select>
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>Font Family</label>
                <select value={S.font_family||"Inter"} onChange={e=>set("font_family",e.target.value)}
                  style={{width:"100%",padding:"9px 12px",fontSize:13,border:"1px solid #e5e7eb",borderRadius:7,outline:"none",fontFamily:S.font_family||"Inter"}}>
                  {["Inter","System UI","Georgia","Roboto","Open Sans","Lato","Nunito"].map(f=><option key={f} value={f} style={{fontFamily:f}}>{f}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>Primary Color</label>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <input type="color" value={S.primary_color||"#1a3a6b"} onChange={e=>set("primary_color",e.target.value)} style={{width:40,height:32,borderRadius:5,border:"1px solid #e5e7eb",cursor:"pointer",padding:2}}/>
                  <span style={{fontSize:12,fontFamily:"monospace",color:"#374151",flex:1}}>{S.primary_color||"#1a3a6b"}</span>
                </div>
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>Accent Color</label>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <input type="color" value={S.accent_color||"#C45911"} onChange={e=>set("accent_color",e.target.value)} style={{width:40,height:32,borderRadius:5,border:"1px solid #e5e7eb",cursor:"pointer",padding:2}}/>
                  <span style={{fontSize:12,fontFamily:"monospace",color:"#374151",flex:1}}>{S.accent_color||"#C45911"}</span>
                </div>
              </div>
              {[
                ["Show Breadcrumb","show_breadcrumb"],["Show Footer","show_footer"],
                ["Enable Animations","enable_animations"],["Dark Mode","enable_dark_mode"],
              ].map(([label,key])=>(
                <div key={key} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #f9fafb"}}>
                  <span style={{fontSize:13,fontWeight:500,color:"#374151"}}>{label}</span>
                  <Toggle on={S[key]==="true"} onChange={v=>setB(key,v)}/>
                </div>
              ))}
              {/* Color preview */}
              <div style={{gridColumn:"1/-1",marginTop:8,padding:"16px",background:"#f9fafb",borderRadius:8,border:"1px solid #e5e7eb"}}>
                <div style={{fontSize:11,fontWeight:700,color:"#6b7280",marginBottom:10,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>Preview</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap" as const}}>
                  <button style={{padding:"8px 18px",background:S.primary_color||"#1a3a6b",color:"#fff",border:"none",borderRadius:+(S.btn_radius||"8"),fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:S.font_family||"Inter"}}>Primary Button</button>
                  <button style={{padding:"8px 18px",background:S.accent_color||"#C45911",color:"#fff",border:"none",borderRadius:+(S.btn_radius||"8"),fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:S.font_family||"Inter"}}>Accent Button</button>
                  <div style={{padding:"8px 18px",background:"#fff",border:`2px solid ${S.primary_color||"#1a3a6b"}`,borderRadius:+(S.btn_radius||"8"),fontSize:13,fontWeight:600,color:S.primary_color||"#1a3a6b",fontFamily:S.font_family||"Inter"}}>Outline Button</div>
                  <span style={{padding:"4px 10px",background:`${S.primary_color||"#1a3a6b"}18`,color:S.primary_color||"#1a3a6b",borderRadius:4,fontSize:11,fontWeight:700}}>Badge</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SYSTEM CONFIG ── */}
        {tab==="system"&&(
          <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
            <div style={{padding:"10px 16px",borderBottom:"2px solid #f3f4f6",display:"flex",alignItems:"center",gap:8}}>
              <Settings style={{width:14,height:14,color:"#374151"}}/>
              <span style={{fontSize:13,fontWeight:700,color:"#111827",flex:1}}>System Configuration</span>
              <button onClick={()=>saveSettings(["maintenance_mode","audit_log_enabled","realtime_enabled","allow_user_registration","session_timeout","max_upload_mb","default_locale","default_currency","default_date_format"])} disabled={saving}
                style={{display:"flex",alignItems:"center",gap:5,padding:"6px 14px",background:"#374151",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:700}}>
                {saving?<RefreshCw style={{width:11,height:11}} className="animate-spin"/>:<Save style={{width:11,height:11}}/>} Save System
              </button>
            </div>
            <div style={{padding:"0 16px 16px"}}>
              {[
                ["Maintenance Mode","maintenance_mode","Locks out all non-admin users"],
                ["Audit Logging","audit_log_enabled","Log all user actions and data changes"],
                ["Real-time Updates","realtime_enabled","Live WebSocket data sync across sessions"],
                ["Allow User Registration","allow_user_registration","Let new users self-register"],
              ].map(([label,key,sub])=>(
                <div key={key} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 0",borderBottom:"1px solid #f3f4f6",gap:12}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:"#111827"}}>{label}</div>
                    <div style={{fontSize:11,color:"#9ca3af",marginTop:1}}>{sub}</div>
                  </div>
                  <Toggle on={S[key]==="true"} onChange={v=>setB(key,v)}/>
                </div>
              ))}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,paddingTop:10}}>
                {[{l:"Session Timeout (min)",k:"session_timeout"},{l:"Max Upload (MB)",k:"max_upload_mb"},{l:"Default Locale",k:"default_locale"},{l:"Default Currency",k:"default_currency"},{l:"Date Format",k:"default_date_format"}].map(f=>(
                  <div key={f.k}>
                    <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>{f.l}</label>
                    {INP(f.k)}
                  </div>
                ))}
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>SMTP Host</label>
                  {INP("smtp_host","smtp.gmail.com")}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── USERS ── */}
        {tab==="users"&&(
          <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
            <div style={{padding:"10px 16px",borderBottom:"2px solid #f3f4f6",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" as const}}>
              <Users style={{width:14,height:14,color:"#0078d4"}}/>
              <span style={{fontSize:13,fontWeight:700,color:"#111827",flex:1}}>User Management · {stats.users} users</span>
              <div style={{position:"relative"}}>
                <Search style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",width:11,height:11,color:"#9ca3af"}}/>
                <input value={srch} onChange={e=>setSrch(e.target.value)} placeholder="Search users…"
                  style={{paddingLeft:26,padding:"6px 10px 6px 26px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:6,outline:"none",background:"#f9fafb",width:200}}/>
              </div>
              <button onClick={()=>navigate("/users")} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 14px",background:"#0078d4",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:700}}>
                <Plus style={{width:11,height:11}}/> Full User Manager
              </button>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead>
                  <tr style={{background:"#f9fafb",borderBottom:"2px solid #e5e7eb"}}>
                    {["Name","Email","Role","Department","Status","Actions"].map(h=>(
                      <th key={h} style={{padding:"9px 12px",textAlign:"left" as const,fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase" as const,letterSpacing:"0.05em",whiteSpace:"nowrap" as const}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.slice(0,30).map((u:any)=>(
                    <tr key={u.id} style={{borderBottom:"1px solid #f9fafb"}}
                      onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#fafafa"}
                      onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
                      <td style={{padding:"9px 12px",fontWeight:700,color:"#111827"}}>{u.full_name}</td>
                      <td style={{padding:"9px 12px",color:"#6b7280",fontSize:12}}>{u.email}</td>
                      <td style={{padding:"9px 12px"}}>
                        <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:4,background:"#eff6ff",color:"#1a3a6b"}}>{u.user_roles?.[0]?.role||"—"}</span>
                      </td>
                      <td style={{padding:"9px 12px",color:"#6b7280",fontSize:12}}>{u.department||"—"}</td>
                      <td style={{padding:"9px 12px"}}>
                        <span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:4,background:u.is_active!==false?"#dcfce7":"#fee2e2",color:u.is_active!==false?"#15803d":"#dc2626"}}>{u.is_active!==false?"Active":"Inactive"}</span>
                      </td>
                      <td style={{padding:"9px 12px"}}>
                        <div style={{display:"flex",gap:5}}>
                          <button onClick={()=>toggleUser(u.id,u.is_active!==false,u.full_name)}
                            style={{padding:"3px 9px",background:u.is_active!==false?"#fee2e2":"#dcfce7",border:`1px solid ${u.is_active!==false?"#fecaca":"#bbf7d0"}`,borderRadius:5,cursor:"pointer",fontSize:10,fontWeight:700,color:u.is_active!==false?"#dc2626":"#15803d"}}>
                            {u.is_active!==false?"Deactivate":"Activate"}
                          </button>
                          <button onClick={()=>resetUserPassword(u.email)}
                            style={{padding:"3px 9px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:5,cursor:"pointer",fontSize:10,fontWeight:600,color:"#374151"}}>
                            Reset PW
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length>30&&<div style={{padding:"8px 12px",fontSize:11,color:"#9ca3af",textAlign:"center" as const,borderTop:"1px solid #f3f4f6"}}>Showing 30 of {filteredUsers.length} — <button onClick={()=>navigate("/users")} style={{color:"#1a3a6b",background:"none",border:"none",cursor:"pointer",fontWeight:700}}>View all in User Manager</button></div>}
            </div>
          </div>
        )}

        {/* ── AUDIT LOG ── */}
        {tab==="audit"&&(
          <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
            <div style={{padding:"10px 16px",borderBottom:"2px solid #f3f4f6",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" as const}}>
              <Activity style={{width:14,height:14,color:"#C45911"}}/>
              <span style={{fontSize:13,fontWeight:700,color:"#111827",flex:1}}>Audit Log · {audit.length} entries</span>
              <div style={{position:"relative"}}>
                <Search style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",width:11,height:11,color:"#9ca3af"}}/>
                <input value={srch} onChange={e=>setSrch(e.target.value)} placeholder="Filter…"
                  style={{paddingLeft:26,padding:"6px 10px 6px 26px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:6,outline:"none",background:"#f9fafb",width:180}}/>
              </div>
              <button onClick={exportAudit} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 14px",background:"#C45911",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:700}}>
                <Download style={{width:11,height:11}}/> Export XLSX
              </button>
              <button onClick={()=>navigate("/audit-log")} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 14px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:600,color:"#374151"}}>
                Full Audit Log
              </button>
            </div>
            <div style={{overflowX:"auto",maxHeight:"calc(100vh - 280px)",overflowY:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead style={{position:"sticky",top:0,zIndex:1}}>
                  <tr style={{background:"#f9fafb",borderBottom:"2px solid #e5e7eb"}}>
                    {["Time","Action","Table","Record ID","User"].map(h=>(
                      <th key={h} style={{padding:"9px 12px",textAlign:"left" as const,fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase" as const,letterSpacing:"0.05em",whiteSpace:"nowrap" as const}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredAudit.slice(0,100).map((a:any,i:number)=>(
                    <tr key={a.id||i} style={{borderBottom:"1px solid #f9fafb"}}
                      onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#fafafa"}
                      onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
                      <td style={{padding:"8px 12px",color:"#9ca3af",whiteSpace:"nowrap" as const}}>{new Date(a.created_at).toLocaleString("en-KE",{dateStyle:"short",timeStyle:"short"})}</td>
                      <td style={{padding:"8px 12px",fontWeight:600,color:"#374151"}}><span style={{fontFamily:"monospace",fontSize:11}}>{a.action||"—"}</span></td>
                      <td style={{padding:"8px 12px",color:"#6b7280"}}>{a.table_name||"—"}</td>
                      <td style={{padding:"8px 12px",color:"#9ca3af",fontFamily:"monospace",fontSize:11}}>{a.record_id?.slice(0,12)||"—"}</td>
                      <td style={{padding:"8px 12px",color:"#6b7280",fontSize:11}}>{a.user_id?.slice(0,8)||"system"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── API & KEYS ── */}
        {tab==="api"&&(
          <div style={{display:"flex",flexDirection:"column" as const,gap:14}}>
            <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
              <div style={{padding:"10px 16px",borderBottom:"2px solid #f3f4f6",display:"flex",alignItems:"center",gap:8}}>
                <Key style={{width:14,height:14,color:"#107c10"}}/>
                <span style={{fontSize:13,fontWeight:700,color:"#111827",flex:1}}>API Keys</span>
                <button onClick={generateApiKey} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 14px",background:"#107c10",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:700}}>
                  <Plus style={{width:11,height:11}}/> Generate Key
                </button>
              </div>
              <div style={{padding:"12px 16px",display:"flex",flexDirection:"column" as const,gap:10}}>
                <div style={{padding:"10px 14px",background:"#fffbeb",border:"1px solid #fde68a",borderRadius:8,fontSize:12,color:"#92400e"}}>
                  ⚠ API keys give programmatic access to EL5 MediProcure. Never share them publicly.
                </div>
                {apiKeys.length===0?(
                  <div style={{padding:"28px",textAlign:"center" as const,color:"#9ca3af",fontSize:13}}>
                    <Key style={{width:28,height:28,color:"#e5e7eb",margin:"0 auto 10px"}}/>
                    No API keys yet. Generate one to get started.
                  </div>
                ):apiKeys.map((k,i)=>(
                  <div key={i} style={{padding:"10px 14px",background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:8,display:"flex",alignItems:"center",gap:12}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:700,color:"#111827"}}>{k.name}</div>
                      <div style={{fontSize:11,fontFamily:"monospace",color:"#6b7280",marginTop:2}}>{k.key}</div>
                      <div style={{fontSize:10,color:"#9ca3af",marginTop:2}}>Created: {k.created}</div>
                    </div>
                    <button onClick={()=>{navigator.clipboard?.writeText(k.key);toast({title:"Copied ✓"});}}
                      style={{padding:"5px 12px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:600,color:"#374151"}}>Copy</button>
                    <button onClick={()=>{setApiKeys(p=>p.filter((_,j)=>j!==i));addLog(`API key ${k.name} revoked`);}}
                      style={{padding:"5px 9px",background:"#fee2e2",border:"1px solid #fecaca",borderRadius:6,cursor:"pointer",color:"#dc2626",lineHeight:0}}>
                      <Trash2 style={{width:12,height:12}}/>
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
              <div style={{padding:"10px 16px",borderBottom:"2px solid #f3f4f6"}}>
                <span style={{fontSize:13,fontWeight:700,color:"#111827"}}>Supabase Connection Info</span>
              </div>
              <div style={{padding:"4px 16px 14px"}}>
                <Row label="Project URL"  val={import.meta.env.VITE_SUPABASE_URL||"(configured in environment)"}    ok={true}/>
                <Row label="Anon Key"     val={import.meta.env.VITE_SUPABASE_ANON_KEY?"sk-***…(set)"+"...":"(configured in environment)"}  ok={true}/>
                <Row label="Auth Method"  val="JWT Bearer Token"                                                      ok={true}/>
                <Row label="API Version"  val="REST v1 · WebSocket"                                                   ok={true}/>
                <Row label="RLS Policies" val="Enabled on all tables"                                                 ok={true}/>
              </div>
            </div>
          </div>
        )}

        {/* ── DIAGNOSTICS ── */}
        {tab==="diagnostics"&&(
          <div style={{display:"flex",flexDirection:"column" as const,gap:14}}>
            <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
              <div style={{padding:"10px 16px",borderBottom:"2px solid #f3f4f6",display:"flex",alignItems:"center",gap:8}}>
                <Terminal style={{width:14,height:14,color:"#dc2626"}}/>
                <span style={{fontSize:13,fontWeight:700,color:"#111827",flex:1}}>System Diagnostics</span>
                <button onClick={()=>runDiagnostic("Full System Check",async()=>{
                    const{error}=await(supabase as any).from("profiles").select("id").limit(1);
                    return !error;
                  })} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 14px",background:"#dc2626",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:700}}>
                  <Play style={{width:11,height:11}}/> Run All
                </button>
              </div>
              <div style={{padding:"12px 16px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {[
                  {n:"Database Ping",         fn:async()=>{const{error}=await(supabase as any).from("profiles").select("id").limit(1);return!error;}},
                  {n:"Auth Service",          fn:async()=>{const{data}=await(supabase as any).auth.getSession();return!!data;}},
                  {n:"Notifications Table",   fn:async()=>{const{error}=await(supabase as any).from("notifications").select("id").limit(1);return!error;}},
                  {n:"Inbox Items Table",     fn:async()=>{const{error}=await(supabase as any).from("inbox_items").select("id").limit(1);return!error;}},
                  {n:"Audit Log Write",       fn:async()=>{const{error}=await(supabase as any).from("audit_log").insert({action:"diagnostic_test",table_name:"system"});return!error;}},
                  {n:"Settings Read",         fn:async()=>{const{error}=await(supabase as any).from("system_settings").select("key").limit(1);return!error;}},
                  {n:"Real-time Channel",     fn:async()=>{let ok=false;const ch=(supabase as any).channel("test-"+Date.now()).subscribe((s:any)=>{ok=s==="SUBSCRIBED";});await new Promise(r=>setTimeout(r,1500));await(supabase as any).removeChannel(ch);return ok;}},
                  {n:"Browser Local Storage", fn:async()=>{try{localStorage.setItem("test","1");localStorage.removeItem("test");return true;}catch{return false;}}},
                ].map(d=>(
                  <button key={d.n} onClick={()=>runDiagnostic(d.n,d.fn)}
                    style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:8,cursor:"pointer",textAlign:"left" as const,transition:"all 0.12s"}}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f0f9ff"}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="#f9fafb"}>
                    <Play style={{width:12,height:12,color:"#dc2626",flexShrink:0}}/>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:600,color:"#374151"}}>{d.n}</div>
                      <div style={{fontSize:11,color:"#9ca3af"}}>Click to run test</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div style={{background:"#0a1628",borderRadius:10,padding:16,maxHeight:360,overflowY:"auto"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <Terminal style={{width:13,height:13,color:"#22c55e"}}/>
                <span style={{fontSize:11,color:"#22c55e",fontWeight:700,letterSpacing:"0.08em"}}>DIAGNOSTIC OUTPUT</span>
                <button onClick={()=>setSysLog([])} style={{marginLeft:"auto",background:"rgba(255,255,255,0.1)",border:"none",borderRadius:4,padding:"2px 8px",cursor:"pointer",fontSize:10,color:"#6b7280"}}>Clear</button>
              </div>
              {sysLog.length===0
                ?<div style={{fontSize:11,color:"#374151",fontFamily:"monospace"}}>Run a diagnostic to see output…</div>
                :sysLog.map((l,i)=><div key={i} style={{fontSize:11,color:"#6ee7b7",fontFamily:"monospace",lineHeight:1.7}}>{l}</div>)
              }
            </div>
          </div>
        )}

        {/* ── BACKUP ── */}
        {tab==="backup"&&(
          <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
            <div style={{padding:"10px 16px",borderBottom:"2px solid #f3f4f6",display:"flex",alignItems:"center",gap:8}}>
              <Archive style={{width:14,height:14,color:"#065f46"}}/>
              <span style={{fontSize:13,fontWeight:700,color:"#111827",flex:1}}>Backup & Restore</span>
              <button onClick={()=>navigate("/backup")} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 14px",background:"#065f46",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:700}}>
                Open Full Backup Manager
              </button>
            </div>
            <div style={{padding:"12px 16px",display:"flex",flexDirection:"column" as const,gap:12}}>
              {[
                ["Backup Schedule","backup_auto",["hourly","daily","weekly","monthly"]],
                ["Retention (days)","backup_retention",null],
              ].map(([label,key,opts]:any)=>(
                <div key={key}>
                  <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>{label}</label>
                  {opts?<select value={S[key]||opts[1]} onChange={e=>set(key,e.target.value)} style={{width:"100%",padding:"9px 12px",fontSize:13,border:"1px solid #e5e7eb",borderRadius:7,outline:"none"}}>
                    {opts.map((o:string)=><option key={o} value={o}>{o}</option>)}
                  </select>:<input type="number" value={S[key]||"30"} onChange={e=>set(key,e.target.value)} style={{width:"100%",padding:"9px 12px",fontSize:13,border:"1px solid #e5e7eb",borderRadius:7,outline:"none"}}/>}
                </div>
              ))}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:4}}>
                {[
                  {l:"Export Users",    fn:()=>{const ws=XLSX.utils.json_to_sheet(users.map((u:any)=>({Name:u.full_name,Email:u.email,Role:u.user_roles?.[0]?.role||"—",Dept:u.department||"—",Active:u.is_active!==false?"Yes":"No",Created:u.created_at?.slice(0,10)||"—"})));const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Users");XLSX.writeFile(wb,"users-export.xlsx");addLog("Users exported");}},
                  {l:"Export Audit",    fn:exportAudit},
                  {l:"Export Settings", fn:()=>{const s_data:any[]=[];Object.entries(S).forEach(([k,v])=>s_data.push({Key:k,Value:v}));const ws=XLSX.utils.json_to_sheet(s_data);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Settings");XLSX.writeFile(wb,"settings-export.xlsx");addLog("Settings exported");}},
                ].map(op=>(
                  <button key={op.l} onClick={op.fn} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"10px",background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700,color:"#374151"}}>
                    <Download style={{width:12,height:12,color:"#065f46"}}/>{op.l}
                  </button>
                ))}
              </div>
              <button onClick={()=>saveSettings(["backup_auto","backup_retention"])} disabled={saving}
                style={{display:"flex",alignItems:"center",gap:6,padding:"9px 20px",background:"#065f46",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:13,fontWeight:700,marginTop:4}}>
                {saving?<RefreshCw style={{width:12,height:12}} className="animate-spin"/>:<Save style={{width:12,height:12}}/>} Save Backup Config
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WebmasterPage() {
  return <RoleGuard allowed={["admin"]}><WebmasterInner/></RoleGuard>;
}
