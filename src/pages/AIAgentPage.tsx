/**
 * EL5 MediProcure v11.5 — AI Agent Hub (UPGRADED)
 * Google Forms w/ branding + signature + hpdeskg9@gmail.com sender
 * Auto-send SMS/Email for approvals · Google Forms builder · Intelligent workflow
 * Claude AI (Anthropic) · Twilio SMS/WA · Supabase Edge Functions
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { sendSms } from "@/lib/sms";
import type React from "react";

const db = supabase as any;
const SUPA_URL  = "https://yvjfehnzbzjliizjvuhq.supabase.co";
const SUPA_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2amZlaG56YnpqbGlpemp2dWhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMDg0NjYsImV4cCI6MjA3NjU4NDQ2Nn0.mkDvC1s90bbRBRKYZI6nOTxEpFrGKMNmWgTENeMTSnc";

// ── Branding constants ──────────────────────────────────────────────
const LOGO_B64   = "data:image/png;base64,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";
const EMBU_B64   = "data:image/jpeg;base64,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";
const SENDER_EMAIL = "hpdeskg9@gmail.com";
const HOSPITAL_NAME = "Embu Level 5 Hospital";
const SYSTEM_NAME   = "EL5 MediProcure";
const SYSTEM_VERSION = "v11.5";
const PORTAL_URL    = "https://procurbosse.edgeone.app";
const EMBU_COUNTY   = "Embu County Government";

// ── Colors ─────────────────────────────────────────────────────────
const C = {
  bg:"#0a0f1e", card:"#0f1628", border:"#1e2d4a", accent:"#00d4ff",
  purple:"#7c3aed", green:"#10b981", orange:"#f59e0b", red:"#ef4444",
  text:"#e2e8f0", muted:"#64748b", teal:"#0891b2"
};

// ── Form ID generator ───────────────────────────────────────────────
function genFormId(type: string): string {
  const d = new Date();
  const dt = d.getFullYear().toString() +
    String(d.getMonth()+1).padStart(2,"0") +
    String(d.getDate()).padStart(2,"0");
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `EL5-${type.toUpperCase().replace(/\s+/g,"-").slice(0,8)}-${dt}-${rand}`;
}

// ── Form Signature block ────────────────────────────────────────────
function FormSignature({ formId, formTitle }: { formId: string; formTitle: string }) {
  const now = new Date().toLocaleString("en-KE", { dateStyle:"long", timeStyle:"short" });
  return (
    <div style={{
      borderTop:"2px solid #673ab7", marginTop:20, paddingTop:14,
      background:"#f3f0ff", borderRadius:"0 0 8px 8px", padding:"14px 20px 12px"
    }}>
      <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:8}}>
        <img src={LOGO_B64} alt="EL5 Logo" style={{width:28, height:28, borderRadius:4}} />
        <img src={EMBU_B64} alt="Embu County" style={{width:28, height:28, borderRadius:4}} />
        <div>
          <div style={{fontSize:11, fontWeight:700, color:"#0e2a4a"}}>{SYSTEM_NAME} · {HOSPITAL_NAME}</div>
          <div style={{fontSize:10, color:"#6b7280"}}>{EMBU_COUNTY} · Health Procurement ERP</div>
        </div>
      </div>
      <div style={{fontSize:10, color:"#9ca3af", fontFamily:"monospace"}}>
        <span style={{color:"#673ab7", fontWeight:700}}>Form ID: {formId}</span>
        &nbsp;·&nbsp;{formTitle}
        &nbsp;·&nbsp;Generated: {now}
      </div>
      <div style={{fontSize:10, color:"#9ca3af", marginTop:3}}>
        Sender: {SENDER_EMAIL} · Portal: {PORTAL_URL} · {SYSTEM_VERSION}
      </div>
    </div>
  );
}

// ── Branded Form Preview (Google Forms style) ──────────────────────
function BrandedFormPreview({
  formTitle, formDesc, formFields, formId
}: {
  formTitle:string; formDesc:string; formFields:string[]; formId:string;
}) {
  return (
    <div style={{background:"#f0f4f8", borderRadius:12, padding:16}}>
      {/* Google Forms top color band */}
      <div style={{
        background:"linear-gradient(135deg,#0e2a4a 0%,#673ab7 60%,#0e7490 100%)",
        borderRadius:"12px 12px 0 0", padding:"20px 24px", marginBottom:0,
        display:"flex", alignItems:"center", gap:14
      }}>
        <img src={LOGO_B64} alt="EL5" style={{width:42,height:42,borderRadius:8,background:"rgba(255,255,255,.15)",padding:2}} />
        <div>
          <div style={{color:"#fff",fontWeight:800,fontSize:17,letterSpacing:"-.01em"}}>{formTitle}</div>
          <div style={{color:"rgba(255,255,255,.75)",fontSize:11,marginTop:3}}>{HOSPITAL_NAME} · {EMBU_COUNTY}</div>
        </div>
        <img src={EMBU_B64} alt="Embu" style={{width:36,height:36,borderRadius:4,marginLeft:"auto",opacity:.9}} />
      </div>

      {/* Description bar */}
      <div style={{background:"#fff",padding:"12px 24px",borderBottom:"2px solid #673ab7",marginBottom:12}}>
        <p style={{margin:0,fontSize:12,color:"#374151",lineHeight:1.6}}>{formDesc}</p>
        <p style={{margin:"6px 0 0",fontSize:10,color:"#9ca3af"}}>
          🔒 Submitted via {SYSTEM_NAME} · All responses are recorded in the ERP system
        </p>
      </div>

      {/* Form fields */}
      <div style={{background:"#fff",padding:"16px 24px",borderRadius:6,boxShadow:"0 1px 3px rgba(0,0,0,.1)"}}>
        {formFields.map((f,i)=>(
          <div key={i} style={{marginBottom:18}}>
            <div style={{fontSize:13,fontWeight:500,marginBottom:6,color:"#1f2937",display:"flex",alignItems:"center",gap:6}}>
              <span style={{color:"#673ab7",fontWeight:700,fontSize:11}}>{i+1}.</span>
              {f}
              <span style={{color:"#ef4444",fontSize:11}}>*</span>
            </div>
            <div style={{
              borderBottom:"1px solid #9ca3af",height:28,
              borderBottomColor:"#673ab7",transition:"border-color .2s"
            }} />
          </div>
        ))}

        {/* Submit button (Google Forms style) */}
        <div style={{marginTop:8}}>
          <div style={{
            display:"inline-block",padding:"10px 24px",
            background:"#673ab7",borderRadius:6,color:"#fff",
            fontSize:13,fontWeight:700,cursor:"pointer"
          }}>Submit</div>
        </div>
      </div>

      {/* Signature footer */}
      <div style={{
        background:"#fff",borderTop:"2px solid #673ab7",
        borderRadius:"0 0 12px 12px",padding:"12px 24px",marginTop:8
      }}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
          <img src={LOGO_B64} alt="" style={{width:20,height:20}} />
          <span style={{fontSize:11,fontWeight:700,color:"#0e2a4a"}}>{SYSTEM_NAME} · {HOSPITAL_NAME}</span>
          <span style={{fontSize:10,color:"#9ca3af",marginLeft:"auto"}}>Powered by {SYSTEM_NAME} {SYSTEM_VERSION}</span>
        </div>
        <div style={{fontSize:10,color:"#9ca3af",fontFamily:"monospace"}}>
          ID: <span style={{color:"#673ab7",fontWeight:700}}>{formId}</span>
          &nbsp;·&nbsp;Sender: {SENDER_EMAIL}
          &nbsp;·&nbsp;{PORTAL_URL}
        </div>
      </div>
    </div>
  );
}

type AgentTab = "overview"|"approvals"|"forms"|"email"|"logs"|"settings";
type AgentStatus = "idle"|"running"|"paused"|"error";

// ── Built-in approval rules ─────────────────────────────────────────
const APPROVAL_RULES = [
  { id:"req_submit",  label:"Requisition Submitted",     trigger:"requisitions.INSERT",     channel:["sms","email","whatsapp"], to:"procurement_manager", threshold:0,       active:true },
  { id:"req_approve", label:"Requisition Approval Needed", trigger:"requisitions.UPDATE",  channel:["sms","whatsapp"],         to:"hod",                  threshold:50000,   active:true },
  { id:"po_raised",   label:"Purchase Order Raised",      trigger:"purchase_orders.INSERT", channel:["email","whatsapp"],      to:"accountant",           threshold:0,       active:true },
  { id:"po_above",    label:"PO Above KES 500k",          trigger:"purchase_orders.INSERT", channel:["sms","email"],           to:"cfo",                  threshold:500000,  active:true },
  { id:"grn_done",    label:"Goods Received (GRN)",       trigger:"goods_received.INSERT",  channel:["email"],                 to:"accountant",           threshold:0,       active:true },
  { id:"low_stock",   label:"Low Stock Alert",            trigger:"inventory.low_stock",    channel:["sms","whatsapp"],        to:"procurement_officer",  threshold:0,       active:false },
  { id:"payment_pv",  label:"Payment Voucher Submitted",  trigger:"payment_vouchers.INSERT",channel:["sms","email"],           to:"cfo",                  threshold:100000,  active:true },
  { id:"budget_alert",label:"Budget 80% Consumed",        trigger:"budgets.threshold",      channel:["email","sms"],           to:"cfo",                  threshold:80,      active:false },
  { id:"contract_exp",label:"Contract Expiry (30 days)", trigger:"contracts.expiry",        channel:["email"],                 to:"procurement_manager",  threshold:30,      active:true },
  { id:"tender_award",label:"Tender Award",               trigger:"tenders.UPDATE",         channel:["sms","email","whatsapp"],to:"supplier_contact",     threshold:0,       active:true },
];

// ── Google Form templates ───────────────────────────────────────────
const FORM_TEMPLATES = [
  { id:"supplier_eval", icon:"🏭", label:"Supplier Evaluation",    shortId:"SUP-EVAL",
    desc:"Rate supplier performance, delivery & quality — Embu Level 5 Hospital",
    fields:["Supplier Name","Supplier Code (if known)","Delivery Timeliness (1–5)","Quality Rating (1–5)","Price Competitiveness (1–5)","Compliance & Documentation","Comments / Issues","Recommend for future contracts? (Yes/No)"] },
  { id:"grn_feedback",  icon:"📦", label:"GRN Feedback Form",      shortId:"GRN-FDBK",
    desc:"Goods received condition & completeness report — Embu Level 5 Hospital",
    fields:["GRN Number","Purchase Order No.","Supplier Name","Item Condition (Good / Damaged / Partial)","Quantity Correct?","Quality Meets Specification?","Delivery Notes & Discrepancies","Receiving Officer Name & Signature"] },
  { id:"dept_feedback", icon:"🏥", label:"Department Satisfaction", shortId:"DEPT-SAT",
    desc:"Department heads rate the EL5 MediProcure procurement service",
    fields:["Department Name","Procurement Officer Assigned","Service Rating (1–5)","Response Time Rating (1–5)","Issues Encountered","Suggestions for Improvement","Overall Satisfaction (1–10)"] },
  { id:"tender_review", icon:"📋", label:"Tender Evaluation Form", shortId:"TNDR-EVAL",
    desc:"Bid evaluation scoring sheet — Embu Level 5 Hospital Tenders Committee",
    fields:["Tender Number","Bidder / Company Name","Technical Score (0–40)","Financial Score (0–40)","Compliance Score (0–20)","Total Score (auto)","Evaluator Name","Recommendation (Award/Reject)","Evaluator Signature & Date"] },
  { id:"patient_supply",icon:"💊", label:"Patient Supply Feedback", shortId:"PAT-SUPP",
    desc:"Ward staff feedback on medical supply chain — Embu Level 5 Hospital",
    fields:["Ward / Clinical Unit","Date of Report","Supply Adequacy Rating (1–5)","Items Out of Stock (list)","Critical Shortages (mark urgent)","Reported By (Name & Role)","Recommended Reorder Priority"] },
  { id:"staff_nps",     icon:"⭐", label:"Staff NPS Survey",        shortId:"STAFF-NPS",
    desc:"Staff satisfaction with EL5 MediProcure (ProcurBosse) portal",
    fields:["Role / Department","Would Recommend ProcurBosse? (0–10)","Ease of Use (1–5)","Fastest Feature to Use","Slowest / Most Frustrating Feature","Feature Requests","Overall Comments"] },
];

interface AgentLog {
  id: string; ts: string; level:"info"|"warn"|"error"|"success";
  agent: string; action: string; details: string; ref?: string;
}
interface ApprovalEvent {
  id: string; rule: string; ref: string; amount: number; recipient: string;
  channel: string; status: "sent"|"failed"|"pending"; ts: string; aiMsg?: string;
}
interface FormRecord {
  id: string; formId: string; title: string; fields: number;
  createdAt: string; url: string; sharedTo: string[];
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
  } catch {
    return generateFallbackMessage(prompt, context);
  }
}

function generateFallbackMessage(prompt: string, ctx?: Record<string,any>): string {
  const templates: Record<string,string> = {
    approval_sms:   `🏥 *${SYSTEM_NAME}*\nApproval Required: ${ctx?.ref||"REF"}\nAmount: KES ${(ctx?.amount||0).toLocaleString()}\nRequested by: ${ctx?.requestedBy||"Officer"}\n\nReply APPROVE or REJECT\n${PORTAL_URL}`,
    approval_email: `Dear ${ctx?.recipient||"Manager"},\n\nAn item requires your approval in ${SYSTEM_NAME}.\n\nRef: ${ctx?.ref||"REF"}\nAmount: KES ${(ctx?.amount||0).toLocaleString()}\nDept: ${ctx?.department||"Procurement"}\n\nPlease log in: ${PORTAL_URL}\n\nRegards,\n${SYSTEM_NAME} System\n${HOSPITAL_NAME}\nSent from: ${SENDER_EMAIL}`,
    grn_notify:     `📦 GRN ${ctx?.ref||"GRN-001"} recorded. ${ctx?.items||0} items received. Reconcile with PO ${ctx?.po||"PO-001"}.\n— ${SYSTEM_NAME}`,
    low_stock:      `⚠️ LOW STOCK: ${ctx?.item||"Item"} — ${ctx?.qty||0} ${ctx?.unit||"units"} remaining. Reorder point: ${ctx?.reorder||0}.\n— ${SYSTEM_NAME}`,
  };
  const key = prompt.toLowerCase().includes("grn") ? "grn_notify" :
              prompt.toLowerCase().includes("stock") ? "low_stock" :
              prompt.toLowerCase().includes("email") ? "approval_email" : "approval_sms";
  return templates[key] || `Notification sent for ${ctx?.ref||"item"} — ${SYSTEM_NAME}`;
}

// ── Build Google Form via Edge Function ─────────────────────────────
async function buildGoogleFormViaAPI(
  title: string, desc: string, fields: string[], formId: string, senderEmail: string
): Promise<{url: string; directUrl: string; previewUrl: string}> {
  // Call the google-forms-api edge function
  try {
    const r = await fetch(`${SUPA_URL}/functions/v1/google-forms-api`, {
      method:"POST",
      headers:{ "Authorization":`Bearer ${SUPA_ANON}`, "Content-Type":"application/json" },
      body: JSON.stringify({ action:"create_form", title, description:desc, fields, formId, senderEmail }),
    });
    if (r.ok) {
      const d = await r.json();
      if (d.ok && d.formUrl) return { url: d.formUrl, directUrl: d.editUrl||d.formUrl, previewUrl: d.previewUrl||d.formUrl };
    }
  } catch {}
  // Fallback: generate a Google Forms create URL
  const encodedTitle = encodeURIComponent(`[${formId}] ${title} — ${HOSPITAL_NAME}`);
  const createUrl = `https://docs.google.com/forms/create?title=${encodedTitle}`;
  const fallback = createUrl;
  return { url: fallback, directUrl: fallback, previewUrl: fallback };
}

export default function AIAgentPage() {
  const [tab, setTab]               = useState<AgentTab>("overview");
  const [agentStatus]               = useState<AgentStatus>("idle");
  const [rules, setRules]           = useState(APPROVAL_RULES);
  const [logs, setLogs]             = useState<AgentLog[]>([]);
  const [events, setEvents]         = useState<ApprovalEvent[]>([]);
  const [formHistory, setFormHistory] = useState<FormRecord[]>([]);
  const [running, setRunning]       = useState(false);
  const [thinking, setThinking]     = useState(false);

  // Approval sender
  const [apvPhone, setApvPhone] = useState("+254722000000");
  const [apvEmail, setApvEmail] = useState("manager@embu.go.ke");
  const [apvRef,   setApvRef]   = useState("REQ-2026-001");
  const [apvAmt,   setApvAmt]   = useState("125000");
  const [apvDept,  setApvDept]  = useState("Pharmacy");
  const [apvCh,    setApvCh]    = useState<"sms"|"email"|"whatsapp"|"all">("all");
  const [apvMsg,   setApvMsg]   = useState("");
  const [aiComposing, setAiComposing] = useState(false);

  // Google Form builder
  const [selTpl,    setSelTpl]    = useState(FORM_TEMPLATES[0]);
  const [formTitle, setFormTitle] = useState(FORM_TEMPLATES[0].label);
  const [formDesc,  setFormDesc]  = useState(FORM_TEMPLATES[0].desc);
  const [formFields, setFormFields] = useState<string[]>(FORM_TEMPLATES[0].fields);
  const [newField,  setNewField]  = useState("");
  const [formLink,  setFormLink]  = useState("");
  const [formId,    setFormId]    = useState("");
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
        setStats(s=>({...s, sent: evts.filter(e=>e.status==="sent").length, failed: evts.filter(e=>e.status==="failed").length}));
      }
    } catch {}
  },[]);

  useEffect(() => { loadHistory(); },[loadHistory]);

  // Realtime listeners
  useEffect(() => {
    const activeRules = rules.filter(r => r.active);
    const reqChannel = (db as any).channel("ai-agent-requisitions")
      .on("postgres_changes", { event:"INSERT", schema:"public", table:"requisitions" }, async (payload: any) => {
        const rec = payload.new;
        if (!activeRules.find(r => r.id === "req_submit")) return;
        addLog("info","Auto Agent","trigger",`New requisition: ${rec.id}`, rec.id);
        const msg = await callAIAgent("Generate a brief SMS that a new requisition was submitted", {
          ref: rec.id, amount: rec.total_amount||0, department: rec.department||"Unknown", channel:"sms"
        });
        addLog("success","Auto Agent","auto-notify",`Notification queued for ${rec.id}`, rec.id);
        setEvents(prev => [{
          id: Date.now().toString(), rule:"req_submit", ref: rec.id||"REQ-NEW",
          amount: rec.total_amount||0, recipient:"procurement_manager",
          channel:"sms", status:"pending", ts: new Date().toISOString(), aiMsg: msg,
        }, ...prev]);
      }).subscribe();
    return () => { (db as any).removeChannel(reqChannel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rules]);

  // ── AI compose ──────────────────────────────────────────────────────
  const aiCompose = async () => {
    setAiComposing(true);
    addLog("info","AI Agent","compose","Generating approval message…", apvRef);
    const msg = await callAIAgent(
      `Generate a professional ${apvCh==="email"?"email":"WhatsApp/SMS"} approval notification for ${SYSTEM_NAME} hospital procurement.`,
      { ref:apvRef, amount:parseInt(apvAmt)||0, department:apvDept, channel:apvCh, requestedBy:"Procurement Officer", hospital:HOSPITAL_NAME, senderEmail:SENDER_EMAIL }
    );
    setApvMsg(msg);
    addLog("success","AI Agent","compose","Message composed", apvRef);
    setAiComposing(false);
  };

  // ── Send approval ───────────────────────────────────────────────────
  const sendApproval = async () => {
    if (!apvMsg) { toast({title:"Generate or type a message first",variant:"destructive"}); return; }
    setRunning(true);
    addLog("info","Approval Agent","send",`Sending ${apvCh} to ${apvPhone}`, apvRef);
    const channels = apvCh==="all" ? ["sms","whatsapp","email"] : [apvCh];
    let sent = 0, failed = 0;
    for (const ch of channels) {
      if ((ch==="sms"||ch==="whatsapp") && apvPhone) {
        const r = await sendSms({ to:apvPhone, message:apvMsg, channel:ch as any, module:"ai_approval", recipientName:"Approver", department:apvDept });
        r.ok ? (sent++, addLog("success","Approval Agent",ch,`Sent to ${apvPhone}`,apvRef))
              : (failed++, addLog("error","Approval Agent",ch,`Failed: ${r.error}`,apvRef));
      }
      if (ch==="email" && apvEmail) {
        try {
          await db.functions.invoke("send-email", { body:{ to:apvEmail, from:SENDER_EMAIL, subject:`Approval Required: ${apvRef}`, body:apvMsg, module:"ai_approval" }});
          sent++; addLog("success","Approval Agent","email",`Email sent (${SENDER_EMAIL} → ${apvEmail})`,apvRef);
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

  // ── Build Google Form ────────────────────────────────────────────────
  const buildGoogleForm = async () => {
    setBuildingForm(true);
    const newFormId = genFormId(selTpl.shortId);
    setFormId(newFormId);
    addLog("info","Form Agent","build",`Building branded Google Form [${newFormId}]: ${formTitle}`);

    const { url } = await buildGoogleFormViaAPI(formTitle, formDesc, formFields, newFormId, SENDER_EMAIL);
    setFormLink(url);
    setStats(s=>({...s, forms:s.forms+1}));

    // Record in history
    setFormHistory(prev => [{
      id: Date.now().toString(),
      formId: newFormId,
      title: formTitle,
      fields: formFields.length,
      createdAt: new Date().toISOString(),
      url,
      sharedTo: [],
    }, ...prev]);

    addLog("success","Form Agent","build",`Form [${newFormId}] created: ${url}`, formTitle);
    toast({ title:"✅ Google Form Created", description:`Form ID: ${newFormId}` });
    setBuildingForm(false);
  };

  // ── Share form ───────────────────────────────────────────────────────
  const shareForm = async () => {
    if (!formLink) { toast({title:"Build a form first",variant:"destructive"}); return; }
    const sig = `\n\n---\nForm ID: ${formId}\nIssued by: ${SYSTEM_NAME} · ${HOSPITAL_NAME}\nSender: ${SENDER_EMAIL}`;
    const msg = `🏥 ${SYSTEM_NAME} — ${formTitle}\nPlease complete this form:\n${formLink}${sig}`;
    let sent = 0;
    if (formSharePhone) {
      const r = await sendSms({to:formSharePhone, message:msg, channel:"sms", module:"ai_form"});
      if (r.ok) { sent++; addLog("success","Form Agent","share-sms",`SMS sent to ${formSharePhone}`, formTitle); }
    }
    if (formShareEmail) {
      try {
        await db.functions.invoke("send-email", { body:{
          to: formShareEmail, from: SENDER_EMAIL,
          subject:`[${formId}] ${formTitle} — ${SYSTEM_NAME}`,
          body: msg, module:"ai_form"
        }});
        sent++; addLog("success","Form Agent","share-email",`Email sent (${SENDER_EMAIL} → ${formShareEmail})`, formTitle);
      } catch {}
    }
    toast({ title: sent>0 ? "✅ Form shared" : "Enter phone or email", variant: sent>0?"default":"destructive" });
  };

  // ── Send email ───────────────────────────────────────────────────────
  const sendEmail = async () => {
    if (!emlTo||!emlSub||!emlBody) return toast({title:"Fill all fields",variant:"destructive"});
    setEmlSending(true);
    addLog("info","Email Agent","send",`Sending from ${SENDER_EMAIL} → ${emlTo}`, emlSub);
    try {
      await db.functions.invoke("send-email",{body:{ to:emlTo, from:SENDER_EMAIL, subject:emlSub, body:emlBody, module:"ai_agent" }});
      addLog("success","Email Agent","send",`Email delivered: ${SENDER_EMAIL} → ${emlTo}`, emlSub);
      toast({title:"✅ Email sent", description:`From: ${SENDER_EMAIL}`});
      setEmlTo(""); setEmlSub(""); setEmlBody("");
    } catch(e:any) {
      addLog("error","Email Agent","send",e.message, emlSub);
      toast({title:"Email failed",description:e.message,variant:"destructive"});
    }
    setEmlSending(false);
  };

  const aiEmailCompose = async () => {
    if (!emlSub) return toast({title:"Enter a subject first",variant:"destructive"});
    setThinking(true);
    addLog("info","AI Agent","compose",`Writing email: "${emlSub}"`);
    const body = await callAIAgent(
      `Write a professional procurement email for ${SYSTEM_NAME} hospital. Subject: ${emlSub}`,
      { department:apvDept, hospital:HOSPITAL_NAME, senderEmail:SENDER_EMAIL }
    );
    setEmlBody(body);
    setThinking(false);
    addLog("success","AI Agent","compose","Email body composed");
  };

  const toggleRule = (id:string) => setRules(r=>r.map(x=>x.id===id?{...x,active:!x.active}:x));

  // ── Styles ──────────────────────────────────────────────────────────
  const S: React.CSSProperties = { background:C.bg, minHeight:"100vh", color:C.text, fontFamily:"'Segoe UI',system-ui,sans-serif" };
  const card = (ex?:React.CSSProperties): React.CSSProperties => ({ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"20px 24px", ...ex });
  const inp: React.CSSProperties = { width:"100%", background:"#0a0f1e", border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 12px", color:C.text, fontSize:13, outline:"none", boxSizing:"border-box" as const };
  const btn = (col:string, ex?:React.CSSProperties): React.CSSProperties => ({ background:col, color:"#fff", border:"none", borderRadius:8, padding:"9px 18px", fontWeight:600, cursor:"pointer", fontSize:13, transition:"opacity .15s", ...ex });
  const levelCol: Record<string,string> = { info:C.accent, warn:C.orange, error:C.red, success:C.green };

  const TABS: {id:AgentTab;label:string;icon:string}[] = [
    {id:"overview",  label:"Overview",  icon:"🤖"},
    {id:"approvals", label:"Approvals", icon:"✅"},
    {id:"forms",     label:"Forms",     icon:"📋"},
    {id:"email",     label:"Email",     icon:"📧"},
    {id:"logs",      label:"Logs",      icon:"📜"},
    {id:"settings",  label:"Rules",     icon:"⚙️"},
  ];

  return (
    <div style={S}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={{background:`linear-gradient(135deg, #0f1628 0%, #1a0a3e 50%, #0a1628 100%)`, padding:"18px 28px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between"}}>
        <div style={{display:"flex", alignItems:"center", gap:14}}>
          <img src={LOGO_B64} alt="EL5" style={{width:44,height:44,borderRadius:10,border:`2px solid ${C.purple}44`}} />
          <img src={EMBU_B64} alt="Embu" style={{width:36,height:36,borderRadius:8,opacity:.85}} />
          <div>
            <div style={{fontSize:19,fontWeight:800,background:`linear-gradient(90deg,${C.accent},${C.purple})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>AI Agent Hub</div>
            <div style={{fontSize:11,color:C.muted}}>{SYSTEM_NAME} · {HOSPITAL_NAME} · {EMBU_COUNTY}</div>
            <div style={{fontSize:10,color:C.teal,marginTop:1}}>📧 Sender: {SENDER_EMAIL}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          {[
            {l:"Sent",v:stats.sent,c:C.green},
            {l:"Failed",v:stats.failed,c:C.red},
            {l:"Forms",v:stats.forms,c:C.purple},
            {l:"Rules Active",v:rules.filter(r=>r.active).length,c:C.accent},
          ].map(s=>(
            <div key={s.l} style={{textAlign:"center",padding:"6px 12px",background:"rgba(255,255,255,.04)",borderRadius:8,border:`1px solid ${s.c}33`}}>
              <div style={{fontSize:18,fontWeight:700,color:s.c}}>{s.v}</div>
              <div style={{fontSize:10,color:C.muted}}>{s.l}</div>
            </div>
          ))}
          <div style={{width:8,height:8,borderRadius:4,background:agentStatus==="running"?C.green:C.muted}} />
          <span style={{fontSize:11,color:C.muted}}>Agent {agentStatus}</span>
        </div>
      </div>

      {/* ── Sender badge ───────────────────────────────────────────── */}
      <div style={{background:`${C.teal}15`,borderBottom:`1px solid ${C.teal}33`,padding:"6px 28px",display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:11,color:C.teal,fontWeight:700}}>📧 All emails sent via: {SENDER_EMAIL}</span>
        <span style={{fontSize:10,color:C.muted}}>·</span>
        <span style={{fontSize:11,color:C.muted}}>Google Forms branded with {SYSTEM_NAME} logo + unique Form ID signature</span>
        <span style={{fontSize:10,color:C.muted}}>·</span>
        <span style={{fontSize:11,color:C.muted}}>{SYSTEM_VERSION}</span>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────── */}
      <div style={{display:"flex",background:C.card,borderBottom:`1px solid ${C.border}`,paddingLeft:28,overflowX:"auto"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{background:"none",border:"none",padding:"12px 20px",cursor:"pointer",fontSize:13,fontWeight:tab===t.id?700:500,color:tab===t.id?C.accent:C.muted,borderBottom:`2px solid ${tab===t.id?C.accent:"transparent"}`,display:"flex",alignItems:"center",gap:7,whiteSpace:"nowrap",transition:"color .15s"}}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div style={{padding:"24px 28px"}}>

        {/* ── OVERVIEW ─────────────────────────────────────────────── */}
        {tab==="overview" && (
          <div>
            {/* Branding card */}
            <div style={{...card({marginBottom:18}), background:`linear-gradient(135deg,#0e2a4a22,#67134422)`, borderColor:C.purple}}>
              <div style={{display:"flex",alignItems:"center",gap:16}}>
                <img src={LOGO_B64} alt="EL5" style={{width:52,height:52,borderRadius:10}} />
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:16,color:C.text}}>{SYSTEM_NAME} · AI Agent Hub {SYSTEM_VERSION}</div>
                  <div style={{fontSize:12,color:C.muted,marginTop:2}}>{HOSPITAL_NAME} · {EMBU_COUNTY} · Health Procurement ERP</div>
                  <div style={{fontSize:11,color:C.teal,marginTop:3}}>All outbound email: <b>{SENDER_EMAIL}</b> · Forms carry unique EL5 signature ID</div>
                </div>
                <img src={EMBU_B64} alt="Embu County" style={{width:52,height:52,borderRadius:8,opacity:.9}} />
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:20}}>
              {[
                {icon:"🤖",label:"AI Approval Agent",desc:"Auto-generates and sends SMS/WhatsApp/Email notifications when procurement events occur",col:C.purple,status:"Active"},
                {icon:"📋",label:"Google Forms Agent",desc:"Builds and distributes branded evaluation, feedback, and NPS forms with EL5 logo and unique Form IDs",col:C.accent,status:"Active"},
                {icon:"📧",label:"Smart Email Agent",desc:`AI-composed emails for approvals, forms, and procurement notifications — sent from ${SENDER_EMAIL}`,col:C.green,status:"Active"},
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
                <div style={{fontWeight:700,fontSize:14,marginBottom:14,color:C.accent}}>⚡ Quick Actions</div>
                {[
                  {label:"Send Approval Request (SMS)",onClick:()=>setTab("approvals"),col:C.green},
                  {label:"Create Supplier Eval Form",onClick:()=>{setSelTpl(FORM_TEMPLATES[0]);setTab("forms");},col:C.accent},
                  {label:"Send GRN Notification (Email)",onClick:()=>setTab("email"),col:C.purple},
                  {label:"Broadcast Budget Alert",onClick:()=>setTab("approvals"),col:C.orange},
                ].map(a=>(
                  <button key={a.label} onClick={a.onClick} style={btn(a.col+"22",{color:a.col,border:`1px solid ${a.col}44`,width:"100%",textAlign:"left",padding:"10px 14px",marginBottom:6})}>
                    {a.label} →
                  </button>
                ))}
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
                {events.length===0 && <div style={{fontSize:13,color:C.muted,textAlign:"center",padding:20}}>No activity yet</div>}
              </div>
            </div>
          </div>
        )}

        {/* ── APPROVALS ─────────────────────────────────────────────── */}
        {tab==="approvals" && (
          <div style={{display:"grid",gridTemplateColumns:"1fr 420px",gap:20}}>
            <div>
              <div style={card({marginBottom:16})}>
                <div style={{fontWeight:700,fontSize:15,marginBottom:16,color:C.accent}}>✅ Send Approval Notification</div>
                <div style={{fontSize:11,color:C.teal,background:`${C.teal}15`,borderRadius:6,padding:"6px 12px",marginBottom:14}}>
                  📧 Emails sent from: <b>{SENDER_EMAIL}</b>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                  <div>
                    <label style={{fontSize:11,color:C.muted,display:"block",marginBottom:4}}>Phone Number</label>
                    <input style={inp} value={apvPhone} onChange={e=>setApvPhone(e.target.value)} placeholder="+254722000000" />
                  </div>
                  <div>
                    <label style={{fontSize:11,color:C.muted,display:"block",marginBottom:4}}>Recipient Email</label>
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
                  <button onClick={()=>setApvMsg("")} style={btn(C.muted,{padding:"11px 16px"})}>Clear</button>
                </div>
              </div>

              <div style={card({padding:0,overflow:"hidden"})}>
                <div style={{padding:"14px 20px",borderBottom:`1px solid ${C.border}`,fontWeight:700,fontSize:13,color:C.accent}}>📬 Sent Approvals</div>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead><tr style={{background:"#0a0f1e"}}>{["Ref","Amount","Recipient","Channel","Status","Time"].map(h=><th key={h} style={{padding:"8px 14px",textAlign:"left",color:C.muted,fontWeight:600,fontSize:11}}>{h}</th>)}</tr></thead>
                  <tbody>
                    {events.slice(0,8).map(e=>(
                      <tr key={e.id} style={{borderTop:`1px solid ${C.border}`}}>
                        <td style={{padding:"9px 14px",fontWeight:600}}>{e.ref}</td>
                        <td style={{padding:"9px 14px",color:C.orange}}>KES {e.amount.toLocaleString()}</td>
                        <td style={{padding:"9px 14px",color:C.muted,fontSize:11}}>{e.recipient}</td>
                        <td style={{padding:"9px 14px"}}><span style={{fontSize:10,padding:"2px 7px",borderRadius:6,background:`${C.accent}22`,color:C.accent}}>{e.channel}</span></td>
                        <td style={{padding:"9px 14px"}}><span style={{fontSize:10,padding:"2px 7px",borderRadius:6,fontWeight:600,background:e.status==="sent"?`${C.green}22`:`${C.red}22`,color:e.status==="sent"?C.green:C.red}}>{e.status}</span></td>
                        <td style={{padding:"9px 14px",color:C.muted,fontSize:11}}>{e.ts?new Date(e.ts).toLocaleString("en-KE",{dateStyle:"short",timeStyle:"short"}):""}</td>
                      </tr>
                    ))}
                    {events.length===0 && <tr><td colSpan={6} style={{padding:30,textAlign:"center",color:C.muted}}>No approvals sent yet</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick templates */}
            <div style={card()}>
              <div style={{fontWeight:700,fontSize:13,marginBottom:12,color:C.accent}}>⚡ Quick Approval Templates</div>
              {[
                {label:"Requisition Approved",msg:"✅ Your requisition {ref} has been APPROVED. PO will be raised shortly. — {sys}"},
                {label:"Requisition Rejected",msg:"❌ Requisition {ref} REJECTED. Please review and resubmit. — {sys}"},
                {label:"PO Approved",         msg:"✅ Purchase Order {ref} APPROVED. Amount: KES {amount}. — {sys}"},
                {label:"Payment Approved",    msg:"✅ Payment Voucher {ref} APPROVED. KES {amount}. — {sys}"},
                {label:"GRN Notification",    msg:"📦 GRN {ref} recorded. Please proceed with 3-way match. — {sys}"},
                {label:"Urgent Approval",     msg:"🚨 URGENT: {ref} requires immediate approval. KES {amount}. — {sys}"},
              ].map(t=>(
                <button key={t.label} onClick={()=>setApvMsg(
                  t.msg.replace("{ref}",apvRef)
                       .replace("{amount}",(parseInt(apvAmt)||0).toLocaleString())
                       .replace("{sys}",SYSTEM_NAME)
                )} style={{background:`${C.border}`,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 12px",cursor:"pointer",textAlign:"left",width:"100%",marginBottom:6,color:C.text}}>
                  <div style={{fontSize:12,fontWeight:600,color:C.accent}}>{t.label}</div>
                  <div style={{fontSize:11,color:C.muted,marginTop:2}}>{t.msg.slice(0,60)}…</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── FORMS ─────────────────────────────────────────────────── */}
        {tab==="forms" && (
          <div>
            {/* Branding notice */}
            <div style={{background:`${C.purple}15`,border:`1px solid ${C.purple}44`,borderRadius:10,padding:"10px 18px",marginBottom:16,display:"flex",alignItems:"center",gap:12}}>
              <img src={LOGO_B64} alt="EL5" style={{width:32,height:32,borderRadius:6}} />
              <img src={EMBU_B64} alt="Embu" style={{width:28,height:28,borderRadius:4}} />
              <div>
                <span style={{fontSize:12,fontWeight:700,color:C.purple}}>Google Forms Branding Active</span>
                <span style={{fontSize:11,color:C.muted,marginLeft:10}}>Every form includes EL5 + Embu County logos, a unique Form ID, and is sent from <b style={{color:C.teal}}>{SENDER_EMAIL}</b></span>
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"280px 1fr",gap:20}}>
              {/* Template selector */}
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div style={card({padding:"16px 14px"})}>
                  <div style={{fontWeight:700,fontSize:13,marginBottom:12,color:C.accent}}>📋 Templates</div>
                  {FORM_TEMPLATES.map(t=>(
                    <button key={t.id} onClick={()=>{setSelTpl(t);setFormTitle(t.label);setFormDesc(t.desc);setFormFields([...t.fields]);setFormLink("");setFormId("");}}
                      style={{background:selTpl.id===t.id?`${C.purple}22`:"transparent",border:`1px solid ${selTpl.id===t.id?C.purple:C.border}`,borderRadius:8,padding:"9px 10px",cursor:"pointer",textAlign:"left",width:"100%",marginBottom:6,transition:"all .15s"}}>
                      <div style={{fontSize:17,marginBottom:2}}>{t.icon}</div>
                      <div style={{fontSize:12,fontWeight:600,color:selTpl.id===t.id?C.purple:C.text}}>{t.label}</div>
                      <div style={{fontSize:10,color:C.muted,marginTop:1}}>{t.fields.length} fields · ID: {t.shortId}</div>
                    </button>
                  ))}
                </div>

                {/* Form history */}
                {formHistory.length>0 && (
                  <div style={card({padding:"14px"})}>
                    <div style={{fontWeight:700,fontSize:12,marginBottom:10,color:C.accent}}>🕑 Form History</div>
                    {formHistory.slice(0,5).map(f=>(
                      <div key={f.id} style={{borderBottom:`1px solid ${C.border}`,paddingBottom:8,marginBottom:8}}>
                        <div style={{fontSize:11,fontWeight:600,color:C.text}}>{f.title}</div>
                        <div style={{fontSize:10,color:C.purple,fontFamily:"monospace"}}>{f.formId}</div>
                        <div style={{fontSize:10,color:C.muted}}>{f.fields} fields · {new Date(f.createdAt).toLocaleString("en-KE",{dateStyle:"short",timeStyle:"short"})}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Builder + preview */}
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
                    <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:10,maxHeight:200,overflowY:"auto"}}>
                      {formFields.map((f,i)=>(
                        <div key={i} style={{display:"flex",alignItems:"center",gap:8,background:"#0a0f1e",borderRadius:7,padding:"6px 12px",border:`1px solid ${C.border}`}}>
                          <span style={{color:C.accent,fontSize:12,minWidth:20,fontWeight:700}}>{i+1}.</span>
                          <span style={{flex:1,fontSize:13}}>{f}</span>
                          <button onClick={()=>setFormFields(prev=>prev.filter((_,j)=>j!==i))} style={{background:"none",border:"none",cursor:"pointer",color:C.red,fontSize:18,padding:0,lineHeight:1}}>×</button>
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

                {/* Share panel */}
                {formLink && (
                  <div style={card({borderLeft:`3px solid ${C.green}`,background:`${C.green}08`})}>
                    <div style={{fontWeight:700,fontSize:13,marginBottom:10,color:C.green}}>✅ Form Ready — Share It</div>
                    <div style={{background:C.bg,borderRadius:8,padding:"8px 14px",fontSize:11,fontFamily:"monospace",color:C.accent,marginBottom:8,wordBreak:"break-all"}}>
                      {formLink}
                    </div>
                    <div style={{fontSize:11,color:C.purple,fontFamily:"monospace",marginBottom:12,background:`${C.purple}11`,borderRadius:6,padding:"6px 12px"}}>
                      Form ID: <b>{formId}</b>
                    </div>
                    <div style={{display:"flex",gap:10,marginBottom:12}}>
                      <button onClick={()=>{navigator.clipboard.writeText(formLink);toast({title:"Link copied!"});}} style={btn(C.accent,{fontSize:12,flex:1})}>📋 Copy Link</button>
                      <button onClick={()=>{navigator.clipboard.writeText(formId);toast({title:"Form ID copied!"});}} style={btn(C.purple,{fontSize:12})}>🆔 Copy ID</button>
                      <a href={formLink} target="_blank" rel="noreferrer" style={{...btn(C.green,{fontSize:12,padding:"9px 16px",textDecoration:"none"})}}>Open ↗</a>
                    </div>
                    <div style={{fontWeight:600,fontSize:12,color:C.muted,marginBottom:8}}>Share via (from {SENDER_EMAIL}):</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                      <input style={inp} placeholder="Phone (+254…)" value={formSharePhone} onChange={e=>setFormSharePhone(e.target.value)} />
                      <input style={inp} placeholder="Email address" value={formShareEmail} onChange={e=>setFormShareEmail(e.target.value)} />
                    </div>
                    <button onClick={shareForm} style={btn(C.green,{width:"100%",fontSize:13,padding:"10px"})}>📤 Share via SMS & Email</button>
                  </div>
                )}

                {/* Branded Form Preview */}
                <div style={card({padding:"14px"})}>
                  <div style={{fontWeight:700,fontSize:13,marginBottom:12,color:C.accent}}>👁️ Branded Form Preview</div>
                  <BrandedFormPreview
                    formTitle={formTitle}
                    formDesc={formDesc}
                    formFields={formFields}
                    formId={formId||genFormId(selTpl.shortId)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── EMAIL ─────────────────────────────────────────────────── */}
        {tab==="email" && (
          <div style={{display:"grid",gridTemplateColumns:"1fr 380px",gap:20}}>
            <div style={card()}>
              <div style={{fontWeight:700,fontSize:15,marginBottom:4,color:C.accent}}>📧 AI Email Composer</div>
              <div style={{fontSize:11,color:C.teal,background:`${C.teal}15`,borderRadius:6,padding:"6px 12px",marginBottom:14}}>
                📤 From: <b>{SENDER_EMAIL}</b> · {SYSTEM_NAME} · {HOSPITAL_NAME}
              </div>
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
                  {sub:"Approval Required: {ref}", body:"Dear Manager,\n\nKindly approve {ref} — KES {amount}.\n\nLog in: {portal}\n\nRegards,\n{sys}\n{hospital}\nSent from: {sender}"},
                  {sub:"GRN Recorded: {ref}",      body:"The goods for {ref} have been received.\nPlease initiate 3-way match.\n\n— {sys}\nSent from: {sender}"},
                  {sub:"Low Stock Alert",           body:"Critical stock levels detected. Emergency procurement required.\n\nPortal: {portal}\n— {sys}\nSent from: {sender}"},
                  {sub:"Contract Renewal Notice",   body:"Contract {ref} expires in 30 days.\nPlease initiate renewal.\n\n— {sys}\nSent from: {sender}"},
                  {sub:"Payment Approved: {ref}",   body:"Payment Voucher {ref} — KES {amount} approved.\nPlease process payment.\n\n— {sys}\nSent from: {sender}"},
                ].map((t,i)=>(
                  <button key={i} onClick={()=>{
                    const rep = (s:string) => s
                      .replace("{ref}",apvRef).replace("{amount}",(parseInt(apvAmt)||0).toLocaleString())
                      .replace("{sys}",SYSTEM_NAME).replace("{hospital}",HOSPITAL_NAME)
                      .replace("{sender}",SENDER_EMAIL).replace("{portal}",PORTAL_URL);
                    setEmlSub(rep(t.sub)); setEmlBody(rep(t.body));
                  }} style={{background:C.border,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 12px",cursor:"pointer",textAlign:"left",width:"100%",marginBottom:6,color:C.text}}>
                    <div style={{fontSize:12,fontWeight:600,color:C.green}}>{t.sub.replace("{ref}",apvRef)}</div>
                    <div style={{fontSize:11,color:C.muted,marginTop:2}}>{t.body.slice(0,50)}…</div>
                  </button>
                ))}
              </div>
              <div style={card({background:`${C.purple}11`,borderColor:C.purple})}>
                <div style={{fontSize:13,fontWeight:700,color:C.purple,marginBottom:8}}>📧 Sender Identity</div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                  <img src={LOGO_B64} alt="EL5" style={{width:28,height:28,borderRadius:4}} />
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:C.text}}>{SYSTEM_NAME}</div>
                    <div style={{fontSize:11,color:C.teal}}>{SENDER_EMAIL}</div>
                  </div>
                </div>
                <ul style={{margin:0,paddingLeft:16,fontSize:12,color:C.muted,lineHeight:2}}>
                  <li>All emails sent from <b style={{color:C.teal}}>{SENDER_EMAIL}</b></li>
                  <li>Forms carry unique EL5 Form IDs</li>
                  <li>EL5 + Embu County logos embedded</li>
                  <li>Professional hospital procurement tone</li>
                  <li>Multi-channel: SMS, WhatsApp, Email</li>
                  <li>AI-composed context-aware messages</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ── LOGS ──────────────────────────────────────────────────── */}
        {tab==="logs" && (
          <div style={card({padding:0,overflow:"hidden"})}>
            <div style={{padding:"14px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontWeight:700,fontSize:14,color:C.accent}}>📜 Agent Activity Log</div>
              <button onClick={()=>setLogs([])} style={btn(C.red,{fontSize:11,padding:"5px 12px"})}>Clear Logs</button>
            </div>
            <div style={{maxHeight:600,overflowY:"auto"}}>
              {logs.length===0 && <div style={{padding:40,textAlign:"center",color:C.muted}}>No logs yet — agent activity will appear here</div>}
              {logs.map(l=>(
                <div key={l.id} style={{display:"flex",gap:12,padding:"10px 20px",borderBottom:`1px solid ${C.border}`,alignItems:"flex-start"}}>
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

        {/* ── SETTINGS / RULES ──────────────────────────────────────── */}
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
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
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
