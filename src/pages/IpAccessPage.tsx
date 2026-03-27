/**
 * ProcurBosse — IP Access Control v2.0
 * Admin-only: whitelist management, live access logs, session monitoring
 * Fixed: user names shown (not UUIDs), active-only filter, no logged-out confusion
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSystemSettings, saveSettings } from "@/hooks/useSystemSettings";
import { toast } from "@/hooks/use-toast";
import {
  Shield, Plus, Trash2, RefreshCw, CheckCircle, XCircle,
  Globe, Wifi, Lock, AlertTriangle, Save, Activity,
  UserCheck, Eye, ToggleLeft, ToggleRight, Filter, Users
} from "lucide-react";
import RoleGuard from "@/components/RoleGuard";

const inp: React.CSSProperties = {
  padding:"8px 11px", border:"1.5px solid #d1d5db", borderRadius:8,
  fontSize:13, color:"#111", background:"#fff", outline:"none",
  width:"100%", boxSizing:"border-box" as const
};
const B = (bg="#1a3a6b", p="8px 16px"):React.CSSProperties => ({
  display:"inline-flex", alignItems:"center", gap:6, padding:p,
  borderRadius:8, border:"none", background:bg, color:"#fff",
  fontWeight:700, fontSize:12, cursor:"pointer"
});

function Toggle({ on, onChange }: { on:boolean; onChange:(v:boolean)=>void }) {
  return (
    <button onClick={()=>onChange(!on)} style={{background:"none",border:"none",cursor:"pointer",padding:0,lineHeight:0,flexShrink:0}}>
      <span style={{display:"inline-flex",width:44,height:24,borderRadius:12,background:on?"#059669":"#d1d5db",alignItems:"center",padding:"2px",transition:"background 0.2s"}}>
        <span style={{display:"block",width:20,height:20,borderRadius:"50%",background:"#fff",transition:"transform 0.2s",transform:on?"translateX(20px)":"translateX(0)",boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}/>
      </span>
    </button>
  );
}

export default function IpAccessPage() {
  const { user } = useAuth();
  const { settings, get } = useSystemSettings();
  const [whitelist,  setWhitelist]  = useState<any[]>([]);
  const [logs,       setLogs]       = useState<any[]>([]);
  const [profiles,   setProfiles]   = useState<Record<string,any>>({});
  const [sessions,   setSessions]   = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [tab,        setTab]        = useState<"whitelist"|"logs"|"sessions"|"settings">("whitelist");
  const [logFilter,  setLogFilter]  = useState<"all"|"allowed"|"denied">("all");
  const [form, setForm] = useState({label:"",cidr:"",type:"private",notes:"",active:true});
  const [cfg, setCfg] = useState({
    ip_restriction_enabled:"false", allow_all_private:"true",
    log_all_ips:"true", revoke_on_ip_change:"false", force_network_check:"true",
  });

  const load = useCallback(async() => {
    setLoading(true);
    const [wl, lg, pr] = await Promise.all([
      (supabase as any).from("network_whitelist").select("*").order("active",{ascending:false}).order("created_at"),
      (supabase as any).from("ip_access_log").select("*").order("created_at",{ascending:false}).limit(300),
      (supabase as any).from("profiles").select("id,full_name,email,role,is_active").eq("is_active",true),
    ]);
    setWhitelist(wl.data||[]);
    setLogs(lg.data||[]);
    // Build profile lookup map
    const pm: Record<string,any> = {};
    (pr.data||[]).forEach((p:any) => { pm[p.id] = p; });
    setProfiles(pm);
    setLoading(false);
  },[]);

  useEffect(()=>{ load(); },[load]);
  useEffect(()=>{
    setCfg({
      ip_restriction_enabled: get("ip_restriction_enabled","false"),
      allow_all_private:       get("allow_all_private","true"),
      log_all_ips:             get("log_all_ips","true"),
      revoke_on_ip_change:     get("revoke_on_ip_change","false"),
      force_network_check:     get("force_network_check","true"),
    });
  },[settings,get]);

  // ── Whitelist actions ─────────────────────────────────────────────────────
  async function addEntry() {
    if(!form.label||!form.cidr){toast({title:"Label and CIDR required",variant:"destructive"});return;}
    setSaving(true);
    const {error} = await (supabase as any).from("network_whitelist").insert({
      ...form, active:true,  // always insert as active
      created_by: user?.id,
      created_at: new Date().toISOString()
    });
    if(error){toast({title:"Failed: "+error.message,variant:"destructive"});}
    else{toast({title:`✅ "${form.label}" added and active`});}
    setShowForm(false); setForm({label:"",cidr:"",type:"private",notes:"",active:true});
    await load(); setSaving(false);
  }

  async function toggleEntry(id:string, active:boolean) {
    await (supabase as any).from("network_whitelist").update({active}).eq("id",id);
    setWhitelist(p=>p.map(e=>e.id===id?{...e,active}:e));
    toast({title:active?"✅ Entry enabled — IP now allowed":"⚠️ Entry disabled — IP now blocked"});
  }

  async function removeEntry(id:string, label:string) {
    if(!confirm(`Remove "${label}" from whitelist? This will immediately block any users on this IP range.`)) return;
    await (supabase as any).from("network_whitelist").delete().eq("id",id);
    await load();
    toast({title:`"${label}" removed from whitelist`});
  }

  async function saveSettings2() {
    setSaving(true);
    const res = await saveSettings(cfg);
    if(res.ok) toast({title:"✅ IP settings saved & propagated to all users"});
    else toast({title:"Save failed: "+res.error,variant:"destructive"});
    setSaving(false);
  }

  // ── Resolve user name from UUID ────────────────────────────────────────────
  function resolveUser(log:any): string {
    if(log.user_id && profiles[log.user_id]) {
      return profiles[log.user_id].full_name || profiles[log.user_id].email || log.user_email || "—";
    }
    if(log.user_email) return log.user_email;
    return "Guest / Not logged in";
  }

  function resolveUserRole(log:any): string {
    if(log.user_id && profiles[log.user_id]) return profiles[log.user_id].role || "";
    return "";
  }

  // ── Filter logs ────────────────────────────────────────────────────────────
  const filteredLogs = logs.filter(l=>{
    if(logFilter==="allowed") return l.allowed;
    if(logFilter==="denied") return !l.allowed;
    return true;
  });

  // ── Active sessions: deduplicate logs to get unique live users ─────────────
  const activeSessionMap: Record<string,any> = {};
  logs.filter(l=>l.allowed&&l.user_id).forEach(l=>{
    if(!activeSessionMap[l.user_id]){
      activeSessionMap[l.user_id] = l;
    }
  });
  const activeSessions = Object.values(activeSessionMap);

  const wlActive = whitelist.filter(e=>e.active).length;
  const allowed = logs.filter(l=>l.allowed).length;
  const denied  = logs.filter(l=>!l.allowed).length;

  const TABS = [
    {id:"whitelist", label:"IP Whitelist", icon:Wifi,       badge:wlActive},
    {id:"logs",      label:"Access Logs",  icon:Activity,   badge:logs.length},
    {id:"sessions",  label:"Active Users", icon:UserCheck,  badge:activeSessions.length},
    {id:"settings",  label:"Settings",     icon:Lock,       badge:0},
  ];

  return (
    <RoleGuard allowed={["admin","database_admin"]}>
      <div style={{minHeight:"100vh",background:"#f0f4f8",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>

        {/* ── Header ── */}
        <div style={{background:"linear-gradient(135deg,#0a2558,#1a3a6b)",padding:"18px 24px",color:"#fff",display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:48,height:48,borderRadius:12,background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Shield style={{width:26,height:26,color:"#fff"}}/>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:20,fontWeight:800}}>IP Access Control</div>
            <div style={{fontSize:12,opacity:.8}}>Network whitelist · Live session monitor · IP enforcement</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {[{n:allowed,l:"Allowed",c:"#4ade80"},{n:denied,l:"Denied",c:"#f87171"},{n:wlActive,l:"Active Rules",c:"#93c5fd"},{n:activeSessions.length,l:"Live Users",c:"#fde68a"}].map((k,i)=>(
              <div key={i} style={{textAlign:"center",background:"rgba(255,255,255,0.1)",borderRadius:8,padding:"6px 12px",border:"1px solid rgba(255,255,255,0.15)"}}>
                <div style={{fontSize:18,fontWeight:900,color:k.c}}>{k.n}</div>
                <div style={{fontSize:9,opacity:.7,fontWeight:600}}>{k.l}</div>
              </div>
            ))}
            <button onClick={load} style={B("rgba(255,255,255,0.15)","8px 12px")}><RefreshCw style={{width:14,height:14}}/></button>
          </div>
        </div>

        {/* ── Status banner ── */}
        <div style={{background:cfg.ip_restriction_enabled==="true"?"#dcfce7":"#fef9c3",padding:"10px 24px",display:"flex",alignItems:"center",gap:10,borderBottom:"1px solid",borderColor:cfg.ip_restriction_enabled==="true"?"#86efac":"#fde047"}}>
          {cfg.ip_restriction_enabled==="true"
            ?<CheckCircle style={{width:18,height:18,color:"#16a34a",flexShrink:0}}/>
            :<AlertTriangle style={{width:18,height:18,color:"#d97706",flexShrink:0}}/>}
          <span style={{fontSize:13,fontWeight:700,color:cfg.ip_restriction_enabled==="true"?"#15803d":"#92400e",flex:1}}>
            IP Restriction: {cfg.ip_restriction_enabled==="true"?"ACTIVE — Unauthorized IPs are blocked":"DISABLED — All IPs are currently allowed"}
          </span>
          <button onClick={()=>setCfg(p=>({...p,ip_restriction_enabled:p.ip_restriction_enabled==="true"?"false":"true"}))}
            style={B(cfg.ip_restriction_enabled==="true"?"#dc2626":"#059669","6px 16px")}>
            {cfg.ip_restriction_enabled==="true"?"Disable Restriction":"Enable Restriction"}
          </button>
          <button onClick={saveSettings2} disabled={saving} style={B("#1a3a6b","6px 16px")}>
            <Save style={{width:12,height:12}}/>{saving?"Saving…":"Save"}
          </button>
        </div>

        {/* ── Tabs ── */}
        <div style={{padding:"0 24px",background:"#fff",borderBottom:"1px solid #e5e7eb",display:"flex",gap:0}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id as any)}
              style={{display:"flex",alignItems:"center",gap:7,padding:"12px 18px",border:"none",borderBottom:tab===t.id?"3px solid #1a3a6b":"3px solid transparent",background:"transparent",cursor:"pointer",fontSize:13,fontWeight:tab===t.id?700:500,color:tab===t.id?"#1a3a6b":"#6b7280"}}>
              <t.icon style={{width:14,height:14}}/>
              {t.label}
              {t.badge>0&&<span style={{background:tab===t.id?"#1a3a6b":"#e5e7eb",color:tab===t.id?"#fff":"#374151",borderRadius:10,padding:"1px 7px",fontSize:10,fontWeight:700}}>{t.badge}</span>}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        <div style={{padding:"20px 24px"}}>

          {/* ═══ WHITELIST ═══ */}
          {tab==="whitelist"&&(
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <div>
                  <div style={{fontSize:15,fontWeight:700,color:"#111"}}>{whitelist.length} entries · {wlActive} active</div>
                  <div style={{fontSize:11,color:"#6b7280",marginTop:2}}>All active entries immediately allow matching IPs</div>
                </div>
                <button onClick={()=>setShowForm(true)} style={B()}>
                  <Plus style={{width:14,height:14}}/> Add IP Range
                </button>
              </div>

              {/* Add form */}
              {showForm&&(
                <div style={{background:"#f0f9ff",border:"1.5px solid #0369a1",borderRadius:12,padding:"16px 20px",marginBottom:16}}>
                  <div style={{fontSize:14,fontWeight:700,color:"#0369a1",marginBottom:12}}>+ Add New IP Range</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,marginBottom:12}}>
                    <div>
                      <label style={{display:"block",fontSize:11,fontWeight:600,color:"#374151",marginBottom:4}}>Label *</label>
                      <input value={form.label} onChange={e=>setForm(p=>({...p,label:e.target.value}))} placeholder="e.g. Hospital WiFi" style={inp}/>
                    </div>
                    <div>
                      <label style={{display:"block",fontSize:11,fontWeight:600,color:"#374151",marginBottom:4}}>CIDR Range *</label>
                      <input value={form.cidr} onChange={e=>setForm(p=>({...p,cidr:e.target.value}))} placeholder="e.g. 192.168.1.0/24" style={{...inp,fontFamily:"monospace"}}/>
                    </div>
                    <div>
                      <label style={{display:"block",fontSize:11,fontWeight:600,color:"#374151",marginBottom:4}}>Type</label>
                      <select value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))} style={inp}>
                        <option value="private">Private Network</option>
                        <option value="public">Public IP</option>
                        <option value="vpn">VPN</option>
                        <option value="office">Office</option>
                      </select>
                    </div>
                    <div>
                      <label style={{display:"block",fontSize:11,fontWeight:600,color:"#374151",marginBottom:4}}>Notes</label>
                      <input value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="Optional description" style={inp}/>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <div style={{padding:"6px 12px",borderRadius:8,background:"#dcfce7",border:"1px solid #86efac",fontSize:12,fontWeight:700,color:"#15803d",display:"flex",alignItems:"center",gap:5}}>
                      <CheckCircle style={{width:13,height:13}}/> Will be active immediately
                    </div>
                    <div style={{marginLeft:"auto",display:"flex",gap:8}}>
                      <button onClick={()=>{setShowForm(false);setForm({label:"",cidr:"",type:"private",notes:"",active:true});}} style={{...B("#6b7280"),background:"#fff",color:"#374151",border:"1px solid #d1d5db"}}>Cancel</button>
                      <button onClick={addEntry} disabled={saving} style={B("#059669")}><Plus style={{width:13,height:13}}/>{saving?"Adding…":"Add & Activate"}</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Whitelist entries */}
              {loading?<div style={{textAlign:"center",padding:40,color:"#6b7280"}}>Loading…</div>:(
                <div style={{display:"grid",gap:8}}>
                  {whitelist.length===0&&(
                    <div style={{textAlign:"center",padding:60,color:"#9ca3af"}}>
                      <Shield style={{width:40,height:40,color:"#d1d5db",display:"block",margin:"0 auto 12px"}}/>
                      No whitelist entries yet. Add IP ranges to control access.
                      <br/><button onClick={()=>setShowForm(true)} style={{...B(),display:"inline-flex",marginTop:12}}>Add First Entry</button>
                    </div>
                  )}
                  {whitelist.map(e=>(
                    <div key={e.id} style={{background:"#fff",borderRadius:10,padding:"14px 18px",display:"flex",alignItems:"center",gap:14,border:`1.5px solid ${e.active?"#e5e7eb":"#f3f4f6"}`,opacity:e.active?1:0.55,transition:"all 0.2s"}}>
                      <div style={{width:38,height:38,borderRadius:9,background:e.active?"#dcfce7":"#f1f5f9",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        {e.type==="private"?<Wifi style={{width:18,height:18,color:e.active?"#059669":"#9ca3af"}}/>:<Globe style={{width:18,height:18,color:e.active?"#0369a1":"#9ca3af"}}/>}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontSize:14,fontWeight:700,color:"#111"}}>{e.label}</span>
                          {e.active
                            ?<span style={{padding:"1px 8px",borderRadius:10,background:"#dcfce7",color:"#15803d",fontSize:10,fontWeight:700,border:"1px solid #86efac"}}>● Active</span>
                            :<span style={{padding:"1px 8px",borderRadius:10,background:"#f3f4f6",color:"#6b7280",fontSize:10,fontWeight:700}}>○ Disabled</span>
                          }
                        </div>
                        <div style={{display:"flex",gap:12,marginTop:4,fontSize:12,color:"#6b7280",flexWrap:"wrap" as const}}>
                          <span style={{fontFamily:"monospace",fontWeight:700,color:"#0369a1",fontSize:13}}>{e.cidr}</span>
                          <span style={{padding:"1px 8px",borderRadius:8,background:e.type==="private"?"#e0f2fe":"#fef3c7",color:e.type==="private"?"#0369a1":"#d97706",fontWeight:600,fontSize:11,textTransform:"capitalize" as const}}>{e.type}</span>
                          {e.notes&&<span style={{color:"#9ca3af"}}>{e.notes}</span>}
                        </div>
                      </div>
                      <div style={{display:"flex",gap:10,alignItems:"center",flexShrink:0}}>
                        <Toggle on={e.active} onChange={v=>toggleEntry(e.id,v)}/>
                        <button onClick={()=>removeEntry(e.id,e.label)} style={B("#dc2626","6px 10px")}>
                          <Trash2 style={{width:13,height:13}}/>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ ACCESS LOGS ═══ */}
          {tab==="logs"&&(
            <div>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                <div style={{fontSize:15,fontWeight:700,color:"#111",flex:1}}>Access Log ({filteredLogs.length} records)</div>
                <div style={{display:"flex",gap:4}}>
                  {(["all","allowed","denied"] as const).map(f=>(
                    <button key={f} onClick={()=>setLogFilter(f)}
                      style={{padding:"5px 12px",borderRadius:16,border:`1.5px solid ${logFilter===f?"#1a3a6b":"#e5e7eb"}`,background:logFilter===f?"#1a3a6b":"#fff",color:logFilter===f?"#fff":"#374151",cursor:"pointer",fontSize:11,fontWeight:600,textTransform:"capitalize" as const}}>
                      {f==="all"?`All (${logs.length})`:f==="allowed"?`Allowed (${allowed})`:`Denied (${denied})`}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",overflow:"hidden"}}>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                    <thead>
                      <tr style={{background:"#f8fafc",borderBottom:"2px solid #e5e7eb"}}>
                        {["Time","IP Address","Network","Status","User Name","Role","Reason","Path"].map(h=>(
                          <th key={h} style={{padding:"9px 12px",textAlign:"left" as const,fontSize:10.5,fontWeight:700,color:"#9ca3af",letterSpacing:"0.05em",whiteSpace:"nowrap" as const}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.length===0&&<tr><td colSpan={8} style={{textAlign:"center" as const,padding:40,color:"#9ca3af"}}>No logs match filter</td></tr>}
                      {filteredLogs.map(l=>(
                        <tr key={l.id} style={{borderBottom:"1px solid #f3f4f6",background:l.allowed?"#fff":"#fff5f5"}}
                          onMouseEnter={e=>(e.currentTarget.style.background=l.allowed?"#f0f9ff":"#ffe4e1")}
                          onMouseLeave={e=>(e.currentTarget.style.background=l.allowed?"#fff":"#fff5f5")}>
                          <td style={{padding:"7px 12px",color:"#6b7280",whiteSpace:"nowrap" as const,fontSize:11}}>{new Date(l.created_at).toLocaleString("en-KE",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit",hour12:true})}</td>
                          <td style={{padding:"7px 12px",fontFamily:"monospace",fontWeight:700,color:"#0369a1",fontSize:12}}>{l.ip_address}</td>
                          <td style={{padding:"7px 12px"}}>
                            <span style={{padding:"2px 8px",borderRadius:10,fontSize:10,fontWeight:700,background:l.network==="private"?"#e0f2fe":l.network==="localhost"?"#f0fdf4":"#fef3c7",color:l.network==="private"?"#0369a1":l.network==="localhost"?"#15803d":"#d97706"}}>{l.network||"unknown"}</span>
                          </td>
                          <td style={{padding:"7px 12px"}}>
                            {l.allowed
                              ?<span style={{padding:"2px 9px",borderRadius:10,fontSize:10,fontWeight:700,background:"#dcfce7",color:"#15803d",border:"1px solid #86efac"}}>✓ Allowed</span>
                              :<span style={{padding:"2px 9px",borderRadius:10,fontSize:10,fontWeight:700,background:"#fee2e2",color:"#dc2626",border:"1px solid #fca5a5"}}>✗ Denied</span>
                            }
                          </td>
                          {/* FIXED: Show name, not UUID */}
                          <td style={{padding:"7px 12px",color:l.user_id?"#111":"#9ca3af",fontWeight:l.user_id?600:400,fontSize:12}}>
                            {resolveUser(l)}
                          </td>
                          <td style={{padding:"7px 12px",fontSize:11}}>
                            {resolveUserRole(l)
                              ?<span style={{padding:"1px 7px",borderRadius:8,background:"#f0f9ff",color:"#0369a1",fontSize:10,fontWeight:600,textTransform:"capitalize" as const}}>{resolveUserRole(l).replace("_"," ")}</span>
                              :<span style={{color:"#9ca3af"}}>—</span>
                            }
                          </td>
                          <td style={{padding:"7px 12px",color:"#374151",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const,fontSize:11}} title={l.reason}>{l.reason||"—"}</td>
                          <td style={{padding:"7px 12px",color:"#9ca3af",fontSize:11}}>{l.path||"—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ═══ ACTIVE SESSIONS ═══ */}
          {tab==="sessions"&&(
            <div>
              <div style={{fontSize:15,fontWeight:700,color:"#111",marginBottom:4}}>Active Sessions ({activeSessions.length})</div>
              <div style={{fontSize:11,color:"#6b7280",marginBottom:14}}>Users currently or recently logged in — based on recent allowed IP log entries. Does not include logged-out users.</div>
              <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",overflow:"hidden"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead>
                    <tr style={{background:"#f8fafc",borderBottom:"2px solid #e5e7eb"}}>
                      {["User Name","Role","IP Address","Network","Last Seen","Location"].map(h=>(
                        <th key={h} style={{padding:"10px 14px",textAlign:"left" as const,fontSize:10.5,fontWeight:700,color:"#9ca3af",letterSpacing:"0.05em"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeSessions.length===0&&<tr><td colSpan={6} style={{textAlign:"center" as const,padding:40,color:"#9ca3af"}}>
                      <Users style={{width:32,height:32,color:"#d1d5db",display:"block",margin:"0 auto 8px"}}/>
                      No active sessions found (requires IP restriction to be logging)
                    </td></tr>}
                    {activeSessions.map((s,i)=>{
                      const prof = profiles[s.user_id];
                      return (
                        <tr key={s.user_id} style={{borderBottom:"1px solid #f3f4f6"}}
                          onMouseEnter={e=>(e.currentTarget.style.background="#f0f9ff")}
                          onMouseLeave={e=>(e.currentTarget.style.background="#fff")}>
                          <td style={{padding:"10px 14px",fontWeight:600,color:"#111"}}>{prof?.full_name||s.user_email||"Unknown"}</td>
                          <td style={{padding:"10px 14px"}}>
                            {prof?.role
                              ?<span style={{padding:"2px 9px",borderRadius:10,background:"#e0f2fe",color:"#0369a1",fontSize:11,fontWeight:600,textTransform:"capitalize" as const}}>{prof.role.replace("_"," ")}</span>
                              :<span style={{color:"#9ca3af"}}>—</span>
                            }
                          </td>
                          <td style={{padding:"10px 14px",fontFamily:"monospace",fontWeight:700,color:"#0369a1"}}>{s.ip_address}</td>
                          <td style={{padding:"10px 14px"}}>
                            <span style={{padding:"2px 8px",borderRadius:10,fontSize:10,fontWeight:700,background:s.network==="private"?"#e0f2fe":"#fef3c7",color:s.network==="private"?"#0369a1":"#d97706"}}>{s.network}</span>
                          </td>
                          <td style={{padding:"10px 14px",color:"#6b7280",fontSize:11}}>{new Date(s.created_at).toLocaleString("en-KE",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit",hour12:true})}</td>
                          <td style={{padding:"10px 14px",color:"#374151",fontSize:11}}>{s.path||"—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══ SETTINGS ═══ */}
          {tab==="settings"&&(
            <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",padding:"20px 24px",maxWidth:640}}>
              <div style={{fontWeight:800,fontSize:15,color:"#1a3a6b",marginBottom:16,display:"flex",alignItems:"center",gap:8}}>
                <Lock style={{width:16,height:16}}/> IP Restriction Settings
              </div>
              {[
                {k:"ip_restriction_enabled",l:"Enable IP Restriction",       s:"Block users from unauthorized IP ranges. Disable to allow all IPs."},
                {k:"allow_all_private",      l:"Allow All Private Networks",  s:"Auto-allow 10.x, 192.168.x, 172.16.x. Recommended for hospital LAN."},
                {k:"log_all_ips",            l:"Log All Access Attempts",     s:"Record every check in the access log. Needed for Active Sessions tab."},
                {k:"revoke_on_ip_change",    l:"Revoke Session on IP Change", s:"Force re-login if a user's IP changes mid-session."},
                {k:"force_network_check",    l:"Check on Every Page Load",    s:"Strict mode: verify IP on every page navigation (performance impact)."},
              ].map(f=>(
                <div key={f.k} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 0",borderBottom:"1px solid #f3f4f6",gap:16}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600,color:"#111"}}>{f.l}</div>
                    <div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>{f.s}</div>
                  </div>
                  <Toggle on={cfg[f.k as keyof typeof cfg]==="true"} onChange={v=>setCfg(p=>({...p,[f.k]:v?"true":"false"}))}/>
                </div>
              ))}
              <div style={{marginTop:16,display:"flex",gap:8}}>
                <button onClick={saveSettings2} disabled={saving} style={B()}>
                  <Save style={{width:13,height:13}}/>{saving?"Saving…":"Save & Apply Settings"}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </RoleGuard>
  );
}
