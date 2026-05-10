
-- system_metrics: written by LiveDatabaseEngine ping
CREATE TABLE IF NOT EXISTS public.system_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL,
  metric_value numeric,
  metric_unit text,
  tags jsonb DEFAULT '{}'::jsonb,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_system_metrics_name_time ON public.system_metrics(metric_name, recorded_at DESC);

CREATE TABLE IF NOT EXISTS public.report_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  report_type text,
  cron text,
  recipients text[],
  format text DEFAULT 'pdf',
  enabled boolean DEFAULT true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.email_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direction text NOT NULL DEFAULT 'outbound',
  from_addr text,
  to_addr text,
  cc text,
  bcc text,
  subject text,
  body text,
  body_html text,
  status text DEFAULT 'pending',
  attachments jsonb DEFAULT '[]'::jsonb,
  module text,
  related_id uuid,
  error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_messages_status_time ON public.email_messages(status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.procurement_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid,
  item_id uuid,
  description text,
  quantity numeric DEFAULT 0,
  unit text,
  estimated_unit_price numeric DEFAULT 0,
  estimated_total numeric DEFAULT 0,
  funding_source text,
  quarter text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_plan_items_plan ON public.procurement_plan_items(plan_id);

CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  parent_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  description text,
  icon text,
  active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.scan_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_type text NOT NULL,
  target text,
  result text,
  severity text,
  details jsonb DEFAULT '{}'::jsonb,
  scanned_by uuid,
  scanned_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.supplier_scorecards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid,
  period text,
  delivery_score numeric DEFAULT 0,
  quality_score numeric DEFAULT 0,
  price_score numeric DEFAULT 0,
  service_score numeric DEFAULT 0,
  overall_score numeric DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_scorecards_supplier ON public.supplier_scorecards(supplier_id);

CREATE TABLE IF NOT EXISTS public.inspection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid,
  item_id uuid,
  description text,
  quantity_inspected numeric DEFAULT 0,
  quantity_accepted numeric DEFAULT 0,
  quantity_rejected numeric DEFAULT 0,
  defect_notes text,
  status text DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inspection_items_insp ON public.inspection_items(inspection_id);

CREATE TABLE IF NOT EXISTS public.reception_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_name text NOT NULL,
  visitor_phone text,
  visitor_email text,
  host_name text,
  host_id uuid,
  purpose text,
  scheduled_for timestamptz NOT NULL,
  duration_min int DEFAULT 30,
  status text DEFAULT 'scheduled',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reception_appt_time ON public.reception_appointments(scheduled_for);

-- Enable RLS + permissive authenticated policies (closed system, all logged-in users may interact)
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['system_metrics','report_schedules','email_messages','procurement_plan_items','categories','scan_log','supplier_scorecards','inspection_items','reception_appointments'])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_all_%s" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "auth_all_%s" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;

-- updated_at trigger reuse
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname='update_updated_at_column') THEN
    CREATE OR REPLACE FUNCTION public.update_updated_at_column()
    RETURNS TRIGGER AS $f$
    BEGIN NEW.updated_at = now(); RETURN NEW; END;
    $f$ LANGUAGE plpgsql SET search_path = public;
  END IF;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['report_schedules','procurement_plan_items','categories','supplier_scorecards','reception_appointments'])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_updated_at_%s ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_updated_at_%s BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t, t);
  END LOOP;
END $$;
