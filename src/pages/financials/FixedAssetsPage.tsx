import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import { Plus, Search, RefreshCw, Download, X, Save, Trash2, Edit, Building2, Printer, Eye } from "lucide-react";
import * as XLSX from "xlsx";

const fmtKES = (n:number) => `KES ${Number(n||0).toLocaleString("en-KE",{minimumFractionDigits:0})}`;
const genNo = () => `AST/EL5H/${new Date().getFullYear()}/${String(Math.floor(100+Math.random()*9900))}`;
const SC: Record<string,string> = {active:"#15803d",disposed:"#dc2626",under_maintenance:"#d97706",written_off:"#6b7280"};
const CATS = ["Medical Equipment","ICT Equipment","Furniture & Fittings","Motor Vehicles","Buildings","Land","Office Equipment","Laboratory Equipment","Theatre Equipment","Radiology Equipment"];

export default function FixedAssetsPage() {
  const { user, profile, hasRole } = useAuth();
  const canManage = hasRole("admin")||hasRole("procurement_manager");
  const [rows, setRows] = useState<any[]>([]);
  const [depts, setDepts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({asset_number:"",asset_name:"",category:"",department_id:"",purchase_date:"",purchase_cost:"",useful_life:"",residual_value:"",depreciation_method:"Straight Line",location:"",serial_number:"",supplier_name:"",warranty_expiry:"",condition:"good",status:"active",description:""});

  const load = async () => {
    setLoading(true);
    const [{data:a},{data:d}] = await Promise.all([
      (supabase as any).from("fixed_assets").select("*").order("created_at",{ascending:false}),
      (supabase as any).from("departments").select("id,name").order("name"),
    ]);
    setRows(a||[]); setDepts(d||[]);
    setLoading(false);
  };
  useEffect(()=>{ load(); },[]);

  const openEdit = (a:any) => {
    setEditing(a);
    setForm({asset_number:a.asset_number,asset_name:a.asset_name,category:a.category||"",department_id:a.department_id||"",purchase_date:a.purchase_date||"",purchase_cost:String(a.purchase_cost||0),useful_life:String(a.useful_life||0),residual_value:String(a.residual_value||0),depreciation_method:a.depreciation_method||"Straight Line",location:a.location||"",serial_number:a.serial_number||"",supplier_name:a.supplier_name||"",warranty_expiry:a.warranty_expiry||"",condition:a.condition||"good",status:a.status||"active",description:a.description||""});
    setShowNew(true);
  };

  const calcDepreciation = () => {
    const cost = Number(form.purchase_cost||0);
    const residual = Number(form.residual_value||0);
    const life = Number(form.useful_life||1);
    const annual = (cost-residual)/Math.max(life,1);
    const yearsSince = form.purchase_date ? (new Date().getFullYear()-new Date(form.purchase_date).getFullYear()) : 0;
    const accumulated = Math.min(annual*yearsSince, cost-residual);
    return { annual, accumulated, nbv: cost-accumulated };
  };

  const save = async () => {
    if(!form.asset_name||!form.category){toast({title:"Asset name and category required",variant:"destructive"});return;}
    setSaving(true);
    const {annual,accumulated,nbv} = calcDepreciation();
    const dept = depts.find(d=>d.id===form.department_id);
    const payload={...form,asset_number:editing?editing.asset_number:genNo(),department_id:form.department_id||null,department_name:dept?.name||"",purchase_cost:Number(form.purchase_cost||0),useful_life:Number(form.useful_life||0),residual_value:Number(form.residual_value||0),annual_depreciation:annual,accumulated_depreciation:accumulated,net_book_value:nbv,created_by:user?.id,created_by_name:profile?.full_name};
    if(editing){
      const{error}=await(supabase as any).from("fixed_assets").update(payload).eq("id",editing.id);
      if(!error){logAudit(user?.id,profile?.full_name,"update","fixed_assets",editing.id,{name:form.asset_name});toast({title:"Asset updated ✓"});}
      else toast({title:"Error",description:error.message,variant:"destructive"});
    } else {
      const{data,error}=await(supabase as any).from("fixed_assets").insert(payload).select().single();
      if(!error){logAudit(user?.id,profile?.full_name,"create","fixed_assets",data?.id,{name:form.asset_name});toast({title:"Asset registered ✓"});}
      else toast({title:"Error",description:error.message,variant:"destructive"});
    }
    setSaving(false); setShowNew(false); setEditing(null); load();
  };

  const deleteRow = async (id:string) => {
    if(!confirm("Delete this asset?")) return;
    await(supabase as any).from("fixed_assets").delete().eq("id",id);
    toast({title:"Deleted"}); load();
  };

  const exportExcel = () => {
    const wb=XLSX.utils.book_new(); const ws=XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb,ws,"Fixed Assets");
    XLSX.writeFile(wb,`fixed_assets_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast({title:"Exported"});
  };

  const filtered = rows.filter(r=>{
    const ms = !search||(r.asset_name||"").toLowerCase().includes(search.toLowerCase())||(r.asset_number||"").includes(search);
    const mc = catFilter==="all"||(r.category||"")=== catFilter;
    return ms&&mc;
  });
  const totalCost = filtered.reduce((s,r)=>s+Number(r.purchase_cost||0),0);
  const totalNBV = filtered.reduce((s,r)=>s+Number(r.net_book_value||0),0);

  const F = ({label,k,type="text",span=1,req=false}:{label:string;k:string;type?:string;span?:number;req?:boolean}) => (
    <div className={`col-span-${span}`}>
      <label className="block mb-1 text-xs font-semibold text-gray-500">{label}{req&&" *"}</label>
      <input type={type} value={(form as any)[k]||""} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))}
        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"/>
    </div>
  );

  return (
    <div className="p-4 space-y-4" style={{fontFamily:"'Segoe UI',system-ui"}}>
      {/* Header */}
      <div className="rounded-2xl px-5 py-3 flex items-center justify-between" style={{background:"linear-gradient(90deg,#1a3a6b,#0369a1)"}}>
        <div>
          <h1 className="text-base font-black text-white">Fixed Assets Register</h1>
          <p className="text-[10px] text-white/50">{rows.length} assets · Cost: {fmtKES(totalCost)} · NBV: {fmtKES(totalNBV)}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportExcel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold" style={{background:"rgba(255,255,255,0.15)",color:"#fff"}}><Download className="w-3.5 h-3.5"/>Export</button>
          {canManage&&<button onClick={()=>{setEditing(null);setForm({asset_number:"",asset_name:"",category:"",department_id:"",purchase_date:"",purchase_cost:"",useful_life:"",residual_value:"",depreciation_method:"Straight Line",location:"",serial_number:"",supplier_name:"",warranty_expiry:"",condition:"good",status:"active",description:""});setShowNew(true);}} className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold" style={{background:"#fff",color:"#1a3a6b"}}><Plus className="w-3.5 h-3.5"/>Register Asset</button>}
        </div>
      </div>
      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search assets…" className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm outline-none w-52"/></div>
        <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none">
          <option value="all">All Categories</option>
          {CATS.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-xs">
          <thead><tr style={{background:"#1a3a6b"}}>
            {["Asset No.","Name","Category","Department","Purchase Cost","NBV","Status","Condition","Actions"].map(h=>(
              <th key={h} className="px-4 py-3 text-left font-bold text-white/80 text-[10px] uppercase">{h}</th>))}
          </tr></thead>
          <tbody>
            {loading?<tr><td colSpan={9} className="py-8 text-center"><RefreshCw className="w-4 h-4 animate-spin text-gray-300 mx-auto"/></td></tr>:
            filtered.length===0?<tr><td colSpan={9} className="py-8 text-center text-gray-400 text-xs">No fixed assets registered yet</td></tr>:
            filtered.map((r,i)=>(
              <tr key={r.id} style={{borderBottom:"1px solid #f3f4f6",background:i%2===0?"#fff":"#f8faff"}}>
                <td className="px-4 py-2.5 font-mono text-[10px]" style={{color:"#1a3a6b"}}>{r.asset_number}</td>
                <td className="px-4 py-2.5 font-semibold text-gray-800">{r.asset_name}</td>
                <td className="px-4 py-2.5 text-gray-500">{r.category}</td>
                <td className="px-4 py-2.5 text-gray-500">{r.department_name||"—"}</td>
                <td className="px-4 py-2.5 font-bold text-gray-700">{fmtKES(r.purchase_cost||0)}</td>
                <td className="px-4 py-2.5 font-bold" style={{color:Number(r.net_book_value||0)>0?"#15803d":"#9ca3af"}}>{fmtKES(r.net_book_value||0)}</td>
                <td className="px-4 py-2.5"><span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{background:`${SC[r.status]||"#9ca3af"}20`,color:SC[r.status]||"#9ca3af"}}>{r.status?.replace(/_/g," ")}</span></td>
                <td className="px-4 py-2.5 capitalize text-gray-600">{r.condition||"—"}</td>
                <td className="px-4 py-2.5"><div className="flex gap-1.5">
                  <button onClick={()=>setDetail(r)} className="p-1.5 rounded-lg bg-blue-50"><Eye className="w-3 h-3 text-blue-600"/></button>
                  {canManage&&<button onClick={()=>openEdit(r)} className="p-1.5 rounded-lg bg-amber-50"><Edit className="w-3 h-3 text-amber-600"/></button>}
                  {hasRole("admin")&&<button onClick={()=>deleteRow(r.id)} className="p-1.5 rounded-lg bg-red-50"><Trash2 className="w-3 h-3 text-red-500"/></button>}
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* New/Edit Modal */}
      {showNew&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={()=>{setShowNew(false);setEditing(null);}}/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-5 overflow-y-auto max-h-[92vh] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-gray-800">{editing?"Edit Asset":"Register Fixed Asset"}</h3>
              <button onClick={()=>{setShowNew(false);setEditing(null);}}><X className="w-5 h-5 text-gray-400"/></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <F label="Asset Name *" k="asset_name" span={2} req/>
              <div><label className="block mb-1 text-xs font-semibold text-gray-500">Category *</label>
                <select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none">
                  <option value="">— Select —</option>{CATS.map(c=><option key={c}>{c}</option>)}
                </select></div>
              <div><label className="block mb-1 text-xs font-semibold text-gray-500">Department</label>
                <select value={form.department_id} onChange={e=>setForm(p=>({...p,department_id:e.target.value}))} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none">
                  <option value="">— Select —</option>{depts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                </select></div>
              <F label="Purchase Date" k="purchase_date" type="date"/>
              <F label="Purchase Cost (KES)" k="purchase_cost" type="number"/>
              <F label="Useful Life (years)" k="useful_life" type="number"/>
              <F label="Residual Value (KES)" k="residual_value" type="number"/>
              <div><label className="block mb-1 text-xs font-semibold text-gray-500">Depreciation Method</label>
                <select value={form.depreciation_method} onChange={e=>setForm(p=>({...p,depreciation_method:e.target.value}))} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none">
                  {["Straight Line","Reducing Balance","Sum of Years"].map(m=><option key={m}>{m}</option>)}
                </select></div>
              <F label="Location" k="location"/>
              <F label="Serial Number" k="serial_number"/>
              <F label="Supplier Name" k="supplier_name"/>
              <F label="Warranty Expiry" k="warranty_expiry" type="date"/>
              <div><label className="block mb-1 text-xs font-semibold text-gray-500">Condition</label>
                <select value={form.condition} onChange={e=>setForm(p=>({...p,condition:e.target.value}))} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none">
                  {["excellent","good","fair","poor"].map(c=><option key={c} className="capitalize">{c}</option>)}
                </select></div>
              <div><label className="block mb-1 text-xs font-semibold text-gray-500">Status</label>
                <select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none">
                  {["active","under_maintenance","disposed","written_off"].map(s=><option key={s} value={s}>{s.replace(/_/g," ")}</option>)}
                </select></div>
              {form.purchase_cost&&form.useful_life&&(
                <div className="col-span-2 p-3 rounded-xl" style={{background:"#f0fdf4",border:"1px solid #bbf7d0"}}>
                  <p className="text-xs font-bold text-green-800 mb-1">Depreciation Preview</p>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    {[["Annual Dep.",fmtKES(calcDepreciation().annual)],["Accumulated",fmtKES(calcDepreciation().accumulated)],["Net Book Value",fmtKES(calcDepreciation().nbv)]].map(([l,v])=>(
                      <div key={l}><p className="text-gray-500">{l}</p><p className="font-bold text-gray-800">{v}</p></div>
                    ))}
                  </div>
                </div>
              )}
              <div className="col-span-2"><label className="block mb-1 text-xs font-semibold text-gray-500">Description</label>
                <textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} rows={2} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none resize-none"/></div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={()=>{setShowNew(false);setEditing(null);}} className="px-4 py-2 rounded-xl border text-sm">Cancel</button>
              <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-bold" style={{background:"#1a3a6b"}}>
                {saving?<RefreshCw className="w-3.5 h-3.5 animate-spin"/>:<Save className="w-3.5 h-3.5"/>}
                {saving?"Saving…":editing?"Update Asset":"Register Asset"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Detail view */}
      {detail&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={()=>setDetail(null)}/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-gray-800">{detail.asset_name}</h3>
              <div className="flex gap-2"><button onClick={()=>setDetail(null)}><X className="w-5 h-5 text-gray-400"/></button></div>
            </div>
            <div className="space-y-1.5">
              {[["Asset No.",detail.asset_number],["Category",detail.category],["Department",detail.department_name],["Purchase Cost",fmtKES(detail.purchase_cost||0)],["Net Book Value",fmtKES(detail.net_book_value||0)],["Annual Depreciation",fmtKES(detail.annual_depreciation||0)],["Useful Life",`${detail.useful_life||0} years`],["Residual Value",fmtKES(detail.residual_value||0)],["Location",detail.location],["Serial No.",detail.serial_number],["Supplier",detail.supplier_name],["Warranty Expires",detail.warranty_expiry],["Condition",detail.condition],["Status",detail.status?.replace(/_/g," ")],["Registered By",detail.created_by_name]].filter(([,v])=>v).map(([l,v])=>(
                <div key={l} className="flex justify-between py-1.5" style={{borderBottom:"1px solid #f3f4f6"}}>
                  <span className="text-xs font-semibold text-gray-500">{l}</span>
                  <span className="text-xs font-medium text-gray-800 text-right">{v}</span>
                </div>
              ))}
            </div>
            {canManage&&<button onClick={()=>{setDetail(null);openEdit(detail);}} className="mt-4 w-full py-2 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2" style={{background:"#1a3a6b"}}><Edit className="w-3.5 h-3.5"/>Edit Asset</button>}
          </div>
        </div>
      )}
    </div>
  );
}
