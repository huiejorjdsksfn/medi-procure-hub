import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import { Plus, Search, Download, FilePlus2, RefreshCw, Eye } from "lucide-react";

const genNo = () => { const d=new Date(); return `RV/EL5H/${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}/${Math.floor(1000+Math.random()*9000)}`; };
const INCOME_ACCOUNTS = ["4100 - Revenue Outpatient","4200 - Revenue Inpatient","4300 - Revenue Pharmacy","4400 - Revenue Laboratory","4500 - Revenue Theatre","4600 - NHIF Reimbursements","4700 - Government Grants"];

export default function ReceiptVouchersPage() {
  const { user, profile } = useAuth();
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [form, setForm] = useState({ received_from:"", amount:"", payment_method:"Cash", receipt_date:new Date().toISOString().split("T")[0], reference:"", description:"", income_account:"", bank_name:"" });

  useEffect(() => { fetch(); }, []);
  useEffect(() => {
    const ch = (supabase as any).channel("rv-rt").on("postgres_changes",{event:"*",schema:"public",table:"receipt_vouchers"},()=>fetch()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const fetch = async () => { const { data } = await (supabase as any).from("receipt_vouchers").select("*").order("created_at",{ascending:false}); setVouchers(data||[]); };

  const handleCreate = async () => {
    if (!form.received_from || !form.amount || !form.description) { toast({title:"Fill required fields",variant:"destructive"}); return; }
    const payload = { receipt_number:genNo(), received_from:form.received_from, amount:Number(form.amount), payment_method:form.payment_method, receipt_date:form.receipt_date, reference:form.reference, description:form.description, income_account:form.income_account, bank_name:form.bank_name, status:"confirmed", created_by:user?.id, created_by_name:profile?.full_name };
    const { data, error } = await (supabase as any).from("receipt_vouchers").insert(payload).select().single();
    if (error) { toast({title:"Error",description:error.message,variant:"destructive"}); return; }
    logAudit(user?.id, profile?.full_name, "create", "receipt_vouchers", data?.id, {receipt_number:data?.receipt_number});
    toast({title:"Receipt voucher created",description:data?.receipt_number});
    setShowNew(false);
    setForm({received_from:"",amount:"",payment_method:"Cash",receipt_date:new Date().toISOString().split("T")[0],reference:"",description:"",income_account:"",bank_name:""});
  };

  const filtered = vouchers.filter(v => v.received_from?.toLowerCase().includes(search.toLowerCase()) || v.receipt_number?.toLowerCase().includes(search.toLowerCase()));
  const totalConfirmed = vouchers.filter(v=>v.status==="confirmed").reduce((s,v)=>s+Number(v.amount),0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><FilePlus2 className="w-6 h-6 text-emerald-600" />Receipt Vouchers</h1><p className="text-sm text-slate-500 mt-0.5">Income & receipt documentation · Live sync</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" />Export</Button>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={()=>setShowNew(true)}><Plus className="w-4 h-4 mr-2" />New Receipt</Button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[{label:"Total Received",value:`KES ${totalConfirmed.toLocaleString()}`},{label:"Total Receipts",value:vouchers.length},{label:"Today",value:vouchers.filter(v=>v.receipt_date===new Date().toISOString().split("T")[0]).length}].map(k=>(
          <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm"><p className="text-2xl font-bold text-slate-800">{k.value}</p><p className="text-xs text-slate-500 mt-1">{k.label}</p></div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-100 flex gap-3">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Search..." className="pl-9" value={search} onChange={e=>setSearch(e.target.value)} /></div>
          <Button variant="outline" size="sm" onClick={fetch}><RefreshCw className="w-4 h-4" /></Button>
        </div>
        <Table><TableHeader><TableRow className="bg-slate-50">{["Receipt No.","Received From","Amount (KES)","Date","Method","Status","Actions"].map(h=><TableHead key={h} className="text-xs font-semibold uppercase">{h}</TableHead>)}</TableRow></TableHeader>
          <TableBody>{filtered.length===0?<TableRow><TableCell colSpan={7} className="text-center text-slate-400 py-12">No receipt vouchers. Create the first one.</TableCell></TableRow>
            :filtered.map(v=><TableRow key={v.id} className="hover:bg-slate-50">
              <TableCell className="font-mono text-xs font-semibold text-emerald-600">{v.receipt_number}</TableCell>
              <TableCell className="font-medium">{v.received_from}</TableCell>
              <TableCell className="font-semibold">{Number(v.amount).toLocaleString(undefined,{minimumFractionDigits:2})}</TableCell>
              <TableCell className="text-slate-500">{v.receipt_date}</TableCell>
              <TableCell className="text-slate-500">{v.payment_method}</TableCell>
              <TableCell><Badge variant="outline" className="text-xs text-green-700 border-green-200 bg-green-50">Confirmed</Badge></TableCell>
              <TableCell><Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={()=>setDetail(v)}><Eye className="w-3.5 h-3.5" /></Button></TableCell>
            </TableRow>)
          }</TableBody>
        </Table>
      </div>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><FilePlus2 className="w-5 h-5 text-emerald-600" />New Receipt Voucher</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Received From *</Label><Input className="mt-1" value={form.received_from} onChange={e=>setForm(f=>({...f,received_from:e.target.value}))} placeholder="NHIF, MOH, Patient name..." /></div>
            <div><Label>Amount (KES) *</Label><Input type="number" className="mt-1" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} min={0} /></div>
            <div><Label>Receipt Date *</Label><Input type="date" className="mt-1" value={form.receipt_date} onChange={e=>setForm(f=>({...f,receipt_date:e.target.value}))} /></div>
            <div><Label>Payment Method</Label><Select value={form.payment_method} onValueChange={v=>setForm(f=>({...f,payment_method:v}))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{["Cash","NHIF","MOH Transfer","MPESA","Cheque","EFT"].map(m=><SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Income Account</Label><Select value={form.income_account} onValueChange={v=>setForm(f=>({...f,income_account:v}))}><SelectTrigger className="mt-1"><SelectValue placeholder="Select account..." /></SelectTrigger><SelectContent>{INCOME_ACCOUNTS.map(a=><SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Bank Name</Label><Input className="mt-1" value={form.bank_name} onChange={e=>setForm(f=>({...f,bank_name:e.target.value}))} /></div>
            <div><Label>Reference</Label><Input className="mt-1" value={form.reference} onChange={e=>setForm(f=>({...f,reference:e.target.value}))} /></div>
            <div className="col-span-2"><Label>Description *</Label><textarea className="w-full mt-1 border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[60px]" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={()=>setShowNew(false)}>Cancel</Button><Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleCreate}><FilePlus2 className="w-4 h-4 mr-2" />Create Receipt</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {detail&&<Dialog open={!!detail} onOpenChange={()=>setDetail(null)}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>{detail.receipt_number}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 text-sm">{[["From",detail.received_from],["Amount",`KES ${Number(detail.amount).toLocaleString(undefined,{minimumFractionDigits:2})}`],["Date",detail.receipt_date],["Method",detail.payment_method],["Description",detail.description],["Account",detail.income_account||"—"]].map(([l,v])=><div key={l} className="bg-slate-50 rounded p-2"><p className="text-xs text-slate-500">{l}</p><p className="font-medium text-slate-800">{v}</p></div>)}</div>
        <DialogFooter><Button variant="outline" onClick={()=>setDetail(null)}>Close</Button></DialogFooter>
      </DialogContent></Dialog>}
    </div>
  );
}
