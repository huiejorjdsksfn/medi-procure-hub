import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { RefreshCw, ShoppingCart, FileText, BarChart3, Package, Shield, Activity, ChevronRight, AlertTriangle, CheckCircle, Clock, TrendingUp, DollarSign, Users, Truck, Database, Inbox } from "lucide-react";

const fmtKES = (n: number) => n >= 1_000_000 ? `KES ${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `KES ${(n/1_000).toFixed(0)}K` : `KES ${(n||0).toLocaleString()}`;
const fmt = (n: number) => (n||0).toLocaleString();

// Dashboard wheel segments matching Image 1 design
const SEGMENTS = [
  { id:"procurement", label:"PROCUREMENT", color:"#1a3a6b", bg:"#1a3a6b", icon:ShoppingCart, path:"/requisitions",
    clip:"polygon(50% 50%, 50% 0%, 100% 0%, 100% 38%)" },
  { id:"vouchers",    label:"VOUCHERS",    color:"#C45911", bg:"#C45911", icon:FileText, path:"/vouchers/payment",
    clip:"polygon(50% 50%, 100% 38%, 100% 100%, 75% 100%)" },
  { id:"financials",  label:"FINANCIALS",  color:"#c0185a", bg:"#c0185a", icon:BarChart3, path:"/financials/dashboard",
    clip:"polygon(50% 50%, 75% 100%, 25% 100%, 0% 80%)" },
  { id:"inventory",   label:"INVENTORY",   color:"#375623", bg:"#375623", icon:Package, path:"/items",
    clip:"polygon(50% 50%, 0% 80%, 0% 0%, 25% 0%)" },
  { id:"quality",     label:"QUALITY",     color:"#00695C", bg:"#00695C", icon:Shield, path:"/quality/dashboard",
    clip:"polygon(50% 50%, 25% 0%, 75% 0%, 100% 38%)" },
  { id:"reports",     label:"REPORTS",     color:"#5C2D91", bg:"#5C2D91", icon:BarChart3, path:"/reports",
    clip:"polygon(50% 50%, 50% 0%, 100% 0%, 100% 38%)" },
];

// SVG pie segments for wheel
const PIE_SEGS = [
  { id:"procurement", label:"PROCUREMENT", color:"#1a3a6b", icon:ShoppingCart, path:"/requisitions",
    d:"M200,200 L200,30 A170,170 0 0,1 377,115 Z" },
  { id:"vouchers",    label:"VOUCHERS",    color:"#C45911", icon:FileText, path:"/vouchers/payment",
    d:"M200,200 L377,115 A170,170 0 0,1 347,362 Z" },
  { id:"financials",  label:"FINANCIALS",  color:"#c0185a", icon:BarChart3, path:"/financials/dashboard",
    d:"M200,200 L347,362 A170,170 0 0,1 100,370 Z" },
  { id:"inventory",   label:"INVENTORY",   color:"#375623", icon:Package, path:"/items",
    d:"M200,200 L100,370 A170,170 0 0,1 23,115 Z" },
  { id:"quality",     label:"QUALITY",     color:"#00695C", icon:Shield, path:"/quality/dashboard",
    d:"M200,200 L23,115 A170,170 0 0,1 200,30 Z" },
];

const PRIORITY_COLORS: Record<string,string> = { high:"#ef4444", medium:"#f59e0b", low:"#10b981" };

export default function DashboardPage() {
  const { profile, roles } = useAuth();
  const navigate = useNavigate();
  const [kpi, setKpi] = useState<any>({});
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [hoveredSeg, setHoveredSeg] = useState<string|null>(null);
  const [sysName, setSysName] = useState("EL5 MediProcure");
  const [hospitalName, setHospitalName] = useState("Embu Level 5 Hospital");
  const [logoUrl, setLogoUrl] = useState<string|null>(null);
  const isAdmin = roles.includes("admin") || roles.includes("procurement_manager");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [reqs,pos,items,supp,pv,rv,ncr,insp,tenders,budgets,grn,log,contracts,inbox] = await Promise.all([
        (supabase as any).from("requisitions").select("id,status,total_amount").order("created_at",{ascending:false}),
        (supabase as any).from("purchase_orders").select("id,status,total_amount").order("created_at",{ascending:false}),
        (supabase as any).from("items").select("id,quantity_in_stock,reorder_level,unit_price"),
        (supabase as any).from("suppliers").select("id,status"),
        (supabase as any).from("payment_vouchers").select("id,amount,status,voucher_date").order("created_at",{ascending:false}),
        (supabase as any).from("receipt_vouchers").select("id,amount,receipt_date").order("created_at",{ascending:false}),
        (supabase as any).from("non_conformance").select("id,status,severity"),
        (supabase as any).from("inspections").select("id,result"),
        (supabase as any).from("tenders").select("id,status,closing_date"),
        (supabase as any).from("budgets").select("id,allocated_amount,spent_amount,status"),
        (supabase as any).from("goods_received").select("id,total_value").order("created_at",{ascending:false}),
        (supabase as any).from("audit_log").select("id,action,module,user_name,created_at").order("created_at",{ascending:false}).limit(12),
        (supabase as any).from("contracts").select("id,status"),
        (supabase as any).from("inbox_items").select("id,status"),
      ]);
      const R=reqs.data||[],P=pos.data||[],I=items.data||[],S=supp.data||[];
      const PV=pv.data||[],RV=rv.data||[],N=ncr.data||[],IN=insp.data||[];
      const T=tenders.data||[],B=budgets.data||[],G=grn.data||[];
      const tm=new Date().toISOString().slice(0,7);
      const lowStock=I.filter((i:any)=>Number(i.quantity_in_stock)<=Number(i.reorder_level||10));
      const invVal=I.reduce((s:number,i:any)=>s+Number(i.unit_price||0)*Number(i.quantity_in_stock||0),0);
      const totBudget=B.reduce((s:number,b:any)=>s+Number(b.allocated_amount||0),0);
      const spentBudget=B.reduce((s:number,b:any)=>s+Number(b.spent_amount||0),0);
      const unread=(inbox.data||[]).filter((i:any)=>i.status==="unread").length;
      setKpi({
        pendingReqs:R.filter((r:any)=>r.status==="pending").length,
        approvedPOs:P.filter((p:any)=>p.status==="approved").length,
        totalPOAmt:P.reduce((s:number,p:any)=>s+Number(p.total_amount||0),0),
        activeSuppliers:S.filter((s:any)=>s.status==="active").length,
        openTenders:T.filter((t:any)=>t.status==="published").length,
        activeContracts:(contracts.data||[]).filter((c:any)=>c.status==="active").length,
        pendingPayments:PV.filter((v:any)=>v.status==="pending").length,
        pendingPayAmt:PV.filter((v:any)=>["pending","approved"].includes(v.status)).reduce((s:number,v:any)=>s+Number(v.amount||0),0),
        paidMTD:PV.filter((v:any)=>v.status==="paid"&&v.voucher_date?.startsWith(tm)).reduce((s:number,v:any)=>s+Number(v.amount||0),0),
        totBudget, spentBudget, budgetPct:totBudget?Math.round(spentBudget/totBudget*100):0,
        totalItems:I.length, lowStock:lowStock.length, invVal,
        openNCRs:N.filter((n:any)=>n.status==="open").length,
        pendingInsp:IN.filter((i:any)=>i.result==="pending").length,
        passRate:IN.length?Math.round(IN.filter((i:any)=>i.result==="pass").length/IN.length*100):100,
        totalReqs:R.length, grnCount:G.length, unreadInbox:unread,
      });
      setRecentActivity(log.data||[]);
      const tasks:any[]=[];
      if(R.filter((r:any)=>r.status==="pending").length>0) tasks.push({type:"REQUISITION",label:"Pending Requisitions",count:R.filter((r:any)=>r.status==="pending").length,path:"/requisitions",priority:"high"});
      if(PV.filter((v:any)=>v.status==="pending").length>0) tasks.push({type:"PAYMENT",label:"Payment Vouchers Pending",count:PV.filter((v:any)=>v.status==="pending").length,path:"/vouchers/payment",priority:"high"});
      if(lowStock.length>0) tasks.push({type:"INVENTORY",label:"Items Below Reorder Level",count:lowStock.length,path:"/items",priority:"medium"});
      if(N.filter((n:any)=>n.status==="open").length>0) tasks.push({type:"QUALITY",label:"Open Non-Conformance Reports",count:N.filter((n:any)=>n.status==="open").length,path:"/quality/non-conformance",priority:"high"});
      if(unread>0) tasks.push({type:"INBOX",label:"Unread Inbox Messages",count:unread,path:"/inbox",priority:"medium"});
      setPendingItems(tasks);
      setLastRefresh(new Date());
    } catch(e){console.error(e);}
    setLoading(false);
  },[]);

  useEffect(()=>{ load(); },[load]);
  useEffect(()=>{
    const tables=["requisitions","purchase_orders","items","payment_vouchers","non_conformance","inspections","budgets","inbox_items"];
    const chs=tables.map(t=>(supabase as any).channel(`dash-${t}`).on("postgres_changes",{event:"*",schema:"public",table:t},()=>load()).subscribe());
    return()=>{ chs.forEach(c=>supabase.removeChannel(c)); };
  },[load]);

  useEffect(()=>{
    (supabase as any).from("system_settings").select("key,value").in("key",["system_name","hospital_name","system_logo_url"])
      .then(({data}:any)=>{
        if(!data) return;
        const m:Record<string,string>={};
        data.forEach((r:any)=>{ if(r.key&&r.value) m[r.key]=r.value; });
        if(m.system_name) setSysName(m.system_name);
        if(m.hospital_name) setHospitalName(m.hospital_name);
        if(m.system_logo_url) setLogoUrl(m.system_logo_url);
      });
  },[]);

  const segKPIs: Record<string,{label:string;val:string|number;sub?:string}[]> = {
    procurement:[
      {label:"Pending Reqs",val:fmt(kpi.pendingReqs||0)},
      {label:"Approved POs",val:fmt(kpi.approvedPOs||0)},
      {label:"Active Contracts",val:fmt(kpi.activeContracts||0)},
      {label:"Open Tenders",val:fmt(kpi.openTenders||0)},
    ],
    vouchers:[
      {label:"Pending Payments",val:fmt(kpi.pendingPayments||0)},
      {label:"Pending Amount",val:fmtKES(kpi.pendingPayAmt||0)},
      {label:"Paid MTD",val:fmtKES(kpi.paidMTD||0)},
    ],
    financials:[
      {label:"Total Budget",val:fmtKES(kpi.totBudget||0)},
      {label:"Spent",val:fmtKES(kpi.spentBudget||0)},
      {label:"Budget Used",val:`${kpi.budgetPct||0}%`},
    ],
    inventory:[
      {label:"Total Items",val:fmt(kpi.totalItems||0)},
      {label:"Low Stock",val:fmt(kpi.lowStock||0)},
      {label:"Inventory Value",val:fmtKES(kpi.invVal||0)},
    ],
    quality:[
      {label:"Open NCRs",val:fmt(kpi.openNCRs||0)},
      {label:"Pending Insp.",val:fmt(kpi.pendingInsp||0)},
      {label:"Pass Rate",val:`${kpi.passRate||100}%`},
    ],
  };

  const greetHour = new Date().getHours();
  const greet = greetHour < 12 ? "Good Morning" : greetHour < 17 ? "Good Afternoon" : "Good Evening";

  return (
    <div className="p-4 space-y-4" style={{fontFamily:"'Segoe UI',system-ui,sans-serif",background:"#f0f2f5",minHeight:"100%"}}>
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{color:"#0a2558"}}>{greet}, {profile?.full_name?.split(" ")[0] || "User"}</h1>
          <p className="text-xs text-gray-500 mt-0.5">{hospitalName} · {new Date().toLocaleDateString("en-KE",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{background:"#1a3a6b",color:"#fff",opacity:loading?0.6:1}}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading?"animate-spin":""}`} />
          {loading?"Refreshing…":"Refresh"}
        </button>
      </div>

      {/* Top KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          {label:"Pending Requisitions",val:kpi.pendingReqs||0,color:"#1a3a6b",icon:ShoppingCart,path:"/requisitions",fmt:"num"},
          {label:"Total PO Value",val:kpi.totalPOAmt||0,color:"#C45911",icon:FileText,path:"/purchase-orders",fmt:"kes"},
          {label:"Payment Pending",val:kpi.pendingPayAmt||0,color:"#c0185a",icon:DollarSign,path:"/vouchers/payment",fmt:"kes"},
          {label:"Inventory Items",val:kpi.totalItems||0,color:"#375623",icon:Package,path:"/items",fmt:"num"},
          {label:"Active Suppliers",val:kpi.activeSuppliers||0,color:"#00695C",icon:Truck,path:"/suppliers",fmt:"num"},
          {label:"Unread Inbox",val:kpi.unreadInbox||0,color:"#5C2D91",icon:Inbox,path:"/inbox",fmt:"num"},
        ].map(k=>(
          <button key={k.label} onClick={()=>navigate(k.path)}
            className="rounded-xl p-3 text-left transition-all hover:scale-105 active:scale-95"
            style={{background:`linear-gradient(135deg,${k.color},${k.color}cc)`,boxShadow:`0 4px 15px ${k.color}44`}}>
            <div className="flex items-center justify-between mb-1.5">
              <k.icon className="w-4 h-4 text-white/80" />
              <ChevronRight className="w-3 h-3 text-white/40" />
            </div>
            <div className="text-xl font-black text-white">
              {loading?"…":k.fmt==="kes"?fmtKES(k.val):fmt(k.val)}
            </div>
            <div className="text-[10px] text-white/70 font-medium mt-0.5 leading-tight">{k.label}</div>
          </button>
        ))}
      </div>

      {/* Main Content: Wheel + Alerts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* WHEEL DASHBOARD (Image 1 style) */}
        <div className="xl:col-span-2">
          <div className="rounded-2xl overflow-hidden" style={{background:"#fff",boxShadow:"0 2px 16px rgba(0,0,0,0.08)"}}>
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-gray-800">System Modules</h2>
                <p className="text-xs text-gray-400 mt-0.5">Click a segment to navigate · Real-time data</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[10px] text-gray-400">Live</span>
              </div>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-0 p-2">
              {/* SVG Wheel */}
              <div className="relative flex-shrink-0">
                <svg viewBox="0 0 400 400" width="300" height="300" style={{cursor:"pointer"}}>
                  <defs>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                      <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                  </defs>
                  {PIE_SEGS.map(seg=>(
                    <g key={seg.id} onClick={()=>navigate(seg.path)}
                      onMouseEnter={()=>setHoveredSeg(seg.id)}
                      onMouseLeave={()=>setHoveredSeg(null)}
                      style={{cursor:"pointer"}}>
                      <path d={seg.d}
                        fill={seg.color}
                        opacity={hoveredSeg===seg.id?1:0.85}
                        stroke="#fff" strokeWidth="4"
                        filter={hoveredSeg===seg.id?"url(#glow)":"none"}
                        transform={hoveredSeg===seg.id?"scale(1.04) translate(-8,-8)":"none"}
                        style={{transition:"all 0.2s ease",transformOrigin:"200px 200px"}}
                      />
                    </g>
                  ))}
                  {/* Center circle */}
                  <circle cx="200" cy="200" r="80" fill="#fff" stroke="#e5e7eb" strokeWidth="2"/>
                  <circle cx="200" cy="200" r="74" fill="linear-gradient(135deg,#f8fafc,#fff)"/>
                  {/* Center content */}
                  <text x="200" y="188" textAnchor="middle" fontSize="13" fontWeight="900" fill="#0a2558" fontFamily="Segoe UI,system-ui">
                    {sysName.split(" ")[0]}
                  </text>
                  <text x="200" y="204" textAnchor="middle" fontSize="9" fontWeight="600" fill="#6b7280" fontFamily="Segoe UI,system-ui">
                    {sysName.split(" ").slice(1).join(" ")}
                  </text>
                  <text x="200" y="218" textAnchor="middle" fontSize="8" fill="#9ca3af" fontFamily="Segoe UI,system-ui">
                    {hospitalName.split(" ").slice(0,3).join(" ")}
                  </text>
                  {/* Segment labels */}
                  {[
                    {id:"procurement",x:270,y:90,label:"PROCUREMENT"},
                    {id:"vouchers",x:340,y:240,label:"VOUCHERS"},
                    {id:"financials",x:220,y:370,label:"FINANCIALS"},
                    {id:"inventory",x:60,y:300,label:"INVENTORY"},
                    {id:"quality",x:80,y:100,label:"QUALITY"},
                  ].map(lb=>(
                    <text key={lb.id} x={lb.x} y={lb.y} textAnchor="middle" fontSize="7.5" fontWeight="800"
                      fill={hoveredSeg===lb.id?"#fff":"rgba(255,255,255,0.9)"}
                      fontFamily="Segoe UI,system-ui" style={{pointerEvents:"none",textTransform:"uppercase",letterSpacing:"0.05em"}}>
                      {lb.label}
                    </text>
                  ))}
                </svg>
              </div>

              {/* Segment KPI panel */}
              <div className="flex-1 p-2 w-full">
                {hoveredSeg && segKPIs[hoveredSeg] ? (
                  <div className="h-full">
                    <div className="font-black text-xs uppercase tracking-widest mb-3 pb-2 border-b"
                      style={{color: PIE_SEGS.find(s=>s.id===hoveredSeg)?.color || "#333"}}>
                      {hoveredSeg} Module
                    </div>
                    <div className="space-y-2">
                      {segKPIs[hoveredSeg].map((k,i)=>(
                        <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-lg"
                          style={{background:`${PIE_SEGS.find(s=>s.id===hoveredSeg)?.color}0d`}}>
                          <span className="text-[11px] text-gray-600">{k.label}</span>
                          <span className="text-sm font-black" style={{color:PIE_SEGS.find(s=>s.id===hoveredSeg)?.color||"#333"}}>{k.val}</span>
                        </div>
                      ))}
                    </div>
                    <button onClick={()=>navigate(PIE_SEGS.find(s=>s.id===hoveredSeg)?.path||"/")}
                      className="mt-3 w-full py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90"
                      style={{background: PIE_SEGS.find(s=>s.id===hoveredSeg)?.color||"#333"}}>
                      Open {hoveredSeg} →
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[11px] text-gray-400 mb-3">Hover a segment for details</p>
                    {PIE_SEGS.map(seg=>(
                      <button key={seg.id} onClick={()=>navigate(seg.path)}
                        className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-left transition-all hover:scale-105"
                        style={{background:`${seg.color}0d`,border:`1px solid ${seg.color}22`}}>
                        <seg.icon className="w-3.5 h-3.5 shrink-0" style={{color:seg.color}} />
                        <span className="text-[11px] font-bold" style={{color:seg.color}}>{seg.label}</span>
                        <ChevronRight className="w-3 h-3 ml-auto" style={{color:seg.color}} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Items */}
        <div className="space-y-4">
          {/* Attention Required */}
          <div className="rounded-2xl overflow-hidden" style={{background:"#fff",boxShadow:"0 2px 16px rgba(0,0,0,0.08)"}}>
            <div className="p-3 border-b border-gray-100">
              <h3 className="text-sm font-black text-gray-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Attention Required
              </h3>
            </div>
            <div className="p-3">
              {pendingItems.length === 0 ? (
                <div className="flex flex-col items-center py-4 text-center">
                  <CheckCircle className="w-8 h-8 text-green-400 mb-2" />
                  <p className="text-xs text-gray-400">All caught up!</p>
                </div>
              ) : pendingItems.map((item,i)=>(
                <button key={i} onClick={()=>navigate(item.path)}
                  className="flex items-center gap-2.5 w-full p-2 rounded-lg mb-1.5 text-left transition-all hover:scale-[1.02]"
                  style={{background:item.priority==="high"?"#fef2f2":item.priority==="medium"?"#fffbeb":"#f0fdf4",
                    border:`1px solid ${item.priority==="high"?"#fecaca":item.priority==="medium"?"#fde68a":"#bbf7d0"}`}}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0"
                    style={{background:PRIORITY_COLORS[item.priority]}}>
                    {item.count}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold text-gray-700 truncate">{item.label}</div>
                    <div className="text-[10px]" style={{color:PRIORITY_COLORS[item.priority]}}>{item.type} · {item.priority} priority</div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Budget snapshot */}
          {isAdmin && (
            <div className="rounded-2xl overflow-hidden" style={{background:"#fff",boxShadow:"0 2px 16px rgba(0,0,0,0.08)"}}>
              <div className="p-3 border-b border-gray-100">
                <h3 className="text-sm font-black text-gray-800 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-500" /> Budget Overview
                </h3>
              </div>
              <div className="p-3 space-y-2">
                <div className="flex justify-between text-[11px] text-gray-500">
                  <span>Budget Utilization</span>
                  <span className="font-bold" style={{color:kpi.budgetPct>80?"#ef4444":kpi.budgetPct>60?"#f59e0b":"#10b981"}}>{kpi.budgetPct||0}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{width:`${Math.min(kpi.budgetPct||0,100)}%`,background:kpi.budgetPct>80?"#ef4444":kpi.budgetPct>60?"#f59e0b":"#1a3a6b"}} />
                </div>
                <div className="grid grid-cols-2 gap-1.5 mt-2">
                  <div className="p-2 rounded-lg" style={{background:"#f0f7ff"}}>
                    <div className="text-[10px] text-gray-500">Allocated</div>
                    <div className="text-xs font-black text-blue-800">{fmtKES(kpi.totBudget||0)}</div>
                  </div>
                  <div className="p-2 rounded-lg" style={{background:"#fff5f5"}}>
                    <div className="text-[10px] text-gray-500">Spent</div>
                    <div className="text-xs font-black text-red-700">{fmtKES(kpi.spentBudget||0)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom row: Activity + Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Activity */}
        <div className="lg:col-span-2 rounded-2xl overflow-hidden" style={{background:"#fff",boxShadow:"0 2px 16px rgba(0,0,0,0.08)"}}>
          <div className="p-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-black text-gray-800 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" /> Recent Activity
            </h3>
            <button onClick={()=>navigate("/audit-log")} className="text-[10px] font-semibold text-blue-600 hover:underline">View All</button>
          </div>
          <div className="divide-y divide-gray-50">
            {loading ? (
              Array(5).fill(0).map((_,i)=>(
                <div key={i} className="flex items-center gap-3 p-2.5 animate-pulse">
                  <div className="w-7 h-7 rounded-full bg-gray-200 shrink-0"/>
                  <div className="flex-1"><div className="h-2.5 bg-gray-200 rounded w-3/4 mb-1"/><div className="h-2 bg-gray-100 rounded w-1/2"/></div>
                </div>
              ))
            ) : recentActivity.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400">No recent activity</div>
            ) : recentActivity.map((a,i)=>(
              <div key={i} className="flex items-center gap-3 p-2.5 hover:bg-gray-50 transition-colors">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0"
                  style={{background:a.module==="procurement"?"#1a3a6b":a.module==="vouchers"?"#C45911":a.module==="inventory"?"#375623":a.module==="quality"?"#00695C":"#5C2D91"}}>
                  {(a.user_name?.[0]||"S").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium text-gray-700">
                    <span className="font-semibold">{a.user_name||"System"}</span> — {a.action} in <span className="capitalize">{a.module}</span>
                  </div>
                  <div className="text-[10px] text-gray-400">{new Date(a.created_at).toLocaleString("en-KE",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</div>
                </div>
                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded shrink-0"
                  style={{background:"#1a3a6b15",color:"#1a3a6b"}}>{a.module}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Navigation */}
        <div className="rounded-2xl overflow-hidden" style={{background:"#fff",boxShadow:"0 2px 16px rgba(0,0,0,0.08)"}}>
          <div className="p-3 border-b border-gray-100">
            <h3 className="text-sm font-black text-gray-800">Quick Access</h3>
          </div>
          <div className="p-3 grid grid-cols-2 gap-2">
            {[
              {label:"New Requisition",path:"/requisitions",color:"#1a3a6b",icon:ShoppingCart},
              {label:"Payment Vouchers",path:"/vouchers/payment",color:"#C45911",icon:DollarSign},
              {label:"Inventory Items",path:"/items",color:"#375623",icon:Package},
              {label:"Reports",path:"/reports",color:"#5C2D91",icon:BarChart3},
              {label:"Suppliers",path:"/suppliers",color:"#00695C",icon:Truck},
              {label:"Inbox",path:"/inbox",color:"#0891b2",icon:Inbox},
              {label:"Budgets",path:"/financials/budgets",color:"#1F6090",icon:TrendingUp},
              {label:"Audit Log",path:"/audit-log",color:"#374151",icon:Activity},
            ].map(q=>(
              <button key={q.path} onClick={()=>navigate(q.path)}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all hover:scale-105 active:scale-95 text-center"
                style={{background:`${q.color}0d`,border:`1px solid ${q.color}22`}}>
                <q.icon className="w-4 h-4" style={{color:q.color}} />
                <span className="text-[10px] font-semibold leading-tight" style={{color:q.color}}>{q.label}</span>
              </button>
            ))}
          </div>
          <div className="p-3 pt-0">
            <div className="text-[9px] text-gray-400 text-center">
              Last refreshed: {lastRefresh.toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit"})}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
