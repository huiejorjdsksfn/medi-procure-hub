<<<<<<< HEAD
import { useNavigate } from "react-router-dom";
import { BarChart2, FileText, Download, TrendingUp, Package, DollarSign, Shield, Users, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const reportCategories = [
  {
    title: "Procurement Reports", color: "blue", icon: FileText,
    reports: [
      { name: "Purchase Orders Summary", desc: "All POs by period, supplier, or department", tag: "Daily" },
      { name: "Requisitions Status Report", desc: "Outstanding and completed requisitions", tag: "Weekly" },
      { name: "Supplier Performance Report", desc: "Delivery, quality, and pricing analysis", tag: "Monthly" },
      { name: "Tender Award Report", desc: "Tender decisions and award justifications", tag: "On Demand" },
      { name: "Contract Expiry Report", desc: "Contracts due for renewal in next 90 days", tag: "Monthly" },
    ]
  },
  {
    title: "Financial Reports", color: "green", icon: DollarSign,
    reports: [
      { name: "Expenditure Summary", desc: "Spend by department, category, and supplier", tag: "Monthly" },
      { name: "Budget Utilization Report", desc: "Budget vs actual with variance analysis", tag: "Monthly" },
      { name: "Outstanding Invoices", desc: "Accounts payable aging report", tag: "Weekly" },
      { name: "Payment Vouchers Register", desc: "All payment transactions by period", tag: "Daily" },
      { name: "Trial Balance", desc: "Debit and credit balances by account", tag: "Monthly" },
    ]
  },
  {
    title: "Inventory Reports", color: "indigo", icon: Package,
    reports: [
      { name: "Stock Status Report", desc: "Current stock levels across all locations", tag: "Daily" },
      { name: "Stock Movements Report", desc: "In/out movements for selected period", tag: "Daily" },
      { name: "Reorder Level Alert Report", desc: "Items below minimum stock threshold", tag: "Daily" },
      { name: "Inventory Valuation Report", desc: "Total stock value by item and category", tag: "Monthly" },
      { name: "Slow Moving Stock Report", desc: "Items with no movement in 90+ days", tag: "Monthly" },
    ]
  },
  {
    title: "Quality Reports", color: "teal", icon: Shield,
    reports: [
      { name: "Inspection Summary", desc: "Pass/fail rates by supplier and category", tag: "Monthly" },
      { name: "NCR Register", desc: "Non-conformance records and resolutions", tag: "Weekly" },
      { name: "Rejection Rate Analysis", desc: "Batch rejection trends by supplier", tag: "Monthly" },
    ]
  },
];

const tagColor = (tag: string) => ({
  "Daily": "text-blue-600 border-blue-200 bg-blue-50",
  "Weekly": "text-green-600 border-green-200 bg-green-50",
  "Monthly": "text-purple-600 border-purple-200 bg-purple-50",
  "On Demand": "text-amber-600 border-amber-200 bg-amber-50",
}[tag] ?? "text-slate-600 border-slate-200");

export default function ReportsPage() {
  const navigate = useNavigate();
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reports Centre</h1>
          <p className="text-sm text-slate-500 mt-0.5">Generate and download operational reports</p>
        </div>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => navigate("/analytics")}>
          <BarChart2 className="w-4 h-4 mr-2" />Analytics Dashboard
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportCategories.map((cat) => (
          <div key={cat.title} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <cat.icon className={`w-5 h-5 text-${cat.color}-500`} />{cat.title}
            </h2>
            <div className="space-y-2">
              {cat.reports.map((r) => (
                <div key={r.name} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 transition-colors group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700">{r.name}</p>
                    <p className="text-xs text-slate-400 truncate">{r.desc}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    <Badge variant="outline" className={`text-xs ${tagColor(r.tag)}`}>{r.tag}</Badge>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100">
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100">
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
=======
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Download, BarChart3, TrendingUp, Package, AlertTriangle } from "lucide-react";
import { exportToPDF } from "@/lib/export";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["#1e3a5f", "#2d9596", "#d4a843", "#e74c3c", "#8e44ad", "#27ae60", "#3498db", "#f39c12"];

const ReportsPage = () => {
  const [reportType, setReportType] = useState("items");
  const [data, setData] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    let result: any[] = [];
    switch (reportType) {
      case "items": {
        const { data } = await supabase.from("items").select("*, item_categories(name), suppliers(name)").order("name");
        result = data || [];
        break;
      }
      case "requisitions": {
        const { data } = await supabase.from("requisitions").select("*").order("created_at", { ascending: false });
        result = data || [];
        break;
      }
      case "purchase_orders": {
        const { data } = await supabase.from("purchase_orders").select("*, suppliers(name)").order("created_at", { ascending: false });
        result = data || [];
        break;
      }
      case "suppliers": {
        const { data } = await supabase.from("suppliers").select("*").order("name");
        result = data || [];
        break;
      }
      case "low_stock": {
        const { data } = await supabase.from("items").select("*, item_categories(name)").order("quantity_in_stock");
        result = (data || []).filter(i => (i.quantity_in_stock || 0) <= (i.reorder_level || 10));
        break;
      }
      case "goods_received": {
        const { data } = await supabase.from("goods_received").select("*, purchase_orders(po_number)").order("created_at", { ascending: false });
        result = data || [];
        break;
      }
    }
    setData(result);
    setLoading(false);
  };

  useEffect(() => { fetchReport(); }, [reportType]);

  useEffect(() => {
    const fetchAll = async () => {
      const [{ data: i }, { data: s }] = await Promise.all([
        supabase.from("items").select("*, item_categories(name), suppliers(name)"),
        supabase.from("suppliers").select("*"),
      ]);
      setItems(i || []);
      setSuppliers(s || []);
    };
    fetchAll();
  }, []);

  const reportLabels: Record<string, string> = {
    items: "All Items", requisitions: "Requisitions", purchase_orders: "Purchase Orders",
    suppliers: "Suppliers", low_stock: "Low Stock Alerts", goods_received: "Goods Received",
  };

  // Analytics data
  const typeData = ["pharmaceutical", "consumable", "equipment", "surgical", "laboratory", "general"]
    .map(t => ({ name: t.charAt(0).toUpperCase() + t.slice(1), count: items.filter(i => i.item_type === t).length, value: items.filter(i => i.item_type === t).reduce((s, i) => s + (i.quantity_in_stock || 0) * (i.unit_price || 0), 0) }))
    .filter(d => d.count > 0);

  const topSuppliers = suppliers
    .map(s => ({ name: s.name.length > 20 ? s.name.substring(0, 20) + "…" : s.name, items: items.filter(i => i.supplier_id === s.id).length }))
    .filter(s => s.items > 0)
    .sort((a, b) => b.items - a.items)
    .slice(0, 10);

  const lowStockItems = items.filter(i => (i.quantity_in_stock || 0) <= (i.reorder_level || 10));

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><BarChart3 className="w-6 h-6" /> Analytics & Reports</h1>

      {/* Dashboard KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Package className="w-5 h-5 text-primary" /></div>
          <div><p className="text-2xl font-bold">{items.length}</p><p className="text-xs text-muted-foreground">Total Items</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10"><TrendingUp className="w-5 h-5 text-emerald-600" /></div>
          <div><p className="text-2xl font-bold">KSH {(items.reduce((s, i) => s + (i.quantity_in_stock || 0) * (i.unit_price || 0), 0) / 1000000).toFixed(1)}M</p><p className="text-xs text-muted-foreground">Inventory Value</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-destructive/10"><AlertTriangle className="w-5 h-5 text-destructive" /></div>
          <div><p className="text-2xl font-bold">{lowStockItems.length}</p><p className="text-xs text-muted-foreground">Low Stock Alerts</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-secondary/10"><Package className="w-5 h-5 text-secondary" /></div>
          <div><p className="text-2xl font-bold">{suppliers.length}</p><p className="text-xs text-muted-foreground">Active Suppliers</p></div>
        </CardContent></Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">Inventory Value by Type (KSH)</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000000).toFixed(1)}M`} />
                <Tooltip formatter={(v: number) => `KSH ${v.toLocaleString()}`} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Items by Category Type</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={typeData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, count }) => `${name}: ${count}`}>
                  {typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">Top Suppliers by Item Count</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topSuppliers} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 9 }} />
                <Tooltip />
                <Bar dataKey="items" fill="hsl(var(--secondary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Report Generator */}
      <Card className="border-border">
        <CardHeader><CardTitle className="text-lg">Generate Report</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="min-w-[200px]">
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(reportLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={() => exportToPDF(data, reportLabels[reportType], Object.keys(data[0] || {}).filter(k => typeof (data[0] as any)[k] !== "object").slice(0, 6))}>
              <Download className="w-4 h-4 mr-1" /> Download PDF
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">{loading ? "Loading..." : `${data.length} records for "${reportLabels[reportType]}"`}</p>

          {data.length > 0 && (
            <div className="border border-border rounded-lg overflow-auto max-h-80">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    {Object.keys(data[0]).filter(k => typeof data[0][k] !== "object").slice(0, 7).map((key) => (
                      <th key={key} className="text-left px-3 py-2 font-medium text-muted-foreground border-b border-border whitespace-nowrap text-xs">
                        {key.replace(/_/g, " ").toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.slice(0, 50).map((row, i) => (
                    <tr key={i} className="data-table-row border-b border-border">
                      {Object.entries(row).filter(([, v]) => typeof v !== "object").slice(0, 7).map(([k, v], j) => (
                        <td key={j} className="px-3 py-2 whitespace-nowrap text-xs">{String(v ?? "—")}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsPage;
>>>>>>> origin/main
