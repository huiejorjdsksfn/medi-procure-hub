-- ================================================================
-- EL5 MediProcure v11.5.0
-- Fix: Add missing columns to payment_vouchers & receipt_vouchers
-- Resolves: "Could not find the 'gl_account' column in schema cache"
-- Applied: 2026-06-18
-- ================================================================

-- ── payment_vouchers: add all columns referenced by the UI ──────

ALTER TABLE public.payment_vouchers
  ADD COLUMN IF NOT EXISTS gl_account        text,
  ADD COLUMN IF NOT EXISTS vote_head         text,
  ADD COLUMN IF NOT EXISTS payee             text,
  ADD COLUMN IF NOT EXISTS payee_account     text,
  ADD COLUMN IF NOT EXISTS bank_name         text,
  ADD COLUMN IF NOT EXISTS total_amount      numeric(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS po_reference      text,
  ADD COLUMN IF NOT EXISTS invoice_reference text,
  ADD COLUMN IF NOT EXISTS due_date          date,
  ADD COLUMN IF NOT EXISTS currency          text DEFAULT 'KES',
  ADD COLUMN IF NOT EXISTS period            text,
  ADD COLUMN IF NOT EXISTS fund_code         text,
  ADD COLUMN IF NOT EXISTS cost_centre       text,
  ADD COLUMN IF NOT EXISTS budget_line       text,
  ADD COLUMN IF NOT EXISTS grn_number        text,
  ADD COLUMN IF NOT EXISTS account_number    text,
  ADD COLUMN IF NOT EXISTS cheque_number     text,
  ADD COLUMN IF NOT EXISTS payment_mode      text,
  ADD COLUMN IF NOT EXISTS subtotal          numeric(15,2),
  ADD COLUMN IF NOT EXISTS tax_amount        numeric(15,2),
  ADD COLUMN IF NOT EXISTS net_amount        numeric(15,2),
  ADD COLUMN IF NOT EXISTS withholding_tax   numeric(15,2),
  ADD COLUMN IF NOT EXISTS line_items        jsonb,
  ADD COLUMN IF NOT EXISTS payee_pin         text,
  ADD COLUMN IF NOT EXISTS payee_type        text,
  ADD COLUMN IF NOT EXISTS voucher_date      date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS reference         text,
  ADD COLUMN IF NOT EXISTS rejection_reason  text,
  ADD COLUMN IF NOT EXISTS expense_account   text,
  ADD COLUMN IF NOT EXISTS budget_id         uuid,
  ADD COLUMN IF NOT EXISTS supplier_id       uuid,
  ADD COLUMN IF NOT EXISTS approved_by_name  text,
  ADD COLUMN IF NOT EXISTS created_by_name   text;

-- back-fill total_amount from amount where total_amount is null
UPDATE public.payment_vouchers
  SET total_amount = amount
  WHERE total_amount IS NULL AND amount IS NOT NULL AND amount <> 0;

-- back-fill payee from payee_name where payee is null
UPDATE public.payment_vouchers
  SET payee = payee_name
  WHERE payee IS NULL AND payee_name IS NOT NULL;

-- ── receipt_vouchers: add all columns referenced by the UI ──────

ALTER TABLE public.receipt_vouchers
  ADD COLUMN IF NOT EXISTS gl_account        text,
  ADD COLUMN IF NOT EXISTS total_amount      numeric(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reference         text,
  ADD COLUMN IF NOT EXISTS bank_name         text,
  ADD COLUMN IF NOT EXISTS received_by       text,
  ADD COLUMN IF NOT EXISTS received_from     text,
  ADD COLUMN IF NOT EXISTS receipt_number    text,
  ADD COLUMN IF NOT EXISTS receipt_date      date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS income_account    text,
  ADD COLUMN IF NOT EXISTS bank_reference    text,
  ADD COLUMN IF NOT EXISTS created_by_name   text,
  ADD COLUMN IF NOT EXISTS approved_by       text,
  ADD COLUMN IF NOT EXISTS approved_at       timestamptz,
  ADD COLUMN IF NOT EXISTS department_id     uuid,
  ADD COLUMN IF NOT EXISTS period            text,
  ADD COLUMN IF NOT EXISTS fund_code         text,
  ADD COLUMN IF NOT EXISTS notes             text;

-- back-fill total_amount from amount
UPDATE public.receipt_vouchers
  SET total_amount = amount
  WHERE total_amount IS NULL AND amount IS NOT NULL AND amount <> 0;

-- back-fill receipt_number from voucher_number
UPDATE public.receipt_vouchers
  SET receipt_number = voucher_number
  WHERE receipt_number IS NULL AND voucher_number IS NOT NULL;

-- back-fill reference from reference_number
UPDATE public.receipt_vouchers
  SET reference = reference_number
  WHERE reference IS NULL AND reference_number IS NOT NULL;

-- ── journal_vouchers: ensure gl_account column exists ──────────
ALTER TABLE public.journal_vouchers
  ADD COLUMN IF NOT EXISTS gl_account        text,
  ADD COLUMN IF NOT EXISTS vote_head         text,
  ADD COLUMN IF NOT EXISTS period            text,
  ADD COLUMN IF NOT EXISTS cost_centre       text,
  ADD COLUMN IF NOT EXISTS budget_line       text,
  ADD COLUMN IF NOT EXISTS fund_code         text;

-- ── Notify PostgREST to reload schema cache immediately ────────
-- This prevents the "column not found in schema cache" error.
NOTIFY pgrst, 'reload schema';
