<<<<<<< HEAD
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingCart, Package, FileText, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle, Clock, DollarSign, Truck, BarChart2,
  ArrowRight, Activity, Shield, Boxes
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const kpis = [
  { label: "Total Spend (MTD)", value: "KES 4,285,600", change: "+12%", up: true, icon: DollarSign, color: "blue", sub: "vs last month" },
  { label: "Open Requisitions", value: "34", change: "8 urgent", up: false, icon: FileText, color: "amber", sub: "awaiting approval" },
  { label: "Active POs", value: "127", change: "+5 this week", up: true, icon: ShoppingCart, color: "green", sub: "across suppliers" },
  { label: "Stock Value", value: "KES 12.4M", change: "98.2% accuracy", up: true, icon: Boxes, color: "indigo", sub: "all locations" },
  { label: "Pending Deliveries", value: "23", change: "3 overdue", up: false, icon: Truck, color: "orange", sub: "expected this week" },
  { label: "Low Stock Alerts", value: "17", change: "↑ 4 new", up: false, icon: AlertTriangle, color: "red", sub: "below reorder level" },
  { label: "Suppliers Active", value: "89", change: "+2 this month", up: true, icon: Shield, color: "teal", sub: "approved vendors" },
  { label: "Budget Utilization", value: "68.4%", change: "KES 2.9M remaining", up: true, icon: BarChart2, color: "purple", sub: "FY 2025/26" },
];

const recentActivity = [
  { time: "10 mins ago", action: "PO-EL5H-2026-0234 approved", user: "Dr. Kamau", type: "success" },
  { time: "1 hr ago", action: "GRN received: Medical Supplies batch #B-2341", user: "Store Keeper", type: "info" },
  { time: "2 hrs ago", action: "Payment Voucher PV/EL5H/202603/0089 — KES 145,000", user: "Finance Dept", type: "success" },
  { time: "3 hrs ago", action: "Low stock alert: Paracetamol 500mg (12 packs left)", user: "System", type: "warning" },
  { time: "5 hrs ago", action: "Tender T-2026-045 closed: 7 bids received", user: "Procurement", type: "info" },
  { time: "Yesterday", action: "Supplier PHARMALINK LTD contract renewed", user: "Admin", type: "success" },
  { time: "Yesterday", action: "Non-conformance NCR-045 resolved: Gloves batch rejected", user: "QC Dept", type: "warning" },
];

const quickLinks = [
  { label: "New Requisition", path: "/requisitions", color: "bg-blue-600", icon: FileText },
  { label: "Receive Goods", path: "/goods-received", color: "bg-green-600", icon: Package },
  { label: "Pay Supplier", path: "/vouchers/payment", color: "bg-indigo-600", icon: DollarSign },
  { label: "Quality Check", path: "/quality/inspections", color: "bg-teal-600", icon: CheckCircle },
  { label: "View Analytics", path: "/analytics", color: "bg-purple-600", icon: Activity },
  { label: "Scan Barcode", path: "/scanner", color: "bg-orange-600", icon: Shield },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const today = new Date().toLocaleDateString("en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Operations Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Embu Level 5 Hospital — {today}</p>
        </div>
        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 px-3 py-1">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block mr-2 animate-pulse" />
          System Online
        </Badge>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className={`p-2 rounded-lg bg-${kpi.color}-50`}>
                <kpi.icon className={`w-4 h-4 text-${kpi.color}-600`} />
              </div>
              <span className={`text-xs font-medium flex items-center gap-1 ${kpi.up ? "text-green-600" : "text-amber-600"}`}>
                {kpi.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {kpi.change}
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-800 mt-3">{kpi.value}</p>
            <p className="text-xs font-medium text-slate-600 mt-0.5">{kpi.label}</p>
            <p className="text-xs text-slate-400 mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => navigate(link.path)}
                className={`${link.color} text-white rounded-lg p-3 text-left hover:opacity-90 transition-opacity`}
              >
                <link.icon className="w-5 h-5 mb-2" />
                <p className="text-xs font-semibold">{link.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Recent Activity</h2>
            <Button variant="ghost" size="sm" className="text-xs text-blue-600">View All <ArrowRight className="w-3 h-3 ml-1" /></Button>
          </div>
          <div className="space-y-3">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                  item.type === "success" ? "bg-green-500" :
                  item.type === "warning" ? "bg-amber-500" : "bg-blue-500"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 truncate">{item.action}</p>
                  <p className="text-xs text-slate-400">{item.user} · {item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Module Status */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">Module Health</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { name: "Procurement", status: "Operational", ok: true },
            { name: "Inventory", status: "Operational", ok: true },
            { name: "Financials", status: "Operational", ok: true },
            { name: "Quality Control", status: "1 Pending NCR", ok: false },
            { name: "Vendor Portal", status: "Operational", ok: true },
          ].map((mod) => (
            <div key={mod.name} className={`rounded-lg p-3 border ${mod.ok ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
              <div className="flex items-center gap-2 mb-1">
                {mod.ok ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Clock className="w-4 h-4 text-amber-600" />}
                <span className="text-xs font-semibold text-slate-700">{mod.name}</span>
              </div>
              <p className={`text-xs ${mod.ok ? "text-green-600" : "text-amber-600"}`}>{mod.status}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
=======
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Package, FileText, ShoppingCart, AlertTriangle, Clock,
  CheckCircle, Truck, Plus, ArrowRight, TrendingUp,
  ClipboardList, Users, Layers, BarChart3,
} from "lucide-react";

const DashboardPage = () => {
  const { profile, primaryRole, hasRole } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalItems: 0, lowStock: 0, outOfStock: 0, pendingRequisitions: 0,
    approvedRequisitions: 0, totalPOs: 0, openPOs: 0, totalSuppliers: 0,
    totalGRNs: 0, totalCategories: 0,
  });
  const [recentRequisitions, setRecentRequisitions] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
    fetchRecentRequisitions();
    fetchLowStockItems();
  }, []);

  const fetchStats = async () => {
    const [items, lowStock, outOfStock, pendingReqs, approvedReqs, pos, openPos, suppliers, grns, cats] =
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
      ]);
    setStats({
      totalItems: items.count || 0, lowStock: lowStock.count || 0, outOfStock: outOfStock.count || 0,
      pendingRequisitions: pendingReqs.count || 0, approvedRequisitions: approvedReqs.count || 0,
      totalPOs: pos.count || 0, openPOs: openPos.count || 0, totalSuppliers: suppliers.count || 0,
      totalGRNs: grns.count || 0, totalCategories: cats.count || 0,
    });
  };

  const fetchRecentRequisitions = async () => {
    const { data } = await supabase.from("requisitions").select("*").order("created_at", { ascending: false }).limit(5);
    setRecentRequisitions(data || []);
  };

  const fetchLowStockItems = async () => {
    const { data } = await supabase.from("items").select("*").lt("quantity_in_stock", 10).order("quantity_in_stock").limit(8);
    setLowStockItems(data || []);
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-emerald-500/10 text-emerald-600";
      case "pending": return "bg-amber-500/10 text-amber-600";
      case "rejected": return "bg-red-500/10 text-red-600";
      default: return "bg-muted text-muted-foreground";
    }
  };

  // Role-specific KPI cards
  const getKPICards = () => {
    const base = [
      { label: "Pending Requisitions", value: stats.pendingRequisitions, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
    ];

    switch (primaryRole) {
      case "requisitioner":
        return [
          ...base,
          { label: "My Approved", value: stats.approvedRequisitions, icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: "Total Items", value: stats.totalItems, icon: Package, color: "text-primary", bg: "bg-primary/10" },
        ];
      case "procurement_officer":
        return [
          { label: "Open Requisitions", value: stats.pendingRequisitions, icon: FileText, color: "text-amber-500", bg: "bg-amber-500/10" },
          { label: "Open POs", value: stats.openPOs, icon: ShoppingCart, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Active Suppliers", value: stats.totalSuppliers, icon: Truck, color: "text-primary", bg: "bg-primary/10" },
          { label: "Approved Requisitions", value: stats.approvedRequisitions, icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-500/10" },
        ];
      case "procurement_manager":
        return [
          { label: "Pending Approvals", value: stats.pendingRequisitions, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
          { label: "Total POs", value: stats.totalPOs, icon: ShoppingCart, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Total Spend Items", value: stats.totalItems, icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
          { label: "Active Suppliers", value: stats.totalSuppliers, icon: Truck, color: "text-emerald-500", bg: "bg-emerald-500/10" },
        ];
      case "warehouse_officer":
        return [
          { label: "Open POs (Expected)", value: stats.openPOs, icon: ClipboardList, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Items Received", value: stats.totalGRNs, icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: "Low Stock", value: stats.lowStock, icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10" },
          { label: "Out of Stock", value: stats.outOfStock, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10" },
        ];
      case "inventory_manager":
        return [
          { label: "Total SKUs", value: stats.totalItems, icon: Package, color: "text-primary", bg: "bg-primary/10" },
          { label: "Low Stock", value: stats.lowStock, icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10" },
          { label: "Out of Stock", value: stats.outOfStock, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10" },
          { label: "Categories", value: stats.totalCategories, icon: Layers, color: "text-blue-500", bg: "bg-blue-500/10" },
        ];
      default: // admin
        return [
          { label: "Total Items", value: stats.totalItems, icon: Package, color: "text-primary", bg: "bg-primary/10" },
          { label: "Low Stock", value: stats.lowStock, icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10" },
          { label: "Pending Requisitions", value: stats.pendingRequisitions, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
          { label: "Purchase Orders", value: stats.totalPOs, icon: ShoppingCart, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Suppliers", value: stats.totalSuppliers, icon: Truck, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: "GRNs", value: stats.totalGRNs, icon: ClipboardList, color: "text-primary", bg: "bg-primary/10" },
        ];
    }
  };

  const getQuickActions = () => {
    const actions: { label: string; path: string; icon: any; variant?: string }[] = [];
    if (["requisitioner", "admin", "procurement_officer", "procurement_manager"].some(r => hasRole(r as any))) {
      actions.push({ label: "New Requisition", path: "/requisitions", icon: Plus });
    }
    if (hasRole("procurement_officer") || hasRole("admin")) {
      actions.push({ label: "Create PO", path: "/purchase-orders", icon: ShoppingCart });
    }
    if (hasRole("warehouse_officer") || hasRole("admin")) {
      actions.push({ label: "Receive Goods", path: "/goods-received", icon: ClipboardList });
    }
    if (hasRole("inventory_manager") || hasRole("admin")) {
      actions.push({ label: "Add Item", path: "/items", icon: Package });
    }
    return actions;
  };

  const getRoleGreeting = () => {
    switch (primaryRole) {
      case "requisitioner": return "Your requisition overview";
      case "procurement_officer": return "Your procurement workbench";
      case "procurement_manager": return "Procurement oversight dashboard";
      case "warehouse_officer": return "Warehouse & receiving overview";
      case "inventory_manager": return "Inventory control center";
      default: return "System administration overview";
    }
  };

  const kpis = getKPICards();
  const quickActions = getQuickActions();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {profile?.full_name || "User"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{getRoleGreeting()}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {quickActions.map((action) => (
            <Button key={action.label} size="sm" onClick={() => navigate(action.path)} className="gap-1.5">
              <action.icon className="w-4 h-4" /> {action.label}
            </Button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {kpis.map((stat) => (
          <Card key={stat.label} className="border-border hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`p-3 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent requisitions */}
        {(primaryRole !== "warehouse_officer") && (
          <Card className="border-border">
            <CardHeader className="pb-3 flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                {primaryRole === "procurement_manager" ? "Pending Approvals" : "Recent Requisitions"}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/requisitions")} className="text-xs gap-1">
                View All <ArrowRight className="w-3 h-3" />
              </Button>
            </CardHeader>
            <CardContent>
              {recentRequisitions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No requisitions yet</p>
              ) : (
                <div className="space-y-2">
                  {recentRequisitions.map((req) => (
                    <div key={req.id} className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-muted/50 transition-colors">
                      <div>
                        <p className="text-sm font-medium text-foreground font-mono">{req.requisition_number}</p>
                        <p className="text-xs text-muted-foreground">{new Date(req.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">{Number(req.total_amount || 0).toFixed(0)} KSH</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${statusColor(req.status)}`}>
                          {req.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Low stock / Expected deliveries */}
        <Card className="border-border">
          <CardHeader className="pb-3 flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              {primaryRole === "warehouse_officer" ? "Items to Restock" : "Low Stock Alerts"}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/items")} className="text-xs gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Button>
          </CardHeader>
          <CardContent>
            {lowStockItems.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">All items adequately stocked ✓</p>
            ) : (
              <div className="space-y-2">
                {lowStockItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.barcode || item.sku || "No code"}</p>
                    </div>
                    <span className={`text-sm font-bold ${(item.quantity_in_stock || 0) <= 0 ? "text-red-500" : "text-amber-500"}`}>
                      {item.quantity_in_stock || 0} left
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
>>>>>>> origin/main
