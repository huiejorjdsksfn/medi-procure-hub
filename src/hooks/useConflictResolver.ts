/**
 * useConflictResolver — generic concurrent-edit guard for any form.
 * Tracks locally dirty fields, watches remote updates, surfaces a conflict
 * banner with Keep mine / Merge / Use remote actions.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ConflictChoice = "mine" | "merge" | "remote";

export function useConflictResolver<T extends Record<string, any>>(opts: {
  table: string;
  id: string | null | undefined;
  local: T;
  setLocal: (v: T) => void;
}) {
  const { table, id, local, setLocal } = opts;
  const dirty = useRef<Set<string>>(new Set());
  const baseline = useRef<T | null>(null);
  const [remote, setRemote] = useState<T | null>(null);
  const [conflict, setConflict] = useState<string[]>([]);

  const markDirty = useCallback((k: string) => { dirty.current.add(k); }, []);
  const clearDirty = useCallback(() => { dirty.current.clear(); setConflict([]); }, []);
  const setBaseline = useCallback((v: T) => { baseline.current = v; }, []);

  useEffect(() => {
    if (!id) return;
    const ch = (supabase as any)
      .channel(`conflict-${table}-${id}`)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table, filter: `id=eq.${id}` },
        (payload: any) => {
          const r = payload.new as T;
          setRemote(r);
          if (!dirty.current.size) { setLocal(r); setBaseline(r); return; }
          const clashes: string[] = [];
          dirty.current.forEach(k => {
            if (JSON.stringify(r[k]) !== JSON.stringify(local[k])) clashes.push(k);
          });
          if (clashes.length) setConflict(clashes);
          else { /* no clash — merge remote non-dirty fields */
            const merged: any = { ...r };
            dirty.current.forEach(k => { merged[k] = (local as any)[k]; });
            setLocal(merged);
          }
        })
      .subscribe();
    return () => { (supabase as any).removeChannel(ch); };
  }, [table, id, local, setLocal, setBaseline]);

  const resolve = useCallback((choice: ConflictChoice) => {
    if (!remote) { setConflict([]); return; }
    if (choice === "remote") { setLocal(remote); clearDirty(); return; }
    if (choice === "mine")   { setConflict([]); return; }
    // merge: take remote everywhere except dirty keys
    const merged: any = { ...remote };
    dirty.current.forEach(k => { merged[k] = (local as any)[k]; });
    setLocal(merged);
    setConflict([]);
  }, [remote, local, setLocal, clearDirty]);

  return { markDirty, clearDirty, setBaseline, conflict, resolve, remote };
}