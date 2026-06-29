-- 1. journal_vouchers is missing the flat debit/credit columns the Financial
--    Dashboard's single-entry Journal editor actually saves (gl_debit_account,
--    gl_credit_account, debit_amount, credit_amount). The table's jsonb
--    `entries` column supports a different (currently unused) multi-line
--    design; these flat columns are purely additive and don't conflict with it.
ALTER TABLE public.journal_vouchers
  ADD COLUMN IF NOT EXISTS gl_debit_account  text,
  ADD COLUMN IF NOT EXISTS gl_credit_account text,
  ADD COLUMN IF NOT EXISTS debit_amount      numeric,
  ADD COLUMN IF NOT EXISTS credit_amount     numeric;

-- 2. Safeguard: let the frontend force a PostgREST schema-cache reload after
--    catching a "Could not find the 'X' column ... in the schema cache" save
--    failure (PGRST204). This is the exact error class from the screenshots —
--    in several cases the column already existed in Postgres but PostgREST's
--    cached introspection hadn't picked it up yet. Exposing this lets the API
--    layer self-heal with one retry instead of leaving the user stuck.
CREATE OR REPLACE FUNCTION public.reload_schema_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NOTIFY pgrst, 'reload schema';
END;
$$;

GRANT EXECUTE ON FUNCTION public.reload_schema_cache() TO authenticated, anon;

NOTIFY pgrst, 'reload schema';
