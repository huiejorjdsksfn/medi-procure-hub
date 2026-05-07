/**
 * PrintEngine v2.0 — Unified print for all ERP documents
 * Handles: POs, Requisitions, GRNs, Vouchers, Contracts, Reports
 * EL5 MediProcure / ProcurBosse
 */
import { printRequisition, printPurchaseOrder, printGRN, printGenericVoucher, printJournalVoucher } from "@/lib/printDocument";
import { supabase } from "@/integrations/supabase/client";
const db = supabase as any;

async function logPrint(type:string, refId:string, refNum:string) {
  try {
    await db.from("print_jobs").insert({ job_type:type, reference_id:refId, reference_number:refNum, status:"completed", printed_at:new Date().toISOString() });
  } catch {}
}

export const PrintEngine = {
  async requisition(req:any) {
    const { data:items } = await db.from("requisition_items").select("*").eq("requisition_id", req.id);
    await printRequisition(req, items||[]);
    await logPrint("requisition", req.id, req.requisition_number);
  },
  async purchaseOrder(po:any) {
    const [{ data:items },{ data:supplier }] = await Promise.all([
      db.from("purchase_order_items").select("*").eq("purchase_order_id", po.id),
      db.from("suppliers").select("*").eq("id", po.supplier_id).single(),
    ]);
    await printPurchaseOrder(po, items||[], supplier||{});
    await logPrint("purchase_order", po.id, po.po_number);
  },
  async grn(grn:any) {
    const [{ data:items },{ data:supplier }] = await Promise.all([
      db.from("goods_received_items").select("*").eq("goods_received_id", grn.id),
      grn.supplier_id ? db.from("suppliers").select("*").eq("id",grn.supplier_id).single() : Promise.resolve({data:null}),
    ]);
    await printGRN(grn, items||[], supplier||undefined);
    await logPrint("grn", grn.id, grn.grn_number);
  },
  async voucher(voucher:any, type:string) {
    if (type==="journal") await printJournalVoucher(voucher,[]);
    else await printGenericVoucher(voucher, type);
    await logPrint(type+"_voucher", voucher.id, voucher.voucher_number);
  },
  async report(title:string, content:string) {
    const w = window.open("","_blank","width=900,height=700");
    if(!w) return;
    const font = getComputedStyle(document.documentElement).getPropertyValue("--print-font")||"'Times New Roman'";
    const size = getComputedStyle(document.documentElement).getPropertyValue("--print-font-size")||"11pt";
    w.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
      <style>body{font-family:${font};font-size:${size};margin:20mm;color:#111}
      h1{font-size:15pt;border-bottom:2px solid #333;padding-bottom:8px}
      table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px;font-size:10pt}
      th{background:#f0f0f0;font-weight:600}@media print{button{display:none}}</style>
      </head><body><h1>${title}</h1>${content}
      <script>window.print();setTimeout(()=>window.close(),1000);</script></body></html>`);
  },
};
export default PrintEngine;
