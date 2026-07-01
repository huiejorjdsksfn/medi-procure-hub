/**
 * EL5 MediProcure — Network Engine v1.0 (orchestrator)
 * Ties connection quality, circuit breaking, priority concurrency, and
 * batch coalescing into one entry point. Wraps around your existing
 * safeFetch / cache / dedupe layers — it doesn't replace them.
 *
 * Usage:
 *   import { netEngine } from "@/lib/networkEngine";
 *
 *   const { data, error } = await netEngine.request(
 *     "suppliers:list",                       // breaker/metrics key
 *     () => supabase.from("suppliers").select("*"),
 *     { priority: "critical" }
 *   );
 *
 * ProcurBosse · Embu Level 5 Hospital
 */
import { connectionMonitor, type NetSnapshot } from "./connectionMonitor";
import { circuitBreaker, CircuitOpenError } from "./circuitBreaker";
import { requestQueue, type Priority } from "./requestQueue";
import { batchLookup, batchStats } from "./batcher";

export interface NetRequestOptions {
  priority?: Priority;
  retries?: number;        // default 1
  timeoutMs?: number;      // default: adaptive from connection quality
  label?: string;
}

export interface NetResult<T> {
  data: T | null;
  error: any;
  circuitOpen?: boolean;
  timedOut?: boolean;
  attempts: number;
}

class NetworkEngine {
  readonly connection = connectionMonitor;
  readonly lookup = batchLookup;

  /**
   * Run a Supabase (or any promise-returning) call through the full
   * optimization stack: circuit breaker → priority queue → adaptive
   * timeout → retry with backoff.
   */
  async request<T = any>(
    key: string,
    factory: () => PromiseLike<{ data: T | null; error: any } | any>,
    opts: NetRequestOptions = {}
  ): Promise<NetResult<T>> {
    const { retries = 1, priority = "normal", label = key } = opts;

    if (!circuitBreaker.canRequest(key)) {
      return { data: null, error: new CircuitOpenError(key), circuitOpen: true, attempts: 0 };
    }

    const timeoutMs = opts.timeoutMs ?? connectionMonitor.suggestedTimeoutMs();
    let lastErr: any = null;
    let attempts = 0;

    for (let attempt = 0; attempt <= retries; attempt++) {
      attempts++;
      const started = performance.now();
      try {
        const result = await requestQueue.enqueue(
          () =>
            Promise.race([
              Promise.resolve(factory()),
              new Promise((_, rej) =>
                setTimeout(() => rej(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs)
              ),
            ]) as Promise<any>,
          priority
        );

        connectionMonitor.recordRTT(performance.now() - started);

        if (result && result.error) {
          lastErr = result.error;
          circuitBreaker.recordFailure(key);
          if (attempt < retries) {
            await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
            continue;
          }
          return { data: null, error: lastErr, attempts };
        }

        circuitBreaker.recordSuccess(key);
        return { data: (result?.data ?? result) as T, error: null, attempts };
      } catch (e: any) {
        lastErr = e;
        circuitBreaker.recordFailure(key);
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
          continue;
        }
      }
    }

    return {
      data: null,
      error: lastErr,
      timedOut: /timed out/.test(String(lastErr?.message || "")),
      attempts,
    };
  }

  /** Warm up a connection to an edge function / host before it's actually needed */
  preconnect(url: string): void {
    try {
      const link = document.createElement("link");
      link.rel = "preconnect";
      link.href = url;
      link.crossOrigin = "anonymous";
      document.head.appendChild(link);
    } catch {
      /* no-op in non-DOM environments */
    }
  }

  /** Snapshot for a live health/debug panel */
  health() {
    return {
      connection: connectionMonitor.get(),
      queue: requestQueue.stats(),
      breakers: circuitBreaker.snapshot(),
      batching: batchStats(),
    };
  }

  onConnectionChange(fn: (snap: NetSnapshot) => void): () => void {
    return connectionMonitor.subscribe(fn);
  }
}

export const netEngine = new NetworkEngine();
export { connectionMonitor, circuitBreaker, requestQueue, batchLookup };
export type { NetSnapshot, Priority };
