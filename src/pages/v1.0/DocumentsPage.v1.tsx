import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
import { useSystemSettings } from "@/hooks/useSystemSettings";
  FileText, Upload, Eye, Download, Search, X, Plus, Filter,
  Printer, RefreshCw, Edit3, Trash2, FileCheck, Settings, Save,
  ChevronDown, Shield, CheckCircle, AlertTriangle, Image, Code,
  Pen, Copy, Lock, Unlock, FileSpreadsheet, BookOpen, ClipboardList
} from "lucide-react";

const CATS = ["all","general","policy","template","contract","report","letter","form","procedure","system"];
const CAT_CFG: Record<string,{bg:string;color:string;label:string}> = {
  general:   {bg:"#f3f4f6",color:"#6b7280",  label:"General"},
  policy:    {bg:"#dbeafe",color:"#1d4ed8",  label:"Policy"},
  template:  {bg:"#fef3c7",color:"#92400e",  label:"Template"},
  contract:  {bg:"#dcfce7",color:"#15803d",  label:"Contract"},
  report:    {bg:"#ede9fe",color:"#5b21b6",  label:"Report"},
  letter:    {bg:"#fce7f3",color:"#9d174d",  label:"Letter"},
  form:      {bg:"#e0f2fe",color:"#0369a1",  label:"Form"},
  procedure: {bg:"#f0fdf4",color:"#166534",  label:"Procedure"},
  system:    {bg:"#f9fafb",color:"#374151",  label:"System"},
  other:     {bg:"#f9fafb",color:"#374151",  label:"Other"},
};

const DOC_PRINT_CSS = `
  body { font-family: 'Times New Roman', serif; background: #fff; }
  .doc-page { max-width: 190mm; margin: 0 auto; padding: 15mm 20mm; }
  .doc-header { display: flex; align-items: flex-start; gap: 20px; margin-bottom: 20px; padding-bottom: 14px; border-bottom: 2.5px solid #0a2558; }
  .doc-header .logo-area img { height: 65px; object-fit: contain; }
  .doc-header .header-text h2 { font-size: 16pt; color: #0a2558; margin: 0 0 3px; font-weight: 800; letter-spacing: -0.5px; }
  .doc-header .header-text h3 { font-size: 12pt; color: #C45911; margin: 0 0 3px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
  .doc-header .header-text p { font-size: 10pt; margin: 2px 0; color: #374151; }
  .info-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 10pt; }
  .info-table td { padding: 5px 8px; border: 1px solid #d1d5db; vertical-align: top; }
  .info-table td:first-child { background: #f9fafb; font-weight: 600; width: 22%; color: #374151; }
  .items-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 10pt; }
  .items-table thead tr { background: #0a2558; }
  .items-table thead th { color: #fff; padding: 7px 8px; text-align: left; font-weight: 700; font-size: 9pt; }
  .items-table tbody tr:nth-child(even) { background: #f9fafb; }
  .items-table tbody td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
  .items-table tfoot .subtotal td, .items-table tfoot .tax td { border-top: 1px solid #e5e7eb; padding: 5px 8px; font-size: 10pt; }
  .items-table tfoot .total td { font-weight: 800; font-size: 11pt; border-top: 2px solid #0a2558; background: #eff6ff; padding: 7px 8px; }
  .terms { font-size: 9pt; color: #6b7280; border: 1px solid #e5e7eb; padding: 10px 12px; margin: 12px 0; border-radius: 4px; line-height: 1.6; }
  .terms h4 { font-size: 10pt; color: #374151; margin: 0 0 5px; }
  .signatures { display: flex; gap: 16px; margin-top: 28px; page-break-inside: avoid; }
  .sig-box { flex: 1; text-align: center; padding: 8px; }
  .sig-box img { max-height: 50px; margin-bottom: 4px; }
  .sig-line { border-top: 1px solid #374151; margin-bottom: 5px; padding-top: 36px; font-size: 10pt; font-weight: 600; color: #111827; }
  .sig-role { font-size: 9pt; color: #6b7280; }
  .sig-date { font-size: 9pt; color: #9ca3af; }
  .doc-stamp { text-align: center; margin-top: 18px; font-size: 8pt; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 8px; letter-spacing: 2px; text-transform: uppercase; }
  .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%) rotate(-45deg); font-size: 90pt; color: rgba(10,37,88,0.035); font-weight: 900; z-index: -1; pointer-events: none; }
  @media print { @page { margin: 10mm; size: A4; } .no-print { display: none !important; } }
`;

const SYSTEM_TEMPLATES = [
  { id:"lpo", name:"Local Purchase Order (LPO)", category:"template", description:"Standard LPO for procurement purchases", icon:ShoppingCart,
    html:`<div class="doc-page"><div class="watermark">LPO</div>
<div class="doc-header"><div class="logo-area"><img src="/src/assets/embu-county-logo.jpg" alt="Logo" onerror="this.style.display='none'"/></div>
<div class="header-text"><h2>EMBU LEVEL 5 HOSPITAL</h2><h3>LOCAL PURCHASE ORDER</h3><p>LPO No: <strong>{{LPO_NUMBER}}</strong></p><p>Date: {{DATE}}</p></div></div>
<table class="info-table">
  <tr><td>Supplier:</td><td>{{SUPPLIER_NAME}}</td><td>Delivery Date:</td><td>{{DELIVERY_DATE}}</td></tr>
  <tr><td>Address:</td><td>{{SUPPLIER_ADDRESS}}</td><td>Department:</td><td>{{DEPARTMENT}}</td></tr>
  <tr><td>Contact:</td><td>{{SUPPLIER_CONTACT}}</td><td>Requisition No:</td><td>{{REQ_NUMBER}}</td></tr>
  <tr><td>PIN:</td><td>{{SUPPLIER_PIN}}</td><td>Payment Terms:</td><td>{{PAYMENT_TERMS}}</td></tr>
</table>
<table class="items-table">
  <thead><tr><th>#</th><th>Item Description</th><th>Unit</th><th>Qty</th><th>Unit Price (KES)</th><th>Total (KES)</th></tr></thead>
  <tbody>{{ITEMS_ROWS}}</tbody>
  <tfoot>
    <tr class="subtotal"><td colspan="5"><strong>Subtotal</strong></td><td>{{SUBTOTAL}}</td></tr>
    <tr class="tax"><td colspan="5">VAT (16%)</td><td>{{VAT}}</td></tr>
    <tr class="total"><td colspan="5"><strong>TOTAL</strong></td><td><strong>{{TOTAL}}</strong></td></tr>
  </tfoot>
</table>
<div class="terms"><h4>Terms & Conditions</h4><p>{{TERMS}}</p></div>
<div class="signatures">
  <div class="sig-box"><div class="sig-line">{{SIG_AUTHORIZED}}</div><p class="sig-role">Authorized Signatory</p><p class="sig-date">Date: {{SIG_DATE_1}}</p></div>
  <div class="sig-box"><div class="sig-line">{{SIG_SUPPLIER}}</div><p class="sig-role">Supplier Representative</p><p class="sig-date">Date: {{SIG_DATE_2}}</p></div>
  <div class="sig-box"><div class="sig-line">{{SIG_APPROVED}}</div><p class="sig-role">Approved By</p><p class="sig-date">Date: {{SIG_DATE_3}}</p></div>
</div>
<div class="doc-stamp">OFFICIAL DOCUMENT — EMBU LEVEL 5 HOSPITAL · EMBU COUNTY GOVERNMENT</div></div>`},

  { id:"grn", name:"Goods Received Note (GRN)", category:"template", description:"Goods receipt confirmation document", icon:Package,
    html:`<div class="doc-page"><div class="watermark">GRN</div>
<div class="doc-header"><div class="logo-area"><img src="/src/assets/embu-county-logo.jpg" alt="Logo" onerror="this.style.display='none'"/></div>
<div class="header-text"><h2>EMBU LEVEL 5 HOSPITAL</h2><h3>GOODS RECEIVED NOTE</h3><p>GRN No: <strong>{{GRN_NUMBER}}</strong></p><p>Date: {{DATE}}</p></div></div>
<table class="info-table">
  <tr><td>Supplier:</td><td>{{SUPPLIER_NAME}}</td><td>LPO Reference:</td><td>{{LPO_NUMBER}}</td></tr>
  <tr><td>Delivery Note:</td><td>{{DELIVERY_NOTE}}</td><td>Received By:</td><td>{{RECEIVED_BY}}</td></tr>
  <tr><td>Delivery Date:</td><td>{{DELIVERY_DATE}}</td><td>Department:</td><td>{{DEPARTMENT}}</td></tr>
  <tr><td>Vehicle No:</td><td>{{VEHICLE_NUMBER}}</td><td>Driver:</td><td>{{DRIVER_NAME}}</td></tr>
</table>
<table class="items-table">
  <thead><tr><th>#</th><th>Item Description</th><th>Unit</th><th>Ordered</th><th>Received</th><th>Rejected</th><th>Condition</th></tr></thead>
  <tbody>{{ITEMS_ROWS}}</tbody>
</table>
<div class="terms"><h4>Inspection Notes</h4><p>{{INSPECTION_NOTES}}</p></div>
<div class="signatures">
  <div class="sig-box"><div class="sig-line">{{SIG_RECEIVED}}</div><p class="sig-role">Received By</p><p class="sig-date">{{SIG_DATE_1}}</p></div>
  <div class="sig-box"><div class="sig-line">{{SIG_INSPECTED}}</div><p class="sig-role">Quality Inspector</p><p class="sig-date">{{SIG_DATE_2}}</p></div>
  <div class="sig-box"><div class="sig-line">{{SIG_STORE}}</div><p class="sig-role">Store Manager</p><p class="sig-date">{{SIG_DATE_3}}</p></div>
</div>
<div class="doc-stamp">OFFICIAL DOCUMENT — EMBU LEVEL 5 HOSPITAL · EMBU COUNTY GOVERNMENT</div></div>`},

  { id:"pv", name:"Payment Voucher", category:"template", description:"Official payment authorization voucher", icon:DollarSign,
    html:`<div class="doc-page"><div class="watermark">PV</div>
<div class="doc-header"><div class="logo-area"><img src="/src/assets/embu-county-logo.jpg" alt="Logo" onerror="this.style.display='none'"/></div>
<div class="header-text"><h2>EMBU LEVEL 5 HOSPITAL</h2><h3>PAYMENT VOUCHER</h3><p>PV No: <strong>{{PV_NUMBER}}</strong></p><p>Date: {{DATE}}</p></div></div>
<table class="info-table">
  <tr><td>Payee:</td><td colspan="3"><strong>{{PAYEE_NAME}}</strong></td></tr>
  <tr><td>Account No:</td><td>{{ACCOUNT_NUMBER}}</td><td>Bank:</td><td>{{BANK_NAME}}</td></tr>
  <tr><td>Amount (Words):</td><td colspan="3"><strong>{{AMOUNT_WORDS}}</strong></td></tr>
  <tr><td>Amount (KES):</td><td colspan="3"><strong style="font-size:13pt;color:#0a2558">KES {{AMOUNT}}</strong></td></tr>
  <tr><td>Description:</td><td colspan="3">{{DESCRIPTION}}</td></tr>
  <tr><td>LPO/Contract Ref:</td><td>{{REF_NUMBER}}</td><td>Vote Head:</td><td>{{VOTE_HEAD}}</td></tr>
  <tr><td>Budget Line:</td><td>{{BUDGET_LINE}}</td><td>Cost Centre:</td><td>{{COST_CENTRE}}</td></tr>
</table>
<div class="signatures">
  <div class="sig-box"><div class="sig-line">{{SIG_PREPARED}}</div><p class="sig-role">Prepared By</p><p class="sig-date">{{SIG_DATE_1}}</p></div>
  <div class="sig-box"><div class="sig-line">{{SIG_VERIFIED}}</div><p class="sig-role">Verified By (Finance)</p><p class="sig-date">{{SIG_DATE_2}}</p></div>
  <div class="sig-box"><div class="sig-line">{{SIG_AUTHORIZED}}</div><p class="sig-role">Authorized By</p><p class="sig-date">{{SIG_DATE_3}}</p></div>
</div>
<div class="doc-stamp">OFFICIAL DOCUMENT — EMBU LEVEL 5 HOSPITAL · EMBU COUNTY GOVERNMENT</div></div>`},

  { id:"tender", name:"Invitation to Tender (ITT)", category:"template", description:"Formal tender invitation document", icon:Gavel,
    html:`<div class="doc-page"><div class="watermark">TENDER</div>
<div class="doc-header"><div class="logo-area"><img src="/src/assets/embu-county-logo.jpg" alt="Logo" onerror="this.style.display='none'"/></div>
<div class="header-text"><h2>EMBU LEVEL 5 HOSPITAL</h2><h3>INVITATION TO TENDER</h3><p>Tender No: <strong>{{TENDER_NUMBER}}</strong></p></div></div>
<table class="info-table">
  <tr><td>Subject:</td><td colspan="3"><strong>{{TENDER_SUBJECT}}</strong></td></tr>
  <tr><td>Category:</td><td>{{TENDER_CATEGORY}}</td><td>Estimated Value:</td><td>KES {{ESTIMATED_VALUE}}</td></tr>
  <tr><td>Issue Date:</td><td>{{ISSUE_DATE}}</td><td>Closing Date:</td><td><strong>{{CLOSING_DATE}}</strong></td></tr>
  <tr><td>Site Visit:</td><td>{{SITE_VISIT_DATE}}</td><td>Clarification:</td><td>{{CLARIFICATION_DATE}}</td></tr>
</table>
<div class="terms"><h4>Instructions to Bidders</h4><p>{{INSTRUCTIONS}}</p></div>
<div class="terms"><h4>Eligibility Criteria</h4><p>{{ELIGIBILITY}}</p></div>
<div class="terms"><h4>Submission Requirements</h4><p>{{SUBMISSION_REQUIREMENTS}}</p></div>
<div class="signatures">
  <div class="sig-box"><div class="sig-line">{{SIG_AUTHORIZED}}</div><p class="sig-role">Head of Procurement</p><p class="sig-date">{{SIG_DATE_1}}</p></div>
  <div class="sig-box"><div class="sig-line">{{SIG_APPROVED}}</div><p class="sig-role">Director, EL5H</p><p class="sig-date">{{SIG_DATE_2}}</p></div>
</div>
<div class="doc-stamp">OFFICIAL DOCUMENT — EMBU LEVEL 5 HOSPITAL · EMBU COUNTY GOVERNMENT</div></div>`},

  { id:"req_form", name:"Procurement Requisition Form", category:"form", description:"Internal requisition request form", icon:ClipboardList,
    html:`<div class="doc-page"><div class="watermark">REQ</div>
<div class="doc-header"><div class="logo-area"><img src="/src/assets/embu-county-logo.jpg" alt="Logo" onerror="this.style.display='none'"/></div>
<div class="header-text"><h2>EMBU LEVEL 5 HOSPITAL</h2><h3>PROCUREMENT REQUISITION FORM</h3><p>REQ No: <strong>{{REQ_NUMBER}}</strong></p><p>Date: {{DATE}}</p></div></div>
<table class="info-table">
  <tr><td>Requesting Dept:</td><td>{{DEPARTMENT}}</td><td>Priority:</td><td>{{PRIORITY}}</td></tr>
  <tr><td>Requested By:</td><td>{{REQUESTED_BY}}</td><td>Date Required:</td><td>{{DATE_REQUIRED}}</td></tr>
  <tr><td>Justification:</td><td colspan="3">{{JUSTIFICATION}}</td></tr>
</table>
<table class="items-table">
  <thead><tr><th>#</th><th>Item Description</th><th>Unit</th><th>Quantity</th><th>Unit Price (KES)</th><th>Total (KES)</th><th>Remarks</th></tr></thead>
  <tbody>{{ITEMS_ROWS}}</tbody>
  <tfoot><tr class="total"><td colspan="5"><strong>TOTAL AMOUNT</strong></td><td colspan="2"><strong>KES {{TOTAL}}</strong></td></tr></tfoot>
</table>
<div class="signatures">
  <div class="sig-box"><div class="sig-line">{{SIG_REQUESTED}}</div><p class="sig-role">Requested By</p><p class="sig-date">{{SIG_DATE_1}}</p></div>
  <div class="sig-box"><div class="sig-line">{{SIG_HOD}}</div><p class="sig-role">Head of Department</p><p class="sig-date">{{SIG_DATE_2}}</p></div>
  <div class="sig-box"><div class="sig-line">{{SIG_PROCUREMENT}}</div><p class="sig-role">Procurement Officer</p><p class="sig-date">{{SIG_DATE_3}}</p></div>
  <div class="sig-box"><div class="sig-line">{{SIG_APPROVED}}</div><p class="sig-role">Approved By</p><p class="sig-date">{{SIG_DATE_4}}</p></div>
</div>
<div class="doc-stamp">OFFICIAL DOCUMENT — EMBU LEVEL 5 HOSPITAL · EMBU COUNTY GOVERNMENT</div></div>`},
];

const PLACEHOLDERS = [
  "{{LPO_NUMBER}}","{{GRN_NUMBER}}","{{PV_NUMBER}}","{{TENDER_NUMBER}}","{{REQ_NUMBER}}",
  "{{DATE}}","{{DELIVERY_DATE}}","{{CLOSING_DATE}}","{{SIG_DATE_1}}","{{SIG_DATE_2}}","{{SIG_DATE_3}}","{{SIG_DATE_4}}",
  "{{SUPPLIER_NAME}}","{{SUPPLIER_ADDRESS}}","{{SUPPLIER_CONTACT}}","{{SUPPLIER_PIN}}",
  "{{DEPARTMENT}}","{{DESCRIPTION}}","{{TOTAL}}","{{SUBTOTAL}}","{{VAT}}",
  "{{SIG_AUTHORIZED}}","{{SIG_APPROVED}}","{{SIG_SUPPLIER}}","{{SIG_RECEIVED}}","{{SIG_INSPECTED}}","{{SIG_STORE}}",
  "{{SIG_PREPARED}}","{{SIG_VERIFIED}}","{{SIG_REQUESTED}}","{{SIG_HOD}}","{{SIG_PROCUREMENT}}",
  "{{ITEMS_ROWS}}","{{TERMS}}","{{PAYMENT_TERMS}}","{{AMOUNT}}","{{AMOUNT_WORDS}}",
  "{{PAYEE_NAME}}","{{BANK_NAME}}","{{ACCOUNT_NUMBER}}","{{VOTE_HEAD}}","{{BUDGET_LINE}}","{{COST_CENTRE}}",
  "{{TENDER_SUBJECT}}","{{TENDER_CATEGORY}}","{{ESTIMATED_VALUE}}","{{INSTRUCTIONS}}","{{ELIGIBILITY}}",
  "{{PRIORITY}}","{{REQUESTED_BY}}","{{JUSTIFICATION}}","{{REF_NUMBER}}","{{INSPECTION_NOTES}}",
];

function printDoc(html: string, title: string) {
  const w = window.open("","_blank","width=900,height=700");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>${DOC_PRINT_CSS}</style></head><body onload="window.print()">${html}</body></html>`);
  w.document.close();
}

// Missing icon imports resolved inline
function ShoppingCart(p:any) { return <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>; }
function Gavel(p:any) { return <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m14 13-7.5 7.5a2.12 2.12 0 0 1-3-3L11 10"/><path d="m16 16 6-6"/><path d="m8 8 6-6"/><path d="m9 7 8 8"/><path d="m21 11-8-8"/></svg>; }
function DollarSign(p:any) { return <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>; }
function Package(p:any) { return <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>; }
function ClipboardList(p:any) { return <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><line x1="12" y1="11" x2="16" y2="11"/><line x1="12" y1="16" x2="16" y2="16"/><line x1="8" y1="11" x2="8.01" y2="11"/><line x1="8" y1="16" x2="8.01" y2="16"/></svg>; }

export default function DocumentsPage() {
  const { user, profile, roles } = useAuth();
  const isAdmin = roles.includes("admin") || roles.includes("procurement_manager");

  const [docs,       setDocs]       = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [catFilter,  setCatFilter]  = useState("all");
  const [search,     setSearch]     = useState("");
  const [selected,   setSelected]   = useState<any|null>(null);
  const [editModal,  setEditModal]  = useState(false);
  const [editDoc,    setEditDoc]    = useState<any|null>(null);
  const [previewDoc, setPreviewDoc] = useState<any|null>(null);
  const [uploadModal,setUploadModal]= useState(false);
  const [saving,     setSaving]     = useState(false);
  const [editTab,    setEditTab]    = useState<"metadata"|"html"|"preview"|"sigs">("metadata");

  // Upload form
  const [upFile,     setUpFile]     = useState<File|null>(null);
  const [upName,     setUpName]     = useState("");
  const [upDesc,     setUpDesc]     = useState("");
  const [upCat,      setUpCat]      = useState("general");
  const [upHtml,     setUpHtml]     = useState("");

  const loadDocs = useCallback(async()=>{
    setLoading(true);
    const { data } = await (supabase as any).from("documents").select("*").order("created_at",{ascending:false});
    setDocs(data||[]);
    setLoading(false);
  },[]);

  useEffect(()=>{ loadDocs(); },[loadDocs]);

  useEffect(()=>{
    if(!user) return;
    const ch=(supabase as any).channel("docs-rt").on("postgres_changes",{event:"*",schema:"public",table:"documents"},loadDocs).subscribe();
    return()=>(supabase as any).removeChannel(ch);
  },[loadDocs,user]);

  // All documents to show = system templates + DB docs
  const allDocs = [
    ...SYSTEM_TEMPLATES.map(t=>({...t, id:t.id, is_system:true, created_at:new Date().toISOString()})),
    ...docs.filter(d=>!SYSTEM_TEMPLATES.find(t=>t.id===d.id)),
  ];

  const filtered = allDocs.filter(d=>{
    const catMatch = catFilter==="all" || d.category===catFilter || (catFilter==="system"&&d.is_system);
    const searchMatch = !search || [d.name,d.description,d.category].some(v=>(v||"").toLowerCase().includes(search.toLowerCase()));
    return catMatch && searchMatch;
  });

  const saveDoc = async()=>{
    if(!editDoc) return;
    setSaving(true);
    try {
      if(editDoc.is_system || !editDoc.db_id) {
        // Save as new custom doc
        const {error} = await (supabase as any).from("documents").upsert({
          id: editDoc.db_id||undefined,
          name: editDoc.name, description: editDoc.description,
          category: editDoc.category, template_html: editDoc.html,
          created_by: user?.id, file_type:"html",
        });
        if(error) throw error;
      } else {
        const {error} = await (supabase as any).from("documents").update({
          name: editDoc.name, description: editDoc.description,
          category: editDoc.category, template_html: editDoc.html,
          updated_at: new Date().toISOString(),
        }).eq("id", editDoc.db_id);
        if(error) throw error;
      }
      toast({title:"Document saved ✓"});
      setEditModal(false); loadDocs();
    } catch(e:any){ toast({title:"Save failed",description:e.message,variant:"destructive"}); }
    setSaving(false);
  };

  const deleteDoc = async(doc:any)=>{
    if(doc.is_system){ toast({title:"System templates cannot be deleted",variant:"destructive"}); return; }
    if(!confirm(`Delete "${doc.name}"?`)) return;
    await (supabase as any).from("documents").delete().eq("id",doc.id);
    toast({title:"Deleted"}); loadDocs(); setSelected(null);
  };

  const uploadFile = async()=>{
    if(!upFile&&!upHtml){ toast({title:"Add a file or HTML content",variant:"destructive"}); return; }
    setSaving(true);
    let fileData:string|undefined;
    if(upFile){
      fileData = await new Promise(res=>{
        const r=new FileReader(); r.onload=e=>res(e.target?.result as string); r.readAsDataURL(upFile);
      });
    }
    const {error} = await (supabase as any).from("documents").insert({
      name: upName||upFile?.name||"Untitled",
      description: upDesc, category: upCat,
      file_data: fileData, file_type: upFile?.type||"html",
      template_html: upHtml||null, created_by: user?.id,
    });
    if(error){ toast({title:"Upload failed",description:error.message,variant:"destructive"}); }
    else { toast({title:"Document uploaded ✓"}); setUploadModal(false); setUpFile(null); setUpName(""); setUpDesc(""); setUpHtml(""); loadDocs(); }
    setSaving(false);
  };

  const openEdit = (doc:any)=>{
    setEditDoc({
      name: doc.name, description: doc.description||"",
      category: doc.category||"general",
      html: doc.html||doc.template_html||"",
      is_system: !!doc.is_system,
      db_id: doc.id&&!doc.is_system?doc.id:undefined,
    });
    setEditTab("metadata");
    setEditModal(true);
  };

  const printFromDoc = (doc:any)=>{
    const html = doc.html||doc.template_html;
    if(html) printDoc(html, doc.name);
    else toast({title:"No printable content",variant:"destructive"});
  };

  const downloadDoc = (doc:any)=>{
    if(doc.file_data){
      const a = document.createElement("a");
      a.href = doc.file_data; a.download = doc.name;
      a.click();
    } else if(doc.html||doc.template_html){
      const blob = new Blob([`<!DOCTYPE html><html><head><title>${doc.name}</title><style>${DOC_PRINT_CSS}</style></head><body>${doc.html||doc.template_html}</body></html>`],{type:"text/html"});
      const a = document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`${doc.name}.html`; a.click();
    }
  };

  return (
      <div style={{minHeight:"calc(100vh - 82px)",background:"#f0f2f5",fontFamily:"'Inter','Segoe UI',sans-serif"}}>

      {/* Header */}
      <div style={{background:"linear-gradient(135deg,#0a2558,#1a3a6b)",padding:"14px 20px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap" as const}}>
        <FileText style={{width:18,height:18,color:"#fff",flexShrink:0}}/>
        <div style={{flex:1}}>
          <div style={{fontSize:15,fontWeight:800,color:"#fff"}}>Documents & Templates</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>System templates, forms, contracts, and uploaded files</div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap" as const}}>
          {isAdmin&&<button onClick={()=>setUploadModal(true)}
            style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",background:"rgba(255,255,255,0.15)",color:"#fff",border:"1px solid rgba(255,255,255,0.25)",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:700}}>
            <Upload style={{width:13,height:13}}/> Upload
          </button>}
          <button onClick={loadDocs} style={{padding:"8px 10px",background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:7,cursor:"pointer",color:"rgba(255,255,255,0.6)",lineHeight:0}}>
            <RefreshCw style={{width:13,height:13}}/>
          </button>
        </div>
      </div>

      <div style={{display:"flex",gap:0,height:"calc(100vh - 148px)"}}>

        {/* LEFT PANEL */}
        <div style={{width:260,background:"#fff",borderRight:"1px solid #e5e7eb",display:"flex",flexDirection:"column",flexShrink:0}}>
          {/* Search */}
          <div style={{padding:"10px 12px",borderBottom:"1px solid #f3f4f6"}}>
            <div style={{position:"relative"}}>
              <Search style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",width:12,height:12,color:"#9ca3af"}}/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search documents..."
                style={{width:"100%",paddingLeft:28,padding:"8px 10px 8px 28px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:6,outline:"none",background:"#f9fafb"}}/>
            </div>
          </div>
          {/* Category filter */}
          <div style={{padding:"8px 0",borderBottom:"1px solid #f3f4f6"}}>
            {CATS.map(c=>(
              <button key={c} onClick={()=>setCatFilter(c)}
                style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,width:"100%",padding:"8px 14px",border:"none",background:catFilter===c?"#eff6ff":"transparent",cursor:"pointer",textAlign:"left" as const,borderLeft:catFilter===c?"3px solid #1a3a6b":"3px solid transparent",transition:"all 0.1s"}}>
                <span style={{fontSize:13,fontWeight:catFilter===c?700:500,color:catFilter===c?"#1a3a6b":"#374151",textTransform:"capitalize" as const}}>{c==="all"?"All Documents":c}</span>
                <span style={{fontSize:10,color:"#9ca3af",background:"#f3f4f6",padding:"1px 6px",borderRadius:4}}>
                  {c==="all"?allDocs.length:allDocs.filter(d=>d.category===c||(c==="system"&&d.is_system)).length}
                </span>
              </button>
            ))}
          </div>
          <div style={{padding:"10px 14px",borderTop:"1px solid #f3f4f6",marginTop:"auto",background:"#f9fafb"}}>
            <div style={{fontSize:10,color:"#9ca3af",fontWeight:600}}>EL5 MediProcure</div>
            <div style={{fontSize:9,color:"#d1d5db"}}>{filtered.length} documents</div>
          </div>
        </div>

        {/* DOCUMENT LIST */}
        <div style={{width:320,background:"#fff",borderRight:"1px solid #e5e7eb",overflowY:"auto",display:"flex",flexDirection:"column"}}>
          <div style={{padding:"10px 14px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
            <span style={{fontSize:13,fontWeight:700,color:"#111827",flex:1}}>{catFilter==="all"?"All":catFilter} Documents</span>
            <span style={{fontSize:11,color:"#9ca3af"}}>{filtered.length}</span>
          </div>
          {loading?[1,2,3,4].map(i=>(
            <div key={i} style={{padding:"12px 14px",borderBottom:"1px solid #f9fafb",display:"flex",gap:10}}>
              <div style={{width:36,height:36,borderRadius:8,background:"#f3f4f6",animation:"pulse 1.5s infinite"}}/>
              <div style={{flex:1}}><div style={{height:11,background:"#f3f4f6",borderRadius:4,marginBottom:6,width:"65%",animation:"pulse 1.5s infinite"}}/><div style={{height:9,background:"#f3f4f6",borderRadius:4,width:"45%",animation:"pulse 1.5s infinite"}}/></div>
            </div>
          )):filtered.map(doc=>{
            const catC = CAT_CFG[doc.category]||CAT_CFG.general;
            const isActive = selected?.id===doc.id;
            return (
              <div key={doc.id} onClick={()=>setSelected(doc)}
                style={{padding:"12px 14px",borderBottom:"1px solid #f9fafb",cursor:"pointer",background:isActive?"#eff6ff":"transparent",borderLeft:isActive?"3px solid #1a3a6b":"3px solid transparent",transition:"background 0.1s"}}
                onMouseEnter={e=>{if(!isActive)(e.currentTarget as HTMLElement).style.background="#f9fafb";}}
                onMouseLeave={e=>{if(!isActive)(e.currentTarget as HTMLElement).style.background="transparent";}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:36,height:36,borderRadius:8,background:catC.bg,border:`1px solid ${catC.color}28`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <FileText style={{width:16,height:16,color:catC.color}}/>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,color:"#111827",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{doc.name}</div>
                    <div style={{fontSize:11,color:"#9ca3af",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{doc.description||"No description"}</div>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:6,marginTop:7}}>
                  <span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:3,background:catC.bg,color:catC.color}}>{catC.label}</span>
                  {doc.is_system&&<span style={{fontSize:9,color:"#1a3a6b",background:"#eff6ff",padding:"1px 6px",borderRadius:3,fontWeight:700}}>SYSTEM</span>}
                  {(doc.html||doc.template_html)&&<span style={{fontSize:9,color:"#107c10",background:"#dcfce7",padding:"1px 6px",borderRadius:3,fontWeight:700}}>PRINTABLE</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* DOCUMENT VIEWER */}
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:"#fff"}}>
          {selected ? (
            <>
              {/* Viewer header */}
              <div style={{padding:"12px 18px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:12,flexShrink:0,flexWrap:"wrap" as const}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:16,fontWeight:800,color:"#111827"}}>{selected.name}</div>
                  <div style={{fontSize:12,color:"#6b7280",marginTop:2}}>{selected.description}</div>
                  <div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap" as const}}>
                    <span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:4,...CAT_CFG[selected.category]||CAT_CFG.general}}>{selected.category}</span>
                    {selected.is_system&&<span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:4,background:"#eff6ff",color:"#1a3a6b"}}>System Template</span>}
                    {(selected.html||selected.template_html)&&<span style={{fontSize:11,padding:"2px 8px",borderRadius:4,background:"#dcfce7",color:"#107c10",fontWeight:700}}>✓ HTML Template</span>}
                  </div>
                </div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap" as const}}>
                  {(selected.html||selected.template_html)&&(
                    <>
                      <button onClick={()=>setPreviewDoc(selected)}
                        style={{display:"flex",alignItems:"center",gap:5,padding:"7px 13px",background:"#dbeafe",border:"1px solid #bfdbfe",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:700,color:"#1d4ed8"}}>
                        <Eye style={{width:13,height:13}}/> Preview
                      </button>
                      <button onClick={()=>printFromDoc(selected)}
                        style={{display:"flex",alignItems:"center",gap:5,padding:"7px 13px",background:"#107c10",border:"none",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:700,color:"#fff"}}>
                        <Printer style={{width:13,height:13}}/> Print
                      </button>
                    </>
                  )}
                  <button onClick={()=>downloadDoc(selected)}
                    style={{display:"flex",alignItems:"center",gap:5,padding:"7px 13px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:600,color:"#374151"}}>
                    <Download style={{width:13,height:13}}/> Download
                  </button>
                  {isAdmin&&<button onClick={()=>openEdit(selected)}
                    style={{display:"flex",alignItems:"center",gap:5,padding:"7px 13px",background:"#fef3c7",border:"1px solid #fde68a",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:700,color:"#92400e"}}>
                    <Edit3 style={{width:13,height:13}}/> Edit
                  </button>}
                  {!selected.is_system&&isAdmin&&<button onClick={()=>deleteDoc(selected)}
                    style={{padding:"7px 10px",background:"#fee2e2",border:"1px solid #fecaca",borderRadius:7,cursor:"pointer",color:"#dc2626",lineHeight:0}}>
                    <Trash2 style={{width:13,height:13}}/>
                  </button>}
                </div>
              </div>

              {/* HTML preview */}
              {(selected.html||selected.template_html) ? (
                <div style={{flex:1,overflowY:"auto",padding:"20px",background:"#f9fafb"}}>
                  <div style={{maxWidth:800,margin:"0 auto",background:"#fff",borderRadius:10,boxShadow:"0 4px 20px rgba(0,0,0,0.08)",padding:"24px 32px"}}>
                    <style>{DOC_PRINT_CSS}</style>
                    <div dangerouslySetInnerHTML={{__html:selected.html||selected.template_html||""}}/>
                  </div>
                </div>
              ) : selected.file_data ? (
                <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
                  {selected.file_type?.startsWith("image/")
                    ? <img src={selected.file_data} alt={selected.name} style={{maxWidth:"100%",maxHeight:"100%",borderRadius:8,boxShadow:"0 4px 20px rgba(0,0,0,0.1)"}}/>
                    : <div style={{textAlign:"center" as const,color:"#6b7280"}}>
                        <FileText style={{width:48,height:48,color:"#d1d5db",margin:"0 auto 12px"}}/>
                        <div style={{fontSize:14,fontWeight:600}}>{selected.name}</div>
                        <div style={{fontSize:12,color:"#9ca3af",marginTop:4}}>{selected.file_type}</div>
                        <button onClick={()=>downloadDoc(selected)} style={{marginTop:14,display:"inline-flex",alignItems:"center",gap:6,padding:"9px 18px",background:"#1a3a6b",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:13,fontWeight:700}}>
                          <Download style={{width:14,height:14}}/> Download File
                        </button>
                      </div>
                  }
                </div>
              ) : (
                <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:"#9ca3af",fontSize:13}}>No preview available</div>
              )}

              {/* Footer */}
              <div style={{padding:"6px 18px",borderTop:"1px solid #f3f4f6",background:"#f9fafb",fontSize:10,color:"#9ca3af",display:"flex",justifyContent:"space-between"}}>
                <span>Embu Level 5 Hospital · EL5 MediProcure</span>
                <span>{selected.is_system?"System template":"Uploaded "}{selected.created_at&&new Date(selected.created_at).toLocaleDateString("en-KE")}</span>
              </div>
            </>
          ) : (
            <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14,color:"#9ca3af",padding:32}}>
              <div style={{width:64,height:64,borderRadius:16,background:"#f3f4f6",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <FileText style={{width:28,height:28,color:"#d1d5db"}}/>
              </div>
              <div style={{textAlign:"center" as const}}>
                <div style={{fontSize:15,fontWeight:700,color:"#374151"}}>Select a document</div>
                <div style={{fontSize:12,color:"#9ca3af",marginTop:4}}>Choose from the list to preview, print, or edit</div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,width:"100%",maxWidth:400}}>
                {SYSTEM_TEMPLATES.slice(0,4).map(t=>(
                  <button key={t.id} onClick={()=>setSelected(t)}
                    style={{padding:"10px 14px",background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,color:"#374151",textAlign:"left" as const,transition:"all 0.12s"}}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#eff6ff"}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="#f9fafb"}>
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── EDIT MODAL ── */}
      {editModal&&editDoc&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:12,width:"min(900px,100%)",height:"min(90vh,700px)",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            {/* Modal header */}
            <div style={{padding:"12px 16px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",borderRadius:"12px 12px 0 0",display:"flex",alignItems:"center",gap:8}}>
              <Edit3 style={{width:14,height:14,color:"#fff"}}/>
              <span style={{fontSize:14,fontWeight:700,color:"#fff",flex:1}}>Edit Document: {editDoc.name}</span>
              {editDoc.is_system&&<span style={{fontSize:10,fontWeight:700,background:"#fef3c7",color:"#92400e",padding:"2px 8px",borderRadius:4}}>SYSTEM TEMPLATE</span>}
              <button onClick={()=>setEditModal(false)} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:6,padding:"4px 6px",cursor:"pointer",color:"#fff",lineHeight:0}}>
                <X style={{width:13,height:13}}/>
              </button>
            </div>

            {/* Tabs */}
            <div style={{display:"flex",borderBottom:"1px solid #e5e7eb",background:"#f9fafb"}}>
              {([["metadata","Details"],["html","HTML Editor"],["preview","Preview"],["sigs","Signatures"]] as const).map(([id,lbl])=>(
                <button key={id} onClick={()=>setEditTab(id as any)}
                  style={{padding:"10px 18px",border:"none",background:"transparent",cursor:"pointer",fontSize:12,fontWeight:editTab===id?700:500,color:editTab===id?"#1a3a6b":"#6b7280",borderBottom:editTab===id?"2px solid #1a3a6b":"2px solid transparent",transition:"all 0.1s"}}>
                  {lbl}
                </button>
              ))}
            </div>

            {/* Content */}
            <div style={{flex:1,overflowY:"auto",padding:16}}>
              {editTab==="metadata"&&(
                <div style={{display:"grid",gap:12}}>
                  <div>
                    <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>Document Name</label>
                    <input value={editDoc.name} onChange={e=>setEditDoc((p:any)=>({...p,name:e.target.value}))}
                      style={{width:"100%",padding:"9px 12px",fontSize:13,border:"1px solid #e5e7eb",borderRadius:7,outline:"none"}}/>
                  </div>
                  <div>
                    <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>Description</label>
                    <textarea value={editDoc.description} onChange={e=>setEditDoc((p:any)=>({...p,description:e.target.value}))} rows={3}
                      style={{width:"100%",padding:"9px 12px",fontSize:13,border:"1px solid #e5e7eb",borderRadius:7,outline:"none",fontFamily:"inherit",resize:"none"}}/>
                  </div>
                  <div>
                    <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>Category</label>
                    <select value={editDoc.category} onChange={e=>setEditDoc((p:any)=>({...p,category:e.target.value}))}
                      style={{width:"100%",padding:"9px 12px",fontSize:13,border:"1px solid #e5e7eb",borderRadius:7,outline:"none"}}>
                      {["general","policy","template","contract","report","letter","form","procedure","system"].map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div style={{padding:"10px 14px",background:"#fffbeb",border:"1px solid #fde68a",borderRadius:8,fontSize:12,color:"#92400e"}}>
                    <strong>Available placeholders:</strong> {PLACEHOLDERS.slice(0,12).join(", ")}... and {PLACEHOLDERS.length-12} more
                  </div>
                </div>
              )}

              {editTab==="html"&&(
                <div style={{display:"flex",flexDirection:"column" as const,gap:10,height:"100%"}}>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap" as const}}>
                    <span style={{fontSize:11,color:"#6b7280",fontWeight:600,alignSelf:"center"}}>Insert:</span>
                    {PLACEHOLDERS.slice(0,16).map(ph=>(
                      <button key={ph} onClick={()=>setEditDoc((p:any)=>({...p,html:p.html+ph}))}
                        style={{padding:"3px 8px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:4,cursor:"pointer",fontSize:10,fontFamily:"monospace",color:"#374151"}}>
                        {ph}
                      </button>
                    ))}
                  </div>
                  <textarea value={editDoc.html} onChange={e=>setEditDoc((p:any)=>({...p,html:e.target.value}))}
                    style={{flex:1,minHeight:300,width:"100%",padding:"10px",fontSize:11,border:"1px solid #e5e7eb",borderRadius:7,outline:"none",fontFamily:"monospace",lineHeight:1.6,resize:"vertical" as const}}
                    placeholder="Paste or write HTML template here..."/>
                </div>
              )}

              {editTab==="preview"&&(
                <div style={{background:"#f9fafb",borderRadius:8,padding:24}}>
                  <div style={{maxWidth:720,margin:"0 auto",background:"#fff",borderRadius:10,boxShadow:"0 2px 12px rgba(0,0,0,0.08)",padding:"24px 32px"}}>
                    <style>{DOC_PRINT_CSS}</style>
                    {editDoc.html
                      ?<div dangerouslySetInnerHTML={{__html:editDoc.html}}/>
                      :<div style={{textAlign:"center" as const,color:"#9ca3af",padding:40,fontSize:13}}>No HTML content to preview</div>
                    }
                  </div>
                </div>
              )}

              {editTab==="sigs"&&(
                <div style={{display:"grid",gap:16}}>
                  <div style={{padding:"10px 14px",background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:8,fontSize:12,color:"#1d4ed8"}}>
                    Use <strong>{"{{SIG_AUTHORIZED}}"}</strong>, <strong>{"{{SIG_APPROVED}}"}</strong>, <strong>{"{{SIG_SUPPLIER}}"}</strong>, <strong>{"{{SIG_RECEIVED}}"}</strong> placeholders in your HTML template to insert signature fields.
                  </div>
                  {["AUTHORIZED","APPROVED","SUPPLIER","RECEIVED","INSPECTED","STORE","PREPARED","VERIFIED","HOD","PROCUREMENT"].map(role=>(
                    <div key={role} style={{padding:"10px 14px",background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:8,display:"flex",alignItems:"center",gap:12}}>
                      <div style={{width:40,height:40,borderRadius:6,border:"2px dashed #d1d5db",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <Pen style={{width:16,height:16,color:"#9ca3af"}}/>
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:700,color:"#111827"}}>{role.charAt(0)+role.slice(1).toLowerCase().replace(/_/g," ")}</div>
                        <div style={{fontSize:11,color:"#9ca3af",fontFamily:"monospace"}}>{"{{SIG_"+role+"}}"}</div>
                      </div>
                      <label style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:600,color:"#374151"}}>
                        <Upload style={{width:11,height:11}}/> Upload Sig
                        <input type="file" accept="image/*" style={{display:"none"}}/>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div style={{padding:"10px 16px",borderTop:"1px solid #f3f4f6",display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
              <button onClick={saveDoc} disabled={saving}
                style={{display:"flex",alignItems:"center",gap:6,padding:"9px 20px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",color:"#fff",border:"none",borderRadius:7,cursor:saving?"not-allowed":"pointer",fontSize:13,fontWeight:700,opacity:saving?0.8:1}}>
                {saving?<RefreshCw style={{width:13,height:13,animation:"spin 1s linear infinite"}}/>:<Save style={{width:13,height:13}}/>} Save Document
              </button>
              {(editDoc.html)&&<button onClick={()=>printDoc(editDoc.html,editDoc.name)}
                style={{display:"flex",alignItems:"center",gap:6,padding:"9px 16px",background:"#107c10",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:13,fontWeight:700}}>
                <Printer style={{width:13,height:13}}/> Print
              </button>}
              <button onClick={()=>setEditModal(false)} style={{padding:"9px 16px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:7,cursor:"pointer",fontSize:13,color:"#374151"}}>Cancel</button>
              {editDoc.is_system&&<span style={{marginLeft:4,fontSize:11,color:"#9ca3af"}}>Saving creates a custom copy of this system template</span>}
            </div>
          </div>
        </div>
      )}

      {/* ── UPLOAD MODAL ── */}
      {uploadModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:12,width:"min(580px,100%)",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,0.25)"}}>
            <div style={{padding:"12px 16px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",borderRadius:"12px 12px 0 0",display:"flex",alignItems:"center",gap:8}}>
              <Upload style={{width:14,height:14,color:"#fff"}}/>
              <span style={{fontSize:14,fontWeight:700,color:"#fff",flex:1}}>Upload Document</span>
              <button onClick={()=>setUploadModal(false)} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:6,padding:"4px 6px",cursor:"pointer",color:"#fff",lineHeight:0}}><X style={{width:13,height:13}}/></button>
            </div>
            <div style={{padding:16,display:"flex",flexDirection:"column" as const,gap:12}}>
              {[{l:"Document Name",k:"upName",v:upName,s:(v:string)=>setUpName(v)},{l:"Description",k:"upDesc",v:upDesc,s:(v:string)=>setUpDesc(v)}].map(f=>(
                <div key={f.k}>
                  <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>{f.l}</label>
                  <input value={f.v} onChange={e=>f.s(e.target.value)} style={{width:"100%",padding:"8px 12px",fontSize:13,border:"1px solid #e5e7eb",borderRadius:6,outline:"none"}}/>
                </div>
              ))}
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>Category</label>
                <select value={upCat} onChange={e=>setUpCat(e.target.value)} style={{width:"100%",padding:"8px 12px",fontSize:13,border:"1px solid #e5e7eb",borderRadius:6,outline:"none"}}>
                  {["general","policy","template","contract","report","letter","form","procedure"].map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>File (PDF, Word, Image...)</label>
                <label style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"#f9fafb",border:"2px dashed #e5e7eb",borderRadius:8,cursor:"pointer"}}>
                  <Upload style={{width:16,height:16,color:"#9ca3af"}}/>
                  <span style={{fontSize:12,color:upFile?"#374151":"#9ca3af"}}>{upFile?upFile.name:"Click to choose file..."}</span>
                  <input type="file" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f){setUpFile(f);if(!upName)setUpName(f.name.replace(/\.[^/.]+$/,""));}}}/>
                </label>
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>Or Paste HTML Content</label>
                <textarea value={upHtml} onChange={e=>setUpHtml(e.target.value)} rows={4} placeholder="Optional: paste HTML template content..."
                  style={{width:"100%",padding:"8px 12px",fontSize:11,border:"1px solid #e5e7eb",borderRadius:6,outline:"none",fontFamily:"monospace",resize:"none" as const}}/>
              </div>
            </div>
            <div style={{padding:"10px 16px",borderTop:"1px solid #f3f4f6",display:"flex",gap:8}}>
              <button onClick={uploadFile} disabled={saving} style={{display:"flex",alignItems:"center",gap:6,padding:"9px 20px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:13,fontWeight:700}}>
                {saving?<RefreshCw style={{width:13,height:13,animation:"spin 1s linear infinite"}}/>:<Upload style={{width:13,height:13}}/>} Upload
              </button>
              <button onClick={()=>setUploadModal(false)} style={{padding:"9px 16px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:7,cursor:"pointer",fontSize:13,color:"#374151"}}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
