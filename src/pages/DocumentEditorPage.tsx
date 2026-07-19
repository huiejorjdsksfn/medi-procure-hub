/**
 * EL5 MediProcure — Document Studio v14
 * Full document writer + template library + live report generator + form filler
 * Tabs: Writer | Templates | Reports | Forms | Library
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { addLetterhead, addFooter } from "@/lib/printDocument";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const db = supabase as any;
const NOW = () => new Date().toLocaleDateString("en-KE", { day: "2-digit", month: "long", year: "numeric" });
const FMT_KES = (v: number) => `KES ${(v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;
const FMT_DT  = (s: string) => s ? new Date(s).toLocaleDateString("en-KE") : "";

/* ═══════════════════════ DESIGN TOKENS ═══════════════════════════════ */
const C = {
  blue:   "#1a3a6b", blue2: "#2563eb", blue3: "#dbeafe",
  green:  "#166534", green3:"#dcfce7",
  red:    "#991b1b", red3:  "#fee2e2",
  gray:   "#374151", gray2: "#6b7280", gray3:"#f3f4f6", gray4:"#e5e7eb",
  white:  "#ffffff", border:"#d1d5db",
  toolbar:"#f8fafc", ribbon:"#1e3a5f",
};
const S = {
  btn: (active=false,color="blue"): React.CSSProperties => ({
    padding:"3px 8px", border:`1px solid ${C.border}`, borderRadius:3, cursor:"pointer",
    background: active ? C.blue3 : C.white, color: active ? C.blue2 : C.gray,
    fontSize:11, fontFamily:"Segoe UI,Tahoma,sans-serif", display:"flex",
    alignItems:"center", gap:4, whiteSpace:"nowrap" as const,
  }),
  inp: { padding:"3px 6px", border:`1px solid ${C.border}`, borderRadius:3, fontSize:11,
         fontFamily:"Segoe UI,Tahoma,sans-serif", background:C.white } as React.CSSProperties,
  th: { background:C.blue, color:"#fff", padding:"4px 8px", fontSize:10,
        textAlign:"left" as const, fontWeight:700, whiteSpace:"nowrap" as const },
  td: { padding:"3px 8px", fontSize:11, borderBottom:`1px solid ${C.gray4}` } as React.CSSProperties,
};

/* ═══════════════════════ TOOLBAR BUTTON DEF ══════════════════════════ */
type TBDef = {
  id: string; label: string; icon: string; group: string;
  action?: string; value?: string; type?: string; options?: string[];
};
const DEFAULT_TOOLBAR: TBDef[] = [
  // Text formatting
  { id:"bold",       label:"Bold",          icon:"B",    group:"fmt",  action:"bold"              },
  { id:"italic",     label:"Italic",        icon:"I",    group:"fmt",  action:"italic"             },
  { id:"underline",  label:"Underline",     icon:"U",    group:"fmt",  action:"underline"          },
  { id:"strike",     label:"Strikethrough", icon:"S̶",   group:"fmt",  action:"strikeThrough"     },
  // Alignment
  { id:"left",       label:"Align Left",    icon:"⬅",  group:"align", action:"justifyLeft"       },
  { id:"center",     label:"Centre",        icon:"↔",   group:"align", action:"justifyCenter"     },
  { id:"right",      label:"Align Right",   icon:"➡",  group:"align", action:"justifyRight"      },
  { id:"justify",    label:"Justify",       icon:"≡",   group:"align", action:"justifyFull"       },
  // Lists
  { id:"ulst",       label:"Bullet List",   icon:"•≡",  group:"list",  action:"insertUnorderedList"},
  { id:"olst",       label:"Numbered List", icon:"1≡",  group:"list",  action:"insertOrderedList" },
  { id:"indent",     label:"Indent",        icon:"→≡",  group:"list",  action:"indent"             },
  { id:"outdent",    label:"Outdent",       icon:"←≡",  group:"list",  action:"outdent"            },
  // Heading
  { id:"h1",  label:"Heading 1", icon:"H1", group:"head", action:"formatBlock", value:"h1" },
  { id:"h2",  label:"Heading 2", icon:"H2", group:"head", action:"formatBlock", value:"h2" },
  { id:"h3",  label:"Heading 3", icon:"H3", group:"head", action:"formatBlock", value:"h3" },
  { id:"p",   label:"Paragraph", icon:"¶",  group:"head", action:"formatBlock", value:"p"  },
  // Insert
  { id:"hr",  label:"Horizontal Rule", icon:"─", group:"ins", action:"insertHorizontalRule" },
  { id:"link",label:"Insert Link",     icon:"🔗", group:"ins", type:"link" },
  { id:"img", label:"Insert Image URL",icon:"🖼", group:"ins", type:"img"  },
  { id:"tbl", label:"Insert Table",    icon:"⊞", group:"ins", type:"table"},
  // Edit
  { id:"undo",  label:"Undo",  icon:"↩", group:"edit", action:"undo"  },
  { id:"redo",  label:"Redo",  icon:"↪", group:"edit", action:"redo"  },
  { id:"clear", label:"Clear Formatting", icon:"✕fmt", group:"edit", action:"removeFormat" },
  // Colors
  { id:"fgcol", label:"Text Colour",       icon:"A🎨", group:"color", type:"foreColor" },
  { id:"bgcol", label:"Highlight Colour",  icon:"🖊🎨", group:"color", type:"backColor"  },
];

/* ═══════════════════════ TEMPLATE DEFINITIONS ════════════════════════ */
const TEMPLATES = [
  {
    id:"memo",      cat:"Official",      icon:"📋",
    name:"Internal Memorandum",
    desc:"Standard EL5H internal memo with TO/FROM/SUBJECT fields",
    body:`<div style="font-family:Times New Roman,serif;font-size:12pt;line-height:1.7;padding:24px 32px">
<div style="text-align:center;border-bottom:2px solid #1a3a6b;padding-bottom:12px;margin-bottom:20px">
  <div style="font-size:8pt;color:#555">REPUBLIC OF KENYA · COUNTY GOVERNMENT OF EMBU</div>
  <div style="font-size:15pt;font-weight:bold;color:#1a3a6b;margin:4px 0">EMBU LEVEL 5 HOSPITAL</div>
  <div style="font-size:13pt;font-weight:bold;margin:6px 0">INTERNAL MEMORANDUM</div>
</div>
<table style="width:100%;border-collapse:collapse;margin-bottom:20px">
  <tr><td style="width:130px;font-weight:bold;padding:4px 0">TO:</td><td style="border-bottom:1px solid #ccc;padding:4px 10px;min-width:300px">&nbsp;</td></tr>
  <tr><td style="font-weight:bold;padding:4px 0">FROM:</td><td style="border-bottom:1px solid #ccc;padding:4px 10px">&nbsp;</td></tr>
  <tr><td style="font-weight:bold;padding:4px 0">DATE:</td><td style="border-bottom:1px solid #ccc;padding:4px 10px">${NOW()}</td></tr>
  <tr><td style="font-weight:bold;padding:4px 0">REF NO:</td><td style="border-bottom:1px solid #ccc;padding:4px 10px">&nbsp;</td></tr>
  <tr><td style="font-weight:bold;padding:4px 0">SUBJECT:</td><td style="border-bottom:1px solid #ccc;padding:4px 10px;font-weight:bold">&nbsp;</td></tr>
</table>
<p style="margin:12px 0">Dear Sir / Madam,</p>
<p style="margin:12px 0">&nbsp;</p>
<p style="margin:12px 0">&nbsp;</p>
<p style="margin:12px 0">&nbsp;</p>
<div style="margin-top:40px;display:flex;justify-content:space-between">
  <div><div style="border-top:1px solid #333;width:200px;padding-top:4px">Signature &amp; Name</div></div>
  <div><div style="border-top:1px solid #333;width:200px;padding-top:4px">Designation &amp; Date</div></div>
</div></div>`,
  },
  {
    id:"letter",    cat:"Official",      icon:"✉",
    name:"Official Letter",
    desc:"Formal letter with reference number and letterhead",
    body:`<div style="font-family:Times New Roman,serif;font-size:12pt;line-height:1.7;padding:24px 32px">
<div style="text-align:center;border-bottom:2px solid #1a3a6b;padding-bottom:12px;margin-bottom:24px">
  <div style="font-size:8pt;color:#555">REPUBLIC OF KENYA · COUNTY GOVERNMENT OF EMBU</div>
  <div style="font-size:15pt;font-weight:bold;color:#1a3a6b;margin:4px 0">EMBU LEVEL 5 HOSPITAL</div>
  <div style="font-size:7pt;color:#666">P.O. Box 33 – 60100, Embu | Tel: +254 68 31055 | pghembu@gmail.com</div>
</div>
<div style="margin-bottom:16px">
  <div>Ref: <strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</strong></div>
  <div style="margin-top:8px">Date: <strong>${NOW()}</strong></div>
</div>
<div style="margin-bottom:20px">
  <div>&nbsp;</div><div>&nbsp;</div>
  <div>Dear Sir / Madam,</div>
</div>
<div style="text-align:center;font-weight:bold;text-decoration:underline;margin-bottom:16px">RE: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
<p style="margin:12px 0">&nbsp;</p><p style="margin:12px 0">&nbsp;</p><p style="margin:12px 0">&nbsp;</p>
<p style="margin:16px 0">Yours faithfully,</p>
<div style="margin-top:40px">
  <div style="border-top:1px solid #333;width:220px;padding-top:4px">
    <strong>&nbsp;</strong><br/>Hospital Director<br/>Embu Level 5 Hospital
  </div>
</div></div>`,
  },
  {
    id:"minutes",   cat:"Official",      icon:"📝",
    name:"Minutes of Meeting",
    desc:"Formal meeting minutes with agenda, attendees and resolutions",
    body:`<div style="font-family:Times New Roman,serif;font-size:12pt;line-height:1.7;padding:24px 32px">
<div style="text-align:center;border-bottom:2px solid #1a3a6b;padding-bottom:12px;margin-bottom:20px">
  <div style="font-size:8pt;color:#555">EMBU LEVEL 5 HOSPITAL</div>
  <div style="font-size:14pt;font-weight:bold;color:#1a3a6b">MINUTES OF MEETING</div>
  <div style="font-size:11pt;font-weight:bold">&nbsp;</div>
</div>
<table style="width:100%;border-collapse:collapse;margin-bottom:16px">
  <tr><td style="width:150px;font-weight:bold;padding:3px 0">Meeting Type:</td><td style="border-bottom:1px solid #ddd;padding:3px 8px">&nbsp;</td></tr>
  <tr><td style="font-weight:bold;padding:3px 0">Date &amp; Time:</td><td style="border-bottom:1px solid #ddd;padding:3px 8px">${NOW()}, &nbsp;&nbsp;&nbsp;hrs</td></tr>
  <tr><td style="font-weight:bold;padding:3px 0">Venue:</td><td style="border-bottom:1px solid #ddd;padding:3px 8px">&nbsp;</td></tr>
  <tr><td style="font-weight:bold;padding:3px 0">Chaired by:</td><td style="border-bottom:1px solid #ddd;padding:3px 8px">&nbsp;</td></tr>
  <tr><td style="font-weight:bold;padding:3px 0">Minutes by:</td><td style="border-bottom:1px solid #ddd;padding:3px 8px">&nbsp;</td></tr>
</table>
<div style="font-weight:bold;font-size:12pt;border-bottom:1px solid #1a3a6b;margin-bottom:8px">ATTENDEES</div>
<table style="width:100%;border-collapse:collapse;margin-bottom:16px">
  <tr style="background:#1a3a6b;color:#fff"><th style="padding:5px 8px;border:1px solid #ccc">#</th><th style="padding:5px 8px;border:1px solid #ccc">Name</th><th style="padding:5px 8px;border:1px solid #ccc">Department</th><th style="padding:5px 8px;border:1px solid #ccc">Sign</th></tr>
  <tr><td style="border:1px solid #ddd;padding:5px 8px">1</td><td style="border:1px solid #ddd;padding:5px 8px">&nbsp;</td><td style="border:1px solid #ddd;padding:5px 8px">&nbsp;</td><td style="border:1px solid #ddd;padding:5px 8px">&nbsp;</td></tr>
  <tr><td style="border:1px solid #ddd;padding:5px 8px">2</td><td style="border:1px solid #ddd;padding:5px 8px">&nbsp;</td><td style="border:1px solid #ddd;padding:5px 8px">&nbsp;</td><td style="border:1px solid #ddd;padding:5px 8px">&nbsp;</td></tr>
  <tr><td style="border:1px solid #ddd;padding:5px 8px">3</td><td style="border:1px solid #ddd;padding:5px 8px">&nbsp;</td><td style="border:1px solid #ddd;padding:5px 8px">&nbsp;</td><td style="border:1px solid #ddd;padding:5px 8px">&nbsp;</td></tr>
</table>
<div style="font-weight:bold;font-size:12pt;border-bottom:1px solid #1a3a6b;margin-bottom:8px">AGENDA &amp; DISCUSSIONS</div>
<div style="margin-bottom:8px"><strong>1. Opening Prayer / Preliminaries</strong><br/>&nbsp;</div>
<div style="margin-bottom:8px"><strong>2. Confirmation of Previous Minutes</strong><br/>&nbsp;</div>
<div style="margin-bottom:8px"><strong>3. Agenda Item:</strong><br/>&nbsp;</div>
<div style="margin-bottom:8px"><strong>4. AOB</strong><br/>&nbsp;</div>
<div style="font-weight:bold;font-size:12pt;border-bottom:1px solid #1a3a6b;margin:16px 0 8px">ACTION ITEMS</div>
<table style="width:100%;border-collapse:collapse;margin-bottom:16px">
  <tr style="background:#1a3a6b;color:#fff"><th style="padding:5px 8px;border:1px solid #ccc">#</th><th style="padding:5px 8px;border:1px solid #ccc">Action</th><th style="padding:5px 8px;border:1px solid #ccc">Responsible</th><th style="padding:5px 8px;border:1px solid #ccc">Deadline</th></tr>
  <tr><td style="border:1px solid #ddd;padding:5px 8px">1</td><td style="border:1px solid #ddd;padding:5px 8px">&nbsp;</td><td style="border:1px solid #ddd;padding:5px 8px">&nbsp;</td><td style="border:1px solid #ddd;padding:5px 8px">&nbsp;</td></tr>
</table>
<div style="display:flex;justify-content:space-between;margin-top:30px">
  <div><div style="border-top:1px solid #333;width:200px;padding-top:4px">Chairperson</div></div>
  <div><div style="border-top:1px solid #333;width:200px;padding-top:4px">Secretary / Date</div></div>
</div></div>`,
  },
  {
    id:"lpo",       cat:"Procurement",   icon:"🛒",
    name:"Local Purchase Order (LPO)",
    desc:"Formal LPO issued to supplier with item table and approval",
    body:`<div style="font-family:Times New Roman,serif;font-size:11pt;line-height:1.5;padding:20px 28px">
<div style="text-align:center;border-bottom:2px solid #1a3a6b;padding-bottom:10px;margin-bottom:14px">
  <div style="font-size:8pt;color:#555">COUNTY GOVERNMENT OF EMBU — DEPARTMENT OF HEALTH</div>
  <div style="font-size:14pt;font-weight:bold;color:#1a3a6b">EMBU LEVEL 5 HOSPITAL</div>
  <div style="font-size:13pt;font-weight:bold;margin-top:4px">LOCAL PURCHASE ORDER</div>
  <div style="font-size:10pt">LPO No: ______________ &nbsp;|&nbsp; Date: ${NOW()}</div>
</div>
<table style="width:100%;margin-bottom:12px">
  <tr><td style="width:50%"><strong>TO (Supplier):</strong><br/>&nbsp;<br/>_________________________</td><td><strong>From:</strong><br/>Procurement Dept, EL5 Hospital<br/>P.O. Box 33 – 60100 Embu</td></tr>
  <tr><td style="padding-top:6px"><strong>KRA PIN:</strong> ___________________</td><td style="padding-top:6px"><strong>Delivery to:</strong> Main Stores, EL5H</td></tr>
  <tr><td><strong>Quotation Ref:</strong> ___________</td><td><strong>Payment Terms:</strong> Net 30 days</td></tr>
  <tr><td><strong>Delivery Date:</strong> ___________</td><td><strong>Vote Head:</strong> _______________</td></tr>
</table>
<table style="width:100%;border-collapse:collapse;margin-bottom:14px">
  <tr style="background:#1a3a6b;color:#fff">
    <th style="border:1px solid #999;padding:6px;width:5%">#</th>
    <th style="border:1px solid #999;padding:6px;width:38%">Item Description</th>
    <th style="border:1px solid #999;padding:6px;width:8%">UoM</th>
    <th style="border:1px solid #999;padding:6px;width:9%">Qty</th>
    <th style="border:1px solid #999;padding:6px;width:18%">Unit Price (KES)</th>
    <th style="border:1px solid #999;padding:6px;width:18%">Amount (KES)</th>
  </tr>
  <tr><td style="border:1px solid #ddd;padding:6px">1</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td></tr>
  <tr><td style="border:1px solid #ddd;padding:6px">2</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td></tr>
  <tr><td style="border:1px solid #ddd;padding:6px">3</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td></tr>
  <tr><td style="border:1px solid #ddd;padding:6px" colspan="5" style="text-align:right;font-weight:bold">Sub-Total</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td></tr>
  <tr><td style="border:1px solid #ddd;padding:6px" colspan="5" style="text-align:right;font-weight:bold">VAT (16%)</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td></tr>
  <tr style="background:#f0f4ff"><td style="border:1px solid #ddd;padding:6px" colspan="5" style="text-align:right;font-weight:bold">TOTAL (KES)</td><td style="border:1px solid #ddd;padding:6px;font-weight:bold">&nbsp;</td></tr>
</table>
<div style="font-size:10pt;margin-bottom:12px"><strong>Terms &amp; Conditions:</strong> Delivery must be within 14 days. Goods must meet specified standards. All deliveries must be accompanied by a delivery note and invoice. EL5H reserves the right to reject substandard goods.</div>
<div style="display:flex;justify-content:space-between;margin-top:24px;gap:20px">
  <div style="flex:1"><div style="border-top:1px solid #333;padding-top:4px"><strong>Procurement Officer</strong><br/>Name: _______________<br/>Sign: _______________<br/>Date: _______________</div></div>
  <div style="flex:1"><div style="border-top:1px solid #333;padding-top:4px"><strong>Procurement Manager</strong><br/>Name: _______________<br/>Sign: _______________<br/>Date: _______________</div></div>
  <div style="flex:1"><div style="border-top:1px solid #333;padding-top:4px"><strong>CEO / Hospital Director</strong><br/>Name: _______________<br/>Sign: _______________<br/>Date: _______________</div></div>
</div></div>`,
  },
  {
    id:"grn",       cat:"Procurement",   icon:"📦",
    name:"Goods Received Note (GRN)",
    desc:"GRN for stores — recording received quantities and condition",
    body:`<div style="font-family:Times New Roman,serif;font-size:11pt;line-height:1.5;padding:20px 28px">
<div style="text-align:center;border-bottom:2px solid #0e6655;padding-bottom:10px;margin-bottom:14px">
  <div style="font-size:8pt;color:#555">EMBU LEVEL 5 HOSPITAL — STORES DEPARTMENT</div>
  <div style="font-size:14pt;font-weight:bold;color:#0e6655">GOODS RECEIVED NOTE</div>
  <div>GRN No: ______________ &nbsp;|&nbsp; Date: ${NOW()}</div>
</div>
<table style="width:100%;margin-bottom:12px">
  <tr><td><strong>LPO Reference:</strong> ____________</td><td><strong>Supplier:</strong> ____________</td></tr>
  <tr><td><strong>Delivery Note No:</strong> ____________</td><td><strong>Invoice No:</strong> ____________</td></tr>
  <tr><td><strong>Delivery Vehicle:</strong> ____________</td><td><strong>Driver Name:</strong> ____________</td></tr>
</table>
<table style="width:100%;border-collapse:collapse;margin-bottom:12px">
  <tr style="background:#0e6655;color:#fff">
    <th style="border:1px solid #999;padding:6px">#</th><th style="border:1px solid #999;padding:6px">Item Description</th>
    <th style="border:1px solid #999;padding:6px">UoM</th><th style="border:1px solid #999;padding:6px">Qty Ordered</th>
    <th style="border:1px solid #999;padding:6px">Qty Received</th><th style="border:1px solid #999;padding:6px">Condition</th><th style="border:1px solid #999;padding:6px">Remarks</th>
  </tr>
  <tr><td style="border:1px solid #ddd;padding:6px">1</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">Good/Damaged</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td></tr>
  <tr><td style="border:1px solid #ddd;padding:6px">2</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">Good/Damaged</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td></tr>
</table>
<div style="margin-bottom:8px"><strong>General condition of delivery:</strong> ___________________________</div>
<div style="margin-bottom:8px"><strong>Storage location:</strong> ___________________________</div>
<div style="display:flex;justify-content:space-between;margin-top:24px;gap:20px">
  <div style="flex:1"><div style="border-top:1px solid #333;padding-top:4px"><strong>Storekeeper</strong><br/>Name: ___<br/>Sign: ___<br/>Date: ___</div></div>
  <div style="flex:1"><div style="border-top:1px solid #333;padding-top:4px"><strong>I&amp;A Committee</strong><br/>Name: ___<br/>Sign: ___<br/>Date: ___</div></div>
  <div style="flex:1"><div style="border-top:1px solid #333;padding-top:4px"><strong>Supplier's Rep</strong><br/>Name: ___<br/>Sign: ___<br/>Date: ___</div></div>
</div></div>`,
  },
  {
    id:"rfq",       cat:"Procurement",   icon:"📊",
    name:"Request for Quotation (RFQ)",
    desc:"Formal RFQ sent to suppliers to request pricing",
    body:`<div style="font-family:Times New Roman,serif;font-size:11pt;line-height:1.5;padding:20px 28px">
<div style="text-align:center;border-bottom:2px solid #1a3a6b;padding-bottom:10px;margin-bottom:14px">
  <div style="font-size:8pt;color:#555">EMBU LEVEL 5 HOSPITAL — PROCUREMENT DEPARTMENT</div>
  <div style="font-size:14pt;font-weight:bold;color:#1a3a6b">REQUEST FOR QUOTATION (RFQ)</div>
  <div>RFQ No: ______________ &nbsp;|&nbsp; Date: ${NOW()} &nbsp;|&nbsp; Closing: ______________</div>
</div>
<p>Dear Sir/Madam, you are invited to submit your best quotation for the following items:</p>
<table style="width:100%;border-collapse:collapse;margin:12px 0">
  <tr style="background:#1a3a6b;color:#fff">
    <th style="border:1px solid #999;padding:6px">#</th><th style="border:1px solid #999;padding:6px">Description</th>
    <th style="border:1px solid #999;padding:6px">UoM</th><th style="border:1px solid #999;padding:6px">Qty</th>
    <th style="border:1px solid #999;padding:6px">Unit Price (KES)</th><th style="border:1px solid #999;padding:6px">Total (KES)</th>
  </tr>
  <tr><td style="border:1px solid #ddd;padding:6px">1</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td></tr>
  <tr><td style="border:1px solid #ddd;padding:6px">2</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td></tr>
</table>
<p><strong>Instructions:</strong> Quote inclusive of all taxes. Attach certified copy of KRA PIN, CR12, and Business Registration. Delivery within 14 days. Validity: 90 days from closing date.</p>
<div style="display:flex;justify-content:space-between;margin-top:24px">
  <div><div style="border-top:1px solid #333;width:200px;padding-top:4px">Procurement Officer</div></div>
  <div><div style="border-top:1px solid #333;width:200px;padding-top:4px">Procurement Manager</div></div>
</div></div>`,
  },
  {
    id:"s11",       cat:"Government Forms", icon:"🏛",
    name:"Stores Issue / Receipt Voucher (Form S 11)",
    desc:"Kenya Government standard stores movement voucher",
    body:`<div style="font-family:Times New Roman,serif;font-size:11pt;line-height:1.5;padding:20px 28px">
<div style="text-align:center;border-bottom:2px solid #6c3483;padding-bottom:10px;margin-bottom:14px">
  <div style="font-size:9pt;font-weight:bold">REPUBLIC OF KENYA · COUNTY GOVERNMENT OF EMBU</div>
  <div style="font-size:13pt;font-weight:bold;color:#6c3483;margin:4px 0">STORES ISSUE / RECEIPT VOUCHER</div>
  <div style="font-size:10pt;font-weight:bold">Form S 11</div>
  <div>Voucher No: ______________ &nbsp;|&nbsp; Date: ${NOW()}</div>
</div>
<table style="width:100%;margin-bottom:12px">
  <tr><td style="width:50%"><strong>Issuing Store:</strong> ____________________</td><td><strong>Vote / Account No:</strong> ____________________</td></tr>
  <tr><td style="padding-top:4px"><strong>Receiving Dept:</strong> ____________________</td><td style="padding-top:4px"><strong>Requisition Ref:</strong> ____________________</td></tr>
  <tr><td><strong>Receiving Officer:</strong> ____________________</td><td><strong>LPO Ref (if applicable):</strong> ________________</td></tr>
</table>
<table style="width:100%;border-collapse:collapse;margin-bottom:12px">
  <tr style="background:#6c3483;color:#fff">
    <th style="border:1px solid #aaa;padding:5px">#</th><th style="border:1px solid #aaa;padding:5px">Stock Code</th>
    <th style="border:1px solid #aaa;padding:5px">Description</th><th style="border:1px solid #aaa;padding:5px">UoM</th>
    <th style="border:1px solid #aaa;padding:5px">Qty Demanded</th><th style="border:1px solid #aaa;padding:5px">Qty Issued</th>
    <th style="border:1px solid #aaa;padding:5px">Unit Cost (KES)</th><th style="border:1px solid #aaa;padding:5px">Total (KES)</th>
  </tr>
  <tr><td style="border:1px solid #ddd;padding:5px">1</td><td style="border:1px solid #ddd;padding:5px">&nbsp;</td><td style="border:1px solid #ddd;padding:5px">&nbsp;</td><td style="border:1px solid #ddd;padding:5px">&nbsp;</td><td style="border:1px solid #ddd;padding:5px">&nbsp;</td><td style="border:1px solid #ddd;padding:5px">&nbsp;</td><td style="border:1px solid #ddd;padding:5px">&nbsp;</td><td style="border:1px solid #ddd;padding:5px">&nbsp;</td></tr>
  <tr><td style="border:1px solid #ddd;padding:5px">2</td><td style="border:1px solid #ddd;padding:5px">&nbsp;</td><td style="border:1px solid #ddd;padding:5px">&nbsp;</td><td style="border:1px solid #ddd;padding:5px">&nbsp;</td><td style="border:1px solid #ddd;padding:5px">&nbsp;</td><td style="border:1px solid #ddd;padding:5px">&nbsp;</td><td style="border:1px solid #ddd;padding:5px">&nbsp;</td><td style="border:1px solid #ddd;padding:5px">&nbsp;</td></tr>
  <tr style="font-weight:bold"><td style="border:1px solid #ddd;padding:5px" colspan="7" style="text-align:right">TOTAL (KES)</td><td style="border:1px solid #ddd;padding:5px">&nbsp;</td></tr>
</table>
<div style="display:flex;justify-content:space-between;margin-top:24px;gap:16px">
  <div style="flex:1"><div style="border-top:1px solid #333;padding-top:4px"><strong>Issued by</strong><br/>Name: ___<br/>Sign: ___<br/>Date: ___</div></div>
  <div style="flex:1"><div style="border-top:1px solid #333;padding-top:4px"><strong>Received by</strong><br/>Name: ___<br/>Sign: ___<br/>Date: ___</div></div>
  <div style="flex:1"><div style="border-top:1px solid #333;padding-top:4px"><strong>Authorised by</strong><br/>Name: ___<br/>Sign: ___<br/>Date: ___</div></div>
</div></div>`,
  },
  {
    id:"inspection", cat:"Government Forms", icon:"🔍",
    name:"Inspection & Acceptance Report",
    desc:"I&A committee report for received goods",
    body:`<div style="font-family:Times New Roman,serif;font-size:11pt;line-height:1.5;padding:20px 28px">
<div style="text-align:center;border-bottom:2px solid #c0392b;padding-bottom:10px;margin-bottom:14px">
  <div style="font-size:8pt;color:#555">EMBU LEVEL 5 HOSPITAL · INSPECTION &amp; ACCEPTANCE COMMITTEE</div>
  <div style="font-size:14pt;font-weight:bold;color:#c0392b">INSPECTION &amp; ACCEPTANCE REPORT</div>
  <div>Report No: ______________ &nbsp;|&nbsp; Date: ${NOW()}</div>
</div>
<table style="width:100%;margin-bottom:10px">
  <tr><td><strong>LPO Ref:</strong> ____________</td><td><strong>GRN Ref:</strong> ____________</td></tr>
  <tr><td><strong>Supplier:</strong> ____________</td><td><strong>Invoice No:</strong> ____________</td></tr>
  <tr><td><strong>Delivery Date:</strong> ____________</td><td><strong>Vote Head:</strong> ____________</td></tr>
</table>
<table style="width:100%;border-collapse:collapse;margin-bottom:10px">
  <tr style="background:#c0392b;color:#fff">
    <th style="border:1px solid #aaa;padding:6px">#</th><th style="border:1px solid #aaa;padding:6px">Item</th>
    <th style="border:1px solid #aaa;padding:6px">Spec Met</th><th style="border:1px solid #aaa;padding:6px">Qty Accepted</th>
    <th style="border:1px solid #aaa;padding:6px">Qty Rejected</th><th style="border:1px solid #aaa;padding:6px">Rejection Reason</th>
  </tr>
  <tr><td style="border:1px solid #ddd;padding:6px">1</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">Yes / No</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td></tr>
  <tr><td style="border:1px solid #ddd;padding:6px">2</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">Yes / No</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td></tr>
</table>
<div style="margin-bottom:8px"><strong>Overall Recommendation:</strong> &nbsp; ☐ ACCEPTED &nbsp;&nbsp; ☐ PARTIALLY ACCEPTED &nbsp;&nbsp; ☐ REJECTED</div>
<div style="margin-bottom:8px"><strong>Remarks:</strong> ___________________________</div>
<div style="display:flex;justify-content:space-between;margin-top:24px;gap:16px">
  <div style="flex:1"><div style="border-top:1px solid #333;padding-top:4px"><strong>Chairperson I&amp;A</strong><br/>Sign: ___&nbsp; Date: ___</div></div>
  <div style="flex:1"><div style="border-top:1px solid #333;padding-top:4px"><strong>Member</strong><br/>Sign: ___&nbsp; Date: ___</div></div>
  <div style="flex:1"><div style="border-top:1px solid #333;padding-top:4px"><strong>Member</strong><br/>Sign: ___&nbsp; Date: ___</div></div>
</div></div>`,
  },
  {
    id:"pv",        cat:"Finance",       icon:"💸",
    name:"Payment Voucher",
    desc:"Accountant's payment voucher for approved expenditure",
    body:`<div style="font-family:Times New Roman,serif;font-size:11pt;line-height:1.5;padding:20px 28px">
<div style="text-align:center;border-bottom:2px solid #1a3a6b;padding-bottom:10px;margin-bottom:14px">
  <div style="font-size:8pt;color:#555">EMBU LEVEL 5 HOSPITAL · FINANCE &amp; ACCOUNTS DEPARTMENT</div>
  <div style="font-size:14pt;font-weight:bold;color:#1a3a6b">PAYMENT VOUCHER</div>
  <div>PV No: ______________ &nbsp;|&nbsp; Date: ${NOW()}</div>
</div>
<table style="width:100%;margin-bottom:12px">
  <tr><td style="width:50%"><strong>Payee:</strong> ____________________________</td><td><strong>Amount (KES):</strong> ____________________________</td></tr>
  <tr><td style="padding-top:4px"><strong>Account No / Bank:</strong> ______________</td><td style="padding-top:4px"><strong>Vote Head:</strong> ____________________________</td></tr>
  <tr><td><strong>Invoice No:</strong> ______________</td><td><strong>LPO Ref:</strong> ____________________________</td></tr>
  <tr><td><strong>GL Account:</strong> ______________</td><td><strong>Payment Method:</strong> Cheque / EFT / Cash</td></tr>
</table>
<div style="margin-bottom:12px"><strong>Particulars / Description of Expenditure:</strong><br/>___________________________________________________________________<br/>___________________________________________________________________</div>
<table style="width:100%;border-collapse:collapse;margin-bottom:12px">
  <tr style="background:#1a3a6b;color:#fff">
    <th style="border:1px solid #aaa;padding:6px">GL Code</th><th style="border:1px solid #aaa;padding:6px">Account Description</th>
    <th style="border:1px solid #aaa;padding:6px">Amount Dr (KES)</th><th style="border:1px solid #aaa;padding:6px">Amount Cr (KES)</th>
  </tr>
  <tr><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">Expenditure Account</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">—</td></tr>
  <tr><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">Accounts Payable / Bank</td><td style="border:1px solid #ddd;padding:6px">—</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td></tr>
</table>
<div style="font-weight:bold;margin-bottom:12px">Amount in Words: ______________________________________________</div>
<div style="display:flex;justify-content:space-between;margin-top:24px;gap:16px">
  <div style="flex:1"><div style="border-top:1px solid #333;padding-top:4px"><strong>Prepared by (Accountant)</strong><br/>Sign: ___&nbsp; Date: ___</div></div>
  <div style="flex:1"><div style="border-top:1px solid #333;padding-top:4px"><strong>Verified by (Finance Manager)</strong><br/>Sign: ___&nbsp; Date: ___</div></div>
  <div style="flex:1"><div style="border-top:1px solid #333;padding-top:4px"><strong>Approved by (CEO/Director)</strong><br/>Sign: ___&nbsp; Date: ___</div></div>
</div></div>`,
  },
  {
    id:"rv",        cat:"Finance",       icon:"📥",
    name:"Receipt Voucher",
    desc:"Official receipt for money received",
    body:`<div style="font-family:Times New Roman,serif;font-size:11pt;line-height:1.5;padding:20px 28px">
<div style="text-align:center;border-bottom:2px solid #0e6655;padding-bottom:10px;margin-bottom:14px">
  <div style="font-size:8pt;color:#555">EMBU LEVEL 5 HOSPITAL · FINANCE &amp; ACCOUNTS DEPARTMENT</div>
  <div style="font-size:14pt;font-weight:bold;color:#0e6655">OFFICIAL RECEIPT</div>
  <div>Receipt No: ______________ &nbsp;|&nbsp; Date: ${NOW()}</div>
</div>
<table style="width:100%;margin-bottom:12px">
  <tr><td><strong>Received from:</strong> ____________________________</td><td><strong>Amount (KES):</strong> ____________________________</td></tr>
  <tr><td style="padding-top:4px"><strong>Payment Method:</strong> Cash / Cheque / EFT</td><td style="padding-top:4px"><strong>GL Account:</strong> ____________________________</td></tr>
  <tr><td><strong>Reference / Invoice:</strong> ____________</td><td><strong>Department:</strong> ____________________________</td></tr>
</table>
<div style="margin-bottom:12px"><strong>Being payment for:</strong><br/>___________________________________________________________________<br/>___________________________________________________________________</div>
<div style="font-weight:bold;border:1px solid #ddd;padding:8px;margin-bottom:12px;font-size:12pt">AMOUNT IN WORDS: ____________________________________________________________</div>
<div style="display:flex;justify-content:space-between;margin-top:24px;gap:16px">
  <div style="flex:1"><div style="border-top:1px solid #333;padding-top:4px"><strong>Cashier / Accountant</strong><br/>Sign: ___&nbsp; Date: ___</div></div>
  <div style="flex:1"><div style="border-top:1px solid #333;padding-top:4px"><strong>Finance Manager</strong><br/>Sign: ___&nbsp; Date: ___</div></div>
  <div style="flex:1"><div style="border-top:1px solid #333;padding-top:4px"><strong>Received by (Payer)</strong><br/>Sign: ___&nbsp; Date: ___</div></div>
</div></div>`,
  },
  {
    id:"jv",        cat:"Finance",       icon:"📖",
    name:"Journal Voucher",
    desc:"GL journal entry voucher for accounting entries",
    body:`<div style="font-family:Times New Roman,serif;font-size:11pt;line-height:1.5;padding:20px 28px">
<div style="text-align:center;border-bottom:2px solid #6c3483;padding-bottom:10px;margin-bottom:14px">
  <div style="font-size:8pt;color:#555">EMBU LEVEL 5 HOSPITAL · ACCOUNTS DEPARTMENT</div>
  <div style="font-size:14pt;font-weight:bold;color:#6c3483">JOURNAL VOUCHER</div>
  <div>JV No: ______________ &nbsp;|&nbsp; Date: ${NOW()}</div>
</div>
<div style="margin-bottom:10px"><strong>Narration:</strong> _______________________________________________</div>
<table style="width:100%;border-collapse:collapse;margin-bottom:12px">
  <tr style="background:#6c3483;color:#fff">
    <th style="border:1px solid #aaa;padding:6px">GL Code</th><th style="border:1px solid #aaa;padding:6px">Account Name</th>
    <th style="border:1px solid #aaa;padding:6px">Dr (KES)</th><th style="border:1px solid #aaa;padding:6px">Cr (KES)</th>
  </tr>
  <tr><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">—</td></tr>
  <tr><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">—</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td></tr>
  <tr style="font-weight:bold;background:#f5f0ff"><td colspan="2" style="border:1px solid #ddd;padding:6px;text-align:right">TOTAL</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td></tr>
</table>
<div style="display:flex;justify-content:space-between;margin-top:24px;gap:16px">
  <div style="flex:1"><div style="border-top:1px solid #333;padding-top:4px"><strong>Prepared by</strong><br/>Sign: ___&nbsp; Date: ___</div></div>
  <div style="flex:1"><div style="border-top:1px solid #333;padding-top:4px"><strong>Reviewed by</strong><br/>Sign: ___&nbsp; Date: ___</div></div>
  <div style="flex:1"><div style="border-top:1px solid #333;padding-top:4px"><strong>Approved by</strong><br/>Sign: ___&nbsp; Date: ___</div></div>
</div></div>`,
  },
  {
    id:"contract",  cat:"Procurement",   icon:"📜",
    name:"Framework Contract",
    desc:"Procurement framework contract with supplier",
    body:`<div style="font-family:Times New Roman,serif;font-size:11pt;line-height:1.6;padding:20px 32px">
<div style="text-align:center;border-bottom:2px solid #1a3a6b;padding-bottom:12px;margin-bottom:20px">
  <div style="font-size:8pt;color:#555">COUNTY GOVERNMENT OF EMBU — DEPARTMENT OF HEALTH</div>
  <div style="font-size:15pt;font-weight:bold;color:#1a3a6b">EMBU LEVEL 5 HOSPITAL</div>
  <div style="font-size:13pt;font-weight:bold;margin:6px 0">FRAMEWORK CONTRACT</div>
  <div>Contract No: ______________ &nbsp;|&nbsp; Date: ${NOW()}</div>
</div>
<p>This Agreement is made between <strong>Embu Level 5 Hospital</strong> ("the Hospital") and <strong>____________________________</strong> ("the Supplier").</p>
<div style="font-weight:bold;border-left:3px solid #1a3a6b;padding-left:10px;margin:12px 0">1. SCOPE OF SUPPLY</div>
<p>The Supplier agrees to supply the following goods/services: _______________________________________________</p>
<div style="font-weight:bold;border-left:3px solid #1a3a6b;padding-left:10px;margin:12px 0">2. CONTRACT VALUE</div>
<p>Total Contract Value: <strong>KES ____________________________</strong> (inclusive of all taxes)</p>
<div style="font-weight:bold;border-left:3px solid #1a3a6b;padding-left:10px;margin:12px 0">3. CONTRACT PERIOD</div>
<p>From: ______________ &nbsp; To: ______________</p>
<div style="font-weight:bold;border-left:3px solid #1a3a6b;padding-left:10px;margin:12px 0">4. PAYMENT TERMS</div>
<p>Payment within 30 days of receipt of invoice and delivery note.</p>
<div style="font-weight:bold;border-left:3px solid #1a3a6b;padding-left:10px;margin:12px 0">5. DELIVERY</div>
<p>All deliveries to: Main Stores, Embu Level 5 Hospital within ___ days of LPO.</p>
<div style="font-weight:bold;border-left:3px solid #1a3a6b;padding-left:10px;margin:12px 0">6. PERFORMANCE BOND</div>
<p>The Supplier shall provide a Performance Bond of 10% of contract value.</p>
<div style="display:flex;justify-content:space-between;margin-top:36px;gap:30px">
  <div style="flex:1"><div style="border-top:2px solid #333;padding-top:8px"><strong>FOR: EMBU LEVEL 5 HOSPITAL</strong><br/><br/>Name: ____________________<br/>Title: CEO / Hospital Director<br/>Sign: ___&nbsp; Date: ___<br/><br/>Official Stamp:</div></div>
  <div style="flex:1"><div style="border-top:2px solid #333;padding-top:8px"><strong>FOR: SUPPLIER</strong><br/><br/>Name: ____________________<br/>Title: ____________________<br/>Sign: ___&nbsp; Date: ___<br/><br/>Official Stamp:</div></div>
</div></div>`,
  },
  {
    id:"report",    cat:"Reports",       icon:"📊",
    name:"Procurement Report (Blank)",
    desc:"General format for monthly/quarterly procurement reports",
    body:`<div style="font-family:Times New Roman,serif;font-size:11pt;line-height:1.6;padding:20px 32px">
<div style="text-align:center;border-bottom:2px solid #1a3a6b;padding-bottom:12px;margin-bottom:20px">
  <div style="font-size:8pt;color:#555">EMBU LEVEL 5 HOSPITAL · PROCUREMENT DEPARTMENT</div>
  <div style="font-size:14pt;font-weight:bold;color:#1a3a6b">PROCUREMENT REPORT</div>
  <div>Period: ______________ &nbsp;|&nbsp; Prepared by: ______________</div>
  <div>Date: ${NOW()}</div>
</div>
<div style="font-weight:bold;font-size:12pt;border-bottom:1px solid #1a3a6b;margin-bottom:8px">1. EXECUTIVE SUMMARY</div>
<p>&nbsp;</p><p>&nbsp;</p>
<div style="font-weight:bold;font-size:12pt;border-bottom:1px solid #1a3a6b;margin:16px 0 8px">2. PROCUREMENT ACTIVITIES</div>
<table style="width:100%;border-collapse:collapse;margin-bottom:12px">
  <tr style="background:#1a3a6b;color:#fff">
    <th style="border:1px solid #aaa;padding:6px">#</th><th style="border:1px solid #aaa;padding:6px">Activity</th>
    <th style="border:1px solid #aaa;padding:6px">No. of LPOs</th><th style="border:1px solid #aaa;padding:6px">Value (KES)</th>
    <th style="border:1px solid #aaa;padding:6px">Status</th>
  </tr>
  <tr><td style="border:1px solid #ddd;padding:6px">1</td><td style="border:1px solid #ddd;padding:6px">Medical Supplies</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td></tr>
  <tr><td style="border:1px solid #ddd;padding:6px">2</td><td style="border:1px solid #ddd;padding:6px">Pharmaceuticals</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td></tr>
  <tr><td style="border:1px solid #ddd;padding:6px">3</td><td style="border:1px solid #ddd;padding:6px">General Supplies</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td></tr>
</table>
<div style="font-weight:bold;font-size:12pt;border-bottom:1px solid #1a3a6b;margin:16px 0 8px">3. BUDGET UTILISATION</div>
<p>&nbsp;</p>
<div style="font-weight:bold;font-size:12pt;border-bottom:1px solid #1a3a6b;margin:16px 0 8px">4. CHALLENGES &amp; RECOMMENDATIONS</div>
<p>&nbsp;</p>
<div style="display:flex;justify-content:space-between;margin-top:32px">
  <div><div style="border-top:1px solid #333;width:200px;padding-top:4px">Procurement Manager</div></div>
  <div><div style="border-top:1px solid #333;width:200px;padding-top:4px">Hospital Director</div></div>
</div></div>`,
  },
];

/* ═══════════════════════ REPORT MODULES ══════════════════════════════ */
type ReportMod = {
  id: string; label: string; icon: string; table: string;
  cols: { key: string; label: string; fmt?: (v: any, r: any) => string }[];
  orderBy?: string;
};
const REPORT_MODS: ReportMod[] = [
  { id:"requisitions", label:"Requisitions", icon:"📋", table:"requisitions",
    cols:[{key:"requisition_number",label:"Req No"},{key:"department",label:"Dept"},{key:"status",label:"Status"},{key:"total_amount",label:"Amount",fmt:v=>FMT_KES(v)},{key:"created_at",label:"Date",fmt:v=>FMT_DT(v)}]
  },
  { id:"purchase_orders", label:"Purchase Orders", icon:"🛒", table:"purchase_orders",
    cols:[{key:"po_number",label:"PO No"},{key:"status",label:"Status"},{key:"total_amount",label:"Total",fmt:v=>FMT_KES(v)},{key:"payment_terms",label:"Terms"},{key:"created_at",label:"Date",fmt:v=>FMT_DT(v)}]
  },
  { id:"suppliers", label:"Suppliers", icon:"🏪", table:"suppliers",
    cols:[{key:"name",label:"Name"},{key:"contact_person",label:"Contact"},{key:"email",label:"Email"},{key:"phone",label:"Phone"},{key:"status",label:"Status"}]
  },
  { id:"goods_received", label:"GRNs", icon:"📦", table:"goods_received",
    cols:[{key:"grn_number",label:"GRN No"},{key:"supplier_name",label:"Supplier"},{key:"lpo_reference",label:"LPO Ref"},{key:"status",label:"Status"},{key:"received_date",label:"Date",fmt:v=>FMT_DT(v)}]
  },
  { id:"tenders", label:"Tenders", icon:"📢", table:"tenders",
    cols:[{key:"tender_number",label:"Tender No"},{key:"title",label:"Title"},{key:"status",label:"Status"},{key:"estimated_value",label:"Est. Value",fmt:v=>FMT_KES(v)},{key:"closing_date",label:"Closing",fmt:v=>FMT_DT(v)}]
  },
  { id:"contracts", label:"Contracts", icon:"📜", table:"contracts",
    cols:[{key:"contract_number",label:"Contract No"},{key:"supplier_name",label:"Supplier"},{key:"contract_value",label:"Value",fmt:v=>FMT_KES(v)},{key:"status",label:"Status"},{key:"end_date",label:"Expires",fmt:v=>FMT_DT(v)}]
  },
  { id:"payment_vouchers", label:"Payment Vouchers", icon:"💸", table:"payment_vouchers",
    cols:[{key:"voucher_number",label:"PV No"},{key:"payee",label:"Payee"},{key:"total_amount",label:"Amount",fmt:v=>FMT_KES(v)},{key:"payment_method",label:"Method"},{key:"status",label:"Status"},{key:"created_at",label:"Date",fmt:v=>FMT_DT(v)}]
  },
  { id:"receipt_vouchers", label:"Receipt Vouchers", icon:"📥", table:"receipt_vouchers",
    cols:[{key:"receipt_number",label:"RV No"},{key:"received_from",label:"From"},{key:"amount",label:"Amount",fmt:v=>FMT_KES(v)},{key:"payment_method",label:"Method"},{key:"status",label:"Status"},{key:"created_at",label:"Date",fmt:v=>FMT_DT(v)}]
  },
  { id:"budgets", label:"Budgets", icon:"📊", table:"budgets",
    cols:[{key:"budget_name",label:"Name"},{key:"fiscal_year",label:"FY"},{key:"department",label:"Dept"},{key:"total_budget",label:"Allocated",fmt:v=>FMT_KES(v)},{key:"spent",label:"Spent",fmt:v=>FMT_KES(v)}]
  },
  { id:"fixed_assets", label:"Fixed Assets", icon:"🏗", table:"fixed_assets",
    cols:[{key:"asset_code",label:"Code"},{key:"asset_name",label:"Name"},{key:"category",label:"Category"},{key:"purchase_price",label:"Cost",fmt:v=>FMT_KES(v)},{key:"net_book_value",label:"NBV",fmt:v=>FMT_KES(v)},{key:"status",label:"Status"}]
  },
  { id:"audit_logs", label:"Audit Log", icon:"🔍", table:"audit_logs",
    cols:[{key:"action",label:"Action"},{key:"module",label:"Module"},{key:"table_name",label:"Table"},{key:"created_at",label:"Date",fmt:v=>FMT_DT(v)}]
  },
  { id:"profiles", label:"Users", icon:"👥", table:"profiles",
    cols:[{key:"full_name",label:"Name"},{key:"email",label:"Email"},{key:"department",label:"Dept"},{key:"is_active",label:"Active",fmt:v=>v?"Yes":"No"},{key:"created_at",label:"Since",fmt:v=>FMT_DT(v)}]
  },
];

/* ═══════════════════════ MAIN COMPONENT ═════════════════════════════ */
type Tab = "writer"|"templates"|"reports"|"library"|"signatures";

export default function DocumentEditorPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const editorRef = useRef<HTMLDivElement>(null);

  /* ── state ─────────────────────────────────────────────────── */
  const [tab, setTab]             = useState<Tab>("writer");
  const [docName, setDocName]     = useState("Untitled Document");
  const [docCat, setDocCat]       = useState("General");
  const [docIsTemplate, setDocIT] = useState(false);
  const [docId, setDocId]           = useState<string|null>(null);
  const [docPublished, setDocPub]   = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showSigPicker, setShowSigPicker] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  /* ── toolbar drag-to-reorder ────────────────────────────────── */
  const [toolbar, setToolbar]     = useState<TBDef[]>(DEFAULT_TOOLBAR);
  const [toolbarVis, setTBVis]    = useState<Set<string>>(new Set(DEFAULT_TOOLBAR.map(t=>t.id)));
  const [dragId, setDragId]       = useState<string|null>(null);
  const [dragOver, setDragOver]   = useState<string|null>(null);
  const [showTBEditor, setShowTBE] = useState(false);
  const [fontSize, setFontSize]   = useState("12");
  const [fontFamily, setFontFamily] = useState("Times New Roman,serif");

  /* ── templates tab ──────────────────────────────────────────── */
  const [tplCat, setTplCat]       = useState("All");
  const [tplSearch, setTplSearch] = useState("");

  /* ── reports tab ────────────────────────────────────────────── */
  const [repMod, setRepMod]       = useState<ReportMod>(REPORT_MODS[0]);
  const [repRows, setRepRows]     = useState<any[]>([]);
  const [repLoading, setRepLoad]  = useState(false);
  const [repFilter, setRepFilter] = useState("");
  const [repDateFrom, setRepDF]   = useState("");
  const [repDateTo, setRepDT]     = useState("");
  const [repStatus, setRepStatus] = useState("ALL");

  /* ── library tab ────────────────────────────────────────────── */
  const [library, setLibrary]     = useState<any[]>([]);
  const [libSearch, setLibSearch] = useState("");
  const [libLoading, setLibLoad]  = useState(false);

  /* ── signatures tab ─────────────────────────────────────────── */
  const sigCanvasRef    = useRef<HTMLCanvasElement>(null);
  const sigStampRef     = useRef<HTMLInputElement>(null);
  const sigUploadRef    = useRef<HTMLInputElement>(null);
  const [sigMode, setSigMode]           = useState<"draw"|"upload"|"stamp">("draw");
  const [sigDrawing, setSigDrawing]     = useState(false);
  const [sigLastX, setSigLastX]         = useState(0);
  const [sigLastY, setSigLastY]         = useState(0);
  const [sigData, setSigData]           = useState<string>("");          // base64 current sig
  const [stampData, setStampData]       = useState<string>("");          // base64 stamp
  const [savedSigs, setSavedSigs]       = useState<any[]>([]);           // from DB
  const [savedStamps, setSavedStamps]   = useState<any[]>([]);           // from DB
  const [signees, setSignees]           = useState<any[]>([]);           // scheduled signees
  const [newSignee, setNewSignee]       = useState({ name:"", role:"", email:"", due:"", note:"" });
  const [notifying, setNotifying]       = useState<Set<string>>(new Set());
  const [showBulkEmail, setShowBulkEmail] = useState(false);
  const [bulkRecipients, setBulkRecipients] = useState("");
  const [bulkSubject, setBulkSubject]   = useState("");
  const [bulkMessage, setBulkMessage]   = useState("");
  const [bulkSending, setBulkSending]   = useState(false);
  const [sigLoading, setSigLoading]     = useState(false);
  const [sigSaving, setSigSaving]       = useState(false);
  const [sigLabel, setSigLabel]         = useState("");
  const [stampLabel, setStampLabel]     = useState("");
  const [selSig, setSelSig]             = useState<any>(null);
  const [selStamp, setSelStamp]         = useState<any>(null);

  /* ── init ───────────────────────────────────────────────────── */
  useEffect(() => {
    const id = searchParams.get("id");
    if (id) loadDoc(id);
    else loadBlank();
    loadLibrary();
  }, [searchParams]);

  const loadBlank = () => {
    if (editorRef.current) editorRef.current.innerHTML = TEMPLATES.find(t=>t.id==="memo")?.body || "";
    updateCounts();
  };

  const loadDoc = async (id: string) => {
    const { data } = await db.from("documents").select("*").eq("id",id).single();
    if (!data) return;
    setDocId(data.id); setDocName(data.name); setDocCat(data.category||"General");
    setDocIT(data.is_template||false);
    setDocPub(data.is_published||false);
    if (editorRef.current) {
      if (data.template_html) {
        // Authored in this Studio's rich-text editor — load as-is.
        editorRef.current.innerHTML = data.template_html;
      } else if (data.parsed_content) {
        // Uploaded document (PDF/Word/etc.) — template_html was never
        // populated for these, only parsed_content (plain extracted
        // text). Previously loadDoc only checked template_html, so
        // opening any uploaded document showed a blank editor with no
        // indication why. Render the extracted text as paragraphs so
        // there's something to see and edit.
        const paras = String(data.parsed_content).split(/\n{2,}|\r\n\r\n/).filter(Boolean);
        editorRef.current.innerHTML = paras.length
          ? paras.map((p:string)=>`<p>${p.replace(/\n/g,"<br/>").replace(/</g,"&lt;")}</p>`).join("")
          : `<p>${String(data.parsed_content).replace(/\n/g,"<br/>").replace(/</g,"&lt;")}</p>`;
      } else if (data.storage_path || data.file_url) {
        // No extractable text at all (e.g. a scanned/image-only PDF) —
        // say so plainly instead of leaving a silent blank page, and
        // offer the original file.
        editorRef.current.innerHTML = `<p style="color:#9ca3af;font-style:italic">This document has no editable text content (likely a scanned image or unsupported format for in-Studio editing).</p><p><a href="${data.file_url||"#"}" target="_blank" rel="noopener">Open the original file</a> to view it, or download it from the Documents library instead.</p>`;
      } else {
        editorRef.current.innerHTML = "";
      }
    }
    updateCounts();
  };

  const loadLibrary = async () => {
    setLibLoad(true);
    const { data } = await db.from("documents").select("*").order("created_at",{ascending:false}).limit(200);
    setLibrary(data||[]);
    setLibLoad(false);
  };

  /* ── editor helpers ─────────────────────────────────────────── */
  const exec = useCallback((cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
  }, []);

  const updateCounts = useCallback(() => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText || "";
    setCharCount(text.length);
    setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);
  }, []);

  const insertTable = () => {
    exec("insertHTML", `<table style="width:100%;border-collapse:collapse;margin:8px 0"><tr><th style="border:1px solid #999;padding:6px;background:#1a3a6b;color:#fff">Column 1</th><th style="border:1px solid #999;padding:6px;background:#1a3a6b;color:#fff">Column 2</th><th style="border:1px solid #999;padding:6px;background:#1a3a6b;color:#fff">Column 3</th></tr><tr><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td></tr><tr><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td></tr></table>`);
  };

  /* ── toolbar click handler ──────────────────────────────────── */
  const handleTB = useCallback((btn: TBDef) => {
    if (btn.action) { exec(btn.action, btn.value); return; }
    if (btn.type === "link") {
      const url = prompt("Enter URL:");
      if (url) exec("createLink", url);
    } else if (btn.type === "img") {
      const url = prompt("Enter image URL:");
      if (url) exec("insertHTML", `<img src="${url}" style="max-width:100%;height:auto" />`);
    } else if (btn.type === "table") {
      insertTable();
    } else if (btn.type === "foreColor") {
      const c = prompt("Hex colour (#rrggbb):", "#000000");
      if (c) exec("foreColor", c);
    } else if (btn.type === "backColor") {
      const c = prompt("Highlight colour (#rrggbb):", "#ffff00");
      if (c) exec("backColor", c);
    }
  }, [exec]);

  /* ── publish document ───────────────────────────────────────── */
  const publishDoc = async () => {
    if (!editorRef.current) return;
    // If document hasn't been saved yet, save it first. saveDoc() now
    // returns the id directly instead of relying on the docId state
    // variable, which is still stale in this closure right after the
    // await (React batches the setDocId from inside saveDoc) — that
    // used to mean a first-time publish never actually reached the DB:
    // it fell through to "no id yet, just flip local state" and the
    // is_published flag was never written.
    let id = docId;
    if (!id) {
      id = await saveDoc();
      if (!id) {
        toast({ title: "Publish failed", description: "Could not save the document first", variant: "destructive" });
        return;
      }
    }
    setPublishing(true);
    try {
      const newPublished = !docPublished;
      const payload: Record<string, unknown> = {
        is_published: newPublished,
        updated_at: new Date().toISOString(),
      };
      if (newPublished) payload.published_at = new Date().toISOString();

      await db.from("documents").update(payload).eq("id", id);
      setDocPub(newPublished);
      toast({
        title: newPublished ? "🚀 Document published" : "📄 Document unpublished",
        description: newPublished
          ? "This document is now publicly accessible within the system."
          : "Document reverted to draft.",
      });
    } catch (e: any) {
      toast({ title: "Publish failed", description: e.message, variant: "destructive" });
    }
    setPublishing(false);
  };

  /* ── save document ──────────────────────────────────────────── */
  const saveDoc = async (): Promise<string | null> => {
    if (!editorRef.current) return docId;
    setSaving(true);
    const html = editorRef.current.innerHTML;
    const payload = {
      name: docName, category: docCat,
      is_template: docIsTemplate, template_html: html,
      file_type: "html", created_by: user?.id,
      file_size: html.length, tags: [], description: "",
      updated_at: new Date().toISOString(),
    };
    let resultId: string | null = docId;
    try {
      if (docId) {
        await db.from("documents").update(payload).eq("id", docId);
        toast({ title: "✓ Document updated" });
      } else {
        const { data } = await db.from("documents").insert({ ...payload, created_at: new Date().toISOString() }).select().single();
        if (data?.id) { setDocId(data.id); resultId = data.id; }
        toast({ title: "✓ Document saved" });
      }
      loadLibrary();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
      resultId = null;
    }
    setSaving(false);
    return resultId;
  };

  /* ── print with letterhead (+ real signature images when signees exist) ── */
  const printDoc = () => {
    const html = editorRef.current?.innerHTML || "";
    const win = window.open("","_blank","width=900,height=700");
    if (!win) return;
    const isDraft = signees.length > 0 && signees.some(s => s.status === "pending");
    const sigBlock = signees.length ? `
      <div style="margin-top:36px;border-top:1px solid #cbd5e1;padding-top:10px">
        <div style="font-size:9pt;font-weight:800;color:#1a3a6b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">Authorized Signatures</div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:20px">
          ${signees.map((s:any) => `
            <div style="border-top:1px solid #1a3a6b;padding-top:6px;min-height:44px">
              ${s.status==="signed" && s.signature_image ? `<img src="${s.signature_image}" style="height:36px;max-width:150px;object-fit:contain;display:block;margin-bottom:3px"/>` : ""}
              <div style="font-size:8.5pt;font-weight:700;color:#374151">${s.status==="signed" ? s.signee_name : "&nbsp;"}</div>
              <div style="font-size:8pt;color:#6b7280;margin-top:2px">${s.signee_role||""}</div>
              <span style="display:inline-block;font-size:6.5pt;font-weight:800;letter-spacing:.05em;text-transform:uppercase;padding:1px 6px;border-radius:8px;margin-top:3px;
                background:${s.status==="signed"?"#dcfce7":s.status==="declined"?"#fee2e2":"#fef9c3"};
                color:${s.status==="signed"?"#166534":s.status==="declined"?"#991b1b":"#854d0e"}">${s.status||"pending"}</span>
              <div style="font-size:8pt;color:#9ca3af;margin-top:10px">Date: ${s.signed_at ? new Date(s.signed_at).toLocaleDateString("en-KE") : "_______________"}</div>
            </div>`).join("")}
        </div>
      </div>` : "";
    win.document.write(`<!DOCTYPE html><html><head><title>${docName}</title><style>
@page{margin:2cm}body{font-family:Times New Roman,serif;font-size:12pt;margin:0;padding:24px;position:relative}
table{border-collapse:collapse}img{max-width:100%}
@media print{.no-print{display:none}}
.wm{position:fixed;top:42%;left:50%;transform:translate(-50%,-50%) rotate(-32deg);font-size:60pt;font-weight:900;color:rgba(220,38,38,.08);letter-spacing:.08em;pointer-events:none;z-index:0;white-space:nowrap}
</style></head><body>
${isDraft ? `<div class="wm">UNSIGNED DRAFT</div>` : ""}
<div style="text-align:center;border-bottom:3px solid #1a3a6b;padding-bottom:12px;margin-bottom:20px">
  <div style="font-size:8pt;color:#555">REPUBLIC OF KENYA · COUNTY GOVERNMENT OF EMBU — DEPARTMENT OF HEALTH</div>
  <div style="font-size:16pt;font-weight:bold;color:#1a3a6b">EMBU LEVEL 5 HOSPITAL</div>
  <div style="font-size:8pt;color:#666">P.O. Box 33 – 60100, Embu | Tel: +254 68 31055 | pghembu@gmail.com | "Quality Healthcare for All"</div>
  <div style="border-top:1px solid #cc7700;margin-top:4px;padding-top:4px;font-size:8pt;color:#888">EL5 MediProcure · ${new Date().toLocaleString("en-KE")}</div>
</div>
${html}
${sigBlock}
<div style="margin-top:40px;border-top:1px solid #ddd;padding-top:8px;font-size:8pt;color:#888;text-align:center">
  Printed from EL5 MediProcure — Embu Level 5 Hospital — ${new Date().toLocaleString("en-KE")}
</div>
<script>window.onload=()=>{window.print();window.close();}</script>
</body></html>`);
    win.document.close();
    db.from("print_log").insert({ page:"document", entity_type:"document", entity_id: docName }).then(()=>{},()=>{});
  };

  /* ── export PDF ─────────────────────────────────────────────── */
  const exportPDF = async () => {
    const doc = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
    const startY = await addLetterhead(doc, docName, "");
    const html = editorRef.current?.innerText || "";
    const lines = doc.splitTextToSize(html, 180);
    let y = startY + 4;
    for (const line of lines) {
      if (y > 270) { doc.addPage(); addFooter(doc,doc.getNumberOfPages(),doc.getNumberOfPages()); y=20; }
      doc.setFontSize(11); doc.setFont("helvetica","normal"); doc.setTextColor(40,40,40);
      doc.text(line, 15, y); y += 6;
    }
    addFooter(doc, 1, doc.getNumberOfPages());
    doc.save(`${docName.replace(/[^a-zA-Z0-9]/g,"-")}.pdf`);
  };

  /* ── load report ────────────────────────────────────────────── */
  const loadReport = async (mod: ReportMod) => {
    setRepLoad(true);
    setRepMod(mod);
    try {
      let q = db.from(mod.table).select("*").order("created_at",{ascending:false}).limit(500);
      if (repDateFrom) q = q.gte("created_at", repDateFrom);
      if (repDateTo)   q = q.lte("created_at", repDateTo+"T23:59:59");
      if (repStatus !== "ALL" && mod.cols.find(c=>c.key==="status")) q = q.eq("status",repStatus);
      const { data, error } = await q;
      if (error) throw error;
      setRepRows(data||[]);
    } catch (e: any) {
      toast({ title: "Load failed", description: e.message, variant:"destructive" });
      setRepRows([]);
    }
    setRepLoad(false);
  };

  useEffect(() => { if (tab==="reports") loadReport(repMod); }, [tab]);

  /* ── print report ───────────────────────────────────────────── */
  const printReport = async () => {
    const filtered = repRows.filter(r => {
      const s = repFilter.toLowerCase();
      return !s || repMod.cols.some(c => String(r[c.key]||"").toLowerCase().includes(s));
    });
    const doc = new jsPDF({ orientation:"landscape", unit:"mm", format:"a4" });
    const startY = await addLetterhead(doc, `${repMod.label} Report`, "");
    doc.setFontSize(8); doc.setTextColor(80,80,80);
    doc.text(`Generated: ${new Date().toLocaleString("en-KE")} | Records: ${filtered.length}`, 14, startY+4);
    autoTable(doc, {
      startY: startY+10,
      head: [repMod.cols.map(c=>c.label)],
      body: filtered.map(r => repMod.cols.map(c => c.fmt ? c.fmt(r[c.key],r) : String(r[c.key]||""))),
      styles: { fontSize:7, cellPadding:2 },
      headStyles: { fillColor:[26,58,107], textColor:255, fontStyle:"bold" },
      alternateRowStyles: { fillColor:[245,248,255] },
      margin:{ left:14, right:14 },
    });
    addFooter(doc, 1, doc.getNumberOfPages());
    doc.save(`${repMod.label.replace(/ /g,"-")}-Report-${new Date().toISOString().slice(0,10)}.pdf`);
  };

  /* ── paste report into editor ───────────────────────────────── */
  const pasteReportToEditor = () => {
    const filtered = repRows.filter(r => {
      const s = repFilter.toLowerCase();
      return !s || repMod.cols.some(c => String(r[c.key]||"").toLowerCase().includes(s));
    });
    const thead = repMod.cols.map(c=>`<th style="border:1px solid #aaa;padding:6px;background:#1a3a6b;color:#fff">${c.label}</th>`).join("");
    const tbody = filtered.map(r=>
      `<tr>${repMod.cols.map(c=>`<td style="border:1px solid #ddd;padding:6px">${c.fmt?c.fmt(r[c.key],r):String(r[c.key]||"—")}</td>`).join("")}</tr>`
    ).join("");
    const tableHTML = `<div style="margin:12px 0"><strong>${repMod.label} — ${new Date().toLocaleDateString("en-KE")} (${filtered.length} records)</strong><br/><table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:10pt"><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table></div>`;
    if (editorRef.current) {
      editorRef.current.innerHTML += tableHTML;
      updateCounts();
    }
    setTab("writer");
    toast({ title: "✓ Report inserted into document" });
  };

  /* ── toolbar drag handlers ──────────────────────────────────── */
  const onDragStart = (id: string) => setDragId(id);
  const onDragOver  = (id: string) => setDragOver(id);
  const onDrop      = () => {
    if (!dragId || !dragOver || dragId === dragOver) { setDragId(null); setDragOver(null); return; }
    setToolbar(prev => {
      const arr = [...prev];
      const from = arr.findIndex(t=>t.id===dragId);
      const to   = arr.findIndex(t=>t.id===dragOver);
      const [item] = arr.splice(from,1);
      arr.splice(to,0,item);
      return arr;
    });
    setDragId(null); setDragOver(null);
  };

  /* ══════════════════════ RENDER ══════════════════════════════ */
  const filteredTpls = TEMPLATES.filter(t =>
    (tplCat==="All" || t.cat===tplCat) &&
    (!tplSearch || t.name.toLowerCase().includes(tplSearch.toLowerCase()) || t.desc.toLowerCase().includes(tplSearch.toLowerCase()))
  );
  const tplCats = ["All", ...Array.from(new Set(TEMPLATES.map(t=>t.cat)))];
  const filteredLib = library.filter(d => !libSearch || d.name.toLowerCase().includes(libSearch.toLowerCase()) || (d.category||"").toLowerCase().includes(libSearch.toLowerCase()));
  const filteredRep = repRows.filter(r => {
    const s = repFilter.toLowerCase();
    return !s || repMod.cols.some(c => String(r[c.key]||"").toLowerCase().includes(s));
  });

  /* ── signatures: load from DB ──────────────────────────────── */
  const loadSigData = async () => {
    setSigLoading(true);
    try {
      const [s, st, sn] = await Promise.all([
        db.from("user_signatures").select("*").order("created_at",{ascending:false}).limit(20),
        db.from("org_stamps").select("*").order("created_at",{ascending:false}).limit(10),
        docId ? db.from("document_signees").select("*").eq("document_id",docId).order("sort_order") : Promise.resolve({data:[]}),
      ]);
      setSavedSigs(s.data||[]);
      setSavedStamps(st.data||[]);
      setSignees(sn.data||[]);
    } catch {}
    setSigLoading(false);
  };

  useEffect(() => { if (tab==="signatures") loadSigData(); }, [tab, docId]);

  /* ── canvas draw helpers ────────────────────────────────────── */
  const canvasDraw = (e: React.MouseEvent<HTMLCanvasElement>, type: "start"|"move"|"end") => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ctx = canvas.getContext("2d")!;
    ctx.strokeStyle = "#1a3a6b";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (type === "start") { ctx.beginPath(); ctx.moveTo(x,y); setSigDrawing(true); setSigLastX(x); setSigLastY(y); }
    if (type === "move" && sigDrawing) { ctx.lineTo(x,y); ctx.stroke(); setSigLastX(x); setSigLastY(y); }
    if (type === "end") { setSigDrawing(false); setSigData(canvas.toDataURL()); }
  };

  const clearCanvas = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")!.clearRect(0,0,canvas.width,canvas.height);
    setSigData("");
  };

  /* ── save signature ─────────────────────────────────────────── */
  const saveSig = async () => {
    if (!sigData && sigMode==="draw") { toast({title:"Draw a signature first",variant:"destructive"}); return; }
    setSigSaving(true);
    try {
      await db.from("user_signatures").insert({
        user_id: user?.id, label: sigLabel||"My Signature",
        sig_type: sigMode, image_base64: sigData,
        created_at: new Date().toISOString(),
      });
      toast({title:"✓ Signature saved"});
      setSigLabel(""); clearCanvas(); setSigData(""); loadSigData();
    } catch(e:any) { toast({title:"Save failed",description:e.message,variant:"destructive"}); }
    setSigSaving(false);
  };

  /* ── save stamp ─────────────────────────────────────────────── */
  const saveStamp = async () => {
    if (!stampData) { toast({title:"Upload a stamp first",variant:"destructive"}); return; }
    setSigSaving(true);
    try {
      await db.from("org_stamps").insert({
        label: stampLabel||"Official Stamp", image_base64: stampData,
        created_at: new Date().toISOString(), uploaded_by: user?.id,
      });
      toast({title:"✓ Stamp saved"});
      setStampLabel(""); setStampData(""); loadSigData();
    } catch(e:any) { toast({title:"Save failed",description:e.message,variant:"destructive"}); }
    setSigSaving(false);
  };

  /* ── insert sig/stamp into doc ─────────────────────────────── */
  const insertSigBlock = (imgSrc: string, label: string, isStamp=false) => {
    if (!editorRef.current) return;
    const html = isStamp
      ? `<div style="display:inline-block;margin:8px 4px;text-align:center"><img src="${imgSrc}" alt="${label}" style="width:100px;height:100px;object-fit:contain;border:2px solid #1a3a6b;border-radius:4px" /><div style="font-size:9pt;color:#666;margin-top:2px">${label}</div></div>`
      : `<div style="display:inline-block;margin:8px 16px 8px 4px;min-width:180px;vertical-align:bottom"><img src="${imgSrc}" alt="${label}" style="width:180px;height:60px;object-fit:contain;display:block" /><div style="border-top:1px solid #333;padding-top:3px;font-size:9pt">${label}</div></div>`;
    editorRef.current.innerHTML += html;
    setTab("writer");
    toast({title:`✓ ${isStamp?"Stamp":"Signature"} inserted into document`});
  };

  /* ── insert placeholder ─────────────────────────────────────── */
  const insertSigPlaceholder = (role: string) => {
    if (!editorRef.current) return;
    const html = `<div style="display:inline-block;margin:8px 16px;min-width:200px;vertical-align:bottom"><div style="border:2px dashed #2563eb;border-radius:4px;padding:18px 8px;text-align:center;background:#eff6ff;color:#2563eb;font-size:10pt;min-height:60px;cursor:pointer" data-sig-placeholder="${role}">✍ Sign here<br/><span style="font-size:8pt;color:#6b7280">${role}</span></div><div style="border-top:1px solid #999;margin-top:4px;font-size:9pt;color:#374151;padding-top:2px">${role}</div></div>`;
    editorRef.current.innerHTML += html;
    setTab("writer");
    toast({title:`✓ Signature placeholder added for: ${role}`});
  };

  /* ── add scheduled signee ───────────────────────────────────── */
  const addSignee = async () => {
    if (!newSignee.name) { toast({title:"Enter a name",variant:"destructive"}); return; }
    if (!docId) { toast({title:"Save the document first",variant:"destructive"}); return; }
    setSigSaving(true);
    try {
      await db.from("document_signees").insert({
        document_id: docId, signee_name: newSignee.name,
        signee_role: newSignee.role, signee_email: newSignee.email,
        due_date: newSignee.due||null, note: newSignee.note,
        status: "pending", sort_order: signees.length,
        created_at: new Date().toISOString(),
      });
      setNewSignee({name:"",role:"",email:"",due:"",note:""});
      toast({title:"✓ Signee added"});
      loadSigData();
    } catch(e:any) { toast({title:"Failed",description:e.message,variant:"destructive"}); }
    setSigSaving(false);
  };

  const removeSignee = async (id:string) => {
    await db.from("document_signees").delete().eq("id",id);
    loadSigData();
  };

  /* ── notify a signee to sign (email + in-app) ──────────────────── */
  const notifySignee = async (sn: any) => {
    if (!sn.signee_email) { toast({title:"No email on file for this signee",variant:"destructive"}); return; }
    setNotifying(prev => new Set(prev).add(sn.id));
    try {
      const { data, error } = await db.functions.invoke("notification-hub", {
        body: {
          action: "notify_signature_request",
          signeeId: sn.id, documentId: docId, documentName: docName,
          signeeName: sn.signee_name, signeeEmail: sn.signee_email,
          signeeUserId: sn.user_id || null, signToken: sn.sign_token,
          requestedByName: profile?.full_name || user?.email || "EL5 MediProcure",
          dueDate: sn.due_date || undefined,
        },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Send failed");
      toast({title:`✓ Notified ${sn.signee_name}`, description:"Email + in-app notification sent"});
      loadSigData();
    } catch(e:any) {
      toast({title:"Notify failed", description:e.message, variant:"destructive"});
    } finally {
      setNotifying(prev => { const s=new Set(prev); s.delete(sn.id); return s; });
    }
  };

  const notifyAllPending = async () => {
    const pending = signees.filter(s => s.status === "pending" && s.signee_email);
    if (pending.length === 0) { toast({title:"No pending signees with an email to notify"}); return; }
    for (const sn of pending) await notifySignee(sn);
    toast({title:`✓ Notified ${pending.length} signee(s)`});
  };

  /* ── bulk email this document to multiple recipients ───────────── */
  const sendBulkEmail = async () => {
    const emails = bulkRecipients.split(/[,;\n]/).map(e=>e.trim()).filter(Boolean);
    if (emails.length === 0) { toast({title:"Enter at least one email address",variant:"destructive"}); return; }
    setBulkSending(true);
    try {
      const message = `${bulkMessage || `A document has been shared with you: "${docName}".`}\n\nView it in EL5 MediProcure → Documents → "${docName}".`;
      const { data, error } = await db.functions.invoke("notification-hub", {
        body: {
          action: "send_all",
          recipients: emails.map(email => ({ email })),
          channels: ["email"],
          subject: bulkSubject || `Document shared: ${docName}`,
          message,
        },
      });
      if (error) throw error;
      const okCount = (data?.results||[]).filter((r:any)=>r.ok).length;
      toast({title:`✓ Sent to ${okCount}/${emails.length} recipient(s)`});
      setShowBulkEmail(false); setBulkRecipients(""); setBulkSubject(""); setBulkMessage("");
    } catch(e:any) {
      toast({title:"Bulk send failed", description:e.message, variant:"destructive"});
    } finally { setBulkSending(false); }
  };

  /* ── file → base64 ──────────────────────────────────────────── */
  const fileToB64 = (file: File): Promise<string> =>
    new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result as string); r.onerror=rej; r.readAsDataURL(file); });

  const TABS = [
    { id:"writer",     label:"✏ Writer",     title:"Rich document editor" },
    { id:"templates",  label:"📋 Templates",  title:"Pre-built form templates" },
    { id:"reports",    label:"📊 Reports",    title:"Live system reports" },
    { id:"signatures", label:"✍ Signatures",  title:"Signatures, stamps & signees" },
    { id:"library",    label:"🗂 Library",     title:"Saved documents" },
  ] as { id: Tab; label: string; title: string }[];

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh", fontFamily:"Segoe UI,Tahoma,Arial,sans-serif", fontSize:12, background:C.gray3 }}>

      {/* ══ TOP RIBBON ═══════════════════════════════════════════ */}
      <div style={{ background:C.ribbon, padding:"6px 12px", display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", boxShadow:"0 2px 6px rgba(0,0,0,0.4)" }}>
        <div style={{ color:"#fff", fontWeight:700, fontSize:13, marginRight:8 }}>📄 Document Studio</div>
        <input value={docName} onChange={e=>setDocName(e.target.value)}
          style={{ ...S.inp, background:"rgba(255,255,255,0.12)", color:"#fff", border:"1px solid rgba(255,255,255,0.3)", width:240, fontWeight:600, fontSize:12 }}
          placeholder="Document name…" />
        <select value={docCat} onChange={e=>setDocCat(e.target.value)} style={{ ...S.inp, background:"rgba(255,255,255,0.12)", color:"#fff", border:"1px solid rgba(255,255,255,0.3)" }}>
          {["General","Official","Procurement","Finance","HR","Report","Memo","Letter","Minutes","Other"].map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <label style={{ color:"rgba(255,255,255,0.85)", fontSize:11, display:"flex", alignItems:"center", gap:4 }}>
          <input type="checkbox" checked={docIsTemplate} onChange={e=>setDocIT(e.target.checked)} /> Template
        </label>
        <div style={{ marginLeft:"auto", display:"flex", gap:4 }}>
          <button onClick={saveDoc} disabled={saving} style={{ ...S.btn(false), background:C.green3, color:C.green, border:"1px solid #166534", fontWeight:700 }}>
            {saving?"⏳ Saving…":"💾 Save"}
          </button>
          <button onClick={publishDoc} disabled={publishing||saving}
            style={{ ...S.btn(false), background:docPublished?"#1e40af":"#0078d4", color:"#fff", border:"1px solid #1e3a8a", fontWeight:700, display:"flex", alignItems:"center", gap:5 }}>
            {publishing?"🚀 Publishing…": docPublished?"✅ Published":"🚀 Publish"}
          </button>
          {docPublished && (
            <span style={{ fontSize:10, fontWeight:700, padding:"3px 8px", borderRadius:99, background:"#dcfce7", color:"#15803d", border:"1px solid #86efac", display:"flex", alignItems:"center", gap:4 }}>
              ● Published
            </span>
          )}
          <button onClick={printDoc} style={{ ...S.btn(false), background:"rgba(255,255,255,0.12)", color:"#fff", border:"1px solid rgba(255,255,255,0.3)" }}>🖨 Print</button>
          <button onClick={exportPDF} style={{ ...S.btn(false), background:"rgba(255,255,255,0.12)", color:"#fff", border:"1px solid rgba(255,255,255,0.3)" }}>📤 PDF</button>
          <button onClick={()=>setShowBulkEmail(true)} style={{ ...S.btn(false), background:"rgba(255,255,255,0.12)", color:"#fff", border:"1px solid rgba(255,255,255,0.3)" }}>📧 Email</button>
          <button onClick={()=>navigate("/documents")} style={{ ...S.btn(false), background:"rgba(255,255,255,0.12)", color:"#fff", border:"1px solid rgba(255,255,255,0.3)" }}>✕ Close</button>
        </div>
      </div>

      {/* ══ TAB BAR ═══════════════════════════════════════════════ */}
      <div style={{ display:"flex", background:C.blue, borderBottom:"2px solid #0f2550" }}>
        {TABS.map(t => (
          <button key={t.id} title={t.title} onClick={()=>setTab(t.id as Tab)}
            style={{ padding:"7px 18px", border:"none", cursor:"pointer", fontSize:12, fontWeight:tab===t.id?700:400,
              background:tab===t.id?C.white:"transparent", color:tab===t.id?C.blue:"rgba(255,255,255,0.85)",
              borderRight:"1px solid rgba(255,255,255,0.15)", borderRadius:tab===t.id?"4px 4px 0 0":0,
              marginBottom:tab===t.id?-2:0 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════ WRITER TAB ════════════════════════════════════ */}
      {tab==="writer" && (
        <div style={{ display:"flex", flexDirection:"column", flex:1, overflow:"hidden" }}>

          {/* Formatting toolbar */}
          <div style={{ background:C.toolbar, borderBottom:`1px solid ${C.border}`, padding:"3px 6px", display:"flex", flexWrap:"wrap", gap:2, alignItems:"center" }}>

            {/* Font family */}
            <select value={fontFamily} onChange={e=>{setFontFamily(e.target.value);exec("fontName",e.target.value);}}
              style={{ ...S.inp, width:150, fontSize:11 }}>
              {["Times New Roman,serif","Arial,sans-serif","Calibri,sans-serif","Georgia,serif","Verdana,sans-serif","Courier New,monospace","Cambria,serif"].map(f=>
                <option key={f} value={f}>{f.split(",")[0]}</option>
              )}
            </select>
            <select value={fontSize} onChange={e=>{setFontSize(e.target.value);exec("fontSize","3");
              const sel=document.getSelection();if(sel&&sel.rangeCount){const r=sel.getRangeAt(0);const span=document.createElement("span");span.style.fontSize=e.target.value+"pt";try{r.surroundContents(span);}catch{}}}}
              style={{ ...S.inp, width:55, fontSize:11 }}>
              {["8","9","10","11","12","14","16","18","20","24","28","32","36","48","72"].map(s=>
                <option key={s} value={s}>{s}</option>
              )}
            </select>

            <div style={{ width:1, background:C.border, height:20, margin:"0 4px" }}/>

            {/* Draggable buttons */}
            {toolbar.filter(t=>toolbarVis.has(t.id)).map(btn=>(
              <div key={btn.id} draggable
                onDragStart={()=>onDragStart(btn.id)}
                onDragOver={e=>{e.preventDefault();onDragOver(btn.id);}}
                onDrop={onDrop}
                style={{ opacity: dragOver===btn.id?0.4:1 }}>
                <button title={btn.label} onClick={()=>handleTB(btn)}
                  style={{ padding:"3px 6px", border:`1px solid ${C.border}`, borderRadius:3,
                    cursor:"grab", background:C.white, color:C.gray, fontSize:11,
                    fontWeight:["bold","italic"].includes(btn.id)?"bold":"normal",
                    fontStyle:btn.id==="italic"?"italic":"normal",
                    textDecoration:btn.id==="underline"?"underline":"none",
                    minWidth:26, textAlign:"center" }}>
                  {btn.icon}
                </button>
              </div>
            ))}

            <div style={{ width:1, background:C.border, height:20, margin:"0 4px" }}/>
            <button title="Customise toolbar" onClick={()=>setShowTBE(p=>!p)}
              style={{ ...S.btn(showTBEditor), fontSize:10 }}>⚙ Toolbar</button>

            {/* Insert section */}
            <div style={{ width:1, background:C.border, height:20, margin:"0 4px" }}/>
            <button onClick={insertTable} style={{ ...S.btn(), fontSize:10 }}>⊞ Table</button>
            <button onClick={()=>{const s=prompt("Rows:","3");const c=prompt("Cols:","3");if(!s||!c)return;const r=parseInt(s),cl=parseInt(c);let html=`<table style="width:100%;border-collapse:collapse;margin:8px 0"><tr>${Array(cl).fill(0).map((_,i)=>`<th style="border:1px solid #999;padding:6px;background:#1a3a6b;color:#fff">Col ${i+1}</th>`).join("")}</tr>`;for(let i=0;i<r;i++)html+=`<tr>${Array(cl).fill(0).map(()=>`<td style="border:1px solid #ddd;padding:6px">&nbsp;</td>`).join("")}</tr>`;html+="</table>";exec("insertHTML",html);}} style={{ ...S.btn(), fontSize:10 }}>⊞ Custom Table</button>
            <button onClick={()=>{const today=new Date().toLocaleDateString("en-KE");exec("insertHTML",`<span>${today}</span>`);}} style={{ ...S.btn(), fontSize:10 }}>📅 Date</button>
            <button onClick={()=>{exec("insertHTML","<hr style='border:none;border-top:2px solid #1a3a6b;margin:12px 0'/>");}} style={{ ...S.btn(), fontSize:10 }}>─ Rule</button>
            <button onClick={()=>{exec("insertHTML","<div style='display:flex;justify-content:space-between;margin-top:30px;gap:20px'><div style='flex:1'><div style='border-top:1px solid #333;padding-top:4px'>Signature / Name</div></div><div style='flex:1'><div style='border-top:1px solid #333;padding-top:4px'>Designation / Date</div></div></div>");}} style={{ ...S.btn(), fontSize:10 }}>✍ Sig Block</button>
          </div>

          {/* Toolbar editor panel */}
          {showTBEditor && (
            <div style={{ background:"#fefce8", border:`1px solid ${C.border}`, borderTop:"none", padding:"8px 12px", display:"flex", flexWrap:"wrap", gap:6, alignItems:"center", maxHeight:120, overflowY:"auto" }}>
              <span style={{ fontSize:11, fontWeight:700, color:C.gray }}>Toggle buttons (drag toolbar buttons above to reorder):</span>
              {DEFAULT_TOOLBAR.map(btn=>(
                <label key={btn.id} style={{ display:"flex", alignItems:"center", gap:3, fontSize:11, cursor:"pointer" }}>
                  <input type="checkbox" checked={toolbarVis.has(btn.id)}
                    onChange={e=>{setTBVis(prev=>{const s=new Set(prev);e.target.checked?s.add(btn.id):s.delete(btn.id);return s;});}}/>
                  {btn.label}
                </label>
              ))}
              <button onClick={()=>{setToolbar(DEFAULT_TOOLBAR);setTBVis(new Set(DEFAULT_TOOLBAR.map(t=>t.id)));}} style={{ ...S.btn(), fontSize:10, marginLeft:"auto" }}>↺ Reset</button>
            </div>
          )}

          {/* Editor area */}
          <div style={{ flex:1, overflowY:"auto", background:"#d5d8dc", padding:"20px", display:"flex", justifyContent:"center" }}>
            <div style={{ background:"#fff", width:"210mm", minHeight:"297mm", padding:"20mm 25mm", boxShadow:"0 4px 20px rgba(0,0,0,0.3)", position:"relative" }}>
              <div ref={editorRef} contentEditable
                suppressContentEditableWarning
                onInput={updateCounts}
                onKeyUp={updateCounts}
                style={{ outline:"none", minHeight:"240mm", fontFamily:fontFamily, fontSize:fontSize+"pt", lineHeight:1.6, color:"#111" }}
              />

              {/* ── Floating Add Signature button ──────────────────── */}
              <div style={{ position:"absolute", bottom:16, right:16, zIndex:50 }}>
                {showSigPicker && (
                  <div style={{ position:"absolute", bottom:"calc(100% + 8px)", right:0, width:260, background:"#fff", border:"1px solid #e5e7eb", borderRadius:8, boxShadow:"0 8px 24px rgba(0,0,0,.15)", padding:12, zIndex:100 }}
                    onClick={e=>e.stopPropagation()}>
                    <div style={{ fontSize:11, fontWeight:700, color:"#374151", marginBottom:8, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span>✍ Insert Signature</span>
                      <button onClick={()=>setShowSigPicker(false)} style={{ background:"none", border:"none", cursor:"pointer", color:"#9ca3af", fontSize:16, lineHeight:1 }}>×</button>
                    </div>
                    {savedSigs.length === 0 ? (
                      <div style={{ fontSize:11, color:"#9ca3af", textAlign:"center", padding:"12px 0" }}>
                        No saved signatures.<br/>
                        <button onClick={()=>{setShowSigPicker(false);setTab("signatures");}} style={{ marginTop:6, fontSize:11, color:"#0078d4", background:"none", border:"none", cursor:"pointer", fontWeight:600 }}>Go to Signatures tab →</button>
                      </div>
                    ) : (
                      <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:200, overflowY:"auto" }}>
                        {savedSigs.map((sig:any) => (
                          <button key={sig.id}
                            onClick={() => {
                              editorRef.current?.focus();
                              document.execCommand("insertHTML", false,
                                `<img src="${sig.image_data}" alt="${sig.label||"Signature"}" style="height:48px;vertical-align:middle;margin:4px 8px;border-bottom:1px solid #999" title="${sig.label||"Signature"}" />&nbsp;`);
                              setShowSigPicker(false);
                              toast({ title: `✍ Signature inserted` });
                            }}
                            style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 8px", background:"#f9fafb", border:"1px solid #e5e7eb", borderRadius:5, cursor:"pointer", textAlign:"left" }}>
                            <img src={sig.image_data} alt="sig" style={{ height:28, maxWidth:80, objectFit:"contain" }}/>
                            <div style={{ fontSize:11, color:"#374151", fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{sig.label||"Signature"}</div>
                          </button>
                        ))}
                      </div>
                    )}
                    <div style={{ borderTop:"1px solid #f3f4f6", marginTop:8, paddingTop:8 }}>
                      <button onClick={()=>{
                        const ph = `<div style="display:inline-flex;flex-direction:column;align-items:center;margin:8px 16px;gap:2px">`+
                          `<div style="width:160px;height:2px;background:#333"></div>`+
                          `<div style="font-size:9pt;color:#555">Signature &amp; Date</div></div>`;
                        editorRef.current?.focus();
                        document.execCommand("insertHTML", false, ph);
                        setShowSigPicker(false);
                      }}
                        style={{ width:"100%", padding:"6px", background:"#f0f9ff", border:"1px solid #bae6fd", borderRadius:4, fontSize:11, color:"#0369a1", fontWeight:600, cursor:"pointer" }}>
                        + Insert Signature Line
                      </button>
                    </div>
                  </div>
                )}
                <button
                  onClick={()=>{ if (savedSigs.length===0) loadSigData(); setShowSigPicker(p=>!p); }}
                  style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", background:showSigPicker?"#1d4ed8":"#0078d4", color:"#fff", border:"none", borderRadius:20, fontSize:12, fontWeight:700, cursor:"pointer", boxShadow:"0 4px 12px rgba(0,120,212,.4)", transition:"background .15s" }}>
                  ✍ Add Signature
                </button>
              </div>
            </div>
          </div>

          {/* Status bar */}
          <div style={{ background:C.toolbar, borderTop:`1px solid ${C.border}`, padding:"3px 12px", display:"flex", gap:16, fontSize:10, color:C.gray2 }}>
            <span>Words: <strong>{wordCount}</strong></span>
            <span>Characters: <strong>{charCount}</strong></span>
            <span>Document: <strong>{docName}</strong></span>
            <span>Category: <strong>{docCat}</strong></span>
            {docId && <span style={{color:"#16a34a",fontWeight:700}}>✓ Saved</span>}
            {docPublished && <span style={{color:"#0078d4",fontWeight:700}}>● Published</span>}
            <span style={{ marginLeft:"auto" }}>{new Date().toLocaleString("en-KE")}</span>
          </div>
        </div>
      )}

      {/* ══════════ TEMPLATES TAB ════════════════════════════════ */}
      {tab==="templates" && (
        <div style={{ flex:1, overflowY:"auto", padding:16 }}>
          <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap", alignItems:"center" }}>
            <input value={tplSearch} onChange={e=>setTplSearch(e.target.value)} placeholder="🔍 Search templates…"
              style={{ ...S.inp, width:240 }} />
            <span style={{ fontSize:11, color:C.gray2 }}>Category:</span>
            {tplCats.map(c=>(
              <button key={c} onClick={()=>setTplCat(c)}
                style={{ ...S.btn(tplCat===c), fontSize:11 }}>{c}</button>
            ))}
            <span style={{ marginLeft:"auto", fontSize:11, color:C.gray2 }}>{filteredTpls.length} templates</span>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:12 }}>
            {filteredTpls.map(t=>(
              <div key={t.id} style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:4, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.08)" }}>
                <div style={{ background:C.blue, color:"#fff", padding:"8px 12px", display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:18 }}>{t.icon}</span>
                  <div>
                    <div style={{ fontWeight:700, fontSize:12 }}>{t.name}</div>
                    <div style={{ fontSize:10, opacity:.8 }}>{t.cat}</div>
                  </div>
                </div>
                <div style={{ padding:12 }}>
                  <div style={{ fontSize:11, color:C.gray2, marginBottom:10, minHeight:36 }}>{t.desc}</div>
                  {/* Mini preview */}
                  <div style={{ border:`1px solid ${C.border}`, borderRadius:2, padding:6, marginBottom:10, maxHeight:80, overflow:"hidden", fontSize:8, lineHeight:1.4, color:"#555", background:C.gray3 }}
                    dangerouslySetInnerHTML={{ __html: t.body.replace(/<[^>]+>/g," ").slice(0,400) }}/>
                  <div style={{ display:"flex", gap:6 }}>
                    <button onClick={()=>{
                      if(editorRef.current) editorRef.current.innerHTML = t.body;
                      setDocName(t.name); setDocCat(t.cat==="Government Forms"?"Report":t.cat);
                      updateCounts(); setTab("writer");
                      toast({title:`✓ Template loaded: ${t.name}`});
                    }} style={{ ...S.btn(true), flex:1, justifyContent:"center", fontSize:11 }}>
                      ✏ Open in Writer
                    </button>
                    <button onClick={()=>{
                      const win=window.open("","_blank","width=900,height=700");
                      if(!win)return;
                      win.document.write(`<!DOCTYPE html><html><head><title>${t.name}</title><style>@page{margin:2cm}body{font-family:Times New Roman,serif;font-size:12pt;padding:20px}</style></head><body>${t.body}<script>window.onload=()=>{window.print();window.close();}</script></body></html>`);
                      win.document.close();
                    }} style={{ ...S.btn(), fontSize:11 }}>🖨</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════ REPORTS TAB ══════════════════════════════════ */}
      {tab==="reports" && (
        <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
          {/* Module sidebar */}
          <div style={{ width:180, background:C.blue, overflowY:"auto", flexShrink:0 }}>
            <div style={{ padding:"8px 12px", color:"rgba(255,255,255,0.6)", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".08em" }}>Modules</div>
            {REPORT_MODS.map(m=>(
              <button key={m.id} onClick={()=>loadReport(m)}
                style={{ width:"100%", textAlign:"left", padding:"8px 14px", border:"none", cursor:"pointer",
                  background:repMod.id===m.id?"rgba(255,255,255,0.2)":"transparent",
                  color:"#fff", fontSize:11, borderLeft:repMod.id===m.id?"3px solid #fff":"3px solid transparent",
                  display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:14 }}>{m.icon}</span>{m.label}
              </button>
            ))}
            <div style={{ padding:"10px 12px 4px", color:"rgba(255,255,255,0.6)", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".08em", borderTop:"1px solid rgba(255,255,255,0.15)", marginTop:6 }}>System</div>
            <a href="https://yvjfehnzbzjliizjvuhq.supabase.co/functions/v1/keepalive-dashboard" target="_blank" rel="noopener noreferrer"
              style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 14px", color:"#fff", fontSize:11, textDecoration:"none" }}>
              <span style={{ fontSize:14 }}>💓</span>Keepalive bots status
            </a>
          </div>

          {/* Report content */}
          <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
            {/* Report toolbar */}
            <div style={{ background:C.toolbar, borderBottom:`1px solid ${C.border}`, padding:"6px 10px", display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
              <span style={{ fontWeight:700, fontSize:12 }}>{repMod.icon} {repMod.label}</span>
              <div style={{ width:1, background:C.border, height:20, margin:"0 4px" }}/>
              <input value={repFilter} onChange={e=>setRepFilter(e.target.value)} placeholder="🔍 Search…"
                style={{ ...S.inp, width:180 }}/>
              <select value={repStatus} onChange={e=>setRepStatus(e.target.value)} style={S.inp}>
                {["ALL","draft","pending","approved","active","paid","closed","rejected"].map(s=><option key={s}>{s}</option>)}
              </select>
              <input type="date" value={repDateFrom} onChange={e=>setRepDF(e.target.value)} style={{ ...S.inp, width:130 }}/>
              <input type="date" value={repDateTo}   onChange={e=>setRepDT(e.target.value)} style={{ ...S.inp, width:130 }}/>
              <button onClick={()=>loadReport(repMod)} style={{ ...S.btn(true), fontSize:11 }}>🔄 Load</button>
              <button onClick={printReport} disabled={!filteredRep.length} style={{ ...S.btn(), fontSize:11 }}>🖨 Print PDF</button>
              <button onClick={pasteReportToEditor} disabled={!filteredRep.length} style={{ ...S.btn(), fontSize:11 }}>📋 Insert to Writer</button>
              <button onClick={()=>{
                const csv=[repMod.cols.map(c=>c.label).join(","),...filteredRep.map(r=>repMod.cols.map(c=>`"${c.fmt?c.fmt(r[c.key],r):String(r[c.key]||"")}"`).join(","))].join("\n");
                const a=document.createElement("a");a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(csv);a.download=`${repMod.label}-${new Date().toISOString().slice(0,10)}.csv`;a.click();
              }} disabled={!filteredRep.length} style={{ ...S.btn(), fontSize:11 }}>📤 CSV</button>
              <span style={{ marginLeft:"auto", fontSize:11, color:C.gray2 }}>
                {repLoading?"⏳ Loading…":`${filteredRep.length} / ${repRows.length} records`}
              </span>
            </div>

            {/* Report grid */}
            <div style={{ flex:1, overflowX:"auto", overflowY:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                <thead>
                  <tr>{repMod.cols.map(c=>(
                    <th key={c.key} style={S.th}>{c.label}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {repLoading && <tr><td colSpan={repMod.cols.length} style={{ ...S.td, textAlign:"center", padding:20, color:C.gray2 }}>⏳ Loading {repMod.label}…</td></tr>}
                  {!repLoading && filteredRep.length===0 && <tr><td colSpan={repMod.cols.length} style={{ ...S.td, textAlign:"center", padding:20, color:C.gray2 }}>No records found</td></tr>}
                  {filteredRep.map((row,i)=>(
                    <tr key={row.id||i} style={{ background:i%2===0?C.white:"#f8fafc" }}
                      onMouseEnter={e=>(e.currentTarget.style.background=C.blue3)}
                      onMouseLeave={e=>(e.currentTarget.style.background=i%2===0?C.white:"#f8fafc")}>
                      {repMod.cols.map(c=>(
                        <td key={c.key} style={{ ...S.td, maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {c.fmt ? c.fmt(row[c.key],row) : String(row[c.key]||"—")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary bar */}
            {filteredRep.length>0 && (
              <div style={{ background:"#f0fdf4", borderTop:`1px solid ${C.border}`, padding:"4px 10px", fontSize:10, color:C.gray2, display:"flex", gap:12 }}>
                <span>Total records: <strong>{filteredRep.length}</strong></span>
                {repMod.cols.find(c=>c.key.includes("amount")||c.key.includes("value")||c.key.includes("price")||c.key.includes("budget")) && (
                  <span>Total amount: <strong>{FMT_KES(filteredRep.reduce((a,r)=>a+(r[repMod.cols.find(c=>c.key.includes("amount")||c.key.includes("value")||c.key.includes("price"))?.key||""]||0),0))}</strong></span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════ SIGNATURES TAB ══════════════════════════════ */}
      {tab==="signatures" && (
        <div style={{ flex:1, overflowY:"auto", padding:12, display:"flex", flexDirection:"column", gap:12 }}>

          {/* Sig mode selector */}
          <div style={{ display:"flex", gap:0, borderRadius:6, overflow:"hidden", border:`1px solid ${C.border}`, alignSelf:"flex-start" }}>
            {[{id:"draw",icon:"✏",label:"Draw Signature"},{id:"upload",icon:"⬆",label:"Upload Signature"},{id:"stamp",icon:"🔖",label:"Org Stamp"}].map(m=>(
              <button key={m.id} onClick={()=>setSigMode(m.id as any)}
                style={{ padding:"7px 18px", border:"none", cursor:"pointer", fontSize:12,
                  background:sigMode===m.id?C.blue:"#f8fafc", color:sigMode===m.id?"#fff":C.gray,
                  fontWeight:sigMode===m.id?700:400, borderRight:`1px solid ${C.border}` }}>
                {m.icon} {m.label}
              </button>
            ))}
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>

            {/* Left: create/upload panel */}
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>

              {/* Draw mode */}
              {sigMode==="draw" && (
                <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:6, padding:12 }}>
                  <div style={{ fontWeight:700, fontSize:12, color:C.blue, marginBottom:8 }}>✏ Draw Your Signature</div>
                  <div style={{ position:"relative", background:"#f0f4ff", borderRadius:6, border:`1px dashed ${C.blue2}`, marginBottom:8 }}>
                    <canvas ref={sigCanvasRef} width={480} height={150}
                      style={{ display:"block", width:"100%", height:150, cursor:"crosshair", borderRadius:6 }}
                      onMouseDown={e=>canvasDraw(e,"start")}
                      onMouseMove={e=>canvasDraw(e,"move")}
                      onMouseUp={e=>canvasDraw(e,"end")}
                      onMouseLeave={e=>canvasDraw(e,"end")} />
                    <div style={{ position:"absolute", top:6, right:8, fontSize:10, color:"#9ca3af", pointerEvents:"none" }}>Sign here ↓</div>
                  </div>
                  <div style={{ display:"flex", gap:6, marginBottom:8 }}>
                    <input value={sigLabel} onChange={e=>setSigLabel(e.target.value)} placeholder="Label (e.g. Dr. John Mwangi)"
                      style={{ ...S.inp, flex:1 }} />
                    <button onClick={clearCanvas} style={{ ...S.btn(), fontSize:11, color:C.red }}>🗑 Clear</button>
                    <button onClick={saveSig} disabled={sigSaving||!sigData} style={{ ...S.btn(true), fontSize:11, opacity:sigSaving||!sigData?.5:1 }}>
                      {sigSaving?"Saving…":"💾 Save Sig"}
                    </button>
                  </div>
                </div>
              )}

              {/* Upload signature mode */}
              {sigMode==="upload" && (
                <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:6, padding:12 }}>
                  <div style={{ fontWeight:700, fontSize:12, color:C.blue, marginBottom:8 }}>⬆ Upload Signature Image</div>
                  <div style={{ fontSize:11, color:C.gray2, marginBottom:8 }}>Upload a scanned signature or digital signature image (PNG, JPEG, BMP)</div>
                  <input ref={sigUploadRef} type="file" accept="image/*"
                    style={{ display:"none" }}
                    onChange={async e=>{
                      const f=e.target.files?.[0]; if(!f)return;
                      const b64=await fileToB64(f); setSigData(b64);
                    }} />
                  <div style={{ border:`2px dashed ${C.blue2}`, borderRadius:8, padding:24, textAlign:"center", marginBottom:8,
                    background: sigData?"#eff6ff":"#f8fafc", cursor:"pointer" }}
                    onClick={()=>sigUploadRef.current?.click()}>
                    {sigData
                      ? <img src={sigData} alt="preview" style={{ maxWidth:280, maxHeight:100, objectFit:"contain" }} />
                      : <div style={{ color:C.gray2, fontSize:12 }}>📁 Click to browse or drag & drop<br/><span style={{ fontSize:10 }}>PNG · JPEG · BMP · GIF — scanned or digital</span></div>
                    }
                  </div>
                  <div style={{ display:"flex", gap:6 }}>
                    <input value={sigLabel} onChange={e=>setSigLabel(e.target.value)} placeholder="Signee name / label"
                      style={{ ...S.inp, flex:1 }} />
                    {sigData && <button onClick={()=>setSigData("")} style={{ ...S.btn(), fontSize:11, color:C.red }}>✕</button>}
                    <button onClick={saveSig} disabled={sigSaving||!sigData} style={{ ...S.btn(true), fontSize:11, opacity:!sigData?.5:1 }}>
                      {sigSaving?"Saving…":"💾 Save"}
                    </button>
                  </div>
                </div>
              )}

              {/* Stamp mode */}
              {sigMode==="stamp" && (
                <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:6, padding:12 }}>
                  <div style={{ fontWeight:700, fontSize:12, color:C.blue, marginBottom:8 }}>🔖 Organisation Stamp</div>
                  <div style={{ fontSize:11, color:C.gray2, marginBottom:8 }}>Upload official EL5H / Embu County stamp image (PNG with transparent background recommended)</div>
                  <input ref={sigStampRef} type="file" accept="image/*"
                    style={{ display:"none" }}
                    onChange={async e=>{
                      const f=e.target.files?.[0]; if(!f)return;
                      const b64=await fileToB64(f); setStampData(b64);
                    }} />
                  <div style={{ border:`2px dashed #9333ea`, borderRadius:8, padding:24, textAlign:"center", marginBottom:8,
                    background: stampData?"#f5f3ff":"#f8fafc", cursor:"pointer" }}
                    onClick={()=>sigStampRef.current?.click()}>
                    {stampData
                      ? <img src={stampData} alt="stamp" style={{ maxWidth:150, maxHeight:150, objectFit:"contain" }} />
                      : <div style={{ color:C.gray2, fontSize:12 }}>📁 Click to upload stamp image<br/><span style={{ fontSize:10 }}>PNG with transparency works best</span></div>
                    }
                  </div>
                  <div style={{ display:"flex", gap:6 }}>
                    <input value={stampLabel} onChange={e=>setStampLabel(e.target.value)} placeholder="Stamp label (e.g. Official Seal)"
                      style={{ ...S.inp, flex:1 }} />
                    {stampData && <button onClick={()=>setStampData("")} style={{ ...S.btn(), fontSize:11, color:C.red }}>✕</button>}
                    <button onClick={saveStamp} disabled={sigSaving||!stampData} style={{ ...S.btn(true), fontSize:11, background:"#9333ea", opacity:!stampData?.5:1 }}>
                      {sigSaving?"Saving…":"💾 Save Stamp"}
                    </button>
                  </div>
                </div>
              )}

              {/* Insert Placeholder */}
              <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:6, padding:12 }}>
                <div style={{ fontWeight:700, fontSize:12, color:C.blue, marginBottom:8 }}>📌 Insert Signature Placeholders</div>
                <div style={{ fontSize:11, color:C.gray2, marginBottom:8 }}>Click a role to insert a dashed signature placeholder box into your document</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                  {["Procurement Officer","Procurement Manager","CEO / Hospital Director","Finance Manager","Accountant",
                    "Storekeeper","HOD","Supplier Representative","Auditor","Witness","Authorized Signatory","Date"].map(role=>(
                    <button key={role} onClick={()=>insertSigPlaceholder(role)}
                      style={{ padding:"5px 10px", border:`1px dashed ${C.blue2}`, borderRadius:4, cursor:"pointer",
                        background:"#eff6ff", color:C.blue2, fontSize:10, fontWeight:600 }}>
                      + {role}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: saved signatures + stamps + signees */}
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>

              {/* Saved Signatures */}
              <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:6, padding:12 }}>
                <div style={{ fontWeight:700, fontSize:12, color:C.blue, marginBottom:8, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span>✍ Saved Signatures</span>
                  <button onClick={loadSigData} style={{ ...S.btn(), fontSize:10 }}>🔄</button>
                </div>
                {sigLoading && <div style={{ fontSize:11, color:C.gray2, padding:10, textAlign:"center" }}>Loading…</div>}
                {!sigLoading && savedSigs.length===0 && <div style={{ fontSize:11, color:C.gray2, textAlign:"center", padding:10 }}>No saved signatures yet</div>}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                  {savedSigs.map((s:any)=>(
                    <div key={s.id} style={{ border:`1px solid ${selSig?.id===s.id?C.blue2:C.border}`, borderRadius:4, padding:6, cursor:"pointer",
                      background:selSig?.id===s.id?C.blue3:C.white }}
                      onClick={()=>setSelSig(s)}>
                      {s.image_base64 && <img src={s.image_base64} alt={s.label} style={{ width:"100%", height:50, objectFit:"contain", display:"block" }} />}
                      <div style={{ fontSize:10, textAlign:"center", marginTop:3, color:C.gray }}>{s.label||"Signature"}</div>
                      <div style={{ display:"flex", gap:3, marginTop:4 }}>
                        <button onClick={e=>{e.stopPropagation();insertSigBlock(s.image_base64,s.label||"Signature");}}
                          style={{ ...S.btn(true), fontSize:9, padding:"2px 6px", flex:1 }}>Insert ↓</button>
                        <button onClick={e=>{e.stopPropagation();if(confirm("Delete?"))db.from("user_signatures").delete().eq("id",s.id).then(()=>loadSigData());}}
                          style={{ ...S.btn(), fontSize:9, padding:"2px 4px", color:C.red }}>🗑</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Saved Stamps */}
              <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:6, padding:12 }}>
                <div style={{ fontWeight:700, fontSize:12, color:"#9333ea", marginBottom:8 }}>🔖 Organisation Stamps</div>
                {savedStamps.length===0 && <div style={{ fontSize:11, color:C.gray2, textAlign:"center", padding:8 }}>No stamps uploaded yet</div>}
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {savedStamps.map((s:any)=>(
                    <div key={s.id} style={{ border:`1px solid ${selStamp?.id===s.id?"#9333ea":C.border}`, borderRadius:4, padding:6, cursor:"pointer",
                      background:selStamp?.id===s.id?"#f5f3ff":C.white, textAlign:"center" }}
                      onClick={()=>setSelStamp(s)}>
                      {s.image_base64 && <img src={s.image_base64} alt={s.label} style={{ width:70, height:70, objectFit:"contain", display:"block", margin:"0 auto" }} />}
                      <div style={{ fontSize:9, color:C.gray, marginTop:3 }}>{s.label}</div>
                      <button onClick={e=>{e.stopPropagation();insertSigBlock(s.image_base64,s.label||"Stamp",true);}}
                        style={{ ...S.btn(true), fontSize:9, padding:"2px 8px", marginTop:3, background:"#9333ea" }}>Insert</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scheduled Signees */}
              <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:6, padding:12 }}>
                <div style={{ fontWeight:700, fontSize:12, color:C.blue, marginBottom:8, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span>📅 Scheduled Signees</span>
                  {signees.some(s=>s.status==="pending") && (
                    <button onClick={notifyAllPending} style={{ ...S.btn(true), fontSize:10, padding:"3px 9px" }}>🔔 Notify All Pending</button>
                  )}
                </div>
                {!docId && <div style={{ fontSize:11, color:"#b45309", background:"#fffbeb", borderRadius:4, padding:"6px 10px", marginBottom:8 }}>Save the document first to add signees</div>}
                {/* Add signee form */}
                <div style={{ background:C.gray3, borderRadius:6, padding:8, marginBottom:8 }}>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:6 }}>
                    <input value={newSignee.name} onChange={e=>setNewSignee(p=>({...p,name:e.target.value}))} placeholder="Full name *"
                      style={{ ...S.inp, fontSize:11 }} />
                    <input value={newSignee.role} onChange={e=>setNewSignee(p=>({...p,role:e.target.value}))} placeholder="Role / Title"
                      style={{ ...S.inp, fontSize:11 }} />
                    <input value={newSignee.email} onChange={e=>setNewSignee(p=>({...p,email:e.target.value}))} placeholder="Email"
                      style={{ ...S.inp, fontSize:11 }} type="email" />
                    <input value={newSignee.due} onChange={e=>setNewSignee(p=>({...p,due:e.target.value}))} placeholder="Due date"
                      style={{ ...S.inp, fontSize:11 }} type="date" />
                  </div>
                  <input value={newSignee.note} onChange={e=>setNewSignee(p=>({...p,note:e.target.value}))} placeholder="Note (optional)"
                    style={{ ...S.inp, fontSize:11, width:"100%", marginBottom:6, boxSizing:"border-box" as const }} />
                  <button onClick={addSignee} disabled={sigSaving||!docId} style={{ ...S.btn(true), fontSize:11, opacity:!docId?.5:1 }}>
                    {sigSaving?"Adding…":"+ Add Signee"}
                  </button>
                </div>
                {/* Signee list */}
                {signees.length===0 && <div style={{ fontSize:11, color:C.gray2, textAlign:"center", padding:6 }}>No signees scheduled</div>}
                {signees.map((sn:any)=>(
                  <div key={sn.id} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 8px",
                    border:`1px solid ${C.border}`, borderRadius:4, marginBottom:4, background:C.white }}>
                    {sn.status==="signed" && sn.signature_image && (
                      <img src={sn.signature_image} alt="signature" style={{ height:24, maxWidth:60, objectFit:"contain", borderBottom:"1px solid #d1d5db" }} />
                    )}
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:C.blue }}>{sn.signee_name}</div>
                      <div style={{ fontSize:10, color:C.gray2 }}>
                        {sn.signee_role && <span>{sn.signee_role} · </span>}
                        {sn.signee_email && <span>{sn.signee_email} · </span>}
                        {sn.due_date && <span>Due: {FMT_DT(sn.due_date)}</span>}
                      </div>
                    </div>
                    <span style={{ fontSize:10, padding:"2px 7px", borderRadius:10, fontWeight:700,
                      background: sn.status==="signed"?C.green3:sn.status==="declined"||sn.status==="rejected"?C.red3:"#fef9c3",
                      color: sn.status==="signed"?C.green:sn.status==="declined"||sn.status==="rejected"?C.red:"#854d0e" }}>
                      {sn.status||"pending"}
                    </span>
                    {sn.status==="pending" && (
                      <button onClick={()=>notifySignee(sn)} disabled={notifying.has(sn.id)||!sn.signee_email}
                        title={sn.notified_at?`Last notified ${FMT_DT(sn.notified_at)} · click to remind again`:"Send sign request email + in-app notification"}
                        style={{ ...S.btn(sn.notified_at?false:true), fontSize:9, padding:"2px 7px", opacity:notifying.has(sn.id)?.5:1 }}>
                        {notifying.has(sn.id)?"…":sn.notified_at?"🔔 Remind":"🔔 Notify"}
                      </button>
                    )}
                    <button onClick={()=>insertSigPlaceholder(sn.signee_role||sn.signee_name)}
                      style={{ ...S.btn(true), fontSize:9, padding:"2px 7px" }}>Insert ↓</button>
                    <button onClick={()=>removeSignee(sn.id)}
                      style={{ ...S.btn(), fontSize:9, padding:"2px 4px", color:C.red }}>🗑</button>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ══════════ LIBRARY TAB ══════════════════════════════════ */}
      {tab==="library" && (
        <div style={{ flex:1, overflowY:"auto", padding:12 }}>
          <div style={{ display:"flex", gap:8, marginBottom:12, alignItems:"center" }}>
            <input value={libSearch} onChange={e=>setLibSearch(e.target.value)}
              placeholder="🔍 Search library…" style={{ ...S.inp, width:260 }}/>
            <button onClick={loadLibrary} style={{ ...S.btn(), fontSize:11 }}>🔄 Refresh</button>
            <button onClick={()=>{setDocId(null);setDocName("Untitled Document");setDocCat("General");if(editorRef.current)editorRef.current.innerHTML="";setTab("writer");}} style={{ ...S.btn(true), fontSize:11 }}>➕ New Document</button>
            <span style={{ marginLeft:"auto", fontSize:11, color:C.gray2 }}>{filteredLib.length} documents</span>
          </div>
          {libLoading && <div style={{ textAlign:"center", padding:40, color:C.gray2 }}>⏳ Loading library…</div>}
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
            <thead>
              <tr>
                {["Name","Category","Template","Size","Saved By","Date","Actions"].map(h=>(
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredLib.length===0 && !libLoading && (
                <tr><td colSpan={7} style={{ ...S.td, textAlign:"center", padding:24, color:C.gray2 }}>No documents saved yet. Start writing in the Writer tab and save your work.</td></tr>
              )}
              {filteredLib.map((doc,i)=>(
                <tr key={doc.id} style={{ background:i%2===0?C.white:"#f8fafc" }}
                  onMouseEnter={e=>(e.currentTarget.style.background=C.blue3)}
                  onMouseLeave={e=>(e.currentTarget.style.background=i%2===0?C.white:"#f8fafc")}>
                  <td style={{ ...S.td, fontWeight:600, color:C.blue2 }}>{doc.name}</td>
                  <td style={S.td}>{doc.category||"General"}</td>
                  <td style={S.td}>{doc.is_template?<span style={{ background:C.blue3,color:C.blue2,padding:"1px 6px",borderRadius:10,fontSize:10,fontWeight:700 }}>Template</span>:"—"}</td>
                  <td style={S.td}>{doc.file_size?`${Math.round(doc.file_size/1024)} KB`:"—"}</td>
                  <td style={S.td}>{doc.created_by_name||doc.created_by_email||"System"}</td>
                  <td style={S.td}>{FMT_DT(doc.created_at)}</td>
                  <td style={{ ...S.td, whiteSpace:"nowrap" }}>
                    <div style={{ display:"flex", gap:4 }}>
                      <button onClick={()=>{loadDoc(doc.id);setTab("writer");}} style={{ ...S.btn(true), fontSize:10, padding:"2px 6px" }}>✏ Open</button>
                      <button onClick={()=>{
                        const win=window.open("","_blank","width=900,height=700");
                        if(!win)return;
                        win.document.write(`<!DOCTYPE html><html><head><title>${doc.name}</title><style>@page{margin:2cm}body{font-family:Times New Roman,serif;padding:20px}</style></head><body><div style="text-align:center;border-bottom:3px solid #1a3a6b;padding-bottom:12px;margin-bottom:20px"><div style="font-size:8pt;color:#555">REPUBLIC OF KENYA · COUNTY GOVERNMENT OF EMBU</div><div style="font-size:15pt;font-weight:bold;color:#1a3a6b">EMBU LEVEL 5 HOSPITAL</div></div>${doc.template_html||""}<script>window.onload=()=>{window.print();window.close();}</script></body></html>`);
                        win.document.close();
                      }} style={{ ...S.btn(), fontSize:10, padding:"2px 6px" }}>🖨</button>
                      <button onClick={async()=>{if(!confirm(`Delete "${doc.name}"?`))return;await db.from("documents").delete().eq("id",doc.id);loadLibrary();toast({title:"✓ Deleted"});}} style={{ ...S.btn(), fontSize:10, padding:"2px 6px", color:C.red }}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* ══════════ BULK EMAIL MODAL ══════════════════════════════ */}
      {showBulkEmail && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={()=>!bulkSending && setShowBulkEmail(false)}>
          <div style={{ background:"#fff", borderRadius:10, width:440, maxWidth:"92vw", padding:20, boxShadow:"0 12px 40px rgba(0,0,0,.3)" }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ fontWeight:800, fontSize:14, color:C.blue, marginBottom:4 }}>📧 Email This Document</div>
            <div style={{ fontSize:11, color:C.gray2, marginBottom:12 }}>Sends via Gmail SMTP to multiple recipients at once.</div>
            <label style={{ fontSize:11, fontWeight:700, color:C.gray, display:"block", marginBottom:3 }}>Recipients (comma, semicolon, or newline separated)</label>
            <textarea value={bulkRecipients} onChange={e=>setBulkRecipients(e.target.value)} placeholder="jane@embulevel5.go.ke, john@embulevel5.go.ke"
              style={{ ...S.inp, width:"100%", height:60, boxSizing:"border-box" as const, marginBottom:10, resize:"vertical" as const }} />
            <label style={{ fontSize:11, fontWeight:700, color:C.gray, display:"block", marginBottom:3 }}>Subject</label>
            <input value={bulkSubject} onChange={e=>setBulkSubject(e.target.value)} placeholder={`Document shared: ${docName}`}
              style={{ ...S.inp, width:"100%", boxSizing:"border-box" as const, marginBottom:10 }} />
            <label style={{ fontSize:11, fontWeight:700, color:C.gray, display:"block", marginBottom:3 }}>Message (optional)</label>
            <textarea value={bulkMessage} onChange={e=>setBulkMessage(e.target.value)} placeholder="Add a personal note…"
              style={{ ...S.inp, width:"100%", height:70, boxSizing:"border-box" as const, marginBottom:14, resize:"vertical" as const }} />
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button onClick={()=>setShowBulkEmail(false)} disabled={bulkSending} style={{ ...S.btn(), fontSize:12 }}>Cancel</button>
              <button onClick={sendBulkEmail} disabled={bulkSending||!bulkRecipients.trim()} style={{ ...S.btn(true), fontSize:12, opacity:bulkSending?.6:1 }}>
                {bulkSending?"Sending…":"📧 Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
