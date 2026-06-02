/**
 * ProcurBosse v9.7 — Reception Desk
 * Tailored per role: every user gets a personalised view
 * Roles: admin/superadmin/webmaster → full | procurement_manager → full
 *        procurement_officer/accountant → visitors+messages+whatsapp
 *        inventory_manager/warehouse_officer → visitors+calls+messages
 *        requisitioner → visitors+messages (read-only)
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed,
  MessageSquare, UserCheck, UserX, Plus, X, Search,
  Send, Users, Building2, LogIn, LogOut, RefreshCw,
  Bell, Radio, Shield
} from "lucide-react";

const db = supabase as any;

const TWILIO_SMS  = "+16812972643";
const WHATSAPP_NO = "+14155238886";
const WA_LINK     = "https://api.whatsapp.com/send/?phone=%2B14155238886&text=join+bad-machine";
const MG_SID      = "MGd547d8e3273fda2d21afdd6856acb245";

const DEPTS = ["Pharmacy","Maternity","Casualty","Laboratory","X-Ray","Paediatrics",
  "Surgery","Medical","Outpatient","Administration","ICU","Procurement","HR","Finance","ICT"];

const fmt = (d:string) => d ? new Date(d).toLocaleString("en-KE",
  {day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit",hour12:true}) : "—";
const chip = (label:string, bg:string, fg:string) =>
  <span style={{padding:"2px 8px",borderRadius:10,background:bg,color:fg,
    fontSize:10.5,fontWeight:700,border:`1px solid ${fg}33`}}>
    {label.replace("_"," ")}
  </span>;

const CALL_COL:Record<string,string> = {incoming:"#0369a1",outgoing:"#059669",missed:"#dc2626",voicemail:"#9333ea"};
const VISIT_COL:Record<string,string> = {checked_in:"#059669",checked_out:"#6b7280",waiting:"#d97706",denied:"#dc2626"};
const BTN = (bg:string, extra?:React.CSSProperties):React.CSSProperties =>
  ({display:"flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:8,
    border:"none",background:bg,color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer",...extra});
const INP:React.CSSProperties = {padding:"8px 11px",border:"1.5px solid #d1d5db",borderRadius:7,
  fontSize:12.5,color:"#111827",background:"#fff",outline:"none",width:"100%",boxSizing:"border-box"};

// ── Role configuration ────────────────────────────────────────────
type TabId = "visitors"|"calls"|"messages"|"whatsapp"|"broadcast"|"dashboard";

interface RoleConfig {
  tabs:    TabId[];
  canAdd:  boolean;
  canCall: boolean;
  canSend: boolean;
  canBroadcast: boolean;
  label:   string;
  color:   string;
  welcome: string;
}

const ROLE_CONFIG: Record<string, RoleConfig> = {
  admin: {
    tabs:["dashboard","visitors","calls","messages","whatsapp","broadcast"],
    canAdd:true, canCall:true, canSend:true, canBroadcast:true,
    label:"Admin", color:"#374151",
    welcome:"Full Reception — all visitor, call, messaging and broadcast functions"
  },
  superadmin: {
    tabs:["dashboard","visitors","calls","messages","whatsapp","broadcast"],
    canAdd:true, canCall:true, canSend:true, canBroadcast:true,
    label:"Superadmin", color:"#7c3aed",
    welcome:"Full Reception access"
  },
  webmaster: {
    tabs:["dashboard","visitors","calls","messages","whatsapp","broadcast"],
    canAdd:true, canCall:true, canSend:true, canBroadcast:true,
    label:"Webmaster", color:"#0891b2",
    welcome:"Full Reception access"
  },
  procurement_manager: {
    tabs:["dashboard","visitors","calls","messages","whatsapp","broadcast"],
    canAdd:true, canCall:true, canSend:true, canBroadcast:true,
    label:"Proc. Manager", color:"#0078d4",
    welcome:"Procurement Reception — visitors, calls, messaging and broadcast"
  },
  procurement_officer: {
    tabs:["visitors","messages","whatsapp"],
    canAdd:true, canCall:false, canSend:true, canBroadcast:false,
    label:"Proc. Officer", color:"#0078d4",
    welcome:"Procurement Desk — visitor log, messages and WhatsApp"
  },
  accountant: {
    tabs:["visitors","messages","whatsapp"],
    canAdd:true, canCall:false, canSend:true, canBroadcast:false,
    label:"Accountant", color:"#059669",
    welcome:"Finance Reception — visitor log and messaging"
  },
  inventory_manager: {
    tabs:["visitors","calls","messages"],
    canAdd:true, canCall:true, canSend:true, canBroadcast:false,
    label:"Inv. Manager", color:"#d97706",
    welcome:"Inventory Desk — visitor log, call tracking and messages"
  },
  warehouse_officer: {
    tabs:["visitors","calls","messages"],
    canAdd:true, canCall:true, canSend:false, canBroadcast:false,
    label:"Warehouse", color:"#d97706",
    welcome:"Warehouse Reception — visitor and call log"
  },
  database_admin: {
    tabs:["dashboard","visitors","messages"],
    canAdd:false, canCall:false, canSend:false, canBroadcast:false,
    label:"DB Admin", color:"#374151",
    welcome:"Reception read-only view"
  },
  requisitioner: {
    tabs:["visitors","messages"],
    canAdd:true, canCall:false, canSend:false, canBroadcast:false,
    label:"Requisitioner", color:"#6b7280",
    welcome:"Reception — visitor log and read messages"
  },
};

const DEFAULT_CFG: RoleConfig = {
  tabs:["visitors","messages"], canAdd:true, canCall:false,
  canSend:false, canBroadcast:false,
  label:"User", color:"#6b7280", welcome:"Reception — visitor log"
};

// ── Dashboard stats ───────────────────────────────────────────────
function DashboardTab(){
  const [stats,setStats]=useState({visitors:0,active:0,calls:0,msgs:0,appointments:0});
  useEffect(()=>{
    const today=new Date(); today.setHours(0,0,0,0); const iso=today.toISOString();
    Promise.all([
      db.from("reception_visitors").select("id",{count:"exact",head:true}).gte("check_in_time",iso),
      db.from("reception_visitors").select("id",{count:"exact",head:true}).in("status",["waiting","checked_in"]),
      db.from("reception_calls").select("id",{count:"exact",head:true}).gte("called_at",iso),
      db.from("reception_messages").select("id",{count:"exact",head:true}).eq("direction","outbound").gte("created_at",iso),
      db.from("reception_appointments").select("id",{count:"exact",head:true}).gte("scheduled_time",iso),
    ]).then(([v,a,c,m,ap])=>{
      setStats({visitors:v.count||0,active:a.count||0,calls:c.count||0,msgs:m.count||0,appointments:ap.count||0});
    });
  },[]);
  const cards=[
    {l:"Today Visitors",  v:stats.visitors,     col:"#0078d4",icon:"👥"},
    {l:"Currently Active",v:stats.active,        col:"#059669",icon:"🟢"},
    {l:"Calls Today",     v:stats.calls,         col:"#9333ea",icon:"📞"},
    {l:"SMS Sent",        v:stats.msgs,          col:"#0891b2",icon:"💬"},
    {l:"Appointments",    v:stats.appointments,  col:"#d97706",icon:"📅"},
  ];
  return(
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:14}}>
      {cards.map(c=>(
        <div key={c.l} style={{background:"#fff",borderRadius:12,padding:"18px 16px",
          boxShadow:"0 2px 8px rgba(0,0,0,.06)",borderLeft:`4px solid ${c.col}`}}>
          <div style={{fontSize:22}}>{c.icon}</div>
          <div style={{fontSize:26,fontWeight:900,color:c.col,lineHeight:1.1}}>{c.v}</div>
          <div style={{fontSize:11,color:"#6b7280",fontWeight:600,marginTop:2}}>{c.l}</div>
        </div>
      ))}
    </div>
  );
}

// ── Visitors tab ──────────────────────────────────────────────────
function VisitorsTab({cfg}:{cfg:RoleConfig}){
  const [visitors,setVisitors]=useState<any[]>([]);
  const [search,setSearch]=useState("");
  const [form,setForm]=useState<any|null>(null);
  const [saving,setSaving]=useState(false);
  const [loading,setLoading]=useState(true);

  const load=useCallback(async()=>{
    setLoading(true);
    const {data}=await db.from("reception_visitors").select("*")
      .order("check_in_time",{ascending:false}).limit(50);
    setVisitors(data||[]); setLoading(false);
  },[]);

  useEffect(()=>{load();},[load]);

  const save=async()=>{
    if(!form?.full_name) return;
    setSaving(true);
    const rec={...form,status:form.status||"waiting",check_in_time:new Date().toISOString()};
    if(form.id){await db.from("reception_visitors").update(rec).eq("id",form.id);}
    else{await db.from("reception_visitors").insert(rec);}
    setSaving(false); setForm(null); load();
    toast({title:"Visitor saved"});
  };

  const checkout=async(id:string)=>{
    await db.from("reception_visitors").update({status:"checked_out",check_out_time:new Date().toISOString()}).eq("id",id);
    load();
  };

  const flt=visitors.filter(v=>!search||v.full_name?.toLowerCase().includes(search.toLowerCase())||v.id_number?.includes(search));

  return(
    <div>
      <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
        <div style={{position:"relative",flex:1,minWidth:180}}>
          <Search size={13} style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:"#9ca3af"}}/>
          <input style={{...INP,paddingLeft:28}} placeholder="Search visitors..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        {cfg.canAdd&&<button onClick={()=>setForm({})} style={BTN("#0078d4")}>
          <Plus size={13}/>New Visitor
        </button>}
        <button onClick={load} style={BTN("#6b7280")}><RefreshCw size={13}/></button>
      </div>

      {/* Add/Edit form */}
      {form&&(
        <div style={{background:"#f8fafc",border:"1.5px solid #e2e8f0",borderRadius:10,padding:16,marginBottom:14}}>
          <div style={{fontWeight:800,fontSize:13,color:"#0f172a",marginBottom:12}}>
            {form.id?"Edit":"New"} Visitor
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[["Full Name*","full_name","text"],["ID Number","id_number","text"],
              ["Phone","phone","tel"],["Organization","organization","text"],
              ["Purpose","purpose","text"],["Host Name","host_name","text"]
            ].map(([l,k,t])=>(
              <div key={k as string}>
                <label style={{fontSize:10.5,fontWeight:700,color:"#374151",display:"block",marginBottom:3}}>{l}</label>
                <input type={t as string} style={INP}
                  value={form[k as string]||""}
                  onChange={e=>setForm((f:any)=>({...f,[k as string]:e.target.value}))}/>
              </div>
            ))}
            <div>
              <label style={{fontSize:10.5,fontWeight:700,color:"#374151",display:"block",marginBottom:3}}>Department</label>
              <select style={{...INP,background:"#fff"}} value={form.host_department||""}
                onChange={e=>setForm((f:any)=>({...f,host_department:e.target.value}))}>
                <option value="">Select...</option>
                {DEPTS.map(d=><option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:10.5,fontWeight:700,color:"#374151",display:"block",marginBottom:3}}>Status</label>
              <select style={{...INP,background:"#fff"}} value={form.status||"waiting"}
                onChange={e=>setForm((f:any)=>({...f,status:e.target.value}))}>
                {["waiting","checked_in","checked_out","denied"].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{display:"flex",gap:8,marginTop:12}}>
            <button onClick={save} disabled={saving} style={BTN("#0078d4")}>
              {saving?<RefreshCw size={12} style={{animation:"spin .7s linear infinite"}}/>:<UserCheck size={12}/>}
              {saving?"Saving...":"Save Visitor"}
            </button>
            <button onClick={()=>setForm(null)} style={BTN("#6b7280")}><X size={12}/>Cancel</button>
          </div>
        </div>
      )}

      {loading?<div style={{textAlign:"center",padding:30,color:"#9ca3af"}}>Loading...</div>:(
        <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:420,overflowY:"auto"}}>
          {flt.length===0&&<div style={{textAlign:"center",padding:30,color:"#9ca3af",fontSize:13}}>No visitors found</div>}
          {flt.map(v=>(
            <div key={v.id} style={{background:"#fff",border:"1px solid #f1f5f9",borderRadius:9,
              padding:"10px 14px",display:"flex",alignItems:"center",gap:12,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
              <div style={{width:36,height:36,borderRadius:"50%",background:VISIT_COL[v.status]+"18",
                display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <Users size={16} color={VISIT_COL[v.status]}/>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:13,color:"#0f172a"}}>{v.full_name}</div>
                <div style={{fontSize:11,color:"#6b7280"}}>
                  {v.organization||v.purpose||"—"} · {v.host_department||"—"}
                </div>
                <div style={{fontSize:10,color:"#9ca3af",marginTop:1}}>{fmt(v.check_in_time)}</div>
              </div>
              {chip(v.status, VISIT_COL[v.status]+"18", VISIT_COL[v.status])}
              {cfg.canAdd&&v.status!=="checked_out"&&(
                <button onClick={()=>checkout(v.id)} style={BTN("#059669",{padding:"5px 10px",fontSize:11})}>
                  <LogOut size={11}/>Out
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Calls tab ─────────────────────────────────────────────────────
function CallsTab({cfg}:{cfg:RoleConfig}){
  const [calls,setCalls]=useState<any[]>([]);
  const [form,setForm]=useState<any|null>(null);
  const [saving,setSaving]=useState(false);

  useEffect(()=>{
    db.from("reception_calls").select("*").order("called_at",{ascending:false}).limit(60)
      .then(({data}:any)=>setCalls(data||[]));
  },[]);

  const save=async()=>{
    if(!form?.caller_name) return;
    setSaving(true);
    const rec={...form,called_at:new Date().toISOString(),duration:form.duration||0};
    await db.from("reception_calls").insert(rec);
    setSaving(false); setForm(null);
    db.from("reception_calls").select("*").order("called_at",{ascending:false}).limit(60)
      .then(({data}:any)=>setCalls(data||[]));
    toast({title:"Call logged"});
  };

  const CI:Record<string,any>={incoming:PhoneIncoming,outgoing:PhoneOutgoing,missed:PhoneMissed,voicemail:Phone};

  return(
    <div>
      {cfg.canCall&&(
        <button onClick={()=>setForm({call_type:"incoming"})} style={{...BTN("#0078d4"),marginBottom:14}}>
          <Plus size={13}/>Log Call
        </button>
      )}
      {form&&(
        <div style={{background:"#f8fafc",border:"1.5px solid #e2e8f0",borderRadius:10,padding:16,marginBottom:14}}>
          <div style={{fontWeight:800,fontSize:13,color:"#0f172a",marginBottom:12}}>Log Call</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[["Caller Name*","caller_name","text"],["Phone","caller_phone","tel"],
              ["Department","department","text"],["Notes","notes","text"]].map(([l,k,t])=>(
              <div key={k as string}>
                <label style={{fontSize:10.5,fontWeight:700,color:"#374151",display:"block",marginBottom:3}}>{l}</label>
                <input type={t as string} style={INP} value={form[k as string]||""}
                  onChange={e=>setForm((f:any)=>({...f,[k as string]:e.target.value}))}/>
              </div>
            ))}
            <div>
              <label style={{fontSize:10.5,fontWeight:700,color:"#374151",display:"block",marginBottom:3}}>Type</label>
              <select style={{...INP,background:"#fff"}} value={form.call_type||"incoming"}
                onChange={e=>setForm((f:any)=>({...f,call_type:e.target.value}))}>
                {["incoming","outgoing","missed","voicemail"].map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:10.5,fontWeight:700,color:"#374151",display:"block",marginBottom:3}}>Duration (s)</label>
              <input type="number" style={INP} value={form.duration||0}
                onChange={e=>setForm((f:any)=>({...f,duration:+e.target.value}))}/>
            </div>
          </div>
          <div style={{display:"flex",gap:8,marginTop:12}}>
            <button onClick={save} disabled={saving} style={BTN("#0078d4")}>
              {saving?<RefreshCw size={12} style={{animation:"spin .7s linear infinite"}}/>:<Phone size={12}/>}
              Save
            </button>
            <button onClick={()=>setForm(null)} style={BTN("#6b7280")}><X size={12}/>Cancel</button>
          </div>
        </div>
      )}
      <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:440,overflowY:"auto"}}>
        {calls.length===0&&<div style={{textAlign:"center",padding:30,color:"#9ca3af",fontSize:13}}>No calls logged today</div>}
        {calls.map(c=>{
          const Icon=CI[c.call_type]||Phone;
          return(
            <div key={c.id} style={{background:"#fff",border:"1px solid #f1f5f9",borderRadius:9,
              padding:"9px 14px",display:"flex",alignItems:"center",gap:11,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
              <div style={{width:34,height:34,borderRadius:"50%",background:CALL_COL[c.call_type]+"18",
                display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <Icon size={15} color={CALL_COL[c.call_type]}/>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:12.5,color:"#0f172a"}}>{c.caller_name||"Unknown"}</div>
                <div style={{fontSize:11,color:"#6b7280"}}>{c.caller_phone||"—"} · {c.department||"—"}</div>
                <div style={{fontSize:10,color:"#9ca3af"}}>{fmt(c.called_at)} · {c.duration||0}s</div>
              </div>
              {chip(c.call_type,CALL_COL[c.call_type]+"18",CALL_COL[c.call_type])}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Messages tab ──────────────────────────────────────────────────
function MessagesTab({cfg}:{cfg:RoleConfig}){
  const [msgs,setMsgs]=useState<any[]>([]);
  const [to,setTo]=useState(""); const [msg,setMsg]=useState("");
  const [name,setName]=useState(""); const [dept,setDept]=useState("");
  const [sending,setSending]=useState(false);
  const [conv,setConv]=useState<any[]>([]);

  useEffect(()=>{
    db.from("reception_messages").select("*").order("created_at",{ascending:false}).limit(40)
      .then(({data}:any)=>setMsgs(data||[]));
    db.from("sms_conversations").select("*").order("last_message_at",{ascending:false}).limit(20)
      .then(({data}:any)=>setConv(data||[]));
  },[]);

  const send=async()=>{
    if(!to||!msg) return;
    setSending(true);
    const {data,error}=await db.functions.invoke("send-sms",{
      body:{to,message:msg,recipient_name:name,department:dept,module:"reception"}
    });
    setSending(false);
    if(error||!data?.ok){
      toast({title:"Send failed",description:data?.results?.[0]?.error||error?.message,variant:"destructive"});
    } else {
      toast({title:`SMS sent to ${to}`,description:`SID: ${data.results?.[0]?.sid||"sent"}`});
      setTo(""); setMsg(""); setName(""); setDept("");
      db.from("reception_messages").select("*").order("created_at",{ascending:false}).limit(40)
        .then(({data}:any)=>setMsgs(data||[]));
    }
  };

  return(
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
      {/* Compose */}
      <div style={{background:"#fff",border:"1px solid #f1f5f9",borderRadius:10,padding:16,boxShadow:"0 2px 6px rgba(0,0,0,.05)"}}>
        <div style={{fontWeight:800,fontSize:13,color:"#0f172a",marginBottom:12}}>
          💬 Send SMS {!cfg.canSend&&<span style={{fontSize:10,color:"#9ca3af",fontWeight:500}}>(read-only)</span>}
        </div>
        {cfg.canSend&&(
          <>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
              {[["Phone*","tel",to,setTo],["Name","text",name,setName]].map(([l,t,v,s]:any)=>(
                <div key={l}><label style={{fontSize:10.5,fontWeight:700,color:"#374151",display:"block",marginBottom:3}}>{l}</label>
                  <input type={t} style={INP} placeholder={l} value={v} onChange={e=>s(e.target.value)}/>
                </div>
              ))}
            </div>
            <div style={{marginBottom:8}}>
              <label style={{fontSize:10.5,fontWeight:700,color:"#374151",display:"block",marginBottom:3}}>Department</label>
              <select style={{...INP,background:"#fff"}} value={dept} onChange={e=>setDept(e.target.value)}>
                <option value="">All</option>
                {DEPTS.map(d=><option key={d}>{d}</option>)}
              </select>
            </div>
            <div style={{marginBottom:10}}>
              <label style={{fontSize:10.5,fontWeight:700,color:"#374151",display:"block",marginBottom:3}}>Message*</label>
              <textarea style={{...INP,resize:"vertical",minHeight:72}} value={msg}
                onChange={e=>setMsg(e.target.value)} placeholder="Type message..."/>
              <div style={{fontSize:9.5,color:"#9ca3af",marginTop:2}}>[EL5 MediProcure] prefix auto-added · MG SID: {MG_SID.slice(0,12)}...</div>
            </div>
            <button onClick={send} disabled={sending||!to||!msg} style={{...BTN(sending||!to||!msg?"#9ca3af":"#0078d4"),width:"100%",justifyContent:"center"}}>
              {sending?<RefreshCw size={13} style={{animation:"spin .7s linear infinite"}}/>:<Send size={13}/>}
              {sending?"Sending...":"Send SMS"}
            </button>
          </>
        )}
        {/* Recent */}
        <div style={{marginTop:14,maxHeight:220,overflowY:"auto"}}>
          {msgs.slice(0,8).map(m=>(
            <div key={m.id} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #f8fafc"}}>
              <div>
                <div style={{fontSize:11.5,fontWeight:700,color:"#0f172a"}}>{m.recipient_phone}</div>
                <div style={{fontSize:10.5,color:"#6b7280"}}>{(m.message_body||"").slice(0,60)}</div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:10,color:m.status==="sent"?"#059669":"#dc2626",fontWeight:700}}>{m.status}</div>
                <div style={{fontSize:9.5,color:"#9ca3af"}}>{fmt(m.sent_at||m.created_at)}</div>
              </div>
            </div>
          ))}
          {msgs.length===0&&<div style={{textAlign:"center",padding:20,color:"#9ca3af",fontSize:12}}>No messages</div>}
        </div>
      </div>

      {/* Conversations */}
      <div style={{background:"#fff",border:"1px solid #f1f5f9",borderRadius:10,padding:16,boxShadow:"0 2px 6px rgba(0,0,0,.05)"}}>
        <div style={{fontWeight:800,fontSize:13,color:"#0f172a",marginBottom:12}}>💬 Conversations</div>
        <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:380,overflowY:"auto"}}>
          {conv.length===0&&<div style={{textAlign:"center",padding:20,color:"#9ca3af",fontSize:12}}>No conversations</div>}
          {conv.map(c=>(
            <div key={c.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",
              background:"#f8fafc",borderRadius:8,border:"1px solid #f1f5f9"}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:"#0078d418",
                display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <MessageSquare size={14} color="#0078d4"/>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:12,color:"#0f172a"}}>{c.contact_name||c.phone_number}</div>
                <div style={{fontSize:10.5,color:"#6b7280",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.last_message}</div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                {c.unread_count>0&&<span style={{background:"#dc2626",color:"#fff",borderRadius:8,
                  fontSize:9,fontWeight:800,padding:"1px 5px"}}>{c.unread_count}</span>}
                <div style={{fontSize:9.5,color:"#9ca3af",marginTop:2}}>{fmt(c.last_message_at)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── WhatsApp tab ──────────────────────────────────────────────────
function WhatsAppTab(){
  const [sessions,setSessions]=useState<any[]>([]);
  const [renewing,setRenewing]=useState(false);

  useEffect(()=>{
    db.from("sms_conversations").select("*").order("last_message_at",{ascending:false}).limit(30)
      .then(({data}:any)=>setSessions(data||[]));
  },[]);

  const renewAll=async()=>{
    setRenewing(true);
    await db.functions.invoke("send-sms",{body:{},headers:{"x-action":"renew"}});
    setRenewing(false);
    toast({title:"WhatsApp sessions renewed"});
  };

  return(
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
      <div style={{background:"#fff",border:"1px solid #dcfce7",borderRadius:10,padding:20,boxShadow:"0 2px 6px rgba(0,0,0,.05)"}}>
        <div style={{fontWeight:800,fontSize:15,color:"#166534",marginBottom:4}}>🟢 WhatsApp Sandbox</div>
        <div style={{fontSize:12,color:"#6b7280",marginBottom:14}}>
          Join the EL5 MediProcure WhatsApp sandbox to receive procurement notifications.
        </div>
        {[
          ["WhatsApp Number", WHATSAPP_NO],
          ["Join Code", "join bad-machine"],
          ["Messaging Service", MG_SID.slice(0,12)+"..."],
        ].map(([l,v])=>(
          <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #f0fdf4"}}>
            <span style={{fontSize:11.5,fontWeight:700,color:"#374151"}}>{l}</span>
            <span style={{fontSize:11.5,color:"#166534",fontWeight:700,fontFamily:"monospace"}}>{v}</span>
          </div>
        ))}
        <div style={{marginTop:14,display:"flex",gap:8}}>
          <a href={WA_LINK} target="_blank" rel="noopener noreferrer"
            style={{...BTN("#25D366"),textDecoration:"none",flex:1,justifyContent:"center"}}>
            <MessageSquare size={13}/>Open WhatsApp
          </a>
          <button onClick={renewAll} disabled={renewing} style={BTN("#0369a1")}>
            {renewing?<RefreshCw size={13} style={{animation:"spin .7s linear infinite"}}/>:<RefreshCw size={13}/>}
            Renew
          </button>
        </div>
      </div>
      <div style={{background:"#fff",border:"1px solid #f1f5f9",borderRadius:10,padding:16}}>
        <div style={{fontWeight:800,fontSize:13,color:"#0f172a",marginBottom:10}}>Active Sessions ({sessions.length})</div>
        <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:300,overflowY:"auto"}}>
          {sessions.length===0&&<div style={{textAlign:"center",padding:20,color:"#9ca3af",fontSize:12}}>No sessions</div>}
          {sessions.map(s=>{
            const h=(Date.now()-new Date(s.last_message_at||0).getTime())/3600000;
            const active=h<72;
            return(
              <div key={s.id} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 10px",
                background:active?"#f0fdf4":"#fef2f2",borderRadius:8,border:`1px solid ${active?"#bbf7d0":"#fecaca"}`}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:active?"#22c55e":"#dc2626",flexShrink:0}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#0f172a"}}>{s.contact_name||s.phone_number}</div>
                  <div style={{fontSize:10.5,color:"#6b7280",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.last_message}</div>
                </div>
                <div style={{fontSize:9.5,color:active?"#166534":"#dc2626",fontWeight:700,flexShrink:0}}>
                  {active?"Active":"Expired"}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Broadcast tab ─────────────────────────────────────────────────
function BroadcastTab(){
  const [msg,setMsg]=useState(""); const [ch,setCh]=useState<"sms"|"whatsapp">("sms");
  const [dpt,setDpt]=useState("All"); const [users,setUsers]=useState<any[]>([]);
  const [sel,setSel]=useState<string[]>([]); const [result,setResult]=useState<any>(null);
  const [sending,setSending]=useState(false);

  useEffect(()=>{
    db.from("profiles").select("id,full_name,phone_number,department").not("phone_number","is",null)
      .then(({data}:any)=>{setUsers(data||[]);setSel((data||[]).map((u:any)=>u.id));});
  },[]);

  const filtered=dpt==="All"?users:users.filter((u:any)=>u.department===dpt);
  const targets=filtered.filter((u:any)=>sel.includes(u.id));

  const send=async()=>{
    if(!msg.trim()||targets.length===0) return;
    setSending(true); setResult(null);
    const phones=targets.map((u:any)=>u.phone_number).filter(Boolean);
    const {data,error}=await db.functions.invoke("send-sms",{
      body:{to:phones,message:msg,channel:ch,department:"broadcast",module:"broadcast"}
    });
    setSending(false);
    setResult(data||{ok:false,error:error?.message});
  };

  return(
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
      <div style={{background:"#fff",border:"1px solid #f1f5f9",borderRadius:10,padding:16,boxShadow:"0 2px 6px rgba(0,0,0,.05)"}}>
        <div style={{fontWeight:800,fontSize:13,color:"#0f172a",marginBottom:12}}>📢 Broadcast Message</div>
        <div style={{display:"flex",gap:6,marginBottom:10}}>
          {(["sms","whatsapp"] as const).map(c=>(
            <button key={c} onClick={()=>setCh(c)}
              style={{...BTN(ch===c?"#0078d4":"#f1f5f9"),color:ch===c?"#fff":"#374151",flex:1,fontSize:11.5,justifyContent:"center"}}>
              {c==="sms"?"📱 SMS":"🟢 WhatsApp"}
            </button>
          ))}
        </div>
        <div style={{marginBottom:8}}>
          <label style={{fontSize:10.5,fontWeight:700,color:"#374151",display:"block",marginBottom:3}}>Department Filter</label>
          <select style={{...INP,background:"#fff"}} value={dpt} onChange={e=>setDpt(e.target.value)}>
            {["All",...DEPTS].map(d=><option key={d}>{d}</option>)}
          </select>
        </div>
        <div style={{marginBottom:10}}>
          <label style={{fontSize:10.5,fontWeight:700,color:"#374151",display:"block",marginBottom:3}}>Message</label>
          <textarea style={{...INP,resize:"vertical",minHeight:90}} value={msg}
            onChange={e=>setMsg(e.target.value)} placeholder="Type broadcast message..."/>
          <div style={{fontSize:9.5,color:"#9ca3af",marginTop:2}}>{msg.length}/1560 chars</div>
        </div>
        <button onClick={send} disabled={sending||!msg.trim()||targets.length===0}
          style={{...BTN(sending||!msg.trim()||targets.length===0?"#9ca3af":"#0078d4"),width:"100%",justifyContent:"center"}}>
          {sending?<RefreshCw size={13} style={{animation:"spin .7s linear infinite"}}/>:<Send size={13}/>}
          {sending?`Sending to ${targets.length}...`:`Send to ${targets.length} users`}
        </button>
        {result&&(
          <div style={{marginTop:10,padding:"9px 12px",borderRadius:8,
            background:result.ok?"#f0fdf4":"#fef2f2",border:`1px solid ${result.ok?"#bbf7d0":"#fecaca"}`}}>
            <div style={{fontSize:12,fontWeight:700,color:result.ok?"#166534":"#dc2626"}}>
              {result.ok?`✅ Sent: ${result.sent}/${result.total}`:`❌ ${result.error||"Failed"}`}
            </div>
            {result.failed>0&&<div style={{fontSize:11,color:"#d97706",marginTop:2}}>⚠️ {result.failed} failed</div>}
          </div>
        )}
      </div>
      <div style={{background:"#fff",border:"1px solid #f1f5f9",borderRadius:10,padding:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontWeight:800,fontSize:13,color:"#0f172a"}}>
            Recipients ({targets.length}/{filtered.length})
          </div>
          <div style={{display:"flex",gap:6}}>
            <button onClick={()=>setSel(filtered.map((u:any)=>u.id))} style={{...BTN("#0078d4"),padding:"4px 10px",fontSize:11}}>All</button>
            <button onClick={()=>setSel([])} style={{...BTN("#6b7280"),padding:"4px 10px",fontSize:11}}>None</button>
          </div>
        </div>
        <div style={{maxHeight:340,overflowY:"auto",display:"flex",flexDirection:"column",gap:5}}>
          {filtered.length===0&&<div style={{textAlign:"center",padding:20,color:"#9ca3af",fontSize:12}}>No users with phones</div>}
          {filtered.map((u:any)=>(
            <div key={u.id} onClick={()=>setSel(s2=>s2.includes(u.id)?s2.filter(x=>x!==u.id):[...s2,u.id])}
              style={{display:"flex",alignItems:"center",gap:8,padding:"7px 9px",borderRadius:7,cursor:"pointer",
                background:sel.includes(u.id)?"#eff6ff":"#f8fafc",
                border:`1px solid ${sel.includes(u.id)?"#93c5fd":"#f1f5f9"}`}}>
              <div style={{width:13,height:13,borderRadius:3,border:`2px solid ${sel.includes(u.id)?"#0078d4":"#d1d5db"}`,
                background:sel.includes(u.id)?"#0078d4":"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                {sel.includes(u.id)&&<span style={{color:"#fff",fontSize:8,lineHeight:1}}>✓</span>}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:11.5,fontWeight:700,color:"#0f172a",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.full_name||"—"}</div>
                <div style={{fontSize:10,color:"#6b7280"}}>{u.phone_number}</div>
              </div>
              {u.department&&<span style={{fontSize:9,background:"#e0f2fe",color:"#0369a1",padding:"1px 6px",borderRadius:5,fontWeight:600,flexShrink:0}}>{u.department}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
const TAB_LABELS: Record<TabId,string> = {
  dashboard:"📊 Dashboard", visitors:"👥 Visitors",
  calls:"📞 Calls", messages:"💬 Messages",
  whatsapp:"🟢 WhatsApp", broadcast:"📢 Broadcast",
};

export default function ReceptionPage() {
  const { primaryRole, profile } = useAuth();
  const role = primaryRole || "requisitioner";
  const cfg  = ROLE_CONFIG[role] || DEFAULT_CFG;
  const [tab, setTab] = useState<TabId>(cfg.tabs[0]);

  // Ensure tab is always valid for role
  const activeTab: TabId = cfg.tabs.includes(tab) ? tab : cfg.tabs[0];

  const TEAL = "#0891b2";

  return (
    <div style={{ padding: "20px 24px", background: "#f8fafc", minHeight: "100vh",
      fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10,
            background: `linear-gradient(135deg,${cfg.color},${cfg.color}cc)`,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Building2 size={18} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "#0f172a" }}>
              Reception Desk
            </h1>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 1 }}>
              <span style={{ background: cfg.color + "18", color: cfg.color, fontWeight: 700,
                fontSize: 10, padding: "1px 7px", borderRadius: 8, marginRight: 6 }}>
                {cfg.label}
              </span>
              {cfg.welcome}
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 18, flexWrap: "wrap" }}>
        {cfg.tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: "8px 14px", borderRadius: 8, border: "none", cursor: "pointer",
              fontWeight: 700, fontSize: 12,
              background: activeTab === t ? cfg.color : "#fff",
              color: activeTab === t ? "#fff" : "#374151",
              boxShadow: activeTab === t ? `0 2px 8px ${cfg.color}44` : "0 1px 3px rgba(0,0,0,.06)",
              transition: "all .15s" }}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "dashboard" && <DashboardTab />}
        {activeTab === "visitors"  && <VisitorsTab  cfg={cfg} />}
        {activeTab === "calls"     && <CallsTab     cfg={cfg} />}
        {activeTab === "messages"  && <MessagesTab  cfg={cfg} />}
        {activeTab === "whatsapp"  && <WhatsAppTab  />}
        {activeTab === "broadcast" && <BroadcastTab />}
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
