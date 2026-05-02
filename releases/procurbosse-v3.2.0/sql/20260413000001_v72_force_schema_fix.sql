-- ═══════════════════════════════════════════════════════════════════════════
-- ProcurBosse v7.2 — Force Schema Fix (resolves schema cache errors)
-- Fixes: 'file_type' column not found in documents
-- Fixes: 'database_name' column not found in odbc_connections
-- Uses direct ALTER TABLE — bypasses IF NOT EXISTS for cache refresh
-- EL5 MediProcure · Embu Level 5 Hospital
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. documents table — force all columns ───────────────────────────────
DO $$
BEGIN
  -- file_type
  BEGIN ALTER TABLE documents ADD COLUMN file_type text; EXCEPTION WHEN duplicate_column THEN NULL; END;
  -- storage_path
  BEGIN ALTER TABLE documents ADD COLUMN storage_path text; EXCEPTION WHEN duplicate_column THEN NULL; END;
  -- file_url
  BEGIN ALTER TABLE documents ADD COLUMN file_url text; EXCEPTION WHEN duplicate_column THEN NULL; END;
  -- file_size
  BEGIN ALTER TABLE documents ADD COLUMN file_size bigint; EXCEPTION WHEN duplicate_column THEN NULL; END;
  -- original_filename
  BEGIN ALTER TABLE documents ADD COLUMN original_filename text; EXCEPTION WHEN duplicate_column THEN NULL; END;
  -- uploaded_by
  BEGIN ALTER TABLE documents ADD COLUMN uploaded_by uuid; EXCEPTION WHEN duplicate_column THEN NULL; END;
  -- metadata
  BEGIN ALTER TABLE documents ADD COLUMN metadata jsonb DEFAULT '{}'; EXCEPTION WHEN duplicate_column THEN NULL; END;
  -- source
  BEGIN ALTER TABLE documents ADD COLUMN source text DEFAULT 'system'; EXCEPTION WHEN duplicate_column THEN NULL; END;
  -- parsed_content
  BEGIN ALTER TABLE documents ADD COLUMN parsed_content text; EXCEPTION WHEN duplicate_column THEN NULL; END;
  -- import_status
  BEGIN ALTER TABLE documents ADD COLUMN import_status text; EXCEPTION WHEN duplicate_column THEN NULL; END;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_documents_file_type    ON documents(file_type);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by  ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_source       ON documents(source);

-- Fix RLS — ensure authenticated users can insert
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all_documents"        ON documents;
DROP POLICY IF EXISTS "auth_insert_documents"     ON documents;
DROP POLICY IF EXISTS "auth_read_documents"       ON documents;
CREATE POLICY "auth_all_documents" ON documents
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 2. odbc_connections table — force create with all columns ─────────────
CREATE TABLE IF NOT EXISTS odbc_connections (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text        NOT NULL,
  db_type           text        NOT NULL DEFAULT 'mssql',
  host              text        NOT NULL,
  port              int         DEFAULT 1433,
  database_name     text        NOT NULL,
  username          text,
  password_enc      text,
  driver            text        DEFAULT 'ODBC Driver 17 for SQL Server',
  connection_string text,
  is_active         boolean     DEFAULT true,
  is_default        boolean     DEFAULT false,
  last_tested_at    timestamptz,
  last_test_ok      boolean,
  test_error        text,
  tables_cache      jsonb       DEFAULT '[]',
  sync_direction    text        DEFAULT 'read_only'
                    CHECK (sync_direction IN ('read_only','bidirectional')),
  created_by        uuid        REFERENCES auth.users(id),
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- Force add any missing columns (for existing tables)
DO $$
BEGIN
  BEGIN ALTER TABLE odbc_connections ADD COLUMN name text NOT NULL DEFAULT 'Connection'; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE odbc_connections ADD COLUMN db_type text NOT NULL DEFAULT 'mssql'; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE odbc_connections ADD COLUMN host text NOT NULL DEFAULT ''; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE odbc_connections ADD COLUMN port int DEFAULT 1433; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE odbc_connections ADD COLUMN database_name text NOT NULL DEFAULT ''; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE odbc_connections ADD COLUMN username text; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE odbc_connections ADD COLUMN password_enc text; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE odbc_connections ADD COLUMN driver text DEFAULT 'ODBC Driver 17 for SQL Server'; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE odbc_connections ADD COLUMN connection_string text; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE odbc_connections ADD COLUMN is_active boolean DEFAULT true; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE odbc_connections ADD COLUMN is_default boolean DEFAULT false; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE odbc_connections ADD COLUMN last_tested_at timestamptz; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE odbc_connections ADD COLUMN last_test_ok boolean; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE odbc_connections ADD COLUMN test_error text; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE odbc_connections ADD COLUMN tables_cache jsonb DEFAULT '[]'; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE odbc_connections ADD COLUMN sync_direction text DEFAULT 'read_only'; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE odbc_connections ADD COLUMN created_by uuid; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE odbc_connections ADD COLUMN updated_at timestamptz DEFAULT now(); EXCEPTION WHEN duplicate_column THEN NULL; END;
END $$;

ALTER TABLE odbc_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_manage_odbc" ON odbc_connections;
CREATE POLICY "admin_manage_odbc" ON odbc_connections FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
    AND ur.role IN ('superadmin','webmaster','admin','database_admin'))
);

-- ── 3. odbc_query_log ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS odbc_query_log (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid        REFERENCES odbc_connections(id) ON DELETE CASCADE,
  query_text    text        NOT NULL,
  result_rows   int,
  duration_ms   int,
  status        text        DEFAULT 'ok',
  error_msg     text,
  executed_by   uuid        REFERENCES auth.users(id),
  created_at    timestamptz DEFAULT now()
);
ALTER TABLE odbc_query_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_see_odbc_log" ON odbc_query_log;
DROP POLICY IF EXISTS "insert_odbc_log"    ON odbc_query_log;
CREATE POLICY "admin_see_odbc_log" ON odbc_query_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
    AND ur.role IN ('superadmin','webmaster','admin','database_admin'))
);
CREATE POLICY "insert_odbc_log" ON odbc_query_log FOR INSERT WITH CHECK (true);

-- ── 4. system_modules — guaranteed create ────────────────────────────────
CREATE TABLE IF NOT EXISTS system_modules (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id   text    UNIQUE NOT NULL,
  label       text    NOT NULL,
  description text,
  is_enabled  boolean DEFAULT true,
  icon        text,
  color       text,
  path        text,
  roles       text[]  DEFAULT '{}',
  sort_order  int     DEFAULT 0,
  updated_by  uuid    REFERENCES auth.users(id),
  updated_at  timestamptz DEFAULT now()
);
ALTER TABLE system_modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_manage_modules" ON system_modules;
DROP POLICY IF EXISTS "auth_read_modules"    ON system_modules;
CREATE POLICY "admin_manage_modules" ON system_modules FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
    AND ur.role IN ('superadmin','webmaster','admin'))
);
CREATE POLICY "auth_read_modules" ON system_modules FOR SELECT TO authenticated USING (true);

-- Seed modules
INSERT INTO system_modules (module_id,label,description,is_enabled,color,path,sort_order) VALUES
('procurement','Procurement','Requisitions, purchase orders, suppliers, tenders',true,'#0078d4','/requisitions',1),
('finance','Finance','Budgets, vouchers, chart of accounts',true,'#7719aa','/financials/dashboard',2),
('inventory','Inventory','Items, categories, scanner, warehouse',true,'#038387','/items',3),
('quality','Quality','Inspections, non-conformance, QC dashboard',true,'#498205','/quality/dashboard',4),
('contracts','Contracts','Contract lifecycle management',true,'#0078d4','/contracts',5),
('tenders','Tenders','Tender management and bid evaluations',true,'#7719aa','/tenders',6),
('documents','Documents','Document library and imports',true,'#5c2d91','/documents',7),
('reports','Reports','Analytics, exports, Power BI dashboards',true,'#5c2d91','/reports',8),
('comms','Communications','SMS, WhatsApp, email, telephony',true,'#0072c6','/sms',9),
('accountant','Accountant','Invoice matching, payments, ERP sync',true,'#7719aa','/accountant-workspace',10),
('system','System','Settings, backup, ODBC connections',true,'#00188f','/settings',11),
('admin','Admin Panel','User management, IP stats, activity log',true,'#a4262c','/admin',12),
('odbc','ODBC Manager','SQL Server connection manager',true,'#038387','/odbc',13),
('hr','HR & Facilities','Staff management, departments',true,'#b4009e','/departments',14)
ON CONFLICT (module_id) DO UPDATE SET
  label=EXCLUDED.label, description=EXCLUDED.description, updated_at=now();

-- ── 5. admin_activity_log ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid    REFERENCES auth.users(id) ON DELETE SET NULL,
  action      text    NOT NULL,
  entity_type text,
  entity_id   text,
  details     jsonb   DEFAULT '{}',
  ip_address  text,
  user_agent  text,
  severity    text    DEFAULT 'info'
              CHECK (severity IN ('info','warning','critical','error')),
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_user    ON admin_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_action  ON admin_activity_log(action);
CREATE INDEX IF NOT EXISTS idx_activity_created ON admin_activity_log(created_at DESC);
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_read_activity" ON admin_activity_log;
DROP POLICY IF EXISTS "insert_activity"     ON admin_activity_log;
CREATE POLICY "admin_read_activity" ON admin_activity_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
    AND ur.role IN ('superadmin','webmaster','admin','database_admin'))
);
CREATE POLICY "insert_activity" ON admin_activity_log FOR INSERT WITH CHECK (true);

-- ── 6. print_log ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS print_log (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  page        text    NOT NULL,
  entity_type text,
  entity_id   text,
  printed_by  uuid    REFERENCES auth.users(id),
  ip_address  text,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE print_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_print_log" ON print_log;
CREATE POLICY "auth_print_log" ON print_log FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ── 7. quotations — open RLS fix ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quotations (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text    NOT NULL,
  supplier_id   uuid    REFERENCES suppliers(id) ON DELETE SET NULL,
  requisition_id uuid   REFERENCES requisitions(id) ON DELETE SET NULL,
  status        text    DEFAULT 'draft'
                CHECK (status IN ('draft','submitted','approved','rejected','expired')),
  total_amount  numeric(14,2),
  currency      text    DEFAULT 'KES',
  valid_until   date,
  items         jsonb   DEFAULT '[]',
  notes         text,
  created_by    uuid    REFERENCES auth.users(id),
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all_quotations" ON quotations;
CREATE POLICY "auth_all_quotations" ON quotations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 8. erp_sync_queue ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS erp_sync_queue (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type     text    NOT NULL,
  direction     text    DEFAULT 'pull' CHECK (direction IN ('pull','push')),
  status        text    DEFAULT 'pending'
                CHECK (status IN ('pending','running','done','failed')),
  payload       jsonb   DEFAULT '{}',
  result        jsonb,
  error_msg     text,
  is_manual     boolean DEFAULT false,
  connection_id uuid    REFERENCES odbc_connections(id) ON DELETE SET NULL,
  initiated_by  uuid    REFERENCES auth.users(id),
  started_at    timestamptz,
  completed_at  timestamptz,
  created_at    timestamptz DEFAULT now()
);
ALTER TABLE erp_sync_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_erp_sync" ON erp_sync_queue;
CREATE POLICY "auth_erp_sync" ON erp_sync_queue
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 9. app_restart_log — for restart services feature ────────────────────
CREATE TABLE IF NOT EXISTS app_restart_log (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  service      text    NOT NULL, -- 'web','edge_functions','cache','realtime'
  action       text    NOT NULL, -- 'restart','reload','flush_cache','reconnect'
  triggered_by uuid    REFERENCES auth.users(id),
  status       text    DEFAULT 'pending',
  notes        text,
  created_at   timestamptz DEFAULT now(),
  completed_at timestamptz
);
ALTER TABLE app_restart_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_manage_restart" ON app_restart_log FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
    AND ur.role IN ('superadmin','webmaster','admin'))
);

-- ── 10. Enable realtime on all new tables ─────────────────────────────────
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE system_modules;    EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE admin_activity_log;EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE odbc_connections;  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE odbc_query_log;    EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE erp_sync_queue;    EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE app_restart_log;   EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE notifications;     EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

COMMIT;

-- ── 11. Schema cache reload helper ────────────────────────────────────────
-- Called by admin panel "Flush Schema Cache" button
CREATE OR REPLACE FUNCTION reload_schema()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Notify PostgREST to reload schema
  NOTIFY pgrst, 'reload schema';
END;
$$;

GRANT EXECUTE ON FUNCTION reload_schema() TO authenticated;
