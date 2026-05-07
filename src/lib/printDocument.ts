/**
 * ProcurBosse - Print Document Utility v3.0
 * Adds Embu County + Hospital logos to all printed documents
 * EL5 MediProcure - Embu Level 5 Hospital
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import embuLogoUrl from "@/assets/embu-county-logo.jpg";
import logoUrl from "@/assets/logo.png";

const HOSPITAL = {
  name:     "EMBU LEVEL 5 HOSPITAL",
  ministry: "COUNTY GOVERNMENT OF EMBU - DEPARTMENT OF HEALTH",
  address:  "P.O. Box 33 - 60100, Embu, Kenya",
  phone:    "+254 68 31055 / +254 722 406595",
  email:    "pghembu@gmail.com",
  motto:    "Quality Healthcare for All",
  iso:      "ISO 9001:2015 Certified",
};

let _embuLogo: string | null = null;
let _appLogo:  string | null = null;

async function loadBase64(url: string): Promise<string | null> {
  try {
    const res  = await fetch(url);
    const blob = await res.blob();
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

async function getLogos() {
  if (!_embuLogo) _embuLogo = await loadBase64(embuLogoUrl);
  if (!_appLogo)  _appLogo  = await loadBase64(logoUrl);
  return { embu: _embuLogo, app: _appLogo };
}

/** Add dual-logo letterhead to a jsPDF document */
export async function addLetterhead(doc: jsPDF, title: string, docNo: string): Promise<number> {
  const { embu, app } = await getLogos();
  const W = doc.internal.pageSize.getWidth();

  // Left: Embu County logo
  if (embu) {
    try { doc.addImage(embu, "JPEG", 12, 6, 22, 22); } catch {}
  } else {
    doc.setFillColor(0, 64, 128); doc.circle(23, 17, 11, "F");
    doc.setTextColor(255,255,255); doc.setFontSize(10);
    doc.text("-", 23, 20, { align:"center" });
  }

  // Right: ProcurBosse logo
  if (app) {
    try { doc.addImage(app, "PNG", W-34, 6, 22, 22); } catch {}
  }

  // Center: Hospital text
  doc.setTextColor(0, 45, 100);
  doc.setFontSize(8); doc.setFont("helvetica","normal");
  doc.text("REPUBLIC OF KENYA", W/2, 9, { align:"center" });

  doc.setFontSize(6); doc.setTextColor(80, 80, 80);
  doc.text(HOSPITAL.ministry, W/2, 13, { align:"center" });

  doc.setFontSize(14); doc.setFont("helvetica","bold"); doc.setTextColor(0, 45, 100);
  doc.text(HOSPITAL.name, W/2, 20, { align:"center" });

  doc.setFontSize(6); doc.setFont("helvetica","italic"); doc.setTextColor(100, 100, 100);
  doc.text(`"${HOSPITAL.motto}"`, W/2, 24, { align:"center" });

  doc.setFontSize(6); doc.setFont("helvetica","normal");
  doc.text(`${HOSPITAL.address} | ${HOSPITAL.phone} | ${HOSPITAL.email}`, W/2, 28, { align:"center" });

  // Divider
  doc.setDrawColor(0, 45, 100); doc.setLineWidth(0.8);
  doc.line(12, 31, W-12, 31);
  doc.setDrawColor(180, 89, 17); doc.setLineWidth(0.3);
  doc.line(12, 32.2, W-12, 32.2);

  // Document title + number
  doc.setFontSize(11); doc.setFont("helvetica","bold"); doc.setTextColor(0, 45, 100);
  doc.text(title.toUpperCase(), W/2, 38, { align:"center" });

  if (docNo) {
    doc.setFontSize(8); doc.setFont("helvetica","normal"); doc.setTextColor(100,100,100);
    doc.text(`No: ${docNo}`, W/2, 43, { align:"center" });
  }

  return 46; // y position after letterhead
}

/** Add footer to each page */
export function addFooter(doc: jsPDF, pageNum: number, totalPages: number): void {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  doc.setDrawColor(0, 45, 100); doc.setLineWidth(0.3);
  doc.line(12, H-14, W-12, H-14);
  doc.setFontSize(6); doc.setFont("helvetica","normal"); doc.setTextColor(100,100,100);
  doc.text(`${HOSPITAL.name} | EL5 MediProcure v5.9 | Generated: ${new Date().toLocaleString("en-KE",{timeZone:"Africa/Nairobi"})}`, 12, H-10);
  doc.text(`Page ${pageNum} of ${totalPages}`, W-12, H-10, { align:"right" });
  doc.setFontSize(5); doc.setTextColor(150,150,150);
  doc.text(HOSPITAL.iso, W/2, H-6, { align:"center" });
}

/** Print any document with letterhead */
export async function printDocument(config: {
  title:    string;
  docNo:    string;
  content:  (doc: jsPDF, startY: number) => void | Promise<void>;
  filename: string;
}): Promise<void> {
  const doc = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
  const startY = await addLetterhead(doc, config.title, config.docNo);
  await config.content(doc, startY);

  // Add footers
  const total = (doc as any).internal.getNumberOfPages();
  for (let i=1; i<=total; i++) {
    doc.setPage(i);
    addFooter(doc, i, total);
  }

  doc.save(config.filename + ".pdf");
}

/** Print requisition */
export async function printRequisition(req: any, items: any[]): Promise<void> {
  await printDocument({
    title:    "STORES REQUISITION FORM",
    docNo:    req.requisition_number || req.id?.slice(0,8).toUpperCase(),
    filename: `REQ-${req.requisition_number || req.id?.slice(0,8)}`,
    content: async (doc, startY) => {
      const W = doc.internal.pageSize.getWidth();

      // Info table
      autoTable(doc, {
        startY,
        head: [],
        body: [
          ["Department:", req.department||"-",          "Priority:",   req.priority||"Normal"],
          ["Requested By:", req.requester_name||req.requested_by||"-", "Date:", req.created_at?.slice(0,10)||"-"],
          ["Status:",       req.status?.toUpperCase()||"-",            "Total:", req.total_amount ? `KES ${Number(req.total_amount).toLocaleString()}` : "-"],
        ],
        styles:     { fontSize:8, cellPadding:2 },
        columnStyles:{ 0:{fontStyle:"bold",cellWidth:32}, 1:{cellWidth:60}, 2:{fontStyle:"bold",cellWidth:25}, 3:{cellWidth:50} },
        theme:      "plain",
        margin:     { left:12, right:12 },
      });

      const y2 = (doc as any).lastAutoTable.finalY + 5;

      autoTable(doc, {
        startY: y2,
        head: [["#","Item Description","Unit","Qty","Unit Price","Total"]],
        body: items.map((it,i) => [
          i+1,
          it.item_name||it.description||"-",
          it.unit_of_measure||"PCS",
          it.quantity||1,
          it.unit_price ? `KES ${Number(it.unit_price).toLocaleString()}` : "-",
          it.total_price || it.quantity*it.unit_price ? `KES ${Number(it.total_price||(it.quantity||1)*(it.unit_price||0)).toLocaleString()}` : "-",
        ]),
        styles:       { fontSize:8 },
        headStyles:   { fillColor:[0,45,100], textColor:255, fontStyle:"bold" },
        alternateRowStyles: { fillColor:[240,246,255] },
        theme:        "grid",
        margin:       { left:12, right:12 },
      });

      // Signatures
      const fy = (doc as any).lastAutoTable.finalY + 12;
      ["Requested By","HOD / Supervisor","Procurement Officer","Finance","Store Keeper"].forEach((role,i) => {
        const x = 12 + i*38;
        doc.setDrawColor(0,0,0); doc.setLineWidth(0.3);
        doc.line(x, fy+14, x+32, fy+14);
        doc.setFontSize(6); doc.setFont("helvetica","normal"); doc.setTextColor(80,80,80);
        doc.text(role, x+16, fy+18, { align:"center" });
        doc.text("Signature & Stamp", x+16, fy+22, { align:"center" });
      });
    },
  });
}

/** Print LPO */
export async function printPurchaseOrder(po: any, items: any[], supplier: any): Promise<void> {
  await printDocument({
    title:    "LOCAL PURCHASE ORDER (LPO)",
    docNo:    po.po_number || po.id?.slice(0,8).toUpperCase(),
    filename: `LPO-${po.po_number || po.id?.slice(0,8)}`,
    content: async (doc, startY) => {
      autoTable(doc, {
        startY,
        head: [],
        body: [
          ["Supplier:",    supplier?.name||po.supplier_name||"-",    "LPO No:", po.po_number||"-"],
          ["Address:",     supplier?.address||"-",                   "Date:",   po.created_at?.slice(0,10)||"-"],
          ["Contact:",     supplier?.phone||"-",                     "Delivery:", po.expected_delivery_date?.slice(0,10)||"TBD"],
          ["KRA PIN:",     supplier?.kra_pin||"-",                   "Terms:",  po.payment_terms||"30 days"],
        ],
        styles:       { fontSize:8, cellPadding:2 },
        columnStyles: { 0:{fontStyle:"bold",cellWidth:28}, 1:{cellWidth:70}, 2:{fontStyle:"bold",cellWidth:25}, 3:{cellWidth:45} },
        theme:        "plain",
        margin:       { left:12, right:12 },
      });

      const y2 = (doc as any).lastAutoTable.finalY + 5;
      const total = items.reduce((a,it)=>a+(it.total_price||0),0);

      autoTable(doc, {
        startY: y2,
        head: [["#","Description","Qty","Unit","Unit Price (KES)","Total (KES)"]],
        body: [
          ...items.map((it,i)=>[i+1,it.item_name||it.description,it.quantity||1,it.unit_of_measure||"PCS",Number(it.unit_price||0).toLocaleString(),Number(it.total_price||0).toLocaleString()]),
          [{content:"",colSpan:4},{content:"TOTAL:",styles:{fontStyle:"bold",halign:"right"}},{content:`KES ${total.toLocaleString()}`,styles:{fontStyle:"bold"}}],
        ],
        styles:       { fontSize:8 },
        headStyles:   { fillColor:[0,45,100], textColor:255, fontStyle:"bold" },
        alternateRowStyles: { fillColor:[240,246,255] },
        theme:        "grid",
        margin:       { left:12, right:12 },
      });

      const fy = (doc as any).lastAutoTable.finalY + 8;
      doc.setFontSize(7); doc.setFont("helvetica","normal"); doc.setTextColor(80,80,80);
      doc.text("Authorised by: _______________________     Procurement Officer: _______________________     Finance: _______________________", 12, fy);
    },
  });
}

// - Compatibility aliases (keep existing imports working) -
export const printLPO = printPurchaseOrder;
export const printGRN = async (grn: any, items: any[], supplier?: any) => {
  await printDocument({
    title: "GOODS RECEIVED NOTE (GRN)",
    docNo: grn.grn_number || grn.id?.slice(0,8).toUpperCase(),
    filename: `GRN-${grn.grn_number || grn.id?.slice(0,8)}`,
    content: async (doc, startY) => {
      autoTable(doc, {
        startY,
        head: [],
        body: [
          ["Supplier:", supplier?.name || grn.supplier_name || "-", "GRN No:", grn.grn_number || "-"],
          ["LPO Ref:", grn.lpo_number || "-", "Date:", grn.created_at?.slice(0,10) || "-"],
          ["Received By:", grn.received_by_name || "-", "Store:", grn.store_location || "Main Store"],
        ],
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: { 0:{fontStyle:"bold",cellWidth:30}, 1:{cellWidth:65}, 2:{fontStyle:"bold",cellWidth:22}, 3:{cellWidth:45} },
        theme: "plain",
        margin: { left: 12, right: 12 },
      });
      const y2 = (doc as any).lastAutoTable.finalY + 5;
      autoTable(doc, {
        startY: y2,
        head: [["#","Item Description","Unit","Ordered","Received","Variance","Condition"]],
        body: items.map((it,i) => [i+1, it.item_name||it.description||"-", it.unit_of_measure||"PCS", it.quantity_ordered||0, it.quantity_received||0, (it.quantity_ordered||0)-(it.quantity_received||0), it.condition||"Good"]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [0,45,100], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [240,246,255] },
        theme: "grid",
        margin: { left: 12, right: 12 },
      });
    },
  });
};

export const printJournalVoucher = async (voucher: any, lines: any[]) => {
  await printDocument({
    title: "JOURNAL VOUCHER",
    docNo: voucher.voucher_number || voucher.id?.slice(0,8).toUpperCase(),
    filename: `JV-${voucher.voucher_number || voucher.id?.slice(0,8)}`,
    content: async (doc, startY) => {
      autoTable(doc, {
        startY,
        head: [["Account Code","Description","Debit (KES)","Credit (KES)"]],
        body: (lines||[]).map(l => [l.account_code||"-", l.description||"-", l.debit_amount ? Number(l.debit_amount).toLocaleString() : "-", l.credit_amount ? Number(l.credit_amount).toLocaleString() : "-"]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [0,45,100], textColor: 255, fontStyle: "bold" },
        theme: "grid",
        margin: { left: 12, right: 12 },
      });
    },
  });
};

export const printGenericVoucher = async (voucher: any, type: string) => {
  await printDocument({
    title: `${type.toUpperCase()} VOUCHER`,
    docNo: voucher.voucher_number || voucher.id?.slice(0,8).toUpperCase(),
    filename: `${type.slice(0,3).toUpperCase()}-${voucher.voucher_number || voucher.id?.slice(0,8)}`,
    content: async (doc, startY) => {
      autoTable(doc, {
        startY,
        head: [],
        body: [
          ["Payee / Ref:", voucher.payee_name || voucher.reference || "-", "Amount:", voucher.total_amount ? `KES ${Number(voucher.total_amount).toLocaleString()}` : "-"],
          ["Date:", voucher.created_at?.slice(0,10) || "-", "Status:", (voucher.status || "Draft").toUpperCase()],
          ["Description:", voucher.description || voucher.notes || "-", "", ""],
        ],
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: { 0:{fontStyle:"bold",cellWidth:32}, 1:{cellWidth:68}, 2:{fontStyle:"bold",cellWidth:22}, 3:{cellWidth:46} },
        theme: "plain",
        margin: { left: 12, right: 12 },
      });
    },
  });
};
export const printPO = printPurchaseOrder;
