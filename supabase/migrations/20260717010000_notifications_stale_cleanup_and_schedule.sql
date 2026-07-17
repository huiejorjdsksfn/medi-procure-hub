-- Remove stale notifications now (dismissed 90+ days ago, or expired
-- 30+ days ago) — the client query was never filtering dismissed_at/
-- expires_at at all, so every dismissed/expired row was still shown.
delete from notifications
where (dismissed_at is not null and dismissed_at < now() - interval '90 days')
   or (expires_at is not null and expires_at < now() - interval '30 days')
   or (created_at < now() - interval '180 days');

-- Keep it clean going forward: daily sweep of the same criteria.
select cron.schedule(
  'notifications-stale-cleanup',
  '30 3 * * *',
  $$
  delete from notifications
  where (dismissed_at is not null and dismissed_at < now() - interval '90 days')
     or (expires_at is not null and expires_at < now() - interval '30 days')
     or (created_at < now() - interval '180 days');
  $$
);
