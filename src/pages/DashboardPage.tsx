import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, X, LogOut, User, Bell } from "lucide-react";
import procBg from "@/assets/procurement-bg.jpg";
import logoImg from "@/assets/logo.png";
import { NotificationBell } from "@/components/NotificationPopup";

/* ── Polar helpers ────────────────────────────────────────────── */
function polar(cx:number,cy:number,r:number,deg:number){
  const rad=(deg-90)*Math.PI/180;
  return{x:cx+r*Math.cos(rad),y:cy+r*Math.sin(rad)};
}
function arcPath(cx:number,cy:number,or_:number,ir:number,s:number,e:number){
  const GAP=5;
  const sa=s+GAP/2,ea=e-GAP/2;
  const o1=polar(cx,cy,or_,sa),o2=polar(cx,cy,or_,ea);
  const i1=polar(cx,cy,ir,ea),i2=polar(cx,cy,ir,sa);
  const lg=ea-sa>180?1:0;
  return`M${o1.x},${o1.y} A${or_},${or_} 0 ${lg},1 ${o2.x},${o2.y} L${i1.x},${i1.y} A${ir},${ir} 0 ${lg},0 ${i2.x},${i2.y} Z`;
}
function midAngle(s:number,e:number){ return(s+e)/2; }

/* ── Segment data ─────────────────────────────────────────────── */
const CX=270,CY=270,OR=215,IR=92;
const SEGMENTS=[
  {
    id:"procurement",label:"PROCUREMENT",color:"#3a7cb8",colorDark:"#1a5a96",colorLight:"#5ba8d0",
    startDeg:0,endDeg:120,
    links:[
      {label:"Requisitions",path:"/requisitions"},
      {label:"Purchase Orders",path:"/purchase-orders"},
      {label:"Goods Received",path:"/goods-received"},
      {label:"Suppliers",path:"/suppliers"},
      {label:"Tenders",path:"/tenders"},
      {label:"Contracts",path:"/contracts"},
      {label:"Bid Evaluations",path:"/bid-evaluations"},
      {label:"Procurement Planning",path:"/procurement-planning"},
    ],
  },
  {
    id:"finance",label:"FINANCE",color:"#2a5f8a",colorDark:"#0a3a6b",colorLight:"#4a80aa",
    startDeg:120,endDeg:240,
    links:[
      {label:"Financial Dashboard",path:"/financials/dashboard"},
      {label:"Payment Vouchers",path:"/vouchers/payment"},
      {label:"Journal Vouchers",path:"/vouchers/journal"},
      {label:"Budgets",path:"/financials/budgets"},
      {label:"Chart of Accounts",path:"/financials/chart-of-accounts"},
      {label:"Fixed Assets",path:"/financials/fixed-assets"},
    ],
  },
  {
    id:"operations",label:"OPERATIONS",color:"#1a3461",colorDark:"#0a1e40",colorLight:"#2a4a80",
    startDeg:240,endDeg:360,
    links:[
      {label:"Inventory / Items",path:"/items"},
      {label:"Categories",path:"/categories"},
      {label:"Departments",path:"/departments"},
      {label:"Barcode Scanner",path:"/scanner"},
      {label:"Quality Control",path:"/quality/dashboard"},
      {label:"Quality Inspections",path:"/quality/inspections"},
      {label:"Non-Conformance",path:"/quality/non-conformance"},
    ],
  },
];

const QUICK_LINKS=[
  {label:"Reports",path:"/reports"},
  {label:"Mail & Inbox",path:"/email"},
  {label:"Documents",path:"/documents"},
  {label:"Audit Log",path:"/audit-log"},
  {label:"Users",path:"/users"},
  {label:"Admin Panel",path:"/admin/panel"},
  {label:"Database",path:"/admin/database"},
  {label:"Settings",path:"/settings"},
  {label:"Backup",path:"/backup"},
];

export default function DashboardPage(){
  const navigate=useNavigate();
  const{profile,roles,primaryRole,signOut}=useAuth() as any;
  const[active,setActive]=useState<string|null>(null);
  const[panelVis,setPanelVis]=useState(false);
  const[clock,setClock]=useState("");
  const[logoUrl,setLogoUrl]=useState<string|null>(null);
  const[sysName,setSysName]=useState("EL5 MediProcure");
  const[hospitalName,setHospitalName]=useState("Embu Level 5 Hospital");
  const[hovSeg,setHovSeg]=useState<string|null>(null);
  const panelRef=useRef<HTMLDivElement>(null);

  /* clock */
  useEffect(()=>{
    const tick=()=>setClock(new Date().toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit",second:"2-digit"}));
    tick(); const iv=setInterval(tick,1000); return()=>clearInterval(iv);
  },[]);

  /* settings */
  useEffect(()=>{
    (supabase as any).from("system_settings").select("key,value").in("key",["system_name","hospital_name","logo_url"]).then(({data}:any)=>{
      if(!data)return;
      data.forEach((r:any)=>{
        if(r.key==="system_name")setSysName(r.value);
        if(r.key==="hospital_name")setHospitalName(r.value);
        if(r.key==="logo_url")setLogoUrl(r.value);
      });
    });
  },[]);

  const openSeg=(id:string)=>{
    if(active===id){setActive(null);setPanelVis(false);}
    else{setActive(id);setPanelVis(true);}
  };

  const seg=SEGMENTS.find(s=>s.id===active);

  const ROLE_LABELS:Record<string,string>={
    admin:"Administrator",procurement_manager:"Procurement Manager",
    procurement_officer:"Procurement Officer",inventory_manager:"Inventory Manager",
    warehouse_officer:"Warehouse Officer",requisitioner:"Requisitioner",
  };

  return(
    <div style={{position:"fixed",inset:0,overflow:"hidden",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      {/* Background */}
      <div style={{position:"absolute",inset:0,backgroundImage:`url(${procBg})`,backgroundSize:"cover",backgroundPosition:"center",filter:"brightness(0.38)"}}/>
      <div style={{position:"absolute",inset:0,background:"linear-gradient(135deg,rgba(10,37,88,0.75) 0%,rgba(0,0,0,0.6) 100%)"}}/>
      {/* Grid overlay */}
      <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)",backgroundSize:"40px 40px"}}/>

      {/* ── TOP BAR ── */}
      <div style={{position:"absolute",top:0,left:0,right:0,height:50,display:"flex",alignItems:"center",padding:"0 20px",background:"rgba(0,0,0,0.5)",backdropFilter:"blur(8px)",borderBottom:"1px solid rgba(255,255,255,0.08)",zIndex:100}}>
        {/* Logo + name */}
        <div style={{display:"flex",alignItems:"center",gap:10,flex:1}}>
          <img src={logoUrl||logoImg} alt="" style={{width:30,height:30,borderRadius:6,objectFit:"contain",background:"rgba(255,255,255,0.08)",padding:2}}/>
          <div>
            <div style={{fontSize:11,fontWeight:800,color:"#fff",lineHeight:1}}>{sysName}</div>
            <div style={{fontSize:8.5,color:"rgba(255,255,255,0.35)",marginTop:1}}>{hospitalName}</div>
          </div>
        </div>
        {/* Clock */}
        <div style={{fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.6)",letterSpacing:"0.08em",fontVariantNumeric:"tabular-nums",marginRight:16}}>{clock}</div>
        {/* Role badge */}
        <div style={{padding:"3px 10px",borderRadius:20,background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.15)",fontSize:9.5,fontWeight:700,color:"rgba(255,255,255,0.7)",marginRight:10}}>
          {ROLE_LABELS[primaryRole||roles?.[0]]||"Staff"}
        </div>
        {/* Actions */}
        <div style={{display:"flex",alignItems:"center",gap:2}}>
          <NotificationBell logoUrl={logoUrl} sysName={sysName} hospitalName={hospitalName}/>
          <button onClick={()=>navigate("/profile")} title="Profile"
            style={{padding:6,borderRadius:6,background:"transparent",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.6)",lineHeight:0}}
            onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.1)"}
            onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
            <User style={{width:15,height:15}}/>
          </button>
          <button onClick={()=>{signOut();navigate("/login");}} title="Sign Out"
            style={{padding:6,borderRadius:6,background:"transparent",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.6)",lineHeight:0}}
            onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.1)"}
            onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
            <LogOut style={{width:15,height:15}}/>
          </button>
        </div>
      </div>

      {/* ── WHEEL CANVAS ── */}
      <div style={{position:"absolute",inset:0,top:50,bottom:54,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <svg width={540} height={540} viewBox="0 0 540 540" style={{filter:"drop-shadow(0 8px 32px rgba(0,0,0,0.6))"}}>
          <defs>
            {SEGMENTS.map(s=>(
              <radialGradient key={s.id} id={`g-${s.id}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={s.colorLight} stopOpacity="1"/>
                <stop offset="100%" stopColor={s.colorDark} stopOpacity="1"/>
              </radialGradient>
            ))}
            <radialGradient id="g-center" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f0c040"/>
              <stop offset="60%" stopColor="#c8900a"/>
              <stop offset="100%" stopColor="#8a5a00"/>
            </radialGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* Outer ring track */}
          <circle cx={CX} cy={CY} r={OR+8} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={16}/>
          <circle cx={CX} cy={CY} r={IR-8} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={16}/>

          {/* Segments */}
          {SEGMENTS.map(s=>{
            const isActive=active===s.id;
            const isHov=hovSeg===s.id;
            const scale=isActive?1.04:isHov?1.02:1;
            const mid=midAngle(s.startDeg,s.endDeg);
            const labelR=(OR+IR)/2;
            const lp=polar(CX,CY,labelR,mid);
            const labelPts=s.label.split(" ");
            return(
              <g key={s.id}
                onClick={()=>openSeg(s.id)}
                onMouseEnter={()=>setHovSeg(s.id)}
                onMouseLeave={()=>setHovSeg(null)}
                style={{cursor:"pointer",transition:"transform 0.22s cubic-bezier(0.4,0,0.2,1)",transform:`scale(${scale})`,transformOrigin:`${CX}px ${CY}px`}}>
                <path d={arcPath(CX,CY,OR,IR,s.startDeg,s.endDeg)}
                  fill={isActive?s.colorLight:isHov?s.color:`url(#g-${s.id})`}
                  stroke={isActive?"rgba(255,255,255,0.5)":"rgba(255,255,255,0.12)"}
                  strokeWidth={isActive?2:1}
                  style={{transition:"fill 0.18s,stroke 0.18s"}}/>
                {/* Segment label */}
                {labelPts.map((word,wi)=>(
                  <text key={wi}
                    x={lp.x} y={lp.y+(wi-Math.floor(labelPts.length/2))*14}
                    textAnchor="middle" dominantBaseline="central"
                    fill={isActive?"#fff":"rgba(255,255,255,0.85)"}
                    fontSize={11} fontWeight={800} letterSpacing={1.5}
                    style={{pointerEvents:"none",userSelect:"none",textShadow:"0 1px 4px rgba(0,0,0,0.6)"}}>
                    {word}
                  </text>
                ))}
                {/* Active indicator dot */}
                {isActive&&<circle cx={lp.x} cy={lp.y+24} r={3} fill="#fff" opacity={0.8}/>}
              </g>
            );
          })}

          {/* Connector arrows between segments */}
          {SEGMENTS.map(s=>{
            const tip=polar(CX,CY,OR+4,s.endDeg);
            const a1=polar(CX,CY,OR-2,s.endDeg-6);
            const a2=polar(CX,CY,OR+10,s.endDeg);
            return(
              <polygon key={`arr-${s.id}`}
                points={`${a1.x},${a1.y} ${a2.x},${a2.y} ${tip.x},${tip.y}`}
                fill="rgba(255,255,255,0.25)" stroke="none"/>
            );
          })}

          {/* Center gold circle */}
          <circle cx={CX} cy={CY} r={IR-4} fill="url(#g-center)" stroke="rgba(255,255,255,0.3)" strokeWidth={2}/>
          <circle cx={CX} cy={CY} r={IR-14} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={1}/>

          {/* Center logo */}
          <image href={logoImg} x={CX-28} y={CY-40} width={56} height={56} style={{borderRadius:8}}/>
          <text x={CX} y={CY+28} textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize={6.5} fontWeight={700} letterSpacing={1.2}>EXPERIENCE &amp; EXPERTISE</text>
          <text x={CX} y={CY+40} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize={5.5} letterSpacing={0.8}>EMBU LEVEL 5 HOSPITAL</text>
        </svg>

        {/* ── SLIDE-IN PANEL ── */}
        <div ref={panelRef} style={{
          position:"absolute",right:0,top:0,bottom:0,
          width:panelVis&&seg?280:0,
          background:"rgba(10,25,60,0.92)",
          backdropFilter:"blur(16px)",
          borderLeft:"1px solid rgba(255,255,255,0.1)",
          overflow:"hidden",
          transition:"width 0.3s cubic-bezier(0.4,0,0.2,1)",
          zIndex:50,
        }}>
          {seg&&panelVis&&(
            <div style={{width:280,padding:"16px 0",height:"100%",display:"flex",flexDirection:"column"}}>
              {/* Panel header */}
              <div style={{padding:"0 16px 12px",borderBottom:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.4)",letterSpacing:"0.1em",textTransform:"uppercase"}}>{seg.label}</div>
                  <div style={{fontSize:13,fontWeight:800,color:"#fff",marginTop:2}}>{seg.links.length} modules</div>
                </div>
                <button onClick={()=>{setActive(null);setPanelVis(false);}}
                  style={{padding:5,borderRadius:6,background:"rgba(255,255,255,0.08)",border:"none",cursor:"pointer",lineHeight:0,color:"rgba(255,255,255,0.5)"}}>
                  <X style={{width:13,height:13}}/>
                </button>
              </div>
              {/* Links */}
              <div style={{flex:1,overflowY:"auto",padding:"8px 8px"}}>
                {seg.links.map(lk=>(
                  <button key={lk.path} onClick={()=>navigate(lk.path)}
                    style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:9,border:"none",background:"transparent",cursor:"pointer",textAlign:"left",marginBottom:3,transition:"background 0.12s"}}
                    onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=`${seg.color}33`;}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="transparent";}}>
                    <div style={{width:6,height:6,borderRadius:"50%",background:seg.colorLight,flexShrink:0}}/>
                    <span style={{flex:1,fontSize:12,fontWeight:500,color:"rgba(255,255,255,0.8)"}}>{lk.label}</span>
                    <ChevronRight style={{width:12,height:12,color:"rgba(255,255,255,0.3)"}}/>
                  </button>
                ))}
              </div>
              {/* Footer */}
              <div style={{padding:"10px 16px",borderTop:"1px solid rgba(255,255,255,0.06)",fontSize:9,color:"rgba(255,255,255,0.2)",textAlign:"center"}}>
                Click any module to navigate
              </div>
            </div>
          )}
        </div>

        {/* ── RIBBON BADGES ── */}
        <div style={{position:"absolute",left:"50%",transform:"translateX(-50%)",top:-24,whiteSpace:"nowrap" as const,display:"flex",gap:10}}>
          <div style={{padding:"3px 16px",background:"rgba(196,89,17,0.85)",borderRadius:4,fontSize:8.5,fontWeight:800,color:"#fff",letterSpacing:"1.5px",textTransform:"uppercase"}}>ONBOARD 01</div>
          <div style={{padding:"3px 16px",background:"rgba(26,52,97,0.85)",borderRadius:4,fontSize:8.5,fontWeight:800,color:"#fff",letterSpacing:"1.5px",textTransform:"uppercase"}}>GROWTH &amp; EFFICIENCY</div>
        </div>
      </div>

      {/* ── BOTTOM QUICK LINKS ── */}
      <div style={{position:"absolute",bottom:0,left:0,right:0,height:54,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(10px)",borderTop:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center",gap:4,zIndex:100}}>
        {QUICK_LINKS.map(lk=>(
          <button key={lk.path} onClick={()=>navigate(lk.path)}
            style={{padding:"5px 12px",borderRadius:8,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.04)",cursor:"pointer",fontSize:10.5,fontWeight:600,color:"rgba(255,255,255,0.65)",whiteSpace:"nowrap" as const,transition:"all 0.14s"}}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.12)";(e.currentTarget as HTMLElement).style.color="#fff";(e.currentTarget as HTMLElement).style.borderColor="rgba(255,255,255,0.25)";}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.04)";(e.currentTarget as HTMLElement).style.color="rgba(255,255,255,0.65)";(e.currentTarget as HTMLElement).style.borderColor="rgba(255,255,255,0.1)";}}>
            {lk.label}
          </button>
        ))}
      </div>

      {/* Greeting overlay when no seg active */}
      {!active&&(
        <div style={{position:"absolute",bottom:74,left:"50%",transform:"translateX(-50%)",textAlign:"center",pointerEvents:"none"}}>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.35)",letterSpacing:"0.06em"}}>
            Good {new Date().getHours()<12?"morning":new Date().getHours()<17?"afternoon":"evening"}, <span style={{color:"rgba(255,255,255,0.6)",fontWeight:700}}>{profile?.full_name?.split(" ")[0]||"Staff"}</span>
          </div>
          <div style={{fontSize:9,color:"rgba(255,255,255,0.2)",marginTop:3,letterSpacing:"0.04em"}}>Click a segment to navigate</div>
        </div>
      )}
    </div>
  );
}
