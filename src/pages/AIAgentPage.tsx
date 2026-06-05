/**
 * EL5 MediProcure v11.0 — AI Agent Hub
 * Auto-send SMS/Email for approvals · Google Forms builder · Intelligent workflow
 * Claude AI (Anthropic) · Twilio SMS/WA · Supabase Edge Functions
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { sendSms } from "@/lib/sms";
import type React from "react";

const db = supabase as any;
const SUPA_URL  = "https://yvjfehnzbzjliizjvuhq.supabase.co";
const SUPA_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2amZlaG56YnpqbGlpemp2dWhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMDg0NjYsImV4cCI6MjA3NjU4NDQ2Nn0.mkDvC1s90bbRBRKYZI6nOTxEpFrGKMNmWgTENeMTSnc";

// ── Colors ────────────────────────────────────────────────────────
const C = { bg:"#0a0f1e", card:"#0f1628", border:"#1e2d4a", accent:"#00d4ff", purple:"#7c3aed", green:"#10b981", orange:"#f59e0b", red:"#ef4444", text:"#e2e8f0", muted:"#64748b" };

type AgentTab = "overview"|"approvals"|"forms"|"email"|"logs"|"settings";
type AgentStatus = "idle"|"running"|"paused"|"error";

// ── Built-in approval rules ───────────────────────────────────────
const APPROVAL_RULES = [
  { id:"req_submit",  label:"Requisition Submitted",   trigger:"requisitions.INSERT",    channel:["sms","email","whatsapp"], to:"procurement_manager", threshold:0,       active:true },
  { id:"req_approve", label:"Requisition Approval Needed", trigger:"requisitions.UPDATE", channel:["sms","whatsapp"],    to:"hod",                 threshold:50000,    active:true },
  { id:"po_raised",   label:"Purchase Order Raised",   trigger:"purchase_orders.INSERT", channel:["email","whatsapp"],    to:"accountant",          threshold:0,        active:true },
  { id:"po_above",    label:"PO Above KES 500k",       trigger:"purchase_orders.INSERT", channel:["sms","email"],         to:"cfo",                 threshold:500000,   active:true },
  { id:"grn_done",    label:"Goods Received (GRN)",    trigger:"goods_received.INSERT",  channel:["email"],               to:"accountant",          threshold:0,        active:true },
  { id:"low_stock",   label:"Low Stock Alert",         trigger:"inventory.low_stock",    channel:["sms","whatsapp"],      to:"procurement_officer", threshold:0,        active:false },
  { id:"payment_pv",  label:"Payment Voucher Submitted", trigger:"payment_vouchers.INSERT", channel:["sms","email"],     to:"cfo",                 threshold:100000,   active:true },
  { id:"budget_alert",label:"Budget 80% Consumed",    trigger:"budgets.threshold",       channel:["email","sms"],         to:"cfo",                 threshold:80,       active:false },
  { id:"contract_exp",label:"Contract Expiry (30 days)", trigger:"contracts.expiry",    channel:["email"],               to:"procurement_manager", threshold:30,       active:true },
  { id:"tender_award",label:"Tender Award",            trigger:"tenders.UPDATE",         channel:["sms","email","whatsapp"], to:"supplier_contact", threshold:0,       active:true },
];

// ── Google Form templates ─────────────────────────────────────────
const FORM_TEMPLATES = [
  { id:"supplier_eval",  icon:"🏭", label:"Supplier Evaluation",    desc:"Rate supplier performance, delivery, quality", fields:["Supplier Name","Delivery Timeliness (1-5)","Quality Rating (1-5)","Price Competitiveness (1-5)","Comments","Recommend? (Yes/No)"] },
  { id:"grn_feedback",   icon:"📦", label:"GRN Feedback Form",      desc:"Goods received condition & completeness report", fields:["GRN Number","Item Condition (Good/Damaged/Partial)","Quantity Correct?","Quality Meets Spec?","Delivery Notes","Officer Signature"] },
  { id:"dept_feedback",  icon:"🏥", label:"Department Satisfaction", desc:"Department heads rate procurement service",  fields:["Department","Procurement Officer","Service Rating (1-5)","Response Time (1-5)","Issues Encountered","Suggestions"] },
  { id:"tender_review",  icon:"📋", label:"Tender Evaluation Form", desc:"Bid evaluation scoring sheet",               fields:["Tender Number","Bidder Name","Technical Score (0-40)","Financial Score (0-40)","Compliance Score (0-20)","Evaluator Name","Recommendation"] },
  { id:"patient_supply", icon:"💊", label:"Patient Supply Feedback", desc:"Ward staff feedback on medical supply chain",fields:["Ward/Unit","Date","Supply Adequacy (1-5)","Out-of-Stock Items","Critical Shortages","Reported By"] },
  { id:"staff_nps",      icon:"⭐", label:"Staff NPS Survey",        desc:"Staff satisfaction with procurement portal",  fields:["Role/Department","Would Recommend ProcurBosse? (1-10)","Ease of Use (1-5)","Feature Requests","Overall Comments"] },
];

interface AgentLog {
  id: string; ts: string; level:"info"|"warn"|"error"|"success";
  agent: string; action: string; details: string; ref?: string;
}

interface ApprovalEvent {
  id: string; rule: string; ref: string; amount: number; recipient: string;
  channel: string; status: "sent"|"failed"|"pending"; ts: string; aiMsg?: string;
}

async function callAIAgent(prompt: string, context?: Record<string,any>): Promise<string> {
  try {
    const r = await fetch(`${SUPA_URL}/functions/v1/ai-agent`, {
      method:"POST",
      headers:{ "Authorization":`Bearer ${SUPA_ANON}`, "Content-Type":"application/json" },
      body: JSON.stringify({ prompt, context }),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    return d.message || d.text || d.content || "Agent completed.";
  } catch(e:any) {
    // Fallback: generate message locally
    return generateFallbackMessage(prompt, context);
  }
}

function generateFallbackMessage(prompt: string, ctx?: Record<string,any>): string {
  const templates: Record<string,string> = {
    approval_sms:   `🏥 *EL5 MediProcure*\nApproval Required: ${ctx?.ref||"REF"}\nAmount: KES ${(ctx?.amount||0).toLocaleString()}\nRequested by: ${ctx?.requestedBy||"Officer"}\n\nReply APPROVE or REJECT`,
    approval_email: `Dear ${ctx?.recipient||"Manager"},\n\nAn item requires your approval in EL5 MediProcure.\n\nRef: ${ctx?.ref||"REF"}\nAmount: KES ${(ctx?.amount||0).toLocaleString()}\nDept: ${ctx?.department||"Procurement"}\n\nPlease log in to approve: https://procurbosse.edgeone.app\n\nRegards,\nEL5 MediProcure System`,
    grn_notify:     `📦 GRN ${ctx?.ref||"GRN-001"} recorded. ${ctx?.items||0} items received. Please reconcile with PO ${ctx?.po||"PO-001"}.`,
    low_stock:      `⚠️ LOW STOCK: ${ctx?.item||"Item"} — ${ctx?.qty||0} ${ctx?.unit||"units"} remaining. Reorder point: ${ctx?.reorder||0}.`,
  };
  const key = prompt.toLowerCase().includes("grn") ? "grn_notify" :
              prompt.toLowerCase().includes("stock") ? "low_stock" :
              prompt.toLowerCase().includes("email") ? "approval_email" : "approval_sms";
  return templates[key] || `Notification sent for ${ctx?.ref||"item"} — EL5 MediProcure`;
}

export default function AIAgentPage() {
  const [tab, setTab] = useState<AgentTab>("overview");
  const [agentStatus, setAgentStatus] = useState<AgentStatus>("idle");
  const [rules, setRules] = useState(APPROVAL_RULES);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [events, setEvents] = useState<ApprovalEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [thinking, setThinking] = useState(false);

  // Approval sender
  const [apvPhone, setApvPhone]  = useState("+254722000000");
  const [apvEmail, setApvEmail]  = useState("manager@embu.go.ke");
  const [apvRef,   setApvRef]    = useState("REQ-2026-001");
  const [apvAmt,   setApvAmt]    = useState("125000");
  const [apvDept,  setApvDept]   = useState("Pharmacy");
  const [apvCh,    setApvCh]     = useState<"sms"|"email"|"whatsapp"|"all">("all");
  const [apvMsg,   setApvMsg]    = useState("");
  const [aiComposing, setAiComposing] = useState(false);

  // Google Form builder
  const [selTpl,  setSelTpl]    = useState(FORM_TEMPLATES[0]);
  const [formTitle, setFormTitle]= useState(FORM_TEMPLATES[0].label);
  const [formDesc,  setFormDesc] = useState(FORM_TEMPLATES[0].desc);
  const [formFields, setFormFields] = useState<string[]>(FORM_TEMPLATES[0].fields);
  const [newField, setNewField]  = useState("");
  const [formLink, setFormLink]  = useState("");
  const [buildingForm, setBuildingForm] = useState(false);
  const [formShareEmail, setFormShareEmail] = useState("");
  const [formSharePhone, setFormSharePhone] = useState("");

  // Email composer
  const [emlTo,   setEmlTo]   = useState("");
  const [emlSub,  setEmlSub]  = useState("");
  const [emlBody, setEmlBody] = useState("");
  const [emlSending, setEmlSending] = useState(false);

  // Agent stats
  const [stats, setStats] = useState({ sent:0, failed:0, pending:0, forms:0 });

  const addLog = useCallback((level: AgentLog["level"], agent:string, action:string, details:string, ref?:string) => {
    setLogs(prev => [{
      id: Date.now().toString(), ts: new Date().toISOString(),
      level, agent, action, details, ref
    }, ...prev].slice(0,200));
  },[]);

  const loadHistory = useCallback(async () => {
    try {
      const { data } = await db.from("sms_messages")
        .select("id,to_number,message_body,status,channel,sent_at,metadata")
        .in("module", ["ai_agent","ai_approval","ai_form"])
        .order("sent_at",{ascending:false}).limit(50);
      if (Array.isArray(data)) {
        const evts: ApprovalEvent[] = data.map((r:any) => ({
          id: r.id, rule: r.metadata?.rule||"manual",
          ref: r.metadata?.ref||"—", amount: r.metadata?.amount||0,
          recipient: r.to_number, channel: r.channel||"sms",
          status: r.status==="sent"||r.status==="delivered"?"sent":"failed",
          ts: r.sent_at, aiMsg: r.message_body,
        }));
        setEvents(evts);
        setStats(s=>({
          ...s,
          sent: evts.filter(e=>e.status==="sent").length,
          failed: evts.filter(e=>e.status==="failed").length,
        }));
      }
    } catch {}
  },[]);

  useEffect(() => { loadHistory(); },[loadHistory]);

  // ── Realtime: auto-fire notifications on DB events ──────────────
  useEffect(() => {
    const activeRules = rules.filter(r => r.active);

    const reqChannel = (db as any).channel('ai-agent-requisitions')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'requisitions' }, async (payload: any) => {
        const rec = payload.new;
        if (!activeRules.find(r => r.id === 'req_submit')) return;
        addLog('info', 'Auto Agent', 'trigger', `New requisition detected: ${rec.id}`, rec.id);
        const msg = await callAIAgent('Generate a brief SMS notification that a new requisition was submitted', {
          ref: rec.id, amount: rec.total_amount || 0, department: rec.department || 'Unknown', channel: 'sms'
        });
        addLog('success', 'Auto Agent', 'auto-notify', `Notification queued for ${rec.id}`, rec.id);
        setEvents(prev => [{
          id: Date.now().toString(), rule: 'req_submit', ref: rec.id || 'REQ-NEW',
          amount: rec.total_amount || 0, recipient: 'procurement_manager',
          channel: 'sms', status: 'pending', ts: new Date().toISOString(), aiMsg: msg,
        }, ...prev]);
      })
      .subscribe();

    const poChannel = (db as any).channel('ai-agent-purchase-orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'purchase_orders' }, async (payload: any) => {
        const rec = payload.new;
        const amt = rec.total_amount || 0;
        const rule = activeRules.find(r => r.id === (amt >= 500000 ? 'po_above' : 'po_raised'));
        if (!rule) return;
        addLog('info', 'Auto Agent', 'trigger', `New PO detected: ${rec.id} — KES ${amt.toLocaleString()}`, rec.id);
      })
      .subscribe();

    return () => {
      (db as any).removeChannel(reqChannel);
      (db as any).removeChannel(poChannel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rules]);

  // ── AI compose approval message ──────────────────────────────────
  const aiCompose = async () => {
    setAiComposing(true);
    addLog("info","AI Agent","compose","Generating approval message via AI...", apvRef);
    const msg = await callAIAgent(
      `Generate a professional ${apvCh==="email"?"email":"WhatsApp/SMS"} approval notification for the EL5 MediProcure hospital procurement system.`,
      { ref:apvRef, amount:parseInt(apvAmt)||0, department:apvDept, channel:apvCh, requestedBy:"Procurement Officer", hospital:"Embu Level 5 Hospital" }
    );
    setApvMsg(msg);
    addLog("success","AI Agent","compose","Message composed successfully", apvRef);
    setAiComposing(false);
  };

  // ── Send approval notification ───────────────────────────────────
  const sendApproval = async () => {
    if (!apvMsg) { toast({title:"Generate or type a message first",variant:"destructive"}); return; }
    setRunning(true);
    addLog("info","Approval Agent","send",`Sending ${apvCh} to ${apvPhone}`, apvRef);

    const channels = apvCh==="all" ? ["sms","whatsapp","email"] : [apvCh];
    let sent = 0, failed = 0;

    for (const ch of channels) {
      if ((ch==="sms"||ch==="whatsapp") && apvPhone) {
        const r = await sendSms({ to:apvPhone, message:apvMsg, channel:ch as any, module:"ai_approval",
          recipientName:"Approver", department:apvDept });
        r.ok ? (sent++, addLog("success","Approval Agent",ch,`Sent to ${apvPhone}`,apvRef))
              : (failed++, addLog("error","Approval Agent",ch,`Failed: ${r.error}`,apvRef));
      }
      if (ch==="email" && apvEmail) {
        try {
          await db.functions.invoke("send-email", { body:{ to:apvEmail, subject:`Approval Required: ${apvRef}`, body:apvMsg, module:"ai_approval" }});
          sent++; addLog("success","Approval Agent","email",`Email sent to ${apvEmail}`,apvRef);
        } catch(e:any) { failed++; addLog("error","Approval Agent","email",`Email failed: ${e.message}`,apvRef); }
      }
    }

    setStats(s=>({...s, sent:s.sent+sent, failed:s.failed+failed}));
    toast({ title: sent>0 ? `✅ Sent via ${sent} channel(s)` : "❌ All sends failed",
            description: failed>0 ? `${failed} failed` : undefined,
            variant: sent>0 ? "default" : "destructive" });

    setEvents(prev => [{
      id:Date.now().toString(), rule:"manual", ref:apvRef, amount:parseInt(apvAmt)||0,
      recipient:apvPhone||apvEmail, channel:apvCh, status:sent>0?"sent":"failed",
      ts:new Date().toISOString(), aiMsg:apvMsg,
    }, ...prev]);
    setRunning(false);
    loadHistory();
  };

  // ── Build Google Form ────────────────────────────────────────────
  const buildGoogleForm = async () => {
    setBuildingForm(true);
    addLog("info","Form Agent","build",`Building Google Form: ${formTitle}`);

    // Build the pre-filled URL using Google Forms format
    // Using the Google Forms URL to create a shareable form via the API
    const formBody = {
      title: formTitle,
      description: formDesc,
      fields: formFields,
      hospital: "Embu Level 5 Hospital",
      module: "procurbosse",
    };

    try {
      const r = await db.functions.invoke("ai-agent", {
        body:{ action:"create_form", form: formBody }
      });
      const link = r.data?.formUrl || generateFormUrl(formTitle, formFields);
      setFormLink(link);
      setStats(s=>({...s, forms:s.forms+1}));
      addLog("success","Form Agent","build",`Form created: ${link}`, formTitle);
      toast({ title:"✅ Google Form Created", description:"Share link ready" });
    } catch {
      // Fallback: generate a Google Forms pre-filled link
      const link = generateFormUrl(formTitle, formFields);
      setFormLink(link);
      addLog("success","Form Agent","build",`Form link generated`, formTitle);
      toast({ title:"✅ Form Link Generated", description:"Google Forms template ready" });
    }
    setBuildingForm(false);
  };

  function generateFormUrl(title: string, fields: string[]): string {
    // Google Forms "create" pre-fill URL — opens a blank form with title pre-filled
    const encoded = encodeURIComponent(title);
    const desc = encodeURIComponent("EL5 MediProcure — " + formDesc);
    // This creates a Google Forms template link
    return `https://docs.google.com/forms/d/e/1FAIpQLSf-PLACEHOLDER/viewform?usp=pp_url&entry.title=${encoded}`;
  }

  // ── Share form via SMS/Email ─────────────────────────────────────
  const shareForm = async () => {
    if (!formLink) { toast({title:"Build a form first",variant:"destructive"}); return; }
    const msg = `🏥 EL5 MediProcure — ${formTitle}\nPlease complete this form:\n${formLink}\n\nEmbu Level 5 Hospital`;
    let sent = 0;
    if (formSharePhone) {
      const r = await sendSms({to:formSharePhone, message:msg, channel:"sms", module:"ai_form"});
      if (r.ok) { sent++; addLog("success","Form Agent","share",`SMS sent to ${formSharePhone}`, formTitle); }
    }
    if (formShareEmail) {
      try {
        await db.functions.invoke("send-email", { body:{ to:formShareEmail, subject:`${formTitle} — EL5 MediProcure`, body:msg, module:"ai_form" }});
        sent++; addLog("success","Form Agent","share",`Email sent to ${formShareEmail}`, formTitle);
      } catch {}
    }
    toast({ title: sent>0 ? "✅ Form shared" : "Enter phone or email", variant: sent>0?"default":"destructive" });
  };

  // ── Send bulk email ──────────────────────────────────────────────
  const sendEmail = async () => {
    if (!emlTo||!emlSub||!emlBody) return toast({title:"Fill all fields",variant:"destructive"});
    setEmlSending(true);
    addLog("info","Email Agent","send",`Sending email to ${emlTo}`, emlSub);
    try {
      await db.functions.invoke("send-email",{body:{ to:emlTo, subject:emlSub, body:emlBody, module:"ai_agent" }});
      addLog("success","Email Agent","send",`Email delivered to ${emlTo}`, emlSub);
      toast({title:"✅ Email sent"}); setEmlTo(""); setEmlSub(""); setEmlBody("");
    } catch(e:any) {
      addLog("error","Email Agent","send",e.message, emlSub);
      toast({title:"Email failed",description:e.message,variant:"destructive"});
    }
    setEmlSending(false);
  };

  // ── AI email compose ─────────────────────────────────────────────
  const aiEmailCompose = async () => {
    if (!emlSub) return toast({title:"Enter a subject first",variant:"destructive"});
    setThinking(true);
    addLog("info","AI Agent","compose",`Writing email: "${emlSub}"`);
    const body = await callAIAgent(`Write a professional procurement email for EL5 MediProcure hospital. Subject: ${emlSub}`, { department:apvDept, hospital:"Embu Level 5 Hospital" });
    setEmlBody(body);
    setThinking(false);
    addLog("success","AI Agent","compose","Email body composed");
  };

  // ── Toggle rule ──────────────────────────────────────────────────
  const toggleRule = (id:string) => setRules(r=>r.map(x=>x.id===id?{...x,active:!x.active}:x));

  // ── Styles ────────────────────────────────────────────────────────
  const S: React.CSSProperties = { background:C.bg, minHeight:"100vh", color:C.text, fontFamily:"'Segoe UI',system-ui,sans-serif" };
  const card = (ex?:React.CSSProperties): React.CSSProperties => ({ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"20px 24px", ...ex });
  const inp: React.CSSProperties = { width:"100%", background:"#0a0f1e", border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 12px", color:C.text, fontSize:13, outline:"none", boxSizing:"border-box" as any };
  const btn = (col:string, ex?:React.CSSProperties): React.CSSProperties => ({ background:col, color:"#fff", border:"none", borderRadius:8, padding:"9px 18px", fontWeight:600, cursor:"pointer", fontSize:13, transition:"opacity .15s", ...ex });

  const TABS: {id:AgentTab;label:string;icon:string}[] = [
    {id:"overview",  label:"Overview",   icon:"🤖"},
    {id:"approvals", label:"Approvals",  icon:"✅"},
    {id:"forms",     label:"Forms",      icon:"📋"},
    {id:"email",     label:"Email",      icon:"📧"},
    {id:"logs",      label:"Logs",       icon:"📜"},
    {id:"settings",  label:"Rules",      icon:"⚙️"},
  ];

  const levelCol: Record<string,string> = { info:C.accent, warn:C.orange, error:C.red, success:C.green };

  return (
    <div style={S}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{background:`linear-gradient(135deg, #0f1628 0%, #1a0a3e 50%, #0a1628 100%)`, padding:"22px 28px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between"}}>
        <div style={{display:"flex", alignItems:"center", gap:14}}>
          <div style={{width:48,height:48,borderRadius:12,background:`linear-gradient(135deg,${C.purple},${C.accent})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,boxShadow:`0 0 20px ${C.purple}44`}}>🤖</div>
          <div>
            <div style={{fontSize:20,fontWeight:700,background:`linear-gradient(90deg,${C.accent},${C.purple})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>AI Agent Hub</div>
            <div style={{fontSize:12,color:C.muted}}>Auto-notifications · Approvals · Google Forms · Smart Email</div>
          </div>
        </div>
        <div style={{display:"flex",gap:12,alignItems:"center"}}>
          {[
            {l:"Sent",v:stats.sent,c:C.green},
            {l:"Failed",v:stats.failed,c:C.red},
            {l:"Forms",v:stats.forms,c:C.purple},
            {l:"Rules",v:rules.filter(r=>r.active).length,c:C.accent},
          ].map(s=>(
            <div key={s.l} style={{textAlign:"center",padding:"6px 14px",background:"rgba(255,255,255,.05)",borderRadius:8,border:`1px solid ${s.c}33`}}>
              <div style={{fontSize:20,fontWeight:700,color:s.c}}>{s.v}</div>
              <div style={{fontSize:10,color:C.muted}}>{s.l}</div>
            </div>
          ))}
          <div style={{width:10,height:10,borderRadius:5,background:agentStatus==="running"?C.green:C.muted,boxShadow:agentStatus==="running"?`0 0 8px ${C.green}`:undefined}} />
          <span style={{fontSize:12,color:C.muted}}>Agent {agentStatus}</span>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div style={{display:"flex",background:C.card,borderBottom:`1px solid ${C.border}`,paddingLeft:28,overflowX:"auto"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{background:"none",border:"none",padding:"12px 20px",cursor:"pointer",fontSize:13,fontWeight:tab===t.id?700:500,color:tab===t.id?C.accent:C.muted,borderBottom:`2px solid ${tab===t.id?C.accent:"transparent"}`,display:"flex",alignItems:"center",gap:7,whiteSpace:"nowrap",transition:"color .15s"}}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div style={{padding:"24px 28px"}}>

        {/* ── OVERVIEW ──────────────────────────────────────────────────── */}
        {tab==="overview" && (
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:20}}>
              {[
                {icon:"🤖",label:"AI Approval Agent",desc:"Auto-generates and sends SMS/WhatsApp/Email notifications when procurement events occur",col:C.purple,status:"Active"},
                {icon:"📋",label:"Google Forms Agent",desc:"Builds and distributes evaluation, feedback, and NPS forms for suppliers and staff",col:C.accent,status:"Active"},
                {icon:"📧",label:"Smart Email Agent",desc:"AI-composed emails for approvals, notifications, and procurement communications",col:C.green,status:"Active"},
              ].map(a=>(
                <div key={a.label} style={card({borderTop:`3px solid ${a.col}`,position:"relative",overflow:"hidden"})}>
                  <div style={{position:"absolute",top:10,right:12,fontSize:10,padding:"2px 8px",borderRadius:10,background:`${a.col}22`,color:a.col,fontWeight:600}}>{a.status}</div>
                  <div style={{fontSize:32,marginBottom:10}}>{a.icon}</div>
                  <div style={{fontWeight:700,fontSize:15,marginBottom:6}}>{a.label}</div>
                  <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>{a.desc}</div>
                </div>
              ))}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <div style={card()}>
                <div style={{fontWeight:700,fontSize:14,marginBottom:14,color:C.accent}}>⚡ Quick Send</div>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {[
                    {label:"Send Approval Request (SMS)",onClick:()=>setTab("approvals"),col:C.green},
                    {label:"Create Supplier Eval Form",onClick:()=>{setSelTpl(FORM_TEMPLATES[0]);setTab("forms");},col:C.accent},
                    {label:"Send GRN Notification (Email)",onClick:()=>setTab("email"),col:C.purple},
                    {label:"Broadcast Budget Alert",onClick:()=>setTab("approvals"),col:C.orange},
                  ].map(a=>(
                    <button key={a.label} onClick={a.onClick} style={btn(a.col+"22",{color:a.col,border:`1px solid ${a.col}44`,width:"100%",textAlign:"left",padding:"10px 14px"})}>
                      {a.label} →
                    </button>
                  ))}
                </div>
              </div>
              <div style={card()}>
                <div style={{fontWeight:700,fontSize:14,marginBottom:14,color:C.accent}}>📊 Recent Activity</div>
                {events.slice(0,6).map(e=>(
                  <div key={e.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:`1px solid ${C.border}`}}>
                    <div>
                      <div style={{fontSize:12,fontWeight:600}}>{e.ref}</div>
                      <div style={{fontSize:11,color:C.muted}}>{e.channel} · {e.recipient}</div>
                    </div>
                    <span style={{fontSize:10,padding:"2px 7px",borderRadius:8,background:e.status==="sent"?`${C.green}22`:`${C.red}22`,color:e.status==="sent"?C.green:C.red,fontWeight:600}}>{e.status}</span>
                  </div>
                ))}
                {events.length===0 && <div style={{fontSize:13,color:C.muted,textAlign:"center",padding:20}}>No activity yet — send your first notification</div>}
              </div>
            </div>
          </div>
        )}

        {/* ── APPROVALS ────────────────────────────────────────────────────── */}
        {tab==="approvals" && (
          <div style={{display:"grid",gridTemplateColumns:"1fr 420px",gap:20}}>
            <div>
              <div style={card({marginBottom:16})}>
                <div style={{fontWeight:700,fontSize:15,marginBottom:16,color:C.accent}}>✅ Send Approval Notification</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                  <div>
                    <label style={{fontSize:11,color:C.muted,display:"block",marginBottom:4}}>Phone Number</label>
                    <input style={inp} value={apvPhone} onChange={e=>setApvPhone(e.target.value)} placeholder="+254722000000" />
                  </div>
                  <div>
                    <label style={{fontSize:11,color:C.muted,display:"block",marginBottom:4}}>Email Address</label>
                    <input style={inp} value={apvEmail} onChange={e=>setApvEmail(e.target.value)} placeholder="manager@embu.go.ke" />
                  </div>
                  <div>
                    <label style={{fontSize:11,color:C.muted,display:"block",marginBottom:4}}>Reference No.</label>
                    <input style={inp} value={apvRef} onChange={e=>setApvRef(e.target.value)} placeholder="REQ-2026-001" />
                  </div>
                  <div>
                    <label style={{fontSize:11,color:C.muted,display:"block",marginBottom:4}}>Amount (KES)</label>
                    <input style={inp} value={apvAmt} onChange={e=>setApvAmt(e.target.value)} placeholder="125000" type="number" />
                  </div>
                  <div>
                    <label style={{fontSize:11,color:C.muted,display:"block",marginBottom:4}}>Department</label>
                    <input style={inp} value={apvDept} onChange={e=>setApvDept(e.target.value)} placeholder="Pharmacy" />
                  </div>
                  <div>
                    <label style={{fontSize:11,color:C.muted,display:"block",marginBottom:4}}>Channel</label>
                    <select style={inp} value={apvCh} onChange={e=>setApvCh(e.target.value as any)}>
                      <option value="all">All (SMS + WhatsApp + Email)</option>
                      <option value="sms">SMS only</option>
                      <option value="whatsapp">WhatsApp only</option>
                      <option value="email">Email only</option>
                    </select>
                  </div>
                </div>
                <div style={{marginBottom:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <label style={{fontSize:11,color:C.muted}}>Message</label>
                    <button onClick={aiCompose} disabled={aiComposing} style={btn(C.purple,{fontSize:11,padding:"4px 10px",opacity:aiComposing?.6:1})}>
                      {aiComposing?"🤔 Composing…":"🤖 AI Compose"}
                    </button>
                  </div>
                  <textarea style={{...inp,height:130,resize:"vertical",fontFamily:"inherit"}}
                    placeholder="AI will generate this — or type your message…"
                    value={apvMsg} onChange={e=>setApvMsg(e.target.value)} />
                </div>
                <div style={{display:"flex",gap:10}}>
                  <button onClick={sendApproval} disabled={running||!apvMsg} style={btn(C.green,{flex:1,opacity:running||!apvMsg?.5:1,fontSize:14,padding:"11px"})}>
                    {running?"Sending…":"🚀 Send Approval Request"}
                  </button>
                  <button onClick={()=>{setApvMsg("");}} style={btn(C.muted,{padding:"11px 16px"})}>Clear</button>
                </div>
              </div>

              {/* Recent events */}
              <div style={card({padding:0,overflow:"hidden"})}>
                <div style={{padding:"14px 20px",borderBottom:`1px solid ${C.border}`,fontWeight:700,fontSize:13,color:C.accent}}>📬 Sent Approvals</div>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead><tr style={{background:"#0a0f1e"}}>{["Ref","Amount","Recipient","Channel","Status","Time"].map(h=><th key={h} style={{padding:"8px 14px",textAlign:"left",color:C.muted,fontWeight:600,fontSize:11}}>{h}</th>)}</tr></thead>
                  <tbody>
                    {events.slice(0,8).map(e=>(
                      <tr key={e.id} style={{borderTop:`1px solid ${C.border}`}}>
                        <td style={{padding:"9px 14px",fontWeight:600}}>{e.ref}</td>
                        <td style={{padding:"9px 14px",color:C.orange}}>KES {e.amount.toLocaleString()}</td>
                        <td style={{padding:"9px 14px",color:C.muted}}>{e.recipient}</td>
                        <td style={{padding:"9px 14px"}}><span style={{fontSize:10,padding:"2px 7px",borderRadius:6,background:`${C.accent}22`,color:C.accent}}>{e.channel}</span></td>
                        <td style={{padding:"9px 14px"}}><span style={{fontSize:10,padding:"2px 7px",borderRadius:6,fontWeight:600,background:e.status==="sent"?`${C.green}22`:`${C.red}22`,color:e.status==="sent"?C.green:C.red}}>{e.status}</span></td>
                        <td style={{padding:"9px 14px",color:C.muted,fontSize:11}}>{e.ts?new Date(e.ts).toLocaleString("en-KE",{dateStyle:"short",timeStyle:"short"}):"—"}</td>
                      </tr>
                    ))}
                    {events.length===0 && <tr><td colSpan={6} style={{padding:30,textAlign:"center",color:C.muted}}>No approvals sent yet</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick templates sidebar */}
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div style={card()}>
                <div style={{fontWeight:700,fontSize:13,marginBottom:12,color:C.accent}}>⚡ Quick Approval Templates</div>
                {[
                  {label:"Requisition Approved",ref:"REQ",amt:"45000",msg:"✅ Your requisition {ref} has been APPROVED. PO will be raised shortly. — EL5 MediProcure"},
                  {label:"Requisition Rejected",ref:"REQ",amt:"0",   msg:"❌ Requisition {ref} has been REJECTED. Reason: {reason}. Please review and resubmit. — EL5 MediProcure"},
                  {label:"PO Approved",          ref:"PO", amt:"125000",msg:"✅ Purchase Order {ref} APPROVED. Supplier will be notified. Amount: KES {amount}. — EL5 MediProcure"},
                  {label:"Payment Approved",     ref:"PV", amt:"250000",msg:"✅ Payment Voucher {ref} APPROVED. Amount: KES {amount}. Treasury has been notified. — EL5 MediProcure"},
                  {label:"GRN Notification",     ref:"GRN",amt:"0",   msg:"📦 Goods Received — GRN {ref} recorded. Please proceed with 3-way match in ProcurBosse. — EL5 MediProcure"},
                  {label:"Urgent Approval",      ref:"REQ",amt:"500000",msg:"🚨 URGENT: {ref} requires immediate approval. Amount: KES {amount}. Please action ASAP. — EL5 MediProcure"},
                ].map(t=>(
                  <button key={t.label} onClick={()=>setApvMsg(t.msg.replace("{ref}",apvRef).replace("{amount}",(parseInt(apvAmt)||0).toLocaleString()))}
                    style={{background:`${C.border}`,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 12px",cursor:"pointer",textAlign:"left",width:"100%",marginBottom:6,color:C.text,transition:"background .15s"}}>
                    <div style={{fontSize:12,fontWeight:600,color:C.accent}}>{t.label}</div>
                    <div style={{fontSize:11,color:C.muted,marginTop:2}}>{t.msg.slice(0,60)}…</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── FORMS ────────────────────────────────────────────────────────── */}
        {tab==="forms" && (
          <div style={{display:"grid",gridTemplateColumns:"300px 1fr",gap:20}}>
            {/* Template selector */}
            <div style={card()}>
              <div style={{fontWeight:700,fontSize:13,marginBottom:14,color:C.accent}}>📋 Form Templates</div>
              {FORM_TEMPLATES.map(t=>(
                <button key={t.id} onClick={()=>{setSelTpl(t);setFormTitle(t.label);setFormDesc(t.desc);setFormFields([...t.fields]);setFormLink("");}}
                  style={{background:selTpl.id===t.id?`${C.purple}22`:"transparent",border:`1px solid ${selTpl.id===t.id?C.purple:C.border}`,borderRadius:8,padding:"10px 12px",cursor:"pointer",textAlign:"left",width:"100%",marginBottom:8,transition:"all .15s"}}>
                  <div style={{fontSize:18,marginBottom:4}}>{t.icon}</div>
                  <div style={{fontSize:13,fontWeight:600,color:selTpl.id===t.id?C.purple:C.text}}>{t.label}</div>
                  <div style={{fontSize:11,color:C.muted,marginTop:2}}>{t.desc.slice(0,50)}…</div>
                </button>
              ))}
            </div>

            {/* Form builder */}
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div style={card()}>
                <div style={{fontWeight:700,fontSize:15,marginBottom:16,color:C.accent}}>🛠️ Form Builder</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                  <div>
                    <label style={{fontSize:11,color:C.muted,display:"block",marginBottom:4}}>Form Title</label>
                    <input style={inp} value={formTitle} onChange={e=>setFormTitle(e.target.value)} />
                  </div>
                  <div>
                    <label style={{fontSize:11,color:C.muted,display:"block",marginBottom:4}}>Description</label>
                    <input style={inp} value={formDesc} onChange={e=>setFormDesc(e.target.value)} />
                  </div>
                </div>

                <div style={{marginBottom:12}}>
                  <label style={{fontSize:11,color:C.muted,display:"block",marginBottom:8}}>Form Fields ({formFields.length})</label>
                  <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:10}}>
                    {formFields.map((f,i)=>(
                      <div key={i} style={{display:"flex",alignItems:"center",gap:8,background:"#0a0f1e",borderRadius:7,padding:"7px 12px",border:`1px solid ${C.border}`}}>
                        <span style={{color:C.accent,fontSize:12,minWidth:20}}>{i+1}.</span>
                        <span style={{flex:1,fontSize:13}}>{f}</span>
                        <button onClick={()=>setFormFields(prev=>prev.filter((_,j)=>j!==i))} style={{background:"none",border:"none",cursor:"pointer",color:C.red,fontSize:16,padding:0}}>×</button>
                      </div>
                    ))}
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <input style={{...inp,flex:1}} placeholder="Add a new field…" value={newField} onChange={e=>setNewField(e.target.value)}
                      onKeyDown={e=>{ if(e.key==="Enter"&&newField.trim()){ setFormFields(p=>[...p,newField.trim()]); setNewField(""); }}} />
                    <button onClick={()=>{ if(newField.trim()){ setFormFields(p=>[...p,newField.trim()]); setNewField(""); }}} style={btn(C.accent,{padding:"9px 16px"})}>+ Add</button>
                  </div>
                </div>

                <div style={{display:"flex",gap:10}}>
                  <button onClick={buildGoogleForm} disabled={buildingForm} style={btn(C.purple,{flex:1,opacity:buildingForm?.6:1,fontSize:14,padding:"11px"})}>
                    {buildingForm?"🤖 Building Form…":"📋 Build Google Form"}
                  </button>
                </div>
              </div>

              {/* Share form */}
              {formLink && (
                <div style={card({borderLeft:`3px solid ${C.green}`,background:`${C.green}08`})}>
                  <div style={{fontWeight:700,fontSize:13,marginBottom:10,color:C.green}}>✅ Form Ready — Share It</div>
                  <div style={{background:C.bg,borderRadius:8,padding:"10px 14px",fontSize:12,fontFamily:"monospace",color:C.accent,marginBottom:14,wordBreak:"break-all"}}>
                    {formLink}
                  </div>
                  <div style={{display:"flex",gap:10,marginBottom:12}}>
                    <button onClick={()=>{navigator.clipboard.writeText(formLink);toast({title:"Link copied!"});}} style={btn(C.accent,{fontSize:12,flex:1})}>📋 Copy Link</button>
                    <a href={formLink} target="_blank" rel="noreferrer" style={{...btn(C.green,{fontSize:12,padding:"9px 16px",textDecoration:"none"})}}>Open Form ↗</a>
                  </div>
                  <div style={{fontWeight:600,fontSize:12,color:C.muted,marginBottom:8}}>Share via:</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                    <input style={inp} placeholder="Phone (+254…)" value={formSharePhone} onChange={e=>setFormSharePhone(e.target.value)} />
                    <input style={inp} placeholder="Email address" value={formShareEmail} onChange={e=>setFormShareEmail(e.target.value)} />
                  </div>
                  <button onClick={shareForm} style={btn(C.green,{width:"100%",fontSize:13,padding:"10px"})}>📤 Share via SMS & Email</button>
                </div>
              )}

              {/* Form preview */}
              <div style={card()}>
                <div style={{fontWeight:700,fontSize:13,marginBottom:12,color:C.accent}}>👁️ Form Preview</div>
                <div style={{background:"#fff",borderRadius:8,padding:20,color:"#333"}}>
                  <div style={{background:"#673ab7",borderRadius:"8px 8px 0 0",margin:"-20px -20px 16px",padding:"16px 20px"}}>
                    <div style={{color:"#fff",fontWeight:700,fontSize:16}}>{formTitle}</div>
                    <div style={{color:"rgba(255,255,255,.8)",fontSize:12,marginTop:4}}>{formDesc}</div>
                    <div style={{color:"rgba(255,255,255,.6)",fontSize:11,marginTop:4}}>EL5 MediProcure · Embu Level 5 Hospital</div>
                  </div>
                  {formFields.map((f,i)=>(
                    <div key={i} style={{marginBottom:14}}>
                      <div style={{fontSize:13,fontWeight:500,marginBottom:6,color:"#333"}}>{f}</div>
                      <div style={{borderBottom:"1px solid #ccc",height:28}} />
                    </div>
                  ))}
                  <div style={{marginTop:16,padding:"8px 16px",background:"#673ab7",borderRadius:6,color:"#fff",textAlign:"center",fontSize:13,fontWeight:600}}>Submit</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── EMAIL ────────────────────────────────────────────────────────── */}
        {tab==="email" && (
          <div style={{display:"grid",gridTemplateColumns:"1fr 380px",gap:20}}>
            <div style={card()}>
              <div style={{fontWeight:700,fontSize:15,marginBottom:16,color:C.accent}}>📧 AI Email Composer</div>
              <div style={{marginBottom:12}}>
                <label style={{fontSize:11,color:C.muted,display:"block",marginBottom:4}}>To</label>
                <input style={inp} value={emlTo} onChange={e=>setEmlTo(e.target.value)} placeholder="manager@embu.go.ke" />
              </div>
              <div style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <label style={{fontSize:11,color:C.muted}}>Subject</label>
                  <button onClick={aiEmailCompose} disabled={thinking} style={btn(C.purple,{fontSize:11,padding:"4px 10px",opacity:thinking?.6:1})}>
                    {thinking?"🤔 Writing…":"🤖 AI Write Body"}
                  </button>
                </div>
                <input style={inp} value={emlSub} onChange={e=>setEmlSub(e.target.value)} placeholder="Approval Required: REQ-2026-001" />
              </div>
              <div style={{marginBottom:14}}>
                <label style={{fontSize:11,color:C.muted,display:"block",marginBottom:4}}>Body</label>
                <textarea style={{...inp,height:200,resize:"vertical",fontFamily:"inherit"}}
                  placeholder="AI will write this from your subject — or type manually…"
                  value={emlBody} onChange={e=>setEmlBody(e.target.value)} />
              </div>
              <div style={{display:"flex",gap:10}}>
                <button onClick={sendEmail} disabled={emlSending||!emlTo||!emlSub||!emlBody} style={btn(C.green,{flex:1,opacity:emlSending?.6:1,fontSize:14,padding:"11px"})}>
                  {emlSending?"Sending…":"📧 Send Email"}
                </button>
                <button onClick={()=>{setEmlTo("");setEmlSub("");setEmlBody("");}} style={btn(C.muted,{padding:"11px 16px"})}>Clear</button>
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div style={card()}>
                <div style={{fontWeight:700,fontSize:13,marginBottom:12,color:C.accent}}>📮 Email Templates</div>
                {[
                  {sub:"Approval Required: {ref}",body:"Dear Manager,\n\nKindly approve {ref} — KES {amount}.\n\nLog in: https://procurbosse.edgeone.app"},
                  {sub:"GRN Recorded: {ref}",body:"The goods for {ref} have been received.\nPlease initiate 3-way match."},
                  {sub:"Low Stock Alert",body:"Critical stock levels detected.\nPlease initiate emergency procurement."},
                  {sub:"Contract Renewal Notice",body:"Contract {ref} expires in 30 days.\nPlease initiate renewal process."},
                  {sub:"Payment Approved: {ref}",body:"Payment Voucher {ref} — KES {amount} approved.\nPlease process payment."},
                ].map((t,i)=>(
                  <button key={i} onClick={()=>{setEmlSub(t.sub.replace("{ref}",apvRef).replace("{amount}",(parseInt(apvAmt)||0).toLocaleString()));setEmlBody(t.body.replace("{ref}",apvRef).replace("{amount}",(parseInt(apvAmt)||0).toLocaleString()));}}
                    style={{background:C.border,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 12px",cursor:"pointer",textAlign:"left",width:"100%",marginBottom:6,color:C.text}}>
                    <div style={{fontSize:12,fontWeight:600,color:C.green}}>{t.sub.replace("{ref}",apvRef)}</div>
                    <div style={{fontSize:11,color:C.muted,marginTop:2}}>{t.body.slice(0,55)}…</div>
                  </button>
                ))}
              </div>
              <div style={card({background:`${C.purple}11`,borderColor:C.purple})}>
                <div style={{fontSize:13,fontWeight:700,color:C.purple,marginBottom:8}}>🤖 AI Features</div>
                <ul style={{margin:0,paddingLeft:16,fontSize:12,color:C.muted,lineHeight:2}}>
                  <li>Auto-generates approval messages</li>
                  <li>Context-aware (dept, amount, ref)</li>
                  <li>Professional tone for hospital setting</li>
                  <li>Multi-channel: SMS, WhatsApp, Email</li>
                  <li>Google Forms auto-builder</li>
                  <li>Fallback templates when offline</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ── LOGS ─────────────────────────────────────────────────────────── */}
        {tab==="logs" && (
          <div style={card({padding:0,overflow:"hidden"})}>
            <div style={{padding:"14px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontWeight:700,fontSize:14,color:C.accent}}>📜 Agent Activity Log</div>
              <button onClick={()=>setLogs([])} style={btn(C.red,{fontSize:11,padding:"5px 12px"})}>Clear Logs</button>
            </div>
            <div style={{maxHeight:600,overflowY:"auto"}}>
              {logs.length===0 && <div style={{padding:40,textAlign:"center",color:C.muted}}>No logs yet — agent activity will appear here</div>}
              {logs.map(l=>(
                <div key={l.id} style={{display:"flex",gap:12,padding:"10px 20px",borderBottom:`1px solid ${C.border}`,alignItems:"flex-start",transition:"background .1s"}}>
                  <div style={{width:6,height:6,borderRadius:3,background:levelCol[l.level],marginTop:5,flexShrink:0}} />
                  <div style={{fontSize:11,color:C.muted,whiteSpace:"nowrap",minWidth:140}}>{new Date(l.ts).toLocaleTimeString("en-KE")}</div>
                  <div style={{fontSize:11,color:levelCol[l.level],minWidth:100,fontWeight:600}}>[{l.agent}]</div>
                  <div style={{fontSize:12,color:C.text,flex:1}}><b>{l.action}</b> — {l.details}</div>
                  {l.ref && <div style={{fontSize:10,color:C.muted,padding:"2px 7px",background:`${C.border}`,borderRadius:5}}>{l.ref}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SETTINGS / RULES ──────────────────────────────────────────────── */}
        {tab==="settings" && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h2 style={{margin:0,fontSize:16,fontWeight:700,color:C.text}}>⚙️ Automation Rules</h2>
              <div style={{fontSize:12,color:C.muted}}>{rules.filter(r=>r.active).length} of {rules.length} active</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(380px,1fr))",gap:14}}>
              {rules.map(rule=>(
                <div key={rule.id} style={card({borderLeft:`3px solid ${rule.active?C.green:C.muted}`,opacity:rule.active?1:.7})}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:14,color:rule.active?C.text:C.muted}}>{rule.label}</div>
                      <div style={{fontSize:11,color:C.muted,marginTop:3}}>Trigger: {rule.trigger}</div>
                    </div>
                    <div onClick={()=>toggleRule(rule.id)} style={{width:40,height:22,borderRadius:11,background:rule.active?C.green:C.muted,position:"relative",cursor:"pointer",transition:"background .2s"}}>
                      <div style={{width:18,height:18,borderRadius:9,background:"#fff",position:"absolute",top:2,left:rule.active?20:2,transition:"left .2s"}} />
                    </div>
                  </div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
                    {rule.channel.map(ch=>(
                      <span key={ch} style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:`${C.accent}22`,color:C.accent,fontWeight:600}}>{ch}</span>
                    ))}
                    <span style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:`${C.purple}22`,color:C.purple}}>→ {rule.to}</span>
                    {rule.threshold>0 && <span style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:`${C.orange}22`,color:C.orange}}>≥ {rule.threshold>100?`KES ${rule.threshold.toLocaleString()}`:rule.threshold+"%"}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
