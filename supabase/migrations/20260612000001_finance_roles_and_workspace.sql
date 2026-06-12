-- ═══════════════════════════════════════════════════════════════════
-- EL5 MediProcure — Finance Roles, Workspace Tables & Default Users
-- ═══════════════════════════════════════════════════════════════════

-- 1. Add finance roles to app_role enum
DO $$
BEGIN
  BEGIN ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'finance_officer'; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'finance_manager'; EXCEPTION WHEN others THEN NULL; END;
END $$;

-- 2. receipt_vouchers table
CREATE TABLE IF NOT EXISTS public.receipt_vouchers (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_number   text,
  payer            text,
  amount           numeric(15,2) DEFAULT 0,
  payment_method   text DEFAULT 'cash',
  gl_account       text,
  description      text,
  reference_number text,
  status           text DEFAULT 'draft',
  approved_by      text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);
ALTER TABLE public.receipt_vouchers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Finance users can manage receipt_vouchers" ON public.receipt_vouchers;
CREATE POLICY "Finance users can manage receipt_vouchers" ON public.receipt_vouchers
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role::text IN ('admin','accountant','procurement_manager','finance_officer','finance_manager'))
  );
DO $$ BEGIN BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.receipt_vouchers; EXCEPTION WHEN others THEN NULL; END; END $$;

-- 3. fixed_assets table
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
ALTER TABLE public.fixed_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Finance users can manage fixed_assets" ON public.fixed_assets;
CREATE POLICY "Finance users can manage fixed_assets" ON public.fixed_assets
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role::text IN ('admin','accountant','procurement_manager','finance_officer','finance_manager'))
  );
DO $$ BEGIN BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.fixed_assets; EXCEPTION WHEN others THEN NULL; END; END $$;

-- 4. System settings for Finance module
INSERT INTO public.system_settings (key, value, category, label) VALUES
  ('finance_workspace_enabled','true',          'modules','Finance Workspace'),
  ('default_currency',         'KES',           'finance','Default Currency'),
  ('fiscal_year_start',        '01-01',         'finance','Fiscal Year Start'),
  ('budget_alert_threshold',   '80',            'finance','Budget Alert Threshold (%)'),
  ('vat_rate',                 '16',            'finance','VAT Rate (%)'),
  ('depreciation_method',      'straight_line', 'finance','Depreciation Method')
ON CONFLICT (key) DO NOTHING;

-- 5. Default finance users
-- NOTE: confirmed_at is a generated column in newer Supabase — omit it.
-- The handle_new_user trigger inserts a 'requisitioner' role which we DELETE after.
DO $$
DECLARE
  v_fo_id uuid := gen_random_uuid();
  v_fm_id uuid := gen_random_uuid();
  v_now   timestamptz := now();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'finance@el5hospital.ke') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at,
      recovery_token, recovery_sent_at, email_change_token_new, email_change,
      email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, is_sso_user, is_anonymous, phone, phone_confirmed_at,
      phone_change, phone_change_token, phone_change_sent_at,
      email_change_token_current, email_change_confirm_status,
      reauthentication_token, reauthentication_sent_at,
      banned_until, deleted_at, created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_fo_id,
      'authenticated','authenticated','finance@el5hospital.ke',
      crypt('Finance@EL5!2026', gen_salt('bf',10)),
      v_now, null,'',null,'',null,'','',null,null,
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('sub',v_fo_id::text,'email','finance@el5hospital.ke',
                         'full_name','Finance Officer','email_verified',true,'phone_verified',false),
      null,false,false,null,null,'','',null,'',0,'',null,null,null,v_now,v_now
    );
    INSERT INTO auth.identities (id,user_id,provider_id,provider,identity_data,last_sign_in_at,created_at,updated_at)
    VALUES (gen_random_uuid(),v_fo_id,v_fo_id::text,'email',
      jsonb_build_object('sub',v_fo_id::text,'email','finance@el5hospital.ke',
                         'full_name','Finance Officer','email_verified',false,'phone_verified',false),
      v_now,v_now,v_now);
    UPDATE public.profiles SET role='finance_officer',full_name='Finance Officer',is_active=true WHERE id=v_fo_id;
    DELETE FROM public.user_roles WHERE user_id=v_fo_id AND role='requisitioner';
    INSERT INTO public.user_roles (user_id,role,created_at)
    VALUES (v_fo_id,'finance_officer'::public.app_role,v_now) ON CONFLICT DO NOTHING;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'finmanager@el5hospital.ke') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at,
      recovery_token, recovery_sent_at, email_change_token_new, email_change,
      email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, is_sso_user, is_anonymous, phone, phone_confirmed_at,
      phone_change, phone_change_token, phone_change_sent_at,
      email_change_token_current, email_change_confirm_status,
      reauthentication_token, reauthentication_sent_at,
      banned_until, deleted_at, created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_fm_id,
      'authenticated','authenticated','finmanager@el5hospital.ke',
      crypt('FinManager@EL5!2026', gen_salt('bf',10)),
      v_now, null,'',null,'',null,'','',null,null,
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('sub',v_fm_id::text,'email','finmanager@el5hospital.ke',
                         'full_name','Finance Manager','email_verified',true,'phone_verified',false),
      null,false,false,null,null,'','',null,'',0,'',null,null,null,v_now,v_now
    );
    INSERT INTO auth.identities (id,user_id,provider_id,provider,identity_data,last_sign_in_at,created_at,updated_at)
    VALUES (gen_random_uuid(),v_fm_id,v_fm_id::text,'email',
      jsonb_build_object('sub',v_fm_id::text,'email','finmanager@el5hospital.ke',
                         'full_name','Finance Manager','email_verified',false,'phone_verified',false),
      v_now,v_now,v_now);
    UPDATE public.profiles SET role='finance_manager',full_name='Finance Manager',is_active=true WHERE id=v_fm_id;
    DELETE FROM public.user_roles WHERE user_id=v_fm_id AND role='requisitioner';
    INSERT INTO public.user_roles (user_id,role,created_at)
    VALUES (v_fm_id,'finance_manager'::public.app_role,v_now) ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- 6. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
