import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  ShoppingCart, FileText, Package, Truck, Gavel, DollarSign, BarChart3,
  ClipboardList, Shield, Users, Settings, Database, RefreshCw,
  ArrowRight, AlertTriangle, CheckCircle, Clock, Activity, TrendingUp,
  Star, ChevronRight, Bell, Archive, Printer, BookOpen
} from "lucide-react";

const fmtKES = (n:number) => n>=1000000?`KES ${(n/1000000).toFixed(1)}M`:n>=1000?`KES ${(n/1000).toFixed(0)}K`:`KES ${n.toFixed(0)}`;

const NAV_MODULES = [
  { id:"procurement", label:"PROCUREMENT",  color:"#1a3a6b", hoverColor:"#0a1d3a", icon:ShoppingCart,
    items:[
      {label:"Requisitions",       path:"/requisitions"},
      {label:"Purchase Orders",    path:"/purchase-orders"},
      {label:"Goods Received",     path:"/goods-received"},
      {label:"Suppliers",          path:"/suppliers"},
      {label:"Contracts",          path:"/contracts"},
      {label:"Tenders",            path:"/tenders"},
      {label:"Bid Evaluations",    path:"/bid-evaluations"},
      {label:"Procurement Plan",   path:"/procurement-planning"},
    ]},
  { id:"vouchers", label:"VOUCHERS", color:"#7c2d12", hoverColor:"#5a1f09", icon:DollarSign,
    items:[
      {label:"Payment Vouchers",   path:"/vouchers/payment"},
      {label:"Receipt Vouchers",   path:"/vouchers/receipt"},
      {label:"Journal Vouchers",   path:"/vouchers/journal"},
      {label:"Purchase Vouchers",  path:"/vouchers/purchase"},
      {label:"Sales Vouchers",     path:"/vouchers/sales"},
      {label:"All Vouchers",       path:"/vouchers"},
    ]},
  { id:"financials", label:"FINANCIALS", color:"#065f46", hoverColor:"#064e3b", icon:BarChart3,
    items:[
      {label:"Financial Dashboard",path:"/financials/dashboard"},
      {label:"Chart of Accounts",  path:"/financials/chart-of-accounts"},
      {label:"Budgets",            path:"/financials/budgets"},
      {label:"Fixed Assets",       path:"/financials/fixed-assets"},
    ]},
  { id:"inventory", label:"INVENTORY", color:"#3b0764", hoverColor:"#2e0552", icon:Package,
    items:[
      {label:"Items",              path:"/items"},
      {label:"Categories",         path:"/categories"},
      {label:"Departments",        path:"/departments"},
      {label:"Barcode Scanner",    path:"/scanner"},
    ]},
  { id:"quality", label:"QUALITY", color:"#134e4a", hoverColor:"#0f3d3a", icon:Shield,
    items:[
      {label:"Quality Dashboard",  path:"/quality/dashboard"},
      {label:"Inspections",        path:"/quality/inspections"},
      {label:"Non-Conformance",    path:"/quality/non-conformance"},
    ]},
  { id:"reports", label:"REPORTS", color:"#1e1b4b", hoverColor:"#171556", icon:FileText,
    items:[
      {label:"Reports",            path:"/reports"},
      {label:"Documents",          path:"/documents"},
      {label:"Audit Log",          path:"/audit-log"},
    ]},
];

const QUICK_ACCESS = [
  {label:"New Requisition",   path:"/requisitions",      icon:ClipboardList,   color:"#1a3a6b"},
  {label:"New Purchase Order",path:"/purchase-orders",   icon:ShoppingCart,    color:"#1e3a5f"},
  {label:"Receive Goods",     path:"/goods-received",    icon:Truck,           color:"#374151"},
  {label:"Add Supplier",      path:"/suppliers",         icon:Star,            color:"#7c2d12"},
  {label:"New Tender",        path:"/tenders",           icon:Gavel,           color:"#065f46"},
  {label:"Pay Voucher",       path:"/vouchers/payment",  icon:DollarSign,      color:"#3b0764"},
  {label:"QC Inspection",     path:"/quality/inspections",icon:Shield,         color:"#134e4a"},
  {label:"View Reports",      path:"/reports",           icon:BarChart3,       color:"#1e1b4b"},
];

export default function DashboardPage() {
  const { profile, roles } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState({ reqs:0, pos:0, grns:0, suppliers:0, items:0, pendingReqs:0, approvedReqs:0, totalPoValue:0, lowStock:0 });
  const [recentReqs, setRecentReqs] = useState<any[]>([]);
  const [recentPOs, setRecentPOs]   = useState<any[]>([]);
  const [hospitalName, setHospitalName] = useState("Embu Level 5 Hospital");
  const [sysName, setSysName] = useState("EL5 MediProcure");
  const [logoUrl, setLogoUrl] = useState<string|null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDropdown, setActiveDropdown] = useState<string|null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(()=>setNow(new Date()), 60000);
    return ()=>clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const [reqsRes, posRes, grnsRes, suppRes, itemsRes, settingsRes, recentReqsRes, recentPOsRes] = await Promise.all([
      (supabase as any).from("requisitions").select("id,status",{count:"exact"}),
      (supabase as any).from("purchase_orders").select("id,total_amount",{count:"exact"}),
      (supabase as any).from("goods_received").select("id",{count:"exact"}),
      (supabase as any).from("suppliers").select("id",{count:"exact"}),
      (supabase as any).from("items").select("id,quantity_in_stock,reorder_level",{count:"exact"}),
      (supabase as any).from("system_settings").select("key,value").in("key",["system_name","hospital_name","system_logo_url"]),
      (supabase as any).from("requisitions").select("requisition_number,status,total_amount,requested_by_name,created_at").order("created_at",{ascending:false}).limit(5),
      (supabase as any).from("purchase_orders").select("po_number,status,total_amount,created_by_name,created_at").order("created_at",{ascending:false}).limit(5),
    ]);

    const reqs = reqsRes.data||[];
    const pos  = posRes.data||[];
    const items= itemsRes.data||[];
    const settings = settingsRes.data||[];

    const m: any = {};
    settings.forEach((s:any) => { if(s.key) m[s.key]=s.value; });
    if (m.system_name)    setSysName(m.system_name);
    if (m.hospital_name)  setHospitalName(m.hospital_name);
    if (m.system_logo_url) setLogoUrl(m.system_logo_url);

    setData({
      reqs: reqsRes.count||reqs.length,
      pos:  posRes.count||pos.length,
      grns: grnsRes.count||0,
      suppliers: suppRes.count||0,
      items: itemsRes.count||items.length,
      pendingReqs: reqs.filter((r:any)=>r.status==="pending").length,
      approvedReqs:reqs.filter((r:any)=>r.status==="approved").length,
      totalPoValue: pos.reduce((s:number,p:any)=>s+Number(p.total_amount||0),0),
      lowStock: items.filter((i:any)=>(i.quantity_in_stock||0)<=(i.reorder_level||10)).length,
    });
    setRecentReqs(recentReqsRes.data||[]);
    setRecentPOs(recentPOsRes.data||[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const STATUS_COLOR: Record<string,string> = { pending:"#d97706", approved:"#16a34a", rejected:"#dc2626", draft:"#6b7280", active:"#16a34a", sent:"#0369a1" };

  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",background:"#f1f5f9",minHeight:"calc(100vh-56px)"}}>
      {/* ── TOP MODULE NAV BAR ── */}
      <div className="sticky top-0 z-30 flex items-stretch" style={{background:"#0a1628",borderBottom:"2px solid #1a3a6b",minHeight:40}}>
        {/* Logo area */}
        <div className="flex items-center gap-2.5 px-4 py-1 shrink-0" style={{background:"#071020",borderRight:"1px solid #1a3a6b"}}>
          {logoUrl ? <img src={logoUrl} className="h-6 object-contain" alt=""/> : <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-white text-[9px] font-black">EL5</div>}
          <span style={{fontSize:11,fontWeight:900,color:"#fff",letterSpacing:"0.05em"}}>{sysName}</span>
        </div>
        {/* Module tabs */}
        {NAV_MODULES.map(mod=>(
          <div key={mod.id} className="relative"
            onMouseEnter={()=>setActiveDropdown(mod.id)} onMouseLeave={()=>setActiveDropdown(null)}>
            <button className="flex items-center gap-1.5 px-4 h-full text-xs font-bold tracking-wide transition-all"
              style={{color:activeDropdown===mod.id?"#fff":"rgba(255,255,255,0.6)",background:activeDropdown===mod.id?mod.color:"transparent",borderBottom:activeDropdown===mod.id?"2px solid #60a5fa":"2px solid transparent"}}>
              <mod.icon className="w-3.5 h-3.5"/> {mod.label}
            </button>
            {activeDropdown===mod.id && (
              <div className="absolute top-full left-0 z-50 py-1 rounded-b-xl shadow-2xl min-w-[180px]"
                style={{background:mod.color,border:`1px solid ${mod.hoverColor}`}}>
                {mod.items.map(item=>(
                  <button key={item.path} onClick={()=>navigate(item.path)}
                    className="flex items-center justify-between w-full px-4 py-2 text-left text-xs hover:bg-white/10 transition-all"
                    style={{color:"rgba(255,255,255,0.85)",fontWeight:500}}>
                    {item.label}<ChevronRight className="w-3 h-3 opacity-50"/>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {/* Clock */}
        <div className="ml-auto flex items-center px-4" style={{borderLeft:"1px solid #1a3a6b"}}>
          <div className="text-right">
            <div style={{fontSize:12,fontWeight:700,color:"#fff"}}>{now.toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit"})}</div>
            <div style={{fontSize:9,color:"rgba(255,255,255,0.4)"}}>{now.toLocaleDateString("en-KE",{weekday:"short",day:"2-digit",month:"short"})}</div>
          </div>
        </div>
      </div>

      {/* ── PAGE BODY ── */}
      <div className="p-4 space-y-4">
        {/* Welcome banner */}
        <div className="rounded-2xl px-5 py-4 flex items-center justify-between"
          style={{background:"linear-gradient(135deg,#071020 0%,#1a3a6b 60%,#0369a1 100%)",boxShadow:"0 8px 24px rgba(3,105,161,0.3)"}}>
          <div className="flex items-center gap-4">
            {logoUrl && <img src={logoUrl} className="h-10 object-contain rounded-xl" alt=""/>}
            <div>
              <h1 style={{fontSize:17,fontWeight:900,color:"#fff",margin:0,lineHeight:1.1}}>{hospitalName}</h1>
              <p style={{fontSize:11,color:"rgba(255,255,255,0.55)",margin:"2px 0 0"}}>{sysName} · Welcome, {profile?.full_name||"User"} · {roles[0]?.replace(/_/g," ")}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={load} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold" style={{background:"rgba(255,255,255,0.1)",color:"#fff",border:"1px solid rgba(255,255,255,0.2)"}}>
              <RefreshCw className={`w-3 h-3 ${loading?"animate-spin":""}`}/> Refresh
            </button>
            <button onClick={()=>navigate("/inbox")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold" style={{background:"rgba(255,255,255,0.1)",color:"#fff",border:"1px solid rgba(255,255,255,0.2)"}}>
              <Bell className="w-3 h-3"/> Inbox
            </button>
          </div>
        </div>

        {/* ── KPI TILES (retro colored tiles like IMS V2.0) ── */}
        <div className="grid grid-cols-5 gap-3">
          {[
            {label:"Requisitions",    value:data.reqs,        color:"#c0392b", sub:`${data.pendingReqs} pending`},
            {label:"Purchase Orders", value:data.pos,         color:"#7d6608", sub:fmtKES(data.totalPoValue)},
            {label:"GRNs",            value:data.grns,        color:"#0e6655", sub:"goods received"},
            {label:"Suppliers",       value:data.suppliers,   color:"#6c3483", sub:"registered"},
            {label:"Stock Items",     value:data.items,       color:"#1a252f", sub:`${data.lowStock} low`},
          ].map(k=>(
            <div key={k.label} className="rounded-2xl p-4 text-white"
              style={{background:`linear-gradient(135deg,${k.color},${k.color}cc)`,boxShadow:`0 4px 16px ${k.color}55`}}>
              <div style={{fontSize:28,fontWeight:900,lineHeight:1}}>{loading?"…":k.value.toLocaleString()}</div>
              <div style={{fontSize:11,fontWeight:700,marginTop:4,opacity:0.95}}>{k.label}</div>
              <div style={{fontSize:10,opacity:0.65,marginTop:2}}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* ── QUICK ACCESS (8 tile grid) ── */}
        <div>
          <h2 style={{fontSize:12,fontWeight:800,color:"#374151",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10}}>Quick Access</h2>
          <div className="grid grid-cols-8 gap-2">
            {QUICK_ACCESS.map(q=>(
              <button key={q.path} onClick={()=>navigate(q.path)}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl text-white hover:scale-105 transition-transform"
                style={{background:`linear-gradient(135deg,${q.color},${q.color}aa)`,boxShadow:`0 2px 8px ${q.color}44`}}>
                <q.icon className="w-5 h-5"/>
                <span style={{fontSize:9,fontWeight:700,textAlign:"center",lineHeight:1.2}}>{q.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── TRANSACTIONS SECTION (like IMS image) ── */}
        <div className="grid grid-cols-2 gap-4">
          {/* Recent Requisitions */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between" style={{background:"linear-gradient(90deg,#1a3a6b,#1d4a87)"}}>
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-white"/>
                <span style={{fontSize:12,fontWeight:800,color:"#fff"}}>Recent Requisitions</span>
              </div>
              <button onClick={()=>navigate("/requisitions")} style={{fontSize:10,color:"rgba(255,255,255,0.6)"}}>
                View all <ArrowRight className="w-3 h-3 inline"/>
              </button>
            </div>
            <table className="w-full text-xs">
              <thead><tr style={{background:"#dce6f1"}}>
                <th className="px-3 py-2 text-left" style={{fontWeight:700,color:"#374151",fontSize:10}}>No.</th>
                <th className="px-3 py-2 text-left" style={{fontWeight:700,color:"#374151",fontSize:10}}>Requested By</th>
                <th className="px-3 py-2 text-left" style={{fontWeight:700,color:"#374151",fontSize:10}}>Amount</th>
                <th className="px-3 py-2 text-left" style={{fontWeight:700,color:"#374151",fontSize:10}}>Status</th>
                <th className="px-3 py-2 text-left" style={{fontWeight:700,color:"#374151",fontSize:10}}>Date</th>
              </tr></thead>
              <tbody>
                {recentReqs.length===0?(
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400 text-xs">No requisitions yet</td></tr>
                ):recentReqs.map((r,i)=>(
                  <tr key={r.requisition_number||i} style={{background:i%2===0?"#fff":"#f8faff",borderBottom:"1px solid #e5e7eb",cursor:"pointer"}}
                    onClick={()=>navigate("/requisitions")}>
                    <td className="px-3 py-2 font-bold" style={{color:"#1a3a6b"}}>{r.requisition_number}</td>
                    <td className="px-3 py-2" style={{color:"#374151"}}>{r.requested_by_name||"—"}</td>
                    <td className="px-3 py-2 font-semibold" style={{color:"#374151"}}>{fmtKES(Number(r.total_amount||0))}</td>
                    <td className="px-3 py-2"><span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{background:`${STATUS_COLOR[r.status]||"#9ca3af"}20`,color:STATUS_COLOR[r.status]||"#9ca3af"}}>{r.status}</span></td>
                    <td className="px-3 py-2" style={{color:"#9ca3af"}}>{new Date(r.created_at).toLocaleDateString("en-KE",{month:"short",day:"2-digit"})}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Recent Purchase Orders */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between" style={{background:"linear-gradient(90deg,#7c2d12,#92400e)"}}>
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-white"/>
                <span style={{fontSize:12,fontWeight:800,color:"#fff"}}>Recent Purchase Orders</span>
              </div>
              <button onClick={()=>navigate("/purchase-orders")} style={{fontSize:10,color:"rgba(255,255,255,0.6)"}}>
                View all <ArrowRight className="w-3 h-3 inline"/>
              </button>
            </div>
            <table className="w-full text-xs">
              <thead><tr style={{background:"#fde8d8"}}>
                <th className="px-3 py-2 text-left" style={{fontWeight:700,color:"#374151",fontSize:10}}>PO No.</th>
                <th className="px-3 py-2 text-left" style={{fontWeight:700,color:"#374151",fontSize:10}}>Created By</th>
                <th className="px-3 py-2 text-left" style={{fontWeight:700,color:"#374151",fontSize:10}}>Amount</th>
                <th className="px-3 py-2 text-left" style={{fontWeight:700,color:"#374151",fontSize:10}}>Status</th>
                <th className="px-3 py-2 text-left" style={{fontWeight:700,color:"#374151",fontSize:10}}>Date</th>
              </tr></thead>
              <tbody>
                {recentPOs.length===0?(
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400 text-xs">No purchase orders yet</td></tr>
                ):recentPOs.map((p,i)=>(
                  <tr key={p.po_number||i} style={{background:i%2===0?"#fff":"#fff9f5",borderBottom:"1px solid #e5e7eb",cursor:"pointer"}}
                    onClick={()=>navigate("/purchase-orders")}>
                    <td className="px-3 py-2 font-bold" style={{color:"#7c2d12"}}>{p.po_number}</td>
                    <td className="px-3 py-2" style={{color:"#374151"}}>{p.created_by_name||"—"}</td>
                    <td className="px-3 py-2 font-semibold" style={{color:"#374151"}}>{fmtKES(Number(p.total_amount||0))}</td>
                    <td className="px-3 py-2"><span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{background:`${STATUS_COLOR[p.status]||"#9ca3af"}20`,color:STATUS_COLOR[p.status]||"#9ca3af"}}>{p.status}</span></td>
                    <td className="px-3 py-2" style={{color:"#9ca3af"}}>{new Date(p.created_at).toLocaleDateString("en-KE",{month:"short",day:"2-digit"})}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
