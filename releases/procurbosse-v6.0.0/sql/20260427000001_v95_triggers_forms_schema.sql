-- ============================================================
-- EL5 MediProcure v9.5 — Triggers, Form Data & Full Schema
-- Auto-numbers, audit trail, workflow, notifications
-- Embu Level 5 Hospital | Kenya
-- ============================================================
BEGIN;

-- ============================================================
-- 1. UTILITY: Auto-number sequence generator
-- ============================================================
CREATE OR REPLACE FUNCTION el5_next_number(prefix text, seq_table text, year_prefix boolean DEFAULT true)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  yr   text := CASE WHEN year_prefix THEN to_char(now(),'YYYY') ELSE '' END;
  seq  int;
  key  text := prefix || '/' || yr;
BEGIN
  INSERT INTO el5_sequences(seq_key, last_val) VALUES(key, 1)
  ON CONFLICT(seq_key) DO UPDATE SET last_val = el5_sequences.last_val + 1;
  SELECT last_val INTO seq FROM el5_sequences WHERE seq_key = key;
  RETURN prefix || '/' || yr || '/' || lpad(seq::text, 4, '0');
END;
$$;

-- Sequence table
CREATE TABLE IF NOT EXISTS el5_sequences (
  seq_key  text PRIMARY KEY,
  last_val int  NOT NULL DEFAULT 0
);

-- ============================================================
-- 2. UNIVERSAL AUDIT TRIGGER
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name  text NOT NULL,
  record_id   uuid,
  action      text NOT NULL, -- INSERT | UPDATE | DELETE
  old_data    jsonb,
  new_data    jsonb,
  changed_by  uuid REFERENCES auth.users(id),
  changed_at  timestamptz DEFAULT now(),
  ip_address  text,
  user_agent  text
);

CREATE INDEX IF NOT EXISTS idx_audit_table_record ON audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_changed_at   ON audit_log(changed_at DESC);
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "auth_audit_log" ON audit_log FOR ALL TO authenticated USING(true) WITH CHECK(true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE audit_log; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION audit_trigger_fn()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  rid uuid;
BEGIN
  BEGIN rid := (CASE WHEN TG_OP='DELETE' THEN OLD.id ELSE NEW.id END)::uuid; EXCEPTION WHEN OTHERS THEN rid := NULL; END;
  INSERT INTO audit_log(table_name, record_id, action, old_data, new_data, changed_by)
  VALUES(
    TG_TABLE_NAME, rid, TG_OP,
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN row_to_json(OLD)::jsonb ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN row_to_json(NEW)::jsonb ELSE NULL END,
    auth.uid()
  );
  RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
EXCEPTION WHEN OTHERS THEN
  RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END;
$$;

-- Apply audit trigger to all key tables
DO $$ 
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'requisitions','purchase_orders','goods_received','suppliers','items',
    'tenders','contracts','payment_vouchers','receipt_vouchers','journal_vouchers',
    'purchase_vouchers','sales_vouchers','budgets','fixed_assets','non_conformances','tenders'
  ])
  LOOP
    BEGIN
      EXECUTE format('DROP TRIGGER IF EXISTS audit_%I ON %I', t, t);
      EXECUTE format('CREATE TRIGGER audit_%I AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn()', t, t);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END $$;

-- ============================================================
-- 3. AUTO-NUMBER TRIGGERS
-- ============================================================

-- Requisitions auto-number
CREATE OR REPLACE FUNCTION auto_number_requisition()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.requisition_number IS NULL OR NEW.requisition_number = '' THEN
    NEW.requisition_number := el5_next_number('RQN','el5_sequences',true);
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_auto_req_number ON requisitions;
CREATE TRIGGER trg_auto_req_number BEFORE INSERT ON requisitions FOR EACH ROW EXECUTE FUNCTION auto_number_requisition();

-- Purchase Orders auto-number
CREATE OR REPLACE FUNCTION auto_number_po()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.po_number IS NULL OR NEW.po_number = '' THEN
    NEW.po_number := el5_next_number('LPO','el5_sequences',true);
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_auto_po_number ON purchase_orders;
CREATE TRIGGER trg_auto_po_number BEFORE INSERT ON purchase_orders FOR EACH ROW EXECUTE FUNCTION auto_number_po();

-- GRN auto-number
CREATE OR REPLACE FUNCTION auto_number_grn()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.grn_number IS NULL OR NEW.grn_number = '' THEN
    NEW.grn_number := el5_next_number('GRN','el5_sequences',true);
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_auto_grn_number ON goods_received;
CREATE TRIGGER trg_auto_grn_number BEFORE INSERT ON goods_received FOR EACH ROW EXECUTE FUNCTION auto_number_grn();

-- Tender auto-number
CREATE OR REPLACE FUNCTION auto_number_tender()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tender_number IS NULL OR NEW.tender_number = '' THEN
    NEW.tender_number := el5_next_number('TDR','el5_sequences',true);
  END IF;
  IF NEW.reference_number IS NULL OR NEW.reference_number = '' THEN
    NEW.reference_number := el5_next_number('EL5/PROC','el5_sequences',true);
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_auto_tender_number ON tenders;
CREATE TRIGGER trg_auto_tender_number BEFORE INSERT ON tenders FOR EACH ROW EXECUTE FUNCTION auto_number_tender();

-- Voucher auto-numbers
CREATE OR REPLACE FUNCTION auto_number_payment_voucher()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.voucher_number IS NULL OR NEW.voucher_number = '' THEN
    NEW.voucher_number := el5_next_number('PV','el5_sequences',true);
  END IF; RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_auto_pv_number ON payment_vouchers;
CREATE TRIGGER trg_auto_pv_number BEFORE INSERT ON payment_vouchers FOR EACH ROW EXECUTE FUNCTION auto_number_payment_voucher();

CREATE OR REPLACE FUNCTION auto_number_receipt_voucher()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.voucher_number IS NULL OR NEW.voucher_number = '' THEN
    NEW.voucher_number := el5_next_number('RV','el5_sequences',true);
  END IF; RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_auto_rv_number ON receipt_vouchers;
CREATE TRIGGER trg_auto_rv_number BEFORE INSERT ON receipt_vouchers FOR EACH ROW EXECUTE FUNCTION auto_number_receipt_voucher();

CREATE OR REPLACE FUNCTION auto_number_journal_voucher()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.voucher_number IS NULL OR NEW.voucher_number = '' THEN
    NEW.voucher_number := el5_next_number('JV','el5_sequences',true);
  END IF; RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_auto_jv_number ON journal_vouchers;
CREATE TRIGGER trg_auto_jv_number BEFORE INSERT ON journal_vouchers FOR EACH ROW EXECUTE FUNCTION auto_number_journal_voucher();

CREATE OR REPLACE FUNCTION auto_number_purchase_voucher()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.voucher_number IS NULL OR NEW.voucher_number = '' THEN
    NEW.voucher_number := el5_next_number('PUV','el5_sequences',true);
  END IF; RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_auto_puv_number ON purchase_vouchers;
CREATE TRIGGER trg_auto_puv_number BEFORE INSERT ON purchase_vouchers FOR EACH ROW EXECUTE FUNCTION auto_number_purchase_voucher();

CREATE OR REPLACE FUNCTION auto_number_sales_voucher()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.voucher_number IS NULL OR NEW.voucher_number = '' THEN
    NEW.voucher_number := el5_next_number('SV','el5_sequences',true);
  END IF; RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_auto_sv_number ON sales_vouchers;
CREATE TRIGGER trg_auto_sv_number BEFORE INSERT ON sales_vouchers FOR EACH ROW EXECUTE FUNCTION auto_number_sales_voucher();

-- Budget auto-number
CREATE OR REPLACE FUNCTION auto_number_budget()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.budget_number IS NULL OR NEW.budget_number = '' THEN
    NEW.budget_number := el5_next_number('BDG','el5_sequences',true);
  END IF; RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_auto_budget_number ON budgets;
CREATE TRIGGER trg_auto_budget_number BEFORE INSERT ON budgets FOR EACH ROW EXECUTE FUNCTION auto_number_budget();

-- Fixed Asset auto-number
CREATE OR REPLACE FUNCTION auto_number_asset()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.asset_number IS NULL OR NEW.asset_number = '' THEN
    NEW.asset_number := el5_next_number('FA','el5_sequences',true);
  END IF; RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_auto_asset_number ON fixed_assets;
CREATE TRIGGER trg_auto_asset_number BEFORE INSERT ON fixed_assets FOR EACH ROW EXECUTE FUNCTION auto_number_asset();

-- NC auto-number
CREATE OR REPLACE FUNCTION auto_number_nc()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.nc_number IS NULL OR NEW.nc_number = '' THEN
    NEW.nc_number := el5_next_number('NC','el5_sequences',true);
  END IF; RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_auto_nc_number ON non_conformances;
CREATE TRIGGER trg_auto_nc_number BEFORE INSERT ON non_conformances FOR EACH ROW EXECUTE FUNCTION auto_number_nc();

-- ============================================================
-- 4. UPDATED_AT AUTO-TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'requisitions','purchase_orders','goods_received','suppliers','items',
    'tenders','contracts','payment_vouchers','receipt_vouchers','journal_vouchers',
    'purchase_vouchers','sales_vouchers','budgets','fixed_assets','non_conformances',
    'profiles','departments','item_categories','facilities'
  ])
  LOOP
    BEGIN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_updated_at_%I ON %I', t, t);
      EXECUTE format('CREATE TRIGGER trg_updated_at_%I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END $$;

-- ============================================================
-- 5. INVENTORY DEDUCTION TRIGGER (GRN → stock update)
-- ============================================================
CREATE OR REPLACE FUNCTION grn_update_inventory()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE row record;
BEGIN
  -- When GRN is approved, add stock
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    FOR row IN SELECT * FROM goods_received_items WHERE goods_received_id = NEW.id
    LOOP
      UPDATE items SET
        current_quantity = current_quantity + row.quantity_received,
        updated_at = now()
      WHERE id = row.item_id;
    END LOOP;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_grn_inventory ON goods_received;
CREATE TRIGGER trg_grn_inventory AFTER UPDATE ON goods_received FOR EACH ROW EXECUTE FUNCTION grn_update_inventory();

-- ============================================================
-- 6. PO TOTAL AUTO-CALCULATION TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION po_recalculate_total()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE purchase_orders SET
    total_amount = (
      SELECT COALESCE(SUM(quantity * unit_price * (1 - COALESCE(discount_percent,0)/100)),0)
      FROM purchase_order_items WHERE purchase_order_id = NEW.purchase_order_id
    ),
    updated_at = now()
  WHERE id = NEW.purchase_order_id;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_po_recalc ON purchase_order_items;
CREATE TRIGGER trg_po_recalc AFTER INSERT OR UPDATE OR DELETE ON purchase_order_items FOR EACH ROW EXECUTE FUNCTION po_recalculate_total();

-- ============================================================
-- 7. BUDGET SPENT AMOUNT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION budget_update_spent()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- When a PO is approved, deduct from related budget
  IF NEW.status='approved' AND (OLD.status IS NULL OR OLD.status!='approved') AND NEW.budget_id IS NOT NULL THEN
    UPDATE budgets SET
      spent_amount  = spent_amount + COALESCE(NEW.total_amount,0),
      remaining_amount = total_amount - (spent_amount + COALESCE(NEW.total_amount,0)),
      updated_at = now()
    WHERE id = NEW.budget_id;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_budget_spent ON purchase_orders;
CREATE TRIGGER trg_budget_spent AFTER UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION budget_update_spent();

-- Add budget_id to purchase_orders if not exists
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS budget_id uuid REFERENCES budgets(id);

-- ============================================================
-- 8. WORKFLOW NOTIFICATION TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION workflow_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  doc_type text := TG_TABLE_NAME;
  doc_num  text;
  msg      text;
  notif_type text;
BEGIN
  doc_num := COALESCE(
    NEW.requisition_number, NEW.po_number, NEW.grn_number,
    NEW.voucher_number, NEW.tender_number, NEW.nc_number,
    NEW.budget_number, NEW.asset_number, NEW.id::text
  );

  -- Notify submitter when approved/rejected
  IF NEW.status = 'approved' AND OLD.status != 'approved' AND NEW.created_by IS NOT NULL THEN
    INSERT INTO notifications(user_id,title,message,type,priority,is_read)
    VALUES(NEW.created_by, doc_type||' Approved', doc_type||' #'||doc_num||' has been approved ✓','success','normal',false);
  END IF;

  IF NEW.status = 'rejected' AND OLD.status != 'rejected' AND NEW.created_by IS NOT NULL THEN
    INSERT INTO notifications(user_id,title,message,type,priority,is_read)
    VALUES(NEW.created_by, doc_type||' Rejected', doc_type||' #'||doc_num||' was rejected. Reason: '||COALESCE(NEW.rejection_reason,'Not specified'),'error','high',false);
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END; $$;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['requisitions','purchase_orders','payment_vouchers','tenders','contracts'])
  LOOP
    BEGIN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_workflow_notify_%I ON %I', t, t);
      EXECUTE format('CREATE TRIGGER trg_workflow_notify_%I AFTER UPDATE ON %I FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status) EXECUTE FUNCTION workflow_notify()', t, t);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END $$;

-- ============================================================
-- 9. LOW STOCK ALERT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION item_low_stock_alert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.current_quantity <= NEW.reorder_level AND (OLD.current_quantity > OLD.reorder_level OR OLD.current_quantity IS NULL) THEN
    -- Notify all inventory managers
    INSERT INTO notifications(user_id,title,message,type,priority,is_read)
    SELECT ur.user_id,
      'Low Stock Alert: '||NEW.name,
      'Item '||NEW.name||' is at '||NEW.current_quantity||' '||COALESCE(NEW.unit,'units')||' (reorder level: '||NEW.reorder_level||')',
      'warning','high',false
    FROM user_roles ur WHERE ur.role IN ('admin','inventory_manager','warehouse_officer');
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_low_stock ON items;
CREATE TRIGGER trg_low_stock AFTER UPDATE ON items FOR EACH ROW WHEN (NEW.current_quantity IS DISTINCT FROM OLD.current_quantity) EXECUTE FUNCTION item_low_stock_alert();

-- ============================================================
-- 10. CONTRACT EXPIRY ALERT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION contract_expiry_check()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Alert 30 days before expiry when contract is updated
  IF NEW.end_date IS NOT NULL AND NEW.end_date <= CURRENT_DATE + INTERVAL '30 days' AND NEW.status = 'active' THEN
    INSERT INTO notifications(user_id,title,message,type,priority,is_read)
    SELECT ur.user_id,
      'Contract Expiring: '||COALESCE(NEW.title,NEW.contract_number),
      'Contract '||COALESCE(NEW.contract_number,'')||' expires on '||to_char(NEW.end_date,'DD Mon YYYY'),
      'warning','high',false
    FROM user_roles ur WHERE ur.role IN ('admin','procurement_manager');
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_contract_expiry ON contracts;
CREATE TRIGGER trg_contract_expiry AFTER INSERT OR UPDATE ON contracts FOR EACH ROW EXECUTE FUNCTION contract_expiry_check();

-- ============================================================
-- 11. FORM DATA TABLES — full structure for every form
-- ============================================================

-- Requisition Items (line items for forms)
CREATE TABLE IF NOT EXISTS requisition_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id   uuid NOT NULL REFERENCES requisitions(id) ON DELETE CASCADE,
  item_id          uuid REFERENCES items(id),
  item_name        text NOT NULL,
  description      text,
  quantity         numeric(15,3) NOT NULL DEFAULT 1,
  unit             text DEFAULT 'units',
  unit_price       numeric(15,2) DEFAULT 0,
  total_price      numeric(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  category         text,
  specifications   text,
  priority         text DEFAULT 'normal',
  status           text DEFAULT 'pending',
  created_at       timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_req_items_req ON requisition_items(requisition_id);
ALTER TABLE requisition_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "auth_req_items" ON requisition_items FOR ALL TO authenticated USING(true) WITH CHECK(true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- PO Items
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id   uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_id             uuid REFERENCES items(id),
  item_name           text NOT NULL,
  description         text,
  quantity            numeric(15,3) NOT NULL DEFAULT 1,
  unit                text DEFAULT 'units',
  unit_price          numeric(15,2) NOT NULL DEFAULT 0,
  discount_percent    numeric(5,2) DEFAULT 0,
  total_price         numeric(15,2) GENERATED ALWAYS AS (quantity * unit_price * (1 - discount_percent/100)) STORED,
  vat_rate            numeric(5,2) DEFAULT 16,
  vat_amount          numeric(15,2) GENERATED ALWAYS AS (quantity * unit_price * vat_rate / 100) STORED,
  delivery_date       date,
  remarks             text,
  created_at          timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_po_items_po ON purchase_order_items(purchase_order_id);
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "auth_po_items" ON purchase_order_items FOR ALL TO authenticated USING(true) WITH CHECK(true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- GRN Items
CREATE TABLE IF NOT EXISTS goods_received_items (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goods_received_id   uuid NOT NULL REFERENCES goods_received(id) ON DELETE CASCADE,
  po_item_id          uuid REFERENCES purchase_order_items(id),
  item_id             uuid REFERENCES items(id),
  item_name           text NOT NULL,
  quantity_ordered    numeric(15,3) DEFAULT 0,
  quantity_received   numeric(15,3) NOT NULL DEFAULT 0,
  quantity_rejected   numeric(15,3) DEFAULT 0,
  unit                text DEFAULT 'units',
  unit_price          numeric(15,2) DEFAULT 0,
  total_value         numeric(15,2) GENERATED ALWAYS AS (quantity_received * unit_price) STORED,
  condition           text DEFAULT 'good',
  batch_number        text,
  expiry_date         date,
  storage_location    text,
  remarks             text,
  created_at          timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_grn_items_grn ON goods_received_items(goods_received_id);
ALTER TABLE goods_received_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "auth_grn_items" ON goods_received_items FOR ALL TO authenticated USING(true) WITH CHECK(true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Bid Evaluation Items
CREATE TABLE IF NOT EXISTS bid_evaluation_items (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_evaluation_id   uuid NOT NULL REFERENCES bid_evaluations(id) ON DELETE CASCADE,
  criteria            text NOT NULL,
  weight              numeric(5,2) DEFAULT 10,
  score               numeric(5,2) DEFAULT 0,
  weighted_score      numeric(8,4) GENERATED ALWAYS AS (weight * score / 100) STORED,
  remarks             text,
  created_at          timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bid_items ON bid_evaluation_items(bid_evaluation_id);
ALTER TABLE bid_evaluation_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "auth_bid_items" ON bid_evaluation_items FOR ALL TO authenticated USING(true) WITH CHECK(true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Contract Milestones
CREATE TABLE IF NOT EXISTS contract_milestones (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id  uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  title        text NOT NULL,
  description  text,
  due_date     date,
  amount       numeric(15,2) DEFAULT 0,
  status       text DEFAULT 'pending',
  completed_at timestamptz,
  created_at   timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_milestones_contract ON contract_milestones(contract_id);
ALTER TABLE contract_milestones ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "auth_milestones" ON contract_milestones FOR ALL TO authenticated USING(true) WITH CHECK(true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Inspection Checklist Items
CREATE TABLE IF NOT EXISTS inspection_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id  uuid NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  checklist_item text NOT NULL,
  status         text DEFAULT 'pass', -- pass|fail|na
  remarks        text,
  created_at     timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_insp_items ON inspection_items(inspection_id);
ALTER TABLE inspection_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "auth_insp_items" ON inspection_items FOR ALL TO authenticated USING(true) WITH CHECK(true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Document Attachments (universal)
CREATE TABLE IF NOT EXISTS document_attachments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name  text NOT NULL,
  record_id   uuid NOT NULL,
  file_name   text NOT NULL,
  file_url    text NOT NULL,
  file_size   int,
  file_type   text,
  uploaded_by uuid REFERENCES auth.users(id),
  uploaded_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_attach_record ON document_attachments(table_name, record_id);
ALTER TABLE document_attachments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "auth_attachments" ON document_attachments FOR ALL TO authenticated USING(true) WITH CHECK(true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Comments / Notes (universal)
CREATE TABLE IF NOT EXISTS record_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name  text NOT NULL,
  record_id   uuid NOT NULL,
  comment     text NOT NULL,
  is_internal boolean DEFAULT true,
  author_id   uuid REFERENCES auth.users(id),
  author_name text,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_comments_record ON record_comments(table_name, record_id);
ALTER TABLE record_comments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "auth_comments" ON record_comments FOR ALL TO authenticated USING(true) WITH CHECK(true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 12. SEED: Chart of Accounts (standard healthcare Kenya)
-- ============================================================
INSERT INTO chart_of_accounts(account_code,account_name,account_type,level) VALUES
  ('1000','Current Assets',             'asset',   1),
  ('1100','Cash & Bank',                'asset',   2),
  ('1110','Petty Cash',                 'asset',   3),
  ('1120','Bank — KCB Main Account',   'asset',   3),
  ('1130','Bank — Equity Bank',        'asset',   3),
  ('1200','Accounts Receivable',       'asset',   2),
  ('1300','Inventory/Stores',          'asset',   2),
  ('1400','Prepaid Expenses',          'asset',   2),
  ('2000','Non-Current Assets',        'asset',   1),
  ('2100','Fixed Assets',              'asset',   2),
  ('2110','Medical Equipment',         'asset',   3),
  ('2120','Furniture & Fittings',      'asset',   3),
  ('2130','ICT Equipment',             'asset',   3),
  ('2140','Motor Vehicles',            'asset',   3),
  ('2150','Buildings',                 'asset',   3),
  ('3000','Current Liabilities',       'liability',1),
  ('3100','Accounts Payable',          'liability',2),
  ('3200','Accrued Expenses',          'liability',2),
  ('3300','VAT Payable',               'liability',2),
  ('4000','Income',                    'revenue', 1),
  ('4100','NHIF Revenue',              'revenue', 2),
  ('4200','County Government Grant',   'revenue', 2),
  ('4300','User Fee Revenue',          'revenue', 2),
  ('4400','Other Income',              'revenue', 2),
  ('5000','Expenditure',               'expense', 1),
  ('5100','Medical Supplies',          'expense', 2),
  ('5110','Drugs & Pharmaceuticals',   'expense', 3),
  ('5120','Medical Consumables',       'expense', 3),
  ('5200','Personnel Costs',           'expense', 2),
  ('5210','Salaries & Wages',          'expense', 3),
  ('5220','Allowances',                'expense', 3),
  ('5300','Operational Costs',         'expense', 2),
  ('5310','Utilities',                 'expense', 3),
  ('5320','Maintenance & Repairs',     'expense', 3),
  ('5330','Transport',                 'expense', 3),
  ('5400','Administrative Costs',      'expense', 2),
  ('5410','Office Supplies',           'expense', 3),
  ('5420','Communications',            'expense', 3),
  ('5430','Training & Capacity',       'expense', 3)
ON CONFLICT (account_code) DO NOTHING;

-- ============================================================
-- 13. SEED: Default item categories for Embu L5 Hospital
-- ============================================================
INSERT INTO item_categories(name, description) VALUES
  ('Pharmaceuticals',           'Drugs, medicines, and pharmaceutical products'),
  ('Medical Consumables',       'Disposable medical supplies and consumables'),
  ('Medical Equipment',         'Medical devices, machines, and equipment'),
  ('Laboratory Supplies',       'Lab reagents, kits, and consumables'),
  ('ICU & Theatre Supplies',    'Critical care and surgical supplies'),
  ('Imaging & Radiology',       'X-ray, ultrasound, and imaging supplies'),
  ('Dental Supplies',           'Dental instruments and consumables'),
  ('Physiotherapy Supplies',    'Rehabilitation and therapy equipment'),
  ('Office Stationery',         'Paper, pens, files, and office supplies'),
  ('ICT Equipment & Supplies',  'Computers, printers, and IT peripherals'),
  ('Cleaning & Hygiene',        'Detergents, disinfectants, PPE'),
  ('Food & Nutrition',          'Patient meals, supplements, kitchen supplies'),
  ('Maintenance & Repairs',     'Tools, spare parts, and maintenance items'),
  ('Transport & Fuel',          'Fuel, vehicle parts, and transport costs'),
  ('Safety & Security',         'Fire extinguishers, CCTV, safety equipment'),
  ('Laundry & Linen',           'Bedsheets, patient gowns, uniforms'),
  ('Printing & Stationery',     'Forms, registers, and printed materials'),
  ('Furniture & Fittings',      'Beds, chairs, cabinets, and furniture'),
  ('General Stores',            'Miscellaneous general items')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 14. SEED: Departments for Embu Level 5 Hospital
-- ============================================================
INSERT INTO departments(name, code, description) VALUES
  ('Outpatient Department',      'OPD',   'General outpatient services'),
  ('Inpatient/Wards',            'IPD',   'Admitted patient care'),
  ('Accident & Emergency',       'A&E',   'Emergency and trauma care'),
  ('Intensive Care Unit',        'ICU',   'Critical care services'),
  ('Maternity',                  'MAT',   'Obstetrics and maternity services'),
  ('Paediatrics',                'PAED',  'Children health services'),
  ('Surgery/Theatre',            'SURG',  'Surgical operations and theatre'),
  ('Laboratory',                 'LAB',   'Diagnostic laboratory services'),
  ('Radiology & Imaging',        'RAD',   'X-ray, ultrasound, CT scanning'),
  ('Pharmacy',                   'PHARM', 'Drug dispensing and management'),
  ('Dental',                     'DENT',  'Dental health services'),
  ('Physiotherapy',              'PHYSIO','Rehabilitation services'),
  ('Nutrition & Dietetics',      'NUT',   'Patient nutrition management'),
  ('Procurement & Stores',       'PROC',  'Medical procurement and inventory'),
  ('Finance & Accounts',         'FIN',   'Financial management'),
  ('Human Resources',            'HR',    'Staff management'),
  ('Administration',             'ADMIN', 'General administration'),
  ('ICT Department',             'ICT',   'Information technology'),
  ('Maintenance & Engineering',  'MAINT', 'Hospital maintenance'),
  ('Mortuary',                   'MORT',  'Mortuary services'),
  ('CSSD',                       'CSSD',  'Central Sterile Services')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 15. REALTIME for new form tables
-- ============================================================
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE requisition_items;    EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE purchase_order_items; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE goods_received_items; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE contract_milestones;  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE record_comments;      EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE document_attachments; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE el5_sequences;        EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE audit_log;            EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

COMMIT;
