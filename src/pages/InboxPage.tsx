import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { sendNotification } from "@/lib/notify";
import {
  Inbox, Send, RefreshCw, Search, Star, Archive, Reply, Trash2,
  Bell, Mail, CheckCheck, Filter, ChevronRight, X, Plus,
  ShoppingCart, Package, DollarSign, AlertTriangle, Info,
  CheckCircle, Clock, Gavel, Shield, Activity, Layers, Settings,
  CornerUpLeft, Eye, MoreHorizontal
} from "lucide-react";

const TYPE_CFG: Record<string,{icon:any;color:string;bg:string;label:string}> = {
  email:        {icon:Mail,          color:"#7c3aed", bg:"#f5f3ff", label:"Email"},
  info:         {icon:Info,          color:"#0078d4", bg:"#eff6ff", label:"Info"},
  success:      {icon:CheckCircle,   color:"#16a34a", bg:"#f0fdf4", label:"Success"},
  warning:      {icon:AlertTriangle, color:"#d97706", bg:"#fffbeb", label:"Warning"},
  error:        {icon:AlertTriangle, color:"#dc2626", bg:"#fef2f2", label:"Alert"},
  procurement:  {icon:ShoppingCart,  color:"#0078d4", bg:"#eff6ff", label:"Procurement"},
  grn:          {icon:Package,       color:"#107c10", bg:"#f0fdf4", label:"GRN"},
  voucher:      {icon:DollarSign,    color:"#C45911", bg:"#fff7ed", label:"Voucher"},
  tender:       {icon:Gavel,         color:"#1F6090", bg:"#f0f9ff", label:"Tender"},
  quality:      {icon:Shield,        color:"#059669", bg:"#f0fdf4", label:"Quality"},
  inventory:    {icon:Layers,        color:"#374151", bg:"#f9fafb", label:"Inventory"},
  system:       {icon:Settings,      color:"#6b7280", bg:"#f9fafb", label:"System"},
  approval:     {icon:CheckCircle,   color:"#1a3a6b", bg:"#eff6ff", label:"Approval"},
  message:      {icon:Mail,          color:"#374151", bg:"#f9fafb", label:"Message"},
  task:         {icon:CheckCircle,   color:"#059669", bg:"#f0fdf4", label:"Task"},
  default:      {icon:Bell,          color:"#6b7280", bg:"#f9fafb", label:"Notification"},
};

const PRI_CFG: Record<string,{bg:string;color:string;label:string}> = {
  urgent: {bg:"#fee2e2",color:"#dc2626",label:"Urgent"},
  high:   {bg:"#fef3c7",color:"#b45309",label:"High"},
  normal: {bg:"#f3f4f6",color:"#6b7280",label:"Normal"},
  low:    {bg:"#f0fdf4",color:"#16a34a",label:"Low"},
};

function tc(type:string) { return TYPE_CFG[type] || TYPE_CFG.default; }
function timeAgo(d:string) {
  const s=(Date.now()-new Date(d).getTime())/1000;
  if(s<60) return "just now";
  if(s<3600) return `${Math.floor(s/60)}m ago`;
  if(s<86400) return `${Math.floor(s/3600)}h ago`;
  return new Date(d).toLocaleDateString("en-KE",{day:"2-digit",month:"short",year:"2-digit"});
}

interface Msg {
  id:string; source:"inbox"|"notification";
  type:string; subject:string; body:string;
  from_user_id?:string; from_name?:string;
  to_user_id?:string; priority?:string;
  status?:string; is_read?:boolean;
  is_starred?:boolean; created_at:string;
  module?:string; action_url?:string;
  record_type?:string; record_id?:string;
  reply_body?:string; replied_at?:string;
}

const FOLDERS = [
  {id:"all",       label:"All Messages",   icon:Inbox,    color:"#1a3a6b"},
  {id:"unread",    label:"Unread",         icon:Bell,     color:"#ef4444"},
  {id:"email",     label:"Emails",         icon:Mail,     color:"#7c3aed"},
  {id:"starred",   label:"Starred",        icon:Star,     color:"#f59e0b"},
  {id:"procurement",label:"Procurement",   icon:ShoppingCart,color:"#0078d4"},
  {id:"grn",       label:"GRN",            icon:Package,  color:"#107c10"},
  {id:"voucher",   label:"Vouchers",       icon:DollarSign,color:"#C45911"},
  {id:"tender",    label:"Tenders",        icon:Gavel,    color:"#1F6090"},
  {id:"quality",   label:"Quality",        icon:Shield,   color:"#059669"},
  {id:"system",    label:"System",         icon:Settings, color:"#6b7280"},
  {id:"sent",      label:"Sent",           icon:Send,     color:"#9ca3af"},
  {id:"archived",  label:"Archived",       icon:Archive,  color:"#d1d5db"},
];

export default function InboxPage() {
  const {user, profile, roles} = useAuth();
  const navigate = useNavigate();
  const isAdmin = roles.includes("admin") || roles.includes("procurement_manager");

  const [msgs,      setMsgs]      = useState<Msg[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [folder,    setFolder]    = useState("all");
  const [selected,  setSelected]  = useState<Msg|null>(null);
  const [search,    setSearch]    = useState("");
  const [replying,  setReplying]  = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending,   setSending]   = useState(false);
  const [profiles,  setProfiles]  = useState<any[]>([]);

  const toMsg = (r:any, source:"inbox"|"notification"): Msg => {
    if(source==="inbox") return {
      id:`inbox-${r.id}`, source:"inbox",
      type: r.type||"email",
      subject: r.subject||"(no subject)",
      body: r.body||"",
      from_user_id: r.from_user_id,
      from_name: r.from_profile?.full_name || r.from_name || "System",
      to_user_id: r.to_user_id,
      priority: r.priority||"normal",
      status: r.status||"unread",
      is_read: r.status!=="unread",
      is_starred: !!r.is_starred,
      created_at: r.created_at,
      module: r.module||r.record_type,
      record_type: r.record_type,
      record_id: r.record_id,
      reply_body: r.reply_body,
      replied_at: r.replied_at,
    };
    return {
      id:`notif-${r.id}`, source:"notification",
      type: r.type||"info",
      subject: r.title||r.subject||"Notification",
      body: r.message||r.body||"",
      from_user_id: r.sender_id,
      from_name: "System",
      to_user_id: r.user_id,
      priority: r.priority||"normal",
      status: r.is_read?"read":"unread",
      is_read: !!r.is_read,
      is_starred: false,
      created_at: r.created_at,
      module: r.module||r.category,
      action_url: r.action_url||r.link,
    };
  };

  const load = useCallback(async()=>{
    if(!user) return;
    setLoading(true);
    const [inboxRes, notifRes] = await Promise.all([
      (supabase as any).from("inbox_items").select("*,from_profile:profiles!from_user_id(full_name,email)")
        .or(`to_user_id.eq.${user.id},from_user_id.eq.${user.id}`).order("created_at",{ascending:false}).limit(200),
      (supabase as any).from("notifications").select("*").order("created_at",{ascending:false}).limit(100),
    ]);
    const inbox: Msg[] = (inboxRes.data||[]).map((r:any)=>toMsg(r,"inbox"));
    const notifs: Msg[] = (notifRes.data||[])
      .filter((r:any)=> !r.user_id || r.user_id===user.id)
      .map((r:any)=>toMsg(r,"notification"));
    // Deduplicate by merging both sources, sort newest first
    const all = [...inbox,...notifs].sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime());
    setMsgs(all);
    setLoading(false);
  },[user]);

  useEffect(()=>{ load(); },[load]);
  useEffect(()=>{
    (supabase as any).from("profiles").select("id,full_name,email,department").order("full_name").limit(300)
      .then(({data}:any)=>setProfiles(data||[]));
  },[]);
  useEffect(()=>{
    if(!user) return;
    const ch=(supabase as any).channel(`inbox-page-${user.id}`)
      .on("postgres_changes",{event:"*",schema:"public",table:"inbox_items"},load)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"notifications"},load)
      .subscribe();
    return()=>(supabase as any).removeChannel(ch);
  },[user,load]);

  const markRead = async(msg:Msg)=>{
    if(msg.is_read) return;
    if(msg.source==="inbox"){
      const realId=msg.id.replace("inbox-","");
      await(supabase as any).from("inbox_items").update({status:"read"}).eq("id",realId);
    } else {
      const realId=msg.id.replace("notif-","");
      await(supabase as any).from("notifications").update({is_read:true}).eq("id",realId);
    }
    setMsgs(p=>p.map(m=>m.id===msg.id?{...m,is_read:true,status:"read"}:m));
  };

  const markAllRead = async()=>{
    await(supabase as any).from("inbox_items").update({status:"read"}).eq("to_user_id",user?.id).eq("status","unread");
    await(supabase as any).from("notifications").update({is_read:true}).eq("is_read",false);
    setMsgs(p=>p.map(m=>({...m,is_read:true,status:m.status==="unread"?"read":m.status})));
    toast({title:"All marked as read ✓"});
  };

  const toggleStar = async(msg:Msg)=>{
    if(msg.source!=="inbox") return;
    const realId=msg.id.replace("inbox-","");
    await(supabase as any).from("inbox_items").update({is_starred:!msg.is_starred}).eq("id",realId);
    setMsgs(p=>p.map(m=>m.id===msg.id?{...m,is_starred:!m.is_starred}:m));
    if(selected?.id===msg.id) setSelected(m=>m?{...m,is_starred:!m.is_starred}:m);
  };

  const archiveMsg = async(msg:Msg)=>{
    if(msg.source==="inbox"){
      const realId=msg.id.replace("inbox-","");
      await(supabase as any).from("inbox_items").update({status:"archived"}).eq("id",realId);
      toast({title:"Archived ✓"});
      setMsgs(p=>p.map(m=>m.id===msg.id?{...m,status:"archived"}:m));
      if(selected?.id===msg.id) setSelected(null);
    }
  };

  const deleteMsg = async(msg:Msg)=>{
    if(!confirm("Delete this message permanently?")) return;
    if(msg.source==="inbox"){
      const realId=msg.id.replace("inbox-","");
      await(supabase as any).from("inbox_items").delete().eq("id",realId);
    } else {
      const realId=msg.id.replace("notif-","");
      await(supabase as any).from("notifications").delete().eq("id",realId);
    }
    toast({title:"Deleted ✓"});
    setMsgs(p=>p.filter(m=>m.id!==msg.id));
    if(selected?.id===msg.id) setSelected(null);
  };

  const sendReply = async()=>{
    if(!replyText.trim()||!selected||!selected.from_user_id) return;
    setSending(true);
    const{error}=await(supabase as any).from("inbox_items").insert({
      type:"email", subject:`Re: ${selected.subject}`,
      body:replyText, from_user_id:user?.id, to_user_id:selected.from_user_id,
      priority:"normal", status:"unread", record_type:"email",
    });
    if(error){toast({title:"Reply failed",description:error.message,variant:"destructive"});setSending(false);return;}
    // Notify recipient
    await sendNotification({
      userId:selected.from_user_id, title:`Reply: ${selected.subject.slice(0,60)}`,
      message:`${profile?.full_name||"Staff"} replied: ${replyText.slice(0,80)}`,
      type:"email", module:"Email", actionUrl:"/inbox", senderId:user?.id,
    });
    // Sent copy
    await(supabase as any).from("inbox_items").insert({
      type:"email", subject:`Re: ${selected.subject}`, body:replyText,
      from_user_id:user?.id, to_user_id:user?.id, priority:"normal", status:"sent",
    });
    toast({title:"Reply sent ✓"}); setReplying(false); setReplyText("");
    load(); setSending(false);
  };

  const open = (msg:Msg)=>{
    setSelected(msg); setReplying(false); setReplyText("");
    markRead(msg);
    if(msg.action_url && msg.source==="notification") {
      // don't auto-navigate, show it in panel
    }
  };

  // Filter logic
  const filtered = msgs.filter(m=>{
    const txt=search.toLowerCase();
    const textOk=!search||[m.subject,m.body,m.from_name,m.module].some(v=>String(v||"").toLowerCase().includes(txt));
    if(!textOk) return false;
    if(folder==="all") return m.status!=="archived" && m.status!=="sent" && m.to_user_id===user?.id;
    if(folder==="unread") return !m.is_read && m.to_user_id===user?.id;
    if(folder==="starred") return !!m.is_starred;
    if(folder==="sent") return m.source==="inbox" && m.from_user_id===user?.id && m.status==="sent";
    if(folder==="archived") return m.status==="archived";
    return m.type===folder && m.to_user_id===user?.id;
  });

  const unreadCount = msgs.filter(m=>!m.is_read && m.to_user_id===user?.id).length;

  return (
    <div style={{display:"flex",height:"calc(100vh - 52px)",fontFamily:"'Inter','Segoe UI',sans-serif",background:"#f0f2f5"}}>

      {/* ── SIDEBAR ── */}
      <div style={{width:220,background:"#fff",borderRight:"1px solid #e5e7eb",display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{padding:"10px 12px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)"}}>
          <div style={{fontSize:14,fontWeight:800,color:"#fff",display:"flex",alignItems:"center",gap:6}}>
            <Inbox style={{width:14,height:14}}/> Inbox
          </div>
          <div style={{fontSize:10,color:"rgba(255,255,255,0.45)"}}>Messages & Notifications</div>
        </div>
        <div style={{padding:"10px 12px",borderBottom:"1px solid #f3f4f6"}}>
          <button onClick={()=>navigate("/email")} style={{width:"100%",display:"flex",alignItems:"center",gap:7,padding:"8px 12px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:700}}>
            <Plus style={{width:12,height:12}}/> Compose Email
          </button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"4px 0"}}>
          {FOLDERS.map(f=>{
            const cnt = f.id==="unread"?unreadCount:f.id==="all"?msgs.filter(m=>m.to_user_id===user?.id&&m.status!=="archived"&&m.status!=="sent").length:0;
            return (
              <button key={f.id} onClick={()=>{setFolder(f.id);setSelected(null);}}
                style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 14px",border:"none",background:folder===f.id?`${f.color}10`:"transparent",cursor:"pointer",textAlign:"left" as const,borderLeft:folder===f.id?`3px solid ${f.color}`:"3px solid transparent",transition:"all 0.1s"}}>
                <div style={{width:22,height:22,borderRadius:5,background:folder===f.id?`${f.color}18`:"#f3f4f6",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <f.icon style={{width:11,height:11,color:folder===f.id?f.color:"#9ca3af"}}/>
                </div>
                <span style={{fontSize:13,fontWeight:folder===f.id?700:500,color:folder===f.id?f.color:"#374151",flex:1}}>{f.label}</span>
                {cnt>0&&<span style={{fontSize:10,fontWeight:800,padding:"1px 6px",borderRadius:9,background:f.color,color:"#fff",minWidth:18,textAlign:"center" as const}}>{cnt>99?"99+":cnt}</span>}
              </button>
            );
          })}
        </div>
        <div style={{padding:"7px 12px",borderTop:"1px solid #f3f4f6",background:"#f9fafb",fontSize:10,color:"#9ca3af",fontWeight:600}}>
          EL5 MediProcure · Embu L5H
        </div>
      </div>

      {/* ── MESSAGE LIST ── */}
      <div style={{width:340,background:"#fff",borderRight:"1px solid #e5e7eb",display:"flex",flexDirection:"column",flexShrink:0}}>
        {/* Toolbar */}
        <div style={{padding:"8px 12px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
          <span style={{fontSize:13,fontWeight:700,color:"#111827",flex:1}}>
            {FOLDERS.find(f=>f.id===folder)?.label||"All"} <span style={{color:"#9ca3af",fontWeight:500,fontSize:11}}>({filtered.length})</span>
          </span>
          {unreadCount>0&&<button onClick={markAllRead} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,fontWeight:700,color:"#1d4ed8",background:"#dbeafe",border:"none",padding:"3px 8px",borderRadius:4,cursor:"pointer"}}>
            <CheckCheck style={{width:10,height:10}}/> All read
          </button>}
          <button onClick={load} style={{background:"transparent",border:"none",cursor:"pointer",color:"#9ca3af",lineHeight:0,padding:3}}>
            <RefreshCw style={{width:12,height:12}} className={loading?"animate-spin":""}/>
          </button>
        </div>
        {/* Search */}
        <div style={{padding:"6px 10px",borderBottom:"1px solid #f3f4f6",flexShrink:0}}>
          <div style={{position:"relative"}}>
            <Search style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",width:11,height:11,color:"#9ca3af"}}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search messages…"
              style={{width:"100%",paddingLeft:26,padding:"7px 10px 7px 26px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:6,outline:"none",background:"#f9fafb"}}/>
          </div>
        </div>
        {/* List */}
        <div style={{flex:1,overflowY:"auto"}}>
          {loading?[1,2,3,4,5].map(i=>(
            <div key={i} style={{padding:"10px 12px",borderBottom:"1px solid #f9fafb",display:"flex",gap:8}}>
              <div style={{width:34,height:34,borderRadius:8,background:"#f3f4f6",flexShrink:0}} className="animate-pulse"/>
              <div style={{flex:1}}><div style={{height:11,background:"#f3f4f6",borderRadius:4,marginBottom:5,width:"65%"}} className="animate-pulse"/><div style={{height:9,background:"#f3f4f6",borderRadius:4,width:"45%"}} className="animate-pulse"/></div>
            </div>
          )):filtered.length===0?(
            <div style={{padding:"36px 20px",textAlign:"center" as const}}>
              <Inbox style={{width:36,height:36,color:"#e5e7eb",margin:"0 auto 10px"}}/>
              <div style={{fontSize:14,fontWeight:600,color:"#9ca3af"}}>No messages</div>
              <div style={{fontSize:12,color:"#d1d5db",marginTop:3}}>Nothing in {FOLDERS.find(f=>f.id===folder)?.label}</div>
            </div>
          ):filtered.map(msg=>{
            const cfg=tc(msg.type);
            const isActive=selected?.id===msg.id;
            const isUnread=!msg.is_read;
            return (
              <div key={msg.id} onClick={()=>open(msg)}
                style={{padding:"10px 12px",borderBottom:"1px solid #f9fafb",cursor:"pointer",
                  background:isActive?"#eff6ff":isUnread?"#fafcff":"transparent",
                  borderLeft:isActive?"3px solid #1a3a6b":isUnread?`3px solid ${cfg.color}`:"3px solid transparent",
                  transition:"background 0.1s"}}
                onMouseEnter={e=>{if(!isActive)(e.currentTarget as HTMLElement).style.background="#f9fafb";}}
                onMouseLeave={e=>{if(!isActive)(e.currentTarget as HTMLElement).style.background=isUnread?"#fafcff":"transparent";}}>
                <div style={{display:"flex",gap:9,alignItems:"flex-start"}}>
                  <div style={{width:34,height:34,borderRadius:8,background:cfg.bg,border:`1px solid ${cfg.color}28`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <cfg.icon style={{width:15,height:15,color:cfg.color}}/>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",justifyContent:"space-between",gap:4,marginBottom:2}}>
                      <span style={{fontSize:13,fontWeight:isUnread?700:500,color:"#111827",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const,flex:1}}>
                        {msg.source==="notification"?msg.from_name||"System":msg.from_name||"System"}
                      </span>
                      <span style={{fontSize:10,color:"#9ca3af",whiteSpace:"nowrap" as const,flexShrink:0}}>{timeAgo(msg.created_at)}</span>
                    </div>
                    <div style={{fontSize:12,fontWeight:isUnread?600:400,color:"#374151",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const,marginBottom:2}}>{msg.subject}</div>
                    <div style={{fontSize:11,color:"#9ca3af",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{msg.body.replace(/\n/g," ").slice(0,60)}</div>
                    <div style={{display:"flex",gap:5,marginTop:4,alignItems:"center"}}>
                      <span style={{fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:3,background:cfg.bg,color:cfg.color}}>{cfg.label}</span>
                      {msg.module&&<span style={{fontSize:9,color:"#9ca3af"}}>{msg.module}</span>}
                      {msg.is_starred&&<Star style={{width:10,height:10,color:"#f59e0b",fill:"#f59e0b"}}/>}
                      {msg.priority&&msg.priority!=="normal"&&<span style={{fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:3,...(PRI_CFG[msg.priority]||PRI_CFG.normal)}}>{PRI_CFG[msg.priority]?.label}</span>}
                      {isUnread&&<div style={{width:6,height:6,borderRadius:"50%",background:cfg.color,marginLeft:"auto"}}/>}
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
            <div style={{padding:"12px 18px",borderBottom:"1px solid #f3f4f6",flexShrink:0}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:12,flexWrap:"wrap" as const}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                    {(()=>{const cfg=tc(selected.type);return(<div style={{width:36,height:36,borderRadius:9,background:cfg.bg,border:`1px solid ${cfg.color}30`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><cfg.icon style={{width:17,height:17,color:cfg.color}}/></div>);})()}
                    <div>
                      <div style={{fontSize:17,fontWeight:800,color:"#111827",lineHeight:1.2}}>{selected.subject}</div>
                      <div style={{fontSize:12,color:"#9ca3af",marginTop:2,display:"flex",gap:8,flexWrap:"wrap" as const}}>
                        <span>From: <strong style={{color:"#374151"}}>{selected.from_name||"System"}</strong></span>
                        {selected.module&&<><span>·</span><span style={{fontWeight:600,color:"#6b7280"}}>{selected.module}</span></>}
                        <span style={{color:"#d1d5db"}}>·</span>
                        <span>{new Date(selected.created_at).toLocaleString("en-KE",{dateStyle:"medium",timeStyle:"short"})}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap" as const}}>
                    {(()=>{const cfg=tc(selected.type);return <span style={{fontSize:11,fontWeight:700,padding:"2px 9px",borderRadius:4,background:cfg.bg,color:cfg.color}}>{cfg.label}</span>;})()}
                    {selected.priority&&selected.priority!=="normal"&&<span style={{fontSize:11,fontWeight:700,padding:"2px 9px",borderRadius:4,...(PRI_CFG[selected.priority]||{})}}>{PRI_CFG[selected.priority]?.label||selected.priority}</span>}
                    {selected.module&&<span style={{fontSize:11,padding:"2px 9px",borderRadius:4,background:"#f3f4f6",color:"#6b7280"}}>{selected.module}</span>}
                    {selected.source==="inbox"&&<span style={{fontSize:11,padding:"2px 9px",borderRadius:4,background:"#eff6ff",color:"#1a3a6b"}}>{selected.status}</span>}
                  </div>
                </div>
                <div style={{display:"flex",gap:6,flexShrink:0,flexWrap:"wrap" as const}}>
                  {selected.source==="inbox"&&<>
                    <button onClick={()=>toggleStar(selected)} style={{padding:"6px 9px",background:selected.is_starred?"#fef3c7":"#f3f4f6",border:`1px solid ${selected.is_starred?"#fde68a":"#e5e7eb"}`,borderRadius:6,cursor:"pointer",lineHeight:0}}>
                      <Star style={{width:13,height:13,color:selected.is_starred?"#f59e0b":"#9ca3af",fill:selected.is_starred?"#f59e0b":"none"}}/>
                    </button>
                    {selected.from_user_id&&selected.from_user_id!==user?.id&&<button onClick={()=>{setReplying(r=>!r);setReplyText("");}}
                      style={{display:"flex",alignItems:"center",gap:5,padding:"6px 13px",background:replying?"#1a3a6b":"#f3f4f6",border:`1px solid ${replying?"#1a3a6b":"#e5e7eb"}`,borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:700,color:replying?"#fff":"#374151"}}>
                      <CornerUpLeft style={{width:13,height:13}}/> Reply
                    </button>}
                    <button onClick={()=>archiveMsg(selected)} style={{padding:"6px 9px",background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:6,cursor:"pointer",lineHeight:0}}>
                      <Archive style={{width:13,height:13,color:"#9ca3af"}}/>
                    </button>
                  </>}
                  {selected.action_url&&<button onClick={()=>navigate(selected.action_url!)}
                    style={{display:"flex",alignItems:"center",gap:5,padding:"6px 13px",background:"#C45911",border:"none",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:700,color:"#fff"}}>
                    <ChevronRight style={{width:13,height:13}}/> View Item
                  </button>}
                  <button onClick={()=>deleteMsg(selected)} style={{padding:"6px 9px",background:"#fee2e2",border:"1px solid #fecaca",borderRadius:6,cursor:"pointer",lineHeight:0}}>
                    <Trash2 style={{width:13,height:13,color:"#dc2626"}}/>
                  </button>
                </div>
              </div>
            </div>

            {/* Body */}
            <div style={{flex:1,overflowY:"auto",padding:"22px 26px"}}>
              <pre style={{fontFamily:"'Inter','Segoe UI',sans-serif",fontSize:14,lineHeight:1.85,color:"#374151",whiteSpace:"pre-wrap" as const,wordBreak:"break-word" as const,margin:0}}>{selected.body}</pre>
              {selected.reply_body&&(
                <div style={{marginTop:24,paddingTop:16,borderTop:"1px dashed #e5e7eb"}}>
                  <div style={{fontSize:11,color:"#9ca3af",marginBottom:8,display:"flex",alignItems:"center",gap:5}}>
                    <CornerUpLeft style={{width:11,height:11}}/> Previous reply · {selected.replied_at&&new Date(selected.replied_at).toLocaleDateString("en-KE")}
                  </div>
                  <pre style={{fontFamily:"'Inter',sans-serif",fontSize:13,lineHeight:1.75,color:"#6b7280",whiteSpace:"pre-wrap" as const,background:"#f9fafb",padding:"12px 16px",borderRadius:8,borderLeft:"3px solid #e5e7eb",margin:0}}>{selected.reply_body}</pre>
                </div>
              )}
            </div>

            {/* Reply box */}
            {replying&&(
              <div style={{borderTop:"2px solid #e5e7eb",padding:"12px 18px",background:"#f9fafb",flexShrink:0}}>
                <div style={{fontSize:12,fontWeight:700,color:"#374151",marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
                  <CornerUpLeft style={{width:13,height:13,color:"#1a3a6b"}}/> Reply to {selected.from_name}
                </div>
                <textarea value={replyText} onChange={e=>setReplyText(e.target.value)} rows={5}
                  placeholder="Write your reply…"
                  style={{width:"100%",padding:"10px 12px",fontSize:13,border:"1px solid #e5e7eb",borderRadius:7,outline:"none",fontFamily:"'Inter',sans-serif",lineHeight:1.7,resize:"none" as const}}/>
                <div style={{display:"flex",gap:7,marginTop:8}}>
                  <button onClick={sendReply} disabled={sending||!replyText.trim()}
                    style={{display:"flex",alignItems:"center",gap:6,padding:"8px 18px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:13,fontWeight:700,opacity:sending||!replyText.trim()?0.7:1}}>
                    {sending?<RefreshCw style={{width:13,height:13}} className="animate-spin"/>:<Send style={{width:13,height:13}}/>}
                    {sending?"Sending…":"Send Reply"}
                  </button>
                  <button onClick={()=>setReplying(false)} style={{padding:"8px 14px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:7,cursor:"pointer",fontSize:13,color:"#374151"}}>Cancel</button>
                </div>
              </div>
            )}

            {/* Footer */}
            <div style={{padding:"5px 18px",borderTop:"1px solid #f3f4f6",background:"#f9fafb",display:"flex",justifyContent:"space-between",fontSize:10,color:"#9ca3af",flexShrink:0}}>
              <span>Embu Level 5 Hospital · EL5 MediProcure</span>
              <span>{selected.source==="notification"?"System Notification":"Internal Message"}</span>
            </div>
          </>
        ):(
          <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14,color:"#9ca3af",padding:32}}>
            <div style={{width:72,height:72,borderRadius:18,background:"linear-gradient(135deg,#0a2558,#1a3a6b)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Inbox style={{width:32,height:32,color:"rgba(255,255,255,0.8)"}}/>
            </div>
            <div style={{textAlign:"center" as const}}>
              <div style={{fontSize:16,fontWeight:700,color:"#374151"}}>Select a message</div>
              <div style={{fontSize:13,color:"#9ca3af",marginTop:4}}>Click any item in the list to read it</div>
            </div>
            {unreadCount>0&&<div style={{padding:"8px 18px",background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:8,fontSize:13,fontWeight:600,color:"#1d4ed8"}}>
              📬 You have {unreadCount} unread message{unreadCount!==1?"s":""}
            </div>}
          </div>
        )}
      </div>
    </div>
  );
}
