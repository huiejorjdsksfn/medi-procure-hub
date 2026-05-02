# EL5 MediProcure — Supabase Migration Technical Guide
## SQL Migration Reference for Database Administrators

> **For:** System Administrators / Database Administrators  
> **System:** ProcurBosse ERP · Embu Level 5 Hospital  
> **Supabase Project:** `yvjfehnzbzjliizjvuhq`  
> **Dashboard:** https://supabase.com/dashboard/project/yvjfehnzbzjliizjvuhq

---

## 1. OVERVIEW

This guide covers all database migration operations for EL5 MediProcure using the Supabase CLI. Migrations are located in `supabase/migrations/` and run in timestamp order.

```
supabase/migrations/
├── 20260412000001_new_roles_activation.sql    ← Base roles schema
├── 20260412000002_v6_roles_ip_twilio.sql      ← IP + Twilio tables
├── 20260412100000_v70_full_upgrade.sql        ← v7.0 full schema
├── 20260412200000_v71_nuclear_fixes.sql       ← v7.1 fixes
├── 20260413000001_v72_force_schema_fix.sql    ← v7.2 schema fix
├── 20260413200000_v80_live_sessions.sql       ← Live sessions
├── 20260413200001_v80_system_metrics.sql      ← Metrics tables
├── 20260413300000_v80_storage_types.sql       ← Storage types
├── 20260413400000_v80_nuclear_production.sql  ← Production tables
└── 99999_new_features.sql                     ← Latest features
```

---

## 2. TOOLS SETUP

### 2.1 Install Supabase CLI

```bash
# Linux / macOS
curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz \
  | tar -xz && sudo mv supabase /usr/local/bin/

# Verify
supabase --version

# Windows (PowerShell)
iwr https://github.com/supabase/cli/releases/latest/download/supabase_windows_amd64.tar.gz -OutFile supabase.tar.gz
tar -xzf supabase.tar.gz
Move-Item supabase.exe C:\Windows\System32\
```

### 2.2 Login

```bash
# Get token from: https://supabase.com/dashboard/account/tokens
supabase login
# Or set env var:
export SUPABASE_ACCESS_TOKEN="your_token_here"
```

### 2.3 Link to Project

```bash
cd /path/to/medi-procure-hub
supabase link --project-ref yvjfehnzbzjliizjvuhq
```

---

## 3. RUNNING MIGRATIONS

### 3.1 Push All Pending Migrations

```bash
# Apply all unapplied migrations (safe — skips already-applied)
supabase db push --project-ref yvjfehnzbzjliizjvuhq

# With access token explicitly
SUPABASE_ACCESS_TOKEN=xxx supabase db push --project-ref yvjfehnzbzjliizjvuhq
```

### 3.2 Check Migration Status

```bash
# List all migrations and their status
supabase migration list --project-ref yvjfehnzbzjliizjvuhq

# Output example:
# LOCAL                                    REMOTE  TIME (UTC)
# 20260412000001_new_roles_activation.sql  YES     2026-04-12 00:00
# 20260412000002_v6_roles_ip_twilio.sql    YES     2026-04-12 00:00
# 99999_new_features.sql                   NO      (pending)
```

### 3.3 Create a New Migration

```bash
# Create blank timestamped migration file
supabase migration new my_feature_name
# Creates: supabase/migrations/20260418HHMMSS_my_feature_name.sql

# Edit it, then push:
supabase db push --project-ref yvjfehnzbzjliizjvuhq
```

---

## 4. DIRECT SQL EXECUTION (psql)

### 4.1 Connection String

Get your connection details from:  
**Supabase Dashboard → Project Settings → Database → Connection string**

```
# Direct connection (requires SSL)
postgresql://postgres:[PASSWORD]@db.yvjfehnzbzjliizjvuhq.supabase.co:5432/postgres

# Pooler (recommended for apps)
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

### 4.2 Connect via psql

```bash
# Install psql (Ubuntu/Debian)
sudo apt install postgresql-client

# Connect
psql "postgresql://postgres:[PASSWORD]@db.yvjfehnzbzjliizjvuhq.supabase.co:5432/postgres" --ssl-mode=require

# Or using Supabase CLI
supabase db connect --project-ref yvjfehnzbzjliizjvuhq
```

### 4.3 Run SQL File via psql

```bash
psql "postgresql://postgres:[PASSWORD]@db.yvjfehnzbzjliizjvuhq.supabase.co:5432/postgres" \
  --ssl-mode=require \
  -f supabase/migrations/99999_new_features.sql
```

---

## 5. KEY TABLES REFERENCE

### 5.1 Core Tables

```sql
-- Procurement
SELECT * FROM requisitions         ORDER BY created_at DESC LIMIT 10;
SELECT * FROM purchase_orders      ORDER BY created_at DESC LIMIT 10;
SELECT * FROM goods_received       ORDER BY created_at DESC LIMIT 10;
SELECT * FROM suppliers            ORDER BY name LIMIT 20;
SELECT * FROM contracts            WHERE status = 'active';
SELECT * FROM tenders              WHERE status = 'open';
SELECT * FROM bid_evaluations      ORDER BY created_at DESC LIMIT 10;
SELECT * FROM procurement_plans    ORDER BY created_at DESC LIMIT 10;

-- Inventory
SELECT * FROM items                WHERE current_quantity < 5;  -- low stock
SELECT * FROM categories           ORDER BY name;
SELECT * FROM departments          ORDER BY name;
SELECT * FROM stock_movements      ORDER BY created_at DESC LIMIT 20;

-- Finance
SELECT * FROM payment_vouchers     WHERE status = 'pending';
SELECT * FROM receipt_vouchers     ORDER BY created_at DESC LIMIT 10;
SELECT * FROM journal_vouchers     ORDER BY created_at DESC LIMIT 10;
SELECT * FROM budgets              WHERE fiscal_year = 2026;
SELECT * FROM invoice_matching     WHERE status = 'pending';
SELECT * FROM gl_postings          ORDER BY created_at DESC LIMIT 20;

-- Users & Auth
SELECT * FROM profiles             ORDER BY created_at DESC;
SELECT * FROM user_roles           WHERE role = 'admin';
SELECT * FROM audit_log            ORDER BY created_at DESC LIMIT 50;

-- System
SELECT * FROM system_settings;
SELECT * FROM network_whitelist    WHERE active = true;
SELECT * FROM ip_access_log        ORDER BY created_at DESC LIMIT 20;
SELECT * FROM notifications        WHERE is_read = false LIMIT 20;
SELECT * FROM sms_log              ORDER BY sent_at DESC LIMIT 20;
```

### 5.2 Useful Admin Queries

```sql
-- Count all tables
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check RLS policies
SELECT tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename;

-- View all roles assigned
SELECT p.full_name, p.email, ur.role, ur.created_at
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.id
ORDER BY p.full_name;

-- Check active sessions
SELECT user_id, ip_address, last_active, browser
FROM user_sessions
WHERE last_active > NOW() - INTERVAL '1 hour'
ORDER BY last_active DESC;

-- Audit trail for a user
SELECT action, entity_type, description, created_at
FROM audit_log
WHERE user_id = 'USER_UUID_HERE'
ORDER BY created_at DESC
LIMIT 100;

-- Low stock alert
SELECT name, current_quantity, reorder_level, unit_of_measure
FROM items
WHERE current_quantity <= reorder_level
ORDER BY current_quantity ASC;

-- Pending approvals dashboard
SELECT 'Requisitions' as type, COUNT(*) as count
FROM requisitions WHERE status IN ('submitted','pending')
UNION ALL
SELECT 'Purchase Orders', COUNT(*)
FROM purchase_orders WHERE status = 'pending'
UNION ALL
SELECT 'Payment Vouchers', COUNT(*)
FROM payment_vouchers WHERE status IN ('pending','submitted');
```

---

## 6. ROW LEVEL SECURITY (RLS)

All tables have RLS enabled. Policies use `auth.uid()` and the `user_roles` table.

### 6.1 Check RLS Status

```sql
-- See which tables have RLS enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true
ORDER BY tablename;
```

### 6.2 Standard Policy Pattern

```sql
-- Example: allow admins full access, others read-only
CREATE POLICY "admin_full_access" ON my_table
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin','superadmin','webmaster')
    )
  );

CREATE POLICY "staff_read_access" ON my_table
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);
```

### 6.3 Temporarily Bypass RLS (Admin Only)

```sql
-- Run as postgres superuser only
SET LOCAL row_security = off;
SELECT * FROM any_table;
SET LOCAL row_security = on;
```

---

## 7. ROLLBACK PROCEDURES

### 7.1 Rollback a Specific Migration

```sql
-- Undo a migration manually (write the inverse SQL)
-- Example: rolling back a column addition
ALTER TABLE requisitions DROP COLUMN IF EXISTS new_column;

-- Then remove it from migration history
DELETE FROM supabase_migrations.schema_migrations 
WHERE version = '20260413400000';
```

### 7.2 Restore from Backup

```bash
# Download backup from Supabase Dashboard → Database → Backups
# Restore via pg_restore
pg_restore -h db.yvjfehnzbzjliizjvuhq.supabase.co \
  -U postgres -d postgres \
  --ssl-mode=require \
  backup_file.dump
```

### 7.3 Point-in-Time Recovery

Available on Pro plan — contact Supabase support or use:  
**Dashboard → Database → Backups → PITR**

---

## 8. EDGE FUNCTIONS — DEPLOY & MANAGE

### 8.1 Deploy All Functions

```bash
# Deploy all 16 functions
supabase functions deploy --project-ref yvjfehnzbzjliizjvuhq --no-verify-jwt

# Deploy specific function
supabase functions deploy send-sms --project-ref yvjfehnzbzjliizjvuhq --no-verify-jwt
```

### 8.2 Set Secrets

```bash
supabase secrets set \
  TWILIO_ACCOUNT_SID=ACe96c6e0e5edd4de5f5a4c6d9cc7b7c5a \
  TWILIO_AUTH_TOKEN=d73601fbefe26e01b06e22c53a798ea6 \
  TWILIO_PHONE_NUMBER=+16812972643 \
  TWILIO_WA_NUMBER=+14155238886 \
  TWILIO_MESSAGING_SERVICE_SID=MGd547d8e3273fda2d21afdd6856acb245 \
  --project-ref yvjfehnzbzjliizjvuhq
```

### 8.3 View Logs

```bash
# View function logs
supabase functions log send-sms --project-ref yvjfehnzbzjliizjvuhq

# Or in dashboard:
# https://supabase.com/dashboard/project/yvjfehnzbzjliizjvuhq/functions
```

---

## 9. FLUSH SCHEMA CACHE

After migrations, flush PostgREST cache:

```bash
curl -X POST \
  "https://yvjfehnzbzjliizjvuhq.supabase.co/rest/v1/rpc/reload_schema" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

Or via Supabase Dashboard → **API → Schema Cache → Reload**.

---

## 10. MONITORING CHECKLIST

After any migration, verify:

```sql
-- 1. All expected tables exist
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
-- Expected: ~45+ tables

-- 2. RLS is enabled
SELECT COUNT(*) FROM pg_tables WHERE schemaname='public' AND rowsecurity=false;
-- Expected: 0 (all tables have RLS)

-- 3. Indexes are healthy
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename;

-- 4. No orphaned foreign keys
SELECT conname, conrelid::regclass, confrelid::regclass
FROM pg_constraint
WHERE contype = 'f'
AND NOT EXISTS (
  SELECT 1 FROM pg_class 
  WHERE oid = confrelid
);
```

---

*EL5 MediProcure ProcurBosse v21.4 · Embu Level 5 Hospital · Embu County Government · April 2026*  
*Technical support: tecnojin03@gmail.com*
