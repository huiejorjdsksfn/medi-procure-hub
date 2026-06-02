/**
 * EL5 MediProcure — WhatsApp AI Bot v1.0
 * Handles inbound WhatsApp messages with AI responses + procurement queries
 * Uses Claude AI (Anthropic) for natural language + Twilio for delivery
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,x-client-info,apikey,content-type","Access-Control-Allow-Methods":"POST,GET,OPTIONS"};
const sb=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const ACCT =Deno.env.get("TWILIO_ACCOUNT_SID")||"REDACTED_TWILIO_ACCOUNT_SID";
const AUTH =Deno.env.get("TWILIO_AUTH_TOKEN") ||"REDACTED_TWILIO_AUTH_TOKEN";
const MSID =Deno.env.get("TWILIO_MESSAGING_SERVICE_SID")||"REDACTED_TWILIO_MESSAGING_SID";
const CLAUDE=Deno.env.get("ANTHROPIC_API_KEY")||"";
const FROM_WA="whatsapp:+14155238886";
const HOSP="EL5 MediProcure";

function e164(r:string):string{
  const n=String(r||"").replace(/[\s\-\(\)\.]/g,"");
  if(!n)return"";
  if(n.startsWith("07")||n.startsWith("01"))return"+254"+n.slice(1);
  if(n.startsWith("254")&&!n.startsWith("+"))return"+"+n;
  if(!n.startsWith("+"))return"+254"+n;
  return n;
}

async function sendWA(to:string,body:string):Promise<boolean>{
  const toFmt=to.startsWith("whatsapp:")?to:`whatsapp:${to}`;
  const r=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${ACCT}/Messages.json`,{
    method:"POST",
    headers:{"Authorization":"Basic "+btoa(`${ACCT}:${AUTH}`),"Content-Type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({From:FROM_WA,To:toFmt,Body:body}).toString()
  });
  return r.ok;
}

// ── Query procurement DB ──────────────────────────────────────────
async function queryProcurement(intent:string,entities:Record<string,string>):Promise<string>{
  const lower=intent.toLowerCase();
  if(lower.includes("requisition")||lower.includes("req")){
    const id=entities.id;
    if(id){
      const{data}=await sb.from("requisitions").select("id,status,title,department,created_at").ilike("id",`%${id}%`).limit(1);
      if(data?.[0])return`📋 REQ ${data[0].id}\nTitle: ${data[0].title||"—"}\nStatus: ${data[0].status}\nDept: ${data[0].department||"—"}`;
      return`No requisition found matching "${id}".`;
    }
    const{data}=await sb.from("requisitions").select("id,status,title").in("status",["pending","submitted"]).order("created_at",{ascending:false}).limit(5);
    if(!data?.length)return"No pending requisitions at this time.";
    return"📋 Pending Requisitions:\n"+data.map((r:any)=>`• ${r.id}: ${r.title?.slice(0,40)||"—"} [${r.status}]`).join("\n");
  }
  if(lower.includes("stock")||lower.includes("inventory")||lower.includes("item")){
    const item=entities.item||lower.replace(/stock|inventory|item|of|for|the/gi,"").trim();
    if(item){
      const{data}=await sb.from("items").select("name,quantity_in_stock,unit,reorder_level").ilike("name",`%${item}%`).limit(5);
      if(!data?.length)return`No items found matching "${item}".`;
      return"📦 Stock levels:\n"+data.map((i:any)=>`• ${i.name}: ${i.quantity_in_stock} ${i.unit||""} ${i.quantity_in_stock<=(i.reorder_level||10)?"⚠️LOW":""}`).join("\n");
    }
    const{data}=await sb.from("items").select("name,quantity_in_stock,unit,reorder_level").lt("quantity_in_stock",10).limit(5);
    if(!data?.length)return"No low stock alerts currently.";
    return"⚠️ Low Stock Items:\n"+data.map((i:any)=>`• ${i.name}: ${i.quantity_in_stock} ${i.unit||""} remaining`).join("\n");
  }
  if(lower.includes("supplier")){
    const{data}=await sb.from("suppliers").select("name,email,phone,status").eq("status","active").limit(5);
    if(!data?.length)return"No active suppliers found.";
    return"🏢 Active Suppliers:\n"+data.map((s:any)=>`• ${s.name}: ${s.phone||s.email||"—"}`).join("\n");
  }
  if(lower.includes("po ")||lower.includes("purchase order")){
    const{data}=await sb.from("purchase_orders").select("id,status,total_amount,created_at").in("status",["pending","approved"]).order("created_at",{ascending:false}).limit(5);
    if(!data?.length)return"No active purchase orders.";
    return"📑 Purchase Orders:\n"+data.map((p:any)=>`• ${p.id}: KES ${Number(p.total_amount||0).toLocaleString()} [${p.status}]`).join("\n");
  }
  return"";
}

// ── AI response via Claude ────────────────────────────────────────
async function claudeReply(history:Array<{role:string;content:string}>,dbContext:string):Promise<string>{
  if(!CLAUDE)return"";
  try{
    const system=`You are the EL5 MediProcure AI Assistant for Embu Level 5 Hospital, Kenya.
You help hospital staff with procurement queries, stock levels, requisitions, and general ERP questions.
Always be professional, concise (max 3 sentences for WhatsApp), and helpful.
Current DB context: ${dbContext||"No specific data found."}
Always end procurement-specific answers with the relevant data from context if available.
For greetings say: "Hello! I'm EL5 MediProcure AI. How can I help you today? (Type HELP for commands)"`;
    const r=await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",
      headers:{"x-api-key":CLAUDE,"anthropic-version":"2023-06-01","content-type":"application/json"},
      body:JSON.stringify({model:"claude-haiku-4-5-20251001",max_tokens:200,system,messages:history})
    });
    const d=await r.json();
    return d.content?.[0]?.text||"";
  }catch(e:any){console.warn("Claude error:",e.message);return"";}
}

// ── Extract intent + entities ─────────────────────────────────────
function parseIntent(msg:string):{intent:string;entities:Record<string,string>}{
  const lower=msg.toLowerCase();
  const id=msg.match(/\b(REQ|PO|GRN|LPO|INV)-?\d+/i)?.[0]||"";
  const item=lower.startsWith("stock ")?msg.slice(6).trim():lower.startsWith("check ")?msg.slice(6).trim():"";
  return{
    intent:lower.includes("req")?"requisition":lower.includes("stock")||lower.includes("inventory")?"inventory":lower.includes("po ")||lower.includes("purchase")?"purchase_order":lower.includes("supplier")?"supplier":"general",
    entities:{id,item}
  };
}

// ── Main inbound handler ──────────────────────────────────────────
async function handleMessage(from:string,body:string,waFrom:string):Promise<string>{
  const phone=from.replace("whatsapp:","");
  const lower=body.toLowerCase().trim();

  // Log inbound
  await Promise.allSettled([
    sb.from("reception_messages").insert({recipient_phone:phone,message_body:body,message_type:"whatsapp",direction:"inbound",status:"received",sent_at:new Date().toISOString()}),
    sb.from("sms_conversations").upsert({phone_number:phone,last_message:body.slice(0,100),last_message_at:new Date().toISOString(),status:"open",unread_count:1},{onConflict:"phone_number"}),
  ]);

  // Hard keyword commands
  if(lower==="help"||lower==="menu")
    return`🏥 *EL5 MediProcure AI*\n\n*Commands:*\n• STATUS REQ-123 — requisition\n• STOCK [item] — stock level\n• LOW STOCK — low items\n• PO [number] — purchase order\n• SUPPLIERS — active suppliers\n• STOP — unsubscribe\n\nOr just ask me anything in plain language!`;
  if(lower==="stop"){
    await sb.from("sms_conversations").update({status:"closed"}).eq("phone_number",phone);
    return"You've been unsubscribed from EL5 alerts. Reply START to re-subscribe.";
  }
  if(lower==="start")return"Welcome back to EL5 MediProcure! Type HELP for commands or ask me anything.";
  if(lower==="low stock"){
    const{data}=await sb.from("items").select("name,quantity_in_stock,unit").lt("quantity_in_stock",10).limit(8);
    if(!data?.length)return"✅ No low stock alerts.";
    return"⚠️ *Low Stock:*\n"+data.map((i:any)=>`• ${i.name}: ${i.quantity_in_stock} ${i.unit||""}`).join("\n");
  }

  // Get conversation history for AI context
  const{data:conv}=await sb.from("reception_messages").select("direction,message_body").eq("recipient_phone",phone).order("sent_at",{ascending:false}).limit(6);
  const history=(conv||[]).reverse().map((m:any)=>({role:m.direction==="inbound"?"user":"assistant",content:m.message_body||""})).filter((m:any)=>m.content);

  // Query DB for context
  const{intent,entities}=parseIntent(body);
  const dbCtx=await queryProcurement(intent,entities);

  // Add current message
  history.push({role:"user",content:body});

  // Try Claude AI
  const aiReply=await claudeReply(history,dbCtx);
  if(aiReply)return aiReply;

  // Fallback: rule-based with DB context
  if(dbCtx)return dbCtx;
  return`Received at EL5 Hospital. Type HELP for commands or ask about requisitions, stock, POs, suppliers.`;
}

serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});
  const url=new URL(req.url);

  // Twilio inbound webhook
  if(req.method==="POST"&&url.searchParams.get("webhook")==="whatsapp"){
    const fd=await req.formData();
    const from=fd.get("From")?.toString()||"";
    const body=fd.get("Body")?.toString()||"";
    const waFrom=fd.get("WaFrom")?.toString()||FROM_WA;
    const reply=await handleMessage(from,body,waFrom);
    // Send reply via Twilio
    const phone=from.replace("whatsapp:","");
    if(reply)await sendWA(phone,reply);
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,{headers:{...CORS,"Content-Type":"text/xml"}});
  }

  // Manual send
  if(req.method==="POST"){
    try{
      const{to,message}=await req.json();
      if(!to||!message)return new Response(JSON.stringify({ok:false,error:"to and message required"}),{status:400,headers:{...CORS,"Content-Type":"application/json"}});
      const ok=await sendWA(e164(to),message);
      return new Response(JSON.stringify({ok}),{headers:{...CORS,"Content-Type":"application/json"}});
    }catch(e:any){return new Response(JSON.stringify({ok:false,error:e.message}),{status:500,headers:{...CORS,"Content-Type":"application/json"}});}
  }

  return new Response(JSON.stringify({ok:true,service:"EL5 WhatsApp AI Bot",version:"1.0"}),{headers:{...CORS,"Content-Type":"application/json"}});
});
