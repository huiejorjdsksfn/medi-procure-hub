-- EL5 MediProcure — Gmail SMTP Configuration
-- Switches active SMTP provider to smtp.gmail.com + hpdeskg9@gmail.com
-- Migration: 20260628220000_gmail_smtp_config

UPDATE system_settings SET value = 'smtp.gmail.com',      updated_at = NOW() WHERE key = 'smtp_host';
UPDATE system_settings SET value = '587',                  updated_at = NOW() WHERE key = 'smtp_port';
UPDATE system_settings SET value = 'hpdeskg9@gmail.com',  updated_at = NOW() WHERE key = 'smtp_user';
UPDATE system_settings SET value = 'hpdeskg9@gmail.com',  updated_at = NOW() WHERE key = 'smtp_from_email';
UPDATE system_settings SET value = 'hpdeskg9@gmail.com',  updated_at = NOW() WHERE key = 'smtp_from';
UPDATE system_settings SET value = 'EL5 MediProcure',     updated_at = NOW() WHERE key = 'smtp_from_name';
UPDATE system_settings SET value = 'true',                 updated_at = NOW() WHERE key = 'smtp_tls';
UPDATE system_settings SET value = 'STARTTLS',             updated_at = NOW() WHERE key = 'smtp_security';
UPDATE system_settings SET value = 'gmail',                updated_at = NOW() WHERE key = 'smtp_provider';
UPDATE system_settings SET value = 'true',                 updated_at = NOW() WHERE key = 'smtp_enabled';

-- Clear stale smtp2go password slot
UPDATE system_settings SET value = '', updated_at = NOW()
WHERE key IN ('smtp_pass', 'smtp_password')
  AND value = 'U3gsGwKGaTw78l2A';

-- Upsert all Gmail SMTP keys
INSERT INTO system_settings (key, value, category, label)
VALUES
  ('smtp_host',       'smtp.gmail.com',      'email',   'SMTP Host'),
  ('smtp_port',       '587',                 'email',   'SMTP Port'),
  ('smtp_user',       'hpdeskg9@gmail.com',  'email',   'SMTP Username'),
  ('smtp_from_email', 'hpdeskg9@gmail.com',  'email',   'From Email'),
  ('smtp_from_name',  'EL5 MediProcure',     'email',   'From Name'),
  ('smtp_tls',        'true',                'email',   'Use TLS'),
  ('smtp_security',   'STARTTLS',            'email',   'Security Protocol'),
  ('smtp_provider',   'gmail',               'email',   'Email Provider'),
  ('smtp_enabled',    'true',                'email',   'SMTP Enabled'),
  ('admin_email',     'hpdeskg9@gmail.com',  'general', 'Admin Email'),
  ('support_email',   'hpdeskg9@gmail.com',  'general', 'Support Email')
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value, updated_at = NOW();
