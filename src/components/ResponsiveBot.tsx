/**
 * EL5 MediProcure — ResponsiveBot v1.0
 * Auto-fits every page, table, modal, XP window, sidebar, and grid
 * to phones (320-767px), tablets (768-1023px), laptops (1024-1439px), desktops (1440px+)
 *
 * Strategy:
 *  1. Injects a <style> tag with breakpoint-aware overrides
 *  2. Watches window resize and orientation change
 *  3. Injects CSS custom properties onto :root for every breakpoint
 *  4. Patches scroll containers, tables, XP windows, modals, nav tabs
 */

import { useEffect, useRef, useCallback } from "react";

// ── Breakpoints ──────────────────────────────────────────────────────────────
const BP = {
  phone:   767,   // ≤ 767px
  tablet:  1023,  // 768–1023px
  laptop:  1439,  // 1024–1439px
  // desktop: 1440+
};

function getDevice(w: number): "phone" | "tablet" | "laptop" | "desktop" {
  if (w <= BP.phone)  return "phone";
  if (w <= BP.tablet) return "tablet";
  if (w <= BP.laptop) return "laptop";
  return "desktop";
}

// ── CSS injected per device ──────────────────────────────────────────────────
function buildCSS(device: string, w: number): string {
  // Shared: always applied
  const BASE = `
    /* ── ResponsiveBot BASE (always) ── */
    *, *::before, *::after { box-sizing: border-box !important; }

    /* Horizontal scroll lock at body — allow per container */
    body { overflow-x: hidden !important; }

    /* All tables: horizontal scroll wrapper */
    table { min-width: 0 !important; }
    div[style*="overflow: auto"], div[style*="overflow:auto"],
    div[style*="overflow-x: auto"], div[style*="overflow-x:auto"] {
      -webkit-overflow-scrolling: touch !important;
      overscroll-behavior-x: contain !important;
    }

    /* XP windows: never exceed viewport */
    div[style*="position: fixed"], div[style*="position:fixed"] {
      max-width: 100vw !important;
      max-height: 100dvh !important;
    }

    /* Modals: full screen on small */
    div[style*="position: fixed"][style*="inset: 0"],
    div[style*="position:fixed"][style*="inset:0"] {
      overflow-y: auto !important;
    }

    /* Images: never overflow */
    img { max-width: 100% !important; height: auto !important; }

    /* Input / select: no zoom on iOS */
    input, select, textarea {
      font-size: 16px !important;
      max-width: 100% !important;
    }

    /* Buttons: always tappable */
    button { cursor: pointer !important; user-select: none !important; }
  `;

  if (device === "phone") {
    return BASE + `
    /* ══════════════════════════════════════════════
       PHONE  ≤ ${w}px
       ══════════════════════════════════════════════ */
    :root {
      --font-size-base: 13px !important;
      --font-size-sm:   12px !important;
      --font-size-lg:   14px !important;
      --content-padding: 8px !important;
      --border-radius: 6px !important;
      --topbar-height: 44px !important;
      --nav-height: 0px !important;
      --rbot-grid-font: 10px;
      --rbot-btn-pad: 4px 8px;
      --rbot-kpi-min: calc(50% - 8px);
    }

    /* AppLayout: stack sidebar over content */
    .app-sidebar {
      position: fixed !important; left: -100% !important; top: 0 !important;
      height: 100dvh !important; z-index: 9000 !important;
      transition: left 0.25s ease !important;
      width: min(280px, 85vw) !important;
    }
    .app-sidebar.open { left: 0 !important; }

    /* Main content: full width */
    .app-main, [class*="main-content"], [class*="content-area"] {
      margin-left: 0 !important; width: 100% !important;
    }

    /* Top bar: compact */
    nav, header, [class*="topbar"], [class*="top-bar"] {
      padding: 0 8px !important; min-height: 44px !important;
      flex-wrap: nowrap !important;
    }

    /* XP Windows: full screen */
    div[style*="EL5 MediProcure"],
    div[style*="border: 2px solid #0054e3"],
    div[style*="border:2px solid #0054e3"] {
      margin: 0 !important;
      border-radius: 0 !important;
      height: 100dvh !important;
      width: 100vw !important;
    }

    /* Tab strips: scrollable */
    div[style*="display: flex"][style*="overflow-x"],
    div[style*="display:flex"][style*="overflow-x"] {
      flex-wrap: nowrap !important;
      overflow-x: auto !important;
      -webkit-overflow-scrolling: touch !important;
    }

    /* Tab buttons: shrink */
    div[style*="borderRadius: \"3px 3px 0 0\""] button,
    button[style*="border-radius: 3px 3px 0 0"],
    button[style*="borderRadius: '3px 3px 0 0'"] {
      padding: 4px 8px !important;
      font-size: 10px !important;
      white-space: nowrap !important;
    }

    /* XP KPI cards: 2-column grid */
    div[style*="KPI"], div[style*="kpi"],
    div[style*="minWidth: 130"] {
      min-width: calc(50vw - 20px) !important;
      max-width: calc(50vw - 20px) !important;
      flex: 0 0 calc(50vw - 20px) !important;
    }

    /* KPI row: wrap */
    div[style*="display: flex"][style*="gap: 8px"][style*="marginBottom: 14px"],
    div[style*="display:flex"][style*="gap:8px"][style*="marginBottom:14px"] {
      flex-wrap: wrap !important;
    }

    /* Grid: add horizontal scroll */
    div[style*="overflow: auto"] table,
    div[style*="overflow:auto"] table {
      font-size: 10px !important;
    }

    div[style*="overflow: auto"] th,
    div[style*="overflow: auto"] td,
    div[style*="overflow:auto"] th,
    div[style*="overflow:auto"] td {
      padding: 3px 5px !important;
      font-size: 10px !important;
    }

    /* Action buttons in grid: shrink */
    div[style*="display: flex"][style*="gap: 2"] button,
    div[style*="display:flex"][style*="gap:2"] button {
      padding: 1px 5px !important;
      font-size: 9px !important;
    }

    /* Modals: full screen */
    div[style*="minWidth: 560"],
    div[style*="minWidth:560"] {
      min-width: calc(100vw - 16px) !important;
      max-width: calc(100vw - 16px) !important;
      margin: 8px !important;
    }

    /* Form grids: single column */
    div[style*="gridTemplateColumns: \"repeat(3"] {
      grid-template-columns: 1fr !important;
    }
    div[style*="gridTemplateColumns: \"repeat(5"] {
      grid-template-columns: 1fr 1fr !important;
    }
    div[style*="gridColumn: \"span"] {
      grid-column: span 1 !important;
    }

    /* Sidebar detail panels: bottom sheet */
    div[style*="position: absolute"][style*="right: 0"][style*="width: 27"],
    div[style*="position:absolute"][style*="right:0"][style*="width:27"] {
      position: fixed !important;
      left: 0 !important; right: 0 !important; bottom: 0 !important;
      top: auto !important; width: 100% !important; height: 55vh !important;
      border-radius: 12px 12px 0 0 !important;
      z-index: 8500 !important;
      box-shadow: 0 -4px 24px rgba(0,0,0,0.35) !important;
    }

    /* Toolbar: wrap */
    div[style*="borderBottom"][style*="display: flex"][style*="padding: \"4px 8px\""],
    div[style*="padding:\"4px 8px\""] {
      flex-wrap: wrap !important;
      gap: 4px !important;
    }

    /* Date inputs in toolbar: half width */
    input[type="date"] {
      width: 120px !important;
      font-size: 11px !important;
    }

    /* Status bar: single line scroll */
    div[style*="borderTop"][style*="fontSize: 10"],
    div[style*="fontSize:10"] {
      overflow-x: auto !important;
      flex-wrap: nowrap !important;
      font-size: 9px !important;
    }

    /* Taskbar: compact */
    div[style*="height: 36"][style*="linear-gradient"],
    div[style*="height:36"][style*="linear-gradient"] {
      height: 40px !important;
      padding: 0 4px !important;
    }

    /* XP title bar title: truncate */
    div[style*="titleActive"] span,
    div[style*="linear-gradient(180deg,#4a90e2"] span[style*="color: \"#fff\""] {
      font-size: 10px !important;
      max-width: 200px !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
    }

    /* AppLayout top nav tabs: scroll */
    div[class*="tab"], nav[class*="tab"] {
      overflow-x: auto !important;
      -webkit-overflow-scrolling: touch !important;
    }

    /* Selects/dropdowns: full width on phone */
    select { width: 100% !important; }

    /* Hide non-essential elements on phone */
    .phone-hide { display: none !important; }

    /* Report grids: single column */
    div[style*="gridTemplateColumns: \"1fr 1fr\""] {
      grid-template-columns: 1fr !important;
    }
    `;
  }

  if (device === "tablet") {
    return BASE + `
    /* ══════════════════════════════════════════════
       TABLET  768–1023px
       ══════════════════════════════════════════════ */
    :root {
      --font-size-base: 13px !important;
      --font-size-sm:   12px !important;
      --content-padding: 12px !important;
      --rbot-grid-font: 11px;
      --rbot-kpi-min: calc(33% - 8px);
    }

    /* Sidebar: narrower */
    .app-sidebar { width: min(220px, 30vw) !important; }

    /* XP windows: near-full */
    div[style*="margin: 6px"] {
      margin: 4px !important;
    }

    /* Tab strips: scrollable if overflow */
    div[style*="display: flex"][style*="padding: \"4px 4px 0\""] {
      overflow-x: auto !important;
      -webkit-overflow-scrolling: touch !important;
    }
    div[style*="display: flex"][style*="padding: \"4px 4px 0\""] button {
      padding: 4px 9px !important;
      font-size: 10px !important;
    }

    /* Grid: compact */
    div[style*="overflow: auto"] th,
    div[style*="overflow: auto"] td {
      padding: 3px 6px !important;
      font-size: 11px !important;
    }

    /* KPI: 3-up */
    div[style*="display: flex"][style*="gap: 8px"][style*="marginBottom: 14px"] {
      flex-wrap: wrap !important;
    }
    div[style*="minWidth: 130"] {
      min-width: calc(33% - 8px) !important;
      flex: 1 1 calc(33% - 8px) !important;
    }

    /* Modals: 90vw */
    div[style*="minWidth: 560"] {
      min-width: min(560px, 90vw) !important;
      max-width: 90vw !important;
    }

    /* Detail side panel: narrower */
    div[style*="position: absolute"][style*="right: 0"][style*="width: 27"] {
      width: 240px !important;
    }

    /* Form grids: 2-col max */
    div[style*="gridTemplateColumns: \"repeat(3"] {
      grid-template-columns: 1fr 1fr !important;
    }

    /* Report grids: still 2-col */
    div[style*="gridTemplateColumns: \"1fr 1fr\""] {
      grid-template-columns: 1fr 1fr !important;
    }
    `;
  }

  if (device === "laptop") {
    return BASE + `
    /* ══════════════════════════════════════════════
       LAPTOP  1024–1439px
       ══════════════════════════════════════════════ */
    :root {
      --rbot-grid-font: 11px;
    }

    /* XP tab buttons: slightly more compact */
    div[style*="display: flex"][style*="padding: \"4px 4px 0\""] button {
      padding: 5px 10px !important;
      font-size: 11px !important;
    }

    /* Modals: stay bounded */
    div[style*="minWidth: 560"] {
      max-width: 80vw !important;
    }
    `;
  }

  // Desktop — minimal tweaks
  return BASE + `
    /* ══════════════════════════════════════════════
       DESKTOP  ≥ 1440px
       ══════════════════════════════════════════════ */
    :root { --rbot-grid-font: 11px; }
  `;
}

// ── Inject / update <style> tag ────────────────────────────────────────────
const STYLE_ID = "el5-responsive-bot";

function injectStyle(css: string) {
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = css;
}

// ── Root CSS vars per breakpoint ───────────────────────────────────────────
function injectRootVars(device: string) {
  const root = document.documentElement;
  // Scroll behavior
  root.setAttribute("data-device", device);

  // Viewport height fix for mobile browsers
  const dvh = window.innerHeight * 0.01;
  root.style.setProperty("--dvh", `${dvh}px`);
  root.style.setProperty("--100dvh", `${window.innerHeight}px`);
}

// ── Patch existing DOM elements that use inline styles ─────────────────────
function patchDOM(device: string) {
  // 1. Make all table wrappers horizontally scrollable
  document.querySelectorAll<HTMLElement>('div[style]').forEach(el => {
    const s = el.style;
    if (s.overflow === "auto" || s.overflowX === "auto") {
      el.style.webkitOverflowScrolling = "touch";
      if (device === "phone" || device === "tablet") {
        el.style.maxWidth = "100%";
      }
    }
  });

  // 2. Ensure all XP window containers don't exceed viewport width
  if (device === "phone" || device === "tablet") {
    document.querySelectorAll<HTMLElement>('div[style*="border: 2px solid #0054e3"], div[style*="border:2px solid #0054e3"]').forEach(el => {
      el.style.maxWidth = "100vw";
      el.style.maxHeight = `${window.innerHeight}px`;
    });

    // 3. Fix fixed modals
    document.querySelectorAll<HTMLElement>('div[style*="position: fixed"]').forEach(el => {
      if (el.style.inset === "0" || (el.style.top === "0" && el.style.left === "0")) {
        el.style.overflowY = "auto";
      }
    });
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useResponsiveBot() {
  const deviceRef = useRef<string>("desktop");

  const applyResponsive = useCallback(() => {
    const w = window.innerWidth;
    const device = getDevice(w);

    if (device !== deviceRef.current) {
      deviceRef.current = device;
    }

    injectRootVars(device);
    injectStyle(buildCSS(device, w));

    // DOM patching runs async to not block paint
    requestAnimationFrame(() => patchDOM(device));
  }, []);

  useEffect(() => {
    // Apply immediately
    applyResponsive();

    // Watch resize + orientation
    const ro = new ResizeObserver(applyResponsive);
    ro.observe(document.documentElement);

    window.addEventListener("orientationchange", applyResponsive);
    window.addEventListener("resize", applyResponsive);

    // MutationObserver: re-patch when new elements mount
    const mo = new MutationObserver(() => {
      requestAnimationFrame(() => patchDOM(deviceRef.current));
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("orientationchange", applyResponsive);
      window.removeEventListener("resize", applyResponsive);
    };
  }, [applyResponsive]);

  return deviceRef.current;
}

// ── Component (drop into <App> root) ─────────────────────────────────────────
export default function ResponsiveBot() {
  useResponsiveBot();
  return null; // renders nothing — pure side-effects
}
