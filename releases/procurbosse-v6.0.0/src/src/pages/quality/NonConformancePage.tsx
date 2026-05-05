import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import { Plus, Search, RefreshCw, Download, X, Save, Trash2, Eye, AlertTriangle, CheckCircle, Clock, Edit } from "lucide-react";
import * as XLSX from "xlsx";

const genNo = () => `NCR/EL5H/${new Date().getFullYear()}/${String(Math.floor(100+Math.random()*900))}`;
const SC: Record<string,{bg:string,color:string}> = {
  open:      {bg:"#fee2e2",color:"#dc2626"},
  under_review:{bg:"#fef3c7",color:"#92400e"},
  closed:    {bg:"#dcfce7",color:"#15803d"},
  escalated: {bg:"#f3e8ff",color:"#7c3aed"},
};
const SEV: Record<string,string> = {critical:"#dc2626",major:"#d97706",minor:"#6b7280"};

export default function NonConformancePage() {
  const { user, profile, hasRole } = useAuth();
  const canCreate = hasRole("admin")||hasRole("procurement_manager")||hasRole("procurement_officer")||hasRole("warehouse_officer");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showNew, setShowNew] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ncr_date:new Date().toISOString().slice(0,10),title:"",description:"",severity:"minor",source:"Inspection",supplier_name:"",item_name:"",grn_reference:"",root_cause:"",corrective_action:"",preventive_action:"",responsible_person:"",target_date:"",status:"open"});

  const load = async () => {
    setLoading(true);
    const{data}=await(supabase as any).from("non_conformance").select("*").order("created_at",{ascending:false});
    setRows(data||[]); setLoading(false);
  };
  useEffect(()=>{ load(); },[]);

  const save = async () => {
    if(!form.title){toast({title:"Title required",variant:"destructive"});return;}
    setSaving(true);
    const payload={...form,ncr_number:genNo(),created_by:user?.id,created_by_name:profile?.full_name};
    const{data,error}=await(supabase as any).from("non_conformance").insert(payload).select().single();
    if(error){toast({title:"Error",description:error.message,variant:"destructive"});}
    else{logAudit(user?.id,profile?.full_name,"create","non_conformance",data?.id,{title:form.title});toast({title:"NCR created ✓"});setShowNew(false);load();}
    setSaving(false);
  };

  const updateStatus = async (id:string, status:string) => {
    await(supabase as any).from("non_conformance").update({status,closed_by:status==="closed"?user?.id:null,closed_at:status==="closed"?new Date().toISOString():null}).eq("id",id);
    toast({title:`Status updated to ${status}`}); load();
  };

  const deleteRow = async (id:string) => {
    if(!confirm("Delete this NCR?")) return;
    await(supabase as any).from("non_conformance").delete().eq("id",id);
    toast({title:"Deleted"}); load();
  };

  const exportExcel = () => {
    const wb=XLSX.utils.book_new(); const ws=XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb,ws,"NCRs");
    XLSX.writeFile(wb,`ncr_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast({title:"Exported"});
  };

  const filtered = rows.filter(r=>{
    const ms = !search||(r.title||"").toLowerCase().includes(search.toLowerCase())||(r.ncr_number||"").includes(search)||(r.supplier_name||"").toLowerCase().includes(search.toLowerCase());
    const ms2 = statusFilter==="all"||r.status===statusFilter;
    return ms&&ms2;
  });

  const stats = {open:rows.filter(r=>r.status==="open").length,under_review:rows.filter(r=>r.status==="under_review").length,closed:rows.filter(r=>r.status==="closed").length,critical:rows.filter(r=>r.severity==="critical").length};

  const F = ({label,k,type="text"}:{label:string;k:string;type?:string}) => (
    <div><label className="block mb-1 text-xs font-semibold text-gray-500">{label}</label>
      <input type={type} value={(form as any)[k]||""} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none"/></div>
  );
  const TA = ({label,k}:{label:string;k:string}) => (
    <div><label className="block mb-1 text-xs font-semibold text-gray-500">{label}</label>
      <textarea value={(form as any)[k]||""} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} rows={2} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none resize-none"/></div>
  );

  return (
    <div className="p-4 space-y-4" style={{fontFamily:"'Segoe UI',system-ui"}}>
      <div className="rounded-2xl px-5 py-3 flex items-center justify-between" style={{background:"linear-gradient(90deg,#92400e,#d97706)"}}>
        <div>
          <h1 className="text-base font-black text-white">Non-Conformance Reports</h1>
          <p className="text-[10px] text-white/50">{rows.length} total · {stats.open} open · {stats.critical} critical</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportExcel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold" style={{background:"rgba(255,255,255,0.15)",color:"#fff"}}><Download className="w-3.5 h-3.5"/>Export</button>
          {canCreate&&<button onClick={()=>setShowNew(true)} className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold" style={{background:"rgba(255,255,255,0.92)",color:"#92400e"}}><Plus className="w-3.5 h-3.5"/>New NCR</button>}
        </div>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[{label:"Open",count:stats.open,color:"#dc2626"},{label:"Under Review",count:stats.under_review,color:"#d97706"},{label:"Closed",count:stats.closed,color:"#15803d"},{label:"Critical",count:stats.critical,color:"#7c3aed"}].map(s=>(
          <div key={s.label} className="rounded-2xl p-3 shadow-sm">
            <p className="text-xl font-black" style={{color:s.color}}>{s.count}</p>
            <p className="text-[10px] text-gray-500 font-semibold">{s.label}</p>
          </div>
        ))}
      </div>
      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search NCRs…" className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm outline-none w-52"/></div>
        <div className="flex gap-1">
          {["all","open","under_review","closed","escalated"].map(s=>(
            <button key={s} onClick={()=>setStatusFilter(s)} className="px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all"
              style={{background:statusFilter===s?(SC[s]?.bg||"#1a3a6b"):"#f3f4f6",color:statusFilter===s?(SC[s]?.color||"#fff"):"#6b7280"}}>
              {s.replace(/_/g," ")}
            </button>
          ))}
        </div>
      </div>
      {/* Table */}
      <div className="rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-xs">
          <thead><tr style={{background:"#92400e"}}>
            {["NCR No.","Date","Title","Supplier","Item","Severity","Status","Responsible","Target","Actions"].map(h=>(
              <th key={h} className="px-4 py-3 text-left font-bold text-white/80 text-[10px] uppercase">{h}</th>))}
          </tr></thead>
          <tbody>
            {loading?<tr><td colSpan={10} className="py-8 text-center"><RefreshCw className="w-4 h-4 animate-spin text-gray-300 mx-auto"/></td></tr>:
            filtered.length===0?<tr><td colSpan={10} className="py-8 text-center text-gray-400 text-xs">No non-conformance reports</td></tr>:
            filtered.map((r,i)=>{
              const sc=SC[r.status]||SC.open;
              return(
                <tr key={r.id} style={{borderBottom:"1px solid #f3f4f6",background:i%2===0?"#fff":"#fffbf0"}}>
                  <td className="px-4 py-2.5 font-mono text-[10px]" style={{color:"#92400e"}}>{r.ncr_number}</td>
                  <td className="px-4 py-2.5">{new Date(r.ncr_date).toLocaleDateString("en-KE")}</td>
                  <td className="px-4 py-2.5 font-semibold text-gray-800 max-w-[160px] truncate">{r.title}</td>
                  <td className="px-4 py-2.5 text-gray-500">{r.supplier_name||"—"}</td>
                  <td className="px-4 py-2.5 text-gray-500">{r.item_name||"—"}</td>
                  <td className="px-4 py-2.5"><span className="text-[9px] font-bold capitalize" style={{color:SEV[r.severity]||"#6b7280"}}>{r.severity}</span></td>
                  <td className="px-4 py-2.5"><span className="px-2 py-0.5 rounded-full text-[9px] font-bold capitalize" style={sc}>{r.status?.replace(/_/g," ")}</span></td>
                  <td className="px-4 py-2.5 text-gray-500">{r.responsible_person||"—"}</td>
                  <td className="px-4 py-2.5 text-gray-400">{r.target_date?new Date(r.target_date).toLocaleDateString("en-KE"):"—"}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1.5">
                      <button onClick={()=>setDetail(r)} className="p-1.5 rounded-lg bg-orange-50"><Eye className="w-3 h-3 text-orange-600"/></button>
                      {r.status!=="closed"&&canCreate&&<button onClick={()=>updateStatus(r.id,"closed")} className="p-1.5 rounded-lg bg-green-50" title="Close NCR"><CheckCircle className="w-3 h-3 text-green-600"/></button>}
                      {hasRole("admin")&&<button onClick={()=>deleteRow(r.id)} className="p-1.5 rounded-lg bg-red-50"><Trash2 className="w-3 h-3 text-red-500"/></button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {showNew&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={()=>setShowNew(false)}/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5 overflow-y-auto max-h-[92vh] space-y-3">
            <div className="flex items-center justify-between"><h3 className="font-black text-gray-800">New Non-Conformance Report</h3><button onClick={()=>setShowNew(false)}><X className="w-5 h-5 text-gray-400"/></button></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><F label="NCR Title *" k="title"/></div>
              <F label="NCR Date" k="ncr_date" type="date"/>
              <div><label className="block mb-1 text-xs font-semibold text-gray-500">Source</label>
                <select value={form.source} onChange={e=>setForm(p=>({...p,source:e.target.value}))} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none">
                  {["Inspection","Supplier","Internal Audit","Customer Complaint","Process Review"].map(s=><option key={s}>{s}</option>)}
                </select></div>
              <div><label className="block mb-1 text-xs font-semibold text-gray-500">Severity</label>
                <select value={form.severity} onChange={e=>setForm(p=>({...p,severity:e.target.value}))} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none">
                  {["minor","major","critical"].map(s=><option key={s} className="capitalize">{s}</option>)}
                </select></div>
              <div><label className="block mb-1 text-xs font-semibold text-gray-500">Status</label>
                <select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none">
                  {["open","under_review","closed","escalated"].map(s=><option key={s} value={s}>{s.replace(/_/g," ")}</option>)}
                </select></div>
              <F label="Supplier Name" k="supplier_name"/>
              <F label="Item Name" k="item_name"/>
              <F label="GRN Reference" k="grn_reference"/>
              <F label="Responsible Person" k="responsible_person"/>
              <F label="Target Date" k="target_date" type="date"/>
              <div className="col-span-2"><TA label="Description" k="description"/></div>
              <div className="col-span-2"><TA label="Root Cause" k="root_cause"/></div>
              <div className="col-span-2"><TA label="Corrective Action" k="corrective_action"/></div>
              <div className="col-span-2"><TA label="Preventive Action" k="preventive_action"/></div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={()=>setShowNew(false)} className="px-4 py-2 rounded-xl border text-sm">Cancel</button>
              <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-bold" style={{background:"#92400e"}}>
                {saving?<RefreshCw className="w-3.5 h-3.5 animate-spin"/>:<Save className="w-3.5 h-3.5"/>}
                {saving?"Saving…":"Create NCR"}
              </button>
            </div>
          </div>
        </div>
      )}
      {detail&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={()=>setDetail(null)}/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-3"><h3 className="font-black text-gray-800">{detail.ncr_number}</h3><button onClick={()=>setDetail(null)}><X className="w-5 h-5 text-gray-400"/></button></div>
            <h4 className="font-bold text-gray-700 mb-3">{detail.title}</h4>
            <div className="space-y-1.5">
              {[["Date",new Date(detail.ncr_date).toLocaleDateString("en-KE")],["Severity",detail.severity],["Status",detail.status?.replace(/_/g," ")],["Source",detail.source],["Supplier",detail.supplier_name],["Item",detail.item_name],["GRN Ref.",detail.grn_reference],["Description",detail.description],["Root Cause",detail.root_cause],["Corrective Action",detail.corrective_action],["Preventive Action",detail.preventive_action],["Responsible",detail.responsible_person],["Target Date",detail.target_date?new Date(detail.target_date).toLocaleDateString("en-KE"):""],["Raised By",detail.created_by_name]].filter(([,v])=>v).map(([l,v])=>(
                <div key={l} className="py-1.5" style={{borderBottom:"1px solid #f3f4f6"}}>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">{l}</span>
                  <p className="text-xs text-gray-700 mt-0.5">{v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
