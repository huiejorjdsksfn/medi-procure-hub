/**
 * ProcurBosse — Dashboard v6.0 (Full Redesign)
 * Realtime KPIs · Live wheel · Image upload · Admin quick-actions
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { T } from "@/lib/theme";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import ImageUploader from "@/components/ImageUploader";
import NotificationPopup from "@/components/NotificationPopup";
import {
  Bell, User, LogOut, Mail, Shield, Settings, RefreshCw,
  TrendingUp, TrendingDown, ShoppingCart, Package, DollarSign,
  FileText, CheckCircle, Clock, AlertTriangle, Activity,
  ChevronRight, X, Zap, Users, BarChart3, Archive
} from "lucide-react";
import logoImg from "@/assets/logo.png";

const db = supabase as any;

/* ── Polar helpers ──────────────────────────────────────────────────────── */
const P = (cx:number,cy:number,r:number,deg:number) => {
  const a=(deg-90)*Math.PI/180; return{x:cx+r*Math.cos(a),y:cy+r*Math.sin(a)};
};
const arc=(cx:number,cy:number,OR:number,IR:number,s:number,e:number,gap=4)=>{
  const sa=s+gap/2,ea=e-gap/2;
  const o1=P(cx,cy,OR,sa),o2=P(cx,cy,OR,ea),i1=P(cx,cy,IR,ea),i2=P(cx,cy,IR,sa);
  const lg=ea-sa>180?1:0;
  return `M${o1.x},${o1.y} A${OR},${OR} 0 ${lg},1 ${o2.x},${o2.y} L${i1.x},${i1.y} A${IR},${IR} 0 ${lg},0 ${i2.x},${i2.y} Z`;
};

/* ── Wheel segments ─────────────────────────────────────────────────────── */
type Link={label:string;path:string};
type Seg={id:string;label:string;sub:string;g1:string;g2:string;g3:string;glow:string;start:number;end:number;links:Link[]};
const CX=300,CY=300,OR=248,IR=98;

const SEGS:Seg[]=[
  {id:"procurement",label:"PROCUREMENT",sub:"Orders & Sourcing",g1:"#1a5fb5",g2:"#0d3d87",g3:"#5b9fd4",glow:"#3b82f680",start:0,end:60,
   links:[{label:"Requisitions",path:"/requisitions"},{label:"Purchase Orders",path:"/purchase-orders"},{label:"Goods Received",path:"/goods-received"},{label:"Suppliers",path:"/suppliers"},{label:"Tenders",path:"/tenders"},{label:"Contracts",path:"/contracts"},{label:"Bid Evaluations",path:"/bid-evaluations"}]},
  {id:"finance",label:"FINANCE",sub:"Budgets & Payments",g1:"#6d28d9",g2:"#4c1d95",g3:"#9b5ef5",glow:"#7c3aed80",start:60,end:120,
   links:[{label:"Financials",path:"/financials/dashboard"},{label:"Budgets",path:"/financials/budgets"},{label:"Payment Vouchers",path:"/vouchers/payment"},{label:"Journal Vouchers",path:"/vouchers/journal"},{label:"Chart of Accounts",path:"/financials/chart-of-accounts"},{label:"Fixed Assets",path:"/financials/fixed-assets"}]},
  {id:"inventory",label:"INVENTORY",sub:"Stock & Items",g1:"#047857",g2:"#065f46",g3:"#10b981",glow:"#05986180",start:120,end:180,
   links:[{label:"Items / Stock",path:"/items"},{label:"Categories",path:"/categories"},{label:"Departments",path:"/departments"},{label:"Scanner",path:"/scanner"},{label:"Goods Received",path:"/goods-received"}]},
  {id:"quality",label:"QUALITY",sub:"QC & Compliance",g1:"#b45309",g2:"#78350f",g3:"#f59e0b",glow:"#d9770680",start:180,end:240,
   links:[{label:"QC Dashboard",path:"/quality/dashboard"},{label:"Inspections",path:"/quality/inspections"},{label:"Non-Conformance",path:"/quality/non-conformance"}]},
  {id:"reports",label:"REPORTS",sub:"Analytics & BI",g1:"#5b21b6",g2:"#3b0764",g3:"#8b5cf6",glow:"#8764b880",start:240,end:300,
   links:[{label:"Reports & BI",path:"/reports"},{label:"Audit Log",path:"/audit-log"},{label:"Documents",path:"/documents"}]},
  {id:"admin",label:"ADMIN",sub:"System Control",g1:"#b91c1c",g2:"#7f1d1d",g3:"#ef4444",glow:"#ef444480",start:300,end:360,
   links:[{label:"Admin Panel",path:"/admin/panel"},{label:"Users",path:"/users"},{label:"Settings",path:"/settings"},{label:"Webmaster",path:"/webmaster"},{label:"DB Monitor",path:"/admin/db-test"},{label:"Backup",path:"/backup"}]},
];

/* ── KPI card ───────────────────────────────────────────────────────────── */
function KpiCard({label,value,sub,color,icon:Icon,trend}:{
  label:string;value:string|number;sub?:string;color:string;icon:any;trend?:"up"|"down";
}) {
  return (
    <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:T.rLg,padding:"14px 16px",display:"flex",alignItems:"center",gap:12}}>
      <div style={{width:40,height:40,borderRadius:10,background:`${color}22`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        <Icon size={20} color={color}/>
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:11,color:T.fgDim,marginBottom:2}}>{label}</div>
        <div style={{fontSize:22,fontWeight:800,color:T.fg,lineHeight:1}}>{value}</div>
        {sub && <div style={{fontSize:10,color:T.fgMuted,marginTop:2}}>{sub}</div>}
      </div>
      {trend && (
        trend==="up"
          ? <TrendingUp size={16} color={T.success}/>
          : <TrendingDown size={16} color={T.error}/>
      )}
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const nav = useNavigate();
  const {user,profile,roles,signOut,primaryRole} = useAuth();
  const settings = useSystemSettings();
  const [active, setActive] = useState<string|null>(null);
  const [hov, setHov] = useState<string|null>(null);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [clock, setClock] = useState("");
  const [kpi, setKpi] = useState({reqs:0,pos:0,pvs:0,lowStock:0,suppliers:0,budgetSpend:0,totalPO:0,pendingGRN:0});
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const isAdmin = roles?.includes("admin");

  const sysName  = settings.system_name   || "EL5 MediProcure";
  const hospital = settings.hospital_name || "Embu Level 5 Hospital";

  /* clock */
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString("en-KE",{timeZone:"Africa/Nairobi",hour:"2-digit",minute:"2-digit",second:"2-digit"}));
    tick(); const iv = setInterval(tick,1000); return ()=>clearInterval(iv);
  },[]);

  /* greeting */
  const hour = new Date().getHours();
  const greeting = hour<12?"Good morning":hour<17?"Good afternoon":"Good evening";

  /* KPIs */
  const fetchKpis = useCallback(async () => {
    setRefreshing(true);
    const [r,p,pv,ls,s,po,grn] = await Promise.allSettled([
      db.from("requisitions").select("id",{count:"exact",head:true}).in("status",["submitted","pending"]),
      db.from("purchase_orders").select("id",{count:"exact",head:true}).in("status",["pending","approved"]),
      db.from("payment_vouchers").select("id",{count:"exact",head:true}).in("status",["pending"]),
      db.from("items").select("id",{count:"exact",head:true}).lt("current_quantity",5),
      db.from("suppliers").select("id",{count:"exact",head:true}).eq("status","active"),
      db.from("purchase_orders").select("total_amount").eq("status","completed").limit(100),
      db.from("goods_received").select("id",{count:"exact",head:true}).eq("status","pending"),
    ]);
    const v=(x:any)=>x.status==="fulfilled"?x.value?.count??0:0;
    const poData = p.status==="fulfilled"&&Array.isArray(p.value?.data)?p.value.data:[];
    const totalPO = poData.reduce((a:number,x:any)=>a+(x.total_amount||0),0);
    setKpi({
      reqs:v(r), pos:v(p), pvs:v(pv), lowStock:v(ls),
      suppliers:v(s), budgetSpend:0, totalPO, pendingGRN:v(grn),
    });

    /* recent activity */
    const {data:acts} = await db.from("audit_log").select("id,action,module,created_at,user_email").order("created_at",{ascending:false}).limit(8);
    setRecentActivity(acts||[]);
    setRefreshing(false);
  },[]);

  useEffect(()=>{
    fetchKpis();
    const iv=setInterval(fetchKpis,60_000);
    const ch=db.channel("dash:rt")
      .on("postgres_changes",{event:"*",schema:"public",table:"requisitions"},fetchKpis)
      .on("postgres_changes",{event:"*",schema:"public",table:"purchase_orders"},fetchKpis)
      .on("postgres_changes",{event:"*",schema:"public",table:"notifications"},fetchKpis)
      .subscribe();
    return ()=>{clearInterval(iv);db.removeChannel(ch);};
  },[fetchKpis]);

  const openSeg=(id:string)=>setActive(a=>a===id?null:id);
  const seg=(s:Seg)=>!s.id.includes("admin")||isAdmin;

  const fmtKES=(n:number)=>n>=1e6?`${(n/1e6).toFixed(1)}M`:n>=1000?`${(n/1000).toFixed(0)}K`:`${n.toLocaleString()}`;

  const activeSeg = SEGS.find(s=>s.id===active);

  return(
    <div style={{position:"fixed",inset:0,overflow:"hidden",background:T.bg,display:"flex",flexDirection:"column",fontFamily:"'Inter','Segoe UI',sans-serif"}}>
      <style>{`
        @keyframes pulse{0%,100%{opacity:.6;transform:scale(1)}50%{opacity:1;transform:scale(1.04)}}
        @keyframes ringPulse{0%,100%{opacity:.15}50%{opacity:.5}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
        @keyframes notifIn{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:translateX(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .seg-hover:hover{filter:brightness(1.12)}
      `}</style>

      {/* BG */}
      <div style={{position:"absolute",inset:0,background:`radial-gradient(ellipse at 30% 20%,${T.primary}18 0%,transparent 60%),radial-gradient(ellipse at 70% 80%,${T.finance}12 0%,transparent 60%),${T.bg}`}}/>
      <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(255,255,255,.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.012) 1px,transparent 1px)",backgroundSize:"44px 44px"}}/>

      {/* ── TOP BAR ── */}
      <div style={{position:"relative",zIndex:100,height:52,flexShrink:0,display:"flex",alignItems:"center",padding:"0 18px",background:"rgba(10,22,40,.85)",backdropFilter:"blur(16px)",borderBottom:`1px solid ${T.border}`}}>
        <div style={{display:"flex",alignItems:"center",gap:10,flex:1}}>
          <img src={logoImg} alt="" style={{width:32,height:32,borderRadius:8,objectFit:"contain",background:T.card,padding:3}}/>
          <div>
            <div style={{fontSize:12,fontWeight:800,color:T.fg,lineHeight:1}}>{sysName}</div>
            <div style={{fontSize:8,color:T.fgDim,marginTop:2,letterSpacing:".05em"}}>{hospital}</div>
          </div>
        </div>

        {/* KPI pills */}
        <div style={{display:"flex",gap:5,marginRight:10}}>
          {kpi.reqs>0&&<div style={{padding:"2px 8px",borderRadius:20,background:`${T.warning}18`,border:`1px solid ${T.warning}44`,fontSize:9,fontWeight:700,color:T.warning}}>{kpi.reqs} Pending Reqs</div>}
          {kpi.lowStock>0&&<div style={{padding:"2px 8px",borderRadius:20,background:`${T.error}18`,border:`1px solid ${T.error}44`,fontSize:9,fontWeight:700,color:T.error}}>{kpi.lowStock} Low Stock</div>}
          {kpi.pvs>0&&<div style={{padding:"2px 8px",borderRadius:20,background:`${T.info}18`,border:`1px solid ${T.info}44`,fontSize:9,fontWeight:700,color:T.info}}>{kpi.pvs} Vouchers</div>}
        </div>

        <div style={{fontSize:12,fontWeight:700,color:"rgba(255,255,255,.35)",letterSpacing:".08em",fontVariantNumeric:"tabular-nums",marginRight:12}}>{clock}</div>

        {/* Actions */}
        {[
          {icon:RefreshCw,act:fetchKpis,title:"Refresh",spin:refreshing},
          {icon:Mail,path:"/email",title:"Mail"},
          {icon:Shield,path:"/admin/panel",title:"Admin",adminOnly:true},
        ].filter(b=>(b as any).adminOnly?isAdmin:true).map((b,i)=>(
          <button key={i} onClick={(b as any).act||(()=>nav((b as any).path))} title={b.title}
            style={{padding:"5px 7px",borderRadius:6,background:"transparent",border:"none",cursor:"pointer",color:"rgba(255,255,255,.45)",display:"flex",alignItems:"center"}}
            onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,.1)")}
            onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
            <b.icon size={15} style={(b as any).spin&&refreshing?{animation:"spin 1s linear infinite"}:{}}/>
          </button>
        ))}

        {/* Notifications */}
        <div style={{position:"relative"}}>
          <button onClick={()=>setShowNotifs(p=>!p)} title="Notifications"
            style={{padding:"5px 7px",borderRadius:6,background:showNotifs?`${T.primary}33`:"transparent",border:"none",cursor:"pointer",color:"rgba(255,255,255,.45)",display:"flex",alignItems:"center",position:"relative"}}
            onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,.1)")}
            onMouseLeave={e=>(e.currentTarget.style.background=showNotifs?`${T.primary}33`:"transparent")}>
            <Bell size={15}/>
            {kpi.reqs+kpi.pvs>0&&<span style={{position:"absolute",top:2,right:2,width:7,height:7,borderRadius:"50%",background:T.error}}/>}
          </button>
          {showNotifs&&<div style={{position:"absolute",top:"calc(100% + 8px)",right:0,zIndex:200,animation:"notifIn .2s ease-out"}}>
            <NotificationPopup onClose={()=>setShowNotifs(false)}/>
          </div>}
        </div>

        {/* Avatar — clickable for upload */}
        <button onClick={()=>setShowUpload(p=>!p)} title="Profile"
          style={{marginLeft:4,background:"transparent",border:"none",cursor:"pointer",padding:0}}>
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt="" style={{width:28,height:28,borderRadius:"50%",objectFit:"cover"}}/>
            : <div style={{width:28,height:28,borderRadius:"50%",background:T.primary,display:"flex",alignItems:"center",justifyContent:"center"}}><User size={14} color="#fff"/></div>
          }
        </button>
        <button onClick={()=>{signOut();nav("/login");}} title="Sign Out"
          style={{padding:"5px 7px",borderRadius:6,background:"transparent",border:"none",cursor:"pointer",color:"rgba(255,255,255,.45)",display:"flex",alignItems:"center",marginLeft:2}}>
          <LogOut size={15}/>
        </button>
      </div>

      {/* Profile upload popup */}
      {showUpload&&(
        <div style={{position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setShowUpload(false)}>
          <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:T.rXl,padding:28,minWidth:280,animation:"fadeIn .2s"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}>
              <div style={{fontWeight:700,color:T.fg}}>Update Profile Photo</div>
              <button onClick={()=>setShowUpload(false)} style={{background:"transparent",border:"none",cursor:"pointer",color:T.fgDim}}><X size={16}/></button>
            </div>
            <div style={{display:"flex",justifyContent:"center",marginBottom:16}}>
              <ImageUploader type="profile" circle current={profile?.avatar_url||""}
                folder={`profiles/${user?.id}`} size="lg"
                onUploaded={async(url)=>{
                  if(url&&user?.id) await db.from("profiles").update({avatar_url:url}).eq("id",user.id);
                  setShowUpload(false);
                }}/>
            </div>
            <div style={{fontSize:11,color:T.fgDim,textAlign:"center"}}>Drag & drop or click to upload (max 5MB)</div>
          </div>
        </div>
      )}

      {/* ── MAIN ── */}
      <div style={{position:"relative",flex:1,display:"flex",overflow:"hidden"}}>

        {/* KPI sidebar */}
        <div style={{width:200,flexShrink:0,padding:"12px 10px",display:"flex",flexDirection:"column",gap:8,overflowY:"auto"}}>
          <div style={{fontSize:10,fontWeight:700,color:T.fgDim,letterSpacing:".08em",marginBottom:2}}>LIVE METRICS</div>
          <KpiCard label="Pending Reqs" value={kpi.reqs}  color={T.warning}  icon={Clock}         trend={kpi.reqs>0?"up":undefined}/>
          <KpiCard label="Open POs"     value={kpi.pos}   color={T.primary}  icon={ShoppingCart}  />
          <KpiCard label="Vouchers Due" value={kpi.pvs}   color={T.finance}  icon={DollarSign}    />
          <KpiCard label="Low Stock"    value={kpi.lowStock} color={T.error}  icon={AlertTriangle} trend={kpi.lowStock>0?"down":undefined}/>
          <KpiCard label="Suppliers"    value={kpi.suppliers} color={T.inventory} icon={Users}    />
          <KpiCard label="Pending GRN"  value={kpi.pendingGRN} color={T.comms} icon={Package}    />

          {/* Recent activity */}
          <div style={{fontSize:10,fontWeight:700,color:T.fgDim,letterSpacing:".08em",marginTop:6,marginBottom:2}}>RECENT ACTIVITY</div>
          {recentActivity.slice(0,6).map((a,i)=>(
            <div key={i} style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:8,padding:"7px 9px"}}>
              <div style={{fontSize:10,fontWeight:600,color:T.fg,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{a.action}</div>
              <div style={{fontSize:9,color:T.fgDim,marginTop:1}}>{a.module} · {new Date(a.created_at).toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit"})}</div>
            </div>
          ))}
        </div>

        {/* Center: wheel */}
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>

          {/* Greeting */}
          {!active&&(
            <div style={{position:"absolute",top:14,left:"50%",transform:"translateX(-50%)",textAlign:"center",pointerEvents:"none",animation:"fadeIn .4s"}}>
              <div style={{fontSize:13,color:"rgba(255,255,255,.4)"}}>{greeting}, <span style={{color:"rgba(255,255,255,.8)",fontWeight:700}}>{profile?.full_name?.split(" ")[0]||"Staff"}</span></div>
              <div style={{fontSize:9,color:"rgba(255,255,255,.2)",marginTop:2}}>Click a segment to navigate modules</div>
            </div>
          )}

          <svg width={580} height={580} viewBox="0 0 600 600" style={{filter:"drop-shadow(0 12px 48px rgba(0,0,0,.7))",overflow:"visible",flexShrink:0}}>
            <defs>
              {SEGS.map(s=>(
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
              <filter id="glow"><feGaussianBlur stdDeviation="9" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            </defs>

            <circle cx={CX} cy={CY} r={OR+30} fill="none" stroke="rgba(255,255,255,.03)" strokeWidth={22} style={{animation:"ringPulse 3.5s ease-in-out infinite"}}/>
            <circle cx={CX} cy={CY} r={OR+30} fill="none" stroke="rgba(255,255,255,.05)" strokeWidth={1}/>

            {SEGS.map(s=>{
              const isActive=active===s.id;
              const isHov=hov===s.id;
              const canAccess=seg(s);
              const scale=isActive?1.04:isHov&&canAccess?1.02:1;
              const mid=(s.start+s.end)/2;
              const lp=P(CX,CY,(OR+IR)/2+12,mid);
              const sp=P(CX,CY,(OR+IR)/2-18,mid);

              return(
                <g key={s.id} className="seg-hover"
                  onClick={()=>canAccess&&openSeg(s.id)}
                  onMouseEnter={()=>setHov(s.id)} onMouseLeave={()=>setHov(null)}
                  style={{opacity:canAccess?1:.25,cursor:canAccess?"pointer":"default",transition:"transform .25s",transform:`scale(${scale})`,transformOrigin:`${CX}px ${CY}px`}}>
                  {isActive&&<path d={arc(CX,CY,OR+8,IR-8,s.start,s.end,2)} fill={s.glow} filter="url(#glow)"/>}
                  <path d={arc(CX,CY,OR,IR,s.start,s.end)}
                    fill={isActive?s.g3:`url(#g-${s.id})`}
                    stroke={isActive?"rgba(255,255,255,.65)":isHov?"rgba(255,255,255,.3)":"rgba(255,255,255,.07)"} strokeWidth={isActive?2.5:1}/>
                  <path d={arc(CX,CY,OR,OR-20,s.start,s.end,3)} fill="rgba(255,255,255,.06)"/>
                  <path d={arc(CX,CY,IR+20,IR,s.start,s.end,3)} fill="rgba(0,0,0,.12)"/>
                  {s.label.split(" ").map((w,wi,arr)=>(
                    <text key={wi} x={lp.x} y={lp.y+(wi-(arr.length-1)/2)*14} textAnchor="middle" dominantBaseline="central" fill={isActive?"#fff":"rgba(255,255,255,.9)"} fontSize={11} fontWeight={900} letterSpacing={1.5} style={{pointerEvents:"none",userSelect:"none",textShadow:"0 2px 8px rgba(0,0,0,.9)"}}>{w}</text>
                  ))}
                  <text x={sp.x} y={sp.y} textAnchor="middle" dominantBaseline="central" fill={isActive?"rgba(255,255,255,.8)":"rgba(255,255,255,.35)"} fontSize={8} fontWeight={500} style={{pointerEvents:"none"}}>{s.sub}</text>
                </g>
              );
            })}

            {/* Center hub */}
            <circle cx={CX} cy={CY} r={IR-4} fill="url(#g-center)" stroke="rgba(255,255,255,.18)" strokeWidth={2}/>
            <circle cx={CX} cy={CY} r={IR-4} fill="none" stroke="rgba(255,165,0,.3)" strokeWidth={1} strokeDasharray="3 4" style={{animation:"ringPulse 4s ease-in-out infinite"}}/>
            <text x={CX} y={CY-10} textAnchor="middle" dominantBaseline="central" fill="#fde68a" fontSize={13} fontWeight={900} letterSpacing={2} style={{textShadow:"0 0 20px rgba(253,230,138,.8)"}}>{sysName.split(" ")[0]}</text>
            <text x={CX} y={CY+10} textAnchor="middle" dominantBaseline="central" fill="rgba(253,230,138,.5)" fontSize={7} fontWeight={600} letterSpacing={1.5}>v5.9</text>
          </svg>

          {/* Active segment panel */}
          {activeSeg&&(
            <div style={{position:"absolute",right:0,top:"50%",transform:"translateY(-50%)",width:200,background:`${T.card}f0`,border:`1px solid ${activeSeg.g1}66`,borderRadius:T.rXl,padding:16,backdropFilter:"blur(16px)",animation:"fadeIn .2s"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <span style={{fontWeight:800,fontSize:13,color:"#fff"}}>{activeSeg.label}</span>
                <button onClick={()=>setActive(null)} style={{background:"transparent",border:"none",cursor:"pointer",color:T.fgDim,padding:2}}><X size={14}/></button>
              </div>
              {activeSeg.links.map(l=>(
                <button key={l.path} onClick={()=>nav(l.path)}
                  style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderRadius:8,background:"rgba(255,255,255,.05)",border:"none",cursor:"pointer",color:"rgba(255,255,255,.8)",fontSize:12,marginBottom:4,transition:"all .12s",textAlign:"left"}}
                  onMouseEnter={e=>{e.currentTarget.style.background=`${activeSeg.g1}44`;e.currentTarget.style.color="#fff";}}
                  onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,.05)";e.currentTarget.style.color="rgba(255,255,255,.8)";}}>
                  <ChevronRight size={11} color={activeSeg.g1}/>{l.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
