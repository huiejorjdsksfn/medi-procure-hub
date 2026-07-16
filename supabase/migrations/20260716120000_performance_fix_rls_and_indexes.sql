-- EL5 MediProcure — Performance fix (2026-07-16)
-- Supabase performance advisor found 733 issues. This migration fixes the
-- three categories that directly slow down page loads:
--
-- 1. auth_rls_initplan (110 warnings / ~28 policies): RLS policies calling
--    auth.uid()/auth.role()/auth.jwt() directly force Postgres to re-run
--    that function for EVERY ROW scanned instead of once per query. Fixed
--    by wrapping calls in `(select auth.uid())`, which lets Postgres cache
--    the result — the single highest-impact fix here for slow list pages.
-- 2. duplicate_index (31): several tables have 2-3 literally identical
--    indexes (leftover from repeated migration patches), which slows down
--    every INSERT/UPDATE for no read benefit. Dropped the redundant ones.
-- 3. unindexed_foreign_keys (5): FK columns with no covering index, which
--    slows down joins and cascade checks.
--
-- (unused_index, 278 warnings, was left alone — those cost storage/write
-- overhead but don't slow down page loads, and several are for features
-- not yet exercised in production traffic; dropping them isn't worth the
-- risk of a page that suddenly needs one turning slow.)

-- ── 1. Fix auth_rls_initplan: wrap auth.uid()/role()/jwt() in a subquery ──
DO $$
DECLARE
  r RECORD;
  new_qual text;
  new_check text;
  sql text;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (qual ~ 'auth\.(uid|role|jwt)\(\)' OR with_check ~ 'auth\.(uid|role|jwt)\(\)')
  LOOP
    new_qual := r.qual;
    new_check := r.with_check;

    IF new_qual IS NOT NULL THEN
      new_qual := regexp_replace(new_qual, 'auth\.uid\(\)', '(select auth.uid())', 'g');
      new_qual := regexp_replace(new_qual, 'auth\.role\(\)', '(select auth.role())', 'g');
      new_qual := regexp_replace(new_qual, 'auth\.jwt\(\)', '(select auth.jwt())', 'g');
    END IF;

    IF new_check IS NOT NULL THEN
      new_check := regexp_replace(new_check, 'auth\.uid\(\)', '(select auth.uid())', 'g');
      new_check := regexp_replace(new_check, 'auth\.role\(\)', '(select auth.role())', 'g');
      new_check := regexp_replace(new_check, 'auth\.jwt\(\)', '(select auth.jwt())', 'g');
    END IF;

    sql := format('ALTER POLICY %I ON public.%I', r.policyname, r.tablename);
    IF new_qual IS NOT NULL THEN
      sql := sql || format(' USING (%s)', new_qual);
    END IF;
    IF new_check IS NOT NULL THEN
      sql := sql || format(' WITH CHECK (%s)', new_check);
    END IF;

    BEGIN
      EXECUTE sql;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipped policy % on %: %', r.policyname, r.tablename, SQLERRM;
    END;
  END LOOP;
END $$;

-- ── 2. Drop duplicate indexes (verified none back a PK/UNIQUE constraint) ──
DROP INDEX IF EXISTS public.idx_audit_log_user;
DROP INDEX IF EXISTS public.idx_milestones;
DROP INDEX IF EXISTS public.idx_deployment_import_jobs_deployment;
DROP INDEX IF EXISTS public.idx_doc_signees_doc;
DROP INDEX IF EXISTS public.document_signees_document_id_idx;
DROP INDEX IF EXISTS public.idx_doc_signees_user;
DROP INDEX IF EXISTS public.idx_grn_po_id;
DROP INDEX IF EXISTS public.idx_gri_grn;
DROP INDEX IF EXISTS public.idx_gri_grn_id;
DROP INDEX IF EXISTS public.idx_notif_status;
DROP INDEX IF EXISTS public.idx_pv_facility_id;
DROP INDEX IF EXISTS public.idx_pv_supplier_id;
DROP INDEX IF EXISTS public.idx_plan_items_plan;
DROP INDEX IF EXISTS public.idx_po_items_po_id;
DROP INDEX IF EXISTS public.idx_po_facility_id;
DROP INDEX IF EXISTS public.idx_po_requisition_id;
DROP INDEX IF EXISTS public.idx_po_supplier;
DROP INDEX IF EXISTS public.idx_po_supplier_id;
DROP INDEX IF EXISTS public.idx_quotations_supplier;
DROP INDEX IF EXISTS public.idx_req_facility_id;
DROP INDEX IF EXISTS public.idx_req_status;
DROP INDEX IF EXISTS public.idx_ral_by;
DROP INDEX IF EXISTS public.idx_ral_target;
DROP INDEX IF EXISTS public.idx_sm_item;
DROP INDEX IF EXISTS public.idx_sup_facility_id;
DROP INDEX IF EXISTS public.idx_system_metrics_name;
DROP INDEX IF EXISTS public.idx_ual2_user;
DROP INDEX IF EXISTS public.idx_ual_created;
DROP INDEX IF EXISTS public.idx_ual_user_id;
DROP INDEX IF EXISTS public.idx_session_tokens_user;
DROP INDEX IF EXISTS public.idx_ust_user_id;
DROP INDEX IF EXISTS public.idx_ust_token;
DROP INDEX IF EXISTS public.idx_user_sessions_user;
DROP INDEX IF EXISTS public.idx_user_signatures_user;
DROP INDEX IF EXISTS public.idx_vouchers_department;

-- ── 3. Add missing foreign-key indexes ──
CREATE INDEX IF NOT EXISTS idx_bank_statements_bank_account_id ON public.bank_statements (bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_statements_imported_by ON public.bank_statements (imported_by);
CREATE INDEX IF NOT EXISTS idx_odbc_access_log_requested_by ON public.odbc_access_log (requested_by);
CREATE INDEX IF NOT EXISTS idx_sms_messages_sent_by ON public.sms_messages (sent_by);
CREATE INDEX IF NOT EXISTS idx_themes_created_by ON public.themes (created_by);

-- ── 4. Same initplan fix for the two realtime broadcast policies (used by
--      every page's live-update subscriptions) — separate schema, so the
--      DO block above (scoped to public) doesn't reach them.
ALTER POLICY users_receive_own_notification_broadcasts ON realtime.messages
  USING ((extension = 'broadcast'::text) AND ((split_part(realtime.topic(), ':'::text, 2))::uuid = (select auth.uid())));

ALTER POLICY users_send_own_notification_broadcasts ON realtime.messages
  WITH CHECK ((extension = 'broadcast'::text) AND ((split_part(realtime.topic(), ':'::text, 2))::uuid = (select auth.uid())));

-- ── 5. Drop exact-duplicate permissive policies (multiple_permissive_policies) ──
-- Years of "nuclear fix" migrations left several tables with 2-4 policies
-- that are byte-for-byte identical (same table/cmd/role/condition) — e.g.
-- fixed_assets had 4 separate "authenticated can do anything" policies.
-- Postgres evaluates every permissive policy on every query and ORs the
-- results, so exact duplicates are pure wasted work. Only removes policies
-- whose condition text is IDENTICAL to another policy on the same
-- table/cmd/role — never touches policies with different conditions
-- (e.g. "own row" vs "admin role" policies stay, since merging those
-- requires case-by-case review to avoid narrowing access).
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename, cmd, roles, qual, with_check, array_agg(policyname ORDER BY policyname) as names
    FROM pg_policies
    WHERE schemaname='public' AND permissive='PERMISSIVE'
    GROUP BY tablename, cmd, roles, qual, with_check
    HAVING count(*) > 1
  LOOP
    FOR i IN 2 .. array_length(r.names, 1) LOOP
      BEGIN
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.names[i], r.tablename);
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipped dropping % on %: %', r.names[i], r.tablename, SQLERRM;
      END;
    END LOOP;
  END LOOP;
END $$;
