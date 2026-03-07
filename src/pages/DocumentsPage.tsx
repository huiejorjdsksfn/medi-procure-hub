import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { FileText, Upload, Eye, Lock, Download, Search, X, Plus, Filter, Printer, RefreshCw, ChevronDown, Edit, Trash2, FileCheck } from "lucide-react";

const CATEGORIES = ["general","policy","template","contract","report","letter","form","procedure","other"];
const CATEGORY_COLORS: Record<string,string> = {
  general:"#6b7280",policy:"#1a3a6b",template:"#C45911",contract:"#00695C",
  report:"#5C2D91",letter:"#c0185a",form:"#0891b2",procedure:"#375623",other:"#374151",
};

export default function DocumentsPage() {
  const { user, profile, roles } = useAuth();
  const isAdmin = roles.includes("admin") || roles.includes("procurement_manager");
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [showUpload, setShowUpload] = useState(false);
  const [viewDoc, setViewDoc] = useState<any>(null);
  const [editTemplate, setEditTemplate] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({name:"",description:"",category:"general",is_template:false,is_locked:true});
  const [file, setFile] = useState<File|null>(null);
  const [sysName, setSysName] = useState("EL5 MediProcure");
  const [hospitalName, setHospitalName] = useState("Embu Level 5 Hospital");
  const [letterheadHtml, setLetterheadHtml] = useState<string|null>(null);

  useEffect(()=>{
    (supabase as any).from("system_settings").select("key,value")
      .in("key",["system_name","hospital_name","letterhead_html"])
      .then(({data}:any)=>{
        if(!data) return;
        const m:Record<string,string>={};
        data.forEach((r:any)=>{ if(r.key&&r.value) m[r.key]=r.value; });
        if(m.system_name) setSysName(m.system_name);
        if(m.hospital_name) setHospitalName(m.hospital_name);
        if(m.letterhead_html) setLetterheadHtml(m.letterhead_html);
      });
  },[]);

  const loadDocs = useCallback(async ()=>{
    setLoading(true);
    const { data } = await (supabase as any).from("documents").select("*").order("created_at",{ascending:false});
    setDocs(data||[]);
    setLoading(false);
  },[]);

  useEffect(()=>{ loadDocs(); },[loadDocs]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if(!f) return;
    setFile(f);
    if(!form.name) setForm(p=>({...p,name:f.name.replace(/\.[^.]+$/,"")}));
  };

  const uploadDoc = async () => {
    if (!user) return;
    if (!file && !form.is_template) { toast({title:"Select a file",variant:"destructive"}); return; }
    if (!form.name.trim()) { toast({title:"Enter document name",variant:"destructive"}); return; }
    setUploading(true);
    try {
      let fileUrl = "";
      let fileName = "";
      let fileSize = 0;
      let mimeType = "";
      if (file) {
        // Convert file to base64 for storage (no bucket needed)
        fileUrl = await new Promise<string>((res,rej)=>{
          const r = new FileReader();
          r.onload = ev => res(ev.target?.result as string);
          r.onerror = rej;
          r.readAsDataURL(file);
        });
        fileName = file.name;
        fileSize = file.size;
        mimeType = file.type;
      }
      const { error } = await (supabase as any).from("documents").insert({
        name: form.name.trim(),
        description: form.description,
        category: form.category,
        is_template: form.is_template,
        is_locked: form.is_locked,
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize,
        mime_type: mimeType,
        uploaded_by: user.id,
        template_html: form.is_template ? `<div>${form.name}</div>` : null,
      });
      if (error) throw error;
      toast({title:"Document uploaded",description:form.name});
      setShowUpload(false);
      setFile(null);
      setForm({name:"",description:"",category:"general",is_template:false,is_locked:true});
      loadDocs();
    } catch(e:any){ toast({title:"Error",description:e.message,variant:"destructive"}); }
    setUploading(false);
  };

  const deleteDoc = async (doc: any) => {
    if (!isAdmin) { toast({title:"Access denied",description:"Only admins can delete documents",variant:"destructive"}); return; }
    if (!confirm(`Delete "${doc.name}"?`)) return;
    await (supabase as any).from("documents").delete().eq("id",doc.id);
    setDocs(prev=>prev.filter(d=>d.id!==doc.id));
    toast({title:"Deleted"});
  };

  const toggleLock = async (doc: any) => {
    if (!isAdmin) return;
    await (supabase as any).from("documents").update({is_locked:!doc.is_locked}).eq("id",doc.id);
    setDocs(prev=>prev.map(d=>d.id===doc.id?{...d,is_locked:!d.is_locked}:d));
    toast({title:doc.is_locked?"Document unlocked":"Document locked"});
  };

  const printDoc = (doc: any) => {
    const win = window.open("","_blank","width=900,height=700");
    if(!win) return;
    const content = doc.template_html || `<p style="font-size:14px;color:#374151;">${doc.name}</p><p style="color:#6b7280;">${doc.description||""}</p>`;
    win.document.write(`<html><head><title>${doc.name} — ${hospitalName}</title>
    <style>body{font-family:'Segoe UI',Arial;margin:0;padding:20px;}.letterhead{border-bottom:3px solid #1a3a6b;margin-bottom:20px;padding-bottom:12px;}@media print{@page{margin:1.5cm;}}</style>
    </head><body>
    <div class="letterhead">${letterheadHtml||`<h2 style="color:#1a3a6b;margin:0;">${hospitalName}</h2><p style="margin:0;color:#888;font-size:12px;">${sysName}</p>`}</div>
    ${content}
    <div style="margin-top:30px;border-top:1px solid #e5e7eb;padding-top:10px;font-size:10px;color:#aaa;text-align:center;">${hospitalName} — ${sysName} · ${new Date().toLocaleDateString("en-KE")}</div>
    </body></html>`);
    win.document.close(); win.focus(); setTimeout(()=>win.print(),400);
  };

  const viewFile = (doc: any) => {
    if (!doc.file_url) { setViewDoc(doc); return; }
    if (doc.mime_type?.startsWith("image/")) { setViewDoc(doc); return; }
    if (doc.mime_type==="application/pdf"||doc.file_url.startsWith("data:application/pdf")) {
      const win = window.open("","_blank");
      if(win) { win.document.write(`<html><body style="margin:0;"><iframe src="${doc.file_url}" width="100%" height="100%" style="border:0;position:fixed;top:0;left:0;width:100%;height:100%;"></iframe></body></html>`); win.document.close(); }
      return;
    }
    setViewDoc(doc);
  };

  const downloadDoc = (doc: any) => {
    if (!doc.file_url) return;
    const a = document.createElement("a");
    a.href = doc.file_url;
    a.download = doc.file_name||doc.name;
    a.click();
  };

  const saveTemplate = async () => {
    if(!editTemplate) return;
    await (supabase as any).from("documents").update({template_html:editTemplate.template_html,name:editTemplate.name,description:editTemplate.description}).eq("id",editTemplate.id);
    toast({title:"Template saved"});
    setEditTemplate(null);
    loadDocs();
  };

  const filtered = docs.filter(d=>{
    if(catFilter!=="all"&&d.category!==catFilter) return false;
    if(search) { const s=search.toLowerCase(); return (d.name||"").toLowerCase().includes(s)||(d.description||"").toLowerCase().includes(s); }
    return true;
  });

  const fmtSize = (b:number) => b>1048576?`${(b/1048576).toFixed(1)} MB`:b>1024?`${(b/1024).toFixed(0)} KB`:`${b} B`;

  return (
    <div className="p-4 space-y-4" style={{fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      {/* Header */}
      <div className="rounded-2xl px-5 py-4 flex items-center justify-between"
        style={{background:"linear-gradient(90deg,#374151,#4b5563)",boxShadow:"0 4px 16px rgba(55,65,81,0.3)"}}>
        <div className="flex items-center gap-3">
          <FileCheck className="w-5 h-5 text-white" />
          <div>
            <h1 className="text-base font-black text-white">Document Management</h1>
            <p className="text-[10px] text-white/50">{hospitalName}</p>
          </div>
        </div>
        <button onClick={()=>setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-white text-gray-800 hover:bg-gray-50 transition-all">
          <Upload className="w-4 h-4" /> Upload Document
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap bg-white rounded-xl px-4 py-3 shadow-sm">
        <div className="flex gap-1 flex-wrap">
          {["all",...CATEGORIES].map(c=>(
            <button key={c} onClick={()=>setCatFilter(c)}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize transition-all"
              style={{background:catFilter===c?(CATEGORY_COLORS[c]||"#1a3a6b"):"#f3f4f6",color:catFilter===c?"#fff":"#6b7280"}}>
              {c}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search documents…"
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-blue-400" />
          {search && <button onClick={()=>setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-3 h-3 text-gray-400"/></button>}
        </div>
        <span className="text-xs text-gray-400">{filtered.length} document{filtered.length!==1?"s":""}</span>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array(8).fill(0).map((_,i)=>(
            <div key={i} className="bg-white rounded-2xl p-4 h-36 animate-pulse"><div className="h-8 bg-gray-200 rounded w-1/2 mb-2"/><div className="h-3 bg-gray-100 rounded"/></div>
          ))}
        </div>
      ) : filtered.length===0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="w-14 h-14 text-gray-200 mb-3" />
          <p className="text-sm text-gray-400">No documents found</p>
          <p className="text-xs text-gray-300 mt-1">Upload your first document using the button above</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(doc=>(
            <div key={doc.id} className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group flex flex-col">
              {/* Icon */}
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{background:`${CATEGORY_COLORS[doc.category]||"#6b7280"}15`}}>
                {doc.mime_type?.startsWith("image/") ? "🖼️" :
                 doc.mime_type==="application/pdf" ? "📄" :
                 doc.is_template ? "📝" : "📁"}
              </div>
              {/* Name */}
              <div className="flex-1">
                <div className="text-xs font-bold text-gray-800 truncate mb-1">{doc.name}</div>
                {doc.description && <div className="text-[10px] text-gray-400 truncate">{doc.description}</div>}
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold capitalize"
                    style={{background:`${CATEGORY_COLORS[doc.category]||"#6b7280"}15`,color:CATEGORY_COLORS[doc.category]||"#6b7280"}}>
                    {doc.category}
                  </span>
                  {doc.is_locked && <Lock className="w-2.5 h-2.5 text-amber-500" title="Locked" />}
                  {doc.is_template && <span className="px-1 py-0.5 rounded text-[9px] bg-purple-50 text-purple-600 font-bold">TPL</span>}
                  {doc.file_size>0 && <span className="text-[9px] text-gray-300">{fmtSize(doc.file_size)}</span>}
                </div>
              </div>
              {/* Actions */}
              <div className="flex gap-1 mt-3 pt-2.5 border-t border-gray-100">
                <button onClick={()=>viewFile(doc)} title="View"
                  className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all">
                  <Eye className="w-3 h-3" />
                </button>
                {doc.file_url && (
                  <button onClick={()=>downloadDoc(doc)} title="Download"
                    className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-all">
                    <Download className="w-3 h-3" />
                  </button>
                )}
                <button onClick={()=>printDoc(doc)} title="Print"
                  className="p-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-all">
                  <Printer className="w-3 h-3" />
                </button>
                {isAdmin && doc.is_template && (
                  <button onClick={()=>setEditTemplate({...doc})} title="Edit Template"
                    className="p-1.5 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 transition-all">
                    <Edit className="w-3 h-3" />
                  </button>
                )}
                {isAdmin && (
                  <>
                    <button onClick={()=>toggleLock(doc)} title={doc.is_locked?"Unlock":"Lock"}
                      className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-all">
                      <Lock className="w-3 h-3" />
                    </button>
                    <button onClick={()=>deleteDoc(doc)} title="Delete"
                      className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-all ml-auto">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={()=>setShowUpload(false)} />
          <div className="relative rounded-2xl overflow-hidden w-full max-w-md bg-white shadow-2xl">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between" style={{background:"#374151"}}>
              <h3 className="text-sm font-black text-white">Upload Document</h3>
              <button onClick={()=>setShowUpload(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/70">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* File picker */}
              <div onClick={()=>fileRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all">
                {file ? (
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-green-600 text-xl">📄</div>
                    <div>
                      <div className="text-sm font-semibold text-gray-700">{file.name}</div>
                      <div className="text-xs text-gray-400">{fmtSize(file.size)}</div>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 font-medium">Click to select file</p>
                    <p className="text-xs text-gray-400 mt-1">PDF, Word, Excel, Images, etc.</p>
                  </>
                )}
                <input ref={fileRef} type="file" onChange={handleFileChange} className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.ppt,.pptx,.txt" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Document Name *</label>
                <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Description</label>
                <input value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Category</label>
                  <select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none capitalize">
                    {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2 pt-4">
                  <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={form.is_locked} onChange={e=>setForm(p=>({...p,is_locked:e.target.checked}))} />
                    Lock document
                  </label>
                  <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={form.is_template} onChange={e=>setForm(p=>({...p,is_template:e.target.checked}))} />
                    Is a template
                  </label>
                </div>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-gray-100 flex gap-2 justify-end">
              <button onClick={()=>setShowUpload(false)} className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={uploadDoc} disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-700 text-white text-sm font-bold hover:bg-gray-800 disabled:opacity-60">
                <Upload className="w-3.5 h-3.5" />
                {uploading?"Uploading…":"Upload"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View/Preview modal */}
      {viewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={()=>setViewDoc(null)} />
          <div className="relative rounded-2xl overflow-hidden w-full max-w-2xl bg-white shadow-2xl max-h-[80vh] flex flex-col">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <Lock className={`w-4 h-4 ${viewDoc.is_locked?"text-amber-500":"text-gray-300"}`} />
                <h3 className="text-sm font-bold text-gray-700">{viewDoc.name}</h3>
              </div>
              <div className="flex gap-2">
                <button onClick={()=>printDoc(viewDoc)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs hover:bg-gray-200">
                  <Printer className="w-3 h-3"/> Print
                </button>
                {viewDoc.file_url && <button onClick={()=>downloadDoc(viewDoc)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-100 text-green-700 text-xs hover:bg-green-200">
                  <Download className="w-3 h-3"/> Download
                </button>}
                <button onClick={()=>setViewDoc(null)} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500"><X className="w-4 h-4"/></button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-5">
              {viewDoc.file_url?.startsWith("data:image/") ? (
                <img src={viewDoc.file_url} alt={viewDoc.name} className="max-w-full rounded-xl" />
              ) : viewDoc.template_html ? (
                <div dangerouslySetInnerHTML={{__html:viewDoc.template_html}} className="prose prose-sm max-w-none" />
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">{viewDoc.name}</p>
                  <p className="text-xs text-gray-400 mt-1">{viewDoc.description}</p>
                  <p className="text-xs text-gray-300 mt-4">Preview not available — use Download or Print</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Template editor (admin only) */}
      {editTemplate && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={()=>setEditTemplate(null)} />
          <div className="relative rounded-2xl overflow-hidden w-full max-w-2xl bg-white shadow-2xl max-h-[85vh] flex flex-col">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between" style={{background:"#5C2D91"}}>
              <h3 className="text-sm font-black text-white flex items-center gap-2"><Edit className="w-4 h-4"/> Edit Template</h3>
              <button onClick={()=>setEditTemplate(null)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/70"><X className="w-4 h-4"/></button>
            </div>
            <div className="flex-1 p-4 overflow-auto space-y-3">
              <input value={editTemplate.name} onChange={e=>setEditTemplate((p:any)=>({...p,name:e.target.value}))}
                placeholder="Template name"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none" />
              <textarea value={editTemplate.template_html||""} onChange={e=>setEditTemplate((p:any)=>({...p,template_html:e.target.value}))}
                placeholder="HTML template content…" rows={12}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs font-mono outline-none focus:border-purple-400 resize-y" />
            </div>
            <div className="px-4 py-3 border-t flex gap-2 justify-end">
              <button onClick={()=>setEditTemplate(null)} className="px-4 py-2 rounded-xl border text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={saveTemplate} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-700 text-white text-sm font-bold hover:bg-purple-800">
                <FileCheck className="w-3.5 h-3.5"/> Save Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
