-- inbox_items: add missing columns
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inbox_items' AND column_name='reply_body' AND table_schema='public') THEN
    ALTER TABLE inbox_items ADD COLUMN reply_body text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inbox_items' AND column_name='replied_at' AND table_schema='public') THEN
    ALTER TABLE inbox_items ADD COLUMN replied_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inbox_items' AND column_name='action_taken' AND table_schema='public') THEN
    ALTER TABLE inbox_items ADD COLUMN action_taken text;
  END IF;
END $$;

-- documents: add template_html column
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='template_html' AND table_schema='public') THEN
    ALTER TABLE documents ADD COLUMN template_html text;
  END IF;
END $$;

-- System settings defaults
INSERT INTO system_settings (key, value, category, label) VALUES
  ('hospital_name',       'Embu Level 5 Hospital',                        'general', 'Hospital Name'),
  ('hospital_tagline',    'Tertiary Referral Hospital, Eastern Kenya',     'general', 'Hospital Tagline'),
  ('hospital_address',    'P.O. Box 384-60100, Embu, Kenya',              'general', 'Hospital Address'),
  ('hospital_phone',      '+254 (0)68 31096',                             'general', 'Hospital Phone'),
  ('hospital_email',      'info@embu.go.ke',                              'general', 'Hospital Email'),
  ('system_currency',     'KES',                                           'general', 'Currency'),
  ('system_timezone',     'Africa/Nairobi',                                'general', 'Timezone'),
  ('backup_retention_days','90',                                           'backup',  'Backup Retention (days)'),
  ('max_backup_size_mb',  '500',                                           'backup',  'Max Backup Size (MB)')
ON CONFLICT (key) DO NOTHING;
