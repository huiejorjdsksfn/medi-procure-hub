/**
 * ProcurBosse - IP Access Control & Live Network Monitor v3.0
 * Real-time public + private IP detection - Activity feed - Whitelist CRUD
 * EL5 MediProcure - Embu Level 5 Hospital
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { toast } from "@/hooks/use-toast";
import { T } from "@/lib/theme";
import {
  Shield, Plus, Trash2, RefreshCw, Globe, Wifi, Lock,
  AlertTriangle, Save, Activity, Monitor, Server, MapPin,
  Clock, Users, Network, Radio, TrendingUp, Ban, X,
  Check, Database, Signal, ChevronRight
} from "lucide-react";

const db = supabase as any;

/* - Styles - */
const card: React.CSSProperties = { background:T.card, border:`1px solid ${T.border}`, borderRadius:T.rLg, padding:"16px 20px" };
const inp: React.CSSProperties  = { width:"100%", background:T.bg, border:`1px solid ${T.border}`, borderRadius:T.r, padding:"8px 12px", color:T.fg, fontSize:13, outline:"none", boxSizing:"border-box" };
const btn = (bg:string, bd?:string):React.CSSProperties => ({ display:"inline-flex", alignItems:"center", gap:7, padding:"8px 14px", background:bg, color:bd?T.fgMuted:"#fff", border:`1px solid ${bd||"transparent"}`, borderRadius:T.r, fontSize:12, fontWeight:700, cursor:"pointer" });
const badge = (col:string):React.CSSProperties => ({ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px", borderRadius:99, fontSize:9, fontWeight:700, background:col+"20", color:col, border:`1px solid ${col}44` });

/* - IP helpers - */
const IP_SERVICES = ["https://api.ipify.org?format=json","https://api64.ipify.org?format=json"];

async function getPublicIP(): Promise<{ip:string;source:string}|null> {
  for (const url of IP_SERVICES) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      const data = await res.json();
      const ip = data.ip || "";
      if (/^\d{1,3}(\.\d{1,3}){3}$|^[0-9a-f:]+$/i.test(ip)) return { ip, source: new URL(url).hostname };
    } catch {}
  }
  return null;
}

async function getIPGeo(ip: string): Promise<any> {
  try { return await (await fetch(`https://ipapi.co/${ip}/json/`, { signal: AbortSignal.timeout(5000) })).json(); }
  catch { return null; }
}

function classifyIP(ip: string): "public"|"private"|"loopback" {
  if (/^127\.|^::1$/.test(ip)) return "loopback";
  if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(ip)) return "private";
  return "public";
}

/* - Pulse dot - */
const Pulse = ({ color=T.success }:{color?:string}) => (
  <span style={{ position:"relative", display:"inline-flex", width:8, height:8 }}>
    <span style={{ position:"absolute", inset:0, borderRadius:"50%", background:color, opacity:.4, animation:"ping 1.5s infinite" }}/>
    <span style={{ width:8, height:8, borderRadius:"50%", background:color, display:"block" }}/>
  </span>
);

type Tab = "monitor"|"whitelist"|"logs"|"sessions"|"settings";

export default function IpAccessPage() {
  const { user } = useAuth();
  const { get } = useSystemSettings();

  const [tab, setTab]             = useState<Tab>("monitor");
  const [whitelist, setWhitelist] = useState<any[]>([]);
  const [logs, setLogs]           = useState<any[]>([]);
  const [profiles, setProfiles]   = useState<Record<string,any>>({});
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [form, setForm]           = useState({ label:"", cidr:"", type:"private", notes:"", active:true });
  const [myPublicIP, setMyPublicIP]     = useState("");
  const [myPrivateIPs, setMyPrivateIPs] = useState<string[]>([]);
  const [ipGeo, setIpGeo]               = useState<any>(null);
  const [ipFetching, setIpFetching]     = useState(false);
  const [activeIPs, setActiveIPs]       = useState<Map<string,any>>(new Map());
  const [rtEvents, setRtEvents]         = useState<any[]>([]);
  const [stats, setStats]               = useState({ total:0, blocked:0, allowed:0, unique:0 });
  const [blockedSet, setBlockedSet]     = useState<Set<string>>(new Set());
  const logRef = useRef<HTMLDivElement>(null);
  const f = (k:string, v:any) => setForm(p=>({...p,[k]:v}));

  const load = useCallback(async () => {
    setLoading(true);
    const [wl, lg, pr] = await Promise.all([
      db.from("network_whitelist").select("*").order("active",{ascending:false}).order("created_at"),
      db.from("ip_access_log").select("*").order("created_at",{ascending:false}).limit(500),
      db.from("profiles").select("id,full_name,email,is_active").limit(300),
    ]);
    setWhitelist(wl.data||[]);
    setLogs(lg.data||[]);
    const pm: Record<string,any> = {};
    (pr.data||[]).forEach((p:any) => { pm[p.id]=p; });
    setProfiles(pm);

    const logData = lg.data||[];
    const unique = new Set(logData.map((l:any)=>l.ip_address)).size;
    const blocked = logData.filter((l:any)=>l.status==="blocked").length;
    setStats({ total:logData.length, blocked, allowed:logData.length-blocked, unique });

    const cutoff = new Date(Date.now()-30*60_000).toISOString();
    const recent = logData.filter((l:any)=>l.created_at>cutoff);
    const ipMap = new Map<string,any>();
    recent.forEach((l:any)=>{ if(!ipMap.has(l.ip_address)||l.created_at>ipMap.get(l.ip_address).created_at) ipMap.set(l.ip_address,l); });
    setActiveIPs(ipMap);

    const bs = new Set<string>((wl.data||[]).filter((w:any)=>w.type==="blocked"&&w.active).map((w:any)=>w.cidr));
    setBlockedSet(bs);
    setLoading(false);
  },[]);

  const detectMyIP = useCallback(async () => {
    setIpFetching(true);
    const pub = await getPublicIP();
    if (pub) {
      setMyPublicIP(pub.ip);
      const geo = await getIPGeo(pub.ip);
      setIpGeo(geo);
      await db.from("ip_access_log").insert({ ip_address:pub.ip, user_id:user?.id||null, status:"allowed", action:"ip_monitor_view", user_agent:navigator.userAgent.slice(0,200), created_at:new Date().toISOString() }).catch(()=>{});
    }
    // Try to detect private IPs via WebRTC
    try {
      const ips: string[] = ["127.0.0.1"];
      const pc = new (window as any).RTCPeerConnection({iceServers:[]});
      pc.createDataChannel("");
      await pc.createOffer().then((o:any)=>pc.setLocalDescription(o));
      await new Promise<void>(res => {
        pc.onicecandidate=(e:any)=>{ if(e?.candidate?.candidate){ const m=e.candidate.candidate.match(/(\d{1,3}(\.\d{1,3}){3})/); if(m&&!ips.includes(m[1]))ips.push(m[1]); } else res(); };
        setTimeout(res,2000);
      });
      pc.close();
      setMyPrivateIPs(ips);
    } catch { setMyPrivateIPs(["127.0.0.1"]); }
    setIpFetching(false);
  },[user]);

  useEffect(()=>{ load(); detectMyIP(); },[load,detectMyIP]);

  // Realtime
  useEffect(()=>{
    const ch = db.channel("ip:rt")
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"ip_access_log"},(p:any)=>{
        setRtEvents(prev=>[{...p.new,_new:true},...prev.slice(0,49)]);
        setLogs(prev=>[p.new,...prev.slice(0,499)]);
        setStats(prev=>({...prev,total:prev.total+1,blocked:p.new.status==="blocked"?prev.blocked+1:prev.blocked}));
        logRef.current?.scrollTo(0,0);
      })
      .subscribe();
    const iv = setInterval(load,30_000);
    return ()=>{ db.removeChannel(ch); clearInterval(iv); };
  },[load]);

  const saveRule = async() => {
    if(!form.cidr.trim()){ toast({title:"IP/CIDR required",variant:"destructive"}); return; }
    setSaving(true);
    await db.from("network_whitelist").insert({...form,created_at:new Date().toISOString(),created_by:user?.id});
    toast({title:"Rule added"}); setShowForm(false); setForm({label:"",cidr:"",type:"private",notes:"",active:true});
    setSaving(false); load();
  };

  const deleteRule  = async(id:string)=>{ await db.from("network_whitelist").delete().eq("id",id); toast({title:"Removed"}); load(); };
  const toggleRule  = async(id:string,active:boolean)=>{ await db.from("network_whitelist").update({active:!active}).eq("id",id); load(); };
  const blockIP     = async(ip:string)=>{ await db.from("network_whitelist").insert({cidr:ip,label:`Block ${ip}`,type:"blocked",active:true,notes:`Blocked ${new Date().toLocaleString("en-KE")}`,created_at:new Date().toISOString(),created_by:user?.id}); toast({title:`Blocked ${ip}`,variant:"destructive"}); load(); };
  const allowIP     = async(ip:string)=>{ await db.from("network_whitelist").insert({cidr:ip,label:`Allow ${ip}`,type:"public",active:true,notes:`Allowed ${new Date().toLocaleString("en-KE")}`,created_at:new Date().toISOString(),created_by:user?.id}); toast({title:`Allowed ${ip}`}); load(); };

  const fmt    = (s:string)=>new Date(s).toLocaleString("en-KE",{timeZone:"Africa/Nairobi",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false});
  const fmtAgo = (s:string)=>{ const d=Date.now()-new Date(s).getTime(); return d<60000?`${Math.floor(d/1000)}s ago`:d<3600000?`${Math.floor(d/60000)}m ago`:`${Math.floor(d/3600000)}h ago`; };

  const TABS: {id:Tab;label:string;icon:any}[] = [
    {id:"monitor",   label:"Live Monitor",    icon:Activity},
    {id:"whitelist", label:"Rules",           icon:Shield},
    {id:"logs",      label:"Access Logs",     icon:Database},
    {id:"sessions",  label:"Sessions",        icon:Users},
    {id:"settings",  label:"Settings",        icon:Monitor},
  ];

  return (
    <div style={{padding:20,minHeight:"100vh",background:T.bg}}>
      <style>{`@keyframes ping{0%{transform:scale(1);opacity:.6}75%,100%{transform:scale(2.2);opacity:0}} @keyframes spin{to{transform:rotate(360deg)}} @keyframes slideIn{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:translateX(0)}} @keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
        <Shield size={22} color={T.primary}/>
        <div>
          <h1 style={{margin:0,fontSize:20,fontWeight:800,color:T.fg}}>IP Access Control & Network Monitor</h1>
          <div style={{fontSize:11,color:T.fgDim,marginTop:2}}>Live public/private IP detection - Realtime activity - Block/allow rules</div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:8}}>
          <button onClick={detectMyIP} disabled={ipFetching} style={btn(T.bg2,T.border)}>
            {ipFetching?<RefreshCw size={13} style={{animation:"spin 1s linear infinite"}}/>:<Globe size={13}/>}
            {ipFetching?"Detecting...":"Detect IPs"}
          </button>
          <button onClick={load} style={btn(T.bg2,T.border)}><RefreshCw size={13}/> Refresh</button>
          <button onClick={()=>setShowForm(true)} style={btn(T.primary)}><Plus size={13}/> Add Rule</button>
        </div>
      </div>

      {/* - IP Info Row - */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:16}}>
        {/* Public IP */}
        <div style={{...card,borderColor:myPublicIP?T.primary+"55":T.border}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
            <Globe size={16} color={T.primary}/><span style={{fontWeight:800,fontSize:13,color:T.fg}}>My Public IP</span>
            <Pulse color={myPublicIP?T.success:T.fgDim}/>
          </div>
          {myPublicIP?(
            <>
              <div style={{fontSize:24,fontWeight:900,color:T.primary,fontFamily:"monospace",marginBottom:8}}>{myPublicIP}</div>
              {ipGeo&&(
                <div style={{fontSize:11,color:T.fgMuted,lineHeight:1.8}}>
                  <div><MapPin size={10} style={{verticalAlign:"middle",marginRight:4}}/>{[ipGeo.city,ipGeo.region,ipGeo.country_name||ipGeo.country].filter(Boolean).join(", ")||"Unknown location"}</div>
                  {(ipGeo.org||ipGeo.isp)&&<div><Signal size={10} style={{verticalAlign:"middle",marginRight:4}}/>{ipGeo.org||ipGeo.isp}</div>}
                  {(ipGeo.latitude||ipGeo.lat)&&<div>- {(ipGeo.latitude||ipGeo.lat)?.toFixed(4)}-, {(ipGeo.longitude||ipGeo.lon)?.toFixed(4)}-</div>}
                </div>
              )}
              <div style={{display:"flex",gap:6,marginTop:10}}>
                <button onClick={()=>allowIP(myPublicIP)} style={{...btn(T.successBg,T.success),padding:"4px 10px",fontSize:10,color:T.success}}><Check size={10}/> Allow</button>
                <button onClick={()=>blockIP(myPublicIP)} style={{...btn(T.errorBg,T.error),padding:"4px 10px",fontSize:10,color:T.error}}><Ban size={10}/> Block</button>
              </div>
            </>
          ):<div style={{color:T.fgDim,fontSize:12}}>{ipFetching?"Detecting...":"Click 'Detect IPs'"}</div>}
        </div>

        {/* Private IPs */}
        <div style={card}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
            <Network size={16} color="#7c3aed"/><span style={{fontWeight:800,fontSize:13,color:T.fg}}>Private / Local IPs</span>
          </div>
          {myPrivateIPs.length>0?myPrivateIPs.map(ip=>(
            <div key={ip} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:`1px solid ${T.border}22`}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:ip==="127.0.0.1"?T.fgDim:"#7c3aed",flexShrink:0}}/>
              <code style={{fontSize:13,color:"#7c3aed",fontFamily:"monospace",flex:1}}>{ip}</code>
              <span style={badge(ip==="127.0.0.1"?T.fgDim:"#7c3aed")}>{ip==="127.0.0.1"?"loopback":"private"}</span>
              <button onClick={()=>allowIP(ip)} style={{background:"transparent",border:"none",cursor:"pointer",color:T.success,padding:3}} title="Allow"><Check size={11}/></button>
            </div>
          )):<div style={{color:T.fgDim,fontSize:12}}>Detecting...</div>}
        </div>

        {/* Stats */}
        <div style={card}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
            <TrendingUp size={16} color={T.accent}/><span style={{fontWeight:800,fontSize:13,color:T.fg}}>Statistics</span>
          </div>
          {[
            {label:"Total Requests", value:stats.total,    color:T.fg},
            {label:"Allowed",        value:stats.allowed,  color:T.success},
            {label:"Blocked",        value:stats.blocked,  color:T.error},
            {label:"Unique IPs",     value:stats.unique,   color:T.primary},
            {label:"Active (30m)",   value:activeIPs.size, color:T.accent},
            {label:"Rules",          value:whitelist.length,color:"#7c3aed"},
          ].map(({label,value,color})=>(
            <div key={label} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:`1px solid ${T.border}18`,fontSize:12}}>
              <span style={{color:T.fgDim}}>{label}</span>
              <span style={{color,fontWeight:700,fontFamily:"monospace"}}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:2,marginBottom:16,borderBottom:`1px solid ${T.border}`}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            display:"flex",alignItems:"center",gap:7,padding:"9px 16px",
            background:"transparent",border:"none",
            borderBottom:`2px solid ${tab===t.id?T.primary:"transparent"}`,
            color:tab===t.id?T.primary:T.fgMuted,fontSize:13,fontWeight:700,cursor:"pointer",
          }}>
            <t.icon size={13}/>{t.label}
          </button>
        ))}
      </div>

      {/* - MONITOR - */}
      {tab==="monitor"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 360px",gap:14}}>
          <div style={card}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
              <Pulse color={T.success}/><span style={{fontWeight:800,fontSize:14,color:T.fg}}>Active IPs (last 30 min)</span>
              <span style={badge(T.success)}>{activeIPs.size} active</span>
            </div>
            {activeIPs.size===0?(
              <div style={{textAlign:"center",padding:40,color:T.fgDim}}><Activity size={32} color={T.fgDim} style={{display:"block",margin:"0 auto 10px"}}/> No recent activity</div>
            ):(
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead>
                  <tr style={{borderBottom:`1px solid ${T.border}`}}>
                    {["IP Address","Type","User","Last Seen","Status","Actions"].map(h=>(
                      <th key={h} style={{padding:"7px 10px",textAlign:"left",fontSize:10,fontWeight:700,color:T.fgDim}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...activeIPs.entries()].map(([ip,log])=>{
                    const cls=classifyIP(ip);
                    const profile=profiles[log.user_id];
                    const isBlocked=blockedSet.has(ip);
                    const clsColor=cls==="public"?T.primary:"#7c3aed";
                    return(
                      <tr key={ip} style={{borderBottom:`1px solid ${T.border}18`}}
                        onMouseEnter={e=>(e.currentTarget.style.background=T.bg2)}
                        onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                        <td style={{padding:"8px 10px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:7}}>
                            <Pulse color={isBlocked?T.error:T.success}/>
                            <code style={{fontSize:12,color:T.fg,fontFamily:"monospace"}}>{ip}</code>
                          </div>
                        </td>
                        <td style={{padding:"8px 10px"}}><span style={badge(clsColor)}>{cls}</span></td>
                        <td style={{padding:"8px 10px",fontSize:11,color:T.fg}}>{profile?.full_name||(log.user_id?.slice(0,8)||"-")}</td>
                        <td style={{padding:"8px 10px",fontSize:10,color:T.fgDim}}>{fmtAgo(log.created_at)}</td>
                        <td style={{padding:"8px 10px"}}><span style={badge(isBlocked?T.error:T.success)}>{isBlocked?"Blocked":"Active"}</span></td>
                        <td style={{padding:"8px 10px"}}>
                          {!isBlocked
                            ?<button onClick={()=>blockIP(ip)} style={{...btn(T.errorBg,T.error),padding:"3px 8px",fontSize:10,color:T.error}}><Ban size={10}/> Block</button>
                            :<button onClick={()=>allowIP(ip)} style={{...btn(T.successBg,T.success),padding:"3px 8px",fontSize:10,color:T.success}}><Check size={10}/> Allow</button>
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Realtime stream */}
          <div style={card}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
              <Radio size={14} color={T.accent}/><span style={{fontWeight:800,fontSize:13,color:T.fg}}>Live Stream</span>
              <span style={{...badge(T.accent),fontSize:9,animation:"ping 2s infinite"}}>- LIVE</span>
            </div>
            <div ref={logRef} style={{height:500,overflowY:"auto",display:"flex",flexDirection:"column",gap:4}}>
              {(rtEvents.length?rtEvents:logs.slice(0,30)).map((log,i)=>{
                const cls=classifyIP(log.ip_address||"");
                const clsColor=cls==="public"?T.primary:cls==="private"?"#7c3aed":T.fgDim;
                const isBlocked=log.status==="blocked";
                const profile=profiles[log.user_id];
                return(
                  <div key={i} style={{padding:"7px 10px",borderRadius:8,background:log._new&&i===0?`${T.primary}18`:T.bg2,border:`1px solid ${log._new&&i===0?T.primary+"44":T.border}`,animation:log._new&&i===0?"slideIn .3s":undefined}}>
                    <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:2}}>
                      <span style={{width:6,height:6,borderRadius:"50%",background:isBlocked?T.error:T.success,flexShrink:0}}/>
                      <code style={{fontSize:11,color:T.fg,fontFamily:"monospace",flex:1}}>{log.ip_address||"?"}</code>
                      <span style={{fontSize:9,color:clsColor,fontWeight:700}}>{cls}</span>
                      {isBlocked&&<span style={{fontSize:9,color:T.error,fontWeight:700}}>BLOCKED</span>}
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:T.fgDim}}>
                      <span>{profile?.full_name||(log.user_id?log.user_id.slice(0,8)+"-":"anon")}{log.action?` - ${log.action}`:""}</span>
                      <span>{fmtAgo(log.created_at)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* - WHITELIST - */}
      {tab==="whitelist"&&(
        <div style={card}>
          <div style={{fontWeight:800,color:T.fg,fontSize:14,marginBottom:14}}>Access Rules ({whitelist.length})</div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead>
              <tr style={{borderBottom:`1px solid ${T.border}`}}>
                {["Label","IP / CIDR","Type","Active","Notes","Added","Actions"].map(h=>(
                  <th key={h} style={{padding:"7px 12px",textAlign:"left",fontSize:10,fontWeight:700,color:T.fgDim}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {whitelist.map(w=>{
                const tc=w.type==="blocked"?T.error:w.type==="private"?"#7c3aed":T.success;
                return(
                  <tr key={w.id} style={{borderBottom:`1px solid ${T.border}18`}}
                    onMouseEnter={e=>(e.currentTarget.style.background=T.bg2)}
                    onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                    <td style={{padding:"9px 12px",fontWeight:600,color:T.fg}}>{w.label||"-"}</td>
                    <td style={{padding:"9px 12px"}}><code style={{color:T.primary,fontFamily:"monospace"}}>{w.cidr}</code></td>
                    <td style={{padding:"9px 12px"}}><span style={badge(tc)}>{w.type}</span></td>
                    <td style={{padding:"9px 12px"}}>
                      <button onClick={()=>toggleRule(w.id,w.active)} style={{background:"none",border:"none",cursor:"pointer",padding:0}}>
                        <span style={{display:"inline-flex",width:36,height:20,borderRadius:10,background:w.active?T.success:T.error,alignItems:"center",padding:2,transition:"background .2s"}}>
                          <span style={{width:16,height:16,borderRadius:"50%",background:"#fff",transition:"transform .2s",transform:w.active?"translateX(16px)":"translateX(0)",boxShadow:"0 1px 2px rgba(0,0,0,.3)"}}/>
                        </span>
                      </button>
                    </td>
                    <td style={{padding:"9px 12px",fontSize:11,color:T.fgDim,maxWidth:150,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{w.notes||"-"}</td>
                    <td style={{padding:"9px 12px",fontSize:10,color:T.fgDim}}>{w.created_at?new Date(w.created_at).toLocaleDateString("en-KE"):"-"}</td>
                    <td style={{padding:"9px 12px"}}>
                      <button onClick={()=>deleteRule(w.id)} style={{background:"transparent",border:"none",cursor:"pointer",color:T.error,padding:4}}><Trash2 size={13}/></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* - LOGS - */}
      {tab==="logs"&&(
        <div style={card}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
            <Database size={16} color={T.primary}/><span style={{fontWeight:800,fontSize:14,color:T.fg}}>Access Log ({logs.length} entries)</span>
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead>
                <tr style={{borderBottom:`1px solid ${T.border}`,background:T.bg2}}>
                  {["Time","IP Address","Type","User","Action","Status","UA"].map(h=>(
                    <th key={h} style={{padding:"7px 10px",textAlign:"left",fontSize:10,fontWeight:700,color:T.fgDim,whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.slice(0,200).map((log,i)=>{
                  const cls=classifyIP(log.ip_address||"");
                  const profile=profiles[log.user_id];
                  return(
                    <tr key={i} style={{borderBottom:`1px solid ${T.border}12`}}
                      onMouseEnter={e=>(e.currentTarget.style.background=T.bg2)}
                      onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                      <td style={{padding:"5px 10px",color:T.fgDim,whiteSpace:"nowrap",fontSize:10}}>{fmt(log.created_at)}</td>
                      <td style={{padding:"5px 10px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:5}}>
                          <span style={{width:5,height:5,borderRadius:"50%",background:cls==="public"?T.primary:"#7c3aed",flexShrink:0}}/>
                          <code style={{fontSize:11,color:T.fg,fontFamily:"monospace"}}>{log.ip_address||"-"}</code>
                        </div>
                      </td>
                      <td style={{padding:"5px 10px"}}><span style={{fontSize:9,color:cls==="public"?T.primary:"#7c3aed",fontWeight:700}}>{cls}</span></td>
                      <td style={{padding:"5px 10px",color:T.fg,maxWidth:130,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{profile?.full_name||(log.user_id?log.user_id.slice(0,8)+"-":"-")}</td>
                      <td style={{padding:"5px 10px",color:T.fgMuted,maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{log.action||"-"}</td>
                      <td style={{padding:"5px 10px"}}><span style={badge(log.status==="blocked"?T.error:T.success)}>{log.status||"ok"}</span></td>
                      <td style={{padding:"5px 10px",color:T.fgDim,fontSize:9,maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={log.user_agent}>{log.user_agent?.slice(0,40)||"-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* - SESSIONS - */}
      {tab==="sessions"&&(
        <div style={card}>
          <div style={{fontWeight:800,color:T.fg,fontSize:14,marginBottom:14}}>User Sessions ({Object.keys(profiles).length})</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:10}}>
            {Object.values(profiles).map((p:any)=>{
              const lastLog=logs.find(l=>l.user_id===p.id);
              const ip=lastLog?.ip_address||"-";
              const cls=ip!=="-"?classifyIP(ip):null;
              return(
                <div key={p.id} style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:10,padding:"12px 14px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                    <div style={{width:32,height:32,borderRadius:"50%",background:T.primary,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <span style={{fontSize:13,fontWeight:800,color:"#fff"}}>{p.full_name?.[0]||"?"}</span>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:700,color:T.fg,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.full_name||"Unknown"}</div>
                      <div style={{fontSize:9,color:T.fgDim}}>{p.email}</div>
                    </div>
                  </div>
                  <div style={{fontSize:10,color:T.fgMuted,display:"flex",flexDirection:"column",gap:3}}>
                    <span>
                      <Network size={9} style={{verticalAlign:"middle",marginRight:3}}/>{ip}
                      {cls&&<span style={{...badge(cls==="public"?T.primary:"#7c3aed"),fontSize:8,marginLeft:5}}>{cls}</span>}
                    </span>
                    {lastLog&&<span><Clock size={9} style={{verticalAlign:"middle",marginRight:3}}/>{fmtAgo(lastLog.created_at)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* - SETTINGS - */}
      {tab==="settings"&&(
        <div style={{maxWidth:560}}>
          <div style={card}>
            <div style={{fontWeight:800,color:T.fg,fontSize:14,marginBottom:16}}>IP Restriction Settings</div>
            {[
              {key:"ip_restriction_enabled", label:"Enable IP Restriction",   desc:"Block IPs not on whitelist"},
              {key:"allow_all_private",       label:"Allow All Private IPs",   desc:"Auto-allow 10.x, 192.168.x, 172.16.x"},
              {key:"log_all_ips",             label:"Log All Access",           desc:"Record every IP access attempt"},
              {key:"revoke_on_ip_change",     label:"Revoke Session on IP Change", desc:"Force re-auth if IP changes"},
            ].map(({key,label,desc})=>{
              const enabled=get(key,"false")!=="false";
              return(
                <div key={key} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 0",borderBottom:`1px solid ${T.border}22`}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600,color:T.fg}}>{label}</div>
                    <div style={{fontSize:11,color:T.fgDim,marginTop:2}}>{desc}</div>
                  </div>
                  <button onClick={async()=>{
                    await db.from("system_settings").upsert({key,value:enabled?"false":"true",category:"security"},{onConflict:"key"});
                    toast({title:`${label}: ${enabled?"Disabled":"Enabled"}`});
                  }} style={{background:"none",border:"none",cursor:"pointer",padding:0}}>
                    <span style={{display:"inline-flex",width:44,height:24,borderRadius:12,background:enabled?T.success:T.border,alignItems:"center",padding:2,transition:"background .2s"}}>
                      <span style={{width:20,height:20,borderRadius:"50%",background:"#fff",transition:"transform .2s",transform:enabled?"translateX(20px)":"translateX(0)",boxShadow:"0 1px 3px rgba(0,0,0,.3)"}}/>
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* - ADD RULE MODAL - */}
      {showForm&&(
        <div style={{position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,.7)",display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setShowForm(false)}>
          <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:T.rXl,padding:28,width:500,animation:"fadeIn .2s"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}>
              <span style={{fontWeight:800,fontSize:15,color:T.fg}}>Add IP Rule</span>
              <button onClick={()=>setShowForm(false)} style={{background:"transparent",border:"none",cursor:"pointer",color:T.fgDim}}><X size={16}/></button>
            </div>

            {/* Quick fill */}
            {(myPublicIP||myPrivateIPs.length>0)&&(
              <div style={{marginBottom:14}}>
                <div style={{fontSize:11,color:T.fgDim,marginBottom:6}}>Quick fill from detected IPs:</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {myPublicIP&&<button onClick={()=>setForm(fm=>({...fm,cidr:myPublicIP,label:`Public ${myPublicIP}`,type:"public"}))} style={{...btn(T.primary),padding:"4px 10px",fontSize:10}}>{myPublicIP}</button>}
                  {myPrivateIPs.filter(ip=>ip!=="127.0.0.1").map(ip=><button key={ip} onClick={()=>setForm(fm=>({...fm,cidr:ip,label:`Private ${ip}`,type:"private"}))} style={{...btn("#7c3aed"),padding:"4px 10px",fontSize:10}}>{ip}</button>)}
                </div>
              </div>
            )}

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div style={{gridColumn:"1/-1"}}><label style={{fontSize:11,color:T.fgDim,display:"block",marginBottom:4}}>Label</label><input value={form.label} onChange={e=>f("label",e.target.value)} style={inp} placeholder="e.g. Hospital LAN"/></div>
              <div style={{gridColumn:"1/-1"}}><label style={{fontSize:11,color:T.fgDim,display:"block",marginBottom:4}}>IP / CIDR *</label><input value={form.cidr} onChange={e=>f("cidr",e.target.value)} style={inp} placeholder="192.168.1.0/24 or 203.1.2.3"/></div>
              <div><label style={{fontSize:11,color:T.fgDim,display:"block",marginBottom:4}}>Type</label>
                <select value={form.type} onChange={e=>f("type",e.target.value)} style={inp}>
                  <option value="private">Private (allow)</option>
                  <option value="public">Public (allow)</option>
                  <option value="blocked">Block</option>
                  <option value="vpn">VPN</option>
                </select>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8,paddingTop:20}}>
                <label style={{fontSize:11,color:T.fgDim}}>Active</label>
                <input type="checkbox" checked={form.active} onChange={e=>f("active",e.target.checked)} style={{width:16,height:16,accentColor:T.primary}}/>
              </div>
              <div style={{gridColumn:"1/-1"}}><label style={{fontSize:11,color:T.fgDim,display:"block",marginBottom:4}}>Notes</label><input value={form.notes} onChange={e=>f("notes",e.target.value)} style={inp} placeholder="Optional"/></div>
            </div>

            <div style={{display:"flex",gap:10,marginTop:18,justifyContent:"flex-end"}}>
              <button onClick={()=>setShowForm(false)} style={btn(T.bg2,T.border)}>Cancel</button>
              <button onClick={saveRule} disabled={saving} style={btn(T.primary)}>
                {saving?<RefreshCw size={13} style={{animation:"spin 1s linear infinite"}}/>:<Save size={13}/>}
                {saving?"Saving...":"Add Rule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import type React from "react";
