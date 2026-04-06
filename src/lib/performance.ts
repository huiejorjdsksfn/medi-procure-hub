/**
 * EL5 MediProcure v5.8 — Performance Utilities
 * Lazy loading, preloading, cross-platform helpers
 */
import { lazy, ComponentType, LazyExoticComponent } from "react";

/** Lazy-load a page component with retry logic */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  retries = 3
): LazyExoticComponent<T> {
  return lazy(() =>
    factory().catch(async (error) => {
      if (retries === 0) throw error;
      await new Promise(r => setTimeout(r, 500));
      return lazyWithRetry(factory, retries - 1) as any;
    })
  );
}

/** Detect platform */
export const Platform = {
  isElectron: () => !!(window as any).electronAPI,
  isWeb:      () => !(window as any).electronAPI,
  isMobile:   () => /Mobi|Android|iPhone/i.test(navigator.userAgent),
  isPWA:      () => window.matchMedia("(display-mode: standalone)").matches,
  isOnline:   () => navigator.onLine,
};

/** Cross-platform open URL */
export async function openURL(url: string): Promise<void> {
  if (Platform.isElectron()) {
    await (window as any).electronAPI?.openExternal(url);
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

/** Performance mark helper */
export function mark(name: string): void {
  try { performance.mark(name); } catch { /* */ }
}

/** Measure render time */
export function measure(name: string, start: string, end: string): number {
  try {
    performance.measure(name, start, end);
    return performance.getEntriesByName(name)[0]?.duration || 0;
  } catch { return 0; }
}

/** Preload a route component */
export function preloadRoute(path: string): void {
  if ("requestIdleCallback" in window) {
    requestIdleCallback(() => {
      const link = document.createElement("link");
      link.rel  = "prefetch";
      link.href = path;
      document.head.appendChild(link);
    });
  }
}

/** Debounce a function */
export function debounce<T extends (...args: any[]) => any>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

/** Throttle a function */
export function throttle<T extends (...args: any[]) => any>(fn: T, ms: number): T {
  let last = 0;
  return ((...args: any[]) => {
    const now = Date.now();
    if (now - last >= ms) { last = now; return fn(...args); }
  }) as T;
}

/** Batch Supabase queries (run all at once) */
export async function batchQuery<T>(
  queries: Promise<{ data: T[] | null; error: any }>[],
  fallback: T[] = []
): Promise<T[][]> {
  const results = await Promise.allSettled(queries);
  return results.map(r =>
    r.status === "fulfilled" ? (r.value.data || fallback) : fallback
  );
}
