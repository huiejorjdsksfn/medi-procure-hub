import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

const ROLE_ALL = ["admin","procurement_manager","procurement_officer","inventory_manager","warehouse_officer","requisitioner"];

const INNER_NODES = [
  { label:"Vouchers",  path:"/vouchers/payment",     color:"#C45911", angle:-90,  roles:["admin","procurement_manager","procurement_officer"] },
  { label:"Suppliers", path:"/suppliers",            color:"#0078d4", angle:-30,  roles:["admin","procurement_manager","procurement_officer"] },
  { label:"Quality",   path:"/quality/dashboard",    color:"#00695C", angle:30,   roles:["admin","procurement_manager","procurement_officer","inventory_manager","warehouse_officer"] },
  { label:"Tenders",   path:"/tenders",              color:"#107c10", angle:90,   roles:["admin","procurement_manager","procurement_officer"] },
  { label:"Contracts", path:"/contracts",            color:"#5C2D91", angle:150,  roles:["admin","procurement_manager"] },
  { label:"Planning",  path:"/procurement-planning", color:"#c0185a", angle:210,  roles:["admin","procurement_manager"] },
];

const OUTER_SEGS = [
  { label:"Reports & BI",    path:"/reports",         color:"#1F6090", roles:["admin","procurement_manager","procurement_officer"] },
  { label:"Audit Trail",     path:"/audit-log",       color:"#374151", roles:["admin","procurement_manager"] },
  { label:"Documents",       path:"/documents",       color:"#2d6a4f", roles:ROLE_ALL },
  { label:"Bid Evaluations", path:"/bid-evaluations", color:"#7B3F00", roles:["admin","procurement_manager"] },
  { label:"Admin Panel",     path:"/admin/panel",     color:"#1a1a2e", roles:["admin"] },
  { label:"Settings",        path:"/settings",        color:"#4b4b9b", roles:["admin"] },
];

function px(cx:number,cy:number,r:number,deg:number){
  const a=(deg-90)*Math.PI/180; return{x:cx+r*Math.cos(a),y:cy+r*Math.sin(a)};
}
function arc(cx:number,cy:number,r:number,s:number,e:number,ir=0){
  const rad=(d:number)=>(d-90)*Math.PI/180;
  const a1={x:cx+r*Math.cos(rad(s)),y:cy+r*Math.sin(rad(s))};
  const a2={x:cx+r*Math.cos(rad(e)),y:cy+r*Math.sin(rad(e))};
  const b1={x:cx+ir*Math.cos(rad(e)),y:cy+ir*Math.sin(rad(e))};
  const b2={x:cx+ir*Math.cos(rad(s)),y:cy+ir*Math.sin(rad(s))};
  const laf=(e-s)>180?1:0;
  if(ir===0) return`M${cx},${cy} L${a1.x},${a1.y} A${r},${r} 0 ${laf},1 ${a2.x},${a2.y} Z`;
  return`M${a1.x},${a1.y} A${r},${r} 0 ${laf},1 ${a2.x},${a2.y} L${b1.x},${b1.y} A${ir},${ir} 0 ${laf},0 ${b2.x},${b2.y} Z`;
}

export default function ERPWheelButton({logoUrl}:{logoUrl?:string|null}){
  const navigate=useNavigate();
  const{roles}=useAuth();
  const[hi,setHi]=useState<string|null>(null);
  const[ho,setHo]=useState<number|null>(null);
  const[hh,setHh]=useState(false);
  const can=(r:string[])=>!r.length||r.some(x=>roles.includes(x));
  const visOuter=OUTER_SEGS.filter(s=>can(s.roles));
  const visInner=INNER_NODES.filter(n=>can(n.roles));
  const CX=220,CY=220,HUB=52,SPK=100,NR=20,IR=128,OR=192;
  const N=visOuter.length||1;
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
      <svg width={440} height={440} viewBox="0 0 440 440" style={{overflow:"visible"}}>
        <defs>
          <radialGradient id="wbHub" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1d4a87"/><stop offset="100%" stopColor="#0a2558"/>
          </radialGradient>
          <filter id="wbGlow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <filter id="wbOGlow"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          {visOuter.map((s,i)=>(
            <radialGradient key={i} id={`wbS${i}`} cx="60%" cy="40%" r="70%">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.9"/>
              <stop offset="100%" stopColor={s.color} stopOpacity="1"/>
            </radialGradient>
          ))}
        </defs>
        <circle cx={CX} cy={CY} r={OR+16} fill="rgba(26,58,107,0.04)" stroke="#e2e8f0" strokeWidth="1"/>
        {/* Outer role-filtered segments */}
        {visOuter.map((seg,i)=>{
          const sl=360/N,sd=i*sl,ed=sd+sl-2,md=sd+sl/2;
          const mp=px(CX,CY,(IR+OR)/2,md);
          const isH=ho===i,r2=isH?OR+14:OR;
          return(
            <g key={i} style={{cursor:"pointer"}} onMouseEnter={()=>setHo(i)} onMouseLeave={()=>setHo(null)} onClick={()=>navigate(seg.path)}>
              <path d={arc(CX,CY,r2,sd,ed,IR+4)} fill={isH?seg.color:`url(#wbS${i})`} filter={isH?"url(#wbOGlow)":undefined} style={{transition:"all 0.2s",opacity:isH?1:0.82}}/>
              <text x={mp.x} y={mp.y} textAnchor="middle" dominantBaseline="middle" style={{fontSize:isH?9.5:8.5,fontWeight:700,fill:"#fff",fontFamily:"'Inter',sans-serif",pointerEvents:"none",textTransform:"uppercase",letterSpacing:"0.03em"}}>
                {seg.label.split(" ").map((w,wi)=>(
                  <tspan key={wi} x={mp.x} dy={wi===0&&seg.label.includes(" ")?"-6":wi>0?"13":"0"}>{w}</tspan>
                ))}
              </text>
            </g>
          );
        })}
        {/* Spokes */}
        {visInner.map((n,i)=>{
          const pt=px(CX,CY,SPK,n.angle),isH=hi===n.label;
          return<line key={i} x1={CX} y1={CY} x2={pt.x} y2={pt.y} stroke={isH?n.color:"#c5d3e8"} strokeWidth={isH?2.5:1.5} strokeDasharray={isH?"":"4 3"} style={{transition:"all 0.2s"}}/>;
        })}
        {/* Inner nodes */}
        {visInner.map((n)=>{
          const pt=px(CX,CY,SPK,n.angle),isH=hi===n.label;
          return(
            <g key={n.label} style={{cursor:"pointer"}} onMouseEnter={()=>setHi(n.label)} onMouseLeave={()=>setHi(null)} onClick={()=>navigate(n.path)}>
              {isH&&<circle cx={pt.x} cy={pt.y} r={NR+7} fill="none" stroke={n.color} strokeWidth="2" opacity="0.4" filter="url(#wbGlow)"/>}
              <circle cx={pt.x} cy={pt.y} r={NR+(isH?3:0)} fill={isH?n.color:"#fff"} stroke={n.color} strokeWidth={isH?0:2.5} filter={isH?"url(#wbGlow)":undefined} style={{transition:"all 0.2s"}}/>
              <text x={pt.x} y={pt.y} textAnchor="middle" dominantBaseline="middle" style={{fontSize:7.5,fontWeight:800,fill:isH?"#fff":n.color,pointerEvents:"none",fontFamily:"'Inter',sans-serif",textTransform:"uppercase",letterSpacing:"0.02em"}}>
                {n.label.length>8?n.label.slice(0,7)+"…":n.label}
              </text>
            </g>
          );
        })}
        {/* Hub */}
        <g style={{cursor:"pointer"}} onMouseEnter={()=>setHh(true)} onMouseLeave={()=>setHh(false)} onClick={()=>navigate("/dashboard")}>
          {hh&&<circle cx={CX} cy={CY} r={HUB+10} fill="none" stroke="#1a3a6b" strokeWidth="2" opacity="0.3" filter="url(#wbGlow)"><animate attributeName="r" values={`${HUB+6};${HUB+12};${HUB+6}`} dur="1.5s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.4;0.1;0.4" dur="1.5s" repeatCount="indefinite"/></circle>}
          <circle cx={CX} cy={CY} r={HUB} fill="url(#wbHub)" stroke={hh?"#60a5fa":"#1a3a6b"} strokeWidth={hh?3:2} filter={hh?"url(#wbGlow)":undefined} style={{transition:"all 0.2s"}}/>
          {logoUrl
            ?<image href={logoUrl} x={CX-22} y={CY-22} width={44} height={44} clipPath="circle()"/>
            :<><rect x={CX-7} y={CY-18} width={14} height={36} rx="3" fill="rgba(255,255,255,0.9)"/><rect x={CX-18} y={CY-7} width={36} height={14} rx="3" fill="rgba(255,255,255,0.9)"/></>
          }
          <text x={CX} y={CY+HUB+14} textAnchor="middle" style={{fontSize:9,fontWeight:800,fill:"#1a3a6b",fontFamily:"'Inter',sans-serif",letterSpacing:"0.06em",textTransform:"uppercase"}}>PROCUREMENT HUB</text>
        </g>
        <circle cx={CX} cy={CY} r={IR} fill="none" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 5"/>
      </svg>
      <div style={{display:"flex",gap:16,flexWrap:"wrap",justifyContent:"center",maxWidth:420}}>
        <span style={{fontSize:9,color:"#6b7280",fontWeight:600}}>⬤ Inner: Quick Access &nbsp;|&nbsp; ⬛ Outer: {visOuter.length} accessible modules for your role</span>
      </div>
    </div>
  );
}
