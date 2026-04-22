/**
 * ProcurBosse — Voucher Workflow Engine v5.0
 * Payment, receipt, journal, purchase & counter-requisition voucher lifecycle
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { supabase } from '@/integrations/supabase/client';
import { logAudit } from '@/lib/audit';
import { notifyProcurement, notifyAccountants, triggerVoucherEvent } from '@/lib/notify';

export type VoucherStatus = 'draft' | 'pending' | 'approved' | 'paid' | 'rejected' | 'cancelled';

export type VoucherAction = 'submit' | 'approve' | 'reject' | 'pay' | 'cancel';

export interface VoucherWorkflowResult {
  success: boolean;
  newStatus?: VoucherStatus;
  error?: string;
}

const TRANSITIONS: Record<VoucherStatus, Partial<Record<VoucherAction, VoucherStatus>>> = {
  draft:     { submit: 'pending', cancel: 'cancelled' },
  pending:   { approve: 'approved', reject: 'rejected', cancel: 'cancelled' },
  approved:  { pay: 'paid', cancel: 'cancelled' },
  paid:      {},
  rejected:  { submit: 'pending' },
  cancelled: {},
};

const ACTION_ROLES: Record<VoucherAction, string[]> = {
  submit:  ['admin', 'accountant', 'procurement_officer'],
  approve: ['admin', 'procurement_manager'],
  reject:  ['admin', 'procurement_manager'],
  pay:     ['admin', 'accountant'],
  cancel:  ['admin', 'procurement_manager'],
};

export function getAvailableVoucherActions(currentStatus: string, userRoles: string[]): VoucherAction[] {
  const t = TRANSITIONS[currentStatus as VoucherStatus];
  if (!t) return [];
  return (Object.keys(t) as VoucherAction[]).filter(action =>
    ACTION_ROLES[action].some(role => userRoles.includes(role))
  );
}

export async function executeVoucherAction(
  table: string,
  voucherId: string,
  action: VoucherAction,
  userId: string,
  userName: string,
  options?: { reason?: string }
): Promise<VoucherWorkflowResult> {
  const { data: voucher, error: fetchErr } = await (supabase as any)
    .from(table).select('*').eq('id', voucherId).single();

  if (fetchErr || !voucher) return { success: false, error: 'Voucher not found' };

  const newStatus = TRANSITIONS[voucher.status as VoucherStatus]?.[action];
  if (!newStatus) return { success: false, error: `Cannot ${action} a ${voucher.status} voucher` };

  const update: any = { status: newStatus, updated_at: new Date().toISOString() };
  if (action === 'approve') {
    update.approved_by = userId;
    update.approved_at = new Date().toISOString();
  }
  if (action === 'reject') {
    update.rejection_reason = options?.reason || 'Rejected';
  }
  if (action === 'pay') {
    update.paid_at = new Date().toISOString();
    update.paid_by = userId;
  }

  const { error: updateErr } = await (supabase as any)
    .from(table).update(update).eq('id', voucherId);

  if (updateErr) return { success: false, error: updateErr.message };

  logAudit(userId, userName, action, table, voucherId, {
    from_status: voucher.status, to_status: newStatus,
  });

  try {
    const vNo = voucher.voucher_number || voucher.pv_number || voucherId.slice(0, 8);
    if (action === 'approve' && table === 'payment_vouchers') {
      await notifyAccountants({
        title: `Voucher ${vNo} Approved`,
        message: `Payment voucher approved — ready for payment processing`,
        type: 'voucher', module: 'Finance', actionUrl: '/vouchers/payment',
      });
      triggerVoucherEvent('voucher_approved', voucherId).catch(() => {});
    }
    if (action === 'pay') {
      await notifyProcurement({
        title: `Payment Processed: ${vNo}`,
        message: `Payment for ${voucher.payee_name || 'payee'} completed`,
        type: 'success', module: 'Finance', actionUrl: '/vouchers/payment',
      });
      triggerVoucherEvent('voucher_paid', voucherId).catch(() => {});
    }
  } catch { /* non-fatal */ }

  return { success: true, newStatus };
}

export const VOUCHER_STATUS_CONFIG: Record<VoucherStatus, { label: string; bg: string; color: string }> = {
  draft:     { label: 'Draft',     bg: '#f3f4f6', color: '#6b7280' },
  pending:   { label: 'Pending',   bg: '#fef3c7', color: '#92400e' },
  approved:  { label: 'Approved',  bg: '#dcfce7', color: '#15803d' },
  paid:      { label: 'Paid',      bg: '#dbeafe', color: '#1d4ed8' },
  rejected:  { label: 'Rejected',  bg: '#fee2e2', color: '#dc2626' },
  cancelled: { label: 'Cancelled', bg: '#e5e7eb', color: '#374151' },
};
