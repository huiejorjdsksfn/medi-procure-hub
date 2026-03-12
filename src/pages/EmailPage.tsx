import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { sendNotification } from "@/lib/notify";
import {
  Mail, Send, RefreshCw, X, Search, Star, Archive, Reply,
  Trash2, Edit3, Inbox, Users, Plus, AlertTriangle, CheckCheck,
  Paperclip, MoreHorizontal, ChevronRight, Eye, EyeOff,
  FileText, Globe, CheckCircle, Settings, Activity, Tag,
  CornerUpLeft, CornerUpRight, FolderPlus, Folder, Volume2,
  VolumeX, Copy, MoveRight, Flag, BookmarkPlus, Forward, ChevronDown,
  Clock, Shield, Package, DollarSign, Gavel, Layers, BarChart3,
  Calendar, Filter
} from "lucide-react";

interface Msg {
  id:string; dbId:string; source:"inbox"|"notification";
  type:string; subject:string; body:string;
  from_user_id?:string; from_name?:string; from_email?:string;
  to_user_id?:string; to_email?:string;
  priority:string; status:string; is_read:boolean;
  is_starred:boolean; thread_id?:string; module?:string;
  action_url?:string; created_at:string;
}

const FOLDERS=[
  {id:"inbox",    label:"Inbox",    icon:Inbox,   color:"#0a2558"},
  {id:"unread",   label:"Unread",   icon:Mail,    color:"#dc2626"},
  {id:"important",label:"Important",icon:Star,    color:"#d97706"},
  {id:"sent",     label:"Sent",     icon:Send,    color:"#107c10"},
  {id:"drafts",   label:"Drafts",   icon:FileText,color:"#6b7280"},
  {id:"deleted",  label:"Deleted",  icon:Trash2,  color:"#374151"},
];

const TYPE_ICON:Record<string,any>={
  email:Mail, procurement:Layers, grn:Package, voucher:DollarSign,
  tender:Gavel, quality:Shield, system:Settings, info:Activity, warning:AlertTriangle, error:AlertTriangle, success:CheckCircle, default:Mail,
};
const TYPE_COLOR:Record<string,string>={
  email:"#7c3aed",procurement:"#0078d4",grn:"#107c10",voucher:"#C45911",
  tender:"#1F6090",quality:"#059669",system:"#6b7280",info:"#0078d4",warning:"#d97706",error:"#dc2626",success:"#16a34a",default:"#6b7280",
};

function msgColor(type:string){ return TYPE_COLOR[type]||TYPE_COLOR.default; }
function msgIcon(type:string){ return TYPE_ICON[type]||TYPE_ICON.default; }
function timeStr(d:string){
  const dt=new Date(d), now=new Date();
  const diff=(now.getTime()-dt.getTime())/1000;
  if(diff<3600) return `${Math.floor(diff/60)}m ago`;
  if(diff<86400) return dt.toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit"});
  if(diff<604800) return dt.toLocaleDateString("en-KE",{weekday:"short"});
  return dt.toLocaleDateString("en-KE",{day:"numeric",month:"short"});
}
function initials(name?:string){ return(name||"?").split(" ").map(p=>p[0]).join("").slice(0,2).toUpperCase(); }
function avatarBg(name?:string){
  const colors=["#0a2558","#C45911","#107c10","#7c3aed","#0369a1","#059669","#d97706","#dc2626"];
  let h=0; for(const c of (name||"?")) h=(h*31+c.charCodeAt(0))%colors.length;
  return colors[h];
}

// ── Context menu ──────────────────────────────────────────────────────────
interface CtxMenu{x:number;y:number;msg:Msg;}

export default function EmailPage(){
  const{user,profile}=useAuth();
  const[folder,setFolder]=useState("inbox");
  const[msgs,setMsgs]=useState<Msg[]>([]);
  const[loading,setLoading]=useState(false);
  const[selected,setSelected]=useState<Msg|null>(null);
  const[search,setSearch]=useState("");
  const[tab,setTab]=useState<"all"|"read"|"unread">("all");
  const[ctx,setCtx]=useState<CtxMenu|null>(null);
  const[composing,setComposing]=useState(false);
  const[compose,setCompose]=useState({to:"",subject:"",body:""});
  const[sending,setSending]=useState(false);
  const[replyMode,setReplyMode]=useState(false);
  const[replyBody,setReplyBody]=useState("");
  const[starredIds,setStarredIds]=useState<Set<string>>(new Set());
  const[importantIds,setImportantIds]=useState<Set<string>>(new Set());
  const[deletedIds,setDeletedIds]=useState<Set<string>>(new Set());
  const ctxRef=useRef<HTMLDivElement>(null);

  // ── Load messages ─────────────────────────────────────────────────────
  const load=useCallback(async()=>{
    if(!user)return;
    setLoading(true);
    try{
      const[ir,nr]=await Promise.all([
        (supabase as any).from("inbox_items").select("*").or(`to_user_id.eq.${user.id},from_user_id.eq.${user.id}`).order("created_at",{ascending:false}).limit(100),
        (supabase as any).from("notifications").select("*").order("created_at",{ascending:false}).limit(50),
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
      const all=[...inbox,...notifs].sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime());
      setMsgs(all);
    }catch(e){console.error("EmailPage load",e);}
    setLoading(false);
  },[user]);

  useEffect(()=>{load();},[load]);

  // Close context menu on outside click
  useEffect(()=>{
    const h=(e:MouseEvent)=>{ if(ctxRef.current&&!ctxRef.current.contains(e.target as Node)) setCtx(null); };
    document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[]);

  // Realtime
  useEffect(()=>{
    if(!user)return;
    const ch=(supabase as any).channel(`email-page-${user.id}`)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"inbox_items"},(p:any)=>{
        const n=p.new as any;
        if(n.to_user_id===user.id||n.from_user_id===user.id) load();
      })
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"notifications"},(p:any)=>{ load(); })
      .subscribe();
    return()=>(supabase as any).removeChannel(ch);
  },[user,load]);

  // ── Filter ────────────────────────────────────────────────────────────
  const filtered=msgs.filter(m=>{
    if(deletedIds.has(m.id)) return folder==="deleted";
    if(folder==="deleted") return false;
    if(folder==="starred") return starredIds.has(m.id);
    if(folder==="important") return importantIds.has(m.id);
    if(folder==="sent") return m.source==="inbox"&&m.from_user_id===user?.id;
    if(folder==="unread") return !m.is_read;
    if(folder==="drafts") return false;
    // inbox = all non-sent
    if(folder==="inbox"){
      if(tab==="read") return m.is_read;
      if(tab==="unread") return !m.is_read;
      return true;
    }
    return true;
  }).filter(m=>{
    if(!search.trim()) return true;
    const s=search.toLowerCase();
    return m.subject.toLowerCase().includes(s)||m.body.toLowerCase().includes(s)||(m.from_name||"").toLowerCase().includes(s);
  });

  const unreadCount=msgs.filter(m=>!m.is_read&&!deletedIds.has(m.id)).length;

  // ── Actions ───────────────────────────────────────────────────────────
  const markRead=async(msg:Msg)=>{
    if(msg.is_read) return;
    if(msg.source==="inbox") await (supabase as any).from("inbox_items").update({status:"read"}).eq("id",msg.dbId);
    else await (supabase as any).from("notifications").update({is_read:true}).eq("id",msg.dbId);
    setMsgs(p=>p.map(m=>m.id===msg.id?{...m,is_read:true,status:"read"}:m));
  };
  const toggleStar=(id:string)=>setStarredIds(p=>{const s=new Set(p);s.has(id)?s.delete(id):s.add(id);return s;});
  const toggleImportant=(id:string)=>setImportantIds(p=>{const s=new Set(p);s.has(id)?s.delete(id):s.add(id);return s;});
  const deleteMsg=(id:string)=>{ setDeletedIds(p=>new Set([...p,id])); if(selected?.id===id) setSelected(null); toast({title:"Moved to Deleted"}); };
  const markUnread=(msg:Msg)=>setMsgs(p=>p.map(m=>m.id===msg.id?{...m,is_read:false,status:"unread"}:m));
  const archive=(id:string)=>{ setDeletedIds(p=>new Set([...p,id])); toast({title:"Archived"}); };

  const openMsg=(msg:Msg)=>{ setSelected(msg); markRead(msg); setCtx(null); setReplyMode(false); setReplyBody(""); };

  const sendReply=async()=>{
    if(!selected||!replyBody.trim()||!user) return;
    setSending(true);
    try{
      const replyTo=selected.from_user_id&&selected.from_user_id!==user.id?selected.from_user_id:selected.to_user_id;
      if(replyTo){
        await sendNotification({userId:replyTo,title:`Re: ${selected.subject}`,message:replyBody,type:"email",module:"Email",actionUrl:"/email",senderId:user.id});
      }
      await (supabase as any).from("inbox_items").insert({
        subject:`Re: ${selected.subject}`,body:replyBody,
        from_user_id:user.id,from_name:profile?.full_name||"Staff",from_email:profile?.email||user.email,
        to_user_id:replyTo,type:"email",status:"sent",priority:"normal",
        thread_id:selected.thread_id||selected.dbId,module:"Email",
      });
      toast({title:"Reply sent ✓"});
      setReplyMode(false); setReplyBody(""); load();
    }catch(e:any){ toast({title:"Failed",description:e.message,variant:"destructive"}); }
    setSending(false);
  };

  const sendCompose=async()=>{
    if(!compose.to.trim()||!compose.subject.trim()||!user){ toast({title:"Fill all fields",variant:"destructive"}); return; }
    setSending(true);
    try{
      // Find recipient by email
      const{data:rec}=await (supabase as any).from("profiles").select("id,full_name").eq("email",compose.to.trim()).maybeSingle();
      if(rec){
        await sendNotification({userId:rec.id,title:compose.subject,message:compose.body,type:"email",module:"Email",actionUrl:"/email",senderId:user.id});
      }
      await (supabase as any).from("inbox_items").insert({
        subject:compose.subject,body:compose.body,
        from_user_id:user.id,from_name:profile?.full_name,from_email:profile?.email||user.email,
        to_email:compose.to,type:"email",status:"sent",priority:"normal",module:"Email",
      });
      toast({title:"Message sent ✓"});
      setComposing(false); setCompose({to:"",subject:"",body:""});
    }catch(e:any){ toast({title:"Send failed",description:e.message,variant:"destructive"}); }
    setSending(false);
  };

  const inp:React.CSSProperties={width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box",color:"#111827",background:"#fff"};

  return(
    <div style={{display:"flex",height:"100%",background:"#f9fafb",fontFamily:"'Segoe UI',system-ui,sans-serif",overflow:"hidden",position:"relative"}}>
      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        .msg-row{transition:background 0.1s;cursor:pointer;}
        .msg-row:hover{background:#f3f4f6!important;}
        .msg-row.active{background:#eff6ff!important;border-right:3px solid #0a2558!important;}
        .folder-btn{transition:background 0.12s;cursor:pointer;}
        .folder-btn:hover{background:rgba(255,255,255,0.08)!important;}
        .folder-btn.active-folder{background:rgba(255,255,255,0.15)!important;font-weight:700!important;}
        .ctx-item{transition:background 0.1s;cursor:pointer;}
        .ctx-item:hover{background:#f3f4f6;}
        .tool-btn{cursor:pointer;transition:background 0.12s,color 0.12s;}
        .tool-btn:hover{background:#f3f4f6!important;}
      `}</style>

      {/* ── LEFT SIDEBAR (dark, Dappr-style) ────────────────────── */}
      <div style={{width:220,flexShrink:0,background:"#111827",display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>
        {/* Header */}
        <div style={{padding:"20px 16px 12px"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
            <div style={{width:34,height:34,borderRadius:9,background:"#0a2558",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Mail style={{width:16,height:16,color:"#fff"}}/>
            </div>
            <span style={{fontSize:16,fontWeight:800,color:"#fff"}}>Mail</span>
          </div>
          {/* Compose */}
          <button onClick={()=>setComposing(true)}
            style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"9px",borderRadius:10,background:"#0a2558",border:"none",cursor:"pointer",fontSize:12,fontWeight:700,color:"#fff"}}>
            <Edit3 style={{width:13,height:13}}/> Compose
          </button>
        </div>

        {/* Folder list */}
        <nav style={{flex:1,overflowY:"auto",padding:"0 8px"}}>
          {FOLDERS.map(f=>{
            const count=f.id==="inbox"?unreadCount:f.id==="starred"?starredIds.size:0;
            return(
              <button key={f.id} className={`folder-btn${folder===f.id?" active-folder":""}`}
                onClick={()=>{setFolder(f.id);setSelected(null);}}
                style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"9px 10px",borderRadius:9,border:"none",background:"transparent",textAlign:"left",cursor:"pointer",marginBottom:2}}>
                <f.icon style={{width:15,height:15,color:folder===f.id?"#fff":f.color}}/>
                <span style={{flex:1,fontSize:12,fontWeight:500,color:folder===f.id?"#fff":"rgba(255,255,255,0.65)"}}>{f.label}</span>
                {count>0&&<span style={{minWidth:18,height:18,borderRadius:9,background:folder===f.id?"rgba(255,255,255,0.25)":"#ef4444",color:"#fff",fontSize:9,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 4px"}}>{count}</span>}
              </button>
            );
          })}

          {/* Custom folders */}
          <div style={{borderTop:"1px solid rgba(255,255,255,0.08)",marginTop:8,paddingTop:8}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 10px 6px"}}>
              <span style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.3)",letterSpacing:"0.06em",textTransform:"uppercase"}}>Folders</span>
              <button style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.4)",lineHeight:0,padding:2}}>
                <Settings style={{width:11,height:11}}/>
              </button>
            </div>
            {[{id:"procurement",label:"Procurement",icon:Layers},{id:"system",label:"System Alerts",icon:Shield}].map(f=>(
              <button key={f.id} className={`folder-btn${folder===f.id?" active-folder":""}`}
                onClick={()=>{setFolder(f.id);setSelected(null);}}
                style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:9,border:"none",background:"transparent",textAlign:"left",cursor:"pointer",marginBottom:2}}>
                <f.icon style={{width:13,height:13,color:"rgba(255,255,255,0.5)"}}/>
                <span style={{flex:1,fontSize:12,color:"rgba(255,255,255,0.55)"}}>{f.label}</span>
              </button>
            ))}
            <button onClick={()=>toast({title:"Folder creation coming soon"})} className="folder-btn"
              style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:9,border:"none",background:"transparent",cursor:"pointer",color:"rgba(255,255,255,0.3)"}}>
              <FolderPlus style={{width:13,height:13}}/><span style={{fontSize:11}}>Add Folder</span>
            </button>
          </div>
        </nav>

        {/* User info */}
        <div style={{padding:"12px 16px",borderTop:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",gap:9}}>
          <div style={{width:28,height:28,borderRadius:"50%",background:avatarBg(profile?.full_name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#fff",flexShrink:0}}>{initials(profile?.full_name)}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:11,fontWeight:700,color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{profile?.full_name||"User"}</div>
            <div style={{fontSize:9,color:"rgba(255,255,255,0.35)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{profile?.email||""}</div>
          </div>
        </div>
      </div>

      {/* ── MIDDLE: Message list ─────────────────────────────────── */}
      <div style={{width:320,flexShrink:0,borderRight:"1px solid #e5e7eb",display:"flex",flexDirection:"column",background:"#fff",height:"100%",overflow:"hidden"}}>
        {/* Header + search */}
        <div style={{padding:"16px 16px 10px",borderBottom:"1px solid #e5e7eb"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <h2 style={{fontSize:16,fontWeight:800,color:"#111827",margin:0}}>{FOLDERS.find(f=>f.id===folder)?.label||"Inbox"}</h2>
            <div style={{display:"flex",gap:4}}>
              <button className="tool-btn" onClick={load} style={{padding:5,borderRadius:7,border:"none",background:"transparent",lineHeight:0}}>
                <RefreshCw style={{width:13,height:13,color:"#6b7280",animation:loading?"spin 1s linear infinite":undefined}}/>
              </button>
              <button className="tool-btn" onClick={()=>setComposing(true)} style={{padding:5,borderRadius:7,border:"none",background:"transparent",lineHeight:0}}>
                <Plus style={{width:13,height:13,color:"#6b7280"}}/>
              </button>
            </div>
          </div>
          {/* Search */}
          <div style={{position:"relative"}}>
            <Search style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",width:13,height:13,color:"#9ca3af"}}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search messages..."
              style={{...inp,paddingLeft:30,height:34,fontSize:12,background:"#f9fafb",border:"1px solid #e5e7eb"}}/>
            {search&&<button onClick={()=>setSearch("")} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#9ca3af",lineHeight:0}}>
              <X style={{width:12,height:12}}/>
            </button>}
          </div>
          {/* Tabs */}
          {folder==="inbox"&&(
            <div style={{display:"flex",gap:2,marginTop:10,background:"#f3f4f6",borderRadius:8,padding:3}}>
              {(["all","read","unread"] as const).map(t=>(
                <button key={t} onClick={()=>setTab(t)}
                  style={{flex:1,padding:"5px 0",fontSize:11,fontWeight:tab===t?700:400,borderRadius:6,border:"none",cursor:"pointer",background:tab===t?"#fff":"transparent",color:tab===t?"#111827":"#6b7280",boxShadow:tab===t?"0 1px 3px rgba(0,0,0,0.1)":"none",transition:"all 0.12s"}}>
                  {t.charAt(0).toUpperCase()+t.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Message rows */}
        <div style={{flex:1,overflowY:"auto"}}>
          {loading&&<div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"30px 0",gap:8,color:"#9ca3af",fontSize:12}}>
            <RefreshCw style={{width:13,height:13,animation:"spin 1s linear infinite"}}/>Loading...
          </div>}
          {!loading&&filtered.length===0&&<div style={{textAlign:"center",padding:"40px 20px",color:"#9ca3af"}}>
            <Mail style={{width:32,height:32,margin:"0 auto 10px",color:"#e5e7eb"}}/>
            <div style={{fontSize:13,fontWeight:600,color:"#374151"}}>No messages</div>
          </div>}
          {filtered.map(msg=>{
            const isActive=selected?.id===msg.id;
            const isStarred=starredIds.has(msg.id);
            return(
              <div key={msg.id} className={`msg-row${isActive?" active":""}`}
                onClick={()=>openMsg(msg)}
                onContextMenu={e=>{e.preventDefault();setCtx({x:e.clientX,y:e.clientY,msg});}}
                style={{
                  display:"flex",alignItems:"flex-start",gap:10,
                  padding:"11px 14px",borderBottom:"1px solid #f3f4f6",
                  background:isActive?"#eff6ff":msg.is_read?"#fff":"#f8faff",
                  borderRight:isActive?"3px solid #0a2558":"3px solid transparent",
                  position:"relative",
                }}>
                {/* Unread dot */}
                <div style={{width:7,height:7,borderRadius:"50%",background:msg.is_read?"transparent":"#0a2558",flexShrink:0,marginTop:6}}/>
                {/* Avatar */}
                <div style={{width:34,height:34,borderRadius:"50%",background:avatarBg(msg.from_name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#fff",flexShrink:0}}>
                  {initials(msg.from_name)}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:6}}>
                    <span style={{fontSize:12,fontWeight:msg.is_read?500:700,color:"#111827",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const,maxWidth:160}}>{msg.from_name||"System"}</span>
                    <span style={{fontSize:9.5,color:"#9ca3af",flexShrink:0}}>{timeStr(msg.created_at)}</span>
                  </div>
                  <div style={{fontSize:11.5,fontWeight:msg.is_read?400:600,color:msg.is_read?"#374151":"#111827",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const,marginTop:1}}>{msg.subject}</div>
                  <div style={{fontSize:10.5,color:"#9ca3af",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const,marginTop:2}}>{msg.body.slice(0,60)}...</div>
                </div>
                {isStarred&&<Star style={{width:12,height:12,color:"#f59e0b",fill:"#f59e0b",flexShrink:0,marginTop:4}}/>}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT: Email reader ──────────────────────────────────── */}
      <div style={{flex:1,display:"flex",flexDirection:"column",height:"100%",overflow:"hidden",background:"#fff"}}>
        {!selected&&!composing&&(
          <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12,color:"#9ca3af"}}>
            <Mail style={{width:48,height:48,color:"#e5e7eb"}}/>
            <div style={{fontSize:14,fontWeight:600,color:"#374151"}}>Select a message to read</div>
            <div style={{fontSize:12,color:"#9ca3af"}}>or compose a new one</div>
            <button onClick={()=>setComposing(true)} style={{marginTop:8,display:"flex",alignItems:"center",gap:8,padding:"9px 20px",background:"#0a2558",color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:700}}>
              <Edit3 style={{width:13,height:13}}/> New Message
            </button>
          </div>
        )}

        {/* Compose window */}
        {composing&&(
          <div style={{flex:1,display:"flex",flexDirection:"column",padding:24,overflow:"auto"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
              <h3 style={{fontSize:16,fontWeight:800,color:"#111827",margin:0}}>New Message</h3>
              <button onClick={()=>setComposing(false)} style={{background:"none",border:"none",cursor:"pointer",color:"#6b7280",lineHeight:0,padding:4}}>
                <X style={{width:18,height:18}}/>
              </button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10,maxWidth:680}}>
              <div>
                <label style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.05em",display:"block",marginBottom:4}}>To</label>
                <input value={compose.to} onChange={e=>setCompose(p=>({...p,to:e.target.value}))} placeholder="recipient@email.com" style={inp}/>
              </div>
              <div>
                <label style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.05em",display:"block",marginBottom:4}}>Subject</label>
                <input value={compose.subject} onChange={e=>setCompose(p=>({...p,subject:e.target.value}))} placeholder="Message subject" style={inp}/>
              </div>
              <div>
                <label style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.05em",display:"block",marginBottom:4}}>Message</label>
                <textarea value={compose.body} onChange={e=>setCompose(p=>({...p,body:e.target.value}))} placeholder="Write your message here..." rows={12}
                  style={{...inp,resize:"vertical" as const,minHeight:200}}/>
              </div>
              <div style={{display:"flex",gap:10}}>
                <button onClick={sendCompose} disabled={sending}
                  style={{display:"flex",alignItems:"center",gap:8,padding:"9px 20px",background:"#0a2558",color:"#fff",border:"none",borderRadius:9,cursor:"pointer",fontSize:13,fontWeight:700,opacity:sending?0.7:1}}>
                  {sending?<RefreshCw style={{width:13,height:13,animation:"spin 1s linear infinite"}}/>:<Send style={{width:13,height:13}}/>} Send
                </button>
                <button onClick={()=>setComposing(false)} style={{padding:"9px 16px",border:"1.5px solid #e5e7eb",borderRadius:9,background:"#fff",cursor:"pointer",fontSize:13,color:"#374151"}}>Discard</button>
              </div>
            </div>
          </div>
        )}

        {/* Email reader */}
        {selected&&!composing&&(
          <>
            {/* Toolbar */}
            <div style={{padding:"12px 20px",borderBottom:"1px solid #e5e7eb",display:"flex",alignItems:"center",gap:6,flexWrap:"wrap" as const}}>
              {[
                {icon:CornerUpLeft,label:"Reply",   action:()=>{setReplyMode(true);setReplyBody(`\n\n--- Original message ---\n${selected.body}`);}},
                {icon:Users,       label:"Reply All",action:()=>{setReplyMode(true);setReplyBody(`\n\n--- Original ---\n${selected.body}`);}},
                {icon:Forward,     label:"Forward", action:()=>{setCompose({to:"",subject:`Fwd: ${selected.subject}`,body:`\n\n--- Forwarded ---\n${selected.body}`});setComposing(true);}},
                {icon:Trash2,      label:"Delete",  action:()=>deleteMsg(selected.id)},
                {icon:Flag,        label:"Important",action:()=>toggleImportant(selected.id)},
              ].map(btn=>(
                <button key={btn.label} onClick={btn.action} className="tool-btn"
                  style={{display:"flex",alignItems:"center",gap:5,padding:"6px 11px",border:"1.5px solid #e5e7eb",borderRadius:8,background:"#fff",cursor:"pointer",fontSize:12,color:"#374151",fontWeight:500}}>
                  <btn.icon style={{width:13,height:13}}/>{btn.label}
                </button>
              ))}
              <div style={{flex:1}}/>
              <button className="tool-btn" onClick={()=>toggleStar(selected.id)} style={{padding:6,border:"1.5px solid #e5e7eb",borderRadius:8,background:"#fff",cursor:"pointer",lineHeight:0}}>
                <Star style={{width:14,height:14,color:starredIds.has(selected.id)?"#f59e0b":"#9ca3af",fill:starredIds.has(selected.id)?"#f59e0b":"none"}}/>
              </button>
              <button className="tool-btn" onClick={()=>markUnread(selected)} style={{padding:6,border:"1.5px solid #e5e7eb",borderRadius:8,background:"#fff",cursor:"pointer",lineHeight:0}}>
                <EyeOff style={{width:14,height:14,color:"#9ca3af"}}/>
              </button>
              <button className="tool-btn" onClick={()=>archive(selected.id)} style={{padding:6,border:"1.5px solid #e5e7eb",borderRadius:8,background:"#fff",cursor:"pointer",lineHeight:0}}>
                <Archive style={{width:14,height:14,color:"#9ca3af"}}/>
              </button>
            </div>

            {/* Email header */}
            <div style={{padding:"20px 24px",borderBottom:"1px solid #e5e7eb"}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:14,marginBottom:12}}>
                <div style={{width:42,height:42,borderRadius:"50%",background:avatarBg(selected.from_name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:"#fff",flexShrink:0}}>{initials(selected.from_name)}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"baseline",gap:10,justifyContent:"space-between"}}>
                    <span style={{fontSize:15,fontWeight:700,color:"#111827"}}>{selected.from_name||"System"}</span>
                    <span style={{fontSize:11,color:"#9ca3af"}}>{timeStr(selected.created_at)}</span>
                  </div>
                  <h2 style={{fontSize:14,fontWeight:700,color:"#111827",margin:"4px 0 2px"}}>{selected.subject}</h2>
                  {selected.from_email&&<div style={{fontSize:11,color:"#9ca3af"}}>From: <span style={{color:"#374151"}}>{selected.from_email}</span>{selected.to_email&&<> &nbsp;·&nbsp; To: <span style={{color:"#374151"}}>{selected.to_email}</span></>}</div>}
                </div>
              </div>
              {/* Tags */}
              <div style={{display:"flex",gap:6,flexWrap:"wrap" as const}}>
                <span style={{padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700,background:`${msgColor(selected.type)}15`,color:msgColor(selected.type)}}>{selected.type}</span>
                {selected.module&&<span style={{padding:"2px 8px",borderRadius:20,fontSize:10,background:"#f3f4f6",color:"#6b7280"}}>{selected.module}</span>}
                {importantIds.has(selected.id)&&<span style={{padding:"2px 8px",borderRadius:20,fontSize:10,background:"#fef3c7",color:"#d97706",fontWeight:700}}>⭐ Important</span>}
              </div>
            </div>

            {/* Body */}
            <div style={{flex:1,overflowY:"auto",padding:"24px"}}>
              <div style={{maxWidth:720,fontSize:13,color:"#374151",lineHeight:1.8,whiteSpace:"pre-wrap" as const}}>{selected.body}</div>
              {selected.action_url&&(
                <div style={{marginTop:20}}>
                  <a href={selected.action_url} style={{display:"inline-flex",alignItems:"center",gap:7,padding:"8px 16px",background:"#0a2558",color:"#fff",borderRadius:8,textDecoration:"none",fontSize:12,fontWeight:700}}>
                    <ChevronRight style={{width:13,height:13}}/> View in System
                  </a>
                </div>
              )}
            </div>

            {/* Reply panel */}
            {replyMode&&(
              <div style={{padding:"16px 24px",borderTop:"1px solid #e5e7eb",background:"#f9fafb"}}>
                <div style={{fontSize:11,color:"#6b7280",marginBottom:8}}>Replying to <strong style={{color:"#374151"}}>{selected.from_name}</strong></div>
                <textarea value={replyBody} onChange={e=>setReplyBody(e.target.value)} rows={5}
                  placeholder="Write your reply..." style={{...inp,resize:"none" as const,background:"#fff"}}/>
                <div style={{display:"flex",gap:8,marginTop:10}}>
                  <button onClick={sendReply} disabled={sending}
                    style={{display:"flex",alignItems:"center",gap:7,padding:"8px 16px",background:"#0a2558",color:"#fff",border:"none",borderRadius:9,cursor:"pointer",fontSize:12,fontWeight:700,opacity:sending?0.7:1}}>
                    {sending?<RefreshCw style={{width:12,height:12,animation:"spin 1s linear infinite"}}/>:<Send style={{width:12,height:12}}/>} Send Reply
                  </button>
                  <button onClick={()=>setReplyMode(false)} style={{padding:"8px 14px",border:"1.5px solid #e5e7eb",borderRadius:9,background:"#fff",cursor:"pointer",fontSize:12,color:"#374151"}}>Cancel</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── CONTEXT MENU ────────────────────────────────────────── */}
      {ctx&&(
        <div ref={ctxRef} style={{position:"fixed",left:Math.min(ctx.x,window.innerWidth-220),top:Math.min(ctx.y,window.innerHeight-380),width:210,background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",boxShadow:"0 8px 28px rgba(0,0,0,0.18)",zIndex:2000,overflow:"hidden",fontFamily:"'Segoe UI',sans-serif"}}>
          {[
            {label:"Open",         icon:Eye,       action:()=>openMsg(ctx.msg)},
            {label:"Reply",        icon:CornerUpLeft, action:()=>{openMsg(ctx.msg);setTimeout(()=>setReplyMode(true),50);}},
            {label:"Reply All",    icon:Users,     action:()=>{openMsg(ctx.msg);setTimeout(()=>setReplyMode(true),50);}},
            {label:"Forward",      icon:Forward,   action:()=>{setCompose({to:"",subject:`Fwd: ${ctx.msg.subject}`,body:`\n\n--- Fwd ---\n${ctx.msg.body}`});setComposing(true);setCtx(null);}},
            {label:"Forward w/ attachment", icon:Paperclip, action:()=>toast({title:"No attachments"})},
            null,
            {label:ctx.msg.is_read?"Mark as unread":"Mark as read", icon:ctx.msg.is_read?EyeOff:Eye, action:()=>{ctx.msg.is_read?markUnread(ctx.msg):markRead(ctx.msg);setCtx(null);}},
            {label:"Move to Junk", icon:VolumeX,   action:()=>{deleteMsg(ctx.msg.id);setCtx(null);}},
            {label:"Mute",         icon:VolumeX,   action:()=>toast({title:"Muted"})},
            {label:"Delete",       icon:Trash2,    action:()=>{deleteMsg(ctx.msg.id);setCtx(null);}, danger:true},
            null,
            {label:"Star",         icon:Star,      action:()=>{toggleStar(ctx.msg.id);setCtx(null);}, starRow:true},
            {label:"Archive",      icon:Archive,   action:()=>{archive(ctx.msg.id);setCtx(null);}},
            {label:"Move to",      icon:MoveRight, action:()=>toast({title:"Coming soon"})},
            {label:"Copy to",      icon:Copy,      action:()=>toast({title:"Coming soon"})},
          ].map((item,i)=>{
            if(item===null) return <div key={i} style={{height:1,background:"#f3f4f6",margin:"3px 0"}}/>;
            const it=item as any;
            if(it.starRow){
              return(
                <div key={i} className="ctx-item" style={{display:"flex",alignItems:"center",gap:10,padding:"7px 14px",cursor:"pointer"}}
                  onClick={()=>{it.action();}}>
                  <Star style={{width:13,height:13,color:"#9ca3af"}}/>
                  <span style={{flex:1,fontSize:12,color:"#374151"}}>Star</span>
                  <div style={{display:"flex",gap:3}}>
                    {["#ef4444","#f97316","#eab308","#22c55e","#3b82f6","#a855f7","#9ca3af"].map(c=>(
                      <button key={c} onClick={e=>{e.stopPropagation();toggleStar(ctx.msg.id);setCtx(null);}} style={{width:14,height:14,borderRadius:"50%",background:c,border:"none",cursor:"pointer",padding:0}}/>
                    ))}
                  </div>
                </div>
              );
            }
            return(
              <button key={i} className="ctx-item" onClick={it.action}
                style={{display:"flex",alignItems:"center",gap:10,padding:"7px 14px",border:"none",background:"transparent",cursor:"pointer",width:"100%",textAlign:"left" as const,fontSize:12,color:it.danger?"#dc2626":"#374151"}}>
                <it.icon style={{width:13,height:13,color:it.danger?"#dc2626":"#9ca3af"}}/>{it.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
