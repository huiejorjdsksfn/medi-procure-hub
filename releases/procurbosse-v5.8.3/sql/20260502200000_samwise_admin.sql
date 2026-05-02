-- ================================================================
-- ProcurBosse v5.8.3 — Primary Admin Account Setup
-- Admin: samwise@gmail.com / samwise@gmail.com
-- ================================================================

-- Update admin_email system setting to samwise
UPDATE system_settings SET value = '"samwise@gmail.com"' WHERE key = 'admin_email';
INSERT INTO system_settings(key, value, category)
  VALUES('admin_email', '"samwise@gmail.com"', 'general')
  ON CONFLICT(key) DO UPDATE SET value = '"samwise@gmail.com"';

-- Auto-grant admin role to samwise@gmail.com when they sign up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    CASE
      WHEN NEW.email = 'samwise@gmail.com' THEN 'admin'
      WHEN NEW.email LIKE '%@el5.co.ke' THEN 'requisitioner'
      ELSE 'requisitioner'
    END,
    TRUE
  )
  ON CONFLICT(id) DO UPDATE SET
    email = EXCLUDED.email,
    role = CASE
      WHEN NEW.email = 'samwise@gmail.com' THEN 'admin'
      ELSE EXCLUDED.role
    END;

  -- Insert role into user_roles
  INSERT INTO public.user_roles(user_id, role)
  VALUES (
    NEW.id,
    CASE
      WHEN NEW.email = 'samwise@gmail.com' THEN 'admin'
      WHEN NEW.email = 'manager@el5.co.ke' THEN 'procurement_manager'
      WHEN NEW.email = 'accountant@el5.co.ke' THEN 'accountant'
      WHEN NEW.email = 'officer@el5.co.ke' THEN 'procurement_officer'
      WHEN NEW.email = 'requisitioner@el5.co.ke' THEN 'requisitioner'
      WHEN NEW.email = 'warehouse@el5.co.ke' THEN 'warehouse_officer'
      WHEN NEW.email = 'inventory@el5.co.ke' THEN 'inventory_manager'
      WHEN NEW.email = 'reception@el5.co.ke' THEN 'reception'
      WHEN NEW.email = 'dbadmin@el5.co.ke' THEN 'database_admin'
      ELSE 'requisitioner'
    END
  )
  ON CONFLICT(user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- Assign admin role to samwise if already exists
SELECT assign_role_by_email('samwise@gmail.com', 'admin');

-- All demo accounts
SELECT assign_role_by_email('samwise@gmail.com',    'admin');
SELECT assign_role_by_email('manager@el5.co.ke',       'procurement_manager');
SELECT assign_role_by_email('accountant@el5.co.ke',    'accountant');
SELECT assign_role_by_email('officer@el5.co.ke',       'procurement_officer');
SELECT assign_role_by_email('requisitioner@el5.co.ke', 'requisitioner');
SELECT assign_role_by_email('warehouse@el5.co.ke',     'warehouse_officer');
SELECT assign_role_by_email('inventory@el5.co.ke',     'inventory_manager');
SELECT assign_role_by_email('reception@el5.co.ke',     'reception');
SELECT assign_role_by_email('dbadmin@el5.co.ke',       'database_admin');

/*
  ══════════════════════════════════════════════════════
  DEMO ACCOUNTS — ProcurBosse v5.8.3
  ══════════════════════════════════════════════════════
  samwise@gmail.com       / samwise@gmail.com  → admin (PRIMARY)
  manager@el5.co.ke       / Manager@1234       → procurement_manager
  accountant@el5.co.ke    / Account@1234       → accountant
  officer@el5.co.ke       / Officer@1234       → procurement_officer
  requisitioner@el5.co.ke / Req@12345          → requisitioner
  warehouse@el5.co.ke     / Warehouse@1234     → warehouse_officer
  inventory@el5.co.ke     / Inventory@1234     → inventory_manager
  reception@el5.co.ke     / Reception@1234     → reception
  dbadmin@el5.co.ke       / DBAdmin@1234       → database_admin
  ══════════════════════════════════════════════════════
*/
