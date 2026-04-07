/**
 * ProcurBosse — send-sms Edge Function v7.0
 * FULLY ACTIVATED: Twilio SMS + WhatsApp + Africa's Talking fallback
 * Auto session renewal · Inbound webhook · Conversation tracking
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

// ── EL5H Twilio Credentials (hardcoded + env override) ────────────────────
const EL5H = {
  ACCOUNT_SID:  Deno.env.get("TWILIO_ACCOUNT_SID")  || "ACe96c6e0e5edd4de5f5a4c6d9cc7b7c5a",
  AUTH_TOKEN:   Deno.env.get("TWILIO_AUTH_TOKEN")   || "d73601fbefe26e01b06e22c53a798ea6",
  SMS_NUMBER:   "+16812972643",
  WA_NUMBER:    "+14155238886",
  MSG_SVC_SID:  "VA692606d4faea3c18432a857f111dbfad",
  WA_JOIN_CODE: "join bad-machine",
  SERVICE_NAME: "EL5H",
  VOICE_WEBHOOK:"https://demo.twilio.com/welcome/voice/",
};

// ── Load live config from system_settings (DB values override defaults) ────
async function getCfg(): Promise<Record<string,string>> {
  try {
    const { data } = await sb.from("system_settings").select("key,value")
      .in("key", [
        "twilio_account_sid","twilio_auth_token","twilio_phone_number",
        "twilio_messaging_service_sid","twilio_enabled","twilio_whatsapp_number",
        "at_api_key","at_username","at_sender_id","at_enabled",
        "sms_hospital_name","sms_provider","whatsapp_sandbox_active",
      ]);
    const cfg: Record<string,string> = {};
    (data||[]).forEach((r:any) => { if (r.value && r.value !== "") cfg[r.key] = r.value; });
    // Always ensure EL5H defaults are present
    cfg.twilio_account_sid           = cfg.twilio_account_sid           || EL5H.ACCOUNT_SID;
    cfg.twilio_auth_token            = cfg.twilio_auth_token            || EL5H.AUTH_TOKEN;
    cfg.twilio_phone_number          = cfg.twilio_phone_number          || EL5H.SMS_NUMBER;
    cfg.twilio_messaging_service_sid = cfg.twilio_messaging_service_sid || EL5H.MSG_SVC_SID;
    cfg.twilio_whatsapp_number       = cfg.twilio_whatsapp_number       || EL5H.WA_NUMBER;
    cfg.sms_hospital_name            = cfg.sms_hospital_name            || "EL5 MediProcure";
    cfg.at_api_key                   = cfg.at_api_key                   || (Deno.env.get("AT_API_KEY") ?? "");
    cfg.at_username                  = cfg.at_username                  || (Deno.env.get("AT_USERNAME") ?? "");
    cfg.twilio_enabled               = "true"; // always enabled in edge function
    return cfg;
  } catch (e) {
    console.error("getCfg error:", e);
    return {
      twilio_account_sid: EL5H.ACCOUNT_SID,
      twilio_auth_token: EL5H.AUTH_TOKEN,
      twilio_phone_number: EL5H.SMS_NUMBER,
      twilio_messaging_service_sid: EL5H.MSG_SVC_SID,
      twilio_whatsapp_number: EL5H.WA_NUMBER,
      sms_hospital_name: "EL5 MediProcure",
      twilio_enabled: "true",
    };
  }
}

// ── Phone normaliser (E.164, Kenya-aware) ──────────────────────────────────
function fmtPhone(raw: string): string {
  let n = String(raw).replace(/[\s\-\(\)\.]/g, "");
  if (n.startsWith("07") || n.startsWith("01")) return "+254" + n.slice(1);
  if (n.startsWith("254") && !n.startsWith("+"))  return "+" + n;
  if (!n.startsWith("+")) return "+254" + n;
  return n;
}

// ── Send via Twilio (SMS or WhatsApp) ─────────────────────────────────────
async function sendViaTwilio(
  cfg: Record<string,string>, to: string, body: string, channel: "sms"|"whatsapp" = "sms"
): Promise<{ok:boolean; sid?:string; status?:string; cost?:number; error?:string; provider:string}> {
  const sid   = cfg.twilio_account_sid;
  const token = cfg.twilio_auth_token;
  if (!sid)   return { ok:false, error:"Twilio account SID not set", provider:"twilio" };
  if (!token) return { ok:false, error:"Twilio auth token not configured — set TWILIO_AUTH_TOKEN in Supabase secrets", provider:"twilio" };

  const msSid = cfg.twilio_messaging_service_sid || EL5H.MSG_SVC_SID;
  const params: Record<string,string> = { Body: body };

  if (channel === "whatsapp") {
    params.From = `whatsapp:${cfg.twilio_whatsapp_number || EL5H.WA_NUMBER}`;
    params.To   = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
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
    if (!resp.ok) {
      return { ok:false, error:`Twilio error ${data.code}: ${data.message}`, provider:"twilio" };
    }
    return {
      ok: true, sid: data.sid, status: data.status,
      cost: Math.abs(parseFloat(data.price || "0")),
      provider: "twilio",
    };
  } catch (e:any) {
    return { ok:false, error:e.message, provider:"twilio" };
  }
}

// ── Africa's Talking fallback ──────────────────────────────────────────────
async function sendViaAT(
  cfg: Record<string,string>, to: string, body: string
): Promise<{ok:boolean; messageId?:string; error?:string; provider:string}> {
  if (!cfg.at_api_key || !cfg.at_username) {
    return { ok:false, error:"Africa's Talking credentials not set", provider:"africas_talking" };
  }
  try {
    const params: Record<string,string> = { username:cfg.at_username, to, message:body };
    if (cfg.at_sender_id) params.from = cfg.at_sender_id;
    const resp = await fetch("https://api.africastalking.com/version1/messaging", {
      method:"POST",
      headers:{
        "apiKey": cfg.at_api_key,
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body: new URLSearchParams(params).toString(),
    });
    const data = await resp.json();
    const msg  = data?.SMSMessageData?.Recipients?.[0];
    if (!resp.ok || msg?.statusCode !== 101) {
      return { ok:false, error:msg?.status || "Africa's Talking failed", provider:"africas_talking" };
    }
    return { ok:true, messageId:msg?.messageId, provider:"africas_talking" };
  } catch (e:any) {
    return { ok:false, error:e.message, provider:"africas_talking" };
  }
}

// ── Log to reception_messages + sms_log + conversation ────────────────────
async function logMsg(to:string, body:string, result:any, meta:any, channel:string) {
  try {
    await Promise.allSettled([
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
      sb.from("sms_log").insert({
        to_number: to, from_number: meta.from||EL5H.SMS_NUMBER,
        message: body, status: result.ok ? "sent" : "failed",
        twilio_sid: result.sid||null, module: meta.module||"system",
        error_msg: result.error||null, cost: result.cost||null,
        sent_at: new Date().toISOString(),
      }),
      sb.from("sms_conversations").upsert({
        phone_number:    to,
        contact_name:    meta.recipient_name || null,
        last_message:    body.slice(0, 100),
        last_message_at: new Date().toISOString(),
        status:          "open",
      }, { onConflict:"phone_number" }),
    ]);
  } catch { /* non-fatal logging */ }
}

// ── WhatsApp session renewal ───────────────────────────────────────────────
async function renewWhatsAppSessions(cfg: Record<string,string>): Promise<{renewed:number; checked:number}> {
  const { data: convos } = await sb.from("sms_conversations")
    .select("phone_number,last_message_at").not("phone_number","is",null);
  let renewed = 0;
  const checked = (convos||[]).length;
  for (const convo of (convos||[])) {
    const lastMsg  = convo.last_message_at ? new Date(convo.last_message_at) : new Date(0);
    const hoursSince = (Date.now() - lastMsg.getTime()) / 3600000;
    if (hoursSince > 22 && hoursSince < 72) {
      try {
        const msg = `[EL5 MediProcure] Your procurement notifications service is active. Reply HELP for options.`;
        await sendViaTwilio(cfg, convo.phone_number, msg, "whatsapp");
        renewed++;
        await new Promise(r => setTimeout(r, 600));
      } catch { /* continue */ }
    }
  }
  await sb.from("system_settings").upsert({
    key:"whatsapp_last_renewal",
    value: new Date().toISOString(),
    description: `Renewed ${renewed} of ${checked} WhatsApp sessions`,
  }, { onConflict:"key" });
  return { renewed, checked };
}

// ── Inbound webhook handler ────────────────────────────────────────────────
async function handleInbound(params: URLSearchParams): Promise<string> {
  const from    = params.get("From") || "";
  const body    = params.get("Body") || "";
  const msgSid  = params.get("MessageSid") || "";
  const channel = from.startsWith("whatsapp:") ? "whatsapp" : "sms";
  const phone   = from.replace("whatsapp:","");
  const lower   = body.toLowerCase().trim();

  await Promise.allSettled([
    sb.from("reception_messages").insert({
      recipient_phone: phone, message_body: body,
      message_type: channel, direction: "inbound",
      status: "received", twilio_sid: msgSid,
      sent_at: new Date().toISOString(),
    }),
    sb.from("sms_conversations").upsert({
      phone_number: phone, last_message: body.slice(0,100),
      last_message_at: new Date().toISOString(),
      status: "open", unread_count: 1,
    }, { onConflict:"phone_number" }),
  ]);

  let reply = "";
  if (lower === "help" || lower === "menu") {
    reply = `EL5 MediProcure SMS Menu:\n• STATUS [REQ-ID] — Requisition status\n• PO [LPO-ID] — Purchase order\n• STOCK [item] — Stock level\n• STOP — Unsubscribe\n\nHospital: +254 (main line)`;
  } else if (lower === "stop" || lower === "unsubscribe") {
    reply = "You have been unsubscribed from EL5 MediProcure alerts. Reply START to re-subscribe.";
    await sb.from("sms_conversations").update({status:"closed"}).eq("phone_number",phone);
  } else if (lower === "start" || lower === "subscribe") {
    reply = "Welcome to EL5 MediProcure! You are now subscribed to procurement notifications. Reply HELP for options.";
  } else if (lower.startsWith("status ")) {
    const reqId = body.split(" ")[1];
    const { data:req } = await sb.from("requisitions").select("id,status,title").ilike("id",`%${reqId}%`).limit(1);
    reply = req?.[0] ? `REQ ${req[0].id}: ${req[0].status}\n${req[0].title||""}` : `Requisition ${reqId} not found.`;
  } else {
    reply = `Received (${new Date().toLocaleString("en-KE",{timeZone:"Africa/Nairobi",hour:"2-digit",minute:"2-digit"})}). EL5 Hospital will respond shortly.`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<Response>${reply ? `<Message>${reply}</Message>` : ""}</Response>`;
}

// ── Main ──────────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const url = new URL(req.url);

  // Inbound webhook
  if (req.method === "POST" && url.searchParams.get("webhook") === "inbound") {
    const fd = await req.formData();
    const p  = new URLSearchParams();
    fd.forEach((v,k) => p.set(k,v.toString()));
    const twiml = await handleInbound(p);
    return new Response(twiml, { headers: { ...cors, "Content-Type":"text/xml" } });
  }

  // WhatsApp session renewal
  if (req.method === "POST" && url.searchParams.get("action") === "renew_sessions") {
    const cfg    = await getCfg();
    const result = await renewWhatsAppSessions(cfg);
    return new Response(JSON.stringify({ok:true,...result}), {
      headers: { ...cors, "Content-Type":"application/json" },
    });
  }

  // Config check endpoint
  if (req.method === "GET" && url.searchParams.get("action") === "status") {
    const cfg = await getCfg();
    return new Response(JSON.stringify({
      ok:true,
      twilio_configured: !!(cfg.twilio_account_sid && cfg.twilio_auth_token),
      account_sid: cfg.twilio_account_sid ? cfg.twilio_account_sid.slice(0,8)+"..." : "not set",
      auth_token_set: !!(cfg.twilio_auth_token),
      sms_number: cfg.twilio_phone_number,
      wa_number: cfg.twilio_whatsapp_number,
      msg_service: cfg.twilio_messaging_service_sid,
      wa_join: EL5H.WA_JOIN_CODE,
    }), { headers: { ...cors, "Content-Type":"application/json" } });
  }

  // Standard outbound send
  try {
    const body = await req.json();
    const {
      to, message, channel = "sms",
      module: mod, record_id, sent_by, recipient_name, department,
    } = body;

    if (!to || !message) {
      return new Response(JSON.stringify({ok:false,error:"to and message are required"}),
        { status:400, headers:{...cors,"Content-Type":"application/json"} });
    }

    const cfg = await getCfg();
    const prefix  = `[${cfg.sms_hospital_name||"EL5 MediProcure"}] `;
    const fullMsg = (prefix + message).slice(0, 1600);
    const numbers = (Array.isArray(to) ? to : String(to).split(",").map((s:string)=>s.trim()))
      .filter(Boolean).map(fmtPhone);

    const results: any[] = [];

    for (const num of numbers) {
      let result: any;

      if (channel === "whatsapp") {
        result = await sendViaTwilio(cfg, num, fullMsg, "whatsapp");
        // If WhatsApp fails, try SMS with join instructions
        if (!result.ok) {
          console.warn(`WhatsApp failed for ${num}: ${result.error}`);
          const joinMsg = `${fullMsg}\n\n[To receive WhatsApp alerts: send "${EL5H.WA_JOIN_CODE}" to ${EL5H.WA_NUMBER} on WhatsApp]`;
          const smsResult = await sendViaTwilio(cfg, num, joinMsg, "sms");
          if (smsResult.ok) {
            result = { ...smsResult, provider:"twilio_sms_fallback" };
          }
        }
      } else {
        // SMS: Twilio first, AT fallback
        result = await sendViaTwilio(cfg, num, fullMsg, "sms");
        if (!result.ok) {
          console.warn(`Twilio SMS failed for ${num}: ${result.error} — trying Africa's Talking`);
          result = await sendViaAT(cfg, num, fullMsg);
        }
      }

      await logMsg(num, fullMsg, result, {
        recipient_name, department, module:mod, record_id, sent_by,
        from:cfg.twilio_phone_number,
      }, channel);

      results.push({
        to: num, channel,
        ok: result.ok,
        sid: result.sid || result.messageId,
        provider: result.provider,
        error: result.error,
      });
    }

    const sentCnt = results.filter(r=>r.ok).length;
    return new Response(JSON.stringify({
      ok: sentCnt > 0,
      sent:   sentCnt,
      failed: results.length - sentCnt,
      total:  results.length,
      el5h: {
        service_name:     EL5H.SERVICE_NAME,
        messaging_sid:    EL5H.MSG_SVC_SID,
        sms_number:       EL5H.SMS_NUMBER,
        wa_number:        EL5H.WA_NUMBER,
        wa_join_code:     EL5H.WA_JOIN_CODE,
        voice_webhook:    EL5H.VOICE_WEBHOOK,
      },
      results,
    }), { headers: { ...cors, "Content-Type":"application/json" } });

  } catch (err:any) {
    console.error("send-sms error:", err);
    return new Response(JSON.stringify({ok:false,error:err.message}),
      { status:500, headers:{...cors,"Content-Type":"application/json"} });
  }
});
