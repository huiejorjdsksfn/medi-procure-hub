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

let logoBase64: string | null = null;
const loadLogo = async () => {
  if (logoBase64) return logoBase64;
  try {
    const { default: logoUrl } = await import("@/assets/embu-county-logo.jpg");
    const response = await fetch(logoUrl);
    const blob = await response.blob();
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        logoBase64 = reader.result as string;
        resolve(logoBase64);
      };
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

const addLetterhead = async (doc: jsPDF, title: string, docNo: string) => {
  const logo = await loadLogo();

  // Centered logo
  if (logo) {
    try { doc.addImage(logo, "JPEG", 90, 4, 20, 20); } catch { /* fallback */ }
  } else {
    doc.setFillColor(30, 58, 95);
    doc.circle(105, 14, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("+", 105, 17, { align: "center" });
  }

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("REPUBLIC OF KENYA", 105, 27, { align: "center" });
  doc.setFontSize(7);
  doc.text(HOSPITAL_HEADER.ministry, 105, 31, { align: "center" });
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(HOSPITAL_HEADER.name, 105, 38, { align: "center" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.text(`"${HOSPITAL_HEADER.motto}"`, 105, 43, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text(HOSPITAL_HEADER.address, 105, 47, { align: "center" });
  doc.text(HOSPITAL_HEADER.phone, 105, 51, { align: "center" });
  doc.text(`${HOSPITAL_HEADER.email} | ${HOSPITAL_HEADER.iso}`, 105, 55, { align: "center" });

  // Double line separator
  doc.setDrawColor(30, 58, 95);
  doc.setLineWidth(0.8);
  doc.line(14, 58, 196, 58);
  doc.setLineWidth(0.3);
  doc.line(14, 59.5, 196, 59.5);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(title, 105, 66, { align: "center" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(`Document No: ${docNo}  |  Rev: 01`, 105, 71, { align: "center" });
  return 76;
};

const addStampBox = (doc: jsPDF, x: number, y: number, label: string) => {
  doc.setDrawColor(100);
  doc.setLineWidth(0.3);
  doc.rect(x, y, 40, 25);
  doc.setFontSize(6);
  doc.text(label, x + 20, y + 3, { align: "center" });
  doc.line(x + 5, y + 18, x + 35, y + 18);
  doc.text("Official Stamp", x + 20, y + 22, { align: "center" });
};

const addFooter = (doc: jsPDF) => {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(6);
    doc.setTextColor(120);
    doc.text(`${HOSPITAL_HEADER.name} — MediProcure ERP`, 14, 290);
    doc.text(`Page ${i} of ${pages}`, 196, 290, { align: "right" });
    doc.setTextColor(0);
  }
};

export const exportToPDF = async (data: any[], title: string, columns: string[]) => {
  const doc = new jsPDF();
  const startY = await addLetterhead(doc, title.toUpperCase(), "EL5H/RPT/GEN");

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
  });

  const finalY = (doc as any).lastAutoTable?.finalY || startY + 40;
  if (finalY + 35 < 275) {
    addStampBox(doc, 140, finalY + 8, "AUTHORIZED BY");
  }

  addFooter(doc);
  doc.save(`${title.toLowerCase().replace(/\s+/g, "-")}.pdf`);
};

export const generateRequisitionPDF = async (requisition: any, lineItems: any[], departments: any[]) => {
  const doc = new jsPDF();
  const startY = await addLetterhead(doc, "DEPARTMENTAL STORES REQUISITION", "EL5H/SCM/FRM/001");
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
  doc.text(`Total Amount: KSH ${Number(requisition.total_amount || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`, 120, y); y += 5;
  if (requisition.justification) { doc.text(`Justification: ${requisition.justification}`, 14, y); y += 5; }

  y += 3;
  autoTable(doc, {
    head: [["#", "Item Description", "UoM", "Qty Requested", "Unit Cost (KSH)", "Total (KSH)"]],
    body: lineItems.map((li, i) => [
      i + 1, li.item_name, li.unit_of_measure || "piece",
      li.quantity, Number(li.unit_price || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 }),
      Number(li.total_price || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 }),
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
    if (ay + 22 < 255) addStampBox(doc, x, ay + 22, "Official Stamp");
  });

  doc.setFontSize(7);
  doc.text("DISTRIBUTION: ORIGINAL - Finance (WHITE)  |  DEPARTMENT COPY (YELLOW)  |  STORES COPY (GREEN)", 14, 285);
  addFooter(doc);
  doc.save(`Requisition-${requisition.requisition_number}.pdf`);
};

export const generateLPO_PDF = async (po: any, supplier: any, lineItems: any[]) => {
  const doc = new jsPDF();
  const startY = await addLetterhead(doc, "LOCAL PURCHASE ORDER (LPO)", "EL5H/SCM/FRM/002");

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
      Number(li.unit_price || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 }),
      Number(li.total_price || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 }),
    ]) : [["—", "As per requisition", "—", "—", "—", Number(po.total_amount || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })]],
    startY: y,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 58, 95] },
    tableLineColor: [30, 58, 95],
    tableLineWidth: 0.1,
  });

  const finalY = (doc as any).lastAutoTable?.finalY || y + 20;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`TOTAL INVOICE VALUE: KSH ${Number(po.total_amount || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`, 14, finalY + 8);

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
    if (ty + 18 < 260) addStampBox(doc, x, ty + 16, "Official Stamp");
  });

  doc.setFontSize(7);
  doc.text("DISTRIBUTION: ORIGINAL - Supplier (WHITE)  |  FINANCE (YELLOW)  |  PROCUREMENT (GREEN)  |  STORES (BLUE)", 14, 285);
  addFooter(doc);
  doc.save(`LPO-${po.po_number}.pdf`);
};

export const generateGRN_PDF = async (grn: any, po: any, supplier: any) => {
  const doc = new jsPDF();
  const startY = await addLetterhead(doc, "GOODS RECEIVED NOTE (GRN)", "EL5H/SCM/FRM/003");

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
    if (y + 24 < 250) addStampBox(doc, x, y + 22, "Official Stamp");
  });

  doc.setFontSize(7);
  doc.text("DISTRIBUTION: ORIGINAL - Finance (WHITE)  |  PROCUREMENT (YELLOW)  |  STORES (GREEN)  |  SUPPLIER (BLUE)", 14, 285);
  addFooter(doc);
  doc.save(`GRN-${grn.grn_number}.pdf`);
};
