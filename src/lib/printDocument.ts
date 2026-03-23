/**
 * ProcurBosse — EL5 MediProcure Print Engine v3.0
 * ALL documents use the exact Embu County Government official letterhead.
 * Matches scanned Lab Report Form: EMBU COUNTY GOVERNMENT > DEPARTMENT OF HEALTH > SEAL > EMBU LEVEL 5 HOSPITAL > FORM TITLE > Note: Private and Confidential
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

function merge(s?: PrintSettings): Required<PrintSettings> { return { ...DEF, ...s }; }

function uniqueSerial(prefix: string, existingRef?: string): string {
  if (existingRef && existingRef !== "—" && existingRef !== "") return existingRef;
  const d = new Date();
  return `${prefix}-${String(d.getFullYear()).slice(-2)}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}-${Math.floor(1000+Math.random()*9000)}`;
}

function amountInWords(amount: number, currency = "Kenya Shillings"): string {
  if (!amount || isNaN(amount)) return "";
  const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  function w(n: number): string {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? " "+ones[n%10] : "");
    if (n < 1000) return ones[Math.floor(n/100)]+" Hundred"+(n%100 ? " "+w(n%100) : "");
    if (n < 1000000) return w(Math.floor(n/1000))+" Thousand"+(n%1000 ? " "+w(n%1000) : "");
    return w(Math.floor(n/1000000))+" Million"+(n%1000000 ? " "+w(n%1000000) : "");
  }
  const int = Math.floor(amount);
  const dec = Math.round((amount - int)*100);
  return (int > 0 ? w(int) : "Zero")+" "+currency+(dec > 0 ? " and "+w(dec)+" Cents" : "")+" Only";
}

function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString("en-KE", { day:"2-digit", month:"long", year:"numeric" });
}

function formatDateTime(d: string | Date | null | undefined, t?: string): string {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return `${dt.toLocaleDateString("en-KE",{day:"2-digit",month:"2-digit",year:"numeric"})}  ${t||dt.toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit"})}`;
}

function fmtMoney(v: any, sym = "KES"): string {
  return `${sym} ${(parseFloat(v)||0).toLocaleString("en-KE",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
}

function baseCss(s: Required<PrintSettings>): string {
  return `<style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'${s.printFont}','Times New Roman',Times,serif;font-size:${s.printFontSize}pt;color:#000!important;background:#fff;padding:18px 28px}
    @media print{body{padding:6mm 10mm}@page{size:A4 portrait;margin:8mm 12mm}.no-print{display:none!important}}
    h1,h2,h3,p,td,th,div,span{color:#000!important}
    .lh{text-align:center;padding-bottom:8px;margin-bottom:10px;border-bottom:2px solid #000}
    .lh-county{font-size:16pt;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin-bottom:2px}
    .lh-dept{font-size:12pt;font-weight:700;text-transform:uppercase;margin-bottom:6px}
    .lh-seal{height:80px;width:auto;display:block;margin:6px auto}
    .lh-seal-ph{width:80px;height:80px;border:3px solid #1a3a6b;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:7pt;font-weight:900;text-align:center;color:#1a3a6b!important;margin:6px 0;line-height:1.3}
    .lh-hosp{font-size:13pt;font-weight:900;text-transform:uppercase;color:#1a3a6b!important;margin:5px 0 3px;letter-spacing:.5px}
    .lh-title{font-size:12pt;font-weight:900;text-transform:uppercase;letter-spacing:1px;margin-top:4px}
    .lh-sub{font-size:10pt;font-weight:700;margin-top:2px}
    .lh-note{font-size:9pt;font-style:italic;margin-top:3px}
    .ref-bar{display:flex;justify-content:space-between;border:1px solid #000;padding:5px 10px;margin-bottom:8px;font-size:9pt;background:#f9f9f9}
    .ref-bar>div{line-height:1.6}
    .sec{background:#1a3a6b;color:#fff!important;padding:4px 10px;font-size:10pt;font-weight:700;margin:10px 0 0;text-transform:uppercase}
    .ft{width:100%;border-collapse:collapse;margin-bottom:0}
    .ft td{padding:4px 8px;font-size:9.5pt;border:1px solid #000;vertical-align:top}
    .ft .lbl{font-weight:700;width:170px;background:#f2f2f2;white-space:nowrap}
    table.items{width:100%;border-collapse:collapse;margin:6px 0;font-size:9.5pt}
    table.items th{background:#1a3a6b;color:#fff!important;text-align:center;padding:5px 6px;font-weight:700;border:1px solid #000}
    table.items td{border:1px solid #000;padding:4px 7px;vertical-align:middle}
    table.items tbody tr:nth-child(even) td{background:#f8f8f8}
    table.items tfoot td{font-weight:700;background:#e8edf5;border-top:2px solid #000}
    .amt-words{font-style:italic;font-size:9pt;border:1px solid #000;padding:5px 10px;margin-top:4px}
    .sig-grid{display:grid;gap:14px;margin-top:18px}
    .sig-2{grid-template-columns:repeat(2,1fr)}.sig-3{grid-template-columns:repeat(3,1fr)}.sig-4{grid-template-columns:repeat(4,1fr)}
    .sig-box{text-align:center}
    .sig-line{border-bottom:1.5px solid #000;margin:38px 0 4px}
    .sig-lbl{font-weight:700;font-size:8.5pt;text-transform:uppercase}
    .sig-name,.sig-dt{font-size:8pt;margin-top:2px}
    .stamp{width:75px;height:75px;border:2px solid #000;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:7pt;font-weight:700;text-transform:uppercase;text-align:center;line-height:1.3;margin-top:8px}
    .doc-footer{margin-top:16px;border-top:1.5px solid #000;padding-top:5px;font-size:8pt;display:flex;justify-content:space-between;flex-wrap:wrap;gap:4px}
    .watermark{position:fixed;top:42%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:62pt;font-weight:900;opacity:.04;pointer-events:none;white-space:nowrap;z-index:0}
    .print-btn{display:inline-block;margin:14px 0 0;padding:9px 22px;background:#1a3a6b;color:#fff!important;border:none;border-radius:5px;font-size:12pt;font-weight:700;cursor:pointer}
    @media print{.print-btn{display:none!important}}
  </style>`;
}

function lh(s: Required<PrintSettings>, docTitle: string, docRef?: string): string {
  let sealHtml = "";
  if (s.showLogo) {
    if (s.sealUrl || s.logoUrl) sealHtml = `<img src="${s.sealUrl||s.logoUrl}" alt="Seal" class="lh-seal" onerror="this.style.display='none'"/>`;
    else sealHtml = `<div class="lh-seal-ph">EMBU<br/>COUNTY<br/>SEAL</div>`;
  }
  return `
    ${s.showWatermark ? `<div class="watermark">OFFICIAL</div>` : ""}
    <div class="lh">
      <div class="lh-county">${s.countyName}</div>
      <div class="lh-dept">${s.departmentName}</div>
      ${sealHtml}
      <div class="lh-hosp">${s.hospitalName}</div>
      <div class="lh-title">${docTitle}</div>
      ${docRef ? `<div class="lh-sub">${docRef}</div>` : ""}
      ${s.confidential ? `<div class="lh-note">Note: Private and Confidential</div>` : ""}
    </div>`;
}

function rb(L: Record<string,string>, R: Record<string,string>): string {
  const l = Object.entries(L).map(([k,v])=>`<div><strong>${k}:</strong> ${v||"—"}</div>`).join("");
  const r = Object.entries(R).map(([k,v])=>`<div><strong>${k}:</strong> ${v||"—"}</div>`).join("");
  return `<div class="ref-bar"><div>${l}</div><div style="text-align:right">${r}</div></div>`;
}

function s(text: string): string { return `<div class="sec">${text}</div>`; }

function ft(rows: [string,string][]): string {
  return `<table class="ft">${rows.map(([l,v])=>`<tr><td class="lbl">${l}</td><td>${v||"&nbsp;"}</td></tr>`).join("")}</table>`;
}

function footer(s: Required<PrintSettings>): string {
  return `<div class="doc-footer"><span>${s.docFooter}</span><span>Printed: ${new Date().toLocaleString("en-KE")} · ${s.sysName} · OFFICIAL DOCUMENT</span></div>`;
}

function sigs(labels: string[], cols: 2|3|4 = 4, stamp = false): string {
  return `<div class="sig-grid sig-${cols}">${labels.map((l,i)=>`
    <div class="sig-box">
      ${stamp && i===labels.length-1 ? `<div class="stamp">OFFICIAL<br/>STAMP</div>` : ""}
      <div class="sig-line"></div>
      <div class="sig-lbl">${l}</div>
      <div class="sig-name">Name: ___________________</div>
      <div class="sig-dt">Date: ___________________</div>
    </div>`).join("")}</div>`;
}

function openPrint(body: string, title: string, css: string): void {
  const win = window.open("","_blank","width=960,height=800,scrollbars=yes");
  if (!win) { alert("Please allow pop-ups to print documents."); return; }
  win.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${title}</title>${css}</head><body>${body}<div style="text-align:center;margin-top:10px" class="no-print"><button class="print-btn" onclick="window.print()">🖨️ Print Document</button></div></body></html>`);
  win.document.close(); win.focus(); setTimeout(()=>win.print(), 800);
}

// ─── REQUISITION ───────────────────────────────────────────────────────────
export function printRequisition(r: any, cfg?: PrintSettings): void {
  const S = merge(cfg);
  r = { ...r, requisition_number: uniqueSerial("REQ", r.requisition_number) };
  const items = r.requisition_items || [];
  const total = items.reduce((x: number, i: any)=>x+((i.quantity||0)*(i.unit_price||0)), 0)||(r.total_amount||0);
  const padded = [...items, ...Array(Math.max(0,8-items.length)).fill(null)];
  const rows = padded.map((i: any,idx: number)=>`<tr><td style="text-align:center">${idx+1}</td><td>${i?(i.item_name||""):""}</td><td>${i?(i.description||i.specifications||""):""}</td><td style="text-align:center">${i?(i.unit_of_measure||""):""}</td><td style="text-align:center">${i?(i.quantity||""):""}</td><td style="text-align:right">${i&&i.unit_price?fmtMoney(i.unit_price,S.currencySymbol):""}</td><td style="text-align:right">${i&&i.quantity&&i.unit_price?fmtMoney(i.quantity*i.unit_price,S.currencySymbol):""}</td></tr>`).join("");
  const body = `${lh(S,"Local Purchase Requisition Form",r.requisition_number)}
    ${rb({"Requisition No":r.requisition_number,"Date":formatDate(r.created_at||r.date),"Priority":(r.priority||"Normal").toUpperCase()},{"Department":r.department||"—","Requested By":r.requester_name||"—","Status":(r.status||"Pending").toUpperCase()})}
    ${s("I. Requisition Details")}${ft([["Description / Purpose",r.title||r.description||"—"],["Department",r.department||"—"],["Requested By",r.requester_name||"—"],["Required By Date",formatDate(r.required_date||r.due_date)],["Delivery Location",r.delivery_location||r.hospital_ward||"—"],["Notes / Justification",r.notes||r.justification||"—"]])}
    ${s("II. Items Required")}<table class="items"><thead><tr><th style="width:28px">#</th><th>Item Description</th><th>Specifications</th><th>Unit</th><th>Qty</th><th>Unit Price (${S.currencySymbol})</th><th>Amount (${S.currencySymbol})</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan="5" style="text-align:right;font-weight:700">TOTAL AMOUNT</td><td></td><td style="text-align:right;font-weight:700">${fmtMoney(total,S.currencySymbol)}</td></tr></tfoot></table>
    <div class="amt-words">Amount in Words: <strong>${amountInWords(total,S.currencySymbol)}</strong></div>
    ${s("III. Authorization")}${sigs(["Requisitioner","HOD / Supervisor","Procurement Officer","Approval / Finance"],4,S.showStamp)}${footer(S)}`;
  openPrint(body,`Requisition ${r.requisition_number}`,baseCss(S));
}

// ─── LPO ───────────────────────────────────────────────────────────────────
export function printLPO(po: any, cfg?: PrintSettings): void {
  const S = merge(cfg);
  po = { ...po, po_number: uniqueSerial("LPO", po.po_number) };
  const items = po.items||po.purchase_order_items||[];
  const sub = items.reduce((x: number,i: any)=>x+((i.quantity||0)*(i.unit_price||0)),0)||(po.total_amount||0);
  const vatR = parseFloat(po.vat_rate||"16")/100;
  const vat = po.include_vat ? sub*vatR : 0;
  const total = sub + vat;
  const padded = [...items,...Array(Math.max(0,8-items.length)).fill(null)];
  const rows = padded.map((i: any,idx: number)=>`<tr><td style="text-align:center">${idx+1}</td><td>${i?(i.item_name||i.description||""):""}</td><td style="text-align:center">${i?(i.unit_of_measure||i.unit||""):""}</td><td style="text-align:center">${i?(i.quantity||""):""}</td><td style="text-align:right">${i&&i.unit_price?fmtMoney(i.unit_price,S.currencySymbol):""}</td><td style="text-align:right">${i&&i.quantity&&i.unit_price?fmtMoney(i.quantity*i.unit_price,S.currencySymbol):""}</td></tr>`).join("");
  const body = `${lh(S,"Local Purchase Order (LPO)",po.po_number)}
    ${rb({"LPO No":po.po_number,"Date Issued":formatDate(po.created_at||po.date),"Req. No":po.requisition_number||"—"},{"Delivery Date":formatDate(po.delivery_date),"Payment Terms":po.payment_terms||"30 Days","Status":(po.status||"Draft").toUpperCase()})}
    ${s("I. Supplier Details")}${ft([["Supplier Name",po.supplier_name||po.supplier||"—"],["Supplier Address",po.supplier_address||"—"],["Supplier Contact",po.supplier_phone||"—"],["Supplier Email",po.supplier_email||"—"],["PIN / Tax No.",po.supplier_pin||"—"]])}
    ${s("II. Order Details")}<table class="items"><thead><tr><th style="width:28px">#</th><th>Description of Goods / Services</th><th>Unit</th><th>Qty</th><th>Unit Price (${S.currencySymbol})</th><th>Amount (${S.currencySymbol})</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan="4" style="text-align:right">SUB-TOTAL</td><td></td><td style="text-align:right">${fmtMoney(sub,S.currencySymbol)}</td></tr>${vat>0?`<tr><td colspan="4" style="text-align:right">VAT (${po.vat_rate||16}%)</td><td></td><td style="text-align:right">${fmtMoney(vat,S.currencySymbol)}</td></tr>`:""}<tr><td colspan="4" style="text-align:right;font-size:10.5pt">TOTAL</td><td></td><td style="text-align:right;font-size:10.5pt">${fmtMoney(total,S.currencySymbol)}</td></tr></tfoot></table>
    <div class="amt-words">Amount in Words: <strong>${amountInWords(total,S.currencySymbol)}</strong></div>
    ${po.terms_conditions?`${s("III. Terms & Conditions")}<p style="padding:5px 8px;border:1px solid #ccc;font-size:9pt">${po.terms_conditions}</p>`:""}
    ${s("IV. Authorization")}${sigs(["Procurement Officer","Procurement Manager","Finance Officer","Accounting Officer / CEO"],4,S.showStamp)}${footer(S)}`;
  openPrint(body,`LPO ${po.po_number}`,baseCss(S));
}

// ─── GRN ───────────────────────────────────────────────────────────────────
export function printGRN(grn: any, cfg?: PrintSettings): void {
  const S = merge(cfg);
  grn = { ...grn, grn_number: uniqueSerial("GRN", grn.grn_number) };
  const items = grn.items||grn.grn_items||[];
  const padded = [...items,...Array(Math.max(0,8-items.length)).fill(null)];
  const rows = padded.map((i: any,idx: number)=>`<tr><td style="text-align:center">${idx+1}</td><td>${i?(i.item_name||i.description||""):""}</td><td style="text-align:center">${i?(i.unit_of_measure||""):""}</td><td style="text-align:center">${i?(i.quantity_ordered||""):""}</td><td style="text-align:center">${i?(i.quantity_received||""):""}</td><td style="text-align:center">${i?(i.quantity_accepted||i.quantity_received||""):""}</td><td style="text-align:center">${i&&i.quantity_ordered&&i.quantity_received?Math.max(0,i.quantity_ordered-i.quantity_received):""}</td><td>${i?(i.condition||"Good"):""}</td></tr>`).join("");
  const body = `${lh(S,"Goods Received Note (GRN)",grn.grn_number)}
    ${rb({"GRN No":grn.grn_number,"Date Received":formatDate(grn.received_date||grn.created_at),"LPO No":grn.po_number||grn.lpo_number||"—"},{"Supplier":grn.supplier_name||"—","Received By":grn.received_by||"—","Store":grn.store_location||grn.store||"Main Store"})}
    ${s("I. Delivery Details")}${ft([["Supplier Name",grn.supplier_name||"—"],["Delivery Note No.",grn.delivery_note_number||grn.waybill_number||"—"],["Invoice No.",grn.invoice_number||"—"],["Received By",grn.received_by||"—"],["Date Received",formatDate(grn.received_date||grn.created_at)]])}
    ${s("II. Items Received")}<table class="items"><thead><tr><th style="width:28px">#</th><th>Description</th><th>Unit</th><th>Ordered</th><th>Received</th><th>Accepted</th><th>Variance</th><th>Condition</th></tr></thead><tbody>${rows}</tbody></table>
    ${grn.remarks?`${s("III. Remarks")}<p style="padding:6px 8px;border:1px solid #ccc;font-size:9.5pt">${grn.remarks}</p>`:""}
    ${s("IV. Certification")}${sigs(["Store Keeper","Quality Inspector","Procurement Officer","HOD / Authorizing Officer"],4,S.showStamp)}${footer(S)}`;
  openPrint(body,`GRN ${grn.grn_number}`,baseCss(S));
}

// ─── PAYMENT VOUCHER ────────────────────────────────────────────────────────
export function printPaymentVoucher(v: any, cfg?: PrintSettings): void {
  const S = merge(cfg);
  v = { ...v, voucher_number: uniqueSerial("PV", v.voucher_number) };
  const total = parseFloat(v.total_amount||v.amount||0);
  const body = `${lh(S,"Payment Voucher",v.voucher_number)}
    ${rb({"Voucher No":v.voucher_number,"Date":formatDate(v.created_at||v.date),"Cheque No":v.cheque_number||"—"},{"Fund":v.fund_code||v.fund||"—","Vote Head":v.vote_head||"—","Status":(v.status||"Draft").toUpperCase()})}
    ${s("I. Payee Details")}${ft([["Pay To (Payee)",v.payee_name||v.supplier_name||"—"],["Payee PIN / ID No.",v.payee_pin||v.supplier_pin||"—"],["Bank Name",v.bank_name||"—"],["Account No.",v.account_number||"—"],["Payment Method",v.payment_method||"Cheque"]])}
    ${s("II. Payment Details")}${ft([["Description / Narration",v.description||v.narration||"—"],["LPO / Invoice Reference",v.lpo_number||v.invoice_number||"—"],["GRN Reference",v.grn_number||"—"],["Period",v.period||"—"]])}
    ${s("III. Amount")}<table class="items" style="width:55%;margin-left:auto"><tbody>${v.subtotal?`<tr><td>Sub-Total</td><td style="text-align:right">${fmtMoney(v.subtotal,S.currencySymbol)}</td></tr>`:""} ${v.tax_amount?`<tr><td>WHT / Tax</td><td style="text-align:right">(${fmtMoney(v.tax_amount,S.currencySymbol)})</td></tr>`:""}<tr><td style="font-weight:700;font-size:10.5pt">TOTAL PAYABLE</td><td style="text-align:right;font-weight:700;font-size:10.5pt">${fmtMoney(total,S.currencySymbol)}</td></tr></tbody></table>
    <div class="amt-words">Amount in Words: <strong>${amountInWords(total,S.currencySymbol)}</strong></div>
    ${s("IV. Certification & Authorization")}${sigs(["Prepared By","Verified By (Procurement)","Finance Officer","Accounting Officer"],4,S.showStamp)}${footer(S)}`;
  openPrint(body,`Payment Voucher ${v.voucher_number}`,baseCss(S));
}

// ─── JOURNAL VOUCHER ────────────────────────────────────────────────────────
export function printJournalVoucher(v: any, cfg?: PrintSettings): void {
  const S = merge(cfg);
  v = { ...v, voucher_number: uniqueSerial("JV", v.voucher_number) };
  const entries = v.entries||v.journal_entries||[];
  const totalDr = entries.reduce((x: number,e: any)=>x+(parseFloat(e.debit)||0),0);
  const totalCr = entries.reduce((x: number,e: any)=>x+(parseFloat(e.credit)||0),0);
  const padded = [...entries,...Array(Math.max(0,6-entries.length)).fill(null)];
  const rows = padded.map((e: any,idx: number)=>`<tr><td style="text-align:center">${idx+1}</td><td>${e?(e.account_code||""):""}</td><td>${e?(e.account_name||e.description||""):""}</td><td>${e?(e.narration||""):""}</td><td style="text-align:right">${e&&e.debit?fmtMoney(e.debit,S.currencySymbol):""}</td><td style="text-align:right">${e&&e.credit?fmtMoney(e.credit,S.currencySymbol):""}</td></tr>`).join("");
  const body = `${lh(S,"Journal Voucher",v.voucher_number)}
    ${rb({"JV No":v.voucher_number,"Date":formatDate(v.created_at||v.date),"Period":v.period||"—"},{"Type":(v.voucher_type||"General").toUpperCase(),"Prepared By":v.prepared_by||"—","Status":(v.status||"Draft").toUpperCase()})}
    ${s("I. Journal Entries")}<table class="items"><thead><tr><th style="width:28px">#</th><th>Account Code</th><th>Account Name</th><th>Narration</th><th>Debit (${S.currencySymbol})</th><th>Credit (${S.currencySymbol})</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan="3" style="text-align:right;font-weight:700">TOTALS</td><td></td><td style="text-align:right;font-weight:700">${fmtMoney(totalDr,S.currencySymbol)}</td><td style="text-align:right;font-weight:700">${fmtMoney(totalCr,S.currencySymbol)}</td></tr></tfoot></table>
    ${v.narration?`${s("II. Narration")}<p style="padding:5px 8px;border:1px solid #ccc;font-size:9.5pt">${v.narration}</p>`:""}
    ${s("III. Authorization")}${sigs(["Prepared By","Checked By","Finance Officer","Accounting Officer"],4,S.showStamp)}${footer(S)}`;
  openPrint(body,`Journal Voucher ${v.voucher_number}`,baseCss(S));
}

// ─── GENERIC VOUCHER ────────────────────────────────────────────────────────
export function printVoucher(v: any, type = "Voucher", cfg?: PrintSettings): void {
  const S = merge(cfg);
  const pfx = type==="Receipt"?"RV":type==="Purchase"?"PurchV":type==="Sales"?"SV":"VCH";
  v = { ...v, voucher_number: uniqueSerial(pfx,v.voucher_number) };
  const amount = parseFloat(v.total_amount||v.amount||0);
  const body = `${lh(S,`${type} Voucher`,v.voucher_number)}
    ${rb({"Voucher No":v.voucher_number,"Date":formatDate(v.created_at||v.date)},{"Type":type.toUpperCase(),"Status":(v.status||"Draft").toUpperCase()})}
    ${s("I. Details")}${ft([["Party Name",v.payee_name||v.party_name||v.supplier_name||"—"],["Description",v.description||v.narration||"—"],["Reference",v.reference||v.invoice_number||"—"],["Payment Method",v.payment_method||"—"],["Period",v.period||"—"]])}
    ${s("II. Amount")}<table class="items" style="width:50%;margin-left:auto"><tbody><tr><td style="font-weight:700">TOTAL</td><td style="text-align:right;font-weight:700">${fmtMoney(amount,S.currencySymbol)}</td></tr></tbody></table>
    <div class="amt-words">Amount in Words: <strong>${amountInWords(amount,S.currencySymbol)}</strong></div>
    ${s("III. Authorization")}${sigs(["Prepared By","Authorized By","Finance Officer","Accounting Officer"],4,S.showStamp)}${footer(S)}`;
  openPrint(body,`${type} Voucher ${v.voucher_number}`,baseCss(S));
}

// ─── LAB REPORT — matches scanned Embu L5H form exactly ─────────────────────
export function printLabReport(r: any, cfg?: PrintSettings): void {
  const S = merge(cfg);
  const serial = uniqueSerial("LAB",r.report_number);
  const body = `${lh(S,"Laboratory General Report Form",serial)}
    ${s("I. Patient Details")}<table class="ft">
      <tr><td class="lbl">Name</td><td colspan="3">${r.patient_name||"—"}</td></tr>
      <tr><td class="lbl">Age</td><td>${r.age?`${r.age} YEARS`:"—"}</td><td class="lbl">Received Date/Time</td><td>${formatDateTime(r.received_date,r.received_time)}</td></tr>
      <tr><td class="lbl">Gender</td><td>${r.gender||"—"}</td><td class="lbl">Completed Date/Time</td><td>${formatDateTime(r.completed_date,r.completed_time)}</td></tr>
      <tr><td class="lbl">IP/OP No.</td><td>${r.patient_id||r.ipop_number||"—"}</td><td class="lbl">Released Date/Time</td><td>${formatDateTime(r.released_date,r.released_time)}</td></tr>
    </table>
    ${s("II. Specimen Details")}<table class="ft">
      <tr><td class="lbl">Sample No.</td><td colspan="3">${r.sample_number||"—"}</td></tr>
      <tr><td class="lbl">Requesting Clinician's Name</td><td colspan="3">${r.requesting_clinician||"—"}</td></tr>
      <tr><td class="lbl">Diagnosis</td><td colspan="3">${r.diagnosis||"—"}</td></tr>
      <tr><td class="lbl">Specimen Type</td><td colspan="3">${r.specimen_type||"—"}</td></tr>
    </table>
    ${s("III. Test Results")}<table class="items"><thead><tr><th>Analysis</th><th>Result</th><th>Units</th><th>Ref Range</th><th>Interpretation</th></tr></thead><tbody>
      ${(r.results||[]).map((res: any)=>`<tr><td>${res.analysis||res.test||"—"}</td><td style="font-weight:700">${res.result||"—"}</td><td>${res.units||"—"}</td><td>${res.ref_range||res.reference_range||"—"}</td><td>${res.interpretation||"—"}</td></tr>`).join("")}
      ${!(r.results||[]).length?`<tr><td style="text-align:center;padding:12px;font-style:italic" colspan="5">No test results recorded</td></tr>${Array(5).fill(0).map(()=>`<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td></tr>`).join("")}`:""}
    </tbody></table>
    ${r.comments?`${s("IV. Comments / Clinical Notes")}<p style="padding:8px;border:1px solid #ccc;font-size:9.5pt;min-height:36px">${r.comments}</p>`:""}
    ${s("V. Authorized By")}${sigs(["Laboratory Technician","Senior Technologist","Pathologist","Medical Officer"],4,S.showStamp)}${footer(S)}`;
  openPrint(body,`Lab Report ${serial}`,baseCss(S));
}

// ─── CONTRACT ───────────────────────────────────────────────────────────────
export function printContract(c: any, cfg?: PrintSettings): void {
  const S = merge(cfg);
  c = { ...c, contract_number: uniqueSerial("CNT",c.contract_number) };
  const body = `${lh(S,"Procurement Contract",c.contract_number)}
    ${rb({"Contract No":c.contract_number,"Date":formatDate(c.start_date||c.created_at),"Type":c.contract_type||"Supply"},{"Supplier":c.supplier_name||"—","Status":(c.status||"Draft").toUpperCase(),"Value":fmtMoney(c.contract_value||0,S.currencySymbol)})}
    ${s("I. Contract Details")}${ft([["Contract Title",c.title||c.description||"—"],["Supplier Name",c.supplier_name||"—"],["Contract Value",fmtMoney(c.contract_value||0,S.currencySymbol)],["Start Date",formatDate(c.start_date)],["End Date",formatDate(c.end_date)],["Contract Type",c.contract_type||"—"],["Payment Terms",c.payment_terms||"—"],["Procurement Method",c.procurement_method||"—"]])}
    ${c.scope_of_work?`${s("II. Scope of Work")}<p style="padding:6px 8px;border:1px solid #ccc;font-size:9.5pt">${c.scope_of_work}</p>`:""}
    ${s("III. Signatures")}${sigs(["Supplier Representative","Procurement Officer","Finance Officer","Accounting Officer / CEO"],4,S.showStamp)}${footer(S)}`;
  openPrint(body,`Contract ${c.contract_number}`,baseCss(S));
}

// ─── TENDER ─────────────────────────────────────────────────────────────────
export function printTender(t: any, cfg?: PrintSettings): void {
  const S = merge(cfg);
  t = { ...t, tender_number: uniqueSerial("TDR",t.tender_number) };
  const body = `${lh(S,"Tender Notice / Invitation to Bid",t.tender_number)}
    ${rb({"Tender No":t.tender_number,"Date":formatDate(t.created_at),"Method":t.procurement_method||"Open Tender"},{"Closing Date":formatDate(t.closing_date),"Status":(t.status||"Draft").toUpperCase(),"Budget":fmtMoney(t.budget_estimate||0,S.currencySymbol)})}
    ${s("I. Tender Details")}${ft([["Tender Title",t.title||"—"],["Description",t.description||"—"],["Category",t.category||"—"],["Procurement Method",t.procurement_method||"Open Tender"],["Budget Estimate",fmtMoney(t.budget_estimate||0,S.currencySymbol)],["Closing Date",formatDate(t.closing_date)],["Contact Person",t.contact_person||"—"],["Contact Email",t.contact_email||"—"]])}
    ${t.evaluation_criteria?`${s("II. Evaluation Criteria")}<p style="padding:6px 8px;border:1px solid #ccc;font-size:9.5pt">${t.evaluation_criteria}</p>`:""}
    ${s("III. Authorization")}${sigs(["Procurement Officer","Procurement Manager","Finance Officer","Accounting Officer"],4,S.showStamp)}${footer(S)}`;
  openPrint(body,`Tender ${t.tender_number}`,baseCss(S));
}

// ─── DISPATCHER ─────────────────────────────────────────────────────────────
export function printDocument(type: string, data: any, cfg?: PrintSettings): void {
  switch(type.toUpperCase()) {
    case "REQ":      return printRequisition(data,cfg);
    case "LPO":      return printLPO(data,cfg);
    case "GRN":      return printGRN(data,cfg);
    case "PV":       return printPaymentVoucher(data,cfg);
    case "JV":       return printJournalVoucher(data,cfg);
    case "RV":       return printVoucher(data,"Receipt",cfg);
    case "PURCHASE": return printVoucher(data,"Purchase",cfg);
    case "SALES":    return printVoucher(data,"Sales",cfg);
    case "LAB":      return printLabReport(data,cfg);
    case "CONTRACT": return printContract(data,cfg);
    case "TENDER":   return printTender(data,cfg);
    default:         return printVoucher(data,type,cfg);
  }
}

// ─── PRINTER PRESETS ─────────────────────────────────────────────────────────
export type PrinterType = "kyocera"|"thermal_80mm"|"thermal_58mm"|"hp_deskjet"|"hp_laserjet"|"hp_color"|"generic"|"pdf";
export interface PrinterConfig { type:PrinterType; name:string; paperSize:"A4"|"80mm"|"58mm"|"Letter"|"Legal"|"A5"; dpi:number; colorSupport:boolean; marginTop:string; marginRight:string; marginBottom:string; marginLeft:string; fontSize:string; lineHeight:string; copies?:number; }
export const PRINTER_PRESETS: Record<PrinterType,PrinterConfig> = {
  kyocera:     {type:"kyocera",     name:"Kyocera ECOSYS",    paperSize:"A4",  dpi:600,colorSupport:false,marginTop:"15mm",marginRight:"15mm",marginBottom:"15mm",marginLeft:"20mm",fontSize:"11pt",lineHeight:"1.5"},
  thermal_80mm:{type:"thermal_80mm",name:"Thermal 80mm",      paperSize:"80mm",dpi:203,colorSupport:false,marginTop:"2mm", marginRight:"3mm", marginBottom:"5mm", marginLeft:"3mm", fontSize:"8pt", lineHeight:"1.3"},
  thermal_58mm:{type:"thermal_58mm",name:"Thermal 58mm",      paperSize:"58mm",dpi:203,colorSupport:false,marginTop:"2mm", marginRight:"2mm", marginBottom:"4mm", marginLeft:"2mm", fontSize:"7pt", lineHeight:"1.2"},
  hp_deskjet:  {type:"hp_deskjet",  name:"HP DeskJet",        paperSize:"A4",  dpi:300,colorSupport:true, marginTop:"12mm",marginRight:"12mm",marginBottom:"12mm",marginLeft:"12mm",fontSize:"11pt",lineHeight:"1.5"},
  hp_laserjet: {type:"hp_laserjet", name:"HP LaserJet",       paperSize:"A4",  dpi:600,colorSupport:false,marginTop:"15mm",marginRight:"15mm",marginBottom:"15mm",marginLeft:"20mm",fontSize:"11pt",lineHeight:"1.5"},
  hp_color:    {type:"hp_color",    name:"HP Color LaserJet", paperSize:"A4",  dpi:600,colorSupport:true, marginTop:"15mm",marginRight:"15mm",marginBottom:"15mm",marginLeft:"20mm",fontSize:"11pt",lineHeight:"1.5"},
  generic:     {type:"generic",     name:"Generic Printer",   paperSize:"A4",  dpi:300,colorSupport:true, marginTop:"20mm",marginRight:"20mm",marginBottom:"20mm",marginLeft:"25mm",fontSize:"11pt",lineHeight:"1.6"},
  pdf:         {type:"pdf",         name:"PDF Export",        paperSize:"A4",  dpi:96, colorSupport:true, marginTop:"20mm",marginRight:"20mm",marginBottom:"20mm",marginLeft:"25mm",fontSize:"11pt",lineHeight:"1.6"},
};
export function getPrinterPageCSS(p:PrinterType="generic"):string{const c=PRINTER_PRESETS[p]||PRINTER_PRESETS.generic;let sz="A4";if(c.paperSize==="80mm")sz="80mm auto";else if(c.paperSize==="58mm")sz="58mm auto";else if(c.paperSize==="Letter")sz="letter";else if(c.paperSize==="Legal")sz="legal";else if(c.paperSize==="A5")sz="A5";return `@page{size:${sz};margin:${c.marginTop} ${c.marginRight} ${c.marginBottom} ${c.marginLeft}}@media print{body{font-size:${c.fontSize}!important;line-height:${c.lineHeight}!important;-webkit-print-color-adjust:exact;print-color-adjust:exact${!c.colorSupport?";filter:grayscale(100%)":""}}}`;}
export function buildPrinterCSS(p:PrinterType,font="Times New Roman"):string{const c=PRINTER_PRESETS[p]||PRINTER_PRESETS.generic;const th=p==="thermal_80mm"||p==="thermal_58mm";return `${getPrinterPageCSS(p)}body{font-family:${th?"Arial,sans-serif":`'${font}',serif`};font-size:${c.fontSize};line-height:${c.lineHeight};color:#000;margin:0;padding:0}@media print{.no-print,.no-print *{display:none!important}a{color:#000!important;text-decoration:none!important}}`;}
export function detectPrinterType(settings:Record<string,string>):PrinterType{const sv=(settings["printer_type"]||"generic") as PrinterType;if(sv in PRINTER_PRESETS)return sv;const n=(settings["printer_name"]||"").toLowerCase();if(n.includes("kyocera"))return "kyocera";if(n.includes("thermal")||n.includes("tm-")||n.includes("tsp"))return "thermal_80mm";if(n.includes("deskjet"))return "hp_deskjet";if(n.includes("laserjet"))return "hp_laserjet";if(n.includes("hp"))return "hp_deskjet";return "generic";}
