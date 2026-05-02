-- ═══════════════════════════════════════════════════════════════════════════
-- EL5 MediProcure v5.9 — Missing Tables Migration
-- Creates all tables referenced by the 22 new APIs
-- Embu Level 5 Hospital · Embu County Government · Kenya
-- ═══════════════════════════════════════════════════════════════════════════

-- ── categories (item categories — was using item_categories before) ──────────
CREATE TABLE IF NOT EXISTS categories (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name         text NOT NULL,
  description  text,
  parent_id    uuid REFERENCES categories(id),
  is_active    boolean DEFAULT true,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_categories" ON categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_categories" ON categories FOR ALL TO authenticated USING (true);

-- ── journal_voucher_lines ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS journal_voucher_lines (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  journal_id      uuid REFERENCES journal_vouchers(id) ON DELETE CASCADE,
  account_code    text,
  description     text,
  debit_amount    numeric(15,2) DEFAULT 0,
  credit_amount   numeric(15,2) DEFAULT 0,
  cost_center     text,
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE journal_voucher_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_jvl" ON journal_voucher_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_jvl" ON journal_voucher_lines FOR ALL TO authenticated USING (true);

-- ── purchase_voucher_lines ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_voucher_lines (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  voucher_id      uuid REFERENCES purchase_vouchers(id) ON DELETE CASCADE,
  item_id         uuid REFERENCES items(id),
  description     text,
  quantity        numeric(12,3) DEFAULT 1,
  unit_price      numeric(15,2) DEFAULT 0,
  total_price     numeric(15,2) DEFAULT 0,
  account_code    text,
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE purchase_voucher_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_pvl" ON purchase_voucher_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_pvl" ON purchase_voucher_lines FOR ALL TO authenticated USING (true);

-- ── quality_inspections (already have "inspections" — add missing columns) ──
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inspections' AND column_name='inspection_type') THEN
    ALTER TABLE inspections ADD COLUMN inspection_type text DEFAULT 'incoming';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inspections' AND column_name='grn_id') THEN
    ALTER TABLE inspections ADD COLUMN grn_id uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inspections' AND column_name='po_id') THEN
    ALTER TABLE inspections ADD COLUMN po_id uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inspections' AND column_name='overall_result') THEN
    ALTER TABLE inspections ADD COLUMN overall_result text DEFAULT 'pending';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inspections' AND column_name='closed_at') THEN
    ALTER TABLE inspections ADD COLUMN closed_at timestamptz;
  END IF;
END $$;

-- ── inspection_items ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inspection_items (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  inspection_id   uuid REFERENCES inspections(id) ON DELETE CASCADE,
  item_id         uuid REFERENCES items(id),
  item_name       text,
  quantity_ordered numeric(12,3),
  quantity_received numeric(12,3),
  quantity_accepted numeric(12,3),
  quantity_rejected numeric(12,3),
  rejection_reason text,
  condition       text DEFAULT 'good',
  notes           text,
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE inspection_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_ii" ON inspection_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_ii" ON inspection_items FOR ALL TO authenticated USING (true);

-- ── non_conformance — add missing columns ────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='non_conformance' AND column_name='closed_at') THEN
    ALTER TABLE non_conformance ADD COLUMN closed_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='non_conformance' AND column_name='resolution') THEN
    ALTER TABLE non_conformance ADD COLUMN resolution text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='non_conformance' AND column_name='severity') THEN
    ALTER TABLE non_conformance ADD COLUMN severity text DEFAULT 'medium';
  END IF;
END $$;

-- ── procurement_plan_items ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS procurement_plan_items (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id         uuid REFERENCES procurement_plans(id) ON DELETE CASCADE,
  item_id         uuid REFERENCES items(id),
  item_name       text NOT NULL,
  description     text,
  quantity        numeric(12,3),
  estimated_unit_price numeric(15,2),
  estimated_total  numeric(15,2),
  quarter         text,
  category        text,
  department      text,
  priority        text DEFAULT 'normal',
  status          text DEFAULT 'draft',
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE procurement_plan_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_ppi" ON procurement_plan_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_ppi" ON procurement_plan_items FOR ALL TO authenticated USING (true);

-- ── report_schedules ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS report_schedules (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  report_type     text NOT NULL,
  frequency       text NOT NULL,   -- daily | weekly | monthly
  recipients      text[] DEFAULT '{}',
  is_active       boolean DEFAULT true,
  next_run_at     timestamptz,
  last_run_at     timestamptz,
  created_by      uuid REFERENCES profiles(id),
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE report_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_rs" ON report_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_rs" ON report_schedules FOR ALL TO authenticated USING (true);

-- ── system_metrics ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_metrics (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_name     text NOT NULL,
  metric_value    numeric,
  metric_unit     text,
  tags            jsonb DEFAULT '{}',
  recorded_at     timestamptz DEFAULT now()
);
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_sm" ON system_metrics FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_write_sm" ON system_metrics FOR INSERT TO authenticated USING (true);

-- ── supplier_scorecards ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS supplier_scorecards (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id       uuid REFERENCES suppliers(id) ON DELETE CASCADE,
  quality_score     numeric(5,2) DEFAULT 0,
  delivery_score    numeric(5,2) DEFAULT 0,
  pricing_score     numeric(5,2) DEFAULT 0,
  compliance_score  numeric(5,2) DEFAULT 0,
  total_score       numeric(5,2) DEFAULT 0,
  notes             text,
  evaluator_id      uuid REFERENCES profiles(id),
  evaluation_date   timestamptz DEFAULT now(),
  created_at        timestamptz DEFAULT now()
);
ALTER TABLE supplier_scorecards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_sc" ON supplier_scorecards FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_sc" ON supplier_scorecards FOR ALL TO authenticated USING (true);

-- ── scan_log ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scan_log (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  barcode         text NOT NULL,
  item_id         uuid REFERENCES items(id),
  action          text NOT NULL,   -- lookup | receive | issue | adjust
  quantity        numeric(12,3),
  location        text,
  scanned_by      uuid REFERENCES profiles(id),
  scanned_at      timestamptz DEFAULT now()
);
ALTER TABLE scan_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_sl" ON scan_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_sl" ON scan_log FOR INSERT TO authenticated USING (true);

-- ── email_messages (unified inbox + sent items) ───────────────────────────────
CREATE TABLE IF NOT EXISTS email_messages (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  direction       text NOT NULL DEFAULT 'inbound',  -- inbound | outbound
  from_address    text,
  to_address      text,
  subject         text,
  body_text       text,
  body_html       text,
  category        text DEFAULT 'general',
  is_read         boolean DEFAULT false,
  read_at         timestamptz,
  sent_at         timestamptz,
  received_at     timestamptz DEFAULT now(),
  message_id      text,
  thread_id       text,
  attachments     jsonb DEFAULT '[]',
  metadata        jsonb DEFAULT '{}'
);
ALTER TABLE email_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_em" ON email_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_em" ON email_messages FOR ALL TO authenticated USING (true);

-- ── reception_appointments ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reception_appointments (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_name      text NOT NULL,
  visitor_phone     text,
  host_name         text,
  host_department   text,
  scheduled_time    timestamptz NOT NULL,
  duration_minutes  int DEFAULT 30,
  purpose           text,
  status            text DEFAULT 'scheduled',  -- scheduled | confirmed | arrived | completed | cancelled
  notes             text,
  reminder_sent     boolean DEFAULT false,
  created_by        uuid REFERENCES profiles(id),
  created_at        timestamptz DEFAULT now()
);
ALTER TABLE reception_appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_ra" ON reception_appointments FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_ra" ON reception_appointments FOR ALL TO authenticated USING (true);

-- ── Add missing columns to existing tables ────────────────────────────────────

-- backup_jobs: add fields used by backupApi
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='backup_jobs' AND column_name='storage_path') THEN
    ALTER TABLE backup_jobs ADD COLUMN storage_path text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='backup_jobs' AND column_name='tables') THEN
    ALTER TABLE backup_jobs ADD COLUMN tables text[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='backup_jobs' AND column_name='size_bytes') THEN
    ALTER TABLE backup_jobs ADD COLUMN size_bytes bigint;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='backup_jobs' AND column_name='backup_type') THEN
    ALTER TABLE backup_jobs ADD COLUMN backup_type text DEFAULT 'manual';
  END IF;
END $$;

-- items: add barcode column for scanner API
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='items' AND column_name='barcode') THEN
    ALTER TABLE items ADD COLUMN barcode text;
    CREATE INDEX IF NOT EXISTS idx_items_barcode ON items(barcode) WHERE barcode IS NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='items' AND column_name='last_adjusted_at') THEN
    ALTER TABLE items ADD COLUMN last_adjusted_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='items' AND column_name='adjustment_reason') THEN
    ALTER TABLE items ADD COLUMN adjustment_reason text;
  END IF;
END $$;

-- suppliers: add performance columns for supplierPerformanceApi
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='on_time_delivery_rate') THEN
    ALTER TABLE suppliers ADD COLUMN on_time_delivery_rate numeric(5,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='quality_score') THEN
    ALTER TABLE suppliers ADD COLUMN quality_score numeric(5,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='total_orders') THEN
    ALTER TABLE suppliers ADD COLUMN total_orders int DEFAULT 0;
  END IF;
END $$;

-- procurement_plans: add columns used in procurementPlanApi
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='procurement_plans' AND column_name='approved_by') THEN
    ALTER TABLE procurement_plans ADD COLUMN approved_by uuid REFERENCES profiles(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='procurement_plans' AND column_name='approved_at') THEN
    ALTER TABLE procurement_plans ADD COLUMN approved_at timestamptz;
  END IF;
END $$;

-- ── Performance indexes for new tables ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
CREATE INDEX IF NOT EXISTS idx_scan_log_barcode ON scan_log(barcode);
CREATE INDEX IF NOT EXISTS idx_scan_log_scanned_at ON scan_log(scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_messages_direction ON email_messages(direction);
CREATE INDEX IF NOT EXISTS idx_email_messages_is_read ON email_messages(is_read) WHERE NOT is_read;
CREATE INDEX IF NOT EXISTS idx_email_messages_received_at ON email_messages(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_scorecards_supplier ON supplier_scorecards(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_scorecards_score ON supplier_scorecards(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_system_metrics_name ON system_metrics(metric_name, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_reception_appointments_time ON reception_appointments(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_procurement_plan_items_plan ON procurement_plan_items(plan_id);
CREATE INDEX IF NOT EXISTS idx_report_schedules_next_run ON report_schedules(next_run_at) WHERE is_active;

-- ── Enable realtime on key tables ────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE requisitions;
ALTER PUBLICATION supabase_realtime ADD TABLE purchase_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE stock_movements;
ALTER PUBLICATION supabase_realtime ADD TABLE system_broadcasts;
