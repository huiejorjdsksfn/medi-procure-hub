/**
 * ProcurBosse — Reception Module v1.0
 * Hospital front-desk ERP: visitor log, Twilio calls & SMS, live real-time
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { toast } from "@/hooks/use-toast";
import {
  Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed,
  MessageSquare, UserCheck, UserX, Plus, X, Search, RefreshCw,
  Send, Users, Building2, LogIn, LogOut
} from "lucide-react";

const DEPTS = ["Pharmacy","Maternity","Casualty","Laboratory","X-Ray","Paediatrics","Surgery","Medical","Outpatient","Administration","ICU","Procurement","HR","Finance"];
const CALL_C:Record<string,string> = {incoming:"#0369a1",outgoing:"#059669",missed:"#dc2626",voicemail:"#9333ea"};
const VISIT_C:Record<string,string> = {checked_in:"#059669",checked_out:"#6b7280",waiting:"#d97706",denied:"#dc2626"};
const fmtDate = (d:string) => d ? new Date(d).toLocaleString("en-KE",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit",hour12:true}) : "—";
const fmtDur = (s?:number) => !s ? "—" : s < 60 ? s+"s" : Math.floor(s/60)+"m "+s%60+"s";
const BS = (bg:string):React.CSSProperties => ({display:"flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:8,border:"none",background:bg,color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer"});
const INP:React.CSSProperties = {padding:"8px 11px",border:"1.5px solid #d1d5db",borderRadius:8,fontSize:13,color:"#111",background:"#fff",outline:"none",width:"100%",boxSizing:"border-box" as const};

function Chip({label,color}:{label:string;color:string}) {
  return <span style={{padding:"2px 9px",borderRadius:12,background:color+"18",color,fontSize:11,fontWeight:700,border:"1px solid "+color+"44"}}>{label.replace("_"," ")}</span>;
}

export default function ReceptionPage() {
  const { user, profile } = useAuth();
  const { getSetting } = useSystemSettings();
  const hosName = getSetting("hospital_name","Embu Level 5 Hospital");
  const twilioPhone = getSetting("twilio_phone_number","");

  const [tab,      setTab]      = useState<"visitors"|"calls"|"messages">("visitors");
  const [visitors, setVisitors] = useState<any[]>([]);
  const [calls,    setCalls]    = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [showVF,   setShowVF]   = useState(false);
  const [showCF,   setShowCF]   = useState(false);
  const [showMF,   setShowMF]   = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [rtOn,     setRtOn]     = useState(false);

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
    const ch=(supabase as any).channel("rcpt-rt")
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

  async function makeCall(phone:string,name:string){
    const p=phone.startsWith("+")?phone:phone.replace(/^0/,"+254");
    await(supabase as any).from("reception_calls").insert({caller_name:name,caller_phone:p,call_status:"outgoing",purpose:"Outgoing from reception",received_by:user?.id,received_by_name:profile?.full_name});
    window.open("tel:"+p,"_blank");
    toast({title:"📞 Dialling "+name,description:p});
    load();
  }

  async function checkIn(){
    if(!vF.full_name.trim()||!vF.purpose.trim()){toast({title:"Name and purpose required",variant:"destructive"});return;}
    setSaving(true);
    const badge="B"+String(visitors.length+1).padStart(3,"0");
    const {error}=await(supabase as any).from("reception_visitors").insert({...vF,badge_number:badge,visit_status:"checked_in",received_by:user?.id,received_by_name:profile?.full_name});
    if(error){toast({title:"Failed: "+error.message,variant:"destructive"});setSaving(false);return;}
    if(vF.phone&&vF.host_name) await sms(vF.phone,`[${hosName}] ${vF.full_name} from ${vF.organization||"—"} arrived to see ${vF.host_name}. Badge: ${badge}.`);
    toast({title:"✅ "+vF.full_name+" checked in",description:"Badge: "+badge});
    setVF({...EV});setShowVF(false);setSaving(false);load();
  }

  async function checkOut(id:string,name:string){
    await(supabase as any).from("reception_visitors").update({visit_status:"checked_out",checked_out_at:new Date().toISOString()}).eq("id",id);
    toast({title:name+" checked out"});load();
  }

  async function logCall(){
    if(!cF.caller_phone.trim()){toast({title:"Phone required",variant:"destructive"});return;}
    setSaving(true);
    await(supabase as any).from("reception_calls").insert({...cF,received_by:user?.id,received_by_name:profile?.full_name});
    toast({title:"✅ Call logged"});setCF({...EC});setShowCF(false);setSaving(false);load();
  }

  async function sendMsg(){
    if(!mF.recipient_phone.trim()||!mF.message_body.trim()){toast({title:"Phone and message required",variant:"destructive"});return;}
    setSaving(true);
    const p=mF.recipient_phone.startsWith("+")?mF.recipient_phone:mF.recipient_phone.replace(/^0/,"+254");
    await(supabase as any).from("reception_messages").insert({...mF,recipient_phone:p,status:"pending",sent_by:user?.id,sent_by_name:profile?.full_name});
    const ok=await sms(p,mF.message_body);
    const {data:rows}=await(supabase as any).from("reception_messages").select("id").eq("recipient_phone",p).order("created_at",{ascending:false}).limit(1);
    if(rows?.[0]?.id) await(supabase as any).from("reception_messages").update({status:ok?"sent":"failed",sent_at:new Date().toISOString()}).eq("id",rows[0].id);
    toast({title:ok?"✅ SMS sent":"⚠️ SMS queued — check Twilio settings"});
    setMF({...EM});setShowMF(false);setSaving(false);load();
  }

  const today=new Date().toLocaleDateString();
  const tv=visitors.filter(v=>new Date(v.checked_in_at).toLocaleDateString()===today);
  const kpi=[
    {l:"In Today",n:tv.filter(v=>v.visit_status==="checked_in").length,c:"#059669",I:UserCheck},
    {l:"Checked Out",n:tv.filter(v=>v.visit_status==="checked_out").length,c:"#6b7280",I:UserX},
    {l:"Calls Today",n:calls.filter(c=>new Date(c.called_at).toLocaleDateString()===today).length,c:"#0369a1",I:Phone},
    {l:"SMS Sent",n:messages.filter(m=>m.status==="sent"&&new Date(m.created_at).toLocaleDateString()===today).length,c:"#7c3aed",I:MessageSquare},
  ];
  const fv=visitors.filter(v=>!search||(v.full_name+" "+v.purpose+" "+(v.organization||"")).toLowerCase().includes(search.toLowerCase()));
  const fc=calls.filter(c=>!search||(c.caller_name+" "+c.caller_phone+" "+(c.department||"")).toLowerCase().includes(search.toLowerCase()));
  const fm=messages.filter(m=>!search||(m.recipient_name+" "+m.recipient_phone).toLowerCase().includes(search.toLowerCase()));

  const TABS=[{id:"visitors",label:"Visitor Log",icon:Users,n:fv.length},{id:"calls",label:"Call Log",icon:Phone,n:fc.length},{id:"messages",label:"Messages",icon:MessageSquare,n:fm.length}];

  return (
    <div style={{minHeight:"100vh",background:"#f0f4f8",fontFamily:"'Segoe UI',system-ui,sans-serif",color:"#111"}}>
      <div style={{display:"flex",borderBottom:"1px solid #e5e7eb"}}>
        {kpi.map((k,i)=>(
          <div key={i} style={{flex:1,background:k.c,color:"#fff",padding:"14px 18px",display:"flex",alignItems:"center",gap:12,borderRight:i<3?"1px solid rgba(255,255,255,0.15)":"none"}}>
            <div style={{width:36,height:36,borderRadius:9,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><k.I style={{width:18,height:18}}/></div>
            <div><div style={{fontSize:22,fontWeight:900,lineHeight:1}}>{k.n}</div><div style={{fontSize:10,opacity:0.85,fontWeight:600}}>{k.l}</div></div>
          </div>
        ))}
      </div>
      <div style={{padding:"14px 20px 0",display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:38,height:38,borderRadius:10,background:"linear-gradient(135deg,#0369a1,#1d4ed8)",display:"flex",alignItems:"center",justifyContent:"center"}}><Building2 style={{width:20,height:20,color:"#fff"}}/></div>
        <div style={{flex:1}}><div style={{fontSize:17,fontWeight:800}}>Reception &amp; Front Desk</div><div style={{fontSize:11,color:"#6b7280"}}>{hosName} · Visitors · Calls · SMS via Twilio</div></div>
        <div style={{display:"flex",alignItems:"center",gap:5,marginRight:8}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:rtOn?"#22c55e":"#ef4444"}}/>
          <span style={{fontSize:11,color:rtOn?"#059669":"#dc2626",fontWeight:600}}>{rtOn?"Live":"Offline"}</span>
        </div>
        <button onClick={load} style={BS("#6b7280")}><RefreshCw style={{width:13,height:13}}/> Refresh</button>
        {tab==="visitors"&&<button onClick={()=>setShowVF(true)} style={BS("#059669")}><Plus style={{width:14,height:14}}/> Check In</button>}
        {tab==="calls"&&<button onClick={()=>setShowCF(true)} style={BS("#0369a1")}><PhoneIncoming style={{width:14,height:14}}/> Log Call</button>}
        {tab==="messages"&&<button onClick={()=>setShowMF(true)} style={BS("#7c3aed")}><Send style={{width:14,height:14}}/> Send SMS</button>}
      </div>
      <div style={{padding:"10px 20px 0",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" as const}}>
        <div style={{display:"flex",gap:4}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id as any)} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 16px",borderRadius:20,border:"1.5px solid "+(tab===t.id?"#0369a1":"#e5e7eb"),background:tab===t.id?"#dbeafe":"#fff",cursor:"pointer",fontSize:12,fontWeight:tab===t.id?700:500,color:tab===t.id?"#1d4ed8":"#6b7280"}}>
              <t.icon style={{width:13,height:13}}/>{t.label} ({t.n})
            </button>
          ))}
        </div>
        <div style={{marginLeft:"auto",position:"relative",width:260}}>
          <Search style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",width:14,height:14,color:"#9ca3af"}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" style={{...INP,paddingLeft:32,height:36}}/>
          {search&&<button onClick={()=>setSearch("")} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",padding:2}}><X style={{width:13,height:13,color:"#9ca3af"}}/></button>}
        </div>
      </div>
      <div style={{margin:"12px 20px 20px",background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead>
              <tr style={{background:"#f9fafb",borderBottom:"2px solid #e5e7eb"}}>
                {tab==="visitors"&&["Badge","Name","Organisation","Purpose","Host","Dept","Checked In","Status","Actions"].map((h,i)=><th key={i} style={{padding:"10px 14px",textAlign:"left" as const,fontSize:10.5,fontWeight:700,color:"#9ca3af",letterSpacing:"0.06em",whiteSpace:"nowrap" as const}}>{h}</th>)}
                {tab==="calls"&&["Type","Caller","Phone","Purpose","Dept","Staff","Duration","Time","By"].map((h,i)=><th key={i} style={{padding:"10px 14px",textAlign:"left" as const,fontSize:10.5,fontWeight:700,color:"#9ca3af",letterSpacing:"0.06em",whiteSpace:"nowrap" as const}}>{h}</th>)}
                {tab==="messages"&&["Type","Recipient","Phone","Message","Dept","Status","By","Time"].map((h,i)=><th key={i} style={{padding:"10px 14px",textAlign:"left" as const,fontSize:10.5,fontWeight:700,color:"#9ca3af",letterSpacing:"0.06em",whiteSpace:"nowrap" as const}}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading&&<tr><td colSpan={9} style={{padding:40,textAlign:"center" as const,color:"#9ca3af"}}>Loading…</td></tr>}
              {!loading&&tab==="visitors"&&fv.map((v,ri)=>(
                <tr key={v.id} style={{borderBottom:"1px solid #f3f4f6",background:ri%2===0?"#fff":"#fafafa"}} onMouseEnter={e=>(e.currentTarget.style.background="#f0f9ff")} onMouseLeave={e=>(e.currentTarget.style.background=ri%2===0?"#fff":"#fafafa")}>
                  <td style={{padding:"9px 14px",fontWeight:700,color:"#0369a1",fontSize:12}}>{v.badge_number||"—"}</td>
                  <td style={{padding:"9px 14px",fontWeight:600}}>{v.full_name}</td>
                  <td style={{padding:"9px 14px",color:"#374151",fontSize:12}}>{v.organization||"—"}</td>
                  <td style={{padding:"9px 14px",color:"#374151",fontSize:12,maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{v.purpose}</td>
                  <td style={{padding:"9px 14px",color:"#374151",fontSize:12}}>{v.host_name||"—"}</td>
                  <td style={{padding:"9px 14px",color:"#374151",fontSize:12}}>{v.host_department||"—"}</td>
                  <td style={{padding:"9px 14px",color:"#6b7280",fontSize:11,whiteSpace:"nowrap" as const}}>{fmtDate(v.checked_in_at)}</td>
                  <td style={{padding:"9px 14px"}}><Chip label={v.visit_status} color={VISIT_C[v.visit_status]||"#6b7280"}/></td>
                  <td style={{padding:"9px 14px"}}>
                    <div style={{display:"flex",gap:4}}>
                      {v.visit_status==="checked_in"&&<button onClick={()=>checkOut(v.id,v.full_name)} title="Check Out" style={{padding:5,borderRadius:6,border:"none",background:"#fff1f2",cursor:"pointer"}}><LogOut style={{width:13,height:13,color:"#dc2626"}}/></button>}
                      {v.phone&&<button onClick={()=>makeCall(v.phone,v.full_name)} title="Call" style={{padding:5,borderRadius:6,border:"none",background:"#f0fdf4",cursor:"pointer"}}><Phone style={{width:13,height:13,color:"#059669"}}/></button>}
                      {v.host_name&&<button onClick={()=>{setMF({recipient_name:v.host_name,recipient_phone:v.phone||"",message_body:v.full_name+" from "+(v.organization||"—")+" arrived for "+v.host_name+". Badge: "+v.badge_number,message_type:"sms",department:v.host_department||""});setShowMF(true);}} title="SMS Host" style={{padding:5,borderRadius:6,border:"none",background:"#faf5ff",cursor:"pointer"}}><MessageSquare style={{width:13,height:13,color:"#7c3aed"}}/></button>}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading&&tab==="calls"&&fc.map((c,ri)=>{
                const cc=CALL_C[c.call_status]||"#6b7280";
                const CI=c.call_status==="incoming"?PhoneIncoming:c.call_status==="outgoing"?PhoneOutgoing:PhoneMissed;
                return (
                  <tr key={c.id} style={{borderBottom:"1px solid #f3f4f6",background:ri%2===0?"#fff":"#fafafa"}} onMouseEnter={e=>(e.currentTarget.style.background="#eff6ff")} onMouseLeave={e=>(e.currentTarget.style.background=ri%2===0?"#fff":"#fafafa")}>
                    <td style={{padding:"9px 14px"}}><div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:24,height:24,borderRadius:6,background:cc+"18",display:"flex",alignItems:"center",justifyContent:"center"}}><CI style={{width:12,height:12,color:cc}}/></div><span style={{fontSize:11,fontWeight:700,color:cc,textTransform:"capitalize" as const}}>{c.call_status}</span></div></td>
                    <td style={{padding:"9px 14px",fontWeight:600}}>{c.caller_name||"Unknown"}</td>
                    <td style={{padding:"9px 14px"}}><div style={{display:"flex",alignItems:"center",gap:5}}><span style={{color:"#374151",fontSize:12}}>{c.caller_phone}</span><button onClick={()=>makeCall(c.caller_phone,c.caller_name||"Caller")} style={{padding:3,borderRadius:5,border:"none",background:"#f0fdf4",cursor:"pointer",lineHeight:0}}><Phone style={{width:11,height:11,color:"#059669"}}/></button></div></td>
                    <td style={{padding:"9px 14px",color:"#374151",fontSize:12}}>{c.purpose||"—"}</td>
                    <td style={{padding:"9px 14px",color:"#374151",fontSize:12}}>{c.department||"—"}</td>
                    <td style={{padding:"9px 14px",color:"#374151",fontSize:12}}>{c.staff_contacted||"—"}</td>
                    <td style={{padding:"9px 14px",color:"#6b7280",fontSize:12}}>{fmtDur(c.duration_sec)}</td>
                    <td style={{padding:"9px 14px",color:"#6b7280",fontSize:11,whiteSpace:"nowrap" as const}}>{fmtDate(c.called_at)}</td>
                    <td style={{padding:"9px 14px",color:"#6b7280",fontSize:11}}>{c.received_by_name||"—"}</td>
                  </tr>
                );
              })}
              {!loading&&tab==="messages"&&fm.map((m,ri)=>{
                const sc=m.status==="sent"||m.status==="delivered"?"#059669":m.status==="failed"?"#dc2626":"#d97706";
                return (
                  <tr key={m.id} style={{borderBottom:"1px solid #f3f4f6",background:ri%2===0?"#fff":"#fafafa"}} onMouseEnter={e=>(e.currentTarget.style.background="#f5f3ff")} onMouseLeave={e=>(e.currentTarget.style.background=ri%2===0?"#fff":"#fafafa")}>
                    <td style={{padding:"9px 14px"}}><span style={{padding:"2px 8px",borderRadius:10,background:"#7c3aed18",color:"#7c3aed",fontSize:11,fontWeight:700,textTransform:"uppercase" as const}}>{m.message_type}</span></td>
                    <td style={{padding:"9px 14px",fontWeight:600}}>{m.recipient_name}</td>
                    <td style={{padding:"9px 14px"}}><div style={{display:"flex",alignItems:"center",gap:5}}><span style={{color:"#374151",fontSize:12}}>{m.recipient_phone}</span><button onClick={()=>makeCall(m.recipient_phone,m.recipient_name)} style={{padding:3,borderRadius:5,border:"none",background:"#f0fdf4",cursor:"pointer",lineHeight:0}}><Phone style={{width:11,height:11,color:"#059669"}}/></button></div></td>
                    <td style={{padding:"9px 14px",color:"#374151",fontSize:12,maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}} title={m.message_body}>{m.message_body}</td>
                    <td style={{padding:"9px 14px",color:"#374151",fontSize:12}}>{m.department||"—"}</td>
                    <td style={{padding:"9px 14px"}}><Chip label={m.status} color={sc}/></td>
                    <td style={{padding:"9px 14px",color:"#6b7280",fontSize:11}}>{m.sent_by_name||"—"}</td>
                    <td style={{padding:"9px 14px",color:"#6b7280",fontSize:11,whiteSpace:"nowrap" as const}}>{fmtDate(m.created_at)}</td>
                  </tr>
                );
              })}
              {!loading&&tab==="visitors"&&fv.length===0&&<tr><td colSpan={9} style={{padding:40,textAlign:"center" as const,color:"#9ca3af"}}>No visitors yet. <button onClick={()=>setShowVF(true)} style={{...BS("#059669"),display:"inline-flex",marginLeft:8,padding:"5px 12px"}}>Check In First Visitor</button></td></tr>}
              {!loading&&tab==="calls"&&fc.length===0&&<tr><td colSpan={9} style={{padding:40,textAlign:"center" as const,color:"#9ca3af"}}>No calls yet. <button onClick={()=>setShowCF(true)} style={{...BS("#0369a1"),display:"inline-flex",marginLeft:8,padding:"5px 12px"}}>Log First Call</button></td></tr>}
              {!loading&&tab==="messages"&&fm.length===0&&<tr><td colSpan={8} style={{padding:40,textAlign:"center" as const,color:"#9ca3af"}}>No messages yet. <button onClick={()=>setShowMF(true)} style={{...BS("#7c3aed"),display:"inline-flex",marginLeft:8,padding:"5px 12px"}}>Send First SMS</button></td></tr>}
            </tbody>
          </table>
        </div>
        <div style={{padding:"7px 14px",borderTop:"1px solid #f3f4f6",background:"#f9fafb",fontSize:11,color:"#9ca3af",display:"flex",justifyContent:"space-between"}}>
          <span>{tab==="visitors"?fv.length+" records · "+tv.filter(v=>v.visit_status==="checked_in").length+" inside":tab==="calls"?fc.length+" calls":fm.length+" messages · "+fm.filter(m=>m.status==="sent").length+" sent"}</span>
          {twilioPhone&&<span>Twilio: {twilioPhone}</span>}
        </div>
      </div>

      {showVF&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"#fff",borderRadius:16,width:"100%",maxWidth:600,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.25)"}}>
            <div style={{padding:"18px 22px 14px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#059669,#0d9488)",display:"flex",alignItems:"center",justifyContent:"center"}}><LogIn style={{width:18,height:18,color:"#fff"}}/></div>
              <div style={{flex:1}}><div style={{fontSize:16,fontWeight:800}}>Visitor Check-In</div><div style={{fontSize:11,color:"#6b7280"}}>Badge auto-assigned · SMS sent to host if phone provided</div></div>
              <button onClick={()=>{setShowVF(false);setVF({...EV});}} style={{padding:8,borderRadius:8,border:"none",background:"#f3f4f6",cursor:"pointer",lineHeight:0}}><X style={{width:16,height:16,color:"#6b7280"}}/></button>
            </div>
            <div style={{padding:"18px 22px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {[{k:"full_name",l:"Full Name *",p:"e.g. John Kamau",s:2},{k:"id_number",l:"ID / Passport",p:"12345678",s:1},{k:"phone",l:"Phone",p:"+254 7xx xxx xxx",s:1},{k:"organization",l:"Organisation",p:"e.g. MOH Kenya",s:1},{k:"purpose",l:"Purpose *",p:"Meeting / delivery",s:1},{k:"host_name",l:"Person to See",p:"e.g. Dr. Wanjiku",s:1}].map(f=>(
                <div key={f.k} style={{gridColumn:"span "+f.s}}>
                  <label style={{display:"block",fontSize:11.5,fontWeight:600,color:"#374151",marginBottom:4}}>{f.l}</label>
                  <input value={(vF as any)[f.k]} onChange={e=>setVF(p=>({...p,[f.k]:e.target.value}))} placeholder={f.p} style={INP}/>
                </div>
              ))}
              <div>
                <label style={{display:"block",fontSize:11.5,fontWeight:600,color:"#374151",marginBottom:4}}>Department</label>
                <select value={vF.host_department} onChange={e=>setVF(p=>({...p,host_department:e.target.value}))} style={INP}><option value="">Select…</option>{DEPTS.map(d=><option key={d}>{d}</option>)}</select>
              </div>
              <div><label style={{display:"block",fontSize:11.5,fontWeight:600,color:"#374151",marginBottom:4}}>Notes</label><input value={vF.notes} onChange={e=>setVF(p=>({...p,notes:e.target.value}))} placeholder="Notes…" style={INP}/></div>
            </div>
            <div style={{padding:"14px 22px",borderTop:"1px solid #f3f4f6",display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button onClick={()=>{setShowVF(false);setVF({...EV});}} style={{...BS("#fff"),color:"#374151",border:"1px solid #d1d5db"}}>Cancel</button>
              <button onClick={checkIn} disabled={saving} style={BS("#059669")}><LogIn style={{width:13,height:13}}/>{saving?"…":"Check In Visitor"}</button>
            </div>
          </div>
        </div>
      )}

      {showCF&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"#fff",borderRadius:16,width:"100%",maxWidth:520,boxShadow:"0 20px 60px rgba(0,0,0,0.25)"}}>
            <div style={{padding:"18px 22px 14px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#0369a1,#1d4ed8)",display:"flex",alignItems:"center",justifyContent:"center"}}><PhoneIncoming style={{width:18,height:18,color:"#fff"}}/></div>
              <div style={{flex:1}}><div style={{fontSize:16,fontWeight:800}}>Log Call</div><div style={{fontSize:11,color:"#6b7280"}}>Record any call type</div></div>
              <button onClick={()=>{setShowCF(false);setCF({...EC});}} style={{padding:8,borderRadius:8,border:"none",background:"#f3f4f6",cursor:"pointer",lineHeight:0}}><X style={{width:16,height:16,color:"#6b7280"}}/></button>
            </div>
            <div style={{padding:"18px 22px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div><label style={{display:"block",fontSize:11.5,fontWeight:600,color:"#374151",marginBottom:4}}>Caller Name</label><input value={cF.caller_name} onChange={e=>setCF(p=>({...p,caller_name:e.target.value}))} placeholder="Full name" style={INP}/></div>
              <div><label style={{display:"block",fontSize:11.5,fontWeight:600,color:"#374151",marginBottom:4}}>Phone *</label><input value={cF.caller_phone} onChange={e=>setCF(p=>({...p,caller_phone:e.target.value}))} placeholder="+254 7xx xxx xxx" style={INP}/></div>
              <div style={{gridColumn:"span 2"}}><label style={{display:"block",fontSize:11.5,fontWeight:600,color:"#374151",marginBottom:4}}>Purpose</label><input value={cF.purpose} onChange={e=>setCF(p=>({...p,purpose:e.target.value}))} placeholder="Reason for call" style={INP}/></div>
              <div><label style={{display:"block",fontSize:11.5,fontWeight:600,color:"#374151",marginBottom:4}}>Type</label><select value={cF.call_status} onChange={e=>setCF(p=>({...p,call_status:e.target.value}))} style={INP}>{["incoming","outgoing","missed","voicemail"].map(s=><option key={s}>{s}</option>)}</select></div>
              <div><label style={{display:"block",fontSize:11.5,fontWeight:600,color:"#374151",marginBottom:4}}>Department</label><select value={cF.department} onChange={e=>setCF(p=>({...p,department:e.target.value}))} style={INP}><option value="">Select…</option>{DEPTS.map(d=><option key={d}>{d}</option>)}</select></div>
              <div><label style={{display:"block",fontSize:11.5,fontWeight:600,color:"#374151",marginBottom:4}}>Staff Contacted</label><input value={cF.staff_contacted} onChange={e=>setCF(p=>({...p,staff_contacted:e.target.value}))} placeholder="Name…" style={INP}/></div>
              <div><label style={{display:"block",fontSize:11.5,fontWeight:600,color:"#374151",marginBottom:4}}>Notes</label><input value={cF.notes} onChange={e=>setCF(p=>({...p,notes:e.target.value}))} placeholder="Notes…" style={INP}/></div>
            </div>
            <div style={{padding:"14px 22px",borderTop:"1px solid #f3f4f6",display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button onClick={()=>{setShowCF(false);setCF({...EC});}} style={{...BS("#fff"),color:"#374151",border:"1px solid #d1d5db"}}>Cancel</button>
              {cF.caller_phone&&<button onClick={()=>makeCall(cF.caller_phone,cF.caller_name||"Caller")} style={BS("#059669")}><Phone style={{width:13,height:13}}/>Call Now</button>}
              <button onClick={logCall} disabled={saving} style={BS("#0369a1")}><PhoneIncoming style={{width:13,height:13}}/>{saving?"…":"Log Call"}</button>
            </div>
          </div>
        </div>
      )}

      {showMF&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"#fff",borderRadius:16,width:"100%",maxWidth:500,boxShadow:"0 20px 60px rgba(0,0,0,0.25)"}}>
            <div style={{padding:"18px 22px 14px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#7c3aed,#6d28d9)",display:"flex",alignItems:"center",justifyContent:"center"}}><MessageSquare style={{width:18,height:18,color:"#fff"}}/></div>
              <div style={{flex:1}}><div style={{fontSize:16,fontWeight:800}}>Send SMS via Twilio</div><div style={{fontSize:11,color:"#6b7280"}}>From: {twilioPhone||"(set Twilio phone in Settings → SMS)"}</div></div>
              <button onClick={()=>{setShowMF(false);setMF({...EM});}} style={{padding:8,borderRadius:8,border:"none",background:"#f3f4f6",cursor:"pointer",lineHeight:0}}><X style={{width:16,height:16,color:"#6b7280"}}/></button>
            </div>
            <div style={{padding:"18px 22px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div><label style={{display:"block",fontSize:11.5,fontWeight:600,color:"#374151",marginBottom:4}}>Recipient *</label><input value={mF.recipient_name} onChange={e=>setMF(p=>({...p,recipient_name:e.target.value}))} placeholder="Full name" style={INP}/></div>
              <div><label style={{display:"block",fontSize:11.5,fontWeight:600,color:"#374151",marginBottom:4}}>Phone *</label><input value={mF.recipient_phone} onChange={e=>setMF(p=>({...p,recipient_phone:e.target.value}))} placeholder="+254 7xx xxx xxx" style={INP}/></div>
              <div><label style={{display:"block",fontSize:11.5,fontWeight:600,color:"#374151",marginBottom:4}}>Department</label><select value={mF.department} onChange={e=>setMF(p=>({...p,department:e.target.value}))} style={INP}><option value="">Select…</option>{DEPTS.map(d=><option key={d}>{d}</option>)}</select></div>
              <div><label style={{display:"block",fontSize:11.5,fontWeight:600,color:"#374151",marginBottom:4}}>Type</label><select value={mF.message_type} onChange={e=>setMF(p=>({...p,message_type:e.target.value}))} style={INP}><option value="sms">SMS</option><option value="whatsapp">WhatsApp</option></select></div>
              <div style={{gridColumn:"span 2"}}>
                <label style={{display:"block",fontSize:11.5,fontWeight:600,color:"#374151",marginBottom:4}}>Message *</label>
                <textarea value={mF.message_body} onChange={e=>setMF(p=>({...p,message_body:e.target.value}))} placeholder="Type your message…" rows={4} style={{...INP,resize:"vertical" as const}}/>
                <div style={{fontSize:10,color:"#9ca3af",marginTop:3}}>{mF.message_body.length}/160{mF.message_body.length>160?" · 2 parts":""}</div>
              </div>
            </div>
            <div style={{padding:"14px 22px",borderTop:"1px solid #f3f4f6",display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button onClick={()=>{setShowMF(false);setMF({...EM});}} style={{...BS("#fff"),color:"#374151",border:"1px solid #d1d5db"}}>Cancel</button>
              <button onClick={sendMsg} disabled={saving} style={BS("#7c3aed")}><Send style={{width:13,height:13}}/>{saving?"Sending…":"Send SMS"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
