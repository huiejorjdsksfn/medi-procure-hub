/**
 * EL5 MediProcure — send-whatsapp Edge Function v11.0 PRODUCTION FIX
 * Fixed:
 *   - Loads Twilio credentials from both env vars AND system_settings (fallback chain)
 *   - Proper error messaging distinguishing credential vs delivery failures
 *   - sms_log insert guards for missing columns
 *   - Detailed logging for debugging
 * FROM: whatsapp:+14155238886 (Twilio sandbox) or TWILIO_WA_NUMBER env
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SANDBOX_FROM = "whatsapp:+14155238886";
const HOSPITAL = "EL5 MediProcure";

function e164(raw: string): string {
  const n = String(raw || "").replace(/[\s\-\(\)\.]/g, "").trim();
  if (!n) return n;
  if (n.startsWith("+")) return n;
  if (n.startsWith("07") || n.startsWith("01")) return "+254" + n.slice(1);
  if (n.startsWith("254")) return "+" + n;
  return n;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const respond = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── Load credentials: env vars first, system_settings fallback ──
    let ACCT  = Deno.env.get("TWILIO_ACCOUNT_SID")  || "";
    let TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")    || "";
    let FROM  = Deno.env.get("TWILIO_WA_NUMBER")     || Deno.env.get("TWILIO_WHATSAPP_FROM") || "";

    if (!ACCT || !TOKEN) {
      const { data: rows } = await sb
        .from("system_settings")
        .select("key,value")
        .in("key", ["twilio_account_sid", "twilio_auth_token", "twilio_whatsapp_from"]);

      const cfg: Record<string, string> = {};
      for (const r of rows ?? []) cfg[r.key] = r.value;

      if (!ACCT)  ACCT  = cfg["twilio_account_sid"]  || "";
      if (!TOKEN) TOKEN = cfg["twilio_auth_token"]    || "";
      if (!FROM)  FROM  = cfg["twilio_whatsapp_from"] || "";
    }

    if (!FROM) FROM = SANDBOX_FROM;

    const fromWA = FROM.startsWith("whatsapp:") ? FROM : `whatsapp:${FROM}`;

    // ── Parse request ──
    let body: any = {};
    try { body = await req.json(); } catch { /* ignore */ }

    const { to, message, template, recipient_name, department } = body;

    if (!to)      return respond({ ok: false, error: "to is required" }, 400);
    if (!message) return respond({ ok: false, error: "message is required" }, 400);

    if (!ACCT || !TOKEN) {
      console.error("[WA v11] Twilio credentials not configured");
      return respond({ ok: false, error: "Twilio credentials not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in Supabase secrets or system_settings." });
    }

    // Handle multiple recipients
    const nums = (Array.isArray(to) ? to : String(to).split(",").map((s: string) => s.trim()))
      .filter(Boolean)
      .map(e164)
      .filter((n) => n.length > 7);

    if (!nums.length) return respond({ ok: false, error: "No valid phone numbers" }, 400);

    const fullMsg = message.startsWith("[") ? message : `[${HOSPITAL}] ${message}`;
    const auth = "Basic " + btoa(`${ACCT}:${TOKEN}`);
    const results: any[] = [];

    for (const num of nums) {
      const toWA = num.startsWith("whatsapp:") ? num : `whatsapp:${num}`;

      // Log to sms_log first (queued)
      let logId: string | null = null;
      try {
        const { data: logRow } = await sb.from("sms_log").insert({
          to_number:   num,
          from_number: FROM.replace("whatsapp:", ""),
          message:     fullMsg,
          status:      "queued",
          module:      template || "whatsapp",
          provider:    "twilio_wa",
          sent_at:     new Date().toISOString(),
        }).select("id").maybeSingle();
        logId = (logRow as any)?.id ?? null;
      } catch (le: any) {
        console.warn("[WA v11] sms_log insert warn:", le.message);
      }

      // Send via Twilio
      let ok = false;
      let sid: string | null = null;
      let errMsg: string | null = null;

      try {
        const r = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${ACCT}/Messages.json`,
          {
            method: "POST",
            headers: {
              Authorization: auth,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({ To: toWA, From: fromWA, Body: fullMsg }),
            signal: AbortSignal.timeout(15000),
          },
        );
        const d = await r.json();
        ok  = r.ok && !!d.sid;
        sid = d.sid ?? null;
        if (!ok) errMsg = d.message ? `${d.code}: ${d.message}` : `HTTP ${r.status}`;
        console.log(`[WA v11] to=${num} ok=${ok} sid=${sid} err=${errMsg}`);
      } catch (fe: any) {
        errMsg = fe.message;
        console.error("[WA v11] Fetch error:", fe.message);
      }

      // Update log
      if (logId) {
        try {
          await sb.from("sms_log").update({
            status:    ok ? "sent" : "failed",
            twilio_sid: sid,
            error_msg: ok ? null : errMsg,
          }).eq("id", logId);
        } catch { /* non-fatal */ }
      }

      // Also log to reception_messages
      try {
        await sb.from("reception_messages").insert({
          recipient_phone: num,
          recipient_name:  recipient_name || null,
          message_body:    fullMsg,
          message_type:    "whatsapp",
          direction:       "outbound",
          department:      department || null,
          status:          ok ? "sent" : "failed",
          twilio_sid:      sid,
          error_code:      ok ? null : errMsg,
          sent_at:         new Date().toISOString(),
        });
      } catch { /* non-fatal */ }

      results.push({ to: num, toWA, ok, sid, error: errMsg });
    }

    const sent   = results.filter((r) => r.ok).length;
    const failed = results.length - sent;

    return respond({
      ok:      sent > 0,
      sent,
      failed,
      total:   results.length,
      from:    fromWA,
      results,
    });

  } catch (e: any) {
    console.error("[WA v11] Fatal:", e.message);
    return respond({ ok: false, error: e.message }, 500);
  }
});
