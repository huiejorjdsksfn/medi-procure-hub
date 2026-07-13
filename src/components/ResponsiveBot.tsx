/**
 * EL5 MediProcure — ResponsiveBot v4.0 (Portrait-First, Auto-Fit)
 * Wires every ERP page, table, modal, form, grid to fully fit
 * every phone size (320–430px, incl. sub-360px "xs" devices),
 * tablets (768–1023px), and phone/tablet landscape orientations.
 *
 * KEY FEATURES:
 *  1. CSS injection per breakpoint (xs / phone / tablet / laptop / desktop)
 *  2. Auto card-view for ALL <table> elements on phone portrait
 *     – Reads thead th labels → adds data-label to every td
 *     – Adds .m-card class for CSS-driven card layout
 *  3. Fixes overflow:hidden parents that block table scroll
 *  4. DOM-patches large minWidth dialogs and XP windows
 *  5. JS-computed grid auto-fit: reads *computed* grid-template-columns
 *     (not just inline-style string matches) so grids built via
 *     Tailwind classes, CSS files, or arbitrary column counts still
 *     collapse to a device-appropriate auto-fit layout
 *  6. Landscape-orientation handling for short phone/tablet viewports
 *  7. Overflow-guard sweep: catches any page-level container whose
 *     content still overflows the viewport after the CSS pass and
 *     forces it back into bounds
 *  8. ResizeObserver + MutationObserver for dynamic content
 */

import { useEffect, useRef, useCallback } from "react";

const BP = { xs: 380, phone: 767, tablet: 1023, laptop: 1439 };
const LANDSCAPE_SHORT_H = 480; // phones/small tablets rotated to landscape

function device(w: number) {
  if (w <= BP.xs)     return "xs";
  if (w <= BP.phone)  return "phone";
  if (w <= BP.tablet) return "tablet";
  if (w <= BP.laptop) return "laptop";
  return "desktop";
}

// ── CSS for each breakpoint ────────────────────────────────────────────────
const BASE_CSS = `
/* ─── RESET & BASE ─── */
*,*::before,*::after{box-sizing:border-box!important}
body{overflow-x:hidden!important}
img{max-width:100%!important;height:auto!important}
button{cursor:pointer!important}

/* ─── SCROLLABLE CONTAINERS ─── */
div[style*="overflow: auto"],div[style*="overflow:auto"],
div[style*="overflow-x: auto"],div[style*="overflow-x:auto"]{
  -webkit-overflow-scrolling:touch!important;
  overscroll-behavior-x:contain!important;
}

/* ─── PARENTS OF TABLES: override overflow:hidden ─── */
div:has(>table),div:has(>div>table){
  overflow-x:auto!important;
  -webkit-overflow-scrolling:touch!important;
}

/* ─── ALL TABLES: base scroll ─── */
table{max-width:100%!important;-webkit-overflow-scrolling:touch!important}

/* ─── LONG-STRING SAFETY NET: no unbreakable text can force overflow ─── */
.app-page-content,.app-page-content *{overflow-wrap:break-word!important}
.app-page-content{max-width:100vw!important}
`;

const PHONE_CSS = `
/* ═══ PHONE ≤767px (portrait-first) ═══════════════════════════ */
:root{
  --font-size-base:13px!important;
  --font-size-sm:12px!important;
  --font-size-lg:14px!important;
  --content-padding:8px!important;
}

/* ─── KPI TILES: 5-col → 2-col ─── */
.kpi-tiles-row,
[style*="grid-template-columns:repeat(5,1fr)"],
[style*="grid-template-columns: repeat(5, 1fr)"],
[style*="grid-template-columns:repeat(5, 1fr)"]{
  grid-template-columns:repeat(2,1fr)!important;
}
[style*="grid-template-columns:repeat(4"],
[style*="grid-template-columns: repeat(4"]{
  grid-template-columns:repeat(2,1fr)!important;
}
[style*="grid-template-columns:repeat(6"],
[style*="grid-template-columns: repeat(6"],
[style*="grid-template-columns:repeat(7"],
[style*="grid-template-columns: repeat(7"],
[style*="grid-template-columns:repeat(8"],
[style*="grid-template-columns: repeat(8"]{
  grid-template-columns:repeat(2,1fr)!important;
}
[style*="grid-template-columns:repeat(3"],
[style*="grid-template-columns: repeat(3"]{
  grid-template-columns:1fr 1fr!important;
}
[style*="grid-template-columns:repeat(2"],
[style*="grid-template-columns: repeat(2"],
[style*='gridTemplateColumns:"1fr 1fr"']{
  grid-template-columns:1fr!important;
}
[style*="minmax(175px"],[style*="minmax(180px"],
[style*="minmax(200px"],[style*="minmax(220px"],
[style*="minmax(240px"],[style*="minmax(250px"],
[style*="minmax(260px"],[style*="minmax(280px"]{
  grid-template-columns:repeat(auto-fill,minmax(140px,1fr))!important;
}

/* ─── FLEX WRAP ─── */
[style*="display: flex"][style*="gap"],
[style*="display:flex"][style*="gap"]{flex-wrap:wrap!important}
[style*="flex-wrap: nowrap"],[style*='flexWrap:"nowrap"']{flex-wrap:nowrap!important}

/* ─── TOUCH TARGETS ─── */
button,[role="button"]{min-height:40px!important;min-width:36px!important}
input,select,textarea{
  min-height:40px!important;
  font-size:16px!important; /* prevents iOS zoom */
  max-width:100%!important;
}
select{width:100%!important}
input[type="date"]{min-width:0!important;width:100%!important}

/* ─── MODALS ─── */
[style*="position: fixed"][style*="width: 3"],
[style*="position: fixed"][style*="width: 4"],
[style*="position: fixed"][style*="width: 5"],
[style*="position: fixed"][style*="width: 6"],
[style*="position: fixed"][style*="width: 7"],
[style*="position: fixed"][style*="width: 8"]{
  width:95vw!important;max-width:95vw!important;min-width:0!important;
}
[style*="minWidth: 56"],[style*="minWidth: 60"],[style*="minWidth: 64"],
[style*="minWidth: 70"],[style*="minWidth: 80"],[style*="minWidth: 90"],
[style*="minWidth:56"],[style*="minWidth:60"],[style*="minWidth:64"]{
  min-width:95vw!important;max-width:95vw!important;
}
[style*="position: fixed"][style*="inset: 0"],
[style*="position: fixed"][style*="inset:0"]{overflow-y:auto!important}

/* ─── PAGE PADDING ─── */
div[style*="padding: 20px"],div[style*="padding:20px"],
div[style*="padding: 24px"],div[style*="padding:24px"]{padding:10px 8px!important}
div[style*="padding: 16px"],div[style*="padding:16px"]{padding:8px 6px!important}

/* ─── TABLE: auto mobile card view (theme-aware) ─── */
table.m-card{
  display:block!important;
  width:100%!important;
  font-size:0!important; /* hide table layout */
}
table.m-card thead{display:none!important}
table.m-card tbody{display:block!important;width:100%!important}
table.m-card tr{
  display:block!important;
  border-radius:8px!important;
  margin-bottom:8px!important;
  overflow:hidden!important;
  font-size:13px!important;
}
table.m-card td{
  display:flex!important;
  justify-content:space-between!important;
  align-items:flex-start!important;
  padding:7px 10px!important;
  font-size:12px!important;
  min-height:0!important;
  width:100%!important;
  max-width:100%!important;
  white-space:normal!important;
  word-break:break-word!important;
}
table.m-card td:last-child{border-bottom:none!important}
table.m-card td::before{
  content:attr(data-label);
  font-size:10px!important;
  font-weight:700!important;
  text-transform:uppercase!important;
  letter-spacing:0.05em!important;
  min-width:90px!important;
  max-width:110px!important;
  padding-right:8px!important;
  flex-shrink:0!important;
  line-height:1.5!important;
  padding-top:1px!important;
}
table.m-card td > *{
  text-align:right!important;
  max-width:65%!important;
  word-break:break-word!important;
  flex:1!important;
}

/* Light-themed tables (dark text authored for a white row) — render a clean white card.
   This is the default for any table ResponsiveBot hasn't classified yet. */
table.m-card[data-rbot-theme="light"] tr,
table.m-card:not([data-rbot-theme]) tr{
  background:#fff!important;
  border:1px solid #e5e7eb!important;
  box-shadow:0 1px 3px rgba(0,0,0,0.06)!important;
}
table.m-card[data-rbot-theme="light"] tr:nth-child(even),
table.m-card:not([data-rbot-theme]) tr:nth-child(even){background:#fafafa!important}
table.m-card[data-rbot-theme="light"] td,
table.m-card:not([data-rbot-theme]) td{
  color:#111827!important;
  border-bottom:1px solid #f3f4f6!important;
}
table.m-card[data-rbot-theme="light"] td::before,
table.m-card:not([data-rbot-theme]) td::before{color:#6b7280!important}
table.m-card[data-rbot-theme="light"] td:first-child,
table.m-card:not([data-rbot-theme]) td:first-child{
  background:#f0f4ff!important;
  font-weight:700!important;
  font-size:13px!important;
  color:#1e3a8a!important;
}

/* Dark-glass tables (light text authored for a translucent dark row) — keep a dark card
   instead of forcing a white background under text that was never meant to sit on white. */
table.m-card[data-rbot-theme="dark"] tr{
  background:rgba(15,23,42,0.55)!important;
  border:1px solid rgba(255,255,255,0.12)!important;
  box-shadow:0 2px 10px rgba(0,0,0,0.35)!important;
}
table.m-card[data-rbot-theme="dark"] tr:nth-child(even){background:rgba(15,23,42,0.72)!important}
table.m-card[data-rbot-theme="dark"] td{
  color:#e2e8f0!important;
  border-bottom:1px solid rgba(255,255,255,0.08)!important;
}
/* Force readable text on any plain text wrapper, but leave badges/pills/buttons
   that carry their own background colour untouched so status colour-coding survives. */
table.m-card[data-rbot-theme="dark"] td *:not([style*="background"]){color:#e2e8f0!important}
table.m-card[data-rbot-theme="dark"] td::before{color:rgba(226,232,240,0.6)!important}
table.m-card[data-rbot-theme="dark"] td:first-child{background:rgba(255,255,255,0.06)!important}
/* Non-card tables: ensure scroll */
table:not(.m-card){
  display:block!important;
  overflow-x:auto!important;
  -webkit-overflow-scrolling:touch!important;
  width:100%!important;
}
table:not(.m-card) thead,
table:not(.m-card) tbody{
  display:table!important;
  width:100%!important;
  table-layout:auto!important;
}

/* ─── SIDE PANEL → BOTTOM SHEET on phone ─── */
div[style*="position: fixed"][style*="justify-content: flex-end"]>div,
div[style*="position:fixed"][style*="justifyContent:flex-end"]>div{
  width:100%!important;
  max-width:100%!important;
  border-radius:12px 12px 0 0!important;
  position:fixed!important;
  bottom:0!important;
  top:auto!important;
  max-height:72vh!important;
  height:72vh!important;
}

/* ─── FORM GRIDS: 2-col → 1-col ─── */
[style*="display: grid"][style*="gap"][style*="1fr 1fr"],
[style*='gridTemplateColumns:"1fr 1fr"']{
  grid-template-columns:1fr!important;
}

/* ─── XP WINDOW ─── */
div[style*="border: 2px solid #0054e3"],
div[style*="border:2px solid #0054e3"]{
  max-width:100vw!important;
}

/* ─── ERP WHEEL ─── */
svg[viewBox="0 0 480 480"]{
  width:88vw!important;height:88vw!important;
  max-width:340px!important;max-height:340px!important;
}

/* ─── SAFE AREA ─── */
.app-page-content{
  padding-bottom:env(safe-area-inset-bottom,0px)!important;
}
`;

const XS_CSS = `
/* ═══ XS ≤380px (small/older phones, e.g. SE, compact Android) ══ */
:root{
  --font-size-base:12px!important;
  --font-size-sm:11px!important;
  --font-size-lg:13px!important;
  --content-padding:6px!important;
}
[style*="minmax(140px"],[style*="minmax(150px"],[style*="minmax(160px"],
[style*="minmax(175px"],[style*="minmax(180px"],[style*="minmax(200px"],
[style*="minmax(220px"],[style*="minmax(240px"],[style*="minmax(250px"],
[style*="minmax(260px"],[style*="minmax(280px"]{
  grid-template-columns:repeat(auto-fill,minmax(118px,1fr))!important;
}
table.m-card td::before{min-width:74px!important;max-width:88px!important;font-size:9px!important}
table.m-card td{padding:6px 8px!important;font-size:11px!important}
button,[role="button"]{min-height:38px!important;padding-left:8px!important;padding-right:8px!important}
div[style*="padding: 20px"],div[style*="padding:20px"],
div[style*="padding: 24px"],div[style*="padding:24px"]{padding:8px 6px!important}
`;

const LANDSCAPE_PHONE_CSS = `
/* ═══ PHONE/TABLET LANDSCAPE (short viewport height) ═══════════ */
[data-orientation="landscape"] [style*="position: fixed"][style*="inset: 0"],
[data-orientation="landscape"] [style*="position:fixed"][style*="inset:0"]{
  max-height:100vh!important;overflow-y:auto!important;
}
[data-orientation="landscape"] div[style*="min-height: 100vh"],
[data-orientation="landscape"] div[style*="minHeight: 100vh"],
[data-orientation="landscape"] div[style*="min-height:100vh"]{
  min-height:calc(var(--100dvh, 100vh))!important;
}
[data-orientation="landscape"] .kpi-tiles-row,
[data-orientation="landscape"] [style*="grid-template-columns:repeat(2"],
[data-orientation="landscape"] [style*="grid-template-columns: repeat(2"]{
  grid-template-columns:repeat(4,1fr)!important;
}
[data-orientation="landscape"] table.m-card tr{margin-bottom:6px!important}
[data-orientation="landscape"] .app-page-content{padding-top:4px!important;padding-bottom:4px!important}
`;

const TABLET_CSS = `
/* ═══ TABLET 768–1023px ════════════════════════════════════════ */
:root{--font-size-base:14px!important;--content-padding:12px!important;}

/* Tables: horizontal scroll */
table{
  display:block!important;
  overflow-x:auto!important;
  -webkit-overflow-scrolling:touch!important;
}
table thead,table tbody{display:table!important;width:100%!important;table-layout:auto!important;}
th,td{padding:5px 8px!important;font-size:12px!important;}

/* Grids */
[style*="grid-template-columns:repeat(6"],[style*="grid-template-columns: repeat(6"],
[style*="grid-template-columns:repeat(7"],[style*="grid-template-columns: repeat(7"],
[style*="grid-template-columns:repeat(8"],[style*="grid-template-columns: repeat(8"]{
  grid-template-columns:repeat(3,1fr)!important;
}
[style*="grid-template-columns:repeat(5"],[style*="grid-template-columns: repeat(5"],
[style*="grid-template-columns:repeat(4"],[style*="grid-template-columns: repeat(4"]{
  grid-template-columns:repeat(2,1fr)!important;
}
.kpi-tiles-row,[style*="grid-template-columns:repeat(5,1fr)"]{
  grid-template-columns:repeat(3,1fr)!important;
}

/* Touch targets */
button,[role="button"]{min-height:36px!important}
input,select,textarea{min-height:36px!important}

/* Modals */
[style*="position: fixed"][style*="width: 7"],
[style*="position: fixed"][style*="width: 8"]{
  width:90vw!important;max-width:90vw!important;
}
[style*="minWidth: 56"],[style*="minWidth: 60"]{
  min-width:min(600px,90vw)!important;
}

/* Page padding */
div[style*="padding: 24px"],div[style*="padding:24px"]{padding:14px 12px!important}
div[style*="padding: 20px"],div[style*="padding:20px"]{padding:12px 10px!important}

/* Tab scrolling */
.ribbon-tabs,.sub-nav-bar,.admin-quick-bar{
  overflow-x:auto!important;
  -webkit-overflow-scrolling:touch!important;
}
`;

const LAPTOP_CSS = `
/* ═══ LAPTOP 1024–1439px ══════════════════════════════════════ */
th,td{padding:5px 10px!important;}
[style*="position: fixed"][style*="width: 9"]{max-width:85vw!important;}
`;

function buildCSS(dev: string, landscape: boolean): string {
  let css = BASE_CSS;
  if (dev === "xs")          css += PHONE_CSS + XS_CSS;
  else if (dev === "phone")  css += PHONE_CSS;
  else if (dev === "tablet") css += TABLET_CSS;
  else if (dev === "laptop") css += LAPTOP_CSS;
  if (landscape && (dev === "xs" || dev === "phone" || dev === "tablet")) {
    css += LANDSCAPE_PHONE_CSS;
  }
  return css;
}

// ── CSS injection ──────────────────────────────────────────────────────────
const STYLE_ID = "el5-rbot-v3";

function injectCSS(css: string) {
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ID;
    document.head.insertBefore(el, document.head.firstChild);
  }
  if (el.textContent !== css) el.textContent = css;
}

function injectRoot(dev: string, landscape: boolean) {
  const root = document.documentElement;
  root.setAttribute("data-device", dev);
  root.setAttribute("data-orientation", landscape ? "landscape" : "portrait");
  const dvh = window.innerHeight * 0.01;
  root.style.setProperty("--dvh", `${dvh}px`);
  root.style.setProperty("--100dvh", `${window.innerHeight}px`);
}

// ── Theme detection: is this table's text authored for a light or dark row? ─
function relLuminance(channels: number[]): number {
  const [r, g, b] = channels.slice(0, 3).map(c => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function parseRGBChannels(str: string | null | undefined): number[] | null {
  const m = str && str.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const parts = m[1].split(",").map(s => parseFloat(s));
  if (parts.length < 3 || parts.some(isNaN)) return null;
  return parts;
}

// Samples the authored text colour of the first data row. If the text is
// mostly light (high luminance) it was written for a dark/glass background,
// so we must not force a white card under it or the text becomes invisible.
function detectTableTheme(table: HTMLTableElement): "light" | "dark" {
  const row = table.querySelector("tbody tr");
  if (!row) return "light";
  const cells = Array.from(row.querySelectorAll("td")).slice(0, 3);
  const lums: number[] = [];
  cells.forEach(td => {
    const target = (td.querySelector("div,span") || td) as HTMLElement;
    const ch = parseRGBChannels(window.getComputedStyle(target).color);
    if (ch) lums.push(relLuminance(ch));
  });
  if (!lums.length) return "light";
  const avg = lums.reduce((a, b) => a + b, 0) / lums.length;
  return avg > 0.55 ? "dark" : "light";
}

// ── Table card-view patcher ───────────────────────────────────────────────
function patchTables(dev: string) {
  const isPhone = dev === "phone";

  document.querySelectorAll<HTMLTableElement>("table").forEach(table => {
    // Fix: parent has overflow:hidden → make it scrollable
    const parent = table.parentElement;
    if (parent) {
      const cs = window.getComputedStyle(parent);
      if (cs.overflow === "hidden" || cs.overflowX === "hidden") {
        parent.style.overflowX = "auto";
        (parent.style as any).webkitOverflowScrolling = "touch";
      }
    }

    if (!isPhone) {
      // On tablet/desktop: just ensure horizontal scroll
      table.classList.remove("m-card");
      if (table.style.display !== "block") {
        table.style.overflowX = "auto";
        (table.style as any).webkitOverflowScrolling = "touch";
      }
      return;
    }

    // Phone: card view
    if (table.classList.contains("m-card") && table.hasAttribute("data-rbot-done")) return;

    if (!table.hasAttribute("data-rbot-theme")) {
      table.setAttribute("data-rbot-theme", detectTableTheme(table));
    }

    // Read header labels
    const headers: string[] = [];
    table.querySelectorAll("thead th").forEach(th => {
      headers.push((th as HTMLElement).innerText?.trim() || "");
    });

    if (headers.length === 0) return; // no thead — skip

    // Add data-label to every td
    table.querySelectorAll("tbody tr").forEach(tr => {
      const cells = tr.querySelectorAll("td");
      cells.forEach((td, i) => {
        const label = headers[i] || "";
        if (label) td.setAttribute("data-label", label);
      });
    });

    table.classList.add("m-card");
    table.setAttribute("data-rbot-done", "1");
  });
}

// ── Grid patcher: computed-style auto-fit (catches grids the brittle
// inline-style CSS selectors above can't match — Tailwind classes,
// stylesheet-defined grids, or arbitrary/dynamic column counts) ──────────
const GRID_MIN_TILE: Record<string, number> = { xs: 118, phone: 140, tablet: 160 };

function patchGrids(dev: string) {
  const minTile = GRID_MIN_TILE[dev];
  if (!minTile) { // desktop/laptop: restore anything we previously auto-fit
    document.querySelectorAll<HTMLElement>('[data-rbot-grid="1"]').forEach(el => {
      el.style.removeProperty("grid-template-columns");
      el.removeAttribute("data-rbot-grid");
    });
    return;
  }

  document.querySelectorAll<HTMLElement>("div,section,ul").forEach(el => {
    // Skip elements a developer has explicitly opted out of auto-fitting
    if (el.hasAttribute("data-rbot-skip")) return;

    const cs = window.getComputedStyle(el);
    if (cs.display !== "grid" && cs.display !== "inline-grid") return;

    const cols = cs.gridTemplateColumns.split(/\s+/).filter(Boolean);
    if (cols.length < 2) return; // single-column grids already fit

    // Only intervene when a column would be narrower than a usable tap target
    const containerW = el.clientWidth;
    if (!containerW) return;
    const approxColW = containerW / cols.length;
    if (approxColW >= minTile) return; // already fits comfortably

    if (!el.hasAttribute("data-rbot-grid")) {
      el.setAttribute("data-rbot-grid", "1");
    }
    el.style.setProperty("grid-template-columns", `repeat(auto-fit,minmax(${minTile}px,1fr))`, "important");
  });
}

// ── Overflow guard: final sweep for anything still wider than the
// viewport after the CSS + grid passes (e.g. long unbroken SKUs/emails
// inside elements the selectors above don't reach) ───────────────────────
function patchOverflowGuards() {
  const vw = document.documentElement.clientWidth;
  document.querySelectorAll<HTMLElement>(
    ".app-page-content, .xp-window, [class*='page-container'], [class*='card'], [class*='panel']"
  ).forEach(el => {
    if (el.scrollWidth > vw + 2) {
      el.style.maxWidth = "100vw";
      el.style.overflowX = "auto";
      (el.style as any).webkitOverflowScrolling = "touch";
    }
  });
}

// ── DOM patcher: fix large minWidth dialogs ───────────────────────────────
function patchDOM(dev: string) {
  patchTables(dev);
  patchGrids(dev);

  if (dev === "phone" || dev === "tablet" || dev === "xs") {
    const maxW = dev === "tablet" ? 0.92 : 0.95;
    document.querySelectorAll<HTMLElement>("div[style]").forEach(el => {
      const mw = parseInt(el.style.minWidth || "0", 10);
      if (mw > 450 && el.style.position !== "fixed") {
        el.style.minWidth = `min(${mw}px,${Math.round(maxW*100)}vw)`;
        el.style.maxWidth = `${Math.round(maxW*100)}vw`;
      }
      // overflow:hidden scroll fix (fallback to JS for browsers without :has())
      if (el.querySelector("table") && (el.style.overflow === "hidden" || el.style.overflowX === "hidden")) {
        el.style.overflowX = "auto";
        (el.style as any).webkitOverflowScrolling = "touch";
      }
    });
  }

  patchOverflowGuards();
}

// ── Main hook ─────────────────────────────────────────────────────────────
export function useResponsiveBot() {
  const devRef = useRef<string>("desktop");

  const run = useCallback(() => {
    const w   = window.innerWidth;
    const h   = window.innerHeight;
    const dev = device(w);
    const landscape = w > h && h <= LANDSCAPE_SHORT_H;
    devRef.current = dev;
    injectRoot(dev, landscape);
    injectCSS(buildCSS(dev, landscape));
    requestAnimationFrame(() => patchDOM(dev));
  }, []);

  useEffect(() => {
    run();

    const ro = new ResizeObserver(run);
    ro.observe(document.documentElement);
    window.addEventListener("orientationchange", run);
    window.addEventListener("resize", run);

    // Re-patch whenever new DOM nodes appear (async table renders)
    const mo = new MutationObserver(() => {
      requestAnimationFrame(() => patchTables(devRef.current));
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("orientationchange", run);
      window.removeEventListener("resize", run);
    };
  }, [run]);
}

export default function ResponsiveBot() {
  useResponsiveBot();
  return null;
}
