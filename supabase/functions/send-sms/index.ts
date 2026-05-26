/**
 * EL5 MediProcure — send-sms Edge Function v11.0 PRODUCTION
 * Account SID: (TWILIO_ACCOUNT_SID env var)
 * Auth Token : (stored in TWILIO_AUTH_TOKEN secret)
 * SMS From   : +16812972643
 * WA From    : whatsapp:+14155238886
 * Msg Svc SID: REDACTED_TWILIO_MESSAGING_SID
 * API Key SID: (stored in TWILIO_API_KEY_SID secret)
 * API Secret : (stored in TWILIO_API_SECRET secret)
 * Supports   : SMS, WhatsApp, Bulk, Templates, Status, Inbound webhook, Call
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-twilio-signature",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const TWILIO_ACCT    = Deno.env.get("TWILIO_ACCOUNT_SID") || "";
const TWILIO_TOKEN   = Deno.env.get("TWILIO_AUTH_TOKEN") || ""; // Set in Supabase Dashboard → Edge Functions → Secrets
const SMS_FROM       = "+16812972643";
const WA_FROM        = "whatsapp:+14155238886";
const WA_SANDBOX_NUM = "+14155238886";
const MSG_SVC_SID    = "REDACTED_TWILIO_MESSAGING_SID";
const API_SID        = Deno.env.get("TWILIO_API_KEY_SID") || "";  // Set in Supabase → Edge Fn → Secrets
const API_SECRET     = Deno.env.get("TWILIO_API_SECRET") || ""; // Set in Supabase Dashboard → Edge Functions → Secrets
const HOSPITAL       = "EL5 MediProcure";
const BASE           = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCT}`;
// AUTH computed lazily after env vars loaded

/* ── Helpers ── */
function e164(raw: string): string {
  const n = String(raw || "").replace(/[\s\-\(\)\.]/g, "").trim();
  if (!n) return n;
  if (n.startsWith("+")) return n;
  if (n.startsWith("07") || n.startsWith("01")) return "+254" + n.slice(1);
  if (n.startsWith("254")) return "+" + n;
  if (n.length === 9 && /^\d+$/.test(n)) return "+254" + n;
  return n;
}
function escXml(s: string): string {
  return String(s).replace(/[<>&"']/g, (c: string) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c] || c));
}
async function twilioPost(path: string, params: Record<string, string>) {
  const r = await fetch(`${BASE}/${path}`, {
    method: "POST",
    headers: { Authorization: AUTH, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
    signal: AbortSignal.timeout(15000),
  });
  return { ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) };
}
async function twilioGet(path: string) {
  const r = await fetch(`${BASE}/${path}`, {
    headers: { Authorization: AUTH },
    signal: AbortSignal.timeout(10000),
  });
  return { ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) };
}

/* ── SMS Templates ── */
const TEMPLATES: Record<string, (d: Record<string, string>) => string> = {
  requisition_submitted: d => `[${HOSPITAL}] Requisition ${d.num} submitted by ${d.dept||"department"}. Status: Pending Approval.`,
  requisition_approved:  d => `[${HOSPITAL}] ✓ Requisition ${d.num} APPROVED by ${d.approver||"Manager"}. PO will be raised shortly.`,
  requisition_rejected:  d => `[${HOSPITAL}] ✗ Requisition ${d.num} REJECTED. Reason: ${d.reason||"See system for details"}.`,
  po_raised:             d => `[${HOSPITAL}] PO ${d.num} raised for ${d.supplier}. Expected delivery: ${d.eta||"TBC"}.`,
  po_sent:               d => `[${HOSPITAL}] PO ${d.num} sent to ${d.supplier}. Awaiting supplier confirmation.`,
  po_approved:           d => `[${HOSPITAL}] ✓ Purchase Order ${d.num} has been approved. Supplier: ${d.supplier}. Proceed with delivery.`,
  goods_received:        d => `[${HOSPITAL}] GRN recorded for PO ${d.num}. Items: ${d.items}. GRN#: ${d.grn||""}. Inventory updated.`,
  low_stock_alert:       d => `[${HOSPITAL}] ⚠ LOW STOCK: ${d.item} — ${d.qty} ${d.unit||"units"} remaining. Reorder level: ${d.reorder||""}. Urgent procurement needed.`,
  voucher_approved:      d => `[${HOSPITAL}] ✓ Voucher ${d.num} (KES ${d.amount}) APPROVED. Payee: ${d.payee||""}. Payment processing initiated.`,
  payment_processed:     d => `[${HOSPITAL}] ✓ Payment KES ${d.amount} to ${d.payee} processed. Voucher: ${d.num}. Ref: ${d.ref||""}.`,
  payment_approved:      d => `[${HOSPITAL}] ✓ Payment Voucher ${d.num} of KES ${d.amount} has been APPROVED. Payee: ${d.payee||""}. Date: ${d.date||new Date().toLocaleDateString("en-KE")}.`,
  invoice_matched:       d => `[${HOSPITAL}] Invoice ${d.inv||""} matched to PO ${d.po||""}. Amount: KES ${d.amount||""}. Status: MATCHED & APPROVED.`,
  budget_alert:          d => `[${HOSPITAL}] ⚠ BUDGET ALERT: ${d.dept||"Department"} has consumed ${d.pct||""}% of budget code ${d.code||""}. CFO approval required.`,
  budget_approved:       d => `[${HOSPITAL}] ✓ Budget override APPROVED for ${d.dept||"department"} (${d.code||""}). Proceed with procurement.`,
  tender_award:          d => `[${HOSPITAL}] Tender ${d.num} AWARDED to ${d.supplier}. Value: KES ${d.amount||""}. Please contact Procurement for next steps.`,
  contract_expiry:       d => `[${HOSPITAL}] ⚠ Contract ${d.num} with ${d.supplier} expires on ${d.date}. Please initiate renewal process.`,
  erp_sync_done:         d => `[${HOSPITAL}] ERP sync to Dynamics 365 completed at ${d.time||new Date().toLocaleTimeString("en-KE")}. ${d.records||""} records pushed.`,
  visitor_arrival:       d => `Hello ${d.host_name}, your visitor ${d.visitor_name} has arrived at EL5 Hospital reception. Time: ${d.time||new Date().toLocaleTimeString("en-KE")}.`,
  appointment_reminder:  d => `Reminder: Appointment at EL5 Hospital on ${d.date} at ${d.time} with ${d.host||""}, ${d.dept||""}. Please bring your National ID.`,
  system_alert:          d => `[${HOSPITAL}] ${d.message||"System notification"} — ${new Date().toLocaleDateString("en-KE")}`,
  welcome:               d => `Welcome to EL5 MediProcure! Hello ${d.name||"User"}, your account is active. Contact IT: ${d.phone||"+254 068 31055"} for support.`,
  custom:                d => d.message || "",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const respond = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { ...CORS, "Content-Type": "application/json" } });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    let body: Record<string, any> = {};
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("json")) body = await req.json().catch(() => ({}));
    else if (ct.includes("form")) {
      const fd = await req.formData().catch(() => null);
      if (fd) fd.forEach((v, k) => { body[k] = String(v); });
    }

    const { action, to, message, event, templateData = {}, channel = "sms",
      module: mod, recipient_name, department } = body;

    console.log(`[SMS v11] action=${action||"send"} event=${event||""} channel=${channel}`);

    /* ── STATUS CHECK ── */
    if (action === "status") {
      const AUTH = "Basic " + btoa(`${TWILIO_ACCT}:${TWILIO_TOKEN}`);
    const [accR, numR, msgR] = await Promise.all([
        twilioGet(`Accounts/${TWILIO_ACCT}.json`),
        twilioGet(`IncomingPhoneNumbers.json?PageSize=20`),
        twilioGet(`Messages.json?PageSize=5`),
      ]);
      const phones = (numR.data?.incoming_phone_numbers ?? []).map((p: any) => ({
        number: p.phone_number, friendly: p.friendly_name,
        sms: p.capabilities?.sms, voice: p.capabilities?.voice, mms: p.capabilities?.mms,
      }));
      return respond({
        ok: accR.ok && accR.data?.status === "active",
        account_status: accR.data?.status,
        friendly_name: accR.data?.friendly_name,
        account_sid: TWILIO_ACCT,
        sms_number: SMS_FROM,
        wa_number: WA_SANDBOX_NUM,
        wa_from: WA_FROM,
        msg_svc_sid: MSG_SVC_SID,
        api_sid: API_SID,
        region: "us1",
        phone_numbers: phones,
        recent_messages_count: msgR.data?.messages?.length ?? 0,
        templates_available: Object.keys(TEMPLATES).length,
      });
    }

    /* ── FETCH TEMPLATES ── */
    if (action === "list_templates") {
      const templateList = Object.entries(TEMPLATES).map(([key, fn]) => ({
        key,
        label: key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
        preview: fn({ num:"RQN-001", dept:"Pharmacy", supplier:"ABC Ltd", amount:"5,000", item:"Paracetamol", qty:"10", unit:"boxes", payee:"XYZ Suppliers", approver:"Dr. Omondi", name:"John", host_name:"Dr. Kamau", visitor_name:"Jane Wanjiku", time:"10:30 AM", date:"27/05/2026", message:"System notification" }),
        variables: (fn.toString().match(/d\.\w+/g) || []).map((v: string) => v.replace("d.", "")).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i),
      }));
      return respond({ ok: true, templates: templateList, count: templateList.length });
    }

    /* ── FETCH PHONE NUMBERS ON ACCOUNT ── */
    if (action === "list_numbers") {
      const r = await twilioGet(`IncomingPhoneNumbers.json?PageSize=20`);
      const nums = (r.data?.incoming_phone_numbers ?? []).map((p: any) => ({
        sid: p.sid, number: p.phone_number, friendly: p.friendly_name,
        sms: p.capabilities?.sms, voice: p.capabilities?.voice,
        monthly_cost: "$1.15", region: "US", country: "US",
      }));
      // Also add the known numbers
      const known = [
        { number: SMS_FROM, friendly: "EL5 MediProcure SMS", sms: true, voice: true, region: "US", note: "Primary SMS/Voice" },
        { number: WA_SANDBOX_NUM, friendly: "Twilio WhatsApp Sandbox", sms: false, wa: true, region: "US", note: "WhatsApp (sandbox)" },
      ];
      return respond({ ok: r.ok, numbers: nums.length ? nums : known, total: nums.length || 2, primary_sms: SMS_FROM, primary_wa: WA_SANDBOX_NUM });
    }

    /* ── FETCH RECENT MESSAGES FROM TWILIO ── */
    if (action === "fetch_messages") {
      const r = await twilioGet(`Messages.json?PageSize=50`);
      const msgs = (r.data?.messages ?? []).map((m: any) => ({
        sid: m.sid, from: m.from, to: m.to, body: m.body,
        status: m.status, direction: m.direction,
        date_created: m.date_created, date_sent: m.date_sent,
        error_code: m.error_code, error_message: m.error_message,
      }));
      return respond({ ok: r.ok, messages: msgs, total: msgs.length });
    }

    /* ── MAKE VOICE CALL ── */
    if (action === "call") {
      const callTo = e164(String(to || ""));
      if (!callTo) return respond({ ok: false, error: "Missing 'to' number" }, 400);
      const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice" language="en-GB">Hello, this is a call from Embu Level 5 Hospital Procurement System. ${escXml(message || "Please contact procurement for details.")} Thank you.</Say></Response>`;
      const r = await twilioPost("Calls.json", { To: callTo, From: SMS_FROM, Twiml: twiml });
      await sb.from("sms_log").insert({ to_number: callTo, from_number: SMS_FROM, message: `[CALL] ${message || "Voice call made"}`, status: r.ok ? "sent" : "failed", module: mod || "call", provider: "twilio_voice", sent_at: new Date().toISOString(), twilio_sid: r.data?.sid });
      return respond({ ok: r.ok, sid: r.data?.sid, status: r.data?.status, to: callTo, error: r.data?.message });
    }

    /* ── INBOUND WEBHOOK ── */
    if (action === "inbound" || req.url.includes("webhook") || (body.From && body.MessageSid)) {
      const from = body.From || ""; const msgBody = body.Body || ""; const sid = body.MessageSid || "";
      const phone = from.replace("whatsapp:", ""); const lower = msgBody.trim().toLowerCase();
      await Promise.allSettled([
        sb.from("sms_log").insert({ to_number: from, from_number: phone, message: msgBody.slice(0, 500), status: "received", twilio_sid: sid, module: "inbound", provider: from.startsWith("whatsapp:") ? "twilio_wa" : "twilio_sms", sent_at: new Date().toISOString() }),
        sb.from("sms_conversations").upsert({ phone_number: phone, last_message: msgBody.slice(0, 100), last_message_at: new Date().toISOString(), status: "open", unread_count: 1 }, { onConflict: "phone_number" }),
      ]);
      let reply = "";
      if (lower === "help" || lower === "menu") reply = `EL5 MediProcure Menu:\n• STATUS <REQ-ID>\n• BALANCE\n• STOP — Unsubscribe\n• START — Subscribe\nHospital: +254 068 31055`;
      else if (lower === "stop") { await sb.from("sms_conversations").update({ status: "closed" }).eq("phone_number", phone); reply = "Unsubscribed from EL5 MediProcure notifications. Reply START to re-subscribe."; }
      else if (lower === "start") reply = "Welcome back to EL5 MediProcure! You will receive procurement and finance notifications.";
      else if (lower.startsWith("status ")) {
        const id = msgBody.trim().split(" ")[1];
        const { data: r } = await sb.from("requisitions").select("id,status,title,requisition_number").ilike("requisition_number", `%${id}%`).limit(1);
        reply = r?.[0] ? `EL5 MediProcure:\nRequisition: ${(r[0] as any).requisition_number}\nTitle: ${String((r[0] as any).title || "").slice(0, 40)}\nStatus: ${String((r[0] as any).status || "").toUpperCase()}` : `Requisition "${id}" not found. Check the number and try again.`;
      } else {
        reply = `EL5 MediProcure received your message. For assistance reply HELP. Hospital: +254 068 31055.`;
      }
      return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${reply ? `<Message>${escXml(reply)}</Message>` : ""}</Response>`,
        { headers: { ...CORS, "Content-Type": "text/xml" } });
    }

    /* ── SEND SMS / WHATSAPP (single or bulk) ── */
    const numbers = (Array.isArray(to) ? to : String(to || "").split(",").map((s: string) => s.trim()))
      .filter(Boolean).map(e164).filter(Boolean);
    if (!numbers.length) return respond({ ok: false, error: "'to' phone number(s) required" }, 400);

    const td = (templateData || {}) as Record<string, string>;
    const smsBody = message || (event && TEMPLATES[event] ? TEMPLATES[event](td) : null) || `[${HOSPITAL}] Notification`;
    const isWA = channel === "whatsapp";
    const results: any[] = [];

    for (const num of numbers) {
      const params: Record<string, string> = {
        Body: smsBody,
        From: isWA ? WA_FROM : SMS_FROM,
        To: isWA ? (num.startsWith("whatsapp:") ? num : `whatsapp:${num}`) : num,
      };
      // Use Messaging Service for SMS (better deliverability)
      if (!isWA && MSG_SVC_SID) {
        params.MessagingServiceSid = MSG_SVC_SID;
        delete params.From;
      }
      const tr = await twilioPost("Messages.json", params);
      const ok = tr.ok && !!tr.data?.sid;
      console.log(`[SMS v11] to=${num} ok=${ok} sid=${tr.data?.sid} err=${tr.data?.message || ""}`);
      // Log to DB
      await sb.from("sms_log").insert({
        to_number: num, from_number: isWA ? WA_FROM : SMS_FROM,
        message: smsBody, status: ok ? "sent" : "failed",
        twilio_sid: tr.data?.sid || null, module: event || mod || "custom",
        provider: isWA ? "twilio_wa" : "twilio_sms",
        error_msg: ok ? null : (tr.data?.message || `HTTP ${tr.status}`),
        recipient_name: recipient_name || null,
        department: department || null,
        sent_at: new Date().toISOString(),
      });
      results.push({ to: num, ok, sid: tr.data?.sid, provider: isWA ? "twilio_wa" : "twilio_sms", error: tr.data?.message });
      if (numbers.length > 1) await new Promise(r => setTimeout(r, 200));
    }

    const sent = results.filter(r => r.ok).length;
    return respond({ ok: sent > 0, sent, failed: results.length - sent, total: results.length, from: isWA ? WA_FROM : SMS_FROM, msg_svc: MSG_SVC_SID, results });

  } catch (e: any) {
    console.error("[SMS v11] Fatal:", e.message);
    return respond({ ok: false, error: e.message }, 500);
  }
});
