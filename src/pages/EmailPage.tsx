import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  Mail, Send, RefreshCw, Plus, Trash2, X, Eye,
  Inbox, Users, Search, Star, Archive, Reply,
  Forward, Bell, Edit3, AlertTriangle, CheckCheck,
  ChevronDown, Settings, Clock
} from "lucide-react";

/* ── Types ── */
interface Email {
  id: string;
  type?: string;
  subject: string;
  body: string;
  from_user_id: string;
  from_name?: string;
  to_user_id: string;
  to_name?: string;
  priority: string;
  status: string;
  created_at: string;
  record_id?: string;
  record_type?: string;
}

const PRIORITY: Record<string,{bg:string;color:string;label:string}> = {
  urgent: {bg:"#fee2e2",color:"#dc2626",label:"Urgent"},
  high:   {bg:"#fef3c7",color:"#b45309",label:"High"},
  normal: {bg:"#dbeafe",color:"#1d4ed8",label:"Normal"},
  low:    {bg:"#f3f4f6",color:"#6b7280",label:"Low"},
};

const TEMPLATES = [
  { id:"po",     label:"Purchase Order Notice",  subject:"Purchase Order [ref] — Action Required",   body:"Dear [name],\n\nPlease find the attached Purchase Order [ref] for your review and approval.\n\nTotal Amount: KES [amount]\nDelivery Date: [date]\n\nKindly confirm receipt and processing timeline.\n\nRegards,\n[sender]\nProcurement Department" },
  { id:"req",    label:"Requisition Approved",   subject:"Requisition [ref] Approved",               body:"Dear [name],\n\nYour requisition [ref] has been approved by management.\n\nApproved Amount: KES [amount]\nApproved By: [approver]\nDate: [date]\n\nRegards,\n[sender]" },
  { id:"grn",    label:"GRN Notification",       subject:"Goods Received — [ref]",                   body:"Dear [name],\n\nGoods for Order [ref] have been received and are undergoing inspection.\n\nReceived By: [receiver]\nDate: [date]\n\nRegards,\n[sender]" },
  { id:"tender", label:"Tender Invitation",      subject:"Invitation to Tender — [ref]",             body:"Dear [name],\n\nYou are cordially invited to submit a bid for Tender [ref].\n\nClosing Date: [date]\nEstimated Value: KES [amount]\n\nKindly submit before the closing date.\n\nRegards,\n[sender]" },
  { id:"pay",    label:"Payment Processed",      subject:"Payment [ref] Processed",                  body:"Dear [name],\n\nPayment [ref] has been processed successfully.\n\nAmount: KES [amount]\nDate: [date]\n\nPlease confirm receipt.\n\nRegards,\n[sender]" },
  { id:"remind", label:"Action Reminder",        subject:"Reminder: [subject] — Action Required",    body:"Dear [name],\n\nThis is a friendly reminder regarding [subject].\n\nPlease take the necessary action at your earliest convenience.\n\nRegards,\n[sender]" },
];

const FOLDERS = [
  { id:"inbox",    label:"Inbox",     icon:Inbox,   color:"#0078d4" },
  { id:"sent",     label:"Sent",      icon:Send,    color:"#107c10" },
  { id:"starred",  label:"Starred",   icon:Star,    color:"#f59e0b" },
  { id:"archived", label:"Archived",  icon:Archive, color:"#9ca3af" },
];

/* ── Compose Modal ── */
function ComposeModal({ onClose, onSent, profiles, user, profile }: {
  onClose:()=>void; onSent:()=>void; profiles:any[]; user:any; profile:any;
}) {
  const [to,         setTo]         = useState<{id:string;name:string}[]>([]);
  const [toInput,    setToInput]    = useState("");
  const [subject,    setSubject]    = useState("");
  const [body,       setBody]       = useState("");
  const [priority,   setPriority]   = useState("normal");
  const [template,   setTemplate]   = useState("");
  const [sending,    setSending]    = useState(false);
  const [showPeople, setShowPeople] = useState(false);

  const applyTemplate = (tid: string) => {
    const t = TEMPLATES.find(x=>x.id===tid); if(!t) return;
    setSubject(t.subject); setBody(t.body.replace(/\[sender\]/g, profile?.full_name||"Staff"));
    setTemplate(tid);
  };

  const addRecipient = (p: {id:string;name:string}) => {
    if(!to.find(x=>x.id===p.id)) setTo(prev=>[...prev,p]);
    setToInput(""); setShowPeople(false);
  };

  const send = async () => {
    if(!to.length){ toast({title:"Add at least one recipient",variant:"destructive"}); return; }
    if(!subject.trim()){ toast({title:"Add a subject",variant:"destructive"}); return; }
    setSending(true);
    try {
      // Create one inbox item per recipient
      for(const recipient of to) {
        const { error } = await (supabase as any).from("inbox_items").insert({
          type: "email",
          subject,
          body,
          from_user_id: user?.id,
          to_user_id: recipient.id,
          priority,
          status: "unread",
          record_type: "email",
        });
        if(error) throw error;
      }
      // Create sent copy for sender
      for(const recipient of to) {
        await (supabase as any).from("inbox_items").insert({
          type: "email",
          subject,
          body,
          from_user_id: user?.id,
          to_user_id: user?.id,
          priority,
          status: "sent",
          record_type: "email",
        });
        break; // one sent copy is enough
      }
      toast({title:"Email sent ✓", description:`To: ${to.map(x=>x.name).join(", ")}`});
      onSent(); onClose();
    } catch(e:any) {
      toast({title:"Send failed", description:e.message, variant:"destructive"});
    }
    setSending(false);
  };

  const filtered = profiles.filter(p=>
    p.id !== user?.id &&
    (toInput.length > 0) &&
    ((p.full_name||"").toLowerCase().includes(toInput.toLowerCase()) ||
     (p.email||"").toLowerCase().includes(toInput.toLowerCase()))
  ).slice(0,6);

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:"#fff",borderRadius:12,width:620,maxHeight:"88vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,0.25)"}}>
        {/* Header */}
        <div style={{padding:"12px 16px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",borderRadius:"12px 12px 0 0",display:"flex",alignItems:"center",gap:8}}>
          <Edit3 style={{width:14,height:14,color:"#fff"}}/>
          <span style={{fontSize:13,fontWeight:700,color:"#fff",flex:1}}>New Email</span>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:6,padding:"4px 6px",cursor:"pointer",color:"#fff",lineHeight:0}}>
            <X style={{width:13,height:13}}/>
          </button>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:"14px 16px",display:"flex",flexDirection:"column",gap:10}}>
          {/* Template */}
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <span style={{fontSize:10,color:"#9ca3af",whiteSpace:"nowrap",fontWeight:600}}>TEMPLATE:</span>
            <select value={template} onChange={e=>applyTemplate(e.target.value)}
              style={{flex:1,fontSize:11,padding:"5px 8px",border:"1px solid #e5e7eb",borderRadius:6,outline:"none",color:"#374151"}}>
              <option value="">Select template…</option>
              {TEMPLATES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>

          {/* To */}
          <div>
            <label style={{fontSize:10,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.04em"}}>TO</label>
            <div style={{border:"1px solid #e5e7eb",borderRadius:6,padding:"5px 8px",background:"#f9fafb",display:"flex",flexWrap:"wrap" as const,gap:4,alignItems:"center",minHeight:38}}>
              {to.map(r=>(
                <span key={r.id} style={{display:"inline-flex",alignItems:"center",gap:4,background:"#1a3a6b18",color:"#1a3a6b",padding:"2px 8px",borderRadius:4,fontSize:11,fontWeight:600}}>
                  {r.name}
                  <X style={{width:10,height:10,cursor:"pointer"}} onClick={()=>setTo(p=>p.filter(x=>x.id!==r.id))}/>
                </span>
              ))}
              <input value={toInput}
                onChange={e=>{setToInput(e.target.value);setShowPeople(e.target.value.length>0);}}
                onKeyDown={e=>{if(e.key==="Escape"){setToInput("");setShowPeople(false);}}}
                placeholder={to.length?"":"Search by name…"}
                style={{flex:1,minWidth:140,border:"none",outline:"none",background:"transparent",fontSize:11,padding:"3px 0"}}/>
            </div>
            {/* Autocomplete dropdown */}
            {showPeople && filtered.length>0 && (
              <div style={{border:"1px solid #e5e7eb",borderRadius:6,background:"#fff",boxShadow:"0 4px 12px rgba(0,0,0,0.1)",marginTop:2,maxHeight:160,overflowY:"auto",zIndex:10,position:"relative"}}>
                {filtered.map(p=>(
                  <button key={p.id} onClick={()=>addRecipient({id:p.id,name:p.full_name})}
                    style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 12px",border:"none",background:"transparent",cursor:"pointer",textAlign:"left" as const,fontSize:11}}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f9fafb"}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
                    <div style={{width:24,height:24,borderRadius:"50%",background:"#1a3a6b",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <span style={{fontSize:10,color:"#fff",fontWeight:700}}>{(p.full_name||"?")[0]}</span>
                    </div>
                    <div>
                      <div style={{fontWeight:600,color:"#374151"}}>{p.full_name}</div>
                      <div style={{fontSize:9,color:"#9ca3af"}}>{p.email} · {p.department||""}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Subject + Priority */}
          <div style={{display:"flex",gap:8}}>
            <div style={{flex:1}}>
              <label style={{fontSize:10,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.04em"}}>SUBJECT</label>
              <input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Email subject…"
                style={{width:"100%",padding:"7px 10px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:6,outline:"none"}}/>
            </div>
            <div>
              <label style={{fontSize:10,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.04em"}}>PRIORITY</label>
              <select value={priority} onChange={e=>setPriority(e.target.value)}
                style={{padding:"7px 10px",fontSize:11,border:"1px solid #e5e7eb",borderRadius:6,outline:"none"}}>
                {Object.entries(PRIORITY).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>

          {/* Body */}
          <div style={{flex:1}}>
            <label style={{fontSize:10,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.04em"}}>MESSAGE</label>
            <textarea value={body} onChange={e=>setBody(e.target.value)} rows={9}
              placeholder="Write your message here…"
              style={{width:"100%",padding:"10px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:6,outline:"none",resize:"vertical",fontFamily:"inherit",lineHeight:1.65}}/>
          </div>
        </div>

        {/* Footer */}
        <div style={{padding:"10px 16px",borderTop:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:8}}>
          <button onClick={send} disabled={sending}
            style={{display:"flex",alignItems:"center",gap:6,padding:"8px 20px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",color:"#fff",border:"none",borderRadius:7,cursor:sending?"not-allowed":"pointer",fontSize:12,fontWeight:700,boxShadow:"0 2px 8px rgba(26,58,107,0.3)",opacity:sending?0.8:1}}>
            {sending?<RefreshCw style={{width:13,height:13}} className="animate-spin"/>:<Send style={{width:13,height:13}}/>}
            {sending?"Sending…":"Send Email"}
          </button>
          <button onClick={onClose}
            style={{padding:"8px 16px",background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:7,cursor:"pointer",fontSize:12,color:"#374151"}}>
            Cancel
          </button>
          <span style={{marginLeft:"auto",fontSize:10,color:"#9ca3af"}}>{to.length} recipient{to.length!==1?"s":""}</span>
        </div>
      </div>
    </div>
  );
}

/* ── Main EmailPage ── */
export default function EmailPage() {
  const { user, profile, roles } = useAuth();
  const isAdmin = roles.includes("admin")||roles.includes("procurement_manager");

  const [folder,   setFolder]   = useState("inbox");
  const [emails,   setEmails]   = useState<Email[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState<Email|null>(null);
  const [search,   setSearch]   = useState("");
  const [compose,  setCompose]  = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [unread,   setUnread]   = useState(0);
  const [replying, setReplying] = useState(false);
  const [replyBody,setReplyBody]= useState("");
  const [sending,  setSending]  = useState(false);

  const loadEmails = useCallback(async()=>{
    setLoading(true);
    try {
      let q = (supabase as any).from("inbox_items").select("*").order("created_at",{ascending:false}).limit(100);
      if(folder==="inbox")    q = q.eq("to_user_id",user?.id).neq("status","sent");
      else if(folder==="sent")     q = q.eq("from_user_id",user?.id).eq("status","sent");
      else if(folder==="starred")  q = q.eq("to_user_id",user?.id).eq("is_starred",true);
      else if(folder==="archived") q = q.eq("to_user_id",user?.id).eq("status","archived");
      else if(folder==="all" && isAdmin) q = (supabase as any).from("inbox_items").select("*").order("created_at",{ascending:false}).limit(150);

      const { data, error } = await q;
      if(error) throw error;
      setEmails(data||[]);

      // Unread count
      const { count } = await (supabase as any).from("inbox_items")
        .select("id",{count:"exact",head:true})
        .eq("to_user_id",user?.id).eq("status","unread");
      setUnread(count||0);
    } catch(e:any){ console.error(e); }
    setLoading(false);
  },[folder,user,isAdmin]);

  useEffect(()=>{
    (supabase as any).from("profiles").select("id,full_name,email,department").order("full_name").limit(200)
      .then(({data}:any)=>setProfiles(data||[]));
  },[]);

  useEffect(()=>{ loadEmails(); },[loadEmails]);

  useEffect(()=>{
    if(!user) return;
    const ch=(supabase as any).channel("email-rt-v2")
      .on("postgres_changes",{event:"*",schema:"public",table:"inbox_items"},()=>loadEmails())
      .subscribe();
    return()=>(supabase as any).removeChannel(ch);
  },[loadEmails,user]);

  const markRead = async(id:string)=>{
    await (supabase as any).from("inbox_items").update({status:"read"}).eq("id",id);
    setEmails(p=>p.map(e=>e.id===id?{...e,status:"read"}:e));
    setUnread(p=>Math.max(0,p-1));
  };

  const deleteEmail = async(id:string)=>{
    if(!confirm("Delete this email?")) return;
    await (supabase as any).from("inbox_items").delete().eq("id",id);
    setSelected(null); loadEmails();
    toast({title:"Deleted"});
  };

  const sendReply = async()=>{
    if(!replyBody.trim()||!selected) return;
    setSending(true);
    const { error } = await (supabase as any).from("inbox_items").insert({
      type: "email",
      subject: `Re: ${selected.subject}`,
      body: replyBody,
      from_user_id: user?.id,
      to_user_id: selected.from_user_id,
      priority: "normal",
      status: "unread",
      record_type: "email",
    });
    if(error){ toast({title:"Reply failed",description:error.message,variant:"destructive"}); setSending(false); return; }
    toast({title:"Reply sent ✓"});
    setReplying(false); setReplyBody(""); setSending(false);
  };

  const filtered = emails.filter(e=>
    !search||[e.subject,e.from_name,e.to_name,e.body].some(v=>String(v||"").toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{display:"flex",height:"calc(100vh - 82px)",fontFamily:"'Inter','Segoe UI',sans-serif",background:"#f4f6f9"}}>

      {/* ── LEFT SIDEBAR ── */}
      <div style={{width:210,background:"#fff",borderRight:"1px solid #e5e7eb",display:"flex",flexDirection:"column",flexShrink:0,boxShadow:"1px 0 8px rgba(0,0,0,0.04)"}}>
        <div style={{padding:"12px 10px",borderBottom:"1px solid #f3f4f6"}}>
          <button onClick={()=>setCompose(true)}
            style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:7,padding:"9px 0",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700,boxShadow:"0 2px 8px rgba(26,58,107,0.25)"}}>
            <Edit3 style={{width:13,height:13}}/> Compose Email
          </button>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:"6px 0"}}>
          {FOLDERS.map(f=>(
            <button key={f.id} onClick={()=>{setFolder(f.id);setSelected(null);setReplying(false);}}
              style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 12px",border:"none",borderRadius:0,cursor:"pointer",textAlign:"left" as const,background:folder===f.id?`${f.color}12`:"transparent",borderLeft:folder===f.id?`3px solid ${f.color}`:"3px solid transparent",transition:"all 0.1s"}}>
              <f.icon style={{width:14,height:14,color:folder===f.id?f.color:"#9ca3af"}}/>
              <span style={{fontSize:12,fontWeight:folder===f.id?700:500,color:folder===f.id?f.color:"#6b7280",flex:1}}>{f.label}</span>
              {f.id==="inbox"&&unread>0&&(
                <span style={{background:"#0078d4",color:"#fff",fontSize:9,fontWeight:800,padding:"1px 6px",borderRadius:10,minWidth:18,textAlign:"center" as const}}>{unread}</span>
              )}
            </button>
          ))}

          {isAdmin && (
            <>
              <div style={{margin:"8px 12px",borderTop:"1px solid #f3f4f6"}}/>
              <div style={{padding:"4px 12px 4px",fontSize:9,fontWeight:700,color:"#9ca3af",letterSpacing:"0.08em",textTransform:"uppercase" as const}}>ADMIN</div>
              <button onClick={()=>{setFolder("all");setSelected(null);}}
                style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 12px",border:"none",cursor:"pointer",textAlign:"left" as const,background:folder==="all"?"#1a3a6b12":"transparent",borderLeft:folder==="all"?"3px solid #1a3a6b":"3px solid transparent"}}>
                <Users style={{width:13,height:13,color:folder==="all"?"#1a3a6b":"#9ca3af"}}/>
                <span style={{fontSize:12,fontWeight:folder==="all"?700:500,color:folder==="all"?"#1a3a6b":"#6b7280"}}>All Messages</span>
              </button>
            </>
          )}
        </div>

        {/* Sidebar footer */}
        <div style={{padding:"8px 12px",borderTop:"1px solid #f3f4f6",background:"#f9fafb"}}>
          <div style={{fontSize:9,color:"#9ca3af",fontWeight:600}}>EL5 MediProcure</div>
          <div style={{fontSize:8,color:"#d1d5db"}}>Embu Level 5 Hospital</div>
        </div>
      </div>

      {/* ── EMAIL LIST ── */}
      <div style={{width:310,background:"#fff",borderRight:"1px solid #e5e7eb",display:"flex",flexDirection:"column",flexShrink:0}}>
        {/* List header */}
        <div style={{padding:"9px 12px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:12,fontWeight:700,color:"#111827",flex:1,textTransform:"capitalize" as const}}>
            {FOLDERS.find(f=>f.id===folder)?.label||folder}
          </span>
          <span style={{fontSize:10,color:"#9ca3af"}}>{filtered.length}</span>
          <button onClick={loadEmails} disabled={loading} style={{background:"transparent",border:"none",cursor:"pointer",color:"#9ca3af",lineHeight:0}}>
            <RefreshCw style={{width:12,height:12}} className={loading?"animate-spin":""}/>
          </button>
        </div>
        {/* Search */}
        <div style={{padding:"7px 10px",borderBottom:"1px solid #f3f4f6",position:"relative"}}>
          <Search style={{position:"absolute",left:17,top:"50%",transform:"translateY(-50%)",width:11,height:11,color:"#9ca3af"}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search emails…"
            style={{width:"100%",paddingLeft:25,paddingRight:8,paddingTop:5,paddingBottom:5,fontSize:11,border:"1px solid #e5e7eb",borderRadius:6,outline:"none",background:"#f9fafb"}}/>
        </div>
        {/* List items */}
        <div style={{flex:1,overflowY:"auto"}}>
          {loading ? (
            [1,2,3,4,5].map(i=>(
              <div key={i} style={{padding:"11px 12px",borderBottom:"1px solid #f9fafb",display:"flex",gap:8}}>
                <div style={{width:30,height:30,borderRadius:"50%",background:"#f3f4f6",flexShrink:0}} className="animate-pulse"/>
                <div style={{flex:1}}><div style={{height:10,background:"#f3f4f6",borderRadius:4,marginBottom:5,width:"70%"}} className="animate-pulse"/><div style={{height:8,background:"#f3f4f6",borderRadius:4,width:"50%"}} className="animate-pulse"/></div>
              </div>
            ))
          ) : filtered.length===0 ? (
            <div style={{padding:"30px",textAlign:"center",color:"#9ca3af",fontSize:12}}>
              No emails in {FOLDERS.find(f=>f.id===folder)?.label||folder}
            </div>
          ) : (
            filtered.map(email=>{
              const isUnread = email.status==="unread";
              const isActive = selected?.id===email.id;
              const pc = PRIORITY[email.priority||"normal"];
              const senderName = folder==="sent" ? (email.to_name||"You") : (email.from_name||"System");
              const senderInitial = senderName[0]?.toUpperCase()||"?";

              return (
                <div key={email.id}
                  onClick={()=>{ setSelected(email); setReplying(false); if(isUnread) markRead(email.id); }}
                  style={{
                    padding:"10px 12px",borderBottom:"1px solid #f9fafb",
                    cursor:"pointer",transition:"background 0.1s",
                    background:isActive?"#eff6ff":isUnread?"#fafbff":"transparent",
                    borderLeft:isUnread?"3px solid #0078d4":isActive?"3px solid #93c5fd":"3px solid transparent",
                    display:"flex",gap:8,alignItems:"flex-start",
                  }}
                  onMouseEnter={e=>{if(!isActive)(e.currentTarget as HTMLElement).style.background="#f9fafb";}}
                  onMouseLeave={e=>{if(!isActive)(e.currentTarget as HTMLElement).style.background=isUnread?"#fafbff":"transparent";}}>
                  <div style={{width:30,height:30,borderRadius:"50%",background:isUnread?"#1a3a6b":"#e5e7eb",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{fontSize:11,fontWeight:700,color:isUnread?"#fff":"#6b7280"}}>{senderInitial}</span>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:4,marginBottom:2}}>
                      <span style={{fontSize:12,fontWeight:isUnread?700:500,color:"#111827",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const,flex:1}}>{senderName}</span>
                      <span style={{fontSize:9,color:"#9ca3af",whiteSpace:"nowrap" as const}}>
                        {new Date(email.created_at).toLocaleDateString("en-KE",{month:"short",day:"2-digit"})}
                      </span>
                    </div>
                    <div style={{fontSize:11,fontWeight:isUnread?600:400,color:"#374151",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const,marginBottom:2}}>{email.subject||"(no subject)"}</div>
                    <div style={{fontSize:10,color:"#9ca3af",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{(email.body||"").slice(0,55)}</div>
                    {email.priority&&email.priority!=="normal"&&(
                      <span style={{display:"inline-block",marginTop:3,fontSize:8,fontWeight:700,padding:"1px 5px",borderRadius:3,background:pc.bg,color:pc.color}}>{pc.label}</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── EMAIL READER ── */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:"#fff"}}>
        {selected ? (
          <>
            {/* Reader header */}
            <div style={{padding:"12px 18px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"flex-start",gap:12}}>
              <div style={{flex:1}}>
                <div style={{fontSize:16,fontWeight:800,color:"#111827",marginBottom:4,lineHeight:1.3}}>{selected.subject||"(no subject)"}</div>
                <div style={{fontSize:11,color:"#6b7280",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" as const}}>
                  <span>From: <strong style={{color:"#374151"}}>{selected.from_name||"Unknown"}</strong></span>
                  <span>·</span>
                  <span>To: <strong style={{color:"#374151"}}>{selected.to_name||"You"}</strong></span>
                  <span style={{color:"#9ca3af"}}>{new Date(selected.created_at).toLocaleString("en-KE")}</span>
                </div>
                {selected.priority&&selected.priority!=="normal"&&(
                  <span style={{display:"inline-flex",alignItems:"center",gap:4,marginTop:6,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:4,background:PRIORITY[selected.priority]?.bg,color:PRIORITY[selected.priority]?.color}}>
                    <AlertTriangle style={{width:10,height:10}}/> {PRIORITY[selected.priority]?.label} Priority
                  </span>
                )}
              </div>
              <div style={{display:"flex",gap:6,flexShrink:0}}>
                <button onClick={()=>setReplying(r=>!r)}
                  style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:600,color:"#374151"}}>
                  <Reply style={{width:12,height:12}}/> Reply
                </button>
                <button onClick={()=>setCompose(true)}
                  style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:600,color:"#374151"}}>
                  <Forward style={{width:12,height:12}}/> Forward
                </button>
                <button onClick={()=>deleteEmail(selected.id)}
                  style={{padding:"6px 8px",background:"#fee2e2",border:"1px solid #fecaca",borderRadius:6,cursor:"pointer",color:"#dc2626",lineHeight:0}}>
                  <Trash2 style={{width:12,height:12}}/>
                </button>
              </div>
            </div>

            {/* Email body */}
            <div style={{flex:1,padding:"20px 24px",overflowY:"auto"}}>
              <pre style={{fontFamily:"'Inter','Segoe UI',sans-serif",fontSize:13,lineHeight:1.8,color:"#374151",whiteSpace:"pre-wrap" as const,wordBreak:"break-word" as const}}>{selected.body}</pre>
            </div>

            {/* Reply box */}
            {replying && (
              <div style={{borderTop:"1px solid #e5e7eb",padding:"12px 18px",background:"#f9fafb",flexShrink:0}}>
                <div style={{fontSize:11,fontWeight:700,color:"#374151",marginBottom:6}}>Reply to {selected.from_name}</div>
                <textarea value={replyBody} onChange={e=>setReplyBody(e.target.value)} rows={4}
                  placeholder="Write your reply…"
                  style={{width:"100%",padding:"8px 10px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:6,outline:"none",fontFamily:"inherit",lineHeight:1.6,resize:"none" as const}}/>
                <div style={{display:"flex",gap:6,marginTop:8}}>
                  <button onClick={sendReply} disabled={sending}
                    style={{display:"flex",alignItems:"center",gap:6,padding:"7px 16px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:700,opacity:sending?0.8:1}}>
                    {sending?<RefreshCw style={{width:11,height:11}} className="animate-spin"/>:<Send style={{width:11,height:11}}/>} Send Reply
                  </button>
                  <button onClick={()=>{setReplying(false);setReplyBody("");}}
                    style={{padding:"7px 12px",background:"#fff",border:"1px solid #e5e7eb",borderRadius:6,cursor:"pointer",fontSize:11,color:"#6b7280"}}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Reader footer */}
            <div style={{padding:"6px 18px",background:"#f9fafb",borderTop:"1px solid #f3f4f6",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
              <span style={{fontSize:9,color:"#9ca3af"}}>Embu Level 5 Hospital · EL5 MediProcure System</span>
              <span style={{fontSize:9,color:"#9ca3af"}}>ID: {selected.id?.slice(0,8)}</span>
            </div>
          </>
        ) : (
          <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14,color:"#9ca3af"}}>
            <div style={{width:64,height:64,borderRadius:16,background:"#f3f4f6",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Mail style={{width:28,height:28,color:"#d1d5db"}}/>
            </div>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"#374151",textAlign:"center"}}>Select an email to read</div>
              <div style={{fontSize:11,color:"#9ca3af",marginTop:4,textAlign:"center"}}>Or compose a new email below</div>
            </div>
            <button onClick={()=>setCompose(true)}
              style={{display:"flex",alignItems:"center",gap:7,padding:"9px 20px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700,boxShadow:"0 2px 8px rgba(26,58,107,0.25)"}}>
              <Edit3 style={{width:13,height:13}}/> Compose New Email
            </button>
            {/* Footer branding */}
            <div style={{position:"absolute",bottom:12,left:0,right:0,textAlign:"center"}}>
              <div style={{fontSize:9,color:"#d1d5db"}}>EL5 MediProcure · Embu Level 5 Hospital · Embu County Government</div>
            </div>
          </div>
        )}
      </div>

      {compose && <ComposeModal onClose={()=>setCompose(false)} onSent={loadEmails} profiles={profiles} user={user} profile={profile}/>}
    </div>
  );
}
