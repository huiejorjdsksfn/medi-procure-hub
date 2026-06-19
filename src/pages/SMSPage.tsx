/**
 * EL5 MediProcure — SMS Management v10.0 PRODUCTION FIX
 * FIXED: Twilio status action field mapping (v14 edge function)
 * FIXED: Template CRUD (save/edit/delete from DB)
 * FIXED: Better error diagnosis with actionable hints
 * FIXED: Mobile responsive layout
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeFunctionWithRetry } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import type React from "react";
import { useIsMobile } from "@/hooks/useIsMobile";

const db = supabase as any;
type Tab = "compose"|"templates"|"history"|"conversations"|"bulk"|"numbers"|"voice"|"metrics";

const TWILIO = {
  SMS:     "+16812972643",
  WA:      "+14155238886",
  MSG_SVC: "MGd547d8e3273fda2d21afdd6856acb245",
  JOIN:    "join bad-machine",
  WA_LINK: "https://wa.me/14155238886?text=join%20bad-machine",
};

/* ─── Built-in Templates ─── */
const BUILTIN_TEMPLATES = [
  { key:"requisition_submitted", label:"Requisition Submitted",  category:"procurement", vars:["num","dept"],            content:"[EL5 MediProcure] Requisition {{num}} submitted by {{dept}}. Status: Pending Approval." },
  { key:"requisition_approved",  label:"Requisition Approved",   category:"procurement", vars:["num","approver"],         content:"[EL5 MediProcure] ✓ Requisition {{num}} APPROVED by {{approver}}. PO will be raised shortly." },
  { key:"requisition_rejected",  label:"Requisition Rejected",   category:"procurement", vars:["num","reason"],           content:"[EL5 MediProcure] ✗ Requisition {{num}} REJECTED. Reason: {{reason}}." },
  { key:"po_raised",             label:"PO Raised",              category:"procurement", vars:["num","supplier","eta"],   content:"[EL5 MediProcure] PO {{num}} raised for {{supplier}}. Expected delivery: {{eta}}." },
  { key:"po_approved",           label:"PO Approved",            category:"procurement", vars:["num","supplier"],         content:"[EL5 MediProcure] ✓ Purchase Order {{num}} approved. Supplier: {{supplier}}. Proceed." },
  { key:"goods_received",        label:"Goods Received",         category:"procurement", vars:["num","items","grn"],      content:"[EL5 MediProcure] GRN recorded for PO {{num}}. Items: {{items}}. GRN#: {{grn}}. Inventory updated." },
  { key:"low_stock_alert",       label:"Low Stock Alert",        category:"inventory",   vars:["item","qty","unit","reorder"], content:"[EL5 MediProcure] ⚠ LOW STOCK: {{item}} — {{qty}} {{unit}} remaining. Reorder: {{reorder}}." },
  { key:"payment_approved",      label:"Payment Approved",       category:"finance",     vars:["num","amount","payee","date"], content:"[EL5 MediProcure] ✓ Payment Voucher {{num}} of KES {{amount}} APPROVED. Payee: {{payee}}. Date: {{date}}." },
  { key:"payment_processed",     label:"Payment Processed",      category:"finance",     vars:["amount","payee","num","ref"], content:"[EL5 MediProcure] ✓ Payment KES {{amount}} to {{payee}} processed. Voucher: {{num}}. Ref: {{ref}}." },
  { key:"invoice_matched",       label:"Invoice Matched",        category:"finance",     vars:["inv","po","amount"],      content:"[EL5 MediProcure] Invoice {{inv}} matched to PO {{po}}. Amount: KES {{amount}}. Status: MATCHED." },
  { key:"budget_alert",          label:"Budget Alert",           category:"finance",     vars:["dept","pct","code"],      content:"[EL5 MediProcure] ⚠ BUDGET ALERT: {{dept}} has consumed {{pct}}% of budget {{code}}. CFO approval required." },
  { key:"tender_award",          label:"Tender Award",           category:"procurement", vars:["num","supplier","amount"],content:"[EL5 MediProcure] Tender {{num}} AWARDED to {{supplier}}. Value: KES {{amount}}." },
  { key:"contract_expiry",       label:"Contract Expiry",        category:"procurement", vars:["num","supplier","date"],  content:"[EL5 MediProcure] ⚠ Contract {{num}} with {{supplier}} expires on {{date}}. Initiate renewal." },
  { key:"erp_sync_done",         label:"ERP Sync Complete",      category:"system",      vars:["time","records"],         content:"[EL5 MediProcure] ERP sync completed at {{time}}. {{records}} records pushed." },
  { key:"visitor_arrival",       label:"Visitor Arrival",        category:"reception",   vars:["host_name","visitor_name","time"], content:"Hello {{host_name}}, your visitor {{visitor_name}} has arrived at EL5 Hospital. Time: {{time}}." },
  { key:"appointment_reminder",  label:"Appointment Reminder",   category:"reception",   vars:["date","time","host","dept"], content:"Reminder: Appointment at EL5 Hospital on {{date}} at {{time}} with {{host}}, {{dept}}. Bring National ID." },
  { key:"welcome",               label:"Welcome / Onboarding",   category:"system",      vars:["name","phone"],           content:"Welcome to EL5 MediProcure! Hello {{name}}, your account is active. IT Support: {{phone}}." },
  { key:"system_alert",          label:"System Alert",           category:"system",      vars:["message"],                content:"[EL5 MediProcure] {{message}} — System Notification." },
  { key:"custom",                label:"Custom Message",         category:"custom",      vars:["message"],                content:"{{message}}" },
];

const CATEGORIES = ["all","procurement","finance","inventory","reception","system","custom"];
const CAT_COLORS: Record<string,string> = {
  procurement:"#4f46e5", finance:"#059669", inventory:"#f97316",
  reception:"#06b6d4", system:"#6b7280", custom:"#ec4899", all:"#374151",
};
const STATUS_C: Record<string,string> = {
  sent:"#22c55e", delivered:"#3b82f6", failed:"#ef4444", received:"#8b5cf6",
  queued:"#f97316", pending:"#f97316", read:"#22c55e",
};

function fmtDT(s: string) { if(!s)return"—"; return new Date(s).toLocaleString("en-KE",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit",hour12:true}); }
function ago(s: string) { const d=Date.now()-new Date(s).getTime(); if(d<60000)return`${Math.floor(d/1000)}s ago`; if(d<3600000)return`${Math.floor(d/60000)}m ago`; if(d<86400000)return`${Math.floor(d/3600000)}h ago`; return`${Math.floor(d/86400000)}d ago`; }
function renderVars(tmpl: string, vars: Record<string,string>) { return tmpl.replace(/\{\{(\w+)\}\}/g,(_,k)=>vars[k]||`{{${k}}}`); }

interface SmsLog { id:string; to_number:string; from_number?:string; message:string; status:string; twilio_sid?:string; module?:string; provider?:string; direction?:string; recipient_name?:string; department?:string; sent_at?:string; created_at:string; error_msg?:string; }
interface Conversation { id:string; phone_number:string; contact_name?:string; status:string; department?:string; last_message?:string; last_message_at?:string; unread_count:number; }
interface TwilioStatus {
  ok:boolean; account_status?:string; friendly_name?:string; phone_numbers?:any[];
  sms_number?:string; wa_number?:string; msg_svc_sid?:string; templates_available?:number;
  api_sid?:string; region?:string; twilio_error?:string; error?:string; hint?:string;
  acct_set?:boolean; auth_set?:boolean;
}

const TABS: {id:Tab;label:string;col:string}[] = [
  {id:"compose",      label:"✉ Compose",         col:"#4f46e5"},
  {id:"templates",    label:"📋 Templates",       col:"#059669"},
  {id:"history",      label:"📜 History",         col:"#3b82f6"},
  {id:"conversations",label:"💬 Conversations",   col:"#8b5cf6"},
  {id:"bulk",         label:"📤 Bulk Send",       col:"#f97316"},
  {id:"numbers",      label:"📞 Numbers",         col:"#06b6d4"},
  {id:"voice",        label:"🔊 Voice",           col:"#ec4899"},
  {id:"metrics",      label:"📊 Metrics",         col:"#374151"},
];

export default function SMSPage() {
  const isMobile = useIsMobile();
  const [tab, setTab]= useState<Tab>("compose");
  const [logs, setLogs]= useState<SmsLog[]>([]);
  const [convos, setConvos]= useState<Conversation[]>([]);
  const [twilioStatus, setTwilioStatus]= useState<TwilioStatus|null>(null);
  const [statusLoading, setStatusLoading]= useState(false);
  const [loading, setLoading]= useState(true);
  // Compose
  const [to, setTo]= useState("");
  const [msg, setMsg]= useState("");
  const [channel, setChannel]= useState<"sms"|"whatsapp">("sms");
  const [recipientName, setRecipientName]= useState("");
  const [dept, setDept]= useState("");
  const [selectedTemplate, setSelectedTemplate]= useState<typeof BUILTIN_TEMPLATES[0]|null>(null);
  const [templateVars, setTemplateVars]= useState<Record<string,string>>({});
  const [sending, setSending]= useState(false);
  // Templates
  const [catFilter, setCatFilter]= useState("all");
  const [templateSearch, setTemplateSearch]= useState("");
  const [dbTemplates, setDbTemplates]= useState<any[]>([]);
  const [newTmpl, setNewTmpl]= useState({name:"",content:"",category:"custom",vars:""});
  const [savingTmpl, setSavingTmpl]= useState(false);
  const [showNewTmpl, setShowNewTmpl]= useState(false);
  // Bulk
  const [bulkNumbers, setBulkNumbers]= useState("");
  const [bulkMsg, setBulkMsg]= useState("");
  const [bulkSending, setBulkSending]= useState(false);
  const [bulkResult, setBulkResult]= useState<any>(null);
  // Voice
  const [callTo, setCallTo]= useState("");
  const [callMsg, setCallMsg]= useState("Hello, this is Embu Level 5 Hospital Procurement System. Please contact us at your earliest convenience. Thank you.");
  const [calling, setCalling]= useState(false);
  const [callResult, setCallResult]= useState<any>(null);
  // History
  const [histFilter, setHistFilter]= useState("all");
  const [histSearch, setHistSearch]= useState("");
  // Metrics
  const [metrics, setMetrics]= useState({sent:0,failed:0,received:0,total:0,wa:0,sms_count:0});
  const [twilioMsgs, setTwilioMsgs]= useState<any[]>([]);
  const [fetchingTwilio, setFetchingTwilio]= useState(false);

  const showMsg=(m:string,err=false)=>{ toast({title:err?"Error":"Info",description:m,variant:err?"destructive":"default"}); };

  const loadData= useCallback(async()=>{
    setLoading(true);
    const [logsR, convosR, tmplR]= await Promise.allSettled([
      db.from("sms_log").select("*").order("created_at",{ascending:false}).limit(150),
      db.from("sms_conversations").select("*").order("last_message_at",{ascending:false}).limit(50),
      db.from("sms_templates").select("*").eq("is_active",true).order("category"),
    ]);
    const g=(r:any)=>r.status==="fulfilled"?r.value.data||[]:[];
    const allLogs= g(logsR);
    setLogs(allLogs);
    setConvos(g(convosR));
    setDbTemplates(g(tmplR));
    setMetrics({
      sent:  allLogs.filter((l:SmsLog)=>l.status==="sent"||l.status==="delivered").length,
      failed:allLogs.filter((l:SmsLog)=>l.status==="failed").length,
      received:allLogs.filter((l:SmsLog)=>l.direction==="inbound"||l.status==="received").length,
      total: allLogs.length,
      wa:    allLogs.filter((l:SmsLog)=>l.provider?.includes("wa")).length,
      sms_count:allLogs.filter((l:SmsLog)=>l.provider?.includes("sms")).length,
    });
    setLoading(false);
  },[]);

  useEffect(()=>{ loadData(); },[loadData]);

  useEffect(()=>{
    const ch= db.channel("sms_realtime_v100")
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"sms_log"},()=>loadData())
      .subscribe();
    return ()=>{ supabase.removeChannel(ch); };
  },[loadData]);

  async function checkStatus(){
    setStatusLoading(true);
    try{
      const {data,error}= await invokeFunctionWithRetry("send-sms",{body:{action:"status"}});
      if(error) throw error;
      setTwilioStatus(data);
      if(data?.ok) showMsg("✓ Twilio account active — "+data.friendly_name);
      else showMsg("Twilio issue: "+(data?.twilio_error||data?.error||data?.account_status||"check credentials"), true);
    }catch(e:any){
      const msg= e.message||"Unknown error";
      setTwilioStatus({ok:false, account_status:"error", error:msg,
        hint:"Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in Supabase Edge Function secrets"});
      showMsg("Status check failed: "+msg, true);
    }
    setStatusLoading(false);
  }

  async function sendSMS(){
    const toNum= to.trim(); if(!toNum||!msg.trim()){showMsg("Enter recipient and message.",true);return;}
    setSending(true);
    try{
      const {data,error}= await invokeFunctionWithRetry("send-sms",{
        body:{to:toNum,message:msg,channel,recipient_name:recipientName||undefined,department:dept||undefined}
      });
      if(error) throw error;
      if(data?.ok){
        showMsg(`✓ ${channel==="whatsapp"?"WhatsApp":"SMS"} sent to ${toNum}!`);
        setTo(""); setMsg(""); setRecipientName(""); setSelectedTemplate(null); setTemplateVars({});
        loadData();
      }else{
        const err= data?.results?.[0]?.error||data?.error||"Unknown error";
        const isTrial= err.includes("TRIAL_LIMIT")||err.includes("not verified");
        showMsg(`Send failed: ${err}${isTrial?"\n\nTip: Upgrade Twilio account or verify recipient number at console.twilio.com":""}`,true);
      }
    }catch(e:any){ showMsg("Error: "+e.message,true); }
    setSending(false);
  }

  async function sendBulk(){
    const nums= bulkNumbers.split(/[\n,;]/).map(s=>s.trim()).filter(Boolean);
    if(!nums.length||!bulkMsg.trim()){showMsg("Enter numbers and message.",true);return;}
    setBulkSending(true); setBulkResult(null);
    try{
      const {data,error}= await invokeFunctionWithRetry("send-sms",{body:{to:nums,message:bulkMsg,channel}});
      if(error)throw error;
      setBulkResult(data);
      showMsg(`✓ Bulk sent: ${data?.sent||0}/${data?.total||nums.length} delivered`);
      loadData();
    }catch(e:any){ showMsg("Bulk send failed: "+e.message,true); }
    setBulkSending(false);
  }

  async function makeCall(){
    const num= callTo.trim(); if(!num){showMsg("Enter phone number.",true);return;}
    setCalling(true); setCallResult(null);
    try{
      const {data,error}= await invokeFunctionWithRetry("send-sms",{body:{action:"call",to:num,message:callMsg}});
      if(error)throw error;
      setCallResult(data);
      showMsg(data?.ok?`✓ Call initiated to ${num} (SID: ${data?.sid})`:"Call failed: "+(data?.error||"Unknown"),!data?.ok);
      if(data?.ok) loadData();
    }catch(e:any){ showMsg("Call failed: "+e.message,true); }
    setCalling(false);
  }

  async function fetchTwilioMessages(){
    setFetchingTwilio(true);
    try{
      const {data,error}= await invokeFunctionWithRetry("send-sms",{body:{action:"fetch_messages",limit:50}});
      if(error)throw error;
      setTwilioMsgs(data?.messages||[]);
      showMsg(`✓ Fetched ${data?.total||0} messages from Twilio`);
    }catch(e:any){ showMsg("Fetch failed: "+e.message,true); }
    setFetchingTwilio(false);
  }

  async function saveTemplate(){
    if(!newTmpl.name||!newTmpl.content){showMsg("Name and content required.",true);return;}
    setSavingTmpl(true);
    const vars= newTmpl.vars.split(",").map(s=>s.trim()).filter(Boolean);
    const {error}= await db.from("sms_templates").insert({
      name:newTmpl.name, content:newTmpl.content, category:newTmpl.category, variables:vars, is_active:true
    });
    setSavingTmpl(false);
    if(error){showMsg("Save failed: "+error.message,true);return;}
    showMsg("✓ Template saved to database");
    setNewTmpl({name:"",content:"",category:"custom",vars:""});
    setShowNewTmpl(false);
    loadData();
  }

  async function deleteTemplate(id: string){
    if(!window.confirm("Delete this template?"))return;
    const {error}= await db.from("sms_templates").update({is_active:false}).eq("id",id);
    if(!error){showMsg("✓ Template deleted");loadData();}
    else showMsg("Delete failed: "+error.message,true);
  }

  function applyTemplate(tmpl: typeof BUILTIN_TEMPLATES[0]){
    setSelectedTemplate(tmpl);
    const initVars:Record<string,string>= {};
    tmpl.vars.forEach(v=>{initVars[v]="";});
    setTemplateVars(initVars);
    setMsg(tmpl.content);
  }
  function updateTemplateVar(k:string,v:string){
    const nv= {...templateVars,[k]:v};
    setTemplateVars(nv);
    if(selectedTemplate){setMsg(renderVars(selectedTemplate.content,nv));}
  }

  const filteredTemplates= BUILTIN_TEMPLATES.filter(t=>{
    const catOk= catFilter==="all"||t.category===catFilter;
    const searchOk= !templateSearch||(t.label.toLowerCase().includes(templateSearch.toLowerCase())||t.content.toLowerCase().includes(templateSearch.toLowerCase()));
    return catOk&&searchOk;
  });
  const filteredLogs= logs.filter(l=>{
    const stOk= histFilter==="all"||(histFilter==="sent"&&(l.status==="sent"||l.status==="delivered"))||(histFilter==="failed"&&l.status==="failed")||(histFilter==="received"&&(l.direction==="inbound"||l.status==="received"));
    const srOk= !histSearch||(l.to_number.includes(histSearch)||(l.message||"").toLowerCase().includes(histSearch.toLowerCase()));
    return stOk&&srOk;
  });

  // ── Styles ──
  const card: React.CSSProperties= {background:"#fff",borderRadius:12,border:"1px solid #f1f5f9",boxShadow:"0 2px 8px rgba(0,0,0,0.05)",overflow:"hidden"};
  const cardPad: React.CSSProperties= {...card,padding:"20px 24px"};
  const inp: React.CSSProperties= {width:"100%",padding:"9px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box" as any,color:"#374151",background:"#fff"};
  const btnP=(col:string,disabled=false):React.CSSProperties=>({padding:"10px 20px",background:disabled?"#d1d5db":`linear-gradient(135deg,${col},${col}dd)`,color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:disabled?"not-allowed":"pointer",display:"inline-flex",alignItems:"center",gap:6,boxShadow:disabled?"none":`0 2px 8px ${col}40`});
  const btnSm=(col:string):React.CSSProperties=>({padding:"5px 12px",background:`${col}12`,color:col,border:`1px solid ${col}30`,borderRadius:6,fontSize:11,fontWeight:700,cursor:"pointer"});
  const tblH: React.CSSProperties= {fontSize:11,fontWeight:700,color:"#9ca3af",textTransform:"uppercase" as any,letterSpacing:"0.06em",padding:"10px 14px",background:"#f8fafc",textAlign:"left" as any,borderBottom:"2px solid #f1f5f9"};
  const tblC: React.CSSProperties= {fontSize:12,color:"#374151",padding:"10px 14px",borderBottom:"1px solid #f8fafc"};
  const Badge=({s}:{s:string})=><span style={{padding:"2px 9px",borderRadius:10,fontSize:10,fontWeight:700,background:`${STATUS_C[s]||"#6b7280"}15`,color:STATUS_C[s]||"#6b7280",border:`1px solid ${STATUS_C[s]||"#6b7280"}30`,textTransform:"uppercase" as any}}>{s}</span>;

  return (
    <div style={{padding:isMobile?"12px 8px":"20px 24px",fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",maxWidth:1400,margin:"0 auto"}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24,flexWrap:"wrap",gap:12}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:44,height:44,borderRadius:12,background:"linear-gradient(135deg,#4f46e5,#6366f1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>📱</div>
          <div>
            <h1 style={{margin:0,fontSize:isMobile?16:22,fontWeight:800,color:"#0f172a",letterSpacing:"-0.02em"}}>SMS & Communications</h1>
            <div style={{fontSize:11,color:"#6b7280",marginTop:2}}>EL5 MediProcure · SMS {TWILIO.SMS} · WhatsApp {TWILIO.WA}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          {twilioStatus&&(
            <div style={{padding:"5px 12px",borderRadius:20,fontSize:11,fontWeight:700,background:twilioStatus.ok?"#f0fdf4":"#fef2f2",color:twilioStatus.ok?"#059669":"#ef4444",border:`1px solid ${twilioStatus.ok?"#bbf7d0":"#fecaca"}`}}>
              {twilioStatus.ok?"🟢 Twilio Active":"🔴 "+(twilioStatus.account_status||"Error")}
            </div>
          )}
          <button onClick={checkStatus} disabled={statusLoading} style={btnP("#0369a1")}>
            {statusLoading?"⏳ Checking…":"🔍 Check Twilio"}
          </button>
          <button onClick={loadData} style={{padding:"9px 16px",background:"#f8fafc",border:"1.5px solid #e2e8f0",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",color:"#374151"}}>↻</button>
        </div>
      </div>

      {/* Twilio error banner */}
      {twilioStatus&&!twilioStatus.ok&&(
        <div style={{marginBottom:16,padding:"12px 16px",background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8}}>
          <div style={{fontWeight:700,color:"#dc2626",marginBottom:6}}>❌ Twilio Connection Issue</div>
          <div style={{fontSize:12,color:"#7f1d1d",lineHeight:1.6}}>
            {twilioStatus.twilio_error||twilioStatus.error||"Unknown error"}
            {twilioStatus.hint&&<div style={{marginTop:4,padding:"6px 8px",background:"#fffbeb",border:"1px solid #fef08a",borderRadius:4,color:"#92400e"}}><b>💡 Hint:</b> {twilioStatus.hint}</div>}
            {!twilioStatus.acct_set&&<div style={{marginTop:4,color:"#dc2626"}}>• <b>TWILIO_ACCOUNT_SID</b> is not set in Supabase secrets</div>}
            {!twilioStatus.auth_set&&<div style={{color:"#dc2626"}}>• <b>TWILIO_AUTH_TOKEN</b> is not set in Supabase secrets</div>}
          </div>
        </div>
      )}

      {/* Metric Pills */}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(3,1fr)":"repeat(auto-fit,minmax(130px,1fr))",gap:12,marginBottom:24}}>
        {[
          {label:"Total Sent",   value:metrics.sent,     col:"#059669"},
          {label:"Failed",       value:metrics.failed,   col:"#ef4444"},
          {label:"Received",     value:metrics.received, col:"#8b5cf6"},
          {label:"WhatsApp",     value:metrics.wa,       col:"#22c55e"},
          {label:"SMS",          value:metrics.sms_count,col:"#3b82f6"},
          {label:"Log Total",    value:metrics.total,    col:"#374151"},
        ].map(m=>(
          <div key={m.label} style={{...cardPad,padding:"14px 16px",borderLeft:`4px solid ${m.col}`}}>
            <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase" as any,letterSpacing:"0.06em",marginBottom:4}}>{m.label}</div>
            <div style={{fontSize:24,fontWeight:800,color:m.col}}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:2,marginBottom:24,overflowX:"auto",borderBottom:"2px solid #f1f5f9",flexWrap:"nowrap"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"8px 14px",borderRadius:"8px 8px 0 0",background:tab===t.id?t.col:"transparent",color:tab===t.id?"#fff":"#6b7280",border:tab===t.id?`1.5px solid ${t.col}`:"1.5px solid transparent",borderBottom:tab===t.id?"none":undefined,fontSize:isMobile?11:12,fontWeight:tab===t.id?700:500,cursor:"pointer",whiteSpace:"nowrap",boxShadow:tab===t.id?`0 4px 12px ${t.col}30`:"none",transition:"all .15s"}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══════ COMPOSE ═══════ */}
      {tab==="compose"&&(
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 360px",gap:20}}>
          <div style={cardPad}>
            <div style={{fontWeight:700,fontSize:14,color:"#0f172a",marginBottom:18}}>✉ Compose Message</div>
            {/* Channel toggle */}
            <div style={{display:"flex",gap:8,marginBottom:16}}>
              {(["sms","whatsapp"] as const).map(ch=>(
                <button key={ch} onClick={()=>setChannel(ch)} style={{flex:1,padding:"10px",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",border:"1.5px solid",background:channel===ch?(ch==="whatsapp"?"#22c55e":"#4f46e5"):"transparent",color:channel===ch?"#fff":"#6b7280",borderColor:channel===ch?(ch==="whatsapp"?"#22c55e":"#4f46e5"):"#e5e7eb",transition:"all .15s"}}>
                  {ch==="sms"?"📱 SMS":"💬 WhatsApp"}
                  <div style={{fontSize:10,marginTop:2,opacity:.8}}>{ch==="sms"?TWILIO.SMS:"whatsapp:"+TWILIO.WA}</div>
                </button>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12,marginBottom:12}}>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4}}>📞 To (E.164 or 07…) *</label>
                <input value={to} onChange={e=>setTo(e.target.value)} placeholder="+254722000000 or 0722000000" style={inp}/>
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4}}>👤 Recipient Name (optional)</label>
                <input value={recipientName} onChange={e=>setRecipientName(e.target.value)} placeholder="e.g. Dr. Kamau" style={inp}/>
              </div>
            </div>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4}}>🏢 Department</label>
              <select value={dept} onChange={e=>setDept(e.target.value)} style={inp}>
                <option value="">— Select Department —</option>
                {["Procurement","Finance","Inventory","Pharmacy","Maternity","Casualty","Laboratory","Administration","ICT","HR","Nursing"].map(d=><option key={d}>{d}</option>)}
              </select>
            </div>
            {selectedTemplate&&selectedTemplate.vars.length>0&&(
              <div style={{marginBottom:12,padding:"12px 14px",background:"#f0fdf4",borderRadius:8,border:"1px solid #bbf7d0"}}>
                <div style={{fontSize:11,fontWeight:700,color:"#059669",marginBottom:8}}>📋 {selectedTemplate.label} — Fill Variables</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:8}}>
                  {selectedTemplate.vars.map(v=>(
                    <div key={v}>
                      <label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:2}}>{"{{"+ v +"}}"}</label>
                      <input value={templateVars[v]||""} onChange={e=>updateTemplateVar(v,e.target.value)} placeholder={v} style={{...inp,fontSize:12}}/>
                    </div>
                  ))}
                </div>
                <button onClick={()=>{setSelectedTemplate(null);setTemplateVars({});}} style={{...btnSm("#6b7280"),marginTop:8}}>✕ Clear template</button>
              </div>
            )}
            <div style={{marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <label style={{fontSize:11,fontWeight:700,color:"#6b7280"}}>💬 Message *</label>
                <span style={{fontSize:11,color:msg.length>160?"#ef4444":"#9ca3af"}}>{msg.length} chars · {Math.ceil(msg.length/160)} seg</span>
              </div>
              <textarea value={msg} onChange={e=>setMsg(e.target.value)} rows={5} placeholder="Type your message…" style={{...inp,resize:"vertical" as any}}/>
            </div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              <button onClick={sendSMS} disabled={sending||!to.trim()||!msg.trim()} style={btnP(channel==="whatsapp"?"#22c55e":"#4f46e5",sending||!to.trim()||!msg.trim())}>
                {sending?"⏳ Sending…":`📤 Send ${channel==="whatsapp"?"WhatsApp":"SMS"}`}
              </button>
              <button onClick={()=>{setMsg("");setTo("");setSelectedTemplate(null);setTemplateVars({});}} style={{padding:"10px 16px",background:"#f8fafc",border:"1.5px solid #e2e8f0",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",color:"#374151"}}>
                ✕ Clear
              </button>
            </div>
          </div>

          {/* Quick template picker sidebar */}
          {!isMobile&&(
            <div style={card}>
              <div style={{padding:"14px 16px",borderBottom:"1px solid #f1f5f9",fontWeight:700,fontSize:13,background:"#f8fafc"}}>⚡ Quick Templates</div>
              <div style={{overflowY:"auto",maxHeight:520}}>
                {BUILTIN_TEMPLATES.filter(t=>t.key!=="custom").slice(0,12).map(t=>(
                  <div key={t.key} onClick={()=>applyTemplate(t)}
                    style={{padding:"10px 14px",borderBottom:"1px solid #f8fafc",cursor:"pointer",transition:"background .1s",background:selectedTemplate?.key===t.key?"#f0fdf4":"transparent"}}
                    onMouseEnter={e=>(e.currentTarget.style.background=selectedTemplate?.key===t.key?"#f0fdf4":"#f8fafc")}
                    onMouseLeave={e=>(e.currentTarget.style.background=selectedTemplate?.key===t.key?"#f0fdf4":"transparent")}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                      <span style={{fontSize:12,fontWeight:600,color:selectedTemplate?.key===t.key?"#059669":"#374151"}}>{t.label}</span>
                      <span style={{fontSize:10,padding:"1px 6px",borderRadius:4,background:`${CAT_COLORS[t.category]}12`,color:CAT_COLORS[t.category]}}>{t.category}</span>
                    </div>
                    <div style={{fontSize:11,color:"#9ca3af",lineHeight:1.4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.content.slice(0,65)}…</div>
                  </div>
                ))}
                <div style={{padding:"10px 14px",textAlign:"center"}}>
                  <button onClick={()=>setTab("templates")} style={{...btnSm("#4f46e5"),fontSize:12}}>View All Templates →</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════ TEMPLATES ═══════ */}
      {tab==="templates"&&(
        <div>
          <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
            <input value={templateSearch} onChange={e=>setTemplateSearch(e.target.value)} placeholder="Search templates…" style={{...inp,width:220,fontSize:12}}/>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {CATEGORIES.map(c=>(
                <button key={c} onClick={()=>setCatFilter(c)} style={{padding:"5px 12px",borderRadius:20,fontSize:11,fontWeight:600,cursor:"pointer",border:"1.5px solid",background:catFilter===c?CAT_COLORS[c]:"transparent",color:catFilter===c?"#fff":CAT_COLORS[c],borderColor:CAT_COLORS[c]}}>
                  {c.charAt(0).toUpperCase()+c.slice(1)}
                </button>
              ))}
            </div>
            <span style={{marginLeft:"auto",fontSize:12,color:"#9ca3af"}}>{filteredTemplates.length} built-in + {dbTemplates.length} custom</span>
            <button onClick={()=>setShowNewTmpl(v=>!v)} style={btnP("#059669")}>+ Create Template</button>
          </div>

          {/* New template form */}
          {showNewTmpl&&(
            <div style={{...cardPad,marginBottom:20,border:"2px solid #059669"}}>
              <div style={{fontWeight:700,fontSize:13,color:"#059669",marginBottom:12}}>📋 Create Custom Template</div>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:10,marginBottom:10}}>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4}}>Template Name *</label>
                  <input value={newTmpl.name} onChange={e=>setNewTmpl(p=>({...p,name:e.target.value}))} placeholder="e.g. Supplier Notice" style={inp}/>
                </div>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4}}>Category</label>
                  <select value={newTmpl.category} onChange={e=>setNewTmpl(p=>({...p,category:e.target.value}))} style={inp}>
                    {["custom","procurement","finance","inventory","reception","system"].map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4}}>Variables (comma-separated)</label>
                  <input value={newTmpl.vars} onChange={e=>setNewTmpl(p=>({...p,vars:e.target.value}))} placeholder="name, amount, date" style={inp}/>
                </div>
              </div>
              <div style={{marginBottom:10}}>
                <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4}}>Template Content * (use {"{{var}}"} for variables)</label>
                <textarea value={newTmpl.content} onChange={e=>setNewTmpl(p=>({...p,content:e.target.value}))} rows={3} placeholder="[EL5 MediProcure] Hello {{name}}, your {{amount}} payment…" style={{...inp,resize:"vertical" as any}}/>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={saveTemplate} disabled={savingTmpl} style={btnP("#059669",savingTmpl)}>{savingTmpl?"⏳ Saving…":"💾 Save Template"}</button>
                <button onClick={()=>setShowNewTmpl(false)} style={{...btnP("#6b7280"),background:"#f8fafc",color:"#374151"}}>Cancel</button>
              </div>
            </div>
          )}

          {/* DB templates */}
          {dbTemplates.length>0&&(
            <div style={{marginBottom:20}}>
              <div style={{fontWeight:700,fontSize:13,color:"#374151",marginBottom:10}}>📁 Your Custom Templates ({dbTemplates.length})</div>
              <div style={{display:"grid",gridTemplateColumns:`repeat(auto-fill,minmax(${isMobile?"100%":"300px"},1fr))`,gap:12}}>
                {dbTemplates.map(t=>(
                  <div key={t.id} style={{...card,padding:"14px",border:"1.5px solid #059669"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                      <span style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>{t.name||t.label}</span>
                      <span style={{fontSize:10,padding:"2px 8px",borderRadius:4,background:`${CAT_COLORS[t.category]||CAT_COLORS.custom}12`,color:CAT_COLORS[t.category]||CAT_COLORS.custom,fontWeight:600}}>{t.category}</span>
                    </div>
                    <div style={{fontSize:12,color:"#6b7280",lineHeight:1.5,background:"#f8fafc",padding:"8px 10px",borderRadius:6,marginBottom:8,fontFamily:"monospace"}}>{t.content}</div>
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>{applyTemplate({key:t.id,label:t.name||t.label,category:t.category,vars:t.variables||[],content:t.content});setTab("compose");}} style={btnP("#059669",false)}>✉ Use</button>
                      <button onClick={()=>{navigator.clipboard.writeText(t.content);showMsg("Copied!");}} style={{...btnSm("#6b7280"),padding:"8px 12px"}}>📋</button>
                      <button onClick={()=>deleteTemplate(t.id)} style={{...btnSm("#ef4444"),padding:"8px 12px"}}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Built-in templates */}
          <div style={{fontWeight:700,fontSize:13,color:"#374151",marginBottom:10}}>📚 Built-in Templates ({filteredTemplates.length})</div>
          <div style={{display:"grid",gridTemplateColumns:`repeat(auto-fill,minmax(${isMobile?"100%":"300px"},1fr))`,gap:16}}>
            {filteredTemplates.map(t=>(
              <div key={t.key} style={{...card,padding:"16px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>{t.label}</div>
                    <span style={{fontSize:10,padding:"2px 8px",borderRadius:4,background:`${CAT_COLORS[t.category]}12`,color:CAT_COLORS[t.category],fontWeight:600,textTransform:"uppercase" as any}}>{t.category}</span>
                  </div>
                </div>
                <div style={{fontSize:12,color:"#6b7280",lineHeight:1.6,background:"#f8fafc",padding:"8px 10px",borderRadius:6,marginBottom:10,fontFamily:"monospace"}}>{t.content}</div>
                {t.vars.length>0&&(
                  <div style={{marginBottom:10}}>
                    <div style={{fontSize:10,color:"#9ca3af",marginBottom:4}}>Variables:</div>
                    <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                      {t.vars.map(v=><span key={v} style={{fontSize:10,padding:"2px 8px",background:"#eff6ff",color:"#3b82f6",borderRadius:4,fontFamily:"monospace"}}>{"{{"+ v +"}}"}</span>)}
                    </div>
                  </div>
                )}
                <div style={{display:"flex",gap:6}}>
                  <button onClick={()=>{applyTemplate(t);setTab("compose");}} style={btnP("#4f46e5")}>✉ Use</button>
                  <button onClick={()=>{navigator.clipboard.writeText(t.content);showMsg("Copied!");}} style={{...btnSm("#6b7280"),padding:"8px 12px"}}>📋</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════ HISTORY ═══════ */}
      {tab==="history"&&(
        <div>
          <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
            <input value={histSearch} onChange={e=>setHistSearch(e.target.value)} placeholder="Search messages…" style={{...inp,width:220,fontSize:12}}/>
            {["all","sent","failed","received"].map(f=>(
              <button key={f} onClick={()=>setHistFilter(f)} style={{padding:"5px 12px",borderRadius:20,fontSize:12,fontWeight:600,cursor:"pointer",border:"1.5px solid",background:histFilter===f?"#3b82f6":"transparent",color:histFilter===f?"#fff":"#6b7280",borderColor:histFilter===f?"#3b82f6":"#e5e7eb"}}>
                {f.charAt(0).toUpperCase()+f.slice(1)}
              </button>
            ))}
            <button onClick={fetchTwilioMessages} disabled={fetchingTwilio} style={{...btnP("#0369a1",fetchingTwilio),padding:"6px 14px",fontSize:12}}>
              {fetchingTwilio?"⏳ Fetching…":"☁ Fetch from Twilio"}
            </button>
            <span style={{marginLeft:"auto",fontSize:12,color:"#9ca3af"}}>{filteredLogs.length} logs</span>
          </div>
          <div style={{...card,overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:isMobile?600:undefined}}>
              <thead>
                <tr>{["To","Provider","Message","Status","Module","SID","Sent"].map(h=><th key={h} style={tblH}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filteredLogs.map(l=>(
                  <tr key={l.id} onMouseEnter={e=>(e.currentTarget.style.background="#f8fafc")} onMouseLeave={e=>(e.currentTarget.style.background="#fff")}>
                    <td style={tblC}><code style={{fontSize:11}}>{l.to_number}</code>{l.recipient_name&&<div style={{fontSize:10,color:"#9ca3af"}}>{l.recipient_name}</div>}</td>
                    <td style={{...tblC,fontSize:10,color:"#6b7280"}}>{l.provider||l.from_number||"—"}</td>
                    <td style={{...tblC,maxWidth:240,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={l.message}>{l.message||"—"}</td>
                    <td style={tblC}><Badge s={l.status}/>{l.error_msg&&<div style={{fontSize:9,color:"#ef4444",marginTop:2,maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={l.error_msg}>{l.error_msg}</div>}</td>
                    <td style={{...tblC,fontSize:11,color:"#6b7280"}}>{l.module||l.department||"—"}</td>
                    <td style={{...tblC,fontSize:10,fontFamily:"monospace",color:"#9ca3af"}}>{l.twilio_sid?l.twilio_sid.slice(0,14)+"…":"—"}</td>
                    <td style={{...tblC,fontSize:11,color:"#9ca3af",whiteSpace:"nowrap"}}>{fmtDT(l.sent_at||l.created_at)}</td>
                  </tr>
                ))}
                {filteredLogs.length===0&&<tr><td colSpan={7} style={{padding:"30px",textAlign:"center",color:"#9ca3af"}}>No messages found</td></tr>}
              </tbody>
            </table>
          </div>
          {twilioMsgs.length>0&&(
            <div style={{...card,marginTop:20,overflowX:"auto"}}>
              <div style={{padding:"12px 16px",background:"#eff6ff",fontWeight:700,fontSize:13,borderBottom:"1px solid #f1f5f9"}}>☁ Live from Twilio ({twilioMsgs.length})</div>
              <table style={{width:"100%",borderCollapse:"collapse",minWidth:600}}>
                <thead><tr>{["From","To","Body","Status","Direction","Date"].map(h=><th key={h} style={tblH}>{h}</th>)}</tr></thead>
                <tbody>
                  {twilioMsgs.map((m,i)=>(
                    <tr key={i} onMouseEnter={e=>(e.currentTarget.style.background="#f8fafc")} onMouseLeave={e=>(e.currentTarget.style.background="#fff")}>
                      <td style={{...tblC,fontSize:11,fontFamily:"monospace"}}>{m.from}</td>
                      <td style={{...tblC,fontSize:11,fontFamily:"monospace"}}>{m.to}</td>
                      <td style={{...tblC,fontSize:11,maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={m.body}>{m.body}</td>
                      <td style={tblC}><Badge s={m.status}/></td>
                      <td style={{...tblC,fontSize:11,color:"#6b7280"}}>{m.direction}</td>
                      <td style={{...tblC,fontSize:10,color:"#9ca3af"}}>{m.date_sent||m.date_created}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══════ CONVERSATIONS ═══════ */}
      {tab==="conversations"&&(
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"320px 1fr",gap:20}}>
          <div style={card}>
            <div style={{padding:"12px 16px",borderBottom:"1px solid #f1f5f9",fontWeight:700,fontSize:13,background:"#f8fafc"}}>💬 Conversations ({convos.length})</div>
            <div style={{overflowY:"auto",maxHeight:560}}>
              {convos.map(c=>(
                <div key={c.id} onClick={()=>setTo(c.phone_number)}
                  style={{padding:"12px 16px",borderBottom:"1px solid #f8fafc",cursor:"pointer"}}
                  onMouseEnter={e=>(e.currentTarget.style.background="#f8fafc")} onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:600,color:"#0f172a"}}>{c.contact_name||c.phone_number}</span>
                    {c.unread_count>0&&<span style={{background:"#ef4444",color:"#fff",borderRadius:"50%",width:18,height:18,fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{c.unread_count}</span>}
                  </div>
                  <div style={{fontSize:11,color:"#9ca3af",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.last_message||"—"}</div>
                  <div style={{display:"flex",gap:6,marginTop:4}}>
                    <span style={{fontSize:10,color:STATUS_C[c.status]||"#6b7280"}}>{c.status}</span>
                    {c.last_message_at&&<span style={{fontSize:10,color:"#9ca3af",marginLeft:"auto"}}>{ago(c.last_message_at)}</span>}
                  </div>
                </div>
              ))}
              {convos.length===0&&<div style={{padding:"30px",textAlign:"center",color:"#9ca3af",fontSize:13}}>No conversations yet</div>}
            </div>
          </div>
          <div style={cardPad}>
            <div style={{fontWeight:700,fontSize:13,marginBottom:16,color:"#0f172a"}}>💬 Reply</div>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4}}>To</label>
              <input value={to} onChange={e=>setTo(e.target.value)} placeholder="+254722000000" style={inp}/>
            </div>
            <div style={{marginBottom:14}}>
              <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4}}>Message</label>
              <textarea value={msg} onChange={e=>setMsg(e.target.value)} rows={4} placeholder="Type reply…" style={{...inp,resize:"vertical" as any}}/>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={sendSMS} disabled={sending||!to||!msg} style={btnP("#4f46e5",sending||!to||!msg)}>📤 Send Reply</button>
              <button onClick={()=>setChannel(channel==="sms"?"whatsapp":"sms")} style={{...btnP("#22c55e"),fontSize:12}}>Toggle {channel==="sms"?"→WA":"→SMS"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ BULK SEND ═══════ */}
      {tab==="bulk"&&(
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:20}}>
          <div style={cardPad}>
            <div style={{fontWeight:700,fontSize:14,color:"#0f172a",marginBottom:18}}>📤 Bulk SMS / WhatsApp</div>
            <div style={{display:"flex",gap:8,marginBottom:14}}>
              {(["sms","whatsapp"] as const).map(ch=>(
                <button key={ch} onClick={()=>setChannel(ch)} style={{flex:1,padding:"9px",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",border:"1.5px solid",background:channel===ch?(ch==="whatsapp"?"#22c55e":"#4f46e5"):"transparent",color:channel===ch?"#fff":"#6b7280",borderColor:channel===ch?(ch==="whatsapp"?"#22c55e":"#4f46e5"):"#e5e7eb"}}>
                  {ch==="sms"?"📱 SMS":"💬 WhatsApp"}
                </button>
              ))}
            </div>
            <div style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <label style={{fontSize:11,fontWeight:700,color:"#6b7280"}}>📋 Phone Numbers</label>
                <span style={{fontSize:11,color:"#9ca3af"}}>{bulkNumbers.split(/[\n,;]/).filter(s=>s.trim()).length} numbers</span>
              </div>
              <textarea value={bulkNumbers} onChange={e=>setBulkNumbers(e.target.value)} rows={6}
                placeholder={"+254722000000\n+254711000000\nOr comma-separated. 07… auto-converted."}
                style={{...inp,resize:"vertical" as any,fontFamily:"monospace",fontSize:12}}/>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4}}>💬 Message</label>
              <textarea value={bulkMsg} onChange={e=>setBulkMsg(e.target.value)} rows={4} placeholder="Bulk message…" style={{...inp,resize:"vertical" as any}}/>
              <div style={{fontSize:11,color:"#9ca3af",marginTop:4}}>{bulkMsg.length} chars</div>
            </div>
            <button onClick={sendBulk} disabled={bulkSending||!bulkNumbers.trim()||!bulkMsg.trim()}
              style={btnP(channel==="whatsapp"?"#22c55e":"#4f46e5",bulkSending||!bulkNumbers.trim()||!bulkMsg.trim())}>
              {bulkSending?"⏳ Sending…":`📤 Send to ${bulkNumbers.split(/[\n,;]/).filter(s=>s.trim()).length} Numbers`}
            </button>
          </div>
          <div>
            {bulkResult&&(
              <div style={{...cardPad,marginBottom:16,border:"1.5px solid #bbf7d0",background:"#f0fdf4"}}>
                <div style={{fontWeight:700,fontSize:13,color:"#059669",marginBottom:12}}>✅ Bulk Result</div>
                {[["Total",bulkResult.total||0],["Sent ✓",bulkResult.sent||0],["Failed ✗",bulkResult.failed||0]].map(([k,v])=>(
                  <div key={k as string} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #bbf7d0",fontSize:13}}>
                    <span style={{color:"#374151"}}>{k}</span>
                    <strong style={{color:(k as string).includes("Failed")?"#ef4444":(k as string).includes("Sent")?"#059669":"#374151"}}>{String(v)}</strong>
                  </div>
                ))}
                {bulkResult.results?.slice(0,15).map((r:any,i:number)=>(
                  <div key={i} style={{fontSize:11,padding:"2px 0",color:r.ok?"#059669":"#ef4444"}}>{r.ok?"✓":"✗"} {r.to} {r.error?`— ${r.error.slice(0,60)}`:""}</div>
                ))}
              </div>
            )}
            <div style={cardPad}>
              <div style={{fontWeight:700,fontSize:13,marginBottom:10}}>📋 Quick Bulk Templates</div>
              {[
                {label:"Low Stock Alert",    msg:"[EL5 MediProcure] ⚠ LOW STOCK: [ITEM] — [QTY] units remaining. Urgent procurement required."},
                {label:"Payment Processed",  msg:"[EL5 MediProcure] Payment KES [AMOUNT] processed. Voucher: [REF]. Please acknowledge."},
                {label:"PO Dispatch Notice", msg:"[EL5 MediProcure] Purchase Order [PO#] dispatched. Please arrange delivery by [DATE]."},
                {label:"System Maintenance", msg:"[EL5 MediProcure] System maintenance on [DATE] [TIME]. Portal briefly unavailable. Thank you."},
                {label:"Tender Notice",      msg:"[EL5 MediProcure] Tender [TDR#] published for [DESCRIPTION]. Closing: [DATE]."},
              ].map(t=>(
                <div key={t.label} onClick={()=>setBulkMsg(t.msg)}
                  style={{padding:"8px 10px",borderRadius:6,cursor:"pointer",marginBottom:4,border:"1px solid",borderColor:bulkMsg===t.msg?"#4f46e5":"#f1f5f9",background:bulkMsg===t.msg?"#eff6ff":"#f8fafc"}}
                  onMouseEnter={e=>(e.currentTarget.style.background="#eff6ff")} onMouseLeave={e=>(e.currentTarget.style.background=bulkMsg===t.msg?"#eff6ff":"#f8fafc")}>
                  <div style={{fontSize:12,fontWeight:600,color:"#374151"}}>{t.label}</div>
                  <div style={{fontSize:11,color:"#9ca3af",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.msg.slice(0,65)}…</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════ PHONE NUMBERS ═══════ */}
      {tab==="numbers"&&(
        <div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:20,marginBottom:20}}>
            {[
              {num:TWILIO.SMS,label:"Primary SMS Number",type:"SMS + Voice",col:"#4f46e5",svc:"Messaging Service SID",svcId:TWILIO.MSG_SVC,desc:"Outbound SMS and Voice calls"},
              {num:TWILIO.WA, label:"WhatsApp Sandbox",  type:"WhatsApp",  col:"#22c55e",svc:"Sandbox Join Code",  svcId:TWILIO.JOIN,  desc:"Twilio Sandbox — recipients must send join code first"},
            ].map(n=>(
              <div key={n.num} style={{...cardPad,border:`2px solid ${n.col}30`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>{n.label}</div>
                    <div style={{fontSize:24,fontWeight:800,color:n.col,marginTop:4,letterSpacing:"-0.02em"}}>{n.num}</div>
                  </div>
                  <span style={{padding:"4px 10px",borderRadius:8,fontSize:11,fontWeight:700,background:n.col+"15",color:n.col}}>{n.type}</span>
                </div>
                <div style={{fontSize:12,color:"#6b7280",marginBottom:12}}>{n.desc}</div>
                {[[n.svc,n.svcId],["Msg Service",TWILIO.MSG_SVC.slice(0,16)+"…"]].map(([k,v])=>(
                  <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderTop:"1px solid #f1f5f9",fontSize:12}}>
                    <span style={{color:"#9ca3af"}}>{k}</span>
                    <code style={{fontSize:11,color:"#374151"}}>{v}</code>
                  </div>
                ))}
                <div style={{marginTop:14,display:"flex",gap:8,flexWrap:"wrap"}}>
                  <button onClick={()=>{setChannel(n.type==="WhatsApp"?"whatsapp":"sms");setTab("compose");}} style={btnP(n.col)}>✉ Compose</button>
                  {n.type==="WhatsApp"&&<a href={TWILIO.WA_LINK} target="_blank" rel="noreferrer" style={{...btnP("#22c55e"),textDecoration:"none"}}>🔗 Join Sandbox</a>}
                </div>
              </div>
            ))}
          </div>
          {/* Twilio Status Panel */}
          <div style={cardPad}>
            <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>🔍 Account Verification</div>
            <button onClick={checkStatus} disabled={statusLoading} style={btnP("#0369a1",statusLoading)}>
              {statusLoading?"⏳ Checking…":"🔍 Verify with Twilio API"}
            </button>
            {twilioStatus&&(
              <div style={{marginTop:16,padding:"14px",background:twilioStatus.ok?"#f0fdf4":"#fef2f2",borderRadius:8,border:`1px solid ${twilioStatus.ok?"#bbf7d0":"#fecaca"}`}}>
                <div style={{fontWeight:700,fontSize:13,color:twilioStatus.ok?"#059669":"#ef4444",marginBottom:10}}>
                  {twilioStatus.ok?"✅ Account Verified":"❌ Account Error"}
                </div>
                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:4}}>
                  {[
                    ["Account Name",   twilioStatus.friendly_name||"—"],
                    ["Status",         twilioStatus.account_status||"—"],
                    ["SMS From",       twilioStatus.sms_number||TWILIO.SMS],
                    ["WA From",        twilioStatus.wa_number||"whatsapp:"+TWILIO.WA],
                    ["Msg Service",    twilioStatus.msg_svc_sid||TWILIO.MSG_SVC.slice(0,16)+"…"],
                    ["Templates",      String(twilioStatus.templates_available||19)+" available"],
                    ["Region",         twilioStatus.region||"us1"],
                    ["API SID",        twilioStatus.api_sid||"—"],
                  ].map(([k,v])=>(
                    <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid",borderBottomColor:twilioStatus.ok?"#bbf7d0":"#fecaca",fontSize:12}}>
                      <span style={{color:"#6b7280"}}>{k}</span>
                      <span style={{fontWeight:600,color:"#374151"}}>{v}</span>
                    </div>
                  ))}
                </div>
                {twilioStatus.twilio_error&&(
                  <div style={{marginTop:8,padding:"8px 10px",background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:4,fontSize:12,color:"#dc2626"}}>
                    Twilio error: {twilioStatus.twilio_error}
                  </div>
                )}
                {twilioStatus.phone_numbers&&twilioStatus.phone_numbers.length>0&&(
                  <div style={{marginTop:10}}>
                    <div style={{fontSize:11,fontWeight:700,marginBottom:4}}>Numbers on Account:</div>
                    {twilioStatus.phone_numbers.map((p:any,i:number)=>(
                      <div key={i} style={{fontSize:11,color:"#059669",padding:"2px 0"}}>✓ {p.number||p} {p.friendly?`(${p.friendly})`:""}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════ VOICE CALLS ═══════ */}
      {tab==="voice"&&(
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:20}}>
          <div style={cardPad}>
            <div style={{fontWeight:700,fontSize:14,color:"#0f172a",marginBottom:18}}>🔊 Voice Call via Twilio</div>
            <div style={{padding:"12px 14px",background:"#f0fdf4",borderRadius:8,border:"1px solid #bbf7d0",marginBottom:16}}>
              <div style={{fontSize:12,color:"#059669",fontWeight:600}}>📞 From: {TWILIO.SMS} (Alice TTS, English)</div>
              <div style={{fontSize:11,color:"#6b7280",marginTop:2}}>Recipient hears message spoken twice by Twilio's Alice voice engine</div>
            </div>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4}}>📞 To Number *</label>
              <input value={callTo} onChange={e=>setCallTo(e.target.value)} placeholder="+254722000000" style={inp}/>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4}}>🗣 Message to Speak</label>
              <textarea value={callMsg} onChange={e=>setCallMsg(e.target.value)} rows={4} style={{...inp,resize:"vertical" as any}}/>
              <div style={{fontSize:11,color:"#9ca3af",marginTop:4}}>{callMsg.length} chars</div>
            </div>
            {/* Quick scripts */}
            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,fontWeight:700,color:"#6b7280",marginBottom:6}}>⚡ Quick Scripts</div>
              {[
                {label:"Payment Ready",   msg:"Hello, this is Embu Level 5 Hospital Finance. Your payment is ready for collection. Please visit the Finance office with your identification."},
                {label:"PO Confirmation", msg:"Hello, this is Embu Level 5 Hospital Procurement. Your purchase order has been approved. Please arrange delivery as per agreed terms."},
                {label:"Urgent Supply",   msg:"Hello, this is Embu Level 5 Hospital. This is an urgent call regarding a critical supply requirement. Please call us back at your earliest convenience."},
                {label:"Tender Result",   msg:"Hello, this is Embu Level 5 Hospital Procurement. We wish to inform you of the tender evaluation results. Please contact the Procurement office for details."},
              ].map(t=>(
                <div key={t.label} onClick={()=>setCallMsg(t.msg)} style={{padding:"7px 10px",borderRadius:6,cursor:"pointer",marginBottom:4,border:"1px solid",borderColor:callMsg===t.msg?"#ec4899":"#f1f5f9",background:callMsg===t.msg?"#fdf4ff":"#f8fafc"}}
                  onMouseEnter={e=>(e.currentTarget.style.background="#fdf4ff")} onMouseLeave={e=>(e.currentTarget.style.background=callMsg===t.msg?"#fdf4ff":"#f8fafc")}>
                  <div style={{fontSize:12,fontWeight:600,color:"#374151"}}>{t.label}</div>
                  <div style={{fontSize:11,color:"#9ca3af",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.msg.slice(0,65)}…</div>
                </div>
              ))}
            </div>
            <button onClick={makeCall} disabled={calling||!callTo.trim()} style={btnP("#ec4899",calling||!callTo.trim())}>
              {calling?"⏳ Initiating…":"📞 Make Voice Call"}
            </button>
          </div>
          <div>
            {callResult&&(
              <div style={{...cardPad,marginBottom:16,border:"1.5px solid",borderColor:callResult.ok?"#bbf7d0":"#fecaca",background:callResult.ok?"#f0fdf4":"#fef2f2"}}>
                <div style={{fontWeight:700,fontSize:13,color:callResult.ok?"#059669":"#ef4444",marginBottom:10}}>
                  {callResult.ok?"✅ Call Initiated":"❌ Call Failed"}
                </div>
                {[["To",callResult.to||callTo],["Call SID",callResult.sid||"—"],["Status",callResult.status||"—"],["Error",callResult.error||"None"]].map(([k,v])=>(
                  <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #e5e7eb",fontSize:12}}>
                    <span style={{color:"#6b7280"}}>{k}</span>
                    <code style={{fontSize:11,color:"#374151"}}>{v}</code>
                  </div>
                ))}
              </div>
            )}
            <div style={cardPad}>
              <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>ℹ️ Voice Call Notes</div>
              {[
                ["From Number",  TWILIO.SMS+" (verified)"],
                ["Voice Engine", "Twilio Alice TTS (English)"],
                ["TwiML",        "Inline Twiml parameter — no URL needed"],
                ["Logging",      "All calls logged to sms_log table"],
                ["Repeat",       "Message spoken twice for clarity"],
              ].map(([k,v])=>(
                <div key={k} style={{display:"flex",gap:12,padding:"7px 0",borderBottom:"1px solid #f1f5f9",fontSize:12}}>
                  <span style={{color:"#9ca3af",minWidth:100,flexShrink:0}}>{k}</span>
                  <span style={{color:"#374151"}}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════ METRICS ═══════ */}
      {tab==="metrics"&&(
        <div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(auto-fit,minmax(200px,1fr))",gap:16,marginBottom:20}}>
            {[
              {label:"Total Messages",    value:metrics.total,    col:"#374151"},
              {label:"Successfully Sent", value:metrics.sent,     col:"#22c55e"},
              {label:"Failed",            value:metrics.failed,   col:"#ef4444"},
              {label:"Received/Inbound",  value:metrics.received, col:"#8b5cf6"},
              {label:"Via WhatsApp",      value:metrics.wa,       col:"#22c55e"},
              {label:"Via SMS",           value:metrics.sms_count,col:"#3b82f6"},
              {label:"Delivery Rate",     value:metrics.total?Math.round((metrics.sent/metrics.total)*100)+"%":"—",col:"#059669"},
              {label:"Active Convos",     value:convos.filter(c=>c.status==="open").length,col:"#f97316"},
            ].map(m=>(
              <div key={m.label} style={{...cardPad,padding:"18px 20px",borderLeft:`4px solid ${m.col}`}}>
                <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase" as any,letterSpacing:"0.06em",marginBottom:6}}>{m.label}</div>
                <div style={{fontSize:28,fontWeight:800,color:m.col}}>{m.value}</div>
              </div>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:20}}>
            <div style={cardPad}>
              <div style={{fontWeight:700,fontSize:13,marginBottom:14}}>📊 Status Breakdown</div>
              {(["sent","failed","received","queued","delivered"] as const).map(s=>{
                const count= logs.filter(l=>l.status===s).length;
                const pct= metrics.total?Math.round((count/metrics.total)*100):0;
                return(
                  <div key={s} style={{marginBottom:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
                      <span style={{fontWeight:600,color:"#374151",textTransform:"capitalize" as any}}>{s}</span>
                      <span style={{color:STATUS_C[s]||"#6b7280"}}>{count} ({pct}%)</span>
                    </div>
                    <div style={{height:8,background:"#f1f5f9",borderRadius:4,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${pct}%`,background:STATUS_C[s]||"#6b7280",borderRadius:4,transition:"width .4s"}}/>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={cardPad}>
              <div style={{fontWeight:700,fontSize:13,marginBottom:14}}>🏢 Top Departments</div>
              {(()=>{
                const deptCounts:Record<string,number>={};
                logs.forEach(l=>{if(l.department){deptCounts[l.department]=(deptCounts[l.department]||0)+1;}});
                return Object.entries(deptCounts).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([d,count])=>(
                  <div key={d} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #f1f5f9",fontSize:12}}>
                    <span style={{color:"#374151"}}>{d}</span>
                    <span style={{fontWeight:700,color:"#3b82f6"}}>{count}</span>
                  </div>
                ));
              })()}
              {logs.filter(l=>l.department).length===0&&<div style={{color:"#9ca3af",fontSize:13}}>No department data yet</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
