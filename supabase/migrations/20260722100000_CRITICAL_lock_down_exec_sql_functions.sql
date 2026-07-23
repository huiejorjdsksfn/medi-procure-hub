-- ============================================================
--  CRITICAL SECURITY FIX — exec_sql / exec_sql_admin / query_sql_admin
--  Applied live 2026-07-22 during a security review against an OWASP
--  API-security-style checklist (Access Control / Sensitive Data /
--  Configuration / API Inventory categories).
-- ============================================================
--
-- FINDING 1 (critical): exec_sql(query text) — used by the Database
-- Administration SQL Editor, ODBC bridge, and PushToApprovalButton's
-- self-heal path — is SECURITY DEFINER and was granted EXECUTE to
-- PUBLIC and anon. Despite being read-only (blocks INSERT/UPDATE/
-- DELETE/DDL by regex), any unauthenticated internet visitor could
-- call it via a single unauthed POST to /rest/v1/rpc/exec_sql using
-- only the public anon key, and read every table in the database —
-- completely bypassing RLS, since SECURITY DEFINER functions run with
-- the definer's privileges, not the caller's.
--
-- FINDING 2 (catastrophic): exec_sql_admin(sql text) had ZERO
-- restrictions at all — no read-only gate, no auth check — and was
-- also granted to PUBLIC/anon. Any unauthenticated visitor could have
-- run arbitrary SQL: DROP TABLE, escalate any account to superadmin,
-- exfiltrate or destroy every row in the database. Confirmed unused by
-- any current client code (dead but exposed). query_sql_admin(sql text)
-- had the equivalent exposure for read access.
--
-- FIX: revoke PUBLIC/anon EXECUTE on all three, re-grant to
-- authenticated only, and add an in-function role check
-- (admin/superadmin/webmaster/database_admin via user_roles) as
-- defense-in-depth so a signed-in but low-privilege user can't call
-- them either. This matches the RoleGuard already enforced on the
-- /admin/database route at the application layer — the database layer
-- now enforces the same rule independently, so it can't be bypassed by
-- calling the API directly.
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.exec_sql(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.exec_sql(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.exec_sql(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.exec_sql(query text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  result JSON;
  clean_query TEXT;
  query_upper TEXT;
  plan_text TEXT;
  caller_is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin','superadmin','webmaster','database_admin')
  ) INTO caller_is_admin;

  IF auth.uid() IS NULL OR NOT caller_is_admin THEN
    RAISE EXCEPTION 'exec_sql: forbidden — admin/superadmin/webmaster/database_admin role required';
  END IF;

  clean_query := regexp_replace(query, '^\s+|\s+$', '', 'g');

  LOOP
    IF clean_query ~ '^--[^\n]*(\n|$)' THEN
      clean_query := regexp_replace(regexp_replace(clean_query, '^--[^\n]*(\n|$)', ''), '^\s+', '');
    ELSE
      EXIT;
    END IF;
  END LOOP;

  clean_query := regexp_replace(clean_query, '[;\s]+$', '');
  query_upper := UPPER(clean_query);

  IF NOT (
    query_upper LIKE 'SELECT%' OR
    query_upper LIKE 'EXPLAIN%' OR
    query_upper LIKE 'WITH%' OR
    query_upper LIKE 'SHOW%' OR
    query_upper LIKE 'TABLE%'
  ) THEN
    RAISE EXCEPTION 'Only SELECT, EXPLAIN, WITH, SHOW queries are allowed for security';
  END IF;

  IF query_upper LIKE 'EXPLAIN%' THEN
    IF query_upper LIKE 'EXPLAIN (%' OR query_upper LIKE 'EXPLAIN(%' THEN
      EXECUTE clean_query INTO plan_text;
    ELSE
      EXECUTE 'EXPLAIN (FORMAT JSON) ' || substring(clean_query FROM 8) INTO plan_text;
    END IF;
    RETURN plan_text::json;

  ELSIF query_upper LIKE 'SHOW%' THEN
    EXECUTE clean_query INTO plan_text;
    RETURN json_build_array(json_build_object('setting', trim(substring(clean_query FROM 5)), 'value', plan_text));

  ELSE
    EXECUTE 'SELECT json_agg(row_to_json(t)) FROM (' || clean_query || ') t' INTO result;
    RETURN COALESCE(result, '[]'::JSON);
  END IF;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.exec_sql_admin(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.exec_sql_admin(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.exec_sql_admin(text) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.query_sql_admin(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.query_sql_admin(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.query_sql_admin(text) FROM authenticated;

CREATE OR REPLACE FUNCTION public.exec_sql_admin(sql text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  caller_is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin','superadmin','webmaster','database_admin')
  ) INTO caller_is_admin;

  IF auth.uid() IS NULL OR NOT caller_is_admin THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden: admin/superadmin/webmaster/database_admin role required');
  END IF;

  EXECUTE sql;
  RETURN '{"ok":true}'::jsonb;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.query_sql_admin(sql text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  result jsonb;
  caller_is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin','superadmin','webmaster','database_admin')
  ) INTO caller_is_admin;

  IF auth.uid() IS NULL OR NOT caller_is_admin THEN
    RETURN jsonb_build_object('error', 'forbidden: admin/superadmin/webmaster/database_admin role required');
  END IF;

  EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' || sql || ') t' INTO result;
  RETURN COALESCE(result, '[]'::jsonb);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.exec_sql_admin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.query_sql_admin(text) TO authenticated;
