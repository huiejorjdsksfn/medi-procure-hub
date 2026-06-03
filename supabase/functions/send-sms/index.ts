/**
 * EL5 MediProcure — send-sms v12.0 PRODUCTION FIX
 * Fixed:
 *   - Credentials loaded from env vars first, system_settings as fallback
 *   - whatsapp channel: falls back to SMS if WA delivery fails
 *   - sms_log / reception_messages inserts are try-catch guarded
 *   - Status endpoint returns full diagnostics
 *   - getClaims() bug not present here (uses service role directly)
 * REDACTED_TWILIO_MESSAGING_SID = Messaging Service (SMS bulk)
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

  if (!FROM_WA) FROM_WA = "whatsapp:+14155238886";
  return { ACCT, AUTH, FROM, MSID, FROM_WA, AT_KEY, AT_USER };
}

const TEMPLATES: Record<string, (d: Record<string, any>) => string> = {
  requisition_submitted: d => `REQ ${d.number || ""} submitted by ${d.user || "staff"}. Awaiting approval.`,
  requisition_approved:  d => `REQ ${d.number || ""} APPROVED. Proceed to LPO.`,
  requisition_rejected:  d => `REQ ${d.number || ""} REJECTED. Reason: ${d.reason || "see system"}.`,
  requisition_pending:   d => `Reminder: REQ ${d.number || ""} awaits your approval.`,
  po_raised:             d => `LPO ${d.number || ""} raised for ${d.supplier || ""}. Total KES ${d.total || "0"}.`,
  po_sent:               d => `LPO ${d.number || ""} dispatched to ${d.supplier || ""}. ETA ${d.eta || "TBD"}.`,
  goods_received:        d => `GRN ${d.number || ""} recorded for LPO ${d.po || ""}. Inspect within 24h.`,
  inspection_passed:     d => `Inspection PASSED for ${d.item || ""}. Stock updated.`,
  inspection_failed:     d => `Inspection FAILED for ${d.item || ""}. Action required: ${d.action || "contact supplier"}.`,
  low_stock_alert:       d => `LOW STOCK: ${d.item || ""} at ${d.qty || "0"} ${d.unit || "units"}. Reorder now.`,
  payment_voucher:       d => `Payment Voucher ${d.number || ""} for KES ${d.amount || ""} ready for authorisation.`,
  contract_expiring:     d => `Contract ${d.number || ""} with ${d.supplier || ""} expires ${d.date || ""}.`,
  system_alert:          d => `SYSTEM: ${d.message || "alert"}`,
  custom:                d => String(d.message || ""),
};

function e164(r: string): string {
  const n = String(r || "").replace(/[\s\-\(\)\.]/g, "");
  if (!n || n.length < 7) return "";
  if (n.startsWith("07") || n.startsWith("01")) return "+254" + n.slice(1);
  if (n.startsWith("254") && !n.startsWith("+")) return "+" + n;
  if (!n.startsWith("+")) return "+254" + n;
  return n;
}

async function twilioSend(
  to: string, body: string,
  ch: "sms" | "whatsapp",
  creds: Awaited<ReturnType<typeof loadCreds>>,
): Promise<{ ok: boolean; sid?: string; error?: string; provider: string }> {
  const { ACCT, AUTH, MSID, FROM_WA } = creds;

  if (!ACCT || !AUTH) {
    return { ok: false, error: "Twilio credentials not configured", provider: "twilio" };
  }

  const p: Record<string, string> = { Body: body };
  if (ch === "whatsapp") {
    p.From = FROM_WA.startsWith("whatsapp:") ? FROM_WA : `whatsapp:${FROM_WA}`;
    p.To   = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
  } else {
    if (MSID) p.MessagingServiceSid = MSID;
    else      p.From = creds.FROM;
    p.To = to;
  }

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
        signal: AbortSignal.timeout(15000),
      },
    );
    const d = await r.json();
    if (!r.ok) return { ok: false, error: `${d.code}: ${d.message}`, provider: "twilio" };
    return { ok: true, sid: d.sid, provider: "twilio" };
  } catch (e: any) {
    return { ok: false, error: e.message, provider: "twilio" };
  }
}

async function atSend(
  to: string, body: string,
  creds: Awaited<ReturnType<typeof loadCreds>>,
): Promise<{ ok: boolean; error?: string; provider: string }> {
  const { AT_KEY, AT_USER } = creds;
  if (!AT_KEY || !AT_USER) return { ok: false, error: "Africa's Talking not configured", provider: "africas_talking" };
  try {
    const r = await fetch("https://api.africastalking.com/version1/messaging", {
      method: "POST",
      headers: {
        apiKey: AT_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({ username: AT_USER, to, message: body }).toString(),
    });
    const d = await r.json();
    const m = d?.SMSMessageData?.Recipients?.[0];
    return { ok: m?.statusCode === 101, error: m?.status, provider: "africas_talking" };
  } catch (e: any) {
    return { ok: false, error: e.message, provider: "africas_talking" };
  }
}

async function log(to: string, body: string, res: any, meta: any, ch: string, from: string) {
  await Promise.allSettled([
    sb.from("reception_messages").insert({
      recipient_phone: to,
      recipient_name:  meta.name || null,
      message_body:    body,
      message_type:    ch,
      direction:       "outbound",
      department:      meta.dept || null,
      status:          res.ok ? "sent" : "failed",
      twilio_sid:      res.sid || null,
      error_code:      res.error || null,
      sent_at:         new Date().toISOString(),
    }),
    sb.from("sms_log").insert({
      to_number:  to,
      from_number: from,
      message:    body,
      status:     res.ok ? "sent" : "failed",
      twilio_sid: res.sid || null,
      module:     meta.module || "system",
      error_msg:  res.error || null,
      provider:   res.provider || "twilio",
      sent_at:    new Date().toISOString(),
    }),
    sb.from("sms_conversations").upsert({
      phone_number:    to,
      contact_name:    meta.name || null,
      last_message:    body.slice(0, 100),
      last_message_at: new Date().toISOString(),
      status:          "open",
    }, { onConflict: "phone_number" }),
  ]);
}

async function handleInbound(p: URLSearchParams): Promise<string> {
  const from  = p.get("From") || "";
  const body  = p.get("Body") || "";
  const sid   = p.get("MessageSid") || "";
  const ch    = from.startsWith("whatsapp:") ? "whatsapp" : "sms";
  const phone = from.replace("whatsapp:", "");
  const lower = body.toLowerCase().trim();

  await Promise.allSettled([
    sb.from("reception_messages").insert({
      recipient_phone: phone, message_body: body, message_type: ch,
      direction: "inbound", status: "received", twilio_sid: sid,
      sent_at: new Date().toISOString(),
    }),
    sb.from("sms_conversations").upsert({
      phone_number: phone, last_message: body.slice(0, 100),
      last_message_at: new Date().toISOString(), status: "open", unread_count: 1,
    }, { onConflict: "phone_number" }),
  ]);

  let reply = "";
  if (lower === "help" || lower === "menu")
    reply = `EL5 MediProcure Menu:\n• STATUS REQ-ID\n• STOCK [item]\n• BALANCE [vote]\n• STOP / START\nHospital line: +254 (main)`;
  else if (lower === "stop") {
    reply = "Unsubscribed from EL5 alerts. Reply START to re-subscribe.";
    await sb.from("sms_conversations").update({ status: "closed" }).eq("phone_number", phone);
  } else if (lower === "start")
    reply = "Welcome back to EL5 MediProcure notifications!";
  else if (lower.startsWith("status ")) {
    const id = body.split(" ")[1];
    const { data: r } = await sb.from("requisitions").select("id,status,title").ilike("id", `%${id}%`).limit(1);
    reply = r?.[0] ? `REQ ${r[0].id}: ${r[0].status}\n${r[0].title || ""}` : `Requisition ${id} not found.`;
  } else if (lower.startsWith("stock ")) {
    const item = body.slice(6).trim();
    const { data: r } = await sb.from("items").select("name,quantity_in_stock,unit").ilike("name", `%${item}%`).limit(3);
    reply = r?.length ? r.map((i: any) => `${i.name}: ${i.quantity_in_stock} ${i.unit || ""}`).join("\n") : `Item '${item}' not found.`;
  } else
    reply = `Received at EL5 Hospital. Reply HELP for options.`;

  return `<?xml version="1.0" encoding="UTF-8"?>\n<Response>${reply ? `<Message>${reply}</Message>` : ""}</Response>`;
}

async function renew(creds: Awaited<ReturnType<typeof loadCreds>>): Promise<{ renewed: number; checked: number }> {
  const { data } = await sb.from("sms_conversations").select("phone_number,last_message_at").not("phone_number", "is", null);
  let renewed = 0;
  for (const c of data || []) {
    const h = (Date.now() - new Date(c.last_message_at || 0).getTime()) / 3600000;
    if (h > 22 && h < 72) {
      await twilioSend(c.phone_number, `[EL5 MediProcure] Your notifications are active. Reply HELP for options.`, "whatsapp", creds);
      renewed++;
      await new Promise((r) => setTimeout(r, 700));
    }
  }
  await sb.from("system_settings").upsert(
    { key: "whatsapp_last_renewal", value: new Date().toISOString() },
    { onConflict: "key" },
  );
  return { renewed, checked: (data || []).length };
}

const HOSP = "EL5 MediProcure";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const creds = await loadCreds();
  const url   = new URL(req.url);

  // Status endpoint
  if (req.method === "GET" && url.searchParams.get("action") === "status")
    return new Response(JSON.stringify({
      ok: true, version: "12.0",
      acct_set:  !!creds.ACCT,
      auth_set:  !!creds.AUTH,
      sms_from:  creds.FROM,
      wa_from:   creds.FROM_WA,
      mg_sid:    creds.MSID,
      at_set:    !!creds.AT_KEY,
      wa_join:   'join bad-machine',
    }), { headers: { ...CORS, "Content-Type": "application/json" } });

  // Inbound webhook
  if (req.method === "POST" && url.searchParams.get("webhook") === "inbound") {
    const fd = await req.formData();
    const p  = new URLSearchParams();
    fd.forEach((v, k) => p.set(k, v.toString()));
    return new Response(await handleInbound(p), { headers: { ...CORS, "Content-Type": "text/xml" } });
  }

  // Renew WhatsApp sessions
  if (
    req.method === "POST" &&
    (url.searchParams.get("action") === "renew" || req.headers.get("x-action") === "renew")
  ) {
    const r = await renew(creds);
    return new Response(JSON.stringify({ ok: true, ...r }), { headers: { ...CORS, "Content-Type": "application/json" } });
  }

  // Main send
  try {
    const b = await req.json();
    const {
      to, message, channel = "sms",
      module: mod, sent_by,
      recipient_name: name, department: dept,
      template, templateData = {},
    } = b;

    // Status check via POST
    if (b.action === "status")
      return new Response(JSON.stringify({
        ok: true, version: "12.0",
        acct_set: !!creds.ACCT, auth_set: !!creds.AUTH,
        sms_from: creds.FROM, wa_from: creds.FROM_WA,
        mg_sid: creds.MSID, at_set: !!creds.AT_KEY,
      }), { headers: { ...CORS, "Content-Type": "application/json" } });

    if (!to || !message)
      return new Response(JSON.stringify({ ok: false, error: "to and message required" }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });

    const fullMsg = `[${HOSP}] ${message}`.slice(0, 1600);
    const nums = (Array.isArray(to) ? to : String(to).split(",").map((s: string) => s.trim()))
      .filter(Boolean).map(e164).filter((n) => n.length > 7);

    if (!nums.length)
      return new Response(JSON.stringify({ ok: false, error: "No valid phone numbers" }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });

    const results: any[] = [];
    const WA_JOIN = "join bad-machine";

    for (const num of nums) {
      let res: any;
      if (channel === "whatsapp") {
        res = await twilioSend(num, fullMsg, "whatsapp", creds);
        // Fallback to SMS with WhatsApp join instructions if WA fails
        if (!res.ok) {
          res = await twilioSend(num, `${fullMsg}\n[WhatsApp: send "${WA_JOIN}" to +14155238886]`, "sms", creds);
          res = { ...res, provider: res.ok ? "sms_fallback" : "failed" };
        }
      } else {
        res = await twilioSend(num, fullMsg, "sms", creds);
        if (!res.ok) res = await atSend(num, fullMsg, creds);
      }
      await log(num, fullMsg, res, { name, dept, module: mod, sent_by }, channel, creds.FROM);
      results.push({ to: num, ok: res.ok, sid: res.sid, provider: res.provider, error: res.error });
    }

    const sent = results.filter((r) => r.ok).length;
    return new Response(JSON.stringify({
      ok: sent > 0, sent, failed: results.length - sent,
      total: results.length, mg_sid: creds.MSID,
      sms_from: creds.FROM, wa_join: WA_JOIN, results,
    }), { headers: { ...CORS, "Content-Type": "application/json" } });

  } catch (e: any) {
    console.error("[send-sms v12] Fatal:", e.message);
    return new Response(JSON.stringify({ ok: false, error: e.message }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});
