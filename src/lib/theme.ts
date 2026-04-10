/**
 * ProcurBosse — Global Design Tokens v5.9
 * Unified dark-navy ERP theme used across all pages
 */

export const T = {
  // Surfaces
  bg:       "#0a1628",
  bg1:      "#0f1e35",
  bg2:      "#111f38",
  card:     "#132040",
  cardHov:  "#1a2a50",
  border:   "#1e3058",
  borderHov:"#2a4070",

  // Text
  fg:       "#e8f0fe",
  fgMuted:  "#7ea8d8",
  fgDim:    "#3d5a80",

  // Brand
  primary:  "#1b5fcc",
  primaryHov:"#2468db",
  accent:   "#f5a623",
  accentHov:"#f7b84e",

  // Status
  success:  "#10b981",
  warning:  "#f59e0b",
  error:    "#ef4444",
  info:     "#38bdf8",

  // Status backgrounds
  successBg:"rgba(16,185,129,.12)",
  warningBg:"rgba(245,158,11,.12)",
  errorBg:  "rgba(239,68,68,.12)",
  infoBg:   "rgba(56,189,248,.12)",

  // Module colors
  procurement: "#1b5fcc",
  finance:     "#7c3aed",
  inventory:   "#059669",
  quality:     "#d97706",
  system:      "#475569",
  comms:       "#0891b2",
  vouchers:    "#c45911",
  hr:          "#be185d",

  // Radius
  r:   8,
  rLg: 12,
  rXl: 16,

  // Shadow
  shadow:    "0 4px 24px rgba(0,0,0,.4)",
  shadowSm:  "0 2px 8px rgba(0,0,0,.3)",
  shadowLg:  "0 8px 48px rgba(0,0,0,.6)",
} as const;

// CSS string helpers
export const card = (extra = "") =>
  `background:${T.card};border:1px solid ${T.border};border-radius:${T.rLg}px;${extra}`;

export const btn = (color = T.primary) =>
  `background:${color};color:#fff;border:none;border-radius:${T.r}px;padding:8px 16px;font-weight:700;font-size:13px;cursor:pointer;display:inline-flex;align-items:center;gap:7px;transition:filter .15s;`;

export const statusBadge = (status: string): React.CSSProperties => {
  const map: Record<string, [string, string]> = {
    active:    [T.success, T.successBg],
    approved:  [T.success, T.successBg],
    completed: [T.success, T.successBg],
    paid:      [T.success, T.successBg],
    pending:   [T.warning, T.warningBg],
    draft:     [T.fgMuted, "rgba(126,168,216,.12)"],
    submitted: [T.info,    T.infoBg],
    rejected:  [T.error,   T.errorBg],
    cancelled: [T.error,   T.errorBg],
    low:       [T.warning, T.warningBg],
    critical:  [T.error,   T.errorBg],
  };
  const [color, bg] = map[status?.toLowerCase()] || [T.fgMuted, "rgba(126,168,216,.1)"];
  return {
    display:"inline-flex", alignItems:"center", gap:5,
    padding:"3px 10px", borderRadius:999,
    fontSize:11, fontWeight:700,
    color, background: bg,
    border:`1px solid ${color}33`,
  };
};

// Import guard
import type React from "react";
