
-- Create contracts table for vendor agreements
CREATE TABLE IF NOT EXISTS public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number text NOT NULL,
  supplier_id uuid REFERENCES public.suppliers(id),
  title text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_value numeric DEFAULT 0,
  status text DEFAULT 'active',
  payment_terms text,
  delivery_terms text,
  performance_score integer DEFAULT 0,
  milestones jsonb DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view contracts" ON public.contracts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Procurement roles can manage contracts" ON public.contracts
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'procurement_officer') OR 
    public.has_role(auth.uid(), 'procurement_manager')
  );

-- Allow procurement managers to update requisitions (approve/reject)
DO $$ BEGIN
  CREATE POLICY "Procurement managers can update requisitions" ON public.requisitions
    FOR UPDATE TO authenticated USING (
      public.has_role(auth.uid(), 'procurement_manager')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Allow procurement officers to update POs
DO $$ BEGIN
  CREATE POLICY "Procurement officers can update POs" ON public.purchase_orders
    FOR UPDATE TO authenticated USING (
      public.has_role(auth.uid(), 'procurement_officer') OR public.has_role(auth.uid(), 'procurement_manager')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add is_active column to profiles for admin user management
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Allow admins to update any profile
DO $$ BEGIN
  CREATE POLICY "Admins can update all profiles" ON public.profiles
    FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
