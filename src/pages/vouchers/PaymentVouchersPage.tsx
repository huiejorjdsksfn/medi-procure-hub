import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Plus, Search, Download, Eye, CheckCircle, XCircle, Printer,
  FileMinus, Clock, AlertCircle, DollarSign, FileText, BadgeCheck,
} from "lucide-react";
import { logAudit } from "@/lib/audit";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const PAYMENT_METHODS = ["EFT/Bank Transfer", "Cheque", "MPESA", "Cash", "RTGS"];
const EXPENSE_ACCOUNTS = [
  "Medical Supplies", "Pharmaceuticals", "Equipment Maintenance", "Utilities",
  "Staff Training", "Fuel & Transport", "Office Supplies", "Catering",
  "Consultancy", "Repairs & Maintenance", "Capital Expenditure", "Other",
];

const generateVoucherNo = () => {
  const d = new Date();
  return `PV/EL5H/${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}/${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
};

const printVoucher = async (voucher: any) => {
  const doc = new jsPDF();

  // Header
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, 210, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("PAYMENT VOUCHER", 105, 12, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("EMBU LEVEL 5 HOSPITAL — COUNTY GOVERNMENT OF EMBU", 105, 20, { align: "center" });
  doc.text("P.O. Box 33 - 60100, Embu, Kenya  |  pghembu@gmail.com", 105, 27, { align: "center" });

  doc.setTextColor(0);
  let y = 40;

  // Voucher details box
  doc.setDrawColor(30, 58, 95);
  doc.setLineWidth(0.5);
  doc.rect(14, y, 182, 50);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("VOUCHER DETAILS", 20, y + 7);
  doc.setFont("helvetica", "normal");
  doc.text(`Voucher No: ${voucher.voucher_number}`, 20, y + 15);
  doc.text(`Date: ${new Date(voucher.voucher_date || voucher.created_at).toLocaleDateString("en-KE")}`, 20, y + 22);
  doc.text(`Payment Method: ${voucher.payment_method || "—"}`, 20, y + 29);
  doc.text(`Status: ${(voucher.status || "").toUpperCase()}`, 20, y + 36);

  doc.text(`Payee: ${voucher.payee_name || "—"}`, 110, y + 15);
  doc.text(`Bank/Account: ${voucher.bank_name || "—"}`, 110, y + 22);
  doc.text(`Account No: ${voucher.account_number || "—"}`, 110, y + 29);
  doc.text(`Cheque/Ref: ${voucher.reference || "—"}`, 110, y + 36);

  y += 58;

  // Amount (large)
  doc.setFillColor(240, 247, 255);
  doc.rect(14, y, 182, 16, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(30, 58, 95);
  doc.text(`AMOUNT: KSH ${Number(voucher.amount || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`, 20, y + 11);
  doc.setFontSize(9);
  doc.text(`(${numberToWords(Number(voucher.amount || 0))} Kenya Shillings Only)`, 110, y + 11);
  y += 22;

  doc.setTextColor(0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  // Description
  if (voucher.description) {
    doc.setFont("helvetica", "bold");
    doc.text("Description / Narration:", 20, y + 7);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(voucher.description, 170);
    doc.text(lines, 20, y + 14);
    y += 14 + (lines.length * 5);
  }

  y += 10;

  // Line items if any
  if (voucher.line_items && voucher.line_items.length > 0) {
    autoTable(doc, {
      head: [["#", "Description", "Account", "Amount (KSH)"]],
      body: voucher.line_items.map((li: any, i: number) => [i + 1, li.description, li.account, Number(li.amount).toLocaleString("en-KE", { minimumFractionDigits: 2 })]),
      startY: y,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 58, 95] },
    });
    y = (doc as any).lastAutoTable?.finalY + 10 || y + 30;
  }

  // Signature section
  y = Math.max(y, 200);
  if (y + 50 > 280) { doc.addPage(); y = 20; }

  doc.setFont("helvetica", "bold");
  doc.text("AUTHORIZATION & APPROVAL", 20, y);
  y += 8;

  const sigBoxes = [
    ["PREPARED BY:", "Finance Officer"],
    ["VERIFIED BY:", "Finance Manager"],
    ["APPROVED BY:", "CEO / Hospital Director"],
    ["RECEIVED BY:", "Payee / Beneficiary"],
  ];

  sigBoxes.forEach((box, i) => {
    const x = 14 + (i % 2) * 93;
    const by = y + Math.floor(i / 2) * 32;
    doc.setFont("helvetica", "bold");
    doc.text(box[0], x, by);
    doc.setFont("helvetica", "normal");
    doc.text(box[1], x, by + 5);
    doc.text("Name: ______________________", x, by + 14);
    doc.text("Sign: ____________ Date: ______", x, by + 21);
    doc.rect(x, by - 2, 88, 26);
  });

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.text("Embu Level 5 Hospital — MediProcure ERP | EL5H/FIN/PV/001", 14, 287);
  doc.text(`Page 1 of 1`, 196, 287, { align: "right" });

  doc.save(`Payment-Voucher-${voucher.voucher_number}.pdf`);
};

const numberToWords = (n: number): string => {
  if (n === 0) return "Zero";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const num = Math.floor(n);
  if (num < 20) return ones[num];
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? " " + ones[num % 10] : "");
  if (num < 1000) return ones[Math.floor(num / 100)] + " Hundred" + (num % 100 ? " " + numberToWords(num % 100) : "");
  if (num < 1000000) return numberToWords(Math.floor(num / 1000)) + " Thousand" + (num % 1000 ? " " + numberToWords(num % 1000) : "");
  return numberToWords(Math.floor(num / 1000000)) + " Million" + (num % 1000000 ? " " + numberToWords(num % 1000000) : "");
};

const PaymentVouchersPage = () => {
  const { user, profile } = useAuth();
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialog, setDetailDialog] = useState<any>(null);
  const [lineItems, setLineItems] = useState([{ description: "", account: "", amount: "" }]);

  const [form, setForm] = useState({
    voucher_number: "",
    payee_name: "",
    payee_type: "supplier",
    supplier_id: "",
    amount: "",
    payment_method: "EFT/Bank Transfer",
    voucher_date: new Date().toISOString().split("T")[0],
    bank_name: "",
    account_number: "",
    reference: "",
    description: "",
    expense_account: "",
    status: "draft",
  });

  useEffect(() => {
    fetchVouchers();
    fetchSuppliers();
  }, []);

  const fetchVouchers = async () => {
    const { data } = await (supabase as any)
      .from("payment_vouchers")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setVouchers(data || []);
  };

  const fetchSuppliers = async () => {
    const { data } = await supabase.from("suppliers").select("id, name, bank_name, account_number").order("name");
    setSuppliers(data || []);
  };

  const resetForm = () => {
    setForm({
      voucher_number: "", payee_name: "", payee_type: "supplier", supplier_id: "",
      amount: "", payment_method: "EFT/Bank Transfer",
      voucher_date: new Date().toISOString().split("T")[0],
      bank_name: "", account_number: "", reference: "", description: "", expense_account: "", status: "draft",
    });
    setLineItems([{ description: "", account: "", amount: "" }]);
  };

  const handleSupplierSelect = (supplierId: string) => {
    const s = suppliers.find((s) => s.id === supplierId);
    if (s) {
      setForm((f) => ({
        ...f, supplier_id: supplierId, payee_name: s.name,
        bank_name: s.bank_name || f.bank_name,
        account_number: s.account_number || f.account_number,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const vNum = form.voucher_number || generateVoucherNo();
    const totalFromLines = lineItems.filter(l => l.description).reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
    const finalAmount = parseFloat(form.amount) || totalFromLines;

    const payload = {
      voucher_number: vNum,
      payee_name: form.payee_name,
      payee_type: form.payee_type,
      supplier_id: form.supplier_id || null,
      amount: finalAmount,
      payment_method: form.payment_method,
      voucher_date: form.voucher_date,
      bank_name: form.bank_name || null,
      account_number: form.account_number || null,
      reference: form.reference || null,
      description: form.description || null,
      expense_account: form.expense_account || null,
      line_items: lineItems.filter(l => l.description),
      status: "pending",
      created_by: user?.id,
    };

    const { data, error } = await (supabase as any).from("payment_vouchers").insert(payload).select().single();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    logAudit(user?.id, profile?.full_name, "create", "payment_vouchers", data?.id, { voucher: vNum, amount: finalAmount });
    toast({ title: "Payment Voucher created", description: vNum });
    setDialogOpen(false);
    resetForm();
    fetchVouchers();
  };

  const updateStatus = async (id: string, status: string) => {
    await (supabase as any).from("payment_vouchers").update({ status, approved_by: user?.id, approved_at: new Date().toISOString() }).eq("id", id);
    logAudit(user?.id, profile?.full_name, status, "payment_vouchers", id, { status });
    toast({ title: `Voucher ${status}` });
    setDetailDialog(null);
    fetchVouchers();
  };

  const statusColor = (s: string) =>
    s === "approved" ? "bg-emerald-500/10 text-emerald-600" :
    s === "paid" ? "bg-blue-500/10 text-blue-600" :
    s === "rejected" ? "bg-red-500/10 text-red-600" :
    s === "pending" ? "bg-amber-500/10 text-amber-600" :
    "bg-muted text-muted-foreground";

  const filtered = vouchers.filter((v) => {
    const ms = (v.voucher_number || "").toLowerCase().includes(search.toLowerCase()) ||
      (v.payee_name || "").toLowerCase().includes(search.toLowerCase());
    const mst = filterStatus === "all" || v.status === filterStatus;
    return ms && mst;
  });

  const totalPending = vouchers.filter(v => v.status === "pending").reduce((s, v) => s + Number(v.amount || 0), 0);
  const totalApproved = vouchers.filter(v => v.status === "approved").reduce((s, v) => s + Number(v.amount || 0), 0);
  const totalPaid = vouchers.filter(v => v.status === "paid").reduce((s, v) => s + Number(v.amount || 0), 0);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileMinus className="w-6 h-6 text-primary" /> Payment Vouchers
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">EL5H/FIN/PV — Financial payment documentation</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> New Voucher</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileMinus className="w-5 h-5 text-primary" /> Create Payment Voucher
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Voucher Number</Label>
                    <Input value={form.voucher_number} onChange={e => setForm({ ...form, voucher_number: e.target.value })} placeholder="Auto-generated" className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Date *</Label>
                    <Input type="date" value={form.voucher_date} onChange={e => setForm({ ...form, voucher_date: e.target.value })} required className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Payee Type</Label>
                    <Select value={form.payee_type} onValueChange={v => setForm({ ...form, payee_type: v })}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="supplier">Supplier / Vendor</SelectItem>
                        <SelectItem value="staff">Staff Member</SelectItem>
                        <SelectItem value="petty_cash">Petty Cash</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {form.payee_type === "supplier" ? (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Select Supplier</Label>
                      <Select value={form.supplier_id} onValueChange={handleSupplierSelect}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Payee Name *</Label>
                      <Input value={form.payee_name} onChange={e => setForm({ ...form, payee_name: e.target.value })} required className="h-8 text-sm" />
                    </div>
                  )}
                  {form.payee_type === "supplier" && (
                    <div className="col-span-2 space-y-1.5">
                      <Label className="text-xs">Payee Name *</Label>
                      <Input value={form.payee_name} onChange={e => setForm({ ...form, payee_name: e.target.value })} required className="h-8 text-sm" />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Payment Method *</Label>
                    <Select value={form.payment_method} onValueChange={v => setForm({ ...form, payment_method: v })}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Bank Name</Label>
                    <Input value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} className="h-8 text-sm" placeholder="e.g. Equity Bank" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Account Number</Label>
                    <Input value={form.account_number} onChange={e => setForm({ ...form, account_number: e.target.value })} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Cheque/Ref No</Label>
                    <Input value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} className="h-8 text-sm" />
                  </div>
                </div>

                {/* Line items */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Line Items / Breakdown</Label>
                    <Button type="button" size="sm" variant="outline" className="h-6 text-xs"
                      onClick={() => setLineItems([...lineItems, { description: "", account: "", amount: "" }])}>
                      <Plus className="w-3 h-3 mr-1" /> Add Line
                    </Button>
                  </div>
                  <div className="border border-border rounded-lg overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="text-xs">Description</TableHead>
                          <TableHead className="text-xs w-36">Account</TableHead>
                          <TableHead className="text-xs w-28 text-right">Amount (KSH)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lineItems.map((li, i) => (
                          <TableRow key={i}>
                            <TableCell className="py-1">
                              <Input value={li.description} onChange={e => { const n = [...lineItems]; n[i].description = e.target.value; setLineItems(n); }} className="h-7 text-xs" placeholder="What is this payment for?" />
                            </TableCell>
                            <TableCell className="py-1">
                              <Select value={li.account} onValueChange={v => { const n = [...lineItems]; n[i].account = v; setLineItems(n); }}>
                                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Account" /></SelectTrigger>
                                <SelectContent>{EXPENSE_ACCOUNTS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="py-1">
                              <Input type="number" step="0.01" value={li.amount} onChange={e => { const n = [...lineItems]; n[i].amount = e.target.value; setLineItems(n); }} className="h-7 text-xs text-right" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground text-xs">Or enter total directly:</span>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Total Amount (KSH)</Label>
                      <Input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                        placeholder={lineItems.filter(l => l.description).reduce((s, l) => s + (parseFloat(l.amount) || 0), 0).toFixed(2)}
                        className="h-7 text-sm w-36 text-right font-bold" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Description / Narration *</Label>
                  <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="Detailed description of the payment purpose..." rows={3} />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit"><FileText className="w-4 h-4 mr-1" /> Submit Voucher</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10"><Clock className="w-5 h-5 text-amber-600" /></div>
            <div>
              <p className="text-lg font-bold">{vouchers.filter(v => v.status === "pending").length}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-xs font-medium text-amber-600">KSH {(totalPending / 1000).toFixed(0)}K</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10"><BadgeCheck className="w-5 h-5 text-emerald-600" /></div>
            <div>
              <p className="text-lg font-bold">{vouchers.filter(v => v.status === "approved").length}</p>
              <p className="text-xs text-muted-foreground">Approved</p>
              <p className="text-xs font-medium text-emerald-600">KSH {(totalApproved / 1000).toFixed(0)}K</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10"><DollarSign className="w-5 h-5 text-blue-600" /></div>
            <div>
              <p className="text-lg font-bold">{vouchers.filter(v => v.status === "paid").length}</p>
              <p className="text-xs text-muted-foreground">Paid</p>
              <p className="text-xs font-medium text-blue-600">KSH {(totalPaid / 1000).toFixed(0)}K</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><FileMinus className="w-5 h-5 text-primary" /></div>
            <div>
              <p className="text-lg font-bold">{vouchers.length}</p>
              <p className="text-xs text-muted-foreground">Total Vouchers</p>
              <p className="text-xs font-medium text-primary">KSH {((totalPending + totalApproved + totalPaid) / 1000).toFixed(0)}K</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search vouchers, payee..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-auto bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Voucher No</TableHead>
              <TableHead>Payee</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Method</TableHead>
              <TableHead className="text-right">Amount (KSH)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-28">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  <FileMinus className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No payment vouchers found
                </TableCell>
              </TableRow>
            ) : filtered.map((v) => (
              <TableRow key={v.id} className="data-table-row">
                <TableCell className="font-mono font-medium text-sm">{v.voucher_number}</TableCell>
                <TableCell className="font-medium">{v.payee_name || "—"}</TableCell>
                <TableCell className="text-sm">{v.voucher_date ? new Date(v.voucher_date).toLocaleDateString("en-KE") : "—"}</TableCell>
                <TableCell className="text-sm">{v.payment_method || "—"}</TableCell>
                <TableCell className="text-right font-medium">{Number(v.amount || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-1 rounded-full capitalize ${statusColor(v.status)}`}>{v.status}</span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setDetailDialog(v)}><Eye className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => printVoucher(v)}><Printer className="w-4 h-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} voucher(s)</p>

      {/* Detail Dialog */}
      <Dialog open={!!detailDialog} onOpenChange={() => setDetailDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileMinus className="w-5 h-5 text-primary" />
              {detailDialog?.voucher_number}
            </DialogTitle>
          </DialogHeader>
          {detailDialog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground text-xs">Payee</span><p className="font-medium">{detailDialog.payee_name}</p></div>
                <div><span className="text-muted-foreground text-xs">Date</span><p>{new Date(detailDialog.voucher_date || detailDialog.created_at).toLocaleDateString("en-KE")}</p></div>
                <div><span className="text-muted-foreground text-xs">Payment Method</span><p>{detailDialog.payment_method}</p></div>
                <div><span className="text-muted-foreground text-xs">Bank</span><p>{detailDialog.bank_name || "—"}</p></div>
                <div><span className="text-muted-foreground text-xs">Account No</span><p className="font-mono">{detailDialog.account_number || "—"}</p></div>
                <div><span className="text-muted-foreground text-xs">Reference</span><p className="font-mono">{detailDialog.reference || "—"}</p></div>
              </div>
              <div className="bg-primary/5 rounded-lg p-3">
                <span className="text-xs text-muted-foreground">Total Amount</span>
                <p className="text-2xl font-bold text-primary">KSH {Number(detailDialog.amount || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</p>
                <p className="text-xs text-muted-foreground italic">{numberToWords(Math.floor(detailDialog.amount || 0))} Kenya Shillings Only</p>
              </div>
              {detailDialog.description && (
                <div><span className="text-xs text-muted-foreground">Description</span><p className="text-sm mt-1 bg-muted/50 p-2 rounded">{detailDialog.description}</p></div>
              )}
              {detailDialog.line_items?.length > 0 && (
                <div className="border border-border rounded-lg overflow-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead className="text-xs">Description</TableHead><TableHead className="text-xs">Account</TableHead><TableHead className="text-xs text-right">Amount</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {detailDialog.line_items.map((li: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs">{li.description}</TableCell>
                          <TableCell className="text-xs">{li.account}</TableCell>
                          <TableCell className="text-xs text-right">{Number(li.amount).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => printVoucher(detailDialog)}>
                  <Printer className="w-4 h-4 mr-1" /> Print
                </Button>
                {detailDialog.status === "pending" && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => updateStatus(detailDialog.id, "rejected")} className="text-destructive hover:bg-destructive/10">
                      <XCircle className="w-4 h-4 mr-1" /> Reject
                    </Button>
                    <Button size="sm" onClick={() => updateStatus(detailDialog.id, "approved")} className="bg-emerald-600 hover:bg-emerald-700">
                      <CheckCircle className="w-4 h-4 mr-1" /> Approve
                    </Button>
                  </>
                )}
                {detailDialog.status === "approved" && (
                  <Button size="sm" onClick={() => updateStatus(detailDialog.id, "paid")} className="bg-blue-600 hover:bg-blue-700">
                    <DollarSign className="w-4 h-4 mr-1" /> Mark Paid
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentVouchersPage;
