import { useNavigate } from "react-router-dom";
import {
  DollarSign, TrendingUp, TrendingDown, PiggyBank, CreditCard,
  BarChart2, ArrowRight, FileText, Scale, Landmark
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const financialKpis = [
  { label: "Total Revenue (MTD)", value: "KES 8,420,000", icon: TrendingUp, color: "green", change: "+8.3%" },
  { label: "Total Expenses (MTD)", value: "KES 6,190,000", icon: TrendingDown, color: "red", change: "+5.1%" },
  { label: "Net Surplus", value: "KES 2,230,000", icon: Scale, color: "blue", change: "+15.2%" },
  { label: "Cash & Bank", value: "KES 3,845,600", icon: Landmark, color: "indigo", change: "Available" },
  { label: "Accounts Payable", value: "KES 1,234,500", icon: CreditCard, color: "orange", change: "12 invoices" },
  { label: "Accounts Receivable", value: "KES 890,200", icon: DollarSign, color: "teal", change: "8 outstanding" },
  { label: "Budget Utilized", value: "68.4%", icon: PiggyBank, color: "purple", change: "KES 2.9M left" },
  { label: "Open Vouchers", value: "14", icon: FileText, color: "amber", change: "Pending approval" },
];

const quickLinks = [
  { label: "Payment Vouchers", path: "/vouchers/payment", icon: FileText, color: "bg-blue-600" },
  { label: "Receipt Vouchers", path: "/vouchers/receipt", icon: DollarSign, color: "bg-green-600" },
  { label: "Journal Entries", path: "/vouchers/journal", icon: BarChart2, color: "bg-indigo-600" },
  { label: "Trial Balance", path: "/financials/trial-balance", icon: Scale, color: "bg-purple-600" },
  { label: "Chart of Accounts", path: "/financials/chart-of-accounts", icon: FileText, color: "bg-teal-600" },
  { label: "Bank Reconciliation", path: "/financials/bank-reconciliation", icon: Landmark, color: "bg-orange-600" },
];

const recentVouchers = [
  { no: "PV/EL5H/202603/0089", type: "Payment", amount: "KES 145,000", payee: "PHARMALINK LTD", status: "Approved" },
  { no: "RV/EL5H/202603/0034", type: "Receipt", amount: "KES 320,000", payee: "MOH NHIF", status: "Confirmed" },
  { no: "JV/EL5H/202603/0012", type: "Journal", amount: "KES 89,400", payee: "Monthly Accruals", status: "Posted" },
  { no: "PINV/EL5H/202603/0055", type: "Purchase", amount: "KES 567,200", payee: "MEDEQUIP EAST AFRICA", status: "Pending" },
];

export default function FinancialDashboardPage() {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Financial Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Financial overview — March 2026</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">March 2026</Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
            <FileText className="w-4 h-4 mr-2" />Generate Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {financialKpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-lg bg-${kpi.color}-50`}>
                <kpi.icon className={`w-4 h-4 text-${kpi.color}-600`} />
              </div>
              <span className={`text-xs font-medium text-${kpi.color}-600`}>{kpi.change}</span>
            </div>
            <p className="text-xl font-bold text-slate-800 mt-2">{kpi.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">Finance Quick Access</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickLinks.map((link) => (
              <button key={link.label} onClick={() => navigate(link.path)}
                className={`${link.color} text-white rounded-lg p-3 text-left hover:opacity-90 transition-opacity`}>
                <link.icon className="w-5 h-5 mb-2" />
                <p className="text-xs font-semibold">{link.label}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Recent Vouchers</h2>
            <Button variant="ghost" size="sm" className="text-xs text-blue-600" onClick={() => navigate("/vouchers/payment")}>
              View All <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
          <div className="space-y-2">
            {recentVouchers.map((v) => (
              <div key={v.no} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-700">{v.no}</p>
                  <p className="text-xs text-slate-400">{v.type} · {v.payee}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-800">{v.amount}</p>
                  <Badge variant="outline" className={`text-xs ${
                    v.status === "Approved" ? "text-green-600 border-green-200" :
                    v.status === "Confirmed" ? "text-blue-600 border-blue-200" :
                    v.status === "Posted" ? "text-indigo-600 border-indigo-200" :
                    "text-amber-600 border-amber-200"
                  }`}>{v.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
