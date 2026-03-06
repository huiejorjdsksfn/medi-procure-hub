import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useInventory = () => {
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    const { data } = await supabase.from('items').select('*').eq('status', 'active').order('name');
    setItems(data || []);
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from('item_categories').select('*').order('name');
    setCategories(data || []);
  };

  useEffect(() => {
    Promise.all([fetchItems(), fetchCategories()]).finally(() => setLoading(false));
  }, []);

  const lowStockItems = items.filter(i => (i.quantity_in_stock || 0) < (i.reorder_level || 10));
  const outOfStockItems = items.filter(i => (i.quantity_in_stock || 0) <= 0);
  const totalValue = items.reduce((s, i) => s + ((i.quantity_in_stock || 0) * (i.unit_price || 0)), 0);

  return { items, categories, loading, lowStockItems, outOfStockItems, totalValue, refetchItems: fetchItems, refetchCategories: fetchCategories };
};
