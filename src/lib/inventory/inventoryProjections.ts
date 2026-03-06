export interface StockProjection {
  itemId: string;
  itemName: string;
  currentStock: number;
  avgDailyUsage: number;
  leadTimeDays: number;
  daysUntilStockout: number;
  projectedStockout: string;
  reorderDate: string;
  suggestedOrderQty: number;
}

export function projectStockout(currentStock: number, avgDailyUsage: number): number {
  if (avgDailyUsage <= 0) return Infinity;
  return Math.floor(currentStock / avgDailyUsage);
}

export function calculateReorderDate(daysUntilStockout: number, leadTimeDays: number): number {
  return Math.max(0, daysUntilStockout - leadTimeDays);
}

export function suggestOrderQuantity(avgDailyUsage: number, leadTimeDays: number, safetyStockDays: number = 7): number {
  return Math.ceil(avgDailyUsage * (leadTimeDays + safetyStockDays));
}

export function generateProjections(
  items: { id: string; name: string; currentStock: number; avgDailyUsage: number; leadTimeDays: number }[]
): StockProjection[] {
  const today = new Date();
  return items.map(item => {
    const daysUntilStockout = projectStockout(item.currentStock, item.avgDailyUsage);
    const reorderInDays = calculateReorderDate(daysUntilStockout, item.leadTimeDays);
    const stockoutDate = new Date(today);
    stockoutDate.setDate(stockoutDate.getDate() + daysUntilStockout);
    const reorderDate = new Date(today);
    reorderDate.setDate(reorderDate.getDate() + reorderInDays);
    return {
      itemId: item.id,
      itemName: item.name,
      currentStock: item.currentStock,
      avgDailyUsage: item.avgDailyUsage,
      leadTimeDays: item.leadTimeDays,
      daysUntilStockout,
      projectedStockout: stockoutDate.toISOString(),
      reorderDate: reorderDate.toISOString(),
      suggestedOrderQty: suggestOrderQuantity(item.avgDailyUsage, item.leadTimeDays),
    };
  }).sort((a, b) => a.daysUntilStockout - b.daysUntilStockout);
}
