-- ip_access_log: 1,850 rows, 93% older than 90 days, growing unbounded
-- on every access check with no retention policy. Clean up now and add
-- a daily retention job so it doesn't reaccumulate.
delete from ip_access_log where created_at < now() - interval '90 days';

select cron.schedule(
  'ip-access-log-retention',
  '40 3 * * *',
  $$ delete from ip_access_log where created_at < now() - interval '90 days'; $$
);

-- not_found_log: small today but same unbounded-growth shape (logs
-- every 404 hit). Proactive retention before it becomes the next
-- ip_access_log rather than waiting for it to bloat first.
select cron.schedule(
  'not-found-log-retention',
  '45 3 * * *',
  $$ delete from not_found_log where created_at < now() - interval '90 days'; $$
);

-- audit_logs: long retention (1 year) since these are the actual audit
-- trail admins may need to review — not aggressive cleanup, just a
-- ceiling so it can't grow forever either.
select cron.schedule(
  'audit-logs-retention',
  '50 3 * * *',
  $$ delete from audit_logs where created_at < now() - interval '365 days'; $$
);
