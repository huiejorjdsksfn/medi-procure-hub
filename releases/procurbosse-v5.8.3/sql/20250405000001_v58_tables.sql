-- ProcurBosse v5.8 Database Schema Update
-- Embu Level 5 Hospital · EL5 MediProcure

-- ── GL Entries ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gl_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gl_account VARCHAR(20),
  description TEXT,
  reference VARCHAR(100),
  debit NUMERIC(15,2) DEFAULT 0,
  credit NUMERIC(15,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'posted',
  voucher_id UUID,
  erp_sync_id UUID,
  posted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── ERP Sync Queue ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.erp_sync_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_type VARCHAR(50),
  entity_type VARCHAR(50),
  direction VARCHAR(10) DEFAULT 'push',
  status VARCHAR(20) DEFAULT 'pending',
  is_manual BOOLEAN DEFAULT FALSE,
  gl_verified BOOLEAN DEFAULT FALSE,
  payload JSONB DEFAULT '{}',
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  processed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Invoice Matching ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invoice_matching (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  po_number VARCHAR(50),
  grn_number VARCHAR(50),
  invoice_number VARCHAR(50),
  supplier VARCHAR(200),
  amount NUMERIC(15,2) DEFAULT 0,
  matched_amount NUMERIC(15,2),
  variance NUMERIC(15,2),
  status VARCHAR(20) DEFAULT 'pending',
  gl_verified BOOLEAN DEFAULT FALSE,
  matched_by UUID REFERENCES auth.users(id),
  matched_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Budget Alerts ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.budget_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type VARCHAR(100),
  budget_code VARCHAR(50),
  consumed_pct NUMERIC(5,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'warning',
  override_approved BOOLEAN DEFAULT FALSE,
  override_approved_by UUID REFERENCES auth.users(id),
  override_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Quotations ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.quotations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_number VARCHAR(50) UNIQUE NOT NULL,
  supplier_id UUID,
  supplier_name VARCHAR(200),
  status VARCHAR(20) DEFAULT 'draft',
  total_amount NUMERIC(15,2) DEFAULT 0,
  valid_until DATE,
  notes TEXT,
  terms TEXT,
  created_by UUID REFERENCES auth.users(id),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Payment Vouchers (ensure all columns exist) ───────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='payment_vouchers' AND table_schema='public') THEN
    CREATE TABLE public.payment_vouchers (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      voucher_number VARCHAR(50) UNIQUE,
      payee VARCHAR(200),
      payee_account VARCHAR(50),
      bank_name VARCHAR(200),
      total_amount NUMERIC(15,2) DEFAULT 0,
      status VARCHAR(20) DEFAULT 'draft',
      payment_method VARCHAR(50) DEFAULT 'bank_transfer',
      due_date DATE,
      description TEXT,
      po_reference VARCHAR(50),
      invoice_reference VARCHAR(50),
      gl_account VARCHAR(20),
      vote_head VARCHAR(20),
      currency VARCHAR(10) DEFAULT 'KES',
      approved_by UUID REFERENCES auth.users(id),
      approved_at TIMESTAMPTZ,
      paid_at TIMESTAMPTZ,
      created_by UUID REFERENCES auth.users(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  ELSE
    -- Add missing columns
    ALTER TABLE public.payment_vouchers ADD COLUMN IF NOT EXISTS payee_account VARCHAR(50);
    ALTER TABLE public.payment_vouchers ADD COLUMN IF NOT EXISTS bank_name VARCHAR(200);
    ALTER TABLE public.payment_vouchers ADD COLUMN IF NOT EXISTS po_reference VARCHAR(50);
    ALTER TABLE public.payment_vouchers ADD COLUMN IF NOT EXISTS invoice_reference VARCHAR(50);
    ALTER TABLE public.payment_vouchers ADD COLUMN IF NOT EXISTS gl_account VARCHAR(20);
    ALTER TABLE public.payment_vouchers ADD COLUMN IF NOT EXISTS vote_head VARCHAR(20);
    ALTER TABLE public.payment_vouchers ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'KES';
    ALTER TABLE public.payment_vouchers ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
    ALTER TABLE public.payment_vouchers ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
    ALTER TABLE public.payment_vouchers ADD COLUMN IF NOT EXISTS approved_by UUID;
  END IF;
END $$;

-- ── System Settings (ensure exists) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default SMTP settings for Supabase/Resend
INSERT INTO public.system_settings (key, value, description) VALUES
  ('smtp_enabled', 'true', 'Enable SMTP email delivery'),
  ('smtp_host', 'smtp.resend.com', 'SMTP host'),
  ('smtp_port', '465', 'SMTP port'),
  ('smtp_tls', 'true', 'Use TLS'),
  ('smtp_from_name', 'EL5 MediProcure', 'From name'),
  ('smtp_from_email', 'noreply@embu.go.ke', 'From email'),
  ('email_notifications_enabled', 'true', 'Enable email notifications'),
  ('system_name', 'EL5 MediProcure', 'System name'),
  ('system_version', 'v5.8', 'System version'),
  ('hospital_name', 'Embu Level 5 Hospital', 'Hospital name'),
  ('admin_email', 'samwise@gmail.com', 'Primary admin email')
ON CONFLICT (key) DO NOTHING;

-- ── RLS Policies ──────────────────────────────────────────────────────────────
ALTER TABLE public.gl_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_matching ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read/write (role-based filtering done in app)
CREATE POLICY IF NOT EXISTS "auth_all_gl_entries" ON public.gl_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "auth_all_erp_sync" ON public.erp_sync_queue FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "auth_all_invoice_matching" ON public.invoice_matching FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "auth_all_budget_alerts" ON public.budget_alerts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "auth_all_quotations" ON public.quotations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "auth_all_payment_vouchers" ON public.payment_vouchers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "auth_read_settings" ON public.system_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "admin_write_settings" ON public.system_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Profiles: ensure role column exists ──────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='profiles' AND table_schema='public') THEN
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'requisitioner';
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department VARCHAR(100);
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);
    -- Ensure admin account
    UPDATE public.profiles SET role = 'admin', is_active = TRUE
    WHERE email = 'samwise@gmail.com';
  END IF;
END $$;

-- ── Notifications (ensure all columns exist) ──────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='notifications' AND table_schema='public') THEN
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'system';
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal';
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS action_url TEXT;
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS action_label VARCHAR(100);
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS icon VARCHAR(10);
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS metadata JSONB;
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS dismissed_at TIMESTAMPTZ;
  END IF;
END $$;

-- ── Indexes for performance ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_payment_vouchers_status ON public.payment_vouchers(status);
CREATE INDEX IF NOT EXISTS idx_payment_vouchers_created ON public.payment_vouchers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_erp_sync_status ON public.erp_sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_invoice_matching_status ON public.invoice_matching(status);
CREATE INDEX IF NOT EXISTS idx_budget_alerts_approved ON public.budget_alerts(override_approved);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(is_read) WHERE dismissed_at IS NULL;

COMMENT ON TABLE public.payment_vouchers IS 'ProcurBosse v5.8 - Payment Vouchers for EL5 Hospital procurement finance';
COMMENT ON TABLE public.erp_sync_queue IS 'ProcurBosse v5.8 - ERP synchronization queue for Dynamics 365';
COMMENT ON TABLE public.invoice_matching IS 'ProcurBosse v5.8 - Three-way invoice matching (PO + GRN + Invoice)';
