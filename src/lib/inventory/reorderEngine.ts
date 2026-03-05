export interface ReorderRecommendation {
  item_id: string;
  item_name: string;
  current_stock: number;
  reorder_level: number;
  suggested_quantity: number;
  estimated_cost: number;
  priority: 'critical' | 'high' | 'normal';
}

export const calculateReorderQuantity = (
  reorderLevel: number, currentStock: number, safetyFactor: number = 2
): number => {
  if (currentStock >= reorderLevel) return 0;
  return Math.max((reorderLevel * safetyFactor) - currentStock, reorderLevel);
};

export const getReorderPriority = (currentStock: number, reorderLevel: number): 'critical' | 'high' | 'normal' => {
  if (currentStock <= 0) return 'critical';
  if (currentStock <= reorderLevel * 0.5) return 'high';
  return 'normal';
};

export const generateReorderList = (
  items: { id: string; name: string; quantity_in_stock: number; reorder_level: number; unit_price: number }[]
): ReorderRecommendation[] => {
  return items
    .filter(item => item.quantity_in_stock < item.reorder_level)
    .map(item => {
      const suggestedQty = calculateReorderQuantity(item.reorder_level, item.quantity_in_stock);
      return {
        item_id: item.id,
        item_name: item.name,
        current_stock: item.quantity_in_stock,
        reorder_level: item.reorder_level,
        suggested_quantity: suggestedQty,
        estimated_cost: suggestedQty * item.unit_price,
        priority: getReorderPriority(item.quantity_in_stock, item.reorder_level),
      };
    })
    .sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, normal: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
};
