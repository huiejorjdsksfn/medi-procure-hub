-- ============================================================
-- Official Stamp tracking for Tracking & Approval Center
-- Adds stamped / stamped_by / stamped_at / stamp_label to the
-- three document types managed on that page, mirroring the
-- existing approved_by / approved_by_name / approved_at pattern.
-- ============================================================

DO $$ BEGIN
  BEGIN ALTER TABLE public.requisitions ADD COLUMN stamped boolean DEFAULT false;                          EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.requisitions ADD COLUMN stamped_by uuid REFERENCES auth.users(id);               EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.requisitions ADD COLUMN stamped_by_name text;                                     EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.requisitions ADD COLUMN stamped_at timestamptz;                                   EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.requisitions ADD COLUMN stamp_label text;                                         EXCEPTION WHEN duplicate_column THEN NULL; END;
END $$;

DO $$ BEGIN
  BEGIN ALTER TABLE public.purchase_orders ADD COLUMN stamped boolean DEFAULT false;                         EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.purchase_orders ADD COLUMN stamped_by uuid REFERENCES auth.users(id);             EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.purchase_orders ADD COLUMN stamped_by_name text;                                   EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.purchase_orders ADD COLUMN stamped_at timestamptz;                                 EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.purchase_orders ADD COLUMN stamp_label text;                                       EXCEPTION WHEN duplicate_column THEN NULL; END;
END $$;

DO $$ BEGIN
  BEGIN ALTER TABLE public.goods_received ADD COLUMN stamped boolean DEFAULT false;                          EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.goods_received ADD COLUMN stamped_by uuid REFERENCES auth.users(id);              EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.goods_received ADD COLUMN stamped_by_name text;                                    EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.goods_received ADD COLUMN stamped_at timestamptz;                                  EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.goods_received ADD COLUMN stamp_label text;                                        EXCEPTION WHEN duplicate_column THEN NULL; END;
END $$;

-- Helpful indexes for "needs stamping" queries (approved/received but not yet stamped)
CREATE INDEX IF NOT EXISTS idx_requisitions_stamped ON public.requisitions (stamped) WHERE stamped = false;
CREATE INDEX IF NOT EXISTS idx_purchase_orders_stamped ON public.purchase_orders (stamped) WHERE stamped = false;
CREATE INDEX IF NOT EXISTS idx_goods_received_stamped ON public.goods_received (stamped) WHERE stamped = false;

NOTIFY pgrst, 'reload schema';
