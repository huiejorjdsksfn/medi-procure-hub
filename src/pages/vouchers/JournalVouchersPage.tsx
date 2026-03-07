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
import { Plus, Search, BookMarked, RefreshCw, Eye, CheckCircle, Edit, Trash2 } from "lucide-react";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";

const genNo = () => { const d=new Date(); return `JV/EL5H/${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}/${Math.floor(1000+Math.random()*9000)}`; };
const statusColor = (s:string) => ({draft:"text-slate-600 border-slate-200 bg-slate-50",posted:"text-blue-700 border-blue-200 bg-blue-50",reversed:"text-red-700 border-red-200 bg-red-50"}[s] ?? "text-slate-600 border-slate-200");
const ACCOUNTS = ["1100 - Cash","1200 - Accounts Receivable","1300 - Inventory","2100 - Accounts Payable","3100 - Government Fund","4100 - Revenue Outpatient","4300 - Revenue Pharmacy","4800 - NHIF Reimbursements","5100 - Medical Supplies","5200 - Pharmaceuticals","5300 - Salaries","5500 - Utilities","5600 - Admin Expenses"];

const emptyEntry = () => ({ account_code:"", account_name:"", description:"", debit:0, credit:0 });

export default function JournalVouchersPage() {
  const { user, profile, hasRole } = useAuth();
  const canPost = hasRole("admin") || hasRole("procurement_manager");
  const { data: vouchers, refetch } = useRealtimeTable("journal_vouchers", { order:{ column:"created_at" } });
  const [search, setSearch] = useState(""); const [statusFilter, setStatusFilter] = useState("all");
  const [showNew, setShowNew] = useState(false); const [detail, setDetail] = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ journal_date: new Date().toISOString().split("T")[0], reference:"", period:"", narration:"" });
  const [entries, setEntries] = useState([emptyEntry(), emptyEntry()]);

  const updateEntry = (i:number, k:string, v:any) => setEntries(es => { const n=[...es]; n[i]={...n[i],[k]:v}; return n; });
  const totalDebit = entries.reduce((s,e)=>s+Number(e.debit||0),0);
  const totalCredit = entries.reduce((s,e)=>s+Number(e.credit||0),0);
  const isBalanced = Math.abs(totalDebit-totalCredit)<0.01 && totalDebit>0;

  const openNew = (v?:any) => {
    if (v) {
      setEditing(v);
      setForm({ journal_date:v.journal_date, reference:v.reference||"", period:v.period||"", narration:v.narration||"" });
      setEntries(Array.isArray(v.entries)&&v.entries.length>0?v.entries:[emptyEntry(),emptyEntry()]);
    } else {
      setEditing(null);
      setForm({ journal_date:new Date().toISOString().split("T")[0], reference:"", period:"", narration:"" });
      setEntries([emptyEntry(),emptyEntry()]);
    }
    setShowNew(true);
  };

  const handleSave = async () => {
    if (!isBalanced) { toast({title:"Journal not balanced",description:`Debit ${totalDebit.toLocaleString()} ≠ Credit ${totalCredit.toLocaleString()}`,variant:"destructive"}); return; }
    const payload = { journal_date:form.journal_date, reference:form.reference, period:form.period, narration:form.narration, entries, total_debit:totalDebit, total_credit:totalCredit, is_balanced:true, status:"draft", created_by_name:profile?.full_name, created_by:user?.id };
    if (editing) {
      const {error}=await (supabase as any).from("journal_vouchers").update(payload).eq("id",editing.id);
      if (error) { toast({title:"Error",description:error.message,variant:"destructive"}); return; }
      logAudit(user?.id,profile?.full_name,"update","journal_vouchers",editing.id,{});
      toast({title:"Journal updated"});
    } else {
      const {data,error}=await (supabase as any).from("journal_vouchers").insert({...payload,journal_number:genNo()}).select().single();
      if (error) { toast({title:"Error",description:error.message,variant:"destructive"}); return; }
      logAudit(user?.id,profile?.full_name,"create","journal_vouchers",data?.id,{number:data?.journal_number});
      toast({title:"Journal created",description:data?.journal_number});
    }
    setShowNew(false); setEditing(null);
  };

  const handlePost = async (v:any) => {
    const {error}=await (supabase as any).from("journal_vouchers").update({status:"posted",approved_by:user?.id,approved_by_name:profile?.full_name}).eq("id",v.id);
    if (error) { toast({title:"Error",description:error.message,variant:"destructive"}); return; }
    logAudit(user?.id,profile?.full_name,"post","journal_vouchers",v.id,{});
    toast({title:"Journal posted to ledger"}); setDetail(null);
  };

  const handleDelete = async (v:any) => {
    if (v.status==="posted") { toast({title:"Cannot delete posted journal",variant:"destructive"}); return; }
    const {error}=await (supabase as any).from("journal_vouchers").delete().eq("id",v.id);
    if (error) { toast({title:"Error",description:error.message,variant:"destructive"}); return; }
    logAudit(user?.id,profile?.full_name,"delete","journal_vouchers",v.id,{});
    toast({title:"Journal deleted"}); setDetail(null);
  };

  const filtered = (vouchers as any[]).filter(v=>(statusFilter==="all"||v.status===statusFilter)&&(v.journal_number?.toLowerCase().includes(search.toLowerCase())||v.narration?.toLowerCase().includes(search.toLowerCase())));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><BookMarked className="w-6 h-6 text-indigo-600" />Journal Vouchers</h1><p className="text-sm text-slate-500">Double-entry journal entries · </p></div>
        <div className="flex gap-2">
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={()=>openNew()}><Plus className="w-4 h-4 mr-2" />New Journal</Button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[{label:"Draft",val:(vouchers as any[]).filter((v:any)=>v.status==="draft").length},{label:"Posted",val:(vouchers as any[]).filter((v:any)=>v.status==="posted").length},{label:"Total",val:(vouchers as any[]).length}].map(k=>(
          <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm"><p className="text-2xl font-bold text-slate-800">{k.val}</p><p className="text-xs text-slate-500 mt-1">{k.label} Journals</p></div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-100 flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Search journals..." className="pl-9" value={search} onChange={e=>setSearch(e.target.value)} /></div>
          <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent>{["all","draft","posted","reversed"].map(s=><SelectItem key={s} value={s} className="capitalize">{s==="all"?"All":s}</SelectItem>)}</SelectContent></Select>
          <Button variant="outline" size="sm" onClick={refetch}><RefreshCw className="w-4 h-4" /></Button>
        </div>
        <Table><TableHeader><TableRow className="bg-slate-50">{["Journal No.","Date","Narration","Debit","Credit","Balanced","Status","Actions"].map(h=><TableHead key={h} className="text-xs font-semibold uppercase">{h}</TableHead>)}</TableRow></TableHeader>
          <TableBody>{filtered.length===0?<TableRow><TableCell colSpan={8} className="text-center text-slate-400 py-12">No journals yet.</TableCell></TableRow>
            :filtered.map((v:any)=><TableRow key={v.id} className="hover:bg-slate-50">
              <TableCell className="font-mono text-xs font-bold text-indigo-600">{v.journal_number}</TableCell>
              <TableCell>{v.journal_date}</TableCell>
              <TableCell className="max-w-[180px] truncate">{v.narration||"—"}</TableCell>
              <TableCell className="font-semibold">KES {Number(v.total_debit||0).toLocaleString()}</TableCell>
              <TableCell className="font-semibold">KES {Number(v.total_credit||0).toLocaleString()}</TableCell>
              <TableCell><Badge variant="outline" className={v.is_balanced?"text-green-700 border-green-200 bg-green-50":"text-red-700 border-red-200 bg-red-50"}>{v.is_balanced?"✓ Balanced":"✗ Unbalanced"}</Badge></TableCell>
              <TableCell><Badge variant="outline" className={`capitalize ${statusColor(v.status)}`}>{v.status}</Badge></TableCell>
              <TableCell><div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={()=>setDetail(v)}><Eye className="w-3.5 h-3.5" /></Button>
                {v.status==="draft"&&<><Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={()=>openNew(v)}><Edit className="w-3.5 h-3.5" /></Button><Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={()=>handleDelete(v)}><Trash2 className="w-3.5 h-3.5" /></Button></>}
              </div></TableCell>
            </TableRow>)
          }</TableBody>
        </Table>
      </div>

      {/* New/Edit Dialog */}
      <Dialog open={showNew} onOpenChange={v=>{setShowNew(v);if(!v){setEditing(null);}}}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?"Edit":"New"} Journal Voucher</DialogTitle></DialogHeader>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div><Label>Date *</Label><Input type="date" className="mt-1" value={form.journal_date} onChange={e=>setForm(f=>({...f,journal_date:e.target.value}))} /></div>
            <div><Label>Reference</Label><Input className="mt-1" value={form.reference} onChange={e=>setForm(f=>({...f,reference:e.target.value}))} /></div>
            <div><Label>Period</Label><Input className="mt-1" value={form.period} onChange={e=>setForm(f=>({...f,period:e.target.value}))} placeholder="e.g. Mar 2026" /></div>
            <div className="col-span-3"><Label>Narration *</Label><Input className="mt-1" value={form.narration} onChange={e=>setForm(f=>({...f,narration:e.target.value}))} placeholder="Journal description..." /></div>
          </div>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-50"><tr><th className="px-3 py-2 text-left">Account</th><th className="px-3 py-2 text-left">Description</th><th className="px-3 py-2 text-right w-32">Debit</th><th className="px-3 py-2 text-right w-32">Credit</th><th className="px-3 py-2 w-8"></th></tr></thead>
              <tbody>{entries.map((e,i)=><tr key={i} className="border-t border-slate-100">
                <td className="px-2 py-1"><select className="w-full border border-slate-200 rounded px-2 py-1 text-xs" value={e.account_code} onChange={ev=>{const[code,...rest]=ev.target.value.split(" - ");updateEntry(i,"account_code",code);updateEntry(i,"account_name",rest.join(" - "));}}><option value="">Select account...</option>{ACCOUNTS.map(a=><option key={a} value={a}>{a}</option>)}</select></td>
                <td className="px-2 py-1"><Input className="h-7 text-xs" value={e.description} onChange={ev=>updateEntry(i,"description",ev.target.value)} /></td>
                <td className="px-2 py-1"><Input type="number" className="h-7 text-xs text-right" value={e.debit||""} min={0} onChange={ev=>{updateEntry(i,"debit",Number(ev.target.value));if(Number(ev.target.value)>0)updateEntry(i,"credit",0);}} /></td>
                <td className="px-2 py-1"><Input type="number" className="h-7 text-xs text-right" value={e.credit||""} min={0} onChange={ev=>{updateEntry(i,"credit",Number(ev.target.value));if(Number(ev.target.value)>0)updateEntry(i,"debit",0);}} /></td>
                <td className="px-2 py-1"><button onClick={()=>setEntries(es=>es.filter((_,idx)=>idx!==i))} className="text-red-400 hover:text-red-600 p-1">×</button></td>
              </tr>)}</tbody>
              <tfoot className="bg-slate-50 font-bold">
                <tr><td colSpan={2} className="px-3 py-2 text-right">TOTALS</td><td className={`px-3 py-2 text-right ${isBalanced?"text-green-700":"text-red-700"}`}>{totalDebit.toLocaleString(undefined,{minimumFractionDigits:2})}</td><td className={`px-3 py-2 text-right ${isBalanced?"text-green-700":"text-red-700"}`}>{totalCredit.toLocaleString(undefined,{minimumFractionDigits:2})}</td><td></td></tr>
              </tfoot>
            </table>
          </div>
          <div className="flex items-center justify-between mt-2">
            <Button variant="outline" size="sm" onClick={()=>setEntries(es=>[...es,emptyEntry()])}><Plus className="w-3.5 h-3.5 mr-1" />Add Line</Button>
            <span className={`text-sm font-semibold ${isBalanced?"text-green-600":"text-red-500"}`}>{isBalanced?"✓ Balanced":"✗ Difference: "+Math.abs(totalDebit-totalCredit).toLocaleString(undefined,{minimumFractionDigits:2})}</span>
          </div>
          <DialogFooter className="mt-4"><Button variant="outline" onClick={()=>setShowNew(false)}>Cancel</Button><Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSave} disabled={!isBalanced}><BookMarked className="w-4 h-4 mr-2" />{editing?"Save Changes":"Create Journal"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      {detail&&<Dialog open={!!detail} onOpenChange={()=>setDetail(null)}><DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{detail.journal_number}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-3 gap-2 text-sm mb-4">{[["Date",detail.journal_date],["Ref",detail.reference||"—"],["Period",detail.period||"—"],["Status",detail.status],["Debit",`KES ${Number(detail.total_debit||0).toLocaleString()}`],["Credit",`KES ${Number(detail.total_credit||0).toLocaleString()}`]].map(([l,v])=><div key={l} className="bg-slate-50 rounded p-2"><p className="text-xs text-slate-500">{l}</p><p className="font-medium text-slate-800 capitalize">{v}</p></div>)}</div>
        {detail.narration&&<div className="bg-blue-50 rounded p-3 mb-4 text-sm text-blue-800"><strong>Narration:</strong> {detail.narration}</div>}
        <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
          <thead className="bg-slate-50"><tr>{["Account","Description","Debit","Credit"].map(h=><th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>)}</tr></thead>
          <tbody>{(Array.isArray(detail.entries)?detail.entries:[]).map((e:any,i:number)=><tr key={i} className="border-t border-slate-100"><td className="px-3 py-1.5">{e.account_code} {e.account_name}</td><td className="px-3 py-1.5 text-slate-500">{e.description}</td><td className="px-3 py-1.5 text-right">{Number(e.debit||0)>0?Number(e.debit).toLocaleString(undefined,{minimumFractionDigits:2}):"—"}</td><td className="px-3 py-1.5 text-right">{Number(e.credit||0)>0?Number(e.credit).toLocaleString(undefined,{minimumFractionDigits:2}):"—"}</td></tr>)}</tbody>
        </table>
        {canPost&&detail.status==="draft"&&<Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white" onClick={()=>handlePost(detail)}><CheckCircle className="w-4 h-4 mr-2" />Post to Ledger</Button>}
        <DialogFooter className="mt-2"><Button variant="outline" onClick={()=>setDetail(null)}>Close</Button></DialogFooter>
      </DialogContent></Dialog>}
    </div>
  );
}
