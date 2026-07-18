-- Real Postgres query plan viewer, the direct equivalent of SQL Server's
-- graphical execution plan (SSMS's Query Store "Top Resource Consumers"
-- report). Uses EXPLAIN (not EXPLAIN ANALYZE) so inspecting a plan never
-- actually re-executes the query — safe, read-only cost estimation only.
-- SELECT-only, admin-only, 5s statement timeout.
create or replace function public.explain_query_plan(p_query text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
set statement_timeout to '5s'
as $function$
declare
  plan_json jsonb;
  trimmed text;
begin
  if not exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ) and not exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role in ('admin','superadmin','database_admin','webmaster')
  ) then
    raise exception 'Admin role required';
  end if;

  trimmed := upper(trim(p_query));
  if left(trimmed, 6) <> 'SELECT' then
    raise exception 'Only SELECT statements can be explained through this function';
  end if;

  execute format('EXPLAIN (FORMAT JSON, COSTS TRUE) %s', p_query) into plan_json;
  return plan_json;
exception when others then
  return jsonb_build_object('error', SQLERRM);
end;
$function$;

grant execute on function public.explain_query_plan(text) to authenticated;

notify pgrst, 'reload schema';
