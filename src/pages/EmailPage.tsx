import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { sendNotification } from "@/lib/notify";
import {
  Mail, Send, RefreshCw, X, Search, Star, Archive, Reply,
  Trash2, Edit3, Inbox, Users, Plus, AlertTriangle, CheckCheck,
  Clock, Paperclip, MoreHorizontal, ChevronDown, ChevronRight,
  Eye, EyeOff, Filter, FileText, Globe, Zap, CheckCircle,
  Settings, Activity, Tag, Download, Copy, CornerUpLeft,
  AtSign, Phone, Building2, UserPlus, Bookmark, Layers
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────
interface Msg {
  id: string; dbId: string; source: "inbox"|"notification";
  type: string; subject: string; body: string;
  from_user_id?: string; from_name?: string; from_email?: string;
  to_user_id?: string; to_email?: string; cc_email?: string;
  priority: string; status: string; is_read: boolean;
  is_starred: boolean; is_external: boolean;
  send_status?: string; sent_at?: string; error_message?: string;
  thread_id?: string; module?: string; action_url?: string;
  reply_body?: string; replied_at?: string; created_at: string;
}
interface Contact { id:string; name:string; email:string; company?:string; category?:string; is_supplier?:boolean; }
interface Template { id:string; name:string; subject:string; body:string; category?:string; }

// ── Config ────────────────────────────────────────────────────
const TYPE_CFG: Record<string,{icon:any;color:string;bg:string;label:string}> = {
  email:       {icon:Mail,          color:"#7c3aed",bg:"#f5f3ff",label:"Email"},
  external:    {icon:Globe,         color:"#0369a1",bg:"#e0f2fe",label:"External"},
  procurement: {icon:Layers,        color:"#0078d4",bg:"#eff6ff",label:"Procurement"},
  grn:         {icon:CheckCircle,   color:"#107c10",bg:"#f0fdf4",label:"GRN"},
  voucher:     {icon:FileText,      color:"#C45911",bg:"#fff7ed",label:"Voucher"},
  tender:      {icon:Tag,           color:"#1F6090",bg:"#f0f9ff",label:"Tender"},
  success:     {icon:CheckCircle,   color:"#15803d",bg:"#f0fdf4",label:"Success"},
  warning:     {icon:AlertTriangle, color:"#d97706",bg:"#fffbeb",label:"Warning"},
  error:       {icon:AlertTriangle, color:"#dc2626",bg:"#fef2f2",label:"Alert"},
  info:        {icon:Activity,      color:"#0078d4",bg:"#eff6ff",label:"Info"},
  system:      {icon:Settings,      color:"#6b7280",bg:"#f9fafb",label:"System"},
  default:     {icon:Mail,          color:"#6b7280",bg:"#f9fafb",label:"Message"},
};
const tc = (t:string) => TYPE_CFG[t]||TYPE_CFG.default;

const PRI_CFG: Record<string,{bg:string;color:string;label:string}> = {
  urgent:{bg:"#fee2e2",color:"#dc2626",label:"Urgent"},
  high:  {bg:"#fef3c7",color:"#b45309",label:"High"},
  normal:{bg:"#f3f4f6",color:"#6b7280",label:"Normal"},
  low:   {bg:"#dcfce7",color:"#15803d",label:"Low"},
};

const FOLDERS = [
  {id:"inbox",      label:"Inbox",         icon:Inbox,        color:"#1a3a6b"},
  {id:"unread",     label:"Unread",        icon:Mail,         color:"#dc2626"},
  {id:"external",   label:"External Mail", icon:Globe,        color:"#0369a1"},
  {id:"sent",       label:"Sent",          icon:Send,         color:"#107c10"},
  {id:"starred",    label:"Starred",       icon:Star,         color:"#f59e0b"},
  {id:"procurement",label:"Procurement",   icon:Layers,       color:"#0078d4"},
  {id:"archived",   label:"Archived",      icon:Archive,      color:"#9ca3af"},
];

function timeAgo(d:string){
  const s=(Date.now()-new Date(d).getTime())/1000;
  if(s<60)return"just now";
  if(s<3600)return`${Math.floor(s/60)}m`;
  if(s<86400)return`${Math.floor(s/3600)}h`;
  return new Date(d).toLocaleDateString("en-KE",{day:"2-digit",month:"short"});
}
function fmtDate(d:string){
  return new Date(d).toLocaleString("en-KE",{dateStyle:"medium",timeStyle:"short"});
}

// ── Compose Modal ─────────────────────────────────────────────
function ComposeModal({onClose,onSent,profiles,contacts,templates,user,profile}:{
  onClose:()=>void; onSent:()=>void;
  profiles:any[]; contacts:Contact[]; templates:Template[];
  user:any; profile:any;
}) {
  const [toChips, setToChips]   = useState<{label:string;email:string;isExternal:boolean}[]>([]);
  const [toInput, setToInput]   = useState("");
  const [ccInput, setCcInput]   = useState("");
  const [bccInput,setBccInput]  = useState("");
  const [showCcBcc,setShowCcBcc]= useState(false);
  const [subject,  setSubject]  = useState("");
  const [body,     setBody]     = useState("");
  const [priority, setPriority] = useState("normal");
  const [tplId,    setTplId]    = useState("");
  const [sending,  setSending]  = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [drop,     setDrop]     = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  // Suggestions: internal users + external contacts
  const allSuggestions = [
    ...profiles.map(p=>({label:p.full_name||p.email,email:p.email||"",userId:p.id,isExternal:false})),
    ...contacts.map(c=>({label:c.name+(c.company?` (${c.company})`:""),email:c.email,userId:undefined,isExternal:true})),
  ];
  const suggestions = toInput.length>0 ? allSuggestions.filter(s=>
    !toChips.find(c=>c.email===s.email) && s.label.toLowerCase().includes(toInput.toLowerCase()) ||
    s.email.toLowerCase().includes(toInput.toLowerCase())
  ).slice(0,8) : [];

  const addChip = (s:{label:string;email:string;isExternal:boolean}) => {
    if(!toChips.find(c=>c.email===s.email)) setToChips(p=>[...p,s]);
    setToInput(""); setDrop(false);
  };
  const addManual = () => {
    const v=toInput.trim();
    if(!v) return;
    const emailPart = v.includes("<") ? v.match(/<(.+)>/)?.[1]||v : v;
    if(!/\S+@\S+\.\S+/.test(emailPart)){toast({title:"Invalid email address",variant:"destructive"});return;}
    addChip({label:emailPart,email:emailPart,isExternal:true});
  };

  const applyTemplate = (tId:string) => {
    const t=templates.find(x=>x.id===tId)||null;
    if(!t) return;
    setSubject(t.subject); setBody(t.body); setTplId(tId);
  };

  const hasExternal = toChips.some(c=>c.isExternal) || (ccInput.includes("@") && !profiles.find(p=>p.email===ccInput));

  const send = async () => {
    if(!toChips.length){toast({title:"Add at least one recipient",variant:"destructive"});return;}
    if(!subject.trim()){toast({title:"Subject is required",variant:"destructive"});return;}
    if(!body.trim()){toast({title:"Message body is required",variant:"destructive"});return;}
    setSending(true);
    try {
      const threadId = crypto.randomUUID();
      let externalSent=0, internalSent=0, externalFailed=0;

      for(const chip of toChips){
        const isExt = chip.isExternal;
        const toProfile = !isExt ? profiles.find(p=>p.email===chip.email) : null;

        // Always create inbox_item
        const itemData: any = {
          type: isExt ? "external" : "email",
          subject, body,
          from_user_id: user?.id,
          from_email: profile?.email || user?.email,
          to_email: chip.email,
          priority, status: "sent",
          is_external: isExt,
          send_status: "pending",
          module: "Email",
          thread_id: threadId,
          cc_email: ccInput||null,
          bcc_email: bccInput||null,
        };
        if(toProfile) itemData.to_user_id = toProfile.id;

        const {data:item,error:itemErr} = await (supabase as any).from("inbox_items").insert(itemData).select("id").single();
        if(itemErr) console.error("inbox_items insert:", itemErr.message);

        // Log to email_logs
        await (supabase as any).from("email_logs").insert({
          inbox_item_id: item?.id||null,
          sender_user_id: user?.id,
          from_email: profile?.email||user?.email||"",
          from_name: profile?.full_name||"Staff",
          to_email: chip.email,
          to_name: chip.label,
          cc: ccInput||null, bcc: bccInput||null,
          subject, body,
          priority, module:"Email",
          status: "queued",
          is_bulk: toChips.length>1,
        }).select("id").single();

        // Deliver to internal inbox
        if(toProfile?.id){
          await (supabase as any).from("inbox_items").insert({
            type:"email", subject, body,
            from_user_id: user?.id, from_email: profile?.email||user?.email,
            to_user_id: toProfile.id, to_email: chip.email,
            priority, status: "unread",
            is_external: false, module:"Email",
            thread_id: threadId,
          });
          await sendNotification({
            userId: toProfile.id,
            title: `New email: ${subject.slice(0,60)}`,
            message: `From ${profile?.full_name||"Staff"}: ${body.slice(0,100)}`,
            type:"email", module:"Email", actionUrl:"/email",
            senderId: user?.id,
          });
          internalSent++;
        }

        // Send actual email (external + internal with email enabled)
        if(isExt || testMode){
          const smtpCfg = await (supabase as any).from("smtp_configs").select("*").eq("is_default",true).eq("is_active",true).maybeSingle();
          const smtp = smtpCfg?.data;

          try {
            const fnRes = await supabase.functions.invoke("send-email", {
              body: {
                to: chip.email,
                cc: ccInput||undefined,
                bcc: bccInput||undefined,
                subject,
                body,
                from: smtp?.from_email||undefined,
                from_name: smtp?.from_name||profile?.full_name||"EL5 MediProcure",
                priority,
                smtp: smtp ? {
                  host: smtp.host, port: smtp.port,
                  username: smtp.username, password: smtp.password,
                  from_email: smtp.from_email, from_name: smtp.from_name,
                  encryption: smtp.encryption,
                } : undefined,
              }
            });
            const sentOk = !fnRes.error && fnRes.data?.success;
            const provider = fnRes.data?.provider || "unknown";
            const errMsg = fnRes.data?.results?.[0]?.error || fnRes.error?.message;

            // Update send_status
            if(item?.id) {
              await (supabase as any).from("inbox_items").update({
                send_status: sentOk?"sent":"failed",
                sent_at: sentOk?new Date().toISOString():null,
                error_message: !sentOk?errMsg:null,
              }).eq("id",item.id);
            }
            // Update email_log
            await (supabase as any).from("email_logs").update({
              status: sentOk?"sent":"failed",
              smtp_host: smtp?.host||null,
              smtp_response: JSON.stringify(fnRes.data?.results||[]),
              error_message: !sentOk?errMsg:null,
              sent_at: sentOk?new Date().toISOString():null,
            }).eq("inbox_item_id", item?.id);

            if(sentOk) externalSent++;
            else { externalFailed++; console.warn("Email send failed:", errMsg); }
          } catch(fnErr:any){
            externalFailed++;
            if(item?.id) await (supabase as any).from("inbox_items").update({send_status:"failed",error_message:fnErr.message}).eq("id",item.id);
          }
        }
      }

      // Summary toast
      const msgs=[];
      if(internalSent>0) msgs.push(`${internalSent} internal`);
      if(externalSent>0) msgs.push(`${externalSent} external email${externalSent!==1?"s":""}`);
      if(externalFailed>0) msgs.push(`${externalFailed} failed (check SMTP)`);
      toast({title:"Sent ✓", description: msgs.join(", ")||"Message delivered"});
      onSent(); onClose();
    } catch(e:any){
      toast({title:"Send failed",description:e.message,variant:"destructive"});
    }
    setSending(false);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"#fff",borderRadius:12,width:"min(700px,100%)",maxHeight:"95vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,0.28)"}}>
        {/* Header */}
        <div style={{padding:"12px 16px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",borderRadius:"12px 12px 0 0",display:"flex",alignItems:"center",gap:8}}>
          <Edit3 style={{width:14,height:14,color:"#fff"}}/>
          <span style={{fontSize:14,fontWeight:800,color:"#fff",flex:1}}>New Message</span>
          {hasExternal&&<span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:4,background:"rgba(255,255,255,0.15)",color:"rgba(255,255,255,0.9)",border:"1px solid rgba(255,255,255,0.25)"}}>
            📡 External Email
          </span>}
          <div style={{display:"flex",alignItems:"center",gap:5,marginRight:4}}>
            <span style={{fontSize:10,color:"rgba(255,255,255,0.5)"}}>Test Mode</span>
            <button onClick={()=>setTestMode(v=>!v)} style={{background:"transparent",border:"none",cursor:"pointer",padding:0,lineHeight:0}}>
              <div style={{width:32,height:18,borderRadius:9,background:testMode?"#10b981":"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",padding:1.5,transition:"all 0.2s"}}>
                <div style={{width:15,height:15,borderRadius:"50%",background:"#fff",transition:"transform 0.2s",transform:testMode?"translateX(14px)":"translateX(0)"}}/>
              </div>
            </button>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:6,padding:"4px 6px",cursor:"pointer",color:"#fff",lineHeight:0}}><X style={{width:13,height:13}}/></button>
        </div>

        <div style={{flex:1,overflowY:"auto"}}>
          {/* To field */}
          <div style={{padding:"10px 16px",borderBottom:"1px solid #f3f4f6"}}>
            <div style={{fontSize:10,fontWeight:700,color:"#9ca3af",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.06em"}}>To</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:5,alignItems:"center",minHeight:32}}>
              {toChips.map(c=>(
                <span key={c.email} style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 9px",borderRadius:20,background:c.isExternal?"#e0f2fe":"#eff6ff",border:`1px solid ${c.isExternal?"#bae6fd":"#bfdbfe"}`,fontSize:12,fontWeight:600,color:c.isExternal?"#0369a1":"#1d4ed8"}}>
                  {c.isExternal?<Globe style={{width:10,height:10}}/>:<Users style={{width:10,height:10}}/>}
                  {c.label} <span style={{fontSize:10,opacity:0.6}}>({c.email})</span>
                  <button onClick={()=>setToChips(p=>p.filter(x=>x.email!==c.email))} style={{background:"none",border:"none",cursor:"pointer",padding:0,lineHeight:0,color:"inherit",opacity:0.7}}><X style={{width:10,height:10}}/></button>
                </span>
              ))}
              <div style={{position:"relative",flex:1,minWidth:180}} ref={dropRef}>
                <input value={toInput} onChange={e=>{setToInput(e.target.value);setDrop(true);}}
                  onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();suggestions.length?addChip(suggestions[0]):addManual();}if(e.key===","||e.key===";"){e.preventDefault();addManual();}}}
                  placeholder="Type name, email, or external address…"
                  style={{width:"100%",border:"none",outline:"none",fontSize:13,padding:"3px 0",background:"transparent",color:"#374151"}}/>
                {drop&&suggestions.length>0&&(
                  <div style={{position:"absolute",top:"100%",left:0,zIndex:100,background:"#fff",boxShadow:"0 4px 20px rgba(0,0,0,0.15)",borderRadius:8,border:"1px solid #e5e7eb",minWidth:320,maxHeight:260,overflowY:"auto"}}>
                    {suggestions.map(s=>(
                      <button key={s.email} onMouseDown={()=>addChip(s)} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"9px 14px",border:"none",background:"transparent",cursor:"pointer",textAlign:"left"}}
                        onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f9fafb"}
                        onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
                        <div style={{width:30,height:30,borderRadius:"50%",background:s.isExternal?"#e0f2fe":"linear-gradient(135deg,#1a3a6b,#0078d4)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          {s.isExternal?<Globe style={{width:13,height:13,color:"#0369a1"}}/>:<span style={{fontSize:12,fontWeight:700,color:"#fff"}}>{s.label[0].toUpperCase()}</span>}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:600,color:"#111827",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.label}</div>
                          <div style={{fontSize:11,color:"#9ca3af"}}>{s.email} {s.isExternal&&<span style={{color:"#0369a1",fontWeight:600}}>· External</span>}</div>
                        </div>
                      </button>
                    ))}
                    {toInput.includes("@")&&!suggestions.find(s=>s.email===toInput)&&(
                      <button onMouseDown={addManual} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"9px 14px",border:"none",borderTop:"1px solid #f3f4f6",background:"#f0f9ff",cursor:"pointer",textAlign:"left"}}>
                        <Globe style={{width:14,height:14,color:"#0369a1"}}/> 
                        <span style={{fontSize:12,fontWeight:700,color:"#0369a1"}}>Send to external: {toInput}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
              <button onClick={()=>setShowCcBcc(v=>!v)} style={{fontSize:11,fontWeight:700,color:"#9ca3af",background:"none",border:"none",cursor:"pointer",padding:"2px 6px",borderRadius:4,flexShrink:0}}>
                CC/BCC
              </button>
            </div>
          </div>

          {/* CC / BCC */}
          {showCcBcc&&(
            <div style={{borderBottom:"1px solid #f3f4f6"}}>
              {[{l:"CC",v:ccInput,s:setCcInput},{l:"BCC",v:bccInput,s:setBccInput}].map(({l,v,s})=>(
                <div key={l} style={{padding:"7px 16px",display:"flex",alignItems:"center",gap:10,borderBottom:"1px solid #f9fafb"}}>
                  <span style={{fontSize:10,fontWeight:700,color:"#9ca3af",width:30,textTransform:"uppercase",letterSpacing:"0.06em"}}>{l}</span>
                  <input value={v} onChange={e=>s(e.target.value)} placeholder={`${l} addresses (comma-separated)`}
                    style={{flex:1,border:"none",outline:"none",fontSize:13,color:"#374151",background:"transparent"}}/>
                </div>
              ))}
            </div>
          )}

          {/* Subject */}
          <div style={{padding:"10px 16px",borderBottom:"1px solid #f3f4f6",display:"flex",gap:10,alignItems:"center"}}>
            <input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Subject"
              style={{flex:1,border:"none",outline:"none",fontSize:14,fontWeight:600,color:"#111827",background:"transparent"}}/>
            <select value={priority} onChange={e=>setPriority(e.target.value)}
              style={{fontSize:11,padding:"3px 8px",border:"1px solid #e5e7eb",borderRadius:5,outline:"none",background:"#f9fafb",color:PRI_CFG[priority]?.color||"#374151",fontWeight:700}}>
              {Object.entries(PRI_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>

          {/* Template picker */}
          <div style={{padding:"7px 16px",borderBottom:"1px solid #f3f4f6",display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",background:"#fafafa"}}>
            <span style={{fontSize:10,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em"}}>Template:</span>
            <select value={tplId} onChange={e=>applyTemplate(e.target.value)}
              style={{fontSize:12,padding:"3px 8px",border:"1px solid #e5e7eb",borderRadius:5,outline:"none",background:"#fff",flex:1,maxWidth:280}}>
              <option value="">— Choose a template —</option>
              {templates.map(t=><option key={t.id} value={t.id}>[{t.category||"general"}] {t.name}</option>)}
            </select>
          </div>

          {/* Body */}
          <textarea value={body} onChange={e=>setBody(e.target.value)} rows={12}
            placeholder="Write your message here…&#10;&#10;Use templates above or type freely."
            style={{width:"100%",border:"none",outline:"none",padding:"16px",fontSize:13,lineHeight:1.85,color:"#374151",resize:"none",fontFamily:"'Inter','Segoe UI',sans-serif",boxSizing:"border-box"}}/>
        </div>

        {/* Footer */}
        <div style={{padding:"10px 16px",borderTop:"2px solid #f3f4f6",display:"flex",gap:8,alignItems:"center",background:"#f9fafb",borderRadius:"0 0 12px 12px",flexWrap:"wrap"}}>
          <button onClick={send} disabled={sending}
            style={{display:"flex",alignItems:"center",gap:7,padding:"9px 22px",background:sending?"#9ca3af":"linear-gradient(135deg,#0a2558,#1a3a6b)",color:"#fff",border:"none",borderRadius:8,cursor:sending?"not-allowed":"pointer",fontSize:13,fontWeight:800,boxShadow:"0 2px 8px rgba(26,58,107,0.3)"}}>
            {sending?<RefreshCw style={{width:13,height:13}} style={{animation:"spin 1s linear infinite"}}/>:<Send style={{width:13,height:13}}/>}
            {sending?"Sending…":"Send"}
          </button>
          {hasExternal&&(
            <div style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",background:"#e0f2fe",border:"1px solid #bae6fd",borderRadius:6,fontSize:11,fontWeight:700,color:"#0369a1"}}>
              <Globe style={{width:11,height:11}}/> Will send real email to external recipients
            </div>
          )}
          {testMode&&(
            <div style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",background:"#fef3c7",border:"1px solid #fde68a",borderRadius:6,fontSize:11,fontWeight:700,color:"#92400e"}}>
              <Zap style={{width:11,height:11}}/> Test mode: forces SMTP send
            </div>
          )}
          <button onClick={onClose} style={{marginLeft:"auto",padding:"8px 16px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:8,cursor:"pointer",fontSize:13,color:"#374151",fontWeight:600}}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Reply Modal ────────────────────────────────────────────────
function ReplyModal({msg,onClose,onSent,user,profile}:{msg:Msg;onClose:()=>void;onSent:()=>void;user:any;profile:any}) {
  const [body,setSending_] = useState("");
  const [sending,setSending]= useState(false);

  const send = async() => {
    if(!body.trim()){toast({title:"Write a reply first",variant:"destructive"});return;}
    setSending(true);
    const replyTo = msg.from_user_id&&msg.from_user_id!==user?.id ? msg.from_user_id : msg.to_user_id;
    const replyEmail = msg.from_email||msg.to_email;

    // Create inbox reply
    await (supabase as any).from("inbox_items").insert({
      type:"email", subject:`Re: ${msg.subject}`,
      body, from_user_id:user?.id, from_email:profile?.email||user?.email,
      to_user_id:replyTo, to_email:replyEmail,
      priority:msg.priority||"normal", status:"unread",
      thread_id:msg.thread_id||msg.dbId, module:"Email",
    });

    // Notify
    if(replyTo) await sendNotification({
      userId:replyTo, title:`Re: ${msg.subject.slice(0,60)}`,
      message:`${profile?.full_name||"Staff"} replied: ${body.slice(0,100)}`,
      type:"email",module:"Email",actionUrl:"/email",senderId:user?.id,
    });

    // Mark original as replied
    await (supabase as any).from("inbox_items").update({
      reply_body:body, replied_at:new Date().toISOString(), status:"replied"
    }).eq("id",msg.dbId);

    // If external, also send real email via edge fn
    if(msg.is_external&&replyEmail) {
      const smtpCfg = await (supabase as any).from("smtp_configs").select("*").eq("is_default",true).eq("is_active",true).maybeSingle();
      await supabase.functions.invoke("send-email",{body:{
        to:replyEmail, subject:`Re: ${msg.subject}`, body,
        smtp:smtpCfg?.data||undefined,
      }});
    }

    toast({title:"Reply sent ✓"}); onSent(); onClose(); setSending(false);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"#fff",borderRadius:12,width:"min(560px,100%)",boxShadow:"0 20px 60px rgba(0,0,0,0.25)"}}>
        <div style={{padding:"11px 16px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",borderRadius:"12px 12px 0 0",display:"flex",alignItems:"center",gap:8}}>
          <CornerUpLeft style={{width:13,height:13,color:"#fff"}}/>
          <span style={{fontSize:13,fontWeight:700,color:"#fff",flex:1}}>Re: {msg.subject.slice(0,50)}</span>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:5,padding:"3px 5px",cursor:"pointer",color:"#fff",lineHeight:0}}><X style={{width:12,height:12}}/></button>
        </div>
        <div style={{padding:"10px 14px",background:"#f9fafb",fontSize:11,color:"#9ca3af",borderBottom:"1px solid #f3f4f6"}}>
          Replying to <strong style={{color:"#374151"}}>{msg.from_name||msg.from_email||"sender"}</strong>
          {msg.is_external&&<span style={{marginLeft:8,color:"#0369a1",fontWeight:700}}>· Will send real email</span>}
        </div>
        <textarea value={body} onChange={e=>setSending_(e.target.value)} rows={7} placeholder="Type your reply…"
          style={{width:"100%",border:"none",outline:"none",padding:"14px 16px",fontSize:13,lineHeight:1.8,fontFamily:"'Inter','Segoe UI',sans-serif",resize:"none",boxSizing:"border-box",color:"#374151"}}/>
        <div style={{padding:"10px 14px",borderTop:"1px solid #f3f4f6",display:"flex",gap:8,background:"#f9fafb",borderRadius:"0 0 12px 12px"}}>
          <button onClick={send} disabled={sending} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 18px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:13,fontWeight:700}}>
            {sending?<RefreshCw style={{width:12,height:12}} style={{animation:"spin 1s linear infinite"}}/>:<Send style={{width:12,height:12}}/>} {sending?"Sending…":"Send Reply"}
          </button>
          <button onClick={onClose} style={{padding:"8px 14px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:7,cursor:"pointer",fontSize:13}}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── SMTP Test Panel ───────────────────────────────────────────
function SmtpTestPanel({onClose}:{onClose:()=>void}) {
  const {user,profile} = useAuth();
  const [cfg,setCfg] = useState({host:"smtp.gmail.com",port:"587",username:"",password:"",from_email:"",from_name:"EL5 MediProcure",encryption:"tls"});
  const [testTo,setTestTo] = useState(profile?.email||"");
  const [testing,setTesting] = useState(false);
  const [results,setResults] = useState<any[]>([]);
  const [saving,setSaving] = useState(false);
  const [showPw,setShowPw] = useState(false);

  useEffect(()=>{
    (supabase as any).from("smtp_configs").select("*").eq("is_default",true).maybeSingle()
      .then(({data}:any)=>{ if(data) setCfg({host:data.host||"",port:String(data.port||587),username:data.username||"",password:data.password||"",from_email:data.from_email||"",from_name:data.from_name||"EL5 MediProcure",encryption:data.encryption||"tls"}); });
  },[]);

  const save = async()=>{
    setSaving(true);
    const{data:ex}=await(supabase as any).from("smtp_configs").select("id").eq("is_default",true).maybeSingle();
    const row={name:"Primary SMTP",host:cfg.host,port:Number(cfg.port),username:cfg.username,password:cfg.password,from_email:cfg.from_email,from_name:cfg.from_name,encryption:cfg.encryption,is_default:true,is_active:true};
    if(ex?.id) await(supabase as any).from("smtp_configs").update(row).eq("id",ex.id);
    else await(supabase as any).from("smtp_configs").insert(row);
    // Also update system_settings for compatibility
    for(const[k,v] of [["smtp_host",cfg.host],["smtp_port",cfg.port],["smtp_user",cfg.username],["smtp_password",cfg.password],["smtp_from",cfg.from_email],["smtp_from_name",cfg.from_name]]){
      const{data:s}=await(supabase as any).from("system_settings").select("id").eq("key",k).maybeSingle();
      if(s?.id) await(supabase as any).from("system_settings").update({value:v}).eq("key",k);
      else await(supabase as any).from("system_settings").insert({key:k,value:v});
    }
    toast({title:"SMTP config saved ✓"}); setSaving(false);
  };

  const test = async()=>{
    if(!testTo){toast({title:"Enter a test recipient email",variant:"destructive"});return;}
    setTesting(true);
    const start=Date.now();
    const log:any={at:new Date().toISOString(),to:testTo,cfg:{host:cfg.host,port:cfg.port,user:cfg.username}};
    try{
      const r = await supabase.functions.invoke("send-email",{
        body:{to:testTo,subject:"EL5 MediProcure — SMTP Test",
          body:`SMTP test from EL5 MediProcure system.\n\nHost: ${cfg.host}:${cfg.port}\nUser: ${cfg.username}\nFrom: ${cfg.from_name} <${cfg.from_email}>\n\nIf you received this, email sending is working correctly!\n\nSent by: ${profile?.full_name||"Admin"}\nTime: ${new Date().toISOString()}`,
          smtp:{host:cfg.host,port:Number(cfg.port),username:cfg.username,password:cfg.password,from_email:cfg.from_email||cfg.username,from_name:cfg.from_name,encryption:cfg.encryption},
        }
      });
      log.ms=Date.now()-start; log.success=!r.error&&r.data?.success;
      log.provider=r.data?.provider; log.error=r.data?.results?.[0]?.error||r.error?.message;
      log.raw=r.data;
      if(log.success) toast({title:"Test email sent ✓",description:`Delivered via ${log.provider} in ${log.ms}ms`});
      else toast({title:"Send failed",description:log.error||"Unknown error",variant:"destructive"});
    }catch(e:any){ log.success=false; log.error=e.message; }
    setResults(p=>[log,...p]);
    // Update smtp_configs test status
    await(supabase as any).from("smtp_configs").update({last_tested:new Date().toISOString(),test_status:log.success?"pass":"fail"}).eq("is_default",true);
    setTesting(false);
  };

  const INP=(k:keyof typeof cfg,ph?:string,type="text")=>(
    <input type={k==="password"&&!showPw?"password":type} value={cfg[k]} onChange={e=>setCfg(p=>({...p,[k]:e.target.value}))} placeholder={ph||""}
      style={{width:"100%",padding:"8px 11px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:6,outline:"none"}}/>
  );

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:1001,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"#fff",borderRadius:12,width:"min(620px,100%)",maxHeight:"95vh",overflow:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.28)"}}>
        <div style={{padding:"12px 16px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",borderRadius:"12px 12px 0 0",display:"flex",alignItems:"center",gap:8}}>
          <Settings style={{width:14,height:14,color:"#fff"}}/>
          <span style={{fontSize:14,fontWeight:800,color:"#fff",flex:1}}>SMTP Configuration & Email Test</span>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:6,padding:"4px 6px",cursor:"pointer",color:"#fff",lineHeight:0}}><X style={{width:13,height:13}}/></button>
        </div>
        <div style={{padding:16,display:"flex",flexDirection:"column",gap:14}}>
          {/* SMTP fields */}
          <div style={{background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:9,padding:"14px 16px"}}>
            <div style={{fontSize:12,fontWeight:800,color:"#374151",marginBottom:12,display:"flex",alignItems:"center",gap:6}}><Server_/> SMTP Server Settings</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div><label style={lbl}>SMTP Host</label>{INP("host","smtp.gmail.com")}</div>
              <div><label style={lbl}>Port</label>{INP("port","587")}</div>
              <div style={{position:"relative"}}><label style={lbl}>Username / Email</label>{INP("username","user@gmail.com")}</div>
              <div style={{position:"relative"}}><label style={lbl}>Password / App Password
                <button type="button" onClick={()=>setShowPw(v=>!v)} style={{marginLeft:6,background:"none",border:"none",cursor:"pointer",color:"#9ca3af",lineHeight:0,verticalAlign:"middle"}}>
                  {showPw?<EyeOff style={{width:11,height:11}}/>:<Eye style={{width:11,height:11}}/>}
                </button>
              </label>{INP("password","••••••••")}</div>
              <div><label style={lbl}>From Email</label>{INP("from_email","noreply@embu-l5.go.ke")}</div>
              <div><label style={lbl}>From Name</label>{INP("from_name","EL5 MediProcure")}</div>
              <div><label style={lbl}>Encryption</label>
                <select value={cfg.encryption} onChange={e=>setCfg(p=>({...p,encryption:e.target.value}))}
                  style={{width:"100%",padding:"8px 11px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:6,outline:"none"}}>
                  <option value="tls">TLS (STARTTLS)</option>
                  <option value="ssl">SSL</option>
                  <option value="none">None</option>
                </select>
              </div>
            </div>
            <div style={{marginTop:12,padding:"9px 12px",background:"#fffbeb",border:"1px solid #fde68a",borderRadius:7,fontSize:11,color:"#92400e",lineHeight:1.6}}>
              <strong>Gmail / Google Workspace:</strong> Use app-specific password (not your main password). Enable 2FA then generate App Password in Google Account settings. Set host: smtp.gmail.com, port: 587, TLS.<br/>
              <strong>Alternative:</strong> Set RESEND_API_KEY or SENDGRID_API_KEY in Supabase Edge Function environment variables for production email.
            </div>
          </div>
          {/* Test */}
          <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:9,padding:"14px 16px"}}>
            <div style={{fontSize:12,fontWeight:800,color:"#15803d",marginBottom:10,display:"flex",alignItems:"center",gap:6}}><Zap style={{width:13,height:13}}/> Send Test Email</div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <input value={testTo} onChange={e=>setTestTo(e.target.value)} placeholder="recipient@email.com"
                style={{flex:1,padding:"8px 11px",fontSize:12,border:"1px solid #bbf7d0",borderRadius:6,outline:"none",background:"#fff"}}/>
              <button onClick={test} disabled={testing} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 16px",background:testing?"#9ca3af":"#15803d",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:700,flexShrink:0}}>
                {testing?<RefreshCw style={{width:12,height:12}} style={{animation:"spin 1s linear infinite"}}/>:<Send style={{width:12,height:12}}/>} {testing?"Testing…":"Send Test"}
              </button>
            </div>
          </div>
          {/* Results */}
          {results.length>0&&(
            <div style={{background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:9,overflow:"hidden"}}>
              <div style={{padding:"8px 14px",borderBottom:"1px solid #e5e7eb",fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.06em"}}>Test Results</div>
              {results.slice(0,5).map((r,i)=>(
                <div key={i} style={{padding:"10px 14px",borderBottom:"1px solid #f3f4f6",display:"flex",gap:10,alignItems:"flex-start"}}>
                  <div style={{width:22,height:22,borderRadius:"50%",background:r.success?"#dcfce7":"#fee2e2",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    {r.success?<CheckCircle style={{width:12,height:12,color:"#15803d"}}/>:<X style={{width:12,height:12,color:"#dc2626"}}/>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:700,color:r.success?"#15803d":"#dc2626"}}>{r.success?"Test passed":"Test failed"} {r.ms&&`(${r.ms}ms)`} {r.provider&&`· ${r.provider}`}</div>
                    <div style={{fontSize:11,color:"#6b7280"}}>To: {r.to} · {new Date(r.at).toLocaleTimeString("en-KE")}</div>
                    {r.error&&<div style={{fontSize:11,color:"#dc2626",marginTop:2,wordBreak:"break-word"}}>{r.error}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{display:"flex",gap:8}}>
            <button onClick={save} disabled={saving} style={{display:"flex",alignItems:"center",gap:6,padding:"9px 20px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:13,fontWeight:700}}>
              {saving?<RefreshCw style={{width:12,height:12}} style={{animation:"spin 1s linear infinite"}}/>:<CheckCircle style={{width:12,height:12}}/>} Save SMTP Config
            </button>
            <button onClick={onClose} style={{padding:"9px 16px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:7,cursor:"pointer",fontSize:13}}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}
// Inline helper for SMTP icon
function Server_(){return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>;}
const lbl:React.CSSProperties={fontSize:10,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.05em"};

// ── Contacts Drawer ───────────────────────────────────────────
function ContactsDrawer({onClose,onSelect}:{onClose:()=>void;onSelect:(c:Contact)=>void}) {
  const {user,profile} = useAuth();
  const [contacts,setContacts] = useState<Contact[]>([]);
  const [search,setSearch] = useState("");
  const [loading,setLoading] = useState(true);
  const [adding,setAdding]  = useState(false);
  const [form,setForm] = useState({name:"",email:"",company:"",phone:"",category:"general"});
  const [saving,setSaving]  = useState(false);

  useEffect(()=>{
    (supabase as any).from("email_contacts").select("*").order("name").limit(200)
      .then(({data}:any)=>{ setContacts(data||[]); setLoading(false); });
  },[]);

  const save = async()=>{
    if(!form.name||!form.email){toast({title:"Name and email required",variant:"destructive"});return;}
    setSaving(true);
    const{error}=await(supabase as any).from("email_contacts").insert({...form,created_by:user?.id});
    if(error){toast({title:"Save failed",description:error.message,variant:"destructive"});}
    else{
      const{data}=await(supabase as any).from("email_contacts").select("*").order("name").limit(200);
      setContacts(data||[]); setAdding(false);
      setForm({name:"",email:"",company:"",phone:"",category:"general"});
      toast({title:"Contact saved ✓"});
    }
    setSaving(false);
  };

  const del = async(id:string)=>{
    if(!confirm("Delete this contact?"))return;
    await(supabase as any).from("email_contacts").delete().eq("id",id);
    setContacts(p=>p.filter(c=>c.id!==id));
  };

  const filtered=contacts.filter(c=>{
    const t=search.toLowerCase();
    return !search||c.name.toLowerCase().includes(t)||c.email.toLowerCase().includes(t)||(c.company||"").toLowerCase().includes(t);
  });

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:999,display:"flex",justifyContent:"flex-end"}}>
      <div style={{width:"min(400px,100%)",background:"#fff",height:"100%",display:"flex",flexDirection:"column",boxShadow:"-4px 0 24px rgba(0,0,0,0.15)"}}>
        <div style={{padding:"12px 14px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",display:"flex",alignItems:"center",gap:8}}>
          <Users style={{width:14,height:14,color:"#fff"}}/>
          <span style={{fontSize:13,fontWeight:800,color:"#fff",flex:1}}>Email Contacts</span>
          <button onClick={()=>setAdding(v=>!v)} style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:5,cursor:"pointer",fontSize:11,color:"#fff",fontWeight:700}}>
            <Plus style={{width:10,height:10}}/> Add
          </button>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:5,padding:"4px 6px",cursor:"pointer",color:"#fff",lineHeight:0}}><X style={{width:12,height:12}}/></button>
        </div>
        <div style={{padding:"8px 12px",borderBottom:"1px solid #f3f4f6"}}>
          <div style={{position:"relative"}}>
            <Search style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",width:11,height:11,color:"#9ca3af"}}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search contacts…"
              style={{width:"100%",paddingLeft:26,padding:"7px 10px 7px 26px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:6,outline:"none"}}/>
          </div>
        </div>
        {adding&&(
          <div style={{padding:"12px",background:"#f0fdf4",borderBottom:"2px solid #bbf7d0"}}>
            <div style={{fontSize:11,fontWeight:700,color:"#15803d",marginBottom:8}}>NEW CONTACT</div>
            <div style={{display:"flex",flexDirection:"column",gap:7}}>
              {[{l:"Name *",k:"name"},{l:"Email *",k:"email",t:"email"},{l:"Company",k:"company"},{l:"Phone",k:"phone"}].map(f=>(
                <input key={f.k} type={f.t||"text"} value={(form as any)[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))}
                  placeholder={f.l} style={{padding:"7px 10px",fontSize:12,border:"1px solid #bbf7d0",borderRadius:5,outline:"none"}}/>
              ))}
              <select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}
                style={{padding:"7px 10px",fontSize:12,border:"1px solid #bbf7d0",borderRadius:5,outline:"none"}}>
                <option value="general">General</option>
                <option value="supplier">Supplier</option>
                <option value="government">Government</option>
                <option value="partner">Partner</option>
              </select>
              <div style={{display:"flex",gap:7}}>
                <button onClick={save} disabled={saving} style={{flex:1,padding:"7px",background:"#15803d",color:"#fff",border:"none",borderRadius:5,cursor:"pointer",fontSize:12,fontWeight:700}}>
                  {saving?"Saving…":"Save Contact"}
                </button>
                <button onClick={()=>setAdding(false)} style={{padding:"7px 12px",background:"#f3f4f6",border:"none",borderRadius:5,cursor:"pointer",fontSize:12}}>Cancel</button>
              </div>
            </div>
          </div>
        )}
        <div style={{flex:1,overflowY:"auto"}}>
          {loading?<div style={{padding:20,textAlign:"center",color:"#9ca3af",fontSize:12}}>Loading…</div>:filtered.map(c=>(
            <div key={c.id} style={{padding:"10px 14px",borderBottom:"1px solid #f9fafb",display:"flex",gap:10,alignItems:"center"}}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f9fafb"}
              onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
              <div style={{width:34,height:34,borderRadius:"50%",background:"linear-gradient(135deg,#0369a1,#0284c7)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <span style={{fontSize:13,fontWeight:700,color:"#fff"}}>{c.name[0].toUpperCase()}</span>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:700,color:"#111827",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</div>
                <div style={{fontSize:11,color:"#9ca3af",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.email} {c.company&&`· ${c.company}`}</div>
                {c.category&&<span style={{fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:3,background:"#eff6ff",color:"#1d4ed8"}}>{c.category}</span>}
              </div>
              <div style={{display:"flex",gap:4,flexShrink:0}}>
                <button onClick={()=>onSelect(c)} title="Compose" style={{padding:"4px 8px",background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:5,cursor:"pointer",lineHeight:0}}>
                  <Edit3 style={{width:11,height:11,color:"#1d4ed8"}}/>
                </button>
                <button onClick={()=>del(c.id)} title="Delete" style={{padding:"4px 7px",background:"#fef2f2",border:"1px solid #fecaca",borderRadius:5,cursor:"pointer",lineHeight:0}}>
                  <Trash2 style={{width:11,height:11,color:"#dc2626"}}/>
                </button>
              </div>
            </div>
          ))}
          {filtered.length===0&&!loading&&(
            <div style={{padding:30,textAlign:"center",color:"#9ca3af"}}>
              <Users style={{width:32,height:32,color:"#e5e7eb",margin:"0 auto 8px"}}/>
              <div style={{fontSize:13,fontWeight:600}}>No contacts</div>
              <div style={{fontSize:11,marginTop:3}}>Add external contacts above</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Email Logs Viewer ─────────────────────────────────────────
function EmailLogsPanel({onClose}:{onClose:()=>void}) {
  const [logs,setLogs] = useState<any[]>([]);
  const [loading,setLoading] = useState(true);
  const [filter,setFilter] = useState("all");

  useEffect(()=>{
    (supabase as any).from("email_logs").select("*").order("created_at",{ascending:false}).limit(100)
      .then(({data}:any)=>{ setLogs(data||[]); setLoading(false); });
  },[]);

  const filtered = logs.filter(l=>filter==="all"||l.status===filter);

  const STATUS_CFG:Record<string,{bg:string;color:string}> = {
    sent:    {bg:"#dcfce7",color:"#15803d"},
    failed:  {bg:"#fee2e2",color:"#dc2626"},
    queued:  {bg:"#fef3c7",color:"#92400e"},
    pending: {bg:"#f3f4f6",color:"#6b7280"},
  };

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:998,display:"flex",justifyContent:"flex-end"}}>
      <div style={{width:"min(600px,100%)",background:"#fff",height:"100%",display:"flex",flexDirection:"column",boxShadow:"-4px 0 24px rgba(0,0,0,0.15)"}}>
        <div style={{padding:"12px 14px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",display:"flex",alignItems:"center",gap:8}}>
          <Activity style={{width:14,height:14,color:"#fff"}}/>
          <span style={{fontSize:13,fontWeight:800,color:"#fff",flex:1}}>Email Delivery Logs</span>
          <span style={{fontSize:10,color:"rgba(255,255,255,0.5)"}}>{logs.length} entries</span>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:5,padding:"4px 6px",cursor:"pointer",color:"#fff",lineHeight:0,marginLeft:8}}><X style={{width:12,height:12}}/></button>
        </div>
        <div style={{padding:"8px 12px",borderBottom:"1px solid #f3f4f6",display:"flex",gap:6}}>
          {["all","sent","failed","queued","pending"].map(f=>(
            <button key={f} onClick={()=>setFilter(f)} style={{padding:"4px 10px",border:`1px solid ${filter===f?"#1a3a6b":"#e5e7eb"}`,borderRadius:5,background:filter===f?"#1a3a6b":"#f9fafb",color:filter===f?"#fff":"#6b7280",fontSize:11,fontWeight:700,cursor:"pointer",textTransform:"capitalize"}}>
              {f}
            </button>
          ))}
          <button onClick={()=>setLoading(true)||(supabase as any).from("email_logs").select("*").order("created_at",{ascending:false}).limit(100).then(({data}:any)=>{setLogs(data||[]);setLoading(false);})}
            style={{marginLeft:"auto",padding:"4px 8px",background:"transparent",border:"1px solid #e5e7eb",borderRadius:5,cursor:"pointer",lineHeight:0,color:"#9ca3af"}}>
            <RefreshCw style={{width:11,height:11}} className={loading?"animate-spin":""}/>
          </button>
        </div>
        <div style={{flex:1,overflowY:"auto"}}>
          {loading?<div style={{padding:20,textAlign:"center",color:"#9ca3af",fontSize:12}}>Loading logs…</div>:filtered.length===0?
            <div style={{padding:30,textAlign:"center",color:"#9ca3af",fontSize:12}}>No {filter==="all"?"":filter} emails found</div>:
          filtered.map(l=>{
            const sc=STATUS_CFG[l.status]||STATUS_CFG.pending;
            return(
              <div key={l.id} style={{padding:"11px 14px",borderBottom:"1px solid #f9fafb"}}>
                <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:sc.color,flexShrink:0,marginTop:5}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",justifyContent:"space-between",gap:6,marginBottom:2}}>
                      <span style={{fontSize:13,fontWeight:700,color:"#111827",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{l.subject}</span>
                      <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:4,...sc,flexShrink:0}}>{l.status}</span>
                    </div>
                    <div style={{fontSize:11,color:"#9ca3af"}}>To: <strong style={{color:"#374151"}}>{l.to_email}</strong> · From: {l.from_name||l.from_email}</div>
                    {l.error_message&&<div style={{fontSize:11,color:"#dc2626",marginTop:2}}>{l.error_message}</div>}
                    <div style={{fontSize:10,color:"#d1d5db",marginTop:3}}>
                      {new Date(l.created_at).toLocaleString("en-KE",{dateStyle:"short",timeStyle:"short"})}
                      {l.sent_at&&` · Delivered ${new Date(l.sent_at).toLocaleTimeString("en-KE")}`}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {/* Summary bar */}
        <div style={{padding:"8px 14px",borderTop:"1px solid #f3f4f6",background:"#f9fafb",display:"flex",gap:14,fontSize:11}}>
          {["sent","failed","queued"].map(s=>{
            const cnt=logs.filter(l=>l.status===s).length;
            const c=STATUS_CFG[s];
            return<span key={s} style={{fontWeight:700,color:c.color}}>{cnt} {s}</span>;
          })}
        </div>
      </div>
    </div>
  );
}

// ── MAIN PAGE ──────────────────────────────────────────────────
export default function EmailPage() {
  const {user,profile,roles} = useAuth();
  const isAdmin = roles.includes("admin")||roles.includes("procurement_manager");

  const [msgs,       setMsgs]       = useState<Msg[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [folder,     setFolder]     = useState("inbox");
  const [selected,   setSelected]   = useState<Msg|null>(null);
  const [search,     setSearch]     = useState("");
  const [composing,  setComposing]  = useState(false);
  const [replying,   setReplying]   = useState(false);
  const [smtpOpen,   setSmtpOpen]   = useState(false);
  const [contactsOpen,setContactsOpen]=useState(false);
  const [logsOpen,   setLogsOpen]   = useState(false);
  const [profiles,   setProfiles]   = useState<any[]>([]);
  const [contacts,   setContacts]   = useState<Contact[]>([]);
  const [templates,  setTemplates]  = useState<Template[]>([]);
  const [preselect,  setPreselect]  = useState<string|null>(null);

  // Load contacts and profiles once
  useEffect(()=>{
    Promise.all([
      (supabase as any).from("profiles").select("id,full_name,email,department").order("full_name").limit(300),
      (supabase as any).from("email_contacts").select("*").order("name").limit(200),
      (supabase as any).from("email_templates").select("*").order("name").limit(50),
    ]).then(([p,c,t])=>{
      setProfiles(p.data||[]);
      setContacts(c.data||[]);
      setTemplates(t.data||[]);
    });
  },[]);

  const toMsg=(r:any,src:"inbox"|"notification"):Msg=>({
    id:`${src}-${r.id}`, dbId:r.id, source:src,
    type:r.type||"email", subject:r.title||r.subject||"(no subject)",
    body:r.message||r.body||"",
    from_user_id:r.from_user_id||r.sender_id,
    from_name:r.from_profile?.full_name||r.from_name||"System",
    from_email:r.from_email||r.from_profile?.email,
    to_user_id:r.to_user_id||r.user_id,
    to_email:r.to_email,
    cc_email:r.cc_email, priority:r.priority||"normal",
    status:r.status||"unread", is_read:src==="notification"?!!r.is_read:r.status!=="unread",
    is_starred:!!r.is_starred, is_external:!!r.is_external,
    send_status:r.send_status, sent_at:r.sent_at, error_message:r.error_message,
    thread_id:r.thread_id, module:r.module||r.category,
    action_url:r.action_url||r.link,
    reply_body:r.reply_body, replied_at:r.replied_at,
    created_at:r.created_at,
  });

  const load=useCallback(async()=>{
    if(!user)return;
    setLoading(true);
    const[inbox,notif]=await Promise.all([
      (supabase as any).from("inbox_items")
        .select("*,from_profile:profiles!from_user_id(full_name,email)")
        .or(`to_user_id.eq.${user.id},from_user_id.eq.${user.id}`)
        .order("created_at",{ascending:false}).limit(300),
      (supabase as any).from("notifications").select("*")
        .order("created_at",{ascending:false}).limit(100),
    ]);
    const inboxMsgs=(inbox.data||[]).map((r:any)=>toMsg(r,"inbox"));
    const notifMsgs=(notif.data||[])
      .filter((r:any)=>!r.user_id||r.user_id===user.id)
      .map((r:any)=>toMsg(r,"notification"));
    const all=[...inboxMsgs,...notifMsgs].sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime());
    setMsgs(all); setLoading(false);
  },[user]);

  useEffect(()=>{ load(); },[load]);
  useEffect(()=>{
    if(!user)return;
    const ch=(supabase as any).channel(`email-page-${user.id}`)
      .on("postgres_changes",{event:"*",schema:"public",table:"inbox_items"},load)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"notifications"},load)
      .subscribe();
    return()=>(supabase as any).removeChannel(ch);
  },[user,load]);

  const markRead=async(msg:Msg)=>{
    if(msg.is_read)return;
    if(msg.source==="inbox") await(supabase as any).from("inbox_items").update({status:"read"}).eq("id",msg.dbId);
    else await(supabase as any).from("notifications").update({is_read:true}).eq("id",msg.dbId);
    setMsgs(p=>p.map(m=>m.id===msg.id?{...m,is_read:true,status:"read"}:m));
  };
  const markAllRead=async()=>{
    await(supabase as any).from("inbox_items").update({status:"read"}).eq("to_user_id",user?.id).eq("status","unread");
    await(supabase as any).from("notifications").update({is_read:true}).eq("is_read",false);
    setMsgs(p=>p.map(m=>({...m,is_read:true,status:m.status==="unread"?"read":m.status})));
    toast({title:"All marked as read ✓"});
  };
  const toggleStar=async(msg:Msg)=>{
    if(msg.source!=="inbox")return;
    await(supabase as any).from("inbox_items").update({is_starred:!msg.is_starred}).eq("id",msg.dbId);
    setMsgs(p=>p.map(m=>m.id===msg.id?{...m,is_starred:!m.is_starred}:m));
    if(selected?.id===msg.id)setSelected(m=>m?{...m,is_starred:!m.is_starred}:m);
  };
  const archiveMsg=async(msg:Msg)=>{
    if(msg.source!=="inbox")return;
    await(supabase as any).from("inbox_items").update({status:"archived"}).eq("id",msg.dbId);
    setMsgs(p=>p.map(m=>m.id===msg.id?{...m,status:"archived"}:m));
    if(selected?.id===msg.id)setSelected(null);
    toast({title:"Archived"});
  };
  const deleteMsg=async(msg:Msg)=>{
    if(!confirm("Delete permanently?"))return;
    if(msg.source==="inbox")await(supabase as any).from("inbox_items").delete().eq("id",msg.dbId);
    else await(supabase as any).from("notifications").delete().eq("id",msg.dbId);
    setMsgs(p=>p.filter(m=>m.id!==msg.id));
    if(selected?.id===msg.id)setSelected(null);
    toast({title:"Deleted"});
  };
  const open=(msg:Msg)=>{ setSelected(msg); setReplying(false); markRead(msg); };

  const filtered=msgs.filter(m=>{
    const txt=search.toLowerCase();
    const textOk=!search||[m.subject,m.body,m.from_name,m.from_email,m.to_email,m.module].some(v=>String(v||"").toLowerCase().includes(txt));
    if(!textOk)return false;
    if(folder==="inbox")   return m.to_user_id===user?.id&&!["archived","sent"].includes(m.status);
    if(folder==="unread")  return !m.is_read&&m.to_user_id===user?.id;
    if(folder==="external")return m.is_external;
    if(folder==="sent")    return m.from_user_id===user?.id&&m.status==="sent";
    if(folder==="starred") return !!m.is_starred;
    if(folder==="procurement")return["procurement","grn","voucher","tender"].includes(m.type)&&m.to_user_id===user?.id;
    if(folder==="archived")return m.status==="archived";
    return m.to_user_id===user?.id;
  });

  const unread=msgs.filter(m=>!m.is_read&&m.to_user_id===user?.id).length;
  const extFailed=msgs.filter(m=>m.is_external&&m.send_status==="failed").length;

  return (
    <div style={{display:"flex",height:"calc(100vh - 52px)",fontFamily:"'Inter','Segoe UI',sans-serif",background:"#f0f2f5",overflow:"hidden"}}>

      {/* ── SIDEBAR ── */}
      <div style={{width:224,background:"#fff",borderRight:"1px solid #e5e7eb",display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{padding:"10px 12px 8px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)"}}>
          <div style={{fontSize:13,fontWeight:800,color:"#fff",display:"flex",alignItems:"center",gap:6}}><Mail style={{width:13,height:13}}/> Mail & Inbox</div>
          <div style={{fontSize:9,color:"rgba(255,255,255,0.4)",marginTop:1}}>Messages · Emails · Notifications</div>
        </div>

        {/* Compose button */}
        <div style={{padding:"8px 10px",borderBottom:"1px solid #f3f4f6"}}>
          <button onClick={()=>setComposing(true)} style={{width:"100%",display:"flex",alignItems:"center",gap:7,padding:"9px 14px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:800,justifyContent:"center",boxShadow:"0 2px 8px rgba(26,58,107,0.25)"}}>
            <Edit3 style={{width:12,height:12}}/> Compose
          </button>
        </div>

        {/* Folders */}
        <div style={{flex:1,overflowY:"auto",padding:"3px 0"}}>
          {FOLDERS.map(f=>{
            const cnt=f.id==="unread"?unread:f.id==="external"?msgs.filter(m=>m.is_external).length:0;
            return(
              <button key={f.id} onClick={()=>{setFolder(f.id);setSelected(null);}}
                style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 12px",border:"none",background:folder===f.id?`${f.color}10`:"transparent",cursor:"pointer",textAlign:"left",borderLeft:folder===f.id?`3px solid ${f.color}`:"3px solid transparent",transition:"all 0.1s"}}>
                <div style={{width:22,height:22,borderRadius:5,background:folder===f.id?`${f.color}18`:"#f3f4f6",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <f.icon style={{width:11,height:11,color:folder===f.id?f.color:"#9ca3af"}}/>
                </div>
                <span style={{fontSize:12,fontWeight:folder===f.id?700:500,color:folder===f.id?f.color:"#374151",flex:1}}>{f.label}</span>
                {cnt>0&&<span style={{fontSize:9,fontWeight:800,padding:"1px 6px",borderRadius:8,background:f.color,color:"#fff"}}>{cnt>99?"99+":cnt}</span>}
              </button>
            );
          })}
        </div>

        {/* Tools */}
        <div style={{padding:"6px 8px",borderTop:"1px solid #f3f4f6",background:"#f9fafb",display:"flex",flexDirection:"column",gap:3}}>
          {extFailed>0&&(
            <div style={{padding:"6px 10px",background:"#fee2e2",border:"1px solid #fecaca",borderRadius:6,fontSize:10,fontWeight:700,color:"#dc2626",display:"flex",alignItems:"center",gap:5}}>
              <AlertTriangle style={{width:10,height:10}}/> {extFailed} email{extFailed!==1?"s":""} failed to send
            </div>
          )}
          {[
            {label:"Contacts",  icon:Users,    onClick:()=>setContactsOpen(true), color:"#0369a1"},
            {label:"Email Logs",icon:Activity, onClick:()=>setLogsOpen(true),     color:"#C45911"},
            {label:"SMTP Setup",icon:Settings, onClick:()=>setSmtpOpen(true),     color:"#374151"},
          ].map(b=>(
            <button key={b.label} onClick={b.onClick} style={{display:"flex",alignItems:"center",gap:7,padding:"7px 10px",background:"transparent",border:"1px solid #e5e7eb",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:700,color:b.color,textAlign:"left"}}>
              <b.icon style={{width:11,height:11}}/> {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── MESSAGE LIST ── */}
      <div style={{width:310,background:"#fff",borderRight:"1px solid #e5e7eb",display:"flex",flexDirection:"column",flexShrink:0}}>
        {/* Toolbar */}
        <div style={{padding:"8px 10px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
          <span style={{fontSize:12,fontWeight:700,color:"#111827",flex:1}}>
            {FOLDERS.find(f=>f.id===folder)?.label} <span style={{color:"#9ca3af",fontWeight:500}}>({filtered.length})</span>
          </span>
          {unread>0&&<button onClick={markAllRead} style={{fontSize:9,fontWeight:800,color:"#1d4ed8",background:"#dbeafe",border:"none",padding:"2px 7px",borderRadius:4,cursor:"pointer",display:"flex",alignItems:"center",gap:3}}>
            <CheckCheck style={{width:9,height:9}}/> All read
          </button>}
          <button onClick={load} style={{background:"transparent",border:"none",cursor:"pointer",color:"#9ca3af",lineHeight:0,padding:3}}>
            <RefreshCw style={{width:11,height:11}} className={loading?"animate-spin":""}/>
          </button>
        </div>
        {/* Search */}
        <div style={{padding:"5px 9px",borderBottom:"1px solid #f3f4f6",flexShrink:0}}>
          <div style={{position:"relative"}}>
            <Search style={{position:"absolute",left:7,top:"50%",transform:"translateY(-50%)",width:10,height:10,color:"#9ca3af"}}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search messages…"
              style={{width:"100%",paddingLeft:23,padding:"6px 8px 6px 23px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:6,outline:"none",background:"#f9fafb"}}/>
          </div>
        </div>
        {/* List */}
        <div style={{flex:1,overflowY:"auto"}}>
          {loading?[1,2,3,4,5].map(i=>(
            <div key={i} style={{padding:"9px 10px",borderBottom:"1px solid #f9fafb",display:"flex",gap:7}}>
              <div style={{width:32,height:32,borderRadius:7,background:"#f3f4f6",flexShrink:0}} className="animate-pulse"/>
              <div style={{flex:1}}><div style={{height:10,background:"#f3f4f6",borderRadius:4,marginBottom:4,width:"60%"}} className="animate-pulse"/><div style={{height:8,background:"#f3f4f6",borderRadius:4,width:"40%"}} className="animate-pulse"/></div>
            </div>
          )):filtered.length===0?(
            <div style={{padding:"40px 16px",textAlign:"center",color:"#9ca3af"}}>
              <Mail style={{width:34,height:34,color:"#e5e7eb",margin:"0 auto 10px"}}/>
              <div style={{fontSize:13,fontWeight:600}}>No messages</div>
            </div>
          ):filtered.map(msg=>{
            const cfg=tc(msg.type); const isActive=selected?.id===msg.id; const isUnread=!msg.is_read;
            return(
              <div key={msg.id} onClick={()=>open(msg)}
                style={{padding:"9px 10px",borderBottom:"1px solid #f9fafb",cursor:"pointer",background:isActive?"#eff6ff":isUnread?"#fafcff":"transparent",borderLeft:isActive?"3px solid #1a3a6b":isUnread?`3px solid ${cfg.color}`:"3px solid transparent"}}
                onMouseEnter={e=>{if(!isActive)(e.currentTarget as HTMLElement).style.background="#f9fafb";}}
                onMouseLeave={e=>{if(!isActive)(e.currentTarget as HTMLElement).style.background=isUnread?"#fafcff":"transparent";}}>
                <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                  <div style={{width:32,height:32,borderRadius:7,background:cfg.bg,border:`1px solid ${cfg.color}28`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    {msg.is_external?<Globe style={{width:13,height:13,color:"#0369a1"}}/>:<cfg.icon style={{width:13,height:13,color:cfg.color}}/>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",justifyContent:"space-between",gap:3,marginBottom:1}}>
                      <span style={{fontSize:12,fontWeight:isUnread?700:500,color:"#111827",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{msg.from_user_id===user?.id?"Me":msg.from_name||msg.from_email||"System"}</span>
                      <span style={{fontSize:9,color:"#9ca3af",whiteSpace:"nowrap",flexShrink:0}}>{timeAgo(msg.created_at)}</span>
                    </div>
                    <div style={{fontSize:11,fontWeight:isUnread?600:400,color:"#374151",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:2}}>{msg.subject}</div>
                    <div style={{fontSize:10,color:"#9ca3af",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{msg.body.replace(/\n/g," ").slice(0,55)}</div>
                    <div style={{display:"flex",gap:4,marginTop:3,alignItems:"center",flexWrap:"wrap"}}>
                      {msg.is_external&&<span style={{fontSize:8,fontWeight:700,padding:"1px 5px",borderRadius:3,background:"#e0f2fe",color:"#0369a1"}}>EXTERNAL</span>}
                      {msg.send_status==="failed"&&<span style={{fontSize:8,fontWeight:700,padding:"1px 5px",borderRadius:3,background:"#fee2e2",color:"#dc2626"}}>FAILED</span>}
                      {msg.send_status==="sent"&&msg.is_external&&<span style={{fontSize:8,fontWeight:700,padding:"1px 5px",borderRadius:3,background:"#dcfce7",color:"#15803d"}}>DELIVERED</span>}
                      {msg.is_starred&&<Star style={{width:9,height:9,color:"#f59e0b",fill:"#f59e0b"}}/>}
                      {isUnread&&<div style={{width:5,height:5,borderRadius:"50%",background:cfg.color,marginLeft:"auto"}}/>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── VIEWER ── */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:"#fff"}}>
        {selected?(
          <>
            {/* Viewer header */}
            <div style={{padding:"12px 16px",borderBottom:"1px solid #f3f4f6",flexShrink:0,background:"#fff"}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:5}}>
                    {(()=>{const cfg=tc(selected.type);return(<div style={{width:38,height:38,borderRadius:9,background:cfg.bg,border:`1px solid ${cfg.color}30`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{selected.is_external?<Globe style={{width:17,height:17,color:"#0369a1"}}/>:<cfg.icon style={{width:17,height:17,color:cfg.color}}/>}</div>);})()}
                    <div>
                      <div style={{fontSize:16,fontWeight:800,color:"#111827",lineHeight:1.2}}>{selected.subject}</div>
                      <div style={{fontSize:11,color:"#9ca3af",marginTop:2,display:"flex",gap:6,flexWrap:"wrap"}}>
                        <span>From: <strong style={{color:"#374151"}}>{selected.from_user_id===user?.id?"Me":selected.from_name||selected.from_email||"System"}</strong></span>
                        {selected.to_email&&<span>To: <strong style={{color:"#374151"}}>{selected.to_email}</strong></span>}
                        {selected.cc_email&&<span>CC: {selected.cc_email}</span>}
                        <span style={{color:"#e5e7eb"}}>·</span>
                        <span>{fmtDate(selected.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                    {(()=>{const cfg=tc(selected.type);return<span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:4,background:cfg.bg,color:cfg.color}}>{cfg.label}</span>;})()}
                    {selected.is_external&&<span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:4,background:"#e0f2fe",color:"#0369a1"}}>EXTERNAL EMAIL</span>}
                    {selected.send_status&&<span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:4,background:selected.send_status==="sent"?"#dcfce7":selected.send_status==="failed"?"#fee2e2":"#f3f4f6",color:selected.send_status==="sent"?"#15803d":selected.send_status==="failed"?"#dc2626":"#6b7280"}}>{selected.send_status}</span>}
                    <span style={{fontSize:10,padding:"2px 8px",borderRadius:4,background:PRI_CFG[selected.priority]?.bg||"#f3f4f6",color:PRI_CFG[selected.priority]?.color||"#6b7280",fontWeight:700}}>{PRI_CFG[selected.priority]?.label||selected.priority}</span>
                  </div>
                </div>
                <div style={{display:"flex",gap:5,flexShrink:0,flexWrap:"wrap"}}>
                  {selected.source==="inbox"&&<>
                    <button onClick={()=>toggleStar(selected)} style={{padding:"5px 8px",background:selected.is_starred?"#fef3c7":"#f3f4f6",border:`1px solid ${selected.is_starred?"#fde68a":"#e5e7eb"}`,borderRadius:6,cursor:"pointer",lineHeight:0}}>
                      <Star style={{width:12,height:12,color:selected.is_starred?"#f59e0b":"#9ca3af",fill:selected.is_starred?"#f59e0b":"none"}}/>
                    </button>
                    <button onClick={()=>setReplying(true)} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 12px",background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:700,color:"#1d4ed8"}}>
                      <CornerUpLeft style={{width:11,height:11}}/> Reply
                    </button>
                    <button onClick={()=>archiveMsg(selected)} style={{padding:"5px 8px",background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:6,cursor:"pointer",lineHeight:0}}>
                      <Archive style={{width:12,height:12,color:"#9ca3af"}}/>
                    </button>
                  </>}
                  <button onClick={()=>deleteMsg(selected)} style={{padding:"5px 8px",background:"#fee2e2",border:"1px solid #fecaca",borderRadius:6,cursor:"pointer",lineHeight:0}}>
                    <Trash2 style={{width:12,height:12,color:"#dc2626"}}/>
                  </button>
                </div>
              </div>
            </div>

            {/* Body */}
            <div style={{flex:1,overflowY:"auto",padding:"22px 24px"}}>
              <pre style={{fontFamily:"'Inter','Segoe UI',sans-serif",fontSize:14,lineHeight:1.85,color:"#374151",whiteSpace:"pre-wrap",wordBreak:"break-word",margin:0}}>{selected.body}</pre>
              {selected.reply_body&&(
                <div style={{marginTop:22,paddingTop:16,borderTop:"1px dashed #e5e7eb"}}>
                  <div style={{fontSize:10,color:"#9ca3af",marginBottom:7,display:"flex",alignItems:"center",gap:4}}>
                    <CornerUpLeft style={{width:10,height:10}}/> Your reply · {selected.replied_at&&new Date(selected.replied_at).toLocaleDateString("en-KE")}
                  </div>
                  <pre style={{fontFamily:"'Inter',sans-serif",fontSize:13,lineHeight:1.75,color:"#6b7280",whiteSpace:"pre-wrap",background:"#f9fafb",padding:"12px 16px",borderRadius:8,borderLeft:"3px solid #e5e7eb",margin:0}}>{selected.reply_body}</pre>
                </div>
              )}
              {selected.error_message&&(
                <div style={{marginTop:16,padding:"10px 14px",background:"#fee2e2",border:"1px solid #fecaca",borderRadius:8,fontSize:12,color:"#dc2626",display:"flex",gap:7,alignItems:"flex-start"}}>
                  <AlertTriangle style={{width:14,height:14,flexShrink:0,marginTop:1}}/> <div><strong>Send Error:</strong> {selected.error_message}<br/><span style={{fontSize:11,opacity:0.7}}>Go to SMTP Setup to configure email sending.</span></div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{padding:"5px 16px",borderTop:"1px solid #f3f4f6",background:"#f9fafb",display:"flex",justifyContent:"space-between",fontSize:9,color:"#9ca3af",flexShrink:0}}>
              <span>EL5 MediProcure · Embu Level 5 Hospital</span>
              <span>{selected.is_external?"External Email":`Internal ${selected.source==="notification"?"Notification":"Message"}`} · {selected.thread_id&&`Thread: ${selected.thread_id.slice(0,8)}`}</span>
            </div>
          </>
        ):(
          <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14,color:"#9ca3af",padding:32}}>
            <div style={{width:72,height:72,borderRadius:18,background:"linear-gradient(135deg,#0a2558,#1a3a6b)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Mail style={{width:30,height:30,color:"rgba(255,255,255,0.7)"}}/>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:15,fontWeight:700,color:"#374151"}}>Select a message to read</div>
              <div style={{fontSize:12,color:"#9ca3af",marginTop:4}}>Or compose a new message with the button on the left</div>
            </div>
            {unread>0&&<div style={{padding:"7px 16px",background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:8,fontSize:12,fontWeight:700,color:"#1d4ed8"}}>📬 {unread} unread</div>}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {composing&&(
        <ComposeModal onClose={()=>{setComposing(false);setPreselect(null);}} onSent={load}
          profiles={profiles} contacts={contacts} templates={templates} user={user} profile={profile}/>
      )}
      {replying&&selected&&(
        <ReplyModal msg={selected} onClose={()=>setReplying(false)} onSent={()=>{load();setReplying(false);setSelected(null);}} user={user} profile={profile}/>
      )}
      {smtpOpen&&<SmtpTestPanel onClose={()=>setSmtpOpen(false)}/>}
      {contactsOpen&&<ContactsDrawer onClose={()=>setContactsOpen(false)} onSelect={(c)=>{setContactsOpen(false);setComposing(true);}}/>}
      {logsOpen&&<EmailLogsPanel onClose={()=>setLogsOpen(false)}/>}
    </div>
  );
}
