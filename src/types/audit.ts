export interface AuditLogEntry {
  id: string;
  user_id: string | null;
  user_name: string | null;
  action: string;
  module: string;
  record_id: string | null;
  details: Record<string, any> | null;
  ip_address: string | null;
  created_at: string;
}

export type AuditAction =
  | 'create' | 'update' | 'delete' | 'deactivate'
  | 'approve' | 'reject' | 'forward'
  | 'assign_role' | 'remove_role'
  | 'activate_user' | 'deactivate_user' | 'delete_user' | 'create_user'
  | 'update_profile' | 'create_worksheet'
  | 'login' | 'logout';

export type AuditModule =
  | 'requisitions' | 'purchase_orders' | 'goods_received'
  | 'items' | 'suppliers' | 'categories' | 'departments'
  | 'contracts' | 'users' | 'settings' | 'system';
