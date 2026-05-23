/**
 * useSystemSettings v6 — batch upsert, realtime broadcast, instant DOM apply
 * All 30+ settings saved in ONE Supabase upsert call.
 * Realtime subscription propagates to all open browser tabs instantly.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SystemSettings = Record<string, string>;

export const DEFAULTS: SystemSettings = {
  hospital_name:        "Embu Level 5 Hospital",
  system_name:          "EL5 MediProcure",
  hospital_address:     "Embu Town, Embu County, Kenya",
  hospital_email:       "info@embu.health.go.ke",
  hospital_phone:       "+254 060 000000",
  doc_footer:           "Embu Level 5 Hospital - Embu County Government",
  currency_symbol:      "KES",
  vat_rate:             "16",
  system_timezone:      "Africa/Nairobi",
  system_currency:      "KES",
  maintenance_mode:     "false",
  realtime_notifications:"true",
  enable_procurement:   "true",
  enable_financials:    "true",
  enable_quality:       "true",
  enable_scanner:       "true",
  enable_vouchers:      "true",
  enable_tenders:       "true",
  enable_contracts_module:"true",
  enable_documents:     "true",
  show_logo_print:      "true",
  show_watermark:       "false",
  show_stamp:           "true",
  print_confidential:   "false",
  printer_type:         "pdf",
  primary_color:        "#0a2558",
  accent_color:         "#C45911",
  nav_bg_color:         "#ffffff",
  nav_text_color:       "#1e293b",
  page_bg_color:        "#f8fafc",
  card_bg:              "#ffffff",
  text_primary:         "#1e293b",
  text_secondary:       "#64748b",
  border_color:         "#e2e8f0",
  success_color:        "#166534",
  warning_color:        "#92400e",
  danger_color:         "#dc2626",
  font_family:          "Segoe UI",
  font_size_base:       "22px",
  font_size_sm:         "18px",
  font_size_lg:         "22px",
  border_radius:        "8px",
  content_padding:      "16px",
  topbar_height:        "40px",
  nav_height:           "44px",
  show_logo_nav:        "true",
  show_kpi_tiles:       "true",
  compact_tables:       "false",
  show_status_chips:    "true",
  show_search_bar:      "true",
  print_font:           "Times New Roman",
  print_font_size:      "9",
  paper_size:           "A4",
  ip_restriction_enabled:"false",
  allow_all_private:    "true",
  log_all_ips:          "true",
};

/* ── Module-level cache shared across all hook instances ── */
let _cache: SystemSettings | null = null;
const _listeners = new Set<(s: SystemSettings) => void>();

function notify(s: SystemSettings) {
  _cache = s;
  _listeners.forEach(fn => fn(s));
}

/* ── Hook ── */
export function useSystemSettings() {
  const [settings, setSettings] = useState<SystemSettings>(_cache || DEFAULTS);
  const [loading,  setLoading]  = useState(!_cache);

  useEffect(() => {
    const handler = (s: SystemSettings) => setSettings(s);
    _listeners.add(handler);

    if (!_cache) {
      (supabase as any).from("system_settings").select("key,value").limit(500)
        .then(({ data }: any) => {
          const map: SystemSettings = { ...DEFAULTS };
          (data || []).forEach((r: any) => { if (r.key) map[r.key] = r.value ?? ""; });
          notify(map);
          applyThemeToDOM(map);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }

    /* Realtime — one channel per tab, removes itself on unmount */
    const channel = (supabase as any).channel("sys_settings_v6")
      .on("postgres_changes", { event: "*", schema: "public", table: "system_settings" },
        (payload: any) => {
          if (payload.new?.key) {
            const updated = { ...(_cache || DEFAULTS), [payload.new.key]: payload.new.value ?? "" };
            notify(updated);
            applyThemeToDOM(updated);
          }
        })
      .subscribe();

    return () => { _listeners.delete(handler); (supabase as any).removeChannel(channel); };
  }, []);

  const get  = useCallback((key: string, def = "") => settings[key] ?? DEFAULTS[key] ?? def, [settings]);
  const bool = useCallback((key: string, def = false) => {
    const v = settings[key] ?? DEFAULTS[key];
    return v !== undefined ? v === "true" : def;
  }, [settings]);
  const save = useCallback((key: string, value: string) => saveSetting(key, value), []);

  return { settings, loading, get, getSetting: get, bool, save };
}

/* ── Save ONE setting ── */
export async function saveSetting(key: string, value: string): Promise<void> {
  await (supabase as any).from("system_settings")
    .upsert({ key, value, category: "system" }, { onConflict: "key" });
  if (_cache) notify({ ..._cache, [key]: value });
}

/* ── Save MANY settings in one batch upsert ── */
export async function saveSettings(
  kvPairs: Record<string, string>,
  category = "theme"
): Promise<{ ok: boolean; error?: string }> {
  try {
    const rows = Object.entries(kvPairs).map(([key, value]) => ({ key, value, category }));
    const { error } = await (supabase as any)
      .from("system_settings")
      .upsert(rows, { onConflict: "key" });
    if (error) throw error;
    if (_cache) notify({ ..._cache, ...kvPairs });
    applyThemeToDOM({ ...(_cache || DEFAULTS), ...kvPairs });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

/* ── Apply settings to DOM as CSS vars + body classes ── */
export function applyThemeToDOM(settings: SystemSettings): void {
  if (typeof document === "undefined") return;
  try { localStorage.setItem("el5_theme_cache", JSON.stringify(settings)); } catch {}

  const root = document.documentElement;
  const css = (varName: string, key: string, fallback: string) => {
    const val = settings[key] || DEFAULTS[key] || fallback;
    if (val) root.style.setProperty(varName, val);
  };

  css("--color-primary",    "primary_color",   "#0a2558");
  css("--color-accent",     "accent_color",    "#C45911");
  css("--color-nav-bg",     "nav_bg_color",    "#ffffff");
  css("--color-nav-text",   "nav_text_color",  "#1e293b");
  css("--color-page-bg",    "page_bg_color",   "#f8fafc");
  css("--color-card-bg",    "card_bg",         "#ffffff");
  css("--color-text",       "text_primary",    "#1e293b");
  css("--color-text-muted", "text_secondary",  "#64748b");
  css("--color-border",     "border_color",    "#e2e8f0");
  css("--color-success",    "success_color",   "#166534");
  css("--color-warning",    "warning_color",   "#92400e");
  css("--color-danger",     "danger_color",    "#dc2626");
  css("--font-family",      "font_family",     "Segoe UI");
  css("--font-size-base",   "font_size_base",  "22px");
  css("--font-size-sm",     "font_size_sm",    "18px");
  css("--font-size-lg",     "font_size_lg",    "22px");
  css("--border-radius",    "border_radius",   "8px");
  css("--content-padding",  "content_padding", "16px");
  css("--topbar-height",    "topbar_height",   "40px");
  css("--nav-height",       "nav_height",      "44px");

  const printFont = settings["print_font"] || "Times New Roman";
  const printSize = settings["print_font_size"] || "9";
  root.style.setProperty("--print-font", printFont);
  root.style.setProperty("--print-font-size", printSize + "pt");

  const cls = (cond: boolean, name: string) =>
    cond ? document.body.classList.add(name) : document.body.classList.remove(name);

  cls(settings["compact_tables"]    === "true",  "compact-tables");
  cls(settings["show_logo_nav"]     === "false", "hide-logo-nav");
  cls(settings["show_search_bar"]   === "false", "hide-search-bar");
  cls(settings["show_kpi_tiles"]    === "false", "hide-kpi-tiles");
  cls(settings["show_status_chips"] === "false", "hide-status-chips");
}
