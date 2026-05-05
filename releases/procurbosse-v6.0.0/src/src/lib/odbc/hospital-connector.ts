import { ODBCConfig, buildConnectionString } from './index';

export interface HospitalSyncConfig extends ODBCConfig {
  syncInterval: number; // minutes
  tables: string[];
  lastSyncAt: string | null;
}

export const HOSPITAL_TABLES = [
  'patients', 'departments', 'supplies', 'staff',
  'pharmacy_items', 'lab_items', 'equipment',
];

export const buildHospitalQuery = (table: string, lastSync?: string): string => {
  const base = `SELECT * FROM ${table}`;
  if (lastSync) return `${base} WHERE updated_at > '${lastSync}'`;
  return base;
};

export const mapHospitalSupplyToItem = (supply: any) => ({
  name: supply.supply_name || supply.item_name,
  description: supply.description || null,
  sku: supply.supply_code || supply.item_code,
  unit_price: supply.unit_cost || 0,
  quantity_in_stock: supply.current_stock || 0,
  item_type: supply.category === 'pharmaceutical' ? 'pharmaceutical' : 'consumable',
  unit_of_measure: supply.uom || 'piece',
});

export const validateConnection = (config: ODBCConfig): string[] => {
  const errors: string[] = [];
  if (!config.server) errors.push('Server is required');
  if (!config.database) errors.push('Database is required');
  if (!config.username) errors.push('Username is required');
  if (!config.password) errors.push('Password is required');
  return errors;
};
