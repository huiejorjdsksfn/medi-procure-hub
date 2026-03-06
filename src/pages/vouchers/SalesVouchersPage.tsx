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
import { Plus, Search, Receipt, RefreshCw, Eye, Edit, Trash2 } from "lucide-react";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";

const genNo = () => { const d=new Date(); return `SINV/EL5H/${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}/${Math.floor(1000+Math.random()*9000)}`; };
const statusColor = (s:string) => ({draft:"text-slate-600 border-slate-200 bg-slate-50",confirmed:"text-green-700 border-green-200 bg-green-50",paid:"text-blue-700 border-blue-200 bg-blue-50",cancelled:"text-red-700 border-red-200 bg-red-50"}[s] ?? "text-slate-600 border-slate-200");
const INCOME_ACCOUNTS = ["4100 - Outpatient","4200 - Inpatient","4300 - Pharmacy","4400 - Laboratory","4500 - Theatre","4600 - Radiology","4800 - NHIF Reimbursements","4810 - MOH Allocations"];
const emptyLine = () => ({ description:"", qty:1, unit_price:0, amount:0 });

export default function SalesVouchersPage() {
  const { user, profile } = useAuth();
  const { data: vouchers, refetch } = useRealtimeTable("sales_vouchers", { order:{ column:"created_at" } });
  const [departments, setDepartments] = useState<any[]>([]);
  const [search, setSearch] = useState(""); const [statusFilter, setStatusFilter] = useState("all");
  const [showNew, setShowNew] = useState(false); const [detail, setDetail] = useState<any>(null); const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ customer_name:"", customer_type:"walk_in", patient_number:"", payment_method:"Cash", voucher_date:new Date().toISOString().split("T")[0], income_account:"", department_id:"", tax_rate:"0" });
  const [lines, setLines] = useState([emptyLine()]);

  useEffect(()=>{(async()=>{const{data}=await(supabase as any).from("departments").select("id,name");setDepartments(data||[]);})();},[]);

  const updateLine=(i:number,k:string,v:any)=>setLines(ls=>{const n=[...ls];n[i]={...n[i],[k]:v};if(k==="qty"||k==="unit_price")n[i].amount=Number(n[i].qty)*Number(n[i].unit_price);return n;});
  const subtotal=lines.reduce((s,l)=>s+Number(l.amount||0),0);
  const taxAmt=subtotal*(Number(form.tax_rate||0)/100);
  const total=subtotal+taxAmt;

  const openNew=(v?:any)=>{
    if(v){setEditing(v);setForm({customer_name:v.customer_name,customer_type:v.customer_type,patient_number:v.patient_number||"",payment_method:v.payment_method,voucher_date:v.voucher_date,income_account:v.income_account||"",department_id:v.department_id||"",tax_rate:String(v.tax_rate||0)});setLines(Array.isArray(v.line_items)&&v.line_items.length>0?v.line_items:[emptyLine()]);}
    else{setEditing(null);setForm({customer_name:"",customer_type:"walk_in",patient_number:"",payment_method:"Cash",voucher_date:new Date().toISOString().split("T")[0],income_account:"",department_id:"",tax_rate:"0"});setLines([emptyLine()]);}
    setShowNew(true);
  };

  const handleSave=async()=>{
    if(!form.customer_name||total===0){toast({title:"Fill required fields",variant:"destructive"});return;}
    const payload={customer_name:form.customer_name,customer_type:form.customer_type,patient_number:form.patient_number,payment_method:form.payment_method,voucher_date:form.voucher_date,income_account:form.income_account,department_id:form.department_id||null,tax_rate:Number(form.tax_rate),subtotal,tax_amount:taxAmt,amount:total,line_items:lines,created_by:user?.id,created_by_name:profile?.full_name};
    if(editing){
      const{error}=await(supabase as any).from("sales_vouchers").update(payload).eq("id",editing.id);
      if(error){toast({title:"Error",description:error.message,variant:"destructive"});return;}
      logAudit(user?.id,profile?.full_name,"update","sales_vouchers",editing.id,{});toast({title:"Voucher updated"});
    } else {
      const{data,error}=await(supabase as any).from("sales_vouchers").insert({...payload,voucher_number:genNo(),status:"confirmed"}).select().single();
      if(error){toast({title:"Error",description:error.message,variant:"destructive"});return;}
      logAudit(user?.id,profile?.full_name,"create","sales_vouchers",data?.id,{number:data?.voucher_number});toast({title:"Sales voucher created",description:data?.voucher_number});
    }
    setShowNew(false);setEditing(null);
  };

  const changeStatus=async(v:any,status:string)=>{
    await(supabase as any).from("sales_vouchers").update({status}).eq("id",v.id);
    logAudit(user?.id,profile?.full_name,status,"sales_vouchers",v.id,{});toast({title:`Voucher ${status}`});setDetail(null);
  };

  const filtered=(vouchers as any[]).filter(v=>(statusFilter==="all"||v.status===statusFilter)&&(v.voucher_number?.toLowerCase().includes(search.toLowerCase())||v.customer_name?.toLowerCase().includes(search.toLowerCase())));
  const todayAmt=(vouchers as any[]).filter((v:any)=>v.voucher_date===new Date().toISOString().split("T")[0]).reduce((s:number,v:any)=>s+Number(v.amount),0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Receipt className="w-6 h-6 text-emerald-600" />Sales / Revenue Vouchers</h1><p className="text-sm text-slate-500">Patient billing & revenue documentation · Realtime</p></div>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={()=>openNew()}><Plus className="w-4 h-4 mr-2" />New Sales Voucher</Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{label:"Today's Revenue",val:`KES ${todayAmt.toLocaleString()}`},{label:"Total Invoices",val:(vouchers as any[]).length},{label:"Confirmed",val:(vouchers as any[]).filter((v:any)=>v.status==="confirmed").length},{label:"Paid",val:(vouchers as any[]).filter((v:any)=>v.status==="paid").length}].map(k=>(
          <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm"><p className="text-2xl font-bold text-slate-800">{k.val}</p><p className="text-xs text-slate-500 mt-1">{k.label}</p></div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-100 flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Search..." className="pl-9" value={search} onChange={e=>setSearch(e.target.value)} /></div>
          <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent>{["all","draft","confirmed","paid","cancelled"].map(s=><SelectItem key={s} value={s} className="capitalize">{s==="all"?"All":s}</SelectItem>)}</SelectContent></Select>
          <Button variant="outline" size="sm" onClick={refetch}><RefreshCw className="w-4 h-4" /></Button>
        </div>
        <Table><TableHeader><TableRow className="bg-slate-50">{["Voucher No.","Customer","Type","Amount","Date","Method","Status","Actions"].map(h=><TableHead key={h} className="text-xs font-semibold uppercase">{h}</TableHead>)}</TableRow></TableHeader>
          <TableBody>{filtered.length===0?<TableRow><TableCell colSpan={8} className="text-center text-slate-400 py-12">No sales vouchers yet.</TableCell></TableRow>
            :filtered.map((v:any)=><TableRow key={v.id} className="hover:bg-slate-50">
              <TableCell className="font-mono text-xs font-bold text-emerald-600">{v.voucher_number}</TableCell>
              <TableCell><p className="font-medium">{v.customer_name}</p><p className="text-xs text-slate-400">{v.patient_number||""}</p></TableCell>
              <TableCell className="capitalize text-slate-500">{v.customer_type?.replace("_"," ")}</TableCell>
              <TableCell className="font-semibold">KES {Number(v.amount||0).toLocaleString(undefined,{minimumFractionDigits:2})}</TableCell>
              <TableCell className="text-slate-500">{v.voucher_date}</TableCell>
              <TableCell className="text-slate-500">{v.payment_method}</TableCell>
              <TableCell><Badge variant="outline" className={`capitalize ${statusColor(v.status)}`}>{v.status}</Badge></TableCell>
              <TableCell><div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={()=>setDetail(v)}><Eye className="w-3.5 h-3.5" /></Button>
                {["draft","confirmed"].includes(v.status)&&<Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={()=>openNew(v)}><Edit className="w-3.5 h-3.5" /></Button>}
              </div></TableCell>
            </TableRow>)
          }</TableBody>
        </Table>
      </div>

      <Dialog open={showNew} onOpenChange={v=>{setShowNew(v);if(!v)setEditing(null);}}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?"Edit":"New"} Sales Voucher</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Customer / Patient Name *</Label><Input className="mt-1" value={form.customer_name} onChange={e=>setForm(f=>({...f,customer_name:e.target.value}))} /></div>
            <div><Label>Customer Type</Label><Select value={form.customer_type} onValueChange={v=>setForm(f=>({...f,customer_type:v}))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{["walk_in","nhif","moh","corporate","insurance","referral"].map(t=><SelectItem key={t} value={t} className="capitalize">{t.replace("_"," ")}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Patient No.</Label><Input className="mt-1" value={form.patient_number} onChange={e=>setForm(f=>({...f,patient_number:e.target.value}))} /></div>
            <div><Label>Payment Method</Label><Select value={form.payment_method} onValueChange={v=>setForm(f=>({...f,payment_method:v}))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{["Cash","NHIF","MOH","MPESA","Insurance","EFT","Cheque"].map(m=><SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Date</Label><Input type="date" className="mt-1" value={form.voucher_date} onChange={e=>setForm(f=>({...f,voucher_date:e.target.value}))} /></div>
            <div><Label>Income Account</Label><Select value={form.income_account} onValueChange={v=>setForm(f=>({...f,income_account:v}))}><SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{INCOME_ACCOUNTS.map(a=><SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Department</Label><Select value={form.department_id} onValueChange={v=>setForm(f=>({...f,department_id:v}))}><SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{departments.map(d=><SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>VAT %</Label><Select value={form.tax_rate} onValueChange={v=>setForm(f=>({...f,tax_rate:v}))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{["0","8","16"].map(r=><SelectItem key={r} value={r}>{r}%</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between mb-2"><Label>Services / Items</Label><Button size="sm" variant="outline" onClick={()=>setLines(ls=>[...ls,emptyLine()])}><Plus className="w-3.5 h-3.5 mr-1" />Add</Button></div>
            <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-50"><tr>{["Description","Qty","Unit Price","Amount"].map(h=><th key={h} className="px-2 py-2 text-left font-semibold">{h}</th>)}</tr></thead>
              <tbody>{lines.map((l,i)=><tr key={i} className="border-t border-slate-100"><td className="px-2 py-1"><Input className="h-7 text-xs" value={l.description} onChange={e=>updateLine(i,"description",e.target.value)} /></td><td className="px-2 py-1 w-16"><Input type="number" className="h-7 text-xs" value={l.qty} onChange={e=>updateLine(i,"qty",Number(e.target.value))} min={1} /></td><td className="px-2 py-1 w-28"><Input type="number" className="h-7 text-xs" value={l.unit_price} onChange={e=>updateLine(i,"unit_price",Number(e.target.value))} min={0} /></td><td className="px-2 py-1 w-28 text-right pr-3 font-semibold">{Number(l.amount||0).toLocaleString(undefined,{minimumFractionDigits:2})}</td></tr>)}</tbody>
            </table>
            <div className="text-right mt-2 text-xs space-y-1"><div>Subtotal: KES {subtotal.toLocaleString(undefined,{minimumFractionDigits:2})}</div>{Number(form.tax_rate)>0&&<div>VAT ({form.tax_rate}%): KES {taxAmt.toLocaleString(undefined,{minimumFractionDigits:2})}</div>}<div className="text-base font-bold">Total: KES {total.toLocaleString(undefined,{minimumFractionDigits:2})}</div></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={()=>setShowNew(false)}>Cancel</Button><Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSave}><Receipt className="w-4 h-4 mr-2" />{editing?"Update":"Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {detail&&<Dialog open={!!detail} onOpenChange={()=>setDetail(null)}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>{detail.voucher_number}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-2 text-sm">{[["Customer",detail.customer_name],["Type",detail.customer_type?.replace("_"," ")],["Amount",`KES ${Number(detail.amount||0).toLocaleString(undefined,{minimumFractionDigits:2})}`],["Date",detail.voucher_date],["Method",detail.payment_method],["Status",detail.status]].map(([l,v])=><div key={l} className="bg-slate-50 rounded p-2"><p className="text-xs text-slate-500">{l}</p><p className="font-medium text-slate-800 capitalize">{v}</p></div>)}</div>
        {detail.status==="confirmed"&&<Button className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white" onClick={()=>changeStatus(detail,"paid")}>Mark as Paid</Button>}
        {detail.status==="confirmed"&&<Button variant="outline" className="w-full mt-2 text-red-600 border-red-200" onClick={()=>changeStatus(detail,"cancelled")}>Cancel Voucher</Button>}
        <DialogFooter className="mt-2"><Button variant="outline" onClick={()=>setDetail(null)}>Close</Button></DialogFooter>
      </DialogContent></Dialog>}
    </div>
  );
}
