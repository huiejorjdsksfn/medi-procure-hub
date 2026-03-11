import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, RefreshCw, Check, CheckCheck, Mail, Settings, AlertTriangle, ShoppingCart, Package, DollarSign, Gavel, Shield, Layers, Activity } from "lucide-react";

type NType = "info"|"success"|"warning"|"error"|"email"|"procurement"|"voucher"|"grn"|"tender"|"quality"|"inventory"|"system";

interface Notif {
  id: string; title: string; message: string; type: NType;
  is_read: boolean; created_at: string;
  action_url?: string; module?: string; source?: "notification"|"inbox";
}

function timeAgo(date:string){
  const d=(Date.now()-new Date(date).getTime())/1000;
  if(d<60) return "just now";
  if(d<3600) return `${Math.floor(d/60)}m ago`;
  if(d<86400) return `${Math.floor(d/3600)}h ago`;
  return new Date(date).toLocaleDateString("en-KE",{day:"2-digit",month:"short"});
}

function notifEmoji(type:string){
  if(type==="error") return "❌";
  if(type==="warning") return "⚠️";
  if(type==="success") return "✅";
  if(type==="email") return "✉️";
  if(type==="procurement") return "📋";
  if(type==="grn") return "📦";
  if(type==="voucher") return "💰";
  if(type==="tender") return "⚖️";
  return "🔔";
}

function notifColor(type:string){
  if(type==="error") return "#dc2626";
  if(type==="warning") return "#d97706";
  if(type==="success") return "#16a34a";
  if(type==="email") return "#7c3aed";
  if(type==="procurement") return "#0078d4";
  if(type==="grn") return "#107c10";
  if(type==="voucher") return "#C45911";
  if(type==="tender") return "#1F6090";
  return "#0078d4";
}

/* Win98 Toast */
function Win98Toast({ n, onClose }: { n:Notif; onClose:()=>void }) {
  const navigate = useNavigate();
  const [vis, setVis] = useState(false);
  const [prog, setProg] = useState(100);

  useEffect(()=>{
    const t1=setTimeout(()=>setVis(true),50);
    const t2=setTimeout(()=>{ setVis(false); setTimeout(onClose,320); },7000);
    const iv=setInterval(()=>setProg(p=>Math.max(0,p-100/70)),100);
    return()=>{ clearTimeout(t1); clearTimeout(t2); clearInterval(iv); };
  },[]);

  const dismiss=()=>{ setVis(false); setTimeout(onClose,300); };
  const isErr=n.type==="error", isWarn=n.type==="warning";
  const titleBar=isErr?"SYSTEM ERROR":isWarn?"WARNING":n.type==="success"?"Operation Complete":n.module||"Notification";
  const titleBg=isErr?"linear-gradient(90deg,#800000,#c00000)":isWarn?"linear-gradient(90deg,#808000,#b8a000)":"linear-gradient(90deg,#000082,#1086d8)";

  return(
    <div style={{width:320,fontFamily:"'Tahoma','MS Sans Serif',Arial,sans-serif",transform:vis?"translateX(0)":"translateX(120%)",opacity:vis?1:0,transition:"transform 0.28s cubic-bezier(0.4,0,0.2,1),opacity 0.28s",filter:"drop-shadow(3px 5px 14px rgba(0,0,0,0.5))",cursor:n.action_url?"pointer":"default"}}
      onClick={n.action_url?()=>{navigate(n.action_url!);dismiss();}:undefined}>
      <div style={{background:"#c0c0c0",border:"2px solid",borderColor:"#ffffff #404040 #404040 #ffffff",boxShadow:"inset 1px 1px 0 #dfdfdf,inset -1px -1px 0 #808080"}}>
        <div style={{background:titleBg,padding:"2px 4px",display:"flex",alignItems:"center",gap:5}}>
          <span style={{fontSize:9}}>{isErr?"🔴":isWarn?"🟡":"🔵"}</span>
          <span style={{flex:1,fontSize:11,fontWeight:700,color:"#fff",letterSpacing:"0.02em"}}>{titleBar}</span>
          <button onClick={e=>{e.stopPropagation();dismiss();}} style={{width:14,height:13,background:"#c0c0c0",border:"1px solid",borderColor:"#ffffff #404040 #404040 #ffffff",cursor:"pointer",fontSize:8,fontWeight:900,padding:0,color:"#000",fontFamily:"Tahoma,sans-serif",lineHeight:1}}>✕</button>
        </div>
        <div style={{padding:"10px 12px",display:"flex",gap:10,alignItems:"flex-start"}}>
          <div style={{fontSize:26,flexShrink:0,lineHeight:1}}>{notifEmoji(n.type)}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:12,fontWeight:700,color:"#000",marginBottom:3,lineHeight:1.3}}>{n.title}</div>
            <div style={{fontSize:11,color:"#333",lineHeight:1.4}}>{n.message.slice(0,100)}{n.message.length>100?"…":""}</div>
          </div>
        </div>
        <div style={{margin:"0 10px 6px",height:8,background:"#808080",border:"inset 1px solid #404040"}}>
          <div style={{height:"100%",background:"#000082",width:`${prog}%`,transition:"width 0.1s linear"}}/>
        </div>
        <div style={{display:"flex",justifyContent:"center",gap:8,padding:"4px 12px 8px"}}>
          <button onClick={e=>{e.stopPropagation();dismiss();}} style={{padding:"3px 20px",background:"#c0c0c0",border:"1px solid",borderColor:"#ffffff #404040 #404040 #ffffff",cursor:"pointer",fontSize:11,fontFamily:"Tahoma,sans-serif",color:"#000",boxShadow:"inset -1px -1px 0 #808080,inset 1px 1px 0 #dfdfdf"}}>OK</button>
          {n.action_url&&<button onClick={e=>{e.stopPropagation();navigate(n.action_url!);dismiss();}} style={{padding:"3px 14px",background:"#c0c0c0",border:"1px solid",borderColor:"#ffffff #404040 #404040 #ffffff",cursor:"pointer",fontSize:11,fontFamily:"Tahoma,sans-serif",color:"#000",boxShadow:"inset -1px -1px 0 #808080,inset 1px 1px 0 #dfdfdf"}}>View</button>}
        </div>
      </div>
    </div>
  );
}

/* Win98 Panel */
function Win98Panel({ onClose,notifs,loading,onMarkAll,onMarkOne,onRefresh,sysName,hospitalName }:{
  onClose:()=>void;notifs:Notif[];loading:boolean;
  onMarkAll:()=>void;onMarkOne:(id:string,src:string)=>void;onRefresh:()=>void;
  sysName?:string;hospitalName?:string;logoUrl?:string|null;
}) {
  const navigate=useNavigate();
  const [filter,setFilter]=useState<"all"|"unread"|"email"|"system">("all");
  const unread=notifs.filter(n=>!n.is_read).length;
  const filtered=notifs.filter(n=>{
    if(filter==="unread") return !n.is_read;
    if(filter==="email")  return n.type==="email"||n.source==="inbox";
    if(filter==="system") return ["info","warning","error","success","system"].includes(n.type);
    return true;
  });

  return(
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:1200}}/>
      <div style={{position:"fixed",top:56,right:12,width:390,zIndex:1300,fontFamily:"'Tahoma','MS Sans Serif',Arial,sans-serif",filter:"drop-shadow(4px 6px 20px rgba(0,0,0,0.5))"}}>
        <div style={{background:"#c0c0c0",border:"2px solid",borderColor:"#ffffff #404040 #404040 #ffffff",boxShadow:"inset 1px 1px 0 #dfdfdf,inset -1px -1px 0 #808080"}}>
          {/* Title bar */}
          <div style={{background:"linear-gradient(90deg,#000082,#1086d8)",padding:"3px 4px",display:"flex",alignItems:"center",gap:5}}>
            <span style={{fontSize:11}}>🔔</span>
            <span style={{flex:1,fontSize:11,fontWeight:700,color:"#fff"}}>Notification Center — {sysName||"EL5 MediProcure"}</span>
            <button onClick={onRefresh} style={{width:14,height:13,background:"#c0c0c0",border:"1px solid",borderColor:"#ffffff #404040 #404040 #ffffff",cursor:"pointer",fontSize:9,padding:0,color:"#000",display:"flex",alignItems:"center",justifyContent:"center"}}>↻</button>
            <button onClick={onClose} style={{width:14,height:13,background:"#c0c0c0",border:"1px solid",borderColor:"#ffffff #404040 #404040 #ffffff",cursor:"pointer",fontSize:9,fontWeight:900,padding:0,color:"#000"}}>✕</button>
          </div>
          {/* Filter toolbar */}
          <div style={{padding:"4px 6px",borderBottom:"1px solid #808080",display:"flex",alignItems:"center",gap:4,background:"#d4d0c8",flexWrap:"wrap" as const}}>
            {(["all","unread","email","system"] as const).map(f=>(
              <button key={f} onClick={()=>setFilter(f)} style={{padding:"2px 8px",fontSize:10,cursor:"pointer",fontFamily:"Tahoma,sans-serif",background:"#c0c0c0",color:"#000",border:"1px solid",borderColor:filter===f?"#404040 #ffffff #ffffff #404040":"#ffffff #404040 #404040 #ffffff",boxShadow:filter===f?"inset 1px 1px 0 #808080":"inset -1px -1px 0 #808080,inset 1px 1px 0 #dfdfdf",fontWeight:filter===f?700:400}}>
                {f==="all"?`All (${notifs.length})`:f==="unread"?`Unread (${unread})`:f.charAt(0).toUpperCase()+f.slice(1)}
              </button>
            ))}
            <div style={{flex:1}}/>
            {unread>0&&<button onClick={onMarkAll} style={{padding:"2px 8px",fontSize:9,cursor:"pointer",background:"#c0c0c0",border:"1px solid",borderColor:"#ffffff #404040 #404040 #ffffff",color:"#000",boxShadow:"inset -1px -1px 0 #808080,inset 1px 1px 0 #dfdfdf",fontFamily:"Tahoma,sans-serif"}}>Mark all read</button>}
          </div>
          {/* Info bar */}
          <div style={{padding:"2px 8px",background:"#d4d0c8",borderBottom:"1px solid #808080",fontSize:9,color:"#444"}}>{hospitalName||"Embu Level 5 Hospital"} · {unread} unread</div>
          {/* List */}
          <div style={{height:400,overflowY:"auto",background:"#fff",border:"inset 2px solid #808080",margin:6}}>
            {loading&&<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:60,gap:8,color:"#444",fontSize:11}}>Loading…</div>}
            {!loading&&filtered.length===0&&<div style={{textAlign:"center",padding:"30px 20px",fontSize:11,color:"#808080"}}><div style={{fontSize:28,marginBottom:8}}>📭</div>No notifications</div>}
            {filtered.map((n,i)=>(
              <div key={n.id}
                onClick={()=>{ if(!n.is_read)onMarkOne(n.id,n.source||"notification"); if(n.action_url){navigate(n.action_url);onClose();} }}
                style={{display:"flex",alignItems:"flex-start",gap:8,padding:"6px 8px",background:n.is_read?"#fff":i%2===0?"#ddeeff":"#cce0ff",borderBottom:"1px solid #e0e0e0",cursor:"pointer"}}
                onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="#316ac5";(e.currentTarget as HTMLElement).style.color="#fff";}}
                onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background=n.is_read?"#fff":i%2===0?"#ddeeff":"#cce0ff";(e.currentTarget as HTMLElement).style.color="";}} >
                <div style={{fontSize:16,flexShrink:0,marginTop:2}}>{notifEmoji(n.type)}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"baseline",gap:6,justifyContent:"space-between"}}>
                    <span style={{fontSize:11,fontWeight:n.is_read?400:700,color:"inherit",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const,maxWidth:220}}>{n.title}</span>
                    <span style={{fontSize:9,color:"inherit",opacity:0.7,flexShrink:0}}>{timeAgo(n.created_at)}</span>
                  </div>
                  <div style={{fontSize:10,color:"inherit",opacity:0.85,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{n.message}</div>
                  {n.module&&<div style={{fontSize:9,fontWeight:600,color:notifColor(n.type),marginTop:1}}>[{n.module}]</div>}
                </div>
                {!n.is_read&&<div style={{width:6,height:6,borderRadius:"50%",background:"#0078d4",flexShrink:0,marginTop:7}}/>}
              </div>
            ))}
          </div>
          {/* Status bar */}
          <div style={{padding:"3px 8px 5px",display:"flex",alignItems:"center",gap:6}}>
            <div style={{flex:1,background:"#c0c0c0",border:"inset 1px solid #808080",padding:"1px 6px",fontSize:9,color:"#000"}}>{filtered.length} item{filtered.length!==1?"s":""} · {unread} unread</div>
            <button onClick={()=>{navigate("/email");onClose();}} style={{padding:"2px 10px",fontSize:10,cursor:"pointer",background:"#c0c0c0",border:"1px solid",borderColor:"#ffffff #404040 #404040 #ffffff",color:"#000",fontFamily:"Tahoma,sans-serif",boxShadow:"inset -1px -1px 0 #808080,inset 1px 1px 0 #dfdfdf"}}>Open Inbox</button>
            <button onClick={onClose} style={{padding:"2px 10px",fontSize:10,cursor:"pointer",background:"#c0c0c0",border:"1px solid",borderColor:"#ffffff #404040 #404040 #ffffff",color:"#000",fontFamily:"Tahoma,sans-serif",boxShadow:"inset -1px -1px 0 #808080,inset 1px 1px 0 #dfdfdf"}}>Close</button>
          </div>
        </div>
      </div>
    </>
  );
}

export function NotificationBell({ logoUrl, sysName, hospitalName }:{logoUrl?:string|null;sysName?:string;hospitalName?:string;}) {
  const { user } = useAuth();
  const [panelOpen,setPanelOpen]=useState(false);
  const [notifs,setNotifs]=useState<Notif[]>([]);
  const [loading,setLoading]=useState(false);
  const [toasts,setToasts]=useState<Notif[]>([]);
  const prevIds=useRef<Set<string>>(new Set());

  const toNotif=(n:any,source:"notification"|"inbox"):Notif=>({
    id:source==="inbox"?`inbox-${n.id}`:n.id,
    title:source==="inbox"?(n.subject||"New message"):(n.title||"Notification"),
    message:source==="inbox"?`From ${n.from_name||"System"}: ${(n.body||"").slice(0,80)}`:(n.message||n.body||""),
    type:source==="inbox"?"email":((n.type||n.notification_type||"info") as NType),
    is_read:source==="inbox"?n.status==="read":!!n.is_read,
    created_at:n.created_at||new Date().toISOString(),
    action_url:source==="inbox"?"/email":(n.action_url||n.link),
    module:source==="inbox"?"Email":(n.module||n.category),
    source,
  });

  const load=useCallback(async()=>{
    if(!user)return;
    setLoading(true);
    const [nr,ir]=await Promise.all([
      (supabase as any).from("notifications").select("*").order("created_at",{ascending:false}).limit(40),
      (supabase as any).from("inbox_items").select("*").eq("to_user_id",user.id).neq("status","sent").order("created_at",{ascending:false}).limit(20),
    ]);
    const ns:Notif[]=[
      ...(nr.data||[]).map((n:any)=>toNotif(n,"notification")),
      ...(ir.data||[]).map((n:any)=>toNotif(n,"inbox")),
    ].sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime());
    setNotifs(ns);setLoading(false);
    ns.forEach(n=>prevIds.current.add(n.id));
  },[user]);

  useEffect(()=>{load();},[load]);

  useEffect(()=>{
    if(!user)return;
    const ch=(supabase as any).channel(`notif-bell-${user.id}`)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"notifications"},(p:any)=>{
        const n=p.new as any;
        if(n.user_id&&n.user_id!==user.id)return;
        const notif=toNotif(n,"notification");
        if(!prevIds.current.has(notif.id)){prevIds.current.add(notif.id);setToasts(prev=>[notif,...prev.slice(0,3)]);setNotifs(prev=>[notif,...prev]);}
      })
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"inbox_items"},(p:any)=>{
        const n=p.new as any;
        if(n.to_user_id!==user.id)return;
        const notif=toNotif(n,"inbox");
        if(!prevIds.current.has(notif.id)){prevIds.current.add(notif.id);setToasts(prev=>[notif,...prev.slice(0,3)]);setNotifs(prev=>[notif,...prev]);}
      })
      .subscribe();
    return()=>(supabase as any).removeChannel(ch);
  },[user]);

  const markAll=async()=>{
    if(!user)return;
    await (supabase as any).from("notifications").update({is_read:true}).eq("is_read",false);
    await (supabase as any).from("inbox_items").update({status:"read"}).eq("to_user_id",user.id).eq("status","unread");
    setNotifs(p=>p.map(n=>({...n,is_read:true})));
  };
  const markOne=async(id:string,source:string)=>{
    if(source==="inbox"){
      await (supabase as any).from("inbox_items").update({status:"read"}).eq("id",id.replace("inbox-",""));
    } else {
      await (supabase as any).from("notifications").update({is_read:true}).eq("id",id);
    }
    setNotifs(p=>p.map(n=>n.id===id?{...n,is_read:true}:n));
  };

  const unread=notifs.filter(n=>!n.is_read).length;

  return(
    <>
      <button onClick={()=>setPanelOpen(v=>!v)} title="Notifications"
        style={{position:"relative",padding:6,borderRadius:6,background:panelOpen?"rgba(255,255,255,0.15)":"transparent",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.6)",lineHeight:0}}
        onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.1)"}
        onMouseLeave={e=>{if(!panelOpen)(e.currentTarget as HTMLElement).style.background="transparent";}}>
        <Bell style={{width:15,height:15}}/>
        {unread>0&&<span style={{position:"absolute",top:-2,right:-2,minWidth:15,height:15,borderRadius:8,background:"#ef4444",color:"#fff",fontSize:8,fontWeight:800,padding:"0 3px",display:"flex",alignItems:"center",justifyContent:"center"}}>{unread>99?"99+":unread}</span>}
      </button>

      {panelOpen&&<Win98Panel onClose={()=>setPanelOpen(false)} notifs={notifs} loading={loading} onMarkAll={markAll} onMarkOne={markOne} onRefresh={load} logoUrl={logoUrl} sysName={sysName} hospitalName={hospitalName}/>}

      <div style={{position:"fixed",bottom:20,right:20,display:"flex",flexDirection:"column",gap:10,zIndex:1400,pointerEvents:"none"}}>
        {toasts.map(t=>(
          <div key={t.id} style={{pointerEvents:"all"}}>
            <Win98Toast n={t} onClose={()=>setToasts(p=>p.filter(x=>x.id!==t.id))}/>
          </div>
        ))}
      </div>
    </>
  );
}
