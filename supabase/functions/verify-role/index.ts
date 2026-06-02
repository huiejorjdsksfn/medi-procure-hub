/**
 * ProcurBosse verify-role v1.0
 * Uses Twilio Verify Service VA692606d4faea3c18432a857f111dbfad
 * Sends OTP to verify a user's phone for role changes/sensitive actions
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

const sb = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const ACCT    = Deno.env.get("TWILIO_ACCOUNT_SID")         || "ACe96c6e0e5edd4de5f5a4c6d9cc7b7c5a";
const AUTH    = Deno.env.get("TWILIO_AUTH_TOKEN")          || "d73601fbefe26e01b06e22c53a798ea6";
const VA_SID  = Deno.env.get("TWILIO_VERIFY_SERVICE_SID")  || "VA692606d4faea3c18432a857f111dbfad"; // Verify Service

function e164(raw: string): string {
  const n = String(raw || "").replace(/[\s\-\(\)\.]/g, "");
  if (!n) return "";
  if (n.startsWith("07") || n.startsWith("01")) return "+254" + n.slice(1);
  if (n.startsWith("254") && !n.startsWith("+")) return "+" + n;
  if (!n.startsWith("+")) return "+254" + n;
  return n;
}

// Send OTP via Twilio Verify
async function sendOTP(phone: string, channel: "sms" | "whatsapp" = "sms"): Promise<{ ok: boolean; status?: string; error?: string }> {
  const resp = await fetch(
    `https://verify.twilio.com/v2/Services/${VA_SID}/Verifications`,
    {
      method: "POST",
      headers: {
        "Authorization": "Basic " + btoa(`${ACCT}:${AUTH}`),
        "Content-Type":  "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: phone, Channel: channel }).toString(),
    }
  );
  const d = await resp.json();
  if (!resp.ok) return { ok: false, error: `${d.code}: ${d.message}` };
  return { ok: true, status: d.status };
}

// Verify OTP code
async function checkOTP(phone: string, code: string): Promise<{ ok: boolean; valid: boolean; error?: string }> {
  const resp = await fetch(
    `https://verify.twilio.com/v2/Services/${VA_SID}/VerificationCheck`,
    {
      method: "POST",
      headers: {
        "Authorization": "Basic " + btoa(`${ACCT}:${AUTH}`),
        "Content-Type":  "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: phone, Code: code }).toString(),
    }
  );
  const d = await resp.json();
  if (!resp.ok) return { ok: false, valid: false, error: `${d.code}: ${d.message}` };
  return { ok: true, valid: d.status === "approved" };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { action, phone, code, channel = "sms", user_id, role } = await req.json();
    const num = e164(phone);
    if (!num) return new Response(JSON.stringify({ ok: false, error: "Invalid phone number" }),
      { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });

    if (action === "send") {
      const r = await sendOTP(num, channel);
      if (r.ok && user_id) {
        await sb.from("audit_logs").insert({
          action: "verify_otp_sent", table_name: "users",
          record_id: user_id, changes: { phone: num, channel },
          created_at: new Date().toISOString(),
        });
      }
      return new Response(JSON.stringify({ ok: r.ok, status: r.status, error: r.error, va_sid: VA_SID.slice(0,10)+"..." }),
        { headers: { ...CORS, "Content-Type": "application/json" } });
    }

    if (action === "check") {
      if (!code) return new Response(JSON.stringify({ ok: false, error: "Code required" }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
      const r = await checkOTP(num, code);
      if (r.valid && user_id && role) {
        // Mark role as verified in profile
        await sb.from("profiles").update({ phone_verified: true, phone_number: num })
          .eq("id", user_id);
        await sb.from("audit_logs").insert({
          action: "verify_otp_approved", table_name: "users",
          record_id: user_id, changes: { phone: num, role, verified: true },
          created_at: new Date().toISOString(),
        });
      }
      return new Response(JSON.stringify({ ok: r.ok, valid: r.valid, error: r.error }),
        { headers: { ...CORS, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: false, error: "action must be send or check" }),
      { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });

  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});
