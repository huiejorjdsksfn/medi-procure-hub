-- Email system enhancements migration
-- Adds email tracking, SMTP settings, and new admin features

-- Add extra columns to notifications table for email tracking
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS cc TEXT DEFAULT '';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS bcc TEXT DEFAULT '';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS smtp_used BOOLEAN DEFAULT FALSE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS subject TEXT;

-- Add email columns to inbox_items for better tracking
ALTER TABLE inbox_items ADD COLUMN IF NOT EXISTS notification_id UUID REFERENCES notifications(id) ON DELETE SET NULL;
ALTER TABLE inbox_items ADD COLUMN IF NOT EXISTS module TEXT DEFAULT 'general';
ALTER TABLE inbox_items ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT FALSE;
ALTER TABLE inbox_items ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- Add email column to notification_recipients
ALTER TABLE notification_recipients ADD COLUMN IF NOT EXISTS recipient_email TEXT;
ALTER TABLE notification_recipients ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Add new system settings for email, SMTP, and master controls
INSERT INTO system_settings (key, value, description) VALUES
  ('smtp_host',              '',          'SMTP server hostname'),
  ('smtp_port',              '587',       'SMTP server port'),
  ('smtp_user',              '',          'SMTP username/email'),
  ('smtp_from',              '',          'From email address'),
  ('smtp_from_name',         'EL5 MediProcure', 'From display name'),
  ('smtp_password',          '',          'SMTP password'),
  ('smtp_tls',               'true',      'Use TLS for SMTP'),
  ('email_notifications_enabled', 'true', 'Enable email notifications'),
  ('email_on_po_approve',    'true',      'Email on PO approval'),
  ('email_on_req_approve',   'true',      'Email on requisition approval'),
  ('email_on_tender_close',  'true',      'Email on tender closing'),
  ('email_on_grn',           'true',      'Email on GRN received'),
  ('maintenance_mode',       'false',     'System maintenance mode'),
  ('allow_registration',     'true',      'Allow new user registration'),
  ('audit_logging_enabled',  'true',      'Enable audit logging'),
  ('realtime_notifications', 'true',      'Enable real-time notifications'),
  ('enable_documents',       'true',      'Enable document attachments'),
  ('enable_scanner',         'true',      'Enable QR/barcode scanner'),
  ('enable_api',             'false',     'Enable external API integrations'),
  ('webhooks_enabled',       'false',     'Enable webhook notifications'),
  ('api_base_url',           '',          'External API base URL'),
  ('api_key',                '',          'External API key'),
  ('webhook_url',            '',          'Webhook URL for events'),
  ('force_pw_reset',         'false',     'Force password reset on first login'),
  ('lock_on_fail',           'true',      'Lock account after failed attempts'),
  ('backup_schedule',        'weekly',    'Backup schedule'),
  ('backup_include_audit',   'true',      'Include audit log in backup'),
  ('backup_compress',        'true',      'Compress backup files')
ON CONFLICT (key) DO NOTHING;

-- Create email_attachments table
CREATE TABLE IF NOT EXISTS email_attachments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id    UUID,
  filename    TEXT NOT NULL,
  file_url    TEXT,
  file_size   INTEGER,
  mime_type   TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Create email_drafts table
CREATE TABLE IF NOT EXISTS email_drafts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  to_emails   TEXT,
  cc          TEXT,
  bcc         TEXT,
  subject     TEXT,
  body        TEXT,
  priority    TEXT DEFAULT 'normal',
  module      TEXT DEFAULT 'general',
  template_id TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for new tables
ALTER TABLE IF EXISTS email_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS email_drafts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_drafts
CREATE POLICY IF NOT EXISTS "Users can manage their own drafts"
  ON email_drafts FOR ALL USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_inbox_items_to_user_status ON inbox_items(to_user_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_sender ON notifications(sender_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);

-- Log this migration
INSERT INTO audit_log (action, table_name, new_values, performed_by)
VALUES ('MIGRATION_APPLIED', 'system', '{"migration": "email_system_enhancements", "version": "2.1"}', 'System')
ON CONFLICT DO NOTHING;
