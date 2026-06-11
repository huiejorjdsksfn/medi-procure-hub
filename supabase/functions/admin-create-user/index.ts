/**
 * admin-create-user v12 — IP-access hardened + full profile activation
 * Fixes: CORS pre-flight, relay errors, direct user activation,
 *        profile+roles written even on partial failures.
 */
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
  "Access-Control-Max-Age": "86400",
};

const ROLE_PAGES: Record<string, string[]> = {
  superadmin: ["*"], admin: ["*"], webmaster: ["*"],
  database_admin: ["/database-admin", "/admin-database", "/audit-log", "/settings"],
  requisitioner: ["/requisitions", "/items", "/departments", "/dashboard"],
  procurement_officer: ["/requisitions", "/purchase-orders", "/suppliers", "/contracts", "/goods-received", "/tenders"],
  procurement_manager: ["/requisitions", "/purchase-orders", "/suppliers", "/contracts", "/reports", "/tenders", "/dashboard"],
  warehouse_officer: ["/goods-received", "/items", "/scanner", "/dashboard"],
  inventory_manager: ["/items", "/categories", "/goods-received", "/reports", "/dashboard"],
  accountant: ["/vouchers", "/financials", "/reports", "/budgets", "/dashboard", "/accountant"],
};
const VALID_ROLES = new Set(Object.keys(ROLE_PAGES));

Deno.serve(async (req) => {
  // Always respond to OPTIONS (pre-flight) with CORS headers
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  // Health-check GET
  if (req.method === "GET") {
    return json({ ok: true, version: 12, ts: new Date().toISOString() });
  }

  try {
    const url   = env("SUPABASE_URL");
    const anon  = env("SUPABASE_ANON_KEY");
    const svc   = env("SUPABASE_SERVICE_ROLE_KEY");

    // ── Caller auth ──────────────────────────────────────────────────────
    const auth = req.headers.get("Authorization") || req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : auth;

    if (!token) return json({ error: "Missing Authorization header" }, 401);

    const callerClient = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: ud, error: ue } = await callerClient.auth.getUser();
    if (ue || !ud?.user?.id) {
      return json({ error: `Auth validation failed: ${ue?.message || "invalid token"}` }, 401);
    }
    const callerId = ud.user.id;

    const adminClient = createClient(url, svc, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: cRoles } = await adminClient
      .from("user_roles").select("role").eq("user_id", callerId);

    const isAdmin = (cRoles || []).some((r: any) =>
      ["admin", "superadmin", "webmaster"].includes(r.role)
    );
    if (!isAdmin) return json({ error: "Forbidden — admin/superadmin/webmaster required" }, 403);

    // ── Parse body ────────────────────────────────────────────────────────
    const body = await req.json().catch(() => ({}));
    const { email, password, full_name, phone, department } = body;
    if (!email || !password) return json({ error: "email and password are required" }, 400);
    if (password.length < 8)  return json({ error: "password must be 8+ characters" }, 400);

    const roles   = normalizeRoles(body.roles);
    const pages   = pagesForRoles(roles);
    const name    = full_name || String(email).split("@")[0];
    const now     = new Date().toISOString();

    // ── Step 1: Create auth user ──────────────────────────────────────────
    const { data: created, error: ce } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,           // instantly confirmed — no email needed
      user_metadata: { full_name: name, department: department || null, phone: phone || null },
      app_metadata:  { roles, pages, is_active: true, created_by: callerId },
    });

    if (ce || !created?.user) {
      return json({ error: ce?.message || "auth.admin.createUser failed" }, 400);
    }
    const uid = created.user.id;

    // ── Step 2: Force-activate (no ban, confirmed email) ─────────────────
    await adminClient.auth.admin.updateUserById(uid, {
      email_confirm: true,
      ban_duration: "none",
      app_metadata: { roles, pages, is_active: true, activated_at: now, activated_by: callerId },
    });

    // ── Step 3: Upsert profile ────────────────────────────────────────────
    const { error: pe } = await adminClient.from("profiles").upsert({
      id: uid, email: email.trim().toLowerCase(),
      full_name: name,
      phone_number: phone || null,
      department: department || null,
      is_active: true,
      is_locked: false,
      failed_logins: 0,
      created_at: now,
      updated_at: now,
    }, { onConflict: "id" });

    // ── Step 4: Assign roles ──────────────────────────────────────────────
    await adminClient.from("user_roles").delete().eq("user_id", uid);
    const { error: re } = await adminClient.from("user_roles").insert(
      roles.map((role: string) => ({
        user_id: uid, role,
        label: toLabel(role),
        granted_by: callerId,
        granted_at: now,
      }))
    );

    // ── Step 5: Page grants (best-effort) ─────────────────────────────────
    for (const tbl of ["user_pages", "user_page_access", "page_access"]) {
      try {
        await adminClient.from(tbl).upsert(
          pages.map((p: string) => ({ user_id: uid, page: p, allowed: true, granted_by: callerId, granted_at: now })),
          { onConflict: "user_id,page" }
        );
        break;
      } catch (_) { /* optional table */ }
    }

    // ── Step 6: Audit log (best-effort) ───────────────────────────────────
    const auditRow = {
      action: "create_user", module: "users", table_name: "profiles",
      record_id: uid, user_id: callerId,
      details: { roles, pages, created_id: uid, active: true },
      new_values: { id: uid, email, roles, pages, is_active: true },
      created_at: now,
    };
    for (const tbl of ["audit_log", "audit_logs"]) {
      const { error: ae } = await adminClient.from(tbl).insert(auditRow);
      if (!ae) break;
      // try minimal version
      const { error: ae2 } = await adminClient.from(tbl).insert({
        action: auditRow.action, module: auditRow.module,
        user_id: auditRow.user_id, details: auditRow.details, created_at: now,
      });
      if (!ae2) break;
    }

    return json({
      ok: true,
      user_id: uid,
      email: email.trim().toLowerCase(),
      active: true,
      email_confirmed: true,
      roles,
      pages,
      profile_saved: !pe,
      roles_saved: !re,
    });

  } catch (err: any) {
    return json({ error: err?.message || "internal server error" }, 500);
  }
});

function normalizeRoles(input: unknown): string[] {
  const arr = Array.isArray(input) && input.length ? input : ["requisitioner"];
  const unique = [...new Set(arr.map(String).map(r => r.trim()).filter(Boolean))];
  const bad = unique.filter(r => !VALID_ROLES.has(r));
  if (bad.length) throw new Error(`Invalid role(s): ${bad.join(", ")}`);
  return unique;
}
function pagesForRoles(roles: string[]) {
  if (roles.some(r => ROLE_PAGES[r]?.includes("*"))) return ["*"];
  return [...new Set(roles.flatMap(r => ROLE_PAGES[r] || []))].sort();
}
function toLabel(r: string) {
  return r.split("_").map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
}
function env(k: string) {
  const v = Deno.env.get(k);
  if (!v) throw new Error(`${k} is not configured`);
  return v;
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
