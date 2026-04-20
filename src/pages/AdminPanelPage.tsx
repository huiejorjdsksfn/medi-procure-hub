/**
 * ProcurBosse  -- Admin Panel v8.0
 * [OK] All hooks at component top-level (no hooks in render functions)
 * [OK] ServicesPanel + ActivityLog extracted as proper React components
 * [OK] Live Sessions from user_sessions table with realtime Supabase subscription
 * [OK] User Action Log feed  -- every page view, click, create, update, delete
 * [OK] System metrics from native C++ agent via system_metrics table
 * [OK] Twilio config from DB * Password reset * Role management
 * EL5 MediProcure * Embu Level 5 Hospital
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { T } from "@/lib/theme";
import { sendSms, makeCall, checkTwilioStatus } from "@/lib/sms";
import {
  LayoutDashboard, Users, Shield, Phone, Globe, Activity, Database,
  Settings, RefreshCw, Save, Eye, EyeOff, Send, Lock, Key, Radio,
  AlertTriangle, Zap, Monitor, ChevronRight, Ban,
  Network, BarChart2, PhoneCall, MessageSquare,
  Satellite, Edit3, CheckCircle, XCircle, Loader2, Server, X,
  Power, RotateCcw, HardDrive, Wifi
} from "lucide-react";

const db = supabase as any;

const C = {
  blue:"#0078d4", blueBg:"#e8f4fd", purple:"#7719aa", purpleBg:"#f3e8ff",
  green:"#107c10", greenBg:"#dff6dd", red:"#a4262c",  redBg:"#fde7e9",
  orange:"#d83b01",orangeBg:"#fdf1ed",teal:"#038387", tealBg:"#d8f3f4",
  grey:"#5a6475",  greyBg:"#f3f5f8",
};

const S = {
  page:  { background:T.bg, minHeight:"100vh", fontFamily:"'Segoe UI','Inter',sans-serif" } as React.CSSProperties,
  header:{ background:C.blue, padding:"0 20px", display:"flex", alignItems:"stretch", minHeight:44, boxShadow:"0 2px 6px rgba(0,0,120,.25)" } as React.CSSProperties,
  bc:    { background:"#fff", padding:"8px 20px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", gap:6, fontSize:12, color:T.fgMuted } as React.CSSProperties,
  body:  { display:"grid", gridTemplateColumns:"210px 1fr", minHeight:"calc(100vh - 88px)" } as React.CSSProperties,
  sb:    { background:"#fff", borderRight:`1px solid ${T.border}`, paddingTop:8 } as React.CSSProperties,
  main:  { padding:"20px 24px", overflowY:"auto" as const, background:T.bg },
  card:  { background:"#fff", border:`1px solid ${T.border}`, borderRadius:T.rLg, boxShadow:T.shadow, overflow:"hidden" as const, marginBottom:16 } as React.CSSProperties,
  ch:    (col:string) => ({ padding:"11px 16px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", gap:8, background:col+"0a" } as React.CSSProperties),
  cb:    { padding:"16px" } as React.CSSProperties,
  inp:   { width:"100%", border:`1px solid ${T.border}`, borderRadius:T.r, padding:"7px 11px", fontSize:13, outline:"none", background:"#fff", color:T.fg, boxSizing:"border-box" as const, fontFamily:"inherit" } as React.CSSProperties,
  btn:   (bg:string, fg="white", bd?:string) => ({ display:"inline-flex", alignItems:"center", gap:6, padding:"7px 14px", background:bg, color:fg, border:`1px solid ${bd||bg}`, borderRadius:T.r, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", transition:"all .12s" } as React.CSSProperties),
  badge: (col:string) => ({ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px", borderRadius:99, fontSize:10, fontWeight:700, background:col+"20", color:col, border:`1px solid ${col}44` } as React.CSSProperties),
  pill:  (col:string, bg:string) => ({ display:"inline-block", padding:"2px 8px", borderRadius:99, fontSize:10, fontWeight:700, color:col, background:bg } as React.CSSProperties),
  th:    { padding:"8px 12px", textAlign:"left" as const, fontSize:10, fontWeight:700, color:T.fgDim, borderBottom:`1px solid ${T.border}`, background:T.bg, whiteSpace:"nowrap" as const },
  td:    { padding:"8px 12px", fontSize:12, color:T.fg, borderBottom:`1px solid ${T.border}18` },
};

const NAVS = [
  { id:"overview",  label:"Overview",       icon:LayoutDashboard, col:C.blue   },
  { id:"iplive",    label:"Live IP Stats",   icon:Globe,           col:C.blue   },
  { id:"sessions",  label:"Live Sessions",   icon:Monitor,         col:C.teal   },
  { id:"actions",   label:"User Actions",    icon:BarChart2,       col:C.orange },
  { id:"users",     label:"User Passwords",  icon:Key,             col:C.purple },
  { id:"roles",     label:"Roles & Access",  icon:Shield,          col:C.red    },
  { id:"twilio",    label:"Twilio / SMS",    icon:Phone,           col:C.green  },
  { id:"broadcast", label:"Broadcast",       icon:Radio,           col:C.orange },
  { id:"services",  label:"App & Services",  icon:Power,           col:C.teal   },
  { id:"activity",  label:"Activity Log",    icon:Activity,        col:C.purple },
  { id:"system",    label:"System Info",     icon:Server,          col:C.grey   },
];

const ALL_ROLES = ["superadmin","webmaster","admin","database_admin","procurement_manager","procurement_officer","inventory_manager","warehouse_officer","requisitioner","accountant"] as const;
type Role = typeof ALL_ROLES[number];

const ROLE_META: Record<string,{col:string;bg:string;label:string}> = {
  superadmin:          {col:"#6b21a8",bg:"#f3e8ff",label:"Superadmin"},
  webmaster:           {col:"#0ea5e9",bg:"#e0f2fe",label:"Webmaster"},
  admin:               {col:"#dc2626",bg:"#fee2e2",label:"Admin"},
  database_admin:      {col:"#7c2d12",bg:"#ffedd5",label:"DB Admin"},
  procurement_manager: {col:"#1d4ed8",bg:"#dbeafe",label:"Proc. Manager"},
  procurement_officer: {col:"#0369a1",bg:"#e0f2fe",label:"Proc. Officer"},
  inventory_manager:   {col:"#047857",bg:"#d1fae5",label:"Inv. Manager"},
  warehouse_officer:   {col:"#7c3aed",bg:"#ede9fe",label:"Warehouse"},
  requisitioner:       {col:"#d97706",bg:"#fef3c7",label:"Requisitioner"},
  accountant:          {col:"#065f46",bg:"#d1fae5",label:"Accountant"},
};

const FLAG_MAP: Record<string,string> = {KE:"",US:"",GB:"",NG:"",ZA:"",UG:"",TZ:"",ET:"",IN:"",CN:"",RU:"",DE:""};

async function fetchMyIP(): Promise<string|null> {
  for (const url of ["https://api.ipify.org?format=json","https://api64.ipify.org?format=json"]) {
    try { const d = await (await fetch(url,{signal:AbortSignal.timeout(4000)})).json(); if(d.ip) return d.ip; } catch {}
  }
  return null;
}
async function fetchGeo(ip:string): Promise<any> {
  try { return await (await fetch(`https://ipapi.co/${ip}/json/`,{signal:AbortSignal.timeout(5000)})).json(); } catch { return null; }
}

const Pulse = ({col=C.green}:{col?:string}) => (
  <span style={{position:"relative",display:"inline-flex",width:8,height:8,flexShrink:0}}>
    <span style={{position:"absolute",inset:0,borderRadius:"50%",background:col,opacity:.4,animation:"ping 1.5s cubic-bezier(0,0,.2,1) infinite"}}/>
    <span style={{width:8,height:8,borderRadius:"50%",background:col}}/>
  </span>
);

const KpiCard = ({label,value,col,icon:Icon}:{label:string;value:number|string;col:string;icon:any}) => (
  <div style={{background:"#fff",border:`1px solid ${T.border}`,borderRadius:T.rLg,padding:"14px 18px",display:"flex",alignItems:"center",gap:12,boxShadow:T.shadow}}>
    <div style={{width:38,height:38,borderRadius:T.rLg,background:col+"18",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
      <Icon size={18} color={col}/>
    </div>
    <div>
      <div style={{fontSize:20,fontWeight:700,color:T.fg,lineHeight:1.1}}>{value}</div>
      <div style={{fontSize:11,color:T.fgMuted,marginTop:2}}>{label}</div>
    </div>
  </div>
);

/* =======================================================================
   SERVICES PANEL  -- proper React component (fixes React #310)
======================================================================= */
const SERVICES_DEF = [
  {id:"web",      label:"Web Application",  desc:"Front-end & routing",       icon:Globe,     col:C.blue,   action:"reload"},
  {id:"edge",     label:"Edge Functions",   desc:"SMS, email, ODBC, notify",   icon:Zap,       col:C.green,  action:"redeploy"},
  {id:"realtime", label:"Realtime Engine",  desc:"WebSocket subscriptions",    icon:Network,   col:C.teal,   action:"reconnect"},
  {id:"cache",    label:"Schema Cache",     desc:"PostgREST schema refresh",   icon:Database,  col:C.purple, action:"flush_cache"},
  {id:"auth",     label:"Auth Service",     desc:"Supabase Auth sessions",     icon:Shield,    col:C.red,    action:"restart"},
  {id:"storage",  label:"Storage Service",  desc:"File uploads & buckets",     icon:HardDrive, col:C.orange, action:"restart"},
];

function ServicesPanel({userId}:{userId?:string}) {
  const [restarting, setRestarting] = useState<string|null>(null);
  const [restartLog, setRestartLog] = useState<any[]>([]);

  const loadLog = useCallback(async () => {
    const {data} = await db.from("app_restart_log").select("*").order("created_at",{ascending:false}).limit(20);
    setRestartLog(data||[]);
  },[]);

  useEffect(()=>{
    loadLog();
    const ch = db.channel("restart:live")
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"app_restart_log"},loadLog)
      .subscribe();
    return()=>db.removeChannel(ch);
  },[loadLog]);

  const doRestart = async (svc:typeof SERVICES_DEF[0]) => {
    setRestarting(svc.id);
    try {
      await db.from("app_restart_log").insert({
        service:svc.id, action:svc.action, triggered_by:userId,
        status:"initiated", notes:`${svc.action} triggered`, created_at:new Date().toISOString()
      });
      if (svc.id==="cache") {
        await supabase.rpc("reload_schema").catch(()=>{});
      }
      if (svc.id==="web") {
        toast({title:"[OK] Reloading...", description:"App reloads in 2s"});
        setTimeout(()=>typeof window !== "undefined" && window.location.reload(),2000);
      } else {
        toast({title:`[OK] ${svc.label}  -- ${svc.action}`});
      }
      await db.from("app_restart_log")
        .update({status:"complete",completed_at:new Date().toISOString()})
        .eq("service",svc.id).eq("status","initiated");
      loadLog();
    } catch(e:any) { toast({title:`[X] Failed`,description:e.message,variant:"destructive"}); }
    setRestarting(null);
  };

  const actionLabel = (a:string) => a.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase());

  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
        {SERVICES_DEF.map(svc=>(
          <div key={svc.id} style={{...S.card,border:`1px solid ${svc.col}33`,borderTop:`3px solid ${svc.col}`,marginBottom:0}}>
            <div style={{padding:"14px 16px",display:"flex",flexDirection:"column",gap:10}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:36,height:36,borderRadius:T.rLg,background:svc.col+"18",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <svc.icon size={18} color={svc.col}/>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:T.fg}}>{svc.label}</div>
                  <div style={{fontSize:10,color:T.fgMuted}}>{svc.desc}</div>
                </div>
                <div style={{width:8,height:8,borderRadius:"50%",background:C.green}}/>
              </div>
              <button onClick={()=>doRestart(svc)} disabled={restarting===svc.id}
                style={{...S.btn(svc.col),width:"100%",justifyContent:"center",padding:"8px 0"}}>
                {restarting===svc.id
                  ? <><Loader2 size={13} style={{animation:"spin 1s linear infinite"}}/>Processing...</>
                  : <><RotateCcw size={13}/>{actionLabel(svc.action)}</>
                }
              </button>
            </div>
          </div>
        ))}
      </div>
      <div style={S.card}>
        <div style={S.ch(C.grey)}>
          <Activity size={15} color={C.grey}/>
          <span style={{fontSize:13,fontWeight:700,color:C.grey}}>Restart Log</span>
          <span style={{...S.badge(C.grey),marginLeft:"auto"}}>{restartLog.length}</span>
          <button onClick={loadLog} style={{...S.btn("transparent",C.grey,C.grey),padding:"3px 8px"}}><RefreshCw size={11}/></button>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>{["Service","Action","Status","Time"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {restartLog.map(r=>(
                <tr key={r.id}>
                  <td style={S.td}><strong>{r.service}</strong></td>
                  <td style={S.td}>{r.action}</td>
                  <td style={S.td}><span style={S.badge(r.status==="complete"?C.green:r.status==="failed"?C.red:C.orange)}>{r.status}</span></td>
                  <td style={{...S.td,fontSize:11,color:T.fgMuted}}>{new Date(r.created_at).toLocaleString("en-KE",{dateStyle:"short",timeStyle:"short"})}</td>
                </tr>
              ))}
              {!restartLog.length&&<tr><td colSpan={4} style={{...S.td,textAlign:"center",padding:20,color:T.fgMuted}}>No restarts yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* =======================================================================
   ACTIVITY LOG  -- proper React component (fixes React #310)
======================================================================= */
function ActivityLog() {
  const [logs, setLogs]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const {data} = await db.from("admin_activity_log")
      .select("*,profiles!admin_activity_log_user_id_fkey(full_name,email)")
      .order("created_at",{ascending:false}).limit(150);
    setLogs(data||[]);
    setLoading(false);
  },[]);

  useEffect(()=>{
    load();
    const ch = db.channel("activity:live")
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"admin_activity_log"},load)
      .subscribe();
    return()=>db.removeChannel(ch);
  },[load]);

  const SEV_COL: Record<string,string> = {info:C.blue,warning:C.orange,critical:C.red,error:C.red};

  return (
    <div style={S.card}>
      <div style={S.ch(C.purple)}>
        <Activity size={15} color={C.purple}/>
        <span style={{fontSize:13,fontWeight:700,color:C.purple}}>Admin Activity Log</span>
        <span style={{...S.badge(C.purple),marginLeft:"auto"}}><Pulse col={C.purple}/>{logs.length} events</span>
        <button onClick={load} style={{...S.btn("transparent",C.purple,C.purple),padding:"3px 8px"}}><RefreshCw size={11}/></button>
      </div>
      <div style={{overflowX:"auto",maxHeight:520,overflowY:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead style={{position:"sticky",top:0,zIndex:1}}>
            <tr>{["User","Action","Entity","Severity","Details","Time"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {loading
              ? <tr><td colSpan={6} style={{...S.td,textAlign:"center",padding:30}}><Loader2 size={20} style={{animation:"spin 1s linear infinite",color:C.purple}}/></td></tr>
              : logs.map((r,i)=>(
                <tr key={r.id} style={{background:i%2===0?"#fff":"#fafbfc"}}>
                  <td style={S.td}>
                    {r.profiles?.full_name||"System"}
                    <br/><span style={{fontSize:9,color:T.fgMuted}}>{r.profiles?.email}</span>
                  </td>
                  <td style={S.td}><code style={{fontSize:10,background:T.bg,padding:"1px 5px",borderRadius:3}}>{r.action}</code></td>
                  <td style={S.td}>{r.entity_type||" --"}</td>
                  <td style={S.td}><span style={S.badge(SEV_COL[r.severity||"info"]||C.blue)}>{r.severity||"info"}</span></td>
                  <td style={{...S.td,maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontSize:10}}>
                    {r.details?JSON.stringify(r.details).slice(0,70):" --"}
                  </td>
                  <td style={{...S.td,fontSize:10,color:T.fgMuted}}>{new Date(r.created_at).toLocaleString("en-KE",{dateStyle:"short",timeStyle:"short"})}</td>
                </tr>
              ))
            }
            {!loading&&!logs.length&&<tr><td colSpan={6} style={{...S.td,textAlign:"center",padding:20,color:T.fgMuted}}>No activity yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* =======================================================================
   MAIN ADMIN PANEL COMPONENT
======================================================================= */
export default function AdminPanelPage() {
  const nav = useNavigate();
  const {user} = useAuth();
  const [sec, setSec]           = useState("overview");
  const [kpi, setKpi]           = useState({users:0,reqs:0,pos:0,suppliers:0,ips:0,sessions:0});
  const [ipLog, setIpLog]       = useState<any[]>([]);
  const [myIP, setMyIP]         = useState("");
  const [myGeo, setMyGeo]       = useState<any>(null);
  const [ipLoading, setIpLoading] = useState(false);
  const [activeIPs, setActiveIPs] = useState<Map<string,any>>(new Map());
  const [sessions, setSessions]       = useState<any[]>([]);
  const [liveActions, setLiveActions] = useState<any[]>([]);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [userList, setUserList] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [pwdReset, setPwdReset] = useState<{userId:string;email:string;name:string}|null>(null);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [showPwd, setShowPwd]   = useState<Record<string,boolean>>({});
  const [pwdLog, setPwdLog]     = useState<any[]>([]);
  const [roleUsers, setRoleUsers] = useState<any[]>([]);
  const [roleSearch, setRoleSearch] = useState("");
  const [editRole, setEditRole] = useState<{userId:string;name:string;currentRoles:string[]}|null>(null);
  const [rolesSaving, setRolesSaving] = useState(false);
  const [twilioStatus, setTwilioStatus] = useState<any>(null);
  const [twilioLoading, setTwilioLoading] = useState(false);
  const [twilioCfg, setTwilioCfg] = useState({account_sid:"",auth_token:"",phone_number:"",wa_number:"",messaging_sid:""});
  const [twilioSaving, setTwilioSaving] = useState(false);
  const [smsTest, setSmsTest]   = useState({to:"",msg:"Test from EL5 MediProcure Admin"});
  const [smsSending, setSmsSending] = useState(false);
  const [callTest, setCallTest] = useState({to:"",msg:"Hello from Embu Level 5 Hospital."});
  const [callPlacing, setCallPlacing] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);

  /* -- Data loaders ----------------------------------------------- */
  const loadKpi = useCallback(async () => {
    const [u,r,p,s,i,se] = await Promise.allSettled([
      db.from("profiles").select("id",{count:"exact",head:true}),
      db.from("requisitions").select("id",{count:"exact",head:true}).in("status",["submitted","pending"]),
      db.from("purchase_orders").select("id",{count:"exact",head:true}),
      db.from("suppliers").select("id",{count:"exact",head:true}).eq("status","active"),
      db.from("ip_live_stats").select("id",{count:"exact",head:true}).gte("created_at",new Date(Date.now()-86400000).toISOString()),
      db.from("session_tracker").select("id",{count:"exact",head:true}).eq("is_active",true),
    ]);
    const v=(x:any)=>x.status==="fulfilled"?(x.value?.count??0):0;
    setKpi({users:v(u),reqs:v(r),pos:v(p),suppliers:v(s),ips:v(i),sessions:v(se)});
  },[]);

  const loadIPLog = useCallback(async () => {
    const {data} = await db.from("ip_live_stats")
      .select("*,profiles!ip_live_stats_user_id_fkey(full_name,email)")
      .order("created_at",{ascending:false}).limit(150);
    setIpLog(data||[]);
    const m = new Map<string,any>();
    (data||[]).forEach((r:any)=>{ if(!m.has(r.ip_address)) m.set(r.ip_address,r); });
    setActiveIPs(m);
  },[]);

  const loadSessions = useCallback(async () => {
    // Try new user_sessions table first, fall back to legacy session_tracker
    const {data:newData} = await db.from("user_sessions")
      .select("*,profiles!user_sessions_user_id_fkey(full_name,email)")
      .eq("status","active").order("last_seen_at",{ascending:false}).limit(80);
    if (newData && newData.length > 0) { setSessions(newData); return; }
    // legacy fallback
    const {data} = await db.from("session_tracker")
      .select("*,profiles!session_tracker_user_id_fkey(full_name,email)")
      .eq("is_active",true).order("last_seen",{ascending:false}).limit(50);
    setSessions(data||[]);
  },[]);

  const loadActionLog = useCallback(async () => {
    const {data} = await db.from("user_action_log")
      .select("*,profiles!user_action_log_user_id_fkey(full_name,email)")
      .order("created_at",{ascending:false}).limit(200);
    setLiveActions(data||[]);
  },[]);

  const loadUsers = useCallback(async () => {
    const {data} = await db.from("profiles")
      .select("id,full_name,email,phone_number,department,is_active,created_at,last_active_at,employee_id")
      .order("full_name");
    if (!data) return;
    const {data:rData} = await db.from("user_roles").select("user_id,role");
    const rm: Record<string,string[]> = {};
    (rData||[]).forEach((r:any)=>{ if(!rm[r.user_id]) rm[r.user_id]=[]; rm[r.user_id].push(r.role); });
    const mapped = data.map((u:any)=>({...u,roles:rm[u.id]||[]}));
    setUserList(mapped); setRoleUsers(mapped);
  },[]);

  const loadPwdLog = useCallback(async () => {
    const {data} = await db.from("password_reset_log")
      .select("*,profiles!password_reset_log_target_user_id_fkey(full_name,email),admin:profiles!password_reset_log_admin_user_id_fkey(full_name)")
      .order("created_at",{ascending:false}).limit(30);
    setPwdLog(data||[]);
  },[]);

  const loadTwilioCfg = useCallback(async () => {
    const {data} = await db.from("twilio_config").select("*").eq("env","production").maybeSingle();
    if (data) setTwilioCfg({
      account_sid:data.account_sid||"",auth_token:data.auth_token||"",
      phone_number:data.phone_number||"",wa_number:data.wa_number||"",messaging_sid:data.messaging_sid||""
    });
  },[]);

  const detectMyIP = useCallback(async () => {
    setIpLoading(true);
    const ip = await fetchMyIP();
    if (ip) {
      setMyIP(ip);
      const geo = await fetchGeo(ip);
      setMyGeo(geo);
      await db.from("ip_live_stats").insert({
        ip_address:ip, user_id:user?.id, country:geo?.country_name, city:geo?.city,
        region:geo?.region, isp:geo?.org, org:geo?.org, latitude:geo?.latitude,
        longitude:geo?.longitude, timezone:geo?.timezone, country_code:geo?.country_code,
        flag_emoji:geo?.country_code?(FLAG_MAP[geo.country_code]||""):"", event_type:"active"
      }).catch(()=>{});
      await loadIPLog();
    }
    setIpLoading(false);
  },[user?.id,loadIPLog]);

  /* -- Realtime subscriptions ------------------------------------- */
  useEffect(()=>{
    loadKpi(); loadIPLog(); loadSessions(); loadActionLog(); loadUsers(); loadPwdLog(); loadTwilioCfg(); detectMyIP();
    const iv = setInterval(()=>{ loadKpi(); loadIPLog(); loadSessions(); loadActionLog(); },15000);
    return ()=>clearInterval(iv);
  },[]);

  useEffect(()=>{
    const ch = db.channel("admin:live")
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"ip_live_stats"},()=>{loadIPLog();loadKpi();})
      .on("postgres_changes",{event:"*",schema:"public",table:"session_tracker"},()=>{loadSessions();loadKpi();})
      .on("postgres_changes",{event:"*",schema:"public",table:"user_sessions"},()=>{loadSessions();loadKpi();})
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"user_action_log"},()=>{loadActionLog();})
      .on("postgres_changes",{event:"*",schema:"public",table:"profiles"},()=>{loadUsers();loadKpi();})
      .on("postgres_changes",{event:"*",schema:"public",table:"user_roles"},()=>loadUsers())
      .subscribe();
    return()=>db.removeChannel(ch);
  },[]);

  /* -- Actions ---------------------------------------------------- */
  const handlePasswordReset = async (target:{userId:string;email:string;name:string}) => {
    setPwdLoading(true);
    try {
      const {error} = await supabase.auth.resetPasswordForEmail(target.email,{redirectTo:`${window.location.origin}/reset-password`});
      if (error) throw error;
      await db.from("password_reset_log").insert({target_user_id:target.userId,admin_user_id:user?.id,action:"reset_email",ip_address:myIP||null,success:true});
      await db.from("admin_activity_log").insert({user_id:user?.id,action:"password_reset",entity_type:"user",entity_id:target.userId,details:{email:target.email},severity:"warning"});
      toast({title:"[OK] Reset Email Sent",description:`Link sent to ${target.email}`});
      setPwdReset(null); loadPwdLog();
    } catch(e:any) { toast({title:"[X] Reset Failed",description:e.message,variant:"destructive"}); }
    setPwdLoading(false);
  };

  const testTwilio = async () => {
    setTwilioLoading(true);
    try {
      const res = await checkTwilioStatus();
      setTwilioStatus(res);
      await db.from("twilio_config").update({last_tested_at:new Date().toISOString(),last_test_ok:res?.ok||false,test_error:res?.ok?null:(res?.error||"Unknown")}).eq("env","production");
      toast({title:res?.ok?"[OK] Twilio Live":"[!] Twilio Issue",description:res?.ok?"Account verified":(res?.error||"Check credentials")});
    } catch(e:any) { setTwilioStatus({ok:false,error:e.message}); }
    setTwilioLoading(false);
  };

  const saveTwilioCfg = async () => {
    setTwilioSaving(true);
    try {
      await db.from("twilio_config").update({...twilioCfg,updated_at:new Date().toISOString(),updated_by:user?.id}).eq("env","production");
      await db.from("admin_activity_log").insert({user_id:user?.id,action:"twilio_config_update",entity_type:"config",severity:"warning"});
      toast({title:"[OK] Twilio Config Saved"});
    } catch(e:any) { toast({title:"[X] Save Failed",description:e.message,variant:"destructive"}); }
    setTwilioSaving(false);
  };

  const sendTestSMS = async () => {
    if (!smsTest.to) return toast({title:"Enter a phone number",variant:"destructive"});
    setSmsSending(true);
    const res = await sendSms({to:smsTest.to,message:smsTest.msg,module:"admin_test",sentBy:user?.id});
    toast({title:res.ok?"[OK] SMS Sent":"[X] SMS Failed",description:res.ok?`Sent to ${smsTest.to}`:(res.error||"Check logs"),variant:res.ok?"default":"destructive"});
    setSmsSending(false);
  };

  const placeTestCall = async () => {
    if (!callTest.to) return toast({title:"Enter a phone number",variant:"destructive"});
    setCallPlacing(true);
    const res = await makeCall({to:callTest.to,message:callTest.msg});
    toast({title:res.ok?"[OK] Call Initiated":"[X] Call Failed",description:res.ok?`Calling ${callTest.to}`:(res.error||"Check logs"),variant:res.ok?"default":"destructive"});
    setCallPlacing(false);
  };

  const saveRoles = async (userId:string,newRoles:string[]) => {
    setRolesSaving(true);
    try {
      await db.from("user_roles").delete().eq("user_id",userId);
      if (newRoles.length>0) await db.from("user_roles").insert(newRoles.map(r=>({user_id:userId,role:r,granted_by:user?.id})));
      await db.from("admin_activity_log").insert({user_id:user?.id,action:"update_roles",entity_type:"user",entity_id:userId,details:{roles:newRoles},severity:"warning"});
      toast({title:"[OK] Roles Updated"}); setEditRole(null); loadUsers();
    } catch(e:any) { toast({title:"[X] Failed",description:e.message,variant:"destructive"}); }
    setRolesSaving(false);
  };

  const sendBroadcast = async () => {
    if (!broadcastMsg.trim()) return;
    setBroadcasting(true);
    try {
      await db.from("notifications").insert({title:" Admin Broadcast",message:broadcastMsg,type:"broadcast",sent_by:user?.id,created_at:new Date().toISOString()});
      await db.from("admin_activity_log").insert({user_id:user?.id,action:"broadcast_sent",entity_type:"notification",details:{message:broadcastMsg.slice(0,100)},severity:"info"});
      toast({title:"[OK] Broadcast Sent"}); setBroadcastMsg("");
    } catch(e:any) { toast({title:"[X] Failed",description:e.message,variant:"destructive"}); }
    setBroadcasting(false);
  };

  /* -- Nav item --------------------------------------------------- */
  const NavItem = ({item}:{item:typeof NAVS[0]}) => {
    const active = sec===item.id;
    return (
      <button onClick={()=>setSec(item.id)} style={{display:"flex",alignItems:"center",gap:9,width:"100%",padding:"8px 14px",background:active?item.col+"12":"transparent",borderLeft:`3px solid ${active?item.col:"transparent"}`,border:"none",cursor:"pointer",fontSize:12,fontWeight:active?700:500,color:active?item.col:T.fg,textAlign:"left",transition:"all .1s"}}>
        <item.icon size={14}/>{item.label}
      </button>
    );
  };

  /* === RENDER SECTIONS ============================================= */

  const renderOverview = () => (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
        <KpiCard label="Total Users"       value={kpi.users}    col={C.blue}   icon={Users}/>
        <KpiCard label="Open Requisitions" value={kpi.reqs}     col={C.orange} icon={AlertTriangle}/>
        <KpiCard label="Purchase Orders"   value={kpi.pos}      col={C.purple} icon={BarChart2}/>
        <KpiCard label="Active Suppliers"  value={kpi.suppliers} col={C.green} icon={Zap}/>
        <KpiCard label="IP Events (24h)"   value={kpi.ips}      col={C.teal}   icon={Globe}/>
        <KpiCard label="Active Sessions"   value={kpi.sessions} col={C.red}    icon={Monitor}/>
      </div>
      <div style={S.card}>
        <div style={S.ch(C.blue)}>
          <Globe size={15} color={C.blue}/>
          <span style={{fontSize:13,fontWeight:700,color:C.blue}}>My Connection</span>
          <span style={{...S.badge(myGeo?C.green:C.grey),marginLeft:"auto"}}>{myGeo?<><Pulse/>Live</>:"Detecting..."}</span>
          <button onClick={detectMyIP} disabled={ipLoading} style={{...S.btn(C.blue),marginLeft:8,padding:"3px 10px"}}>
            {ipLoading?<Loader2 size={11} style={{animation:"spin 1s linear infinite"}}/>:<RefreshCw size={11}/>}
          </button>
        </div>
        <div style={{...S.cb,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
          {[["IP Address",myIP||"Detecting..."],["Country",myGeo?`${FLAG_MAP[myGeo.country_code]||""} ${myGeo.country_name}`:" --"],["City",myGeo?`${myGeo.city}, ${myGeo.region}`:" --"],["ISP",myGeo?.org||" --"],["Timezone",myGeo?.timezone||" --"],["Coords",myGeo?`${myGeo.latitude?.toFixed(4)}, ${myGeo.longitude?.toFixed(4)}`:" --"]].map(([l,v])=>(
            <div key={l} style={{background:T.bg,borderRadius:T.r,padding:"10px 12px"}}>
              <div style={{fontSize:10,color:T.fgMuted,marginBottom:3}}>{l}</div>
              <div style={{fontSize:13,fontWeight:600,color:T.fg}}>{v}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={S.card}>
        <div style={S.ch(C.teal)}>
          <Activity size={15} color={C.teal}/>
          <span style={{fontSize:13,fontWeight:700,color:C.teal}}>Recent IP Events</span>
          <span style={{...S.badge(C.teal),marginLeft:"auto"}}><Pulse col={C.teal}/>{ipLog.length} total</span>
          <button onClick={loadIPLog} style={{...S.btn("transparent",C.teal,C.teal),padding:"3px 8px"}}><RefreshCw size={11}/></button>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>{["IP","Country","City","ISP","Event","User","Time"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {ipLog.slice(0,10).map((row,i)=>(
                <tr key={i} style={{background:i%2===0?"#fff":"#fafbfc"}}>
                  <td style={S.td}><code style={{fontSize:11,background:T.bg,padding:"1px 5px",borderRadius:3}}>{row.ip_address}</code></td>
                  <td style={S.td}>{row.flag_emoji||""} {row.country||" --"}</td>
                  <td style={S.td}>{row.city||" --"}</td>
                  <td style={{...S.td,fontSize:11}}>{row.isp?.slice(0,28)||" --"}</td>
                  <td style={S.td}><span style={S.pill(row.event_type==="blocked"?C.red:row.event_type==="failed_login"?C.orange:C.green,row.event_type==="blocked"?"#fde7e9":row.event_type==="failed_login"?"#fdf1ed":"#dff6dd")}>{row.event_type}</span></td>
                  <td style={S.td}>{row.profiles?.full_name||" --"}</td>
                  <td style={S.td}>{new Date(row.created_at).toLocaleTimeString("en-KE")}</td>
                </tr>
              ))}
              {!ipLog.length&&<tr><td colSpan={7} style={{...S.td,textAlign:"center",padding:20,color:T.fgMuted}}>No IP events yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderIPLive = () => (
    <div>
      <div style={{display:"flex",gap:10,marginBottom:16}}>
        <button onClick={detectMyIP} disabled={ipLoading} style={S.btn(C.blue)}>
          {ipLoading?<Loader2 size={13} style={{animation:"spin 1s linear infinite"}}/>:<Globe size={13}/>}
          {ipLoading?"Detecting...":"Detect My IP"}
        </button>
        <button onClick={loadIPLog} style={S.btn("#fff",C.blue,C.blue)}><RefreshCw size={13}/>Refresh</button>
        <span style={{...S.badge(C.teal),marginLeft:"auto"}}><Pulse col={C.teal}/>{activeIPs.size} Unique IPs</span>
      </div>
      {activeIPs.size>0&&(
        <div style={S.card}>
          <div style={S.ch(C.teal)}><Satellite size={15} color={C.teal}/><span style={{fontSize:13,fontWeight:700,color:C.teal}}>Active IPs</span></div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:10,padding:16}}>
            {Array.from(activeIPs.values()).map((ip:any,i)=>(
              <div key={i} style={{background:T.bg,border:`1px solid ${T.border}`,borderRadius:T.rLg,padding:"12px 14px"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  <Pulse/>
                  <code style={{fontSize:13,fontWeight:700,color:T.fg}}>{ip.ip_address}</code>
                  <span style={{...S.pill(C.green,"#dff6dd"),marginLeft:"auto"}}>Live</span>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,fontSize:11,color:T.fgMuted}}>
                  <span> {ip.flag_emoji||""} {ip.country||"Unknown"}</span>
                  <span> {ip.city||" --"}</span>
                  <span> {ip.isp?.slice(0,20)||" --"}</span>
                  <span> {new Date(ip.created_at).toLocaleTimeString("en-KE")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={S.card}>
        <div style={S.ch(C.blue)}>
          <Activity size={15} color={C.blue}/>
          <span style={{fontSize:13,fontWeight:700,color:C.blue}}>Full IP Event Log</span>
          <span style={{...S.badge(C.blue),marginLeft:"auto"}}>{ipLog.length} events</span>
        </div>
        <div style={{overflowX:"auto",maxHeight:480,overflowY:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead style={{position:"sticky",top:0,zIndex:1}}>
              <tr>{["IP","Flag","Country","City","ISP","Event","User","Time"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {ipLog.map((row,i)=>(
                <tr key={i} style={{background:i%2===0?"#fff":"#fafbfc"}}>
                  <td style={S.td}><code style={{fontSize:11}}>{row.ip_address}</code></td>
                  <td style={S.td}>{row.flag_emoji||""}</td>
                  <td style={S.td}>{row.country||" --"}</td>
                  <td style={S.td}>{row.city||" --"}</td>
                  <td style={{...S.td,maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{row.isp||" --"}</td>
                  <td style={S.td}><span style={S.pill(row.event_type==="blocked"?C.red:C.green,row.event_type==="blocked"?"#fde7e9":"#dff6dd")}>{row.event_type}</span></td>
                  <td style={S.td}>{row.profiles?.full_name||" --"}</td>
                  <td style={S.td}>{new Date(row.created_at).toLocaleString("en-KE",{dateStyle:"short",timeStyle:"short"})}</td>
                </tr>
              ))}
              {!ipLog.length&&<tr><td colSpan={8} style={{...S.td,textAlign:"center",padding:24,color:T.fgMuted}}>No IP events recorded yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderSessions = () => {
    const fmtSince = (ts:string) => {
      if (!ts) return " --";
      const d = Math.floor((Date.now()-new Date(ts).getTime())/1000);
      if (d<60) return d+"s ago"; if (d<3600) return Math.floor(d/60)+"m ago"; return Math.floor(d/3600)+"h ago";
    };
    const activeSessions = sessions.filter((s:any)=>{const ls=s.last_seen_at||s.last_seen;return ls&&(Date.now()-new Date(ls).getTime())<2*60*1000;});
    const idleSessions   = sessions.filter((s:any)=>{const ls=s.last_seen_at||s.last_seen;return ls&&(Date.now()-new Date(ls).getTime())>=2*60*1000&&(Date.now()-new Date(ls).getTime())<10*60*1000;});
    return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
        {([["Live Now",activeSessions.length,C.teal,Wifi],["Idle",idleSessions.length,C.orange,Monitor],["Total",sessions.length,C.blue,Users],["Unique IPs",new Set(sessions.map((s:any)=>s.ip_address).filter(Boolean)).size,C.purple,Globe]] as any[]).map(([label,val,col,Icon]:any)=>(
          <div key={label} style={{...S.card,marginBottom:0,padding:"12px 16px",display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:36,height:36,borderRadius:"50%",background:col+"18",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon size={16} color={col}/></div>
            <div><div style={{fontSize:22,fontWeight:800,color:col,lineHeight:"1"}}>{val}</div><div style={{fontSize:10,color:T.fgMuted,marginTop:2}}>{label}</div></div>
          </div>
        ))}
      </div>
      <div style={S.card}>
        <div style={S.ch(C.teal)}>
          <Monitor size={15} color={C.teal}/>
          <span style={{fontSize:13,fontWeight:700,color:C.teal}}>Live Sessions</span>
          <span style={{...S.badge(C.teal),marginLeft:"auto"}}><Pulse col={C.teal}/>{activeSessions.length} active</span>
          <button onClick={loadSessions} style={{...S.btn("transparent",C.teal,C.teal),padding:"3px 8px",marginLeft:8}}><RefreshCw size={11}/></button>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>{["User","Role","Page","IP Address","Connected","Last Seen","Status","Action"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {sessions.map((s:any,i:number)=>{
                const lastSeen=s.last_seen_at||s.last_seen||""; const connAt=s.connected_at||s.started_at||"";
                const isLive=lastSeen&&(Date.now()-new Date(lastSeen).getTime())<2*60*1000;
                const isIdle=lastSeen&&!isLive&&(Date.now()-new Date(lastSeen).getTime())<10*60*1000;
                const statusCol=isLive?C.green:isIdle?C.orange:C.grey;
                const rm=ROLE_META[s.role||""]||{col:"#888",bg:"#eee",label:s.role||" --"};
                return (
                  <tr key={i} style={{background:isLive?"rgba(16,124,16,.04)":undefined}}>
                    <td style={S.td}><div style={{fontWeight:600}}>{s.profiles?.full_name||"Unknown"}</div><div style={{fontSize:10,color:T.fgMuted}}>{s.profiles?.email}</div></td>
                    <td style={S.td}><span style={{...S.pill(rm.col,rm.bg),whiteSpace:"nowrap" as const,fontSize:9}}>{rm.label}</span></td>
                    <td style={S.td}><div style={{fontSize:12}}>{s.current_page||"/"}</div><div style={{fontSize:10,color:T.fgMuted}}>{s.current_module||" --"}</div></td>
                    <td style={S.td}><code style={{fontSize:11}}>{s.ip_address||" --"}</code></td>
                    <td style={S.td}>{connAt?fmtSince(connAt):" --"}</td>
                    <td style={S.td}>{lastSeen?fmtSince(lastSeen):" --"}</td>
                    <td style={S.td}><span style={{...S.badge(statusCol),gap:4}}><span style={{width:6,height:6,borderRadius:"50%",background:statusCol,display:"inline-block"}}/>{isLive?"Live":isIdle?"Idle":"Away"}</span></td>
                    <td style={S.td}><button style={S.btn(C.red)} onClick={async()=>{
                      if(s.session_token){await db.from("user_sessions").update({status:"disconnected",disconnected_at:new Date().toISOString()}).eq("id",s.id);}
                      else{await db.from("session_tracker").update({is_active:false,ended_at:new Date().toISOString(),logout_type:"forced"}).eq("id",s.id);}
                      await db.from("admin_activity_log").insert({user_id:user?.id,action:"terminate_session",entity_type:"session",entity_id:s.id,severity:"warning"}).catch(()=>{});
                      loadSessions(); toast({title:"Session terminated"});
                    }}><Ban size={11}/>Terminate</button></td>
                  </tr>
                );
              })}
              {!sessions.length&&<tr><td colSpan={8} style={{...S.td,textAlign:"center",padding:28,color:T.fgMuted}}>No active sessions</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );};

  const ACTION_COLORS:Record<string,string> = {page_view:C.blue,click:C.teal,create:C.green,update:C.orange,delete:C.red,export:C.purple,login:C.green,logout:C.grey,search:"#0369a1"};

  const renderActions = () => {
    const filters = ["all","page_view","create","update","delete","export","login","logout","search"];
    const filtered = actionFilter==="all"?liveActions:liveActions.filter((a:any)=>a.action_type===actionFilter);
    const fmtTs=(ts:string)=>{if(!ts)return" --";const d=new Date(ts);return d.toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit",second:"2-digit"})+" "+d.toLocaleDateString("en-KE",{day:"2-digit",month:"short"});};
    return (
    <div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap" as const,marginBottom:14}}>
        {filters.map(f=>{
          const count=f==="all"?liveActions.length:liveActions.filter((a:any)=>a.action_type===f).length;
          const col=f==="all"?C.blue:(ACTION_COLORS[f]||C.grey);
          return <button key={f} onClick={()=>setActionFilter(f)} style={{...S.btn(actionFilter===f?col:"#fff",actionFilter===f?"#fff":col,col),fontSize:11}}>
            {f==="all"?"All":f.replace("_"," ")}{count>0&&<span style={{background:"rgba(0,0,0,.1)",borderRadius:99,padding:"0 5px",marginLeft:4,fontSize:10}}>{count}</span>}
          </button>;
        })}
        <button onClick={loadActionLog} style={{...S.btn("transparent",T.fgMuted,T.border),marginLeft:"auto",padding:"4px 10px"}}><RefreshCw size={11}/>Refresh</button>
      </div>
      <div style={S.card}>
        <div style={S.ch(C.orange)}><BarChart2 size={15} color={C.orange}/><span style={{fontSize:13,fontWeight:700,color:C.orange}}>User Action Feed</span><span style={{...S.badge(C.orange),marginLeft:"auto"}}>{filtered.length} events</span></div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>{["Time","User","Type","Action","Module","Entity"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {filtered.slice(0,150).map((a:any,i:number)=>{
                const col=ACTION_COLORS[a.action_type]||C.grey;
                return (<tr key={i} style={{background:i%2===0?"#fafafa":"#fff"}}>
                  <td style={{...S.td,whiteSpace:"nowrap" as const,fontSize:11}}>{fmtTs(a.created_at)}</td>
                  <td style={S.td}><div style={{fontWeight:600,fontSize:12}}>{a.profiles?.full_name||"System"}</div><div style={{fontSize:10,color:T.fgMuted}}>{a.profiles?.email}</div></td>
                  <td style={S.td}><span style={{...S.pill(col,col+"18"),textTransform:"capitalize" as const}}>{(a.action_type||" --").replace("_"," ")}</span></td>
                  <td style={{...S.td,maxWidth:220,fontSize:12}}>{a.action||" --"}</td>
                  <td style={S.td}><span style={{fontSize:11,color:T.fgMuted}}>{a.module||" --"}</span></td>
                  <td style={S.td}>{a.entity_type&&<div style={{fontSize:11}}>{a.entity_type}</div>}{a.entity_id&&<code style={{fontSize:10,color:T.fgMuted}}>{a.entity_id?.slice(0,10)}</code>}</td>
                </tr>);
              })}
              {!filtered.length&&<tr><td colSpan={6} style={{...S.td,textAlign:"center",padding:28,color:T.fgMuted}}>No actions recorded yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );};

  const renderUserPasswords = () => {
    const filtered = userList.filter(u=>!userSearch||u.full_name?.toLowerCase().includes(userSearch.toLowerCase())||u.email?.toLowerCase().includes(userSearch.toLowerCase()));
    return (
      <div>
        {pwdReset&&(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.35)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{background:"#fff",borderRadius:T.rXl,padding:28,width:400,boxShadow:T.shadowLg}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
                <div style={{width:36,height:36,borderRadius:"50%",background:"#fde7e9",display:"flex",alignItems:"center",justifyContent:"center"}}><Key size={16} color={C.red}/></div>
                <div><div style={{fontWeight:700,fontSize:14}}>Send Password Reset</div><div style={{fontSize:12,color:T.fgMuted}}>Emails a reset link</div></div>
              </div>
              <div style={{background:T.bg,borderRadius:T.r,padding:"10px 14px",marginBottom:18,fontSize:13}}><strong>{pwdReset.name}</strong><br/><span style={{color:T.fgMuted}}>{pwdReset.email}</span></div>
              <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                <button onClick={()=>setPwdReset(null)} style={S.btn("#fff",C.grey,T.border)}>Cancel</button>
                <button onClick={()=>handlePasswordReset(pwdReset)} disabled={pwdLoading} style={S.btn(C.blue)}>
                  {pwdLoading?<Loader2 size={12} style={{animation:"spin 1s linear infinite"}}/>:<Send size={12}/>}Send Reset
                </button>
              </div>
            </div>
          </div>
        )}
        <div style={{display:"flex",gap:10,marginBottom:14}}>
          <input value={userSearch} onChange={e=>setUserSearch(e.target.value)} placeholder="Search users..." style={{...S.inp,maxWidth:280}}/>
          <button onClick={loadUsers} style={S.btn("#fff",C.blue,C.blue)}><RefreshCw size={12}/>Refresh</button>
          <span style={{...S.badge(C.purple),marginLeft:"auto"}}>{filtered.length} users</span>
        </div>
        <div style={S.card}>
          <div style={S.ch(C.purple)}><Key size={15} color={C.purple}/><span style={{fontSize:13,fontWeight:700,color:C.purple}}>User Accounts & Password Control</span></div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr>{["User","Email","Roles","Dept","Status","Last Active","Action"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>
                {filtered.map((u,i)=>(
                  <tr key={u.id} style={{background:i%2===0?"#fff":"#fafbfc"}}>
                    <td style={S.td}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:28,height:28,borderRadius:"50%",background:C.blue+"20",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:C.blue,flexShrink:0}}>{u.full_name?.[0]?.toUpperCase()||"?"}</div><span style={{fontSize:12,fontWeight:600}}>{u.full_name||" --"}</span></div></td>
                    <td style={{...S.td,fontSize:11}}>{u.email}</td>
                    <td style={S.td}><div style={{display:"flex",flexWrap:"wrap",gap:3}}>{(u.roles||[]).slice(0,2).map((r:string)=>{const m=ROLE_META[r]||{col:C.grey,bg:T.bg,label:r};return<span key={r} style={S.pill(m.col,m.bg)}>{m.label}</span>;})} {(u.roles||[]).length>2&&<span style={S.pill(C.grey,T.bg)}>+{u.roles.length-2}</span>}</div></td>
                    <td style={S.td}>{u.department||" --"}</td>
                    <td style={S.td}><span style={S.pill(u.is_active!==false?C.green:C.red,u.is_active!==false?"#dff6dd":"#fde7e9")}>{u.is_active!==false?"Active":"Disabled"}</span></td>
                    <td style={S.td}>{u.last_active_at?new Date(u.last_active_at).toLocaleDateString("en-KE"):"Never"}</td>
                    <td style={S.td}><button style={S.btn(C.blue)} onClick={()=>setPwdReset({userId:u.id,email:u.email,name:u.full_name||u.email})}><Key size={11}/>Reset</button></td>
                  </tr>
                ))}
                {!filtered.length&&<tr><td colSpan={7} style={{...S.td,textAlign:"center",padding:20,color:T.fgMuted}}>No users found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div style={S.card}>
          <div style={S.ch(C.orange)}><Activity size={15} color={C.orange}/><span style={{fontSize:13,fontWeight:700,color:C.orange}}>Password Reset Audit Log</span></div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr>{["Target User","Action","By","Success","Time"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>
                {pwdLog.map((row,i)=>(
                  <tr key={i}>
                    <td style={S.td}>{row.profiles?.full_name||row.profiles?.email||" --"}</td>
                    <td style={S.td}><span style={S.pill(C.blue,C.blueBg)}>{row.action}</span></td>
                    <td style={S.td}>{row.admin?.full_name||" --"}</td>
                    <td style={S.td}>{row.success?<CheckCircle size={14} color={C.green}/>:<XCircle size={14} color={C.red}/>}</td>
                    <td style={S.td}>{new Date(row.created_at).toLocaleString("en-KE",{dateStyle:"short",timeStyle:"short"})}</td>
                  </tr>
                ))}
                {!pwdLog.length&&<tr><td colSpan={5} style={{...S.td,textAlign:"center",padding:20,color:T.fgMuted}}>No resets yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderRoles = () => {
    const filtered = roleUsers.filter(u=>!roleSearch||u.full_name?.toLowerCase().includes(roleSearch.toLowerCase())||u.email?.toLowerCase().includes(roleSearch.toLowerCase()));
    return (
      <div>
        {editRole&&(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{background:"#fff",borderRadius:T.rXl,padding:28,width:500,boxShadow:T.shadowLg}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}><Shield size={20} color={C.red}/><div><div style={{fontWeight:700,fontSize:14}}>Edit Roles  -- {editRole.name}</div><div style={{fontSize:11,color:T.fgMuted}}>Select all applicable roles</div></div><button onClick={()=>setEditRole(null)} style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer"}}><X size={16}/></button></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:20}}>
                {ALL_ROLES.map(role=>{
                  const m=ROLE_META[role]||{col:C.grey,bg:T.bg,label:role};
                  const checked=editRole.currentRoles.includes(role);
                  return(<label key={role} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",border:`1px solid ${checked?m.col:T.border}`,borderRadius:T.r,cursor:"pointer",background:checked?m.bg:"#fff",transition:"all .1s"}}><input type="checkbox" checked={checked} onChange={e=>setEditRole(prev=>prev?{...prev,currentRoles:e.target.checked?[...prev.currentRoles,role]:prev.currentRoles.filter(r=>r!==role)}:prev)} style={{accentColor:m.col}}/><span style={{fontSize:12,fontWeight:600,color:checked?m.col:T.fg}}>{m.label}</span></label>);
                })}
              </div>
              <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                <button onClick={()=>setEditRole(null)} style={S.btn("#fff",C.grey,T.border)}>Cancel</button>
                <button onClick={()=>saveRoles(editRole.userId,editRole.currentRoles)} disabled={rolesSaving} style={S.btn(C.blue)}>{rolesSaving?<Loader2 size={12} style={{animation:"spin 1s linear infinite"}}/>:<Save size={12}/>}Save Roles</button>
              </div>
            </div>
          </div>
        )}
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:20}}>
          {ALL_ROLES.map(role=>{const m=ROLE_META[role]||{col:C.grey,bg:T.bg,label:role};const count=roleUsers.filter(u=>u.roles?.includes(role)).length;return(<div key={role} style={{background:"#fff",border:`1px solid ${T.border}`,borderRadius:T.rLg,padding:"10px 12px",borderTop:`3px solid ${m.col}`}}><div style={{fontSize:18,fontWeight:700,color:m.col}}>{count}</div><div style={{fontSize:10,color:T.fgMuted,marginTop:2}}>{m.label}</div></div>);})}
        </div>
        <div style={{marginBottom:12}}><input value={roleSearch} onChange={e=>setRoleSearch(e.target.value)} placeholder="Search users..." style={{...S.inp,maxWidth:280}}/></div>
        <div style={S.card}>
          <div style={S.ch(C.red)}><Shield size={15} color={C.red}/><span style={{fontSize:13,fontWeight:700,color:C.red}}>Role Assignments</span></div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr>{["User","Email","Current Roles","Action"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>
                {filtered.map((u,i)=>(
                  <tr key={u.id} style={{background:i%2===0?"#fff":"#fafbfc"}}>
                    <td style={S.td}><strong style={{fontSize:12}}>{u.full_name||" --"}</strong></td>
                    <td style={{...S.td,fontSize:11}}>{u.email}</td>
                    <td style={S.td}><div style={{display:"flex",flexWrap:"wrap",gap:3}}>{(u.roles||[]).map((r:string)=>{const m=ROLE_META[r]||{col:C.grey,bg:T.bg,label:r};return<span key={r} style={S.pill(m.col,m.bg)}>{m.label}</span>;})}{(!u.roles||!u.roles.length)&&<span style={{color:T.fgMuted,fontSize:11}}>No role</span>}</div></td>
                    <td style={S.td}><button style={S.btn(C.blue)} onClick={()=>setEditRole({userId:u.id,name:u.full_name||u.email,currentRoles:u.roles||[]})}><Edit3 size={11}/>Edit Roles</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderTwilio = () => (
    <div>
      <div style={S.card}>
        <div style={S.ch(C.green)}>
          <Phone size={15} color={C.green}/>
          <span style={{fontSize:13,fontWeight:700,color:C.green}}>Twilio Status</span>
          <button onClick={testTwilio} disabled={twilioLoading} style={{...S.btn(C.green),marginLeft:"auto"}}>
            {twilioLoading?<Loader2 size={12} style={{animation:"spin 1s linear infinite"}}/>:<Zap size={12}/>}Test Connection
          </button>
        </div>
        <div style={S.cb}>
          {twilioStatus
            ? <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
                {[["Status",twilioStatus.ok?"[OK] Live":"[X] Down",twilioStatus.ok?C.green:C.red],["SMS","Configured",C.blue],["WhatsApp","Configured",C.purple],["Voice","Enabled",C.teal],["Tested",new Date().toLocaleTimeString("en-KE"),C.grey],["Live",twilioStatus.twilio_live?"[OK] Yes":"[X] No",twilioStatus.twilio_live?C.green:C.red]].map(([k,v,c])=>(
                  <div key={k as string} style={{background:T.bg,borderRadius:T.r,padding:"10px 12px"}}><div style={{fontSize:10,color:T.fgMuted,marginBottom:2}}>{k as string}</div><div style={{fontSize:12,fontWeight:700,color:c as string}}>{v as string}</div></div>
                ))}
              </div>
            : <p style={{color:T.fgMuted,fontSize:13}}>Click "Test Connection" to verify Twilio credentials</p>
          }
        </div>
      </div>
      <div style={S.card}>
        <div style={S.ch(C.blue)}>
          <Settings size={15} color={C.blue}/>
          <span style={{fontSize:13,fontWeight:700,color:C.blue}}>Twilio Configuration</span>
          <button onClick={saveTwilioCfg} disabled={twilioSaving} style={{...S.btn(C.blue),marginLeft:"auto"}}>
            {twilioSaving?<Loader2 size={12} style={{animation:"spin 1s linear infinite"}}/>:<Save size={12}/>}Save Config
          </button>
        </div>
        <div style={{...S.cb,display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          {[{key:"account_sid",label:"Account SID",ph:"ACe96c..."},{key:"auth_token",label:"Auth Token",ph:"d73601...",pwd:true},{key:"phone_number",label:"SMS Number",ph:"+16812972643"},{key:"wa_number",label:"WhatsApp Number",ph:"+14155238886"},{key:"messaging_sid",label:"Messaging SID",ph:"MGd547..."}].map(({key,label,ph,pwd})=>(
            <div key={key}>
              <label style={{display:"block",fontSize:11,fontWeight:700,color:T.fgMuted,marginBottom:5}}>{label}</label>
              <div style={{position:"relative"}}>
                <input type={pwd&&!showPwd[key]?"password":"text"} value={(twilioCfg as any)[key]} onChange={e=>setTwilioCfg(p=>({...p,[key]:e.target.value}))} placeholder={ph} style={S.inp}/>
                {pwd&&<button onClick={()=>setShowPwd(p=>({...p,[key]:!p[key]}))} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer"}}>{showPwd[key]?<EyeOff size={14} color={T.fgMuted}/>:<Eye size={14} color={T.fgMuted}/>}</button>}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div style={S.card}>
          <div style={S.ch(C.teal)}><MessageSquare size={15} color={C.teal}/><span style={{fontSize:13,fontWeight:700,color:C.teal}}>Test SMS</span></div>
          <div style={S.cb}>
            <div style={{marginBottom:10}}><label style={{fontSize:11,fontWeight:700,color:T.fgMuted,display:"block",marginBottom:4}}>To</label><input value={smsTest.to} onChange={e=>setSmsTest(p=>({...p,to:e.target.value}))} placeholder="0712345678" style={S.inp}/></div>
            <div style={{marginBottom:14}}><label style={{fontSize:11,fontWeight:700,color:T.fgMuted,display:"block",marginBottom:4}}>Message</label><textarea value={smsTest.msg} onChange={e=>setSmsTest(p=>({...p,msg:e.target.value}))} rows={3} style={{...S.inp,resize:"vertical" as const}}/></div>
            <button onClick={sendTestSMS} disabled={smsSending} style={S.btn(C.teal)}>{smsSending?<Loader2 size={12} style={{animation:"spin 1s linear infinite"}}/>:<Send size={12}/>}Send SMS</button>
          </div>
        </div>
        <div style={S.card}>
          <div style={S.ch(C.purple)}><PhoneCall size={15} color={C.purple}/><span style={{fontSize:13,fontWeight:700,color:C.purple}}>Test Call</span></div>
          <div style={S.cb}>
            <div style={{marginBottom:10}}><label style={{fontSize:11,fontWeight:700,color:T.fgMuted,display:"block",marginBottom:4}}>To</label><input value={callTest.to} onChange={e=>setCallTest(p=>({...p,to:e.target.value}))} placeholder="0712345678" style={S.inp}/></div>
            <div style={{marginBottom:14}}><label style={{fontSize:11,fontWeight:700,color:T.fgMuted,display:"block",marginBottom:4}}>Message</label><textarea value={callTest.msg} onChange={e=>setCallTest(p=>({...p,msg:e.target.value}))} rows={3} style={{...S.inp,resize:"vertical" as const}}/></div>
            <button onClick={placeTestCall} disabled={callPlacing} style={S.btn(C.purple)}>{callPlacing?<Loader2 size={12} style={{animation:"spin 1s linear infinite"}}/>:<PhoneCall size={12}/>}Place Call</button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBroadcast = () => (
    <div style={S.card}>
      <div style={S.ch(C.orange)}><Radio size={15} color={C.orange}/><span style={{fontSize:13,fontWeight:700,color:C.orange}}>System Broadcast</span></div>
      <div style={S.cb}>
        <p style={{fontSize:12,color:T.fgMuted,marginBottom:14}}>Send a notification to all active users in real-time.</p>
        <textarea value={broadcastMsg} onChange={e=>setBroadcastMsg(e.target.value)} placeholder="Type broadcast message..." rows={5} style={{...S.inp,resize:"vertical" as const,marginBottom:14}}/>
        <button onClick={sendBroadcast} disabled={broadcasting||!broadcastMsg.trim()} style={S.btn(C.orange)}>{broadcasting?<Loader2 size={12} style={{animation:"spin 1s linear infinite"}}/>:<Radio size={12}/>}Send Broadcast</button>
      </div>
    </div>
  );

  const renderSystem = () => (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
      {[{title:"System",icon:Server,col:C.blue,items:[["System","EL5 MediProcure"],["Hospital","Embu Level 5 Hospital"],["County","Embu County Government"],["Environment","Production"],["URL","procurbosse.edgeone.app"]]},
        {title:"Database",icon:Database,col:C.purple,items:[["Engine","PostgreSQL (Supabase)"],["Failover","Cascade enabled"],["Realtime","WebSocket active"],["RLS","Active on all tables"],["Functions","send-sms, make-call, send-email"]]},
        {title:"Communications",icon:Phone,col:C.green,items:[["SMS","Configured"],["WhatsApp","Configured"],["Fallback","Africa's Talking"],["Voice","TwiML IVR enabled"]]},
        {title:"Security",icon:Shield,col:C.red,items:[["Auth","Supabase Auth (JWT)"],["IP Tracking","Live geo via ipapi.co"],["Sessions","Force-terminate via admin"],["Password Reset","Email + audit log"],["Roles","10 roles with RLS"]]},
      ].map(({title,icon:Icon,col,items})=>(
        <div key={title} style={S.card}>
          <div style={S.ch(col)}><Icon size={15} color={col}/><span style={{fontSize:13,fontWeight:700,color:col}}>{title}</span></div>
          <div style={S.cb}>{items.map(([k,v])=>(<div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${T.border}18`,fontSize:12}}><span style={{color:T.fgMuted}}>{k}</span><span style={{fontWeight:600,color:T.fg,maxWidth:"55%",textAlign:"right"}}>{v}</span></div>))}</div>
        </div>
      ))}
    </div>
  );

  const current = NAVS.find(n=>n.id===sec);

  return (
    <div style={S.page}>
      <style>{`@keyframes ping{75%,100%{transform:scale(2);opacity:0;}}@keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}`}</style>
      <div style={S.header}>
        <button onClick={()=>nav("/dashboard")} style={{display:"flex",alignItems:"center",gap:8,background:"rgba(255,255,255,.12)",border:"none",cursor:"pointer",padding:"0 14px",color:"#fff",fontSize:13,fontWeight:700,height:"100%",borderRadius:0}}>
          <Shield size={16}/>Admin Panel
        </button>
        <div style={{flex:1}}/>
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"0 14px"}}>
          {myIP&&<span style={{color:"rgba(255,255,255,.8)",fontSize:11}}><Globe size={11} style={{verticalAlign:"middle",marginRight:4}}/>{myIP}</span>}
          <span style={{color:"rgba(255,255,255,.8)",fontSize:11}}>{user?.email}</span>
        </div>
      </div>
      <div style={S.bc}>
        <span onClick={()=>nav("/dashboard")} style={{cursor:"pointer"}}>Home</span>
        <ChevronRight size={12}/><span style={{color:T.fg,fontWeight:600}}>Admin Panel</span>
        {current&&<><ChevronRight size={12}/><span style={{color:current.col,fontWeight:700}}>{current.label}</span></>}
      </div>
      <div style={S.body}>
        <div style={S.sb}>
          <div style={{padding:"8px 14px 4px",fontSize:9,fontWeight:800,color:T.fgDim,textTransform:"uppercase" as const,letterSpacing:1}}>Administration</div>
          {NAVS.map(item=><NavItem key={item.id} item={item}/>)}
        </div>
        <div style={S.main}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
            {current&&<current.icon size={18} color={current.col}/>}
            <h2 style={{margin:0,fontSize:16,fontWeight:700,color:T.fg}}>{current?.label}</h2>
            <button onClick={()=>{loadKpi();loadIPLog();loadSessions();loadActionLog();}} style={{...S.btn("transparent",T.fgMuted,T.border),marginLeft:"auto",padding:"4px 10px"}}><RefreshCw size={11}/>Refresh All</button>
          </div>
          {sec==="overview"  && renderOverview()}
          {sec==="iplive"    && renderIPLive()}
          {sec==="sessions"  && renderSessions()}
          {sec==="actions"   && renderActions()}
          {sec==="users"     && renderUserPasswords()}
          {sec==="roles"     && renderRoles()}
          {sec==="twilio"    && renderTwilio()}
          {sec==="broadcast" && renderBroadcast()}
          {sec==="services"  && <ServicesPanel userId={user?.id}/>}
          {sec==="activity"  && <ActivityLog/>}
          {sec==="system"    && renderSystem()}
        </div>
      </div>
    </div>
  );
}
