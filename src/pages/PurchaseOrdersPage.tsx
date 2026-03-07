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
import { Plus, Download, FileDown, Search, Eye } from "lucide-react";
import { exportToPDF, generateLPO_PDF } from "@/lib/export";
import { logAudit } from "@/lib/audit";
import ForwardEmailDialog from "@/components/ForwardEmailDialog";
import { Forward } from "lucide-react";

const PurchaseOrdersPage = () => {
  const { user, profile, hasRole } = useAuth();
  const canCreate = hasRole("admin") || hasRole("procurement_officer");
  const [orders, setOrders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [requisitionItems, setRequisitionItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialog, setDetailDialog] = useState<any>(null);
  const [forwardDialog, setForwardDialog] = useState<any | null>(null);
  const [detailItems, setDetailItems] = useState<any[]>([]);
  const [form, setForm] = useState({ po_number: "", requisition_id: "", supplier_id: "", total_amount: "", delivery_date: "", status: "draft" });

  useEffect(() => { fetchOrders(); fetchSuppliers(); fetchRequisitions(); }, []);
  useEffect(() => {
    const ch = supabase.channel("po-rt").on("postgres_changes", { event: "*", schema: "public", table: "purchase_orders" }, () => fetchOrders()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const fetchOrders = async () => {
    const { data } = await supabase.from("purchase_orders").select("*, suppliers(name, contact_person, phone, email, address, tax_id), requisitions(requisition_number)").order("created_at", { ascending: false });
    setOrders(data || []);
  };
  const fetchSuppliers = async () => { const { data } = await supabase.from("suppliers").select("*").order("name"); setSuppliers(data || []); };
  const fetchRequisitions = async () => { const { data } = await supabase.from("requisitions").select("id, requisition_number, total_amount").eq("status", "approved"); setRequisitions(data || []); };

  const loadRequisitionItems = async (reqId: string) => {
    const { data } = await supabase.from("requisition_items").select("*").eq("requisition_id", reqId);
    setRequisitionItems(data || []);
    // Auto-fill total amount
    const total = (data || []).reduce((s: number, li: any) => s + Number(li.total_price || 0), 0);
    setForm(prev => ({ ...prev, total_amount: String(total), requisition_id: reqId }));
  };

  const generatePONumber = () => {
    const d = new Date();
    return `LPO/EL5H/${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}/${Math.random().toString(36).substring(2,6).toUpperCase()}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const poNum = form.po_number || generatePONumber();
    const { data, error } = await supabase.from("purchase_orders").insert({
      po_number: poNum, requisition_id: form.requisition_id || null,
      supplier_id: form.supplier_id || null, total_amount: parseFloat(form.total_amount) || 0,
      delivery_date: form.delivery_date || null, status: form.status, created_by: user?.id,
    }).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    logAudit(user?.id, profile?.full_name, "create", "purchase_orders", data?.id, { po_number: poNum });
    toast({ title: "LPO created" });
    setDialogOpen(false);
    setForm({ po_number: "", requisition_id: "", supplier_id: "", total_amount: "", delivery_date: "", status: "draft" });
    setRequisitionItems([]);
  };

  const viewDetail = async (po: any) => {
    setDetailDialog(po);
    if (po.requisition_id) {
      const { data } = await supabase.from("requisition_items").select("*").eq("requisition_id", po.requisition_id);
      setDetailItems(data || []);
    } else {
      setDetailItems([]);
    }
  };

  const downloadLPO = async (po: any) => {
    const supplier = suppliers.find(s => s.id === po.supplier_id) || po.suppliers;
    let items: any[] = [];
    if (po.requisition_id) {
      const { data } = await supabase.from("requisition_items").select("*").eq("requisition_id", po.requisition_id);
      items = data || [];
    }
    generateLPO_PDF(po, supplier, items);
  };

  const filtered = orders.filter(o =>
    o.po_number.toLowerCase().includes(search.toLowerCase()) ||
    (o.suppliers?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Purchase Orders</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => exportToPDF(orders, "Purchase Orders", ["po_number","total_amount","delivery_date","status"])}><Download className="w-4 h-4 mr-1" /> PDF</Button>
          {canCreate && (
            <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setRequisitionItems([]); }}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> New LPO</Button></DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Create Local Purchase Order (EL5H/SCM/FRM/002)</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2"><Label>LPO Number</Label><Input value={form.po_number} onChange={(e) => setForm({...form, po_number: e.target.value})} placeholder="Auto-generated" /></div>
                  <div className="space-y-2"><Label>Requisition Reference</Label>
                    <Select value={form.requisition_id} onValueChange={(v) => loadRequisitionItems(v)}>
                      <SelectTrigger><SelectValue placeholder="Link to approved requisition" /></SelectTrigger>
                      <SelectContent>{requisitions.map(r => <SelectItem key={r.id} value={r.id}>{r.requisition_number} — KSH {Number(r.total_amount).toLocaleString()}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {/* Show attached items from requisition */}
                  {requisitionItems.length > 0 && (
                    <div className="border border-border rounded-lg overflow-auto">
                      <Table>
                        <TableHeader><TableRow className="bg-muted/50"><TableHead>#</TableHead><TableHead>Item</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Price</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {requisitionItems.map((li, i) => (
                            <TableRow key={li.id}>
                              <TableCell>{i+1}</TableCell>
                              <TableCell className="font-medium">{li.item_name}</TableCell>
                              <TableCell className="text-right">{li.quantity}</TableCell>
                              <TableCell className="text-right">{Number(li.unit_price).toLocaleString()}</TableCell>
                              <TableCell className="text-right font-medium">{Number(li.total_price).toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
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

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search POs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="border border-border rounded-lg overflow-auto bg-card">
        <Table>
          <TableHeader><TableRow className="bg-muted/50">
            <TableHead>LPO Number</TableHead><TableHead>Supplier</TableHead><TableHead>Requisition</TableHead><TableHead className="text-right">Amount (KSH)</TableHead><TableHead>Delivery</TableHead><TableHead>Status</TableHead><TableHead className="w-24">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No purchase orders</TableCell></TableRow>
            ) : filtered.map((o) => (
              <TableRow key={o.id} className="data-table-row">
                <TableCell className="font-mono font-medium">{o.po_number}</TableCell>
                <TableCell>{o.suppliers?.name || "—"}</TableCell>
                <TableCell className="font-mono text-sm">{o.requisitions?.requisition_number || "—"}</TableCell>
                <TableCell className="text-right">{Number(o.total_amount).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</TableCell>
                <TableCell>{o.delivery_date || "—"}</TableCell>
                <TableCell><span className={`text-xs px-2 py-1 rounded-full capitalize ${o.status === "completed" ? "bg-emerald-500/10 text-emerald-600" : o.status === "draft" ? "bg-muted text-muted-foreground" : "bg-blue-500/10 text-blue-600"}`}>{o.status}</span></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => viewDetail(o)}><Eye className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => downloadLPO(o)}><FileDown className="w-4 h-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detailDialog} onOpenChange={() => setDetailDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>LPO: {detailDialog?.po_number}</DialogTitle></DialogHeader>
          {detailDialog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Supplier:</span> <span className="font-medium">{detailDialog.suppliers?.name || "—"}</span></div>
                <div><span className="text-muted-foreground">Amount:</span> <span className="font-medium">KSH {Number(detailDialog.total_amount).toLocaleString()}</span></div>
                <div><span className="text-muted-foreground">Status:</span> <span className="capitalize font-medium">{detailDialog.status}</span></div>
                <div><span className="text-muted-foreground">Delivery:</span> <span>{detailDialog.delivery_date || "TBD"}</span></div>
              </div>
              {detailItems.length > 0 && (
                <>
                  <Label>Attached Items from Requisition</Label>
                  <Table>
                    <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Item</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Price</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {detailItems.map((li, i) => (
                        <TableRow key={li.id}><TableCell>{i+1}</TableCell><TableCell>{li.item_name}</TableCell><TableCell className="text-right">{li.quantity}</TableCell><TableCell className="text-right">{Number(li.unit_price).toFixed(2)}</TableCell><TableCell className="text-right font-medium">{Number(li.total_price).toFixed(2)}</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => downloadLPO(detailDialog)}><FileDown className="w-4 h-4 mr-1" /> Download LPO</Button>
                <Button variant="outline" size="sm" onClick={() => setForwardDialog(detailDialog)} className="text-blue-600 hover:bg-blue-50"><Forward className="w-4 h-4 mr-1" /> Forward</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Forward Email Dialog */}
      {forwardDialog && (
        <ForwardEmailDialog
          open={!!forwardDialog}
          onClose={() => setForwardDialog(null)}
          record={{
            id: forwardDialog.id,
            number: forwardDialog.po_number,
            type: "purchase_order",
            amount: forwardDialog.total_amount,
            status: forwardDialog.status,
          }}
          onForwardStatus={async (id) => {
            await (supabase as any).from("purchase_orders").update({ status: "sent" }).eq("id", id);
            fetchOrders();
            setDetailDialog(null);
          }}
        />
      )}
    </div>
  );
};

export default PurchaseOrdersPage;
