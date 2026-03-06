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
import { Plus, Search, PiggyBank, RefreshCw, TrendingUp } from "lucide-react";

const genNo = () => `BDG/EL5H/${new Date().getFullYear()}/${Math.floor(100+Math.random()*900)}`;

export default function BudgetsPage() {
  const { user, profile, hasRole } = useAuth();
  const canManage = hasRole("admin") || hasRole("procurement_manager");
  const [budgets, setBudgets] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ budget_name:"", department_id:"", financial_year:"2025/26", allocated_amount:"", category:"" });

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => {
    const ch = (supabase as any).channel("budgets-rt").on("postgres_changes",{event:"*",schema:"public",table:"budgets"},()=>fetchAll()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const fetchAll = async () => {
    const [b,d] = await Promise.all([(supabase as any).from("budgets").select("*").order("created_at",{ascending:false}),(supabase as any).from("departments").select("id,name")]);
    setBudgets(b.data||[]); setDepartments(d.data||[]);
  };

  const handleCreate = async () => {
    if (!form.budget_name||!form.allocated_amount) { toast({title:"Fill required fields",variant:"destructive"}); return; }
    const dept = departments.find(d=>d.id===form.department_id);
    const payload = { budget_code:genNo(), budget_name:form.budget_name, department_id:form.department_id||null, department_name:dept?.name||null, financial_year:form.financial_year, allocated_amount:Number(form.allocated_amount), spent_amount:0, committed_amount:0, category:form.category, status:"active", created_by:user?.id };
    const {data,error} = await (supabase as any).from("budgets").insert(payload).select().single();
    if (error) { toast({title:"Error",description:error.message,variant:"destructive"}); return; }
    logAudit(user?.id,profile?.full_name,"create","budgets",data?.id,{});
    toast({title:"Budget created",description:data?.budget_code}); setShowNew(false);
    setForm({budget_name:"",department_id:"",financial_year:"2025/26",allocated_amount:"",category:""});
  };

  const filtered = budgets.filter(b=>b.budget_name?.toLowerCase().includes(search.toLowerCase())||b.department_name?.toLowerCase().includes(search.toLowerCase()));
  const totalAllocated = budgets.reduce((s,b)=>s+Number(b.allocated_amount||0),0);
  const totalSpent = budgets.reduce((s,b)=>s+Number(b.spent_amount||0),0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><PiggyBank className="w-6 h-6 text-purple-600" />Budgets</h1><p className="text-sm text-slate-500 mt-0.5">Budget allocation & monitoring · Live sync</p></div>
        {canManage&&<Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={()=>setShowNew(true)}><Plus className="w-4 h-4 mr-2" />New Budget</Button>}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm"><p className="text-xl font-bold text-slate-800">KES {totalAllocated.toLocaleString()}</p><p className="text-xs text-slate-500 mt-1">Total Allocated</p></div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm"><p className="text-xl font-bold text-slate-800">KES {totalSpent.toLocaleString()}</p><p className="text-xs text-slate-500 mt-1">Total Spent</p></div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm"><p className="text-xl font-bold text-slate-800">{totalAllocated>0?((totalSpent/totalAllocated)*100).toFixed(1):0}%</p><p className="text-xs text-slate-500 mt-1">Utilization Rate</p></div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-100 flex gap-3">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Search budgets..." className="pl-9" value={search} onChange={e=>setSearch(e.target.value)} /></div>
          <Button variant="outline" size="sm" onClick={fetchAll}><RefreshCw className="w-4 h-4" /></Button>
        </div>
        <Table><TableHeader><TableRow className="bg-slate-50">{["Budget Code","Name","Department","FY","Allocated","Spent","Remaining","Utilization"].map(h=><TableHead key={h} className="text-xs font-semibold uppercase">{h}</TableHead>)}</TableRow></TableHeader>
          <TableBody>{filtered.length===0?<TableRow><TableCell colSpan={8} className="text-center text-slate-400 py-12">No budgets. Create the first one.</TableCell></TableRow>
            :filtered.map(b=>{
              const remaining=Number(b.allocated_amount)-Number(b.spent_amount);
              const pct=b.allocated_amount>0?Math.round((b.spent_amount/b.allocated_amount)*100):0;
              return <TableRow key={b.id} className="hover:bg-slate-50">
                <TableCell className="font-mono text-xs font-bold text-purple-600">{b.budget_code}</TableCell>
                <TableCell className="font-medium">{b.budget_name}</TableCell>
                <TableCell className="text-slate-500">{b.department_name||"—"}</TableCell>
                <TableCell className="text-slate-500">{b.financial_year}</TableCell>
                <TableCell className="font-semibold">KES {Number(b.allocated_amount).toLocaleString()}</TableCell>
                <TableCell>KES {Number(b.spent_amount).toLocaleString()}</TableCell>
                <TableCell className={remaining<0?"text-red-600 font-semibold":"font-semibold"}>KES {remaining.toLocaleString()}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full"><div className={`h-full rounded-full ${pct>90?"bg-red-500":pct>70?"bg-amber-500":"bg-green-500"}`} style={{width:`${Math.min(pct,100)}%`}} /></div>
                    <span className="text-xs text-slate-500">{pct}%</span>
                  </div>
                </TableCell>
              </TableRow>;
            })
          }</TableBody>
        </Table>
      </div>
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>New Budget</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Budget Name *</Label><Input className="mt-1" value={form.budget_name} onChange={e=>setForm(f=>({...f,budget_name:e.target.value}))} /></div>
            <div><Label>Department</Label><Select value={form.department_id} onValueChange={v=>setForm(f=>({...f,department_id:v}))}><SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{departments.map(d=><SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Financial Year</Label><Select value={form.financial_year} onValueChange={v=>setForm(f=>({...f,financial_year:v}))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{["2024/25","2025/26","2026/27"].map(y=><SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Allocated Amount (KES) *</Label><Input type="number" className="mt-1" value={form.allocated_amount} onChange={e=>setForm(f=>({...f,allocated_amount:e.target.value}))} /></div>
            <div><Label>Category</Label><Input className="mt-1" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} placeholder="e.g. Pharmaceuticals" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={()=>setShowNew(false)}>Cancel</Button><Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={handleCreate}><PiggyBank className="w-4 h-4 mr-2" />Create Budget</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
