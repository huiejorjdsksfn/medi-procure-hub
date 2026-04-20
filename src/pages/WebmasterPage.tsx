/**
 * ProcurBosse v21.0 -- Webmaster Control Centre
 * D365 + cData style: Sources, Modules, Users, IP, Broadcast, Health, Settings, SQL
 * EL5 MediProcure | Embu Level 5 Hospital | Kenya
 * BUILD-SAFE: zero non-ASCII chars
 */
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { T } from "@/lib/theme";
import { Globe, Server, Database, Users, Settings, Shield, Activity, Wifi, Radio, Bell, Power, Zap, Download, RefreshCw, Monitor, Cpu, HardDrive, AlertTriangle, BarChart3, Package, Lock, Check, X, Terminal, Play, Save, Eye, Edit3, Plus, Trash2, Network, Signal, MapPin, Clock, ChevronRight, Code2, FileText, Layers, Send } from "lucide-react";

const db = supabase as any;

const NAV = [
  {id:"overview",  label:"Overview",        icon:Monitor,   col:"#0078d4"},
  {id:"sources",   label:"Data Sources",    icon:Database,  col:"#038387"},
  {id:"modules",   label:"Module Controls", icon:Layers,    col:"#7719aa"},
  {id:"users",     label:"User Management", icon:Users,     col:"#059669"},
  {id:"iplive",    label:"IP Monitor",      icon:Globe,     col:"#0369a1"},
  {id:"broadcast", label:"Live Broadcast",  icon:Radio,     col:"#d97706"},
  {id:"health",    label:"System Health",   icon:Activity,  col:"#b91c1c"},
  {id:"settings",  label:"System Settings", icon:Settings,  col:"#6b21a8"},
  {id:"terminal",  label:"SQL Terminal",    icon:Terminal,  col:"#374151"},
];

const MODULES_LIST = [
  {key:"enable_procurement", label:"Procurement",      color:"#0078d4", icon:Package},
  {key:"enable_financials",  label:"Financials",       color:"#7719aa", icon:BarChart3},
  {key:"enable_inventory",   label:"Inventory",        color:"#038387", icon:Package},
  {key:"enable_quality",     label:"Quality Control",  color:"#d97706", icon:Shield},
  {key:"enable_comms",       label:"Communications",   color:"#0369a1", icon:Radio},
  {key:"enable_reports",     label:"Reports & BI",     color:"#6b21a8", icon:BarChart3},
  {key:"enable_documents",   label:"Documents",        color:"#059669", icon:FileText},
  {key:"enable_sms",         label:"SMS Gateway",      color:"#0891b2", icon:Radio},
  {key:"enable_email",       label:"Email (Resend)",   color:"#374151", icon:Send},
  {key:"enable_backup",      label:"Auto Backup",      color:"#7c3aed", icon:HardDrive},
  {key:"enable_ip_whitelist",label:"IP Whitelist",     color:"#b91c1c", icon:Shield},
  {key:"enable_print_engine",label:"Print Engine",     color:"#065f46", icon:FileText},
  {key:"maintenance_mode",   label:"Maintenance Mode", color:"#ef4444", icon:Power},
];

const DATA_SOURCES = [
  {id:"supabase", name:"Supabase (Primary DB)",  type:"PostgreSQL", icon:Database, color:"#3ecf8e", status:"connected"},
  {id:"mysql",    name:"MySQL Proxy",             type:"MySQL",      icon:Database, color:"#4479a1", status:"conditional"},
  {id:"resend",   name:"Resend Email API",         type:"API",        icon:Send,    color:"#0f0f0f", status:"connected"},
  {id:"twilio",   name:"Twilio SMS/Voice",         type:"API",        icon:Signal,  color:"#f22f46", status:"connected"},
  {id:"ipapi",    name:"IP Geolocation API",       type:"API",        icon:MapPin,  color:"#0078d4", status:"connected"},
  {id:"xlsx",     name:"Excel Export (xlsx)",      type:"Library",    icon:FileText,color:"#217346", status:"active"},
];

const S = {
  page: {background:T.bg,minHeight:"100%",fontFamily:"'Segoe UI','Inter',system-ui,sans-serif"} as React.CSSProperties,
  hdr:  {background:"#0a0a1a",padding:"0 20px",display:"flex",alignItems:"stretch",minHeight:44,boxShadow:"0 2px 8px rgba(0,0,0,.4)"} as React.CSSProperties,
  bc:   {background:"#fff",padding:"7px 20px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:6,fontSize:12,color:T.fgMuted} as React.CSSProperties,
  body: {display:"flex",minHeight:"calc(100% - 88px)"} as React.CSSProperties,
  sb:   {width:200,flexShrink:0,background:"#fff",borderRight:`1px solid ${T.border}`,paddingTop:8} as React.CSSProperties,
  main: {flex:1,padding:"20px 24px",overflowY:"auto"as const,background:T.bg} as React.CSSProperties,
  card: {background:"#fff",border:`1px solid ${T.border}`,borderRadius:T.rLg,boxShadow:"0 1px 4px rgba(0,0,0,.06)",overflow:"hidden"as const,marginBottom:16} as React.CSSProperties,
  inp:  {width:"100%",border:`1px solid ${T.border}`,borderRadius:T.r,padding:"7px 11px",fontSize:13,outline:"none",background:"#fff",color:T.fg,boxSizing:"border-box"as const,fontFamily:"inherit"} as React.CSSProperties,
  th:   {padding:"8px 12px",textAlign:"left"as const,fontSize:10,fontWeight:700,color:T.fgDim,borderBottom:`1px solid ${T.border}`,background:T.bg,whiteSpace:"nowrap"as const},
  td:   {padding:"9px 12px",fontSize:12,color:T.fg,borderBottom:`1px solid ${T.border}18`},
};
const btn=(bg:string,fg="white",bd?:string):React.CSSProperties=>({display:"inline-flex",alignItems:"center",gap:6,padding:"7px 14px",background:bg,color:fg,border:`1px solid ${bd||bg}`,borderRadius:T.r,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all .12s"});
const badge=(col:string):React.CSSProperties=>({display:"inline-flex",alignItems:"center",gap:4,padding:"2px 8px",borderRadius:99,fontSize:10,fontWeight:700,background:col+"20",color:col,border:`1px solid ${col}44`});
const ch=(col:string):React.CSSProperties=>({padding:"11px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:8,background:col+"0a"});

function StatusBadge({status}:{status:string}) {
  const map:Record<string,[string,string]>={connected:[T.success,"Connected"],conditional:[T.warning,"Conditional"],active:[T.primary,"Active"],error:[T.error,"Error"],offline:[T.fgDim,"Offline"]};
  const [col,lbl]=map[status]||[T.fgDim,status];
  return<span style={badge(col)}><span style={{width:6,height:6,borderRadius:"50%",background:col,display:"inline-block"}}/>{lbl}</span>;
}

export default function WebmasterPage() {
  const nav=useNavigate();
  const {profile}=useAuth();
  const [activeNav,setActiveNav]=useState("overview");
  const [modules,setModules]   =useState<Record<string,boolean>>({});
  const [settEdit,setSettEdit] =useState<Record<string,string>>({});
  const [users,setUsers]       =useState<any[]>([]);
  const [sessions,setSessions] =useState<any[]>([]);
  const [ipLog,setIpLog]       =useState<any[]>([]);
  const [health,setHealth]     =useState<any>({});
  const [broadMsg,setBroadMsg] =useState("");
  const [broadType,setBroadType]=useState("info");
  const [sending,setSending]   =useState(false);
  const [saving,setSaving]     =useState(false);
  const [sqlQ,setSqlQ]         =useState("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;");
  const [sqlRes,setSqlRes]     =useState<any>(null);
  const [sqlRun,setSqlRun]     =useState(false);
  const [publicIP,setPublicIP] =useState("");

  const loadAll=useCallback(async()=>{
    try {
      const [mods,setts,usrs,sess,ips,metrics] = await Promise.allSettled([
        db.from("system_settings").select("*").eq("category","modules"),
        db.from("system_settings").select("*").not("category","eq","modules"),
        db.from("profiles").select("id,full_name,email,role,is_active,created_at,last_active_at").order("created_at",{ascending:false}).limit(50),
        db.from("user_sessions").select("*").eq("is_active",true).order("started_at",{ascending:false}).limit(20),
        db.from("ip_access_log").select("*").order("created_at",{ascending:false}).limit(30),
        db.from("system_metrics").select("*").order("recorded_at",{ascending:false}).limit(1),
      ]);
      const v=(x:any)=>x.status==="fulfilled"?x.value?.data:null;
      const modsD=v(mods); if(modsD){const m:Record<string,boolean>={};modsD.forEach((r:any)=>{m[r.key]=r.value==="true"||r.value===true;});setModules(m);}
      const settsD=v(setts); if(settsD){const s:Record<string,string>={};settsD.forEach((r:any)=>{s[r.key]=r.value;});setSettEdit(s);}
      const usrsD=v(usrs); if(usrsD)setUsers(usrsD);
      const sessD=v(sess); if(sessD)setSessions(sessD);
      const ipsD=v(ips); if(ipsD)setIpLog(ipsD);
      const metricsD=v(metrics); if(metricsD&&metricsD[0])setHealth(metricsD[0]);
    } catch(e:any){ console.warn("[Webmaster] load error:",e?.message); }
  },[]);

  useEffect(()=>{
    loadAll();
    fetch("https://api.ipify.org?format=json").then(r=>r.json()).then(d=>setPublicIP(d.ip||"")).catch(()=>{});
    const t=setInterval(loadAll,30000);
    const ch2=db.channel("wm_rt").on("postgres_changes",{event:"*",schema:"public",table:"user_sessions"},loadAll).subscribe();
    return()=>{clearInterval(t);db.removeChannel(ch2);};
  },[loadAll]);

  const toggleMod=async(key:string)=>{
    const v=!modules[key];setModules(p=>({...p,[key]:v}));
    await db.from("system_settings").upsert({key,value:String(v),category:"modules"},{onConflict:"key"});
    toast({title:`${key} ${v?"enabled":"disabled"}`});
  };

  const saveSett=async()=>{
    setSaving(true);
    try{
      for(const [key,value] of Object.entries(settEdit)){
        await db.from("system_settings").upsert({key,value:String(value),category:"general"},{onConflict:"key"});
      }
      toast({title:"Settings saved"});
    }catch(e:any){toast({title:"Error",description:e.message,variant:"destructive"});}
    finally{setSaving(false);}
  };

  const sendBroad=async()=>{
    if(!broadMsg.trim())return;setSending(true);
    try{
      await db.from("notifications").insert({title:`[BROADCAST] ${broadType.toUpperCase()}`,message:broadMsg,type:broadType,is_broadcast:true,created_by:profile?.id,created_at:new Date().toISOString()});
      toast({title:"Broadcast sent to all users"});setBroadMsg("");
    }catch(e:any){toast({title:"Error",description:e.message,variant:"destructive"});}
    finally{setSending(false);}
  };

  const runSQL=async()=>{
    if(!sqlQ.trim())return;setSqlRun(true);setSqlRes(null);
    try{
      const{data,error}=await db.rpc("run_admin_query",{query_text:sqlQ}).single();
      if(error)throw error;setSqlRes(data);
    }catch(e:any){setSqlRes({error:e.message});}
    finally{setSqlRun(false);}
  };

  const killSess=async(id:string)=>{
    await db.from("user_sessions").update({is_active:false,ended_at:new Date().toISOString()}).eq("id",id);
    toast({title:"Session terminated"});loadAll();
  };

  const setRole=async(uid:string,role:string)=>{
    await db.from("profiles").update({role}).eq("id",uid);
    toast({title:`Role updated to ${role}`});loadAll();
  };

  const toggleActive=async(uid:string,cur:boolean)=>{
    await db.from("profiles").update({is_active:!cur}).eq("id",uid);
    toast({title:`User ${!cur?"activated":"deactivated"}`});loadAll();
  };

  return(
    <div style={S.page}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {/* Header */}
      <div style={S.hdr}>
        <div style={{display:"flex",alignItems:"center",gap:10,flex:1}}>
          <Globe size={20} color="#fff"/>
          <div>
            <div style={{fontWeight:800,fontSize:15,color:"#fff"}}>Webmaster Control Centre</div>
            <div style={{fontSize:9,color:"rgba(255,255,255,.4)"}}>Full System Administration | ProcurBosse v21.0</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"0 8px"}}>
          {publicIP&&<span style={{fontSize:10,color:"rgba(255,255,255,.35)",fontFamily:"monospace"}}>{publicIP}</span>}
          {sessions.length>0&&<span style={{fontSize:10,color:"#22c55e",background:"rgba(34,197,94,.1)",padding:"3px 8px",borderRadius:4}}>{sessions.length} online</span>}
          <button onClick={loadAll} style={btn("rgba(255,255,255,.1)","#fff","rgba(255,255,255,.2)")}><RefreshCw size={13}/>Refresh</button>
          <button onClick={()=>nav("/dashboard")} style={btn("rgba(255,255,255,.07)","#fff","rgba(255,255,255,.12)")}>Dashboard</button>
        </div>
      </div>
      {/* Breadcrumb */}
      <div style={S.bc}>
        <span style={{cursor:"pointer",color:T.primary}} onClick={()=>nav("/dashboard")}>Home</span>
        <ChevronRight size={12}/><span>Admin</span><ChevronRight size={12}/><span style={{fontWeight:600}}>Webmaster</span>
      </div>
      <div style={S.body}>
        {/* Sidebar */}
        <div style={S.sb}>
          <div style={{padding:"0 8px 8px",fontSize:9,fontWeight:800,color:T.fgDim,letterSpacing:".1em"}}>CONTROL CENTRE</div>
          {NAV.map(n=>(
            <button key={n.id} onClick={()=>setActiveNav(n.id)} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"9px 12px",background:activeNav===n.id?n.col+"15":"transparent",border:"none",cursor:"pointer",color:activeNav===n.id?n.col:T.fg,fontSize:13,fontWeight:activeNav===n.id?700:400,fontFamily:"inherit",borderLeft:`3px solid ${activeNav===n.id?n.col:"transparent"}`,textAlign:"left"as const,transition:"all .12s"}}
              onMouseEnter={e=>activeNav!==n.id&&((e.currentTarget as HTMLElement).style.background=T.bg)}
              onMouseLeave={e=>activeNav!==n.id&&((e.currentTarget as HTMLElement).style.background="transparent")}>
              <n.icon size={14} color={activeNav===n.id?n.col:T.fgMuted}/>{n.label}
            </button>
          ))}
        </div>
        {/* Main content */}
        <div style={S.main}>

          {/* OVERVIEW */}
          {activeNav==="overview"&&(
            <div>
              <div style={{marginBottom:20}}><div style={{fontSize:18,fontWeight:800,color:T.fg}}>System Overview</div><div style={{fontSize:12,color:T.fgMuted}}>EL5 MediProcure ProcurBosse v21.0</div></div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
                {[{l:"Active Users",v:sessions.length,c:"#0078d4",I:Users},{l:"Total Users",v:users.length,c:"#7719aa",I:Users},{l:"Modules On",v:Object.values(modules).filter(Boolean).length,c:"#038387",I:Layers},{l:"Settings",v:Object.keys(settEdit).length,c:"#d97706",I:Settings}].map(k=>(
                  <div key={k.l} style={{background:"#fff",border:`1px solid ${T.border}`,borderRadius:T.rLg,padding:16,borderLeft:`4px solid ${k.c}`}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><k.I size={16} color={k.c}/><span style={{fontSize:11,fontWeight:700,color:T.fgMuted}}>{k.l}</span></div>
                    <div style={{fontSize:28,fontWeight:800,color:k.c}}>{k.v}</div>
                  </div>
                ))}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                <div style={S.card}>
                  <div style={ch("#038387")}><Database size={15} color="#038387"/><span style={{fontWeight:700,fontSize:13}}>Data Sources</span><button onClick={()=>setActiveNav("sources")} style={{marginLeft:"auto",...btn(T.bg,T.primary,T.border),padding:"3px 10px",fontSize:11}}>View All</button></div>
                  <div style={{padding:16}}>
                    {DATA_SOURCES.map(ds=>(
                      <div key={ds.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${T.border}18`}}>
                        <div style={{width:28,height:28,borderRadius:6,background:ds.color+"20",display:"flex",alignItems:"center",justifyContent:"center"}}><ds.icon size={14} color={ds.color}/></div>
                        <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600}}>{ds.name}</div><div style={{fontSize:10,color:T.fgMuted}}>{ds.type}</div></div>
                        <StatusBadge status={ds.status}/>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={S.card}>
                  <div style={ch("#0078d4")}><Monitor size={15} color="#0078d4"/><span style={{fontWeight:700,fontSize:13}}>Live Sessions ({sessions.length})</span><button onClick={()=>setActiveNav("users")} style={{marginLeft:"auto",...btn(T.bg,T.primary,T.border),padding:"3px 10px",fontSize:11}}>Manage</button></div>
                  <div style={{padding:16}}>
                    {sessions.length===0?<div style={{textAlign:"center"as const,color:T.fgDim,padding:"20px 0",fontSize:12}}>No active sessions</div>
                    :sessions.slice(0,6).map((s:any)=>(
                      <div key={s.id} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:`1px solid ${T.border}18`}}>
                        <div style={{width:8,height:8,borderRadius:"50%",background:"#22c55e",flexShrink:0}}/>
                        <div style={{flex:1}}><div style={{fontSize:11,fontWeight:600}}>{(s.user_id||"").slice(0,8)}...</div><div style={{fontSize:10,color:T.fgMuted,fontFamily:"monospace"}}>{s.ip_address||"unknown"}</div></div>
                        <button onClick={()=>killSess(s.id)} style={{...btn(T.errorBg,T.error,T.error+"33"),padding:"3px 8px",fontSize:10}}>Kill</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DATA SOURCES */}
          {activeNav==="sources"&&(
            <div>
              <div style={{fontSize:18,fontWeight:800,color:T.fg,marginBottom:20}}>Data Sources & Connections</div>
              <div style={S.card}>
                <div style={ch("#038387")}><Database size={15} color="#038387"/><span style={{fontWeight:700,fontSize:13}}>Connection Status</span></div>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr><th style={S.th}>Connection Name</th><th style={S.th}>Type</th><th style={S.th}>Status</th><th style={S.th}>Actions</th></tr></thead>
                  <tbody>
                    {DATA_SOURCES.map(ds=>(
                      <tr key={ds.id} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=T.bg} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=""}>
                        <td style={S.td}><div style={{display:"flex",alignItems:"center",gap:9}}>
                          <div style={{width:30,height:30,borderRadius:6,background:ds.color+"20",display:"flex",alignItems:"center",justifyContent:"center"}}><ds.icon size={15} color={ds.color}/></div>
                          <div><div style={{fontSize:13,fontWeight:600}}>{ds.name}</div><div style={{fontSize:10,color:T.fgMuted}}>{ds.id}</div></div>
                        </div></td>
                        <td style={S.td}><span style={{fontFamily:"monospace",fontSize:11,color:T.fgMuted}}>{ds.type}</span></td>
                        <td style={S.td}><StatusBadge status={ds.status}/></td>
                        <td style={S.td}><div style={{display:"flex",gap:6}}>
                          <button style={{...btn(T.primaryBg,T.primary,T.primary+"33"),padding:"4px 10px",fontSize:11}}><Edit3 size={11}/>Edit</button>
                          <button style={{...btn(T.successBg,T.success,T.success+"33"),padding:"4px 10px",fontSize:11}}><Check size={11}/>Test</button>
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MODULES */}
          {activeNav==="modules"&&(
            <div>
              <div style={{fontSize:18,fontWeight:800,color:T.fg,marginBottom:6}}>Module Controls</div>
              <div style={{fontSize:12,color:T.fgMuted,marginBottom:20}}>Toggle system modules on/off. Changes apply immediately.</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
                {MODULES_LIST.map(m=>{
                  const enabled=modules[m.key]!==false;
                  return(
                    <div key={m.key} style={{background:"#fff",border:`1px solid ${enabled?m.color+"44":T.border}`,borderRadius:T.rLg,padding:16,transition:"all .2s",borderLeft:`4px solid ${enabled?m.color:T.border}`}}>
                      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                        <div style={{width:36,height:36,borderRadius:8,background:enabled?m.color+"20":T.bg,display:"flex",alignItems:"center",justifyContent:"center"}}><m.icon size={18} color={enabled?m.color:T.fgDim}/></div>
                        <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:enabled?T.fg:T.fgMuted}}>{m.label}</div><div style={{fontSize:10,color:T.fgDim,fontFamily:"monospace"}}>{m.key}</div></div>
                        <button onClick={()=>toggleMod(m.key)} style={{background:"none",border:"none",cursor:"pointer",padding:0,display:"flex",alignItems:"center",fontWeight:800,fontSize:11,color:enabled?m.color:T.fgDim,fontFamily:"inherit"}}>
                          {enabled?"[ON]":"[OFF]"}
                        </button>
                      </div>
                      <div style={{fontSize:10,color:enabled?m.color:T.fgDim,fontWeight:700}}>{enabled?"ENABLED":"DISABLED"}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* USER MANAGEMENT */}
          {activeNav==="users"&&(
            <div>
              <div style={{fontSize:18,fontWeight:800,color:T.fg,marginBottom:20}}>User Management & Real-time Roles</div>
              <div style={S.card}>
                <div style={ch("#059669")}><Users size={15} color="#059669"/><span style={{fontWeight:700,fontSize:13}}>All Users ({users.length})</span><button onClick={()=>nav("/users")} style={{marginLeft:"auto",...btn("#059669","#fff"),padding:"4px 12px",fontSize:11}}>Full User Page</button></div>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead><tr><th style={S.th}>Name</th><th style={S.th}>Email</th><th style={S.th}>Role</th><th style={S.th}>Status</th><th style={S.th}>Last Active</th><th style={S.th}>Actions</th></tr></thead>
                    <tbody>
                      {users.map((u:any)=>(
                        <tr key={u.id} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=T.bg} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=""}>
                          <td style={S.td}><span style={{fontWeight:600}}>{u.full_name}</span></td>
                          <td style={{...S.td,fontSize:11}}>{u.email}</td>
                          <td style={S.td}>
                            <select defaultValue={u.role||"requisitioner"} onChange={e=>setRole(u.id,e.target.value)} style={{border:`1px solid ${T.border}`,borderRadius:T.r,padding:"3px 8px",fontSize:11,background:"#fff",color:T.fg,fontFamily:"inherit",cursor:"pointer"}}>
                              {["superadmin","webmaster","admin","database_admin","procurement_manager","procurement_officer","inventory_manager","warehouse_officer","requisitioner","accountant"].map(r=><option key={r} value={r}>{r}</option>)}
                            </select>
                          </td>
                          <td style={S.td}><span style={badge(u.is_active!==false?T.success:T.error)}>{u.is_active!==false?"Active":"Inactive"}</span></td>
                          <td style={{...S.td,fontSize:11,color:T.fgMuted}}>{u.last_active_at?new Date(u.last_active_at).toLocaleString("en-KE"):"Never"}</td>
                          <td style={S.td}><button onClick={()=>toggleActive(u.id,u.is_active!==false)} style={{...btn(u.is_active!==false?T.errorBg:T.successBg,u.is_active!==false?T.error:T.success,u.is_active!==false?T.error+"33":T.success+"33"),padding:"4px 10px",fontSize:11}}>{u.is_active!==false?"Disable":"Enable"}</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* IP MONITOR */}
          {activeNav==="iplive"&&(
            <div>
              <div style={{fontSize:18,fontWeight:800,color:T.fg,marginBottom:6}}>Live IP Monitor</div>
              <div style={{fontSize:12,color:T.fgMuted,marginBottom:20}}>Real-time IP access and geolocation tracking.</div>
              {publicIP&&(
                <div style={{background:"#fff",border:`1px solid ${T.border}`,borderRadius:T.rLg,padding:16,marginBottom:16,borderLeft:"4px solid #0369a1",display:"flex",alignItems:"center",gap:12}}>
                  <Wifi size={20} color="#0369a1"/>
                  <div><div style={{fontSize:11,fontWeight:700,color:T.fgMuted}}>YOUR CURRENT IP</div><div style={{fontSize:22,fontWeight:800,color:"#0369a1",fontFamily:"monospace"}}>{publicIP}</div></div>
                  <button onClick={()=>nav("/admin/ip-access")} style={{marginLeft:"auto",...btn("#0369a1","#fff"),fontSize:12}}>Full IP Console</button>
                </div>
              )}
              <div style={S.card}>
                <div style={ch("#0369a1")}><Network size={15} color="#0369a1"/><span style={{fontWeight:700,fontSize:13}}>IP Access Log ({ipLog.length})</span></div>
                {ipLog.length===0?<div style={{padding:30,textAlign:"center"as const,color:T.fgDim,fontSize:12}}>No IP log records found</div>:(
                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead><tr><th style={S.th}>IP Address</th><th style={S.th}>Country</th><th style={S.th}>City</th><th style={S.th}>Action</th><th style={S.th}>Timestamp</th></tr></thead>
                    <tbody>
                      {ipLog.map((r:any,i:number)=>(
                        <tr key={r.id||i} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=T.bg} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=""}>
                          <td style={{...S.td,fontFamily:"monospace",fontSize:11}}>{r.ip_address}</td>
                          <td style={S.td}>{r.country||"-"}</td>
                          <td style={S.td}>{r.city||"-"}</td>
                          <td style={S.td}><span style={badge(r.action==="blocked"?T.error:T.success)}>{r.action||"allowed"}</span></td>
                          <td style={{...S.td,fontSize:11}}>{r.created_at?new Date(r.created_at).toLocaleString("en-KE"):"-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* BROADCAST */}
          {activeNav==="broadcast"&&(
            <div>
              <div style={{fontSize:18,fontWeight:800,color:T.fg,marginBottom:20}}>Live System Broadcast</div>
              <div style={S.card}>
                <div style={ch("#d97706")}><Radio size={15} color="#d97706"/><span style={{fontWeight:700,fontSize:13}}>Send Broadcast Notification</span></div>
                <div style={{padding:"20px 24px"}}>
                  <div style={{marginBottom:14}}>
                    <label style={{display:"block",fontSize:11,fontWeight:700,color:T.fgMuted,marginBottom:6}}>Message Type</label>
                    <div style={{display:"flex",gap:8}}>
                      {["info","warning","error","success"].map(t=>(
                        <button key={t} onClick={()=>setBroadType(t)} style={{padding:"7px 16px",borderRadius:T.r,border:`1px solid ${broadType===t?"#d97706":T.border}`,background:broadType===t?"#d97706":"#fff",color:broadType===t?"#fff":T.fg,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",textTransform:"capitalize"as const}}>{t}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{marginBottom:16}}>
                    <label style={{display:"block",fontSize:11,fontWeight:700,color:T.fgMuted,marginBottom:6}}>Broadcast Message</label>
                    <textarea value={broadMsg} onChange={e=>setBroadMsg(e.target.value)} rows={4} placeholder="Enter message to broadcast to all users..." style={{...S.inp,resize:"vertical"as const}}/>
                  </div>
                  <button onClick={sendBroad} disabled={sending||!broadMsg.trim()} style={{...btn(sending||!broadMsg.trim()?T.fgDim:"#d97706"),fontSize:13,padding:"10px 20px"}}>
                    {sending?<RefreshCw size={15} style={{animation:"spin 1s linear infinite"}}/>:<Send size={15}/>}
                    {sending?"Sending...":"Broadcast to All Users"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* HEALTH */}
          {activeNav==="health"&&(
            <div>
              <div style={{fontSize:18,fontWeight:800,color:T.fg,marginBottom:20}}>System Health Monitor</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16}}>
                {[
                  {l:"CPU Usage",     v:health.cpu_usage?`${health.cpu_usage}%`:"N/A",        c:health.cpu_usage>80?T.error:T.success, I:Cpu},
                  {l:"Memory",        v:health.memory_usage?`${health.memory_usage}%`:"N/A",  c:health.memory_usage>85?T.error:T.success, I:HardDrive},
                  {l:"Disk Space",    v:health.disk_usage?`${health.disk_usage}%`:"N/A",      c:health.disk_usage>90?T.error:T.success, I:HardDrive},
                  {l:"DB Status",     v:"Connected",                                          c:T.success, I:Database},
                  {l:"Active Sessions",v:String(sessions.length),                             c:T.primary, I:Monitor},
                  {l:"Last Check",    v:health.recorded_at?new Date(health.recorded_at).toLocaleTimeString():"Now", c:T.fgDim, I:Clock},
                ].map(m=>(
                  <div key={m.l} style={{background:"#fff",border:`1px solid ${T.border}`,borderRadius:T.rLg,padding:16,borderLeft:`4px solid ${m.c}`}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><m.I size={15} color={m.c}/><span style={{fontSize:11,fontWeight:700,color:T.fgMuted}}>{m.l}</span></div>
                    <div style={{fontSize:22,fontWeight:800,color:m.c}}>{m.v}</div>
                  </div>
                ))}
              </div>
              <button onClick={loadAll} style={{...btn(T.primary),fontSize:13}}><RefreshCw size={14}/>Refresh Health Data</button>
            </div>
          )}

          {/* SETTINGS */}
          {activeNav==="settings"&&(
            <div>
              <div style={{fontSize:18,fontWeight:800,color:T.fg,marginBottom:20}}>System Settings</div>
              <div style={S.card}>
                <div style={ch("#6b21a8")}><Settings size={15} color="#6b21a8"/><span style={{fontWeight:700,fontSize:13}}>General Configuration</span></div>
                <div style={{padding:"20px 24px"}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 20px"}}>
                    {[{k:"hospital_name",l:"Hospital Name"},{k:"system_name",l:"System Name"},{k:"system_version",l:"System Version"},{k:"support_email",l:"Support Email"},{k:"support_phone",l:"Support Phone"},{k:"county",l:"County"},{k:"department",l:"Department"},{k:"logo_url",l:"Logo URL"}].map(({k,l})=>(
                      <div key={k} style={{marginBottom:14}}>
                        <label style={{display:"block",fontSize:11,fontWeight:700,color:T.fgMuted,marginBottom:5}}>{l}</label>
                        <input value={settEdit[k]||""} onChange={e=>setSettEdit(p=>({...p,[k]:e.target.value}))} style={S.inp}/>
                      </div>
                    ))}
                  </div>
                  <div style={{borderTop:`1px solid ${T.border}`,paddingTop:16,display:"flex",gap:10}}>
                    <button onClick={saveSett} disabled={saving} style={{...btn(saving?T.fgDim:"#6b21a8"),fontSize:13,padding:"10px 20px"}}>
                      {saving?<RefreshCw size={14} style={{animation:"spin 1s linear infinite"}}/>:<Save size={14}/>}
                      {saving?"Saving...":"Save All Settings"}
                    </button>
                    <button onClick={loadAll} style={{...btn("#fff",T.fg,T.border),fontSize:13,padding:"10px 20px"}}><RefreshCw size={14}/>Reset</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SQL TERMINAL */}
          {activeNav==="terminal"&&(
            <div>
              <div style={{fontSize:18,fontWeight:800,color:T.fg,marginBottom:6}}>SQL Terminal</div>
              <div style={{fontSize:12,color:T.error,marginBottom:16,display:"flex",alignItems:"center",gap:6}}><AlertTriangle size={14}/>Admin only -- all queries are logged. Use with caution.</div>
              <div style={S.card}>
                <div style={ch("#374151")}><Terminal size={15} color="#374151"/><span style={{fontWeight:700,fontSize:13,fontFamily:"monospace"}}>SQL Query Editor</span></div>
                <div style={{padding:16}}>
                  <textarea value={sqlQ} onChange={e=>setSqlQ(e.target.value)} rows={6} style={{...S.inp,fontFamily:"monospace",fontSize:12,background:"#1e1e2e",color:"#d4d4d4",border:"none",borderRadius:T.r,resize:"vertical"as const}}/>
                  <div style={{display:"flex",gap:10,marginTop:10}}>
                    <button onClick={runSQL} disabled={sqlRun} style={{...btn(sqlRun?T.fgDim:"#374151"),fontSize:13}}>
                      {sqlRun?<RefreshCw size={14} style={{animation:"spin 1s linear infinite"}}/>:<Play size={14}/>}
                      {sqlRun?"Running...":"Execute Query"}
                    </button>
                    <button onClick={()=>setSqlRes(null)} style={{...btn("#fff",T.fg,T.border),fontSize:13}}>Clear</button>
                  </div>
                  {sqlRes&&(
                    <div style={{marginTop:16,background:"#1e1e2e",borderRadius:T.r,padding:14,maxHeight:300,overflowY:"auto"}}>
                      <pre style={{margin:0,fontFamily:"monospace",fontSize:12,color:sqlRes.error?"#f87171":"#86efac",whiteSpace:"pre-wrap"as const,wordBreak:"break-all"as const}}>
                        {sqlRes.error?`ERROR: ${sqlRes.error}`:JSON.stringify(sqlRes,null,2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
