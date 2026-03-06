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
import { Plus, Search, Printer, Eye, FilePlus2, CheckCircle } from "lucide-react";
import { logAudit } from "@/lib/audit";
import jsPDF from "jspdf";

const generateReceiptNo = () => {
  const d = new Date();
  return `RV/EL5H/${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}/${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
};

const printReceiptVoucher = (v: any) => {
  const doc = new jsPDF();
  doc.setFillColor(45, 149, 150);
  doc.rect(0, 0, 210, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("RECEIPT VOUCHER", 105, 12, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("EMBU LEVEL 5 HOSPITAL — COUNTY GOVERNMENT OF EMBU", 105, 20, { align: "center" });
  doc.text("P.O. Box 33 - 60100, Embu, Kenya", 105, 27, { align: "center" });
  doc.setTextColor(0);
  let y = 38;
  doc.setFontSize(9);
  doc.text(`Receipt No: ${v.receipt_number}`, 20, y);
  doc.text(`Date: ${new Date(v.receipt_date || v.created_at).toLocaleDateString("en-KE")}`, 120, y); y += 7;
  doc.text(`Received From: ${v.received_from}`, 20, y); y += 7;
  doc.text(`Payment Method: ${v.payment_method || "—"}`, 20, y);
  doc.text(`Reference: ${v.reference || "—"}`, 120, y); y += 12;
  doc.setFillColor(240, 255, 248);
  doc.rect(14, y, 182, 14, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(45, 149, 150);
  doc.text(`AMOUNT RECEIVED: KSH ${Number(v.amount || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`, 20, y + 10);
  doc.setTextColor(0); doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  y += 20;
  if (v.description) { doc.text(`For: ${v.description}`, 20, y); y += 10; }
  y += 15;
  doc.text("Cashier Signature: _______________________", 20, y);
  doc.text("Payer Signature: _______________________", 120, y);
  doc.setFontSize(7); doc.setTextColor(120);
  doc.text("EL5H/FIN/RV/001 — MediProcure ERP", 14, 285);
  doc.save(`Receipt-${v.receipt_number}.pdf`);
};

const ReceiptVouchersPage = () => {
  const { user, profile } = useAuth();
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialog, setDetailDialog] = useState<any>(null);
  const [form, setForm] = useState({
    receipt_number: "", received_from: "", amount: "", payment_method: "Cash",
    receipt_date: new Date().toISOString().split("T")[0], reference: "", description: "",
    income_account: "", bank_name: "",
  });

  useEffect(() => { fetchVouchers(); }, []);

  const fetchVouchers = async () => {
    const { data } = await (supabase as any).from("receipt_vouchers").select("*").order("created_at", { ascending: false }).limit(200);
    setVouchers(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rNum = form.receipt_number || generateReceiptNo();
    const { data, error } = await (supabase as any).from("receipt_vouchers").insert({
      receipt_number: rNum, received_from: form.received_from,
      amount: parseFloat(form.amount) || 0, payment_method: form.payment_method,
      receipt_date: form.receipt_date, reference: form.reference || null,
      description: form.description || null, income_account: form.income_account || null,
      bank_name: form.bank_name || null, created_by: user?.id, status: "confirmed",
    }).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    logAudit(user?.id, profile?.full_name, "create", "receipt_vouchers", data?.id, { receipt: rNum });
    toast({ title: "Receipt Voucher created", description: rNum });
    setDialogOpen(false);
    setForm({ receipt_number: "", received_from: "", amount: "", payment_method: "Cash", receipt_date: new Date().toISOString().split("T")[0], reference: "", description: "", income_account: "", bank_name: "" });
    fetchVouchers();
  };

  const totalReceived = vouchers.reduce((s, v) => s + Number(v.amount || 0), 0);
  const filtered = vouchers.filter(v =>
    (v.receipt_number || "").toLowerCase().includes(search.toLowerCase()) ||
    (v.received_from || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FilePlus2 className="w-6 h-6 text-emerald-600" /> Receipt Vouchers
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">EL5H/FIN/RV — Income and receipts documentation</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); }}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> New Receipt</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><FilePlus2 className="w-5 h-5 text-emerald-600" /> Create Receipt Voucher</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">Receipt No</Label><Input value={form.receipt_number} onChange={e => setForm({...form, receipt_number: e.target.value})} placeholder="Auto-gen" className="h-8 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Date *</Label><Input type="date" value={form.receipt_date} onChange={e => setForm({...form, receipt_date: e.target.value})} required className="h-8 text-sm" /></div>
                <div className="col-span-2 space-y-1.5"><Label className="text-xs">Received From *</Label><Input value={form.received_from} onChange={e => setForm({...form, received_from: e.target.value})} required className="h-8 text-sm" placeholder="Name of payer / entity" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Amount (KSH) *</Label><Input type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required className="h-8 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Payment Method</Label>
                  <Select value={form.payment_method} onValueChange={v => setForm({...form, payment_method: v})}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{["Cash","Cheque","EFT/Bank Transfer","MPESA","RTGS"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label className="text-xs">Bank</Label><Input value={form.bank_name} onChange={e => setForm({...form, bank_name: e.target.value})} className="h-8 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Reference</Label><Input value={form.reference} onChange={e => setForm({...form, reference: e.target.value})} className="h-8 text-sm" /></div>
                <div className="col-span-2 space-y-1.5"><Label className="text-xs">Description *</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} required rows={2} placeholder="Purpose of receipt..." /></div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700"><CheckCircle className="w-4 h-4 mr-1" /> Create Receipt</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-xl font-bold text-emerald-600">KSH {(totalReceived/1000).toFixed(0)}K</p><p className="text-xs text-muted-foreground">Total Received</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xl font-bold">{vouchers.length}</p><p className="text-xs text-muted-foreground">Total Receipts</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xl font-bold">{vouchers.filter(v => { const d = new Date(v.created_at); const today = new Date(); return d.toDateString() === today.toDateString(); }).length}</p><p className="text-xs text-muted-foreground">Today's Receipts</p></CardContent></Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search receipts..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="border border-border rounded-lg overflow-auto bg-card">
        <Table>
          <TableHeader><TableRow className="bg-muted/50">
            <TableHead>Receipt No</TableHead><TableHead>Received From</TableHead><TableHead>Date</TableHead><TableHead>Method</TableHead><TableHead className="text-right">Amount (KSH)</TableHead><TableHead className="w-20">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground"><FilePlus2 className="w-8 h-8 mx-auto mb-2 opacity-30" />No receipts</TableCell></TableRow>
            ) : filtered.map(v => (
              <TableRow key={v.id} className="data-table-row">
                <TableCell className="font-mono font-medium text-sm">{v.receipt_number}</TableCell>
                <TableCell className="font-medium">{v.received_from}</TableCell>
                <TableCell className="text-sm">{new Date(v.receipt_date || v.created_at).toLocaleDateString("en-KE")}</TableCell>
                <TableCell className="text-sm">{v.payment_method}</TableCell>
                <TableCell className="text-right font-medium text-emerald-600">{Number(v.amount || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setDetailDialog(v)}><Eye className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => printReceiptVoucher(v)}><Printer className="w-4 h-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ReceiptVouchersPage;
