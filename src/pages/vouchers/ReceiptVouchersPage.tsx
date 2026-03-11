import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import { Plus, Search, RefreshCw, Printer, Download, X, Save, Eye, Trash2, CheckCircle } from "lucide-react";
import * as XLSX from "xlsx";

const fmtKES = (n:number) => `KES ${Number(n||0).toLocaleString("en-KE",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const genNo = () => `RV-EL5H-${new Date().getFullYear()}-${String(Math.floor(1000+Math.random()*9000))}`;
const SC: Record<string,string> = {confirmed:"#15803d",pending:"#d97706",cancelled:"#dc2626"};

export default function ReceiptVouchersPage() {
  const { user, profile, hasRole } = useAuth();
  const canCreate = hasRole("admin")||hasRole("procurement_manager")||hasRole("procurement_officer");
  const [rows, setRows] = useState<any[]>([]);
  const [depts, setDepts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [form, setForm] = useState({received_from:"",amount:"",payment_method:"Cash",receipt_date:new Date().toISOString().slice(0,10),reference:"",description:"",income_account:"",bank_name:"",bank_reference:"",department_id:"",status:"confirmed"});
  const [saving, setSaving] = useState(false);
  const [hospitalName, setHospitalName] = useState("Embu Level 5 Hospital");
  const [logoUrl, setLogoUrl] = useState<string|null>(null);

  const load = async () => {
    setLoading(true);
    const [{data:rv},{data:d},{data:s}] = await Promise.all([
      (supabase as any).from("receipt_vouchers").select("*").order("created_at",{ascending:false}),
      (supabase as any).from("departments").select("id,name").order("name"),
      (supabase as any).from("system_settings").select("key,value").in("key",["hospital_name","system_logo_url"]),
    ]);
    setRows(rv||[]); setDepts(d||[]);
    const m:any={}; (s||[]).forEach((x:any)=>{if(x.key)m[x.key]=x.value;});
    if(m.hospital_name) setHospitalName(m.hospital_name);
    if(m.system_logo_url) setLogoUrl(m.system_logo_url);
    setLoading(false);
  };
  useEffect(()=>{load();},[]);

  const save = async () => {
    if(!form.received_from||!form.amount){toast({title:"Fill required fields",variant:"destructive"});return;}
    setSaving(true);
    const payload={...form,receipt_number:genNo(),amount:Number(form.amount),department_id:form.department_id||null,created_by:user?.id,created_by_name:profile?.full_name};
    const{data,error}=await(supabase as any).from("receipt_vouchers").insert(payload).select().single();
    if(error){toast({title:"Error",description:error.message,variant:"destructive"});}
    else{logAudit(user?.id,profile?.full_name,"create","receipt_vouchers",data?.id,{received_from:form.received_from});toast({title:"Receipt Voucher created ✓"});setShowNew(false);load();}
    setSaving(false);
  };

  const deleteRow = async (id:string) => {
    if(!confirm("Delete this receipt voucher?")) return;
    await (supabase as any).from("receipt_vouchers").delete().eq("id",id);
    toast({title:"Deleted"}); load();
  };

  const printVoucher = (v:any) => {
    const w=window.open("","_blank","width=900,height=700");
    if(!w) return;
    const logo=logoUrl?`<img src="${logoUrl}" style="height:50px;object-fit:contain">`:""
    w.document.write(`<html><head><title>Receipt Voucher</title>
    <style>
      body{font-family:'Segoe UI',Arial;margin:0;padding:0;font-size:11px}
      .lh{background:#0a2558;color:#fff;padding:12px 20px;display:flex;align-items:center;gap:12px}
      .lh-info h2{margin:0;font-size:16px;font-weight:900} .lh-info small{opacity:0.6;font-size:10px}
      .body{padding:20px}
      .title-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid #e5e7eb}
      .badge{padding:6px 16px;border-radius:20px;font-size:11px;font-weight:700;background:#dcfce7;color:#15803d}
      table{width:100%;border-collapse:collapse;margin-top:12px}
      td{padding:8px 12px;vertical-align:top} td:first-child{font-weight:700;color:#6b7280;width:35%;font-size:10px;text-transform:uppercase}
      tr{border-bottom:1px solid #f3f4f6} .amount-row td{font-size:16px;font-weight:900;color:#0a2558}
      .sig{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb}
      .sig-item{text-align:center} .sig-line{border-bottom:1px solid #374151;margin-bottom:4px;height:40px}
      .footer{margin-top:30px;padding-top:10px;border-top:1px solid #e5e7eb;text-align:center;font-size:9px;color:#9ca3af}
      @media print{@page{margin:1cm}body{margin:0}}
    </style></head><body>
    <div class="lh">${logo}<div class="lh-info"><h2>${hospitalName}</h2><small>OFFICIAL RECEIPT VOUCHER</small></div><div style="margin-left:auto;font-size:11px;opacity:0.7">${v.receipt_number}</div></div>
    <div class="body">
      <div class="title-row"><div><h3 style="margin:0;font-size:14px;font-weight:900;color:#0a2558">RECEIPT VOUCHER</h3><p style="margin:4px 0 0;color:#6b7280;font-size:11px">${v.receipt_number}</p></div><span class="badge">${v.status}</span></div>
      <table>
        <tr><td>Received From</td><td style="font-weight:700;font-size:13px">${v.received_from}</td></tr>
        <tr class="amount-row"><td>Amount Received</td><td>${fmtKES(v.amount)}</td></tr>
        <tr><td>Payment Method</td><td>${v.payment_method||"—"}</td></tr>
        <tr><td>Receipt Date</td><td>${new Date(v.receipt_date).toLocaleDateString("en-KE",{year:"numeric",month:"long",day:"numeric"})}</td></tr>
        ${v.reference?`<tr><td>Reference No.</td><td>${v.reference}</td></tr>`:""}
        ${v.bank_name?`<tr><td>Bank</td><td>${v.bank_name}</td></tr>`:""}
        ${v.bank_reference?`<tr><td>Bank Reference</td><td>${v.bank_reference}</td></tr>`:""}
        ${v.income_account?`<tr><td>Income Account</td><td>${v.income_account}</td></tr>`:""}
        ${v.description?`<tr><td>Description</td><td>${v.description}</td></tr>`:""}
        <tr><td>Created By</td><td>${v.created_by_name||"—"}</td></tr>
      </table>
      <div class="sig">
        <div class="sig-item"><div class="sig-line"></div><p>Received By</p><p style="font-size:9px;color:#9ca3af">${v.received_from}</p></div>
        <div class="sig-item"><div class="sig-line"></div><p>Issued By</p><p style="font-size:9px;color:#9ca3af">${v.created_by_name||""} · Finance</p></div>
      </div>
      <div class="footer">${hospitalName} · ${v.receipt_number} · Printed ${new Date().toLocaleString("en-KE")}</div>
    </div></body></html>`);
    w.document.close(); w.focus(); setTimeout(()=>w.print(),400);
  };

  const exportExcel = () => {
    const wb=XLSX.utils.book_new(); const ws=XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb,ws,"Receipt Vouchers");
    XLSX.writeFile(wb,`receipt_vouchers_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast({title:"Exported"});
  };

  const filtered = search ? rows.filter(r=>Object.values(r).some(v=>String(v||"").toLowerCase().includes(search.toLowerCase()))) : rows;
  const totalAmt = filtered.reduce((s,r)=>s+Number(r.amount||0),0);

  const F = ({label,k,type="text",req=false}:{label:string;k:string;type?:string;req?:boolean}) => (
    <div><label className="block mb-1 text-xs font-semibold text-gray-500">{label}{req&&" *"}</label>
    <input type={type} value={form[k as keyof typeof form]||""} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))}
      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"/></div>
  );

  return (
    <div
      style={{fontFamily:"'Segoe UI',system-ui,sans-serif"}}
    >
    <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @media(max-width:768px){.vpage-header{flex-direction:column!important;align-items:flex-start!important}.vpage-filters{flex-wrap:wrap!important}.vpage-table{font-size:11px!important}}
        @media(max-width:480px){.vpage-btns{flex-wrap:wrap!important;gap:6px!important}}
      `}</style>
    <div className="p-4 space-y-4" style={{fontFamily:"'Segoe UI',system-ui"}}>
      {/* Header */}
      <div className="rounded-2xl px-5 py-3 flex items-center justify-between" style={{background:"linear-gradient(90deg,#065f46,#047857)"}}>
        <div><h1 className="text-base font-black text-white">Receipt Vouchers</h1>
          <p className="text-[10px] text-white/50">{rows.length} records · Total: {fmtKES(totalAmt)}</p></div>
        <div className="flex gap-2">
          <button onClick={exportExcel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold" style={{background:"rgba(255,255,255,0.15)",color:"#fff"}}><Download className="w-3.5 h-3.5"/>Export</button>
          {canCreate&&<button onClick={()=>setShowNew(true)} className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold" style={{background:"rgba(255,255,255,0.92)",color:"#065f46"}}><Plus className="w-3.5 h-3.5"/>New Receipt</button>}
        </div>
      </div>
      {/* Search */}
      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search vouchers…"
          className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm outline-none"/></div>
      {/* Table */}
      <div className="rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-xs">
          <thead><tr style={{background:"#f0fdf4"}}>
            {["Receipt No.","Received From","Amount","Method","Date","Status","Actions"].map(h=>(
              <th key={h} className="px-4 py-3 text-left font-bold text-gray-600 text-[10px] uppercase tracking-wide">{h}</th>))}
          </tr></thead>
          <tbody>
            {loading?<tr><td colSpan={7} className="px-4 py-8 text-center"><RefreshCw className="w-4 h-4 animate-spin text-gray-300 mx-auto"/></td></tr>:
            filtered.length===0?<tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-xs">No receipt vouchers yet</td></tr>:
            filtered.map((r,i)=>(
              <tr key={r.id} style={{borderBottom:"1px solid #f3f4f6",background:i%2===0?"#fff":"#fafafa"}}>
                <td className="px-4 py-2.5 font-bold" style={{color:"#065f46"}}>{r.receipt_number}</td>
                <td className="px-4 py-2.5 font-medium text-gray-800">{r.received_from}</td>
                <td className="px-4 py-2.5 font-bold text-gray-800">{fmtKES(r.amount)}</td>
                <td className="px-4 py-2.5 text-gray-600">{r.payment_method}</td>
                <td className="px-4 py-2.5 text-gray-500">{new Date(r.receipt_date).toLocaleDateString("en-KE")}</td>
                <td className="px-4 py-2.5"><span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{background:`${SC[r.status]||"#9ca3af"}20`,color:SC[r.status]||"#9ca3af"}}>{r.status}</span></td>
                <td className="px-4 py-2.5"><div className="flex gap-1.5">
                  <button onClick={()=>setDetail(r)} className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100"><Eye className="w-3 h-3 text-blue-600"/></button>
                  <button onClick={()=>printVoucher(r)} className="p-1.5 rounded-lg bg-green-50 hover:bg-green-100"><Printer className="w-3 h-3 text-green-600"/></button>
                  {hasRole("admin")&&<button onClick={()=>deleteRow(r.id)} className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100"><Trash2 className="w-3 h-3 text-red-500"/></button>}
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* New Modal */}
      {showNew&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(4px)"}} onClick={()=>setShowNew(false)}/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5 space-y-4 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-gray-800">New Receipt Voucher</h3>
              <button onClick={()=>setShowNew(false)}><X className="w-5 h-5 text-gray-400"/></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><F label="Received From" k="received_from" req/></div>
              <F label="Amount (KES)" k="amount" type="number" req/>
              <div><label className="block mb-1 text-xs font-semibold text-gray-500">Payment Method</label>
                <select value={form.payment_method} onChange={e=>setForm(p=>({...p,payment_method:e.target.value}))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none">
                  {["Cash","Cheque","EFT","MPESA","Bank Transfer"].map(m=><option key={m}>{m}</option>)}
                </select></div>
              <F label="Receipt Date" k="receipt_date" type="date" req/>
              <F label="Reference No." k="reference"/>
              <F label="Bank Name" k="bank_name"/>
              <F label="Bank Reference" k="bank_reference"/>
              <F label="Income Account" k="income_account"/>
              <div><label className="block mb-1 text-xs font-semibold text-gray-500">Department</label>
                <select value={form.department_id} onChange={e=>setForm(p=>({...p,department_id:e.target.value}))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none">
                  <option value="">— Select —</option>
                  {depts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                </select></div>
              <div className="col-span-2"><label className="block mb-1 text-xs font-semibold text-gray-500">Description</label>
                <textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none resize-none"/></div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={()=>setShowNew(false)} className="px-4 py-2 rounded-xl border text-sm">Cancel</button>
              <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-bold" style={{background:"#065f46"}}>
                {saving?<RefreshCw className="w-3.5 h-3.5 animate-spin"/>:<Save className="w-3.5 h-3.5"/>}
                {saving?"Saving…":"Create Receipt"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Detail Modal */}
      {detail&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)"}} onClick={()=>setDetail(null)}/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-gray-800">Receipt Voucher — {detail.receipt_number}</h3>
              <div className="flex gap-2">
                <button onClick={()=>printVoucher(detail)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold" style={{background:"#065f46",color:"#fff"}}><Printer className="w-3 h-3"/>Print</button>
                <button onClick={()=>setDetail(null)}><X className="w-5 h-5 text-gray-400"/></button>
              </div>
            </div>
            <div className="space-y-2">
              {[["Received From",detail.received_from],["Amount",fmtKES(detail.amount)],["Method",detail.payment_method],["Date",new Date(detail.receipt_date).toLocaleDateString("en-KE")],["Reference",detail.reference],["Bank",detail.bank_name],["Income Account",detail.income_account],["Description",detail.description],["Status",detail.status],["Created By",detail.created_by_name]].filter(([,v])=>v).map(([l,v])=>(
                <div key={l} className="flex justify-between py-1.5 border-b border-gray-50">
                  <span className="text-xs font-semibold text-gray-500">{l}</span>
                  <span className="text-xs font-medium text-gray-800">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
