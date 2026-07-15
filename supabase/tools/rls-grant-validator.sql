-- ═══════════════════════════════════════════════════════════════════════
-- RLS-GRANT VALIDATOR
-- Run this from Admin → Database → SQL Editor (or `supabase db execute`)
-- periodically, and after any migration that touches policies, to catch
-- the two classes of RLS bug this codebase has actually hit:
--
--   1. A table has RLS enabled but zero policies attached, so it's fully
--      locked out even for admins (unless accessed via service_role,
--      which bypasses RLS entirely — fine for bot/infra tables, a bug
--      for anything a human is meant to use through the app).
--   2. A policy's NAME implies a restriction ("Admins manage X") but its
--      actual USING/WITH CHECK clause is `true` for public/anon roles —
--      i.e. the grant doesn't match the intent. Found and fixed live on
--      ip_access_rules and user_sessions (2026-07-14); form_responses'
--      INSERT policy had the same shape (accepted submissions against
--      ANY form_id, not just published ones).
--
-- Neither check is a false-positive-free linter — some `true` grants are
-- intentional (append-only logs like crash_reports, ip_access_log,
-- not_found_log, ai_agent_events). Review each result rather than
-- blindly tightening it.
-- ═══════════════════════════════════════════════════════════════════════

-- 1) RLS enabled, zero policies → fully locked out for anon/authenticated.
--    Expected to be empty or bot/infra-only tables (keepalive_*, etc.)
--    that are intentionally service-role-only.
select tablename, 'RLS enabled with 0 policies — locked out unless service_role' as finding
from pg_tables t
where schemaname = 'public'
  and rowsecurity = true
  and not exists (select 1 from pg_policies p where p.schemaname='public' and p.tablename=t.tablename)
order by tablename;

-- 2) RLS disabled entirely → wide open to anyone with the anon key.
select tablename, 'RLS DISABLED — table is fully public' as finding
from pg_tables
where schemaname = 'public' and rowsecurity = false
order by tablename;

-- 3) Write-capable policies (INSERT/UPDATE/DELETE/ALL) granted to
--    public/anon with an unconditional `true` check. Review each row:
--    is unauthenticated/unrestricted write actually intended here?
select tablename, policyname, cmd, roles, qual, with_check,
       'unconditional write grant to public/anon — verify intent' as finding
from pg_policies
where schemaname = 'public'
  and cmd in ('INSERT','UPDATE','DELETE','ALL')
  and (roles::text ilike '%anon%' or roles::text ilike '%public%')
  and (with_check = 'true' or qual = 'true')
order by tablename;

-- 4) Policy name suggests a role restriction ("admin", "manage",
--    "owner-only") but the clause doesn't reference auth.uid(), a role
--    check, is_admin(), or a profiles/user_roles lookup at all, AND it's
--    granted to public/anon (not just {authenticated}, which Postgres
--    already restricts to logged-in users regardless of the clause) —
--    the classic name-vs-grant mismatch that hit ip_access_rules and
--    user_sessions.
select tablename, policyname, cmd, roles, qual, with_check,
       'policy name implies a restriction but clause has no auth/role check, granted to public/anon' as finding
from pg_policies
where schemaname = 'public'
  and (policyname ilike '%admin%' or policyname ilike '%manage%' or policyname ilike '%owner%')
  and (roles::text ilike '%anon%' or roles::text ilike '%public%')
  and coalesce(qual,'') !~* 'auth\.(uid|role)|profiles|user_roles|is_admin'
  and coalesce(with_check,'') !~* 'auth\.(uid|role)|profiles|user_roles|is_admin'
order by tablename;
