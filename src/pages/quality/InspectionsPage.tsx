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
import { Plus, Search, ClipboardCheck, RefreshCw, Eye } from "lucide-react";

const genNo = () => { const d=new Date(); return `QI/EL5H/${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"00")}/${Math.floor(100+Math.random()*9900)}`; };
const resultColor = (r:string) => ({pass:"text-green-700 border-green-200 bg-green-50",fail:"text-red-700 border-red-200 bg-red-50",conditional:"text-amber-700 border-amber-200 bg-amber-50",pending:"text-slate-600 border-slate-200 bg-slate-50"}[r]??"text-slate-600 border-slate-200");

export default function InspectionsPage() {
  const { user, profile } = useAuth();
  const [inspections, setInspections] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState(""); const [resultFilter, setResultFilter] = useState("all");
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({supplier_id:"",item_id:"",batch_number:"",quantity_inspected:"",quantity_accepted:"",quantity_rejected:"",inspection_date:new Date().toISOString().split("T")[0],result:"pending",grn_reference:"",notes:""});

  useEffect(()=>{ fetchAll(); },[]);
  useEffect(()=>{
    const ch=(supabase as any).channel("insp-rt").on("postgres_changes",{event:"*",schema:"public",table:"inspections"},()=>fetchAll()).subscribe();
    return ()=>{ supabase.removeChannel(ch); };
  },[]);

  const fetchAll = async () => {
    const [insp,supp,itms] = await Promise.all([(supabase as any).from("inspections").select("*").order("created_at",{ascending:false}),supabase.from("suppliers").select("id,name"),supabase.from("items").select("id,name")]);
    setInspections(insp.data||[]); setSuppliers(supp.data||[]); setItems(itms.data||[]);
  };

  const handleCreate = async () => {
    if (!form.supplier_id||!form.quantity_inspected) { toast({title:"Fill required fields",variant:"destructive"}); return; }
    const supplier=suppliers.find(s=>s.id===form.supplier_id); const item=items.find(i=>i.id===form.item_id);
    const payload={inspection_number:genNo(),supplier_id:form.supplier_id,supplier_name:supplier?.name,item_id:form.item_id||null,item_name:item?.name||null,batch_number:form.batch_number,quantity_inspected:Number(form.quantity_inspected),quantity_accepted:Number(form.quantity_accepted)||null,quantity_rejected:Number(form.quantity_rejected)||null,inspection_date:form.inspection_date,result:form.result,grn_reference:form.grn_reference,notes:form.notes,inspector_id:user?.id,inspector_name:profile?.full_name};
    const {data,error}=await (supabase as any).from("inspections").insert(payload).select().single();
    if (error) { toast({title:"Error",description:error.message,variant:"destructive"}); return; }
    logAudit(user?.id,profile?.full_name,"create","inspections",data?.id,{});
    toast({title:"Inspection recorded",description:data?.inspection_number});
    setShowNew(false); setForm({supplier_id:"",item_id:"",batch_number:"",quantity_inspected:"",quantity_accepted:"",quantity_rejected:"",inspection_date:new Date().toISOString().split("T")[0],result:"pending",grn_reference:"",notes:""});
  };

  const filtered=inspections.filter(i=>(resultFilter==="all"||i.result===resultFilter)&&(i.supplier_name?.toLowerCase().includes(search.toLowerCase())||i.inspection_number?.toLowerCase().includes(search.toLowerCase())));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><ClipboardCheck className="w-6 h-6 text-green-600" />Quality Inspections</h1><p className="text-sm text-slate-500 mt-0.5">Goods receipt quality control · Live sync</p></div>
        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={()=>setShowNew(true)}><Plus className="w-4 h-4 mr-2" />New Inspection</Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{label:"Total",val:inspections.length},{label:"Passed",val:inspections.filter(i=>i.result==="pass").length},{label:"Failed",val:inspections.filter(i=>i.result==="fail").length},{label:"Pending",val:inspections.filter(i=>i.result==="pending").length}].map(k=>(
          <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm"><p className="text-2xl font-bold text-slate-800">{k.val}</p><p className="text-xs text-slate-500 mt-1">{k.label}</p></div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-100 flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Search..." className="pl-9" value={search} onChange={e=>setSearch(e.target.value)} /></div>
          <Select value={resultFilter} onValueChange={setResultFilter}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent>{["all","pending","pass","fail","conditional"].map(s=><SelectItem key={s} value={s} className="capitalize">{s==="all"?"All Results":s}</SelectItem>)}</SelectContent></Select>
          <Button variant="outline" size="sm" onClick={fetchAll}><RefreshCw className="w-4 h-4" /></Button>
        </div>
        <Table><TableHeader><TableRow className="bg-slate-50">{["Insp. No.","Item","Batch","Supplier","Qty Inspected","Result","Date"].map(h=><TableHead key={h} className="text-xs font-semibold uppercase">{h}</TableHead>)}</TableRow></TableHeader>
          <TableBody>{filtered.length===0?<TableRow><TableCell colSpan={7} className="text-center text-slate-400 py-12">No inspections yet.</TableCell></TableRow>
            :filtered.map(i=><TableRow key={i.id} className="hover:bg-slate-50">
              <TableCell className="font-mono text-xs font-semibold text-green-600">{i.inspection_number}</TableCell>
              <TableCell className="font-medium">{i.item_name||"—"}</TableCell>
              <TableCell className="text-slate-500">{i.batch_number||"—"}</TableCell>
              <TableCell>{i.supplier_name}</TableCell>
              <TableCell>{i.quantity_inspected}</TableCell>
              <TableCell><Badge variant="outline" className={`text-xs capitalize ${resultColor(i.result)}`}>{i.result}</Badge></TableCell>
              <TableCell className="text-slate-500">{i.inspection_date}</TableCell>
            </TableRow>)
          }</TableBody>
        </Table>
      </div>
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Quality Inspection</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Supplier *</Label><Select value={form.supplier_id} onValueChange={v=>setForm(f=>({...f,supplier_id:v}))}><SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{suppliers.map(s=><SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Item</Label><Select value={form.item_id} onValueChange={v=>setForm(f=>({...f,item_id:v}))}><SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{items.map(i=><SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>GRN Ref</Label><Input className="mt-1" value={form.grn_reference} onChange={e=>setForm(f=>({...f,grn_reference:e.target.value}))} /></div>
            <div><Label>Batch No.</Label><Input className="mt-1" value={form.batch_number} onChange={e=>setForm(f=>({...f,batch_number:e.target.value}))} /></div>
            <div><Label>Qty Inspected *</Label><Input type="number" className="mt-1" value={form.quantity_inspected} onChange={e=>setForm(f=>({...f,quantity_inspected:e.target.value}))} /></div>
            <div><Label>Qty Accepted</Label><Input type="number" className="mt-1" value={form.quantity_accepted} onChange={e=>setForm(f=>({...f,quantity_accepted:e.target.value}))} /></div>
            <div><Label>Qty Rejected</Label><Input type="number" className="mt-1" value={form.quantity_rejected} onChange={e=>setForm(f=>({...f,quantity_rejected:e.target.value}))} /></div>
            <div><Label>Result</Label><Select value={form.result} onValueChange={v=>setForm(f=>({...f,result:v}))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{["pending","pass","fail","conditional"].map(r=><SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Date</Label><Input type="date" className="mt-1" value={form.inspection_date} onChange={e=>setForm(f=>({...f,inspection_date:e.target.value}))} /></div>
            <div className="col-span-2"><Label>Notes</Label><textarea className="w-full mt-1 border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[60px]" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={()=>setShowNew(false)}>Cancel</Button><Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleCreate}><ClipboardCheck className="w-4 h-4 mr-2" />Record</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
