import { Requisition } from '@/types/procurement';

export type WorkflowAction = 'submit' | 'approve' | 'reject' | 'forward' | 'cancel';

export const WORKFLOW_TRANSITIONS: Record<string, WorkflowAction[]> = {
  draft: ['submit', 'cancel'],
  pending: ['approve', 'reject', 'forward'],
  forwarded: ['approve', 'reject'],
  approved: [],
  rejected: [],
  cancelled: [],
};

export const canTransition = (currentStatus: string, action: WorkflowAction): boolean => {
  const allowed = WORKFLOW_TRANSITIONS[currentStatus] || [];
  return allowed.includes(action);
};

export const getNextStatus = (action: WorkflowAction): string => {
  switch (action) {
    case 'submit': return 'pending';
    case 'approve': return 'approved';
    case 'reject': return 'rejected';
    case 'forward': return 'forwarded';
    case 'cancel': return 'cancelled';
    default: return 'pending';
  }
};

export const calculateRequisitionTotal = (items: { quantity: number; unit_price: number }[]): number => {
  return items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
};

export const generateRequisitionNumber = (prefix: string = 'RQQ/EL5H'): string => {
  const d = new Date();
  const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}/${dateStr}/${randomStr}`;
};

export const needsApproval = (requisition: Requisition, threshold: number): boolean => {
  return requisition.total_amount >= threshold;
};
