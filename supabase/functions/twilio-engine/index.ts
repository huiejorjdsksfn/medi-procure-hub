/**
 * EL5 MediProcure — Twilio Engine v3.0
 * Auto-engine: status, call, SMS, bulk_sms, add_user, full_setup
 * Auth: AccountSID + AuthToken (direct — both SK keys belong to different accounts)
 * FROM: +16812972643 (only verified number on this account)
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
const FROM = "+16812972643";
const VERIFIED_CALL_NUMBER = "+254116647894";

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
  return String(s).replace(/[<>&"']/g, (c: string) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "\'": "&apos;" }[c] || c));
}
async function twilio(acct: string, auth: string, path: string, params?: Record<string,string>) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${acct}/${path}`;
  const opts: RequestInit = { headers: { Authorization: auth }, signal: AbortSignal.timeout(12000) };
  if (params) {
    opts.method = "POST";
    (opts.headers as Record<string,string>)["Content-Type"] = "application/x-www-form-urlencoded";
    opts.body = new URLSearchParams(params).toString();
  }
  const r = await fetch(url, opts);
  return { ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const R = (data: unknown, status = 200) =>
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
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    const log = async (to: string, msg: string, ok: boolean, sid: string|null, provider: string, err?: string) => {
      await sb.from("sms_log").insert({ to_number:to, from_number:FROM, message:msg.slice(0,300),
        status:ok?(provider==="twilio_voice"?"queued":"sent"):"failed",
        twilio_sid:sid, error_msg:ok?null:err, provider, module:"twilio_engine",
        sent_at:new Date().toISOString() });
    };

    if (action === "status") {
      const [rN, rV] = await Promise.all([
        twilio(ACCT, auth, "IncomingPhoneNumbers.json"),
        twilio(ACCT, auth, "OutgoingCallerIds.json"),
      ]);
      const { data: ls } = await sb.from("sms_log").select("status,provider")
        .gte("created_at", new Date(Date.now()-86400000).toISOString());
      const stats = {sent:0,failed:0,voice:0,sms:0};
      for (const r of ls||[]) {
        if ((r as Record<string,string>).status==="sent"||(r as Record<string,string>).status==="queued") stats.sent++; else stats.failed++;
        if ((r as Record<string,string>).provider==="twilio_voice") stats.voice++; else stats.sms++;
      }
      return R({ ok:true, account_sid:ACCT, from:FROM,
        phone_numbers:(rN.data.incoming_phone_numbers||[]).map((p:Record<string,unknown>)=>({number:p.phone_number,sid:p.sid})),
        verified_callers:(rV.data.outgoing_caller_ids||[]).map((c:Record<string,unknown>)=>({number:c.phone_number,label:c.friendly_name})),
        sms_log_24h:stats });
    }

    if (action === "call") {
      const { to=VERIFIED_CALL_NUMBER, auto_end=true,
        message="Hello. This is an automated notification from MediProcure at Embu Level Five Hospital. Your number is confirmed active. Thank you. Goodbye." } = body;
      const num = e164(String(to));
      const twiml = auto_end
        ? `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice" language="en-GB">${escXml(message)}</Say><Hangup/></Response>`
        : `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice" language="en-GB">${escXml(message)}</Say><Pause length="1"/><Say voice="alice" language="en-GB">Thank you. Goodbye.</Say></Response>`;
      const r = await twilio(ACCT, auth, "Calls.json", { To:num, From:FROM, Twiml:twiml });
      const ok = r.ok && !!r.data.sid;
      await log(num, message, ok, r.data.sid, "twilio_voice", r.data.message);
      return R({ ok, sid:r.data.sid, status:r.data.status, to:num, from:FROM, auto_end, code:r.data.code, error:r.data.message });
    }

    if (action === "sms") {
      const { to, message } = body;
      const targets = (Array.isArray(to)?to:String(to||"").split(",").map((s:string)=>s.trim())).filter(Boolean).map(e164);
      if (!targets.length) return R({ok:false,error:"to required"},400);
      const results: Record<string,unknown>[] = [];
      for (const num of targets) {
        const msg = message.startsWith("[")?message:`[EL5 MediProcure] ${message}`;
        const r = await twilio(ACCT, auth, "Messages.json", { To:num, From:FROM, Body:msg });
        const ok = r.ok && !!r.data.sid;
        await log(num, msg, ok, r.data.sid, "twilio_sms", r.data.message);
        results.push({ to:num, ok, sid:r.data.sid, code:r.data.code, error:r.data.message });
        if (targets.length>1) await new Promise(res=>setTimeout(res,200));
      }
      return R({ ok:results.some(r=>r.ok), results, from:FROM,
        sent:results.filter(r=>r.ok).length, failed:results.filter(r=>!r.ok).length });
    }

    if (action === "add_user") {
      const { number, name } = body;
      if (!number) return R({ok:false,error:"number required"},400);
      const num = e164(String(number));
      const rCheck = await twilio(ACCT, auth, `OutgoingCallerIds.json?PhoneNumber=${encodeURIComponent(num)}`);
      if ((rCheck.data.outgoing_caller_ids||[]).length>0)
        return R({ok:true,number:num,already_verified:true,message:`${num} is already a verified caller`});
      const r = await twilio(ACCT, auth, "OutgoingCallerIds.json",
        { PhoneNumber:num, FriendlyName:name||`EL5 MediProcure ${num}`, CallDelay:"5" });
      return R({ ok:r.ok, number:num,
        validation_code:r.data.validation_code||null, call_sid:r.data.call_sid||null,
        message:r.ok?`Verification call to ${num}. Enter code: ${r.data.validation_code}`:r.data.message });
    }

    if (action === "bulk_sms") {
      const { numbers, message } = body;
      const targets = (Array.isArray(numbers)?numbers:String(numbers||"").split(",").map((s:string)=>s.trim())).filter(Boolean);
      if (!targets.length||!message) return R({ok:false,error:"numbers and message required"},400);
      const results: Record<string,unknown>[] = [];
      for (const rawNum of targets) {
        const num=e164(rawNum); const msg=`[EL5 MediProcure] ${message}`;
        const r=await twilio(ACCT,auth,"Messages.json",{To:num,From:FROM,Body:msg});
        const ok=r.ok&&!!r.data.sid;
        await log(num,msg,ok,r.data.sid,"twilio_sms",r.data.message);
        results.push({to:num,ok,sid:r.data.sid,error:r.data.message});
        await new Promise(res=>setTimeout(res,200));
      }
      const sent=results.filter(r=>r.ok).length;
      return R({ok:sent>0,sent,failed:results.length-sent,total:results.length,results});
    }

    if (action === "full_setup") {
      const Out: Record<string,unknown> = {};
      const [rN,rV] = await Promise.all([
        twilio(ACCT,auth,"IncomingPhoneNumbers.json"),
        twilio(ACCT,auth,"OutgoingCallerIds.json"),
      ]);
      Out.phone_numbers=(rN.data.incoming_phone_numbers||[]).map((p:Record<string,unknown>)=>({number:p.phone_number,sid:p.sid}));
      Out.verified_callers=(rV.data.outgoing_caller_ids||[]).map((c:Record<string,unknown>)=>({number:c.phone_number,label:c.friendly_name}));
      const twiml=`<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice" language="en-GB">Hello. This is an automated call from MediProcure at Embu Level Five Hospital. Your number is confirmed active on the procurement system. Thank you. Goodbye.</Say><Hangup/></Response>`;
      const rCall=await twilio(ACCT,auth,"Calls.json",{To:VERIFIED_CALL_NUMBER,From:FROM,Twiml:twiml});
      Out.call={ok:rCall.ok,sid:rCall.data.sid,status:rCall.data.status,to:VERIFIED_CALL_NUMBER,code:rCall.data.code,error:rCall.data.message};
      if (rCall.ok&&rCall.data.sid) await log(VERIFIED_CALL_NUMBER,"Full setup verification call",true,rCall.data.sid,"twilio_voice");
      const smsResults: Record<string,unknown>[] = [];
      for (const rawNum of ["+254116647896","+254720425195","+254116647894"]) {
        const num=e164(rawNum);
        const msg="[EL5 MediProcure] Your number is registered on the MediProcure procurement system at Embu Level 5 Hospital. You will receive alerts for approvals, purchase orders and stock. Reply STOP to opt out.";
        const r=await twilio(ACCT,auth,"Messages.json",{To:num,From:FROM,Body:msg});
        const ok=r.ok&&!!r.data.sid;
        await log(num,msg,ok,r.data.sid,"twilio_sms",r.data.message);
        smsResults.push({to:num,ok,sid:r.data.sid,code:r.data.code,error:r.data.message});
        await new Promise(res=>setTimeout(res,300));
      }
      Out.sms=smsResults;
      await sb.from("system_settings").upsert([
        {key:"twilio_api_key_sid",value:"SET_IN_SUPABASE_SECRETS"},
        {key:"twilio_api_key_secret",value:"SET_IN_SUPABASE_SECRETS"},
        {key:"twilio_engine_setup_ts",value:new Date().toISOString()},
      ],{onConflict:"key"});
      Out.summary={from:FROM,
        verified_callers:(Out.verified_callers as Record<string,unknown>[]).map(c=>c.number),
        call_placed:(Out.call as Record<string,unknown>).ok,
        call_sid:(Out.call as Record<string,unknown>).sid,
        sms_sent:smsResults.filter(s=>s.ok).length,
        sms_failed:smsResults.filter(s=>!s.ok).length,
        new_sk_key_note:"SKb845b99d belongs to a different Twilio account. Provide its Account SID to use it.",
        trial_note:"To SMS unverified numbers or call Kenya, verify numbers at twilio.com or upgrade account."};
      return R({ok:true,results:Out});
    }

    return R({ok:false,error:`Unknown action: ${action}. Valid: status, call, sms, bulk_sms, add_user, full_setup`},400);
  } catch(e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[TwilioEngine v3] Fatal:", msg);
    return R({ok:false,error:msg},500);
  }
});
