-- Anti-replay guard backing table for edge functions (send-sms, send-email,
-- make-call, ai-agent, google-forms-api). Client sends x-el5-nonce/x-el5-ts
-- headers on mutating calls; edge functions insert the nonce here and treat
-- a unique-constraint violation as a replayed request.
create table if not exists public.security_nonces (
  nonce text primary key,
  created_at timestamptz not null default now()
);

create index if not exists idx_security_nonces_created_at on public.security_nonces (created_at);

alter table public.security_nonces enable row level security;

-- Edge functions use the service role key, which bypasses RLS, so no
-- client-facing policies are needed here. This table is not exposed to
-- the anon/authenticated roles.
