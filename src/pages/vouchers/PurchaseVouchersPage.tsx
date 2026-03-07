import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import { Plus, Search, RefreshCw, Printer, Download, X, Save, Eye, Trash2, CheckCircle } from "lucide-react";
import * as XLSX from "xlsx";

const fmtKES = (n:number) => `KES ${Number(n||0).toLocaleString("en-KE",{minimumFractionDigits:2})}`;
const genNo = () => `PV-EL5H-${new Date().getFullYear()}-${String(Math.floor(1000+Math.random()*9000))}`;
const SC: Record<string,string> = {pending:"#d97706",approved:"#15803d",rejected:"#dc2626",paid:"#0369a1"};

export default function PurchaseVouchersPage() {
  const { user, profile, hasRole } = useAuth();
  const canCreate = hasRole("admin")||hasRole("procurement_manager")||hasRole("procurement_officer");
  const canApprove = hasRole("admin")||hasRole("procurement_manager");
  const [rows, setRows] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({supplier_id:"",supplier_name:"",invoice_number:"",voucher_date:new Date().toISOString().slice(0,10),due_date:"",po_reference:"",description:"",expense_account:"",tax_rate:"16"});
  const [items, setItems] = useState<{description:string;qty:string;rate:string;amount:string}[]>([{description:"",qty:"1",rate:"",amount:""}]);
  const [hospitalName, setHospitalName] = useState("Embu Level 5 Hospital");
  const [logoUrl, setLogoUrl] = useState<string|null>(null);

  const load = async () => {
    setLoading(true);
    const [{data:pv},{data:s},{data:sys}] = await Promise.all([
      (supabase as any).from("purchase_vouchers").select("*").order("created_at",{ascending:false}),
      (supabase as any).from("suppliers").select("id,name").order("name"),
      (supabase as any).from("system_settings").select("key,value").in("key",["hospital_name","system_logo_url"]),
    ]);
    setRows(pv||[]); setSuppliers(s||[]);
    const m:any={}; (sys||[]).forEach((x:any)=>{if(x.key)m[x.key]=x.value;});
    if(m.hospital_name) setHospitalName(m.hospital_name);
    if(m.system_logo_url) setLogoUrl(m.system_logo_url);
    setLoading(false);
  };
  useEffect(()=>{load();},[]);

  const updateItem = (i:number,k:string,v:string) => {
    setItems(p=>{const n=[...p];n[i]={...n[i],[k]:v};
      if(k==="qty"||k==="rate") n[i].amount=String(Number(n[i].qty||0)*Number(n[i].rate||0));
      return n;
    });
  };

  const subtotal = items.reduce((s,it)=>s+Number(it.amount||0),0);
  const taxAmt = subtotal * Number(form.tax_rate||0)/100;
  const total = subtotal + taxAmt;

  const save = async () => {
    if(!form.supplier_name||items.length===0){toast({title:"Fill required fields",variant:"destructive"});return;}
    setSaving(true);
    const payload={...form,voucher_number:genNo(),supplier_id:form.supplier_id||null,subtotal,tax_amount:taxAmt,amount:total,
      line_items:items,status:"pending",created_by:user?.id,created_by_name:profile?.full_name};
    const{data,error}=await(supabase as any).from("purchase_vouchers").insert(payload).select().single();
    if(error){toast({title:"Error",description:error.message,variant:"destructive"});}
    else{logAudit(user?.id,profile?.full_name,"create","purchase_vouchers",data?.id,{number:payload.voucher_number});toast({title:"Purchase Voucher created ✓"});setShowNew(false);load();}
    setSaving(false);
  };

  const approve = async (id:string) => {
    await(supabase as any).from("purchase_vouchers").update({status:"approved",approved_by:user?.id,approved_by_name:profile?.full_name}).eq("id",id);
    toast({title:"Approved ✓"}); load();
  };

  const deleteRow = async (id:string) => {
    if(!confirm("Delete?")) return;
    await(supabase as any).from("purchase_vouchers").delete().eq("id",id);
    toast({title:"Deleted"}); load();
  };

  const exportExcel = () => {
    const wb=XLSX.utils.book_new(); const ws=XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb,ws,"Purchase Vouchers");
    XLSX.writeFile(wb,`purchase_vouchers_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast({title:"Exported"});
  };

  const printVoucher = (v:any) => {
    const w=window.open("","_blank","width=1000,height=700");
    if(!w) return;
    const logo=logoUrl?`<img src="${logoUrl}" style="height:50px;object-fit:contain">`:""
    const itemsHtml=(v.line_items||[]).map((it:any,i:number)=>`<tr><td>${i+1}</td><td>${it.description}</td><td style="text-align:right">${it.qty}</td><td style="text-align:right">${fmtKES(Number(it.rate||0))}</td><td style="text-align:right">${fmtKES(Number(it.amount||0))}</td></tr>`).join("");
    w.document.write(`<html><head><title>Purchase Voucher</title>
    <style>body{font-family:'Segoe UI',Arial;margin:0;padding:0;font-size:11px}
    .lh{background:#1e3a5f;color:#fff;padding:12px 20px;display:flex;align-items:center;gap:12px}
    .lh-info h2{margin:0;font-size:16px;font-weight:900}.body{padding:20px}
    table{width:100%;border-collapse:collapse;font-size:10px}
    th{background:#1e3a5f;color:#fff;padding:7px 10px;text-align:left;font-size:9px;text-transform:uppercase;font-weight:700}
    td{padding:5px 10px;border-bottom:1px solid #f3f4f6}tr:nth-child(even) td{background:#f9fafb}
    .total-row td{background:#e0f2fe;font-weight:800}.meta td:first-child{font-weight:700;color:#6b7280;width:30%}
    @media print{@page{margin:1cm}}</style></head><body>
    <div class="lh">${logo}<div class="lh-info"><h2>${hospitalName}</h2><small>PURCHASE VOUCHER — ${v.voucher_number}</small></div></div>
    <div class="body">
      <table class="meta" style="margin-bottom:16px;font-size:11px">
        <tr><td>Supplier</td><td style="font-weight:700;font-size:13px">${v.supplier_name}</td><td style="font-weight:700;color:#6b7280">Date</td><td>${new Date(v.voucher_date).toLocaleDateString("en-KE",{year:"numeric",month:"long",day:"numeric"})}</td></tr>
        <tr><td>Invoice No.</td><td>${v.invoice_number||"—"}</td><td style="font-weight:700;color:#6b7280">PO Reference</td><td>${v.po_reference||"—"}</td></tr>
        <tr><td>Due Date</td><td>${v.due_date?new Date(v.due_date).toLocaleDateString("en-KE"):"—"}</td><td style="font-weight:700;color:#6b7280">Status</td><td>${v.status}</td></tr>
        <tr><td>Expense Account</td><td colspan="3">${v.expense_account||"—"}</td></tr>
      </table>
      <table><thead><tr><th>#</th><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
      <tbody>${itemsHtml}
        <tr><td colspan="4" style="text-align:right;font-weight:700">Subtotal</td><td>${fmtKES(v.subtotal)}</td></tr>
        <tr><td colspan="4" style="text-align:right;font-weight:700">VAT ${v.tax_rate||16}%</td><td>${fmtKES(v.tax_amount)}</td></tr>
        <tr class="total-row"><td colspan="4" style="text-align:right;font-size:13px">TOTAL</td><td style="font-size:13px">${fmtKES(v.amount)}</td></tr>
      </tbody></table>
    </div></body></html>`);
    w.document.close(); w.focus(); setTimeout(()=>w.print(),400);
  };

  const filtered = search ? rows.filter(r=>Object.values(r).some(v=>String(v||"").toLowerCase().includes(search.toLowerCase()))) : rows;
  const totalAmt = filtered.reduce((s,r)=>s+Number(r.amount||0),0);

  return (
    <div className="p-4 space-y-4" style={{fontFamily:"'Segoe UI',system-ui"}}>
      <div className="rounded-2xl px-5 py-3 flex items-center justify-between" style={{background:"linear-gradient(90deg,#7c2d12,#b45309)"}}>
        <div><h1 className="text-base font-black text-white">Purchase Vouchers</h1>
          <p className="text-[10px] text-white/50">{rows.length} records · Total: {fmtKES(totalAmt)}</p></div>
        <div className="flex gap-2">
          <button onClick={exportExcel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold" style={{background:"rgba(255,255,255,0.15)",color:"#fff"}}><Download className="w-3.5 h-3.5"/>Export</button>
          {canCreate&&<button onClick={()=>setShowNew(true)} className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold" style={{background:"#fff",color:"#7c2d12"}}><Plus className="w-3.5 h-3.5"/>New Voucher</button>}
        </div>
      </div>
      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm outline-none"/></div>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-xs">
          <thead><tr style={{background:"#fff7ed"}}>
            {["Voucher No.","Supplier","Invoice No.","Date","Amount","Status","Actions"].map(h=>(
              <th key={h} className="px-4 py-3 text-left font-bold text-gray-600 text-[10px] uppercase">{h}</th>))}
          </tr></thead>
          <tbody>
            {loading?<tr><td colSpan={7} className="py-8 text-center"><RefreshCw className="w-4 h-4 animate-spin text-gray-300 mx-auto"/></td></tr>:
            filtered.length===0?<tr><td colSpan={7} className="py-8 text-center text-gray-400 text-xs">No purchase vouchers</td></tr>:
            filtered.map((r,i)=>(
              <tr key={r.id} style={{borderBottom:"1px solid #f3f4f6",background:i%2===0?"#fff":"#fafafa"}}>
                <td className="px-4 py-2.5 font-bold" style={{color:"#7c2d12"}}>{r.voucher_number}</td>
                <td className="px-4 py-2.5 font-medium">{r.supplier_name}</td>
                <td className="px-4 py-2.5 text-gray-500">{r.invoice_number||"—"}</td>
                <td className="px-4 py-2.5">{new Date(r.voucher_date).toLocaleDateString("en-KE")}</td>
                <td className="px-4 py-2.5 font-bold">{fmtKES(r.amount)}</td>
                <td className="px-4 py-2.5"><span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{background:`${SC[r.status]||"#9ca3af"}20`,color:SC[r.status]||"#9ca3af"}}>{r.status}</span></td>
                <td className="px-4 py-2.5"><div className="flex gap-1.5">
                  <button onClick={()=>setDetail(r)} className="p-1.5 rounded-lg bg-blue-50"><Eye className="w-3 h-3 text-blue-600"/></button>
                  <button onClick={()=>printVoucher(r)} className="p-1.5 rounded-lg bg-green-50"><Printer className="w-3 h-3 text-green-600"/></button>
                  {canApprove&&r.status==="pending"&&<button onClick={()=>approve(r.id)} className="p-1.5 rounded-lg bg-emerald-50" title="Approve"><CheckCircle className="w-3 h-3 text-emerald-600"/></button>}
                  {hasRole("admin")&&<button onClick={()=>deleteRow(r.id)} className="p-1.5 rounded-lg bg-red-50"><Trash2 className="w-3 h-3 text-red-500"/></button>}
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* New Modal */}
      {showNew&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={()=>setShowNew(false)}/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-5 overflow-y-auto max-h-[90vh] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-gray-800">New Purchase Voucher</h3>
              <button onClick={()=>setShowNew(false)}><X className="w-5 h-5 text-gray-400"/></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block mb-1 text-xs font-semibold text-gray-500">Supplier *</label>
                <select value={form.supplier_id} onChange={e=>{const s=suppliers.find(x=>x.id===e.target.value);setForm(p=>({...p,supplier_id:e.target.value,supplier_name:s?.name||""}));}}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none">
                  <option value="">— Select —</option>
                  {suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                </select></div>
              {[["Invoice No.","invoice_number"],["Date","voucher_date","date"],["Due Date","due_date","date"],["PO Reference","po_reference"],["Expense Account","expense_account"],["Tax Rate (%)","tax_rate","number"]].map(([l,k,t])=>(
                <div key={k}><label className="block mb-1 text-xs font-semibold text-gray-500">{l}</label>
                  <input type={t||"text"} value={(form as any)[k]||""} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none"/></div>
              ))}
            </div>
            {/* Line items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-gray-700 uppercase">Line Items</label>
                <button onClick={()=>setItems(p=>[...p,{description:"",qty:"1",rate:"",amount:""}])} className="flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900"><Plus className="w-3 h-3"/>Add</button>
              </div>
              <table className="w-full text-xs" style={{borderCollapse:"collapse"}}>
                <thead><tr style={{background:"#fff7ed"}}>{["Description","Qty","Rate","Amount",""].map(h=><th key={h} className="px-2 py-2 text-left font-bold text-gray-600 text-[10px]">{h}</th>)}</tr></thead>
                <tbody>
                  {items.map((it,i)=>(
                    <tr key={i} style={{borderBottom:"1px solid #f3f4f6"}}>
                      <td className="px-1 py-1"><input value={it.description} onChange={e=>updateItem(i,"description",e.target.value)} className="w-full px-2 py-1 rounded border border-gray-200 text-xs outline-none"/></td>
                      <td className="px-1 py-1"><input type="number" value={it.qty} onChange={e=>updateItem(i,"qty",e.target.value)} className="w-14 px-2 py-1 rounded border border-gray-200 text-xs outline-none"/></td>
                      <td className="px-1 py-1"><input type="number" value={it.rate} onChange={e=>updateItem(i,"rate",e.target.value)} className="w-24 px-2 py-1 rounded border border-gray-200 text-xs outline-none"/></td>
                      <td className="px-1 py-1 font-semibold text-right">{fmtKES(Number(it.amount||0))}</td>
                      <td className="px-1 py-1"><button onClick={()=>setItems(p=>p.filter((_,j)=>j!==i))} className="text-red-400"><X className="w-3 h-3"/></button></td>
                    </tr>
                  ))}
                  <tr style={{background:"#fff7ed"}}>
                    <td colSpan={3} className="px-2 py-2 text-right text-xs font-bold">Subtotal</td><td className="px-2 py-2 text-right text-xs font-bold">{fmtKES(subtotal)}</td><td/>
                  </tr>
                  <tr style={{background:"#fff7ed"}}>
                    <td colSpan={3} className="px-2 py-2 text-right text-xs font-bold">VAT {form.tax_rate||16}%</td><td className="px-2 py-2 text-right text-xs font-bold">{fmtKES(taxAmt)}</td><td/>
                  </tr>
                  <tr style={{background:"#fde68a",fontWeight:900}}>
                    <td colSpan={3} className="px-2 py-2 text-right text-sm font-black">TOTAL</td><td className="px-2 py-2 text-right text-sm font-black">{fmtKES(total)}</td><td/>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={()=>setShowNew(false)} className="px-4 py-2 rounded-xl border text-sm">Cancel</button>
              <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-bold" style={{background:"#7c2d12"}}>
                {saving?<RefreshCw className="w-3.5 h-3.5 animate-spin"/>:<Save className="w-3.5 h-3.5"/>}
                {saving?"Saving…":"Create Voucher"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
