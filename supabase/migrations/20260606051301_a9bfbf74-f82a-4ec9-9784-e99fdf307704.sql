
-- SMS LOG: replace permissive policies with role-scoped ones
drop policy if exists "admins_view_sms" on public.sms_log;
drop policy if exists "system_insert_sms" on public.sms_log;

create policy "sms_log_select_privileged" on public.sms_log
  for select to authenticated
  using (public.has_any_role(array['admin','superadmin','webmaster','procurement_manager']));

create policy "sms_log_modify_privileged" on public.sms_log
  for all to authenticated
  using (public.has_any_role(array['admin','superadmin','webmaster','procurement_manager']))
  with check (public.has_any_role(array['admin','superadmin','webmaster','procurement_manager']));

-- keep service_role unrestricted via existing GRANT ALL; allow edge-function inserts
create policy "sms_log_service_insert" on public.sms_log
  for insert to service_role with check (true);

-- SMS CONVERSATIONS: restrict the previously-open ALL policy
drop policy if exists "Authenticated manage sms_conversations" on public.sms_conversations;

create policy "sms_conv_privileged" on public.sms_conversations
  for all to authenticated
  using (public.has_any_role(array['admin','superadmin','webmaster','procurement_manager']))
  with check (public.has_any_role(array['admin','superadmin','webmaster','procurement_manager']));
