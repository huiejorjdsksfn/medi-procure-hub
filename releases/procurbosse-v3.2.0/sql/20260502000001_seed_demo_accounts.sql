-- ============================================================
-- ProcurBosse v5.8 — Demo Account Seed
-- Creates sample login accounts for all roles
-- Run via: supabase db push OR Supabase SQL Editor
-- ============================================================

-- Ensure user_roles table exists
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

-- System settings defaults
INSERT INTO system_settings (key, value) VALUES
  ('hospital_name',       '"Embu Level 5 Hospital"'),
  ('hospital_short',      '"EL5"'),
  ('county',              '"Embu County Government"'),
  ('email_enabled',       'false'),
  ('realtime_enabled',    'true'),
  ('maintenance_mode',    'false'),
  ('registration_open',   'true'),
  ('audit_enabled',       'true'),
  ('sms_enabled',         'false'),
  ('procurement_currency','\"KES\"'),
  ('fiscal_year_start',   '"01-01"'),
  ('vat_rate',            '16'),
  ('po_approval_limit',   '500000'),
  ('grn_auto_close_days', '7')
ON CONFLICT (key) DO NOTHING;

-- ─── Create demo users via auth.users insert ───
-- NOTE: Supabase does not allow direct auth.users insert from migrations.
-- Use the Supabase Dashboard > Authentication > Users to create these accounts,
-- then run the role assignments below once users exist.
-- 
-- OR use the Supabase CLI:
--   supabase auth admin create-user --email tecnojin03@gmail.com --password Admin@1234
--
-- Demo accounts:
--   Admin:            tecnojin03@gmail.com    / Admin@1234
--   Proc. Manager:    manager@el5.co.ke       / Manager@1234
--   Accountant:       accountant@el5.co.ke    / Account@1234
--   Proc. Officer:    officer@el5.co.ke       / Officer@1234
--   Requisitioner:    requisitioner@el5.co.ke / Req@12345
--   Warehouse:        warehouse@el5.co.ke     / Warehouse@1234
--   Inventory Mgr:    inventory@el5.co.ke     / Inventory@1234
--   Reception:        reception@el5.co.ke     / Reception@1234
--   DB Admin:         dbadmin@el5.co.ke       / DBAdmin@1234

-- Role assignment helper function
-- Call after creating users in the dashboard
CREATE OR REPLACE FUNCTION assign_role_by_email(p_email TEXT, p_role TEXT)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User not found: %', p_email;
    RETURN;
  END IF;
  INSERT INTO user_roles (user_id, role) VALUES (v_user_id, p_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  UPDATE profiles SET role = p_role WHERE id = v_user_id;
  RAISE NOTICE 'Assigned role % to %', p_role, p_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-assign roles if users already exist
SELECT assign_role_by_email('tecnojin03@gmail.com',    'admin');
SELECT assign_role_by_email('manager@el5.co.ke',       'procurement_manager');
SELECT assign_role_by_email('accountant@el5.co.ke',    'accountant');
SELECT assign_role_by_email('officer@el5.co.ke',       'procurement_officer');
SELECT assign_role_by_email('requisitioner@el5.co.ke', 'requisitioner');
SELECT assign_role_by_email('warehouse@el5.co.ke',     'warehouse_officer');
SELECT assign_role_by_email('inventory@el5.co.ke',     'inventory_manager');
SELECT assign_role_by_email('reception@el5.co.ke',     'reception');
SELECT assign_role_by_email('dbadmin@el5.co.ke',       'database_admin');

