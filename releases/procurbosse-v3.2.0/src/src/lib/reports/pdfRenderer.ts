import jsPDF from 'jspdf';
import 'jspdf-autotable';

export interface ReportSection {
  title: string;
  type: 'table' | 'text' | 'chart_placeholder';
  data?: any[];
  columns?: string[];
  text?: string;
}

export function renderReportPDF(
  title: string,
  sections: ReportSection[],
  options: { orientation?: 'portrait' | 'landscape'; logo?: string } = {}
): jsPDF {
  const doc = new jsPDF({ orientation: options.orientation || 'portrait' });
  let yPos = 20;

  // Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(title, doc.internal.pageSize.getWidth() / 2, yPos, { align: "center" });
  yPos += 8;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Embu Level 5 Hospital — Generated ${new Date().toLocaleDateString()}`, doc.internal.pageSize.getWidth() / 2, yPos, { align: "center" });
  yPos += 12;

  sections.forEach(section => {
    if (yPos > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(section.title, 14, yPos);
    yPos += 6;

    if (section.type === 'text' && section.text) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(section.text, doc.internal.pageSize.getWidth() - 28);
      doc.text(lines, 14, yPos);
      yPos += lines.length * 4 + 6;
    }

    if (section.type === 'table' && section.data && section.columns) {
      (doc as any).autoTable({
        startY: yPos,
        head: [section.columns],
        body: section.data.map(row => section.columns!.map(col => String(row[col] ?? ''))),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [30, 58, 95] },
        margin: { left: 14, right: 14 },
      });
      yPos = (doc as any).lastAutoTable.finalY + 8;
    }
  });

  return doc;
}

export function downloadPDF(doc: jsPDF, filename: string): void {
  doc.save(`${filename}.pdf`);
}
