-- ============================================================
-- EL5 MediProcure v5.8 — Advanced ERP Engine Schema
-- ProcurBosse · Embu Level 5 Hospital
-- ============================================================

-- ── ERP Engine Cache & Sync Tables ────────────────────────────
CREATE TABLE IF NOT EXISTS erp_query_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  query_hash TEXT NOT NULL UNIQUE,
  original_sql TEXT,
  optimized_sql TEXT,
  estimated_cost NUMERIC,
  actual_cost NUMERIC,
  indexes_used TEXT[],
  cache_strategy TEXT DEFAULT 'none',
  hit_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_hit_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '1 hour')
);

-- ── Batch Processing Jobs ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS batch_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed','cancelled')),
  priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  total_operations INTEGER DEFAULT 0,
  completed_operations INTEGER DEFAULT 0,
  failed_operations INTEGER DEFAULT 0,
  chunk_size INTEGER DEFAULT 100,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 5,
  payload JSONB DEFAULT '{}',
  error_log JSONB DEFAULT '[]',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  deadline TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Workflow Automation Rules ─────────────────────────────────
CREATE TABLE IF NOT EXISTS workflow_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_name TEXT NOT NULL,
  workflow_type TEXT NOT NULL,
  trigger_condition JSONB NOT NULL DEFAULT '{}',
  action_type TEXT NOT NULL,
  action_config JSONB DEFAULT '{}',
  auto_approval_threshold NUMERIC,
  rpa_enabled BOOLEAN DEFAULT false,
  rpa_confidence NUMERIC DEFAULT 0.8,
  escalation_hours INTEGER DEFAULT 8,
  is_active BOOLEAN DEFAULT true,
  execution_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Performance Metrics (Time-Series) ─────────────────────────
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_time TIMESTAMPTZ DEFAULT now(),
  response_time_ms NUMERIC,
  throughput_rps NUMERIC,
  error_rate NUMERIC,
  cpu_usage NUMERIC,
  memory_usage_mb NUMERIC,
  db_connections INTEGER,
  cache_hit_rate NUMERIC,
  api_call_count INTEGER,
  active_users INTEGER,
  sync_queue_depth INTEGER
);

CREATE INDEX IF NOT EXISTS idx_perf_metrics_time ON performance_metrics (metric_time DESC);

-- ── Security Audit Events (Blockchain-style) ──────────────────
CREATE TABLE IF NOT EXISTS security_audit_chain (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  block_index INTEGER NOT NULL,
  previous_hash TEXT NOT NULL,
  event_hash TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  risk_score NUMERIC DEFAULT 0,
  compliance_flags TEXT[] DEFAULT '{}',
  is_tamper_evident BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_chain_user ON security_audit_chain (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_chain_entity ON security_audit_chain (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_chain_time ON security_audit_chain (created_at DESC);

-- ── OLAP Procurement Cube (Materialized) ──────────────────────
CREATE TABLE IF NOT EXISTS olap_procurement_facts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fact_date DATE NOT NULL,
  fiscal_year INTEGER,
  quarter INTEGER,
  month INTEGER,
  department TEXT,
  cost_center TEXT,
  supplier_id UUID,
  item_category TEXT,
  total_value NUMERIC DEFAULT 0,
  quantity NUMERIC DEFAULT 0,
  avg_price NUMERIC DEFAULT 0,
  order_count INTEGER DEFAULT 0,
  lead_time_days NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_olap_date ON olap_procurement_facts (fact_date DESC);
CREATE INDEX IF NOT EXISTS idx_olap_dept ON olap_procurement_facts (department);

-- ── API Analytics ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  duration_ms NUMERIC,
  status_code INTEGER,
  request_size_bytes INTEGER,
  response_size_bytes INTEGER,
  api_version TEXT DEFAULT 'v1',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_analytics_time ON api_analytics (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_analytics_endpoint ON api_analytics (endpoint, method);

-- ── Webhook Subscriptions ────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL,
  secret TEXT NOT NULL,
  filters JSONB DEFAULT '{}',
  retry_config JSONB DEFAULT '{"maxAttempts":5,"backoff":"exponential","initialDelay":1000}',
  is_active BOOLEAN DEFAULT true,
  delivery_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  last_delivery_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Webhook Deliveries ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID REFERENCES webhook_subscriptions(id),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  attempt_count INTEGER DEFAULT 0,
  response_code INTEGER,
  response_body TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Saga Orchestration Log ────────────────────────────────────
CREATE TABLE IF NOT EXISTS saga_executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  saga_type TEXT NOT NULL,
  aggregate_id UUID,
  status TEXT DEFAULT 'running' CHECK (status IN ('running','completed','failed','compensating','compensated')),
  current_step TEXT,
  completed_steps TEXT[] DEFAULT '{}',
  failed_step TEXT,
  compensation_steps TEXT[] DEFAULT '{}',
  context JSONB DEFAULT '{}',
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id)
);

-- ── Predictive Cache Predictions ─────────────────────────────
CREATE TABLE IF NOT EXISTS cache_predictions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  cache_key TEXT NOT NULL,
  probability NUMERIC NOT NULL,
  expected_access_at TIMESTAMPTZ,
  data_size_bytes INTEGER,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('critical','high','medium','low')),
  preloaded BOOLEAN DEFAULT false,
  hit_confirmed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── System Health Dashboard ───────────────────────────────────
CREATE TABLE IF NOT EXISTS system_health_checks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  check_time TIMESTAMPTZ DEFAULT now(),
  component TEXT NOT NULL,
  status TEXT DEFAULT 'healthy' CHECK (status IN ('healthy','degraded','down','unknown')),
  response_time_ms NUMERIC,
  details JSONB DEFAULT '{}',
  auto_resolved BOOLEAN DEFAULT false
);

-- ── Update system_settings for v5.8 ──────────────────────────
INSERT INTO system_settings (key, value, description) VALUES
  ('app_version', '5.8.0', 'Current application version'),
  ('erp_sync_enabled', 'true', 'Enable ERP sync to Dynamics 365'),
  ('erp_sync_endpoint', 'https://dynamics.embu.go.ke/api/v1', 'Dynamics 365 API endpoint'),
  ('twilio_phone_number', '+16812972643', 'Twilio SMS phone number'),
  ('twilio_whatsapp_number', '+14155238886', 'Twilio WhatsApp sandbox number'),
  ('twilio_messaging_service_sid', 'MG2fffc3a381c44a202c316dcc6400707d', 'Twilio Messaging Service SID'),
  ('whatsapp_sandbox_code', 'bad-machine', 'WhatsApp sandbox join code'),
  ('twilio_voice_webhook', 'https://demo.twilio.com/welcome/voice/', 'Twilio voice webhook URL'),
  ('smtp_enabled', 'true', 'Enable SMTP email'),
  ('smtp_provider', 'resend', 'SMTP provider'),
  ('cache_l1_ttl', '60', 'L1 memory cache TTL (seconds)'),
  ('cache_l2_ttl', '300', 'L2 Redis cache TTL (seconds)'),
  ('batch_chunk_size', '100', 'Default batch processing chunk size'),
  ('workflow_auto_approve_threshold', '10000', 'Auto-approve below this amount (KES)'),
  ('erp_sync_interval', '300', 'ERP sync interval (seconds)'),
  ('security_audit_enabled', 'true', 'Enable blockchain audit trail'),
  ('performance_monitoring_enabled', 'true', 'Enable performance monitoring'),
  ('odata_api_enabled', 'true', 'Enable OData v4 API'),
  ('webhook_api_enabled', 'true', 'Enable webhook subscriptions')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description;

-- ── Enable RLS on new tables ──────────────────────────────────
ALTER TABLE batch_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_audit_chain ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_subscriptions ENABLE ROW LEVEL SECURITY;

-- Batch jobs: users see their own, admins see all
CREATE POLICY "batch_jobs_user" ON batch_jobs FOR ALL
  USING (created_by = auth.uid() OR EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','database_admin')
  ));

-- Performance metrics: admin only
CREATE POLICY "perf_metrics_admin" ON performance_metrics FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','database_admin')
  ));

-- Audit chain: admins and accountants can read
CREATE POLICY "audit_chain_read" ON security_audit_chain FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','database_admin','accountant','procurement_manager')
  ));

-- API analytics: admin only
CREATE POLICY "api_analytics_admin" ON api_analytics FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','database_admin')
  ));

-- Enable realtime on key tables
ALTER PUBLICATION supabase_realtime ADD TABLE batch_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE system_health_checks;

-- ── Function: Log security audit event ───────────────────────
CREATE OR REPLACE FUNCTION log_security_audit(
  p_action TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id TEXT DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
  v_prev_hash TEXT;
  v_block_index INTEGER;
BEGIN
  SELECT COALESCE(MAX(block_index), -1) + 1, COALESCE(MAX(event_hash), '0')
  INTO v_block_index, v_prev_hash
  FROM security_audit_chain;

  INSERT INTO security_audit_chain (
    block_index, previous_hash, event_hash,
    user_id, action, entity_type, entity_id,
    old_values, new_values
  ) VALUES (
    v_block_index,
    v_prev_hash,
    encode(digest(gen_random_uuid()::text || now()::text, 'sha256'), 'hex'),
    auth.uid(), p_action, p_entity_type, p_entity_id,
    p_old_values, p_new_values
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Function: Record performance metric ──────────────────────
CREATE OR REPLACE FUNCTION record_performance_metric(
  p_response_ms NUMERIC DEFAULT 0,
  p_cache_hit_rate NUMERIC DEFAULT 0,
  p_active_users INTEGER DEFAULT 0
) RETURNS VOID AS $$
BEGIN
  INSERT INTO performance_metrics (
    response_time_ms, cache_hit_rate, active_users
  ) VALUES (
    p_response_ms, p_cache_hit_rate, p_active_users
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE batch_jobs IS 'EL5 MediProcure v5.8 — Batch processing job queue';
COMMENT ON TABLE security_audit_chain IS 'EL5 MediProcure v5.8 — Blockchain-style immutable audit log';
COMMENT ON TABLE performance_metrics IS 'EL5 MediProcure v5.8 — System performance time-series data';
COMMENT ON TABLE webhook_subscriptions IS 'EL5 MediProcure v5.8 — Event-driven webhook subscriptions';
COMMENT ON TABLE saga_executions IS 'EL5 MediProcure v5.8 — Saga orchestration transaction log';
