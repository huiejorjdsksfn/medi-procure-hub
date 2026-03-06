import { BarChart2, TrendingUp, PieChart, Activity, DollarSign, Package, Truck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const metrics = [
  { label: "Avg PO Processing", value: "3.2 days", icon: BarChart2, color: "blue", trend: "↓ 0.5 days" },
  { label: "Supplier On-Time %", value: "91.4%", icon: Truck, color: "green", trend: "↑ 2.1%" },
  { label: "Spend per Dept.", value: "KES 428K", icon: DollarSign, color: "indigo", trend: "avg/dept" },
  { label: "Stock Turnover", value: "4.2x", icon: Package, color: "orange", trend: "annual" },
  { label: "Active Users", value: "34", icon: Users, color: "teal", trend: "this session" },
  { label: "Savings (vs Budget)", value: "KES 310K", icon: TrendingUp, color: "purple", trend: "↑ 8.3%" },
];

const spendByCategory = [
  { cat: "Pharmaceuticals", amt: "KES 1,840,000", pct: 43 },
  { cat: "Medical Supplies", amt: "KES 920,000", pct: 21 },
  { cat: "Equipment", amt: "KES 680,000", pct: 16 },
  { cat: "Lab Reagents", amt: "KES 510,000", pct: 12 },
  { cat: "Other", amt: "KES 335,600", pct: 8 },
];

const colors = ["bg-blue-500", "bg-green-500", "bg-orange-500", "bg-purple-500", "bg-slate-400"];

export default function AnalyticsDashboardPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Analytics Hub</h1>
          <p className="text-sm text-slate-500 mt-0.5">Procurement & operational analytics — FY 2025/26</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">Q3 2025/26</Button>
          <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
            <Activity className="w-4 h-4 mr-2" />Custom Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className={`p-2 rounded-lg bg-${m.color}-50 w-fit mb-3`}>
              <m.icon className={`w-5 h-5 text-${m.color}-600`} />
            </div>
            <p className="text-2xl font-bold text-slate-800">{m.value}</p>
            <p className="text-xs font-medium text-slate-700 mt-0.5">{m.label}</p>
            <p className="text-xs text-slate-400">{m.trend}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide flex items-center gap-2">
            <PieChart className="w-4 h-4 text-blue-500" />Spend by Category (MTD)
          </h2>
          <div className="space-y-3">
            {spendByCategory.map((item, i) => (
              <div key={item.cat}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-700">{item.cat}</span>
                  <span className="text-sm font-medium text-slate-800">{item.amt} <span className="text-slate-400 text-xs">({item.pct}%)</span></span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${colors[i]} rounded-full`} style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-green-500" />Monthly PO Volume (FY 2025/26)
          </h2>
          <div className="flex items-end gap-1 h-36">
            {[42, 58, 71, 65, 88, 95, 78, 110, 134, 127].map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-blue-500 rounded-t" style={{ height: `${(v / 134) * 120}px` }} />
                <span className="text-xs text-slate-400 hidden md:block">{["Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr"][i]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
