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
