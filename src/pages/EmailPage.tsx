import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { sendNotification } from "@/lib/notify";
import {
  Mail, Send, RefreshCw, X, Search, Star, Archive,
  Reply, Forward, Trash2, Edit3, Inbox, Users, Plus,
  AlertTriangle, CheckCheck, Clock, ChevronDown, Paperclip,
  Tag, Filter, MoreHorizontal, Check, Circle
} from "lucide-react";

interface Email {
  id: string; type?: string; subject: string; body: string;
  from_user_id: string; from_name?: string;
  to_user_id: string; to_name?: string;
  priority: string; status: string;
  created_at: string; is_starred?: boolean;
  record_type?: string; record_id?: string;
  reply_body?: string; replied_at?: string;
}

const PRI: Record<string,{bg:string;color:string;label:string}> = {
  urgent:{bg:"#fee2e2",color:"#dc2626",label:"Urgent"},
  high:  {bg:"#fef3c7",color:"#b45309",label:"High"},
  normal:{bg:"#dbeafe",color:"#1d4ed8",label:"Normal"},
  low:   {bg:"#f3f4f6",color:"#6b7280",label:"Low"},
};

const FOLDERS = [
  {id:"inbox",   label:"Inbox",        icon:Inbox,   color:"#0078d4"},
  {id:"sent",    label:"Sent",         icon:Send,    color:"#107c10"},
  {id:"starred", label:"Starred",      icon:Star,    color:"#f59e0b"},
  {id:"archived",label:"Archived",     icon:Archive, color:"#9ca3af"},
];

const TEMPLATES = [
  {id:"po",    label:"Purchase Order Notice",
   subject:"Purchase Order {{REF}} — Action Required",
   body:"Dear {{NAME}},\n\nPlease find the attached Purchase Order {{REF}} for your review and approval.\n\nTotal Amount: KES {{AMOUNT}}\nDelivery Date: {{DATE}}\nSupplier: {{SUPPLIER}}\n\nKindly confirm receipt and provide the expected processing timeline.\n\nBest regards,\n{{SENDER}}\nProcurement Department\nEmbu Level 5 Hospital"},
  {id:"req",   label:"Requisition Approved",
   subject:"Requisition {{REF}} — Approved",
   body:"Dear {{NAME}},\n\nYour requisition {{REF}} has been reviewed and approved by management.\n\nApproved Amount: KES {{AMOUNT}}\nApproved By: {{APPROVER}}\nDate: {{DATE}}\n\nKindly proceed with the next steps.\n\nBest regards,\n{{SENDER}}"},
  {id:"grn",   label:"Goods Received Notice",
   subject:"Goods Received — LPO {{REF}}",
   body:"Dear {{NAME}},\n\nGoods for Order {{REF}} have been received at the stores and are undergoing inspection.\n\nReceived By: {{RECEIVER}}\nDate: {{DATE}}\nCondition: {{CONDITION}}\n\nPlease confirm for further processing.\n\nBest regards,\n{{SENDER}}"},
  {id:"tender",label:"Tender Invitation",
   subject:"Invitation to Tender — {{REF}}",
   body:"Dear {{NAME}},\n\nYou are hereby invited to submit a bid for Tender {{REF}}.\n\nTitle: {{TENDER_TITLE}}\nClosing Date: {{DATE}}\nEstimated Value: KES {{AMOUNT}}\n\nBidding documents are available from the Procurement Office.\nKindly submit sealed bids before the closing date.\n\nBest regards,\n{{SENDER}}\nHead of Procurement"},
  {id:"pay",   label:"Payment Processed",
   subject:"Payment Notification — {{REF}}",
   body:"Dear {{NAME}},\n\nPayment {{REF}} has been processed and authorized.\n\nAmount: KES {{AMOUNT}}\nDate: {{DATE}}\nPayment Mode: {{MODE}}\n\nPlease confirm receipt at your earliest convenience.\n\nBest regards,\n{{SENDER}}"},
  {id:"remind",label:"Action Reminder",
   subject:"Reminder: {{SUBJECT}} — Action Required",
   body:"Dear {{NAME}},\n\nThis is a polite reminder regarding {{SUBJECT}}.\n\nDeadline: {{DATE}}\n\nPlease take the necessary action at your earliest convenience. If you require any clarification, do not hesitate to contact the Procurement Department.\n\nBest regards,\n{{SENDER}}"},
  {id:"meeting",label:"Meeting Invitation",
   subject:"Meeting Invitation — {{SUBJECT}}",
   body:"Dear {{NAME}},\n\nYou are invited to attend a meeting as follows:\n\nSubject: {{SUBJECT}}\nDate: {{DATE}}\nTime: {{TIME}}\nVenue: {{VENUE}}\nAgenda: {{AGENDA}}\n\nKindly confirm your attendance.\n\nBest regards,\n{{SENDER}}"},
];

/* ── compose modal ── */
function ComposeModal({onClose,onSent,profiles,user,profile}:{onClose:()=>void;onSent:()=>void;profiles:any[];user:any;profile:any}) {
  const [to,       setTo]       = useState<{id:string;name:string;email?:string}[]>([]);
  const [toInput,  setToInput]  = useState("");
  const [subject,  setSubject]  = useState("");
  const [body,     setBody]     = useState("");
  const [priority, setPriority] = useState("normal");
  const [template, setTemplate] = useState("");
  const [sending,  setSending]  = useState(false);
  const [showDrop, setShowDrop] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const applyTemplate = (tid:string) => {
    const t=TEMPLATES.find(x=>x.id===tid); if(!t) return;
    setSubject(t.subject);
    setBody(t.body.replace(/\{\{SENDER\}\}/g, profile?.full_name||"Procurement Staff"));
    setTemplate(tid);
  };

  const addRecipient = (p:{id:string;full_name:string;email?:string}) => {
    if(!to.find(x=>x.id===p.id)) setTo(prev=>[...prev,{id:p.id,name:p.full_name,email:p.email}]);
    setToInput(""); setShowDrop(false);
  };

  const suggestions = toInput.length>0
    ? profiles.filter(p=>p.id!==user?.id && !to.find(x=>x.id===p.id) &&
        ((p.full_name||"").toLowerCase().includes(toInput.toLowerCase())||(p.email||"").toLowerCase().includes(toInput.toLowerCase()))
      ).slice(0,7)
    : [];

  const send = async() => {
    if(!to.length){toast({title:"Add at least one recipient",variant:"destructive"});return;}
    if(!subject.trim()){toast({title:"Subject is required",variant:"destructive"});return;}
    setSending(true);
    try {
      // Insert inbox_item per recipient (inbox copy)
      for(const r of to){
        const{error}=await(supabase as any).from("inbox_items").insert({
          type:"email", subject, body,
          from_user_id:user?.id, to_user_id:r.id,
          priority, status:"unread", record_type:"email",
        });
        if(error) throw error;

        // Send notification to recipient
        await sendNotification({
          userId: r.id,
          title: `New email: ${subject.slice(0,60)}`,
          message: `From ${profile?.full_name||"Staff"}: ${body.slice(0,100)}`,
          type: "email",
          module: "Email",
          actionUrl: "/inbox",
          senderId: user?.id,
        });
      }
      // Insert sent copy for sender
      await(supabase as any).from("inbox_items").insert({
        type:"email", subject, body,
        from_user_id:user?.id, to_user_id:user?.id,
        priority, status:"sent", record_type:"email",
      });

      toast({title:"✓ Email sent",description:`To: ${to.map(x=>x.name).join(", ")}`});
      onSent(); onClose();
    } catch(e:any){
      toast({title:"Send failed",description:e.message,variant:"destructive"});
    }
    setSending(false);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"#fff",borderRadius:12,width:"min(640px,100%)",maxHeight:"92vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 72px rgba(0,0,0,0.28)"}}>
        <div style={{padding:"13px 16px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",borderRadius:"12px 12px 0 0",display:"flex",alignItems:"center",gap:10}}>
          <Edit3 style={{width:15,height:15,color:"#fff"}}/>
          <span style={{fontSize:14,fontWeight:800,color:"#fff",flex:1}}>Compose New Email</span>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.18)",border:"none",borderRadius:6,padding:"4px 7px",cursor:"pointer",color:"#fff",lineHeight:0}}>
            <X style={{width:13,height:13}}/>
          </button>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:16,display:"flex",flexDirection:"column",gap:12}}>
          {/* Template picker */}
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:11,fontWeight:700,color:"#9ca3af",whiteSpace:"nowrap" as const}}>TEMPLATE</span>
            <select value={template} onChange={e=>applyTemplate(e.target.value)}
              style={{flex:1,fontSize:12,padding:"6px 10px",border:"1px solid #e5e7eb",borderRadius:7,outline:"none",background:"#f9fafb",color:"#374151"}}>
              <option value="">— Select a template —</option>
              {TEMPLATES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>

          {/* To field */}
          <div style={{position:"relative"}} ref={dropRef}>
            <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>To</label>
            <div style={{border:"1px solid #e5e7eb",borderRadius:7,padding:"6px 10px",background:"#f9fafb",display:"flex",flexWrap:"wrap" as const,gap:5,alignItems:"center",minHeight:42,cursor:"text"}}
              onClick={()=>document.getElementById("to-inp")?.focus()}>
              {to.map(r=>(
                <span key={r.id} style={{display:"inline-flex",alignItems:"center",gap:4,background:"#1a3a6b",color:"#fff",padding:"3px 9px",borderRadius:5,fontSize:12,fontWeight:600}}>
                  {r.name}
                  <X style={{width:10,height:10,cursor:"pointer",opacity:0.7}} onClick={()=>setTo(p=>p.filter(x=>x.id!==r.id))}/>
                </span>
              ))}
              <input id="to-inp" value={toInput}
                onChange={e=>{setToInput(e.target.value);setShowDrop(e.target.value.length>0);}}
                onKeyDown={e=>{if(e.key==="Escape"){setToInput("");setShowDrop(false);}}}
                placeholder={to.length===0?"Search by name or email…":""}
                style={{flex:1,minWidth:160,border:"none",outline:"none",background:"transparent",fontSize:13,padding:"2px 0"}}/>
            </div>
            {showDrop&&suggestions.length>0&&(
              <div style={{position:"absolute",top:"100%",left:0,right:0,marginTop:3,background:"#fff",border:"1px solid #e5e7eb",borderRadius:8,boxShadow:"0 8px 24px rgba(0,0,0,0.12)",zIndex:200,maxHeight:220,overflowY:"auto"}}>
                {suggestions.map(p=>(
                  <button key={p.id} onClick={()=>addRecipient(p)}
                    style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"9px 14px",border:"none",background:"transparent",cursor:"pointer",textAlign:"left" as const}}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f9fafb"}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
                    <div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#1a3a6b,#0078d4)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <span style={{fontSize:11,color:"#fff",fontWeight:700}}>{(p.full_name||"?")[0]}</span>
                    </div>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:"#111827"}}>{p.full_name}</div>
                      <div style={{fontSize:10,color:"#9ca3af"}}>{p.email}{p.department?` · ${p.department}`:""}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Subject + Priority */}
          <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:10}}>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>Subject</label>
              <input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Email subject…"
                style={{width:"100%",padding:"9px 12px",fontSize:13,border:"1px solid #e5e7eb",borderRadius:7,outline:"none"}}/>
            </div>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>Priority</label>
              <select value={priority} onChange={e=>setPriority(e.target.value)}
                style={{padding:"9px 12px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:7,outline:"none",background:`${PRI[priority]?.bg}`,color:PRI[priority]?.color,fontWeight:700}}>
                {Object.entries(PRI).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>

          {/* Body */}
          <div style={{flex:1}}>
            <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>Message</label>
            <textarea value={body} onChange={e=>setBody(e.target.value)} rows={11}
              placeholder="Write your message…"
              style={{width:"100%",padding:"11px 13px",fontSize:13,border:"1px solid #e5e7eb",borderRadius:7,outline:"none",fontFamily:"'Inter',sans-serif",lineHeight:1.75,resize:"vertical" as const}}/>
          </div>

          {/* Char count */}
          <div style={{fontSize:10,color:"#9ca3af",textAlign:"right" as const}}>{body.length} characters</div>
        </div>

        <div style={{padding:"10px 16px",borderTop:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:8}}>
          <button onClick={send} disabled={sending||!to.length||!subject}
            style={{display:"flex",alignItems:"center",gap:7,padding:"9px 22px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",color:"#fff",border:"none",borderRadius:8,cursor:sending?"not-allowed":"pointer",fontSize:13,fontWeight:800,boxShadow:"0 3px 10px rgba(26,58,107,0.3)",opacity:sending||!to.length||!subject?0.7:1}}>
            {sending?<RefreshCw style={{width:13,height:13}} className="animate-spin"/>:<Send style={{width:13,height:13}}/>}
            {sending?"Sending…":"Send Email"}
          </button>
          <button onClick={onClose} style={{padding:"9px 16px",background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:8,cursor:"pointer",fontSize:13,color:"#374151"}}>Discard</button>
          <span style={{marginLeft:"auto",fontSize:11,color:"#9ca3af",fontWeight:600}}>{to.length} recipient{to.length!==1?"s":""}</span>
        </div>
      </div>
    </div>
  );
}

/* ── Main ── */
export default function EmailPage() {
  const{user,profile,roles}=useAuth();
  const isAdmin=roles.includes("admin")||roles.includes("procurement_manager");

  const[folder,   setFolder]   =useState("inbox");
  const[emails,   setEmails]   =useState<Email[]>([]);
  const[loading,  setLoading]  =useState(true);
  const[selected, setSelected] =useState<Email|null>(null);
  const[search,   setSearch]   =useState("");
  const[compose,  setCompose]  =useState(false);
  const[profiles, setProfiles] =useState<any[]>([]);
  const[unread,   setUnread]   =useState(0);
  const[replying, setReplying] =useState(false);
  const[replyBody,setReplyBody]=useState("");
  const[sending,  setSending]  =useState(false);
  const[starring, setStarring] =useState(false);
  const[priFilter,setPriFilter]=useState("all");

  const loadEmails=useCallback(async()=>{
    if(!user) return;
    setLoading(true);
    let q=(supabase as any).from("inbox_items").select("*,from_profile:profiles!from_user_id(full_name,email),to_profile:profiles!to_user_id(full_name,email)").order("created_at",{ascending:false}).limit(150);
    if(folder==="inbox")    q=q.eq("to_user_id",user.id).not("status","eq","sent").not("status","eq","archived");
    else if(folder==="sent")     q=q.eq("from_user_id",user.id).eq("status","sent");
    else if(folder==="starred")  q=q.eq("to_user_id",user.id).eq("is_starred",true);
    else if(folder==="archived") q=q.eq("to_user_id",user.id).eq("status","archived");
    else if(folder==="all")      q=(supabase as any).from("inbox_items").select("*,from_profile:profiles!from_user_id(full_name,email),to_profile:profiles!to_user_id(full_name,email)").order("created_at",{ascending:false}).limit(300);
    const{data}=await q;
    // Flatten profile names into flat properties
    const enriched=(data||[]).map((e:any)=>({
      ...e,
      from_name:e.from_profile?.full_name||e.from_name||"System",
      to_name:  e.to_profile?.full_name||e.to_name||"",
    }));
    setEmails(enriched);
    const{count}=await(supabase as any).from("inbox_items").select("id",{count:"exact",head:true}).eq("to_user_id",user.id).eq("status","unread");
    setUnread(count||0);
    setLoading(false);
  },[folder,user,isAdmin]);

  useEffect(()=>{
    (supabase as any).from("profiles").select("id,full_name,email,department").order("full_name").limit(300).then(({data}:any)=>setProfiles(data||[]));
  },[]);

  useEffect(()=>{loadEmails();},[loadEmails]);
  useEffect(()=>{
    if(!user) return;
    const ch=(supabase as any).channel(`email-rt-${user.id}`).on("postgres_changes",{event:"*",schema:"public",table:"inbox_items"},loadEmails).subscribe();
    return()=>(supabase as any).removeChannel(ch);
  },[loadEmails,user]);

  const markRead=async(id:string)=>{
    await(supabase as any).from("inbox_items").update({status:"read"}).eq("id",id);
    setEmails(p=>p.map(e=>e.id===id?{...e,status:"read"}:e));
    setUnread(p=>Math.max(0,p-1));
  };

  const toggleStar=async(id:string,current:boolean)=>{
    setStarring(true);
    await(supabase as any).from("inbox_items").update({is_starred:!current}).eq("id",id);
    setEmails(p=>p.map(e=>e.id===id?{...e,is_starred:!current}:e));
    if(selected?.id===id) setSelected(p=>p?{...p,is_starred:!current}:p);
    setStarring(false);
  };

  const archiveEmail=async(id:string)=>{
    await(supabase as any).from("inbox_items").update({status:"archived"}).eq("id",id);
    toast({title:"Archived"}); setSelected(null); loadEmails();
  };

  const deleteEmail=async(id:string)=>{
    if(!confirm("Permanently delete this email?")) return;
    await(supabase as any).from("inbox_items").delete().eq("id",id);
    toast({title:"Deleted"}); setSelected(null); loadEmails();
  };

  const markAllRead=async()=>{
    await(supabase as any).from("inbox_items").update({status:"read"}).eq("to_user_id",user?.id).eq("status","unread");
    toast({title:"All marked as read"}); loadEmails();
  };

  const sendReply=async()=>{
    if(!replyBody.trim()||!selected) return;
    setSending(true);
    const{error}=await(supabase as any).from("inbox_items").insert({
      type:"email", subject:`Re: ${selected.subject}`,
      body:replyBody,
      from_user_id:user?.id, to_user_id:selected.from_user_id,
      priority:"normal", status:"unread", record_type:"email",
    });
    if(error){toast({title:"Reply failed",description:error.message,variant:"destructive"});setSending(false);return;}
    // Notification to original sender
    await sendNotification({
      userId:selected.from_user_id,
      title:`Reply: ${selected.subject.slice(0,60)}`,
      message:`${profile?.full_name||"Staff"} replied: ${replyBody.slice(0,80)}`,
      type:"email", module:"Email", actionUrl:"/inbox", senderId:user?.id,
    });
    // Sent copy
    await(supabase as any).from("inbox_items").insert({
      type:"email", subject:`Re: ${selected.subject}`, body:replyBody,
      from_user_id:user?.id, to_user_id:user?.id,
      priority:"normal", status:"sent", record_type:"email",
    });
    toast({title:"Reply sent ✓"}); setReplying(false); setReplyBody(""); setSending(false);
  };

  const filtered=emails.filter(e=>{
    const textMatch=!search||[e.subject,e.from_name,e.to_name,e.body].some(v=>String(v||"").toLowerCase().includes(search.toLowerCase()));
    const priMatch=priFilter==="all"||e.priority===priFilter;
    return textMatch&&priMatch;
  });

  const folderMeta=FOLDERS.find(f=>f.id===folder)||FOLDERS[0];

  return (
    <div style={{display:"flex",height:"calc(100vh - 82px)",fontFamily:"'Inter','Segoe UI',sans-serif",background:"#f0f2f5"}}>

      {/* ── SIDEBAR ── */}
      <div style={{width:220,background:"#fff",borderRight:"1px solid #e5e7eb",display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{padding:"12px 12px 8px",borderBottom:"1px solid #f3f4f6"}}>
          <button onClick={()=>setCompose(true)}
            style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"10px 0",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:800,boxShadow:"0 3px 10px rgba(26,58,107,0.25)"}}>
            <Edit3 style={{width:14,height:14}}/> Compose
          </button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"6px 0"}}>
          {FOLDERS.map(f=>(
            <button key={f.id} onClick={()=>{setFolder(f.id);setSelected(null);setReplying(false);}}
              style={{display:"flex",alignItems:"center",gap:9,width:"100%",padding:"9px 14px",border:"none",cursor:"pointer",textAlign:"left" as const,background:folder===f.id?`${f.color}10`:"transparent",borderLeft:folder===f.id?`3px solid ${f.color}`:"3px solid transparent",transition:"all 0.1s"}}>
              <f.icon style={{width:14,height:14,color:folder===f.id?f.color:"#9ca3af"}}/>
              <span style={{fontSize:13,fontWeight:folder===f.id?700:500,color:folder===f.id?f.color:"#374151",flex:1}}>{f.label}</span>
              {f.id==="inbox"&&unread>0&&<span style={{background:f.color,color:"#fff",fontSize:10,fontWeight:800,padding:"1px 7px",borderRadius:10,minWidth:20,textAlign:"center" as const}}>{unread}</span>}
            </button>
          ))}
          {isAdmin&&(
            <>
              <div style={{margin:"8px 14px",borderTop:"1px solid #f3f4f6"}}/>
              <div style={{padding:"4px 14px",fontSize:10,fontWeight:700,color:"#9ca3af",letterSpacing:"0.08em",textTransform:"uppercase" as const}}>ADMIN VIEW</div>
              <button onClick={()=>{setFolder("all");setSelected(null);}}
                style={{display:"flex",alignItems:"center",gap:9,width:"100%",padding:"9px 14px",border:"none",cursor:"pointer",textAlign:"left" as const,background:folder==="all"?"#1a3a6b10":"transparent",borderLeft:folder==="all"?"3px solid #1a3a6b":"3px solid transparent"}}>
                <Users style={{width:14,height:14,color:folder==="all"?"#1a3a6b":"#9ca3af"}}/>
                <span style={{fontSize:13,fontWeight:folder==="all"?700:500,color:folder==="all"?"#1a3a6b":"#374151"}}>All Messages</span>
              </button>
            </>
          )}
        </div>
        <div style={{padding:"8px 14px",borderTop:"1px solid #f3f4f6",background:"#f9fafb",fontSize:10,color:"#9ca3af"}}>
          <div style={{fontWeight:600}}>EL5 MediProcure</div>
          <div style={{fontSize:9,color:"#d1d5db"}}>Embu Level 5 Hospital</div>
        </div>
      </div>

      {/* ── EMAIL LIST ── */}
      <div style={{width:320,background:"#fff",borderRight:"1px solid #e5e7eb",display:"flex",flexDirection:"column",flexShrink:0}}>
        {/* List toolbar */}
        <div style={{padding:"9px 12px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
          <span style={{fontSize:13,fontWeight:700,color:"#111827",flex:1}}>{folderMeta.label}</span>
          {unread>0&&folder==="inbox"&&(
            <button onClick={markAllRead} style={{fontSize:10,fontWeight:700,color:"#1d4ed8",background:"#dbeafe",border:"none",padding:"2px 8px",borderRadius:4,cursor:"pointer",display:"flex",alignItems:"center",gap:3}}>
              <CheckCheck style={{width:10,height:10}}/> All read
            </button>
          )}
          <button onClick={loadEmails} style={{background:"transparent",border:"none",cursor:"pointer",color:"#9ca3af",lineHeight:0,padding:4}}>
            <RefreshCw style={{width:12,height:12}} className={loading?"animate-spin":""}/>
          </button>
        </div>
        {/* Search */}
        <div style={{padding:"7px 10px",borderBottom:"1px solid #f3f4f6",display:"flex",gap:6,flexShrink:0}}>
          <div style={{flex:1,position:"relative"}}>
            <Search style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",width:11,height:11,color:"#9ca3af"}}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…"
              style={{width:"100%",paddingLeft:26,padding:"7px 10px 7px 26px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:6,outline:"none",background:"#f9fafb"}}/>
          </div>
          <select value={priFilter} onChange={e=>setPriFilter(e.target.value)}
            style={{fontSize:11,padding:"6px 8px",border:"1px solid #e5e7eb",borderRadius:6,outline:"none",background:"#f9fafb",color:"#374151"}}>
            <option value="all">All</option>
            {Object.entries(PRI).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        {/* Items */}
        <div style={{flex:1,overflowY:"auto"}}>
          {loading?[1,2,3,4].map(i=>(
            <div key={i} style={{padding:"11px 12px",borderBottom:"1px solid #f9fafb",display:"flex",gap:8}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:"#f3f4f6",flexShrink:0}} className="animate-pulse"/>
              <div style={{flex:1}}><div style={{height:11,background:"#f3f4f6",borderRadius:4,marginBottom:5,width:"65%"}} className="animate-pulse"/><div style={{height:9,background:"#f3f4f6",borderRadius:4,width:"45%"}} className="animate-pulse"/></div>
            </div>
          )):filtered.length===0?(
            <div style={{padding:32,textAlign:"center" as const,color:"#9ca3af",fontSize:13}}>
              <Mail style={{width:32,height:32,color:"#e5e7eb",margin:"0 auto 10px"}}/>
              No emails found
            </div>
          ):filtered.map(email=>{
            const isUnread=email.status==="unread";
            const isActive=selected?.id===email.id;
            const name=folder==="sent"?(email.to_name||"Recipient"):(email.from_name||"System");
            const initial=name[0]?.toUpperCase()||"?";
            const pc=PRI[email.priority||"normal"];
            return (
              <div key={email.id}
                onClick={()=>{setSelected(email);setReplying(false);if(isUnread)markRead(email.id);}}
                style={{padding:"10px 12px",borderBottom:"1px solid #f9fafb",cursor:"pointer",transition:"background 0.1s",background:isActive?"#eff6ff":isUnread?"#fafcff":"transparent",borderLeft:isActive?"3px solid #1a3a6b":isUnread?"3px solid #60a5fa":"3px solid transparent",display:"flex",gap:9,alignItems:"flex-start"}}
                onMouseEnter={e=>{if(!isActive)(e.currentTarget as HTMLElement).style.background="#f9fafb";}}
                onMouseLeave={e=>{if(!isActive)(e.currentTarget as HTMLElement).style.background=isUnread?"#fafcff":"transparent";}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:isUnread?"linear-gradient(135deg,#1a3a6b,#0078d4)":"#e5e7eb",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <span style={{fontSize:12,fontWeight:700,color:isUnread?"#fff":"#6b7280"}}>{initial}</span>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",gap:4,marginBottom:2}}>
                    <span style={{fontSize:13,fontWeight:isUnread?700:500,color:"#111827",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const,flex:1}}>{name}</span>
                    <span style={{fontSize:10,color:"#9ca3af",whiteSpace:"nowrap" as const,flexShrink:0}}>{new Date(email.created_at).toLocaleDateString("en-KE",{month:"short",day:"2-digit"})}</span>
                  </div>
                  <div style={{fontSize:12,fontWeight:isUnread?600:400,color:"#374151",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const,marginBottom:2}}>{email.subject||"(no subject)"}</div>
                  <div style={{fontSize:11,color:"#9ca3af",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{(email.body||"").replace(/\n/g," ").slice(0,55)}</div>
                  <div style={{display:"flex",gap:5,marginTop:4,alignItems:"center"}}>
                    {email.priority&&email.priority!=="normal"&&<span style={{fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:3,background:pc.bg,color:pc.color}}>{pc.label}</span>}
                    {email.is_starred&&<Star style={{width:10,height:10,color:"#f59e0b",fill:"#f59e0b"}}/>}
                    {isUnread&&<span style={{fontSize:9,fontWeight:700,color:"#0078d4",background:"#dbeafe",padding:"1px 5px",borderRadius:3}}>NEW</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── READER ── */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:"#fff"}}>
        {selected?(
          <>
            <div style={{padding:"13px 18px",borderBottom:"1px solid #f3f4f6",flexShrink:0}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:8}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:17,fontWeight:800,color:"#111827",lineHeight:1.3,marginBottom:5}}>{selected.subject||"(no subject)"}</div>
                  <div style={{fontSize:12,color:"#6b7280",display:"flex",gap:10,flexWrap:"wrap" as const}}>
                    <span>From: <strong style={{color:"#374151"}}>{selected.from_name}</strong></span>
                    <span>·</span>
                    <span>To: <strong style={{color:"#374151"}}>{selected.to_name||"You"}</strong></span>
                    <span style={{color:"#9ca3af"}}>{new Date(selected.created_at).toLocaleString("en-KE",{dateStyle:"medium",timeStyle:"short"})}</span>
                  </div>
                  {selected.priority&&selected.priority!=="normal"&&(
                    <span style={{display:"inline-flex",alignItems:"center",gap:4,marginTop:6,fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:5,...PRI[selected.priority]}}>
                      <AlertTriangle style={{width:11,height:11}}/>{PRI[selected.priority].label} Priority
                    </span>
                  )}
                </div>
                <div style={{display:"flex",gap:6,flexShrink:0,flexWrap:"wrap" as const}}>
                  <button onClick={()=>toggleStar(selected.id,!!selected.is_starred)}
                    style={{padding:"6px 9px",background:selected.is_starred?"#fef3c7":"#f3f4f6",border:`1px solid ${selected.is_starred?"#fde68a":"#e5e7eb"}`,borderRadius:6,cursor:"pointer",lineHeight:0}}>
                    <Star style={{width:13,height:13,color:selected.is_starred?"#f59e0b":"#9ca3af",fill:selected.is_starred?"#f59e0b":"none"}}/>
                  </button>
                  <button onClick={()=>{setReplying(r=>!r);setReplyBody("");}}
                    style={{display:"flex",alignItems:"center",gap:5,padding:"6px 13px",background:replying?"#1a3a6b":"#f3f4f6",border:`1px solid ${replying?"#1a3a6b":"#e5e7eb"}`,borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:700,color:replying?"#fff":"#374151"}}>
                    <Reply style={{width:13,height:13}}/> Reply
                  </button>
                  <button onClick={()=>{setCompose(true);}}
                    style={{display:"flex",alignItems:"center",gap:5,padding:"6px 13px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600,color:"#374151"}}>
                    <Forward style={{width:13,height:13}}/> Forward
                  </button>
                  <button onClick={()=>archiveEmail(selected.id)}
                    style={{padding:"6px 9px",background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:6,cursor:"pointer",lineHeight:0}}>
                    <Archive style={{width:13,height:13,color:"#9ca3af"}}/>
                  </button>
                  <button onClick={()=>deleteEmail(selected.id)}
                    style={{padding:"6px 9px",background:"#fee2e2",border:"1px solid #fecaca",borderRadius:6,cursor:"pointer",lineHeight:0}}>
                    <Trash2 style={{width:13,height:13,color:"#dc2626"}}/>
                  </button>
                </div>
              </div>
            </div>

            {/* Body */}
            <div style={{flex:1,padding:"22px 26px",overflowY:"auto"}}>
              <pre style={{fontFamily:"'Inter','Segoe UI',sans-serif",fontSize:14,lineHeight:1.85,color:"#374151",whiteSpace:"pre-wrap" as const,wordBreak:"break-word" as const,margin:0}}>{selected.body}</pre>
              {selected.reply_body&&(
                <div style={{marginTop:24,paddingTop:16,borderTop:"1px dashed #e5e7eb"}}>
                  <div style={{fontSize:11,color:"#9ca3af",marginBottom:8,display:"flex",alignItems:"center",gap:5}}>
                    <Reply style={{width:11,height:11}}/> Previous reply · {selected.replied_at&&new Date(selected.replied_at).toLocaleDateString("en-KE")}
                  </div>
                  <pre style={{fontFamily:"'Inter',sans-serif",fontSize:13,lineHeight:1.75,color:"#6b7280",whiteSpace:"pre-wrap" as const,background:"#f9fafb",padding:"12px 16px",borderRadius:8,borderLeft:"3px solid #e5e7eb"}}>{selected.reply_body}</pre>
                </div>
              )}
            </div>

            {/* Reply box */}
            {replying&&(
              <div style={{borderTop:"2px solid #e5e7eb",padding:"14px 18px",background:"#f9fafb",flexShrink:0}}>
                <div style={{fontSize:12,fontWeight:700,color:"#374151",marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
                  <Reply style={{width:13,height:13,color:"#1a3a6b"}}/> Reply to {selected.from_name}
                </div>
                <textarea value={replyBody} onChange={e=>setReplyBody(e.target.value)} rows={5}
                  placeholder="Write your reply…"
                  style={{width:"100%",padding:"10px 12px",fontSize:13,border:"1px solid #e5e7eb",borderRadius:7,outline:"none",fontFamily:"'Inter',sans-serif",lineHeight:1.7,resize:"none" as const}}/>
                <div style={{display:"flex",gap:7,marginTop:8}}>
                  <button onClick={sendReply} disabled={sending||!replyBody.trim()}
                    style={{display:"flex",alignItems:"center",gap:6,padding:"8px 18px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:13,fontWeight:700,opacity:sending||!replyBody.trim()?0.7:1}}>
                    {sending?<RefreshCw style={{width:12,height:12}} className="animate-spin"/>:<Send style={{width:12,height:12}}/>} Send Reply
                  </button>
                  <button onClick={()=>{setReplying(false);setReplyBody("");}}
                    style={{padding:"8px 14px",background:"#fff",border:"1px solid #e5e7eb",borderRadius:7,cursor:"pointer",fontSize:13,color:"#6b7280"}}>Cancel</button>
                  <span style={{marginLeft:"auto",fontSize:11,color:"#9ca3af",alignSelf:"center"}}>{replyBody.length} chars</span>
                </div>
              </div>
            )}

            <div style={{padding:"5px 18px",background:"#f9fafb",borderTop:"1px solid #f3f4f6",display:"flex",justifyContent:"space-between",flexShrink:0,fontSize:10,color:"#d1d5db"}}>
              <span>Embu Level 5 Hospital · EL5 MediProcure</span>
              <span>ID:{selected.id?.slice(0,8)} · {selected.status}</span>
            </div>
          </>
        ):(
          <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,color:"#9ca3af"}}>
            <div style={{width:72,height:72,borderRadius:18,background:"#f3f4f6",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Mail style={{width:32,height:32,color:"#d1d5db"}}/>
            </div>
            <div style={{textAlign:"center" as const}}>
              <div style={{fontSize:16,fontWeight:700,color:"#374151"}}>Select an email</div>
              <div style={{fontSize:13,color:"#9ca3af",marginTop:4}}>Click any message to read it</div>
            </div>
            <button onClick={()=>setCompose(true)}
              style={{display:"flex",alignItems:"center",gap:8,padding:"10px 24px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",color:"#fff",border:"none",borderRadius:9,cursor:"pointer",fontSize:13,fontWeight:800,boxShadow:"0 3px 12px rgba(26,58,107,0.28)"}}>
              <Edit3 style={{width:14,height:14}}/> Compose New Email
            </button>
          </div>
        )}
      </div>

      {compose&&<ComposeModal onClose={()=>setCompose(false)} onSent={loadEmails} profiles={profiles} user={user} profile={profile}/>}
    </div>
  );
}
