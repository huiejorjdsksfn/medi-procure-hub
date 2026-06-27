-- Fix: add is_template and is_published columns to documents table
-- These are referenced in DocumentEditorPage.tsx but were missing from the schema

DO $$ BEGIN
  BEGIN ALTER TABLE public.documents ADD COLUMN is_template   boolean DEFAULT false; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.documents ADD COLUMN is_published  boolean DEFAULT false; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.documents ADD COLUMN published_at  timestamptz;           EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.documents ADD COLUMN description   text;                  EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.documents ADD COLUMN template_html text;                  EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.documents ADD COLUMN created_by    uuid;                  EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.documents ADD COLUMN updated_at    timestamptz;           EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.documents ADD COLUMN category      text;                  EXCEPTION WHEN duplicate_column THEN NULL; END;
END $$;

CREATE INDEX IF NOT EXISTS idx_documents_is_template  ON public.documents(is_template);
CREATE INDEX IF NOT EXISTS idx_documents_is_published ON public.documents(is_published);
