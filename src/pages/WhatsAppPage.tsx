/**
 * EL5 MediProcure v11.0 — WhatsApp Business Workflow Hub
 * Full procure-to-pay notifications, session management, broadcast, approvals
 * Twilio WhatsApp API · Sandbox + Production
 * ProcurBosse — Embu Level 5 Hospital
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { sendSms } from "@/lib/sms";
import { TWILIO_WA, WA_CODE } from "@/lib/version";
import type React from "react";

const db = supabase as any;

const WA = {
  NUMBER:   TWILIO_WA,
  CODE:     WA_CODE,
  LINK:     `https://wa.me/14155238886?text=join%20bad-machine`,
  QR_URL:   `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://wa.me/14155238886?text=join%20bad-machine`,
};

type Tab = "sessions"|"compose"|"broadcast"|"templates"|"approvals"|"workflows"|"history"|"settings";

const GREEN = "#25D366";
const DARK  = "#075E54";
const LIGHT = "#DCF8C6";

const STATUS_C: Record<string,string> = {
  sent:"#22c55e", delivered:"#3b82f6", read:"#22c55e",
  failed:"#ef4444", queued:"#f97316", pending:"#f97316",
};

/* ── Built-in WA Templates ── */
const WA_TEMPLATES = [
  { key:"req_submitted", label:"Requisition Submitted", category:"Procurement",
    content:"🏥 *EL5 MediProcure*\nRequisition *{{num}}* submitted by *{{dept}}*.\nStatus: ⏳ Pending Approval\n_Reply APPROVE or REJECT_" },
  { key:"req_approved", label:"Requisition Approved", category:"Procurement",
    content:"🏥 *EL5 MediProcure*\n✅ Requisition *{{num}}* APPROVED by {{approver}}.\nPO will be raised shortly." },
  { key:"req_rejected", label:"Requisition Rejected", category:"Procurement",
    content:"🏥 *EL5 MediProcure*\n❌ Requisition *{{num}}* REJECTED.\nReason: {{reason}}" },
  { key:"po_raised", label:"PO Raised", category:"Procurement",
    content:"🏥 *EL5 MediProcure*\nPurchase Order *{{num}}* raised.\nSupplier: {{supplier}}\nETA: {{eta}}" },
  { key:"po_approved", label:"PO Approved", category:"Procurement",
    content:"🏥 *EL5 MediProcure*\n✅ PO *{{num}}* APPROVED.\nSupplier: {{supplier}}\nProceed with delivery." },
  { key:"grn_recorded", label:"Goods Received", category:"Inventory",
    content:"🏥 *EL5 MediProcure*\n📦 GRN recorded for PO *{{num}}*\nItems: {{items}}\nGRN#: {{grn}}" },
  { key:"low_stock", label:"Low Stock Alert", category:"Inventory",
    content:"🏥 *EL5 MediProcure*\n⚠️ *LOW STOCK ALERT*\nItem: {{item}}\nRemaining: {{qty}} {{unit}}\nReorder Point: {{reorder}}" },
  { key:"payment_approved", label:"Payment Approved", category:"Finance",
    content:"🏥 *EL5 MediProcure*\n✅ Payment Voucher *{{num}}* APPROVED\nAmount: KES {{amount}}\nPayee: {{payee}}\nDate: {{date}}" },
  { key:"invoice_matched", label:"Invoice Matched", category:"Finance",
    content:"🏥 *EL5 MediProcure*\n🔗 Invoice *{{inv}}* matched to PO *{{po}}*\nAmount: KES {{amount}}\nStatus: ✅ MATCHED" },
  { key:"budget_alert", label:"Budget Alert", category:"Finance",
    content:"🏥 *EL5 MediProcure*\n⚠️ *BUDGET ALERT*\n{{dept}} has consumed {{pct}}% of budget {{code}}.\nCFO approval required." },
  { key:"tender_award", label:"Tender Award", category:"Procurement",
    content:"🏥 *EL5 MediProcure*\n🏆 Tender *{{num}}* AWARDED to *{{supplier}}*\nValue: KES {{amount}}\nContact Procurement for next steps." },
  { key:"contract_expiry", label:"Contract Expiry", category:"Procurement",
    content:"🏥 *EL5 MediProcure*\n⚠️ Contract *{{num}}* with {{supplier}} expires *{{date}}*.\nInitiate renewal process." },
  { key:"approval_request", label:"Approval Request", category:"Workflow",
    content:"🏥 *EL5 MediProcure*\n📋 Approval Required\nModule: {{module}}\nRef: {{ref}}\nAmount: KES {{amount}}\nRequested by: {{user}}\n\n_Reply:_\n✅ *APPROVE* — to approve\n❌ *REJECT reason* — to reject" },
  { key:"join_invite", label:"Join WhatsApp Sandbox", category:"System",
    content:"🏥 *EL5 MediProcure*\nHello {{name}}! Join our WhatsApp channel:\n1. Open WhatsApp\n2. Message *+1 415 523 8886*\n3. Send the code: *join bad-machine*\n\nOr tap: " + WA.LINK },
  { key:"welcome", label:"Welcome Onboarding", category:"System",
    content:"🏥 *Welcome to EL5 MediProcure!*\nHello *{{name}}*!\nYour account is now active on the hospital procurement system.\nFor support contact IT: {{phone}}" },
  { key:"system_alert", label:"System Alert", category:"System",
    content:"🏥 *EL5 MediProcure — SYSTEM ALERT*\n{{message}}\nTime: {{time}}" },
];

const CATS = ["All","Procurement","Finance","Inventory","Workflow","System"];

/* ── Workflow automation definitions ── */
const WORKFLOWS = [
  { id:"req_auto", label:"Requisition Auto-Notify", trigger:"On requisition submit", actions:["Notify HOD via WhatsApp","Notify Procurement Manager","Log to audit trail"], enabled:true },
  { id:"po_auto", label:"PO Auto-Notify", trigger:"On PO approval/rejection", actions:["Notify requesting dept","Notify supplier contact","Update ERP"], enabled:true },
  { id:"grn_auto", label:"GRN Auto-Notify", trigger:"On goods received", actions:["Notify accounts for 3-way match","Notify stores manager","Update inventory"], enabled:true },
  { id:"low_stock", label:"Low Stock Alert", trigger:"Inventory < reorder point", actions:["Alert procurement officer","Alert inventory manager","Create auto-requisition"], enabled:false },
  { id:"payment_auto", label:"Payment Approval", trigger:"On payment voucher submit", actions:["Notify accountant","Notify CFO for amounts > KES 100k","WhatsApp approval request"], enabled:true },
  { id:"contract_expiry", label:"Contract Expiry Alert", trigger:"30 days before expiry", actions:["Alert procurement manager","Alert supplier","Create renewal task"], enabled:false },
  { id:"approval_reply", label:"WhatsApp Reply Approval", trigger:"Incoming APPROVE/REJECT message", actions:["Parse reply","Update system status","Notify requestor","Log action"], enabled:true },
];

/* ── Approval queue ── */
interface ApprovalItem {
  id: string; ref: string; type: string; amount: number;
  requestedBy: string; notifiedTo: string; status: string; sentAt: string;
}

export default function WhatsAppPage() {
  const [tab, setTab] = useState<Tab>("sessions");
  const [sessions, setSessions] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  /* Compose state */
  const [toPhone, setToPhone]   = useState("");
  const [toName,  setToName]    = useState("");
  const [msgBody, setMsgBody]   = useState("");
  const [selTpl,  setSelTpl]    = useState<(typeof WA_TEMPLATES)[0]|null>(null);
  const [tplVars, setTplVars]   = useState<Record<string,string>>({});

  /* Broadcast state */
  const [bcMsg,   setBcMsg]     = useState("");
  const [bcPhones,setBcPhones]  = useState("");
  const [bcSending,setBcSending]= useState(false);

  /* Settings */
  const [sandboxMode, setSandboxMode] = useState(true);
  const [autoRenew,   setAutoRenew]   = useState(true);
  const [workflows,   setWorkflows]   = useState(WORKFLOWS);
  const [tplCat,      setTplCat]      = useState("All");

  /* Stats */
  const [stats, setStats] = useState({ sessions:0, sent24h:0, failed:0, delivered:0 });

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await db.from("sms_conversations")
        .select("id,phone_number,last_message,last_message_at,status,metadata")
        .order("last_message_at",{ ascending:false })
        .limit(50);
      const rows = (data||[]).map((c:any) => {
        const hrs = (Date.now() - new Date(c.last_message_at||0).getTime()) / 3_600_000;
        return { ...c, active: hrs < 72, joinRequired: hrs >= 72 };
      });
      setSessions(rows);
      setStats(s => ({ ...s, sessions: rows.filter((r:any) => r.active).length }));
    } catch {}
    setLoading(false);
  },[]);

  const loadHistory = useCallback(async () => {
    try {
      const { data } = await db.from("sms_messages")
        .select("id,to_number,message_body,status,channel,sent_at,error_message,sid")
        .eq("channel","whatsapp")
        .order("sent_at",{ ascending:false })
        .limit(100);
      const rows = data||[];
      setHistory(rows);
      setStats(s => ({
        ...s,
        sent24h:    rows.filter((r:any)=>{ const h=(Date.now()-new Date(r.sent_at||0).getTime())/3_600_000; return h<24; }).length,
        failed:     rows.filter((r:any)=>r.status==="failed").length,
        delivered:  rows.filter((r:any)=>r.status==="delivered"||r.status==="read").length,
      }));
    } catch {}
  },[]);

  const loadApprovals = useCallback(async () => {
    try {
      const { data } = await db.from("sms_messages")
        .select("id,to_number,metadata,status,sent_at")
        .eq("channel","whatsapp")
        .not("metadata->approval_ref","is",null)
        .order("sent_at",{ ascending:false })
        .limit(30);
      setApprovals((data||[]).map((r:any) => ({
        id:          r.id,
        ref:         r.metadata?.approval_ref || "—",
        type:        r.metadata?.approval_type || "Unknown",
        amount:      r.metadata?.amount || 0,
        requestedBy: r.metadata?.requested_by || "—",
        notifiedTo:  r.to_number,
        status:      r.metadata?.approval_status || r.status,
        sentAt:      r.sent_at,
      })));
    } catch {}
  },[]);

  useEffect(()=>{
    loadSessions(); loadHistory(); loadApprovals();
    const iv = setInterval(()=>{ loadSessions(); loadHistory(); },60_000);
    return ()=>clearInterval(iv);
  },[loadSessions,loadHistory,loadApprovals]);

  /* Send single message */
  const sendMsg = async () => {
    if (!toPhone || !msgBody) return toast({ title:"Phone & message required", variant:"destructive" });
    setSending(true);
    try {
      const r = await sendSms({ to: toPhone, message: msgBody, channel:"whatsapp", module:"whatsapp_compose", recipientName: toName });
      if (r.ok) {
        toast({ title:"✅ Sent via WhatsApp", description:`To ${toPhone}` });
        setToPhone(""); setToName(""); setMsgBody(""); setSelTpl(null); setTplVars({});
        loadHistory();
      } else {
        toast({ title:"Send failed", description: r.error||"Unknown error", variant:"destructive" });
      }
    } catch(e:any) {
      toast({ title:"Error", description:e.message, variant:"destructive" });
    }
    setSending(false);
  };

  /* Send join invite */
  const sendJoinInvite = async (phone: string, name?: string) => {
    const msg = `🏥 *EL5 MediProcure*\nHello ${name||""}! Join our WhatsApp channel:\n1. Open WhatsApp\n2. Message *+1 415 523 8886*\n3. Send: *join bad-machine*\n\nOr tap: ${WA.LINK}`;
    setSending(true);
    const r = await sendSms({ to: phone, message: msg, channel:"sms", module:"whatsapp_join_invite", recipientName: name });
    setSending(false);
    toast({ title: r.ok ? "✅ Invite sent via SMS" : "Failed", description: r.ok ? `Join link sent to ${phone}` : r.error, variant: r.ok ? "default" : "destructive" });
  };

  /* Broadcast */
  const sendBroadcast = async () => {
    if (!bcMsg || !bcPhones) return toast({ title:"Message and numbers required", variant:"destructive" });
    const nums = bcPhones.split(/[\n,;]+/).map(s=>s.trim()).filter(Boolean);
    if (!nums.length) return toast({ title:"No valid phone numbers", variant:"destructive" });
    setBcSending(true);
    try {
      const r = await sendSms({ to: nums, message: bcMsg, channel:"whatsapp", module:"whatsapp_broadcast" });
      toast({ title:`✅ Broadcast: ${r.sent}/${r.total} sent`, description: r.failed>0 ? `${r.failed} failed` : "All delivered" });
      setBcMsg(""); setBcPhones(""); loadHistory();
    } catch(e:any) {
      toast({ title:"Broadcast failed", description:e.message, variant:"destructive" });
    }
    setBcSending(false);
  };

  /* Apply template */
  const applyTemplate = (tpl: typeof WA_TEMPLATES[0]) => {
    setSelTpl(tpl);
    const vars: Record<string,string> = {};
    const matches = [...tpl.content.matchAll(/\{\{(\w+)\}\}/g)];
    for (const m of matches) vars[m[1]] = "";
    setTplVars(vars);
    let body = tpl.content;
    for (const [k,v] of Object.entries(vars)) body = body.split(`{{${k}}}`).join(v || `[${k}]`);
    setMsgBody(body);
  };

  const updateVar = (k:string, v:string) => {
    const nv = { ...tplVars, [k]: v };
    setTplVars(nv);
    if (!selTpl) return;
    let body = selTpl.content;
    for (const [key,val] of Object.entries(nv)) body = body.split(`{{${key}}}`).join(val || `[${key}]`);
    setMsgBody(body);
  };

  const toggleWorkflow = (id:string) =>
    setWorkflows(ws => ws.map(w => w.id===id ? {...w,enabled:!w.enabled} : w));

  /* ── UI helpers ── */
  const S: React.CSSProperties = { fontFamily:"'Segoe UI',sans-serif", background:"#f0f2f5", minHeight:"100vh", padding:0 };
  const card = (extra?:React.CSSProperties): React.CSSProperties => ({
    background:"#fff", borderRadius:12, padding:"20px 24px", boxShadow:"0 1px 4px rgba(0,0,0,.08)", ...extra
  });
  const btn = (col?:string, extra?:React.CSSProperties): React.CSSProperties => ({
    background:col||GREEN, color:"#fff", border:"none", borderRadius:8, padding:"9px 18px",
    fontWeight:600, cursor:"pointer", fontSize:13, ...extra
  });
  const inp: React.CSSProperties = {
    width:"100%", border:"1px solid #e0e0e0", borderRadius:8, padding:"9px 12px",
    fontSize:13, outline:"none", boxSizing:"border-box" as any,
  };
  const TABS: {id:Tab;label:string;icon:string}[] = [
    {id:"sessions",  label:"Sessions",   icon:"💬"},
    {id:"compose",   label:"Compose",    icon:"✏️"},
    {id:"broadcast", label:"Broadcast",  icon:"📢"},
    {id:"templates", label:"Templates",  icon:"📋"},
    {id:"approvals", label:"Approvals",  icon:"✅"},
    {id:"workflows", label:"Workflows",  icon:"⚙️"},
    {id:"history",   label:"History",    icon:"📜"},
    {id:"settings",  label:"Settings",   icon:"🔧"},
  ];

  return (
    <div style={S}>
      {/* Header */}
      <div style={{background:`linear-gradient(135deg,${DARK},${GREEN})`,padding:"20px 28px",color:"#fff",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:46,height:46,borderRadius:23,background:"rgba(255,255,255,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26}}>💬</div>
          <div>
            <div style={{fontSize:20,fontWeight:700}}>WhatsApp Business Hub</div>
            <div style={{fontSize:12,opacity:.8}}>EL5 MediProcure · Powered by Twilio · {WA.NUMBER}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:16,alignItems:"center"}}>
          {[
            {l:"Active Sessions",v:stats.sessions,c:"#25D366"},
            {l:"Sent (24h)",v:stats.sent24h,c:"#3b82f6"},
            {l:"Delivered",v:stats.delivered,c:"#22c55e"},
            {l:"Failed",v:stats.failed,c:"#ef4444"},
          ].map(s=>(
            <div key={s.l} style={{textAlign:"center",padding:"6px 12px",background:"rgba(255,255,255,.12)",borderRadius:8}}>
              <div style={{fontSize:20,fontWeight:700,color:s.c}}>{s.v}</div>
              <div style={{fontSize:10,opacity:.8}}>{s.l}</div>
            </div>
          ))}
          <button onClick={()=>{loadSessions();loadHistory();}} style={btn("rgba(255,255,255,.2)",{fontSize:12,padding:"8px 14px"})}>🔄 Refresh</button>
        </div>
      </div>

      {/* Sandbox banner */}
      {sandboxMode && (
        <div style={{background:"#fff3cd",borderBottom:"1px solid #ffc107",padding:"8px 28px",fontSize:12,color:"#856404",display:"flex",alignItems:"center",gap:8}}>
          <span>⚠️</span>
          <span><b>Sandbox Mode:</b> Recipients must join first. Send <b>"{WA.CODE}"</b> to <b>{WA.NUMBER}</b> — or share the <a href={WA.LINK} target="_blank" rel="noreferrer" style={{color:DARK}}>join link</a>.</span>
          <a href={WA.QR_URL} target="_blank" rel="noreferrer" style={{marginLeft:"auto",color:DARK,fontWeight:600}}>📷 QR Code</a>
        </div>
      )}

      {/* Tabs */}
      <div style={{display:"flex",gap:0,background:"#fff",borderBottom:"1px solid #e0e0e0",paddingLeft:28,overflowX:"auto"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{background:"none",border:"none",padding:"12px 18px",cursor:"pointer",fontSize:13,fontWeight:tab===t.id?700:500,
              color:tab===t.id?DARK:"#666",borderBottom:tab===t.id?`3px solid ${GREEN}`:"3px solid transparent",
              display:"flex",alignItems:"center",gap:6,whiteSpace:"nowrap"}}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div style={{padding:"24px 28px"}}>
        {/* ── SESSIONS ── */}
        {tab==="sessions" && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h2 style={{margin:0,fontSize:16,fontWeight:700}}>Active WhatsApp Sessions</h2>
              <button onClick={loadSessions} style={btn(GREEN,{fontSize:12})}>{loading?"Loading...":"🔄 Refresh"}</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
              <div style={card({background:`linear-gradient(135deg,${GREEN},${DARK})`,color:"#fff"})}>
                <div style={{fontSize:28,fontWeight:800}}>{stats.sessions}</div>
                <div style={{fontSize:13,opacity:.9}}>Active Sessions (last 72h)</div>
              </div>
              <div style={card({display:"flex",flexDirection:"column",gap:10})}>
                <div style={{fontSize:13,fontWeight:700,marginBottom:4}}>📷 Join QR Code</div>
                <div style={{fontSize:12,color:"#666"}}>Scan to join WhatsApp sandbox</div>
                <a href={WA.LINK} target="_blank" rel="noreferrer"
                  style={{background:GREEN,color:"#fff",borderRadius:8,padding:"7px 14px",fontSize:12,fontWeight:600,textDecoration:"none",textAlign:"center"}}>
                  Open Join Link ↗
                </a>
              </div>
            </div>
            {loading ? <div style={{textAlign:"center",padding:40,color:"#999"}}>Loading sessions…</div> : (
              sessions.length===0 ? (
                <div style={card({textAlign:"center",padding:40})}>
                  <div style={{fontSize:40,marginBottom:12}}>💬</div>
                  <div style={{fontSize:15,fontWeight:600}}>No active sessions</div>
                  <div style={{color:"#888",fontSize:13,margin:"8px 0 16px"}}>Send a join invite to get users started</div>
                  <button onClick={()=>setTab("compose")} style={btn(GREEN)}>Compose First Message</button>
                </div>
              ) : (
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:12}}>
                  {sessions.map((s:any)=>(
                    <div key={s.id} style={card({borderLeft:`4px solid ${s.active?GREEN:"#e0e0e0"}`})}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                        <div>
                          <div style={{fontWeight:700,fontSize:14}}>{s.phone_number}</div>
                          <div style={{fontSize:12,color:"#888"}}>{s.last_message?.slice(0,80)}…</div>
                        </div>
                        <span style={{fontSize:11,padding:"3px 8px",borderRadius:12,background:s.active?"#dcfce7":"#fee2e2",color:s.active?"#166534":"#991b1b",fontWeight:600}}>
                          {s.active?"Active":"Expired"}
                        </span>
                      </div>
                      <div style={{fontSize:11,color:"#999",marginTop:6}}>Last: {s.last_message_at ? new Date(s.last_message_at).toLocaleString("en-KE") : "—"}</div>
                      <div style={{display:"flex",gap:8,marginTop:10}}>
                        <button onClick={()=>{setTab("compose");setToPhone(s.phone_number);}} style={btn(GREEN,{fontSize:11,padding:"5px 10px"})}>Message</button>
                        {s.joinRequired && <button onClick={()=>sendJoinInvite(s.phone_number)} style={btn("#f97316",{fontSize:11,padding:"5px 10px"})}>Re-invite</button>}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}

        {/* ── COMPOSE ── */}
        {tab==="compose" && (
          <div style={{display:"grid",gridTemplateColumns:"1fr 400px",gap:20}}>
            <div style={card()}>
              <h3 style={{margin:"0 0 16px",fontSize:15,fontWeight:700}}>✏️ Compose WhatsApp Message</h3>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                <div>
                  <label style={{fontSize:12,fontWeight:600,color:"#555",display:"block",marginBottom:4}}>Phone Number *</label>
                  <input style={inp} placeholder="+254722000000" value={toPhone} onChange={e=>setToPhone(e.target.value)} />
                </div>
                <div>
                  <label style={{fontSize:12,fontWeight:600,color:"#555",display:"block",marginBottom:4}}>Recipient Name</label>
                  <input style={inp} placeholder="John Doe" value={toName} onChange={e=>setToName(e.target.value)} />
                </div>
              </div>
              {selTpl && Object.keys(tplVars).length>0 && (
                <div style={{background:"#f8f9fa",borderRadius:8,padding:14,marginBottom:12}}>
                  <div style={{fontSize:12,fontWeight:700,marginBottom:8,color:DARK}}>📝 Fill Template Variables</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:8}}>
                    {Object.keys(tplVars).map(k=>(
                      <div key={k}>
                        <label style={{fontSize:11,color:"#666",display:"block",marginBottom:2}}>{"{{"+k+"}}"}</label>
                        <input style={{...inp,fontSize:12,padding:"6px 10px"}} placeholder={k} value={tplVars[k]} onChange={e=>updateVar(k,e.target.value)} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label style={{fontSize:12,fontWeight:600,color:"#555",display:"block",marginBottom:4}}>Message *</label>
                <textarea style={{...inp,height:160,resize:"vertical",fontFamily:"inherit"}} placeholder="Type your WhatsApp message here…\n\nSupports *bold*, _italic_, ~strikethrough~" value={msgBody} onChange={e=>setMsgBody(e.target.value)} />
                <div style={{fontSize:11,color:"#888",textAlign:"right",marginTop:2}}>{msgBody.length} chars</div>
              </div>
              <div style={{display:"flex",gap:10,marginTop:14}}>
                <button onClick={sendMsg} disabled={sending} style={btn(GREEN,{flex:1,opacity:sending?.7:1})}>
                  {sending?"Sending…":"💬 Send WhatsApp"}
                </button>
                <button onClick={()=>sendJoinInvite(toPhone,toName)} disabled={!toPhone||sending} style={btn("#f97316",{fontSize:13})}>
                  📨 Send Join Invite
                </button>
                <button onClick={()=>{setToPhone("");setToName("");setMsgBody("");setSelTpl(null);setTplVars({});}} style={btn("#6b7280",{fontSize:13})}>
                  Clear
                </button>
              </div>
            </div>
            {/* Preview */}
            <div>
              <div style={card({marginBottom:16})}>
                <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>📱 Message Preview</div>
                <div style={{background:"#e5ddd5",borderRadius:12,padding:16,minHeight:180,backgroundImage:"url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c3b9ad' fill-opacity='0.2'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")"}}>
                  {msgBody && (
                    <div style={{background:"#fff",borderRadius:"0 8px 8px 8px",padding:"10px 14px",maxWidth:"85%",boxShadow:"0 1px 2px rgba(0,0,0,.15)",marginLeft:"auto"}}>
                      <div style={{fontSize:13,lineHeight:1.5,whiteSpace:"pre-wrap",color:"#333",
                        fontWeight:msgBody.includes("*")?"normal":"normal"}}
                        dangerouslySetInnerHTML={{__html:msgBody
                          .replace(/\*(.*?)\*/g,"<b>$1</b>")
                          .replace(/_(.*?)_/g,"<i>$1</i>")
                          .replace(/~(.*?)~/g,"<s>$1</s>")
                          .replace(/\n/g,"<br/>")
                        }} />
                      <div style={{fontSize:10,color:"#888",textAlign:"right",marginTop:4}}>
                        {new Date().toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit"})} ✓✓
                      </div>
                    </div>
                  )}
                  {!msgBody && <div style={{textAlign:"center",color:"#a0887a",padding:"40px 20px",fontSize:13}}>Message preview will appear here</div>}
                </div>
              </div>
              {/* Quick templates */}
              <div style={card()}>
                <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>⚡ Quick Templates</div>
                <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:260,overflowY:"auto"}}>
                  {WA_TEMPLATES.slice(0,8).map(t=>(
                    <button key={t.key} onClick={()=>applyTemplate(t)}
                      style={{background:selTpl?.key===t.key?"#dcfce7":"#f8f9fa",border:`1px solid ${selTpl?.key===t.key?GREEN:"#e0e0e0"}`,borderRadius:8,padding:"8px 12px",cursor:"pointer",textAlign:"left",fontSize:12}}>
                      <span style={{fontWeight:600}}>{t.label}</span>
                      <span style={{fontSize:10,color:"#888",marginLeft:6}}>{t.category}</span>
                    </button>
                  ))}
                  <button onClick={()=>setTab("templates")} style={btn("#6b7280",{fontSize:12,marginTop:4})}>View All Templates →</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── BROADCAST ── */}
        {tab==="broadcast" && (
          <div style={{display:"grid",gridTemplateColumns:"1fr 380px",gap:20}}>
            <div style={card()}>
              <h3 style={{margin:"0 0 4px",fontSize:15,fontWeight:700}}>📢 WhatsApp Broadcast</h3>
              <p style={{margin:"0 0 16px",fontSize:13,color:"#666"}}>Send a message to multiple recipients at once. All recipients must have an active WhatsApp session.</p>
              <div style={{marginBottom:12}}>
                <label style={{fontSize:12,fontWeight:600,color:"#555",display:"block",marginBottom:4}}>Phone Numbers <span style={{fontWeight:400,color:"#888"}}>(one per line, comma or semicolon separated)</span></label>
                <textarea style={{...inp,height:140,resize:"vertical",fontFamily:"'Courier New',monospace",fontSize:12}}
                  placeholder={"+254722000001\n+254733000002\n+254744000003"}
                  value={bcPhones} onChange={e=>setBcPhones(e.target.value)} />
                <div style={{fontSize:11,color:"#888",marginTop:2}}>
                  {bcPhones ? bcPhones.split(/[\n,;]+/).filter(s=>s.trim()).length : 0} recipients
                </div>
              </div>
              <div style={{marginBottom:14}}>
                <label style={{fontSize:12,fontWeight:600,color:"#555",display:"block",marginBottom:4}}>Broadcast Message *</label>
                <textarea style={{...inp,height:160,resize:"vertical",fontFamily:"inherit"}}
                  placeholder="🏥 *EL5 MediProcure*&#10;Your broadcast message here…"
                  value={bcMsg} onChange={e=>setBcMsg(e.target.value)} />
                <div style={{fontSize:11,color:"#888",textAlign:"right",marginTop:2}}>{bcMsg.length} chars</div>
              </div>
              <button onClick={sendBroadcast} disabled={bcSending} style={btn(GREEN,{width:"100%",opacity:bcSending?.7:1,fontSize:14,padding:"11px"})}>
                {bcSending?"Sending broadcast…":`📢 Send to ${bcPhones?bcPhones.split(/[\n,;]+/).filter(s=>s.trim()).length:0} Recipients`}
              </button>
            </div>
            <div>
              <div style={card({marginBottom:16})}>
                <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>🎯 Quick Broadcast Templates</div>
                {[
                  {l:"Department All-Staff",nums:"All dept heads"},
                  {l:"Procurement Team",nums:"Officers & managers"},
                  {l:"Finance Team",nums:"Accountants & CFO"},
                  {l:"Suppliers (Active)",nums:"Active supplier contacts"},
                ].map(g=>(
                  <div key={g.l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #f0f0f0"}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:600}}>{g.l}</div>
                      <div style={{fontSize:11,color:"#888"}}>{g.nums}</div>
                    </div>
                    <button style={btn("#e8f5e9",{color:DARK,fontSize:11,padding:"5px 10px"})}>Load</button>
                  </div>
                ))}
              </div>
              <div style={card({background:"#fff8e1"})}>
                <div style={{fontSize:13,fontWeight:700,marginBottom:8}}>⚠️ Broadcast Guidelines</div>
                <ul style={{margin:0,paddingLeft:18,fontSize:12,color:"#666",lineHeight:1.8}}>
                  <li>Recipients must have joined the sandbox</li>
                  <li>Max 1,600 characters per message</li>
                  <li>Supports *bold*, _italic_ formatting</li>
                  <li>Rate limit: 1 msg/sec per number</li>
                  <li>For production, use approved templates</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ── TEMPLATES ── */}
        {tab==="templates" && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h2 style={{margin:0,fontSize:16,fontWeight:700}}>📋 Message Templates</h2>
              <div style={{display:"flex",gap:8}}>
                {CATS.map(c=>(
                  <button key={c} onClick={()=>setTplCat(c)}
                    style={btn(tplCat===c?DARK:"#f0f0f0",{color:tplCat===c?"#fff":"#333",fontSize:12,padding:"6px 12px"})}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:14}}>
              {WA_TEMPLATES.filter(t=>tplCat==="All"||t.category===tplCat).map(t=>(
                <div key={t.key} style={card({borderTop:`3px solid ${GREEN}`})}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:14}}>{t.label}</div>
                      <span style={{fontSize:11,padding:"2px 8px",borderRadius:12,background:"#dcfce7",color:"#166534"}}>{t.category}</span>
                    </div>
                  </div>
                  <pre style={{margin:"8px 0",fontSize:11,whiteSpace:"pre-wrap",color:"#444",background:"#f8f9fa",borderRadius:6,padding:"10px",maxHeight:120,overflow:"hidden",fontFamily:"inherit"}}>
                    {t.content}
                  </pre>
                  <div style={{display:"flex",gap:8,marginTop:10}}>
                    <button onClick={()=>{applyTemplate(t);setTab("compose");}} style={btn(GREEN,{flex:1,fontSize:12,padding:"7px"})}>Use Template</button>
                    <button onClick={()=>{setBcMsg(t.content);setTab("broadcast");}} style={btn("#3b82f6",{fontSize:12,padding:"7px 12px"})}>Broadcast</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── APPROVALS ── */}
        {tab==="approvals" && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h2 style={{margin:0,fontSize:16,fontWeight:700}}>✅ WhatsApp Approval Queue</h2>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>{
                  const msg=`🏥 *EL5 MediProcure*\n📋 *Approval Required*\nModule: Purchase Order\nRef: PO-2025-001\nAmount: KES 125,000\nRequested by: Procurement Officer\n\n_Reply:_\n✅ *APPROVE* — to approve\n❌ *REJECT reason* — to reject`;
                  setBcMsg(msg);setTab("compose");
                  toast({title:"Approval template loaded"});
                }} style={btn(GREEN,{fontSize:12})}>+ New Approval Request</button>
              </div>
            </div>
            <div style={card({marginBottom:16,background:"#f0fdf4",borderLeft:`4px solid ${GREEN}`})}>
              <div style={{fontSize:13,fontWeight:700,marginBottom:4}}>🤖 WhatsApp Reply Automation</div>
              <div style={{fontSize:12,color:"#555"}}>
                When approvers reply <b>APPROVE</b> or <b>REJECT [reason]</b>, the system automatically updates the status and notifies the requestor.
                This requires the Twilio webhook to be configured at: <code style={{background:"#e0e0e0",borderRadius:4,padding:"2px 6px"}}>/functions/v1/whatsapp-webhook</code>
              </div>
            </div>
            {approvals.length===0 ? (
              <div style={card({textAlign:"center",padding:40})}>
                <div style={{fontSize:40,marginBottom:12}}>✅</div>
                <div style={{fontSize:15,fontWeight:600}}>No pending approvals</div>
                <div style={{color:"#888",fontSize:13}}>WhatsApp approval requests will appear here</div>
              </div>
            ) : (
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(360px,1fr))",gap:12}}>
                {approvals.map(a=>(
                  <div key={a.id} style={card({borderLeft:`4px solid ${a.status==="pending"?"#f97316":a.status==="approved"?GREEN:"#ef4444"}`})}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                      <div>
                        <div style={{fontWeight:700,fontSize:14}}>{a.ref}</div>
                        <div style={{fontSize:12,color:"#888"}}>{a.type}</div>
                      </div>
                      <span style={{fontSize:11,padding:"3px 8px",borderRadius:12,fontWeight:600,
                        background:a.status==="pending"?"#fff3e0":a.status==="approved"?"#dcfce7":"#fee2e2",
                        color:a.status==="pending"?"#e65100":a.status==="approved"?"#166534":"#991b1b"}}>
                        {a.status?.toUpperCase()}
                      </span>
                    </div>
                    <div style={{fontSize:12,color:"#666",marginBottom:6}}>
                      Amount: <b>KES {a.amount?.toLocaleString()}</b> · By: {a.requestedBy}
                    </div>
                    <div style={{fontSize:11,color:"#888"}}>Notified: {a.notifiedTo} · {a.sentAt ? new Date(a.sentAt).toLocaleString("en-KE") : "—"}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── WORKFLOWS ── */}
        {tab==="workflows" && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h2 style={{margin:0,fontSize:16,fontWeight:700}}>⚙️ WhatsApp Automation Workflows</h2>
              <div style={{fontSize:12,color:"#888"}}>{workflows.filter(w=>w.enabled).length} active workflows</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(380px,1fr))",gap:14}}>
              {workflows.map(w=>(
                <div key={w.id} style={card({borderTop:`3px solid ${w.enabled?GREEN:"#e0e0e0"}`,opacity:w.enabled?1:0.75})}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:14}}>{w.label}</div>
                      <div style={{fontSize:12,color:"#888",marginTop:2}}>🔔 Trigger: {w.trigger}</div>
                    </div>
                    <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}>
                      <div onClick={()=>toggleWorkflow(w.id)} style={{width:40,height:22,borderRadius:11,background:w.enabled?GREEN:"#ccc",position:"relative",cursor:"pointer",transition:"background .2s"}}>
                        <div style={{width:18,height:18,borderRadius:9,background:"#fff",position:"absolute",top:2,left:w.enabled?20:2,transition:"left .2s"}} />
                      </div>
                      <span style={{fontSize:11,fontWeight:600,color:w.enabled?GREEN:"#888"}}>{w.enabled?"ON":"OFF"}</span>
                    </label>
                  </div>
                  <div>
                    <div style={{fontSize:11,fontWeight:600,color:"#555",marginBottom:6}}>Actions:</div>
                    {w.actions.map((a,i)=>(
                      <div key={i} style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"#444",marginBottom:4}}>
                        <span style={{color:GREEN,fontSize:14}}>✓</span>{a}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={card({marginTop:20,background:"#f0fdf4"})}>
              <div style={{fontSize:14,fontWeight:700,marginBottom:8}}>📌 Procurement Workflow Integration</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12,fontSize:13}}>
                {[
                  {step:"1",label:"Requisition Submitted",desc:"Auto-notify HOD + PM"},
                  {step:"2",label:"Approval Request",desc:"WhatsApp approve/reject"},
                  {step:"3",label:"PO Raised",desc:"Notify supplier + dept"},
                  {step:"4",label:"GRN Recorded",desc:"Notify accounts"},
                  {step:"5",label:"3-Way Match",desc:"Invoice reconciliation alert"},
                  {step:"6",label:"Payment Approved",desc:"Notify CFO + accountant"},
                ].map(s=>(
                  <div key={s.step} style={{background:"#fff",borderRadius:8,padding:"12px",border:`1px solid ${GREEN}22`}}>
                    <div style={{width:28,height:28,borderRadius:14,background:GREEN,color:"#fff",fontWeight:800,fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:6}}>{s.step}</div>
                    <div style={{fontWeight:600,fontSize:13}}>{s.label}</div>
                    <div style={{fontSize:11,color:"#888"}}>{s.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── HISTORY ── */}
        {tab==="history" && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h2 style={{margin:0,fontSize:16,fontWeight:700}}>📜 Message History</h2>
              <button onClick={loadHistory} style={btn(GREEN,{fontSize:12})}>🔄 Refresh</button>
            </div>
            <div style={card({padding:0,overflow:"hidden"})}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead>
                  <tr style={{background:"#f8f9fa",textAlign:"left"}}>
                    {["To","Message","Status","Sent At","SID"].map(h=>(
                      <th key={h} style={{padding:"10px 14px",fontWeight:600,fontSize:12,color:"#555",borderBottom:"1px solid #eee"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.length===0 ? (
                    <tr><td colSpan={5} style={{textAlign:"center",padding:40,color:"#999"}}>No WhatsApp messages sent yet</td></tr>
                  ) : history.map((m:any)=>(
                    <tr key={m.id} style={{borderBottom:"1px solid #f5f5f5"}}>
                      <td style={{padding:"10px 14px",fontWeight:600}}>{m.to_number}</td>
                      <td style={{padding:"10px 14px",maxWidth:300,color:"#444"}}>{m.message_body?.slice(0,80)}{m.message_body?.length>80?"…":""}</td>
                      <td style={{padding:"10px 14px"}}>
                        <span style={{fontSize:11,padding:"3px 8px",borderRadius:12,fontWeight:600,
                          background:`${STATUS_C[m.status]||"#6b7280"}22`,color:STATUS_C[m.status]||"#6b7280"}}>
                          {m.status||"unknown"}
                        </span>
                      </td>
                      <td style={{padding:"10px 14px",color:"#888",fontSize:12}}>{m.sent_at?new Date(m.sent_at).toLocaleString("en-KE"):"—"}</td>
                      <td style={{padding:"10px 14px",fontFamily:"monospace",fontSize:11,color:"#888"}}>{m.sid?.slice(0,16)||"—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── SETTINGS ── */}
        {tab==="settings" && (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
            <div>
              <div style={card({marginBottom:16})}>
                <h3 style={{margin:"0 0 16px",fontSize:15,fontWeight:700}}>🔧 WhatsApp Configuration</h3>
                {[
                  {l:"From Number",v:WA.NUMBER},
                  {l:"Join Code",v:WA.CODE},
                  {l:"Join Link",v:WA.LINK},
                ].map(f=>(
                  <div key={f.l} style={{marginBottom:14}}>
                    <label style={{fontSize:12,fontWeight:600,color:"#555",display:"block",marginBottom:4}}>{f.l}</label>
                    <div style={{...inp,background:"#f8f9fa",color:"#333",display:"flex",alignItems:"center",cursor:"default"}}>{f.v}</div>
                  </div>
                ))}
                <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:8}}>
                  {[
                    {l:"Sandbox Mode",v:sandboxMode,set:setSandboxMode,desc:"Use Twilio sandbox (join code required)"},
                    {l:"Auto Session Renewal",v:autoRenew,set:setAutoRenew,desc:"Renew expired sessions automatically"},
                  ].map(tog=>(
                    <div key={tog.l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #f0f0f0"}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:600}}>{tog.l}</div>
                        <div style={{fontSize:11,color:"#888"}}>{tog.desc}</div>
                      </div>
                      <div onClick={()=>tog.set(!tog.v)} style={{width:40,height:22,borderRadius:11,background:tog.v?GREEN:"#ccc",position:"relative",cursor:"pointer"}}>
                        <div style={{width:18,height:18,borderRadius:9,background:"#fff",position:"absolute",top:2,left:tog.v?20:2,transition:"left .2s"}} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={card()}>
                <h3 style={{margin:"0 0 14px",fontSize:15,fontWeight:700}}>📷 QR Code — Join Sandbox</h3>
                <div style={{textAlign:"center"}}>
                  <img src={WA.QR_URL} alt="WhatsApp QR" style={{width:180,height:180,borderRadius:8,border:"1px solid #eee"}} />
                  <div style={{fontSize:12,color:"#888",marginTop:8}}>Scan to join the WhatsApp sandbox</div>
                  <a href={WA.LINK} target="_blank" rel="noreferrer" style={{display:"inline-block",marginTop:10,...btn(GREEN) as any,textDecoration:"none",fontSize:13}}>
                    Open in WhatsApp ↗
                  </a>
                </div>
              </div>
            </div>
            <div>
              <div style={card({marginBottom:16})}>
                <h3 style={{margin:"0 0 14px",fontSize:15,fontWeight:700}}>🪝 Webhook Configuration</h3>
                <div style={{background:"#f8f9fa",borderRadius:8,padding:14,marginBottom:12,fontSize:12,fontFamily:"monospace",wordBreak:"break-all"}}>
                  https://yvjfehnzbzjliizjvuhq.supabase.co/functions/v1/whatsapp-webhook
                </div>
                <div style={{fontSize:12,color:"#666",marginBottom:12}}>
                  Configure this URL in your Twilio WhatsApp Sandbox settings to enable reply-based approvals.
                </div>
                <button onClick={async()=>{
                  await navigator.clipboard.writeText("https://yvjfehnzbzjliizjvuhq.supabase.co/functions/v1/whatsapp-webhook");
                  toast({title:"Webhook URL copied"});
                }} style={btn(DARK,{fontSize:12,width:"100%"})}>📋 Copy Webhook URL</button>
              </div>
              <div style={card({marginBottom:16})}>
                <h3 style={{margin:"0 0 14px",fontSize:15,fontWeight:700}}>🧪 Test Connection</h3>
                <div style={{marginBottom:12}}>
                  <input style={inp} placeholder="+254722000000 (test number)" id="wa-test-phone" />
                </div>
                <button onClick={async()=>{
                  const ph=(document.getElementById("wa-test-phone") as HTMLInputElement)?.value;
                  if(!ph) return toast({title:"Enter a phone number",variant:"destructive"});
                  const r=await sendSms({to:ph,message:`🏥 EL5 MediProcure WhatsApp Test\nConnection verified at ${new Date().toLocaleString("en-KE")}`,channel:"whatsapp",module:"wa_test"});
                  toast({title:r.ok?"✅ Test message sent!":"Test failed",description:r.ok?`Sent to ${ph}`:r.error,variant:r.ok?"default":"destructive"});
                }} style={btn(GREEN,{width:"100%",fontSize:13})}>💬 Send Test Message</button>
              </div>
              <div style={card({background:"#e8f5e9"})}>
                <div style={{fontSize:13,fontWeight:700,marginBottom:8}}>📊 Delivery Stats</div>
                {[
                  {l:"Total Sent",v:history.length},
                  {l:"Delivered",v:stats.delivered},
                  {l:"Failed",v:stats.failed},
                  {l:"Active Sessions",v:stats.sessions},
                ].map(s=>(
                  <div key={s.l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid rgba(0,0,0,.05)",fontSize:13}}>
                    <span style={{color:"#555"}}>{s.l}</span>
                    <span style={{fontWeight:700}}>{s.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
