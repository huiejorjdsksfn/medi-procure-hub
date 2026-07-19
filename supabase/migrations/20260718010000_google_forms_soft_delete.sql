-- Form builder had hard-delete only ("This cannot be undone") with no
-- way to recover an accidentally deleted form. Add soft-delete support.
ALTER TABLE google_forms ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_google_forms_deleted_at ON google_forms(deleted_at);
