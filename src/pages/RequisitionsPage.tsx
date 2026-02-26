import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Download, Eye, CheckCircle, XCircle } from "lucide-react";
import { exportToExcel, exportToPDF } from "@/lib/export";

const RequisitionsPage = () => {
  const { user, roles, hasRole } = useAuth();
  const canApprove = hasRole("admin") || hasRole("procurement_manager");
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialog, setDetailDialog] = useState<any | null>(null);
  const [detailItems, setDetailItems] = useState<any[]>([]);
  const [form, setForm] = useState({ department_id: "", priority: "normal", justification: "", notes: "" });
  const [lineItems, setLineItems] = useState<{ item_id: string; item_name: string; quantity: string; unit_price: string }[]>([
    { item_id: "", item_name: "", quantity: "1", unit_price: "0" },
  ]);

  useEffect(() => { fetchRequisitions(); fetchDepartments(); fetchItems(); }, []);

  const fetchRequisitions = async () => {
    const { data } = await supabase.from("requisitions").select("*").order("created_at", { ascending: false });
    setRequisitions(data || []);
  };

  const fetchDepartments = async () => {
    const { data } = await (supabase as any).from("departments").select("*").order("name");
    setDepartments(data || []);
  };

  const fetchItems = async () => {
    const { data } = await supabase.from("items").select("id, name, unit_price").order("name");
    setItems(data || []);
  };

  const generateReqNumber = () => {
    const d = new Date();
    return `RQQ/EL5H/${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}/${Math.random().toString(36).substring(2,6).toUpperCase()}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalAmount = lineItems.reduce((sum, li) => sum + (parseFloat(li.quantity) || 0) * (parseFloat(li.unit_price) || 0), 0);
    const reqNumber = generateReqNumber();

    const { data: req, error } = await supabase.from("requisitions").insert({
      requisition_number: reqNumber,
      department_id: form.department_id || null,
      requested_by: user?.id,
      priority: form.priority,
      justification: form.justification,
      notes: form.notes,
      total_amount: totalAmount,
      status: "pending",
    }).select().single();

    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }

    const reqItems = lineItems.filter(li => li.item_name).map((li) => ({
      requisition_id: req.id,
      item_id: li.item_id || null,
      item_name: li.item_name,
      quantity: parseInt(li.quantity) || 1,
      unit_price: parseFloat(li.unit_price) || 0,
      total_price: (parseInt(li.quantity) || 1) * (parseFloat(li.unit_price) || 0),
    }));

    if (reqItems.length > 0) {
      await supabase.from("requisition_items").insert(reqItems);
    }

    toast({ title: "Requisition submitted", description: `Number: ${reqNumber}` });
    setDialogOpen(false);
    setForm({ department_id: "", priority: "normal", justification: "", notes: "" });
    setLineItems([{ item_id: "", item_name: "", quantity: "1", unit_price: "0" }]);
    fetchRequisitions();
  };

  const viewDetail = async (req: any) => {
    setDetailDialog(req);
    const { data } = await supabase.from("requisition_items").select("*").eq("requisition_id", req.id);
    setDetailItems(data || []);
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("requisitions").update({
      status,
      approved_by: user?.id,
      approved_at: status === "approved" ? new Date().toISOString() : null,
    }).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: `Requisition ${status}` });
    fetchRequisitions();
    setDetailDialog(null);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { item_id: "", item_name: "", quantity: "1", unit_price: "0" }]);
  };

  const updateLineItem = (index: number, field: string, value: string) => {
    const updated = [...lineItems];
    (updated[index] as any)[field] = value;
    if (field === "item_id" && value) {
      const item = items.find(i => i.id === value);
      if (item) { updated[index].item_name = item.name; updated[index].unit_price = String(item.unit_price || 0); }
    }
    setLineItems(updated);
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-emerald-500/10 text-emerald-600";
      case "pending": return "bg-amber-500/10 text-amber-600";
      case "rejected": return "bg-red-500/10 text-red-600";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Requisitions</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => exportToExcel(requisitions, "requisitions")}>
            <Download className="w-4 h-4 mr-1" /> Excel
          </Button>
          <Button size="sm" variant="outline" onClick={() => exportToPDF(requisitions, "Requisitions", ["requisition_number","status","priority","total_amount","created_at"])}>
            <Download className="w-4 h-4 mr-1" /> PDF
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> New Requisition</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Create Stores Requisition (EL5H/SCM/FRM/001)</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Select value={form.department_id} onValueChange={(v) => setForm({ ...form, department_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                      <SelectContent>{departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal — Routine Stock</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent — Emergency</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Justification / Purpose of Request</Label>
                  <Textarea value={form.justification} onChange={(e) => setForm({ ...form, justification: e.target.value })} placeholder="Mandatory for non-stock & emergency items" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Store Items Requisition Details</Label>
                    <Button type="button" size="sm" variant="outline" onClick={addLineItem}><Plus className="w-3 h-3 mr-1" /> Add Line</Button>
                  </div>
                  <div className="border border-border rounded-lg overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow><TableHead>#</TableHead><TableHead>Item</TableHead><TableHead className="w-20">Qty</TableHead><TableHead className="w-28">Unit Cost (KSH)</TableHead><TableHead className="w-28">Total (KSH)</TableHead></TableRow>
                      </TableHeader>
                      <TableBody>
                        {lineItems.map((li, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                            <TableCell>
                              <Select value={li.item_id} onValueChange={(v) => updateLineItem(i, "item_id", v)}>
                                <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                                <SelectContent>{items.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell><Input type="number" min="1" value={li.quantity} onChange={(e) => updateLineItem(i, "quantity", e.target.value)} /></TableCell>
                            <TableCell><Input type="number" step="0.01" value={li.unit_price} onChange={(e) => updateLineItem(i, "unit_price", e.target.value)} /></TableCell>
                            <TableCell className="text-right font-medium">{((parseInt(li.quantity) || 0) * (parseFloat(li.unit_price) || 0)).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">Submit Requisition</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-auto bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Req. Number</TableHead><TableHead>Priority</TableHead>
              <TableHead className="text-right">Amount (KSH)</TableHead><TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead><TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requisitions.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No requisitions found</TableCell></TableRow>
            ) : requisitions.map((req) => (
              <TableRow key={req.id} className="data-table-row">
                <TableCell className="font-mono font-medium text-foreground">{req.requisition_number}</TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                    req.priority === "urgent" ? "bg-red-500/10 text-red-600" :
                    req.priority === "high" ? "bg-amber-500/10 text-amber-600" :
                    "bg-muted text-muted-foreground"
                  }`}>{req.priority}</span>
                </TableCell>
                <TableCell className="text-right font-medium">{Number(req.total_amount).toFixed(2)}</TableCell>
                <TableCell><span className={`text-xs px-2 py-1 rounded-full capitalize ${statusColor(req.status)}`}>{req.status}</span></TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(req.created_at).toLocaleString()}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => viewDetail(req)}><Eye className="w-4 h-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Detail dialog */}
      <Dialog open={!!detailDialog} onOpenChange={() => setDetailDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Requisition: {detailDialog?.requisition_number}</DialogTitle>
          </DialogHeader>
          {detailDialog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Status:</span> <span className={`capitalize font-medium ${statusColor(detailDialog.status)} px-2 py-0.5 rounded`}>{detailDialog.status}</span></div>
                <div><span className="text-muted-foreground">Priority:</span> <span className="capitalize font-medium">{detailDialog.priority}</span></div>
                <div><span className="text-muted-foreground">Total (KSH):</span> <span className="font-medium">{Number(detailDialog.total_amount).toFixed(2)}</span></div>
                <div><span className="text-muted-foreground">Date:</span> <span>{new Date(detailDialog.created_at).toLocaleString()}</span></div>
              </div>
              {detailDialog.justification && (
                <div><Label className="text-muted-foreground">Justification</Label><p className="text-sm mt-1 bg-muted/50 p-2 rounded">{detailDialog.justification}</p></div>
              )}
              <Table>
                <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Item</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Price</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                <TableBody>
                  {detailItems.map((li, i) => (
                    <TableRow key={li.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell>{li.item_name}</TableCell>
                      <TableCell className="text-right">{li.quantity}</TableCell>
                      <TableCell className="text-right">{Number(li.unit_price).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">{Number(li.total_price).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {canApprove && detailDialog.status === "pending" && (
                <div className="flex gap-2 justify-end pt-2 border-t border-border">
                  <Button variant="outline" onClick={() => updateStatus(detailDialog.id, "rejected")} className="text-red-600 hover:bg-red-500/10">
                    <XCircle className="w-4 h-4 mr-1" /> Reject
                  </Button>
                  <Button onClick={() => updateStatus(detailDialog.id, "approved")} className="bg-emerald-600 hover:bg-emerald-700">
                    <CheckCircle className="w-4 h-4 mr-1" /> Approve
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RequisitionsPage;
