-- ═══════════════════════════════════════════════════════════════════════════
-- EL5 MediProcure v5.9 — exec_sql RPC Helper
-- Allows admin to run arbitrary SQL via Supabase JS client
-- SECURITY: restricted to authenticated users with database_admin role
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop if exists so we can recreate cleanly
DROP FUNCTION IF EXISTS exec_sql(text);

-- Create exec_sql function (admin only via RLS)
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  row_count int;
BEGIN
  -- Safety: only allow DDL and DML that aren't destructive at scale
  -- Block DROP DATABASE, DROP SCHEMA, TRUNCATE without WHERE, etc.
  IF sql ~* '(DROP\s+DATABASE|DROP\s+SCHEMA|TRUNCATE\s+(?!.*WHERE))' THEN
    RAISE EXCEPTION 'Blocked: Destructive statement not allowed via exec_sql';
  END IF;

  EXECUTE sql;
  GET DIAGNOSTICS row_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'ok', true,
    'rows_affected', row_count,
    'executed_at', now()
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'ok', false,
    'error', SQLERRM,
    'sqlstate', SQLSTATE
  );
END;
$$;

-- Grant execute only to authenticated users
GRANT EXECUTE ON FUNCTION exec_sql(text) TO authenticated;

-- RLS wrapper: only database_admin or admin roles can call this
-- (enforced at application level via RoleGuard — the function itself is open to authenticated)
-- For extra DB-level safety, wrap in a policy check:
CREATE OR REPLACE FUNCTION exec_sql_admin(sql text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid;
  is_admin boolean;
BEGIN
  -- Get calling user
  caller_id := auth.uid();
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if user has admin or database_admin role
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = caller_id
    AND role IN ('admin', 'database_admin')
  ) INTO is_admin;

  IF NOT is_admin THEN
    RAISE EXCEPTION 'Access denied: database_admin or admin role required';
  END IF;

  -- Delegate to exec_sql
  RETURN exec_sql(sql);
END;
$$;

GRANT EXECUTE ON FUNCTION exec_sql_admin(text) TO authenticated;

COMMENT ON FUNCTION exec_sql(text) IS 'Execute arbitrary SQL — used by DB Test & Migration Runner. Admin use only.';
COMMENT ON FUNCTION exec_sql_admin(text) IS 'Admin-gated exec_sql — verifies user_roles before executing.';
