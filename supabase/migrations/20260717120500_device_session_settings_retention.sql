-- device_session_* rows in system_settings (device fingerprint records)
-- have no retention either — same unbounded-growth shape as the other
-- log tables cleaned up this session, just lower urgency since they're
-- not credentials. 90-day retention, daily.
select cron.schedule(
  'device-session-settings-retention',
  '55 3 * * *',
  $$ delete from system_settings where key like 'device_session_%' and updated_at < now() - interval '90 days'; $$
);
