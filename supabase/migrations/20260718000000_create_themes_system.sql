-- Bookkeeping: this was applied live via Supabase MCP earlier and is
-- reconstructed here for repo/production parity. Written idempotently
-- since the objects already exist in production.

create table if not exists public.themes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source text not null default 'manual' check (source in ('manual','image_extracted','preset')),
  colors jsonb not null default '{}'::jsonb,
  typography jsonb not null default '{}'::jsonb,
  layout jsonb not null default '{}'::jsonb,
  logo_url text,
  source_image_url text,
  is_active boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.enforce_single_active_theme()
returns trigger as $$
begin
  if new.is_active then
    update public.themes set is_active = false where id <> new.id and is_active = true;
  end if;
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_single_active_theme on public.themes;
create trigger trg_single_active_theme
before insert or update on public.themes
for each row execute function public.enforce_single_active_theme();

alter table public.themes enable row level security;

drop policy if exists "themes_select_all_authenticated" on public.themes;
create policy "themes_select_all_authenticated"
on public.themes for select
to authenticated
using (true);

drop policy if exists "themes_admin_write" on public.themes;
create policy "themes_admin_write"
on public.themes for all
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

do $$
begin
  if not exists (select 1 from public.themes) then
    insert into public.themes (name, source, colors, typography, layout, is_active)
    values (
      'Default Navy', 'preset',
      '{"primary":"#0a2558","accent":"#c45911","navbar_bg":"#0a2558","sidebar_bg":"#ffffff","success":"#16a34a","warning":"#ca8a04","danger":"#dc2626","text_primary":"#111827"}'::jsonb,
      '{"font_family":"Inter, system-ui, sans-serif","base_size":"14px"}'::jsonb,
      '{"border_radius":"6px","density":"comfortable"}'::jsonb,
      true
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'themes'
  ) then
    alter publication supabase_realtime add table public.themes;
  end if;
end $$;

notify pgrst, 'reload schema';
