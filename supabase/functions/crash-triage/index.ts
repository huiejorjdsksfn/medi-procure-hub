/**
 * EL5 MediProcure — Crash Triage Edge Function v1.0
 * Fire-and-forget enrichment called by crashReporter.ts right after it
 * inserts a raw crash row. Uses Claude Haiku to classify severity/category
 * and write a one-line plain-English summary, so CrashReportsPage doesn't
 * make an admin read a raw stack trace to know if something matters.
 * Never blocks or breaks crash capture itself — that already happened via
 * the direct client insert before this is even called.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";

const db = createClient(SUPABASE_URL, SERVICE_KEY);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

async function classify(message: string, stack: string, path: string): Promise<{ severity: string; category: string; summary: string } | null> {
  if (!ANTHROPIC_KEY) return null;
  const system = `You triage frontend crash reports for a hospital procurement ERP (React/TypeScript/Supabase). Reply with ONLY valid JSON, no markdown fences, no explanation, matching exactly:
{"severity":"<critical|high|medium|low>","category":"<one of: Network, Auth, Null Reference, Type Error, Rendering, Data/Query, Permissions, Third-Party, Unknown>","summary":"<one plain-English sentence a non-developer admin can understand — what broke and roughly why, not a restatement of the stack trace>"}
severity guide: critical = blocks a core workflow entirely (payments, requisitions, login) or risks data loss; high = a whole page/feature unusable; medium = a specific action fails but the page still works; low = cosmetic or a single edge case.`;
  const prompt = `Path: ${path || "unknown"}\nMessage: ${message}\nStack (first 1500 chars): ${(stack || "no stack available").slice(0, 1500)}`;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 200, system, messages: [{ role: "user", content: prompt }] }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    const raw = d.content?.[0]?.text || "";
    return JSON.parse(raw.replace(/^```json\s*|```\s*$/g, "").trim());
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const { crash_id, message, stack, path } = await req.json();
    if (!crash_id || !message) {
      return new Response(JSON.stringify({ ok: false, error: "crash_id and message required" }), { status: 400, headers: CORS });
    }

    const result = await classify(message, stack || "", path || "");
    if (!result) {
      // No API key configured, or classification failed — leave the row
      // as-is rather than writing garbage. CrashReportsPage just shows
      // "not triaged" for these instead of a broken/fake label.
      return new Response(JSON.stringify({ ok: true, triaged: false }), { headers: CORS });
    }

    const { error } = await db.from("crash_reports").update({
      severity: result.severity, category: result.category, ai_summary: result.summary,
    }).eq("id", crash_id);
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, triaged: true, ...result }), { headers: CORS });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: CORS });
  }
});
