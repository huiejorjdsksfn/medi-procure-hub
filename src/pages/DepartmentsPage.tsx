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
import { Plus, Edit, Search, Download } from "lucide-react";
import { exportToPDF } from "@/lib/export";

const DepartmentsPage = () => {
  const [departments, setDepartments] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", code: "", head_name: "" });
  const [search, setSearch] = useState("");

  useEffect(() => { fetchDepartments(); }, []);

  const fetchDepartments = async () => {
    const { data } = await (supabase as any).from("departments").select("*").order("name");
    setDepartments(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      const { error } = await (supabase as any).from("departments").update(form).eq("id", editing.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Department updated" });
    } else {
      const { error } = await (supabase as any).from("departments").insert(form);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Department added" });
    }
    setDialogOpen(false); setForm({ name: "", code: "", head_name: "" }); setEditing(null); fetchDepartments();
  };

  const filtered = departments.filter(d =>
    (d.name || "").toLowerCase().includes(search.toLowerCase()) || (d.code || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Departments</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => exportToPDF(departments, "Departments Register", ["name","code","head_name"])}><Download className="w-4 h-4 mr-1" /> PDF</Button>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditing(null); setForm({ name: "", code: "", head_name: "" }); } }}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Department</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required /></div>
                <div className="space-y-2"><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({...form, code: e.target.value})} placeholder="e.g. ICU" /></div>
                <div className="space-y-2"><Label>Head of Department</Label><Input value={form.head_name} onChange={(e) => setForm({...form, head_name: e.target.value})} /></div>
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
        <Input placeholder="Search departments..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="border border-border rounded-lg overflow-auto bg-card">
        <Table>
          <TableHeader><TableRow className="bg-muted/50"><TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead>Head</TableHead><TableHead className="w-16">Edit</TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No departments</TableCell></TableRow>
            ) : filtered.map((d: any) => (
              <TableRow key={d.id} className="data-table-row">
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell className="font-mono text-sm">{d.code || "—"}</TableCell>
                <TableCell>{d.head_name || "—"}</TableCell>
                <TableCell><Button variant="ghost" size="sm" onClick={() => { setEditing(d); setForm({ name: d.name, code: d.code || "", head_name: d.head_name || "" }); setDialogOpen(true); }}><Edit className="w-4 h-4" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} department(s)</p>
    </div>
  );
};

export default DepartmentsPage;
