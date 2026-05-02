import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import { Plus, Search, RefreshCw, Download, X, Save, Trash2, Eye, CheckCircle, XCircle, AlertTriangle, Clock } from "lucide-react";
import * as XLSX from "xlsx";

const genNo = () => `QI/EL5H/${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,"0")}/${String(Math.floor(100+Math.random()*9900))}`;
const RC: Record<string,{bg:string,color:string}> = {
  pass:        {bg:"#dcfce7",color:"#15803d"},
  fail:        {bg:"#fee2e2",color:"#dc2626"},
  conditional: {bg:"#fef3c7",color:"#92400e"},
  pending:     {bg:"#f3f4f6",color:"#6b7280"},
};

export default function InspectionsPage() {
  const { user, profile, hasRole } = useAuth();
  const canCreate = hasRole("admin")||hasRole("procurement_manager")||hasRole("procurement_officer")||hasRole("warehouse_officer");
  const [rows, setRows] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState("all");
  const [showNew, setShowNew] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({inspection_date:new Date().toISOString().slice(0,10),grn_reference:"",supplier_id:"",supplier_name:"",item_name:"",quantity_inspected:"",quantity_accepted:"",quantity_rejected:"",result:"pending",rejection_reason:"",inspector_name:profile?.full_name||"",corrective_action:"",notes:""});

  const load = async () => {
    setLoading(true);
    const [{data:i},{data:s}] = await Promise.all([
      (supabase as any).from("inspections").select("*").order("created_at",{ascending:false}),
      (supabase as any).from("suppliers").select("id,name").order("name"),
    ]);
    setRows(i||[]); setSuppliers(s||[]);
    setLoading(false);
  };
  useEffect(()=>{ load(); },[]);

  const save = async () => {
    if(!form.item_name||!form.inspection_date){toast({title:"Item name and date required",variant:"destructive"});return;}
    setSaving(true);
    const supp = suppliers.find(s=>s.id===form.supplier_id);
    const payload={...form,inspection_number:genNo(),supplier_id:form.supplier_id||null,supplier_name:supp?.name||form.supplier_name,quantity_inspected:Number(form.quantity_inspected||0),quantity_accepted:Number(form.quantity_accepted||0),quantity_rejected:Number(form.quantity_rejected||0),created_by:user?.id,created_by_name:profile?.full_name};
    const{data,error}=await(supabase as any).from("inspections").insert(payload).select().single();
    if(error){toast({title:"Error",description:error.message,variant:"destructive"});}
    else{logAudit(user?.id,profile?.full_name,"create","inspections",data?.id,{item:form.item_name});toast({title:"Inspection recorded ✓"});setShowNew(false);load();}
    setSaving(false);
  };

  const deleteRow = async (id:string) => {
    if(!confirm("Delete this inspection?")) return;
    await(supabase as any).from("inspections").delete().eq("id",id);
    toast({title:"Deleted"}); load();
  };

  const exportExcel = () => {
    const wb=XLSX.utils.book_new(); const ws=XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb,ws,"Inspections");
    XLSX.writeFile(wb,`inspections_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast({title:"Exported"});
  };

  const filtered = rows.filter(r=>{
    const ms = !search||(r.item_name||"").toLowerCase().includes(search.toLowerCase())||(r.supplier_name||"").toLowerCase().includes(search.toLowerCase())||(r.inspection_number||"").includes(search);
    const mr = resultFilter==="all"||r.result===resultFilter;
    return ms&&mr;
  });

  const stats = {pass:rows.filter(r=>r.result==="pass").length,fail:rows.filter(r=>r.result==="fail").length,pending:rows.filter(r=>r.result==="pending").length,conditional:rows.filter(r=>r.result==="conditional").length};

  const F = ({label,k,type="text"}:{label:string;k:string;type?:string}) => (
    <div><label className="block mb-1 text-xs font-semibold text-gray-500">{label}</label>
      <input type={type} value={(form as any)[k]||""} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none"/></div>
  );

  return (
    <div className="p-4 space-y-4" style={{fontFamily:"'Segoe UI',system-ui"}}>
      {/* Header */}
      <div className="rounded-2xl px-5 py-3 flex items-center justify-between" style={{background:"linear-gradient(90deg,#134e4a,#0f766e)"}}>
        <div>
          <h1 className="text-base font-black text-white">QC Inspections</h1>
          <p className="text-[10px] text-white/50">{rows.length} total · {stats.pass} passed · {stats.fail} failed · {stats.pending} pending</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportExcel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold" style={{background:"rgba(255,255,255,0.15)",color:"#fff"}}><Download className="w-3.5 h-3.5"/>Export</button>
          {canCreate&&<button onClick={()=>setShowNew(true)} className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold" style={{background:"rgba(255,255,255,0.92)",color:"#134e4a"}}><Plus className="w-3.5 h-3.5"/>New Inspection</button>}
        </div>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[{label:"Passed",count:stats.pass,icon:CheckCircle,color:"#15803d"},{label:"Failed",count:stats.fail,icon:XCircle,color:"#dc2626"},{label:"Conditional",count:stats.conditional,icon:AlertTriangle,color:"#d97706"},{label:"Pending",count:stats.pending,icon:Clock,color:"#6b7280"}].map(s=>(
          <div key={s.label} className="rounded-2xl p-3 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background:`${s.color}18`}}><s.icon className="w-4 h-4" style={{color:s.color}}/></div>
            <div><p className="text-xl font-black" style={{color:s.color}}>{s.count}</p><p className="text-[10px] text-gray-500 font-semibold">{s.label}</p></div>
          </div>
        ))}
      </div>
      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm outline-none w-52"/></div>
        <div className="flex gap-1">
          {["all","pass","fail","conditional","pending"].map(r=>(
            <button key={r} onClick={()=>setResultFilter(r)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all"
              style={{background:resultFilter===r?(RC[r]?.bg||"#1a3a6b"):"#f3f4f6",color:resultFilter===r?(RC[r]?.color||"#fff"):"#6b7280",border:resultFilter===r?`1px solid ${RC[r]?.color||"#1a3a6b"}`:"1px solid transparent"}}>
              {r}
            </button>
          ))}
        </div>
      </div>
      {/* Table */}
      <div className="rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-xs">
          <thead><tr style={{background:"#134e4a"}}>
            {["Insp. No.","Date","Item / Description","Supplier","Qty Inspected","Qty Accepted","Qty Rejected","Result","Inspector","Actions"].map(h=>(
              <th key={h} className="px-4 py-3 text-left font-bold text-white/80 text-[10px] uppercase">{h}</th>))}
          </tr></thead>
          <tbody>
            {loading?<tr><td colSpan={10} className="py-8 text-center"><RefreshCw className="w-4 h-4 animate-spin text-gray-300 mx-auto"/></td></tr>:
            filtered.length===0?<tr><td colSpan={10} className="py-8 text-center text-gray-400 text-xs">No inspections recorded</td></tr>:
            filtered.map((r,i)=>{
              const rc = RC[r.result]||RC.pending;
              return (
                <tr key={r.id} style={{borderBottom:"1px solid #f3f4f6",background:i%2===0?"#fff":"#f0fdf4"}}>
                  <td className="px-4 py-2.5 font-mono text-[10px]" style={{color:"#134e4a"}}>{r.inspection_number}</td>
                  <td className="px-4 py-2.5">{new Date(r.inspection_date).toLocaleDateString("en-KE")}</td>
                  <td className="px-4 py-2.5 font-semibold text-gray-800">{r.item_name}</td>
                  <td className="px-4 py-2.5 text-gray-500">{r.supplier_name||"—"}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{r.quantity_inspected}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-green-700">{r.quantity_accepted}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-red-600">{r.quantity_rejected}</td>
                  <td className="px-4 py-2.5"><span className="px-2 py-0.5 rounded-full text-[9px] font-bold capitalize" style={rc}>{r.result}</span></td>
                  <td className="px-4 py-2.5 text-gray-500">{r.inspector_name||"—"}</td>
                  <td className="px-4 py-2.5"><div className="flex gap-1.5">
                    <button onClick={()=>setDetail(r)} className="p-1.5 rounded-lg bg-teal-50"><Eye className="w-3 h-3 text-teal-600"/></button>
                    {hasRole("admin")&&<button onClick={()=>deleteRow(r.id)} className="p-1.5 rounded-lg bg-red-50"><Trash2 className="w-3 h-3 text-red-500"/></button>}
                  </div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* New Modal */}
      {showNew&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={()=>setShowNew(false)}/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5 overflow-y-auto max-h-[92vh] space-y-3">
            <div className="flex items-center justify-between"><h3 className="font-black text-gray-800">New QC Inspection</h3><button onClick={()=>setShowNew(false)}><X className="w-5 h-5 text-gray-400"/></button></div>
            <div className="grid grid-cols-2 gap-3">
              <F label="Inspection Date" k="inspection_date" type="date"/>
              <F label="GRN Reference" k="grn_reference"/>
              <div><label className="block mb-1 text-xs font-semibold text-gray-500">Supplier</label>
                <select value={form.supplier_id} onChange={e=>setForm(p=>({...p,supplier_id:e.target.value}))} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none">
                  <option value="">— Select —</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                </select></div>
              <F label="Item / Description *" k="item_name"/>
              <F label="Qty Inspected" k="quantity_inspected" type="number"/>
              <F label="Qty Accepted" k="quantity_accepted" type="number"/>
              <F label="Qty Rejected" k="quantity_rejected" type="number"/>
              <div><label className="block mb-1 text-xs font-semibold text-gray-500">Result</label>
                <select value={form.result} onChange={e=>setForm(p=>({...p,result:e.target.value}))} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none">
                  {["pass","fail","conditional","pending"].map(r=><option key={r} className="capitalize">{r}</option>)}
                </select></div>
              <F label="Inspector Name" k="inspector_name"/>
              <div className="col-span-2"><label className="block mb-1 text-xs font-semibold text-gray-500">Rejection Reason</label>
                <input value={form.rejection_reason} onChange={e=>setForm(p=>({...p,rejection_reason:e.target.value}))} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none"/></div>
              <div className="col-span-2"><label className="block mb-1 text-xs font-semibold text-gray-500">Corrective Action</label>
                <textarea value={form.corrective_action} onChange={e=>setForm(p=>({...p,corrective_action:e.target.value}))} rows={2} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none resize-none"/></div>
              <div className="col-span-2"><label className="block mb-1 text-xs font-semibold text-gray-500">Notes</label>
                <textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={2} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none resize-none"/></div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={()=>setShowNew(false)} className="px-4 py-2 rounded-xl border text-sm">Cancel</button>
              <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-bold" style={{background:"#134e4a"}}>
                {saving?<RefreshCw className="w-3.5 h-3.5 animate-spin"/>:<Save className="w-3.5 h-3.5"/>}
                {saving?"Saving…":"Record Inspection"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Detail */}
      {detail&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={()=>setDetail(null)}/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5">
            <div className="flex items-center justify-between mb-3"><h3 className="font-black text-gray-800">Inspection Detail</h3><button onClick={()=>setDetail(null)}><X className="w-5 h-5 text-gray-400"/></button></div>
            <div className="space-y-1.5">
              {[["Number",detail.inspection_number],["Date",new Date(detail.inspection_date).toLocaleDateString("en-KE")],["Item",detail.item_name],["Supplier",detail.supplier_name],["Qty Inspected",detail.quantity_inspected],["Qty Accepted",detail.quantity_accepted],["Qty Rejected",detail.quantity_rejected],["Result",detail.result],["Inspector",detail.inspector_name],["Rejection Reason",detail.rejection_reason],["Corrective Action",detail.corrective_action],["Notes",detail.notes]].filter(([,v])=>v!==null&&v!==undefined&&v!=="").map(([l,v])=>(
                <div key={l} className="flex justify-between py-1.5" style={{borderBottom:"1px solid #f3f4f6"}}>
                  <span className="text-xs font-semibold text-gray-500">{l}</span>
                  <span className="text-xs font-medium text-gray-800 text-right max-w-[60%]">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
