import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart3, RefreshCw, TrendingUp, TrendingDown, Minus,
  Users, ShoppingCart, FileText, Package, Building2, Calendar,
  Database, Clock, CheckCircle2, XCircle, AlertTriangle, Activity,
  Download, Printer, List, Grid3X3, Filter, ArrowUpRight, ArrowDownRight,
  DownloadCloud, FileSpreadsheet, FileJson, PieChart,
} from "lucide-react";

// Time periods
const TIME_PERIODS = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "this_week", label: "This Week" },
  { key: "last_week", label: "Last Week" },
  { key: "this_month", label: "This Month" },
  { key: "last_month", label: "Last Month" },
  { key: "this_quarter", label: "This Quarter" },
  { key: "this_year", label: "This Year" },
  { key: "ytd", label: "Year to Date" },
];

const SystemReportPage = () => {
  const { toast } = useToast();
  
  // State
  const [timePeriod, setTimePeriod] = useState("this_month");
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  
  // Metrics
  const [metrics, setMetrics] = useState({
    requisitions: { total: 0, approved: 0, pending: 0, rejected: 0, trend: 0 },
    purchaseOrders: { total: 0, approved: 0, pending: 0, trend: 0 },
    grns: { total: 0, received: 0, pending: 0, trend: 0 },
    suppliers: { total: 0, active: 0, trend: 0 },
    items: { total: 0, lowStock: 0 },
    users: { total: 0, active: 0 },
  });

  // Table data
  const [tableData, setTableData] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  // Load departments
  const loadDepartments = async () => {
    try {
      const { data } = await (supabase as any).from("departments").select("id, name").order("name");
      setDepartments(data || []);
    } catch {}
  };

  // Generate report
  const generate = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      let startDate: Date;
      let prevStart: Date;
      let prevEnd: Date;

      switch (timePeriod) {
        case "today":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          prevStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
          prevEnd = startDate;
          break;
        case "yesterday":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
          prevStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2);
          prevEnd = startDate;
          break;
        case "this_week":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
          prevStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() - 7);
          prevEnd = startDate;
          break;
        case "last_week":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() - 7);
          prevStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() - 14);
          prevEnd = startDate;
          break;
        case "this_month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          prevEnd = startDate;
          break;
        case "last_month":
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          prevStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
          prevEnd = startDate;
          break;
        case "this_quarter":
          startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
          prevStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 - 3, 1);
          prevEnd = startDate;
          break;
        case "this_year":
        case "ytd":
        default:
          startDate = new Date(now.getFullYear(), 0, 1);
          prevStart = new Date(now.getFullYear() - 1, 0, 1);
          prevEnd = startDate;
      }

      // Fetch all data in parallel — current period + previous period (for trend deltas)
      const [
        reqRes, reqPending, reqApproved, reqRejected,
        poRes, poApproved, poPending,
        grnRes, grnPending,
        supRes, supActiveRes, supNewRes, itemRes, lowStockRes, userRes,
        prevReqRes, prevPoRes, prevGrnRes, prevSupNewRes,
      ] = await Promise.all([
        supabase.from("requisitions").select("id", { count: "exact", head: true }).gte("created_at", startDate.toISOString()),
        supabase.from("requisitions").select("id", { count: "exact", head: true }).gte("created_at", startDate.toISOString()).eq("status", "pending"),
        supabase.from("requisitions").select("id", { count: "exact", head: true }).gte("created_at", startDate.toISOString()).eq("status", "approved"),
        supabase.from("requisitions").select("id", { count: "exact", head: true }).gte("created_at", startDate.toISOString()).eq("status", "rejected"),
        supabase.from("purchase_orders").select("id", { count: "exact", head: true }).gte("created_at", startDate.toISOString()),
        supabase.from("purchase_orders").select("id", { count: "exact", head: true }).gte("created_at", startDate.toISOString()).eq("status", "approved"),
        supabase.from("purchase_orders").select("id", { count: "exact", head: true }).gte("created_at", startDate.toISOString()).eq("status", "pending"),
        supabase.from("goods_received").select("id", { count: "exact", head: true }).gte("received_date", startDate.toISOString()),
        supabase.from("goods_received").select("id", { count: "exact", head: true }).gte("received_date", startDate.toISOString()).eq("status", "pending"),
        supabase.from("suppliers").select("id", { count: "exact", head: true }),
        supabase.from("suppliers").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("suppliers").select("id", { count: "exact", head: true }).gte("created_at", startDate.toISOString()),
        supabase.from("items").select("id", { count: "exact", head: true }),
        (supabase as any).from("items").select("id, quantity_in_stock, reorder_level"),
        supabase.from("user_profiles").select("id", { count: "exact", head: true }),
        supabase.from("requisitions").select("id", { count: "exact", head: true }).gte("created_at", prevStart.toISOString()).lt("created_at", prevEnd.toISOString()),
        supabase.from("purchase_orders").select("id", { count: "exact", head: true }).gte("created_at", prevStart.toISOString()).lt("created_at", prevEnd.toISOString()),
        supabase.from("goods_received").select("id", { count: "exact", head: true }).gte("received_date", prevStart.toISOString()).lt("received_date", prevEnd.toISOString()),
        supabase.from("suppliers").select("id", { count: "exact", head: true }).gte("created_at", prevStart.toISOString()).lt("created_at", prevEnd.toISOString()),
      ]);

      const reqTotal = reqRes.count || 0;
      const poTotal = poRes.count || 0;
      const grnTotal = grnRes.count || 0;
      const supTotal = supRes.count || 0;
      const supActive = supActiveRes.count || 0;

      // Real % change vs. the equivalent prior period (avoids divide-by-zero by treating 0→N as +100%)
      const pctChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      const lowStockCount = (lowStockRes.data || []).filter(
        (i: any) => (i.quantity_in_stock || 0) < (i.reorder_level || 10)
      ).length;

      setMetrics({
        requisitions: {
          total: reqTotal,
          approved: reqApproved.count || 0,
          pending: reqPending.count || 0,
          rejected: reqRejected.count || 0,
          trend: pctChange(reqTotal, prevReqRes.count || 0),
        },
        purchaseOrders: {
          total: poTotal,
          approved: poApproved.count || 0,
          pending: poPending.count || 0,
          trend: pctChange(poTotal, prevPoRes.count || 0),
        },
        grns: {
          total: grnTotal,
          received: (grnRes.count || 0) - (grnPending.count || 0),
          pending: grnPending.count || 0,
          trend: pctChange(grnTotal, prevGrnRes.count || 0),
        },
        suppliers: {
          total: supTotal,
          active: supActive,
          trend: pctChange(supNewRes.count || 0, prevSupNewRes.count || 0),
        },
        items: {
          total: itemRes.count || 0,
          lowStock: lowStockCount,
        },
        users: {
          total: userRes.count || 0,
          active: userRes.count || 0,
        },
      });

      // Build department table
      const { data: reqData } = await (supabase as any).from("requisitions")
        .select("department, status")
        .gte("created_at", startDate.toISOString());
      
      const deptGroups: Record<string, any> = {};
      (reqData || []).forEach((r: any) => {
        const dept = r.department || "Unassigned";
        if (!deptGroups[dept]) {
          deptGroups[dept] = { department: dept, req_total: 0, req_approved: 0, req_pending: 0 };
        }
        deptGroups[dept].req_total++;
        if (r.status === "approved") deptGroups[dept].req_approved++;
        if (r.status === "pending") deptGroups[dept].req_pending++;
      });
      
      setTableData(Object.values(deptGroups));
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error generating report:", err);
      toast({ title: "Error", description: "Failed to generate report", variant: "destructive" });
    }
    setLoading(false);
  }, [timePeriod]);

  useEffect(() => {
    loadDepartments();
    generate();
  }, [generate]);

  // Export functions
  const exportToJSON = () => {
    const data = JSON.stringify({ metrics, tableData, generated: new Date().toISOString() }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `system-report-${timePeriod}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "✅ Exported to JSON" });
  };

  const exportToCSV = () => {
    if (tableData.length === 0) return;
    const headers = Object.keys(tableData[0]);
    const csv = [
      headers.join(","),
      ...tableData.map(row => headers.map(h => `"${String(row[h] || "")}"`).join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `system-report-${timePeriod}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "✅ Exported to CSV" });
  };

  // Trend indicator
  const TrendBadge = ({ value }: { value: number }) => (
    <span className={`flex items-center gap-0.5 text-xs font-bold ${
      value > 0 ? "text-emerald-600" : value < 0 ? "text-red-600" : "text-slate-500"
    }`}>
      {value > 0 ? <ArrowUpRight className="w-3 h-3" /> : value < 0 ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
      {value > 0 ? "+" : ""}{value}%
    </span>
  );

  // Metric card component
  const MetricCard = ({ title, value, icon: Icon, color, bg, trend, subtitle }: any) => (
    <Card className={`bg-white border-slate-200 hover:shadow-xl transition-all duration-300 overflow-hidden ${loading ? "opacity-50" : ""}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-xl ${bg}`}>
            <Icon className={`w-6 h-6 ${color}`} />
          </div>
          <TrendBadge value={trend} />
        </div>
        <div className="space-y-1">
          <div className="text-3xl font-bold text-slate-800">{value?.toLocaleString() || 0}</div>
          <div className="text-sm font-medium text-slate-500">{title}</div>
          {subtitle && <div className="text-xs text-slate-400 mt-1">{subtitle}</div>}
        </div>
      </CardContent>
      <div className={`h-1 bg-gradient-to-r ${bg.replace("100", "500")} to-transparent opacity-30`} />
    </Card>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Title Bar */}
      <div
        className="sticky top-0 z-40 text-white shadow-md"
        style={{ background: "linear-gradient(180deg, #2a4fa3 0%, #1a3580 100%)", borderBottom: "1px solid #1a3580" }}
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <BarChart3 className="w-5 h-5 text-white/90" />
            <div>
              <h1 className="text-base md:text-lg font-bold leading-tight">System Utilization Report</h1>
              <p className="text-[11px] text-white/75 mt-0.5">
                {lastUpdated ? `Last updated: ${lastUpdated.toLocaleString()} · ` : ""}
                Period: <span className="font-medium text-white/90">{TIME_PERIODS.find(p => p.key === timePeriod)?.label}</span>
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant={viewMode === "cards" ? "secondary" : "outline"} size="sm" className={viewMode === "cards" ? "" : "bg-white/10 border-white/30 text-white hover:bg-white/20"} onClick={() => setViewMode("cards")}>
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button variant={viewMode === "table" ? "secondary" : "outline"} size="sm" className={viewMode === "table" ? "" : "bg-white/10 border-white/30 text-white hover:bg-white/20"} onClick={() => setViewMode("table")}>
              <List className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" className="bg-white/10 border-white/30 text-white hover:bg-white/20" onClick={generate} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="outline" size="sm" className="bg-white/10 border-white/30 text-white hover:bg-white/20" onClick={exportToCSV}>
              <FileSpreadsheet className="w-4 h-4 mr-1" />
              CSV
            </Button>
            <Button variant="outline" size="sm" className="bg-white/10 border-white/30 text-white hover:bg-white/20" onClick={exportToJSON}>
              <FileJson className="w-4 h-4 mr-1" />
              JSON
            </Button>
            <Button variant="outline" size="sm" className="bg-white/10 border-white/30 text-white hover:bg-white/20" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-1" />
              Print
            </Button>
          </div>
        </div>
      </div>

      {/* Period Toolbar */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap gap-1.5">
          {TIME_PERIODS.map((period) => (
            <button
              key={period.key}
              onClick={() => setTimePeriod(period.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all border ${
                timePeriod === period.key
                  ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <MetricCard
            title="Total Requisitions"
            value={metrics.requisitions.total}
            icon={ShoppingCart}
            color="text-sky-600"
            bg="bg-sky-100"
            trend={metrics.requisitions.trend}
            subtitle={`${metrics.requisitions.pending} pending · ${metrics.requisitions.approved} approved`}
          />
          <MetricCard
            title="Purchase Orders"
            value={metrics.purchaseOrders.total}
            icon={FileText}
            color="text-violet-600"
            bg="bg-violet-100"
            trend={metrics.purchaseOrders.trend}
            subtitle={`${metrics.purchaseOrders.pending} pending · ${metrics.purchaseOrders.approved} approved`}
          />
          <MetricCard
            title="Goods Received"
            value={metrics.grns.total}
            icon={Package}
            color="text-emerald-600"
            bg="bg-emerald-100"
            trend={metrics.grns.trend}
            subtitle={`${metrics.grns.pending} pending GRNs`}
          />
          <MetricCard
            title="Active Suppliers"
            value={metrics.suppliers.active}
            icon={Building2}
            color="text-amber-600"
            bg="bg-amber-100"
            trend={metrics.suppliers.trend}
            subtitle={`${metrics.suppliers.total} total · ${metrics.items.total} items`}
          />
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Pending Requisitions", value: metrics.requisitions.pending, icon: Clock, color: "amber" },
            { label: "Approved Today", value: metrics.requisitions.approved, icon: CheckCircle2, color: "emerald" },
            { label: "Rejected Today", value: metrics.requisitions.rejected, icon: XCircle, color: "red" },
            { label: "Low Stock Items", value: metrics.items.lowStock, icon: AlertTriangle, color: metrics.items.lowStock > 0 ? "red" : "emerald" },
            { label: "System Users", value: metrics.users.total, icon: Users, color: "purple" },
          ].map((stat, i) => (
            <div
              key={i}
              className={`bg-${stat.color}-50 border border-${stat.color}-200 rounded-xl p-5 flex items-center gap-4`}
            >
              <div className={`p-3 bg-${stat.color}-100 rounded-xl`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
              </div>
              <div>
                <div className={`text-2xl font-bold text-${stat.color}-700`}>{stat.value}</div>
                <div className={`text-xs text-${stat.color}-600`}>{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Department Breakdown Table */}
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="w-5 h-5 text-slate-600" />
                Department Breakdown
              </CardTitle>
              <Badge className="bg-slate-100 text-slate-700">{tableData.length} departments</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {viewMode === "table" ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-5 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Department</th>
                      <th className="px-5 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">Total Reqs</th>
                      <th className="px-5 py-3 text-right text-xs font-bold text-emerald-600 uppercase tracking-wider">Approved</th>
                      <th className="px-5 py-3 text-right text-xs font-bold text-amber-600 uppercase tracking-wider">Pending</th>
                      <th className="px-5 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">Approval Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tableData.map((row, i) => (
                      <tr key={i} className="hover:bg-sky-50/50 transition-colors">
                        <td className="px-5 py-4 font-semibold text-slate-800">{row.department}</td>
                        <td className="px-5 py-4 text-right font-bold text-slate-700">{row.req_total}</td>
                        <td className="px-5 py-4 text-right text-emerald-600 font-medium">{row.req_approved}</td>
                        <td className="px-5 py-4 text-right text-amber-600 font-medium">{row.req_pending}</td>
                        <td className="px-5 py-4 text-right">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                            row.req_total > 0 && (row.req_approved / row.req_total) > 0.5
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}>
                            {row.req_total > 0 ? Math.round((row.req_approved / row.req_total) * 100) : 0}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {tableData.length > 0 && (
                    <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                      <tr className="font-bold">
                        <td className="px-5 py-3 text-slate-800">TOTAL</td>
                        <td className="px-5 py-3 text-right text-slate-800">{tableData.reduce((s, r) => s + r.req_total, 0)}</td>
                        <td className="px-5 py-3 text-right text-emerald-600">{tableData.reduce((s, r) => s + r.req_approved, 0)}</td>
                        <td className="px-5 py-3 text-right text-amber-600">{tableData.reduce((s, r) => s + r.req_pending, 0)}</td>
                        <td className="px-5 py-3 text-right">
                          {(() => {
                            const total = tableData.reduce((s, r) => s + r.req_total, 0);
                            const approved = tableData.reduce((s, r) => s + r.req_approved, 0);
                            return total > 0 ? Math.round((approved / total) * 100) : 0;
                          })()}%
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            ) : (
              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tableData.map((row, i) => (
                    <div key={i} className="p-4 bg-slate-50 rounded-xl hover:bg-sky-50 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-slate-800">{row.department}</span>
                        <Badge className={`${
                          row.req_total > 0 && (row.req_approved / row.req_total) > 0.5
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}>
                          {row.req_total > 0 ? Math.round((row.req_approved / row.req_total) * 100) : 0}%
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Total</span>
                          <span className="font-semibold text-slate-700">{row.req_total}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-emerald-500">Approved</span>
                          <span className="font-semibold text-emerald-600">{row.req_approved}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-amber-500">Pending</span>
                          <span className="font-semibold text-amber-600">{row.req_pending}</span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden mt-2">
                          <div
                            className="h-full bg-gradient-to-r from-sky-500 to-sky-600 transition-all"
                            style={{ width: `${row.req_total > 0 ? (row.req_approved / row.req_total) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {tableData.length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    <PieChart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    No data available for the selected period
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-sky-500 to-sky-600 border-sky-400 text-white">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-white/20 rounded-xl">
                  <Activity className="w-8 h-8" />
                </div>
                <div>
                  <div className="text-3xl font-bold">{metrics.requisitions.total + metrics.purchaseOrders.total + metrics.grns.total}</div>
                  <div className="text-sky-100">Total Transactions</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-400 text-white">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-white/20 rounded-xl">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <div className="text-3xl font-bold">
                    {metrics.requisitions.approved + metrics.purchaseOrders.approved}
                  </div>
                  <div className="text-emerald-100">Items Approved</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-violet-500 to-violet-600 border-violet-400 text-white">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-white/20 rounded-xl">
                  <Building2 className="w-8 h-8" />
                </div>
                <div>
                  <div className="text-3xl font-bold">{metrics.suppliers.total}</div>
                  <div className="text-violet-100">Active Suppliers</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 py-6 border-t border-slate-200">
          <p>EL5 MediProcure System Utilization Report · Embu Level 5 Hospital</p>
          <p className="mt-1">Generated {new Date().toLocaleString()} · {TIME_PERIODS.find(p => p.key === timePeriod)?.label}</p>
        </div>
      </div>
    </div>
  );
};

export default SystemReportPage;
