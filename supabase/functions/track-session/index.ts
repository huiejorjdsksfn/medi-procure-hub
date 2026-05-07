/**
 * EL5 MediProcure v8.0 — track-session Edge Function
 * Handles live session heartbeats + user action logging
 * Embu Level 5 Hospital | Kenya
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { type, token, page, module: mod, action_type, action, entity_type, entity_id, metadata } = body;

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? req.headers.get("x-real-ip") ?? null;
    const userAgent = req.headers.get("user-agent") ?? null;

    if (type === "heartbeat" || type === "page_view") {
      // Upsert session
      const { data: sessionId, error: sessErr } = await supabase.rpc("upsert_session", {
        p_token: token ?? user.id,
        p_page: page ?? "/",
        p_module: mod ?? "dashboard",
        p_ip: ip,
        p_user_agent: userAgent,
      });

      if (sessErr) {
        console.error("Session upsert error:", sessErr);
      }

      // Log page_view action
      if (type === "page_view" && page) {
        await supabase.from("user_action_log").insert({
          user_id: user.id,
          session_id: sessionId ?? null,
          action_type: "page_view",
          module: mod ?? "dashboard",
          action: `Visited ${page}`,
          ip_address: ip,
          metadata: metadata ?? {},
        });
      }

      return new Response(JSON.stringify({ ok: true, session_id: sessionId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "action") {
      // Log user action
      const { error: logErr } = await supabase.from("user_action_log").insert({
        user_id: user.id,
        action_type: action_type ?? "click",
        module: mod ?? "unknown",
        action: action ?? "performed action",
        entity_type: entity_type ?? null,
        entity_id: entity_id ?? null,
        ip_address: ip,
        metadata: metadata ?? {},
      });

      if (logErr) console.error("Action log error:", logErr);

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "disconnect") {
      await supabase
        .from("user_sessions")
        .update({ status: "disconnected", disconnected_at: new Date().toISOString() })
        .eq("session_token", token ?? user.id)
        .eq("user_id", user.id);

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown type" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("track-session error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
