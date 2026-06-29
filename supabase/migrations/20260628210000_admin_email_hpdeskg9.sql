-- EL5 MediProcure — Admin Email Standardization
-- Sets hpdeskg9@gmail.com as the admin/sender email across all system_settings
-- Migration: 20260628210000_admin_email_hpdeskg9

-- Update existing rows with old email addresses
UPDATE system_settings
SET value = 'hpdeskg9@gmail.com', updated_at = NOW()
WHERE key IN ('smtp_from_email', 'smtp_user', 'admin_email', 'support_email', 'sender_email')
  AND (value ILIKE '%noreply@embu%' OR value ILIKE '%ict@embu%' OR value ILIKE '%system@el5h%' OR value = '');

-- Upsert the three canonical keys
INSERT INTO system_settings (key, value, category, label)
VALUES
  ('smtp_from_email', 'hpdeskg9@gmail.com', 'email',   'From Email'),
  ('admin_email',     'hpdeskg9@gmail.com', 'general', 'Admin Email'),
  ('support_email',   'hpdeskg9@gmail.com', 'general', 'Support Email')
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value, updated_at = NOW();

-- email_providers (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_providers') THEN
    UPDATE email_providers
    SET from_email = 'hpdeskg9@gmail.com', updated_at = NOW()
    WHERE from_email ILIKE '%noreply@embu%' OR from_email IS NULL OR from_email = '';
  END IF;
END $$;

-- smtp_configurations (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'smtp_configurations') THEN
    UPDATE smtp_configurations
    SET from_email = 'hpdeskg9@gmail.com', updated_at = NOW()
    WHERE from_email ILIKE '%noreply@embu%' OR from_email IS NULL OR from_email = '';
  END IF;
END $$;
