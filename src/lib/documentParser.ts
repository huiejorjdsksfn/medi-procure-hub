/**
 * ProcurBosse  -- Document Parser v1.0
 * Parses Word (.docx), Excel (.xlsx/.xls), CSV, PDF text extraction
 * Maps parsed data to ERP modules (requisitions, items, suppliers, etc.)
 * EL5 MediProcure * Embu Level 5 Hospital
 */
import * as XLSX from "xlsx";

export type FileKind = "excel" | "word" | "csv" | "pdf" | "image" | "pptx" | "json" | "xml" | "text" | "zip" | "video" | "audio" | "unknown";

/** All accepted file types with metadata */
export const FILE_TYPE_META: Record<FileKind, { label:string; color:string; bg:string; extensions:string[]; maxMB:number; parseable:boolean }> = {
  excel:   { label:"Excel",      color:"#16a34a", bg:"#16a34a18", extensions:[".xlsx",".xls",".ods"],             maxMB:50,  parseable:true  },
  word:    { label:"Word",       color:"#1d4ed8", bg:"#1d4ed818", extensions:[".docx",".doc"],                    maxMB:50,  parseable:true  },
  pdf:     { label:"PDF",        color:"#dc2626", bg:"#dc262618", extensions:[".pdf"],                            maxMB:100, parseable:true  },
  csv:     { label:"CSV",        color:"#059669", bg:"#05986918", extensions:[".csv"],                            maxMB:20,  parseable:true  },
  pptx:    { label:"PowerPoint", color:"#f97316", bg:"#f9731618", extensions:[".pptx",".ppt"],                    maxMB:100, parseable:false },
  image:   { label:"Image",      color:"#7c3aed", bg:"#7c3aed18", extensions:[".jpg",".jpeg",".png",".webp",".gif",".svg",".bmp",".tiff"], maxMB:20, parseable:false },
  json:    { label:"JSON",       color:"#0891b2", bg:"#0891b218", extensions:[".json"],                           maxMB:10,  parseable:true  },
  xml:     { label:"XML",        color:"#0369a1", bg:"#0369a118", extensions:[".xml"],                            maxMB:10,  parseable:true  },
  text:    { label:"Text",       color:"#6b7280", bg:"#6b728018", extensions:[".txt",".log",".md"],               maxMB:10,  parseable:true  },
  zip:     { label:"Archive",    color:"#8b5cf6", bg:"#8b5cf618", extensions:[".zip",".tar",".gz",".rar"],        maxMB:200, parseable:false },
  video:   { label:"Video",      color:"#f43f5e", bg:"#f43f5e18", extensions:[".mp4",".webm",".mov",".mpeg"],     maxMB:500, parseable:false },
  audio:   { label:"Audio",      color:"#ec4899", bg:"#ec489918", extensions:[".mp3",".wav",".ogg",".m4a"],       maxMB:100, parseable:false },
  unknown: { label:"Other",      color:"#9ca3af", bg:"#9ca3af18", extensions:[],                                  maxMB:50,  parseable:false },
};

/** Accept string for file inputs  -- all supported formats */
export const ACCEPT_ALL = ".xlsx,.xls,.ods,.docx,.doc,.pdf,.csv,.pptx,.ppt,.jpg,.jpeg,.png,.webp,.gif,.svg,.bmp,.tiff,.json,.xml,.txt,.log,.md,.zip,.tar,.gz,.mp4,.webm,.mov,.mp3,.wav,.ogg,.m4a";

export interface ParsedDocument {
  kind: FileKind;
  text: string;
  tables: ParsedTable[];
  metadata: Record<string, any>;
  suggestedModule: string | null;
  mappedRows: any[];
}

export interface ParsedTable {
  name: string;
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
}

/** Detect file kind from MIME type or extension */
export function detectKind(file: File): FileKind {
  const name = file.name.toLowerCase();
  const mime = file.type.toLowerCase();
  if (mime.includes("spreadsheet") || mime.includes("excel") || name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".ods")) return "excel";
  if (mime.includes("wordprocessing") || mime.includes("msword") || name.endsWith(".docx") || name.endsWith(".doc")) return "word";
  if (mime.includes("presentationml") || mime.includes("powerpoint") || name.endsWith(".pptx") || name.endsWith(".ppt")) return "pptx";
  if (mime === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (mime === "text/csv" || name.endsWith(".csv")) return "csv";
  if (mime === "application/json" || name.endsWith(".json")) return "json";
  if (mime.includes("xml") || name.endsWith(".xml")) return "xml";
  if (mime === "text/plain" || name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".log")) return "text";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/") || name.endsWith(".mp4") || name.endsWith(".webm") || name.endsWith(".mov")) return "video";
  if (mime.startsWith("audio/") || name.endsWith(".mp3") || name.endsWith(".wav") || name.endsWith(".ogg")) return "audio";
  if (mime.includes("zip") || mime.includes("tar") || mime.includes("gzip") || name.endsWith(".zip") || name.endsWith(".tar") || name.endsWith(".gz") || name.endsWith(".rar")) return "zip";
  return "unknown";
}

/** Format file size */
export function fmtSize(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

/** Parse Excel / CSV -> tables */
export async function parseExcel(file: File): Promise<ParsedDocument> {
  const ab = await file.arrayBuffer();
  const wb = XLSX.read(ab, { type: "array", cellDates: true });
  const tables: ParsedTable[] = [];
  let allText = "";

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
    if (rows.length < 2) continue;

    // Find header row (first non-empty row)
    const headerIdx = rows.findIndex(r => r.some(c => String(c).trim()));
    if (headerIdx === -1) continue;

    const headers = rows[headerIdx].map((h: any) => String(h).trim()).filter(Boolean);
    if (!headers.length) continue;

    const dataRows = rows.slice(headerIdx + 1)
      .filter(r => r.some(c => String(c).trim()))
      .map(r => {
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => { obj[h] = String(r[i] ?? "").trim(); });
        return obj;
      });

    allText += `\n[Sheet: ${sheetName}]\n${headers.join(" | ")}\n`;
    dataRows.slice(0, 5).forEach(r => { allText += Object.values(r).join(" | ") + "\n"; });

    tables.push({ name: sheetName, headers, rows: dataRows, rowCount: dataRows.length });
  }

  const suggested = suggestModule(tables);
  return {
    kind: "excel",
    text: allText.trim(),
    tables,
    metadata: { sheets: wb.SheetNames, sheetCount: wb.SheetNames.length },
    suggestedModule: suggested,
    mappedRows: tables.length > 0 ? mapRows(tables[0], suggested) : [],
  };
}

/** Parse CSV */
export async function parseCSV(file: File): Promise<ParsedDocument> {
  const text = await file.text();
  const lines = text.split("\n").map(l => l.split(",").map(c => c.replace(/^"|"$/g, "").trim()));
  if (lines.length < 2) return { kind:"csv", text, tables:[], metadata:{}, suggestedModule:null, mappedRows:[] };

  const headers = lines[0].filter(Boolean);
  const rows = lines.slice(1).filter(l => l.some(c => c)).map(l => {
    const obj: Record<string,string> = {};
    headers.forEach((h,i) => { obj[h] = l[i]||""; });
    return obj;
  });

  const table: ParsedTable = { name: file.name, headers, rows, rowCount: rows.length };
  const suggested = suggestModule([table]);
  return {
    kind: "csv", text: text.slice(0, 2000),
    tables: [table], metadata: { rows: rows.length },
    suggestedModule: suggested,
    mappedRows: mapRows(table, suggested),
  };
}

/** Parse Word document using mammoth */
export async function parseWord(file: File): Promise<ParsedDocument> {
  try {
    const mammoth = await import("mammoth");
    const ab = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: ab });
    const text = result.value;

    // Extract tables from text (look for tabular patterns)
    const tables = extractTablesFromText(text);
    const suggested = suggestModuleFromText(text);

    return {
      kind: "word", text: text.slice(0, 5000),
      tables, metadata: { messages: result.messages?.length || 0 },
      suggestedModule: suggested,
      mappedRows: [],
    };
  } catch {
    const text = await file.text().catch(() => "Could not parse Word document");
    return { kind:"word", text, tables:[], metadata:{}, suggestedModule:null, mappedRows:[] };
  }
}

/** PDF  -- extract text via PDF.js (client side) */
export async function parsePDF(file: File): Promise<ParsedDocument> {
  try {
    // Try PDF.js dynamic import
    const pdfjsLib = await import("pdfjs-dist").catch(() => null);
    if (!pdfjsLib) throw new Error("pdfjs not available");

    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
    const ab = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
    let fullText = "";

    for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      fullText += content.items.map((item: any) => item.str).join(" ") + "\n";
    }

    const tables = extractTablesFromText(fullText);
    const suggested = suggestModuleFromText(fullText);

    return {
      kind: "pdf",
      text: fullText.slice(0, 5000),
      tables, metadata: { pages: pdf.numPages },
      suggestedModule: suggested,
      mappedRows: [],
    };
  } catch {
    return {
      kind: "pdf",
      text: "PDF text extraction requires server-side processing. File uploaded successfully.",
      tables: [], metadata: {}, suggestedModule: null, mappedRows: [],
    };
  }
}

/** Auto-detect module from table headers */
function suggestModule(tables: ParsedTable[]): string | null {
  if (!tables.length) return null;
  const headers = tables.flatMap(t => t.headers).map(h => h.toLowerCase());
  const text = headers.join(" ");

  if (/item.*name|description.*qty|unit.*price|stock|quantity|uom|unit.of.measure/i.test(text)) return "items";
  if (/supplier.*name|vendor|company.*name|tin|kra.pin|contact/i.test(text)) return "suppliers";
  if (/requisition|req.*no|requested.*by|department.*head/i.test(text)) return "requisitions";
  if (/purchase.*order|lpo|local.*purchase|po.*number/i.test(text)) return "purchase_orders";
  if (/invoice|voucher|payment|amount.*paid|cheque/i.test(text)) return "payment_vouchers";
  if (/budget|vote.*head|allocation|appropriation/i.test(text)) return "budgets";
  if (/employee|staff|name.*id.*number|designation|department/i.test(text)) return "profiles";
  return "documents";
}

function suggestModuleFromText(text: string): string | null {
  const t = text.toLowerCase();
  if (/local purchase order|lpo|purchase order/i.test(t)) return "purchase_orders";
  if (/requisition|stores requisition/i.test(t)) return "requisitions";
  if (/payment voucher|payment advice/i.test(t)) return "payment_vouchers";
  if (/goods received|delivery note|grn/i.test(t)) return "goods_received";
  if (/supplier|vendor registration/i.test(t)) return "suppliers";
  if (/budget|allocation|vote/i.test(t)) return "budgets";
  if (/invoice|receipt/i.test(t)) return "receipt_vouchers";
  return "documents";
}

/** Map rows to target module format */
function mapRows(table: ParsedTable, module: string | null): any[] {
  if (!module || !table.rows.length) return [];

  const headers = table.headers.map(h => h.toLowerCase().replace(/\s+/g,"_"));

  return table.rows.slice(0, 200).map(row => {
    switch (module) {
      case "items": return {
        name:             findVal(row, ["item_name","description","name","item","product"]),
        unit_of_measure:  findVal(row, ["uom","unit","unit_of_measure","units"]),
        current_quantity: parseNum(findVal(row, ["qty","quantity","stock","current_qty","balance"])),
        unit_price:       parseNum(findVal(row, ["unit_price","price","cost","rate"])),
        category:         findVal(row, ["category","type","class","group"]),
        reorder_level:    parseNum(findVal(row, ["reorder","min_qty","minimum","reorder_level"])),
      };
      case "suppliers": return {
        name:        findVal(row, ["name","supplier_name","company","vendor","company_name"]),
        contact_person: findVal(row, ["contact","contact_person","person"]),
        phone:       findVal(row, ["phone","mobile","tel","telephone","contact_no"]),
        email:       findVal(row, ["email","email_address"]),
        kra_pin:     findVal(row, ["kra_pin","pin","tin","tax_pin"]),
        address:     findVal(row, ["address","location","town"]),
        category:    findVal(row, ["category","type","supply_category"]),
      };
      case "requisitions": return {
        title:       findVal(row, ["title","description","item","goods_description"]),
        department:  findVal(row, ["department","dept","section"]),
        quantity:    parseNum(findVal(row, ["quantity","qty"])),
        unit_price:  parseNum(findVal(row, ["unit_price","price","estimated_cost"])),
        priority:    findVal(row, ["priority","urgency"]) || "normal",
      };
      default: return row;
    }
  }).filter(r => Object.values(r).some(v => v && String(v).trim()));
}

function findVal(row: Record<string,string>, keys: string[]): string {
  for (const k of keys) {
    const found = Object.entries(row).find(([key]) => key.toLowerCase().replace(/[\s_-]/g,"").includes(k.replace(/[\s_-]/g,"")));
    if (found && found[1]) return found[1];
  }
  return "";
}

function parseNum(s: string): number {
  const n = parseFloat(String(s).replace(/[^0-9.-]/g,""));
  return isNaN(n) ? 0 : n;
}

function extractTablesFromText(text: string): ParsedTable[] {
  // Simple heuristic: look for lines with consistent delimiters
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const tables: ParsedTable[] = [];
  let inTable = false;
  let headers: string[] = [];
  let rows: Record<string,string>[] = [];

  for (const line of lines) {
    const parts = line.split(/\t|\s{2,}/).map(p => p.trim()).filter(Boolean);
    if (parts.length >= 3) {
      if (!inTable) {
        inTable = true;
        headers = parts;
        rows = [];
      } else {
        const row: Record<string,string> = {};
        headers.forEach((h,i) => { row[h] = parts[i]||""; });
        rows.push(row);
      }
    } else {
      if (inTable && rows.length > 1) {
        tables.push({ name: `Table ${tables.length+1}`, headers, rows, rowCount: rows.length });
      }
      inTable = false;
    }
  }
  if (inTable && rows.length > 1) {
    tables.push({ name: `Table ${tables.length+1}`, headers, rows, rowCount: rows.length });
  }
  return tables;
}
