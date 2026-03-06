import { useState } from "react";
import { Plus, Search, Download, FilePlus2, RefreshCw, Eye, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface LineItem { description: string; qty: number; unitPrice: number; amount: number; }
interface SalesVoucher {
  id: string; voucherNo: string; customerName: string; voucherDate: string;
  amount: number; subtotal: number; taxAmount: number; description: string;
  status: string; lineItems: LineItem[]; paymentMethod: string; createdAt: string;
}

const genNo = () => {
  const d = new Date();
  return `SINV/EL5H/${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}/${Math.floor(1000+Math.random()*9000)}`;
};

const statusColor = (s: string) => ({
  confirmed: "text-green-700 border-green-200 bg-green-50",
  paid: "text-blue-700 border-blue-200 bg-blue-50",
  draft: "text-slate-600 border-slate-200",
  cancelled: "text-red-700 border-red-200 bg-red-50",
}[s] ?? "text-slate-600 border-slate-200");

const CUSTOMERS = ["NHIF","MOH Kenya","Corporate Patient","Walk-in Patient","Insurance Company","Referral Hospital"];
const INCOME_ACCOUNTS = ["Revenue - Outpatient","Revenue - Inpatient","Revenue - Pharmacy","Revenue - Laboratory","Revenue - Theatre","NHIF Reimbursements","Grant Income"];
const emptyLine = (): LineItem => ({ description:"", qty:1, unitPrice:0, amount:0 });

export default function SalesVouchersPage() {
  const { toast } = useToast();
  const [vouchers, setVouchers] = useState<SalesVoucher[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showNew, setShowNew] = useState(false);
  const [showDetail, setShowDetail] = useState<SalesVoucher | null>(null);
  const [form, setForm] = useState({
    customerName:"", voucherDate: new Date().toISOString().split("T")[0],
    description:"", paymentMethod:"NHIF", incomeAccount:"", lineItems:[emptyLine()],
  });

  const updateLine = (i: number, k: keyof LineItem, v: string|number) => {
    setForm(f => {
      const items = [...f.lineItems];
      items[i] = { ...items[i], [k]: v };
      if (k==="qty"||k==="unitPrice") items[i].amount = Number(items[i].qty)*Number(items[i].unitPrice);
      return { ...f, lineItems: items };
    });
  };

  const subtotal = form.lineItems.reduce((s,l) => s+(l.amount||0), 0);
  const taxAmount = subtotal * 0.16;
  const total = subtotal + taxAmount;

  const handleCreate = () => {
    if (!form.customerName || !form.description || subtotal === 0) {
      toast({ title:"Please fill required fields", variant:"destructive" }); return;
    }
    const v: SalesVoucher = {
      id: Date.now().toString(), voucherNo: genNo(), customerName: form.customerName,
      voucherDate: form.voucherDate, amount: total, subtotal, taxAmount,
      description: form.description, status:"confirmed", lineItems: form.lineItems,
      paymentMethod: form.paymentMethod, createdAt: new Date().toISOString(),
    };
    setVouchers(prev => [v,...prev]);
    setShowNew(false);
    setForm({ customerName:"", voucherDate: new Date().toISOString().split("T")[0], description:"", paymentMethod:"NHIF", incomeAccount:"", lineItems:[emptyLine()] });
    toast({ title:"Sales voucher created", description:v.voucherNo });
  };

  const filtered = vouchers.filter(v =>
    (statusFilter==="all"||v.status===statusFilter) &&
    (v.customerName.toLowerCase().includes(search.toLowerCase()) || v.voucherNo.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FilePlus2 className="w-6 h-6 text-emerald-600" />Sales Vouchers
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Record sales & revenue transactions — Embu Level 5 Hospital</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" />Export</Button>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setShowNew(true)}>
            <Plus className="w-4 h-4 mr-2" />New Sales Voucher
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:"Total Revenue", value:`KES ${vouchers.filter(v=>v.status==="paid").reduce((s,v)=>s+v.amount,0).toLocaleString()}` },
          { label:"Confirmed Invoices", value:vouchers.filter(v=>v.status==="confirmed").length.toString() },
          { label:"Total Vouchers", value:vouchers.length.toString() },
          { label:"Today's Sales", value:`KES ${vouchers.filter(v=>v.createdAt.startsWith(new Date().toISOString().split("T")[0])).reduce((s,v)=>s+v.amount,0).toLocaleString()}` },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-2xl font-bold text-slate-800">{k.value}</p>
            <p className="text-xs text-slate-500 mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-100 flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search vouchers..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none"
            value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="confirmed">Confirmed</option>
            <option value="paid">Paid</option>
            <option value="draft">Draft</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <Button variant="outline" size="sm"><RefreshCw className="w-4 h-4" /></Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {["Voucher No.","Customer","Amount (KES)","Date","Payment","Status","Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length===0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">No sales vouchers yet. Click "New Sales Voucher" to create one.</td></tr>
              ) : filtered.map(v => (
                <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-600">{v.voucherNo}</td>
                  <td className="px-4 py-3 font-medium text-slate-700">{v.customerName}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{v.amount.toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                  <td className="px-4 py-3 text-slate-500">{v.voucherDate}</td>
                  <td className="px-4 py-3 text-slate-500">{v.paymentMethod}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`text-xs capitalize ${statusColor(v.status)}`}>{v.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowDetail(v)}><Eye className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Printer className="w-3.5 h-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><FilePlus2 className="w-5 h-5 text-emerald-600" />New Sales Voucher</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Customer / Payer *</Label>
                <select className="w-full mt-1 border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={form.customerName} onChange={e => setForm(f=>({...f,customerName:e.target.value}))}>
                  <option value="">Select customer...</option>
                  {CUSTOMERS.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <Label>Voucher Date *</Label>
                <Input type="date" className="mt-1" value={form.voucherDate} onChange={e=>setForm(f=>({...f,voucherDate:e.target.value}))} />
              </div>
              <div>
                <Label>Payment Method</Label>
                <select className="w-full mt-1 border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none"
                  value={form.paymentMethod} onChange={e=>setForm(f=>({...f,paymentMethod:e.target.value}))}>
                  {["NHIF","MOH Transfer","Cash","MPESA","Insurance","EFT"].map(m=><option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <Label>Income Account</Label>
                <select className="w-full mt-1 border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none"
                  value={form.incomeAccount} onChange={e=>setForm(f=>({...f,incomeAccount:e.target.value}))}>
                  <option value="">Select account...</option>
                  {INCOME_ACCOUNTS.map(a=><option key={a}>{a}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <Label>Description / Narration *</Label>
                <textarea className="w-full mt-1 border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[60px]"
                  placeholder="Service description..." value={form.description}
                  onChange={e=>setForm(f=>({...f,description:e.target.value}))} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Line Items *</Label>
                <Button size="sm" variant="outline" onClick={()=>setForm(f=>({...f,lineItems:[...f.lineItems,emptyLine()]}))}>
                  <Plus className="w-3.5 h-3.5 mr-1" />Add Line
                </Button>
              </div>
              <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-50">
                  <tr>{["Description","Qty","Unit Price","Amount"].map(h=><th key={h} className="px-2 py-2 text-left text-slate-600 font-semibold">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {form.lineItems.map((line,i)=>(
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-2 py-1"><Input className="h-7 text-xs" value={line.description} onChange={e=>updateLine(i,"description",e.target.value)} /></td>
                      <td className="px-2 py-1 w-16"><Input type="number" className="h-7 text-xs" value={line.qty} onChange={e=>updateLine(i,"qty",Number(e.target.value))} min={1} /></td>
                      <td className="px-2 py-1 w-32"><Input type="number" className="h-7 text-xs" value={line.unitPrice} onChange={e=>updateLine(i,"unitPrice",Number(e.target.value))} min={0} /></td>
                      <td className="px-2 py-1 w-32 text-right font-semibold pr-3">{line.amount.toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-2 text-right space-y-1 text-sm">
                <div className="text-slate-600">Subtotal: <span className="font-medium">KES {subtotal.toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>
                <div className="text-slate-600">VAT (16%): <span className="font-medium">KES {taxAmount.toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>
                <div className="text-base font-bold text-slate-800">Total: KES {total.toLocaleString(undefined,{minimumFractionDigits:2})}</div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setShowNew(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleCreate}>
              <FilePlus2 className="w-4 h-4 mr-2" />Create Voucher
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showDetail && (
        <Dialog open={!!showDetail} onOpenChange={()=>setShowDetail(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Sales Voucher — {showDetail.voucherNo}</DialogTitle></DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                {[["Customer",showDetail.customerName],["Date",showDetail.voucherDate],["Payment",showDetail.paymentMethod],["Status",showDetail.status],["Subtotal",`KES ${showDetail.subtotal.toLocaleString(undefined,{minimumFractionDigits:2})}`],["Total",`KES ${showDetail.amount.toLocaleString(undefined,{minimumFractionDigits:2})}`]].map(([l,v])=>(
                  <div key={l} className="bg-slate-50 rounded p-2">
                    <p className="text-xs text-slate-500">{l}</p>
                    <p className="font-medium text-slate-800 capitalize">{v}</p>
                  </div>
                ))}
              </div>
              <div><p className="text-xs text-slate-500 mb-1">Description</p><p className="text-slate-700">{showDetail.description}</p></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={()=>setShowDetail(null)}>Close</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white"><Printer className="w-4 h-4 mr-2" />Print</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
