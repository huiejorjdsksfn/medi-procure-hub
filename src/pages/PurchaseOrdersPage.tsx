import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Plus, Download, Eye } from "lucide-react";
import { exportToExcel, exportToPDF } from "@/lib/export";

const PurchaseOrdersPage = () => {
  const { user, roles } = useAuth();
  const isAdmin = roles.includes("admin");
  const [orders, setOrders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ po_number: "", requisition_id: "", supplier_id: "", total_amount: "", delivery_date: "", status: "draft" });

  useEffect(() => { fetchOrders(); fetchSuppliers(); fetchRequisitions(); }, []);

  const fetchOrders = async () => {
    const { data } = await supabase.from("purchase_orders").select("*, suppliers(name), requisitions(requisition_number)").order("created_at", { ascending: false });
    setOrders(data || []);
  };
  const fetchSuppliers = async () => { const { data } = await supabase.from("suppliers").select("*").order("name"); setSuppliers(data || []); };
  const fetchRequisitions = async () => { const { data } = await supabase.from("requisitions").select("id, requisition_number").eq("status", "approved"); setRequisitions(data || []); };

  const generatePONumber = () => {
    const d = new Date();
    return `PO-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}-${Math.random().toString(36).substring(2,6).toUpperCase()}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("purchase_orders").insert({
      po_number: form.po_number || generatePONumber(),
      requisition_id: form.requisition_id || null,
      supplier_id: form.supplier_id || null,
      total_amount: parseFloat(form.total_amount) || 0,
      delivery_date: form.delivery_date || null,
      status: form.status,
      created_by: user?.id,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Purchase order created" });
    setDialogOpen(false);
    setForm({ po_number: "", requisition_id: "", supplier_id: "", total_amount: "", delivery_date: "", status: "draft" });
    fetchOrders();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Purchase Orders</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => exportToExcel(orders, "purchase-orders")}><Download className="w-4 h-4 mr-1" /> Excel</Button>
          {isAdmin && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> New PO</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Purchase Order</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2"><Label>PO Number</Label><Input value={form.po_number} onChange={(e) => setForm({...form, po_number: e.target.value})} placeholder="Auto-generated if empty" /></div>
                  <div className="space-y-2">
                    <Label>Requisition</Label>
                    <Select value={form.requisition_id} onValueChange={(v) => setForm({...form, requisition_id: v})}>
                      <SelectTrigger><SelectValue placeholder="Link to requisition" /></SelectTrigger>
                      <SelectContent>{requisitions.map(r => <SelectItem key={r.id} value={r.id}>{r.requisition_number}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Supplier</Label>
                    <Select value={form.supplier_id} onValueChange={(v) => setForm({...form, supplier_id: v})}>
                      <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                      <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Total Amount</Label><Input type="number" step="0.01" value={form.total_amount} onChange={(e) => setForm({...form, total_amount: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Delivery Date</Label><Input type="date" value={form.delivery_date} onChange={(e) => setForm({...form, delivery_date: e.target.value})} /></div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button type="submit">Create PO</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
      <div className="border border-border rounded-lg overflow-auto bg-card">
        <Table>
          <TableHeader><TableRow className="bg-muted/50">
            <TableHead>PO Number</TableHead><TableHead>Supplier</TableHead><TableHead>Requisition</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Delivery</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No purchase orders yet</TableCell></TableRow>
            ) : orders.map((o) => (
              <TableRow key={o.id} className="data-table-row">
                <TableCell className="font-mono font-medium">{o.po_number}</TableCell>
                <TableCell>{o.suppliers?.name || "—"}</TableCell>
                <TableCell className="font-mono text-sm">{o.requisitions?.requisition_number || "—"}</TableCell>
                <TableCell className="text-right">{Number(o.total_amount).toFixed(2)}</TableCell>
                <TableCell>{o.delivery_date || "—"}</TableCell>
                <TableCell><span className={`text-xs px-2 py-1 rounded-full capitalize ${o.status === "completed" ? "bg-success/10 text-success" : o.status === "draft" ? "bg-muted text-muted-foreground" : "bg-info/10 text-info"}`}>{o.status}</span></TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default PurchaseOrdersPage;
