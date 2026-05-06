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
import { Plus, Download } from "lucide-react";
import { exportToExcel } from "@/lib/export";

const GoodsReceivedPage = () => {
  const { user } = useAuth();
  const [grns, setGrns] = useState<any[]>([]);
  const [pos, setPos] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ grn_number: "", po_id: "", inspection_status: "pending", notes: "" });

  useEffect(() => { fetchGrns(); fetchPOs(); }, []);

  const fetchGrns = async () => {
    const { data } = await supabase.from("goods_received").select("*, purchase_orders(po_number)").order("created_at", { ascending: false });
    setGrns(data || []);
  };
  const fetchPOs = async () => { const { data } = await supabase.from("purchase_orders").select("id, po_number"); setPos(data || []); };

  const generateGRN = () => `GRN-${Date.now().toString(36).toUpperCase()}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("goods_received").insert({
      grn_number: form.grn_number || generateGRN(),
      po_id: form.po_id || null,
      received_by: user?.id,
      inspection_status: form.inspection_status,
      notes: form.notes,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "GRN created" });
    setDialogOpen(false);
    setForm({ grn_number: "", po_id: "", inspection_status: "pending", notes: "" });
    fetchGrns();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Goods Received</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => exportToExcel(grns, "goods-received")}><Download className="w-4 h-4 mr-1" /> Excel</Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> New GRN</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Goods Received Note</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2"><Label>GRN Number</Label><Input value={form.grn_number} onChange={(e) => setForm({...form, grn_number: e.target.value})} placeholder="Auto-generated" /></div>
                <div className="space-y-2">
                  <Label>Purchase Order</Label>
                  <Select value={form.po_id} onValueChange={(v) => setForm({...form, po_id: v})}>
                    <SelectTrigger><SelectValue placeholder="Link to PO" /></SelectTrigger>
                    <SelectContent>{pos.map(p => <SelectItem key={p.id} value={p.id}>{p.po_number}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Inspection Status</Label>
                  <Select value={form.inspection_status} onValueChange={(v) => setForm({...form, inspection_status: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="passed">Passed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} /></div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">Create GRN</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="border border-border rounded-lg overflow-auto bg-card">
        <Table>
          <TableHeader><TableRow className="bg-muted/50">
            <TableHead>GRN Number</TableHead><TableHead>PO Number</TableHead><TableHead>Inspection</TableHead><TableHead>Received</TableHead><TableHead>Notes</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {grns.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No goods received notes</TableCell></TableRow>
            ) : grns.map((g) => (
              <TableRow key={g.id} className="data-table-row">
                <TableCell className="font-mono font-medium">{g.grn_number}</TableCell>
                <TableCell className="font-mono text-sm">{g.purchase_orders?.po_number || "—"}</TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-1 rounded-full capitalize ${g.inspection_status === "passed" ? "bg-success/10 text-success" : g.inspection_status === "failed" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}`}>{g.inspection_status}</span>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(g.received_at).toLocaleString()}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{g.notes || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default GoodsReceivedPage;
