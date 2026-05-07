-- ============================================================
-- EL5 MediProcure v8.0 -- Live Sessions + User Action Log
-- Embu Level 5 Hospital | Embu County Government | Kenya
-- ============================================================
BEGIN;

-- ── 1. Live user sessions ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_sessions (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token text        UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  ip_address    text,
  user_agent    text,
  current_page  text        DEFAULT '/',
  current_module text       DEFAULT 'dashboard',
  role          text,
  status        text        NOT NULL DEFAULT 'active', -- active | idle | disconnected
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  connected_at  timestamptz NOT NULL DEFAULT now(),
  disconnected_at timestamptz,
  metadata      jsonb       DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id    ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_status     ON user_sessions(status);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_seen  ON user_sessions(last_seen_at DESC);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Admin/superadmin can see all sessions
CREATE POLICY "admin_read_sessions" ON user_sessions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
    AND ur.role IN ('superadmin','webmaster','admin','database_admin')
  )
);

-- Users can upsert their own session
CREATE POLICY "user_upsert_own_session" ON user_sessions FOR ALL USING (
  user_id = auth.uid()
) WITH CHECK (user_id = auth.uid());

-- ── 2. User action log (every click/action) ───────────────────────────────
CREATE TABLE IF NOT EXISTS user_action_log (
  id          bigserial   PRIMARY KEY,
  user_id     uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id  uuid        REFERENCES user_sessions(id) ON DELETE SET NULL,
  action_type text        NOT NULL, -- 'page_view'|'click'|'create'|'update'|'delete'|'export'|'login'|'logout'|'search'
  module      text,                 -- 'requisitions'|'purchase_orders'|'inventory'|...
  action      text        NOT NULL, -- human-readable action description
  entity_type text,                 -- 'requisition'|'purchase_order'|'item'|...
  entity_id   text,                 -- UUID or ID of the affected record
  ip_address  text,
  metadata    jsonb       DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_action_log_user_id    ON user_action_log(user_id);
CREATE INDEX IF NOT EXISTS idx_action_log_created_at ON user_action_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_action_log_module     ON user_action_log(module);
CREATE INDEX IF NOT EXISTS idx_action_log_action_type ON user_action_log(action_type);

ALTER TABLE user_action_log ENABLE ROW LEVEL SECURITY;

-- Admin can read all
CREATE POLICY "admin_read_action_log" ON user_action_log FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
    AND ur.role IN ('superadmin','webmaster','admin','database_admin')
  )
);

-- Users can insert their own actions
CREATE POLICY "user_insert_own_actions" ON user_action_log FOR INSERT WITH CHECK (
  user_id = auth.uid()
);

-- ── 3. Session stats view ─────────────────────────────────────────────────
CREATE OR REPLACE VIEW live_session_stats AS
SELECT
  COUNT(*) FILTER (WHERE status = 'active' AND last_seen_at > now() - INTERVAL '2 minutes')  AS active_now,
  COUNT(*) FILTER (WHERE status = 'active' AND last_seen_at > now() - INTERVAL '15 minutes') AS active_15m,
  COUNT(*) FILTER (WHERE connected_at > now() - INTERVAL '1 hour')                           AS sessions_1h,
  COUNT(*) FILTER (WHERE connected_at > now() - INTERVAL '24 hours')                         AS sessions_24h,
  COUNT(DISTINCT user_id) FILTER (WHERE last_seen_at > now() - INTERVAL '2 minutes')         AS unique_users_now
FROM user_sessions;

GRANT SELECT ON live_session_stats TO authenticated;

-- ── 4. Function: cleanup stale sessions ──────────────────────────────────
CREATE OR REPLACE FUNCTION cleanup_stale_sessions()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE user_sessions
  SET status = 'disconnected', disconnected_at = now()
  WHERE status = 'active' AND last_seen_at < now() - INTERVAL '5 minutes';
END;
$$;
GRANT EXECUTE ON FUNCTION cleanup_stale_sessions() TO authenticated;

-- ── 5. Function: upsert session heartbeat ────────────────────────────────
CREATE OR REPLACE FUNCTION upsert_session(
  p_token       text,
  p_page        text DEFAULT '/',
  p_module      text DEFAULT 'dashboard',
  p_ip          text DEFAULT NULL,
  p_user_agent  text DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_session_id uuid;
  v_role       text;
BEGIN
  SELECT role INTO v_role FROM user_roles WHERE user_id = auth.uid() LIMIT 1;

  INSERT INTO user_sessions (session_token, user_id, ip_address, user_agent, current_page, current_module, role, status, last_seen_at, connected_at)
  VALUES (p_token, auth.uid(), p_ip, p_user_agent, p_page, p_module, v_role, 'active', now(), now())
  ON CONFLICT (session_token) DO UPDATE SET
    current_page   = EXCLUDED.current_page,
    current_module = EXCLUDED.current_module,
    ip_address     = COALESCE(EXCLUDED.ip_address, user_sessions.ip_address),
    role           = COALESCE(EXCLUDED.role, user_sessions.role),
    status         = 'active',
    last_seen_at   = now()
  RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$;
GRANT EXECUTE ON FUNCTION upsert_session(text,text,text,text,text) TO authenticated;

-- ── 6. Enable realtime ────────────────────────────────────────────────────
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE user_sessions;   EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE user_action_log; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

COMMIT;
