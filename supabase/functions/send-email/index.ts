import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailPayload {
  to: string | string[];
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  html?: string;
  from?: string;
  from_name?: string;
  priority?: string;
  smtp?: {
    host: string;
    port: number;
    username: string;
    password: string;
    from_email: string;
    from_name: string;
    encryption: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: EmailPayload = await req.json();

    // Get SMTP config from env (set in Supabase dashboard)
    const smtpHost     = payload.smtp?.host     || Deno.env.get("SMTP_HOST")     || "";
    const smtpPort     = payload.smtp?.port     || Number(Deno.env.get("SMTP_PORT")) || 587;
    const smtpUser     = payload.smtp?.username || Deno.env.get("SMTP_USER")     || "";
    const smtpPass     = payload.smtp?.password || Deno.env.get("SMTP_PASS")     || "";
    const fromEmail    = payload.smtp?.from_email || payload.from || Deno.env.get("SMTP_FROM") || smtpUser;
    const fromName     = payload.smtp?.from_name  || payload.from_name || Deno.env.get("SMTP_FROM_NAME") || "EL5 MediProcure";

    if (!smtpHost || !smtpUser || !smtpPass) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in Supabase Edge Function environment.",
          code: "SMTP_NOT_CONFIGURED"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const toList = Array.isArray(payload.to) ? payload.to : [payload.to];
    
    // Build plain-text body if no HTML provided
    const htmlBody = payload.html || `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #374151; background: #f9fafb; margin:0; padding:0; }
  .wrap { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 8px; overflow:hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .header { background: linear-gradient(135deg,#0a2558,#1a3a6b); padding: 20px 28px; }
  .header h1 { color:#fff; font-size:18px; margin:0; font-weight:800; }
  .header p  { color:rgba(255,255,255,0.6); font-size:11px; margin:4px 0 0; }
  .body { padding: 28px; }
  .body pre { white-space: pre-wrap; font-family: 'Segoe UI',Arial,sans-serif; font-size:14px; line-height:1.75; color:#374151; margin:0; }
  .footer { padding: 16px 28px; background: #f9fafb; border-top: 1px solid #e5e7eb; font-size:11px; color:#9ca3af; text-align:center; }
</style></head>
<body>
  <div class="wrap">
    <div class="header">
      <h1>EL5 MediProcure</h1>
      <p>Embu Level 5 Hospital · Embu County Government</p>
    </div>
    <div class="body">
      <pre>${payload.body.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>
    </div>
    <div class="footer">
      Embu Level 5 Hospital, Embu Town, Kenya &nbsp;·&nbsp; +254 060 000000<br/>
      This is an automated message from EL5 MediProcure. Please do not reply to this address directly.
    </div>
  </div>
</body></html>`;

    // Use Deno's built-in SMTP via fetch to a relay, or use nodemailer-compatible approach
    // Since Deno Deploy doesn't have raw TCP, we use the SMTP API approach
    // Encode credentials for Basic auth
    const credentials = btoa(`${smtpUser}:${smtpPass}`);
    
    const results: { to: string; success: boolean; error?: string }[] = [];
    
    for (const toEmail of toList) {
      try {
        // Build RFC 2822 message
        const boundary = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const date = new Date().toUTCString();
        
        const headers = [
          `From: ${fromName} <${fromEmail}>`,
          `To: ${toEmail}`,
          payload.cc  ? `CC: ${payload.cc}`  : null,
          payload.bcc ? `BCC: ${payload.bcc}` : null,
          `Subject: ${payload.subject}`,
          `Date: ${date}`,
          `MIME-Version: 1.0`,
          `Content-Type: multipart/alternative; boundary="${boundary}"`,
          `X-Priority: ${payload.priority === 'urgent' ? '1' : payload.priority === 'high' ? '2' : '3'}`,
          `X-Mailer: EL5-MediProcure/3.0`,
        ].filter(Boolean).join("\r\n");

        const rawMessage = [
          headers,
          "",
          `--${boundary}`,
          "Content-Type: text/plain; charset=UTF-8",
          "Content-Transfer-Encoding: quoted-printable",
          "",
          payload.body,
          "",
          `--${boundary}`,
          "Content-Type: text/html; charset=UTF-8",
          "Content-Transfer-Encoding: base64",
          "",
          btoa(unescape(encodeURIComponent(htmlBody))),
          "",
          `--${boundary}--`,
        ].join("\r\n");

        // Try to send via SMTP using fetch-based relay
        // For Google SMTP (OAuth2) or standard SMTP, we need to proxy through a proper client
        // In production: use SendGrid, Mailgun, or Resend API as fallback
        
        // Try Resend API if key is provided (recommended approach for Deno Deploy)
        const resendKey = Deno.env.get("RESEND_API_KEY");
        const mailgunKey = Deno.env.get("MAILGUN_API_KEY");
        const mailgunDomain = Deno.env.get("MAILGUN_DOMAIN");
        const sendgridKey = Deno.env.get("SENDGRID_API_KEY");

        let sent = false;
        let sendError = "";

        if (resendKey) {
          // Resend API
          const r = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: `${fromName} <${fromEmail}>`,
              to: [toEmail],
              cc: payload.cc ? payload.cc.split(",").map(e=>e.trim()) : undefined,
              bcc: payload.bcc ? payload.bcc.split(",").map(e=>e.trim()) : undefined,
              subject: payload.subject,
              text: payload.body,
              html: htmlBody,
            })
          });
          if (r.ok) { sent = true; }
          else { const d = await r.json(); sendError = d.message || "Resend API error"; }

        } else if (sendgridKey) {
          // SendGrid API
          const r = await fetch("https://api.sendgrid.com/v3/mail/send", {
            method: "POST",
            headers: { "Authorization": `Bearer ${sendgridKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              personalizations: [{ to: [{ email: toEmail }] }],
              from: { email: fromEmail, name: fromName },
              subject: payload.subject,
              content: [
                { type: "text/plain", value: payload.body },
                { type: "text/html",  value: htmlBody },
              ],
            })
          });
          if (r.status === 202) { sent = true; }
          else { const t = await r.text(); sendError = `SendGrid: ${r.status} ${t}`; }

        } else if (mailgunKey && mailgunDomain) {
          // Mailgun API
          const form = new FormData();
          form.append("from",    `${fromName} <mailgun@${mailgunDomain}>`);
          form.append("to",      toEmail);
          form.append("subject", payload.subject);
          form.append("text",    payload.body);
          form.append("html",    htmlBody);
          if (payload.cc)  form.append("cc",  payload.cc);
          if (payload.bcc) form.append("bcc", payload.bcc);
          const r = await fetch(`https://api.mailgun.net/v3/${mailgunDomain}/messages`, {
            method: "POST",
            headers: { "Authorization": `Basic ${btoa("api:" + mailgunKey)}` },
            body: form,
          });
          if (r.ok) { sent = true; }
          else { const t = await r.text(); sendError = `Mailgun: ${r.status} ${t}`; }

        } else {
          // No email provider configured — log as "simulated" for testing
          console.log(`[SIMULATED EMAIL] To: ${toEmail}, Subject: ${payload.subject}`);
          sent = true; // Mark as sent for development/testing
          sendError = "SIMULATED (no email provider configured — set RESEND_API_KEY, SENDGRID_API_KEY, or MAILGUN_API_KEY)";
        }

        results.push({ to: toEmail, success: sent, error: sent ? sendError || undefined : sendError });
      } catch (err: any) {
        results.push({ to: toEmail, success: false, error: err.message });
      }
    }

    const allSuccess = results.every(r => r.success);
    
    return new Response(
      JSON.stringify({
        success: allSuccess,
        partial: !allSuccess && results.some(r => r.success),
        results,
        timestamp: new Date().toISOString(),
        provider: Deno.env.get("RESEND_API_KEY") ? "resend" : 
                  Deno.env.get("SENDGRID_API_KEY") ? "sendgrid" :
                  Deno.env.get("MAILGUN_API_KEY") ? "mailgun" : "simulated",
      }),
      { status: allSuccess ? 200 : 207, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
