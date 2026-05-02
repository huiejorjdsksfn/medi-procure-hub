import { supabase } from '@/integrations/supabase/client';

export const getStockLevel = async (itemId: string): Promise<number> => {
  const { data } = await supabase.from('items').select('quantity_in_stock').eq('id', itemId).single();
  return data?.quantity_in_stock || 0;
};

export const updateStockLevel = async (itemId: string, newQuantity: number): Promise<boolean> => {
  const { error } = await supabase.from('items').update({ quantity_in_stock: newQuantity } as any).eq('id', itemId);
  return !error;
};

export const adjustStock = async (itemId: string, adjustment: number): Promise<boolean> => {
  const current = await getStockLevel(itemId);
  return updateStockLevel(itemId, current + adjustment);
};

export const getLowStockItems = async (threshold: number = 10) => {
  const { data } = await supabase.from('items')
    .select('id, name, sku, quantity_in_stock, reorder_level')
    .lt('quantity_in_stock', threshold)
    .eq('status', 'active')
    .order('quantity_in_stock');
  return data || [];
};

export const getOutOfStockItems = async () => {
  const { data } = await supabase.from('items')
    .select('id, name, sku')
    .lte('quantity_in_stock', 0)
    .eq('status', 'active');
  return data || [];
};
