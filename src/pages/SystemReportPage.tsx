import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { exportToExcel, exportToPDF } from "@/lib/export";
import {
  Printer, Download, BarChart3, RefreshCw, TrendingUp, TrendingDown,
  Users, ShoppingCart, FileText, Package, Building2, Calendar, Activity,
  Database, Clock, CheckCircle2, XCircle, AlertTriangle, ArrowUpRight,
  ArrowDownRight, Minus, PieChart, List, Grid3X3,
} from "lucide-react";

// Time period options
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

const METRICS = [
  { key: "requisitions", label: "Requisitions", icon: ShoppingCart, color: "text-sky-600", bg: "bg-sky-100" },
  { key: "purchase_orders", label: "Purchase Orders", icon: FileText, color: "text-violet-600", bg: "bg-violet-100" },
  { key: "grns", label: "GRNs", icon: Package, color: "text-emerald-600", bg: "bg-emerald-100" },
  { key: "suppliers", label: "Suppliers", icon: Building2, color: "text-amber-600", bg: "bg-amber-100" },
  { key: "items", label: "Items", icon: Package, color: "text-blue-600", bg: "bg-blue-100" },
  { key: "users", label: "Users", icon: Users, color: "text-purple-600", bg: "bg-purple-100" },
];

const SystemReportPage = () => {
  const [timePeriod, setTimePeriod] = useState("this_month");
  const [department, setDepartment] = useState("all");
  const [metricType, setMetricType] = useState("all");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Dashboard metrics
  const [metrics, setMetrics] = useState({
    totalRequisitions: 0,
    pendingRequisitions: 0,
    approvedRequisitions: 0,
    rejectedRequisitions: 0,
    totalPOs: 0,
    pendingPOs: 0,
    approvedPOs: 0,
    totalGRNs: 0,
    pendingGRNs: 0,
    totalSuppliers: 0,
    totalItems: 0,
    totalUsers: 0,
    activeUsers: 0,
    // Trends (percentage change)
    reqTrend: 0,
    poTrend: 0,
    grnTrend: 0,
    supTrend: 0,
  });

  // Table data
  const [tableData, setTableData] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  const loadDepartments = async () => {
    try {
      const { data } = await (supabase as any).from("departments").select("id, name").order("name");
      setDepartments(data || []);
    } catch {}
  };

  const generate = async () => {
    setLoading(true);
    try {
      // Calculate date range based on time period
      const now = new Date();
      let startDate: Date;
      let prevStartDate: Date;
      let prevEndDate: Date;

      switch (timePeriod) {
        case "today":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          prevStartDate = new Date(startDate);
          prevStartDate.setDate(prevStartDate.getDate() - 1);
          prevEndDate = new Date(startDate.getTime() - 1);
          break;
        case "yesterday":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
          prevStartDate = new Date(startDate);
          prevStartDate.setDate(prevStartDate.getDate() - 1);
          prevEndDate = new Date(startDate.getTime() - 1);
          break;
        case "this_week":
          const dayOfWeek = now.getDay();
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
          prevStartDate = new Date(startDate);
          prevStartDate.setDate(prevStartDate.getDate() - 7);
          prevEndDate = new Date(startDate.getTime() - 1);
          break;
        case "last_week":
          const lastWeekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
          startDate = new Date(lastWeekEnd);
          startDate.setDate(startDate.getDate() - 7);
          prevStartDate = new Date(startDate);
          prevStartDate.setDate(prevStartDate.getDate() - 7);
          prevEndDate = new Date(startDate.getTime() - 1);
          break;
        case "this_month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          prevEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
          break;
        case "last_month":
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          prevStartDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
          prevEndDate = new Date(now.getFullYear(), now.getMonth() - 1, 0);
          break;
        case "this_quarter":
          const quarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), quarter * 3, 1);
          prevStartDate = new Date(now.getFullYear(), (quarter - 1) * 3, 1);
          prevEndDate = new Date(now.getFullYear(), quarter * 3, 0);
          break;
        case "this_year":
          startDate = new Date(now.getFullYear(), 0, 1);
          prevStartDate = new Date(now.getFullYear() - 1, 0, 1);
          prevEndDate = new Date(now.getFullYear() - 1, 11, 31);
          break;
        case "ytd":
          startDate = new Date(now.getFullYear(), 0, 1);
          prevStartDate = new Date(now.getFullYear() - 1, 0, 1);
          prevEndDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          prevEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
      }

      const deptFilter = department !== "all" ? `&department=eq.${encodeURIComponent(department)}` : "";

      // Fetch current period data
      const [
        reqRes, reqPending, reqApproved, reqRejected,
        poRes, poPending, poApproved,
        grnRes, grnPending,
        supRes, itemRes, userRes,
      ] = await Promise.all([
        (supabase as any).from("requisitions").select("id", { count: "exact", head: true }).gte("created_at", startDate.toISOString()).eq("status", "approved"),
        (supabase as any).from("requisitions").select("id", { count: "exact", head: true }).gte("created_at", startDate.toISOString()).eq("status", "pending"),
        (supabase as any).from("requisitions").select("id", { count: "exact", head: true }).gte("created_at", startDate.toISOString()).eq("status", "approved"),
        (supabase as any).from("requisitions").select("id", { count: "exact", head: true }).gte("created_at", startDate.toISOString()).eq("status", "rejected"),
        (supabase as any).from("purchase_orders").select("id", { count: "exact", head: true }).gte("created_at", startDate.toISOString()),
        (supabase as any).from("purchase_orders").select("id", { count: "exact", head: true }).gte("created_at", startDate.toISOString()).eq("status", "pending"),
        (supabase as any).from("purchase_orders").select("id", { count: "exact", head: true }).gte("created_at", startDate.toISOString()).eq("status", "approved"),
        (supabase as any).from("goods_received").select("id", { count: "exact", head: true }).gte("received_date", startDate.toISOString()),
        (supabase as any).from("goods_received").select("id", { count: "exact", head: true }).gte("received_date", startDate.toISOString()).eq("status", "pending"),
        (supabase as any).from("suppliers").select("id", { count: "exact", head: true }),
        (supabase as any).from("items").select("id", { count: "exact", head: true }),
        (supabase as any).from("user_profiles").select("id", { count: "exact", head: true }),
      ]);

      // Fetch previous period for trends
      const [
        prevReq, prevPO, prevGRN, prevSup,
      ] = await Promise.all([
        (supabase as any).from("requisitions").select("id", { count: "exact", head: true }).gte("created_at", prevStartDate.toISOString()).lte("created_at", prevEndDate.toISOString()),
        (supabase as any).from("purchase_orders").select("id", { count: "exact", head: true }).gte("created_at", prevStartDate.toISOString()).lte("created_at", prevEndDate.toISOString()),
        (supabase as any).from("goods_received").select("id", { count: "exact", head: true }).gte("received_date", prevStartDate.toISOString()).lte("received_date", prevEndDate.toISOString()),
        (supabase as any).from("suppliers").select("id", { count: "exact", head: true }),
      ]);

      // Calculate trends
      const calcTrend = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      const reqCount = reqRes.count || 0;
      const poCount = poRes.count || 0;
      const grnCount = grnRes.count || 0;
      const supCount = supRes.count || 0;

      setMetrics({
        totalRequisitions: reqCount,
        pendingRequisitions: reqPending.count || 0,
        approvedRequisitions: reqApproved.count || 0,
        rejectedRequisitions: reqRejected.count || 0,
        totalPOs: poCount,
        pendingPOs: poPending.count || 0,
        approvedPOs: poApproved.count || 0,
        totalGRNs: grnCount,
        pendingGRNs: grnPending.count || 0,
        totalSuppliers: supCount,
        totalItems: itemRes.count || 0,
        totalUsers: userRes.count || 0,
        activeUsers: userRes.count || 0,
        reqTrend: calcTrend(reqCount, prevReq.count || 0),
        poTrend: calcTrend(poCount, prevPO.count || 0),
        grnTrend: calcTrend(grnCount, prevGRN.count || 0),
        supTrend: calcTrend(supCount, prevSup.count || 0),
      });

      // Build table data by department
      if (metricType === "all" || metricType === "requisitions") {
        const { data: reqData } = await (supabase as any).from("requisitions")
          .select("department, status")
          .gte("created_at", startDate.toISOString());
        
        const deptGroups: Record<string, any> = {};
        (reqData || []).forEach((r: any) => {
          const dept = r.department || "Unassigned";
          if (!deptGroups[dept]) {
            deptGroups[dept] = { department: dept, req_total: 0, req_approved: 0, req_rejected: 0, req_pending: 0, po_total: 0, grn_total: 0 };
          }
          deptGroups[dept].req_total++;
          if (r.status === "approved") deptGroups[dept].req_approved++;
          if (r.status === "rejected") deptGroups[dept].req_rejected++;
          if (r.status === "pending") deptGroups[dept].req_pending++;
        });
        
        setTableData(Object.values(deptGroups));
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error generating report:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadDepartments();
    generate();
  }, []);

  const TrendBadge = ({ value }: { value: number }) => {
    if (value > 0) return <span className="flex items-center gap-0.5 text-emerald-600 text-xs font-bold"><ArrowUpRight className="w-3 h-3" />+{value}%</span>;
    if (value < 0) return <span className="flex items-center gap-0.5 text-red-600 text-xs font-bold"><ArrowDownRight className="w-3 h-3" />{value}%</span>;
    return <span className="flex items-center gap-0.5 text-slate-500 text-xs font-bold"><Minus className="w-3 h-3" />0%</span>;
  };

  const MetricCard = ({ title, value, icon: Icon, color, bg, trend, subtitle }: any) => (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className={`p-2.5 rounded-lg ${bg}`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
          <TrendBadge value={trend} />
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold text-slate-800">{value?.toLocaleString() || 0}</div>
          <div className="text-sm text-slate-500 mt-0.5">{title}</div>
          {subtitle && <div className="text-xs text-slate-400 mt-1">{subtitle}</div>}
        </div>
      </div>
      <div className="h-1 bg-gradient-to-r from-slate-100 to-transparent" />
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-sky-600" />
            System Utilization Report
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {lastUpdated && <>Last updated: {lastUpdated.toLocaleString()} · </>}
            <span className="capitalize">{TIME_PERIODS.find(p => p.key === timePeriod)?.label}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === "cards" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("cards")}
            className="gap-1.5"
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("table")}
            className="gap-1.5"
          >
            <List className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={generate} disabled={loading} className="gap-1.5">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportToExcel(tableData, "system_utilization")} className="gap-1.5">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
            <Printer className="w-4 h-4" />
            Print
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Time Period</label>
              <Select value={timePeriod} onValueChange={setTimePeriod}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIME_PERIODS.map((p) => (
                    <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Department</label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Metric Type</label>
              <Select value={metricType} onValueChange={setMetricType}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Metrics</SelectItem>
                  <SelectItem value="requisitions">Requisitions</SelectItem>
                  <SelectItem value="purchase_orders">Purchase Orders</SelectItem>
                  <SelectItem value="grns">Goods Received</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button className="w-full h-9 bg-sky-600 hover:bg-sky-700 gap-1.5" onClick={generate} disabled={loading}>
                <Activity className="w-4 h-4" />
                Generate Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Requisitions"
          value={metrics.totalRequisitions}
          icon={ShoppingCart}
          color="text-sky-600"
          bg="bg-sky-100"
          trend={metrics.reqTrend}
          subtitle={`${metrics.pendingRequisitions} pending · ${metrics.approvedRequisitions} approved`}
        />
        <MetricCard
          title="Purchase Orders"
          value={metrics.totalPOs}
          icon={FileText}
          color="text-violet-600"
          bg="bg-violet-100"
          trend={metrics.poTrend}
          subtitle={`${metrics.pendingPOs} pending · ${metrics.approvedPOs} approved`}
        />
        <MetricCard
          title="Goods Received"
          value={metrics.totalGRNs}
          icon={Package}
          color="text-emerald-600"
          bg="bg-emerald-100"
          trend={metrics.grnTrend}
          subtitle={`${metrics.pendingGRNs} pending GRNs`}
        />
        <MetricCard
          title="Active Suppliers"
          value={metrics.totalSuppliers}
          icon={Building2}
          color="text-amber-600"
          bg="bg-amber-100"
          trend={metrics.supTrend}
          subtitle={`${metrics.totalItems} items · ${metrics.totalUsers} users`}
        />
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <div className="text-xl font-bold text-amber-700">{metrics.pendingRequisitions}</div>
            <div className="text-xs text-amber-600">Pending Requisitions</div>
          </div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <div className="text-xl font-bold text-emerald-700">{metrics.approvedRequisitions}</div>
            <div className="text-xs text-emerald-600">Approved</div>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <XCircle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <div className="text-xl font-bold text-red-700">{metrics.rejectedRequisitions}</div>
            <div className="text-xs text-red-600">Rejected</div>
          </div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <div className="text-xl font-bold text-purple-700">{metrics.totalUsers}</div>
            <div className="text-xs text-purple-600">System Users</div>
          </div>
        </div>
      </div>

      {/* Table View */}
      {viewMode === "table" && (
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="w-4 h-4 text-slate-500" />
              Department Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Department</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Total Reqs</th>
                    <th className="text-right px-4 py-3 font-semibold text-emerald-600">Approved</th>
                    <th className="text-right px-4 py-3 font-semibold text-red-600">Rejected</th>
                    <th className="text-right px-4 py-3 font-semibold text-amber-600">Pending</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">POs</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">GRNs</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row, i) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{row.department}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-700">{row.req_total}</td>
                      <td className="px-4 py-3 text-right text-emerald-600">{row.req_approved}</td>
                      <td className="px-4 py-3 text-right text-red-600">{row.req_rejected}</td>
                      <td className="px-4 py-3 text-right text-amber-600">{row.req_pending}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{row.po_total || 0}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{row.grn_total || 0}</td>
                    </tr>
                  ))}
                  {tableData.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        No data available for the selected period
                      </td>
                    </tr>
                  )}
                </tbody>
                {tableData.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-50 font-bold">
                      <td className="px-4 py-3 text-slate-700">TOTAL</td>
                      <td className="px-4 py-3 text-right text-slate-700">{tableData.reduce((s, r) => s + r.req_total, 0)}</td>
                      <td className="px-4 py-3 text-right text-emerald-600">{tableData.reduce((s, r) => s + r.req_approved, 0)}</td>
                      <td className="px-4 py-3 text-right text-red-600">{tableData.reduce((s, r) => s + r.req_rejected, 0)}</td>
                      <td className="px-4 py-3 text-right text-amber-600">{tableData.reduce((s, r) => s + r.req_pending, 0)}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{tableData.reduce((s, r) => s + (r.po_total || 0), 0)}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{tableData.reduce((s, r) => s + (r.grn_total || 0), 0)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-slate-400 py-4 border-t border-slate-100">
        EL5 MediProcure System Utilization Report · Embu Level 5 Hospital · Generated {new Date().toLocaleString()}
      </div>
    </div>
  );
};

export default SystemReportPage;