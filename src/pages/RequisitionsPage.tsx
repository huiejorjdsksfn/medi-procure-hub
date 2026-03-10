import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import {
  Plus, Search, X, RefreshCw, FileSpreadsheet, Printer, Eye,
  CheckCircle, XCircle, Clock, ClipboardList, ChevronDown, Send,
  AlertTriangle, Download
} from "lucide-react";
import * as XLSX from "xlsx";
import { notifyProcurement, sendNotification } from "@/lib/notify";

const STATUS_CFG: Record<string,{bg:string;color:string;label:string}> = {
  draft:     {bg:"#f3f4f6",color:"#6b7280",label:"Draft"},
  submitted: {bg:"#dbeafe",color:"#1d4ed8",label:"Submitted"},
  pending:   {bg:"#fef3c7",color:"#92400e",label:"Pending"},
  approved:  {bg:"#dcfce7",color:"#15803d",label:"Approved"},
  rejected:  {bg:"#fee2e2",color:"#dc2626",label:"Rejected"},
  ordered:   {bg:"#e0f2fe",color:"#0369a1",label:"Ordered"},
  received:  {bg:"#d1fae5",color:"#065f46",label:"Received"},
};

export default function RequisitionsPage() {
  const { user, profile, roles } = useAuth();
  const canApprove = roles.includes("admin") || roles.includes("procurement_manager");
  const canCreate = !roles.includes("warehouse_officer") && !roles.includes("inventory_manager");
  const [reqs, setReqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewReq, setViewReq] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({title:"",department:"",priority:"normal",notes:"",delivery_date:""});
  const [saving, setSaving] = useState(false);
  const [hospitalName, setHospitalName] = useState("Embu Level 5 Hospital");
  const [sysName, setSysName] = useState("EL5 MediProcure");

  useEffect(()=>{
    (supabase as any).from("system_settings").select("key,value").in("key",["system_name","hospital_name"])
      .then(({data}:any)=>{ if(!data) return; const m:any={}; data.forEach((r:any)=>{ if(r.key) m[r.key]=r.value; }); if(m.system_name) setSysName(m.system_name); if(m.hospital_name) setHospitalName(m.hospital_name); });
  },[]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any).from("requisitions")
      .select("*,requisition_items(*)")
      .order("created_at",{ascending:false});
    setReqs(data||[]);
    setLoading(false);
  },[]);

  useEffect(()=>{ load(); },[load]);

  const approve = async (id:string) => {
    const req = reqs.find(r=>r.id===id);
    await (supabase as any).from("requisitions").update({status:"approved",approved_by:user?.id,approved_at:new Date().toISOString()}).eq("id",id);
    logAudit(user?.id,profile?.full_name,"approve","requisitions",id,{});
    toast({title:"Requisition Approved ✓"});
    // Notify the requester
    if(req?.requested_by) await sendNotification({userId:req.requested_by,title:"Requisition Approved ✓",message:`Your requisition "${req.title||req.requisition_number}" has been approved.`,type:"success",module:"Procurement",actionUrl:"/requisitions"});
    await notifyProcurement({title:"Requisition Approved",message:`${profile?.full_name||"Manager"} approved requisition ${req?.requisition_number||id.slice(0,8)}`,type:"procurement",module:"Procurement",actionUrl:"/requisitions"});
    load();
  };
  const reject = async (id:string) => {
    const req = reqs.find(r=>r.id===id);
    await (supabase as any).from("requisitions").update({status:"rejected"}).eq("id",id);
    logAudit(user?.id,profile?.full_name,"reject","requisitions",id,{});
    toast({title:"Requisition Rejected",variant:"destructive"});
    if(req?.requested_by) await sendNotification({userId:req.requested_by,title:"Requisition Rejected",message:`Your requisition "${req.title||req.requisition_number}" was not approved.`,type:"warning",module:"Procurement",actionUrl:"/requisitions"});
    load();
  };

  const save = async () => {
    if(!form.title.trim()){toast({title:"Title required",variant:"destructive"});return;}
    setSaving(true);
    const prefix="RQQ/EL5H";
    const num=`${prefix}/${new Date().getFullYear()}/${String(reqs.length+1).padStart(4,"0")}`;
    const {data,error}=await (supabase as any).from("requisitions").insert({
      ...form, requisition_number:num, status:"draft",
      requested_by:user?.id, requester_name:profile?.full_name,
    }).select().single();
    if(error){toast({title:"Error",description:error.message,variant:"destructive"});setSaving(false);return;}
    logAudit(user?.id,profile?.full_name,"create","requisitions",data?.id,{title:form.title});
    toast({title:"Requisition Created",description:num});
    await notifyProcurement({title:"New Requisition Submitted",message:`${profile?.full_name||"Staff"} submitted requisition ${num}`,type:"procurement",module:"Procurement",actionUrl:"/requisitions"});
    setShowForm(false);
    setForm({title:"",department:"",priority:"normal",notes:"",delivery_date:""});
    load();
    setSaving(false);
  };

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const header = [[hospitalName],[sysName+" — Requisitions Register"],[`Generated: ${new Date().toLocaleString("en-KE")}`],[]];
    const rows = filtered.map(r=>({
      "Req No.":r.requisition_number,"Title":r.title,"Department":r.department,
      "Priority":r.priority,"Status":r.status,"Requester":r.requester_name,
      "Amount":r.total_amount||0,"Date":r.created_at?new Date(r.created_at).toLocaleDateString("en-KE"):"",
      "Approved By":r.approved_by||"","Notes":r.notes||"",
    }));
    const ws = XLSX.utils.aoa_to_sheet([...header,...[Object.keys(rows[0]||{})],...rows.map(r=>Object.values(r))]);
    ws["!cols"] = Object.keys(rows[0]||{}).map(()=>({wch:18}));
    XLSX.utils.book_append_sheet(wb,ws,"Requisitions");
    XLSX.writeFile(wb,`Requisitions_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast({title:"Exported",description:`${filtered.length} records`});
  };

  const printReq = (r:any) => {
    const win=window.open("","_blank","width=800,height=600");
    if(!win) return;
    const items = (r.requisition_items||[]).map((i:any)=>`<tr><td style="padding:6px 8px;border-bottom:1px solid #f3f4f6">${i.item_name||"—"}</td><td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;text-align:right">${i.quantity||0}</td><td style="padding:6px 8px;border-bottom:1px solid #f3f4f6">${i.unit_of_measure||"—"}</td><td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;text-align:right">KES ${Number(i.unit_price||0).toLocaleString()}</td><td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;text-align:right">KES ${Number((i.quantity||0)*(i.unit_price||0)).toLocaleString()}</td></tr>`).join("");
    win.document.write(`<html><head><title>${r.requisition_number}</title>
    <style>body{font-family:'Segoe UI',Arial;margin:0;padding:20px;font-size:12px;color:#1f2937}.lh{background:#0a2558;color:#fff;padding:15px 20px;margin:-20px -20px 20px}.lh h2{margin:0;font-size:18px}.lh small{opacity:0.6;font-size:10px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:15px}.field{}.lbl{font-size:9px;font-weight:700;color:#888;text-transform:uppercase;margin-bottom:2px}.val{font-size:12px;color:#1f2937}table{width:100%;border-collapse:collapse}thead tr{background:#1a3a6b;color:#fff}th{padding:8px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase}@media print{@page{margin:1cm}}</style>
    </head><body>
    <div class="lh"><h2>${hospitalName}</h2><small>${sysName} · Requisition Voucher</small></div>
    <h3 style="color:#1a3a6b;margin-bottom:12px">${r.requisition_number}</h3>
    <div class="grid">
      <div class="field"><div class="lbl">Title</div><div class="val">${r.title||"—"}</div></div>
      <div class="field"><div class="lbl">Department</div><div class="val">${r.department||"—"}</div></div>
      <div class="field"><div class="lbl">Status</div><div class="val">${r.status||"—"}</div></div>
      <div class="field"><div class="lbl">Priority</div><div class="val">${r.priority||"—"}</div></div>
      <div class="field"><div class="lbl">Requester</div><div class="val">${r.requester_name||"—"}</div></div>
      <div class="field"><div class="lbl">Date</div><div class="val">${r.created_at?new Date(r.created_at).toLocaleDateString("en-KE"):"—"}</div></div>
    </div>
    <table><thead><tr><th>Item</th><th style="text-align:right">Qty</th><th>UoM</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Total</th></tr></thead>
    <tbody>${items||"<tr><td colspan='5' style='text-align:center;padding:12px;color:#9ca3af'>No items</td></tr>"}</tbody></table>
    <div style="margin-top:15px;border-top:2px solid #1a3a6b;padding-top:10px;text-align:right">
      <strong>Total: KES ${Number(r.total_amount||0).toLocaleString()}</strong>
    </div>
    <div style="margin-top:30px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px">
      ${["Requested By","Recommended By","Approved By"].map(s=>`<div><div style="border-top:1px solid #ccc;margin-bottom:4px;padding-top:4px;font-size:9px;color:#888">${s}</div></div>`).join("")}
    </div>
    </body></html>`);
    win.document.close();win.focus();setTimeout(()=>win.print(),400);
  };

  const filtered = reqs.filter(r=>{
    if(statusFilter!=="all"&&r.status!==statusFilter) return false;
    if(search){const q=search.toLowerCase();return (r.title||"").toLowerCase().includes(q)||(r.requisition_number||"").toLowerCase().includes(q)||(r.department||"").toLowerCase().includes(q)||(r.requester_name||"").toLowerCase().includes(q);}
    return true;
  });

  const stats = {all:reqs.length,pending:reqs.filter(r=>r.status==="pending"||r.status==="submitted").length,approved:reqs.filter(r=>r.status==="approved").length,rejected:reqs.filter(r=>r.status==="rejected").length};

  return (
    <div className="p-4 space-y-3" style={{fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      {/* Header */}
      <div className="rounded-2xl px-5 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
        style={{background:"linear-gradient(90deg,#0a2558,#1a3a6b,#1d4a87)",boxShadow:"0 4px 16px rgba(26,58,107,0.35)"}}>
        <div className="flex items-center gap-3">
          <ClipboardList className="w-5 h-5 text-white"/>
          <div>
            <h1 className="text-base font-black text-white">Requisitions</h1>
            <p className="text-[10px] text-white/50">{filtered.length} of {reqs.length} records</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={load} disabled={loading} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/15 text-white text-xs font-semibold hover:bg-white/25">
            <RefreshCw className={`w-3.5 h-3.5 ${loading?"animate-spin":""}`}/>
          </button>
          <button onClick={exportExcel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/80 text-white text-xs font-semibold hover:bg-green-500">
            <FileSpreadsheet className="w-3.5 h-3.5"/>Export
          </button>
          {canCreate && (
            <button onClick={()=>setShowForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-blue-900 text-xs font-bold hover:bg-blue-50">
              <Plus className="w-3.5 h-3.5"/>New Requisition
            </button>
          )}
        </div>
      </div>

      {/* Stat chips */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(stats).map(([k,v])=>(
          <button key={k} onClick={()=>setStatusFilter(k==="all"?"all":k)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{
              background:statusFilter===(k==="all"?"all":k)?"#1a3a6b":"#f3f4f6",
              color:statusFilter===(k==="all"?"all":k)?"#fff":"#6b7280"
            }}>
            {k==="pending"&&<Clock className="w-3 h-3"/>}
            {k==="approved"&&<CheckCircle className="w-3 h-3"/>}
            {k==="rejected"&&<XCircle className="w-3 h-3"/>}
            <span className="capitalize">{k}</span>
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold"
              style={{background:statusFilter===(k==="all"?"all":k)?"rgba(255,255,255,0.25)":"#e5e7eb"}}>
              {String(v)}
            </span>
          </button>
        ))}
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search requisitions…"
            className="pl-8 pr-8 py-1.5 rounded-full border border-gray-200 text-xs outline-none focus:border-blue-400 w-52"/>
          {search&&<button onClick={()=>setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-3 h-3 text-gray-400"/></button>}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" style={{fontSize:12}}>
            <thead>
              <tr style={{background:"#0a2558"}}>
                {["#","Req Number","Title","Department","Priority","Status","Requester","Amount","Date","Actions"].map(h=>(
                  <th key={h} className="text-left px-3 py-2.5 text-white/70 font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading?(
                Array(5).fill(0).map((_,i)=>(
                  <tr key={i}><td colSpan={10} className="px-4 py-3 animate-pulse"><div className="h-3 bg-gray-200 rounded w-full"/></td></tr>
                ))
              ):filtered.length===0?(
                <tr><td colSpan={10} className="px-4 py-10 text-center text-gray-400">No requisitions found</td></tr>
              ):filtered.map((r,i)=>{
                const s=STATUS_CFG[r.status]||{bg:"#f3f4f6",color:"#6b7280",label:r.status};
                const isPending = r.status==="submitted"||r.status==="pending";
                return (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-blue-50/20 transition-colors group">
                    <td className="px-3 py-2.5 text-gray-400">{i+1}</td>
                    <td className="px-3 py-2.5 font-mono text-xs font-bold text-blue-900">{r.requisition_number||"—"}</td>
                    <td className="px-3 py-2.5 font-semibold text-gray-800 max-w-[200px] truncate">{r.title||"—"}</td>
                    <td className="px-3 py-2.5 text-gray-600">{r.department||"—"}</td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${r.priority==="urgent"||r.priority==="high"?"bg-red-100 text-red-700":r.priority==="normal"?"bg-blue-100 text-blue-700":"bg-gray-100 text-gray-500"}`}>
                        {r.priority||"normal"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{background:s.bg,color:s.color}}>{s.label}</span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-600">{r.requester_name||"—"}</td>
                    <td className="px-3 py-2.5 font-semibold text-gray-800">{r.total_amount?`KES ${Number(r.total_amount).toLocaleString()}`:"—"}</td>
                    <td className="px-3 py-2.5 text-gray-400 text-[10px] whitespace-nowrap">{r.created_at?new Date(r.created_at).toLocaleDateString("en-KE"):"—"}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={()=>setViewReq(r)} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"><Eye className="w-3 h-3"/></button>
                        <button onClick={()=>printReq(r)} className="p-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100"><Printer className="w-3 h-3"/></button>
                        {canApprove&&isPending&&(
                          <>
                            <button onClick={()=>approve(r.id)} className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100"><CheckCircle className="w-3 h-3"/></button>
                            <button onClick={()=>reject(r.id)} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"><XCircle className="w-3 h-3"/></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-[10px] text-gray-400">
          {filtered.length} requisition{filtered.length!==1?"s":""}
          {filtered.length>0&&` · Total: KES ${filtered.reduce((s,r)=>s+Number(r.total_amount||0),0).toLocaleString()}`}
        </div>
      </div>

      {/* Create form modal */}
      {showForm&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={()=>setShowForm(false)}/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between" style={{background:"#0a2558"}}>
              <h3 className="text-sm font-black text-white flex items-center gap-2"><ClipboardList className="w-4 h-4"/>New Requisition</h3>
              <button onClick={()=>setShowForm(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/70"><X className="w-4 h-4"/></button>
            </div>
            <div className="p-5 space-y-4">
              {[{k:"title",l:"Title *",ph:"e.g. Medical Supplies Q1 2025"},{k:"department",l:"Department",ph:"e.g. Pharmacy"},{k:"notes",l:"Notes / Justification",ph:"Brief description…"}].map(f=>(
                <div key={f.k}>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">{f.l}</label>
                  {f.k==="notes"?(
                    <textarea value={(form as any)[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} rows={3} placeholder={f.ph}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 resize-none"/>
                  ):(
                    <input value={(form as any)[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} placeholder={f.ph}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"/>
                  )}
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Priority</label>
                  <select value={form.priority} onChange={e=>setForm(p=>({...p,priority:e.target.value}))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400">
                    {["low","normal","high","urgent"].map(v=><option key={v} value={v} className="capitalize">{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Delivery Date</label>
                  <input type="date" value={form.delivery_date} onChange={e=>setForm(p=>({...p,delivery_date:e.target.value}))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"/>
                </div>
              </div>
            </div>
            <div className="px-5 py-3 border-t flex gap-2 justify-end">
              <button onClick={()=>setShowForm(false)} className="px-4 py-2 rounded-xl border text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={save} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold"
                style={{background:"#1a3a6b",opacity:saving?0.7:1}}>
                {saving?<RefreshCw className="w-3.5 h-3.5 animate-spin"/>:<Send className="w-3.5 h-3.5"/>}
                {saving?"Saving…":"Create Requisition"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View modal */}
      {viewReq&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={()=>setViewReq(null)}/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-5 py-3 flex items-center justify-between" style={{background:"#0a2558"}}>
              <div><h3 className="text-sm font-black text-white">{viewReq.requisition_number}</h3><p className="text-[10px] text-white/40">{viewReq.title}</p></div>
              <div className="flex gap-2">
                <button onClick={()=>printReq(viewReq)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/20 text-white text-xs"><Printer className="w-3 h-3"/>Print</button>
                {canApprove&&(viewReq.status==="submitted"||viewReq.status==="pending")&&(
                  <>
                    <button onClick={()=>{approve(viewReq.id);setViewReq(null);}} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500 text-white text-xs"><CheckCircle className="w-3 h-3"/>Approve</button>
                    <button onClick={()=>{reject(viewReq.id);setViewReq(null);}} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500 text-white text-xs"><XCircle className="w-3 h-3"/>Reject</button>
                  </>
                )}
                <button onClick={()=>setViewReq(null)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/70"><X className="w-4 h-4"/></button>
              </div>
            </div>
            <div className="overflow-y-auto p-5">
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  {l:"Department",v:viewReq.department},{l:"Priority",v:viewReq.priority},
                  {l:"Status",v:viewReq.status},{l:"Requester",v:viewReq.requester_name},
                  {l:"Total",v:viewReq.total_amount?`KES ${Number(viewReq.total_amount).toLocaleString()}`:"—"},
                  {l:"Date",v:viewReq.created_at?new Date(viewReq.created_at).toLocaleDateString("en-KE"):"—"},
                ].map(r=>(
                  <div key={r.l}>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{r.l}</div>
                    <div className="text-sm text-gray-800 font-medium mt-0.5">{r.v||"—"}</div>
                  </div>
                ))}
              </div>
              {viewReq.notes&&<div className="mb-4 p-3 rounded-xl bg-gray-50"><p className="text-[10px] font-bold uppercase text-gray-400 mb-1">Notes</p><p className="text-sm text-gray-700">{viewReq.notes}</p></div>}
              {(viewReq.requisition_items||[]).length>0&&(
                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-400 mb-2">Line Items ({viewReq.requisition_items.length})</p>
                  <table className="w-full text-xs">
                    <thead><tr style={{background:"#1a3a6b"}}>{["Item","Qty","UoM","Unit Price","Total"].map(h=><th key={h} className="text-left px-3 py-2 text-white/80 text-[10px] uppercase font-bold">{h}</th>)}</tr></thead>
                    <tbody>
                      {viewReq.requisition_items.map((it:any,i:number)=>(
                        <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium">{it.item_name||"—"}</td>
                          <td className="px-3 py-2">{it.quantity}</td>
                          <td className="px-3 py-2 text-gray-500">{it.unit_of_measure||"—"}</td>
                          <td className="px-3 py-2">KES {Number(it.unit_price||0).toLocaleString()}</td>
                          <td className="px-3 py-2 font-semibold">KES {Number((it.quantity||0)*(it.unit_price||0)).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
