-- EL5 MediProcure — Harden RLS policies for background-job / cron-touched tables
--
-- Fixes found during a security review of tables written by background
-- processors (pg_cron jobs, keepalive-bot, notify-api, send-sms):
--
-- 1. system_circuit_breaker / system_failover_log: the admin-read policies
--    added in the failover migration checked `profiles.role`, but this
--    schema's canonical admin check is `is_admin()`, which reads from
--    `user_roles` — a different table. No real admin account could have
--    read these tables. Fixed to use is_admin().
--
-- 2. db_heartbeat: "Authenticated reads heartbeat" let ANY logged-in user
--    (down to a requisitioner) read internal DB version, active connection
--    counts, and per-table row counts. Restricted to admins.
--
-- 3. notifications: a leftover blanket policy ("notifications_auth", ALL,
--    qual = true) let any authenticated user read/update/delete every
--    other user's notifications, and "notifications_insert_v2" allowed
--    inserting into any user's notification feed with no check at all.
--    Both are permissive policies OR'd with the properly scoped ones, so
--    they silently overrode the scoping. Dropped, replaced with a single
--    scoped insert policy; the existing scoped SELECT/ALL policies remain.
--
-- 4. reception_messages: the only policy on the table ("reception_messages_all",
--    ALL, qual = true) exposed the full SMS/WhatsApp reception inbox —
--    including patient/vendor conversation content — to every authenticated
--    user regardless of role. Restricted to the same role set already used
--    for the closely related sms_conversations table.

-- (1) Fix admin-read checks on the failover tables to use the canonical
-- is_admin() function instead of the wrong (profiles.role) table.
drop policy if exists "admins_read_circuit_breaker" on public.system_circuit_breaker;
create policy "admins_read_circuit_breaker"
  on public.system_circuit_breaker for select
  using (is_admin());

drop policy if exists "admins_read_failover_log" on public.system_failover_log;
create policy "admins_read_failover_log"
  on public.system_failover_log for select
  using (is_admin());

-- (2) db_heartbeat — restrict from all-authenticated to admins only.
drop policy if exists "Authenticated reads heartbeat" on public.db_heartbeat;
create policy "admins_read_heartbeat"
  on public.db_heartbeat for select
  using (is_admin());

-- (3) notifications — remove the blanket ALL/true and unchecked-insert
-- policies; keep the already-scoped policies (notif_all, notif_read_policy,
-- notifications_select_v2) and add one scoped insert policy.
drop policy if exists "notifications_auth" on public.notifications;
drop policy if exists "notifications_insert_v2" on public.notifications;

create policy "notifications_insert_scoped"
  on public.notifications for insert
  with check (
    user_id = auth.uid()
    or recipient_id = auth.uid()
    or sender_id = auth.uid()
    or is_admin()
  );

-- (4) reception_messages — restrict to reception/procurement/admin roles,
-- matching the access model already used for sms_conversations.
drop policy if exists "reception_messages_all" on public.reception_messages;
create policy "reception_messages_privileged"
  on public.reception_messages for all
  using (has_any_role(array['admin','superadmin','webmaster','procurement_manager']))
  with check (has_any_role(array['admin','superadmin','webmaster','procurement_manager']));
