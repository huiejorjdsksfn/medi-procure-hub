/**
 * Fire-and-forget 404 logger.
 * Writes directly to public.not_found_log (anon INSERT allowed by RLS) AND
 * calls the track-404 edge function so the server records the real IP.
 */
import { supabase } from "@/integrations/supabase/client";

const FN_URL =
  (import.meta.env.VITE_SUPABASE_URL || "") + "/functions/v1/track-404";

const seen = new Set<string>();

export async function logNotFound(input: {
  path: string;
  user_id?: string | null;
  user_role?: string | null;
}) {
  // De-dupe identical paths within a single browser session
  const key = (input.user_id || "anon") + "|" + input.path;
  if (seen.has(key)) return;
  seen.add(key);

  const payload = {
    path: input.path,
    referrer: typeof document !== "undefined" ? document.referrer || null : null,
    user_id: input.user_id || null,
    user_role: input.user_role || null,
  };

  // Client insert (RLS-friendly, captures even if edge function is cold)
  try {
    await (supabase as any).from("not_found_log").insert({
      ...payload,
      user_agent:
        typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 512) : null,
      source: "client",
    });
  } catch {/* swallow */}

  // Server-side mirror (captures real IP)
  try {
    await fetch(FN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {/* swallow */}
}