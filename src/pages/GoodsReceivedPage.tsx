import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import { Package, Search, X, RefreshCw, FileSpreadsheet, Printer, Eye, Plus, CheckCircle } from "lucide-react";
import * as XLSX from "xlsx";

export default function GoodsReceivedPage() {
  const { user, profile, roles } = useAuth();
  const canCreate = roles.includes("admin")||roles.includes("procurement_manager")||roles.includes("procurement_officer")||roles.includes("warehouse_officer");
  const [grns, setGrns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [hospitalName, setHospitalName] = useState("Embu Level 5 Hospital");
  const [sysName, setSysName] = useState("EL5 MediProcure");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({grn_number:"",po_id:"",supplier_name:"",received_by:"",notes:""});
  const [saving, setSaving] = useState(false);
  const [pos, setPOs] = useState<any[]>([]);

  useEffect(()=>{
    (supabase as any).from("system_settings").select("key,value").in("key",["system_name","hospital_name"])
      .then(({data}:any)=>{ if(!data) return; const m:any={}; data.forEach((r:any)=>{ if(r.key) m[r.key]=r.value; }); if(m.system_name) setSysName(m.system_name); if(m.hospital_name) setHospitalName(m.hospital_name); });
    (supabase as any).from("purchase_orders").select("id,po_number,suppliers(name)").order("created_at",{ascending:false}).limit(50)
      .then(({data}:any)=>setPOs(data||[]));
  },[]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any).from("goods_received")
      .select("*,purchase_orders(po_number,suppliers(name))")
      .order("created_at",{ascending:false});
    setGrns(data||[]);
    setLoading(false);
  },[]);

  useEffect(()=>{ load(); },[load]);

  const save = async () => {
    if(!form.grn_number.trim()){toast({title:"GRN number required",variant:"destructive"});return;}
    setSaving(true);
    const {data,error}=await (supabase as any).from("goods_received").insert({
      ...form, received_date: new Date().toISOString().slice(0,10),
      status:"received", received_by_user: user?.id,
    }).select().single();
    if(error){toast({title:"Error",description:error.message,variant:"destructive"});setSaving(false);return;}
    logAudit(user?.id,profile?.full_name,"create","goods_received",data?.id,{grn:form.grn_number});
    toast({title:"GRN Created",description:form.grn_number});
    setShowForm(false);setForm({grn_number:"",po_id:"",supplier_name:"",received_by:"",notes:""});
    load();setSaving(false);
  };

  const printGRN = (g:any) => {
    const win=window.open("","_blank","width=800,height=600");
    if(!win) return;
    win.document.write(`<html><head><title>${g.grn_number}</title>
    <style>body{font-family:'Segoe UI',Arial;margin:0;padding:20px;font-size:12px}.header{background:#1a6b3a;color:#fff;padding:15px 20px;margin:-20px -20px 20px;display:flex;justify-content:space-between}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:15px}.lbl{font-size:9px;font-weight:700;color:#888;text-transform:uppercase;margin-bottom:2px}.val{font-size:12px;color:#1f2937}@media print{@page{margin:1cm}}</style>
    </head><body>
    <div class="header"><div><h2 style="margin:0;font-size:16px">${hospitalName}</h2><small style="opacity:0.6">Goods Received Note</small></div><div style="text-align:right"><strong style="font-size:16px">${g.grn_number}</strong><br><small>${g.received_date||new Date().toLocaleDateString("en-KE")}</small></div></div>
    <div class="grid">
      <div><div class="lbl">PO Number</div><div class="val">${g.purchase_orders?.po_number||"—"}</div></div>
      <div><div class="lbl">Supplier</div><div class="val">${g.purchase_orders?.suppliers?.name||g.supplier_name||"—"}</div></div>
      <div><div class="lbl">Received Date</div><div class="val">${g.received_date||"—"}</div></div>
      <div><div class="lbl">Received By</div><div class="val">${g.received_by||profile?.full_name||"—"}</div></div>
      <div><div class="lbl">Total Value</div><div class="val">KES ${Number(g.total_value||0).toLocaleString()}</div></div>
      <div><div class="lbl">Condition</div><div class="val">${g.condition||"Good"}</div></div>
    </div>
    ${g.notes?`<div style="padding:10px;background:#f8fafc;border-radius:6px"><strong style="font-size:10px;color:#888">NOTES:</strong> ${g.notes}</div>`:""}
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin-top:40px">
      ${["Received By","Stores Officer","Quality Inspector"].map(s=>`<div><div style="border-top:1px solid #ccc;margin-bottom:4px;padding-top:4px;font-size:9px;color:#888">${s}</div></div>`).join("")}
    </div>
    </body></html>`);
    win.document.close();win.focus();setTimeout(()=>win.print(),400);
  };

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const rows = grns.filter(g=>!search||(g.grn_number||"").toLowerCase().includes(search.toLowerCase())).map(g=>({
      "GRN Number":g.grn_number,"PO Number":g.purchase_orders?.po_number||"",
      "Supplier":g.purchase_orders?.suppliers?.name||g.supplier_name||"",
      "Received Date":g.received_date||"","Total Value":g.total_value||0,
      "Status":g.status||"","Received By":g.received_by||"","Notes":g.notes||"",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb,ws,"GRNs");
    XLSX.writeFile(wb,`GoodsReceived_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast({title:"Exported"});
  };

  const filtered = grns.filter(g=>!search||(g.grn_number||"").toLowerCase().includes(search.toLowerCase())||(g.purchase_orders?.po_number||"").toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 space-y-3" style={{fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      {/* Header */}
      <div className="rounded-2xl px-5 py-3 flex items-center justify-between"
        style={{background:"linear-gradient(90deg,#14532d,#15803d,#16a34a)",boxShadow:"0 4px 16px rgba(21,128,61,0.3)"}}>
        <div className="flex items-center gap-3">
          <Package className="w-5 h-5 text-white"/>
          <div>
            <h1 className="text-base font-black text-white">Goods Received</h1>
            <p className="text-[10px] text-white/50">{grns.length} GRN records · Total: KES {grns.reduce((s,g)=>s+Number(g.total_value||0),0).toLocaleString()}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="p-2 rounded-lg bg-white/15 text-white hover:bg-white/25">
            <RefreshCw className={`w-3.5 h-3.5 ${loading?"animate-spin":""}`}/>
          </button>
          <button onClick={exportExcel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 text-white text-xs font-semibold hover:bg-white/30">
            <FileSpreadsheet className="w-3.5 h-3.5"/>Export
          </button>
          {canCreate&&(
            <button onClick={()=>setShowForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-green-900 text-xs font-bold hover:bg-green-50">
              <Plus className="w-3.5 h-3.5"/>New GRN
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative w-64">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search GRNs…"
          className="w-full pl-8 pr-8 py-1.5 rounded-full border border-gray-200 text-xs outline-none focus:border-green-400"/>
        {search&&<button onClick={()=>setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-3 h-3 text-gray-400"/></button>}
      </div>

      {/* Table */}
      <div className="rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" style={{fontSize:12}}>
            <thead>
              <tr style={{background:"#14532d"}}>
                {["#","GRN Number","PO Number","Supplier","Received Date","Total Value","Status","Actions"].map(h=>(
                  <th key={h} className="text-left px-3 py-2.5 text-white/70 font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading?(
                Array(4).fill(0).map((_,i)=>(
                  <tr key={i}><td colSpan={8} className="px-4 py-3 animate-pulse"><div className="h-3 bg-gray-200 rounded w-full"/></td></tr>
                ))
              ):filtered.length===0?(
                <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">No GRN records found</td></tr>
              ):filtered.map((g,i)=>(
                <tr key={g.id} className="border-b border-gray-50 hover:bg-green-50/20 transition-colors group">
                  <td className="px-3 py-2.5 text-gray-400">{i+1}</td>
                  <td className="px-3 py-2.5 font-mono text-xs font-bold text-green-800">{g.grn_number||"—"}</td>
                  <td className="px-3 py-2.5 text-gray-600 font-mono text-xs">{g.purchase_orders?.po_number||"—"}</td>
                  <td className="px-3 py-2.5 font-semibold text-gray-800">{g.purchase_orders?.suppliers?.name||g.supplier_name||"—"}</td>
                  <td className="px-3 py-2.5 text-gray-500 text-[10px]">{g.received_date||"—"}</td>
                  <td className="px-3 py-2.5 font-semibold text-gray-800">KES {Number(g.total_value||0).toLocaleString()}</td>
                  <td className="px-3 py-2.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize" style={{background:"#d1fae5",color:"#065f46"}}>
                      {g.status||"received"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={()=>printGRN(g)} className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100"><Printer className="w-3 h-3"/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 bg-gray-50 border-t text-[10px] text-gray-400">
          {filtered.length} records · Total Value: KES {filtered.reduce((s,g)=>s+Number(g.total_value||0),0).toLocaleString()}
        </div>
      </div>

      {/* Create GRN Modal */}
      {showForm&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={()=>setShowForm(false)}/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between" style={{background:"#14532d"}}>
              <h3 className="text-sm font-black text-white">New Goods Received Note</h3>
              <button onClick={()=>setShowForm(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/70"><X className="w-4 h-4"/></button>
            </div>
            <div className="p-5 space-y-4">
              {[{k:"grn_number",l:"GRN Number *",ph:"e.g. GRN/EL5H/2025/001"},{k:"received_by",l:"Received By",ph:"Name of receiving officer"},{k:"notes",l:"Notes / Remarks",ph:"Any remarks…"}].map(f=>(
                <div key={f.k}>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">{f.l}</label>
                  {f.k==="notes"?(
                    <textarea value={(form as any)[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} rows={2} placeholder={f.ph}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-400 resize-none"/>
                  ):(
                    <input value={(form as any)[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} placeholder={f.ph}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-400"/>
                  )}
                </div>
              ))}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Link to Purchase Order</label>
                <select value={form.po_id} onChange={e=>setForm(p=>({...p,po_id:e.target.value}))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-400">
                  <option value="">— Select PO (optional) —</option>
                  {pos.map((po:any)=><option key={po.id} value={po.id}>{po.po_number} — {po.suppliers?.name||""}</option>)}
                </select>
              </div>
            </div>
            <div className="px-5 py-3 border-t flex gap-2 justify-end">
              <button onClick={()=>setShowForm(false)} className="px-4 py-2 rounded-xl border text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={save} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold"
                style={{background:"#15803d",opacity:saving?0.7:1}}>
                {saving?<RefreshCw className="w-3.5 h-3.5 animate-spin"/>:<CheckCircle className="w-3.5 h-3.5"/>}
                {saving?"Saving…":"Create GRN"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
