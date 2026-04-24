/**
 * ProcurBosse - D365/Power BI Design System v6.0
 * Microsoft Dynamics 365 ERP aesthetic - white cards, blue ribbon, Segoe UI
 * EL5 MediProcure - Embu Level 5 Hospital
 */

export const T = {
  // - Surfaces (light base, D365 style) -
  bg:        "#f3f5f8",   // page background (very light grey)
  bg1:       "#eef1f5",
  bg2:       "#e8ecf1",
  card:      "#ffffff",   // white cards
  cardHov:   "#f8f9fb",
  border:    "#dde1e7",
  borderHov: "#c5cad3",

  // - Text -
  fg:        "#1a1a2e",   // near-black
  fgMuted:   "#5a6475",
  fgDim:     "#8d96a3",

  // - D365 Brand blue -
  primary:    "#0078d4",  // Microsoft blue
  primaryHov: "#106ebe",
  primaryDark:"#005a9e",
  primaryBg:  "#e8f4fd",

  // - Accent / orange -
  accent:     "#d83b01",  // D365 orange-red
  accentHov:  "#b83200",
  accentBg:   "#fdf1ed",

  // - Status -
  success:    "#107c10",
  successBg:  "#dff6dd",
  warning:    "#d39a04",
  warningBg:  "#fff4ce",
  error:      "#a4262c",
  errorBg:    "#fde7e9",
  info:       "#0078d4",
  infoBg:     "#e8f4fd",

  // - Module ribbon colors (D365 palette) -
  procurement:"#0078d4",   // blue
  finance:    "#7719aa",   // purple
  inventory:  "#038387",   // teal
  quality:    "#498205",   // green
  system:     "#00188f",   // dark blue
  comms:      "#0072c6",   // lighter blue
  vouchers:   "#d83b01",   // orange
  hr:         "#b4009e",   // magenta
  reports:    "#5c2d91",   // deep purple

  // - Radius -
  r:    4,
  rMd:  6,
  rLg:  8,
  rXl:  12,

  // - Shadow -
  shadow:    "0 2px 8px rgba(0,0,0,0.08), 0 0 1px rgba(0,0,0,0.06)",
  shadowMd:  "0 4px 16px rgba(0,0,0,0.12), 0 0 1px rgba(0,0,0,0.08)",
  shadowLg:  "0 8px 32px rgba(0,0,0,0.16)",
} as const;

// - Component helpers -
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

import type React from "react";
