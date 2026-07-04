/**
 * EL5 MediProcure — Shared Failover / Resilience Utilities v1.0
 * Used by backend Edge Function processors to survive transient failures
 * in external services (Twilio, MySQL, MSSQL/ODBC bridge, SMTP, AI, etc.)
 *
 * Provides:
 *  - withRetry()      exponential backoff + jitter retry wrapper
 *  - withTimeout()    per-attempt timeout guard
 *  - CircuitBreaker    per-service circuit breaker, state persisted to
 *                      `system_circuit_breaker` so it survives cold starts
 *  - guardedCall()     retry + circuit breaker combined
 *  - failoverChain()   tries an ordered list of providers, first success wins
 *  - logFailoverEvent() best-effort observability write to `system_failover_log`
 *
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface RetryOptions {
  /** total attempts including the first (default 3) */
  attempts?: number;
  /** initial backoff delay in ms (default 300) */
  baseDelayMs?: number;
  /** max backoff delay in ms (default 5000) */
  maxDelayMs?: number;
  /** per-attempt timeout in ms (default 10000) */
  timeoutMs?: number;
  onRetry?: (err: unknown, attempt: number) => void;
}

export interface CircuitBreakerOptions {
  /** consecutive failures before the circuit opens (default 5) */
  failureThreshold?: number;
  /** time the circuit stays open before allowing a trial request (default 30000ms) */
  cooldownMs?: number;
  /** consecutive half-open successes needed to fully close (default 2) */
  halfOpenSuccesses?: number;
}

export type CircuitState = "closed" | "open" | "half_open";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Reject a promise if it does not settle within `ms` milliseconds. */
export async function withTimeout<T>(p: Promise<T>, ms: number, label = "operation"): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

/** Retry an async operation with exponential backoff + jitter. */
export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const attempts = opts.attempts ?? 3;
  const base = opts.baseDelayMs ?? 300;
  const max = opts.maxDelayMs ?? 5000;
  const timeoutMs = opts.timeoutMs ?? 10000;
  let lastErr: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await withTimeout(fn(), timeoutMs, `attempt ${i}`);
    } catch (err) {
      lastErr = err;
      opts.onRetry?.(err, i);
      if (i < attempts) {
        const jitter = 0.75 + Math.random() * 0.5;
        await sleep(Math.min(max, base * 2 ** (i - 1)) * jitter);
      }
    }
  }
  throw lastErr;
}

/** Best-effort observability write — never throws, never blocks the caller. */
export async function logFailoverEvent(
  sb: SupabaseClient,
  serviceKey: string,
  event: "retry" | "circuit_open" | "circuit_close" | "provider_fallback" | "failure",
  detail?: string,
) {
  try {
    await sb.from("system_failover_log").insert({ service_key: serviceKey, event, detail: detail?.slice(0, 500) ?? null });
  } catch {
    // observability must never break the primary flow
  }
}

interface BreakerMemState {
  state: CircuitState;
  failures: number;
  openedAt: number;
  halfOpenSuccesses: number;
}

// In-memory cache so warm invocations don't hit Postgres on every call.
const memoryState = new Map<string, BreakerMemState>();

/**
 * Per-service circuit breaker. State is cached in-memory for the life of the
 * isolate and persisted to `system_circuit_breaker` so a cold start (new
 * isolate) still respects an open circuit tripped by a previous instance.
 */
export class CircuitBreaker {
  private key: string;
  private sb: SupabaseClient;
  private opts: Required<CircuitBreakerOptions>;

  constructor(sb: SupabaseClient, serviceKey: string, opts: CircuitBreakerOptions = {}) {
    this.sb = sb;
    this.key = serviceKey;
    this.opts = {
      failureThreshold: opts.failureThreshold ?? 5,
      cooldownMs: opts.cooldownMs ?? 30000,
      halfOpenSuccesses: opts.halfOpenSuccesses ?? 2,
    };
  }

  private async loadState(): Promise<BreakerMemState> {
    const cached = memoryState.get(this.key);
    if (cached) return cached;
    let s: BreakerMemState = { state: "closed", failures: 0, openedAt: 0, halfOpenSuccesses: 0 };
    try {
      const { data } = await this.sb
        .from("system_circuit_breaker")
        .select("state,failure_count,opened_at")
        .eq("service_key", this.key)
        .maybeSingle();
      if (data) {
        s = {
          state: (data.state as CircuitState) ?? "closed",
          failures: data.failure_count ?? 0,
          openedAt: data.opened_at ? new Date(data.opened_at as string).getTime() : 0,
          halfOpenSuccesses: 0,
        };
      }
    } catch {
      // hydration failure — fall back to a closed circuit rather than blocking traffic
    }
    memoryState.set(this.key, s);
    return s;
  }

  private persist(s: BreakerMemState) {
    memoryState.set(this.key, s);
    // fire-and-forget — persistence must never slow down the caller
    this.sb
      .from("system_circuit_breaker")
      .upsert(
        {
          service_key: this.key,
          state: s.state,
          failure_count: s.failures,
          opened_at: s.openedAt ? new Date(s.openedAt).toISOString() : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "service_key" },
      )
      .then(() => {})
      .catch(() => {});
  }

  /** Returns true if a call should be attempted right now. */
  async allow(): Promise<boolean> {
    const s = await this.loadState();
    if (s.state === "closed") return true;
    if (s.state === "open") {
      if (Date.now() - s.openedAt >= this.opts.cooldownMs) {
        s.state = "half_open";
        s.halfOpenSuccesses = 0;
        this.persist(s);
        return true;
      }
      return false;
    }
    return true; // half_open trial request
  }

  async recordSuccess(): Promise<void> {
    const s = await this.loadState();
    if (s.state === "half_open") {
      s.halfOpenSuccesses += 1;
      if (s.halfOpenSuccesses >= this.opts.halfOpenSuccesses) {
        s.state = "closed";
        s.failures = 0;
        s.openedAt = 0;
        await logFailoverEvent(this.sb, this.key, "circuit_close", "recovered after half-open trial");
      }
    } else {
      s.failures = 0;
    }
    this.persist(s);
  }

  async recordFailure(errMsg?: string): Promise<void> {
    const s = await this.loadState();
    if (s.state === "half_open") {
      s.state = "open";
      s.openedAt = Date.now();
      s.failures += 1;
      await logFailoverEvent(this.sb, this.key, "circuit_open", `half-open trial failed: ${errMsg ?? ""}`);
    } else {
      s.failures += 1;
      if (s.failures >= this.opts.failureThreshold) {
        s.state = "open";
        s.openedAt = Date.now();
        await logFailoverEvent(this.sb, this.key, "circuit_open", `${s.failures} consecutive failures: ${errMsg ?? ""}`);
      }
    }
    this.persist(s);
  }

  async status() {
    const s = await this.loadState();
    return { service: this.key, ...s };
  }
}

/** Retry + circuit breaker combined. Throws `circuit_open:<key>` if the breaker is tripped. */
export async function guardedCall<T>(
  sb: SupabaseClient,
  serviceKey: string,
  fn: () => Promise<T>,
  opts: { retry?: RetryOptions; breaker?: CircuitBreakerOptions } = {},
): Promise<T> {
  const breaker = new CircuitBreaker(sb, serviceKey, opts.breaker);
  if (!(await breaker.allow())) {
    throw new Error(`circuit_open:${serviceKey}`);
  }
  try {
    const result = await withRetry(fn, {
      ...opts.retry,
      onRetry: (err, attempt) => {
        logFailoverEvent(sb, serviceKey, "retry", `attempt ${attempt}: ${(err as Error)?.message ?? err}`);
        opts.retry?.onRetry?.(err, attempt);
      },
    });
    await breaker.recordSuccess();
    return result;
  } catch (err) {
    await breaker.recordFailure((err as Error)?.message);
    throw err;
  }
}

/**
 * Try an ordered list of providers, each guarded independently. Returns the
 * first success. Every provider that fails is logged as a fallback event.
 */
export async function failoverChain<T>(
  sb: SupabaseClient,
  providers: { key: string; call: () => Promise<T> }[],
  opts: { retry?: RetryOptions; breaker?: CircuitBreakerOptions } = {},
): Promise<{ result: T; provider: string }> {
  let lastErr: unknown;
  for (const p of providers) {
    try {
      const result = await guardedCall(sb, p.key, p.call, opts);
      return { result, provider: p.key };
    } catch (err) {
      lastErr = err;
      await logFailoverEvent(sb, p.key, "provider_fallback", (err as Error)?.message ?? String(err));
      continue;
    }
  }
  throw lastErr ?? new Error("all_providers_failed");
}

/** Snapshot of all known circuit breakers, for health dashboards. */
export async function allCircuitStatuses(sb: SupabaseClient) {
  const { data, error } = await sb
    .from("system_circuit_breaker")
    .select("service_key,state,failure_count,opened_at,updated_at")
    .order("service_key");
  if (error) return [];
  return data ?? [];
}
