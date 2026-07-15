-- RLS-grant validator finding: "Anyone can submit form responses" had
-- with_check = true, so an anonymous submitter could insert a
-- form_responses row against ANY form_id — including a draft/unpublished
-- or entirely made-up one — completely bypassing the "published" concept
-- that google_forms.is_active is supposed to enforce. Tighten the grant
-- so a public submission is only accepted when it matches a form that is
-- actually published.
DROP POLICY IF EXISTS "Anyone can submit form responses" ON form_responses;
CREATE POLICY "Anyone can submit responses to published forms" ON form_responses
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM google_forms
    WHERE google_forms.form_id = form_responses.form_id
      AND google_forms.is_active = true
  )
);
