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
import { Plus, Search, Printer, Eye, FileCheck, CheckCircle } from "lucide-react";
import { logAudit } from "@/lib/audit";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const generatePurchaseNo = () => {
  const d = new Date();
  return `PINV/EL5H/${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}/${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
};

const printPurchaseVoucher = (v: any) => {
  const doc = new jsPDF();
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, 210, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("PURCHASE VOUCHER / VENDOR INVOICE", 105, 12, { align: "center" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("EMBU LEVEL 5 HOSPITAL — ACCOUNTS PAYABLE", 105, 20, { align: "center" });
  doc.text("EL5H/FIN/PVI/001", 105, 27, { align: "center" });
  doc.setTextColor(0);
  let y = 38;
  doc.setFontSize(9);
  doc.text(`Voucher No: ${v.voucher_number}`, 20, y);
  doc.text(`Date: ${new Date(v.voucher_date || v.created_at).toLocaleDateString("en-KE")}`, 120, y); y += 7;
  doc.text(`Supplier: ${v.supplier_name || "—"}`, 20, y);
  doc.text(`Invoice No: ${v.invoice_number || "—"}`, 120, y); y += 7;
  doc.text(`PO Reference: ${v.po_reference || "—"}`, 20, y);
  doc.text(`Due Date: ${v.due_date || "—"}`, 120, y); y += 12;

  if (v.line_items?.length > 0) {
    autoTable(doc, {
      head: [["#", "Description", "Qty", "Unit Price", "Total (KSH)"]],
      body: v.line_items.map((li: any, i: number) => [i + 1, li.description, li.qty, Number(li.unit_price).toLocaleString("en-KE", { minimumFractionDigits: 2 }), Number(li.total).toLocaleString("en-KE", { minimumFractionDigits: 2 })]),
      startY: y,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 58, 95] },
    });
    y = (doc as any).lastAutoTable?.finalY + 8 || y + 30;
  }

  doc.setFont("helvetica", "bold");
  doc.text(`Subtotal: KSH ${Number(v.subtotal || v.amount || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`, 120, y);
  if (v.tax_amount) { y += 6; doc.text(`VAT (16%): KSH ${Number(v.tax_amount).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`, 120, y); }
  y += 6;
  doc.setFontSize(11);
  doc.setTextColor(30, 58, 95);
  doc.text(`TOTAL: KSH ${Number(v.amount || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`, 120, y);
  doc.setFontSize(7); doc.setTextColor(120);
  doc.text("EL5H/FIN/PVI/001 — MediProcure ERP Accounts Payable", 14, 285);
  doc.save(`Purchase-Voucher-${v.voucher_number}.pdf`);
};

export const PurchaseVouchersPage = () => {
  const { user, profile } = useAuth();
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lineItems, setLineItems] = useState([{ description: "", qty: "1", unit_price: "", total: "" }]);
  const [form, setForm] = useState({
    voucher_number: "", supplier_id: "", supplier_name: "", invoice_number: "",
    voucher_date: new Date().toISOString().split("T")[0], due_date: "",
    po_reference: "", amount: "", tax_amount: "", subtotal: "", description: "",
  });

  useEffect(() => { fetchVouchers(); fetchSuppliers(); }, []);

  const fetchVouchers = async () => {
    const { data } = await (supabase as any).from("purchase_vouchers").select("*").order("created_at", { ascending: false }).limit(200);
    setVouchers(data || []);
  };

  const fetchSuppliers = async () => {
    const { data } = await supabase.from("suppliers").select("id, name").order("name");
    setSuppliers(data || []);
  };

  const calcTotals = () => {
    const subtotal = lineItems.filter(l => l.description).reduce((s, l) => s + (parseFloat(l.total) || parseFloat(l.qty) * parseFloat(l.unit_price) || 0), 0);
    const tax = subtotal * 0.16;
    return { subtotal, tax, total: subtotal + tax };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const vNum = form.voucher_number || generatePurchaseNo();
    const { subtotal, tax, total } = calcTotals();
    const finalAmount = parseFloat(form.amount) || total;

    const { data, error } = await (supabase as any).from("purchase_vouchers").insert({
      voucher_number: vNum, supplier_id: form.supplier_id || null, supplier_name: form.supplier_name,
      invoice_number: form.invoice_number || null, voucher_date: form.voucher_date,
      due_date: form.due_date || null, po_reference: form.po_reference || null,
      amount: finalAmount, subtotal, tax_amount: tax,
      line_items: lineItems.filter(l => l.description),
      description: form.description || null, status: "pending", created_by: user?.id,
    }).select().single();

    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    logAudit(user?.id, profile?.full_name, "create", "purchase_vouchers", data?.id, { voucher: vNum });
    toast({ title: "Purchase Voucher created", description: vNum });
    setDialogOpen(false);
    fetchVouchers();
  };

  const filtered = vouchers.filter(v =>
    (v.voucher_number || "").toLowerCase().includes(search.toLowerCase()) ||
    (v.supplier_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalPayable = vouchers.filter(v => v.status === "pending").reduce((s, v) => s + Number(v.amount || 0), 0);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileCheck className="w-6 h-6 text-orange-600" /> Purchase Vouchers
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">EL5H/FIN/PVI — Vendor invoices and accounts payable</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> New Purchase Voucher</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><FileCheck className="w-5 h-5 text-orange-600" /> Create Purchase Voucher</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">Voucher No</Label><Input value={form.voucher_number} onChange={e => setForm({...form, voucher_number: e.target.value})} placeholder="Auto-gen" className="h-8 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Invoice No</Label><Input value={form.invoice_number} onChange={e => setForm({...form, invoice_number: e.target.value})} className="h-8 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Supplier *</Label>
                  <Select value={form.supplier_id} onValueChange={v => { const s = suppliers.find(s => s.id === v); setForm({...form, supplier_id: v, supplier_name: s?.name || ""}); }}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label className="text-xs">PO Reference</Label><Input value={form.po_reference} onChange={e => setForm({...form, po_reference: e.target.value})} className="h-8 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Invoice Date *</Label><Input type="date" value={form.voucher_date} onChange={e => setForm({...form, voucher_date: e.target.value})} required className="h-8 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} className="h-8 text-sm" /></div>
              </div>

              {/* Line items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Invoice Items</Label>
                  <Button type="button" size="sm" variant="outline" className="h-6 text-xs" onClick={() => setLineItems([...lineItems, { description: "", qty: "1", unit_price: "", total: "" }])}>
                    <Plus className="w-3 h-3 mr-1" /> Add
                  </Button>
                </div>
                <div className="border border-border rounded overflow-auto">
                  <Table>
                    <TableHeader><TableRow className="bg-muted/50">
                      <TableHead className="text-xs">Description</TableHead>
                      <TableHead className="text-xs w-16">Qty</TableHead>
                      <TableHead className="text-xs w-28">Unit Price</TableHead>
                      <TableHead className="text-xs w-28 text-right">Total</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {lineItems.map((li, i) => (
                        <TableRow key={i}>
                          <TableCell className="py-1"><Input value={li.description} onChange={e => { const n = [...lineItems]; n[i].description = e.target.value; setLineItems(n); }} className="h-7 text-xs" /></TableCell>
                          <TableCell className="py-1"><Input type="number" value={li.qty} onChange={e => { const n = [...lineItems]; n[i].qty = e.target.value; n[i].total = String((parseFloat(e.target.value) || 0) * (parseFloat(n[i].unit_price) || 0)); setLineItems(n); }} className="h-7 text-xs" /></TableCell>
                          <TableCell className="py-1"><Input type="number" step="0.01" value={li.unit_price} onChange={e => { const n = [...lineItems]; n[i].unit_price = e.target.value; n[i].total = String((parseFloat(n[i].qty) || 0) * (parseFloat(e.target.value) || 0)); setLineItems(n); }} className="h-7 text-xs" /></TableCell>
                          <TableCell className="py-1 text-right text-xs font-medium">{((parseFloat(li.qty) || 0) * (parseFloat(li.unit_price) || 0)).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={3} className="text-xs text-right font-medium">Subtotal:</TableCell>
                        <TableCell className="text-right text-xs font-bold">{calcTotals().subtotal.toFixed(2)}</TableCell>
                      </TableRow>
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={3} className="text-xs text-right">VAT (16%):</TableCell>
                        <TableCell className="text-right text-xs">{calcTotals().tax.toFixed(2)}</TableCell>
                      </TableRow>
                      <TableRow className="bg-primary/10">
                        <TableCell colSpan={3} className="text-xs text-right font-bold">TOTAL:</TableCell>
                        <TableCell className="text-right text-sm font-bold text-primary">{calcTotals().total.toFixed(2)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="space-y-1.5"><Label className="text-xs">Notes</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} /></div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-orange-600 hover:bg-orange-700"><CheckCircle className="w-4 h-4 mr-1" /> Create Voucher</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-xl font-bold text-red-600">KSH {(totalPayable / 1000).toFixed(0)}K</p><p className="text-xs text-muted-foreground">Accounts Payable</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xl font-bold">{vouchers.filter(v => v.status === "pending").length}</p><p className="text-xs text-muted-foreground">Pending Invoices</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xl font-bold">{vouchers.length}</p><p className="text-xs text-muted-foreground">Total Vouchers</p></CardContent></Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search purchase vouchers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="border border-border rounded-lg overflow-auto bg-card">
        <Table>
          <TableHeader><TableRow className="bg-muted/50">
            <TableHead>Voucher No</TableHead><TableHead>Supplier</TableHead><TableHead>Invoice No</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Amount (KSH)</TableHead><TableHead>Status</TableHead><TableHead className="w-20">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground"><FileCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />No purchase vouchers</TableCell></TableRow>
            ) : filtered.map(v => (
              <TableRow key={v.id} className="data-table-row">
                <TableCell className="font-mono font-medium text-sm">{v.voucher_number}</TableCell>
                <TableCell className="font-medium">{v.supplier_name || "—"}</TableCell>
                <TableCell className="text-sm font-mono">{v.invoice_number || "—"}</TableCell>
                <TableCell className="text-sm">{new Date(v.voucher_date || v.created_at).toLocaleDateString("en-KE")}</TableCell>
                <TableCell className="text-right font-medium">{Number(v.amount || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</TableCell>
                <TableCell><span className={`text-xs px-2 py-1 rounded-full ${v.status === "paid" ? "bg-emerald-500/10 text-emerald-600" : v.status === "pending" ? "bg-amber-500/10 text-amber-600" : "bg-muted text-muted-foreground"}`}>{v.status}</span></TableCell>
                <TableCell><div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => printPurchaseVoucher(v)}><Printer className="w-4 h-4" /></Button>
                </div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default PurchaseVouchersPage;
