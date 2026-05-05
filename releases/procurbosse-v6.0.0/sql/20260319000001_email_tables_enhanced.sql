-- ── Email threads table ─────────────────────────────────────────
create table if not exists public.email_threads (
  id          uuid primary key default gen_random_uuid(),
  subject     text not null,
  participants uuid[] default '{}',
  last_message_at timestamptz default now(),
  message_count   int default 0,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz default now()
);
alter table public.email_threads enable row level security;
create policy "All users can read email_threads" on public.email_threads for select using (true);
create policy "Auth users can insert email_threads" on public.email_threads for insert with check (auth.uid() is not null);

-- ── Email drafts table ──────────────────────────────────────────
create table if not exists public.email_drafts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete cascade,
  to_email    text,
  cc          text,
  subject     text,
  body        text,
  priority    text default 'normal',
  saved_at    timestamptz default now()
);
alter table public.email_drafts enable row level security;
create policy "Users manage own drafts" on public.email_drafts
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── Email labels ────────────────────────────────────────────────
create table if not exists public.email_labels (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  name    text not null,
  color   text default '#6b7280',
  created_at timestamptz default now()
);
alter table public.email_labels enable row level security;
create policy "Users manage own labels" on public.email_labels
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── Message label assignments ───────────────────────────────────
create table if not exists public.email_message_labels (
  id       uuid primary key default gen_random_uuid(),
  msg_id   text not null,       -- inbox_items or notifications id
  label_id uuid references public.email_labels(id) on delete cascade,
  user_id  uuid references public.profiles(id) on delete cascade
);
alter table public.email_message_labels enable row level security;
create policy "Users manage own message labels" on public.email_message_labels
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── Email send log (tracks external delivery attempts) ──────────
create table if not exists public.email_send_log (
  id          uuid primary key default gen_random_uuid(),
  sent_by     uuid references public.profiles(id),
  to_email    text not null,
  subject     text,
  provider    text,    -- resend | sendgrid | mailgun | smtp | internal
  success     boolean default false,
  error_msg   text,
  sent_at     timestamptz default now()
);
alter table public.email_send_log enable row level security;
create policy "Admins can view email_send_log" on public.email_send_log
  for select using (
    exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );
create policy "Auth users can insert email_send_log" on public.email_send_log
  for insert with check (auth.uid() is not null);

-- ── Add cc column to inbox_items if missing ─────────────────────
alter table public.inbox_items add column if not exists cc text;
alter table public.inbox_items add column if not exists priority text default 'normal';
alter table public.inbox_items add column if not exists thread_id uuid;

-- ── Realtime on email tables ────────────────────────────────────
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'email_send_log'
  ) then
    alter publication supabase_realtime add table public.email_send_log;
  end if;
end $$;

comment on table public.email_threads    is 'Groups inbox messages into conversation threads';
comment on table public.email_drafts     is 'User-saved draft messages before sending';
comment on table public.email_labels     is 'Custom labels/folders per user';
comment on table public.email_send_log   is 'Audit log of all external email delivery attempts';
