import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, RefreshCw, Plus, TrendingUp, TrendingDown, DollarSign, PiggyBank, Building2, BookMarked, BarChart3 } from "lucide-react";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";

const fmt = (n: number) =>
  n >= 1_000_000 ? `KES ${(n/1_000_000).toFixed(2)}M`
  : `KES ${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const today = new Date().toISOString().split("T")[0];
const thisMonth = today.slice(0, 7);

export default function FinancialDashboardPage() {
  const navigate = useNavigate();
  const { data: pv, refetch: rpv } = useRealtimeTable("payment_vouchers", { order: { column: "created_at" } });
  const { data: rv, refetch: rrv } = useRealtimeTable("receipt_vouchers", { order: { column: "created_at" } });
  const { data: jv, refetch: rjv } = useRealtimeTable("journal_vouchers", { order: { column: "created_at" } });
  const { data: budgets, refetch: rb } = useRealtimeTable("budgets", { order: { column: "created_at" } });
  const { data: coa } = useRealtimeTable("chart_of_accounts");
  const { data: banks } = useRealtimeTable("bank_accounts");

  const pvRows = pv as any[];
  const rvRows = rv as any[];
  const jvRows = jv as any[];
  const budgetRows = budgets as any[];

  const pvMTD = pvRows.filter(v => v.voucher_date?.startsWith(thisMonth));
  const rvMTD = rvRows.filter(v => v.receipt_date?.startsWith(thisMonth));

  const totalPending = pvRows.filter(v => ["pending","approved"].includes(v.status)).reduce((s, v) => s + Number(v.amount || 0), 0);
  const totalPaid = pvMTD.filter(v => v.status === "paid").reduce((s, v) => s + Number(v.amount || 0), 0);
  const totalReceivedMTD = rvMTD.reduce((s, v) => s + Number(v.amount || 0), 0);
  const totalReceived = rvRows.reduce((s, v) => s + Number(v.amount || 0), 0);
  const netMTD = totalReceivedMTD - totalPaid;

  const totalAllocated = budgetRows.reduce((s, b) => s + Number(b.allocated_amount || 0), 0);
  const totalSpent = budgetRows.reduce((s, b) => s + Number(b.spent_amount || 0), 0);
  const budgetUtil = totalAllocated > 0 ? Math.round(totalSpent / totalAllocated * 100) : 0;

  const cashBalance = (banks as any[]).reduce((s, b) => s + Number(b.balance || 0), 0);

  const refetch = () => { rpv(); rrv(); rjv(); rb(); };

  const navCards = [
    { label: "Payment Vouchers", icon: DollarSign, path: "/vouchers/payment", color: "#0078d4" },
    { label: "Receipt Vouchers", icon: TrendingUp, path: "/vouchers/receipt", color: "#107c10" },
    { label: "Journal Entries", icon: BookMarked, path: "/vouchers/journal", color: "#8764b8" },
    { label: "Chart of Accounts", icon: BarChart3, path: "/financials/chart-of-accounts", color: "#ca5010" },
    { label: "Budgets", icon: PiggyBank, path: "/financials/budgets", color: "#038387" },
    { label: "Fixed Assets", icon: Building2, path: "/financials/fixed-assets", color: "#c43e1c" },
  ];

  return (
    <div className="min-h-screen bg-[#f3f2f1]">
      <div className="bg-white border-b border-[#e1dfdd] px-6 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-[#0078d4]" />
            <div>
              <h1 className="text-base font-bold text-[#323130]">Finance Dashboard</h1>
              
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={refetch}><RefreshCw className="w-3.5 h-3.5 mr-1" />Refresh</Button>
            <Button size="sm" className="bg-[#0078d4] hover:bg-[#106ebe] text-white" onClick={() => navigate("/vouchers/payment")}><Plus className="w-3.5 h-3.5 mr-1" />New Payment</Button>
            <Button size="sm" className="bg-[#107c10] hover:bg-[#0e6b0e] text-white" onClick={() => navigate("/vouchers/receipt")}><Plus className="w-3.5 h-3.5 mr-1" />Record Receipt</Button>
          </div>
        </div>
      </div>

      <div className="px-6 py-5 max-w-[1200px] mx-auto space-y-5">
        {/* Big headline KPIs */}
        <div className="bg-white border border-[#e1dfdd] rounded shadow-sm">
          <div className="px-5 py-3 border-b border-[#e1dfdd]"><p className="text-[10px] font-bold uppercase tracking-widest text-[#605e5c]">FINANCIAL SUMMARY</p></div>
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-[#e1dfdd]">
            {[
              { label: "RECEIPTS THIS MONTH", val: fmt(totalReceivedMTD), color: "#107c10", sub: `${rvMTD.length} transactions` },
              { label: "PAYMENTS THIS MONTH", val: fmt(totalPaid), color: "#0078d4", sub: `${pvMTD.filter(v => v.status === "paid").length} paid` },
              { label: "OUTSTANDING PAYABLES", val: fmt(totalPending), color: totalPending > 0 ? "#a4262c" : "#107c10", sub: `${pvRows.filter(v => ["pending","approved"].includes(v.status)).length} vouchers` },
              { label: "CASH & BANK BALANCE", val: fmt(cashBalance), color: "#323130", sub: `${(banks as any[]).length} accounts` },
            ].map(k => (
              <div key={k.label} className="px-5 py-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#605e5c] mb-2">{k.label}</p>
                <p className="text-[38px] font-bold leading-none" style={{ color: k.color }}>{k.val}</p>
                <p className="text-xs text-[#605e5c] mt-1">{k.sub}</p>
                <div className="h-[3px] w-10 mt-2 rounded" style={{ backgroundColor: k.color }} />
              </div>
            ))}
          </div>
        </div>

        {/* Quick nav tiles */}
        <div className="bg-white border border-[#e1dfdd] rounded shadow-sm">
          <div className="px-4 py-2.5 border-b border-[#e1dfdd]"><p className="text-[10px] font-bold uppercase tracking-widest text-[#605e5c]">FINANCE MODULES</p></div>
          <div className="grid grid-cols-3 md:grid-cols-6 divide-x divide-[#e1dfdd]">
            {navCards.map(c => (
              <button key={c.label} onClick={() => navigate(c.path)}
                className="p-4 text-left hover:bg-[#f3f2f1] transition-colors group flex flex-col items-start">
                <div className="w-8 h-8 rounded flex items-center justify-center mb-3" style={{ backgroundColor: `${c.color}15` }}>
                  <c.icon className="w-4 h-4" style={{ color: c.color }} />
                </div>
                <p className="text-xs font-semibold text-[#323130] leading-tight">{c.label}</p>
                <ChevronRight className="w-3.5 h-3.5 mt-2 text-[#a19f9d] opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Recent Payments */}
          <div className="bg-white border border-[#e1dfdd] rounded shadow-sm">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#e1dfdd]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#605e5c]">RECENT PAYMENT VOUCHERS</p>
              <button onClick={() => navigate("/vouchers/payment")} className="text-xs text-[#0078d4] hover:underline">View All</button>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="bg-[#f3f2f1]">{["Voucher", "Payee", "Amount", "Status"].map(h => <th key={h} className="px-4 py-2 text-left text-[10px] font-bold uppercase text-[#605e5c]">{h}</th>)}</tr></thead>
              <tbody>
                {pvRows.slice(0, 6).map((v: any) => (
                  <tr key={v.id} className="border-t border-[#f3f2f1] hover:bg-[#f3f2f1] cursor-pointer" onClick={() => navigate("/vouchers/payment")}>
                    <td className="px-4 py-2 font-mono text-[11px] font-bold text-[#0078d4]">{v.voucher_number}</td>
                    <td className="px-4 py-2 text-[#323130]">{v.payee_name}</td>
                    <td className="px-4 py-2 font-semibold">KES {Number(v.amount || 0).toLocaleString()}</td>
                    <td className="px-4 py-2"><Badge variant="outline" className={`text-[10px] capitalize ${v.status === "paid" ? "text-green-700 border-green-200 bg-green-50" : v.status === "approved" ? "text-blue-700 border-blue-200 bg-blue-50" : v.status === "pending" ? "text-amber-700 border-amber-200 bg-amber-50" : "text-red-700 border-red-200 bg-red-50"}`}>{v.status}</Badge></td>
                  </tr>
                ))}
                {pvRows.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-[#605e5c]">No payment vouchers yet</td></tr>}
              </tbody>
            </table>
          </div>

          {/* Budget tracker */}
          <div className="bg-white border border-[#e1dfdd] rounded shadow-sm">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#e1dfdd]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#605e5c]">BUDGET UTILIZATION</p>
              <button onClick={() => navigate("/financials/budgets")} className="text-xs text-[#0078d4] hover:underline">Manage Budgets</button>
            </div>
            <div className="p-4">
              <div className="flex items-end gap-3 mb-4">
                <div>
                  <p className="text-xs text-[#605e5c]">Total Allocated</p>
                  <p className="text-2xl font-bold text-[#323130]">{fmt(totalAllocated)}</p>
                </div>
                <div className="text-[#605e5c] pb-1 text-sm">→</div>
                <div>
                  <p className="text-xs text-[#605e5c]">Spent</p>
                  <p className="text-2xl font-bold" style={{ color: budgetUtil > 90 ? "#a4262c" : budgetUtil > 70 ? "#ca5010" : "#107c10" }}>{fmt(totalSpent)}</p>
                </div>
              </div>
              <div className="relative h-4 bg-[#f3f2f1] rounded-full overflow-hidden mb-2">
                <div className="absolute inset-y-0 left-0 rounded-full transition-all" style={{ width: `${Math.min(budgetUtil, 100)}%`, backgroundColor: budgetUtil > 90 ? "#a4262c" : budgetUtil > 70 ? "#ca5010" : "#0078d4" }} />
              </div>
              <div className="flex justify-between text-xs text-[#605e5c]">
                <span>{budgetUtil}% utilized</span>
                <span>{fmt(totalAllocated - totalSpent)} remaining</span>
              </div>
              <div className="mt-4 space-y-2">
                {budgetRows.slice(0, 4).map((b: any) => {
                  const pct = b.allocated_amount > 0 ? Math.round(b.spent_amount / b.allocated_amount * 100) : 0;
                  return (
                    <div key={b.id}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#323130] font-medium truncate">{b.budget_name}</span>
                        <span className={`font-bold ${pct > 90 ? "text-[#a4262c]" : pct > 70 ? "text-[#ca5010]" : "text-[#107c10]"}`}>{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-[#f3f2f1] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: pct > 90 ? "#a4262c" : pct > 70 ? "#ca5010" : "#0078d4" }} />
                      </div>
                    </div>
                  );
                })}
                {budgetRows.length === 0 && <p className="text-center text-[#605e5c] text-sm py-4">No budgets created yet</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Bank accounts */}
        {(banks as any[]).length > 0 && (
          <div className="bg-white border border-[#e1dfdd] rounded shadow-sm">
            <div className="px-4 py-2.5 border-b border-[#e1dfdd]"><p className="text-[10px] font-bold uppercase tracking-widest text-[#605e5c]">BANK ACCOUNTS</p></div>
            <div className="grid grid-cols-1 md:grid-cols-3 divide-x divide-[#e1dfdd]">
              {(banks as any[]).map((b: any) => (
                <div key={b.id} className="px-5 py-4">
                  <p className="text-xs font-bold text-[#323130]">{b.account_name}</p>
                  <p className="text-xs text-[#605e5c] mb-2">{b.bank_name} · {b.account_number}</p>
                  <p className="text-2xl font-bold text-[#0078d4]">KES {Number(b.balance || 0).toLocaleString()}</p>
                  <Badge variant="outline" className={`mt-1 text-[10px] ${b.status === "active" ? "text-green-700 border-green-200" : "text-red-700 border-red-200"}`}>{b.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
