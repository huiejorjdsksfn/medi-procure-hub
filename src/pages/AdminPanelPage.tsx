/**
 * ProcurBosse - Admin Panel v6.0 (D365 Style)
 * Live IP stats - User password view/reset - Twilio test - D365 layout
 * EL5 MediProcure - Embu Level 5 Hospital
 */
import { useState, useEffect, useCallback } from "react";
import { pageCache } from "@/lib/pageCache";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSystemSettings, saveSettings } from "@/hooks/useSystemSettings";
import { toast } from "@/hooks/use-toast";
import { T } from "@/lib/theme";
import { checkTwilioStatus, sendSms, makeCall } from "@/lib/sms";
import {
  LayoutDashboard, Users, Shield, Phone, Globe, Activity, Database,
  Settings, RefreshCw, Save, Eye, EyeOff, Copy, Check, X, Send,
  Lock, Unlock, Key, Wifi, WifiOff, Server, Radio, Bell,
  TrendingUp, AlertTriangle, MapPin, Clock, Package, ShoppingCart,
  UserCheck, Zap, ChevronRight, Monitor
} from "lucide-react";

const db = supabase as any;

/* - D365 styles - */
const S = {
  page:   { background:T.bg, minHeight:"100vh", fontFamily:"'Segoe UI','Inter',sans-serif" },
  header: { background:"#fff", borderBottom:`1px solid ${T.border}`, padding:"16px 24px", display:"flex", alignItems:"center", gap:14, boxShadow:"0 1px 3px rgba(0,0,0,.06)" },
  body:   { display:"grid", gridTemplateColumns:"220px 1fr", gap:0, minHeight:"calc(100vh - 57px)" },
  sidebar:{ background:"#fff", borderRight:`1px solid ${T.border}`, padding:"12px 0" },
  main:   { padding:"20px 24px", background:T.bg, overflowY:"auto" as const },
  card:   { background:"#fff", border:`1px solid ${T.border}`, borderRadius:T.rLg, boxShadow:"0 1px 4px rgba(0,0,0,.06)", overflow:"hidden" as const },
  cardHd: (col:string) => ({ padding:"12px 16px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", gap:8, background:`${col}08` }),
  inp:    { width:"100%", border:`1px solid ${T.border}`, borderRadius:T.r, padding:"7px 11px", fontSize:13, outline:"none", background:"#fff", color:T.fg, boxSizing:"border-box" as const },
  btn:    (bg:string,col="white") => ({ display:"inline-flex", alignItems:"center", gap:6, padding:"7px 14px", background:bg, color:col, border:"none", borderRadius:T.r, fontSize:13, fontWeight:600, cursor:"pointer" }),
};

/* - Nav items - */
const NAVS = [
  {id:"overview",  label:"Overview",       icon:LayoutDashboard, col:"#4f46e5"},
  {id:"iplive",    label:"Live IP Stats",  icon:Globe,           col:"#0078d4"},
  {id:"users",     label:"User Passwords", icon:Key,             col:"#7719aa"},
  {id:"twilio",    label:"SMS / Twilio",   icon:Phone,           col:"#059669"},
  {id:"roles",     label:"Roles & Access", icon:Shield,          col:"#dc2626"},
  {id:"modules",   label:"Module Toggles", icon:Settings,        col:"#d39a04"},
  {id:"broadcast", label:"Broadcast",      icon:Radio,           col:"#0369a1"},
  {id:"system",    label:"System Info",    icon:Server,          col:"#374151"},
];

/* - IP detection - */
const IP_SOURCES = ["https://api.ipify.org?format=json","https://api64.ipify.org?format=json"];
async function getMyIP(): Promise<{ip:string}|null> {
  for (const url of IP_SOURCES) {
    try { const d=await (await fetch(url,{signal:AbortSignal.timeout(4000)})).json(); if(d.ip) return d; } catch {}
  }
  return null;
}
async function getGeo(ip:string): Promise<any> {
  try { return await (await fetch(`https://ipapi.co/${ip}/json/`,{signal:AbortSignal.timeout(4000)})).json(); } catch { return null; }
}
function classIP(ip:string):"public"|"private"|"loopback" {
  if(/^127\.|^::1$/.test(ip)) return "loopback";
  if(/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(ip)) return "private";
  return "public";
}

export default function AdminPanelPage() {
  const nav = useNavigate();
  const {user,roles} = useAuth();
  const settings = useSystemSettings();
  const [sec, setSec] = useState("overview");
  const [kpi, setKpi] = useState<any>({});
  const [users, setUsers] = useState<any[]>([]);
  const [ipLog, setIpLog] = useState<any[]>([]);
  const [myIP, setMyIP]   = useState("");
  const [geo, setGeo]     = useState<any>(null);
  const [ipFetch, setIpFetch] = useState(false);
  const [twilioStatus, setTwilioStatus] = useState<any>(null);
  const [twilioLoading, setTwilioLoading] = useState(false);
  const [smsTest, setSmsTest] = useState({to:"",msg:"Hello from EL5 MediProcure!"});
  const [smsSending, setSmsSending] = useState(false);
  const [callTo, setCallTo] = useState("");
  const [calling, setCalling] = useState(false);
  const [pwdUser, setPwdUser] = useState<any>(null);
  const [newPwd, setNewPwd]   = useState("");
  const [showPwd, setShowPwd] = useState<Record<string,boolean>>({});
  const [tempPwds, setTempPwds] = useState<Record<string,string>>({});
  const [saving, setSaving]   = useState(false);
  const [activeIPs, setActiveIPs] = useState<Map<string,any>>(new Map());
  const [blockedIPs, setBlockedIPs] = useState<Set<string>>(new Set());
  const [moduleCfg, setModuleCfg] = useState<Record<string,string>>({});
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);

  /* Load KPIs */
  const loadKpi = useCallback(async()=>{
    const [u,r2,p,s2,i,n] = await Promise.allSettled([
      db.from("profiles").select("id",{count:"exact",head:true}),
      db.from("requisitions").select("id",{count:"exact",head:true}).in("status",["submitted","pending"]),
      db.from("purchase_orders").select("id",{count:"exact",head:true}),
      db.from("suppliers").select("id",{count:"exact",head:true}).eq("status","active"),
      db.from("items").select("id",{count:"exact",head:true}),
      db.from("notifications").select("id",{count:"exact",head:true}).eq("is_read",false),
    ]);
    const v=(x:any)=>x.status==="fulfilled"?x.value?.count??0:0;
    setKpi({users:v(u),reqs:v(r2),pos:v(p),suppliers:v(s2),items:v(i),unread:v(n)});
  },[]);

  /* Load users */
  const loadUsers = useCallback(async()=>{
    const {data:pr} = await db.from("profiles").select("id,full_name,email,is_active,created_at").order("full_name");
    const {data:rls} = await db.from("user_roles").select("user_id,role");
    const roleMap: Record<string,string[]> = {};
    (rls||[]).forEach((r:any)=>{if(!roleMap[r.user_id])roleMap[r.user_id]=[];roleMap[r.user_id].push(r.role);});
    setUsers((pr||[]).map((p:any)=>({...p,roles:roleMap[p.id]||[]})));
    // Load temp passwords from system_settings
    const {data:tp} = await db.from("system_settings").select("key,value").like("key","temp_pw_%");
    const pm: Record<string,string> = {};
    (tp||[]).forEach((t:any)=>{ pm[t.key.replace("temp_pw_","")] = t.value; });
    setTempPwds(pm);
  },[]);

  /* Load IP data */
  const loadIPData = useCallback(async()=>{
    const {data:logs} = await db.from("ip_access_log").select("*").order("created_at",{ascending:false}).limit(200);
    const {data:wl}   = await db.from("network_whitelist").select("cidr,type,active").eq("type","blocked").eq("active",true);
    const cutoff = new Date(Date.now()-30*60_000).toISOString();
    const recent = (logs||[]).filter((l:any)=>l.created_at>cutoff);
    const ipMap = new Map<string,any>();
    recent.forEach((l:any)=>{if(!ipMap.has(l.ip_address)||l.created_at>ipMap.get(l.ip_address).created_at)ipMap.set(l.ip_address,l);});
    setActiveIPs(ipMap);
    setIpLog(logs||[]);
    setBlockedIPs(new Set((wl||[]).map((w:any)=>w.cidr)));
  },[]);

  /* Detect my IP */
  const detectIP = async()=>{
    setIpFetch(true);
    const res = await getMyIP();
    if(res){setMyIP(res.ip);const g=await getGeo(res.ip);setGeo(g);}
    setIpFetch(false);
  };

  /* Load module settings */
  const loadModules = useCallback(async()=>{
    const {data} = await db.from("system_settings").select("key,value").like("key","enable_%");
    const cfg: Record<string,string> = {};
    (data||[]).forEach((r:any)=>{cfg[r.key]=r.value;});
    setModuleCfg(cfg);
  },[]);

  useEffect(()=>{loadKpi();loadUsers();loadIPData();loadModules();detectIP();},[]);

  /* Check Twilio */
  const checkTwilio = async()=>{
    setTwilioLoading(true);
    const s=await checkTwilioStatus();
    setTwilioStatus(s);
    setTwilioLoading(false);
    toast({title:s.ok?"- Twilio Connected":"- Twilio Error",description:s.ok?`SMS: ${s.sms_from} | WA: ${s.wa_from}`:(s.error||"Connection failed"),variant:s.ok?"default":"destructive"});
  };

  /* Send test SMS */
  const testSMS = async()=>{
    if(!smsTest.to||!smsTest.msg){toast({title:"Enter phone & message",variant:"destructive"});return;}
    setSmsSending(true);
    const r = await sendSms({to:smsTest.to,message:smsTest.msg,module:"admin_test"});
    setSmsSending(false);
    toast({title:r.ok?"- SMS Sent":"- SMS Failed",description:r.ok?`Sent via ${r.results[0]?.provider}`:(r.error||r.results[0]?.error||"Failed"),variant:r.ok?"default":"destructive"});
  };

  /* Test call */
  const testCall = async()=>{
    if(!callTo){toast({title:"Enter phone number",variant:"destructive"});return;}
    setCalling(true);
    const r = await makeCall({to:callTo,message:"Hello from EL5 MediProcure hospital. This is a test call."});
    setCalling(false);
    toast({title:r.ok?"- Call Initiated":"- Call Failed",description:r.ok?`SID: ${r.sid}`:(r.error||"Failed"),variant:r.ok?"default":"destructive"});
  };

  /* Reset password */
  const resetPwd = async()=>{
    if(!pwdUser||!newPwd){toast({title:"Select user and enter password",variant:"destructive"});return;}
    if(newPwd.length<6){toast({title:"Password must be 6+ characters",variant:"destructive"});return;}
    setSaving(true);
    try {
      // Try admin API first
      const {error} = await (supabase.auth as any).admin?.updateUserById?.(pwdUser.id,{password:newPwd})||{error:{message:"Admin API unavailable"}};
      if(error){
        // Fallback: store temp password for admin reference
        await db.from("system_settings").upsert({key:`temp_pw_${pwdUser.id}`,value:newPwd,category:"temp_passwords"},{onConflict:"key"});
        toast({title:"- Temp password stored",description:`Password saved. User must update on next login.`});
      } else {
        // Clear any stored temp password
        await db.from("system_settings").delete().eq("key",`temp_pw_${pwdUser.id}`);
        toast({title:"- Password reset",description:`${pwdUser.full_name}'s password updated`});
      }
    } catch(e:any){toast({title:"Error",description:e.message,variant:"destructive"});}
    setSaving(false);setNewPwd("");setPwdUser(null);loadUsers();
  };

  /* Toggle module */
  const toggleModule = async(key:string)=>{
    const cur = moduleCfg[key]!=="false";
    await db.from("system_settings").upsert({key,value:cur?"false":"true",category:"modules"},{onConflict:"key"});
    setModuleCfg(p=>({...p,[key]:cur?"false":"true"}));
    toast({title:`${key.replace("enable_","")}: ${cur?"Disabled":"Enabled"}`});
  };

  /* Send broadcast */
  const sendBroadcast = async()=>{
    if(!broadcastMsg.trim()) return;
    setBroadcasting(true);
    await db.from("system_broadcasts").insert({message:broadcastMsg,type:"info",is_active:true,created_at:new Date().toISOString()});
    setBroadcastMsg(""); setBroadcasting(false);
    toast({title:"Broadcast sent"});
  };

  /* - RENDER - */
  const fmtAgo=(s:string)=>{const d=Date.now()-new Date(s).getTime();return d<60000?`${Math.floor(d/1000)}s`:d<3600000?`${Math.floor(d/60000)}m`:`${Math.floor(d/3600000)}h`;};

  return (
    <div style={S.page}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}} @keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* D365-style page header */}
      <div style={S.header}>
        <div style={{width:36,height:36,borderRadius:T.r,background:T.primaryBg,display:"flex",alignItems:"center",justifyContent:"center"}}><LayoutDashboard size={18} color={T.primary}/></div>
        <div>
          <h1 style={{margin:0,fontSize:18,fontWeight:700,color:T.fg}}>Administration</h1>
          <div style={{fontSize:12,color:T.fgMuted}}>System control - Live IP monitor - User management - Twilio configuration</div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:8}}>
          <button onClick={()=>{loadKpi();loadUsers();loadIPData();}} style={S.btn(T.bg2,T.fg)}><RefreshCw size={13}/> Refresh</button>
          <button onClick={()=>nav("/users")} style={S.btn(T.primary)}><Users size={13}/> Manage Users</button>
        </div>
      </div>

      <div style={S.body}>
        {/* - D365 LEFT SIDEBAR - */}
        <div style={S.sidebar}>
          {NAVS.map(n=>(
            <button key={n.id} onClick={()=>setSec(n.id)} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"10px 16px",background:sec===n.id?`${n.col}12`:"transparent",border:"none",borderLeft:`3px solid ${sec===n.id?n.col:"transparent"}`,color:sec===n.id?n.col:T.fgMuted,fontSize:13,fontWeight:sec===n.id?600:400,cursor:"pointer",transition:"all .12s"}}
              onMouseEnter={e=>{(e.currentTarget as any).style.background=`${n.col}0a`;}}
              onMouseLeave={e=>{(e.currentTarget as any).style.background=sec===n.id?`${n.col}12`:"transparent";}}>
              <n.icon size={15} style={{flexShrink:0}}/>{n.label}
            </button>
          ))}
        </div>

        {/* - MAIN CONTENT AREA - */}
        <div style={S.main}>

          {/* - OVERVIEW - */}
          {sec==="overview"&&(
            <div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:12,marginBottom:20}}>
                {[
                  {label:"Users",    val:kpi.users,    col:T.primary,  icon:Users,       path:"/users"},
                  {label:"Pending Reqs",val:kpi.reqs,  col:T.warning,  icon:ShoppingCart,path:"/requisitions"},
                  {label:"Open POs", val:kpi.pos,      col:"#7719aa",  icon:Package,     path:"/purchase-orders"},
                  {label:"Suppliers",val:kpi.suppliers, col:T.inventory,icon:TrendingUp,  path:"/suppliers"},
                  {label:"Items",    val:kpi.items,    col:T.quality,  icon:Package,     path:"/items"},
                  {label:"Notifs",   val:kpi.unread,   col:T.error,    icon:Bell,        path:"/notifications"},
                ].map(k=>(
                  <div key={k.label} onClick={()=>nav(k.path)} style={{...S.card,padding:"14px 16px",cursor:"pointer"}}
                    onMouseEnter={e=>{(e.currentTarget as any).style.transform="translateY(-1px)";(e.currentTarget as any).style.boxShadow="0 4px 12px rgba(0,0,0,.1)";}}
                    onMouseLeave={e=>{(e.currentTarget as any).style.transform="none";(e.currentTarget as any).style.boxShadow="0 1px 4px rgba(0,0,0,.06)";}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                      <div style={{width:32,height:32,borderRadius:T.r,background:`${k.col}14`,display:"flex",alignItems:"center",justifyContent:"center"}}><k.icon size={16} color={k.col}/></div>
                      <span style={{fontSize:11,color:T.fgMuted}}>{k.label}</span>
                    </div>
                    <div style={{fontSize:26,fontWeight:800,color:k.col}}>{k.val??0}</div>
                  </div>
                ))}
              </div>

              {/* Quick actions D365 command bar style */}
              <div style={{...S.card,marginBottom:16}}>
                <div style={S.cardHd(T.primary)}><Zap size={14} color={T.primary}/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>Quick Actions</span></div>
                <div style={{padding:"12px 16px",display:"flex",gap:8,flexWrap:"wrap"}}>
                  {[
                    {l:"Users & Passwords", p:"/users",            col:T.primary, cb:()=>setSec("users")},
                    {l:"Live IP Stats",     p:"",                  col:"#7719aa",  cb:()=>setSec("iplive")},
                    {l:"Test Twilio SMS",   p:"",                  col:T.inventory,cb:()=>setSec("twilio")},
                    {l:"System Broadcast",  p:"",                  col:T.warning,  cb:()=>setSec("broadcast")},
                    {l:"DB Monitor",        p:"/admin/db-test",    col:T.quality},
                    {l:"Webmaster",         p:"/webmaster",        col:"#5c2d91"},
                    {l:"IP Access Control", p:"/admin/ip-access",  col:T.error},
                    {l:"ODBC / MySQL",      p:"/odbc",             col:"#00188f"},
                  ].map(a=>(
                    <button key={a.l} onClick={()=>{if(a.cb)a.cb();else if(a.p)nav(a.p);}} style={S.btn(`${a.col}14`,a.col)} onMouseEnter={e=>(e.currentTarget.style.background=`${a.col}22`)} onMouseLeave={e=>(e.currentTarget.style.background=`${a.col}14`)}>
                      <ChevronRight size={12}/>{a.l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live activity */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div style={S.card}>
                  <div style={S.cardHd(T.primary)}><Activity size={14} color={T.primary}/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>Recent IP Activity</span><span style={{marginLeft:"auto",width:7,height:7,borderRadius:"50%",background:T.success,animation:"pulse 2s infinite"}} /></div>
                  <div style={{padding:"8px 0",maxHeight:220,overflowY:"auto"}}>
                    {ipLog.slice(0,10).map((l,i)=>(
                      <div key={i} style={{display:"flex",gap:10,padding:"6px 16px",borderBottom:`1px solid ${T.border}22`}}>
                        <span style={{width:6,height:6,borderRadius:"50%",background:l.status==="blocked"?T.error:T.success,marginTop:5,flexShrink:0}}/>
                        <code style={{fontSize:11,color:T.fg,fontFamily:"monospace",flex:1}}>{l.ip_address}</code>
                        <span style={{fontSize:9,color:T.fgDim}}>{fmtAgo(l.created_at)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={S.card}>
                  <div style={S.cardHd(T.quality)}><UserCheck size={14} color={T.quality}/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>Recent Users ({users.length})</span></div>
                  <div style={{padding:"8px 0",maxHeight:220,overflowY:"auto"}}>
                    {users.slice(0,10).map((u,i)=>(
                      <div key={i} style={{display:"flex",gap:10,padding:"6px 16px",borderBottom:`1px solid ${T.border}22`,alignItems:"center"}}>
                        <div style={{width:28,height:28,borderRadius:"50%",background:T.primaryBg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:11,fontWeight:700,color:T.primary}}>{u.full_name?.[0]||"?"}</span></div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:12,fontWeight:600,color:T.fg,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.full_name||"-"}</div>
                          <div style={{fontSize:10,color:T.fgMuted}}>{u.roles?.[0]?.replace(/_/g," ")||"No role"}</div>
                        </div>
                        <button onClick={()=>{setPwdUser(u);setSec("users");}} style={{...S.btn(`${T.primary}14`,T.primary),padding:"3px 8px",fontSize:10}}>
                          <Key size={10}/> Reset
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* - LIVE IP STATS - */}
          {sec==="iplive"&&(
            <div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:16}}>
                {/* My public IP */}
                <div style={S.card}>
                  <div style={S.cardHd(T.primary)}><Globe size={14} color={T.primary}/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>My Public IP</span><span style={{marginLeft:"auto",width:7,height:7,borderRadius:"50%",background:myIP?T.success:T.fgDim,animation:"pulse 2s infinite"}} /></div>
                  <div style={{padding:"16px"}}>
                    {myIP?(
                      <>
                        <div style={{fontSize:22,fontWeight:800,color:T.primary,fontFamily:"monospace",marginBottom:8}}>{myIP}</div>
                        {geo&&<div style={{fontSize:11,color:T.fgMuted,lineHeight:2}}>
                          <div><MapPin size={10} style={{verticalAlign:"middle"}}/> {[geo.city,geo.region,geo.country_name].filter(Boolean).join(", ")||"Unknown"}</div>
                          {geo.org&&<div><TrendingUp size={10} style={{verticalAlign:"middle"}}/> {geo.org}</div>}
                        </div>}
                        <div style={{display:"flex",gap:6,marginTop:10}}>
                          <button onClick={async()=>{await db.from("network_whitelist").insert({cidr:myIP,label:`Allow ${myIP}`,type:"public",active:true,created_at:new Date().toISOString()});toast({title:"Whitelisted"});}} style={S.btn(T.successBg,T.success)}><Check size={11}/> Allow</button>
                          <button onClick={async()=>{await db.from("network_whitelist").insert({cidr:myIP,label:`Block ${myIP}`,type:"blocked",active:true,created_at:new Date().toISOString()});toast({title:"Blocked",variant:"destructive"});}} style={S.btn(T.errorBg,T.error)}><X size={11}/> Block</button>
                        </div>
                      </>
                    ):(
                      <button onClick={detectIP} disabled={ipFetch} style={S.btn(T.primary)}>
                        {ipFetch?<RefreshCw size={13} style={{animation:"spin 1s linear infinite"}}/>:<Globe size={13}/>}
                        {ipFetch?"Detecting...":"Detect My IP"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Active session IPs */}
                <div style={S.card}>
                  <div style={S.cardHd("purple")}><Monitor size={14} color="#7719aa"/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>Active IPs (30m)</span><span style={{marginLeft:"auto",padding:"1px 7px",borderRadius:T.r,background:`${T.success}14`,color:T.success,fontSize:10,fontWeight:700}}>{activeIPs.size}</span></div>
                  <div style={{padding:"0",maxHeight:220,overflowY:"auto"}}>
                    {[...activeIPs.entries()].map(([ip,log])=>(
                      <div key={ip} style={{display:"flex",gap:8,padding:"8px 16px",borderBottom:`1px solid ${T.border}22`,alignItems:"center"}}>
                        <span style={{width:6,height:6,borderRadius:"50%",background:blockedIPs.has(ip)?T.error:T.success,flexShrink:0}}/>
                        <code style={{fontSize:11,color:T.fg,fontFamily:"monospace",flex:1}}>{ip}</code>
                        <span style={{fontSize:9,color:T.fgMuted,padding:"1px 6px",borderRadius:T.r,background:classIP(ip)==="public"?T.primaryBg:`${T.inventory}14`,color:classIP(ip)==="public"?T.primary:T.inventory}}>{classIP(ip)}</span>
                        <button onClick={()=>nav("/admin/ip-access")} style={{...S.btn(T.bg2,T.fgMuted),padding:"3px 7px",fontSize:10}}><Eye size={10}/></button>
                      </div>
                    ))}
                    {activeIPs.size===0&&<div style={{padding:20,textAlign:"center",color:T.fgMuted,fontSize:12}}>No active sessions in last 30 min</div>}
                  </div>
                </div>

                {/* IP Stats summary */}
                <div style={S.card}>
                  <div style={S.cardHd(T.quality)}><Activity size={14} color={T.quality}/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>Access Stats</span></div>
                  <div style={{padding:"12px 16px"}}>
                    {[
                      {l:"Total Logged",   v:ipLog.length,                                        c:T.fg},
                      {l:"Allowed",        v:ipLog.filter(l=>l.status!=="blocked").length,         c:T.success},
                      {l:"Blocked",        v:ipLog.filter(l=>l.status==="blocked").length,          c:T.error},
                      {l:"Unique IPs",     v:new Set(ipLog.map(l=>l.ip_address)).size,             c:T.primary},
                      {l:"Active (30m)",   v:activeIPs.size,                                       c:"#7719aa"},
                      {l:"Block Rules",    v:blockedIPs.size,                                      c:T.warning},
                    ].map(({l,v,c})=>(
                      <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${T.border}18`,fontSize:12}}>
                        <span style={{color:T.fgMuted}}>{l}</span>
                        <span style={{fontWeight:700,color:c,fontFamily:"monospace"}}>{v}</span>
                      </div>
                    ))}
                    <button onClick={()=>nav("/admin/ip-access")} style={{...S.btn(T.primary),marginTop:12,width:"100%",justifyContent:"center"}}>
                      <Globe size={13}/> Full IP Monitor
                    </button>
                  </div>
                </div>
              </div>

              {/* Recent IP log table */}
              <div style={S.card}>
                <div style={S.cardHd(T.system||"#00188f")}><Activity size={14} color="#00188f"/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>Recent Access Log</span></div>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                    <thead><tr style={{background:T.bg2}}>
                      {["Time","IP Address","Type","User","Action","Status"].map(h=><th key={h} style={{padding:"8px 12px",textAlign:"left",fontSize:10,fontWeight:700,color:T.fgDim,borderBottom:`1px solid ${T.border}`}}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {ipLog.slice(0,30).map((l,i)=>(
                        <tr key={i} style={{borderBottom:`1px solid ${T.border}18`}} onMouseEnter={e=>(e.currentTarget.style.background=T.bg)} onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                          <td style={{padding:"6px 12px",color:T.fgDim,fontSize:10,whiteSpace:"nowrap"}}>{new Date(l.created_at).toLocaleString("en-KE",{timeZone:"Africa/Nairobi",hour:"2-digit",minute:"2-digit"})}</td>
                          <td style={{padding:"6px 12px"}}><code style={{fontFamily:"monospace",fontSize:11,color:T.fg}}>{l.ip_address||"-"}</code></td>
                          <td style={{padding:"6px 12px"}}><span style={{fontSize:9,fontWeight:700,color:classIP(l.ip_address||"")==="public"?T.primary:T.inventory}}>{classIP(l.ip_address||"")}</span></td>
                          <td style={{padding:"6px 12px",fontSize:11,color:T.fg,maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.user_id?.slice(0,8)||"-"}</td>
                          <td style={{padding:"6px 12px",fontSize:11,color:T.fgMuted}}>{l.action||"-"}</td>
                          <td style={{padding:"6px 12px"}}><span style={{padding:"2px 7px",borderRadius:T.r,fontSize:10,fontWeight:600,background:l.status==="blocked"?T.errorBg:T.successBg,color:l.status==="blocked"?T.error:T.success}}>{l.status||"ok"}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* - USER PASSWORDS - */}
          {sec==="users"&&(
            <div>
              {/* Password reset form */}
              <div style={{...S.card,marginBottom:16}}>
                <div style={S.cardHd("#7719aa")}><Key size={14} color="#7719aa"/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>Reset User Password</span></div>
                <div style={{padding:"16px",display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
                  <div>
                    <label style={{fontSize:11,color:T.fgDim,display:"block",marginBottom:4}}>Select User</label>
                    <select value={pwdUser?.id||""} onChange={e=>{const u=users.find(u=>u.id===e.target.value);setPwdUser(u||null);}} style={S.inp}>
                      <option value="">-- Choose user --</option>
                      {users.map(u=><option key={u.id} value={u.id}>{u.full_name||u.email} ({u.roles?.[0]||"no role"})</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{fontSize:11,color:T.fgDim,display:"block",marginBottom:4}}>New Password</label>
                    <div style={{position:"relative"}}>
                      <input type={showPwd.reset?"text":"password"} value={newPwd} onChange={e=>setNewPwd(e.target.value)} style={{...S.inp,paddingRight:36}} placeholder="Min 6 characters"/>
                      <button onClick={()=>setShowPwd(p=>({...p,reset:!p.reset}))} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:T.fgDim}}>{showPwd.reset?<EyeOff size={13}/>:<Eye size={13}/>}</button>
                    </div>
                  </div>
                  <div style={{display:"flex",alignItems:"flex-end",gap:8}}>
                    <button onClick={()=>setNewPwd(`Temp@${Math.random().toString(36).slice(2,8).toUpperCase()}!`)} style={S.btn(T.bg2,T.fg)}><RefreshCw size={12}/> Generate</button>
                    <button onClick={resetPwd} disabled={saving||!pwdUser||!newPwd} style={S.btn(saving||!pwdUser||!newPwd?"#ccc":T.primary)}>
                      {saving?<RefreshCw size={13} style={{animation:"spin 1s linear infinite"}}/>:<Save size={13}/>} Reset
                    </button>
                  </div>
                </div>
              </div>

              {/* User table with password view */}
              <div style={S.card}>
                <div style={S.cardHd(T.primary)}><Users size={14} color={T.primary}/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>All Users ({users.length})</span></div>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead><tr style={{background:T.bg}}>
                    {["User","Email","Roles","Status","Temp Password","Actions"].map(h=><th key={h} style={{padding:"8px 14px",textAlign:"left",fontSize:10,fontWeight:700,color:T.fgDim,borderBottom:`1px solid ${T.border}`}}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {users.map(u=>{
                      const tp = tempPwds[u.id];
                      return(
                        <tr key={u.id} style={{borderBottom:`1px solid ${T.border}14`}} onMouseEnter={e=>(e.currentTarget.style.background=T.bg)} onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                          <td style={{padding:"9px 14px"}}>
                            <div style={{display:"flex",alignItems:"center",gap:8}}>
                              <div style={{width:30,height:30,borderRadius:"50%",background:T.primaryBg,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:12,fontWeight:700,color:T.primary}}>{u.full_name?.[0]||"?"}</span></div>
                              <span style={{fontWeight:600,color:T.fg}}>{u.full_name||"-"}</span>
                            </div>
                          </td>
                          <td style={{padding:"9px 14px",color:T.fgMuted,fontSize:11}}>{u.email}</td>
                          <td style={{padding:"9px 14px"}}>
                            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                              {u.roles.slice(0,3).map((r:string)=>(
                                <span key={r} style={{padding:"1px 7px",borderRadius:T.r,fontSize:10,fontWeight:600,background:T.primaryBg,color:T.primary}}>{r.replace(/_/g," ")}</span>
                              ))}
                            </div>
                          </td>
                          <td style={{padding:"9px 14px"}}><span style={{padding:"2px 8px",borderRadius:T.r,fontSize:10,fontWeight:600,background:u.is_active!==false?T.successBg:T.errorBg,color:u.is_active!==false?T.success:T.error}}>{u.is_active!==false?"Active":"Inactive"}</span></td>
                          <td style={{padding:"9px 14px"}}>
                            {tp?(
                              <div style={{display:"flex",alignItems:"center",gap:5}}>
                                <code style={{fontSize:11,fontFamily:"monospace",color:T.warning,background:T.warningBg,padding:"2px 7px",borderRadius:T.r}}>{showPwd[u.id]?tp:"-"}</code>
                                <button onClick={()=>setShowPwd(p=>({...p,[u.id]:!p[u.id]}))} style={{background:"none",border:"none",cursor:"pointer",color:T.fgDim,padding:2}}>{showPwd[u.id]?<EyeOff size={11}/>:<Eye size={11}/>}</button>
                                <button onClick={()=>{navigator.clipboard.writeText(tp);toast({title:"Copied"});}} style={{background:"none",border:"none",cursor:"pointer",color:T.fgDim,padding:2}}><Copy size={11}/></button>
                              </div>
                            ):<span style={{fontSize:10,color:T.fgDim}}>-</span>}
                          </td>
                          <td style={{padding:"9px 14px"}}>
                            <div style={{display:"flex",gap:5}}>
                              <button onClick={()=>{setPwdUser(u);setNewPwd("");}} style={{...S.btn(T.primaryBg,T.primary),padding:"4px 10px",fontSize:11}}><Key size={11}/> Reset</button>
                              <button onClick={()=>nav("/users")} style={{...S.btn(T.bg2,T.fgMuted),padding:"4px 10px",fontSize:11}}><UserCheck size={11}/> Edit</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* - TWILIO - */}
          {sec==="twilio"&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              {/* Status + config */}
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div style={S.card}>
                  <div style={S.cardHd(T.inventory)}><Phone size={14} color={T.inventory}/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>Twilio Configuration</span></div>
                  <div style={{padding:"16px"}}>
                    {[
                      {l:"Account SID",      v:"ACe96c6e0e5..."},
                      {l:"SMS Number",       v:"+16812972643"},
                      {l:"WhatsApp Number",  v:"+14155238886"},
                      {l:"Messaging SID",    v:"MGd547d8e327..."},
                      {l:"WA Join Code",     v:"join bad-machine"},
                    ].map(({l,v})=>(
                      <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${T.border}22`,fontSize:12}}>
                        <span style={{color:T.fgMuted}}>{l}</span>
                        <code style={{color:T.fg,fontFamily:"monospace",fontSize:11}}>{v}</code>
                      </div>
                    ))}
                    <button onClick={checkTwilio} disabled={twilioLoading} style={{...S.btn(T.inventory),marginTop:14}}>
                      {twilioLoading?<RefreshCw size={13} style={{animation:"spin 1s linear infinite"}}/>:<Wifi size={13}/>}
                      {twilioLoading?"Checking...":"Test Twilio Connection"}
                    </button>
                    {twilioStatus&&(
                      <div style={{marginTop:10,padding:"8px 12px",borderRadius:T.r,background:twilioStatus.ok?T.successBg:T.errorBg,border:`1px solid ${twilioStatus.ok?T.success:T.error}44`,fontSize:12,color:twilioStatus.ok?T.success:T.error}}>
                        {twilioStatus.ok?"- Connected - Twilio API live":"- "+twilioStatus.error}
                        {twilioStatus.ok&&<div style={{fontSize:10,marginTop:4,color:T.fgMuted}}>SMS: {twilioStatus.sms_from} | WA: {twilioStatus.wa_from}</div>}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Test panel */}
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div style={S.card}>
                  <div style={S.cardHd(T.quality)}><MessageSquare size={14} color={T.quality}/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>Test SMS</span></div>
                  <div style={{padding:"16px",display:"flex",flexDirection:"column",gap:10}}>
                    <div>
                      <label style={{fontSize:11,color:T.fgDim,display:"block",marginBottom:4}}>Phone Number</label>
                      <input value={smsTest.to} onChange={e=>setSmsTest(p=>({...p,to:e.target.value}))} style={S.inp} placeholder="+254 7xx xxx xxx"/>
                    </div>
                    <div>
                      <label style={{fontSize:11,color:T.fgDim,display:"block",marginBottom:4}}>Message</label>
                      <textarea value={smsTest.msg} onChange={e=>setSmsTest(p=>({...p,msg:e.target.value}))} style={{...S.inp,height:80,resize:"none"}}/>
                    </div>
                    <button onClick={testSMS} disabled={smsSending} style={S.btn(T.quality)}>
                      {smsSending?<RefreshCw size={13} style={{animation:"spin 1s linear infinite"}}/>:<Send size={13}/>}
                      {smsSending?"Sending...":"Send Test SMS"}
                    </button>
                  </div>
                </div>

                <div style={S.card}>
                  <div style={S.cardHd(T.comms||"#0072c6")}><Phone size={14} color="#0072c6"/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>Test Voice Call</span></div>
                  <div style={{padding:"16px",display:"flex",flexDirection:"column",gap:10}}>
                    <div>
                      <label style={{fontSize:11,color:T.fgDim,display:"block",marginBottom:4}}>Phone Number</label>
                      <input value={callTo} onChange={e=>setCallTo(e.target.value)} style={S.inp} placeholder="+254 7xx xxx xxx"/>
                    </div>
                    <button onClick={testCall} disabled={calling} style={S.btn("#0072c6")}>
                      {calling?<RefreshCw size={13} style={{animation:"spin 1s linear infinite"}}/>:<Phone size={13}/>}
                      {calling?"Calling...":"Make Test Call"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* - ROLES - */}
          {sec==="roles"&&(
            <div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
                {[
                  {role:"superadmin",     col:"#d83b01",  caps:["all_access","edit_code","manage_roles","view_codebase"]},
                  {role:"webmaster",      col:"#5c2d91",  caps:["all_access","edit_code","manage_roles","view_codebase"]},
                  {role:"admin",          col:"#00188f",  caps:["all_access","manage_users","system_settings","view_audit"]},
                  {role:"database_admin", col:"#038387",  caps:["manage_mysql","view_schema","run_queries","manage_backups"]},
                  {role:"procurement_manager", col:"#0078d4", caps:["approve_requisitions","create_po","approve_po","manage_suppliers"]},
                  {role:"procurement_officer", col:"#0072c6", caps:["create_requisitions","view_po","receive_goods"]},
                  {role:"accountant",     col:"#7719aa",  caps:["view_financials","create_vouchers","approve_vouchers","manage_budgets"]},
                  {role:"inventory_manager",   col:"#498205", caps:["manage_items","manage_categories","view_stock"]},
                  {role:"warehouse_officer",   col:"#107c10", caps:["receive_goods","issue_items","scan_items"]},
                  {role:"requisitioner",  col:"#d39a04",  caps:["create_requisitions","view_own_requisitions","view_items"]},
                ].map(({role,col,caps})=>(
                  <div key={role} style={{...S.card,overflow:"hidden"}}>
                    <div style={{padding:"10px 14px",background:`${col}10`,borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:8}}>
                      <Shield size={14} color={col}/><span style={{fontWeight:700,fontSize:13,color:T.fg,textTransform:"capitalize"}}>{role.replace(/_/g," ")}</span>
                      <span style={{marginLeft:"auto",padding:"1px 7px",borderRadius:T.r,background:`${col}20`,color:col,fontSize:9,fontWeight:700}}>{caps.length} caps</span>
                    </div>
                    <div style={{padding:"10px 14px",display:"flex",flexWrap:"wrap",gap:4}}>
                      {caps.map(c=><span key={c} style={{padding:"2px 8px",borderRadius:T.r,fontSize:10,fontWeight:500,background:T.bg,border:`1px solid ${T.border}`,color:T.fgMuted}}>{c.replace(/_/g," ")}</span>)}
                    </div>
                    <div style={{padding:"0 14px 12px"}}>
                      <button onClick={()=>nav("/users")} style={{...S.btn(T.primaryBg,T.primary),fontSize:11,padding:"4px 10px"}}><Users size={10}/> Assign Users</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* - MODULE TOGGLES - */}
          {sec==="modules"&&(
            <div style={S.card}>
              <div style={S.cardHd(T.warning)}><Settings size={14} color={T.warning}/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>Module Controls</span></div>
              <div style={{padding:"8px 0"}}>
                {[
                  "enable_procurement","enable_financials","enable_vouchers","enable_quality",
                  "enable_scanner","enable_tenders","enable_contracts_module","enable_documents",
                  "realtime_notifications","maintenance_mode",
                ].map(key=>{
                  const on = moduleCfg[key]!=="false";
                  return(
                    <div key={key} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 16px",borderBottom:`1px solid ${T.border}14`}}>
                      <div style={{flex:1,fontSize:13,color:T.fg,textTransform:"capitalize"}}>{key.replace("enable_","").replace(/_/g," ")}</div>
                      <span style={{fontSize:11,color:on?T.success:T.error,fontWeight:600}}>{on?"Enabled":"Disabled"}</span>
                      <button onClick={()=>toggleModule(key)} style={{display:"inline-flex",width:44,height:24,borderRadius:12,background:on?T.success:T.border,alignItems:"center",padding:2,border:"none",cursor:"pointer",transition:"background .2s"}}>
                        <span style={{width:20,height:20,borderRadius:"50%",background:"#fff",transition:"transform .2s",transform:on?"translateX(20px)":"translateX(0)",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* - BROADCAST - */}
          {sec==="broadcast"&&(
            <div style={{maxWidth:600}}>
              <div style={S.card}>
                <div style={S.cardHd(T.info)}><Bell size={14} color={T.info}/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>System Broadcast</span></div>
                <div style={{padding:16}}>
                  <textarea value={broadcastMsg} onChange={e=>setBroadcastMsg(e.target.value)} rows={4} style={{...S.inp,resize:"vertical",marginBottom:10}} placeholder="Message to all users..."/>
                  <button onClick={sendBroadcast} disabled={broadcasting||!broadcastMsg.trim()} style={S.btn(T.primary)}>
                    {broadcasting?<RefreshCw size={13} style={{animation:"spin 1s linear infinite"}}/>:<Radio size={13}/>}
                    {broadcasting?"Sending...":"Send Broadcast"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* - SYSTEM INFO - */}
          {sec==="system"&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <div style={S.card}>
                <div style={S.cardHd(T.system||"#00188f")}><Server size={14} color="#00188f"/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>System Information</span></div>
                <div style={{padding:"12px 16px"}}>
                  {[
                    ["Version","5.9.0"],["Framework","React 18 + Vite 5"],["Database","Supabase PostgreSQL"],
                    ["Auth","Supabase Auth (PKCE)"],["SMS","Twilio +16812972643"],["WhatsApp","+14155238886"],
                    ["MSG SID","MGd547d8e3273..."],["Storage","Supabase Storage"],["Deploy","EdgeOne CDN"],
                    ["Repo","github.com/huiejorjdsksfn"],
                  ].map(([k,v])=>(
                    <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${T.border}18`,fontSize:12}}>
                      <span style={{color:T.fgMuted}}>{k}</span>
                      <code style={{color:T.fg,fontFamily:"monospace",fontSize:11}}>{v}</code>
                    </div>
                  ))}
                </div>
              </div>
              <div style={S.card}>
                <div style={S.cardHd(T.quality)}><Activity size={14} color={T.quality}/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>Quick Links</span></div>
                <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:6}}>
                  {[
                    {l:"DB Monitor",   p:"/admin/db-test"},
                    {l:"IP Access",    p:"/admin/ip-access"},
                    {l:"Audit Log",    p:"/audit-log"},
                    {l:"Webmaster",    p:"/webmaster"},
                    {l:"ODBC/MySQL",   p:"/odbc"},
                    {l:"Backup",       p:"/backup"},
                    {l:"Superadmin",   p:"/superadmin"},
                  ].map(({l,p})=>(
                    <button key={p} onClick={()=>nav(p)} style={{...S.btn(T.bg,T.fgMuted),justifyContent:"space-between",fontSize:12}}>
                      {l}<ChevronRight size={12}/>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import type React from "react";
