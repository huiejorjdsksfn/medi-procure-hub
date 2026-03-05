import { createContext, useContext, useState, ReactNode } from 'react';

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
}

interface SettingsContextType {
  settings: SystemSettings;
  updateSettings: (updates: Partial<SystemSettings>) => void;
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
  updateSettings: () => {},
});

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);

  const updateSettings = (updates: Partial<SystemSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};
