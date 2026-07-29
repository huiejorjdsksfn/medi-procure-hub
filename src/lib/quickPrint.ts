/**
 * ProcurBosse — Quick Print Engine v1.0
 * EL5 MediProcure, Embu Level 5 Hospital
 *
 * Two problems this solves:
 *
 * 1. "Printing is a screenshot" — dozens of pages called window.print()
 *    directly on whatever was open on screen: sidebar, nav, modal
 *    backdrops, rounded corners and box-shadows all came out on paper.
 *    printElement() isolates exactly one DOM node (via CSS added to
 *    index.css) and hides everything else, so what prints is a clean
 *    document, not a screenshot of the app.
 *
 * 2. No printer detection or one-click printing existed anywhere — every
 *    print always meant a full OS dialog. In the Electron desktop app this
 *    module talks to the printer IPC bridge (electron/main.js) added
 *    alongside it: real printer enumeration and true silent quick-print.
 *    In the plain browser build (procurbosse.edgeone.app) there is no web
 *    API that can enumerate a person's local printers — no browser exposes
 *    one, for privacy reasons — so the browser path isolates the content
 *    and hands off to the browser's own print dialog, which still lists
 *    every printer the OS knows about; it's just the browser's picker
 *    rather than an in-app one.
 */

export interface DetectedPrinter {
  name: string;
  displayName: string;
  isDefault: boolean;
  status: number | null;
}

interface ProcurBosseBridge {
  isElectron?: boolean;
  getPrinters?: () => Promise<DetectedPrinter[]>;
  quickPrint?: (opts: { deviceName?: string; silent?: boolean; copies?: number }) => Promise<{ ok: boolean; error?: string }>;
  printDocument?: (opts?: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>;
}

function bridge(): ProcurBosseBridge | null {
  const w = window as any;
  return w.procurBosse?.isElectron ? w.procurBosse : (w.electronAPI?.isElectron ? w.electronAPI : null);
}

export function isElectron(): boolean {
  return !!bridge();
}

const LAST_PRINTER_KEY = "el5_last_printer";

export function getLastUsedPrinter(): string | null {
  try { return localStorage.getItem(LAST_PRINTER_KEY); } catch { return null; }
}
function setLastUsedPrinter(name: string) {
  try { localStorage.setItem(LAST_PRINTER_KEY, name); } catch { /* ignore */ }
}

/** Printer Auto-Detector: asks the OS (via Electron) what's actually
 *  available right now. Returns [] in the plain browser build — there's
 *  no way to know a browser user's local printers ahead of time. */
export async function detectPrinters(): Promise<DetectedPrinter[]> {
  const b = bridge();
  if (!b?.getPrinters) return [];
  try {
    const printers = await b.getPrinters();
    return printers || [];
  } catch {
    return [];
  }
}

/** Isolates `target` via the .qp-printing CSS rules in index.css, prints
 *  it (Electron silent/native, or the browser's own dialog), then cleans
 *  up. Safe to call from anywhere — falls back gracefully if `target` is
 *  gone or the tab isn't focused. */
export async function printElement(target: HTMLElement, opts?: { deviceName?: string; silent?: boolean; copies?: number }): Promise<{ ok: boolean; error?: string }> {
  if (!target) return { ok: false, error: "Nothing to print" };
  const prevAttr = target.getAttribute("data-print-target");
  target.setAttribute("data-print-target", "1");
  document.body.classList.add("qp-printing");

  try {
    const b = bridge();
    if (b?.quickPrint) {
      const res = await b.quickPrint({
        deviceName: opts?.deviceName,
        silent: opts?.silent ?? false, // default: let the person confirm via the native dialog unless they hit Quick Print
        copies: opts?.copies,
      });
      if (res.ok && opts?.deviceName) setLastUsedPrinter(opts.deviceName);
      return res;
    }
    // Plain browser: no silent print API exists — window.print() always
    // shows the browser's own dialog, which lists the OS's real printers.
    window.print();
    return { ok: true };
  } finally {
    document.body.classList.remove("qp-printing");
    if (prevAttr === null) target.removeAttribute("data-print-target");
  }
}

/** True one-click print: skips any dialog and sends straight to the given
 *  printer (or the last one used). Electron only — in the browser this
 *  behaves like printElement() since silent printing isn't available. */
export async function quickPrintElement(target: HTMLElement, deviceName?: string): Promise<{ ok: boolean; error?: string }> {
  const printer = deviceName || getLastUsedPrinter() || undefined;
  return printElement(target, { deviceName: printer, silent: isElectron() && !!printer });
}
