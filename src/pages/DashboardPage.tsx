import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Package, FileText, ShoppingCart, AlertTriangle, Clock,
  CheckCircle, Truck, TrendingUp, TrendingDown, ArrowRight,
  ClipboardList, Users, Layers, BarChart3, DollarSign,
  FileCheck, Box, Warehouse, Activity, RefreshCw,
  ChevronRight, ExternalLink, Minus,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

const COLORS = [
  "hsl(210,70%,30%)", "hsl(174,50%,40%)", "hsl(38,90%,55%)",
  "hsl(0,72%,51%)", "hsl(142,60%,40%)", "hsl(200,80%,50%)",
];

const DashboardPage = () => {
  const { profile, primaryRole, hasRole } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalItems: 0, lowStock: 0, outOfStock: 0, pendingRequisitions: 0,
    approvedRequisitions: 0, totalPOs: 0, openPOs: 0, totalSuppliers: 0,
    totalGRNs: 0, totalCategories: 0, totalContracts: 0, inventoryValue: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [monthlyPO, setMonthlyPO] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchStats(), fetchRecentActivity(), fetchLowStock(), fetchCategoryBreakdown(), fetchMonthlyPOs()])
      .finally(() => setLoading(false));
  }, []);

  const fetchStats = async () => {
    const [items, lowStock, outOfStock, pendingReqs, approvedReqs, pos, openPos, suppliers, grns, cats, contracts, invValue] =
      await Promise.all([
        supabase.from("items").select("id", { count: "exact", head: true }),
        supabase.from("items").select("id", { count: "exact", head: true }).lt("quantity_in_stock", 10).gt("quantity_in_stock", 0),
        supabase.from("items").select("id", { count: "exact", head: true }).lte("quantity_in_stock", 0),
        supabase.from("requisitions").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("requisitions").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("purchase_orders").select("id", { count: "exact", head: true }),
        supabase.from("purchase_orders").select("id", { count: "exact", head: true }).in("status", ["draft", "sent"]),
        supabase.from("suppliers").select("id", { count: "exact", head: true }),
        supabase.from("goods_received").select("id", { count: "exact", head: true }),
        supabase.from("item_categories").select("id", { count: "exact", head: true }),
        supabase.from("contracts").select("id", { count: "exact", head: true }),
        supabase.from("items").select("quantity_in_stock, unit_price"),
      ]);
    const totalVal = (invValue.data || []).reduce((s: number, i: any) => s + (i.quantity_in_stock || 0) * (i.unit_price || 0), 0);
    setStats({
      totalItems: items.count || 0, lowStock: lowStock.count || 0, outOfStock: outOfStock.count || 0,
      pendingRequisitions: pendingReqs.count || 0, approvedRequisitions: approvedReqs.count || 0,
      totalPOs: pos.count || 0, openPOs: openPos.count || 0, totalSuppliers: suppliers.count || 0,
      totalGRNs: grns.count || 0, totalCategories: cats.count || 0, totalContracts: contracts.count || 0,
      inventoryValue: totalVal,
    });
  };

  const fetchRecentActivity = async () => {
    const { data } = await supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(8);
    setRecentActivity(data || []);
  };

  const fetchLowStock = async () => {
    const { data } = await supabase.from("items").select("*").lt("quantity_in_stock", 10).order("quantity_in_stock").limit(6);
    setLowStockItems(data || []);
  };

  const fetchCategoryBreakdown = async () => {
    const { data: cats } = await supabase.from("item_categories").select("id, name");
    const { data: items } = await supabase.from("items").select("category_id");
    if (cats && items) {
      const counts: Record<string, number> = {};
      items.forEach(i => { if (i.category_id) counts[i.category_id] = (counts[i.category_id] || 0) + 1; });
      setCategoryData(cats.map(c => ({ name: c.name, value: counts[c.id] || 0 })).filter(c => c.value > 0).slice(0, 6));
    }
  };

  const fetchMonthlyPOs = async () => {
    const { data } = await supabase.from("purchase_orders").select("created_at, total_amount");
    if (data) {
      const byMonth: Record<string, number> = {};
      data.forEach(po => {
        const m = new Date(po.created_at).toLocaleDateString("en", { month: "short", year: "2-digit" });
        byMonth[m] = (byMonth[m] || 0) + (po.total_amount || 0);
      });
      setMonthlyPO(Object.entries(byMonth).slice(-6).map(([name, value]) => ({ name, value })));
    }
  };

  const onTimeDelivery = stats.totalGRNs > 0 ? Math.round((stats.totalGRNs / Math.max(stats.totalPOs, 1)) * 100) : 0;
  const fulfillmentRate = stats.approvedRequisitions > 0 ? Math.round((stats.approvedRequisitions / Math.max(stats.pendingRequisitions + stats.approvedRequisitions, 1)) * 100) : 0;

  // KPI cards - SAP Business One style
  const kpis = [
    { label: "Pending Requisitions", value: stats.pendingRequisitions, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10", trend: null },
    { label: "Avg. Fulfillment Rate", value: `${fulfillmentRate}%`, icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10", trend: "+7%" },
    { label: "On-Time Delivery", value: `${onTimeDelivery}%`, icon: Truck, color: "text-primary", bg: "bg-primary/10", trend: "-3%" },
    { label: "Inventory Value", value: `${(stats.inventoryValue / 1e6).toFixed(2)}M`, icon: DollarSign, color: "text-blue-500", bg: "bg-blue-500/10", trend: "+12%" },
    { label: "Active Suppliers", value: stats.totalSuppliers, icon: Users, color: "text-secondary", bg: "bg-secondary/10", trend: null },
    { label: "Items Below Min", value: stats.lowStock + stats.outOfStock, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10", trend: null },
  ];

  // Quick action links
  const commonFunctions = [
    { label: "Purchase Requisition", path: "/requisitions", icon: FileText },
    { label: "Purchase Order", path: "/purchase-orders", icon: ShoppingCart },
    { label: "Goods Receipt", path: "/goods-received", icon: ClipboardList },
    { label: "Item Master Data", path: "/items", icon: Package },
    { label: "Suppliers", path: "/suppliers", icon: Truck },
    { label: "Contracts", path: "/contracts", icon: FileCheck },
    { label: "Reports", path: "/reports", icon: BarChart3 },
    { label: "Vouchers", path: "/vouchers", icon: FileText },
  ];

  // Inventory process flow
  const processSteps = [
    { icon: FileText, label: "Requisition", status: stats.pendingRequisitions > 0 },
    { icon: ShoppingCart, label: "Purchase Order", status: stats.openPOs > 0 },
    { icon: Truck, label: "Delivery", status: false },
    { icon: ClipboardList, label: "Goods Receipt", status: false },
    { icon: Warehouse, label: "Warehouse", status: true },
    { icon: Package, label: "Issue/Transfer", status: false },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Welcome banner */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Welcome, <span className="font-semibold text-foreground">{profile?.full_name || "User"}</span>.
            You are in cockpit of <span className="text-primary font-medium cursor-pointer hover:underline">Embu Level 5 Hospital</span>.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => { setLoading(true); Promise.all([fetchStats(), fetchRecentActivity(), fetchLowStock()]).finally(() => setLoading(false)); }}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards Row - SAP style large numbers */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border-border hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-2 truncate">{kpi.label}</p>
              <div className="flex items-end justify-between">
                <span className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</span>
                {kpi.trend && (
                  <span className={`text-[10px] flex items-center gap-0.5 ${kpi.trend.startsWith("+") ? "text-emerald-500" : "text-destructive"}`}>
                    {kpi.trend.startsWith("+") ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {kpi.trend}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Item Distribution - Pie Chart */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Item Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value">
                    {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  <RechartsTooltip contentStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-12">No category data</p>
            )}
          </CardContent>
        </Card>

        {/* Overall Stats */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Overall Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-1.5 border-b border-border/50">
              <span className="text-xs text-muted-foreground">Total SKUs</span>
              <span className="text-sm font-bold">{stats.totalItems}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-border/50">
              <span className="text-xs text-muted-foreground">Asset Utilization</span>
              <span className="text-sm font-bold text-primary">{fulfillmentRate}%</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-border/50">
              <span className="text-xs text-muted-foreground">Open Purchase Orders</span>
              <span className="text-sm font-bold">{stats.openPOs}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-border/50">
              <span className="text-xs text-muted-foreground">Total GRNs</span>
              <span className="text-sm font-bold">{stats.totalGRNs}</span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-xs text-muted-foreground">Active Contracts</span>
              <span className="text-sm font-bold">{stats.totalContracts}</span>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-emerald-600">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {commonFunctions.slice(0, 8).map((fn) => (
                <button key={fn.path} onClick={() => navigate(fn.path)}
                  className="flex items-center gap-2 p-2 rounded-md text-left hover:bg-muted/60 transition-colors group">
                  <fn.icon className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-xs text-foreground group-hover:text-primary truncate">{fn.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Items Below Min / Low Stock */}
        <Card className="border-border">
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Items Below Min or Above Max
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/items")} className="text-xs gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-destructive mb-3">{stats.lowStock + stats.outOfStock}</div>
            {lowStockItems.length === 0 ? (
              <p className="text-xs text-muted-foreground">All items adequately stocked ✓</p>
            ) : (
              <div className="space-y-1.5">
                {lowStockItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50 text-xs">
                    <div>
                      <span className="font-medium text-foreground">{item.name}</span>
                      <span className="text-muted-foreground ml-2">{item.sku || item.barcode || ""}</span>
                    </div>
                    <span className={`font-bold ${(item.quantity_in_stock || 0) <= 0 ? "text-destructive" : "text-amber-500"}`}>
                      {item.quantity_in_stock || 0}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Recent Updates */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">My Recent Updates</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No recent activity</p>
            ) : (
              <div className="space-y-2">
                {recentActivity.map((log) => (
                  <div key={log.id} className="flex items-start gap-2 py-1.5 border-b border-border/30 last:border-0">
                    <Activity className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-primary truncate">{log.action} – {log.module}</p>
                      <p className="text-[10px] text-muted-foreground">{log.user_name} · {new Date(log.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Procurement Process Flow */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Procurement & Inventory Management Process</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between overflow-x-auto py-4 gap-2">
            {processSteps.map((step, i) => (
              <div key={step.label} className="flex items-center gap-2 flex-shrink-0">
                <div className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-colors cursor-pointer hover:border-primary/50 ${step.status ? "border-primary bg-primary/5" : "border-border bg-card"}`}
                  onClick={() => navigate(commonFunctions[i]?.path || "/")}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step.status ? "bg-primary/10" : "bg-muted"}`}>
                    <step.icon className={`w-5 h-5 ${step.status ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <span className="text-[10px] font-medium text-foreground text-center whitespace-nowrap">{step.label}</span>
                  {step.status && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                </div>
                {i < processSteps.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Monthly PO Chart + Common Functions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Purchase Order Spend (Monthly)</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyPO.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyPO}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} />
                  <RechartsTooltip contentStyle={{ fontSize: 11 }} formatter={(v: number) => `KSH ${v.toLocaleString()}`} />
                  <Bar dataKey="value" fill="hsl(210,70%,30%)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-12">No PO data available</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Common Functions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { label: "Business Partner M...", path: "/suppliers" },
                { label: "Purchase Order", path: "/purchase-orders" },
                { label: "Goods Receipt PO", path: "/goods-received" },
                { label: "Item Master Data", path: "/items" },
                { label: "Procurement Confir...", path: "/requisitions" },
                { label: "Inventory Counting", path: "/items" },
                { label: "Reports", path: "/reports" },
                { label: "Vouchers", path: "/vouchers" },
                { label: "Contracts", path: "/contracts" },
                { label: "Audit Trail", path: "/audit-log" },
              ].map(fn => (
                <button key={fn.label} onClick={() => navigate(fn.path)}
                  className="flex items-center gap-1.5 py-1.5 px-2 text-xs text-primary hover:text-primary/80 hover:bg-muted/40 rounded transition-colors text-left">
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{fn.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
