-- get_live_monitor_stats(): powers the Live Monitor tab (dbForge/SSMS-style
-- server + application dashboard). Real pg_stat_* data throughout, plus
-- application-level "site" metrics and a merged multi-table "loggers" feed.
-- History: fixed buffers_backend (removed from pg_stat_bgwriter in PG17),
-- added per-table breakdown, added site stats + unified logger feed, fixed
-- a jsonb_agg ORDER BY aliasing bug that would have taken down the entire
-- function result (single atomic SELECT) rather than just one field.
CREATE OR REPLACE FUNCTION public.get_live_monitor_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
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
    'tables', (
      select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select
          st.relname as table_name,
          pg_size_pretty(pg_total_relation_size(st.relid)) as total_size,
          pg_total_relation_size(st.relid) as total_size_bytes,
          st.n_live_tup as row_estimate,
          st.n_dead_tup as dead_rows,
          st.seq_scan, st.idx_scan,
          st.n_tup_ins, st.n_tup_upd, st.n_tup_del,
          st.last_vacuum, st.last_autovacuum, st.last_analyze, st.last_autoanalyze
        from pg_stat_user_tables st
        order by (coalesce(st.seq_scan,0) + coalesce(st.idx_scan,0) + coalesce(st.n_tup_ins,0) + coalesce(st.n_tup_upd,0) + coalesce(st.n_tup_del,0)) desc
        limit 20
      ) t
    ),
    'bgwriter', (
      select jsonb_build_object(
        'buffers_clean', bg.buffers_clean,
        'buffers_alloc', bg.buffers_alloc,
        'buffers_backend', coalesce((select sum(writes) from pg_stat_io where backend_type = 'client backend'), 0)
      ) from pg_stat_bgwriter bg
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
        select queryid::text as query_id, left(query,200) as query_snippet, calls,
               round(total_exec_time::numeric,1) as total_exec_ms,
               round(mean_exec_time::numeric,2) as mean_exec_ms,
               rows,
               shared_blks_hit, shared_blks_read
        from extensions.pg_stat_statements
        where dbid = (select oid from pg_database where datname = current_database())
        order by total_exec_time desc limit 25
      ) q
    ) else '[]'::jsonb end,
    'backups', (
      select coalesce(jsonb_agg(b), '[]'::jsonb) from (
        select id, label, backup_type, status, size_bytes, started_at, completed_at, created_at
        from backup_jobs order by created_at desc limit 15
      ) b
    ),
    'site', jsonb_build_object(
      'requisitions_today', (select count(*) from requisitions where created_at::date = current_date),
      'purchase_orders_today', (select count(*) from purchase_orders where created_at::date = current_date),
      'new_users_today', (select count(*) from profiles where created_at::date = current_date),
      'active_users_last_30min', (select count(distinct user_id) from audit_log where created_at > now() - interval '30 minutes' and user_id is not null),
      'failed_logins_today', (select count(*) from ip_access_log where allowed = false and created_at::date = current_date),
      'blocked_ips_today', (select count(distinct ip_address) from ip_access_log where allowed = false and created_at::date = current_date),
      'sms_sent_today', (select count(*) from sms_log where created_at::date = current_date and status = 'sent'),
      'sms_failed_today', (select count(*) from sms_log where created_at::date = current_date and status = 'failed'),
      'not_found_hits_today', (select count(*) from not_found_log where created_at::date = current_date),
      'crash_reports_unresolved', (select count(*) from crash_reports where resolved is distinct from true),
      'crash_reports_today', (select count(*) from crash_reports where created_at::date = current_date),
      'audit_events_today', (select count(*) from audit_log where created_at::date = current_date),
      'audit_events_last_hour', (select count(*) from audit_log where created_at > now() - interval '1 hour')
    ),
    'loggers', (
      select coalesce(jsonb_agg(l.j order by l.j->>'at' desc), '[]'::jsonb) from (
        (select jsonb_build_object('source','audit_log','at',created_at,'summary', coalesce(user_name,user_email,'system') || ' — ' || action || coalesce(' ('||module||')',''), 'severity', coalesce(severity,'info')) as j
         from audit_log order by created_at desc limit 15)
        union all
        (select jsonb_build_object('source','ip_access_log','at',created_at,'summary', case when allowed then 'Allowed: ' else 'BLOCKED: ' end || coalesce(ip_address,'?') || coalesce(' ('||reason||')',''), 'severity', case when allowed then 'info' else 'warning' end) as j
         from ip_access_log order by created_at desc limit 15)
        union all
        (select jsonb_build_object('source','not_found_log','at',created_at,'summary','404: '||coalesce(path,'?'), 'severity','info') as j
         from not_found_log order by created_at desc limit 10)
        union all
        (select jsonb_build_object('source','crash_reports','at',created_at,'summary', coalesce(page_name,path,'?') || ' — ' || left(coalesce(message,'unknown error'),120), 'severity','error') as j
         from crash_reports order by created_at desc limit 10)
        union all
        (select jsonb_build_object('source','sms_log','at',created_at,'summary', 'SMS ' || status || ' to ' || coalesce(to_number,'?'), 'severity', case when status='failed' then 'warning' else 'info' end) as j
         from sms_log order by created_at desc limit 10)
      ) l
      limit 40
    ),
    'generated_at', now()
  ) into result;

  return result;
exception when others then
  return jsonb_build_object('error', SQLERRM);
end;
$function$;

notify pgrst, 'reload schema';
