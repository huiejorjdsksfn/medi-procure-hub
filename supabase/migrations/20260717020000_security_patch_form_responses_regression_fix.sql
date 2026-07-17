-- SECURITY PATCH: 20260715120000_fix_forms_and_username_login.sql
-- reintroduced an unconditional WITH CHECK (true) INSERT policy
-- ("anon_submit_form_response") on form_responses, one day after this
-- exact issue was fixed (20260714061000). Its own comment argued the
-- client-side "only fetch active forms" UI gate is sufficient — it
-- isn't: a direct POST to the PostgREST API bypasses the UI entirely,
-- so RLS is the only real backstop here. Because Postgres OR's
-- multiple policies for the same command together, having both
-- policies present meant the permissive one silently overrode the
-- restrictive one.
--
-- Consolidating to a single canonically-named INSERT policy so a third
-- migration can't recreate "anon_submit_form_response" independently
-- and reintroduce this a third time.
DROP POLICY IF EXISTS "anon_submit_form_response" ON public.form_responses;
DROP POLICY IF EXISTS "Anyone can submit responses to published forms" ON public.form_responses;

CREATE POLICY "form_responses_insert_published_only"
  ON public.form_responses FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM google_forms
      WHERE google_forms.form_id = form_responses.form_id
        AND google_forms.is_active = true
    )
  );
