/**
 * ProcurBosse — Contract Workflow Engine v5.8
 * Draft → Active → Renewed / Expired / Terminated
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { supabase } from '@/integrations/supabase/client';
import { logAudit } from '@/lib/audit';
import { notifyProcurement } from '@/lib/notify';

export type ContractStatus = 'draft' | 'pending' | 'active' | 'renewed' | 'expired' | 'terminated' | 'cancelled';
export type ContractAction = 'submit' | 'approve' | 'reject' | 'renew' | 'terminate' | 'cancel';

export interface ContractWorkflowResult {
  success: boolean;
  newStatus?: ContractStatus;
  error?: string;
}

const TRANSITIONS: Record<ContractStatus, Partial<Record<ContractAction, ContractStatus>>> = {
  draft:      { submit: 'pending', cancel: 'cancelled' },
  pending:    { approve: 'active', reject: 'draft', cancel: 'cancelled' },
  active:     { renew: 'renewed', terminate: 'terminated' },
  renewed:    { terminate: 'terminated' },
  expired:    { renew: 'renewed' },
  terminated: {},
  cancelled:  {},
};

const ACTION_ROLES: Record<ContractAction, string[]> = {
  submit:    ['admin', 'procurement_officer', 'procurement_manager'],
  approve:   ['admin', 'procurement_manager'],
  reject:    ['admin', 'procurement_manager'],
  renew:     ['admin', 'procurement_manager'],
  terminate: ['admin', 'procurement_manager'],
  cancel:    ['admin', 'procurement_manager'],
};

export function getAvailableContractActions(currentStatus: string, userRoles: string[]): ContractAction[] {
  const t = TRANSITIONS[currentStatus as ContractStatus];
  if (!t) return [];
  return (Object.keys(t) as ContractAction[]).filter(action =>
    ACTION_ROLES[action].some(role => userRoles.includes(role))
  );
}

export async function executeContractAction(
  contractId: string,
  action: ContractAction,
  userId: string,
  userName: string,
  options?: { reason?: string }
): Promise<ContractWorkflowResult> {
  const { data: contract, error: fetchErr } = await (supabase as any)
    .from('contracts').select('*').eq('id', contractId).single();

  if (fetchErr || !contract) return { success: false, error: 'Contract not found' };

  const newStatus = TRANSITIONS[contract.status as ContractStatus]?.[action];
  if (!newStatus) return { success: false, error: `Cannot ${action} a ${contract.status} contract` };

  const update: any = { status: newStatus, updated_at: new Date().toISOString() };
  if (action === 'approve') {
    update.signed_by = userId;
    update.signed_date = new Date().toISOString();
  }
  if (action === 'renew') {
    update.renewal_count = (contract.renewal_count || 0) + 1;
  }

  const { error: updateErr } = await (supabase as any)
    .from('contracts').update(update).eq('id', contractId);

  if (updateErr) return { success: false, error: updateErr.message };

  logAudit(userId, userName, action, 'contracts', contractId, {
    from_status: contract.status, to_status: newStatus,
  });

  try {
    const cNo = contract.contract_number || contractId.slice(0, 8);
    if (action === 'approve') {
      await notifyProcurement({
        title: `Contract ${cNo} Approved`,
        message: `Contract "${contract.title}" is now active`,
        type: 'procurement', module: 'Contracts', actionUrl: '/contracts',
      });
    }
    if (action === 'terminate') {
      await notifyProcurement({
        title: `Contract ${cNo} Terminated`,
        message: `${options?.reason || 'Contract terminated'}`,
        type: 'warning', module: 'Contracts', actionUrl: '/contracts',
      });
    }
  } catch { /* non-fatal */ }

  return { success: true, newStatus };
}

export const CONTRACT_STATUS_CONFIG: Record<ContractStatus, { label: string; bg: string; color: string }> = {
  draft:      { label: 'Draft',      bg: '#f3f4f6', color: '#6b7280' },
  pending:    { label: 'Pending',    bg: '#fef3c7', color: '#92400e' },
  active:     { label: 'Active',     bg: '#dcfce7', color: '#15803d' },
  renewed:    { label: 'Renewed',    bg: '#dbeafe', color: '#1d4ed8' },
  expired:    { label: 'Expired',    bg: '#fee2e2', color: '#dc2626' },
  terminated: { label: 'Terminated', bg: '#fce7f3', color: '#be185d' },
  cancelled:  { label: 'Cancelled',  bg: '#e5e7eb', color: '#374151' },
};
