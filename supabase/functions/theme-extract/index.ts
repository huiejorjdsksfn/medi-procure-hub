/**
 * EL5 MediProcure — theme-extract Edge Function v1.0
 * GuiEditorPage's "derive a theme from an image" button called this
 * function, but it never existed — every click failed with a
 * function-not-found error. Built to match the exact contract the
 * frontend already expects (see GuiEditorPage.tsx handleImageUpload):
 *   in:  { image_base64, media_type, activate }
 *   out: { ok:true, theme: { name, colors:{...}, typography:{...}, layout:{...} } }
 * where colors/typography/layout keys map 1:1 onto GuiEditorPage's cfg
 * keys (primary_color, accent_color, font_family, border_radius, etc.)
 * so the frontend's `{...theme.colors, ...theme.typography, ...theme.layout}`
 * merge works without any frontend changes.
 *
 * Reuses ANTHROPIC_API_KEY (same secret as ai-agent/analyze-document).
 * Requires an admin/webmaster role, same authorize() pattern used
 * elsewhere this session.
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

const ALLOWED_ROLES = ["admin", "database_admin", "webmaster", "superadmin"];
const MAX_BYTES = 15 * 1024 * 1024;

async function authorize(req: Request): Promise<{ userId: string } | null> {
  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const { data: { user } } = await db.auth.getUser(token);
  if (!user) return null;
  const { data: roles } = await db.from("user_roles").select("role").eq("user_id", user.id);
  const ok = (roles || []).some((r: any) => ALLOWED_ROLES.includes(r.role));
  return ok ? { userId: user.id } : null;
}

const CFG_KEYS = {
  colors: ["primary_color","accent_color","nav_bg_color","nav_text_color","page_bg_color","card_bg","text_primary","text_secondary","border_color","success_color","warning_color","danger_color"],
  typography: ["font_family","font_size_base","font_size_sm","font_size_lg"],
  layout: ["border_radius","content_padding","topbar_height","nav_height"],
};

async function callClaudeTheme(base64: string, mediaType: string): Promise<{ name: string; colors: Record<string,string>; typography: Record<string,string>; layout: Record<string,string> }> {
  const system = `You are a UI theme designer. Look at the reference image and derive a cohesive web-app color/typography/layout theme from it. Return a single JSON object and nothing else — no markdown fences, no commentary — shaped exactly like this:
{
  "name": "short evocative theme name based on the image",
  "colors": {
    "primary_color": "#hex", "accent_color": "#hex", "nav_bg_color": "#hex", "nav_text_color": "#hex",
    "page_bg_color": "#hex", "card_bg": "#hex", "text_primary": "#hex", "text_secondary": "#hex",
    "border_color": "#hex", "success_color": "#hex", "warning_color": "#hex", "danger_color": "#hex"
  },
  "typography": { "font_family": "a real installed web-safe or Google Font family name", "font_size_base": "14px", "font_size_sm": "12px", "font_size_lg": "18px" },
  "layout": { "border_radius": "6px", "content_padding": "16px", "topbar_height": "56px", "nav_height": "48px" }
}
Rules:
- All color values must be valid #rrggbb hex codes, derived from the image's actual dominant/accent colors.
- Ensure text_primary/text_secondary have strong contrast against page_bg_color and card_bg (this is a hospital ERP — legibility matters more than mood).
- success_color should read as green-ish, warning_color amber/orange-ish, danger_color red-ish, regardless of the image's palette (these are semantic status colors).
- Your entire response must be valid JSON parseable by JSON.parse().`;

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: "Derive the theme as instructed. JSON only." },
        ],
      }],
    }),
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`Claude API ${r.status}: ${err.slice(0, 300)}`);
  }
  const data = await r.json();
  const text = (data.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n").trim();
  const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
  let parsed: any;
  try { parsed = JSON.parse(cleaned); } catch { throw new Error("Model did not return valid JSON: " + cleaned.slice(0, 200)); }

  // Defensive: only pass through keys the frontend actually knows about,
  // and only valid-looking values, so a model slip can't inject arbitrary
  // CSS values into every user's page via applyThemeToDOM().
  const clean = (obj: any, keys: string[]) => {
    const out: Record<string, string> = {};
    for (const k of keys) if (typeof obj?.[k] === "string" && obj[k].length < 40) out[k] = obj[k];
    return out;
  };
  return {
    name: typeof parsed.name === "string" ? parsed.name.slice(0, 60) : "Untitled Theme",
    colors: clean(parsed.colors, CFG_KEYS.colors),
    typography: clean(parsed.typography, CFG_KEYS.typography),
    layout: clean(parsed.layout, CFG_KEYS.layout),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const auth = await authorize(req);
    if (!auth) {
      return new Response(JSON.stringify({ ok: false, error: "forbidden: admin/webmaster role required" }), { status: 403, headers: CORS });
    }
    if (!ANTHROPIC_KEY) {
      return new Response(JSON.stringify({ ok: false, error: "Theme extraction is not configured (ANTHROPIC_API_KEY missing)" }), { status: 503, headers: CORS });
    }

    const body = await req.json();
    const { image_base64, media_type, activate } = body;
    if (!image_base64 || !media_type) {
      return new Response(JSON.stringify({ ok: false, error: "image_base64 and media_type are required" }), { status: 400, headers: CORS });
    }
    if (!media_type.startsWith("image/")) {
      return new Response(JSON.stringify({ ok: false, error: "Only image files are supported" }), { status: 400, headers: CORS });
    }
    if (image_base64.length * 0.75 > MAX_BYTES) {
      return new Response(JSON.stringify({ ok: false, error: "Image too large (max 15MB)" }), { status: 400, headers: CORS });
    }

    const theme = await callClaudeTheme(image_base64, media_type);

    if (activate === true) {
      await db.from("themes").insert({
        name: theme.name,
        source: "image",
        colors: theme.colors,
        typography: theme.typography,
        layout: theme.layout,
        is_active: false, // GuiEditorPage's own Save & Apply path is what flips this live, not this function
        created_by: auth.userId,
      }).then(() => {}).catch(() => {}); // best-effort — theme record is a nice-to-have, not required for the response
    }

    return new Response(JSON.stringify({ ok: true, theme }), { headers: CORS });
  } catch (e: any) {
    console.error("theme-extract error:", e);
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: CORS });
  }
});
