/**
 * ProcurBosse - Documents & File Import v6.0
 * Upload Word/Excel/PDF/CSV - Parse & map to ERP modules - Hardcopy digitisation
 * Realtime sync - Full document library - Admin controls
 * EL5 MediProcure - Embu Level 5 Hospital
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { pageCache } from "@/lib/pageCache";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { T } from "@/lib/theme";
import {
  detectKind, parseExcel, parseCSV, parseWord, parsePDF,
  fmtSize, type ParsedDocument, type ParsedTable
} from "@/lib/documentParser";
import {
  Upload, FileText, FileSpreadsheet, File, Image as ImgIcon,
  Download, Eye, Trash2, Search, RefreshCw, Plus, X, Check,
  ChevronDown, ChevronRight, AlertTriangle, Database, Layers,
  Table2, BookOpen, Scan, Zap, Clock, CheckCircle, Filter,
  ArrowRight, FolderOpen, Info, Edit3, Copy
} from "lucide-react";

const db = supabase as any;

/* - Types - */
interface DocRecord {
  id: string; name: string; category: string; description?: string;
  file_type?: string; file_url?: string; storage_path?: string;
  file_size?: number; original_filename?: string; import_status?: string;
  source?: string; created_at: string; uploaded_by?: string;
  parsed_content?: string; metadata?: any;
}
interface ImportRecord {
  id: string; original_file: string; file_type: string; file_size?: number;
  import_type: string; mapped_to?: string; mapped_records?: any[];
  status: string; error_message?: string; created_at: string;
  parsed_tables?: any[]; parsed_text?: string; document_id?: string;
}

/* - File type config - */
const FILE_ICONS: Record<string, { icon: any; color: string; bg: string }> = {
  excel:   { icon: FileSpreadsheet, color: "#16a34a", bg: "#16a34a18" },
  csv:     { icon: FileSpreadsheet, color: "#059669", bg: "#05986918" },
  word:    { icon: FileText,        color: "#1d4ed8", bg: "#1d4ed818" },
  pdf:     { icon: File,            color: "#dc2626", bg: "#dc262618" },
  image:   { icon: ImgIcon,         color: "#7c3aed", bg: "#7c3aed18" },
  unknown: { icon: FileText,        color: T.fgDim,   bg: T.bg2       },
};

const MODULE_LABELS: Record<string, string> = {
  items:"Items / Stock", suppliers:"Suppliers", requisitions:"Requisitions",
  purchase_orders:"Purchase Orders", payment_vouchers:"Payment Vouchers",
  budgets:"Budgets", goods_received:"Goods Received", profiles:"Users/Staff",
  documents:"Document Library",
};

const CATS = ["all","general","policy","template","contract","report","letter","form","procedure","system","import"];

/* - Styles - */
const card: React.CSSProperties = { background:T.card, border:`1px solid ${T.border}`, borderRadius:T.rLg, padding:"16px 20px" };
const inp: React.CSSProperties = { width:"100%", background:T.bg, border:`1px solid ${T.border}`, borderRadius:T.r, padding:"8px 12px", color:T.fg, fontSize:13, outline:"none", boxSizing:"border-box" };
const btn = (bg: string, border?: string): React.CSSProperties => ({
  display:"inline-flex", alignItems:"center", gap:7, padding:"8px 16px",
  background:bg, color: border ? T.fgMuted : "#fff",
  border:`1px solid ${border||"transparent"}`, borderRadius:T.r,
  fontSize:13, fontWeight:700, cursor:"pointer",
});

/* - */
export default function DocumentsPage() {
  const nav = useNavigate();
  const { user, profile, roles } = useAuth();
  const isAdmin = roles?.includes("admin") || roles?.includes("procurement_manager");

  /* - State - */
  const [tab, setTab]               = useState<"library"|"upload"|"imports"|"hardcopy">("library");
  const [docs, setDocs]             = useState<DocRecord[]>([]);
  const [imports, setImports]       = useState<ImportRecord[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [catFilter, setCatFilter]   = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  /* Upload state */
  const [dragOver, setDragOver]     = useState(false);
  const [queue, setQueue]           = useState<UploadQueueItem[]>([]);
  const [parsing, setParsing]       = useState<string|null>(null);
  const [parsed, setParsed]         = useState<ParsedDocument|null>(null);
  const [mapModal, setMapModal]     = useState<{ qi: UploadQueueItem; doc: ParsedDocument }|null>(null);
  const [importing, setImporting]   = useState(false);
  const fileInputRef                = useRef<HTMLInputElement>(null);

  /* - Load data - */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: dData }, { data: iData }] = await Promise.all([
        db.from("documents").select("*").order("created_at", { ascending:false }).limit(200),
        db.from("document_imports").select("*").order("created_at", { ascending:false }).limit(100),
      ]);
      setDocs(dData || []);
      setImports(iData || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const ch = db.channel("docs:rt")
      .on("postgres_changes",{event:"*",schema:"public",table:"documents"}, load)
      .on("postgres_changes",{event:"*",schema:"public",table:"document_imports"}, load)
      .subscribe();
    return () => db.removeChannel(ch);
  }, [load]);

  /* - File drop handling - */
  const handleFiles = useCallback((files: File[]) => {
    const items: UploadQueueItem[] = files.map(f => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
      file: f, kind: detectKind(f),
      status: "queued" as const, progress: 0,
      name: f.name.replace(/\.[^.]+$/,""),
      category: "general",
    }));
    setQueue(prev => [...prev, ...items]);
    setTab("upload");
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    handleFiles(Array.from(e.dataTransfer.files));
  }, [handleFiles]);

  /* - Upload + Parse + Store - */
  const processItem = useCallback(async (qi: UploadQueueItem) => {
    setQueue(prev => prev.map(q => q.id===qi.id ? {...q, status:"uploading", progress:10} : q));
    setParsing(qi.id);

    try {
      /* 1. Upload to Supabase Storage */
      const ext = qi.file.name.split(".").pop() || "bin";
      const ts  = Date.now();
      const path = `${user?.id||"anon"}/${ts}-${qi.file.name}`;

      setQueue(prev => prev.map(q => q.id===qi.id ? {...q, progress:25} : q));
      const { error: upErr } = await supabase.storage.from("documents").upload(path, qi.file, { upsert:false });
      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage.from("documents").getPublicUrl(path);
      setQueue(prev => prev.map(q => q.id===qi.id ? {...q, progress:50} : q));

      /* 2. Parse the file */
      let parsed: ParsedDocument | null = null;
      try {
        if (qi.kind === "excel") parsed = await parseExcel(qi.file);
        else if (qi.kind === "csv") parsed = await parseCSV(qi.file);
        else if (qi.kind === "word") parsed = await parseWord(qi.file);
        else if (qi.kind === "pdf") parsed = await parsePDF(qi.file);
      } catch { /* parsing failure is non-fatal */ }

      setQueue(prev => prev.map(q => q.id===qi.id ? {...q, progress:75} : q));

      /* 3. Save to documents table */
      const { data: doc, error: docErr } = await db.from("documents").insert({
        name: qi.name || qi.file.name,
        category: qi.category || "general",
        description: parsed?.text?.slice(0,300) || "",
        file_url: publicUrl,
        storage_path: path,
        file_type: qi.kind,
        file_size: qi.file.size,
        original_filename: qi.file.name,
        parsed_content: parsed?.text?.slice(0,5000) || null,
        metadata: parsed ? { sheets: parsed.metadata, suggestedModule: parsed.suggestedModule, tableCount: parsed.tables.length } : {},
        source: "upload",
        import_status: parsed?.tables.length ? "parsed" : "stored",
        uploaded_by: user?.id,
        created_at: new Date().toISOString(),
      }).select().single();

      if (docErr) throw docErr;
      setQueue(prev => prev.map(q => q.id===qi.id ? {...q, progress:90} : q));

      /* 4. Save import record */
      await db.from("document_imports").insert({
        document_id: doc.id,
        original_file: qi.file.name,
        file_type: qi.kind,
        file_size: qi.file.size,
        storage_path: path,
        import_type: "digital",
        parsed_tables: parsed?.tables?.map(t => ({ name:t.name, headers:t.headers, rowCount:t.rowCount })) || [],
        parsed_text: parsed?.text?.slice(0,3000) || null,
        mapped_to: parsed?.suggestedModule || null,
        status: "complete",
        imported_by: user?.id,
        completed_at: new Date().toISOString(),
      });

      setQueue(prev => prev.map(q => q.id===qi.id ? {...q, status:"done", progress:100, docId:doc.id, parsedDoc:parsed} : q));
      setParsed(parsed);

      /* 5. If has structured tables, offer mapping */
      if (parsed?.tables.length && parsed.tables[0].rows.length > 0 && parsed.suggestedModule && parsed.suggestedModule !== "documents") {
        setMapModal({ qi, doc: parsed });
      }

      toast({ title:"- Uploaded", description:`${qi.file.name} processed (${parsed?.tables.length||0} tables found)` });
    } catch(e:any) {
      setQueue(prev => prev.map(q => q.id===qi.id ? {...q, status:"error", error:e.message} : q));
      toast({ title:"Upload failed", description:e.message, variant:"destructive" });
    } finally {
      setParsing(null);
      load();
    }
  }, [user, load]);

  /* - Import rows into ERP module - */
  const importRows = useCallback(async (qi: UploadQueueItem, doc: ParsedDocument, targetModule: string, table: ParsedTable) => {
    if (!table.rows.length) return;
    setImporting(true);
    let imported = 0, failed = 0;

    try {
      const chunk = 50;
      for (let i = 0; i < table.rows.length; i += chunk) {
        const batch = table.rows.slice(i, i+chunk);
        let rows: any[] = [];

        if (targetModule === "items") {
          rows = batch.map(r => ({
            name: r.name||r.item_name||r.description||r.item||"Imported Item",
            unit_of_measure: r.unit_of_measure||r.uom||r.unit||"PCS",
            current_quantity: parseFloat(r.current_quantity||r.qty||"0")||0,
            reorder_level: parseFloat(r.reorder_level||r.reorder||"10")||10,
            unit_price: parseFloat(r.unit_price||r.price||"0")||0,
            category: r.category||"General",
            created_at: new Date().toISOString(),
          })).filter(r => r.name && r.name !== "Imported Item");
        } else if (targetModule === "suppliers") {
          rows = batch.map(r => ({
            name: r.name||r.supplier_name||r.company||"",
            contact_person: r.contact_person||r.contact||"",
            phone: r.phone||r.mobile||r.tel||"",
            email: r.email||r.email_address||"",
            kra_pin: r.kra_pin||r.pin||r.tin||"",
            address: r.address||r.location||"",
            category: r.category||"General",
            status: "active",
            created_at: new Date().toISOString(),
          })).filter(r => r.name);
        } else if (targetModule === "requisitions") {
          rows = batch.map(r => ({
            title: r.title||r.description||r.item||"",
            department: r.department||r.dept||"",
            status: "draft",
            priority: r.priority||"normal",
            requested_by: user?.id,
            created_at: new Date().toISOString(),
          })).filter(r => r.title);
        }

        if (rows.length) {
          const { error } = await db.from(targetModule).insert(rows);
          if (!error) imported += rows.length; else failed += rows.length;
        }
      }

      /* Update import record */
      await db.from("document_imports")
        .update({ mapped_records: [{ module:targetModule, count:imported }], status:"complete" })
        .eq("document_id", qi.docId);

      toast({ title:`- Imported ${imported} records`, description:`${failed} skipped - Module: ${MODULE_LABELS[targetModule]}` });
      setMapModal(null);
      load();
    } catch(e:any) {
      toast({ title:"Import error", description:e.message, variant:"destructive" });
    } finally { setImporting(false); }
  }, [user, load]);

  /* - Delete document - */
  const deleteDoc = async (doc: DocRecord) => {
    if (!confirm(`Delete "${doc.name}"?`)) return;
    if (doc.storage_path) {
      await supabase.storage.from("documents").remove([doc.storage_path]).catch(()=>{});
    }
    await db.from("documents").delete().eq("id", doc.id);
    toast({ title:"Deleted", description:doc.name });
    load();
  };

  /* - Download - */
  const downloadDoc = async (doc: DocRecord) => {
    if (!doc.storage_path) { window.open(doc.file_url, "_blank"); return; }
    const { data } = await supabase.storage.from("documents").download(doc.storage_path);
    if (data) {
      const url = URL.createObjectURL(data);
      const a = document.createElement("a"); a.href=url; a.download=doc.original_filename||doc.name;
      a.click(); URL.revokeObjectURL(url);
    }
  };

  /* - Filtered docs - */
  const filteredDocs = docs.filter(d => {
    const s = search.toLowerCase();
    const matchSearch = !s || d.name?.toLowerCase().includes(s) || d.description?.toLowerCase().includes(s) || d.original_filename?.toLowerCase().includes(s);
    const matchCat = catFilter==="all" || d.category===catFilter;
    const matchType = typeFilter==="all" || d.file_type===typeFilter;
    return matchSearch && matchCat && matchType;
  });

  /* - */
  return (
    <div style={{ padding:20, minHeight:"100vh", background:T.bg }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes progress{from{width:0%}to{width:100%}}
      `}</style>

      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
        <FolderOpen size={22} color={T.primary}/>
        <div>
          <h1 style={{margin:0,fontSize:20,fontWeight:800,color:T.fg}}>Documents & File Imports</h1>
          <div style={{fontSize:11,color:T.fgDim,marginTop:2}}>
            {docs.length} documents - {imports.filter(i=>i.status==="complete").length} imports complete - Upload Word, Excel, PDF, CSV
          </div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:8}}>
          <button onClick={load} style={btn(T.bg2,T.border)}><RefreshCw size={13}/> Refresh</button>
          <button
            onClick={()=>{setTab("upload");fileInputRef.current?.click();}}
            style={btn(T.primary)}>
            <Upload size={13}/> Upload Files
          </button>
          <button onClick={()=>nav("/documents/editor")} style={btn("#7c3aed")}>
            <Edit3 size={13}/> New Document
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:4,marginBottom:16}}>
        {[
          {id:"library", label:"Document Library", icon:FolderOpen, count:docs.length},
          {id:"upload",  label:"Upload & Import",  icon:Upload,     count:queue.filter(q=>q.status==="queued").length},
          {id:"imports", label:"Import History",   icon:Database,   count:imports.length},
          {id:"hardcopy",label:"Hardcopy Guide",   icon:Scan,       count:0},
        ].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id as any)} style={{
            display:"flex",alignItems:"center",gap:7,padding:"8px 16px",
            background:tab===t.id?T.primary:T.card,
            color:tab===t.id?"#fff":T.fgMuted,
            border:`1px solid ${tab===t.id?T.primary:T.border}`,
            borderRadius:T.r,fontSize:13,fontWeight:700,cursor:"pointer",
          }}>
            <t.icon size={13}/>{t.label}
            {t.count>0&&<span style={{minWidth:18,height:18,borderRadius:9,background:tab===t.id?"rgba(255,255,255,.3)":T.primary,color:"#fff",fontSize:10,fontWeight:800,textAlign:"center",lineHeight:"18px",padding:"0 5px"}}>{t.count}</span>}
          </button>
        ))}
      </div>

      {/* - LIBRARY TAB - */}
      {tab==="library"&&(
        <div>
          {/* Search + filters */}
          <div style={{...card,display:"flex",gap:10,alignItems:"center",marginBottom:14}}>
            <div style={{position:"relative",flex:1}}>
              <Search size={13} color={T.fgDim} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)"}}/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search documents..." style={{...inp,paddingLeft:30}}/>
            </div>
            <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} style={{...inp,width:150}}>
              {CATS.map(c=><option key={c} value={c}>{c==="all"?"All Categories":c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
            </select>
            <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} style={{...inp,width:130}}>
              {["all","excel","csv","word","pdf","image"].map(t=><option key={t} value={t}>{t==="all"?"All Types":t.toUpperCase()}</option>)}
            </select>
            <span style={{fontSize:11,color:T.fgDim,whiteSpace:"nowrap"}}>{filteredDocs.length} results</span>
          </div>

          {/* Drop zone for library */}
          <div
            onDragOver={e=>{e.preventDefault();setDragOver(true)}}
            onDragLeave={()=>setDragOver(false)} onDrop={onDrop}
            style={{
              border:`2px dashed ${dragOver?T.primary:T.border}`,borderRadius:T.rLg,
              padding:"20px 24px",marginBottom:14,textAlign:"center",
              background:dragOver?`${T.primary}10`:T.bg2,transition:"all .2s",
              cursor:"pointer",
            }}
            onClick={()=>fileInputRef.current?.click()}>
            <Upload size={28} color={dragOver?T.primary:T.fgDim} style={{margin:"0 auto 8px",display:"block"}}/>
            <div style={{fontSize:13,color:T.fgMuted}}>Drop files here or <span style={{color:T.primary,fontWeight:700}}>click to browse</span></div>
            <div style={{fontSize:11,color:T.fgDim,marginTop:4}}>Supports: Word (.docx), Excel (.xlsx), PDF, CSV, Images (max 50MB)</div>
          </div>

          {/* Document grid */}
          {loading?(
            <div style={{padding:40,textAlign:"center",color:T.fgDim}}>Loading documents...</div>
          ):filteredDocs.length===0?(
            <div style={{...card,textAlign:"center",padding:50}}>
              <FolderOpen size={40} color={T.fgDim} style={{margin:"0 auto 12px",display:"block"}}/>
              <div style={{color:T.fgDim,fontSize:13}}>No documents found. Upload your first file.</div>
            </div>
          ):(
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
              {filteredDocs.map(doc=>{
                const fc = FILE_ICONS[doc.file_type||"unknown"]||FILE_ICONS.unknown;
                return(
                  <div key={doc.id} style={{...card,padding:16,display:"flex",flexDirection:"column",gap:10}}>
                    <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                      <div style={{width:44,height:44,borderRadius:10,background:fc.bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <fc.icon size={22} color={fc.color}/>
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:700,color:T.fg,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{doc.name}</div>
                        <div style={{fontSize:10,color:T.fgDim,marginTop:2}}>{doc.original_filename||"-"}</div>
                        <div style={{display:"flex",gap:6,marginTop:5,flexWrap:"wrap"}}>
                          {doc.file_type&&<span style={{padding:"1px 7px",borderRadius:99,fontSize:9,fontWeight:700,background:fc.bg,color:fc.color,border:`1px solid ${fc.color}44`}}>{doc.file_type.toUpperCase()}</span>}
                          {doc.category&&<span style={{padding:"1px 7px",borderRadius:99,fontSize:9,fontWeight:700,background:`${T.primary}18`,color:T.primary}}>{doc.category}</span>}
                          {doc.file_size&&<span style={{fontSize:9,color:T.fgDim}}>{fmtSize(doc.file_size)}</span>}
                        </div>
                      </div>
                    </div>
                    {doc.description&&<div style={{fontSize:11,color:T.fgMuted,lineHeight:1.5,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{doc.description}</div>}
                    {doc.import_status==="parsed"&&(
                      <div style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:T.success,background:T.successBg,border:`1px solid ${T.success}33`,borderRadius:6,padding:"4px 8px"}}>
                        <CheckCircle size={11}/> Parsed - {doc.metadata?.tableCount||0} tables extracted
                      </div>
                    )}
                    <div style={{display:"flex",gap:6,marginTop:"auto"}}>
                      {doc.file_url&&<button onClick={()=>downloadDoc(doc)} style={{...btn(T.bg2,T.border),padding:"6px 12px",fontSize:11}}><Download size={12}/> Download</button>}
                      {doc.file_url&&<button onClick={()=>window.open(doc.file_url,"_blank")} style={{...btn(T.bg2,T.border),padding:"6px 12px",fontSize:11}}><Eye size={12}/> View</button>}
                      {isAdmin&&<button onClick={()=>deleteDoc(doc)} style={{...btn(T.bg2,T.border),padding:"6px 12px",fontSize:11,marginLeft:"auto",color:T.error}}><Trash2 size={12}/></button>}
                    </div>
                    <div style={{fontSize:9,color:T.fgDim}}>{new Date(doc.created_at).toLocaleDateString("en-KE")}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* - UPLOAD TAB - */}
      {tab==="upload"&&(
        <div>
          {/* Drop zone */}
          <div
            onDragOver={e=>{e.preventDefault();setDragOver(true)}}
            onDragLeave={()=>setDragOver(false)} onDrop={onDrop}
            onClick={()=>fileInputRef.current?.click()}
            style={{
              border:`2px dashed ${dragOver?T.primary:T.border}`,borderRadius:T.rXl,
              padding:"48px 24px",marginBottom:20,textAlign:"center",
              background:dragOver?`${T.primary}12`:T.bg2,transition:"all .2s",cursor:"pointer",
            }}>
            <Upload size={48} color={dragOver?T.primary:T.fgDim} style={{margin:"0 auto 16px",display:"block"}}/>
            <div style={{fontSize:16,fontWeight:700,color:T.fg,marginBottom:8}}>
              {dragOver?"Release to upload":"Drop your files here"}
            </div>
            <div style={{fontSize:13,color:T.fgMuted,marginBottom:12}}>or click to browse files</div>
            <div style={{display:"flex",justifyContent:"center",gap:10,flexWrap:"wrap"}}>
              {[
                {label:"Word .docx",color:T.primary},
                {label:"Excel .xlsx",color:"#16a34a"},
                {label:"PDF .pdf",color:"#dc2626"},
                {label:"CSV .csv",color:"#059669"},
                {label:"Images",color:"#7c3aed"},
              ].map(f=>(
                <span key={f.label} style={{padding:"4px 12px",borderRadius:99,fontSize:11,fontWeight:700,background:`${f.color}18`,color:f.color,border:`1px solid ${f.color}44`}}>{f.label}</span>
              ))}
            </div>
          </div>

          {/* Queue */}
          {queue.length>0&&(
            <div style={card}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                <div style={{fontWeight:700,color:T.fg,fontSize:14}}>Upload Queue ({queue.length})</div>
                <button onClick={()=>setQueue(q=>q.filter(i=>i.status!=="done"))} style={{...btn(T.bg2,T.border),padding:"5px 12px",fontSize:11}}>
                  <X size={12}/> Clear Done
                </button>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {queue.map(qi=>{
                  const fc=FILE_ICONS[qi.kind]||FILE_ICONS.unknown;
                  return(
                    <div key={qi.id} style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:T.r,padding:"12px 14px"}}>
                      <div style={{display:"flex",gap:10,alignItems:"center"}}>
                        <div style={{width:36,height:36,borderRadius:8,background:fc.bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          <fc.icon size={18} color={fc.color}/>
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:12,fontWeight:600,color:T.fg,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{qi.file.name}</div>
                          <div style={{fontSize:10,color:T.fgDim,marginTop:1}}>{fmtSize(qi.file.size)} - {qi.kind.toUpperCase()}</div>
                          {(qi.status==="uploading"||qi.status==="parsing")&&(
                            <div style={{marginTop:6,background:T.bg,borderRadius:4,overflow:"hidden",height:4}}>
                              <div style={{width:`${qi.progress}%`,height:"100%",background:T.primary,transition:"width .3s",borderRadius:4}}/>
                            </div>
                          )}
                          {qi.status==="done"&&qi.parsedDoc&&(
                            <div style={{fontSize:10,color:T.success,marginTop:2}}>
                              - {qi.parsedDoc.tables.length} tables - {qi.parsedDoc.mappedRows.length} rows parsed
                              {qi.parsedDoc.suggestedModule&&qi.parsedDoc.suggestedModule!=="documents"&&(
                                <span style={{color:T.accent,marginLeft:6}}>- {MODULE_LABELS[qi.parsedDoc.suggestedModule]}</span>
                              )}
                            </div>
                          )}
                          {qi.status==="error"&&<div style={{fontSize:10,color:T.error,marginTop:2}}>- {qi.error}</div>}
                        </div>
                        <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
                          {qi.status==="queued"&&(
                            <>
                              <select value={qi.category} onChange={e=>{const v=e.target.value;setQueue(prev=>prev.map(q=>q.id===qi.id?{...q,category:v}:q));}}
                                style={{...inp,width:110,padding:"4px 8px",fontSize:11}}>
                                {CATS.filter(c=>c!=="all").map(c=><option key={c} value={c}>{c}</option>)}
                              </select>
                              <button onClick={()=>processItem(qi)} style={btn(T.primary)}><Upload size={13}/> Upload</button>
                            </>
                          )}
                          {qi.status==="uploading"&&<div style={{fontSize:11,color:T.primary,display:"flex",alignItems:"center",gap:5}}><RefreshCw size={12} style={{animation:"spin 1s linear infinite"}}/>{qi.progress}%</div>}
                          {qi.status==="done"&&<CheckCircle size={18} color={T.success}/>}
                          {qi.status==="error"&&<AlertTriangle size={18} color={T.error}/>}
                          <button onClick={()=>setQueue(prev=>prev.filter(q=>q.id!==qi.id))} style={{background:"transparent",border:"none",cursor:"pointer",color:T.fgDim,padding:4}}>
                            <X size={13}/>
                          </button>
                        </div>
                      </div>
                      {/* Import to module button */}
                      {qi.status==="done"&&qi.parsedDoc&&qi.parsedDoc.tables.length>0&&qi.parsedDoc.suggestedModule&&qi.parsedDoc.suggestedModule!=="documents"&&(
                        <button onClick={()=>setMapModal({qi,doc:qi.parsedDoc!})}
                          style={{...btn(T.accent),marginTop:10,fontSize:11,padding:"6px 14px"}}>
                          <ArrowRight size={12}/> Import {qi.parsedDoc.tables[0].rowCount} rows - {MODULE_LABELS[qi.parsedDoc.suggestedModule]}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Upload all queued */}
              {queue.some(q=>q.status==="queued")&&(
                <button onClick={()=>queue.filter(q=>q.status==="queued").forEach(q=>processItem(q))}
                  style={{...btn(T.success),marginTop:14,width:"100%",justifyContent:"center"}}>
                  <Zap size={13}/> Upload All ({queue.filter(q=>q.status==="queued").length} files)
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* - IMPORTS TAB - */}
      {tab==="imports"&&(
        <div style={card}>
          <div style={{fontWeight:700,color:T.fg,fontSize:14,marginBottom:14}}>Import History ({imports.length})</div>
          {imports.length===0?(
            <div style={{textAlign:"center",padding:40,color:T.fgDim}}>No imports yet</div>
          ):(
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr style={{borderBottom:`1px solid ${T.border}`}}>
                  {["File","Type","Size","Module","Tables","Status","Date"].map(h=>(
                    <th key={h} style={{padding:"8px 12px",textAlign:"left",fontSize:11,fontWeight:700,color:T.fgDim}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {imports.map(imp=>{
                  const fc=FILE_ICONS[imp.file_type]||FILE_ICONS.unknown;
                  const statusColor=imp.status==="complete"?T.success:imp.status==="failed"?T.error:T.warning;
                  return(
                    <tr key={imp.id} style={{borderBottom:`1px solid ${T.border}22`}}>
                      <td style={{padding:"9px 12px"}}>
                        <div style={{display:"flex",gap:8,alignItems:"center"}}>
                          <fc.icon size={14} color={fc.color}/>
                          <span style={{fontSize:12,color:T.fg,maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{imp.original_file}</span>
                        </div>
                      </td>
                      <td style={{padding:"9px 12px"}}><span style={{fontSize:11,fontWeight:700,color:fc.color}}>{imp.file_type?.toUpperCase()}</span></td>
                      <td style={{padding:"9px 12px",fontSize:11,color:T.fgDim}}>{imp.file_size?fmtSize(imp.file_size):"-"}</td>
                      <td style={{padding:"9px 12px",fontSize:11,color:T.fgMuted}}>{imp.mapped_to?MODULE_LABELS[imp.mapped_to]||imp.mapped_to:"-"}</td>
                      <td style={{padding:"9px 12px",fontSize:11,color:T.fgMuted}}>{imp.parsed_tables?.length||0}</td>
                      <td style={{padding:"9px 12px"}}>
                        <span style={{padding:"2px 8px",borderRadius:99,fontSize:10,fontWeight:700,background:`${statusColor}18`,color:statusColor}}>{imp.status}</span>
                      </td>
                      <td style={{padding:"9px 12px",fontSize:11,color:T.fgDim}}>{new Date(imp.created_at).toLocaleDateString("en-KE")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* - HARDCOPY GUIDE TAB - */}
      {tab==="hardcopy"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <div style={card}>
            <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:16}}>
              <Scan size={20} color={T.primary}/>
              <div>
                <div style={{fontWeight:800,color:T.fg,fontSize:15}}>Digitising Hardcopy Documents</div>
                <div style={{fontSize:11,color:T.fgDim,marginTop:2}}>How to convert physical records into the ERP system</div>
              </div>
            </div>
            {[
              {step:"1",title:"Scan or photograph",desc:"Use a scanner or phone camera (Office Lens / Adobe Scan) to capture the hardcopy document. Save as PDF or JPG."},
              {step:"2",title:"Upload the file",desc:"Go to Upload & Import tab, drag-drop or click to select the scanned file. Supports PDF, JPG, PNG."},
              {step:"3",title:"System parses content",desc:"ProcurBosse automatically extracts text and tables from the file using AI-assisted parsing."},
              {step:"4",title:"Map to ERP module",desc:"Review suggested mapping (e.g. LPO - Purchase Orders, stores requisition - Requisitions) and confirm import."},
              {step:"5",title:"Records created",desc:"ERP records are created automatically. The original file is stored in the document library for audit reference."},
            ].map(({step,title,desc})=>(
              <div key={step} style={{display:"flex",gap:12,marginBottom:14}}>
                <div style={{width:28,height:28,borderRadius:"50%",background:T.primary,color:"#fff",fontWeight:800,fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{step}</div>
                <div>
                  <div style={{fontWeight:700,color:T.fg,fontSize:13,marginBottom:3}}>{title}</div>
                  <div style={{fontSize:12,color:T.fgMuted,lineHeight:1.6}}>{desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {/* Supported formats */}
            <div style={card}>
              <div style={{fontWeight:700,color:T.fg,marginBottom:12}}>Supported File Formats</div>
              {[
                {label:"Excel (.xlsx, .xls)",color:"#16a34a",desc:"Inventory lists, supplier lists, budget data, price lists"},
                {label:"Word (.docx, .doc)", color:"#1d4ed8",desc:"LPOs, contracts, letters, policies, procedures"},
                {label:"PDF (.pdf)",          color:"#dc2626",desc:"Scanned documents, signed forms, invoices, GRNs"},
                {label:"CSV (.csv)",          color:"#059669",desc:"Data exports, bulk imports, financial data"},
                {label:"Images (.jpg, .png)", color:"#7c3aed",desc:"Scanned handwritten forms, physical receipts, stamps"},
              ].map(f=>(
                <div key={f.label} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:10}}>
                  <span style={{padding:"2px 8px",borderRadius:6,fontSize:10,fontWeight:700,background:`${f.color}18`,color:f.color,flexShrink:0}}>{f.label}</span>
                  <span style={{fontSize:11,color:T.fgMuted}}>{f.desc}</span>
                </div>
              ))}
            </div>

            {/* Quick import buttons */}
            <div style={card}>
              <div style={{fontWeight:700,color:T.fg,marginBottom:12}}>Quick Import Helpers</div>
              <div style={{fontSize:12,color:T.fgMuted,marginBottom:10}}>Download a template, fill in the data, then upload to auto-import into the ERP:</div>
              {[
                {label:"Items / Stock Template (.xlsx)",     module:"items"},
                {label:"Suppliers List Template (.xlsx)",    module:"suppliers"},
                {label:"Requisitions Template (.xlsx)",      module:"requisitions"},
              ].map(t=>(
                <button key={t.module}
                  onClick={()=>{
                    const XLSX=(window as any).XLSX||require("xlsx");
                    const templates:{[key:string]:string[]}={
                      items:["name","unit_of_measure","current_quantity","reorder_level","unit_price","category"],
                      suppliers:["name","contact_person","phone","email","kra_pin","address","category"],
                      requisitions:["title","department","quantity","unit_price","priority"],
                    };
                    const headers=templates[t.module]||[];
                    const ws=XLSX.utils.aoa_to_sheet([headers,Array(headers.length).fill("")]);
                    const wbk=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wbk,ws,"Import");
                    XLSX.writeFile(wbk,`procurbosse_${t.module}_template.xlsx`);
                  }}
                  style={{...btn(T.bg2,T.border),width:"100%",justifyContent:"flex-start",marginBottom:6,fontSize:12}}>
                  <Download size={12}/>{t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* - MAPPING MODAL - */}
      {mapModal&&(
        <div style={{position:"fixed",inset:0,zIndex:400,background:"rgba(0,0,0,.75)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setMapModal(null)}>
          <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:T.rXl,padding:28,width:"100%",maxWidth:680,maxHeight:"90vh",overflowY:"auto",animation:"fadeIn .2s"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div>
                <div style={{fontWeight:800,color:T.fg,fontSize:16}}>Import Data into ERP</div>
                <div style={{fontSize:11,color:T.fgDim,marginTop:2}}>Review extracted data and confirm import</div>
              </div>
              <button onClick={()=>setMapModal(null)} style={{background:"transparent",border:"none",cursor:"pointer",color:T.fgDim}}><X size={18}/></button>
            </div>

            {/* Module selector */}
            <div style={{marginBottom:14}}>
              <label style={{fontSize:11,color:T.fgDim,display:"block",marginBottom:4}}>Target Module</label>
              <select defaultValue={mapModal.doc.suggestedModule||"documents"}
                id="targetModule" style={{...inp}}>
                {Object.entries(MODULE_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
              </select>
            </div>

            {/* Preview table */}
            {mapModal.doc.tables.map((table,ti)=>(
              <div key={ti} style={{marginBottom:16}}>
                <div style={{fontSize:12,fontWeight:700,color:T.fg,marginBottom:8}}>
                  Sheet: {table.name} ({table.rowCount} rows)
                </div>
                <div style={{overflowX:"auto",borderRadius:8,border:`1px solid ${T.border}`}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                    <thead>
                      <tr style={{background:T.bg}}>
                        {table.headers.slice(0,6).map(h=>(
                          <th key={h} style={{padding:"6px 10px",textAlign:"left",fontWeight:700,color:T.fgDim,whiteSpace:"nowrap",borderBottom:`1px solid ${T.border}`}}>{h}</th>
                        ))}
                        {table.headers.length>6&&<th style={{padding:"6px 10px",color:T.fgDim}}>+{table.headers.length-6}</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {table.rows.slice(0,5).map((row,ri)=>(
                        <tr key={ri} style={{borderBottom:`1px solid ${T.border}22`}}>
                          {table.headers.slice(0,6).map(h=>(
                            <td key={h} style={{padding:"5px 10px",color:T.fg,maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{row[h]||"-"}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {table.rowCount>5&&<div style={{fontSize:10,color:T.fgDim,marginTop:4}}>Showing 5 of {table.rowCount} rows</div>}

                <button
                  onClick={()=>{
                    const sel=document.getElementById("targetModule") as HTMLSelectElement;
                    importRows(mapModal.qi, mapModal.doc, sel.value, table);
                  }}
                  disabled={importing}
                  style={{...btn(T.success),marginTop:12}}>
                  {importing?<RefreshCw size={13} style={{animation:"spin 1s linear infinite"}}/>:<ArrowRight size={13}/>}
                  {importing?"Importing...`":`Import ${table.rowCount} rows - ${MODULE_LABELS[(document.getElementById("targetModule") as HTMLSelectElement)?.value||"documents"]||"ERP"}`}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" multiple accept=".xlsx,.xls,.docx,.doc,.pdf,.csv,.txt,.jpg,.jpeg,.png,.webp"
        style={{display:"none"}} onChange={e=>{if(e.target.files)handleFiles(Array.from(e.target.files));e.target.value="";}}/>
    </div>
  );
}

/* - Queue item type - */
interface UploadQueueItem {
  id: string; file: File; kind: string;
  status: "queued"|"uploading"|"parsing"|"done"|"error";
  progress: number; name: string; category: string;
  error?: string; docId?: string; parsedDoc?: ParsedDocument;
}

import * as XLSX from "xlsx";
import type React from "react";
