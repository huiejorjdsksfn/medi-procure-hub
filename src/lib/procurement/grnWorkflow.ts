/**
 * ProcurBosse  -- GRN Workflow Engine v5.0
 * Goods Received Note lifecycle management
 * EL5 MediProcure * Embu Level 5 Hospital
 */
import { supabase } from '@/integrations/supabase/client';
import { logAudit } from '@/lib/audit';
import { notifyProcurement, notifyAccountants, triggerGrnEvent } from '@/lib/notify';

export type GRNStatus = 'pending' | 'inspecting' | 'partial' | 'received' | 'rejected' | 'closed';

export type GRNAction = 'inspect' | 'accept' | 'reject' | 'partial_accept' | 'close';

export interface GRNWorkflowResult {
  success: boolean;
  newStatus?: GRNStatus;
  error?: string;
}

const TRANSITIONS: Record<GRNStatus, Partial<Record<GRNAction, GRNStatus>>> = {
  pending:    { inspect: 'inspecting', accept: 'received', reject: 'rejected' },
  inspecting: { accept: 'received', reject: 'rejected', partial_accept: 'partial' },
  partial:    { accept: 'received' },
  received:   { close: 'closed' },
  rejected:   {},
  closed:     {},
};

const ACTION_ROLES: Record<GRNAction, string[]> = {
  inspect:        ['admin', 'warehouse_officer', 'inventory_manager', 'procurement_officer'],
  accept:         ['admin', 'warehouse_officer', 'inventory_manager'],
  reject:         ['admin', 'warehouse_officer', 'inventory_manager', 'procurement_manager'],
  partial_accept: ['admin', 'warehouse_officer', 'inventory_manager'],
  close:          ['admin', 'procurement_manager', 'accountant'],
};

export function getAvailableGRNActions(currentStatus: string, userRoles: string[]): GRNAction[] {
  const t = TRANSITIONS[currentStatus as GRNStatus];
  if (!t) return [];
  return (Object.keys(t) as GRNAction[]).filter(action =>
    ACTION_ROLES[action].some(role => userRoles.includes(role))
  );
}

export async function executeGRNAction(
  grnId: string,
  action: GRNAction,
  userId: string,
  userName: string,
  options?: { notes?: string }
): Promise<GRNWorkflowResult> {
  const { data: grn, error: fetchErr } = await (supabase as any)
    .from('goods_received').select('*').eq('id', grnId).single();

  if (fetchErr || !grn) return { success: false, error: 'GRN not found' };

  const newStatus = TRANSITIONS[grn.status as GRNStatus]?.[action];
  if (!newStatus) return { success: false, error: `Cannot ${action} a ${grn.status} GRN` };

  const update: any = { status: newStatus, updated_at: new Date().toISOString() };
  if (action === 'inspect') {
    update.inspection_status = 'in_progress';
    update.quality_checked_by = userId;
  }
  if (action === 'accept' || action === 'partial_accept') {
    update.quality_checked = true;
    update.inspection_status = action === 'partial_accept' ? 'partial' : 'passed';
  }
  if (action === 'reject') {
    update.inspection_status = 'failed';
    update.inspection_notes = options?.notes || 'Rejected during inspection';
  }

  const { error: updateErr } = await (supabase as any)
    .from('goods_received').update(update).eq('id', grnId);

  if (updateErr) return { success: false, error: updateErr.message };

  logAudit(userId, userName, action, 'goods_received', grnId, {
    from_status: grn.status, to_status: newStatus,
  });

  try {
    const grnNo = grn.grn_number || grnId.slice(0, 8);
    if (action === 'accept') {
      await notifyAccountants({
        title: `GRN ${grnNo}: Invoice Matching Required`,
        message: `Goods from ${grn.supplier_name || 'supplier'} received  -- match to invoice`,
        type: 'grn', module: 'Finance', actionUrl: '/accountant',
      });
      triggerGrnEvent(grnId).catch(() => {});
    }
    if (action === 'reject') {
      await notifyProcurement({
        title: `GRN ${grnNo} Rejected`,
        message: `Goods rejected: ${options?.notes || 'Quality check failed'}`,
        type: 'error', module: 'Procurement', actionUrl: '/goods-received',
      });
    }
  } catch { /* non-fatal */ }

  return { success: true, newStatus };
}

export function generateGRNNumber(prefix = 'GRN/EL5H'): string {
  const d = new Date();
  return `${prefix}/${d.getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`;
}

export const GRN_STATUS_CONFIG: Record<GRNStatus, { label: string; bg: string; color: string }> = {
  pending:    { label: 'Pending',    bg: '#fef3c7', color: '#92400e' },
  inspecting: { label: 'Inspecting', bg: '#e0f2fe', color: '#0369a1' },
  partial:    { label: 'Partial',    bg: '#dbeafe', color: '#1d4ed8' },
  received:   { label: 'Received',   bg: '#dcfce7', color: '#15803d' },
  rejected:   { label: 'Rejected',   bg: '#fee2e2', color: '#dc2626' },
  closed:     { label: 'Closed',     bg: '#e5e7eb', color: '#374151' },
};
