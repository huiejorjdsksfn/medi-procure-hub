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
