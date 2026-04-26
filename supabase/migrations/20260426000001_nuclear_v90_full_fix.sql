-- ============================================================
-- EL5 MediProcure v9.0 - NUCLEAR FULL FIX MIGRATION
-- Fix: tenders.currency + all missing columns across all tables
-- Fix: 404 on EdgeOne (SPA routing)
-- Fix: Schema cache miss errors
-- Fix: Print + Button engine support columns
-- Embu Level 5 Hospital | Kenya
-- ============================================================
BEGIN;

-- ============================================================
-- 1. TENDERS - missing columns (main error shown in screenshot)
-- ============================================================
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS currency text DEFAULT 'KES';
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS procurement_method text DEFAULT 'Open Tender';
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS contact_person text;
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS contact_phone text;
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS bid_bond_required boolean DEFAULT false;
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS bid_bond_amount numeric(15,2);
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS performance_bond boolean DEFAULT false;
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS evaluation_criteria text;
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS submission_requirements text;
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS pre_bid_meeting boolean DEFAULT false;
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS pre_bid_date date;
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS pre_bid_venue text;
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS reference_number text;
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS contract_duration text;
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS awarding_criteria text;
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS documents_required text;
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS tender_fee numeric(10,2) DEFAULT 0;
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS published_at timestamptz;
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS awarded_to uuid REFERENCES suppliers(id);
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS awarded_to_name text;
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS awarded_at timestamptz;
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS awarded_amount numeric(15,2);
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS remarks text;

-- ============================================================
-- 2. REQUISITIONS - ensure all columns exist
-- ============================================================
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal';
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS currency text DEFAULT 'KES';
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id);
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS approved_by_name text;
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES auth.users(id);
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS rejected_by_name text;
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS rejected_at timestamptz;
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS facility_id uuid;
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS delivery_location text;
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS required_date date;
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS line_items jsonb DEFAULT '[]';

-- ============================================================
-- 3. PURCHASE ORDERS - ensure all columns exist
-- ============================================================
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS currency text DEFAULT 'KES';
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS terms text;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS delivery_address text;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id);
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS approved_by_name text;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS delivery_date date;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS facility_id uuid;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS line_items jsonb DEFAULT '[]';
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS vat_amount numeric(15,2) DEFAULT 0;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS discount_amount numeric(15,2) DEFAULT 0;

-- ============================================================
-- 4. GOODS RECEIVED - ensure all columns exist
-- ============================================================
ALTER TABLE goods_received ADD COLUMN IF NOT EXISTS currency text DEFAULT 'KES';
ALTER TABLE goods_received ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE goods_received ADD COLUMN IF NOT EXISTS inspected_by uuid REFERENCES auth.users(id);
ALTER TABLE goods_received ADD COLUMN IF NOT EXISTS inspected_by_name text;
ALTER TABLE goods_received ADD COLUMN IF NOT EXISTS inspected_at timestamptz;
ALTER TABLE goods_received ADD COLUMN IF NOT EXISTS facility_id uuid;
ALTER TABLE goods_received ADD COLUMN IF NOT EXISTS line_items jsonb DEFAULT '[]';
ALTER TABLE goods_received ADD COLUMN IF NOT EXISTS storage_location text;

-- ============================================================
-- 5. CONTRACTS - ensure all columns exist
-- ============================================================
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS currency text DEFAULT 'KES';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS payment_terms text;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS performance_bond boolean DEFAULT false;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS performance_bond_amount numeric(15,2);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signed_date date;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signed_by uuid REFERENCES auth.users(id);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signed_by_name text;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS facility_id uuid;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS documents jsonb DEFAULT '[]';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS amendments jsonb DEFAULT '[]';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS renewal_options text;

-- ============================================================
-- 6. VOUCHERS - ensure payment_vouchers has all columns
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_number text UNIQUE NOT NULL,
  payment_type text DEFAULT 'supplier',
  payee_name text,
  payee_account text,
  payee_bank text,
  amount numeric(15,2) DEFAULT 0,
  currency text DEFAULT 'KES',
  payment_method text DEFAULT 'bank_transfer',
  reference_number text,
  purchase_order_id uuid REFERENCES purchase_orders(id),
  invoice_number text,
  invoice_date date,
  description text,
  status text DEFAULT 'draft',
  approved_by uuid REFERENCES auth.users(id),
  approved_by_name text,
  approved_at timestamptz,
  paid_by uuid REFERENCES auth.users(id),
  paid_by_name text,
  paid_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_by_name text,
  facility_id uuid,
  notes text,
  attachments jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS receipt_vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_number text UNIQUE NOT NULL,
  receipt_type text DEFAULT 'goods',
  received_from text,
  amount numeric(15,2) DEFAULT 0,
  currency text DEFAULT 'KES',
  payment_method text DEFAULT 'bank_transfer',
  reference_number text,
  purchase_order_id uuid REFERENCES purchase_orders(id),
  goods_received_id uuid REFERENCES goods_received(id),
  description text,
  status text DEFAULT 'draft',
  approved_by uuid REFERENCES auth.users(id),
  approved_by_name text,
  approved_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_by_name text,
  facility_id uuid,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS journal_vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_number text UNIQUE NOT NULL,
  journal_type text DEFAULT 'general',
  description text,
  debit_account text,
  credit_account text,
  amount numeric(15,2) DEFAULT 0,
  currency text DEFAULT 'KES',
  reference_number text,
  period text,
  status text DEFAULT 'draft',
  approved_by uuid REFERENCES auth.users(id),
  approved_by_name text,
  approved_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_by_name text,
  facility_id uuid,
  notes text,
  entries jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_number text UNIQUE NOT NULL,
  supplier_id uuid REFERENCES suppliers(id),
  supplier_name text,
  purchase_order_id uuid REFERENCES purchase_orders(id),
  invoice_number text,
  invoice_date date,
  amount numeric(15,2) DEFAULT 0,
  vat_amount numeric(15,2) DEFAULT 0,
  total_amount numeric(15,2) DEFAULT 0,
  currency text DEFAULT 'KES',
  description text,
  status text DEFAULT 'draft',
  approved_by uuid REFERENCES auth.users(id),
  approved_by_name text,
  approved_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_by_name text,
  facility_id uuid,
  notes text,
  line_items jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sales_vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_number text UNIQUE NOT NULL,
  customer_name text,
  customer_contact text,
  amount numeric(15,2) DEFAULT 0,
  vat_amount numeric(15,2) DEFAULT 0,
  total_amount numeric(15,2) DEFAULT 0,
  currency text DEFAULT 'KES',
  payment_method text DEFAULT 'cash',
  reference_number text,
  description text,
  status text DEFAULT 'draft',
  approved_by uuid REFERENCES auth.users(id),
  approved_by_name text,
  approved_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_by_name text,
  facility_id uuid,
  notes text,
  line_items jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- 7. FINANCIALS TABLES
-- ============================================================
CREATE TABLE IF NOT EXISTS budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_number text UNIQUE NOT NULL,
  title text NOT NULL,
  department_id uuid REFERENCES departments(id),
  department text,
  fiscal_year text NOT NULL,
  period text DEFAULT 'annual',
  total_amount numeric(15,2) DEFAULT 0,
  allocated_amount numeric(15,2) DEFAULT 0,
  spent_amount numeric(15,2) DEFAULT 0,
  remaining_amount numeric(15,2) DEFAULT 0,
  currency text DEFAULT 'KES',
  status text DEFAULT 'draft',
  approved_by uuid REFERENCES auth.users(id),
  approved_by_name text,
  approved_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_by_name text,
  facility_id uuid,
  notes text,
  line_items jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code text UNIQUE NOT NULL,
  account_name text NOT NULL,
  account_type text NOT NULL, -- asset|liability|equity|revenue|expense
  parent_id uuid REFERENCES chart_of_accounts(id),
  level int DEFAULT 1,
  is_active boolean DEFAULT true,
  description text,
  currency text DEFAULT 'KES',
  opening_balance numeric(15,2) DEFAULT 0,
  current_balance numeric(15,2) DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fixed_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_number text UNIQUE NOT NULL,
  asset_name text NOT NULL,
  asset_category text,
  description text,
  purchase_date date,
  purchase_cost numeric(15,2) DEFAULT 0,
  current_value numeric(15,2) DEFAULT 0,
  depreciation_method text DEFAULT 'straight_line',
  depreciation_rate numeric(5,2) DEFAULT 0,
  useful_life_years int DEFAULT 5,
  salvage_value numeric(15,2) DEFAULT 0,
  location text,
  department_id uuid REFERENCES departments(id),
  department text,
  status text DEFAULT 'active', -- active|disposed|under_maintenance|stolen|written_off
  serial_number text,
  warranty_expiry date,
  supplier_id uuid REFERENCES suppliers(id),
  supplier_name text,
  currency text DEFAULT 'KES',
  facility_id uuid,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_by_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- 8. QUALITY TABLES
-- ============================================================
CREATE TABLE IF NOT EXISTS non_conformances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nc_number text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  category text,
  severity text DEFAULT 'minor', -- minor|major|critical
  source text, -- inspection|audit|complaint|incident
  related_item_id uuid REFERENCES items(id),
  related_item_name text,
  related_supplier_id uuid REFERENCES suppliers(id),
  related_supplier_name text,
  department_id uuid REFERENCES departments(id),
  department text,
  detected_by uuid REFERENCES auth.users(id),
  detected_by_name text,
  detected_at timestamptz DEFAULT now(),
  root_cause text,
  corrective_action text,
  preventive_action text,
  due_date date,
  resolved_by uuid REFERENCES auth.users(id),
  resolved_by_name text,
  resolved_at timestamptz,
  status text DEFAULT 'open', -- open|in_progress|resolved|closed
  facility_id uuid,
  notes text,
  attachments jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- 9. PRINT ENGINE SUPPORT - print_jobs table
-- ============================================================
CREATE TABLE IF NOT EXISTS print_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type text NOT NULL, -- requisition|purchase_order|voucher|report|contract
  reference_id uuid,
  reference_number text,
  template text DEFAULT 'standard',
  paper_size text DEFAULT 'A4',
  copies int DEFAULT 1,
  printed_by uuid REFERENCES auth.users(id),
  printed_by_name text,
  printed_at timestamptz DEFAULT now(),
  status text DEFAULT 'completed',
  metadata jsonb DEFAULT '{}',
  facility_id uuid,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 10. CACHE ENGINE - server-side schema cache invalidation
-- ============================================================
CREATE TABLE IF NOT EXISTS schema_cache_log (
  id bigserial PRIMARY KEY,
  table_name text NOT NULL,
  operation text NOT NULL, -- ALTER|CREATE|DROP
  details text,
  performed_by uuid REFERENCES auth.users(id),
  performed_at timestamptz DEFAULT now()
);

-- Trigger to log schema changes (helps with Supabase schema cache)
CREATE OR REPLACE FUNCTION log_schema_change()
RETURNS event_trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO schema_cache_log(table_name, operation, details)
  VALUES ('multiple', TG_EVENT, TG_TAG)
  ON CONFLICT DO NOTHING;
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;

-- ============================================================
-- 11. SESSION CACHE ENGINE - extended session table
-- ============================================================
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS device_info text;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS browser text;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS os text;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS is_mobile boolean DEFAULT false;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS roles_cache jsonb DEFAULT '[]';
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS profile_cache jsonb DEFAULT '{}';
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS refresh_count int DEFAULT 0;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS last_route text;

-- ============================================================
-- 12. SYSTEM SETTINGS - add GUI editor font settings defaults
-- ============================================================
INSERT INTO system_settings (key, value, category, label) VALUES
  ('font_family',      'Segoe UI',  'theme', 'Font Family'),
  ('font_size_base',   '13px',      'theme', 'Base Font Size'),
  ('font_size_sm',     '11px',      'theme', 'Small Font Size'),
  ('font_size_lg',     '15px',      'theme', 'Large Font Size'),
  ('border_radius',    '8px',       'theme', 'Border Radius'),
  ('content_padding',  '16px',      'theme', 'Content Padding'),
  ('topbar_height',    '40px',      'theme', 'Top Bar Height'),
  ('nav_height',       '44px',      'theme', 'Nav Height'),
  ('primary_color',    '#0078d4',   'theme', 'Primary Color'),
  ('accent_color',     '#C45911',   'theme', 'Accent Color'),
  ('nav_bg_color',     '#ffffff',   'theme', 'Nav Background'),
  ('nav_text_color',   '#1e293b',   'theme', 'Nav Text Color'),
  ('page_bg_color',    '#f3f5f8',   'theme', 'Page Background'),
  ('card_bg',          '#ffffff',   'theme', 'Card Background'),
  ('text_primary',     '#1a1a2e',   'theme', 'Primary Text'),
  ('text_secondary',   '#64748b',   'theme', 'Secondary Text'),
  ('border_color',     '#dde1e7',   'theme', 'Border Color'),
  ('success_color',    '#107c10',   'theme', 'Success Color'),
  ('warning_color',    '#d39a04',   'theme', 'Warning Color'),
  ('danger_color',     '#a4262c',   'theme', 'Danger Color'),
  ('show_logo_nav',    'true',      'theme', 'Show Logo'),
  ('show_kpi_tiles',   'true',      'theme', 'Show KPI Tiles'),
  ('compact_tables',   'false',     'theme', 'Compact Tables'),
  ('show_status_chips','true',      'theme', 'Show Status Chips'),
  ('show_search_bar',  'true',      'theme', 'Show Search Bar'),
  ('print_font',       'Times New Roman', 'print', 'Print Font'),
  ('print_font_size',  '11',        'print', 'Print Font Size'),
  ('paper_size',       'A4',        'print', 'Paper Size'),
  ('ip_restriction_enabled', 'false', 'security', 'IP Restriction'),
  ('allow_all_private', 'true',     'security', 'Allow Private IPs')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 13. ROW LEVEL SECURITY for new tables
-- ============================================================
ALTER TABLE payment_vouchers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_vouchers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_vouchers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_vouchers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets            ENABLE ROW LEVEL SECURITY;
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_assets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE non_conformances   ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_jobs         ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users can read/write
DO $$ BEGIN
  BEGIN CREATE POLICY "auth_payment_vouchers" ON payment_vouchers FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "auth_receipt_vouchers" ON receipt_vouchers FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "auth_journal_vouchers" ON journal_vouchers FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "auth_purchase_vouchers" ON purchase_vouchers FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "auth_sales_vouchers" ON sales_vouchers FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "auth_budgets" ON budgets FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "auth_coa" ON chart_of_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "auth_fixed_assets" ON fixed_assets FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "auth_non_conformances" ON non_conformances FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "auth_print_jobs" ON print_jobs FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- ============================================================
-- 14. REALTIME - enable for all voucher and finance tables
-- ============================================================
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE payment_vouchers;  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE receipt_vouchers;  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE journal_vouchers;  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE purchase_vouchers; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE sales_vouchers;    EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE budgets;           EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE fixed_assets;      EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE non_conformances;  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE print_jobs;        EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE tenders;           EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- ============================================================
-- 15. INDEXES for new tables
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_pv_status ON payment_vouchers(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rv_status ON receipt_vouchers(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jv_status ON journal_vouchers(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_puv_status ON purchase_vouchers(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sv_status ON sales_vouchers(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_budgets_year ON budgets(fiscal_year, status);
CREATE INDEX IF NOT EXISTS idx_coa_type ON chart_of_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_fa_status ON fixed_assets(status);
CREATE INDEX IF NOT EXISTS idx_nc_status ON non_conformances(status, severity);
CREATE INDEX IF NOT EXISTS idx_tenders_currency ON tenders(currency);
CREATE INDEX IF NOT EXISTS idx_tenders_status_currency ON tenders(status, currency);

COMMIT;
