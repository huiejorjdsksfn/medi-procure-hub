import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import ForwardEmailDialog from "@/components/ForwardEmailDialog";
import { Forward } from "lucide-react";
import { Plus, Search, Download, FileMinus, RefreshCw, Eye, Printer, CheckCircle, XCircle } from "lucide-react";

const genVoucherNo = () => {
  const d = new Date();
  return `PV/EL5H/${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}/${Math.floor(1000+Math.random()*9000)}`;
};

const EXPENSE_ACCOUNTS = [
  "5100 - Medical Supplies Expense","5200 - Pharmaceutical Expense","5300 - Salaries & Wages",
  "5400 - Equipment Maintenance","5500 - Utilities","5600 - Administrative Expenses",
  "5700 - Depreciation Expense","1100 - Cash","2100 - Accounts Payable",
];

const statusColor = (s: string) => ({
  draft:"text-slate-600 border-slate-200 bg-slate-50",
  pending:"text-amber-700 border-amber-200 bg-amber-50",
  approved:"text-green-700 border-green-200 bg-green-50",
  paid:"text-blue-700 border-blue-200 bg-blue-50",
  rejected:"text-red-700 border-red-200 bg-red-50",
}[s] ?? "text-slate-600 border-slate-200");

const emptyLine = () => ({ description:"", qty:1, unit_price:0, amount:0, account:"" });

export default function PaymentVouchersPage() {
  const [forwardDialog, setForwardDialog] = useState<any | null>(null);
  const { user, profile, hasRole } = useAuth();
  const canApprove = hasRole("admin") || hasRole("procurement_manager");
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showNew, setShowNew] = useState(false);
  const [detail, setDetail] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [form, setForm] = useState({
    payee_name:"", payee_type:"supplier", supplier_id:"", payment_method:"EFT",
    voucher_date: new Date().toISOString().split("T")[0], bank_name:"", account_number:"",
    reference:"", description:"", expense_account:"", line_items:[emptyLine()],
  });

  useEffect(() => { fetchVouchers(); fetchSuppliers(); }, []);
  useEffect(() => {
    const ch = (supabase as any).channel("pv-rt")
      .on("postgres_changes", { event:"*", schema:"public", table:"payment_vouchers" }, () => fetchVouchers())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const fetchVouchers = async () => {
    const { data } = await (supabase as any).from("payment_vouchers").select("*").order("created_at", { ascending: false });
    setVouchers(data || []);
  };
  const fetchSuppliers = async () => {
    const { data } = await supabase.from("suppliers").select("id, name").order("name");
    setSuppliers(data || []);
  };

  const updateLine = (i: number, k: string, v: any) => {
    setForm(f => {
      const items = [...f.line_items];
      items[i] = { ...items[i], [k]: v };
      if (k === "qty" || k === "unit_price") items[i].amount = Number(items[i].qty) * Number(items[i].unit_price);
      return { ...f, line_items: items };
    });
  };

  const total = form.line_items.reduce((s, l) => s + (l.amount || 0), 0);

  const handleCreate = async () => {
    if (!form.payee_name || !form.description || total === 0) {
      toast({ title: "Fill required fields", variant: "destructive" }); return;
    }
    const payload = {
      voucher_number: genVoucherNo(), payee_name: form.payee_name, payee_type: form.payee_type,
      supplier_id: form.supplier_id || null, amount: total, payment_method: form.payment_method,
      voucher_date: form.voucher_date, bank_name: form.bank_name, account_number: form.account_number,
      reference: form.reference, description: form.description, expense_account: form.expense_account,
      line_items: form.line_items, status: "pending",
      created_by: user?.id, created_by_name: profile?.full_name,
    };
    const { data, error } = await (supabase as any).from("payment_vouchers").insert(payload).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    logAudit(user?.id, profile?.full_name, "create", "payment_vouchers", data?.id, { voucher_number: data?.voucher_number });
    toast({ title: "Payment voucher created", description: data?.voucher_number });
    setShowNew(false);
    setForm({ payee_name:"", payee_type:"supplier", supplier_id:"", payment_method:"EFT",
      voucher_date: new Date().toISOString().split("T")[0], bank_name:"", account_number:"",
      reference:"", description:"", expense_account:"", line_items:[emptyLine()] });
  };

  const handleApprove = async (v: any) => {
    const { error } = await (supabase as any).from("payment_vouchers").update({
      status: "approved", approved_by: user?.id, approved_by_name: profile?.full_name, approved_at: new Date().toISOString()
    }).eq("id", v.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    logAudit(user?.id, profile?.full_name, "approve", "payment_vouchers", v.id, {});
    toast({ title: "Voucher approved" });
    setDetail(null);
  };

  const handleReject = async (v: any) => {
    const { error } = await (supabase as any).from("payment_vouchers").update({
      status: "rejected", rejection_reason: rejectionReason
    }).eq("id", v.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    logAudit(user?.id, profile?.full_name, "reject", "payment_vouchers", v.id, { reason: rejectionReason });
    toast({ title: "Voucher rejected" });
    setDetail(null); setRejectionReason("");
  };

  const handleMarkPaid = async (v: any) => {
    await (supabase as any).from("payment_vouchers").update({ status: "paid" }).eq("id", v.id);
    logAudit(user?.id, profile?.full_name, "mark_paid", "payment_vouchers", v.id, {});
    toast({ title: "Marked as paid" }); setDetail(null);
  };

  const filtered = vouchers.filter(v =>
    (statusFilter === "all" || v.status === statusFilter) &&
    (v.payee_name?.toLowerCase().includes(search.toLowerCase()) || v.voucher_number?.toLowerCase().includes(search.toLowerCase()))
  );

  const kpis = [
    { label:"Pending Vouchers", value: vouchers.filter(v=>v.status==="pending").length, sub:`KES ${vouchers.filter(v=>v.status==="pending").reduce((s,v)=>s+v.amount,0).toLocaleString()}`, color:"amber" },
    { label:"Approved", value: vouchers.filter(v=>v.status==="approved").length, sub:`KES ${vouchers.filter(v=>v.status==="approved").reduce((s,v)=>s+v.amount,0).toLocaleString()}`, color:"green" },
    { label:"Paid (MTD)", value: vouchers.filter(v=>v.status==="paid").length, sub:`KES ${vouchers.filter(v=>v.status==="paid").reduce((s,v)=>s+v.amount,0).toLocaleString()}`, color:"blue" },
    { label:"Total Vouchers", value: vouchers.length, sub:"All time", color:"slate" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileMinus className="w-6 h-6 text-blue-600" />Payment Vouchers
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Embu Level 5 Hospital · Real-time sync enabled</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" />Export</Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setShowNew(true)}>
            <Plus className="w-4 h-4 mr-2" />New Payment Voucher
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-2xl font-bold text-slate-800">{k.value}</p>
            <p className="text-xs font-medium text-slate-700 mt-1">{k.label}</p>
            <p className="text-xs text-slate-400">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-100 flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search vouchers..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["all","draft","pending","approved","paid","rejected"].map(s => <SelectItem key={s} value={s} className="capitalize">{s === "all" ? "All Status" : s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchVouchers}><RefreshCw className="w-4 h-4" /></Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              {["Voucher No.","Payee","Amount (KES)","Date","Method","Status","Actions"].map(h => (
                <TableHead key={h} className="text-xs font-semibold text-slate-600 uppercase">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-slate-400 py-12">
                No vouchers found. Create your first payment voucher.
              </TableCell></TableRow>
            ) : filtered.map(v => (
              <TableRow key={v.id} className="hover:bg-slate-50">
                <TableCell className="font-mono text-xs font-semibold text-blue-600">{v.voucher_number}</TableCell>
                <TableCell>
                  <p className="font-medium text-slate-700">{v.payee_name}</p>
                  <p className="text-xs text-slate-400">{v.payee_type}</p>
                </TableCell>
                <TableCell className="font-semibold">{Number(v.amount).toLocaleString(undefined,{minimumFractionDigits:2})}</TableCell>
                <TableCell className="text-slate-500">{v.voucher_date}</TableCell>
                <TableCell className="text-slate-500">{v.payment_method}</TableCell>
                <TableCell><Badge variant="outline" className={`text-xs capitalize ${statusColor(v.status)}`}>{v.status}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDetail(v)}><Eye className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Printer className="w-3.5 h-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* New Voucher Dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><FileMinus className="w-5 h-5 text-blue-600" />New Payment Voucher</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Payee Type</Label>
                <Select value={form.payee_type} onValueChange={v => setForm(f => ({...f, payee_type:v}))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="supplier">Supplier</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="utility">Utility Company</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.payee_type === "supplier" ? (
                <div>
                  <Label>Supplier *</Label>
                  <Select value={form.supplier_id} onValueChange={v => {
                    const s = suppliers.find(s => s.id === v);
                    setForm(f => ({...f, supplier_id:v, payee_name: s?.name || f.payee_name}));
                  }}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select supplier..." /></SelectTrigger>
                    <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ) : (
                <div>
                  <Label>Payee Name *</Label>
                  <Input className="mt-1" value={form.payee_name} onChange={e => setForm(f => ({...f, payee_name:e.target.value}))} />
                </div>
              )}
              <div>
                <Label>Voucher Date *</Label>
                <Input type="date" className="mt-1" value={form.voucher_date} onChange={e => setForm(f => ({...f, voucher_date:e.target.value}))} />
              </div>
              <div>
                <Label>Payment Method</Label>
                <Select value={form.payment_method} onValueChange={v => setForm(f => ({...f, payment_method:v}))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{["EFT","Cheque","MPESA","Cash","RTGS"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Bank Name</Label>
                <Input className="mt-1" value={form.bank_name} onChange={e => setForm(f => ({...f, bank_name:e.target.value}))} placeholder="e.g. KCB Bank" />
              </div>
              <div>
                <Label>Account Number</Label>
                <Input className="mt-1" value={form.account_number} onChange={e => setForm(f => ({...f, account_number:e.target.value}))} />
              </div>
              <div>
                <Label>Expense Account</Label>
                <Select value={form.expense_account} onValueChange={v => setForm(f => ({...f, expense_account:v}))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select account..." /></SelectTrigger>
                  <SelectContent>{EXPENSE_ACCOUNTS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reference</Label>
                <Input className="mt-1" value={form.reference} onChange={e => setForm(f => ({...f, reference:e.target.value}))} placeholder="PO/Invoice ref" />
              </div>
              <div className="col-span-2">
                <Label>Description / Narration *</Label>
                <Textarea className="mt-1" value={form.description} onChange={e => setForm(f => ({...f, description:e.target.value}))} placeholder="Payment purpose..." />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Line Items *</Label>
                <Button size="sm" variant="outline" onClick={() => setForm(f => ({...f, line_items:[...f.line_items, emptyLine()]}))}>
                  <Plus className="w-3.5 h-3.5 mr-1" />Add Line
                </Button>
              </div>
              <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-50"><tr>
                  {["Description","Qty","Unit Price","Amount"].map(h => <th key={h} className="px-2 py-2 text-left font-semibold text-slate-600">{h}</th>)}
                </tr></thead>
                <tbody>
                  {form.line_items.map((line, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-2 py-1"><Input className="h-7 text-xs" value={line.description} onChange={e => updateLine(i,"description",e.target.value)} /></td>
                      <td className="px-2 py-1 w-16"><Input type="number" className="h-7 text-xs" value={line.qty} onChange={e => updateLine(i,"qty",Number(e.target.value))} min={1} /></td>
                      <td className="px-2 py-1 w-32"><Input type="number" className="h-7 text-xs" value={line.unit_price} onChange={e => updateLine(i,"unit_price",Number(e.target.value))} min={0} /></td>
                      <td className="px-2 py-1 w-32 text-right font-semibold pr-3">{line.amount.toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="text-right text-sm mt-2 font-bold text-slate-800">
                Total: KES {total.toLocaleString(undefined,{minimumFractionDigits:2})}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleCreate}>
              <FileMinus className="w-4 h-4 mr-2" />Create Voucher
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      {detail && (
        <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Payment Voucher — {detail.voucher_number}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[["Payee",detail.payee_name],["Amount",`KES ${Number(detail.amount).toLocaleString(undefined,{minimumFractionDigits:2})}`],
                ["Date",detail.voucher_date],["Method",detail.payment_method],
                ["Bank",detail.bank_name||"—"],["Account",detail.account_number||"—"],
                ["Account",detail.expense_account||"—"],["Status",detail.status],
              ].map(([l,v])=>(
                <div key={l} className="bg-slate-50 rounded p-2">
                  <p className="text-xs text-slate-500">{l}</p>
                  <p className="font-medium text-slate-800 capitalize">{v}</p>
                </div>
              ))}
              <div className="col-span-2 bg-slate-50 rounded p-2">
                <p className="text-xs text-slate-500">Description</p>
                <p className="text-slate-700">{detail.description}</p>
              </div>
            </div>
            {detail.status === "pending" && canApprove && (
              <div className="space-y-2 mt-2">
                <Input placeholder="Rejection reason (if rejecting)..." value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} />
                <div className="flex gap-2">
                  <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApprove(detail)}>
                    <CheckCircle className="w-4 h-4 mr-2" />Approve
                  </Button>
                  <Button variant="destructive" className="flex-1" onClick={() => handleReject(detail)}>
                    <XCircle className="w-4 h-4 mr-2" />Reject
                  </Button>
                </div>
              </div>
            )}
            {detail.status === "approved" && canApprove && (
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleMarkPaid(detail)}>
                Mark as Paid
              </Button>
            )}
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => { setForwardDialog(detail); }} className="text-blue-600 hover:bg-blue-50"><Forward className="w-4 h-4 mr-1" /> Forward</Button>
              <Button variant="outline" onClick={() => setDetail(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {forwardDialog && (
        <ForwardEmailDialog
          open={!!forwardDialog}
          onClose={() => setForwardDialog(null)}
          record={{
            id: forwardDialog.id,
            number: forwardDialog.voucher_number,
            type: "voucher",
            amount: forwardDialog.amount,
            status: forwardDialog.status,
          }}
        />
      )}
    </div>
  );
}
