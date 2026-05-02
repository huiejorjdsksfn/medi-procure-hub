import { db } from "@/integrations/supabase/client";

export const logAudit = async (
  userId: string | undefined,
  userName: string | undefined,
  action: string,
  module: string,
  recordId?: string,
  details?: Record<string, any>
) => {
  try {
    await (db as any).from("audit_log").insert({
      user_id: userId || null,
      user_name: userName || "System",
      action,
      module,
      record_id: recordId || null,
      details: details || null,
    });
  } catch (e) {
    console.error("Audit log error:", e);
  }
};
