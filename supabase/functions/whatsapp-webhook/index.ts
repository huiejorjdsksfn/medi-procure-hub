/**
 * EL5 MediProcure — WhatsApp Webhook v2.0 PRODUCTION FIX
 * Fixed:
 *   - sms_messages table calls replaced with reception_messages (correct table)
 *   - All DB ops in try/catch — webhook always returns 200 to Twilio
 *   - Credentials loaded from env + system_settings fallback
 *   - Proper TwiML response format
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(SUPABASE_URL, SERVICE_KEY);

const TWIML_OK = `<?xml version="1.0"?><Response/>`;

async function loadCreds() {
  let ACCT  = Deno.env.get("TWILIO_ACCOUNT_SID") || "";
  let AUTH  = Deno.env.get("TWILIO_AUTH_TOKEN")  || "";
  let WA_FROM = Deno.env.get("TWILIO_WHATSAPP_FROM") || "";

  if (!ACCT || !AUTH) {
    try {
      const { data: rows } = await db.from("system_settings").select("key,value")
        .in("key", ["twilio_account_sid", "twilio_auth_token", "twilio_whatsapp_from"]);
      const cfg: Record<string, string> = {};
      for (const r of rows ?? []) cfg[r.key] = r.value;
      if (!ACCT)    ACCT    = cfg["twilio_account_sid"]   || "";
      if (!AUTH)    AUTH    = cfg["twilio_auth_token"]    || "";
      if (!WA_FROM) WA_FROM = cfg["twilio_whatsapp_from"] || "";
    } catch { /* non-fatal */ }
  }
  if (!WA_FROM) WA_FROM = "whatsapp:+14155238886";
  return { ACCT, AUTH, WA_FROM };
}

async function sendWA(to: string, body: string, ACCT: string, AUTH: string, WA_FROM: string) {
  if (!ACCT || !AUTH) return false;
  try {
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${ACCT}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${ACCT}:${AUTH}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: WA_FROM.startsWith("whatsapp:") ? WA_FROM : `whatsapp:${WA_FROM}`,
        To:   to.startsWith("whatsapp:") ? to : `whatsapp:${to}`,
        Body: body,
      }).toString(),
      signal: AbortSignal.timeout(10000),
    });
    return r.ok;
  } catch { return false; }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response(TWIML_OK, { headers: { "Content-Type": "text/xml" } });

  const { ACCT, AUTH, WA_FROM } = await loadCreds();

  const params: Record<string, string> = {};
  try {
    const text = await req.text();
    for (const pair of text.split("&")) {
      const [k, v] = pair.split("=");
      if (k) params[decodeURIComponent(k)] = decodeURIComponent((v || "").replace(/\+/g, " "));
    }
  } catch { return new Response(TWIML_OK, { headers: { "Content-Type": "text/xml" } }); }

  const from    = (params["From"] || "").replace("whatsapp:", "");
  const body    = (params["Body"] || "").trim();
  const msgLower = body.toLowerCase();

  // Log incoming message to reception_messages (NOT sms_messages)
  try {
    await db.from("reception_messages").insert({
      recipient_phone: from,
      message_body:    body,
      message_type:    "whatsapp",
      direction:       "inbound",
      status:          "received",
      sent_at:         new Date().toISOString(),
    });
  } catch { /* non-fatal */ }

  // Update conversation
  try {
    await db.from("sms_conversations").upsert({
      phone_number:    from,
      last_message:    body,
      last_message_at: new Date().toISOString(),
      status:          "open",
    }, { onConflict: "phone_number" });
  } catch { /* non-fatal */ }

  // Handle APPROVE
  if (msgLower.startsWith("approve")) {
    try {
      // Find pending approval in reception_messages (outbound WA with metadata)
      const { data: pending } = await db.from("reception_messages")
        .select("id,metadata,recipient_phone")
        .eq("recipient_phone", from)
        .eq("message_type", "whatsapp")
        .not("metadata", "is", null)
        .order("sent_at", { ascending: false })
        .limit(5);

      const approvalMsg = pending?.find((p: any) => p.metadata?.approval_ref);

      if (approvalMsg) {
        const meta = approvalMsg.metadata || {};
        const ref  = meta.approval_ref;
        const type = (meta.approval_type || "").toLowerCase();

        if (type.includes("requisition"))
          await db.from("requisitions").update({ status: "approved", approved_by: from }).eq("id", meta.record_id || "").catch(() => {});
        else if (type.includes("purchase") || type.includes("po"))
          await db.from("purchase_orders").update({ status: "approved" }).eq("id", meta.record_id || "").catch(() => {});
        else if (type.includes("payment"))
          await db.from("payment_vouchers").update({ status: "approved" }).eq("id", meta.record_id || "").catch(() => {});

        await db.from("audit_logs").insert({
          action: "whatsapp_approval",
          details: `${ref} APPROVED via WhatsApp by ${from}`,
          created_at: new Date().toISOString(),
        }).catch(() => {});

        await sendWA(from, `✅ *Approved*\nYou approved *${ref}*.\nThe system has been updated.\n\n_EL5 MediProcure_`, ACCT, AUTH, WA_FROM);
      } else {
        await sendWA(from, `✅ Approval recorded. No pending approval found for your number.\n\n_EL5 MediProcure_`, ACCT, AUTH, WA_FROM);
      }
    } catch (e: any) {
      console.error("[WA-webhook] approve error:", e.message);
    }
    return new Response(TWIML_OK, { headers: { "Content-Type": "text/xml" } });
  }

  // Handle REJECT
  if (msgLower.startsWith("reject")) {
    try {
      const reason = body.slice(6).trim() || "No reason given";
      const { data: pending } = await db.from("reception_messages")
        .select("id,metadata,recipient_phone")
        .eq("recipient_phone", from)
        .eq("message_type", "whatsapp")
        .not("metadata", "is", null)
        .order("sent_at", { ascending: false })
        .limit(5);

      const approvalMsg = pending?.find((p: any) => p.metadata?.approval_ref);

      if (approvalMsg) {
        const meta = approvalMsg.metadata || {};
        const ref  = meta.approval_ref;
        const type = (meta.approval_type || "").toLowerCase();

        if (type.includes("requisition"))
          await db.from("requisitions").update({ status: "rejected", rejection_reason: reason }).eq("id", meta.record_id || "").catch(() => {});
        else if (type.includes("purchase") || type.includes("po"))
          await db.from("purchase_orders").update({ status: "rejected" }).eq("id", meta.record_id || "").catch(() => {});
        else if (type.includes("payment"))
          await db.from("payment_vouchers").update({ status: "rejected" }).eq("id", meta.record_id || "").catch(() => {});

        await db.from("audit_logs").insert({
          action: "whatsapp_rejection",
          details: `${ref} REJECTED via WhatsApp by ${from}. Reason: ${reason}`,
          created_at: new Date().toISOString(),
        }).catch(() => {});

        await sendWA(from, `❌ *Rejected*\n*${ref}* has been rejected.\nReason: ${reason}\n\n_EL5 MediProcure_`, ACCT, AUTH, WA_FROM);
      } else {
        await sendWA(from, `❌ Rejection recorded.\n\n_EL5 MediProcure_`, ACCT, AUTH, WA_FROM);
      }
    } catch (e: any) {
      console.error("[WA-webhook] reject error:", e.message);
    }
    return new Response(TWIML_OK, { headers: { "Content-Type": "text/xml" } });
  }

  // Handle STATUS / HELP
  if (msgLower === "status" || msgLower === "help") {
    await sendWA(from,
      `🏥 *EL5 MediProcure*\n\nAvailable commands:\n✅ *APPROVE* — Approve pending request\n❌ *REJECT reason* — Reject with reason\n📊 *STATUS* — Show this help\n\nPowered by ProcurBosse`,
      ACCT, AUTH, WA_FROM,
    );
  }

  return new Response(TWIML_OK, { headers: { "Content-Type": "text/xml" } });
});
