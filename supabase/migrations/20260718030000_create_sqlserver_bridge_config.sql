-- Real config for the SQL Server bridge (a small companion service the admin
-- runs on a machine with actual network access to SQL Server — Deno Edge
-- Functions can only speak HTTP/HTTPS, not the TCP-based TDS protocol SQL
-- Server uses, so this bridge is the only honest way to reach it live).
-- See tools/mssql-bridge-server in the repo for the real bridge service.
create table if not exists public.sqlserver_bridge_config (
  id uuid primary key default gen_random_uuid(),
  bridge_url text,
  shared_secret text,
  is_enabled boolean not null default false,
  last_ping_at timestamptz,
  last_status text,
  last_error text,
  sql_server_name text,
  sql_server_database text,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- Singleton row
insert into public.sqlserver_bridge_config (is_enabled)
select false where not exists (select 1 from public.sqlserver_bridge_config);

alter table public.sqlserver_bridge_config enable row level security;

drop policy if exists "bridge_config_admin_all" on public.sqlserver_bridge_config;
create policy "bridge_config_admin_all"
on public.sqlserver_bridge_config for all
to authenticated
using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('admin','superadmin','database_admin','webmaster')))
with check (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('admin','superadmin','database_admin','webmaster')));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sqlserver_bridge_config'
  ) then
    alter publication supabase_realtime add table public.sqlserver_bridge_config;
  end if;
end $$;

notify pgrst, 'reload schema';
