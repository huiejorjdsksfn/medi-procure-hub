import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Options {
  select?: string;
  order?: { column: string; ascending?: boolean };
  filters?: Record<string, any>;
  enabled?: boolean;
}

export function useRealtimeTable<T = any>(table: string, options: Options = {}) {
  const [data, setData]       = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // Stable refs so fetchData doesn't change on every render
  const optRef = useRef(options);
  useEffect(() => { optRef.current = options; });

  const fetchData = useCallback(async () => {
    const opts = optRef.current;
    if (opts.enabled === false) { setLoading(false); return; }
    try {
      setLoading(true);
      let query = (supabase as any).from(table).select(opts.select || "*");
      if (opts.order) {
        query = query.order(opts.order.column, { ascending: opts.order.ascending ?? false });
      }
      if (opts.filters) {
        Object.entries(opts.filters).forEach(([k, v]) => {
          if (v !== undefined && v !== null) query = query.eq(k, v);
        });
      }
      const { data: rows, error: err } = await query;
      if (err) throw err;
      setData(rows || []);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [table]);   // only re-create when table changes

  // Initial load
  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime subscription
  useEffect(() => {
    if (options.enabled === false) return;
    const channelName = `rt-${table}-${Math.random().toString(36).slice(2, 8)}`;
    const ch = (supabase as any)
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [table, fetchData]);   // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, refetch: fetchData };
}
