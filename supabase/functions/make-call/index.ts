// MediProcure — Twilio Voice Call via Connector Gateway
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { to, message, twimlUrl } = await req.json();
    if (!to) {
      return new Response(JSON.stringify({ ok: false, error: "to required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    const FROM = Deno.env.get("TWILIO_FROM_NUMBER");
    if (!LOVABLE_API_KEY || !TWILIO_API_KEY || !FROM) {
      return new Response(JSON.stringify({ ok: false, error: "Voice not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const body = new URLSearchParams({ To: to, From: FROM });
    if (twimlUrl) {
      body.set("Url", twimlUrl);
    } else {
      const text = message || "This is an automated notification from MediProcure.";
      const twiml = `<Response><Say voice="alice">${text.replace(/[<>&]/g, "")}</Say></Response>`;
      body.set("Twiml", twiml);
    }
    const res = await fetch(`https://connector-gateway.lovable.dev/twilio/Calls.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const data = await res.json();
    return new Response(JSON.stringify({ ok: res.ok, sid: data.sid, twilio: data }),
      { status: res.ok ? 200 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});