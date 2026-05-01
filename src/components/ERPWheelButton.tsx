import { useNavigate } from "react-router-dom";
import { useState } from "react";

const INNER_NODES = [
  { label:"Vouchers",   path:"/vouchers/payment",    color:"#C45911", angle:-90 },
  { label:"Suppliers",  path:"/suppliers",           color:"#0078d4", angle:-30 },
  { label:"Quality",    path:"/quality/dashboard",   color:"#00695C", angle:30  },
  { label:"Tenders",    path:"/tenders",             color:"#107c10", angle:90  },
  { label:"Contracts",  path:"/contracts",           color:"#5C2D91", angle:150 },
  { label:"Planning",   path:"/procurement-planning",color:"#c0185a", angle:210 },
];
const OUTER_SEGS = [
  { label:"Reports & BI",    path:"/reports",         color:"#1F6090" },
  { label:"Audit Trail",     path:"/audit-log",       color:"#374151" },
  { label:"Documents",       path:"/documents",       color:"#2d6a4f" },
  { label:"Bid Evaluations", path:"/bid-evaluations", color:"#7B3F00" },
  { label:"Admin Panel",     path:"/admin/panel",     color:"#1a1a2e" },
  { label:"Settings",        path:"/settings",        color:"#4b4b9b" },
];

function polarToXY(angleDeg: number, r: number, cx=220, cy=220) {
  const a = (angleDeg - 90) * (Math.PI/180);
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number, innerR=0) {
  const toRad = (d: number) => (d - 90) * Math.PI / 180;
  const s1 = { x: cx + r*Math.cos(toRad(startDeg)),    y: cy + r*Math.sin(toRad(startDeg)) };
  const e1 = { x: cx + r*Math.cos(toRad(endDeg)),      y: cy + r*Math.sin(toRad(endDeg)) };
  const s2 = { x: cx + innerR*Math.cos(toRad(endDeg)), y: cy + innerR*Math.sin(toRad(endDeg)) };
  const e2 = { x: cx + innerR*Math.cos(toRad(startDeg)),y: cy + innerR*Math.sin(toRad(startDeg)) };
  const laf = (endDeg - startDeg) > 180 ? 1 : 0;
  if (innerR === 0) {
    return `M ${cx} ${cy} L ${s1.x} ${s1.y} A ${r} ${r} 0 ${laf} 1 ${e1.x} ${e1.y} Z`;
  }
  return `M ${s1.x} ${s1.y} A ${r} ${r} 0 ${laf} 1 ${e1.x} ${e1.y} L ${s2.x} ${s2.y} A ${innerR} ${innerR} 0 ${laf} 0 ${e2.x} ${e2.y} Z`;
}

export default function ERPWheelButton({ logoUrl }: { logoUrl?: string | null }) {
  const navigate = useNavigate();
  const [hoveredInner, setHoveredInner] = useState<string | null>(null);
  const [hoveredOuter, setHoveredOuter] = useState<number | null>(null);
  const [hoveredHub,   setHoveredHub]   = useState(false);

  const CX = 220, CY = 220;
  const HUB_R   = 52;
  const SPOKE_R  = 100;
  const NODE_R   = 20;
  const INNER_R  = 128;
  const OUTER_R  = 192;
  const OUTER_GAP = 4;
  const N = OUTER_SEGS.length;

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
      <svg width={440} height={440} viewBox="0 0 440 440" style={{overflow:"visible"}}>
        <defs>
          {/* Hub glow */}
          <radialGradient id="hubGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#1d4a87"/>
            <stop offset="100%" stopColor="#0a2558"/>
          </radialGradient>
          {/* Pulse ring */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          {/* Outer glow */}
          <filter id="outerGlow">
            <feGaussianBlur stdDeviation="5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          {OUTER_SEGS.map((seg,i)=>(
            <radialGradient key={i} id={`segGrad${i}`} cx="60%" cy="40%" r="70%">
              <stop offset="0%" stopColor={seg.color} stopOpacity="0.9"/>
              <stop offset="100%" stopColor={seg.color} stopOpacity="1"/>
            </radialGradient>
          ))}
        </defs>

        {/* ── Background circle ── */}
        <circle cx={CX} cy={CY} r={OUTER_R+16} fill="rgba(26,58,107,0.04)" stroke="#e2e8f0" strokeWidth="1"/>

        {/* ── Outer ring segments ── */}
        {OUTER_SEGS.map((seg, i) => {
          const sliceDeg = 360 / N;
          const startDeg = i * sliceDeg;
          const endDeg   = startDeg + sliceDeg - 2;
          const midDeg   = startDeg + sliceDeg/2;
          const midPt    = polarToXY(midDeg, (INNER_R + OUTER_R)/2, CX, CY);
          const isHov    = hoveredOuter === i;
          const r2       = isHov ? OUTER_R + 14 : OUTER_R;
          const r1       = INNER_R + 4;
          const path     = arcPath(CX, CY, r2, startDeg, endDeg, r1);

          return (
            <g key={i} style={{cursor:"pointer"}}
              onMouseEnter={()=>setHoveredOuter(i)}
              onMouseLeave={()=>setHoveredOuter(null)}
              onClick={()=>navigate(seg.path)}>
              <path d={path} fill={isHov ? seg.color : `url(#segGrad${i})`}
                filter={isHov?"url(#outerGlow)":undefined}
                style={{transition:"all 0.2s ease",opacity:isHov?1:0.82}}/>
              {/* Segment label */}
              <text
                x={midPt.x} y={midPt.y}
                textAnchor="middle" dominantBaseline="middle"
                style={{
                  fontSize: isHov ? 9.5 : 8.5, fontWeight:700,
                  fill:"#fff", fontFamily:"'Inter',sans-serif",
                  pointerEvents:"none", textTransform:"uppercase",
                  letterSpacing:"0.03em",
                }}>
                {seg.label.split(" ").map((w,wi)=>(
                  <tspan key={wi} x={midPt.x} dy={wi===0 && seg.label.includes(" ") ? "-6" : wi>0?"13":"0"}>
                    {w}
                  </tspan>
                ))}
              </text>
            </g>
          );
        })}

        {/* ── Spoke lines ── */}
        {INNER_NODES.map((node, i) => {
          const pt = polarToXY(node.angle, SPOKE_R, CX, CY);
          const isHov = hoveredInner === node.label;
          return (
            <line key={i}
              x1={CX} y1={CY} x2={pt.x} y2={pt.y}
              stroke={isHov ? node.color : "#c5d3e8"}
              strokeWidth={isHov ? 2.5 : 1.5}
              strokeDasharray={isHov ? "" : "4 3"}
              style={{transition:"all 0.2s"}}/>
          );
        })}

        {/* ── Inner spoke nodes ── */}
        {INNER_NODES.map((node) => {
          const pt  = polarToXY(node.angle, SPOKE_R, CX, CY);
          const isH = hoveredInner === node.label;
          return (
            <g key={node.label} style={{cursor:"pointer"}}
              onMouseEnter={()=>setHoveredInner(node.label)}
              onMouseLeave={()=>setHoveredInner(null)}
              onClick={()=>navigate(node.path)}>
              {/* Glow ring on hover */}
              {isH && (
                <circle cx={pt.x} cy={pt.y} r={NODE_R+7}
                  fill="none" stroke={node.color} strokeWidth="2" opacity="0.4"
                  filter="url(#glow)"/>
              )}
              <circle cx={pt.x} cy={pt.y} r={NODE_R + (isH ? 3 : 0)}
                fill={isH ? node.color : "#fff"}
                stroke={node.color} strokeWidth={isH ? 0 : 2.5}
                filter={isH?"url(#glow)":undefined}
                style={{transition:"all 0.2s ease"}}/>
              <text x={pt.x} y={pt.y} textAnchor="middle" dominantBaseline="middle"
                style={{
                  fontSize:7.5, fontWeight:800, fill: isH?"#fff":node.color,
                  pointerEvents:"none", fontFamily:"'Inter',sans-serif",
                  textTransform:"uppercase", letterSpacing:"0.02em",
                }}>
                {node.label.length > 8 ? node.label.slice(0,7)+"…" : node.label}
              </text>
            </g>
          );
        })}

        {/* ── Hub circle ── */}
        <g style={{cursor:"pointer"}}
          onMouseEnter={()=>setHoveredHub(true)}
          onMouseLeave={()=>setHoveredHub(false)}
          onClick={()=>navigate("/dashboard")}>
          {hoveredHub && (
            <circle cx={CX} cy={CY} r={HUB_R+10}
              fill="none" stroke="#1a3a6b" strokeWidth="2" opacity="0.3"
              filter="url(#glow)">
              <animate attributeName="r" values={`${HUB_R+6};${HUB_R+12};${HUB_R+6}`} dur="1.5s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.4;0.1;0.4" dur="1.5s" repeatCount="indefinite"/>
            </circle>
          )}
          <circle cx={CX} cy={CY} r={HUB_R}
            fill="url(#hubGrad)"
            stroke={hoveredHub ? "#60a5fa" : "#1a3a6b"}
            strokeWidth={hoveredHub ? 3 : 2}
            filter={hoveredHub?"url(#glow)":undefined}
            style={{transition:"all 0.2s"}}/>
          {/* Logo or icon in hub */}
          {logoUrl
            ? <image href={logoUrl} x={CX-22} y={CY-22} width={44} height={44} style={{borderRadius:8}} clipPath="circle()"/>
            : <>
                {/* Hospital cross icon */}
                <rect x={CX-7} y={CY-18} width={14} height={36} rx="3" fill="rgba(255,255,255,0.9)"/>
                <rect x={CX-18} y={CY-7} width={36} height={14} rx="3" fill="rgba(255,255,255,0.9)"/>
              </>
          }
          {/* Hub label */}
          <text x={CX} y={CY+HUB_R+14} textAnchor="middle"
            style={{fontSize:9, fontWeight:800, fill:"#1a3a6b",fontFamily:"'Inter',sans-serif",letterSpacing:"0.06em",textTransform:"uppercase"}}>
            PROCUREMENT HUB
          </text>
        </g>

        {/* ── Inner ring connector ── */}
        <circle cx={CX} cy={CY} r={INNER_R} fill="none" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 5"/>
      </svg>

      {/* Legend */}
      <div style={{display:"flex",gap:16,flexWrap:"wrap",justifyContent:"center",maxWidth:420}}>
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          <div style={{width:12,height:12,borderRadius:"50%",background:"#1a3a6b"}}/>
          <span style={{fontSize:9,color:"#6b7280",fontWeight:600}}>INNER: Quick Actions</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          <div style={{width:12,height:12,borderRadius:2,background:"#374151"}}/>
          <span style={{fontSize:9,color:"#6b7280",fontWeight:600}}>OUTER: System Modules</span>
        </div>
      </div>
    </div>
  );
}
