-- ═══════════════════════════════════════════════════════════════════════════
-- SMS / Email / Notification Settings
-- Adds Africa's Talking, Resend, and notification toggle settings
-- EL5 MediProcure -- Embu Level 5 Hospital
-- ═══════════════════════════════════════════════════════════════════════════

-- Ensure system_settings table exists (it should, but be safe)
create table if not exists public.system_settings (
  id         uuid primary key default gen_random_uuid(),
  key        text unique not null,
  value      text,
  label      text,
  category   text default 'general',
  updated_at timestamptz default now()
);

-- ── SMS Settings ──────────────────────────────────────────────────────────────
insert into public.system_settings (key, value, label, category) values
  ('sms_notifications_enabled',    'false',            'SMS Notifications Enabled',         'sms'),
  ('sms_provider',                 'twilio',           'SMS Provider (twilio/africas_talking)', 'sms'),
  ('sms_hospital_name',            'EL5 MediProcure',  'SMS Sender Name',                   'sms'),
  ('sms_sender_id',                'EL5PROCURE',       'SMS Sender ID (AT)',                 'sms'),
  ('twilio_enabled',               'false',            'Twilio Enabled',                    'sms'),
  ('twilio_account_sid',           '',                 'Twilio Account SID',                'sms'),
  ('twilio_auth_token',            '',                 'Twilio Auth Token',                 'sms'),
  ('twilio_phone_number',          '',                 'Twilio From Number',                'sms'),
  ('twilio_messaging_service_sid', 'MGd547d8e3273fda2d21afdd6856acb245', 'Twilio Messaging Service SID', 'sms'),
  ('at_enabled',                   'false',            'Africa''s Talking Enabled',         'sms'),
  ('at_api_key',                   '',                 'Africa''s Talking API Key',         'sms'),
  ('at_username',                  '',                 'Africa''s Talking Username',        'sms'),
  ('at_sender_id',                 'EL5PROCURE',       'Africa''s Talking Sender ID',       'sms')
on conflict (key) do nothing;

-- ── Email Settings ────────────────────────────────────────────────────────────
insert into public.system_settings (key, value, label, category) values
  ('email_notifications_enabled',  'true',             'Email Notifications Enabled',       'email'),
  ('smtp_enabled',                 'false',            'SMTP Enabled',                      'email'),
  ('smtp_host',                    'smtp.gmail.com',   'SMTP Host',                         'email'),
  ('smtp_port',                    '587',              'SMTP Port',                         'email'),
  ('smtp_user',                    '',                 'SMTP Username',                     'email'),
  ('smtp_pass',                    '',                 'SMTP Password',                     'email'),
  ('smtp_from_name',               'EL5 MediProcure',  'SMTP From Name',                    'email'),
  ('smtp_from_email',              'noreply@embu.go.ke','SMTP From Email',                  'email'),
  ('smtp_tls',                     'true',             'Use STARTTLS',                      'email'),
  ('resend_api_key',               '',                 'Resend API Key (fallback)',          'email')
on conflict (key) do nothing;

-- ── email_logs table (for delivery audit) ────────────────────────────────────
create table if not exists public.email_logs (
  id            uuid primary key default gen_random_uuid(),
  to_email      text not null,
  from_email    text,
  from_name     text,
  subject       text,
  body          text,
  status        text default 'pending' check (status in ('pending','sent','failed','queued','bounced')),
  sent_via      text,  -- smtp | resend | internal
  module        text,
  error_message text,
  sent_at       timestamptz,
  created_at    timestamptz default now()
);

alter table public.email_logs enable row level security;

create policy "Admins and accountants can view email logs"
  on public.email_logs for select
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
      and role in ('admin','accountant','procurement_manager')
    )
  );

-- sms_enabled column on profiles (for per-user SMS opt-in)
alter table public.profiles add column if not exists sms_enabled boolean default true;
alter table public.profiles add column if not exists email_notifications boolean default true;

-- Add indexes
create index if not exists idx_email_logs_status   on public.email_logs(status, created_at desc);
create index if not exists idx_email_logs_to_email on public.email_logs(to_email);
create index if not exists idx_sms_log_status      on public.sms_log(status, sent_at desc);

-- Enable realtime on logs
alter publication supabase_realtime add table public.email_logs;
