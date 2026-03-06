import { useNavigate } from "react-router-dom";
import { Globe, FileText, CheckCircle, Clock, DollarSign, Star, Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const vendorStats = [
  { label: "Registered Vendors", value: "89", icon: Globe, color: "blue", sub: "approved suppliers" },
  { label: "Pending Applications", value: "12", icon: Clock, color: "amber", sub: "awaiting review" },
  { label: "Active Contracts", value: "23", icon: CheckCircle, color: "green", sub: "current agreements" },
  { label: "Avg Vendor Score", value: "87.4%", icon: Star, color: "yellow", sub: "performance rating" },
];

const recentVendors = [
  { name: "PHARMALINK LTD", category: "Pharmaceuticals", status: "Approved", score: 94, joined: "Jan 2024" },
  { name: "MEDEQUIP EAST AFRICA", category: "Equipment", status: "Approved", score: 88, joined: "Mar 2024" },
  { name: "SUNRISE MEDICAL SUPPLIES", category: "Supplies", status: "Pending", score: null, joined: "Mar 2026" },
  { name: "CONTINENTAL PHARMA", category: "Pharmaceuticals", status: "Under Review", score: null, joined: "Feb 2026" },
  { name: "COSMOS PHARMACEUTICALS", category: "Pharmaceuticals", status: "Approved", score: 86, joined: "Jun 2023" },
];

export default function VendorDashboardPage() {
  const navigate = useNavigate();
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Vendor Portal</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage suppliers, registrations, and performance</p>
        </div>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => navigate("/vendor-registration")}>
          <Plus className="w-4 h-4 mr-2" />Register Vendor
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {vendorStats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className={`p-2 rounded-lg bg-${s.color}-50 w-fit mb-3`}>
              <s.icon className={`w-5 h-5 text-${s.color}-600`} />
            </div>
            <p className="text-2xl font-bold text-slate-800">{s.value}</p>
            <p className="text-xs font-medium text-slate-700 mt-0.5">{s.label}</p>
            <p className="text-xs text-slate-400">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Vendor Registry</h2>
          <Button variant="ghost" size="sm" className="text-xs text-blue-600" onClick={() => navigate("/suppliers")}>
            Full List <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>{["Vendor Name", "Category", "Performance", "Status", "Since"].map(h => (
              <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-600">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {recentVendors.map((v) => (
              <tr key={v.name} className="hover:bg-slate-50">
                <td className="px-3 py-2 font-medium">{v.name}</td>
                <td className="px-3 py-2 text-slate-500">{v.category}</td>
                <td className="px-3 py-2">
                  {v.score ? (
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${v.score}%` }} />
                      </div>
                      <span className="text-xs">{v.score}%</span>
                    </div>
                  ) : <span className="text-xs text-slate-400">N/A</span>}
                </td>
                <td className="px-3 py-2">
                  <Badge variant="outline" className={
                    v.status === "Approved" ? "text-green-600 border-green-200" :
                    v.status === "Pending" ? "text-amber-600 border-amber-200" :
                    "text-blue-600 border-blue-200"
                  }>{v.status}</Badge>
                </td>
                <td className="px-3 py-2 text-slate-500">{v.joined}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
