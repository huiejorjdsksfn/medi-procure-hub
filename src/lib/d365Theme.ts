/**
 * D365 Theme helpers  -- re-export from main theme with component shortcuts
 */
import { T } from "@/lib/theme";
export { T };
export const D = T;  // alias

// Input style
export const dInp = (extra?: Partial<React.CSSProperties>): React.CSSProperties => ({
  width:"100%", border:`1px solid ${T.border}`, borderRadius:T.r,
  padding:"7px 11px", fontSize:13, outline:"none",
  background:"#fff", color:T.fg, boxSizing:"border-box",
  ...extra,
});

// Button style
export const dBtn = (variant:"primary"|"secondary"|"danger"|"ghost"="primary"): React.CSSProperties => {
  const v = {
    primary:   {bg:T.primary,     fg:"#fff",     bd:T.primary},
    secondary: {bg:"#fff",        fg:T.primary,  bd:T.border},
    danger:    {bg:T.error,       fg:"#fff",     bd:T.error},
    ghost:     {bg:"transparent", fg:T.primary,  bd:"transparent"},
  }[variant];
  return { display:"inline-flex", alignItems:"center", gap:6, padding:"6px 14px",
    background:v.bg, color:v.fg, border:`1px solid ${v.bd}`,
    borderRadius:T.r, fontSize:13, fontWeight:600, cursor:"pointer", transition:"all .12s" };
};

// Table header cell
export const dTh: React.CSSProperties = {
  padding:"8px 14px", textAlign:"left", fontSize:10, fontWeight:700,
  color:T.fgDim, borderBottom:`1px solid ${T.border}`, background:T.bg,
  whiteSpace:"nowrap",
};

// Table data cell
export const dTd: React.CSSProperties = {
  padding:"9px 14px", fontSize:12, color:T.fg, borderBottom:`1px solid ${T.border}18`,
};

import type React from "react";
