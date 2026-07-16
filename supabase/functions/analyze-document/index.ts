/**
 * EL5 MediProcure — analyze-document Edge Function v1.0
 * Uploads a PDF or image (e.g. a supplier's business cert, an item
 * catalog page, a scanned invoice) and asks Claude to extract structured
 * field data matching a named target schema, so an admin can auto-fill
 * an "Add New" form instead of retyping everything by hand.
 *
 * Reuses the same ANTHROPIC_API_KEY secret already configured for
 * ai-agent. Requires an admin/procurement/finance role, same pattern as
 * mysql-proxy / google-forms-api.
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

const ALLOWED_ROLES = ["admin", "database_admin", "webmaster", "superadmin", "procurement_officer", "procurement_manager", "finance_officer", "finance_manager", "accountant"];
const MAX_BYTES = 15 * 1024 * 1024; // 15MB, matches Claude's per-file limit with margin

/** Verifies the caller's JWT and that they hold an allowed role in
 *  user_roles — the app's authoritative role table. */
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

// Target schemas: what fields to pull out for each "Add New" form this
// is wired into. Keep field names identical to the DB columns they'll
// be applied to on the client, so the frontend can map suggestions
// straight onto form state.
const SCHEMAS: Record<string, { label: string; fields: Record<string, string> }> = {
  supplier: {
    label: "Supplier",
    fields: {
      name: "Company / business name",
      contact_person: "Primary contact person's full name",
      email: "Email address",
      phone: "Phone number, formatted with country code if visible",
      address: "Physical/postal address",
      tax_pin: "KRA PIN or tax registration number",
      category: "What this supplier sells/supplies, one short category label",
      registration_number: "Business registration / certificate number, if present",
    },
  },
  item: {
    label: "Inventory Item",
    fields: {
      name: "Item/product name",
      sku: "SKU, part number, or catalog code",
      category: "Item category (e.g. Medical Consumables, Pharmaceuticals, Equipment)",
      unit: "Unit of measure (e.g. box, piece, carton, litre)",
      unit_price: "Unit price as a plain number, no currency symbol",
      description: "Short description or specification",
    },
  },
  requisition: {
    label: "Requisition",
    fields: {
      title: "A short title describing the request",
      department: "Requesting department, if shown",
      items: "Array of {name, quantity, unit} objects for every line item found",
      justification: "Reason/justification for the request, if present",
    },
  },
  purchase_order: {
    label: "Purchase Order",
    fields: {
      supplier_name: "Supplier/vendor name on the document",
      po_number: "PO or order number, if present",
      items: "Array of {name, quantity, unit_price} objects for every line item found",
      delivery_date: "Requested/expected delivery date, ISO format if determinable",
      total_amount: "Grand total as a plain number, no currency symbol",
    },
  },
};

async function callClaudeExtract(base64: string, mimeType: string, schema: { label: string; fields: Record<string,string> }): Promise<any> {
  const isPdf = mimeType === "application/pdf";
  const fieldList = Object.entries(schema.fields).map(([k, desc]) => `- "${k}": ${desc}`).join("\n");
  const system = `You are a document data extractor for a hospital procurement ERP. You will be shown a scanned document (a ${schema.label.toLowerCase()}-related PDF or image). Extract exactly these fields as a single JSON object and nothing else — no markdown fences, no commentary:
${fieldList}

Rules:
- If a field isn't present in the document, omit it from the JSON (don't guess or invent values).
- Return plain JSON only — your entire response must be valid JSON, parseable by JSON.parse().
- Numbers must be plain numbers (no currency symbols, no thousands separators).`;

  const content: any[] = [
    isPdf
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
      : { type: "image", source: { type: "base64", media_type: mimeType, data: base64 } },
    { type: "text", text: "Extract the fields as instructed. JSON only." },
  ];

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system,
      messages: [{ role: "user", content }],
    }),
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`Claude API ${r.status}: ${err.slice(0, 300)}`);
  }
  const data = await r.json();
  const text = (data.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n").trim();
  const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Model did not return valid JSON: " + cleaned.slice(0, 200));
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const auth = await authorize(req);
    if (!auth) {
      return new Response(JSON.stringify({ ok: false, error: "forbidden: an admin/procurement/finance role is required" }), { status: 403, headers: CORS });
    }
    if (!ANTHROPIC_KEY) {
      return new Response(JSON.stringify({ ok: false, error: "AI analysis is not configured (ANTHROPIC_API_KEY missing)" }), { status: 503, headers: CORS });
    }

    const body = await req.json();
    const { target, fileBase64, mimeType, fileName } = body;

    if (!target || !SCHEMAS[target]) {
      return new Response(JSON.stringify({ ok: false, error: `Unknown target "${target}". Valid: ${Object.keys(SCHEMAS).join(", ")}` }), { status: 400, headers: CORS });
    }
    if (!fileBase64 || !mimeType) {
      return new Response(JSON.stringify({ ok: false, error: "fileBase64 and mimeType are required" }), { status: 400, headers: CORS });
    }
    if (mimeType !== "application/pdf" && !mimeType.startsWith("image/")) {
      return new Response(JSON.stringify({ ok: false, error: "Only PDF or image files are supported" }), { status: 400, headers: CORS });
    }
    // base64 is ~4/3 the size of the raw bytes
    if (fileBase64.length * 0.75 > MAX_BYTES) {
      return new Response(JSON.stringify({ ok: false, error: "File too large (max 15MB)" }), { status: 400, headers: CORS });
    }

    const extracted = await callClaudeExtract(fileBase64, mimeType, SCHEMAS[target]);

    await db.from("audit_logs").insert({
      action: "ai_document_analyzed",
      details: JSON.stringify({ target, fileName: fileName || null, fieldsFound: Object.keys(extracted || {}), by: auth.userId }),
      created_at: new Date().toISOString(),
    }).then(() => {});

    return new Response(JSON.stringify({ ok: true, target, schema: SCHEMAS[target].fields, extracted }), { headers: CORS });
  } catch (e: any) {
    console.error("analyze-document error:", e);
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: CORS });
  }
});
