-- ================================================================
-- ProcurBosse Migration: Accountant Role + SMTP + Notifications
-- Date: 2026-03-29
-- ================================================================

-- 1. Role permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  module text NOT NULL,
  can_view boolean DEFAULT true,
  can_create boolean DEFAULT false,
  can_edit boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  can_approve boolean DEFAULT false,
  can_export boolean DEFAULT false,
  can_sync boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "role_permissions_select" ON role_permissions FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "role_permissions_admin" ON role_permissions FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','webmaster')));

-- Accountant permissions
INSERT INTO role_permissions (role, module, can_view, can_create, can_edit, can_delete, can_approve, can_export, can_sync)
VALUES
  ('accountant','dashboard',           true,  false, false, false, false, true,  false),
  ('accountant','invoice_matching',    true,  true,  true,  false, true,  true,  false),
  ('accountant','payment_management',  true,  true,  true,  false, true,  true,  false),
  ('accountant','budget_control',      true,  true,  true,  false, true,  true,  false),
  ('accountant','erp_sync',            true,  false, false, false, false, true,  true),
  ('accountant','journal_ledger',      true,  false, false, false, false, true,  false),
  ('accountant','quotation_creator',   true,  true,  true,  true,  false, true,  false),
  ('accountant','purchase_orders',     true,  false, false, false, false, true,  false),
  ('accountant','goods_received',      true,  false, false, false, false, true,  false),
  ('accountant','suppliers',           true,  false, false, false, false, true,  false),
  ('accountant','reports',             true,  false, false, false, false, true,  false),
  ('accountant','notifications',       true,  false, false, false, false, false, false),
  ('accountant','payment_vouchers',    true,  true,  true,  false, true,  true,  false),
  ('accountant','budgets',             true,  true,  true,  false, true,  true,  false),
  ('accountant','chart_of_accounts',   true,  false, false, false, false, true,  false),
  ('accountant','documents',           true,  true,  true,  false, false, true,  false)
ON CONFLICT DO NOTHING;

-- 2. Quotations table
CREATE TABLE IF NOT EXISTS quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_number text UNIQUE NOT NULL DEFAULT 'QUO-' || to_char(now(),'YYYYMMDD') || '-' || floor(random()*9000+1000)::text,
  supplier_id uuid REFERENCES suppliers(id),
  requisition_id uuid REFERENCES requisitions(id),
  status text DEFAULT 'draft' CHECK (status IN ('draft','sent','received','evaluated','accepted','rejected')),
  valid_until date,
  currency text DEFAULT 'KES',
  total_amount numeric(15,2) DEFAULT 0,
  notes text,
  created_by uuid REFERENCES profiles(id),
  approved_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS quotation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid REFERENCES quotations(id) ON DELETE CASCADE,
  item_id uuid REFERENCES items(id),
  description text NOT NULL,
  quantity numeric(10,2) NOT NULL,
  unit_price numeric(15,2) NOT NULL,
  total_price numeric(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  gl_account text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "quotations_select" ON quotations FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','webmaster','accountant','procurement_manager','procurement_officer'))
);
CREATE POLICY IF NOT EXISTS "quotations_insert" ON quotations FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','webmaster','accountant','procurement_manager','procurement_officer'))
);
CREATE POLICY IF NOT EXISTS "quotations_update" ON quotations FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','webmaster','accountant','procurement_manager'))
);
CREATE POLICY IF NOT EXISTS "quotation_items_all" ON quotation_items FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','webmaster','accountant','procurement_manager','procurement_officer'))
);

-- 3. Budget alerts & ERP sync enhancements
ALTER TABLE budget_alerts ADD COLUMN IF NOT EXISTS acknowledged_by uuid REFERENCES profiles(id);
ALTER TABLE budget_alerts ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz;
ALTER TABLE budget_alerts ADD COLUMN IF NOT EXISTS override_approved boolean DEFAULT false;
ALTER TABLE budget_alerts ADD COLUMN IF NOT EXISTS override_notes text;

ALTER TABLE erp_sync_queue ADD COLUMN IF NOT EXISTS initiated_by uuid REFERENCES profiles(id);
ALTER TABLE erp_sync_queue ADD COLUMN IF NOT EXISTS is_manual boolean DEFAULT false;
ALTER TABLE erp_sync_queue ADD COLUMN IF NOT EXISTS override_reason text;
ALTER TABLE erp_sync_queue ADD COLUMN IF NOT EXISTS gl_verified boolean DEFAULT false;
ALTER TABLE erp_sync_queue ADD COLUMN IF NOT EXISTS gl_verified_by uuid REFERENCES profiles(id);

-- 4. Notifications enhanced columns
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS category text DEFAULT 'system';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal' CHECK (priority IN ('low','normal','high','critical'));
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_label text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS icon text DEFAULT 'bell';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS dismissed_at timestamptz;

-- 5. SMTP config in system_config
INSERT INTO system_config (key, value, type, category, label) VALUES
  ('smtp_provider',       'supabase',                      'text',    'email', 'SMTP Provider'),
  ('smtp_host',           'smtp.resend.com',               'text',    'email', 'SMTP Host'),
  ('smtp_port',           '465',                           'text',    'email', 'SMTP Port'),
  ('smtp_secure',         'true',                          'boolean', 'email', 'Use SSL/TLS'),
  ('smtp_user',           'resend',                        'text',    'email', 'SMTP Username'),
  ('smtp_from_email',     'noreply@embu.go.ke',            'text',    'email', 'From Email'),
  ('smtp_from_name',      'ProcurBosse - EL5 MediProcure', 'text',    'email', 'From Name'),
  ('smtp_enabled',        'true',                          'boolean', 'email', 'SMTP Enabled'),
  ('smtp_tls',            'true',                          'boolean', 'email', 'TLS Enabled'),
  ('email_test_address',  'admin@embu.go.ke',              'text',    'email', 'Test Email Address'),
  ('supabase_smtp_active','true',                          'boolean', 'email', 'Supabase SMTP Active'),
  ('smtp_status',         'active',                        'text',    'email', 'SMTP Status')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- 6. Password reset log
CREATE TABLE IF NOT EXISTS password_reset_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  email text NOT NULL,
  requested_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  ip_address text,
  status text DEFAULT 'pending' CHECK (status IN ('pending','completed','expired','failed'))
);
ALTER TABLE password_reset_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "password_reset_log_admin" ON password_reset_log FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','webmaster')));

-- 7. Realtime
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE notifications; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE budget_alerts; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE erp_sync_queue; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE quotations; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

NOTIFY pgrst, 'reload schema';
