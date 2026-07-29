import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const SUPA_URL = import.meta.env.VITE_SUPABASE_URL || "https://yvjfehnzbzjliizjvuhq.supabase.co";
const EDGE = `${SUPA_URL}/functions/v1/concurrency-api`;
const KEY  = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

async function callConcurrency(body: Record<string, any>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  try {
    const res = await fetch(EDGE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
        "apikey": KEY,
      },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * useRecordLock — soft "someone else is editing this" indicator, backed
 * by concurrency-api (built, fixed, and previously never called from
 * anywhere). Locks are advisory and short-lived (15s, auto-renewed
 * every 10s while active) — this is a courtesy heads-up to reduce
 * accidental overwrites between staff editing the same record, not a
 * hard database-enforced lock.
 */
export function useRecordLock(table: string, recordId: string | null | undefined) {
  const [heldByOther, setHeldByOther] = useState<{ name: string; expiresAt: string } | null>(null);
  const renewRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeRef = useRef(false);

  const acquire = useCallback(async () => {
    if (!recordId) return true;
    const res = await callConcurrency({ operation: "lock", table, record_id: recordId });
    if (!res) return true; // edge function unreachable — don't block editing over it
    if (res.locked) {
      setHeldByOther(null);
      activeRef.current = true;
      if (renewRef.current) clearInterval(renewRef.current);
      renewRef.current = setInterval(() => {
        callConcurrency({ operation: "lock", table, record_id: recordId });
      }, 10000);
      return true;
    }
    setHeldByOther({ name: res.heldBy || "another user", expiresAt: res.expiresAt });
    return false;
  }, [table, recordId]);

  const release = useCallback(() => {
    if (renewRef.current) { clearInterval(renewRef.current); renewRef.current = null; }
    if (activeRef.current && recordId) {
      callConcurrency({ operation: "unlock", table, record_id: recordId });
      activeRef.current = false;
    }
  }, [table, recordId]);

  useEffect(() => () => release(), [release]);

  return { heldByOther, acquire, release };
}
