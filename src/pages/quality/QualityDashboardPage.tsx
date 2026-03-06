import { useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, AlertTriangle, ClipboardCheck, Shield, TrendingUp, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const kpis = [
  { label: "Inspections (MTD)", value: "142", icon: ClipboardCheck, color: "green", sub: "98.6% pass rate" },
  { label: "Open NCRs", value: "7", icon: XCircle, color: "red", sub: "3 critical" },
  { label: "Resolved NCRs", value: "34", icon: CheckCircle, color: "blue", sub: "this quarter" },
  { label: "Supplier Quality Score", value: "87.4%", icon: Shield, color: "teal", sub: "avg across vendors" },
  { label: "Batch Rejections", value: "4", icon: AlertTriangle, color: "amber", sub: "this month" },
  { label: "Quality Compliance", value: "96.8%", icon: TrendingUp, color: "indigo", sub: "vs 95% target" },
];

const recentInspections = [
  { no: "QI-2026-0234", item: "Paracetamol 500mg", batch: "B-23401", supplier: "PHARMALINK", result: "Pass", date: "06/03/2026" },
  { no: "QI-2026-0233", item: "Surgical Gloves (L)", batch: "B-23387", supplier: "MEDEQUIP EA", result: "Fail", date: "05/03/2026" },
  { no: "QI-2026-0232", item: "IV Cannula 20G", batch: "B-23380", supplier: "HEALTH CARE LTD", result: "Pass", date: "05/03/2026" },
  { no: "QI-2026-0231", item: "Normal Saline 0.9%", batch: "B-23376", supplier: "COSMOS LTD", result: "Pass", date: "04/03/2026" },
];

export default function QualityDashboardPage() {
  const navigate = useNavigate();
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quality Control Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Inspection & non-conformance overview — March 2026</p>
        </div>
        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => navigate("/quality/inspections")}>
          <ClipboardCheck className="w-4 h-4 mr-2" />New Inspection
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className={`p-2 rounded-lg bg-${kpi.color}-50 w-fit mb-3`}>
              <kpi.icon className={`w-5 h-5 text-${kpi.color}-600`} />
            </div>
            <p className="text-2xl font-bold text-slate-800">{kpi.value}</p>
            <p className="text-xs font-medium text-slate-700 mt-0.5">{kpi.label}</p>
            <p className="text-xs text-slate-400">{kpi.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Recent Inspections</h2>
          <Button variant="ghost" size="sm" className="text-xs text-blue-600" onClick={() => navigate("/quality/inspections")}>
            View All <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>{["Insp. No.", "Item", "Batch", "Supplier", "Result", "Date"].map(h => (
              <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-600">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {recentInspections.map((r) => (
              <tr key={r.no} className="hover:bg-slate-50">
                <td className="px-3 py-2 font-mono text-xs text-blue-600">{r.no}</td>
                <td className="px-3 py-2">{r.item}</td>
                <td className="px-3 py-2 text-slate-500">{r.batch}</td>
                <td className="px-3 py-2">{r.supplier}</td>
                <td className="px-3 py-2">
                  <Badge variant="outline" className={r.result === "Pass" ? "text-green-600 border-green-200" : "text-red-600 border-red-200"}>
                    {r.result}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-slate-500">{r.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
