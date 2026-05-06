import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, Legend,
} from "recharts";
import {
  Activity, TrendingUp, AlertCircle, CheckCircle2, RefreshCw, Plus,
  LayoutGrid, Heart, Lightbulb, Boxes, Layers, Zap, Snowflake, Wifi,
  GitBranch, FileBarChart, Star, Users, Bell,
} from "lucide-react";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const EnterpriseDashboardPage = () => {
  const [overview, setOverview] = useState({
    spend: 0, suppliers: 0, openPOs: 0, pendingApprovals: 0,
    incidents: 0, advisories: 0, healthy: 100,
  });
  const [bySupplier, setBySupplier] = useState<any[]>([]);
  const [trend, setTrend] = useState<any[]>([]);
  const [perf, setPerf] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: pos }, { data: sups }, { data: reqs }, { data: items }] = await Promise.all([
        supabase.from("purchase_orders").select("supplier_id, total_amount, created_at, status"),
        supabase.from("suppliers").select("id, name"),
        supabase.from("requisitions").select("status"),
        supabase.from("items").select("quantity_in_stock"),
      ]);
      const totalSpend = (pos || []).reduce((s, p: any) => s + (Number(p.total_amount) || 0), 0);
      const open = (pos || []).filter((p: any) => p.status !== "closed" && p.status !== "completed").length;
      const pending = (reqs || []).filter((r: any) => r.status === "pending").length;
      const lowStock = (items || []).filter((i: any) => Number(i.quantity_in_stock) < 10).length;

      setOverview({
        spend: totalSpend,
        suppliers: (sups || []).length,
        openPOs: open,
        pendingApprovals: pending,
        incidents: 0,
        advisories: lowStock,
        healthy: Math.max(60, 100 - lowStock * 2),
      });

      const supMap: Record<string, number> = {};
      (pos || []).forEach((p: any) => {
        const name = (sups || []).find((s: any) => s.id === p.supplier_id)?.name || "Unknown";
        supMap[name] = (supMap[name] || 0) + (Number(p.total_amount) || 0);
      });
      setBySupplier(
        Object.entries(supMap).slice(0, 6).map(([name, value]) => ({ name: name.slice(0, 12), value }))
      );

      const months: Record<string, number> = {};
      (pos || []).forEach((p: any) => {
        const m = new Date(p.created_at).toLocaleString("en", { month: "short" });
        months[m] = (months[m] || 0) + (Number(p.total_amount) || 0);
      });
      setTrend(Object.entries(months).map(([month, spend]) => ({ month, spend })));

      setPerf(Array.from({ length: 24 }, (_, i) => ({
        h: `${i}:00`,
        response: 80 + Math.round(Math.random() * 60),
      })));
    })();
  }, []);

  const sidebar = [
    { icon: LayoutGrid, label: "Enterprise Overview", active: true },
    { icon: Heart, label: "Enterprise Health" },
    { icon: Lightbulb, label: "What-if" },
    { icon: Boxes, label: "Inventory" },
    { icon: Layers, label: "Space" },
    { icon: Zap, label: "Power" },
    { icon: Snowflake, label: "Cooling" },
    { icon: Wifi, label: "Connectivity" },
    { icon: GitBranch, label: "Change" },
    { icon: FileBarChart, label: "Data Reports" },
    { icon: Star, label: "Favorites" },
  ];

  return (
    <div className="flex h-[calc(100vh-7rem)] -m-4 md:-m-6 bg-[hsl(215_30%_10%)] text-foreground">
      {/* Left rail */}
      <aside className="w-56 bg-[hsl(215_35%_8%)] border-r border-sidebar-border flex flex-col text-sm">
        <div className="p-3 border-b border-sidebar-border font-bold text-sidebar-foreground">
          Enterprise Dashboard
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {sidebar.map((s) => (
            <button
              key={s.label}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left ${
                s.active
                  ? "bg-sidebar-accent text-sidebar-primary font-medium"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60"
              }`}
            >
              <s.icon className="w-4 h-4" /> {s.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top tabs */}
        <div className="bg-[hsl(215_28%_14%)] border-b border-sidebar-border px-4 py-2 flex items-center gap-4 text-xs">
          {["Dashboard", "Visualization", "Capacity", "Assets", "Connectivity", "Change", "Reports", "Events", "Settings"].map((t, i) => (
            <button key={t} className={`px-2 py-1 ${i === 0 ? "text-accent border-b-2 border-accent font-semibold" : "text-sidebar-foreground/70 hover:text-sidebar-foreground"}`}>
              {t}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-3">
            <Bell className="w-4 h-4 text-sidebar-foreground/60" />
            <Users className="w-4 h-4 text-sidebar-foreground/60" />
          </div>
        </div>

        {/* Action bar */}
        <div className="bg-[hsl(215_28%_18%)] border-b border-sidebar-border px-3 py-2 flex flex-wrap gap-2">
          <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 h-8">
            <Plus className="w-4 h-4 mr-1" /> Add a Dashboard
          </Button>
          <Button size="sm" variant="secondary" className="h-8">Manage Dashboards</Button>
          <Button size="sm" variant="secondary" className="h-8">
            <Plus className="w-4 h-4 mr-1" /> Add a Widget
          </Button>
          <Button size="sm" variant="secondary" className="h-8">★ Favorite</Button>
          <Button size="sm" variant="secondary" className="h-8">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="secondary" className="h-8" onClick={() => window.print()}>Print</Button>
          <Button size="sm" variant="secondary" className="h-8">Slideshow</Button>
          <Button size="sm" variant="secondary" className="h-8">Schedule</Button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Health status row (from M365 reference) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-destructive text-destructive-foreground rounded-lg p-4 flex items-center justify-between shadow">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-7 h-7" />
                <div className="font-semibold">Incident</div>
              </div>
              <div className="text-3xl font-bold">{overview.incidents}%</div>
            </div>
            <div className="bg-accent text-accent-foreground rounded-lg p-4 flex items-center justify-between shadow">
              <div className="flex items-center gap-3">
                <Activity className="w-7 h-7" />
                <div className="font-semibold">Advisory</div>
              </div>
              <div className="text-3xl font-bold">{Math.min(overview.advisories, 99)}%</div>
            </div>
            <div className="bg-success text-success-foreground rounded-lg p-4 flex items-center justify-between shadow">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-7 h-7" />
                <div className="font-semibold">Healthy</div>
              </div>
              <div className="text-3xl font-bold">{overview.healthy}%</div>
            </div>
          </div>

          {/* KPI tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total Spend", val: `KSh ${overview.spend.toLocaleString()}`, icon: TrendingUp },
              { label: "Suppliers", val: overview.suppliers, icon: Users },
              { label: "Open POs", val: overview.openPOs, icon: Boxes },
              { label: "Pending Approvals", val: overview.pendingApprovals, icon: Bell },
            ].map((k) => (
              <Card key={k.label} className="bg-[hsl(215_28%_14%)] border-sidebar-border">
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-sidebar-foreground/60">{k.label}</div>
                    <div className="text-xl font-bold text-sidebar-foreground">{k.val}</div>
                  </div>
                  <k.icon className="w-7 h-7 text-sidebar-primary" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Card className="bg-[hsl(215_28%_14%)] border-sidebar-border">
              <CardContent className="p-3">
                <div className="text-sm font-semibold text-sidebar-foreground mb-2">Spend by Supplier</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={bySupplier}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334" />
                    <XAxis dataKey="name" stroke="#9aa" fontSize={10} />
                    <YAxis stroke="#9aa" fontSize={10} />
                    <Tooltip contentStyle={{ background: "#1c2433", border: "none" }} />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-[hsl(215_28%_14%)] border-sidebar-border">
              <CardContent className="p-3">
                <div className="text-sm font-semibold text-sidebar-foreground mb-2">Monthly Spend Trend</div>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334" />
                    <XAxis dataKey="month" stroke="#9aa" fontSize={10} />
                    <YAxis stroke="#9aa" fontSize={10} />
                    <Tooltip contentStyle={{ background: "#1c2433", border: "none" }} />
                    <Area type="monotone" dataKey="spend" stroke="#10b981" fill="#10b98144" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-[hsl(215_28%_14%)] border-sidebar-border lg:col-span-2">
              <CardContent className="p-3">
                <div className="text-sm font-semibold text-sidebar-foreground mb-2">System Performance (24h)</div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={perf}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334" />
                    <XAxis dataKey="h" stroke="#9aa" fontSize={10} />
                    <YAxis stroke="#9aa" fontSize={10} />
                    <Tooltip contentStyle={{ background: "#1c2433", border: "none" }} />
                    <Legend wrapperStyle={{ color: "#9aa" }} />
                    <Line type="monotone" dataKey="response" stroke="#06b6d4" dot={false} name="Response (ms)" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnterpriseDashboardPage;