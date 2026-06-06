-- ============================================================
-- EL5 MediProcure — Migration: Fix missing tables & columns
-- Date: 2026-06-06
-- Fixes:
--   1. Create "vouchers" (store vouchers) table if missing
--   2. Add supplier_name to quotations if missing
--   3. Add contract_type to contracts if missing
--   4. Ensure documents.file_type column exists
--   5. Fix notifications RLS to allow cross-user inserts
--   6. Create user_session_tokens table for token/role caching
-- ============================================================

-- ─── 1. STORE VOUCHERS TABLE ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vouchers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_number    text NOT NULL DEFAULT ('SV-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 5)),
  requested_by      text,
  department_id     uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  department_name   text,
  purpose           text,
  date              date DEFAULT CURRENT_DATE,
  items             jsonb DEFAULT '[]'::jsonb,
  total_value       numeric(12,2) DEFAULT 0,
  status            text DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','issued','cancelled')),
  created_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by_name  text,
  approved_at       timestamptz,
  issued_by         text,
  issued_at         timestamptz,
  facility_id       uuid,
  notes             text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- Unique voucher number index
CREATE UNIQUE INDEX IF NOT EXISTS idx_vouchers_number ON public.vouchers(voucher_number);
CREATE INDEX IF NOT EXISTS idx_vouchers_status ON public.vouchers(status);
CREATE INDEX IF NOT EXISTS idx_vouchers_created_by ON public.vouchers(created_by);
CREATE INDEX IF NOT EXISTS idx_vouchers_department ON public.vouchers(department_id);

-- RLS for vouchers
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vouchers_select" ON public.vouchers;
DROP POLICY IF EXISTS "vouchers_insert" ON public.vouchers;
DROP POLICY IF EXISTS "vouchers_update" ON public.vouchers;
DROP POLICY IF EXISTS "vouchers_delete" ON public.vouchers;

CREATE POLICY "vouchers_select" ON public.vouchers
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "vouchers_insert" ON public.vouchers
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "vouchers_update" ON public.vouchers
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "vouchers_delete" ON public.vouchers
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin','superadmin','webmaster')
    )
  );

-- ─── 2. QUOTATIONS: add supplier_name if missing ────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='quotations' AND column_name='supplier_name' AND table_schema='public'
  ) THEN
    ALTER TABLE public.quotations ADD COLUMN supplier_name text;
  END IF;
END $$;

-- ─── 3. CONTRACTS: add contract_type if missing ─────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='contracts' AND column_name='contract_type' AND table_schema='public'
  ) THEN
    ALTER TABLE public.contracts ADD COLUMN contract_type text DEFAULT 'Supply';
  END IF;
END $$;

-- ─── 4. DOCUMENTS: ensure file_type column ──────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='documents' AND column_name='file_type' AND table_schema='public'
  ) THEN
    ALTER TABLE public.documents ADD COLUMN file_type text;
  END IF;
END $$;

-- ─── 5. NOTIFICATIONS: fix RLS for cross-user inserts ───────
-- Allow authenticated users to insert notifications for others
-- (needed for notifyProcurement, notifyAdmins, WorkflowEngine)
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_auth" ON public.notifications;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.notifications;
DROP POLICY IF EXISTS "auth_insert" ON public.notifications;

-- Permissive insert: any authenticated user can send a notification
CREATE POLICY "notifications_insert_v2" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Select: users can only see their own notifications or broadcasts
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_select_v2" ON public.notifications;
CREATE POLICY "notifications_select_v2" ON public.notifications
  FOR SELECT USING (
    recipient_id = auth.uid()
    OR recipient_id IS NULL
    OR sender_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin','superadmin','webmaster')
    )
  );

-- ─── 6. USER SESSION TOKENS TABLE ───────────────────────────
-- Stores JWT-like session tokens with embedded role claims
-- Used by the session-token edge function and client SessionTokenLib
CREATE TABLE IF NOT EXISTS public.user_session_tokens (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token         text NOT NULL UNIQUE,
  roles         text[] NOT NULL DEFAULT '{}',
  profile       jsonb DEFAULT '{}'::jsonb,
  issued_at     timestamptz DEFAULT now(),
  expires_at    timestamptz DEFAULT (now() + interval '24 hours'),
  last_used_at  timestamptz DEFAULT now(),
  user_agent    text,
  ip_address    text,
  is_revoked    boolean DEFAULT false
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_session_tokens_token ON public.user_session_tokens(token);
CREATE INDEX IF NOT EXISTS idx_session_tokens_user ON public.user_session_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_session_tokens_expires ON public.user_session_tokens(expires_at);

ALTER TABLE public.user_session_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tokens_own" ON public.user_session_tokens;
DROP POLICY IF EXISTS "tokens_select" ON public.user_session_tokens;
DROP POLICY IF EXISTS "tokens_insert" ON public.user_session_tokens;
DROP POLICY IF EXISTS "tokens_update" ON public.user_session_tokens;
DROP POLICY IF EXISTS "tokens_delete" ON public.user_session_tokens;

CREATE POLICY "tokens_select" ON public.user_session_tokens
  FOR SELECT USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role IN ('admin','superadmin','webmaster')
  ));

CREATE POLICY "tokens_insert" ON public.user_session_tokens
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "tokens_update" ON public.user_session_tokens
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "tokens_delete" ON public.user_session_tokens
  FOR DELETE USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role IN ('admin','superadmin','webmaster')
  ));

-- Cleanup function: purge expired tokens (run via pg_cron or on-demand)
CREATE OR REPLACE FUNCTION public.purge_expired_tokens()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.user_session_tokens
  WHERE expires_at < now() OR is_revoked = true;
END;
$$;

-- ─── Trigger: auto-update updated_at on vouchers ────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vouchers_updated_at ON public.vouchers;
CREATE TRIGGER trg_vouchers_updated_at
  BEFORE UPDATE ON public.vouchers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
