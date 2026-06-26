-- EL5 MediProcure: Approval Queue table
-- Central inbox for documents pushed to approval from any page

CREATE TABLE IF NOT EXISTS approval_queue (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  document_type    text        NOT NULL,         -- 'requisition','purchase_order','grn','voucher','tender','contract'
  document_id      uuid        NOT NULL,
  document_number  text,
  document_title   text,
  department       text,
  amount           numeric     DEFAULT 0,
  pushed_by_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  pushed_by_name   text,
  pushed_at        timestamptz DEFAULT now(),
  priority         text        DEFAULT 'normal', -- 'urgent','high','normal','low'
  notes            text,
  queue_status     text        DEFAULT 'queued', -- 'queued','approved','rejected','withdrawn'
  resolved_by_name text,
  resolved_at      timestamptz,
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE approval_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_approval_queue" ON approval_queue;
CREATE POLICY "allow_all_approval_queue"
  ON approval_queue FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_approval_queue_status       ON approval_queue (queue_status);
CREATE INDEX IF NOT EXISTS idx_approval_queue_document_id  ON approval_queue (document_id);
CREATE INDEX IF NOT EXISTS idx_approval_queue_pushed_at    ON approval_queue (pushed_at DESC);
