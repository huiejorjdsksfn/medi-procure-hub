/**
 * ProcurBosse — Dashboard v3.0 (Nuclear Enhanced)
 * Enlarged ERP Wheel · All roles · All 40+ modules · Live KPIs
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, X, LogOut, User, Mail, Bell, Settings, Shield } from "lucide-react";
import procBg from "@/assets/procurement-bg.jpg";
import logoImg from "@/assets/logo.png";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import NotificationPopup from "@/components/NotificationPopup";

/* ── Polar helpers ──────────────────────────────────────────── */
const P = (cx: number, cy: number, r: number, deg: number) => {
  const a = (deg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
};
const arc = (cx: number, cy: number, OR: number, IR: number, s: number, e: number, gap = 4) => {
  const sa = s + gap / 2, ea = e - gap / 2;
  const o1 = P(cx, cy, OR, sa), o2 = P(cx, cy, OR, ea);
  const i1 = P(cx, cy, IR, ea), i2 = P(cx, cy, IR, sa);
  const lg = ea - sa > 180 ? 1 : 0;
  return `M${o1.x},${o1.y} A${OR},${OR} 0 ${lg},1 ${o2.x},${o2.y} L${i1.x},${i1.y} A${IR},${IR} 0 ${lg},0 ${i2.x},${i2.y} Z`;
};

/* ── Role access ── */
const ROLE_ACCESS: Record<string, string[]> = {
  admin:               ["procurement","finance","operations","quality","admin","hr"],
  webmaster:           ["procurement","finance","operations","quality","admin","hr"],
  procurement_manager: ["procurement","finance","operations","quality"],
  procurement_officer: ["procurement","operations"],
  inventory_manager:   ["operations","procurement","quality"],
  warehouse_officer:   ["operations"],
  requisitioner:       ["procurement"],
  database_admin:      ["admin","operations"],
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator", procurement_manager: "Procurement Manager",
  procurement_officer: "Procurement Officer", inventory_manager: "Inventory Manager",
  warehouse_officer: "Warehouse Officer", requisitioner: "Requisitioner",
  webmaster: "Webmaster", database_admin: "Database Admin",
};

type Link = { label: string; path: string; roles?: string[] };
type Seg  = { id: string; label: string; sub: string; g1: string; g2: string; g3: string; glow: string; start: number; end: number; links: Link[] };

/* ── 6-segment wheel (60° each) ── */
const SEGS: Seg[] = [
  {
    id:"procurement", label:"PROCUREMENT", sub:"Orders & Sourcing",
    g1:"#1a6bb5", g2:"#0d4a87", g3:"#5ba0d4", glow:"#3b82f680",
    start:0, end:60,
    links:[
      {label:"Requisitions",        path:"/requisitions",         roles:["admin","procurement_manager","procurement_officer","requisitioner","inventory_manager","warehouse_officer"]},
      {label:"Purchase Orders",     path:"/purchase-orders",      roles:["admin","procurement_manager","procurement_officer"]},
      {label:"Goods Received",      path:"/goods-received",       roles:["admin","procurement_manager","procurement_officer","warehouse_officer"]},
      {label:"Suppliers",           path:"/suppliers",            roles:["admin","procurement_manager","procurement_officer"]},
      {label:"Tenders",             path:"/tenders",              roles:["admin","procurement_manager"]},
      {label:"Contracts",           path:"/contracts",            roles:["admin","procurement_manager"]},
      {label:"Bid Evaluations",     path:"/bid-evaluations",      roles:["admin","procurement_manager"]},
      {label:"Procurement Planning",path:"/procurement-planning",  roles:["admin","procurement_manager"]},
      {label:"Documents",           path:"/documents",            roles:["admin","procurement_manager","procurement_officer","requisitioner"]},
    ],
  },
  {
    id:"finance", label:"FINANCE", sub:"Vouchers & Accounts",
    g1:"#C45911", g2:"#8B3A07", g3:"#E8842A", glow:"#f9731680",
    start:60, end:120,
    links:[
      {label:"Payment Vouchers",    path:"/vouchers/payment",             roles:["admin","procurement_manager","procurement_officer"]},
      {label:"Journal Vouchers",    path:"/vouchers/journal",             roles:["admin","procurement_manager"]},
      {label:"Purchase Vouchers",   path:"/vouchers/purchase",            roles:["admin","procurement_manager","procurement_officer"]},
      {label:"Receipt Vouchers",    path:"/vouchers/receipt",             roles:["admin","procurement_manager"]},
      {label:"Sales Vouchers",      path:"/vouchers/sales",               roles:["admin","procurement_manager"]},
      {label:"Budgets",             path:"/financials/budgets",           roles:["admin","procurement_manager"]},
      {label:"Chart of Accounts",   path:"/financials/chart-of-accounts", roles:["admin","procurement_manager"]},
      {label:"Fixed Assets",        path:"/financials/fixed-assets",      roles:["admin","procurement_manager"]},
      {label:"Bank Accounts",       path:"/financials/banks",             roles:["admin","procurement_manager"]},
    ],
  },
  {
    id:"operations", label:"OPERATIONS", sub:"Inventory & Logistics",
    g1:"#107c10", g2:"#0a5c0a", g3:"#3cb33c", glow:"#22c55e80",
    start:120, end:180,
    links:[
      {label:"Inventory / Items",   path:"/items",                   roles:["admin","inventory_manager","warehouse_officer","procurement_manager","procurement_officer"]},
      {label:"Stock Movements",     path:"/stock-movements",         roles:["admin","inventory_manager","warehouse_officer"]},
      {label:"Categories",          path:"/categories",              roles:["admin","inventory_manager","procurement_manager"]},
      {label:"Departments",         path:"/departments",             roles:["admin","procurement_manager","inventory_manager"]},
      {label:"Barcode Scanner",     path:"/scanner",                 roles:["admin","inventory_manager","warehouse_officer"]},
      {label:"GRN Items",          path:"/goods-received",          roles:["admin","warehouse_officer","inventory_manager"]},
      {label:"Reports",             path:"/reports",                 roles:["admin","procurement_manager","procurement_officer","inventory_manager"]},
      {label:"Documents",           path:"/documents",               roles:["admin","inventory_manager"]},
    ],
  },
  {
    id:"quality", label:"QUALITY", sub:"QC & Compliance",
    g1:"#00695C", g2:"#004D40", g3:"#26A69A", glow:"#10b98180",
    start:180, end:240,
    links:[
      {label:"QC Dashboard",        path:"/quality/dashboard",       roles:["admin","procurement_manager","inventory_manager"]},
      {label:"Inspections",         path:"/quality/inspections",     roles:["admin","procurement_manager","inventory_manager","warehouse_officer"]},
      {label:"Non-Conformance",     path:"/quality/non-conformance", roles:["admin","procurement_manager","inventory_manager"]},
      {label:"Audit Log",           path:"/audit-log",               roles:["admin","procurement_manager"]},
      {label:"Reports",             path:"/reports",                 roles:["admin","procurement_manager","inventory_manager"]},
    ],
  },
  {
    id:"hr", label:"HR & COMMS", sub:"People & Communication",
    g1:"#7c3aed", g2:"#5b21b6", g3:"#a78bfa", glow:"#8b5cf680",
    start:240, end:300,
    links:[
      {label:"Users",               path:"/users",                   roles:["admin"]},
      {label:"Departments",         path:"/departments",             roles:["admin","procurement_manager"]},
      {label:"Email / Inbox",       path:"/email",                   roles:["admin","procurement_manager","procurement_officer","inventory_manager","warehouse_officer","requisitioner"]},
      {label:"Notifications",       path:"/notifications",           roles:["admin","procurement_manager","procurement_officer","inventory_manager","warehouse_officer","requisitioner"]},
      {label:"Profile",             path:"/profile",                 roles:["admin","procurement_manager","procurement_officer","inventory_manager","warehouse_officer","requisitioner"]},
      {label:"Document Editor",     path:"/documents/editor",        roles:["admin","procurement_manager","procurement_officer"]},
    ],
  },
  {
    id:"admin", label:"ADMIN", sub:"System & Database",
    g1:"#374151", g2:"#1f2937", g3:"#9ca3af", glow:"#6b728080",
    start:300, end:360,
    links:[
      {label:"Admin Panel",         path:"/admin/panel",             roles:["admin","webmaster"]},
      {label:"Settings",            path:"/settings",                roles:["admin"]},
      {label:"Database Admin",      path:"/admin/database",          roles:["admin","webmaster","database_admin"]},
      {label:"IP Access Control",   path:"/admin/ip-access",         roles:["admin"]},
      {label:"ODBC / SQL Server",   path:"/odbc",                    roles:["admin","database_admin"]},
      {label:"Webmaster",           path:"/webmaster",               roles:["admin","webmaster"]},
      {label:"Backup",              path:"/backup",                  roles:["admin"]},
      {label:"System Broadcasts",   path:"/admin/panel",             roles:["admin","webmaster"]},
      {label:"Audit Log",           path:"/audit-log",               roles:["admin"]},
    ],
  },
];

const ALL_QUICK = [
  {label:"Requisitions",  path:"/requisitions",    roles:[] as string[]},
  {label:"Purchase Orders",path:"/purchase-orders", roles:["admin","procurement_manager","procurement_officer"]},
  {label:"Payment Vouchers",path:"/vouchers/payment",roles:["admin","procurement_manager","procurement_officer"]},
  {label:"GRN",            path:"/goods-received",  roles:["admin","procurement_manager","procurement_officer","warehouse_officer"]},
  {label:"Reports",        path:"/reports",         roles:["admin","procurement_manager","procurement_officer"]},
  {label:"Mail",           path:"/email",           roles:[] as string[]},
  {label:"Documents",      path:"/documents",       roles:[] as string[]},
  {label:"Users",          path:"/users",           roles:["admin"]},
  {label:"Settings",       path:"/settings",        roles:["admin"]},
];

const CX = 300, CY = 300, OR = 248, IR = 100;

export default function DashboardPage() {
  const nav = useNavigate();
  const { profile, roles, primaryRole, signOut } = useAuth() as any;
  const [active, setActive] = useState<string|null>(null);
  const [hov, setHov] = useState<string|null>(null);
  const [clock, setClock] = useState("");
  const [kpi, setKpi] = useState({reqs:0,pos:0,pendPV:0,lowStock:0,openNCR:0,contracts:0,users:0});
  const [greeting, setGreeting] = useState("");
  const [showNotifs, setShowNotifs] = useState(false);
  const { getSetting } = useSystemSettings();
  const sysName  = getSetting("system_name","EL5 MediProcure");
  const hospital = getSetting("hospital_name","Embu Level 5 Hospital");

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h<12?"Good Morning":h<17?"Good Afternoon":"Good Evening");
    const tick = () => setClock(new Date().toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit",second:"2-digit"}));
    tick(); const iv = setInterval(tick,1000); return ()=>clearInterval(iv);
  },[]);

  const loadKpi = useCallback(async () => {
    try {
      const [r,p,pv,ls,ncr,c,u] = await Promise.all([
        (supabase as any).from("requisitions").select("id",{count:"exact",head:true}).in("status",["pending","submitted"]),
        (supabase as any).from("purchase_orders").select("id",{count:"exact",head:true}).in("status",["draft","sent","pending"]),
        (supabase as any).from("payment_vouchers").select("id",{count:"exact",head:true}).eq("status","pending"),
        (supabase as any).from("items").select("id",{count:"exact",head:true}).lt("quantity_in_stock",10),
        (supabase as any).from("non_conformance").select("id",{count:"exact",head:true}).eq("status","open"),
        (supabase as any).from("contracts").select("id",{count:"exact",head:true}).eq("status","active"),
        (supabase as any).from("profiles").select("id",{count:"exact",head:true}),
      ]);
      setKpi({reqs:r.count||0,pos:p.count||0,pendPV:pv.count||0,lowStock:ls.count||0,openNCR:ncr.count||0,contracts:c.count||0,users:u.count||0});
    } catch {}
  },[]);

  useEffect(() => { loadKpi(); },[loadKpi]);

  useEffect(() => {
    const ch = (supabase as any).channel("dash-kpi").on("postgres_changes",{event:"*",schema:"public",table:"requisitions"},loadKpi).on("postgres_changes",{event:"*",schema:"public",table:"purchase_orders"},loadKpi).on("postgres_changes",{event:"*",schema:"public",table:"payment_vouchers"},loadKpi).on("postgres_changes",{event:"*",schema:"public",table:"items"},loadKpi).subscribe();
    return ()=>(supabase as any).removeChannel(ch);
  },[loadKpi]);

  const accessedSegs = ROLE_ACCESS[primaryRole||"requisitioner"]||["procurement"];
  const segActive = (s:Seg) => accessedSegs.includes(s.id);
  const seg = SEGS.find(s=>s.id===active);
  const openSeg = (id:string) => { if(!segActive(SEGS.find(s=>s.id===id)!)) return; setActive(a=>a===id?null:id); };
  const visLinks = (s:Seg) => s.links.filter(lk=>!lk.roles||!lk.roles.length||(lk.roles as string[]).some(r=>roles?.includes(r)));
  const QUICK = ALL_QUICK.filter(lk=>!lk.roles.length||(lk.roles as string[]).some(r=>roles?.includes(r)));

  const kpiAlerts = [
    kpi.reqs>0&&{label:`${kpi.reqs} Pending Req`,color:"#fbbf24",bg:"rgba(245,158,11,0.18)"},
    kpi.pos>0&&{label:`${kpi.pos} Open POs`,color:"#60a5fa",bg:"rgba(96,165,250,0.18)"},
    kpi.pendPV>0&&{label:`${kpi.pendPV} Pending PV`,color:"#f97316",bg:"rgba(249,115,22,0.18)"},
    kpi.lowStock>0&&{label:`${kpi.lowStock} Low Stock`,color:"#f87171",bg:"rgba(239,68,68,0.18)"},
    kpi.openNCR>0&&{label:`${kpi.openNCR} Open NCR`,color:"#a78bfa",bg:"rgba(139,92,246,0.18)"},
  ].filter(Boolean) as any[];

  return (
    <div style={{position:"fixed",inset:0,overflow:"hidden",fontFamily:"'Segoe UI',system-ui,sans-serif",display:"flex",flexDirection:"column"}}>
      <style>{`
        @keyframes pulse{0%,100%{opacity:0.6;transform:scale(1)}50%{opacity:1;transform:scale(1.04)}}
        @keyframes ringPulse{0%,100%{opacity:0.25}50%{opacity:0.6}}
        @keyframes slideIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes notifIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
        .seg-btn:hover{filter:brightness(1.1)}
        .panel-link:hover{background:rgba(255,255,255,0.1)!important}
      `}</style>

      {/* Background */}
      <div style={{position:"absolute",inset:0,backgroundImage:`url(${procBg})`,backgroundSize:"cover",backgroundPosition:"center",filter:"brightness(0.25)"}} />
      <div style={{position:"absolute",inset:0,background:"linear-gradient(135deg,rgba(4,16,52,0.90) 0%,rgba(0,0,0,0.70) 100%)"}} />
      <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(255,255,255,0.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.018) 1px,transparent 1px)",backgroundSize:"40px 40px"}} />

      {/* ── TOP BAR ── */}
      <div style={{position:"relative",zIndex:100,height:52,flexShrink:0,display:"flex",alignItems:"center",padding:"0 18px",background:"rgba(0,0,0,0.60)",backdropFilter:"blur(14px)",borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,flex:1}}>
          <img src={logoImg} alt="" style={{width:32,height:32,borderRadius:8,objectFit:"contain",background:"rgba(255,255,255,0.08)",padding:3}} />
          <div>
            <div style={{fontSize:12,fontWeight:800,color:"#fff",lineHeight:1}}>{sysName}</div>
            <div style={{fontSize:8,color:"rgba(255,255,255,0.3)",marginTop:2,letterSpacing:"0.05em"}}>{hospital}</div>
          </div>
        </div>

        {/* KPI alert pills */}
        <div style={{display:"flex",gap:5,marginRight:12,flexWrap:"nowrap",overflow:"hidden"}}>
          {kpiAlerts.slice(0,3).map((a,i) => (
            <div key={i} style={{padding:"2px 9px",borderRadius:20,background:a.bg,border:`1px solid ${a.color}44`,fontSize:9,fontWeight:700,color:a.color,whiteSpace:"nowrap"}}>
              {a.label}
            </div>
          ))}
        </div>

        {/* Clock */}
        <div style={{fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.45)",letterSpacing:"0.08em",fontVariantNumeric:"tabular-nums",marginRight:14}}>{clock}</div>

        {/* Role badge */}
        <div style={{padding:"3px 10px",borderRadius:20,background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.1)",fontSize:9,fontWeight:700,color:"rgba(255,255,255,0.55)",marginRight:8}}>
          {ROLE_LABELS[primaryRole||roles?.[0]]||"Staff"}
        </div>

        {/* Top buttons */}
        <div style={{display:"flex",alignItems:"center",gap:2}}>
          {[
            {icon:Mail,   path:"/email",   title:"Mail"},
            {icon:Shield, path:"/admin/panel", title:"Admin", roles:["admin","webmaster"]},
          ].filter(b=>!(b as any).roles||((b as any).roles as string[]).some((r:string)=>roles?.includes(r))).map(b=>(
            <button key={b.path} onClick={()=>nav(b.path)} title={b.title}
              style={{padding:"5px 7px",borderRadius:6,background:"transparent",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",lineHeight:0,display:"flex",alignItems:"center"}}
              onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,0.1)")}
              onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
              <b.icon style={{width:15,height:15}} />
            </button>
          ))}
          {/* Notification bell */}
          <div style={{position:"relative"}}>
            <button onClick={()=>setShowNotifs(p=>!p)} title="Notifications"
              style={{padding:"5px 7px",borderRadius:6,background:showNotifs?"rgba(79,70,229,0.25)":"transparent",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",lineHeight:0,display:"flex",alignItems:"center",position:"relative"}}
              onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,0.1)")}
              onMouseLeave={e=>(e.currentTarget.style.background=showNotifs?"rgba(79,70,229,0.25)":"transparent")}>
              <Bell style={{width:15,height:15}} />
              {kpi.reqs+kpi.pendPV>0&&(
                <span style={{position:"absolute",top:2,right:2,width:7,height:7,borderRadius:"50%",background:"#ef4444",border:"1px solid rgba(0,0,0,0.3)"}} />
              )}
            </button>
            {showNotifs&&(
              <div style={{position:"absolute",top:"calc(100% + 8px)",right:0,zIndex:200,animation:"notifIn 0.2s ease-out"}}>
                <NotificationPopup onClose={()=>setShowNotifs(false)} />
              </div>
            )}
          </div>
          <button onClick={()=>nav("/profile")} title="Profile"
            style={{padding:"5px 7px",borderRadius:6,background:"transparent",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",lineHeight:0}}
            onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,0.1)")}
            onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
            <User style={{width:15,height:15}} />
          </button>
          <button onClick={()=>{signOut();nav("/login");}} title="Sign Out"
            style={{padding:"5px 7px",borderRadius:6,background:"transparent",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",lineHeight:0}}
            onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,0.1)")}
            onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
            <LogOut style={{width:15,height:15}} />
          </button>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={{position:"relative",flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",minHeight:0}}>

          {/* Greeting */}
          {!active&&(
            <div style={{position:"absolute",top:10,left:"50%",transform:"translateX(-50%)",textAlign:"center",pointerEvents:"none",zIndex:10,animation:"slideIn 0.4s ease-out"}}>
              <div style={{fontSize:13,color:"rgba(255,255,255,0.38)",letterSpacing:"0.05em"}}>
                {greeting}, <span style={{color:"rgba(255,255,255,0.78)",fontWeight:700}}>{profile?.full_name?.split(" ")[0]||"Staff"}</span>
              </div>
              <div style={{fontSize:9,color:"rgba(255,255,255,0.18)",marginTop:2,letterSpacing:"0.04em"}}>Click a segment to navigate modules</div>
            </div>
          )}

          {/* ── ENHANCED SVG WHEEL (600×600, OR=248, IR=100) ── */}
          <svg width={600} height={600} viewBox="0 0 600 600"
            style={{filter:"drop-shadow(0 12px 48px rgba(0,0,0,0.7))",overflow:"visible",flexShrink:0}}>
            <defs>
              {SEGS.map(s=>(
                <radialGradient key={s.id} id={`grad-${s.id}`} cx="50%" cy="50%" r="55%" fx="30%" fy="30%">
                  <stop offset="0%" stopColor={s.g3} />
                  <stop offset="50%" stopColor={s.g1} />
                  <stop offset="100%" stopColor={s.g2} />
                </radialGradient>
              ))}
              <radialGradient id="grad-center" cx="40%" cy="35%" r="60%">
                <stop offset="0%" stopColor="#fde68a" />
                <stop offset="45%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#78350f" />
              </radialGradient>
              <filter id="glow2" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="9" result="b"/>
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="b"/>
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>

            {/* Outer halo rings */}
            <circle cx={CX} cy={CY} r={OR+32} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth={24} style={{animation:"ringPulse 3.5s ease-in-out infinite"}} />
            <circle cx={CX} cy={CY} r={OR+32} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1}/>
            <circle cx={CX} cy={CY} r={OR+16} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={1} strokeDasharray="3 4"/>

            {/* KPI tick marks on outer ring */}
            {Array.from({length:60}).map((_,i)=>{
              const deg = i*6;
              const isMajor = i%5===0;
              const p1 = P(CX,CY,OR+34,deg);
              const p2 = P(CX,CY,OR+34+(isMajor?6:3),deg);
              return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={`rgba(255,255,255,${isMajor?0.25:0.1})`} strokeWidth={isMajor?1.5:0.8}/>;
            })}

            {/* Segments */}
            {SEGS.map(s=>{
              const isActive = active===s.id;
              const isHov = hov===s.id;
              const hasAccess = segActive(s);
              const scale = isActive?1.04:isHov&&hasAccess?1.02:1;
              const mid = (s.start+s.end)/2;
              const labelR = (OR+IR)/2+10;
              const lp = P(CX,CY,labelR,mid);
              const subR = labelR-28;
              const sp = P(CX,CY,subR,mid);
              const countR = OR-32;
              const cp = P(CX,CY,countR,mid);

              return (
                <g key={s.id} className="seg-btn"
                  onClick={()=>openSeg(s.id)}
                  onMouseEnter={()=>setHov(s.id)}
                  onMouseLeave={()=>setHov(null)}
                  style={{opacity:hasAccess?1:0.25,cursor:hasAccess?"pointer":"default",transition:"transform 0.25s cubic-bezier(0.4,0,0.2,1)",transform:`scale(${scale})`,transformOrigin:`${CX}px ${CY}px`}}>

                  {/* Active glow halo */}
                  {isActive&&(
                    <path d={arc(CX,CY,OR+8,IR-8,s.start,s.end,2)} fill={s.glow} filter="url(#glow2)"/>
                  )}

                  {/* Main segment fill */}
                  <path d={arc(CX,CY,OR,IR,s.start,s.end)}
                    fill={isActive?s.g3:`url(#grad-${s.id})`}
                    stroke={isActive?"rgba(255,255,255,0.65)":isHov?"rgba(255,255,255,0.3)":"rgba(255,255,255,0.08)"}
                    strokeWidth={isActive?2.5:1}/>

                  {/* Inner highlight band */}
                  <path d={arc(CX,CY,OR,OR-22,s.start,s.end,3)} fill="rgba(255,255,255,0.07)"/>
                  {/* Inner darker band */}
                  <path d={arc(CX,CY,IR+22,IR,s.start,s.end,3)} fill="rgba(0,0,0,0.15)"/>

                  {/* Segment label - split on space */}
                  {s.label.split(" ").map((word,wi,arr)=>(
                    <text key={wi} x={lp.x} y={lp.y+(wi-(arr.length-1)/2)*15}
                      textAnchor="middle" dominantBaseline="central"
                      fill={isActive?"#fff":"rgba(255,255,255,0.92)"}
                      fontSize={12} fontWeight={900} letterSpacing={1.8}
                      style={{pointerEvents:"none",userSelect:"none",textShadow:"0 2px 10px rgba(0,0,0,0.9)",filter:isActive?"drop-shadow(0 0 6px rgba(255,255,255,0.7))":"none"}}>
                      {word}
                    </text>
                  ))}

                  {/* Subtitle */}
                  <text x={sp.x} y={sp.y}
                    textAnchor="middle" dominantBaseline="central"
                    fill={isActive?"rgba(255,255,255,0.85)":"rgba(255,255,255,0.4)"}
                    fontSize={7.5} fontWeight={500} letterSpacing={0.5}
                    style={{pointerEvents:"none",userSelect:"none"}}>
                    {s.sub}
                  </text>

                  {/* Module count badge */}
                  {hasAccess&&(()=>{
                    const cnt = visLinks(s).length;
                    return (
                      <g filter={isActive?"url(#softGlow)":""}>
                        <circle cx={cp.x} cy={cp.y} r={13} fill={isActive?s.g3:s.g2} stroke="rgba(255,255,255,0.3)" strokeWidth={1.5}/>
                        <text x={cp.x} y={cp.y} textAnchor="middle" dominantBaseline="central"
                          fill="#fff" fontSize={9} fontWeight={800} style={{pointerEvents:"none"}}>
                          {cnt}
                        </text>
                      </g>
                    );
                  })()}

                  {/* Active edge dots */}
                  {isActive&&[s.start,s.end].map((deg,di)=>{
                    const tp = P(CX,CY,OR+8,deg);
                    return <circle key={di} cx={tp.x} cy={tp.y} r={5} fill={s.g3} stroke="rgba(255,255,255,0.8)" strokeWidth={1.5}/>;
                  })}
                </g>
              );
            })}

            {/* ── CENTER DISK ── */}
            <circle cx={CX} cy={CY} r={IR+4} fill="rgba(0,0,0,0.55)" stroke="rgba(255,215,0,0.2)" strokeWidth={2.5} style={{animation:"ringPulse 3s ease-in-out infinite"}}/>
            <circle cx={CX} cy={CY} r={IR-2} fill="url(#grad-center)" stroke="rgba(255,255,255,0.25)" strokeWidth={2}/>
            <circle cx={CX} cy={CY} r={IR-20} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={0.8} strokeDasharray="4 3"/>

            {/* Logo in center */}
            <image href={logoImg} x={CX-28} y={CY-42} width={56} height={56} style={{filter:"drop-shadow(0 3px 6px rgba(0,0,0,0.5))"}}/>

            <text x={CX} y={CY+24} textAnchor="middle" fill="rgba(255,255,255,0.92)" fontSize={7} fontWeight={800} letterSpacing={1.5} style={{pointerEvents:"none"}}>
              {sysName.toUpperCase()}
            </text>
            <text x={CX} y={CY+35} textAnchor="middle" fill="rgba(255,255,255,0.38)" fontSize={5.5} letterSpacing={0.8} style={{pointerEvents:"none"}}>
              EMBU LEVEL 5 HOSPITAL
            </text>

            {/* LIVE dot */}
            <circle cx={CX-6} cy={CY+48} r={3.5} fill="#ef4444" style={{animation:"pulse 2s ease-in-out infinite"}}/>
            <text x={CX+4} y={CY+48} dominantBaseline="central" fill="rgba(255,255,255,0.45)" fontSize={7} fontWeight={700} style={{pointerEvents:"none"}}>LIVE</text>

            {/* KPI arcs on outer ring */}
            {kpi.reqs>0&&<path d={arc(CX,CY,OR+28,OR+24,0,Math.min(60,kpi.reqs*8),0)} fill="#fbbf24"/>}
            {kpi.lowStock>0&&<path d={arc(CX,CY,OR+28,OR+24,180,Math.min(240,180+kpi.lowStock*5),0)} fill="#ef4444"/>}
          </svg>

          {/* ── SLIDE-IN PANEL ── */}
          <div style={{position:"absolute",right:0,top:0,bottom:0,width:seg&&active?310:0,background:"rgba(6,14,42,0.96)",backdropFilter:"blur(24px)",borderLeft:"1px solid rgba(255,255,255,0.08)",overflow:"hidden",transition:"width 0.28s cubic-bezier(0.4,0,0.2,1)",zIndex:50}}>
            {seg&&active&&(
              <div style={{width:310,padding:"14px 0",height:"100%",display:"flex",flexDirection:"column"}}>
                <div style={{padding:"0 16px 12px",borderBottom:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div>
                    <div style={{fontSize:9,fontWeight:700,color:"rgba(255,255,255,0.3)",letterSpacing:"0.14em",textTransform:"uppercase"}}>{seg.sub}</div>
                    <div style={{fontSize:16,fontWeight:900,color:"#fff",marginTop:2}}>{seg.label}</div>
                    <div style={{fontSize:9.5,color:"rgba(255,255,255,0.3)",marginTop:3}}>{visLinks(seg).length} accessible modules</div>
                  </div>
                  <button onClick={()=>setActive(null)} style={{padding:7,borderRadius:8,background:"rgba(255,255,255,0.08)",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.6)",lineHeight:0}}>
                    <X style={{width:14,height:14}}/>
                  </button>
                </div>
                <div style={{height:2.5,background:`linear-gradient(90deg,${seg.g1},${seg.g3},transparent)`,opacity:0.7}}/>
                <div style={{flex:1,overflowY:"auto",padding:"6px 8px"}}>
                  {visLinks(seg).map(lk=>(
                    <button key={lk.path} onClick={()=>nav(lk.path)} className="panel-link"
                      style={{width:"100%",display:"flex",alignItems:"center",gap:11,padding:"10px 12px",borderRadius:9,border:"none",background:"transparent",cursor:"pointer",textAlign:"left" as const,marginBottom:3,transition:"background 0.12s"}}>
                      <div style={{width:8,height:8,borderRadius:"50%",background:seg.g3,flexShrink:0,boxShadow:`0 0 6px ${seg.glow}`}}/>
                      <span style={{flex:1,fontSize:12.5,fontWeight:500,color:"rgba(255,255,255,0.84)"}}>{lk.label}</span>
                      <ChevronRight style={{width:12,height:12,color:"rgba(255,255,255,0.25)"}}/>
                    </button>
                  ))}
                </div>
                <div style={{padding:"8px 16px",borderTop:"1px solid rgba(255,255,255,0.05)",fontSize:8.5,color:"rgba(255,255,255,0.18)",textAlign:"center"}}>
                  Role: {ROLE_LABELS[primaryRole]||"Staff"} · {hospital}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── QUICK LINKS BAR ── */}
        <div style={{position:"relative",zIndex:100,height:46,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(14px)",borderTop:"1px solid rgba(255,255,255,0.07)",display:"flex",alignItems:"center",justifyContent:"center",gap:4,paddingBottom:2,flexShrink:0}}>
          {QUICK.map(lk=>(
            <button key={lk.path} onClick={()=>nav(lk.path)}
              style={{padding:"5px 14px",borderRadius:7,border:"1px solid rgba(255,255,255,0.12)",background:"rgba(255,255,255,0.05)",cursor:"pointer",fontSize:"10.5px",fontWeight:600,color:"rgba(255,255,255,0.68)",whiteSpace:"nowrap",transition:"all 0.15s",fontFamily:"inherit"}}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.15)";(e.currentTarget as HTMLElement).style.color="#fff";(e.currentTarget as HTMLElement).style.borderColor="rgba(255,255,255,0.3)";}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.05)";(e.currentTarget as HTMLElement).style.color="rgba(255,255,255,0.68)";(e.currentTarget as HTMLElement).style.borderColor="rgba(255,255,255,0.12)";}}>
              {lk.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
