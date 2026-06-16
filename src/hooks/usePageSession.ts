/**
 * EL5 MediProcure — usePageSession v2.0
 * Drop-in hook for any page: auto-saves & restores tab, search, filters,
 * selected rows, scroll position — survives RoleGuard silent redirects.
 *
 * Usage:
 *   const { state, set, save } = usePageSession("requisitions", { tab:"list", search:"" });
 *   // state is restored from sessionStorage on mount.
 *   // call set("tab", "approval") to update + auto-save.
 *   // scroll restore happens automatically.
 *
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { savePageState, getPageState } from "@/lib/sessionStateCache";

export function usePageSession<T extends Record<string, unknown>>(
  pageKey: string,
  defaults: T,
  maxAgeMs = 45 * 60_000,   // 45 min
) {
  const { user } = useAuth();
  const uid = user?.id || "anon";

  const [state, setStateInner] = useState<T>(() => {
    const cached = getPageState<T>(uid, pageKey, maxAgeMs);
    return cached ? { ...defaults, ...cached } : { ...defaults };
  });

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced auto-save on every state change
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      savePageState(uid, pageKey, state);
    }, 600);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [state, uid, pageKey]);

  // Restore scroll position
  useEffect(() => {
    const saved = getPageState<{ _scrollY?: number } & T>(uid, pageKey, maxAgeMs);
    if (saved?._scrollY) {
      requestAnimationFrame(() => window.scrollTo({ top: saved._scrollY, behavior: "instant" }));
    }
    // Save scroll on unload
    const onUnload = () => {
      savePageState(uid, pageKey, { ...state, _scrollY: window.scrollY } as any);
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, pageKey]);

  const set = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setStateInner(prev => ({ ...prev, [key]: value }));
  }, []);

  const setMany = useCallback((patch: Partial<T>) => {
    setStateInner(prev => ({ ...prev, ...patch }));
  }, []);

  const save = useCallback(() => {
    savePageState(uid, pageKey, state);
  }, [uid, pageKey, state]);

  const reset = useCallback(() => {
    setStateInner({ ...defaults });
  }, [defaults]);

  return { state, set, setMany, save, reset };
}
