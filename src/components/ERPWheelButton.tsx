/**
 * ERPWheelButton v4.0 — ProcurBosse Pro
 * Full ERP wheel: 12 outer segments + 8 inner spokes
 * All modules, all roles activated
 */
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

const INNER_NODES = [
  { label:"Requisitions",  path:"/requisitions",          color:"#0078d4", angle:-90,  roles:[] as string[] },
  { label:"Purchase Ord.", path:"/purchase-orders",       color:"#C45911", angle:-45,  roles:["admin","procurement_manager","procurement_officer"] },
  { label:"Vouchers",      path:"/vouchers/payment",      color:"#7c3aed", angle:0,    roles:["admin","procurement_manager","accountant"] },
  { label:"Suppliers",     path:"/suppliers",             color:"#059669", angle:45,   roles:["admin","procurement_manager","procurement_officer"] },
  { label:"Tenders",       path:"/tenders",               color:"#dc2626", angle:90,   roles:["admin","procurement_manager","procurement_officer"] },
  { label:"Quality",       path:"/quality/dashboard",     color:"#0891b2", angle:135,  roles:[] as string[] },
  { label:"Contracts",     path:"/contracts",             color:"#9333ea", angle:180,  roles:["admin","procurement_manager"] },
  { label:"Planning",      path:"/procurement-planning",  color:"#d97706", angle:225,  roles:["admin","procurement_manager"] },
];

const OUTER_SEGS = [
  { label:"Reports & BI",    path:"/reports",              color:"#1F6090", icon:"📊" },
  { label:"Audit Trail",     path:"/audit-log",            color:"#374151", icon:"🔍" },
  { label:"Documents",       path:"/documents",            color:"#2d6a4f", icon:"📄" },
  { label:"Bid Evaluation",  path:"/bid-evaluations",      color:"#7B3F00", icon:"⚖️" },
  { label:"Admin Panel",     path:"/admin/panel",          color:"#1a1a2e", icon:"🛡️" },
  { label:"Settings",        path:"/settings",             color:"#4b4b9b", icon:"⚙️" },
  { label:"Finance",         path:"/financials/dashboard", color:"#0e7490", icon:"💰" },
  { label:"Inventory",       path:"/items",                color:"#065f46", icon:"📦" },
  { label:"Email & SMS",     path:"/email",                color:"#9d174d", icon:"✉️" },
  { label:"Users & Roles",   path:"/users",                color:"#1e3a5f", icon:"👥" },
  { label:"Backup & DB",     path:"/backup",               color:"#44403c", icon:"🗄️" },
  { label:"Print Engine",    path:"/print-engine",         color:"#166534", icon:"🖨️" },
];

function polarToXY(angleDeg: number, r: number, cx = 250, cy = 250) {
  const a = (angleDeg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number, innerR = 0) {
  const toRad = (d: number) => (d - 90) * Math.PI / 180;
  const s1 = { x: cx + r * Math.cos(toRad(startDeg)),       y: cy + r * Math.sin(toRad(startDeg)) };
  const e1 = { x: cx + r * Math.cos(toRad(endDeg)),         y: cy + r * Math.sin(toRad(endDeg)) };
  const s2 = { x: cx + innerR * Math.cos(toRad(endDeg)),    y: cy + innerR * Math.sin(toRad(endDeg)) };
  const e2 = { x: cx + innerR * Math.cos(toRad(startDeg)),  y: cy + innerR * Math.sin(toRad(startDeg)) };
  const laf = (endDeg - startDeg) > 180 ? 1 : 0;
  if (innerR === 0) return `M ${cx} ${cy} L ${s1.x} ${s1.y} A ${r} ${r} 0 ${laf} 1 ${e1.x} ${e1.y} Z`;
  return `M ${s1.x} ${s1.y} A ${r} ${r} 0 ${laf} 1 ${e1.x} ${e1.y} L ${s2.x} ${s2.y} A ${innerR} ${innerR} 0 ${laf} 0 ${e2.x} ${e2.y} Z`;
}

export default function ERPWheelButton({ logoUrl }: { logoUrl?: string | null }) {
  const navigate = useNavigate();
  const { roles } = useAuth();
  const [hoveredInner, setHoveredInner] = useState<string | null>(null);
  const [hoveredOuter, setHoveredOuter] = useState<number | null>(null);
  const [hoveredHub,   setHoveredHub]   = useState(false);
  const [spinning,     setSpinning]     = useState(false);

  const CX = 250, CY = 250;
  const HUB_R   = 54;
  const SPOKE_R  = 110;
  const NODE_R   = 18;
  const INNER_R  = 140;
  const OUTER_R  = 210;
  const N = OUTER_SEGS.length;

  const canAccess = (node: { roles: string[] }) =>
    !node.roles.length || node.roles.some(r => roles.includes(r));

  const handleHub = () => {
    setSpinning(true);
    setTimeout(() => setSpinning(false), 700);
    navigate("/dashboard");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        background: "linear-gradient(135deg,#0a2558,#1a3a6b)",
        borderRadius: 20, padding: "3px 12px",
        fontSize: 9.5, fontWeight: 800, color: "#60a5fa",
        letterSpacing: "0.12em", textTransform: "uppercase",
        boxShadow: "0 2px 8px rgba(10,37,88,0.3)",
      }}>
        <span style={{ color: "#34d399" }}>●</span> EL5 MediProcure Pro v4.0 — ERP Command Wheel
      </div>

      <svg width={500} height={500} viewBox="0 0 500 500"
        style={{
          overflow: "visible",
          transform: spinning ? "rotate(360deg)" : "none",
          transition: spinning ? "transform 0.7s cubic-bezier(0.4,0,0.2,1)" : "none",
        }}>
        <defs>
          <radialGradient id="hubGradPro" cx="40%" cy="35%" r="70%">
            <stop offset="0%"   stopColor="#1d4a87"/>
            <stop offset="60%"  stopColor="#0a2558"/>
            <stop offset="100%" stopColor="#060e23"/>
          </radialGradient>
          <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#e8f0fe" stopOpacity="0.5"/>
            <stop offset="100%" stopColor="#f0f4ff" stopOpacity="0"/>
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="outerGlow">
            <feGaussianBlur stdDeviation="5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="hubGlow">
            <feGaussianBlur stdDeviation="8" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          {OUTER_SEGS.map((seg, i) => (
            <radialGradient key={i} id={`segGradPro${i}`} cx="55%" cy="35%" r="75%">
              <stop offset="0%"   stopColor={seg.color} stopOpacity="0.85"/>
              <stop offset="100%" stopColor={seg.color} stopOpacity="1"/>
            </radialGradient>
          ))}
        </defs>

        <circle cx={CX} cy={CY} r={OUTER_R + 30} fill="url(#bgGrad)"/>
        <circle cx={CX} cy={CY} r={OUTER_R + 22} fill="none" stroke="#c7d4f0" strokeWidth="1" strokeDasharray="4 6"/>
        <circle cx={CX} cy={CY} r={OUTER_R + 2}  fill="none" stroke="#d1daf5" strokeWidth="0.5"/>

        {OUTER_SEGS.map((seg, i) => {
          const sliceDeg = 360 / N;
          const startDeg = i * sliceDeg + 1;
          const endDeg   = startDeg + sliceDeg - 2;
          const midDeg   = i * sliceDeg + sliceDeg / 2;
          const midPt    = polarToXY(midDeg, (INNER_R + OUTER_R) / 2, CX, CY);
          const isHov    = hoveredOuter === i;
          const r2       = isHov ? OUTER_R + 16 : OUTER_R;
          const r1       = INNER_R + 6;
          const path     = arcPath(CX, CY, r2, startDeg, endDeg, r1);

          return (
            <g key={i} style={{ cursor: "pointer" }}
              onMouseEnter={() => setHoveredOuter(i)}
              onMouseLeave={() => setHoveredOuter(null)}
              onClick={() => navigate(seg.path)}>
              <path d={path}
                fill={isHov ? seg.color : `url(#segGradPro${i})`}
                filter={isHov ? "url(#outerGlow)" : undefined}
                style={{ transition: "all 0.18s ease", opacity: isHov ? 1 : 0.88 }}/>
              <text x={midPt.x} y={midPt.y - 5}
                textAnchor="middle" dominantBaseline="middle"
                style={{
                  fontSize: isHov ? 8 : 7, fontWeight: 800,
                  fill: "#fff", fontFamily: "'Inter',sans-serif",
                  pointerEvents: "none", textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}>
                {seg.label.split(" ").map((w, wi) => (
                  <tspan key={wi} x={midPt.x}
                    dy={wi === 0 && seg.label.includes(" ") ? "-7" : wi > 0 ? "12" : "0"}>
                    {w}
                  </tspan>
                ))}
              </text>
              <text x={midPt.x} y={midPt.y + (seg.label.includes(" ") ? 16 : 10)}
                textAnchor="middle"
                style={{ fontSize: 11, pointerEvents: "none", opacity: isHov ? 1 : 0.7 }}>
                {seg.icon}
              </text>
            </g>
          );
        })}

        <circle cx={CX} cy={CY} r={INNER_R} fill="none" stroke="#c5d3e8" strokeWidth="1" strokeDasharray="3 5"/>
        <circle cx={CX} cy={CY} r={SPOKE_R + NODE_R + 2} fill="none" stroke="#e8eef8" strokeWidth="0.5"/>

        {INNER_NODES.map((node, i) => {
          const pt  = polarToXY(node.angle, SPOKE_R, CX, CY);
          const isH = hoveredInner === node.label;
          const accessible = canAccess(node);
          return (
            <line key={i}
              x1={CX} y1={CY} x2={pt.x} y2={pt.y}
              stroke={isH ? node.color : accessible ? "#c5d3e8" : "#e5e7eb"}
              strokeWidth={isH ? 2.5 : 1.5}
              strokeDasharray={isH ? "" : "4 3"}
              style={{ transition: "all 0.2s" }}/>
          );
        })}

        {INNER_NODES.map((node) => {
          const pt  = polarToXY(node.angle, SPOKE_R, CX, CY);
          const isH = hoveredInner === node.label;
          const accessible = canAccess(node);
          return (
            <g key={node.label}
              style={{ cursor: accessible ? "pointer" : "not-allowed", opacity: accessible ? 1 : 0.4 }}
              onMouseEnter={() => accessible && setHoveredInner(node.label)}
              onMouseLeave={() => setHoveredInner(null)}
              onClick={() => accessible && navigate(node.path)}>
              {isH && (
                <circle cx={pt.x} cy={pt.y} r={NODE_R + 8}
                  fill="none" stroke={node.color} strokeWidth="2" opacity="0.3"
                  filter="url(#glow)">
                  <animate attributeName="r" values={`${NODE_R+5};${NODE_R+10};${NODE_R+5}`} dur="1.4s" repeatCount="indefinite"/>
                </circle>
              )}
              <circle cx={pt.x} cy={pt.y} r={NODE_R + (isH ? 3 : 0)}
                fill={isH ? node.color : "#fff"}
                stroke={node.color}
                strokeWidth={isH ? 0 : 2.5}
                filter={isH ? "url(#glow)" : undefined}
                style={{ transition: "all 0.2s ease" }}/>
              <text x={pt.x} y={pt.y} textAnchor="middle" dominantBaseline="middle"
                style={{
                  fontSize: 7, fontWeight: 800,
                  fill: !accessible ? "#9ca3af" : isH ? "#fff" : node.color,
                  pointerEvents: "none", fontFamily: "'Inter',sans-serif",
                  textTransform: "uppercase", letterSpacing: "0.02em",
                }}>
                {!accessible ? "🔒" : (node.label.length > 9 ? node.label.slice(0, 8) + "…" : node.label)}
              </text>
            </g>
          );
        })}

        <g style={{ cursor: "pointer" }}
          onMouseEnter={() => setHoveredHub(true)}
          onMouseLeave={() => setHoveredHub(false)}
          onClick={handleHub}>
          {hoveredHub && (
            <circle cx={CX} cy={CY} r={HUB_R + 12}
              fill="none" stroke="#60a5fa" strokeWidth="2" opacity="0.25"
              filter="url(#hubGlow)">
              <animate attributeName="r" values={`${HUB_R+8};${HUB_R+16};${HUB_R+8}`} dur="1.8s" repeatCount="indefinite"/>
            </circle>
          )}
          <circle cx={CX + 2} cy={CY + 3} r={HUB_R} fill="rgba(0,0,0,0.2)" filter="url(#glow)"/>
          <circle cx={CX} cy={CY} r={HUB_R}
            fill="url(#hubGradPro)"
            stroke={hoveredHub ? "#60a5fa" : "#1a3a6b"}
            strokeWidth={hoveredHub ? 3 : 2.5}
            filter={hoveredHub ? "url(#hubGlow)" : undefined}
            style={{ transition: "all 0.2s" }}/>
          <circle cx={CX} cy={CY} r={HUB_R - 8} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
          {logoUrl
            ? <image href={logoUrl} x={CX - 22} y={CY - 22} width={44} height={44} clipPath="circle()"/>
            : <>
                <rect x={CX - 6} y={CY - 18} width={12} height={36} rx="3" fill="rgba(255,255,255,0.92)"/>
                <rect x={CX - 18} y={CY - 6} width={36} height={12} rx="3" fill="rgba(255,255,255,0.92)"/>
              </>
          }
          <text x={CX} y={CY + HUB_R + 13} textAnchor="middle"
            style={{
              fontSize: 8.5, fontWeight: 800, fill: "#0a2558",
              fontFamily: "'Inter',sans-serif",
              letterSpacing: "0.07em", textTransform: "uppercase",
            }}>
            ◆ PROCUREMENT HUB ◆
          </text>
          <text x={CX} y={CY + HUB_R + 24} textAnchor="middle"
            style={{ fontSize: 7, fontWeight: 600, fill: "#60a5fa", fontFamily: "'Inter',sans-serif" }}>
            Click for Dashboard
          </text>
        </g>
      </svg>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", maxWidth: 500 }}>
        {[
          { label: "Inner Ring", desc: "Quick Actions", color: "#1a3a6b" },
          { label: "Outer Ring", desc: "System Modules", color: "#374151" },
          { label: "🔒 Locked", desc: "Role Restricted", color: "#9ca3af" },
        ].map(c => (
          <div key={c.label} style={{
            display: "flex", alignItems: "center", gap: 5,
            background: "#f8fafc", border: "1px solid #e2e8f0",
            borderRadius: 12, padding: "3px 9px",
          }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: c.color, flexShrink: 0 }}/>
            <span style={{ fontSize: 9, color: "#374151", fontWeight: 700 }}>{c.label}</span>
            <span style={{ fontSize: 9, color: "#9ca3af" }}>— {c.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
