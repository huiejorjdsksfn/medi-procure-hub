/**
 * EL5 MediProcure — Network Engine: Circuit Breaker
 * Per-endpoint/table failure isolation so one flaky edge function or
 * table doesn't chew through timeouts on every page that touches it.
 *
 * States: closed (normal) → open (fast-fail) → half-open (probe) → closed
 *
 * ProcurBosse · Embu Level 5 Hospital
 */

type State = "closed" | "open" | "half-open";

interface BreakerEntry {
  state: State;
  failures: number;
  successesInHalfOpen: number;
  openedAt: number;
}

const FAILURE_THRESHOLD = 4;      // consecutive failures before opening
const COOLDOWN_MS = 15_000;       // how long to stay open before probing
const HALF_OPEN_SUCCESSES_NEEDED = 2;

class CircuitBreakerRegistry {
  private breakers = new Map<string, BreakerEntry>();

  private entry(key: string): BreakerEntry {
    let e = this.breakers.get(key);
    if (!e) {
      e = { state: "closed", failures: 0, successesInHalfOpen: 0, openedAt: 0 };
      this.breakers.set(key, e);
    }
    return e;
  }

  /** Can a request go out right now for this key? */
  canRequest(key: string): boolean {
    const e = this.entry(key);
    if (e.state === "closed") return true;
    if (e.state === "open") {
      if (Date.now() - e.openedAt >= COOLDOWN_MS) {
        e.state = "half-open";
        e.successesInHalfOpen = 0;
        return true; // allow the probe request through
      }
      return false;
    }
    // half-open: allow limited probes through
    return true;
  }

  recordSuccess(key: string): void {
    const e = this.entry(key);
    if (e.state === "half-open") {
      e.successesInHalfOpen++;
      if (e.successesInHalfOpen >= HALF_OPEN_SUCCESSES_NEEDED) {
        e.state = "closed";
        e.failures = 0;
      }
    } else {
      e.failures = 0;
    }
  }

  recordFailure(key: string): void {
    const e = this.entry(key);
    if (e.state === "half-open") {
      // probe failed — reopen immediately
      e.state = "open";
      e.openedAt = Date.now();
      e.failures = FAILURE_THRESHOLD;
      return;
    }
    e.failures++;
    if (e.failures >= FAILURE_THRESHOLD) {
      e.state = "open";
      e.openedAt = Date.now();
    }
  }

  getState(key: string): State {
    return this.entry(key).state;
  }

  /** Snapshot for a debug/health panel */
  snapshot(): Record<string, State> {
    const out: Record<string, State> = {};
    this.breakers.forEach((v, k) => (out[k] = v.state));
    return out;
  }

  reset(key: string): void {
    this.breakers.delete(key);
  }
}

export const circuitBreaker = new CircuitBreakerRegistry();
export class CircuitOpenError extends Error {
  constructor(key: string) {
    super(`Circuit open for "${key}" — failing fast, will retry after cooldown`);
    this.name = "CircuitOpenError";
  }
}
