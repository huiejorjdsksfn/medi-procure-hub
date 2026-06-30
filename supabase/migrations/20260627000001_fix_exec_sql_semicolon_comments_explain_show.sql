-- ═══════════════════════════════════════════════════════════════════════════
-- EL5 MediProcure — exec_sql fix: leading comments, trailing semicolons,
-- and working EXPLAIN/SHOW support
--
-- The previous migration (20260409000002_exec_sql_rpc.sql) is STALE — it does
-- not match what has actually been live in the database for some time. The
-- live function had already diverged to:
--   - a parameter named `query` (not `sql`)
--   - a `SELECT jsonb_agg(row_to_json(t)) FROM (<query>) t` wrapping strategy
--     with no destructive-statement blocklist; security was instead enforced
--     via an allowlist of SELECT/EXPLAIN/WITH/SHOW/TABLE prefixes (stricter
--     than a blocklist, kept here)
--
-- This migration fixes two live bugs in that allowlist-wrapping approach:
--
-- 1. "syntax error at or near ';'" — any query ending in a semicolon (the
--    SQL Editor's own default query does) broke once wrapped in
--    `FROM (<query>;) t`, since a semicolon can't appear inside a
--    parenthesized subquery expression.
--
-- 2. "Only SELECT, EXPLAIN, WITH, SHOW queries are allowed" on a query that
--    legitimately *is* one of those — the SQL Editor's default query starts
--    with three `-- ...` header comment lines, so the validation check
--    (`LIKE 'SELECT%'`) saw a string starting with "--" and rejected it
--    before ever looking past the comments.
--
-- It also actually implements EXPLAIN and SHOW support, which the allowlist
-- check claimed to allow but which were never functional: both are utility
-- statements, not row-returning expressions, so wrapping them in
-- `FROM (...) t` like SELECT/WITH/TABLE is itself a syntax error. EXPLAIN now
-- uses FORMAT JSON; SHOW captures its single-row/column result directly.
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop first: Postgres rejects CREATE OR REPLACE if the parameter name differs
-- from the existing function signature (param was 'sql' in an older migration,
-- renamed to 'query' here).
DROP FUNCTION IF EXISTS public.exec_sql(text);

CREATE OR REPLACE FUNCTION public.exec_sql(query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  result JSONB;
  clean_query TEXT;
  query_upper TEXT;
  plan_text TEXT;
BEGIN
  -- Plain TRIM() only strips literal space characters in Postgres, not
  -- newlines/tabs, so use a whitespace-aware regex trim throughout.
  clean_query := regexp_replace(query, '^\s+|\s+$', '', 'g');

  -- Strip leading line comments ("-- ...") and any blank lines left behind.
  LOOP
    IF clean_query ~ '^--[^\n]*(\n|$)' THEN
      clean_query := regexp_replace(regexp_replace(clean_query, '^--[^\n]*(\n|$)', ''), '^\s+', '');
    ELSE
      EXIT;
    END IF;
  END LOOP;

  -- Strip a trailing semicolon (and any trailing whitespace).
  clean_query := regexp_replace(clean_query, '[;\s]+$', '');
  query_upper := UPPER(clean_query);

  -- Only allow SELECT, EXPLAIN, WITH (CTEs), SHOW, TABLE
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
    -- EXPLAIN is a utility statement, not a row-returning expression, so it
    -- can't be wrapped in `FROM (...) t` like the others. FORMAT JSON gives
    -- us a single jsonb value directly.
    IF query_upper LIKE 'EXPLAIN (%' OR query_upper LIKE 'EXPLAIN(%' THEN
      EXECUTE clean_query INTO plan_text;
    ELSE
      EXECUTE 'EXPLAIN (FORMAT JSON) ' || substring(clean_query FROM 8) INTO plan_text;
    END IF;
    RETURN plan_text::jsonb;

  ELSIF query_upper LIKE 'SHOW%' THEN
    -- SHOW is also a utility statement returning a single row/column.
    EXECUTE clean_query INTO plan_text;
    RETURN jsonb_build_array(jsonb_build_object('setting', trim(substring(clean_query FROM 5)), 'value', plan_text));

  ELSE
    -- SELECT / WITH / TABLE — genuine row-returning expressions.
    EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' || clean_query || ') t' INTO result;
    RETURN COALESCE(result, '[]'::JSONB);
  END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO authenticated;

COMMENT ON FUNCTION public.exec_sql(text) IS 'Execute SELECT/EXPLAIN/WITH/SHOW/TABLE queries for the SQL Editor. Strips leading comments and trailing semicolons (using whitespace-aware regex, not bare TRIM) before validating/wrapping; EXPLAIN/SHOW handled as utility statements rather than wrapped subqueries.';
