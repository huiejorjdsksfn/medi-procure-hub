import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import { Plus, Search, RefreshCw, Printer, Download, X, Save, Eye, Trash2 } from "lucide-react";
import * as XLSX from "xlsx";

const fmtKES = (n:number) => `KES ${Number(n||0).toLocaleString("en-KE",{minimumFractionDigits:2})}`;
const genNo = () => `SV-EL5H-${new Date().getFullYear()}-${String(Math.floor(1000+Math.random()*9000))}`;
const SC: Record<string,string> = {confirmed:"#15803d",pending:"#d97706",cancelled:"#dc2626"};

export default function SalesVouchersPage() {
  const { user, profile, hasRole } = useAuth();
  const canCreate = hasRole("admin")||hasRole("procurement_manager")||hasRole("procurement_officer");
  const [rows, setRows] = useState<any[]>([]);
  const [depts, setDepts] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({customer_name:"",customer_type:"walk_in",patient_number:"",payment_method:"Cash",voucher_date:new Date().toISOString().slice(0,10),due_date:"",description:"",income_account:"",department_id:"",tax_rate:"16"});
  const [lineItems, setLineItems] = useState<{item_id:string;item_name:string;qty:string;rate:string;amount:string}[]>([{item_id:"",item_name:"",qty:"1",rate:"",amount:""}]);
  const [hospitalName, setHospitalName] = useState("Embu Level 5 Hospital");
  const [logoUrl, setLogoUrl] = useState<string|null>(null);

  const load = async () => {
    setLoading(true);
    const [{data:sv},{data:d},{data:it},{data:s}] = await Promise.all([
      (supabase as any).from("sales_vouchers").select("*").order("created_at",{ascending:false}),
      (supabase as any).from("departments").select("id,name").order("name"),
      (supabase as any).from("items").select("id,name,unit_price").where ? (supabase as any).from("items").select("id,name,unit_price").order("name") : (supabase as any).from("items").select("id,name,unit_price").order("name"),
      (supabase as any).from("system_settings").select("key,value").in("key",["hospital_name","system_logo_url"]),
    ]);
    setRows(sv||[]); setDepts(d||[]); setItems(it||[]);
    const m:any={}; (s||[]).forEach((x:any)=>{if(x.key)m[x.key]=x.value;});
    if(m.hospital_name) setHospitalName(m.hospital_name);
    if(m.system_logo_url) setLogoUrl(m.system_logo_url);
    setLoading(false);
  };
  useEffect(()=>{load();},[]);

  const updateLine = (i:number,k:string,v:string) => {
    setLineItems(p=>{const n=[...p];n[i]={...n[i],[k]:v};
      if(k==="item_id"){const it=items.find(x=>x.id===v); if(it){n[i].item_name=it.name;n[i].rate=String(it.unit_price||0);}}
      if(k==="qty"||k==="rate") n[i].amount=String(Number(n[i].qty||0)*Number(n[i].rate||0));
      return n;
    });
  };

  const subtotal = lineItems.reduce((s,it)=>s+Number(it.amount||0),0);
  const taxAmt = subtotal*Number(form.tax_rate||0)/100;
  const total = subtotal+taxAmt;

  const save = async () => {
    if(!form.customer_name){toast({title:"Customer name required",variant:"destructive"});return;}
    setSaving(true);
    const payload={...form,voucher_number:genNo(),subtotal,tax_amount:taxAmt,amount:total,
      department_id:form.department_id||null,line_items:lineItems,status:"confirmed",created_by:user?.id,created_by_name:profile?.full_name};
    const{data,error}=await(supabase as any).from("sales_vouchers").insert(payload).select().single();
    if(error){toast({title:"Error",description:error.message,variant:"destructive"});}
    else{logAudit(user?.id,profile?.full_name,"create","sales_vouchers",data?.id,{number:payload.voucher_number});toast({title:"Sales Voucher created ✓"});setShowNew(false);load();}
    setSaving(false);
  };

  const deleteRow = async (id:string) => {
    if(!confirm("Delete?")) return;
    await(supabase as any).from("sales_vouchers").delete().eq("id",id);
    toast({title:"Deleted"}); load();
  };

  const exportExcel = () => {
    const wb=XLSX.utils.book_new(); const ws=XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb,ws,"Sales Vouchers");
    XLSX.writeFile(wb,`sales_vouchers_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast({title:"Exported"});
  };

  const printVoucher = (v:any) => {
    const w=window.open("","_blank","width=900,height=700");
    if(!w) return;
    const logo=logoUrl?`<img src="${logoUrl}" style="height:50px;object-fit:contain">`:""
    const lh=(v.line_items||[]).map((it:any,i:number)=>`<tr><td>${i+1}</td><td>${it.item_name||it.description||""}</td><td style="text-align:right">${it.qty}</td><td style="text-align:right">${fmtKES(Number(it.rate||0))}</td><td style="text-align:right">${fmtKES(Number(it.amount||0))}</td></tr>`).join("");
    w.document.write(`<html><head><title>Sales Voucher</title>
    <style>body{font-family:'Segoe UI',Arial;margin:0;padding:0;font-size:11px}
    .lh{background:#065f46;color:#fff;padding:12px 20px;display:flex;align-items:center;gap:12px}
    .lh-info h2{margin:0;font-size:16px;font-weight:900}.body{padding:20px}
    table{width:100%;border-collapse:collapse;font-size:10px}
    th{background:#065f46;color:#fff;padding:7px 10px;text-align:left;font-size:9px;font-weight:700;text-transform:uppercase}
    td{padding:5px 10px;border-bottom:1px solid #f3f4f6}tr:nth-child(even) td{background:#f9fafb}
    .total-row td{background:#d1fae5;font-weight:800}.meta td:first-child{font-weight:700;color:#6b7280;width:30%}
    @media print{@page{margin:1cm}}</style></head><body>
    <div class="lh">${logo}<div class="lh-info"><h2>${hospitalName}</h2><small>SALES VOUCHER — ${v.voucher_number}</small></div></div>
    <div class="body">
      <table class="meta" style="margin-bottom:16px;font-size:11px">
        <tr><td>Customer</td><td style="font-weight:700;font-size:13px">${v.customer_name}</td><td style="font-weight:700;color:#6b7280">Type</td><td>${v.customer_type}</td></tr>
        ${v.patient_number?`<tr><td>Patient No.</td><td>${v.patient_number}</td><td></td><td></td></tr>`:""}
        <tr><td>Date</td><td>${new Date(v.voucher_date).toLocaleDateString("en-KE",{year:"numeric",month:"long",day:"numeric"})}</td><td style="font-weight:700;color:#6b7280">Payment</td><td>${v.payment_method}</td></tr>
        <tr><td>Status</td><td>${v.status}</td><td style="font-weight:700;color:#6b7280">Created By</td><td>${v.created_by_name||"—"}</td></tr>
      </table>
      <table><thead><tr><th>#</th><th>Item / Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
      <tbody>${lh}
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
      <div className="rounded-2xl px-5 py-3 flex items-center justify-between" style={{background:"linear-gradient(90deg,#065f46,#0d9488)"}}>
        <div><h1 className="text-base font-black text-white">Sales Vouchers</h1>
          <p className="text-[10px] text-white/50">{rows.length} records · Total: {fmtKES(totalAmt)}</p></div>
        <div className="flex gap-2">
          <button onClick={exportExcel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold" style={{background:"rgba(255,255,255,0.15)",color:"#fff"}}><Download className="w-3.5 h-3.5"/>Export</button>
          {canCreate&&<button onClick={()=>setShowNew(true)} className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold" style={{background:"#fff",color:"#065f46"}}><Plus className="w-3.5 h-3.5"/>New Sale</button>}
        </div>
      </div>
      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm outline-none"/></div>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-xs">
          <thead><tr style={{background:"#ecfdf5"}}>
            {["Voucher No.","Customer","Type","Date","Amount","Status","Actions"].map(h=>(
              <th key={h} className="px-4 py-3 text-left font-bold text-gray-600 text-[10px] uppercase">{h}</th>))}
          </tr></thead>
          <tbody>
            {loading?<tr><td colSpan={7} className="py-8 text-center"><RefreshCw className="w-4 h-4 animate-spin text-gray-300 mx-auto"/></td></tr>:
            filtered.length===0?<tr><td colSpan={7} className="py-8 text-center text-gray-400 text-xs">No sales vouchers</td></tr>:
            filtered.map((r,i)=>(
              <tr key={r.id} style={{borderBottom:"1px solid #f3f4f6",background:i%2===0?"#fff":"#fafafa"}}>
                <td className="px-4 py-2.5 font-bold" style={{color:"#065f46"}}>{r.voucher_number}</td>
                <td className="px-4 py-2.5 font-medium">{r.customer_name}</td>
                <td className="px-4 py-2.5 text-gray-500 capitalize">{r.customer_type}</td>
                <td className="px-4 py-2.5">{new Date(r.voucher_date).toLocaleDateString("en-KE")}</td>
                <td className="px-4 py-2.5 font-bold">{fmtKES(r.amount)}</td>
                <td className="px-4 py-2.5"><span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{background:`${SC[r.status]||"#9ca3af"}20`,color:SC[r.status]||"#9ca3af"}}>{r.status}</span></td>
                <td className="px-4 py-2.5"><div className="flex gap-1.5">
                  <button onClick={()=>setDetail(r)} className="p-1.5 rounded-lg bg-blue-50"><Eye className="w-3 h-3 text-blue-600"/></button>
                  <button onClick={()=>printVoucher(r)} className="p-1.5 rounded-lg bg-green-50"><Printer className="w-3 h-3 text-green-600"/></button>
                  {hasRole("admin")&&<button onClick={()=>deleteRow(r.id)} className="p-1.5 rounded-lg bg-red-50"><Trash2 className="w-3 h-3 text-red-500"/></button>}
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showNew&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={()=>setShowNew(false)}/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-5 overflow-y-auto max-h-[90vh] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-gray-800">New Sales Voucher</h3>
              <button onClick={()=>setShowNew(false)}><X className="w-5 h-5 text-gray-400"/></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[["Customer Name *","customer_name"],["Patient No.","patient_number"],["Date","voucher_date","date"],["Due Date","due_date","date"],["Income Account","income_account"]].map(([l,k,t])=>(
                <div key={k}><label className="block mb-1 text-xs font-semibold text-gray-500">{l}</label>
                  <input type={t||"text"} value={(form as any)[k]||""} onChange={e=>setForm(p=>({...p,[k as string]:e.target.value}))} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none"/></div>
              ))}
              <div><label className="block mb-1 text-xs font-semibold text-gray-500">Customer Type</label>
                <select value={form.customer_type} onChange={e=>setForm(p=>({...p,customer_type:e.target.value}))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none">
                  {["walk_in","inpatient","outpatient","insurance","government","corporate"].map(t=><option key={t} value={t} className="capitalize">{t.replace(/_/g," ")}</option>)}
                </select></div>
              <div><label className="block mb-1 text-xs font-semibold text-gray-500">Payment Method</label>
                <select value={form.payment_method} onChange={e=>setForm(p=>({...p,payment_method:e.target.value}))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none">
                  {["Cash","MPESA","Insurance","Cheque","EFT","Credit"].map(m=><option key={m}>{m}</option>)}
                </select></div>
              <div><label className="block mb-1 text-xs font-semibold text-gray-500">Tax Rate (%)</label>
                <input type="number" value={form.tax_rate} onChange={e=>setForm(p=>({...p,tax_rate:e.target.value}))} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none"/></div>
              <div><label className="block mb-1 text-xs font-semibold text-gray-500">Department</label>
                <select value={form.department_id} onChange={e=>setForm(p=>({...p,department_id:e.target.value}))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none">
                  <option value="">— Select —</option>
                  {depts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                </select></div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-gray-700 uppercase">Line Items</label>
                <button onClick={()=>setLineItems(p=>[...p,{item_id:"",item_name:"",qty:"1",rate:"",amount:""}])} className="flex items-center gap-1 text-xs font-semibold text-teal-700"><Plus className="w-3 h-3"/>Add</button>
              </div>
              <table className="w-full text-xs" style={{borderCollapse:"collapse"}}>
                <thead><tr style={{background:"#ecfdf5"}}>{["Item","Qty","Rate","Amount",""].map(h=><th key={h} className="px-2 py-2 text-left font-bold text-gray-600 text-[10px]">{h}</th>)}</tr></thead>
                <tbody>
                  {lineItems.map((it,i)=>(
                    <tr key={i} style={{borderBottom:"1px solid #f3f4f6"}}>
                      <td className="px-1 py-1">
                        <select value={it.item_id} onChange={e=>updateLine(i,"item_id",e.target.value)} className="w-full px-2 py-1 rounded border border-gray-200 text-xs outline-none">
                          <option value="">— Item —</option>
                          {items.map(it2=><option key={it2.id} value={it2.id}>{it2.name}</option>)}
                        </select>
                      </td>
                      <td className="px-1 py-1"><input type="number" value={it.qty} onChange={e=>updateLine(i,"qty",e.target.value)} className="w-14 px-2 py-1 rounded border border-gray-200 text-xs outline-none"/></td>
                      <td className="px-1 py-1"><input type="number" value={it.rate} onChange={e=>updateLine(i,"rate",e.target.value)} className="w-24 px-2 py-1 rounded border border-gray-200 text-xs outline-none"/></td>
                      <td className="px-1 py-1 font-semibold">{fmtKES(Number(it.amount||0))}</td>
                      <td><button onClick={()=>setLineItems(p=>p.filter((_,j)=>j!==i))} className="text-red-400"><X className="w-3 h-3"/></button></td>
                    </tr>
                  ))}
                  <tr style={{background:"#d1fae5",fontWeight:900}}>
                    <td colSpan={3} className="px-2 py-1.5 text-right text-sm font-black">TOTAL</td>
                    <td className="px-2 py-1.5 text-sm font-black">{fmtKES(total)}</td><td/>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={()=>setShowNew(false)} className="px-4 py-2 rounded-xl border text-sm">Cancel</button>
              <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-bold" style={{background:"#065f46"}}>
                {saving?<RefreshCw className="w-3.5 h-3.5 animate-spin"/>:<Save className="w-3.5 h-3.5"/>}
                {saving?"Saving…":"Create Sale"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
