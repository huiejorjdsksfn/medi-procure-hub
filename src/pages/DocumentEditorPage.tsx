/**
 * ProcurBosse  -- Document Editor
 * Rich text editor for creating official hospital documents
 * Supports templates, letterhead, print, and save to library
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { logAudit } from "@/lib/audit";
import {
  Save, Printer, Download, X, Bold, Italic, Underline, AlignLeft,
  AlignCenter, AlignRight, AlignJustify, List, ListOrdered, Type,
  Image, Table, Link, Undo, Redo, FileText, ChevronDown,
  Eye, Edit3, Plus, Trash2, Copy
} from "lucide-react";
import logoImg from "@/assets/logo.png";

// --- Types --------------------------------------------------------------------
interface DocMeta {
  id?: string;
  name: string;
  category: string;
  description: string;
  is_template: boolean;
  tags: string[];
}

const TEMPLATES: { name: string; category: string; body: string }[] = [
  {
    name: "Internal Memo",
    category: "Memo",
    body: `<div style="font-family:Times New Roman;font-size:12pt;line-height:1.6;padding:20px">
<div style="text-align:center;border-bottom:2px solid #1a3a6b;padding-bottom:12px;margin-bottom:20px">
<strong style="font-size:14pt;color:#1a3a6b">INTERNAL MEMORANDUM</strong><br/>
<span style="font-size:11pt">Embu Level 5 Hospital</span>
</div>
<table style="width:100%;margin-bottom:20px;border-collapse:collapse">
<tr><td style="width:120px;font-weight:bold;padding:4px 0">TO:</td><td style="border-bottom:1px solid #ccc;padding:4px 8px">&nbsp;</td></tr>
<tr><td style="font-weight:bold;padding:4px 0">FROM:</td><td style="border-bottom:1px solid #ccc;padding:4px 8px">&nbsp;</td></tr>
<tr><td style="font-weight:bold;padding:4px 0">DATE:</td><td style="border-bottom:1px solid #ccc;padding:4px 8px">${new Date().toLocaleDateString("en-KE",{day:"2-digit",month:"long",year:"numeric"})}</td></tr>
<tr><td style="font-weight:bold;padding:4px 0">SUBJECT:</td><td style="border-bottom:1px solid #ccc;padding:4px 8px">&nbsp;</td></tr>
<tr><td style="font-weight:bold;padding:4px 0">REF:</td><td style="border-bottom:1px solid #ccc;padding:4px 8px">&nbsp;</td></tr>
</table>
<p style="margin-bottom:12px">&nbsp;</p>
<p style="margin-bottom:12px">&nbsp;</p>
<p style="margin-bottom:12px">&nbsp;</p>
<div style="margin-top:40px">
<div style="width:200px;border-top:1px solid #333;padding-top:4px"><strong>Signature:</strong></div>
<div style="margin-top:16px"><strong>Name:</strong> ________________________</div>
<div style="margin-top:8px"><strong>Designation:</strong> ________________________</div>
<div style="margin-top:8px"><strong>Date:</strong> ________________________</div>
</div>
</div>`
  },
  {
    name: "Official Letter",
    category: "Letter",
    body: `<div style="font-family:Times New Roman;font-size:12pt;line-height:1.8;padding:20px">
<div style="text-align:right;margin-bottom:20px">
<strong>Embu Level 5 Hospital</strong><br/>
Embu County Government<br/>
P.O. Box 591-60100, Embu<br/>
Tel: +254 060 000000<br/>
Email: info@embu.health.go.ke<br/>
</div>
<div style="margin-bottom:20px">
Ref: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<br/>
Date: ${new Date().toLocaleDateString("en-KE",{day:"2-digit",month:"long",year:"numeric"})}<br/>
</div>
<div style="margin-bottom:20px">
The [Title]<br/>
[Name]<br/>
[Organisation]<br/>
[Address]<br/>
</div>
<p style="font-weight:bold;margin-bottom:12px">Dear Sir/Madam,</p>
<p style="font-weight:bold;text-decoration:underline;text-align:center;margin-bottom:20px">RE: [SUBJECT IN CAPITALS]</p>
<p style="margin-bottom:12px">&nbsp;</p>
<p style="margin-bottom:12px">&nbsp;</p>
<p style="margin-bottom:12px">&nbsp;</p>
<p style="margin-bottom:20px">Yours faithfully,</p>
<div style="margin-top:40px">
<div style="border-top:1px solid #333;width:200px;padding-top:4px">Signature</div>
<div style="margin-top:12px"><strong>[NAME IN FULL]</strong></div>
<div>[DESIGNATION]</div>
<div>Embu Level 5 Hospital</div>
</div>
</div>`
  },
  {
    name: "Minutes of Meeting",
    category: "Minutes",
    body: `<div style="font-family:Times New Roman;font-size:12pt;line-height:1.6;padding:20px">
<div style="text-align:center;margin-bottom:20px">
<strong style="font-size:14pt">MINUTES OF [COMMITTEE/MEETING NAME]</strong><br/>
<strong>Held on: ${new Date().toLocaleDateString("en-KE",{weekday:"long",day:"2-digit",month:"long",year:"numeric"})}</strong><br/>
<strong>Venue: Boardroom, Embu Level 5 Hospital</strong><br/>
<strong>Time: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</strong>
</div>
<div style="margin-bottom:20px">
<strong>1. ATTENDANCE</strong>
<table style="width:100%;border-collapse:collapse;margin-top:8px">
<tr style="background:#1a3a6b;color:white"><th style="border:1px solid #ccc;padding:6px">Name</th><th style="border:1px solid #ccc;padding:6px">Designation</th><th style="border:1px solid #ccc;padding:6px">Status</th></tr>
<tr><td style="border:1px solid #ccc;padding:6px">&nbsp;</td><td style="border:1px solid #ccc;padding:6px">&nbsp;</td><td style="border:1px solid #ccc;padding:6px">Present</td></tr>
<tr><td style="border:1px solid #ccc;padding:6px">&nbsp;</td><td style="border:1px solid #ccc;padding:6px">&nbsp;</td><td style="border:1px solid #ccc;padding:6px">Present</td></tr>
</table>
</div>
<div style="margin-bottom:16px"><strong>2. APOLOGIES:</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
<div style="margin-bottom:16px"><strong>3. CONFIRMATION OF PREVIOUS MINUTES</strong><br/>&nbsp;</div>
<div style="margin-bottom:16px"><strong>4. MATTERS ARISING</strong><br/>&nbsp;</div>
<div style="margin-bottom:16px"><strong>5. AGENDA ITEMS</strong><br/>&nbsp;</div>
<div style="margin-bottom:16px"><strong>6. ANY OTHER BUSINESS</strong><br/>&nbsp;</div>
<div style="margin-bottom:16px"><strong>7. NEXT MEETING:</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
<div style="margin-top:40px;display:flex;gap:80px">
<div><div style="border-top:1px solid #333;width:200px;padding-top:4px">Chairperson</div><div>Date: _____________</div></div>
<div><div style="border-top:1px solid #333;width:200px;padding-top:4px">Secretary</div><div>Date: _____________</div></div>
</div>
</div>`
  },
  {
    name: "Procurement Report",
    category: "Report",
    body: `<div style="font-family:Times New Roman;font-size:12pt;line-height:1.6;padding:20px">
<div style="text-align:center;border-bottom:2px solid #1a3a6b;padding-bottom:16px;margin-bottom:20px">
<strong style="font-size:16pt;color:#1a3a6b">PROCUREMENT REPORT</strong><br/>
<span>Embu Level 5 Hospital | Department of Health</span><br/>
<span>Period: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; to &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
</div>
<div style="margin-bottom:20px"><strong>1. EXECUTIVE SUMMARY</strong><br/>&nbsp;</div>
<div style="margin-bottom:20px"><strong>2. PROCUREMENT ACTIVITIES</strong>
<table style="width:100%;border-collapse:collapse;margin-top:8px">
<tr style="background:#1a3a6b;color:white">
<th style="border:1px solid #ccc;padding:6px">Item</th>
<th style="border:1px solid #ccc;padding:6px">Supplier</th>
<th style="border:1px solid #ccc;padding:6px">LPO No.</th>
<th style="border:1px solid #ccc;padding:6px">Amount (KES)</th>
<th style="border:1px solid #ccc;padding:6px">Status</th>
</tr>
<tr><td style="border:1px solid #ccc;padding:6px">&nbsp;</td><td style="border:1px solid #ccc;padding:6px">&nbsp;</td><td style="border:1px solid #ccc;padding:6px">&nbsp;</td><td style="border:1px solid #ccc;padding:6px">&nbsp;</td><td style="border:1px solid #ccc;padding:6px">&nbsp;</td></tr>
</table>
</div>
<div style="margin-bottom:20px"><strong>3. BUDGET UTILISATION</strong><br/>&nbsp;</div>
<div style="margin-bottom:20px"><strong>4. RECOMMENDATIONS</strong><br/>&nbsp;</div>
<div style="margin-top:40px">
<div style="border-top:1px solid #333;width:250px;padding-top:4px">Procurement Manager</div>
<div>Date: _____________</div>
</div>
</div>`
  },
  {
    name: "Request for Quotation",
    category: "RFQ",
    body: `<div style="font-family:Times New Roman;font-size:12pt;line-height:1.6;padding:20px">
<div style="text-align:center;border-bottom:2px solid #C45911;padding-bottom:12px;margin-bottom:20px">
<strong style="font-size:14pt;color:#1a3a6b">REQUEST FOR QUOTATION (RFQ)</strong><br/>
<span>Embu Level 5 Hospital</span><br/>
<span>RFQ No: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | Date: ${new Date().toLocaleDateString("en-KE",{day:"2-digit",month:"long",year:"numeric"})}</span>
</div>
<div style="margin-bottom:16px"><strong>TO:</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
<div style="margin-bottom:16px">We invite you to submit your best quotation for the following items/services:</div>
<table style="width:100%;border-collapse:collapse;margin-bottom:16px">
<tr style="background:#1a3a6b;color:white">
<th style="border:1px solid #ccc;padding:6px">No.</th>
<th style="border:1px solid #ccc;padding:6px">Description</th>
<th style="border:1px solid #ccc;padding:6px">Unit</th>
<th style="border:1px solid #ccc;padding:6px">Qty</th>
<th style="border:1px solid #ccc;padding:6px">Unit Price</th>
<th style="border:1px solid #ccc;padding:6px">Total</th>
</tr>
<tr><td style="border:1px solid #ccc;padding:6px">1</td><td style="border:1px solid #ccc;padding:6px">&nbsp;</td><td style="border:1px solid #ccc;padding:6px">&nbsp;</td><td style="border:1px solid #ccc;padding:6px">&nbsp;</td><td style="border:1px solid #ccc;padding:6px">&nbsp;</td><td style="border:1px solid #ccc;padding:6px">&nbsp;</td></tr>
<tr><td style="border:1px solid #ccc;padding:6px">2</td><td style="border:1px solid #ccc;padding:6px">&nbsp;</td><td style="border:1px solid #ccc;padding:6px">&nbsp;</td><td style="border:1px solid #ccc;padding:6px">&nbsp;</td><td style="border:1px solid #ccc;padding:6px">&nbsp;</td><td style="border:1px solid #ccc;padding:6px">&nbsp;</td></tr>
</table>
<div style="margin-bottom:12px"><strong>Quotation deadline:</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
<div style="margin-bottom:12px"><strong>Delivery terms:</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
<div style="margin-bottom:12px"><strong>Payment terms:</strong> Net 30 days from delivery</div>
<div style="margin-top:30px">
<div style="border-top:1px solid #333;width:250px;padding-top:4px">Procurement Officer</div>
<div>Embu Level 5 Hospital</div>
</div>
</div>`
  },
  {
    name: "Blank Document",
    category: "General",
    body: `<div style="font-family:Times New Roman;font-size:12pt;line-height:1.8;padding:20px;min-height:600px"><p>&nbsp;</p></div>`
  },
];

const FONT_SIZES = ["8","9","10","11","12","14","16","18","20","22","24","28","32","36","48","72"];
const FONT_FAMILIES = ["Times New Roman","Arial","Calibri","Georgia","Verdana","Courier New","Cambria","Palatino"];

// --- Toolbar Button ------------------------------------------------------------
const TB = ({ icon: Icon, title, onClick, active }: any) => (
  <button title={title} onClick={onClick}
    style={{ padding:"4px 6px",border:"none",borderRadius:4,cursor:"pointer",background:active?"#e0e7ff":"transparent",color:active?"#4f46e5":"#374151",display:"flex",alignItems:"center",justifyContent:"center" }}
    onMouseEnter={e=>(e.currentTarget.style.background=active?"#e0e7ff":"#f3f4f6")}
    onMouseLeave={e=>(e.currentTarget.style.background=active?"#e0e7ff":"transparent")}>
    <Icon style={{width:14,height:14}} />
  </button>
);

// --- Main Component ------------------------------------------------------------
export default function DocumentEditorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const { getSetting } = useSystemSettings();
  const editorRef = useRef<HTMLDivElement>(null);

  const [meta, setMeta] = useState<DocMeta>({
    name: "Untitled Document",
    category: "General",
    description: "",
    is_template: false,
    tags: []
  });
  const [mode, setMode] = useState<"edit"|"preview">("edit");
  const [saving, setSaving] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showMeta, setShowMeta] = useState(false);
  const [fontSize, setFontSize] = useState("12");
  const [fontFamily, setFontFamily] = useState("Times New Roman");
  const [docId, setDocId] = useState<string|null>(null);

  const hospitalName = getSetting("hospital_name","Embu Level 5 Hospital");
  const countyName   = getSetting("county_name","Embu County Government");
  const sysName      = getSetting("system_name","EL5 MediProcure");

  const exec = useCallback((cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
  }, []);

  // Load document if ID in URL
  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      (supabase as any).from("documents").select("*").eq("id", id).single().then(({ data }: any) => {
        if (data) {
          setDocId(data.id);
          setMeta({ name:data.name, category:data.category||"General", description:data.description||"", is_template:data.is_template||false, tags:data.tags||[] });
          if (editorRef.current && data.template_html) {
            editorRef.current.innerHTML = data.template_html;
          }
        }
      });
    } else {
      // Load blank template by default
      if (editorRef.current) {
        editorRef.current.innerHTML = TEMPLATES[TEMPLATES.length-1].body;
      }
    }
  }, [searchParams]);

  const loadTemplate = (t: typeof TEMPLATES[0]) => {
    if (editorRef.current) {
      editorRef.current.innerHTML = t.body;
      setMeta(p => ({ ...p, name: t.name, category: t.category }));
    }
    setShowTemplates(false);
    toast({ title: `Template loaded: ${t.name}` });
  };

  const save = async () => {
    if (!editorRef.current) return;
    setSaving(true);
    const html = editorRef.current.innerHTML;
    const payload = {
      name: meta.name,
      category: meta.category,
      description: meta.description,
      is_template: meta.is_template,
      tags: meta.tags,
      template_html: html,
      file_type: "html",
      created_by: user?.id,
      updated_at: new Date().toISOString(),
    };
    let res: any;
    if (docId) {
      res = await (supabase as any).from("documents").update(payload).eq("id", docId).select().single();
    } else {
      res = await (supabase as any).from("documents").insert(payload).select().single();
    }
    if (res.error) {
      toast({ title: "Save failed: " + res.error.message, variant: "destructive" });
    } else {
      if (!docId) setDocId(res.data?.id);
      toast({ title: "[OK] Document saved to library" });
      logAudit(user?.id, profile?.full_name, docId?"update":"create", "documents", res.data?.id, { name: meta.name });
    }
    setSaving(false);
  };

  const print = () => {
    const html = editorRef.current?.innerHTML || "";
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head>
<title>${meta.name}  -- ${hospitalName}</title>
<style>
  @page { size: A4; margin: 20mm 25mm; }
  body { font-family: 'Times New Roman',serif; font-size:12pt; color:#000; margin:0; padding:0; }
  @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  .letterhead { display:flex; align-items:center; gap:16px; border-bottom:3px solid #1a3a6b; padding-bottom:10px; margin-bottom:20px; }
  .letterhead img { width:60px; height:60px; object-fit:contain; }
  .letterhead-text { flex:1; }
  .letterhead-title { font-size:18pt; font-weight:900; color:#1a3a6b; }
  .letterhead-sub { font-size:10pt; color:#374151; }
  .footer { margin-top:30px; border-top:1px solid #ccc; padding-top:6px; font-size:8pt; color:#6b7280; display:flex; justify-content:space-between; }
</style>
</head><body>
<div class="letterhead">
  <img src="${window.location.origin}/logo.png" onerror="this.style.display='none'" />
  <div class="letterhead-text">
    <div class="letterhead-title">${hospitalName}</div>
    <div class="letterhead-sub">${countyName} | ${sysName}</div>
  </div>
  <div style="text-align:right;font-size:9pt;color:#6b7280;">
    Doc: ${meta.name}<br/>
    Date: ${new Date().toLocaleDateString("en-KE",{day:"2-digit",month:"long",year:"numeric"})}<br/>
    Category: ${meta.category}
  </div>
</div>
${html}
<div class="footer">
  <span>${hospitalName}  -- Official Document</span>
  <span>Printed: ${new Date().toLocaleString("en-KE")} | ${sysName}</span>
</div>
</body></html>`);
    w.document.close();
    setTimeout(() => { w.print(); w.close(); }, 500);
  };

  const downloadHTML = () => {
    const html = editorRef.current?.innerHTML || "";
    const blob = new Blob([`<!DOCTYPE html><html><head><title>${meta.name}</title></head><body>${html}</body></html>`], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${meta.name.replace(/\s+/g,"_")}.html`;
    a.click();
  };

  const insertTable = () => {
    const rows = 3, cols = 3;
    let table = `<table style="width:100%;border-collapse:collapse;margin:12px 0">`;
    for (let r = 0; r < rows; r++) {
      table += "<tr>";
      for (let c = 0; c < cols; c++) {
        const tag = r === 0 ? "th" : "td";
        table += `<${tag} style="border:1px solid #ccc;padding:6px 8px;${r===0?"background:#1a3a6b;color:#fff;font-weight:bold":""}">&nbsp;</${tag}>`;
      }
      table += "</tr>";
    }
    table += "</table>";
    exec("insertHTML", table);
  };

  const S: any = {
    page: { minHeight:"100vh",background:"#f8fafc",display:"flex",flexDirection:"column" },
    bar: { background:"#1a3a6b",color:"#fff",padding:"8px 16px",display:"flex",alignItems:"center",gap:12,position:"sticky",top:0,zIndex:100 },
    tb: { background:"#fff",borderBottom:"1px solid #e5e7eb",padding:"4px 12px",display:"flex",alignItems:"center",gap:2,flexWrap:"wrap" as const },
    sep: { width:1,height:20,background:"#e5e7eb",margin:"0 4px" },
    paper: { maxWidth:850,margin:"20px auto",background:"#fff",boxShadow:"0 2px 12px rgba(0,0,0,0.1)",borderRadius:4,padding:"40px 50px",minHeight:1000 },
    inp: { padding:"4px 8px",border:"1px solid #d1d5db",borderRadius:4,fontSize:12,outline:"none" },
  };

  return (
    <div style={S.page}>
      {/* -- Header -- */}
      <div style={S.bar}>
        <button onClick={() => navigate("/documents")} style={{ background:"none",border:"none",color:"rgba(255,255,255,0.9)",cursor:"pointer",padding:0 }}>
          <X style={{ width:18,height:18 }} />
        </button>
        <img src={logoImg} alt="" style={{ width:28,height:28,borderRadius:6,objectFit:"contain",background:"#e2e8f0",padding:2 }} />
        <input value={meta.name} onChange={e=>setMeta(p=>({...p,name:e.target.value}))}
          style={{ background:"#f8fafc",border:"none",color:"#fff",fontSize:15,fontWeight:600,outline:"none",flex:1,minWidth:200 }} />
        <div style={{ display:"flex",gap:8,marginLeft:"auto" }}>
          <button onClick={() => setShowTemplates(p=>!p)} style={{ padding:"6px 12px",borderRadius:6,border:"1px solid rgba(255,255,255,0.3)",background:"#f1f5f9",color:"#fff",cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",gap:5 }}>
            <FileText style={{ width:13,height:13 }} /> Templates
          </button>
          <button onClick={() => setMode(m => m==="edit"?"preview":"edit")}
            style={{ padding:"6px 12px",borderRadius:6,border:"1px solid rgba(255,255,255,0.3)",background:"#f1f5f9",color:"#fff",cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",gap:5 }}>
            {mode==="edit" ? <Eye style={{ width:13,height:13 }} /> : <Edit3 style={{ width:13,height:13 }} />}
            {mode==="edit" ? "Preview" : "Edit"}
          </button>
          <button onClick={print} style={{ padding:"6px 12px",borderRadius:6,border:"1px solid rgba(255,255,255,0.3)",background:"#f1f5f9",color:"#fff",cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",gap:5 }}>
            <Printer style={{ width:13,height:13 }} /> Print
          </button>
          <button onClick={downloadHTML} style={{ padding:"6px 12px",borderRadius:6,border:"1px solid rgba(255,255,255,0.3)",background:"#f1f5f9",color:"#fff",cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",gap:5 }}>
            <Download style={{ width:13,height:13 }} /> Export
          </button>
          <button onClick={save} disabled={saving}
            style={{ padding:"6px 14px",borderRadius:6,border:"none",background:"#C45911",color:"#fff",cursor:"pointer",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",gap:5 }}>
            <Save style={{ width:13,height:13 }} /> {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* -- Templates Panel -- */}
      {showTemplates && (
        <div style={{ background:"#fff",borderBottom:"1px solid #e5e7eb",padding:"12px 20px",display:"flex",gap:10,flexWrap:"wrap" as const,alignItems:"center" }}>
          <span style={{ fontSize:12,fontWeight:700,color:"#374151",marginRight:4 }}>Choose template:</span>
          {TEMPLATES.map(t => (
            <button key={t.name} onClick={() => loadTemplate(t)}
              style={{ padding:"5px 12px",borderRadius:16,border:"1px solid #d1d5db",background:"#f9fafb",cursor:"pointer",fontSize:12,color:"#374151" }}
              onMouseEnter={e=>{e.currentTarget.style.background="#eff6ff";e.currentTarget.style.borderColor="#4f46e5"}}
              onMouseLeave={e=>{e.currentTarget.style.background="#f9fafb";e.currentTarget.style.borderColor="#d1d5db"}}>
              {t.name}
            </button>
          ))}
          <button onClick={() => setShowTemplates(false)} style={{ marginLeft:"auto",padding:"4px 8px",border:"none",background:"none",cursor:"pointer",color:"#6b7280" }}>
            <X style={{ width:14,height:14 }} />
          </button>
        </div>
      )}

      {/* -- Toolbar (edit mode only) -- */}
      {mode === "edit" && (
        <div style={S.tb}>
          {/* Font family */}
          <select value={fontFamily} onChange={e=>{setFontFamily(e.target.value);exec("fontName",e.target.value)}} style={{...S.inp,width:130}}>
            {FONT_FAMILIES.map(f=><option key={f}>{f}</option>)}
          </select>
          {/* Font size */}
          <select value={fontSize} onChange={e=>{setFontSize(e.target.value);exec("fontSize","3");if(editorRef.current){const sel=window.getSelection();if(sel&&sel.rangeCount>0){const range=sel.getRangeAt(0);const span=document.createElement("span");span.style.fontSize=e.target.value+"pt";try{range.surroundContents(span);}catch{}}}}} style={{...S.inp,width:60}}>
            {FONT_SIZES.map(s=><option key={s}>{s}</option>)}
          </select>
          <div style={S.sep}/>
          <TB icon={Bold} title="Bold" onClick={()=>exec("bold")} />
          <TB icon={Italic} title="Italic" onClick={()=>exec("italic")} />
          <TB icon={Underline} title="Underline" onClick={()=>exec("underline")} />
          <div style={S.sep}/>
          <TB icon={AlignLeft} title="Align Left" onClick={()=>exec("justifyLeft")} />
          <TB icon={AlignCenter} title="Center" onClick={()=>exec("justifyCenter")} />
          <TB icon={AlignRight} title="Right" onClick={()=>exec("justifyRight")} />
          <TB icon={AlignJustify} title="Justify" onClick={()=>exec("justifyFull")} />
          <div style={S.sep}/>
          <TB icon={List} title="Bullet List" onClick={()=>exec("insertUnorderedList")} />
          <TB icon={ListOrdered} title="Numbered List" onClick={()=>exec("insertOrderedList")} />
          <div style={S.sep}/>
          <TB icon={Undo} title="Undo" onClick={()=>exec("undo")} />
          <TB icon={Redo} title="Redo" onClick={()=>exec("redo")} />
          <div style={S.sep}/>
          <TB icon={Table} title="Insert Table" onClick={insertTable} />
          <div style={S.sep}/>
          {/* Heading buttons */}
          {["H1","H2","H3"].map(h=>(
            <button key={h} title={h} onClick={()=>exec("formatBlock",`<${h.toLowerCase()}>`)}
              style={{ padding:"2px 7px",border:"none",borderRadius:3,cursor:"pointer",background:"#f8fafc",fontSize:11,fontWeight:700,color:"#374151" }}>
              {h}
            </button>
          ))}
          <button title="Paragraph" onClick={()=>exec("formatBlock","<p>")}
            style={{ padding:"2px 7px",border:"none",borderRadius:3,cursor:"pointer",background:"#f8fafc",fontSize:11,color:"#374151" }}>P</button>
          <div style={S.sep}/>
          {/* Text color */}
          <input type="color" title="Text Color" defaultValue="#000000"
            onChange={e=>exec("foreColor",e.target.value)}
            style={{ width:28,height:24,border:"1px solid #d1d5db",borderRadius:3,cursor:"pointer",padding:1 }} />
          {/* Highlight */}
          <input type="color" title="Highlight" defaultValue="#ffff00"
            onChange={e=>exec("hiliteColor",e.target.value)}
            style={{ width:28,height:24,border:"1px solid #d1d5db",borderRadius:3,cursor:"pointer",padding:1 }} />
          <div style={S.sep}/>
          <button title="Clear Formatting" onClick={()=>exec("removeFormat")}
            style={{ padding:"3px 7px",border:"1px solid #d1d5db",borderRadius:3,cursor:"pointer",fontSize:11,background:"#f8fafc" }}>
            Clear
          </button>
        </div>
      )}

      {/* -- Document Metadata Bar -- */}
      <div style={{ background:"#fff",borderBottom:"1px solid #e5e7eb",padding:"4px 16px",display:"flex",alignItems:"center",gap:12,fontSize:12,color:"#6b7280" }}>
        <span>Category:</span>
        <select value={meta.category} onChange={e=>setMeta(p=>({...p,category:e.target.value}))} style={{...S.inp,padding:"2px 6px",fontSize:11}}>
          {["General","Memo","Letter","Report","Minutes","RFQ","Contract","Policy","Template","Other"].map(c=><option key={c}>{c}</option>)}
        </select>
        <label style={{ display:"flex",alignItems:"center",gap:5 }}>
          <input type="checkbox" checked={meta.is_template} onChange={e=>setMeta(p=>({...p,is_template:e.target.checked}))} />
          Save as template
        </label>
        <span style={{ marginLeft:"auto" }}>
          {mode==="edit" ? " Editing" : " Preview"} | {hospitalName}
        </span>
      </div>

      {/* -- Editor Area -- */}
      <div style={{ flex:1,padding:"20px",overflowY:"auto" }}>
        {mode === "edit" ? (
          <div style={S.paper}>
            {/* Letterhead */}
            <div style={{ display:"flex",alignItems:"center",gap:14,borderBottom:"3px solid #1a3a6b",paddingBottom:12,marginBottom:20 }}>
              <img src={logoImg} alt="EL5H" style={{ width:56,height:56,objectFit:"contain" }} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:16,fontWeight:900,color:"#1a3a6b" }}>{hospitalName}</div>
                <div style={{ fontSize:11,color:"#6b7280" }}>{countyName}</div>
              </div>
              <div style={{ textAlign:"right",fontSize:10,color:"#9ca3af" }}>
                <div>{new Date().toLocaleDateString("en-KE",{day:"2-digit",month:"long",year:"numeric"})}</div>
                <div style={{ fontStyle:"italic" as const }}>{meta.category} Document</div>
              </div>
            </div>
            {/* Editable content */}
            <div ref={editorRef} contentEditable suppressContentEditableWarning
              style={{ outline:"none",minHeight:600,fontFamily,fontSize:`${fontSize}pt`,lineHeight:1.8,color:"#111" }}
              onPaste={e=>{e.preventDefault();const text=e.clipboardData.getData("text/html")||e.clipboardData.getData("text/plain");exec("insertHTML",text);}} />
          </div>
        ) : (
          <div style={S.paper}>
            <div style={{ display:"flex",alignItems:"center",gap:14,borderBottom:"3px solid #1a3a6b",paddingBottom:12,marginBottom:20 }}>
              <img src={logoImg} alt="EL5H" style={{ width:56,height:56,objectFit:"contain" }} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:16,fontWeight:900,color:"#1a3a6b" }}>{hospitalName}</div>
                <div style={{ fontSize:11,color:"#6b7280" }}>{countyName}</div>
              </div>
            </div>
            <div style={{ fontFamily,fontSize:`${fontSize}pt`,lineHeight:1.8,color:"#111" }}
              dangerouslySetInnerHTML={{ __html: editorRef.current?.innerHTML || "" }} />
          </div>
        )}
      </div>
    </div>
  );
}

