import * as XLSX from 'xlsx';

export interface ExcelSheet {
  name: string;
  headers: string[];
  data: any[][];
}

export function exportToExcel(sheets: ExcelSheet[], filename: string = 'report'): void {
  const wb = XLSX.utils.book_new();
  sheets.forEach(sheet => {
    const wsData = [sheet.headers, ...sheet.data];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    // Auto-width columns
    const colWidths = sheet.headers.map((h, i) => {
      const maxLen = Math.max(h.length, ...sheet.data.map(row => String(row[i] ?? '').length));
      return { wch: Math.min(30, maxLen + 2) };
    });
    ws['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.substring(0, 31));
  });
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportSingleSheet(data: any[], columns: string[], filename: string): void {
  const headers = columns;
  const rows = data.map(item => columns.map(col => item[col] ?? ''));
  exportToExcel([{ name: 'Sheet1', headers, data: rows }], filename);
}
