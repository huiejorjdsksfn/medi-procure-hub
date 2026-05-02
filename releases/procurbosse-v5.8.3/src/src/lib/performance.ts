/**
 * ProcurBosse - Performance Utilities v5.9
 * Lazy loading, deduplication, concurrency control, debounce/throttle
 * Embu Level 5 Hospital - EL5 MediProcure
 */
import { lazy, ComponentType, LazyExoticComponent } from "react";

// - Lazy load with retry -
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  retries = 3,
  delay = 500
): LazyExoticComponent<T> {
  return lazy(() =>
    factory().catch(async (error) => {
      if (retries === 0) throw error;
      await new Promise(r => setTimeout(r, delay));
      return lazyWithRetry(factory, retries - 1, delay * 1.5) as any;
    })
  );
}

// - Platform detection -
export const Platform = {
  isElectron: () => !!(window as any).electronAPI,
  isWeb:      () => !(window as any).electronAPI,
  isMobile:   () => /Mobi|Android|iPhone/i.test(navigator.userAgent),
  isPWA:      () => window.matchMedia("(display-mode: standalone)").matches,
  isOnline:   () => navigator.onLine,
  isLowEnd:   () => (navigator as any).hardwareConcurrency <= 2,
};

// - Open URL -
export async function openURL(url: string): Promise<void> {
  if (Platform.isElectron()) {
    await (window as any).electronAPI?.openExternal(url);
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

// - Performance marks -
export function mark(name: string): void {
  try { performance.mark(name); } catch { /* */ }
}

export function measure(name: string, start: string, end: string): number {
  try {
    performance.measure(name, start, end);
    return performance.getEntriesByName(name)[0]?.duration || 0;
  } catch { return 0; }
}

// - Prefetch route -
export function preloadRoute(path: string): void {
  if ("requestIdleCallback" in window) {
    (window as any).requestIdleCallback(() => {
      const link = document.createElement("link");
      link.rel  = "prefetch";
      link.href = path;
      document.head.appendChild(link);
    });
  }
}

// - Request deduplication -
// Prevents N identical in-flight API calls from firing simultaneously
const inflightMap = new Map<string, Promise<any>>();

export function dedupe<T>(key: string, factory: () => Promise<T>): Promise<T> {
  if (inflightMap.has(key)) return inflightMap.get(key) as Promise<T>;
  const promise = factory().finally(() => inflightMap.delete(key));
  inflightMap.set(key, promise);
  return promise;
}

// - Concurrency limiter -
// Useful for bulk operations - run max N promises at a time
export async function pLimit<T>(
  tasks: Array<() => Promise<T>>,
  concurrency = 4
): Promise<T[]> {
  const results: T[] = [];
  let index = 0;

  async function worker(): Promise<void> {
    while (index < tasks.length) {
      const taskIndex = index++;
      results[taskIndex] = await tasks[taskIndex]();
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker));
  return results;
}

// - Debounce -
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}

// - Throttle -
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limitMs: number
): (...args: Parameters<T>) => void {
  let lastRun = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastRun >= limitMs) {
      lastRun = now;
      fn(...args);
    }
  };
}

// - Retry with exponential backoff -
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 500
): Promise<T> {
  let lastError: any;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, baseDelayMs * Math.pow(2, attempt - 1)));
      }
    }
  }
  throw lastError;
}

// - Timeout wrapper -
export function withTimeout<T>(promise: Promise<T>, ms: number, label = "request"): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

// - Chunk array -
export function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

// - Memoize (synchronous) -
export function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map<string, ReturnType<T>>();
  return ((...args: any[]) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

// - Measure async performance -
export async function timed<T>(label: string, fn: () => Promise<T>): Promise<{ result: T; ms: number }> {
  const start = performance.now();
  const result = await fn();
  const ms = Math.round(performance.now() - start);
  if (process.env.NODE_ENV === "development") console.debug(`[perf] ${label}: ${ms}ms`);
  return { result, ms };
}

// - Idle-time task runner -
export function onIdle(callback: () => void): void {
  if ("requestIdleCallback" in window) {
    (window as any).requestIdleCallback(callback, { timeout: 2000 });
  } else {
    setTimeout(callback, 200);
  }
}

// - Preload critical API data on app init -
export function scheduleApiWarmUp(warmUpTasks: Array<() => void>): void {
  onIdle(() => warmUpTasks.forEach(task => { try { task(); } catch { /* silent */ } }));
}
