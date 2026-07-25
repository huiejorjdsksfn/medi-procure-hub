import type React from "react";
import { T } from "@/lib/theme";

/**
 * EL5 MediProcure — Classic ERP Design System
 *
 * v2 — synced to the central theme. This used to be a fully static
 * palette (literal hex strings), completely disconnected from the
 * GUI Editor / `system_settings` table: changing the brand colour there
 * had zero effect on any page using ERP.*. Every property below is now
 * a getter that derives from `T` (which itself reads live CSS custom
 * properties set by applyThemeToDOM()), so this file — and every page
 * that imports it — stays in sync with the rest of the system.
 *
 * The exported shape (property names, erpStyles helpers) is unchanged
 * on purpose: MobileTable, QualityDashboardPage, PaymentVouchersPage,
 * JournalVouchersPage, ReceiptVouchersPage, and BudgetsPage all consume
 * ERP.* and erpStyles.* directly and needed no changes.
 */
export const ERP = {
  get titleBar()          { return `linear-gradient(180deg, ${T.primary} 0%, ${T.primaryDark} 100%)`; },
  get titleBarBorder()    { return T.primaryDark; },
  titleText:          "#ffffff",
  get toolbar()           { return `linear-gradient(180deg, ${T.card} 0%, ${T.bg2} 100%)`; },
  get toolbarBorder()     { return T.border; },
  get statBg()            { return T.card; },
  get statBorder()        { return T.border; },
  get statValue()         { return T.fg; },
  get statLabel()         { return T.fgMuted; },
  get statIcon()          { return T.accent; },
  get sidebarBg()         { return T.bg; },
  get sidebarBorder()     { return T.border; },
  get sidebarHeader()     { return `linear-gradient(180deg, ${T.primary}, ${T.primaryDark})`; },
  sidebarHeaderText:  "#ffffff",
  get sidebarItem()       { return T.fg; },
  get sidebarHover()      { return T.primaryBg; },
  get sidebarActive()     { return T.primary + "33"; },
  get gridHeader()        { return `linear-gradient(180deg, ${T.bg2}, ${T.border})`; },
  get gridHeaderText()    { return T.fg; },
  get gridHeaderBorder()  { return T.border; },
  get gridRow()           { return T.card; },
  get gridRowAlt()        { return T.bg; },
  get gridRowHover()      { return T.primaryBg; },
  get gridBorder()        { return T.border; },
  get gridText()          { return T.fg; },
  get gridTextMuted()     { return T.fgMuted; },
  get btnPrimary()        { return `linear-gradient(180deg, ${T.primaryHov}, ${T.primaryDark})`; },
  get btnPrimaryBorder()  { return T.primaryDark; },
  btnPrimaryText:     "#ffffff",
  get btnSecondary()      { return `linear-gradient(180deg, ${T.card}, ${T.bg2})`; },
  get btnSecondaryBorder(){ return T.border; },
  get btnSecondaryText()  { return T.fg; },
  get tabActive()         { return `linear-gradient(180deg, ${T.primaryHov}, ${T.primaryDark})`; },
  get tabActiveBorder()   { return T.primaryDark; },
  tabActiveText:      "#ffffff",
  get tabInactive()       { return `linear-gradient(180deg, ${T.card}, ${T.bg2})`; },
  get tabInactiveBorder() { return T.border; },
  get tabInactiveText()   { return T.fg; },
  get contentBg()         { return T.bg; },
  get cardBg()            { return T.card; },
  get cardBorder()        { return T.border; },
  // Typography stays fixed to the "classic ERP" look on purpose — this is
  // the signature grid/toolbar aesthetic these pages are going for, not a
  // theme-sync concern the way colour is.
  fontFamily: "'Segoe UI', 'Tahoma', 'Arial', sans-serif",
  fontSize: "12px",
};

export const erpStyles = {
  get toolbar(): React.CSSProperties {
    return {
      background: ERP.toolbar,
      borderBottom: `1px solid ${ERP.toolbarBorder}`,
      padding: "4px 8px",
      display: "flex",
      alignItems: "center",
      gap: 6,
      fontFamily: ERP.fontFamily,
      fontSize: "12px",
    };
  },

  btn: (primary = false): React.CSSProperties => ({
    padding: "3px 12px",
    background: primary ? ERP.btnPrimary : ERP.btnSecondary,
    border: `1px solid ${primary ? ERP.btnPrimaryBorder : ERP.btnSecondaryBorder}`,
    borderRadius: 2,
    color: primary ? ERP.btnPrimaryText : ERP.btnSecondaryText,
    fontSize: "12px",
    fontFamily: ERP.fontFamily,
    cursor: "pointer",
    fontWeight: 600,
    whiteSpace: "nowrap" as const,
    display: "inline-flex" as const,
    alignItems: "center",
    gap: 4,
  }),

  statusChip: (status: string): React.CSSProperties => {
    // Semantic status -> central theme colour, instead of a hardcoded
    // literal per status. Same status->bucket mapping as before, just
    // pointed at T so it moves with the rest of the system's palette.
    const colors: Record<string, string> = {
      paid: T.success, approved: T.success, matched: T.success, active: T.success,
      pass: T.success, passed: T.success, allow: T.success, completed: T.success,
      resolved: T.success, low: T.success,
      pending: T.warning, monitor: T.warning, warning: T.warning, open: T.warning,
      high: T.warning,
      rejected: T.error, cancelled: T.error, failed: T.error, blocked: T.error,
      block: T.error, fail: T.error, over_budget: T.error, critical: T.error,
      delete: T.error,
      draft: T.fgDim, inactive: T.fgDim, ended: T.fgDim, logout: T.fgDim, view: T.fgDim,
      sent: T.primary, processing: T.primary, in_progress: T.primary, medium: T.primary,
      login: T.primary, create: T.primary, update: T.warning,
    };
    const c = colors[status?.toLowerCase()] || T.fgDim;
    return {
      display: "inline-block",
      padding: "1px 7px",
      borderRadius: 10,
      fontSize: 10,
      fontWeight: 700,
      background: `${c}18`,
      color: c,
      border: `1px solid ${c}44`,
      textTransform: "uppercase" as const,
      letterSpacing: "0.04em",
      fontFamily: ERP.fontFamily,
    };
  },

  get gridTh(): React.CSSProperties {
    return {
      background: ERP.gridHeader,
      borderBottom: `2px solid ${ERP.gridHeaderBorder}`,
      borderRight: `1px solid ${ERP.gridBorder}`,
      padding: "5px 8px",
      fontSize: "11px",
      fontWeight: 700,
      color: ERP.gridHeaderText,
      fontFamily: ERP.fontFamily,
      textAlign: "left" as const,
      whiteSpace: "nowrap" as const,
      userSelect: "none" as const,
    };
  },

  get gridTd(): React.CSSProperties {
    return {
      borderBottom: `1px solid ${ERP.gridBorder}`,
      borderRight: `1px solid ${ERP.gridBorder}`,
      padding: "4px 8px",
      fontSize: "12px",
      color: ERP.gridText,
      fontFamily: ERP.fontFamily,
      verticalAlign: "middle" as const,
    };
  },

  get inp(): React.CSSProperties {
    return {
      padding: "3px 6px",
      border: `1px solid ${ERP.gridBorder}`,
      borderRadius: 1,
      fontSize: "12px",
      fontFamily: "'Segoe UI','Tahoma',sans-serif",
      outline: "none",
      background: ERP.cardBg,
      color: ERP.gridText,
    };
  },
};
