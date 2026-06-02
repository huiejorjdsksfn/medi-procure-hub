/**
 * ProcurBosse - D365/Power BI Design System v6.1 — Live CSS-variable edition
 * All colour values read from CSS custom properties so the GUI Editor takes
 * effect instantly across every page without a reload.
 * EL5 MediProcure - Embu Level 5 Hospital
 */
import React from "react";

/** Read a CSS variable from :root; fall back to `fallback` if not set. */
function cssVar(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/**
 * T — live theme object.
 * Every colour property is a getter so it re-reads the CSS variable on
 * every access, meaning any change applyThemeToDOM() makes is instantly
 * visible on the next render cycle.
 */
export const T = {
  // - Surfaces -
  get bg()        { return cssVar("--color-page-bg",  "#f3f5f8"); },
  bg1:       "#eef1f5",
  bg2:       "#e8ecf1",
  get card()      { return cssVar("--color-card-bg",  "#ffffff"); },
  cardHov:   "#f8f9fb",
  get border()    { return cssVar("--color-border",   "#dde1e7"); },
  borderHov: "#c5cad3",

  // - Text -
  get fg()        { return cssVar("--color-text",      "#1a1a2e"); },
  get fgMuted()   { return cssVar("--color-text-muted","#5a6475"); },
  fgDim:     "#8d96a3",

  // - Primary brand -
  get primary()    { return cssVar("--color-primary",  "#0078d4"); },
  get primaryHov() { return cssVar("--color-primary",  "#106ebe"); },
  primaryDark: "#005a9e",
  get primaryBg()  {
    const c = cssVar("--color-primary","#0078d4");
    return c + "18";  // 10% opacity tint
  },

  // - Accent -
  get accent()    { return cssVar("--color-accent",   "#d83b01"); },
  accentHov:  "#b83200",
  get accentBg()  {
    const c = cssVar("--color-accent","#d83b01");
    return c + "18";
  },

  // - Status -
  get success()   { return cssVar("--color-success",  "#107c10"); },
  successBg:  "#dff6dd",
  get warning()   { return cssVar("--color-warning",  "#d39a04"); },
  warningBg:  "#fff4ce",
  get error()     { return cssVar("--color-danger",   "#a4262c"); },
  errorBg:    "#fde7e9",
  get info()      { return cssVar("--color-primary",  "#0078d4"); },
  get infoBg()    { return cssVar("--color-primary",  "#0078d4") + "18"; },

  // - Module ribbon colors (keep as fixed palette; not user-configurable) -
  procurement:"#0078d4",
  finance:    "#7719aa",
  inventory:  "#038387",
  quality:    "#498205",
  system:     "#00188f",
  comms:      "#0072c6",
  vouchers:   "#d83b01",
  hr:         "#b4009e",
  reports:    "#5c2d91",

  // - Radius (fixed) -
  r:    4,
  rMd:  6,
  rLg:  8,
  rXl:  12,

  // - Shadow -
  shadow:    "0 2px 8px rgba(0,0,0,0.08), 0 0 1px rgba(0,0,0,0.06)",
  shadowMd:  "0 4px 16px rgba(0,0,0,0.12), 0 0 1px rgba(0,0,0,0.08)",
  shadowLg:  "0 8px 32px rgba(0,0,0,0.16)",
};

// - Component helpers -

/**
 * statusBadge — returns inline style for a coloured status chip.
 * Uses live CSS-variable getters from T so GUI Editor colour changes
 * are reflected on the next render without a page reload.
 */
export const statusBadge = (status: string): React.CSSProperties => {
  const map: Record<string,[string,string]> = {
    active:    [T.success, T.successBg],
    approved:  [T.success, T.successBg],
    completed: [T.success, T.successBg],
    paid:      [T.success, T.successBg],
    sent:      [T.success, T.successBg],
    pending:   [T.warning, T.warningBg],
    draft:     [T.fgDim,   "#f0f1f3"],
    submitted: [T.info,    T.infoBg],
    open:      [T.primary, T.primaryBg],
    rejected:  [T.error,   T.errorBg],
    cancelled: [T.error,   T.errorBg],
    failed:    [T.error,   T.errorBg],
    blocked:   [T.error,   T.errorBg],
    low:       [T.warning, T.warningBg],
    critical:  [T.error,   T.errorBg],
  };
  const [color,bg] = map[status?.toLowerCase()] || [T.fgDim, "#f0f1f3"];
  return { display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px",
    borderRadius:T.r, fontSize:11, fontWeight:600, color, background:bg };
};

/**
 * StatusChip — a React element wrapper for statusBadge that automatically
 * carries the "status-chip" CSS class, allowing the GUI Editor's
 * "Coloured Status Badges" toggle to hide/neutralise chips app-wide.
 */
export function StatusChip({ status, label }: { status: string; label?: string }) {
  return React.createElement(
    "span",
    { className: "status-chip", style: statusBadge(status) },
    label ?? status
  );
}

// D365-style card
export const d365Card = (extra = ""): React.CSSProperties => ({
  background: T.card, borderRadius: T.rLg, boxShadow: T.shadow,
  border: `1px solid ${T.border}`, overflow:"hidden",
});

// D365-style button
export const d365Btn = (variant: "primary"|"secondary"|"danger"|"ghost" = "primary", disabled = false): React.CSSProperties => {
  const variants = {
    primary:   { bg: T.primary,     color:"#fff",    border:T.primary },
    secondary: { bg: "#fff",        color:T.primary, border:T.border  },
    danger:    { bg: T.error,       color:"#fff",    border:T.error   },
    ghost:     { bg: "transparent", color:T.primary, border:"transparent" },
  };
  const v = variants[variant];
  return {
    display:"inline-flex", alignItems:"center", gap:6,
    padding:"6px 14px", borderRadius:T.r, fontSize:13, fontWeight:600,
    background: disabled ? T.bg2 : v.bg,
    color:      disabled ? T.fgDim : v.color,
    border:     `1px solid ${disabled ? T.border : v.border}`,
    cursor:     disabled ? "not-allowed" : "pointer",
    transition: "all .12s",
  };
};

import React from "react";
