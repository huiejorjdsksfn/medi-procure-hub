-- EL5 MediProcure — Backend processor failover infrastructure
-- Persisted circuit-breaker state + failover event log used by
-- supabase/functions/_shared/failover.ts across Edge Function processors
-- (api-gateway, notify-api, mysql-proxy, mssql-import/test, etc.)

create table if not exists public.system_circuit_breaker (
  service_key   text primary key,
  state         text not null default 'closed' check (state in ('closed','open','half_open')),
  failure_count int  not null default 0,
  opened_at     timestamptz,
  updated_at    timestamptz not null default now()
);

alter table public.system_circuit_breaker enable row level security;

drop policy if exists "service_role_full_access_circuit_breaker" on public.system_circuit_breaker;
create policy "service_role_full_access_circuit_breaker"
  on public.system_circuit_breaker for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "admins_read_circuit_breaker" on public.system_circuit_breaker;
create policy "admins_read_circuit_breaker"
  on public.system_circuit_breaker for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'database_admin')
    )
  );

create table if not exists public.system_failover_log (
  id          bigint generated always as identity primary key,
  service_key text not null,
  event       text not null check (event in ('retry','circuit_open','circuit_close','provider_fallback','failure')),
  detail      text,
  created_at  timestamptz not null default now()
);

alter table public.system_failover_log enable row level security;

drop policy if exists "service_role_full_access_failover_log" on public.system_failover_log;
create policy "service_role_full_access_failover_log"
  on public.system_failover_log for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "admins_read_failover_log" on public.system_failover_log;
create policy "admins_read_failover_log"
  on public.system_failover_log for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'database_admin')
    )
  );

create index if not exists idx_failover_log_service_created
  on public.system_failover_log (service_key, created_at desc);

-- Keep the event log bounded — trim anything older than 30 days on each insert.
create or replace function public.trim_system_failover_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.system_failover_log
  where created_at < now() - interval '30 days';
  return new;
end;
$$;

drop trigger if exists trg_trim_failover_log on public.system_failover_log;
create trigger trg_trim_failover_log
  after insert on public.system_failover_log
  for each statement
  execute function public.trim_system_failover_log();

comment on table public.system_circuit_breaker is 'Persisted per-service circuit breaker state for Edge Function failover (see supabase/functions/_shared/failover.ts)';
comment on table public.system_failover_log is 'Observability log of retries, circuit trips, and provider fallbacks emitted by backend processors';
