-- ============================================================
-- ProcurBosse — Enable Realtime on all core tables
-- Run once: adds tables to supabase_realtime publication
-- Safe: each statement guarded against duplicates
-- ============================================================

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'requisitions',
    'requisition_items',
    'purchase_orders',
    'purchase_order_items',
    'goods_received',
    'goods_received_items',
    'suppliers',
    'items',
    'item_categories',
    'contracts',
    'tenders',
    'bid_evaluations',
    'procurement_plans',
    'vouchers',
    'payment_vouchers',
    'receipt_vouchers',
    'journal_vouchers',
    'purchase_vouchers',
    'sales_vouchers',
    'budgets',
    'fixed_assets',
    'inspections',
    'non_conformance',
    'documents',
    'inbox_items',
    'notifications',
    'audit_log',
    'system_settings',
    'departments',
    'users',
    'profiles'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    -- Only add if table exists AND not already in publication
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tbl);
      RAISE NOTICE 'Added % to supabase_realtime', tbl;
    END IF;
  END LOOP;
END $$;

-- ── Set replica identity FULL on key tables ────────────────
-- Required for UPDATE/DELETE events to carry old row data
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'requisitions', 'purchase_orders', 'goods_received',
    'suppliers', 'items', 'contracts', 'tenders',
    'vouchers', 'payment_vouchers', 'documents',
    'inbox_items', 'notifications', 'audit_log'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      EXECUTE format('ALTER TABLE %I REPLICA IDENTITY FULL', tbl);
    END IF;
  END LOOP;
END $$;
