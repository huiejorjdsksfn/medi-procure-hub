-- ══════════════════════════════════════════════════════════════
-- ProcurBosse v5.9 — New Roles + Password Management Schema
-- EL5 MediProcure · Embu Level 5 Hospital
-- ══════════════════════════════════════════════════════════════

-- Add temp password storage to system_settings (already exists, ensure category)
CREATE TABLE IF NOT EXISTS admin_password_resets (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  temp_password text,  -- hashed or encrypted
  reset_by    uuid REFERENCES auth.users(id),
  created_at  timestamptz DEFAULT now(),
  used_at     timestamptz,
  is_used     boolean DEFAULT false
);
ALTER TABLE admin_password_resets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_manage_resets" ON admin_password_resets
  FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM user_roles WHERE user_id=auth.uid() AND role IN ('admin','superadmin','webmaster')));

-- Activate all new roles in user_roles constraint (if enum)
-- All roles: admin, superadmin, webmaster, database_admin,
--            procurement_manager, procurement_officer, accountant,
--            inventory_manager, warehouse_officer, requisitioner

-- Add role_label column to user_roles for display
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='user_roles' AND column_name='label') THEN
    ALTER TABLE user_roles ADD COLUMN label text;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='user_roles' AND column_name='granted_by') THEN
    ALTER TABLE user_roles ADD COLUMN granted_by uuid REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='user_roles' AND column_name='granted_at') THEN
    ALTER TABLE user_roles ADD COLUMN granted_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Ensure all 10 roles have capability entries
INSERT INTO role_capabilities (role, capability) VALUES
  ('superadmin','all_access'),('superadmin','edit_code'),('superadmin','manage_roles'),
  ('superadmin','view_codebase'),('superadmin','reset_passwords'),('superadmin','manage_mysql'),
  ('webmaster','all_access'),('webmaster','edit_code'),('webmaster','view_codebase'),
  ('webmaster','manage_roles'),('webmaster','reset_passwords'),
  ('admin','all_access'),('admin','manage_users'),('admin','system_settings'),
  ('admin','view_audit'),('admin','approve_all'),('admin','reset_passwords'),
  ('database_admin','manage_mysql'),('database_admin','view_schema'),
  ('database_admin','run_queries'),('database_admin','manage_backups'),
  ('procurement_manager','approve_requisitions'),('procurement_manager','create_po'),
  ('procurement_manager','approve_po'),('procurement_manager','manage_suppliers'),
  ('procurement_manager','manage_contracts'),('procurement_manager','manage_tenders'),
  ('procurement_officer','create_requisitions'),('procurement_officer','view_po'),
  ('procurement_officer','receive_goods'),('procurement_officer','view_suppliers'),
  ('accountant','view_financials'),('accountant','create_vouchers'),
  ('accountant','approve_vouchers'),('accountant','manage_budgets'),
  ('accountant','invoice_matching'),('accountant','view_audit'),
  ('inventory_manager','manage_items'),('inventory_manager','manage_categories'),
  ('inventory_manager','view_stock'),('inventory_manager','scan_items'),
  ('warehouse_officer','receive_goods'),('warehouse_officer','issue_items'),
  ('warehouse_officer','scan_items'),('warehouse_officer','view_stock'),
  ('requisitioner','create_requisitions'),('requisitioner','view_own_requisitions'),
  ('requisitioner','view_items')
ON CONFLICT (role,capability) DO NOTHING;

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_ur_user_role ON user_roles(user_id,role);
CREATE INDEX IF NOT EXISTS idx_apr_user     ON admin_password_resets(user_id);
