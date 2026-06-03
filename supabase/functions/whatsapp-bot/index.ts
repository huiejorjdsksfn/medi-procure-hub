/**
 * EL5 MediProcure — WhatsApp AI Bot v2.0 PRODUCTION FIX
 * Fixed:
 *   - Removed dead Lovable AI Gateway (https://ai.gateway.lovable.dev — offline)
 *   - Credentials loaded from env + system_settings fallback
 *   - All DB inserts in try/catch to prevent cascade failures
 *   - Graceful degradation: rule-based when AI unavailable
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
};

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function loadCreds() {
  let ACCT    = Deno.env.get("TWILIO_ACCOUNT_SID") || "";
  let AUTH    = Deno.env.get("TWILIO_AUTH_TOKEN")  || "";
  let FROM_WA = Deno.env.get("TWILIO_WHATSAPP_FROM") || "";

  if (!ACCT || !AUTH) {
    try {
      const { data: rows } = await sb.from("system_settings").select("key,value")
        .in("key", ["twilio_account_sid", "twilio_auth_token", "twilio_whatsapp_from"]);
      const cfg: Record<string, string> = {};
      for (const r of rows ?? []) cfg[r.key] = r.value;
      if (!ACCT)    ACCT    = cfg["twilio_account_sid"]   || "";
      if (!AUTH)    AUTH    = cfg["twilio_auth_token"]    || "";
      if (!FROM_WA) FROM_WA = cfg["twilio_whatsapp_from"] || "";
    } catch { /* non-fatal */ }
  }

  if (!FROM_WA) FROM_WA = "whatsapp:+14155238886";
  return { ACCT, AUTH, FROM_WA };
}

function e164(r: string): string {
  const n = String(r || "").replace(/[\s\-\(\)\.]/g, "");
  if (!n) return "";
  if (n.startsWith("07") || n.startsWith("01")) return "+254" + n.slice(1);
  if (n.startsWith("254") && !n.startsWith("+")) return "+" + n;
  if (!n.startsWith("+")) return "+254" + n;
  return n;
}

async function sendWA(to: string, body: string, creds: Awaited<ReturnType<typeof loadCreds>>): Promise<boolean> {
  const { ACCT, AUTH, FROM_WA } = creds;
  if (!ACCT || !AUTH) { console.warn("[WA-bot] No Twilio creds"); return false; }
  const toFmt = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
  try {
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${ACCT}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${ACCT}:${AUTH}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ From: FROM_WA, To: toFmt, Body: body }).toString(),
      signal: AbortSignal.timeout(12000),
    });
    const d = await r.json();
    if (!r.ok) console.warn("[WA-bot] Twilio error:", d.message);
    return r.ok && !!d.sid;
  } catch (e: any) {
    console.error("[WA-bot] sendWA error:", e.message);
    return false;
  }
}

async function queryProcurement(intent: string, entities: Record<string, string>): Promise<string> {
  const lower = intent.toLowerCase();
  try {
    if (lower.includes("requisition") || lower.includes("req")) {
      const id = entities.id;
      if (id) {
        const { data } = await sb.from("requisitions")
          .select("id,status,title,department,created_at").ilike("id", `%${id}%`).limit(1);
        if (data?.[0]) return `📋 REQ ${data[0].id}\nTitle: ${data[0].title || "—"}\nStatus: ${data[0].status}\nDept: ${data[0].department || "—"}`;
        return `No requisition found matching "${id}".`;
      }
      const { data } = await sb.from("requisitions").select("id,status,title")
        .in("status", ["pending", "submitted"]).order("created_at", { ascending: false }).limit(5);
      if (!data?.length) return "No pending requisitions.";
      return "📋 Pending:\n" + data.map((r: any) => `• ${r.id}: ${r.title?.slice(0, 40) || "—"} [${r.status}]`).join("\n");
    }
    if (lower.includes("stock") || lower.includes("inventory") || lower.includes("item")) {
      const item = entities.item || lower.replace(/stock|inventory|item|of|for|the/gi, "").trim();
      if (item) {
        const { data } = await sb.from("items").select("name,quantity_in_stock,unit,reorder_level")
          .ilike("name", `%${item}%`).limit(5);
        if (!data?.length) return `No items found matching "${item}".`;
        return "📦 Stock:\n" + data.map((i: any) =>
          `• ${i.name}: ${i.quantity_in_stock} ${i.unit || ""} ${i.quantity_in_stock <= (i.reorder_level || 10) ? "⚠️LOW" : ""}`
        ).join("\n");
      }
      const { data } = await sb.from("items").select("name,quantity_in_stock,unit").lt("quantity_in_stock", 10).limit(5);
      if (!data?.length) return "No low stock alerts.";
      return "⚠️ Low Stock:\n" + data.map((i: any) => `• ${i.name}: ${i.quantity_in_stock} ${i.unit || ""}`).join("\n");
    }
    if (lower.includes("supplier")) {
      const { data } = await sb.from("suppliers").select("name,email,phone,status").eq("status", "active").limit(5);
      if (!data?.length) return "No active suppliers.";
      return "🏢 Suppliers:\n" + data.map((s: any) => `• ${s.name}: ${s.phone || s.email || "—"}`).join("\n");
    }
    if (lower.includes("po ") || lower.includes("purchase order")) {
      const { data } = await sb.from("purchase_orders").select("id,status,total_amount")
        .in("status", ["pending", "approved"]).order("created_at", { ascending: false }).limit(5);
      if (!data?.length) return "No active purchase orders.";
      return "📑 POs:\n" + data.map((p: any) => `• ${p.id}: KES ${Number(p.total_amount || 0).toLocaleString()} [${p.status}]`).join("\n");
    }
  } catch (e: any) {
    console.warn("[WA-bot] DB query error:", e.message);
  }
  return "";
}

function parseIntent(msg: string): { intent: string; entities: Record<string, string> } {
  const lower = msg.toLowerCase();
  const id  = msg.match(/\b(REQ|PO|GRN|LPO|INV)-?\d+/i)?.[0] || "";
  const item = lower.startsWith("stock ") ? msg.slice(6).trim() : lower.startsWith("check ") ? msg.slice(6).trim() : "";
  return {
    intent: lower.includes("req") ? "requisition"
      : lower.includes("stock") || lower.includes("inventory") ? "inventory"
      : lower.includes("po ") || lower.includes("purchase") ? "purchase_order"
      : lower.includes("supplier") ? "supplier"
      : "general",
    entities: { id, item },
  };
}

async function handleMessage(from: string, body: string): Promise<string> {
  const phone = from.replace("whatsapp:", "");
  const lower = body.toLowerCase().trim();

  // Log inbound
  try {
    await Promise.allSettled([
      sb.from("reception_messages").insert({
        recipient_phone: phone, message_body: body, message_type: "whatsapp",
        direction: "inbound", status: "received", sent_at: new Date().toISOString(),
      }),
      sb.from("sms_conversations").upsert({
        phone_number: phone, last_message: body.slice(0, 100),
        last_message_at: new Date().toISOString(), status: "open", unread_count: 1,
      }, { onConflict: "phone_number" }),
    ]);
  } catch { /* non-fatal */ }

  // Hard keyword commands
  if (lower === "help" || lower === "menu" || lower === "hi" || lower === "hello")
    return `🏥 *EL5 MediProcure*\n\nReply with a number:\n*1* Requisition status\n*2* Purchase Order status\n*3* Low stock alerts\n*4* Talk to a human\n\nOr ask in plain language.\nType STOP to unsubscribe.`;
  if (lower === "1") return "Reply with REQ number, e.g. *REQ-1024* or *STATUS REQ-1024*.";
  if (lower === "2") return "Reply with LPO number, e.g. *LPO-2025-007*.";
  if (lower === "3") {
    try {
      const { data } = await sb.from("items").select("name,quantity_in_stock,unit").lt("quantity_in_stock", 10).limit(8);
      if (!data?.length) return "✅ No low stock alerts.";
      return "⚠️ *Low Stock:*\n" + data.map((i: any) => `• ${i.name}: ${i.quantity_in_stock} ${i.unit || ""}`).join("\n");
    } catch { return "⚠️ Could not fetch stock data. Try again."; }
  }
  if (lower === "4") {
    try { await sb.from("sms_conversations").update({ status: "assigned", department: "reception" }).eq("phone_number", phone); } catch { /* non-fatal */ }
    return "📞 Connecting you to a hospital agent. Reception will reply shortly. Mon–Fri 8am–5pm EAT.";
  }
  if (lower === "stop") {
    try { await sb.from("sms_conversations").update({ status: "closed" }).eq("phone_number", phone); } catch { /* non-fatal */ }
    return "You've been unsubscribed from EL5 alerts. Reply START to re-subscribe.";
  }
  if (lower === "start") return "Welcome back to EL5 MediProcure! Type HELP for commands.";

  // DB query
  const { intent, entities } = parseIntent(body);
  const dbCtx = await queryProcurement(intent, entities);
  if (dbCtx) return dbCtx;

  // Default fallback (no external AI dependency)
  return `Received at EL5 Hospital. Type *HELP* for commands or ask about requisitions, stock, POs, or suppliers.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const creds = await loadCreds();
  const url = new URL(req.url);

  // Twilio inbound webhook
  if (req.method === "POST" && url.searchParams.get("webhook") === "whatsapp") {
    try {
      const fd   = await req.formData();
      const from = fd.get("From")?.toString() || "";
      const body = fd.get("Body")?.toString() || "";
      const reply = await handleMessage(from, body);
      const phone = from.replace("whatsapp:", "");
      if (reply) await sendWA(phone, reply, creds);
    } catch (e: any) {
      console.error("[WA-bot] Webhook error:", e.message);
    }
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, {
      headers: { ...CORS, "Content-Type": "text/xml" },
    });
  }

  // Manual send endpoint
  if (req.method === "POST") {
    try {
      const { to, message } = await req.json();
      if (!to || !message)
        return new Response(JSON.stringify({ ok: false, error: "to and message required" }),
          { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
      const ok = await sendWA(e164(to), message, creds);
      return new Response(JSON.stringify({ ok, to, creds_set: !!creds.ACCT }),
        { headers: { ...CORS, "Content-Type": "application/json" } });
    } catch (e: any) {
      return new Response(JSON.stringify({ ok: false, error: e.message }),
        { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
    }
  }

  return new Response(JSON.stringify({ ok: true, service: "EL5 WhatsApp AI Bot", version: "2.0" }),
    { headers: { ...CORS, "Content-Type": "application/json" } });
});
