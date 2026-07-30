/**
 * ProcurBosse v9.0 -- Data Integrity API Edge Function
 * Was a 9-line stub ("reserved for future implementation") that always
 * returned {status:"ok"} with no actual check performed. Real foreign
 * keys already exist on the core parent/child tables (requisition_items
 * -> requisitions, goods_received_items -> goods_received, etc.), so
 * classic orphan-row detection rarely finds anything there — the gaps
 * that actually matter in this schema are business-logic consistency
 * issues the database itself has no way to enforce. That's what this
 * now actually checks.
 * EL5 MediProcure | Embu Level 5 Hospital
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors });
  const authed = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user } } = await authed.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors });
  const { data: roleRows } = await authed.from("user_roles").select("role").eq("user_id", user.id);
  const roles = (roleRows || []).map((r: any) => r.role);
  if (!roles.some((r: string) => ["admin", "database_admin", "webmaster", "superadmin"].includes(r))) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: cors });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const issues: { category: string; severity: "high"|"medium"|"low"; table: string; count: number; sample: any[] }[] = [];

  // 1. Negative stock quantities — should never happen, indicates a bad
  // GRN/adjustment write path somewhere.
  {
    const { data } = await supabase.from("items").select("id,name,sku,quantity_in_stock").lt("quantity_in_stock", 0).limit(20);
    if (data && data.length) issues.push({ category: "Negative stock quantity", severity: "high", table: "items", count: data.length, sample: data });
  }

  // 2. Duplicate SKUs — should be unique per item, but no DB constraint
  // enforces it.
  {
    const { data } = await supabase.from("items").select("sku").not("sku", "is", null);
    const counts = new Map<string, number>();
    (data || []).forEach((r: any) => { if (r.sku) counts.set(r.sku, (counts.get(r.sku) || 0) + 1); });
    const dupes = Array.from(counts.entries()).filter(([, n]) => n > 1);
    if (dupes.length) issues.push({ category: "Duplicate SKU", severity: "medium", table: "items", count: dupes.length, sample: dupes.slice(0, 20).map(([sku, n]) => ({ sku, count: n })) });
  }

  // 3. Purchase orders whose stored total doesn't match the sum of their
  // own line_items — the two can drift if a line item is edited after
  // the header total was last recalculated.
  {
    const { data } = await supabase.from("purchase_orders").select("id,po_number,total_amount,line_items").limit(500);
    const mismatched = (data || []).filter((po: any) => {
      const items = Array.isArray(po.line_items) ? po.line_items : [];
      const computed = items.reduce((s: number, it: any) => s + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0);
      return items.length > 0 && Math.abs(computed - Number(po.total_amount || 0)) > 1;
    });
    if (mismatched.length) issues.push({
      category: "PO total doesn't match line items", severity: "medium", table: "purchase_orders",
      count: mismatched.length,
      sample: mismatched.slice(0, 20).map((po: any) => ({ id: po.id, po_number: po.po_number, stored_total: po.total_amount })),
    });
  }

  // 4. Approved requisitions with no recorded approver — a real gap in
  // the accountability trail for spend that's already been signed off.
  {
    const { data } = await supabase.from("requisitions").select("id,requisition_number,status,approved_by_name")
      .eq("status", "approved").or("approved_by_name.is.null,approved_by_name.eq.");
    if (data && data.length) issues.push({ category: "Approved requisition with no approver recorded", severity: "high", table: "requisitions", count: data.length, sample: data });
  }

  // 5. Suppliers with neither an email nor a phone number on file —
  // can't actually be contacted to place an order.
  {
    const { data } = await supabase.from("suppliers").select("id,name")
      .eq("status", "active").or("email.is.null,email.eq.").or("phone.is.null,phone.eq.");
    if (data && data.length) issues.push({ category: "Active supplier with no contact info", severity: "low", table: "suppliers", count: data.length, sample: data.slice(0, 20) });
  }

  // 6. Goods received where the received value is well above the linked
  // PO's total — a strong signal of a data-entry error (wrong quantity
  // or price typed in at receiving).
  {
    const { data } = await supabase
      .from("goods_received")
      .select("id,grn_number,po_id,total_value,purchase_orders(total_amount)")
      .not("po_id", "is", null)
      .limit(500);
    const overReceived = (data || []).filter((g: any) => {
      const poTotal = Number(g.purchase_orders?.total_amount || 0);
      return poTotal > 0 && Number(g.total_value || 0) > poTotal * 1.15;
    });
    if (overReceived.length) issues.push({
      category: "GRN value exceeds linked PO by >15%", severity: "medium", table: "goods_received",
      count: overReceived.length,
      sample: overReceived.slice(0, 20).map((g: any) => ({ id: g.id, grn_number: g.grn_number, received: g.total_value, po_total: g.purchase_orders?.total_amount })),
    });
  }

  const summary = {
    checked_at: new Date().toISOString(),
    checks_run: 6,
    issues_found: issues.reduce((s, i) => s + i.count, 0),
    high: issues.filter(i => i.severity === "high").length,
    medium: issues.filter(i => i.severity === "medium").length,
    low: issues.filter(i => i.severity === "low").length,
    issues,
  };

  return new Response(JSON.stringify(summary), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
