export interface ProcurementKPIs {
  totalSpend: number;
  averageRequisitionValue: number;
  approvalRate: number;
  averageCycleTimeDays: number;
  supplierCount: number;
  contractComplianceRate: number;
  savingsPercentage: number;
}

export const calculateApprovalRate = (approved: number, total: number): number => {
  return total > 0 ? Math.round((approved / total) * 100) : 0;
};

export const calculateAverageCycleTime = (
  requisitions: { submitted_at: string; approved_at: string | null }[]
): number => {
  const completed = requisitions.filter(r => r.approved_at);
  if (completed.length === 0) return 0;
  const totalDays = completed.reduce((sum, r) => {
    const days = (new Date(r.approved_at!).getTime() - new Date(r.submitted_at).getTime()) / (1000 * 60 * 60 * 24);
    return sum + days;
  }, 0);
  return Math.round(totalDays / completed.length);
};

export const calculateInventoryTurnover = (cogs: number, avgInventory: number): number => {
  return avgInventory > 0 ? Math.round((cogs / avgInventory) * 100) / 100 : 0;
};

export const calculateBudgetUtilization = (spent: number, budget: number): number => {
  return budget > 0 ? Math.round((spent / budget) * 100) : 0;
};
