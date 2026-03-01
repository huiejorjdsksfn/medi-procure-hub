import { useEffect, useState } from "react";
import { supabase, db } from "@/integrations/supabase/client";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, Download, Edit, FileText, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { exportToExcel, exportToPDF } from "@/lib/export";
import { logAudit } from "@/lib/audit";

const ContractsPage = () => {
  const { user, profile } = useAuth();
  const [contracts, setContracts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [milestoneDialog, setMilestoneDialog] = useState<any>(null);
  const [form, setForm] = useState({
    contract_number: "", supplier_id: "", title: "", description: "",
    start_date: "", end_date: "", total_value: "", status: "active",
    payment_terms: "", delivery_terms: "", performance_score: "0",
  });
  const [newMilestone, setNewMilestone] = useState({ title: "", due_date: "", status: "pending" });

  useEffect(() => { fetchContracts(); fetchSuppliers(); }, []);

  const fetchContracts = async () => {
    const { data } = await (db as any).from("contracts").select("*, suppliers(name)").order("created_at", { ascending: false });
    setContracts(data || []);
  };
  const fetchSuppliers = async () => {
    const { data } = await supabase.from("suppliers").select("id, name").order("name");
    setSuppliers(data || []);
  };

  const generateContractNo = () => {
    const d = new Date();
    return `CNT/EL5H/${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}/${Math.random().toString(36).substring(2,6).toUpperCase()}`;
  };

  const resetForm = () => {
    setForm({ contract_number: "", supplier_id: "", title: "", description: "", start_date: "", end_date: "", total_value: "", status: "active", payment_terms: "", delivery_terms: "", performance_score: "0" });
    setEditing(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      contract_number: form.contract_number || generateContractNo(),
      supplier_id: form.supplier_id || null,
      title: form.title,
      description: form.description || null,
      start_date: form.start_date,
      end_date: form.end_date,
      total_value: parseFloat(form.total_value) || 0,
      status: form.status,
      payment_terms: form.payment_terms || null,
      delivery_terms: form.delivery_terms || null,
      performance_score: parseInt(form.performance_score) || 0,
      created_by: user?.id,
    };

    if (editing) {
      const { error } = await (db as any).from("contracts").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      logAudit(user?.id, profile?.full_name, "update", "contracts", editing.id, { title: form.title });
      toast({ title: "Contract updated" });
    } else {
      const { data, error } = await (db as any).from("contracts").insert(payload).select().single();
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      logAudit(user?.id, profile?.full_name, "create", "contracts", data?.id, { title: form.title, supplier_id: form.supplier_id });
      toast({ title: "Contract created" });
    }
    setDialogOpen(false);
    resetForm();
    fetchContracts();
  };

  const editContract = (c: any) => {
    setEditing(c);
    setForm({
      contract_number: c.contract_number, supplier_id: c.supplier_id || "", title: c.title,
      description: c.description || "", start_date: c.start_date, end_date: c.end_date,
      total_value: String(c.total_value || ""), status: c.status || "active",
      payment_terms: c.payment_terms || "", delivery_terms: c.delivery_terms || "",
      performance_score: String(c.performance_score || 0),
    });
    setDialogOpen(true);
  };

  const addMilestone = async () => {
    if (!milestoneDialog || !newMilestone.title) return;
    const existing = milestoneDialog.milestones || [];
    const updated = [...existing, { ...newMilestone, id: Date.now() }];
    const { error } = await (db as any).from("contracts").update({ milestones: updated }).eq("id", milestoneDialog.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Milestone added" });
    setNewMilestone({ title: "", due_date: "", status: "pending" });
    setMilestoneDialog(null);
    fetchContracts();
  };

  const updateMilestoneStatus = async (contract: any, milestoneId: number, status: string) => {
    const updated = (contract.milestones || []).map((m: any) => m.id === milestoneId ? { ...m, status } : m);
    await (db as any).from("contracts").update({ milestones: updated }).eq("id", contract.id);
    fetchContracts();
  };

  const daysUntilExpiry = (endDate: string) => {
    const diff = new Date(endDate).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-emerald-500/10 text-emerald-600";
      case "expired": return "bg-red-500/10 text-red-600";
      case "pending": return "bg-amber-500/10 text-amber-600";
      case "terminated": return "bg-red-500/10 text-red-600";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const filtered = contracts.filter(c => {
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.contract_number.toLowerCase().includes(search.toLowerCase()) ||
      (c.suppliers?.name || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // KPI stats
  const activeCount = contracts.filter(c => c.status === "active").length;
  const expiringCount = contracts.filter(c => c.status === "active" && daysUntilExpiry(c.end_date) <= 30 && daysUntilExpiry(c.end_date) > 0).length;
  const expiredCount = contracts.filter(c => c.status === "expired" || daysUntilExpiry(c.end_date) < 0).length;
  const totalValue = contracts.reduce((sum, c) => sum + Number(c.total_value || 0), 0);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FileText className="w-6 h-6" /> Contract Management
        </h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => exportToExcel(contracts.map(c => ({
            contract_no: c.contract_number, title: c.title, supplier: c.suppliers?.name,
            start: c.start_date, end: c.end_date, value: c.total_value, status: c.status, score: c.performance_score,
          })), "contracts")}><Download className="w-4 h-4 mr-1" /> Excel</Button>
          <Button size="sm" variant="outline" onClick={() => exportToPDF(contracts, "Contracts Register", ["contract_number","title","start_date","end_date","total_value","status"])}><Download className="w-4 h-4 mr-1" /> PDF</Button>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> New Contract</Button></DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editing ? "Edit" : "New"} Contract</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Contract Number</Label><Input value={form.contract_number} onChange={e => setForm({...form, contract_number: e.target.value})} placeholder="Auto-generated" /></div>
                <div className="space-y-2"><Label>Supplier *</Label>
                  <Select value={form.supplier_id} onValueChange={v => setForm({...form, supplier_id: v})}>
                    <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                    <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2"><Label>Title *</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required /></div>
                <div className="space-y-2"><Label>Start Date *</Label><Input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} required /></div>
                <div className="space-y-2"><Label>End Date *</Label><Input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} required /></div>
                <div className="space-y-2"><Label>Total Value (KSH)</Label><Input type="number" step="0.01" value={form.total_value} onChange={e => setForm({...form, total_value: e.target.value})} /></div>
                <div className="space-y-2"><Label>Performance Score (0-100)</Label><Input type="number" min="0" max="100" value={form.performance_score} onChange={e => setForm({...form, performance_score: e.target.value})} /></div>
                <div className="space-y-2"><Label>Status</Label>
                  <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="terminated">Terminated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Payment Terms</Label><Input value={form.payment_terms} onChange={e => setForm({...form, payment_terms: e.target.value})} placeholder="Net 30 days" /></div>
                <div className="space-y-2 md:col-span-2"><Label>Delivery Terms</Label><Input value={form.delivery_terms} onChange={e => setForm({...form, delivery_terms: e.target.value})} placeholder="FOB Embu" /></div>
                <div className="space-y-2 md:col-span-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
                <div className="md:col-span-2 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancel</Button>
                  <Button type="submit">{editing ? "Update" : "Create"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10"><CheckCircle className="w-5 h-5 text-emerald-600" /></div>
          <div><p className="text-2xl font-bold">{activeCount}</p><p className="text-xs text-muted-foreground">Active Contracts</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10"><Clock className="w-5 h-5 text-amber-600" /></div>
          <div><p className="text-2xl font-bold">{expiringCount}</p><p className="text-xs text-muted-foreground">Expiring (30d)</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-500/10"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
          <div><p className="text-2xl font-bold">{expiredCount}</p><p className="text-xs text-muted-foreground">Expired</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><FileText className="w-5 h-5 text-primary" /></div>
          <div><p className="text-2xl font-bold">KSH {(totalValue/1000000).toFixed(1)}M</p><p className="text-xs text-muted-foreground">Total Value</p></div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search contracts..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="terminated">Terminated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-auto bg-card">
        <Table>
          <TableHeader><TableRow className="bg-muted/50">
            <TableHead>Contract No</TableHead><TableHead>Title</TableHead><TableHead>Supplier</TableHead>
            <TableHead>Period</TableHead><TableHead className="text-right">Value (KSH)</TableHead>
            <TableHead>Score</TableHead><TableHead>Status</TableHead><TableHead>Expiry</TableHead><TableHead className="w-24">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No contracts found</TableCell></TableRow>
            ) : filtered.map(c => {
              const days = daysUntilExpiry(c.end_date);
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-sm">{c.contract_number}</TableCell>
                  <TableCell className="font-medium">{c.title}</TableCell>
                  <TableCell className="text-sm">{c.suppliers?.name || "—"}</TableCell>
                  <TableCell className="text-xs">{c.start_date} → {c.end_date}</TableCell>
                  <TableCell className="text-right">{Number(c.total_value).toLocaleString("en-KE")}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${(c.performance_score || 0) >= 70 ? "bg-emerald-500" : (c.performance_score || 0) >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                          style={{ width: `${c.performance_score || 0}%` }} />
                      </div>
                      <span className="text-xs">{c.performance_score || 0}%</span>
                    </div>
                  </TableCell>
                  <TableCell><span className={`text-xs px-2 py-1 rounded-full capitalize ${statusColor(c.status)}`}>{c.status}</span></TableCell>
                  <TableCell>
                    <span className={`text-xs font-medium ${days < 0 ? "text-red-500" : days <= 30 ? "text-amber-500" : "text-emerald-600"}`}>
                      {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => editContract(c)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => setMilestoneDialog(c)} title="Milestones"><FileText className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} contract(s)</p>

      {/* Milestones Dialog */}
      <Dialog open={!!milestoneDialog} onOpenChange={() => setMilestoneDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Milestones — {milestoneDialog?.title}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {(milestoneDialog?.milestones || []).map((m: any) => (
              <div key={m.id} className="flex items-center justify-between p-2 border border-border rounded">
                <div>
                  <p className="text-sm font-medium">{m.title}</p>
                  <p className="text-xs text-muted-foreground">{m.due_date || "No date"}</p>
                </div>
                <Select value={m.status} onValueChange={v => updateMilestoneStatus(milestoneDialog, m.id, v)}>
                  <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
            <div className="border-t pt-3 space-y-2">
              <Label>Add Milestone</Label>
              <Input placeholder="Milestone title" value={newMilestone.title} onChange={e => setNewMilestone({...newMilestone, title: e.target.value})} />
              <Input type="date" value={newMilestone.due_date} onChange={e => setNewMilestone({...newMilestone, due_date: e.target.value})} />
              <Button size="sm" onClick={addMilestone} disabled={!newMilestone.title}>Add</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContractsPage;
