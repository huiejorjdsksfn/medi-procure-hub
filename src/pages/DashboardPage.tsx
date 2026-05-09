/**
 * EL5 MediProcure — Dashboard v9.0
 * Heavy role-based ERP Wheel + live KPI bar + module tiles
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { pageCache } from "@/lib/pageCache";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { T } from "@/lib/theme";
import {
  ShoppingCart, Package, DollarSign, Truck, BarChart3,
  Clock, AlertTriangle, Activity, Users, FileText, Bell,
  Phone, MessageSquare, RefreshCw, ChevronRight, Shield,
  Globe, Calendar, Zap, Home, PiggyBank,
  BookOpen, Building2, Layers, Scale, Gavel, Search, Archive,
  Database, Settings, Mail, ClipboardList,
  Receipt, BookMarked, Eye, BarChart2, Boxes,
  HeartPulse, Link, UserCheck
} from "lucide-react";

const db = supabase as any;

interface ModuleTile {
  id: string; label: string; subtitle: string;
  color: string; icon: any; path: string; roles: string[]; badge?: string;
}

const ALL_TILES: ModuleTile[] = [
  { id:"reception",   label:"Reception",         subtitle:"Front desk & visitor log",     color:"#0072c6", icon:Users,          path:"/reception",                   roles:[] },
  { id:"comms",       label:"Communications",    subtitle:"Email, SMS, Telephony",         color:"#0078d4", icon:MessageSquare,  path:"/email",                       roles:[] },
  { id:"inbox",       label:"Inbox",             subtitle:"Internal messages",             color:"#038387", icon:Mail,           path:"/inbox",                       roles:[] },
  { id:"notifs",      label:"Notifications",     subtitle:"System alerts",                 color:"#d83b01", icon:Bell,           path:"/notifications",               roles:[], badge:"notifications" },
  { id:"sms",         label:"SMS",               subtitle:"Twilio bulk messaging",         color:"#0072c6", icon:MessageSquare,  path:"/sms",                         roles:["admin","superadmin","webmaster","procurement_manager","procurement_officer","accountant","inventory_manager","warehouse_officer","requisitioner"] },
  { id:"telephony",   label:"Telephony",         subtitle:"Call log and voice",            color:"#0078d4", icon:Phone,          path:"/telephony",                   roles:["admin","superadmin","webmaster","procurement_manager","procurement_officer","accountant","inventory_manager","warehouse_officer","requisitioner"] },
  { id:"reqs",        label:"Requisitions",      subtitle:"Create and track requests",     color:"#0078d4", icon:ClipboardList,  path:"/requisitions",                roles:["admin","superadmin","webmaster","procurement_manager","procurement_officer","requisitioner","inventory_manager","warehouse_officer"], badge:"requisitions" },
  { id:"pos",         label:"Purchase Orders",   subtitle:"Issue and manage POs",          color:"#106ebe", icon:ShoppingCart,   path:"/purchase-orders",             roles:["admin","superadmin","webmaster","procurement_manager","procurement_officer","accountant"], badge:"purchase_orders" },
  { id:"grn",         label:"Goods Received",    subtitle:"Record and verify deliveries",  color:"#005a9e", icon:Package,        path:"/goods-received",              roles:["admin","superadmin","webmaster","procurement_manager","procurement_officer","warehouse_officer","inventory_manager","accountant"], badge:"goods_received" },
  { id:"suppliers",   label:"Suppliers",         subtitle:"Vendor management",             color:"#004578", icon:Truck,          path:"/suppliers",                   roles:["admin","superadmin","webmaster","procurement_manager","procurement_officer"] },
  { id:"tenders",     label:"Tenders",           subtitle:"Open tenders and bids",         color:"#00188f", icon:Gavel,          path:"/tenders",                     roles:["admin","superadmin","webmaster","procurement_manager","procurement_officer"] },
  { id:"contracts",   label:"Contracts",         subtitle:"Active supplier contracts",     color:"#0078d4", icon:FileText,       path:"/contracts",                   roles:["admin","superadmin","webmaster","procurement_manager"] },
  { id:"bideval",     label:"Bid Evaluations",   subtitle:"Evaluate tender bids",          color:"#106ebe", icon:Scale,          path:"/bid-evaluations",             roles:["admin","superadmin","webmaster","procurement_manager"] },
  { id:"procplan",    label:"Proc. Planning",    subtitle:"Annual procurement plan",       color:"#005a9e", icon:Calendar,       path:"/procurement-planning",        roles:["admin","superadmin","webmaster","procurement_manager"] },
  { id:"finance",     label:"Finance",           subtitle:"Overview and budgets",          color:"#7719aa", icon:DollarSign,     path:"/financials/dashboard",        roles:["admin","superadmin","webmaster","procurement_manager","accountant"] },
  { id:"budgets",     label:"Budgets",           subtitle:"Vote heads and allocations",    color:"#8764b8", icon:PiggyBank,      path:"/financials/budgets",          roles:["admin","superadmin","webmaster","procurement_manager","accountant"] },
  { id:"accounts",    label:"Chart of Accounts", subtitle:"GL accounts and mapping",       color:"#b4009e", icon:BookOpen,       path:"/financials/chart-of-accounts",roles:["admin","superadmin","webmaster","procurement_manager","accountant"] },
  { id:"assets",      label:"Fixed Assets",      subtitle:"Asset register",                color:"#7719aa", icon:Building2,      path:"/financials/fixed-assets",     roles:["admin","superadmin","webmaster","procurement_manager","accountant"] },
  { id:"pvouchers",   label:"Pay Vouchers",      subtitle:"Payment voucher processing",    color:"#d83b01", icon:Receipt,        path:"/vouchers/payment",            roles:["admin","superadmin","webmaster","procurement_manager","procurement_officer","accountant"], badge:"payment_vouchers" },
  { id:"rvouchers",   label:"Receipt Vouchers",  subtitle:"Receipt documentation",         color:"#a4262c", icon:FileText,       path:"/vouchers/receipt",            roles:["admin","superadmin","webmaster","procurement_manager","accountant"] },
  { id:"jvouchers",   label:"Journal Vouchers",  subtitle:"Journal entries",               color:"#7719aa", icon:BookMarked,     path:"/vouchers/journal",            roles:["admin","superadmin","webmaster","procurement_manager","accountant"] },
  { id:"acctws",      label:"Accountant WS",     subtitle:"Workspace and reconciliation",  color:"#5c2d91", icon:BarChart2,      path:"/accountant-workspace",        roles:["admin","superadmin","webmaster","procurement_manager","accountant"] },
  { id:"items",       label:"Items / Stock",     subtitle:"Inventory and stock levels",    color:"#038387", icon:Package,        path:"/items",                       roles:["admin","superadmin","webmaster","procurement_manager","procurement_officer","inventory_manager","warehouse_officer","requisitioner"], badge:"low_stock" },
  { id:"categories",  label:"Categories",        subtitle:"Item classification",           color:"#038387", icon:Layers,         path:"/categories",                  roles:["admin","superadmin","webmaster","procurement_manager","inventory_manager","warehouse_officer"] },
  { id:"departments", label:"Departments",       subtitle:"Hospital departments",          color:"#038387", icon:Building2,      path:"/departments",                 roles:["admin","superadmin","webmaster","procurement_manager"] },
  { id:"scanner",     label:"Barcode Scanner",   subtitle:"QR / barcode lookup",           color:"#005a9e", icon:Search,         path:"/scanner",                     roles:["admin","superadmin","webmaster","procurement_manager","warehouse_officer","inventory_manager"] },
  { id:"quality",     label:"Quality Control",   subtitle:"Inspections and compliance",    color:"#107c10", icon:HeartPulse,     path:"/quality",                     roles:["admin","superadmin","webmaster","procurement_manager","quality_officer"] },
  { id:"reports",     label:"Reports",           subtitle:"Procurement analytics",         color:"#5c2d91", icon:BarChart3,      path:"/reports",                     roles:["admin","superadmin","webmaster","procurement_manager","accountant"] },
  { id:"audit",       label:"Audit Trail",       subtitle:"System activity log",           color:"#5c2d91", icon:Eye,            path:"/audit",                       roles:["admin","superadmin","webmaster"] },
  { id:"users",       label:"Users",             subtitle:"User management",               color:"#d83b01", icon:UserCheck,      path:"/users",                       roles:["admin","superadmin","webmaster"] },
  { id:"settings",    label:"Settings",          subtitle:"System configuration",          color:"#8a8886", icon:Settings,       path:"/settings",                    roles:["admin","superadmin","webmaster"] },
  { id:"adminpanel",  label:"Admin Panel",       subtitle:"Full admin controls",           color:"#a4262c", icon:Settings,       path:"/admin/panel",                 roles:["admin","superadmin","webmaster"] },
  { id:"database",    label:"Database",          subtitle:"DBGate browser and SQL",        color:"#00188f", icon:Database,       path:"/admin/database",              roles:["admin","superadmin","webmaster","database_admin"] },
  { id:"dbmonitor",   label:"DB Monitor",        subtitle:"Connection and health tests",   color:"#038387", icon:Activity,       path:"/admin/db-test",               roles:["admin","superadmin","webmaster","database_admin"] },
  { id:"backup",      label:"Backup",            subtitle:"Data backup and restore",       color:"#005a9e", icon:Archive,        path:"/backup",                      roles:["admin","superadmin","database_admin"] },
  { id:"webmaster",   label:"Webmaster",         subtitle:"Module and system controls",    color:"#d83b01", icon:Globe,          path:"/webmaster",                   roles:["admin","superadmin","webmaster"] },
];

const WHEEL_SEGS = [
  { id:"finance",   label:"Finance &\nAccounting", emoji:"💰", color:"#0e7490", hover:"#0c6380", path:"/financials/dashboard", roles:["admin","superadmin","webmaster","accountant","procurement_manager"] },
  { id:"hr",        label:"Human\nResources",      emoji:"👥", color:"#ea580c", hover:"#c2410c", path:"/users",                roles:["admin","superadmin","webmaster"] },
  { id:"access",    label:"Access\nControl",       emoji:"🔐", color:"#7c3aed", hover:"#6d28d9", path:"/admin/panel",          roles:["admin","superadmin","webmaster"] },
  { id:"projects",  label:"Project\nManagement",   emoji:"📋", color:"#0d9488", hover:"#0f766e", path:"/procurement-planning", roles:["admin","superadmin","webmaster","procurement_manager"] },
  { id:"crm",       label:"Customer\nRelation",    emoji:"🔗", color:"#0891b2", hover:"#0e7490", path:"/suppliers",            roles:["admin","superadmin","webmaster","procurement_manager","procurement_officer"] },
  { id:"data",      label:"Data\nServices",        emoji:"📊", color:"#059669", hover:"#047857", path:"/reports",             roles:["admin","superadmin","webmaster","procurement_manager","accountant"] },
  { id:"inventory", label:"Inventory\nMgmt",       emoji:"📦", color:"#dc2626", hover:"#b91c1c", path:"/items",               roles:[] },
  { id:"purchasing",label:"Purchasing",             emoji:"🛒", color:"#9333ea", hover:"#7c3aed", path:"/purchase-orders",     roles:["admin","superadmin","webmaster","procurement_manager","procurement_officer","accountant"] },
];

function ERPWheel({ userRoles, isAdmin, onNav }: { userRoles: string[]; isAdmin: boolean; onNav: (p:string)=>void }) {
  const [hov, setHov] = useState<string|null>(null);
  const [rot, setRot] = useState(0);
  const [spin, setSpin] = useState(false);
  const N = WHEEL_SEGS.length;
  const SIZE = 300, CX = 150, CY = 150, OR = 132, IR = 50;

  const canAccess = (seg: typeof WHEEL_SEGS[0]) =>
    !seg.roles.length || isAdmin || seg.roles.some(r => userRoles?.includes(r));

  const arcPath = (i: number) => {
    const a0 = (i/N)*2*Math.PI - Math.PI/2;
    const a1 = ((i+1)/N)*2*Math.PI - Math.PI/2;
    const cos0=Math.cos(a0), sin0=Math.sin(a0), cos1=Math.cos(a1), sin1=Math.sin(a1);
    return [
      `M ${(CX+OR*cos0).toFixed(2)} ${(CY+OR*sin0).toFixed(2)}`,
      `A ${OR} ${OR} 0 0 1 ${(CX+OR*cos1).toFixed(2)} ${(CY+OR*sin1).toFixed(2)}`,
      `L ${(CX+IR*cos1).toFixed(2)} ${(CY+IR*sin1).toFixed(2)}`,
      `A ${IR} ${IR} 0 0 0 ${(CX+IR*cos0).toFixed(2)} ${(CY+IR*sin0).toFixed(2)}`,
      "Z"
    ].join(" ");
  };

  const mid = (i: number) => {
    const a = ((i+0.5)/N)*2*Math.PI - Math.PI/2;
    const r = (OR+IR)/2;
    return { x: CX+r*Math.cos(a), y: CY+r*Math.sin(a), deg: a*180/Math.PI };
  };

  const outerPos = (i: number) => {
    const a = ((i+0.5)/N)*2*Math.PI - Math.PI/2;
    return { x: CX+(OR+18)*Math.cos(a), y: CY+(OR+18)*Math.sin(a) };
  };

  const doSpin = () => { setSpin(true); setRot(r=>r+360); setTimeout(()=>setSpin(false),700); };

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
      <div style={{position:"relative",width:SIZE+80,height:SIZE+80}}>
        {/* glow */}
        <div style={{position:"absolute",inset:20,borderRadius:"50%",
          background:"conic-gradient(from 0deg,#0e7490,#ea580c,#7c3aed,#0d9488,#0891b2,#059669,#dc2626,#9333ea,#0e7490)",
          filter:"blur(20px)",opacity:0.3,zIndex:0}}/>
        <svg width={SIZE+80} height={SIZE+80} viewBox="-40 -40 380 380" style={{position:"relative",zIndex:1}}>
          <defs>
            <radialGradient id="cg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1e3a5f"/>
              <stop offset="100%" stopColor="#0a1628"/>
            </radialGradient>
            <filter id="ds"><feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.3"/></filter>
          </defs>

          {/* outer ring decoration */}
          <circle cx={CX} cy={CY} r={OR+8} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="16"/>
          <circle cx={CX} cy={CY} r={OR+2} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5"/>

          {/* rotating wheel */}
          <g style={{
            transformOrigin:`${CX}px ${CY}px`,
            transform:`rotate(${rot}deg)`,
            transition:spin?"transform 0.7s cubic-bezier(0.34,1.56,0.64,1)":"none"
          }}>
            {WHEEL_SEGS.map((seg,i)=>{
              const accessible = canAccess(seg);
              const isHov = hov===seg.id;
              const mp = mid(i);
              const a0 = (i/N)*2*Math.PI-Math.PI/2;
              const a1 = ((i+1)/N)*2*Math.PI-Math.PI/2;
              const pushX = isHov?(Math.cos((a0+a1)/2)*5).toFixed(1):"0";
              const pushY = isHov?(Math.sin((a0+a1)/2)*5).toFixed(1):"0";
              return (
                <g key={seg.id} filter="url(#ds)"
                  onClick={()=>accessible&&onNav(seg.path)}
                  onMouseEnter={()=>accessible&&setHov(seg.id)}
                  onMouseLeave={()=>setHov(null)}
                  style={{cursor:accessible?"pointer":"not-allowed"}}
                >
                  <path d={arcPath(i)} fill={isHov?seg.hover:seg.color}
                    opacity={accessible?1:0.3}
                    transform={isHov?`translate(${pushX},${pushY})`:""}
                    style={{transition:"fill 0.15s, opacity 0.15s"}}/>
                  {/* divider lines */}
                  {[0,1].map(j=>{const a=((i+j)/N)*2*Math.PI-Math.PI/2;return(
                    <line key={j}
                      x1={(CX+IR*Math.cos(a)).toFixed(2)} y1={(CY+IR*Math.sin(a)).toFixed(2)}
                      x2={(CX+OR*Math.cos(a)).toFixed(2)} y2={(CY+OR*Math.sin(a)).toFixed(2)}
                      stroke="rgba(255,255,255,0.25)" strokeWidth="1.5"/>
                  );})}
                  {/* label */}
                  <text x={mp.x.toFixed(1)} y={mp.y.toFixed(1)}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize="8" fontWeight="700" fill="rgba(255,255,255,0.9)"
                    fontFamily="'Segoe UI',system-ui,sans-serif"
                    style={{pointerEvents:"none",userSelect:"none"}}
                    transform={`rotate(${mp.deg+90},${mp.x.toFixed(1)},${mp.y.toFixed(1)})`}>
                    {seg.label.split("\n").map((l,li)=>(
                      <tspan key={li} x={mp.x.toFixed(1)} dy={li===0?"-0.4em":"1.15em"}>{l}</tspan>
                    ))}
                  </text>
                </g>
              );
            })}
          </g>

          {/* outer emoji icons (static, outside ring) */}
          {WHEEL_SEGS.map((seg,i)=>{
            const accessible=canAccess(seg);
            const op=outerPos(i);
            const isHov=hov===seg.id;
            return(
              <g key={"oi"+seg.id}
                onClick={()=>accessible&&onNav(seg.path)}
                onMouseEnter={()=>accessible&&setHov(seg.id)}
                onMouseLeave={()=>setHov(null)}
                style={{cursor:accessible?"pointer":"default"}}>
                <circle cx={op.x.toFixed(1)} cy={op.y.toFixed(1)} r={15}
                  fill={isHov?seg.color:"#1e293b"} stroke={seg.color} strokeWidth="2"
                  style={{transition:"fill 0.15s"}}/>
                <text x={op.x.toFixed(1)} y={(op.y+1).toFixed(1)}
                  textAnchor="middle" dominantBaseline="middle" fontSize="12"
                  style={{pointerEvents:"none"}}>{seg.emoji}</text>
              </g>
            );
          })}

          {/* center button */}
          <circle cx={CX} cy={CY} r={IR-2} fill="url(#cg)"
            stroke="rgba(255,255,255,0.18)" strokeWidth="1.5"/>
          <circle cx={CX} cy={CY} r={IR-2} fill="transparent"
            onClick={doSpin} style={{cursor:"pointer"}}/>
          <text x={CX} y={CY-10} textAnchor="middle" fontSize="17" fontWeight="900"
            fill="#fff" fontFamily="'Segoe UI',system-ui,sans-serif" letterSpacing="-0.03em">
            ERP
          </text>
          <text x={CX} y={CY+6} textAnchor="middle" fontSize="5.5" fontWeight="700"
            fill="rgba(255,255,255,0.5)" fontFamily="'Segoe UI',system-ui,sans-serif"
            letterSpacing="0.12em">MEDIPROCORE</text>
          <text x={CX} y={CY+16} textAnchor="middle" fontSize="5" fontWeight="500"
            fill="rgba(255,255,255,0.3)" fontFamily="'Segoe UI',system-ui,sans-serif">
            tap to spin
          </text>
        </svg>
      </div>
      {/* hover label */}
      <div style={{height:44,display:"flex",alignItems:"center",justifyContent:"center"}}>
        {hov ? (()=>{
          const seg=WHEEL_SEGS.find(s=>s.id===hov);
          return seg?(
            <div style={{display:"flex",alignItems:"center",gap:8,
              background:seg.color+"28",border:`1px solid ${seg.color}44`,
              borderRadius:24,padding:"7px 18px",animation:"fadeIn 0.15s ease"}}>
              <span style={{fontSize:14}}>{seg.emoji}</span>
              <span style={{fontSize:13,fontWeight:700,color:seg.color}}>{seg.label.replace("\n"," ")}</span>
              <span style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>→ open</span>
            </div>
          ):null;
        })():(
          <span style={{fontSize:11,color:"rgba(255,255,255,0.35)"}}>
            Tap a segment to navigate · Click centre to spin
          </span>
        )}
      </div>
    </div>
  );
}

function KPICard({label,value,color,icon:Icon,onClick}:{label:string;value:number|string;color:string;icon:any;onClick?:()=>void}) {
  return (
    <div onClick={onClick} style={{background:"#fff",border:"1px solid "+T.border,borderRadius:T.rLg,padding:"12px 14px",cursor:onClick?"pointer":"default",display:"flex",alignItems:"center",gap:10,boxShadow:"0 1px 4px rgba(0,0,0,.05)",transition:"all .15s"}}
      onMouseEnter={e=>{if(onClick){(e.currentTarget as any).style.borderColor=color;(e.currentTarget as any).style.boxShadow="0 2px 12px "+color+"22";}}}
      onMouseLeave={e=>{if(onClick){(e.currentTarget as any).style.borderColor=T.border;(e.currentTarget as any).style.boxShadow="0 1px 4px rgba(0,0,0,.05)";}}}
    >
      <div style={{width:36,height:36,borderRadius:T.rMd,background:color+"14",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        <Icon size={17} color={color}/>
      </div>
      <div style={{minWidth:0}}>
        <div style={{fontSize:20,fontWeight:800,color,lineHeight:1,marginBottom:1}}>{typeof value==="number"?value.toLocaleString():value}</div>
        <div style={{fontSize:10,color:T.fgMuted,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{label}</div>
      </div>
    </div>
  );
}

function Tile({tile,badge,nav}:{tile:ModuleTile;badge:number;nav:(p:string)=>void}) {
  const [hov,setHov]=useState(false);
  const Icon=tile.icon;
  return (
    <div onClick={()=>nav(tile.path)} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{background:hov?tile.color:`linear-gradient(140deg,${tile.color}ee 0%,${tile.color}cc 100%)`,borderRadius:T.rXl,padding:"18px 16px",cursor:"pointer",display:"flex",flexDirection:"column",gap:8,position:"relative",overflow:"hidden",minHeight:100,boxShadow:hov?"0 8px 24px "+tile.color+"44":"0 2px 8px "+tile.color+"22",transform:hov?"translateY(-2px)":"none",transition:"all .18s ease"}}>
      <div style={{position:"absolute",bottom:-16,right:-16,width:70,height:70,borderRadius:"50%",background:"rgba(255,255,255,.07)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",top:-24,right:8,width:50,height:50,borderRadius:"50%",background:"rgba(255,255,255,.05)",pointerEvents:"none"}}/>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
        <div style={{width:38,height:38,borderRadius:T.rMd,background:"rgba(255,255,255,.2)",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Icon size={18} color="#fff"/>
        </div>
        {badge>0&&<span style={{minWidth:19,height:19,borderRadius:10,background:"rgba(255,255,255,.9)",color:tile.color,fontSize:10,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 5px"}}>{badge>99?"99+":badge}</span>}
      </div>
      <div>
        <div style={{fontSize:13,fontWeight:700,color:"#fff",lineHeight:1.2,marginBottom:2}}>{tile.label}</div>
        <div style={{fontSize:10,color:"rgba(255,255,255,.7)",lineHeight:1.4}}>{tile.subtitle}</div>
      </div>
      {hov&&<div style={{position:"absolute",bottom:8,right:10}}><ChevronRight size={13} color="rgba(255,255,255,.7)"/></div>}
    </div>
  );
}

function GroupHdr({label,color}:{label:string;color:string}) {
  return (
    <div style={{gridColumn:"1/-1",display:"flex",alignItems:"center",gap:8,marginTop:6}}>
      <div style={{width:4,height:16,borderRadius:2,background:color,flexShrink:0}}/>
      <span style={{fontSize:11,fontWeight:700,color:T.fgMuted,textTransform:"uppercase",letterSpacing:".06em"}}>{label}</span>
      <div style={{flex:1,height:1,background:T.border}}/>
    </div>
  );
}

export default function DashboardPage() {
  const nav=useNavigate();
  const {profile,roles,primaryRole,hasRole}=useAuth();
  const settings=useSystemSettings();
  const isAdmin=hasRole("admin","superadmin","webmaster");
  const [kpi,setKpi]=useState({reqs:0,pos:0,pvs:0,items:0,suppliers:0,grn:0,contracts:0,unread:0,lowStock:0,tenders:0});
  const [loading,setLoading]=useState(false);
  const [clock,setClock]=useState("");
  const [showWheel,setShowWheel]=useState(true);

  const hour=new Date().getHours();
  const greeting=hour<12?"Good morning":hour<17?"Good afternoon":"Good evening";
  const name=profile?.full_name?.split(" ")[0]||"Staff";
  const today=new Date().toLocaleDateString("en-KE",{weekday:"long",day:"numeric",month:"long",year:"numeric",timeZone:"Africa/Nairobi"});

  useEffect(()=>{
    const t=()=>setClock(new Date().toLocaleTimeString("en-KE",{timeZone:"Africa/Nairobi",hour:"2-digit",minute:"2-digit",second:"2-digit"}));
    t();const iv=setInterval(t,1000);return()=>clearInterval(iv);
  },[]);

  const load=useCallback(async()=>{
    setLoading(true);
    try {
      const [r,p,pv,i,s,g,c,n,ls,t2]=await Promise.allSettled([
        db.from("requisitions").select("id",{count:"exact",head:true}).in("status",["submitted","pending"]),
        db.from("purchase_orders").select("id",{count:"exact",head:true}).in("status",["pending","approved"]),
        db.from("payment_vouchers").select("id",{count:"exact",head:true}).in("status",["pending"]),
        db.from("items").select("id",{count:"exact",head:true}),
        db.from("suppliers").select("id",{count:"exact",head:true}).eq("status","active"),
        db.from("goods_received").select("id",{count:"exact",head:true}).eq("status","pending"),
        db.from("contracts").select("id",{count:"exact",head:true}).eq("status","active"),
        db.from("notifications").select("id",{count:"exact",head:true}).eq("is_read",false),
        db.from("items").select("id",{count:"exact",head:true}).lt("current_quantity",5),
        db.from("tenders").select("id",{count:"exact",head:true}).eq("status","open"),
      ]);
      const v=(x:any)=>x.status==="fulfilled"?x.value?.count??0:0;
      const kpiData={reqs:v(r),pos:v(p),pvs:v(pv),items:v(i),suppliers:v(s),grn:v(g),contracts:v(c),unread:v(n),lowStock:v(ls),tenders:v(t2)};
      setKpi(kpiData);pageCache.set("dashboard_kpi",kpiData,2*60*1000);
    } catch(e:any){
      const cached=pageCache.get<any>("dashboard_kpi");if(cached)setKpi(cached);
    } finally{setLoading(false);}
  },[]);

  useEffect(()=>{
    load();
    const iv=setInterval(load,60_000);
    const ch=db.channel("dash9:live")
      .on("postgres_changes",{event:"*",schema:"public",table:"requisitions"},load)
      .on("postgres_changes",{event:"*",schema:"public",table:"notifications"},load)
      .subscribe();
    return()=>{clearInterval(iv);db.removeChannel(ch);};
  },[load]);

  const badgeMap:Record<string,number>={requisitions:kpi.reqs,purchase_orders:kpi.pos,goods_received:kpi.grn,payment_vouchers:kpi.pvs,low_stock:kpi.lowStock,notifications:kpi.unread};
  const canSee=(t:ModuleTile)=>!t.roles.length||isAdmin||t.roles.some(r=>roles?.includes(r));
  const visibleTiles=ALL_TILES.filter(canSee);

  const groups=[
    {id:"comms",       label:"Reception & Communications",color:T.comms||"#0072c6",  ids:["reception","comms","inbox","notifs","sms","telephony"]},
    {id:"procurement", label:"Procurement",               color:T.procurement,        ids:["reqs","pos","grn","suppliers","tenders","contracts","bideval","procplan"]},
    {id:"finance",     label:"Finance & Accounting",      color:T.finance,            ids:["finance","budgets","accounts","assets","pvouchers","rvouchers","jvouchers","acctws"]},
    {id:"inventory",   label:"Inventory & Warehouse",     color:T.inventory,          ids:["items","categories","departments","scanner"]},
    {id:"quality",     label:"Quality Control",           color:T.quality||"#107c10", ids:["quality"]},
    {id:"reports",     label:"Reports & Documents",       color:T.reports||"#5c2d91", ids:["reports","audit"]},
    {id:"admin",       label:"Administration",            color:T.system,             ids:["users","settings","adminpanel","database","dbmonitor","backup","webmaster"]},
  ];

  const sysName=(settings as any)?.get?(settings as any).get("system_name","EL5 MediProcure"):((settings as any)?.settings?.system_name||"EL5 MediProcure");

  const QUICK=[
    {label:"New Requisition",path:"/requisitions",       color:"#0078d4",emoji:"📋"},
    {label:"Purchase Orders",path:"/purchase-orders",    color:"#106ebe",emoji:"🛒"},
    {label:"Goods Received", path:"/goods-received",     color:"#005a9e",emoji:"📦"},
    {label:"Financials",     path:"/financials/dashboard",color:"#7719aa",emoji:"💰"},
    {label:"Send SMS",       path:"/sms",                color:"#0072c6",emoji:"💬"},
    {label:"Reports",        path:"/reports",            color:"#5c2d91",emoji:"📊"},
  ];

  return (
    <div style={{background:T.bg,minHeight:"100%",fontFamily:"'Segoe UI','Inter',system-ui,sans-serif"}}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
      `}</style>

      {/* Header */}
      <div style={{background:"#fff",borderBottom:"1px solid "+T.border,padding:"14px 24px",display:"flex",alignItems:"center",gap:12,boxShadow:"0 1px 3px rgba(0,0,0,.05)"}}>
        <div style={{width:40,height:40,borderRadius:T.r,background:T.primaryBg,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Home size={20} color={T.primary}/>
        </div>
        <div>
          <h1 style={{margin:0,fontSize:18,fontWeight:700,color:T.fg}}>{greeting}, {name}</h1>
          <div style={{fontSize:12,color:T.fgMuted,marginTop:1}}>{sysName} · {today}</div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:10}}>
          <div style={{fontSize:13,fontWeight:700,color:T.fgMuted,fontVariantNumeric:"tabular-nums"}}>{clock}</div>
          <div style={{padding:"3px 10px",borderRadius:T.r,background:T.primaryBg,border:"1px solid "+T.primary+"33",fontSize:11,fontWeight:600,color:T.primary,textTransform:"capitalize"}}>
            {primaryRole?.replace(/_/g," ")||"Staff"}
          </div>
          <button onClick={()=>setShowWheel(w=>!w)}
            style={{padding:"6px 12px",background:showWheel?T.primaryBg:T.bg,border:"1px solid "+(showWheel?T.primary:T.border),borderRadius:T.r,cursor:"pointer",fontSize:11,fontWeight:600,color:showWheel?T.primary:T.fgMuted}}>
            ⊙ ERP Wheel
          </button>
          <button onClick={load} style={{padding:"6px 12px",background:T.bg,border:"1px solid "+T.border,borderRadius:T.r,cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontSize:12,color:T.fgMuted}}>
            <RefreshCw size={12} style={loading?{animation:"spin 1s linear infinite"}:{}}/> Refresh
          </button>
        </div>
      </div>

      <div style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:16}}>

        {/* KPI Bar */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10}}>
          <KPICard label="Pending Reqs"  value={kpi.reqs}      color={T.warning}           icon={Clock}         onClick={()=>nav("/requisitions")}/>
          <KPICard label="Open POs"      value={kpi.pos}       color={T.primary}            icon={ShoppingCart}  onClick={()=>nav("/purchase-orders")}/>
          <KPICard label="Vouchers Due"  value={kpi.pvs}       color={T.finance}            icon={DollarSign}    onClick={()=>nav("/vouchers/payment")}/>
          <KPICard label="Low Stock"     value={kpi.lowStock}  color={T.error}              icon={AlertTriangle} onClick={()=>nav("/items")}/>
          <KPICard label="Pending GRN"   value={kpi.grn}       color={T.inventory}          icon={Package}       onClick={()=>nav("/goods-received")}/>
          <KPICard label="Suppliers"     value={kpi.suppliers} color={T.comms||"#0072c6"}   icon={Truck}         onClick={()=>nav("/suppliers")}/>
          <KPICard label="Open Tenders"  value={kpi.tenders}   color="#5c2d91"              icon={Zap}           onClick={()=>nav("/tenders")}/>
          <KPICard label="Unread Alerts" value={kpi.unread}    color={T.error}              icon={Bell}          onClick={()=>nav("/notifications")}/>
        </div>

        {/* ERP Wheel panel */}
        {showWheel&&(
          <div style={{background:"linear-gradient(135deg,#0a1628 0%,#0f172a 40%,#1a1040 100%)",borderRadius:16,padding:"24px 20px",display:"flex",flexDirection:"column",alignItems:"center",gap:16,boxShadow:"0 4px 32px rgba(0,0,0,0.3)",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(circle at 15% 50%,rgba(14,116,144,0.1) 0%,transparent 55%),radial-gradient(circle at 85% 50%,rgba(124,58,237,0.1) 0%,transparent 55%)",pointerEvents:"none"}}/>
            <div style={{textAlign:"center",position:"relative"}}>
              <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.4)",letterSpacing:"0.2em",textTransform:"uppercase",marginBottom:3}}>
                Enterprise Resource Planning
              </div>
              <div style={{fontSize:19,fontWeight:800,color:"#fff",letterSpacing:"-0.02em"}}>
                EL5 MediProcure ERP System
              </div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginTop:3}}>
                Role: <span style={{color:"rgba(255,255,255,0.7)",fontWeight:600,textTransform:"capitalize"}}>{primaryRole?.replace(/_/g," ")||"Staff"}</span>
              </div>
            </div>

            <ERPWheel userRoles={roles||[]} isAdmin={isAdmin} onNav={nav}/>

            {/* Quick action buttons */}
            <div style={{display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center",position:"relative"}}>
              {QUICK.filter(a=>canSee(ALL_TILES.find(t=>t.path===a.path)||{roles:[],...a} as any)).map(a=>(
                <button key={a.path} onClick={()=>nav(a.path)}
                  style={{display:"flex",alignItems:"center",gap:6,padding:"8px 16px",borderRadius:24,background:a.color+"22",border:`1px solid ${a.color}44`,color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",transition:"all 0.15s"}}
                  onMouseEnter={e=>{(e.currentTarget as any).style.background=a.color+"44";(e.currentTarget as any).style.borderColor=a.color+"88";}}
                  onMouseLeave={e=>{(e.currentTarget as any).style.background=a.color+"22";(e.currentTarget as any).style.borderColor=a.color+"44";}}>
                  <span style={{fontSize:14}}>{a.emoji}</span>{a.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Module tiles */}
        {groups.map(group=>{
          const gTiles=visibleTiles.filter(t=>group.ids.includes(t.id));
          if(!gTiles.length)return null;
          return(
            <div key={group.id} style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:10}}>
              <GroupHdr label={group.label} color={group.color}/>
              {gTiles.map(tile=><Tile key={tile.id} tile={tile} badge={tile.badge?(badgeMap[tile.badge]||0):0} nav={nav}/>)}
            </div>
          );
        })}

        <div style={{textAlign:"center",padding:"12px 0",fontSize:11,color:T.fgDim,borderTop:"1px solid "+T.border,marginTop:4}}>
          EL5 MediProcure ProcurBosse v9.0 · {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}

import type React from "react";
