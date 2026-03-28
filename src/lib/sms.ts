/**
 * ProcurBosse -- sms.ts v3.0
 * Client-side SMS library: wraps send-sms edge function
 * Twilio primary, Africa's Talking fallback
 * EL5 MediProcure -- Embu Level 5 Hospital
 */
import { supabase } from "@/integrations/supabase/client";

export interface SmsOptions {
  to:           string | string[];  // phone number(s) in any format
  message:      string;
  module?:      string;
  recordId?:    string;
  sentBy?:      string;
  sentByName?:  string;
}

export interface SmsResult {
  ok:      boolean;
  sent:    number;
  failed:  number;
  total:   number;
  results: Array<{ to: string; ok: boolean; provider: string; sid?: string; error?: string }>;
  error?:  string;
}

// ── Core send function ────────────────────────────────────────────────────────

export async function sendSms(opts: SmsOptions): Promise<SmsResult> {
  try {
    const { data, error } = await supabase.functions.invoke("send-sms", {
      body: {
        to:            opts.to,
        message:       opts.message,
        module:        opts.module      || "system",
        record_id:     opts.recordId    || undefined,
        sent_by:       opts.sentBy      || undefined,
        sent_by_name:  opts.sentByName  || undefined,
      },
    });

    if (error) return { ok: false, sent: 0, failed: 1, total: 1, results: [], error: error.message };

    return {
      ok:      data?.ok      ?? false,
      sent:    data?.sent    ?? 0,
      failed:  data?.failed  ?? 0,
      total:   data?.total   ?? 0,
      results: data?.results ?? [],
      error:   data?.error,
    };
  } catch (e: any) {
    console.error("[sms] sendSms exception:", e.message);
    return { ok: false, sent: 0, failed: 1, total: 1, results: [], error: e.message };
  }
}

// ── Phone number helper ───────────────────────────────────────────────────────

export function formatPhone(raw: string): string {
  let n = raw.replace(/[\s\-\(\)\.]/g, "");
  if (n.startsWith("07") || n.startsWith("01")) return "+254" + n.slice(1);
  if (n.startsWith("254") && !n.startsWith("+")) return "+" + n;
  if (!n.startsWith("+")) return "+254" + n;
  return n;
}

// ── Get user phone from profiles ──────────────────────────────────────────────

async function getUserPhone(userId: string): Promise<string | null> {
  try {
    const { data } = await (supabase as any)
      .from("profiles")
      .select("phone_number,sms_enabled")
      .eq("id", userId)
      .maybeSingle();
    if (data?.sms_enabled === false) return null;
    return data?.phone_number || null;
  } catch { return null; }
}

// ── Bulk role helpers ─────────────────────────────────────────────────────────

export async function smsAdmins(message: string, module = "system"): Promise<SmsResult> {
  try {
    const { data: admins } = await (supabase as any)
      .from("user_roles").select("user_id").eq("role", "admin").limit(10);
    if (!admins?.length) return { ok: true, sent: 0, failed: 0, total: 0, results: [] };
    const phones: string[] = [];
    for (const a of admins) {
      const phone = await getUserPhone(a.user_id);
      if (phone) phones.push(phone);
    }
    if (!phones.length) return { ok: true, sent: 0, failed: 0, total: 0, results: [] };
    return sendSms({ to: phones, message, module });
  } catch (e: any) {
    console.warn("[sms] smsAdmins error:", e.message);
    return { ok: false, sent: 0, failed: 0, total: 0, results: [], error: e.message };
  }
}

export async function smsProcurement(message: string, module = "procurement"): Promise<SmsResult> {
  try {
    const { data: roles } = await (supabase as any)
      .from("user_roles").select("user_id")
      .in("role", ["admin","procurement_manager"]).limit(15);
    if (!roles?.length) return { ok: true, sent: 0, failed: 0, total: 0, results: [] };
    const unique = [...new Set(roles.map((r: any) => r.user_id))] as string[];
    const phones: string[] = [];
    for (const uid of unique) {
      const phone = await getUserPhone(uid);
      if (phone) phones.push(phone);
    }
    if (!phones.length) return { ok: true, sent: 0, failed: 0, total: 0, results: [] };
    return sendSms({ to: phones, message, module });
  } catch (e: any) {
    console.warn("[sms] smsProcurement error:", e.message);
    return { ok: false, sent: 0, failed: 0, total: 0, results: [], error: e.message };
  }
}

export async function smsAccountants(message: string, module = "finance"): Promise<SmsResult> {
  try {
    const { data: roles } = await (supabase as any)
      .from("user_roles").select("user_id")
      .in("role", ["admin","accountant"]).limit(10);
    if (!roles?.length) return { ok: true, sent: 0, failed: 0, total: 0, results: [] };
    const unique = [...new Set(roles.map((r: any) => r.user_id))] as string[];
    const phones: string[] = [];
    for (const uid of unique) {
      const phone = await getUserPhone(uid);
      if (phone) phones.push(phone);
    }
    if (!phones.length) return { ok: true, sent: 0, failed: 0, total: 0, results: [] };
    return sendSms({ to: phones, message, module });
  } catch (e: any) {
    console.warn("[sms] smsAccountants error:", e.message);
    return { ok: false, sent: 0, failed: 0, total: 0, results: [], error: e.message };
  }
}

export async function smsUser(userId: string, message: string, module = "system"): Promise<SmsResult> {
  const phone = await getUserPhone(userId);
  if (!phone) return { ok: false, sent: 0, failed: 1, total: 1, results: [], error: "No phone number on profile or SMS disabled for user" };
  return sendSms({ to: phone, message, module });
}

// ── Pre-built SMS templates ───────────────────────────────────────────────────

export const SmsTemplates = {
  // Procurement
  requisitionSubmitted: (reqNo: string, dept: string, title: string) =>
    `NEW REQUISITION ${reqNo}: "${title}" from ${dept}. Review and approve in EL5 MediProcure.`,

  requisitionApproved: (reqNo: string, title: string, amount?: string) =>
    `APPROVED: Requisition ${reqNo} "${title}" approved.${amount ? " Amount: KES "+amount+"." : ""} Track in EL5 MediProcure.`,

  requisitionRejected: (reqNo: string, reason: string) =>
    `REJECTED: Requisition ${reqNo} rejected. Reason: ${reason}. Login to review and resubmit.`,

  poCreated: (poNo: string, supplier: string, amount: string) =>
    `LPO ${poNo} raised for ${supplier}. Amount: KES ${amount}. Awaiting supplier delivery.`,

  poApproved: (poNo: string, supplier: string) =>
    `LPO APPROVED: ${poNo} for ${supplier}. Proceed with supplier communication.`,

  grnReceived: (grnNo: string, supplier: string, amount?: string) =>
    `GRN ${grnNo}: Goods received from ${supplier}.${amount ? " Value: KES "+amount+"." : ""} Invoice matching required.`,

  // Finance / Accountant
  invoiceMatched: (invoiceNo: string, supplier: string, amount: string) =>
    `INVOICE MATCHED: ${invoiceNo} from ${supplier} — KES ${amount}. Ready for payment approval.`,

  paymentApproved: (voucherNo: string, payee: string, amount: string) =>
    `PAYMENT APPROVED: Voucher ${voucherNo} for ${payee} — KES ${amount}. Ready for export.`,

  paymentProcessed: (amount: string, payee: string, ref: string) =>
    `PAYMENT PROCESSED: KES ${amount} to ${payee}. Ref: ${ref}. EL5 Finance.`,

  budgetAlert: (dept: string, pct: number) =>
    `BUDGET ALERT: ${dept} has consumed ${pct}% of its budget. Review in EL5 MediProcure.`,

  erpSyncComplete: (entity: string, count: number, direction: "push" | "pull") =>
    `ERP SYNC: ${direction === "push" ? "Pushed" : "Pulled"} ${count} ${entity} records to Dynamics 365.`,

  // Tender / Contracts
  tenderPublished: (tenderNo: string, title: string, closing: string) =>
    `TENDER ${tenderNo}: "${title}" published. Closing: ${closing}. Submit via EL5 MediProcure.`,

  contractExpiring: (contractNo: string, supplier: string, days: number) =>
    `CONTRACT EXPIRY: ${contractNo} with ${supplier} expires in ${days} days. Renew or close.`,

  // Security
  loginAlert: (email: string, ip: string, time: string) =>
    `LOGIN ALERT: ${email} logged in from IP ${ip} at ${time}. Not you? Contact IT immediately.`,

  ipDenied: (ip: string, email: string) =>
    `SECURITY: Login attempt from unauthorized IP ${ip} for ${email} blocked. EL5 MediProcure.`,

  // Inventory
  lowStock: (itemName: string, qty: number, reorderLevel: number) =>
    `LOW STOCK: ${itemName} has ${qty} units (reorder at ${reorderLevel}). Create requisition.`,
};
