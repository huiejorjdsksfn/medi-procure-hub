import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Shield, CheckCircle, XCircle, AlertTriangle, RefreshCw, Plus, Activity } from "lucide-react";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";

export default function QualityDashboardPage() {
  const navigate = useNavigate();
  const { data: inspections, refetch: ri } = useRealtimeTable("inspections", { order: { column: "created_at" } });
  const { data: ncrs, refetch: rn } = useRealtimeTable("non_conformance", { order: { column: "created_at" } });

  const insp = inspections as any[];
  const ncrList = ncrs as any[];

  const passed = insp.filter(i => i.result === "pass").length;
  const failed = insp.filter(i => i.result === "fail").length;
  const pending = insp.filter(i => i.result === "pending").length;
  const conditional = insp.filter(i => i.result === "conditional").length;
  const passRate = insp.length > 0 ? Math.round(passed / insp.length * 100) : 0;

  const openNCR = ncrList.filter(n => n.status === "open").length;
  const underReview = ncrList.filter(n => n.status === "under_review").length;
  const resolved = ncrList.filter(n => n.status === "resolved").length;
  const critical = ncrList.filter(n => n.severity === "critical").length;
  const major = ncrList.filter(n => n.severity === "major").length;

  const refetch = () => { ri(); rn(); };

  return (
    <div className="min-h-screen bg-[#f3f2f1]">
      <div className="bg-white border-b border-[#e1dfdd] px-6 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-[#0078d4]" />
            <div>
              <h1 className="text-base font-bold text-[#323130]">Quality Control Dashboard</h1>
              <p className="text-xs text-[#605e5c]">Inspections · Non-Conformance · Realtime</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={refetch}><RefreshCw className="w-3.5 h-3.5 mr-1" />Refresh</Button>
            <Button size="sm" className="bg-[#0078d4] hover:bg-[#106ebe] text-white" onClick={() => navigate("/quality/inspections")}><Plus className="w-3.5 h-3.5 mr-1" />New Inspection</Button>
            <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => navigate("/quality/non-conformance")}><Plus className="w-3.5 h-3.5 mr-1" />Raise NCR</Button>
          </div>
        </div>
      </div>

      <div className="px-6 py-5 max-w-[1200px] mx-auto space-y-5">
        {/* Big KPI row */}
        <div className="bg-white border border-[#e1dfdd] rounded shadow-sm">
          <div className="px-5 py-3 border-b border-[#e1dfdd]"><p className="text-[10px] font-bold uppercase tracking-widest text-[#605e5c]">QUALITY OVERVIEW</p></div>
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-[#e1dfdd]">
            {[
              { label: "PASS RATE", val: `${passRate}%`, color: passRate >= 80 ? "#107c10" : passRate >= 60 ? "#ca5010" : "#a4262c" },
              { label: "TOTAL INSPECTIONS", val: insp.length, color: "#0078d4" },
              { label: "OPEN NCRs", val: openNCR, color: openNCR > 0 ? "#a4262c" : "#107c10" },
              { label: "CRITICAL ISSUES", val: critical, color: critical > 0 ? "#a4262c" : "#107c10" },
            ].map(k => (
              <div key={k.label} className="px-5 py-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#605e5c] mb-2">{k.label}</p>
                <p className="text-[42px] font-bold leading-none" style={{ color: k.color }}>{k.val}</p>
                <div className="h-[3px] w-10 mt-2 rounded" style={{ backgroundColor: k.color }} />
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Inspection tiles */}
          <div className="bg-white border border-[#e1dfdd] rounded shadow-sm">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#e1dfdd]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#605e5c]">INSPECTIONS</p>
              <button onClick={() => navigate("/quality/inspections")} className="text-xs text-[#0078d4] hover:underline flex items-center gap-1">View All <ChevronRight className="w-3 h-3" /></button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-[#e1dfdd]">
              {[
                { label: "PASSED", val: passed, color: "#107c10", icon: CheckCircle },
                { label: "FAILED", val: failed, color: "#a4262c", icon: XCircle },
                { label: "PENDING", val: pending, color: "#ca5010", icon: AlertTriangle },
                { label: "CONDITIONAL", val: conditional, color: "#0078d4", icon: Shield },
              ].map(t => (
                <button key={t.label} onClick={() => navigate("/quality/inspections")}
                  className="p-3 text-left hover:bg-[#f3f2f1] transition-colors group">
                  <t.icon className="w-4 h-4 mb-2" style={{ color: t.color }} />
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[#605e5c]">{t.label}</p>
                  <p className="text-3xl font-bold leading-none mt-1" style={{ color: t.color }}>{t.val}</p>
                  <ChevronRight className="w-3.5 h-3.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: t.color }} />
                </button>
              ))}
            </div>
          </div>

          {/* NCR tiles */}
          <div className="bg-white border border-[#e1dfdd] rounded shadow-sm">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#e1dfdd]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#605e5c]">NON-CONFORMANCE</p>
              <button onClick={() => navigate("/quality/non-conformance")} className="text-xs text-[#0078d4] hover:underline flex items-center gap-1">View All <ChevronRight className="w-3 h-3" /></button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 divide-x divide-[#e1dfdd]">
              {[
                { label: "OPEN", val: openNCR, color: openNCR > 0 ? "#a4262c" : "#107c10" },
                { label: "UNDER REVIEW", val: underReview, color: "#ca5010" },
                { label: "RESOLVED", val: resolved, color: "#107c10" },
              ].map(t => (
                <button key={t.label} onClick={() => navigate("/quality/non-conformance")}
                  className="p-3 text-left hover:bg-[#f3f2f1] transition-colors group">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[#605e5c]">{t.label}</p>
                  <p className="text-3xl font-bold leading-none mt-1" style={{ color: t.color }}>{t.val}</p>
                  <ChevronRight className="w-3.5 h-3.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity text-[#0078d4]" />
                </button>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-[#e1dfdd] flex items-center gap-4">
              {[{ label: "Critical", val: critical, color: "bg-red-100 text-red-700" }, { label: "Major", val: major, color: "bg-amber-100 text-amber-700" }, { label: "Minor", val: ncrList.filter(n => n.severity === "minor").length, color: "bg-blue-100 text-blue-700" }].map(s => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.color}`}>{s.val} {s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent inspections */}
        <div className="bg-white border border-[#e1dfdd] rounded shadow-sm">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#e1dfdd]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#605e5c]">RECENT INSPECTIONS</p>
            <button onClick={() => navigate("/quality/inspections")} className="text-xs text-[#0078d4] hover:underline">View All</button>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="bg-[#f3f2f1] border-b border-[#e1dfdd]">{["Inspection No.", "Supplier", "Item", "Qty Inspected", "Result", "Date"].map(h => <th key={h} className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-[#605e5c]">{h}</th>)}</tr></thead>
            <tbody>
              {insp.slice(0, 6).map((i: any) => <tr key={i.id} className="border-b border-[#f3f2f1] hover:bg-[#f3f2f1] transition-colors cursor-pointer" onClick={() => navigate("/quality/inspections")}>
                <td className="px-4 py-2.5 font-mono text-xs font-bold text-[#0078d4]">{i.inspection_number}</td>
                <td className="px-4 py-2.5 text-[#323130]">{i.supplier_name || "—"}</td>
                <td className="px-4 py-2.5 text-[#605e5c]">{i.item_name || "—"}</td>
                <td className="px-4 py-2.5">{i.quantity_inspected}</td>
                <td className="px-4 py-2.5"><Badge variant="outline" className={`capitalize text-xs ${i.result === "pass" ? "text-green-700 border-green-200 bg-green-50" : i.result === "fail" ? "text-red-700 border-red-200 bg-red-50" : i.result === "conditional" ? "text-blue-700 border-blue-200 bg-blue-50" : "text-amber-700 border-amber-200 bg-amber-50"}`}>{i.result}</Badge></td>
                <td className="px-4 py-2.5 text-[#605e5c]">{i.inspection_date}</td>
              </tr>)}
              {insp.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-[#605e5c]">No inspections recorded yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
