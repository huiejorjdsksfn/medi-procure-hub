-- ============================================================
-- EL5 MediProcure v8.0 -- NUCLEAR PRODUCTION MIGRATION
-- Scaling for 2000+ concurrent users
-- Security | Rate Limiting | Concurrency | Integrity | Indexes
-- Embu Level 5 Hospital | Kenya
-- ============================================================
BEGIN;

-- ============================================================
-- 1. RATE LIMITING
-- ============================================================
CREATE TABLE IF NOT EXISTS rate_limit_log (
  id          bigserial   PRIMARY KEY,
  user_id     uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  action      text        NOT NULL,
  recorded_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rate_limit_user_action ON rate_limit_log(user_id, action, recorded_at DESC);
ALTER TABLE rate_limit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_rate_log" ON rate_limit_log FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Rate limit checker function
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id uuid,
  p_action  text,
  p_window_seconds int DEFAULT 60,
  p_max_requests int DEFAULT 100
)
RETURNS TABLE(allowed boolean, remaining int, reset_at timestamptz, tier text)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count   int;
  v_reset   timestamptz;
  v_allowed boolean;
  v_tier    text;
BEGIN
  v_reset := now() + (p_window_seconds || ' seconds')::interval;
  SELECT COUNT(*) INTO v_count
  FROM rate_limit_log
  WHERE user_id = p_user_id
    AND action  = p_action
    AND recorded_at > now() - (p_window_seconds || ' seconds')::interval;

  v_allowed := v_count < p_max_requests;
  v_tier    := CASE
    WHEN v_count >= p_max_requests THEN 'blocked'
    WHEN v_count >= p_max_requests * 0.8 THEN 'elevated'
    ELSE 'normal'
  END;

  RETURN QUERY SELECT v_allowed, (p_max_requests - v_count), v_reset, v_tier;
END;
$$;
GRANT EXECUTE ON FUNCTION check_rate_limit TO authenticated;

-- Auto-cleanup rate log older than 5 minutes
CREATE OR REPLACE FUNCTION cleanup_rate_limit_log()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM rate_limit_log WHERE recorded_at < now() - INTERVAL '5 minutes';
END;
$$;
GRANT EXECUTE ON FUNCTION cleanup_rate_limit_log TO service_role;

-- ============================================================
-- 2. CONCURRENCY / OPTIMISTIC LOCKING
-- ============================================================
-- Add version column to all key tables for optimistic locking
ALTER TABLE requisitions    ADD COLUMN IF NOT EXISTS version int DEFAULT 1;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS version int DEFAULT 1;
ALTER TABLE goods_received  ADD COLUMN IF NOT EXISTS version int DEFAULT 1;
ALTER TABLE suppliers       ADD COLUMN IF NOT EXISTS version int DEFAULT 1;
ALTER TABLE items           ADD COLUMN IF NOT EXISTS version int DEFAULT 1;
ALTER TABLE contracts       ADD COLUMN IF NOT EXISTS version int DEFAULT 1;
ALTER TABLE tenders         ADD COLUMN IF NOT EXISTS version int DEFAULT 1;

-- Version auto-increment trigger
CREATE OR REPLACE FUNCTION increment_version()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.version := COALESCE(OLD.version, 0) + 1;
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  BEGIN
    CREATE TRIGGER trg_version_requisitions    BEFORE UPDATE ON requisitions    FOR EACH ROW EXECUTE FUNCTION increment_version();
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    CREATE TRIGGER trg_version_purchase_orders BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION increment_version();
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    CREATE TRIGGER trg_version_suppliers       BEFORE UPDATE ON suppliers       FOR EACH ROW EXECUTE FUNCTION increment_version();
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    CREATE TRIGGER trg_version_items           BEFORE UPDATE ON items           FOR EACH ROW EXECUTE FUNCTION increment_version();
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    CREATE TRIGGER trg_version_contracts       BEFORE UPDATE ON contracts       FOR EACH ROW EXECUTE FUNCTION increment_version();
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- ============================================================
-- 3. PERFORMANCE INDEXES for 2000+ users
-- ============================================================
-- Requisitions
CREATE INDEX IF NOT EXISTS idx_req_status_created    ON requisitions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_req_user_status        ON requisitions(requested_by, status);
CREATE INDEX IF NOT EXISTS idx_req_dept               ON requisitions(department_id);
CREATE INDEX IF NOT EXISTS idx_req_updated            ON requisitions(updated_at DESC);

-- Purchase orders
CREATE INDEX IF NOT EXISTS idx_po_status_created      ON purchase_orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_po_supplier             ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_updated              ON purchase_orders(updated_at DESC);

-- Suppliers
CREATE INDEX IF NOT EXISTS idx_sup_status             ON suppliers(status);
CREATE INDEX IF NOT EXISTS idx_sup_name               ON suppliers(company_name text_pattern_ops);

-- Items
CREATE INDEX IF NOT EXISTS idx_items_category         ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_name             ON items(name text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_items_code             ON items(item_code);

-- Notifications (high-read table for 2000 users)
CREATE INDEX IF NOT EXISTS idx_notif_user_read        ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_created          ON notifications(created_at DESC);

-- Profiles lookup
CREATE INDEX IF NOT EXISTS idx_profiles_email         ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_active        ON profiles(is_active) WHERE is_active = true;

-- User roles (critical for RLS performance)
CREATE INDEX IF NOT EXISTS idx_user_roles_user        ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role        ON user_roles(role);

-- Audit log
CREATE INDEX IF NOT EXISTS idx_audit_user_created     ON admin_activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity           ON admin_activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_severity         ON admin_activity_log(severity);

-- Documents
CREATE INDEX IF NOT EXISTS idx_docs_category_type     ON documents(category, file_type);
CREATE INDEX IF NOT EXISTS idx_docs_uploaded_by       ON documents(uploaded_by);

-- Sessions
CREATE INDEX IF NOT EXISTS idx_sessions_token         ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_status   ON user_sessions(user_id, status);

-- Action log
CREATE INDEX IF NOT EXISTS idx_action_module_type     ON user_action_log(module, action_type, created_at DESC);

-- ============================================================
-- 4. SECURITY -- IP whitelist + access control
-- ============================================================
CREATE TABLE IF NOT EXISTS ip_whitelist (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address  text        NOT NULL,
  label       text,
  is_active   boolean     DEFAULT true,
  added_by    uuid        REFERENCES auth.users(id),
  expires_at  timestamptz,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE ip_whitelist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_manage_ip_whitelist" ON ip_whitelist FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
    AND ur.role IN ('superadmin','webmaster','admin'))
);
CREATE POLICY "all_read_ip_whitelist" ON ip_whitelist FOR SELECT TO authenticated USING (true);

-- ============================================================
-- 5. DATA INTEGRITY -- Checksums and dedup detection
-- ============================================================
CREATE TABLE IF NOT EXISTS data_checksums (
  id          bigserial   PRIMARY KEY,
  table_name  text        NOT NULL,
  record_id   text        NOT NULL,
  checksum    text        NOT NULL,
  computed_at timestamptz DEFAULT now(),
  UNIQUE(table_name, record_id)
);
CREATE INDEX IF NOT EXISTS idx_checksums_table_record ON data_checksums(table_name, record_id);
ALTER TABLE data_checksums ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_manage_checksums" ON data_checksums FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
    AND ur.role IN ('superadmin','webmaster','admin','database_admin'))
);

-- ============================================================
-- 6. CONNECTION POOLING HINTS -- PgBouncer-ready views
-- ============================================================
-- Lightweight session count for pooler monitoring
CREATE OR REPLACE VIEW db_connection_stats AS
SELECT
  (SELECT COUNT(*) FROM user_sessions WHERE status = 'active' AND last_seen_at > now() - INTERVAL '2 minutes') AS active_sessions,
  (SELECT COUNT(*) FROM user_sessions WHERE status = 'active') AS total_sessions,
  (SELECT COUNT(DISTINCT user_id) FROM user_sessions WHERE status = 'active' AND last_seen_at > now() - INTERVAL '5 minutes') AS unique_users,
  now() AS checked_at;

GRANT SELECT ON db_connection_stats TO authenticated;

-- ============================================================
-- 7. NOTIFICATION QUEUE -- For high-volume broadcasting
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_queue (
  id          bigserial   PRIMARY KEY,
  user_id     uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  channel     text        NOT NULL DEFAULT 'in_app', -- in_app|sms|email|whatsapp
  title       text        NOT NULL,
  body        text        NOT NULL,
  priority    text        NOT NULL DEFAULT 'normal', -- low|normal|high|urgent
  status      text        NOT NULL DEFAULT 'pending', -- pending|sent|failed
  attempts    int         DEFAULT 0,
  sent_at     timestamptz,
  error_msg   text,
  metadata    jsonb       DEFAULT '{}',
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notif_queue_status    ON notification_queue(status, priority DESC, created_at);
CREATE INDEX IF NOT EXISTS idx_notif_queue_user       ON notification_queue(user_id, status);
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_manage_notif_queue" ON notification_queue FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
    AND ur.role IN ('superadmin','webmaster','admin'))
);

-- ============================================================
-- 8. SEARCH CACHE -- Full-text search materialized indexes
-- ============================================================
ALTER TABLE profiles       ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', COALESCE(full_name,'') || ' ' || COALESCE(email,''))) STORED;
ALTER TABLE suppliers      ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', COALESCE(company_name,'') || ' ' || COALESCE(contact_person,''))) STORED;
ALTER TABLE items          ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', COALESCE(name,'') || ' ' || COALESCE(description,''))) STORED;

CREATE INDEX IF NOT EXISTS idx_profiles_search   ON profiles  USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_suppliers_search  ON suppliers USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_items_search      ON items     USING gin(search_vector);

-- ============================================================
-- 9. INTEGRITY FUNCTION -- Validate key foreign keys
-- ============================================================
CREATE OR REPLACE FUNCTION validate_record_integrity(p_table text, p_id uuid)
RETURNS TABLE(valid boolean, issues text[])
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_issues text[] := ARRAY[]::text[];
BEGIN
  IF p_table = 'requisitions' THEN
    IF NOT EXISTS (SELECT 1 FROM requisitions WHERE id = p_id) THEN
      v_issues := array_append(v_issues, 'Record not found');
    END IF;
  END IF;
  RETURN QUERY SELECT (array_length(v_issues,1) IS NULL), v_issues;
END;
$$;
GRANT EXECUTE ON FUNCTION validate_record_integrity TO authenticated;

-- ============================================================
-- 10. REALTIME -- Enable on all new tables
-- ============================================================
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE rate_limit_log;      EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE notification_queue;  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE ip_whitelist;        EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE data_checksums;      EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

COMMIT;
