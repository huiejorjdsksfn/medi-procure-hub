/**
 * ProcurBosse  -- Requisition Workflow Engine v4.0
 * Complete state machine for requisition lifecycle
 * EL5 MediProcure * Embu Level 5 Hospital
 */
import { supabase } from '@/integrations/supabase/client';
import { logAudit } from '@/lib/audit';
import { sendNotification, notifyProcurement, notifyAccountants, triggerRequisitionEvent } from '@/lib/notify';

// -- Status definitions --------------------------------------------------------
export type RequisitionStatus =
  | 'draft' | 'submitted' | 'pending' | 'forwarded'
  | 'approved' | 'rejected' | 'cancelled'
  | 'ordered' | 'partially_received' | 'received' | 'closed';

export type RequisitionAction =
  | 'submit' | 'approve' | 'reject' | 'forward' | 'cancel'
  | 'resubmit' | 'mark_ordered' | 'mark_received' | 'close';

export interface WorkflowResult {
  success: boolean;
  newStatus?: RequisitionStatus;
  error?: string;
}

// -- State machine transitions -------------------------------------------------
const TRANSITIONS: Record<RequisitionStatus, Partial<Record<RequisitionAction, RequisitionStatus>>> = {
  draft:                { submit: 'submitted', cancel: 'cancelled' },
  submitted:            { approve: 'approved', reject: 'rejected', forward: 'forwarded', cancel: 'cancelled' },
  pending:              { approve: 'approved', reject: 'rejected', forward: 'forwarded' },
  forwarded:            { approve: 'approved', reject: 'rejected' },
  approved:             { mark_ordered: 'ordered', cancel: 'cancelled' },
  rejected:             { resubmit: 'submitted', cancel: 'cancelled' },
  cancelled:            { resubmit: 'draft' },
  ordered:              { mark_received: 'received' },
  partially_received:   { mark_received: 'received' },
  received:             { close: 'closed' },
  closed:               {},
};

// -- Role-based action permissions ---------------------------------------------
const ACTION_ROLES: Record<RequisitionAction, string[]> = {
  submit:         ['admin', 'requisitioner', 'procurement_officer', 'procurement_manager', 'accountant', 'inventory_manager', 'database_admin'],
  approve:        ['admin', 'procurement_manager'],
  reject:         ['admin', 'procurement_manager'],
  forward:        ['admin', 'procurement_manager'],
  cancel:         ['admin', 'procurement_manager', 'requisitioner'],
  resubmit:       ['admin', 'requisitioner', 'procurement_officer'],
  mark_ordered:   ['admin', 'procurement_officer', 'procurement_manager'],
  mark_received:  ['admin', 'warehouse_officer', 'inventory_manager'],
  close:          ['admin', 'procurement_manager', 'accountant'],
};

// -- Core functions ------------------------------------------------------------

export function canTransition(currentStatus: string, action: RequisitionAction): boolean {
  const transitions = TRANSITIONS[currentStatus as RequisitionStatus];
  return transitions ? action in transitions : false;
}

export function getNextStatus(currentStatus: string, action: RequisitionAction): RequisitionStatus | null {
  const transitions = TRANSITIONS[currentStatus as RequisitionStatus];
  return transitions?.[action] ?? null;
}

export function getAvailableActions(currentStatus: string, userRoles: string[]): RequisitionAction[] {
  const transitions = TRANSITIONS[currentStatus as RequisitionStatus];
  if (!transitions) return [];
  return (Object.keys(transitions) as RequisitionAction[]).filter(action => {
    const allowedRoles = ACTION_ROLES[action];
    return allowedRoles.some(role => userRoles.includes(role));
  });
}

export function canUserPerformAction(action: RequisitionAction, userRoles: string[]): boolean {
  const allowedRoles = ACTION_ROLES[action];
  return allowedRoles.some(role => userRoles.includes(role));
}

// -- Execute workflow transition -----------------------------------------------

export async function executeRequisitionAction(
  requisitionId: string,
  action: RequisitionAction,
  userId: string,
  userName: string,
  options?: { reason?: string; forwardTo?: string }
): Promise<WorkflowResult> {
  // 1. Fetch current requisition
  const { data: req, error: fetchErr } = await (supabase as any)
    .from('requisitions').select('*').eq('id', requisitionId).single();

  if (fetchErr || !req) return { success: false, error: 'Requisition not found' };

  // 2. Validate transition
  const newStatus = getNextStatus(req.status, action);
  if (!newStatus) return { success: false, error: `Cannot ${action} a ${req.status} requisition` };

  // 3. Build update payload
  const update: any = { status: newStatus, updated_at: new Date().toISOString() };

  if (action === 'approve') {
    update.approved_by = userId;
    update.approved_by_name = userName;
    update.approved_at = new Date().toISOString();
  }
  if (action === 'reject') {
    update.rejection_reason = options?.reason || 'Rejected by approver';
  }
  if (action === 'forward') {
    update.forwarded_to = options?.forwardTo || null;
  }

  // 4. Update database
  const { error: updateErr } = await (supabase as any)
    .from('requisitions').update(update).eq('id', requisitionId);

  if (updateErr) return { success: false, error: updateErr.message };

  // 5. Audit log
  logAudit(userId, userName, action, 'requisitions', requisitionId, {
    from_status: req.status, to_status: newStatus, reason: options?.reason
  });

  // 6. Notifications
  try {
    await dispatchRequisitionNotifications(action, req, userId, userName, options);
  } catch { /* non-fatal */ }

  return { success: true, newStatus };
}

// -- Notification dispatcher ---------------------------------------------------

async function dispatchRequisitionNotifications(
  action: RequisitionAction,
  req: any,
  userId: string,
  userName: string,
  options?: { reason?: string }
) {
  const reqNo = req.requisition_number || req.id?.slice(0, 8).toUpperCase();
  const title = req.title || 'Untitled';

  switch (action) {
    case 'submit':
      await notifyProcurement({
        title: `New Requisition: ${reqNo}`,
        message: `${userName} submitted "${title}" for approval`,
        type: 'procurement',
        module: 'Procurement',
        actionUrl: '/requisitions',
      });
      triggerRequisitionEvent('submitted', req.id).catch(() => {});
      break;

    case 'approve':
      if (req.requested_by) {
        await sendNotification({
          userId: req.requested_by,
          title: `Requisition ${reqNo} Approved `,
          message: `Your requisition "${title}" has been approved by ${userName}`,
          type: 'success',
          module: 'Procurement',
          actionUrl: '/requisitions',
        });
      }
      await notifyAccountants({
        title: `Budget Alert: ${reqNo} Approved`,
        message: `Requisition "${title}" approved  -- track budget impact`,
        type: 'voucher',
        module: 'Finance',
        actionUrl: '/accountant',
      });
      triggerRequisitionEvent('approved', req.id, { approvedBy: userId }).catch(() => {});
      break;

    case 'reject':
      if (req.requested_by) {
        await sendNotification({
          userId: req.requested_by,
          title: `Requisition ${reqNo} Rejected`,
          message: `Reason: ${options?.reason || 'See approver for details'}`,
          type: 'error',
          module: 'Procurement',
          actionUrl: '/requisitions',
        });
      }
      triggerRequisitionEvent('rejected', req.id, { rejectedReason: options?.reason }).catch(() => {});
      break;

    case 'mark_ordered':
      if (req.requested_by) {
        await sendNotification({
          userId: req.requested_by,
          title: `LPO Raised: ${reqNo}`,
          message: `Purchase order created for "${title}"`,
          type: 'procurement',
          module: 'Procurement',
          actionUrl: '/purchase-orders',
        });
      }
      triggerRequisitionEvent('ordered', req.id).catch(() => {});
      break;

    case 'mark_received':
      triggerRequisitionEvent('received', req.id).catch(() => {});
      break;
  }
}

// -- Utility functions ---------------------------------------------------------

export function calculateRequisitionTotal(items: { quantity: number; unit_price: number }[]): number {
  return items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
}

export function generateRequisitionNumber(prefix = 'RQQ/EL5H'): string {
  const d = new Date();
  const yr = d.getFullYear();
  const seq = String(Math.floor(1000 + Math.random() * 9000));
  return `${prefix}/${yr}/${seq}`;
}

export function needsApproval(totalAmount: number, threshold: number): boolean {
  return totalAmount >= threshold;
}

// -- Status display helpers ----------------------------------------------------

export const STATUS_CONFIG: Record<RequisitionStatus, { label: string; bg: string; color: string; dot: string }> = {
  draft:                { label: 'Draft',       bg: '#f1f5f9', color: '#475569', dot: '#94a3b8' },
  submitted:            { label: 'Submitted',   bg: '#dbeafe', color: '#1d4ed8', dot: '#3b82f6' },
  pending:              { label: 'Pending',     bg: '#fef9c3', color: '#854d0e', dot: '#eab308' },
  forwarded:            { label: 'Forwarded',   bg: '#f3e8ff', color: '#7c3aed', dot: '#8b5cf6' },
  approved:             { label: 'Approved',    bg: '#dcfce7', color: '#15803d', dot: '#22c55e' },
  rejected:             { label: 'Rejected',    bg: '#fee2e2', color: '#dc2626', dot: '#ef4444' },
  cancelled:            { label: 'Cancelled',   bg: '#f3f4f6', color: '#6b7280', dot: '#9ca3af' },
  ordered:              { label: 'Ordered',     bg: '#e0f2fe', color: '#0369a1', dot: '#0ea5e9' },
  partially_received:   { label: 'Partial',     bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
  received:             { label: 'Received',    bg: '#d1fae5', color: '#065f46', dot: '#10b981' },
  closed:               { label: 'Closed',      bg: '#e5e7eb', color: '#374151', dot: '#6b7280' },
};
