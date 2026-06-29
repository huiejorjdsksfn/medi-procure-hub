-- ============================================================
--  EL5 MediProcure — DB Migration Completion Pass
--  Timestamp : 20260628200001
--  Purpose   : Create every table referenced in the frontend /
--              edge functions that had no CREATE TABLE statement
--              in prior migrations.  All statements are guarded
--              with IF NOT EXISTS so this is safe to re-run.
-- ============================================================

-- ── 1. backup_jobs ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.backup_jobs (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  label         text        NOT NULL,
  backup_type   text,                        -- 'full' | 'schema' | 'data'
  status        text        DEFAULT 'pending',
  started_at    timestamptz DEFAULT now(),
  completed_at  timestamptz,
  file_url      text,
  file_size     bigint,
  size_bytes    bigint,
  row_counts    jsonb,
  tables_json   jsonb,
  storage_path  text,
  tables        jsonb,
  error_msg     text,
  initiated_by  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now()
);

-- ── 2. bank_statements ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bank_statements (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name   text,
  account_number text,
  bank_name      text,
  statement_date date,
  opening_balance numeric(15,2) DEFAULT 0,
  closing_balance numeric(15,2) DEFAULT 0,
  currency       text        DEFAULT 'KES',
  status         text        DEFAULT 'pending',   -- 'pending' | 'reconciled' | 'disputed'
  file_url       text,
  notes          text,
  uploaded_by    uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

-- ── 3. document_signees ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.document_signees (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   uuid        REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id       uuid        REFERENCES public.profiles(id)  ON DELETE SET NULL,
  signee_name   text,
  signee_email  text,
  signee_role   text,
  label         text,
  sig_type      text        DEFAULT 'draw',   -- 'draw' | 'upload' | 'stamp'
  image_base64  text,
  status        text        DEFAULT 'pending',
  sort_order    int         DEFAULT 0,
  note          text,
  due_date      date,
  uploaded_by   uuid,
  signed_at     timestamptz,
  created_at    timestamptz DEFAULT now()
);

-- ── 4. facilities ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.facilities (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text        NOT NULL UNIQUE,
  name          text        NOT NULL,
  short_name    text        NOT NULL,
  type          text,                          -- 'hospital' | 'clinic' | 'dispensary'
  level         text,                          -- 'L2' | 'L3' | 'L4' | 'L5' | 'L6'
  location      text        NOT NULL,
  address       text,
  county        text,
  sub_county    text,
  phone         text,
  email         text,
  logo_url      text,
  primary_color text,
  accent_color  text,
  parent_id     uuid        REFERENCES public.facilities(id) ON DELETE SET NULL,
  is_main       boolean     DEFAULT false,
  is_active     boolean     DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- Seed with Embu Level 5 Hospital
INSERT INTO public.facilities (code, name, short_name, type, level, location, county, is_main, is_active)
VALUES ('EL5H', 'Embu Level 5 Hospital', 'EL5H', 'hospital', 'L5', 'Embu Town', 'Embu', true, true)
ON CONFLICT (code) DO NOTHING;

-- ── 5. user_facilities ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_facilities (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid    REFERENCES public.profiles(id)   ON DELETE CASCADE,
  facility_id uuid    REFERENCES public.facilities(id) ON DELETE CASCADE,
  is_primary  boolean DEFAULT false,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, facility_id)
);

-- ── 6. gl_journal ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gl_journal (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_number  text        NOT NULL UNIQUE,
  posting_date    date        DEFAULT CURRENT_DATE,
  period          text,
  gl_account      text        NOT NULL,
  account_name    text,
  description     text,
  debit_amount    numeric(15,2) DEFAULT 0,
  credit_amount   numeric(15,2) DEFAULT 0,
  cost_centre     text,
  department      text,
  project_code    text,
  reference       text,
  source_type     text,      -- 'requisition' | 'purchase_order' | 'payment_voucher' | 'manual'
  source_id       uuid,
  erp_posting_id  text,
  sync_status     text        DEFAULT 'pending',
  posted_by       uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  posted_by_name  text,
  created_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gl_journal_posting_date ON public.gl_journal(posting_date);
CREATE INDEX IF NOT EXISTS idx_gl_journal_gl_account   ON public.gl_journal(gl_account);

-- ── 7. goods_received_notes ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.goods_received_notes (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_number          text        NOT NULL UNIQUE,
  purchase_order_id   uuid        REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  supplier_id         uuid        REFERENCES public.suppliers(id)       ON DELETE SET NULL,
  received_date       date        DEFAULT CURRENT_DATE,
  received_by         uuid        REFERENCES public.profiles(id)        ON DELETE SET NULL,
  delivery_note_no    text,
  invoice_number      text,
  total_value         numeric(15,2) DEFAULT 0,
  status              text        DEFAULT 'draft',
  notes               text,
  is_active           boolean     DEFAULT true,
  last_seen           timestamptz,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_grn_purchase_order ON public.goods_received_notes(purchase_order_id);

-- ── 8. google_forms ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.google_forms (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id        text        NOT NULL,
  form_api_id    text,
  form_url       text,
  edit_url       text,
  title          text,
  status         text        DEFAULT 'active',
  fields         jsonb,
  published_at   timestamptz,
  created_at     timestamptz DEFAULT now(),
  created_by     uuid        REFERENCES public.profiles(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_google_forms_form_id ON public.google_forms(form_id);

-- ── 9. inbox_items ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inbox_items (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  type            text        NOT NULL,     -- 'message' | 'notification' | 'approval' | 'alert'
  subject         text        NOT NULL,
  body            text,
  from_user_id    uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  to_user_id      uuid        REFERENCES public.profiles(id) ON DELETE CASCADE,
  from_email      text,
  from_name       text,
  to_email        text,
  cc              text,
  status          text        DEFAULT 'unread',
  priority        text        DEFAULT 'normal',
  module          text,
  record_type     text,
  record_id       text,
  record_number   text,
  notification_id uuid,
  is_archived     boolean     DEFAULT false,
  is_starred      boolean     DEFAULT false,
  action_taken    text,
  reply_body      text,
  replied_at      timestamptz,
  created_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inbox_items_to_user ON public.inbox_items(to_user_id);
CREATE INDEX IF NOT EXISTS idx_inbox_items_status  ON public.inbox_items(status);

-- ── 10. inventory_items ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id              uuid        REFERENCES public.items(id) ON DELETE CASCADE,
  location             text,
  bin_number           text,
  quantity_in_stock    numeric(15,4) DEFAULT 0,
  reserved_quantity    numeric(15,4) DEFAULT 0,
  available_quantity   numeric(15,4) GENERATED ALWAYS AS
                         (quantity_in_stock - reserved_quantity) STORED,
  unit_cost            numeric(15,2),
  total_value          numeric(15,2),
  last_counted_at      timestamptz,
  last_movement_at     timestamptz,
  expiry_date          date,
  batch_number         text,
  is_active            boolean     DEFAULT true,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inventory_items_item_id  ON public.inventory_items(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_location ON public.inventory_items(location);

-- ── 11. notification_logs ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email      text,
  to_phone      text,
  channel       text,       -- 'email' | 'sms' | 'whatsapp' | 'push'
  message_id    text,
  subject       text,
  message       text,
  status        text        DEFAULT 'sent',
  error_message text,
  sent_at       timestamptz DEFAULT now(),
  metadata      jsonb
);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON public.notification_logs(sent_at);

-- ── 12. org_stamps ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.org_stamps (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  label         text        NOT NULL DEFAULT 'Official Stamp',
  image_base64  text,
  stamp_type    text        DEFAULT 'circular',
  is_active     boolean     DEFAULT true,
  uploaded_by   uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  document_id   uuid,
  created_at    timestamptz DEFAULT now()
);

-- ── 13. user_signatures ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_signatures (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        REFERENCES public.profiles(id) ON DELETE CASCADE,
  label         text        NOT NULL DEFAULT 'My Signature',
  sig_type      text        DEFAULT 'draw',   -- 'draw' | 'upload' | 'stamp'
  image_base64  text,
  is_default    boolean     DEFAULT false,
  created_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_signatures_user_id ON public.user_signatures(user_id);

-- ── 14. sms_messages ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sms_messages (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  to_number     text        NOT NULL,
  message_body  text        NOT NULL,
  channel       text        DEFAULT 'sms',   -- 'sms' | 'whatsapp'
  status        text        DEFAULT 'pending',
  sid           text,                         -- Twilio message SID
  error_message text,
  module        text,
  source        text,
  metadata      jsonb,
  form          jsonb,
  sent_at       timestamptz DEFAULT now(),
  created_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sms_messages_to_number ON public.sms_messages(to_number);
CREATE INDEX IF NOT EXISTS idx_sms_messages_sent_at   ON public.sms_messages(sent_at);

-- ── 15. stock_movements ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_number  text        NOT NULL UNIQUE,
  movement_type    text        NOT NULL,  -- 'in'|'out'|'transfer'|'adjustment'|'initial_stock'
  item_id          uuid        REFERENCES public.items(id) ON DELETE SET NULL,
  item_name        text,
  quantity         numeric(15,4) NOT NULL DEFAULT 0,
  unit_cost        numeric(15,2),
  total_value      numeric(15,2),
  from_location    text,
  to_location      text,
  department_id    uuid        REFERENCES public.departments(id) ON DELETE SET NULL,
  reference_type   text,
  reference        text,
  notes            text,
  movement_date    timestamptz DEFAULT now(),
  performed_by     uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by       uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by_name  text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item_id ON public.stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date    ON public.stock_movements(movement_date);

-- Auto-generate movement_number if blank
CREATE OR REPLACE FUNCTION public.set_movement_number()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.movement_number IS NULL OR NEW.movement_number = '' THEN
    NEW.movement_number := 'MOV-' || to_char(now(), 'YYYYMMDD') || '-' ||
                           lpad((nextval('public.stock_movement_seq'))::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE SEQUENCE IF NOT EXISTS public.stock_movement_seq START 1;

DROP TRIGGER IF EXISTS trg_stock_movement_number ON public.stock_movements;
CREATE TRIGGER trg_stock_movement_number
  BEFORE INSERT ON public.stock_movements
  FOR EACH ROW EXECUTE FUNCTION public.set_movement_number();

-- ── 16. system_config ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.system_config (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text        NOT NULL UNIQUE,
  value       text,
  label       text,
  type        text        DEFAULT 'text',
  category    text        DEFAULT 'general',
  updated_by  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_system_config_key      ON public.system_config(key);
CREATE INDEX IF NOT EXISTS idx_system_config_category ON public.system_config(category);

-- Seed default config keys
INSERT INTO public.system_config (key, value, label, type, category) VALUES
  ('app_name',           'EL5 MediProcure',            'Application Name',    'text',    'branding'),
  ('hospital_name',      'Embu Level 5 Hospital',       'Hospital Name',       'text',    'branding'),
  ('default_currency',   'KES',                         'Default Currency',    'text',    'finance'),
  ('fiscal_year_start',  '07-01',                       'Fiscal Year Start',   'text',    'finance'),
  ('max_upload_mb',      '25',                          'Max Upload Size (MB)','number',  'storage'),
  ('session_timeout_min','480',                         'Session Timeout (min)','number', 'security')
ON CONFLICT (key) DO NOTHING;

-- ── 17. query_log (ensure created — found in v71 but verify) ──
CREATE TABLE IF NOT EXISTS public.query_log (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  query_text    text,
  query_type    text,
  rows_affected int,
  execution_ms  int,
  executed_by   uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  executed_at   timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_query_log_executed_at ON public.query_log(executed_at);

-- ── 18. Enable RLS on all new tables ──────────────────────────
DO $$ DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'backup_jobs','bank_statements','document_signees','facilities',
    'user_facilities','gl_journal','goods_received_notes','google_forms',
    'inbox_items','inventory_items','notification_logs','org_stamps',
    'user_signatures','sms_messages','stock_movements','system_config',
    'query_log'
  ]) LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXCEPTION WHEN others THEN NULL;
    END;
    -- Open read policy for authenticated users (admin-level data uses role checks in app)
    EXECUTE format($$
      DO $inner$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies
          WHERE tablename = %L AND policyname = 'authenticated_read'
        ) THEN
          EXECUTE format(
            'CREATE POLICY authenticated_read ON public.%%I FOR SELECT TO authenticated USING (true)',
            %L
          );
        END IF;
      END $inner$
    $$, t, t);
  END LOOP;
END $$;

-- ── 19. Updated_at triggers for new tables ────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DO $$ DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'bank_statements','facilities','goods_received_notes',
    'inventory_items','stock_movements'
  ]) LOOP
    BEGIN
      EXECUTE format($$
        DROP TRIGGER IF EXISTS trg_updated_at ON public.%I;
        CREATE TRIGGER trg_updated_at
          BEFORE UPDATE ON public.%I
          FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
      $$, t, t);
    EXCEPTION WHEN others THEN NULL;
    END;
  END LOOP;
END $$;
