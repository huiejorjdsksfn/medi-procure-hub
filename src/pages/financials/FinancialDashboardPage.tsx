import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { DollarSign, TrendingUp, TrendingDown, CreditCard, Landmark, FileText, ArrowRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function FinancialDashboardPage() {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState({payable:0,payableCount:0,receipts:0,receiptCount:0,paid:0,paidCount:0,pending:0,pendingCount:0});
  const [recentVouchers, setRecentVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const channels = ["payment_vouchers","receipt_vouchers","journal_vouchers","purchase_vouchers"].map(table =>
      (supabase as any).channel(`fin-rt-${table}`).on("postgres_changes",{event:"*",schema:"public",table},()=>fetchData()).subscribe()
    );
    return () => { channels.forEach(ch=>supabase.removeChannel(ch)); };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [pv, rv, pvPaid, pvPending] = await Promise.all([
      (supabase as any).from("purchase_vouchers").select("amount,status"),
      (supabase as any).from("receipt_vouchers").select("amount,status"),
      (supabase as any).from("payment_vouchers").select("amount,status").eq("status","paid"),
      (supabase as any).from("payment_vouchers").select("amount,status").eq("status","pending"),
    ]);
    const recent = await (supabase as any).from("payment_vouchers").select("*").order("created_at",{ascending:false}).limit(5);
    setKpis({
      payable: (pv.data||[]).filter((v:any)=>v.status!=="paid").reduce((s:number,v:any)=>s+Number(v.amount),0),
      payableCount: (pv.data||[]).filter((v:any)=>v.status!=="paid").length,
      receipts: (rv.data||[]).reduce((s:number,v:any)=>s+Number(v.amount),0),
      receiptCount: rv.data?.length||0,
      paid: (pvPaid.data||[]).reduce((s:number,v:any)=>s+Number(v.amount),0),
      paidCount: pvPaid.data?.length||0,
      pending: (pvPending.data||[]).reduce((s:number,v:any)=>s+Number(v.amount),0),
      pendingCount: pvPending.data?.length||0,
    });
    setRecentVouchers(recent.data||[]);
    setLoading(false);
  };

  const kpiCards = [
    {label:"Accounts Payable",value:`KES ${kpis.payable.toLocaleString()}`,sub:`${kpis.payableCount} invoices`,icon:CreditCard,color:"orange"},
    {label:"Total Receipts",value:`KES ${kpis.receipts.toLocaleString()}`,sub:`${kpis.receiptCount} receipts`,icon:TrendingUp,color:"green"},
    {label:"Paid (MTD)",value:`KES ${kpis.paid.toLocaleString()}`,sub:`${kpis.paidCount} payments`,icon:Landmark,color:"blue"},
    {label:"Pending Approval",value:`KES ${kpis.pending.toLocaleString()}`,sub:`${kpis.pendingCount} vouchers`,icon:FileText,color:"amber"},
  ];

  const quickLinks = [{label:"Payment Vouchers",path:"/vouchers/payment",color:"bg-blue-600"},{label:"Receipt Vouchers",path:"/vouchers/receipt",color:"bg-green-600"},{label:"Journal Entries",path:"/vouchers/journal",color:"bg-indigo-600"},{label:"Chart of Accounts",path:"/financials/chart-of-accounts",color:"bg-slate-700"},{label:"Trial Balance",path:"/financials/trial-balance",color:"bg-purple-600"},{label:"Bank Accounts",path:"/financials/bank-accounts",color:"bg-teal-600"}];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800">Financial Dashboard</h1><p className="text-sm text-slate-500 mt-0.5">Live financial overview — Embu Level 5 Hospital</p></div>
        <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className={`w-4 h-4 mr-2 ${loading?"animate-spin":""}`} />Refresh</Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiCards.map(k=>(
          <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className={`p-2 rounded-lg bg-${k.color}-50 w-fit mb-3`}><k.icon className={`w-5 h-5 text-${k.color}-600`} /></div>
            <p className="text-xl font-bold text-slate-800">{k.value}</p>
            <p className="text-xs font-medium text-slate-700 mt-0.5">{k.label}</p>
            <p className="text-xs text-slate-400">{k.sub}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">Finance Modules</h2>
          <div className="grid grid-cols-2 gap-2">
            {quickLinks.map(l=><button key={l.label} onClick={()=>navigate(l.path)} className={`${l.color} text-white rounded-lg p-3 text-left text-xs font-semibold hover:opacity-90`}>{l.label}</button>)}
          </div>
        </div>
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Recent Payment Vouchers</h2>
            <Button variant="ghost" size="sm" className="text-xs text-blue-600" onClick={()=>navigate("/vouchers/payment")}>View All <ArrowRight className="w-3 h-3 ml-1" /></Button>
          </div>
          {recentVouchers.length===0?<p className="text-sm text-slate-400 text-center py-6">No payment vouchers yet</p>
          :<div className="space-y-2">{recentVouchers.map(v=>(
            <div key={v.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
              <div><p className="text-sm font-medium text-slate-700">{v.voucher_number}</p><p className="text-xs text-slate-400">{v.payee_name}</p></div>
              <div className="text-right"><p className="text-sm font-semibold">KES {Number(v.amount).toLocaleString()}</p><Badge variant="outline" className="text-xs capitalize">{v.status}</Badge></div>
            </div>
          ))}</div>}
        </div>
      </div>
    </div>
  );
}
