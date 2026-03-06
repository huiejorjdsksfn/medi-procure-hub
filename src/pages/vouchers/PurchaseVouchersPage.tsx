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
import { Plus, Search, FileInput, RefreshCw, Eye, CheckCircle, XCircle, Edit } from "lucide-react";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";

const genNo = () => { const d=new Date(); return `PINV/EL5H/${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}/${Math.floor(1000+Math.random()*9000)}`; };
const statusColor = (s:string) => ({pending:"text-amber-700 border-amber-200 bg-amber-50",approved:"text-green-700 border-green-200 bg-green-50",paid:"text-blue-700 border-blue-200 bg-blue-50",rejected:"text-red-700 border-red-200 bg-red-50"}[s] ?? "text-slate-600 border-slate-200");
const emptyLine = () => ({ description:"", qty:1, unit_price:0, amount:0 });

export default function PurchaseVouchersPage() {
  const { user, profile, hasRole } = useAuth();
  const canApprove = hasRole("admin") || hasRole("procurement_manager");
  const { data: vouchers, refetch } = useRealtimeTable("purchase_vouchers", { order:{ column:"created_at" } });
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [search, setSearch] = useState(""); const [statusFilter, setStatusFilter] = useState("all");
  const [showNew, setShowNew] = useState(false); const [detail, setDetail] = useState<any>(null); const [editing, setEditing] = useState<any>(null);
  const [rejReason, setRejReason] = useState("");
  const [form, setForm] = useState({ supplier_id:"", supplier_name:"", invoice_number:"", voucher_date:new Date().toISOString().split("T")[0], due_date:"", po_reference:"", description:"", expense_account:"", tax_rate:"16" });
  const [lines, setLines] = useState([emptyLine()]);

  useEffect(()=>{(async()=>{const{data}=await supabase.from("suppliers").select("id,name");setSuppliers(data||[]);})();},[]);

  const updateLine=(i:number,k:string,v:any)=>setLines(ls=>{const n=[...ls];n[i]={...n[i],[k]:v};if(k==="qty"||k==="unit_price")n[i].amount=Number(n[i].qty)*Number(n[i].unit_price);return n;});
  const subtotal=lines.reduce((s,l)=>s+Number(l.amount||0),0);
  const taxAmt=subtotal*(Number(form.tax_rate||0)/100);
  const total=subtotal+taxAmt;

  const openNew=(v?:any)=>{
    if(v){setEditing(v);setForm({supplier_id:v.supplier_id||"",supplier_name:v.supplier_name||"",invoice_number:v.invoice_number||"",voucher_date:v.voucher_date,due_date:v.due_date||"",po_reference:v.po_reference||"",description:v.description||"",expense_account:v.expense_account||"",tax_rate:String(v.tax_rate||16)});setLines(Array.isArray(v.line_items)&&v.line_items.length>0?v.line_items:[emptyLine()]);}
    else{setEditing(null);setForm({supplier_id:"",supplier_name:"",invoice_number:"",voucher_date:new Date().toISOString().split("T")[0],due_date:"",po_reference:"",description:"",expense_account:"",tax_rate:"16"});setLines([emptyLine()]);}
    setShowNew(true);
  };

  const handleSave=async()=>{
    if(!form.supplier_id||lines.every(l=>!l.amount)){toast({title:"Fill required fields",variant:"destructive"});return;}
    const s=suppliers.find(s=>s.id===form.supplier_id);
    const payload={supplier_id:form.supplier_id,supplier_name:s?.name||form.supplier_name,invoice_number:form.invoice_number,voucher_date:form.voucher_date,due_date:form.due_date||null,po_reference:form.po_reference,description:form.description,expense_account:form.expense_account,tax_rate:Number(form.tax_rate),subtotal,tax_amount:taxAmt,amount:total,line_items:lines,created_by:user?.id,created_by_name:profile?.full_name};
    if(editing){
      const{error}=await(supabase as any).from("purchase_vouchers").update(payload).eq("id",editing.id);
      if(error){toast({title:"Error",description:error.message,variant:"destructive"});return;}
      logAudit(user?.id,profile?.full_name,"update","purchase_vouchers",editing.id,{});toast({title:"Voucher updated"});
    } else {
      const{data,error}=await(supabase as any).from("purchase_vouchers").insert({...payload,voucher_number:genNo(),status:"pending"}).select().single();
      if(error){toast({title:"Error",description:error.message,variant:"destructive"});return;}
      logAudit(user?.id,profile?.full_name,"create","purchase_vouchers",data?.id,{number:data?.voucher_number});toast({title:"Voucher created",description:data?.voucher_number});
    }
    setShowNew(false);setEditing(null);
  };

  const changeStatus=async(v:any,status:string,extra:any={})=>{
    const{error}=await(supabase as any).from("purchase_vouchers").update({status,...extra}).eq("id",v.id);
    if(error){toast({title:"Error",description:error.message,variant:"destructive"});return;}
    logAudit(user?.id,profile?.full_name,status,"purchase_vouchers",v.id,{});toast({title:`Voucher ${status}`});setDetail(null);setRejReason("");
  };

  const filtered=(vouchers as any[]).filter(v=>(statusFilter==="all"||v.status===statusFilter)&&(v.voucher_number?.toLowerCase().includes(search.toLowerCase())||v.supplier_name?.toLowerCase().includes(search.toLowerCase())));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><FileInput className="w-6 h-6 text-orange-600" />Purchase Vouchers</h1><p className="text-sm text-slate-500">Vendor invoices & payables · Realtime sync</p></div>
        <div className="flex gap-2"><Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white" onClick={()=>openNew()}><Plus className="w-4 h-4 mr-2" />New Voucher</Button></div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{label:"Pending",val:(vouchers as any[]).filter((v:any)=>v.status==="pending").length,amt:(vouchers as any[]).filter((v:any)=>v.status==="pending").reduce((s:number,v:any)=>s+Number(v.amount),0)},{label:"Approved",val:(vouchers as any[]).filter((v:any)=>v.status==="approved").length,amt:(vouchers as any[]).filter((v:any)=>v.status==="approved").reduce((s:number,v:any)=>s+Number(v.amount),0)},{label:"Paid",val:(vouchers as any[]).filter((v:any)=>v.status==="paid").length,amt:(vouchers as any[]).filter((v:any)=>v.status==="paid").reduce((s:number,v:any)=>s+Number(v.amount),0)},{label:"Total",val:(vouchers as any[]).length,amt:(vouchers as any[]).reduce((s:number,v:any)=>s+Number(v.amount),0)}].map(k=>(
          <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm"><p className="text-xl font-bold text-slate-800">{k.val}</p><p className="text-xs text-slate-500">{k.label} · KES {k.amt.toLocaleString()}</p></div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-100 flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Search..." className="pl-9" value={search} onChange={e=>setSearch(e.target.value)} /></div>
          <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent>{["all","pending","approved","paid","rejected"].map(s=><SelectItem key={s} value={s} className="capitalize">{s==="all"?"All":s}</SelectItem>)}</SelectContent></Select>
          <Button variant="outline" size="sm" onClick={refetch}><RefreshCw className="w-4 h-4" /></Button>
        </div>
        <Table><TableHeader><TableRow className="bg-slate-50">{["Voucher No.","Supplier","Invoice","Amount","Due Date","Status","Actions"].map(h=><TableHead key={h} className="text-xs font-semibold uppercase">{h}</TableHead>)}</TableRow></TableHeader>
          <TableBody>{filtered.length===0?<TableRow><TableCell colSpan={7} className="text-center text-slate-400 py-12">No purchase vouchers yet.</TableCell></TableRow>
            :filtered.map((v:any)=><TableRow key={v.id} className="hover:bg-slate-50">
              <TableCell className="font-mono text-xs font-bold text-orange-600">{v.voucher_number}</TableCell>
              <TableCell className="font-medium">{v.supplier_name}</TableCell>
              <TableCell className="text-slate-500">{v.invoice_number||"—"}</TableCell>
              <TableCell className="font-semibold">KES {Number(v.amount||0).toLocaleString(undefined,{minimumFractionDigits:2})}</TableCell>
              <TableCell className="text-slate-500">{v.due_date||"—"}</TableCell>
              <TableCell><Badge variant="outline" className={`capitalize ${statusColor(v.status)}`}>{v.status}</Badge></TableCell>
              <TableCell><div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={()=>setDetail(v)}><Eye className="w-3.5 h-3.5" /></Button>
                {v.status==="pending"&&<Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={()=>openNew(v)}><Edit className="w-3.5 h-3.5" /></Button>}
              </div></TableCell>
            </TableRow>)
          }</TableBody>
        </Table>
      </div>

      {/* New/Edit */}
      <Dialog open={showNew} onOpenChange={v=>{setShowNew(v);if(!v)setEditing(null);}}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?"Edit":"New"} Purchase Voucher</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Supplier *</Label><Select value={form.supplier_id} onValueChange={v=>{const s=suppliers.find(s=>s.id===v);setForm(f=>({...f,supplier_id:v,supplier_name:s?.name||""}));}}><SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{suppliers.map(s=><SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Invoice No.</Label><Input className="mt-1" value={form.invoice_number} onChange={e=>setForm(f=>({...f,invoice_number:e.target.value}))} /></div>
            <div><Label>Voucher Date *</Label><Input type="date" className="mt-1" value={form.voucher_date} onChange={e=>setForm(f=>({...f,voucher_date:e.target.value}))} /></div>
            <div><Label>Due Date</Label><Input type="date" className="mt-1" value={form.due_date} onChange={e=>setForm(f=>({...f,due_date:e.target.value}))} /></div>
            <div><Label>PO Reference</Label><Input className="mt-1" value={form.po_reference} onChange={e=>setForm(f=>({...f,po_reference:e.target.value}))} /></div>
            <div><Label>VAT Rate %</Label><Select value={form.tax_rate} onValueChange={v=>setForm(f=>({...f,tax_rate:v}))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{["0","8","16"].map(r=><SelectItem key={r} value={r}>{r}%</SelectItem>)}</SelectContent></Select></div>
            <div className="col-span-2"><Label>Description</Label><Input className="mt-1" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} /></div>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between mb-2"><Label>Line Items</Label><Button size="sm" variant="outline" onClick={()=>setLines(ls=>[...ls,emptyLine()])}><Plus className="w-3.5 h-3.5 mr-1" />Add</Button></div>
            <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-50"><tr>{["Description","Qty","Unit Price","Amount"].map(h=><th key={h} className="px-2 py-2 text-left font-semibold">{h}</th>)}</tr></thead>
              <tbody>{lines.map((l,i)=><tr key={i} className="border-t border-slate-100">
                <td className="px-2 py-1"><Input className="h-7 text-xs" value={l.description} onChange={e=>updateLine(i,"description",e.target.value)} /></td>
                <td className="px-2 py-1 w-16"><Input type="number" className="h-7 text-xs" value={l.qty} onChange={e=>updateLine(i,"qty",Number(e.target.value))} min={1} /></td>
                <td className="px-2 py-1 w-28"><Input type="number" className="h-7 text-xs" value={l.unit_price} onChange={e=>updateLine(i,"unit_price",Number(e.target.value))} min={0} /></td>
                <td className="px-2 py-1 w-28 text-right pr-3 font-semibold">{Number(l.amount||0).toLocaleString(undefined,{minimumFractionDigits:2})}</td>
              </tr>)}</tbody>
            </table>
            <div className="text-right mt-2 text-xs space-y-1">
              <div>Subtotal: <span className="font-semibold">KES {subtotal.toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>
              <div>VAT ({form.tax_rate}%): <span className="font-semibold">KES {taxAmt.toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>
              <div className="text-base font-bold">Total: KES {total.toLocaleString(undefined,{minimumFractionDigits:2})}</div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={()=>setShowNew(false)}>Cancel</Button><Button className="bg-orange-600 hover:bg-orange-700 text-white" onClick={handleSave}><FileInput className="w-4 h-4 mr-2" />{editing?"Update":"Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail */}
      {detail&&<Dialog open={!!detail} onOpenChange={()=>setDetail(null)}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{detail.voucher_number}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-2 text-sm">{[["Supplier",detail.supplier_name],["Invoice",detail.invoice_number||"—"],["Date",detail.voucher_date],["Due",detail.due_date||"—"],["PO Ref",detail.po_reference||"—"],["Amount",`KES ${Number(detail.amount||0).toLocaleString(undefined,{minimumFractionDigits:2})}`],["Status",detail.status]].map(([l,v])=><div key={l} className="bg-slate-50 rounded p-2"><p className="text-xs text-slate-500">{l}</p><p className="font-medium text-slate-800 capitalize">{v}</p></div>)}</div>
        {canApprove&&detail.status==="pending"&&<div className="mt-3 space-y-2"><Input placeholder="Rejection reason..." value={rejReason} onChange={e=>setRejReason(e.target.value)} /><div className="flex gap-2"><Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={()=>changeStatus(detail,"approved",{approved_by:user?.id,approved_by_name:profile?.full_name})}><CheckCircle className="w-4 h-4 mr-2" />Approve</Button><Button variant="destructive" className="flex-1" onClick={()=>changeStatus(detail,"rejected",{rejection_reason:rejReason})}><XCircle className="w-4 h-4 mr-2" />Reject</Button></div></div>}
        {canApprove&&detail.status==="approved"&&<Button className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white" onClick={()=>changeStatus(detail,"paid",{})}>Mark as Paid</Button>}
        <DialogFooter className="mt-2"><Button variant="outline" onClick={()=>setDetail(null)}>Close</Button></DialogFooter>
      </DialogContent></Dialog>}
    </div>
  );
}
