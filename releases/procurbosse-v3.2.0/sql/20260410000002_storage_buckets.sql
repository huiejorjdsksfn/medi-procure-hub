-- ══════════════════════════════════════════════════════════════════════════
-- EL5 MediProcure v5.9 — Storage Buckets & Policies
-- Creates all Supabase Storage buckets for file uploads
-- ══════════════════════════════════════════════════════════════════════════

-- Documents bucket (Word, Excel, PDF, CSV, images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents', 'documents', false, 52428800,  -- 50MB
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'text/plain',
    'image/jpeg','image/png','image/webp','image/gif',
    'application/zip'
  ]
) ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Avatars bucket (profile photos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 'avatars', true, 5242880,  -- 5MB
  ARRAY['image/jpeg','image/png','image/webp']
) ON CONFLICT (id) DO UPDATE SET file_size_limit = EXCLUDED.file_size_limit;

-- Uploads bucket (general uploads)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'uploads', 'uploads', false, 52428800,
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv','text/plain',
    'image/jpeg','image/png','image/webp','image/gif'
  ]
) ON CONFLICT (id) DO UPDATE SET file_size_limit = EXCLUDED.file_size_limit;

-- Suppliers logos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('suppliers', 'suppliers', true, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Items images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('items', 'items', true, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- ── RLS Policies ──────────────────────────────────────────────────────────────

-- Documents: authenticated users can read/write
CREATE POLICY "auth_read_documents" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents');
CREATE POLICY "auth_insert_documents" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents');
CREATE POLICY "auth_update_documents" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'documents');
CREATE POLICY "auth_delete_documents" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents');

-- Avatars: public read, auth write own
CREATE POLICY "public_read_avatars" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');
CREATE POLICY "auth_insert_avatars" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "auth_update_avatars" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars');

-- Uploads
CREATE POLICY "auth_all_uploads" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'uploads') WITH CHECK (bucket_id = 'uploads');

-- Suppliers (public read, auth write)
CREATE POLICY "public_read_suppliers_img" ON storage.objects FOR SELECT TO public USING (bucket_id = 'suppliers');
CREATE POLICY "auth_write_suppliers_img"  ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'suppliers');

-- Items (public read, auth write)
CREATE POLICY "public_read_items_img" ON storage.objects FOR SELECT TO public USING (bucket_id = 'items');
CREATE POLICY "auth_write_items_img"  ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'items');

-- ── Extend documents table for file storage ───────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='storage_path') THEN
    ALTER TABLE documents ADD COLUMN storage_path text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='file_url') THEN
    ALTER TABLE documents ADD COLUMN file_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='file_type') THEN
    ALTER TABLE documents ADD COLUMN file_type text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='file_size') THEN
    ALTER TABLE documents ADD COLUMN file_size bigint;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='original_filename') THEN
    ALTER TABLE documents ADD COLUMN original_filename text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='parsed_content') THEN
    ALTER TABLE documents ADD COLUMN parsed_content text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='metadata') THEN
    ALTER TABLE documents ADD COLUMN metadata jsonb DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='uploaded_by') THEN
    ALTER TABLE documents ADD COLUMN uploaded_by uuid REFERENCES profiles(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='source') THEN
    ALTER TABLE documents ADD COLUMN source text DEFAULT 'system'; -- system | upload | import
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='import_status') THEN
    ALTER TABLE documents ADD COLUMN import_status text; -- pending | processing | imported | failed
  END IF;
END $$;

-- Index for fast file search
CREATE INDEX IF NOT EXISTS idx_documents_file_type ON documents(file_type);
CREATE INDEX IF NOT EXISTS idx_documents_source ON documents(source);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);

-- ── Hardcopy imports tracking table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_imports (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id     uuid REFERENCES documents(id) ON DELETE CASCADE,
  original_file   text NOT NULL,
  file_type       text NOT NULL,   -- pdf | docx | xlsx | csv | image
  file_size       bigint,
  storage_path    text,
  import_type     text DEFAULT 'hardcopy', -- hardcopy | digital | scan
  parsed_tables   jsonb DEFAULT '[]',      -- extracted table data
  parsed_text     text,                    -- extracted plain text
  mapped_to       text,                    -- target module: requisitions | items | suppliers etc.
  mapped_records  jsonb DEFAULT '[]',      -- IDs of records created from this import
  status          text DEFAULT 'pending',  -- pending | processing | complete | failed
  error_message   text,
  imported_by     uuid REFERENCES profiles(id),
  created_at      timestamptz DEFAULT now(),
  completed_at    timestamptz
);
ALTER TABLE document_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_imports" ON document_imports FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_imports" ON document_imports FOR ALL TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_doc_imports_status ON document_imports(status);
CREATE INDEX IF NOT EXISTS idx_doc_imports_mapped ON document_imports(mapped_to);
