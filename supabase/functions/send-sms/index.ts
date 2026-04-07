/**
 * ProcurBosse — send-sms Edge Function v8.0  FULLY ACTIVATED
 * Direct Twilio API — no DB dependency for sending, DB only for logging
 * EL5H: ACe96c6e0e5edd4de5f5a4c6d9cc7b7c5a / d73601fbefe26e01b06e22c53a798ea6
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

// ── EL5H Twilio — hardcoded real credentials ──────────────────────────────
const ACCT = Deno.env.get("TWILIO_ACCOUNT_SID") || "ACe96c6e0e5edd4de5f5a4c6d9cc7b7c5a";
const AUTH = Deno.env.get("TWILIO_AUTH_TOKEN")  || "d73601fbefe26e01b06e22c53a798ea6";
const FROM_SMS = "+16812972643";
const FROM_WA  = "+14155238886";
const MSID     = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID") || "VA692606d4faea3c18432a857f111dbfad";
const WA_CODE  = "join bad-machine";
const HOSPITAL = "EL5 MediProcure";

// ── Phone normaliser ───────────────────────────────────────────────────────
function e164(raw: string): string {
  let n = String(raw).replace(/[\s\-\(\)\.]/g, "");
  if (n.startsWith("07") || n.startsWith("01")) return "+254" + n.slice(1);
  if (n.startsWith("254") && !n.startsWith("+")) return "+" + n;
  if (!n.startsWith("+")) return "+254" + n;
  return n;
}

// ── Core Twilio send ───────────────────────────────────────────────────────
async function twilioSend(
  to: string, body: string, channel: "sms"|"whatsapp" = "sms"
): Promise<{ ok:boolean; sid?:string; status?:string; error?:string }> {
  const params: Record<string, string> = { Body: body };

  if (channel === "whatsapp") {
    params.From = `whatsapp:${FROM_WA}`;
    params.To   = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
  } else {
    params.To = to;
    params.MessagingServiceSid = MSID;
  }

  const resp = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${ACCT}/Messages.json`,
    {
      method: "POST",
      headers: {
        "Authorization": "Basic " + btoa(`${ACCT}:${AUTH}`),
        "Content-Type":  "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(params).toString(),
    }
  );
  const data = await resp.json();
  if (!resp.ok) return { ok:false, error:`${data.code}: ${data.message}` };
  return { ok:true, sid:data.sid, status:data.status };
}

// ── Africa's Talking fallback ──────────────────────────────────────────────
async function atSend(to: string, body: string): Promise<{ok:boolean;error?:string}> {
  const apiKey   = Deno.env.get("AT_API_KEY")   || "";
  const username = Deno.env.get("AT_USERNAME")  || "";
  if (!apiKey || !username) return { ok:false, error:"AT not configured" };
  try {
    const r = await fetch("https://api.africastalking.com/version1/messaging", {
      method: "POST",
      headers: { "apiKey":apiKey, "Content-Type":"application/x-www-form-urlencoded", "Accept":"application/json" },
      body: new URLSearchParams({ username, to, message:body }).toString(),
    });
    const d = await r.json();
    const msg = d?.SMSMessageData?.Recipients?.[0];
    return { ok: msg?.statusCode === 101, error: msg?.status };
  } catch(e:any){ return { ok:false, error:e.message }; }
}

// ── Log message (non-blocking) ─────────────────────────────────────────────
async function log(to:string, body:string, res:any, meta:any, ch:string) {
  await Promise.allSettled([
    sb.from("reception_messages").insert({
      recipient_phone:to, recipient_name:meta.name||null,
      message_body:body, message_type:ch, direction:"outbound",
      department:meta.dept||null, status:res.ok?"sent":"failed",
      twilio_sid:res.sid||null, error_code:res.error||null,
      sent_at: new Date().toISOString(),
    }),
    sb.from("sms_log").insert({
      to_number:to, from_number:FROM_SMS, message:body,
      status:res.ok?"sent":"failed", twilio_sid:res.sid||null,
      module:meta.module||"system", error_msg:res.error||null,
      sent_at:new Date().toISOString(),
    }),
    sb.from("sms_conversations").upsert({
      phone_number:to, contact_name:meta.name||null,
      last_message:body.slice(0,100), last_message_at:new Date().toISOString(), status:"open",
    },{ onConflict:"phone_number" }),
  ]);
}

// ── Inbound webhook ────────────────────────────────────────────────────────
async function inbound(params: URLSearchParams): Promise<string> {
  const from  = params.get("From")||"";
  const body  = params.get("Body")||"";
  const sid   = params.get("MessageSid")||"";
  const ch    = from.startsWith("whatsapp:")?"whatsapp":"sms";
  const phone = from.replace("whatsapp:","");
  const lower = body.toLowerCase().trim();

  await Promise.allSettled([
    sb.from("reception_messages").insert({
      recipient_phone:phone, message_body:body, message_type:ch,
      direction:"inbound", status:"received", twilio_sid:sid,
      sent_at:new Date().toISOString(),
    }),
    sb.from("sms_conversations").upsert({
      phone_number:phone, last_message:body.slice(0,100),
      last_message_at:new Date().toISOString(), status:"open", unread_count:1,
    },{ onConflict:"phone_number" }),
  ]);

  let reply = "";
  if (lower==="help"||lower==="menu") {
    reply=`EL5 MediProcure Menu:\n• STATUS REQ-ID — Requisition status\n• STOP — Unsubscribe\n• START — Re-subscribe\nHospital: +254 (main line)`;
  } else if (lower==="stop") {
    reply="Unsubscribed from EL5 alerts. Reply START to re-subscribe.";
    await sb.from("sms_conversations").update({status:"closed"}).eq("phone_number",phone);
  } else if (lower==="start") {
    reply="Welcome back to EL5 MediProcure notifications!";
  } else if (lower.startsWith("status ")) {
    const id=body.split(" ")[1];
    const {data:r}=await sb.from("requisitions").select("id,status,title").ilike("id",`%${id}%`).limit(1);
    reply=r?.[0]?`REQ ${r[0].id}: ${r[0].status}\n${r[0].title||""}`:`Requisition ${id} not found.`;
  } else {
    reply=`Message received at EL5 Hospital (${new Date().toLocaleString("en-KE",{timeZone:"Africa/Nairobi",hour:"2-digit",minute:"2-digit"})}). We will respond shortly.`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<Response>${reply?`<Message>${reply}</Message>`:""}</Response>`;
}

// ── WhatsApp session renewal ───────────────────────────────────────────────
async function renewSessions(): Promise<{renewed:number;checked:number}> {
  const {data}=await sb.from("sms_conversations").select("phone_number,last_message_at").not("phone_number","is",null);
  let renewed=0;
  for(const c of (data||[])){
    const h=(Date.now()-new Date(c.last_message_at||0).getTime())/3600000;
    if(h>22&&h<72){
      await twilioSend(c.phone_number,`[EL5 MediProcure] Your procurement notifications are active. Reply HELP for options.`,"whatsapp");
      renewed++;
      await new Promise(r=>setTimeout(r,600));
    }
  }
  await sb.from("system_settings").upsert({key:"whatsapp_last_renewal",value:new Date().toISOString()},{onConflict:"key"});
  return {renewed,checked:(data||[]).length};
}

// ── MAIN ──────────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
  const url=new URL(req.url);

  // Status check
  if(req.method==="GET"&&url.searchParams.get("action")==="status"){
    return new Response(JSON.stringify({
      ok:true, account_sid:ACCT.slice(0,8)+"...", auth_token_set:!!AUTH,
      sms_from:FROM_SMS, wa_from:FROM_WA, msg_service_sid:MSID, wa_join:WA_CODE,
    }),{headers:{...cors,"Content-Type":"application/json"}});
  }

  // Inbound webhook
  if(req.method==="POST"&&url.searchParams.get("webhook")==="inbound"){
    const fd=await req.formData();
    const p=new URLSearchParams(); fd.forEach((v,k)=>p.set(k,v.toString()));
    return new Response(await inbound(p),{headers:{...cors,"Content-Type":"text/xml"}});
  }

  // Session renewal
  if(req.method==="POST"&&url.searchParams.get("action")==="renew_sessions"){
    const r=await renewSessions();
    return new Response(JSON.stringify({ok:true,...r}),{headers:{...cors,"Content-Type":"application/json"}});
  }

  // Outbound send
  try{
    const b=await req.json();
    const{to,message,channel="sms",module:mod,record_id,sent_by,recipient_name:name,department:dept}=b;
    if(!to||!message) return new Response(JSON.stringify({ok:false,error:"to and message required"}),
      {status:400,headers:{...cors,"Content-Type":"application/json"}});

    const prefix=`[${HOSPITAL}] `;
    const fullMsg=(prefix+message).slice(0,1600);
    const numbers=(Array.isArray(to)?to:String(to).split(",").map((s:string)=>s.trim())).filter(Boolean).map(e164);
    const results=[];

    for(const num of numbers){
      let res:any;
      if(channel==="whatsapp"){
        res=await twilioSend(num,fullMsg,"whatsapp");
        if(!res.ok){ // SMS fallback with join instructions
          const alt=await twilioSend(num,`${fullMsg}\n[WhatsApp: send "${WA_CODE}" to ${FROM_WA}]`,"sms");
          res={...alt,provider:"sms_fallback"};
        } else { res.provider="whatsapp"; }
      } else {
        res=await twilioSend(num,fullMsg,"sms");
        if(!res.ok){ const at=await atSend(num,fullMsg); res={...at,provider:"africas_talking"}; }
        else { res.provider="twilio"; }
      }
      await log(num,fullMsg,res,{name,dept,module:mod,record_id,sent_by},channel);
      results.push({to:num,ok:res.ok,sid:res.sid,provider:res.provider,error:res.error});
    }

    const sent=results.filter(r=>r.ok).length;
    return new Response(JSON.stringify({
      ok:sent>0, sent, failed:results.length-sent, total:results.length,
      sms_number:FROM_SMS, wa_number:FROM_WA, wa_join:WA_CODE, msg_service_sid:MSID, results,
    }),{headers:{...cors,"Content-Type":"application/json"}});

  }catch(e:any){
    return new Response(JSON.stringify({ok:false,error:e.message}),
      {status:500,headers:{...cors,"Content-Type":"application/json"}});
  }
});
