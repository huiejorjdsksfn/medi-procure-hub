import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useProcurement = () => {
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequisitions = async () => {
    const { data } = await supabase.from('requisitions').select('*').order('created_at', { ascending: false });
    setRequisitions(data || []);
  };

  const fetchPurchaseOrders = async () => {
    const { data } = await supabase.from('purchase_orders').select('*').order('created_at', { ascending: false });
    setPurchaseOrders(data || []);
  };

  useEffect(() => {
    Promise.all([fetchRequisitions(), fetchPurchaseOrders()]).finally(() => setLoading(false));
  }, []);

  return { requisitions, purchaseOrders, loading, refetchRequisitions: fetchRequisitions, refetchPurchaseOrders: fetchPurchaseOrders };
};
