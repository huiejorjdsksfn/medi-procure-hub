// MediProcure Hub — Twilio SMS Edge Function
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// SMS Message Templates for MediProcure events
const buildSmsBody = (event: string, data: Record<string, string>): string => {
  const templates: Record<string, string> = {
    requisition_submitted:  `[MediProcure] 📋 Requisition ${data.num} submitted by ${data.dept}. Awaiting approval.`,
    requisition_approved:   `[MediProcure] ✅ Requisition ${data.num} APPROVED by ${data.approver}. PO will be raised shortly.`,
    requisition_rejected:   `[MediProcure] ❌ Requisition ${data.num} REJECTED. Reason: ${data.reason}. Please revise and resubmit.`,
    requisition_pending:    `[MediProcure] ⏳ Requisition ${data.num} is pending your approval. Login to MediProcure to action.`,
    po_raised:              `[MediProcure] 📋 Purchase Order ${data.num} raised for ${data.supplier}. Expected delivery: ${data.eta ?? "TBC"}.`,
    po_sent:                `[MediProcure] 📤 Purchase Order ${data.num} sent to ${data.supplier}. Awaiting confirmation.`,
    goods_received:         `[MediProcure] 📦 Goods received for PO ${data.num}. Items: ${data.items}. GRN recorded.`,
    low_stock_alert:        `[MediProcure] ⚠️ LOW STOCK: ${data.item} — only ${data.qty} ${data.unit} remaining. Please raise a requisition.`,
    system_alert:           `[MediProcure] 🔔 ${data.message}`,
    custom:                 data.message ?? "",
  };
  return templates[event] ?? `[MediProcure] Update: ${event} — ${JSON.stringify(data)}`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const payload = await req.json();
    const { event, requisitionId, to, message, templateData = {} } = payload;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let smsBody = message ?? "";
    let recipient: string | null = to ?? null;

    // Auto-resolve requisition context
    if (requisitionId) {
      const { data: reqRow } = await supabase
        .from("requisitions")
        .select("requisition_number, requested_by, department_id, departments(name)")
        .eq("id", requisitionId)
        .maybeSingle();

      if (reqRow) {
        const num = (reqRow as any).requisition_number ?? requisitionId;
        const dept = (reqRow as any).departments?.name ?? "Unknown Dept";
        if (!smsBody) smsBody = buildSmsBody(event ?? "custom", { num, dept, ...templateData });

        if (!recipient) {
          const { data: prof } = await supabase
            .from("profiles").select("phone").eq("id", (reqRow as any).requested_by).maybeSingle();
          recipient = (prof as any)?.phone ?? null;
        }
      }
    } else if (!smsBody && event) {
      smsBody = buildSmsBody(event, templateData);
    }

    // Fallback
    if (!smsBody) smsBody = `[MediProcure] Notification: ${event ?? "update"}`;

    // Log attempt
    const { data: logRow } = await supabase.from("sms_log").insert({
      to_number: recipient ?? "unknown",
      message: smsBody,
      status: "queued",
      module: event ?? "custom",
      provider: "twilio",
    }).select().maybeSingle();

    // Twilio via Lovable Connector Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    const FROM = Deno.env.get("TWILIO_FROM_NUMBER");

    if (!LOVABLE_API_KEY || !TWILIO_API_KEY || !FROM) {
      return new Response(
        JSON.stringify({ ok: true, sent: false, reason: "Twilio gateway not configured — SMS logged only." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!recipient) {
      return new Response(
        JSON.stringify({ ok: true, sent: false, reason: "No recipient phone number." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send via Twilio Connector Gateway
    const twilioRes = await fetch(
      `https://connector-gateway.lovable.dev/twilio/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": TWILIO_API_KEY,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: recipient, From: FROM, Body: smsBody }),
      }
    );

    const twilioData = await twilioRes.json();

    // Update log
    if (logRow?.id) {
      await supabase.from("sms_log")
        .update({ status: twilioRes.ok ? "sent" : "failed", twilio_sid: twilioData.sid ?? null })
        .eq("id", logRow.id);
    }

    return new Response(
      JSON.stringify({ ok: twilioRes.ok, sid: twilioData.sid, twilio: twilioData }),
      { status: twilioRes.ok ? 200 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    console.error("send-sms error:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
