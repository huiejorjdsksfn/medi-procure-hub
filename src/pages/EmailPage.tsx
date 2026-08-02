/**
 * EL5 MediProcure — Mail & Inbox v2.0 (2026 ERP redesign)
 * Was fully hardcoded (no central theme at all — same desync bug found
 * in erpTheme.ts and Document Studio). Now synced to T throughout, plus
 * a visual pass matching the rest of this redesign — same load/reply/
 * compose/send/context-menu logic as v1.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { pageCache } from "@/lib/pageCache";
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
import { T } from "@/lib/theme";
import { font, spinKeyframes } from "@/lib/erpKit";

/* - Types - */
interface Msg {
  id:string; dbId:string; source:"inbox"|"notification";
  type:string; subject:string; body:string;
  from_user_id?:string; from_name?:string; from_email?:string;
  to_user_id?:string; to_email?:string;
  priority:string; status:string; is_read:boolean; is_starred:boolean;
  thread_id?:string; module?:string; action_url?:string; created_at:string;
}
interface CtxMenu { x:number; y:number; msg:Msg; }

/* - Helpers - */
const TYPE_COLOR:Record<string,string>={
  email:T.primary,procurement:T.primary,grn:T.success,voucher:T.accent,
  tender:"#1F6090",quality:"#498205",system:T.fgMuted,info:T.primary,
  warning:T.warning,error:T.error,success:T.success,default:T.fgMuted,
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
  const cols=[T.primary,T.accent,T.success,"#7c3aed","#0369a1","#498205",T.warning,T.error];
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

/* - Component - */
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

  /* - SMTP status - */
  useEffect(()=>{
    (supabase as any).from("system_settings").select("key,value")
      .in("key",["smtp_enabled","smtp_host","smtp_user","smtp_pass","email_mode","resend_api_key","sendgrid_api_key","mailgun_api_key"])
      .then(({data}:any)=>{
        const m:Record<string,string>={};
        (data||[]).forEach((r:any)=>{ if(r.key) m[r.key]=r.value||""; });
        const mode = m.email_mode||"internal";
        const hasSmtp = m.smtp_enabled==="true"&&!!m.smtp_host&&!!m.smtp_user&&!!m.smtp_pass;
        const hasApi = !!(m.resend_api_key||m.sendgrid_api_key||m.mailgun_api_key);
        const provider = m.resend_api_key?"Resend":m.sendgrid_api_key?"SendGrid":m.mailgun_api_key?"Mailgun":hasSmtp?"SMTP":"Internal";
        setSmtpStatus({ mode, provider, ready: hasSmtp||hasApi });
      }).catch(()=>setSmtpStatus({mode:"internal",provider:"Internal",ready:false}));
  },[]);

  /* - Load - */
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
        from_name:"System",from_email:"hpdeskg9@gmail.com",
        priority:"normal",status:n.is_read?"read":"unread",
        is_read:!!n.is_read,is_starred:false,module:n.module||n.category,
        created_at:n.created_at||new Date().toISOString(),
      }));
      setMsgs([...inbox,...notifs].sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime()));
    } catch(e){ console.error(e); }
    setLoading(false);
  },[user]);

  useEffect(()=>{ load(); },[load]);

  /* - Real-time - */
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

  /* - Context menu close - */
  useEffect(()=>{
    const h=(e:MouseEvent)=>{ if(ctxRef.current&&!ctxRef.current.contains(e.target as Node)) setCtx(null); };
    document.addEventListener("mousedown",h);
    return ()=>document.removeEventListener("mousedown",h);
  },[]);

  /* - Filtering - */
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

  /* - Actions - */
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

  /* - Send reply - */
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
      toast({title:"Reply sent"}); setReplyMode(false); setReplyBody(""); load();
    } catch(e:any){ toast({title:"Failed",description:e.message,variant:"destructive"}); }
    setSending(false);
  };

  /* - Send composed message - */
  const sendCompose = async(testMode=false)=>{
    const to = testMode ? (profile?.email||user?.email||"") : compose.to.trim();
    if(!to||(!testMode&&!compose.subject.trim())||!user){ toast({title:"Fill recipient and subject",variant:"destructive"}); return; }

    // Test Send hits real SMTP/API providers and costs money per call —
    // exactly the kind of authenticated, repeatable, cost-bearing action
    // check_rate_limit exists for. (rate-limiter edge function was a
    // no-op stub before this; now it actually calls check_rate_limit.)
    if (testMode) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const supaUrl = import.meta.env.VITE_SUPABASE_URL || "https://yvjfehnzbzjliizjvuhq.supabase.co";
          const res = await fetch(`${supaUrl}/functions/v1/rate-limiter`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${session.access_token}`,
              "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
            },
            body: JSON.stringify({ action: "email_test_send" }),
          });
          const d = await res.json().catch(() => ({ allowed: true }));
          if (d && d.allowed === false) {
            toast({ title: "Slow down", description: "Too many test sends — try again in a few minutes.", variant: "destructive" });
            return;
          }
        }
      } catch { /* fail open — never let the limiter itself block sending */ }
    }

    if(testMode) setTestSending(true); else setSending(true);

    try {
      const subject = testMode ? `[TEST] EL5 MediProcure Email Test - ${new Date().toLocaleString("en-KE")}` : compose.subject;
      const body    = testMode ? `This is a test email from EL5 MediProcure.\n\nSent by: ${profile?.full_name||"Staff"}\nTime: ${new Date().toLocaleString("en-KE")}\nMode: ${smtpStatus?.mode||"internal"} via ${smtpStatus?.provider||"Internal"}` : compose.body;

      // 1. Always save to inbox_items (internal delivery - always works)
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

      // 2. External delivery - only if mode = "external" (or internal+external)
      const mode = smtpStatus?.mode || getSetting("email_mode","internal");
      if(mode==="external"||mode==="both") {
        try {
          const { data:fnData, error:fnErr } = await supabase.functions.invoke("send-email",{
            body:{
              to,
              cc: compose.cc||undefined,
              subject,
              body,
              html:`<div style="font-family:'Segoe UI',Arial,sans-serif;font-size:14px;color:#374151;line-height:1.75">${body.replace(/\n/g,"<br/>")}</div><hr style="margin-top:24px;border:none;border-top:1px solid #e5e7eb"/><p style="font-size:11px;color:#9ca3af">Sent via ${getSetting("system_name","EL5 MediProcure")} - ${getSetting("hospital_name","Embu Level 5 Hospital")}</p>`,
              // send-email reads SMTP config from system_settings itself
              // server-side (see getSmtpSettings() in the function) — it
              // never reads a `smtp` field from the request body, so
              // sending the plaintext password here achieved nothing but
              // an unnecessary trip over the wire. Removed.
            }
          });
          const d = fnData as any;
          // send-email returns { ok: boolean, ... } — this used to check
          // d?.success, a field the function has never actually returned,
          // so every single send (successful or not) showed a false
          // "external delivery failed" warning here.
          if(fnErr||!d?.ok) {
            toast({title:testMode?"Test: Internal ok, External failed":"Saved internally - external delivery failed",description:fnErr?.message||d?.error||"Check SMTP/API settings",variant:testMode?"destructive":"default"});
          } else {
            toast({title:testMode?`Test sent via ${d.provider||"SMTP"}`:`Email sent via ${d.provider||"SMTP"}`,description:`Delivered to ${to}`});
          }
        } catch(exErr:any){
          toast({title:"External send error",description:exErr.message,variant:"destructive"});
        }
      } else {
        if(testMode) toast({title:"Test: Internal delivery ok",description:"Enable 'Internal + External' mode in Settings > Email to test real SMTP"});
        else toast({title:"Message sent",description:"Internal delivery complete"});
      }

      if(!testMode){ setComposing(false); setCompose({to:"",cc:"",subject:"",body:"",priority:"normal"}); }
    } catch(e:any){ toast({title:"Send failed",description:e.message,variant:"destructive"}); }
    if(testMode) setTestSending(false); else setSending(false);
  };

  /* - Shared input style - */
  const inp:React.CSSProperties={width:"100%",padding:"8px 12px",border:`1px solid ${T.border}`,borderRadius:T.rMd,fontSize:13,outline:"none",boxSizing:"border-box",color:T.fg,background:T.bg,fontFamily:font};

  /* - Hover helpers - */
  const hoverBg = (e:React.MouseEvent, on:boolean, bg=T.bg) => {
    (e.currentTarget as HTMLElement).style.background = on ? bg : "transparent";
  };

  /* -
      RENDER
  - */
  return (
    <div style={{display:"flex",height:"100%",background:T.bg,fontFamily:font,overflow:"hidden",position:"relative"}}>
      <style>{spinKeyframes}</style>

      {/* - LEFT SIDEBAR - */}
      <div style={{width:216,flexShrink:0,background:T.card,borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>
        {/* Header */}
        <div style={{padding:"16px 16px 12px",borderBottom:`1px solid ${T.border}`}}>
          <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:14}}>
            <div style={{width:34,height:34,borderRadius:T.rLg,background:T.primaryBg,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Mail style={{width:17,height:17,color:T.primary}}/>
            </div>
            <div>
              <div style={{fontSize:13.5,fontWeight:700,color:T.fg}}>Mail &amp; Inbox</div>
              <div style={{fontSize:10,color:T.fgDim}}>{unreadCount>0?`${unreadCount} unread`:"All caught up"}</div>
            </div>
          </div>
          {/* Compose */}
          <button onClick={()=>{ setComposing(true); setSelected(null); }}
            style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:7,padding:"9px",borderRadius:T.rMd,background:T.primary,border:"none",cursor:"pointer",fontSize:12.5,fontWeight:700,color:"#fff"}}>
            <Edit3 style={{width:13,height:13}}/> New Message
          </button>
          {/* SMTP mode badge */}
          {smtpStatus&&(
            <div style={{marginTop:9,padding:"6px 9px",borderRadius:T.rMd,background:smtpStatus.ready?T.successBg:T.warningBg,border:`1px solid ${smtpStatus.ready?T.success:T.warning}33`,display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:smtpStatus.ready?T.success:T.warning,flexShrink:0}}/>
              <span style={{fontSize:9.5,fontWeight:700,color:smtpStatus.ready?T.success:T.warning,lineHeight:1.3}}>
                {smtpStatus.ready?`${smtpStatus.provider} - ${smtpStatus.mode==="external"||smtpStatus.mode==="both"?"External Active":"Internal + External"}` : "Internal Only — email stored, not sent"}
              </span>
            </div>
          )}
        </div>

        {/* Folders */}
        <nav style={{flex:1,overflowY:"auto",padding:"8px 8px 0"}}>
          {FOLDERS.map(f=>{
            const count=f.id==="inbox"?unreadCount:f.id==="starred"?starredIds.size:0;
            const isAct=folder===f.id;
            return (
              <button key={f.id} onClick={()=>{setFolder(f.id);setSelected(null);setComposing(false);}}
                style={{width:"100%",display:"flex",alignItems:"center",gap:9,padding:"8px 10px",borderRadius:T.rMd,border:"none",
                  background:isAct?T.primaryBg:"transparent",cursor:"pointer",textAlign:"left",marginBottom:2}}
                onMouseEnter={e=>{ if(!isAct)(e.currentTarget as HTMLElement).style.background=T.bg; }}
                onMouseLeave={e=>{ if(!isAct)(e.currentTarget as HTMLElement).style.background="transparent"; }}>
                <f.icon style={{width:14,height:14,color:isAct?T.primary:T.fgMuted,flexShrink:0}}/>
                <span style={{flex:1,fontSize:12.5,fontWeight:isAct?700:500,color:isAct?T.primary:T.fg}}>{f.label}</span>
                {count>0&&<span style={{minWidth:18,height:18,borderRadius:9,background:T.primary,color:"#fff",fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 4px"}}>{count}</span>}
              </button>
            );
          })}

          <div style={{borderTop:`1px solid ${T.border}`,margin:"10px 4px",paddingTop:10}}>
            <div style={{fontSize:9.5,fontWeight:700,color:T.fgDim,letterSpacing:"0.07em",textTransform:"uppercase",padding:"0 6px 6px"}}>System Folders</div>
            {[{id:"procurement",label:"Procurement",icon:Layers},{id:"system",label:"System Alerts",icon:Shield}].map(f=>{
              const isAct=folder===f.id;
              return (
                <button key={f.id} onClick={()=>{setFolder(f.id);setSelected(null);setComposing(false);}}
                  style={{width:"100%",display:"flex",alignItems:"center",gap:9,padding:"7px 10px",borderRadius:T.rMd,border:"none",
                    background:isAct?T.primaryBg:"transparent",cursor:"pointer",textAlign:"left",marginBottom:2}}
                  onMouseEnter={e=>{ if(!isAct)(e.currentTarget as HTMLElement).style.background=T.bg; }}
                  onMouseLeave={e=>{ if(!isAct)(e.currentTarget as HTMLElement).style.background="transparent"; }}>
                  <f.icon style={{width:13,height:13,color:T.fgDim,flexShrink:0}}/>
                  <span style={{fontSize:12.5,color:T.fgMuted}}>{f.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* User strip */}
        <div style={{padding:"10px 16px",borderTop:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:26,height:26,borderRadius:"50%",background:avatarBg(profile?.full_name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:9.5,fontWeight:700,color:"#fff",flexShrink:0}}>{initials(profile?.full_name)}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:11,fontWeight:600,color:T.fg,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{profile?.full_name||"User"}</div>
            <div style={{fontSize:9,color:T.fgDim,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{profile?.email||""}</div>
          </div>
        </div>
      </div>

      {/* - MIDDLE: Message list - */}
      <div style={{width:304,flexShrink:0,borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column",background:T.card,height:"100%",overflow:"hidden"}}>
        {/* Header + search */}
        <div style={{padding:"12px 14px 10px",borderBottom:`1px solid ${T.border}`}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <h2 style={{fontSize:14,fontWeight:700,color:T.fg,margin:0}}>{FOLDERS.find(f=>f.id===folder)?.label||folder}</h2>
            <div style={{display:"flex",gap:2}}>
              <button onClick={load}
                style={{padding:6,borderRadius:T.rMd,border:"none",background:T.bg,cursor:"pointer",lineHeight:0}}
                onMouseEnter={e=>hoverBg(e,true)}
                onMouseLeave={e=>hoverBg(e,false)}>
                <RefreshCw style={{width:13,height:13,color:T.fgMuted,animation:loading?"spin 1s linear infinite":undefined}}/>
              </button>
              <button onClick={()=>{ setComposing(true); setSelected(null); }}
                style={{padding:6,borderRadius:T.rMd,border:"none",background:T.bg,cursor:"pointer",lineHeight:0}}
                onMouseEnter={e=>hoverBg(e,true)}
                onMouseLeave={e=>hoverBg(e,false)}>
                <Plus style={{width:13,height:13,color:T.fgMuted}}/>
              </button>
            </div>
          </div>
          {/* Search */}
          <div style={{position:"relative"}}>
            <Search style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",width:12,height:12,color:T.fgDim}}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search messages…"
              style={{...inp,paddingLeft:30,height:32,fontSize:12,background:T.bg}}/>
            {search&&<button onClick={()=>setSearch("")} style={{position:"absolute",right:7,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",lineHeight:0}}>
              <X style={{width:11,height:11,color:T.fgDim}}/>
            </button>}
          </div>
          {/* Tabs */}
          {folder==="inbox"&&(
            <div style={{display:"flex",gap:4,marginTop:9,background:T.bg,borderRadius:T.rMd,padding:3}}>
              {(["all","unread","read"] as const).map(t=>(
                <button key={t} onClick={()=>setTab(t)}
                  style={{flex:1,padding:"5px 10px",fontSize:11.5,fontWeight:tab===t?700:600,border:"none",background:tab===t?T.card:"transparent",
                    borderRadius:T.r,cursor:"pointer",color:tab===t?T.primary:T.fgMuted,transition:"all 0.12s",boxShadow:tab===t?T.shadow:"none"}}>
                  {t.charAt(0).toUpperCase()+t.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Messages */}
        <div style={{flex:1,overflowY:"auto"}}>
          {loading&&<div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"28px",gap:8,color:T.fgDim,fontSize:12}}>
            <RefreshCw style={{width:13,height:13,animation:"spin 1s linear infinite"}}/>Loading…
          </div>}
          {!loading&&filtered.length===0&&<div style={{textAlign:"center",padding:"40px 16px",color:T.fgDim}}>
            <Mail style={{width:32,height:32,margin:"0 auto 10px",color:T.border}}/><div style={{fontSize:13,fontWeight:600,color:T.fgMuted}}>No messages</div>
          </div>}
          {filtered.map(msg=>{
            const isActive=selected?.id===msg.id;
            const isStarred=starredIds.has(msg.id);
            return (
              <div key={msg.id}
                onClick={()=>openMsg(msg)}
                onContextMenu={e=>{e.preventDefault();setCtx({x:e.clientX,y:e.clientY,msg});}}
                style={{
                  display:"flex",alignItems:"flex-start",gap:9,padding:"11px 12px",
                  borderBottom:`1px solid ${T.border}`,cursor:"pointer",
                  background:isActive?T.primaryBg:msg.is_read?T.card:T.bg,
                  borderLeft:`2px solid ${isActive?T.primary:"transparent"}`,
                  transition:"background 0.08s",
                }}
                onMouseEnter={e=>{ if(!isActive)(e.currentTarget as HTMLElement).style.background=T.bg2; }}
                onMouseLeave={e=>{ if(!isActive)(e.currentTarget as HTMLElement).style.background=msg.is_read?T.card:T.bg; }}>
                {/* Unread dot */}
                <div style={{width:6,height:6,borderRadius:"50%",background:msg.is_read?"transparent":T.primary,flexShrink:0,marginTop:7}}/>
                {/* Avatar */}
                <div style={{width:32,height:32,borderRadius:"50%",background:avatarBg(msg.from_name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:10.5,fontWeight:700,color:"#fff",flexShrink:0}}>
                  {initials(msg.from_name)}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:4}}>
                    <span style={{fontSize:12,fontWeight:msg.is_read?500:700,color:T.fg,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:140}}>{msg.from_name||"System"}</span>
                    <span style={{fontSize:9.5,color:T.fgDim,flexShrink:0}}>{timeStr(msg.created_at)}</span>
                  </div>
                  <div style={{fontSize:11.5,fontWeight:msg.is_read?400:600,color:msg.is_read?T.fgMuted:T.fg,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginTop:1}}>{msg.subject}</div>
                  <div style={{fontSize:10.5,color:T.fgDim,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginTop:2}}>{msg.body.slice(0,55)}…</div>
                </div>
                {isStarred&&<Star style={{width:11,height:11,color:T.warning,fill:T.warning,flexShrink:0,marginTop:5}}/>}
              </div>
            );
          })}
        </div>
      </div>

      {/* - RIGHT: Reader / Compose / Empty - */}
      <div style={{flex:1,display:"flex",flexDirection:"column",height:"100%",overflow:"hidden",background:T.card,position:"relative"}}>

        {/* - EMPTY STATE with procurement wallpaper - */}
        {!selected&&!composing&&(
          <div style={{flex:1,position:"relative",overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center"}}>
            {/* Background */}
            <div style={{position:"absolute",inset:0,backgroundImage:`url(${procBg})`,backgroundSize:"cover",backgroundPosition:"center",filter:"brightness(0.22)"}}/>
            <div style={{position:"absolute",inset:0,background:`linear-gradient(135deg, ${T.primaryDark}cc, rgba(0,0,0,0.55))`}}/>
            {/* Content */}
            <div style={{position:"relative",textAlign:"center",padding:"40px 32px"}}>
              <div style={{width:66,height:66,borderRadius:18,background:`${T.primary}d9`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",backdropFilter:"blur(4px)"}}>
                <Mail style={{width:30,height:30,color:"#fff"}}/>
              </div>
              <div style={{fontSize:20,fontWeight:700,color:"#fff",marginBottom:8,letterSpacing:"-0.3px"}}>Mail &amp; Inbox</div>
              <div style={{fontSize:12.5,color:"rgba(255,255,255,0.6)",marginBottom:24,maxWidth:300,lineHeight:1.6}}>
                Select a message from the list to read it, or compose a new message to get started.
              </div>
              <div style={{display:"flex",gap:10,justifyContent:"center"}}>
                <button onClick={()=>setComposing(true)}
                  style={{display:"flex",alignItems:"center",gap:8,padding:"10px 20px",background:T.primary,color:"#fff",border:"none",borderRadius:T.rMd,cursor:"pointer",fontSize:13,fontWeight:700}}>
                  <Edit3 style={{width:13,height:13}}/> New Message
                </button>
                <button onClick={load}
                  style={{display:"flex",alignItems:"center",gap:8,padding:"10px 16px",background:"rgba(255,255,255,0.12)",color:"rgba(255,255,255,0.9)",border:"1px solid rgba(255,255,255,0.25)",borderRadius:T.rMd,cursor:"pointer",fontSize:13,fontWeight:600,backdropFilter:"blur(4px)"}}>
                  <RefreshCw style={{width:13,height:13}}/> Refresh
                </button>
              </div>
              {/* System status */}
              {smtpStatus&&(
                <div style={{marginTop:28,padding:"10px 20px",borderRadius:T.rLg,background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",display:"inline-flex",alignItems:"center",gap:8}}>
                  <div style={{width:7,height:7,borderRadius:"50%",background:smtpStatus.ready?"#4ade80":"#fbbf24"}}/>
                  <span style={{fontSize:11,color:"rgba(255,255,255,0.75)",fontWeight:600}}>
                    Email: {smtpStatus.ready?`${smtpStatus.provider} Active`:"Internal Only"} - {unreadCount} unread
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* - COMPOSE WINDOW - */}
        {composing&&(
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
            {/* Compose header */}
            <div style={{padding:"12px 20px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:10,background:T.bg}}>
              <Edit3 style={{width:15,height:15,color:T.primary}}/>
              <h3 style={{fontSize:14,fontWeight:700,color:T.fg,margin:0,flex:1}}>New Message</h3>
              <button onClick={()=>setComposing(false)} style={{padding:6,borderRadius:T.rMd,border:"none",background:T.card,cursor:"pointer",lineHeight:0}}
                onMouseEnter={e=>hoverBg(e,true,T.bg2)} onMouseLeave={e=>hoverBg(e,false)}>
                <X style={{width:15,height:15,color:T.fgMuted}}/>
              </button>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"20px 24px"}}>
              <div style={{maxWidth:700,display:"flex",flexDirection:"column",gap:12}}>
                {/* To */}
                <div style={{display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${T.border}`,paddingBottom:10}}>
                  <label style={{fontSize:11,fontWeight:700,color:T.fgDim,width:40,flexShrink:0,textTransform:"uppercase",letterSpacing:"0.05em"}}>To</label>
                  <input value={compose.to} onChange={e=>setCompose(p=>({...p,to:e.target.value}))} placeholder="recipient@email.com or internal user email"
                    style={{...inp,border:"none",flex:1,padding:"6px 0",background:"transparent"}}/>
                </div>
                {/* CC */}
                <div style={{display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${T.border}`,paddingBottom:10}}>
                  <label style={{fontSize:11,fontWeight:700,color:T.fgDim,width:40,flexShrink:0,textTransform:"uppercase",letterSpacing:"0.05em"}}>CC</label>
                  <input value={compose.cc} onChange={e=>setCompose(p=>({...p,cc:e.target.value}))} placeholder="cc@email.com (optional)"
                    style={{...inp,border:"none",flex:1,padding:"6px 0",background:"transparent"}}/>
                </div>
                {/* Subject */}
                <div style={{display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${T.border}`,paddingBottom:10}}>
                  <label style={{fontSize:11,fontWeight:700,color:T.fgDim,width:40,flexShrink:0,textTransform:"uppercase",letterSpacing:"0.05em"}}>Sub</label>
                  <input value={compose.subject} onChange={e=>setCompose(p=>({...p,subject:e.target.value}))} placeholder="Message subject"
                    style={{...inp,border:"none",flex:1,fontWeight:600,padding:"6px 0",background:"transparent"}}/>
                </div>
                {/* Priority */}
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <label style={{fontSize:11,fontWeight:700,color:T.fgDim,width:40,flexShrink:0,textTransform:"uppercase",letterSpacing:"0.05em"}}>Pri</label>
                  <select value={compose.priority} onChange={e=>setCompose(p=>({...p,priority:e.target.value}))}
                    style={{...inp,width:"auto",padding:"6px 12px",fontSize:12}}>
                    <option value="low">Low Priority</option>
                    <option value="normal">Normal</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                {/* Body */}
                <textarea value={compose.body} onChange={e=>setCompose(p=>({...p,body:e.target.value}))}
                  placeholder="Write your message here…" rows={12}
                  style={{...inp,resize:"vertical",minHeight:220,marginTop:4}}/>
                {/* Actions */}
                <div style={{display:"flex",gap:8,flexWrap:"wrap" as const,alignItems:"center"}}>
                  <button onClick={()=>sendCompose(false)} disabled={sending||testSending}
                    style={{display:"flex",alignItems:"center",gap:7,padding:"9px 20px",background:T.primary,color:"#fff",border:"none",borderRadius:T.rMd,cursor:"pointer",fontSize:13,fontWeight:700,opacity:(sending||testSending)?0.7:1}}>
                    {sending?<RefreshCw style={{width:13,height:13,animation:"spin 1s linear infinite"}}/>:<Send style={{width:13,height:13}}/>}
                    {sending?"Sending…":"Send"}
                  </button>
                  <button onClick={()=>sendCompose(true)} disabled={sending||testSending}
                    title="Send test email to yourself to verify SMTP configuration"
                    style={{display:"flex",alignItems:"center",gap:7,padding:"9px 14px",background:T.primaryBg,color:T.primary,border:`1px solid ${T.primary}55`,borderRadius:T.rMd,cursor:"pointer",fontSize:12,fontWeight:600,opacity:(sending||testSending)?0.7:1}}>
                    {testSending?<RefreshCw style={{width:12,height:12,animation:"spin 1s linear infinite"}}/>:<Activity style={{width:12,height:12}}/>}
                    {testSending?"Testing…":"Test Send"}
                  </button>
                  <button onClick={()=>setComposing(false)}
                    style={{padding:"9px 14px",border:`1px solid ${T.border}`,borderRadius:T.rMd,background:T.card,cursor:"pointer",fontSize:12,color:T.fgMuted}}>
                    Discard
                  </button>
                  {smtpStatus&&(
                    <div style={{marginLeft:"auto",fontSize:10.5,color:T.fgDim,display:"flex",alignItems:"center",gap:5}}>
                      <div style={{width:6,height:6,borderRadius:"50%",background:smtpStatus.ready?T.success:T.warning}}/>
                      {smtpStatus.ready?`External via ${smtpStatus.provider}`:"Internal only - configure SMTP in Settings"}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* - EMAIL READER - */}
        {selected&&!composing&&(
          <>
            {/* Toolbar */}
            <div style={{padding:"10px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:4,flexWrap:"wrap" as const,background:T.bg}}>
              {[
                {icon:CornerUpLeft,label:"Reply",action:()=>{setReplyMode(true);setReplyBody(`\n\n--- Original ---\n${selected.body}`);}},
                {icon:Users,       label:"Reply All",action:()=>{setReplyMode(true);setReplyBody(`\n\n--- Original ---\n${selected.body}`);}},
                {icon:Forward,     label:"Forward",action:()=>{ setCompose({to:"",cc:"",subject:`Fwd: ${selected.subject}`,body:`\n\n--- Fwd ---\n${selected.body}`,priority:"normal"}); setComposing(true); }},
                {icon:Trash2,      label:"Delete",action:()=>deleteMsg(selected.id)},
              ].map(btn=>(
                <button key={btn.label} onClick={btn.action}
                  style={{display:"flex",alignItems:"center",gap:5,padding:"6px 11px",border:`1px solid ${T.border}`,borderRadius:T.rMd,background:T.card,cursor:"pointer",fontSize:12,color:T.fg,fontWeight:600}}
                  onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=T.bg2}
                  onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=T.card}>
                  <btn.icon style={{width:13,height:13,color:T.fgMuted}}/>{btn.label}
                </button>
              ))}
              <div style={{flex:1}}/>
              <button onClick={()=>toggleStar(selected.id)}
                style={{padding:6,border:`1px solid ${T.border}`,borderRadius:T.rMd,background:T.card,cursor:"pointer",lineHeight:0}}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=T.bg2}
                onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=T.card}>
                <Star style={{width:14,height:14,color:starredIds.has(selected.id)?T.warning:T.fgDim,fill:starredIds.has(selected.id)?T.warning:"none"}}/>
              </button>
              <button onClick={()=>markUnread(selected)}
                style={{padding:6,border:`1px solid ${T.border}`,borderRadius:T.rMd,background:T.card,cursor:"pointer",lineHeight:0}}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=T.bg2}
                onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=T.card}>
                <EyeOff style={{width:14,height:14,color:T.fgDim}}/>
              </button>
            </div>

            {/* Email header */}
            <div style={{padding:"20px 24px 16px",borderBottom:`1px solid ${T.border}`}}>
              <h2 style={{fontSize:18,fontWeight:700,color:T.fg,margin:"0 0 14px"}}>{selected.subject}</h2>
              <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                <div style={{width:40,height:40,borderRadius:"50%",background:avatarBg(selected.from_name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#fff",flexShrink:0}}>{initials(selected.from_name)}</div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between"}}>
                    <span style={{fontSize:13,fontWeight:700,color:T.fg}}>{selected.from_name||"System"}</span>
                    <span style={{fontSize:11,color:T.fgDim}}>{timeStr(selected.created_at)}</span>
                  </div>
                  {selected.from_email&&<div style={{fontSize:11,color:T.fgMuted,marginTop:2}}>
                    <span style={{color:T.fgDim}}>From:</span> {selected.from_email}
                    {selected.to_email&&<span style={{marginLeft:12}}><span style={{color:T.fgDim}}>To:</span> {selected.to_email}</span>}
                  </div>}
                  <div style={{marginTop:6,display:"flex",gap:5,flexWrap:"wrap" as const}}>
                    <span style={{padding:"2px 8px",borderRadius:99,fontSize:10,fontWeight:700,background:`${msgColor(selected.type)}18`,color:msgColor(selected.type)}}>{selected.type}</span>
                    {selected.module&&<span style={{padding:"2px 8px",borderRadius:99,fontSize:10,background:T.bg2,color:T.fgMuted}}>{selected.module}</span>}
                    {selected.priority!=="normal"&&<span style={{padding:"2px 8px",borderRadius:99,fontSize:10,fontWeight:700,background:selected.priority==="urgent"?T.errorBg:T.warningBg,color:selected.priority==="urgent"?T.error:T.warning}}>{selected.priority}</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Body */}
            <div style={{flex:1,overflowY:"auto",padding:"24px"}}>
              <div style={{maxWidth:700,fontSize:13.5,color:T.fgMuted,lineHeight:1.85,whiteSpace:"pre-wrap"}}>{selected.body}</div>
              {selected.action_url&&(
                <div style={{marginTop:20}}>
                  <a href={selected.action_url} style={{display:"inline-flex",alignItems:"center",gap:7,padding:"8px 16px",background:T.primary,color:"#fff",borderRadius:T.rMd,textDecoration:"none",fontSize:12,fontWeight:700}}>
                    <ChevronRight style={{width:12,height:12}}/> View in System
                  </a>
                </div>
              )}
            </div>

            {/* Reply panel */}
            {replyMode&&(
              <div style={{padding:"14px 20px",borderTop:`1px solid ${T.border}`,background:T.bg}}>
                <div style={{fontSize:11.5,color:T.fgMuted,marginBottom:8}}>Replying to <strong style={{color:T.fg}}>{selected.from_name}</strong></div>
                <textarea value={replyBody} onChange={e=>setReplyBody(e.target.value)} rows={5}
                  placeholder="Write your reply…" style={{...inp,resize:"none"}}/>
                <div style={{display:"flex",gap:8,marginTop:10}}>
                  <button onClick={sendReply} disabled={sending}
                    style={{display:"flex",alignItems:"center",gap:7,padding:"8px 16px",background:T.primary,color:"#fff",border:"none",borderRadius:T.rMd,cursor:"pointer",fontSize:12,fontWeight:700,opacity:sending?0.7:1}}>
                    {sending?<RefreshCw style={{width:12,height:12,animation:"spin 1s linear infinite"}}/>:<Send style={{width:12,height:12}}/>} Send Reply
                  </button>
                  <button onClick={()=>setReplyMode(false)} style={{padding:"8px 12px",border:`1px solid ${T.border}`,borderRadius:T.rMd,background:T.card,cursor:"pointer",fontSize:12,color:T.fgMuted}}>Cancel</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* - CONTEXT MENU - */}
      {ctx&&(
        <div ref={ctxRef} style={{position:"fixed",left:Math.min(ctx.x,window.innerWidth-210),top:Math.min(ctx.y,window.innerHeight-360),width:200,background:T.card,borderRadius:T.rMd,border:`1px solid ${T.border}`,boxShadow:T.shadowLg,zIndex:2000,overflow:"hidden",fontFamily:font}}>
          {[
            {label:"Open",        icon:Eye,          action:()=>openMsg(ctx.msg)},
            {label:"Reply",       icon:CornerUpLeft, action:()=>{openMsg(ctx.msg);setTimeout(()=>setReplyMode(true),50);}},
            {label:"Forward",     icon:Forward,      action:()=>{setCompose({to:"",cc:"",subject:`Fwd: ${ctx.msg.subject}`,body:`\n\n--- Fwd ---\n${ctx.msg.body}`,priority:"normal"});setComposing(true);setCtx(null);}},
            null,
            {label:ctx.msg.is_read?"Mark Unread":"Mark Read",icon:ctx.msg.is_read?EyeOff:Eye,action:()=>{ctx.msg.is_read?markUnread(ctx.msg):markRead(ctx.msg);setCtx(null);}},
            {label:"Star",        icon:Star,         action:()=>{toggleStar(ctx.msg.id);setCtx(null);}},
            {label:"Delete",      icon:Trash2,       action:()=>{deleteMsg(ctx.msg.id);setCtx(null);}, danger:true},
          ].map((item,i)=>{
            if(item===null) return <div key={i} style={{height:1,background:T.border,margin:"3px 0"}}/>;
            const it=item as any;
            return (
              <button key={i} onClick={it.action}
                style={{display:"flex",alignItems:"center",gap:10,padding:"8px 14px",border:"none",background:T.card,cursor:"pointer",width:"100%",textAlign:"left",fontSize:12.5,color:it.danger?T.error:T.fg}}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=it.danger?T.errorBg:T.bg}
                onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=T.card}>
                <it.icon style={{width:13,height:13,color:it.danger?T.error:T.fgMuted}}/>{it.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
