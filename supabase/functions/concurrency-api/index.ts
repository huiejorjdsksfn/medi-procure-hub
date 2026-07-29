/**
 * ProcurBosse v8.0 -- Concurrency API Edge Function
 * Optimistic locking and conflict resolution for 2000+ concurrent users
 * EL5 MediProcure | Embu Level 5 Hospital
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type" };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error:"Unauthorized" }), { status:401, headers:cors });
  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", { global:{ headers:{ Authorization:authHeader } } });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error:"Unauthorized" }), { status:401, headers:cors });
  const { operation, table, record_id, updates, expected_version } = await req.json().catch(() => ({}));

  if (operation === "lock") {
    const key = `lock:${table}:${record_id}`;
    const now = Date.now();
    const expires = new Date(now + 15000).toISOString();

    // Was: always upsert, unconditionally overwriting whoever held the
    // lock. That's not a lock, it's a shared variable — any second caller
    // silently "stole" it with zero mutual exclusion. Now: check for an
    // existing, still-valid lock held by someone else first.
    const { data: existing } = await supabase.from("system_settings").select("value").eq("key", key).maybeSingle();
    if (existing?.value) {
      try {
        const cur = JSON.parse(existing.value);
        if (cur.userId && cur.userId !== user.id && new Date(cur.expires).getTime() > now) {
          const { data: holder } = await supabase.from("profiles").select("full_name").eq("id", cur.userId).maybeSingle();
          return new Response(JSON.stringify({ locked: false, heldBy: holder?.full_name || "another user", expiresAt: cur.expires }),
            { headers: { ...cors, "Content-Type":"application/json" } });
        }
      } catch { /* malformed existing value — fall through and overwrite */ }
    }

    const { error } = await supabase.from("system_settings").upsert({ key, value: JSON.stringify({ userId: user.id, expires }), category: "lock" }, { onConflict: "key" });
    return new Response(JSON.stringify({ locked: !error, expiresAt: expires }), { headers: { ...cors, "Content-Type":"application/json" } });
  }

  if (operation === "unlock") {
    const key = `lock:${table}:${record_id}`;
    // Was: .eq("value", JSON.stringify({ userId: user.id })) — the stored
    // value always also contains `expires`, so that string could never
    // equal what's actually in the row. This delete never matched
    // anything; locks only ever went away by being overwritten (see the
    // lock() bug above), never by an actual unlock call.
    const { data: existing } = await supabase.from("system_settings").select("value").eq("key", key).maybeSingle();
    if (existing?.value) {
      try {
        const cur = JSON.parse(existing.value);
        if (cur.userId === user.id) await supabase.from("system_settings").delete().eq("key", key);
      } catch { await supabase.from("system_settings").delete().eq("key", key); }
    }
    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, "Content-Type":"application/json" } });
  }

  if (operation === "update_if_unchanged") {
    const ALLOWED = new Set(["requisitions","purchase_orders","suppliers","items","contracts","tenders"]);
    if (!ALLOWED.has(table)) return new Response(JSON.stringify({ error:"Table not allowed" }), { status:400, headers:cors });
    const { data, error } = await supabase.from(table)
      .update({ ...updates, version: (expected_version || 0) + 1, updated_at: new Date().toISOString() })
      .eq("id", record_id).eq("version", expected_version || 0).select("id");
    const success = !error && data && data.length > 0;
    return new Response(JSON.stringify({ success, conflict: !success }), { headers: { ...cors, "Content-Type":"application/json" } });
  }

  return new Response(JSON.stringify({ error:"Unknown operation" }), { status:400, headers:cors });
});
