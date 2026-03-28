export type AppRole =
  | 'admin'
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
  admin: 'Administrator',
  requisitioner: 'Requisitioner',
  procurement_officer: 'Procurement Officer',
  procurement_manager: 'Procurement Manager',
  warehouse_officer: 'Warehouse Officer',
  inventory_manager: 'Inventory Manager',
};

export const ROLE_PERMISSIONS: Record<AppRole, string[]> = {
  admin: ['*'],
  requisitioner: ['requisitions.create', 'requisitions.view', 'items.view'],
  procurement_officer: ['requisitions.view', 'purchase_orders.create', 'purchase_orders.view', 'suppliers.manage', 'contracts.manage'],
  procurement_manager: ['requisitions.approve', 'purchase_orders.approve', 'contracts.approve', 'reports.view'],
  warehouse_officer: ['goods_received.create', 'goods_received.view', 'items.view'],
  inventory_manager: ['items.manage', 'categories.manage', 'departments.view', 'reports.view'],
};
