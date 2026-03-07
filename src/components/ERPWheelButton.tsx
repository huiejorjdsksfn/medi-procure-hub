import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, ShoppingCart, FileText, BarChart3, Package, Shield, DollarSign, Activity, Calendar, Gavel, Scale, ClipboardList, Truck, Users, Settings, BookMarked } from "lucide-react";

const MODULES = [
  { label:"Requisitions",    path:"/requisitions",         color:"#1a3a6b", icon:ClipboardList, angle:270 },
  { label:"Purchase Orders", path:"/purchase-orders",      color:"#1a3a6b", icon:ShoppingCart,  angle:310 },
  { label:"Goods Received",  path:"/goods-received",       color:"#1a3a6b", icon:Package,       angle:350 },
  { label:"Suppliers",       path:"/suppliers",            color:"#00695C", icon:Truck,         angle:30  },
  { label:"Tenders",         path:"/tenders",              color:"#00695C", icon:Gavel,         angle:70  },
  { label:"Contracts",       path:"/contracts",            color:"#00695C", icon:FileText,      angle:110 },
  { label:"Payments",        path:"/vouchers/payment",     color:"#C45911", icon:DollarSign,    angle:150 },
  { label:"Inventory",       path:"/items",                color:"#375623", icon:Package,       angle:190 },
  { label:"Quality",         path:"/quality/dashboard",    color:"#375623", icon:Shield,        angle:230 },
];

export default function ERPWheelButton() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setOpen(true)}
        title="ERP Quick Access"
        className="fixed right-4 bottom-8 z-40 w-12 h-12 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        style={{ background: "linear-gradient(135deg,#0a2558,#1d4a87)", border: "2px solid rgba(255,255,255,0.2)" }}>
        {/* Inner ring icon — hub & spoke */}
        <svg viewBox="0 0 32 32" className="w-7 h-7">
          <circle cx="16" cy="16" r="5" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5"/>
          <circle cx="16" cy="16" r="2" fill="rgba(255,255,255,0.9)"/>
          {[0,40,80,120,160,200,240,280,320].map((a,i) => {
            const r1=6, r2=13;
            const rad=a*Math.PI/180;
            return <line key={i} x1={16+r1*Math.cos(rad)} y1={16+r1*Math.sin(rad)} x2={16+r2*Math.cos(rad)} y2={16+r2*Math.sin(rad)} stroke="rgba(255,255,255,0.55)" strokeWidth="1.2"/>;
          })}
          <circle cx="16" cy="3"  r="2.2" fill="#60a5fa"/>
          <circle cx="27" cy="9"  r="2.2" fill="#34d399"/>
          <circle cx="27" cy="23" r="2.2" fill="#f59e0b"/>
          <circle cx="16" cy="29" r="2.2" fill="#f87171"/>
          <circle cx="5"  cy="23" r="2.2" fill="#a78bfa"/>
          <circle cx="5"  cy="9"  r="2.2" fill="#38bdf8"/>
        </svg>
      </button>

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"/>
          {/* Wheel container */}
          <div className="relative z-10" style={{ width: 440, height: 440 }} onClick={e => e.stopPropagation()}>
            {/* Close */}
            <button onClick={() => setOpen(false)}
              className="absolute top-0 right-0 z-20 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "#374151" }}>
              <X className="w-4 h-4 text-white"/>
            </button>

            {/* SVG Wheel — ERP Ecosystem diagram */}
            <svg viewBox="0 0 440 440" className="w-full h-full">
              {/* Outer ring */}
              <circle cx="220" cy="220" r="200" fill="none" stroke="#1e3a5f" strokeWidth="2"/>
              <circle cx="220" cy="220" r="140" fill="none" stroke="#1e3a5f" strokeWidth="1.5"/>
              <circle cx="220" cy="220" r="80"  fill="none" stroke="#1e3a5f" strokeWidth="1.5"/>

              {/* Outer teal ring segments */}
              {MODULES.map((m, i) => {
                const a1 = (m.angle - 19) * Math.PI / 180;
                const a2 = (m.angle + 19) * Math.PI / 180;
                const r1 = 145, r2 = 195;
                const x1=220+r2*Math.cos(a1), y1=220+r2*Math.sin(a1);
                const x2=220+r2*Math.cos(a2), y2=220+r2*Math.sin(a2);
                const x3=220+r1*Math.cos(a2), y3=220+r1*Math.sin(a2);
                const x4=220+r1*Math.cos(a1), y4=220+r1*Math.sin(a1);
                return (
                  <path key={i} d={`M${x1} ${y1} A${r2} ${r2} 0 0 1 ${x2} ${y2} L${x3} ${y3} A${r1} ${r1} 0 0 0 ${x4} ${y4} Z`}
                    fill={`${m.color}cc`} stroke="#0f1a2e" strokeWidth="1.5"
                    className="cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => { navigate(m.path); setOpen(false); }}/>
                );
              })}

              {/* Inner ring — module groups */}
              {[
                { label:"PROCUREMENT", color:"#1a3a6b", a:0 },
                { label:"VOUCHERS",    color:"#C45911", a:120 },
                { label:"INVENTORY",   color:"#375623", a:240 },
              ].map((g, i) => {
                const a1 = (g.a - 55) * Math.PI / 180;
                const a2 = (g.a + 55) * Math.PI / 180;
                const r1 = 85, r2 = 135;
                const x1=220+r2*Math.cos(a1), y1=220+r2*Math.sin(a1);
                const x2=220+r2*Math.cos(a2), y2=220+r2*Math.sin(a2);
                const x3=220+r1*Math.cos(a2), y3=220+r1*Math.sin(a2);
                const x4=220+r1*Math.cos(a1), y4=220+r1*Math.sin(a1);
                const mx=220+110*Math.cos(g.a*Math.PI/180), my=220+110*Math.sin(g.a*Math.PI/180);
                return (
                  <g key={i}>
                    <path d={`M${x1} ${y1} A${r2} ${r2} 0 0 1 ${x2} ${y2} L${x3} ${y3} A${r1} ${r1} 0 0 0 ${x4} ${y4} Z`}
                      fill={`${g.color}dd`} stroke="#0f1a2e" strokeWidth="1.5"/>
                    <text x={mx} y={my} textAnchor="middle" dominantBaseline="middle"
                      style={{fill:"#fff",fontSize:10,fontWeight:800,letterSpacing:"0.08em",fontFamily:"'Segoe UI',sans-serif"}}>
                      {g.label}
                    </text>
                  </g>
                );
              })}

              {/* Center hub */}
              <circle cx="220" cy="220" r="80" fill="linear-gradient(135deg,#0a2558,#1d4a87)"/>
              <circle cx="220" cy="220" r="78" fill="#0a2558"/>
              <circle cx="220" cy="220" r="60" fill="#0d2d6b"/>
              <circle cx="220" cy="220" r="32" fill="#1a3a6b"/>
              <circle cx="220" cy="220" r="18" fill="#1d4a87"/>
              <circle cx="220" cy="220" r="8"  fill="#60a5fa"/>

              {/* Spokes from center */}
              {MODULES.map((m, i) => {
                const rad = m.angle * Math.PI / 180;
                return <line key={i} x1={220+20*Math.cos(rad)} y1={220+20*Math.sin(rad)} x2={220+82*Math.cos(rad)} y2={220+82*Math.sin(rad)} stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>;
              })}

              {/* Center labels */}
              <text x="220" y="210" textAnchor="middle" style={{fill:"rgba(255,255,255,0.5)",fontSize:8,fontFamily:"'Segoe UI',sans-serif",letterSpacing:"0.15em"}}>EL5</text>
              <text x="220" y="223" textAnchor="middle" style={{fill:"#fff",fontSize:11,fontWeight:900,fontFamily:"'Segoe UI',sans-serif"}}>MediProcure</text>
              <text x="220" y="236" textAnchor="middle" style={{fill:"rgba(255,255,255,0.5)",fontSize:7.5,fontFamily:"'Segoe UI',sans-serif",letterSpacing:"0.1em"}}>SYSTEM HUB</text>

              {/* Module labels in outer ring */}
              {MODULES.map((m, i) => {
                const rad = m.angle * Math.PI / 180;
                const tx = 220 + 168 * Math.cos(rad);
                const ty = 220 + 168 * Math.sin(rad);
                return (
                  <text key={i} x={tx} y={ty} textAnchor="middle" dominantBaseline="middle"
                    style={{fill:"#fff",fontSize:7.5,fontWeight:700,fontFamily:"'Segoe UI',sans-serif",pointerEvents:"none"}}>
                    {m.label}
                  </text>
                );
              })}
            </svg>

            {/* Outer labels — Analytics, Office 365 etc */}
            <div className="absolute inset-0 pointer-events-none">
              <div style={{position:"absolute",top:8,left:"50%",transform:"translateX(-50%)",color:"rgba(255,255,255,0.55)",fontSize:10,fontWeight:600,whiteSpace:"nowrap"}}>Analytics &amp; Reporting</div>
              <div style={{position:"absolute",right:0,top:"40%",color:"rgba(255,255,255,0.55)",fontSize:10,fontWeight:600,writingMode:"vertical-rl"}}>Office 365</div>
              <div style={{position:"absolute",bottom:4,left:"50%",transform:"translateX(-50%)",color:"rgba(255,255,255,0.55)",fontSize:10,fontWeight:600,whiteSpace:"nowrap"}}>Access Anywhere</div>
              <div style={{position:"absolute",left:0,top:"40%",color:"rgba(255,255,255,0.55)",fontSize:10,fontWeight:600,writingMode:"vertical-lr"}}>Integrations</div>
            </div>

            {/* Click hint */}
            <p className="absolute bottom-2 left-0 right-0 text-center" style={{fontSize:10,color:"rgba(255,255,255,0.4)"}}>Click any segment to navigate</p>
          </div>
        </div>
      )}
    </>
  );
}
