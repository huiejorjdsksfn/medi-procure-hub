import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Package,
  FileText,
  ShoppingCart,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle,
  Truck,
} from "lucide-react";

const DashboardPage = () => {
  const { profile, roles } = useAuth();
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStock: 0,
    pendingRequisitions: 0,
    approvedRequisitions: 0,
    totalPOs: 0,
    totalSuppliers: 0,
  });
  const [recentRequisitions, setRecentRequisitions] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
    fetchRecentRequisitions();
    fetchLowStockItems();
  }, []);

  const fetchStats = async () => {
    const [items, lowStock, pendingReqs, approvedReqs, pos, suppliers] =
      await Promise.all([
        supabase.from("items").select("id", { count: "exact", head: true }),
        supabase.from("items").select("id", { count: "exact", head: true }).lt("quantity_in_stock", 10),
        supabase.from("requisitions").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("requisitions").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("purchase_orders").select("id", { count: "exact", head: true }),
        supabase.from("suppliers").select("id", { count: "exact", head: true }),
      ]);

    setStats({
      totalItems: items.count || 0,
      lowStock: lowStock.count || 0,
      pendingRequisitions: pendingReqs.count || 0,
      approvedRequisitions: approvedReqs.count || 0,
      totalPOs: pos.count || 0,
      totalSuppliers: suppliers.count || 0,
    });
  };

  const fetchRecentRequisitions = async () => {
    const { data } = await supabase
      .from("requisitions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);
    setRecentRequisitions(data || []);
  };

  const fetchLowStockItems = async () => {
    const { data } = await supabase
      .from("items")
      .select("*")
      .lt("quantity_in_stock", 10)
      .order("quantity_in_stock", { ascending: true })
      .limit(5);
    setLowStockItems(data || []);
  };

  const statCards = [
    { label: "Total Items", value: stats.totalItems, icon: Package, color: "text-primary" },
    { label: "Low Stock Alerts", value: stats.lowStock, icon: AlertTriangle, color: "text-destructive" },
    { label: "Pending Requisitions", value: stats.pendingRequisitions, icon: Clock, color: "text-warning" },
    { label: "Approved Requisitions", value: stats.approvedRequisitions, icon: CheckCircle, color: "text-success" },
    { label: "Purchase Orders", value: stats.totalPOs, icon: ShoppingCart, color: "text-secondary" },
    { label: "Suppliers", value: stats.totalSuppliers, icon: Truck, color: "text-info" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {profile?.full_name || "User"}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Here's your procurement overview for today
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`p-3 rounded-lg bg-muted ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent requisitions */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Recent Requisitions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentRequisitions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No requisitions yet
              </p>
            ) : (
              <div className="space-y-3">
                {recentRequisitions.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {req.requisition_number}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(req.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        req.status === "approved"
                          ? "bg-success/10 text-success"
                          : req.status === "pending"
                          ? "bg-warning/10 text-warning"
                          : req.status === "rejected"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low stock alerts */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockItems.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                All items are adequately stocked
              </p>
            ) : (
              <div className="space-y-3">
                {lowStockItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {item.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.barcode || "No barcode"}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-destructive">
                      {item.quantity_in_stock} left
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
