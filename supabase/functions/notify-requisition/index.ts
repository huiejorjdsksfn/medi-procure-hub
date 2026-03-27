/**
 * ProcurBosse — notify-requisition Edge Function v2.0
 * Called when requisitions are approved/rejected/submitted
 * Sends both SMS (Twilio) and email notifications
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const sb = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const MSG_SVC_SID = "MGd547d8e3273fda2d21afdd6856acb245";

async function getUserContacts(userId: string): Promise<{ phone?: string; email?: string; name?: string }> {
  try {
    const { data } = await sb.from("profiles").select("phone_number,email,full_name,sms_enabled").eq("id", userId).maybeSingle();
    return { phone: data?.sms_enabled !== false ? data?.phone_number : undefined, email: data?.email, name: data?.full_name };
  } catch { return {}; }
}

async function callSms(to: string, message: string) {
  try {
    const { data } = await sb.functions.invoke("send-sms", { body: { to, message, module: "procurement" } });
    return data;
  } catch { return { ok: false }; }
}

async function callEmail(to: string, subject: string, body: string) {
  try {
    const { data } = await sb.functions.invoke("send-email", { body: { to, subject, body } });
    return data;
  } catch { return { ok: false }; }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { event, requisition_id, approved_by, rejected_reason } = await req.json();
    if (!event || !requisition_id) {
      return new Response(JSON.stringify({ ok: false, error: "event and requisition_id required" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Load requisition details
    const { data: req_data } = await sb.from("requisitions")
      .select("requisition_number,title,department,requested_by,requester_name,total_amount,status")
      .eq("id", requisition_id).maybeSingle();

    if (!req_data) return new Response(JSON.stringify({ ok: false, error: "Requisition not found" }),
      { headers: { ...cors, "Content-Type": "application/json" } });

    const amount = req_data.total_amount ? `KES ${Number(req_data.total_amount).toLocaleString()}` : "";
    const reqNo  = req_data.requisition_number || requisition_id.slice(0, 8);
    const dept   = req_data.department || "Unknown Dept";
    const title  = req_data.title || "Untitled";

    const notifications: any[] = [];

    if (event === "approved") {
      // Notify requester
      if (req_data.requested_by) {
        const c = await getUserContacts(req_data.requested_by);
        const msg = `APPROVED: Your requisition ${reqNo} (${title}) has been approved. ${amount ? "Amount: " + amount + "." : ""} Login to EL5 MediProcure.`;
        if (c.phone) { const r = await callSms(c.phone, msg); notifications.push({ type:"sms", to:c.phone, ok:r?.ok }); }
        if (c.email) { const r = await callEmail(c.email, `Requisition ${reqNo} Approved`, msg); notifications.push({ type:"email", to:c.email, ok:r?.ok }); }
      }

    } else if (event === "rejected") {
      // Notify requester with reason
      if (req_data.requested_by) {
        const c = await getUserContacts(req_data.requested_by);
        const reason = rejected_reason || "No reason provided";
        const msg = `REJECTED: Requisition ${reqNo} (${title}) was rejected. Reason: ${reason}. Login to review and resubmit.`;
        if (c.phone) { const r = await callSms(c.phone, msg); notifications.push({ type:"sms", to:c.phone, ok:r?.ok }); }
        if (c.email) { const r = await callEmail(c.email, `Requisition ${reqNo} Rejected`, msg); notifications.push({ type:"email", to:c.email, ok:r?.ok }); }
      }

    } else if (event === "submitted") {
      // Notify procurement managers
      const { data: managers } = await sb.from("user_roles").select("user_id").in("role", ["admin","procurement_manager"]).limit(10);
      for (const m of (managers || [])) {
        const c = await getUserContacts(m.user_id);
        const msg = `NEW REQUISITION: ${reqNo} from ${dept} — ${title}. ${amount ? "Value: " + amount + "." : ""} Review and approve in EL5 MediProcure.`;
        if (c.phone) { const r = await callSms(c.phone, msg); notifications.push({ type:"sms", to:c.phone, ok:r?.ok }); }
        if (c.email) { const r = await callEmail(c.email, `New Requisition ${reqNo} Awaiting Approval`, msg); notifications.push({ type:"email", to:c.email, ok:r?.ok }); }
      }
    }

    // Create in-app notification
    await sb.from("notifications").insert({
      title:     event === "approved" ? `Requisition ${reqNo} Approved` : event === "rejected" ? `Requisition ${reqNo} Rejected` : `New Requisition ${reqNo}`,
      message:   `${title} — ${dept} ${amount ? "· " + amount : ""}`,
      type:      event,
      status:    "unread",
      metadata:  { requisition_id, reqNo, event, approved_by },
      created_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ ok: true, event, requisition_id: reqNo, notifications }),
      { headers: { ...cors, "Content-Type": "application/json" } });

  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err.message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
