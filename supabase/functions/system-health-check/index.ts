/**
 * EL5 MediProcure — System Health Check Edge Function v1.0
 * Replaces Webmaster's old hardcoded "System Information" panel (which
 * claimed "PostgreSQL 15" when the project has been on 17 for a while —
 * stale info nobody was updating by hand) with real, live-checked status
 * for the services this app actually depends on. Runs server-side because
 * several of these (SMTP config validity, Twilio account verification)
 * either can't be checked from a browser at all or would leak credentials
 * to the client if they were.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TWILIO_ACCT  = Deno.env.get("TWILIO_ACCOUNT_SID") || "";
const TWILIO_AUTH  = Deno.env.get("TWILIO_AUTH_TOKEN") || "";
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";

const db = createClient(SUPABASE_URL, SERVICE_KEY);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

async function checkDb() {
  try {
    const { error } = await db.from("system_settings").select("key").limit(1);
    if (error) throw error;
    return { ok: true, detail: "Reachable (Supabase Postgres 17)", verified: "live" };
  } catch (e: any) {
    return { ok: false, detail: e.message };
  }
}

async function checkSmtp() {
  try {
    const { data } = await db.from("system_settings").select("key,value").in("key", ["smtp_enabled", "smtp_host", "smtp_user", "smtp_pass"]);
    const map: Record<string, string> = {};
    for (const r of data || []) map[r.key] = r.value;
    const enabled = map.smtp_enabled === "true";
    const configured = !!(map.smtp_host && map.smtp_user && map.smtp_pass);
    if (!enabled) return { ok: false, detail: "SMTP disabled in Settings" };
    if (!configured) return { ok: false, detail: `Missing ${!map.smtp_host ? "host" : !map.smtp_user ? "user" : "password"} — Settings → Email/SMTP` };
    // A real socket-level SMTP test is a bigger lift than this check
    // warrants; this confirms config completeness honestly, not a live
    // connection — labelled as such in the response so the UI doesn't
    // overstate it.
    return { ok: true, detail: `Configured (${map.smtp_host})`, verified: "config-only" };
  } catch (e: any) {
    return { ok: false, detail: e.message };
  }
}

async function checkTwilio() {
  if (!TWILIO_ACCT || !TWILIO_AUTH) return { ok: false, detail: "Not configured" };
  try {
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCT}.json`, {
      headers: { Authorization: `Basic ${btoa(`${TWILIO_ACCT}:${TWILIO_AUTH}`)}` },
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) return { ok: false, detail: `Auth failed (${r.status})` };
    const d = await r.json();
    return { ok: true, detail: `${d.friendly_name || "Verified"} · ${d.status}`, verified: "live" };
  } catch (e: any) {
    return { ok: false, detail: e.message };
  }
}

async function checkStorage() {
  try {
    const { data, error } = await db.storage.listBuckets();
    if (error) throw error;
    return { ok: true, detail: `${data?.length || 0} buckets`, verified: "live" };
  } catch (e: any) {
    return { ok: false, detail: e.message };
  }
}

function checkAi() {
  return ANTHROPIC_KEY
    ? { ok: true, detail: "Claude API key configured", verified: "config-only" }
    : { ok: false, detail: "Not configured — AI features run on fallback text" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const [dbRes, smtpRes, twilioRes, storageRes] = await Promise.all([
      checkDb(), checkSmtp(), checkTwilio(), checkStorage(),
    ]);
    const aiRes = checkAi();
    const results = { database: dbRes, smtp: smtpRes, sms: twilioRes, storage: storageRes, ai: aiRes };
    const healthyCount = Object.values(results).filter((r: any) => r.ok).length;
    return new Response(JSON.stringify({
      ok: true, checkedAt: new Date().toISOString(),
      healthyCount, totalCount: Object.keys(results).length,
      results,
    }), { headers: CORS });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: CORS });
  }
});
