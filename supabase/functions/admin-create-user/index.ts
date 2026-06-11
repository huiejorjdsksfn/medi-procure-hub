/**
 * admin-create-user v11 — fixed getClaims→getUser
 * Creates auth user + profile + RBAC roles in one call.
 * Caller must be admin/superadmin/webmaster.
 */
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ROLE_PAGES: Record<string, string[]> = {
  superadmin: ["*"],
  admin: ["*"],
  webmaster: ["*"],
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
  if (req.method === "OPTIONS") return json({ ok: true }, 200);
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const url = mustEnv("SUPABASE_URL");
    const anon = mustEnv("SUPABASE_ANON_KEY");
    const service = mustEnv("SUPABASE_SERVICE_ROLE_KEY");

    // FIX: use getUser() — getClaims() does not exist in supabase-js v2
    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user?.id) return json({ error: "Invalid token" }, 401);
    const callerId = userData.user.id;

    const admin = createClient(url, service, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: callerRoles, error: callerErr } = await admin
      .from("user_roles").select("role").eq("user_id", callerId);
    if (callerErr) return json({ error: `Role lookup: ${callerErr.message}` }, 500);

    const callerOk = (callerRoles || []).some((r: any) =>
      ["admin", "superadmin", "webmaster"].includes(r.role)
    );
    if (!callerOk) return json({ error: "Forbidden: admin tier required" }, 403);

    const body = await req.json();
    const { email, password, full_name, phone, department } = body;
    if (!email || !password) return json({ error: "email and password required" }, 400);
    if (password.length < 8) return json({ error: "password must be 8+ chars" }, 400);

    const roleList = normalizeRoles(body.roles);
    const pages = pagesForRoles(roleList);
    const displayName = full_name || String(email).split("@")[0];
    const now = new Date().toISOString();

    // Create auth user
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: displayName, department: department || null },
      app_metadata: { roles: roleList, pages, is_active: true },
    });
    if (createErr || !created?.user) {
      return json({ error: createErr?.message || "create failed" }, 400);
    }
    const newId = created.user.id;

    // Ensure active + no ban
    await admin.auth.admin.updateUserById(newId, {
      email_confirm: true,
      ban_duration: "none",
      app_metadata: { roles: roleList, pages, is_active: true },
    });

    // Upsert profile
    const { error: profileErr } = await admin.from("profiles").upsert({
      id: newId, email, full_name: displayName,
      phone_number: phone || null, department: department || null,
      is_active: true, is_locked: false, failed_logins: 0,
      created_at: now, updated_at: now,
    }, { onConflict: "id" });
    if (profileErr) {
      return json({ error: `profile failed: ${profileErr.message}`, user_id: newId }, 207);
    }

    // Assign roles
    await admin.from("user_roles").delete().eq("user_id", newId);
    const roleRows = roleList.map((role: string) => ({
      user_id: newId, role,
      label: roleLabel(role),
      granted_by: callerId, granted_at: now,
    }));
    const { error: roleErr } = await admin.from("user_roles").insert(roleRows);
    if (roleErr) {
      return json({ error: `role assignment failed: ${roleErr.message}`, user_id: newId }, 207);
    }

    // Best-effort page grants
    await bestEffortPageGrant(admin, newId, pages, callerId, now);

    // Audit
    const audit = await insertAudit(admin, {
      action: "create_user", module: "users", table_name: "profiles",
      record_id: newId, user_id: callerId,
      details: { roles: roleList, pages, created_id: newId, active: true },
      new_values: { id: newId, email, roles: roleList, pages, is_active: true },
      created_at: now,
    });

    return json({
      ok: true, user_id: newId, email,
      active: true, email_confirmed: true,
      roles: roleList, pages, audit: audit.inserted,
    });

  } catch (e: any) {
    return json({ error: e?.message || "internal error" }, 500);
  }
});

function normalizeRoles(input: unknown): string[] {
  const roles = Array.isArray(input) && input.length ? input : ["requisitioner"];
  const unique = [...new Set(roles.map(String).map((r: string) => r.trim()).filter(Boolean))];
  const invalid = unique.filter((r: string) => !VALID_ROLES.has(r));
  if (invalid.length) throw new Error(`invalid role(s): ${invalid.join(", ")}`);
  return unique;
}

function pagesForRoles(roles: string[]) {
  if (roles.some((r: string) => ROLE_PAGES[r]?.includes("*"))) return ["*"];
  return [...new Set(roles.flatMap((r: string) => ROLE_PAGES[r] || []))].sort();
}

function roleLabel(role: string) {
  return role.split("_").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

async function bestEffortPageGrant(
  admin: any, userId: string, pages: string[], callerId: string, now: string
) {
  for (const table of ["user_pages", "user_page_access", "page_access"]) {
    try {
      const { error } = await admin.from(table).upsert(
        pages.map((page: string) => ({
          user_id: userId, page, allowed: true, granted_by: callerId, granted_at: now,
        })),
        { onConflict: "user_id,page" },
      );
      if (!error) return table;
    } catch (_) { /* optional table */ }
  }
}

async function insertAudit(admin: any, payload: Record<string, unknown>) {
  for (const table of ["audit_log", "audit_logs"]) {
    for (const row of [
      payload,
      { action: payload.action, module: payload.module, user_id: payload.user_id, details: payload.details, created_at: payload.created_at },
    ]) {
      const { error } = await admin.from(table).insert(row);
      if (!error) return { table, inserted: true };
    }
  }
  return { table: null, inserted: false };
}

function mustEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} not configured`);
  return value;
}

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
