import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useContracts = () => {
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContracts = async () => {
    const { data } = await supabase.from('contracts').select('*').order('created_at', { ascending: false });
    setContracts(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchContracts(); }, []);

  const activeContracts = contracts.filter(c => c.status === 'active');
  const expiringContracts = contracts.filter(c => {
    if (c.status !== 'active') return false;
    const daysLeft = (new Date(c.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysLeft <= 30 && daysLeft > 0;
  });
  const totalContractValue = activeContracts.reduce((s, c) => s + Number(c.total_value || 0), 0);

  return { contracts, loading, activeContracts, expiringContracts, totalContractValue, refetchContracts: fetchContracts };
};
