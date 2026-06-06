export type AppRole =
  | 'superadmin'
  | 'admin'
  | 'webmaster'
  | 'database_admin'
  | 'requisitioner'
  | 'procurement_officer'
  | 'procurement_manager'
  | 'warehouse_officer'
  | 'inventory_manager'
  | 'accountant';

export interface UserProfile {
  id: string;
  full_name: string;
  department: string | null;
  phone_number: string | null;
  is_active: boolean;
  avatar_url: string | null;
  preferred_language: string;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface UserWithRoles extends UserProfile {
  roles: AppRole[];
}

export const ROLE_LABELS: Record<AppRole, string> = {
  superadmin:           'Super Administrator',
  admin:                'Administrator',
  webmaster:            'Webmaster',
  database_admin:       'Database Admin',
  requisitioner:        'Requisitioner',
  procurement_officer:  'Procurement Officer',
  procurement_manager:  'Procurement Manager',
  warehouse_officer:    'Warehouse Officer',
  inventory_manager:    'Inventory Manager',
  accountant:           'Accountant',
};

// Admin-tier roles — full wildcard permissions
const ADMIN_ROLES: AppRole[] = ['superadmin', 'admin', 'webmaster'];

export const ROLE_PERMISSIONS: Record<AppRole, string[]> = {
  superadmin:          ['*'],
  admin:               ['*'],
  webmaster:           ['*'],
  database_admin:      ['database.manage', 'settings.view', 'settings.manage', 'users.view', 'audit.view'],
  requisitioner:       ['requisitions.create', 'requisitions.view', 'items.view', 'departments.view'],
  procurement_officer: [
    'requisitions.view', 'purchase_orders.create', 'purchase_orders.view',
    'suppliers.manage', 'contracts.manage', 'goods_received.view',
  ],
  procurement_manager: [
    'requisitions.approve', 'requisitions.view',
    'purchase_orders.approve', 'purchase_orders.view',
    'contracts.approve', 'reports.view', 'suppliers.view', 'tenders.manage',
  ],
  warehouse_officer:   ['goods_received.create', 'goods_received.view', 'items.view', 'inventory.view'],
  inventory_manager:   ['items.manage', 'categories.manage', 'departments.view', 'reports.view', 'inventory.manage'],
  accountant:          ['vouchers.manage', 'budgets.view', 'budgets.manage', 'reports.view', 'gl.manage', 'financials.view'],
};

export { ADMIN_ROLES };
