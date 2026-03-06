import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart, Package, Truck, ClipboardList, TrendingUp, AlertTriangle,
  FileText, RefreshCw, ArrowRight, DollarSign, CheckCircle,
  Clock, XCircle, Activity, Database, Shield, Gavel, PiggyBank
} from "lucide-react";

export default function DashboardPage() {
  const { profile, roles } = useAuth();
  const navigate = useNavigate();
  const [kpis, setKpis] = useState<any>({});
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [reqs,pos,items,suppliers,pv,rv,ncr,insp,tenders,budgets,profiles,activity] = await Promise.all([
        (supabase as any).from("requisitions").select("status"),
        (supabase as any).from("purchase_orders").select("status"),
        (supabase as any).from("items").select("quantity_in_stock,reorder_level"),
        (supabase as any).from("suppliers").select("status"),
        (supabase as any).from("payment_vouchers").select("status,amount"),
        (supabase as any).from("receipt_vouchers").select("amount"),
        (supabase as any).from("non_conformance").select("status"),
        (supabase as any).from("inspections").select("result"),
        (supabase as any).from("tenders").select("status"),
        (supabase as any).from("budgets").select("status"),
        (supabase as any).from("profiles").select("id"),
        (supabase as any).from("audit_log").select("action,module,user_name,created_at").order("created_at",{ascending:false}).limit(8),
      ]);
      const pvRows=pv.data||[];const rvRows=rv.data||[];const itemRows=items.data||[];
      setKpis({
        pendingReqs:(reqs.data||[]).filter((r:any)=>r.status==="pending").length,
        approvedReqs:(reqs.data||[]).filter((r:any)=>r.status==="approved").length,
        pendingPOs:(pos.data||[]).filter((p:any)=>["draft","pending"].includes(p.status)).length,
        approvedPOs:(pos.data||[]).filter((p:any)=>["approved","issued"].includes(p.status)).length,
        lowStockItems:itemRows.filter((i:any)=>Number(i.quantity_in_stock)<=Number(i.reorder_level||10)).length,
        totalItems:itemRows.length,
        activeSuppliers:(suppliers.data||[]).filter((s:any)=>s.status==="active").length,
        totalSuppliers:(suppliers.data||[]).length,
        pendingPayments:pvRows.filter((v:any)=>["pending","approved"].includes(v.status)).length,
        pendingPaymentsAmt:pvRows.filter((v:any)=>["pending","approved"].includes(v.status)).reduce((s:number,v:any)=>s+Number(v.amount),0),
        totalReceipts:rvRows.length,
        totalReceiptsAmt:rvRows.reduce((s:number,v:any)=>s+Number(v.amount),0),
        openNCRs:(ncr.data||[]).filter((n:any)=>n.status==="open").length,
        pendingInspections:(insp.data||[]).filter((i:any)=>i.result==="pending").length,
        activeTenders:(tenders.data||[]).filter((t:any)=>t.status==="published").length,
        activeBudgets:(budgets.data||[]).filter((b:any)=>b.status==="active").length,
        totalUsers:(profiles.data||[]).length,
      });
      setRecentActivity(activity.data||[]);
      setLastUpdated(new Date());
    } catch(e){console.error(e);}
    setLoading(false);
  };

  useEffect(()=>{fetchAll();},[]);
  useEffect(()=>{
    const tables=["requisitions","purchase_orders","items","suppliers","payment_vouchers","receipt_vouchers","non_conformance","inspections","tenders","audit_log"];
    const channels=tables.map(t=>(supabase as any).channel(`dash-${t}`).on("postgres_changes",{event:"*",schema:"public",table:t},()=>fetchAll()).subscribe());
    return ()=>{channels.forEach(c=>supabase.removeChannel(c));};
  },[]);

  const cards=[
    {label:"Pending Requisitions",val:kpis.pendingReqs||0,sub:`${kpis.approvedReqs||0} approved`,icon:ClipboardList,color:"amber",path:"/requisitions",urgent:(kpis.pendingReqs||0)>0},
    {label:"Purchase Orders",val:kpis.pendingPOs||0,sub:`${kpis.approvedPOs||0} approved`,icon:ShoppingCart,color:"blue",path:"/purchase-orders"},
    {label:"Low Stock Alerts",val:kpis.lowStockItems||0,sub:`of ${kpis.totalItems||0} items`,icon:AlertTriangle,color:"red",path:"/items",urgent:(kpis.lowStockItems||0)>0},
    {label:"Active Suppliers",val:kpis.activeSuppliers||0,sub:`${kpis.totalSuppliers||0} total`,icon:Truck,color:"green",path:"/suppliers"},
    {label:"Pending Payments",val:kpis.pendingPayments||0,sub:`KES ${(kpis.pendingPaymentsAmt||0).toLocaleString()}`,icon:DollarSign,color:"orange",path:"/vouchers/payment",urgent:(kpis.pendingPayments||0)>0},
    {label:"Total Receipts",val:kpis.totalReceipts||0,sub:`KES ${(kpis.totalReceiptsAmt||0).toLocaleString()}`,icon:TrendingUp,color:"teal",path:"/vouchers/receipt"},
    {label:"Open NCRs",val:kpis.openNCRs||0,sub:`${kpis.pendingInspections||0} inspections pending`,icon:Shield,color:"rose",path:"/quality/non-conformance",urgent:(kpis.openNCRs||0)>0},
    {label:"Active Tenders",val:kpis.activeTenders||0,sub:`${kpis.activeBudgets||0} active budgets`,icon:Gavel,color:"violet",path:"/tenders"},
  ];

  const quickActions=[
    {label:"New Requisition",path:"/requisitions",color:"bg-blue-600",icon:ClipboardList},
    {label:"Payment Voucher",path:"/vouchers/payment",color:"bg-orange-600",icon:DollarSign},
    {label:"Receive Goods",path:"/goods-received",color:"bg-green-600",icon:Package},
    {label:"New PO",path:"/purchase-orders",color:"bg-indigo-600",icon:ShoppingCart},
    {label:"Record Receipt",path:"/vouchers/receipt",color:"bg-emerald-600",icon:TrendingUp},
    {label:"Inspection",path:"/quality/inspections",color:"bg-teal-600",icon:CheckCircle},
    {label:"Tenders",path:"/tenders",color:"bg-violet-600",icon:Gavel},
    {label:"Budgets",path:"/financials/budgets",color:"bg-purple-600",icon:PiggyBank},
    ...(roles.includes("admin")?[{label:"DB Admin",path:"/admin/database",color:"bg-slate-700",icon:Database}]:[]),
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Good {new Date().getHours()<12?"morning":new Date().getHours()<17?"afternoon":"evening"}, {profile?.full_name?.split(" ")[0]||"User"} 👋</h1>
          <p className="text-sm text-slate-500 mt-0.5">Embu Level 5 Hospital ERP · Updated {lastUpdated.toLocaleTimeString("en-KE")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}><RefreshCw className={`w-4 h-4 mr-2 ${loading?"animate-spin":""}`} />Refresh</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(k=>(
          <button key={k.label} onClick={()=>navigate(k.path)} className={`bg-white rounded-xl border shadow-sm p-4 text-left hover:shadow-md transition-all group ${k.urgent?"border-red-200 ring-1 ring-red-100":"border-slate-200"}`}>
            <div className={`p-2 rounded-lg bg-${k.color}-50 w-fit mb-3`}><k.icon className={`w-5 h-5 text-${k.color}-600`} /></div>
            <p className={`text-2xl font-bold ${k.urgent?"text-red-700":"text-slate-800"}`}>{k.val}</p>
            <p className="text-xs font-medium text-slate-700 mt-0.5">{k.label}</p>
            <p className="text-xs text-slate-400">{k.sub}</p>
            {k.urgent&&<div className="mt-2 text-xs text-red-600 font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Action needed</div>}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">Quick Actions</h2>
          <div className="grid grid-cols-3 gap-2">
            {quickActions.map(a=>(
              <button key={a.label} onClick={()=>navigate(a.path)} className={`${a.color} text-white rounded-xl p-3 text-center hover:opacity-90 flex flex-col items-center gap-1.5`}>
                <a.icon className="w-4 h-4" /><span className="text-xs font-medium leading-tight">{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Live Activity Feed</h2>
            <Button variant="ghost" size="sm" className="text-xs text-blue-600" onClick={()=>navigate("/audit-log")}>View All <ArrowRight className="w-3 h-3 ml-1" /></Button>
          </div>
          {recentActivity.length===0?<div className="text-center py-8 text-slate-400 text-sm">No activity yet</div>
          :<div className="space-y-2">{recentActivity.map((act,i)=>(
            <div key={i} className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
              <Activity className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700 truncate"><span className="font-semibold capitalize">{act.action?.replace(/_/g," ")}</span> <span className="text-slate-400">in {act.module}</span></p>
                <p className="text-xs text-slate-400">{act.user_name||"System"} · {act.created_at?new Date(act.created_at).toLocaleString("en-KE"):""}</p>
              </div>
            </div>
          ))}</div>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[{label:"Database",status:"Live"},{label:"Realtime",status:"Active"},{label:"Users",status:`${kpis.totalUsers||0} accounts`},{label:"System",status:"All operational"}].map(s=>(
          <div key={s.label} className="bg-white rounded-lg border border-slate-200 p-3 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <div><p className="text-xs font-semibold text-slate-700">{s.label}</p><p className="text-xs text-slate-400">{s.status}</p></div>
          </div>
        ))}
      </div>
    </div>
  );
}
