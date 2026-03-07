import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, RefreshCw, X, Save, Trash2, Edit, Tag } from "lucide-react";

export default function CategoriesPage() {
  const { user, profile, hasRole } = useAuth();
  const canManage = hasRole("admin")||hasRole("procurement_manager")||hasRole("inventory_manager");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({name:"",description:"",parent_category:""});

  const load = async () => {
    setLoading(true);
    const{data}=await(supabase as any).from("item_categories").select("*").order("name");
    setRows(data||[]); setLoading(false);
  };
  useEffect(()=>{ load(); },[]);

  const save = async () => {
    if(!form.name){toast({title:"Name required",variant:"destructive"});return;}
    setSaving(true);
    const payload={...form,created_by:user?.id};
    if(editing){
      await(supabase as any).from("item_categories").update(payload).eq("id",editing.id);
      toast({title:"Category updated ✓"});
    } else {
      await(supabase as any).from("item_categories").insert(payload);
      toast({title:"Category created ✓"});
    }
    setSaving(false); setShowNew(false); setEditing(null); load();
  };

  const deleteRow = async (id:string) => {
    if(!confirm("Delete this category?")) return;
    await(supabase as any).from("item_categories").delete().eq("id",id);
    toast({title:"Deleted"}); load();
  };

  const filtered = search ? rows.filter(r=>(r.name||"").toLowerCase().includes(search.toLowerCase())) : rows;

  return (
    <div className="p-4 space-y-4" style={{fontFamily:"'Segoe UI',system-ui"}}>
      <div className="rounded-2xl px-5 py-3 flex items-center justify-between" style={{background:"linear-gradient(90deg,#374151,#4b5563)"}}>
        <div><h1 className="text-base font-black text-white">Item Categories</h1>
          <p className="text-[10px] text-white/50">{rows.length} categories</p></div>
        {canManage&&<button onClick={()=>{setEditing(null);setForm({name:"",description:"",parent_category:""});setShowNew(true);}} className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold" style={{background:"#fff",color:"#374151"}}><Plus className="w-3.5 h-3.5"/>New Category</button>}
      </div>
      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search categories…" className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm outline-none"/></div>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-xs">
          <thead><tr style={{background:"#374151"}}>
            {["Category Name","Description","Parent Category","Actions"].map(h=><th key={h} className="px-4 py-3 text-left font-bold text-white/80 text-[10px] uppercase">{h}</th>)}
          </tr></thead>
          <tbody>
            {loading?<tr><td colSpan={4} className="py-8 text-center"><RefreshCw className="w-4 h-4 animate-spin text-gray-300 mx-auto"/></td></tr>:
            filtered.map((r,i)=>(
              <tr key={r.id} style={{borderBottom:"1px solid #f3f4f6",background:i%2===0?"#fff":"#fafafa"}}>
                <td className="px-4 py-2.5 font-semibold text-gray-800">{r.name}</td>
                <td className="px-4 py-2.5 text-gray-500">{r.description||"—"}</td>
                <td className="px-4 py-2.5 text-gray-500">{r.parent_category||"—"}</td>
                <td className="px-4 py-2.5"><div className="flex gap-1.5">
                  {canManage&&<button onClick={()=>{setEditing(r);setForm({name:r.name,description:r.description||"",parent_category:r.parent_category||""});setShowNew(true);}} className="p-1.5 rounded-lg bg-blue-50"><Edit className="w-3 h-3 text-blue-600"/></button>}
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
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-3">
            <div className="flex items-center justify-between"><h3 className="font-black text-gray-800">{editing?"Edit":"New"} Category</h3><button onClick={()=>{setShowNew(false);setEditing(null);}}><X className="w-5 h-5 text-gray-400"/></button></div>
            {[["Category Name *","name"],["Description","description"],["Parent Category","parent_category"]].map(([l,k])=>(
              <div key={k}><label className="block mb-1 text-xs font-semibold text-gray-500">{l}</label>
                <input value={(form as any)[k]||""} onChange={e=>setForm(p=>({...p,[k as string]:e.target.value}))} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none"/></div>
            ))}
            <div className="flex gap-2 justify-end pt-1">
              <button onClick={()=>{setShowNew(false);setEditing(null);}} className="px-4 py-2 rounded-xl border text-sm">Cancel</button>
              <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-bold" style={{background:"#374151"}}>
                {saving?<RefreshCw className="w-3.5 h-3.5 animate-spin"/>:<Save className="w-3.5 h-3.5"/>}{saving?"Saving…":editing?"Update":"Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
