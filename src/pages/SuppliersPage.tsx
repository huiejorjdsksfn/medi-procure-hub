import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { Plus, Edit, Download } from "lucide-react";
import { exportToExcel, exportToPDF } from "@/lib/export";

const SuppliersPage = () => {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", contact_person: "", email: "", phone: "", address: "", tax_id: "", status: "active" });

  useEffect(() => { fetchSuppliers(); }, []);

  const fetchSuppliers = async () => {
    const { data } = await supabase.from("suppliers").select("*").order("name");
    setSuppliers(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      const { error } = await supabase.from("suppliers").update(form).eq("id", editing.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Supplier updated" });
    } else {
      const { error } = await supabase.from("suppliers").insert(form);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Supplier added" });
    }
    setDialogOpen(false);
    setForm({ name: "", contact_person: "", email: "", phone: "", address: "", tax_id: "", status: "active" });
    setEditing(null);
    fetchSuppliers();
  };

  const editSupplier = (s: any) => {
    setEditing(s);
    setForm({ name: s.name, contact_person: s.contact_person || "", email: s.email || "", phone: s.phone || "", address: s.address || "", tax_id: s.tax_id || "", status: s.status || "active" });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Suppliers</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => exportToExcel(suppliers, "suppliers")}><Download className="w-4 h-4 mr-1" /> Excel</Button>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditing(null); } }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Supplier</Button>
            </DialogTrigger>
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
                <div className="space-y-2"><Label>Tax ID</Label><Input value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} /></div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">{editing ? "Update" : "Add"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="border border-border rounded-lg overflow-auto bg-card">
        <Table>
          <TableHeader><TableRow className="bg-muted/50">
            <TableHead>Name</TableHead><TableHead>Contact</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Status</TableHead><TableHead className="w-16">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {suppliers.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No suppliers yet</TableCell></TableRow>
            ) : suppliers.map((s) => (
              <TableRow key={s.id} className="data-table-row">
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.contact_person || "—"}</TableCell>
                <TableCell>{s.email || "—"}</TableCell>
                <TableCell>{s.phone || "—"}</TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-1 rounded-full ${s.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{s.status}</span>
                </TableCell>
                <TableCell><Button variant="ghost" size="sm" onClick={() => editSupplier(s)}><Edit className="w-4 h-4" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default SuppliersPage;
