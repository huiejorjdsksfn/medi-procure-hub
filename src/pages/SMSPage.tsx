/**
 * EL5 MediProcure  -- SMS Management Dashboard
 * Two-way SMS * Bulk Send * Templates * Conversations * Metrics
 * ProcurBosse * Embu Level 5 Hospital * SMS Gateway
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtime } from "@/hooks/useRealtime";
import { SMSAPI, SMSMessage, SMSTemplate, SMSConversation, BulkOperation } from "@/lib/api/SMSAPI";
import { useAuth } from "@/contexts/AuthContext";
import { Send, RefreshCw, Plus, X, Search, Copy, Check, Trash2 } from "lucide-react";

const db = supabase as any;
type Tab = "compose"|"history"|"conversations"|"templates"|"bulk"|"metrics";
const STATUS_C:Record<string,string> = {sent:"#22c55e",delivered:"#3b82f6",failed:"#ef4444",pending:"#f97316",received:"#8b5cf6",queued:"#f59e0b"};
const fmtDate=(s:string)=>new Date(s).toLocaleString("en-KE",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit",hour12:true});
const card:React.CSSProperties={background:"#fff",borderRadius:12,border:"1px solid #f1f5f9",padding:"20px 24px",boxShadow:"0 2px 8px rgba(0,0,0,0.05)"};
const inp:React.CSSProperties={width:"100%",padding:"9px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box",color:"#374151"};
const btn=(bg:string,disabled=false):React.CSSProperties=>({padding:"9px 18px",background:disabled?"#9ca3af":bg,color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:disabled?"not-allowed":"pointer"});
function Chip({label,color}:{label:string;color:string}){return <span style={{padding:"2px 10px",borderRadius:12,fontSize:10,fontWeight:700,background:color+"18",color,border:`1px solid ${color}33`,textTransform:"uppercase"}}>{label}</span>;}

const DEPTS=["All","Procurement","Finance","Inventory","Pharmacy","Maternity","Casualty","Laboratory","Administration","ICT","HR"];
const TEMPLATES_PRESETS=[
  {name:"Visitor Arrival",content:"Hello {{host_name}}, your visitor {{visitor_name}} has arrived at Embu Level 5 Hospital reception. Please proceed to reception. Time: {{time}}",variables:["host_name","visitor_name","time"],category:"notification"},
  {name:"Appointment Reminder",content:"Reminder: Appointment at EL5 Hospital on {{date}} at {{time}} with {{host_name}}, {{department}}. Please bring your national ID.",variables:["date","time","host_name","department"],category:"appointment"},
  {name:"Low Stock Alert",content:"STOCK ALERT: {{item_name}} is critically low ({{current}} {{unit}}). Reorder level: {{reorder}}. Please initiate procurement urgently. EL5 Inventory.",variables:["item_name","current","unit","reorder"],category:"alert"},
  {name:"Requisition Approved",content:"Your requisition {{req_id}} has been APPROVED by {{approver}}. It will proceed to PO generation. EL5 MediProcure.",variables:["req_id","approver"],category:"procurement"},
  {name:"Payment Processed",content:"Payment of KES {{amount}} to {{payee}} (Voucher {{voucher_id}}) has been processed. Ref: {{reference}}. EL5 Finance.",variables:["amount","payee","voucher_id","reference"],category:"finance"},
];

export default function SMSPage() {
  const { roles } = useAuth();
  const [tab, setTab] = useState<Tab>("compose");
  const [messages, setMessages] = useState<SMSMessage[]>([]);
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [conversations, setConversations] = useState<SMSConversation[]>([]);
  const [bulkOps, setBulkOps] = useState<BulkOperation[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Compose state
  const [to, setTo] = useState("");
  const [body, setBody] = useState("");
  const [msgType, setMsgType] = useState<"sms"|"whatsapp">("sms");
  const [dept, setDept] = useState("");
  const [name, setName] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");

  // Bulk state
  const [bulkRecipients, setBulkRecipients] = useState("");
  const [bulkBody, setBulkBody] = useState("");
  const [bulkName, setBulkName] = useState("");
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ok:number;failed:number;total:number}|null>(null);

  // Template editor
  const [editTpl, setEditTpl] = useState<Partial<SMSTemplate>|null>(null);
  const [savingTpl, setSavingTpl] = useState(false);

  // Conversation view
  const [activeCon, setActiveCon] = useState<SMSConversation|null>(null);
  const [conMessages, setConMessages] = useState<SMSMessage[]>([]);
  const [replyMsg, setReplyMsg] = useState("");
  const [replySending, setReplySending] = useState(false);

  const [search, setSearch] = useState("");
  const [localToast, setLocalToast] = useState("");
  const conEndRef = useRef<HTMLDivElement>(null);

  const showToast=(msg:string)=>{setLocalToast(msg);setTimeout(()=>setLocalToast(""),3000);};

  const loadAll = useCallback(async()=>{
    setLoading(true);
    try {
      const [data,m] = await Promise.all([SMSAPI.loadAll(), SMSAPI.getMetrics(7)]);
      setMessages(data.messages||[]); setTemplates(data.templates||[]);
      setConversations(data.conversations||[]); setBulkOps(data.bulkOps||[]); setMetrics(m);
    } catch(e:any){ console.warn('[SMS] load error:',e?.message); }
    finally { setLoading(false); }
  },[]);

  useEffect(()=>{loadAll();},[loadAll]);

  useEffect(()=>{
    const ch = db.channel("sms_rt")
      .on("postgres_changes",{event:"*",schema:"public",table:"reception_messages"},loadAll)
      .on("postgres_changes",{event:"*",schema:"public",table:"sms_conversations"},loadAll)
      .subscribe();
    return ()=>db.removeChannel(ch);
  },[loadAll]);

  useEffect(()=>{conEndRef.current?.scrollIntoView({behavior:"smooth"});},[conMessages]);

  async function sendSMS(){
    if(!to.trim()||!body.trim()){showToast("[!] Enter recipient and message");return;}
    setSending(true);
    const {ok,error}=await SMSAPI.send(to,body,{name,dept,type:msgType});
    setSending(false);
    if(ok){showToast("[OK] Message sent!");setTo("");setBody("");setName("");loadAll();}
    else showToast(`[X] Failed: ${error}`);
  }

  async function sendBulk(){
    const phones=bulkRecipients.split(/[\n,;]+/).map(p=>p.trim()).filter(Boolean);
    if(!phones.length||!bulkBody.trim()){showToast("[!] Enter recipients and message");return;}
    setBulkSending(true); setBulkProgress({ok:0,failed:0,total:phones.length});
    const res=await SMSAPI.sendBulk(phones,bulkBody,{name:bulkName});
    setBulkSending(false); setBulkProgress(res);
    showToast(`[OK] Bulk done: ${res.ok} sent, ${res.failed} failed`);
    setBulkRecipients(""); setBulkBody(""); loadAll();
  }

  async function applyTemplate(id:string){
    const tpl=templates.find(t=>t.id===id);
    if(tpl){setBody(tpl.content);setSelectedTemplate(id);showToast(` Template applied: ${tpl.name}`);}
  }

  async function saveTpl(){
    if(!editTpl?.name||!editTpl?.content){showToast("[!] Name and content required");return;}
    setSavingTpl(true);
    if(editTpl.id){await SMSAPI.updateTemplate(editTpl.id,editTpl);}
    else{await SMSAPI.createTemplate(editTpl);}
    setSavingTpl(false); setEditTpl(null);
    showToast("[OK] Template saved!"); loadAll();
  }

  async function openConversation(con:SMSConversation){
    setActiveCon(con);
    const msgs=await SMSAPI.getConversationMessages(con.phone_number);
    setConMessages(msgs);
  }

  async function sendReply(){
    if(!activeCon||!replyMsg.trim())return;
    setReplySending(true);
    await SMSAPI.send(activeCon.phone_number,replyMsg,{name:activeCon.contact_name||undefined});
    setReplyMsg(""); setReplySending(false);
    const msgs=await SMSAPI.getConversationMessages(activeCon.phone_number);
    setConMessages(msgs); loadAll();
  }

  const filteredMsgs=messages.filter(m=>!search||(m.recipient_phone||"").includes(search)||(m.recipient_name||"").toLowerCase().includes(search.toLowerCase())||(m.message_body||"").toLowerCase().includes(search.toLowerCase()));

  const TABS:{id:Tab;label:string;icon:string}[]=[
    {id:"compose",label:"Compose",icon:""},
    {id:"history",label:"History",icon:""},
    {id:"conversations",label:"Conversations",icon:""},
    {id:"templates",label:"Templates",icon:""},
    {id:"bulk",label:"Bulk Send",icon:""},
    {id:"metrics",label:"Metrics",icon:""},
  ];

  return(
    <div style={{padding:"20px 24px",fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",maxWidth:1400,margin:"0 auto"}}>
      {localToast&&<div style={{position:"fixed",top:20,right:20,background:"#1e293b",color:"#fff",padding:"12px 20px",borderRadius:10,fontSize:13,fontWeight:600,zIndex:9999,boxShadow:"0 8px 24px rgba(0,0,0,0.3)"}}>{localToast}</div>}

      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:44,height:44,borderRadius:12,background:"linear-gradient(135deg,#7c3aed,#a855f7)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}></div>
          <div>
            <h1 style={{margin:0,fontSize:22,fontWeight:800,color:"#0f172a"}}>SMS & Messaging</h1>
            <div style={{fontSize:12,color:"#6b7280",marginTop:2}}>SMS & WhatsApp</div>
          </div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div style={{padding:"5px 12px",borderRadius:20,background:"#f0fdf4",border:"1px solid #bbf7d0",fontSize:11,fontWeight:700,color:"#059669"}}> Twilio Active</div>
          <button onClick={loadAll} style={{...btn("#64748b"),padding:"7px 14px"}}><RefreshCw style={{width:12,height:12,display:"inline",marginRight:4}}/>Refresh</button>
        </div>
      </div>

      {/* KPIs */}
      {metrics&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:12,marginBottom:20}}>
        {[
          {label:"Total (7d)",value:metrics.total,color:"#6b7280",icon:""},
          {label:"Sent",value:metrics.sent,color:"#22c55e",icon:""},
          {label:"Received",value:metrics.received,color:"#3b82f6",icon:""},
          {label:"Failed",value:metrics.failed,color:"#ef4444",icon:"[X]"},
          {label:"WhatsApp",value:metrics.whatsapp,color:"#25D366",icon:""},
          {label:"Delivered",value:metrics.delivered,color:"#0891b2",icon:"[OK]"},
        ].map((k,i)=>(
          <div key={i} style={{...card,padding:"12px 14px",borderLeft:`4px solid ${k.color}`}}>
            <div style={{display:"flex",justifyContent:"space-between"}}><div style={{fontSize:20,fontWeight:800,color:"#0f172a"}}>{loading?"...":k.value}</div><span style={{fontSize:18}}>{k.icon}</span></div>
            <div style={{fontSize:11,color:"#9ca3af",marginTop:3}}>{k.label}</div>
          </div>
        ))}
      </div>}

      {/* Tabs */}
      <div style={{display:"flex",gap:4,marginBottom:20,borderBottom:"2px solid #f1f5f9",overflowX:"auto",flexWrap:"nowrap"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"9px 16px",borderRadius:"8px 8px 0 0",fontSize:12.5,fontWeight:tab===t.id?700:500,cursor:"pointer",whiteSpace:"nowrap",background:tab===t.id?"#7c3aed":"transparent",color:tab===t.id?"#fff":"#6b7280",border:tab===t.id?"1.5px solid #7c3aed":"1.5px solid transparent"}}>
            {t.icon} {t.label}
            {t.id==="conversations"&&conversations.filter(c=>c.unread_count>0).length>0&&<span style={{marginLeft:6,background:"#ef4444",color:"#fff",borderRadius:10,padding:"0 5px",fontSize:10}}>{conversations.filter(c=>c.unread_count>0).length}</span>}
          </button>
        ))}
      </div>

      {/* -- COMPOSE -- */}
      {tab==="compose"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
          <div style={card}>
            <div style={{fontWeight:800,fontSize:15,color:"#0f172a",marginBottom:20}}> New Message</div>
            {/* Channel toggle */}
            <div style={{display:"flex",gap:6,marginBottom:14}}>
              {(["sms","whatsapp"] as const).map(ch=>(
                <button key={ch} onClick={()=>setMsgType(ch)} style={{flex:1,padding:"8px",borderRadius:8,fontSize:12,fontWeight:msgType===ch?700:500,border:`1.5px solid ${ch==="whatsapp"?"#25D366":"#7c3aed"}`,background:msgType===ch?(ch==="whatsapp"?"#25D36615":"#7c3aed15"):"transparent",color:ch==="whatsapp"?"#25D366":"#7c3aed",cursor:"pointer"}}>
                  {ch==="whatsapp"?" WhatsApp":" SMS"}
                </button>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <div><label style={{fontSize:11,fontWeight:700,color:"#374151",display:"block",marginBottom:5,textTransform:"uppercase"}}>Recipient Name</label><input value={name} onChange={e=>setName(e.target.value)} style={inp} placeholder="John Doe"/></div>
              <div><label style={{fontSize:11,fontWeight:700,color:"#374151",display:"block",marginBottom:5,textTransform:"uppercase"}}>Phone *</label><input value={to} onChange={e=>setTo(e.target.value)} style={inp} placeholder="+254700000000"/></div>
              <div><label style={{fontSize:11,fontWeight:700,color:"#374151",display:"block",marginBottom:5,textTransform:"uppercase"}}>Department</label>
                <select value={dept} onChange={e=>setDept(e.target.value)} style={inp}>
                  {DEPTS.map(d=><option key={d} value={d==="All"?"":d}>{d}</option>)}
                </select>
              </div>
              <div><label style={{fontSize:11,fontWeight:700,color:"#374151",display:"block",marginBottom:5,textTransform:"uppercase"}}>Apply Template</label>
                <select value={selectedTemplate} onChange={e=>applyTemplate(e.target.value)} style={inp}>
                  <option value=""> -- Select Template  --</option>
                  {templates.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{marginBottom:14}}>
              <label style={{fontSize:11,fontWeight:700,color:"#374151",display:"block",marginBottom:5,textTransform:"uppercase"}}>Message *</label>
              <textarea value={body} onChange={e=>setBody(e.target.value)} style={{...inp,height:120,resize:"vertical"}} placeholder="Type your message here..."/>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
                <span style={{fontSize:11,color:"#9ca3af"}}>{body.length}/1600 chars * {Math.ceil(body.length/160)||1} segment{Math.ceil(body.length/160)>1?"s":""}</span>
                {body&&<button onClick={()=>setBody("")} style={{fontSize:11,color:"#9ca3af",background:"none",border:"none",cursor:"pointer"}}>Clear</button>}
              </div>
            </div>
            {msgType==="whatsapp"&&<div style={{background:"#fff9ed",border:"1px solid #fde68a",borderRadius:8,padding:"10px 14px",marginBottom:14,fontSize:12,color:"#92400e"}}>[!] Recipient must first send <strong>join bad-machine</strong> to +14155238886 to activate WhatsApp sandbox.</div>}
            <button onClick={sendSMS} disabled={sending||!to||!body} style={{...btn(sending||!to||!body?"#9ca3af":msgType==="whatsapp"?"#25D366":"#7c3aed"),width:"100%",fontSize:14,padding:"12px"}}>
              {sending?"Sending...":`${msgType==="whatsapp"?"":""} Send ${msgType==="sms"?"SMS":"WhatsApp"}`}
            </button>
          </div>
          {/* Quick templates sidebar */}
          <div style={card}>
            <div style={{fontWeight:700,fontSize:15,color:"#0f172a",marginBottom:16}}> Quick Templates</div>
            {templates.slice(0,6).map(t=>(
              <div key={t.id} style={{padding:"12px",borderRadius:10,border:"1.5px solid #f1f5f9",marginBottom:8,background:"#fafafa",cursor:"pointer"}} onClick={()=>applyTemplate(t.id)}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.border="1.5px solid #7c3aed30"}
                onMouseLeave={e=>(e.currentTarget as HTMLElement).style.border="1.5px solid #f1f5f9"}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div style={{fontWeight:700,fontSize:13,color:"#0f172a"}}>{t.name}</div>
                  <Chip label={t.category} color={t.category==="alert"?"#ef4444":t.category==="procurement"?"#3b82f6":"#6b7280"}/>
                </div>
                <div style={{fontSize:11,color:"#6b7280",marginTop:4,lineHeight:1.5}}>{t.content.slice(0,80)}...</div>
                {t.variables.length>0&&<div style={{fontSize:10,color:"#9ca3af",marginTop:4}}>Variables: {t.variables.map(v=>`{{${v}}}`).join(", ")}</div>}
              </div>
            ))}
            <button onClick={()=>setTab("templates")} style={{width:"100%",padding:"9px",background:"#f8fafc",border:"1.5px solid #e2e8f0",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,color:"#374151"}}>
              View All Templates  Next
            </button>
          </div>
        </div>
      )}

      {/* -- HISTORY -- */}
      {tab==="history"&&(
        <div style={card}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
            <div style={{fontWeight:700,fontSize:15,color:"#0f172a"}}> Message History</div>
            <div style={{position:"relative",width:260}}>
              <Search style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",width:13,height:13,color:"#9ca3af"}}/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search messages..." style={{...inp,paddingLeft:30}}/>
            </div>
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr style={{background:"#f8fafc"}}>
                {["Dir","Recipient","Phone","Type","Message","Status","Sent At"].map(h=>(
                  <th key={h} style={{fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.06em",padding:"10px 14px",borderBottom:"2px solid #f1f5f9",textAlign:"left"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {loading?<tr><td colSpan={7} style={{textAlign:"center",padding:"32px",color:"#9ca3af"}}>Loading...</td></tr>:
                filteredMsgs.slice(0,100).map((m,idx)=>(
                  <tr key={m.id||idx} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f8fafc"} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=""}>
                    <td style={{padding:"10px 14px",borderBottom:"1px solid #f8fafc",fontSize:16}}>{(m as any).direction==="inbound"?"":""}</td>
                    <td style={{padding:"10px 14px",borderBottom:"1px solid #f8fafc",fontSize:13,fontWeight:600,color:"#0f172a"}}>{(m as any).recipient_name||" --"}</td>
                    <td style={{padding:"10px 14px",borderBottom:"1px solid #f8fafc",fontSize:12,color:"#374151",fontFamily:"monospace"}}>{(m as any).recipient_phone}</td>
                    <td style={{padding:"10px 14px",borderBottom:"1px solid #f8fafc"}}><Chip label={(m as any).message_type||"sms"} color={(m as any).message_type==="whatsapp"?"#25D366":"#7c3aed"}/></td>
                    <td style={{padding:"10px 14px",borderBottom:"1px solid #f8fafc",fontSize:12,color:"#374151",maxWidth:240,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(m as any).message_body}</td>
                    <td style={{padding:"10px 14px",borderBottom:"1px solid #f8fafc"}}><Chip label={(m as any).status||"pending"} color={STATUS_C[(m as any).status]||"#6b7280"}/></td>
                    <td style={{padding:"10px 14px",borderBottom:"1px solid #f8fafc",fontSize:11,color:"#9ca3af"}}>{fmtDate((m as any).sent_at||(m as any).created_at)}</td>
                  </tr>
                ))}
                {!loading&&filteredMsgs.length===0&&<tr><td colSpan={7} style={{textAlign:"center",padding:"40px",color:"#9ca3af"}}>No messages found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -- CONVERSATIONS -- */}
      {tab==="conversations"&&(
        <div style={{display:"grid",gridTemplateColumns:"300px 1fr",gap:16,height:600}}>
          <div style={{...card,overflowY:"auto",padding:"12px"}}>
            <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"#0f172a"}}> Conversations</div>
            {conversations.map(con=>(
              <div key={con.id} onClick={()=>openConversation(con)} style={{padding:"12px",borderRadius:10,border:`1.5px solid ${activeCon?.id===con.id?"#7c3aed":"#f1f5f9"}`,background:activeCon?.id===con.id?"#7c3aed10":"#fafafa",cursor:"pointer",marginBottom:6,transition:"all 0.15s"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div style={{fontWeight:700,fontSize:13,color:"#0f172a"}}>{con.contact_name||con.phone_number}</div>
                  {con.unread_count>0&&<span style={{background:"#ef4444",color:"#fff",borderRadius:10,padding:"0 6px",fontSize:10,fontWeight:700}}>{con.unread_count}</span>}
                </div>
                <div style={{fontSize:11,color:"#9ca3af",fontFamily:"monospace",marginTop:2}}>{con.phone_number}</div>
                {con.last_message&&<div style={{fontSize:11,color:"#6b7280",marginTop:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{con.last_message}</div>}
                <div style={{display:"flex",gap:6,marginTop:4,justifyContent:"space-between",alignItems:"center"}}>
                  <Chip label={con.status} color={con.status==="open"?"#059669":con.status==="assigned"?"#3b82f6":"#6b7280"}/>
                  <span style={{fontSize:10,color:"#d1d5db"}}>{con.last_message_at?fmtDate(con.last_message_at):""}</span>
                </div>
              </div>
            ))}
            {conversations.length===0&&<div style={{textAlign:"center",padding:"24px",color:"#9ca3af",fontSize:13}}>No conversations yet</div>}
          </div>

          <div style={{...card,display:"flex",flexDirection:"column",overflow:"hidden",padding:0}}>
            {activeCon ? (
              <>
                <div style={{padding:"14px 20px",borderBottom:"1px solid #f1f5f9",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:15,color:"#0f172a"}}>{activeCon.contact_name||activeCon.phone_number}</div>
                    <div style={{fontSize:11,color:"#9ca3af",fontFamily:"monospace"}}>{activeCon.phone_number}</div>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>SMSAPI.closeConversation(activeCon.id).then(()=>{setActiveCon(null);loadAll();})} style={{padding:"6px 12px",background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,fontSize:12,color:"#ef4444",cursor:"pointer",fontWeight:600}}>Close</button>
                  </div>
                </div>
                <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:8}}>
                  {conMessages.map((m,i)=>{
                    const out=(m as any).direction==="outbound";
                    return(
                      <div key={i} style={{display:"flex",justifyContent:out?"flex-end":"flex-start"}}>
                        <div style={{maxWidth:"70%",padding:"10px 14px",borderRadius:out?"12px 12px 0 12px":"12px 12px 12px 0",background:out?"#7c3aed":"#f1f5f9",color:out?"#fff":"#374151",fontSize:13}}>
                          {(m as any).message_body}
                          <div style={{fontSize:10,color:out?"rgba(255,255,255,0.6)":"#9ca3af",marginTop:4}}>{fmtDate((m as any).created_at)}</div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={conEndRef}/>
                </div>
                <div style={{padding:"12px 20px",borderTop:"1px solid #f1f5f9",display:"flex",gap:8}}>
                  <input value={replyMsg} onChange={e=>setReplyMsg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&sendReply()} placeholder="Type a reply..." style={{...inp,flex:1}}/>
                  <button onClick={sendReply} disabled={replySending||!replyMsg} style={btn(replySending||!replyMsg?"#9ca3af":"#7c3aed")}>
                    <Send style={{width:14,height:14}}/>
                  </button>
                </div>
              </>
            ) : (
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",flex:1,flexDirection:"column",color:"#9ca3af"}}>
                <div style={{fontSize:48,marginBottom:12}}></div>
                <div>Select a conversation</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* -- TEMPLATES -- */}
      {tab==="templates"&&(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
            <div style={{fontWeight:700,fontSize:15,color:"#0f172a"}}> SMS Templates ({templates.length})</div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setEditTpl({name:"",content:"",variables:[],category:"general"})} style={btn("linear-gradient(135deg,#7c3aed,#6d28d9)")}>+ New Template</button>
              {TEMPLATES_PRESETS.length>templates.length&&(
                <button onClick={async()=>{for(const t of TEMPLATES_PRESETS){if(!templates.find(x=>x.name===t.name)){await SMSAPI.createTemplate(t);}}loadAll();showToast("[OK] Default templates added!");}} style={{...btn("linear-gradient(135deg,#059669,#047857)"),fontSize:12}}>
                   Add Defaults
                </button>
              )}
            </div>
          </div>

          {editTpl&&(
            <div style={{...card,marginBottom:16,border:"1.5px solid #7c3aed30",background:"#7c3aed05"}}>
              <div style={{fontWeight:700,fontSize:14,marginBottom:14,color:"#7c3aed"}}>{editTpl.id?" Edit Template":"+ New Template"}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:12}}>
                <div><label style={{fontSize:11,fontWeight:700,color:"#374151",display:"block",marginBottom:5,textTransform:"uppercase"}}>Name *</label><input value={editTpl.name||""} onChange={e=>setEditTpl(t=>({...t!,name:e.target.value}))} style={inp} placeholder="Template name"/></div>
                <div><label style={{fontSize:11,fontWeight:700,color:"#374151",display:"block",marginBottom:5,textTransform:"uppercase"}}>Category</label>
                  <select value={editTpl.category||"general"} onChange={e=>setEditTpl(t=>({...t!,category:e.target.value}))} style={inp}>
                    {["general","appointment","alert","reminder","notification","procurement","finance"].map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div><label style={{fontSize:11,fontWeight:700,color:"#374151",display:"block",marginBottom:5,textTransform:"uppercase"}}>Variables (comma-sep)</label><input value={(editTpl.variables||[]).join(",")} onChange={e=>setEditTpl(t=>({...t!,variables:e.target.value.split(",").map(s=>s.trim()).filter(Boolean)}))} style={inp} placeholder="name,date,amount"/></div>
              </div>
              <div style={{marginBottom:12}}><label style={{fontSize:11,fontWeight:700,color:"#374151",display:"block",marginBottom:5,textTransform:"uppercase"}}>Content * (use {"{{variable}}"} for variables)</label><textarea value={editTpl.content||""} onChange={e=>setEditTpl(t=>({...t!,content:e.target.value}))} style={{...inp,height:100,resize:"vertical"}}/></div>
              <div style={{display:"flex",gap:10}}>
                <button onClick={saveTpl} disabled={savingTpl} style={btn(savingTpl?"#9ca3af":"linear-gradient(135deg,#7c3aed,#6d28d9)",savingTpl)}>{savingTpl?"Saving...":" Save Template"}</button>
                <button onClick={()=>setEditTpl(null)} style={{padding:"9px 16px",background:"#f1f5f9",border:"1.5px solid #e2e8f0",borderRadius:8,cursor:"pointer",fontSize:13}}>Cancel</button>
              </div>
            </div>
          )}

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:16}}>
            {templates.map(t=>(
              <div key={t.id} style={{...card,padding:"16px 18px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div style={{fontWeight:700,fontSize:14,color:"#0f172a"}}>{t.name}</div>
                  <Chip label={t.category} color={t.category==="alert"?"#ef4444":t.category==="procurement"?"#3b82f6":t.category==="finance"?"#22c55e":"#6b7280"}/>
                </div>
                <div style={{fontSize:11,color:"#374151",lineHeight:1.6,marginBottom:8,background:"#f8fafc",padding:"8px 10px",borderRadius:6,fontFamily:"monospace"}}>{t.content}</div>
                {t.variables.length>0&&<div style={{fontSize:10,color:"#9ca3af",marginBottom:10}}>Variables: {t.variables.map(v=>`{{${v}}}`).join(", ")}</div>}
                <div style={{display:"flex",gap:8,justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:11,color:"#d1d5db"}}>Used {t.use_count} times</span>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>{setBody(t.content);setTab("compose");showToast(` ${t.name} applied`);}} style={{padding:"4px 10px",background:"#7c3aed12",border:"1px solid #7c3aed25",borderRadius:6,fontSize:11,color:"#7c3aed",cursor:"pointer",fontWeight:700}}>Use</button>
                    <button onClick={()=>setEditTpl(t)} style={{padding:"4px 10px",background:"#f1f5f9",border:"1px solid #e2e8f0",borderRadius:6,fontSize:11,cursor:"pointer"}}>Edit</button>
                    <button onClick={()=>SMSAPI.deleteTemplate(t.id).then(loadAll)} style={{padding:"4px 10px",background:"#fef2f2",border:"1px solid #fecaca",borderRadius:6,fontSize:11,color:"#ef4444",cursor:"pointer"}}>Del</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* -- BULK SEND -- */}
      {tab==="bulk"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
          <div style={card}>
            <div style={{fontWeight:700,fontSize:15,color:"#0f172a",marginBottom:20}}> Bulk SMS Send</div>
            <div style={{marginBottom:14}}>
              <label style={{fontSize:11,fontWeight:700,color:"#374151",display:"block",marginBottom:5,textTransform:"uppercase"}}>Campaign Name</label>
              <input value={bulkName} onChange={e=>setBulkName(e.target.value)} style={inp} placeholder="e.g. Supplier Payment Notice"/>
            </div>
            <div style={{marginBottom:14}}>
              <label style={{fontSize:11,fontWeight:700,color:"#374151",display:"block",marginBottom:5,textTransform:"uppercase"}}>Recipients (one per line or comma-separated)</label>
              <textarea value={bulkRecipients} onChange={e=>setBulkRecipients(e.target.value)} style={{...inp,height:140,resize:"vertical",fontFamily:"monospace",fontSize:12}} placeholder={"+254700000001\n+254700000002\n+254700000003"}/>
              <div style={{fontSize:11,color:"#9ca3af",marginTop:4}}>{bulkRecipients.split(/[\n,;]+/).filter(p=>p.trim()).length} recipient{bulkRecipients.split(/[\n,;]+/).filter(p=>p.trim()).length!==1?"s":""} entered</div>
            </div>
            <div style={{marginBottom:14}}>
              <label style={{fontSize:11,fontWeight:700,color:"#374151",display:"block",marginBottom:5,textTransform:"uppercase"}}>Message *</label>
              <textarea value={bulkBody} onChange={e=>setBulkBody(e.target.value)} style={{...inp,height:100,resize:"vertical"}} placeholder="Message to send to all recipients..."/>
              <div style={{fontSize:11,color:"#9ca3af",marginTop:4}}>{bulkBody.length}/1600 * {Math.ceil(bulkBody.length/160)||1} segment{Math.ceil(bulkBody.length/160)>1?"s":""}</div>
            </div>
            {bulkProgress&&<div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:10,padding:"12px 16px",marginBottom:14}}>
              <div style={{fontWeight:700,color:"#059669",marginBottom:6}}>Last Campaign Results</div>
              <div style={{display:"flex",gap:16}}>
                <span style={{fontSize:13}}><strong style={{color:"#22c55e"}}>{bulkProgress.ok}</strong> sent</span>
                <span style={{fontSize:13}}><strong style={{color:"#ef4444"}}>{bulkProgress.failed}</strong> failed</span>
                <span style={{fontSize:13}}><strong style={{color:"#6b7280"}}>{bulkProgress.total}</strong> total</span>
              </div>
            </div>}
            <button onClick={sendBulk} disabled={bulkSending||!bulkRecipients||!bulkBody} style={{...btn(bulkSending||!bulkRecipients||!bulkBody?"#9ca3af":"linear-gradient(135deg,#7c3aed,#6d28d9)"),width:"100%",fontSize:14,padding:"12px"}}>
              {bulkSending?"Sending...":" Send Bulk SMS"}
            </button>
          </div>
          <div style={card}>
            <div style={{fontWeight:700,fontSize:15,color:"#0f172a",marginBottom:16}}> Bulk Operations Log</div>
            {bulkOps.map(op=>(
              <div key={op.id} style={{padding:"12px 14px",borderRadius:10,border:"1.5px solid #f1f5f9",marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div style={{fontWeight:600,fontSize:13,color:"#0f172a"}}>{op.name||"Unnamed Campaign"}</div>
                  <Chip label={op.status||"completed"} color={op.status==="completed"?"#22c55e":op.status==="failed"?"#ef4444":"#f97316"}/>
                </div>
                <div style={{fontSize:12,color:"#6b7280",marginTop:4,lineHeight:1.5}}>{op.body?.slice(0,80)}...</div>
                <div style={{display:"flex",gap:12,marginTop:6,fontSize:12}}>
                  <span><strong style={{color:"#22c55e"}}>{op.successful_count}</strong>/{op.recipients_count} sent</span>
                  {op.failed_count>0&&<span><strong style={{color:"#ef4444"}}>{op.failed_count}</strong> failed</span>}
                </div>
              </div>
            ))}
            {bulkOps.length===0&&<div style={{textAlign:"center",padding:"32px",color:"#9ca3af",fontSize:13}}>No bulk operations yet</div>}
          </div>
        </div>
      )}

      {/* -- METRICS -- */}
      {tab==="metrics"&&metrics&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
          <div style={card}>
            <div style={{fontWeight:700,fontSize:15,color:"#0f172a",marginBottom:16}}> SMS Metrics (7 days)</div>
            {[
              {label:"Total Messages",value:metrics.total,color:"#3b82f6"},
              {label:"Sent (Outbound)",value:metrics.sent,color:"#22c55e"},
              {label:"Received (Inbound)",value:metrics.received,color:"#7c3aed"},
              {label:"Delivered",value:metrics.delivered,color:"#059669"},
              {label:"Failed",value:metrics.failed,color:"#ef4444"},
              {label:"SMS Channel",value:metrics.sms,color:"#374151"},
              {label:"WhatsApp Channel",value:metrics.whatsapp,color:"#25D366"},
              {label:"Delivery Rate",value:metrics.sent>0?`${Math.round(metrics.delivered/metrics.sent*100)}%`:"N/A",color:"#0891b2"},
            ].map((row,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:"1px solid #f8fafc"}}>
                <span style={{fontSize:13,color:"#374151"}}>{row.label}</span>
                <span style={{fontSize:16,fontWeight:800,color:row.color}}>{row.value}</span>
              </div>
            ))}
          </div>
          <div style={card}>
            <div style={{fontWeight:700,fontSize:15,color:"#0f172a",marginBottom:16}}>[G] Twilio Configuration</div>
            {[
              {label:"SMS Number",value:"+16812972643"},
              {label:"WhatsApp Number",value:"+14155238886"},
              {label:"Messaging Service",value:"EL5H"},
              {label:"Service SID",value:"Configured"},
              {label:"WhatsApp Join Code",value:"join bad-machine"},
              {label:"Voice Webhook",value:"https://demo.twilio.com/welcome/voice/"},
            ].map((row,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:"1px solid #f8fafc"}}>
                <span style={{fontSize:12,color:"#374151"}}>{row.label}</span>
                <span style={{fontSize:11,fontFamily:"monospace",color:"#374151",background:"#f1f5f9",padding:"2px 8px",borderRadius:6}}>{row.value}</span>
              </div>
            ))}
            <a href="https://api.whatsapp.com/send/?phone=%2B14155238886&text=join+bad-machine&type=phone_number&app_absent=0" target="_blank" rel="noopener noreferrer" style={{display:"block",marginTop:14,...btn("#25D366"),textAlign:"center",textDecoration:"none"}}>
               Open WhatsApp Sandbox  Next
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
