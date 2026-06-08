/**
 * admin-create-user — creates an active auth user, profile row, RBAC roles,
 * role-derived page permissions metadata, and immediate audit evidence in one call.
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
  accountant: ["/vouchers", "/financials", "/reports", "/budgets", "/dashboard"],
};

const VALID_ROLES = new Set(Object.keys(ROLE_PAGES));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const url = mustEnv("SUPABASE_URL");
    const anon = mustEnv("SUPABASE_ANON_KEY");
    const service = mustEnv("SUPABASE_SERVICE_ROLE_KEY");

    const token = auth.replace("Bearer ", "");
    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: claimsRes, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsRes?.claims?.sub) return json({ error: "Invalid token" }, 401);

    const callerId = claimsRes.claims.sub;
    const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });

    const { data: callerRoles, error: callerErr } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);
    if (callerErr) return json({ error: `Role lookup failed: ${callerErr.message}` }, 500);

    const callerOk = (callerRoles || []).some((r: any) => ["admin", "superadmin", "webmaster"].includes(r.role));
    if (!callerOk) return json({ error: "Forbidden: admin tier required" }, 403);

    const body = await req.json();
    const { email, password, full_name, phone, department } = body;
    if (!email || !password) return json({ error: "email and password required" }, 400);
    if (password.length < 8) return json({ error: "password must be 8+ chars" }, 400);

    const roleList = normalizeRoles(body.roles);
    const pages = pagesForRoles(roleList);
    const displayName = full_name || String(email).split("@")[0];

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: displayName, department: department || null },
      app_metadata: { roles: roleList, pages, is_active: true },
    });
    if (createErr || !created?.user) return json({ error: createErr?.message || "create failed" }, 400);

    const newId = created.user.id;
    const now = new Date().toISOString();

    const { error: activationErr } = await admin.auth.admin.updateUserById(newId, {
      email_confirm: true,
      ban_duration: "none",
      user_metadata: { full_name: displayName, department: department || null },
      app_metadata: { roles: roleList, pages, is_active: true },
    });
    if (activationErr) return json({ error: `user created but activation failed: ${activationErr.message}`, user_id: newId }, 207);

    const { error: profileErr } = await admin.from("profiles").upsert({
      id: newId,
      email,
      full_name: displayName,
      phone_number: phone || null,
      department: department || null,
      is_active: true,
      is_locked: false,
      failed_logins: 0,
      created_at: now,
      updated_at: now,
    }, { onConflict: "id" });
    if (profileErr) return json({ error: `user active but profile failed: ${profileErr.message}`, user_id: newId }, 207);

    await admin.from("user_roles").delete().eq("user_id", newId);
    const roleRows = roleList.map(role => ({ user_id: newId, role, label: roleLabel(role), granted_by: callerId, granted_at: now }));
    const { error: roleErr } = await admin.from("user_roles").insert(roleRows);
    if (roleErr) return json({ error: `user active but role assignment failed: ${roleErr.message}`, user_id: newId }, 207);

    await bestEffortPageGrant(admin, newId, pages, callerId, now);

    const auditPayload = {
      action: "create_user",
      module: "users",
      table_name: "profiles",
      record_id: newId,
      user_id: callerId,
      user_name: created.user.email,
      performed_by: callerId,
      details: { roles: roleList, pages, created_id: newId, active: true, email_confirmed: true },
      new_values: { id: newId, email, roles: roleList, pages, is_active: true },
      created_at: now,
    };
    const audit = await insertAudit(admin, auditPayload);

    const verification = await verifyCreatedUser(admin, newId, roleList, pages, audit.inserted);
    if (!verification.ok) return json({ error: "verification failed", user_id: newId, verification }, 207);

    return json({ ok: true, user_id: newId, email, active: true, email_confirmed: true, roles: roleList, pages, audit: audit.inserted, verification });
  } catch (e: any) {
    return json({ error: e?.message || "internal error" }, 500);
  }
});

function normalizeRoles(input: unknown): string[] {
  const roles = Array.isArray(input) && input.length ? input : ["requisitioner"];
  const unique = [...new Set(roles.map(String).map(r => r.trim()).filter(Boolean))];
  const invalid = unique.filter(r => !VALID_ROLES.has(r));
  if (invalid.length) throw new Error(`invalid role(s): ${invalid.join(", ")}`);
  return unique;
}

function pagesForRoles(roles: string[]) {
  if (roles.some(r => ROLE_PAGES[r]?.includes("*"))) return ["*"];
  return [...new Set(roles.flatMap(r => ROLE_PAGES[r] || []))].sort();
}

function roleLabel(role: string) {
  return role.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

async function bestEffortPageGrant(admin: any, userId: string, pages: string[], callerId: string, now: string) {
  for (const table of ["user_pages", "user_page_access", "page_access"]) {
    try {
      const { error } = await admin.from(table).upsert(
        pages.map(page => ({ user_id: userId, page, allowed: true, granted_by: callerId, granted_at: now })),
        { onConflict: "user_id,page" },
      );
      if (!error) return table;
    } catch (_) { /* optional table */ }
  }
  return null;
}

async function insertAudit(admin: any, payload: Record<string, unknown>) {
  const variants = [
    payload,
    { action: payload.action, module: payload.module, performed_by: payload.performed_by, user_name: payload.user_name, details: payload.details, created_at: payload.created_at },
    { action: payload.action, module: payload.module, user_id: payload.user_id, details: payload.details, created_at: payload.created_at },
    { action: payload.action, table_name: payload.table_name, performed_by: payload.performed_by, new_values: payload.new_values, created_at: payload.created_at },
  ];

  for (const table of ["audit_log", "audit_logs"]) {
    for (const row of variants) {
      const { error } = await admin.from(table).insert(row);
      if (!error) return { table, inserted: true };
    }
  }
  return { table: null, inserted: false };
}

async function verifyCreatedUser(admin: any, userId: string, roles: string[], pages: string[], auditInserted: boolean) {
  const { data: profile } = await admin.from("profiles").select("id,is_active").eq("id", userId).maybeSingle();
  const { data: assigned } = await admin.from("user_roles").select("role").eq("user_id", userId);
  const assignedRoles = (assigned || []).map((r: any) => r.role).sort();
  const expectedRoles = [...roles].sort();
  const rolesOk = JSON.stringify(assignedRoles) === JSON.stringify(expectedRoles);
  const activeOk = profile?.is_active === true;
  return { ok: activeOk && rolesOk && auditInserted, activeOk, rolesOk, auditInserted, assignedRoles, expectedRoles, pages };
}

function mustEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function json(b: any, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
