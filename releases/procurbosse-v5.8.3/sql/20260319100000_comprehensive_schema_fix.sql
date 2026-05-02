-- ============================================================
-- ProcurBosse v2.0 — Comprehensive Schema Fix
-- Fixes ALL column-not-found errors + adds missing tables
-- Safe: uses IF NOT EXISTS / DO $$ patterns throughout
-- ============================================================

-- ── 1. REQUISITIONS — add missing columns ──────────────────
ALTER TABLE requisitions
  ADD COLUMN IF NOT EXISTS title              TEXT,
  ADD COLUMN IF NOT EXISTS department         TEXT,
  ADD COLUMN IF NOT EXISTS requester_name     TEXT,
  ADD COLUMN IF NOT EXISTS delivery_date      DATE,
  ADD COLUMN IF NOT EXISTS required_date      DATE,
  ADD COLUMN IF NOT EXISTS delivery_location  TEXT,
  ADD COLUMN IF NOT EXISTS hospital_ward      TEXT,
  ADD COLUMN IF NOT EXISTS description        TEXT,
  ADD COLUMN IF NOT EXISTS purpose            TEXT,
  ADD COLUMN IF NOT EXISTS reference_number   TEXT,
  ADD COLUMN IF NOT EXISTS approved_by_name   TEXT,
  ADD COLUMN IF NOT EXISTS rejected_reason    TEXT,
  ADD COLUMN IF NOT EXISTS is_urgent          BOOLEAN DEFAULT FALSE;

-- ── 2. REQUISITION_ITEMS — add missing columns ─────────────
ALTER TABLE requisition_items
  ADD COLUMN IF NOT EXISTS description       TEXT,
  ADD COLUMN IF NOT EXISTS unit_of_measure   TEXT DEFAULT 'pcs',
  ADD COLUMN IF NOT EXISTS unit_price        NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS specifications    TEXT;

-- ── 3. TENDERS — add missing columns ──────────────────────
ALTER TABLE tenders
  ADD COLUMN IF NOT EXISTS contact_person        TEXT,
  ADD COLUMN IF NOT EXISTS contact_email         TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone         TEXT,
  ADD COLUMN IF NOT EXISTS evaluation_criteria   TEXT,
  ADD COLUMN IF NOT EXISTS award_date            DATE,
  ADD COLUMN IF NOT EXISTS awarded_to            TEXT,
  ADD COLUMN IF NOT EXISTS awarded_amount        NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS bid_bond_required     BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS bid_bond_amount       NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS performance_bond      BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS approved_by           UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_by_name      TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason      TEXT,
  ADD COLUMN IF NOT EXISTS updated_at            TIMESTAMPTZ DEFAULT NOW();

-- ── 4. PURCHASE_ORDERS — add missing columns ──────────────
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS department         TEXT,
  ADD COLUMN IF NOT EXISTS approved_by        UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_by_name   TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason   TEXT,
  ADD COLUMN IF NOT EXISTS vat_amount         NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount    NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS include_vat        BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS vat_rate           TEXT DEFAULT '16',
  ADD COLUMN IF NOT EXISTS terms_conditions   TEXT,
  ADD COLUMN IF NOT EXISTS supplier_address   TEXT,
  ADD COLUMN IF NOT EXISTS supplier_phone     TEXT,
  ADD COLUMN IF NOT EXISTS supplier_email     TEXT,
  ADD COLUMN IF NOT EXISTS supplier_pin       TEXT;

-- ── 5. PURCHASE_ORDER_ITEMS — add missing columns ──────────
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id           UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_id         UUID REFERENCES items(id),
  item_name       TEXT NOT NULL,
  description     TEXT,
  unit_of_measure TEXT DEFAULT 'pcs',
  quantity        NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price      NUMERIC(12,2) DEFAULT 0,
  total_price     NUMERIC(12,2) DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 6. GOODS_RECEIVED — add missing columns ─────────────────
ALTER TABLE goods_received
  ADD COLUMN IF NOT EXISTS invoice_number      TEXT,
  ADD COLUMN IF NOT EXISTS waybill_number      TEXT,
  ADD COLUMN IF NOT EXISTS store_location      TEXT DEFAULT 'Main Store',
  ADD COLUMN IF NOT EXISTS remarks             TEXT,
  ADD COLUMN IF NOT EXISTS total_value         NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quality_checked     BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS quality_checked_by  TEXT;

-- ── 7. GRN_ITEMS — ensure table exists ─────────────────────
CREATE TABLE IF NOT EXISTS grn_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_id              UUID REFERENCES goods_received(id) ON DELETE CASCADE,
  item_id             UUID REFERENCES items(id),
  item_name           TEXT NOT NULL,
  description         TEXT,
  unit_of_measure     TEXT DEFAULT 'pcs',
  quantity_ordered    NUMERIC(10,2) DEFAULT 0,
  quantity_received   NUMERIC(10,2) DEFAULT 0,
  quantity_accepted   NUMERIC(10,2) DEFAULT 0,
  quantity_rejected   NUMERIC(10,2) DEFAULT 0,
  unit_price          NUMERIC(12,2) DEFAULT 0,
  condition           TEXT DEFAULT 'Good',
  rejection_reason    TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── 8. SUPPLIERS — add missing columns ─────────────────────
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS registration_number TEXT,
  ADD COLUMN IF NOT EXISTS pin_number          TEXT,
  ADD COLUMN IF NOT EXISTS county              TEXT,
  ADD COLUMN IF NOT EXISTS postal_address      TEXT,
  ADD COLUMN IF NOT EXISTS website             TEXT,
  ADD COLUMN IF NOT EXISTS contact_person      TEXT,
  ADD COLUMN IF NOT EXISTS bank_name           TEXT,
  ADD COLUMN IF NOT EXISTS bank_account        TEXT,
  ADD COLUMN IF NOT EXISTS bank_branch         TEXT,
  ADD COLUMN IF NOT EXISTS rating              INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes               TEXT,
  ADD COLUMN IF NOT EXISTS updated_at          TIMESTAMPTZ DEFAULT NOW();

-- ── 9. CONTRACTS — add missing columns ─────────────────────
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS contract_value      NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS currency            TEXT DEFAULT 'KES',
  ADD COLUMN IF NOT EXISTS payment_terms       TEXT,
  ADD COLUMN IF NOT EXISTS contact_person      TEXT,
  ADD COLUMN IF NOT EXISTS contact_email       TEXT,
  ADD COLUMN IF NOT EXISTS vat_applicable      BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS signed_date         DATE,
  ADD COLUMN IF NOT EXISTS signed_by           TEXT,
  ADD COLUMN IF NOT EXISTS renewal_count       INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_renew          BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS termination_notice  INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS notes               TEXT,
  ADD COLUMN IF NOT EXISTS updated_at          TIMESTAMPTZ DEFAULT NOW();

-- ── 10. EXTERNAL_CONNECTIONS — full table + columns ─────────
CREATE TABLE IF NOT EXISTS external_connections (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  type                TEXT NOT NULL DEFAULT 'postgresql',
  host                TEXT,
  port                INTEGER DEFAULT 5432,
  database_name       TEXT,
  username            TEXT,
  password            TEXT,
  ssl                 BOOLEAN DEFAULT FALSE,
  dsn                 TEXT,
  connection_string   TEXT,
  description         TEXT,
  schema              TEXT DEFAULT 'public',
  sync_interval       TEXT DEFAULT 'manual',
  timeout             INTEGER DEFAULT 30,
  status              TEXT DEFAULT 'inactive',
  last_tested         TIMESTAMPTZ,
  last_sync           TIMESTAMPTZ,
  error_message       TEXT,
  metadata            JSONB DEFAULT '{}',
  created_by          UUID REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if table already existed
ALTER TABLE external_connections
  ADD COLUMN IF NOT EXISTS description    TEXT,
  ADD COLUMN IF NOT EXISTS schema         TEXT DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS sync_interval  TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS timeout        INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS metadata       JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS error_message  TEXT,
  ADD COLUMN IF NOT EXISTS last_sync      TIMESTAMPTZ;

-- ── 11. PAYMENT_VOUCHERS — add missing columns ─────────────
ALTER TABLE payment_vouchers
  ADD COLUMN IF NOT EXISTS payee_name      TEXT,
  ADD COLUMN IF NOT EXISTS payee_pin       TEXT,
  ADD COLUMN IF NOT EXISTS bank_name       TEXT,
  ADD COLUMN IF NOT EXISTS account_number  TEXT,
  ADD COLUMN IF NOT EXISTS cheque_number   TEXT,
  ADD COLUMN IF NOT EXISTS payment_method  TEXT DEFAULT 'Cheque',
  ADD COLUMN IF NOT EXISTS fund_code       TEXT,
  ADD COLUMN IF NOT EXISTS vote_head       TEXT,
  ADD COLUMN IF NOT EXISTS period          TEXT,
  ADD COLUMN IF NOT EXISTS grn_number      TEXT,
  ADD COLUMN IF NOT EXISTS subtotal        NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS tax_amount      NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS approved_by     UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at     TIMESTAMPTZ;

-- ── 12. SYSTEM_SETTINGS — ensure all keys exist ────────────
INSERT INTO system_settings (key, value) VALUES
  ('hospital_name',        'Embu Level 5 Hospital'),
  ('county_name',          'Embu County Government'),
  ('department_name',      'Department of Health'),
  ('system_name',          'EL5 MediProcure'),
  ('hospital_address',     'Embu Town, Embu County, Kenya'),
  ('hospital_phone',       '+254 060 000000'),
  ('hospital_email',       'info@embu.health.go.ke'),
  ('po_box',               'P.O. Box 591-60100, Embu'),
  ('doc_footer',           'Embu Level 5 Hospital · Embu County Government · Department of Health'),
  ('currency_symbol',      'KES'),
  ('vat_rate',             '16'),
  ('logo_url',             ''),
  ('seal_url',             ''),
  ('print_font',           'Times New Roman'),
  ('print_font_size',      '11'),
  ('paper_size',           'A4'),
  ('show_logo_print',      'true'),
  ('show_stamp',           'true'),
  ('show_watermark',       'false'),
  ('print_confidential',   'true'),
  ('primary_color',        '#1a3a6b'),
  ('accent_color',         '#C45911'),
  ('theme',                'light'),
  ('maintenance_mode',     'false'),
  ('realtime_notifications','true'),
  ('enable_procurement',   'true'),
  ('enable_financials',    'true'),
  ('enable_quality',       'true'),
  ('enable_scanner',       'true'),
  ('enable_vouchers',      'true'),
  ('enable_tenders',       'true'),
  ('enable_contracts_module','true'),
  ('enable_documents',     'true'),
  ('enable_email',         'true'),
  ('smtp_host',            ''),
  ('smtp_port',            '587'),
  ('smtp_user',            ''),
  ('smtp_pass',            ''),
  ('smtp_from_name',       'EL5 MediProcure'),
  ('smtp_from_email',      ''),
  ('smtp_tls',             'true'),
  ('smtp_enabled',         'false'),
  ('session_timeout',      '480'),
  ('max_login_attempts',   '5'),
  ('audit_logins',         'true'),
  ('ip_restriction',       'false'),
  ('allowed_ips',          ''),
  ('date_format',          'DD/MM/YYYY'),
  ('timezone',             'Africa/Nairobi'),
  ('max_upload_mb',        '25'),
  ('allow_registration',   'false'),
  ('default_user_role',    'requisitioner'),
  ('system_version',       '2.0.0')
ON CONFLICT (key) DO NOTHING;

-- ── 13. REPORTS table (new) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_name     TEXT NOT NULL,
  report_type     TEXT NOT NULL,
  module          TEXT,
  filters         JSONB DEFAULT '{}',
  columns         JSONB DEFAULT '[]',
  data_snapshot   JSONB,
  generated_by    UUID REFERENCES auth.users(id),
  generated_by_name TEXT,
  format          TEXT DEFAULT 'html',
  status          TEXT DEFAULT 'generated',
  file_url        TEXT,
  row_count       INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 14. EMAIL_INBOX table (enhanced) ────────────────────────
CREATE TABLE IF NOT EXISTS email_inbox (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id    TEXT UNIQUE,
  from_address  TEXT NOT NULL,
  from_name     TEXT,
  to_address    TEXT,
  cc_address    TEXT,
  subject       TEXT NOT NULL,
  body_text     TEXT,
  body_html     TEXT,
  is_read       BOOLEAN DEFAULT FALSE,
  is_starred    BOOLEAN DEFAULT FALSE,
  is_archived   BOOLEAN DEFAULT FALSE,
  folder        TEXT DEFAULT 'inbox',
  attachments   JSONB DEFAULT '[]',
  received_at   TIMESTAMPTZ DEFAULT NOW(),
  user_id       UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 15. EMAIL_SENT table ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_sent (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_address    TEXT,
  to_address      TEXT NOT NULL,
  cc_address      TEXT,
  bcc_address     TEXT,
  subject         TEXT NOT NULL,
  body_text       TEXT,
  body_html       TEXT,
  status          TEXT DEFAULT 'sent',
  sent_via        TEXT DEFAULT 'smtp',
  error_message   TEXT,
  attachments     JSONB DEFAULT '[]',
  sent_by         UUID REFERENCES auth.users(id),
  sent_by_name    TEXT,
  sent_at         TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 16. FIXED_ASSETS — add missing ──────────────────────────
CREATE TABLE IF NOT EXISTS fixed_assets (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_number        TEXT UNIQUE NOT NULL,
  asset_name          TEXT NOT NULL,
  category            TEXT,
  department          TEXT,
  location            TEXT,
  purchase_date       DATE,
  purchase_price      NUMERIC(15,2) DEFAULT 0,
  current_value       NUMERIC(15,2) DEFAULT 0,
  depreciation_method TEXT DEFAULT 'straight_line',
  depreciation_rate   NUMERIC(5,2) DEFAULT 0,
  useful_life_years   INTEGER DEFAULT 5,
  supplier_id         UUID REFERENCES suppliers(id),
  condition           TEXT DEFAULT 'Good',
  status              TEXT DEFAULT 'active',
  serial_number       TEXT,
  warranty_expiry     DATE,
  last_serviced       DATE,
  next_service        DATE,
  notes               TEXT,
  created_by          UUID REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── 17. BUDGETS — add missing columns ───────────────────────
ALTER TABLE budgets
  ADD COLUMN IF NOT EXISTS department      TEXT,
  ADD COLUMN IF NOT EXISTS period_start    DATE,
  ADD COLUMN IF NOT EXISTS period_end      DATE,
  ADD COLUMN IF NOT EXISTS fiscal_year     TEXT,
  ADD COLUMN IF NOT EXISTS approved_by     UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes           TEXT,
  ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ DEFAULT NOW();

-- ── 18. RLS Policies for new tables ────────────────────────
ALTER TABLE external_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins_manage_connections" ON external_connections;
CREATE POLICY "admins_manage_connections" ON external_connections
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','webmaster'))
  );

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_view_reports" ON reports;
CREATE POLICY "users_view_reports" ON reports
  FOR ALL USING (auth.uid() IS NOT NULL);

ALTER TABLE email_inbox ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_inbox" ON email_inbox;
CREATE POLICY "users_own_inbox" ON email_inbox
  FOR ALL USING (auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

ALTER TABLE email_sent ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_sent" ON email_sent;
CREATE POLICY "users_own_sent" ON email_sent
  FOR ALL USING (auth.uid() = sent_by OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

ALTER TABLE fixed_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_view_assets" ON fixed_assets;
CREATE POLICY "users_view_assets" ON fixed_assets
  FOR ALL USING (auth.uid() IS NOT NULL);

ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_view_po_items" ON purchase_order_items;
CREATE POLICY "users_view_po_items" ON purchase_order_items
  FOR ALL USING (auth.uid() IS NOT NULL);

ALTER TABLE grn_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_view_grn_items" ON grn_items;
CREATE POLICY "users_view_grn_items" ON grn_items
  FOR ALL USING (auth.uid() IS NOT NULL);

-- ── 19. Indexes for performance ─────────────────────────────
CREATE INDEX IF NOT EXISTS idx_requisitions_dept        ON requisitions(department);
CREATE INDEX IF NOT EXISTS idx_requisitions_status      ON requisitions(status);
CREATE INDEX IF NOT EXISTS idx_tenders_status           ON tenders(status);
CREATE INDEX IF NOT EXISTS idx_tenders_closing          ON tenders(closing_date);
CREATE INDEX IF NOT EXISTS idx_po_supplier              ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_status                ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_ext_conn_status          ON external_connections(status);
CREATE INDEX IF NOT EXISTS idx_email_inbox_user         ON email_inbox(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_reports_type             ON reports(report_type, module);
CREATE INDEX IF NOT EXISTS idx_assets_dept              ON fixed_assets(department);

