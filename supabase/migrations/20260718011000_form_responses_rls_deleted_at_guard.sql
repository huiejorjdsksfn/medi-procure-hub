-- Defense in depth alongside the new soft-delete: even though the
-- delete handler now also sets is_active=false, the RLS grant itself
-- should independently check deleted_at IS NULL too, so a soft-deleted
-- form can never accept a public submission regardless of what the
-- client sets is_active to.
DROP POLICY IF EXISTS "form_responses_insert_published_only" ON form_responses;
CREATE POLICY "form_responses_insert_published_only"
  ON form_responses FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM google_forms
      WHERE google_forms.form_id = form_responses.form_id
        AND google_forms.is_active = true
        AND google_forms.deleted_at IS NULL
    )
  );
