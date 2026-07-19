-- EL5 MediProcure — extend live-monitoring RPCs so the Database page can
-- visually match the two reference designs (SSMS "Server Dashboard" report
-- and dbForge Monitor) with real data, not just similar-looking mock panels.

-- ── 1. get_db_dashboard_stats(): add server/edition detail, per-database
--      breakdown with a real data/index/toast size split (for the stacked
--      "DB Space Usage" bar), a Tables & Indexes grid, and a connection-state
--      breakdown for the donut chart (Postgres has no direct equivalent of
--      SQL Server wait-stat categories, so this uses the closest real,
--      continuously-changing performance signal instead of inventing one).
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
      'server_name', current_setting('cluster_name', true),
      'edition', 'PostgreSQL (Supabase)',
      'version', (select split_part(version(), ' on ', 1)),
      'product_version', (select setting from pg_settings where name = 'server_version'),
      'operating_system', (select split_part(split_part(version(), 'on ', 2), ',', 1)),
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
    -- Real data vs index vs toast size split per database, for a stacked
    -- "DB Space Usage" bar (this DB only — Supabase gives one DB per project).
    'databases', (
      select coalesce(jsonb_agg(d), '[]'::jsonb) from (
        select
          current_database() as database_name,
          pg_size_pretty(pg_database_size(current_database())) as total_size_pretty,
          pg_database_size(current_database()) as total_size_bytes,
          coalesce(sum(pg_relation_size(c.oid)),0) as data_bytes,
          coalesce(sum(pg_indexes_size(c.oid)),0) as index_bytes,
          coalesce(sum(pg_total_relation_size(c.oid) - pg_relation_size(c.oid) - pg_indexes_size(c.oid)),0) as toast_bytes
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r'
      ) d
    ),
    -- Tables & Indexes grid (right-hand panel in the reference report)
    'tables_and_indexes', (
      select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select
          t.schemaname as schema_name, t.relname as table_name,
          t.n_live_tup as row_count,
          i.indexname as index_name,
          case when idx.indisclustered then 'CLUSTERED' else 'NONCLUSTERED' end as index_type,
          idx.indisprimary as is_primary_key,
          idx.indisunique as is_unique
        from pg_stat_user_tables t
        join pg_indexes i on i.schemaname = t.schemaname and i.tablename = t.relname
        join pg_class ic on ic.relname = i.indexname
        join pg_index idx on idx.indexrelid = ic.oid
        where t.schemaname = 'public'
        order by t.n_live_tup desc, t.relname, i.indexname
        limit 200
      ) x
    ),
    -- Connection-state breakdown, for the donut chart (Postgres' closest
    -- real equivalent to a "Performance" wait-stats donut).
    'connection_states', (
      select coalesce(jsonb_agg(cs), '[]'::jsonb) from (
        select coalesce(state,'unknown') as state, count(*) as n
        from pg_stat_activity
        group by state
        order by n desc
      ) cs
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

-- ── 2. get_live_monitor_stats(): richer Host Properties + SQL Server
--      Properties panels (dbForge Monitor's right-hand column) built from
--      real pg_settings / version() — labeled as Postgres settings, not
--      relabeled as if they were literal SQL Server properties.
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
      'platform', (select split_part(split_part(version(), 'on ', 2), ',', 1)),
      'started_at', pg_postmaster_start_time(),
      'uptime_seconds', extract(epoch from (now() - pg_postmaster_start_time())),
      'max_connections', (select setting::int from pg_settings where name='max_connections'),
      'shared_buffers', (select setting from pg_settings where name='shared_buffers'),
      'effective_cache_size', (select setting from pg_settings where name='effective_cache_size'),
      'work_mem', (select setting from pg_settings where name='work_mem'),
      'maintenance_work_mem', (select setting from pg_settings where name='maintenance_work_mem'),
      'timezone', (select setting from pg_settings where name='TimeZone'),
      'server_encoding', (select setting from pg_settings where name='server_encoding'),
      'lc_collate', (select setting from pg_settings where name='lc_collate'),
      'lc_ctype', (select setting from pg_settings where name='lc_ctype'),
      'data_checksums', (select setting from pg_settings where name='data_checksums'),
      'wal_level', (select setting from pg_settings where name='wal_level'),
      'max_wal_size', (select setting from pg_settings where name='max_wal_size'),
      'checkpoint_timeout', (select setting from pg_settings where name='checkpoint_timeout'),
      'autovacuum', (select setting from pg_settings where name='autovacuum'),
      'port', (select setting from pg_settings where name='port'),
      'listen_addresses', (select setting from pg_settings where name='listen_addresses'),
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
