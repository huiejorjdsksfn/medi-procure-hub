# EL5 MediProcure Keep-Alive Bot v3.0

## Overview

The keep-alive bot is a background service that keeps the MediProcure **backend** (Supabase/PostgreSQL) **and frontend** (Vercel/Tencent CDN) awake 24/7 using a **Dump & Delete** strategy:
- **Dump**: Insert records into ALL major tables every minute to keep them warm
- **Delete**: Aggressively clean up records within 5 minutes to prevent bloat
- **Ping**: Hit the frontend CDN URLs to prevent serverless cold starts

## Target Operations

| Period | Operations (v3.0) |
|--------|-------------------|
| Per invocation | ~80 ops |
| Per minute | ~80 ops |
| Per hour | ~4,800 ops |
| Per day | ~115,200 ops |
| **Per week** | **~806,400 ops** |
| **Per month** | **~3.4M ops** |

> Target: 7,500/week · 22,500/month — **exceeded by 100x+**

## Strategy: Dump & Delete

Every minute (pg_cron trigger):
1. **Dump pass** — Insert into 5 tables: `audit_log`, `notifications`, `requisitions`, `activity_logs`, `keepalive_records`
2. **55s ping loop** — DB ping every second + insert heartbeat
3. **Cleanup pass** — Delete records older than 5 minutes
4. **Frontend ping** — Hit CDN/health endpoints to prevent cold starts

## Operations Per Invocation (55 seconds)

| Operation | Count | Table |
|-----------|-------|-------|
| DB Ping + Heartbeat | 55 | `db_heartbeat` |
| Dump audit records | 5 | `audit_log` |
| Dump notifications | 3 | `notifications` |
| Dump requisitions | 2 | `requisitions` |
| Dump activity logs | 2 | `activity_logs` |
| Dump keepalive records | 5 | `keepalive_records` |
| Cleanup passes (every 10 pings) | 5 | all tables |
| Trim tables | 3 | `db_heartbeat`, `keepalive_records`, `activity_logs` |
| Frontend ping | 1 | HTTP fetch |
| **Total** | **~80** | |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `?action=status` | GET | Get bot status, projections, table counts |
| `?action=ping` | POST | Single DB ping + heartbeat |
| `?action=health` | POST | DB + frontend health check |
| `?action=cleanup` | POST | Force cleanup of old records |
| `?action=wake` | POST | Dump into all tables immediately (keep 5 min) |
| *(default)* | POST | Full 55-second keepalive loop |

## Tables Hit (Dump & Delete Cycle)

| Table | Purpose | Keep Warm |
|-------|---------|-----------|
| `db_heartbeat` | DB ping records | ✅ |
| `audit_log` | All admin actions | ✅ |
| `notifications` | Push notifications | ✅ |
| `requisitions` | Procurement | ✅ |
| `activity_logs` | Bot activity | ✅ |
| `keepalive_records` | Primary dump table | ✅ |

## Setup

### 1. Run Database Migration
Run `supabase/migrations/keepalive_bot_setup.sql` in the Supabase SQL Editor:
```bash
# Creates: keepalive_records, db_heartbeat, activity_logs tables
# Creates: trim_heartbeat + trim_generic RPC functions
# Creates: pg_cron schedule (every minute)
```

### 2. Deploy Edge Function
```bash
supabase functions deploy keepalive-bot
```

### 3. Set Environment Secrets
```bash
supabase secrets set KEEPALIVE_FRONTEND_URLS="https://your-app.vercel.app/api/health,https://your-cdn.com/ping"
```

### 4. Verify
```bash
curl "https://yvjfehnzbzjliizjvuhq.supabase.co/functions/v1/keepalive-bot?action=status"
```

## Projections

| Metric | Value |
|--------|-------|
| Ops per invocation | ~80 |
| Ops per minute | ~80 |
| Ops per hour | ~4,800 |
| Ops per day | ~115,200 |
| Ops per week | ~806,400 |
| Ops per month | ~3,456,000 |
| Target weekly | 7,500 |
| Target met? | **YES (107x)** |

## Auto-Cleanup (5-Minute Rule)

All dumped records are automatically deleted after 5 minutes via:
1. **Every 10 pings**: `DELETE WHERE created_at < (now - 5min)`
2. **End of loop**: Final cleanup pass
3. **By ID**: Specific inserted IDs tracked and deleted

Max table sizes enforced:
- `db_heartbeat`: 5,000 rows
- `keepalive_records`: 1,000 rows
- `activity_logs`: 2,000 rows

## Manual Commands

```bash
# Check status
curl "https://yvjfehnzbzjliizjvuhq.supabase.co/functions/v1/keepalive-bot?action=status"

# Force cleanup
curl -X POST "https://yvjfehnzbzjliizjvuhq.supabase.co/functions/v1/keepalive-bot?action=cleanup"

# Wake all tables
curl -X POST "https://yvjfehnzbzjliizjvuhq.supabase.co/functions/v1/keepalive-bot?action=wake"

# Health check
curl -X POST "https://yvjfehnzbzjliizjvuhq.supabase.co/functions/v1/keepalive-bot?action=health"
```

## Monitoring

```sql
-- Check all table counts
SELECT 'db_heartbeat' as tbl, count(*) FROM db_heartbeat
UNION ALL SELECT 'keepalive_records', count(*) FROM keepalive_records
UNION ALL SELECT 'activity_logs', count(*) FROM activity_logs
UNION ALL SELECT 'audit_log', count(*) FROM audit_log
UNION ALL SELECT 'notifications', count(*) FROM notifications
UNION ALL SELECT 'requisitions', count(*) FROM requisitions;

-- Check recent activity
SELECT created_at, action, details FROM activity_logs
WHERE source = 'keepalive-bot-v3'
ORDER BY created_at DESC LIMIT 10;

-- Check heartbeat latency
SELECT avg(latency_ms), max(latency_ms), min(latency_ms), count(*)
FROM db_heartbeat WHERE source = 'keepalive-bot-v3' AND created_at > NOW() - INTERVAL '1 hour';
```

## Troubleshooting

### Bot not running
1. Check pg_cron: `SELECT * FROM cron.job;`
2. Check edge function is deployed
3. Verify `SUPABASE_SERVICE_ROLE_KEY` is set as a secret

### Table bloat
1. Run manual cleanup: `?action=cleanup`
2. Check `trim_generic` RPC: `SELECT trim_generic('table_name', 1000);`
3. Verify `created_at` index exists on each table

### Frontend not responding
1. Set `KEEPALIVE_FRONTEND_URLS` env var with your CDN URLs
2. Create a `/api/health` endpoint on the frontend
3. Check activity logs: `SELECT * FROM activity_logs WHERE action='frontend_ping'`

## Version History

- **v1.0**: Basic ping loop
- **v2.0**: Test data insertion, health checks, activity logging
- **v3.0**: Full dump-and-delete across ALL tables + frontend CDN ping + 5-min auto-cleanup + wake endpoint