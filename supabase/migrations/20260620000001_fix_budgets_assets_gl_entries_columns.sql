-- ================================================================
-- EL5 MediProcure v11.10.0
-- Fix: budgets, fixed_assets, gl_entries missing columns
--
-- ROOT CAUSE (same pattern as purchase_vouchers/sales_vouchers fix in
-- 20260619000001): multiple migrations each declared
--   CREATE TABLE IF NOT EXISTS budgets (...)
--   CREATE TABLE IF NOT EXISTS fixed_assets (...)    [FOUR competing defs]
--   CREATE TABLE IF NOT EXISTS gl_entries (...)
-- with different column sets. The first migration to run won; later
-- ones silently no-op'd. The frontend forms were written against a
-- superset of columns that never actually existed on the live table.
--
-- Fixes:
--   "Could not find the 'description' column of 'budgets'..."
--   "Could not find the 'annual_depreciation' column of 'fixed_assets'..."
--   "Could not find the 'fiscal_year' column of 'gl_entries'..."
-- Applied: 2026-06-20
-- ================================================================

-- ── budgets: add columns used by BudgetsPage.tsx ────────────────────
ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS fiscal_year    text,
  ADD COLUMN IF NOT EXISTS total_budget   numeric(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS spent          numeric(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remaining      numeric(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS department     text,
  ADD COLUMN IF NOT EXISTS description    text,
  ADD COLUMN IF NOT EXISTS vote_head      text;

-- Back-fill from the columns that DO exist on the winning schema
UPDATE public.budgets SET fiscal_year  = financial_year   WHERE fiscal_year  IS NULL AND financial_year  IS NOT NULL;
UPDATE public.budgets SET total_budget = allocated_amount WHERE total_budget IS NULL AND allocated_amount IS NOT NULL;
UPDATE public.budgets SET spent        = spent_amount     WHERE spent        IS NULL AND spent_amount     IS NOT NULL;
UPDATE public.budgets SET department   = department_name  WHERE department   IS NULL AND department_name  IS NOT NULL;

-- ── fixed_assets: add columns used by FixedAssetsPage.tsx ───────────
ALTER TABLE public.fixed_assets
  ADD COLUMN IF NOT EXISTS asset_name           text,
  ADD COLUMN IF NOT EXISTS purchase_date        date,
  ADD COLUMN IF NOT EXISTS purchase_cost        numeric(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS useful_life          integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS residual_value       numeric(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS annual_depreciation  numeric(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS warranty_expiry      date,
  ADD COLUMN IF NOT EXISTS condition            text DEFAULT 'good',
  ADD COLUMN IF NOT EXISTS supplier_name        text,
  ADD COLUMN IF NOT EXISTS department_name      text,
  ADD COLUMN IF NOT EXISTS created_by           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by_name      text;

-- Back-fill from existing equivalent columns
UPDATE public.fixed_assets SET asset_name     = description       WHERE asset_name     IS NULL AND description IS NOT NULL;
UPDATE public.fixed_assets SET purchase_date  = acquisition_date  WHERE purchase_date  IS NULL AND acquisition_date IS NOT NULL;
UPDATE public.fixed_assets SET purchase_cost  = acquisition_cost  WHERE purchase_cost  IS NULL AND acquisition_cost IS NOT NULL;
UPDATE public.fixed_assets SET useful_life    = useful_life_years WHERE useful_life    IS NULL AND useful_life_years IS NOT NULL;
UPDATE public.fixed_assets SET residual_value = salvage_value     WHERE residual_value IS NULL AND salvage_value IS NOT NULL;

-- ── gl_entries: add columns used by JournalVouchersPage.tsx ─────────
ALTER TABLE public.gl_entries
  ADD COLUMN IF NOT EXISTS narration       text,
  ADD COLUMN IF NOT EXISTS fiscal_year     text,
  ADD COLUMN IF NOT EXISTS period          text,
  ADD COLUMN IF NOT EXISTS posted_by_name  text;

NOTIFY pgrst, 'reload schema';
