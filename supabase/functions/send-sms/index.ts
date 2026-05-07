/**
 * ProcurBosse — send-sms Edge Function v9.0 (FULLY RECONFIGURED)
 * Twilio SMS + WhatsApp + Africa's Talking fallback
 * Account: SET_IN_SUPABASE_SECRETS
 * MSG SID:  MGd547d8e3273fda2d21afdd6856acb245
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

// ── Credentials (hardcoded fallback + env override) ──────────────────────────
const ACCT     = Deno.env.get("TWILIO_ACCOUNT_SID")          || "SET_IN_SUPABASE_SECRETS";
const API_SK   = Deno.env.get("TWILIO_API_KEY_SID")          || "SET_IN_SUPABASE_SECRETS";
const API_ST   = Deno.env.get("TWILIO_API_KEY_SECRET")       || "SET_IN_SUPABASE_SECRETS";
const AUTH     = API_SK.startsWith("SK") ? API_ST : (Deno.env.get("TWILIO_AUTH_TOKEN") || "SET_IN_SUPABASE_SECRETS");
const AUTH_USR = API_SK.startsWith("SK") ? API_SK : ACCT;
const FROM_SMS = Deno.env.get("TWILIO_PHONE_NUMBER")          || "+16812972643";
const FROM_WA  = Deno.env.get("TWILIO_WA_NUMBER")             || "+14155238886";
const MSID     = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID") || "MGd547d8e3273fda2d21afdd6856acb245";
const WA_CODE  = "join bad-machine";
const HOSPITAL = "EL5 MediProcure";

// ── E.164 normaliser (Kenya focus) ───────────────────────────────────────────
function e164(raw: string): string {
  const n = String(raw).replace(/[\s\-\(\)\.]/g, "");
  if (n.startsWith("07") || n.startsWith("01")) return "+254" + n.slice(1);
  if (n.startsWith("254") && !n.startsWith("+"))  return "+" + n;
  if (n.startsWith("+"))                           return n;
  return "+254" + n;
}

// ── Core Twilio API call ──────────────────────────────────────────────────────
async function twilioSend(
  to: string, body: string, channel: "sms"|"whatsapp" = "sms"
): Promise<{ ok:boolean; sid?:string; status?:string; error?:string; provider:string }> {
  const params: Record<string,string> = { Body: body };

  if (channel === "whatsapp") {
    params.From = `whatsapp:${FROM_WA}`;
    params.To   = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
  } else {
    params.To              = to;
    params.MessagingServiceSid = MSID;
  }

  try {
    const resp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${ACCT}/Messages.json`,
      {
        method:  "POST",
        headers: {
          "Authorization": "Basic " + btoa(`${AUTH_USR}:${AUTH}`),
          "Content-Type":  "application/x-www-form-urlencoded",
          "User-Agent":    "ProcurBosse/5.9 EL5MediProcure",
        },
        body: new URLSearchParams(params).toString(),
      }
    );

    let data: any = {};
    try { data = await resp.json(); } catch { data = { message: "No JSON response" }; }

    if (!resp.ok) {
      const errMsg = data?.message || data?.code || `HTTP ${resp.status}`;
      console.error(`[Twilio] ${channel} failed: ${errMsg} (to=${to})`);
      return { ok:false, error: errMsg, provider: channel === "whatsapp" ? "twilio_wa" : "twilio_sms" };
    }

    console.log(`[Twilio] ${channel} sent: sid=${data.sid} to=${to}`);
    return { ok:true, sid:data.sid, status:data.status, provider: channel === "whatsapp" ? "twilio_wa" : "twilio_sms" };
  } catch (e: any) {
    console.error(`[Twilio] Network error: ${e.message}`);
    return { ok:false, error: e.message, provider: channel === "whatsapp" ? "twilio_wa" : "twilio_sms" };
  }
}

// ── Africa's Talking fallback ─────────────────────────────────────────────────
async function atFallback(to: string, body: string): Promise<{ ok:boolean; error?:string; provider:string }> {
  const apiKey   = Deno.env.get("AT_API_KEY")  || "";
  const username = Deno.env.get("AT_USERNAME") || "";
  if (!apiKey || !username) return { ok:false, error:"AT not configured", provider:"africas_talking" };
  try {
    const r = await fetch("https://api.africastalking.com/version1/messaging", {
      method: "POST",
      headers: {
        "apiKey":       apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept":       "application/json",
      },
      body: new URLSearchParams({ username, to, message:body }).toString(),
    });
    const d = await r.json();
    const msg = d?.SMSMessageData?.Recipients?.[0];
    const ok  = msg?.statusCode === 101;
    console.log(`[AT] ${ok?"sent":"failed"}: ${msg?.status} to=${to}`);
    return { ok, error: ok ? undefined : msg?.status, provider:"africas_talking" };
  } catch(e:any) { return { ok:false, error:e.message, provider:"africas_talking" }; }
}

// ── Log to Supabase (non-blocking) ───────────────────────────────────────────
async function logMsg(to:string, body:string, res:any, meta:any, ch:string) {
  const ts = new Date().toISOString();
  await Promise.allSettled([
    sb.from("sms_log").insert({
      to_number:to, from_number:FROM_SMS, message:body.slice(0,500),
      status:res.ok?"sent":"failed", twilio_sid:res.sid||null,
      module:meta.module||"system", error_msg:res.error||null, sent_at:ts,
    }),
    sb.from("sms_conversations").upsert({
      phone_number:to, contact_name:meta.name||null,
      last_message:body.slice(0,100), last_message_at:ts, status:"open",
    }, { onConflict:"phone_number" }),
  ]);
}

// ── WhatsApp session renewal ──────────────────────────────────────────────────
async function renewSessions(): Promise<{ renewed:number; checked:number }> {
  const { data } = await sb.from("sms_conversations")
    .select("phone_number,last_message_at")
    .eq("status","open")
    .not("phone_number","is",null)
    .order("last_message_at",{ascending:false})
    .limit(100);
  let renewed = 0;
  for (const c of (data||[])) {
    const hoursAgo = (Date.now() - new Date(c.last_message_at||0).getTime()) / 3600000;
    if (hoursAgo >= 22 && hoursAgo < 72) {
      await twilioSend(c.phone_number, `[${HOSPITAL}] Your EL5 MediProcure notifications are active. Reply HELP for options.`, "whatsapp");
      renewed++;
      await new Promise(r => setTimeout(r, 800));
    }
  }
  return { renewed, checked:(data||[]).length };
}

// ── Inbound handler ───────────────────────────────────────────────────────────
async function handleInbound(params: URLSearchParams): Promise<string> {
  const from  = params.get("From") || "";
  const body  = params.get("Body") || "";
  const sid   = params.get("MessageSid") || "";
  const phone = from.replace("whatsapp:","");
  const lower = body.trim().toLowerCase();

  await Promise.allSettled([
    sb.from("sms_log").insert({
      to_number:from, from_number:phone, message:body.slice(0,500),
      status:"received", twilio_sid:sid, module:"inbound", sent_at:new Date().toISOString(),
    }),
    sb.from("sms_conversations").upsert({
      phone_number:phone, last_message:body.slice(0,100),
      last_message_at:new Date().toISOString(), status:"open", unread_count:1,
    },{ onConflict:"phone_number" }),
  ]);

  let reply = "";
  if (lower==="help"||lower==="menu") {
    reply = `EL5 MediProcure Menu:\n• STATUS REQ-ID — Check requisition\n• STOP — Unsubscribe alerts\n• START — Re-subscribe\nHospital: +254 68 31055`;
  } else if (lower==="stop") {
    reply = "Unsubscribed from EL5 alerts. Reply START to re-subscribe.";
    await sb.from("sms_conversations").update({status:"closed"}).eq("phone_number",phone);
  } else if (lower==="start") {
    reply = "Welcome back to EL5 MediProcure notifications!";
  } else if (lower.startsWith("status ")) {
    const id = body.trim().split(" ")[1];
    const { data:r } = await sb.from("requisitions").select("id,status,title").ilike("requisition_number",`%${id}%`).limit(1);
    reply = r?.[0] ? `REQ: ${r[0].title?.slice(0,40)||id}\nStatus: ${r[0].status?.toUpperCase()}` : `Requisition "${id}" not found.`;
  } else {
    reply = `[EL5 MediProcure] Message received at ${new Date().toLocaleString("en-KE",{timeZone:"Africa/Nairobi",hour:"2-digit",minute:"2-digit"})}. We will respond shortly.`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?><Response>${reply?`<Message>${reply}</Message>`:""}</Response>`;
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const url = new URL(req.url);
  let body: any = {};

  if (req.method === "POST") {
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      try { body = await req.json(); } catch { body = {}; }
    } else if (ct.includes("form") || ct.includes("urlencoded")) {
      try {
        const fd = await req.formData();
        fd.forEach((v,k) => { body[k] = String(v); });
      } catch {
        const text = await req.text().catch(()=>"");
        const p = new URLSearchParams(text);
        p.forEach((v,k) => { body[k]=v; });
      }
    }
  }

  // ── Status check ──────────────────────────────────────────────────────────
  if ((req.method==="GET" && url.searchParams.get("action")==="status") || body?.action==="status") {
    // Test Twilio by checking account (lightweight API call)
    let twilioLive = false;
    try {
      const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${ACCT}.json`, {
        headers: { "Authorization": "Basic " + btoa(`${AUTH_USR}:${AUTH}`) }
      });
      twilioLive = r.ok;
    } catch {}
    return new Response(JSON.stringify({
      ok: twilioLive, account_sid: ACCT.slice(0,10)+"...", auth_token_set:!!AUTH,
      twilio_live: twilioLive, sms_from: FROM_SMS, wa_from: FROM_WA,
      msg_service_sid: MSID, wa_join: WA_CODE, hospital: HOSPITAL,
      timestamp: new Date().toISOString(),
    }), { headers: { ...cors, "Content-Type":"application/json" } });
  }

  // ── Inbound webhook ───────────────────────────────────────────────────────
  if (req.method==="POST" && url.searchParams.get("webhook")==="inbound") {
    const p = new URLSearchParams(Object.entries(body).map(([k,v])=>[k,String(v)]));
    return new Response(await handleInbound(p), { headers: { ...cors, "Content-Type":"text/xml" } });
  }

  // ── Session renewal ───────────────────────────────────────────────────────
  if (body?.action==="renew_sessions") {
    const r = await renewSessions();
    return new Response(JSON.stringify({ ok:true, ...r }), { headers: { ...cors, "Content-Type":"application/json" } });
  }

  // ── Outbound send ─────────────────────────────────────────────────────────
  try {
    const { to, message, channel="sms", module:mod, record_id, sent_by, recipient_name:name, department:dept } = body;

    if (!to || !message) {
      return new Response(JSON.stringify({ ok:false, error:"to and message are required" }), {
        status:400, headers:{ ...cors, "Content-Type":"application/json" }
      });
    }

    const prefix  = `[${HOSPITAL}] `;
    const fullMsg = (prefix + message).slice(0, 1600);
    const numbers = (Array.isArray(to) ? to : String(to).split(",").map((s:string)=>s.trim()))
                      .filter(Boolean).map(e164);
    const results: any[] = [];

    for (const num of numbers) {
      let res: any;

      if (channel === "whatsapp") {
        res = await twilioSend(num, fullMsg, "whatsapp");
        if (!res.ok) {
          // WhatsApp fallback: send SMS with join instructions
          res = await twilioSend(num, `${fullMsg}\n[WhatsApp: send "${WA_CODE}" to ${FROM_WA}]`, "sms");
          res.provider = "sms_fallback";
        }
      } else {
        res = await twilioSend(num, fullMsg, "sms");
        if (!res.ok) {
          // SMS fallback: Africa's Talking
          res = await atFallback(num, fullMsg);
        }
      }

      await logMsg(num, fullMsg, res, { name, dept, module:mod, record_id, sent_by }, channel);
      results.push({ to:num, ok:res.ok, sid:res.sid, provider:res.provider, error:res.error });
      if (numbers.length > 1) await new Promise(r => setTimeout(r, 200)); // rate limit
    }

    const sent = results.filter(r=>r.ok).length;
    return new Response(JSON.stringify({
      ok: sent > 0, sent, failed: results.length - sent, total: results.length,
      sms_number: FROM_SMS, wa_number: FROM_WA, msg_service_sid: MSID,
      wa_join: WA_CODE, results,
    }), { headers: { ...cors, "Content-Type":"application/json" } });

  } catch (e: any) {
    console.error("[send-sms] Unhandled error:", e.message);
    return new Response(JSON.stringify({ ok:false, error:e.message }), {
      status:500, headers:{ ...cors, "Content-Type":"application/json" }
    });
  }
});
