/**
 * EL5 MediProcure — AI Agent Edge Function v1.1
 * v1.1: Anti-replay guard (x-el5-nonce / x-el5-ts headers, optional).
 * Handles: approval message generation, email composition, Google Form creation
 * Uses Claude AI (Anthropic) with intelligent fallbacks
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";
const TWILIO_ACCT   = Deno.env.get("TWILIO_ACCOUNT_SID") || "";
const TWILIO_AUTH   = Deno.env.get("TWILIO_AUTH_TOKEN")  || "";
const SENDER_EMAIL  = "hpdeskg9@gmail.com";
const TWILIO_SMS    = Deno.env.get("TWILIO_PHONE_NUMBER") || "+16812972643";
const TWILIO_WA     = Deno.env.get("TWILIO_WA_NUMBER")   || "+14155238886";

const db = createClient(SUPABASE_URL, SERVICE_KEY);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-el5-nonce, x-el5-ts",
  "Content-Type": "application/json",
};

const REPLAY_SKEW_MS = 5 * 60 * 1000;
async function checkReplay(req: Request): Promise<{ ok: boolean; error?: string }> {
  const nonce = req.headers.get("x-el5-nonce");
  const ts = req.headers.get("x-el5-ts");
  if (!nonce || !ts) return { ok: true };
  const tsNum = parseInt(ts, 10);
  if (!tsNum || Math.abs(Date.now() - tsNum) > REPLAY_SKEW_MS) return { ok: false, error: "Request timestamp expired or invalid" };
  const { error } = await db.from("security_nonces").insert({ nonce });
  if (error) return { ok: false, error: "Duplicate request (replay detected)" };
  return { ok: true };
}

async function callClaude(prompt: string, system: string, maxTokens = 500): Promise<string> {
  if (!ANTHROPIC_KEY) return fallbackMessage(prompt);
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!r.ok) throw new Error(`Claude API ${r.status}`);
    const d = await r.json();
    return d.content?.[0]?.text || fallbackMessage(prompt);
  } catch (e) {
    console.error("Claude error:", e);
    return fallbackMessage(prompt);
  }
}

function fallbackMessage(prompt: string): string {
  const p = prompt.toLowerCase();
  if (p.includes("approval") || p.includes("approve")) {
    return `🏥 *EL5 MediProcure — Approval Required*\n\nThis item requires your approval in the procurement system.\n\nPlease log in at: https://procurbosse.edgeone.app\n\nReply *APPROVE* to approve or *REJECT [reason]* to reject.\n\n_Embu Level 5 Hospital_`;
  }
  if (p.includes("grn") || p.includes("goods received")) {
    return `📦 *EL5 MediProcure — GRN Notification*\n\nGoods have been received and recorded in the system.\nPlease proceed with the 3-way match.\n\nhttps://procurbosse.edgeone.app\n\n_Embu Level 5 Hospital_`;
  }
  if (p.includes("low stock") || p.includes("stock alert")) {
    return `⚠️ *EL5 MediProcure — Low Stock Alert*\n\nCritical stock level detected. Immediate procurement action required.\n\nhttps://procurbosse.edgeone.app/inventory\n\n_Embu Level 5 Hospital_`;
  }
  if (p.includes("email")) {
    return `Dear Colleague,\n\nThis is an automated notification from EL5 MediProcure — the Embu Level 5 Hospital Procurement System.\n\nPlease log in to take action: https://procurbosse.edgeone.app\n\nRegards,\nEL5 MediProcure System\nEmbu Level 5 Hospital`;
  }
  return `🏥 EL5 MediProcure notification. Please log in to https://procurbosse.edgeone.app`;
}

function formatKenyanPhone(raw: string): string {
  if (!raw) return "";
  let n = String(raw).replace(/[^\d+]/g, "").trim();
  if (n.length < 9) return "";
  if (n.startsWith("+")) n = n.slice(1);
  if (n.startsWith("254")) {
    if (n.length === 12) return "+" + n;
    if (n.length > 12) n = n.slice(0, 12);
    if (n.length < 12) n = "254" + n.slice(3).padStart(9, "0").slice(0, 9);
    return "+" + n;
  }
  if (n.startsWith("0")) n = n.slice(1);
  if (n.length === 9 && (n[0] === "7" || n[0] === "1" || n[0] === "0")) {
    return "+254" + n;
  }
  if (n.length >= 9) return "+254" + n.slice(-9);
  return "";
}

async function twilioSend(to: string, body: string, whatsapp = false) {
  if (!TWILIO_ACCT || !TWILIO_AUTH) return { ok: false, error: "Twilio not configured" };
  const formattedNum = formatKenyanPhone(to);
  if (!formattedNum) return { ok: false, error: `Invalid phone number: ${to}` };
  const from = whatsapp ? `whatsapp:${TWILIO_WA}` : TWILIO_SMS;
  const toNum = whatsapp ? `whatsapp:${formattedNum}` : formattedNum;
  try {
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCT}/Messages.json`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`${TWILIO_ACCT}:${TWILIO_AUTH}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ From: from, To: toNum, Body: body }).toString(),
      signal: AbortSignal.timeout(15000),
    });
    const d = await r.json();
    return r.ok ? { ok: true, sid: d.sid } : { ok: false, error: d.message };
  } catch (e: any) { return { ok: false, error: e.message }; }
}

async function logMessage(to: string, body: string, channel: string, status: string, meta: Record<string, any> = {}) {
  await db.from("sms_messages").insert({
    to_number: to, message_body: body, channel, status,
    sent_at: new Date().toISOString(), module: "ai_agent",
    metadata: { ...meta, source: "ai-agent-fn" },
    direction: "outbound",
  }).then(() => {});
}

function buildGoogleFormUrl(title: string, desc: string, fields: string[]): string {
  const baseUrl = "https://docs.google.com/forms/create";
  const params = new URLSearchParams({
    title: `${title} — EL5 MediProcure`,
    description: `${desc}\n\nEmbu Level 5 Hospital Procurement System`,
  });
  return `${baseUrl}?${params.toString()}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  if (req.method === "POST") {
    const replay = await checkReplay(req);
    if (!replay.ok) return new Response(JSON.stringify({ ok: false, error: replay.error }), { status: 409, headers: CORS });
  }

  try {
    const body = await req.json();
    const { action, prompt, context, form, approval, email } = body;

    if (!action || action === "compose") {
      const system = `You are the AI agent for EL5 MediProcure, a hospital procurement system at Embu Level 5 Hospital, Kenya.
Generate concise, professional procurement notifications.
For SMS/WhatsApp: under 160 chars, use *bold* for key info, start with 🏥.
For email: formal, structured, include login URL https://procurbosse.edgeone.app.
Context: ${JSON.stringify(context || {})}.
Reply with ONLY the message text, no explanation.`;
      const message = await callClaude(prompt || "Generate an approval notification", system, 400);
      return new Response(JSON.stringify({ ok: true, message }), { headers: CORS });
    }

    if (action === "send_approval") {
      const { ref, amount, department, phone, email: toEmail, channel = "sms", message: customMsg } = approval || {};
      const system = `You are the AI agent for EL5 MediProcure hospital procurement system at Embu Level 5 Hospital, Kenya.
Generate a ${channel === "email" ? "formal email" : "concise SMS/WhatsApp"} approval notification.
Be professional, clear, and include the reference and amount.
For SMS/WhatsApp: under 160 chars. For email: full paragraph.
Reply with ONLY the message text.`;
      const aiPrompt = `Generate a procurement approval notification for:
- Reference: ${ref}
- Amount: KES ${Number(amount || 0).toLocaleString()}
- Department: ${department}
- Channel: ${channel}
- Action needed: Approve or reject this ${ref?.startsWith("PO") ? "purchase order" : ref?.startsWith("PV") ? "payment voucher" : "requisition"}`;
      const message = customMsg || await callClaude(aiPrompt, system, 300);
      const results: Record<string, any> = {};

      if ((channel === "sms" || channel === "all") && phone) {
        const r = await twilioSend(phone, message, false);
        results.sms = r;
        await logMessage(phone, message, "sms", r.ok ? "sent" : "failed", { ref, amount, department, rule: "ai_approval" });
      }
      if ((channel === "whatsapp" || channel === "all") && phone) {
        const r = await twilioSend(phone, message, true);
        results.whatsapp = r;
        await logMessage(phone, message, "whatsapp", r.ok ? "sent" : "failed", { ref, amount, department, rule: "ai_approval" });
      }
      if ((channel === "email" || channel === "all") && toEmail) {
        try {
          const emailBody = channel === "email" ? message : `${message}\n\nLog in to action this: https://procurbosse.edgeone.app`;
          const r = await db.functions.invoke("send-email", {
            body: { to: toEmail, subject: `Approval Required: ${ref} — EL5 MediProcure`, body: emailBody, module: "ai_approval" }
          });
          results.email = { ok: !r.error };
          await logMessage(toEmail, emailBody, "email", !r.error ? "sent" : "failed", { ref, amount, department });
        } catch (e: any) { results.email = { ok: false, error: e.message }; }
      }

      await db.from("audit_logs").insert({
        action: "ai_agent_approval_sent",
        details: `AI Agent sent approval for ${ref} (KES ${amount}) via ${channel}`,
        created_at: new Date().toISOString(),
      }).then(() => {});

      const sent = Object.values(results).filter((r: any) => r?.ok).length;
      return new Response(JSON.stringify({ ok: sent > 0, sent, results, message }), { headers: CORS });
    }

    if (action === "create_form") {
      const { title, description, fields = [] } = form || {};
      const aiDesc = await callClaude(
        `Write a 1-sentence professional description for a Google Form titled "${title}" used in EL5 MediProcure hospital procurement system at Embu Level 5 Hospital, Kenya.`,
        "You write concise form descriptions for hospital procurement. Reply with ONLY the description sentence.",
        100
      );
      const formUrl = buildGoogleFormUrl(title, aiDesc || description, fields);
      await db.from("audit_logs").insert({
        action: "ai_agent_form_created",
        details: `AI Agent created form: ${title} (${fields.length} fields)`,
        created_at: new Date().toISOString(),
      }).then(() => {});
      return new Response(JSON.stringify({ ok: true, formUrl, formTitle: title, formDescription: aiDesc || description, fields, shareableLink: formUrl }), { headers: CORS });
    }

    if (action === "process_event") {
      const { table, event_type, record } = body;
      const notifs: any[] = [];
      if (table === "requisitions" && event_type === "INSERT") {
        const msg = await callClaude(
          `Notify the procurement manager that requisition ${record?.id || "REQ-NEW"} for KES ${Number(record?.total_amount || 0).toLocaleString()} from ${record?.department || "department"} needs approval.`,
          "You are EL5 MediProcure AI agent. Write a brief SMS notification. Reply with ONLY the message.",
          150
        );
        notifs.push({ type: "sms", trigger: "req_submit", message: msg });
      }
      return new Response(JSON.stringify({ ok: true, notifications: notifs }), { headers: CORS });
    }

    if (action === "compose_email") {
      const { subject, department } = email || {};
      const system = `You are an AI assistant for EL5 MediProcure, the hospital procurement system at Embu Level 5 Hospital, Kenya.
Write professional procurement emails. Always end with:
Regards,
EL5 MediProcure System
Embu Level 5 Hospital | https://procurbosse.edgeone.app`;
      const body_text = await callClaude(
        `Write a professional email body for subject: "${subject}". Department: ${department || "Procurement"}.`,
        system, 400
      );
      return new Response(JSON.stringify({ ok: true, body: body_text }), { headers: CORS });
    }

    return new Response(JSON.stringify({ ok: false, error: "Unknown action" }), { status: 400, headers: CORS });
  } catch (e: any) {
    console.error("AI Agent error:", e);
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: CORS });
  }
});
