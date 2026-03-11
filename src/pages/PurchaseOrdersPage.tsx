import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import { generateLPO_PDF } from "@/lib/export";
import {
  Plus, Search, X, RefreshCw, FileSpreadsheet, Printer, Eye,
  CheckCircle, XCircle, ShoppingCart, Send, Download
} from "lucide-react";
import * as XLSX from "xlsx";
import { notifyProcurement, sendNotification } from "@/lib/notify";

const STATUS_CFG: Record<string,{bg:string;color:string}> = {
  draft:    {bg:"#f3f4f6",color:"#6b7280"},
  pending:  {bg:"#fef3c7",color:"#92400e"},
  approved: {bg:"#dcfce7",color:"#15803d"},
  sent:     {bg:"#dbeafe",color:"#1d4ed8"},
  partial:  {bg:"#e0f2fe",color:"#0369a1"},
  received: {bg:"#d1fae5",color:"#065f46"},
  cancelled:{bg:"#fee2e2",color:"#dc2626"},
};

export default function PurchaseOrdersPage() {
  const { user, profile, roles } = useAuth();
  const canApprove = roles.includes("admin") || roles.includes("procurement_manager");
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewPO, setViewPO] = useState<any>(null);
  const [hospitalName, setHospitalName] = useState("Embu Level 5 Hospital");
  const [sysName, setSysName] = useState("EL5 MediProcure");

  useEffect(()=>{
    (supabase as any).from("system_settings").select("key,value").in("key",["system_name","hospital_name"])
      .then(({data}:any)=>{ if(!data) return; const m:any={}; data.forEach((r:any)=>{ if(r.key) m[r.key]=r.value; }); if(m.system_name) setSysName(m.system_name); if(m.hospital_name) setHospitalName(m.hospital_name); });
  },[]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any).from("purchase_orders")
      .select("*,suppliers(name)")
      .order("created_at",{ascending:false});
    setOrders(data||[]);
    setLoading(false);
  },[]);

  useEffect(()=>{ load(); },[load]);

  const approve = async (id:string) => {
    const po = orders.find(o=>o.id===id);
    await (supabase as any).from("purchase_orders").update({status:"approved",approved_by:user?.id,approved_at:new Date().toISOString()}).eq("id",id);
    logAudit(user?.id,profile?.full_name,"approve","purchase_orders",id,{});
    toast({title:"Purchase Order Approved ✓"});
    await notifyProcurement({title:"PO Approved ✓",message:`Purchase Order ${po?.po_number||id.slice(0,8)} approved by ${profile?.full_name||"Manager"}`,type:"procurement",module:"PO",actionUrl:"/purchase-orders"});
    load();
  };

  const printLPO = (po:any) => {
    const win = window.open("","_blank","width=900,height=700");
    if(!win) return;
    win.document.write(`<html><head><title>${po.po_number}</title>
    <style>
      body{font-family:'Segoe UI',Arial;margin:0;padding:20px;font-size:12px;color:#1f2937}
      .header{background:#0a2558;color:#fff;padding:15px 20px;margin:-20px -20px 20px;display:flex;justify-content:space-between;align-items:center}
      .header h2{margin:0;font-size:16px}.header small{opacity:0.6;font-size:10px}
      .po-no{font-size:20px;font-weight:900;color:#1a3a6b;margin-bottom:5px}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:15px}
      .field .lbl{font-size:9px;font-weight:700;color:#888;text-transform:uppercase;margin-bottom:2px}
      .field .val{font-size:12px;color:#1f2937}
      table{width:100%;border-collapse:collapse;font-size:11px}
      thead tr{background:#1a3a6b;color:#fff}
      th{padding:7px 10px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase}
      td{padding:6px 10px;border-bottom:1px solid #f3f4f6}
      .total-row{background:#f8fafc;font-weight:700}
      .sig-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;margin-top:40px}
      .sig-box{border-top:1px solid #ccc;padding-top:6px;font-size:9px;color:#888}
      @media print{@page{margin:1.2cm}body{margin:0}}
    </style></head><body>
    <div class="header">
      <div><h2>${hospitalName}</h2><small>Official Local Purchase Order</small></div>
      <div style="text-align:right"><div style="font-size:16px;font-weight:900">${po.po_number}</div><small>Issue Date: ${po.created_at?new Date(po.created_at).toLocaleDateString("en-KE"):""}</small></div>
    </div>
    <div class="grid">
      <div class="field"><div class="lbl">Supplier</div><div class="val">${po.suppliers?.name||po.supplier_name||"—"}</div></div>
      <div class="field"><div class="lbl">Status</div><div class="val" style="text-transform:capitalize">${po.status||"—"}</div></div>
      <div class="field"><div class="lbl">Delivery Date</div><div class="val">${po.delivery_date||"—"}</div></div>
      <div class="field"><div class="lbl">Payment Terms</div><div class="val">${po.payment_terms||"30 Days"}</div></div>
    </div>
    <table>
      <thead><tr><th>#</th><th>Item Description</th><th>Qty</th><th>UoM</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>
        ${(po.items||[]).map((it:any,i:number)=>`<tr><td>${i+1}</td><td>${it.description||it.item_name||"—"}</td><td>${it.quantity||0}</td><td>${it.unit||"—"}</td><td style="text-align:right">KES ${Number(it.unit_price||0).toLocaleString()}</td><td style="text-align:right">KES ${Number((it.quantity||0)*(it.unit_price||0)).toLocaleString()}</td></tr>`).join("")||"<tr><td colspan='6' style='text-align:center;color:#9ca3af;padding:12px'>No line items</td></tr>"}
      </tbody>
      <tfoot><tr class="total-row"><td colspan="5" style="text-align:right;padding:8px 10px">TOTAL (KES)</td><td style="text-align:right;padding:8px 10px">KES ${Number(po.total_amount||0).toLocaleString()}</td></tr></tfoot>
    </table>
    ${po.notes?`<div style="margin-top:12px;padding:10px;background:#f8fafc;border-radius:6px"><strong style="font-size:10px;color:#888">NOTES:</strong> ${po.notes}</div>`:""}
    <div class="sig-row">
      ${["Prepared By","Authorized By","Supplier Acknowledgement"].map(s=>`<div class="sig-box">${s}<br><br><br></div>`).join("")}
    </div>
    <div style="margin-top:20px;border-top:1px solid #e5e7eb;padding-top:8px;font-size:9px;color:#aaa;text-align:center">${hospitalName} · ${sysName} · ${new Date().toLocaleDateString("en-KE")} · Official Document</div>
    </body></html>`);
    win.document.close();win.focus();setTimeout(()=>win.print(),400);
  };

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const header = [[hospitalName],[sysName+" — Purchase Orders"],[`Exported: ${new Date().toLocaleString("en-KE")}`],[]];
    const rows = filtered.map(po=>({
      "PO Number":po.po_number,"Supplier":po.suppliers?.name||po.supplier_name||"",
      "Status":po.status,"Total Amount":po.total_amount||0,
      "Delivery Date":po.delivery_date||"","Created":po.created_at?new Date(po.created_at).toLocaleDateString("en-KE"):"",
      "Notes":po.notes||"",
    }));
    const ws = XLSX.utils.aoa_to_sheet([...header,...[Object.keys(rows[0]||{})],...rows.map(r=>Object.values(r))]);
    XLSX.utils.book_append_sheet(wb,ws,"Purchase Orders");
    XLSX.writeFile(wb,`PurchaseOrders_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast({title:"Exported",description:`${filtered.length} records`});
  };

  const filtered = orders.filter(po=>{
    if(statusFilter!=="all"&&po.status!==statusFilter) return false;
    if(search){const q=search.toLowerCase();return (po.po_number||"").toLowerCase().includes(q)||(po.suppliers?.name||"").toLowerCase().includes(q);}
    return true;
  });

  return (
    <div className="p-4 space-y-3" style={{fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      {/* Header */}
      <div className="rounded-2xl px-5 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
        style={{background:"linear-gradient(90deg,#92400e,#C45911,#d97706)",boxShadow:"0 4px 16px rgba(196,89,17,0.3)"}}>
        <div className="flex items-center gap-3">
          <ShoppingCart className="w-5 h-5 text-white"/>
          <div>
            <h1 className="text-base font-black text-white">Purchase Orders</h1>
            <p className="text-[10px] text-white/50">{filtered.length} of {orders.length} orders · Total: KES {filtered.reduce((s,p)=>s+Number(p.total_amount||0),0).toLocaleString()}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={load} disabled={loading} className="p-2 rounded-lg bg-white/15 text-white hover:bg-white/25">
            <RefreshCw className={""}/>
          </button>
          <button onClick={exportExcel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/80 text-white text-xs font-semibold hover:bg-green-500">
            <FileSpreadsheet className="w-3.5 h-3.5"/>Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {["all","draft","pending","approved","sent","received","cancelled"].map(s=>(
          <button key={s} onClick={()=>setStatusFilter(s)}
            className="px-2.5 py-1 rounded-full text-[10px] font-semibold capitalize transition-all"
            style={{background:statusFilter===s?"#C45911":"#f3f4f6",color:statusFilter===s?"#fff":"#6b7280"}}>
            {s}{s!=="all"&&<span className="ml-1 opacity-70">({orders.filter(o=>o.status===s).length})</span>}
          </button>
        ))}
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search POs…"
            className="pl-8 pr-8 py-1.5 rounded-full border border-gray-200 text-xs outline-none focus:border-orange-400 w-48"/>
          {search&&<button onClick={()=>setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-3 h-3 text-gray-400"/></button>}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" style={{fontSize:12}}>
            <thead>
              <tr style={{background:"#92400e"}}>
                {["#","PO Number","Supplier","Status","Total Amount","Delivery Date","Created","Actions"].map(h=>(
                  <th key={h} className="text-left px-3 py-2.5 text-white/70 font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading?(
                Array(5).fill(0).map((_,i)=>(
                  <tr key={i}><td colSpan={8} className="px-4 py-3 animate-pulse"><div className="h-3 bg-gray-200 rounded w-full"/></td></tr>
                ))
              ):filtered.length===0?(
                <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">No purchase orders found</td></tr>
              ):filtered.map((po,i)=>{
                const s=STATUS_CFG[po.status]||{bg:"#f3f4f6",color:"#6b7280"};
                return (
                  <tr key={po.id} className="border-b border-gray-50 hover:bg-orange-50/20 transition-colors group">
                    <td className="px-3 py-2.5 text-gray-400">{i+1}</td>
                    <td className="px-3 py-2.5 font-mono text-xs font-bold text-orange-700">{po.po_number||"—"}</td>
                    <td className="px-3 py-2.5 font-semibold text-gray-800">{po.suppliers?.name||po.supplier_name||"—"}</td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize" style={{background:s.bg,color:s.color}}>{po.status||"—"}</span>
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-gray-800">KES {Number(po.total_amount||0).toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-gray-500 text-[10px]">{po.delivery_date||"—"}</td>
                    <td className="px-3 py-2.5 text-gray-400 text-[10px] whitespace-nowrap">{po.created_at?new Date(po.created_at).toLocaleDateString("en-KE"):"—"}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={()=>setViewPO(po)} className="p-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100"><Eye className="w-3 h-3"/></button>
                        <button onClick={()=>printLPO(po)} className="p-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100"><Printer className="w-3 h-3"/></button>
                        {canApprove&&po.status==="pending"&&(
                          <button onClick={()=>approve(po.id)} className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100"><CheckCircle className="w-3 h-3"/></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 bg-gray-50 border-t text-[10px] text-gray-400">
          {filtered.length} orders · Total: KES {filtered.reduce((s,p)=>s+Number(p.total_amount||0),0).toLocaleString()}
        </div>
      </div>

      {/* View Modal */}
      {viewPO&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:999}} onClick={()=>setViewPO(null)}/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-5 py-3 flex items-center justify-between" style={{background:"#92400e"}}>
              <div><h3 className="text-sm font-black text-white">{viewPO.po_number}</h3><p className="text-[10px] text-white/40">Purchase Order</p></div>
              <div className="flex gap-2">
                <button onClick={()=>printLPO(viewPO)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/20 text-white text-xs"><Printer className="w-3 h-3"/>Print LPO</button>
                <button onClick={()=>setViewPO(null)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/70"><X className="w-4 h-4"/></button>
              </div>
            </div>
            <div className="overflow-y-auto p-5">
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  {l:"Supplier",v:viewPO.suppliers?.name||viewPO.supplier_name},{l:"Status",v:viewPO.status},
                  {l:"Total",v:`KES ${Number(viewPO.total_amount||0).toLocaleString()}`},{l:"Delivery Date",v:viewPO.delivery_date},
                  {l:"Payment Terms",v:viewPO.payment_terms},{l:"Date",v:viewPO.created_at?new Date(viewPO.created_at).toLocaleDateString("en-KE"):"—"},
                ].map(r=>(
                  <div key={r.l}>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{r.l}</div>
                    <div className="text-sm text-gray-800 font-medium mt-0.5">{r.v||"—"}</div>
                  </div>
                ))}
              </div>
              {viewPO.notes&&<div className="mb-4 p-3 rounded-xl bg-gray-50"><p className="text-[10px] font-bold uppercase text-gray-400 mb-1">Notes</p><p className="text-sm text-gray-700">{viewPO.notes}</p></div>}
              {canApprove&&viewPO.status==="pending"&&(
                <button onClick={()=>{approve(viewPO.id);setViewPO(null);}}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white font-bold text-sm mb-3"
                  style={{background:"#15803d"}}>
                  <CheckCircle className="w-4 h-4"/>Approve Purchase Order
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
