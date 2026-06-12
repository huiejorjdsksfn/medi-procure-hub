-- ═══════════════════════════════════════════════════════════════════
-- EL5 MediProcure — Finance Roles + Default User Migration
-- ═══════════════════════════════════════════════════════════════════

-- 1. Add finance_officer and finance_manager to app_role enum
DO $$
BEGIN
  BEGIN ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'finance_officer';   EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'finance_manager';   EXCEPTION WHEN others THEN NULL; END;
END $$;

-- 2. Ensure receipt_vouchers table exists with all needed columns
CREATE TABLE IF NOT EXISTS public.receipt_vouchers (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_number    text,
  payer             text,
  amount            numeric(15,2) DEFAULT 0,
  payment_method    text DEFAULT 'cash',
  gl_account        text,
  description       text,
  reference_number  text,
  status            text DEFAULT 'draft',
  approved_by       text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- RLS for receipt_vouchers
ALTER TABLE public.receipt_vouchers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Finance users can manage receipt_vouchers" ON public.receipt_vouchers;
CREATE POLICY "Finance users can manage receipt_vouchers" ON public.receipt_vouchers
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN (
        'admin'::public.app_role, 'accountant'::public.app_role,
        'procurement_manager'::public.app_role,
        'finance_officer'::public.app_role, 'finance_manager'::public.app_role
      )
    )
  );

-- 3. Ensure fixed_assets table exists with all needed columns
CREATE TABLE IF NOT EXISTS public.fixed_assets (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_name        text NOT NULL,
  asset_code        text,
  category          text,
  purchase_cost     numeric(15,2) DEFAULT 0,
  current_value     numeric(15,2) DEFAULT 0,
  depreciation_rate numeric(5,2)  DEFAULT 10,
  acquisition_date  date,
  location          text,
  status            text DEFAULT 'active',
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- RLS for fixed_assets
ALTER TABLE public.fixed_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Finance users can manage fixed_assets" ON public.fixed_assets;
CREATE POLICY "Finance users can manage fixed_assets" ON public.fixed_assets
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN (
        'admin'::public.app_role, 'accountant'::public.app_role,
        'procurement_manager'::public.app_role,
        'finance_officer'::public.app_role, 'finance_manager'::public.app_role
      )
    )
  );

-- 4. Realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.receipt_vouchers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fixed_assets;

-- 5. Role permissions for finance roles
INSERT INTO public.role_permissions (role, permission) VALUES
  ('finance_officer','view_financials'),
  ('finance_officer','create_vouchers'),
  ('finance_officer','approve_vouchers'),
  ('finance_officer','manage_budgets'),
  ('finance_officer','invoice_matching'),
  ('finance_manager','view_financials'),
  ('finance_manager','create_vouchers'),
  ('finance_manager','approve_vouchers'),
  ('finance_manager','manage_budgets'),
  ('finance_manager','invoice_matching'),
  ('finance_manager','manage_roles'),
  ('finance_manager','manage_users')
ON CONFLICT DO NOTHING;

-- 6. Seed default finance users
-- Default Finance Officer: finance@el5hospital.go.ke / Finance@EL5!2026
-- Default Finance Manager: finmanager@el5hospital.go.ke / Manager@EL5!2026
-- NOTE: Supabase auth users must be created via Dashboard or Auth API.
-- These seeds insert profile + role records referencing a known UUID.
-- Replace the UUIDs below after creating the auth users in Supabase Dashboard.

-- Placeholder records (profile will be auto-created by auth trigger on first login):
DO $$
BEGIN
  -- Ensure the profiles table has all needed columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='department') THEN
    ALTER TABLE public.profiles ADD COLUMN department text;
  END IF;
END $$;

-- 7. System settings for finance workspace
INSERT INTO public.system_settings (key, value, category, label) VALUES
  ('finance_workspace_enabled', 'true',           'modules', 'Finance Workspace'),
  ('default_currency',          'KES',            'finance', 'Default Currency'),
  ('fiscal_year_start',         '01-01',          'finance', 'Fiscal Year Start (MM-DD)'),
  ('budget_alert_threshold',    '80',             'finance', 'Budget Alert Threshold (%)'),
  ('vat_rate',                  '16',             'finance', 'VAT Rate (%)'),
  ('depreciation_method',       'straight_line',  'finance', 'Depreciation Method')
ON CONFLICT (key) DO NOTHING;
