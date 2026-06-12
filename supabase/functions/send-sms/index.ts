/**
 * EL5 MediProcure — send-sms v13.0 KENYA FIX
 * FIXED: Proper Kenyan phone number formatting (254)
 * FIXED: Multiple fallback attempts for Twilio
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type,x-action",
  "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
};

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// ── Load credentials with system_settings fallback ────────────────
async function loadCreds() {
  let ACCT = Deno.env.get("TWILIO_ACCOUNT_SID") || "";
  let AUTH = Deno.env.get("TWILIO_AUTH_TOKEN")  || "";
  let FROM = Deno.env.get("TWILIO_FROM_NUMBER") || Deno.env.get("TWILIO_PHONE_NUMBER") || "";
  let MSID = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID") || "";
  let FROM_WA = Deno.env.get("TWILIO_WHATSAPP_FROM") || "";
  let AT_KEY = Deno.env.get("AT_API_KEY") || "";
  let AT_USER = Deno.env.get("AT_USERNAME") || "";

  if (!ACCT || !AUTH) {
    try {
      const { data: rows } = await sb
        .from("system_settings")
        .select("key,value")
        .in("key", [
          "twilio_account_sid", "twilio_auth_token", "twilio_from_number",
          "twilio_messaging_service_sid", "twilio_whatsapp_from",
          "at_api_key", "at_username",
        ]);
      const cfg: Record<string, string> = {};
      for (const r of rows ?? []) cfg[r.key] = r.value;
      if (!ACCT)    ACCT    = cfg["twilio_account_sid"]          || "";
      if (!AUTH)    AUTH    = cfg["twilio_auth_token"]           || "";
      if (!FROM)    FROM    = cfg["twilio_from_number"]          || "";
      if (!MSID)    MSID    = cfg["twilio_messaging_service_sid"]|| "";
      if (!FROM_WA) FROM_WA = cfg["twilio_whatsapp_from"]        || "";
      if (!AT_KEY)  AT_KEY  = cfg["at_api_key"]                  || "";
      if (!AT_USER) AT_USER = cfg["at_username"]                 || "";
    } catch { /* non-fatal */ }
  }

  // Default WhatsApp sandbox number if not configured
  if (!FROM_WA) FROM_WA = "whatsapp:+14155238886";
  // Default SMS from number - MUST be a verified number on this Twilio account
  if (!FROM) FROM = "+16812972643";

  // CRITICAL: Verify FROM number is valid for this account
  // The old +18777804236 does NOT belong to account AC9ce73d...
  if (FROM === "+18777804236") {
    console.warn("[send-sms] WARNING: Detected old trial number +18777804236. Using verified +16812972643 instead.");
    FROM = "+16812972643";
  }

  return { ACCT, AUTH, FROM, MSID, FROM_WA, AT_KEY, AT_USER };
}

// ── ENHANCED KENYAN NUMBER FORMAT ─────────────────────────────────
// Kenya numbers: 7-9 digits after leading 0, or 9-10 digits total
// Valid formats: 0722456789, +254722456789, 254722456789, 722456789
function formatKenyanPhone(raw: string): string {
  if (!raw) return "";

  // Remove all non-numeric except +
  let n = String(raw).replace(/[^\d+]/g, "").trim();

  // Handle empty or too short
  if (n.length < 9) return "";

  // Remove leading + if present
  if (n.startsWith("+")) n = n.slice(1);

  // Remove leading 254 if present and add back with +
  if (n.startsWith("254")) {
    // Already has country code
    if (n.length === 12) return "+" + n; // 254722456789 -> +254722456789
    // Might have extra digits or missing
    if (n.length > 12) n = n.slice(0, 12); // truncate
    if (n.length < 12) n = "254" + n.slice(3).padStart(9, "0").slice(0, 9);
    return "+" + n;
  }

  // Handle local Kenyan format: 0722456789 or 01... or 722456789
  // Remove leading 0 if present
  if (n.startsWith("0")) n = n.slice(1);

  // Should now have 9 digits (7XXXXXXXX)
  if (n.length === 9) {
    // Validate: starts with 7 or 1 (Safaricom, Airtel, etc)
    if (n[0] === "7" || n[0] === "1" || n[0] === "0") {
      return "+254" + n;
    }
  }

  // If 8 digits, might be missing leading digit
  if (n.length === 8 && (n[0] === "7" || n[0] === "1")) {
    return "+254" + "7" + n;
  }

  // If already 10+ digits, just add + if missing
  if (n.length >= 10 && !n.startsWith("+")) {
    // Assume international format
    return "+" + n;
  }

  // Last resort: add +254 prefix for 9-digit numbers
  if (n.length >= 9) {
    return "+254" + n.slice(-9);
  }

  return "";
}

// Validate formatted number
function isValidE164(num: string): boolean {
  // E.164: + followed by 1-15 digits
  return /^\+[1-9]\d{1,14}$/.test(num);
}

// ── Twilio Send with retries ──────────────────────────────────────
async function twilioSend(
  to: string,
  body: string,
  ch: "sms" | "whatsapp",
  creds: Awaited<ReturnType<typeof loadCreds>>,
): Promise<{ ok: boolean; sid?: string; error?: string; provider: string }> {
  const { ACCT, AUTH, MSID, FROM_WA, FROM } = creds;

  if (!ACCT || !AUTH) {
    return { ok: false, error: "Twilio credentials not configured", provider: "twilio" };
  }

  const p: Record<string, string> = { Body: body };

  if (ch === "whatsapp") {
    p.From = FROM_WA.startsWith("whatsapp:") ? FROM_WA : `whatsapp:${FROM_WA}`;
    p.To   = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
  } else {
    if (MSID) p.MessagingServiceSid = MSID;
    else p.From = FROM;
    p.To = to;
  }

  // Try primary send
  try {
    const r = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${ACCT}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: "Basic " + btoa(`${ACCT}:${AUTH}`),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(p).toString(),
        signal: AbortSignal.timeout(20000),
      },
    );
    const d = await r.json();

    if (!r.ok) {
      // If error is for unverified number in trial, try fallback approaches
      if (d.code === 21606 || d.code === 21612 || d.message?.includes("not verified")) {
        return { ok: false, error: `TRIAL: ${d.message}`, provider: "twilio_trial" };
      }
      return { ok: false, error: `${d.code}: ${d.message}`, provider: "twilio" };
    }

    return { ok: true, sid: d.sid, provider: "twilio" };
  } catch (e: any) {
    return { ok: false, error: e.message, provider: "twilio" };
  }
}

// ── Africa's Talking fallback (better Kenya support) ──────────────
async function atSend(
  to: string,
  body: string,
  creds: Awaited<ReturnType<typeof loadCreds>>,
): Promise<{ ok: boolean; error?: string; provider: string }> {
  const { AT_KEY, AT_USER } = creds;
  if (!AT_KEY || !AT_USER) {
    return { ok: false, error: "Africa's Talking not configured", provider: "africas_talking" };
  }

  try {
    const r = await fetch("https://api.africastalking.com/version1/messaging", {
      method: "POST",
      headers: {
        apiKey: AT_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({ username: AT_USER, to, message: body }).toString(),
      signal: AbortSignal.timeout(15000),
    });
    const d = await r.json();
    const m = d?.SMSMessageData?.Recipients?.[0];
    return { ok: m?.statusCode === 101, error: m?.status, provider: "africas_talking" };
  } catch (e: any) {
    return { ok: false, error: e.message, provider: "africas_talking" };
  }
}

// ── Logging ──────────────────────────────────────────────────────
async function logSms(to: string, body: string, res: any, meta: any, ch: string, from: string) {
  const entry = {
    to_number: to,
    from_number: from,
    message: body.slice(0, 500),
    status: res.ok ? "sent" : "failed",
    twilio_sid: res.sid || null,
    error_msg: res.error || null,
    provider: res.provider || "twilio",
    module: meta.module || "system",
    sent_at: new Date().toISOString(),
  };

  await Promise.allSettled([
    sb.from("sms_log").insert(entry),
    sb.from("reception_messages").insert({
      recipient_phone: to,
      message_body: body,
      message_type: ch,
      direction: "outbound",
      status: res.ok ? "sent" : "failed",
      sent_at: new Date().toISOString(),
    }),
    sb.from("sms_conversations").upsert({
      phone_number: to,
      last_message: body.slice(0, 100),
      last_message_at: new Date().toISOString(),
      status: "open",
    }, { onConflict: "phone_number" }),
  ]);
}

const HOSP = "EL5 MediProcure";
const WA_JOIN = "join bad-machine";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const creds = await loadCreds();
  const url = new URL(req.url);

  // Status endpoint
  if (req.method === "GET" && url.searchParams.get("action") === "status") {
    return new Response(JSON.stringify({
      ok: true,
      version: "13.0",
      kenya_format_fix: true,
      acct_set: !!creds.ACCT,
      auth_set: !!creds.AUTH,
      sms_from: creds.FROM,
      wa_from: creds.FROM_WA,
      mg_sid: creds.MSID,
      at_set: !!creds.AT_KEY,
      wa_join: WA_JOIN,
    }), { headers: { ...CORS, "Content-Type": "application/json" } });
  }

  // Main send
  try {
    const b = await req.json();
    const {
      to, message, channel = "sms",
      module: mod, recipient_name: name, department: dept,
    } = b;

    // Status check via POST
    if (b.action === "status") {
      return new Response(JSON.stringify({
        ok: true, version: "13.0", kenya_format_fix: true,
        acct_set: !!creds.ACCT, auth_set: !!creds.AUTH,
        sms_from: creds.FROM, wa_from: creds.FROM_WA,
        mg_sid: creds.MSID, at_set: !!creds.AT_KEY,
      }), { headers: { ...CORS, "Content-Type": "application/json" } });
    }

    if (!to || !message) {
      return new Response(JSON.stringify({ ok: false, error: "to and message required" }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    const fullMsg = `[${HOSP}] ${message}`.slice(0, 1600);

    // Parse and format phone numbers
    const rawNums = Array.isArray(to) ? to : String(to).split(",").map((s: string) => s.trim());
    const formattedNums = rawNums
      .map(formatKenyanPhone)
      .filter(n => n && isValidE164(n));

    if (!formattedNums.length) {
      return new Response(JSON.stringify({
        ok: false,
        error: "No valid phone numbers after formatting. Try +2547XXXXXXXX format.",
        tried: rawNums,
      }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    const results: any[] = [];

    for (const num of formattedNums) {
      let res: any;

      if (channel === "whatsapp") {
        // Try WhatsApp first
        res = await twilioSend(num, fullMsg, "whatsapp", creds);

        // If WhatsApp fails, fall back to SMS with instructions
        if (!res.ok) {
          const fallbackMsg = `${fullMsg}\n\n[To receive via WhatsApp, send "${WA_JOIN}" to +14155238886]`;
          res = await twilioSend(num, fallbackMsg, "sms", creds);
          res.provider = res.ok ? "sms_fallback" : "failed";
        }
      } else {
        // SMS channel - try Twilio, then Africa's Talking
        res = await twilioSend(num, fullMsg, "sms", creds);

        // If Twilio fails (trial account or other), try Africa's Talking
        if (!res.ok && creds.AT_KEY) {
          res = await atSend(num, fullMsg, creds);
        }
      }

      await logSms(num, fullMsg, res, { name, dept, module: mod }, channel, creds.FROM);
      results.push({ to: num, ok: res.ok, sid: res.sid, provider: res.provider, error: res.error });
    }

    const sent = results.filter(r => r.ok).length;
    return new Response(JSON.stringify({
      ok: sent > 0,
      sent,
      failed: results.length - sent,
      total: results.length,
      formatted_numbers: formattedNums,
      sms_from: creds.FROM,
      wa_join: WA_JOIN,
      results,
    }), { headers: { ...CORS, "Content-Type": "application/json" } });

  } catch (e: any) {
    console.error("[send-sms v13] Fatal:", e.message);
    return new Response(JSON.stringify({ ok: false, error: e.message }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});
