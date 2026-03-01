import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const HOSPITAL_HEADER = {
  name: "EMBU LEVEL 5 HOSPITAL",
  ministry: "COUNTY GOVERNMENT OF EMBU - HEALTH SERVICES",
  motto: "Quality Healthcare for All",
  address: "P.O. Box 33 - 60100, EMBU, KENYA",
  phone: "Tel: +254 68 31055/56 | +254 722 406595",
  email: "Email: pghembu@gmail.com",
  iso: "ISO 9001:2015 Certified",
};

export const exportToExcel = (data: any[], filename: string) => {
  const rows = data.map((item) => {
    const flat: Record<string, any> = {};
    Object.entries(item).forEach(([key, value]) => {
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        flat[key] = (value as any).name || JSON.stringify(value);
      } else {
        flat[key] = value;
      }
    });
    return flat;
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();

  // Add letterhead rows at the top
  const headerRows = [
    ["REPUBLIC OF KENYA"],
    [HOSPITAL_HEADER.ministry],
    [HOSPITAL_HEADER.name],
    [`"${HOSPITAL_HEADER.motto}"`],
    [HOSPITAL_HEADER.address],
    [HOSPITAL_HEADER.phone],
    [`${HOSPITAL_HEADER.email} | ${HOSPITAL_HEADER.iso}`],
    [],
    [`Report: ${filename.toUpperCase()}  |  Records: ${rows.length}`],
    [],
  ];

  const headerWs = XLSX.utils.aoa_to_sheet(headerRows);
  // Append data below header
  XLSX.utils.sheet_add_json(headerWs, rows, { origin: "A11" });

  // Set column widths
  const cols = Object.keys(rows[0] || {});
  headerWs["!cols"] = cols.map(() => ({ wch: 20 }));

  XLSX.utils.book_append_sheet(wb, headerWs, "Data");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([buf], { type: "application/octet-stream" }), `${filename}.xlsx`);
};

const addLetterhead = (doc: jsPDF, title: string, docNo: string) => {
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("REPUBLIC OF KENYA", 105, 12, { align: "center" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(HOSPITAL_HEADER.ministry, 105, 17, { align: "center" });
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(HOSPITAL_HEADER.name, 105, 25, { align: "center" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text(`"${HOSPITAL_HEADER.motto}"`, 105, 30, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text(HOSPITAL_HEADER.address, 105, 35, { align: "center" });
  doc.text(HOSPITAL_HEADER.phone, 105, 39, { align: "center" });
  doc.text(`${HOSPITAL_HEADER.email} | ${HOSPITAL_HEADER.iso}`, 105, 43, { align: "center" });
  doc.setDrawColor(30, 58, 95);
  doc.setLineWidth(0.5);
  doc.line(14, 46, 196, 46);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(title, 105, 54, { align: "center" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Document No: ${docNo}  |  Rev: 01`, 105, 59, { align: "center" });
  return 65;
};

const addStampBox = (doc: jsPDF, x: number, y: number, label: string) => {
  doc.setDrawColor(100);
  doc.setLineWidth(0.3);
  doc.rect(x, y, 40, 25);
  doc.setFontSize(6);
  doc.text(label, x + 20, y + 3, { align: "center" });
  doc.text("Official Stamp", x + 20, y + 22, { align: "center" });
};

export const exportToPDF = (data: any[], title: string, columns: string[]) => {
  const doc = new jsPDF();
  const startY = addLetterhead(doc, title.toUpperCase(), "EL5H/RPT/GEN");

  doc.setFontSize(8);
  doc.text(`Records: ${data.length}`, 14, startY);

  const rows = data.map((item) =>
    columns.map((col) => {
      const val = item[col];
      if (typeof val === "object" && val !== null) return (val as any).name || "";
      return String(val ?? "");
    })
  );

  autoTable(doc, {
    head: [columns.map((c) => c.replace(/_/g, " ").toUpperCase())],
    body: rows,
    startY: startY + 4,
    styles: { fontSize: 7 },
    headStyles: { fillColor: [30, 58, 95] },
    tableLineColor: [30, 58, 95],
    tableLineWidth: 0.1,
    didDrawPage: () => {
      doc.setFontSize(7);
      doc.text(`Page ${doc.getNumberOfPages()}`, 105, 290, { align: "center" });
    },
  });

  // Add stamp box at bottom
  const finalY = (doc as any).lastAutoTable?.finalY || startY + 40;
  if (finalY + 35 < 280) {
    addStampBox(doc, 140, finalY + 8, "AUTHORIZED BY");
  }

  doc.save(`${title.toLowerCase().replace(/\s+/g, "-")}.pdf`);
};

// =============================================
// EL5H OFFICIAL FORM TEMPLATES
// =============================================

export const generateRequisitionPDF = (requisition: any, lineItems: any[], departments: any[]) => {
  const doc = new jsPDF();
  const startY = addLetterhead(doc, "DEPARTMENTAL STORES REQUISITION", "EL5H/SCM/FRM/001");
  const deptName = departments.find((d: any) => d.id === requisition.department_id)?.name || "—";

  let y = startY + 2;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("REQUISITION DETAILS", 14, y); y += 6;
  doc.setFont("helvetica", "normal");
  doc.text(`Requisition No: ${requisition.requisition_number}`, 14, y); y += 5;
  doc.text(`Department: ${deptName}`, 14, y);
  doc.text(`Priority: ${(requisition.priority || "normal").toUpperCase()}`, 120, y); y += 5;
  doc.text(`Status: ${(requisition.status || "pending").toUpperCase()}`, 14, y);
  doc.text(`Total Amount: KSH ${Number(requisition.total_amount || 0).toFixed(2)}`, 120, y); y += 5;
  if (requisition.justification) { doc.text(`Justification: ${requisition.justification}`, 14, y); y += 5; }

  y += 3;
  autoTable(doc, {
    head: [["#", "Item Description", "UoM", "Qty Requested", "Unit Cost (KSH)", "Total (KSH)"]],
    body: lineItems.map((li, i) => [
      i + 1, li.item_name, li.unit_of_measure || "piece",
      li.quantity, Number(li.unit_price || 0).toFixed(2), Number(li.total_price || 0).toFixed(2),
    ]),
    startY: y,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 58, 95] },
    tableLineColor: [30, 58, 95],
    tableLineWidth: 0.1,
  });

  const finalY = (doc as any).lastAutoTable?.finalY || y + 40;
  let ay = finalY + 10;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("AUTHORIZATION SIGN-OFF", 14, ay); ay += 8;
  doc.setFont("helvetica", "normal");
  const sigBoxes = ["PREPARED BY:", "HEAD OF DEPARTMENT:", "STORES OFFICER:"];
  sigBoxes.forEach((label, i) => {
    const x = 14 + i * 62;
    doc.text(label, x, ay);
    doc.text("Name: ________________", x, ay + 6);
    doc.text("Signature: ____________", x, ay + 12);
    doc.text("Date: ___/___/______", x, ay + 18);
    addStampBox(doc, x, ay + 22, "Official Stamp");
  });

  doc.setFontSize(7);
  doc.text("DISTRIBUTION: ORIGINAL - Finance (WHITE)  |  DEPARTMENT COPY (YELLOW)  |  STORES COPY (GREEN)", 14, 285);
  doc.save(`Requisition-${requisition.requisition_number}.pdf`);
};

export const generateLPO_PDF = (po: any, supplier: any, lineItems: any[]) => {
  const doc = new jsPDF();
  const startY = addLetterhead(doc, "LOCAL PURCHASE ORDER (LPO)", "EL5H/SCM/FRM/002");

  let y = startY + 2;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("LPO DETAILS", 14, y); y += 6;
  doc.setFont("helvetica", "normal");
  doc.text(`LPO No: ${po.po_number}`, 14, y); y += 5;
  doc.text(`Delivery Date: ${po.delivery_date || "TBD"}`, 14, y);
  doc.text(`Status: ${(po.status || "draft").toUpperCase()}`, 120, y); y += 5;
  doc.text(`Delivery Location: Stores Department, Embu Level 5 Hospital`, 14, y); y += 8;

  doc.setFont("helvetica", "bold");
  doc.text("SUPPLIER DETAILS", 14, y); y += 6;
  doc.setFont("helvetica", "normal");
  doc.text(`Supplier Name: ${supplier?.name || "—"}`, 14, y);
  doc.text(`Contact: ${supplier?.contact_person || "—"}`, 120, y); y += 5;
  doc.text(`Phone: ${supplier?.phone || "—"}`, 14, y);
  doc.text(`Email: ${supplier?.email || "—"}`, 120, y); y += 5;
  doc.text(`Tax ID: ${supplier?.tax_id || "—"}`, 14, y);
  doc.text(`Address: ${supplier?.address || "—"}`, 120, y); y += 8;

  autoTable(doc, {
    head: [["#", "Item Description", "UoM", "Qty", "Unit Price (KSH)", "Total (KSH)"]],
    body: lineItems.length > 0 ? lineItems.map((li, i) => [
      i + 1, li.item_name || "—", "piece", li.quantity || 1,
      Number(li.unit_price || 0).toFixed(2), Number(li.total_price || 0).toFixed(2),
    ]) : [["—", "As per requisition", "—", "—", "—", Number(po.total_amount || 0).toFixed(2)]],
    startY: y,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 58, 95] },
    tableLineColor: [30, 58, 95],
    tableLineWidth: 0.1,
  });

  const finalY = (doc as any).lastAutoTable?.finalY || y + 20;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`TOTAL INVOICE VALUE: KSH ${Number(po.total_amount || 0).toFixed(2)}`, 14, finalY + 8);

  let ty = finalY + 16;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  const terms = [
    "1. Delivery must be made to Embu Level 5 Hospital Stores Department.",
    "2. Goods must strictly conform to specifications stated herein.",
    "3. Delivery Note must reference this LPO Number.",
    "4. Payment will be processed within 30-60 days subject to verification.",
    "5. This LPO is subject to the Public Procurement and Disposal Act, 2015.",
  ];
  terms.forEach(t => { doc.text(t, 14, ty); ty += 4; });

  ty += 4;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("AUTHORIZATION", 14, ty); ty += 6;
  doc.setFont("helvetica", "normal");
  ["PREPARED BY (Procurement Officer):", "VERIFIED BY (Finance Officer):", "APPROVED BY (CEO):"].forEach((label, i) => {
    const x = 14 + i * 62;
    doc.text(label, x, ty);
    doc.text("Sign: __________", x, ty + 6);
    doc.text("Date: __/__/____", x, ty + 12);
    if (ty + 18 < 270) addStampBox(doc, x, ty + 16, "Official Stamp");
  });

  doc.setFontSize(7);
  doc.text("DISTRIBUTION: ORIGINAL - Supplier (WHITE)  |  FINANCE (YELLOW)  |  PROCUREMENT (GREEN)  |  STORES (BLUE)", 14, 285);
  doc.save(`LPO-${po.po_number}.pdf`);
};

export const generateGRN_PDF = (grn: any, po: any, supplier: any) => {
  const doc = new jsPDF();
  const startY = addLetterhead(doc, "GOODS RECEIVED NOTE (GRN)", "EL5H/SCM/FRM/003");

  let y = startY + 2;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("GRN DETAILS", 14, y); y += 6;
  doc.setFont("helvetica", "normal");
  doc.text(`GRN No: ${grn.grn_number}`, 14, y);
  doc.text(`Date Received: ${new Date(grn.received_at).toLocaleDateString()}`, 120, y); y += 5;
  doc.text(`LPO No: ${po?.po_number || "—"}`, 14, y);
  doc.text(`Inspection: ${(grn.inspection_status || "pending").toUpperCase()}`, 120, y); y += 8;

  doc.setFont("helvetica", "bold");
  doc.text("SUPPLIER DETAILS", 14, y); y += 6;
  doc.setFont("helvetica", "normal");
  doc.text(`Supplier: ${supplier?.name || "—"}`, 14, y);
  doc.text(`Contact: ${supplier?.contact_person || "—"}`, 120, y); y += 5;
  doc.text(`Phone: ${supplier?.phone || "—"}`, 14, y); y += 8;

  doc.setFont("helvetica", "bold");
  doc.text("CONDITION OF GOODS", 14, y); y += 6;
  doc.setFont("helvetica", "normal");
  const conditions = ["[ ] Excellent", "[ ] Good", "[ ] Minor Damage", "[ ] Major Damage", "[ ] Wrong Items"];
  doc.text(conditions.join("    "), 14, y); y += 8;

  if (grn.notes) { doc.text(`Remarks: ${grn.notes}`, 14, y); y += 8; }

  doc.setFont("helvetica", "bold");
  doc.text("AUTHORIZATION", 14, y); y += 6;
  doc.setFont("helvetica", "normal");
  ["RECEIVING STORES CLERK:", "PROCUREMENT OFFICER:", "FINANCE (Notification):"].forEach((label, i) => {
    const x = 14 + i * 62;
    doc.text(label, x, y);
    doc.text("Name: ______________", x, y + 6);
    doc.text("Sign: ______________", x, y + 12);
    doc.text("Date: __/__/____", x, y + 18);
    if (y + 24 < 260) addStampBox(doc, x, y + 22, "Official Stamp");
  });

  doc.setFontSize(7);
  doc.text("DISTRIBUTION: ORIGINAL - Finance (WHITE)  |  PROCUREMENT (YELLOW)  |  STORES (GREEN)  |  SUPPLIER (BLUE)", 14, 285);
  doc.save(`GRN-${grn.grn_number}.pdf`);
};
