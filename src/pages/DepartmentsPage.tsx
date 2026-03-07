import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, RefreshCw, X, Save, Trash2, Edit, Building2, Download } from "lucide-react";
import * as XLSX from "xlsx";

export default function DepartmentsPage() {
  const { user, profile, hasRole } = useAuth();
  const canManage = hasRole("admin");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({name:"",code:"",description:"",head_of_department:"",phone:"",email:"",budget_center:""});

  const load = async () => {
    setLoading(true);
    const{data}=await(supabase as any).from("departments").select("*").order("name");
    setRows(data||[]); setLoading(false);
  };
  useEffect(()=>{ load(); },[]);

  const save = async () => {
    if(!form.name){toast({title:"Department name required",variant:"destructive"});return;}
    setSaving(true);
    if(editing){
      await(supabase as any).from("departments").update(form).eq("id",editing.id);
      toast({title:"Department updated ✓"});
    } else {
      await(supabase as any).from("departments").insert({...form,created_by:user?.id});
      toast({title:"Department created ✓"});
    }
    setSaving(false); setShowNew(false); setEditing(null); load();
  };

  const deleteRow = async (id:string) => {
    if(!confirm("Delete this department?")) return;
    await(supabase as any).from("departments").delete().eq("id",id);
    toast({title:"Deleted"}); load();
  };

  const exportExcel = () => {
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),"Departments");
    XLSX.writeFile(wb,`departments_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast({title:"Exported"});
  };

  const filtered = search ? rows.filter(r=>(r.name||"").toLowerCase().includes(search.toLowerCase())||(r.code||"").toLowerCase().includes(search.toLowerCase())) : rows;

  return (
    <div className="p-4 space-y-4" style={{fontFamily:"'Segoe UI',system-ui"}}>
      <div className="rounded-2xl px-5 py-3 flex items-center justify-between" style={{background:"linear-gradient(90deg,#4338ca,#6366f1)"}}>
        <div><h1 className="text-base font-black text-white">Departments</h1>
          <p className="text-[10px] text-white/50">{rows.length} departments</p></div>
        <div className="flex gap-2">
          <button onClick={exportExcel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold" style={{background:"rgba(255,255,255,0.15)",color:"#fff"}}><Download className="w-3.5 h-3.5"/>Export</button>
          {canManage&&<button onClick={()=>{setEditing(null);setForm({name:"",code:"",description:"",head_of_department:"",phone:"",email:"",budget_center:""});setShowNew(true);}} className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold" style={{background:"#fff",color:"#4338ca"}}><Plus className="w-3.5 h-3.5"/>New Dept.</button>}
        </div>
      </div>
      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search departments…" className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm outline-none"/></div>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-xs">
          <thead><tr style={{background:"#4338ca"}}>
            {["Code","Department Name","Head of Dept.","Phone","Email","Budget Center","Actions"].map(h=><th key={h} className="px-4 py-3 text-left font-bold text-white/80 text-[10px] uppercase">{h}</th>)}
          </tr></thead>
          <tbody>
            {loading?<tr><td colSpan={7} className="py-8 text-center"><RefreshCw className="w-4 h-4 animate-spin text-gray-300 mx-auto"/></td></tr>:
            filtered.map((r,i)=>(
              <tr key={r.id} style={{borderBottom:"1px solid #f3f4f6",background:i%2===0?"#fff":"#f5f3ff"}}>
                <td className="px-4 py-2.5 font-mono text-[10px] text-gray-500">{r.code||"—"}</td>
                <td className="px-4 py-2.5 font-semibold text-gray-800">{r.name}</td>
                <td className="px-4 py-2.5 text-gray-600">{r.head_of_department||"—"}</td>
                <td className="px-4 py-2.5 text-gray-500">{r.phone||"—"}</td>
                <td className="px-4 py-2.5 text-gray-500">{r.email||"—"}</td>
                <td className="px-4 py-2.5 text-gray-500">{r.budget_center||"—"}</td>
                <td className="px-4 py-2.5"><div className="flex gap-1.5">
                  {canManage&&<button onClick={()=>{setEditing(r);setForm({name:r.name,code:r.code||"",description:r.description||"",head_of_department:r.head_of_department||"",phone:r.phone||"",email:r.email||"",budget_center:r.budget_center||""});setShowNew(true);}} className="p-1.5 rounded-lg bg-indigo-50"><Edit className="w-3 h-3 text-indigo-600"/></button>}
                  {hasRole("admin")&&<button onClick={()=>deleteRow(r.id)} className="p-1.5 rounded-lg bg-red-50"><Trash2 className="w-3 h-3 text-red-500"/></button>}
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showNew&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={()=>{setShowNew(false);setEditing(null);}}/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-3">
            <div className="flex items-center justify-between"><h3 className="font-black text-gray-800">{editing?"Edit":"New"} Department</h3><button onClick={()=>{setShowNew(false);setEditing(null);}}><X className="w-5 h-5 text-gray-400"/></button></div>
            <div className="grid grid-cols-2 gap-3">
              {[["Department Name *","name",2],["Code","code",1],["Budget Center","budget_center",1],["Head of Department","head_of_department",2],["Phone","phone",1],["Email","email",1],["Description","description",2]].map(([l,k,span])=>(
                <div key={k} className={`col-span-${span}`}>
                  <label className="block mb-1 text-xs font-semibold text-gray-500">{l}</label>
                  <input value={(form as any)[k]||""} onChange={e=>setForm(p=>({...p,[k as string]:e.target.value}))} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none"/>
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button onClick={()=>{setShowNew(false);setEditing(null);}} className="px-4 py-2 rounded-xl border text-sm">Cancel</button>
              <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-bold" style={{background:"#4338ca"}}>
                {saving?<RefreshCw className="w-3.5 h-3.5 animate-spin"/>:<Save className="w-3.5 h-3.5"/>}{saving?"Saving…":editing?"Update":"Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
