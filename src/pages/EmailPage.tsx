import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { sendNotification } from "@/lib/notify";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import procBg from "@/assets/procurement-bg.jpg";
import logoImg from "@/assets/logo.png";
import {
  Mail, Send, RefreshCw, X, Search, Star, Archive, Reply,
  Trash2, Edit3, Inbox, Users, Plus, AlertTriangle, CheckCircle,
  Paperclip, ChevronRight, Eye, EyeOff, FileText, Settings,
  Activity, CornerUpLeft, Forward, Volume2, VolumeX, Copy,
  MoveRight, Flag, Folder, FolderPlus, Shield, Package, DollarSign,
  Gavel, Layers, BarChart3, Clock
} from "lucide-react";

/* ── Types ──────────────────────────────────────────────────── */
interface Msg {
  id:string; dbId:string; source:"inbox"|"notification";
  type:string; subject:string; body:string;
  from_user_id?:string; from_name?:string; from_email?:string;
  to_user_id?:string; to_email?:string;
  priority:string; status:string; is_read:boolean; is_starred:boolean;
  thread_id?:string; module?:string; action_url?:string; created_at:string;
}
interface CtxMenu { x:number; y:number; msg:Msg; }

/* ── Helpers ─────────────────────────────────────────────────── */
const TYPE_COLOR:Record<string,string>={
  email:"#0078d4",procurement:"#0078d4",grn:"#107c10",voucher:"#C45911",
  tender:"#1F6090",quality:"#498205",system:"#6b7280",info:"#0078d4",
  warning:"#d97706",error:"#dc2626",success:"#107c10",default:"#6b7280",
};
function msgColor(t:string){ return TYPE_COLOR[t]||TYPE_COLOR.default; }
function timeStr(d:string){
  const dt=new Date(d),diff=(Date.now()-dt.getTime())/1000;
  if(diff<3600) return `${Math.floor(diff/60)}m ago`;
  if(diff<86400) return dt.toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit"});
  if(diff<604800) return dt.toLocaleDateString("en-KE",{weekday:"short"});
  return dt.toLocaleDateString("en-KE",{day:"numeric",month:"short"});
}
function initials(n?:string){ return(n||"?").split(" ").map(p=>p[0]).join("").slice(0,2).toUpperCase(); }
function avatarBg(n?:string){
  const cols=["#0078d4","#C45911","#107c10","#7c3aed","#0369a1","#498205","#d97706","#dc2626"];
  let h=0; for(const c of(n||"?")) h=(h*31+c.charCodeAt(0))%cols.length;
  return cols[h];
}

const FOLDERS=[
  {id:"inbox",    label:"Inbox",    icon:Inbox,   },
  {id:"unread",   label:"Unread",   icon:Mail,    },
  {id:"starred",  label:"Starred",  icon:Star,    },
  {id:"sent",     label:"Sent",     icon:Send,    },
  {id:"deleted",  label:"Deleted",  icon:Trash2,  },
];

/* ── Component ───────────────────────────────────────────────── */
export default function EmailPage() {
  const { user, profile } = useAuth();
  const { get: getSetting } = useSystemSettings();

  const [folder,      setFolder]      = useState("inbox");
  const [msgs,        setMsgs]        = useState<Msg[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [selected,    setSelected]    = useState<Msg|null>(null);
  const [search,      setSearch]      = useState("");
  const [tab,         setTab]         = useState<"all"|"read"|"unread">("all");
  const [ctx,         setCtx]         = useState<CtxMenu|null>(null);
  const [composing,   setComposing]   = useState(false);
  const [compose,     setCompose]     = useState({to:"",cc:"",subject:"",body:"",priority:"normal"});
  const [sending,     setSending]     = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [replyMode,   setReplyMode]   = useState(false);
  const [replyBody,   setReplyBody]   = useState("");
  const [starredIds,  setStarredIds]  = useState<Set<string>>(new Set());
  const [deletedIds,  setDeletedIds]  = useState<Set<string>>(new Set());
  const [smtpStatus,  setSmtpStatus]  = useState<{mode:string;provider:string;ready:boolean}|null>(null);
  const ctxRef = useRef<HTMLDivElement>(null);

  /* ── SMTP status ──────────────────────────────────────────── */
  useEffect(()=>{
    (supabase as any).from("system_settings").select("key,value")
      .in("key",["smtp_enabled","smtp_host","smtp_user","smtp_password","email_mode","resend_api_key","sendgrid_api_key","mailgun_api_key"])
      .then(({data}:any)=>{
        const m:Record<string,string>={};
        (data||[]).forEach((r:any)=>{ if(r.key) m[r.key]=r.value||""; });
        const mode = m.email_mode||"internal";
        const hasSmtp = m.smtp_enabled==="true"&&!!m.smtp_host&&!!m.smtp_user&&!!m.smtp_password;
        const hasApi = !!(m.resend_api_key||m.sendgrid_api_key||m.mailgun_api_key);
        const provider = m.resend_api_key?"Resend":m.sendgrid_api_key?"SendGrid":m.mailgun_api_key?"Mailgun":hasSmtp?"SMTP":"Internal";
        setSmtpStatus({ mode, provider, ready: hasSmtp||hasApi });
      }).catch(()=>setSmtpStatus({mode:"internal",provider:"Internal",ready:false}));
  },[]);

  /* ── Load ─────────────────────────────────────────────────── */
  const load = useCallback(async()=>{
    if(!user) return;
    setLoading(true);
    try {
      const [ir,nr] = await Promise.all([
        (supabase as any).from("inbox_items").select("*")
          .or(`to_user_id.eq.${user.id},from_user_id.eq.${user.id}`)
          .order("created_at",{ascending:false}).limit(100),
        (supabase as any).from("notifications").select("*")
          .order("created_at",{ascending:false}).limit(50),
      ]);
      const inbox:Msg[]=(ir.data||[]).map((n:any,i:number)=>({
        id:`i-${n.id||i}`,dbId:n.id||"",source:"inbox" as const,
        type:n.type||"email",subject:n.subject||"(no subject)",body:n.body||"",
        from_user_id:n.from_user_id,from_name:n.from_name||"System",from_email:n.from_email||"",
        to_user_id:n.to_user_id,to_email:n.to_email||"",
        priority:n.priority||"normal",status:n.status||"unread",
        is_read:n.status==="read"||n.status==="replied",
        is_starred:false,thread_id:n.thread_id,module:n.module,action_url:n.action_url,
        created_at:n.created_at||new Date().toISOString(),
      }));
      const notifs:Msg[]=(nr.data||[]).map((n:any,i:number)=>({
        id:`n-${n.id||i}`,dbId:n.id||"",source:"notification" as const,
        type:n.type||"info",subject:n.title||"Notification",body:n.message||"",
        from_name:"System",from_email:"system@el5h.go.ke",
        priority:"normal",status:n.is_read?"read":"unread",
        is_read:!!n.is_read,is_starred:false,module:n.module||n.category,
        created_at:n.created_at||new Date().toISOString(),
      }));
      setMsgs([...inbox,...notifs].sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime()));
    } catch(e){ console.error(e); }
    setLoading(false);
  },[user]);

  useEffect(()=>{ load(); },[load]);

  /* ── Real-time ─────────────────────────────────────────────── */
  useEffect(()=>{
    if(!user) return;
    const ch=(supabase as any).channel(`email-rt-${user.id}`)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"inbox_items"},(p:any)=>{
        const n=p.new as any;
        if(n.to_user_id===user.id||n.from_user_id===user.id) load();
      })
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"notifications"},()=>load())
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"inbox_items"},()=>load())
      .subscribe();
    return ()=>(supabase as any).removeChannel(ch);
  },[user,load]);

  /* ── Context menu close ──────────────────────────────────── */
  useEffect(()=>{
    const h=(e:MouseEvent)=>{ if(ctxRef.current&&!ctxRef.current.contains(e.target as Node)) setCtx(null); };
    document.addEventListener("mousedown",h);
    return ()=>document.removeEventListener("mousedown",h);
  },[]);

  /* ── Filtering ───────────────────────────────────────────── */
  const filtered = msgs.filter(m=>{
    if(deletedIds.has(m.id)) return folder==="deleted";
    if(folder==="deleted") return false;
    if(folder==="starred") return starredIds.has(m.id);
    if(folder==="sent")    return m.source==="inbox"&&m.from_user_id===user?.id;
    if(folder==="unread")  return !m.is_read;
    if(folder==="inbox"){
      if(tab==="read")   return m.is_read;
      if(tab==="unread") return !m.is_read;
      return true;
    }
    return true;
  }).filter(m=>{
    if(!search.trim()) return true;
    const s=search.toLowerCase();
    return m.subject.toLowerCase().includes(s)||m.body.toLowerCase().includes(s)||(m.from_name||"").toLowerCase().includes(s);
  });

  const unreadCount = msgs.filter(m=>!m.is_read&&!deletedIds.has(m.id)).length;

  /* ── Actions ─────────────────────────────────────────────── */
  const markRead = async(msg:Msg)=>{
    if(msg.is_read) return;
    if(msg.source==="inbox") await (supabase as any).from("inbox_items").update({status:"read"}).eq("id",msg.dbId);
    else await (supabase as any).from("notifications").update({is_read:true}).eq("id",msg.dbId);
    setMsgs(p=>p.map(m=>m.id===msg.id?{...m,is_read:true,status:"read"}:m));
  };
  const toggleStar   = (id:string)=>setStarredIds(p=>{const s=new Set(p);s.has(id)?s.delete(id):s.add(id);return s;});
  const deleteMsg    = (id:string)=>{ setDeletedIds(p=>new Set([...p,id])); if(selected?.id===id) setSelected(null); toast({title:"Moved to Deleted"}); };
  const markUnread   = (msg:Msg) =>setMsgs(p=>p.map(m=>m.id===msg.id?{...m,is_read:false,status:"unread"}:m));
  const openMsg      = (msg:Msg) =>{ setSelected(msg); markRead(msg); setCtx(null); setReplyMode(false); setReplyBody(""); };

  /* ── Send reply ──────────────────────────────────────────── */
  const sendReply = async()=>{
    if(!selected||!replyBody.trim()||!user) return;
    setSending(true);
    try {
      const replyTo = selected.from_user_id&&selected.from_user_id!==user.id?selected.from_user_id:selected.to_user_id;
      if(replyTo) await sendNotification({userId:replyTo,title:`Re: ${selected.subject}`,message:replyBody,type:"email",module:"Email",actionUrl:"/email",senderId:user.id});
      await (supabase as any).from("inbox_items").insert({
        subject:`Re: ${selected.subject}`,body:replyBody,
        from_user_id:user.id,from_name:profile?.full_name||"Staff",from_email:profile?.email||user.email,
        to_user_id:replyTo,type:"email",status:"sent",priority:"normal",
        thread_id:selected.thread_id||selected.dbId,module:"Email",
      });
      toast({title:"Reply sent ✓"}); setReplyMode(false); setReplyBody(""); load();
    } catch(e:any){ toast({title:"Failed",description:e.message,variant:"destructive"}); }
    setSending(false);
  };

  /* ── Send composed message ───────────────────────────────── */
  const sendCompose = async(testMode=false)=>{
    const to = testMode ? (profile?.email||user?.email||"") : compose.to.trim();
    if(!to||(!testMode&&!compose.subject.trim())||!user){ toast({title:"Fill recipient and subject",variant:"destructive"}); return; }
    if(testMode) setTestSending(true); else setSending(true);

    try {
      const subject = testMode ? `[TEST] EL5 MediProcure Email Test — ${new Date().toLocaleString("en-KE")}` : compose.subject;
      const body    = testMode ? `This is a test email from EL5 MediProcure.\n\nSent by: ${profile?.full_name||"Staff"}\nTime: ${new Date().toLocaleString("en-KE")}\nMode: ${smtpStatus?.mode||"internal"} via ${smtpStatus?.provider||"Internal"}` : compose.body;

      // 1. Always save to inbox_items (internal delivery — always works)
      const rec = await (supabase as any).from("profiles").select("id,full_name").eq("email",to).maybeSingle();
      if(rec.data) {
        await sendNotification({userId:rec.data.id,title:subject,message:body,type:"email",module:"Email",actionUrl:"/email",senderId:user.id});
      }
      if(!testMode) {
        await (supabase as any).from("inbox_items").insert({
          subject,body,from_user_id:user.id,from_name:profile?.full_name,
          from_email:profile?.email||user.email,to_email:to,
          cc:compose.cc||null,type:"email",status:"sent",
          priority:compose.priority||"normal",module:"Email",
        });
      }

      // 2. External delivery — only if mode = "external" (or internal+external)
      const mode = smtpStatus?.mode || getSetting("email_mode","internal");
      if(mode==="external"||mode==="both") {
        try {
          const smtpRows = await (supabase as any).from("system_settings").select("key,value")
            .in("key",["smtp_host","smtp_port","smtp_user","smtp_password","smtp_from_email","smtp_from_name","smtp_enabled","smtp_security","resend_api_key","sendgrid_api_key","mailgun_api_key","mailgun_domain"]);
          const smtp:Record<string,string>={};
          (smtpRows.data||[]).forEach((r:any)=>{ if(r.key) smtp[r.key]=r.value||""; });

          const { data:fnData, error:fnErr } = await supabase.functions.invoke("send-email",{
            body:{
              to,
              cc: compose.cc||undefined,
              subject,
              body,
              html:`<div style="font-family:'Segoe UI',Arial,sans-serif;font-size:14px;color:#374151;line-height:1.75">${body.replace(/\n/g,"<br/>")}</div><hr style="margin-top:24px;border:none;border-top:1px solid #e5e7eb"/><p style="font-size:11px;color:#9ca3af">Sent via ${getSetting("system_name","EL5 MediProcure")} · ${getSetting("hospital_name","Embu Level 5 Hospital")}</p>`,
              from_name: smtp.smtp_from_name||getSetting("system_name","EL5 MediProcure"),
              smtp: smtp.smtp_enabled==="true"&&smtp.smtp_host ? {
                host:smtp.smtp_host, port:Number(smtp.smtp_port)||587,
                username:smtp.smtp_user, password:smtp.smtp_password,
                from_email:smtp.smtp_from_email||smtp.smtp_user,
                from_name:smtp.smtp_from_name||getSetting("system_name","EL5 MediProcure"),
                encryption:smtp.smtp_security||"tls",
              } : undefined,
            }
          });
          const d = fnData as any;
          if(fnErr||!d?.success) {
            toast({title:testMode?"Test: Internal ✓, External ✗":"Saved internally — external delivery failed",description:fnErr?.message||d?.error||"Check SMTP/API settings",variant:testMode?"destructive":"default"});
          } else {
            toast({title:testMode?`Test sent via ${d.provider||"SMTP"} ✓`:`Email sent via ${d.provider||"SMTP"} ✓`,description:`Delivered to ${to}`});
          }
        } catch(exErr:any){
          toast({title:"External send error",description:exErr.message,variant:"destructive"});
        }
      } else {
        if(testMode) toast({title:"Test: Internal delivery ✓",description:"Enable 'Internal + External' mode in Settings → Email to test real SMTP"});
        else toast({title:"Message sent ✓",description:"Internal delivery complete"});
      }

      if(!testMode){ setComposing(false); setCompose({to:"",cc:"",subject:"",body:"",priority:"normal"}); }
    } catch(e:any){ toast({title:"Send failed",description:e.message,variant:"destructive"}); }
    if(testMode) setTestSending(false); else setSending(false);
  };

  /* ── Shared input style ──────────────────────────────────── */
  const inp:React.CSSProperties={width:"100%",padding:"7px 11px",border:"1px solid #e0e0e0",borderRadius:4,fontSize:13,outline:"none",boxSizing:"border-box" as const,color:"#1f1f1f",background:"#f8fafc",fontFamily:"inherit"};

  /* ── Hover helpers ───────────────────────────────────────── */
  const hoverBg = (e:React.MouseEvent, on:boolean, bg="#f0f0f0") => {
    (e.currentTarget as HTMLElement).style.background = on ? bg : "transparent";
  };

  /* ──────────────────────────────────────────────────────────
      RENDER
  ────────────────────────────────────────────────────────── */
  return (
    <div style={{display:"flex" as const,height:"100%",background:"#f8fafc",fontFamily:"'Segoe UI',system-ui,sans-serif",overflow:"hidden" as const,position:"relative" as const}}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* ── LEFT SIDEBAR ────────────────────────────────────── */}
      <div style={{width:210,flexShrink:0,background:"#f8fafc",borderRight:"1px solid #f1f5f9",display:"flex" as const,flexDirection:"column" as const,height:"100%",overflow:"hidden" as const}}>
        {/* Header */}
        <div style={{padding:"16px 16px 10px",borderBottom:"1px solid #e0e0e0"}}>
          <div style={{display:"flex" as const,alignItems:"center" as const,gap:8,marginBottom:14}}>
            <div style={{width:32,height:32,borderRadius:6,background:"#0078d4",display:"flex" as const,alignItems:"center" as const,justifyContent:"center" as const}}>
              <Mail style={{width:16,height:16,color:"#fff"}}/>
            </div>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"#1f1f1f"}}>Mail & Inbox</div>
              <div style={{fontSize:9.5,color:"#888"}}>{unreadCount>0?`${unreadCount} unread`:"All caught up"}</div>
            </div>
          </div>
          {/* Compose */}
          <button onClick={()=>{ setComposing(true); setSelected(null); }}
            style={{width:"100%",display:"flex" as const,alignItems:"center" as const,justifyContent:"center" as const,gap:7,padding:"8px",borderRadius:4,background:"#0078d4",border:"none",cursor:"pointer" as const,fontSize:12.5,fontWeight:600,color:"#fff"}}>
            <Edit3 style={{width:13,height:13}}/> New Message
          </button>
          {/* SMTP mode badge */}
          {smtpStatus&&(
            <div style={{marginTop:8,padding:"5px 8px",borderRadius:4,background:smtpStatus.ready?"#f0fff0":"#fff8f0",border:`1px solid ${smtpStatus.ready?"#86efac":"#fdba74"}`,display:"flex" as const,alignItems:"center" as const,gap:5}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:smtpStatus.ready?"#16a34a":"#d97706",flexShrink:0}}/>
              <span style={{fontSize:9.5,fontWeight:600,color:smtpStatus.ready?"#15803d":"#92400e",lineHeight:1.3}}>
                {smtpStatus.ready?`${smtpStatus.provider} · ${smtpStatus.mode==="external"||smtpStatus.mode==="both"?"External Active":"Internal + External"}` : "SMTP Off — Internal Only"}
              </span>
            </div>
          )}
        </div>

        {/* Folders */}
        <nav style={{flex:1,overflowY:"auto" as const,padding:"6px 6px 0"}}>
          {FOLDERS.map(f=>{
            const count=f.id==="inbox"?unreadCount:f.id==="starred"?starredIds.size:0;
            const isAct=folder===f.id;
            return (
              <button key={f.id} onClick={()=>{setFolder(f.id);setSelected(null);setComposing(false);}}
                style={{width:"100%",display:"flex" as const,alignItems:"center" as const,gap:9,padding:"8px 10px",borderRadius:4,border:"none",
                  background:isAct?"#e8f0fe":"transparent",cursor:"pointer" as const,textAlign:"left" as const,marginBottom:1,
                  borderLeft:isAct?"2px solid #0078d4":"2px solid transparent"}}
                onMouseEnter={e=>{ if(!isAct)(e.currentTarget as HTMLElement).style.background="#f0f0f0"; }}
                onMouseLeave={e=>{ if(!isAct)(e.currentTarget as HTMLElement).style.background="transparent"; }}>
                <f.icon style={{width:14,height:14,color:isAct?"#0078d4":"#666",flexShrink:0}}/>
                <span style={{flex:1,fontSize:12.5,fontWeight:isAct?600:400,color:isAct?"#0078d4":"#1f1f1f"}}>{f.label}</span>
                {count>0&&<span style={{minWidth:18,height:18,borderRadius:9,background:"#0078d4",color:"#fff",fontSize:9,fontWeight:700,display:"flex" as const,alignItems:"center" as const,justifyContent:"center" as const,padding:"0 4px"}}>{count}</span>}
              </button>
            );
          })}

          <div style={{borderTop:"1px solid #e0e0e0",margin:"8px 4px",paddingTop:8}}>
            <div style={{fontSize:9.5,fontWeight:700,color:"#888",letterSpacing:"0.07em",textTransform:"uppercase" as const,padding:"0 6px 6px"}}>System Folders</div>
            {[{id:"procurement",label:"Procurement",icon:Layers},{id:"system",label:"System Alerts",icon:Shield}].map(f=>{
              const isAct=folder===f.id;
              return (
                <button key={f.id} onClick={()=>{setFolder(f.id);setSelected(null);setComposing(false);}}
                  style={{width:"100%",display:"flex" as const,alignItems:"center" as const,gap:9,padding:"7px 10px",borderRadius:4,border:"none",
                    background:isAct?"#e8f0fe":"transparent",cursor:"pointer" as const,textAlign:"left" as const,marginBottom:1}}
                  onMouseEnter={e=>{ if(!isAct)(e.currentTarget as HTMLElement).style.background="#f0f0f0"; }}
                  onMouseLeave={e=>{ if(!isAct)(e.currentTarget as HTMLElement).style.background="transparent"; }}>
                  <f.icon style={{width:13,height:13,color:"#888",flexShrink:0}}/>
                  <span style={{fontSize:12.5,color:"#555"}}>{f.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* User strip */}
        <div style={{padding:"10px 16px",borderTop:"1px solid #e0e0e0",display:"flex" as const,alignItems:"center" as const,gap:8}}>
          <div style={{width:26,height:26,borderRadius:"50%",background:avatarBg(profile?.full_name),display:"flex" as const,alignItems:"center" as const,justifyContent:"center" as const,fontSize:9.5,fontWeight:700,color:"#fff",flexShrink:0}}>{initials(profile?.full_name)}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:11,fontWeight:600,color:"#1f1f1f",overflow:"hidden" as const,textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{profile?.full_name||"User"}</div>
            <div style={{fontSize:9,color:"#888",overflow:"hidden" as const,textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{profile?.email||""}</div>
          </div>
        </div>
      </div>

      {/* ── MIDDLE: Message list ──────────────────────────────── */}
      <div style={{width:300,flexShrink:0,borderRight:"1px solid #e0e0e0",display:"flex" as const,flexDirection:"column" as const,background:"#fff",height:"100%",overflow:"hidden" as const}}>
        {/* Header + search */}
        <div style={{padding:"12px 14px 8px",borderBottom:"1px solid #e0e0e0"}}>
          <div style={{display:"flex" as const,alignItems:"center" as const,justifyContent:"space-between" as const,marginBottom:10}}>
            <h2 style={{fontSize:14,fontWeight:700,color:"#1f1f1f",margin:0}}>{FOLDERS.find(f=>f.id===folder)?.label||folder}</h2>
            <div style={{display:"flex" as const,gap:2}}>
              <button onClick={load}
                style={{padding:5,borderRadius:4,border:"none",background:"#f8fafc",cursor:"pointer" as const,lineHeight:0}}
                onMouseEnter={e=>hoverBg(e,true)}
                onMouseLeave={e=>hoverBg(e,false)}>
                <RefreshCw style={{width:13,height:13,color:"#666",animation:loading?"spin 1s linear infinite":undefined}}/>
              </button>
              <button onClick={()=>{ setComposing(true); setSelected(null); }}
                style={{padding:5,borderRadius:4,border:"none",background:"#f8fafc",cursor:"pointer" as const,lineHeight:0}}
                onMouseEnter={e=>hoverBg(e,true)}
                onMouseLeave={e=>hoverBg(e,false)}>
                <Plus style={{width:13,height:13,color:"#666"}}/>
              </button>
            </div>
          </div>
          {/* Search */}
          <div style={{position:"relative" as const}}>
            <Search style={{position:"absolute" as const,left:8,top:"50%",transform:"translateY(-50%)",width:12,height:12,color:"#999"}}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search messages…"
              style={{...inp,paddingLeft:28,height:30,fontSize:12,background:"#f5f5f5",border:"1px solid #e0e0e0"}}/>
            {search&&<button onClick={()=>setSearch("")} style={{position:"absolute" as const,right:6,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer" as const,lineHeight:0}}>
              <X style={{width:11,height:11,color:"#999"}}/>
            </button>}
          </div>
          {/* Tabs */}
          {folder==="inbox"&&(
            <div style={{display:"flex" as const,gap:0,marginTop:8,borderBottom:"2px solid #e0e0e0"}}>
              {(["all","unread","read"] as const).map(t=>(
                <button key={t} onClick={()=>setTab(t)}
                  style={{padding:"5px 12px",fontSize:11.5,fontWeight:tab===t?700:400,border:"none",background:"#f8fafc",
                    cursor:"pointer" as const,color:tab===t?"#0078d4":"#555",
                    borderBottom:tab===t?"2px solid #0078d4":"2px solid transparent",
                    marginBottom:-2,transition:"all 0.12s"}}>
                  {t.charAt(0).toUpperCase()+t.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Messages */}
        <div style={{flex:1,overflowY:"auto" as const}}>
          {loading&&<div style={{display:"flex" as const,alignItems:"center" as const,justifyContent:"center" as const,padding:"28px",gap:8,color:"#999",fontSize:12}}>
            <RefreshCw style={{width:13,height:13,animation:"spin 1s linear infinite"}}/>Loading…
          </div>}
          {!loading&&filtered.length===0&&<div style={{textAlign:"center" as const,padding:"40px 16px",color:"#999"}}>
            <Mail style={{width:32,height:32,margin:"0 auto 10px",color:"#e0e0e0"}}/><div style={{fontSize:13,fontWeight:600,color:"#555"}}>No messages</div>
          </div>}
          {filtered.map(msg=>{
            const isActive=selected?.id===msg.id;
            const isStarred=starredIds.has(msg.id);
            return (
              <div key={msg.id}
                onClick={()=>openMsg(msg)}
                onContextMenu={e=>{e.preventDefault();setCtx({x:e.clientX,y:e.clientY,msg});}}
                style={{
                  display:"flex" as const,alignItems:"flex-start" as const,gap:9,padding:"10px 12px",
                  borderBottom:"1px solid #f0f0f0",cursor:"pointer" as const,
                  background:isActive?"#e8f0fe":msg.is_read?"#fff":"#f8f9ff",
                  borderLeft:isActive?"2px solid #0078d4":"2px solid transparent",
                  transition:"background 0.08s",
                }}
                onMouseEnter={e=>{ if(!isActive)(e.currentTarget as HTMLElement).style.background=msg.is_read?"#f5f5f5":"#f0f3ff"; }}
                onMouseLeave={e=>{ if(!isActive)(e.currentTarget as HTMLElement).style.background=msg.is_read?"#fff":"#f8f9ff"; }}>
                {/* Unread dot */}
                <div style={{width:6,height:6,borderRadius:"50%",background:msg.is_read?"transparent":"#0078d4",flexShrink:0,marginTop:7}}/>
                {/* Avatar */}
                <div style={{width:32,height:32,borderRadius:"50%",background:avatarBg(msg.from_name),display:"flex" as const,alignItems:"center" as const,justifyContent:"center" as const,fontSize:10.5,fontWeight:700,color:"#fff",flexShrink:0}}>
                  {initials(msg.from_name)}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex" as const,alignItems:"baseline" as const,justifyContent:"space-between" as const,gap:4}}>
                    <span style={{fontSize:12,fontWeight:msg.is_read?500:700,color:"#1f1f1f",overflow:"hidden" as const,textOverflow:"ellipsis",whiteSpace:"nowrap" as const,maxWidth:140}}>{msg.from_name||"System"}</span>
                    <span style={{fontSize:9.5,color:"#999",flexShrink:0}}>{timeStr(msg.created_at)}</span>
                  </div>
                  <div style={{fontSize:11.5,fontWeight:msg.is_read?400:600,color:msg.is_read?"#555":"#1f1f1f",overflow:"hidden" as const,textOverflow:"ellipsis",whiteSpace:"nowrap" as const,marginTop:1}}>{msg.subject}</div>
                  <div style={{fontSize:10.5,color:"#999",overflow:"hidden" as const,textOverflow:"ellipsis",whiteSpace:"nowrap" as const,marginTop:2}}>{msg.body.slice(0,55)}…</div>
                </div>
                {isStarred&&<Star style={{width:11,height:11,color:"#f59e0b",fill:"#f59e0b",flexShrink:0,marginTop:5}}/>}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT: Reader / Compose / Empty ──────────────────── */}
      <div style={{flex:1,display:"flex" as const,flexDirection:"column" as const,height:"100%",overflow:"hidden" as const,background:"#fff",position:"relative" as const}}>

        {/* ── EMPTY STATE with procurement wallpaper ── */}
        {!selected&&!composing&&(
          <div style={{flex:1,position:"relative" as const,overflow:"hidden" as const,display:"flex" as const,alignItems:"center" as const,justifyContent:"center" as const}}>
            {/* Background */}
            <div style={{position:"absolute" as const,inset:0,backgroundImage:`url(${procBg})`,backgroundSize:"cover",backgroundPosition:"center",filter:"brightness(0.22)"}}/>
            <div style={{position:"absolute" as const,inset:0,background:"linear-gradient(135deg,rgba(0,30,80,0.75),rgba(0,0,0,0.55))"}}/>
            {/* Content */}
            <div style={{position:"relative" as const,textAlign:"center" as const,padding:"40px 32px"}}>
              <div style={{width:64,height:64,borderRadius:16,background:"rgba(0,120,212,0.85)",display:"flex" as const,alignItems:"center" as const,justifyContent:"center" as const,margin:"0 auto 20px",backdropFilter:"blur(4px)"}}>
                <Mail style={{width:30,height:30,color:"#fff"}}/>
              </div>
              <div style={{fontSize:20,fontWeight:700,color:"#fff",marginBottom:8,letterSpacing:"-0.3px"}}>Mail & Inbox</div>
              <div style={{fontSize:12.5,color:"rgba(255,255,255,0.55)",marginBottom:24,maxWidth:300,lineHeight:1.6}}>
                Select a message from the list to read it, or compose a new message to get started.
              </div>
              <div style={{display:"flex" as const,gap:10,justifyContent:"center" as const}}>
                <button onClick={()=>setComposing(true)}
                  style={{display:"flex" as const,alignItems:"center" as const,gap:8,padding:"10px 20px",background:"#0078d4",color:"#fff",border:"none",borderRadius:4,cursor:"pointer" as const,fontSize:13,fontWeight:600}}>
                  <Edit3 style={{width:13,height:13}}/> New Message
                </button>
                <button onClick={load}
                  style={{display:"flex" as const,alignItems:"center" as const,gap:8,padding:"10px 16px",background:"#e2e8f0",color:"rgba(255,255,255,0.85)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:4,cursor:"pointer" as const,fontSize:13,fontWeight:500,backdropFilter:"blur(4px)"}}>
                  <RefreshCw style={{width:13,height:13}}/> Refresh
                </button>
              </div>
              {/* System status */}
              {smtpStatus&&(
                <div style={{marginTop:28,padding:"10px 20px",borderRadius:6,background:"#e2e8f0",border:"1px solid #e2e8f0",display:"inline-flex" as const,alignItems:"center" as const,gap:8}}>
                  <div style={{width:7,height:7,borderRadius:"50%",background:smtpStatus.ready?"#4ade80":"#fbbf24"}}/>
                  <span style={{fontSize:11,color:"rgba(255,255,255,0.65)",fontWeight:500}}>
                    Email: {smtpStatus.ready?`${smtpStatus.provider} Active`:"Internal Only"} · {unreadCount} unread
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── COMPOSE WINDOW ── */}
        {composing&&(
          <div style={{flex:1,display:"flex" as const,flexDirection:"column" as const,overflow:"hidden" as const}}>
            {/* Compose header */}
            <div style={{padding:"12px 20px",borderBottom:"1px solid #e0e0e0",display:"flex" as const,alignItems:"center" as const,gap:10,background:"#faf9f8"}}>
              <Edit3 style={{width:15,height:15,color:"#0078d4"}}/>
              <h3 style={{fontSize:14,fontWeight:700,color:"#1f1f1f",margin:0,flex:1}}>New Message</h3>
              <button onClick={()=>setComposing(false)} style={{padding:5,borderRadius:4,border:"none",background:"#f8fafc",cursor:"pointer" as const,lineHeight:0}}
                onMouseEnter={e=>hoverBg(e,true)} onMouseLeave={e=>hoverBg(e,false)}>
                <X style={{width:15,height:15,color:"#666"}}/>
              </button>
            </div>
            <div style={{flex:1,overflowY:"auto" as const,padding:"20px 24px"}}>
              <div style={{maxWidth:700,display:"flex" as const,flexDirection:"column" as const,gap:12}}>
                {/* To */}
                <div style={{display:"flex" as const,alignItems:"center" as const,gap:10,borderBottom:"1px solid #e0e0e0",paddingBottom:10}}>
                  <label style={{fontSize:11,fontWeight:700,color:"#888",width:40,flexShrink:0,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>To</label>
                  <input value={compose.to} onChange={e=>setCompose(p=>({...p,to:e.target.value}))} placeholder="recipient@email.com or internal user email"
                    style={{...inp,border:"none",flex:1,padding:"6px 0"}}/>
                </div>
                {/* CC */}
                <div style={{display:"flex" as const,alignItems:"center" as const,gap:10,borderBottom:"1px solid #e0e0e0",paddingBottom:10}}>
                  <label style={{fontSize:11,fontWeight:700,color:"#888",width:40,flexShrink:0,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>CC</label>
                  <input value={compose.cc} onChange={e=>setCompose(p=>({...p,cc:e.target.value}))} placeholder="cc@email.com (optional)"
                    style={{...inp,border:"none",flex:1,padding:"6px 0"}}/>
                </div>
                {/* Subject */}
                <div style={{display:"flex" as const,alignItems:"center" as const,gap:10,borderBottom:"1px solid #e0e0e0",paddingBottom:10}}>
                  <label style={{fontSize:11,fontWeight:700,color:"#888",width:40,flexShrink:0,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>Sub</label>
                  <input value={compose.subject} onChange={e=>setCompose(p=>({...p,subject:e.target.value}))} placeholder="Message subject"
                    style={{...inp,border:"none",flex:1,fontWeight:600,padding:"6px 0"}}/>
                </div>
                {/* Priority */}
                <div style={{display:"flex" as const,alignItems:"center" as const,gap:10}}>
                  <label style={{fontSize:11,fontWeight:700,color:"#888",width:40,flexShrink:0,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>Pri</label>
                  <select value={compose.priority} onChange={e=>setCompose(p=>({...p,priority:e.target.value}))}
                    style={{...inp,width:"auto",padding:"5px 10px",fontSize:12}}>
                    <option value="low">Low Priority</option>
                    <option value="normal">Normal</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                {/* Body */}
                <textarea value={compose.body} onChange={e=>setCompose(p=>({...p,body:e.target.value}))}
                  placeholder="Write your message here…" rows={12}
                  style={{...inp,resize:"vertical" as const,minHeight:220,marginTop:4}}/>
                {/* Actions */}
                <div style={{display:"flex" as const,gap:8,flexWrap:"wrap" as const,alignItems:"center" as const}}>
                  <button onClick={()=>sendCompose(false)} disabled={sending||testSending}
                    style={{display:"flex" as const,alignItems:"center" as const,gap:7,padding:"9px 20px",background:"#0078d4",color:"#fff",border:"none",borderRadius:4,cursor:"pointer" as const,fontSize:13,fontWeight:600,opacity:(sending||testSending)?0.7:1}}>
                    {sending?<RefreshCw style={{width:13,height:13,animation:"spin 1s linear infinite"}}/>:<Send style={{width:13,height:13}}/>}
                    {sending?"Sending…":"Send"}
                  </button>
                  <button onClick={()=>sendCompose(true)} disabled={sending||testSending}
                    title="Send test email to yourself to verify SMTP configuration"
                    style={{display:"flex" as const,alignItems:"center" as const,gap:7,padding:"9px 14px",background:"#f8fafc",color:"#0078d4",border:"1px solid #0078d4",borderRadius:4,cursor:"pointer" as const,fontSize:12,fontWeight:500,opacity:(sending||testSending)?0.7:1}}>
                    {testSending?<RefreshCw style={{width:12,height:12,animation:"spin 1s linear infinite"}}/>:<Activity style={{width:12,height:12}}/>}
                    {testSending?"Testing…":"Test Send"}
                  </button>
                  <button onClick={()=>setComposing(false)}
                    style={{padding:"9px 14px",border:"1px solid #e0e0e0",borderRadius:4,background:"#fff",cursor:"pointer" as const,fontSize:12,color:"#555"}}>
                    Discard
                  </button>
                  {smtpStatus&&(
                    <div style={{marginLeft:"auto",fontSize:10.5,color:"#888",display:"flex" as const,alignItems:"center" as const,gap:5}}>
                      <div style={{width:6,height:6,borderRadius:"50%",background:smtpStatus.ready?"#22c55e":"#f59e0b"}}/>
                      {smtpStatus.ready?`External via ${smtpStatus.provider}`:"Internal only — configure SMTP in Settings"}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── EMAIL READER ── */}
        {selected&&!composing&&(
          <>
            {/* Toolbar */}
            <div style={{padding:"10px 16px",borderBottom:"1px solid #e0e0e0",display:"flex" as const,alignItems:"center" as const,gap:4,flexWrap:"wrap" as const,background:"#faf9f8"}}>
              {[
                {icon:CornerUpLeft,label:"Reply",action:()=>{setReplyMode(true);setReplyBody(`\n\n--- Original ---\n${selected.body}`);}},
                {icon:Users,       label:"Reply All",action:()=>{setReplyMode(true);setReplyBody(`\n\n--- Original ---\n${selected.body}`);}},
                {icon:Forward,     label:"Forward",action:()=>{ setCompose({to:"",cc:"",subject:`Fwd: ${selected.subject}`,body:`\n\n--- Fwd ---\n${selected.body}`,priority:"normal"}); setComposing(true); }},
                {icon:Trash2,      label:"Delete",action:()=>deleteMsg(selected.id)},
              ].map(btn=>(
                <button key={btn.label} onClick={btn.action}
                  style={{display:"flex" as const,alignItems:"center" as const,gap:5,padding:"6px 10px",border:"1px solid #e0e0e0",borderRadius:4,background:"#fff",cursor:"pointer" as const,fontSize:12,color:"#1f1f1f",fontWeight:500}}
                  onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f5f5f5"}
                  onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="#fff"}>
                  <btn.icon style={{width:13,height:13,color:"#555"}}/>{btn.label}
                </button>
              ))}
              <div style={{flex:1}}/>
              <button onClick={()=>toggleStar(selected.id)}
                style={{padding:6,border:"1px solid #e0e0e0",borderRadius:4,background:"#fff",cursor:"pointer" as const,lineHeight:0}}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f5f5f5"}
                onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="#fff"}>
                <Star style={{width:14,height:14,color:starredIds.has(selected.id)?"#f59e0b":"#999",fill:starredIds.has(selected.id)?"#f59e0b":"none"}}/>
              </button>
              <button onClick={()=>markUnread(selected)}
                style={{padding:6,border:"1px solid #e0e0e0",borderRadius:4,background:"#fff",cursor:"pointer" as const,lineHeight:0}}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f5f5f5"}
                onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="#fff"}>
                <EyeOff style={{width:14,height:14,color:"#999"}}/>
              </button>
            </div>

            {/* Email header */}
            <div style={{padding:"20px 24px 16px",borderBottom:"1px solid #e0e0e0"}}>
              <h2 style={{fontSize:18,fontWeight:700,color:"#1f1f1f",margin:"0 0 14px"}}>{selected.subject}</h2>
              <div style={{display:"flex" as const,alignItems:"flex-start" as const,gap:12}}>
                <div style={{width:40,height:40,borderRadius:"50%",background:avatarBg(selected.from_name),display:"flex" as const,alignItems:"center" as const,justifyContent:"center" as const,fontSize:13,fontWeight:700,color:"#fff",flexShrink:0}}>{initials(selected.from_name)}</div>
                <div style={{flex:1}}>
                  <div style={{display:"flex" as const,alignItems:"baseline" as const,justifyContent:"space-between" as const}}>
                    <span style={{fontSize:13,fontWeight:700,color:"#1f1f1f"}}>{selected.from_name||"System"}</span>
                    <span style={{fontSize:11,color:"#999"}}>{timeStr(selected.created_at)}</span>
                  </div>
                  {selected.from_email&&<div style={{fontSize:11,color:"#888",marginTop:2}}>
                    <span style={{color:"#999"}}>From:</span> {selected.from_email}
                    {selected.to_email&&<span style={{marginLeft:12}}><span style={{color:"#999"}}>To:</span> {selected.to_email}</span>}
                  </div>}
                  <div style={{marginTop:6,display:"flex" as const,gap:5,flexWrap:"wrap" as const}}>
                    <span style={{padding:"2px 8px",borderRadius:3,fontSize:10,fontWeight:600,background:`${msgColor(selected.type)}18`,color:msgColor(selected.type)}}>{selected.type}</span>
                    {selected.module&&<span style={{padding:"2px 8px",borderRadius:3,fontSize:10,background:"#f0f0f0",color:"#666"}}>{selected.module}</span>}
                    {selected.priority!=="normal"&&<span style={{padding:"2px 8px",borderRadius:3,fontSize:10,fontWeight:600,background:selected.priority==="urgent"?"#fef2f2":"#fff8f0",color:selected.priority==="urgent"?"#dc2626":"#d97706"}}>{selected.priority}</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Body */}
            <div style={{flex:1,overflowY:"auto" as const,padding:"24px"}}>
              <div style={{maxWidth:700,fontSize:13.5,color:"#374151",lineHeight:1.85,whiteSpace:"pre-wrap" as const}}>{selected.body}</div>
              {selected.action_url&&(
                <div style={{marginTop:20}}>
                  <a href={selected.action_url} style={{display:"inline-flex" as const,alignItems:"center" as const,gap:7,padding:"8px 16px",background:"#0078d4",color:"#fff",borderRadius:4,textDecoration:"none" as const,fontSize:12,fontWeight:600}}>
                    <ChevronRight style={{width:12,height:12}}/> View in System
                  </a>
                </div>
              )}
            </div>

            {/* Reply panel */}
            {replyMode&&(
              <div style={{padding:"14px 20px",borderTop:"1px solid #e0e0e0",background:"#faf9f8"}}>
                <div style={{fontSize:11.5,color:"#666",marginBottom:8}}>Replying to <strong style={{color:"#1f1f1f"}}>{selected.from_name}</strong></div>
                <textarea value={replyBody} onChange={e=>setReplyBody(e.target.value)} rows={5}
                  placeholder="Write your reply…" style={{...inp,resize:"none" as const}}/>
                <div style={{display:"flex" as const,gap:8,marginTop:10}}>
                  <button onClick={sendReply} disabled={sending}
                    style={{display:"flex" as const,alignItems:"center" as const,gap:7,padding:"8px 16px",background:"#0078d4",color:"#fff",border:"none",borderRadius:4,cursor:"pointer" as const,fontSize:12,fontWeight:600,opacity:sending?0.7:1}}>
                    {sending?<RefreshCw style={{width:12,height:12,animation:"spin 1s linear infinite"}}/>:<Send style={{width:12,height:12}}/>} Send Reply
                  </button>
                  <button onClick={()=>setReplyMode(false)} style={{padding:"8px 12px",border:"1px solid #e0e0e0",borderRadius:4,background:"#fff",cursor:"pointer" as const,fontSize:12,color:"#555"}}>Cancel</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── CONTEXT MENU ──────────────────────────────────────── */}
      {ctx&&(
        <div ref={ctxRef} style={{position:"fixed" as const,left:Math.min(ctx.x,window.innerWidth-210),top:Math.min(ctx.y,window.innerHeight-360),width:200,background:"#fff",borderRadius:4,border:"1px solid #e0e0e0",boxShadow:"0 8px 24px rgba(0,0,0,0.15)",zIndex:2000,overflow:"hidden" as const,fontFamily:"'Segoe UI',sans-serif"}}>
          {[
            {label:"Open",        icon:Eye,          action:()=>openMsg(ctx.msg)},
            {label:"Reply",       icon:CornerUpLeft, action:()=>{openMsg(ctx.msg);setTimeout(()=>setReplyMode(true),50);}},
            {label:"Forward",     icon:Forward,      action:()=>{setCompose({to:"",cc:"",subject:`Fwd: ${ctx.msg.subject}`,body:`\n\n--- Fwd ---\n${ctx.msg.body}`,priority:"normal"});setComposing(true);setCtx(null);}},
            null,
            {label:ctx.msg.is_read?"Mark Unread":"Mark Read",icon:ctx.msg.is_read?EyeOff:Eye,action:()=>{ctx.msg.is_read?markUnread(ctx.msg):markRead(ctx.msg);setCtx(null);}},
            {label:"Star",        icon:Star,         action:()=>{toggleStar(ctx.msg.id);setCtx(null);}},
            {label:"Delete",      icon:Trash2,       action:()=>{deleteMsg(ctx.msg.id);setCtx(null);}, danger:true},
          ].map((item,i)=>{
            if(item===null) return <div key={i} style={{height:1,background:"#f0f0f0",margin:"2px 0"}}/>;
            const it=item as any;
            return (
              <button key={i} onClick={it.action}
                style={{display:"flex" as const,alignItems:"center" as const,gap:10,padding:"8px 14px",border:"none",background:"#f8fafc",cursor:"pointer" as const,width:"100%",textAlign:"left" as const,fontSize:12.5,color:it.danger?"#dc2626":"#1f1f1f"}}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=it.danger?"#fdf4f4":"#f5f5f5"}
                onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="#fff"}>
                <it.icon style={{width:13,height:13,color:it.danger?"#dc2626":"#666"}}/>{it.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
