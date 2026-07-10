/**
 * Correlation IDs — stable per browser tab, rolling per user "trace".
 * Every audit / device / action log stamps `session_id` + `correlation_id`
 * so a single user journey can be reconstructed across tabs and edge fns.
 */
const SID_KEY = "pb_corr_session";
const TID_KEY = "pb_corr_trace";

function uuid(): string {
  try { return crypto.randomUUID(); } catch { /* older ff */ }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getSessionCorrelationId(): string {
  try {
    let v = sessionStorage.getItem(SID_KEY);
    if (!v) { v = uuid(); sessionStorage.setItem(SID_KEY, v); }
    return v;
  } catch { return uuid(); }
}

export function getTraceId(): string {
  try {
    let v = sessionStorage.getItem(TID_KEY);
    if (!v) { v = uuid(); sessionStorage.setItem(TID_KEY, v); }
    return v;
  } catch { return uuid(); }
}

/** Roll the trace ID — call after a major nav or after logout. */
export function rotateTraceId(): string {
  const v = uuid();
  try { sessionStorage.setItem(TID_KEY, v); } catch { /* ignore */ }
  return v;
}

/** Attach standard correlation fields to any log payload. */
export function withCorrelation<T extends Record<string, any>>(payload: T): T & {
  session_id: string; correlation_id: string; trace_id: string; logged_at: string;
} {
  return {
    ...payload,
    session_id: getSessionCorrelationId(),
    correlation_id: getTraceId(),
    trace_id: getTraceId(),
    logged_at: new Date().toISOString(),
  };
}
