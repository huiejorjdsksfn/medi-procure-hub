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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Plus, Edit, Download, Search, FileDown } from "lucide-react";
import { exportToPDF, generateLPO_PDF } from "@/lib/export";
import { logAudit } from "@/lib/audit";

const SuppliersPage = () => {
  const { user, profile } = useAuth();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", contact_person: "", email: "", phone: "", address: "", tax_id: "", status: "active" });

  useEffect(() => { fetchSuppliers(); }, []);

  useEffect(() => {
    const ch = supabase.channel("suppliers-rt").on("postgres_changes", { event: "*", schema: "public", table: "suppliers" }, () => fetchSuppliers()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const fetchSuppliers = async () => {
    const { data } = await supabase.from("suppliers").select("*").order("name");
    setSuppliers(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      const { error } = await supabase.from("suppliers").update(form).eq("id", editing.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      logAudit(user?.id, profile?.full_name, "update", "suppliers", editing.id, { name: form.name });
      toast({ title: "Supplier updated" });
    } else {
      const { data, error } = await supabase.from("suppliers").insert(form).select().single();
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      logAudit(user?.id, profile?.full_name, "create", "suppliers", data?.id, { name: form.name });
      toast({ title: "Supplier added" });
    }
    setDialogOpen(false);
    setForm({ name: "", contact_person: "", email: "", phone: "", address: "", tax_id: "", status: "active" });
    setEditing(null);
  };

  const editSupplier = (s: any) => {
    setEditing(s);
    setForm({ name: s.name, contact_person: s.contact_person || "", email: s.email || "", phone: s.phone || "", address: s.address || "", tax_id: s.tax_id || "", status: s.status || "active" });
    setDialogOpen(true);
  };

  const generateBlankLPO = (s: any) => {
    const po = { po_number: `LPO/EL5H/DRAFT/${Math.random().toString(36).substring(2,6).toUpperCase()}`, created_at: new Date().toISOString(), delivery_date: "", status: "draft", total_amount: 0 };
    generateLPO_PDF(po, s, []);
    toast({ title: "LPO template downloaded" });
  };

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.contact_person || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.tax_id || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Suppliers</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => exportToPDF(suppliers, "Suppliers Register", ["name","contact_person","email","phone","tax_id","status"])}><Download className="w-4 h-4 mr-1" /> PDF</Button>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Supplier</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Supplier</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Contact Person</Label><Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                </div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div className="space-y-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                <div className="space-y-2"><Label>Tax ID / KRA PIN</Label><Input value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} /></div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">{editing ? "Update" : "Add"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search suppliers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="border border-border rounded-lg overflow-auto bg-card">
        <Table>
          <TableHeader><TableRow className="bg-muted/50">
            <TableHead>Name</TableHead><TableHead>Contact</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Tax ID</TableHead><TableHead>Rating</TableHead><TableHead>Status</TableHead><TableHead className="w-24">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No suppliers</TableCell></TableRow>
            ) : filtered.map((s) => (
              <TableRow key={s.id} className="data-table-row">
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.contact_person || "—"}</TableCell>
                <TableCell className="text-sm">{s.email || "—"}</TableCell>
                <TableCell>{s.phone || "—"}</TableCell>
                <TableCell className="font-mono text-xs">{s.tax_id || "—"}</TableCell>
                <TableCell>{"⭐".repeat(Math.min(s.rating || 0, 5))}</TableCell>
                <TableCell><span className={`text-xs px-2 py-1 rounded-full ${s.status === "active" ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>{s.status}</span></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => editSupplier(s)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => generateBlankLPO(s)} title="Download LPO"><FileDown className="w-4 h-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} supplier(s)</p>
    </div>
  );
};

export default SuppliersPage;
