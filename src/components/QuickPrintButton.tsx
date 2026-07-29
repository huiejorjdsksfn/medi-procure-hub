/**
 * ProcurBosse — Quick Print Button v2.0
 * Replaces the old PrintButton (which only ever called raw window.print()
 * on whatever was on screen — nav, modal backdrops, shadows and all).
 *
 * - Printer Auto-Detector Bot: in the Electron desktop app, polls real OS
 *   printers and shows them in a dropdown.
 * - Quick Print: one click sends straight to the last-used/default printer,
 *   no dialog.
 * - Print isolates only the given content (via printElement) so what comes
 *   out is a clean, well-organized document instead of a screenshot.
 * - Falls back to the browser's own print dialog (still lists every OS
 *   printer) when not running in the desktop app.
 */
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Printer, Loader2, ChevronDown, Check, Zap, Monitor } from "lucide-react";
import { T } from "@/lib/theme";
import { printElement, quickPrintElement } from "@/lib/quickPrint";
import { usePrinterBot } from "@/hooks/usePrinterBot";

interface QuickPrintButtonProps {
  targetRef: React.RefObject<HTMLElement>;
  page: string;
  entityType?: string;
  entityId?: string;
  label?: string;
  style?: React.CSSProperties;
}

export function QuickPrintButton({ targetRef, page, entityType, entityId, label = "Print", style }: QuickPrintButtonProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { available: printerBotAvailable, printers, defaultPrinter, loading: detecting } = usePrinterBot();
  const db = supabase as any;

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  const logPrint = async () => {
    try {
      await db.from("print_log").insert({
        page, entity_type: entityType || null, entity_id: entityId || null,
        printed_by: user?.id, created_at: new Date().toISOString(),
      });
    } catch { /* logging failure shouldn't block printing */ }
  };

  const doPrint = async (deviceName?: string) => {
    if (!targetRef.current) return;
    setLoading(true);
    setMenuOpen(false);
    await logPrint();
    const res = await printElement(targetRef.current, deviceName ? { deviceName, silent:false } : undefined);
    if (!res.ok) console.error("[QuickPrint] failed:", res.error);
    setLoading(false);
  };

  const doQuickPrint = async () => {
    if (!targetRef.current) return;
    setLoading(true);
    setMenuOpen(false);
    await logPrint();
    const res = await quickPrintElement(targetRef.current, defaultPrinter?.name);
    if (!res.ok) console.error("[QuickPrint] failed:", res.error);
    setLoading(false);
  };

  const btnStyle: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "6px 14px", background: "#fff", color: T.fgMuted,
    border: `1px solid ${T.border}`, borderRadius: T.r,
    fontSize: 12, fontWeight: 600, cursor: "pointer",
    fontFamily: "'Segoe UI','Inter',system-ui,sans-serif",
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "inline-flex", ...style }}>
      <button
        onClick={() => (printerBotAvailable ? doQuickPrint() : doPrint())}
        disabled={loading}
        title={printerBotAvailable && defaultPrinter ? `Quick print to ${defaultPrinter.displayName}` : "Print"}
        style={{ ...btnStyle, borderTopRightRadius: printerBotAvailable ? 0 : T.r, borderBottomRightRadius: printerBotAvailable ? 0 : T.r, borderRight: printerBotAvailable ? "none" : undefined }}
        onMouseEnter={e => { (e.currentTarget as any).style.background = T.bg; }}
        onMouseLeave={e => { (e.currentTarget as any).style.background = "#fff"; }}
      >
        {loading ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : printerBotAvailable ? <Zap size={13} /> : <Printer size={13} />}
        {label}
      </button>

      {printerBotAvailable && (
        <button
          onClick={() => setMenuOpen(o => !o)}
          disabled={loading}
          title="Choose printer"
          style={{ ...btnStyle, padding: "6px 8px", borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
          onMouseEnter={e => { (e.currentTarget as any).style.background = T.bg; }}
          onMouseLeave={e => { (e.currentTarget as any).style.background = "#fff"; }}
        >
          <ChevronDown size={12} />
        </button>
      )}

      {menuOpen && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 200,
          background: "#fff", border: `1px solid ${T.border}`, borderRadius: T.rMd,
          boxShadow: "0 8px 24px rgba(16,24,40,.14)", minWidth: 220, overflow: "hidden",
        }}>
          <div style={{ padding: "7px 12px", fontSize: 10, fontWeight: 700, color: T.fgDim, textTransform: "uppercase", letterSpacing: ".04em", borderBottom: `1px solid ${T.border}`, background: T.bg, display:"flex", alignItems:"center", gap:6 }}>
            <Monitor size={11} /> {detecting ? "Detecting printers…" : `${printers.length} printer${printers.length===1?"":"s"} found`}
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {printers.length === 0 && !detecting && (
              <div style={{ padding: "10px 12px", fontSize: 11.5, color: T.fgMuted }}>No printers detected.</div>
            )}
            {printers.map(p => (
              <div key={p.name} onClick={() => doPrint(p.name)}
                style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 12px", fontSize: 12, cursor: "pointer", color: T.fg }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = T.bg)}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
              >
                {defaultPrinter?.name === p.name ? <Check size={12} color={T.primary} /> : <span style={{ width: 12 }} />}
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.displayName}</span>
                {p.isDefault && <span style={{ fontSize: 9, color: T.fgDim, fontWeight: 700 }}>DEFAULT</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
