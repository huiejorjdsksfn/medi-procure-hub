import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const exportToExcel = (data: any[], filename: string) => {
  const ws = XLSX.utils.json_to_sheet(
    data.map((item) => {
      const flat: Record<string, any> = {};
      Object.entries(item).forEach(([key, value]) => {
        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
          flat[key] = (value as any).name || JSON.stringify(value);
        } else {
          flat[key] = value;
        }
      });
      return flat;
    })
  );
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([buf], { type: "application/octet-stream" }), `${filename}.xlsx`);
};

export const exportToPDF = (data: any[], title: string, columns: string[]) => {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(title, 14, 20);
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

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
    startY: 35,
    styles: { fontSize: 7 },
    headStyles: { fillColor: [30, 58, 95] },
  });

  doc.save(`${title.toLowerCase().replace(/\s+/g, "-")}.pdf`);
};
