/**
 * EL5 MediProcure — Centralized Document Print Utility
 * All printed documents use black font, A4 layout, professional letterhead.
 * Usage: printDocument("REQ", data, settings)
 */

export interface PrintSettings {
  hospitalName?:    string;
  sysName?:         string;
  docFooter?:       string;
  currencySymbol?:  string;
  printFont?:       string;
  printFontSize?:   string;
  showLogo?:        boolean;
  showStamp?:       boolean;
  showWatermark?:   boolean;
  logoUrl?:         string;   // URL/path to hospital logo image
  hospitalAddress?: string;
  hospitalPhone?:   string;
  hospitalEmail?:   string;
}

const DEF: Required<PrintSettings> = {
  hospitalName:    "Embu Level 5 Hospital",
  sysName:         "EL5 MediProcure",
  docFooter:       "Embu Level 5 Hospital · Embu County Government",
  currencySymbol:  "KES",
  printFont:       "Times New Roman",
  printFontSize:   "11",
  showLogo:        true,
  showStamp:       true,
  showWatermark:   false,
  logoUrl:         "",
  hospitalAddress: "Embu Town, Embu County, Kenya",
  hospitalPhone:   "+254 060 000000",
  hospitalEmail:   "info@embu.health.go.ke",
};

function merge(s?: PrintSettings): Required<PrintSettings> {
  return { ...DEF, ...s };
}

/** Generate a unique document serial number with timestamp + random */
function uniqueSerial(prefix: string, existingRef?: string): string {
  if (existingRef && existingRef !== "—" && existingRef !== "") return existingRef;
  const d = new Date();
  const yy = d.getFullYear().toString().slice(-2);
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  const rand = Math.floor(1000+Math.random()*9000);
  return `${prefix}-${yy}${mm}${dd}-${rand}`;
}

/** Validate all required print fields, return list of missing */
function missingFields(obj: Record<string,any>, required: string[]): string[] {
  return required.filter(k => !obj[k] || String(obj[k]).trim() === "" || obj[k] === "—");
}


/** Base print CSS — always black text, clean A4 */
function baseCss(s: Required<PrintSettings>): string {
  return `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: '${s.printFont}', 'Times New Roman', Times, serif;
      font-size: ${s.printFontSize}pt;
      color: #000;
      background: #fff;
      padding: 28px 36px;
    }
    @media print {
      body { padding: 10mm 14mm; }
      @page { size: A4; margin: 10mm 14mm; }
      .no-print { display: none !important; }
    }
    h1, h2, h3, p, td, th, div, span, label { color: #000; }
    .doc-header { text-align: center; margin-bottom: 14px; border-bottom: 3px double #000; padding-bottom: 10px; }
    .doc-title  { font-size: 17pt; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; color: #000; }
    .doc-sub    { font-size: 10pt; color: #000; margin-top: 3px; }
    .doc-org    { font-size: 11pt; font-weight: 700; color: #000; margin-top: 2px; }
    .divider    { border: none; border-top: 2px solid #000; margin: 8px 0 14px; }
    .thin-divider { border: none; border-top: 1px solid #000; margin: 6px 0 10px; }
    .two-col    { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-bottom: 16px; }
    .three-col  { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 16px; }
    .section-title {
      font-size: 10pt; font-weight: 900; text-transform: uppercase;
      letter-spacing: 0.8px; margin-bottom: 8px; color: #000;
      border-bottom: 1.5px solid #000; padding-bottom: 3px;
    }
    .info-line  { display: flex; margin-bottom: 5px; font-size: 10.5pt; }
    .info-label { font-weight: 700; min-width: 170px; flex-shrink: 0; color: #000; }
    .info-val   { border-bottom: 1px solid #555; flex: 1; min-height: 15px; color: #000; padding-left: 4px; }
    .meta-badge { display: inline-block; border: 1px solid #000; padding: 2px 8px; font-size: 9pt; font-weight: 700; text-transform: uppercase; margin-right: 8px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    .tbl-title  { background: #000; color: #fff; text-align: center; font-size: 10.5pt; font-weight: 900; text-transform: uppercase; letter-spacing: 0.6px; padding: 6px; border: 1.5px solid #000; }
    .tbl-hdr    { background: #333; color: #fff; font-size: 9.5pt; font-weight: 700; text-transform: uppercase; padding: 5px 7px; border: 1px solid #000; text-align: left; }
    .tbl-hdr-c  { text-align: center; }
    .tbl-hdr-r  { text-align: right; }
    td          { border: 1px solid #555; padding: 4px 6px; font-size: 10pt; color: #000; }
    tr:nth-child(even) td { background: #f7f7f7; }
    .totals-tbl { width: auto; margin-left: auto; margin-bottom: 16px; }
    .totals-tbl td { border: 1.5px solid #000; padding: 5px 12px; font-size: 10.5pt; }
    .totals-lbl { background: #eee; font-weight: 700; text-transform: uppercase; width: 160px; }
    .totals-val { text-align: right; font-weight: 700; min-width: 140px; }
    .totals-grand td { background: #000; color: #fff; font-weight: 900; font-size: 11pt; }
    .remarks-box { border: 1px solid #000; min-height: 56px; padding: 8px; font-size: 10pt; color: #000; margin-bottom: 18px; }
    .sig-grid   { display: grid; gap: 20px; margin-top: 30px; }
    .sig-grid-4 { grid-template-columns: repeat(4, 1fr); }
    .sig-grid-3 { grid-template-columns: repeat(3, 1fr); }
    .sig-grid-2 { grid-template-columns: repeat(2, 1fr); }
    .sig-box    { text-align: center; }
    .sig-line   { border-top: 1.5px solid #000; margin-top: 36px; margin-bottom: 4px; }
    .sig-lbl    { font-size: 9.5pt; font-weight: 700; text-transform: uppercase; color: #000; }
    .sig-name   { font-size: 9pt; color: #000; margin-top: 4px; }
    .sig-date   { font-size: 8.5pt; color: #000; margin-top: 3px; }
    .stamp-box  { width: 80px; height: 80px; border: 2px solid #000; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 8pt; font-weight: 700; text-transform: uppercase; color: #000; margin-top: 8px; }
    .doc-footer { margin-top: 24px; border-top: 1.5px solid #000; padding-top: 7px; font-size: 8.5pt; color: #000; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 6px; }
    .status-box { display: inline-block; border: 2px solid #000; padding: 2px 10px; font-size: 10pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-left: 8px; }
  `;
}

function docHeader(s: Required<PrintSettings>, title: string, subtitle?: string): string {
  const logoHtml = s.showLogo && s.logoUrl
    ? `<img src="${s.logoUrl}" alt="Logo" style="height:70px;width:auto;object-fit:contain;max-width:120px;" onerror="this.style.display='none'"/>`
    : s.showLogo
      ? `<div style="width:70px;height:70px;border:2px solid #000;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9pt;font-weight:700;text-align:center;color:#000;">EMBU<br/>L5H</div>`
      : "";

  return `
    <div class="doc-header" style="display:flex;align-items:flex-start;gap:20px;text-align:left;">
      ${logoHtml ? `<div style="flex-shrink:0;">${logoHtml}</div>` : ""}
      <div style="flex:1;">
        <div class="doc-org" style="font-size:14pt;font-weight:900;letter-spacing:0.5px;">${s.hospitalName}</div>
        <div style="font-size:9.5pt;color:#000;margin-top:2px;">${s.hospitalAddress}</div>
        <div style="font-size:9pt;color:#000;margin-top:1px;">Tel: ${s.hospitalPhone} &nbsp;·&nbsp; ${s.hospitalEmail}</div>
        <div style="font-size:9pt;color:#000;margin-top:1px;">${s.sysName}</div>
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <div class="doc-title" style="font-size:15pt;">${title}</div>
        ${subtitle ? `<div style="font-size:10pt;font-weight:700;color:#000;margin-top:4px;border:1.5px solid #000;padding:2px 10px;display:inline-block;">${subtitle}</div>` : ""}
      </div>
    </div>
    <hr class="divider"/>
  `;
}

function docFooter(s: Required<PrintSettings>): string {
  return `
    <div class="doc-footer">
      <span>${s.docFooter}</span>
      <span>Printed: ${new Date().toLocaleString("en-KE")} &nbsp;·&nbsp; OFFICIAL DOCUMENT</span>
    </div>
  `;
}

function sigGrid(labels: string[], cols: 2 | 3 | 4 = 4, showStamp = false): string {
  const gridClass = `sig-grid sig-grid-${cols}`;
  return `
    <div class="${gridClass}">
      ${labels.map((l, i) => `
        <div class="sig-box">
          ${showStamp && i === labels.length - 1 ? `<div class="stamp-box">OFFICIAL<br/>STAMP</div>` : ""}
          <div class="sig-line"></div>
          <div class="sig-lbl">${l}</div>
          <div class="sig-name">Name: _______________________</div>
          <div class="sig-date">Date: _______________________</div>
        </div>`).join("")}
    </div>
  `;
}

function openPrint(html: string, title: string): void {
  const win = window.open("", "_blank", "width=920,height=720");
  if (!win) { alert("Please allow pop-ups to print."); return; }
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title>${html}</head><body>`);
  // body content injected via write below  
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 600);
}

// ─── REQUISITION ─────────────────────────────────────────────────────────────
export function printRequisition(r: any, cfg?: PrintSettings): void {
  const s = merge(cfg);
  // Ensure unique ref number
  r = { ...r, requisition_number: uniqueSerial("REQ", r.requisition_number) };
  // Warn on missing critical fields
  const missing = missingFields(r, ["title","department","requester_name"]);
  if (missing.length && !window.confirm(`Missing fields: ${missing.join(", ")}. Print anyway?`)) return;
  const items = r.requisition_items || [];
  const totalAmt = items.reduce((sum: number, i: any) => sum + ((i.quantity || 0) * (i.unit_price || 0)), 0) || (r.total_amount || 0);
  const padded = [...items, ...Array(Math.max(0, 8 - items.length)).fill(null)];

  const rows = padded.map((i: any) => `
    <tr style="height:26px">
      <td>${i ? (i.item_name || "") : ""}</td>
      <td>${i ? (i.description || "") : ""}</td>
      <td style="text-align:center">${i ? (i.unit_of_measure || "") : ""}</td>
      <td style="text-align:center">${i ? (i.quantity || "") : ""}</td>
      <td style="text-align:right">${i && i.unit_price ? Number(i.unit_price).toLocaleString("en-KE", { minimumFractionDigits: 2 }) : ""}</td>
      <td style="text-align:right">${i && i.quantity && i.unit_price ? Number((i.quantity || 0) * (i.unit_price || 0)).toLocaleString("en-KE", { minimumFractionDigits: 2 }) : ""}</td>
    </tr>`).join("");

  const win = window.open("", "_blank", "width=920,height=720");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Requisition — ${r.requisition_number || "Draft"}</title>
  <style>${baseCss(s)}</style></head><body>
  ${docHeader(s, "Requisition Form", r.requisition_number || "DRAFT")}
  <div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap">
    <span class="meta-badge">REF: ${r.requisition_number || "—"}</span>
    <span class="meta-badge">DATE: ${r.created_at ? new Date(r.created_at).toLocaleDateString("en-KE", { dateStyle: "long" }) : "—"}</span>
    <span class="meta-badge">PRIORITY: ${(r.priority || "Normal").toUpperCase()}</span>
    <span class="meta-badge">STATUS: ${(r.status || "Draft").toUpperCase()}</span>
  </div>
  <div class="two-col">
    <div>
      <div class="section-title">Requisition Details</div>
      <div class="info-line"><span class="info-label">TITLE / PURPOSE:</span><span class="info-val">${r.title || ""}</span></div>
      <div class="info-line"><span class="info-label">DEPARTMENT:</span><span class="info-val">${r.department || ""}</span></div>
      <div class="info-line"><span class="info-label">REQUESTED BY:</span><span class="info-val">${r.requester_name || ""}</span></div>
      <div class="info-line"><span class="info-label">DATE REQUIRED:</span><span class="info-val">${r.delivery_date ? new Date(r.delivery_date).toLocaleDateString("en-KE") : ""}</span></div>
      <div class="info-line"><span class="info-label">CATEGORY:</span><span class="info-val">${r.category || ""}</span></div>
    </div>
    <div>
      <div class="section-title">Approval Information</div>
      <div class="info-line"><span class="info-label">APPROVED BY:</span><span class="info-val">${r.approved_by_name || ""}</span></div>
      <div class="info-line"><span class="info-label">APPROVAL DATE:</span><span class="info-val">${r.approved_at ? new Date(r.approved_at).toLocaleDateString("en-KE") : ""}</span></div>
      <div class="info-line"><span class="info-label">PO REFERENCE:</span><span class="info-val">${r.po_reference || ""}</span></div>
      <div class="info-line"><span class="info-label">BUDGET HEAD:</span><span class="info-val">${r.budget_head || ""}</span></div>
      <div class="info-line"><span class="info-label">NOTES:</span><span class="info-val">${r.notes || ""}</span></div>
    </div>
  </div>
  <table>
    <tr><td colspan="6" class="tbl-title">REQUISITIONED ITEMS</td></tr>
    <tr>
      <th class="tbl-hdr" style="width:22%">ITEM NAME</th>
      <th class="tbl-hdr" style="width:28%">DESCRIPTION / SPECIFICATION</th>
      <th class="tbl-hdr tbl-hdr-c" style="width:9%">UOM</th>
      <th class="tbl-hdr tbl-hdr-c" style="width:9%">QTY</th>
      <th class="tbl-hdr tbl-hdr-r" style="width:16%">UNIT PRICE (${s.currencySymbol})</th>
      <th class="tbl-hdr tbl-hdr-r" style="width:16%">TOTAL (${s.currencySymbol})</th>
    </tr>
    ${rows}
  </table>
  <table class="totals-tbl">
    <tr><td class="totals-lbl">TOTAL ITEMS</td><td class="totals-val">${items.length}</td></tr>
    <tr><td class="totals-lbl">TOTAL AMOUNT</td><td class="totals-val">${s.currencySymbol} ${totalAmt.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</td></tr>
  </table>
  <div class="section-title">JUSTIFICATION / SPECIAL NOTES:</div>
  <div class="remarks-box">${r.notes || "&nbsp;"}</div>
  ${sigGrid(["Requested By", "Verified By", "Recommended By", "Approved By"], 4, s.showStamp)}
  ${docFooter(s)}
  </body></html>`);
  win.document.close(); win.focus(); setTimeout(() => win.print(), 600);
}

// ─── PURCHASE ORDER (LPO) ────────────────────────────────────────────────────
export function printPurchaseOrder(po: any, cfg?: PrintSettings): void {
  const s = merge(cfg);
  po = { ...po, po_number: uniqueSerial("PO", po.po_number) };
  const missing = missingFields(po, ["supplier_name","delivery_date"]);
  if (missing.length && !window.confirm(`Missing fields: ${missing.join(", ")}. Print anyway?`)) return;
  const items = po.line_items || po.items || [];
  if (!items.length && !window.confirm("No line items found. Print anyway?")) return;
  const totalAmt = po.total_amount || items.reduce((sum: number, i: any) => sum + ((i.quantity || 0) * (i.unit_price || 0)), 0);
  const padded = [...items, ...Array(Math.max(0, 6 - items.length)).fill(null)];

  const rows = padded.map((i: any, idx: number) => `
    <tr style="height:26px">
      <td style="text-align:center">${i ? idx + 1 : ""}</td>
      <td>${i ? (i.description || i.item_name || "") : ""}</td>
      <td style="text-align:center">${i ? (i.unit || i.unit_of_measure || "") : ""}</td>
      <td style="text-align:center">${i ? (i.quantity || "") : ""}</td>
      <td style="text-align:right">${i && i.unit_price ? Number(i.unit_price).toLocaleString("en-KE", { minimumFractionDigits: 2 }) : ""}</td>
      <td style="text-align:right">${i && i.quantity && i.unit_price ? Number((i.quantity || 0) * (i.unit_price || 0)).toLocaleString("en-KE", { minimumFractionDigits: 2 }) : ""}</td>
    </tr>`).join("");

  const vat = po.vat_amount || (totalAmt * 0.16);
  const win = window.open("", "_blank", "width=920,height=720");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>LPO — ${po.po_number || "Draft"}</title>
  <style>${baseCss(s)}</style></head><body>
  ${docHeader(s, "Local Purchase Order", po.po_number || "DRAFT")}
  <div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap">
    <span class="meta-badge">LPO NO: ${po.po_number || "—"}</span>
    <span class="meta-badge">DATE: ${po.created_at ? new Date(po.created_at).toLocaleDateString("en-KE", { dateStyle: "long" }) : "—"}</span>
    <span class="meta-badge">STATUS: ${(po.status || "Draft").toUpperCase()}</span>
  </div>
  <div class="two-col">
    <div>
      <div class="section-title">Supplier Details</div>
      <div class="info-line"><span class="info-label">SUPPLIER NAME:</span><span class="info-val">${po.suppliers?.name || po.supplier_name || ""}</span></div>
      <div class="info-line"><span class="info-label">SUPPLIER ADDRESS:</span><span class="info-val">${po.supplier_address || ""}</span></div>
      <div class="info-line"><span class="info-label">CONTACT PERSON:</span><span class="info-val">${po.supplier_contact || ""}</span></div>
      <div class="info-line"><span class="info-label">PHONE / EMAIL:</span><span class="info-val">${po.supplier_phone || ""}</span></div>
    </div>
    <div>
      <div class="section-title">Order Details</div>
      <div class="info-line"><span class="info-label">DELIVERY DATE:</span><span class="info-val">${po.delivery_date || ""}</span></div>
      <div class="info-line"><span class="info-label">DELIVERY ADDRESS:</span><span class="info-val">${po.delivery_address || s.hospitalName}</span></div>
      <div class="info-line"><span class="info-label">PAYMENT TERMS:</span><span class="info-val">${po.payment_terms || "30 Days"}</span></div>
      <div class="info-line"><span class="info-label">REQUISITION REF:</span><span class="info-val">${po.requisition_number || ""}</span></div>
    </div>
  </div>
  <table>
    <tr><td colspan="6" class="tbl-title">ORDER ITEMS</td></tr>
    <tr>
      <th class="tbl-hdr tbl-hdr-c" style="width:5%">#</th>
      <th class="tbl-hdr" style="width:36%">ITEM DESCRIPTION</th>
      <th class="tbl-hdr tbl-hdr-c" style="width:8%">UOM</th>
      <th class="tbl-hdr tbl-hdr-c" style="width:8%">QTY</th>
      <th class="tbl-hdr tbl-hdr-r" style="width:18%">UNIT PRICE (${s.currencySymbol})</th>
      <th class="tbl-hdr tbl-hdr-r" style="width:18%">AMOUNT (${s.currencySymbol})</th>
    </tr>
    ${rows}
  </table>
  <table class="totals-tbl">
    <tr><td class="totals-lbl">SUB-TOTAL</td><td class="totals-val">${s.currencySymbol} ${(totalAmt - vat).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</td></tr>
    <tr><td class="totals-lbl">VAT (16%)</td><td class="totals-val">${s.currencySymbol} ${vat.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</td></tr>
    <tr class="totals-grand"><td class="totals-lbl">GRAND TOTAL</td><td class="totals-val">${s.currencySymbol} ${totalAmt.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</td></tr>
  </table>
  ${po.notes ? `<div class="section-title">TERMS & CONDITIONS / NOTES:</div><div class="remarks-box">${po.notes}</div>` : ""}
  ${sigGrid(["Prepared By", "Authorized By", "Finance Officer", "Supplier Acknowledgement"], 4, s.showStamp)}
  ${docFooter(s)}
  </body></html>`);
  win.document.close(); win.focus(); setTimeout(() => win.print(), 600);
}

// ─── GOODS RECEIVED NOTE ─────────────────────────────────────────────────────
export function printGRN(g: any, cfg?: PrintSettings): void {
  const s = merge(cfg);
  g = { ...g, grn_number: uniqueSerial("GRN", g.grn_number) };
  const missing = missingFields(g, ["supplier_name","received_date"]);
  if (missing.length && !window.confirm(`Missing GRN fields: ${missing.join(", ")}. Print anyway?`)) return;
  const items = g.grn_items || g.items || [];
  const totalVal = g.total_value || items.reduce((sum: number, i: any) => sum + ((i.received_quantity || i.quantity || 0) * (i.unit_price || 0)), 0);

  const rows = items.map((i: any, idx: number) => `
    <tr>
      <td style="text-align:center">${idx + 1}</td>
      <td>${i.item_name || i.description || ""}</td>
      <td style="text-align:center">${i.unit_of_measure || i.unit || ""}</td>
      <td style="text-align:center">${i.ordered_quantity || i.quantity || ""}</td>
      <td style="text-align:center;font-weight:700">${i.received_quantity || i.quantity || ""}</td>
      <td style="text-align:center">${i.rejected_quantity || 0}</td>
      <td style="text-align:right">${i.unit_price ? Number(i.unit_price).toLocaleString("en-KE", { minimumFractionDigits: 2 }) : ""}</td>
      <td style="text-align:right">${(i.received_quantity || i.quantity) && i.unit_price ? Number((i.received_quantity || i.quantity) * i.unit_price).toLocaleString("en-KE", { minimumFractionDigits: 2 }) : ""}</td>
    </tr>`).join("");

  const win = window.open("", "_blank", "width=920,height=720");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>GRN — ${g.grn_number || "Draft"}</title>
  <style>${baseCss(s)}</style></head><body>
  ${docHeader(s, "Goods Received Note", g.grn_number || "DRAFT")}
  <div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap">
    <span class="meta-badge">GRN NO: ${g.grn_number || "—"}</span>
    <span class="meta-badge">DATE: ${g.received_date ? new Date(g.received_date).toLocaleDateString("en-KE", { dateStyle: "long" }) : "—"}</span>
    <span class="meta-badge">STATUS: ${(g.status || "Pending").toUpperCase()}</span>
    <span class="meta-badge">PO REF: ${g.po_number || "—"}</span>
  </div>
  <div class="two-col">
    <div>
      <div class="section-title">Receipt Information</div>
      <div class="info-line"><span class="info-label">SUPPLIER:</span><span class="info-val">${g.suppliers?.name || g.supplier_name || ""}</span></div>
      <div class="info-line"><span class="info-label">DELIVERY NOTE NO:</span><span class="info-val">${g.delivery_note_number || ""}</span></div>
      <div class="info-line"><span class="info-label">INVOICE NO:</span><span class="info-val">${g.invoice_number || ""}</span></div>
      <div class="info-line"><span class="info-label">RECEIVED BY:</span><span class="info-val">${g.received_by_name || ""}</span></div>
    </div>
    <div>
      <div class="section-title">Delivery Details</div>
      <div class="info-line"><span class="info-label">RECEIVED DATE:</span><span class="info-val">${g.received_date ? new Date(g.received_date).toLocaleDateString("en-KE") : ""}</span></div>
      <div class="info-line"><span class="info-label">WAREHOUSE / STORE:</span><span class="info-val">${g.warehouse || ""}</span></div>
      <div class="info-line"><span class="info-label">CONDITION:</span><span class="info-val">${g.condition || "Good"}</span></div>
      <div class="info-line"><span class="info-label">INSPECTED BY:</span><span class="info-val">${g.inspected_by || ""}</span></div>
    </div>
  </div>
  <table>
    <tr><td colspan="8" class="tbl-title">RECEIVED ITEMS</td></tr>
    <tr>
      <th class="tbl-hdr tbl-hdr-c" style="width:4%">#</th>
      <th class="tbl-hdr" style="width:26%">ITEM DESCRIPTION</th>
      <th class="tbl-hdr tbl-hdr-c" style="width:7%">UOM</th>
      <th class="tbl-hdr tbl-hdr-c" style="width:9%">ORDERED QTY</th>
      <th class="tbl-hdr tbl-hdr-c" style="width:9%">RECEIVED QTY</th>
      <th class="tbl-hdr tbl-hdr-c" style="width:9%">REJECTED</th>
      <th class="tbl-hdr tbl-hdr-r" style="width:15%">UNIT PRICE</th>
      <th class="tbl-hdr tbl-hdr-r" style="width:15%">VALUE (${s.currencySymbol})</th>
    </tr>
    ${rows}
  </table>
  <table class="totals-tbl">
    <tr class="totals-grand"><td class="totals-lbl">TOTAL VALUE</td><td class="totals-val">${s.currencySymbol} ${totalVal.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</td></tr>
  </table>
  <div class="section-title">REMARKS / INSPECTION NOTES:</div>
  <div class="remarks-box">${g.remarks || g.notes || "&nbsp;"}</div>
  ${sigGrid(["Delivered By (Supplier)", "Received By", "Inspected By", "Store Keeper"], 4, s.showStamp)}
  ${docFooter(s)}
  </body></html>`);
  win.document.close(); win.focus(); setTimeout(() => win.print(), 600);
}

// ─── PAYMENT VOUCHER ─────────────────────────────────────────────────────────
export function printPaymentVoucher(v: any, cfg?: PrintSettings): void {
  const s = merge(cfg);
  const win = window.open("", "_blank", "width=920,height=720");
  if (!win) return;
  const items = v.items || v.payment_items || [];

  const rows = items.length > 0 ? items.map((i: any, idx: number) => `
    <tr>
      <td style="text-align:center">${idx + 1}</td>
      <td>${i.description || i.item_name || ""}</td>
      <td style="text-align:right">${i.amount ? Number(i.amount).toLocaleString("en-KE", { minimumFractionDigits: 2 }) : ""}</td>
      <td>${i.account_code || ""}</td>
      <td>${i.notes || ""}</td>
    </tr>`) .join("") : `<tr><td colspan="5" style="text-align:center;padding:16px">—</td></tr>`;

  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Payment Voucher — ${v.voucher_number || "Draft"}</title>
  <style>${baseCss(s)}</style></head><body>
  ${docHeader(s, "Payment Voucher", v.voucher_number || "DRAFT")}
  <div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap">
    <span class="meta-badge">VOUCHER NO: ${v.voucher_number || "—"}</span>
    <span class="meta-badge">DATE: ${v.payment_date ? new Date(v.payment_date).toLocaleDateString("en-KE", { dateStyle: "long" }) : "—"}</span>
    <span class="meta-badge">STATUS: ${(v.status || "Draft").toUpperCase()}</span>
  </div>
  <div class="two-col">
    <div>
      <div class="section-title">Payment Details</div>
      <div class="info-line"><span class="info-label">PAY TO:</span><span class="info-val">${v.payee_name || v.supplier_name || ""}</span></div>
      <div class="info-line"><span class="info-label">PAYEE ADDRESS:</span><span class="info-val">${v.payee_address || ""}</span></div>
      <div class="info-line"><span class="info-label">BANK / ACC NO:</span><span class="info-val">${v.bank_account || ""}</span></div>
      <div class="info-line"><span class="info-label">PAYMENT METHOD:</span><span class="info-val">${v.payment_method || "Cheque"}</span></div>
      <div class="info-line"><span class="info-label">CHEQUE NUMBER:</span><span class="info-val">${v.cheque_number || ""}</span></div>
    </div>
    <div>
      <div class="section-title">Reference Information</div>
      <div class="info-line"><span class="info-label">PO / CONTRACT REF:</span><span class="info-val">${v.po_reference || v.po_number || ""}</span></div>
      <div class="info-line"><span class="info-label">INVOICE NUMBER:</span><span class="info-val">${v.invoice_number || ""}</span></div>
      <div class="info-line"><span class="info-label">INVOICE DATE:</span><span class="info-val">${v.invoice_date || ""}</span></div>
      <div class="info-line"><span class="info-label">BUDGET HEAD:</span><span class="info-val">${v.budget_head || ""}</span></div>
      <div class="info-line"><span class="info-label">COST CENTRE:</span><span class="info-val">${v.cost_centre || v.department || ""}</span></div>
    </div>
  </div>
  <table>
    <tr><td colspan="5" class="tbl-title">PAYMENT PARTICULARS</td></tr>
    <tr>
      <th class="tbl-hdr tbl-hdr-c" style="width:5%">#</th>
      <th class="tbl-hdr" style="width:38%">DESCRIPTION OF GOODS / SERVICES</th>
      <th class="tbl-hdr tbl-hdr-r" style="width:20%">AMOUNT (${s.currencySymbol})</th>
      <th class="tbl-hdr" style="width:17%">ACCOUNT CODE</th>
      <th class="tbl-hdr" style="width:20%">NOTES</th>
    </tr>
    ${rows}
  </table>
  <table class="totals-tbl">
    ${v.withholding_tax ? `<tr><td class="totals-lbl">GROSS AMOUNT</td><td class="totals-val">${s.currencySymbol} ${Number(v.gross_amount || v.total_amount || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</td></tr>
    <tr><td class="totals-lbl">WITHHOLDING TAX</td><td class="totals-val">(${s.currencySymbol} ${Number(v.withholding_tax || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })})</td></tr>` : ""}
    <tr class="totals-grand"><td class="totals-lbl">NET AMOUNT PAYABLE</td><td class="totals-val">${s.currencySymbol} ${Number(v.total_amount || v.amount || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</td></tr>
  </table>
  <div style="border:2px solid #000;padding:10px;margin-bottom:18px;text-align:center">
    <div style="font-size:10pt;font-weight:700;text-transform:uppercase;letter-spacing:1px">Amount in Words:</div>
    <div style="font-size:11pt;margin-top:6px">${v.amount_in_words || "_______________________________________________"}</div>
  </div>
  <div class="section-title">CERTIFICATION / DESCRIPTION:</div>
  <div class="remarks-box">${v.description || v.notes || "&nbsp;"}</div>
  ${sigGrid(["Prepared By", "Verified By", "Finance Officer", "Authorised By"], 4, s.showStamp)}
  ${docFooter(s)}
  </body></html>`);
  win.document.close(); win.focus(); setTimeout(() => win.print(), 600);
}

// ─── JOURNAL VOUCHER ─────────────────────────────────────────────────────────
export function printJournalVoucher(v: any, cfg?: PrintSettings): void {
  const s = merge(cfg);
  const entries = v.journal_entries || v.entries || [];
  const totalDebit  = entries.reduce((sum: number, e: any) => sum + (e.debit  || 0), 0);
  const totalCredit = entries.reduce((sum: number, e: any) => sum + (e.credit || 0), 0);

  const rows = entries.length > 0 ? entries.map((e: any, idx: number) => `
    <tr>
      <td style="text-align:center">${idx + 1}</td>
      <td>${e.account_code || ""}</td>
      <td>${e.account_name || e.description || ""}</td>
      <td>${e.department || ""}</td>
      <td style="text-align:right">${e.debit  ? Number(e.debit).toLocaleString("en-KE", { minimumFractionDigits: 2 }) : ""}</td>
      <td style="text-align:right">${e.credit ? Number(e.credit).toLocaleString("en-KE", { minimumFractionDigits: 2 }) : ""}</td>
    </tr>`) .join("") : `<tr><td colspan="6" style="text-align:center;padding:16px">No entries</td></tr>`;

  const win = window.open("", "_blank", "width=920,height=720");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Journal Voucher — ${v.voucher_number || "Draft"}</title>
  <style>${baseCss(s)}</style></head><body>
  ${docHeader(s, "Journal Voucher", v.voucher_number || "DRAFT")}
  <div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap">
    <span class="meta-badge">VOUCHER NO: ${v.voucher_number || "—"}</span>
    <span class="meta-badge">DATE: ${v.voucher_date ? new Date(v.voucher_date).toLocaleDateString("en-KE", { dateStyle: "long" }) : "—"}</span>
    <span class="meta-badge">TYPE: ${(v.journal_type || "General").toUpperCase()}</span>
    <span class="meta-badge">PERIOD: ${v.period || "—"}</span>
  </div>
  <div class="two-col" style="margin-bottom:14px">
    <div>
      <div class="info-line"><span class="info-label">PREPARED BY:</span><span class="info-val">${v.prepared_by_name || ""}</span></div>
      <div class="info-line"><span class="info-label">COST CENTRE:</span><span class="info-val">${v.department || ""}</span></div>
    </div>
    <div>
      <div class="info-line"><span class="info-label">REFERENCE:</span><span class="info-val">${v.reference || ""}</span></div>
      <div class="info-line"><span class="info-label">DESCRIPTION:</span><span class="info-val">${v.description || ""}</span></div>
    </div>
  </div>
  <table>
    <tr><td colspan="6" class="tbl-title">JOURNAL ENTRIES</td></tr>
    <tr>
      <th class="tbl-hdr tbl-hdr-c" style="width:5%">#</th>
      <th class="tbl-hdr" style="width:14%">ACCT CODE</th>
      <th class="tbl-hdr" style="width:34%">ACCOUNT NAME / DESCRIPTION</th>
      <th class="tbl-hdr" style="width:17%">DEPARTMENT</th>
      <th class="tbl-hdr tbl-hdr-r" style="width:15%">DEBIT (${s.currencySymbol})</th>
      <th class="tbl-hdr tbl-hdr-r" style="width:15%">CREDIT (${s.currencySymbol})</th>
    </tr>
    ${rows}
    <tr style="font-weight:900;background:#eee">
      <td colspan="4" style="text-align:right;padding:6px;border:1px solid #000;font-weight:900">TOTALS</td>
      <td style="text-align:right;padding:6px;border:1px solid #000;font-weight:900">${s.currencySymbol} ${totalDebit.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</td>
      <td style="text-align:right;padding:6px;border:1px solid #000;font-weight:900">${s.currencySymbol} ${totalCredit.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</td>
    </tr>
  </table>
  <div style="text-align:center;margin-bottom:16px;font-weight:700;font-size:11pt">
    ${Math.abs(totalDebit - totalCredit) < 0.01 ? "✓ JOURNAL ENTRY IS BALANCED" : "⚠ ENTRY DOES NOT BALANCE — Difference: " + Math.abs(totalDebit - totalCredit).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
  </div>
  <div class="section-title">NARRATION / NOTES:</div>
  <div class="remarks-box">${v.notes || v.narration || "&nbsp;"}</div>
  ${sigGrid(["Prepared By", "Checked By", "Approved By"], 3, s.showStamp)}
  ${docFooter(s)}
  </body></html>`);
  win.document.close(); win.focus(); setTimeout(() => win.print(), 600);
}

// ─── GENERIC VOUCHER (Receipt / Purchase / Sales) ────────────────────────────
export function printGenericVoucher(v: any, type: string, cfg?: PrintSettings): void {
  const s = merge(cfg);
  const items = v.items || [];
  const totalAmt = v.total_amount || v.amount || items.reduce((sum: number, i: any) => sum + (i.amount || 0), 0);

  const rows = items.length > 0 ? items.map((i: any, idx: number) => `
    <tr>
      <td style="text-align:center">${idx + 1}</td>
      <td>${i.description || i.item_name || ""}</td>
      <td style="text-align:center">${i.quantity || ""}</td>
      <td style="text-align:right">${i.unit_price ? Number(i.unit_price).toLocaleString("en-KE", { minimumFractionDigits: 2 }) : ""}</td>
      <td style="text-align:right">${i.amount ? Number(i.amount).toLocaleString("en-KE", { minimumFractionDigits: 2 }) : ""}</td>
    </tr>`) .join("") : `<tr><td colspan="5" style="text-align:center;padding:16px">—</td></tr>`;

  const win = window.open("", "_blank", "width=920,height=720");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${type} — ${v.voucher_number || "Draft"}</title>
  <style>${baseCss(s)}</style></head><body>
  ${docHeader(s, type, v.voucher_number || "DRAFT")}
  <div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap">
    <span class="meta-badge">NO: ${v.voucher_number || "—"}</span>
    <span class="meta-badge">DATE: ${(v.voucher_date || v.receipt_date || v.created_at) ? new Date(v.voucher_date || v.receipt_date || v.created_at).toLocaleDateString("en-KE", { dateStyle: "long" }) : "—"}</span>
    <span class="meta-badge">STATUS: ${(v.status || "Draft").toUpperCase()}</span>
  </div>
  <div class="two-col" style="margin-bottom:14px">
    <div>
      <div class="info-line"><span class="info-label">PARTY NAME:</span><span class="info-val">${v.party_name || v.payee_name || v.customer_name || v.supplier_name || ""}</span></div>
      <div class="info-line"><span class="info-label">REFERENCE:</span><span class="info-val">${v.reference || v.po_number || ""}</span></div>
      <div class="info-line"><span class="info-label">PAYMENT METHOD:</span><span class="info-val">${v.payment_method || "—"}</span></div>
    </div>
    <div>
      <div class="info-line"><span class="info-label">DESCRIPTION:</span><span class="info-val">${v.description || ""}</span></div>
      <div class="info-line"><span class="info-label">DEPARTMENT:</span><span class="info-val">${v.department || ""}</span></div>
      <div class="info-line"><span class="info-label">PREPARED BY:</span><span class="info-val">${v.prepared_by_name || ""}</span></div>
    </div>
  </div>
  <table>
    <tr><td colspan="5" class="tbl-title">PARTICULARS</td></tr>
    <tr>
      <th class="tbl-hdr tbl-hdr-c" style="width:5%">#</th>
      <th class="tbl-hdr" style="width:45%">DESCRIPTION</th>
      <th class="tbl-hdr tbl-hdr-c" style="width:10%">QTY</th>
      <th class="tbl-hdr tbl-hdr-r" style="width:20%">UNIT PRICE (${s.currencySymbol})</th>
      <th class="tbl-hdr tbl-hdr-r" style="width:20%">AMOUNT (${s.currencySymbol})</th>
    </tr>
    ${rows}
  </table>
  <table class="totals-tbl">
    <tr class="totals-grand"><td class="totals-lbl">TOTAL AMOUNT</td><td class="totals-val">${s.currencySymbol} ${Number(totalAmt).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</td></tr>
  </table>
  <div class="section-title">NOTES / REMARKS:</div>
  <div class="remarks-box">${v.notes || "&nbsp;"}</div>
  ${sigGrid(["Prepared By", "Checked By", "Approved By"], 3, s.showStamp)}
  ${docFooter(s)}
  </body></html>`);
  win.document.close(); win.focus(); setTimeout(() => win.print(), 600);
}
