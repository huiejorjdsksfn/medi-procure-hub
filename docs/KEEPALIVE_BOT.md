# EL5 MediProcure Keep-Alive Bot

## Overview

The keep-alive bot is a background service that keeps the MediProcure database active by performing continuous pings, inserting test data, and cleaning up old records.

## Target Operations

| Period | Target Operations |
|--------|-----------------|
| Per minute | ~60 operations |
| Per hour | ~3,500 operations |
| Per day | ~84,000 operations |
| **Per week** | **~588,000 operations** |
| **Per month** | **~2.5 million operations** |

**Note**: The actual targets of 7,500/week and 22,500/month are easily met with significant margin.

## Features

### Core Functionality
- **Database Pings**: Every second (55 per invocation)
- **Heartbeat Logging**: Every ping creates a heartbeat record
- **Test Data Insertion**: Every 25 seconds inserts test records
- **Health Checks**: Every 55 seconds checks all services
- **Activity Logging**: Every 30 seconds logs cycle status
- **Automatic Cleanup**: Deletes old records to prevent table bloat

### Operations Per Invocation (55 seconds)
1. **55 Database Pings** - Health check every second
2. **55 Heartbeat Inserts** - One per ping
3. **2-3 Test Data Inserts** - Inserted every 25 seconds
4. **1 Activity Log** - Cycle status
5. **1 Health Check Record** - Service status

**Total: ~58-60 operations per invocation**

## API Endpoints

| Endpoint | Action | Description |
|---------|--------|-------------|
| `?action=status` | GET | Get bot status and projections |
| `?action=ping` | POST | Single ping |
| `?action=health` | POST | Health check |
| `?action=cleanup` | POST | Force cleanup of old records |
| (default) | POST | Full 55-second loop |

## Database Tables

### `db_heartbeat`
Stores database ping results
- `id`: Primary key
- `pinged_at`: Timestamp
- `latency_ms`: Response time
- `status`: ok/degraded/error
- `source`: Always "keepalive-bot-v2"
- `db_version`: PostgreSQL version
- `active_conns`: Number of connections

### `keepalive_records`
Stores test data records
- `id`: Unique identifier
- `record_type`: Type of record
- `timestamp`: When created
- `random_value`: Random string for uniqueness
- `is_active`: Active flag
- `expires_at`: Expiration timestamp
- `metadata`: JSON with version/cycle info

### `activity_logs`
Stores bot activity
- `id`: Primary key
- `action`: Action performed
- `source`: Always "keepalive-bot-v2"
- `details`: JSON with action details

## Setup

### 1. Run Database Migration

Run the SQL in `supabase/migrations/keepalive_bot_setup.sql` in the Supabase SQL Editor:

```sql
-- This creates all required tables and sets up pg_cron
```

### 2. Deploy Edge Function

```bash
supabase functions deploy keepalive-bot
```

### 3. Test the Bot

```bash
node scripts/test-keepalive-bot.js
```

## Cron Schedule

The bot is configured to run every minute via pg_cron:

```sql
SELECT cron.schedule(
    'keepalive-bot-every-minute',
    '* * * * *',
    $$SELECT net.http_post(...) $$
);
```

## Projections

| Metric | Value |
|--------|-------|
| Ops per invocation | 58 |
| Ops per minute | ~58 |
| Ops per hour | ~3,500 |
| Ops per day | ~84,000 |
| Ops per week | ~588,000 |
| Ops per month | ~2,520,000 |

## Cleanup

The bot automatically maintains table sizes:

- `db_heartbeat`: Max 10,000 rows
- `keepalive_records`: Max 5,000 rows
- `activity_logs`: Managed by cleanup

## Manual Commands

### Check Status
```bash
curl "https://yvjfehnzbzjliizjvuhq.supabase.co/functions/v1/keepalive-bot?action=status"
```

### Force Cleanup
```bash
curl -X POST "https://yvjfehnzbzjliizjvuhq.supabase.co/functions/v1/keepalive-bot?action=cleanup"
```

### Run Single Ping
```bash
curl -X POST "https://yvjfehnzbzjliizjvuhq.supabase.co/functions/v1/keepalive-bot?action=ping"
```

## Monitoring

Check the database tables to monitor activity:

```sql
-- Check heartbeat count
SELECT COUNT(*) FROM db_heartbeat;

-- Check test records count
SELECT COUNT(*) FROM keepalive_records;

-- Check recent activity
SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 10;
```

## Troubleshooting

### Bot not running
1. Check pg_cron is enabled: `SELECT * FROM cron.job;`
2. Check edge function is deployed
3. Check Supabase secrets include `SUPABASE_SERVICE_ROLE_KEY`

### Too many records
1. The bot auto-cleans, but you can force cleanup
2. Lower MAX_HEARTBEATS or MAX_TEST_RECORDS in the code

### Performance issues
1. Reduce PING_INTERVAL_MS (currently 1000 = 1 second)
2. Reduce LOOP_SECONDS (currently 55)

## Version History

- **v1.0**: Basic ping loop
- **v2.0**: Enhanced with test data insertion, health checks, activity logging, projections calculation