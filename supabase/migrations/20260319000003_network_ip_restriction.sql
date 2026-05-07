-- ══════════════════════════════════════════════════════════════════
-- Network / IP Restriction Settings
-- ══════════════════════════════════════════════════════════════════

-- Insert default network policy settings
insert into public.system_settings (key, value, category) values
  ('ip_restriction_enabled', 'false',          'security'),
  ('allow_all_private',      'true',           'security'),
  ('allowed_private_cidrs',  '192.168.0.0/16,10.0.0.0/8,172.16.0.0/12', 'security'),
  ('allowed_public_ips',     '',               'security'),
  ('force_network_check',    'true',           'security'),
  ('geo_block_countries',    '',               'security'),
  ('superadmin_email',       '',               'security'),
  ('superadmin_pin',         '',               'security')
on conflict (key) do nothing;

-- IP access log table
create table if not exists public.ip_access_log (
  id          uuid primary key default gen_random_uuid(),
  ip_address  text not null,
  network     text,               -- private | public
  allowed     boolean not null,
  reason      text,
  user_id     uuid references public.profiles(id),
  user_email  text,
  user_agent  text,
  created_at  timestamptz default now()
);

alter table public.ip_access_log enable row level security;

create policy "Admins view ip_access_log" on public.ip_access_log
  for select using (
    exists (select 1 from public.user_roles where user_id = auth.uid() and role in ('admin','database_admin'))
  );

create policy "System inserts ip_access_log" on public.ip_access_log
  for insert with check (true);

-- Network whitelist table (managed by admin UI)
create table if not exists public.network_whitelist (
  id          uuid primary key default gen_random_uuid(),
  label       text not null,              -- "Hospital Main LAN", "Director's VPN"
  cidr        text not null,              -- e.g. 192.168.1.0/24
  type        text default 'private',     -- private | public
  active      boolean default true,
  added_by    uuid references public.profiles(id),
  notes       text,
  created_at  timestamptz default now()
);

alter table public.network_whitelist enable row level security;

create policy "Admins manage network_whitelist" on public.network_whitelist
  using (
    exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  )
  with check (
    exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );

-- Seed default whitelist entries
insert into public.network_whitelist (label, cidr, type, active, notes) values
  ('Hospital LAN — Class A',  '10.0.0.0/8',      'private', true, 'All 10.x.x.x addresses'),
  ('Hospital LAN — Class C',  '192.168.0.0/16',   'private', true, 'All 192.168.x.x addresses'),
  ('Hospital LAN — Class B',  '172.16.0.0/12',    'private', true, 'All 172.16-31.x.x addresses'),
  ('Localhost',                '127.0.0.0/8',      'private', true, 'Local development')
on conflict do nothing;

comment on table public.ip_access_log      is 'Log of every network access check (allowed + denied)';
comment on table public.network_whitelist  is 'Admin-managed list of approved IP ranges';
