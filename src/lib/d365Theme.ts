/**
 * D365 Theme helpers - re-export from main theme with component shortcuts
 */
import { T } from "@/lib/theme";
export { T };

// Extended alias with extra UI tokens used by some pages (UsersPage etc.)
export const D = {
  ...T,
  body:     T.bg,
  font:     "'Segoe UI','Inter',system-ui,sans-serif",
  fontMono: "'Cascadia Mono','SF Mono','Menlo',monospace",
  ribbon:   T.primary,
  ribbonDk: T.primaryDark,
} as const;

// Input style — usable as a value OR called with overrides
const _baseInp: React.CSSProperties = {
  width:"100%", border:`1px solid ${T.border}`, borderRadius:T.r,
  padding:"7px 11px", fontSize:13, outline:"none",
  background:"#fff", color:T.fg, boxSizing:"border-box",
};
export const dInp: React.CSSProperties & ((extra?: Partial<React.CSSProperties>) => React.CSSProperties) =
  Object.assign(
    (extra?: Partial<React.CSSProperties>) => ({ ..._baseInp, ...extra }),
    _baseInp,
  ) as any;

// Button style — callable as `dBtn("primary")` OR as `dBtn.primary()`
function _btn(variant:"primary"|"secondary"|"danger"|"ghost"="primary"): React.CSSProperties {
  const v = {
    primary:   {bg:T.primary,     fg:"#fff",     bd:T.primary},
    secondary: {bg:"#fff",        fg:T.primary,  bd:T.border},
    danger:    {bg:T.error,       fg:"#fff",     bd:T.error},
    ghost:     {bg:"transparent", fg:T.primary,  bd:"transparent"},
  }[variant];
  return { display:"inline-flex", alignItems:"center", gap:6, padding:"6px 14px",
    background:v.bg, color:v.fg, border:`1px solid ${v.bd}`,
    borderRadius:T.r, fontSize:13, fontWeight:600, cursor:"pointer", transition:"all .12s" };
}
export const dBtn = Object.assign(_btn, {
  primary:   () => _btn("primary"),
  secondary: () => _btn("secondary"),
  danger:    () => _btn("danger"),
  ghost:     () => _btn("ghost"),
}) as ((variant?:"primary"|"secondary"|"danger"|"ghost") => React.CSSProperties) & {
  primary:   () => React.CSSProperties;
  secondary: () => React.CSSProperties;
  danger:    () => React.CSSProperties;
  ghost:     () => React.CSSProperties;
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
