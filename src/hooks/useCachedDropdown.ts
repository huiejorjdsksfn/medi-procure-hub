/**
 * useCachedDropdown — in-memory cache + server-side paginated dropdown loader.
 * Avoids re-fetching identical lists across pages within a session.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type CacheEntry = { ts: number; rows: any[] };
const CACHE = new Map<string, CacheEntry>();
const TTL = 60_000; // 1 minute

export function useCachedDropdown(opts: {
  table: string;
  select?: string;
  filter?: Record<string, any>;
  order?: string;
  limit?: number;
}) {
  const { table, select = "id,name", filter, order = "name", limit = 200 } = opts;
  const key = `${table}|${select}|${JSON.stringify(filter||{})}|${order}|${limit}`;
  const [rows, setRows] = useState<any[]>(() => CACHE.get(key)?.rows || []);
  const [loading, setLoading] = useState(!CACHE.get(key));

  const load = useCallback(async (force = false) => {
    const c = CACHE.get(key);
    if (!force && c && Date.now() - c.ts < TTL) { setRows(c.rows); setLoading(false); return; }
    setLoading(true);
    let q = (supabase as any).from(table).select(select).order(order).limit(limit);
    if (filter) for (const [k,v] of Object.entries(filter)) q = q.eq(k, v);
    const { data } = await q;
    const r = data || [];
    CACHE.set(key, { ts: Date.now(), rows: r });
    setRows(r);
    setLoading(false);
  }, [key, table, select, order, limit, filter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = (supabase as any)
      .channel(`dd-cache-${table}-${key}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => {
        CACHE.delete(key); load(true);
      })
      .subscribe();
    return () => (supabase as any).removeChannel(ch);
  }, [table, key, load]);

  return { rows, loading, reload: () => load(true) };
}

export function invalidateDropdownCache(table?: string) {
  if (!table) { CACHE.clear(); return; }
  for (const k of CACHE.keys()) if (k.startsWith(table + "|")) CACHE.delete(k);
}