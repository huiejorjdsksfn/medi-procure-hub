/**
 * ProcurBosse - Excel Exporter
 * Generates formatted Excel exports for all modules
 * Uses SheetJS (xlsx) - already a dependency
 */
import { PRINT_CONFIG } from "./index";
import { ReportTemplate } from "./reportTemplates";

export async function exportToExcel(
  template: ReportTemplate,
  data: Record<string, any>[],
  filename?: string,
  facility = "EL5H",
  period = "",
): Promise<void> {
  const XLSX = (await import("xlsx")).default;

  const wb = XLSX.utils.book_new();

  // - Header rows -
  const meta = [
    [PRINT_CONFIG.LETTERHEAD.county],
    [PRINT_CONFIG.LETTERHEAD.hospital],
    [template.title],
    template.subtitle ? [template.subtitle] : null,
    period ? [`Period: ${period}`] : null,
    [`Facility: ${facility}   Exported: ${new Date().toLocaleString("en-KE")}`],
    [],
  ].filter(Boolean) as any[][];

  // - Column headers -
  const headers = template.columns.map(c => c.label);
  meta.push(headers);

  // - Data rows -
  for (const row of data) {
    meta.push(template.columns.map(col => {
      const val = row[col.key];
      if (val == null) return "";
      if (col.format === "currency") return typeof val === "number" ? val : parseFloat(val) || 0;
      if (col.format === "number")   return typeof val === "number" ? val : parseInt(val) || 0;
      if (col.format === "date")     return val ? new Date(val).toLocaleDateString("en-KE") : "";
      return String(val);
    }));
  }

  // - Totals row -
  if (template.totals?.length) {
    const totalsRow = template.columns.map(col => {
      if (!template.totals!.includes(col.key)) return col.key === template.columns[0].key ? "TOTAL" : "";
      const total = data.reduce((sum, row) => sum + (parseFloat(row[col.key]) || 0), 0);
      return total;
    });
    meta.push([]);
    meta.push(totalsRow);
  }

  // - Signatories -
  if (template.signatories?.length) {
    meta.push([]);
    meta.push(["AUTHORIZED SIGNATURES"]);
    meta.push([]);
    const sigRow: string[] = [];
    template.signatories.forEach(s => { sigRow.push(s); sigRow.push(""); });
    meta.push(sigRow);
    meta.push(template.signatories.map(() => "____________________"));
    meta.push(template.signatories.map(() => "Date: ______________"));
  }

  const ws = XLSX.utils.aoa_to_sheet(meta);

  // - Column widths -
  ws["!cols"] = template.columns.map(c => ({ wch: Math.ceil((c.width || 120) / 7) }));

  XLSX.utils.book_append_sheet(wb, ws, template.id.slice(0, 31));

  // - Export -
  const name = filename || `${template.id}_${facility}_${new Date().toISOString().slice(0,10)}.xlsx`;
  XLSX.writeFile(wb, name);
}

// - Quick exports for each module -
export async function exportRequisitions(data: any[], facility = "EL5H") {
  const { REPORT_TEMPLATES } = await import("./reportTemplates");
  return exportToExcel(REPORT_TEMPLATES.REQUISITIONS_SUMMARY, data, undefined, facility);
}

export async function exportPurchaseOrders(data: any[], facility = "EL5H") {
  const { REPORT_TEMPLATES } = await import("./reportTemplates");
  return exportToExcel(REPORT_TEMPLATES.PURCHASE_ORDERS, data, undefined, facility);
}

export async function exportGRN(data: any[], facility = "EL5H") {
  const { REPORT_TEMPLATES } = await import("./reportTemplates");
  return exportToExcel(REPORT_TEMPLATES.GOODS_RECEIVED, data, undefined, facility);
}

export async function exportPaymentVouchers(data: any[], facility = "EL5H") {
  const { REPORT_TEMPLATES } = await import("./reportTemplates");
  return exportToExcel(REPORT_TEMPLATES.PAYMENT_VOUCHERS, data, undefined, facility);
}

export async function exportInventory(data: any[], facility = "EL5H") {
  const { REPORT_TEMPLATES } = await import("./reportTemplates");
  return exportToExcel(REPORT_TEMPLATES.INVENTORY_STOCK, data, undefined, facility);
}

export async function exportSuppliers(data: any[], facility = "EL5H") {
  const { REPORT_TEMPLATES } = await import("./reportTemplates");
  return exportToExcel(REPORT_TEMPLATES.SUPPLIER_DIRECTORY, data, undefined, facility);
}
