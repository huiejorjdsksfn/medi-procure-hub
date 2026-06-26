/**
 * EL5 MediProcure — ResponsiveBot v2.0
 * Auto-fits every page, table, modal, XP window, sidebar, KPI grid,
 * and form to phones (320-767px), tablets (768-1023px), laptops (1024-1439px), desktops (1440px+)
 *
 * Strategy:
 *  1. Injects a <style> tag with breakpoint-aware CSS overrides
 *  2. Watches window resize and orientation change via ResizeObserver
 *  3. Injects CSS custom properties onto :root for each breakpoint
 *  4. DOM-patches scroll containers, overflow guards, and XP windows
 *  5. MutationObserver re-patches on new elements
 */

import { useEffect, useRef, useCallback } from "react";

const BP = { phone: 767, tablet: 1023, laptop: 1439 };

function getDevice(w: number): "phone" | "tablet" | "laptop" | "desktop" {
  if (w <= BP.phone)  return "phone";
  if (w <= BP.tablet) return "tablet";
  if (w <= BP.laptop) return "laptop";
  return "desktop";
}

// ── CSS injected per device ──────────────────────────────────────────────────
function buildCSS(device: string, w: number): string {
  // Always applied (all breakpoints)
  const BASE = `
    /* ResponsiveBot BASE */
    *, *::before, *::after { box-sizing: border-box !important; }
    body { overflow-x: hidden !important; }

    /* Touch-scrollable containers */
    div[style*="overflow: auto"], div[style*="overflow:auto"],
    div[style*="overflow-x: auto"], div[style*="overflow-x:auto"] {
      -webkit-overflow-scrolling: touch !important;
      overscroll-behavior-x: contain !important;
    }

    /* Prevent images overflowing */
    img { max-width: 100% !important; }

    /* Buttons always pointer */
    button { cursor: pointer !important; }

    /* XP window / modal: never wider than viewport */
    div[style*="position: fixed"], div[style*="position:fixed"] {
      max-width: 100vw !important;
    }
  `;

  /* ═══════════════════════════════════════════════════════
     PHONE  ≤ 767px
     ═══════════════════════════════════════════════════════ */
  if (device === "phone") {
    return BASE + `
    :root {
      --font-size-base: 13px !important;
      --font-size-sm:   12px !important;
      --font-size-lg:   14px !important;
      --content-padding: 8px !important;
      --border-radius: 6px !important;
      --topbar-height: 48px !important;
    }

    /* ── Tables ─────────────────────────────────────────── */
    table {
      display: block !important;
      overflow-x: auto !important;
      -webkit-overflow-scrolling: touch !important;
      font-size: 11px !important;
      max-width: 100% !important;
    }
    table thead, table tbody, table tfoot {
      display: table !important; width: 100% !important; table-layout: auto !important;
    }
    table tr { display: table-row !important; }
    th, td { padding: 4px 6px !important; font-size: 11px !important; white-space: nowrap !important; }

    /* ── Inputs ─────────────────────────────────────────── */
    input, select, textarea {
      font-size: 16px !important; /* prevents iOS zoom */
      min-height: 40px !important;
      max-width: 100% !important;
    }

    /* ── Touch targets ──────────────────────────────────── */
    button, [role="button"] { min-height: 40px !important; min-width: 36px !important; }

    /* ── Flex toolbars: wrap ────────────────────────────── */
    [style*="display: flex"][style*="gap"],
    [style*="display:flex"][style*="gap"] { flex-wrap: wrap !important; }
    [style*="flex-wrap: nowrap"],
    [style*="flexWrap:\"nowrap\""] { flex-wrap: nowrap !important; }

    /* ── Grids: collapse ────────────────────────────────── */
    [style*="grid-template-columns:repeat(4"],
    [style*="grid-template-columns: repeat(4"],
    [style*="grid-template-columns:repeat(5"],
    [style*="grid-template-columns: repeat(5"],
    [style*="grid-template-columns:repeat(6"],
    [style*="grid-template-columns: repeat(6"],
    [style*="grid-template-columns:repeat(7"],
    [style*="grid-template-columns: repeat(7"],
    [style*="grid-template-columns:repeat(8"],
    [style*="grid-template-columns: repeat(8"] { grid-template-columns: repeat(2,1fr) !important; }

    [style*="grid-template-columns:repeat(3"],
    [style*="grid-template-columns: repeat(3"] { grid-template-columns: 1fr 1fr !important; }

    [style*="grid-template-columns:repeat(2"],
    [style*="grid-template-columns: repeat(2"] { grid-template-columns: 1fr !important; }

    /* auto-fill minmax: shrink min */
    [style*="minmax(175px"], [style*="minmax(180px"],
    [style*="minmax(200px"], [style*="minmax(220px"],
    [style*="minmax(240px"], [style*="minmax(250px"],
    [style*="minmax(260px"], [style*="minmax(280px"] {
      grid-template-columns: repeat(auto-fill,minmax(140px,1fr)) !important;
    }

    /* ── Modals: fill viewport ──────────────────────────── */
    [style*="position: fixed"][style*="width: 3"],
    [style*="position: fixed"][style*="width: 4"],
    [style*="position: fixed"][style*="width: 5"],
    [style*="position: fixed"][style*="width: 6"],
    [style*="position: fixed"][style*="width: 7"],
    [style*="position: fixed"][style*="width: 8"] {
      width: 95vw !important; max-width: 95vw !important; min-width: 0 !important;
    }
    [style*="minWidth: 56"], [style*="minWidth: 60"], [style*="minWidth: 64"],
    [style*="minWidth: 70"], [style*="minWidth: 80"],
    [style*="minWidth:56"], [style*="minWidth:60"], [style*="minWidth:64"] {
      min-width: 95vw !important; max-width: 95vw !important;
    }
    [style*="position: fixed"][style*="inset: 0"],
    [style*="position: fixed"][style*="inset:0"] { overflow-y: auto !important; }

    /* ── Page padding: shrink ───────────────────────────── */
    div[style*="padding: 20px"], div[style*="padding: 24px"],
    div[style*="padding:20px"], div[style*="padding:24px"] { padding: 10px 8px !important; }
    div[style*="padding: 16px"], div[style*="padding:16px"] { padding: 8px 6px !important; }

    /* ── XP dashboard window ────────────────────────────── */
    div[style*="border: 2px solid #0054e3"],
    div[style*="border:2px solid #0054e3"] { max-width: 100vw !important; }

    /* XP taskbar buttons */
    div[style*="height: 36px"] button,
    div[style*="height:36px"] button { min-height: 30px !important; font-size: 9px !important; }

    /* ── Sidebar detail panel → bottom sheet ───────────── */
    div[style*="position: absolute"][style*="right: 0"][style*="width: 2"],
    div[style*="position: absolute"][style*="right: 0"][style*="width: 3"],
    div[style*="position:absolute"][style*="right:0"][style*="width:2"],
    div[style*="position:absolute"][style*="right:0"][style*="width:3"] {
      position: fixed !important; left: 0 !important; right: 0 !important;
      bottom: 0 !important; top: auto !important; width: 100% !important;
      height: 58vh !important; border-radius: 12px 12px 0 0 !important;
      z-index: 8500 !important; overflow-y: auto !important;
    }

    /* ── ERP Wheel ──────────────────────────────────────── */
    svg[viewBox="0 0 480 480"] {
      width: 88vw !important; height: 88vw !important;
      max-width: 340px !important; max-height: 340px !important;
    }

    /* ── Tabs scrollable ────────────────────────────────── */
    .ribbon-tabs, .sub-nav-bar, .admin-quick-bar {
      overflow-x: auto !important;
      -webkit-overflow-scrolling: touch !important;
    }

    /* ── Status bar: horizontal scroll ─────────────────── */
    div[style*="borderTop"][style*="fontSize: 10"],
    div[style*="borderTop"][style*="font-size: 10"] {
      overflow-x: auto !important; font-size: 9px !important;
    }

    /* ── KPI stat tiles ─────────────────────────────────── */
    div[style*="minWidth: 130"],
    div[style*="minWidth:130"] {
      min-width: calc(50vw - 20px) !important;
      flex: 0 0 calc(50vw - 20px) !important;
    }

    /* ── Date inputs ────────────────────────────────────── */
    input[type="date"] { min-width: 0 !important; width: 100% !important; }

    /* ── Selects ────────────────────────────────────────── */
    select { width: 100% !important; }

    /* ── 1fr 1fr report grids → single col ─────────────── */
    [style*="gridTemplateColumns: \"1fr 1fr\""],
    [style*="gridTemplateColumns:\"1fr 1fr\""] { grid-template-columns: 1fr !important; }

    /* ── Admin quick bar: smaller font ─────────────────── */
    .admin-quick-bar { padding: 2px 6px !important; }
    .admin-quick-bar button { padding: 1px 4px !important; font-size: 9px !important; }
    `;
  }

  /* ═══════════════════════════════════════════════════════
     TABLET  768–1023px
     ═══════════════════════════════════════════════════════ */
  if (device === "tablet") {
    return BASE + `
    :root {
      --font-size-base: 14px !important;
      --font-size-sm:   13px !important;
      --content-padding: 12px !important;
    }

    /* Tables: scrollable */
    table {
      display: block !important; overflow-x: auto !important;
      -webkit-overflow-scrolling: touch !important;
      max-width: 100% !important;
    }
    table thead, table tbody { display: table !important; width: 100% !important; table-layout: auto !important; }
    th, td { padding: 5px 8px !important; font-size: 12px !important; }

    /* Inputs */
    input, select, textarea { min-height: 36px !important; }
    button, [role="button"]  { min-height: 36px !important; }

    /* Grids */
    [style*="grid-template-columns:repeat(6"],
    [style*="grid-template-columns: repeat(6"],
    [style*="grid-template-columns:repeat(7"],
    [style*="grid-template-columns: repeat(7"],
    [style*="grid-template-columns:repeat(8"],
    [style*="grid-template-columns: repeat(8"] { grid-template-columns: repeat(3,1fr) !important; }

    [style*="grid-template-columns:repeat(5"],
    [style*="grid-template-columns: repeat(5"],
    [style*="grid-template-columns:repeat(4"],
    [style*="grid-template-columns: repeat(4"] { grid-template-columns: repeat(2,1fr) !important; }

    [style*="minmax(200px"], [style*="minmax(220px"],
    [style*="minmax(240px"], [style*="minmax(250px"] {
      grid-template-columns: repeat(auto-fill,minmax(160px,1fr)) !important;
    }

    /* Modals: 90vw */
    [style*="position: fixed"][style*="width: 7"],
    [style*="position: fixed"][style*="width: 8"] {
      width: 90vw !important; max-width: 90vw !important;
    }
    [style*="minWidth: 56"], [style*="minWidth: 60"] {
      min-width: min(600px,90vw) !important;
    }

    /* Page padding */
    div[style*="padding: 24px"], div[style*="padding:24px"] { padding: 14px 12px !important; }
    div[style*="padding: 20px"], div[style*="padding:20px"] { padding: 12px 10px !important; }

    /* Detail side panel: narrower */
    div[style*="position: absolute"][style*="right: 0"][style*="width: 2"] { width: 240px !important; }
    div[style*="position: absolute"][style*="right: 0"][style*="width: 3"] { width: 280px !important; }

    /* KPI tiles */
    div[style*="minWidth: 130"], div[style*="minWidth:130"] {
      min-width: calc(33% - 8px) !important;
      flex: 1 1 calc(33% - 8px) !important;
    }

    /* Tab strips scrollable */
    .ribbon-tabs, .sub-nav-bar { overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; }

    /* Admin bar */
    .admin-quick-bar { overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; }
    `;
  }

  /* ═══════════════════════════════════════════════════════
     LAPTOP  1024–1439px
     ═══════════════════════════════════════════════════════ */
  if (device === "laptop") {
    return BASE + `
    /* Modest adjustments only */
    th, td { padding: 5px 10px !important; }
    [style*="position: fixed"][style*="width: 8"] { max-width: 85vw !important; }
    `;
  }

  // Desktop ≥ 1440px — just the base
  return BASE;
}

const STYLE_ID = "el5-responsive-bot";

function injectStyle(css: string) {
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ID;
    // Insert before any other styles so specificity is correct
    const first = document.head.firstChild;
    if (first) document.head.insertBefore(el, first);
    else document.head.appendChild(el);
  }
  el.textContent = css;
}

function injectRootVars(device: string) {
  const root = document.documentElement;
  root.setAttribute("data-device", device);
  const dvh = window.innerHeight * 0.01;
  root.style.setProperty("--dvh", `${dvh}px`);
  root.style.setProperty("--100dvh", `${window.innerHeight}px`);
}

function patchDOM(device: string) {
  // 1. Make all scroll containers touch-friendly
  document.querySelectorAll<HTMLElement>("div[style]").forEach(el => {
    const s = el.style;
    if (s.overflow === "auto" || s.overflowX === "auto") {
      el.style.webkitOverflowScrolling = "touch";
      if (device === "phone" || device === "tablet") el.style.maxWidth = "100%";
    }
  });

  // 2. XP window: don't exceed viewport
  if (device === "phone" || device === "tablet") {
    document.querySelectorAll<HTMLElement>(
      'div[style*="border: 2px solid #0054e3"], div[style*="border:2px solid #0054e3"]'
    ).forEach(el => {
      el.style.maxWidth = "100vw";
      el.style.maxHeight = `${window.innerHeight}px`;
    });

    // 3. Fixed modals with inset:0 — allow scroll
    document.querySelectorAll<HTMLElement>("div[style]").forEach(el => {
      if (el.style.position === "fixed") {
        if (el.style.inset === "0" || el.style.inset === "0px" ||
            (el.style.top === "0" && el.style.left === "0" &&
             el.style.right === "0" && el.style.bottom === "0")) {
          el.style.overflowY = "auto";
        }
      }
    });

    // 4. Any hardcoded large minWidth on dialogs
    document.querySelectorAll<HTMLElement>("div[style]").forEach(el => {
      const mw = parseInt(el.style.minWidth || "0", 10);
      if (mw > 480 && el.style.position !== "fixed") {
        if (device === "phone") {
          el.style.minWidth = "calc(95vw)";
          el.style.maxWidth = "95vw";
        } else {
          el.style.minWidth = "min(" + mw + "px, 92vw)";
          el.style.maxWidth = "92vw";
        }
      }
    });
  }
}

const STYLE_ID_INJECTED = "el5-rbot-injected";

export function useResponsiveBot() {
  const deviceRef = useRef<string>("desktop");

  const applyResponsive = useCallback(() => {
    const w = window.innerWidth;
    const device = getDevice(w);
    deviceRef.current = device;
    injectRootVars(device);
    injectStyle(buildCSS(device, w));
    requestAnimationFrame(() => patchDOM(device));
  }, []);

  useEffect(() => {
    applyResponsive();

    const ro = new ResizeObserver(applyResponsive);
    ro.observe(document.documentElement);
    window.addEventListener("orientationchange", applyResponsive);
    window.addEventListener("resize", applyResponsive);

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

export default function ResponsiveBot() {
  useResponsiveBot();
  return null;
}
