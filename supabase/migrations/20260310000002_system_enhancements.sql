-- ============================================================
-- System Enhancement Migration v3.1
-- Adds module controls, broadcast log, enhanced settings
-- ============================================================

-- System broadcasts log table
CREATE TABLE IF NOT EXISTS system_broadcasts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  type        TEXT DEFAULT 'info',
  action_url  TEXT,
  expires_in  INTEGER DEFAULT 30,
  sent_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_at     TIMESTAMPTZ DEFAULT now(),
  recipient_count INTEGER DEFAULT 0
);

-- Module settings for webmaster control
CREATE TABLE IF NOT EXISTS module_settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id   TEXT NOT NULL UNIQUE,
  label       TEXT NOT NULL,
  is_enabled  BOOLEAN DEFAULT TRUE,
  path        TEXT,
  updated_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE system_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_settings   ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Admins manage broadcasts"
  ON system_broadcasts FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY IF NOT EXISTS "All read module settings"
  ON module_settings FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY IF NOT EXISTS "Admins update module settings"
  ON module_settings FOR ALL USING (auth.uid() IS NOT NULL);

-- Add missing columns to profiles (if not present)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active   BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone       TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url  TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen   TIMESTAMPTZ;

-- Add reply_body and replied_at to inbox_items (if not already added)
ALTER TABLE inbox_items ADD COLUMN IF NOT EXISTS reply_body  TEXT;
ALTER TABLE inbox_items ADD COLUMN IF NOT EXISTS replied_at  TIMESTAMPTZ;
ALTER TABLE inbox_items ADD COLUMN IF NOT EXISTS action_taken TEXT;

-- Additional system settings
INSERT INTO system_settings (key, value, description) VALUES
  ('primary_color',       '#0a2558',          'Primary brand color'),
  ('accent_color',        '#C45911',           'Accent / secondary color'),
  ('system_name',         'EL5 MediProcure',   'System display name'),
  ('system_tagline',      'Embu Level 5 Hospital', 'Hospital tagline'),
  ('max_file_upload_mb',  '10',                'Maximum file upload size in MB'),
  ('session_timeout_min', '60',                'Session timeout in minutes'),
  ('po_approval_limit',   '500000',            'PO amount requiring senior approval (KES)'),
  ('req_approval_limit',  '100000',            'Requisition auto-approval limit (KES)'),
  ('low_stock_threshold', '10',                'Low stock alert threshold'),
  ('tender_min_bidders',  '3',                 'Minimum bidders for tender'),
  ('currency_symbol',     'KES',               'Currency symbol'),
  ('date_format',         'DD/MM/YYYY',        'Date display format'),
  ('time_zone',           'Africa/Nairobi',    'System timezone'),
  ('financial_year_start','July',              'Start month of financial year'),
  ('vat_rate',            '16',                'Default VAT rate (%)'),
  ('withholding_tax',     '3',                 'Withholding tax rate (%)')
ON CONFLICT (key) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_system_broadcasts_sent_at ON system_broadcasts(sent_at);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active        ON profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_inbox_items_is_starred    ON inbox_items(is_starred);

-- Log migration
INSERT INTO audit_log (action, table_name, new_values, performed_by)
VALUES ('MIGRATION_APPLIED', 'system', '{"migration":"system_enhancements","version":"3.1"}', 'System')
ON CONFLICT DO NOTHING;
