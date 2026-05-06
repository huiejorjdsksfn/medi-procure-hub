import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ShoppingCart, FileText, BarChart3, Package, ClipboardList, AlertTriangle,
  Clock, Database, Store, ChevronRight, Check, X, Send, Truck,
} from "lucide-react";

const QUICK = [
  { icon: ShoppingCart, label: "Requisitions", color: "bg-sky-500" },
  { icon: FileText, label: "POs", color: "bg-sky-500" },
  { icon: BarChart3, label: "Overview Report", color: "bg-sky-500" },
  { icon: Package, label: "Sell Report", color: "bg-sky-500" },
  { icon: ClipboardList, label: "Purchase Report", color: "bg-sky-500" },
  { icon: AlertTriangle, label: "Stock Alert", color: "bg-sky-500" },
  { icon: Clock, label: "Expired", color: "bg-sky-500" },
  { icon: Database, label: "Backup / Restore", color: "bg-sky-500" },
  { icon: Store, label: "Stores", color: "bg-sky-500" },
];

const TrackingApprovalPage = () => {
  const { toast } = useToast();
  const [tiles, setTiles] = useState({ invoices: 0, customers: 0, suppliers: 0, products: 0,
    invToday: 0, custToday: 0, supToday: 0, prodToday: 0 });
  const [activity, setActivity] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [bars, setBars] = useState({ sell: 0, discount: 0, due: 0, received: 0 });

  const load = async () => {
    const today = new Date(); today.setHours(0,0,0,0);
    const iso = today.toISOString();
    const [{ data: pos }, { data: cus }, { data: sup }, { data: it }, { data: req }] = await Promise.all([
      supabase.from("purchase_orders").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id,created_at"),
      supabase.from("suppliers").select("id,created_at"),
      supabase.from("items").select("id,created_at"),
      supabase.from("requisitions").select("*").eq("status", "pending").order("created_at", { ascending: false }).limit(20),
    ]);
    setTiles({
      invoices: (pos || []).length,
      customers: (cus || []).length,
      suppliers: (sup || []).length,
      products: (it || []).length,
      invToday: (pos || []).filter((r: any) => r.created_at >= iso).length,
      custToday: (cus || []).filter((r: any) => r.created_at >= iso).length,
      supToday: (sup || []).filter((r: any) => r.created_at >= iso).length,
      prodToday: (it || []).filter((r: any) => r.created_at >= iso).length,
    });
    setActivity((pos || []).slice(0, 6));
    setPending(req || []);
    const totalSell = (pos || []).reduce((s, p: any) => s + (Number(p.total_amount) || 0), 0);
    setBars({
      sell: totalSell,
      discount: Math.round(totalSell * 0.02),
      due: Math.round(totalSell * 0.15),
      received: Math.round(totalSell * 0.83),
    });
  };

  useEffect(() => { load(); }, []);

  const decide = async (id: string, status: "approved" | "rejected") => {
    await (supabase as any).from("requisitions").update({ status }).eq("id", id);
    try {
      await supabase.functions.invoke("send-sms", {
        body: { event: status, requisitionId: id },
      });
    } catch { /* edge function may not be deployed yet */ }
    toast({ title: `Requisition ${status}`, description: id });
    load();
  };

  const TILES = [
    { label: "TOTAL INVOICE", val: tiles.invoices, today: tiles.invToday, todayLabel: "TOTAL INVOICE TODAY" },
    { label: "TOTAL CUSTOMER", val: tiles.customers, today: tiles.custToday, todayLabel: "TOTAL CUSTOMER TODAY" },
    { label: "TOTAL SUPPLIER", val: tiles.suppliers, today: tiles.supToday, todayLabel: "TOTAL SUPPLIER TODAY" },
    { label: "TOTAL PRODUCT", val: tiles.products, today: tiles.prodToday, todayLabel: "TOTAL PRODUCT TODAY" },
  ];

  return (
    <div className="space-y-4 animate-fade-in bg-[#fdf6ec] p-4 rounded-lg">
      <h1 className="text-2xl font-bold text-slate-700 border-b-2 border-orange-400 inline-block pb-1">
        Dashboard to track procurement & approvals
      </h1>

      {/* Quick-action ribbon */}
      <Card className="border-slate-200">
        <CardContent className="p-4 grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
          {QUICK.map((q) => (
            <button key={q.label} className="flex flex-col items-center text-xs text-slate-600 hover:text-sky-600">
              <div className={`w-12 h-12 rounded-full ${q.color} text-white flex items-center justify-center shadow`}>
                <q.icon className="w-6 h-6" />
              </div>
              <span className="mt-1 text-center">{q.label}</span>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* KPI tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {TILES.map((t) => (
          <Card key={t.label} className="bg-[#fdf3e6] border-orange-200 overflow-hidden">
            <CardContent className="p-4">
              <div className="text-xs font-semibold text-slate-600">{t.label}</div>
              <div className="text-3xl font-bold text-slate-800">{t.val.toLocaleString()}</div>
              <div className="text-xs font-semibold text-slate-600 mt-2">{t.todayLabel}</div>
              <div className="text-2xl font-bold text-slate-800">{t.today}</div>
              <div className="-mx-4 -mb-4 mt-3 bg-sky-500 text-white text-xs font-semibold py-1.5 px-4 flex items-center justify-between">
                DETAILS <ChevronRight className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent + financial bars */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="lg:col-span-2 border-slate-200">
          <CardContent className="p-4">
            <div className="font-semibold text-slate-700 mb-2">Recent Activities</div>
            <Tabs defaultValue="orders">
              <TabsList className="bg-orange-100">
                <TabsTrigger value="orders">Orders</TabsTrigger>
                <TabsTrigger value="approvals">Pending Approvals</TabsTrigger>
              </TabsList>
              <TabsContent value="orders" className="mt-3">
                <table className="w-full text-xs">
                  <thead className="bg-orange-400 text-white">
                    <tr>
                      <th className="px-2 py-1.5 text-left">PO #</th>
                      <th className="px-2 py-1.5 text-left">Created</th>
                      <th className="px-2 py-1.5 text-left">Supplier</th>
                      <th className="px-2 py-1.5 text-right">Amount</th>
                      <th className="px-2 py-1.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activity.map((p: any, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="px-2 py-1.5 font-medium">{p.po_number || p.id?.slice(0,8)}</td>
                        <td className="px-2 py-1.5">{new Date(p.created_at).toLocaleDateString()}</td>
                        <td className="px-2 py-1.5">{p.supplier_name || "—"}</td>
                        <td className="px-2 py-1.5 text-right">{Number(p.total_amount || 0).toLocaleString()}</td>
                        <td className="px-2 py-1.5 text-center">
                          <Badge className={p.status === "approved" ? "bg-sky-500" : "bg-orange-400"}>
                            {p.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {!activity.length && (
                      <tr><td colSpan={5} className="text-center py-6 text-slate-400">No activity</td></tr>
                    )}
                  </tbody>
                </table>
              </TabsContent>
              <TabsContent value="approvals" className="mt-3 space-y-2">
                {pending.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between border border-slate-200 rounded p-2 text-xs">
                    <div>
                      <div className="font-semibold text-slate-700">{r.requisition_number || r.id?.slice(0,8)}</div>
                      <div className="text-slate-500">{r.department || r.purpose || "Pending review"}</div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" className="h-7 bg-emerald-500 hover:bg-emerald-600" onClick={() => decide(r.id, "approved")}>
                        <Check className="w-3 h-3 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" className="h-7" onClick={() => decide(r.id, "rejected")}>
                        <X className="w-3 h-3 mr-1" /> Reject
                      </Button>
                      <Button size="sm" variant="outline" className="h-7" onClick={() =>
                        supabase.functions.invoke("send-sms", { body: { event: "forwarded", requisitionId: r.id } })
                          .then(() => toast({ title: "Forwarded" }))
                          .catch(() => toast({ title: "SMS gateway not configured" }))
                      }>
                        <Send className="w-3 h-3 mr-1" /> Forward
                      </Button>
                    </div>
                  </div>
                ))}
                {!pending.length && (
                  <div className="text-center py-6 text-slate-400 text-xs">No pending approvals</div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4 space-y-3">
            {[
              { label: "Sell Amount", val: bars.sell, color: "bg-emerald-400" },
              { label: "Discount Given", val: bars.discount, color: "bg-amber-400" },
              { label: "Due Given", val: bars.due, color: "bg-rose-400" },
              { label: "Received Amount", val: bars.received, color: "bg-sky-400" },
            ].map((b, i, arr) => {
              const max = Math.max(...arr.map((x) => x.val), 1);
              return (
                <div key={b.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600">{b.label}</span>
                    <span className="font-bold text-slate-700">{b.val.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded">
                    <div className={`h-2 ${b.color} rounded`} style={{ width: `${(b.val / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
            <Button className="w-full bg-orange-500 hover:bg-orange-600 mt-2">
              <Truck className="w-4 h-4 mr-2" /> Overview Report
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TrackingApprovalPage;