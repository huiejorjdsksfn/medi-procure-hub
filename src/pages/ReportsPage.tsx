import { useNavigate } from "react-router-dom";
import { BarChart2, FileText, Download, TrendingUp, Package, DollarSign, Shield, Users, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const reportCategories = [
  {
    title: "Procurement Reports", color: "blue", icon: FileText,
    reports: [
      { name: "Purchase Orders Summary", desc: "All POs by period, supplier, or department", tag: "Daily" },
      { name: "Requisitions Status Report", desc: "Outstanding and completed requisitions", tag: "Weekly" },
      { name: "Supplier Performance Report", desc: "Delivery, quality, and pricing analysis", tag: "Monthly" },
      { name: "Tender Award Report", desc: "Tender decisions and award justifications", tag: "On Demand" },
      { name: "Contract Expiry Report", desc: "Contracts due for renewal in next 90 days", tag: "Monthly" },
    ]
  },
  {
    title: "Financial Reports", color: "green", icon: DollarSign,
    reports: [
      { name: "Expenditure Summary", desc: "Spend by department, category, and supplier", tag: "Monthly" },
      { name: "Budget Utilization Report", desc: "Budget vs actual with variance analysis", tag: "Monthly" },
      { name: "Outstanding Invoices", desc: "Accounts payable aging report", tag: "Weekly" },
      { name: "Payment Vouchers Register", desc: "All payment transactions by period", tag: "Daily" },
      { name: "Trial Balance", desc: "Debit and credit balances by account", tag: "Monthly" },
    ]
  },
  {
    title: "Inventory Reports", color: "indigo", icon: Package,
    reports: [
      { name: "Stock Status Report", desc: "Current stock levels across all locations", tag: "Daily" },
      { name: "Stock Movements Report", desc: "In/out movements for selected period", tag: "Daily" },
      { name: "Reorder Level Alert Report", desc: "Items below minimum stock threshold", tag: "Daily" },
      { name: "Inventory Valuation Report", desc: "Total stock value by item and category", tag: "Monthly" },
      { name: "Slow Moving Stock Report", desc: "Items with no movement in 90+ days", tag: "Monthly" },
    ]
  },
  {
    title: "Quality Reports", color: "teal", icon: Shield,
    reports: [
      { name: "Inspection Summary", desc: "Pass/fail rates by supplier and category", tag: "Monthly" },
      { name: "NCR Register", desc: "Non-conformance records and resolutions", tag: "Weekly" },
      { name: "Rejection Rate Analysis", desc: "Batch rejection trends by supplier", tag: "Monthly" },
    ]
  },
];

const tagColor = (tag: string) => ({
  "Daily": "text-blue-600 border-blue-200 bg-blue-50",
  "Weekly": "text-green-600 border-green-200 bg-green-50",
  "Monthly": "text-purple-600 border-purple-200 bg-purple-50",
  "On Demand": "text-amber-600 border-amber-200 bg-amber-50",
}[tag] ?? "text-slate-600 border-slate-200");

export default function ReportsPage() {
  const navigate = useNavigate();
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reports Centre</h1>
          <p className="text-sm text-slate-500 mt-0.5">Generate and download operational reports</p>
        </div>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => navigate("/analytics")}>
          <BarChart2 className="w-4 h-4 mr-2" />Analytics Dashboard
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportCategories.map((cat) => (
          <div key={cat.title} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <cat.icon className={`w-5 h-5 text-${cat.color}-500`} />{cat.title}
            </h2>
            <div className="space-y-2">
              {cat.reports.map((r) => (
                <div key={r.name} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 transition-colors group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700">{r.name}</p>
                    <p className="text-xs text-slate-400 truncate">{r.desc}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    <Badge variant="outline" className={`text-xs ${tagColor(r.tag)}`}>{r.tag}</Badge>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100">
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100">
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
