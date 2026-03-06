export interface StockBatch {
  quantity: number;
  unit_cost: number;
  date: string;
}

export const fifoValuation = (batches: StockBatch[], quantityNeeded: number): number => {
  let totalCost = 0;
  let remaining = quantityNeeded;
  const sorted = [...batches].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  for (const batch of sorted) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, batch.quantity);
    totalCost += take * batch.unit_cost;
    remaining -= take;
  }
  return totalCost;
};

export const weightedAverageValuation = (batches: StockBatch[]): number => {
  const totalQty = batches.reduce((s, b) => s + b.quantity, 0);
  const totalCost = batches.reduce((s, b) => s + (b.quantity * b.unit_cost), 0);
  return totalQty > 0 ? totalCost / totalQty : 0;
};

export const calculateInventoryValue = (items: { quantity: number; unit_price: number }[]): number => {
  return items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
};

export const calculateTurnoverRate = (cogs: number, averageInventory: number): number => {
  return averageInventory > 0 ? cogs / averageInventory : 0;
};
