/**
 * admin-create-user — creates an auth user, profile row, and roles in one call.
 * Caller must be an admin/superadmin/webmaster (verified via has_any_role).
 */
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: claimsRes, error: claimsErr } = await userClient.auth.getClaims(auth.replace("Bearer ", ""));
    if (claimsErr || !claimsRes?.claims?.sub) return json({ error: "Invalid token" }, 401);

    const callerId = claimsRes.claims.sub;
    const admin = createClient(url, service);

    // Verify caller is admin tier
    const { data: callerRoles } = await admin
      .from("user_roles").select("role").eq("user_id", callerId);
    const ok = (callerRoles || []).some((r: any) =>
      ["admin","superadmin","webmaster"].includes(r.role));
    if (!ok) return json({ error: "Forbidden: admin tier required" }, 403);

    const body = await req.json();
    const { email, password, full_name, phone, department, roles } = body;
    if (!email || !password) return json({ error: "email and password required" }, 400);
    if (password.length < 8)  return json({ error: "password must be 8+ chars" }, 400);

    const roleList: string[] = Array.isArray(roles) && roles.length ? roles : ["requisitioner"];

    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || email.split("@")[0] },
    });
    if (cErr || !created?.user) return json({ error: cErr?.message || "create failed" }, 400);

    const newId = created.user.id;

    // Ensure profile row (handle_new_user trigger should cover, but force-upsert here)
    await admin.from("profiles").upsert({
      id: newId, email, full_name: full_name || email.split("@")[0],
      phone_number: phone || null, department: department || null,
      is_active: true, created_at: new Date().toISOString(),
    }, { onConflict: "id" });

    // Replace roles
    await admin.from("user_roles").delete().eq("user_id", newId);
    const rows = roleList.map(role => ({ user_id: newId, role }));
    const { error: rErr } = await admin.from("user_roles").insert(rows);
    if (rErr) return json({ error: `user created but role assignment failed: ${rErr.message}`, user_id: newId }, 207);

    // Audit
    await admin.from("audit_log").insert({
      action: "create_user", module: "users",
      user_name: created.user.email, performed_by: callerId,
      details: { roles: roleList, created_id: newId },
    });

    return json({ ok: true, user_id: newId, email, roles: roleList });
  } catch (e: any) {
    return json({ error: e?.message || "internal error" }, 500);
  }
});

function json(b: any, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}