-- Quality module CAPA upgrade: non_conformances already had root_cause /
-- corrective_action / preventive_action columns sitting unused (no UI ever
-- wrote to them). Adding the missing effectiveness-verification step so a
-- CAPA can actually be closed out properly, not just marked "resolved".
ALTER TABLE public.non_conformances
  ADD COLUMN IF NOT EXISTS effectiveness_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_date date,
  ADD COLUMN IF NOT EXISTS verification_notes text,
  ADD COLUMN IF NOT EXISTS verified_by_name text;

NOTIFY pgrst, 'reload schema';
