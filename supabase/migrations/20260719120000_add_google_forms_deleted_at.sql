-- Add missing google_forms.deleted_at column.
-- The Forms Builder's soft-delete/restore feature (fbDeleteForm /
-- fbRestoreForm in AdminPanelPage.tsx) writes to this column, but it was
-- never added to the schema — every delete/restore was failing with the
-- same PostgREST "column not found in schema cache" error as the earlier
-- goods_received.inspection_done and google_forms write-policy bugs this
-- session already fixed. Caught by scripts/check-schema-drift.mjs.
ALTER TABLE public.google_forms ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_google_forms_deleted_at ON public.google_forms(deleted_at) WHERE deleted_at IS NOT NULL;
NOTIFY pgrst, 'reload schema';
