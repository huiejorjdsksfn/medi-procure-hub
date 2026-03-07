import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import {
  RefreshCw, ShoppingCart, FileText, BarChart3, Package, Shield,
  Activity, AlertTriangle, CheckCircle, Clock, DollarSign, Users,
  Truck, TrendingUp, Inbox, Calendar, Gavel, Scale, ClipboardList,
  PiggyBank, Building2, BookMarked, ChevronRight, Plus, Bell, Layers,
  Search, Eye, Globe, Settings
} from "lucide-react";

const fmtKES = (n: number) => n >= 1_000_000 ? `KES ${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `KES ${(n/1_000).toFixed(0)}K` : `KES ${(n||0).toLocaleString()}`;

// Tile nav config — matches MS Dynamics CRM style
const TILES = [
  { id:"procurement", label:"PROCUREMENT", color:"#1a3a6b", bg:"#1a3a6b", icon:ShoppingCart,
    sub:[
      {label:"Requisitions",       path:"/requisitions",         icon:ClipboardList},
      {label:"Purchase Orders",    path:"/purchase-orders",      icon:ShoppingCart},
      {label:"Goods Received",     path:"/goods-received",       icon:Package},
      {label:"Suppliers",          path:"/suppliers",            icon:Truck},
      {label:"Contracts",          path:"/contracts",            icon:FileText},
      {label:"Tenders",            path:"/tenders",              icon:Gavel},
      {label:"Bid Evaluations",    path:"/bid-evaluations",      icon:Scale},
      {label:"Procurement Plan",   path:"/procurement-planning", icon:Calendar},
    ]},
  { id:"vouchers", label:"VOUCHERS", color:"#C45911", bg:"#C45911", icon:FileText,
    sub:[
      {label:"Payment Vouchers",   path:"/vouchers/payment",     icon:DollarSign},
      {label:"Receipt Vouchers",   path:"/vouchers/receipt",     icon:FileText},
      {label:"Journal Vouchers",   path:"/vouchers/journal",     icon:BookMarked},
      {label:"Purchase Vouchers",  path:"/vouchers/purchase",    icon:FileText},
      {label:"Store Issue",        path:"/vouchers",             icon:Package},
    ]},
  { id:"financials", label:"FINANCIALS", color:"#1F6090", bg:"#1F6090", icon:BarChart3,
    sub:[
      {label:"Finance Dashboard",  path:"/financials/dashboard", icon:BarChart3},
      {label:"Chart of Accounts",  path:"/financials/chart-of-accounts", icon:Globe},
      {label:"Budgets",            path:"/financials/budgets",   icon:PiggyBank},
      {label:"Fixed Assets",       path:"/financials/fixed-assets", icon:Building2},
    ]},
  { id:"inventory", label:"INVENTORY", color:"#375623", bg:"#375623", icon:Package,
    sub:[
      {label:"Items",              path:"/items",                icon:Package},
      {label:"Categories",         path:"/categories",           icon:Layers},
      {label:"Departments",        path:"/departments",          icon:Building2},
      {label:"Scanner",            path:"/scanner",              icon:Search},
    ]},
  { id:"quality", label:"QUALITY", color:"#00695C", bg:"#00695C", icon:Shield,
    sub:[
      {label:"QC Dashboard",       path:"/quality/dashboard",    icon:Shield},
      {label:"Inspections",        path:"/quality/inspections",  icon:ClipboardList},
      {label:"Non-Conformance",    path:"/quality/non-conformance", icon:AlertTriangle},
    ]},
  { id:"reports", label:"REPORTS", color:"#5C2D91", bg:"#5C2D91", icon:BarChart3,
    sub:[
      {label:"Reports",            path:"/reports",              icon:BarChart3},
      {label:"Documents",          path:"/documents",            icon:FileText},
      {label:"Audit Log",          path:"/audit-log",            icon:Activity},
    ]},
];

const ACTION_COLORS: Record<string,string> = {
  create:"#10b981",update:"#3b82f6",delete:"#ef4444",approve:"#10b981",
  reject:"#ef4444",login:"#6366f1",export:"#f59e0b",default:"#9ca3af"
};

export default function DashboardPage() {
  const { profile, roles } = useAuth();
  const navigate = useNavigate();
  const [kpi, setKpi] = useState<any>({});
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTile, setActiveTile] = useState<string|null>(null);
  const [sysName, setSysName] = useState("EL5 MediProcure");
  const [hospitalName, setHospitalName] = useState("Embu Level 5 Hospital");
  const isAdmin = roles.includes("admin") || roles.includes("procurement_manager");

  useEffect(()=>{
    (supabase as any).from("system_settings").select("key,value").in("key",["system_name","hospital_name"])
      .then(({data}:any)=>{ if(!data) return; const m:any={}; data.forEach((r:any)=>{ if(r.key) m[r.key]=r.value; }); if(m.system_name) setSysName(m.system_name); if(m.hospital_name) setHospitalName(m.hospital_name); });
  },[]);

  const load = useCallback(async () => {
    setLoading(true);
    const [reqs,pos,items,supp,pv,ncr,insp,tenders,budgets,grn,log,contracts,inbox] = await Promise.all([
      (supabase as any).from("requisitions").select("id,status,total_amount"),
      (supabase as any).from("purchase_orders").select("id,status,total_amount"),
      (supabase as any).from("items").select("id,quantity_in_stock,reorder_level,unit_price"),
      (supabase as any).from("suppliers").select("id,status"),
      (supabase as any).from("payment_vouchers").select("id,amount,status"),
      (supabase as any).from("non_conformance").select("id,status,severity"),
      (supabase as any).from("inspections").select("id,result"),
      (supabase as any).from("tenders").select("id,status,closing_date"),
      (supabase as any).from("budgets").select("id,allocated_amount,spent_amount"),
      (supabase as any).from("goods_received").select("id,total_value"),
      (supabase as any).from("audit_log").select("id,action,module,user_name,created_at").order("created_at",{ascending:false}).limit(20),
      (supabase as any).from("contracts").select("id,status"),
      (supabase as any).from("inbox_items").select("id,status"),
    ]);
    const R=reqs.data||[],P=pos.data||[],I=items.data||[],S=supp.data||[];
    const PV=pv.data||[],N=ncr.data||[],IN=insp.data||[];
    const T=tenders.data||[],B=budgets.data||[],G=grn.data||[];
    const lowStock=I.filter((i:any)=>Number(i.quantity_in_stock)<=Number(i.reorder_level||10));
    const invVal=I.reduce((s:number,i:any)=>s+Number(i.unit_price||0)*Number(i.quantity_in_stock||0),0);
    const budgetAlloc=B.reduce((s:number,b:any)=>s+Number(b.allocated_amount||0),0);
    const budgetSpent=B.reduce((s:number,b:any)=>s+Number(b.spent_amount||0),0);
    setKpi({
      totalReqs:R.length, pendingReqs:R.filter((r:any)=>r.status==="pending"||r.status==="submitted").length,
      approvedReqs:R.filter((r:any)=>r.status==="approved").length,
      totalPOs:P.length, activePOs:P.filter((p:any)=>p.status==="approved"||p.status==="sent").length,
      poValue:P.reduce((s:number,p:any)=>s+Number(p.total_amount||0),0),
      totalSuppliers:S.length, activeSuppliers:S.filter((s:any)=>s.status==="active").length,
      totalItems:I.length, lowStock:lowStock.length, invValue:invVal,
      openNCR:N.filter((n:any)=>n.status==="open").length,
      passedInsp:IN.filter((i:any)=>i.result==="pass").length,
      totalInsp:IN.length,
      openTenders:T.filter((t:any)=>t.status==="open").length,
      activeContracts:(contracts.data||[]).filter((c:any)=>c.status==="active").length,
      totalPV:PV.length, pvValue:PV.reduce((s:number,v:any)=>s+Number(v.amount||0),0),
      budgetAlloc, budgetSpent, budgetUtil:budgetAlloc>0?Math.round(budgetSpent/budgetAlloc*100):0,
      totalGRN:G.length,
      unreadInbox:(inbox.data||[]).filter((i:any)=>i.status==="unread").length,
    });
    setActivity(log.data||[]);
    setLoading(false);
  },[]);

  useEffect(()=>{ load(); },[load]);

  // KPI panels per module
  const MODULE_KPIS: Record<string,{label:string;value:string;sub?:string;color:string}[]> = {
    procurement:[
      {label:"Total Requisitions",value:String(kpi.totalReqs||0),sub:`${kpi.pendingReqs||0} pending`,color:"#1a3a6b"},
      {label:"Purchase Orders",   value:String(kpi.totalPOs||0), sub:fmtKES(kpi.poValue||0),color:"#2563eb"},
      {label:"Goods Received",    value:String(kpi.totalGRN||0), color:"#1e40af"},
      {label:"Active Suppliers",  value:String(kpi.activeSuppliers||0),sub:`of ${kpi.totalSuppliers||0} total`,color:"#3b82f6"},
      {label:"Open Tenders",      value:String(kpi.openTenders||0),color:"#60a5fa"},
      {label:"Active Contracts",  value:String(kpi.activeContracts||0),color:"#93c5fd"},
    ],
    vouchers:[
      {label:"Payment Vouchers",  value:String(kpi.totalPV||0),  sub:fmtKES(kpi.pvValue||0),color:"#C45911"},
      {label:"Budget Utilization",value:`${kpi.budgetUtil||0}%`, sub:`${fmtKES(kpi.budgetSpent||0)} spent`,color:"#ea580c"},
      {label:"Budget Allocated",  value:fmtKES(kpi.budgetAlloc||0),color:"#f97316"},
    ],
    financials:[
      {label:"Total Budget",      value:fmtKES(kpi.budgetAlloc||0),color:"#1F6090"},
      {label:"Spent to Date",     value:fmtKES(kpi.budgetSpent||0),sub:`${kpi.budgetUtil||0}% utilization`,color:"#2563eb"},
      {label:"Payment Vouchers",  value:fmtKES(kpi.pvValue||0),color:"#3b82f6"},
    ],
    inventory:[
      {label:"Total Items",       value:String(kpi.totalItems||0),color:"#375623"},
      {label:"Low Stock Alerts",  value:String(kpi.lowStock||0), color:"#ef4444"},
      {label:"Inventory Value",   value:fmtKES(kpi.invValue||0), color:"#16a34a"},
    ],
    quality:[
      {label:"Total Inspections", value:String(kpi.totalInsp||0),sub:`${kpi.passedInsp||0} passed`,color:"#00695C"},
      {label:"Open NCRs",         value:String(kpi.openNCR||0),  color:"#ef4444"},
      {label:"Pass Rate",         value:kpi.totalInsp>0?`${Math.round(kpi.passedInsp/kpi.totalInsp*100)}%`:"—",color:"#10b981"},
    ],
    reports:[
      {label:"Audit Records",     value:String(activity.length),color:"#5C2D91"},
      {label:"Inbox Messages",    value:String(kpi.unreadInbox||0),color:"#7c3aed"},
    ],
  };

  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",background:"#f0f2f5",minHeight:"calc(100vh - 80px)"}}>
      {/* ── TILE NAVIGATION BAR (MS Dynamics CRM style) ── */}
      <div className="overflow-x-auto no-scrollbar"
        style={{background:"#1c1c1c",borderBottom:"1px solid #333"}}>
        <div className="flex items-stretch" style={{minWidth:"max-content"}}>
          {TILES.map(tile=>(
            <div key={tile.id}
              onMouseEnter={()=>setActiveTile(tile.id)}
              onMouseLeave={()=>setActiveTile(null)}
              className="relative group cursor-pointer select-none"
              style={{borderRight:"1px solid #2e2e2e"}}>
              <Link to={tile.sub[0].path}
                className="flex flex-col items-center justify-center gap-1 px-6 py-3 transition-all"
                style={{
                  background:activeTile===tile.id?tile.color:"transparent",
                  minWidth:120,color:"#fff",textDecoration:"none"
                }}>
                <tile.icon className="w-5 h-5" style={{opacity:activeTile===tile.id?1:0.7}}/>
                <span style={{fontSize:10,fontWeight:800,letterSpacing:"0.12em",opacity:activeTile===tile.id?1:0.7}}>{tile.label}</span>
              </Link>
              {/* Dropdown submenu */}
              {activeTile===tile.id && (
                <div className="absolute top-full left-0 z-50 min-w-[220px] rounded-b-xl overflow-hidden shadow-2xl"
                  style={{background:"#fff",border:`2px solid ${tile.color}`,borderTop:"none"}}>
                  {tile.sub.map(s=>(
                    <Link key={s.path} to={s.path}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-gray-700 hover:text-white transition-all"
                      onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.background=tile.color; (e.currentTarget as HTMLElement).style.color="#fff"; }}
                      onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.background="transparent"; (e.currentTarget as HTMLElement).style.color="#374151"; }}>
                      <s.icon className="w-3.5 h-3.5 shrink-0" style={{color:tile.color}}/>{s.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div className="flex-1" style={{background:"#1c1c1c"}}/>
          <div className="flex items-center gap-2 px-4" style={{background:"#1c1c1c"}}>
            <button onClick={load} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs text-white/60 hover:text-white hover:bg-white/10 transition-all">
              <RefreshCw className={`w-3.5 h-3.5 ${loading?"animate-spin":""}`}/>Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* ── GREETING + QUICK STATS ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Welcome card */}
          <div className="rounded-2xl overflow-hidden shadow-md"
            style={{background:"linear-gradient(135deg,#0a2558 0%,#1a3a6b 60%,#1d4a87 100%)"}}>
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p style={{fontSize:10,color:"rgba(255,255,255,0.5)",letterSpacing:"0.15em",fontWeight:700}}>WELCOME BACK</p>
                  <h2 style={{fontSize:20,fontWeight:900,color:"#fff",marginTop:4}}>{profile?.full_name?.split(" ")[0] || "User"}</h2>
                  <p style={{fontSize:11,color:"rgba(255,255,255,0.55)",marginTop:2}}>{hospitalName}</p>
                  <div className="flex items-center gap-1.5 mt-3">
                    <Clock className="w-3 h-3" style={{color:"rgba(255,255,255,0.4)"}}/>
                    <span style={{fontSize:10,color:"rgba(255,255,255,0.4)"}}>
                      {new Date().toLocaleDateString("en-KE",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
                    </span>
                  </div>
                </div>
                <div style={{background:"rgba(255,255,255,0.1)",borderRadius:16,padding:12}}>
                  <Building2 className="w-8 h-8 text-white/60"/>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4" style={{borderTop:"1px solid rgba(255,255,255,0.1)"}}>
                {[
                  {label:"Requisitions",value:kpi.totalReqs||0,icon:ClipboardList,path:"/requisitions"},
                  {label:"PO Value",    value:fmtKES(kpi.poValue||0),icon:ShoppingCart,path:"/purchase-orders"},
                  {label:"Inbox",       value:kpi.unreadInbox||0,icon:Inbox,path:"/inbox"},
                ].map(s=>(
                  <button key={s.label} onClick={()=>navigate(s.path)}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all hover:bg-white/10">
                    <s.icon className="w-4 h-4 text-white/50"/>
                    <span style={{fontSize:14,fontWeight:900,color:"#fff"}}>{s.value}</span>
                    <span style={{fontSize:9,color:"rgba(255,255,255,0.4)",textAlign:"center"}}>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* KPI tiles grid (3 cols × 2 rows) */}
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              {label:"Open Requisitions",value:kpi.pendingReqs||0, icon:ClipboardList,color:"#1a3a6b",path:"/requisitions",sub:"Pending approval"},
              {label:"Purchase Orders",   value:kpi.activePOs||0,   icon:ShoppingCart, color:"#C45911",path:"/purchase-orders",sub:fmtKES(kpi.poValue||0)},
              {label:"Low Stock Items",   value:kpi.lowStock||0,    icon:AlertTriangle,color:"#ef4444",path:"/items",sub:"Need reorder"},
              {label:"Active Suppliers",  value:kpi.activeSuppliers||0,icon:Truck,    color:"#375623",path:"/suppliers",sub:`of ${kpi.totalSuppliers||0} total`},
              {label:"Open NCRs",         value:kpi.openNCR||0,     icon:Shield,      color:"#00695C",path:"/quality/non-conformance",sub:"Non-conformance"},
              {label:"Inventory Value",   value:fmtKES(kpi.invValue||0),icon:Package, color:"#5C2D91",path:"/items",sub:"Total stock value"},
            ].map(k=>(
              <button key={k.label} onClick={()=>navigate(k.path)}
                className="rounded-xl p-3.5 text-left transition-all hover:shadow-md hover:-translate-y-0.5 bg-white shadow-sm group">
                <div className="flex items-start justify-between">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{background:`${k.color}15`}}>
                    <k.icon className="w-4.5 h-4.5" style={{color:k.color,width:18,height:18}}/>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors"/>
                </div>
                <div style={{fontSize:22,fontWeight:900,color:k.color,marginTop:8,lineHeight:1}}>{k.value}</div>
                <div style={{fontSize:11,fontWeight:700,color:"#374151",marginTop:4}}>{k.label}</div>
                {k.sub && <div style={{fontSize:9,color:"#9ca3af",marginTop:2}}>{k.sub}</div>}
              </button>
            ))}
          </div>
        </div>

        {/* ── MAIN CHARTS ROW (MS Dynamics CRM 3-column layout) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Procurement Pipeline (funnel chart) */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 style={{fontSize:13,fontWeight:800,color:"#1f2937"}}>Procurement Pipeline</h3>
                <p style={{fontSize:10,color:"#9ca3af"}}>Open Requisitions by Status</p>
              </div>
              <Link to="/requisitions" style={{fontSize:10,color:"#1a3a6b",fontWeight:700}}>View All</Link>
            </div>
            <div className="p-4 flex flex-col items-center gap-2">
              {[
                {label:"Submitted",   count:kpi.pendingReqs||0,   color:"#1a3a6b",width:100},
                {label:"Approved",    count:kpi.approvedReqs||0,  color:"#C45911",width:72},
                {label:"PO Raised",   count:kpi.activePOs||0,     color:"#1F6090",width:55},
                {label:"Delivered",   count:kpi.totalGRN||0,      color:"#375623",width:38},
                {label:"Closed",      count:Math.max(0,(kpi.totalReqs||0)-(kpi.pendingReqs||0)-(kpi.approvedReqs||0)),color:"#5C2D91",width:24},
              ].map((s,i)=>(
                <div key={s.label} className="w-full flex flex-col items-center gap-0.5">
                  <div className="w-full flex items-center gap-2">
                    <div className="text-right" style={{width:70,fontSize:9,color:"#6b7280",fontWeight:600}}>{s.label}</div>
                    <div className="flex-1 relative h-8 rounded overflow-hidden" style={{background:"#f3f4f6"}}>
                      <div className="absolute inset-y-0 left-0 flex items-center justify-end pr-2 rounded transition-all duration-700"
                        style={{width:`${s.width}%`,background:s.color}}>
                        <span style={{fontSize:11,color:"#fff",fontWeight:800}}>{s.count}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Budget Utilization chart */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 style={{fontSize:13,fontWeight:800,color:"#1f2937"}}>Budget Utilization</h3>
                <p style={{fontSize:10,color:"#9ca3af"}}>Allocated vs Spent</p>
              </div>
              <Link to="/financials/budgets" style={{fontSize:10,color:"#C45911",fontWeight:700}}>View All</Link>
            </div>
            <div className="p-4 flex flex-col items-center justify-center gap-4">
              {/* Donut chart (SVG) */}
              <div className="relative" style={{width:130,height:130}}>
                <svg viewBox="0 0 130 130" style={{transform:"rotate(-90deg)"}}>
                  <circle cx="65" cy="65" r="52" fill="none" stroke="#f3f4f6" strokeWidth="16"/>
                  <circle cx="65" cy="65" r="52" fill="none" stroke="#1F6090" strokeWidth="16"
                    strokeDasharray={`${(kpi.budgetUtil||0)*3.27} 327`} strokeLinecap="round"/>
                  <circle cx="65" cy="65" r="52" fill="none" stroke="#C45911" strokeWidth="16"
                    strokeDasharray={`${Math.min(100,Math.max(0,(kpi.budgetUtil||0)-20))*3.27} 327`}
                    strokeDashoffset={`-${20*3.27}`} strokeLinecap="round" opacity="0.4"/>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span style={{fontSize:22,fontWeight:900,color:"#1F6090"}}>{kpi.budgetUtil||0}%</span>
                  <span style={{fontSize:9,color:"#9ca3af",fontWeight:600}}>UTILIZED</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full">
                {[
                  {label:"Allocated",value:fmtKES(kpi.budgetAlloc||0),color:"#1F6090"},
                  {label:"Spent",    value:fmtKES(kpi.budgetSpent||0),color:"#C45911"},
                ].map(b=>(
                  <div key={b.label} className="rounded-xl p-2.5 text-center" style={{background:`${b.color}10`}}>
                    <div style={{fontSize:13,fontWeight:800,color:b.color}}>{b.value}</div>
                    <div style={{fontSize:9,color:"#6b7280",fontWeight:600,marginTop:2}}>{b.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Inventory & Quality */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 style={{fontSize:13,fontWeight:800,color:"#1f2937"}}>Stock & Quality</h3>
                <p style={{fontSize:10,color:"#9ca3af"}}>Inventory & Inspection Overview</p>
              </div>
              <Link to="/items" style={{fontSize:10,color:"#375623",fontWeight:700}}>View All</Link>
            </div>
            <div className="p-4 space-y-3">
              {[
                {label:"Total Items",     value:kpi.totalItems||0,       max:kpi.totalItems||1,  color:"#375623",path:"/items"},
                {label:"Low Stock Alerts",value:kpi.lowStock||0,         max:kpi.totalItems||1,  color:"#ef4444",path:"/items"},
                {label:"Inspections",     value:kpi.totalInsp||0,        max:kpi.totalInsp||1,   color:"#00695C",path:"/quality/inspections"},
                {label:"Passed",          value:kpi.passedInsp||0,       max:kpi.totalInsp||1,   color:"#10b981",path:"/quality/inspections"},
                {label:"Open NCRs",       value:kpi.openNCR||0,          max:Math.max(1,kpi.openNCR||0),color:"#f59e0b",path:"/quality/non-conformance"},
              ].map(s=>(
                <Link key={s.label} to={s.path} className="block group">
                  <div className="flex items-center justify-between mb-1">
                    <span style={{fontSize:10,fontWeight:600,color:"#4b5563"}}>{s.label}</span>
                    <span style={{fontSize:12,fontWeight:800,color:s.color}}>{s.value}</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{background:"#f3f4f6"}}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{width:`${Math.min(100,Math.round((s.value/(s.max||1))*100))}%`,background:s.color}}/>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ── ACTIVITY TABLE (MS Dynamics style) ── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4" style={{color:"#6b7280"}}/>
              <span style={{fontSize:13,fontWeight:800,color:"#1f2937"}}>All Activities</span>
              <span className="px-2 py-0.5 rounded-full text-white text-[9px] font-bold"
                style={{background:"#1a3a6b"}}>{activity.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/audit-log" style={{fontSize:10,color:"#1a3a6b",fontWeight:700}}>View Full Log</Link>
              <Plus className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600"/>
            </div>
          </div>
          {loading ? (
            <div className="p-8 text-center"><RefreshCw className="w-6 h-6 animate-spin text-gray-300 mx-auto mb-2"/><p style={{fontSize:11,color:"#9ca3af"}}>Loading…</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" style={{fontSize:12}}>
                <thead>
                  <tr style={{background:"#f9fafb",borderBottom:"1px solid #f3f4f6"}}>
                    {["Subject / Action","Module","Activity Type","Status","User","Date"].map(h=>(
                      <th key={h} className="text-left px-4 py-2.5" style={{fontSize:10,fontWeight:700,color:"#6b7280",letterSpacing:"0.06em",whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activity.slice(0,15).map(a=>(
                    <tr key={a.id} className="hover:bg-gray-50 transition-colors" style={{borderBottom:"1px solid #f9fafb"}}>
                      <td className="px-4 py-2.5">
                        <span style={{fontWeight:600,color:"#1f2937"}}>{a.action?.replace(/_/g," ") || "—"}</span>
                      </td>
                      <td className="px-4 py-2.5 capitalize" style={{color:"#6b7280"}}>{a.module||"—"}</td>
                      <td className="px-4 py-2.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize"
                          style={{background:`${ACTION_COLORS[a.action]||"#9ca3af"}15`,color:ACTION_COLORS[a.action]||"#6b7280"}}>
                          {a.action||"system"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500"/><span style={{fontSize:11,color:"#10b981",fontWeight:600}}>Completed</span></span>
                      </td>
                      <td className="px-4 py-2.5 flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                          style={{background:"#1a3a6b",shrink:0}}>
                          {(a.user_name||"S")[0].toUpperCase()}
                        </div>
                        <span style={{color:"#374151",fontWeight:500}}>{a.user_name||"System"}</span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-400" style={{fontSize:11,whiteSpace:"nowrap"}}>
                        {a.created_at ? new Date(a.created_at).toLocaleString("en-KE",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── QUICK ACCESS MODULE GRID ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-2">
          {TILES.flatMap(t=>t.sub).slice(0,16).map(link=>(
            <Link key={link.path} to={link.path}
              className="bg-white rounded-xl p-3 flex flex-col items-center gap-2 text-center hover:shadow-md transition-all hover:-translate-y-0.5 group">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{background:"#f0f2f5"}}>
                <link.icon className="w-4 h-4" style={{color:"#6b7280",transition:"all 0.2s"}}/>
              </div>
              <span style={{fontSize:9,fontWeight:700,color:"#6b7280",lineHeight:1.3}}>{link.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
