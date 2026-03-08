import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import { Plus, Edit, Search, X, RefreshCw, Download, Printer, FileSpreadsheet, Star, Truck, CheckCircle, XCircle, Eye } from "lucide-react";
import * as XLSX from "xlsx";

const STATUS_STYLE: Record<string,{bg:string;color:string}> = {
  active:    {bg:"#dcfce7",color:"#15803d"},
  inactive:  {bg:"#fee2e2",color:"#dc2626"},
  suspended: {bg:"#fef3c7",color:"#92400e"},
};

const CATEGORIES = ["pharmaceutical","medical_equipment","consumables","reagents","laboratory","surgical","general","other"];

export default function SuppliersPage() {
  const { user, profile, roles } = useAuth();
  const isAdmin = roles.includes("admin") || roles.includes("procurement_manager") || roles.includes("procurement_officer");
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [catFilter, setCatFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [viewSupplier, setViewSupplier] = useState<any>(null);
  const [form, setForm] = useState({
    name:"", contact_person:"", email:"", phone:"", address:"", tax_id:"",
    kra_pin:"", category:"pharmaceutical", status:"active", bank_name:"",
    bank_account:"", bank_branch:"", rating:"3", website:"", notes:"",
  });
  const [saving, setSaving] = useState(false);
  const [hospitalName, setHospitalName] = useState("Embu Level 5 Hospital");
  const [sysName, setSysName] = useState("EL5 MediProcure");

  useEffect(()=>{
    (supabase as any).from("system_settings").select("key,value").in("key",["system_name","hospital_name"])
      .then(({data}:any)=>{ if(!data) return; const m:any={}; data.forEach((r:any)=>{ if(r.key) m[r.key]=r.value; }); if(m.system_name) setSysName(m.system_name); if(m.hospital_name) setHospitalName(m.hospital_name); });
  },[]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("suppliers").select("*").order("name");
    setSuppliers(data||[]);
    setLoading(false);
  },[]);

  useEffect(()=>{ load(); },[load]);
  useEffect(()=>{
    const ch = supabase.channel("suppliers-rt").on("postgres_changes",{event:"*",schema:"public",table:"suppliers"},()=>load()).subscribe();
    return ()=>{ supabase.removeChannel(ch); };
  },[load]);

  const openCreate = () => {
    setEditing(null);
    setForm({name:"",contact_person:"",email:"",phone:"",address:"",tax_id:"",kra_pin:"",category:"pharmaceutical",status:"active",bank_name:"",bank_account:"",bank_branch:"",rating:"3",website:"",notes:""});
    setShowForm(true);
  };
  const openEdit = (s: any) => {
    setEditing(s);
    setForm({name:s.name||"",contact_person:s.contact_person||"",email:s.email||"",phone:s.phone||"",address:s.address||"",tax_id:s.tax_id||"",kra_pin:s.kra_pin||"",category:s.category||"pharmaceutical",status:s.status||"active",bank_name:s.bank_name||"",bank_account:s.bank_account||"",bank_branch:s.bank_branch||"",rating:String(s.rating||3),website:s.website||"",notes:s.notes||""});
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim()) { toast({title:"Supplier name required",variant:"destructive"}); return; }
    setSaving(true);
    try {
      const payload = {...form, rating: Number(form.rating)||3};
      if (editing) {
        const { error } = await supabase.from("suppliers").update(payload).eq("id",editing.id);
        if (error) throw error;
        logAudit(user?.id,profile?.full_name,"update","suppliers",editing.id,{name:form.name});
        toast({title:"Supplier updated"});
      } else {
        const { data, error } = await supabase.from("suppliers").insert(payload).select().single();
        if (error) throw error;
        logAudit(user?.id,profile?.full_name,"create","suppliers",data?.id,{name:form.name});
        toast({title:"Supplier added",description:form.name});
      }
      setShowForm(false); load();
    } catch(e:any){ toast({title:"Error",description:e.message,variant:"destructive"}); }
    setSaving(false);
  };

  const filtered = suppliers.filter(s=>{
    if (statusFilter!=="all"&&s.status!==statusFilter) return false;
    if (catFilter!=="all"&&s.category!==catFilter) return false;
    if (search) { const q=search.toLowerCase(); return (s.name||"").toLowerCase().includes(q)||(s.contact_person||"").toLowerCase().includes(q)||(s.email||"").toLowerCase().includes(q)||(s.kra_pin||"").toLowerCase().includes(q); }
    return true;
  });

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const headerRows = [[hospitalName],[sysName,"Supplier Register"],[`Generated: ${new Date().toLocaleString("en-KE")}`],[]];
    const dataRows = filtered.map(s=>({
      Name:s.name,Contact:s.contact_person,Email:s.email,Phone:s.phone,
      Category:s.category,Status:s.status,Rating:s.rating,KRA_PIN:s.kra_pin,
      Tax_ID:s.tax_id,Bank:s.bank_name,Account:s.bank_account,Address:s.address,
    }));
    const ws = XLSX.utils.aoa_to_sheet([...headerRows,...[Object.keys(dataRows[0]||{})],...dataRows.map(r=>Object.values(r))]);
    ws["!cols"] = Object.keys(dataRows[0]||{}).map(()=>({wch:20}));
    XLSX.utils.book_append_sheet(wb, ws, "Suppliers");
    XLSX.writeFile(wb, `Suppliers_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast({title:"Exported",description:`${filtered.length} suppliers exported`});
  };

  const printSupplier = (s: any) => {
    const win = window.open("","_blank","width=800,height=600");
    if(!win) return;
    win.document.write(`<html><head><title>${s.name}</title>
    <style>body{font-family:'Segoe UI',Arial;margin:20px;font-size:12px;}.lh{border-bottom:3px solid #1a3a6b;padding-bottom:10px;margin-bottom:15px;}h1{color:#1a3a6b;font-size:18px;}.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}.field{margin-bottom:8px;}.label{font-size:9px;font-weight:700;color:#888;text-transform:uppercase;}.val{font-size:12px;color:#333;margin-top:2px;}@media print{@page{margin:1.5cm;}}</style>
    </head><body>
    <div class="lh"><h2 style="margin:0;color:#1a3a6b;font-size:16px;">${hospitalName}</h2><div style="font-size:10px;color:#888;">${sysName} · Supplier Record</div></div>
    <h1>${s.name}</h1>
    <div class="grid">
      <div class="field"><div class="label">Contact Person</div><div class="val">${s.contact_person||"—"}</div></div>
      <div class="field"><div class="label">Email</div><div class="val">${s.email||"—"}</div></div>
      <div class="field"><div class="label">Phone</div><div class="val">${s.phone||"—"}</div></div>
      <div class="field"><div class="label">Category</div><div class="val">${s.category||"—"}</div></div>
      <div class="field"><div class="label">Status</div><div class="val">${s.status||"—"}</div></div>
      <div class="field"><div class="label">Rating</div><div class="val">${s.rating||"—"}/5</div></div>
      <div class="field"><div class="label">KRA PIN</div><div class="val">${s.kra_pin||"—"}</div></div>
      <div class="field"><div class="label">Tax ID</div><div class="val">${s.tax_id||"—"}</div></div>
      <div class="field"><div class="label">Bank</div><div class="val">${s.bank_name||"—"}</div></div>
      <div class="field"><div class="label">Account No.</div><div class="val">${s.bank_account||"—"}</div></div>
    </div>
    <div class="field" style="margin-top:8px;"><div class="label">Address</div><div class="val">${s.address||"—"}</div></div>
    ${s.notes?`<div class="field"><div class="label">Notes</div><div class="val">${s.notes}</div></div>`:""}
    <div style="margin-top:20px;border-top:1px solid #e5e7eb;padding-top:8px;font-size:9px;color:#aaa;">${hospitalName} — ${sysName} · ${new Date().toLocaleDateString("en-KE")}</div>
    </body></html>`);
    win.document.close(); win.focus(); setTimeout(()=>win.print(),400);
  };

  const F = ({label,k,type="text",opts}:{label:string;k:string;type?:string;opts?:string[]}) => (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">{label}</label>
      {opts ? (
        <select value={(form as any)[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))}
          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 capitalize">
          {opts.map(o=><option key={o} value={o}>{o.replace(/_/g," ")}</option>)}
        </select>
      ) : (
        <input type={type} value={(form as any)[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))}
          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400" />
      )}
    </div>
  );

  return (
    <div className="p-4 space-y-3" style={{fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      {/* Header */}
      <div className="rounded-2xl px-5 py-3 flex items-center justify-between"
        style={{background:"linear-gradient(90deg,#00695C,#00897B)",boxShadow:"0 4px 16px rgba(0,105,92,0.3)"}}>
        <div className="flex items-center gap-3">
          <Truck className="w-5 h-5 text-white" />
          <div>
            <h1 className="text-base font-black text-white">Suppliers</h1>
            <p className="text-[10px] text-white/50">{filtered.length} of {suppliers.length} suppliers</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/15 text-white text-xs font-semibold hover:bg-white/25">
            <RefreshCw className={`w-3.5 h-3.5 ${loading?"animate-spin":""}`} />
          </button>
          <button onClick={exportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 text-white text-xs font-semibold hover:bg-white/30">
            <FileSpreadsheet className="w-3.5 h-3.5" /> Export
          </button>
          {isAdmin && (
            <button onClick={openCreate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-teal-800 text-xs font-bold hover:bg-teal-50">
              <Plus className="w-3.5 h-3.5" /> Add Supplier
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl px-4 py-3 flex flex-wrap gap-3 items-center shadow-sm">
        <div className="flex gap-1">
          {["all","active","inactive","suspended"].map(s=>(
            <button key={s} onClick={()=>setStatusFilter(s)}
              className="px-2.5 py-1 rounded-full text-[10px] font-semibold capitalize transition-all"
              style={{background:statusFilter===s?"#00695C":"#f3f4f6",color:statusFilter===s?"#fff":"#6b7280"}}>
              {s}
            </button>
          ))}
        </div>
        <select value={catFilter} onChange={e=>setCatFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs outline-none capitalize">
          <option value="all">All Categories</option>
          {CATEGORIES.map(c=><option key={c} value={c}>{c.replace(/_/g," ")}</option>)}
        </select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search suppliers…"
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-teal-400" />
          {search && <button onClick={()=>setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-3 h-3 text-gray-400"/></button>}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{background:"#00695C"}}>
                {["#","Name","Contact","Phone","Category","Status","Rating","KRA PIN","Actions"].map(h=>(
                  <th key={h} className="text-left px-3 py-2.5 text-white/80 font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(5).fill(0).map((_,i)=>(
                  <tr key={i} className="border-b border-gray-50"><td colSpan={9} className="px-4 py-3 animate-pulse"><div className="h-3 bg-gray-200 rounded w-3/4"/></td></tr>
                ))
              ) : filtered.length===0 ? (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">No suppliers found</td></tr>
              ) : filtered.map((s,i)=>(
                <tr key={s.id} className="border-b border-gray-50 hover:bg-teal-50/30 transition-colors group">
                  <td className="px-3 py-2.5 text-gray-400">{i+1}</td>
                  <td className="px-3 py-2.5 font-bold text-gray-800">{s.name}</td>
                  <td className="px-3 py-2.5 text-gray-600">
                    <div>{s.contact_person||"—"}</div>
                    {s.email && <div className="text-[10px] text-gray-400">{s.email}</div>}
                  </td>
                  <td className="px-3 py-2.5 text-gray-600">{s.phone||"—"}</td>
                  <td className="px-3 py-2.5 text-gray-600 capitalize">{(s.category||"").replace(/_/g," ")||"—"}</td>
                  <td className="px-3 py-2.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize"
                      style={{background:STATUS_STYLE[s.status]?.bg||"#f3f4f6",color:STATUS_STYLE[s.status]?.color||"#6b7280"}}>
                      {s.status||"—"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(n=>(
                        <Star key={n} className="w-3 h-3" fill={n<=(s.rating||0)?"#f59e0b":"none"} stroke={n<=(s.rating||0)?"#f59e0b":"#d1d5db"} />
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-gray-500 font-mono text-[10px]">{s.kra_pin||"—"}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={()=>setViewSupplier(s)} className="p-1.5 rounded-lg bg-teal-50 text-teal-600 hover:bg-teal-100"><Eye className="w-3 h-3"/></button>
                      <button onClick={()=>printSupplier(s)} className="p-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100"><Printer className="w-3 h-3"/></button>
                      {isAdmin && <button onClick={()=>openEdit(s)} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"><Edit className="w-3 h-3"/></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-[10px] text-gray-400">
          <span>{filtered.length} supplier{filtered.length!==1?"s":""}</span>
          <span>Active: {suppliers.filter(s=>s.status==="active").length} · Inactive: {suppliers.filter(s=>s.status==="inactive").length}</span>
        </div>
      </div>

      {/* Add/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={()=>setShowForm(false)} />
          <div className="relative rounded-2xl overflow-hidden w-full max-w-2xl bg-white shadow-2xl max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{background:"#00695C"}}>
              <h3 className="text-sm font-black text-white">{editing?"Edit Supplier":"New Supplier"}</h3>
              <button onClick={()=>setShowForm(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/70"><X className="w-4 h-4"/></button>
            </div>
            <div className="overflow-y-auto p-5 grid grid-cols-2 gap-4">
              <div className="col-span-2"><F label="Supplier Name *" k="name" /></div>
              <F label="Contact Person" k="contact_person" />
              <F label="Phone" k="phone" type="tel" />
              <F label="Email" k="email" type="email" />
              <F label="Website" k="website" />
              <F label="Category" k="category" opts={CATEGORIES} />
              <F label="Status" k="status" opts={["active","inactive","suspended"]} />
              <F label="KRA PIN" k="kra_pin" />
              <F label="Tax ID" k="tax_id" />
              <F label="Bank Name" k="bank_name" />
              <F label="Bank Account" k="bank_account" />
              <F label="Bank Branch" k="bank_branch" />
              <F label="Rating (1-5)" k="rating" type="number" />
              <div className="col-span-2"><F label="Address" k="address" /></div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-teal-400 resize-none" />
              </div>
            </div>
            <div className="px-5 py-3 border-t flex gap-2 justify-end">
              <button onClick={()=>setShowForm(false)} className="px-4 py-2 rounded-xl border text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={save} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold"
                style={{background:"#00695C",opacity:saving?0.7:1}}>
                {saving?<RefreshCw className="w-3.5 h-3.5 animate-spin"/>:<CheckCircle className="w-3.5 h-3.5"/>}
                {saving?"Saving…":"Save Supplier"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View modal */}
      {viewSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={()=>setViewSupplier(null)} />
          <div className="relative rounded-2xl overflow-hidden w-full max-w-lg bg-white shadow-2xl">
            <div className="px-5 py-3 border-b flex items-center justify-between bg-teal-700">
              <h3 className="text-sm font-black text-white">{viewSupplier.name}</h3>
              <div className="flex gap-2">
                <button onClick={()=>printSupplier(viewSupplier)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/20 text-white text-xs">
                  <Printer className="w-3 h-3"/> Print
                </button>
                <button onClick={()=>setViewSupplier(null)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/70"><X className="w-4 h-4"/></button>
              </div>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3">
              {[
                {l:"Contact",v:viewSupplier.contact_person},{l:"Email",v:viewSupplier.email},
                {l:"Phone",v:viewSupplier.phone},{l:"Category",v:viewSupplier.category},
                {l:"Status",v:viewSupplier.status},{l:"KRA PIN",v:viewSupplier.kra_pin},
                {l:"Tax ID",v:viewSupplier.tax_id},{l:"Bank",v:viewSupplier.bank_name},
                {l:"Account",v:viewSupplier.bank_account},{l:"Branch",v:viewSupplier.bank_branch},
              ].map(r=>(
                <div key={r.l}>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{r.l}</div>
                  <div className="text-sm text-gray-700 mt-0.5">{r.v||"—"}</div>
                </div>
              ))}
              <div className="col-span-2">
                <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Address</div>
                <div className="text-sm text-gray-700 mt-0.5">{viewSupplier.address||"—"}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
