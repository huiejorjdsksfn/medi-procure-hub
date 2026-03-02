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
import { Plus, Download, FileDown, Search } from "lucide-react";
import { exportToPDF, generateGRN_PDF } from "@/lib/export";
import { logAudit } from "@/lib/audit";

const GoodsReceivedPage = () => {
  const { user, profile } = useAuth();
  const [grns, setGrns] = useState<any[]>([]);
  const [pos, setPos] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ grn_number: "", po_id: "", inspection_status: "pending", notes: "" });

  useEffect(() => { fetchGrns(); fetchPOs(); fetchSuppliers(); }, []);
  useEffect(() => {
    const ch = supabase.channel("grn-rt").on("postgres_changes", { event: "*", schema: "public", table: "goods_received" }, () => fetchGrns()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const fetchGrns = async () => {
    const { data } = await supabase.from("goods_received").select("*, purchase_orders(po_number, supplier_id, suppliers(name, contact_person, phone))").order("created_at", { ascending: false });
    setGrns(data || []);
  };
  const fetchPOs = async () => { const { data } = await supabase.from("purchase_orders").select("id, po_number, supplier_id"); setPos(data || []); };
  const fetchSuppliers = async () => { const { data } = await supabase.from("suppliers").select("*"); setSuppliers(data || []); };

  const generateGRN = () => {
    const d = new Date();
    return `GRN/EL5H/${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}/${Math.random().toString(36).substring(2,6).toUpperCase()}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const grnNum = form.grn_number || generateGRN();
    const { data, error } = await supabase.from("goods_received").insert({
      grn_number: grnNum, po_id: form.po_id || null,
      received_by: user?.id, inspection_status: form.inspection_status, notes: form.notes,
    }).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    logAudit(user?.id, profile?.full_name, "create", "goods_received", data?.id, { grn_number: grnNum });
    toast({ title: "GRN created" });
    setDialogOpen(false);
    setForm({ grn_number: "", po_id: "", inspection_status: "pending", notes: "" });
  };

  const downloadGRN = (grn: any) => {
    const po = pos.find(p => p.id === grn.po_id) || grn.purchase_orders;
    const supplier = suppliers.find(s => s.id === po?.supplier_id) || grn.purchase_orders?.suppliers;
    generateGRN_PDF(grn, po, supplier);
  };

  const filtered = grns.filter(g =>
    g.grn_number.toLowerCase().includes(search.toLowerCase()) ||
    (g.purchase_orders?.po_number || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Goods Received Notes</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => exportToPDF(grns, "Goods Received Notes", ["grn_number","inspection_status","received_at"])}><Download className="w-4 h-4 mr-1" /> PDF</Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> New GRN</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create GRN (EL5H/SCM/FRM/003)</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2"><Label>GRN Number</Label><Input value={form.grn_number} onChange={(e) => setForm({...form, grn_number: e.target.value})} placeholder="Auto-generated" /></div>
                <div className="space-y-2"><Label>Purchase Order *</Label>
                  <Select value={form.po_id} onValueChange={(v) => setForm({...form, po_id: v})}>
                    <SelectTrigger><SelectValue placeholder="Link to PO" /></SelectTrigger>
                    <SelectContent>{pos.map(p => <SelectItem key={p.id} value={p.id}>{p.po_number}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Inspection Status</Label>
                  <Select value={form.inspection_status} onValueChange={(v) => setForm({...form, inspection_status: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="passed">Passed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Remarks</Label><Textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} /></div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">Create GRN</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search GRNs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="border border-border rounded-lg overflow-auto bg-card">
        <Table>
          <TableHeader><TableRow className="bg-muted/50">
            <TableHead>GRN Number</TableHead><TableHead>PO Number</TableHead><TableHead>Supplier</TableHead><TableHead>Inspection</TableHead><TableHead>Notes</TableHead><TableHead className="w-16">PDF</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No GRNs</TableCell></TableRow>
            ) : filtered.map((g) => (
              <TableRow key={g.id} className="data-table-row">
                <TableCell className="font-mono font-medium">{g.grn_number}</TableCell>
                <TableCell className="font-mono text-sm">{g.purchase_orders?.po_number || "—"}</TableCell>
                <TableCell className="text-sm">{g.purchase_orders?.suppliers?.name || "—"}</TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-1 rounded-full capitalize ${g.inspection_status === "passed" ? "bg-emerald-500/10 text-emerald-600" : g.inspection_status === "failed" ? "bg-red-500/10 text-red-600" : "bg-amber-500/10 text-amber-600"}`}>{g.inspection_status}</span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{g.notes || "—"}</TableCell>
                <TableCell><Button variant="ghost" size="sm" onClick={() => downloadGRN(g)}><FileDown className="w-4 h-4" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default GoodsReceivedPage;
