-- ============================================================
--  EL5 MediProcure — Forms Builder fix + Username Login
--  Timestamp : 20260715120000
--  Purpose   :
--   1) google_forms is missing columns the frontend has been
--      reading/writing since the Forms Builder shipped
--      (description, field_definitions, is_active, response_count,
--      sender_email, method) — every Save/Create/Publish has been
--      failing with a PostgREST "column not found in schema cache"
--      error since day one.
--   2) google_forms has NO write policy for authenticated users —
--      only the SELECT policies from the two prior form migrations
--      exist, so even with the columns fixed every insert/update
--      would be rejected by RLS.
--   3) form_responses is referenced by PublicFormPage.tsx and by
--      the increment_form_response_count trigger, but no migration
--      ever created it — it either exists only as an untracked
--      manual table (same pattern already flagged in this repo's
--      history) or public form submissions have been silently
--      failing. Recreated here with IF NOT EXISTS, safe either way.
--   4) profiles.username exists in the live schema already but has
--      no uniqueness guarantee and no anon-callable lookup, which
--      is required to let the login page resolve username -> email
--      before calling signInWithPassword.
--  All statements are guarded so this is safe to re-run.
-- ============================================================

-- ── 1. google_forms — add missing columns ──────────────────────
ALTER TABLE public.google_forms
  ADD COLUMN IF NOT EXISTS description       text,
  ADD COLUMN IF NOT EXISTS field_definitions jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_active         boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS response_count    integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sender_email      text,
  ADD COLUMN IF NOT EXISTS method            text DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS updated_at        timestamptz DEFAULT now();

-- Backfill is_active from the existing status column so forms that
-- were already marked 'published' under the old (broken) write path
-- don't disappear from the public form page.
UPDATE public.google_forms
SET is_active = (status = 'published')
WHERE is_active IS NULL OR is_active = false;

DROP TRIGGER IF EXISTS trg_google_forms_updated_at ON public.google_forms;
CREATE TRIGGER trg_google_forms_updated_at
  BEFORE UPDATE ON public.google_forms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 2. google_forms — write policies for authenticated staff ──
-- (SELECT policies for authenticated + anon already exist from
--  20260628200001 / 20260629100000 — only insert/update/delete
--  were ever missing.)
DROP POLICY IF EXISTS "authenticated_write_google_forms" ON public.google_forms;
CREATE POLICY "authenticated_write_google_forms"
  ON public.google_forms FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_google_forms" ON public.google_forms;
CREATE POLICY "authenticated_update_google_forms"
  ON public.google_forms FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_google_forms" ON public.google_forms;
CREATE POLICY "authenticated_delete_google_forms"
  ON public.google_forms FOR DELETE
  TO authenticated
  USING (true);

-- ── 3. form_responses — recreate defensively ───────────────────
CREATE TABLE IF NOT EXISTS public.form_responses (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id           text        NOT NULL,
  respondent_email  text,
  responses         jsonb       DEFAULT '{}'::jsonb,
  metadata          jsonb       DEFAULT '{}'::jsonb,
  submitted_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_form_responses_form_id ON public.form_responses(form_id);

ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;

-- Public (anon) can submit responses to any form — the form's own
-- is_active gate on google_forms already controls whether a
-- respondent can even load the form to see this insert happen.
DROP POLICY IF EXISTS "anon_submit_form_response" ON public.form_responses;
CREATE POLICY "anon_submit_form_response"
  ON public.form_responses FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only authenticated staff can read submitted responses.
DROP POLICY IF EXISTS "authenticated_read_form_responses" ON public.form_responses;
CREATE POLICY "authenticated_read_form_responses"
  ON public.form_responses FOR SELECT
  TO authenticated
  USING (true);

-- Re-point the response-count trigger at the (now guaranteed to
-- exist) table — safe no-op if it's already correct.
DROP TRIGGER IF EXISTS trg_increment_form_response_count ON public.form_responses;
CREATE TRIGGER trg_increment_form_response_count
  AFTER INSERT ON public.form_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_form_response_count();

-- ── 4. facilities — allow authenticated staff to edit branding ─
DROP POLICY IF EXISTS "authenticated_update_facilities" ON public.facilities;
CREATE POLICY "authenticated_update_facilities"
  ON public.facilities FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

-- ── 5. profiles.username — uniqueness + backfill ───────────────
-- Backfill any missing usernames from the local part of their email
-- so every existing user has a working username before this ships.
UPDATE public.profiles
SET username = lower(split_part(email, '@', 1))
WHERE (username IS NULL OR username = '') AND email IS NOT NULL;

-- De-duplicate any backfilled collisions by suffixing the row id
-- fragment (rare, but two different email domains can share a
-- local-part, e.g. j.mwangi@embu.go.ke and j.mwangi@gmail.com).
WITH dupes AS (
  SELECT id, username,
         row_number() OVER (PARTITION BY lower(username) ORDER BY created_at) AS rn
  FROM public.profiles
  WHERE username IS NOT NULL
)
UPDATE public.profiles p
SET username = p.username || '-' || substr(p.id::text, 1, 4)
FROM dupes d
WHERE p.id = d.id AND d.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_unique
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL;

-- ── 6. username -> email lookup, callable pre-auth ─────────────
-- SECURITY DEFINER so an unauthenticated login page can resolve a
-- username to the email supabase-js needs for signInWithPassword,
-- without granting anon any broader read access to profiles.
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT email FROM public.profiles
  WHERE lower(username) = lower(p_username) AND is_active IS DISTINCT FROM false
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_email_by_username(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_email_by_username(text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
