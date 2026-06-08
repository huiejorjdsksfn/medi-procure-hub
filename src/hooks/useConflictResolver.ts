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
  onResolved?: (choice: ConflictChoice, value: T) => void;
}) {
  const { table, id, local, setLocal, onResolved } = opts;
  const dirty = useRef<Set<string>>(new Set());
  const baseline = useRef<T | null>(null);
  const localRef = useRef(local);
  const [remote, setRemote] = useState<T | null>(null);
  const [conflict, setConflict] = useState<string[]>([]);

  useEffect(() => { localRef.current = local; }, [local]);

  const markDirty = useCallback((k: string) => { dirty.current.add(k); }, []);
  const clearDirty = useCallback(() => { dirty.current.clear(); setConflict([]); }, []);
  const setBaseline = useCallback((v: T) => { baseline.current = structuredCloneSafe(v); }, []);

  useEffect(() => {
    if (!id) {
      baseline.current = null;
      setRemote(null);
      setConflict([]);
      dirty.current.clear();
      return;
    }

    const ch = (supabase as any)
      .channel(`conflict-${table}-${id}`)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table, filter: `id=eq.${id}` },
        (payload: any) => {
          const r = payload.new as T;
          const current = localRef.current;
          const base = baseline.current;
          setRemote(r);

          if (!dirty.current.size) {
            setLocal(r);
            setBaseline(r);
            return;
          }

          const clashes: string[] = [];
          dirty.current.forEach(k => {
            const remoteChangedSinceBaseline = !base || !sameValue(r[k], base[k]);
            const remoteDiffersFromMine = !sameValue(r[k], current[k]);
            if (remoteChangedSinceBaseline && remoteDiffersFromMine) clashes.push(k);
          });

          if (clashes.length) {
            setConflict(clashes);
            return;
          }

          const merged: any = { ...r };
          dirty.current.forEach(k => { merged[k] = (current as any)[k]; });
          setLocal(merged);
          baseline.current = structuredCloneSafe(r);
        })
      .subscribe();

    return () => { (supabase as any).removeChannel(ch); };
  }, [table, id, setLocal, setBaseline]);

  const resolve = useCallback((choice: ConflictChoice) => {
    const current = localRef.current;
    if (!remote) { setConflict([]); return; }

    if (choice === "remote") {
      setLocal(remote);
      baseline.current = structuredCloneSafe(remote);
      clearDirty();
      onResolved?.(choice, remote);
      return;
    }

    if (choice === "mine") {
      setConflict([]);
      onResolved?.(choice, current);
      return;
    }

    const merged: any = { ...remote };
    dirty.current.forEach(k => { merged[k] = (current as any)[k]; });
    setLocal(merged);
    baseline.current = structuredCloneSafe(remote);
    setConflict([]);
    onResolved?.(choice, merged);
  }, [remote, setLocal, clearDirty, onResolved]);

  return { markDirty, clearDirty, setBaseline, conflict, resolve, remote, hasConflict: conflict.length > 0 };
}

function sameValue(a: any, b: any) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function structuredCloneSafe<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}
