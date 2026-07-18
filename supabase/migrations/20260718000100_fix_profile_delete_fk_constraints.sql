-- Bookkeeping: applied live earlier, reconstructed here for repo parity.
-- Root cause of "Delete failed: ... violates foreign key constraint
-- ip_access_log_user_id_fkey" (and 20+ identical failures on other
-- tables): every audit/log/reference column pointing at profiles(id) had
-- the Postgres default ON DELETE NO ACTION, blocking deletion of any
-- profile that ever appeared in a log, session, quotation, etc. — nearly
-- every real user. Changed to ON DELETE SET NULL so history is preserved
-- (nothing is deleted) while the dangling reference clears, letting the
-- delete succeed. Written idempotently — safe to re-run.

do $$
declare
  fk record;
begin
  for fk in
    select
      'alter table public.'||quote_ident(tc.table_name)||
      ' drop constraint '||quote_ident(tc.constraint_name)||
      ', add constraint '||quote_ident(tc.constraint_name)||
      ' foreign key ('||quote_ident(kcu.column_name)||')'||
      ' references public.profiles(id) on delete set null;' as stmt,
      tc.table_name, tc.constraint_name
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
    join information_schema.constraint_column_usage ccu
      on tc.constraint_name = ccu.constraint_name and tc.table_schema = ccu.table_schema
    join information_schema.referential_constraints rc
      on tc.constraint_name = rc.constraint_name
    where tc.constraint_type = 'FOREIGN KEY'
      and ccu.table_name = 'profiles' and ccu.column_name = 'id'
      and rc.delete_rule = 'NO ACTION'
      and tc.table_schema = 'public'
  loop
    execute fk.stmt;
    raise notice 'Fixed FK: %.%', fk.table_name, fk.constraint_name;
  end loop;
end $$;

notify pgrst, 'reload schema';
