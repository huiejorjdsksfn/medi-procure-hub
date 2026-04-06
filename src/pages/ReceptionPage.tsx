/**
 * ProcurBosse — Reception Module v5.8
 * Hospital front-desk ERP: visitor log, Twilio calls & SMS, WhatsApp, live real-time
 * Role-customized views for all user roles
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtime } from "@/hooks/useRealtime";
import { ReceptionAPI } from "@/lib/api/ReceptionAPI";
import { toast } from "@/hooks/use-toast";
import {
  Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed,
  MessageSquare, UserCheck, UserX, Plus, X, Search, RefreshCw,
  Send, Users, Building2, LogIn, LogOut, ExternalLink
} from "lucide-react";

const DEPTS = ["Pharmacy","Maternity","Casualty","Laboratory","X-Ray","Paediatrics",
  "Surgery","Medical","Outpatient","Administration","ICU","Procurement","HR","Finance"];

const TWILIO_PHONE = "+16812972643";
const WHATSAPP_NO = "+14155238886";
const WHATSAPP_SANDBOX_CODE = "bad-machine";
const WHATSAPP_LINK = `https://api.whatsapp.com/send/?phone=%2B14155238886&text=join+bad-machine&type=phone_number&app_absent=0`;
const TWILIO_MSG_SID = "MG2fffc3a381c44a202c316dcc6400707d";
const TWILIO_VOICE_WEBHOOK = "https://demo.twilio.com/welcome/voice/";

const CALL_C: Record<string,string> = {incoming:"#0369a1",outgoing:"#059669",missed:"#dc2626",voicemail:"#9333ea"};
const VISIT_C: Record<string,string> = {checked_in:"#059669",checked_out:"#6b7280",waiting:"#d97706",denied:"#dc2626"};
const fmtDate = (d:string) => d ? new Date(d).toLocaleString("en-KE",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit",hour12:true}) : "—";
const BS = (bg:string):React.CSSProperties => ({display:"flex",alignItems:"center",gap:6,padding:"8px 16px",borderRadius:8,border:"none",background:bg,color:"#fff",fontWeight:700,fontSize:12.5,cursor:"pointer"});
const INP:React.CSSProperties = {padding:"9px 12px",border:"1.5px solid #d1d5db",borderRadius:8,fontSize:13,color:"#111",background:"#fff",outline:"none",width:"100%",boxSizing:"border-box"};

function Chip({label,color}:{label:string;color:string}) {
  return <span style={{padding:"2px 9px",borderRadius:12,background:color+"18",color,fontSize:11,fontWeight:700,border:"1px solid "+color+"44",textTransform:"capitalize"}}>{label.replace("_"," ")}</span>;
}

// Role-based tab config
function getTabsForRole(role: string) {
  const allTabs = ["visitors","calls","messages","whatsapp"];
  if (role === "admin") return allTabs;
  if (role === "procurement_manager" || role === "procurement_officer") return ["visitors","messages","whatsapp"];
  if (role === "accountant") return ["visitors","messages"];
  if (role === "inventory_manager" || role === "warehouse_officer") return ["visitors","calls"];
  if (role === "requisitioner") return ["visitors"];
  return allTabs;
}

function getRoleWelcome(role: string) {
  const msgs: Record<string,string> = {
    admin: "Full reception access — all visitor, call, and messaging functions",
    procurement_manager: "Procurement reception — visitor management and supplier messaging",
    procurement_officer: "Procurement desk — visit tracking and messaging",
    accountant: "Finance reception — visitor log and correspondence",
    inventory_manager: "Inventory desk — visitor and call log",
    warehouse_officer: "Warehouse reception — visitor log and call tracking",
    requisitioner: "Visitor log — track department visitors",
  };
  return msgs[role] || "Reception module";
}

export default function ReceptionPage() {
  const { profile, roles } = useAuth();
  const primaryRole = roles[0] || "requisitioner";
  const hosName = "Embu Level 5 Hospital";
  const availTabs = getTabsForRole(primaryRole);

  const [tab, setTab] = useState<string>(availTabs[0]);
  const [visitors, setVisitors] = useState<any[]>([]);
  const [calls, setCalls] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showVF, setShowVF] = useState(false);
  const [showCF, setShowCF] = useState(false);
  const [showMF, setShowMF] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rtOn, setRtOn] = useState(false);
  const [whatsappMsg, setWhatsappMsg] = useState("");
  const [whatsappTo, setWhatsappTo] = useState("");
  const [waLoading, setWaLoading] = useState(false);

  const EV = {full_name:"",id_number:"",phone:"",organization:"",purpose:"",host_name:"",host_department:"",notes:""};
  const EC = {caller_name:"",caller_phone:"",purpose:"",department:"",staff_contacted:"",call_status:"incoming",notes:""};
  const EM = {recipient_name:"",recipient_phone:"",message_body:"",message_type:"sms",department:""};
  const [vF,setVF] = useState({...EV});
  const [cF,setCF] = useState({...EC});
  const [mF,setMF] = useState({...EM});

  const load = useCallback(async()=>{
    setLoading(true);
    const [v,c,m] = await Promise.all([
      (supabase as any).from("reception_visitors").select("*").order("created_at",{ascending:false}).limit(100),
      (supabase as any).from("reception_calls").select("*").order("called_at",{ascending:false}).limit(100),
      (supabase as any).from("reception_messages").select("*").order("created_at",{ascending:false}).limit(100),
    ]);
    setVisitors(v.data||[]); setCalls(c.data||[]); setMessages(m.data||[]);
    setLoading(false);
  },[]);

  useEffect(()=>{load();},[load]);

  useEffect(()=>{
    const ch=(supabase as any).channel("rcpt-rt-v58")
      .on("postgres_changes",{event:"*",schema:"public",table:"reception_visitors"},load)
      .on("postgres_changes",{event:"*",schema:"public",table:"reception_calls"},load)
      .on("postgres_changes",{event:"*",schema:"public",table:"reception_messages"},load)
      .subscribe((s:string)=>setRtOn(s==="SUBSCRIBED"));
    return()=>(supabase as any).removeChannel(ch);
  },[load]);

  async function sms(phone:string,body:string){
    const p=phone.startsWith("+")?phone:phone.replace(/^0/,"+254");
    const {error}=await(supabase as any).functions.invoke("send-sms",{body:{to:p,message:body,hospitalName:hosName}});
    return !error;
  }

  async function sendWhatsApp(){
    if(!whatsappTo.trim()||!whatsappMsg.trim()){
      toast({title:"Fill in recipient and message",variant:"destructive"}); return;
    }
    setWaLoading(true);
    const p=whatsappTo.startsWith("+")?whatsappTo:whatsappTo.replace(/^0/,"+254");
    const {error}=await(supabase as any).functions.invoke("send-sms",{body:{
      to:p,message:whatsappMsg,hospitalName:hosName,
      channel:"whatsapp",fromNumber:`whatsapp:${WHATSAPP_NO}`
    }});
    setWaLoading(false);
    if(!error){
      toast({title:"WhatsApp message sent!"});
      setWhatsappMsg(""); setWhatsappTo("");
    } else {
      toast({title:"Failed to send WhatsApp",description:error.message,variant:"destructive"});
    }
  }

  async function checkIn(id:string){
    await(supabase as any).from("reception_visitors").update({status:"checked_in",check_in_time:new Date().toISOString()}).eq("id",id);
    load();
  }
  async function checkOut(id:string){
    await(supabase as any).from("reception_visitors").update({status:"checked_out",check_out_time:new Date().toISOString()}).eq("id",id);
    load();
  }

  async function saveVisitor(){
    if(!vF.full_name.trim()){toast({title:"Name required",variant:"destructive"});return;}
    setSaving(true);
    const {error}=await(supabase as any).from("reception_visitors").insert({...vF,status:"waiting",check_in_time:new Date().toISOString()});
    if(!error){
      setShowVF(false);setVF({...EV});
      if(vF.phone) await sms(vF.phone,`Welcome to ${hosName}. You are registered to visit ${vF.host_name||"staff"} in ${vF.host_department||"the hospital"}. Please proceed to the reception desk.`);
      toast({title:"✅ Visitor registered"});
    } else toast({title:"Error",description:error.message,variant:"destructive"});
    setSaving(false);
  }

  async function saveCall(){
    if(!cF.caller_phone.trim()){toast({title:"Phone required",variant:"destructive"});return;}
    setSaving(true);
    const {error}=await(supabase as any).from("reception_calls").insert({...cF,called_at:new Date().toISOString()});
    if(!error){setShowCF(false);setCF({...EC});toast({title:"✅ Call logged"});}
    else toast({title:"Error",description:error.message,variant:"destructive"});
    setSaving(false);
  }

  async function sendMsg(){
    if(!mF.recipient_phone.trim()||!mF.message_body.trim()){toast({title:"Fill required fields",variant:"destructive"});return;}
    setSaving(true);
    const ok=await sms(mF.recipient_phone,mF.message_body);
    if(ok){
      await(supabase as any).from("reception_messages").insert({...mF,status:"sent",sent_at:new Date().toISOString()});
      setShowMF(false);setMF({...EM});
      toast({title:"✅ SMS sent"});
    } else toast({title:"SMS failed",variant:"destructive"});
    setSaving(false);
  }

  const filterVisitors = visitors.filter(v=>!search||v.full_name?.toLowerCase().includes(search.toLowerCase())||v.organization?.toLowerCase().includes(search.toLowerCase()));
  const filterCalls = calls.filter(c=>!search||c.caller_name?.toLowerCase().includes(search.toLowerCase())||c.caller_phone?.includes(search));
  const filterMsgs = messages.filter(m=>!search||m.recipient_name?.toLowerCase().includes(search.toLowerCase())||m.recipient_phone?.includes(search));

  const tabLabels: Record<string,string> = {visitors:"👥 Visitors",calls:"📞 Calls",messages:"💬 Messages",whatsapp:"🟢 WhatsApp"};

  return (
    <div style={{padding:"20px 24px",fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",maxWidth:1400,margin:"0 auto"}}>

      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:40,height:40,borderRadius:10,background:"linear-gradient(135deg,#0369a1,#0284c7)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🏥</div>
            <div>
              <h1 style={{margin:0,fontSize:20,fontWeight:800,color:"#0f172a",letterSpacing:"-0.02em"}}>Reception Desk</h1>
              <div style={{fontSize:11,color:"#6b7280",marginTop:2}}>{hosName} · ProcurBosse v5.8 · {getRoleWelcome(primaryRole)}</div>
            </div>
          </div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <span style={{padding:"4px 10px",borderRadius:20,background:rtOn?"#f0fdf4":"#fef9c3",border:`1px solid ${rtOn?"#bbf7d0":"#fde68a"}`,fontSize:11,fontWeight:700,color:rtOn?"#059669":"#d97706"}}>
            {rtOn?"🟢 Live":"🟡 Connecting..."}
          </span>
          {primaryRole === "admin" && (
            <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer"
              style={{...BS("#25D366"),textDecoration:"none",fontSize:11}}>
              🟢 Join WhatsApp Sandbox
            </a>
          )}
          <button onClick={load} style={BS("#64748b")}><RefreshCw style={{width:12,height:12}}/> Refresh</button>
          {availTabs.includes("visitors") && <button onClick={()=>setShowVF(true)} style={BS("#0369a1")}><Plus style={{width:12,height:12}}/> New Visitor</button>}
          {availTabs.includes("calls") && <button onClick={()=>setShowCF(true)} style={BS("#059669")}><Phone style={{width:12,height:12}}/> Log Call</button>}
          {availTabs.includes("messages") && <button onClick={()=>setShowMF(true)} style={BS("#7c3aed")}><Send style={{width:12,height:12}}/> Send SMS</button>}
        </div>
      </div>

      {/* Twilio Info Banner */}
      <div style={{background:"linear-gradient(135deg,#0369a1,#0284c7)",borderRadius:12,padding:"14px 20px",marginBottom:20,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
        <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
          <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>📡 EL5H Messaging Service</div>
          <span style={{fontSize:11,color:"rgba(255,255,255,0.75)"}}>SMS: {TWILIO_PHONE}</span>
          <span style={{fontSize:11,color:"rgba(255,255,255,0.75)"}}>WhatsApp: {WHATSAPP_NO}</span>
          <span style={{fontSize:11,color:"rgba(255,255,255,0.75)"}}>Service SID: {TWILIO_MSG_SID}</span>
        </div>
        <div style={{display:"flex",gap:8}}>
          <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer"
            style={{padding:"5px 12px",background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.3)",borderRadius:8,color:"#fff",fontSize:11,fontWeight:700,textDecoration:"none"}}>
            🟢 WhatsApp Sandbox →
          </a>
          <a href={TWILIO_VOICE_WEBHOOK} target="_blank" rel="noopener noreferrer"
            style={{padding:"5px 12px",background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.3)",borderRadius:8,color:"#fff",fontSize:11,fontWeight:700,textDecoration:"none"}}>
            📞 Voice Webhook →
          </a>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:20}}>
        {[
          {label:"Total Visitors",value:visitors.length,icon:"👥",color:"#0369a1"},
          {label:"Currently In",value:visitors.filter(v=>v.status==="checked_in").length,icon:"✅",color:"#059669"},
          {label:"Waiting",value:visitors.filter(v=>v.status==="waiting").length,icon:"⏳",color:"#d97706"},
          {label:"Calls Today",value:calls.filter(c=>new Date(c.called_at).toDateString()===new Date().toDateString()).length,icon:"📞",color:"#7c3aed"},
          {label:"SMS Sent",value:messages.filter(m=>m.status==="sent").length,icon:"💬",color:"#0891b2"},
        ].map((k,i)=>(
          <div key={i} style={{background:"#fff",borderRadius:10,border:"1px solid #f1f5f9",padding:"14px 16px",boxShadow:"0 2px 6px rgba(0,0,0,0.05)",borderLeft:`4px solid ${k.color}`}}>
            <div style={{fontSize:20,marginBottom:4}}>{k.icon}</div>
            <div style={{fontSize:22,fontWeight:800,color:"#0f172a"}}>{loading?"…":k.value}</div>
            <div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:4,marginBottom:20,borderBottom:"2px solid #f1f5f9",overflowX:"auto"}}>
        {availTabs.map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{
            padding:"9px 18px",borderRadius:"8px 8px 0 0",border:tab===t?"1.5px solid #0369a1":"1.5px solid transparent",
            background:tab===t?"#0369a1":"transparent",color:tab===t?"#fff":"#6b7280",
            fontSize:13,fontWeight:tab===t?700:500,cursor:"pointer",whiteSpace:"nowrap",
          }}>
            {tabLabels[t]||t}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{position:"relative",marginBottom:16,maxWidth:360}}>
        <Search style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",width:14,height:14,color:"#9ca3af"}}/>
        <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" style={{...INP,paddingLeft:32}}/>
      </div>

      {/* ── VISITORS TAB ── */}
      {tab==="visitors" && (
        <>
          {showVF && (
            <div style={{background:"#f8fafc",borderRadius:12,padding:20,marginBottom:16,border:"1.5px solid #e2e8f0"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
                <div style={{fontWeight:700,fontSize:14,color:"#0f172a"}}>👤 Register New Visitor</div>
                <button onClick={()=>setShowVF(false)} style={{background:"none",border:"none",cursor:"pointer",color:"#6b7280"}}><X style={{width:16,height:16}}/></button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
                {[["Full Name *","full_name","text"],["ID/Passport","id_number","text"],["Phone","phone","tel"],["Organization","organization","text"],["Purpose","purpose","text"],["Host Name","host_name","text"]].map(([l,k,t])=>(
                  <div key={k}>
                    <label style={{fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:5}}>{l}</label>
                    <input type={t} value={(vF as any)[k]} onChange={e=>setVF(f=>({...f,[k]:e.target.value}))} style={INP} placeholder={l}/>
                  </div>
                ))}
                <div>
                  <label style={{fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:5}}>Department</label>
                  <select value={vF.host_department} onChange={e=>setVF(f=>({...f,host_department:e.target.value}))} style={INP}>
                    <option value="">— Select —</option>
                    {DEPTS.map(d=><option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div style={{gridColumn:"span 2"}}>
                  <label style={{fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:5}}>Notes</label>
                  <input type="text" value={vF.notes} onChange={e=>setVF(f=>({...f,notes:e.target.value}))} style={INP} placeholder="Any additional notes"/>
                </div>
              </div>
              <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:14}}>
                <button onClick={()=>setShowVF(false)} style={{padding:"9px 16px",background:"#f1f5f9",border:"1px solid #e2e8f0",borderRadius:8,cursor:"pointer",fontSize:13}}>Cancel</button>
                <button onClick={saveVisitor} disabled={saving} style={BS(saving?"#9ca3af":"#0369a1")}>{saving?"Saving…":"✅ Register Visitor"}</button>
              </div>
            </div>
          )}

          <div style={{background:"#fff",borderRadius:12,border:"1px solid #f1f5f9",overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.05)"}}>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead>
                  <tr style={{background:"#f8fafc"}}>
                    {["Name","ID","Phone","Organization","Purpose","Host","Department","Status","Check-in","Actions"].map(h=>(
                      <th key={h} style={{fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.06em",padding:"10px 14px",borderBottom:"2px solid #f1f5f9",textAlign:"left",whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading?<tr><td colSpan={10} style={{textAlign:"center",padding:"32px",color:"#9ca3af"}}>Loading…</td></tr>:
                  filterVisitors.length===0?<tr><td colSpan={10} style={{textAlign:"center",padding:"32px",color:"#9ca3af"}}>No visitors found</td></tr>:
                  filterVisitors.map(v=>(
                    <tr key={v.id} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f8fafc"} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=""}>
                      <td style={{padding:"10px 14px",fontSize:13,fontWeight:700,color:"#0f172a",borderBottom:"1px solid #f8fafc"}}>{v.full_name}</td>
                      <td style={{padding:"10px 14px",fontSize:12,color:"#374151",borderBottom:"1px solid #f8fafc"}}>{v.id_number||"—"}</td>
                      <td style={{padding:"10px 14px",fontSize:12,color:"#374151",borderBottom:"1px solid #f8fafc"}}>{v.phone||"—"}</td>
                      <td style={{padding:"10px 14px",fontSize:12,color:"#374151",borderBottom:"1px solid #f8fafc"}}>{v.organization||"—"}</td>
                      <td style={{padding:"10px 14px",fontSize:12,color:"#374151",borderBottom:"1px solid #f8fafc"}}>{v.purpose||"—"}</td>
                      <td style={{padding:"10px 14px",fontSize:12,color:"#374151",borderBottom:"1px solid #f8fafc"}}>{v.host_name||"—"}</td>
                      <td style={{padding:"10px 14px",fontSize:12,color:"#374151",borderBottom:"1px solid #f8fafc"}}>{v.host_department||"—"}</td>
                      <td style={{padding:"10px 14px",borderBottom:"1px solid #f8fafc"}}><Chip label={v.status||"waiting"} color={VISIT_C[v.status]||"#6b7280"}/></td>
                      <td style={{padding:"10px 14px",fontSize:11,color:"#9ca3af",borderBottom:"1px solid #f8fafc"}}>{fmtDate(v.check_in_time)}</td>
                      <td style={{padding:"10px 14px",borderBottom:"1px solid #f8fafc"}}>
                        <div style={{display:"flex",gap:6}}>
                          {v.status==="waiting"&&<button onClick={()=>checkIn(v.id)} style={{...BS("#059669"),padding:"4px 10px",fontSize:11}}><LogIn style={{width:10,height:10}}/>In</button>}
                          {v.status==="checked_in"&&<button onClick={()=>checkOut(v.id)} style={{...BS("#6b7280"),padding:"4px 10px",fontSize:11}}><LogOut style={{width:10,height:10}}/>Out</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── CALLS TAB ── */}
      {tab==="calls" && (
        <>
          {showCF && (
            <div style={{background:"#f8fafc",borderRadius:12,padding:20,marginBottom:16,border:"1.5px solid #e2e8f0"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
                <div style={{fontWeight:700,fontSize:14}}>📞 Log Call</div>
                <button onClick={()=>setShowCF(false)} style={{background:"none",border:"none",cursor:"pointer"}}><X style={{width:16,height:16}}/></button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
                {[["Caller Name","caller_name","text"],["Caller Phone *","caller_phone","tel"],["Purpose","purpose","text"],["Staff Contacted","staff_contacted","text"]].map(([l,k,t])=>(
                  <div key={k}>
                    <label style={{fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:5}}>{l}</label>
                    <input type={t} value={(cF as any)[k]} onChange={e=>setCF(f=>({...f,[k]:e.target.value}))} style={INP} placeholder={l}/>
                  </div>
                ))}
                <div>
                  <label style={{fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:5}}>Call Status</label>
                  <select value={cF.call_status} onChange={e=>setCF(f=>({...f,call_status:e.target.value}))} style={INP}>
                    {["incoming","outgoing","missed","voicemail"].map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:5}}>Department</label>
                  <select value={cF.department} onChange={e=>setCF(f=>({...f,department:e.target.value}))} style={INP}>
                    <option value="">— Select —</option>
                    {DEPTS.map(d=><option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:14}}>
                <button onClick={()=>setShowCF(false)} style={{padding:"9px 16px",background:"#f1f5f9",border:"1px solid #e2e8f0",borderRadius:8,cursor:"pointer",fontSize:13}}>Cancel</button>
                <button onClick={saveCall} disabled={saving} style={BS(saving?"#9ca3af":"#059669")}>{saving?"Saving…":"📞 Log Call"}</button>
              </div>
            </div>
          )}
          <div style={{background:"#fff",borderRadius:12,border:"1px solid #f1f5f9",overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.05)"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr style={{background:"#f8fafc"}}>
                  {["Type","Caller","Phone","Purpose","Department","Staff","Time"].map(h=>(
                    <th key={h} style={{fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.06em",padding:"10px 14px",borderBottom:"2px solid #f1f5f9",textAlign:"left"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading?<tr><td colSpan={7} style={{textAlign:"center",padding:"32px",color:"#9ca3af"}}>Loading…</td></tr>:
                filterCalls.map(c=>(
                  <tr key={c.id} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f8fafc"} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=""}>
                    <td style={{padding:"10px 14px",borderBottom:"1px solid #f8fafc"}}><Chip label={c.call_status||"incoming"} color={CALL_C[c.call_status]||"#0369a1"}/></td>
                    <td style={{padding:"10px 14px",fontSize:13,fontWeight:600,color:"#0f172a",borderBottom:"1px solid #f8fafc"}}>{c.caller_name||"Unknown"}</td>
                    <td style={{padding:"10px 14px",fontSize:12,color:"#374151",borderBottom:"1px solid #f8fafc"}}>{c.caller_phone}</td>
                    <td style={{padding:"10px 14px",fontSize:12,color:"#374151",borderBottom:"1px solid #f8fafc"}}>{c.purpose||"—"}</td>
                    <td style={{padding:"10px 14px",fontSize:12,color:"#374151",borderBottom:"1px solid #f8fafc"}}>{c.department||"—"}</td>
                    <td style={{padding:"10px 14px",fontSize:12,color:"#374151",borderBottom:"1px solid #f8fafc"}}>{c.staff_contacted||"—"}</td>
                    <td style={{padding:"10px 14px",fontSize:11,color:"#9ca3af",borderBottom:"1px solid #f8fafc"}}>{fmtDate(c.called_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── MESSAGES TAB ── */}
      {tab==="messages" && (
        <>
          {showMF && (
            <div style={{background:"#f8fafc",borderRadius:12,padding:20,marginBottom:16,border:"1.5px solid #e2e8f0"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
                <div style={{fontWeight:700,fontSize:14}}>💬 Send SMS Message</div>
                <button onClick={()=>setShowMF(false)} style={{background:"none",border:"none",cursor:"pointer"}}><X style={{width:16,height:16}}/></button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                {[["Recipient Name","recipient_name","text"],["Phone *","recipient_phone","tel"]].map(([l,k,t])=>(
                  <div key={k}>
                    <label style={{fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:5}}>{l}</label>
                    <input type={t} value={(mF as any)[k]} onChange={e=>setMF(f=>({...f,[k]:e.target.value}))} style={INP} placeholder={l}/>
                  </div>
                ))}
                <div>
                  <label style={{fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:5}}>Department</label>
                  <select value={mF.department} onChange={e=>setMF(f=>({...f,department:e.target.value}))} style={INP}>
                    <option value="">— Select —</option>
                    {DEPTS.map(d=><option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div style={{gridColumn:"span 2"}}>
                  <label style={{fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:5}}>Message *</label>
                  <textarea value={mF.message_body} onChange={e=>setMF(f=>({...f,message_body:e.target.value}))} style={{...INP,height:80,resize:"vertical"}} placeholder="Type your SMS message here…"/>
                </div>
              </div>
              <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:14}}>
                <button onClick={()=>setShowMF(false)} style={{padding:"9px 16px",background:"#f1f5f9",border:"1px solid #e2e8f0",borderRadius:8,cursor:"pointer",fontSize:13}}>Cancel</button>
                <button onClick={sendMsg} disabled={saving} style={BS(saving?"#9ca3af":"#7c3aed")}>{saving?"Sending…":"📤 Send SMS"}</button>
              </div>
            </div>
          )}
          <div style={{background:"#fff",borderRadius:12,border:"1px solid #f1f5f9",overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.05)"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr style={{background:"#f8fafc"}}>
                  {["Recipient","Phone","Department","Message","Status","Sent At"].map(h=>(
                    <th key={h} style={{fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.06em",padding:"10px 14px",borderBottom:"2px solid #f1f5f9",textAlign:"left"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading?<tr><td colSpan={6} style={{textAlign:"center",padding:"32px",color:"#9ca3af"}}>Loading…</td></tr>:
                filterMsgs.map(m=>(
                  <tr key={m.id} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f8fafc"} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=""}>
                    <td style={{padding:"10px 14px",fontSize:13,fontWeight:600,color:"#0f172a",borderBottom:"1px solid #f8fafc"}}>{m.recipient_name||"—"}</td>
                    <td style={{padding:"10px 14px",fontSize:12,color:"#374151",borderBottom:"1px solid #f8fafc"}}>{m.recipient_phone}</td>
                    <td style={{padding:"10px 14px",fontSize:12,color:"#374151",borderBottom:"1px solid #f8fafc"}}>{m.department||"—"}</td>
                    <td style={{padding:"10px 14px",fontSize:12,color:"#374151",maxWidth:220,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",borderBottom:"1px solid #f8fafc"}}>{m.message_body}</td>
                    <td style={{padding:"10px 14px",borderBottom:"1px solid #f8fafc"}}><Chip label={m.status||"pending"} color={m.status==="sent"?"#059669":"#d97706"}/></td>
                    <td style={{padding:"10px 14px",fontSize:11,color:"#9ca3af",borderBottom:"1px solid #f8fafc"}}>{fmtDate(m.sent_at||m.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── WHATSAPP TAB ── */}
      {tab==="whatsapp" && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
          {/* WhatsApp Sandbox Setup */}
          <div style={{background:"#fff",borderRadius:12,border:"1px solid #f1f5f9",padding:24,boxShadow:"0 2px 8px rgba(0,0,0,0.05)"}}>
            <div style={{fontWeight:800,fontSize:16,color:"#0f172a",marginBottom:4}}>🟢 WhatsApp Business Sandbox</div>
            <div style={{fontSize:12,color:"#6b7280",marginBottom:20}}>Twilio WhatsApp Sandbox · EL5H Messaging Service</div>
            <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:10,padding:16,marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:700,color:"#059669",marginBottom:8}}>📱 To activate WhatsApp:</div>
              <ol style={{margin:0,paddingLeft:20,fontSize:13,color:"#374151",lineHeight:2}}>
                <li>Send <strong>join {WHATSAPP_SANDBOX_CODE}</strong> to <strong>{WHATSAPP_NO}</strong> on WhatsApp</li>
                <li>Or click the button below to open WhatsApp directly</li>
                <li>You will be connected to the EL5H sandbox</li>
              </ol>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
              {[
                {label:"WhatsApp Number",value:WHATSAPP_NO},
                {label:"Join Code",value:`join ${WHATSAPP_SANDBOX_CODE}`},
                {label:"SMS Number",value:TWILIO_PHONE},
                {label:"Messaging SID",value:TWILIO_MSG_SID},
                {label:"Service Name",value:"EL5H"},
                {label:"Voice Webhook",value:"Twilio Demo"},
              ].map((row,i)=>(
                <div key={i} style={{padding:"10px 12px",background:"#f8fafc",borderRadius:8,border:"1px solid #e2e8f0"}}>
                  <div style={{fontSize:10,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:3}}>{row.label}</div>
                  <div style={{fontSize:12,fontWeight:600,color:"#0f172a",fontFamily:"monospace"}}>{row.value}</div>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:10}}>
              <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer"
                style={{...BS("#25D366"),textDecoration:"none",flex:1,justifyContent:"center"}}>
                🟢 Open WhatsApp →
              </a>
              <a href={TWILIO_VOICE_WEBHOOK} target="_blank" rel="noopener noreferrer"
                style={{...BS("#0369a1"),textDecoration:"none",flex:1,justifyContent:"center"}}>
                📞 Voice Webhook →
              </a>
            </div>
          </div>

          {/* Send WhatsApp Message */}
          <div style={{background:"#fff",borderRadius:12,border:"1px solid #f1f5f9",padding:24,boxShadow:"0 2px 8px rgba(0,0,0,0.05)"}}>
            <div style={{fontWeight:800,fontSize:16,color:"#0f172a",marginBottom:4}}>📤 Send WhatsApp Message</div>
            <div style={{fontSize:12,color:"#6b7280",marginBottom:20}}>via Twilio WhatsApp API · EL5H Messaging Service</div>
            <div style={{marginBottom:14}}>
              <label style={{fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:6}}>Recipient Phone (with country code)</label>
              <input type="tel" value={whatsappTo} onChange={e=>setWhatsappTo(e.target.value)} style={INP} placeholder="+254700000000"/>
            </div>
            <div style={{marginBottom:14}}>
              <label style={{fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:6}}>Message</label>
              <textarea value={whatsappMsg} onChange={e=>setWhatsappMsg(e.target.value)} style={{...INP,height:100,resize:"vertical"}} placeholder="Type your WhatsApp message…"/>
              <div style={{fontSize:11,color:"#9ca3af",marginTop:4}}>{whatsappMsg.length}/1600 characters</div>
            </div>
            <div style={{background:"#fff9ed",border:"1px solid #fde68a",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:12,color:"#92400e"}}>
              ⚠️ Recipient must first join the sandbox by sending <strong>join {WHATSAPP_SANDBOX_CODE}</strong> to {WHATSAPP_NO}
            </div>
            <button onClick={sendWhatsApp} disabled={waLoading} style={{...BS(waLoading?"#9ca3af":"#25D366"),width:"100%",justifyContent:"center",fontSize:14,padding:"12px"}}>
              {waLoading?"Sending…":"🟢 Send WhatsApp Message"}
            </button>
          </div>

          {/* WhatsApp Message History */}
          <div style={{gridColumn:"span 2",background:"#fff",borderRadius:12,border:"1px solid #f1f5f9",padding:24,boxShadow:"0 2px 8px rgba(0,0,0,0.05)"}}>
            <div style={{fontWeight:700,fontSize:15,color:"#0f172a",marginBottom:16}}>📜 Message History</div>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr style={{background:"#f8fafc"}}>
                  {["Recipient","Phone","Channel","Message","Status","Sent At"].map(h=>(
                    <th key={h} style={{fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.06em",padding:"10px 14px",borderBottom:"2px solid #f1f5f9",textAlign:"left"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {messages.map(m=>(
                  <tr key={m.id} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f8fafc"} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=""}>
                    <td style={{padding:"10px 14px",fontSize:13,fontWeight:600,color:"#0f172a",borderBottom:"1px solid #f8fafc"}}>{m.recipient_name||"—"}</td>
                    <td style={{padding:"10px 14px",fontSize:12,color:"#374151",borderBottom:"1px solid #f8fafc"}}>{m.recipient_phone}</td>
                    <td style={{padding:"10px 14px",borderBottom:"1px solid #f8fafc"}}><Chip label={m.message_type||"sms"} color={m.message_type==="whatsapp"?"#25D366":"#7c3aed"}/></td>
                    <td style={{padding:"10px 14px",fontSize:12,color:"#374151",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",borderBottom:"1px solid #f8fafc"}}>{m.message_body}</td>
                    <td style={{padding:"10px 14px",borderBottom:"1px solid #f8fafc"}}><Chip label={m.status||"pending"} color={m.status==="sent"?"#059669":"#d97706"}/></td>
                    <td style={{padding:"10px 14px",fontSize:11,color:"#9ca3af",borderBottom:"1px solid #f8fafc"}}>{fmtDate(m.sent_at||m.created_at)}</td>
                  </tr>
                ))}
                {messages.length===0&&<tr><td colSpan={6} style={{textAlign:"center",padding:"32px",color:"#9ca3af",fontSize:13}}>No messages yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
