/**
 * useSystemSettings - Real-time Supabase system_settings hook
 * Any component using this will auto-update the moment admin saves a setting.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SystemSettings = Record<string, string>;

const DEFAULTS: SystemSettings = {
  hospital_name:       "Embu Level 5 Hospital",
  system_name:         "EL5 MediProcure",
  hospital_address:    "Embu Town, Embu County, Kenya",
  hospital_email:      "info@embu.health.go.ke",
  hospital_phone:      "+254 060 000000",
  primary_color:       "#1a3a6b",
  accent_color:        "#C45911",
  doc_footer:          "Embu Level 5 Hospital - Embu County Government",
  currency_symbol:     "KES",
  vat_rate:            "16",
  maintenance_mode:    "false",
  realtime_notifications: "true",
  enable_procurement:  "true",
  enable_financials:   "true",
  enable_quality:      "true",
  enable_scanner:      "true",
  enable_vouchers:     "true",
  enable_tenders:      "true",
  enable_contracts_module: "true",
  enable_documents:    "true",
  show_logo_print:     "true",
  show_watermark:      "false",
  show_stamp:          "true",
  print_font:          "Times New Roman",
  print_font_size:     "11",
  paper_size:          "A4",
};

let _cache: SystemSettings | null = null;
const _listeners = new Set<(s: SystemSettings) => void>();

function notify(s: SystemSettings) {
  _cache = s;
  _listeners.forEach(fn => fn(s));
}

export function useSystemSettings() {
  const [settings, setSettings] = useState<SystemSettings>(_cache || DEFAULTS);
  const [loading, setLoading] = useState(!_cache);

  useEffect(() => {
    const handler = (s: SystemSettings) => setSettings(s);
    _listeners.add(handler);

    if (!_cache) {
      (supabase as any)
        .from("system_settings")
        .select("key,value")
        .limit(500)
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

    // Real-time subscription - one shared channel
    const channel = (supabase as any)
      .channel("sys_settings_rt")
      .on("postgres_changes", {
        event: "*", schema: "public", table: "system_settings",
      }, (payload: any) => {
        if (payload.new?.key) {
          const updated = { ...(_cache || DEFAULTS), [payload.new.key]: payload.new.value ?? "" };
          notify(updated);
          applyThemeToDOM(updated);
        }
      })
      .subscribe();

    return () => {
      _listeners.delete(handler);
      (supabase as any).removeChannel(channel);
    };
  }, []);

  const get  = useCallback((key: string, def = "") => settings[key] ?? DEFAULTS[key] ?? def, [settings]);
  const bool = useCallback((key: string, def = false) => {
    const v = settings[key] ?? DEFAULTS[key];
    return v !== undefined ? v === "true" : def;
  }, [settings]);

  return { settings, loading, get, getSetting: get, bool };
}

/**
 * Save one or more settings to Supabase.
 * Returns { ok, error }
 */
export async function saveSettings(kvPairs: Record<string, string>, category = "general"): Promise<{ ok: boolean; error?: string }> {
  try {
    for (const [key, value] of Object.entries(kvPairs)) {
      const { data: ex } = await (supabase as any)
        .from("system_settings").select("id").eq("key", key).maybeSingle();
      if (ex?.id) {
        await (supabase as any).from("system_settings").update({ value, updated_at: new Date().toISOString() }).eq("key", key);
      } else {
        await (supabase as any).from("system_settings").insert({ key, value, category });
      }
    }
    // Optimistically update cache
    if (_cache) {
      notify({ ..._cache, ...kvPairs });
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

/**
 * Apply theme settings from system_settings to CSS custom properties on :root
 * Called whenever settings change so the whole app updates in real-time
 */
export function applyThemeToDOM(settings: SystemSettings): void {
  if (typeof document === "undefined") return;
  // Persist theme to localStorage so index.html can restore CSS vars instantly on next load
  try {
    localStorage.setItem("el5_theme_cache", JSON.stringify(settings));
  } catch {}
  const root = document.documentElement;
  const apply = (varName: string, key: string, fallback: string) => {
    const val = settings[key] || DEFAULTS[key] || fallback;
    if (val) root.style.setProperty(varName, val);
  };
  apply("--color-primary",       "primary_color",   "#0a2558");
  apply("--color-accent",        "accent_color",    "#C45911");
  apply("--color-nav-bg",        "nav_bg_color",    "#ffffff");
  apply("--color-nav-text",      "nav_text_color",  "#1e293b");
  apply("--color-page-bg",       "page_bg_color",   "#f8fafc");
  apply("--color-card-bg",       "card_bg",         "#ffffff");
  apply("--color-text",          "text_primary",    "#1e293b");
  apply("--color-text-muted",    "text_secondary",  "#64748b");
  apply("--color-border",        "border_color",    "#e2e8f0");
  apply("--color-success",       "success_color",   "#166534");
  apply("--color-warning",       "warning_color",   "#92400e");
  apply("--color-danger",        "danger_color",    "#dc2626");
  apply("--font-family",         "font_family",     "Segoe UI");
  apply("--font-size-base",      "font_size_base",  "13px");
  apply("--font-size-sm",        "font_size_sm",    "11px");
  apply("--font-size-lg",        "font_size_lg",    "15px");
  apply("--border-radius",       "border_radius",   "8px");
  apply("--content-padding",     "content_padding", "16px");
  apply("--topbar-height",       "topbar_height",   "44px");
  apply("--nav-height",          "nav_height",      "44px");

  // Print font as CSS variable
  const printFont = settings["print_font"] || "Times New Roman";
  const printSize = settings["print_font_size"] || "11";
  root.style.setProperty("--print-font", printFont);
  root.style.setProperty("--print-font-size", printSize + "pt");

  // Compact tables mode as body class
  if (settings["compact_tables"] === "true") {
    document.body.classList.add("compact-tables");
  } else {
    document.body.classList.remove("compact-tables");
  }
}
