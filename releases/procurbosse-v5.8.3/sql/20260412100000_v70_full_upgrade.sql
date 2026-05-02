-- ═══════════════════════════════════════════════════════════════════
-- ProcurBosse v7.0 — Full Upgrade Migration
-- All 10 roles activated · Twilio secrets seeded · IP stats enhanced
-- D365 session tracking · Password audit · Notification system
-- EL5 MediProcure · Embu Level 5 Hospital
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Ensure app_role enum has all 10 values ─────────────────────
DO $$ BEGIN
  BEGIN ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'superadmin';       EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'webmaster';        EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'admin';            EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'database_admin';   EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'procurement_manager';  EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'procurement_officer';  EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'inventory_manager';    EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'warehouse_officer';    EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'requisitioner';        EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'accountant';           EXCEPTION WHEN others THEN NULL; END;
END $$;

-- ── 2. user_roles — ensure table exists with all constraints ──────
CREATE TABLE IF NOT EXISTS user_roles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL,
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamptz DEFAULT now(),
  notes      text,
  UNIQUE(user_id, role)
);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins_manage_roles" ON user_roles;
CREATE POLICY "admins_manage_roles" ON user_roles USING (
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('superadmin','webmaster','admin'))
);
DROP POLICY IF EXISTS "users_see_own_role" ON user_roles;
CREATE POLICY "users_see_own_role" ON user_roles FOR SELECT USING (user_id = auth.uid());

-- ── 3. ip_live_stats — enhanced fields ───────────────────────────
CREATE TABLE IF NOT EXISTS ip_live_stats (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address   text NOT NULL,
  user_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  country      text, city text, region text, isp text, org text,
  latitude     numeric(10,6), longitude numeric(10,6),
  timezone     text, country_code text, flag_emoji text,
  is_vpn       boolean DEFAULT false,
  is_proxy     boolean DEFAULT false,
  is_bot       boolean DEFAULT false,
  risk_score   int DEFAULT 0,
  event_type   text DEFAULT 'login' CHECK (event_type IN ('login','logout','active','blocked','suspicious','failed_login')),
  user_agent   text, session_id text,
  created_at   timestamptz DEFAULT now(),
  last_seen    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ip_live_ip      ON ip_live_stats(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_live_user    ON ip_live_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_ip_live_event   ON ip_live_stats(event_type);
CREATE INDEX IF NOT EXISTS idx_ip_live_created ON ip_live_stats(created_at DESC);

ALTER TABLE ip_live_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_read_ip_stats"    ON ip_live_stats;
DROP POLICY IF EXISTS "service_insert_ip_stats" ON ip_live_stats;
CREATE POLICY "admin_read_ip_stats" ON ip_live_stats FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('superadmin','webmaster','admin','database_admin'))
);
CREATE POLICY "service_insert_ip_stats" ON ip_live_stats FOR INSERT WITH CHECK (true);
CREATE POLICY "service_update_ip_stats" ON ip_live_stats FOR UPDATE USING (true);

-- ── 4. session_tracker ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS session_tracker (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id  text UNIQUE,
  ip_address  text, user_agent text,
  started_at  timestamptz DEFAULT now(),
  last_seen   timestamptz DEFAULT now(),
  ended_at    timestamptz,
  is_active   boolean DEFAULT true,
  logout_type text CHECK (logout_type IN ('manual','timeout','forced','expired'))
);
CREATE INDEX IF NOT EXISTS idx_session_user   ON session_tracker(user_id);
CREATE INDEX IF NOT EXISTS idx_session_active ON session_tracker(is_active) WHERE is_active = true;

ALTER TABLE session_tracker ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_see_sessions"  ON session_tracker;
DROP POLICY IF EXISTS "session_insert"      ON session_tracker;
DROP POLICY IF EXISTS "session_update_own"  ON session_tracker;
CREATE POLICY "admin_see_sessions" ON session_tracker FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('superadmin','webmaster','admin','database_admin'))
);
CREATE POLICY "session_insert"     ON session_tracker FOR INSERT WITH CHECK (true);
CREATE POLICY "session_update_own" ON session_tracker FOR UPDATE USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('superadmin','webmaster','admin'))
);

-- ── 5. password_reset_log ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS password_reset_log (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_user_id  uuid REFERENCES auth.users(id),
  action         text NOT NULL CHECK (action IN ('reset_email','force_set','view','unlock')),
  ip_address     text, notes text,
  success        boolean DEFAULT true,
  created_at     timestamptz DEFAULT now()
);
ALTER TABLE password_reset_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_manage_pwd_log" ON password_reset_log;
CREATE POLICY "admin_manage_pwd_log" ON password_reset_log USING (
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('superadmin','webmaster','admin'))
);

-- ── 6. twilio_config — upsert with latest creds ──────────────────
CREATE TABLE IF NOT EXISTS twilio_config (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  env            text DEFAULT 'production' UNIQUE,
  account_sid    text NOT NULL,
  auth_token     text NOT NULL,
  phone_number   text NOT NULL,
  wa_number      text, messaging_sid text,
  at_api_key     text, at_username text,
  is_active      boolean DEFAULT true,
  last_tested_at timestamptz, last_test_ok boolean, test_error text,
  updated_at     timestamptz DEFAULT now(),
  updated_by     uuid REFERENCES auth.users(id)
);
ALTER TABLE twilio_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_read_twilio"  ON twilio_config;
DROP POLICY IF EXISTS "admin_write_twilio" ON twilio_config;
CREATE POLICY "admin_read_twilio"  ON twilio_config FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('superadmin','webmaster','admin'))
);
CREATE POLICY "admin_write_twilio" ON twilio_config FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('superadmin','webmaster','admin'))
);

INSERT INTO twilio_config (env, account_sid, auth_token, phone_number, wa_number, messaging_sid, is_active)
VALUES (
  'production',
  'ACe96c6e0e5edd4de5f5a4c6d9cc7b7c5a',
  'd73601fbefe26e01b06e22c53a798ea6',
  '+16812972643', '+14155238886',
  'MGd547d8e3273fda2d21afdd6856acb245',
  true
) ON CONFLICT (env) DO UPDATE SET
  account_sid   = EXCLUDED.account_sid,
  auth_token    = EXCLUDED.auth_token,
  phone_number  = EXCLUDED.phone_number,
  wa_number     = EXCLUDED.wa_number,
  messaging_sid = EXCLUDED.messaging_sid,
  is_active     = true,
  updated_at    = now();

-- ── 7. sms_log — ensure exists ───────────────────────────────────
CREATE TABLE IF NOT EXISTS sms_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_number    text NOT NULL,
  from_number  text,
  message      text NOT NULL,
  status       text DEFAULT 'sent',
  twilio_sid   text,
  provider     text,
  module       text,
  record_id    uuid,
  sent_by      uuid REFERENCES auth.users(id),
  channel      text DEFAULT 'sms',
  cost_usd     numeric(8,4),
  error_msg    text,
  sent_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sms_log_to   ON sms_log(to_number);
CREATE INDEX IF NOT EXISTS idx_sms_log_sent ON sms_log(sent_at DESC);
ALTER TABLE sms_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_see_sms" ON sms_log;
CREATE POLICY "admin_see_sms" ON sms_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('superadmin','webmaster','admin','database_admin'))
);
CREATE POLICY "sms_insert_all" ON sms_log FOR INSERT WITH CHECK (true);

-- ── 8. sms_conversations ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sms_conversations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number    text UNIQUE NOT NULL,
  contact_name    text,
  last_message    text,
  last_message_at timestamptz DEFAULT now(),
  status          text DEFAULT 'open',
  unread_count    int DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

-- ── 9. notifications — ensure full schema ────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text NOT NULL,
  message    text,
  type       text DEFAULT 'info',
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  sent_by    uuid REFERENCES auth.users(id),
  is_read    boolean DEFAULT false,
  link       text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notif_user   ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_unread ON notifications(is_read) WHERE NOT is_read;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_see_own_notifs" ON notifications;
CREATE POLICY "users_see_own_notifs" ON notifications FOR SELECT USING (
  user_id = auth.uid() OR user_id IS NULL OR
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('superadmin','webmaster','admin'))
);
CREATE POLICY "insert_notif" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "update_notif" ON notifications FOR UPDATE USING (user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('superadmin','webmaster','admin'))
);

-- ── 10. Enable realtime ───────────────────────────────────────────
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE ip_live_stats;    EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE session_tracker;  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE user_roles;       EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE notifications;    EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE sms_log;          EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- ── 11. active_users_with_roles view ─────────────────────────────
CREATE OR REPLACE VIEW active_users_with_roles AS
SELECT
  p.id, p.full_name, p.email, p.phone_number, p.department,
  p.is_active, p.avatar_url, p.employee_id, p.created_at, p.last_active_at,
  COALESCE(array_agg(ur.role ORDER BY ur.role) FILTER (WHERE ur.role IS NOT NULL), '{}'::text[]) AS roles,
  (SELECT COUNT(*) FROM ip_live_stats i WHERE i.user_id = p.id AND i.created_at > now() - interval '24 hours') AS ip_events_24h,
  (SELECT i.ip_address FROM ip_live_stats i WHERE i.user_id = p.id ORDER BY i.created_at DESC LIMIT 1) AS last_ip
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
GROUP BY p.id, p.full_name, p.email, p.phone_number, p.department,
         p.is_active, p.avatar_url, p.employee_id, p.created_at, p.last_active_at;

-- ── 12. RLS on profiles for admin reads ──────────────────────────
DROP POLICY IF EXISTS "admin_read_profiles" ON profiles;
CREATE POLICY "admin_read_profiles" ON profiles FOR SELECT USING (
  id = auth.uid() OR
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('superadmin','webmaster','admin','database_admin'))
);

COMMIT;
