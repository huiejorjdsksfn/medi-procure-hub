-- ============================================
-- EL5 MediProcure Keep-Alive Bot Setup
-- Run this SQL in Supabase SQL Editor
-- ============================================

-- 1. Create keepalive_records table for test data
CREATE TABLE IF NOT EXISTS keepalive_records (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    record_type     TEXT NOT NULL DEFAULT 'keepalive',
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    random_value    TEXT,
    ping_target     TEXT,
    is_active       BOOLEAN DEFAULT true,
    expires_at      TIMESTAMPTZ,
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_keepalive_created ON keepalive_records(created_at DESC);

-- 2. Create db_heartbeat table (if not exists)
CREATE TABLE IF NOT EXISTS db_heartbeat (
    id              BIGSERIAL PRIMARY KEY,
    pinged_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    latency_ms      INTEGER,
    status          TEXT,
    source          TEXT DEFAULT 'keepalive-bot',
    db_version      TEXT,
    active_conns    INTEGER,
    table_counts    JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_heartbeat_pinged ON db_heartbeat(pinged_at DESC);

-- 3. Create activity_logs table (if not exists)
CREATE TABLE IF NOT EXISTS activity_logs (
    id              BIGSERIAL PRIMARY KEY,
    action          TEXT NOT NULL,
    source          TEXT,
    details         JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_source ON activity_logs(source);

-- 4. Create RPC function for trimming heartbeat (if not exists)
CREATE OR REPLACE FUNCTION trim_heartbeat(keep integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM db_heartbeat
    WHERE id NOT IN (
        SELECT id FROM db_heartbeat
        ORDER BY id DESC
        LIMIT keep
    );
END;
$$;

-- 4b. Generic trim function (works on any table with a created_at field)
CREATE OR REPLACE FUNCTION trim_generic(tbl text, keep integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    EXECUTE format(
        'DELETE FROM %I WHERE id NOT IN (SELECT id FROM %I ORDER BY created_at DESC LIMIT %s)',
        tbl, tbl, keep
    );
EXCEPTION WHEN OTHERS THEN
    -- Fallback: delete by created_at cutoff
    EXECUTE format(
        'DELETE FROM %I WHERE created_at < (SELECT created_at FROM %I ORDER BY created_at DESC LIMIT 1 OFFSET %s)',
        tbl, tbl, keep
    ) ON CONFLICT DO NOTHING;
END;
$$;

-- 5. Create RPC function for health stats (if not exists)
CREATE OR REPLACE FUNCTION get_db_health_stats()
RETURNS TABLE (
    db_version text,
    active_conns bigint,
    table_counts jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        current_setting('server_version_num')::text as db_version,
        (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database())::bigint as active_conns,
        jsonb_build_object(
            'heartbeats', (SELECT count(*) FROM db_heartbeat),
            'keepalive_records', (SELECT count(*) FROM keepalive_records),
            'activity_logs', (SELECT count(*) FROM activity_logs)
        ) as table_counts;
END;
$$;

-- 6. Enable RLS on new tables
ALTER TABLE keepalive_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE db_heartbeat ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- 7. Create policies for service role (bypass RLS)
CREATE POLICY "Service role full access keepalive" ON keepalive_records
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access heartbeat" ON db_heartbeat
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access activity" ON activity_logs
    FOR ALL USING (auth.role() = 'service_role');

-- 8. Set up pg_cron schedule (every minute)
-- Note: pg_cron extension must be enabled on your Supabase project
SELECT cron.schedule(
    'keepalive-bot-every-minute',
    '* * * * *',
    $$SELECT net.http_post(
        url:=current_setting('app.settings.external_url') || '/functions/v1/keepalive-bot',
        headers:=jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key')
        )
    ))$$
);

-- 9. Verify cron job is scheduled
SELECT * FROM cron.job;

-- 10. Grant permissions
GRANT ALL ON keepalive_records TO service_role;
GRANT ALL ON db_heartbeat TO service_role;
GRANT ALL ON activity_logs TO service_role;
GRANT USAGE ON SEQUENCE keepalive_records_id_seq TO service_role;
GRANT USAGE ON SEQUENCE db_heartbeat_id_seq TO service_role;
GRANT USAGE ON SEQUENCE activity_logs_id_seq TO service_role;

-- 11. Insert initial test record
INSERT INTO keepalive_records (id, record_type, random_value)
VALUES ('INIT-' || extract(epoch from now())::text, 'init', 'Setup complete at ' || now()::text);

-- 12. Insert initial heartbeat
INSERT INTO db_heartbeat (latency_ms, status, source)
VALUES (0, 'setup_complete', 'keepalive-bot-v2');

-- 13. Insert setup activity log
INSERT INTO activity_logs (action, source, details)
VALUES ('setup_complete', 'keepalive-bot-v2', '{"version": "2.0", "message": "Database tables and cron job configured"}'::jsonb);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check table counts
SELECT 'keepalive_records' as table_name, count(*) as row_count FROM keepalive_records
UNION ALL
SELECT 'db_heartbeat', count(*) FROM db_heartbeat
UNION ALL
SELECT 'activity_logs', count(*) FROM activity_logs;

-- Check cron jobs
SELECT jobname, schedule, command FROM cron.job;

-- Manual test: Run the keepalive function
-- SELECT net.http_post(
--     url:='https://yvjfehnzbzjliizjvuhq.supabase.co/functions/v1/keepalive-bot',
--     headers:=jsonb_build_object(
--         'Content-Type', 'application/json',
--         'Authorization', 'Bearer <your_service_key>'
--     )
-- );