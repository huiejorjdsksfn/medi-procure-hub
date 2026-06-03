/**
 * EL5 MediProcure — send-sms v11.0  PRODUCTION
 * REDACTED_TWILIO_MESSAGING_SID = Messaging Service (SMS bulk)
 * REDACTED_TWILIO_VERIFY_SID = Verify Service (OTP only, NOT for SMS)
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type,x-action",
  "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
};

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const ACCT  = Deno.env.get("TWILIO_ACCOUNT_SID") || "";
const AUTH  = Deno.env.get("TWILIO_AUTH_TOKEN")  || "";
const FROM  = Deno.env.get("TWILIO_FROM_NUMBER") || Deno.env.get("TWILIO_PHONE_NUMBER") || "";
const MSID  = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID") || "";
const FROM_WA = Deno.env.get("TWILIO_WHATSAPP_FROM") || "whatsapp:+14155238886";
const WA_CODE = "join bad-machine";
const HOSP  = "EL5 MediProcure";

// ── Template library (event-driven) ──────────────────────────────
const TEMPLATES: Record<string,(d:Record<string,any>)=>string> = {
  requisition_submitted: d => `REQ ${d.number||""} submitted by ${d.user||"staff"}. Awaiting approval.`,
  requisition_approved:  d => `REQ ${d.number||""} APPROVED. Proceed to LPO.`,
  requisition_rejected:  d => `REQ ${d.number||""} REJECTED. Reason: ${d.reason||"see system"}.`,
  requisition_pending:   d => `Reminder: REQ ${d.number||""} awaits your approval.`,
  po_raised:             d => `LPO ${d.number||""} raised for ${d.supplier||""}. Total KES ${d.total||"0"}.`,
  po_sent:               d => `LPO ${d.number||""} dispatched to ${d.supplier||""}. ETA ${d.eta||"TBD"}.`,
  goods_received:        d => `GRN ${d.number||""} recorded for LPO ${d.po||""}. Inspect within 24h.`,
  inspection_passed:     d => `Inspection PASSED for ${d.item||""}. Stock updated.`,
  inspection_failed:     d => `Inspection FAILED for ${d.item||""}. Action required: ${d.action||"contact supplier"}.`,
  low_stock_alert:       d => `LOW STOCK: ${d.item||""} at ${d.qty||"0"} ${d.unit||"units"}. Reorder now.`,
  payment_voucher:       d => `Payment Voucher ${d.number||""} for KES ${d.amount||""} ready for authorisation.`,
  contract_expiring:     d => `Contract ${d.number||""} with ${d.supplier||""} expires ${d.date||""}.`,
  system_alert:          d => `SYSTEM: ${d.message||"alert"}`,
  custom:                d => String(d.message||""),
};

function e164(r:string):string{
  const n=String(r||"").replace(/[\s\-\(\)\.]/g,"");
  if(!n||n.length<7)return"";
  if(n.startsWith("07")||n.startsWith("01"))return"+254"+n.slice(1);
  if(n.startsWith("254")&&!n.startsWith("+"))return"+"+n;
  if(!n.startsWith("+"))return"+254"+n;
  return n;
}

async function twilioSend(to:string,body:string,ch:"sms"|"whatsapp"="sms"):Promise<{ok:boolean;sid?:string;error?:string;provider:string}>{
  const p:Record<string,string>={Body:body};
  if(ch==="whatsapp"){p.From=FROM_WA;p.To=to.startsWith("whatsapp:")?to:`whatsapp:${to}`;}
  else{p.MessagingServiceSid=MSID;p.To=to;}
  try{
    const r=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${ACCT}/Messages.json`,{
      method:"POST",
      headers:{"Authorization":"Basic "+btoa(`${ACCT}:${AUTH}`),"Content-Type":"application/x-www-form-urlencoded"},
      body:new URLSearchParams(p).toString()
    });
    const d=await r.json();
    if(!r.ok)return{ok:false,error:`${d.code}:${d.message}`,provider:"twilio"};
    return{ok:true,sid:d.sid,provider:"twilio"};
  }catch(e:any){return{ok:false,error:e.message,provider:"twilio"};}
}

async function atSend(to:string,body:string):Promise<{ok:boolean;error?:string;provider:string}>{
  const k=Deno.env.get("AT_API_KEY")||"",u=Deno.env.get("AT_USERNAME")||"";
  if(!k||!u)return{ok:false,error:"AT not set",provider:"africas_talking"};
  try{
    const r=await fetch("https://api.africastalking.com/version1/messaging",{
      method:"POST",headers:{"apiKey":k,"Content-Type":"application/x-www-form-urlencoded","Accept":"application/json"},
      body:new URLSearchParams({username:u,to,message:body}).toString()
    });
    const d=await r.json();
    const m=d?.SMSMessageData?.Recipients?.[0];
    return{ok:m?.statusCode===101,error:m?.status,provider:"africas_talking"};
  }catch(e:any){return{ok:false,error:e.message,provider:"africas_talking"};}
}

async function log(to:string,body:string,res:any,meta:any,ch:string){
  await Promise.allSettled([
    sb.from("reception_messages").insert({
      recipient_phone:to,recipient_name:meta.name||null,message_body:body,
      message_type:ch,direction:"outbound",department:meta.dept||null,
      status:res.ok?"sent":"failed",twilio_sid:res.sid||null,error_code:res.error||null,
      sent_at:new Date().toISOString()
    }),
    sb.from("sms_log").insert({
      to_number:to,from_number:FROM,message:body,status:res.ok?"sent":"failed",
      twilio_sid:res.sid||null,module:meta.module||"system",error_msg:res.error||null,
      sent_at:new Date().toISOString()
    }),
    sb.from("sms_conversations").upsert({
      phone_number:to,contact_name:meta.name||null,last_message:body.slice(0,100),
      last_message_at:new Date().toISOString(),status:"open"
    },{onConflict:"phone_number"}),
  ]);
}

async function handleInbound(p:URLSearchParams):Promise<string>{
  const from=p.get("From")||"",body=p.get("Body")||"",sid=p.get("MessageSid")||"";
  const ch=from.startsWith("whatsapp:")?"whatsapp":"sms";
  const phone=from.replace("whatsapp:","");
  const lower=body.toLowerCase().trim();
  await Promise.allSettled([
    sb.from("reception_messages").insert({recipient_phone:phone,message_body:body,message_type:ch,direction:"inbound",status:"received",twilio_sid:sid,sent_at:new Date().toISOString()}),
    sb.from("sms_conversations").upsert({phone_number:phone,last_message:body.slice(0,100),last_message_at:new Date().toISOString(),status:"open",unread_count:1},{onConflict:"phone_number"}),
  ]);
  let reply="";
  if(lower==="help"||lower==="menu")reply=`EL5 MediProcure Menu:\n• STATUS REQ-ID\n• STOCK [item]\n• BALANCE [vote]\n• STOP / START\nHospital line: +254 (main)`;
  else if(lower==="stop"){reply="Unsubscribed from EL5 alerts. Reply START to re-subscribe.";await sb.from("sms_conversations").update({status:"closed"}).eq("phone_number",phone);}
  else if(lower==="start")reply="Welcome back to EL5 MediProcure notifications!";
  else if(lower.startsWith("status ")){
    const id=body.split(" ")[1];
    const{data:r}=await sb.from("requisitions").select("id,status,title").ilike("id",`%${id}%`).limit(1);
    reply=r?.[0]?`REQ ${r[0].id}: ${r[0].status}\n${r[0].title||""}`:`Requisition ${id} not found.`;
  }else if(lower.startsWith("stock ")){
    const item=body.slice(6).trim();
    const{data:r}=await sb.from("items").select("name,quantity_in_stock,unit").ilike("name",`%${item}%`).limit(3);
    reply=r?.length?r.map((i:any)=>`${i.name}: ${i.quantity_in_stock} ${i.unit||""}`).join("\n"):`Item '${item}' not found.`;
  }else reply=`Received at EL5 Hospital. Reply HELP for options.`;
  return`<?xml version="1.0" encoding="UTF-8"?>\n<Response>${reply?`<Message>${reply}</Message>`:""}</Response>`;
}

async function renew():Promise<{renewed:number;checked:number}>{
  const{data}=await sb.from("sms_conversations").select("phone_number,last_message_at").not("phone_number","is",null);
  let renewed=0;
  for(const c of data||[]){
    const h=(Date.now()-new Date(c.last_message_at||0).getTime())/3600000;
    if(h>22&&h<72){await twilioSend(c.phone_number,`[EL5 MediProcure] Your notifications are active. Reply HELP for options.`,"whatsapp");renewed++;await new Promise(r=>setTimeout(r,700));}
  }
  await sb.from("system_settings").upsert({key:"whatsapp_last_renewal",value:new Date().toISOString()},{onConflict:"key"});
  return{renewed,checked:(data||[]).length};
}

serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});
  const url=new URL(req.url);
  if(req.method==="GET"&&url.searchParams.get("action")==="status")
    return new Response(JSON.stringify({ok:true,version:"11.0",acct:ACCT.slice(0,10)+"...",auth_set:!!AUTH,sms_from:FROM,wa_from:"+14155238886",mg_sid:MSID,wa_join:WA_CODE,note:"MGd547=Messaging(SMS), VA692606=Verify(OTP only)"}),{headers:{...CORS,"Content-Type":"application/json"}});
  if(req.method==="POST"&&url.searchParams.get("webhook")==="inbound"){
    const fd=await req.formData();const p=new URLSearchParams();fd.forEach((v,k)=>p.set(k,v.toString()));
    return new Response(await handleInbound(p),{headers:{...CORS,"Content-Type":"text/xml"}});
  }
  if(req.method==="POST"&&(url.searchParams.get("action")==="renew"||req.headers.get("x-action")==="renew")){
    const r=await renew();return new Response(JSON.stringify({ok:true,...r}),{headers:{...CORS,"Content-Type":"application/json"}});
  }
  try{
    const b=await req.json();
    const{to,message,channel="sms",module:mod,sent_by,recipient_name:name,department:dept}=b;
    if(!to||!message)return new Response(JSON.stringify({ok:false,error:"to and message required"}),{status:400,headers:{...CORS,"Content-Type":"application/json"}});
    const fullMsg=`[${HOSP}] ${message}`.slice(0,1600);
    const nums=(Array.isArray(to)?to:String(to).split(",").map((s:string)=>s.trim())).filter(Boolean).map(e164).filter(n=>n.length>7);
    if(!nums.length)return new Response(JSON.stringify({ok:false,error:"No valid phones"}),{status:400,headers:{...CORS,"Content-Type":"application/json"}});
    const results:any[]=[];
    for(const num of nums){
      let res:any;
      if(channel==="whatsapp"){
        res=await twilioSend(num,fullMsg,"whatsapp");
        if(!res.ok){const s=await twilioSend(num,`${fullMsg}\n[WhatsApp: send "${WA_CODE}" to +14155238886]`,"sms");res={...s,provider:s.ok?"sms_fallback":"failed"};}
      }else{
        res=await twilioSend(num,fullMsg,"sms");
        if(!res.ok)res=await atSend(num,fullMsg);
      }
      await log(num,fullMsg,res,{name,dept,module:mod,sent_by},channel);
      results.push({to:num,ok:res.ok,sid:res.sid,provider:res.provider,error:res.error});
    }
    const sent=results.filter(r=>r.ok).length;
    return new Response(JSON.stringify({ok:sent>0,sent,failed:results.length-sent,total:results.length,mg_sid:MSID,sms_from:FROM,wa_join:WA_CODE,results}),{headers:{...CORS,"Content-Type":"application/json"}});
  }catch(e:any){return new Response(JSON.stringify({ok:false,error:e.message}),{status:500,headers:{...CORS,"Content-Type":"application/json"}});}
});
