import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import { Plus, Search, RefreshCw, Download, X, Save, Trash2, Edit, Calendar, BarChart3 } from "lucide-react";
import * as XLSX from "xlsx";

const fmtKES = (n:number) => `KES ${Number(n||0).toLocaleString("en-KE")}`;
const genNo = () => `PP/EL5H/${new Date().getFullYear()}/${String(Math.floor(100+Math.random()*900))}`;
const SC: Record<string,string> = {draft:"#6b7280",approved:"#15803d",active:"#0369a1",completed:"#7c3aed",cancelled:"#dc2626"};
const CATS = ["Pharmaceuticals","Medical Supplies","Equipment","Laboratory","Construction","ICT","Stationery","Furniture","Services","Utilities"];

export default function ProcurementPlanningPage() {
  const { user, profile, hasRole } = useAuth();
  const canManage = hasRole("admin")||hasRole("procurement_manager")||hasRole("procurement_officer");
  const [rows, setRows] = useState<any[]>([]);
  const [depts, setDepts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({title:"",description:"",financial_year:"2025/26",start_date:"",end_date:"",department_id:"",category:"",procurement_method:"Open Tender",estimated_budget:"",justification:"",status:"draft"});

  const load = async () => {
    setLoading(true);
    const [{data:p},{data:d}] = await Promise.all([
      (supabase as any).from("procurement_plans").select("*").order("created_at",{ascending:false}),
      (supabase as any).from("departments").select("id,name").order("name"),
    ]);
    setRows(p||[]); setDepts(d||[]);
    setLoading(false);
  };
  useEffect(()=>{ load(); },[]);

  const openEdit = (r:any) => {
    setEditing(r);
    setForm({title:r.title,description:r.description||"",financial_year:r.financial_year||"2025/26",start_date:r.start_date||"",end_date:r.end_date||"",department_id:r.department_id||"",category:r.category||"",procurement_method:r.procurement_method||"Open Tender",estimated_budget:String(r.estimated_budget||0),justification:r.justification||"",status:r.status||"draft"});
    setShowNew(true);
  };

  const save = async () => {
    if(!form.title){toast({title:"Title required",variant:"destructive"});return;}
    setSaving(true);
    const dept = depts.find(d=>d.id===form.department_id);
    const payload={...form,plan_number:editing?editing.plan_number:genNo(),department_name:dept?.name||"",estimated_budget:Number(form.estimated_budget||0),department_id:form.department_id||null,created_by:user?.id,created_by_name:profile?.full_name};
    if(editing){
      const{error}=await(supabase as any).from("procurement_plans").update(payload).eq("id",editing.id);
      if(!error){toast({title:"Plan updated ✓"});logAudit(user?.id,profile?.full_name,"update","procurement_plans",editing.id,{title:form.title});}
      else toast({title:"Error",description:error.message,variant:"destructive"});
    } else {
      const{data,error}=await(supabase as any).from("procurement_plans").insert(payload).select().single();
      if(!error){toast({title:"Plan created ✓"});logAudit(user?.id,profile?.full_name,"create","procurement_plans",data?.id,{title:form.title});}
      else toast({title:"Error",description:error.message,variant:"destructive"});
    }
    setSaving(false); setShowNew(false); setEditing(null); load();
  };

  const deleteRow = async (id:string) => {
    if(!confirm("Delete this plan?")) return;
    await(supabase as any).from("procurement_plans").delete().eq("id",id);
    toast({title:"Deleted"}); load();
  };

  const exportExcel = () => {
    const wb=XLSX.utils.book_new(); const ws=XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb,ws,"Procurement Plans");
    XLSX.writeFile(wb,`procurement_plans_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast({title:"Exported"});
  };

  const filtered = search ? rows.filter(r=>Object.values(r).some(v=>String(v||"").toLowerCase().includes(search.toLowerCase()))) : rows;
  const totalBudget = filtered.reduce((s,r)=>s+Number(r.estimated_budget||0),0);

  return (
    <div className="p-4 space-y-4" style={{fontFamily:"'Segoe UI',system-ui"}}>
      <div className="rounded-2xl px-5 py-3 flex items-center justify-between" style={{background:"linear-gradient(90deg,#0f172a,#1e40af)"}}>
        <div>
          <h1 className="text-base font-black text-white">Procurement Planning</h1>
          <p className="text-[10px] text-white/50">{rows.length} plans · Est. Budget: {fmtKES(totalBudget)}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportExcel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold" style={{background:"rgba(255,255,255,0.15)",color:"#fff"}}><Download className="w-3.5 h-3.5"/>Export</button>
          {canManage&&<button onClick={()=>{setEditing(null);setForm({title:"",description:"",financial_year:"2025/26",start_date:"",end_date:"",department_id:"",category:"",procurement_method:"Open Tender",estimated_budget:"",justification:"",status:"draft"});setShowNew(true);}} className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold" style={{background:"#fff",color:"#1e40af"}}><Plus className="w-3.5 h-3.5"/>New Plan</button>}
        </div>
      </div>
      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search plans…" className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm outline-none"/></div>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-xs">
          <thead><tr style={{background:"#0f172a"}}>
            {["Plan No.","Title","Dept.","Category","Method","Budget","FY","Status","Actions"].map(h=>(
              <th key={h} className="px-4 py-3 text-left font-bold text-white/70 text-[10px] uppercase">{h}</th>))}
          </tr></thead>
          <tbody>
            {loading?<tr><td colSpan={9} className="py-8 text-center"><RefreshCw className="w-4 h-4 animate-spin text-gray-300 mx-auto"/></td></tr>:
            filtered.length===0?<tr><td colSpan={9} className="py-8 text-center text-gray-400 text-xs">No procurement plans yet</td></tr>:
            filtered.map((r,i)=>(
              <tr key={r.id} style={{borderBottom:"1px solid #f3f4f6",background:i%2===0?"#fff":"#fafafa"}}>
                <td className="px-4 py-2.5 font-mono text-[10px]" style={{color:"#1e40af"}}>{r.plan_number}</td>
                <td className="px-4 py-2.5 font-semibold text-gray-800 max-w-[160px] truncate">{r.title}</td>
                <td className="px-4 py-2.5 text-gray-500">{r.department_name||"—"}</td>
                <td className="px-4 py-2.5 text-gray-500">{r.category||"—"}</td>
                <td className="px-4 py-2.5 text-gray-500">{r.procurement_method||"—"}</td>
                <td className="px-4 py-2.5 font-bold text-gray-700">{fmtKES(r.estimated_budget||0)}</td>
                <td className="px-4 py-2.5 text-gray-500">{r.financial_year}</td>
                <td className="px-4 py-2.5"><span className="px-2 py-0.5 rounded-full text-[9px] font-bold capitalize" style={{background:`${SC[r.status]||"#9ca3af"}20`,color:SC[r.status]||"#9ca3af"}}>{r.status}</span></td>
                <td className="px-4 py-2.5"><div className="flex gap-1.5">
                  {canManage&&<button onClick={()=>openEdit(r)} className="p-1.5 rounded-lg bg-blue-50"><Edit className="w-3 h-3 text-blue-600"/></button>}
                  {hasRole("admin")&&<button onClick={()=>deleteRow(r.id)} className="p-1.5 rounded-lg bg-red-50"><Trash2 className="w-3 h-3 text-red-500"/></button>}
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showNew&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={()=>{setShowNew(false);setEditing(null);}}/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5 overflow-y-auto max-h-[92vh] space-y-4">
            <div className="flex items-center justify-between"><h3 className="font-black text-gray-800">{editing?"Edit Plan":"New Procurement Plan"}</h3><button onClick={()=>{setShowNew(false);setEditing(null);}}><X className="w-5 h-5 text-gray-400"/></button></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className="block mb-1 text-xs font-semibold text-gray-500">Plan Title *</label>
                <input value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none"/></div>
              {[["Financial Year","financial_year"],["Start Date","start_date","date"],["End Date","end_date","date"],["Estimated Budget (KES)","estimated_budget","number"]].map(([l,k,t])=>(
                <div key={k}><label className="block mb-1 text-xs font-semibold text-gray-500">{l}</label>
                  <input type={t||"text"} value={(form as any)[k]||""} onChange={e=>setForm(p=>({...p,[k as string]:e.target.value}))} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none"/></div>
              ))}
              <div><label className="block mb-1 text-xs font-semibold text-gray-500">Department</label>
                <select value={form.department_id} onChange={e=>setForm(p=>({...p,department_id:e.target.value}))} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none">
                  <option value="">— Select —</option>{depts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                </select></div>
              <div><label className="block mb-1 text-xs font-semibold text-gray-500">Category</label>
                <select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none">
                  <option value="">— Select —</option>{CATS.map(c=><option key={c}>{c}</option>)}
                </select></div>
              <div><label className="block mb-1 text-xs font-semibold text-gray-500">Procurement Method</label>
                <select value={form.procurement_method} onChange={e=>setForm(p=>({...p,procurement_method:e.target.value}))} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none">
                  {["Open Tender","Restricted Tender","Direct Procurement","Request for Quotation","Framework Agreement"].map(m=><option key={m}>{m}</option>)}
                </select></div>
              <div><label className="block mb-1 text-xs font-semibold text-gray-500">Status</label>
                <select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none">
                  {["draft","approved","active","completed","cancelled"].map(s=><option key={s} className="capitalize">{s}</option>)}
                </select></div>
              <div className="col-span-2"><label className="block mb-1 text-xs font-semibold text-gray-500">Description</label>
                <textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} rows={2} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none resize-none"/></div>
              <div className="col-span-2"><label className="block mb-1 text-xs font-semibold text-gray-500">Justification</label>
                <textarea value={form.justification} onChange={e=>setForm(p=>({...p,justification:e.target.value}))} rows={2} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none resize-none"/></div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={()=>{setShowNew(false);setEditing(null);}} className="px-4 py-2 rounded-xl border text-sm">Cancel</button>
              <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-bold" style={{background:"#1e40af"}}>
                {saving?<RefreshCw className="w-3.5 h-3.5 animate-spin"/>:<Save className="w-3.5 h-3.5"/>}
                {saving?"Saving…":editing?"Update Plan":"Create Plan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
