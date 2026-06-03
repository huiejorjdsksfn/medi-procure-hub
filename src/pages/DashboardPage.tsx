/**
 * EL5 MediProcure v10.0 — Dashboard
 * Live KPIs · Realtime · Role-aware · Professional D365-style tiles
 */
import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ERPWheelButton from "@/components/ERPWheelButton";
import {
  ShoppingCart, Package, FileText, DollarSign, BarChart2,
  Users, Building2, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle, Clock, RefreshCw, Bell, Activity, MessageSquare,
} from "lucide-react";

const db = supabase as any;

interface KPI { label:string; value:string|number; sub:string; icon:any; color:string; trend?:"up"|"down"; path:string; roles:string[]; }

const TEAL   = "#0e7490";
const BLUE   = "#0078d4";
const GREEN  = "#059669";
const ORANGE = "#d97706";
const PURPLE = "#7c3aed";
const RED    = "#dc2626";
const DARK   = "#0f172a";

let BG=""; try { BG=new URL("../assets/procurement-bg.jpg",import.meta.url).href; } catch {}

function KPICard({k,onClick}:{k:KPI;onClick:()=>void}){
  const [hov,setHov]=useState(false);
  const Icon=k.icon;
  return(
    <div onClick={onClick}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{background:"#fff",borderRadius:12,padding:"18px 20px",cursor:"pointer",
        boxShadow:hov?"0 8px 28px rgba(0,0,0,.12)":"0 2px 8px rgba(0,0,0,.06)",
        borderLeft:`4px solid ${k.color}`,
        transform:hov?"translateY(-2px)":"none",
        transition:"all .18s cubic-bezier(.4,0,.2,1)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:".06em",
            textTransform:"uppercase",marginBottom:6}}>{k.label}</div>
          <div style={{fontSize:28,fontWeight:900,color:DARK,lineHeight:1,marginBottom:4}}>{k.value}</div>
          <div style={{fontSize:11,color:"#9ca3af"}}>{k.sub}</div>
        </div>
        <div style={{width:42,height:42,borderRadius:10,background:k.color+"15",
          display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <Icon size={20} color={k.color}/>
        </div>
      </div>
      {k.trend&&(
        <div style={{display:"flex",alignItems:"center",gap:4,marginTop:10,paddingTop:10,
          borderTop:"1px solid #f1f5f9"}}>
          {k.trend==="up"
            ?<TrendingUp size={12} color={GREEN}/>
            :<TrendingDown size={12} color={RED}/>}
          <span style={{fontSize:10.5,color:k.trend==="up"?GREEN:RED,fontWeight:600}}>
            {k.trend==="up"?"Increasing":"Needs attention"}
          </span>
        </div>
      )}
    </div>
  );
}

function ActivityItem({icon:Icon,color,text,time}:{icon:any;color:string;text:string;time:string}){
  return(
    <div style={{display:"flex",alignItems:"flex-start",gap:10,padding:"8px 0",
      borderBottom:"1px solid #f8fafc"}}>
      <div style={{width:28,height:28,borderRadius:7,background:color+"18",
        display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
        <Icon size={13} color={color}/>
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:12,color:DARK,fontWeight:500,lineHeight:1.4}}>{text}</div>
        <div style={{fontSize:10,color:"#9ca3af",marginTop:2}}>{time}</div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { primaryRole, roles, profile } = useAuth();
  const nav = useNavigate();
  const [kpis, setKpis]   = useState<Record<string,number>>({});
  const [acts, setActs]   = useState<any[]>([]);
  const [loading, setLoad] = useState(true);
  const [now, setNow]     = useState(new Date());
  const [showWheel, setShowWheel] = useState(false);

  const load = useCallback(async () => {
    setLoad(true);
    const today = new Date(); today.setHours(0,0,0,0);
    const iso = today.toISOString();

    const [rqs,pos,items,lowStk,pendApp,grns,notifs,visitors] = await Promise.allSettled([
      db.from("requisitions").select("id",{count:"exact",head:true}).gte("created_at",iso),
      db.from("purchase_orders").select("id",{count:"exact",head:true}).gte("created_at",iso),
      db.from("items").select("id",{count:"exact",head:true}),
      db.from("items").select("id",{count:"exact",head:true}).lt("quantity_in_stock",10),
      db.from("requisitions").select("id",{count:"exact",head:true}).in("status",["pending","submitted"]),
      db.from("goods_received").select("id",{count:"exact",head:true}).gte("created_at",iso),
      db.from("notifications").select("id",{count:"exact",head:true}).eq("is_read",false),
      db.from("reception_visitors").select("id",{count:"exact",head:true}).gte("check_in_time",iso),
    ]);
    setKpis({
      reqs:     rqs.status==="fulfilled"       ? rqs.value.count||0       : 0,
      pos:      pos.status==="fulfilled"        ? pos.value.count||0        : 0,
      items:    items.status==="fulfilled"      ? items.value.count||0      : 0,
      lowStk:   lowStk.status==="fulfilled"     ? lowStk.value.count||0     : 0,
      pendApp:  pendApp.status==="fulfilled"    ? pendApp.value.count||0    : 0,
      grns:     grns.status==="fulfilled"       ? grns.value.count||0       : 0,
      notifs:   notifs.status==="fulfilled"     ? notifs.value.count||0     : 0,
      visitors: visitors.status==="fulfilled"   ? visitors.value.count||0   : 0,
    });

    // Recent activity
    const { data: recent } = await db.from("audit_logs")
      .select("action,table_name,created_at").order("created_at",{ascending:false}).limit(8);
    setActs(recent||[]);
    setLoad(false);
  }, []);

  useEffect(() => { load(); const t=setInterval(()=>setNow(new Date()),30000); return ()=>clearInterval(t); },[load]);

  const ALL_KPIS: KPI[] = useMemo(() => [
    { label:"Requisitions Today",  value:kpis.reqs||0,    sub:`${kpis.pendApp||0} pending approval`, icon:FileText,     color:BLUE,   trend:"up",  path:"/requisitions",   roles:[] },
    { label:"Purchase Orders",     value:kpis.pos||0,     sub:"raised today",                         icon:ShoppingCart,  color:TEAL,   trend:"up",  path:"/purchase-orders",roles:["admin","procurement_manager","procurement_officer"] },
    { label:"GRN Created",         value:kpis.grns||0,    sub:"today",                                icon:CheckCircle,   color:GREEN,               path:"/goods-received", roles:["admin","procurement_manager","procurement_officer","warehouse_officer"] },
    { label:"Stock Items",         value:kpis.items||0,   sub:`${kpis.lowStk||0} low stock alerts`,  icon:Package,       color:ORANGE, trend:kpis.lowStk>5?"down":undefined, path:"/items", roles:[] },
    { label:"Pending Approvals",   value:kpis.pendApp||0, sub:"awaiting action",                      icon:Clock,         color:PURPLE, trend:kpis.pendApp>10?"down":undefined, path:"/requisitions", roles:[] },
    { label:"Notifications",       value:kpis.notifs||0,  sub:"unread",                               icon:Bell,          color:RED,    trend:kpis.notifs>5?"down":undefined, path:"/notifications", roles:[] },
    { label:"Visitors Today",      value:kpis.visitors||0,sub:"checked in",                           icon:Users,         color:"#0891b2", path:"/reception", roles:[] },
    { label:"Departments",         value:"Active",        sub:"Hospital departments",                  icon:Building2,     color:"#374151", path:"/departments", roles:["admin","procurement_manager","inventory_manager"] },
  ], [kpis]);

  const visibleKpis = useMemo(() =>
    ALL_KPIS.filter(k => !k.roles.length || k.roles.some(r => roles.includes(r)))
  , [ALL_KPIS, roles]);

  const fmt = (d:string) => {
    const dt = new Date(d);
    const diff = (Date.now()-dt.getTime())/60000;
    if (diff<1)  return "Just now";
    if (diff<60) return `${Math.round(diff)}m ago`;
    if (diff<1440) return `${Math.round(diff/60)}h ago`;
    return dt.toLocaleDateString("en-KE");
  };

  const actionIcon: Record<string,[any,string]> = {
    INSERT:[Activity,GREEN], UPDATE:[RefreshCw,BLUE], DELETE:[AlertTriangle,RED],
  };

  const greet = (() => {
    const h = now.getHours();
    if (h<12) return "Good morning";
    if (h<17) return "Good afternoon";
    return "Good evening";
  })();

  const role_label: Record<string,string> = {
    admin:"Administrator",superadmin:"Super Admin",webmaster:"Webmaster",
    database_admin:"Database Admin",procurement_manager:"Procurement Manager",
    procurement_officer:"Procurement Officer",inventory_manager:"Inventory Manager",
    warehouse_officer:"Warehouse Officer",requisitioner:"Requisitioner",accountant:"Accountant",
  };

  return (
    <div style={{padding:"24px 28px",background:"#f8fafc",minHeight:"100vh",
      fontFamily:"'Inter','Segoe UI',system-ui,sans-serif"}}>

      {/* Header */}
      <div style={{marginBottom:28,display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:14}}>
        <div>
          <div style={{fontSize:13,color:"#6b7280",fontWeight:600,marginBottom:2}}>
            {now.toLocaleDateString("en-KE",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}
          </div>
          <h1 style={{margin:0,fontSize:24,fontWeight:900,color:DARK,letterSpacing:"-.02em"}}>
            {greet}, {profile?.full_name?.split(" ")[0] || "Welcome"}
          </h1>
          <div style={{fontSize:12,color:"#6b7280",marginTop:3,display:"flex",alignItems:"center",gap:8}}>
            <span style={{background:TEAL+"18",color:TEAL,fontWeight:700,fontSize:10,
              padding:"2px 8px",borderRadius:6}}>
              {role_label[primaryRole]||primaryRole}
            </span>
            <span>EL5 MediProcure · Embu Level 5 Hospital</span>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={load} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",
            background:"#fff",border:"1.5px solid #e2e8f0",borderRadius:8,cursor:"pointer",
            fontSize:12,fontWeight:700,color:"#374151",boxShadow:"0 1px 3px rgba(0,0,0,.06)"}}>
            <RefreshCw size={13} style={loading?{animation:"spin .8s linear infinite"}:{}}/>
            {loading?"Loading…":"Refresh"}
          </button>
          <button onClick={()=>setShowWheel(w=>!w)}
            style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",
              background:showWheel?TEAL:"#fff",border:`1.5px solid ${TEAL}`,borderRadius:8,cursor:"pointer",
              fontSize:12,fontWeight:700,color:showWheel?"#fff":TEAL,boxShadow:"0 1px 3px rgba(0,0,0,.06)"}}>
            🌐 {showWheel?"Close":"ERP Navigator"}
          </button>
        </div>
      </div>

      {/* ERP Wheel */}
      {showWheel && (
        <div style={{background:"#fff",borderRadius:14,padding:24,marginBottom:24,
          boxShadow:"0 4px 20px rgba(0,0,0,.08)",border:"1px solid #e2e8f0",
          display:"flex",justifyContent:"center"}}>
          <ERPWheelButton/>
        </div>
      )}

      {/* KPI Grid */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16,marginBottom:24}}>
        {visibleKpis.map(k=>(
          <KPICard key={k.label} k={k} onClick={()=>nav(k.path)}/>
        ))}
      </div>

      {/* Lower grid */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>

        {/* Activity */}
        <div style={{background:"#fff",borderRadius:12,padding:20,
          boxShadow:"0 2px 8px rgba(0,0,0,.06)",border:"1px solid #f1f5f9"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:800,color:DARK}}>Recent Activity</div>
            <Activity size={16} color={TEAL}/>
          </div>
          {loading ? (
            <div style={{textAlign:"center",padding:30,color:"#9ca3af",fontSize:13}}>Loading…</div>
          ) : acts.length === 0 ? (
            <div style={{textAlign:"center",padding:30,color:"#9ca3af",fontSize:13}}>No recent activity</div>
          ) : acts.map((a,i)=>{
            const [Icon,col] = actionIcon[a.action?.toUpperCase()]||[Activity,TEAL];
            return <ActivityItem key={i} icon={Icon} color={col}
              text={`${a.action||"Action"} on ${a.table_name||"record"}`}
              time={fmt(a.created_at)}/>;
          })}
        </div>

        {/* Quick Actions */}
        <div style={{background:"#fff",borderRadius:12,padding:20,
          boxShadow:"0 2px 8px rgba(0,0,0,.06)",border:"1px solid #f1f5f9"}}>
          <div style={{fontSize:14,fontWeight:800,color:DARK,marginBottom:16}}>Quick Actions</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {[
              {l:"New Requisition",      p:"/requisitions",      col:BLUE,   icon:FileText,     roles:[]},
              {l:"Receive Goods (GRN)",  p:"/goods-received",    col:GREEN,  icon:CheckCircle,  roles:["admin","procurement_manager","procurement_officer","warehouse_officer"]},
              {l:"Record Payment",       p:"/vouchers/payment",  col:ORANGE, icon:DollarSign,   roles:["admin","procurement_manager","accountant"]},
              {l:"Stock Check",          p:"/items",             col:TEAL,   icon:Package,      roles:[]},
              {l:"View Reports",         p:"/reports",           col:PURPLE, icon:BarChart2,    roles:[]},
              {l:"Manage Users",         p:"/users",             col:"#374151",icon:Users,      roles:["admin","superadmin","webmaster"]},
              {l:"WhatsApp Hub",          p:"/whatsapp",          col:"#25D366",icon:MessageSquare, roles:[]},
            ].filter(a=>!a.roles.length||a.roles.some(r=>roles.includes(r))).map(a=>{
              const Ic=a.icon;
              return(
                <button key={a.l} onClick={()=>nav(a.p)}
                  style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",
                    background:"#f8fafc",border:"1.5px solid #e5e7eb",borderRadius:9,
                    cursor:"pointer",fontSize:12.5,fontWeight:700,color:DARK,
                    textAlign:"left" as const,transition:"all .14s"}}
                  onMouseEnter={e=>{e.currentTarget.style.background=a.col+"12";e.currentTarget.style.borderColor=a.col;}}
                  onMouseLeave={e=>{e.currentTarget.style.background="#f8fafc";e.currentTarget.style.borderColor="#e5e7eb";}}>
                  <div style={{width:28,height:28,borderRadius:7,background:a.col+"18",
                    display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <Ic size={14} color={a.col}/>
                  </div>
                  {a.l}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
