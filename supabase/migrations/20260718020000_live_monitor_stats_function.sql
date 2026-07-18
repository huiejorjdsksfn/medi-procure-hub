-- EL5 MediProcure — Live Monitor (dbForge-style dashboard) stats RPC
-- Powers the Overview/Data IO/Databases/Wait Stats/Top Queries/Sessions/Backups
-- tabs on AdminDatabasePage + the compact widget on WebmasterPage. Every number
-- is real (pg_stat_activity / pg_stat_database / pg_stat_statements / pg_locks /
-- pg_stat_bgwriter) — Postgres has no OS-level CPU%/Memory-GB like SQL Server
-- exposes, so those panels are mapped to the closest real Postgres equivalents
-- (connection load, buffer cache hit ratio, checkpoint/buffer I/O) rather than
-- faked with mock numbers.

create or replace function public.get_live_monitor_stats()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  result jsonb;
  has_pg_stat_statements boolean;
begin
  if not exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ) and not exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role in ('admin','superadmin','database_admin','webmaster')
  ) then
    raise exception 'Admin role required';
  end if;

  select exists(select 1 from pg_extension where extname='pg_stat_statements') into has_pg_stat_statements;

  select jsonb_build_object(
    'server', jsonb_build_object(
      'version', (select split_part(version(), ' on ', 1)),
      'started_at', pg_postmaster_start_time(),
      'uptime_seconds', extract(epoch from (now() - pg_postmaster_start_time())),
      'max_connections', (select setting::int from pg_settings where name='max_connections'),
      'shared_buffers', (select setting from pg_settings where name='shared_buffers'),
      'effective_cache_size', (select setting from pg_settings where name='effective_cache_size'),
      'work_mem', (select setting from pg_settings where name='work_mem'),
      'timezone', (select setting from pg_settings where name='TimeZone'),
      'server_encoding', (select setting from pg_settings where name='server_encoding'),
      'data_checksums', (select setting from pg_settings where name='data_checksums'),
      'current_database', current_database()
    ),
    'connections', jsonb_build_object(
      'active', (select count(*) from pg_stat_activity where state='active'),
      'idle', (select count(*) from pg_stat_activity where state='idle'),
      'idle_in_transaction', (select count(*) from pg_stat_activity where state='idle in transaction'),
      'waiting', (select count(*) from pg_stat_activity where wait_event is not null),
      'total', (select count(*) from pg_stat_activity)
    ),
    'transactions', (
      select jsonb_build_object(
        'xact_commit', sum(xact_commit), 'xact_rollback', sum(xact_rollback),
        'tup_returned', sum(tup_returned), 'tup_fetched', sum(tup_fetched),
        'tup_inserted', sum(tup_inserted), 'tup_updated', sum(tup_updated), 'tup_deleted', sum(tup_deleted),
        'blks_read', sum(blks_read), 'blks_hit', sum(blks_hit),
        'cache_hit_ratio', round(100.0 * sum(blks_hit) / nullif(sum(blks_hit)+sum(blks_read),0), 2),
        'deadlocks', sum(deadlocks), 'temp_files', sum(temp_files), 'temp_bytes', sum(temp_bytes)
      ) from pg_stat_database where datname = current_database()
    ),
    'scans', (
      select jsonb_build_object(
        'seq_scan', coalesce(sum(seq_scan),0), 'seq_tup_read', coalesce(sum(seq_tup_read),0),
        'idx_scan', coalesce(sum(idx_scan),0), 'idx_tup_fetch', coalesce(sum(idx_tup_fetch),0),
        'n_tup_ins', coalesce(sum(n_tup_ins),0), 'n_tup_upd', coalesce(sum(n_tup_upd),0), 'n_tup_del', coalesce(sum(n_tup_del),0)
      ) from pg_stat_user_tables
    ),
    'bgwriter', (
      select jsonb_build_object(
        'buffers_clean', buffers_clean, 'buffers_backend', buffers_backend,
        'buffers_alloc', buffers_alloc
      ) from pg_stat_bgwriter
    ),
    'locks', jsonb_build_object(
      'waiting', (select count(*) from pg_locks where not granted),
      'total', (select count(*) from pg_locks)
    ),
    'storage', jsonb_build_object(
      'database_size_bytes', pg_database_size(current_database()),
      'database_size_pretty', pg_size_pretty(pg_database_size(current_database()))
    ),
    'databases', (
      select coalesce(jsonb_agg(d), '[]'::jsonb) from (
        select datname, pg_size_pretty(pg_database_size(datname)) as size_pretty,
               pg_database_size(datname) as size_bytes
        from pg_database where not datistemplate order by pg_database_size(datname) desc limit 10
      ) d
    ),
    'sessions', (
      select coalesce(jsonb_agg(s), '[]'::jsonb) from (
        select pid, usename, application_name, client_addr::text as client_addr, state,
               wait_event_type, wait_event, query_start,
               left(query, 160) as query_snippet,
               extract(epoch from (now()-query_start))::int as running_seconds
        from pg_stat_activity
        where datname = current_database() and pid <> pg_backend_pid()
        order by query_start desc nulls last limit 50
      ) s
    ),
    'top_queries', case when has_pg_stat_statements then (
      select coalesce(jsonb_agg(q), '[]'::jsonb) from (
        select left(query,200) as query_snippet, calls,
               round(total_exec_time::numeric,1) as total_exec_ms,
               round(mean_exec_time::numeric,2) as mean_exec_ms,
               rows
        from extensions.pg_stat_statements
        where dbid = (select oid from pg_database where datname = current_database())
        order by total_exec_time desc limit 15
      ) q
    ) else '[]'::jsonb end,
    'backups', (
      select coalesce(jsonb_agg(b), '[]'::jsonb) from (
        select id, label, backup_type, status, size_bytes, started_at, completed_at, created_at
        from backup_jobs order by created_at desc limit 15
      ) b
    ),
    'generated_at', now()
  ) into result;

  return result;
exception when others then
  return jsonb_build_object('error', SQLERRM);
end;
$$;

grant execute on function public.get_live_monitor_stats() to authenticated;
