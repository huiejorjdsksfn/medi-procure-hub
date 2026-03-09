import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  FileText, Upload, Eye, Lock, Download, Search, X, Plus, Filter,
  Printer, RefreshCw, Edit3, Trash2, FileCheck, Settings, Pen,
  ChevronDown, Users, Shield, Save, Image, CheckCircle, AlertTriangle
} from "lucide-react";

const CATS = ["general","policy","template","contract","report","letter","form","procedure","other"];
const CAT_COLORS: Record<string,{bg:string;color:string}> = {
  general:{bg:"#f3f4f6",color:"#6b7280"}, policy:{bg:"#dbeafe",color:"#1d4ed8"},
  template:{bg:"#fef3c7",color:"#92400e"}, contract:{bg:"#dcfce7",color:"#15803d"},
  report:{bg:"#ede9fe",color:"#5b21b6"}, letter:{bg:"#fce7f3",color:"#9d174d"},
  form:{bg:"#e0f2fe",color:"#0369a1"}, procedure:{bg:"#f0fdf4",color:"#166534"},
  other:{bg:"#f9fafb",color:"#374151"},
};

/* System document templates */
const SYSTEM_TEMPLATES = [
  {
    id:"lpo",
    name:"Local Purchase Order (LPO)",
    category:"template",
    description:"Standard LPO template for procurement",
    html:`<div class="doc-page">
<div class="doc-header">
  <div class="logo-area"><img src="/src/assets/embu-county-logo.jpg" alt="Logo" style="height:60px" onerror="this.style.display='none'"/></div>
  <div class="header-text">
    <h2>EMBU LEVEL 5 HOSPITAL</h2>
    <h3>LOCAL PURCHASE ORDER</h3>
    <p>LPO No: <strong>{{LPO_NUMBER}}</strong></p>
  </div>
</div>
<table class="info-table">
  <tr><td><strong>Supplier:</strong></td><td>{{SUPPLIER_NAME}}</td><td><strong>Date:</strong></td><td>{{DATE}}</td></tr>
  <tr><td><strong>Address:</strong></td><td>{{SUPPLIER_ADDRESS}}</td><td><strong>Delivery Date:</strong></td><td>{{DELIVERY_DATE}}</td></tr>
  <tr><td><strong>Contact:</strong></td><td>{{SUPPLIER_CONTACT}}</td><td><strong>Department:</strong></td><td>{{DEPARTMENT}}</td></tr>
</table>
<table class="items-table">
  <thead><tr><th>#</th><th>Description</th><th>Unit</th><th>Qty</th><th>Unit Price (KES)</th><th>Total (KES)</th></tr></thead>
  <tbody>{{ITEMS_ROWS}}</tbody>
  <tfoot>
    <tr class="subtotal"><td colspan="5"><strong>Subtotal</strong></td><td>{{SUBTOTAL}}</td></tr>
    <tr class="tax"><td colspan="5">VAT (16%)</td><td>{{VAT}}</td></tr>
    <tr class="total"><td colspan="5"><strong>TOTAL</strong></td><td><strong>{{TOTAL}}</strong></td></tr>
  </tfoot>
</table>
<div class="terms"><h4>Terms & Conditions</h4><p>{{TERMS}}</p></div>
<div class="signatures">
  <div class="sig-box"><div class="sig-line">{{SIG_AUTHORIZED}}</div><p>Authorized Signatory</p><p>{{SIG_DATE_1}}</p></div>
  <div class="sig-box"><div class="sig-line">{{SIG_SUPPLIER}}</div><p>Supplier Representative</p><p>{{SIG_DATE_2}}</p></div>
  <div class="sig-box"><div class="sig-line">{{SIG_APPROVED}}</div><p>Approved By</p><p>{{SIG_DATE_3}}</p></div>
</div>
<div class="doc-stamp">OFFICIAL DOCUMENT — EMBU LEVEL 5 HOSPITAL</div>
</div>`,
  },
  {
    id:"grn",
    name:"Goods Received Note (GRN)",
    category:"template",
    description:"GRN template for goods receipt",
    html:`<div class="doc-page">
<div class="doc-header">
  <div class="logo-area"><img src="/src/assets/embu-county-logo.jpg" alt="Logo" style="height:60px" onerror="this.style.display='none'"/></div>
  <div class="header-text"><h2>EMBU LEVEL 5 HOSPITAL</h2><h3>GOODS RECEIVED NOTE</h3><p>GRN No: <strong>{{GRN_NUMBER}}</strong></p></div>
</div>
<table class="info-table">
  <tr><td><strong>Supplier:</strong></td><td>{{SUPPLIER_NAME}}</td><td><strong>Date Received:</strong></td><td>{{DATE}}</td></tr>
  <tr><td><strong>LPO/PO Ref:</strong></td><td>{{PO_NUMBER}}</td><td><strong>Received By:</strong></td><td>{{RECEIVED_BY}}</td></tr>
  <tr><td><strong>Store Location:</strong></td><td>{{STORE}}</td><td><strong>Department:</strong></td><td>{{DEPARTMENT}}</td></tr>
</table>
<table class="items-table">
  <thead><tr><th>#</th><th>Item Description</th><th>Unit</th><th>Qty Ordered</th><th>Qty Received</th><th>Condition</th><th>Remarks</th></tr></thead>
  <tbody>{{ITEMS_ROWS}}</tbody>
</table>
<div class="signatures">
  <div class="sig-box"><div class="sig-line">{{SIG_AUTHORIZED}}</div><p>Receiving Officer</p><p>{{SIG_DATE_1}}</p></div>
  <div class="sig-box"><div class="sig-line">{{SIG_SUPPLIER}}</div><p>Supplier / Delivery Person</p><p>{{SIG_DATE_2}}</p></div>
  <div class="sig-box"><div class="sig-line">{{SIG_APPROVED}}</div><p>Store Manager</p><p>{{SIG_DATE_3}}</p></div>
</div>
</div>`,
  },
  {
    id:"pv",
    name:"Payment Voucher",
    category:"template",
    description:"Payment voucher template",
    html:`<div class="doc-page">
<div class="doc-header">
  <div class="logo-area"><img src="/src/assets/embu-county-logo.jpg" alt="Logo" style="height:60px" onerror="this.style.display='none'"/></div>
  <div class="header-text"><h2>EMBU LEVEL 5 HOSPITAL</h2><h3>PAYMENT VOUCHER</h3><p>Voucher No: <strong>{{VOUCHER_NUMBER}}</strong></p></div>
</div>
<table class="info-table">
  <tr><td><strong>Pay To:</strong></td><td colspan="3">{{PAYEE_NAME}}</td></tr>
  <tr><td><strong>Bank / Account:</strong></td><td>{{BANK_ACCOUNT}}</td><td><strong>Date:</strong></td><td>{{DATE}}</td></tr>
  <tr><td><strong>Amount (KES):</strong></td><td><strong>{{AMOUNT}}</strong></td><td><strong>Vote Head:</strong></td><td>{{VOTE_HEAD}}</td></tr>
</table>
<div class="description-box"><h4>Purpose of Payment</h4><p>{{DESCRIPTION}}</p></div>
<table class="items-table">
  <thead><tr><th>Description</th><th>Vote Head</th><th>Amount (KES)</th></tr></thead>
  <tbody>{{ITEMS_ROWS}}</tbody>
  <tfoot><tr><td colspan="2"><strong>TOTAL</strong></td><td><strong>{{TOTAL}}</strong></td></tr></tfoot>
</table>
<div class="amount-words"><strong>Amount in Words:</strong> {{AMOUNT_WORDS}}</div>
<div class="signatures">
  <div class="sig-box"><div class="sig-line">{{SIG_AUTHORIZED}}</div><p>Prepared By</p><p>{{SIG_DATE_1}}</p></div>
  <div class="sig-box"><div class="sig-line">{{SIG_SUPPLIER}}</div><p>Finance Officer</p><p>{{SIG_DATE_2}}</p></div>
  <div class="sig-box"><div class="sig-line">{{SIG_APPROVED}}</div><p>Approved By</p><p>{{SIG_DATE_3}}</p></div>
</div>
</div>`,
  },
];

const DOC_PRINT_CSS = `
  body{font-family:'Times New Roman',serif;margin:0;padding:20px;background:#fff;color:#000}
  .doc-page{max-width:800px;margin:0 auto;padding:20px;border:1px solid #ccc}
  .doc-header{display:flex;align-items:center;gap:20px;border-bottom:3px double #1a3a6b;padding-bottom:12px;margin-bottom:16px}
  .header-text h2{margin:0;font-size:16px;color:#1a3a6b;text-transform:uppercase}
  .header-text h3{margin:4px 0;font-size:13px;color:#C45911}
  .header-text p{margin:2px 0;font-size:11px}
  .info-table{width:100%;border-collapse:collapse;margin-bottom:14px;font-size:11px}
  .info-table td{padding:4px 8px;border:1px solid #d1d5db}
  .items-table{width:100%;border-collapse:collapse;margin-bottom:14px;font-size:11px}
  .items-table th{background:#1a3a6b;color:#fff;padding:6px 8px;text-align:left;font-size:10px}
  .items-table td{padding:5px 8px;border:1px solid #e5e7eb}
  .items-table tr:nth-child(even) td{background:#f9fafb}
  .subtotal td,.tax td,.total td{padding:5px 8px;border-top:1px solid #1a3a6b}
  .total{font-weight:bold;background:#f0f4ff}
  .signatures{display:flex;gap:20px;margin-top:30px;justify-content:space-between}
  .sig-box{flex:1;text-align:center;font-size:10px}
  .sig-line{border-top:1px solid #000;margin:0 10px 4px;min-height:50px;display:flex;align-items:flex-end;justify-content:center}
  .sig-line img{max-height:48px;max-width:120px}
  .doc-stamp{text-align:center;margin-top:20px;padding:8px;border:2px solid #1a3a6b;color:#1a3a6b;font-size:10px;font-weight:bold;letter-spacing:0.1em}
  .terms{background:#f9fafb;padding:10px;border:1px solid #e5e7eb;margin-bottom:14px;font-size:10px}
  .description-box{background:#f9fafb;padding:10px;border:1px solid #e5e7eb;margin-bottom:14px;font-size:11px}
  .amount-words{font-size:11px;font-style:italic;margin-bottom:14px;padding:8px;border:1px dashed #d1d5db}
  @media print{.doc-page{border:none;padding:0} @page{margin:1.5cm} button{display:none!important}}
`;

function TemplateEditor({ doc, onSave, onClose }: { doc:any; onSave:(d:any)=>void; onClose:()=>void }) {
  const { user, profile, roles } = useAuth();
  const isAdmin = roles.includes("admin")||roles.includes("procurement_manager");
  const [name,         setName]         = useState(doc.name||"");
  const [description,  setDescription]  = useState(doc.description||"");
  const [category,     setCategory]     = useState(doc.category||"template");
  const [htmlContent,  setHtmlContent]  = useState(doc.html||doc.content||"");
  const [sigSlots,     setSigSlots]     = useState<{label:string;sig:string|null}[]>([
    {label:"Authorized Signatory",sig:null},
    {label:"Finance Officer",sig:null},
    {label:"Approved By",sig:null},
  ]);
  const [tab,         setTab]           = useState<"edit"|"preview"|"signatures">("edit");
  const [saving,      setSaving]        = useState(false);
  const sigRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  const uploadSig = async(idx: number, file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const url = e.target?.result as string;
      setSigSlots(p=>p.map((s,i)=>i===idx?{...s,sig:url}:s));
      toast({title:`Signature ${idx+1} uploaded ✓`});
    };
    reader.readAsDataURL(file);
  };

  const buildPreview = () => {
    let h = htmlContent;
    sigSlots.forEach((s,i) => {
      if(s.sig) h = h.replace(`{{SIG_DATE_${i+1}}}`, `<img src="${s.sig}" style="max-height:48px;max-width:120px"/><br/>`);
    });
    return h;
  };

  const printDocument = () => {
    const w = window.open("","_blank");
    if(!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>${name}</title><style>${DOC_PRINT_CSS}</style></head><body>${buildPreview()}</body></html>`);
    w.document.close(); w.focus(); setTimeout(()=>{w.print();},400);
  };

  const save = async() => {
    setSaving(true);
    const payload = { name, description, category, content:htmlContent, html:htmlContent, is_template:true, updated_by:user?.id, updated_at:new Date().toISOString(), signature_data:JSON.stringify(sigSlots) };
    let error: any;
    if(doc.id) {
      ({error} = await (supabase as any).from("documents").update(payload).eq("id",doc.id));
    } else {
      ({error} = await (supabase as any).from("documents").insert({...payload,created_by:user?.id,created_by_name:profile?.full_name,status:"active"}));
    }
    if(error){ toast({title:"Save failed",description:error.message,variant:"destructive"}); }
    else { toast({title:"Template saved ✓"}); onSave(payload); }
    setSaving(false);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:1000,display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:20,overflowY:"auto"}}>
      <div style={{background:"#fff",borderRadius:12,width:"95vw",maxWidth:1100,maxHeight:"92vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
        {/* Header */}
        <div style={{padding:"12px 16px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",borderRadius:"12px 12px 0 0",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
          <FileText style={{width:15,height:15,color:"#fff"}}/>
          <input value={name} onChange={e=>setName(e.target.value)} style={{flex:1,background:"transparent",border:"none",outline:"none",fontSize:14,fontWeight:700,color:"#fff"}} placeholder="Document name…"/>
          <div style={{display:"flex",gap:6}}>
            <button onClick={printDocument} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 12px",background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.25)",borderRadius:6,cursor:"pointer",color:"#fff",fontSize:11,fontWeight:600}}>
              <Printer style={{width:12,height:12}}/> Print
            </button>
            <button onClick={save} disabled={saving} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 12px",background:"#22c55e",border:"none",borderRadius:6,cursor:"pointer",color:"#fff",fontSize:11,fontWeight:700}}>
              {saving?<RefreshCw style={{width:11,height:11}} className="animate-spin"/>:<Save style={{width:11,height:11}}/>} Save
            </button>
            <button onClick={onClose} style={{padding:"5px 8px",background:"rgba(255,255,255,0.12)",border:"none",borderRadius:6,cursor:"pointer",color:"#fff"}}><X style={{width:13,height:13}}/></button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",borderBottom:"1px solid #e5e7eb",background:"#f9fafb",flexShrink:0}}>
          {([["edit","✏ Edit HTML"],["preview","👁 Preview"],["signatures","✍ Signatures"]] as const).map(([t,l])=>(
            <button key={t} onClick={()=>setTab(t)} style={{padding:"9px 16px",border:"none",background:"transparent",cursor:"pointer",fontSize:11,fontWeight:700,color:tab===t?"#1a3a6b":"#6b7280",borderBottom:tab===t?"2px solid #1a3a6b":"2px solid transparent"}}>
              {l}
            </button>
          ))}
          <div style={{marginLeft:"auto",padding:"7px 14px",display:"flex",gap:8,alignItems:"center"}}>
            <select value={category} onChange={e=>setCategory(e.target.value)} style={{fontSize:11,border:"1px solid #e5e7eb",borderRadius:5,padding:"3px 6px",outline:"none"}}>
              {CATS.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Content */}
        <div style={{flex:1,overflow:"auto",display:"flex"}}>
          {tab==="edit" && (
            <div style={{flex:1,display:"flex",flexDirection:"column"}}>
              <div style={{padding:"8px 12px",background:"#fffbeb",borderBottom:"1px solid #fef3c7",fontSize:10,color:"#92400e"}}>
                💡 Use placeholders like <code>{"{{SUPPLIER_NAME}}"}</code>, <code>{"{{DATE}}"}</code>, <code>{"{{TOTAL}}"}</code>, <code>{"{{SIG_AUTHORIZED}}"}</code> etc. They will be replaced at print time.
              </div>
              <div style={{padding:"8px 12px",borderBottom:"1px solid #e5e7eb",display:"flex",gap:6,flexWrap:"wrap" as const}}>
                {["{{LPO_NUMBER}}","{{DATE}}","{{SUPPLIER_NAME}}","{{TOTAL}}","{{ITEMS_ROWS}}","{{SIG_AUTHORIZED}}","{{SIG_DATE_1}}"].map(ph=>(
                  <button key={ph} onClick={()=>setHtmlContent(p=>p+ph)} style={{fontSize:9,padding:"2px 7px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:4,cursor:"pointer",fontFamily:"monospace",color:"#374151"}}>{ph}</button>
                ))}
              </div>
              <textarea value={htmlContent} onChange={e=>setHtmlContent(e.target.value)} style={{flex:1,padding:"12px",fontSize:11,fontFamily:"'Cascadia Code','Fira Code',monospace",border:"none",outline:"none",resize:"none",lineHeight:1.7,color:"#1a2332"}} spellCheck={false}/>
            </div>
          )}
          {tab==="preview" && (
            <div style={{flex:1,overflow:"auto",padding:"20px",background:"#f9fafb"}}>
              <style>{DOC_PRINT_CSS}</style>
              <div style={{background:"#fff",padding:"20px",boxShadow:"0 2px 12px rgba(0,0,0,0.08)",borderRadius:6,maxWidth:800,margin:"0 auto"}} dangerouslySetInnerHTML={{__html:buildPreview()}}/>
            </div>
          )}
          {tab==="signatures" && (
            <div style={{flex:1,padding:"20px",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16,alignContent:"start"}}>
              {sigSlots.map((slot,i)=>(
                <div key={i} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,padding:"16px",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
                    <Pen style={{width:13,height:13,color:"#6b7280"}}/>
                    <input value={slot.label} onChange={e=>setSigSlots(p=>p.map((s,j)=>j===i?{...s,label:e.target.value}:s))}
                      style={{flex:1,fontSize:12,fontWeight:600,border:"none",outline:"none",color:"#111827"}}/>
                  </div>
                  {slot.sig
                    ? <div style={{textAlign:"center",position:"relative"}}>
                        <img src={slot.sig} alt="Signature" style={{maxHeight:60,maxWidth:"100%",border:"1px dashed #e5e7eb",borderRadius:4,padding:4}}/>
                        <button onClick={()=>setSigSlots(p=>p.map((s,j)=>j===i?{...s,sig:null}:s))} style={{position:"absolute",top:-6,right:-6,width:18,height:18,borderRadius:"50%",background:"#ef4444",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><X style={{width:10,height:10,color:"#fff"}}/></button>
                      </div>
                    : <div>
                        <button onClick={()=>sigRefs[i].current?.click()} style={{width:"100%",padding:"12px",border:"2px dashed #e5e7eb",borderRadius:8,background:"#f9fafb",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:6,color:"#9ca3af",fontSize:11}}>
                          <Upload style={{width:18,height:18}}/>
                          Upload Signature / Stamp
                        </button>
                        <input ref={sigRefs[i]} type="file" accept="image/*" style={{display:"none"}} onChange={e=>e.target.files?.[0]&&uploadSig(i,e.target.files[0])}/>
                        <div style={{marginTop:6,textAlign:"center",fontSize:9,color:"#9ca3af"}}>PNG or JPG with transparent background recommended</div>
                      </div>
                  }
                </div>
              ))}
              <button onClick={()=>setSigSlots(p=>[...p,{label:"New Signatory",sig:null}])} style={{border:"2px dashed #e5e7eb",borderRadius:10,padding:"20px",cursor:"pointer",background:"transparent",color:"#9ca3af",fontSize:12,display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
                <Plus style={{width:20,height:20}}/> Add Signatory
              </button>
            </div>
          )}
        </div>

        {/* Description bar */}
        <div style={{padding:"8px 16px",borderTop:"1px solid #e5e7eb",background:"#f9fafb",flexShrink:0}}>
          <input value={description} onChange={e=>setDescription(e.target.value)} placeholder="Document description…" style={{width:"100%",fontSize:11,border:"none",outline:"none",background:"transparent",color:"#6b7280"}}/>
        </div>
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  const { user, profile, roles } = useAuth();
  const isAdmin = roles.includes("admin")||roles.includes("procurement_manager");
  const [docs,         setDocs]         = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [catFilter,    setCatFilter]    = useState("all");
  const [editDoc,      setEditDoc]      = useState<any|null>(null);
  const [viewDoc,      setViewDoc]      = useState<any|null>(null);
  const [showUpload,   setShowUpload]   = useState(false);
  const [uploading,    setUploading]    = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({name:"",description:"",category:"general",is_template:false});
  const [file, setFile] = useState<File|null>(null);
  const [activeTab, setActiveTab] = useState<"all"|"templates"|"system">("all");

  const loadDocs = useCallback(async() => {
    setLoading(true);
    const { data } = await (supabase as any).from("documents").select("*").order("created_at",{ascending:false});
    setDocs(data||[]);
    setLoading(false);
  },[]);

  useEffect(()=>{ loadDocs(); },[loadDocs]);

  // Real-time
  useEffect(()=>{
    const ch=(supabase as any).channel("docs-rt").on("postgres_changes",{event:"*",schema:"public",table:"documents"},()=>loadDocs()).subscribe();
    return()=>(supabase as any).removeChannel(ch);
  },[]);

  const uploadDoc = async() => {
    if(!form.name.trim()){ toast({title:"Enter document name",variant:"destructive"}); return; }
    setUploading(true);
    let fileUrl="", fileName="", fileSize=0, mimeType="";
    if(file){
      fileUrl = await new Promise<string>((res,rej)=>{ const r=new FileReader(); r.onload=ev=>res(ev.target?.result as string); r.onerror=rej; r.readAsDataURL(file); });
      fileName=file.name; fileSize=file.size; mimeType=file.type;
    }
    const{error}=await(supabase as any).from("documents").insert({
      name:form.name, description:form.description, category:form.category,
      is_template:form.is_template, is_locked:false, file_url:fileUrl,
      file_name:fileName, file_size:fileSize, mime_type:mimeType,
      created_by:user?.id, created_by_name:profile?.full_name, status:"active",
    });
    if(error){ toast({title:"Upload failed",description:error.message,variant:"destructive"}); }
    else{ toast({title:"Document uploaded ✓"}); setShowUpload(false); setFile(null); setForm({name:"",description:"",category:"general",is_template:false}); loadDocs(); }
    setUploading(false);
  };

  const deleteDoc = async(id:string) => {
    if(!confirm("Delete this document?")) return;
    await(supabase as any).from("documents").delete().eq("id",id);
    toast({title:"Deleted"}); loadDocs();
  };

  const printTemplate = (doc:any) => {
    const html = doc.html||doc.content||`<div class="doc-page"><h2>${doc.name}</h2><p>${doc.description||""}</p></div>`;
    const w = window.open("","_blank");
    if(!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>${doc.name}</title><style>${DOC_PRINT_CSS}</style></head><body>${html}</body></html>`);
    w.document.close(); w.focus(); setTimeout(()=>w.print(),400);
  };

  const allDocs = [
    ...SYSTEM_TEMPLATES.map(t=>({...t,_system:true})),
    ...docs,
  ];

  const filtered = allDocs.filter(d=>{
    const matchSearch = !search || [d.name,d.description,d.category].some(v=>String(v||"").toLowerCase().includes(search.toLowerCase()));
    const matchCat = catFilter==="all"||d.category===catFilter;
    const matchTab = activeTab==="all" || (activeTab==="templates"&&d.is_template) || (activeTab==="system"&&d._system);
    return matchSearch && matchCat && matchTab;
  });

  return (
    <div style={{background:"#f4f6f9",minHeight:"calc(100vh - 57px)",fontFamily:"'Inter','Segoe UI',sans-serif"}}>
      {/* Page header */}
      <div style={{background:"linear-gradient(135deg,#0a2558,#1a3a6b)",padding:"14px 20px",display:"flex",alignItems:"center",gap:12}}>
        <FileCheck style={{width:18,height:18,color:"#fff"}}/>
        <div>
          <div style={{fontSize:15,fontWeight:800,color:"#fff"}}>Documents & Templates</div>
          <div style={{fontSize:10,color:"rgba(255,255,255,0.5)"}}>Manage, edit and print official documents with e-signatures</div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:8}}>
          {isAdmin && (
            <button onClick={()=>setEditDoc({name:"New Template",html:"",category:"template",is_template:true})} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.25)",borderRadius:7,cursor:"pointer",color:"#fff",fontSize:11,fontWeight:700}}>
              <Plus style={{width:12,height:12}}/> New Template
            </button>
          )}
          <button onClick={()=>setShowUpload(true)} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",background:"#fff",border:"none",borderRadius:7,cursor:"pointer",color:"#1a3a6b",fontSize:11,fontWeight:700}}>
            <Upload style={{width:12,height:12}}/> Upload File
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{background:"#fff",borderBottom:"1px solid #e5e7eb",padding:"10px 14px",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" as const}}>
        <div style={{display:"flex"}}>
          {([["all","All"],["templates","Templates"],["system","System"]] as const).map(([t,l])=>(
            <button key={t} onClick={()=>setActiveTab(t)} style={{padding:"5px 14px",border:"none",background:"transparent",cursor:"pointer",fontSize:11,fontWeight:700,color:activeTab===t?"#1a3a6b":"#6b7280",borderBottom:activeTab===t?"2px solid #1a3a6b":"2px solid transparent"}}>
              {l}
            </button>
          ))}
        </div>
        <div style={{position:"relative",marginLeft:8}}>
          <Search style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",width:11,height:11,color:"#9ca3af"}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search documents…" style={{paddingLeft:26,paddingRight:10,paddingTop:6,paddingBottom:6,fontSize:11,border:"1px solid #e5e7eb",borderRadius:6,outline:"none",width:200}}/>
        </div>
        <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} style={{fontSize:11,border:"1px solid #e5e7eb",borderRadius:6,padding:"6px 10px",outline:"none"}}>
          <option value="all">All Categories</option>
          {CATS.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <span style={{marginLeft:"auto",fontSize:11,color:"#9ca3af"}}>{filtered.length} documents</span>
        <button onClick={loadDocs} style={{background:"transparent",border:"none",cursor:"pointer",color:"#9ca3af"}}><RefreshCw style={{width:12,height:12}} className={loading?"animate-spin":""}/></button>
      </div>

      {/* Grid */}
      <div style={{padding:"16px",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
        {loading ? [1,2,3,4,5,6].map(i=>(
          <div key={i} style={{background:"#fff",borderRadius:10,height:140,border:"1px solid #e5e7eb"}} className="animate-pulse"/>
        )) : filtered.map((doc,i)=>{
          const cc = CAT_COLORS[doc.category]||CAT_COLORS.other;
          return (
            <div key={doc.id||doc.name||i} style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",boxShadow:"0 1px 4px rgba(0,0,0,0.05)",display:"flex",flexDirection:"column",overflow:"hidden",transition:"all 0.15s"}}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.boxShadow="0 4px 16px rgba(26,58,107,0.12)";(e.currentTarget as HTMLElement).style.transform="translateY(-1px)";}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.boxShadow="0 1px 4px rgba(0,0,0,0.05)";(e.currentTarget as HTMLElement).style.transform="";}}>
              {/* Card header */}
              <div style={{padding:"12px 14px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"flex-start",gap:10}}>
                <div style={{width:38,height:38,borderRadius:8,background:cc.bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <FileText style={{width:18,height:18,color:cc.color}}/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#111827",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{doc.name}</div>
                  <div style={{display:"flex",alignItems:"center",gap:5,marginTop:3}}>
                    <span style={{fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:4,background:cc.bg,color:cc.color,textTransform:"capitalize" as const}}>{doc.category}</span>
                    {doc.is_template&&<span style={{fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:4,background:"#fef3c7",color:"#92400e"}}>TEMPLATE</span>}
                    {doc._system&&<span style={{fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:4,background:"#dbeafe",color:"#1d4ed8"}}>SYSTEM</span>}
                  </div>
                </div>
              </div>
              {/* Description */}
              {doc.description && (
                <div style={{padding:"8px 14px",fontSize:10,color:"#6b7280",borderBottom:"1px solid #f9fafb",lineHeight:1.5}}>{doc.description.slice(0,80)}{doc.description.length>80?"…":""}</div>
              )}
              {/* Actions */}
              <div style={{padding:"8px 10px",display:"flex",gap:5,marginTop:"auto"}}>
                <button onClick={()=>printTemplate(doc)} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 10px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:6,cursor:"pointer",fontSize:10,fontWeight:600,color:"#374151"}}>
                  <Printer style={{width:10,height:10}}/> Print
                </button>
                {(doc.is_template||doc._system) && isAdmin && (
                  <button onClick={()=>setEditDoc(doc)} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 10px",background:"#dbeafe",border:"1px solid #bfdbfe",borderRadius:6,cursor:"pointer",fontSize:10,fontWeight:600,color:"#1d4ed8"}}>
                    <Edit3 style={{width:10,height:10}}/> Edit
                  </button>
                )}
                {doc.file_url && (
                  <button onClick={()=>setViewDoc(doc)} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 10px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:6,cursor:"pointer",fontSize:10,fontWeight:600,color:"#374151"}}>
                    <Eye style={{width:10,height:10}}/> View
                  </button>
                )}
                {!doc._system && isAdmin && (
                  <button onClick={()=>deleteDoc(doc.id)} style={{marginLeft:"auto",padding:"5px 7px",background:"#fee2e2",border:"1px solid #fecaca",borderRadius:6,cursor:"pointer",color:"#dc2626"}}>
                    <Trash2 style={{width:10,height:10}}/>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload modal */}
      {showUpload && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:"#fff",borderRadius:12,width:480,boxShadow:"0 20px 60px rgba(0,0,0,0.25)"}}>
            <div style={{padding:"12px 16px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",borderRadius:"12px 12px 0 0",display:"flex",alignItems:"center",gap:8}}>
              <Upload style={{width:14,height:14,color:"#fff"}}/>
              <span style={{fontSize:13,fontWeight:700,color:"#fff",flex:1}}>Upload Document</span>
              <button onClick={()=>setShowUpload(false)} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:6,padding:"4px 6px",cursor:"pointer",color:"#fff"}}><X style={{width:13,height:13}}/></button>
            </div>
            <div style={{padding:"16px",display:"flex",flexDirection:"column",gap:12}}>
              <input onClick={()=>fileRef.current?.click()} readOnly value={file?.name||""} placeholder="Click to select file…" style={{width:"100%",padding:"8px 10px",border:"2px dashed #e5e7eb",borderRadius:8,outline:"none",fontSize:12,cursor:"pointer",background:"#f9fafb"}}/>
              <input ref={fileRef} type="file" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f){setFile(f);if(!form.name)setForm(p=>({...p,name:f.name.replace(/\.[^.]+$/,"")}));}}}/>
              {[{label:"Document Name",key:"name"},{label:"Description",key:"description"}].map(f=>(
                <div key={f.key}>
                  <label style={{fontSize:10,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.04em"}}>{f.label}</label>
                  <input value={(form as any)[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} style={{width:"100%",padding:"7px 10px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:6,outline:"none"}}/>
                </div>
              ))}
              <div>
                <label style={{fontSize:10,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.04em"}}>Category</label>
                <select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))} style={{width:"100%",padding:"7px 10px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:6,outline:"none"}}>
                  {CATS.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,cursor:"pointer"}}>
                <input type="checkbox" checked={form.is_template} onChange={e=>setForm(p=>({...p,is_template:e.target.checked}))} style={{accentColor:"#1a3a6b",width:14,height:14}}/>
                Mark as template (reusable)
              </label>
            </div>
            <div style={{padding:"10px 16px",borderTop:"1px solid #f3f4f6",display:"flex",gap:8}}>
              <button onClick={uploadDoc} disabled={uploading} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"9px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700}}>
                {uploading?<RefreshCw style={{width:13,height:13}} className="animate-spin"/>:<Upload style={{width:13,height:13}}/>} Upload
              </button>
              <button onClick={()=>setShowUpload(false)} style={{padding:"9px 16px",background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:8,cursor:"pointer",fontSize:12}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Template editor */}
      {editDoc && <TemplateEditor doc={editDoc} onSave={()=>loadDocs()} onClose={()=>setEditDoc(null)}/>}

      {/* View doc */}
      {viewDoc && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:"#fff",borderRadius:12,width:"90vw",maxHeight:"88vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>
            <div style={{padding:"10px 14px",borderBottom:"1px solid #e5e7eb",display:"flex",alignItems:"center",gap:8}}>
              <span style={{flex:1,fontWeight:700,fontSize:13}}>{viewDoc.name}</span>
              <button onClick={()=>printTemplate(viewDoc)} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 12px",background:"#1a3a6b",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:700}}>
                <Printer style={{width:11,height:11}}/> Print
              </button>
              <button onClick={()=>setViewDoc(null)} style={{padding:"5px 8px",background:"#f3f4f6",border:"none",borderRadius:6,cursor:"pointer"}}><X style={{width:12,height:12}}/></button>
            </div>
            <div style={{flex:1,overflow:"auto",padding:"20px",background:"#f9fafb"}}>
              {viewDoc.mime_type?.startsWith("image/")||viewDoc.file_url?.startsWith("data:image/")
                ? <img src={viewDoc.file_url} alt={viewDoc.name} style={{maxWidth:"100%",borderRadius:8}}/>
                : viewDoc.html||viewDoc.content
                  ? <><style>{DOC_PRINT_CSS}</style><div dangerouslySetInnerHTML={{__html:viewDoc.html||viewDoc.content}}/></>
                  : <div style={{textAlign:"center",padding:"40px",color:"#9ca3af"}}><FileText style={{width:40,height:40,margin:"0 auto 12px"}}/><div>Preview not available for this file type.</div></div>
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
