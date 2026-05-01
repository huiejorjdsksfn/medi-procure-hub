import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, RefreshCw, Download, X, Save, Trash2, Edit, BookOpen, TrendingUp, TrendingDown } from "lucide-react";
import * as XLSX from "xlsx";

const fmtKES = (n:number) => `KES ${Number(n||0).toLocaleString("en-KE",{minimumFractionDigits:2})}`;
const TYPE_COLORS: Record<string,string> = {Asset:"#0369a1",Liability:"#dc2626",Equity:"#7c3aed",Revenue:"#15803d",Expense:"#d97706"};

export default function ChartOfAccountsPage() {
  const { user, profile, hasRole } = useAuth();
  const canManage = hasRole("admin")||hasRole("procurement_manager");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({account_code:"",account_name:"",account_type:"Asset",category:"",parent_code:"",balance:"0",description:"",is_active:true});

  const load = async () => {
    setLoading(true);
    const{data}=await(supabase as any).from("chart_of_accounts").select("*").order("account_code");
    setRows(data||[]); setLoading(false);
  };
  useEffect(()=>{ load(); },[]);

  const openEdit = (r:any) => {
    setEditing(r);
    setForm({account_code:r.account_code,account_name:r.account_name,account_type:r.account_type,category:r.category||"",parent_code:r.parent_code||"",balance:String(r.balance||0),description:r.description||"",is_active:r.is_active!==false});
    setShowNew(true);
  };

  const save = async () => {
    if(!form.account_code||!form.account_name){toast({title:"Code and name required",variant:"destructive"});return;}
    setSaving(true);
    const payload={...form,balance:Number(form.balance)||0};
    if(editing){
      const{error}=await(supabase as any).from("chart_of_accounts").update(payload).eq("id",editing.id);
      if(error){toast({title:"Error",description:error.message,variant:"destructive"});}
      else{toast({title:"Account updated ✓"});}
    } else {
      const{error}=await(supabase as any).from("chart_of_accounts").insert(payload);
      if(error){toast({title:"Error",description:error.message,variant:"destructive"});}
      else{toast({title:"Account created ✓"});}
    }
    setSaving(false); setShowNew(false); setEditing(null); load();
  };

  const deleteRow = async (id:string) => {
    if(!confirm("Delete this account?")) return;
    await(supabase as any).from("chart_of_accounts").delete().eq("id",id);
    toast({title:"Deleted"}); load();
  };

  const exportExcel = () => {
    const wb=XLSX.utils.book_new(); const ws=XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb,ws,"Chart of Accounts");
    XLSX.writeFile(wb,`coa_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast({title:"Exported"});
  };

  const filtered = rows.filter(r=>{
    const ms = !search || r.account_code.includes(search)||r.account_name.toLowerCase().includes(search.toLowerCase());
    const mt = typeFilter==="all"||r.account_type===typeFilter;
    return ms&&mt;
  });

  const TYPES = ["all","Asset","Liability","Equity","Revenue","Expense"];
  const totalBalance = filtered.reduce((s,r)=>s+Number(r.balance||0),0);

  return (
    <div className="p-4 space-y-4" style={{fontFamily:"'Segoe UI',system-ui"}}>
      <div className="rounded-2xl px-5 py-3 flex items-center justify-between" style={{background:"linear-gradient(90deg,#0f172a,#1e3a5f)"}}>
        <div>
          <h1 className="text-base font-black text-white">Chart of Accounts</h1>
          <p className="text-[10px] text-white/50">{rows.length} accounts · Balance: {fmtKES(totalBalance)}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportExcel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold" style={{background:"rgba(255,255,255,0.15)",color:"#fff"}}><Download className="w-3.5 h-3.5"/>Export</button>
          {canManage&&<button onClick={()=>{setEditing(null);setForm({account_code:"",account_name:"",account_type:"Asset",category:"",parent_code:"",balance:"0",description:"",is_active:true});setShowNew(true);}} className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold" style={{background:"rgba(255,255,255,0.92)",color:"#1e3a5f"}}><Plus className="w-3.5 h-3.5"/>New Account</button>}
        </div>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search code or name…" className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm outline-none w-52"/></div>
        <div className="flex gap-1">
          {TYPES.map(t=>(
            <button key={t} onClick={()=>setTypeFilter(t)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all"
              style={{background:typeFilter===t?(TYPE_COLORS[t]||"#1a3a6b"):"#f3f4f6",color:typeFilter===t?"#fff":"#6b7280"}}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-xs">
          <thead><tr style={{background:"#0f172a"}}>
            {["Code","Account Name","Type","Category","Parent","Balance","Active","Actions"].map(h=>(
              <th key={h} className="px-4 py-3 text-left font-bold text-white/70 text-[10px] uppercase">{h}</th>))}
          </tr></thead>
          <tbody>
            {loading?<tr><td colSpan={8} className="py-8 text-center"><RefreshCw className="w-4 h-4 animate-spin text-gray-300 mx-auto"/></td></tr>:
            filtered.length===0?<tr><td colSpan={8} className="py-8 text-center text-gray-400 text-xs">No accounts found</td></tr>:
            filtered.map((r,i)=>(
              <tr key={r.id} style={{borderBottom:"1px solid #f3f4f6",background:i%2===0?"#fff":"#fafafa"}}>
                <td className="px-4 py-2.5 font-mono font-bold" style={{color:"#1e3a5f"}}>{r.account_code}</td>
                <td className="px-4 py-2.5 font-semibold text-gray-800">{r.account_name}</td>
                <td className="px-4 py-2.5"><span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{background:`${TYPE_COLORS[r.account_type]||"#6b7280"}18`,color:TYPE_COLORS[r.account_type]||"#6b7280"}}>{r.account_type}</span></td>
                <td className="px-4 py-2.5 text-gray-500">{r.category||"—"}</td>
                <td className="px-4 py-2.5 text-gray-400 font-mono text-[10px]">{r.parent_code||"—"}</td>
                <td className="px-4 py-2.5 font-bold" style={{color:Number(r.balance||0)<0?"#dc2626":"#15803d"}}>{fmtKES(r.balance||0)}</td>
                <td className="px-4 py-2.5"><span className="text-[10px] font-bold" style={{color:r.is_active!==false?"#15803d":"#9ca3af"}}>{r.is_active!==false?"Active":"Inactive"}</span></td>
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
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-gray-800">{editing?"Edit Account":"New Account"}</h3>
              <button onClick={()=>{setShowNew(false);setEditing(null);}}><X className="w-5 h-5 text-gray-400"/></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[["Account Code *","account_code","",1],["Account Name *","account_name","",2],["Category","category","",1],["Parent Code","parent_code","",1],["Opening Balance","balance","number",1]].map(([l,k,t,span])=>(
                <div key={k} className={`col-span-${span}`}>
                  <label className="block mb-1 text-xs font-semibold text-gray-500">{l}</label>
                  <input type={t||"text"} value={(form as any)[k]||""} onChange={e=>setForm(p=>({...p,[k as string]:e.target.value}))} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none"/>
                </div>
              ))}
              <div><label className="block mb-1 text-xs font-semibold text-gray-500">Account Type</label>
                <select value={form.account_type} onChange={e=>setForm(p=>({...p,account_type:e.target.value}))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none">
                  {["Asset","Liability","Equity","Revenue","Expense"].map(t=><option key={t}>{t}</option>)}
                </select></div>
              <div className="flex items-center gap-2 pt-4">
                <input type="checkbox" id="isActive" checked={form.is_active} onChange={e=>setForm(p=>({...p,is_active:e.target.checked}))} style={{accentColor:"#0369a1",width:16,height:16}}/>
                <label htmlFor="isActive" className="text-sm font-semibold text-gray-700 cursor-pointer">Active</label>
              </div>
              <div className="col-span-2"><label className="block mb-1 text-xs font-semibold text-gray-500">Description</label>
                <textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} rows={2} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none resize-none"/></div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={()=>{setShowNew(false);setEditing(null);}} className="px-4 py-2 rounded-xl border text-sm">Cancel</button>
              <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-bold" style={{background:"#1e3a5f"}}>
                {saving?<RefreshCw className="w-3.5 h-3.5 animate-spin"/>:<Save className="w-3.5 h-3.5"/>}
                {saving?"Saving…":editing?"Update":"Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
