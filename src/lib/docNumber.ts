/**
 * EL5 MediProcure — unified document reference number generator
 *
 * Every procurement/finance document gets an auto-generated reference in
 * the format:   <PREFIX>/EL5H/<YEAR>/<6-digit-sequence>
 *
 * This is NEVER typed by the user — it is generated client-side at the
 * moment a new document is created and rendered read-only in the form.
 * The 6-digit suffix is taken from the current millisecond timestamp,
 * which changes every call and avoids the collisions that 3-4 digit
 * random/Date.now() suffixes were prone to.
 */

export const DOC_PREFIX = {
  requisition:     "RQQ",
  purchaseOrder:   "PO",
  goodsReceived:   "GRN",
  contract:        "CNT",
  tender:          "TND",
  storeVoucher:    "SIV",
  paymentVoucher:  "PV",
  receiptVoucher:  "RV",
  journalVoucher:  "JV",
  purchaseVoucher: "PCV",
  salesVoucher:    "SV",
} as const;

export type DocPrefix = typeof DOC_PREFIX[keyof typeof DOC_PREFIX];

/** Generate an auto reference number, e.g. RQQ/EL5H/2026/483920 */
export function genDocNumber(prefix: DocPrefix): string {
  const year = new Date().getFullYear();
  const seq = String(Date.now()).slice(-6).padStart(6, "0");
  return `${prefix}/EL5H/${year}/${seq}`;
}
