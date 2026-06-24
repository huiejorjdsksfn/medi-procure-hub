/**
 * EL5 MediProcure — Admin Activity Stats v2.0
 * Real-time user activity: logins, audit actions, IP geo, failed attempts,
 * daily trends, top users, module breakdown — all sourced from Supabase.
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { safeFetch } from "@/lib/safeFetch";
import { T } from "@/lib/theme";
import AdminBreadcrumb from "@/components/AdminBreadcrumb";
import {
  Activity, Users as UsersIcon, KeyRound, ShieldAlert, Globe,
  RefreshCw, Printer, Filter, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle, Clock, Download, Eye, LogIn, LogOut, Shield,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts";

const db = supabase as any;
const COLORS = ["#0078d4","#107c10","#d83b01","#8764b8","#0ea5e9","#a4262c","#498205","#6b21a8"];

function dayKey(d: string | Date) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`;
}
function fmtDT(s: string) {
  if (!s) return "—";
  return new Date(s).toLocaleString("en-KE",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});
}

type TabKey = "overview"|"logins"|"audit"|"failures"|"geo";
const TABS: {id:TabKey;label:string;icon:any}[] = [
  {id:"overview", label:"Overview",      icon:Activity},
  {id:"logins",   label:"Login Activity",icon:LogIn},
  {id:"audit",    label:"Audit Events",  icon:Shield},
  {id:"failures", label:"Failed Attempts",icon:AlertTriangle},
  {id:"geo",      label:"IP / Geo",      icon:Globe},
];

export default function AdminActivityPage() {
  const nav = useNavigate();
  const [tab, setTab]         = useState<TabKey>("overview");
  const [loading, setLoading] = useState(true);
  const [days, setDays]       = useState(30);
  const [search, setSearch]   = useState("");

  const [audit,    setAudit]    = useState<any[]>([]);
  const [resets,   setResets]   = useState<any[]>([]);
  const [ips,      setIps]      = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [errors,   setErrors]   = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true); setErrors([]);
    const since = new Date(Date.now() - days*86400_000).toISOString();
    const [a,r,i,p] = await Promise.all([
      safeFetch(()=>db.from("audit_log").select("id,user_id,user_name,action,module,ip_address,created_at").gte("created_at",since).order("created_at",{ascending:false}).limit(1000),{label:"audit_log"}),
      safeFetch(()=>db.from("password_reset_log").select("*").gte("created_at",since).order("created_at",{ascending:false}).limit(500),{label:"password_reset_log"}),
      safeFetch(()=>db.from("ip_access_log").select("id,user_id,ip_address,city,country,success,created_at").gte("created_at",since).order("created_at",{ascending:false}).limit(1000),{label:"ip_access_log"}),
      safeFetch(()=>db.from("profiles").select("id,full_name,email,last_login,last_seen,failed_logins,is_locked,is_active"),{label:"profiles"}),
    ]);
    setAudit(a.data||[]);   if(a.error) setErrors(e=>[...e,`audit_log: ${a.error}`]);
    setResets(r.data||[]);  if(r.error) setErrors(e=>[...e,`resets: ${r.error}`]);
    setIps(i.data||[]);     if(i.error) setErrors(e=>[...e,`ip_log: ${i.error}`]);
    setProfiles(p.data||[]); if(p.error) setErrors(e=>[...e,`profiles: ${p.error}`]);
    setLoading(false);
  },[days]);

  useEffect(()=>{ load(); },[load]);

  /* ─── Derived metrics ───────────────────────────────────────────────── */
  const dailyAudit = useMemo(()=>{
    const m: Record<string,number> = {};
    audit.forEach(a=>{ const k=dayKey(a.created_at); m[k]=(m[k]||0)+1; });
    return Object.entries(m).sort(([a],[b])=>a.localeCompare(b)).slice(-14).map(([date,events])=>({date:date.slice(5),events}));
  },[audit]);

  const dailyLogins = useMemo(()=>{
    const m: Record<string,{ok:number;fail:number}> = {};
    ips.forEach(i=>{ const k=dayKey(i.created_at); if(!m[k])m[k]={ok:0,fail:0}; i.success?m[k].ok++:m[k].fail++; });
    return Object.entries(m).sort(([a],[b])=>a.localeCompare(b)).slice(-14).map(([date,v])=>({date:date.slice(5),...v}));
  },[ips]);

  const moduleBreakdown = useMemo(()=>{
    const m: Record<string,number> = {};
    audit.forEach(a=>{ const mod=a.module||"General"; m[mod]=(m[mod]||0)+1; });
    return Object.entries(m).sort(([,a],[,b])=>b-a).slice(0,8).map(([name,value])=>({name,value}));
  },[audit]);

  const topUsers = useMemo(()=>{
    const m: Record<string,number> = {};
    audit.forEach(a=>{ const u=a.user_name||a.user_id||"Unknown"; m[u]=(m[u]||0)+1; });
    return Object.entries(m).sort(([,a],[,b])=>b-a).slice(0,10).map(([user,count])=>({user:user.slice(0,24),count}));
  },[audit]);

  const geoBreakdown = useMemo(()=>{
    const m: Record<string,number> = {};
    ips.forEach(i=>{ const c=i.country||"Unknown"; m[c]=(m[c]||0)+1; });
    return Object.entries(m).sort(([,a],[,b])=>b-a).slice(0,8).map(([country,count])=>({country,count}));
  },[ips]);

  const failures = ips.filter(i=>!i.success);
  const lockedUsers = profiles.filter(p=>p.is_locked);
  const activeToday = profiles.filter(p=>{ if(!p.last_seen)return false; return Date.now()-new Date(p.last_seen).getTime()<86400000; });
  const recentResets = resets.slice(0,20);

  const filteredAudit = useMemo(()=>
    search ? audit.filter(a=>[a.user_name,a.action,a.module,a.ip_address].some(v=>String(v||"").toLowerCase().includes(search.toLowerCase()))) : audit
  ,[audit,search]);

  const filteredIPs = useMemo(()=>
    search ? ips.filter(i=>[i.ip_address,i.city,i.country].some(v=>String(v||"").toLowerCase().includes(search.toLowerCase()))) : ips
  ,[ips,search]);

  /* ─── KPI tiles ─────────────────────────────────────────────────────── */
  const KPI = [
    {label:"Total Users",       val:profiles.length,        icon:UsersIcon,     col:"#7c3aed"},
    {label:`Active (${days}d)`, val:activeToday.length,     icon:CheckCircle,   col:"#059669"},
    {label:"Locked Accounts",   val:lockedUsers.length,     icon:ShieldAlert,   col:"#dc2626"},
    {label:"Audit Events",      val:audit.length,           icon:Activity,      col:"#0078d4"},
    {label:"Login Attempts",    val:ips.length,             icon:LogIn,         col:"#d97706"},
    {label:"Failed Logins",     val:failures.length,        icon:AlertTriangle, col:"#b91c1c"},
    {label:"Password Resets",   val:resets.length,          icon:KeyRound,      col:"#7c3aed"},
    {label:"IP Locations",      val:geoBreakdown.length,    icon:Globe,         col:"#0891b2"},
  ];

  const S = {
    page:    {background:T.bg,minHeight:"100vh",fontFamily:"'Segoe UI','Inter',sans-serif",color:T.fg},
    card:    {background:"#fff",border:`1px solid ${T.border}`,borderRadius:8,boxShadow:"0 1px 4px rgba(0,0,0,.06)"},
    th:      {padding:"8px 12px",textAlign:"left" as const,fontSize:11,fontWeight:700,color:T.fgMuted,textTransform:"uppercase" as const,letterSpacing:".04em",borderBottom:`1px solid ${T.border}`,background:"#f8f9fa"},
    td:      {padding:"7px 12px",fontSize:12,borderBottom:`1px solid ${T.border}`,color:T.fg},
    tabBtn:  (active:boolean,col:string)=>({display:"flex",alignItems:"center",gap:6,padding:"8px 16px",borderRadius:6,border:"none",background:active?`${col}12`:"transparent",color:active?col:T.fgMuted,fontSize:13,fontWeight:active?700:400,cursor:"pointer",whiteSpace:"nowrap" as const}),
  };

  return (
    <div style={S.page}>
      <AdminBreadcrumb />

      {/* Header */}
      <div style={{background:"#fff",borderBottom:`1px solid ${T.border}`,padding:"16px 24px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",boxShadow:"0 1px 3px rgba(0,0,0,.06)"}}>
        <div style={{width:40,height:40,borderRadius:8,background:"#0078d412",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Activity size={20} color="#0078d4"/>
        </div>
        <div>
          <h1 style={{margin:0,fontSize:18,fontWeight:700}}>Activity Statistics</h1>
          <p style={{margin:0,fontSize:12,color:T.fgMuted}}>Login trends · Audit events · IP geolocation · Security monitoring</p>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <select value={days} onChange={e=>setDays(Number(e.target.value))}
            style={{padding:"6px 10px",border:`1px solid ${T.border}`,borderRadius:6,fontSize:12,color:T.fg,background:"#fff",cursor:"pointer"}}>
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <div style={{position:"relative"}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search events…"
              style={{padding:"6px 10px 6px 28px",border:`1px solid ${T.border}`,borderRadius:6,fontSize:12,color:T.fg,background:"#fff",width:180,outline:"none"}}/>
            <Filter size={12} style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",color:T.fgMuted}}/>
          </div>
          <button onClick={load} disabled={loading}
            style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",background:T.primary,color:"#fff",border:"none",borderRadius:6,fontSize:13,fontWeight:600,cursor:"pointer"}}>
            <RefreshCw size={13} style={{animation:loading?"spin 1s linear infinite":"none"}}/>{loading?"Loading…":"Refresh"}
          </button>
          <button onClick={()=>window.print()}
            style={{display:"flex",alignItems:"center",gap:5,padding:"7px 12px",background:"#f1f5f9",border:`1px solid ${T.border}`,borderRadius:6,fontSize:12,cursor:"pointer",color:T.fgMuted}}>
            <Printer size={13}/>Print
          </button>
        </div>
      </div>

      {/* Error banner */}
      {errors.length>0 && (
        <div style={{background:"#fef2f2",border:"1px solid #fecaca",padding:"8px 24px",display:"flex",gap:8,alignItems:"center"}}>
          <AlertTriangle size={14} color="#dc2626"/>
          <span style={{fontSize:12,color:"#dc2626"}}>{errors.join(" · ")} — showing available data</span>
        </div>
      )}

      {/* KPI Strip */}
      <div style={{display:"flex",gap:8,padding:"16px 24px",overflowX:"auto",background:"#fff",borderBottom:`1px solid ${T.border}`}}>
        {KPI.map(k=>(
          <div key={k.label} style={{flex:"1 1 100px",minWidth:100,padding:"10px 12px",borderRadius:8,border:`1px solid ${T.border}`,background:T.bg,textAlign:"center"}}>
            <k.icon size={18} color={k.col} style={{margin:"0 auto 4px"}}/>
            <div style={{fontSize:20,fontWeight:800,color:k.col}}>{loading?"…":k.val}</div>
            <div style={{fontSize:10,color:T.fgMuted,marginTop:2}}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div style={{background:"#fff",borderBottom:`1px solid ${T.border}`,display:"flex",gap:4,padding:"0 24px",overflowX:"auto"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={S.tabBtn(tab===t.id,"#0078d4")}>
            <t.icon size={13}/>{t.label}
          </button>
        ))}
      </div>

      <div style={{padding:"20px 24px"}}>

        {/* ── TAB: OVERVIEW ─────────────────────────────────────────── */}
        {tab==="overview" && (
          <div style={{display:"grid",gap:16}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <div style={S.card}>
                <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,fontWeight:700,fontSize:13}}>Audit Events — Last 14 Days</div>
                <div style={{padding:"12px"}}>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={dailyAudit}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/>
                      <XAxis dataKey="date" fontSize={10} tick={{fill:T.fgMuted}}/>
                      <YAxis fontSize={10} tick={{fill:T.fgMuted}}/>
                      <Tooltip/>
                      <Area type="monotone" dataKey="events" stroke="#0078d4" fill="#0078d41a" strokeWidth={2}/>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div style={S.card}>
                <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,fontWeight:700,fontSize:13}}>Login Attempts — Last 14 Days</div>
                <div style={{padding:"12px"}}>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={dailyLogins}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/>
                      <XAxis dataKey="date" fontSize={10} tick={{fill:T.fgMuted}}/>
                      <YAxis fontSize={10} tick={{fill:T.fgMuted}}/>
                      <Tooltip/>
                      <Legend wrapperStyle={{fontSize:11}}/>
                      <Bar dataKey="ok"   name="Success" fill="#059669" radius={[3,3,0,0]}/>
                      <Bar dataKey="fail" name="Failed"  fill="#dc2626" radius={[3,3,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div style={S.card}>
                <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,fontWeight:700,fontSize:13}}>Activity by Module</div>
                <div style={{padding:"12px"}}>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={moduleBreakdown} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/>
                      <XAxis type="number" fontSize={10} tick={{fill:T.fgMuted}}/>
                      <YAxis type="category" dataKey="name" fontSize={10} tick={{fill:T.fgMuted}} width={90}/>
                      <Tooltip/>
                      <Bar dataKey="value" fill="#7c3aed" radius={[0,3,3,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div style={S.card}>
                <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,fontWeight:700,fontSize:13}}>Top Active Users</div>
                <div style={{padding:"12px"}}>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={topUsers} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/>
                      <XAxis type="number" fontSize={10} tick={{fill:T.fgMuted}}/>
                      <YAxis type="category" dataKey="user" fontSize={9} tick={{fill:T.fgMuted}} width={110}/>
                      <Tooltip/>
                      <Bar dataKey="count" name="Actions" fill="#0ea5e9" radius={[0,3,3,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Locked accounts alert */}
            {lockedUsers.length>0 && (
              <div style={{...S.card,borderLeft:"4px solid #dc2626",padding:"14px 18px"}}>
                <div style={{fontWeight:700,color:"#dc2626",fontSize:13,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
                  <ShieldAlert size={15}/> {lockedUsers.length} Locked Account{lockedUsers.length!==1?"s":""} — Requires Review
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                  {lockedUsers.map((u:any)=>(
                    <div key={u.id} onClick={()=>nav("/users")} style={{padding:"4px 12px",borderRadius:6,background:"#fee2e2",border:"1px solid #fecaca",color:"#dc2626",fontSize:12,fontWeight:600,cursor:"pointer"}}>
                      {u.full_name||u.email||"Unknown User"}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: LOGINS ───────────────────────────────────────────── */}
        {tab==="logins" && (
          <div style={{...S.card,overflow:"hidden"}}>
            <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,fontWeight:700,fontSize:13,display:"flex",justifyContent:"space-between"}}>
              <span>Login Access Log ({filteredIPs.length} records)</span>
              <span style={{fontSize:11,color:T.fgMuted}}>{days}-day window</span>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>
                  {["Date/Time","User","IP Address","City","Country","Status"].map(h=>(
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {filteredIPs.slice(0,100).map((r:any,i:number)=>(
                    <tr key={r.id||i} style={{background:i%2===0?"#fff":"#fafafa"}}>
                      <td style={S.td}>{fmtDT(r.created_at)}</td>
                      <td style={S.td}>{r.user_email||r.user_name||"Anonymous"}</td>
                      <td style={{...S.td,fontFamily:"monospace",fontSize:11}}>{r.ip_address||"—"}</td>
                      <td style={S.td}>{r.city||"—"}</td>
                      <td style={S.td}>{r.country||"—"}</td>
                      <td style={S.td}>
                        <span style={{padding:"2px 8px",borderRadius:99,fontSize:10,fontWeight:700,background:r.success?"#d1fae5":"#fee2e2",color:r.success?"#059669":"#dc2626"}}>
                          {r.success?"SUCCESS":"FAILED"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredIPs.length===0&&<tr><td colSpan={6} style={{padding:24,textAlign:"center",color:T.fgMuted}}>No login records in this period</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB: AUDIT ────────────────────────────────────────────── */}
        {tab==="audit" && (
          <div style={{...S.card,overflow:"hidden"}}>
            <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,fontWeight:700,fontSize:13,display:"flex",justifyContent:"space-between"}}>
              <span>Audit Event Log ({filteredAudit.length} events)</span>
              <button onClick={()=>nav("/audit-log")} style={{fontSize:11,color:T.primary,background:"none",border:"none",cursor:"pointer",fontWeight:600}}>Full Audit Log →</button>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>
                  {["Date/Time","User","Action","Module","IP Address"].map(h=>(
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {filteredAudit.slice(0,100).map((r:any,i:number)=>(
                    <tr key={r.id||i} style={{background:i%2===0?"#fff":"#fafafa"}}>
                      <td style={S.td}>{fmtDT(r.created_at)}</td>
                      <td style={S.td}>{r.user_name||r.user_email||"System"}</td>
                      <td style={S.td}>{r.action||"—"}</td>
                      <td style={S.td}><span style={{padding:"2px 6px",borderRadius:4,background:"#e0f2fe",color:"#0369a1",fontSize:10,fontWeight:600}}>{r.module||"general"}</span></td>
                      <td style={{...S.td,fontFamily:"monospace",fontSize:11}}>{r.ip_address||"—"}</td>
                    </tr>
                  ))}
                  {filteredAudit.length===0&&<tr><td colSpan={5} style={{padding:24,textAlign:"center",color:T.fgMuted}}>No audit events in this period</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB: FAILURES ─────────────────────────────────────────── */}
        {tab==="failures" && (
          <div style={{display:"grid",gap:16}}>
            {failures.length>0&&(
              <div style={{...S.card,borderLeft:"4px solid #dc2626",padding:"14px 18px",display:"flex",alignItems:"center",gap:12}}>
                <AlertTriangle size={22} color="#dc2626"/>
                <div>
                  <div style={{fontWeight:700,color:"#dc2626",fontSize:14}}>{failures.length} Failed Login Attempt{failures.length!==1?"s":""} in the last {days} days</div>
                  <div style={{fontSize:12,color:T.fgMuted,marginTop:2}}>Investigate suspicious patterns and block bad IPs in IP Access Control</div>
                </div>
                <button onClick={()=>nav("/admin/users-ip-audit")} style={{marginLeft:"auto",padding:"7px 14px",background:"#dc2626",color:"#fff",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer"}}>Manage IP Rules →</button>
              </div>
            )}
            <div style={S.card}>
              <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,fontWeight:700,fontSize:13}}>Failed Login Attempts</div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr>
                    {["Date/Time","User","IP Address","City","Country"].map(h=>(
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {failures.slice(0,100).map((r:any,i:number)=>(
                      <tr key={r.id||i} style={{background:"#fff5f5"}}>
                        <td style={S.td}>{fmtDT(r.created_at)}</td>
                        <td style={S.td}>{r.user_email||r.user_name||"Anonymous"}</td>
                        <td style={{...S.td,fontFamily:"monospace",fontSize:11,color:"#dc2626"}}>{r.ip_address||"—"}</td>
                        <td style={S.td}>{r.city||"—"}</td>
                        <td style={S.td}>{r.country||"—"}</td>
                      </tr>
                    ))}
                    {failures.length===0&&<tr><td colSpan={5} style={{padding:24,textAlign:"center",color:"#059669"}}>✓ No failed logins in this period</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
            <div style={S.card}>
              <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,fontWeight:700,fontSize:13}}>Password Reset Log</div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr>
                    {["Date/Time","User","Method","IP Address"].map(h=>(
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {recentResets.map((r:any,i:number)=>(
                      <tr key={r.id||i} style={{background:i%2===0?"#fff":"#fafafa"}}>
                        <td style={S.td}>{fmtDT(r.created_at)}</td>
                        <td style={S.td}>{r.user_email||r.email||r.user_id||"—"}</td>
                        <td style={S.td}>{r.method||r.reset_type||"—"}</td>
                        <td style={{...S.td,fontFamily:"monospace",fontSize:11}}>{r.ip_address||"—"}</td>
                      </tr>
                    ))}
                    {recentResets.length===0&&<tr><td colSpan={4} style={{padding:24,textAlign:"center",color:T.fgMuted}}>No password reset events</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: GEO ──────────────────────────────────────────────── */}
        {tab==="geo" && (
          <div style={{display:"grid",gap:16}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <div style={S.card}>
                <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,fontWeight:700,fontSize:13}}>Access by Country</div>
                <div style={{padding:"12px"}}>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={geoBreakdown} cx="50%" cy="50%" outerRadius={90} dataKey="count" nameKey="country" label={({country,percent})=>`${country} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                        {geoBreakdown.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                      </Pie>
                      <Tooltip/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div style={S.card}>
                <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,fontWeight:700,fontSize:13}}>Country Breakdown Table</div>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr>
                    {["Country","Attempts","% of Total"].map(h=><th key={h} style={S.th}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {geoBreakdown.map((g,i)=>(
                      <tr key={i} style={{background:i%2===0?"#fff":"#fafafa"}}>
                        <td style={S.td}>{g.country}</td>
                        <td style={S.td}>{g.count}</td>
                        <td style={S.td}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <div style={{flex:1,height:6,background:"#e2e8f0",borderRadius:99}}>
                              <div style={{height:6,background:COLORS[i%COLORS.length],borderRadius:99,width:`${Math.round((g.count/Math.max(ips.length,1))*100)}%`}}/>
                            </div>
                            <span style={{fontSize:11,fontWeight:600,minWidth:32}}>{Math.round((g.count/Math.max(ips.length,1))*100)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {geoBreakdown.length===0&&<tr><td colSpan={3} style={{padding:24,textAlign:"center",color:T.fgMuted}}>No geo data</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
