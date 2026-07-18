-- SECURITY + STALE DATA: temp_pw_* rows in system_settings store
-- plaintext temporary passwords (the fallback path in UsersPage/
-- AdminPanelPage when supabase.auth.admin.updateUserById isn't
-- available). They're only ever deleted when the OTHER code path
-- succeeds — nothing clears them once written. Found two live entries:
-- one 65+ days old, one ~1 week old, both plaintext passwords for real
-- accounts sitting indefinitely in a settings table. Clean up now and
-- add a daily 7-day retention job — a temp password left unused for a
-- week should be rotated, not left exposed forever.
delete from system_settings where key like 'temp_pw_%' and updated_at < now() - interval '7 days';

select cron.schedule(
  'temp-password-retention',
  '35 3 * * *',
  $$ delete from system_settings where key like 'temp_pw_%' and updated_at < now() - interval '7 days'; $$
);
