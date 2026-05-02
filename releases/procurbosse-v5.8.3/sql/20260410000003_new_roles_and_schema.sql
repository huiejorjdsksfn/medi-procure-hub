-- ══════════════════════════════════════════════════════════════════════
-- EL5 MediProcure v5.9 — New Roles + Session Schema
-- Adds: superadmin, webmaster roles + session_store table
-- ══════════════════════════════════════════════════════════════════════

-- ── Add new role types to enum (if using enum, otherwise just insert) ──
-- PostgreSQL allows inserting any string to user_roles.role (it's text)

-- ── Ensure superadmin user has correct roles ──────────────────────────
-- (Will upsert based on email — change to match your superadmin email)
DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Try to find superadmin by email
  SELECT id INTO v_uid FROM auth.users WHERE email ILIKE '%admin%' ORDER BY created_at LIMIT 1;
  IF v_uid IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role)
    VALUES
      (v_uid, 'superadmin'),
      (v_uid, 'webmaster'),
      (v_uid, 'admin'),
      (v_uid, 'database_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;

-- ── Role permissions table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS role_capabilities (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  role        text NOT NULL,
  capability  text NOT NULL,
  granted     boolean DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(role, capability)
);
ALTER TABLE role_capabilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_rc" ON role_capabilities FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_write_rc" ON role_capabilities FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','superadmin','webmaster')));

-- Seed default capabilities
INSERT INTO role_capabilities (role, capability) VALUES
  ('superadmin','all_access'),('superadmin','edit_code'),('superadmin','manage_roles'),
  ('webmaster','all_access'),('webmaster','edit_code'),('webmaster','manage_roles'),('webmaster','view_codebase'),
  ('admin','all_access'),('admin','manage_users'),('admin','system_settings'),
  ('database_admin','manage_mysql'),('database_admin','view_schema'),('database_admin','run_queries'),
  ('accountant','view_financials'),('accountant','create_vouchers'),('accountant','approve_vouchers'),
  ('accountant','manage_budgets'),('accountant','invoice_matching'),
  ('procurement_manager','approve_requisitions'),('procurement_manager','create_po'),('procurement_manager','approve_po'),
  ('procurement_officer','create_requisitions'),('procurement_officer','view_po'),
  ('inventory_manager','manage_items'),('inventory_manager','manage_categories'),
  ('warehouse_officer','receive_goods'),('warehouse_officer','issue_items'),
  ('requisitioner','create_requisitions'),('requisitioner','view_own_requisitions')
ON CONFLICT (role, capability) DO NOTHING;

-- ── MySQL connection settings ──────────────────────────────────────────
INSERT INTO system_settings (key, value, category, label) VALUES
  ('mysql_enabled',  'false', 'mysql', 'MySQL Enabled'),
  ('mysql_host',     '',      'mysql', 'MySQL Host'),
  ('mysql_port',     '3306',  'mysql', 'MySQL Port'),
  ('mysql_database', 'mediprocure', 'mysql', 'MySQL Database'),
  ('mysql_username', 'root',  'mysql', 'MySQL Username'),
  ('mysql_password', '',      'mysql', 'MySQL Password'),
  ('mysql_ssl',      'false', 'mysql', 'MySQL SSL')
ON CONFLICT (key) DO NOTHING;

-- ── Profile fields for new roles ───────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='role_title') THEN
    ALTER TABLE profiles ADD COLUMN role_title text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='employee_id') THEN
    ALTER TABLE profiles ADD COLUMN employee_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='sms_enabled') THEN
    ALTER TABLE profiles ADD COLUMN sms_enabled boolean DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='email_enabled') THEN
    ALTER TABLE profiles ADD COLUMN email_enabled boolean DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='last_active_at') THEN
    ALTER TABLE profiles ADD COLUMN last_active_at timestamptz;
  END IF;
END $$;

-- ── Index on user_roles for fast role lookups ──────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_roles_uid  ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email  ON profiles(email);
