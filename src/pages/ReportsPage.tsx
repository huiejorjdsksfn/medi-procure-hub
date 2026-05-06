import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Download, BarChart3 } from "lucide-react";
import { exportToExcel, exportToPDF } from "@/lib/export";

const ReportsPage = () => {
  const [reportType, setReportType] = useState("items");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    let result: any[] = [];
    switch (reportType) {
      case "items": {
        const { data } = await supabase.from("items").select("*, item_categories(name), departments(name)").order("name");
        result = data || [];
        break;
      }
      case "requisitions": {
        const { data } = await supabase.from("requisitions").select("*, departments(name)").order("created_at", { ascending: false });
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
        const { data } = await supabase.from("items").select("*, item_categories(name), departments(name)").lt("quantity_in_stock", 10).order("quantity_in_stock");
        result = data || [];
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

  const reportLabels: Record<string, string> = {
    items: "All Items",
    requisitions: "All Requisitions",
    purchase_orders: "Purchase Orders",
    suppliers: "Suppliers",
    low_stock: "Low Stock Items",
    goods_received: "Goods Received",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="w-6 h-6" /> Reports
        </h1>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">Generate Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2 min-w-[200px]">
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(reportLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={() => exportToExcel(data, reportType)}>
              <Download className="w-4 h-4 mr-1" /> Export Excel
            </Button>
            <Button variant="outline" onClick={() => exportToPDF(data, reportLabels[reportType], Object.keys(data[0] || {}).filter(k => typeof (data[0] as any)[k] !== "object").slice(0, 6))}>
              <Download className="w-4 h-4 mr-1" /> Export PDF
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            {loading ? "Loading..." : `${data.length} records found for "${reportLabels[reportType]}"`}
          </div>

          {data.length > 0 && (
            <div className="border border-border rounded-lg overflow-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    {Object.keys(data[0]).filter(k => typeof data[0][k] !== "object").slice(0, 8).map((key) => (
                      <th key={key} className="text-left px-3 py-2 font-medium text-muted-foreground border-b border-border whitespace-nowrap">
                        {key.replace(/_/g, " ").toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.slice(0, 50).map((row, i) => (
                    <tr key={i} className="data-table-row border-b border-border">
                      {Object.entries(row).filter(([, v]) => typeof v !== "object").slice(0, 8).map(([k, v], j) => (
                        <td key={j} className="px-3 py-2 whitespace-nowrap">{String(v ?? "—")}</td>
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
