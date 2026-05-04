/**
 * ProcurBosse — EL5 MediProcure Document Print Engine v2.0
 * All printed documents match the Embu County Government official letterhead.
 * Template: EMBU COUNTY GOVERNMENT | DEPARTMENT OF HEALTH | EMBU LEVEL 5 HOSPITAL
 * "Note: Private and Confidential"
 */

export interface PrintSettings {
  hospitalName?:    string;
  countyName?:      string;
  departmentName?:  string;
  sysName?:         string;
  docFooter?:       string;
  currencySymbol?:  string;
  printFont?:       string;
  printFontSize?:   string;
  showLogo?:        boolean;
  showStamp?:       boolean;
  showWatermark?:   boolean;
  logoUrl?:         string;
  sealUrl?:         string;
  hospitalAddress?: string;
  hospitalPhone?:   string;
  hospitalEmail?:   string;
  poBox?:           string;
  confidential?:    boolean;
}

const DEF: Required<PrintSettings> = {
  hospitalName:    "Embu Level 5 Hospital",
  countyName:      "Embu County Government",
  departmentName:  "Department of Health",
  sysName:         "EL5 MediProcure",
  docFooter:       "Embu Level 5 Hospital · Embu County Government · Department of Health",
  currencySymbol:  "KES",
  printFont:       "Times New Roman",
  printFontSize:   "11",
  showLogo:        true,
  showStamp:       true,
  showWatermark:   false,
  logoUrl:         "",
  sealUrl:         "",
  hospitalAddress: "Embu Town, Embu County, Kenya",
  hospitalPhone:   "+254 060 000000",
  hospitalEmail:   "info@embu.health.go.ke",
  poBox:           "P.O. Box 591-60100, Embu",
  confidential:    true,
};

function merge(s?: PrintSettings): Required<PrintSettings> {
  return { ...DEF, ...s };
}

function uniqueSerial(prefix: string, existingRef?: string): string {
  if (existingRef && existingRef !== "—" && existingRef !== "") return existingRef;
  const d = new Date();
  const yy = d.getFullYear().toString().slice(-2);
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  const rand = Math.floor(1000+Math.random()*9000);
  return `${prefix}-${yy}${mm}${dd}-${rand}`;
}

function missingFields(obj: Record<string,any>, required: string[]): string[] {
  return required.filter(k => !obj[k] || String(obj[k]).trim() === "" || obj[k] === "—");
}

function amountInWords(amount: number, currency = "Kenya Shillings"): string {
  if (!amount || isNaN(amount)) return "";
  const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine",
    "Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  function w(n: number): string {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? " "+ones[n%10] : "");
    if (n < 1000) return ones[Math.floor(n/100)]+" Hundred"+(n%100 ? " "+w(n%100) : "");
    if (n < 1000000) return w(Math.floor(n/1000))+" Thousand"+(n%1000 ? " "+w(n%1000) : "");
    if (n < 1000000000) return w(Math.floor(n/1000000))+" Million"+(n%1000000 ? " "+w(n%1000000) : "");
    return w(Math.floor(n/1000000000))+" Billion"+(n%1000000000 ? " "+w(n%1000000000) : "");
  }
  const int = Math.floor(amount);
  const dec = Math.round((amount - int)*100);
  let result = (int > 0 ? w(int) : "Zero") + " " + currency;
  if (dec > 0) result += " and " + w(dec) + " Cents";
  return result + " Only";
}

function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString("en-KE", { day:"2-digit", month:"long", year:"numeric" });
}

function fmtMoney(v: any, sym = "KES"): string {
  const n = parseFloat(v) || 0;
  return `${sym} ${n.toLocaleString("en-KE", { minimumFractionDigits:2, maximumFractionDigits:2 })}`;
}

/** Official Embu County Government letterhead — matching the scanned template */
function baseCss(s: Required<PrintSettings>): string {
  return `
    <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: '${s.printFont}', 'Times New Roman', Times, serif;
      font-size: ${s.printFontSize}pt;
      color: #000 !important;
      background: #fff;
      padding: 20px 30px;
    }
    @media print {
      body { padding: 8mm 12mm; }
      @page { size: A4; margin: 8mm 12mm; }
      .no-print { display: none !important; }
    }
    h1,h2,h3,p,td,th,div,span,label,input,textarea { color: #000 !important; }

    /* ── Official Letterhead ── */
    .letterhead {
      text-align: center;
      border-bottom: 3px double #000;
      padding-bottom: 10px;
      margin-bottom: 6px;
      position: relative;
    }
    .lh-county  { font-size: 15pt; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; }
    .lh-dept    { font-size: 12pt; font-weight: 700; text-transform: uppercase; margin-top: 2px; }
    .lh-seal    { margin: 6px auto; display: block; height: 72px; width: auto; }
    .lh-seal-placeholder {
      width: 72px; height: 72px; border: 2px solid #000; border-radius: 50%;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 7.5pt; font-weight: 700; text-align: center; color: #000;
      margin: 6px 0;
    }
    .lh-hospital { font-size: 12pt; font-weight: 700; text-transform: uppercase; color: #1a3a6b !important; margin-top: 4px; }
    .lh-form    { font-size: 14pt; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; margin-top: 6px; color: #000; }
    .lh-note    { font-size: 9pt; font-style: italic; margin-top: 3px; }
    .lh-contact { font-size: 8.5pt; margin-top: 3px; }
    .doc-ref-bar {
      display: flex; justify-content: space-between; align-items: flex-start;
      font-size: 9pt; border: 1px solid #000; padding: 5px 10px; margin-bottom: 8px;
      background: #f9f9f9;
    }

    /* ── Body ── */
    .section-header {
      background: #1a3a6b; color: #fff !important; padding: 4px 10px;
      font-size: 10pt; font-weight: 700; margin: 10px 0 0 0;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    .section-header * { color: #fff !important; }
    .field-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
    .field-table td { padding: 4px 8px; font-size: 9.5pt; border: 1px solid #ccc; vertical-align: top; }
    .field-label { font-weight: 700; width: 160px; background: #f5f5f5; white-space: nowrap; }

    /* ── Items Table ── */
    table.items { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 9pt; }
    table.items th {
      background: #1a3a6b; color: #fff !important; text-align: center;
      padding: 5px 6px; font-weight: 700; border: 1px solid #000;
    }
    table.items td { border: 1px solid #000; padding: 4px 6px; vertical-align: middle; }
    table.items tr:nth-child(even) td { background: #f9f9f9; }
    table.items tfoot td { font-weight: 700; background: #e8edf5; border-top: 2px solid #000; }
    .amt-words { font-style: italic; font-size: 9pt; border: 1px solid #000; padding: 5px 10px; margin-top: 4px; }

    /* ── Signatures ── */
    .sig-grid   { display: grid; gap: 16px; margin-top: 20px; }
    .sig-grid-2 { grid-template-columns: repeat(2, 1fr); }
    .sig-grid-3 { grid-template-columns: repeat(3, 1fr); }
    .sig-grid-4 { grid-template-columns: repeat(4, 1fr); }
    .sig-box    { text-align: center; }
    .sig-line   { border-bottom: 1.5px solid #000; margin-bottom: 4px; margin-top: 35px; }
    .sig-lbl    { font-weight: 700; font-size: 8.5pt; text-transform: uppercase; }
    .sig-name   { font-size: 8pt; margin-top: 2px; }
    .sig-date   { font-size: 8pt; margin-top: 2px; }
    .stamp-box  { width: 75px; height: 75px; border: 2px solid #000; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 7.5pt; font-weight: 700; text-transform: uppercase; margin-top: 6px; }

    /* ── Footer ── */
    .doc-footer {
      margin-top: 18px; border-top: 1.5px solid #000; padding-top: 6px;
      font-size: 8pt; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 4px;
    }
    .watermark {
      position: fixed; top: 40%; left: 50%; transform: translate(-50%,-50%) rotate(-35deg);
      font-size: 64pt; font-weight: 900; opacity: 0.04; pointer-events: none;
      white-space: nowrap; z-index: 0;
    }
    .divider { border: none; border-top: 1px solid #999; margin: 6px 0; }
    </style>
  `;
}

/** Official Embu County Government letterhead matching the scanned document */
function docHeader(s: Required<PrintSettings>, formTitle: string, subtitle?: string): string {
  const seal = s.showLogo && s.sealUrl
    ? `<img src="${s.sealUrl}" alt="Seal" class="lh-seal" onerror="this.style.display='none'"/>`
    : s.showLogo
      ? `<div class="lh-seal-placeholder">EMBU<br/>L5H<br/>SEAL</div>`
      : "";

  const watermark = s.showWatermark
    ? `<div class="watermark">OFFICIAL</div>`
    : "";

  return `
    ${watermark}
    <div class="letterhead">
      <div class="lh-county">${s.countyName}</div>
      <div class="lh-dept">${s.departmentName}</div>
      ${seal}
      <div class="lh-hospital">${s.hospitalName}</div>
      <div class="lh-form">${formTitle}</div>
      ${subtitle ? `<div class="lh-form" style="font-size:11pt;">${subtitle}</div>` : ""}
      ${s.confidential ? `<div class="lh-note">Note: Private and Confidential</div>` : ""}
      <div class="lh-contact">${s.poBox} &nbsp;·&nbsp; Tel: ${s.hospitalPhone} &nbsp;·&nbsp; ${s.hospitalEmail}</div>
    </div>
  `;
}

function refBar(left: Record<string,string>, right: Record<string,string>): string {
  const leftHtml = Object.entries(left).map(([k,v]) => `<div><strong>${k}:</strong> ${v}</div>`).join("");
  const rightHtml = Object.entries(right).map(([k,v]) => `<div><strong>${k}:</strong> ${v}</div>`).join("");
  return `<div class="doc-ref-bar"><div>${leftHtml}</div><div style="text-align:right">${rightHtml}</div></div>`;
}

function sectionHeader(text: string): string {
  return `<div class="section-header">${text}</div>`;
}

function fieldTable(rows: [string, string][]): string {
  const cells = rows.map(([l,v]) => `<tr><td class="field-label">${l}</td><td>${v||"&nbsp;"}</td></tr>`).join("");
  return `<table class="field-table">${cells}</table>`;
}

function docFooter(s: Required<PrintSettings>): string {
  return `
    <div class="doc-footer">
      <span>${s.docFooter}</span>
      <span>Printed: ${new Date().toLocaleString("en-KE")} &nbsp;·&nbsp; OFFICIAL DOCUMENT &nbsp;·&nbsp; ${s.sysName}</span>
    </div>
  `;
}

function sigGrid(labels: string[], cols: 2|3|4 = 4, showStamp = false): string {
  return `
    <div class="sig-grid sig-grid-${cols}">
      ${labels.map((l, i) => `
        <div class="sig-box">
          ${showStamp && i === labels.length-1 ? `<div class="stamp-box">OFFICIAL<br/>STAMP</div>` : ""}
          <div class="sig-line"></div>
          <div class="sig-lbl">${l}</div>
          <div class="sig-name">Name: ___________________</div>
          <div class="sig-date">Date: ___________________</div>
        </div>`).join("")}
    </div>
  `;
}

function openPrint(bodyHtml: string, title: string, cssHtml: string): void {
  const win = window.open("", "_blank", "width=940,height=780,scrollbars=yes");
  if (!win) { alert("Please allow pop-ups to print documents."); return; }
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title>${cssHtml}</head><body>${bodyHtml}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 700);
}

// ─── REQUISITION ─────────────────────────────────────────────────────────────
export function printRequisition(r: any, cfg?: PrintSettings): void {
  const s = merge(cfg);
  r = { ...r, requisition_number: uniqueSerial("REQ", r.requisition_number) };
  const missing = missingFields(r, ["title","department","requester_name"]);
  if (missing.length && !window.confirm(`Missing fields: ${missing.join(", ")}. Print anyway?`)) return;
  const items = r.requisition_items || [];
  const total = items.reduce((sum: number, i: any) => sum + ((i.quantity||0)*(i.unit_price||0)), 0) || (r.total_amount||0);
  const padded = [...items, ...Array(Math.max(0, 8-items.length)).fill(null)];

  const rows = padded.map((i: any, idx: number) => `
    <tr>
      <td style="text-align:center">${idx+1}</td>
      <td>${i ? (i.item_name||"") : ""}</td>
      <td>${i ? (i.description||"") : ""}</td>
      <td style="text-align:center">${i ? (i.unit_of_measure||"") : ""}</td>
      <td style="text-align:center">${i ? (i.quantity||"") : ""}</td>
      <td style="text-align:right">${i && i.unit_price ? fmtMoney(i.unit_price, s.currencySymbol) : ""}</td>
      <td style="text-align:right">${i && i.quantity && i.unit_price ? fmtMoney(i.quantity*i.unit_price, s.currencySymbol) : ""}</td>
    </tr>`).join("");

  const body = `
    ${docHeader(s, "Local Purchase Requisition Form", r.requisition_number)}
    ${refBar(
      { "Requisition No": r.requisition_number, "Date": formatDate(r.created_at||r.date), "Priority": (r.priority||"Normal").toUpperCase() },
      { "Department": r.department||"—", "Requested By": r.requester_name||"—", "Status": (r.status||"Pending").toUpperCase() }
    )}
    ${sectionHeader("I. Requisition Details")}
    ${fieldTable([
      ["Description/Purpose", r.title||r.description||"—"],
      ["Department", r.department||"—"],
      ["Requested By", r.requester_name||"—"],
      ["Required By Date", formatDate(r.required_date||r.due_date)],
      ["Delivery Location", r.delivery_location||r.hospital_ward||"—"],
    ])}
    ${sectionHeader("II. Items Required")}
    <table class="items">
      <thead><tr>
        <th style="width:30px">#</th>
        <th>Item Description</th>
        <th>Specifications</th>
        <th>Unit</th>
        <th>Qty</th>
        <th>Unit Price (${s.currencySymbol})</th>
        <th>Amount (${s.currencySymbol})</th>
      </tr></thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr><td colspan="5" style="text-align:right">TOTAL</td><td></td><td style="text-align:right">${fmtMoney(total, s.currencySymbol)}</td></tr>
      </tfoot>
    </table>
    <div class="amt-words">Amount in Words: <strong>${amountInWords(total, s.currencySymbol)}</strong></div>
    ${r.justification ? `${sectionHeader("III. Justification")}<p style="padding:6px 0;font-size:9.5pt">${r.justification}</p>` : ""}
    ${sectionHeader("IV. Authorization")}
    ${sigGrid(["Requisitioner","HOD / Supervisor","Procurement Officer","Approval / Finance"], 4, s.showStamp)}
    ${docFooter(s)}
  `;
  openPrint(body, `Requisition ${r.requisition_number}`, baseCss(s));
}

// ─── PURCHASE ORDER (LPO) ────────────────────────────────────────────────────
export function printLPO(po: any, cfg?: PrintSettings): void {
  const s = merge(cfg);
  po = { ...po, po_number: uniqueSerial("LPO", po.po_number) };
  const items = po.items || po.purchase_order_items || [];
  const subtotal = items.reduce((sum: number, i: any) => sum + ((i.quantity||0)*(i.unit_price||0)), 0) || (po.total_amount||0);
  const vatRate = parseFloat(po.vat_rate||"16")/100;
  const vatAmt = po.include_vat ? subtotal*vatRate : 0;
  const total = subtotal + vatAmt;
  const padded = [...items, ...Array(Math.max(0, 8-items.length)).fill(null)];

  const rows = padded.map((i: any, idx: number) => `
    <tr>
      <td style="text-align:center">${idx+1}</td>
      <td>${i ? (i.item_name||i.description||"") : ""}</td>
      <td style="text-align:center">${i ? (i.unit_of_measure||i.unit||"") : ""}</td>
      <td style="text-align:center">${i ? (i.quantity||"") : ""}</td>
      <td style="text-align:right">${i && i.unit_price ? fmtMoney(i.unit_price, s.currencySymbol) : ""}</td>
      <td style="text-align:right">${i && i.quantity && i.unit_price ? fmtMoney(i.quantity*i.unit_price, s.currencySymbol) : ""}</td>
    </tr>`).join("");

  const body = `
    ${docHeader(s, "Local Purchase Order (LPO)", po.po_number)}
    ${refBar(
      { "LPO No": po.po_number, "Date Issued": formatDate(po.created_at||po.date), "Req. No": po.requisition_number||"—" },
      { "Delivery Date": formatDate(po.delivery_date), "Payment Terms": po.payment_terms||"30 Days", "Status": (po.status||"Draft").toUpperCase() }
    )}
    ${sectionHeader("I. Supplier Details")}
    ${fieldTable([
      ["Supplier Name", po.supplier_name||po.supplier||"—"],
      ["Supplier Address", po.supplier_address||"—"],
      ["Supplier Contact", po.supplier_phone||"—"],
      ["Supplier Email", po.supplier_email||"—"],
      ["PIN / Tax No.", po.supplier_pin||"—"],
    ])}
    ${sectionHeader("II. Order Details")}
    <table class="items">
      <thead><tr>
        <th style="width:30px">#</th>
        <th>Description of Goods/Services</th>
        <th>Unit</th>
        <th>Qty</th>
        <th>Unit Price (${s.currencySymbol})</th>
        <th>Amount (${s.currencySymbol})</th>
      </tr></thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr><td colspan="4" style="text-align:right">SUB-TOTAL</td><td></td><td style="text-align:right">${fmtMoney(subtotal, s.currencySymbol)}</td></tr>
        ${vatAmt > 0 ? `<tr><td colspan="4" style="text-align:right">VAT (${po.vat_rate||16}%)</td><td></td><td style="text-align:right">${fmtMoney(vatAmt, s.currencySymbol)}</td></tr>` : ""}
        <tr><td colspan="4" style="text-align:right;font-size:10.5pt;">TOTAL</td><td></td><td style="text-align:right;font-size:10.5pt;">${fmtMoney(total, s.currencySymbol)}</td></tr>
      </tfoot>
    </table>
    <div class="amt-words">Amount in Words: <strong>${amountInWords(total, s.currencySymbol)}</strong></div>
    ${po.terms_conditions ? `${sectionHeader("III. Terms & Conditions")}<p style="padding:6px 0;font-size:9pt">${po.terms_conditions}</p>` : ""}
    ${sectionHeader("IV. Authorization")}
    ${sigGrid(["Procurement Officer","Procurement Manager","Finance Officer","Accounting Officer / CEO"], 4, s.showStamp)}
    ${docFooter(s)}
  `;
  openPrint(body, `LPO ${po.po_number}`, baseCss(s));
}

// ─── GOODS RECEIVED NOTE (GRN) ───────────────────────────────────────────────
export function printGRN(grn: any, cfg?: PrintSettings): void {
  const s = merge(cfg);
  grn = { ...grn, grn_number: uniqueSerial("GRN", grn.grn_number) };
  const items = grn.items || grn.grn_items || [];
  const padded = [...items, ...Array(Math.max(0, 8-items.length)).fill(null)];

  const rows = padded.map((i: any, idx: number) => `
    <tr>
      <td style="text-align:center">${idx+1}</td>
      <td>${i ? (i.item_name||i.description||"") : ""}</td>
      <td style="text-align:center">${i ? (i.unit_of_measure||"") : ""}</td>
      <td style="text-align:center">${i ? (i.quantity_ordered||"") : ""}</td>
      <td style="text-align:center">${i ? (i.quantity_received||"") : ""}</td>
      <td style="text-align:center">${i ? (i.quantity_accepted||i.quantity_received||"") : ""}</td>
      <td style="text-align:center">${i && i.quantity_ordered && i.quantity_received ? Math.max(0,(i.quantity_ordered-i.quantity_received)) : ""}</td>
      <td>${i ? (i.condition||"Good") : ""}</td>
    </tr>`).join("");

  const body = `
    ${docHeader(s, "Goods Received Note (GRN)", grn.grn_number)}
    ${refBar(
      { "GRN No": grn.grn_number, "Date Received": formatDate(grn.received_date||grn.created_at), "LPO No": grn.po_number||grn.lpo_number||"—" },
      { "Supplier": grn.supplier_name||"—", "Received By": grn.received_by||"—", "Store": grn.store_location||grn.store||"Main Store" }
    )}
    ${sectionHeader("I. Delivery Details")}
    ${fieldTable([
      ["Supplier Name", grn.supplier_name||"—"],
      ["Delivery Note No.", grn.delivery_note_number||grn.waybill_number||"—"],
      ["Invoice No.", grn.invoice_number||"—"],
      ["Received By", grn.received_by||"—"],
      ["Date Received", formatDate(grn.received_date||grn.created_at)],
    ])}
    ${sectionHeader("II. Items Received")}
    <table class="items">
      <thead><tr>
        <th style="width:30px">#</th><th>Description</th><th>Unit</th>
        <th>Ordered</th><th>Received</th><th>Accepted</th><th>Variance</th><th>Condition</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${grn.remarks ? `${sectionHeader("III. Remarks")}<p style="padding:6px;font-size:9.5pt;border:1px solid #ccc;">${grn.remarks}</p>` : ""}
    ${sectionHeader("IV. Certification")}
    ${sigGrid(["Store Keeper","Quality Inspector","Procurement Officer","HOD / Authorizing Officer"], 4, s.showStamp)}
    ${docFooter(s)}
  `;
  openPrint(body, `GRN ${grn.grn_number}`, baseCss(s));
}

// ─── PAYMENT VOUCHER ─────────────────────────────────────────────────────────
export function printPaymentVoucher(v: any, cfg?: PrintSettings): void {
  const s = merge(cfg);
  v = { ...v, voucher_number: uniqueSerial("PV", v.voucher_number) };
  const total = parseFloat(v.total_amount||v.amount||0);

  const body = `
    ${docHeader(s, "Payment Voucher", v.voucher_number)}
    ${refBar(
      { "Voucher No": v.voucher_number, "Date": formatDate(v.created_at||v.date), "Cheque No": v.cheque_number||"—" },
      { "Fund": v.fund_code||v.fund||"—", "Vote Head": v.vote_head||"—", "Status": (v.status||"Draft").toUpperCase() }
    )}
    ${sectionHeader("I. Payee Details")}
    ${fieldTable([
      ["Pay To (Payee)", v.payee_name||v.supplier_name||"—"],
      ["Payee PIN/ID", v.payee_pin||v.supplier_pin||"—"],
      ["Bank Name", v.bank_name||"—"],
      ["Account No.", v.account_number||"—"],
      ["Payment Method", v.payment_method||"Cheque"],
    ])}
    ${sectionHeader("II. Payment Details")}
    ${fieldTable([
      ["Description / Narration", v.description||v.narration||"—"],
      ["LPO / Invoice Reference", v.lpo_number||v.invoice_number||"—"],
      ["GRN Reference", v.grn_number||"—"],
      ["Period", v.period||"—"],
    ])}
    ${sectionHeader("III. Amount")}
    <table class="items" style="width:50%;margin-left:auto">
      <tbody>
        ${v.subtotal ? `<tr><td>Sub-Total</td><td style="text-align:right">${fmtMoney(v.subtotal, s.currencySymbol)}</td></tr>` : ""}
        ${v.tax_amount ? `<tr><td>WHT / Tax</td><td style="text-align:right">(${fmtMoney(v.tax_amount, s.currencySymbol)})</td></tr>` : ""}
        <tr><td style="font-weight:700;font-size:10.5pt;">TOTAL PAYABLE</td><td style="text-align:right;font-weight:700;font-size:10.5pt;">${fmtMoney(total, s.currencySymbol)}</td></tr>
      </tbody>
    </table>
    <div class="amt-words">Amount in Words: <strong>${amountInWords(total, s.currencySymbol)}</strong></div>
    ${sectionHeader("IV. Certification & Authorization")}
    ${sigGrid(["Prepared By","Verified By (Procurement)","Finance Officer","Accounting Officer"], 4, s.showStamp)}
    ${docFooter(s)}
  `;
  openPrint(body, `Payment Voucher ${v.voucher_number}`, baseCss(s));
}

// ─── JOURNAL VOUCHER ─────────────────────────────────────────────────────────
export function printJournalVoucher(v: any, cfg?: PrintSettings): void {
  const s = merge(cfg);
  v = { ...v, voucher_number: uniqueSerial("JV", v.voucher_number) };
  const entries = v.entries || v.journal_entries || [];
  const totalDr = entries.reduce((sum: number, e: any) => sum + (parseFloat(e.debit)||0), 0);
  const totalCr = entries.reduce((sum: number, e: any) => sum + (parseFloat(e.credit)||0), 0);
  const padded = [...entries, ...Array(Math.max(0, 6-entries.length)).fill(null)];

  const rows = padded.map((e: any, idx: number) => `
    <tr>
      <td style="text-align:center">${idx+1}</td>
      <td>${e ? (e.account_code||"") : ""}</td>
      <td>${e ? (e.account_name||e.description||"") : ""}</td>
      <td>${e ? (e.narration||"") : ""}</td>
      <td style="text-align:right">${e && e.debit ? fmtMoney(e.debit, s.currencySymbol) : ""}</td>
      <td style="text-align:right">${e && e.credit ? fmtMoney(e.credit, s.currencySymbol) : ""}</td>
    </tr>`).join("");

  const body = `
    ${docHeader(s, "Journal Voucher", v.voucher_number)}
    ${refBar(
      { "JV No": v.voucher_number, "Date": formatDate(v.created_at||v.date), "Period": v.period||"—" },
      { "Type": (v.voucher_type||"General").toUpperCase(), "Prepared By": v.prepared_by||"—", "Status": (v.status||"Draft").toUpperCase() }
    )}
    ${sectionHeader("I. Journal Entries")}
    <table class="items">
      <thead><tr>
        <th style="width:30px">#</th><th>Account Code</th><th>Account Name</th>
        <th>Narration</th><th>Debit (${s.currencySymbol})</th><th>Credit (${s.currencySymbol})</th>
      </tr></thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="text-align:right;font-weight:700">TOTALS</td><td></td>
          <td style="text-align:right;font-weight:700">${fmtMoney(totalDr, s.currencySymbol)}</td>
          <td style="text-align:right;font-weight:700">${fmtMoney(totalCr, s.currencySymbol)}</td>
        </tr>
        <tr>
          <td colspan="5" style="text-align:right">Balance (Dr-Cr)</td>
          <td style="text-align:right;font-weight:700;${Math.abs(totalDr-totalCr)>0.01?'color:#dc2626!important':'color:#107c10!important'}">${fmtMoney(totalDr-totalCr, s.currencySymbol)}</td>
        </tr>
      </tfoot>
    </table>
    ${v.narration ? `${sectionHeader("II. Narration")}<p style="padding:6px;border:1px solid #ccc;font-size:9.5pt">${v.narration}</p>` : ""}
    ${sectionHeader("III. Authorization")}
    ${sigGrid(["Prepared By","Checked By","Finance Officer","Accounting Officer"], 4, s.showStamp)}
    ${docFooter(s)}
  `;
  openPrint(body, `Journal Voucher ${v.voucher_number}`, baseCss(s));
}

// ─── GENERIC VOUCHER ─────────────────────────────────────────────────────────
export function printVoucher(v: any, type: string = "Voucher", cfg?: PrintSettings): void {
  const s = merge(cfg);
  const prefix = type === "Receipt" ? "RV" : type === "Purchase" ? "PurchV" : type === "Sales" ? "SV" : "VCH";
  v = { ...v, voucher_number: uniqueSerial(prefix, v.voucher_number) };
  const amount = parseFloat(v.total_amount||v.amount||0);

  const body = `
    ${docHeader(s, `${type} Voucher`, v.voucher_number)}
    ${refBar(
      { "Voucher No": v.voucher_number, "Date": formatDate(v.created_at||v.date) },
      { "Type": type.toUpperCase(), "Status": (v.status||"Draft").toUpperCase() }
    )}
    ${sectionHeader("I. Details")}
    ${fieldTable([
      ["Party Name", v.payee_name||v.party_name||v.supplier_name||"—"],
      ["Description", v.description||v.narration||"—"],
      ["Reference", v.reference||v.invoice_number||"—"],
      ["Payment Method", v.payment_method||"—"],
      ["Period", v.period||"—"],
    ])}
    ${sectionHeader("II. Amount")}
    <table class="items" style="width:50%;margin-left:auto">
      <tbody>
        <tr><td style="font-weight:700">TOTAL</td><td style="text-align:right;font-weight:700">${fmtMoney(amount, s.currencySymbol)}</td></tr>
      </tbody>
    </table>
    <div class="amt-words">Amount in Words: <strong>${amountInWords(amount, s.currencySymbol)}</strong></div>
    ${sectionHeader("III. Authorization")}
    ${sigGrid(["Prepared By","Authorized By","Finance Officer","Accounting Officer"], 4, s.showStamp)}
    ${docFooter(s)}
  `;
  openPrint(body, `${type} Voucher ${v.voucher_number}`, baseCss(s));
}

// ─── LABORATORY / GENERAL REPORT FORM (matches scanned template) ─────────────
export function printLabReport(r: any, cfg?: PrintSettings): void {
  const s = merge(cfg);
  const serial = uniqueSerial("LAB", r.report_number);

  const body = `
    ${docHeader(s, "Laboratory General Report Form", serial)}
    ${sectionHeader("I. Patient Details")}
    ${fieldTable([
      ["Name", r.patient_name||"—"],
      ["Age", r.age ? `${r.age} Years` : "—"],
      ["Gender", r.gender||"—"],
      ["IP/OP No.", r.patient_id||r.ipop_number||"—"],
    ])}
    <table class="field-table" style="margin-bottom:6px">
      <tr>
        <td class="field-label">Received Date/Time</td><td>${formatDate(r.received_date)} ${r.received_time||""}</td>
        <td class="field-label">Completed Date/Time</td><td>${formatDate(r.completed_date)} ${r.completed_time||""}</td>
      </tr>
      <tr>
        <td class="field-label">Released Date/Time</td><td>${formatDate(r.released_date)} ${r.released_time||""}</td>
        <td class="field-label"></td><td></td>
      </tr>
    </table>
    ${sectionHeader("II. Specimen Details")}
    ${fieldTable([
      ["Sample No.", r.sample_number||"—"],
      ["Requesting Clinician", r.requesting_clinician||"—"],
      ["Diagnosis", r.diagnosis||"—"],
      ["Specimen Type", r.specimen_type||"—"],
    ])}
    ${sectionHeader("III. Test Results")}
    <table class="items">
      <thead><tr>
        <th>Analysis</th><th>Result</th><th>Units</th><th>Ref Range</th><th>Interpretation</th>
      </tr></thead>
      <tbody>
        ${(r.results||[]).map((res: any) => `
          <tr>
            <td>${res.analysis||res.test||"—"}</td>
            <td style="font-weight:700">${res.result||"—"}</td>
            <td>${res.units||"—"}</td>
            <td>${res.ref_range||res.reference_range||"—"}</td>
            <td>${res.interpretation||"—"}</td>
          </tr>`).join("")}
        ${!(r.results||[]).length ? `<tr><td colspan="5" style="text-align:center;font-style:italic">No results recorded</td></tr>` : ""}
      </tbody>
    </table>
    ${r.comments ? `${sectionHeader("IV. Comments / Clinical Notes")}<p style="padding:8px;border:1px solid #ccc;font-size:9.5pt">${r.comments}</p>` : ""}
    ${sectionHeader("V. Authorized By")}
    ${sigGrid(["Laboratory Technician","Senior Technologist","Pathologist","Medical Officer"], 4, s.showStamp)}
    ${docFooter(s)}
  `;
  openPrint(body, `Lab Report ${serial}`, baseCss(s));
}

// ─── GENERIC DOCUMENT PRINTER ─────────────────────────────────────────────────
export function printDocument(type: string, data: any, cfg?: PrintSettings): void {
  switch (type.toUpperCase()) {
    case "REQ":       return printRequisition(data, cfg);
    case "LPO":       return printLPO(data, cfg);
    case "GRN":       return printGRN(data, cfg);
    case "PV":        return printPaymentVoucher(data, cfg);
    case "JV":        return printJournalVoucher(data, cfg);
    case "RV":        return printVoucher(data, "Receipt", cfg);
    case "PURCHASE":  return printVoucher(data, "Purchase", cfg);
    case "SALES":     return printVoucher(data, "Sales", cfg);
    case "LAB":       return printLabReport(data, cfg);
    default:          return printVoucher(data, type, cfg);
  }
}

// Alias for v4 compatibility
export const printPurchaseOrder = printLPO;
