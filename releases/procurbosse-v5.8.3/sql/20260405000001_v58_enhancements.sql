-- ─────────────────────────────────────────────────────────────────────────────
-- ProcurBosse v5.8 — Comprehensive Schema Enhancements
-- Embu Level 5 Hospital · EL5 MediProcure
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Ensure samwise@gmail.com is full admin
DO $$
DECLARE v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = 'samwise@gmail.com' LIMIT 1;
  IF v_uid IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role) VALUES (v_uid, 'admin') ON CONFLICT DO NOTHING;
    INSERT INTO user_roles (user_id, role) VALUES (v_uid, 'database_admin') ON CONFLICT DO NOTHING;
    INSERT INTO user_roles (user_id, role) VALUES (v_uid, 'accountant') ON CONFLICT DO NOTHING;
    UPDATE profiles SET role = 'admin' WHERE id = v_uid;
  END IF;
END $$;

-- 2. Payment vouchers — add missing columns
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_vouchers' AND column_name='approved_at') THEN
    ALTER TABLE payment_vouchers ADD COLUMN approved_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_vouchers' AND column_name='approved_by') THEN
    ALTER TABLE payment_vouchers ADD COLUMN approved_by uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_vouchers' AND column_name='paid_at') THEN
    ALTER TABLE payment_vouchers ADD COLUMN paid_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_vouchers' AND column_name='rejection_reason') THEN
    ALTER TABLE payment_vouchers ADD COLUMN rejection_reason text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_vouchers' AND column_name='due_date') THEN
    ALTER TABLE payment_vouchers ADD COLUMN due_date date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_vouchers' AND column_name='payment_method') THEN
    ALTER TABLE payment_vouchers ADD COLUMN payment_method text DEFAULT 'EFT/Bank Transfer';
  END IF;
END $$;

-- 3. Accountant-specific tables
CREATE TABLE IF NOT EXISTS invoice_matching (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number text,
  po_id uuid,
  grn_number text,
  grn_id uuid,
  invoice_number text,
  supplier text,
  supplier_id uuid,
  amount numeric(15,2) DEFAULT 0,
  matched_amount numeric(15,2) DEFAULT 0,
  variance numeric(15,2) DEFAULT 0,
  status text DEFAULT 'pending',
  gl_verified boolean DEFAULT false,
  gl_account text,
  notes text,
  matched_by uuid,
  matched_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS erp_sync_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type text NOT NULL,
  entity_type text,
  entity_id uuid,
  direction text DEFAULT 'push',
  status text DEFAULT 'pending',
  is_manual boolean DEFAULT false,
  gl_verified boolean DEFAULT false,
  payload jsonb DEFAULT '{}',
  error_message text,
  retry_count int DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS budget_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text,
  budget_code text,
  vote_head text,
  consumed_pct numeric(5,2) DEFAULT 0,
  allocated_amount numeric(15,2) DEFAULT 0,
  consumed_amount numeric(15,2) DEFAULT 0,
  status text DEFAULT 'warning',
  override_approved boolean DEFAULT false,
  override_by uuid,
  override_at timestamptz,
  override_reason text,
  message text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gl_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gl_account text,
  account_name text,
  reference text,
  description text,
  debit numeric(15,2) DEFAULT 0,
  credit numeric(15,2) DEFAULT 0,
  balance numeric(15,2) DEFAULT 0,
  entity_type text,
  entity_id uuid,
  status text DEFAULT 'posted',
  posted_by uuid,
  posted_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_number text UNIQUE NOT NULL,
  supplier_id uuid,
  supplier_name text,
  status text DEFAULT 'draft',
  total_amount numeric(15,2) DEFAULT 0,
  valid_until date,
  notes text,
  terms text,
  created_by uuid,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. API Keys table for external API security
CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name text NOT NULL,
  key_hash text UNIQUE NOT NULL,
  created_by uuid NOT NULL,
  roles text[] DEFAULT '{}',
  expires_at timestamptz,
  last_used_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 5. System cache invalidation log
CREATE TABLE IF NOT EXISTS cache_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  cache_key text,
  triggered_by uuid,
  created_at timestamptz DEFAULT now()
);

-- 6. Twilio / SMS settings
INSERT INTO system_settings (key, value, category, label) VALUES
  ('twilio_account_sid',   '',          'twilio', 'Twilio Account SID'),
  ('twilio_auth_token',    '',          'twilio', 'Twilio Auth Token'),
  ('twilio_phone_number',  '',          'twilio', 'Twilio From Number'),
  ('twilio_enabled',       'false',     'twilio', 'Enable Twilio'),
  ('twilio_outbound_enabled', 'true',   'twilio', 'Enable Outbound Calls'),
  ('smtp_enabled',         'true',      'email',  'Enable SMTP'),
  ('smtp_provider',        'resend',    'email',  'SMTP Provider'),
  ('smtp_host',            'smtp.resend.com', 'email', 'SMTP Host'),
  ('smtp_port',            '587',       'email',  'SMTP Port'),
  ('smtp_tls',             'true',      'email',  'SMTP TLS'),
  ('resend_api_key',       '',          'email',  'Resend API Key'),
  ('smtp_from_email',      'noreply@embu.go.ke', 'email', 'From Email'),
  ('smtp_from_name',       'EL5 MediProcure',    'email', 'From Name'),
  ('mysql_host',           '',          'database', 'MySQL Host'),
  ('mysql_port',           '3306',      'database', 'MySQL Port'),
  ('mysql_database',       'procurbosse', 'database', 'MySQL Database'),
  ('mysql_user',           '',          'database', 'MySQL User'),
  ('mysql_password',       '',          'database', 'MySQL Password'),
  ('mysql_enabled',        'false',     'database', 'Enable MySQL Sync'),
  ('supabase_failover',    'true',      'database', 'Supabase as Failover')
ON CONFLICT (key) DO NOTHING;

-- 7. Enable RLS policies for new tables
ALTER TABLE invoice_matching ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE gl_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Permissive policies for authenticated users (role enforcement in app)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='invoice_matching' AND policyname='auth_users') THEN
    CREATE POLICY auth_users ON invoice_matching FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='erp_sync_queue' AND policyname='auth_users') THEN
    CREATE POLICY auth_users ON erp_sync_queue FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='budget_alerts' AND policyname='auth_users') THEN
    CREATE POLICY auth_users ON budget_alerts FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gl_entries' AND policyname='auth_users') THEN
    CREATE POLICY auth_users ON gl_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='quotations' AND policyname='auth_users') THEN
    CREATE POLICY auth_users ON quotations FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='api_keys' AND policyname='admin_only') THEN
    CREATE POLICY admin_only ON api_keys FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 8. Performance indexes
CREATE INDEX IF NOT EXISTS idx_invoice_matching_status ON invoice_matching(status);
CREATE INDEX IF NOT EXISTS idx_erp_sync_status ON erp_sync_queue(status, direction);
CREATE INDEX IF NOT EXISTS idx_budget_alerts_approved ON budget_alerts(override_approved);
CREATE INDEX IF NOT EXISTS idx_gl_entries_account ON gl_entries(gl_account);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_payment_vouchers_status ON payment_vouchers(status);

-- 9. Sample data for accountant tables (only if empty)
INSERT INTO invoice_matching (po_number, grn_number, invoice_number, supplier, amount, status)
SELECT 'PO/EL5H/2025/0001', 'GRN/2025/001', 'INV-2025-001', 'Mediplus Supplies Ltd', 125000.00, 'pending'
WHERE NOT EXISTS (SELECT 1 FROM invoice_matching LIMIT 1);

INSERT INTO budget_alerts (alert_type, budget_code, vote_head, consumed_pct, allocated_amount, consumed_amount, status)
SELECT 'over_budget', 'BC-MED-2025', 'Medical Supplies', 92.5, 2000000, 1850000, 'warning'
WHERE NOT EXISTS (SELECT 1 FROM budget_alerts LIMIT 1);

COMMIT;
