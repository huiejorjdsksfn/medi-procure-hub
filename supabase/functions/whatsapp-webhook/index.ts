/**
 * EL5 MediProcure — WhatsApp Webhook v1.0
 * Handles incoming Twilio WhatsApp replies: APPROVE / REJECT
 * Auto-updates approval status in DB and notifies requestor
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TWILIO_ACCT   = Deno.env.get("TWILIO_ACCOUNT_SID") || "";
const TWILIO_AUTH   = Deno.env.get("TWILIO_AUTH_TOKEN")  || "";
const WA_FROM       = "whatsapp:+14155238886";

const db = createClient(SUPABASE_URL, SERVICE_KEY);

async function sendWA(to: string, body: string) {
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCT}/Messages.json`, {
    method: "POST",
    headers: {
      "Authorization": "Basic " + btoa(`${TWILIO_ACCT}:${TWILIO_AUTH}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ From: WA_FROM, To: `whatsapp:${to}`, Body: body }).toString(),
  });
  return r.ok;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("OK", { status: 200 });

  let params: Record<string, string> = {};
  try {
    const text = await req.text();
    for (const pair of text.split("&")) {
      const [k, v] = pair.split("=");
      if (k) params[decodeURIComponent(k)] = decodeURIComponent((v||"").replace(/\+/g," "));
    }
  } catch { return new Response("OK", { status: 200 }); }

  const from    = (params["From"] || "").replace("whatsapp:","");
  const body    = (params["Body"] || "").trim();
  const msgLower = body.toLowerCase();

  // Log incoming message
  await db.from("sms_messages").insert({
    to_number:    "system",
    from_number:  from,
    message_body: body,
    channel:      "whatsapp",
    direction:    "inbound",
    status:       "received",
    sent_at:      new Date().toISOString(),
  }).then(() => {});

  // Update conversation
  await db.from("sms_conversations").upsert({
    phone_number:      from,
    last_message:      body,
    last_message_at:   new Date().toISOString(),
    status:            "open",
  }, { onConflict: "phone_number" }).then(() => {});

  // Handle APPROVE
  if (msgLower.startsWith("approve")) {
    const { data: pending } = await db.from("sms_messages")
      .select("id,metadata,to_number")
      .eq("to_number", from)
      .eq("channel", "whatsapp")
      .not("metadata->approval_ref", "is", null)
      .order("sent_at", { ascending: false })
      .limit(1);

    if (pending && pending[0]) {
      const meta = pending[0].metadata || {};
      const ref  = meta.approval_ref;
      const type = (meta.approval_type || "").toLowerCase();

      // Update relevant table
      if (type.includes("requisition")) {
        await db.from("requisitions").update({ status: "approved", approved_by: from }).eq("id", meta.record_id || "");
      } else if (type.includes("purchase") || type.includes("po")) {
        await db.from("purchase_orders").update({ status: "approved" }).eq("id", meta.record_id || "");
      } else if (type.includes("payment")) {
        await db.from("payment_vouchers").update({ status: "approved" }).eq("id", meta.record_id || "");
      }

      // Update approval status in metadata
      await db.from("sms_messages").update({
        metadata: { ...meta, approval_status: "approved", approved_by: from, approved_at: new Date().toISOString() }
      }).eq("id", pending[0].id);

      // Log audit
      await db.from("audit_logs").insert({
        action: "whatsapp_approval",
        details: `${ref} APPROVED via WhatsApp by ${from}`,
        created_at: new Date().toISOString(),
      }).then(() => {});

      await sendWA(from, `✅ *Approved*\nYou approved *${ref}*.\nThe system has been updated.\n\n_EL5 MediProcure_`);
    } else {
      await sendWA(from, `✅ Approval recorded. No pending approval found for your number.\n\n_EL5 MediProcure_`);
    }
    return new Response("<?xml version=\"1.0\"?><Response/>", { headers: { "Content-Type": "text/xml" } });
  }

  // Handle REJECT
  if (msgLower.startsWith("reject")) {
    const reason = body.slice(6).trim() || "No reason given";
    const { data: pending } = await db.from("sms_messages")
      .select("id,metadata,to_number")
      .eq("to_number", from)
      .eq("channel", "whatsapp")
      .not("metadata->approval_ref", "is", null)
      .order("sent_at", { ascending: false })
      .limit(1);

    if (pending && pending[0]) {
      const meta = pending[0].metadata || {};
      const ref  = meta.approval_ref;
      const type = (meta.approval_type || "").toLowerCase();

      if (type.includes("requisition")) {
        await db.from("requisitions").update({ status: "rejected", rejection_reason: reason }).eq("id", meta.record_id || "");
      } else if (type.includes("purchase") || type.includes("po")) {
        await db.from("purchase_orders").update({ status: "rejected" }).eq("id", meta.record_id || "");
      } else if (type.includes("payment")) {
        await db.from("payment_vouchers").update({ status: "rejected" }).eq("id", meta.record_id || "");
      }

      await db.from("sms_messages").update({
        metadata: { ...meta, approval_status: "rejected", rejected_by: from, rejection_reason: reason, rejected_at: new Date().toISOString() }
      }).eq("id", pending[0].id);

      await db.from("audit_logs").insert({
        action: "whatsapp_rejection",
        details: `${ref} REJECTED via WhatsApp by ${from}. Reason: ${reason}`,
        created_at: new Date().toISOString(),
      }).then(() => {});

      await sendWA(from, `❌ *Rejected*\n*${ref}* has been rejected.\nReason: ${reason}\n\n_EL5 MediProcure_`);
    } else {
      await sendWA(from, `❌ Rejection recorded.\n\n_EL5 MediProcure_`);
    }
    return new Response("<?xml version=\"1.0\"?><Response/>", { headers: { "Content-Type": "text/xml" } });
  }

  // Handle STATUS
  if (msgLower === "status" || msgLower === "help") {
    await sendWA(from, `🏥 *EL5 MediProcure*\n\nAvailable commands:\n✅ *APPROVE* — Approve pending request\n❌ *REJECT reason* — Reject with reason\n📊 *STATUS* — Show this help\n\nPowered by ProcurBosse`);
    return new Response("<?xml version=\"1.0\"?><Response/>", { headers: { "Content-Type": "text/xml" } });
  }

  return new Response("<?xml version=\"1.0\"?><Response/>", { headers: { "Content-Type": "text/xml" } });
});
