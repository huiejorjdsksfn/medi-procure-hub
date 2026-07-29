import { useState, useEffect, useCallback, useRef } from "react";
import { detectPrinters, isElectron, getLastUsedPrinter, type DetectedPrinter } from "@/lib/quickPrint";

/**
 * Printer Auto-Detector Bot — polls the OS's printer list (Electron desktop
 * app only) so the UI always reflects what's actually plugged in / on the
 * network right now, without the person having to do anything. Re-checks
 * whenever the window regains focus (someone plugging in a USB printer and
 * tabbing back is the realistic moment a new printer shows up) plus every
 * 60s as a backstop.
 *
 * In the plain browser build this always returns an empty list — there is
 * no web API that can see a person's local printers — `available` is false
 * so callers know to fall back to the browser's own print dialog instead
 * of rendering an empty/misleading picker.
 */
export function usePrinterBot() {
  const [printers, setPrinters] = useState<DetectedPrinter[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    if (!isElectron()) return;
    setLoading(true);
    const list = await detectPrinters();
    if (mounted.current) {
      setPrinters(list);
      setLastChecked(new Date());
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    refresh();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    const interval = setInterval(refresh, 60_000);
    return () => {
      mounted.current = false;
      window.removeEventListener("focus", onFocus);
      clearInterval(interval);
    };
  }, [refresh]);

  const lastUsedName = getLastUsedPrinter();
  const defaultPrinter =
    printers.find(p => p.name === lastUsedName) ||
    printers.find(p => p.isDefault) ||
    printers[0] ||
    null;

  return {
    available: isElectron(),
    printers,
    defaultPrinter,
    loading,
    lastChecked,
    refresh,
  };
}
