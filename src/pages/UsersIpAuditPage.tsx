/**
 * EL5 MediProcure — Users & IP Audit + Device Tracker v4.0
 * Merged: former AdminTrackerPage (Devices · Cache) absorbed here
 * Real-time from ip_access_log · audit_log · profiles
 * Embu Level 5 Hospital
 */
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getAllDeviceSessions } from "@/lib/deviceTracker";
import {
  Users, Shield, Globe, MapPin, Monitor, Smartphone, Laptop,
  Clock, CheckCircle, XCircle, AlertTriangle, RefreshCw, Download,
  Search, Lock, ChevronRight, Activity, Network, Signal,
  HardDrive, Trash2,
} from "lucide-react";

const db = supabase as any;

type TabType = "overview" | "users" | "ip_audit" | "access_log" | "geo" | "devices" | "cache";

interface AuditLog {
  id: string; user_name?: string | null; action: string;
  ip_address?: string | null; user_agent?: string | null;
  module: string; created_at: string;
}
interface AccessLogEntry {
  id: string; ip_address: string; user_email?: string | null;
  user_agent?: string | null; city?: string | null; country?: string | null;
  allowed: boolean; reason?: string | null; path?: string | null;
  created_at?: string | null;
}
interface UserProfile {
  id: string; email?: string | null; full_name: string;
  department?: string | null; is_active?: boolean | null;
  is_locked?: boolean | null; last_ip?: string | null;
  last_seen?: string | null; role?: string | null;
}
interface CacheEntry { key: string; userId: string; page: string; size: number; ts?: number; }

const D = {
  blue:"#0078d4", blueLt:"#deecf9",
  bg:"#f3f2f1", card:"#ffffff",
  border:"#edebe9", borderMd:"#c8c6c4",
  text:"#323130", textSub:"#605e5c", textMt:"#a19f9d",
  success:"#107c10", successLt:"#dff6dd",
  warn:"#ff8c00", warnLt:"#fff4ce",
  danger:"#a4262c", dangerLt:"#fde7e9",
  teal:"#038387", tealLt:"#d1f2f4",
  purple:"#8764b8", purpleLt:"#e8d0f7",
  shadow:"0 1.6px 3.6px rgba(0,0,0,.132)",
  radius:"4px",
  font:"'Segoe UI','Segoe UI Web','Arial',sans-serif",
};

function ago(s?: string | null): string {
  if (!s) return "—";
  const d = Date.now() - new Date(s).getTime();
  if (d < 60000) return `${Math.floor(d/1000)}s ago`;
  if (d < 3600000) return `${Math.floor(d/60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d/3600000)}h ago`;
  return `${Math.floor(d/86400000)}d ago`;
}
function parseDeviceType(ua?: string|null) {
  if (!ua) return "desktop";
  if (ua.includes("Mobile")||ua.includes("Android")) return "mobile";
  if (ua.includes("iPad")||ua.includes("Tablet")) return "tablet";
  return "desktop";
}
function parseBrowser(ua?: string|null) {
  if (!ua) return "Unknown";
  if (ua.includes("Edg")) return "Edge";
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari")) return "Safari";
  return "Other";
}
function parseOS(ua?: string|null) {
  if (!ua) return "Unknown";
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Mac")) return "macOS";
  if (ua.includes("Linux")) return "Linux";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("iOS")||ua.includes("iPhone")||ua.includes("iPad")) return "iOS";
  return "Other";
}
function DeviceIcon({ ua }: { ua?: string|null }) {
  const t = parseDeviceType(ua);
  if (t==="mobile") return <Smartphone size={12}/>;
  if (t==="tablet") return <Laptop size={12}/>;
  return <Monitor size={12}/>;
}
function cs(extra?: any) {
  return { background:D.card, borderRadius:"6px", boxShadow:D.shadow, border:`1px solid ${D.border}`, ...extra };
}

function getCacheEntries(): CacheEntry[] {
  const entries: CacheEntry[] = [];
  try {
    for (let i=0; i<sessionStorage.length; i++) {
      const k = sessionStorage.key(i)!;
      if (!k.startsWith("el5_")) continue;
      const v = sessionStorage.getItem(k)||"";
      try { const p=JSON.parse(v); entries.push({key:k,userId:p.userId||k,page:p.page||k,size:v.length,ts:p.ts}); } catch{ entries.push({key:k,userId:k,page:k,size:v.length}); }
    }
    for (let i=0; i<localStorage.length; i++) {
      const k = localStorage.key(i)!;
      if (!k.startsWith("el5_vp_")&&!k.startsWith("el5_vs_")) continue;
      const v = localStorage.getItem(k)||"";
      entries.push({key:"[LS]"+k,userId:k,page:k.replace("el5_vp_","").replace("el5_vs_",""),size:v.length});
    }
  } catch(_e) {}
  return entries;
}

const TABS: {id:TabType;label:string;I:any}[] = [
  {id:"overview",   label:"Overview",    I:Shield   },
  {id:"users",      label:"Users",       I:Users    },
  {id:"ip_audit",   label:"IP Audit",    I:Globe    },
  {id:"access_log", label:"Audit Log",   I:Clock    },
  {id:"geo",        label:"Geo",         I:MapPin   },
  {id:"devices",    label:"Devices",     I:Monitor  },
  {id:"cache",      label:"Cache",       I:HardDrive},
];

export default function UsersIpAuditPage() {
  const [tab, setTab] = useState<TabType>("overview");
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [accessLog, setAccessLog] = useState<AccessLogEntry[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [deviceSessions, setDeviceSessions] = useState<any[]>([]);
  const [cacheEntries, setCacheEntries] = useState<CacheEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [liveActivity, setLiveActivity] = useState<string[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const streamRef = useRef<HTMLDivElement>(null);

  const [reauditing, setReauditing] = useState(false);

  const runFullReaudit = useCallback(async () => {
    setReauditing(true);
    try {
      const [{ logDeviceSession, getGeoInfo }, { checkIpAccess }] = await Promise.all([
        import("@/lib/deviceTracker"),
        import("@/lib/ipRestriction"),
      ]);
      const { data: { user } = { user: null } } = await supabase.auth.getUser();
      const geo = await getGeoInfo();
      await Promise.allSettled([
        logDeviceSession(user?.id, user?.email ?? undefined, geo),
        checkIpAccess(user?.id, user?.email ?? undefined),
      ]);
      toast({ title: "Full re-audit complete", description: "Fresh device/OS and IP data captured for this session." });
    } catch (_e) {
      toast({ title: "Re-audit failed", description: "Could not capture fresh device/IP data.", variant: "destructive" as any });
    } finally {
      await loadAllRef.current?.();
      setReauditing(false);
    }
  }, []);

  const loadAllRef = useRef<null | (() => Promise<void>)>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [logsRes, accessRes, usersRes, devRes] = await Promise.allSettled([
      db.from("audit_log").select("*").order("created_at",{ascending:false}).limit(500),
      db.from("ip_access_log").select("*").order("created_at",{ascending:false}).limit(500),
      db.from("profiles").select("id,email,full_name,department,is_active,is_locked,last_ip,last_seen,role").order("full_name").limit(500),
      getAllDeviceSessions(),
    ]);
    if (logsRes.status==="fulfilled") setAuditLogs(logsRes.value.data||[]);
    if (accessRes.status==="fulfilled") setAccessLog(accessRes.value.data||[]);
    if (usersRes.status==="fulfilled") setUsers(usersRes.value.data||[]);
    if (devRes.status==="fulfilled") setDeviceSessions(devRes.value||[]);
    setCacheEntries(getCacheEntries());
    setLoading(false);
  },[]);

  useEffect(()=>{ loadAllRef.current = loadAll; },[loadAll]);
  useEffect(()=>{ loadAll(); },[loadAll]);

  // Data freshness: flag sources whose newest record is older than expected
  const freshness = useMemo(()=>{
    const newest = (arr: {created_at?: string|null}[]) => arr.reduce<string|null>((m,e)=> (e.created_at && (!m || e.created_at>m)) ? e.created_at! : m, null);
    const check = (label:string, ts: string|null, staleMs:number) => {
      if (!ts) return { label, stale:true, msg:"No data yet" };
      const ageMs = Date.now()-new Date(ts).getTime();
      return { label, stale: ageMs>staleMs, msg: ago(ts) };
    };
    return [
      check("IP access log", newest(accessLog), 24*3600*1000),
      check("Audit trail", newest(auditLogs), 24*3600*1000),
      check("Device fingerprints", deviceSessions.length ? (deviceSessions[0]?.timestamp||deviceSessions[0]?._updated||null) : null, 24*3600*1000),
    ];
  },[accessLog,auditLogs,deviceSessions]);
  const staleSources = freshness.filter(f=>f.stale);

  useEffect(()=>{
    if (!autoRefresh) return;
    const id = setInterval(()=>{
      loadAll();
      setLiveActivity(p=>[`${new Date().toLocaleTimeString("en-KE")} — Refreshed`,...p.slice(0,9)]);
    },20000);
    return ()=>clearInterval(id);
  },[autoRefresh,loadAll]);

  useEffect(()=>{
    const ch = db.channel("users_ip_audit_v4")
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"audit_log"},(p:any)=>{
        const l:AuditLog=p.new;
        setAuditLogs(prev=>[l,...prev.slice(0,499)]);
        setLiveActivity(prev=>[`${new Date().toLocaleTimeString("en-KE")} — AUDIT: ${l.action} | ${l.user_name||"system"} | ${l.ip_address||"?"} | ${l.module}`,...prev.slice(0,9)]);
      })
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"ip_access_log"},(p:any)=>{
        const e:AccessLogEntry=p.new;
        setAccessLog(prev=>[e,...prev.slice(0,499)]);
        setLiveActivity(prev=>[`${new Date().toLocaleTimeString("en-KE")} — ${e.allowed?"✅ ALLOWED":"🚫 BLOCKED"}: ${e.ip_address} | ${e.user_email||"anon"} | ${[e.city,e.country].filter(Boolean).join(", ")||"?"}`,...prev.slice(0,9)]);
      })
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"profiles"},()=>loadAll())
      .subscribe();
    return ()=>{ supabase.removeChannel(ch); };
  },[loadAll]);

  const stats = useMemo(()=>({
    totalUsers:users.length, activeUsers:users.filter(u=>u.is_active!==false).length,
    lockedUsers:users.filter(u=>u.is_locked).length, totalAccess:accessLog.length,
    allowedAccess:accessLog.filter(e=>e.allowed).length, blockedAccess:accessLog.filter(e=>!e.allowed).length,
    uniqueIPs:[...new Set(accessLog.map(e=>e.ip_address))].length,
    auditEvents:auditLogs.length, countries:[...new Set(accessLog.map(e=>e.country).filter(Boolean))].length,
    todayAccess:accessLog.filter(e=>e.created_at&&new Date(e.created_at).toDateString()===new Date().toDateString()).length,
    devices:deviceSessions.length, geoDevices:deviceSessions.filter(d=>d.geo).length,
  }),[users,accessLog,auditLogs,deviceSessions]);

  const userIPMap = useMemo(()=>{
    const map:Record<string,{ips:Set<string>;allowed:number;blocked:number;lastSeen?:string|null;cities:Set<string>;countries:Set<string>}>={};
    for (const e of accessLog) {
      const k=e.user_email||"anonymous";
      if (!map[k]) map[k]={ips:new Set(),allowed:0,blocked:0,lastSeen:e.created_at,cities:new Set(),countries:new Set()};
      map[k].ips.add(e.ip_address);
      if (e.allowed) map[k].allowed++; else map[k].blocked++;
      if (e.city) map[k].cities.add(e.city);
      if (e.country) map[k].countries.add(e.country);
    }
    return map;
  },[accessLog]);

  const ipStats = useMemo(()=>{
    const map:Record<string,{count:number;allowed:number;blocked:number;users:Set<string>;city?:string|null;country?:string|null;lastSeen?:string|null;ua?:string|null}>={};
    for (const e of accessLog) {
      if (!map[e.ip_address]) map[e.ip_address]={count:0,allowed:0,blocked:0,users:new Set(),city:e.city,country:e.country,lastSeen:e.created_at,ua:e.user_agent};
      map[e.ip_address].count++;
      if (e.allowed) map[e.ip_address].allowed++; else map[e.ip_address].blocked++;
      if (e.user_email) map[e.ip_address].users.add(e.user_email);
    }
    return Object.entries(map).sort((a,b)=>b[1].count-a[1].count);
  },[accessLog]);

  function riskLevel(blocked:number,total:number):"low"|"medium"|"high"|"critical" {
    if (total===0) return "low"; const r=blocked/total;
    if (r>0.7) return "critical"; if (r>0.4) return "high";
    if (r>0.15) return "medium"; return "low";
  }
  const riskColors:Record<string,{bg:string;color:string}>={
    low:{bg:D.successLt,color:D.success}, medium:{bg:D.warnLt,color:D.warn},
    high:{bg:"#fde8d8",color:"#ca5010"}, critical:{bg:D.dangerLt,color:D.danger},
  };

  function exportCSV() {
    const rows=["IP,Users,Total,Allowed,Blocked,City,Country,Last Seen",
      ...ipStats.map(([ip,d])=>`"${ip}","${[...d.users].join(";")}",${d.count},${d.allowed},${d.blocked},"${d.city||""}","${d.country||""}","${d.lastSeen||""}"`)];
    const b=new Blob([rows.join("\n")],{type:"text/csv"});
    const u=URL.createObjectURL(b); const a=document.createElement("a");
    a.href=u; a.download="ip_audit.csv"; a.click(); URL.revokeObjectURL(u);
    toast({title:"Exported IP audit CSV"});
  }

  function exportDevices() {
    const rows=["User,OS,Browser,Device,Screen,City,Country,ISP,IP,Timezone,Last Seen",
      ...deviceSessions.map(d=>`"${d.userEmail||""}","${d.device?.os||""} ${d.device?.os_version||""}","${d.device?.browser||""}","${d.device?.device_type||""}","${d.device?.screen_w||""}x${d.device?.screen_h||""}","${d.geo?.city||""}","${d.geo?.country||""}","${d.geo?.isp||""}","${d.geo?.ip||""}","${d.device?.timezone||""}","${d.timestamp||d._updated||""}"`)];
    const b=new Blob([rows.join("\n")],{type:"text/csv"});
    const u=URL.createObjectURL(b); const a=document.createElement("a");
    a.href=u; a.download="device_tracker.csv"; a.click(); URL.revokeObjectURL(u);
  }

  function clearCacheEntry(key:string) {
    try {
      if (key.startsWith("[LS]")) localStorage.removeItem(key.replace("[LS]",""));
      else sessionStorage.removeItem(key);
      setCacheEntries(getCacheEntries()); toast({title:"Cache entry cleared"});
    } catch(_e){}
  }

  function clearAllCache() {
    if (!window.confirm("Clear all session caches?")) return;
    try {
      Object.keys(sessionStorage).filter(k=>k.startsWith("el5_")).forEach(k=>sessionStorage.removeItem(k));
      Object.keys(localStorage).filter(k=>k.startsWith("el5_vp_")||k.startsWith("el5_vs_")).forEach(k=>localStorage.removeItem(k));
      setCacheEntries([]); toast({title:"All cache cleared"});
    } catch(_e){}
  }

  const q = search.toLowerCase();
  const filteredUsers  = !search ? users  : users.filter(u=>(u.full_name?.toLowerCase()||"").includes(q)||(u.email?.toLowerCase()||"").includes(q)||(u.department?.toLowerCase()||"").includes(q)||(u.last_ip||"").includes(q));
  const filteredIPs    = !search ? ipStats : ipStats.filter(([ip,d])=>ip.includes(q)||(d.city?.toLowerCase()||"").includes(q)||(d.country?.toLowerCase()||"").includes(q)||[...d.users].some(u=>u.toLowerCase().includes(q)));
  const filteredAudit  = !search ? auditLogs : auditLogs.filter(l=>l.action.toLowerCase().includes(q)||(l.user_name?.toLowerCase()||"").includes(q)||(l.ip_address||"").includes(q)||l.module.toLowerCase().includes(q));
  const filteredDevices= !search ? deviceSessions : deviceSessions.filter(d=>[d.userEmail,d.device?.os,d.device?.browser,d.geo?.city,d.geo?.country].some(f=>f?.toLowerCase().includes(q)));

  const btn=(label:string,onClick:()=>void,style?:any)=>(
    <button onClick={onClick} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",background:"transparent",border:`1px solid ${D.borderMd}`,borderRadius:D.radius,fontSize:12,cursor:"pointer",color:D.text,...style}}>
      {label}
    </button>
  );

  return (
    <div style={{background:D.bg,minHeight:"100vh",fontFamily:D.font,color:D.text}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Teal hero — matches the Admin Hub visual style, replaces the old breadcrumb + small header */}
      <div style={{background:"linear-gradient(135deg,#107C73,#0a5a52)",padding:"24px 24px 20px"}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:42,height:42,borderRadius:10,background:"rgba(255,255,255,.15)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Globe size={20} color="#fff"/>
            </div>
            <div>
              <h1 style={{margin:0,fontSize:22,fontWeight:300,color:"#fff",letterSpacing:"-.02em"}}>Security Center</h1>
            </div>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {btn("⬇ Export",exportCSV,{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",color:"#fff"})}
            <button onClick={runFullReaudit} disabled={reauditing}
              style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",background:"rgba(255,255,255,.9)",border:"none",borderRadius:D.radius,fontSize:12,cursor:"pointer",color:"#0a5a52",fontWeight:700}}>
              <RefreshCw size={11} style={{animation:reauditing?"spin 1s linear infinite":"none"}}/> {reauditing?"Re-auditing…":"Full Re-Audit"}
            </button>
            <button onClick={loadAll} disabled={loading}
              style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",borderRadius:D.radius,fontSize:12,cursor:"pointer",color:"#fff"}}>
              <RefreshCw size={11} style={{animation:loading?"spin 1s linear infinite":"none"}}/> Refresh
            </button>
            <label style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"rgba(255,255,255,.85)",cursor:"pointer"}}>
              <input type="checkbox" checked={autoRefresh} onChange={e=>setAutoRefresh(e.target.checked)} style={{margin:0}}/>
              Auto-refresh
            </label>
          </div>
        </div>
        <div style={{marginTop:14,position:"relative",maxWidth:320}}>
          <Search size={11} style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",color:"rgba(255,255,255,.6)",pointerEvents:"none"}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search users, IPs, locations…"
            style={{padding:"6px 8px 6px 24px",border:"1px solid rgba(255,255,255,.3)",borderRadius:D.radius,fontSize:12,outline:"none",width:"100%",fontFamily:D.font,background:"rgba(255,255,255,.12)",color:"#fff"}}/>
          {search&&<button onClick={()=>setSearch("")} style={{position:"absolute",right:5,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,.7)",lineHeight:1}}>×</button>}
        </div>
      </div>

      {/* Tabs */}
      <div style={{background:D.card,borderBottom:`1px solid ${D.border}`,padding:"0 20px",display:"flex",gap:0,overflowX:"auto"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{display:"flex",alignItems:"center",gap:5,padding:"10px 14px",background:"transparent",border:"none",borderBottom:tab===t.id?`2px solid ${D.blue}`:"2px solid transparent",color:tab===t.id?D.blue:D.textSub,fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",transition:"all .1s"}}>
            <t.I size={12}/>{t.label}
          </button>
        ))}
      </div>

      {staleSources.length>0 && (
        <div style={{margin:"10px 20px 0",padding:"8px 14px",background:D.warnLt,border:`1px solid ${D.warn}`,borderRadius:D.radius,display:"flex",alignItems:"center",gap:8,fontSize:12,color:"#7a4a00"}}>
          <AlertTriangle size={13}/>
          <span><b>Stale data:</b> {staleSources.map(s=>`${s.label} (${s.msg})`).join(" · ")}. Click "Full Re-Audit" to force a fresh capture, or check that the logging call sites are still wired into the live auth flow.</span>
        </div>
      )}

      <div style={{padding:"14px 20px 32px"}}>

        {/* ── OVERVIEW ─────────────────────────────────── */}
        {tab==="overview"&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:8,marginBottom:14}}>
              {[
                {label:"Total Users",  val:stats.totalUsers,   c:D.purple, bg:D.purpleLt, I:Users},
                {label:"Active",       val:stats.activeUsers,  c:D.success,bg:D.successLt,I:CheckCircle},
                {label:"Locked",       val:stats.lockedUsers,  c:D.danger, bg:D.dangerLt, I:Lock},
                {label:"Access Events",val:stats.totalAccess,  c:D.blue,   bg:D.blueLt,   I:Clock},
                {label:"Allowed",      val:stats.allowedAccess,c:D.success,bg:D.successLt,I:CheckCircle},
                {label:"Blocked",      val:stats.blockedAccess,c:D.danger, bg:D.dangerLt, I:XCircle},
                {label:"Unique IPs",   val:stats.uniqueIPs,    c:D.teal,   bg:D.tealLt,   I:Network},
                {label:"Countries",    val:stats.countries,    c:D.warn,   bg:D.warnLt,   I:Globe},
                {label:"Audit Events", val:stats.auditEvents,  c:D.textSub,bg:D.bg,       I:Activity},
                {label:"Devices Seen", val:stats.devices,      c:D.blue,   bg:D.blueLt,   I:Monitor},
              ].map(k=>(
                <div key={k.label} style={{...cs(),padding:"12px 14px",borderTop:`3px solid ${k.c}`}}>
                  <div style={{width:20,height:20,borderRadius:D.radius,background:k.bg,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:7}}>
                    <k.I size={10} color={k.c}/>
                  </div>
                  <div style={{fontSize:20,fontWeight:800,color:k.c,lineHeight:1,marginBottom:3}}>{loading?"—":k.val}</div>
                  <div style={{fontSize:10,fontWeight:700,color:D.text,textTransform:"uppercase",letterSpacing:".04em"}}>{k.label}</div>
                </div>
              ))}
            </div>
            <div style={cs()}>
              <div style={{padding:"10px 16px",borderBottom:`1px solid ${D.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:13,fontWeight:700,color:D.text,display:"flex",alignItems:"center",gap:6}}>
                  <span style={{width:8,height:8,borderRadius:"50%",background:D.success,display:"inline-block",animation:"pulse 2s infinite"}}/>
                  Live Activity Stream
                </span>
                <button onClick={()=>setLiveActivity([])} style={{fontSize:11,color:D.textMt,background:"none",border:"none",cursor:"pointer"}}>Clear</button>
              </div>
              <div ref={streamRef} style={{background:"#0d1117",minHeight:110,padding:"12px 16px",fontFamily:"monospace",fontSize:11}}>
                {liveActivity.length===0
                  ?<div style={{color:"#58a6ff"}}>$ Monitoring audit_log · ip_access_log · profiles — waiting for events…</div>
                  :liveActivity.map((line,i)=>(
                    <div key={i} style={{color:line.includes("BLOCKED")?"#f85149":line.includes("ALLOWED")?"#3fb950":line.includes("AUDIT")?"#e3b341":"#58a6ff",marginBottom:3}}>{line}</div>
                  ))
                }
              </div>
            </div>
          </div>
        )}

        {/* ── USERS ────────────────────────────────────── */}
        {tab==="users"&&(
          <div style={cs()}>
            <div style={{padding:"10px 16px",borderBottom:`1px solid ${D.border}`,display:"flex",justifyContent:"space-between"}}>
              <span style={{fontSize:13,fontWeight:700,color:D.text}}>All Users</span>
              <span style={{fontSize:11,color:D.textMt}}>{filteredUsers.length} users</span>
            </div>
            <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch" as any}}>
              <table data-mobile-card="true" style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead><tr style={{background:D.bg}}>
                  {["Status","Name","Email","Role","Department","Last IP","Last Seen","IPs Used","Access Events"].map(h=>(
                    <th key={h} style={{padding:"7px 12px",textAlign:"left",fontWeight:700,color:D.textSub,fontSize:11,whiteSpace:"nowrap",borderBottom:`1px solid ${D.border}`}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {filteredUsers.map(u=>{
                    const uip=userIPMap[u.email||""];
                    return (
                      <tr key={u.id} style={{borderBottom:`1px solid ${D.border}`}}
                        onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=D.bg;}}
                        onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="";}}>
                        <td style={{padding:"7px 12px"}}>
                          <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"2px 7px",borderRadius:99,fontSize:10,fontWeight:700,background:u.is_locked?D.dangerLt:u.is_active!==false?D.successLt:"#f0f0f0",color:u.is_locked?D.danger:u.is_active!==false?D.success:D.textMt}}>
                            {u.is_locked?<Lock size={8}/>:<CheckCircle size={8}/>}
                            {u.is_locked?"LOCKED":u.is_active!==false?"ACTIVE":"INACTIVE"}
                          </span>
                        </td>
                        <td style={{padding:"7px 12px",fontWeight:600,color:D.text,whiteSpace:"nowrap"}}>{u.full_name}</td>
                        <td style={{padding:"7px 12px",color:D.textSub,fontSize:11}}>{u.email||"—"}</td>
                        <td style={{padding:"7px 12px"}}>
                          {u.role&&<span style={{padding:"1px 6px",borderRadius:3,background:D.purpleLt,color:D.purple,fontSize:10,fontWeight:700}}>{u.role.replace(/_/g," ")}</span>}
                        </td>
                        <td style={{padding:"7px 12px",color:D.textSub}}>{u.department||"—"}</td>
                        <td style={{padding:"7px 12px",fontFamily:"monospace",color:D.blue,fontSize:11}}>{u.last_ip||"—"}</td>
                        <td style={{padding:"7px 12px",color:D.textMt,whiteSpace:"nowrap",fontSize:11}}>{ago(u.last_seen)}</td>
                        <td style={{padding:"7px 12px",fontWeight:uip?700:400}}>{uip?uip.ips.size:0}</td>
                        <td style={{padding:"7px 12px",fontSize:11}}>
                          {uip?(<><span style={{color:D.success}}>{uip.allowed}</span>{uip.blocked>0&&<span style={{color:D.danger,marginLeft:6}}>/{uip.blocked} blocked</span>}</>):<span style={{color:D.textMt}}>—</span>}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredUsers.length===0&&<tr><td colSpan={9} style={{padding:"32px",textAlign:"center",color:D.textMt}}>No users found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── IP AUDIT ─────────────────────────────────── */}
        {tab==="ip_audit"&&(
          <div style={cs()}>
            <div style={{padding:"10px 16px",borderBottom:`1px solid ${D.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:13,fontWeight:700,color:D.text}}>IP Audit Report</span>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <span style={{fontSize:11,color:D.textMt}}>{filteredIPs.length} unique IPs</span>
                <button onClick={exportCSV} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 9px",background:"transparent",border:`1px solid ${D.borderMd}`,borderRadius:D.radius,fontSize:11,cursor:"pointer",color:D.text}}>
                  <Download size={10}/> Export
                </button>
              </div>
            </div>
            <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch" as any}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead><tr style={{background:D.bg}}>
                  {["Risk","IP Address","Total","Allowed","Blocked","Users","City","Country","Browser","Last Seen"].map(h=>(
                    <th key={h} style={{padding:"7px 12px",textAlign:"left",fontWeight:700,color:D.textSub,fontSize:11,whiteSpace:"nowrap",borderBottom:`1px solid ${D.border}`}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {filteredIPs.slice(0,150).map(([ip,d])=>{
                    const rl=riskLevel(d.blocked,d.count); const rc=riskColors[rl];
                    return (
                      <tr key={ip} style={{borderBottom:`1px solid ${D.border}`}}
                        onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=D.bg;}}
                        onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="";}}>
                        <td style={{padding:"7px 12px"}}><span style={{padding:"2px 7px",borderRadius:99,fontSize:10,fontWeight:700,background:rc.bg,color:rc.color,textTransform:"uppercase"}}>{rl}</span></td>
                        <td style={{padding:"7px 12px",fontFamily:"monospace",fontWeight:700,color:D.blue}}>{ip}</td>
                        <td style={{padding:"7px 12px",fontWeight:700}}>{d.count}</td>
                        <td style={{padding:"7px 12px",color:D.success,fontWeight:600}}>{d.allowed}</td>
                        <td style={{padding:"7px 12px",color:d.blocked>0?D.danger:D.textMt,fontWeight:d.blocked>0?700:400}}>{d.blocked}</td>
                        <td style={{padding:"7px 12px"}}>{d.users.size}</td>
                        <td style={{padding:"7px 12px",color:D.textSub}}>{d.city||"—"}</td>
                        <td style={{padding:"7px 12px",color:D.textSub}}>{d.country||"—"}</td>
                        <td style={{padding:"7px 12px",color:D.textMt}}><div style={{display:"flex",alignItems:"center",gap:4}}><DeviceIcon ua={d.ua}/> {parseBrowser(d.ua)}</div></td>
                        <td style={{padding:"7px 12px",color:D.textMt,whiteSpace:"nowrap",fontSize:11}}>{ago(d.lastSeen)}</td>
                      </tr>
                    );
                  })}
                  {filteredIPs.length===0&&<tr><td colSpan={10} style={{padding:"32px",textAlign:"center",color:D.textMt}}>No IP data yet</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── AUDIT LOG ────────────────────────────────── */}
        {tab==="access_log"&&(
          <div style={cs()}>
            <div style={{padding:"10px 16px",borderBottom:`1px solid ${D.border}`,display:"flex",justifyContent:"space-between"}}>
              <span style={{fontSize:13,fontWeight:700,color:D.text}}>System Audit Log</span>
              <span style={{fontSize:11,color:D.textMt}}>{filteredAudit.length} events</span>
            </div>
            <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch" as any}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead><tr style={{background:D.bg}}>
                  {["Action","User","Module","IP Address","Time"].map(h=>(
                    <th key={h} style={{padding:"7px 12px",textAlign:"left",fontWeight:700,color:D.textSub,fontSize:11,borderBottom:`1px solid ${D.border}`}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {filteredAudit.slice(0,200).map(e=>(
                    <tr key={e.id} style={{borderBottom:`1px solid ${D.border}`}}
                      onMouseEnter={ev=>{(ev.currentTarget as HTMLElement).style.background=D.bg;}}
                      onMouseLeave={ev=>{(ev.currentTarget as HTMLElement).style.background="";}}>
                      <td style={{padding:"7px 12px",fontWeight:500,color:D.text}}>{e.action}</td>
                      <td style={{padding:"7px 12px",color:D.textSub}}>{e.user_name||<span style={{color:D.textMt}}>system</span>}</td>
                      <td style={{padding:"7px 12px"}}><span style={{padding:"1px 6px",borderRadius:3,background:D.blueLt,color:D.blue,fontSize:10,fontWeight:600}}>{e.module}</span></td>
                      <td style={{padding:"7px 12px",fontFamily:"monospace",color:D.blue,fontSize:11}}>{e.ip_address||"—"}</td>
                      <td style={{padding:"7px 12px",color:D.textMt,whiteSpace:"nowrap",fontSize:11}}>{ago(e.created_at)}</td>
                    </tr>
                  ))}
                  {filteredAudit.length===0&&<tr><td colSpan={5} style={{padding:"32px",textAlign:"center",color:D.textMt}}>No audit events</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── GEO ──────────────────────────────────────── */}
        {tab==="geo"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div style={cs()}>
              <div style={{padding:"10px 16px",borderBottom:`1px solid ${D.border}`}}><span style={{fontSize:13,fontWeight:700,color:D.text}}>Traffic by Country</span></div>
              <div style={{padding:"14px 16px"}}>
                {(()=>{
                  const map:Record<string,{total:number;allowed:number;blocked:number}>={};
                  for (const e of accessLog) { const k=e.country||"Unknown"; if (!map[k]) map[k]={total:0,allowed:0,blocked:0}; map[k].total++; if (e.allowed) map[k].allowed++; else map[k].blocked++; }
                  const sorted=Object.entries(map).sort((a,b)=>b[1].total-a[1].total); const total=accessLog.length||1;
                  return sorted.slice(0,12).map(([country,d])=>(
                    <div key={country} style={{marginBottom:10}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:12}}>
                        <span style={{color:D.text,fontWeight:500}}>{country}</span>
                        <span style={{fontSize:11,color:D.textMt}}>{d.total} ({Math.round(d.total/total*100)}%)</span>
                      </div>
                      <div style={{display:"flex",height:5,borderRadius:99,overflow:"hidden",background:D.border}}>
                        <div style={{height:5,background:D.success,width:`${(d.allowed/d.total)*100}%`}}/>
                        <div style={{height:5,background:D.danger,width:`${(d.blocked/d.total)*100}%`}}/>
                      </div>
                    </div>
                  ));
                })()}
                {accessLog.length===0&&<div style={{color:D.textMt,textAlign:"center",padding:"20px 0",fontSize:12}}>No geo data yet</div>}
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div style={cs()}>
                <div style={{padding:"10px 16px",borderBottom:`1px solid ${D.border}`}}><span style={{fontSize:13,fontWeight:700,color:D.text}}>Browser & OS</span></div>
                <div style={{padding:"14px 16px"}}>
                  {(()=>{
                    const bm:Record<string,number>={},om:Record<string,number>={};
                    for (const e of accessLog) { const b=parseBrowser(e.user_agent),o=parseOS(e.user_agent); bm[b]=(bm[b]||0)+1; om[o]=(om[o]||0)+1; }
                    const total=accessLog.length||1;
                    return (<div>
                      <div style={{fontSize:11,fontWeight:700,color:D.textSub,textTransform:"uppercase",marginBottom:8}}>Browsers</div>
                      {Object.entries(bm).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([b,n])=>(
                        <div key={b} style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5,alignItems:"center"}}>
                          <span style={{color:D.text}}>{b}</span>
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <div style={{width:70,height:4,background:D.border,borderRadius:99}}><div style={{height:4,background:D.blue,borderRadius:99,width:`${(n/total)*100}%`}}/></div>
                            <span style={{color:D.textMt,fontSize:11,minWidth:22,textAlign:"right"}}>{n}</span>
                          </div>
                        </div>
                      ))}
                      <div style={{fontSize:11,fontWeight:700,color:D.textSub,textTransform:"uppercase",marginTop:12,marginBottom:8}}>Operating Systems</div>
                      {Object.entries(om).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([o,n])=>(
                        <div key={o} style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5,alignItems:"center"}}>
                          <span style={{color:D.text}}>{o}</span>
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <div style={{width:70,height:4,background:D.border,borderRadius:99}}><div style={{height:4,background:D.teal,borderRadius:99,width:`${(n/total)*100}%`}}/></div>
                            <span style={{color:D.textMt,fontSize:11,minWidth:22,textAlign:"right"}}>{n}</span>
                          </div>
                        </div>
                      ))}
                    </div>);
                  })()}
                  {accessLog.length===0&&<div style={{color:D.textMt,textAlign:"center",padding:"20px 0",fontSize:12}}>No data yet</div>}
                </div>
              </div>
              <div style={cs({padding:"14px 16px"})}>
                <div style={{fontSize:11,fontWeight:700,color:D.textSub,textTransform:"uppercase",marginBottom:10}}>Top Cities (from ip_access_log)</div>
                {(()=>{
                  const cm:Record<string,number>={};
                  for (const e of accessLog) { const k=e.city||"Unknown"; cm[k]=(cm[k]||0)+1; }
                  return Object.entries(cm).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([city,n])=>(
                    <div key={city} style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5,padding:"4px 0",borderBottom:`1px solid ${D.border}`}}>
                      <span style={{color:D.text,display:"flex",alignItems:"center",gap:5}}><MapPin size={10} color={D.teal}/>{city}</span>
                      <span style={{fontWeight:700,color:D.teal}}>{n}</span>
                    </div>
                  ));
                })()}
                {accessLog.length===0&&<div style={{color:D.textMt,fontSize:12,textAlign:"center"}}>No data yet</div>}
              </div>
            </div>
          </div>
        )}

        {/* ── DEVICES ──────────────────────────────────── */}
        {tab==="devices"&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:12}}>
              {[{label:"Desktop",icon:"🖥",f:"desktop"},{label:"Mobile",icon:"📱",f:"mobile"},{label:"Tablet",icon:"📟",f:"tablet"},{label:"Unknown",icon:"❓",f:"unknown"}].map(d=>(
                <div key={d.label} style={cs({padding:"12px 14px",textAlign:"center"})}>
                  <div style={{fontSize:20}}>{d.icon}</div>
                  <div style={{fontSize:22,fontWeight:800,color:D.blue,margin:"4px 0"}}>{deviceSessions.filter(ds=>ds.device?.device_type===d.f).length}</div>
                  <div style={{fontSize:11,color:D.textSub}}>{d.label}</div>
                </div>
              ))}
            </div>
            <div style={cs()}>
              <div style={{padding:"10px 16px",borderBottom:`1px solid ${D.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:13,fontWeight:700,color:D.text}}>Device Fingerprints</span>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <span style={{fontSize:11,color:D.textMt}}>{filteredDevices.length} records</span>
                  <button onClick={exportDevices} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 9px",background:"transparent",border:`1px solid ${D.borderMd}`,borderRadius:D.radius,fontSize:11,cursor:"pointer",color:D.text}}>
                    <Download size={10}/> Export
                  </button>
                </div>
              </div>
              <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch" as any}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead><tr style={{background:D.bg}}>
                    {["User","OS","Browser","Device","Screen","Timezone","Language","Touch","City","Country","Last Seen"].map(h=>(
                      <th key={h} style={{padding:"7px 12px",textAlign:"left",fontWeight:700,color:D.textSub,fontSize:11,whiteSpace:"nowrap",borderBottom:`1px solid ${D.border}`}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {filteredDevices.map((d,i)=>{
                      const dev=d.device||{}; const geo=d.geo||{};
                      const osIcon=dev.os?.includes("Windows")?"🪟":dev.os?.includes("Mac")?"🍎":dev.os?.includes("Linux")?"🐧":dev.os?.includes("Android")?"🤖":dev.os?.includes("iOS")||dev.os?.includes("iPad")?"📱":"💻";
                      const brIcon=dev.browser==="Chrome"?"🌐":dev.browser==="Firefox"?"🦊":dev.browser==="Safari"?"🧭":dev.browser==="Edge"?"🔷":"❔";
                      const dtIcon=dev.device_type==="mobile"?"📱":dev.device_type==="tablet"?"📟":"🖥";
                      return (
                        <tr key={d._key||d.userEmail||i} style={{borderBottom:`1px solid ${D.border}`}}
                          onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=D.bg;}}
                          onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="";}}>
                          <td style={{padding:"7px 12px",color:D.blue,fontWeight:600,whiteSpace:"nowrap"}}>{d.userEmail||"—"}</td>
                          <td style={{padding:"7px 12px",whiteSpace:"nowrap"}}>{osIcon} {dev.os||"?"} {dev.os_version||""}</td>
                          <td style={{padding:"7px 12px",whiteSpace:"nowrap"}}>{brIcon} {dev.browser||"?"}</td>
                          <td style={{padding:"7px 12px",whiteSpace:"nowrap"}}>{dtIcon} {dev.device_type||"?"}</td>
                          <td style={{padding:"7px 12px",fontFamily:"monospace",fontSize:11,color:D.textMt,whiteSpace:"nowrap"}}>{dev.screen_w||"?"}×{dev.screen_h||"?"}</td>
                          <td style={{padding:"7px 12px",fontSize:11,color:D.textSub,whiteSpace:"nowrap"}}>{dev.timezone||"—"}</td>
                          <td style={{padding:"7px 12px",fontSize:11,color:D.textMt}}>{dev.language||"—"}</td>
                          <td style={{padding:"7px 12px",textAlign:"center"}}>{dev.touch?"✅":"❌"}</td>
                          <td style={{padding:"7px 12px",color:D.textSub}}>{geo.city||"—"}</td>
                          <td style={{padding:"7px 12px",color:D.textSub}}>{geo.country||"—"}</td>
                          <td style={{padding:"7px 12px",color:D.textMt,whiteSpace:"nowrap",fontSize:11}}>{ago(d.timestamp||d._updated||"")}</td>
                        </tr>
                      );
                    })}
                    {filteredDevices.length===0&&<tr><td colSpan={11} style={{padding:"32px",textAlign:"center",color:D.textMt}}>No device data — users must sign in to populate</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── CACHE ────────────────────────────────────── */}
        {tab==="cache"&&(
          <div>
            <div style={cs({padding:"12px 16px",marginBottom:10,display:"flex",alignItems:"flex-start",gap:10})}>
              <div style={{fontSize:20}}>💾</div>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:D.text,marginBottom:4}}>How Session Cache Works</div>
                <div style={{fontSize:12,color:D.textSub,lineHeight:1.6}}>When a user is silently redirected by RoleGuard, the system saves their last tab, search filter, and scroll position. On return, their state is restored automatically. Admins can inspect or clear cached states below.</div>
              </div>
            </div>
            <div style={cs()}>
              <div style={{padding:"10px 16px",borderBottom:`1px solid ${D.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:13,fontWeight:700,color:D.text}}>Session Cache Entries</span>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <span style={{fontSize:11,color:D.textMt}}>{cacheEntries.length} entries</span>
                  <button onClick={()=>setCacheEntries(getCacheEntries())} style={{padding:"4px 9px",border:`1px solid ${D.borderMd}`,borderRadius:D.radius,fontSize:11,cursor:"pointer",background:"transparent",color:D.text}}>↻ Refresh</button>
                  <button onClick={clearAllCache} style={{padding:"4px 9px",border:`1px solid ${D.danger}`,borderRadius:D.radius,fontSize:11,cursor:"pointer",background:D.dangerLt,color:D.danger,display:"flex",alignItems:"center",gap:4}}>
                    <Trash2 size={10}/> Clear All
                  </button>
                </div>
              </div>
              <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch" as any}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead><tr style={{background:D.bg}}>
                    {["Storage","User / Key","Page / State","Size","Saved","Del"].map(h=>(
                      <th key={h} style={{padding:"7px 12px",textAlign:"left",fontWeight:700,color:D.textSub,fontSize:11,borderBottom:`1px solid ${D.border}`}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {cacheEntries.map(c=>(
                      <tr key={c.key} style={{borderBottom:`1px solid ${D.border}`}}
                        onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=D.bg;}}
                        onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="";}}>
                        <td style={{padding:"7px 12px"}}>
                          <span style={{padding:"1px 6px",borderRadius:3,fontSize:10,fontWeight:700,background:c.key.startsWith("[LS]")?D.warnLt:D.blueLt,color:c.key.startsWith("[LS]")?D.warn:D.blue}}>{c.key.startsWith("[LS]")?"localStorage":"sessionStorage"}</span>
                        </td>
                        <td style={{padding:"7px 12px",fontFamily:"monospace",fontSize:11,color:D.blue}}>{c.userId.slice(0,24)}</td>
                        <td style={{padding:"7px 12px",color:D.textSub}}>{c.page}</td>
                        <td style={{padding:"7px 12px",color:D.textMt,textAlign:"right"}}>{c.size.toLocaleString()} B</td>
                        <td style={{padding:"7px 12px",color:D.textMt,whiteSpace:"nowrap",fontSize:11}}>{c.ts?ago(new Date(c.ts).toISOString()):"—"}</td>
                        <td style={{padding:"7px 12px"}}>
                          <button onClick={()=>clearCacheEntry(c.key)} style={{padding:"2px 7px",background:D.dangerLt,border:`1px solid ${D.danger}`,borderRadius:3,color:D.danger,fontSize:10,cursor:"pointer"}}>✕</button>
                        </td>
                      </tr>
                    ))}
                    {cacheEntries.length===0&&<tr><td colSpan={6} style={{padding:"32px",textAlign:"center",color:D.textMt}}>No cache entries — users have not yet navigated any cached pages</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );
}
