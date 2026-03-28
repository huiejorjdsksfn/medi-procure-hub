/**
 * ProcurBosse -- notify-requisition Edge Function v3.0
 * Triggered on: submitted | approved | rejected | ordered | received
 * Sends SMS (Twilio/AT) + Email (SMTP/Resend) + in-app notification
 * Also notifies accountants on financial events
 * EL5 MediProcure -- Embu Level 5 Hospital
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

// ── Get user contacts (phone + email) ────────────────────────────────────────
async function getContacts(userId: string): Promise<{phone?:string;email?:string;name?:string}> {
  try {
    const { data } = await sb.from("profiles")
      .select("phone_number,email,full_name,sms_enabled")
      .eq("id", userId).maybeSingle();
    return {
      phone: data?.sms_enabled !== false ? data?.phone_number ?? undefined : undefined,
      email: data?.email ?? undefined,
      name:  data?.full_name ?? undefined,
    };
  } catch { return {}; }
}

// ── Get contacts for a list of roles ─────────────────────────────────────────
async function getRoleContacts(roles: string[]): Promise<Array<{userId:string;phone?:string;email?:string;name?:string}>> {
  try {
    const { data } = await sb.from("user_roles")
      .select("user_id").in("role", roles).limit(20);
    if (!data?.length) return [];
    const unique = [...new Set(data.map((r: any) => r.user_id))] as string[];
    return await Promise.all(unique.map(async uid => ({ userId: uid, ...(await getContacts(uid)) })));
  } catch { return []; }
}

// ── Call send-sms edge function ───────────────────────────────────────────────
async function sms(to: string, message: string, module = "procurement") {
  try {
    const { data, error } = await sb.functions.invoke("send-sms", {
      body: { to, message, module }
    });
    if (error) console.warn("SMS invoke error:", error.message);
    return data;
  } catch (e: any) { console.warn("SMS call failed:", e.message); return { ok: false }; }
}

// ── Call send-email edge function ─────────────────────────────────────────────
async function email(to: string, subject: string, body: string, actionUrl?: string) {
  try {
    const { data, error } = await sb.functions.invoke("send-email", {
      body: { to, subject, body, action_url: actionUrl ? `https://procurbosse.edgeone.app${actionUrl}` : undefined }
    });
    if (error) console.warn("Email invoke error:", error.message);
    return data;
  } catch (e: any) { console.warn("Email call failed:", e.message); return { ok: false }; }
}

// ── Insert in-app notification ────────────────────────────────────────────────
async function inApp(userId: string | null, title: string, message: string, type: string, actionUrl?: string, metadata?: any) {
  try {
    await sb.from("notifications").insert({
      title, message, type,
      status:     "unread",
      is_read:    false,
      action_url: actionUrl || null,
      module:     "procurement",
      metadata:   metadata || {},
      recipient_id: userId,
      created_at: new Date().toISOString(),
    });
  } catch (e: any) { console.warn("in-app notif failed:", e.message); }
}

// ── Main handler ──────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const body = await req.json();
    const { event, requisition_id, approved_by, rejected_reason, po_id, grn_id, voucher_id } = body;

    if (!event) {
      return new Response(JSON.stringify({ ok: false, error: "event is required" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const notifications: any[] = [];

    // ── REQUISITION EVENTS ────────────────────────────────────
    if (requisition_id) {
      const { data: req_data } = await sb.from("requisitions")
        .select("requisition_number,title,department,requested_by,requester_name,total_amount,status,priority")
        .eq("id", requisition_id).maybeSingle();

      if (!req_data) {
        return new Response(JSON.stringify({ ok: false, error: "Requisition not found" }),
          { headers: { ...cors, "Content-Type": "application/json" } });
      }

      const amount = req_data.total_amount ? `KES ${Number(req_data.total_amount).toLocaleString("en-KE", {minimumFractionDigits:2})}` : "";
      const reqNo  = req_data.requisition_number || requisition_id.slice(0, 8).toUpperCase();
      const dept   = req_data.department || "Unknown Department";
      const title  = req_data.title      || "Untitled Requisition";
      const prio   = req_data.priority   || "normal";
      const actionUrl = "/requisitions";

      if (event === "submitted") {
        // Notify procurement managers + admins
        const managers = await getRoleContacts(["admin","procurement_manager"]);
        for (const m of managers) {
          const msg = `NEW REQUISITION ${reqNo}: "${title}" from ${dept}. Priority: ${prio.toUpperCase()}. ${amount ? "Value: "+amount+"." : ""} Review and approve.`;
          const emailBody = `A new purchase requisition requires your review and approval.\n\n**Requisition:** ${reqNo}\n**Title:** ${title}\n**Department:** ${dept}\n**Priority:** ${prio.toUpperCase()}\n${amount ? `**Estimated Value:** ${amount}\n` : ""}\nPlease log in to EL5 MediProcure to review and take action.`;

          if (m.phone) { const r = await sms(m.phone, msg, "procurement"); notifications.push({type:"sms",to:m.phone,...r}); }
          if (m.email) { const r = await email(m.email, `[ACTION REQUIRED] New Requisition ${reqNo} — ${dept}`, emailBody, actionUrl); notifications.push({type:"email",to:m.email,...r}); }
          await inApp(m.userId, `New Requisition: ${reqNo}`, `${title} — ${dept}${amount ? " · "+amount : ""}`, "procurement", actionUrl, { requisition_id, reqNo });
        }

      } else if (event === "approved") {
        // Notify requester
        if (req_data.requested_by) {
          const c = await getContacts(req_data.requested_by);
          const msg = `APPROVED: Your requisition ${reqNo} ("${title}") has been approved. ${amount ? "Amount: "+amount+"." : ""} Login to track progress.`;
          const emailBody = `Your purchase requisition has been approved.\n\n**Requisition:** ${reqNo}\n**Title:** ${title}\n${amount ? `**Approved Amount:** ${amount}\n` : ""}\nYour requisition will now be processed by the Procurement team.`;

          if (c.phone) { const r = await sms(c.phone, msg, "procurement"); notifications.push({type:"sms",to:c.phone,...r}); }
          if (c.email) { const r = await email(c.email, `Requisition ${reqNo} Approved ✓`, emailBody, actionUrl); notifications.push({type:"email",to:c.email,...r}); }
          await inApp(req_data.requested_by, `Requisition ${reqNo} Approved`, `${title}${amount ? " · "+amount : ""}`, "success", actionUrl, { requisition_id, reqNo });
        }
        // Also notify accountants for budget tracking
        const accountants = await getRoleContacts(["accountant"]);
        for (const a of accountants) {
          await inApp(a.userId, `Budget Alert: Requisition ${reqNo} Approved`, `${title} — ${dept}${amount ? " · "+amount : ""}`, "voucher", "/accountant", { requisition_id, reqNo });
        }

      } else if (event === "rejected") {
        if (req_data.requested_by) {
          const c = await getContacts(req_data.requested_by);
          const reason = rejected_reason || "No reason provided";
          const msg = `REJECTED: Requisition ${reqNo} ("${title}") was rejected. Reason: ${reason}. Login to review and resubmit.`;
          const emailBody = `Your purchase requisition has been rejected.\n\n**Requisition:** ${reqNo}\n**Title:** ${title}\n**Reason:** ${reason}\n\nPlease review the feedback and resubmit if appropriate.`;

          if (c.phone) { const r = await sms(c.phone, msg, "procurement"); notifications.push({type:"sms",to:c.phone,...r}); }
          if (c.email) { const r = await email(c.email, `Requisition ${reqNo} Rejected`, emailBody, actionUrl); notifications.push({type:"email",to:c.email,...r}); }
          await inApp(req_data.requested_by, `Requisition ${reqNo} Rejected`, reason, "error", actionUrl, { requisition_id, reqNo });
        }

      } else if (event === "ordered") {
        // PO created from requisition — notify requester + warehouse
        if (req_data.requested_by) {
          const c = await getContacts(req_data.requested_by);
          const msg = `ORDERED: LPO raised for requisition ${reqNo} ("${title}"). Awaiting delivery from supplier.`;
          if (c.phone) await sms(c.phone, msg, "procurement");
          await inApp(req_data.requested_by, `LPO Issued: ${reqNo}`, title, "procurement", "/purchase-orders", { requisition_id, reqNo });
        }
        const warehouse = await getRoleContacts(["warehouse_officer","inventory_manager"]);
        for (const w of warehouse) {
          await inApp(w.userId, `Delivery Expected: ${reqNo}`, `${title} — ${dept}`, "grn", "/goods-received", { requisition_id, reqNo });
        }

      } else if (event === "received") {
        // GRN created — notify procurement + accountants
        const managers = await getRoleContacts(["admin","procurement_manager"]);
        for (const m of managers) {
          await inApp(m.userId, `Goods Received: ${reqNo}`, `${title} — ${dept}`, "grn", "/goods-received", { requisition_id, reqNo });
        }
        const accountants = await getRoleContacts(["accountant"]);
        for (const a of accountants) {
          await inApp(a.userId, `GRN Ready for Invoice Matching`, `${title} — ${dept}${amount ? " · "+amount : ""}`, "voucher", "/accountant", { requisition_id, reqNo });
        }
      }
    }

    // ── PAYMENT VOUCHER EVENTS ────────────────────────────────
    if (voucher_id && (event === "voucher_approved" || event === "voucher_paid")) {
      const { data: v } = await sb.from("payment_vouchers")
        .select("voucher_number,payee_name,total_amount,approved_by").eq("id", voucher_id).maybeSingle();

      if (v) {
        const vNo   = v.voucher_number || voucher_id.slice(0,8).toUpperCase();
        const amtFmt = v.total_amount ? `KES ${Number(v.total_amount).toLocaleString("en-KE",{minimumFractionDigits:2})}` : "";
        const actionUrl = "/vouchers/payment";

        if (event === "voucher_approved") {
          const accountants = await getRoleContacts(["accountant","admin"]);
          for (const a of accountants) {
            const msg = `VOUCHER APPROVED: ${vNo} for ${v.payee_name} — ${amtFmt}. Ready for payment export.`;
            if (a.phone) await sms(a.phone, msg, "finance");
            if (a.email) await email(a.email, `Payment Voucher ${vNo} Approved`, `Payment voucher ${vNo} for ${v.payee_name} (${amtFmt}) has been approved and is ready for payment processing.`, actionUrl);
            await inApp(a.userId, `Voucher ${vNo} Approved`, `${v.payee_name} · ${amtFmt}`, "voucher", actionUrl, { voucher_id, vNo });
          }
        } else if (event === "voucher_paid") {
          const managers = await getRoleContacts(["admin","procurement_manager"]);
          for (const m of managers) {
            await inApp(m.userId, `Payment Processed: ${vNo}`, `${v.payee_name} · ${amtFmt}`, "success", actionUrl, { voucher_id, vNo });
          }
        }
      }
    }

    // ── GRN EVENTS ───────────────────────────────────────────
    if (grn_id && event === "grn_created") {
      const { data: grn } = await sb.from("goods_received")
        .select("grn_number,supplier_name,total_amount").eq("id", grn_id).maybeSingle();

      if (grn) {
        const gNo  = grn.grn_number || grn_id.slice(0,8).toUpperCase();
        const amtFmt = grn.total_amount ? `KES ${Number(grn.total_amount).toLocaleString("en-KE",{minimumFractionDigits:2})}` : "";
        // Notify accountants to trigger invoice matching
        const accountants = await getRoleContacts(["accountant","admin"]);
        for (const a of accountants) {
          await inApp(a.userId, `GRN ${gNo}: Invoice Matching Required`, `${grn.supplier_name || "Supplier"} · ${amtFmt}`, "grn", "/accountant", { grn_id, gNo });
          if (a.email) await email(a.email, `GRN ${gNo} Received — Invoice Matching Required`, `Goods received from ${grn.supplier_name || "supplier"} (GRN ${gNo}, ${amtFmt}) requires invoice matching. Log in to the Accountant Workspace to process.`, "/accountant");
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, event, notifications }),
      { headers: { ...cors, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("notify-requisition fatal:", err);
    return new Response(JSON.stringify({ ok: false, error: err.message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
