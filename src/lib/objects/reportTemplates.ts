/**
 * ProcurBosse — Report Templates & Print Objects
 * Defines structure for all printable reports
 */
import { PRINT_CONFIG, OBJECT_CODES } from "./index";

export interface ReportColumn {
  key: string;
  label: string;
  width?: number;
  align?: "left"|"center"|"right";
  format?: "currency"|"date"|"number"|"text"|"badge";
  currency?: string;
}

export interface ReportTemplate {
  id:          string;
  title:       string;
  subtitle?:   string;
  objectCode:  string;
  columns:     ReportColumn[];
  groupBy?:    string;
  sortBy?:     string;
  totals?:     string[];
  signatories?: string[];
  showLetterhead: boolean;
  orientation: "portrait"|"landscape";
}

export const REPORT_TEMPLATES: Record<string, ReportTemplate> = {

  REQUISITIONS_SUMMARY: {
    id:           "req_summary",
    title:        "Requisitions Summary Report",
    subtitle:     "All procurement requisitions by status and period",
    objectCode:   OBJECT_CODES.REQUISITION.STANDARD,
    orientation:  "landscape",
    showLetterhead: true,
    signatories:  ["Procurement Officer", "Head of Procurement"],
    groupBy:      "department",
    totals:       ["total_amount"],
    columns: [
      { key:"requisition_number", label:"Req. No.",      width:120, format:"text"     },
      { key:"title",              label:"Title",         width:200, format:"text"     },
      { key:"department",         label:"Department",    width:120, format:"text"     },
      { key:"requester_name",     label:"Requested By",  width:120, format:"text"     },
      { key:"priority",           label:"Priority",      width:70,  format:"badge"    },
      { key:"status",             label:"Status",        width:90,  format:"badge"    },
      { key:"total_amount",       label:"Value (KES)",   width:110, format:"currency", align:"right" },
      { key:"created_at",         label:"Date",          width:90,  format:"date"     },
    ],
  },

  PURCHASE_ORDERS: {
    id:           "po_report",
    title:        "Purchase Orders Report",
    subtitle:     "Local Purchase Orders — Period Summary",
    objectCode:   OBJECT_CODES.PURCHASE_ORDER.LOCAL,
    orientation:  "landscape",
    showLetterhead: true,
    signatories:  PRINT_CONFIG.SIGNATORIES.PO,
    totals:       ["total_amount","vat_amount"],
    columns: [
      { key:"po_number",     label:"LPO No.",       width:120, format:"text"     },
      { key:"supplier_name", label:"Supplier",      width:180, format:"text"     },
      { key:"department",    label:"Department",    width:100, format:"text"     },
      { key:"status",        label:"Status",        width:90,  format:"badge"    },
      { key:"subtotal",      label:"Subtotal",      width:110, format:"currency", align:"right" },
      { key:"vat_amount",    label:"VAT",           width:90,  format:"currency", align:"right" },
      { key:"total_amount",  label:"Total (KES)",   width:120, format:"currency", align:"right" },
      { key:"delivery_date", label:"Delivery",      width:90,  format:"date"     },
      { key:"created_at",    label:"Created",       width:90,  format:"date"     },
    ],
  },

  GOODS_RECEIVED: {
    id:           "grn_report",
    title:        "Goods Received Notes Report",
    subtitle:     "Goods received and verified by store",
    objectCode:   OBJECT_CODES.GOODS_RECEIVED.STANDARD,
    orientation:  "landscape",
    showLetterhead: true,
    signatories:  PRINT_CONFIG.SIGNATORIES.GRN,
    totals:       ["total_value"],
    columns: [
      { key:"grn_number",    label:"GRN No.",       width:120, format:"text" },
      { key:"po_reference",  label:"LPO Ref.",      width:120, format:"text" },
      { key:"supplier_name", label:"Supplier",      width:180, format:"text" },
      { key:"received_by",   label:"Received By",   width:120, format:"text" },
      { key:"received_date", label:"Date",          width:90,  format:"date" },
      { key:"status",        label:"Status",        width:80,  format:"badge" },
      { key:"total_value",   label:"Value (KES)",   width:120, format:"currency", align:"right" },
    ],
  },

  PAYMENT_VOUCHERS: {
    id:           "pv_report",
    title:        "Payment Vouchers Report",
    subtitle:     "Payments authorized and processed",
    objectCode:   OBJECT_CODES.VOUCHER.PAYMENT,
    orientation:  "landscape",
    showLetterhead: true,
    signatories:  PRINT_CONFIG.SIGNATORIES.PAYMENT_VOUCHER,
    totals:       ["amount","vat_amount","net_amount"],
    columns: [
      { key:"voucher_number", label:"Voucher No.",   width:110, format:"text" },
      { key:"payee_name",     label:"Payee",         width:180, format:"text" },
      { key:"narration",      label:"Narration",     width:200, format:"text" },
      { key:"cheque_number",  label:"Cheque/EFT",    width:110, format:"text" },
      { key:"amount",         label:"Gross (KES)",   width:110, format:"currency", align:"right" },
      { key:"vat_amount",     label:"VAT",           width:80,  format:"currency", align:"right" },
      { key:"withholding_tax",label:"W/Tax",         width:80,  format:"currency", align:"right" },
      { key:"net_amount",     label:"Net (KES)",     width:110, format:"currency", align:"right" },
      { key:"payment_date",   label:"Date",          width:90,  format:"date" },
      { key:"status",         label:"Status",        width:80,  format:"badge" },
    ],
  },

  SUPPLIER_DIRECTORY: {
    id:           "suppliers",
    title:        "Approved Suppliers Directory",
    subtitle:     "Registered suppliers and contractors",
    objectCode:   "SDS",
    orientation:  "portrait",
    showLetterhead: true,
    signatories:  ["Procurement Manager", "Head of Department"],
    columns: [
      { key:"name",          label:"Supplier Name",  width:200, format:"text" },
      { key:"contact_person",label:"Contact",        width:120, format:"text" },
      { key:"email",         label:"Email",          width:160, format:"text" },
      { key:"phone",         label:"Phone",          width:120, format:"text" },
      { key:"kra_pin",       label:"KRA PIN",        width:120, format:"text" },
      { key:"category",      label:"Category",       width:120, format:"badge" },
      { key:"rating",        label:"Rating",         width:80,  format:"text" },
      { key:"status",        label:"Status",         width:80,  format:"badge" },
    ],
  },

  INVENTORY_STOCK: {
    id:           "inventory",
    title:        "Inventory Stock Report",
    subtitle:     "Current stock levels and valuations",
    objectCode:   "ISR",
    orientation:  "landscape",
    showLetterhead: true,
    signatories:  ["Store Keeper", "Inventory Manager", "Procurement Officer"],
    groupBy:      "category",
    totals:       ["stock_value"],
    columns: [
      { key:"sku",           label:"SKU",            width:100, format:"text" },
      { key:"name",          label:"Item Name",      width:200, format:"text" },
      { key:"category",      label:"Category",       width:100, format:"badge" },
      { key:"unit",          label:"UOM",            width:60,  format:"text"  },
      { key:"unit_price",    label:"Unit Price",     width:100, format:"currency", align:"right" },
      { key:"quantity",      label:"Qty",            width:70,  align:"center", format:"number" },
      { key:"reorder_level", label:"Reorder",        width:70,  align:"center", format:"number" },
      { key:"stock_value",   label:"Value (KES)",    width:120, format:"currency", align:"right" },
      { key:"status",        label:"Status",         width:80,  format:"badge" },
    ],
  },

  PROCUREMENT_PLAN: {
    id:           "proc_plan",
    title:        "Annual Procurement Plan",
    subtitle:     "Planned procurement activities for the year",
    objectCode:   "APP",
    orientation:  "landscape",
    showLetterhead: true,
    signatories:  ["Head of Procurement", "CFO", "Chief Officer - Health"],
    totals:       ["estimated_amount"],
    columns: [
      { key:"item_no",         label:"No.",          width:50,  format:"number" },
      { key:"description",     label:"Description",  width:250, format:"text" },
      { key:"category",        label:"Category",     width:100, format:"text" },
      { key:"procurement_method",label:"Method",     width:100, format:"text" },
      { key:"estimated_amount",label:"Est. Amount",  width:120, format:"currency", align:"right" },
      { key:"q1",              label:"Q1",           width:50,  align:"center", format:"text" },
      { key:"q2",              label:"Q2",           width:50,  align:"center", format:"text" },
      { key:"q3",              label:"Q3",           width:50,  align:"center", format:"text" },
      { key:"q4",              label:"Q4",           width:50,  align:"center", format:"text" },
      { key:"department",      label:"Department",   width:120, format:"text" },
    ],
  },
};

export type ReportId = keyof typeof REPORT_TEMPLATES;
