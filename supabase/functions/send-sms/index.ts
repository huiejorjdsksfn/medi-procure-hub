/**
 * EL5 MediProcure — send-sms Edge Function v10.0 NUCLEAR FIX
 * Auth: Account SID + Auth Token (DIRECT — no API Key, no MessagingServiceSid)
 * FROM: +16812972643 (hardcoded — verified on account AC9ce73d...)
 * Supports: SMS, WhatsApp, bulk send, inbound webhook, session renewal
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-twilio-signature",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// NEVER use TWILIO_PHONE_NUMBER env — it maps to +18777804236 (different account)
const VERIFIED_FROM_SMS = "+16812972643";
const VERIFIED_FROM_WA  = "whatsapp:+14155238886";
const HOSPITAL = "EL5 MediProcure";

function e164(raw: string): string {
  const n = String(raw).replace(/[\s\-\(\)\.]/g, "").trim();
  if (!n) return n;
  if (n.startsWith("+")) return n;
  if (n.startsWith("07") || n.startsWith("01")) return "+254" + n.slice(1);
  if (n.startsWith("254")) return "+" + n;
  if (n.length === 9 && /^\d+$/.test(n)) return "+254" + n;
  return n;
}
function escXml(s: string): string {
  return String(s).replace(/[<>&"']/g, (c:string) =>
    ({"<":"&lt;",">":"&gt;","&":"&amp;",'"':'&quot;',"\'":"&apos;"}[c]!));
}

const TEMPLATES: Record<string, (d: Record<string,string>) => string> = {
  requisition_submitted: d => `[${HOSPITAL}] Requisition ${d.num} submitted by ${d.dept}. Pending approval.`,
  requisition_approved:  d => `[${HOSPITAL}] Requisition ${d.num} APPROVED by ${d.approver||"Manager"}. PO will be raised.`,
  requisition_rejected:  d => `[${HOSPITAL}] Requisition ${d.num} REJECTED. Reason: ${d.reason||"See system"}.`,
  requisition_pending:   d => `[${HOSPITAL}] Requisition ${d.num} awaiting your approval. Please action now.`,
  po_raised:             d => `[${HOSPITAL}] PO ${d.num} raised for ${d.supplier}. ETA: ${d.eta||"TBC"}.`,
  po_sent:               d => `[${HOSPITAL}] PO ${d.num} sent to ${d.supplier}. Awaiting confirmation.`,
  goods_received:        d => `[${HOSPITAL}] Goods received for PO ${d.num}. Items: ${d.items}. GRN recorded.`,
  low_stock_alert:       d => `[${HOSPITAL}] LOW STOCK: ${d.item} — ${d.qty} ${d.unit} remaining.`,
  voucher_approved:      d => `[${HOSPITAL}] Voucher ${d.num} (KES ${d.amount}) APPROVED. Ready for payment.`,
  payment_processed:     d => `[${HOSPITAL}] Payment KES ${d.amount} to ${d.payee} processed. Ref: ${d.ref}.`,
  system_alert:          d => `[${HOSPITAL}] ${d.message||"System notification"}`,
  custom:                d => d.message || "",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const respond = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { ...CORS, "Content-Type": "application/json" } });

  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: rows } = await sb.from("system_settings").select("key,value")
      .in("key", ["twilio_account_sid", "twilio_auth_token"]);
    const cfg: Record<string,string> = {};
    for (const r of rows ?? []) cfg[r.key] = r.value;

    const ACCT  = Deno.env.get("TWILIO_ACCOUNT_SID") || cfg["twilio_account_sid"] || "";
    const TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")  || cfg["twilio_auth_token"]  || "";
    const auth  = "Basic " + btoa(`${ACCT}:${TOKEN}`);

    let body: any = {};
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("json")) body = await req.json().catch(() => ({}));
    else if (ct.includes("form")) {
      const fd = await req.formData().catch(() => null);
      if (fd) fd.forEach((v, k) => { body[k] = String(v); });
    }

    const { action, to, message, event, templateData = {}, channel = "sms", module: mod } = body;
    console.log(`[SMS v10] action=${action||"send"} ACCT=${ACCT.slice(0,12)}... TOKEN=${!!TOKEN}`);

    if (action === "status") {
      const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${ACCT}.json`,
        { headers: { Authorization: auth }, signal: AbortSignal.timeout(8000) });
      const d = await r.json();
      const nr = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${ACCT}/IncomingPhoneNumbers.json?PageSize=20`,
        { headers: { Authorization: auth }, signal: AbortSignal.timeout(8000) });
      const nd = await nr.json();
      const phones = (nd.incoming_phone_numbers ?? []).map((p: any) => p.phone_number);
      return respond({ ok: r.ok && d.status === "active", account_status: d.status,
        friendly_name: d.friendly_name, acct: ACCT.slice(0,12)+"...",
        from_sms: VERIFIED_FROM_SMS, token_set: !!TOKEN,
        phone_numbers_on_account: phones });
    }

    if (action === "inbound" || req.url.includes("webhook")) {
      const from  = body.From || ""; const msgBody = body.Body || ""; const sid = body.MessageSid || "";
      const phone = from.replace("whatsapp:", ""); const lower = msgBody.trim().toLowerCase();
      await Promise.allSettled([
        sb.from("sms_log").insert({ to_number:from, from_number:phone, message:msgBody.slice(0,500),
          status:"received", twilio_sid:sid, module:"inbound", provider:"twilio_sms", sent_at:new Date().toISOString() }),
        sb.from("sms_conversations").upsert({ phone_number:phone, last_message:msgBody.slice(0,100),
          last_message_at:new Date().toISOString(), status:"open", unread_count:1 }, { onConflict:"phone_number" }),
      ]);
      let reply = "";
      if (lower==="help"||lower==="menu") reply=`EL5 MediProcure:\n• STATUS <REQ-ID>\n• STOP — Unsubscribe\n• START — Subscribe\nHospital: +254 068 31055`;
      else if (lower==="stop") { await sb.from("sms_conversations").update({status:"closed"}).eq("phone_number",phone); reply="Unsubscribed. Reply START to re-subscribe."; }
      else if (lower==="start") reply="Welcome back to EL5 MediProcure notifications!";
      else if (lower.startsWith("status ")) {
        const id=msgBody.trim().split(" ")[1];
        const {data:r}=await sb.from("requisitions").select("id,status,title").ilike("requisition_number",`%${id}%`).limit(1);
        reply=r?.[0]?`REQ: ${(r[0] as any).title?.slice(0,40)||id}\nStatus: ${String((r[0] as any).status).toUpperCase()}`:`Requisition "${id}" not found.`;
      }
      return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${reply?`<Message>${escXml(reply)}</Message>`:""}</Response>`,
        { headers: { ...CORS, "Content-Type": "text/xml" } });
    }

    const numbers = (Array.isArray(to) ? to : String(to||"").split(",").map((s:string)=>s.trim()))
      .filter(Boolean).map(e164);
    if (!numbers.length) return respond({ ok:false, error:"to is required" }, 400);
    if (!ACCT||!TOKEN) return respond({ ok:false, error:"Credentials not configured", acct_set:!!ACCT, token_set:!!TOKEN });

    const td = (templateData||{}) as Record<string,string>;
    const smsBody = message||(event&&TEMPLATES[event]?TEMPLATES[event](td):null)||`[${HOSPITAL}] Notification`;
    const isWA = channel==="whatsapp";
    const results: any[] = [];

    for (const num of numbers) {
      const {data:logRow} = await sb.from("sms_log").insert({
        to_number:num, from_number:VERIFIED_FROM_SMS, message:smsBody,
        status:"queued", module:event??mod??"custom", provider:isWA?"twilio_wa":"twilio_sms",
        sent_at:new Date().toISOString(),
      }).select("id").maybeSingle();

      const params: Record<string,string> = { Body:smsBody, From:isWA?VERIFIED_FROM_WA:VERIFIED_FROM_SMS,
        To:isWA?(num.startsWith("whatsapp:")?num:`whatsapp:${num}`):num };

      const tr = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${ACCT}/Messages.json`, {
        method:"POST", headers:{Authorization:auth,"Content-Type":"application/x-www-form-urlencoded"},
        body:new URLSearchParams(params), signal:AbortSignal.timeout(15000),
      });
      const rd = await tr.json();
      const ok = tr.ok && !!rd.sid;
      console.log(`[SMS v10] to=${num} ok=${ok} sid=${rd.sid} code=${rd.code} err=${rd.message}`);

      if ((logRow as any)?.id) await sb.from("sms_log").update({
        status:ok?"sent":"failed", twilio_sid:rd.sid??null,
        error_msg:ok?null:(rd.message??`HTTP ${tr.status}`),
      }).eq("id",(logRow as any).id);

      results.push({to:num, ok, sid:rd.sid, provider:isWA?"twilio_wa":"twilio_sms", error:rd.message});
      if (numbers.length>1) await new Promise(r=>setTimeout(r,150));
    }
    const sent=results.filter(r=>r.ok).length;
    return respond({ ok:sent>0, sent, failed:results.length-sent, total:results.length, from:VERIFIED_FROM_SMS, results });

  } catch(e:any) {
    console.error("[SMS v10] Fatal:", e.message);
    return respond({ ok:false, error:e.message }, 500);
  }
});
