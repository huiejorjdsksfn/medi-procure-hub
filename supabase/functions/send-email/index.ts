/**
 * EL5 MediProcure — send-email v6.0  PRODUCTION
 * Primary: Resend API (api.resend.com) — fastest, most reliable
 * Fallback: Supabase SMTP (smtp.resend.com via resend API key)
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

// Credentials — env secrets take priority
const RESEND_KEY  = Deno.env.get("RESEND_API_KEY") || "";
// Primary sender: hpdeskg9@gmail.com (configured in Resend as verified sender)
const FROM_EMAIL  = Deno.env.get("SMTP_FROM_EMAIL") || "hpdeskg9@gmail.com";
const FROM_NAME   = Deno.env.get("SMTP_FROM_NAME")  || "EL5 MediProcure";
const BCC_EMAIL   = Deno.env.get("EMAIL_BCC")        || "";

function buildHtml(subject:string, body:string, actionUrl?:string, actionLabel?:string):string {
  const safe=(body||"")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>")
    .replace(/\n/g,"<br/>");
  return`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${subject}</title>
<meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif">
<div style="max-width:600px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.13)">
  <div style="background:linear-gradient(135deg,#0e2a4a 0%,#0e7490 100%);padding:28px 32px;text-align:center">
    <div style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-.02em">🏥 EL5 MediProcure</div>
    <div style="color:rgba(255,255,255,.65);font-size:11px;margin-top:5px;letter-spacing:.06em">ProcurBosse v10 · Embu Level 5 Hospital · Embu County Government</div>
  </div>
  <div style="padding:32px 36px">
    <h2 style="margin:0 0 20px;color:#0e2a4a;font-size:19px;font-weight:700;border-bottom:2px solid #e0f2fe;padding-bottom:12px">${subject}</h2>
    <div style="color:#374151;font-size:14px;line-height:1.85">${safe}</div>
    ${actionUrl?`<div style="text-align:center;margin-top:32px"><a href="${actionUrl}" style="display:inline-block;padding:13px 30px;background:linear-gradient(135deg,#0e7490,#0c6380);color:#fff;text-decoration:none;border-radius:9px;font-weight:700;font-size:14px;letter-spacing:.02em">${actionLabel||"View Details"}</a></div>`:""}
  </div>
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 36px;text-align:center">
    <div style="color:#9ca3af;font-size:11px">© ${new Date().getFullYear()} Embu County Government · Embu Level 5 Hospital</div>
    <div style="color:#d1d5db;font-size:10px;margin-top:4px">EL5 MediProcure v11.5 · ProcurBosse · Health Procurement ERP · Kenya</div>
    <div style="color:#d1d5db;font-size:9px;margin-top:4px">Sent from: hpdeskg9@gmail.com · EL5 MediProcure automated message.</div>
  </div>
</div></body></html>`;
}

async function sendViaResend(to:string|string[],subject:string,html:string,text:string,replyTo?:string):Promise<{ok:boolean;id?:string;error?:string}>{
  if(!RESEND_KEY)return{ok:false,error:"RESEND_API_KEY not set in Supabase secrets"};
  const toArr=Array.isArray(to)?to:[to];
  const payload:any={
    from:`${FROM_NAME} <${FROM_EMAIL}>`,
    to:toArr,
    subject,
    html,
    text,
  };
  if(replyTo)payload.reply_to=replyTo;
  if(BCC_EMAIL)payload.bcc=[BCC_EMAIL];
  try{
    const r=await fetch("https://api.resend.com/emails",{
      method:"POST",
      headers:{"Authorization":`Bearer ${RESEND_KEY}`,"Content-Type":"application/json"},
      body:JSON.stringify(payload)
    });
    const d=await r.json();
    if(!r.ok)return{ok:false,error:d.message||d.error||"Resend failed"};
    return{ok:true,id:d.id};
  }catch(e:any){return{ok:false,error:e.message};}
}

async function logEmail(to:string,subject:string,status:string,provider:string,id?:string,err?:string){
  try{await sb.from("email_logs").insert({to_email:to,subject,status,provider,message_id:id||null,error_message:err||null,sent_at:new Date().toISOString()} as any);}catch{}
}

serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});

  // Status check
  const url=new URL(req.url);
  if(req.method==="GET"&&url.searchParams.get("action")==="status")
    return new Response(JSON.stringify({ok:true,version:"6.0",resend_key_set:!!RESEND_KEY,from:FROM_EMAIL,from_name:FROM_NAME}),{headers:{...CORS,"Content-Type":"application/json"}});

  try{
    const b=await req.json();
    const{to,subject,body,html,action_url,action_label,reply_to,cc,template,template_vars}=b;
    if(!to||!subject)return new Response(JSON.stringify({ok:false,error:"to and subject required"}),{status:400,headers:{...CORS,"Content-Type":"application/json"}});

    // Template system
    let finalBody=body||"";
    if(template&&template_vars){
      const{data}=await sb.from("email_templates").select("*").eq("key",template).maybeSingle();
      if(data?.html_content){
        let t=data.html_content;
        for(const[k,v] of Object.entries(template_vars||{})){t=t.replaceAll(`{{${k}}}`,String(v));}
        const result=await sendViaResend(to,subject,t,finalBody,reply_to);
        await logEmail(Array.isArray(to)?to[0]:to,subject,result.ok?"sent":"failed","resend",result.id,result.error);
        return new Response(JSON.stringify(result),{headers:{...CORS,"Content-Type":"application/json"}});
      }
    }

    const htmlContent=html||buildHtml(subject,finalBody,action_url,action_label);
    const textContent=finalBody.replace(/<[^>]+>/g,"");
    const result=await sendViaResend(to,subject,htmlContent,textContent,reply_to);
    await logEmail(Array.isArray(to)?to[0]:to,subject,result.ok?"sent":"failed","resend",result.id,result.error);
    return new Response(JSON.stringify(result),{headers:{...CORS,"Content-Type":"application/json"}});
  }catch(e:any){
    return new Response(JSON.stringify({ok:false,error:e.message}),{status:500,headers:{...CORS,"Content-Type":"application/json"}});
  }
});
