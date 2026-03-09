import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Bell, X, Check, CheckCheck, Mail, ShoppingCart, Package,
  DollarSign, AlertTriangle, Info, Gavel, ClipboardList,
  FileText, ChevronRight, RefreshCw, Settings
} from "lucide-react";

type NotifType = "info"|"success"|"warning"|"error"|"email"|"procurement"|"voucher"|"grn"|"tender";

interface Notif {
  id: string;
  title: string;
  message: string;
  type: NotifType;
  is_read: boolean;
  created_at: string;
  action_url?: string;
  module?: string;
}

const TYPE_CFG: Record<NotifType,{icon:any;color:string;bg:string;border:string}> = {
  info:        {icon:Info,          color:"#0078d4", bg:"#eff6ff",  border:"#bfdbfe"},
  success:     {icon:Check,         color:"#16a34a", bg:"#f0fdf4",  border:"#bbf7d0"},
  warning:     {icon:AlertTriangle, color:"#d97706", bg:"#fffbeb",  border:"#fde68a"},
  error:       {icon:AlertTriangle, color:"#dc2626", bg:"#fef2f2",  border:"#fecaca"},
  email:       {icon:Mail,          color:"#7c3aed", bg:"#f5f3ff",  border:"#ddd6fe"},
  procurement: {icon:ShoppingCart,  color:"#0078d4", bg:"#eff6ff",  border:"#bfdbfe"},
  voucher:     {icon:DollarSign,    color:"#C45911", bg:"#fff7ed",  border:"#fed7aa"},
  grn:         {icon:Package,       color:"#107c10", bg:"#f0fdf4",  border:"#bbf7d0"},
  tender:      {icon:Gavel,         color:"#1F6090", bg:"#f0f9ff",  border:"#bae6fd"},
};

function timeAgo(date: string) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60)   return "just now";
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff/3600)}h ago`;
  return new Date(date).toLocaleDateString("en-KE",{day:"2-digit",month:"short"});
}

/* ── Toast-style slide-in notification ── */
function ToastNotif({ notif, onClose, logoUrl, hospitalName, sysName }: {
  notif: Notif; onClose: ()=>void;
  logoUrl?: string|null; hospitalName?: string; sysName?: string;
}) {
  const navigate = useNavigate();
  const cfg = TYPE_CFG[notif.type] || TYPE_CFG.info;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // animate in
    setTimeout(() => setVisible(true), 50);
    // auto-dismiss after 6s
    const t = setTimeout(() => { setVisible(false); setTimeout(onClose, 320); }, 6000);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => { setVisible(false); setTimeout(onClose, 320); };
  const handleClick = () => {
    if (notif.action_url) navigate(notif.action_url);
    dismiss();
  };

  return (
    <div style={{
      width: 360,
      background: "#fff",
      border: `1px solid ${cfg.border}`,
      borderLeft: `4px solid ${cfg.color}`,
      borderRadius: 10,
      boxShadow: "0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)",
      overflow: "hidden",
      transform: visible ? "translateX(0)" : "translateX(110%)",
      opacity: visible ? 1 : 0,
      transition: "transform 0.32s cubic-bezier(0.4,0,0.2,1), opacity 0.32s ease",
      cursor: notif.action_url ? "pointer" : "default",
    }}>
      {/* Header with logo */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 12px", background: cfg.bg,
        borderBottom: `1px solid ${cfg.border}`,
      }}>
        {logoUrl
          ? <img src={logoUrl} alt="" style={{height:20, width:20, objectFit:"contain", borderRadius:3}} onError={e=>(e.target as HTMLImageElement).style.display="none"}/>
          : <div style={{width:20,height:20,borderRadius:4,background:"#1a3a6b",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <span style={{fontSize:8,color:"#fff",fontWeight:900}}>EL5</span>
            </div>
        }
        <span style={{fontSize:10,fontWeight:700,color:"#6b7280",flex:1}}>{sysName||"EL5 MediProcure"}</span>
        <span style={{fontSize:9,color:"#9ca3af"}}>{timeAgo(notif.created_at)}</span>
        <button onClick={e=>{e.stopPropagation();dismiss();}} style={{background:"transparent",border:"none",cursor:"pointer",padding:"2px",color:"#9ca3af",lineHeight:0}}>
          <X style={{width:12,height:12}}/>
        </button>
      </div>

      {/* Body */}
      <div onClick={handleClick} style={{padding:"10px 12px", display:"flex", gap:10, alignItems:"flex-start"}}>
        <div style={{width:32,height:32,borderRadius:8,background:cfg.bg,border:`1px solid ${cfg.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <cfg.icon style={{width:16,height:16,color:cfg.color}}/>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13,fontWeight:700,color:"#111827",marginBottom:2,lineHeight:1.3}}>{notif.title}</div>
          <div style={{fontSize:11,color:"#6b7280",lineHeight:1.5}}>{notif.message}</div>
          {notif.action_url && (
            <div style={{display:"flex",alignItems:"center",gap:3,marginTop:6,fontSize:10,color:cfg.color,fontWeight:700}}>
              View details <ChevronRight style={{width:10,height:10}}/>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding:"5px 12px", background:"#fafafa",
        borderTop:`1px solid ${cfg.border}`,
        display:"flex", alignItems:"center", justifyContent:"space-between",
      }}>
        <span style={{fontSize:9,color:"#9ca3af"}}>{hospitalName||"Embu Level 5 Hospital"}</span>
        <span style={{fontSize:9,color:cfg.color,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em"}}>{notif.module||notif.type}</span>
      </div>

      {/* Progress bar */}
      <div style={{height:2,background:cfg.border}}>
        <div style={{height:"100%",background:cfg.color,animation:"notif-progress 6s linear forwards"}}/>
      </div>
    </div>
  );
}

/* ── Notification Panel (slide-in from right) ── */
function NotificationPanel({ onClose, notifs, onMarkAll, onMarkOne, loading, logoUrl, sysName, hospitalName }: {
  onClose:()=>void; notifs:Notif[]; onMarkAll:()=>void;
  onMarkOne:(id:string)=>void; loading:boolean;
  logoUrl?:string|null; sysName?:string; hospitalName?:string;
}) {
  const navigate = useNavigate();
  const unreadCount = notifs.filter(n=>!n.is_read).length;

  return (
    <div style={{position:"fixed",inset:0,zIndex:1200}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        position:"fixed", top:0, right:0, bottom:0, width:400,
        background:"#fff", display:"flex", flexDirection:"column",
        boxShadow:"-8px 0 32px rgba(0,0,0,0.18)",
        borderLeft:"1px solid #e5e7eb",
        animation:"slideInRight 0.25s ease-out",
      }}>
        {/* Panel header with logo */}
        <div style={{
          padding:"14px 16px",
          background:"linear-gradient(135deg,#0a2558,#1a3a6b)",
          display:"flex", alignItems:"center", gap:10,
          flexShrink:0,
        }}>
          {logoUrl
            ? <img src={logoUrl} alt="" style={{height:28,width:28,objectFit:"contain",borderRadius:5,background:"rgba(255,255,255,0.15)",padding:3}}/>
            : <div style={{width:28,height:28,borderRadius:6,background:"rgba(255,255,255,0.18)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <Bell style={{width:14,height:14,color:"#fff"}}/>
              </div>
          }
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>Notifications</div>
            <div style={{fontSize:9.5,color:"rgba(255,255,255,0.5)"}}>{sysName||"EL5 MediProcure"}</div>
          </div>
          {unreadCount > 0 && (
            <span style={{background:"#ef4444",color:"#fff",fontSize:10,fontWeight:800,padding:"2px 8px",borderRadius:12}}>
              {unreadCount} new
            </span>
          )}
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:6,padding:"5px",cursor:"pointer",color:"#fff",lineHeight:0}}>
            <X style={{width:14,height:14}}/>
          </button>
        </div>

        {/* Actions bar */}
        <div style={{
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"8px 14px", borderBottom:"1px solid #f3f4f6",
          background:"#f9fafb",
        }}>
          <span style={{fontSize:11,color:"#6b7280"}}>{notifs.length} notification{notifs.length!==1?"s":""}</span>
          <div style={{display:"flex",gap:8}}>
            {unreadCount > 0 && (
              <button onClick={onMarkAll} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 10px",background:"transparent",border:"1px solid #e5e7eb",borderRadius:5,cursor:"pointer",fontSize:10,fontWeight:600,color:"#374151"}}>
                <CheckCheck style={{width:11,height:11}}/> Mark all read
              </button>
            )}
            <button onClick={()=>{navigate("/inbox");onClose();}} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 10px",background:"#1a3a6b",border:"none",borderRadius:5,cursor:"pointer",fontSize:10,fontWeight:700,color:"#fff"}}>
              <Mail style={{width:11,height:11}}/> Inbox
            </button>
          </div>
        </div>

        {/* List */}
        <div style={{flex:1,overflowY:"auto"}}>
          {loading
            ? [1,2,3].map(i=>(
                <div key={i} style={{padding:"12px 14px",borderBottom:"1px solid #f9fafb",display:"flex",gap:10}}>
                  <div style={{width:36,height:36,borderRadius:8,background:"#f3f4f6"}} className="animate-pulse"/>
                  <div style={{flex:1}}><div style={{height:10,background:"#f3f4f6",borderRadius:4,marginBottom:5,width:"70%"}} className="animate-pulse"/><div style={{height:8,background:"#f3f4f6",borderRadius:4,width:"50%"}} className="animate-pulse"/></div>
                </div>
              ))
            : notifs.length===0
              ? <div style={{padding:"40px 20px",textAlign:"center"}}>
                  <Bell style={{width:36,height:36,color:"#e5e7eb",margin:"0 auto 10px"}}/>
                  <div style={{fontSize:13,fontWeight:600,color:"#9ca3af"}}>All caught up!</div>
                  <div style={{fontSize:11,color:"#d1d5db",marginTop:4}}>No new notifications</div>
                </div>
              : notifs.map(n=>{
                  const cfg = TYPE_CFG[n.type] || TYPE_CFG.info;
                  return (
                    <div key={n.id}
                      onClick={()=>{onMarkOne(n.id);if(n.action_url)navigate(n.action_url);}}
                      style={{
                        display:"flex", gap:10, padding:"12px 14px",
                        borderBottom:"1px solid #f9fafb",
                        borderLeft: n.is_read?"4px solid transparent":`4px solid ${cfg.color}`,
                        background: n.is_read?"#fff":cfg.bg,
                        cursor:"pointer", transition:"background 0.12s",
                      }}
                      onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f8fafc"}
                      onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=n.is_read?"#fff":cfg.bg}>
                      <div style={{width:36,height:36,borderRadius:8,background:`${cfg.color}18`,border:`1px solid ${cfg.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <cfg.icon style={{width:16,height:16,color:cfg.color}}/>
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:4}}>
                          <span style={{fontSize:12,fontWeight:n.is_read?500:700,color:"#111827",flex:1}}>{n.title}</span>
                          <span style={{fontSize:9,color:"#9ca3af",whiteSpace:"nowrap",flexShrink:0}}>{timeAgo(n.created_at)}</span>
                        </div>
                        <div style={{fontSize:11,color:"#6b7280",marginTop:1,lineHeight:1.4}}>{n.message}</div>
                        {n.module && <span style={{display:"inline-block",marginTop:4,fontSize:8,fontWeight:700,padding:"1px 6px",borderRadius:3,background:`${cfg.color}18`,color:cfg.color,textTransform:"uppercase",letterSpacing:"0.06em"}}>{n.module}</span>}
                      </div>
                      {!n.is_read && <div style={{width:7,height:7,borderRadius:"50%",background:cfg.color,flexShrink:0,marginTop:4}}/>}
                    </div>
                  );
                })
          }
        </div>

        {/* Footer */}
        <div style={{
          padding:"10px 14px", background:"#f9fafb",
          borderTop:"1px solid #e5e7eb",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          flexShrink:0,
        }}>
          <div>
            <div style={{fontSize:10,fontWeight:700,color:"#374151"}}>{hospitalName||"Embu Level 5 Hospital"}</div>
            <div style={{fontSize:9,color:"#9ca3af"}}>{sysName||"EL5 MediProcure"} · Embu County Government</div>
          </div>
          <button onClick={()=>{navigate("/settings");onClose();}} style={{background:"transparent",border:"none",cursor:"pointer",color:"#9ca3af"}}>
            <Settings style={{width:13,height:13}}/>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main exported hook + provider ── */
export function NotificationBell({ logoUrl, sysName, hospitalName }: { logoUrl?:string|null; sysName?:string; hospitalName?:string }) {
  const { user } = useAuth();
  const [panelOpen, setPanelOpen] = useState(false);
  const [notifs,    setNotifs]    = useState<Notif[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [toasts,    setToasts]    = useState<Notif[]>([]);
  const prevIds = useRef<Set<string>>(new Set());

  const load = useCallback(async()=>{
    if(!user) return;
    setLoading(true);
    const{data}=await(supabase as any).from("notifications").select("*").order("created_at",{ascending:false}).limit(50);
    setNotifs((data||[]).map((n:any)=>({
      id:n.id, title:n.title||"Notification",
      message:n.message||n.body||"",
      type:(n.type||n.notification_type||"info") as NotifType,
      is_read:!!n.is_read, created_at:n.created_at,
      action_url:n.action_url||n.link,
      module:n.module||n.category,
    })));
    setLoading(false);
  },[user]);

  useEffect(()=>{ load(); },[load]);

  // Real-time — show toast for new notifications
  useEffect(()=>{
    if(!user) return;
    const ch=(supabase as any).channel(`notif-bell-${user.id}`)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"notifications"},(payload:any)=>{
        const n=payload.new as any;
        if(n.user_id&&n.user_id!==user.id) return;
        const notif:Notif={
          id:n.id, title:n.title||"New notification",
          message:n.message||"", type:(n.type||"info") as NotifType,
          is_read:false, created_at:n.created_at||new Date().toISOString(),
          action_url:n.action_url, module:n.module,
        };
        if(!prevIds.current.has(n.id)){
          prevIds.current.add(n.id);
          setToasts(p=>[notif,...p.slice(0,2)]);
          setNotifs(p=>[notif,...p]);
        }
      })
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"inbox_items"},(payload:any)=>{
        const n=payload.new as any;
        if(n.to_user_id!==user.id) return;
        const notif:Notif={
          id:`inbox-${n.id}`, title:`Email: ${n.subject||"New message"}`,
          message:`From ${n.from_name||"Unknown"}: ${(n.body||"").slice(0,60)}`,
          type:"email", is_read:false,
          created_at:n.created_at||new Date().toISOString(),
          action_url:"/email", module:"Email",
        };
        if(!prevIds.current.has(notif.id)){
          prevIds.current.add(notif.id);
          setToasts(p=>[notif,...p.slice(0,2)]);
          setNotifs(p=>[notif,...p]);
        }
      })
      .subscribe();
    return()=>(supabase as any).removeChannel(ch);
  },[user]);

  const markAll = async()=>{
    if(!user) return;
    await(supabase as any).from("notifications").update({is_read:true}).eq("is_read",false);
    setNotifs(p=>p.map(n=>({...n,is_read:true})));
  };
  const markOne = async(id:string)=>{
    if(id.startsWith("inbox-")) return;
    await(supabase as any).from("notifications").update({is_read:true}).eq("id",id);
    setNotifs(p=>p.map(n=>n.id===id?{...n,is_read:true}:n));
  };

  const unread = notifs.filter(n=>!n.is_read).length;

  return (
    <>
      {/* Bell button */}
      <button onClick={()=>setPanelOpen(v=>!v)}
        title="Notifications"
        style={{
          position:"relative", padding:6, borderRadius:6,
          background:"transparent", border:"none", cursor:"pointer",
          color:"rgba(255,255,255,0.6)", lineHeight:0,
        }}
        onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.1)"}
        onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
        <Bell style={{width:15,height:15}}/>
        {unread>0 && (
          <span style={{
            position:"absolute", top:-2, right:-2,
            minWidth:15, height:15, borderRadius:8,
            background:"#ef4444", color:"#fff",
            fontSize:8, fontWeight:800, padding:"0 3px",
            display:"flex", alignItems:"center", justifyContent:"center",
            lineHeight:1,
          }}>
            {unread>99?"99+":unread}
          </span>
        )}
      </button>

      {/* Slide-in panel */}
      {panelOpen && (
        <NotificationPanel
          onClose={()=>setPanelOpen(false)}
          notifs={notifs} loading={loading}
          onMarkAll={markAll} onMarkOne={markOne}
          logoUrl={logoUrl} sysName={sysName} hospitalName={hospitalName}
        />
      )}

      {/* Toast stack */}
      <div style={{
        position:"fixed", bottom:20, right:20,
        display:"flex", flexDirection:"column", gap:10,
        zIndex:1400, pointerEvents:"none",
      }}>
        {toasts.map(t=>(
          <div key={t.id} style={{pointerEvents:"all"}}>
            <ToastNotif
              notif={t}
              logoUrl={logoUrl} sysName={sysName} hospitalName={hospitalName}
              onClose={()=>setToasts(p=>p.filter(x=>x.id!==t.id))}
            />
          </div>
        ))}
      </div>

      {/* Progress bar keyframes */}
      <style>{`
        @keyframes notif-progress { from{width:100%} to{width:0%} }
        @keyframes slideInRight { from{transform:translateX(100%);opacity:0} to{transform:translateX(0);opacity:1} }
      `}</style>
    </>
  );
}
