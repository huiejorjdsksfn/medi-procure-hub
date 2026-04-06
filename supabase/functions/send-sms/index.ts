/**
 * ProcurBosse — send-sms Edge Function v6.0
 * REAL-TIME SMS + WhatsApp with auto bad-machine session renewal
 * Twilio Messaging Service EL5H (MG2fffc3a381c44a202c316dcc6400707d)
 * Africa's Talking fallback · Conversation tracking · Cross-platform
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-twilio-signature",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const sb = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// ── Hardcoded EL5H Twilio credentials (always available) ─────────────────────
const EL5H = {
  ACCOUNT_SID:  Deno.env.get("TWILIO_ACCOUNT_SID")  ?? "ACe96c6e0e5edd4de5f5a4c6d9cc7b7c5a",
  AUTH_TOKEN:   Deno.env.get("TWILIO_AUTH_TOKEN")   ?? "",
  SMS_NUMBER:   "+16812972643",
  WA_NUMBER:    "+14155238886",
  MSG_SVC_SID:  "MG2fffc3a381c44a202c316dcc6400707d",
  WA_JOIN_CODE: "join bad-machine",
  SERVICE_NAME: "EL5H",
};

// ── Load config from DB ───────────────────────────────────────────────────────
async function getCfg(): Promise<Record<string,string>> {
  try {
    const { data } = await sb.from("system_settings").select("key,value").in("key", [
      "twilio_account_sid","twilio_auth_token","twilio_phone_number",
      "twilio_messaging_service_sid","twilio_enabled","twilio_whatsapp_number",
      "at_api_key","at_username","at_sender_id","at_enabled",
      "sms_hospital_name","sms_provider","whatsapp_sandbox_active",
    ]);
    const cfg: Record<string,string> = {};
    (data||[]).forEach((r:any) => { if (r.value) cfg[r.key] = r.value; });
    // Ensure EL5H defaults
    cfg.twilio_account_sid          ||= EL5H.ACCOUNT_SID;
    cfg.twilio_auth_token           ||= EL5H.AUTH_TOKEN;
    cfg.twilio_phone_number         ||= EL5H.SMS_NUMBER;
    cfg.twilio_messaging_service_sid ||= EL5H.MSG_SVC_SID;
    cfg.twilio_whatsapp_number      ||= EL5H.WA_NUMBER;
    cfg.sms_hospital_name           ||= "EL5 MediProcure";
    cfg.at_api_key                  ||= Deno.env.get("AT_API_KEY") ?? "";
    cfg.at_username                 ||= Deno.env.get("AT_USERNAME") ?? "";
    return cfg;
  } catch { return { ...EL5H, sms_hospital_name:"EL5 MediProcure" }; }
}

// ── Phone normaliser (E.164 Kenya-aware) ─────────────────────────────────────
function fmtPhone(raw: string): string {
  let n = String(raw).replace(/[\s\-\(\)\.]/g, "");
  if (n.startsWith("07") || n.startsWith("01")) return "+254" + n.slice(1);
  if (n.startsWith("254") && !n.startsWith("+"))  return "+" + n;
  if (!n.startsWith("+")) return "+254" + n;
  return n;
}

// ── WhatsApp: check & renew sandbox session ───────────────────────────────────
async function checkWhatsAppSession(cfg: Record<string,string>, to: string): Promise<{active:boolean; renewedAt?:string}> {
  // Query Twilio sandbox participants
  const sid   = cfg.twilio_account_sid;
  const token = cfg.twilio_auth_token;
  if (!sid || !token) return { active: false };

  try {
    // Get sandbox binding list to check if number is enrolled
    const resp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json?To=${encodeURIComponent("whatsapp:"+to)}&From=${encodeURIComponent("whatsapp:"+EL5H.WA_NUMBER)}&PageSize=1`,
      { headers: { "Authorization": "Basic " + btoa(`${sid}:${token}`) } }
    );
    const data = await resp.json();
    const hasRecentMsg = (data.messages||[]).length > 0;
    
    if (!hasRecentMsg) {
      // Send join reminder via SMS first
      console.log(`WhatsApp not active for ${to} — sending join reminder`);
      await sendViaTwilio(cfg, to, `To receive WhatsApp messages from EL5 MediProcure, please send: ${EL5H.WA_JOIN_CODE} to ${EL5H.WA_NUMBER} on WhatsApp.`, "sms");
    }
    
    return { active: hasRecentMsg, renewedAt: hasRecentMsg ? undefined : new Date().toISOString() };
  } catch {
    return { active: false };
  }
}

// ── Auto-renew WhatsApp sandbox sessions (called periodically) ───────────────
async function renewWhatsAppSessions(cfg: Record<string,string>): Promise<{renewed:number; checked:number}> {
  // Get all numbers that have had WhatsApp conversations
  const { data: convos } = await sb.from("sms_conversations").select("phone_number,last_message_at")
    .not("phone_number", "is", null);
  
  let renewed = 0;
  const checked = (convos||[]).length;

  for (const convo of (convos||[])) {
    // If last message was >23 hours ago, proactively renew session
    const lastMsg = convo.last_message_at ? new Date(convo.last_message_at) : new Date(0);
    const hoursSince = (Date.now() - lastMsg.getTime()) / 3600000;
    
    if (hoursSince > 22 && hoursSince < 72) {
      // Within renewal window — send keep-alive
      try {
        const msg = `[EL5 MediProcure] Your ERP notification service is active. Reply HELP for assistance or STOP to unsubscribe.`;
        await sendViaTwilio(cfg, convo.phone_number, msg, "whatsapp");
        renewed++;
        await new Promise(r => setTimeout(r, 500)); // Rate limit
      } catch { /* continue */ }
    }
  }

  // Log renewal
  await sb.from("system_settings").upsert({
    key: "whatsapp_last_renewal",
    value: new Date().toISOString(),
    description: `Last WhatsApp session renewal: ${renewed} renewed of ${checked} checked`,
  }, { onConflict: "key" });

  return { renewed, checked };
}

// ── Twilio delivery (SMS + WhatsApp) ─────────────────────────────────────────
async function sendViaTwilio(
  cfg: Record<string,string>, to: string, body: string, channel: "sms"|"whatsapp" = "sms"
): Promise<{ok:boolean; sid?:string; status?:string; cost?:number; error?:string; provider:string}> {
  const sid   = cfg.twilio_account_sid;
  const token = cfg.twilio_auth_token;
  if (!sid || !token) return { ok:false, error:"Twilio credentials not set", provider:"twilio" };

  const msSid = cfg.twilio_messaging_service_sid || EL5H.MSG_SVC_SID;
  
  // Build params based on channel
  const params: Record<string,string> = { Body: body };
  
  if (channel === "whatsapp") {
    params.From = `whatsapp:${cfg.twilio_whatsapp_number || EL5H.WA_NUMBER}`;
    params.To   = `whatsapp:${to}`;
  } else {
    params.To = to;
    if (msSid) params.MessagingServiceSid = msSid;
    else params.From = cfg.twilio_phone_number || EL5H.SMS_NUMBER;
  }

  try {
    const resp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Authorization": "Basic " + btoa(`${sid}:${token}`),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(params).toString(),
      }
    );
    const data = await resp.json();
    if (!resp.ok) return { ok:false, error:`${data.message} (code:${data.code})`, provider:"twilio" };
    return { ok:true, sid:data.sid, status:data.status, cost:Math.abs(parseFloat(data.price||"0")), provider:"twilio" };
  } catch (e:any) {
    return { ok:false, error:e.message, provider:"twilio" };
  }
}

// ── Africa's Talking fallback ─────────────────────────────────────────────────
async function sendViaAT(cfg: Record<string,string>, to: string, body: string): Promise<{ok:boolean; messageId?:string; error?:string; provider:string}> {
  if (!cfg.at_api_key || !cfg.at_username) return { ok:false, error:"AT credentials not set", provider:"africas_talking" };
  try {
    const params: Record<string,string> = { username:cfg.at_username, to, message:body };
    if (cfg.at_sender_id) params.from = cfg.at_sender_id;
    const resp = await fetch("https://api.africastalking.com/version1/messaging", {
      method:"POST",
      headers:{ "apiKey":cfg.at_api_key, "Content-Type":"application/x-www-form-urlencoded", "Accept":"application/json" },
      body: new URLSearchParams(params).toString(),
    });
    const data = await resp.json();
    const msg  = data?.SMSMessageData?.Recipients?.[0];
    if (!resp.ok || msg?.statusCode !== 101) return { ok:false, error:msg?.status||"AT failed", provider:"africas_talking" };
    return { ok:true, messageId:msg?.messageId, provider:"africas_talking" };
  } catch (e:any) {
    return { ok:false, error:e.message, provider:"africas_talking" };
  }
}

// ── Log to reception_messages + sms_log ──────────────────────────────────────
async function logMsg(to:string, body:string, result:any, meta:any, channel:string) {
  try {
    await Promise.all([
      // reception_messages (primary)
      sb.from("reception_messages").insert({
        recipient_phone: to,
        recipient_name:  meta.recipient_name || null,
        message_body:    body,
        message_type:    channel,
        direction:       "outbound",
        department:      meta.department || null,
        status:          result.ok ? "sent" : "failed",
        twilio_sid:      result.sid || null,
        error_code:      result.error || null,
        sent_at:         new Date().toISOString(),
      }),
      // sms_log (legacy compat)
      sb.from("sms_log").insert({
        to_number: to, from_number: meta.from||EL5H.SMS_NUMBER, message:body,
        status: result.ok?"sent":"failed", twilio_sid:result.sid||null,
        module: meta.module||"system", error_msg: result.error||null,
        cost: result.cost||null, sent_at: new Date().toISOString(),
      }).catch(()=>null),
      // Update conversation
      sb.from("sms_conversations").upsert({
        phone_number: to,
        contact_name: meta.recipient_name || null,
        last_message: body.slice(0,100),
        last_message_at: new Date().toISOString(),
        status: "open",
      }, { onConflict:"phone_number" }).catch(()=>null),
    ]);
  } catch { /* non-fatal */ }
}

// ── Inbound webhook handler (from Twilio) ────────────────────────────────────
async function handleInbound(formData: URLSearchParams): Promise<string> {
  const from    = formData.get("From") || "";
  const body    = formData.get("Body") || "";
  const msgSid  = formData.get("MessageSid") || "";
  const channel = from.startsWith("whatsapp:") ? "whatsapp" : "sms";
  const phone   = from.replace("whatsapp:", "");

  // Store inbound
  await sb.from("reception_messages").insert({
    recipient_phone: phone, message_body: body, message_type: channel,
    direction:"inbound", status:"received", twilio_sid:msgSid,
    sent_at: new Date().toISOString(),
  }).catch(()=>null);

  // Update conversation thread
  await sb.from("sms_conversations").upsert({
    phone_number: phone, last_message: body.slice(0,100),
    last_message_at: new Date().toISOString(), status:"open",
    unread_count: 1,
  }, { onConflict:"phone_number" }).catch(()=>null);

  // Keyword routing for auto-replies
  const lower = body.toLowerCase().trim();
  let reply = "";

  if (lower === "help" || lower === "menu") {
    reply = `EL5 MediProcure SMS Help:\n• STOP — Unsubscribe\n• STATUS REQ-XXX — Requisition status\n• PO LPO-XXX — Purchase order status\n• STOCK [item] — Stock level\n\nCall: +254 (hospital number)`;
  } else if (lower === "stop" || lower === "unsubscribe") {
    reply = `You have been unsubscribed from EL5 MediProcure notifications. Reply START to re-subscribe.`;
    await sb.from("sms_conversations").update({ status:"closed" }).eq("phone_number", phone).catch(()=>null);
  } else if (lower === "start" || lower === "subscribe") {
    reply = `Welcome back to EL5 MediProcure! You are now subscribed to procurement notifications. Reply HELP for options.`;
  } else if (lower.startsWith("status ")) {
    const reqId = body.split(" ")[1];
    const { data:req } = await sb.from("requisitions").select("id,status,title").ilike("id","%" + reqId + "%").limit(1);
    reply = req?.[0] ? `Requisition ${req[0].id}: ${req[0].status}\n${req[0].title||""}` : `Requisition ${reqId} not found. Contact procurement.`;
  } else {
    // Generic acknowledgement
    reply = `Message received by EL5 Hospital (${new Date().toLocaleString("en-KE",{timeZone:"Africa/Nairobi"})}). We will respond shortly.`;
  }

  // TwiML response
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>${reply ? `<Message>${reply}</Message>` : ""}</Response>`;
}

// ── Main serve ────────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const url = new URL(req.url);

  // ── Inbound SMS/WhatsApp webhook (GET or POST from Twilio) ──
  if (req.method === "POST" && url.searchParams.get("webhook") === "inbound") {
    const formData = await req.formData();
    const params   = new URLSearchParams();
    formData.forEach((v,k) => params.set(k, v.toString()));
    const twiml = await handleInbound(params);
    return new Response(twiml, { headers: { ...cors, "Content-Type": "text/xml" } });
  }

  // ── WhatsApp session renewal (called from cron/admin) ──
  if (req.method === "POST" && url.searchParams.get("action") === "renew_sessions") {
    const cfg = await getCfg();
    const result = await renewWhatsAppSessions(cfg);
    return new Response(JSON.stringify({ ok:true, ...result }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  // ── Standard outbound send ─────────────────────────────────────────────────
  try {
    const body  = await req.json();
    const { to, message, channel = "sms", module: mod, record_id, sent_by, recipient_name, department } = body;

    if (!to || !message) {
      return new Response(JSON.stringify({ ok:false, error:"to and message required" }),
        { status:400, headers: { ...cors, "Content-Type":"application/json" } });
    }

    const cfg = await getCfg();
    const hospitalName = cfg.sms_hospital_name || "EL5 MediProcure";
    const prefix = `[${hospitalName}] `;
    const fullMsg = (prefix + message).slice(0, 1600);

    // Parse recipients
    const numbers = (Array.isArray(to) ? to : String(to).split(",").map(s=>s.trim()))
      .filter(Boolean).map(fmtPhone);

    const results: any[] = [];

    for (const num of numbers) {
      let result: any;

      if (channel === "whatsapp") {
        // Check session before sending
        const session = await checkWhatsAppSession(cfg, num);
        if (!session.active) {
          // Try anyway (user may have just joined)
          result = await sendViaTwilio(cfg, num, fullMsg, "whatsapp");
          if (!result.ok) {
            result.error = `WhatsApp session inactive — join reminder sent. ${result.error||""}`;
          }
        } else {
          result = await sendViaTwilio(cfg, num, fullMsg, "whatsapp");
        }
      } else {
        // SMS — try Twilio first, then AT fallback
        result = await sendViaTwilio(cfg, num, fullMsg, "sms");
        if (!result.ok && cfg.at_api_key) {
          console.warn(`Twilio SMS failed for ${num}: ${result.error} — AT fallback`);
          result = await sendViaAT(cfg, num, fullMsg);
        }
      }

      await logMsg(num, fullMsg, result, { recipient_name, department, module:mod, record_id, sent_by, from:cfg.twilio_phone_number }, channel);
      results.push({ to:num, channel, ok:result.ok, sid:result.sid||result.messageId, provider:result.provider, error:result.error });
    }

    const sentCnt  = results.filter(r=>r.ok).length;
    return new Response(JSON.stringify({
      ok: sentCnt > 0,
      sent:  sentCnt,
      failed: results.length - sentCnt,
      total:  results.length,
      messaging_service: EL5H.SERVICE_NAME,
      messaging_service_sid: EL5H.MSG_SVC_SID,
      sms_number:    EL5H.SMS_NUMBER,
      wa_number:     EL5H.WA_NUMBER,
      wa_join_code:  EL5H.WA_JOIN_CODE,
      results,
    }), { headers: { ...cors, "Content-Type": "application/json" } });

  } catch (err:any) {
    console.error("send-sms fatal:", err);
    return new Response(JSON.stringify({ ok:false, error:err.message }),
      { status:500, headers: { ...cors, "Content-Type":"application/json" } });
  }
});
