/**
 * ProcurBosse — Dashboard v6.1 (ERP Wheel v5.8 Design)
 * Role-filtered segments · Dynamic links per role · Custom role creator
 * KPI sidebar · Realtime · Profile upload · v5.8 layout restored
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import ImageUploader from "@/components/ImageUploader";
import NotificationPopup from "@/components/NotificationPopup";
import logoImg from "@/assets/logo.png";
import embuLogo from "@/assets/embu-county-logo.jpg";
import {
  Bell, User, LogOut, Mail, Shield, Settings, RefreshCw,
  TrendingUp, TrendingDown, ShoppingCart, Package, DollarSign,
  FileText, CheckCircle, Clock, AlertTriangle, Activity,
  ChevronRight, X, Zap, Users, BarChart3, Archive,
  Plus, Edit3, Trash2, Save, Phone, MessageSquare
} from "lucide-react";
import { checkTwilioStatus } from "@/lib/sms";

const db = supabase as any;

/* ── Polar math ──────────────────────────────────────────────────────────── */
const P = (cx:number,cy:number,r:number,deg:number) => {
  const a=(deg-90)*Math.PI/180; return{x:cx+r*Math.cos(a),y:cy+r*Math.sin(a)};
};
const arc = (cx:number,cy:number,OR:number,IR:number,s:number,e:number,gap=4) => {
  const sa=s+gap/2,ea=e-gap/2;
  const o1=P(cx,cy,OR,sa),o2=P(cx,cy,OR,ea),i1=P(cx,cy,IR,ea),i2=P(cx,cy,IR,sa);
  const lg=ea-sa>180?1:0;
  return `M${o1.x},${o1.y} A${OR},${OR} 0 ${lg},1 ${o2.x},${o2.y} L${i1.x},${i1.y} A${IR},${IR} 0 ${lg},0 ${i2.x},${i2.y} Z`;
};

/* ── Role → visible segments mapping ─────────────────────────────────────── */
const ROLE_SEGS: Record<string, string[]> = {
  admin:               ["procurement","finance","inventory","quality","reports","admin","comms"],
  superadmin:          ["procurement","finance","inventory","quality","reports","admin","comms"],
  webmaster:           ["procurement","finance","inventory","quality","reports","admin","comms"],
  database_admin:      ["admin","reports"],
  procurement_manager: ["procurement","finance","inventory","quality","reports","comms"],
  procurement_officer: ["procurement","inventory","reports","comms"],
  accountant:          ["finance","procurement","reports"],
  inventory_manager:   ["inventory","procurement","quality","reports"],
  warehouse_officer:   ["inventory","comms"],
  requisitioner:       ["procurement","reports"],
};

/* ── Segment definitions ─────────────────────────────────────────────────── */
type Link = { label:string; path:string; roles?:string[] };
type Seg  = { id:string; label:string; sub:string; g1:string; g2:string; g3:string; glow:string; start:number; end:number; links:Link[] };

const ALL_SEGS: Seg[] = [
  {id:"procurement",label:"PROCUREMENT",sub:"Orders & Sourcing",g1:"#1a5fb5",g2:"#0d3d87",g3:"#5b9fd4",glow:"#3b82f680",start:0,end:60,
   links:[{label:"Requisitions",path:"/requisitions"},{label:"Purchase Orders",path:"/purchase-orders"},{label:"Goods Received",path:"/goods-received"},{label:"Suppliers",path:"/suppliers"},{label:"Tenders",path:"/tenders"},{label:"Contracts",path:"/contracts"},{label:"Bid Evaluations",path:"/bid-evaluations"},{label:"Proc. Planning",path:"/procurement-planning"}]},
  {id:"finance",label:"FINANCE",sub:"Budgets & Payments",g1:"#6d28d9",g2:"#4c1d95",g3:"#9b5ef5",glow:"#7c3aed80",start:60,end:120,
   links:[{label:"Finance Dashboard",path:"/financials/dashboard"},{label:"Budgets",path:"/financials/budgets"},{label:"Payment Vouchers",path:"/vouchers/payment"},{label:"Receipt Vouchers",path:"/vouchers/receipt"},{label:"Journal Vouchers",path:"/vouchers/journal"},{label:"Chart of Accounts",path:"/financials/chart-of-accounts"},{label:"Fixed Assets",path:"/financials/fixed-assets"},{label:"Accountant Workspace",path:"/accountant-workspace"}]},
  {id:"inventory",label:"INVENTORY",sub:"Stock & Items",g1:"#047857",g2:"#065f46",g3:"#10b981",glow:"#05986180",start:120,end:180,
   links:[{label:"Items / Stock",path:"/items"},{label:"Categories",path:"/categories"},{label:"Departments",path:"/departments"},{label:"Scanner",path:"/scanner"},{label:"Stock Movements",path:"/items"},{label:"GRN",path:"/goods-received"}]},
  {id:"quality",label:"QUALITY",sub:"QC & Compliance",g1:"#b45309",g2:"#78350f",g3:"#f59e0b",glow:"#d9770680",start:180,end:240,
   links:[{label:"QC Dashboard",path:"/quality/dashboard"},{label:"Inspections",path:"/quality/inspections"},{label:"Non-Conformance",path:"/quality/non-conformance"}]},
  {id:"reports",label:"REPORTS",sub:"Analytics & BI",g1:"#5b21b6",g2:"#3b0764",g3:"#8b5cf6",glow:"#8764b880",start:240,end:300,
   links:[{label:"Reports & BI",path:"/reports"},{label:"Audit Log",path:"/audit-log"},{label:"Documents",path:"/documents"},{label:"Notifications",path:"/notifications"}]},
  {id:"comms",label:"COMMS",sub:"SMS · Calls · Email",g1:"#0369a1",g2:"#0c4a6e",g3:"#0ea5e9",glow:"#0891b280",start:300,end:330,
   links:[{label:"SMS",path:"/sms"},{label:"Telephony",path:"/telephony"},{label:"Email",path:"/email"},{label:"Reception",path:"/reception"}]},
  {id:"admin",label:"ADMIN",sub:"System Control",g1:"#b91c1c",g2:"#7f1d1d",g3:"#ef4444",glow:"#ef444480",start:330,end:360,
   links:[{label:"Admin Panel",path:"/admin/panel"},{label:"Users",path:"/users"},{label:"Settings",path:"/settings"},{label:"Webmaster",path:"/webmaster"},{label:"DB Monitor",path:"/admin/db-test"},{label:"ODBC/MySQL",path:"/odbc"},{label:"Backup",path:"/backup"},{label:"Superadmin",path:"/superadmin"}]},
];

const CX=300,CY=300,OR=248,IR=98;

/* ── KPI Card ─────────────────────────────────────────────────────────────── */
function KpiTile({label,value,color,icon:Icon,onClick}:{label:string;value:number;color:string;icon:any;onClick?:()=>void}) {
  return(
    <div onClick={onClick} style={{background:"rgba(255,255,255,0.04)",border:`1px solid rgba(255,255,255,0.08)`,borderRadius:10,padding:"10px 12px",cursor:onClick?"pointer":"default",transition:"all .15s"}}
      onMouseEnter={e=>onClick&&((e.currentTarget as any).style.background="rgba(255,255,255,0.08)")}
      onMouseLeave={e=>onClick&&((e.currentTarget as any).style.background="rgba(255,255,255,0.04)")}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
        <Icon size={14} color={color}/>
        <span style={{fontSize:9,color:"rgba(255,255,255,0.45)",letterSpacing:".06em",textTransform:"uppercase"}}>{label}</span>
      </div>
      <div style={{fontSize:24,fontWeight:900,color,lineHeight:1}}>{value}</div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const nav = useNavigate();
  const {user,profile,roles,signOut,primaryRole,hasRole} = useAuth();
  const settings = useSystemSettings();
  const [active,setActive] = useState<string|null>(null);
  const [hov,setHov]       = useState<string|null>(null);
  const [showNotifs,setShowNotifs] = useState(false);
  const [showUpload,setShowUpload] = useState(false);
  const [showRoleEditor,setShowRoleEditor] = useState(false);
  const [clock,setClock]   = useState("");
  const [twilioOk,setTwilioOk] = useState<boolean|null>(null);
  const [kpi,setKpi] = useState({reqs:0,pos:0,pvs:0,lowStock:0,suppliers:0,pendingGRN:0,contracts:0,unread:0});
  const [refreshing,setRefreshing] = useState(false);

  const sysName  = settings.system_name   || "EL5 MediProcure";
  const hospital = settings.hospital_name || "Embu Level 5 Hospital";
  const isAdmin  = hasRole("admin","superadmin","webmaster");

  // Role -> visible segments (filter wheel per user role)
  const allowedSegs = new Set<string>();
  roles.forEach(r => (ROLE_SEGS[r]||[]).forEach(s => allowedSegs.add(s)));
  if (isAdmin) ALL_SEGS.forEach(s => allowedSegs.add(s.id));
  const visibleSegs = ALL_SEGS.filter(s => allowedSegs.has(s.id));

  // Remap segment angles evenly for visible segments
  const remapped = visibleSegs.map((seg,i) => {
    const total = visibleSegs.length;
    const step  = 360 / total;
    return { ...seg, start: i*step, end: (i+1)*step };
  });

  /* Clock */
  useEffect(()=>{
    const tick=()=>setClock(new Date().toLocaleTimeString("en-KE",{timeZone:"Africa/Nairobi",hour:"2-digit",minute:"2-digit",second:"2-digit"}));
    tick(); const iv=setInterval(tick,1000); return()=>clearInterval(iv);
  },[]);

  /* Greeting */
  const hour=new Date().getHours();
  const greeting=hour<12?"Good morning":hour<17?"Good afternoon":"Good evening";

  /* Twilio status */
  useEffect(()=>{
    checkTwilioStatus().then(r=>setTwilioOk(r.ok)).catch(()=>setTwilioOk(false));
  },[]);

  /* KPIs */
  const fetchKpis = useCallback(async()=>{
    setRefreshing(true);
    const [r,p,pv,ls,s,grn,ct,n] = await Promise.allSettled([
      db.from("requisitions").select("id",{count:"exact",head:true}).in("status",["submitted","pending"]),
      db.from("purchase_orders").select("id",{count:"exact",head:true}).in("status",["pending","approved"]),
      db.from("payment_vouchers").select("id",{count:"exact",head:true}).in("status",["pending"]),
      db.from("items").select("id",{count:"exact",head:true}).lt("current_quantity",5),
      db.from("suppliers").select("id",{count:"exact",head:true}).eq("status","active"),
      db.from("goods_received").select("id",{count:"exact",head:true}).eq("status","pending"),
      db.from("contracts").select("id",{count:"exact",head:true}).eq("status","active"),
      db.from("notifications").select("id",{count:"exact",head:true}).eq("is_read",false),
    ]);
    const v=(x:any)=>x.status==="fulfilled"?x.value?.count??0:0;
    setKpi({reqs:v(r),pos:v(p),pvs:v(pv),lowStock:v(ls),suppliers:v(s),pendingGRN:v(grn),contracts:v(ct),unread:v(n)});
    setRefreshing(false);
  },[]);

  useEffect(()=>{
    fetchKpis();
    const iv=setInterval(fetchKpis,60_000);
    const ch=db.channel("dash:kpi")
      .on("postgres_changes",{event:"*",schema:"public",table:"requisitions"},fetchKpis)
      .on("postgres_changes",{event:"*",schema:"public",table:"purchase_orders"},fetchKpis)
      .on("postgres_changes",{event:"*",schema:"public",table:"notifications"},fetchKpis)
      .subscribe();
    return()=>{clearInterval(iv);db.removeChannel(ch);};
  },[fetchKpis]);

  const openSeg=(id:string)=>setActive(a=>a===id?null:id);
  const activeSeg=remapped.find(s=>s.id===active);

  const kpiAlerts=[
    kpi.reqs>0&&{label:`${kpi.reqs} Pending Reqs`,color:"#f59e0b"},
    kpi.lowStock>0&&{label:`${kpi.lowStock} Low Stock`,color:"#ef4444"},
    kpi.pvs>0&&{label:`${kpi.pvs} Vouchers`,color:"#60a5fa"},
  ].filter(Boolean) as any[];

  return(
    <div style={{position:"fixed",inset:0,overflow:"hidden",fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",display:"flex",flexDirection:"column"}}>
      <style>{`
        @keyframes pulse{0%,100%{opacity:.6;transform:scale(1)}50%{opacity:1;transform:scale(1.04)}}
        @keyframes ringPulse{0%,100%{opacity:.15}50%{opacity:.5}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes notifIn{from{opacity:0;transform:translateX(14px)}to{opacity:1;transform:translateX(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .seg-hover:hover{filter:brightness(1.12)!important}
      `}</style>

      {/* ── Background ── */}
      <div style={{position:"absolute",inset:0,background:`radial-gradient(ellipse at 20% 10%,#1a3a6b40 0%,transparent 50%),radial-gradient(ellipse at 80% 90%,#6d28d930 0%,transparent 50%),#0a1628`}}/>
      <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(255,255,255,.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.012) 1px,transparent 1px)",backgroundSize:"44px 44px"}}/>

      {/* ── TOP BAR ── */}
      <div style={{position:"relative",zIndex:100,height:52,flexShrink:0,display:"flex",alignItems:"center",padding:"0 18px",background:"rgba(10,22,40,.9)",backdropFilter:"blur(16px)",borderBottom:"1px solid rgba(255,255,255,.07)"}}>
        {/* Logo + name */}
        <div style={{display:"flex",alignItems:"center",gap:10,flex:1}}>
          <img src={logoImg} alt="" style={{width:30,height:30,borderRadius:7,objectFit:"contain",background:"rgba(255,255,255,.08)",padding:3}}/>
          <div>
            <div style={{fontSize:11,fontWeight:800,color:"#fff",lineHeight:1}}>{sysName}</div>
            <div style={{fontSize:8,color:"rgba(255,255,255,.3)",marginTop:1,letterSpacing:".06em"}}>{hospital}</div>
          </div>
        </div>

        {/* KPI alert pills */}
        <div style={{display:"flex",gap:5,marginRight:10}}>
          {kpiAlerts.slice(0,3).map((a,i)=>(
            <div key={i} style={{padding:"2px 8px",borderRadius:20,background:a.color+"22",border:`1px solid ${a.color}44`,fontSize:9,fontWeight:700,color:a.color}}>{a.label}</div>
          ))}
          {/* Twilio status dot */}
          {twilioOk!==null&&(
            <div style={{display:"flex",alignItems:"center",gap:4,padding:"2px 8px",borderRadius:20,background:twilioOk?"rgba(34,197,94,.15)":"rgba(239,68,68,.15)",border:`1px solid ${twilioOk?"#22c55e44":"#ef444444"}`,fontSize:9,fontWeight:700,color:twilioOk?"#22c55e":"#ef4444"}}>
              <Phone size={8}/>{twilioOk?"SMS ON":"SMS ERR"}
            </div>
          )}
        </div>

        {/* Clock */}
        <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.35)",letterSpacing:".08em",fontVariantNumeric:"tabular-nums",marginRight:14}}>{clock}</div>

        {/* Role badge */}
        <div style={{padding:"3px 10px",borderRadius:20,background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",fontSize:9,fontWeight:700,color:"rgba(255,255,255,.5)",marginRight:8}}>
          {primaryRole?.replace(/_/g," ")||"Staff"}
        </div>

        {/* Actions */}
        {[
          {icon:RefreshCw,act:fetchKpis,title:"Refresh",spin:refreshing},
          {icon:Phone,    path:"/sms",           title:"SMS"},
          {icon:Mail,     path:"/email",          title:"Email"},
          {icon:Shield,   path:"/admin/panel",    title:"Admin",  adminOnly:true},
          {icon:Settings, path:"/settings",       title:"Settings",adminOnly:true},
        ].filter((b:any)=>!b.adminOnly||isAdmin).map((b:any,i:number)=>(
          <button key={i} onClick={b.act||(()=>nav(b.path))} title={b.title}
            style={{padding:"5px 7px",borderRadius:6,background:"transparent",border:"none",cursor:"pointer",color:"rgba(255,255,255,.4)",display:"flex",alignItems:"center"}}
            onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,.1)")}
            onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
            <b.icon size={14} style={b.spin&&refreshing?{animation:"spin 1s linear infinite"}:{}}/>
          </button>
        ))}

        {/* Notifications */}
        <div style={{position:"relative"}}>
          <button onClick={()=>setShowNotifs(p=>!p)}
            style={{padding:"5px 7px",borderRadius:6,background:showNotifs?"rgba(79,70,229,.25)":"transparent",border:"none",cursor:"pointer",color:"rgba(255,255,255,.4)",display:"flex",alignItems:"center",position:"relative"}}
            onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,.1)")}
            onMouseLeave={e=>(e.currentTarget.style.background=showNotifs?"rgba(79,70,229,.25)":"transparent")}>
            <Bell size={14}/>
            {kpi.unread>0&&<span style={{position:"absolute",top:3,right:3,width:6,height:6,borderRadius:"50%",background:"#ef4444"}}/>}
          </button>
          {showNotifs&&<div style={{position:"absolute",top:"calc(100% + 8px)",right:0,zIndex:200,animation:"notifIn .2s ease-out"}}>
            <NotificationPopup onClose={()=>setShowNotifs(false)}/>
          </div>}
        </div>

        {/* Avatar */}
        <button onClick={()=>setShowUpload(p=>!p)} style={{marginLeft:4,background:"transparent",border:"none",cursor:"pointer",padding:0}}>
          {profile?.avatar_url
            ?<img src={profile.avatar_url} alt="" style={{width:26,height:26,borderRadius:"50%",objectFit:"cover"}}/>
            :<div style={{width:26,height:26,borderRadius:"50%",background:"#1b5fcc",display:"flex",alignItems:"center",justifyContent:"center"}}><User size={13} color="#fff"/></div>
          }
        </button>
        <button onClick={()=>{signOut();nav("/login");}} title="Sign Out"
          style={{padding:"5px 7px",borderRadius:6,background:"transparent",border:"none",cursor:"pointer",color:"rgba(255,255,255,.4)",display:"flex",alignItems:"center",marginLeft:2}}
          onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,.1)")}
          onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
          <LogOut size={14}/>
        </button>
      </div>

      {/* ── MAIN ── */}
      <div style={{position:"relative",flex:1,display:"flex",overflow:"hidden"}}>

        {/* Left KPI panel */}
        <div style={{width:176,flexShrink:0,padding:"12px 10px",display:"flex",flexDirection:"column",gap:7,overflowY:"auto",background:"rgba(0,0,0,.25)"}}>
          <div style={{fontSize:9,fontWeight:700,color:"rgba(255,255,255,.25)",letterSpacing:".1em",marginBottom:2}}>LIVE METRICS</div>
          <KpiTile label="Pending Reqs"   value={kpi.reqs}       color="#f59e0b" icon={Clock}         onClick={()=>nav("/requisitions")}/>
          <KpiTile label="Open POs"       value={kpi.pos}        color="#60a5fa" icon={ShoppingCart}   onClick={()=>nav("/purchase-orders")}/>
          <KpiTile label="Vouchers Due"   value={kpi.pvs}        color="#a78bfa" icon={DollarSign}     onClick={()=>nav("/vouchers/payment")}/>
          <KpiTile label="Low Stock"      value={kpi.lowStock}   color="#f87171" icon={AlertTriangle}  onClick={()=>nav("/items")}/>
          <KpiTile label="Active Suppliers" value={kpi.suppliers} color="#34d399" icon={Users}         onClick={()=>nav("/suppliers")}/>
          <KpiTile label="Pending GRN"    value={kpi.pendingGRN} color="#38bdf8" icon={Package}        onClick={()=>nav("/goods-received")}/>
          <KpiTile label="Active Contracts" value={kpi.contracts} color="#fb923c" icon={FileText}      onClick={()=>nav("/contracts")}/>
          <KpiTile label="Notifications"  value={kpi.unread}     color="#c084fc" icon={Bell}           onClick={()=>nav("/notifications")}/>

          {/* Role creator button for admin */}
          {isAdmin&&(
            <button onClick={()=>setShowRoleEditor(true)}
              style={{marginTop:8,display:"flex",alignItems:"center",gap:6,padding:"7px 10px",background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",borderRadius:8,cursor:"pointer",color:"rgba(255,255,255,.5)",fontSize:10,fontWeight:600}}>
              <Plus size={11}/> New Role
            </button>
          )}

          {/* Quick SMS/Call */}
          <div style={{marginTop:4,display:"flex",gap:5}}>
            <button onClick={()=>nav("/sms")} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:4,padding:"6px",background:"rgba(34,197,94,.12)",border:"1px solid rgba(34,197,94,.25)",borderRadius:7,cursor:"pointer",color:"#22c55e",fontSize:10,fontWeight:700}}>
              <MessageSquare size={10}/> SMS
            </button>
            <button onClick={()=>nav("/telephony")} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:4,padding:"6px",background:"rgba(56,189,248,.12)",border:"1px solid rgba(56,189,248,.25)",borderRadius:7,cursor:"pointer",color:"#38bdf8",fontSize:10,fontWeight:700}}>
              <Phone size={10}/> Call
            </button>
          </div>
        </div>

        {/* Center: ERP Wheel */}
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
          {!active&&(
            <div style={{position:"absolute",top:14,left:"50%",transform:"translateX(-50%)",textAlign:"center",pointerEvents:"none",animation:"fadeIn .4s",zIndex:5}}>
              <div style={{fontSize:12,color:"rgba(255,255,255,.35)"}}>{greeting}, <span style={{color:"rgba(255,255,255,.75)",fontWeight:700}}>{profile?.full_name?.split(" ")[0]||"Staff"}</span></div>
              <div style={{fontSize:8,color:"rgba(255,255,255,.18)",marginTop:2}}>Click a segment · {remapped.length} modules available</div>
            </div>
          )}

          <svg width={580} height={580} viewBox="0 0 600 600" style={{filter:"drop-shadow(0 12px 48px rgba(0,0,0,.7))",overflow:"visible",flexShrink:0}}>
            <defs>
              {remapped.map(s=>(
                <radialGradient key={s.id} id={`g-${s.id}`} cx="50%" cy="50%" r="55%" fx="30%" fy="30%">
                  <stop offset="0%" stopColor={s.g3}/>
                  <stop offset="50%" stopColor={s.g1}/>
                  <stop offset="100%" stopColor={s.g2}/>
                </radialGradient>
              ))}
              <radialGradient id="g-center" cx="40%" cy="35%" r="60%">
                <stop offset="0%" stopColor="#fde68a"/>
                <stop offset="45%" stopColor="#d97706"/>
                <stop offset="100%" stopColor="#78350f"/>
              </radialGradient>
              <filter id="glow2" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="9" result="b"/>
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>

            {/* Outer rings */}
            <circle cx={CX} cy={CY} r={OR+30} fill="none" stroke="rgba(255,255,255,.03)" strokeWidth={22} style={{animation:"ringPulse 3.5s ease-in-out infinite"}}/>
            <circle cx={CX} cy={CY} r={OR+30} fill="none" stroke="rgba(255,255,255,.05)" strokeWidth={1}/>
            <circle cx={CX} cy={CY} r={OR+14} fill="none" stroke="rgba(255,255,255,.03)" strokeWidth={1} strokeDasharray="3 4"/>

            {/* Tick marks */}
            {Array.from({length:60}).map((_,i)=>{
              const deg=i*6,isMajor=i%5===0;
              const p1=P(CX,CY,OR+32,deg),p2=P(CX,CY,OR+32+(isMajor?6:3),deg);
              return<line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={`rgba(255,255,255,${isMajor?.2:.08})`} strokeWidth={isMajor?1.2:.7}/>;
            })}

            {/* Segments */}
            {remapped.map(s=>{
              const isActive=active===s.id;
              const isHov=hov===s.id;
              const scale=isActive?1.04:isHov?1.02:1;
              const mid=(s.start+s.end)/2;
              const lp=P(CX,CY,(OR+IR)/2+10,mid);
              const sp=P(CX,CY,(OR+IR)/2-18,mid);
              const words=s.label.split(" ");

              return(
                <g key={s.id} className="seg-hover"
                  onClick={()=>openSeg(s.id)}
                  onMouseEnter={()=>setHov(s.id)} onMouseLeave={()=>setHov(null)}
                  style={{cursor:"pointer",transition:"transform .25s cubic-bezier(.4,0,.2,1)",transform:`scale(${scale})`,transformOrigin:`${CX}px ${CY}px`}}>
                  {isActive&&<path d={arc(CX,CY,OR+8,IR-8,s.start,s.end,2)} fill={s.glow} filter="url(#glow2)"/>}
                  <path d={arc(CX,CY,OR,IR,s.start,s.end)}
                    fill={isActive?s.g3:`url(#g-${s.id})`}
                    stroke={isActive?"rgba(255,255,255,.65)":isHov?"rgba(255,255,255,.3)":"rgba(255,255,255,.07)"}
                    strokeWidth={isActive?2.5:1}/>
                  <path d={arc(CX,CY,OR,OR-20,s.start,s.end,3)} fill="rgba(255,255,255,.06)"/>
                  <path d={arc(CX,CY,IR+20,IR,s.start,s.end,3)} fill="rgba(0,0,0,.12)"/>
                  {words.map((w,wi)=>(
                    <text key={wi} x={lp.x} y={lp.y+(wi-(words.length-1)/2)*13}
                      textAnchor="middle" dominantBaseline="central"
                      fill={isActive?"#fff":"rgba(255,255,255,.92)"}
                      fontSize={11} fontWeight={900} letterSpacing={1.5}
                      style={{pointerEvents:"none",userSelect:"none",textShadow:"0 2px 8px rgba(0,0,0,.9)",filter:isActive?"drop-shadow(0 0 5px rgba(255,255,255,.6))":"none"}}>{w}</text>
                  ))}
                  <text x={sp.x} y={sp.y} textAnchor="middle" dominantBaseline="central"
                    fill={isActive?"rgba(255,255,255,.8)":"rgba(255,255,255,.32)"}
                    fontSize={7.5} fontWeight={500} style={{pointerEvents:"none"}}>{s.sub}</text>
                </g>
              );
            })}

            {/* Center hub */}
            <circle cx={CX} cy={CY} r={IR-4} fill="url(#g-center)" stroke="rgba(255,255,255,.18)" strokeWidth={2}/>
            <circle cx={CX} cy={CY} r={IR-4} fill="none" stroke="rgba(255,165,0,.3)" strokeWidth={1} strokeDasharray="3 4" style={{animation:"ringPulse 4s ease-in-out infinite"}}/>
            <image href={logoImg} x={CX-22} y={CY-30} width={44} height={44} style={{opacity:.7}}/>
            <text x={CX} y={CY+22} textAnchor="middle" fill="rgba(253,230,138,.6)" fontSize={7} fontWeight={600} letterSpacing={1.5}>v5.9</text>
          </svg>

          {/* Active segment panel */}
          {activeSeg&&(
            <div style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",width:196,background:"rgba(10,22,40,.92)",border:`1px solid ${activeSeg.g1}55`,borderRadius:14,padding:"14px 14px",backdropFilter:"blur(16px)",animation:"fadeIn .2s",zIndex:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <span style={{fontWeight:800,fontSize:12,color:"#fff",textTransform:"capitalize"}}>{activeSeg.label}</span>
                <button onClick={()=>setActive(null)} style={{background:"transparent",border:"none",cursor:"pointer",color:"rgba(255,255,255,.4)",padding:2}}><X size={13}/></button>
              </div>
              {activeSeg.links.map(l=>(
                <button key={l.path} onClick={()=>nav(l.path)}
                  style={{width:"100%",display:"flex",alignItems:"center",gap:7,padding:"7px 9px",borderRadius:7,background:"rgba(255,255,255,.04)",border:"none",cursor:"pointer",color:"rgba(255,255,255,.75)",fontSize:11,marginBottom:3,transition:"all .12s",textAlign:"left"}}
                  onMouseEnter={e=>{(e.currentTarget as any).style.background=activeSeg.g1+"55";(e.currentTarget as any).style.color="#fff";}}
                  onMouseLeave={e=>{(e.currentTarget as any).style.background="rgba(255,255,255,.04)";(e.currentTarget as any).style.color="rgba(255,255,255,.75)";}}>
                  <ChevronRight size={10} color={activeSeg.g1}/>{l.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Profile upload popup */}
      {showUpload&&(
        <div style={{position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,.65)",display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setShowUpload(false)}>
          <div style={{background:"#132040",border:"1px solid rgba(255,255,255,.1)",borderRadius:16,padding:24,minWidth:260,animation:"fadeIn .2s"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
              <span style={{fontWeight:700,color:"#e2e8f0",fontSize:13}}>Update Photo</span>
              <button onClick={()=>setShowUpload(false)} style={{background:"transparent",border:"none",cursor:"pointer",color:"#475569"}}><X size={15}/></button>
            </div>
            <div style={{display:"flex",justifyContent:"center",marginBottom:12}}>
              <ImageUploader type="profile" circle size="lg" current={profile?.avatar_url||""}
                folder={`profiles/${user?.id}`}
                onUploaded={async(url)=>{
                  if(url&&user?.id)await db.from("profiles").update({avatar_url:url}).eq("id",user.id);
                  setShowUpload(false);
                }}/>
            </div>
            <div style={{fontSize:10,color:"#475569",textAlign:"center"}}>Drag & drop or click · max 5MB</div>
          </div>
        </div>
      )}

      {/* Role creator modal (admin only) */}
      {showRoleEditor&&isAdmin&&(
        <RoleCreatorModal onClose={()=>setShowRoleEditor(false)}/>
      )}
    </div>
  );
}

/* ── Role Creator Modal ──────────────────────────────────────────────────── */
function RoleCreatorModal({onClose}:{onClose:()=>void}) {
  const [roleName,setRoleName] = useState("");
  const [caps,setCaps] = useState<string[]>([]);
  const [saving,setSaving] = useState(false);

  const ALL_CAPS = ["create_requisitions","approve_requisitions","create_po","approve_po","receive_goods",
    "manage_suppliers","manage_contracts","manage_tenders","view_financials","create_vouchers",
    "approve_vouchers","manage_budgets","manage_items","view_reports","manage_users","system_settings","view_audit"];

  const toggle=(c:string)=>setCaps(p=>p.includes(c)?p.filter(x=>x!==c):[...p,c]);

  const save=async()=>{
    if(!roleName.trim())return;
    setSaving(true);
    const key=roleName.toLowerCase().replace(/\s+/g,"_");
    await (supabase as any).from("system_settings").upsert({key:`custom_role_${key}`,value:JSON.stringify({name:key,label:roleName,capabilities:caps}),category:"roles"},{onConflict:"key"});
    toast(`Role "${roleName}" created`);
    setSaving(false); onClose();
  };

  const toast=(msg:string)=>{const t=document.createElement("div");t.style.cssText="position:fixed;bottom:24px;right:24px;background:#1b5fcc;color:#fff;padding:10px 18px;border-radius:8px;font-size:12px;font-weight:700;z-index:9999";t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),3000);};

  return(
    <div style={{position:"fixed",inset:0,zIndex:400,background:"rgba(0,0,0,.7)",display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>
      <div style={{background:"#132040",border:"1px solid rgba(255,255,255,.1)",borderRadius:16,padding:24,width:480,maxHeight:"80vh",overflowY:"auto",animation:"fadeIn .2s"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}>
          <span style={{fontWeight:800,color:"#e2e8f0",fontSize:15}}>Create New Role</span>
          <button onClick={onClose} style={{background:"transparent",border:"none",cursor:"pointer",color:"#475569"}}><X size={16}/></button>
        </div>
        <input value={roleName} onChange={e=>setRoleName(e.target.value)} placeholder="Role name (e.g. Pharmacist)"
          style={{width:"100%",background:"rgba(0,0,0,.3)",border:"1px solid rgba(255,255,255,.15)",borderRadius:8,padding:"9px 12px",color:"#e2e8f0",fontSize:13,outline:"none",marginBottom:14,boxSizing:"border-box"}}/>
        <div style={{fontSize:11,color:"rgba(255,255,255,.4)",marginBottom:8}}>Select capabilities:</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:16}}>
          {ALL_CAPS.map(c=>(
            <button key={c} onClick={()=>toggle(c)} style={{padding:"4px 10px",borderRadius:6,fontSize:10,fontWeight:600,border:"none",cursor:"pointer",background:caps.includes(c)?"#1b5fcc":"rgba(255,255,255,.07)",color:caps.includes(c)?"#fff":"rgba(255,255,255,.5)"}}>
              {c.replace(/_/g," ")}
            </button>
          ))}
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={{padding:"8px 16px",background:"rgba(255,255,255,.07)",border:"1px solid rgba(255,255,255,.15)",borderRadius:8,color:"rgba(255,255,255,.5)",fontSize:12,fontWeight:700,cursor:"pointer"}}>Cancel</button>
          <button onClick={save} disabled={saving||!roleName.trim()} style={{padding:"8px 16px",background:saving||!roleName?"#374151":"#1b5fcc",border:"none",borderRadius:8,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>
            {saving?<RefreshCw size={12} style={{animation:"spin 1s linear infinite"}}/>:<Save size={12}/>} {saving?"Saving...":"Create Role"}
          </button>
        </div>
      </div>
    </div>
  );
}

import type React from "react";
