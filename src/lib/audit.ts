import { db, supabase } from "@/integrations/supabase/client";
import { withCorrelation } from "@/lib/correlation";

const SUPA_URL = import.meta.env.VITE_SUPABASE_URL || "https://yvjfehnzbzjliizjvuhq.supabase.co";
const EDGE = `${SUPA_URL}/functions/v1`;
const KEY  = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

/**
 * logAudit — writes to two places now, not one:
 *
 * 1. `audit_log` (unchanged) — the primary, user-facing trail every
 *    audit-log viewer page in the app already reads from.
 *
 * 2. The `audit-api` edge function, which existed fully built and
 *    working but was never actually called from anywhere in the app —
 *    it writes to `admin_activity_log` with the requester's IP address
 *    captured server-side from the request itself, not from whatever
 *    the client claims. That's the actual "tamper-evident" property an
 *    audit trail needs: a client-side insert can't attest to its own
 *    origin, an edge function reading `x-forwarded-for` off the raw
 *    request can. This is additive and best-effort — if the edge call
 *    fails (offline, cold start, etc.) the primary audit_log write
 *    above has already happened, so nothing is lost.
 */
export const logAudit = async (
  userId: string | undefined,
  userName: string | undefined,
  action: string,
  module: string,
  recordId?: string,
  details?: Record<string, any>
) => {
  try {
    await (db as any).from("audit_log").insert({
      user_id: userId || null,
      user_name: userName || "System",
      action,
      module,
      record_id: recordId || null,
      details: withCorrelation({ ...(details || {}) }),
    });
  } catch (e) {
    console.error("Audit log error:", e);
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return; // audit-api requires an authenticated caller
    await fetch(`${EDGE}/audit-api`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
        "apikey": KEY,
      },
      body: JSON.stringify({
        action, entity_type: module, entity_id: recordId,
        new_values: details || {}, severity: "info",
        description: `${action} on ${module}${recordId ? ` (${recordId})` : ""}`,
      }),
    });
  } catch (e) {
    // Best-effort secondary trail — never let this block or fail the caller.
    console.warn("Secondary audit trail (audit-api) unavailable:", e);
  }
};
