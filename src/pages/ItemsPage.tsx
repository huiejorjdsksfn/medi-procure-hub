import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import { Package, Search, X, RefreshCw, FileSpreadsheet, Printer, Eye, Plus, Edit, AlertTriangle } from "lucide-react";
import * as XLSX from "xlsx";

const TYPES = ["pharmaceutical","medical_equipment","consumable","reagent","laboratory","surgical","general","other"];
const STATUS_CFG: Record<string,{bg:string;color:string}> = {
  active:      {bg:"#dcfce7",color:"#15803d"},
  inactive:    {bg:"#fee2e2",color:"#dc2626"},
  discontinued:{bg:"#f3f4f6",color:"#6b7280"},
};

export default function ItemsPage() {
  const { user, profile, roles } = useAuth();
  const canEdit = roles.includes("admin")||roles.includes("inventory_manager")||roles.includes("procurement_manager");
  const [items, setItems] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [lowOnly, setLowOnly] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({name:"",sku:"",item_type:"pharmaceutical",category_id:"",unit_price:"",quantity_in_stock:"",reorder_level:"10",unit_of_measure:"",description:"",status:"active"});
  const [saving, setSaving] = useState(false);
  const [hospitalName, setHospitalName] = useState("Embu Level 5 Hospital");
  const [sysName, setSysName] = useState("EL5 MediProcure");

  useEffect(()=>{
    (supabase as any).from("system_settings").select("key,value").in("key",["system_name","hospital_name"])
      .then(({data}:any)=>{ if(!data) return; const m:any={}; data.forEach((r:any)=>{ if(r.key) m[r.key]=r.value; }); if(m.system_name) setSysName(m.system_name); if(m.hospital_name) setHospitalName(m.hospital_name); });
    supabase.from("item_categories").select("*").then(({data})=>setCats(data||[]));
  },[]);

  const load = useCallback(async()=>{
    setLoading(true);
    const {data}=await supabase.from("items").select("*,item_categories(name)").order("name");
    setItems(data||[]);
    setLoading(false);
  },[]);

  useEffect(()=>{ load(); },[load]);
  useEffect(()=>{
    const ch=supabase.channel("items-rt").on("postgres_changes",{event:"*",schema:"public",table:"items"},()=>load()).subscribe();
    return ()=>{supabase.removeChannel(ch);};
  },[load]);

  const openEdit=(it:any)=>{
    setEditing(it);
    setForm({name:it.name||"",sku:it.sku||"",item_type:it.item_type||"pharmaceutical",category_id:it.category_id||"",unit_price:String(it.unit_price||""),quantity_in_stock:String(it.quantity_in_stock||""),reorder_level:String(it.reorder_level||10),unit_of_measure:it.unit_of_measure||"",description:it.description||"",status:it.status||"active"});
    setShowForm(true);
  };
  const openCreate=()=>{ setEditing(null); setForm({name:"",sku:"",item_type:"pharmaceutical",category_id:"",unit_price:"",quantity_in_stock:"",reorder_level:"10",unit_of_measure:"",description:"",status:"active"}); setShowForm(true); };

  const save=async()=>{
    if(!form.name.trim()){toast({title:"Name required",variant:"destructive"});return;}
    setSaving(true);
    const payload={...form,unit_price:Number(form.unit_price)||0,quantity_in_stock:Number(form.quantity_in_stock)||0,reorder_level:Number(form.reorder_level)||10,category_id:form.category_id||null};
    try{
      if(editing){
        const{error}=await supabase.from("items").update(payload).eq("id",editing.id);
        if(error)throw error;
        logAudit(user?.id,profile?.full_name,"update","items",editing.id,{name:form.name});
        toast({title:"Item updated"});
      }else{
        const{data,error}=await supabase.from("items").insert(payload).select().single();
        if(error)throw error;
        logAudit(user?.id,profile?.full_name,"create","items",data?.id,{name:form.name});
        toast({title:"Item created",description:form.name});
      }
      setShowForm(false);load();
    }catch(e:any){toast({title:"Error",description:e.message,variant:"destructive"});}
    setSaving(false);
  };

  const exportExcel=()=>{
    const wb=XLSX.utils.book_new();
    const header=[[hospitalName],[sysName+" — Items Register"],[`Generated: ${new Date().toLocaleString("en-KE")}`],[]];
    const rows=filtered.map(it=>({Name:it.name,SKU:it.sku,Type:it.item_type,Category:it.item_categories?.name||"",UoM:it.unit_of_measure,"Unit Price":it.unit_price,"Qty in Stock":it.quantity_in_stock,"Reorder Level":it.reorder_level,Status:it.status,"Stock Value":Number(it.unit_price||0)*Number(it.quantity_in_stock||0)}));
    const ws=XLSX.utils.aoa_to_sheet([...header,...[Object.keys(rows[0]||{})],...rows.map(r=>Object.values(r))]);
    ws["!cols"]=Object.keys(rows[0]||{}).map(()=>({wch:16}));
    XLSX.utils.book_append_sheet(wb,ws,"Items");
    XLSX.writeFile(wb,`Items_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast({title:"Exported",description:`${filtered.length} items`});
  };

  const filtered=items.filter(it=>{
    if(typeFilter!=="all"&&it.item_type!==typeFilter) return false;
    if(statusFilter!=="all"&&it.status!==statusFilter) return false;
    if(lowOnly&&Number(it.quantity_in_stock)>Number(it.reorder_level||10)) return false;
    if(search){const q=search.toLowerCase();return (it.name||"").toLowerCase().includes(q)||(it.sku||"").toLowerCase().includes(q);}
    return true;
  });

  const totalValue=filtered.reduce((s,it)=>s+Number(it.unit_price||0)*Number(it.quantity_in_stock||0),0);
  const lowStockCount=items.filter(it=>Number(it.quantity_in_stock)<=Number(it.reorder_level||10)).length;

  const F=({label,k,type="text",opts}:{label:string;k:string;type?:string;opts?:string[]})=>(
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">{label}</label>
      {opts?(
        <select value={(form as any)[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))}
          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500 capitalize">
          {opts.map(o=><option key={o} value={o}>{o.replace(/_/g," ")}</option>)}
        </select>
      ):(
        <input type={type} value={(form as any)[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))}
          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500"/>
      )}
    </div>
  );

  return (
    <div className="p-4 space-y-3" style={{fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      {/* Header */}
      <div className="rounded-2xl px-5 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
        style={{background:"linear-gradient(90deg,#1a3d12,#375623,#4d7c30)",boxShadow:"0 4px 16px rgba(55,86,35,0.35)"}}>
        <div className="flex items-center gap-3">
          <Package className="w-5 h-5 text-white"/>
          <div>
            <h1 className="text-base font-black text-white">Items & Inventory</h1>
            <p className="text-[10px] text-white/50">{filtered.length} items · Value: KES {totalValue.toLocaleString()} · {lowStockCount} low stock</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={load} disabled={loading} className="p-2 rounded-lg bg-white/15 text-white hover:bg-white/25">
            <RefreshCw className={`w-3.5 h-3.5 ${loading?"animate-spin":""}`}/>
          </button>
          <button onClick={exportExcel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/80 text-white text-xs font-semibold hover:bg-green-500">
            <FileSpreadsheet className="w-3.5 h-3.5"/>Export
          </button>
          {canEdit&&(
            <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-green-900 text-xs font-bold hover:bg-green-50">
              <Plus className="w-3.5 h-3.5"/>Add Item
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl px-4 py-3 flex flex-wrap gap-3 items-center shadow-sm">
        <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs outline-none capitalize">
          <option value="all">All Types</option>
          {TYPES.map(t=><option key={t} value={t}>{t.replace(/_/g," ")}</option>)}
        </select>
        <div className="flex gap-1">
          {["all","active","inactive"].map(s=>(
            <button key={s} onClick={()=>setStatusFilter(s)}
              className="px-2.5 py-1 rounded-full text-[10px] font-semibold capitalize transition-all"
              style={{background:statusFilter===s?"#375623":"#f3f4f6",color:statusFilter===s?"#fff":"#6b7280"}}>
              {s}
            </button>
          ))}
        </div>
        <button onClick={()=>setLowOnly(v=>!v)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all"
          style={{background:lowOnly?"#ef4444":"#f3f4f6",color:lowOnly?"#fff":"#6b7280"}}>
          <AlertTriangle className="w-3 h-3"/>Low Stock{lowStockCount>0&&` (${lowStockCount})`}
        </button>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search items…"
            className="w-full pl-8 pr-8 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-green-400"/>
          {search&&<button onClick={()=>setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-3 h-3 text-gray-400"/></button>}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" style={{fontSize:12}}>
            <thead>
              <tr style={{background:"#1a3d12"}}>
                {["#","Name","SKU","Type","Category","UoM","Unit Price","Qty in Stock","Reorder Lvl","Status","Stock Value","Actions"].map(h=>(
                  <th key={h} className="text-left px-3 py-2.5 text-white/70 font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading?(
                Array(6).fill(0).map((_,i)=>(
                  <tr key={i}><td colSpan={12} className="px-4 py-3 animate-pulse"><div className="h-3 bg-gray-200 rounded w-full"/></td></tr>
                ))
              ):filtered.length===0?(
                <tr><td colSpan={12} className="px-4 py-10 text-center text-gray-400">No items found</td></tr>
              ):filtered.map((it,i)=>{
                const isLow=Number(it.quantity_in_stock)<=Number(it.reorder_level||10);
                const s=STATUS_CFG[it.status]||{bg:"#f3f4f6",color:"#6b7280"};
                return (
                  <tr key={it.id} className="border-b border-gray-50 hover:bg-green-50/20 transition-colors group">
                    <td className="px-3 py-2.5 text-gray-400">{i+1}</td>
                    <td className="px-3 py-2.5 font-semibold text-gray-800">{it.name}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-gray-500">{it.sku||"—"}</td>
                    <td className="px-3 py-2.5 text-gray-600 capitalize">{(it.item_type||"").replace(/_/g," ")}</td>
                    <td className="px-3 py-2.5 text-gray-600">{it.item_categories?.name||"—"}</td>
                    <td className="px-3 py-2.5 text-gray-500">{it.unit_of_measure||"—"}</td>
                    <td className="px-3 py-2.5 font-medium text-gray-800">KES {Number(it.unit_price||0).toLocaleString()}</td>
                    <td className="px-3 py-2.5">
                      <span className={`font-bold ${isLow?"text-red-600":"text-green-700"}`}>{it.quantity_in_stock||0}</span>
                      {isLow&&<AlertTriangle className="w-3 h-3 text-red-500 inline ml-1"/>}
                    </td>
                    <td className="px-3 py-2.5 text-gray-500">{it.reorder_level||10}</td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize" style={{background:s.bg,color:s.color}}>{it.status||"active"}</span>
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-gray-700">KES {(Number(it.unit_price||0)*Number(it.quantity_in_stock||0)).toLocaleString()}</td>
                    <td className="px-3 py-2.5">
                      {canEdit&&(
                        <button onClick={()=>openEdit(it)} className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Edit className="w-3 h-3"/>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 bg-gray-50 border-t text-[10px] text-gray-400 flex gap-4">
          <span>{filtered.length} items</span>
          <span>Total Stock Value: KES {totalValue.toLocaleString()}</span>
          <span className="text-red-500">Low Stock: {lowStockCount}</span>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showForm&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={()=>setShowForm(false)}/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between" style={{background:"#1a3d12"}}>
              <h3 className="text-sm font-black text-white">{editing?"Edit Item":"New Item"}</h3>
              <button onClick={()=>setShowForm(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/70"><X className="w-4 h-4"/></button>
            </div>
            <div className="overflow-y-auto p-5 grid grid-cols-2 gap-4">
              <div className="col-span-2"><F label="Item Name *" k="name"/></div>
              <F label="SKU / Code" k="sku"/>
              <F label="Item Type" k="item_type" opts={TYPES}/>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Category</label>
                <select value={form.category_id} onChange={e=>setForm(p=>({...p,category_id:e.target.value}))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500">
                  <option value="">— None —</option>
                  {cats.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <F label="Unit of Measure" k="unit_of_measure"/>
              <F label="Unit Price (KES)" k="unit_price" type="number"/>
              <F label="Quantity in Stock" k="quantity_in_stock" type="number"/>
              <F label="Reorder Level" k="reorder_level" type="number"/>
              <F label="Status" k="status" opts={["active","inactive","discontinued"]}/>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Description</label>
                <textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500 resize-none"/>
              </div>
            </div>
            <div className="px-5 py-3 border-t flex gap-2 justify-end">
              <button onClick={()=>setShowForm(false)} className="px-4 py-2 rounded-xl border text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={save} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold"
                style={{background:"#375623",opacity:saving?0.7:1}}>
                {saving?<RefreshCw className="w-3.5 h-3.5 animate-spin"/>:<Package className="w-3.5 h-3.5"/>}
                {saving?"Saving…":"Save Item"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
