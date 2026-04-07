/**
 * EL5 MediProcure v5.8 — ERP Navigation Wheel
 * Fully role-based · All modules + submenus · Expandable submenu ring
 * ProcurBosse · Embu Level 5 Hospital
 */
import { useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";

type Role = string;

// ── All modules with roles + subpages ─────────────────────────────────────
const ALL_MODULES = [
  {
    id:"procurement", label:"Procurement", color:"#0078d4", icon:"📋",
    path:"/requisitions",
    roles:["admin","procurement_manager","procurement_officer","requisitioner"],
    subs:[
      {label:"Requisitions",    path:"/requisitions",         roles:[]},
      {label:"Purchase Orders", path:"/purchase-orders",      roles:["admin","procurement_manager","procurement_officer"]},
      {label:"Goods Received",  path:"/goods-received",       roles:["admin","procurement_manager","procurement_officer","warehouse_officer"]},
      {label:"Suppliers",       path:"/suppliers",            roles:["admin","procurement_manager","procurement_officer"]},
      {label:"Contracts",       path:"/contracts",            roles:["admin","procurement_manager"]},
      {label:"Tenders",         path:"/tenders",              roles:["admin","procurement_manager","procurement_officer"]},
      {label:"Bid Evals",       path:"/bid-evaluations",      roles:["admin","procurement_manager"]},
      {label:"Planning",        path:"/procurement-planning", roles:["admin","procurement_manager"]},
    ],
  },
  {
    id:"inventory", label:"Inventory", color:"#059669", icon:"📦",
    path:"/items",
    roles:["admin","procurement_manager","procurement_officer","inventory_manager","warehouse_officer","requisitioner"],
    subs:[
      {label:"Items / Stock", path:"/items",       roles:[]},
      {label:"Categories",    path:"/categories",  roles:["admin","inventory_manager"]},
      {label:"Departments",   path:"/departments", roles:["admin","inventory_manager"]},
      {label:"Scanner",       path:"/scanner",     roles:[]},
    ],
  },
  {
    id:"vouchers", label:"Vouchers", color:"#C45911", icon:"💳",
    path:"/vouchers/payment",
    roles:["admin","procurement_manager","procurement_officer","accountant"],
    subs:[
      {label:"Payment",  path:"/vouchers/payment",  roles:[]},
      {label:"Receipt",  path:"/vouchers/receipt",  roles:["admin","procurement_manager","accountant"]},
      {label:"Journal",  path:"/vouchers/journal",  roles:["admin","procurement_manager","accountant"]},
      {label:"Purchase", path:"/vouchers/purchase", roles:["admin","procurement_manager","accountant"]},
      {label:"Sales",    path:"/vouchers/sales",    roles:["admin","procurement_manager","accountant"]},
    ],
  },
  {
    id:"financials", label:"Financials", color:"#7c3aed", icon:"📊",
    path:"/financials/dashboard",
    roles:["admin","procurement_manager","accountant"],
    subs:[
      {label:"Dashboard",  path:"/financials/dashboard",        roles:[]},
      {label:"Accounts",   path:"/financials/chart-of-accounts",roles:[]},
      {label:"Budgets",    path:"/financials/budgets",          roles:[]},
      {label:"Assets",     path:"/financials/fixed-assets",     roles:[]},
    ],
  },
  {
    id:"accountant", label:"Accountant", color:"#0891b2", icon:"🏦",
    path:"/accountant-workspace",
    roles:["admin","accountant","procurement_manager"],
    subs:[
      {label:"Workspace",    path:"/accountant-workspace",           roles:[]},
      {label:"Inv. Match",   path:"/accountant-workspace",           roles:[]},
      {label:"Payments",     path:"/vouchers/payment",               roles:[]},
      {label:"Budget Ctrl",  path:"/financials/budgets",             roles:[]},
      {label:"ERP Sync",     path:"/accountant-workspace",           roles:[]},
      {label:"Ledger",       path:"/vouchers/journal",               roles:[]},
    ],
  },
  {
    id:"quality", label:"Quality", color:"#00695C", icon:"🔍",
    path:"/quality/dashboard",
    roles:["admin","procurement_manager","procurement_officer","inventory_manager","warehouse_officer"],
    subs:[
      {label:"QC Dashboard",  path:"/quality/dashboard",       roles:[]},
      {label:"Inspections",   path:"/quality/inspections",     roles:[]},
      {label:"Non-Conform",   path:"/quality/non-conformance", roles:[]},
    ],
  },
  {
    id:"reports", label:"Reports", color:"#1F6090", icon:"📈",
    path:"/reports",
    roles:["admin","procurement_manager","procurement_officer","accountant","inventory_manager"],
    subs:[
      {label:"Analytics",  path:"/reports",    roles:[]},
      {label:"Audit Log",  path:"/audit-log",  roles:["admin","procurement_manager","accountant"]},
      {label:"Documents",  path:"/documents",  roles:[]},
    ],
  },
  {
    id:"reception", label:"Reception", color:"#0369a1", icon:"🏥",
    path:"/reception",
    roles:["admin","procurement_manager","procurement_officer","inventory_manager","warehouse_officer","requisitioner","accountant"],
    subs:[
      {label:"Visitors",   path:"/reception",  roles:[]},
      {label:"Telephony",  path:"/telephony",  roles:["admin","procurement_manager","procurement_officer","accountant"]},
      {label:"SMS",        path:"/sms",        roles:["admin","procurement_manager","procurement_officer","accountant"]},
      {label:"WhatsApp",   path:"/sms",        roles:["admin","procurement_manager"]},
    ],
  },
  {
    id:"admin", label:"Admin", color:"#374151", icon:"⚙️",
    path:"/admin/panel",
    roles:["admin"],
    subs:[
      {label:"Panel",      path:"/admin/panel",      roles:["admin"]},
      {label:"Users",      path:"/users",            roles:["admin"]},
      {label:"Settings",   path:"/settings",         roles:["admin"]},
      {label:"Webmaster",  path:"/webmaster",        roles:["admin"]},
      {label:"GUI Editor", path:"/gui-editor",       roles:["admin"]},
      {label:"Backup",     path:"/backup",           roles:["admin"]},
      {label:"DB Admin",   path:"/admin/database",   roles:["admin"]},
      {label:"IP Access",  path:"/admin/ip-access",  roles:["admin"]},
    ],
  },
];

// ── Geometry helpers ──────────────────────────────────────────────────────
function pt(cx:number,cy:number,r:number,deg:number){
  const a=(deg-90)*Math.PI/180;
  return {x:cx+r*Math.cos(a), y:cy+r*Math.sin(a)};
}
function annularArc(cx:number,cy:number,r:number,ir:number,sd:number,ed:number){
  const rad=(d:number)=>(d-90)*Math.PI/180;
  const a1={x:cx+r*Math.cos(rad(sd)), y:cy+r*Math.sin(rad(sd))};
  const a2={x:cx+r*Math.cos(rad(ed)), y:cy+r*Math.sin(rad(ed))};
  const b1={x:cx+ir*Math.cos(rad(ed)),y:cy+ir*Math.sin(rad(ed))};
  const b2={x:cx+ir*Math.cos(rad(sd)),y:cy+ir*Math.sin(rad(sd))};
  const laf=(ed-sd)>180?1:0;
  return `M${a1.x},${a1.y} A${r},${r} 0 ${laf},1 ${a2.x},${a2.y} L${b1.x},${b1.y} A${ir},${ir} 0 ${laf},0 ${b2.x},${b2.y} Z`;
}
function wrapText(label:string, maxW:number=9):string[]{
  if(label.length<=maxW) return [label];
  const w=label.split(" ");
  const lines:string[]=[];
  let cur="";
  for(const word of w){
    if((cur+" "+word).trim().length>maxW){ if(cur) lines.push(cur); cur=word; }
    else cur=(cur+" "+word).trim();
  }
  if(cur) lines.push(cur);
  return lines.slice(0,2);
}

export default function ERPWheelButton({logoUrl}:{logoUrl?:string|null}){
  const navigate  = useNavigate();
  const {roles}   = useAuth();
  const [active,  setActive]  = useState<string|null>(null); // hovered module id
  const [subOpen, setSubOpen] = useState<string|null>(null); // clicked module showing subs
  const [hubHov,  setHubHov]  = useState(false);

  const can = (r:Role[]) => !r.length || r.some(x=>roles.includes(x));

  // Filter modules and their subs by role
  const mods = useMemo(()=>
    ALL_MODULES
      .filter(m=>can(m.roles))
      .map(m=>({...m, subs:m.subs.filter(s=>can(s.roles))}))
  ,[roles]);

  const CX=230, CY=230;
  const HUB=50, INNER_R=95, MID_R=155, OUTER_R=208, SUB_R=260;
  const N=mods.length;
  const GAP=2.5;

  const activeMod = mods.find(m=>m.id===subOpen);

  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12,userSelect:"none"}}>
      <svg width={460} height={460} viewBox="0 0 460 460" style={{overflow:"visible"}}>
        <defs>
          <radialGradient id="hubG" cx="40%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#1e40af"/><stop offset="100%" stopColor="#0a1628"/>
          </radialGradient>
          <filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <filter id="glow2"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>

        {/* Outer ring guide */}
        <circle cx={CX} cy={CY} r={OUTER_R+20} fill="none" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="2 6"/>

        {/* ── Module segments (middle ring) ── */}
        {mods.map((m,i)=>{
          const sl=360/N, sd=i*sl, ed=sd+sl-GAP, md=sd+sl/2;
          const isA=active===m.id||subOpen===m.id;
          const r2=isA?MID_R+12:MID_R;
          const midPt=pt(CX,CY,(INNER_R+r2)/2,md);
          const lines=wrapText(m.label);
          return(
            <g key={m.id} style={{cursor:"pointer"}}
              onMouseEnter={()=>setActive(m.id)}
              onMouseLeave={()=>setActive(null)}
              onClick={()=>{ setSubOpen(subOpen===m.id?null:m.id); }}
            >
              {/* Segment */}
              <path
                d={annularArc(CX,CY,r2,INNER_R,sd,ed)}
                fill={isA?m.color:m.color+"cc"}
                filter={isA?"url(#glow)":undefined}
                style={{transition:"all 0.18s"}}
              />
              {/* Icon */}
              <text x={midPt.x} y={midPt.y-(lines.length>1?8:4)}
                textAnchor="middle" style={{fontSize:13,pointerEvents:"none"}}>
                {m.icon}
              </text>
              {/* Label lines */}
              {lines.map((ln,li)=>(
                <text key={li} x={midPt.x} y={midPt.y+(li*11)+(lines.length>1?2:6)}
                  textAnchor="middle"
                  style={{fontSize:7.5,fontWeight:800,fill:"#fff",pointerEvents:"none",
                    fontFamily:"'Inter',sans-serif",textTransform:"uppercase",letterSpacing:"0.04em"}}>
                  {ln}
                </text>
              ))}
              {/* Submenu indicator dot */}
              {m.subs.length>0&&(
                <circle cx={pt(CX,CY,INNER_R+4,md).x} cy={pt(CX,CY,INNER_R+4,md).y}
                  r={3} fill={subOpen===m.id?"#fff":"rgba(255,255,255,0.5)"}/>
              )}
            </g>
          );
        })}

        {/* ── Outer navigation ring (quick jumps to module root) ── */}
        {mods.map((m,i)=>{
          const sl=360/N, sd=i*sl, ed=sd+sl-GAP, md=sd+sl/2;
          const isA=active===m.id||subOpen===m.id;
          const midPt=pt(CX,CY,(MID_R+OUTER_R)/2+4,md);
          return(
            <g key={"o"+m.id} style={{cursor:"pointer"}}
              onMouseEnter={()=>setActive(m.id)}
              onMouseLeave={()=>setActive(null)}
              onClick={()=>navigate(m.path)}
            >
              <path
                d={annularArc(CX,CY,OUTER_R,MID_R+2,sd,ed)}
                fill={isA?m.color+"22":m.color+"10"}
                stroke={isA?m.color:"#e2e8f0"}
                strokeWidth={isA?1.5:0.5}
                style={{transition:"all 0.18s"}}
              />
              <text x={midPt.x} y={midPt.y}
                textAnchor="middle" dominantBaseline="middle"
                style={{fontSize:7,fontWeight:700,fill:isA?m.color:"#94a3b8",
                  pointerEvents:"none",fontFamily:"'Inter',sans-serif",letterSpacing:"0.06em",
                  textTransform:"uppercase"}}>
                GO
              </text>
            </g>
          );
        })}

        {/* ── Sub-menu ring (shown when a module is clicked) ── */}
        {activeMod&&activeMod.subs.map((s,i)=>{
          const modIdx=mods.findIndex(m=>m.id===activeMod.id);
          const modSl=360/N;
          const modSd=modIdx*modSl;
          const subN=activeMod.subs.length;
          const subSl=modSl/subN;
          const sd=modSd+i*subSl, ed=sd+subSl-1.5, md=sd+subSl/2;
          const midPt=pt(CX,CY,(OUTER_R+SUB_R)/2,md);
          const lines=wrapText(s.label,8);
          return(
            <g key={"sub"+i} style={{cursor:"pointer"}}
              onClick={(e)=>{e.stopPropagation();navigate(s.path);setSubOpen(null);}}
            >
              <path
                d={annularArc(CX,CY,SUB_R,OUTER_R+3,sd,ed)}
                fill={activeMod.color+"ee"} stroke={activeMod.color}
                strokeWidth="1" filter="url(#glow)"
                style={{animation:"subFadeIn 0.2s ease"}}
              />
              {lines.map((ln,li)=>(
                <text key={li} x={midPt.x} y={midPt.y+(li*9)-(lines.length>1?4:0)}
                  textAnchor="middle"
                  style={{fontSize:6.5,fontWeight:800,fill:"#fff",pointerEvents:"none",
                    fontFamily:"'Inter',sans-serif",textTransform:"uppercase",letterSpacing:"0.03em"}}>
                  {ln}
                </text>
              ))}
            </g>
          );
        })}

        {/* ── Spokes ── */}
        {mods.map((m,i)=>{
          const sl=360/N, md=i*sl+sl/2;
          const inner=pt(CX,CY,HUB+2,md), outer=pt(CX,CY,INNER_R-2,md);
          const isA=active===m.id||subOpen===m.id;
          return(
            <line key={"sp"+i}
              x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
              stroke={isA?m.color:"#d1d5db"} strokeWidth={isA?2:1}
              strokeDasharray={isA?"":""} style={{transition:"all 0.18s"}}
            />
          );
        })}

        {/* ── Hub ── */}
        <g style={{cursor:"pointer"}}
          onMouseEnter={()=>setHubHov(true)}
          onMouseLeave={()=>setHubHov(false)}
          onClick={()=>{navigate("/dashboard");setSubOpen(null);}}
        >
          {hubHov&&(
            <circle cx={CX} cy={CY} r={HUB+14} fill="none" stroke="#3b82f6"
              strokeWidth="2" opacity="0.4" filter="url(#glow)">
              <animate attributeName="r" values={`${HUB+8};${HUB+16};${HUB+8}`} dur="1.6s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.4;0.1;0.4" dur="1.6s" repeatCount="indefinite"/>
            </circle>
          )}
          <circle cx={CX} cy={CY} r={HUB} fill="url(#hubG)"
            stroke={hubHov?"#60a5fa":"#1e3a5f"} strokeWidth={hubHov?2.5:1.5}
            filter={hubHov?"url(#glow)":undefined}
            style={{transition:"all 0.2s"}}/>
          {logoUrl
            ?<image href={logoUrl} x={CX-20} y={CY-20} width={40} height={40}/>
            :<>
              <rect x={CX-5} y={CY-16} width={10} height={32} rx={3} fill="rgba(255,255,255,0.9)"/>
              <rect x={CX-16} y={CY-5} width={32} height={10} rx={3} fill="rgba(255,255,255,0.9)"/>
            </>
          }
          <text x={CX} y={CY+HUB+13} textAnchor="middle"
            style={{fontSize:8,fontWeight:800,fill:"#1e3a5f",
              fontFamily:"'Inter',sans-serif",letterSpacing:"0.08em",textTransform:"uppercase"}}>
            ERP HUB
          </text>
        </g>

        {/* Sub-menu title label */}
        {activeMod&&(
          <text x={CX} y={18} textAnchor="middle"
            style={{fontSize:10,fontWeight:800,fill:activeMod.color,
              fontFamily:"'Inter',sans-serif",letterSpacing:"0.06em",textTransform:"uppercase"}}>
            {activeMod.icon} {activeMod.label} — SELECT PAGE
          </text>
        )}
      </svg>

      {/* Legend */}
      <div style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center",maxWidth:420}}>
        {mods.map(m=>(
          <div key={m.id} style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer"}}
            onClick={()=>navigate(m.path)}>
            <div style={{width:8,height:8,borderRadius:"50%",background:m.color,flexShrink:0}}/>
            <span style={{fontSize:9,color:"#6b7280",fontWeight:600}}>{m.label}</span>
          </div>
        ))}
      </div>
      <div style={{fontSize:9,color:"#9ca3af",textAlign:"center"}}>
        Click segment → expand submenus · Click GO ring → navigate · Click hub → Dashboard
      </div>

      <style>{`@keyframes subFadeIn{from{opacity:0;transform-origin:${230}px ${230}px;transform:scale(0.85)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}
