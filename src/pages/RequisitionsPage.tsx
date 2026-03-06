<<<<<<< HEAD
import { useState } from "react";
import { Search, Plus, Download, Filter, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function RequisitionsPage() {
  const [search, setSearch] = useState("");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Purchase Requisitions</h1>
          <p className="text-sm text-slate-500 mt-0.5">Raise and manage internal procurement requests</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" />Export</Button>
          <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
            <Plus className="w-4 h-4 mr-2" />New Record
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-100 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" size="sm"><Filter className="w-4 h-4 mr-2" />Filter</Button>
          <Button variant="outline" size="sm"><RefreshCw className="w-4 h-4" /></Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">PR No.</th> <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Description</th> <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Requested By</th> <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Department</th> <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Amount</th> <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Date</th> <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                No records found. Click "New Record" to add one.
              </td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
=======
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Plus, Download, Eye, CheckCircle, XCircle, FileDown, Search, Forward, ClipboardEdit, Trash2 } from "lucide-react";
import { exportToPDF, generateRequisitionPDF } from "@/lib/export";
import { logAudit } from "@/lib/audit";

const RequisitionsPage = () => {
  const { user, profile, hasRole } = useAuth();
  const canApprove = hasRole("admin") || hasRole("procurement_manager");
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialog, setDetailDialog] = useState<any | null>(null);
  const [detailItems, setDetailItems] = useState<any[]>([]);
  const [form, setForm] = useState({ department_id: "", priority: "normal", justification: "", notes: "" });
  const [lineItems, setLineItems] = useState<{ item_id: string; item_name: string; quantity: string; unit_price: string }[]>([
    { item_id: "", item_name: "", quantity: "1", unit_price: "0" },
  ]);
  const [mainTab, setMainTab] = useState("list");

  // Worksheet state
  const [worksheetRows, setWorksheetRows] = useState<{ item_name: string; description: string; quantity: string; unit: string; unit_price: string; notes: string }[]>(
    Array.from({ length: 15 }, () => ({ item_name: "", description: "", quantity: "", unit: "pcs", unit_price: "", notes: "" }))
  );
  const [worksheetDept, setWorksheetDept] = useState("");
  const [worksheetPriority, setWorksheetPriority] = useState("normal");
  const [worksheetJustification, setWorksheetJustification] = useState("");

  useEffect(() => { fetchRequisitions(); fetchDepartments(); fetchItems(); }, []);

  useEffect(() => {
    const ch = supabase.channel("req-rt").on("postgres_changes", { event: "*", schema: "public", table: "requisitions" }, () => fetchRequisitions()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const fetchRequisitions = async () => {
    const { data } = await supabase.from("requisitions").select("*").order("created_at", { ascending: false });
    setRequisitions(data || []);
  };
  const fetchDepartments = async () => { const { data } = await (supabase as any).from("departments").select("*").order("name"); setDepartments(data || []); };
  const fetchItems = async () => { const { data } = await supabase.from("items").select("id, name, unit_price").order("name"); setItems(data || []); };

  const generateReqNumber = () => {
    const d = new Date();
    return `RQQ/EL5H/${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}/${Math.random().toString(36).substring(2,6).toUpperCase()}`;
  };

  const sendNotification = async (requisitionId: string, action: string) => {
    try {
      await supabase.functions.invoke("notify-requisition", {
        body: { requisition_id: requisitionId, action, actor_name: profile?.full_name || "System" },
      });
    } catch (e) { console.error("Notification error:", e); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalAmount = lineItems.reduce((sum, li) => sum + (parseFloat(li.quantity) || 0) * (parseFloat(li.unit_price) || 0), 0);
    const reqNumber = generateReqNumber();
    const { data: req, error } = await supabase.from("requisitions").insert({
      requisition_number: reqNumber, department_id: form.department_id || null,
      requested_by: user?.id, priority: form.priority, justification: form.justification,
      notes: form.notes, total_amount: totalAmount, status: "pending",
    }).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    const reqItems = lineItems.filter(li => li.item_name).map((li) => ({
      requisition_id: req.id, item_id: li.item_id || null, item_name: li.item_name,
      quantity: parseInt(li.quantity) || 1, unit_price: parseFloat(li.unit_price) || 0,
      total_price: (parseInt(li.quantity) || 1) * (parseFloat(li.unit_price) || 0),
    }));
    if (reqItems.length > 0) await supabase.from("requisition_items").insert(reqItems);
    logAudit(user?.id, profile?.full_name, "create", "requisitions", req.id, { number: reqNumber, amount: totalAmount });
    sendNotification(req.id, "submitted");
    toast({ title: "Requisition submitted", description: reqNumber });
    setDialogOpen(false);
    setForm({ department_id: "", priority: "normal", justification: "", notes: "" });
    setLineItems([{ item_id: "", item_name: "", quantity: "1", unit_price: "0" }]);
  };

  // Submit worksheet as requisition
  const submitWorksheet = async () => {
    const validRows = worksheetRows.filter(r => r.item_name.trim());
    if (validRows.length === 0) { toast({ title: "No items entered", variant: "destructive" }); return; }
    const totalAmount = validRows.reduce((sum, r) => sum + (parseFloat(r.quantity) || 0) * (parseFloat(r.unit_price) || 0), 0);
    const reqNumber = generateReqNumber();
    const { data: req, error } = await supabase.from("requisitions").insert({
      requisition_number: reqNumber, department_id: worksheetDept || null,
      requested_by: user?.id, priority: worksheetPriority, justification: worksheetJustification,
      notes: "Submitted via manual worksheet", total_amount: totalAmount, status: "pending",
    }).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    const reqItems = validRows.map(r => ({
      requisition_id: req.id, item_name: r.item_name,
      quantity: parseInt(r.quantity) || 1, unit_price: parseFloat(r.unit_price) || 0,
      total_price: (parseInt(r.quantity) || 1) * (parseFloat(r.unit_price) || 0),
      notes: r.notes || null,
    }));
    await supabase.from("requisition_items").insert(reqItems);
    logAudit(user?.id, profile?.full_name, "create_worksheet", "requisitions", req.id, { number: reqNumber });
    sendNotification(req.id, "submitted");
    toast({ title: "Worksheet submitted", description: reqNumber });
    setWorksheetRows(Array.from({ length: 15 }, () => ({ item_name: "", description: "", quantity: "", unit: "pcs", unit_price: "", notes: "" })));
    setWorksheetJustification("");
    setMainTab("list");
  };

  const updateWorksheetRow = (i: number, field: string, value: string) => {
    const rows = [...worksheetRows];
    (rows[i] as any)[field] = value;
    setWorksheetRows(rows);
  };
  const addWorksheetRows = () => {
    setWorksheetRows([...worksheetRows, ...Array.from({ length: 5 }, () => ({ item_name: "", description: "", quantity: "", unit: "pcs", unit_price: "", notes: "" }))]);
  };

  const viewDetail = async (req: any) => {
    setDetailDialog(req);
    const { data } = await supabase.from("requisition_items").select("*").eq("requisition_id", req.id);
    setDetailItems(data || []);
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("requisitions").update({
      status, approved_by: user?.id,
      approved_at: status === "approved" ? new Date().toISOString() : null,
    }).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    logAudit(user?.id, profile?.full_name, status === "approved" ? "approve" : status === "forwarded" ? "forward" : "reject", "requisitions", id, { status });
    sendNotification(id, status);
    toast({ title: `Requisition ${status}` }); setDetailDialog(null);
  };

  const addLineItem = () => setLineItems([...lineItems, { item_id: "", item_name: "", quantity: "1", unit_price: "0" }]);
  const updateLineItem = (index: number, field: string, value: string) => {
    const updated = [...lineItems];
    (updated[index] as any)[field] = value;
    if (field === "item_id" && value) {
      const item = items.find(i => i.id === value);
      if (item) { updated[index].item_name = item.name; updated[index].unit_price = String(item.unit_price || 0); }
    }
    setLineItems(updated);
  };

  const statusColor = (s: string) => s === "approved" ? "bg-emerald-500/10 text-emerald-600" : s === "rejected" ? "bg-red-500/10 text-red-600" : s === "forwarded" ? "bg-blue-500/10 text-blue-600" : "bg-amber-500/10 text-amber-600";

  const filtered = requisitions.filter(r =>
    r.requisition_number.toLowerCase().includes(search.toLowerCase()) ||
    (r.status || "").toLowerCase().includes(search.toLowerCase())
  );

  const worksheetTotal = worksheetRows.reduce((s, r) => s + (parseFloat(r.quantity) || 0) * (parseFloat(r.unit_price) || 0), 0);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Requisitions</h1>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => exportToPDF(requisitions, "Requisitions Register", ["requisition_number","status","priority","total_amount"])}><Download className="w-4 h-4 mr-1" /> PDF</Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> New Requisition</Button></DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Create Stores Requisition (EL5H/SCM/FRM/001)</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Department *</Label>
                    <Select value={form.department_id} onValueChange={(v) => setForm({ ...form, department_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                      <SelectContent>{departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Priority</Label>
                    <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem><SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent — Emergency</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2"><Label>Justification</Label><Textarea value={form.justification} onChange={(e) => setForm({ ...form, justification: e.target.value })} /></div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between"><Label>Items</Label><Button type="button" size="sm" variant="outline" onClick={addLineItem}><Plus className="w-3 h-3 mr-1" /> Add Line</Button></div>
                  <div className="border border-border rounded-lg overflow-auto">
                    <Table>
                      <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Item</TableHead><TableHead className="w-20">Qty</TableHead><TableHead className="w-28">Unit Cost</TableHead><TableHead className="w-28">Total</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {lineItems.map((li, i) => (
                          <TableRow key={i}>
                            <TableCell>{i + 1}</TableCell>
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

      {/* Main tabs: List vs Worksheet */}
      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList>
          <TabsTrigger value="list" className="gap-1.5"><Search className="w-3.5 h-3.5" /> Requisitions List</TabsTrigger>
          <TabsTrigger value="worksheet" className="gap-1.5"><ClipboardEdit className="w-3.5 h-3.5" /> Manual Worksheet</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search requisitions..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>

          <div className="border border-border rounded-lg overflow-auto bg-card">
            <Table>
              <TableHeader><TableRow className="bg-muted/50">
                <TableHead>Req. Number</TableHead><TableHead>Priority</TableHead>
                <TableHead className="text-right">Amount (KSH)</TableHead><TableHead>Status</TableHead><TableHead className="w-28">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No requisitions</TableCell></TableRow>
                ) : filtered.map((req) => (
                  <TableRow key={req.id} className="data-table-row">
                    <TableCell className="font-mono font-medium">{req.requisition_number}</TableCell>
                    <TableCell><span className={`text-xs px-2 py-1 rounded-full capitalize ${req.priority === "urgent" ? "bg-red-500/10 text-red-600" : req.priority === "high" ? "bg-amber-500/10 text-amber-600" : "bg-muted text-muted-foreground"}`}>{req.priority}</span></TableCell>
                    <TableCell className="text-right font-medium">{Number(req.total_amount).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell><span className={`text-xs px-2 py-1 rounded-full capitalize ${statusColor(req.status)}`}>{req.status}</span></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => viewDetail(req)}><Eye className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={async () => {
                          const { data } = await supabase.from("requisition_items").select("*").eq("requisition_id", req.id);
                          generateRequisitionPDF(req, data || [], departments);
                        }}><FileDown className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* MANUAL WORKSHEET TAB */}
        <TabsContent value="worksheet" className="space-y-4">
          <div className="border-2 border-border rounded-lg bg-card p-4">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardEdit className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Manual Requisition Worksheet</h2>
              <span className="text-xs text-muted-foreground ml-auto">EL5H/SCM/FRM/001</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div className="space-y-1">
                <Label className="text-xs">Department</Label>
                <Select value={worksheetDept} onValueChange={setWorksheetDept}>
                  <SelectTrigger className="h-8"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Priority</Label>
                <Select value={worksheetPriority} onValueChange={setWorksheetPriority}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem><SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Justification</Label>
                <Input value={worksheetJustification} onChange={e => setWorksheetJustification(e.target.value)} className="h-8 text-sm" placeholder="Reason for request" />
              </div>
            </div>

            {/* Worksheet grid */}
            <div className="border border-border rounded overflow-auto max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-8 text-xs">#</TableHead>
                    <TableHead className="text-xs min-w-[200px]">Item Name *</TableHead>
                    <TableHead className="text-xs min-w-[150px]">Description</TableHead>
                    <TableHead className="text-xs w-20">Qty</TableHead>
                    <TableHead className="text-xs w-20">Unit</TableHead>
                    <TableHead className="text-xs w-28">Unit Price</TableHead>
                    <TableHead className="text-xs w-28">Total</TableHead>
                    <TableHead className="text-xs min-w-[120px]">Notes</TableHead>
                    <TableHead className="text-xs w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {worksheetRows.map((row, i) => {
                    const total = (parseFloat(row.quantity) || 0) * (parseFloat(row.unit_price) || 0);
                    return (
                      <TableRow key={i} className={row.item_name ? "bg-primary/5" : ""}>
                        <TableCell className="text-xs text-muted-foreground py-1">{i + 1}</TableCell>
                        <TableCell className="py-1"><Input value={row.item_name} onChange={e => updateWorksheetRow(i, "item_name", e.target.value)} className="h-7 text-xs border-dashed" placeholder="Type item name..." /></TableCell>
                        <TableCell className="py-1"><Input value={row.description} onChange={e => updateWorksheetRow(i, "description", e.target.value)} className="h-7 text-xs border-dashed" placeholder="Optional" /></TableCell>
                        <TableCell className="py-1"><Input type="number" min="1" value={row.quantity} onChange={e => updateWorksheetRow(i, "quantity", e.target.value)} className="h-7 text-xs border-dashed" /></TableCell>
                        <TableCell className="py-1">
                          <Select value={row.unit} onValueChange={v => updateWorksheetRow(i, "unit", v)}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {["pcs", "box", "pack", "kg", "litre", "roll", "set", "pair", "bottle", "carton"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="py-1"><Input type="number" step="0.01" value={row.unit_price} onChange={e => updateWorksheetRow(i, "unit_price", e.target.value)} className="h-7 text-xs border-dashed" /></TableCell>
                        <TableCell className="text-right text-xs font-medium py-1">{total > 0 ? total.toFixed(2) : ""}</TableCell>
                        <TableCell className="py-1"><Input value={row.notes} onChange={e => updateWorksheetRow(i, "notes", e.target.value)} className="h-7 text-xs border-dashed" placeholder="Notes" /></TableCell>
                        <TableCell className="py-1">
                          {row.item_name && (
                            <button onClick={() => { const rows = [...worksheetRows]; rows[i] = { item_name: "", description: "", quantity: "", unit: "pcs", unit_price: "", notes: "" }; setWorksheetRows(rows); }} className="text-muted-foreground hover:text-destructive">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between mt-3">
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={addWorksheetRows}><Plus className="w-3 h-3 mr-1" /> Add 5 Rows</Button>
                <span className="text-xs text-muted-foreground self-center">
                  {worksheetRows.filter(r => r.item_name.trim()).length} items entered
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-bold">Total: KSH {worksheetTotal.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span>
                <Button onClick={submitWorksheet} disabled={worksheetRows.filter(r => r.item_name.trim()).length === 0}>
                  <CheckCircle className="w-4 h-4 mr-1" /> Submit Worksheet
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Detail dialog */}
      <Dialog open={!!detailDialog} onOpenChange={() => setDetailDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Requisition: {detailDialog?.requisition_number}</DialogTitle></DialogHeader>
          {detailDialog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Status:</span> <span className={`capitalize font-medium ${statusColor(detailDialog.status)} px-2 py-0.5 rounded`}>{detailDialog.status}</span></div>
                <div><span className="text-muted-foreground">Priority:</span> <span className="capitalize font-medium">{detailDialog.priority}</span></div>
                <div><span className="text-muted-foreground">Total (KSH):</span> <span className="font-medium">{Number(detailDialog.total_amount).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span></div>
              </div>
              {detailDialog.justification && <div><Label className="text-muted-foreground">Justification</Label><p className="text-sm mt-1 bg-muted/50 p-2 rounded">{detailDialog.justification}</p></div>}
              <Table>
                <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Item</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Price</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                <TableBody>
                  {detailItems.map((li, i) => (
                    <TableRow key={li.id}><TableCell>{i + 1}</TableCell><TableCell>{li.item_name}</TableCell><TableCell className="text-right">{li.quantity}</TableCell><TableCell className="text-right">{Number(li.unit_price).toFixed(2)}</TableCell><TableCell className="text-right font-medium">{Number(li.total_price).toFixed(2)}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex gap-2 justify-end pt-2 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => generateRequisitionPDF(detailDialog, detailItems, departments)}><FileDown className="w-4 h-4 mr-1" /> PDF</Button>
                {canApprove && detailDialog.status === "pending" && (
                  <>
                    <Button variant="outline" onClick={() => updateStatus(detailDialog.id, "forwarded")} className="text-blue-600 hover:bg-blue-500/10"><Forward className="w-4 h-4 mr-1" /> Forward</Button>
                    <Button variant="outline" onClick={() => updateStatus(detailDialog.id, "rejected")} className="text-destructive hover:bg-destructive/10"><XCircle className="w-4 h-4 mr-1" /> Reject</Button>
                    <Button onClick={() => updateStatus(detailDialog.id, "approved")} className="bg-emerald-600 hover:bg-emerald-700"><CheckCircle className="w-4 h-4 mr-1" /> Approve</Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RequisitionsPage;
>>>>>>> origin/main
