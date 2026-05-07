/**
 * ProcurBosse - Settings Context v5.0
 * Real-time synced system settings from Supabase system_settings table
 * Falls back to defaults if DB unavailable
 * EL5 MediProcure - Embu Level 5 Hospital
 */
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTableRealtime } from '@/hooks/useRealtime';

interface SystemSettings {
  hospital_name: string;
  tax_rate: number;
  currency: string;
  approval_threshold: number;
  auto_po_numbering: boolean;
  email_notifications: boolean;
  audit_retention_days: number;
  fiscal_year_start: string;
  requisition_prefix: string;
  po_prefix: string;
  grn_prefix: string;
  [key: string]: any;
}

interface SettingsContextType {
  settings: SystemSettings;
  updateSettings: (updates: Partial<SystemSettings>) => Promise<void>;
  loading: boolean;
  refresh: () => void;
}

const defaultSettings: SystemSettings = {
  hospital_name: 'Embu Level 5 Hospital',
  tax_rate: 16,
  currency: 'KSH',
  approval_threshold: 50000,
  auto_po_numbering: true,
  email_notifications: true,
  audit_retention_days: 365,
  fiscal_year_start: 'July',
  requisition_prefix: 'RQQ/EL5H',
  po_prefix: 'LPO/EL5H',
  grn_prefix: 'GRN/EL5H',
};

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  updateSettings: async () => {},
  loading: true,
  refresh: () => {},
});

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from('system_settings')
        .select('key, value')
        .limit(200);
      if (data && data.length > 0) {
        const merged = { ...defaultSettings };
        for (const row of data) {
          const k = row.key as string;
          const v = row.value as string;
          if (k in merged) {
            const def = (defaultSettings as any)[k];
            if (typeof def === 'number') (merged as any)[k] = Number(v) || def;
            else if (typeof def === 'boolean') (merged as any)[k] = v === 'true';
            else (merged as any)[k] = v || def;
          } else {
            (merged as any)[k] = v;
          }
        }
        setSettings(merged);
      }
    } catch {
      // use defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  // Real-time sync - refetch when system_settings changes
  useTableRealtime('system_settings', fetchSettings, 500);

  const updateSettings = async (updates: Partial<SystemSettings>) => {
    // Optimistic local update
    setSettings(prev => ({ ...prev, ...updates }));

    // Persist each key to DB
    const entries = Object.entries(updates);
    for (const [key, value] of entries) {
      await (supabase as any)
        .from('system_settings')
        .upsert({ key, value: String(value), updated_at: new Date().toISOString() }, { onConflict: 'key' });
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, loading, refresh: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};
