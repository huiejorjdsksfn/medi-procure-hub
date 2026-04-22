/**
 * ProcurBosse — Object Code Registry
 * All procurement object codes, form templates, and document templates
 */

// ── PROCUREMENT OBJECT CODES ─────────────────────────────────────

export const OBJECT_CODES = {
  // Requisition types
  REQUISITION: {
    STANDARD:     "RQQ",     // Standard requisition
    URGENT:       "RQU",     // Urgent requisition
    FRAMEWORK:    "RQF",     // Framework/standing order
    PETTY_CASH:   "RQP",     // Petty cash request
    CAPITAL:      "RQC",     // Capital expenditure
    SERVICE:      "RQS",     // Service request
  },
  // Purchase Order types
  PURCHASE_ORDER: {
    LOCAL:        "LPO",     // Local Purchase Order
    IMPORT:       "IPO",     // Import Purchase Order
    SERVICE:      "SPO",     // Service Purchase Order
    FRAMEWORK:    "FPO",     // Framework Purchase Order
    EMERGENCY:    "EPO",     // Emergency Purchase Order
  },
  // Goods Received
  GOODS_RECEIVED: {
    STANDARD:     "GRN",     // Goods Received Note
    PARTIAL:      "PRN",     // Partial Receipt Note
    RETURN:       "SRN",     // Supplier Return Note
    TRANSFER:     "ITN",     // Inter-facility Transfer Note
  },
  // Voucher types
  VOUCHER: {
    PAYMENT:      "PV",      // Payment Voucher
    RECEIPT:      "RV",      // Receipt Voucher
    JOURNAL:      "JV",      // Journal Voucher
    PURCHASE:     "PUV",     // Purchase Voucher
    SALES:        "SAV",     // Sales Voucher
    CREDIT:       "CV",      // Credit Note Voucher
    DEBIT:        "DV",      // Debit Note Voucher
    PETTY_CASH:   "PCV",     // Petty Cash Voucher
    IMPREST:      "IV",      // Imprest Voucher
  },
  // Tender/Contract
  TENDER: {
    OPEN:         "TOT",     // Open Tender
    RESTRICTED:   "TRT",     // Restricted Tender
    DIRECT:       "TDP",     // Direct Procurement
    QUOTATION:    "RFQ",     // Request for Quotation
    PROPOSAL:     "RFP",     // Request for Proposal
    EXPRESSION:   "EOI",     // Expression of Interest
  },
  CONTRACT: {
    GOODS:        "CGS",     // Contract for Goods/Supplies
    SERVICE:      "CSR",     // Contract for Services
    WORKS:        "CWK",     // Contract for Works
    FRAMEWORK:    "CFA",     // Framework Agreement
    EXTENSION:    "CXT",     // Contract Extension
  },
  // Financial
  FINANCIAL: {
    BUDGET:       "BDG",     // Budget
    ACCOUNT:      "ACC",     // Chart of Account
    ASSET:        "FAS",     // Fixed Asset
    DEPRECIATION: "DEP",     // Depreciation Schedule
    IMPREST:      "IMP",     // Imprest Account
    ADVANCE:      "ADV",     // Staff Advance
  },
  // Inventory
  INVENTORY: {
    PHARMACEUTICAL: "PH",    // Pharmaceutical items
    MEDICAL_EQUIP:  "ME",    // Medical Equipment
    CONSUMABLE:     "MC",    // Medical Consumables
    LABORATORY:     "LA",    // Laboratory supplies
    OFFICE:         "OF",    // Office Supplies
    GENERAL:        "GN",    // General supplies
    CONSTRUCTION:   "CN",    // Construction materials
    IT_EQUIP:       "IT",    // IT Equipment
    VEHICLE:        "VH",    // Vehicle/Transport
    PLUMBING:       "PL",    // Plumbing supplies
    ELECTRICAL:     "EL",    // Electrical supplies
  },
  // Quality
  QUALITY: {
    INSPECTION:   "QIN",     // Quality Inspection Report
    NON_CONFORM:  "NCR",     // Non-Conformance Report
    CORRECTIVE:   "CAR",     // Corrective Action Request
    AUDIT:        "QAR",     // Quality Audit Report
  },
};

// ── DOCUMENT NUMBER GENERATORS ────────────────────────────────────

export function generateDocNo(type: string, facilityCode: string, year: number, sequence: number): string {
  const seq = String(sequence).padStart(4, "0");
  return `${type}/${facilityCode}/${year}/${seq}`;
}

// Pre-built generators
export const DocNo = {
  requisition:   (fc: string, yr: number, seq: number) => generateDocNo("RQQ", fc, yr, seq),
  urgentReq:     (fc: string, yr: number, seq: number) => generateDocNo("RQU", fc, yr, seq),
  lpo:           (fc: string, yr: number, seq: number) => generateDocNo("LPO", fc, yr, seq),
  grn:           (fc: string, yr: number, seq: number) => generateDocNo("GRN", fc, yr, seq),
  payVoucher:    (fc: string, yr: number, seq: number) => generateDocNo("PV",  fc, yr, seq),
  rcptVoucher:   (fc: string, yr: number, seq: number) => generateDocNo("RV",  fc, yr, seq),
  jnlVoucher:    (fc: string, yr: number, seq: number) => generateDocNo("JV",  fc, yr, seq),
  tender:        (fc: string, yr: number, seq: number) => generateDocNo("TOT", fc, yr, seq),
  rfq:           (fc: string, yr: number, seq: number) => generateDocNo("RFQ", fc, yr, seq),
  contract:      (fc: string, yr: number, seq: number) => generateDocNo("CGS", fc, yr, seq),
  transfer:      (fc: string, yr: number, seq: number) => generateDocNo("ITN", fc, yr, seq),
};

// ── FORM FIELD DEFINITIONS ───────────────────────────────────────

export interface FormField {
  key:       string;
  label:     string;
  type:      "text"|"number"|"date"|"select"|"textarea"|"checkbox"|"email"|"phone"|"currency";
  required?: boolean;
  options?:  string[];
  placeholder?: string;
  validation?: RegExp;
}

export const FORM_FIELDS = {
  REQUISITION: [
    { key:"title",           label:"Requisition Title",       type:"text",     required:true  },
    { key:"department",      label:"Department",              type:"select",   required:true  },
    { key:"ward",            label:"Ward / Unit",             type:"select"                   },
    { key:"priority",        label:"Priority",                type:"select",   required:true, options:["Normal","High","Urgent","Low"] },
    { key:"required_date",   label:"Required By Date",        type:"date",     required:true  },
    { key:"delivery_date",   label:"Expected Delivery Date",  type:"date"                     },
    { key:"delivery_location",label:"Delivery Location",      type:"text"                     },
    { key:"purpose",         label:"Purpose / Justification", type:"textarea", required:true  },
    { key:"notes",           label:"Additional Notes",        type:"textarea"                 },
    { key:"requester_name",  label:"Requested By",            type:"text",     required:true  },
    { key:"requester_phone", label:"Contact Phone",           type:"phone"                    },
  ] as FormField[],

  PURCHASE_ORDER: [
    { key:"po_number",       label:"PO Number",               type:"text",     required:true  },
    { key:"supplier_id",     label:"Supplier",                type:"select",   required:true  },
    { key:"delivery_date",   label:"Required Delivery Date",  type:"date",     required:true  },
    { key:"delivery_address",label:"Delivery Address",        type:"text",     required:true  },
    { key:"payment_terms",   label:"Payment Terms",           type:"select",   options:["30 Days","60 Days","90 Days","On Delivery","Advance","COD"] },
    { key:"currency",        label:"Currency",                type:"select",   options:["KES","USD","EUR","GBP"] },
    { key:"vat_applicable",  label:"VAT Applicable (16%)",    type:"checkbox"                 },
    { key:"notes",           label:"Special Instructions",    type:"textarea"                 },
    { key:"authorized_by",   label:"Authorized By",           type:"text"                     },
  ] as FormField[],

  GRN: [
    { key:"grn_number",      label:"GRN Number",              type:"text",     required:true  },
    { key:"po_reference",    label:"PO Reference",            type:"text",     required:true  },
    { key:"supplier_id",     label:"Supplier",                type:"select",   required:true  },
    { key:"delivery_note",   label:"Delivery Note Number",    type:"text"                     },
    { key:"invoice_number",  label:"Invoice Number",          type:"text"                     },
    { key:"received_date",   label:"Date Received",           type:"date",     required:true  },
    { key:"received_by",     label:"Received By",             type:"text",     required:true  },
    { key:"store_keeper",    label:"Store Keeper",            type:"text"                     },
    { key:"remarks",         label:"Remarks / Discrepancies", type:"textarea"                 },
  ] as FormField[],

  PAYMENT_VOUCHER: [
    { key:"voucher_number",  label:"Voucher Number",          type:"text",     required:true  },
    { key:"payee_name",      label:"Payee Name",              type:"text",     required:true  },
    { key:"payee_kra_pin",   label:"KRA PIN",                 type:"text"                     },
    { key:"payee_bank",      label:"Bank Name",               type:"text"                     },
    { key:"payee_account",   label:"Account Number",          type:"text"                     },
    { key:"payee_branch",    label:"Bank Branch",             type:"text"                     },
    { key:"cheque_number",   label:"Cheque / EFT Number",     type:"text"                     },
    { key:"payment_date",    label:"Payment Date",            type:"date",     required:true  },
    { key:"amount",          label:"Amount (KES)",            type:"currency", required:true  },
    { key:"vat_amount",      label:"VAT Amount (KES)",        type:"currency"                 },
    { key:"withholding_tax", label:"Withholding Tax",         type:"currency"                 },
    { key:"net_amount",      label:"Net Amount (KES)",        type:"currency"                 },
    { key:"narration",       label:"Payment Narration",       type:"textarea", required:true  },
    { key:"po_reference",    label:"LPO Reference",           type:"text"                     },
    { key:"budget_head",     label:"Budget Head / Vote",      type:"text"                     },
    { key:"prepared_by",     label:"Prepared By",             type:"text"                     },
    { key:"checked_by",      label:"Checked By",              type:"text"                     },
    { key:"approved_by",     label:"Approved By",             type:"text"                     },
  ] as FormField[],

  SUPPLIER: [
    { key:"name",            label:"Supplier / Company Name", type:"text",     required:true  },
    { key:"contact_person",  label:"Contact Person",          type:"text",     required:true  },
    { key:"email",           label:"Email Address",           type:"email",    required:true  },
    { key:"phone",           label:"Phone Number",            type:"phone",    required:true  },
    { key:"alt_phone",       label:"Alternative Phone",       type:"phone"                    },
    { key:"address",         label:"Physical Address",        type:"textarea"                 },
    { key:"po_box",          label:"P.O. Box",                type:"text"                     },
    { key:"town",            label:"Town / City",             type:"text"                     },
    { key:"county",          label:"County",                  type:"text"                     },
    { key:"country",         label:"Country",                 type:"text",   placeholder:"Kenya" },
    { key:"kra_pin",         label:"KRA PIN",                 type:"text",     required:true  },
    { key:"vat_number",      label:"VAT Registration Number", type:"text"                     },
    { key:"bank_name",       label:"Bank Name",               type:"text"                     },
    { key:"bank_account",    label:"Account Number",          type:"text"                     },
    { key:"bank_branch",     label:"Bank Branch",             type:"text"                     },
    { key:"bank_swift",      label:"Swift Code",              type:"text"                     },
    { key:"category",        label:"Category",                type:"select",   required:true, options:["Pharmaceutical","Medical Equipment","Medical Consumables","Laboratory","Office Supplies","Construction","IT Equipment","Services","General"] },
    { key:"rating",          label:"Performance Rating",      type:"select",   options:["5 - Excellent","4 - Good","3 - Average","2 - Poor","1 - Blacklisted"] },
    { key:"notes",           label:"Notes / Remarks",         type:"textarea"                 },
  ] as FormField[],

  TENDER: [
    { key:"tender_number",   label:"Tender Number",           type:"text",     required:true  },
    { key:"title",           label:"Tender Title",            type:"text",     required:true  },
    { key:"type",            label:"Tender Type",             type:"select",   required:true, options:["Open Tender","Restricted Tender","Direct Procurement","RFQ","RFP","EOI"] },
    { key:"category",        label:"Category",                type:"select",   options:["Goods","Services","Works","Consultancy"] },
    { key:"estimated_value", label:"Estimated Value (KES)",   type:"currency"                 },
    { key:"published_date",  label:"Date Published",          type:"date"                     },
    { key:"closing_date",    label:"Closing Date & Time",     type:"date",     required:true  },
    { key:"opening_date",    label:"Bid Opening Date",        type:"date"                     },
    { key:"evaluation_date", label:"Evaluation Date",         type:"date"                     },
    { key:"contact_person",  label:"Contact Person",          type:"text"                     },
    { key:"contact_email",   label:"Contact Email",           type:"email"                    },
    { key:"description",     label:"Description",             type:"textarea", required:true  },
    { key:"requirements",    label:"Requirements",            type:"textarea"                 },
    { key:"evaluation_criteria",label:"Evaluation Criteria",  type:"textarea"                 },
  ] as FormField[],
};

// ── PRINT TEMPLATE CONFIGS ───────────────────────────────────────

export const PRINT_CONFIG = {
  LETTERHEAD: {
    county:     "EMBU COUNTY GOVERNMENT",
    department: "DEPARTMENT OF HEALTH",
    hospital:   "EMBU LEVEL 5 HOSPITAL",
    address:    "P.O. Box 384-60100, Embu, Kenya",
    phone:      "+254 068 31096",
    email:      "info@embu.health.go.ke",
    website:    "www.embu.go.ke",
    confidential: "PRIVATE & CONFIDENTIAL",
  },
  SIGNATORIES: {
    REQUISITION:    ["Requisitioner", "HOD / Line Manager", "Procurement Officer", "Procurement Manager"],
    PO:             ["Prepared By (Procurement)", "Head of Procurement", "CFO / Finance Manager", "Accounting Officer"],
    GRN:            ["Received By", "Store Keeper", "Quality Inspector", "Procurement Officer"],
    PAYMENT_VOUCHER:["Prepared By", "Checked By (Finance)", "Approved By (Manager)", "Authorized By (Director)"],
    TENDER:         ["Tender Committee Member", "Procurement Manager", "User Department Head", "Accounting Officer"],
    CONTRACT:       ["Supplier Representative", "Procurement Manager", "Legal Officer", "Accounting Officer"],
  },
};

// ── ITEM CATEGORIES WITH CODES ───────────────────────────────────

export const ITEM_CATEGORIES = [
  { code:"PH", name:"Pharmaceuticals",    color:"#7c3aed", icon:"💊" },
  { code:"ME", name:"Medical Equipment",  color:"#1d4ed8", icon:"🏥" },
  { code:"MC", name:"Medical Consumables",color:"#065f46", icon:"🩺" },
  { code:"LA", name:"Laboratory",         color:"#0f766e", icon:"🔬" },
  { code:"OF", name:"Office Supplies",    color:"#92400e", icon:"📋" },
  { code:"CN", name:"Construction",       color:"#78350f", icon:"🏗️"  },
  { code:"IT", name:"IT Equipment",       color:"#1e40af", icon:"💻" },
  { code:"VH", name:"Vehicles/Transport", color:"#166534", icon:"🚗" },
  { code:"PL", name:"Plumbing",           color:"#0369a1", icon:"🔧" },
  { code:"EL", name:"Electrical",         color:"#ca8a04", icon:"⚡" },
  { code:"GN", name:"General",            color:"#64748b", icon:"📦" },
];

// ── STATUS DEFINITIONS ───────────────────────────────────────────

export const STATUSES = {
  REQUISITION: {
    draft:     { label:"Draft",     bg:"#f1f5f9", color:"#64748b", next:["submitted"] },
    submitted: { label:"Submitted", bg:"#dbeafe", color:"#1d4ed8", next:["pending","approved","rejected"] },
    pending:   { label:"Pending",   bg:"#fef3c7", color:"#92400e", next:["approved","rejected"] },
    approved:  { label:"Approved",  bg:"#dcfce7", color:"#166534", next:["ordered"] },
    rejected:  { label:"Rejected",  bg:"#fee2e2", color:"#dc2626", next:["draft"] },
    ordered:   { label:"Ordered",   bg:"#e0f2fe", color:"#0369a1", next:["received"] },
    received:  { label:"Received",  bg:"#d1fae5", color:"#065f46", next:[] },
    cancelled: { label:"Cancelled", bg:"#f3f4f6", color:"#9ca3af", next:[] },
  },
  PURCHASE_ORDER: {
    draft:     { label:"Draft",     bg:"#f1f5f9", color:"#64748b" },
    submitted: { label:"Submitted", bg:"#dbeafe", color:"#1d4ed8" },
    approved:  { label:"Approved",  bg:"#dcfce7", color:"#166534" },
    sent:      { label:"Sent to Supplier", bg:"#e0f2fe", color:"#0369a1" },
    partial:   { label:"Partially Received", bg:"#fef3c7", color:"#92400e" },
    received:  { label:"Fully Received", bg:"#d1fae5", color:"#065f46" },
    cancelled: { label:"Cancelled", bg:"#fee2e2", color:"#dc2626" },
    closed:    { label:"Closed",    bg:"#f3f4f6", color:"#9ca3af" },
  },
  VOUCHER: {
    draft:     { label:"Draft",     bg:"#f1f5f9", color:"#64748b" },
    pending:   { label:"Pending Approval", bg:"#fef3c7", color:"#92400e" },
    approved:  { label:"Approved",  bg:"#dcfce7", color:"#166534" },
    paid:      { label:"Paid",      bg:"#d1fae5", color:"#065f46" },
    cancelled: { label:"Cancelled", bg:"#fee2e2", color:"#dc2626" },
    reversed:  { label:"Reversed",  bg:"#f3f4f6", color:"#9ca3af" },
  },
  TENDER: {
    draft:      { label:"Draft",     bg:"#f1f5f9", color:"#64748b" },
    published:  { label:"Published", bg:"#dbeafe", color:"#1d4ed8" },
    closed:     { label:"Closed",    bg:"#fef3c7", color:"#92400e" },
    evaluating: { label:"Under Evaluation", bg:"#ede9fe", color:"#7c3aed" },
    awarded:    { label:"Awarded",   bg:"#dcfce7", color:"#166534" },
    cancelled:  { label:"Cancelled", bg:"#fee2e2", color:"#dc2626" },
  },
  CONTRACT: {
    draft:    { label:"Draft",    bg:"#f1f5f9", color:"#64748b" },
    active:   { label:"Active",   bg:"#dcfce7", color:"#166534" },
    expiring: { label:"Expiring Soon", bg:"#fef3c7", color:"#92400e" },
    expired:  { label:"Expired",  bg:"#fee2e2", color:"#dc2626" },
    terminated:{ label:"Terminated", bg:"#f3f4f6", color:"#9ca3af" },
    renewed:  { label:"Renewed",  bg:"#d1fae5", color:"#065f46" },
  },
};
