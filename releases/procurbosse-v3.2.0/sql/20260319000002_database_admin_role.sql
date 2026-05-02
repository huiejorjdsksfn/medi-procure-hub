-- ═══════════════════════════════════════════════════════════════
-- DATABASE ADMIN ROLE — can fix errors, run SQL, manage all tables
-- ═══════════════════════════════════════════════════════════════

-- Add database_admin to user_roles check constraint if exists
do $$ begin
  -- Try to add database_admin as a valid role (extend existing constraint)
  -- If there's an existing constraint, drop and recreate
  if exists (
    select 1 from information_schema.table_constraints
    where table_name = 'user_roles' and constraint_name like '%role%check%'
  ) then
    alter table public.user_roles drop constraint if exists user_roles_role_check;
  end if;
exception when others then null;
end $$;

-- Add column for db-specific permissions
alter table public.profiles add column if not exists db_admin boolean default false;
alter table public.profiles add column if not exists can_run_sql boolean default false;
alter table public.profiles add column if not exists can_fix_errors boolean default false;

-- Create a database admin capabilities table
create table if not exists public.db_admin_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id),
  action      text not null,              -- fix_error | run_sql | truncate | insert | update | delete
  table_name  text,
  details     jsonb default '{}',
  sql_text    text,
  rows_affected int default 0,
  success     boolean default true,
  error_msg   text,
  executed_at timestamptz default now()
);

alter table public.db_admin_log enable row level security;

create policy "Database admins can view log" on public.db_admin_log
  for select using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
      and role in ('admin', 'database_admin')
    )
  );

create policy "Auth users can insert log" on public.db_admin_log
  for insert with check (auth.uid() is not null);

-- Error tracking table
create table if not exists public.system_errors (
  id          uuid primary key default gen_random_uuid(),
  error_type  text not null,              -- db_error | api_error | ui_error | auth_error
  error_code  text,
  message     text not null,
  stack_trace text,
  table_name  text,
  query_text  text,
  user_id     uuid references public.profiles(id),
  resolved    boolean default false,
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  resolution_notes text,
  severity    text default 'medium',     -- low | medium | high | critical
  created_at  timestamptz default now()
);

alter table public.system_errors enable row level security;

create policy "Admins view system errors" on public.system_errors
  for select using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
      and role in ('admin', 'database_admin')
    )
  );

create policy "System can insert errors" on public.system_errors
  for insert with check (true);

create policy "Admins can update errors" on public.system_errors
  for update using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
      and role in ('admin', 'database_admin')
    )
  );

-- Quick fix scripts table
create table if not exists public.db_fix_scripts (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  category    text default 'general',    -- integrity | performance | cleanup | migration | fix
  sql_up      text not null,             -- fix script
  sql_down    text,                      -- rollback script
  is_safe     boolean default true,
  run_count   int default 0,
  last_run_at timestamptz,
  last_run_by uuid references public.profiles(id),
  created_at  timestamptz default now()
);

alter table public.db_fix_scripts enable row level security;

create policy "DB admins manage fix scripts" on public.db_fix_scripts
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
      and role in ('admin', 'database_admin')
    )
  )
  with check (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
      and role in ('admin', 'database_admin')
    )
  );

-- Insert default fix scripts
insert into public.db_fix_scripts (title, description, category, sql_up, sql_down, is_safe) values
  ('Remove orphan requisition items', 'Delete requisition_items with no parent requisition', 'integrity',
   'DELETE FROM requisition_items WHERE requisition_id NOT IN (SELECT id FROM requisitions);',
   '-- No rollback — data was orphaned', true),
  ('Reset item stock to 0 where NULL', 'Fix NULL stock quantities', 'fix',
   'UPDATE items SET quantity_in_stock = 0 WHERE quantity_in_stock IS NULL;',
   'UPDATE items SET quantity_in_stock = NULL WHERE quantity_in_stock = 0;', true),
  ('Expire old pending requisitions (>90 days)', 'Mark old pending reqs as cancelled', 'cleanup',
   'UPDATE requisitions SET status = ''cancelled'' WHERE status = ''pending'' AND created_at < now() - interval ''90 days'';',
   '-- No rollback', true),
  ('Vacuum all tables (analyze)', 'Update table statistics for query planner', 'performance',
   'ANALYZE;',
   '-- No rollback needed', true),
  ('Fix NULL department names', 'Set default department where null', 'fix',
   'UPDATE items SET department = ''General'' WHERE department IS NULL OR department = '''';',
   '-- No rollback', true)
on conflict do nothing;

-- Enable realtime for error tracking
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'system_errors'
  ) then
    alter publication supabase_realtime add table public.system_errors;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'db_admin_log'
  ) then
    alter publication supabase_realtime add table public.db_admin_log;
  end if;
end $$;

comment on table public.db_admin_log    is 'Audit log of all database admin actions';
comment on table public.system_errors   is 'Tracked system errors for admin review and fixing';
comment on table public.db_fix_scripts  is 'Pre-written SQL fix scripts for common database issues';
