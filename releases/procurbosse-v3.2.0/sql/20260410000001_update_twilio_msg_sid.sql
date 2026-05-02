-- EL5 MediProcure — Update Twilio Messaging Service SID
-- Old: VA692606d4faea3c18432a857f111dbfad
-- New: MGd547d8e3273fda2d21afdd6856acb245
UPDATE system_settings
SET value = 'MGd547d8e3273fda2d21afdd6856acb245',
    updated_at = now()
WHERE key = 'twilio_messaging_service_sid';

INSERT INTO system_settings (key, value, category, label)
VALUES ('twilio_messaging_service_sid', 'MGd547d8e3273fda2d21afdd6856acb245', 'twilio', 'Messaging Service SID')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
