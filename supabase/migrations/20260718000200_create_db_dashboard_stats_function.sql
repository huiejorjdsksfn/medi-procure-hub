-- Bookkeeping: applied live earlier, reconstructed here for repo parity.
-- Powers AdminDatabasePage's "Server Dashboard" — real pg_stat_activity /
-- pg_stat_database / pg_database_size / pg_total_relation_size data, no
-- mock numbers. Admin-only (checked in the function body).

create or replace function public.get_db_dashboard_stats()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  result jsonb;
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  ) and not exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role in ('admin','superadmin','database_admin','webmaster')
  ) then
    raise exception 'Admin role required';
  end if;

  select jsonb_build_object(
    'server', jsonb_build_object(
      'version', (select split_part(version(), ' on ', 1)),
      'started_at', pg_postmaster_start_time(),
      'uptime_seconds', extract(epoch from (now() - pg_postmaster_start_time())),
      'max_connections', (select setting::int from pg_settings where name = 'max_connections')
    ),
    'connections', jsonb_build_object(
      'active', (select count(*) from pg_stat_activity where state = 'active'),
      'idle', (select count(*) from pg_stat_activity where state = 'idle'),
      'idle_in_transaction', (select count(*) from pg_stat_activity where state = 'idle in transaction'),
      'total', (select count(*) from pg_stat_activity)
    ),
    'storage', jsonb_build_object(
      'database_size_bytes', pg_database_size(current_database()),
      'database_size_pretty', pg_size_pretty(pg_database_size(current_database())),
      'top_tables', (
        select coalesce(jsonb_agg(t), '[]'::jsonb) from (
          select
            relname as table_name,
            pg_size_pretty(pg_total_relation_size(c.oid)) as total_size,
            pg_total_relation_size(c.oid) as total_size_bytes,
            (select reltuples::bigint from pg_class where oid = c.oid) as row_estimate
          from pg_class c
          join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public' and c.relkind = 'r'
          order by pg_total_relation_size(c.oid) desc
          limit 10
        ) t
      )
    ),
    'performance', jsonb_build_object(
      'cache_hit_ratio', (
        select round(
          (sum(blks_hit)::numeric / nullif(sum(blks_hit) + sum(blks_read), 0)) * 100, 2
        ) from pg_stat_database where datname = current_database()
      ),
      'transactions_committed', (select xact_commit from pg_stat_database where datname = current_database()),
      'transactions_rolled_back', (select xact_rollback from pg_stat_database where datname = current_database()),
      'tuples_returned', (select tup_returned from pg_stat_database where datname = current_database()),
      'tuples_fetched', (select tup_fetched from pg_stat_database where datname = current_database()),
      'deadlocks', (select deadlocks from pg_stat_database where datname = current_database()),
      'temp_files', (select temp_files from pg_stat_database where datname = current_database()),
      'temp_bytes', (select temp_bytes from pg_stat_database where datname = current_database())
    ),
    'errors', jsonb_build_object(
      'unresolved_count', (select count(*) from public.system_errors where is_resolved is distinct from true),
      'last_24h_count', (select count(*) from public.system_errors where created_at > now() - interval '24 hours'),
      'recent', (
        select coalesce(jsonb_agg(e), '[]'::jsonb) from (
          select id, error_code, error_msg, page, severity, is_resolved, created_at
          from public.system_errors
          order by created_at desc
          limit 10
        ) e
      )
    ),
    'generated_at', now()
  ) into result;

  return result;
end;
$$;

grant execute on function public.get_db_dashboard_stats() to authenticated;

notify pgrst, 'reload schema';
