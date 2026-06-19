-- ================================================================
-- EL5 MediProcure v11.7.0
-- Fix: purchase_vouchers & sales_vouchers missing columns
--
-- ROOT CAUSE: Two migrations each declared
--   CREATE TABLE IF NOT EXISTS purchase_vouchers (...)
--   CREATE TABLE IF NOT EXISTS sales_vouchers (...)
-- with DIFFERENT, incompatible column sets:
--   20260306000001_new_modules.sql        (ran first — this schema WON)
--   20260426000001_nuclear_v90_full_fix.sql (silently no-op'd — table existed)
--
-- The frontend forms (PurchaseVouchersPage.tsx, SalesVouchersPage.tsx) were
-- written against a superset of columns that don't all exist on the table
-- that actually won the race, producing:
--   "Could not find the 'expense_account' column of 'purchase_vouchers'..."
--   "Could not find the 'tax_rate' column of 'sales_vouchers'..."
-- Applied: 2026-06-18
-- ================================================================

-- ── purchase_vouchers: add columns used by PurchaseVouchersPage.tsx ────
ALTER TABLE public.purchase_vouchers
  ADD COLUMN IF NOT EXISTS expense_account   text,
  ADD COLUMN IF NOT EXISTS tax_rate          numeric(5,2) DEFAULT 16,
  ADD COLUMN IF NOT EXISTS gl_account        text,
  ADD COLUMN IF NOT EXISTS currency          text DEFAULT 'KES',
  ADD COLUMN IF NOT EXISTS approved_by_name  text,
  ADD COLUMN IF NOT EXISTS rejection_reason  text,
  ADD COLUMN IF NOT EXISTS purchase_order_id uuid;

-- ── sales_vouchers: add columns used by SalesVouchersPage.tsx ──────────
ALTER TABLE public.sales_vouchers
  ADD COLUMN IF NOT EXISTS patient_number    text,
  ADD COLUMN IF NOT EXISTS department_id     uuid,
  ADD COLUMN IF NOT EXISTS tax_rate          numeric(5,2) DEFAULT 16,
  ADD COLUMN IF NOT EXISTS gl_account        text,
  ADD COLUMN IF NOT EXISTS currency          text DEFAULT 'KES',
  ADD COLUMN IF NOT EXISTS customer_contact  text,
  ADD COLUMN IF NOT EXISTS reference_number  text,
  ADD COLUMN IF NOT EXISTS approved_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_by_name  text,
  ADD COLUMN IF NOT EXISTS approved_at       timestamptz;

NOTIFY pgrst, 'reload schema';
