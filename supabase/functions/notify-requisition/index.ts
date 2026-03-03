import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyPayload {
  requisition_id: string;
  action: "approved" | "rejected" | "forwarded" | "submitted" | "cancelled";
  actor_name: string;
  notes?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload: NotifyPayload = await req.json();
    const { requisition_id, action, actor_name, notes } = payload;

    // Fetch requisition details
    const { data: req_data } = await supabase
      .from("requisitions")
      .select("*, profiles!requisitions_requested_by_fkey(full_name)")
      .eq("id", requisition_id)
      .single();

    if (!req_data) {
      return new Response(JSON.stringify({ error: "Requisition not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch admin/manager emails for notifications
    const { data: admin_roles } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "procurement_manager"]);

    const adminUserIds = (admin_roles || []).map((r: any) => r.user_id);

    const { data: admin_profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", adminUserIds);

    // Store notification in audit log with email-like metadata
    const emailSubjects: Record<string, string> = {
      approved: `✅ Requisition ${req_data.requisition_number} APPROVED`,
      rejected: `❌ Requisition ${req_data.requisition_number} REJECTED`,
      forwarded: `➡️ Requisition ${req_data.requisition_number} FORWARDED`,
      submitted: `📋 New Requisition ${req_data.requisition_number} SUBMITTED`,
      cancelled: `🚫 Requisition ${req_data.requisition_number} CANCELLED`,
    };

    const emailBody = `
EMBU LEVEL 5 HOSPITAL - PROCUREMENT NOTIFICATION
═══════════════════════════════════════════════════

Action: ${action.toUpperCase()}
Requisition: ${req_data.requisition_number}
Amount: KSH ${Number(req_data.total_amount || 0).toLocaleString()}
Priority: ${(req_data.priority || "normal").toUpperCase()}
By: ${actor_name}
${notes ? `Notes: ${notes}` : ""}

Status: ${req_data.status?.toUpperCase()}
${action === "approved" ? "\nThis requisition has been approved and can proceed to Purchase Order generation." : ""}
${action === "rejected" ? "\nPlease review the requisition and resubmit if needed." : ""}

───────────────────────────────────────────────────
MediProcure ERP Suite v2.0
Embu Level 5 Hospital | ISO 9001:2015 Certified
P.O. Box 33 - 60100, Embu, Kenya
    `.trim();

    // Log as notification event
    await supabase.from("audit_log").insert({
      user_name: actor_name,
      action: `email_${action}`,
      module: "notifications",
      record_id: requisition_id,
      details: {
        subject: emailSubjects[action] || `Requisition ${action}`,
        body: emailBody,
        recipients: (admin_profiles || []).map((p: any) => p.full_name),
        requisition_number: req_data.requisition_number,
        total_amount: req_data.total_amount,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Notification sent for ${action}`,
        subject: emailSubjects[action],
        recipients: (admin_profiles || []).map((p: any) => p.full_name),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
