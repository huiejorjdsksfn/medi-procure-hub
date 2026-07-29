import { supabase } from "@/integrations/supabase/client";

const SUPA_URL = import.meta.env.VITE_SUPABASE_URL || "https://yvjfehnzbzjliizjvuhq.supabase.co";
const EDGE = `${SUPA_URL}/functions/v1/bulk-ops`;
const KEY  = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

export interface BulkOpResult { success: number; failed: number; errors: any[]; ids: string[]; }

/**
 * callBulkOps — thin wrapper around the bulk-ops edge function (built,
 * transaction-safe, auto-audit-logged server-side; previously never
 * called from anywhere in the app — every page that needed batch writes
 * was instead looping one-row-at-a-time client-side).
 */
export async function callBulkOps(
  operation: "insert" | "update" | "soft_delete",
  table: string,
  payload: { records?: any[]; ids?: string[]; updates?: { id: string; data: any }[] }
): Promise<BulkOpResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");
  const res = await fetch(EDGE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
      "apikey": KEY,
    },
    body: JSON.stringify({ operation, table, ...payload }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || `bulk-ops ${res.status}`);
  }
  return res.json();
}
