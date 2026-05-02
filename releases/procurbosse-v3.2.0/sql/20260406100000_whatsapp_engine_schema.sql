-- ═══════════════════════════════════════════════════════════════
-- EL5 MediProcure v5.8 — WhatsApp Engine & Session Management
-- ProcurBosse · Embu Level 5 Hospital
-- ═══════════════════════════════════════════════════════════════

-- ── WhatsApp session tracking ─────────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL UNIQUE,
  contact_name TEXT,
  session_active BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  renewal_count INTEGER DEFAULT 0,
  last_renewed_at TIMESTAMPTZ,
  opt_out BOOLEAN DEFAULT false,
  opt_out_at TIMESTAMPTZ,
  channel TEXT DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp','sms')),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wa_sessions_phone ON whatsapp_sessions(phone_number);
CREATE INDEX IF NOT EXISTS idx_wa_sessions_active ON whatsapp_sessions(session_active) WHERE session_active = true;

-- ── Session renewal log ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_renewal_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  run_at TIMESTAMPTZ DEFAULT now(),
  sessions_checked INTEGER DEFAULT 0,
  sessions_renewed INTEGER DEFAULT 0,
  sessions_failed INTEGER DEFAULT 0,
  triggered_by TEXT DEFAULT 'cron',
  duration_ms INTEGER
);

-- ── Scheduled jobs registry ───────────────────────────────────
CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_name TEXT UNIQUE NOT NULL,
  job_type TEXT NOT NULL,
  cron_expression TEXT,
  last_run TIMESTAMPTZ,
  next_run TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  run_count INTEGER DEFAULT 0,
  last_status TEXT DEFAULT 'pending',
  last_error TEXT,
  config JSONB DEFAULT '{}'
);

-- ── Cross-platform device registry ────────────────────────────
CREATE TABLE IF NOT EXISTS device_registry (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  device_id TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('web','electron_windows','electron_mac','pwa','mobile_ios','mobile_android')),
  user_agent TEXT,
  app_version TEXT,
  last_seen TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  push_token TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, device_id)
);

-- ── System performance log ────────────────────────────────────
CREATE TABLE IF NOT EXISTS performance_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page TEXT,
  action TEXT,
  duration_ms NUMERIC,
  user_id UUID REFERENCES auth.users(id),
  platform TEXT,
  app_version TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_perf_log_time ON performance_log(created_at DESC);

-- ── RLS for new tables ─────────────────────────────────────────
ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_renewal_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_sessions_auth"    ON whatsapp_sessions    FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "wa_renewal_auth"     ON whatsapp_renewal_log FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "sched_jobs_admin"    ON scheduled_jobs       FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id=auth.uid() AND role IN ('admin','database_admin')));
CREATE POLICY "device_registry_own" ON device_registry      FOR ALL USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id=auth.uid() AND role='admin'));

-- ── Realtime ──────────────────────────────────────────────────
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_sessions;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE device_registry;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Seed scheduled jobs ───────────────────────────────────────
INSERT INTO scheduled_jobs (job_name, job_type, cron_expression, is_active, config) VALUES
('whatsapp_session_renewal', 'edge_function', '0 */22 * * *', true, '{"function":"send-sms","action":"renew_sessions","description":"Auto-renew WhatsApp bad-machine sandbox sessions every 22 hours"}'),
('sms_log_cleanup', 'sql', '0 2 * * 0', true, '{"query":"DELETE FROM sms_log WHERE sent_at < NOW() - INTERVAL ''90 days''","description":"Weekly cleanup of old SMS logs"}'),
('performance_log_cleanup', 'sql', '0 3 * * *', true, '{"query":"DELETE FROM performance_log WHERE created_at < NOW() - INTERVAL ''30 days''","description":"Daily cleanup of performance logs"}')
ON CONFLICT (job_name) DO UPDATE SET config=EXCLUDED.config;

-- ── Update system_settings ────────────────────────────────────
INSERT INTO system_settings (key, value, description) VALUES
  ('whatsapp_sandbox_active', 'true', 'WhatsApp sandbox (+14155238886) active'),
  ('whatsapp_join_code', 'join bad-machine', 'WhatsApp sandbox join code'),
  ('whatsapp_auto_renew', 'true', 'Auto-renew WhatsApp sessions every 22h'),
  ('whatsapp_renewal_interval_hours', '22', 'WhatsApp session renewal interval'),
  ('cross_platform_sync', 'true', 'Enable cross-platform data sync'),
  ('pwa_enabled', 'true', 'PWA support enabled'),
  ('realtime_debounce_ms', '300', 'Realtime subscription debounce (ms)'),
  ('send_sms_version', '6.0', 'Current send-sms edge function version')
ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value;

-- ── Function: log WhatsApp session join ───────────────────────
CREATE OR REPLACE FUNCTION log_wa_session_join(p_phone TEXT, p_name TEXT DEFAULT NULL) RETURNS VOID AS $$
BEGIN
  INSERT INTO whatsapp_sessions (phone_number, contact_name, session_active, joined_at, last_message_at, expires_at)
  VALUES (p_phone, p_name, true, now(), now(), now() + INTERVAL '24 hours')
  ON CONFLICT (phone_number) DO UPDATE SET
    session_active = true,
    joined_at = COALESCE(whatsapp_sessions.joined_at, now()),
    last_message_at = now(),
    expires_at = now() + INTERVAL '24 hours',
    contact_name = COALESCE(EXCLUDED.contact_name, whatsapp_sessions.contact_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Function: log WhatsApp session renewal ────────────────────
CREATE OR REPLACE FUNCTION log_wa_renewal(p_renewed INT, p_checked INT, p_duration_ms INT DEFAULT 0) RETURNS VOID AS $$
BEGIN
  INSERT INTO whatsapp_renewal_log (sessions_renewed, sessions_checked, sessions_failed, duration_ms)
  VALUES (p_renewed, p_checked, p_checked - p_renewed, p_duration_ms);
  
  UPDATE whatsapp_sessions SET
    renewal_count = renewal_count + 1,
    last_renewed_at = now(),
    expires_at = now() + INTERVAL '24 hours'
  WHERE session_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE whatsapp_sessions IS 'EL5 MediProcure v5.8 — WhatsApp bad-machine sandbox session tracking';
COMMENT ON TABLE scheduled_jobs IS 'EL5 MediProcure v5.8 — Auto-scheduled background jobs';
COMMENT ON TABLE device_registry IS 'EL5 MediProcure v5.8 — Cross-platform device tracking';
