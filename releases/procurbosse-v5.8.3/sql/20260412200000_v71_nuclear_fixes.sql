-- ═══════════════════════════════════════════════════════════════════
-- ProcurBosse v7.1 Nuclear Fixes Migration
-- Quotations RLS · Documents schema · Module controls · Activity log
-- ODBC connections store · Print audit · System module toggles
-- EL5 MediProcure · Embu Level 5 Hospital
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Fix quotations RLS (new row violates row-level security) ──
CREATE TABLE IF NOT EXISTS quotations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  supplier_id  uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  requisition_id uuid REFERENCES requisitions(id) ON DELETE SET NULL,
  status       text DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected','expired')),
  total_amount numeric(14,2),
  currency     text DEFAULT 'KES',
  valid_until  date,
  items        jsonb DEFAULT '[]',
  notes        text,
  created_by   uuid REFERENCES auth.users(id),
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all_quotations" ON quotations;
CREATE POLICY "auth_all_quotations" ON quotations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_supplier ON quotations(supplier_id);

-- ── 2. Fix documents table — add ALL missing columns safely ──────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='file_type') THEN
    ALTER TABLE documents ADD COLUMN file_type text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='storage_path') THEN
    ALTER TABLE documents ADD COLUMN storage_path text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='file_url') THEN
    ALTER TABLE documents ADD COLUMN file_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='file_size') THEN
    ALTER TABLE documents ADD COLUMN file_size bigint;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='original_filename') THEN
    ALTER TABLE documents ADD COLUMN original_filename text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='uploaded_by') THEN
    ALTER TABLE documents ADD COLUMN uploaded_by uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='metadata') THEN
    ALTER TABLE documents ADD COLUMN metadata jsonb DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='source') THEN
    ALTER TABLE documents ADD COLUMN source text DEFAULT 'system';
  END IF;
END $$;

-- Fix RLS on documents — allow authenticated inserts
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all_documents" ON documents;
CREATE POLICY "auth_all_documents" ON documents FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 3. System module toggles (master on/off per module) ──────────
CREATE TABLE IF NOT EXISTS system_modules (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id   text UNIQUE NOT NULL,
  label       text NOT NULL,
  description text,
  is_enabled  boolean DEFAULT true,
  icon        text,
  color       text,
  path        text,
  roles       text[] DEFAULT '{}',
  sort_order  int DEFAULT 0,
  updated_by  uuid REFERENCES auth.users(id),
  updated_at  timestamptz DEFAULT now()
);
ALTER TABLE system_modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_manage_modules" ON system_modules;
CREATE POLICY "admin_manage_modules" ON system_modules FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('superadmin','webmaster','admin'))
);
DROP POLICY IF EXISTS "auth_read_modules" ON system_modules;
CREATE POLICY "auth_read_modules" ON system_modules FOR SELECT TO authenticated USING (true);

-- Seed all 14 modules
INSERT INTO system_modules (module_id, label, description, is_enabled, icon, color, path, roles, sort_order) VALUES
  ('procurement',  'Procurement',         'Requisitions, POs, tenders, bid evaluations', true, 'ShoppingCart',  '#0078d4', '/requisitions',           '{"admin","superadmin","webmaster","procurement_manager","procurement_officer","requisitioner","inventory_manager","warehouse_officer"}', 1),
  ('finance',      'Finance',             'Budgets, vouchers, chart of accounts',         true, 'DollarSign',    '#7719aa', '/financials/dashboard',   '{"admin","superadmin","webmaster","procurement_manager","accountant"}', 2),
  ('inventory',    'Inventory',           'Items, categories, scanner, warehouse',         true, 'Package',       '#038387', '/items',                  '{"admin","superadmin","webmaster","procurement_manager","inventory_manager","warehouse_officer","procurement_officer"}', 3),
  ('quality',      'Quality Control',     'Inspections, non-conformance, QC dashboard',   true, 'Shield',        '#498205', '/quality/dashboard',      '{"admin","superadmin","webmaster","procurement_manager","procurement_officer","inventory_manager"}', 4),
  ('suppliers',    'Suppliers',           'Supplier management and CRM',                   true, 'Truck',         '#e67e22', '/suppliers',              '{"admin","superadmin","webmaster","procurement_manager","procurement_officer"}', 5),
  ('contracts',    'Contracts',           'Contract lifecycle management',                 true, 'FileCheck',     '#0078d4', '/contracts',              '{"admin","superadmin","webmaster","procurement_manager"}', 6),
  ('tenders',      'Tenders',             'Tender management and bid evaluations',         true, 'Gavel',         '#7719aa', '/tenders',                '{"admin","superadmin","webmaster","procurement_manager","procurement_officer"}', 7),
  ('documents',    'Documents',           'Document library and imports',                  true, 'FileText',      '#5c2d91', '/documents',              '{}', 8),
  ('reports',      'Reports & BI',        'Analytics, exports, Power BI dashboards',       true, 'BarChart3',     '#5c2d91', '/reports',                '{"admin","superadmin","webmaster","procurement_manager","accountant","database_admin"}', 9),
  ('comms',        'Communications',      'SMS, WhatsApp, email, telephony',               true, 'MessageSquare', '#0072c6', '/sms',                    '{"admin","superadmin","webmaster"}', 10),
  ('accountant',   'Accountant Workspace','Invoice matching, payments, ERP sync',          true, 'BookOpen',      '#7719aa', '/accountant-workspace',   '{"admin","superadmin","webmaster","accountant"}', 11),
  ('system',       'System Settings',     'Settings, backup, ODBC connections',            true, 'Settings',      '#00188f', '/settings',               '{"admin","superadmin","webmaster","database_admin"}', 12),
  ('admin',        'Admin Panel',         'User management, IP stats, Twilio',             true, 'Shield',        '#a4262c', '/admin',                  '{"admin","superadmin","webmaster"}', 13),
  ('odbc',         'ODBC / SQL Server',   'SQL Server connection manager and viewer',      true, 'Database',      '#038387', '/odbc',                   '{"admin","superadmin","webmaster","database_admin"}', 14)
ON CONFLICT (module_id) DO UPDATE SET
  label = EXCLUDED.label, is_enabled = EXCLUDED.is_enabled,
  updated_at = now();

-- Realtime for module changes
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE system_modules; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- ── 4. Activity log — every admin action stored ──────────────────
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action      text NOT NULL,
  entity_type text,
  entity_id   text,
  details     jsonb DEFAULT '{}',
  ip_address  text,
  user_agent  text,
  severity    text DEFAULT 'info' CHECK (severity IN ('info','warning','critical','error')),
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_user    ON admin_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_action  ON admin_activity_log(action);
CREATE INDEX IF NOT EXISTS idx_activity_created ON admin_activity_log(created_at DESC);
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_read_activity" ON admin_activity_log;
CREATE POLICY "admin_read_activity" ON admin_activity_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('superadmin','webmaster','admin','database_admin'))
);
CREATE POLICY "insert_activity" ON admin_activity_log FOR INSERT WITH CHECK (true);

DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE admin_activity_log; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- ── 5. ODBC connections store ────────────────────────────────────
CREATE TABLE IF NOT EXISTS odbc_connections (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  db_type         text NOT NULL DEFAULT 'mssql',
  host            text NOT NULL,
  port            int DEFAULT 1433,
  database_name   text NOT NULL,
  username        text,
  password_enc    text,
  driver          text DEFAULT 'ODBC Driver 17 for SQL Server',
  connection_string text,
  is_active       boolean DEFAULT true,
  is_default      boolean DEFAULT false,
  last_tested_at  timestamptz,
  last_test_ok    boolean,
  test_error      text,
  tables_cache    jsonb DEFAULT '[]',
  sync_direction  text DEFAULT 'read_only' CHECK (sync_direction IN ('read_only','bidirectional')),
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
ALTER TABLE odbc_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_manage_odbc" ON odbc_connections;
CREATE POLICY "admin_manage_odbc" ON odbc_connections FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('superadmin','webmaster','admin','database_admin'))
);

-- ── 6. ODBC query log ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS odbc_query_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid REFERENCES odbc_connections(id) ON DELETE CASCADE,
  query_text    text NOT NULL,
  result_rows   int,
  duration_ms   int,
  status        text DEFAULT 'ok',
  error_msg     text,
  executed_by   uuid REFERENCES auth.users(id),
  created_at    timestamptz DEFAULT now()
);
ALTER TABLE odbc_query_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_see_odbc_log" ON odbc_query_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('superadmin','webmaster','admin','database_admin'))
);
CREATE POLICY "insert_odbc_log" ON odbc_query_log FOR INSERT WITH CHECK (true);

-- ── 7. Print audit log ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS print_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page        text NOT NULL,
  entity_type text,
  entity_id   text,
  printed_by  uuid REFERENCES auth.users(id),
  ip_address  text,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE print_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_print_log" ON print_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 8. erp_sync_queue for accountant ODBC sync ──────────────────
CREATE TABLE IF NOT EXISTS erp_sync_queue (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type    text NOT NULL,
  direction    text DEFAULT 'pull' CHECK (direction IN ('pull','push')),
  status       text DEFAULT 'pending' CHECK (status IN ('pending','running','done','failed')),
  payload      jsonb DEFAULT '{}',
  result       jsonb,
  error_msg    text,
  is_manual    boolean DEFAULT false,
  connection_id uuid REFERENCES odbc_connections(id) ON DELETE SET NULL,
  initiated_by uuid REFERENCES auth.users(id),
  started_at   timestamptz,
  completed_at timestamptz,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE erp_sync_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_erp_sync" ON erp_sync_queue FOR ALL TO authenticated USING (true) WITH CHECK (true);

DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE erp_sync_queue;   EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE odbc_connections;  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE odbc_query_log;    EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

COMMIT;
