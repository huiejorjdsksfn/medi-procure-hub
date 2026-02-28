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
import { Plus, Download, FileDown } from "lucide-react";
import { exportToExcel, generateLPO_PDF } from "@/lib/export";
import { logAudit } from "@/lib/audit";

const PurchaseOrdersPage = () => {
  const { user, profile, hasRole } = useAuth();
  const canCreate = hasRole("admin") || hasRole("procurement_officer");
  const [orders, setOrders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ po_number: "", requisition_id: "", supplier_id: "", total_amount: "", delivery_date: "", status: "draft" });

  useEffect(() => { fetchOrders(); fetchSuppliers(); fetchRequisitions(); }, []);

  const fetchOrders = async () => {
    const { data } = await supabase.from("purchase_orders").select("*, suppliers(name, contact_person, phone, email, address, tax_id), requisitions(requisition_number)").order("created_at", { ascending: false });
    setOrders(data || []);
  };
  const fetchSuppliers = async () => { const { data } = await supabase.from("suppliers").select("*").order("name"); setSuppliers(data || []); };
  const fetchRequisitions = async () => { const { data } = await supabase.from("requisitions").select("id, requisition_number").eq("status", "approved"); setRequisitions(data || []); };

  const generatePONumber = () => {
    const d = new Date();
    return `LPO/EL5H/${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}/${Math.random().toString(36).substring(2,6).toUpperCase()}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const poNum = form.po_number || generatePONumber();
    const { data, error } = await supabase.from("purchase_orders").insert({
      po_number: poNum,
      requisition_id: form.requisition_id || null,
      supplier_id: form.supplier_id || null,
      total_amount: parseFloat(form.total_amount) || 0,
      delivery_date: form.delivery_date || null,
      status: form.status,
      created_by: user?.id,
    }).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    logAudit(user?.id, profile?.full_name, "create", "purchase_orders", data?.id, { po_number: poNum, supplier_id: form.supplier_id });
    toast({ title: "Purchase order created" });
    setDialogOpen(false);
    setForm({ po_number: "", requisition_id: "", supplier_id: "", total_amount: "", delivery_date: "", status: "draft" });
    fetchOrders();
  };

  const downloadLPO = (po: any) => {
    const supplier = suppliers.find(s => s.id === po.supplier_id) || po.suppliers;
    generateLPO_PDF(po, supplier, []);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Purchase Orders</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => exportToExcel(orders.map(o => ({ po_number: o.po_number, supplier: o.suppliers?.name, amount: o.total_amount, delivery: o.delivery_date, status: o.status, created: o.created_at })), "purchase-orders")}><Download className="w-4 h-4 mr-1" /> Excel</Button>
          {canCreate && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> New LPO</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Local Purchase Order (EL5H/SCM/FRM/002)</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2"><Label>LPO Number</Label><Input value={form.po_number} onChange={(e) => setForm({...form, po_number: e.target.value})} placeholder="Auto-generated if empty" /></div>
                  <div className="space-y-2"><Label>Requisition Reference</Label>
                    <Select value={form.requisition_id} onValueChange={(v) => setForm({...form, requisition_id: v})}>
                      <SelectTrigger><SelectValue placeholder="Link to requisition" /></SelectTrigger>
                      <SelectContent>{requisitions.map(r => <SelectItem key={r.id} value={r.id}>{r.requisition_number}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Supplier *</Label>
                    <Select value={form.supplier_id} onValueChange={(v) => setForm({...form, supplier_id: v})}>
                      <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                      <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Total Amount (KSH)</Label><Input type="number" step="0.01" value={form.total_amount} onChange={(e) => setForm({...form, total_amount: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Delivery Date</Label><Input type="date" value={form.delivery_date} onChange={(e) => setForm({...form, delivery_date: e.target.value})} /></div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button type="submit">Create LPO</Button>
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
            <TableHead>LPO Number</TableHead><TableHead>Supplier</TableHead><TableHead>Requisition</TableHead><TableHead className="text-right">Amount (KSH)</TableHead><TableHead>Delivery</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead><TableHead className="w-16">PDF</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No purchase orders yet</TableCell></TableRow>
            ) : orders.map((o) => (
              <TableRow key={o.id} className="data-table-row">
                <TableCell className="font-mono font-medium">{o.po_number}</TableCell>
                <TableCell>{o.suppliers?.name || "—"}</TableCell>
                <TableCell className="font-mono text-sm">{o.requisitions?.requisition_number || "—"}</TableCell>
                <TableCell className="text-right">{Number(o.total_amount).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</TableCell>
                <TableCell>{o.delivery_date || "—"}</TableCell>
                <TableCell><span className={`text-xs px-2 py-1 rounded-full capitalize ${o.status === "completed" ? "bg-emerald-500/10 text-emerald-600" : o.status === "draft" ? "bg-muted text-muted-foreground" : "bg-blue-500/10 text-blue-600"}`}>{o.status}</span></TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</TableCell>
                <TableCell><Button variant="ghost" size="sm" onClick={() => downloadLPO(o)}><FileDown className="w-4 h-4" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default PurchaseOrdersPage;
