/**
 * ProcurBosse - Purchase Order Workflow Engine v5.0
 * Complete state machine for PO lifecycle
 * EL5 MediProcure - Embu Level 5 Hospital
 */
import { supabase } from '@/integrations/supabase/client';
import { logAudit } from '@/lib/audit';
import { sendNotification, notifyProcurement, notifyRole } from '@/lib/notify';

export type POStatus = 'draft' | 'pending' | 'approved' | 'sent' | 'partial' | 'received' | 'cancelled' | 'closed';

export type POAction = 'submit' | 'approve' | 'reject' | 'send_to_supplier' | 'mark_partial' | 'mark_received' | 'cancel' | 'close';

export interface POWorkflowResult {
  success: boolean;
  newStatus?: POStatus;
  error?: string;
}

const TRANSITIONS: Record<POStatus, Partial<Record<POAction, POStatus>>> = {
  draft:      { submit: 'pending', cancel: 'cancelled' },
  pending:    { approve: 'approved', reject: 'draft', cancel: 'cancelled' },
  approved:   { send_to_supplier: 'sent', cancel: 'cancelled' },
  sent:       { mark_partial: 'partial', mark_received: 'received', cancel: 'cancelled' },
  partial:    { mark_received: 'received' },
  received:   { close: 'closed' },
  cancelled:  {},
  closed:     {},
};

const ACTION_ROLES: Record<POAction, string[]> = {
  submit:           ['admin', 'procurement_officer', 'procurement_manager'],
  approve:          ['admin', 'procurement_manager'],
  reject:           ['admin', 'procurement_manager'],
  send_to_supplier: ['admin', 'procurement_officer', 'procurement_manager'],
  mark_partial:     ['admin', 'warehouse_officer', 'inventory_manager'],
  mark_received:    ['admin', 'warehouse_officer', 'inventory_manager'],
  cancel:           ['admin', 'procurement_manager'],
  close:            ['admin', 'procurement_manager', 'accountant'],
};

export function canPOTransition(currentStatus: string, action: POAction): boolean {
  return !!(TRANSITIONS[currentStatus as POStatus]?.[action]);
}

export function getPONextStatus(currentStatus: string, action: POAction): POStatus | null {
  return TRANSITIONS[currentStatus as POStatus]?.[action] ?? null;
}

export function getAvailablePOActions(currentStatus: string, userRoles: string[]): POAction[] {
  const t = TRANSITIONS[currentStatus as POStatus];
  if (!t) return [];
  return (Object.keys(t) as POAction[]).filter(action =>
    ACTION_ROLES[action].some(role => userRoles.includes(role))
  );
}

export async function executePOAction(
  poId: string,
  action: POAction,
  userId: string,
  userName: string,
  options?: { reason?: string }
): Promise<POWorkflowResult> {
  const { data: po, error: fetchErr } = await (supabase as any)
    .from('purchase_orders').select('*').eq('id', poId).single();

  if (fetchErr || !po) return { success: false, error: 'Purchase order not found' };

  const newStatus = getPONextStatus(po.status, action);
  if (!newStatus) return { success: false, error: `Cannot ${action} a ${po.status} PO` };

  const update: any = { status: newStatus, updated_at: new Date().toISOString() };
  if (action === 'approve') {
    update.approved_by = userId;
    update.approved_at = new Date().toISOString();
  }
  if (action === 'reject') {
    update.rejection_reason = options?.reason || 'Rejected';
  }

  const { error: updateErr } = await (supabase as any)
    .from('purchase_orders').update(update).eq('id', poId);

  if (updateErr) return { success: false, error: updateErr.message };

  logAudit(userId, userName, action, 'purchase_orders', poId, {
    from_status: po.status, to_status: newStatus,
  });

  try {
    const poNo = po.po_number || po.id?.slice(0, 8);
    if (action === 'approve') {
      await notifyProcurement({
        title: `PO ${poNo} Approved`,
        message: `Purchase order approved - ready to send to supplier`,
        type: 'procurement', module: 'Procurement', actionUrl: '/purchase-orders',
      });
    }
    if (action === 'send_to_supplier') {
      await notifyRole(['warehouse_officer', 'inventory_manager'], {
        title: `Delivery Expected: ${poNo}`,
        message: `PO sent to ${po.supplier_name || 'supplier'} - prepare for receiving`,
        type: 'grn', module: 'Procurement', actionUrl: '/goods-received',
      });
    }
    if (action === 'mark_received') {
      await notifyProcurement({
        title: `PO ${poNo} Fully Received`,
        message: `All items received - ready for invoice matching`,
        type: 'success', module: 'Procurement', actionUrl: '/purchase-orders',
      });
    }
  } catch { /* non-fatal */ }

  return { success: true, newStatus };
}

export function generatePONumber(prefix = 'LPO/EL5H'): string {
  const d = new Date();
  return `${prefix}/${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${Math.floor(1000 + Math.random() * 9000)}`;
}

export const PO_STATUS_CONFIG: Record<POStatus, { label: string; bg: string; color: string }> = {
  draft:     { label: 'Draft',     bg: '#f3f4f6', color: '#6b7280' },
  pending:   { label: 'Pending',   bg: '#fef3c7', color: '#92400e' },
  approved:  { label: 'Approved',  bg: '#dcfce7', color: '#15803d' },
  sent:      { label: 'Sent',      bg: '#dbeafe', color: '#1d4ed8' },
  partial:   { label: 'Partial',   bg: '#e0f2fe', color: '#0369a1' },
  received:  { label: 'Received',  bg: '#d1fae5', color: '#065f46' },
  cancelled: { label: 'Cancelled', bg: '#fee2e2', color: '#dc2626' },
  closed:    { label: 'Closed',    bg: '#e5e7eb', color: '#374151' },
};
