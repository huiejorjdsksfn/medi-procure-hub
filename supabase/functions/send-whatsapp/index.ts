// MediProcure — Twilio WhatsApp via Connector Gateway
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { to, message } = await req.json();
    if (!to || !message) {
      return new Response(JSON.stringify({ ok: false, error: "to and message required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    const FROM = Deno.env.get("TWILIO_WHATSAPP_FROM");
    if (!LOVABLE_API_KEY || !TWILIO_API_KEY || !FROM) {
      return new Response(JSON.stringify({ ok: false, error: "WhatsApp not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const fromNum = FROM.startsWith("whatsapp:") ? FROM : `whatsapp:${FROM}`;
    const toNum = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
    const res = await fetch(`https://connector-gateway.lovable.dev/twilio/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: toNum, From: fromNum, Body: message }),
    });
    const data = await res.json();
    return new Response(JSON.stringify({ ok: res.ok, sid: data.sid, twilio: data }),
      { status: res.ok ? 200 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});