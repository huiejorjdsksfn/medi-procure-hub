import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import { Plus, Search, RefreshCw, Printer, Download, X, Save, Eye, Trash2, CheckCircle, BookOpen } from "lucide-react";
import * as XLSX from "xlsx";

const fmtKES = (n:number) => `KES ${Number(n||0).toLocaleString("en-KE",{minimumFractionDigits:2})}`;
const genNo = () => `JV-EL5H-${new Date().getFullYear()}-${String(Math.floor(1000+Math.random()*9000))}`;
const SC: Record<string,string> = {draft:"#6b7280",approved:"#15803d",posted:"#0369a1",rejected:"#dc2626"};

export default function JournalVouchersPage() {
  const { user, profile, hasRole } = useAuth();
  const canApprove = hasRole("admin")||hasRole("procurement_manager");
  const [rows, setRows] = useState<any[]>([]);
  const [coa, setCoa] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [form, setForm] = useState({journal_date:new Date().toISOString().slice(0,10),reference:"",period:"",narration:""});
  const [entries, setEntries] = useState<{account_code:string;account_name:string;debit:string;credit:string;description:string}[]>([
    {account_code:"",account_name:"",debit:"",credit:"",description:""},
    {account_code:"",account_name:"",debit:"",credit:"",description:""},
  ]);
  const [saving, setSaving] = useState(false);
  const [hospitalName, setHospitalName] = useState("Embu Level 5 Hospital");
  const [logoUrl, setLogoUrl] = useState<string|null>(null);

  const load = async () => {
    setLoading(true);
    const [{data:jv},{data:c},{data:s}] = await Promise.all([
      (supabase as any).from("journal_vouchers").select("*").order("created_at",{ascending:false}),
      (supabase as any).from("chart_of_accounts").select("account_code,account_name").eq("is_active",true).order("account_code"),
      (supabase as any).from("system_settings").select("key,value").in("key",["hospital_name","system_logo_url"]),
    ]);
    setRows(jv||[]); setCoa(c||[]);
    const m:any={}; (s||[]).forEach((x:any)=>{if(x.key)m[x.key]=x.value;});
    if(m.hospital_name) setHospitalName(m.hospital_name);
    if(m.system_logo_url) setLogoUrl(m.system_logo_url);
    setLoading(false);
  };
  useEffect(()=>{load();},[]);

  const totalDebit = entries.reduce((s,e)=>s+Number(e.debit||0),0);
  const totalCredit = entries.reduce((s,e)=>s+Number(e.credit||0),0);
  const isBalanced = Math.abs(totalDebit-totalCredit)<0.01 && totalDebit>0;

  const save = async () => {
    if(!form.narration){toast({title:"Narration required",variant:"destructive"});return;}
    if(!isBalanced){toast({title:"Journal is not balanced — debits must equal credits",variant:"destructive"});return;}
    setSaving(true);
    const payload={...form,journal_number:genNo(),entries:entries.filter(e=>e.account_code||e.debit||e.credit),
      total_debit:totalDebit,total_credit:totalCredit,is_balanced:isBalanced,status:"draft",
      created_by:user?.id,created_by_name:profile?.full_name};
    const{data,error}=await(supabase as any).from("journal_vouchers").insert(payload).select().single();
    if(error){toast({title:"Error",description:error.message,variant:"destructive"});}
    else{logAudit(user?.id,profile?.full_name,"create","journal_vouchers",data?.id,{number:payload.journal_number});toast({title:"Journal Voucher created ✓"});setShowNew(false);load();}
    setSaving(false);
  };

  const approve = async (id:string) => {
    await(supabase as any).from("journal_vouchers").update({status:"approved",approved_by:user?.id,approved_by_name:profile?.full_name}).eq("id",id);
    toast({title:"Journal approved ✓"}); load();
  };

  const deleteRow = async (id:string) => {
    if(!confirm("Delete this journal voucher?")) return;
    await(supabase as any).from("journal_vouchers").delete().eq("id",id);
    toast({title:"Deleted"}); load();
  };

  const exportExcel = () => {
    const wb=XLSX.utils.book_new(); const ws=XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb,ws,"Journal Vouchers");
    XLSX.writeFile(wb,`journal_vouchers_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast({title:"Exported"});
  };

  const printVoucher = (v:any) => {
    const w=window.open("","_blank","width=1000,height=700");
    if(!w) return;
    const logo=logoUrl?`<img src="${logoUrl}" style="height:50px;object-fit:contain">`:""
    const entriesHtml=(v.entries||[]).map((e:any,i:number)=>`<tr><td>${i+1}</td><td>${e.account_code||""}</td><td>${e.account_name||""}</td><td>${e.description||""}</td><td style="text-align:right">${e.debit?fmtKES(Number(e.debit)):""}</td><td style="text-align:right">${e.credit?fmtKES(Number(e.credit)):""}</td></tr>`).join("");
    w.document.write(`<html><head><title>Journal Voucher</title>
    <style>body{font-family:'Segoe UI',Arial;margin:0;padding:0;font-size:11px}
    .lh{background:#1e3a5f;color:#fff;padding:12px 20px;display:flex;align-items:center;gap:12px}
    .lh-info h2{margin:0;font-size:16px;font-weight:900}.body{padding:20px}
    table{width:100%;border-collapse:collapse;font-size:10px;margin-top:12px}
    th{background:#1e3a5f;color:#fff;padding:7px 10px;text-align:left;font-size:9px;font-weight:700;text-transform:uppercase}
    td{padding:6px 10px;border-bottom:1px solid #f3f4f6}
    tr:nth-child(even) td{background:#f9fafb}
    .total-row td{background:#e0f2fe;font-weight:800;font-size:12px}
    @media print{@page{margin:1cm}}</style></head><body>
    <div class="lh">${logo}<div class="lh-info"><h2>${hospitalName}</h2><small>JOURNAL VOUCHER — ${v.journal_number}</small></div></div>
    <div class="body">
      <table style="margin-bottom:16px;font-size:11px">
        <tr><td style="font-weight:700;color:#666;width:30%">Journal No.</td><td>${v.journal_number}</td><td style="font-weight:700;color:#666;width:30%">Date</td><td>${new Date(v.journal_date).toLocaleDateString("en-KE",{year:"numeric",month:"long",day:"numeric"})}</td></tr>
        <tr><td style="font-weight:700;color:#666">Reference</td><td>${v.reference||"—"}</td><td style="font-weight:700;color:#666">Period</td><td>${v.period||"—"}</td></tr>
        <tr><td style="font-weight:700;color:#666">Narration</td><td colspan="3">${v.narration}</td></tr>
        <tr><td style="font-weight:700;color:#666">Status</td><td>${v.status}</td><td style="font-weight:700;color:#666">Prepared By</td><td>${v.created_by_name||"—"}</td></tr>
      </table>
      <table><thead><tr><th>#</th><th>Account Code</th><th>Account Name</th><th>Description</th><th>Debit (KES)</th><th>Credit (KES)</th></tr></thead>
      <tbody>${entriesHtml}
      <tr class="total-row"><td colspan="4" style="text-align:right">TOTALS</td><td style="text-align:right">${fmtKES(v.total_debit)}</td><td style="text-align:right">${fmtKES(v.total_credit)}</td></tr>
      </tbody></table>
      <p style="margin-top:8px;font-size:10px;color:${v.is_balanced?"#15803d":"#dc2626"};font-weight:700">${v.is_balanced?"✓ BALANCED":"⚠ NOT BALANCED"}</p>
    </div></body></html>`);
    w.document.close(); w.focus(); setTimeout(()=>w.print(),400);
  };

  const updateEntry = (i:number, k:string, val:string) => {
    setEntries(p=>{const n=[...p]; n[i]={...n[i],[k]:val};
      if(k==="account_code"){const a=coa.find(c=>c.account_code===val); if(a)n[i].account_name=a.account_name;}
      return n;
    });
  };

  const filtered = search ? rows.filter(r=>Object.values(r).some(v=>String(v||"").toLowerCase().includes(search.toLowerCase()))) : rows;

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
      <div className="rounded-2xl px-5 py-3 flex items-center justify-between" style={{background:"linear-gradient(90deg,#1e1b4b,#312e81)"}}>
        <div><h1 className="text-base font-black text-white">Journal Vouchers</h1>
          <p className="text-[10px] text-white/50">{rows.length} entries</p></div>
        <div className="flex gap-2">
          <button onClick={exportExcel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold" style={{background:"rgba(255,255,255,0.15)",color:"#fff"}}><Download className="w-3.5 h-3.5"/>Export</button>
          {canApprove&&<button onClick={()=>setShowNew(true)} className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold" style={{background:"rgba(255,255,255,0.92)",color:"#312e81"}}><Plus className="w-3.5 h-3.5"/>New Journal</button>}
        </div>
      </div>
      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search journals…"
          className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm outline-none"/></div>
      <div className="rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-xs">
          <thead><tr style={{background:"#eef2ff"}}>
            {["Journal No.","Date","Reference","Narration","Debit","Credit","Balanced","Status","Actions"].map(h=>(
              <th key={h} className="px-4 py-3 text-left font-bold text-gray-600 text-[10px] uppercase">{h}</th>))}
          </tr></thead>
          <tbody>
            {loading?<tr><td colSpan={9} className="px-4 py-8 text-center"><RefreshCw className="w-4 h-4 animate-spin text-gray-300 mx-auto"/></td></tr>:
            filtered.length===0?<tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No journal vouchers</td></tr>:
            filtered.map((r,i)=>(
              <tr key={r.id} style={{borderBottom:"1px solid #f3f4f6",background:i%2===0?"#fff":"#fafafa"}}>
                <td className="px-4 py-2.5 font-bold" style={{color:"#312e81"}}>{r.journal_number}</td>
                <td className="px-4 py-2.5">{new Date(r.journal_date).toLocaleDateString("en-KE")}</td>
                <td className="px-4 py-2.5 text-gray-500">{r.reference||"—"}</td>
                <td className="px-4 py-2.5 text-gray-700 max-w-[160px] truncate">{r.narration}</td>
                <td className="px-4 py-2.5 font-semibold">{fmtKES(r.total_debit)}</td>
                <td className="px-4 py-2.5 font-semibold">{fmtKES(r.total_credit)}</td>
                <td className="px-4 py-2.5"><span className="text-[10px] font-bold" style={{color:r.is_balanced?"#15803d":"#dc2626"}}>{r.is_balanced?"✓ Yes":"✗ No"}</span></td>
                <td className="px-4 py-2.5"><span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{background:`${SC[r.status]||"#9ca3af"}20`,color:SC[r.status]||"#9ca3af"}}>{r.status}</span></td>
                <td className="px-4 py-2.5"><div className="flex gap-1.5">
                  <button onClick={()=>setDetail(r)} className="p-1.5 rounded-lg bg-blue-50"><Eye className="w-3 h-3 text-blue-600"/></button>
                  <button onClick={()=>printVoucher(r)} className="p-1.5 rounded-lg bg-green-50"><Printer className="w-3 h-3 text-green-600"/></button>
                  {canApprove&&r.status==="draft"&&<button onClick={()=>approve(r.id)} className="p-1.5 rounded-lg bg-emerald-50" title="Approve"><CheckCircle className="w-3 h-3 text-emerald-600"/></button>}
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
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(4px)"}} onClick={()=>setShowNew(false)}/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-5 overflow-y-auto max-h-[90vh] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-gray-800">New Journal Voucher</h3>
              <button onClick={()=>setShowNew(false)}><X className="w-5 h-5 text-gray-400"/></button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block mb-1 text-xs font-semibold text-gray-500">Date *</label>
                <input type="date" value={form.journal_date} onChange={e=>setForm(p=>({...p,journal_date:e.target.value}))} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none"/></div>
              <div><label className="block mb-1 text-xs font-semibold text-gray-500">Reference</label>
                <input value={form.reference} onChange={e=>setForm(p=>({...p,reference:e.target.value}))} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none"/></div>
              <div><label className="block mb-1 text-xs font-semibold text-gray-500">Period</label>
                <input value={form.period} onChange={e=>setForm(p=>({...p,period:e.target.value}))} placeholder="e.g. Jan 2026" className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none"/></div>
              <div className="col-span-3"><label className="block mb-1 text-xs font-semibold text-gray-500">Narration *</label>
                <textarea value={form.narration} onChange={e=>setForm(p=>({...p,narration:e.target.value}))} rows={2} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none resize-none"/></div>
            </div>
            {/* Entries table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Journal Entries</label>
                <button onClick={()=>setEntries(p=>[...p,{account_code:"",account_name:"",debit:"",credit:"",description:""}])}
                  className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                  <Plus className="w-3 h-3"/>Add Line
                </button>
              </div>
              <table className="w-full text-xs" style={{borderCollapse:"collapse"}}>
                <thead><tr style={{background:"#eef2ff"}}>
                  {["Account Code","Account Name","Description","Debit","Credit",""].map(h=><th key={h} className="px-2 py-2 text-left font-bold text-gray-600 text-[10px]">{h}</th>)}
                </tr></thead>
                <tbody>
                  {entries.map((e,i)=>(
                    <tr key={i} style={{borderBottom:"1px solid #f3f4f6"}}>
                      <td className="px-1 py-1">
                        <input list={`coa-${i}`} value={e.account_code} onChange={ev=>updateEntry(i,"account_code",ev.target.value)}
                          className="w-24 px-2 py-1 rounded border border-gray-200 text-xs outline-none"/>
                        <datalist id={`coa-${i}`}>{coa.map(c=><option key={c.account_code} value={c.account_code}>{c.account_name}</option>)}</datalist>
                      </td>
                      <td className="px-1 py-1"><input value={e.account_name} onChange={ev=>updateEntry(i,"account_name",ev.target.value)} className="w-32 px-2 py-1 rounded border border-gray-200 text-xs outline-none"/></td>
                      <td className="px-1 py-1"><input value={e.description} onChange={ev=>updateEntry(i,"description",ev.target.value)} className="w-28 px-2 py-1 rounded border border-gray-200 text-xs outline-none"/></td>
                      <td className="px-1 py-1"><input type="number" value={e.debit} onChange={ev=>updateEntry(i,"debit",ev.target.value)} className="w-24 px-2 py-1 rounded border border-gray-200 text-xs outline-none text-right"/></td>
                      <td className="px-1 py-1"><input type="number" value={e.credit} onChange={ev=>updateEntry(i,"credit",ev.target.value)} className="w-24 px-2 py-1 rounded border border-gray-200 text-xs outline-none text-right"/></td>
                      <td className="px-1 py-1"><button onClick={()=>setEntries(p=>p.filter((_,j)=>j!==i))} className="text-red-400 hover:text-red-600"><X className="w-3 h-3"/></button></td>
                    </tr>
                  ))}
                  <tr style={{background:"#f0fdf4",fontWeight:800}}>
                    <td colSpan={3} className="px-2 py-2 text-right text-xs font-bold text-gray-700">TOTALS</td>
                    <td className="px-2 py-2 text-xs font-bold text-right" style={{color:"#1a3a6b"}}>{fmtKES(totalDebit)}</td>
                    <td className="px-2 py-2 text-xs font-bold text-right" style={{color:"#1a3a6b"}}>{fmtKES(totalCredit)}</td>
                    <td className="px-2 py-2 text-xs font-bold" style={{color:isBalanced?"#15803d":"#dc2626"}}>{isBalanced?"✓ Balanced":"✗ Unbalanced"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={()=>setShowNew(false)} className="px-4 py-2 rounded-xl border text-sm">Cancel</button>
              <button onClick={save} disabled={saving||!isBalanced}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-50"
                style={{background:"#312e81"}}>
                {saving?<RefreshCw className="w-3.5 h-3.5 animate-spin"/>:<Save className="w-3.5 h-3.5"/>}
                {saving?"Saving…":"Create Journal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
