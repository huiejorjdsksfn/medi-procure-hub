/**
 * EL5 MediProcure — google-forms-api Edge Function v3.1
 * v3.1: Anti-replay guard (x-el5-nonce / x-el5-ts headers, optional) —
 * prevents a captured/replayed create_form request from publishing
 * duplicate Google Forms.
 * Creates real Google Forms via Google Forms API (OAuth2 service account)
 * Falls back to pre-filled Google Forms create URL if credentials unavailable
 * Sender / editor account: hpdeskg9@gmail.com
 * EL5 MediProcure · Embu Level 5 Hospital · Embu County Government
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FORMS_SA_JSON = Deno.env.get("GOOGLE_FORMS_SERVICE_ACCOUNT_JSON") || "";
const FORMS_OAUTH   = Deno.env.get("GOOGLE_FORMS_OAUTH_TOKEN") || "";
const SENDER_EMAIL  = "hpdeskg9@gmail.com";
const HOSPITAL      = "Embu Level 5 Hospital";
const SYSTEM        = "EL5 MediProcure";
const PORTAL        = "https://procurbosse.edgeone.app";
const VERSION       = "v3.1";

const db = createClient(SUPABASE_URL, SERVICE_KEY);

const ALLOWED_ROLES = ["admin", "database_admin", "webmaster", "superadmin", "procurement_officer", "procurement_manager", "finance_manager"];

/** Verifies the caller's JWT and that they hold a role in user_roles —
 *  the app's authoritative role table (see is_admin()) — that's allowed
 *  to publish real Google Forms under the hospital's account. Previously
 *  this function had no authorization of its own — any authenticated
 *  user could call it directly and create/list forms. */
async function authorize(req: Request): Promise<{ userId: string; role: string } | null> {
  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const { data: { user } } = await db.auth.getUser(token);
  if (!user) return null;
  const { data: roles } = await db.from("user_roles").select("role").eq("user_id", user.id);
  const match = (roles || []).map((r: any) => r.role).find((r: string) => ALLOWED_ROLES.includes(r));
  if (!match) return null;
  return { userId: user.id, role: match };
}

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
  if (error) return { ok: false, error: "Duplicate request (replay detected) — form already created" };
  return { ok: true };
}

async function getGoogleToken(): Promise<string | null> {
  if (FORMS_OAUTH) return FORMS_OAUTH;
  if (!FORMS_SA_JSON) return null;
  try {
    const sa = JSON.parse(FORMS_SA_JSON);
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: "RS256", typ: "JWT" };
    const claim = {
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/forms.body https://www.googleapis.com/auth/drive.file",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
      sub: SENDER_EMAIL,
    };
    const enc = (obj: object) => btoa(JSON.stringify(obj)).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
    const headerB64 = enc(header);
    const claimB64  = enc(claim);
    const unsigned  = `${headerB64}.${claimB64}`;
    const keyDer = sa.private_key.replace("-----BEGIN PRIVATE KEY-----","").replace("-----END PRIVATE KEY-----","").replace(/\s/g,"");
    const keyBin = Uint8Array.from(atob(keyDer), c => c.charCodeAt(0));
    const key = await crypto.subtle.importKey("pkcs8", keyBin.buffer, { name:"RSASSA-PKCS1-v1_5", hash:"SHA-256" }, false, ["sign"]);
    const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
    const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
    const jwt = `${unsigned}.${sigB64}`;
    const r = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }).toString(),
    });
    const d = await r.json();
    return d.access_token || null;
  } catch (e) {
    console.error("Google token error:", e);
    return null;
  }
}

function inferFieldType(label: string): { type: string; options?: string[] } {
  const l = label.toLowerCase();
  if (l.includes("rating") || l.includes("score") || l.includes("1–5") || l.includes("1-5") || l.includes("0–10") || l.includes("0-10")) return { type: "SCALE" };
  if (l.includes("yes/no") || l.includes("yes or no")) return { type: "RADIO", options: ["Yes", "No"] };
  if (l.includes("(good/damaged/partial)") || l.includes("(good / damaged / partial)")) return { type: "RADIO", options: ["Good", "Damaged", "Partial"] };
  if (l.includes("approve") || l.includes("award/reject")) return { type: "RADIO", options: ["Approve", "Reject"] };
  if (l.includes("date") || l.includes("time")) return { type: "DATE" };
  if (l.includes("comments") || l.includes("suggestions") || l.includes("notes") || l.includes("issues") || l.includes("list") || l.includes("description")) return { type: "PARAGRAPH_TEXT" };
  return { type: "SHORT_ANSWER" };
}

function buildFormBody(title: string, description: string, fields: string[], formId: string) {
  const items = fields.map((label, index) => {
    const { type, options } = inferFieldType(label);
    const question: Record<string, unknown> = { required: true };
    if (type === "SHORT_ANSWER") question.textQuestion = { paragraph: false };
    else if (type === "PARAGRAPH_TEXT") question.textQuestion = { paragraph: true };
    else if (type === "SCALE") question.scaleQuestion = { low: 1, high: 5, lowLabel: "Poor", highLabel: "Excellent" };
    else if (type === "RADIO" && options) question.choiceQuestion = { type: "RADIO", options: options.map(o => ({ value: o })), shuffle: false };
    else if (type === "DATE") question.dateQuestion = { includeTime: false, includeYear: true };
    else question.textQuestion = { paragraph: false };
    return { title: `${index + 1}. ${label}`, description: "", questionItem: { question } };
  });
  return {
    info: {
      title: `[${formId}] ${title}`,
      description: [description, "", `━━━━━━━━━━━━━━━━━━━━━━━━━━`, `🏥 ${SYSTEM} · ${HOSPITAL}`, `Embu County Government · Health Procurement ERP`, `Form ID: ${formId}`, `Issued by: ${SENDER_EMAIL}`, `Portal: ${PORTAL}`, `Version: ${VERSION}`, `━━━━━━━━━━━━━━━━━━━━━━━━━━`, `All responses are recorded in the ${SYSTEM} ERP system.`].join("\n"),
    },
    items,
  };
}

async function createGoogleForm(title: string, description: string, fields: string[], formId: string, token: string): Promise<{ ok: boolean; formUrl?: string; editUrl?: string; previewUrl?: string; formApiId?: string; error?: string }> {
  try {
    const body = buildFormBody(title, description, fields, formId);
    const createRes = await fetch("https://forms.googleapis.com/v1/forms", {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ info: body.info }),
    });
    if (!createRes.ok) {
      const err = await createRes.text();
      console.error("Forms API create error:", err);
      return { ok: false, error: `Forms API: ${createRes.status} ${err.slice(0, 200)}` };
    }
    const created = await createRes.json();
    const apiFormId = created.formId;
    const requests = body.items.map(item => ({ createItem: { item, location: { index: 0 } } }));
    if (requests.length > 0) {
      await fetch(`https://forms.googleapis.com/v1/forms/${apiFormId}:batchUpdate`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ requests: requests.reverse() }),
      });
    }
    await fetch(`https://forms.googleapis.com/v1/forms/${apiFormId}:batchUpdate`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ requests: [{ updateSettings: { settings: { quizSettings: { isQuiz: false } }, updateMask: "quizSettings.isQuiz" } }] }),
    });
    const formUrl  = `https://docs.google.com/forms/d/${apiFormId}/viewform`;
    const editUrl  = `https://docs.google.com/forms/d/${apiFormId}/edit`;
    const previewUrl = `https://docs.google.com/forms/d/e/${apiFormId}/viewform`;
    return { ok: true, formUrl, editUrl, previewUrl, formApiId: apiFormId };
  } catch (e: any) {
    console.error("createGoogleForm error:", e);
    return { ok: false, error: e.message };
  }
}

function fallbackFormUrl(title: string, formId: string): string {
  return `https://docs.google.com/forms/create?title=${encodeURIComponent(`[${formId}] ${title} — ${HOSPITAL}`)}`;
}

async function saveFormToDb(formId: string, title: string, description: string, fields: string[], formUrl: string, editUrl: string | undefined, method: string, formApiId?: string) {
  try {
    const { error } = await db.from("google_forms").insert({
      form_id: formId, title, description, fields: JSON.stringify(fields),
      form_url: formUrl, edit_url: editUrl || formUrl, form_api_id: formApiId || null,
      method, sender_email: SENDER_EMAIL, status: "published",
      created_at: new Date().toISOString(), published_at: new Date().toISOString(),
    });
    if (error) {
      await db.from("audit_logs").insert({
        action: "google_form_published",
        details: JSON.stringify({ formId, title, formUrl, editUrl, formApiId, method, fields: fields.length, senderEmail: SENDER_EMAIL }),
        created_at: new Date().toISOString(),
      });
    }
  } catch {
    await db.from("audit_logs").insert({
      action: "google_form_published",
      details: JSON.stringify({ formId, title, formUrl, editUrl, formApiId, method, fields: fields.length }),
      created_at: new Date().toISOString(),
    });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  if (req.method === "POST") {
    const auth = await authorize(req);
    if (!auth) {
      return new Response(JSON.stringify({ ok: false, error: "forbidden: an admin/procurement/finance role is required to publish or manage Google Forms" }), { status: 403, headers: CORS });
    }
    const replay = await checkReplay(req);
    if (!replay.ok) return new Response(JSON.stringify({ ok: false, error: replay.error }), { status: 409, headers: CORS });
  }

  try {
    const body = await req.json();
    const { action, title, description, fields = [], formId, senderEmail } = body;

    if (action === "create_form") {
      const finalFormId = formId || `EL5-FORM-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      await db.from("audit_logs").insert({
        action: "google_form_create_attempt",
        details: `Google Form requested: [${finalFormId}] ${title} (${fields.length} fields) by ${senderEmail || SENDER_EMAIL}`,
        created_at: new Date().toISOString(),
      }).then(() => {});

      const token = await getGoogleToken();
      let result: { ok: boolean; formUrl?: string; editUrl?: string; previewUrl?: string; formApiId?: string; error?: string } = { ok: false, error: "No provider" };
      let method = "none";

      if (token) {
        result = await createGoogleForm(title, description || "", fields, finalFormId, token);
        method = "google_forms_api";
      }
      if (!result.ok) {
        const url = fallbackFormUrl(title, finalFormId);
        result = { ok: true, formUrl: url, editUrl: url, previewUrl: url };
        method = "fallback_create_url";
      }

      await saveFormToDb(finalFormId, title, description || "", fields, result.formUrl!, result.editUrl, method, result.formApiId);
      await db.from("audit_logs").insert({
        action: "google_form_published",
        details: `Google Form PUBLISHED: [${finalFormId}] ${title} → ${result.formUrl}`,
        created_at: new Date().toISOString(),
      }).then(() => {});

      return new Response(JSON.stringify({
        ok: true, formUrl: result.formUrl, editUrl: result.editUrl, previewUrl: result.previewUrl,
        formApiId: result.formApiId, formId: finalFormId, title, description, fields,
        senderEmail: SENDER_EMAIL, method, status: "published",
        note: method === "fallback_create_url" ? "Set GOOGLE_FORMS_SERVICE_ACCOUNT_JSON or GOOGLE_FORMS_OAUTH_TOKEN in Supabase secrets for real form creation" : undefined,
      }), { headers: CORS });
    }

    if (action === "list_forms") {
      let forms: any[] = [];
      try {
        const { data } = await db.from("google_forms").select("*").order("created_at", { ascending: false }).limit(50);
        if (data) forms = data;
      } catch {
        const { data } = await db.from("audit_logs").select("*").eq("action", "google_form_published").order("created_at", { ascending: false }).limit(50);
        forms = (data || []).map((r: any) => ({ form_id: JSON.parse(r.details || "{}").formId, title: JSON.parse(r.details || "{}").title, created_at: r.created_at }));
      }
      return new Response(JSON.stringify({ ok: true, forms }), { headers: CORS });
    }

    if (action === "status") {
      const token = await getGoogleToken();
      return new Response(JSON.stringify({ ok: true, sender: SENDER_EMAIL, has_service_account: !!FORMS_SA_JSON, has_oauth_token: !!FORMS_OAUTH, api_ready: !!token, version: VERSION }), { headers: CORS });
    }

    return new Response(JSON.stringify({ ok: false, error: "Unknown action. Use: create_form, list_forms, status" }), { status: 400, headers: CORS });
  } catch (e: any) {
    console.error("google-forms-api error:", e);
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: CORS });
  }
});
