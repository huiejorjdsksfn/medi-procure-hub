/**
 * EL5 MediProcure  -- Telephony & Call Center
 * Softphone * IVR Editor * Call Queue * Extensions * Voicemail * Call History
 * ProcurBosse * Embu Level 5 Hospital
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtime } from "@/hooks/useRealtime";
import { TelephonyAPI, PhoneCall, PhoneExtension, IVRMenu, CallQueue, Voicemail } from "@/lib/api/TelephonyAPI";
import { useAuth } from "@/contexts/AuthContext";
import { Phone, PhoneCall as PhoneCallIcon, PhoneOff, PhoneMissed, Volume2, VolumeX, Mic, MicOff, RefreshCw, Plus, X, Edit2, Trash2, ChevronDown } from "lucide-react";

const db = supabase as any;

type Tab = "softphone"|"history"|"extensions"|"ivr"|"queues"|"voicemail"|"metrics";

const STATUS_C: Record<string,string> = { connected:"#22c55e", ringing:"#f97316", completed:"#6b7280", missed:"#ef4444", failed:"#ef4444", transferred:"#3b82f6", voicemail:"#8b5cf6" };
const EXT_STATUS_C: Record<string,string> = { available:"#22c55e", busy:"#ef4444", offline:"#9ca3af", dnd:"#f97316", ringing:"#3b82f6" };
const fmt = (s?:number) => !s ? "0:00" : `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
const fmtDate = (s:string) => new Date(s).toLocaleString("en-KE",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit",hour12:true});
const card: React.CSSProperties = { background:"#fff", borderRadius:12, border:"1px solid #f1f5f9", padding:"20px 24px", boxShadow:"0 2px 8px rgba(0,0,0,0.05)" };
const inp: React.CSSProperties = { width:"100%", padding:"9px 12px", border:"1.5px solid #e5e7eb", borderRadius:8, fontSize:13, outline:"none", boxSizing:"border-box", color:"#374151" };
const btn = (bg:string,disabled=false):React.CSSProperties => ({ padding:"9px 18px", background:disabled?"#9ca3af":bg, color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:700, cursor:disabled?"not-allowed":"pointer" });

function Chip({label,color}:{label:string;color:string}) {
  return <span style={{padding:"2px 10px",borderRadius:12,fontSize:10,fontWeight:700,background:color+"18",color,border:`1px solid ${color}33`,textTransform:"uppercase"}}>{label}</span>;
}

export default function TelephonyPage() {
  const { roles } = useAuth();
  const [tab, setTab] = useState<Tab>("softphone");
  const [calls, setCalls] = useState<PhoneCall[]>([]);
  const [extensions, setExtensions] = useState<PhoneExtension[]>([]);
  const [menus, setMenus] = useState<IVRMenu[]>([]);
  const [queues, setQueues] = useState<CallQueue[]>([]);
  const [voicemails, setVoicemails] = useState<Voicemail[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dialNum, setDialNum] = useState("");
  const [fromExt, setFromExt] = useState("100");
  const [activeCall, setActiveCall] = useState<PhoneCall|null>(null);
  const [callTimer, setCallTimer] = useState(0);
  const [muted, setMuted] = useState(false);
  const [onHold, setOnHold] = useState(false);
  const [localToast, setLocalToast] = useState("");
  const [showIVREdit, setShowIVREdit] = useState<IVRMenu|null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const isAdmin = roles.includes("admin");

  const showToast = (msg:string) => { setLocalToast(msg); setTimeout(()=>setLocalToast(""),3000); };

  const loadAll = useCallback(async()=>{
    setLoading(true);
    try {
      const [data, m] = await Promise.all([TelephonyAPI.loadAll(), TelephonyAPI.getCallMetrics(7)]);
      setCalls(data.calls); setExtensions(data.extensions);
      setMenus(data.menus); setQueues(data.queues); setVoicemails(data.voicemails); setMetrics(m);
    } catch(e: any) {
      console.warn('[Telephony] load error:', e?.message);
    } finally {
      setLoading(false);
    }
  },[]);

  useEffect(()=>{ loadAll(); },[loadAll]);

  useEffect(()=>{
    const ch = db.channel("telephony_rt")
      .on("postgres_changes",{event:"*",schema:"public",table:"phone_calls"},loadAll)
      .on("postgres_changes",{event:"*",schema:"public",table:"phone_extensions"},loadAll)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"voicemails"},loadAll)
      .subscribe();
    return ()=>db.removeChannel(ch);
  },[loadAll]);

  // Call timer
  useEffect(()=>{
    if (activeCall && activeCall.status==="connected") {
      timerRef.current = setInterval(()=>setCallTimer(t=>t+1),1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setCallTimer(0);
    }
    return ()=>{ if(timerRef.current) clearInterval(timerRef.current); };
  },[activeCall]);

  async function makeCall() {
    if (!dialNum.trim()) { showToast("[!] Enter a number or extension"); return; }
    const call = await TelephonyAPI.makeCall(fromExt, dialNum);
    setActiveCall(call);
    showToast(` Calling ${dialNum}...`);
    // Simulate answer after 2s for demo
    setTimeout(async()=>{
      await TelephonyAPI.answerCall(call.id);
      setActiveCall(prev=>prev?{...prev,status:"connected"}:prev);
    },2000);
  }

  async function endCall() {
    if (!activeCall) return;
    await TelephonyAPI.endCall(activeCall.id, callTimer);
    setActiveCall(null); setMuted(false); setOnHold(false);
    showToast(" Call ended"); loadAll();
  }

  const TABS = [
    {id:"softphone" as Tab, label:"Softphone", icon:""},
    {id:"history" as Tab, label:"Call History", icon:""},
    {id:"extensions" as Tab, label:"Extensions", icon:""},
    {id:"ivr" as Tab, label:"IVR Editor", icon:"", adminOnly:true},
    {id:"queues" as Tab, label:"Call Queues", icon:"", adminOnly:true},
    {id:"voicemail" as Tab, label:"Voicemail", icon:""},
    {id:"metrics" as Tab, label:"Metrics", icon:""},
  ].filter(t=>!t.adminOnly||isAdmin);

  return (
    <div style={{padding:"20px 24px",fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",maxWidth:1400,margin:"0 auto"}}>
      {localToast&&<div style={{position:"fixed",top:20,right:20,background:"#1e293b",color:"#fff",padding:"12px 20px",borderRadius:10,fontSize:13,fontWeight:600,zIndex:9999,boxShadow:"0 8px 24px rgba(0,0,0,0.3)"}}>{localToast}</div>}

      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:44,height:44,borderRadius:12,background:"linear-gradient(135deg,#7c3aed,#6d28d9)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}></div>
          <div>
            <h1 style={{margin:0,fontSize:22,fontWeight:800,color:"#0f172a"}}>Telephony & Call Center</h1>
            <div style={{fontSize:12,color:"#6b7280",marginTop:2}}>Communications & Telephony</div>
          </div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div style={{padding:"5px 12px",borderRadius:20,background:"#f0fdf4",border:"1px solid #bbf7d0",fontSize:11,fontWeight:700,color:"#059669"}}> Twilio Active</div>
          {voicemails.length>0&&<div style={{padding:"5px 12px",borderRadius:20,background:"#fef3c7",border:"1px solid #fde68a",fontSize:11,fontWeight:700,color:"#d97706"}}> {voicemails.length} Voicemail{voicemails.length>1?"s":""}</div>}
          <button onClick={loadAll} style={{...btn("#64748b"),padding:"7px 14px"}}><RefreshCw style={{width:12,height:12,display:"inline",marginRight:4}}/>Refresh</button>
        </div>
      </div>

      {/* KPI row */}
      {metrics&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12,marginBottom:20}}>
        {[
          {label:"Total Calls (7d)",value:metrics.total,color:"#3b82f6",icon:""},
          {label:"Answered",value:metrics.answered,color:"#22c55e",icon:"[OK]"},
          {label:"Missed",value:metrics.missed,color:"#ef4444",icon:""},
          {label:"Inbound",value:metrics.inbound,color:"#7c3aed",icon:""},
          {label:"Outbound",value:metrics.outbound,color:"#f97316",icon:""},
          {label:"Avg Duration",value:fmt(Math.round(metrics.avgDuration)),color:"#06b6d4",icon:""},
        ].map((k,i)=>(
          <div key={i} style={{...card,padding:"14px 16px",borderLeft:`4px solid ${k.color}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:22,fontWeight:800,color:"#0f172a"}}>{loading?"...":k.value}</div>
              <span style={{fontSize:20}}>{k.icon}</span>
            </div>
            <div style={{fontSize:11,color:"#9ca3af",marginTop:3}}>{k.label}</div>
          </div>
        ))}
      </div>}

      {/* Tabs */}
      <div style={{display:"flex",gap:4,marginBottom:20,borderBottom:"2px solid #f1f5f9",overflowX:"auto",flexWrap:"nowrap"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            padding:"9px 16px",borderRadius:"8px 8px 0 0",fontSize:12.5,fontWeight:tab===t.id?700:500,cursor:"pointer",whiteSpace:"nowrap",
            background:tab===t.id?"#7c3aed":"transparent",color:tab===t.id?"#fff":"#6b7280",
            border:tab===t.id?"1.5px solid #7c3aed":"1.5px solid transparent",
            boxShadow:tab===t.id?"0 4px 12px #7c3aed30":"none",
          }}>
            {t.icon} {t.label}
            {t.id==="voicemail"&&voicemails.length>0&&<span style={{marginLeft:6,background:"#ef4444",color:"#fff",borderRadius:10,padding:"0 5px",fontSize:10}}>{voicemails.length}</span>}
          </button>
        ))}
      </div>

      {/* -- SOFTPHONE -- */}
      {tab==="softphone"&&(
        <div style={{display:"grid",gridTemplateColumns:"340px 1fr",gap:20}}>
          <div style={card}>
            <div style={{fontWeight:800,fontSize:16,color:"#0f172a",marginBottom:20,textAlign:"center"}}>
              {activeCall ? (activeCall.status==="connected"?" On Call":" Calling...") : " Softphone"}
            </div>

            {activeCall ? (
              <div style={{textAlign:"center"}}>
                {/* Active call UI */}
                <div style={{width:80,height:80,borderRadius:"50%",background:`linear-gradient(135deg,${activeCall.status==="connected"?"#22c55e":"#f97316"},${activeCall.status==="connected"?"#16a34a":"#ea580c"})`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",fontSize:36,boxShadow:"0 8px 24px rgba(0,0,0,0.2)",animation:activeCall.status==="ringing"?"pulse 1s infinite":undefined}}>
                  
                </div>
                <div style={{fontSize:18,fontWeight:700,color:"#0f172a",marginBottom:4}}>{activeCall.callee_extension||dialNum}</div>
                <div style={{fontSize:28,fontWeight:800,color:activeCall.status==="connected"?"#22c55e":"#f97316",fontFamily:"monospace",marginBottom:20}}>
                  {activeCall.status==="connected"?fmt(callTimer):"Connecting..."}
                </div>
                <div style={{display:"flex",gap:12,justifyContent:"center",marginBottom:16}}>
                  <button onClick={()=>setMuted(m=>!m)} style={{width:52,height:52,borderRadius:"50%",border:"none",background:muted?"#ef4444":"#f1f5f9",cursor:"pointer",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {muted?"":""}
                  </button>
                  <button onClick={()=>setOnHold(h=>!h)} style={{width:52,height:52,borderRadius:"50%",border:"none",background:onHold?"#f97316":"#f1f5f9",cursor:"pointer",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {onHold?"":""}
                  </button>
                  <button onClick={endCall} style={{width:64,height:64,borderRadius:"50%",border:"none",background:"#ef4444",cursor:"pointer",fontSize:24,boxShadow:"0 4px 16px rgba(239,68,68,0.4)"}}>
                    
                  </button>
                </div>
                <div style={{fontSize:12,color:"#9ca3af"}}>{muted&&" Muted * "}{onHold&&" On Hold * "}From ext. {fromExt}</div>
              </div>
            ) : (
              <>
                {/* Dialpad */}
                <div style={{marginBottom:14}}>
                  <label style={{fontSize:11,fontWeight:700,color:"#374151",display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.05em"}}>From Extension</label>
                  <select value={fromExt} onChange={e=>setFromExt(e.target.value)} style={inp}>
                    {extensions.filter(e=>e.status!=="offline").map(e=>(
                      <option key={e.id} value={e.extension_number}>{e.extension_number}  -- {e.display_name}</option>
                    ))}
                  </select>
                </div>
                <div style={{marginBottom:14}}>
                  <label style={{fontSize:11,fontWeight:700,color:"#374151",display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.05em"}}>Dial Number / Extension</label>
                  <input value={dialNum} onChange={e=>setDialNum(e.target.value)} onKeyDown={e=>e.key==="Enter"&&makeCall()} style={{...inp,fontSize:18,fontFamily:"monospace",letterSpacing:"0.08em",textAlign:"center"}} placeholder="100, +254..."/>
                </div>
                {/* Dialpad grid */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16}}>
                  {["1","2","3","4","5","6","7","8","9","*","0","#"].map(k=>(
                    <button key={k} onClick={()=>setDialNum(d=>d+k)} style={{padding:"14px",borderRadius:10,border:"1.5px solid #e5e7eb",background:"#f8fafc",cursor:"pointer",fontSize:18,fontWeight:700,color:"#374151",fontFamily:"monospace",transition:"all 0.1s"}}
                      onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f1f5f9"}
                      onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="#f8fafc"}>
                      {k}
                    </button>
                  ))}
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={makeCall} disabled={!dialNum} style={{...btn(!dialNum?"#9ca3af":"#22c55e"),flex:1,fontSize:16,padding:"13px",borderRadius:10}}>
                     Call
                  </button>
                  <button onClick={()=>setDialNum(d=>d.slice(0,-1))} style={{padding:"13px 16px",background:"#f1f5f9",border:"1.5px solid #e2e8f0",borderRadius:10,cursor:"pointer",fontSize:18}}>
                    
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Extension Status Panel */}
          <div style={card}>
            <div style={{fontWeight:700,fontSize:15,color:"#0f172a",marginBottom:16}}> Extension Status Board</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10}}>
              {extensions.map(ext=>(
                <div key={ext.id} style={{padding:"12px 14px",borderRadius:10,border:`1.5px solid ${EXT_STATUS_C[ext.status]||"#e5e7eb"}20`,background:`${EXT_STATUS_C[ext.status]||"#9ca3af"}08`,transition:"all 0.2s"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div>
                      <div style={{fontFamily:"monospace",fontWeight:800,fontSize:18,color:"#0f172a"}}>{ext.extension_number}</div>
                      <div style={{fontSize:13,fontWeight:600,color:"#374151",marginTop:2}}>{ext.display_name}</div>
                      <div style={{fontSize:11,color:"#9ca3af",marginTop:1}}>{ext.department||" --"}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <Chip label={ext.status} color={EXT_STATUS_C[ext.status]||"#9ca3af"}/>
                      {ext.voicemail_enabled&&<div style={{fontSize:10,color:"#9ca3af",marginTop:4}}> VM</div>}
                    </div>
                  </div>
                  <button onClick={()=>{setDialNum(ext.extension_number);setTab("softphone");}} style={{marginTop:8,width:"100%",padding:"5px",background:`${EXT_STATUS_C[ext.status]||"#9ca3af"}15`,border:`1px solid ${EXT_STATUS_C[ext.status]||"#9ca3af"}30`,borderRadius:6,cursor:ext.status==="available"?"pointer":"not-allowed",fontSize:11,fontWeight:600,color:EXT_STATUS_C[ext.status]||"#9ca3af"}} disabled={ext.status!=="available"}>
                    {ext.status==="available"?" Call":" -- Unavailable  --"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* -- CALL HISTORY -- */}
      {tab==="history"&&(
        <div style={card}>
          <div style={{fontWeight:700,fontSize:16,color:"#0f172a",marginBottom:16}}> Call History</div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr style={{background:"#f8fafc"}}>
                {["Dir","Caller","Callee","Department","Start","Duration","Status","Notes"].map(h=>(
                  <th key={h} style={{fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.06em",padding:"10px 14px",borderBottom:"2px solid #f1f5f9",textAlign:"left"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {loading?<tr><td colSpan={8} style={{textAlign:"center",padding:"32px",color:"#9ca3af"}}>Loading...</td></tr>:
                calls.map(c=>(
                  <tr key={c.id} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f8fafc"} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=""}>
                    <td style={{padding:"10px 14px",borderBottom:"1px solid #f8fafc",fontSize:16}}>{c.direction==="outbound"?"":c.direction==="internal"?"":""}</td>
                    <td style={{padding:"10px 14px",borderBottom:"1px solid #f8fafc",fontSize:13,fontWeight:600,color:"#0f172a"}}>{c.caller_name||c.caller_extension||" --"}</td>
                    <td style={{padding:"10px 14px",borderBottom:"1px solid #f8fafc",fontSize:13,color:"#374151"}}>{c.callee_name||c.callee_extension||" --"}</td>
                    <td style={{padding:"10px 14px",borderBottom:"1px solid #f8fafc",fontSize:12,color:"#6b7280"}}>{c.department||" --"}</td>
                    <td style={{padding:"10px 14px",borderBottom:"1px solid #f8fafc",fontSize:11,color:"#9ca3af"}}>{fmtDate(c.start_time)}</td>
                    <td style={{padding:"10px 14px",borderBottom:"1px solid #f8fafc",fontFamily:"monospace",fontSize:12,color:"#374151"}}>{fmt(c.duration_seconds)}</td>
                    <td style={{padding:"10px 14px",borderBottom:"1px solid #f8fafc"}}><Chip label={c.status} color={STATUS_C[c.status]||"#6b7280"}/></td>
                    <td style={{padding:"10px 14px",borderBottom:"1px solid #f8fafc",fontSize:12,color:"#6b7280",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.notes||" --"}</td>
                  </tr>
                ))}
                {!loading&&calls.length===0&&<tr><td colSpan={8} style={{textAlign:"center",padding:"40px",color:"#9ca3af"}}>No call records yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -- EXTENSIONS -- */}
      {tab==="extensions"&&(
        <div style={card}>
          <div style={{fontWeight:700,fontSize:16,color:"#0f172a",marginBottom:16}}> PBX Extensions</div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr style={{background:"#f8fafc"}}>
                {["Ext","Name","Department","Status","Forward To","Voicemail","Actions"].map(h=>(
                  <th key={h} style={{fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.06em",padding:"10px 14px",borderBottom:"2px solid #f1f5f9",textAlign:"left"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {extensions.map(e=>(
                  <tr key={e.id} onMouseEnter={ev=>(ev.currentTarget as HTMLElement).style.background="#f8fafc"} onMouseLeave={ev=>(ev.currentTarget as HTMLElement).style.background=""}>
                    <td style={{padding:"10px 14px",borderBottom:"1px solid #f8fafc",fontFamily:"monospace",fontWeight:800,fontSize:16,color:"#7c3aed"}}>{e.extension_number}</td>
                    <td style={{padding:"10px 14px",borderBottom:"1px solid #f8fafc",fontSize:13,fontWeight:600,color:"#0f172a"}}>{e.display_name}</td>
                    <td style={{padding:"10px 14px",borderBottom:"1px solid #f8fafc",fontSize:12,color:"#374151"}}>{e.department||" --"}</td>
                    <td style={{padding:"10px 14px",borderBottom:"1px solid #f8fafc"}}><Chip label={e.status} color={EXT_STATUS_C[e.status]||"#9ca3af"}/></td>
                    <td style={{padding:"10px 14px",borderBottom:"1px solid #f8fafc",fontSize:12,color:"#6b7280",fontFamily:"monospace"}}>{e.forward_to||" --"}</td>
                    <td style={{padding:"10px 14px",borderBottom:"1px solid #f8fafc",fontSize:16}}>{e.voicemail_enabled?"[OK]":"[X]"}</td>
                    <td style={{padding:"10px 14px",borderBottom:"1px solid #f8fafc"}}>
                      {isAdmin&&(
                        <select defaultValue={e.status} onChange={async ev=>{await TelephonyAPI.updateExtensionStatus(e.id,ev.target.value);loadAll();}} style={{padding:"4px 8px",border:"1.5px solid #e5e7eb",borderRadius:6,fontSize:11,cursor:"pointer"}}>
                          {["available","busy","offline","dnd"].map(s=><option key={s} value={s}>{s}</option>)}
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -- IVR EDITOR -- */}
      {tab==="ivr"&&isAdmin&&(
        <div style={{display:"grid",gridTemplateColumns:"280px 1fr",gap:20}}>
          <div style={card}>
            <div style={{fontWeight:700,fontSize:14,color:"#0f172a",marginBottom:14}}> IVR Menus</div>
            {menus.map(m=>(
              <button key={m.id} onClick={()=>setShowIVREdit(m)} style={{display:"block",width:"100%",padding:"10px 14px",marginBottom:6,textAlign:"left",borderRadius:8,border:`1.5px solid ${showIVREdit?.id===m.id?"#7c3aed":"#e5e7eb"}`,background:showIVREdit?.id===m.id?"#7c3aed10":"#f8fafc",cursor:"pointer",fontSize:13,fontWeight:showIVREdit?.id===m.id?700:500,color:showIVREdit?.id===m.id?"#7c3aed":"#374151"}}>
                 {m.name}
                <div style={{fontSize:10,color:"#9ca3af",marginTop:2}}>{m.menu_key}</div>
              </button>
            ))}
          </div>
          <div style={card}>
            {showIVREdit ? (
              <>
                <div style={{fontWeight:700,fontSize:15,color:"#0f172a",marginBottom:16}}>Edit: {showIVREdit.name}</div>
                <div style={{marginBottom:12}}>
                  <label style={{fontSize:11,fontWeight:700,color:"#374151",display:"block",marginBottom:5,textTransform:"uppercase"}}>Greeting Text</label>
                  <textarea value={showIVREdit.greeting_text} onChange={e=>setShowIVREdit(m=>m?{...m,greeting_text:e.target.value}:m)} style={{...inp,height:100,resize:"vertical"}}/>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
                  <div><label style={{fontSize:11,fontWeight:700,color:"#374151",display:"block",marginBottom:5,textTransform:"uppercase"}}>Timeout (ms)</label><input type="number" value={showIVREdit.timeout_ms} onChange={e=>setShowIVREdit(m=>m?{...m,timeout_ms:+e.target.value}:m)} style={inp}/></div>
                  <div><label style={{fontSize:11,fontWeight:700,color:"#374151",display:"block",marginBottom:5,textTransform:"uppercase"}}>Max Retries</label><input type="number" value={showIVREdit.max_retries} onChange={e=>setShowIVREdit(m=>m?{...m,max_retries:+e.target.value}:m)} style={inp}/></div>
                </div>
                <div style={{display:"flex",gap:10,marginTop:16}}>
                  <button onClick={async()=>{await TelephonyAPI.saveIVRMenu(showIVREdit);showToast("[OK] IVR menu saved!");loadAll();}} style={btn("linear-gradient(135deg,#7c3aed,#6d28d9)")}> Save Menu</button>
                  <button onClick={()=>setShowIVREdit(null)} style={{padding:"9px 16px",background:"#f1f5f9",border:"1.5px solid #e2e8f0",borderRadius:8,cursor:"pointer",fontSize:13}}>Cancel</button>
                </div>
              </>
            ) : (
              <div style={{textAlign:"center",padding:"48px 24px",color:"#9ca3af"}}>
                <div style={{fontSize:36,marginBottom:12}}></div>
                <div>Select an IVR menu to edit</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* -- VOICEMAIL -- */}
      {tab==="voicemail"&&(
        <div style={card}>
          <div style={{fontWeight:700,fontSize:16,color:"#0f172a",marginBottom:16}}> Voicemail Inbox</div>
          {voicemails.length===0 ? (
            <div style={{textAlign:"center",padding:"48px",color:"#9ca3af"}}>
              <div style={{fontSize:40,marginBottom:12}}></div>
              <div>No new voicemails</div>
            </div>
          ) : voicemails.map(vm=>(
            <div key={vm.id} style={{padding:"14px 16px",borderRadius:10,border:"1.5px solid #e2e8f0",marginBottom:10,background:"#fafcff"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <div style={{fontWeight:700,fontSize:13,color:"#0f172a"}}>{vm.from_name||vm.from_number||"Unknown"}</div>
                  <div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>Ext. {vm.for_extension} * {fmtDate(vm.received_at)} * {fmt(vm.duration_seconds)}</div>
                  {vm.transcript&&<div style={{fontSize:12,color:"#374151",marginTop:6,fontStyle:"italic"}}>"{vm.transcript}"</div>}
                </div>
                <div style={{display:"flex",gap:8}}>
                  {vm.audio_url&&<button style={{...btn("#7c3aed"),padding:"6px 12px",fontSize:12}}> Play</button>}
                  <button onClick={()=>TelephonyAPI.markVoicemailListened(vm.id).then(loadAll)} style={{...btn("#6b7280"),padding:"6px 12px",fontSize:12}}> Mark Heard</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* -- METRICS -- */}
      {tab==="metrics"&&metrics&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
          <div style={card}>
            <div style={{fontWeight:700,fontSize:15,color:"#0f172a",marginBottom:16}}> Call Metrics (7 days)</div>
            {[
              {label:"Total Calls",value:metrics.total,color:"#3b82f6"},
              {label:"Answered",value:metrics.answered,color:"#22c55e"},
              {label:"Missed",value:metrics.missed,color:"#ef4444"},
              {label:"Inbound",value:metrics.inbound,color:"#7c3aed"},
              {label:"Outbound",value:metrics.outbound,color:"#f97316"},
              {label:"Answer Rate",value:`${metrics.total>0?Math.round(metrics.answered/metrics.total*100):0}%`,color:"#059669"},
              {label:"Avg Duration",value:fmt(Math.round(metrics.avgDuration)),color:"#06b6d4"},
            ].map((row,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:"1px solid #f8fafc"}}>
                <span style={{fontSize:13,color:"#374151"}}>{row.label}</span>
                <span style={{fontSize:16,fontWeight:800,color:row.color}}>{row.value}</span>
              </div>
            ))}
          </div>
          <div style={card}>
            <div style={{fontWeight:700,fontSize:15,color:"#0f172a",marginBottom:16}}> Extension Activity</div>
            {extensions.slice(0,10).map(e=>(
              <div key={e.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #f8fafc"}}>
                <div>
                  <span style={{fontFamily:"monospace",fontWeight:700,color:"#7c3aed",marginRight:8}}>{e.extension_number}</span>
                  <span style={{fontSize:13,color:"#374151"}}>{e.display_name}</span>
                </div>
                <Chip label={e.status} color={EXT_STATUS_C[e.status]||"#9ca3af"}/>
              </div>
            ))}
          </div>
        </div>
      )}
      <style>{`@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}`}</style>
    </div>
  );
}
