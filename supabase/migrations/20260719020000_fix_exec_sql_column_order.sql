-- EL5 MediProcure — fix SQL Editor result column ordering
--
-- exec_sql() built its result with `jsonb_agg(row_to_json(t))`. row_to_json()
-- correctly preserves the SELECT's column order as text, but jsonb_agg()
-- casts each row to jsonb — and Postgres's jsonb type does NOT preserve
-- object key order, it re-sorts keys (primarily by length, then
-- alphabetically) for its binary storage format. That's why the SQL Editor
-- was showing "columns, policies, table_name" instead of the query's actual
-- "table_name, columns, policies" order.
--
-- Fix: use json_agg (not jsonb_agg) and return `json` instead of `jsonb`
-- throughout. The `json` type stores the value as text and never reorders
-- keys, and PostgREST serializes it to the HTTP response the same way
-- either way, so this is a transparent fix for the frontend.

drop function if exists public.exec_sql(text);

create function public.exec_sql(query text)
returns json
language plpgsql
security definer
as $function$
DECLARE
  result JSON;
  clean_query TEXT;
  query_upper TEXT;
  plan_text TEXT;
BEGIN
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
    -- json_agg + row_to_json preserves the SELECT's column order end-to-end.
    EXECUTE 'SELECT json_agg(row_to_json(t)) FROM (' || clean_query || ') t' INTO result;
    RETURN COALESCE(result, '[]'::JSON);
  END IF;
END;
$function$;

grant execute on function public.exec_sql(text) to authenticated;
