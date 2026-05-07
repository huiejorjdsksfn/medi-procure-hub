-- ================================================================
-- EL5 MediProcure v5.8 — Seed Real Twilio Credentials
-- TWILIO_AUTH_TOKEN: SUPABASE_SECRET
-- Messaging Service SID: MGd547d8e3273fda2d21afdd6856acb245
-- ================================================================

INSERT INTO system_settings (key, value, description)
VALUES
  ('twilio_enabled',               'true',
   'Twilio SMS/WhatsApp fully activated'),
  ('twilio_account_sid',           'SUPABASE_SECRET',
   'Twilio Account SID — EL5H'),
  ('twilio_auth_token',            'SUPABASE_SECRET',
   'Twilio Auth Token — EL5H (also set as Supabase secret TWILIO_AUTH_TOKEN)'),
  ('twilio_phone_number',          '+16812972643',
   'Twilio SMS From number — EL5H'),
  ('twilio_messaging_service_sid', 'MGd547d8e3273fda2d21afdd6856acb245',
   'Twilio Messaging Service SID — EL5H'),
  ('twilio_whatsapp_number',       '+14155238886',
   'Twilio WhatsApp sandbox number'),
  ('twilio_whatsapp_join_code',    'join bad-machine',
   'WhatsApp sandbox join code'),
  ('twilio_voice_webhook',         'https://demo.twilio.com/welcome/voice/',
   'Twilio voice webhook URL'),
  ('twilio_service_name',          'EL5H',
   'Twilio messaging service label'),
  ('twilio_outbound_enabled',      'true',
   'Enable Twilio outbound calls'),
  ('whatsapp_sandbox_active',      'true',
   'WhatsApp sandbox is active (join bad-machine)'),
  ('sms_provider',                 'twilio',
   'Primary SMS provider'),
  ('sms_hospital_name',            'EL5 MediProcure',
   'Hospital name prefix in SMS messages'),
  ('sms_on_req_approve',           'true',   'SMS on requisition approval'),
  ('sms_on_po_approve',            'true',   'SMS on PO approval'),
  ('sms_on_low_stock',             'true',   'SMS on low stock alert'),
  ('sms_on_payment',               'true',   'SMS on payment processed'),
  ('sms_on_grn',                   'true',   'SMS on GRN created'),
  ('sms_on_tender_close',          'true',   'SMS on tender closing'),
  ('sms_on_req_submit',            'true',   'SMS on requisition submitted')
ON CONFLICT (key) DO UPDATE
  SET value       = EXCLUDED.value,
      description = EXCLUDED.description;

-- Verify: show what was set
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT key, LEFT(value,20) AS val_preview
    FROM system_settings
    WHERE key LIKE 'twilio_%' OR key LIKE 'sms_%' OR key LIKE 'whatsapp_%'
    ORDER BY key
  LOOP
    RAISE NOTICE '% = %', r.key, r.val_preview;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
