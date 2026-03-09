import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  Mail, Send, RefreshCw, Plus, Trash2, X, Paperclip, Eye,
  Inbox, CheckCircle, Clock, AlertTriangle, Users, Search,
  Star, Archive, Reply, Forward, ChevronDown, Bell, Settings,
  Edit3, Filter, FileText, Download, Upload
} from "lucide-react";

const PRIORITY_CFG: Record<string,{bg:string;color:string;label:string}> = {
  urgent: {bg:"#fee2e2",color:"#dc2626",label:"Urgent"},
  high:   {bg:"#fef3c7",color:"#b45309",label:"High"},
  normal: {bg:"#dbeafe",color:"#1d4ed8",label:"Normal"},
  low:    {bg:"#f3f4f6",color:"#6b7280",label:"Low"},
};
const TEMPLATES = [
  { id:"po",    label:"Purchase Order Notice",  subject:"Purchase Order {ref} — Action Required",   body:"Dear {name},\n\nPlease find attached Purchase Order {ref} for your review.\n\nTotal Amount: KES {amount}\nDelivery Date: {date}\n\nKindly confirm receipt and processing timeline.\n\nRegards,\n{sender}\nProcurement Department" },
  { id:"req",   label:"Requisition Approved",   subject:"Requisition {ref} Approved",               body:"Dear {name},\n\nYour requisition {ref} has been approved.\n\nApproved Amount: KES {amount}\nApproved By: {approver}\nDate: {date}\n\nRegards,\n{sender}" },
  { id:"grn",   label:"GRN Notification",       subject:"Goods Received — {ref}",                   body:"Dear {name},\n\nGoods for Order {ref} have been received.\n\nReceived By: {receiver}\nDate: {date}\n\nRegards,\n{sender}" },
  { id:"tender",label:"Tender Invitation",      subject:"Invitation to Tender — {ref}",             body:"Dear {name},\n\nYou are invited to submit a bid for Tender {ref}.\n\nClosing Date: {date}\nEstimated Value: KES {amount}\n\nKindly submit before the closing date.\n\nRegards,\n{sender}" },
  { id:"pay",   label:"Payment Processed",      subject:"Payment Voucher {ref} Processed",          body:"Dear {name},\n\nPayment {ref} has been processed successfully.\n\nAmount: KES {amount}\nDate: {date}\n\nPlease confirm receipt.\n\nRegards,\n{sender}" },
  { id:"remind",label:"Action Reminder",        subject:"Reminder: {subject} — Action Required",    body:"Dear {name},\n\nThis is a friendly reminder regarding {subject}.\n\nPlease take the necessary action at your earliest convenience.\n\nRegards,\n{sender}" },
];

const FOLDERS = [
  { id:"inbox",   label:"Inbox",     icon:Inbox,   color:"#0078d4" },
  { id:"sent",    label:"Sent",      icon:Send,    color:"#107c10" },
  { id:"drafts",  label:"Drafts",    icon:Edit3,   color:"#6b7280" },
  { id:"starred", label:"Starred",   icon:Star,    color:"#f59e0b" },
  { id:"archived",label:"Archived",  icon:Archive, color:"#9ca3af" },
];

function ComposeModal({ onClose, onSent, profiles }: { onClose:()=>void; onSent:()=>void; profiles:any[] }) {
  const { user, profile } = useAuth();
  const [to, setTo]           = useState<string[]>([]);
  const [toInput, setToInput] = useState("");
  const [cc, setCc]           = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody]       = useState("");
  const [priority, setPriority] = useState("normal");
  const [template, setTemplate] = useState("");
  const [sending, setSending] = useState(false);
  const [showPeople, setShowPeople] = useState(false);

  const applyTemplate = (tid: string) => {
    const t = TEMPLATES.find(x=>x.id===tid); if(!t) return;
    setSubject(t.subject.replace(/{[^}]+}/g,v=>`[${v.slice(1,-1)}]`));
    setBody(t.body.replace(/{sender}/g,profile?.full_name||"Staff").replace(/{hospital}/g,"Embu L5 Hospital"));
    setTemplate(tid);
  };
  const addTo = (email: string) => {
    if(email && !to.includes(email)){ setTo(p=>[...p,email]); setToInput(""); }
  };
  const send = async () => {
    if(!to.length){ toast({title:"Add at least one recipient",variant:"destructive"}); return; }
    if(!subject.trim()){ toast({title:"Add a subject",variant:"destructive"}); return; }
    setSending(true);
    try {
      const { error } = await (supabase as any).from("inbox_items").insert({
        from_user_id: user?.id, from_name: profile?.full_name,
        from_email: profile?.email || user?.email,
        to_emails: to.join(","), cc_emails: cc,
        subject, body, priority,
        status:"sent", message_type:"email",
        sent_at: new Date().toISOString(),
      });
      if(error) throw error;
      // Create inbox items for each recipient
      for(const toEmail of to) {
        const prof = profiles.find(p=>p.email===toEmail||p.full_name===toEmail);
        if(prof) {
          await (supabase as any).from("inbox_items").insert({
            to_user_id: prof.id, to_name: prof.full_name, to_email: toEmail,
            from_user_id: user?.id, from_name: profile?.full_name,
            from_email: profile?.email || user?.email,
            subject, body, priority,
            status:"unread", message_type:"email",
          });
        }
      }
      toast({title:"Email sent ✓",description:`To: ${to.join(", ")}`});
      onSent(); onClose();
    } catch(e:any){ toast({title:"Send failed",description:e.message,variant:"destructive"}); }
    setSending(false);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:"#fff",borderRadius:12,width:640,maxHeight:"85vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,0.25)"}}>
        {/* Header */}
        <div style={{padding:"12px 16px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",borderRadius:"12px 12px 0 0",display:"flex",alignItems:"center",gap:8}}>
          <Edit3 style={{width:14,height:14,color:"#fff"}}/>
          <span style={{fontSize:13,fontWeight:700,color:"#fff",flex:1}}>New Email</span>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:6,padding:"4px 6px",cursor:"pointer",color:"#fff"}}>
            <X style={{width:13,height:13}}/>
          </button>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:"14px 16px",display:"flex",flexDirection:"column",gap:10}}>
          {/* Template picker */}
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <span style={{fontSize:11,color:"#9ca3af",whiteSpace:"nowrap"}}>Template:</span>
            <select value={template} onChange={e=>applyTemplate(e.target.value)}
              style={{flex:1,fontSize:11,padding:"5px 8px",border:"1px solid #e5e7eb",borderRadius:6,outline:"none",color:"#374151"}}>
              <option value="">Select template…</option>
              {TEMPLATES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>

          {/* To field */}
          <div>
            <label style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.04em"}}>To</label>
            <div style={{marginTop:4,border:"1px solid #e5e7eb",borderRadius:6,padding:"4px 8px",background:"#f9fafb",display:"flex",flexWrap:"wrap",gap:4,alignItems:"center"}}>
              {to.map(t=>(
                <span key={t} style={{display:"inline-flex",alignItems:"center",gap:4,background:"#1a3a6b18",color:"#1a3a6b",padding:"2px 8px",borderRadius:4,fontSize:11,fontWeight:600}}>
                  {t}<X style={{width:10,height:10,cursor:"pointer"}} onClick={()=>setTo(p=>p.filter(x=>x!==t))}/>
                </span>
              ))}
              <input value={toInput} onChange={e=>{setToInput(e.target.value);setShowPeople(e.target.value.length>0);}}
                onKeyDown={e=>{ if(e.key==="Enter"||e.key===","||e.key===" "){ addTo(toInput.trim()); } }}
                placeholder={to.length?"":"Recipients (name or email)…"}
                style={{flex:1,minWidth:120,border:"none",outline:"none",background:"transparent",fontSize:11,padding:"3px 0"}}/>
            </div>
            {/* Autocomplete */}
            {showPeople && toInput.length > 0 && (
              <div style={{border:"1px solid #e5e7eb",borderRadius:6,background:"#fff",boxShadow:"0 4px 12px rgba(0,0,0,0.1)",position:"relative",zIndex:10,maxHeight:140,overflowY:"auto"}}>
                {profiles.filter(p=>(p.full_name||"").toLowerCase().includes(toInput.toLowerCase())||(p.email||"").toLowerCase().includes(toInput.toLowerCase())).slice(0,6).map(p=>(
                  <button key={p.id} onClick={()=>{addTo(p.email||p.full_name);setShowPeople(false);}}
                    style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"7px 12px",border:"none",background:"transparent",cursor:"pointer",textAlign:"left" as const,fontSize:11}}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f9fafb"}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
                    <div style={{width:22,height:22,borderRadius:"50%",background:"#1a3a6b",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <span style={{fontSize:10,color:"#fff",fontWeight:700}}>{(p.full_name||"?")[0]}</span>
                    </div>
                    <div><div style={{fontWeight:600,color:"#374151"}}>{p.full_name}</div><div style={{fontSize:9,color:"#9ca3af"}}>{p.email}</div></div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* CC */}
          <div>
            <label style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.04em"}}>CC</label>
            <input value={cc} onChange={e=>setCc(e.target.value)} placeholder="CC recipients…"
              style={{marginTop:4,width:"100%",padding:"6px 10px",fontSize:11,border:"1px solid #e5e7eb",borderRadius:6,outline:"none"}}/>
          </div>

          {/* Subject + Priority */}
          <div style={{display:"flex",gap:8}}>
            <div style={{flex:1}}>
              <label style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.04em"}}>Subject</label>
              <input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Email subject…"
                style={{marginTop:4,width:"100%",padding:"6px 10px",fontSize:11,border:"1px solid #e5e7eb",borderRadius:6,outline:"none"}}/>
            </div>
            <div>
              <label style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.04em"}}>Priority</label>
              <select value={priority} onChange={e=>setPriority(e.target.value)}
                style={{marginTop:4,width:"100%",padding:"6px 8px",fontSize:11,border:"1px solid #e5e7eb",borderRadius:6,outline:"none"}}>
                {Object.entries(PRIORITY_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>

          {/* Body */}
          <div style={{flex:1}}>
            <label style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.04em"}}>Message</label>
            <textarea value={body} onChange={e=>setBody(e.target.value)} rows={10}
              placeholder="Write your message here…"
              style={{marginTop:4,width:"100%",padding:"10px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:6,outline:"none",resize:"vertical",fontFamily:"inherit",lineHeight:1.6}}/>
          </div>
        </div>

        {/* Footer */}
        <div style={{padding:"10px 16px",borderTop:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:8}}>
          <button onClick={send} disabled={sending} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 20px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:700,boxShadow:"0 2px 8px rgba(26,58,107,0.3)"}}>
            {sending?<RefreshCw style={{width:13,height:13}} className="animate-spin"/>:<Send style={{width:13,height:13}}/>}
            {sending?"Sending…":"Send Email"}
          </button>
          <button onClick={onClose} style={{padding:"8px 16px",background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:7,cursor:"pointer",fontSize:12,color:"#374151"}}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function EmailPage() {
  const { user, profile, roles } = useAuth();
  const isAdmin = roles.includes("admin")||roles.includes("procurement_manager");
  const [folder,     setFolder]     = useState("inbox");
  const [emails,     setEmails]     = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [selected,   setSelected]   = useState<any>(null);
  const [search,     setSearch]     = useState("");
  const [compose,    setCompose]    = useState(false);
  const [profiles,   setProfiles]   = useState<any[]>([]);
  const [unreadCt,   setUnreadCt]   = useState(0);
  const [replying,   setReplying]   = useState(false);
  const [replyBody,  setReplyBody]  = useState("");

  const loadEmails = useCallback(async() => {
    setLoading(true);
    let q = (supabase as any).from("inbox_items").select("*").order("created_at",{ascending:false}).limit(100);
    if(folder==="inbox")   q=q.eq("to_user_id",user?.id).neq("status","sent");
    if(folder==="sent")    q=q.eq("from_user_id",user?.id).eq("status","sent");
    if(folder==="starred") q=q.eq("to_user_id",user?.id).eq("is_starred",true);
    if(folder==="drafts")  q=q.eq("from_user_id",user?.id).eq("status","draft");
    if(isAdmin && folder==="inbox") q=(supabase as any).from("inbox_items").select("*").order("created_at",{ascending:false}).limit(100);
    const { data } = await q;
    setEmails(data||[]);
    // unread count
    const { count } = await (supabase as any).from("inbox_items").select("id",{count:"exact",head:true}).eq("to_user_id",user?.id).eq("status","unread");
    setUnreadCt(count||0);
    setLoading(false);
  },[folder,user,isAdmin]);

  useEffect(()=>{
    (supabase as any).from("profiles").select("id,full_name,email,department").order("full_name").then(({data}:any)=>setProfiles(data||[]));
  },[]);
  useEffect(()=>{ loadEmails(); },[loadEmails]);
  useEffect(()=>{
    const ch=(supabase as any).channel("email-rt").on("postgres_changes",{event:"*",schema:"public",table:"inbox_items"},()=>loadEmails()).subscribe();
    return()=>(supabase as any).removeChannel(ch);
  },[loadEmails]);

  const markRead = async(id:string) => {
    await (supabase as any).from("inbox_items").update({status:"read",read_at:new Date().toISOString()}).eq("id",id);
    loadEmails();
  };
  const deleteEmail = async(id:string) => {
    await (supabase as any).from("inbox_items").delete().eq("id",id);
    setSelected(null); loadEmails();
  };
  const sendReply = async() => {
    if(!replyBody.trim()||!selected) return;
    const { error } = await (supabase as any).from("inbox_items").insert({
      from_user_id:user?.id, from_name:profile?.full_name,
      from_email:profile?.email||user?.email,
      to_user_id:selected.from_user_id, to_name:selected.from_name,
      to_email:selected.from_email,
      subject:`Re: ${selected.subject}`, body:replyBody,
      priority:"normal", status:"sent", message_type:"email",
      sent_at:new Date().toISOString(),
    });
    if(error){ toast({title:"Reply failed",description:error.message,variant:"destructive"}); return; }
    toast({title:"Reply sent ✓"});
    setReplying(false); setReplyBody("");
  };

  const filtered = emails.filter(e=> !search||[e.subject,e.from_name,e.to_name,e.body].some(v=>String(v||"").toLowerCase().includes(search.toLowerCase())));

  return (
    <div style={{display:"flex",height:"calc(100vh - 57px)",fontFamily:"'Inter','Segoe UI',sans-serif",background:"#f4f6f9"}}>

      {/* ── SIDEBAR ── */}
      <div style={{width:220,background:"#fff",borderRight:"1px solid #e5e7eb",display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{padding:"12px",borderBottom:"1px solid #f3f4f6"}}>
          <button onClick={()=>setCompose(true)} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:7,padding:"9px 0",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700,boxShadow:"0 2px 8px rgba(26,58,107,0.25)"}}>
            <Edit3 style={{width:13,height:13}}/> Compose Email
          </button>
        </div>
        <div style={{padding:"8px",flex:1,overflowY:"auto"}}>
          {FOLDERS.map(f=>(
            <button key={f.id} onClick={()=>{setFolder(f.id);setSelected(null);}}
              style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 10px",border:"none",borderRadius:7,cursor:"pointer",textAlign:"left" as const,marginBottom:2,background:folder===f.id?`${f.color}15`:"transparent"}}>
              <f.icon style={{width:14,height:14,color:f.id===folder?f.color:"#9ca3af"}}/>
              <span style={{fontSize:12,fontWeight:folder===f.id?700:500,color:folder===f.id?f.color:"#6b7280",flex:1}}>{f.label}</span>
              {f.id==="inbox"&&unreadCt>0&&<span style={{background:"#0078d4",color:"#fff",fontSize:9,fontWeight:800,padding:"1px 6px",borderRadius:10}}>{unreadCt}</span>}
            </button>
          ))}

          {/* Admin: broadcast section */}
          {isAdmin && (
            <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid #f3f4f6"}}>
              <div style={{fontSize:9,fontWeight:700,color:"#9ca3af",letterSpacing:"0.08em",padding:"0 10px 6px",textTransform:"uppercase"}}>Admin</div>
              <button onClick={()=>setFolder("all")} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 10px",border:"none",borderRadius:7,cursor:"pointer",textAlign:"left" as const,background:folder==="all"?"#1a3a6b15":"transparent"}}>
                <Users style={{width:13,height:13,color:folder==="all"?"#1a3a6b":"#9ca3af"}}/>
                <span style={{fontSize:12,fontWeight:folder==="all"?700:500,color:folder==="all"?"#1a3a6b":"#6b7280"}}>All Messages</span>
              </button>
              <button onClick={()=>setFolder("broadcast")} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 10px",border:"none",borderRadius:7,cursor:"pointer",textAlign:"left" as const,background:folder==="broadcast"?"#1a3a6b15":"transparent"}}>
                <Bell style={{width:13,height:13,color:folder==="broadcast"?"#f59e0b":"#9ca3af"}}/>
                <span style={{fontSize:12,fontWeight:folder==="broadcast"?700:500,color:folder==="broadcast"?"#1a3a6b":"#6b7280"}}>Broadcast</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── EMAIL LIST ── */}
      <div style={{width:320,background:"#fff",borderRight:"1px solid #e5e7eb",display:"flex",flexDirection:"column",flexShrink:0}}>
        {/* List header */}
        <div style={{padding:"10px 12px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:12,fontWeight:700,color:"#111827",flex:1,textTransform:"capitalize"}}>{folder}</span>
          <button onClick={loadEmails} disabled={loading} style={{background:"transparent",border:"none",cursor:"pointer",color:"#9ca3af"}}>
            <RefreshCw style={{width:12,height:12}} className={loading?"animate-spin":""}/>
          </button>
        </div>
        {/* Search */}
        <div style={{padding:"8px 12px",borderBottom:"1px solid #f3f4f6",position:"relative"}}>
          <Search style={{position:"absolute",left:19,top:"50%",transform:"translateY(-50%)",width:11,height:11,color:"#9ca3af"}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search emails…"
            style={{width:"100%",paddingLeft:24,paddingRight:8,paddingTop:5,paddingBottom:5,fontSize:11,border:"1px solid #e5e7eb",borderRadius:6,outline:"none",background:"#f9fafb"}}/>
        </div>
        {/* List */}
        <div style={{flex:1,overflowY:"auto"}}>
          {loading ? [1,2,3,4,5].map(i=>(
            <div key={i} style={{padding:"12px",borderBottom:"1px solid #f9fafb",display:"flex",gap:8}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:"#f3f4f6"}} className="animate-pulse"/>
              <div style={{flex:1}}><div style={{height:10,background:"#f3f4f6",borderRadius:4,marginBottom:6,width:"70%"}} className="animate-pulse"/><div style={{height:8,background:"#f3f4f6",borderRadius:4,width:"50%"}} className="animate-pulse"/></div>
            </div>
          )) : filtered.length===0 ? (
            <div style={{padding:"30px",textAlign:"center",color:"#9ca3af",fontSize:12}}>No emails in {folder}</div>
          ) : filtered.map(email=>{
            const isUnread = email.status==="unread";
            const isActive = selected?.id===email.id;
            const pc = PRIORITY_CFG[email.priority||"normal"];
            return (
              <div key={email.id} onClick={()=>{setSelected(email);markRead(email.id);setReplying(false);}}
                style={{padding:"11px 12px",borderBottom:"1px solid #f9fafb",cursor:"pointer",background:isActive?"#eff6ff":isUnread?"#fafbff":"transparent",borderLeft:isUnread?"3px solid #0078d4":isActive?"3px solid #93c5fd":"3px solid transparent",display:"flex",gap:8,alignItems:"flex-start"}}
                onMouseEnter={e=>{if(!isActive)(e.currentTarget as HTMLElement).style.background="#f9fafb";}}
                onMouseLeave={e=>{if(!isActive)(e.currentTarget as HTMLElement).style.background=isUnread?"#fafbff":"transparent";}}>
                <div style={{width:30,height:30,borderRadius:"50%",background:isUnread?"#1a3a6b":"#e5e7eb",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <span style={{fontSize:11,fontWeight:700,color:isUnread?"#fff":"#6b7280"}}>{((email.from_name||email.to_name||"?")[0]).toUpperCase()}</span>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:4,marginBottom:2}}>
                    <span style={{fontSize:12,fontWeight:isUnread?700:500,color:"#111827",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {folder==="sent"?email.to_name:email.from_name||"System"}
                    </span>
                    <span style={{fontSize:9,color:"#9ca3af",whiteSpace:"nowrap"}}>
                      {new Date(email.created_at||email.sent_at).toLocaleDateString("en-KE",{month:"short",day:"2-digit"})}
                    </span>
                  </div>
                  <div style={{fontSize:11,fontWeight:isUnread?600:400,color:"#374151",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:2}}>{email.subject||"(no subject)"}</div>
                  <div style={{fontSize:10,color:"#9ca3af",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(email.body||"").slice(0,60)}</div>
                  {email.priority&&email.priority!=="normal"&&<span style={{display:"inline-block",marginTop:3,fontSize:8,fontWeight:700,padding:"1px 5px",borderRadius:3,background:pc.bg,color:pc.color}}>{pc.label}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── EMAIL READER ── */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:"#fff"}}>
        {selected ? (
          <>
            {/* Reader header */}
            <div style={{padding:"12px 18px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:8}}>
              <div style={{flex:1}}>
                <div style={{fontSize:15,fontWeight:700,color:"#111827",marginBottom:2}}>{selected.subject||"(no subject)"}</div>
                <div style={{fontSize:11,color:"#6b7280"}}>
                  From: <strong>{selected.from_name}</strong> · To: <strong>{selected.to_name||selected.to_emails}</strong>
                  {selected.cc_emails && <> · CC: {selected.cc_emails}</>}
                  <span style={{marginLeft:8,color:"#9ca3af"}}>{new Date(selected.created_at).toLocaleString("en-KE")}</span>
                </div>
              </div>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>setReplying(r=>!r)} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:600,color:"#374151"}}>
                  <Reply style={{width:12,height:12}}/> Reply
                </button>
                <button onClick={()=>setCompose(true)} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:600,color:"#374151"}}>
                  <Forward style={{width:12,height:12}}/> Forward
                </button>
                <button onClick={()=>deleteEmail(selected.id)} style={{padding:"6px 8px",background:"#fee2e2",border:"1px solid #fecaca",borderRadius:6,cursor:"pointer",color:"#dc2626"}}>
                  <Trash2 style={{width:12,height:12}}/>
                </button>
              </div>
            </div>
            {/* Priority badge */}
            {selected.priority && selected.priority!=="normal" && (
              <div style={{padding:"6px 18px",background:"#fffbeb",borderBottom:"1px solid #fef3c7",display:"flex",alignItems:"center",gap:6}}>
                <AlertTriangle style={{width:12,height:12,color:"#f59e0b"}}/>
                <span style={{fontSize:11,fontWeight:600,color:"#92400e"}}>{PRIORITY_CFG[selected.priority]?.label} Priority</span>
              </div>
            )}
            {/* Email body */}
            <div style={{flex:1,padding:"20px 24px",overflowY:"auto"}}>
              <pre style={{fontFamily:"'Inter','Segoe UI',sans-serif",fontSize:13,lineHeight:1.75,color:"#374151",whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{selected.body}</pre>
            </div>
            {/* Reply box */}
            {replying && (
              <div style={{borderTop:"1px solid #e5e7eb",padding:"12px 16px",background:"#f9fafb"}}>
                <div style={{fontSize:11,fontWeight:700,color:"#374151",marginBottom:6}}>Reply to {selected.from_name}</div>
                <textarea value={replyBody} onChange={e=>setReplyBody(e.target.value)} rows={4} placeholder="Write your reply…"
                  style={{width:"100%",padding:"8px 10px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:6,outline:"none",fontFamily:"inherit",lineHeight:1.6,resize:"none"}}/>
                <div style={{display:"flex",gap:6,marginTop:8}}>
                  <button onClick={sendReply} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 16px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:700}}>
                    <Send style={{width:11,height:11}}/> Send Reply
                  </button>
                  <button onClick={()=>setReplying(false)} style={{padding:"7px 12px",background:"#fff",border:"1px solid #e5e7eb",borderRadius:6,cursor:"pointer",fontSize:11,color:"#6b7280"}}>Cancel</button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,color:"#9ca3af"}}>
            <Mail style={{width:48,height:48,color:"#e5e7eb"}}/>
            <div style={{fontSize:13,fontWeight:600}}>Select an email to read</div>
            <button onClick={()=>setCompose(true)} style={{display:"flex",alignItems:"center",gap:6,padding:"9px 18px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700}}>
              <Edit3 style={{width:13,height:13}}/> Compose New Email
            </button>
          </div>
        )}
      </div>

      {compose && <ComposeModal onClose={()=>setCompose(false)} onSent={loadEmails} profiles={profiles}/>}
    </div>
  );
}
