/**
 * useLocalStorage — ProcurBosse v12.0.0
 * Type-safe localStorage hook with SSR safety and cross-tab sync
 */
import { useState, useEffect, useCallback } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [stored, setStored] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStored(prev => {
      const next = typeof value === "function" ? (value as (prev: T) => T)(prev) : value;
      try { window.localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [key]);

  const remove = useCallback(() => {
    try { window.localStorage.removeItem(key); } catch {}
    setStored(initialValue);
  }, [key, initialValue]);

  // Cross-tab sync
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try { setStored(JSON.parse(e.newValue) as T); } catch {}
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [key]);

  return [stored, setValue, remove] as const;
}
