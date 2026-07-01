/**
 * EL5 MediProcure — Network Engine: Security Guard
 * Client-side hardening layer that sits alongside the circuit breaker:
 *  - Anti-replay nonces on state-changing edge function calls (approvals,
 *    payments, sends) so a captured/replayed request is rejected server-side
 *    if the edge function checks the nonce header.
 *  - Failed-auth / failed-mutation throttling per action key, independent
 *    of the network circuit breaker, to slow down brute-force or scripted
 *    abuse from the client before it ever reaches Supabase.
 *  - Secure-context assertion (refuses to run sensitive flows over
 *    non-HTTPS, non-localhost origins).
 *  - PII-safe log redaction helper so debug logging never leaks phone
 *    numbers, emails, or tokens verbatim into the console/telemetry.
 *
 * ProcurBosse · Embu Level 5 Hospital
 */

const THROTTLE_MAX_ATTEMPTS = 5;
const THROTTLE_WINDOW_MS = 60_000;

interface ThrottleEntry {
  attempts: number[];
}
const throttles = new Map<string, ThrottleEntry>();

export class ThrottledError extends Error {
  constructor(key: string, retryAfterMs: number) {
    super(`Too many attempts for "${key}" — retry in ${Math.ceil(retryAfterMs / 1000)}s`);
    this.name = "ThrottledError";
  }
}

/**
 * Client-side rate limiter for sensitive actions (login attempts, OTP
 * checks, approval actions). Complements server-side rate limiting in the
 * api-gateway edge function — this stops obviously-abusive client loops
 * before they even generate network traffic.
 */
export function checkThrottle(key: string, maxAttempts = THROTTLE_MAX_ATTEMPTS, windowMs = THROTTLE_WINDOW_MS): void {
  const now = Date.now();
  let entry = throttles.get(key);
  if (!entry) { entry = { attempts: [] }; throttles.set(key, entry); }
  entry.attempts = entry.attempts.filter((t) => now - t < windowMs);
  if (entry.attempts.length >= maxAttempts) {
    const oldest = entry.attempts[0];
    throw new ThrottledError(key, windowMs - (now - oldest));
  }
  entry.attempts.push(now);
}

export function resetThrottle(key: string): void {
  throttles.delete(key);
}

/** Generates a per-request nonce + timestamp header pair for anti-replay protection. */
export function signRequest(): { "x-el5-nonce": string; "x-el5-ts": string } {
  const nonce = (crypto as any).randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return { "x-el5-nonce": nonce, "x-el5-ts": Date.now().toString() };
}

/** Refuses to proceed with a sensitive action outside a secure context. */
export function assertSecureContext(action: string): void {
  if (typeof window === "undefined") return;
  const isSecure = window.isSecureContext ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  if (!isSecure) {
    throw new Error(`Refusing "${action}": insecure context (non-HTTPS origin)`);
  }
}

const PII_PATTERNS: Array<[RegExp, string]> = [
  [/\b(?:\+?254|0)7\d{8}\b/g, "[phone]"],                          // Kenyan phone numbers
  [/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, "[email]"],                     // emails
  [/\b[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{20,}\b/g, "[jwt]"], // JWT-shaped tokens
  [/\bghp_[A-Za-z0-9]{30,}\b/g, "[github-token]"],
];

/** Redacts common PII/secret shapes from a string before it hits console/telemetry. */
export function redact(input: string): string {
  let out = input;
  for (const [pattern, replacement] of PII_PATTERNS) out = out.replace(pattern, replacement);
  return out;
}

/** Safe console logger — redacts PII/secrets automatically. */
export function secureLog(...args: any[]): void {
  const safe = args.map((a) => (typeof a === "string" ? redact(a) : a));
  // eslint-disable-next-line no-console
  console.log(...safe);
}
