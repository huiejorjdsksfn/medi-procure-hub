
-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage user roles" ON public.user_roles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Assign admin role to existing admin user if exists
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'samwise@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
