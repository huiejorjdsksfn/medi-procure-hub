-- Company / new-deployment onboarding tracking
CREATE TABLE IF NOT EXISTS public.company_deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  facility_code text,
  contact_name text,
  contact_email text,
  contact_phone text,
  county text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','db_connected','importing','review','completed','failed')),
  current_step text NOT NULL DEFAULT 'company_info',
  facility_id uuid REFERENCES public.facilities(id) ON DELETE SET NULL,
  external_connection_id uuid,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.deployment_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id uuid NOT NULL REFERENCES public.company_deployments(id) ON DELETE CASCADE,
  source_label text NOT NULL,
  target_table text NOT NULL,
  method text NOT NULL DEFAULT 'csv' CHECK (method IN ('csv','xlsx','bridge')),
  column_mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_rows integer NOT NULL DEFAULT 0,
  imported_rows integer NOT NULL DEFAULT 0,
  failed_rows integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed','partial')),
  error_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.external_connections
  ADD COLUMN IF NOT EXISTS deployment_id uuid REFERENCES public.company_deployments(id) ON DELETE SET NULL;

ALTER TABLE public.company_deployments
  ADD CONSTRAINT company_deployments_external_connection_fk
  FOREIGN KEY (external_connection_id) REFERENCES public.external_connections(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_deployment_import_jobs_deployment ON public.deployment_import_jobs(deployment_id);
CREATE INDEX IF NOT EXISTS idx_company_deployments_status ON public.company_deployments(status);

ALTER TABLE public.company_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployment_import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage company_deployments" ON public.company_deployments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','superadmin','webmaster'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','superadmin','webmaster'))
  );

CREATE POLICY "admins manage deployment_import_jobs" ON public.deployment_import_jobs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','superadmin','webmaster'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','superadmin','webmaster'))
  );

NOTIFY pgrst, 'reload schema';
