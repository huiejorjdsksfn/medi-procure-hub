-- EL5 MediProcure v12 — Internal Form Builder: public access for active forms
-- Allows unauthenticated respondents to view a published form and submit a response,
-- while keeping form management and response viewing restricted to authenticated staff.

-- Public (anon) can view ONLY active/published forms — needed for the public form-fill page
DROP POLICY IF EXISTS "Public can view active forms" ON google_forms;
CREATE POLICY "Public can view active forms"
  ON google_forms FOR SELECT
  TO anon
  USING (is_active = true);

-- Auto-increment response_count whenever a response is submitted, bypassing
-- google_forms' authenticated-only RLS via a SECURITY DEFINER trigger function.
CREATE OR REPLACE FUNCTION increment_form_response_count()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE google_forms
  SET response_count = COALESCE(response_count, 0) + 1
  WHERE form_id = NEW.form_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_increment_form_response_count ON form_responses;
CREATE TRIGGER trg_increment_form_response_count
  AFTER INSERT ON form_responses
  FOR EACH ROW
  EXECUTE FUNCTION increment_form_response_count();
