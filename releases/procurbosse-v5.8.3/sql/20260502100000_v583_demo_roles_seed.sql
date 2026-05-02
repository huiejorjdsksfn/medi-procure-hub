-- ================================================================
-- ProcurBosse v5.8.3 — Full Demo Account & Role Seed
-- Embu Level 5 Hospital · Embu County Government · Kenya
-- ================================================================

-- Ensure user_roles has correct structure
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='user_roles' AND table_schema='public') THEN
    CREATE TABLE user_roles (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN (
        'admin','database_admin','procurement_manager','procurement_officer',
        'accountant','inventory_manager','warehouse_officer','requisitioner','reception'
      )),
      facility_id UUID REFERENCES facilities(id),
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(user_id, role)
    );
    CREATE INDEX idx_user_roles_user ON user_roles(user_id);
    ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "users_see_own_roles" ON user_roles FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "admin_manage_roles" ON user_roles FOR ALL USING (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );
  END IF;
END $$;

-- Seed system_settings with all required keys
INSERT INTO system_settings (key, value, category) VALUES
  ('hospital_name',        '"Embu Level 5 Hospital"',       'general'),
  ('hospital_short',       '"EL5"',                          'general'),
  ('county',               '"Embu County Government"',       'general'),
  ('country',              '"Kenya"',                        'general'),
  ('currency',             '"KES"',                          'general'),
  ('fiscal_year_start',    '"01-01"',                        'general'),
  ('vat_rate',             '16',                             'finance'),
  ('po_approval_limit',    '500000',                         'finance'),
  ('email_enabled',        'false',                          'notifications'),
  ('sms_enabled',          'false',                          'notifications'),
  ('whatsapp_enabled',     'false',                          'notifications'),
  ('realtime_enabled',     'true',                           'system'),
  ('maintenance_mode',     'false',                          'system'),
  ('registration_open',    'true',                           'system'),
  ('audit_enabled',        'true',                           'system'),
  ('grn_auto_close_days',  '7',                              'procurement'),
  ('procurement_currency', '"KES"',                          'procurement'),
  ('app_version',          '"5.8.3"',                        'system')
ON CONFLICT (key) DO NOTHING;

-- Role assignment helper (idempotent)
CREATE OR REPLACE FUNCTION assign_role_by_email(p_email TEXT, p_role TEXT)
RETURNS TEXT AS $$
DECLARE v_uid UUID;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = p_email;
  IF v_uid IS NULL THEN RETURN 'NOT_FOUND: ' || p_email; END IF;
  INSERT INTO user_roles(user_id, role) VALUES(v_uid, p_role)
    ON CONFLICT(user_id, role) DO NOTHING;
  UPDATE profiles SET role = p_role, is_active = TRUE
    WHERE id = v_uid;
  RETURN 'OK: ' || p_email || ' → ' || p_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Assign roles to demo accounts (run after creating users in Supabase Dashboard)
SELECT assign_role_by_email('tecnojin03@gmail.com',    'admin');
SELECT assign_role_by_email('manager@el5.co.ke',       'procurement_manager');
SELECT assign_role_by_email('accountant@el5.co.ke',    'accountant');
SELECT assign_role_by_email('officer@el5.co.ke',       'procurement_officer');
SELECT assign_role_by_email('requisitioner@el5.co.ke', 'requisitioner');
SELECT assign_role_by_email('warehouse@el5.co.ke',     'warehouse_officer');
SELECT assign_role_by_email('inventory@el5.co.ke',     'inventory_manager');
SELECT assign_role_by_email('reception@el5.co.ke',     'reception');
SELECT assign_role_by_email('dbadmin@el5.co.ke',       'database_admin');

-- Demo account reference (create these in Supabase > Auth > Users):
-- tecnojin03@gmail.com      / Admin@1234      → admin
-- manager@el5.co.ke         / Manager@1234    → procurement_manager
-- accountant@el5.co.ke      / Account@1234    → accountant
-- officer@el5.co.ke         / Officer@1234    → procurement_officer
-- requisitioner@el5.co.ke   / Req@12345       → requisitioner
-- warehouse@el5.co.ke       / Warehouse@1234  → warehouse_officer
-- inventory@el5.co.ke       / Inventory@1234  → inventory_manager
-- reception@el5.co.ke       / Reception@1234  → reception
-- dbadmin@el5.co.ke         / DBAdmin@1234    → database_admin
