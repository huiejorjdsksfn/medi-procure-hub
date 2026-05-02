-- EL5 MediProcure — Update Twilio Messaging Service SID
-- Old: REDACTED_TWILIO_VERIFY_SID
-- New: REDACTED_TWILIO_MESSAGING_SID
UPDATE system_settings
SET value = 'REDACTED_TWILIO_MESSAGING_SID',
    updated_at = now()
WHERE key = 'twilio_messaging_service_sid';

INSERT INTO system_settings (key, value, category, label)
VALUES ('twilio_messaging_service_sid', 'REDACTED_TWILIO_MESSAGING_SID', 'twilio', 'Messaging Service SID')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
