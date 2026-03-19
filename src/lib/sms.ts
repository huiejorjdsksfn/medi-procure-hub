/**
 * ProcurBosse — SMS Notification Library (Twilio)
 * Sends SMS via send-sms Edge Function.
 * Reads phone numbers from profiles table.
 */
import { supabase } from "@/integrations/supabase/client";

export interface SmsOptions {
  to: string | string[];
  message: string;
  module?: string;
  recordId?: string;
  sentBy?: string;
  sentByName?: string;
}

/** Send SMS via Twilio edge function */
export async function sendSms(opts: SmsOptions): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("send-sms", {
      body: {
        to: opts.to,
        message: opts.message,
        module: opts.module || "system",
        record_id: opts.recordId,
        sent_by: opts.sentBy,
        sent_by_name: opts.sentByName,
      },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: data?.ok ?? false, error: data?.error };
  } catch (e: any) {
    console.error("sendSms error:", e);
    return { ok: false, error: e.message };
  }
}

/** Get phone number for a user */
async function getUserPhone(userId: string): Promise<string | null> {
  try {
    const { data } = await (supabase as any)
      .from("profiles")
      .select("phone_number, sms_enabled")
      .eq("id", userId)
      .maybeSingle();
    if (data?.sms_enabled === false) return null;
    return data?.phone_number || null;
  } catch { return null; }
}

/** Send SMS to admin users */
export async function smsAdmins(message: string, module = "system"): Promise<void> {
  try {
    const { data: admins } = await (supabase as any)
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin")
      .limit(10);
    if (!admins?.length) return;
    const phones: string[] = [];
    for (const a of admins) {
      const phone = await getUserPhone(a.user_id);
      if (phone) phones.push(phone);
    }
    if (phones.length) {
      await sendSms({ to: phones, message, module });
    }
  } catch (e) { console.error("smsAdmins error:", e); }
}

/** Notify procurement managers via SMS */
export async function smsProcurement(message: string, module = "procurement"): Promise<void> {
  try {
    const { data: roles } = await (supabase as any)
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "procurement_manager"])
      .limit(15);
    if (!roles?.length) return;
    const unique = [...new Set(roles.map((r: any) => r.user_id))] as string[];
    const phones: string[] = [];
    for (const uid of unique) {
      const phone = await getUserPhone(uid);
      if (phone) phones.push(phone);
    }
    if (phones.length) await sendSms({ to: phones, message, module });
  } catch (e) { console.error("smsProcurement error:", e); }
}

// ── Pre-built SMS templates ───────────────────────────────────

export const SmsTemplates = {
  requisitionApproved: (reqNo: string, dept: string) =>
    `APPROVED: Requisition ${reqNo} from ${dept} has been approved. Login to EL5 MediProcure to process.`,

  requisitionRejected: (reqNo: string, reason: string) =>
    `REJECTED: Requisition ${reqNo} was rejected. Reason: ${reason}. Login to resubmit.`,

  poCreated: (poNo: string, supplier: string, amount: string) =>
    `LPO ${poNo} created for ${supplier}. Amount: KES ${amount}. Awaiting approval.`,

  poApproved: (poNo: string, supplier: string) =>
    `LPO APPROVED: ${poNo} for ${supplier} has been approved. Proceed with supplier communication.`,

  grnReceived: (grnNo: string, supplier: string) =>
    `GRN ${grnNo}: Goods received from ${supplier}. Quality inspection pending.`,

  tenderPublished: (tenderNo: string, title: string, closing: string) =>
    `TENDER ${tenderNo}: "${title}" published. Closing: ${closing}. Submit bids via EL5 MediProcure.`,

  paymentProcessed: (amount: string, payee: string, chequeNo: string) =>
    `PAYMENT: KES ${amount} to ${payee}. Cheque/Ref: ${chequeNo}. EL5 Finance.`,

  loginAlert: (email: string, ip: string, time: string) =>
    `LOGIN ALERT: ${email} logged in from IP ${ip} at ${time}. Not you? Contact IT immediately.`,

  ipDenied: (ip: string, email: string) =>
    `SECURITY: Login attempt from unauthorized IP ${ip} for ${email} was blocked. EL5 MediProcure.`,

  lowStock: (itemName: string, qty: number, reorderLevel: number) =>
    `LOW STOCK: ${itemName} has only ${qty} units (reorder at ${reorderLevel}). Create requisition now.`,

  contractExpiring: (contractNo: string, supplier: string, days: number) =>
    `CONTRACT EXPIRY: ${contractNo} with ${supplier} expires in ${days} days. Renew or close.`,
};
