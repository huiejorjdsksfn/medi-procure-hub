-- EL5 MediProcure v12 — SMTP key cleanup
-- Removes the duplicate/unused "smtp_password" key (the real key read by
-- send-email, notification-hub and SmtpSettingsPanel is "smtp_pass").
-- Removes orphaned SendGrid-era supabase_smtp_* keys not used anywhere
-- in the codebase, left over from before the system standardized on Gmail SMTP.

DELETE FROM system_settings WHERE key = 'smtp_password';
DELETE FROM system_settings WHERE key IN (
  'supabase_smtp_host', 'supabase_smtp_port', 'supabase_smtp_user',
  'supabase_smtp_from_email', 'supabase_smtp_from_name', 'supabase_smtp_enabled'
);
