import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  ShoppingCart, FileText, Package, Truck, Gavel, DollarSign, BarChart3,
  ClipboardList, Shield, RefreshCw, ArrowRight, Plus, Calendar,
  FileCheck, BookMarked, PiggyBank, Building2,
  Home, Search, Mail, Award, Zap, ChevronDown, Receipt, Target,
  ChevronRight, Activity, Database, Wifi, Settings,
} from "lucide-react";
import procBg from "@/assets/procurement-bg.jpg";

const fmtKES = (n: number) =>
  n >= 1_000_000 ? `KES ${(n / 1_000_000).toFixed(1)}M`
  : n >= 1000 ? `KES ${(n / 1000).toFixed(0)}K`
  : `KES ${n.toFixed(0)}`;

const MODULE_TILES = [
  { label:"DASHBOARD",       path:"/dashboard",            icon:Home,          color:"#008B8B", bg:"#004d4d", group:"My Work" },
  { label:"REQUISITIONS",    path:"/requisitions",         icon:ClipboardList, color:"#0078d4", bg:"#003d80", group:"My Work" },
  { label:"PURCHASE ORDERS", path:"/purchase-orders",      icon:ShoppingCart,  color:"#107c10", bg:"#054205", group:"Procurement" },
  { label:"GOODS RECEIVED",  path:"/goods-received",       icon:Package,       color:"#e08000", bg:"#7a4400", group:"Procurement" },
  { label:"SUPPLIERS",       path:"/suppliers",            icon:Truck,         color:"#1F9090", bg:"#0a4f4f", group:"Procurement" },
  { label:"TENDERS",         path:"/tenders",              icon:Gavel,         color:"#8764b8", bg:"#3e1f73", group:"Procurement" },
  { label:"CONTRACTS",       path:"/contracts",            icon:FileCheck,     color:"#00b4b4", bg:"#005a5a", group:"Procurement" },
  { label:"VOUCHERS",        path:"/vouchers/payment",     icon:DollarSign,    color:"#d4a017", bg:"#5c3d00", group:"Finance" },
  { label:"FINANCIALS",      path:"/financials/dashboard", icon:BarChart3,     color:"#4da6ff", bg:"#003366", group:"Finance" },
  { label:"INVENTORY",       path:"/items",                icon:Building2,     color:"#78c950", bg:"#2a5200", group:"Operations" },
  { label:"QUALITY",         path:"/quality/dashboard",    icon:Shield,        color:"#ff8c42", bg:"#6b2800", group:"Operations" },
  { label:"PLANNING",        path:"/procurement-planning", icon:Calendar,      color:"#a78bfa", bg:"#3b2080", group:"Operations" },
  { label:"REPORTS",         path:"/reports",              icon:FileText,      color:"#94a3b8", bg:"#1e293b", group:"Reports" },
  { label:"DOCUMENTS",       path:"/documents",            icon:BookMarked,    color:"#64748b", bg:"#1e293b", group:"Reports" },
  { label:"INBOX",           path:"/inbox",                icon:Mail,          color:"#60a5fa", bg:"#1e3a5f", group:"My Work" },
  { label:"ADMIN",           path:"/admin/panel",          icon:Settings,      color:"#f472b6", bg:"#3d0021", group:"Admin" },
];

const ERP_MID = [
  { label:"Vouchers",  icon:DollarSign, color:"#d4a017", path:"/vouchers/payment" },
  { label:"Suppliers", icon:Truck,      color:"#1F9090", path:"/suppliers" },
  { label:"Quality",   icon:Shield,     color:"#ff8c42", path:"/quality/dashboard" },
  { label:"Tenders",   icon:Gavel,      color:"#8764b8", path:"/tenders" },
  { label:"Contracts", icon:FileCheck,  color:"#00b4b4", path:"/contracts" },
  { label:"Planning",  icon:Calendar,   color:"#a78bfa", path:"/procurement-planning" },
];
const ERP_OUTER = [
  { label:"Analytics & BI",  path:"/reports" },
  { label:"Document Mgmt",   path:"/documents" },
  { label:"Audit Trail",     path:"/audit-log" },
  { label:"Bid Evaluations", path:"/bid-evaluations" },
  { label:"Admin Panel",     path:"/admin/panel" },
  { label:"DB Admin",        path:"/admin/database" },
  { label:"Email System",    path:"/email" },
  { label:"Backup",          path:"/backup" },
];

const STATUS_COLORS: Record<string,{bg:string;text:string}> = {
  pending:  {bg:"rgba(254,243,199,0.9)",text:"#92400e"},
  approved: {bg:"rgba(209,250,229,0.9)",text:"#065f46"},
  rejected: {bg:"rgba(254,226,226,0.9)",text:"#991b1b"},
  draft:    {bg:"rgba(243,244,246,0.9)",text:"#374151"},
  active:   {bg:"rgba(219,234,254,0.9)",text:"#1e40af"},
  sent:     {bg:"rgba(237,233,254,0.9)",text:"#5b21b6"},
  paid:     {bg:"rgba(209,250,229,0.9)",text:"#065f46"},
  open:     {bg:"rgba(254,243,199,0.9)",text:"#92400e"},
  issued:   {bg:"rgba(219,234,254,0.9)",text:"#1e40af"},
  received: {bg:"rgba(209,250,229,0.9)",text:"#065f46"},
};

const QUICK_ACTIONS = [
  { label:"New Requisition",   path:"/requisitions",            icon:ClipboardList, color:"#0078d4" },
  { label:"Create PO",         path:"/purchase-orders",         icon:ShoppingCart,  color:"#107c10" },
  { label:"Record GRN",        path:"/goods-received",          icon:Package,       color:"#e08000" },
  { label:"Add Supplier",      path:"/suppliers",               icon:Truck,         color:"#1F9090" },
  { label:"Payment Voucher",   path:"/vouchers/payment",        icon:DollarSign,    color:"#d4a017" },
  { label:"Receipt Voucher",   path:"/vouchers/receipt",        icon:Receipt,       color:"#10b981" },
  { label:"New Tender",        path:"/tenders",                 icon:Gavel,         color:"#8764b8" },
  { label:"Finance Dashboard", path:"/financials/dashboard",    icon:BarChart3,     color:"#4da6ff" },
  { label:"Quality Dashboard", path:"/quality/dashboard",       icon:Shield,        color:"#ff8c42" },
  { label:"Scan Item",         path:"/scanner",                 icon:Search,        color:"#78c950" },
  { label:"View Reports",      path:"/reports",                 icon:FileText,      color:"#94a3b8" },
  { label:"Inbox",             path:"/inbox",                   icon:Mail,          color:"#60a5fa" },
  { label:"Budgets",           path:"/financials/budgets",      icon:PiggyBank,     color:"#34d399" },
  { label:"Procurement Plan",  path:"/procurement-planning",    icon:Calendar,      color:"#a78bfa" },
  { label:"Bid Evaluations",   path:"/bid-evaluations",         icon:Target,        color:"#f472b6" },
  { label:"Fixed Assets",      path:"/financials/fixed-assets", icon:Building2,     color:"#fb923c" },
  { label:"Database Admin",    path:"/admin/database",          icon:Database,      color:"#c084fc" },
  { label:"ODBC Connections",  path:"/odbc",                    icon:Wifi,          color:"#67e8f9" },
  { label:"Admin Panel",       path:"/admin/panel",             icon:Settings,      color:"#f472b6" },
  { label:"Backup",            path:"/backup",                  icon:Award,         color:"#fbbf24" },
];

/* ── Funnel chart ── */
function FunnelChart({data}:{data:{label:string;value:number;color:string}[]}) {
  const max = Math.max(...data.map(d=>d.value),1);
  return (
    <div style={{width:"100%",padding:"6px 0"}}>
      {data.map((d,i)=>{
        const pct=(d.value/max)*85+15;
        const left=(100-pct)/2;
        return (
          <div key={d.label} style={{position:"relative",marginBottom:3}}>
            <div style={{
              marginLeft:`${left}%`,width:`${pct}%`,height:33,
              background:d.color,borderRadius:i===0?"6px 6px 0 0":i===data.length-1?"0 0 6px 6px":0,
              display:"flex",alignItems:"center",justifyContent:"space-between",
              padding:"0 10px",boxShadow:"0 2px 8px rgba(0,0,0,0.35)",
            }}>
              <span style={{fontSize:9,fontWeight:700,color:"#fff",textTransform:"uppercase",letterSpacing:"0.04em"}}>{d.label}</span>
              <span style={{fontSize:10.5,fontWeight:900,color:"#fff"}}>{fmtKES(d.value)}</span>
            </div>
          </div>
        );
      })}
      <div style={{marginTop:8,display:"flex",flexWrap:"wrap",gap:6,justifyContent:"center"}}>
        {data.map(d=>(
          <div key={d.label} style={{display:"flex",alignItems:"center",gap:3}}>
            <div style={{width:9,height:9,borderRadius:2,background:d.color}}/>
            <span style={{fontSize:8.5,color:"rgba(255,255,255,0.5)"}}>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Horizontal bar chart ── */
function HBarChart({data}:{data:{label:string;value:number;color:string}[]}) {
  const max=Math.max(...data.map(d=>d.value),1);
  return (
    <div style={{width:"100%"}}>
      {data.map((d,i)=>(
        <div key={i} style={{marginBottom:7}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:2}}>
            <span style={{fontSize:9.5,color:"rgba(255,255,255,0.65)",maxWidth:150,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.label}</span>
            <span style={{fontSize:9.5,fontWeight:700,color:d.color}}>{d.value}</span>
          </div>
          <div style={{height:11,borderRadius:4,background:"rgba(255,255,255,0.07)",overflow:"hidden"}}>
            <div style={{height:"100%",width:`${(d.value/max)*100}%`,background:d.color,borderRadius:4,transition:"width 0.6s ease"}}/>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Stacked bar chart ── */
function StackedBarChart({data}:{data:{owner:string;low:number;normal:number;high:number}[]}) {
  const maxVal=Math.max(...data.map(d=>d.low+d.normal+d.high),1);
  return (
    <div style={{display:"flex",alignItems:"flex-end",gap:10,height:100,paddingBottom:4}}>
      {data.map((d,i)=>{
        const segs=[
          {val:d.high,color:"#3b82f6",label:"High"},
          {val:d.normal,color:"#f97316",label:"Normal"},
          {val:d.low,color:"#8b5cf6",label:"Low"},
        ];
        return (
          <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
            <div style={{width:"100%",height:88,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
              {segs.map(seg=>seg.val>0?(
                <div key={seg.label} style={{width:"100%",height:`${(seg.val/maxVal)*88}px`,background:seg.color,borderRadius:2}} title={`${seg.label}: ${seg.val}`}/>
              ):null)}
            </div>
            <span style={{fontSize:7.5,color:"rgba(255,255,255,0.4)",textAlign:"center",lineHeight:1.2,wordBreak:"break-word"}}>{d.owner.split(" ")[0]}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── ERP Wheel (Image 2 style) ── */
function ERPWheelV2({navigate}:{navigate:(p:string)=>void}) {
  const [hovered,setHovered]=useState<string|null>(null);
  const cx=150,cy=150,r_core=44,r_mid=90,r_outer=136;
  return (
    <svg width={300} height={300} style={{overflow:"visible"}}>
      <defs>
        <radialGradient id="cg_core2" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1a4a9b"/>
          <stop offset="100%" stopColor="#050e28"/>
        </radialGradient>
      </defs>
      {ERP_OUTER.map((item,i)=>{
        const total=ERP_OUTER.length,gap=0.04;
        const sA=(i/total)*2*Math.PI-Math.PI/2+gap,eA=((i+1)/total)*2*Math.PI-Math.PI/2-gap;
        const r1=r_mid+5,r2=r_outer;
        const x1=cx+r1*Math.cos(sA),y1=cy+r1*Math.sin(sA);
        const x2=cx+r2*Math.cos(sA),y2=cy+r2*Math.sin(sA);
        const x3=cx+r2*Math.cos(eA),y3=cy+r2*Math.sin(eA);
        const x4=cx+r1*Math.cos(eA),y4=cy+r1*Math.sin(eA);
        const mA=(sA+eA)/2,lx=cx+(r_mid+26)*Math.cos(mA),ly=cy+(r_mid+26)*Math.sin(mA);
        const isHov=hovered===item.label;
        return (
          <g key={item.label} style={{cursor:"pointer"}} onClick={()=>navigate(item.path)} onMouseEnter={()=>setHovered(item.label)} onMouseLeave={()=>setHovered(null)}>
            <path d={`M ${x1} ${y1} L ${x2} ${y2} A ${r2} ${r2} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${r1} ${r1} 0 0 0 ${x1} ${y1}`}
              fill={isHov?"rgba(32,178,170,0.45)":"rgba(0,128,128,0.25)"}
              stroke={isHov?"rgba(32,178,170,0.9)":"rgba(0,200,200,0.2)"}
              strokeWidth={isHov?1.5:0.8} style={{transition:"all 0.2s"}}/>
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
              style={{fontSize:6,fill:isHov?"#fff":"rgba(255,255,255,0.6)",fontWeight:isHov?800:500,pointerEvents:"none",fontFamily:"Segoe UI,sans-serif"}}>
              {item.label}
            </text>
          </g>
        );
      })}
      {ERP_MID.map((item,i)=>{
        const total=ERP_MID.length,angle=(i/total)*2*Math.PI-Math.PI/2;
        const ix=cx+r_mid*Math.cos(angle),iy=cy+r_mid*Math.sin(angle);
        const isHov=hovered===item.label;
        return (
          <g key={item.label} style={{cursor:"pointer"}} onClick={()=>navigate(item.path)} onMouseEnter={()=>setHovered(item.label)} onMouseLeave={()=>setHovered(null)}>
            <line x1={cx+(r_core+4)*Math.cos(angle)} y1={cy+(r_core+4)*Math.sin(angle)} x2={ix-16*Math.cos(angle)} y2={iy-16*Math.sin(angle)} stroke={`${item.color}55`} strokeWidth={1.5} strokeDasharray="3,2"/>
            <circle cx={ix} cy={iy} r={isHov?18:14} fill={isHov?item.color:`${item.color}30`} stroke={item.color} strokeWidth={isHov?2:1} style={{transition:"all 0.2s"}}/>
            <item.icon x={ix-7} y={iy-7} width={14} height={14} color="#fff" style={{pointerEvents:"none"}}/>
            {isHov&&<text x={ix} y={iy+27} textAnchor="middle" style={{fontSize:7,fill:"#fff",fontWeight:700,pointerEvents:"none",fontFamily:"Segoe UI,sans-serif"}}>{item.label}</text>}
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={r_core+8} fill="rgba(5,15,50,0.8)" stroke="rgba(32,178,170,0.2)" strokeWidth={1}/>
      <circle cx={cx} cy={cy} r={r_core} fill="url(#cg_core2)" stroke="rgba(32,178,170,0.6)" strokeWidth={2}/>
      {[{t:"PROCURE",y:-11},{t:"MENT",y:0},{t:"HUB",y:11}].map(({t,y})=>(
        <text key={t} x={cx} y={cy+y} textAnchor="middle" style={{fontSize:7,fill:"#93c5fd",fontWeight:900,letterSpacing:"0.08em",pointerEvents:"none",fontFamily:"Segoe UI,sans-serif"}}>{t}</text>
      ))}
      <circle cx={cx} cy={cy+24} r={8} fill="rgba(32,178,170,0.2)" stroke="rgba(32,178,170,0.7)" strokeWidth={1}/>
      <text x={cx} y={cy+25} textAnchor="middle" dominantBaseline="middle" style={{fontSize:10,fill:"#5eead4",pointerEvents:"none"}}>⚕</text>
    </svg>
  );
}

const glass={background:"rgba(8,20,55,0.82)",backdropFilter:"blur(18px)",WebkitBackdropFilter:"blur(18px)",border:"1px solid rgba(255,255,255,0.11)"} as const;
const glassCard={background:"rgba(10,24,60,0.80)",backdropFilter:"blur(14px)",WebkitBackdropFilter:"blur(14px)",border:"1px solid rgba(255,255,255,0.10)"} as const;

export default function DashboardPage() {
  const {profile,roles}=useAuth();
  const navigate=useNavigate();
  const [recentActivities,setRecentActivities]=useState<any[]>([]);
  const [kpis,setKpis]=useState({reqs:0,pos:0,grns:0,suppliers:0,tenders:0,contracts:0});
  const [funnelData,setFunnelData]=useState<any[]>([]);
  const [deptChartData,setDeptChartData]=useState<any[]>([]);
  const [ownerChartData,setOwnerChartData]=useState<any[]>([]);
  const [hospitalName,setHospitalName]=useState("Embu Level 5 Hospital");
  const [sysName,setSysName]=useState("EL5 MediProcure");
  const [logoUrl,setLogoUrl]=useState<string|null>(null);
  const [loading,setLoading]=useState(true);
  const [hoveredTile,setHoveredTile]=useState<string|null>(null);
  const [hoveredQuick,setHoveredQuick]=useState<string|null>(null);
  const [tileGroup,setTileGroup]=useState("All");
  const [activeTab,setActiveTab]=useState<"reqs"|"pos"|"grns">("reqs");

  const TILE_GROUPS=["All","My Work","Procurement","Finance","Operations","Reports","Admin"];

  const load=useCallback(async()=>{
    setLoading(true);
    try {
      const [cfg,cr,cp,cg,cs,ct,cc,reqsData,posData] = await Promise.all([
        (supabase as any).from("system_settings").select("key,value").in("key",["system_name","hospital_name","system_logo_url"]),
        (supabase as any).from("requisitions").select("id",{count:"exact",head:true}),
        (supabase as any).from("purchase_orders").select("id",{count:"exact",head:true}),
        (supabase as any).from("goods_received").select("id",{count:"exact",head:true}),
        (supabase as any).from("suppliers").select("id",{count:"exact",head:true}),
        (supabase as any).from("tenders").select("id",{count:"exact",head:true}),
        (supabase as any).from("contracts").select("id",{count:"exact",head:true}),
        (supabase as any).from("requisitions").select("status,total_amount,department_name,requested_by_name,requisition_number,created_at").order("created_at",{ascending:false}).limit(100),
        (supabase as any).from("purchase_orders").select("status,total_amount,supplier_name,created_by_name,po_number,created_at").order("created_at",{ascending:false}).limit(100),
      ]);
      const m:any={};(cfg.data||[]).forEach((s:any)=>{if(s.key)m[s.key]=s.value;});
      if(m.system_name) setSysName(m.system_name);
      if(m.hospital_name) setHospitalName(m.hospital_name);
      if(m.system_logo_url) setLogoUrl(m.system_logo_url);
      setKpis({reqs:cr.count||0,pos:cp.count||0,grns:cg.count||0,suppliers:cs.count||0,tenders:ct.count||0,contracts:cc.count||0});

      // Funnel
      const stTotals:Record<string,number>={};
      (reqsData.data||[]).forEach((r:any)=>{const s=r.status||"draft";stTotals[s]=(stTotals[s]||0)+Number(r.total_amount||0);});
      const fColors:Record<string,string>={draft:"#f97316",pending:"#ef4444",approved:"#8b5cf6",issued:"#eab308",received:"#22c55e"};
      const fOrder=["draft","pending","approved","issued","received"];
      setFunnelData(fOrder.filter(s=>(stTotals[s]||0)>0).map(s=>({label:s.charAt(0).toUpperCase()+s.slice(1),value:stTotals[s],color:fColors[s]||"#64748b"})).sort((a,b)=>b.value-a.value));

      // Dept chart
      const dCounts:Record<string,number>={};
      (reqsData.data||[]).forEach((r:any)=>{const d=r.department_name||"General";dCounts[d]=(dCounts[d]||0)+1;});
      const dColors=["#3b82f6","#8b5cf6","#06b6d4","#10b981","#f59e0b","#ef4444","#ec4899","#14b8a6"];
      setDeptChartData(Object.entries(dCounts).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([label,value],i)=>({label,value,color:dColors[i%dColors.length]})));

      // Owner chart
      const oMap:Record<string,{low:number;normal:number;high:number}>={};
      (posData.data||[]).forEach((p:any)=>{
        const o=(p.created_by_name||"Unknown").split(" ")[0];
        if(!oMap[o])oMap[o]={low:0,normal:0,high:0};
        const a=Number(p.total_amount||0);
        if(a<50000)oMap[o].low+=1;else if(a<200000)oMap[o].normal+=1;else oMap[o].high+=1;
      });
      setOwnerChartData(Object.entries(oMap).slice(0,5).map(([owner,v])=>({owner,...v})));

      // Activity table
      const [rr,rp,rg]=await Promise.all([
        (supabase as any).from("requisitions").select("requisition_number,status,total_amount,requested_by_name,department_name,created_at").order("created_at",{ascending:false}).limit(10),
        (supabase as any).from("purchase_orders").select("po_number,status,total_amount,supplier_name,created_by_name,created_at").order("created_at",{ascending:false}).limit(10),
        (supabase as any).from("goods_received").select("grn_number,po_number,received_by_name,status,created_at").order("created_at",{ascending:false}).limit(8),
      ]);
      const merged=[
        ...(rr.data||[]).map((r:any)=>({...r,_type:"Requisition",_ref:r.requisition_number,_owner:r.requested_by_name,_regarding:r.department_name||"Procurement"})),
        ...(rp.data||[]).map((r:any)=>({...r,_type:"Purchase Order",_ref:r.po_number,_owner:r.created_by_name,_regarding:r.supplier_name||"Supplier"})),
        ...(rg.data||[]).map((r:any)=>({...r,_type:"GRN",_ref:r.grn_number,_owner:r.received_by_name,_regarding:r.po_number||"PO"})),
      ].sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime());
      setRecentActivities(merged);
    } catch(e){console.error(e);}
    setLoading(false);
  },[]);

  useEffect(()=>{load();},[load]);

  // Real-time
  useEffect(()=>{
    const ch=(supabase as any).channel("dash-rt")
      .on("postgres_changes",{event:"*",schema:"public",table:"requisitions"},()=>load())
      .on("postgres_changes",{event:"*",schema:"public",table:"purchase_orders"},()=>load())
      .on("postgres_changes",{event:"*",schema:"public",table:"goods_received"},()=>load())
      .subscribe();
    return()=>{(supabase as any).removeChannel(ch);};
  },[load]);

  const primaryRole=roles[0]?.replace(/_/g," ")||"User";
  const visibleTiles=tileGroup==="All"?MODULE_TILES:MODULE_TILES.filter(t=>t.group===tileGroup);
  const kpiItems=[
    {label:"Requisitions",   value:kpis.reqs,      icon:ClipboardList,color:"#0078d4",path:"/requisitions"},
    {label:"Purchase Orders",value:kpis.pos,       icon:ShoppingCart, color:"#107c10",path:"/purchase-orders"},
    {label:"GRNs",           value:kpis.grns,      icon:Package,      color:"#e08000",path:"/goods-received"},
    {label:"Suppliers",      value:kpis.suppliers, icon:Truck,        color:"#1F9090",path:"/suppliers"},
    {label:"Tenders",        value:kpis.tenders,   icon:Gavel,        color:"#8764b8",path:"/tenders"},
    {label:"Contracts",      value:kpis.contracts, icon:FileCheck,    color:"#00b4b4",path:"/contracts"},
  ];
  const tabFilters:Record<string,string>={"reqs":"Requisition","pos":"Purchase Order","grns":"GRN"};
  const tabPaths:Record<string,string>={"reqs":"/requisitions","pos":"/purchase-orders","grns":"/goods-received"};
  const filteredActs=recentActivities.filter(r=>r._type===tabFilters[activeTab]);

  return (
    <div style={{
      fontFamily:"'Segoe UI',system-ui,sans-serif",
      minHeight:"calc(100vh - 57px)",
      backgroundImage:`url(${procBg})`,
      backgroundSize:"cover",
      backgroundPosition:"center",
      backgroundAttachment:"fixed",
      position:"relative",
    }}>
      <div style={{position:"absolute",inset:0,background:"rgba(3,8,24,0.72)",zIndex:0,pointerEvents:"none"}}/>
      <div style={{position:"relative",zIndex:1}}>

        {/* ── TOP MODULE TILE BAR (Image 1 style) ── */}
        <div style={{background:"rgba(3,10,24,0.93)",borderBottom:"1px solid rgba(255,255,255,0.08)",backdropFilter:"blur(12px)"}}>
          <div style={{display:"flex",alignItems:"center",padding:"3px 12px 0",borderBottom:"1px solid rgba(255,255,255,0.05)",overflowX:"auto",scrollbarWidth:"none"}}>
            {TILE_GROUPS.map(g=>(
              <button key={g} onClick={()=>setTileGroup(g)} style={{
                padding:"4px 11px",fontSize:8.5,fontWeight:700,letterSpacing:"0.07em",
                color:tileGroup===g?"#20b2aa":"rgba(255,255,255,0.38)",
                borderBottom:tileGroup===g?"2px solid #20b2aa":"2px solid transparent",
                background:"transparent",border:"none",cursor:"pointer",textTransform:"uppercase",whiteSpace:"nowrap",
              }}>{g}</button>
            ))}
            <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8,paddingRight:8,paddingBottom:3}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:"#22c55e",boxShadow:"0 0 6px #22c55e"}}/>
              <span style={{fontSize:8.5,color:"#86efac",fontWeight:700}}>LIVE</span>
              <span style={{fontSize:8.5,color:"rgba(255,255,255,0.25)"}}>{hospitalName}</span>
            </div>
          </div>
          <div style={{overflowX:"auto",scrollbarWidth:"none"}}>
            <div style={{display:"flex",alignItems:"stretch",minHeight:86}}>
              {visibleTiles.map(tile=>{
                const isHov=hoveredTile===tile.label;
                return (
                  <button key={tile.label} onClick={()=>navigate(tile.path)}
                    onMouseEnter={()=>setHoveredTile(tile.label)} onMouseLeave={()=>setHoveredTile(null)}
                    style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:5,padding:"0 13px",flexShrink:0,minWidth:90,
                      background:isHov?`${tile.bg}ee`:"transparent",
                      borderBottom:`3px solid ${isHov?tile.color:"transparent"}`,
                      borderTop:"3px solid transparent",borderRight:"1px solid rgba(255,255,255,0.05)",cursor:"pointer",transition:"all 0.15s"}}>
                    <div style={{width:36,height:36,borderRadius:8,background:isHov?`${tile.color}50`:`${tile.color}20`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <tile.icon style={{width:17,height:17,color:tile.color}}/>
                    </div>
                    <span style={{fontSize:7.5,fontWeight:800,letterSpacing:"0.07em",color:isHov?"#fff":"rgba(255,255,255,0.60)",textAlign:"center",lineHeight:1.2,whiteSpace:"nowrap"}}>{tile.label}</span>
                    <ChevronDown style={{width:7,height:7,color:isHov?tile.color:"rgba(255,255,255,0.18)"}}/>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── MAIN CONTENT ── */}
        <div style={{padding:"12px 14px",display:"flex",flexDirection:"column",gap:12}}>

          {/* Row 1: Welcome + KPIs */}
          <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"stretch"}}>
            <div style={{...glass,borderRadius:12,padding:"12px 18px",flex:"1 1 240px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                {logoUrl
                  ?<img src={logoUrl} alt="" style={{height:44,objectFit:"contain",borderRadius:8}}/>
                  :<div style={{width:42,height:42,borderRadius:10,background:"rgba(32,178,170,0.15)",border:"1px solid rgba(32,178,170,0.3)",display:"flex",alignItems:"center",justifyContent:"center"}}><Award style={{width:20,height:20,color:"#20b2aa"}}/></div>
                }
                <div>
                  <p style={{color:"#fff",fontWeight:900,fontSize:14,margin:0}}>{hospitalName}</p>
                  <p style={{color:"rgba(255,255,255,0.45)",fontSize:9.5,margin:"2px 0 0"}}>{sysName} · {profile?.full_name||"User"} · {primaryRole}</p>
                  <div style={{marginTop:5,display:"flex",gap:5}}>
                    <span style={{background:"rgba(34,197,94,0.2)",border:"1px solid rgba(34,197,94,0.4)",borderRadius:4,fontSize:8,padding:"1px 6px",color:"#86efac",fontWeight:700}}>🟢 LIVE</span>
                    <span style={{background:"rgba(32,178,170,0.15)",border:"1px solid rgba(32,178,170,0.3)",borderRadius:4,fontSize:8,padding:"1px 6px",color:"#5eead4",fontWeight:600}}>FY {new Date().getFullYear()}/{new Date().getFullYear()+1}</span>
                    <span style={{background:"rgba(96,165,250,0.12)",border:"1px solid rgba(96,165,250,0.25)",borderRadius:4,fontSize:8,padding:"1px 6px",color:"#93c5fd",fontWeight:600}}>⚡ REALTIME</span>
                  </div>
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{color:"#fff",fontWeight:700,fontSize:11}}>{new Date().toLocaleDateString("en-KE",{weekday:"short",month:"long",day:"numeric"})}</div>
                <div style={{color:"rgba(255,255,255,0.35)",fontSize:10,marginTop:2}}>{new Date().getFullYear()}</div>
                <button onClick={load} disabled={loading} style={{marginTop:6,background:"rgba(32,178,170,0.2)",color:"#5eead4",border:"1px solid rgba(32,178,170,0.4)",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
                  <RefreshCw style={{width:10,height:10}} className={loading?"animate-spin":""}/> Refresh
                </button>
              </div>
            </div>
            {kpiItems.map(k=>(
              <button key={k.label} onClick={()=>navigate(k.path)}
                style={{...glass,borderRadius:10,padding:"11px 14px",flex:"0 0 auto",minWidth:88,cursor:"pointer",textAlign:"left"}}
                onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=`${k.color}22`;(e.currentTarget as HTMLElement).style.borderColor=`${k.color}55`;}}
                onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background=glass.background;(e.currentTarget as HTMLElement).style.borderColor="rgba(255,255,255,0.11)";}}>
                <k.icon style={{width:15,height:15,color:k.color,marginBottom:5}}/>
                <div style={{fontSize:22,fontWeight:900,color:"#fff",lineHeight:1}}>{loading?"—":k.value}</div>
                <div style={{fontSize:8.5,color:"rgba(255,255,255,0.45)",fontWeight:600,marginTop:2}}>{k.label}</div>
              </button>
            ))}
          </div>

          {/* Row 2: THREE CHARTS (Image 1 layout) */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
            {/* Funnel */}
            <div style={{...glassCard,borderRadius:12,overflow:"hidden"}}>
              <div style={{padding:"10px 14px 6px",borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
                <div style={{fontSize:12,fontWeight:800,color:"#fff"}}>Pipeline by Procurement Stage</div>
                <div style={{fontSize:9,color:"rgba(255,255,255,0.38)",marginTop:1}}>Open Requisitions</div>
              </div>
              <div style={{padding:"10px 12px"}}>
                {loading?<div style={{height:170,display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(255,255,255,0.25)",fontSize:11}}>Loading…</div>
                  :funnelData.length>0?<FunnelChart data={funnelData}/>
                  :<div style={{height:150,display:"flex",alignItems:"center",justifyContent:"center"}}><button onClick={()=>navigate("/requisitions")} style={{color:"#60a5fa",background:"none",border:"none",cursor:"pointer",fontSize:11}}>Create a requisition →</button></div>}
              </div>
            </div>
            {/* H-Bar */}
            <div style={{...glassCard,borderRadius:12,overflow:"hidden"}}>
              <div style={{padding:"10px 14px 6px",borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
                <div style={{fontSize:12,fontWeight:800,color:"#fff"}}>Requisitions by Department</div>
                <div style={{fontSize:9,color:"rgba(255,255,255,0.38)",marginTop:1}}>Open Requisitions</div>
              </div>
              <div style={{padding:"12px 14px"}}>
                {loading?<div style={{height:150,display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(255,255,255,0.25)",fontSize:11}}>Loading…</div>
                  :deptChartData.length>0?<HBarChart data={deptChartData}/>
                  :<div style={{height:140,display:"flex",alignItems:"center",justifyContent:"center"}}><button onClick={()=>navigate("/departments")} style={{color:"#60a5fa",background:"none",border:"none",cursor:"pointer",fontSize:11}}>Add departments →</button></div>}
              </div>
            </div>
            {/* Stacked bar */}
            <div style={{...glassCard,borderRadius:12,overflow:"hidden"}}>
              <div style={{padding:"10px 14px 6px",borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
                <div style={{fontSize:12,fontWeight:800,color:"#fff"}}>POs by Value Tier Per Creator</div>
                <div style={{fontSize:9,color:"rgba(255,255,255,0.38)",marginTop:1}}>Active Purchase Orders</div>
              </div>
              <div style={{padding:"12px 14px"}}>
                {loading?<div style={{height:120,display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(255,255,255,0.25)",fontSize:11}}>Loading…</div>
                  :ownerChartData.length>0?<StackedBarChart data={ownerChartData}/>
                  :<div style={{height:110,display:"flex",alignItems:"center",justifyContent:"center"}}><button onClick={()=>navigate("/purchase-orders")} style={{color:"#60a5fa",background:"none",border:"none",cursor:"pointer",fontSize:11}}>Create a PO →</button></div>}
                <div style={{display:"flex",gap:8,justifyContent:"center",marginTop:6}}>
                  {[["Low","#8b5cf6"],["Normal","#f97316"],["High","#3b82f6"]].map(([l,c])=>(
                    <div key={l} style={{display:"flex",alignItems:"center",gap:3}}>
                      <div style={{width:9,height:9,background:c,borderRadius:2}}/>
                      <span style={{fontSize:8.5,color:"rgba(255,255,255,0.45)"}}>{l}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: All Activities table + ERP Wheel */}
          <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
            {/* Activities table */}
            <div style={{...glassCard,borderRadius:12,overflow:"hidden",flex:"1 1 0",minWidth:0}}>
              <div style={{padding:"9px 14px",background:"rgba(5,18,55,0.95)",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <Activity style={{width:13,height:13,color:"#20b2aa"}}/>
                    <span style={{fontSize:12,fontWeight:800,color:"#fff"}}>All Activities</span>
                    <ChevronDown style={{width:11,height:11,color:"rgba(255,255,255,0.3)"}}/>
                  </div>
                  <div style={{display:"flex",gap:0}}>
                    {(["reqs","pos","grns"] as const).map(t=>(
                      <button key={t} onClick={()=>setActiveTab(t)} style={{
                        padding:"3px 9px",fontSize:9.5,fontWeight:600,
                        color:activeTab===t?"#20b2aa":"rgba(255,255,255,0.38)",
                        background:"transparent",border:"none",
                        borderBottom:activeTab===t?"2px solid #20b2aa":"2px solid transparent",cursor:"pointer",
                      }}>{t==="reqs"?"Requisitions":t==="pos"?"Purchase Orders":"GRN"}</button>
                    ))}
                  </div>
                </div>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={load} disabled={loading} style={{background:"rgba(255,255,255,0.07)",color:"#93c5fd",border:"1px solid rgba(255,255,255,0.1)",borderRadius:6,padding:"4px 10px",fontSize:10,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
                    <RefreshCw style={{width:10,height:10}} className={loading?"animate-spin":""}/> Refresh
                  </button>
                  <button onClick={()=>navigate(tabPaths[activeTab])} style={{background:"#0078d4",color:"#fff",border:"none",borderRadius:6,padding:"4px 12px",fontSize:10,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
                    <Plus style={{width:10,height:10}}/> New
                  </button>
                </div>
              </div>
              <div style={{padding:"5px 12px",borderBottom:"1px solid rgba(255,255,255,0.05)",display:"flex",alignItems:"center",gap:6,background:"rgba(5,15,45,0.6)"}}>
                <Search style={{width:11,height:11,color:"rgba(255,255,255,0.3)"}}/>
                <span style={{fontSize:10,color:"rgba(255,255,255,0.22)"}}>Search for records</span>
              </div>
              <table style={{width:"100%",fontSize:12,borderCollapse:"collapse"}}>
                <thead>
                  <tr style={{background:"rgba(8,24,68,0.7)"}}>
                    {["Subject","Regarding","Type","Status","Owner","Amount","Date"].map(col=>(
                      <th key={col} style={{padding:"7px 11px",textAlign:"left",fontWeight:700,color:"rgba(255,255,255,0.42)",fontSize:8.5,borderBottom:"1px solid rgba(255,255,255,0.06)",textTransform:"uppercase",letterSpacing:"0.06em",whiteSpace:"nowrap"}}>{col}</th>
                    ))}
                    <th style={{padding:"7px 11px",borderBottom:"1px solid rgba(255,255,255,0.06)"}}/>
                  </tr>
                </thead>
                <tbody>
                  {loading?([1,2,3,4,5].map(i=>(
                    <tr key={i}><td colSpan={8} style={{padding:"9px 11px"}}><div style={{height:8,borderRadius:3,background:"rgba(255,255,255,0.05)"}}/></td></tr>
                  ))):filteredActs.length===0?(
                    <tr><td colSpan={8} style={{padding:"22px",textAlign:"center",color:"#94a3b8",fontSize:12}}>
                      No records. <button onClick={()=>navigate(tabPaths[activeTab])} style={{color:"#60a5fa",background:"none",border:"none",cursor:"pointer",fontWeight:600}}>Create one →</button>
                    </td></tr>
                  ):(
                    filteredActs.map((row,i)=>{
                      const sc=STATUS_COLORS[row.status]||{bg:"rgba(243,244,246,0.9)",text:"#6b7280"};
                      return (
                        <tr key={i} onClick={()=>navigate(tabPaths[activeTab])}
                          style={{borderBottom:"1px solid rgba(255,255,255,0.04)",background:i%2===0?"rgba(255,255,255,0.012)":"transparent",cursor:"pointer"}}
                          onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="rgba(32,178,170,0.07)"}
                          onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=i%2===0?"rgba(255,255,255,0.012)":"transparent"}>
                          <td style={{padding:"7px 11px",color:"#60a5fa",fontWeight:700,fontSize:11}}>{row._ref||"—"}</td>
                          <td style={{padding:"7px 11px",color:"rgba(255,255,255,0.65)",fontSize:11}}>{row._regarding||"—"}</td>
                          <td style={{padding:"7px 11px",color:"rgba(255,255,255,0.5)",fontSize:10}}>{row._type}</td>
                          <td style={{padding:"7px 11px"}}>
                            <span style={{background:sc.bg,color:sc.text,padding:"2px 7px",borderRadius:4,fontSize:9,fontWeight:600,textTransform:"capitalize"}}>{row.status||"—"}</span>
                          </td>
                          <td style={{padding:"7px 11px",color:"rgba(255,255,255,0.65)",fontSize:11}}>{row._owner||"—"}</td>
                          <td style={{padding:"7px 11px",color:"rgba(255,255,255,0.5)",fontSize:11}}>{row.total_amount?fmtKES(Number(row.total_amount)):"—"}</td>
                          <td style={{padding:"7px 11px",color:"rgba(255,255,255,0.4)",fontSize:10,whiteSpace:"nowrap"}}>{new Date(row.created_at).toLocaleDateString("en-KE",{month:"short",day:"2-digit"})}</td>
                          <td style={{padding:"7px 11px"}}><ChevronRight style={{width:11,height:11,color:"rgba(255,255,255,0.2)"}}/></td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* ERP Wheel */}
            <div style={{...glassCard,borderRadius:12,padding:"14px 10px 10px",width:310,flexShrink:0}}>
              <div style={{fontSize:10,fontWeight:800,color:"rgba(255,255,255,0.55)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6,textAlign:"center"}}>ERP Ecosystem</div>
              <ERPWheelV2 navigate={navigate}/>
              <div style={{marginTop:6,display:"flex",flexWrap:"wrap",justifyContent:"center",gap:4}}>
                {["Analytics & BI","Access Anywhere","Office 365","Outlook"].map(l=>(
                  <span key={l} style={{fontSize:7.5,color:"rgba(255,255,255,0.28)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:3,padding:"1px 5px"}}>{l}</span>
                ))}
              </div>
              <p style={{textAlign:"center",fontSize:8.5,color:"rgba(255,255,255,0.22)",marginTop:5}}>Click any node to navigate</p>
            </div>
          </div>

          {/* Row 4: QUICK ACTIONS TOOLBAR (Image 2 inspired with all navigation links) */}
          <div style={{...glass,borderRadius:12,overflow:"hidden"}}>
            <div style={{padding:"9px 14px",background:"rgba(5,18,55,0.95)",borderBottom:"1px solid rgba(255,255,255,0.07)",display:"flex",alignItems:"center",gap:8}}>
              <Zap style={{width:14,height:14,color:"#fbbf24"}}/>
              <span style={{fontSize:12,fontWeight:800,color:"#fff"}}>Quick Actions</span>
              <span style={{fontSize:10,color:"rgba(255,255,255,0.3)"}}>— one-click navigation to all modules</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",background:"rgba(255,255,255,0.025)"}}>
              {QUICK_ACTIONS.map(action=>{
                const isHov=hoveredQuick===action.label;
                return (
                  <button key={action.label} onClick={()=>navigate(action.path)}
                    onMouseEnter={()=>setHoveredQuick(action.label)} onMouseLeave={()=>setHoveredQuick(null)}
                    style={{display:"flex",alignItems:"center",gap:9,padding:"11px 13px",
                      background:isHov?`${action.color}18`:"transparent",
                      border:"none",borderRight:"1px solid rgba(255,255,255,0.04)",borderBottom:"1px solid rgba(255,255,255,0.04)",
                      cursor:"pointer",textAlign:"left"}}>
                    <div style={{width:30,height:30,borderRadius:7,background:isHov?`${action.color}35`:`${action.color}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,border:`1px solid ${isHov?action.color+"55":"transparent"}`}}>
                      <action.icon style={{width:13,height:13,color:action.color}}/>
                    </div>
                    <span style={{fontSize:10,fontWeight:600,color:isHov?"#fff":"rgba(255,255,255,0.62)",lineHeight:1.3}}>{action.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
