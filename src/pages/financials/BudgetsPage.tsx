import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import { Plus, Search, RefreshCw, Download, X, Save, Trash2, Edit, BarChart3 } from "lucide-react";
import * as XLSX from "xlsx";

const fmtKES = (n:number) => `KES ${Number(n||0).toLocaleString("en-KE",{minimumFractionDigits:0})}`;
const genCode = () => `BDG-${new Date().getFullYear()}-${String(Math.floor(100+Math.random()*900))}`;
const SC: Record<string,string> = {active:"#15803d",draft:"#6b7280",closed:"#dc2626",exceeded:"#d97706"};

export default function BudgetsPage() {
  const { user, profile, hasRole } = useAuth();
  const canManage = hasRole("admin")||hasRole("procurement_manager");
  const [rows, setRows] = useState<any[]>([]);
  const [depts, setDepts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({budget_name:"",department_id:"",department_name:"",financial_year:"2025/26",allocated_amount:"",category:"",status:"active",notes:""});

  const load = async () => {
    setLoading(true);
    const [{data:b},{data:d}] = await Promise.all([
      (supabase as any).from("budgets").select("*").order("created_at",{ascending:false}),
      (supabase as any).from("departments").select("id,name").order("name"),
    ]);
    setRows(b||[]); setDepts(d||[]);
    setLoading(false);
  };
  useEffect(()=>{ load(); },[]);

  const openEdit = (b:any) => {
    setEditing(b);
    setForm({budget_name:b.budget_name,department_id:b.department_id||"",department_name:b.department_name||"",financial_year:b.financial_year,allocated_amount:String(b.allocated_amount),category:b.category||"",status:b.status,notes:b.notes||""});
    setShowNew(true);
  };

  const save = async () => {
    if(!form.budget_name||!form.allocated_amount){toast({title:"Budget name and amount required",variant:"destructive"});return;}
    setSaving(true);
    const dept = depts.find(d=>d.id===form.department_id);
    const payload={...form,budget_code:editing?editing.budget_code:genCode(),department_name:dept?.name||form.department_name,allocated_amount:Number(form.allocated_amount),department_id:form.department_id||null,created_by:user?.id,created_by_name:profile?.full_name};
    if(editing){
      const{error}=await(supabase as any).from("budgets").update(payload).eq("id",editing.id);
      if(error){toast({title:"Error",description:error.message,variant:"destructive"});}
      else{logAudit(user?.id,profile?.full_name,"update","budgets",editing.id,{name:form.budget_name});toast({title:"Budget updated ✓"});}
    } else {
      const{data,error}=await(supabase as any).from("budgets").insert(payload).select().single();
      if(error){toast({title:"Error",description:error.message,variant:"destructive"});}
      else{logAudit(user?.id,profile?.full_name,"create","budgets",data?.id,{name:form.budget_name});toast({title:"Budget created ✓"});}
    }
    setSaving(false); setShowNew(false); setEditing(null); load();
  };

  const deleteRow = async (id:string) => {
    if(!confirm("Delete this budget?")) return;
    await(supabase as any).from("budgets").delete().eq("id",id);
    toast({title:"Deleted"}); load();
  };

  const exportExcel = () => {
    const wb=XLSX.utils.book_new(); const ws=XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb,ws,"Budgets");
    XLSX.writeFile(wb,`budgets_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast({title:"Exported"});
  };

  const filtered = search ? rows.filter(r=>Object.values(r).some(v=>String(v||"").toLowerCase().includes(search.toLowerCase()))) : rows;
  const totalAllocated = filtered.reduce((s,r)=>s+Number(r.allocated_amount||0),0);
  const totalSpent = filtered.reduce((s,r)=>s+Number(r.spent_amount||0),0);

  return (
    <div className="p-4 space-y-4" style={{fontFamily:"'Segoe UI',system-ui"}}>
      <div className="rounded-2xl px-5 py-3 flex items-center justify-between" style={{background:"linear-gradient(90deg,#1e1b4b,#3730a3)"}}>
        <div>
          <h1 className="text-base font-black text-white">Budgets</h1>
          <p className="text-[10px] text-white/50">{rows.length} budgets · Allocated: {fmtKES(totalAllocated)} · Spent: {fmtKES(totalSpent)}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportExcel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold" style={{background:"rgba(255,255,255,0.15)",color:"#fff"}}><Download className="w-3.5 h-3.5"/>Export</button>
          {canManage&&<button onClick={()=>{setEditing(null);setForm({budget_name:"",department_id:"",department_name:"",financial_year:"2025/26",allocated_amount:"",category:"",status:"active",notes:""});setShowNew(true);}} className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold" style={{background:"#fff",color:"#3730a3"}}><Plus className="w-3.5 h-3.5"/>New Budget</button>}
        </div>
      </div>
      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search budgets…" className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm outline-none"/></div>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-xs">
          <thead><tr style={{background:"#eef2ff"}}>
            {["Code","Budget Name","Department","FY","Allocated","Spent","Committed","% Used","Status","Actions"].map(h=>(
              <th key={h} className="px-4 py-3 text-left font-bold text-gray-600 text-[10px] uppercase">{h}</th>))}
          </tr></thead>
          <tbody>
            {loading?<tr><td colSpan={10} className="py-8 text-center"><RefreshCw className="w-4 h-4 animate-spin text-gray-300 mx-auto"/></td></tr>:
            filtered.length===0?<tr><td colSpan={10} className="py-8 text-center text-gray-400 text-xs">No budgets yet. Create one to get started.</td></tr>:
            filtered.map((r,i)=>{
              const pct = r.allocated_amount>0?Math.round((r.spent_amount||0)/r.allocated_amount*100):0;
              return (
                <tr key={r.id} style={{borderBottom:"1px solid #f3f4f6",background:i%2===0?"#fff":"#fafafa"}}>
                  <td className="px-4 py-2.5 font-mono text-[10px]" style={{color:"#6b7280"}}>{r.budget_code}</td>
                  <td className="px-4 py-2.5 font-semibold text-gray-800">{r.budget_name}</td>
                  <td className="px-4 py-2.5 text-gray-500">{r.department_name||"—"}</td>
                  <td className="px-4 py-2.5 text-gray-500">{r.financial_year}</td>
                  <td className="px-4 py-2.5 font-bold">{fmtKES(r.allocated_amount)}</td>
                  <td className="px-4 py-2.5" style={{color:pct>90?"#dc2626":pct>70?"#d97706":"#374151"}}>{fmtKES(r.spent_amount||0)}</td>
                  <td className="px-4 py-2.5 text-gray-500">{fmtKES(r.committed_amount||0)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-gray-200 overflow-hidden"><div className="h-full rounded-full" style={{width:`${Math.min(100,pct)}%`,background:pct>90?"#dc2626":pct>70?"#d97706":"#15803d"}}/></div>
                      <span style={{fontSize:10,color:pct>90?"#dc2626":pct>70?"#d97706":"#374151",fontWeight:700}}>{pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5"><span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{background:`${SC[r.status]||"#9ca3af"}20`,color:SC[r.status]||"#9ca3af"}}>{r.status}</span></td>
                  <td className="px-4 py-2.5"><div className="flex gap-1.5">
                    {canManage&&<button onClick={()=>openEdit(r)} className="p-1.5 rounded-lg bg-blue-50"><Edit className="w-3 h-3 text-blue-600"/></button>}
                    {hasRole("admin")&&<button onClick={()=>deleteRow(r.id)} className="p-1.5 rounded-lg bg-red-50"><Trash2 className="w-3 h-3 text-red-500"/></button>}
                  </div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {showNew&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={()=>{setShowNew(false);setEditing(null);}}/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-gray-800">{editing?"Edit Budget":"New Budget"}</h3>
              <button onClick={()=>{setShowNew(false);setEditing(null);}}><X className="w-5 h-5 text-gray-400"/></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[["Budget Name *","budget_name","",2],["Financial Year","financial_year","",1],["Allocated Amount (KES) *","allocated_amount","number",1]].map(([l,k,t,span])=>(
                <div key={k} className={`col-span-${span}`}>
                  <label className="block mb-1 text-xs font-semibold text-gray-500">{l}</label>
                  <input type={t||"text"} value={(form as any)[k]||""} onChange={e=>setForm(p=>({...p,[k as string]:e.target.value}))} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none"/>
                </div>
              ))}
              <div><label className="block mb-1 text-xs font-semibold text-gray-500">Department</label>
                <select value={form.department_id} onChange={e=>setForm(p=>({...p,department_id:e.target.value}))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none">
                  <option value="">— Select —</option>
                  {depts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                </select></div>
              <div><label className="block mb-1 text-xs font-semibold text-gray-500">Category</label>
                <select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none">
                  <option value="">— Select —</option>
                  {["Pharmaceuticals","Medical Supplies","Equipment","Laboratory","Construction","ICT","Staff Training","Utilities","Maintenance","Other"].map(c=><option key={c}>{c}</option>)}
                </select></div>
              <div><label className="block mb-1 text-xs font-semibold text-gray-500">Status</label>
                <select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none">
                  {["active","draft","closed"].map(s=><option key={s} value={s} className="capitalize">{s}</option>)}
                </select></div>
              <div className="col-span-2"><label className="block mb-1 text-xs font-semibold text-gray-500">Notes</label>
                <textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={2} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none resize-none"/></div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={()=>{setShowNew(false);setEditing(null);}} className="px-4 py-2 rounded-xl border text-sm">Cancel</button>
              <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-bold" style={{background:"#3730a3"}}>
                {saving?<RefreshCw className="w-3.5 h-3.5 animate-spin"/>:<Save className="w-3.5 h-3.5"/>}
                {saving?"Saving…":editing?"Update Budget":"Create Budget"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
