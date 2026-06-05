/**
 * safeFetch - hardens Supabase queries against indefinite spinners
 * - Per-query timeout (default 8s)
 * - Optional retry with backoff
 * - Always resolves with { data, error } shape; never throws
 */
export interface SafeResult<T = any> {
  data: T | null;
  error: any;
  timedOut?: boolean;
}

export async function safeFetch<T = any>(
  queryFactory: () => PromiseLike<{ data: T | null; error: any } | any>,
  opts: { timeoutMs?: number; retries?: number; label?: string } = {}
): Promise<SafeResult<T>> {
  const { timeoutMs = 8000, retries = 1, label = "query" } = opts;
  let lastErr: any = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await Promise.race([
        Promise.resolve(queryFactory()),
        new Promise((_, rej) => setTimeout(() => rej(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs)),
      ]) as any;
      if (res && res.error) { lastErr = res.error; continue; }
      return { data: (res?.data ?? null) as T | null, error: null };
    } catch (e: any) {
      lastErr = e;
      if (attempt < retries) await new Promise(r => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  return { data: null, error: lastErr, timedOut: /timed out/.test(String(lastErr?.message || "")) };
}