-- ================================================================
-- EL5 MediProcure v5.8 — Performance Indexes + Auth Stability
-- Speeds up: login role fetch, dashboard queries, realtime subs
-- ================================================================

-- ── user_roles indexes (critical for login speed) ────────────────
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id
  ON user_roles(user_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_role
  ON user_roles(role);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_role
  ON user_roles(user_id, role);

-- ── profiles indexes ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_id
  ON profiles(id);

-- ── requisitions indexes (most queried table) ────────────────────
CREATE INDEX IF NOT EXISTS idx_requisitions_status
  ON requisitions(status);

CREATE INDEX IF NOT EXISTS idx_requisitions_created_by
  ON requisitions(created_by);

CREATE INDEX IF NOT EXISTS idx_requisitions_created_at
  ON requisitions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_requisitions_department_id
  ON requisitions(department_id) WHERE department_id IS NOT NULL;

-- ── purchase_orders ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status
  ON purchase_orders(status);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_at
  ON purchase_orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id
  ON purchase_orders(supplier_id) WHERE supplier_id IS NOT NULL;

-- ── goods_received ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_goods_received_status
  ON goods_received(status);

CREATE INDEX IF NOT EXISTS idx_goods_received_po_id
  ON goods_received(purchase_order_id) WHERE purchase_order_id IS NOT NULL;

-- ── notifications (realtime heavy) ────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON notifications(user_id) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_read
  ON notifications(is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at
  ON notifications(created_at DESC);

-- ── audit_logs ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
  ON audit_logs(user_id) WHERE user_id IS NOT NULL;

-- ── suppliers ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_suppliers_status
  ON suppliers(status) WHERE status IS NOT NULL;

-- ── Enable row-level security publication for realtime ─────────────
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE requisitions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE purchase_orders;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Ensure accountant role exists in user_roles constraint ─────────
DO $$ BEGIN
  -- Drop old constraint if it doesn't include accountant
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_roles_role_check'
      AND table_name = 'user_roles'
  ) THEN
    ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Re-add with all roles including accountant + database_admin
ALTER TABLE user_roles
  DROP CONSTRAINT IF EXISTS user_roles_role_check;

ALTER TABLE user_roles
  ADD CONSTRAINT user_roles_role_check
  CHECK (role IN (
    'admin', 'database_admin', 'procurement_manager', 'procurement_officer',
    'inventory_manager', 'warehouse_officer', 'requisitioner', 'accountant'
  ));

-- ── Refresh PostgREST schema cache ─────────────────────────────────
NOTIFY pgrst, 'reload schema';
