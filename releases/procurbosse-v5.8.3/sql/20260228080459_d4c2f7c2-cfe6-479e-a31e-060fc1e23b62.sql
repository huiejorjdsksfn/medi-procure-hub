
-- Create audit_log table
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name text,
  action text NOT NULL,
  module text NOT NULL,
  record_id text,
  details jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE INDEX idx_audit_log_module ON public.audit_log(module);
CREATE INDEX idx_audit_log_created ON public.audit_log(created_at DESC);
CREATE INDEX idx_audit_log_user ON public.audit_log(user_id);

-- Add RLS policies for procurement_officer and procurement_manager to create POs
CREATE POLICY "Procurement officers can create POs" ON public.purchase_orders
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'procurement_officer') OR 
    public.has_role(auth.uid(), 'procurement_manager')
  );

-- Allow warehouse officers to update GRNs
CREATE POLICY "Warehouse officers can update GRNs" ON public.goods_received
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'warehouse_officer')
  );

-- Allow procurement roles to manage suppliers
CREATE POLICY "Procurement roles can manage suppliers" ON public.suppliers
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'procurement_officer') OR 
    public.has_role(auth.uid(), 'procurement_manager')
  );
