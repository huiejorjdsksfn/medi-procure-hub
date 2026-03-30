import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, X, LogOut, User, TrendingUp, Package, FileText, DollarSign, AlertTriangle, CheckCircle, Clock, BarChart2 } from "lucide-react";
import procBg from "@/assets/procurement-bg.jpg";
import logoImg from "@/assets/logo.png";
import { NotificationBell } from "@/components/NotificationPopup";

/* ── Polar helpers ─────────────────────────────────────────── */
const P = (cx:number,cy:number,r:number,deg:number) => {
  const a=(deg-90)*Math.PI/180; return {x:cx+r*Math.cos(a),y:cy+r*Math.sin(a)};
};
const arc = (cx:number,cy:number,OR:number,IR:number,s:number,e:number,gap=4) => {
  const sa=s+gap/2, ea=e-gap/2;
  const o1=P(cx,cy,OR,sa),o2=P(cx,cy,OR,ea);
  const i1=P(cx,cy,IR,ea),i2=P(cx,cy,IR,sa);
  const lg=ea-sa>180?1:0;
  return`M${o1.x},${o1.y} A${OR},${OR} 0 ${lg},1 ${o2.x},${o2.y} L${i1.x},${i1.y} A${IR},${IR} 0 ${lg},0 ${i2.x},${i2.y} Z`;
};

/* ── Role-based access map ─────────────────────────────────── */
const ROLE_ACCESS: Record<string, string[]> = {
  admin:                ["procurement","finance","operations"],
  procurement_manager:  ["procurement","finance","operations"],
  procurement_officer:  ["procurement","operations"],
  inventory_manager:    ["operations","procurement"],
  warehouse_officer:    ["operations"],
  requisitioner:        ["procurement"],
};

/* ── Segment definitions ───────────────────────────────────── */
type Link = {label:string;path:string;icon?:string;roles?:string[]};
type Seg  = {id:string;label:string;sub:string;g1:string;g2:string;g3:string;glow:string;start:number;end:number;links:Link[]};

const SEGS: Seg[] = [
  {
    id:"procurement",label:"PROCUREMENT",sub:"Ordering & Sourcing",
    g1:"#1a6bb5",g2:"#0d4a87",g3:"#5ba0d4",glow:"#3b82f680",
    start:0,end:120,
    links:[
      {label:"Requisitions",path:"/requisitions",roles:["admin","procurement_manager","procurement_officer","requisitioner"]},
      {label:"Purchase Orders",path:"/purchase-orders",roles:["admin","procurement_manager","procurement_officer"]},
      {label:"Goods Received",path:"/goods-received",roles:["admin","procurement_manager","procurement_officer","warehouse_officer"]},
      {label:"Suppliers",path:"/suppliers",roles:["admin","procurement_manager","procurement_officer"]},
      {label:"Tenders",path:"/tenders",roles:["admin","procurement_manager"]},
      {label:"Contracts",path:"/contracts",roles:["admin","procurement_manager"]},
      {label:"Bid Evaluations",path:"/bid-evaluations",roles:["admin","procurement_manager"]},
      {label:"Procurement Planning",path:"/procurement-planning",roles:["admin","procurement_manager"]},
    ],
  },
  {
    id:"finance",label:"FINANCE",sub:"Accounts & Budgeting",
    g1:"#0e7a6e",g2:"#065f52",g3:"#2aaa97",glow:"#10b98180",
    start:120,end:240,
    links:[
      {label:"Financial Dashboard",path:"/financials/dashboard",roles:["admin","procurement_manager"]},
      {label:"Payment Vouchers",path:"/vouchers/payment",roles:["admin","procurement_manager","procurement_officer"]},
      {label:"Journal Vouchers",path:"/vouchers/journal",roles:["admin","procurement_manager"]},
      {label:"Purchase Vouchers",path:"/vouchers/purchase",roles:["admin","procurement_manager","procurement_officer"]},
      {label:"Receipt Vouchers",path:"/vouchers/receipt",roles:["admin","procurement_manager"]},
      {label:"Budgets",path:"/financials/budgets",roles:["admin","procurement_manager"]},
      {label:"Chart of Accounts",path:"/financials/chart-of-accounts",roles:["admin","procurement_manager"]},
      {label:"Fixed Assets",path:"/financials/fixed-assets",roles:["admin","procurement_manager"]},
    ],
  },
  {
    id:"operations",label:"OPERATIONS",sub:"Inventory & Quality",
    g1:"#7c3aed",g2:"#5b21b6",g3:"#a855f7",glow:"#8b5cf680",
    start:240,end:360,
    links:[
      {label:"Inventory / Items",path:"/items",roles:["admin","inventory_manager","warehouse_officer","procurement_manager"]},
      {label:"Categories",path:"/categories",roles:["admin","inventory_manager","procurement_manager"]},
      {label:"Departments",path:"/departments",roles:["admin","procurement_manager"]},
      {label:"Barcode Scanner",path:"/scanner",roles:["admin","inventory_manager","warehouse_officer"]},
      {label:"Quality Dashboard",path:"/quality/dashboard",roles:["admin","procurement_manager","inventory_manager"]},
      {label:"QC Inspections",path:"/quality/inspections",roles:["admin","procurement_manager","inventory_manager","warehouse_officer"]},
      {label:"Non-Conformance",path:"/quality/non-conformance",roles:["admin","procurement_manager","inventory_manager"]},
      {label:"Reports",path:"/reports",roles:["admin","procurement_manager","procurement_officer","inventory_manager"]},
    ],
  },
];

const QUICK=[
  {label:"Reports",path:"/reports"},{label:"Mail",path:"/email"},
  {label:"Documents",path:"/documents"},{label:"Audit Log",path:"/audit-log"},
  {label:"Users",path:"/users"},{label:"Admin",path:"/admin/panel"},
  {label:"Database",path:"/admin/database"},{label:"Settings",path:"/settings"},
  {label:"Backup",path:"/backup"},
];

const ROLE_LABELS:Record<string,string>={
  admin:"Administrator",procurement_manager:"Procurement Manager",
  procurement_officer:"Procurement Officer",inventory_manager:"Inventory Manager",
  warehouse_officer:"Warehouse Officer",requisitioner:"Requisitioner",
};

const fmtK=(n:number)=>n>=1e6?`${(n/1e6).toFixed(1)}M`:n>=1e3?`${(n/1e3).toFixed(0)}K`:String(n);

const CX=280,CY=280,OR=220,IR=98;

export default function DashboardPage(){
  const nav=useNavigate();
  const{profile,roles,primaryRole,signOut}=useAuth() as any;
  const[active,setActive]=useState<string|null>(null);
  const[hov,setHov]=useState<string|null>(null);
  const[clock,setClock]=useState("");
  const[logoUrl,setLogoUrl]=useState<string|null>(null);
  const[sysName,setSysName]=useState("EL5 MediProcure");
  const[hospital,setHospital]=useState("Embu Level 5 Hospital");
  const[spin,setSpin]=useState(0);
  const[kpi,setKpi]=useState({reqs:0,pos:0,pendPV:0,lowStock:0,openNCR:0,contracts:0});
  const[greeting,setGreeting]=useState("");

  /* clock + spin */
  useEffect(()=>{
    const h=new Date().getHours();
    setGreeting(h<12?"Good Morning":h<17?"Good Afternoon":"Good Evening");
    const tick=()=>setClock(new Date().toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit",second:"2-digit"}));
    tick(); const iv=setInterval(tick,1000);
    const sv=setInterval(()=>setSpin(s=>s+0.2),50);
    return()=>{clearInterval(iv);clearInterval(sv);};
  },[]);

  /* settings + live KPIs */
  useEffect(()=>{
    (supabase as any).from("system_settings").select("key,value")
      .in("key",["system_name","hospital_name","logo_url","system_logo_url"])
      .then(({data}:any)=>{
        if(!data) return;
        data.forEach((r:any)=>{
          if(r.key==="system_name") setSysName(r.value||"");
          if(r.key==="hospital_name") setHospital(r.value||"");
          if(r.key==="logo_url"||r.key==="system_logo_url") setLogoUrl(r.value||null);
        });
      });
    Promise.all([
      (supabase as any).from("requisitions").select("id",{count:"exact",head:true}).eq("status","pending"),
      (supabase as any).from("purchase_orders").select("id",{count:"exact",head:true}).in("status",["draft","sent"]),
      (supabase as any).from("payment_vouchers").select("id",{count:"exact",head:true}).eq("status","pending"),
      (supabase as any).from("items").select("id",{count:"exact",head:true}).lt("quantity_in_stock",20),
      (supabase as any).from("non_conformance").select("id",{count:"exact",head:true}).eq("status","open"),
      (supabase as any).from("contracts").select("id",{count:"exact",head:true}).eq("status","active"),
    ]).then(([r,p,pv,ls,ncr,c])=>{
      setKpi({
        reqs:r.count||0, pos:p.count||0, pendPV:pv.count||0,
        lowStock:ls.count||0, openNCR:ncr.count||0, contracts:c.count||0,
      });
    }).catch(()=>{});
  },[]);

  const accessedSegs = ROLE_ACCESS[primaryRole||"requisitioner"]||["procurement"];
  const segActive=(s:Seg)=>accessedSegs.includes(s.id);
  const seg = SEGS.find(s=>s.id===active);

  const openSeg=(id:string)=>{
    if(!segActive(SEGS.find(s=>s.id===id)!)) return;
    setActive(a=>a===id?null:id);
  };

  const visLinks = (s:Seg) => s.links.filter(lk=>
    !lk.roles || lk.roles.some(r=>roles?.includes(r))
  );

  /* ── outer tick ring ── */
  const TICKS=36;
  const tickEls = Array.from({length:TICKS},(_,i)=>{
    const a=(i/TICKS)*360; const r1=OR+12; const r2=OR+(i%3===0?20:14);
    const p1=P(CX,CY,r1,a),p2=P(CX,CY,r2,a);
    return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
      stroke={i%3===0?"rgba(255,255,255,0.45)":"rgba(255,255,255,0.18)"} strokeWidth={i%3===0?1.5:0.8}/>;
  });

  /* ── inner KPI mini ring ── */
  const KPI_DATA=[
    {label:"Pending Req",val:kpi.reqs,color:"#f59e0b"},
    {label:"Open POs",val:kpi.pos,color:"#3b82f6"},
    {label:"Pending PV",val:kpi.pendPV,color:"#10b981"},
    {label:"Low Stock",val:kpi.lowStock,color:"#ef4444"},
    {label:"Open NCR",val:kpi.openNCR,color:"#8b5cf6"},
    {label:"Contracts",val:kpi.contracts,color:"#06b6d4"},
  ];
  const KPI_R1=IR-10, KPI_R2=KPI_R1-22;
  const kpiSegs = KPI_DATA.map((_,i)=>arc(CX,CY,KPI_R1,KPI_R2,(i/6)*360,((i+1)/6)*360,3));

  /* ── spinning accent dots ── */
  const DOT_R=OR+28;
  const dotEls=[0,60,120,180,240,300].map((base,i)=>{
    const a=(base+spin)%360; const p=P(CX,CY,DOT_R,a);
    return <circle key={i} cx={p.x} cy={p.y} r={i%2===0?3:2}
      fill={i%3===0?"#f59e0b":i%3===1?"#60a5fa":"#a78bfa"} opacity={0.7}/>;
  });

  return(
    <div style={{position:"fixed" as const,inset:0,overflow:"hidden" as const,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <style>{`
        @keyframes pulse{0%,100%{opacity:0.6;transform:scale(1)}50%{opacity:1;transform:scale(1.04)}}
        @keyframes ringPulse{0%,100%{opacity:0.3}50%{opacity:0.7}}
        .seg-btn{cursor:pointer;transition:filter 0.2s;}
        .seg-btn:hover{filter:brightness(1.15);}
        .qk-btn{padding:5px 13px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);
          cursor:pointer;font-size:10.5px;font-weight:600;color:rgba(255,255,255,0.65);white-space:nowrap;transition:all 0.14s;}
        .qk-btn:hover{background:rgba(255,255,255,0.13);color:#fff;border-color:rgba(255,255,255,0.28);}
        .panel-link{width:100%;display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:9px;
          border:none;background:transparent;cursor:pointer;text-align:left;margin-bottom:3px;transition:background 0.12s;}
      `}</style>

      {/* ── BG ── */}
      <div style={{position:"absolute" as const,inset:0,backgroundImage:`url(${procBg})`,backgroundSize:"cover",backgroundPosition:"center",filter:"brightness(0.3)"}}/>
      <div style={{position:"absolute" as const,inset:0,background:"linear-gradient(135deg,rgba(5,20,60,0.82) 0%,rgba(0,0,0,0.65) 100%)"}}/>
      <div style={{position:"absolute" as const,inset:0,backgroundImage:"linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)",backgroundSize:"36px 36px"}}/>

      {/* ── TOP BAR ── */}
      <div style={{position:"absolute" as const,top:0,left:0,right:0,height:50,display:"flex" as const,alignItems:"center" as const,padding:"0 20px",background:"rgba(0,0,0,0.55)",backdropFilter:"blur(10px)",borderBottom:"1px solid rgba(255,255,255,0.07)",zIndex:100}}>
        <div style={{display:"flex" as const,alignItems:"center" as const,gap:10,flex:1}}>
          <img src={logoUrl||logoImg} alt="" style={{width:30,height:30,borderRadius:6,objectFit:"contain" as const,background:"rgba(255,255,255,0.07)",padding:2}}/>
          <div>
            <div style={{fontSize:11,fontWeight:800,color:"#fff",lineHeight:1}}>{sysName}</div>
            <div style={{fontSize:8.5,color:"rgba(255,255,255,0.32)",marginTop:1}}>{hospital}</div>
          </div>
        </div>
        <div style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.55)",letterSpacing:"0.08em",fontVariantNumeric:"tabular-nums" as const,marginRight:16}}>{clock}</div>
        <div style={{display:"flex" as const,alignItems:"center" as const,gap:6,marginRight:8}}>
          {/* Live KPI pills */}
          {kpi.reqs>0&&<div style={{padding:"2px 9px",borderRadius:20,background:"rgba(245,158,11,0.2)",border:"1px solid rgba(245,158,11,0.35)",fontSize:9.5,fontWeight:700,color:"#fcd34d"}}>{kpi.reqs} Pending</div>}
          {kpi.lowStock>0&&<div style={{padding:"2px 9px",borderRadius:20,background:"rgba(239,68,68,0.2)",border:"1px solid rgba(239,68,68,0.35)",fontSize:9.5,fontWeight:700,color:"#fca5a5"}}>{kpi.lowStock} Low Stock</div>}
        </div>
        <div style={{padding:"3px 10px",borderRadius:20,background:"rgba(255,255,255,0.09)",border:"1px solid rgba(255,255,255,0.14)",fontSize:9.5,fontWeight:700,color:"rgba(255,255,255,0.65)",marginRight:8}}>
          {ROLE_LABELS[primaryRole||roles?.[0]]||"Staff"}
        </div>
        <div style={{display:"flex" as const,alignItems:"center" as const,gap:2}}>
          <NotificationBell logoUrl={logoUrl} sysName={sysName} hospitalName={hospital}/>
          <button onClick={()=>nav("/profile")} title="Profile"
            style={{padding:6,borderRadius:6,background:"transparent",border:"none",cursor:"pointer" as const,color:"rgba(255,255,255,0.55)",lineHeight:0}}
            onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,0.1)")}
            onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
            <User style={{width:15,height:15}}/>
          </button>
          <button onClick={()=>{signOut();nav("/login");}} title="Sign Out"
            style={{padding:6,borderRadius:6,background:"transparent",border:"none",cursor:"pointer" as const,color:"rgba(255,255,255,0.55)",lineHeight:0}}
            onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,0.1)")}
            onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
            <LogOut style={{width:15,height:15}}/>
          </button>
        </div>
      </div>

      {/* ── WHEEL STAGE ── */}
      <div style={{position:"absolute" as const,inset:0,top:50,bottom:54,display:"flex" as const,alignItems:"center" as const,justifyContent:"center" as const}}>
        <svg width={560} height={560} viewBox="0 0 560 560"
          style={{filter:"drop-shadow(0 12px 40px rgba(0,0,0,0.7))",overflow:"visible" as const}}>
          <defs>
            {SEGS.map(s=>(
              <radialGradient key={s.id} id={`grad-${s.id}`} cx="50%" cy="50%" r="55%" fx="35%" fy="35%">
                <stop offset="0%" stopColor={s.g3}/>
                <stop offset="50%" stopColor={s.g1}/>
                <stop offset="100%" stopColor={s.g2}/>
              </radialGradient>
            ))}
            <radialGradient id="grad-center" cx="40%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#fde68a"/>
              <stop offset="45%" stopColor="#d97706"/>
              <stop offset="100%" stopColor="#78350f"/>
            </radialGradient>
            <radialGradient id="grad-inner" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.06)"/>
              <stop offset="100%" stopColor="rgba(0,0,0,0.4)"/>
            </radialGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" result="b"/>
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="glow2" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="10" result="b"/>
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* outer decorative ring (glowing halo) */}
          <circle cx={CX} cy={CY} r={OR+36} fill="none"
            stroke="rgba(255,255,255,0.04)" strokeWidth={32}/>
          <circle cx={CX} cy={CY} r={OR+36} fill="none"
            stroke="rgba(255,255,255,0.06)" strokeWidth={1}
            style={{animation:"ringPulse 3s ease-in-out infinite"}}/>

          {/* tick marks */}
          {tickEls}

          {/* spinning accent dots */}
          {dotEls}

          {/* ── MAIN SEGMENTS ── */}
          {SEGS.map(s=>{
            const isActive=active===s.id;
            const isHov=hov===s.id;
            const hasAccess=segActive(s);
            const scale=isActive?1.055:isHov&&hasAccess?1.025:1;
            const mid=(s.start+s.end)/2;
            const labelR=(OR+IR)/2+4;
            const lp=P(CX,CY,labelR,mid);
            const subR=labelR-22;
            const sp=P(CX,CY,subR,mid);
            return(
              <g key={s.id}
                onClick={()=>openSeg(s.id)}
                onMouseEnter={()=>setHov(s.id)}
                onMouseLeave={()=>setHov(null)}
                className={hasAccess?"seg-btn":""}
                style={{opacity:hasAccess?1:0.35,
                  transition:"transform 0.25s cubic-bezier(0.4,0,0.2,1),filter 0.2s",
                  transform:`scale(${scale})`,transformOrigin:`${CX}px ${CY}px`}}>

                {/* glow shadow when active */}
                {isActive&&(
                  <path d={arc(CX,CY,OR+6,IR-6,s.start,s.end,2)}
                    fill={s.glow} filter="url(#glow2)"/>
                )}

                {/* main segment */}
                <path d={arc(CX,CY,OR,IR,s.start,s.end)}
                  fill={isActive?s.g3:`url(#grad-${s.id})`}
                  stroke={isActive?"rgba(255,255,255,0.55)":isHov?"rgba(255,255,255,0.25)":"rgba(255,255,255,0.1)"}
                  strokeWidth={isActive?2:1}/>

                {/* inner highlight stripe */}
                <path d={arc(CX,CY,OR,OR-16,s.start,s.end,2)}
                  fill="rgba(255,255,255,0.1)"/>

                {/* segment title */}
                {s.label.split(" ").map((word,wi,arr)=>(
                  <text key={wi} x={lp.x} y={lp.y+(wi-(arr.length-1)/2)*15}
                    textAnchor="middle" dominantBaseline="central"
                    fill={isActive?"#fff":"rgba(255,255,255,0.9)"}
                    fontSize={12} fontWeight={900} letterSpacing={2}
                    style={{pointerEvents:"none" as const,userSelect:"none" as const,
                      textShadow:"0 2px 8px rgba(0,0,0,0.8)",
                      filter:isActive?"drop-shadow(0 0 6px rgba(255,255,255,0.7))":"none"}}>
                    {word}
                  </text>
                ))}

                {/* segment subtitle */}
                <text x={sp.x} y={sp.y}
                  textAnchor="middle" dominantBaseline="central"
                  fill={isActive?"rgba(255,255,255,0.9)":"rgba(255,255,255,0.45)"}
                  fontSize={7.5} fontWeight={500} letterSpacing={0.5}
                  style={{pointerEvents:"none" as const,userSelect:"none" as const}}>
                  {s.sub}
                </text>

                {/* module count badge */}
                {hasAccess&&(()=>{
                  const bp=P(CX,CY,OR-28,mid);
                  return(
                    <g>
                      <circle cx={bp.x} cy={bp.y} r={11}
                        fill={isActive?s.g3:s.g2} stroke="rgba(255,255,255,0.3)" strokeWidth={1}/>
                      <text x={bp.x} y={bp.y} textAnchor="middle" dominantBaseline="central"
                        fill="#fff" fontSize={8} fontWeight={800}
                        style={{pointerEvents:"none" as const}}>
                        {visLinks(s).length}
                      </text>
                    </g>
                  );
                })()}

                {/* active tick marks at edges */}
                {isActive&&[s.start,s.end].map((deg,di)=>{
                  const tp=P(CX,CY,OR+8,deg);
                  return <circle key={di} cx={tp.x} cy={tp.y} r={4}
                    fill={s.g3} stroke="rgba(255,255,255,0.7)" strokeWidth={1}/>;
                })}
              </g>
            );
          })}

          {/* ── INNER KPI RING ── */}
          {KPI_DATA.map((k,i)=>{
            const isKpiActive=kpiSegs[i];
            const midA=((i/6)+(1/12))*360;
            const lp=P(CX,CY,(KPI_R1+KPI_R2)/2,midA);
            return(
              <g key={i} style={{cursor:"default" as const}}>
                <path d={kpiSegs[i]} fill={`${k.color}30`}
                  stroke={k.color} strokeWidth={0.8} strokeOpacity={0.6}/>
                <text x={lp.x} y={lp.y-2} textAnchor="middle" dominantBaseline="central"
                  fill={k.color} fontSize={7.5} fontWeight={900}
                  style={{pointerEvents:"none" as const}}>
                  {k.val}
                </text>
                <text x={lp.x} y={lp.y+6} textAnchor="middle" dominantBaseline="central"
                  fill="rgba(255,255,255,0.35)" fontSize={5} fontWeight={600}
                  style={{pointerEvents:"none" as const}}>
                  {k.label}
                </text>
              </g>
            );
          })}

          {/* ── CENTER ── */}
          {/* outer glow ring */}
          <circle cx={CX} cy={CY} r={IR-2} fill="rgba(0,0,0,0.5)"
            stroke="rgba(255,215,0,0.2)" strokeWidth={2}
            style={{animation:"ringPulse 2.5s ease-in-out infinite"}}/>

          {/* gold inner disk */}
          <circle cx={CX} cy={CY} r={IR-8} fill="url(#grad-center)"
            stroke="rgba(255,255,255,0.25)" strokeWidth={1.5}/>

          {/* inner pattern ring */}
          <circle cx={CX} cy={CY} r={IR-20} fill="none"
            stroke="rgba(255,255,255,0.12)" strokeWidth={0.8} strokeDasharray="4 3"/>

          {/* hospital logo */}
          <image href={logoImg} x={CX-26} y={CY-38} width={52} height={52}
            style={{filter:"drop-shadow(0 2px 4px rgba(0,0,0,0.5))"}}/>

          {/* system name */}
          <text x={CX} y={CY+25} textAnchor="middle" fill="rgba(255,255,255,0.95)"
            fontSize={6.5} fontWeight={800} letterSpacing={1.5}
            style={{pointerEvents:"none" as const}}>
            {sysName.toUpperCase()}
          </text>
          <text x={CX} y={CY+35} textAnchor="middle" fill="rgba(255,255,255,0.45)"
            fontSize={5} letterSpacing={0.8}
            style={{pointerEvents:"none" as const}}>
            EMBU LEVEL 5 HOSPITAL
          </text>

          {/* LIVE badge */}
          <rect x={CX-12} y={CY+40} width={24} height={9} rx={4}
            fill="#ef4444" opacity={0.9}
            style={{animation:"pulse 2s ease-in-out infinite"}}/>
          <text x={CX} y={CY+44.5} textAnchor="middle" dominantBaseline="central"
            fill="#fff" fontSize={5.5} fontWeight={900} letterSpacing={1}
            style={{pointerEvents:"none" as const}}>LIVE</text>
        </svg>

        {/* ── SLIDE-IN PANEL ── */}
        <div style={{
          position:"absolute" as const,right:0,top:0,bottom:0,
          width:seg&&active?300:0,
          background:"rgba(8,18,50,0.93)",
          backdropFilter:"blur(20px)",
          borderLeft:"1px solid rgba(255,255,255,0.09)",
          overflow:"hidden" as const,
          transition:"width 0.3s cubic-bezier(0.4,0,0.2,1)",
          zIndex:50,
        }}>
          {seg&&active&&(
            <div style={{width:300,padding:"14px 0",height:"100%",display:"flex" as const,flexDirection:"column" as const}}>
              <div style={{padding:"0 16px 10px",borderBottom:"1px solid rgba(255,255,255,0.08)",display:"flex" as const,alignItems:"center" as const,justifyContent:"space-between" as const}}>
                <div>
                  <div style={{fontSize:9.5,fontWeight:700,color:"rgba(255,255,255,0.35)",letterSpacing:"0.12em",textTransform:"uppercase"}}>{seg.sub}</div>
                  <div style={{fontSize:15,fontWeight:900,color:"#fff",marginTop:2,letterSpacing:"0.02em"}}>{seg.label}</div>
                  <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginTop:3}}>
                    {visLinks(seg).length} accessible modules
                  </div>
                </div>
                <button onClick={()=>setActive(null)}
                  style={{padding:6,borderRadius:7,background:"rgba(255,255,255,0.07)",border:"none",cursor:"pointer" as const,color:"rgba(255,255,255,0.45)",lineHeight:0}}>
                  <X style={{width:14,height:14}}/>
                </button>
              </div>

              {/* accent bar */}
              <div style={{height:2,background:`linear-gradient(90deg,${seg.g1},${seg.g3},transparent)`,opacity:0.7}}/>

              <div style={{flex:1,overflowY:"auto" as const,padding:"8px 8px"}}>
                {visLinks(seg).map(lk=>(
                  <button key={lk.path} onClick={()=>nav(lk.path)}
                    className="panel-link"
                    onMouseEnter={e=>(e.currentTarget.style.background=`${seg.g2}55`)}
                    onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                    <div style={{width:7,height:7,borderRadius:"50%",background:seg.g3,flexShrink:0,boxShadow:`0 0 6px ${seg.glow}`}}/>
                    <span style={{flex:1,fontSize:12,fontWeight:500,color:"rgba(255,255,255,0.82)"}}>{lk.label}</span>
                    <ChevronRight style={{width:12,height:12,color:"rgba(255,255,255,0.25)"}}/>
                  </button>
                ))}
              </div>

              {/* role notice */}
              <div style={{padding:"8px 16px",borderTop:"1px solid rgba(255,255,255,0.06)",fontSize:9,color:"rgba(255,255,255,0.2)",textAlign:"center" as const}}>
                Showing modules for: {ROLE_LABELS[primaryRole]||"Staff"}
              </div>
            </div>
          )}
        </div>

        {/* ── GREETING ── */}
        {!active&&(
          <div style={{position:"absolute" as const,bottom:8,left:"50%",transform:"translateX(-50%)",textAlign:"center" as const,pointerEvents:"none" as const}}>
            <div style={{fontSize:12.5,color:"rgba(255,255,255,0.4)",letterSpacing:"0.06em"}}>
              {greeting}, <span style={{color:"rgba(255,255,255,0.7)",fontWeight:700}}>{profile?.full_name?.split(" ")[0]||"Staff"}</span>
            </div>
            <div style={{fontSize:9,color:"rgba(255,255,255,0.2)",marginTop:2,letterSpacing:"0.04em"}}>Click a segment to explore modules</div>
          </div>
        )}

        {/* ribbon badges */}
        <div style={{position:"absolute" as const,left:"50%",transform:"translateX(-50%)",top:-20,whiteSpace:"nowrap" as const,display:"flex" as const,gap:8}}>
          <div style={{padding:"3px 14px",background:"rgba(196,89,17,0.85)",borderRadius:4,fontSize:8,fontWeight:800,color:"#fff",letterSpacing:"1.5px",textTransform:"uppercase",boxShadow:"0 2px 8px rgba(0,0,0,0.4)"}}>ERP v2.0</div>
          <div style={{padding:"3px 14px",background:"rgba(16,52,110,0.85)",borderRadius:4,fontSize:8,fontWeight:800,color:"#fff",letterSpacing:"1.5px",textTransform:"uppercase",boxShadow:"0 2px 8px rgba(0,0,0,0.4)"}}>EMBU LEVEL 5</div>
        </div>
      </div>

      {/* ── LIVE KPI STRIP ── */}
      <div style={{position:"absolute" as const,bottom:54,left:0,right:0,height:38,background:"rgba(0,0,0,0.55)",backdropFilter:"blur(8px)",borderTop:"1px solid rgba(255,255,255,0.06)",display:"flex" as const,alignItems:"stretch" as const,zIndex:90}}>
        {[
          {icon:<FileText style={{width:11,height:11}}/>,label:"Pending Req",val:kpi.reqs,col:"#f59e0b",onClick:()=>nav("/requisitions")},
          {icon:<TrendingUp style={{width:11,height:11}}/>,label:"Open POs",val:kpi.pos,col:"#3b82f6",onClick:()=>nav("/purchase-orders")},
          {icon:<DollarSign style={{width:11,height:11}}/>,label:"Pending PV",val:kpi.pendPV,col:"#10b981",onClick:()=>nav("/vouchers/payment")},
          {icon:<AlertTriangle style={{width:11,height:11}}/>,label:"Low Stock",val:kpi.lowStock,col:"#ef4444",onClick:()=>nav("/items")},
          {icon:<Package style={{width:11,height:11}}/>,label:"Open NCR",val:kpi.openNCR,col:"#8b5cf6",onClick:()=>nav("/quality/non-conformance")},
          {icon:<CheckCircle style={{width:11,height:11}}/>,label:"Active Contracts",val:kpi.contracts,col:"#06b6d4",onClick:()=>nav("/contracts")},
        ].map((k,i)=>(
          <button key={i} onClick={k.onClick}
            style={{flex:1,display:"flex" as const,alignItems:"center" as const,justifyContent:"center" as const,gap:5,
              borderRight:"1px solid rgba(255,255,255,0.06)",background:"transparent",border:"none",
              cursor:"pointer" as const,borderRight:"1px solid rgba(255,255,255,0.05)",padding:0}}
            onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,0.06)")}
            onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
            <span style={{color:k.col}}>{k.icon}</span>
            <div>
              <div style={{fontSize:13,fontWeight:900,color:k.col,lineHeight:1}}>{k.val}</div>
              <div style={{fontSize:7.5,color:"rgba(255,255,255,0.3)",lineHeight:1,marginTop:1}}>{k.label}</div>
            </div>
          </button>
        ))}
      </div>

      {/* ── BOTTOM QUICK LINKS ── */}
      <div style={{position:"absolute" as const,bottom:0,left:0,right:0,height:54,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(12px)",borderTop:"1px solid rgba(255,255,255,0.07)",display:"flex" as const,alignItems:"center" as const,justifyContent:"center" as const,gap:4,zIndex:100,paddingBottom:2}}>
        {QUICK.map(lk=>(
          <button key={lk.path} onClick={()=>nav(lk.path)} className="qk-btn">{lk.label}</button>
        ))}
      </div>
    </div>
  );
}
