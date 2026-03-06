import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, Printer, Eye, BookOpen, CheckCircle, XCircle, Scale } from "lucide-react";
import { logAudit } from "@/lib/audit";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const DEBIT_CREDIT_ACCOUNTS = [
  "Cash and Bank", "Accounts Receivable", "Accounts Payable", "Medical Supplies Inventory",
  "Pharmaceutical Inventory", "Equipment", "Prepaid Expenses", "Fixed Assets",
  "Revenue - Patient Fees", "Revenue - NHIF", "Revenue - County Grant",
  "Expense - Salaries", "Expense - Medical Supplies", "Expense - Utilities",
  "Expense - Repairs", "Expense - Transport", "Capital Account", "Retained Earnings",
];

const generateJVNo = () => {
  const d = new Date();
  return `JV/EL5H/${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}/${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
};

const printJournalVoucher = (v: any) => {
  const doc = new jsPDF();
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, 210, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("JOURNAL VOUCHER", 105, 12, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("EMBU LEVEL 5 HOSPITAL — GENERAL LEDGER ENTRY", 105, 20, { align: "center" });
  doc.text("EL5H/FIN/JV/001", 105, 27, { align: "center" });
  doc.setTextColor(0);
  let y = 38;
  doc.setFontSize(9);
  doc.text(`Journal No: ${v.journal_number}`, 20, y);
  doc.text(`Date: ${new Date(v.journal_date || v.created_at).toLocaleDateString("en-KE")}`, 120, y); y += 7;
  doc.text(`Reference: ${v.reference || "—"}`, 20, y);
  doc.text(`Period: ${v.period || "—"}`, 120, y); y += 7;
  doc.text(`Narration: ${v.narration || "—"}`, 20, y); y += 12;

  if (v.entries && v.entries.length > 0) {
    autoTable(doc, {
      head: [["Account", "Dr/Cr", "Debit (KSH)", "Credit (KSH)"]],
      body: [
        ...v.entries.map((e: any) => [e.account, e.type, e.type === "Dr" ? Number(e.amount).toLocaleString("en-KE", { minimumFractionDigits: 2 }) : "", e.type === "Cr" ? Number(e.amount).toLocaleString("en-KE", { minimumFractionDigits: 2 }) : ""]),
        ["TOTALS", "", Number(v.total_debit || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 }), Number(v.total_credit || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })],
      ],
      startY: y,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 58, 95] },
      footStyles: { fillColor: [240, 247, 255], fontStyle: "bold" },
    });
    y = (doc as any).lastAutoTable?.finalY + 15 || y + 50;
  }

  doc.text("Prepared By: _______________________", 20, y);
  doc.text("Approved By: _______________________", 120, y);
  doc.setFontSize(7); doc.setTextColor(120);
  doc.text("MediProcure ERP — General Ledger System", 14, 285);
  doc.save(`Journal-${v.journal_number}.pdf`);
};

const JournalVouchersPage = () => {
  const { user, profile } = useAuth();
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialog, setDetailDialog] = useState<any>(null);
  const [entries, setEntries] = useState([
    { account: "", type: "Dr", amount: "" },
    { account: "", type: "Cr", amount: "" },
  ]);
  const [form, setForm] = useState({
    journal_number: "", journal_date: new Date().toISOString().split("T")[0],
    reference: "", period: `${new Date().toLocaleString("default", { month: "long" })} ${new Date().getFullYear()}`,
    narration: "", status: "draft",
  });

  useEffect(() => { fetchVouchers(); }, []);

  const fetchVouchers = async () => {
    const { data } = await (supabase as any).from("journal_vouchers").select("*").order("created_at", { ascending: false }).limit(200);
    setVouchers(data || []);
  };

  const totalDebit = entries.filter(e => e.type === "Dr").reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const totalCredit = entries.filter(e => e.type === "Cr").reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) { toast({ title: "Journal not balanced", description: "Debit must equal Credit", variant: "destructive" }); return; }
    const jNum = form.journal_number || generateJVNo();
    const { data, error } = await (supabase as any).from("journal_vouchers").insert({
      journal_number: jNum, journal_date: form.journal_date, reference: form.reference || null,
      period: form.period, narration: form.narration || null,
      entries: entries.filter(e => e.account),
      total_debit: totalDebit, total_credit: totalCredit, status: "posted", created_by: user?.id,
    }).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    logAudit(user?.id, profile?.full_name, "post", "journal_vouchers", data?.id, { journal: jNum });
    toast({ title: "Journal posted", description: jNum });
    setDialogOpen(false);
    fetchVouchers();
  };

  const filtered = vouchers.filter(v =>
    (v.journal_number || "").toLowerCase().includes(search.toLowerCase()) ||
    (v.narration || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" /> Journal Vouchers
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">EL5H/FIN/JV — General ledger journal entries</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> New Journal</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-blue-600" /> Post Journal Voucher</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">Journal No</Label><Input value={form.journal_number} onChange={e => setForm({...form, journal_number: e.target.value})} placeholder="Auto-gen" className="h-8 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Date *</Label><Input type="date" value={form.journal_date} onChange={e => setForm({...form, journal_date: e.target.value})} required className="h-8 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Reference</Label><Input value={form.reference} onChange={e => setForm({...form, reference: e.target.value})} className="h-8 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Period</Label><Input value={form.period} onChange={e => setForm({...form, period: e.target.value})} className="h-8 text-sm" /></div>
                <div className="col-span-2 space-y-1.5"><Label className="text-xs">Narration *</Label><Textarea value={form.narration} onChange={e => setForm({...form, narration: e.target.value})} required rows={2} placeholder="Journal entry description..." /></div>
              </div>

              {/* Double-entry grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Journal Entries (Double Entry)</Label>
                  <Button type="button" size="sm" variant="outline" className="h-6 text-xs" onClick={() => setEntries([...entries, { account: "", type: "Dr", amount: "" }])}>
                    <Plus className="w-3 h-3 mr-1" /> Add Line
                  </Button>
                </div>
                <div className="border border-border rounded overflow-auto">
                  <Table>
                    <TableHeader><TableRow className="bg-muted/50">
                      <TableHead className="text-xs">Account</TableHead>
                      <TableHead className="text-xs w-20">Dr/Cr</TableHead>
                      <TableHead className="text-xs w-32 text-right">Amount (KSH)</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {entries.map((e, i) => (
                        <TableRow key={i} className={e.type === "Dr" ? "bg-blue-500/5" : "bg-emerald-500/5"}>
                          <TableCell className="py-1">
                            <Select value={e.account} onValueChange={v => { const n = [...entries]; n[i].account = v; setEntries(n); }}>
                              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select account" /></SelectTrigger>
                              <SelectContent>{DEBIT_CREDIT_ACCOUNTS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="py-1">
                            <Select value={e.type} onValueChange={v => { const n = [...entries]; n[i].type = v; setEntries(n); }}>
                              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Dr"><span className="text-blue-600 font-bold">Dr</span> Debit</SelectItem>
                                <SelectItem value="Cr"><span className="text-emerald-600 font-bold">Cr</span> Credit</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="py-1">
                            <Input type="number" step="0.01" value={e.amount} onChange={ev => { const n = [...entries]; n[i].amount = ev.target.value; setEntries(n); }} className="h-7 text-xs text-right" />
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className={`font-bold ${isBalanced ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                        <TableCell className="text-xs">TOTALS</TableCell>
                        <TableCell className="text-xs">
                          {isBalanced ? <span className="text-emerald-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Balanced</span> : <span className="text-red-600 flex items-center gap-1"><XCircle className="w-3 h-3" /> Unbalanced</span>}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          <div className="text-blue-600">Dr: {totalDebit.toFixed(2)}</div>
                          <div className="text-emerald-600">Cr: {totalCredit.toFixed(2)}</div>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={!isBalanced} className="bg-blue-600 hover:bg-blue-700">
                  <BookOpen className="w-4 h-4 mr-1" /> Post Journal
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-xl font-bold text-blue-600">{vouchers.filter(v => v.status === "posted").length}</p><p className="text-xs text-muted-foreground">Posted Journals</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xl font-bold">KSH {(vouchers.reduce((s, v) => s + Number(v.total_debit || 0), 0) / 1000).toFixed(0)}K</p><p className="text-xs text-muted-foreground">Total Debits</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xl font-bold">{vouchers.length}</p><p className="text-xs text-muted-foreground">Total Entries</p></CardContent></Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search journals..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="border border-border rounded-lg overflow-auto bg-card">
        <Table>
          <TableHeader><TableRow className="bg-muted/50">
            <TableHead>Journal No</TableHead><TableHead>Date</TableHead><TableHead>Period</TableHead><TableHead>Narration</TableHead>
            <TableHead className="text-right">Total Dr (KSH)</TableHead><TableHead>Status</TableHead><TableHead className="w-20">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground"><BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />No journals</TableCell></TableRow>
            ) : filtered.map(v => (
              <TableRow key={v.id} className="data-table-row">
                <TableCell className="font-mono font-medium text-sm">{v.journal_number}</TableCell>
                <TableCell className="text-sm">{new Date(v.journal_date || v.created_at).toLocaleDateString("en-KE")}</TableCell>
                <TableCell className="text-sm">{v.period || "—"}</TableCell>
                <TableCell className="text-sm max-w-xs truncate">{v.narration || "—"}</TableCell>
                <TableCell className="text-right font-medium">{Number(v.total_debit || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</TableCell>
                <TableCell><span className={`text-xs px-2 py-1 rounded-full ${v.status === "posted" ? "bg-blue-500/10 text-blue-600" : "bg-muted text-muted-foreground"}`}>{v.status}</span></TableCell>
                <TableCell><div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setDetailDialog(v)}><Eye className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => printJournalVoucher(v)}><Printer className="w-4 h-4" /></Button>
                </div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!detailDialog} onOpenChange={() => setDetailDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Journal: {detailDialog?.journal_number}</DialogTitle></DialogHeader>
          {detailDialog && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{detailDialog.narration}</p>
              {detailDialog.entries?.length > 0 && (
                <div className="border border-border rounded overflow-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead className="text-xs">Account</TableHead><TableHead className="text-xs">Dr/Cr</TableHead><TableHead className="text-xs text-right">Amount</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {detailDialog.entries.map((e: any, i: number) => (
                        <TableRow key={i} className={e.type === "Dr" ? "bg-blue-500/5" : "bg-emerald-500/5"}>
                          <TableCell className="text-xs">{e.account}</TableCell>
                          <TableCell className="text-xs font-bold" style={{ color: e.type === "Dr" ? "#2563eb" : "#059669" }}>{e.type}</TableCell>
                          <TableCell className="text-xs text-right">{Number(e.amount).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-600 font-medium">Total Debit: KSH {Number(detailDialog.total_debit || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span>
                <span className="text-emerald-600 font-medium">Total Credit: KSH {Number(detailDialog.total_credit || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => printJournalVoucher(detailDialog)}><Printer className="w-4 h-4 mr-1" /> Print</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JournalVouchersPage;
