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
import { Plus, Search, CalendarDays, RefreshCw, Edit, CheckCircle } from "lucide-react";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";

const genNo = () => `APP/EL5H/${new Date().getFullYear()}/${Math.floor(100+Math.random()*9900)}`;
const statusColor = (s:string) => ({draft:"text-slate-600 border-slate-200 bg-slate-50",approved:"text-green-700 border-green-200 bg-green-50",in_progress:"text-blue-700 border-blue-200 bg-blue-50",completed:"text-teal-700 border-teal-200 bg-teal-50",cancelled:"text-red-700 border-red-200 bg-red-50"}[s] ?? "text-slate-600 border-slate-200");

export default function ProcurementPlanningPage() {
  const { user, profile, hasRole } = useAuth();
  const canApprove = hasRole("admin") || hasRole("procurement_manager");
  const { data: plans, refetch } = useRealtimeTable("procurement_plans", { order:{ column:"created_at" } });
  const [departments, setDepartments] = useState<any[]>([]);
  const [search, setSearch] = useState(""); const [statusFilter, setStatusFilter] = useState("all"); const [fyFilter, setFyFilter] = useState("all");
  const [showNew, setShowNew] = useState(false); const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ item_description:"", department_id:"", quantity:"", unit_of_measure:"piece", estimated_unit_cost:"", procurement_method:"open_tender", planned_quarter:"Q1", financial_year:"2025/26", budget_line:"", notes:"", status:"draft" });

  useEffect(()=>{(supabase as any).from("departments").select("id,name").then(({data}:any)=>setDepartments(data||[]));},[]);

  const totalCost=Number(form.quantity||0)*Number(form.estimated_unit_cost||0);

  const openNew=(v?:any)=>{
    if(v){setEditing(v);setForm({item_description:v.item_description,department_id:v.department_id||"",quantity:String(v.quantity||""),unit_of_measure:v.unit_of_measure||"piece",estimated_unit_cost:String(v.estimated_unit_cost||""),procurement_method:v.procurement_method||"open_tender",planned_quarter:v.planned_quarter||"Q1",financial_year:v.financial_year||"2025/26",budget_line:v.budget_line||"",notes:v.notes||"",status:v.status||"draft"});}
    else{setEditing(null);setForm({item_description:"",department_id:"",quantity:"",unit_of_measure:"piece",estimated_unit_cost:"",procurement_method:"open_tender",planned_quarter:"Q1",financial_year:"2025/26",budget_line:"",notes:"",status:"draft"});}
    setShowNew(true);
  };

  const handleSave=async()=>{
    if(!form.item_description||!form.quantity){toast({title:"Fill required fields",variant:"destructive"});return;}
    const dept=departments.find(d=>d.id===form.department_id);
    const payload={item_description:form.item_description,department_id:form.department_id||null,department_name:dept?.name||null,quantity:Number(form.quantity),unit_of_measure:form.unit_of_measure,estimated_unit_cost:Number(form.estimated_unit_cost||0),estimated_total_cost:totalCost,procurement_method:form.procurement_method,planned_quarter:form.planned_quarter,financial_year:form.financial_year,budget_line:form.budget_line,notes:form.notes,status:form.status,created_by:user?.id,created_by_name:profile?.full_name};
    if(editing){
      const{error}=await(supabase as any).from("procurement_plans").update(payload).eq("id",editing.id);
      if(error){toast({title:"Error",description:error.message,variant:"destructive"});return;}
      toast({title:"Plan updated"});
    } else {
      const{data,error}=await(supabase as any).from("procurement_plans").insert({...payload,plan_number:genNo()}).select().single();
      if(error){toast({title:"Error",description:error.message,variant:"destructive"});return;}
      logAudit(user?.id,profile?.full_name,"create","procurement_plans",data?.id,{});toast({title:"Plan created",description:data?.plan_number});
    }
    setShowNew(false);setEditing(null);
  };

  const approvePlan=async(p:any)=>{
    await(supabase as any).from("procurement_plans").update({status:"approved"}).eq("id",p.id);
    logAudit(user?.id,profile?.full_name,"approve","procurement_plans",p.id,{});toast({title:"Plan approved"});
  };

  const filtered=(plans as any[]).filter(p=>(statusFilter==="all"||p.status===statusFilter)&&(fyFilter==="all"||p.financial_year===fyFilter)&&(p.item_description?.toLowerCase().includes(search.toLowerCase())||p.plan_number?.toLowerCase().includes(search.toLowerCase())));
  const totalEst=(plans as any[]).reduce((s:number,p:any)=>s+Number(p.estimated_total_cost||0),0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><CalendarDays className="w-6 h-6 text-blue-600" />Annual Procurement Plan</h1><p className="text-sm text-slate-500"></p></div>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={()=>openNew()}><Plus className="w-4 h-4 mr-2" />Add Plan Item</Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{label:"Total Items",val:(plans as any[]).length},{label:"Approved",val:(plans as any[]).filter((p:any)=>p.status==="approved").length},{label:"Total Estimate",val:`KES ${totalEst.toLocaleString()}`},{label:"In Progress",val:(plans as any[]).filter((p:any)=>p.status==="in_progress").length}].map(k=>(
          <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm"><p className="text-xl font-bold text-slate-800">{k.val}</p><p className="text-xs text-slate-500 mt-1">{k.label}</p></div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-100 flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Search plans..." className="pl-9" value={search} onChange={e=>setSearch(e.target.value)} /></div>
          <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent>{["all","draft","approved","in_progress","completed","cancelled"].map(s=><SelectItem key={s} value={s} className="capitalize">{s==="all"?"All Status":s.replace("_"," ")}</SelectItem>)}</SelectContent></Select>
          <Select value={fyFilter} onValueChange={setFyFilter}><SelectTrigger className="w-28"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All FY</SelectItem>{["2024/25","2025/26","2026/27"].map(y=><SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent></Select>
          <Button variant="outline" size="sm" onClick={refetch}><RefreshCw className="w-4 h-4" /></Button>
        </div>
        <Table><TableHeader><TableRow className="bg-slate-50">{["Plan No.","Item","Dept","Qty","Method","Quarter","Est. Cost","Status","Actions"].map(h=><TableHead key={h} className="text-xs font-semibold uppercase">{h}</TableHead>)}</TableRow></TableHeader>
          <TableBody>{filtered.length===0?<TableRow><TableCell colSpan={9} className="text-center text-slate-400 py-12">No plan items. Add the first one.</TableCell></TableRow>
            :filtered.map((p:any)=><TableRow key={p.id} className="hover:bg-slate-50">
              <TableCell className="font-mono text-xs font-bold text-blue-600">{p.plan_number}</TableCell>
              <TableCell className="font-medium max-w-[180px] truncate">{p.item_description}</TableCell>
              <TableCell className="text-slate-500">{p.department_name||"—"}</TableCell>
              <TableCell>{Number(p.quantity||0).toLocaleString()} {p.unit_of_measure}</TableCell>
              <TableCell className="capitalize text-slate-500">{p.procurement_method?.replace("_"," ")}</TableCell>
              <TableCell>{p.planned_quarter} {p.financial_year}</TableCell>
              <TableCell className="font-semibold">KES {Number(p.estimated_total_cost||0).toLocaleString()}</TableCell>
              <TableCell><Badge variant="outline" className={`capitalize ${statusColor(p.status)}`}>{p.status?.replace("_"," ")}</Badge></TableCell>
              <TableCell><div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={()=>openNew(p)}><Edit className="w-3.5 h-3.5" /></Button>
                {canApprove&&p.status==="draft"&&<Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-green-600" onClick={()=>approvePlan(p)}><CheckCircle className="w-3.5 h-3.5" /></Button>}
              </div></TableCell>
            </TableRow>)
          }</TableBody>
        </Table>
      </div>

      <Dialog open={showNew} onOpenChange={v=>{setShowNew(v);if(!v)setEditing(null);}}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?"Edit":"Add"} Procurement Plan Item</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Item Description *</Label><Input className="mt-1" value={form.item_description} onChange={e=>setForm(f=>({...f,item_description:e.target.value}))} /></div>
            <div><Label>Department</Label><Select value={form.department_id} onValueChange={v=>setForm(f=>({...f,department_id:v}))}><SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{departments.map(d=><SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Unit of Measure</Label><Select value={form.unit_of_measure} onValueChange={v=>setForm(f=>({...f,unit_of_measure:v}))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{["piece","box","pack","kg","litre","roll","set","pair"].map(u=><SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Quantity *</Label><Input type="number" className="mt-1" value={form.quantity} onChange={e=>setForm(f=>({...f,quantity:e.target.value}))} min={1} /></div>
            <div><Label>Unit Cost (KES)</Label><Input type="number" className="mt-1" value={form.estimated_unit_cost} onChange={e=>setForm(f=>({...f,estimated_unit_cost:e.target.value}))} min={0} /></div>
            {form.quantity&&form.estimated_unit_cost&&<div className="col-span-2 bg-green-50 rounded p-2 text-sm"><span className="font-semibold text-green-700">Est. Total: KES {totalCost.toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>}
            <div><Label>Procurement Method</Label><Select value={form.procurement_method} onValueChange={v=>setForm(f=>({...f,procurement_method:v}))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{["open_tender","restricted_tender","direct_procurement","request_for_quotation","framework_agreement"].map(m=><SelectItem key={m} value={m} className="capitalize">{m.replace(/_/g," ")}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Quarter</Label><Select value={form.planned_quarter} onValueChange={v=>setForm(f=>({...f,planned_quarter:v}))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{["Q1","Q2","Q3","Q4"].map(q=><SelectItem key={q} value={q}>{q}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Financial Year</Label><Select value={form.financial_year} onValueChange={v=>setForm(f=>({...f,financial_year:v}))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{["2024/25","2025/26","2026/27"].map(y=><SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Budget Line</Label><Input className="mt-1" value={form.budget_line} onChange={e=>setForm(f=>({...f,budget_line:e.target.value}))} /></div>
          </div>
          <DialogFooter className="mt-4"><Button variant="outline" onClick={()=>setShowNew(false)}>Cancel</Button><Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSave}><CalendarDays className="w-4 h-4 mr-2" />{editing?"Update":"Add to Plan"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
