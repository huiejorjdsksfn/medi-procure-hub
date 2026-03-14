import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import nodemailer from "npm:nodemailer@6.9.16";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SmtpConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  from_email: string;
  from_name?: string;
  encryption?: string;
}

interface EmailPayload {
  to: string | string[];
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  html?: string;
  from?: string;
  from_name?: string;
  priority?: "low" | "normal" | "high" | "urgent";
  smtp?: SmtpConfig;
}

const parseList = (value?: string): string[] =>
  (value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

const buildHtmlBody = (payload: EmailPayload) =>
  payload.html ||
  `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><style>
body { font-family: 'Segoe UI', Arial, sans-serif; color:#374151; background:#f9fafb; margin:0; padding:0; }
.wrap { max-width:600px; margin:30px auto; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.08); }
.header { background:linear-gradient(135deg,#0a2558,#1a3a6b); padding:20px 28px; }
.header h1 { color:#fff; font-size:18px; margin:0; font-weight:800; }
.header p { color:rgba(255,255,255,0.65); font-size:11px; margin:4px 0 0; }
.body { padding:28px; }
.body pre { white-space:pre-wrap; font-family:'Segoe UI', Arial, sans-serif; font-size:14px; line-height:1.75; margin:0; }
.footer { padding:16px 28px; background:#f9fafb; border-top:1px solid #e5e7eb; font-size:11px; color:#9ca3af; text-align:center; }
</style></head>
<body>
  <div class="wrap">
    <div class="header">
      <h1>EL5 MediProcure</h1>
      <p>Embu Level 5 Hospital · Embu County Government</p>
    </div>
    <div class="body"><pre>${payload.body.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre></div>
    <div class="footer">This is an automated message from EL5 MediProcure.</div>
  </div>
</body>
</html>`;

const resolveSmtpConfig = (payload: EmailPayload): SmtpConfig => ({
  host: payload.smtp?.host || Deno.env.get("SMTP_HOST") || "",
  port: payload.smtp?.port || Number(Deno.env.get("SMTP_PORT") || "587"),
  username: payload.smtp?.username || Deno.env.get("SMTP_USER") || "",
  password: payload.smtp?.password || Deno.env.get("SMTP_PASS") || "",
  from_email:
    payload.smtp?.from_email || payload.from || Deno.env.get("SMTP_FROM") || payload.smtp?.username || Deno.env.get("SMTP_USER") || "",
  from_name: payload.smtp?.from_name || payload.from_name || Deno.env.get("SMTP_FROM_NAME") || "EL5 MediProcure",
  encryption: payload.smtp?.encryption || Deno.env.get("SMTP_ENCRYPTION") || "tls",
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: EmailPayload = await req.json();
    const smtp = resolveSmtpConfig(payload);

    if (!smtp.host || !smtp.username || !smtp.password || !smtp.from_email) {
      return new Response(
        JSON.stringify({
          success: false,
          code: "SMTP_NOT_CONFIGURED",
          error: "SMTP settings are missing. Configure SMTP_* secrets in Supabase Edge Functions or pass smtp in the payload.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const toList = Array.isArray(payload.to) ? payload.to : [payload.to];
    const ccList = parseList(payload.cc);
    const bccList = parseList(payload.bcc);
    const html = buildHtmlBody(payload);

    const secure = smtp.encryption?.toLowerCase() === "ssl" || smtp.port === 465;

    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure,
      auth: {
        user: smtp.username,
        pass: smtp.password,
      },
    });

    await transporter.verify();

    const info = await transporter.sendMail({
      from: `${smtp.from_name} <${smtp.from_email}>`,
      to: toList,
      cc: ccList.length ? ccList : undefined,
      bcc: bccList.length ? bccList : undefined,
      subject: payload.subject,
      text: payload.body,
      html,
      priority:
        payload.priority === "urgent" || payload.priority === "high"
          ? "high"
          : payload.priority === "low"
            ? "low"
            : "normal",
      headers: {
        "X-Mailer": "EL5-MediProcure/3.1",
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        provider: "supabase_smtp",
        accepted: info.accepted,
        rejected: info.rejected,
        messageId: info.messageId,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown SMTP error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
