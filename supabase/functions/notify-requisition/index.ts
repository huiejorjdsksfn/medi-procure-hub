/**
 * ProcurBosse — notify-requisition Edge Function v4.0
 * Unified procurement event notification handler
 * Events: submitted | approved | rejected | ordered | received | grn_created | voucher_approved | voucher_paid
 * Channels: SMS + Email + In-App
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const sb = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getContacts(userId: string) {
  try {
    const { data } = await sb.from("profiles")
      .select("phone_number,email,full_name,sms_enabled")
      .eq("id", userId).maybeSingle();
    return {
      phone: data?.sms_enabled !== false ? data?.phone_number : undefined,
      email: data?.email,
      name: data?.full_name,
    };
  } catch { return {}; }
}

async function getRoleContacts(roles: string[]) {
  try {
    const { data } = await sb.from("user_roles")
      .select("user_id").in("role", roles).limit(20);
    if (!data?.length) return [];
    const uids = [...new Set(data.map((r: any) => r.user_id))] as string[];
    return Promise.all(uids.map(async uid => ({ userId: uid, ...(await getContacts(uid)) })));
  } catch { return []; }
}

async function sms(to: string, message: string, module = "procurement") {
  try {
    await sb.functions.invoke("send-sms", { body: { to, message, module } });
  } catch (e: any) { console.warn("SMS failed:", e.message); }
}

async function email(to: string, subject: string, body: string, actionUrl?: string) {
  try {
    await sb.functions.invoke("send-email", {
      body: { to, subject, body, action_url: actionUrl ? `https://procurbosse.edgeone.app${actionUrl}` : undefined }
    });
  } catch (e: any) { console.warn("Email failed:", e.message); }
}

async function inApp(userId: string | null, title: string, message: string, type: string, actionUrl?: string, metadata?: any) {
  try {
    await sb.from("notifications").insert({
      title, message, type,
      status: "unread", is_read: false,
      action_url: actionUrl || null,
      module: "procurement",
      metadata: metadata || {},
      recipient_id: userId,
      created_at: new Date().toISOString(),
    });
  } catch (e: any) { console.warn("In-app failed:", e.message); }
}

function fmtKES(amount: number | null): string {
  if (!amount) return "";
  return `KES ${Number(amount).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;
}

// ── Event Handlers ───────────────────────────────────────────────────────────

async function handleRequisitionEvent(event: string, reqId: string, body: any) {
  const { data: req } = await sb.from("requisitions")
    .select("requisition_number,title,department,requested_by,requester_name,total_amount,status,priority")
    .eq("id", reqId).maybeSingle();

  if (!req) throw new Error("Requisition not found");

  const amt = fmtKES(req.total_amount);
  const reqNo = req.requisition_number || reqId.slice(0, 8).toUpperCase();
  const dept = req.department || "Unknown";
  const title = req.title || "Untitled";
  const prio = (req.priority || "normal").toUpperCase();

  switch (event) {
    case "submitted": {
      const managers = await getRoleContacts(["admin", "procurement_manager"]);
      for (const m of managers) {
        if (m.phone) await sms(m.phone, `NEW REQ ${reqNo}: "${title}" from ${dept}. Priority: ${prio}. ${amt ? "Value: " + amt : ""} Review now.`);
        if (m.email) await email(m.email, `[ACTION] New Requisition ${reqNo} — ${dept}`,
          `New requisition requires review.\n\n**${reqNo}** — ${title}\n**Dept:** ${dept} | **Priority:** ${prio}\n${amt ? `**Value:** ${amt}` : ""}`, "/requisitions");
        await inApp(m.userId, `New Requisition: ${reqNo}`, `${title} — ${dept}${amt ? " · " + amt : ""}`, "procurement", "/requisitions", { requisition_id: reqId });
      }
      break;
    }
    case "approved": {
      if (req.requested_by) {
        const c = await getContacts(req.requested_by);
        if (c.phone) await sms(c.phone, `APPROVED: Your requisition ${reqNo} ("${title}") approved. ${amt ? "Amount: " + amt : ""}`);
        if (c.email) await email(c.email, `Requisition ${reqNo} Approved ✓`,
          `Your requisition **${reqNo}** ("${title}") has been approved.\n${amt ? `**Amount:** ${amt}` : ""}`, "/requisitions");
        await inApp(req.requested_by, `Requisition ${reqNo} Approved`, `${title}${amt ? " · " + amt : ""}`, "success", "/requisitions", { requisition_id: reqId });
      }
      // Notify accountants for budget tracking
      const accountants = await getRoleContacts(["accountant"]);
      for (const a of accountants) {
        await inApp(a.userId, `Budget Alert: ${reqNo} Approved`, `${title} — ${dept}${amt ? " · " + amt : ""}`, "voucher", "/accountant", { requisition_id: reqId });
      }
      break;
    }
    case "rejected": {
      if (req.requested_by) {
        const reason = body.rejected_reason || "No reason provided";
        const c = await getContacts(req.requested_by);
        if (c.phone) await sms(c.phone, `REJECTED: Requisition ${reqNo} rejected. Reason: ${reason}`);
        if (c.email) await email(c.email, `Requisition ${reqNo} Rejected`,
          `Your requisition **${reqNo}** ("${title}") was rejected.\n**Reason:** ${reason}`, "/requisitions");
        await inApp(req.requested_by, `Requisition ${reqNo} Rejected`, reason, "error", "/requisitions", { requisition_id: reqId });
      }
      break;
    }
    case "ordered": {
      if (req.requested_by) {
        const c = await getContacts(req.requested_by);
        if (c.phone) await sms(c.phone, `ORDERED: LPO raised for requisition ${reqNo}. Awaiting delivery.`);
        await inApp(req.requested_by, `LPO Issued: ${reqNo}`, title, "procurement", "/purchase-orders", { requisition_id: reqId });
      }
      const warehouse = await getRoleContacts(["warehouse_officer", "inventory_manager"]);
      for (const w of warehouse) {
        await inApp(w.userId, `Delivery Expected: ${reqNo}`, `${title} — ${dept}`, "grn", "/goods-received", { requisition_id: reqId });
      }
      break;
    }
    case "received": {
      const managers = await getRoleContacts(["admin", "procurement_manager"]);
      for (const m of managers) {
        await inApp(m.userId, `Goods Received: ${reqNo}`, `${title} — ${dept}`, "grn", "/goods-received", { requisition_id: reqId });
      }
      const accountants = await getRoleContacts(["accountant"]);
      for (const a of accountants) {
        await inApp(a.userId, `GRN Ready for Invoice Matching`, `${title} — ${dept}${amt ? " · " + amt : ""}`, "voucher", "/accountant", { requisition_id: reqId });
      }
      break;
    }
  }
}

async function handleVoucherEvent(event: string, voucherId: string) {
  const { data: v } = await sb.from("payment_vouchers")
    .select("voucher_number,payee_name,total_amount").eq("id", voucherId).maybeSingle();
  if (!v) return;

  const vNo = v.voucher_number || voucherId.slice(0, 8).toUpperCase();
  const amt = fmtKES(v.total_amount);

  if (event === "voucher_approved") {
    const targets = await getRoleContacts(["accountant", "admin"]);
    for (const t of targets) {
      if (t.phone) await sms(t.phone, `VOUCHER APPROVED: ${vNo} for ${v.payee_name} — ${amt}`, "finance");
      if (t.email) await email(t.email, `Voucher ${vNo} Approved`, `Payment voucher ${vNo} for ${v.payee_name} (${amt}) approved.`, "/vouchers/payment");
      await inApp(t.userId, `Voucher ${vNo} Approved`, `${v.payee_name} · ${amt}`, "voucher", "/vouchers/payment", { voucher_id: voucherId });
    }
  } else if (event === "voucher_paid") {
    const managers = await getRoleContacts(["admin", "procurement_manager"]);
    for (const m of managers) {
      await inApp(m.userId, `Payment Processed: ${vNo}`, `${v.payee_name} · ${amt}`, "success", "/vouchers/payment", { voucher_id: voucherId });
    }
  }
}

async function handleGrnEvent(grnId: string) {
  const { data: grn } = await sb.from("goods_received")
    .select("grn_number,supplier_name,total_value").eq("id", grnId).maybeSingle();
  if (!grn) return;

  const gNo = grn.grn_number || grnId.slice(0, 8).toUpperCase();
  const amt = fmtKES(grn.total_value);

  const accountants = await getRoleContacts(["accountant", "admin"]);
  for (const a of accountants) {
    await inApp(a.userId, `GRN ${gNo}: Invoice Matching Required`, `${grn.supplier_name || "Supplier"} · ${amt}`, "grn", "/accountant", { grn_id: grnId });
    if (a.email) await email(a.email, `GRN ${gNo} — Invoice Matching Required`,
      `Goods received from ${grn.supplier_name || "supplier"} (GRN ${gNo}, ${amt}). Match to invoice.`, "/accountant");
  }
}

// ── Main Handler ─────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const body = await req.json();
    const { event, requisition_id, voucher_id, grn_id } = body;

    if (!event) {
      return new Response(JSON.stringify({ ok: false, error: "event is required" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Route to handler
    if (requisition_id && ["submitted", "approved", "rejected", "ordered", "received"].includes(event)) {
      await handleRequisitionEvent(event, requisition_id, body);
    }
    if (voucher_id && ["voucher_approved", "voucher_paid"].includes(event)) {
      await handleVoucherEvent(event, voucher_id);
    }
    if (grn_id && event === "grn_created") {
      await handleGrnEvent(grn_id);
    }

    return new Response(JSON.stringify({ ok: true, event }),
      { headers: { ...cors, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("notify-requisition error:", err);
    return new Response(JSON.stringify({ ok: false, error: err.message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
