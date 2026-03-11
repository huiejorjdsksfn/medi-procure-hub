import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Bell, X, Check, CheckCheck, Mail, ShoppingCart, Package,
  DollarSign, AlertTriangle, Info, Gavel, ClipboardList,
  FileText, ChevronRight, RefreshCw, Settings, Shield,
  Activity, BarChart3, Layers, Truck, Users
} from "lucide-react";

type NType = "info"|"success"|"warning"|"error"|"email"|"procurement"|"voucher"|"grn"|"tender"|"quality"|"inventory"|"system";

interface Notif {
  id: string;
  title: string;
  message: string;
  type: NType;
  is_read: boolean;
  created_at: string;
  action_url?: string;
  module?: string;
  source?: "notification"|"inbox";
}

const TYPE_CFG: Record<string,{icon:any;color:string;bg:string;border:string}> = {
  info:        {icon:Info,          color:"#0078d4", bg:"#eff6ff",  border:"#bfdbfe"},
  success:     {icon:Check,         color:"#16a34a", bg:"#f0fdf4",  border:"#bbf7d0"},
  warning:     {icon:AlertTriangle, color:"#d97706", bg:"#fffbeb",  border:"#fde68a"},
  error:       {icon:AlertTriangle, color:"#dc2626", bg:"#fef2f2",  border:"#fecaca"},
  email:       {icon:Mail,          color:"#7c3aed", bg:"#f5f3ff",  border:"#ddd6fe"},
  procurement: {icon:ShoppingCart,  color:"#0078d4", bg:"#eff6ff",  border:"#bfdbfe"},
  voucher:     {icon:DollarSign,    color:"#C45911", bg:"#fff7ed",  border:"#fed7aa"},
  grn:         {icon:Package,       color:"#107c10", bg:"#f0fdf4",  border:"#bbf7d0"},
  tender:      {icon:Gavel,         color:"#1F6090", bg:"#f0f9ff",  border:"#bae6fd"},
  quality:     {icon:Shield,        color:"#059669", bg:"#f0fdf4",  border:"#a7f3d0"},
  inventory:   {icon:Layers,        color:"#374151", bg:"#f9fafb",  border:"#e5e7eb"},
  system:      {icon:Settings,      color:"#6b7280", bg:"#f9fafb",  border:"#e5e7eb"},
};

function cfg(type: string) { return TYPE_CFG[type] || TYPE_CFG.info; }

function timeAgo(date: string) {
  const d = (Date.now() - new Date(date).getTime()) / 1000;
  if (d < 60)    return "just now";
  if (d < 3600)  return `${Math.floor(d/60)}m ago`;
  if (d < 86400) return `${Math.floor(d/3600)}h ago`;
  return new Date(date).toLocaleDateString("en-KE",{day:"2-digit",month:"short"});
}

/* ── Toast ── */
function Toast({ n, onClose, logoUrl, hospitalName, sysName }: {
  n: Notif; onClose:()=>void;
  logoUrl?:string|null; hospitalName?:string; sysName?:string;
}) {
  const navigate = useNavigate();
  const c = cfg(n.type);
  const [vis, setVis] = useState(false);

  useEffect(()=>{
    const t1 = setTimeout(()=>setVis(true), 50);
    const t2 = setTimeout(()=>{ setVis(false); setTimeout(onClose,320); }, 7000);
    return()=>{ clearTimeout(t1); clearTimeout(t2); };
  },[]);

  const dismiss = ()=>{ setVis(false); setTimeout(onClose,320); };

  return (
    <div onClick={n.action_url?()=>{navigate(n.action_url!);dismiss();}:undefined}
      style={{
        width:360, background:"#fff",
        border:`1px solid ${c.border}`, borderLeft:`4px solid ${c.color}`,
        borderRadius:10, boxShadow:"0 10px 36px rgba(0,0,0,0.16)",
        overflow:"hidden", cursor:n.action_url?"pointer":"default",
        transform:vis?"translateX(0)":"translateX(110%)",
        opacity:vis?1:0,
        transition:"transform 0.32s cubic-bezier(0.4,0,0.2,1), opacity 0.32s ease",
      }}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:c.bg,borderBottom:`1px solid ${c.border}`}}>
        {logoUrl
          ?<img src={logoUrl} alt="" style={{height:18,width:18,objectFit:"contain",borderRadius:3}} onError={e=>(e.target as HTMLImageElement).style.display="none"}/>
          :<div style={{width:18,height:18,borderRadius:3,background:"#0a2558",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:7,color:"#fff",fontWeight:900}}>EL5</span></div>
        }
        <span style={{fontSize:11,fontWeight:700,color:"#6b7280",flex:1}}>{sysName||"EL5 MediProcure"}</span>
        <span style={{fontSize:10,color:"#9ca3af"}}>{timeAgo(n.created_at)}</span>
        <button onClick={e=>{e.stopPropagation();dismiss();}} style={{background:"transparent",border:"none",cursor:"pointer",color:"#9ca3af",lineHeight:0,padding:2}}>
          <X style={{width:11,height:11}}/>
        </button>
      </div>
      {/* Body */}
      <div style={{padding:"10px 12px",display:"flex",gap:10}}>
        <div style={{width:34,height:34,borderRadius:8,background:c.bg,border:`1px solid ${c.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <c.icon style={{width:16,height:16,color:c.color}}/>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13,fontWeight:700,color:"#111827",marginBottom:2,lineHeight:1.3}}>{n.title}</div>
          <div style={{fontSize:12,color:"#6b7280",lineHeight:1.5}}>{n.message}</div>
          {n.action_url&&<div style={{display:"flex",alignItems:"center",gap:3,marginTop:5,fontSize:11,color:c.color,fontWeight:700}}>View <ChevronRight style={{width:10,height:10}}/></div>}
        </div>
      </div>
      {/* Footer */}
      <div style={{padding:"5px 12px",background:"#fafafa",borderTop:`1px solid ${c.border}`,display:"flex",justifyContent:"space-between"}}>
        <span style={{fontSize:10,color:"#9ca3af"}}>{hospitalName||"Embu Level 5 Hospital"}</span>
        <span style={{fontSize:10,color:c.color,fontWeight:700,textTransform:"uppercase" as const,letterSpacing:"0.04em"}}>{n.module||n.type}</span>
      </div>
      {/* Progress */}
      <div style={{height:2,background:c.border}}>
        <div style={{height:"100%",background:c.color,animation:"notif-progress 7s linear forwards"}}/>
      </div>
    </div>
  );
}

/* ── Notification Panel ── */
function Panel({ onClose, notifs, onMarkAll, onMarkOne, loading, logoUrl, sysName, hospitalName, onRefresh }: {
  onClose:()=>void; notifs:Notif[]; onMarkAll:()=>void; onMarkOne:(id:string,src:string)=>void;
  loading:boolean; logoUrl?:string|null; sysName?:string; hospitalName?:string; onRefresh:()=>void;
}) {
  const navigate = useNavigate();
  const unread = notifs.filter(n=>!n.is_read).length;
  const [filter, setFilter] = useState<"all"|"unread"|NType>("all");

  const filtered = filter==="all"?notifs : filter==="unread"?notifs.filter(n=>!n.is_read) : notifs.filter(n=>n.type===filter);

  return (
    <div style={{position:"fixed",inset:0,zIndex:1200}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        position:"fixed",top:0,right:0,bottom:0,width:420,
        background:"#fff",display:"flex",flexDirection:"column",
        boxShadow:"-8px 0 32px rgba(0,0,0,0.18)",
        borderLeft:"1px solid #e5e7eb",
        animation:"slideInRight 0.25s ease-out",
      }}>
        {/* Header */}
        <div style={{padding:"14px 16px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
          {logoUrl
            ?<img src={logoUrl} alt="" style={{height:28,width:28,objectFit:"contain",borderRadius:5,background:"rgba(255,255,255,0.15)",padding:3}}/>
            :<div style={{width:28,height:28,borderRadius:6,background:"rgba(255,255,255,0.18)",display:"flex",alignItems:"center",justifyContent:"center"}}><Bell style={{width:14,height:14,color:"#fff"}}/></div>
          }
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:700,color:"#fff"}}>Notifications</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.45)"}}>{sysName||"EL5 MediProcure"}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            {unread>0&&<span style={{background:"#ef4444",color:"#fff",fontSize:11,fontWeight:800,padding:"2px 8px",borderRadius:12}}>{unread} new</span>}
            <button onClick={onRefresh} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:5,padding:5,cursor:"pointer",color:"#fff",lineHeight:0}}>
              <RefreshCw style={{width:12,height:12}}/>
            </button>
            <button onClick={onClose} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:5,padding:5,cursor:"pointer",color:"#fff",lineHeight:0}}>
              <X style={{width:13,height:13}}/>
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div style={{display:"flex",gap:0,padding:"8px 14px",borderBottom:"1px solid #f3f4f6",background:"#f9fafb",overflowX:"auto",flexShrink:0}}>
          {(["all","unread","email","procurement","grn","tender","voucher","quality"] as const).map(f=>(
            <button key={f} onClick={()=>setFilter(f as any)}
              style={{padding:"5px 10px",border:"none",borderRadius:5,cursor:"pointer",fontSize:11,fontWeight:filter===f?700:500,color:filter===f?"#fff":"#9ca3af",background:filter===f?"#1a3a6b":"transparent",whiteSpace:"nowrap" as const,flexShrink:0}}>
              {f==="all"?`All (${notifs.length})`:f==="unread"?`Unread (${unread})`:f}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 14px",borderBottom:"1px solid #f3f4f6",flexShrink:0}}>
          <span style={{fontSize:12,color:"#6b7280"}}>{filtered.length} notification{filtered.length!==1?"s":""}</span>
          <div style={{display:"flex",gap:6}}>
            {unread>0&&<button onClick={onMarkAll} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 10px",background:"transparent",border:"1px solid #e5e7eb",borderRadius:5,cursor:"pointer",fontSize:11,fontWeight:600,color:"#374151"}}>
              <CheckCheck style={{width:11,height:11}}/> Mark all read
            </button>}
            <button onClick={()=>{navigate("/inbox");onClose();}} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 10px",background:"#1a3a6b",border:"none",borderRadius:5,cursor:"pointer",fontSize:11,fontWeight:700,color:"#fff"}}>
              <Mail style={{width:11,height:11}}/> Inbox
            </button>
          </div>
        </div>

        {/* List */}
        <div style={{flex:1,overflowY:"auto"}}>
          {loading ? [1,2,3].map(i=>(
            <div key={i} style={{padding:"12px 14px",borderBottom:"1px solid #f9fafb",display:"flex",gap:10}}>
              <div style={{width:36,height:36,borderRadius:8,background:"#f3f4f6"}} className="animate-pulse"/>
              <div style={{flex:1}}><div style={{height:11,background:"#f3f4f6",borderRadius:4,marginBottom:6,width:"70%"}} className="animate-pulse"/><div style={{height:9,background:"#f3f4f6",borderRadius:4,width:"50%"}} className="animate-pulse"/></div>
            </div>
          )) : filtered.length===0 ? (
            <div style={{padding:"40px 20px",textAlign:"center" as const}}>
              <Bell style={{width:36,height:36,color:"#e5e7eb",margin:"0 auto 10px"}}/>
              <div style={{fontSize:14,fontWeight:600,color:"#9ca3af"}}>All caught up!</div>
              <div style={{fontSize:12,color:"#d1d5db",marginTop:4}}>No {filter!=="all"?filter+" ":""} notifications</div>
            </div>
          ) : filtered.map(n=>{
            const c=cfg(n.type);
            return (
              <div key={n.id} onClick={()=>{onMarkOne(n.id,n.source||"notification");if(n.action_url)navigate(n.action_url);}}
                style={{display:"flex",gap:10,padding:"12px 14px",borderBottom:"1px solid #f9fafb",borderLeft:n.is_read?"4px solid transparent":`4px solid ${c.color}`,background:n.is_read?"#fff":c.bg,cursor:"pointer",transition:"background 0.12s"}}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f8fafc"}
                onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=n.is_read?"#fff":c.bg}>
                <div style={{width:36,height:36,borderRadius:8,background:`${c.color}18`,border:`1px solid ${c.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <c.icon style={{width:16,height:16,color:c.color}}/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:4}}>
                    <span style={{fontSize:13,fontWeight:n.is_read?500:700,color:"#111827",flex:1,lineHeight:1.3}}>{n.title}</span>
                    <span style={{fontSize:10,color:"#9ca3af",whiteSpace:"nowrap" as const,flexShrink:0}}>{timeAgo(n.created_at)}</span>
                  </div>
                  <div style={{fontSize:12,color:"#6b7280",marginTop:2,lineHeight:1.4}}>{n.message}</div>
                  {n.module&&<span style={{display:"inline-block",marginTop:4,fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:3,background:`${c.color}18`,color:c.color,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>{n.module}</span>}
                </div>
                {!n.is_read&&<div style={{width:7,height:7,borderRadius:"50%",background:c.color,flexShrink:0,marginTop:6}}/>}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{padding:"10px 14px",background:"#f9fafb",borderTop:"1px solid #e5e7eb",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:"#374151"}}>{hospitalName||"Embu Level 5 Hospital"}</div>
            <div style={{fontSize:10,color:"#9ca3af"}}>{sysName||"EL5 MediProcure"} · Embu County Government</div>
          </div>
          <button onClick={()=>{navigate("/settings");onClose();}} style={{background:"transparent",border:"none",cursor:"pointer",color:"#9ca3af"}}>
            <Settings style={{width:13,height:13}}/>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Bell button (exported) ── */
export function NotificationBell({ logoUrl, sysName, hospitalName }: { logoUrl?:string|null; sysName?:string; hospitalName?:string }) {
  const { user } = useAuth();
  const [panelOpen, setPanelOpen] = useState(false);
  const [notifs,    setNotifs]    = useState<Notif[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [toasts,    setToasts]    = useState<Notif[]>([]);
  const prevIds = useRef<Set<string>>(new Set());

  const toNotif = (n: any, source: "notification"|"inbox"): Notif => ({
    id: source==="inbox" ? `inbox-${n.id}` : n.id,
    title: source==="inbox" ? (n.subject||"New message") : (n.title||"Notification"),
    message: source==="inbox"
      ? `From ${n.from_name||"System"}: ${(n.body||"").slice(0,80)}`
      : (n.message||n.body||""),
    type: source==="inbox" ? "email" : ((n.type||n.notification_type||"info") as NType),
    is_read: source==="inbox" ? n.status==="read" : !!n.is_read,
    created_at: n.created_at||new Date().toISOString(),
    action_url: source==="inbox" ? "/inbox" : (n.action_url||n.link),
    module: source==="inbox" ? "Email" : (n.module||n.category),
    source,
  });

  const load = useCallback(async()=>{
    if(!user) return;
    setLoading(true);
    const [notifRes, inboxRes] = await Promise.all([
      (supabase as any).from("notifications").select("*").order("created_at",{ascending:false}).limit(40),
      (supabase as any).from("inbox_items").select("*").eq("to_user_id",user.id).neq("status","sent").order("created_at",{ascending:false}).limit(20),
    ]);
    const ns: Notif[] = [
      ...(notifRes.data||[]).map((n:any)=>toNotif(n,"notification")),
      ...(inboxRes.data||[]).map((n:any)=>toNotif(n,"inbox")),
    ].sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime());
    setNotifs(ns);
    setLoading(false);
  },[user]);

  useEffect(()=>{ load(); },[load]);

  // Real-time
  useEffect(()=>{
    if(!user) return;
    const ch=(supabase as any).channel(`notif-bell-${user.id}`)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"notifications"},(p:any)=>{
        const n=p.new as any;
        if(n.user_id&&n.user_id!==user.id) return;
        const notif=toNotif(n,"notification");
        if(!prevIds.current.has(notif.id)){
          prevIds.current.add(notif.id);
          setToasts(prev=>[notif,...prev.slice(0,2)]);
          setNotifs(prev=>[notif,...prev]);
        }
      })
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"inbox_items"},(p:any)=>{
        const n=p.new as any;
        if(n.to_user_id!==user.id) return;
        const notif=toNotif(n,"inbox");
        if(!prevIds.current.has(notif.id)){
          prevIds.current.add(notif.id);
          setToasts(prev=>[notif,...prev.slice(0,2)]);
          setNotifs(prev=>[notif,...prev]);
        }
      })
      .subscribe();
    return()=>(supabase as any).removeChannel(ch);
  },[user]);

  const markAll = async()=>{
    if(!user) return;
    await (supabase as any).from("notifications").update({is_read:true}).eq("is_read",false);
    await (supabase as any).from("inbox_items").update({status:"read"}).eq("to_user_id",user.id).eq("status","unread");
    setNotifs(p=>p.map(n=>({...n,is_read:true})));
  };

  const markOne = async(id:string, source:string)=>{
    if(source==="inbox"){
      const realId = id.replace("inbox-","");
      await (supabase as any).from("inbox_items").update({status:"read"}).eq("id",realId);
    } else {
      await (supabase as any).from("notifications").update({is_read:true}).eq("id",id);
    }
    setNotifs(p=>p.map(n=>n.id===id?{...n,is_read:true}:n));
  };

  const unread = notifs.filter(n=>!n.is_read).length;

  return (
    <>
      <button onClick={()=>setPanelOpen(v=>!v)} title="Notifications"
        style={{position:"relative",padding:6,borderRadius:6,background:"transparent",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.6)",lineHeight:0}}
        onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.1)"}
        onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
        <Bell style={{width:15,height:15}}/>
        {unread>0&&<span style={{position:"absolute",top:-2,right:-2,minWidth:15,height:15,borderRadius:8,background:"#ef4444",color:"#fff",fontSize:8,fontWeight:800,padding:"0 3px",display:"flex",alignItems:"center",justifyContent:"center"}}>{unread>99?"99+":unread}</span>}
      </button>

      {panelOpen&&<Panel onClose={()=>setPanelOpen(false)} notifs={notifs} loading={loading} onMarkAll={markAll} onMarkOne={markOne} logoUrl={logoUrl} sysName={sysName} hospitalName={hospitalName} onRefresh={load}/>}

      {/* Toast stack */}
      <div style={{position:"fixed",bottom:20,right:20,display:"flex",flexDirection:"column",gap:10,zIndex:1400,pointerEvents:"none"}}>
        {toasts.map(t=>(
          <div key={t.id} style={{pointerEvents:"all"}}>
            <Toast n={t} logoUrl={logoUrl} sysName={sysName} hospitalName={hospitalName} onClose={()=>setToasts(p=>p.filter(x=>x.id!==t.id))}/>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes notif-progress { from{width:100%} to{width:0%} }
        @keyframes slideInRight { from{transform:translateX(100%);opacity:0} to{transform:translateX(0);opacity:1} }
      `}</style>
    </>
  );
}
