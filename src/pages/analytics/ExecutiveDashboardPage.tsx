import { TrendingUp, DollarSign, ShoppingCart, Package, Shield, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const execKpis = [
  { label: "Total Procurement Spend", value: "KES 42.8M", period: "FY 2025/26 YTD", change: "+12%", up: true },
  { label: "Cost Savings Achieved", value: "KES 3.1M", period: "vs approved budget", change: "7.2% savings", up: true },
  { label: "Supplier Performance", value: "87.4%", period: "average score", change: "↑ 2.3%", up: true },
  { label: "Procurement Compliance", value: "94.8%", period: "policy adherence", change: "Target: 95%", up: false },
  { label: "Active Contracts", value: "23", period: "across all suppliers", change: "3 expiring soon", up: false },
  { label: "Emergency Purchases", value: "KES 890K", period: "non-competitive", change: "2.1% of spend", up: true },
];

const topSuppliers = [
  { name: "PHARMALINK LTD", spend: "KES 8,200,000", score: 94, category: "Pharmaceuticals" },
  { name: "MEDEQUIP EAST AFRICA", spend: "KES 5,600,000", score: 88, category: "Equipment" },
  { name: "HEALTH CARE SUPPLIES", spend: "KES 4,100,000", score: 91, category: "Supplies" },
  { name: "COSMOS PHARMACEUTICALS", spend: "KES 3,800,000", score: 86, category: "Pharmaceuticals" },
  { name: "SAVANNA MEDICAL", spend: "KES 2,900,000", score: 79, category: "Mixed" },
];

export default function ExecutiveDashboardPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Executive Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">C-Suite & Senior Management overview — FY 2025/26</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-blue-600 border-blue-200">Q3 FY 2025/26</Badge>
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Award className="w-4 h-4 mr-2" />Board Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {execKpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <p className="text-3xl font-bold text-slate-800">{kpi.value}</p>
            <p className="text-sm font-semibold text-slate-700 mt-2">{kpi.label}</p>
            <p className="text-xs text-slate-400 mt-0.5">{kpi.period}</p>
            <span className={`text-xs font-medium mt-2 inline-block ${kpi.up ? "text-green-600" : "text-amber-600"}`}>
              {kpi.change}
            </span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide flex items-center gap-2">
          <Shield className="w-4 h-4 text-teal-500" />Top 5 Suppliers by Spend
        </h2>
        <div className="space-y-3">
          {topSuppliers.map((s, i) => (
            <div key={s.name} className="flex items-center gap-4">
              <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                {i + 1}
              </span>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-700">{s.name}</p>
                  <p className="text-sm font-semibold text-slate-800">{s.spend}</p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${s.score}%` }} />
                  </div>
                  <span className="text-xs text-slate-500">{s.score}% score</span>
                  <Badge variant="outline" className="text-xs">{s.category}</Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
