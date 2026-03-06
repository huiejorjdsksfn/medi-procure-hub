export interface CycleCountItem {
  itemId: string;
  itemName: string;
  systemQty: number;
  countedQty: number | null;
  variance: number;
  variancePercent: number;
  status: 'pending' | 'counted' | 'adjusted' | 'verified';
}

export interface CycleCountPlan {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  category: string | null;
  items: CycleCountItem[];
  scheduledDate: string;
  status: 'planned' | 'in_progress' | 'completed';
}

export function calculateVariance(systemQty: number, countedQty: number): { variance: number; variancePercent: number } {
  const variance = countedQty - systemQty;
  const variancePercent = systemQty > 0 ? (variance / systemQty) * 100 : countedQty > 0 ? 100 : 0;
  return { variance, variancePercent: Math.round(variancePercent * 100) / 100 };
}

export function classifyItems(items: { id: string; name: string; annualUsageValue: number }[]): Record<string, string[]> {
  const sorted = [...items].sort((a, b) => b.annualUsageValue - a.annualUsageValue);
  const total = sorted.reduce((s, i) => s + i.annualUsageValue, 0);
  let cumulative = 0;
  const result: Record<string, string[]> = { A: [], B: [], C: [] };
  sorted.forEach(item => {
    cumulative += item.annualUsageValue;
    const pct = (cumulative / total) * 100;
    if (pct <= 80) result.A.push(item.id);
    else if (pct <= 95) result.B.push(item.id);
    else result.C.push(item.id);
  });
  return result;
}

export function getCountFrequency(abcClass: string): string {
  switch (abcClass) {
    case 'A': return 'monthly';
    case 'B': return 'quarterly';
    default: return 'annually';
  }
}

export function generateCountSchedule(
  items: CycleCountItem[],
  frequency: string,
  startDate: string
): CycleCountPlan {
  return {
    id: crypto.randomUUID(),
    name: `Cycle Count - ${new Date(startDate).toLocaleDateString()}`,
    frequency: frequency as any,
    category: null,
    items,
    scheduledDate: startDate,
    status: 'planned',
  };
}
