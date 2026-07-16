/**
 * ProcurBosse - Print Engine
 * Generates browser-printable HTML for all document types
 * Uses official Embu County Government letterhead
 */
import { PRINT_CONFIG, STATUSES } from "./index";
import { ReportTemplate } from "./reportTemplates";

const LETTERHEAD_CSS = `
  @page { size: A4; margin: 18mm 14mm 22mm; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; font-size: 10pt; line-height: 1.5; position: relative; }
  .lh { width: 100%; border-bottom: 2px solid #0a2558; padding-bottom: 10px; margin-bottom: 14px; display: flex; align-items: center; gap: 16px; }
  .lh-text { flex: 1; }
  .lh-county { font-size: 13pt; font-weight: 800; color: #0a2558; letter-spacing: 0.04em; text-transform: uppercase; }
  .lh-dept { font-size: 9pt; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
  .lh-hospital { font-size: 11pt; font-weight: 700; color: #0a2558; }
  .seal { width: 52px; height: 52px; border-radius: 50%; border: 2px solid #0a2558; display: flex; align-items: center; justify-content: center; font-size: 9pt; font-weight: 800; color: #0a2558; text-align: center; line-height: 1.2; overflow: hidden; }
  .seal img { width: 100%; height: 100%; object-fit: contain; }
  .doc-title { font-size: 13pt; font-weight: 800; color: #0a2558; text-align: center; margin: 12px 0 6px; text-transform: uppercase; letter-spacing: 0.06em; }
  .doc-no { text-align: center; font-size: 9pt; color: #64748b; margin-bottom: 14px; }
  .confidential { text-align: center; font-size: 7pt; color: #dc2626; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 9pt; }
  th { background: #0a2558; color: #fff; padding: 6px 8px; text-align: left; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 700; }
  td { padding: 5px 8px; border-bottom: 0.5px solid #e5e7eb; vertical-align: top; }
  tr:nth-child(even) td { background: #f8fafc; }
  tr:last-child td { border-bottom: 1px solid #0a2558; }
  .tfoot td { background: #0a2558 !important; color: #fff; font-weight: 700; }
  .section { margin: 14px 0; }
  .section-title { font-size: 9pt; font-weight: 800; color: #0a2558; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 8px; }
  .kv-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 20px; }
  .kv { display: flex; gap: 8px; font-size: 9pt; }
  .kv-lbl { color: #6b7280; min-width: 120px; font-weight: 600; }
  .kv-val { color: #1f2937; font-weight: 500; flex: 1; }
  .sigs { margin-top: 28px; }
  .sig-grid { display: grid; gap: 20px; margin-top: 16px; }
  .sig-box { border-top: 1px solid #0a2558; padding-top: 6px; min-height: 44px; }
  .sig-box img.sig-img { height: 40px; max-width: 160px; object-fit: contain; display: block; margin-bottom: 3px; }
  .sig-name { font-size: 8.5pt; font-weight: 700; color: #374151; }
  .sig-title { font-size: 8pt; color: #6b7280; margin-top: 2px; }
  .sig-date { font-size: 8pt; color: #9ca3af; margin-top: 14px; }
  .sig-status { display: inline-block; font-size: 6.5pt; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; padding: 1px 6px; border-radius: 8px; margin-top: 3px; }
  .sig-status.signed { background: #dcfce7; color: #166534; }
  .sig-status.pending { background: #fef9c3; color: #854d0e; }
  .sig-status.declined { background: #fee2e2; color: #991b1b; }
  .footer { border-top: 1px solid #e2e8f0; margin-top: 20px; padding-top: 8px; font-size: 7.5pt; color: #9ca3af; text-align: center; }
  .badge { display: inline-block; padding: 1px 6px; border-radius: 12px; font-size: 7.5pt; font-weight: 700; }
  .amount-box { background: #0a2558; color: #fff; padding: 10px 14px; border-radius: 6px; margin: 10px 0; }
  .amount-box .label { font-size: 8pt; opacity: 0.7; text-transform: uppercase; letter-spacing: 0.05em; }
  .amount-box .value { font-size: 14pt; font-weight: 800; margin-top: 2px; }
  .watermark { position: fixed; top: 42%; left: 50%; transform: translate(-50%,-50%) rotate(-32deg); font-size: 64pt; font-weight: 900; color: rgba(220,38,38,0.09); letter-spacing: 0.08em; pointer-events: none; z-index: 0; white-space: nowrap; }
  .gen-stamp { text-align: center; font-size: 7pt; color: #cbd5e1; margin-top: 4px; }
`;

function letterhead(docTitle: string, docNo: string, opts?: { sealImg?: string; watermark?: string }): string {
  const lh = PRINT_CONFIG.LETTERHEAD;
  return `
    ${opts?.watermark ? `<div class="watermark">${opts.watermark}</div>` : ""}
    <div class="lh">
      <div class="seal">${opts?.sealImg ? `<img src="${opts.sealImg}" alt="Official Seal"/>` : `EL5<br/>SEAL`}</div>
      <div class="lh-text">
        <div class="lh-county">${lh.county}</div>
        <div class="lh-dept">${lh.department}</div>
        <div class="lh-hospital">${lh.hospital}</div>
        <div style="font-size:7.5pt;color:#94a3b8;margin-top:2px">${lh.address} - ${lh.phone} - ${lh.email}</div>
      </div>
    </div>
    <div class="doc-title">${docTitle}</div>
    <div class="doc-no">Document No: <strong>${docNo}</strong></div>
    <div class="confidential">${lh.confidential}</div>
  `;
}

interface SignatoryEntry { role: string; name?: string; signatureImg?: string; status?: "signed"|"pending"|"declined"; signedAt?: string; }

function signatories(roles: string[] | SignatoryEntry[], cols = 2): string {
  const entries: SignatoryEntry[] = roles.map((r: any) => typeof r === "string" ? { role: r } : r);
  const rows: string[] = [];
  for (let i = 0; i < entries.length; i += cols) {
    const slice = entries.slice(i, i + cols);
    rows.push(`
      <div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:20px;margin-bottom:20px;">
        ${slice.map(e => `
          <div class="sig-box">
            ${e.signatureImg ? `<img class="sig-img" src="${e.signatureImg}" alt="Signature"/>` : `<div class="sig-name">&nbsp;</div>`}
            <div class="sig-name">${e.name || "&nbsp;"}</div>
            <div class="sig-title">${e.role}</div>
            ${e.status ? `<span class="sig-status ${e.status}">${e.status}</span>` : ""}
            <div class="sig-date">Date: ${e.signedAt ? new Date(e.signedAt).toLocaleDateString("en-KE") : "_______________"}</div>
          </div>
        `).join("")}
      </div>
    `);
  }
  return `<div class="sigs"><div class="section-title">Authorized Signatures</div>${rows.join("")}</div>`;
}

function amountWords(amount: number): string {
  // Simple number-to-words for Kenyan Shillings
  if (!amount || isNaN(amount)) return "";
  const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten",
    "Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  const below100 = (n: number): string => {
    if (n < 20) return ones[n];
    return tens[Math.floor(n/10)] + (n%10 ? " " + ones[n%10] : "");
  };
  const below1000 = (n: number): string => {
    if (n < 100) return below100(n);
    return ones[Math.floor(n/100)] + " Hundred" + (n%100 ? " " + below100(n%100) : "");
  };
  const int = Math.floor(amount);
  const cents = Math.round((amount - int) * 100);
  let words = "";
  if (int >= 1000000) { words += below1000(Math.floor(int/1000000)) + " Million "; }
  if (int >= 1000)    { words += below1000(Math.floor((int%1000000)/1000)) + " Thousand "; }
  words += below1000(int % 1000);
  return `Kenya Shillings ${words.trim()}${cents ? ` and ${cents}/100` : ""} Only`;
}

function printDoc(html: string, opts?: { docType?: string; docRef?: string; watermark?: string }) {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  const now = new Date();
  const genStamp = now.toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" });
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
    <title>EL5 MediProcure - Print</title>
    <style>${LETTERHEAD_CSS}</style>
  </head><body>${html}
    <div class="footer">
      ${PRINT_CONFIG.LETTERHEAD.hospital} - ${PRINT_CONFIG.LETTERHEAD.address} - EL5 MediProcure v10
      <div class="gen-stamp">Generated ${genStamp} - EL5 MediProcure ERP</div>
    </div>
    <script>
      window.onload = () => {
        window.print();
      };
    </script>
  </body></html>`);
  win.document.close();
  logPrint(opts?.docType, opts?.docRef);
}

// Best-effort audit trail; never blocks printing if the table/network isn't available.
function logPrint(docType?: string, docRef?: string) {
  try {
    import("@/integrations/supabase/client").then(({ supabase }) => {
      (supabase as any).from("print_log").insert({
        page: docType || "document",
        entity_type: docType || "document",
        entity_id: docRef || null,
      }).then(() => {}, () => {});
    }).catch(() => {});
  } catch { /* non-critical */ }
}

// - PUBLIC PRINT FUNCTIONS -

export function printRequisition(req: any, items: any[]) {
  const html = `
    ${letterhead("STORES REQUISITION FORM", req.requisition_number || "DRAFT")}
    <div class="section">
      <div class="section-title">Requisition Details</div>
      <div class="kv-grid">
        <div class="kv"><span class="kv-lbl">Title:</span><span class="kv-val">${req.title || ""}</span></div>
        <div class="kv"><span class="kv-lbl">Department:</span><span class="kv-val">${req.department || ""}</span></div>
        <div class="kv"><span class="kv-lbl">Ward / Unit:</span><span class="kv-val">${req.hospital_ward || req.ward || ""}</span></div>
        <div class="kv"><span class="kv-lbl">Priority:</span><span class="kv-val">${req.priority || "Normal"}</span></div>
        <div class="kv"><span class="kv-lbl">Requested By:</span><span class="kv-val">${req.requester_name || ""}</span></div>
        <div class="kv"><span class="kv-lbl">Required Date:</span><span class="kv-val">${req.required_date ? new Date(req.required_date).toLocaleDateString("en-KE") : ""}</span></div>
        <div class="kv"><span class="kv-lbl">Delivery Location:</span><span class="kv-val">${req.delivery_location || ""}</span></div>
        <div class="kv"><span class="kv-lbl">Date:</span><span class="kv-val">${new Date(req.created_at || Date.now()).toLocaleDateString("en-KE")}</span></div>
      </div>
      ${req.purpose ? `<div class="kv" style="margin-top:6px"><span class="kv-lbl">Purpose:</span><span class="kv-val">${req.purpose}</span></div>` : ""}
    </div>
    <div class="section">
      <div class="section-title">Items Requested</div>
      <table>
        <tr><th>#</th><th>Item Description</th><th>Specifications</th><th>UOM</th><th style="text-align:right">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Total (KES)</th></tr>
        ${items.map((it, i) => `
          <tr>
            <td>${i+1}</td>
            <td>${it.item_name || it.name || ""}</td>
            <td>${it.description || it.specifications || ""}</td>
            <td>${it.unit_of_measure || it.unit || ""}</td>
            <td style="text-align:right">${it.quantity || 0}</td>
            <td style="text-align:right">${it.unit_price ? Number(it.unit_price).toLocaleString("en-KE", {minimumFractionDigits:2}) : "-"}</td>
            <td style="text-align:right">${it.total_price ? Number(it.total_price).toLocaleString("en-KE", {minimumFractionDigits:2}) : "-"}</td>
          </tr>`).join("")}
        <tr class="tfoot"><td colspan="6" style="text-align:right">TOTAL AMOUNT:</td><td style="text-align:right">KES ${Number(req.total_amount||0).toLocaleString("en-KE",{minimumFractionDigits:2})}</td></tr>
      </table>
      ${req.total_amount ? `<div style="font-size:8.5pt;color:#374151;margin-top:4px;font-style:italic">Amount in Words: ${amountWords(Number(req.total_amount))}</div>` : ""}
    </div>
    ${signatories(PRINT_CONFIG.SIGNATORIES.REQUISITION, 2)}
  `;
  printDoc(html, { docType: "requisition", docRef: req.requisition_number || req.id });
}

export function printPurchaseOrder(po: any, items: any[], supplier: any) {
  const subtotal = items.reduce((s, it) => s + (parseFloat(it.total_price||it.amount||0)), 0);
  const vat      = po.vat_applicable ? subtotal * 0.16 : 0;
  const total    = subtotal + vat - (parseFloat(po.discount||0));

  const html = `
    ${letterhead("LOCAL PURCHASE ORDER", po.po_number || "DRAFT")}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
      <div class="section">
        <div class="section-title">Supplier Details</div>
        <div class="kv"><span class="kv-lbl">Supplier:</span><span class="kv-val">${supplier?.name || po.supplier_name || ""}</span></div>
        <div class="kv"><span class="kv-lbl">Address:</span><span class="kv-val">${supplier?.address || ""}</span></div>
        <div class="kv"><span class="kv-lbl">Contact:</span><span class="kv-val">${supplier?.contact_person || ""}</span></div>
        <div class="kv"><span class="kv-lbl">Phone:</span><span class="kv-val">${supplier?.phone || ""}</span></div>
        <div class="kv"><span class="kv-lbl">KRA PIN:</span><span class="kv-val">${supplier?.kra_pin || ""}</span></div>
      </div>
      <div class="section">
        <div class="section-title">Order Details</div>
        <div class="kv"><span class="kv-lbl">LPO Date:</span><span class="kv-val">${new Date(po.created_at||Date.now()).toLocaleDateString("en-KE")}</span></div>
        <div class="kv"><span class="kv-lbl">Delivery Date:</span><span class="kv-val">${po.delivery_date ? new Date(po.delivery_date).toLocaleDateString("en-KE") : ""}</span></div>
        <div class="kv"><span class="kv-lbl">Payment Terms:</span><span class="kv-val">${po.payment_terms || "30 Days"}</span></div>
        <div class="kv"><span class="kv-lbl">Department:</span><span class="kv-val">${po.department || ""}</span></div>
        <div class="kv"><span class="kv-lbl">Delivery To:</span><span class="kv-val">${po.delivery_address || "Stores - EL5 Hospital"}</span></div>
      </div>
    </div>
    <table>
      <tr><th>#</th><th>Description</th><th>Unit</th><th style="text-align:right">Qty</th><th style="text-align:right">Unit Price (KES)</th><th style="text-align:right">Amount (KES)</th></tr>
      ${items.map((it, i) => `
        <tr>
          <td>${i+1}</td><td>${it.description||it.item_name||""}</td>
          <td>${it.unit||""}</td>
          <td style="text-align:right">${it.quantity||0}</td>
          <td style="text-align:right">${Number(it.unit_price||0).toLocaleString("en-KE",{minimumFractionDigits:2})}</td>
          <td style="text-align:right">${Number(it.total_price||it.amount||0).toLocaleString("en-KE",{minimumFractionDigits:2})}</td>
        </tr>`).join("")}
      <tr style="background:#f8fafc"><td colspan="5" style="text-align:right;font-weight:700">Sub-Total:</td><td style="text-align:right;font-weight:700">KES ${subtotal.toLocaleString("en-KE",{minimumFractionDigits:2})}</td></tr>
      ${vat ? `<tr style="background:#f8fafc"><td colspan="5" style="text-align:right">VAT (16%):</td><td style="text-align:right">KES ${vat.toLocaleString("en-KE",{minimumFractionDigits:2})}</td></tr>` : ""}
      <tr class="tfoot"><td colspan="5" style="text-align:right">TOTAL AMOUNT:</td><td style="text-align:right">KES ${total.toLocaleString("en-KE",{minimumFractionDigits:2})}</td></tr>
    </table>
    <div style="font-size:8.5pt;color:#374151;margin:6px 0 12px;font-style:italic">Amount in Words: ${amountWords(total)}</div>
    ${po.notes ? `<div class="kv" style="margin-bottom:10px"><span class="kv-lbl">Special Instructions:</span><span class="kv-val">${po.notes}</span></div>` : ""}
    ${signatories(PRINT_CONFIG.SIGNATORIES.PO, 2)}
  `;
  printDoc(html, { docType: "purchase_order", docRef: po.po_number || po.id });
}

export function printPaymentVoucher(voucher: any) {
  const html = `
    ${letterhead("PAYMENT VOUCHER", voucher.voucher_number || "DRAFT")}
    <div class="amount-box">
      <div class="label">Net Payment Amount</div>
      <div class="value">KES ${Number(voucher.net_amount||voucher.amount||0).toLocaleString("en-KE",{minimumFractionDigits:2})}</div>
      <div style="font-size:8pt;opacity:0.8;margin-top:3px;font-style:italic">${amountWords(Number(voucher.net_amount||voucher.amount||0))}</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:12px 0;">
      <div class="section">
        <div class="section-title">Payee Information</div>
        <div class="kv"><span class="kv-lbl">Payee Name:</span><span class="kv-val">${voucher.payee_name||""}</span></div>
        <div class="kv"><span class="kv-lbl">KRA PIN:</span><span class="kv-val">${voucher.payee_kra_pin||""}</span></div>
        <div class="kv"><span class="kv-lbl">Bank:</span><span class="kv-val">${voucher.payee_bank||""}</span></div>
        <div class="kv"><span class="kv-lbl">Account No.:</span><span class="kv-val">${voucher.payee_account||""}</span></div>
        <div class="kv"><span class="kv-lbl">Branch:</span><span class="kv-val">${voucher.payee_branch||""}</span></div>
      </div>
      <div class="section">
        <div class="section-title">Payment Details</div>
        <div class="kv"><span class="kv-lbl">Voucher No.:</span><span class="kv-val">${voucher.voucher_number||""}</span></div>
        <div class="kv"><span class="kv-lbl">Cheque/EFT No.:</span><span class="kv-val">${voucher.cheque_number||""}</span></div>
        <div class="kv"><span class="kv-lbl">Payment Date:</span><span class="kv-val">${voucher.payment_date ? new Date(voucher.payment_date).toLocaleDateString("en-KE") : ""}</span></div>
        <div class="kv"><span class="kv-lbl">Gross Amount:</span><span class="kv-val">KES ${Number(voucher.amount||0).toLocaleString("en-KE",{minimumFractionDigits:2})}</span></div>
        <div class="kv"><span class="kv-lbl">VAT:</span><span class="kv-val">KES ${Number(voucher.vat_amount||0).toLocaleString("en-KE",{minimumFractionDigits:2})}</span></div>
        <div class="kv"><span class="kv-lbl">W/Tax:</span><span class="kv-val">KES ${Number(voucher.withholding_tax||0).toLocaleString("en-KE",{minimumFractionDigits:2})}</span></div>
        <div class="kv"><span class="kv-lbl">LPO Reference:</span><span class="kv-val">${voucher.po_reference||""}</span></div>
        <div class="kv"><span class="kv-lbl">Budget Head:</span><span class="kv-val">${voucher.budget_head||""}</span></div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">Narration</div>
      <p style="font-size:9pt;color:#374151;padding:8px;background:#f8fafc;border-left:3px solid #0a2558;border-radius:4px">${voucher.narration||""}</p>
    </div>
    ${signatories(PRINT_CONFIG.SIGNATORIES.PAYMENT_VOUCHER, 2)}
  `;
  printDoc(html, { docType: "payment_voucher", docRef: voucher.voucher_number || voucher.id });
}

export function printGRN(grn: any, items: any[]) {
  const html = `
    ${letterhead("GOODS RECEIVED NOTE", grn.grn_number || "DRAFT")}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:12px;">
      <div class="section">
        <div class="section-title">Receipt Details</div>
        <div class="kv"><span class="kv-lbl">Supplier:</span><span class="kv-val">${grn.supplier_name||""}</span></div>
        <div class="kv"><span class="kv-lbl">LPO Reference:</span><span class="kv-val">${grn.po_reference||""}</span></div>
        <div class="kv"><span class="kv-lbl">Invoice No.:</span><span class="kv-val">${grn.invoice_number||""}</span></div>
        <div class="kv"><span class="kv-lbl">Delivery Note:</span><span class="kv-val">${grn.delivery_note||""}</span></div>
        <div class="kv"><span class="kv-lbl">Date Received:</span><span class="kv-val">${grn.received_date ? new Date(grn.received_date).toLocaleDateString("en-KE") : ""}</span></div>
        <div class="kv"><span class="kv-lbl">Received By:</span><span class="kv-val">${grn.received_by||""}</span></div>
      </div>
      <div class="section">
        <div class="section-title">Remarks</div>
        <p style="font-size:9pt;color:#374151;padding:8px;background:#f8fafc;border-left:3px solid #0a2558;border-radius:4px;min-height:60px">${grn.remarks||"No remarks"}</p>
      </div>
    </div>
    <table>
      <tr><th>#</th><th>Item Description</th><th>Unit</th><th style="text-align:right">Ordered</th><th style="text-align:right">Received</th><th style="text-align:right">Rejected</th><th>Condition</th></tr>
      ${items.map((it, i) => `
        <tr>
          <td>${i+1}</td><td>${it.item_name||it.name||""}</td>
          <td>${it.unit_of_measure||it.unit||""}</td>
          <td style="text-align:right">${it.quantity_ordered||it.quantity||0}</td>
          <td style="text-align:right">${it.quantity_received||0}</td>
          <td style="text-align:right">${it.quantity_rejected||0}</td>
          <td>${it.condition||"Good"}</td>
        </tr>`).join("")}
    </table>
    ${signatories(PRINT_CONFIG.SIGNATORIES.GRN, 2)}
  `;
  printDoc(html, { docType: "grn", docRef: grn.grn_number || grn.id });
}

export function printReport(template: ReportTemplate, data: any[], period = "") {
  const cols = template.columns;
  const html = `
    ${letterhead(template.title, period ? `Period: ${period}` : new Date().toLocaleDateString("en-KE"))}
    ${template.subtitle ? `<div style="text-align:center;font-size:9pt;color:#64748b;margin-bottom:10px">${template.subtitle}</div>` : ""}
    <table>
      <tr>${cols.map(c => `<th style="text-align:${c.align||"left"}">${c.label}</th>`).join("")}</tr>
      ${data.map((row, ri) => `
        <tr>
          ${cols.map(col => {
            const val = row[col.key];
            let display = "";
            if (val == null) display = "-";
            else if (col.format === "currency") display = "KES " + Number(val).toLocaleString("en-KE", {minimumFractionDigits:2});
            else if (col.format === "date")     display = new Date(val).toLocaleDateString("en-KE");
            else if (col.format === "number")   display = Number(val).toLocaleString("en-KE");
            else display = String(val);
            return `<td style="text-align:${col.align||"left"}">${display}</td>`;
          }).join("")}
        </tr>`).join("")}
      ${template.totals?.length ? `
        <tr class="tfoot">
          ${cols.map(col => {
            if (!template.totals!.includes(col.key)) return `<td>${col.key === cols[0].key ? "TOTAL" : ""}</td>`;
            const total = data.reduce((s, r) => s + (parseFloat(r[col.key])||0), 0);
            return `<td style="text-align:right">KES ${total.toLocaleString("en-KE",{minimumFractionDigits:2})}</td>`;
          }).join("")}
        </tr>` : ""}
    </table>
    ${template.signatories ? signatories(template.signatories, 2) : ""}
  `;
  printDoc(html, { docType: "report", docRef: template.title });
}

/**
 * Print a document created in the Document Writer, with real signature
 * images (or "Pending Signature" placeholders) for each assigned signee,
 * a draft watermark when the signing workflow isn't yet complete, and
 * the org seal when available.
 */
export function printSignedDocument(
  doc: { name: string; category?: string; html: string; signature_status?: string },
  signees: { signee_name: string; signee_role: string; status: string; signature_image?: string; signed_at?: string }[],
  sealImg?: string
) {
  const isDraft = doc.signature_status && doc.signature_status !== "completed" && signees.length > 0;
  const html = `
    ${letterhead(doc.category ? `${doc.category.toUpperCase()} — ${doc.name}` : doc.name, new Date().toLocaleDateString("en-KE"),
      { sealImg, watermark: isDraft ? "UNSIGNED DRAFT" : undefined })}
    <div class="section">${doc.html || ""}</div>
    ${signees.length ? signatories(signees.map(s => ({
        role: s.signee_role, name: s.status === "signed" ? s.signee_name : undefined,
        signatureImg: s.signature_image, status: s.status as any, signedAt: s.signed_at,
      })), 2) : ""}
  `;
  printDoc(html, { docType: "document", docRef: doc.name });
}
