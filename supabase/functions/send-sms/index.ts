import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { event, requisitionId, to, message } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let body = message || `Requisition ${requisitionId ?? ""} ${event ?? "updated"}.`;
    let recipient = to;

    if (requisitionId && !recipient) {
      const { data: req } = await supabase
        .from("requisitions")
        .select("requisition_number, requested_by")
        .eq("id", requisitionId)
        .maybeSingle();
      if (req) {
        body = `Requisition ${req.requisition_number ?? requisitionId} has been ${event}.`;
        const { data: prof } = await supabase
          .from("profiles")
          .select("phone")
          .eq("id", req.requested_by)
          .maybeSingle();
        recipient = prof?.phone ?? null;
      }
    }

    // Always log the attempt
    await supabase.from("sms_log").insert({
      recipient: recipient ?? "unknown",
      message: body,
      status: "queued",
      event_type: event ?? null,
    }).select().maybeSingle().catch(() => null);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    const FROM = Deno.env.get("TWILIO_FROM_NUMBER");

    if (!LOVABLE_API_KEY || !TWILIO_API_KEY || !recipient || !FROM) {
      return new Response(
        JSON.stringify({ ok: true, sent: false, reason: "Twilio not configured; logged only" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const res = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: recipient, From: FROM, Body: body }),
    });
    const data = await res.json();
    return new Response(JSON.stringify({ ok: res.ok, twilio: data }), {
      status: res.ok ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});