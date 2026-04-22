/**
 * ProcurBosse — Tender Workflow Engine v5.8
 * Draft → Published → Evaluation → Awarded / Cancelled
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { supabase } from '@/integrations/supabase/client';
import { logAudit } from '@/lib/audit';
import { notifyProcurement, notifyRole } from '@/lib/notify';

export type TenderStatus = 'draft' | 'published' | 'evaluation' | 'awarded' | 'cancelled' | 'closed';
export type TenderAction = 'publish' | 'start_evaluation' | 'award' | 'cancel' | 'close';

export interface TenderWorkflowResult {
  success: boolean;
  newStatus?: TenderStatus;
  error?: string;
}

const TRANSITIONS: Record<TenderStatus, Partial<Record<TenderAction, TenderStatus>>> = {
  draft:      { publish: 'published', cancel: 'cancelled' },
  published:  { start_evaluation: 'evaluation', cancel: 'cancelled' },
  evaluation: { award: 'awarded', cancel: 'cancelled' },
  awarded:    { close: 'closed' },
  cancelled:  {},
  closed:     {},
};

const ACTION_ROLES: Record<TenderAction, string[]> = {
  publish:          ['admin', 'procurement_manager'],
  start_evaluation: ['admin', 'procurement_manager', 'procurement_officer'],
  award:            ['admin', 'procurement_manager'],
  cancel:           ['admin', 'procurement_manager'],
  close:            ['admin', 'procurement_manager'],
};

export function getAvailableTenderActions(currentStatus: string, userRoles: string[]): TenderAction[] {
  const t = TRANSITIONS[currentStatus as TenderStatus];
  if (!t) return [];
  return (Object.keys(t) as TenderAction[]).filter(action =>
    ACTION_ROLES[action].some(role => userRoles.includes(role))
  );
}

export async function executeTenderAction(
  tenderId: string,
  action: TenderAction,
  userId: string,
  userName: string,
  options?: { reason?: string; awardedTo?: string }
): Promise<TenderWorkflowResult> {
  const { data: tender, error: fetchErr } = await (supabase as any)
    .from('tenders').select('*').eq('id', tenderId).single();

  if (fetchErr || !tender) return { success: false, error: 'Tender not found' };

  const newStatus = TRANSITIONS[tender.status as TenderStatus]?.[action];
  if (!newStatus) return { success: false, error: `Cannot ${action} a ${tender.status} tender` };

  const update: any = { status: newStatus, updated_at: new Date().toISOString() };
  if (action === 'publish') {
    update.published_at = new Date().toISOString();
  }
  if (action === 'award') {
    update.awarded_to = options?.awardedTo || null;
    update.awarded_at = new Date().toISOString();
  }

  const { error: updateErr } = await (supabase as any)
    .from('tenders').update(update).eq('id', tenderId);

  if (updateErr) return { success: false, error: updateErr.message };

  logAudit(userId, userName, action, 'tenders', tenderId, {
    from_status: tender.status, to_status: newStatus,
  });

  try {
    const tNo = tender.tender_number || tenderId.slice(0, 8);
    if (action === 'publish') {
      await notifyRole(['procurement_officer', 'procurement_manager'], {
        title: `Tender ${tNo} Published`,
        message: `"${tender.title}" is now open for bidding`,
        type: 'tender', module: 'Tenders', actionUrl: '/tenders',
      });
    }
    if (action === 'award') {
      await notifyProcurement({
        title: `Tender ${tNo} Awarded`,
        message: `Tender awarded — proceed with contract creation`,
        type: 'success', module: 'Tenders', actionUrl: '/tenders',
      });
    }
  } catch { /* non-fatal */ }

  return { success: true, newStatus };
}

export const TENDER_STATUS_CONFIG: Record<TenderStatus, { label: string; bg: string; color: string }> = {
  draft:      { label: 'Draft',      bg: '#f3f4f6', color: '#6b7280' },
  published:  { label: 'Published',  bg: '#dbeafe', color: '#1d4ed8' },
  evaluation: { label: 'Evaluation', bg: '#fef3c7', color: '#92400e' },
  awarded:    { label: 'Awarded',    bg: '#dcfce7', color: '#15803d' },
  cancelled:  { label: 'Cancelled',  bg: '#fee2e2', color: '#dc2626' },
  closed:     { label: 'Closed',     bg: '#e5e7eb', color: '#374151' },
};
