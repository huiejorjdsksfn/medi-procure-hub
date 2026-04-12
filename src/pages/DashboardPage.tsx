/**
 * ProcurBosse — Dashboard v7.0 (Power BI / D365 Style)
 * KPI cards · Mini charts · Recent activity · Role wheel · D365 layout
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { T } from "@/lib/theme";
import { checkTwilioStatus } from "@/lib/sms";
import {
  ShoppingCart, Package, DollarSign, Truck, BarChart3, Clock,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Activity,
  Users, FileText, Bell, Phone, MessageSquare, RefreshCw, ChevronRight,
  Shield, Server, Globe, Calendar, Star, Zap
} from "lucide-react";

const db = supabase as any;

/* ── D365 page wrapper styles ─────────────────────────────────────── */
const S = {
  page:   { background:T.bg, minHeight:"100vh", fontFamily:"'Segoe UI','Inter',system-ui,sans-serif" },
  hdr:    { background:"#fff", borderBottom:`1px solid ${T.border}`, padding:"14px 24px", display:"flex", alignItems:"center", gap:12, boxShadow:"0 1px 3px rgba(0,0,0,.05)" },
  body:   { padding:"20px 24px", display:"flex", flexDirection:"column" as const, gap:16 },
  card:   (col?:string):React.CSSProperties => ({ background:"#fff", border:`1px solid ${col?col+"33":T.border}`, borderRadius:T.rLg, boxShadow:"0 1px 4px rgba(0,0,0,.06)", overflow:"hidden" }),
  cardHd: (col:string):React.CSSProperties => ({ padding:"10px 16px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", gap:8, background:`${col}08`, flexShrink:0 }),
};

/* ── KPI tile (Power BI style) ───────────────────────────────────── */
function KPI({label,value,prev,sub,icon:Icon,color,onClick}:{
  label:string;value:number|string;prev?:number;sub?:string;icon:any;color:string;onClick?:()=>void;
}) {
  const trend = prev!==undefined ? (Number(value)>=prev?"up":"down") : null;
  return(
    <div onClick={onClick} style={{background:"#fff",border:`1px solid ${T.border}`,borderRadius:T.rLg,boxShadow:"0 1px 4px rgba(0,0,0,.06)",padding:"16px",cursor:onClick?"pointer":"default",transition:"all .15s"}}
      onMouseEnter={e=>{if(onClick){(e.currentTarget as any).style.borderColor=color;(e.currentTarget as any).style.boxShadow=`0 2px 12px ${color}22`;}}}
      onMouseLeave={e=>{if(onClick){(e.currentTarget as any).style.borderColor=T.border;(e.currentTarget as any).style.boxShadow="0 1px 4px rgba(0,0,0,.06)";}}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
        <div style={{width:36,height:36,borderRadius:T.r,background:`${color}14`,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon size={18} color={color}/></div>
        {trend&&<div style={{display:"flex",alignItems:"center",gap:3,fontSize:11,fontWeight:600,color:trend==="up"?T.success:T.error}}>
          {trend==="up"?<TrendingUp size={12}/>:<TrendingDown size={12}/>}{Math.abs(Number(value)-(prev||0))}
        </div>}
      </div>
      <div style={{fontSize:28,fontWeight:800,color,lineHeight:1,marginBottom:4}}>{typeof value==="number"?value.toLocaleString():value}</div>
      <div style={{fontSize:11,color:T.fgMuted,fontWeight:500}}>{label}</div>
      {sub&&<div style={{fontSize:10,color:T.fgDim,marginTop:2}}>{sub}</div>}
    </div>
  );
}

/* ── Procurement activity bar (mini) ─────────────────────────────── */
function MiniBar({label,val,max,color}:{label:string;val:number;max:number;color:string}) {
  const pct = max>0?Math.min(100,Math.round(val/max*100)):0;
  return(
    <div style={{marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}>
        <span style={{color:T.fgMuted}}>{label}</span>
        <span style={{fontWeight:700,color}}>{val}</span>
      </div>
      <div style={{height:6,background:T.bg2,borderRadius:3,overflow:"hidden"}}>
        <div style={{width:`${pct}%`,height:"100%",background:color,borderRadius:3,transition:"width .5s"}}/>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const nav = useNavigate();
  const {profile,roles,primaryRole,hasRole} = useAuth();
  const settings = useSystemSettings();
  const isAdmin = hasRole("admin","superadmin","webmaster");

  const [kpi, setKpi] = useState({reqs:0,pos:0,pvs:0,items:0,suppliers:0,grn:0,contracts:0,unread:0,lowStock:0,tenders:0});
  const [activity, setActivity] = useState<any[]>([]);
  const [smsLogs, setSmsLogs]   = useState<any[]>([]);
  const [twilioOk, setTwilioOk] = useState<boolean|null>(null);
  const [loading, setLoading]   = useState(false);
  const [clock, setClock]       = useState("");

  const hour = new Date().getHours();
  const greeting = hour<12?"Good morning":hour<17?"Good afternoon":"Good evening";
  const name = profile?.full_name?.split(" ")[0] || "Staff";
  const today = new Date().toLocaleDateString("en-KE",{weekday:"long",day:"numeric",month:"long",year:"numeric",timeZone:"Africa/Nairobi"});

  /* Clock */
  useEffect(()=>{
    const t=()=>setClock(new Date().toLocaleTimeString("en-KE",{timeZone:"Africa/Nairobi",hour:"2-digit",minute:"2-digit",second:"2-digit"}));
    t(); const iv=setInterval(t,1000); return()=>clearInterval(iv);
  },[]);

  const load = useCallback(async()=>{
    setLoading(true);
    const [r,p,pv,i,s,g,c,n,ls,t2,acts,smsl] = await Promise.allSettled([
      db.from("requisitions").select("id",{count:"exact",head:true}).in("status",["submitted","pending"]),
      db.from("purchase_orders").select("id",{count:"exact",head:true}).in("status",["pending","approved"]),
      db.from("payment_vouchers").select("id",{count:"exact",head:true}).in("status",["pending"]),
      db.from("items").select("id",{count:"exact",head:true}),
      db.from("suppliers").select("id",{count:"exact",head:true}).eq("status","active"),
      db.from("goods_received").select("id",{count:"exact",head:true}).eq("status","pending"),
      db.from("contracts").select("id",{count:"exact",head:true}).eq("status","active"),
      db.from("notifications").select("id",{count:"exact",head:true}).eq("is_read",false),
      db.from("items").select("id",{count:"exact",head:true}).lt("current_quantity",5),
      db.from("tenders").select("id",{count:"exact",head:true}).eq("status","open"),
      db.from("audit_log").select("id,action,module,user_email,created_at").order("created_at",{ascending:false}).limit(8),
      db.from("sms_log").select("to_number,message,status,sent_at").order("sent_at",{ascending:false}).limit(5),
    ]);
    const v=(x:any)=>x.status==="fulfilled"?x.value?.count??0:0;
    setKpi({reqs:v(r),pos:v(p),pvs:v(pv),items:v(i),suppliers:v(s),grn:v(g),contracts:v(c),unread:v(n),lowStock:v(ls),tenders:v(t2)});
    setActivity(acts.status==="fulfilled"?acts.value?.data||[]:[]);
    setSmsLogs(smsl.status==="fulfilled"?smsl.value?.data||[]:[]);
    setLoading(false);
  },[]);

  useEffect(()=>{
    load();
    checkTwilioStatus().then(r=>setTwilioOk(r.ok)).catch(()=>setTwilioOk(false));
    const iv=setInterval(load,60_000);
    const ch=db.channel("dash:live")
      .on("postgres_changes",{event:"*",schema:"public",table:"requisitions"},load)
      .on("postgres_changes",{event:"*",schema:"public",table:"notifications"},load)
      .subscribe();
    return()=>{clearInterval(iv);db.removeChannel(ch);};
  },[load]);

  const sysName = settings.system_name || "EL5 MediProcure";

  return(
    <div style={S.page}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadein{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* D365-style page header */}
      <div style={S.hdr}>
        <div style={{width:40,height:40,borderRadius:T.r,background:T.primaryBg,display:"flex",alignItems:"center",justifyContent:"center"}}><BarChart3 size={20} color={T.primary}/></div>
        <div>
          <h1 style={{margin:0,fontSize:18,fontWeight:700,color:T.fg}}>{greeting}, {name}</h1>
          <div style={{fontSize:12,color:T.fgMuted,marginTop:1}}>{sysName} · {today}</div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:10}}>
          {/* Twilio status */}
          <div style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:T.r,background:twilioOk===true?T.successBg:twilioOk===false?T.errorBg:T.bg,border:`1px solid ${twilioOk===true?T.success:twilioOk===false?T.error:T.border}`,fontSize:11,fontWeight:600,color:twilioOk===true?T.success:twilioOk===false?T.error:T.fgMuted}}>
            <Phone size={11}/>{twilioOk===true?"SMS Active":twilioOk===false?"SMS Error":"Checking..."}
          </div>
          <div style={{fontSize:13,fontWeight:700,color:T.fgMuted,fontVariantNumeric:"tabular-nums"}}>{clock}</div>
          <button onClick={load} style={{padding:"6px 12px",background:T.bg,border:`1px solid ${T.border}`,borderRadius:T.r,cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontSize:12,color:T.fgMuted}}>
            <RefreshCw size={12} style={loading?{animation:"spin 1s linear infinite"}:{}}/> Refresh
          </button>
        </div>
      </div>

      <div style={S.body}>
        {/* ── ROW 1: KPI tiles (Power BI style) ── */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12}}>
          <KPI label="Pending Reqs"   value={kpi.reqs}      color={T.warning}          icon={Clock}         onClick={()=>nav("/requisitions")}/>
          <KPI label="Open POs"       value={kpi.pos}       color={T.primary}           icon={ShoppingCart}  onClick={()=>nav("/purchase-orders")}/>
          <KPI label="Vouchers Due"   value={kpi.pvs}       color={T.finance}           icon={DollarSign}    onClick={()=>nav("/vouchers/payment")}/>
          <KPI label="Low Stock"      value={kpi.lowStock}  color={T.error}             icon={AlertTriangle} onClick={()=>nav("/items")}/>
          <KPI label="Active Suppliers" value={kpi.suppliers} color={T.inventory}       icon={Truck}         onClick={()=>nav("/suppliers")}/>
          <KPI label="Pending GRN"    value={kpi.grn}       color={T.comms||"#0072c6"} icon={Package}       onClick={()=>nav("/goods-received")}/>
          <KPI label="Active Contracts" value={kpi.contracts} color={T.quality}         icon={FileText}      onClick={()=>nav("/contracts")}/>
          <KPI label="Open Tenders"   value={kpi.tenders}   color={T.reports||"#5c2d91"} icon={Zap}         onClick={()=>nav("/tenders")}/>
        </div>

        {/* ── ROW 2: Main content grid ── */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 320px",gap:14}}>

          {/* Procurement pipeline */}
          <div style={S.card()}>
            <div style={S.cardHd(T.primary)}><ShoppingCart size={14} color={T.primary}/><span style={{fontWeight:700,fontSize:13,color:T.fg}}>Procurement Pipeline</span><button onClick={()=>nav("/requisitions")} style={{marginLeft:"auto",fontSize:11,color:T.primary,background:"none",border:"none",cursor:"pointer"}}>View all →</button></div>
            <div style={{padding:"16px"}}>
              <MiniBar label="Requisitions (Pending)"  val={kpi.reqs}      max={Math.max(kpi.reqs,20)}     color={T.warning}/>
              <MiniBar label="Purchase Orders (Open)"  val={kpi.pos}       max={Math.max(kpi.pos,20)}      color={T.primary}/>
              <MiniBar label="GRN Pending"             val={kpi.grn}       max={Math.max(kpi.grn,20)}      color={T.inventory}/>
              <MiniBar label="Payment Vouchers"        val={kpi.pvs}       max={Math.max(kpi.pvs,20)}      color={T.finance}/>
              <MiniBar label="Low Stock Items"         val={kpi.lowStock}  max={Math.max(kpi.lowStock,10)} color={T.error}/>
              <div style={{marginTop:14,display:"flex",gap:8}}>
                <button onClick={()=>nav("/requisitions")} style={{flex:1,padding:"8px",background:T.primaryBg,border:`1px solid ${T.primary}33`,borderRadius:T.r,color:T.primary,fontSize:12,fontWeight:600,cursor:"pointer"}}>+ New Requisition</button>
                <button onClick={()=>nav("/purchase-orders")} style={{flex:1,padding:"8px",background:T.bg,border:`1px solid ${T.border}`,borderRadius:T.r,color:T.fgMuted,fontSize:12,fontWeight:600,cursor:"pointer"}}>View POs</button>
              </div>
            </div>
          </div>

          {/* Finance snapshot */}
          <div style={S.card()}>
            <div style={S.cardHd(T.finance)}><DollarSign size={14} color={T.finance}/><span style={{fontWeight:700,fontSize:13,color:T.fg}}>Finance Snapshot</span><button onClick={()=>nav("/financials/dashboard")} style={{marginLeft:"auto",fontSize:11,color:T.finance,background:"none",border:"none",cursor:"pointer"}}>Finance →</button></div>
            <div style={{padding:"16px"}}>
              <MiniBar label="Payment Vouchers"     val={kpi.pvs}       max={Math.max(kpi.pvs,10)}   color={T.finance}/>
              <MiniBar label="Active Contracts"     val={kpi.contracts} max={Math.max(kpi.contracts,10)} color={T.quality}/>
              <MiniBar label="Active Suppliers"     val={kpi.suppliers} max={Math.max(kpi.suppliers,50)} color={T.inventory}/>
              <MiniBar label="Total Items in Stock" val={kpi.items}     max={Math.max(kpi.items,200)} color={T.primary}/>
              {/* Role-specific links */}
              <div style={{marginTop:14,display:"flex",flexDirection:"column",gap:5}}>
                {hasRole("accountant","admin","procurement_manager")&&[
                  {l:"Payment Vouchers",p:"/vouchers/payment",c:T.finance},
                  {l:"Journal Vouchers",p:"/vouchers/journal",c:"#7719aa"},
                  {l:"Budgets",         p:"/financials/budgets",c:T.quality},
                  {l:"Accountant Workspace",p:"/accountant-workspace",c:T.inventory},
                ].map(({l,p,c})=>(
                  <button key={p} onClick={()=>nav(p)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 10px",background:T.bg,border:`1px solid ${T.border}`,borderRadius:T.r,color:T.fgMuted,fontSize:12,cursor:"pointer"}}
                    onMouseEnter={e=>{(e.currentTarget as any).style.borderColor=c;(e.currentTarget as any).style.color=c;}}
                    onMouseLeave={e=>{(e.currentTarget as any).style.borderColor=T.border;(e.currentTarget as any).style.color=T.fgMuted;}}>
                    {l}<ChevronRight size={11}/>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right column: activity + comms */}
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {/* Recent activity */}
            <div style={S.card()}>
              <div style={S.cardHd(T.quality)}><Activity size={14} color={T.quality}/><span style={{fontWeight:700,fontSize:13,color:T.fg}}>Recent Activity</span></div>
              <div style={{maxHeight:200,overflowY:"auto"}}>
                {activity.length===0
                  ?<div style={{padding:"16px",textAlign:"center",color:T.fgDim,fontSize:12}}>No recent activity</div>
                  :activity.map((a,i)=>(
                    <div key={i} style={{display:"flex",gap:8,padding:"7px 14px",borderBottom:`1px solid ${T.border}18`}}>
                      <div style={{width:6,height:6,borderRadius:"50%",background:T.primary,marginTop:4,flexShrink:0}}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:11,color:T.fg,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.action}</div>
                        <div style={{fontSize:10,color:T.fgDim}}>{a.module} · {new Date(a.created_at).toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit"})}</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* SMS log */}
            <div style={S.card()}>
              <div style={S.cardHd(T.inventory)}><MessageSquare size={14} color={T.inventory}/><span style={{fontWeight:700,fontSize:13,color:T.fg}}>Recent SMS</span><button onClick={()=>nav("/sms")} style={{marginLeft:"auto",fontSize:10,color:T.inventory,background:"none",border:"none",cursor:"pointer"}}>All →</button></div>
              <div>
                {smsLogs.length===0
                  ?<div style={{padding:"12px 14px",fontSize:11,color:T.fgDim}}>No SMS logs</div>
                  :smsLogs.map((s2,i)=>(
                    <div key={i} style={{display:"flex",gap:8,padding:"6px 14px",borderBottom:`1px solid ${T.border}18`,alignItems:"center"}}>
                      <Phone size={11} color={T.inventory}/>
                      <div style={{flex:1,minWidth:0}}>
                        <code style={{fontSize:10,color:T.fg}}>{s2.to_number}</code>
                        <div style={{fontSize:9,color:T.fgDim,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s2.message?.slice(0,40)}</div>
                      </div>
                      <span style={{padding:"1px 6px",borderRadius:T.r,fontSize:9,fontWeight:600,background:s2.status==="sent"?T.successBg:T.errorBg,color:s2.status==="sent"?T.success:T.error}}>{s2.status}</span>
                    </div>
                  ))}
              </div>
              <div style={{padding:"8px 14px",display:"flex",gap:6}}>
                <button onClick={()=>nav("/sms")} style={{flex:1,padding:"6px",background:T.primaryBg,border:`1px solid ${T.primary}33`,borderRadius:T.r,color:T.primary,fontSize:11,fontWeight:600,cursor:"pointer"}}>SMS</button>
                <button onClick={()=>nav("/telephony")} style={{flex:1,padding:"6px",background:T.bg,border:`1px solid ${T.border}`,borderRadius:T.r,color:T.fgMuted,fontSize:11,fontWeight:600,cursor:"pointer"}}>Calls</button>
              </div>
            </div>
          </div>
        </div>

        {/* ── ROW 3: Role-specific shortcuts ── */}
        <div style={S.card()}>
          <div style={S.cardHd(T.accent)}><Star size={14} color={T.accent}/><span style={{fontWeight:700,fontSize:13,color:T.fg}}>Quick Access · {primaryRole?.replace(/_/g," ")}</span></div>
          <div style={{padding:"12px 16px",display:"flex",gap:8,flexWrap:"wrap"}}>
            {/* Universal */}
            {[
              {l:"Dashboard",     p:"/dashboard",           c:T.primary},
              {l:"Documents",     p:"/documents",           c:"#374151"},
              {l:"Notifications", p:"/notifications",       c:T.warning, cnt:kpi.unread},
              {l:"Reports",       p:"/reports",             c:T.reports||"#5c2d91"},
            ].map(({l,p,c,cnt})=>(
              <button key={p} onClick={()=>nav(p)} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",background:`${c}10`,border:`1px solid ${c}33`,borderRadius:T.r,color:c,fontSize:12,fontWeight:600,cursor:"pointer"}}
                onMouseEnter={e=>(e.currentTarget.style.background=`${c}20`)}
                onMouseLeave={e=>(e.currentTarget.style.background=`${c}10`)}>
                {l}{cnt&&cnt>0?<span style={{padding:"0 5px",borderRadius:8,background:c,color:"#fff",fontSize:10}}>{cnt}</span>:null}
              </button>
            ))}
            {/* Role-specific */}
            {hasRole("admin","superadmin","webmaster")&&<button onClick={()=>nav("/admin/panel")} style={{padding:"7px 14px",background:`${T.error}10`,border:`1px solid ${T.error}33`,borderRadius:T.r,color:T.error,fontSize:12,fontWeight:600,cursor:"pointer"}}>Admin Panel</button>}
            {hasRole("admin","superadmin","webmaster","database_admin")&&<button onClick={()=>nav("/admin/db-test")} style={{padding:"7px 14px",background:`${T.success}10`,border:`1px solid ${T.success}33`,borderRadius:T.r,color:T.success,fontSize:12,fontWeight:600,cursor:"pointer"}}>DB Monitor</button>}
            {hasRole("accountant","admin","procurement_manager")&&<button onClick={()=>nav("/accountant-workspace")} style={{padding:"7px 14px",background:`${T.finance}10`,border:`1px solid ${T.finance}33`,borderRadius:T.r,color:T.finance,fontSize:12,fontWeight:600,cursor:"pointer"}}>Accountant WS</button>}
            {hasRole("inventory_manager","warehouse_officer","admin","procurement_manager","procurement_officer")&&<button onClick={()=>nav("/scanner")} style={{padding:"7px 14px",background:`${T.inventory}10`,border:`1px solid ${T.inventory}33`,borderRadius:T.r,color:T.inventory,fontSize:12,fontWeight:600,cursor:"pointer"}}>Scanner</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

import type React from "react";
