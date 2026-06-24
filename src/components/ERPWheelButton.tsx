/**
 * ProcurBosse v9.7 — ERP Navigation Wheel
 * Mirrors AppLayout MODS exactly · Role-filtered · Submenu ring on click
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { useNavigate } from "react-router-dom";
import { useState, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

// ── Mirrors AppLayout MODS exactly ────────────────────────────────
const WHEEL = [
  {
    id:"procurement", label:"Procurement", color:"#0078d4", icon:"📋",
    path:"/requisitions",
    roles:["admin","superadmin","webmaster","procurement_manager","procurement_officer","requisitioner","inventory_manager","warehouse_officer"],
    subs:[
      {l:"Home",           p:"/dashboard",            roles:[]},
      {l:"Requisitions",   p:"/requisitions",         roles:[]},
      {l:"Purch. Orders",  p:"/purchase-orders",      roles:["admin","superadmin","webmaster","procurement_manager","procurement_officer"]},
      {l:"GRN",            p:"/goods-received",       roles:["admin","superadmin","webmaster","procurement_manager","procurement_officer","warehouse_officer"]},
      {l:"Suppliers",      p:"/suppliers",            roles:["admin","superadmin","webmaster","procurement_manager","procurement_officer"]},
      {l:"Contracts",      p:"/contracts",            roles:["admin","superadmin","webmaster","procurement_manager"]},
      {l:"Tenders",        p:"/tenders",              roles:["admin","superadmin","webmaster","procurement_manager","procurement_officer"]},
      {l:"Bid Evals",      p:"/bid-evaluations",      roles:["admin","superadmin","webmaster","procurement_manager"]},
      {l:"Planning",       p:"/procurement-planning", roles:["admin","superadmin","webmaster","procurement_manager"]},
    ],
  },
  {
    id:"finance", label:"Finance", color:"#7c3aed", icon:"💳",
    path:"/financials/dashboard",
    roles:["admin","superadmin","webmaster","procurement_manager","accountant"],
    subs:[
      {l:"Overview",        p:"/financials/dashboard",         roles:[]},
      {l:"Budgets",         p:"/financials/budgets",           roles:[]},
      {l:"Chart/Accounts",  p:"/financials/chart-of-accounts", roles:[]},
      {l:"Fixed Assets",    p:"/financials/fixed-assets",      roles:[]},
      {l:"Payment Vouchers",p:"/vouchers/payment",             roles:[]},
      {l:"Receipt Vouchers",p:"/vouchers/receipt",             roles:[]},
      {l:"Journal",         p:"/vouchers/journal",             roles:[]},
      {l:"Acct Workspace",  p:"/accountant-workspace",         roles:[]},
    ],
  },
  {
    id:"inventory", label:"Inventory", color:"#059669", icon:"📦",
    path:"/items",
    roles:["admin","superadmin","webmaster","procurement_manager","procurement_officer","inventory_manager","warehouse_officer"],
    subs:[
      {l:"Items / Stock", p:"/items",       roles:[]},
      {l:"Categories",    p:"/categories",  roles:["admin","superadmin","webmaster","inventory_manager"]},
      {l:"Departments",   p:"/departments", roles:["admin","superadmin","webmaster","inventory_manager"]},
      {l:"Scanner",       p:"/scanner",     roles:[]},
    ],
  },
  {
    id:"quality", label:"Quality", color:"#00695C", icon:"🔍",
    path:"/quality/dashboard",
    roles:["admin","superadmin","webmaster","procurement_manager","procurement_officer","inventory_manager"],
    subs:[
      {l:"QC Dashboard",   p:"/quality/dashboard",       roles:[]},
      {l:"Inspections",    p:"/quality/inspections",     roles:[]},
      {l:"Non-Conformance",p:"/quality/non-conformance", roles:[]},
    ],
  },
  {
    id:"reports", label:"Reports & BI", color:"#1F6090", icon:"📊",
    path:"/reports",
    roles:[],
    subs:[
      {l:"Analytics", p:"/reports",   roles:[]},
      {l:"Documents", p:"/documents", roles:[]},
      {l:"Audit Log", p:"/audit-log", roles:["admin","superadmin","webmaster","database_admin"]},
    ],
  },
  {
    id:"comms", label:"Comms", color:"#0891b2", icon:"💬",
    path:"/reception",
    roles:[],
    subs:[
      {l:"Reception", p:"/reception", roles:[]},
      {l:"Email",     p:"/email",     roles:[]},
      {l:"SMS",       p:"/sms",       roles:[]},
      {l:"Telephony", p:"/telephony", roles:[]},
      {l:"WhatsApp",  p:"/whatsapp",  roles:[]},
      {l:"AI Agent",  p:"/ai-agent",  roles:[]},
    ],
  },
  {
    id:"admin", label:"Admin", color:"#374151", icon:"⚙️",
    path:"/admin/panel",
    roles:["admin","superadmin","webmaster","database_admin"],
    subs:[
      {l:"Admin Panel", p:"/admin/panel",    roles:["admin","superadmin","webmaster"]},
      {l:"Users",       p:"/users",          roles:["admin","superadmin","webmaster"]},
      {l:"Settings",    p:"/settings",       roles:["admin","superadmin","webmaster"]},
      {l:"IP Audit",   p:"/admin/users-ip-audit",roles:["admin","superadmin","webmaster"]},
      {l:"Database",    p:"/admin/database", roles:["admin","superadmin","webmaster","database_admin"]},
      {l:"Backup",      p:"/backup",         roles:["admin","superadmin","webmaster"]},
      {l:"Webmaster",   p:"/webmaster",      roles:["admin","superadmin","webmaster"]},
      {l:"Changelog",   p:"/changelog",      roles:[]},
    ],
  },
];

// ── SVG geometry helpers ───────────────────────────────────────────
function arc(cx:number,cy:number,R:number,ir:number,sd:number,ed:number){
  const r=(d:number)=>(d-90)*Math.PI/180;
  const a1x=cx+R*Math.cos(r(sd)), a1y=cy+R*Math.sin(r(sd));
  const a2x=cx+R*Math.cos(r(ed)), a2y=cy+R*Math.sin(r(ed));
  const b1x=cx+ir*Math.cos(r(ed)),b1y=cy+ir*Math.sin(r(ed));
  const b2x=cx+ir*Math.cos(r(sd)),b2y=cy+ir*Math.sin(r(sd));
  const laf=(ed-sd)>180?1:0;
  return `M${a1x},${a1y} A${R},${R} 0 ${laf},1 ${a2x},${a2y} L${b1x},${b1y} A${ir},${ir} 0 ${laf},0 ${b2x},${b2y} Z`;
}
function pt(cx:number,cy:number,r:number,deg:number){
  const a=(deg-90)*Math.PI/180;
  return {x:cx+r*Math.cos(a), y:cy+r*Math.sin(a)};
}
function wrap(s:string,w=9):string[]{
  if(s.length<=w) return [s];
  const words=s.split(" "); const ls:string[]=[]; let cur="";
  for(const w2 of words){
    if((cur+" "+w2).trim().length>w){if(cur)ls.push(cur);cur=w2;}
    else cur=(cur+" "+w2).trim();
  }
  if(cur)ls.push(cur); return ls.slice(0,2);
}

export default function ERPWheelButton({logoUrl}:{logoUrl?:string|null}){
  const nav   = useNavigate();
  const {roles}=useAuth();
  const [hov, setHov] = useState<string|null>(null);
  const [sel, setSel] = useState<string|null>(null);
  const [hub, setHub] = useState(false);

  const can = useCallback((r:string[])=>!r.length||r.some(x=>roles.includes(x)),[roles]);

  const mods = useMemo(()=>
    WHEEL.filter(m=>can(m.roles))
         .map(m=>({...m,subs:m.subs.filter(s=>can(s.roles))}))
  ,[can]);

  const CX=240,CY=240;
  const HUB=52, INN=98, MID=162, OUT=216, SUB=272;
  const N=mods.length, GAP=2.5;
  const active=mods.find(m=>m.id===sel);

  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10,userSelect:"none"}}>
      <svg width={480} height={480} viewBox="0 0 480 480" style={{overflow:"visible"}}>
        <defs>
          <radialGradient id="hg" cx="40%" cy="35%">
            <stop offset="0%" stopColor="#1e40af"/>
            <stop offset="100%" stopColor="#0a1628"/>
          </radialGradient>
          <filter id="g1"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <filter id="g2"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>

        {/* Guide ring */}
        <circle cx={CX} cy={CY} r={OUT+22} fill="none" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 8"/>

        {/* ── Middle segments ── */}
        {mods.map((m,i)=>{
          const sl=360/N, sd=i*sl, ed=sd+sl-GAP, md=sd+sl/2;
          const on=hov===m.id||sel===m.id;
          const R2=on?MID+10:MID;
          const mp=pt(CX,CY,(INN+R2)/2,md);
          const ls=wrap(m.label);
          return(
            <g key={m.id} style={{cursor:"pointer"}}
              onMouseEnter={()=>setHov(m.id)} onMouseLeave={()=>setHov(null)}
              onClick={()=>setSel(sel===m.id?null:m.id)}>
              <path d={arc(CX,CY,R2,INN,sd,ed)}
                fill={on?m.color:m.color+"bb"}
                filter={on?"url(#g1)":undefined}
                style={{transition:"all .15s"}}/>
              <text x={mp.x} y={mp.y-(ls.length>1?10:4)}
                textAnchor="middle" style={{fontSize:14,pointerEvents:"none"}}>{m.icon}</text>
              {ls.map((ln,li)=>(
                <text key={li} x={mp.x} y={mp.y+li*10+(ls.length>1?2:7)}
                  textAnchor="middle"
                  style={{fontSize:7,fontWeight:800,fill:"#fff",pointerEvents:"none",
                    fontFamily:"Inter,sans-serif",textTransform:"uppercase",letterSpacing:".04em"}}>
                  {ln}
                </text>
              ))}
              {/* dot = has subs */}
              {m.subs.length>0&&(
                <circle cx={pt(CX,CY,INN+5,md).x} cy={pt(CX,CY,INN+5,md).y}
                  r={2.5} fill={sel===m.id?"#fff":"rgba(255,255,255,.45)"}/>
              )}
            </g>
          );
        })}

        {/* ── Outer GO ring ── */}
        {mods.map((m,i)=>{
          const sl=360/N, sd=i*sl, ed=sd+sl-GAP, md=sd+sl/2;
          const on=hov===m.id||sel===m.id;
          const mp=pt(CX,CY,(MID+OUT)/2+4,md);
          return(
            <g key={"o"+m.id} style={{cursor:"pointer"}}
              onMouseEnter={()=>setHov(m.id)} onMouseLeave={()=>setHov(null)}
              onClick={()=>nav(m.path)}>
              <path d={arc(CX,CY,OUT,MID+2,sd,ed)}
                fill={on?m.color+"28":m.color+"0d"}
                stroke={on?m.color:"#e2e8f0"} strokeWidth={on?1.5:.5}
                style={{transition:"all .15s"}}/>
              <text x={mp.x} y={mp.y} textAnchor="middle" dominantBaseline="middle"
                style={{fontSize:6.5,fontWeight:800,fill:on?m.color:"#94a3b8",
                  pointerEvents:"none",fontFamily:"Inter,sans-serif",
                  letterSpacing:".08em",textTransform:"uppercase"}}>GO</text>
            </g>
          );
        })}

        {/* ── Sub-menu ring ── */}
        {active&&active.subs.map((s,i)=>{
          const modI=mods.findIndex(m=>m.id===active.id);
          const msl=360/N, msd=modI*msl;
          const subN=active.subs.length, ssl=msl/subN;
          const sd=msd+i*ssl, ed=sd+ssl-1.2, md=sd+ssl/2;
          const mp=pt(CX,CY,(OUT+SUB)/2+2,md);
          const ls=wrap(s.l,8);
          return(
            <g key={"s"+i} style={{cursor:"pointer"}}
              onClick={(e)=>{e.stopPropagation();nav(s.p);setSel(null);}}>
              <path d={arc(CX,CY,SUB,OUT+4,sd,ed)}
                fill={active.color+"ee"} stroke={active.color} strokeWidth="1"
                filter="url(#g1)"
                style={{animation:"sf .18s ease"}}/>
              {ls.map((ln,li)=>(
                <text key={li} x={mp.x} y={mp.y+li*9-(ls.length>1?4:0)}
                  textAnchor="middle"
                  style={{fontSize:6,fontWeight:800,fill:"#fff",pointerEvents:"none",
                    fontFamily:"Inter,sans-serif",textTransform:"uppercase",letterSpacing:".03em"}}>
                  {ln}
                </text>
              ))}
            </g>
          );
        })}

        {/* ── Spokes ── */}
        {mods.map((m,i)=>{
          const sl=360/N, md=i*sl+sl/2, on=hov===m.id||sel===m.id;
          const a=pt(CX,CY,HUB+2,md), b=pt(CX,CY,INN-2,md);
          return(
            <line key={"sp"+i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={on?m.color:"#d1d5db"} strokeWidth={on?1.8:.8}
              style={{transition:"all .15s"}}/>
          );
        })}

        {/* ── Hub ── */}
        <g style={{cursor:"pointer"}}
          onMouseEnter={()=>setHub(true)} onMouseLeave={()=>setHub(false)}
          onClick={()=>{nav("/dashboard");setSel(null);}}>
          {hub&&<circle cx={CX} cy={CY} r={HUB+12} fill="none" stroke="#3b82f6" strokeWidth="2" opacity=".35" filter="url(#g1)">
            <animate attributeName="r" values={`${HUB+8};${HUB+16};${HUB+8}`} dur="1.5s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values=".35;.1;.35" dur="1.5s" repeatCount="indefinite"/>
          </circle>}
          <circle cx={CX} cy={CY} r={HUB} fill="url(#hg)"
            stroke={hub?"#60a5fa":"#1e3a5f"} strokeWidth={hub?2.5:1.5}
            filter={hub?"url(#g1)":undefined} style={{transition:"all .2s"}}/>
          {logoUrl
            ?<image href={logoUrl} x={CX-20} y={CY-20} width={40} height={40}/>
            :<>
              <rect x={CX-5} y={CY-17} width={10} height={34} rx={3} fill="rgba(255,255,255,.9)"/>
              <rect x={CX-17} y={CY-5} width={34} height={10} rx={3} fill="rgba(255,255,255,.9)"/>
            </>
          }
          <text x={CX} y={CY+HUB+13} textAnchor="middle"
            style={{fontSize:7.5,fontWeight:800,fill:"#1e3a5f",
              fontFamily:"Inter,sans-serif",letterSpacing:".08em",textTransform:"uppercase"}}>
            DASHBOARD
          </text>
        </g>

        {/* Active module label */}
        {active&&(
          <text x={CX} y={16} textAnchor="middle"
            style={{fontSize:9.5,fontWeight:800,fill:active.color,
              fontFamily:"Inter,sans-serif",letterSpacing:".06em",textTransform:"uppercase"}}>
            {active.icon} {active.label}
          </text>
        )}
      </svg>

      {/* Legend */}
      <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center",maxWidth:440}}>
        {mods.map(m=>(
          <span key={m.id} onClick={()=>nav(m.path)}
            style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer",padding:"2px 0"}}>
            <span style={{width:7,height:7,borderRadius:"50%",background:m.color,display:"inline-block"}}/>
            <span style={{fontSize:9,color:"#6b7280",fontWeight:600}}>{m.label}</span>
          </span>
        ))}
      </div>
      <div style={{fontSize:9,color:"#9ca3af",textAlign:"center",maxWidth:360}}>
        Click segment → submenus · Click GO ring → navigate · Click hub → Dashboard
      </div>

      <style>{`@keyframes sf{from{opacity:0;transform-origin:${240}px ${240}px;transform:scale(.88)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}
