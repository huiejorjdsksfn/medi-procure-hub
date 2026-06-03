-- ============================================================
-- FIX: documents.file_type schema cache miss
-- Forces column addition idempotently + refreshes schema cache
-- EL5 MediProcure v10.1 patch
-- ============================================================

-- Ensure documents table exists first (safe guard)
CREATE TABLE IF NOT EXISTS public.documents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL DEFAULT '',
  category    text DEFAULT 'general',
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Add ALL missing columns idempotently
DO $$ BEGIN
  BEGIN ALTER TABLE public.documents ADD COLUMN file_type        text;           EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.documents ADD COLUMN file_url         text;           EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.documents ADD COLUMN storage_path     text;           EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.documents ADD COLUMN file_size        bigint;         EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.documents ADD COLUMN original_filename text;          EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.documents ADD COLUMN uploaded_by      uuid;           EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.documents ADD COLUMN metadata         jsonb DEFAULT '{}'; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.documents ADD COLUMN source           text DEFAULT 'system'; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.documents ADD COLUMN parsed_content   text;           EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.documents ADD COLUMN import_status    text;           EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.documents ADD COLUMN mime_type        text;           EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.documents ADD COLUMN file_extension   text;           EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.documents ADD COLUMN type_category    text DEFAULT 'other'; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.documents ADD COLUMN is_parseable     boolean DEFAULT false; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.documents ADD COLUMN parse_error      text;           EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.documents ADD COLUMN indexed_text     text;           EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.documents ADD COLUMN checksum         text;           EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.documents ADD COLUMN version          int DEFAULT 1;  EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.documents ADD COLUMN tags             text[] DEFAULT '{}'; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.documents ADD COLUMN print_count      int DEFAULT 0;  EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.documents ADD COLUMN download_count   int DEFAULT 0;  EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.documents ADD COLUMN last_accessed_at timestamptz;    EXCEPTION WHEN duplicate_column THEN NULL; END;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_file_type     ON public.documents(file_type);
CREATE INDEX IF NOT EXISTS idx_documents_category      ON public.documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by   ON public.documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_import_status ON public.documents(import_status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at    ON public.documents(created_at DESC);

-- Ensure document_imports table has file_type too
CREATE TABLE IF NOT EXISTS public.document_imports (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   uuid REFERENCES public.documents(id) ON DELETE CASCADE,
  original_file text,
  file_type     text,
  file_size     bigint,
  storage_path  text,
  import_type   text DEFAULT 'digital',
  parsed_tables jsonb DEFAULT '[]',
  parsed_text   text,
  mapped_to     text,
  status        text DEFAULT 'pending',
  imported_by   uuid,
  completed_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  BEGIN ALTER TABLE public.document_imports ADD COLUMN file_type text; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.document_imports ADD COLUMN parsed_tables jsonb DEFAULT '[]'; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.document_imports ADD COLUMN parsed_text text; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.document_imports ADD COLUMN mapped_to text; EXCEPTION WHEN duplicate_column THEN NULL; END;
END $$;

-- RLS
ALTER TABLE public.documents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_imports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage documents" ON public.documents;
DROP POLICY IF EXISTS "Authenticated users can manage document_imports" ON public.document_imports;

CREATE POLICY "Authenticated users can manage documents"
  ON public.documents FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage document_imports"
  ON public.document_imports FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Grants
GRANT ALL ON public.documents        TO authenticated;
GRANT ALL ON public.documents        TO service_role;
GRANT ALL ON public.document_imports TO authenticated;
GRANT ALL ON public.document_imports TO service_role;

-- NOTIFY postgrest to reload schema cache
NOTIFY pgrst, 'reload schema';
