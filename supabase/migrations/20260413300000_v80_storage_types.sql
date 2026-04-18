-- ============================================================
-- EL5 MediProcure v8.0 — Comprehensive Storage & Types Fix
-- print_log · document_types · upload_formats · system_types
-- Embu Level 5 Hospital | Kenya
-- ============================================================
BEGIN;

-- ── 1. Ensure print_log has all columns ───────────────────────────────────
CREATE TABLE IF NOT EXISTS print_log (
  id          bigserial   PRIMARY KEY,
  page        text        NOT NULL,
  entity_type text,
  entity_id   text,
  printed_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE print_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_print_log" ON print_log;
CREATE POLICY "auth_print_log" ON print_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 2. Document types registry ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_types (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  type_key    text    UNIQUE NOT NULL,     -- 'excel','word','pdf','csv','image','json','xml','zip','pptx','text','video','audio','other'
  label       text    NOT NULL,
  mime_types  text[]  DEFAULT '{}',        -- accepted MIME types
  extensions  text[]  DEFAULT '{}',        -- e.g. {'.xlsx','.xls'}
  max_size_mb int     DEFAULT 50,
  parseable   boolean DEFAULT false,       -- can be parsed for data extraction
  icon_name   text,
  color       text    DEFAULT '#5a6475',
  is_enabled  boolean DEFAULT true,
  sort_order  int     DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE document_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_read_doc_types"   ON document_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_manage_doc_types" ON document_types FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
    AND ur.role IN ('superadmin','webmaster','admin','database_admin'))
);

-- Seed document types
INSERT INTO document_types (type_key,label,mime_types,extensions,max_size_mb,parseable,icon_name,color,sort_order)
VALUES
  ('excel',  'Excel Spreadsheet', ARRAY['application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.oasis.opendocument.spreadsheet'],
                                  ARRAY['.xlsx','.xls','.ods'],      50, true,  'FileSpreadsheet','#16a34a', 1),
  ('word',   'Word Document',     ARRAY['application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
                                  ARRAY['.docx','.doc'],             50, true,  'FileText',       '#1d4ed8', 2),
  ('pdf',    'PDF Document',      ARRAY['application/pdf'],
                                  ARRAY['.pdf'],                     100, true, 'File',           '#dc2626', 3),
  ('csv',    'CSV Data',          ARRAY['text/csv','text/plain'],
                                  ARRAY['.csv'],                     20, true,  'FileSpreadsheet','#059669', 4),
  ('pptx',   'Presentation',      ARRAY['application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation'],
                                  ARRAY['.pptx','.ppt'],             100, false,'Monitor',        '#f97316', 5),
  ('image',  'Image',             ARRAY['image/jpeg','image/png','image/webp','image/gif','image/svg+xml','image/bmp','image/tiff'],
                                  ARRAY['.jpg','.jpeg','.png','.webp','.gif','.svg','.bmp','.tif','.tiff'], 20, false,'Image','#7c3aed', 6),
  ('json',   'JSON Data',         ARRAY['application/json'],
                                  ARRAY['.json'],                    10, true,  'Code',           '#0891b2', 7),
  ('xml',    'XML Data',          ARRAY['application/xml','text/xml'],
                                  ARRAY['.xml'],                     10, true,  'Code',           '#0369a1', 8),
  ('text',   'Text File',         ARRAY['text/plain'],
                                  ARRAY['.txt','.log','.md'],        10, true,  'FileText',       '#6b7280', 9),
  ('zip',    'Archive',           ARRAY['application/zip','application/x-zip-compressed','application/x-tar','application/gzip'],
                                  ARRAY['.zip','.tar','.gz','.tar.gz','.rar'], 200, false,'Archive','#8b5cf6', 10),
  ('video',  'Video',             ARRAY['video/mp4','video/webm','video/ogg','video/mpeg'],
                                  ARRAY['.mp4','.webm','.ogv','.mpeg','.mov'], 500, false,'Video','#f43f5e', 11),
  ('audio',  'Audio',             ARRAY['audio/mpeg','audio/wav','audio/ogg','audio/mp4'],
                                  ARRAY['.mp3','.wav','.ogg','.m4a'], 100, false,'Music','#ec4899', 12),
  ('other',  'Other',             ARRAY[]::text[],
                                  ARRAY[]::text[],                   50, false, 'Paperclip',      '#9ca3af', 99)
ON CONFLICT (type_key) DO NOTHING;

-- ── 3. system_types: data types for admin awareness ───────────────────────
CREATE TABLE IF NOT EXISTS system_types (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  category    text    NOT NULL,   -- 'database','api','file','module','role','status'
  type_key    text    UNIQUE NOT NULL,
  label       text    NOT NULL,
  description text,
  metadata    jsonb   DEFAULT '{}',
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE system_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_read_system_types" ON system_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_manage_system_types" ON system_types FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
    AND ur.role IN ('superadmin','webmaster','admin'))
);

INSERT INTO system_types (category,type_key,label,description) VALUES
  ('database','pg_text',     'PostgreSQL Text',     'Variable-length character string'),
  ('database','pg_integer',  'PostgreSQL Integer',  '4-byte signed integer'),
  ('database','pg_bigint',   'PostgreSQL BigInt',   '8-byte signed integer'),
  ('database','pg_numeric',  'PostgreSQL Numeric',  'Exact numeric with scale/precision'),
  ('database','pg_boolean',  'PostgreSQL Boolean',  'true/false value'),
  ('database','pg_uuid',     'PostgreSQL UUID',     'Universally unique identifier'),
  ('database','pg_jsonb',    'PostgreSQL JSONB',    'Binary JSON — indexed'),
  ('database','pg_timestamptz','PostgreSQL Timestamp','Timestamp with timezone'),
  ('database','pg_text_arr', 'PostgreSQL Text[]',   'Array of text values'),
  ('role','admin',             'Administrator',       'Full system access'),
  ('role','superadmin',        'Super Administrator', 'Unrestricted root access'),
  ('role','webmaster',         'Webmaster',           'Code + system configuration'),
  ('role','database_admin',    'DB Administrator',    'Schema + query management'),
  ('role','procurement_manager','Procurement Manager','Approve POs, manage tenders'),
  ('role','procurement_officer','Procurement Officer','Create requisitions, receive goods'),
  ('role','accountant',        'Accountant',          'Financials, vouchers, GL'),
  ('role','inventory_manager', 'Inventory Manager',   'Items, categories, stock'),
  ('role','warehouse_officer', 'Warehouse Officer',   'Receive, issue, scan items'),
  ('role','requisitioner',     'Requisitioner',       'Create and track requisitions'),
  ('status','pending',   'Pending',   'Awaiting action'),
  ('status','submitted', 'Submitted', 'Submitted for approval'),
  ('status','approved',  'Approved',  'Approved by authority'),
  ('status','rejected',  'Rejected',  'Rejected — needs revision'),
  ('status','active',    'Active',    'Currently active record'),
  ('status','inactive',  'Inactive',  'Deactivated record'),
  ('status','draft',     'Draft',     'Work in progress'),
  ('status','complete',  'Complete',  'Fully processed'),
  ('module','requisitions',     'Requisitions',       'Purchase requisition workflow'),
  ('module','purchase_orders',  'Purchase Orders',    'LPO creation and approval'),
  ('module','inventory',        'Inventory',          'Stock and item management'),
  ('module','suppliers',        'Suppliers',          'Vendor registry'),
  ('module','tenders',          'Tenders',            'Bidding and tender management'),
  ('module','contracts',        'Contracts',          'Contract lifecycle management'),
  ('module','goods_received',   'Goods Received',     'GRN and delivery verification'),
  ('module','financials',       'Financials',         'Budgets, GL, fixed assets'),
  ('module','vouchers',         'Payment Vouchers',   'Payment processing'),
  ('module','documents',        'Documents',          'File management and imports'),
  ('module','reports',          'Reports',            'Analytics and reporting'),
  ('module','quality',          'Quality Control',    'Inspections and NCRs')
ON CONFLICT (type_key) DO NOTHING;

-- ── 4. Add extra columns to documents for richer type tracking ────────────
ALTER TABLE documents ADD COLUMN IF NOT EXISTS mime_type         text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_extension    text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS type_category     text DEFAULT 'other';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_parseable      boolean DEFAULT false;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS parse_error       text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS indexed_text      text;  -- full-text search
ALTER TABLE documents ADD COLUMN IF NOT EXISTS checksum          text;  -- SHA-256 for dedup
ALTER TABLE documents ADD COLUMN IF NOT EXISTS version           int    DEFAULT 1;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS tags              text[] DEFAULT '{}';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS print_count       int    DEFAULT 0;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS download_count    int    DEFAULT 0;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS last_accessed_at  timestamptz;

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_documents_indexed_text ON documents USING gin(to_tsvector('english', COALESCE(indexed_text,'')));
CREATE INDEX IF NOT EXISTS idx_documents_tags         ON documents USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_documents_type_cat     ON documents(type_category);

-- ── 5. Upload audit log ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS upload_audit (
  id            bigserial   PRIMARY KEY,
  user_id       uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  file_name     text        NOT NULL,
  file_type     text,
  file_size     bigint,
  storage_path  text,
  bucket        text        DEFAULT 'documents',
  status        text        DEFAULT 'success', -- success | failed | quarantined
  error_message text,
  ip_address    text,
  created_at    timestamptz DEFAULT now()
);
ALTER TABLE upload_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_read_upload_audit" ON upload_audit FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
    AND ur.role IN ('superadmin','webmaster','admin','database_admin'))
);
CREATE POLICY "user_insert_upload_audit" ON upload_audit FOR INSERT WITH CHECK (user_id = auth.uid());

-- ── 6. Realtime on new tables ─────────────────────────────────────────────
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE document_types;  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE system_types;    EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE upload_audit;    EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE print_log;       EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

COMMIT;
