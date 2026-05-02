export const calculateSavings = (budgetAmount: number, actualAmount: number): { amount: number; percentage: number } => {
  const amount = budgetAmount - actualAmount;
  const percentage = budgetAmount > 0 ? (amount / budgetAmount) * 100 : 0;
  return { amount, percentage };
};

export const calculateCycleTime = (submittedAt: string, completedAt: string): number => {
  const start = new Date(submittedAt).getTime();
  const end = new Date(completedAt).getTime();
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
};

export const calculateSupplierScore = (
  deliveryOnTime: number, qualityScore: number, priceCompetitiveness: number
): number => {
  return Math.round((deliveryOnTime * 0.4 + qualityScore * 0.35 + priceCompetitiveness * 0.25));
};

export const formatCurrency = (amount: number, currency: string = 'KSH'): string => {
  return `${currency} ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
};
