-- Enhance quotations for v20 enterprise mode
ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS received_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS payment_terms text,
  ADD COLUMN IF NOT EXISTS delivery_terms text,
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS rejected_reason text,
  ADD COLUMN IF NOT EXISTS evaluated_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS facility_id uuid;

CREATE INDEX IF NOT EXISTS idx_quotations_status ON public.quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_supplier ON public.quotations(supplier_id);
CREATE INDEX IF NOT EXISTS idx_quotations_created_at ON public.quotations(created_at DESC);

ALTER TABLE public.quotations REPLICA IDENTITY FULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='quotations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.quotations;
  END IF;
END $$;