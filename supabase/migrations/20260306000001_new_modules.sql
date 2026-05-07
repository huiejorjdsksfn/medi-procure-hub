-- ============================================================
-- MediProcure ERP - New Modules Migration
-- Payment, Receipt, Journal, Purchase, Sales Vouchers
-- Tenders, Inspections, Non-Conformance, Financials, Admin
-- ============================================================

-- Payment Vouchers
CREATE TABLE IF NOT EXISTS payment_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_number TEXT UNIQUE NOT NULL,
  payee_name TEXT NOT NULL,
  payee_type TEXT DEFAULT 'supplier',
  supplier_id UUID REFERENCES suppliers(id),
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'EFT',
  voucher_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  bank_name TEXT,
  account_number TEXT,
  reference TEXT,
  description TEXT,
  expense_account TEXT,
  line_items JSONB DEFAULT '[]',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','pending','approved','paid','rejected')),
  created_by UUID REFERENCES auth.users(id),
  created_by_name TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_by_name TEXT,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Receipt Vouchers
CREATE TABLE IF NOT EXISTS receipt_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number TEXT UNIQUE NOT NULL,
  received_from TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'Cash',
  receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference TEXT,
  description TEXT,
  income_account TEXT,
  bank_name TEXT,
  status TEXT DEFAULT 'confirmed',
  created_by UUID REFERENCES auth.users(id),
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Journal Vouchers
CREATE TABLE IF NOT EXISTS journal_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_number TEXT UNIQUE NOT NULL,
  journal_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference TEXT,
  period TEXT,
  narration TEXT,
  entries JSONB DEFAULT '[]',
  total_debit NUMERIC(15,2) DEFAULT 0,
  total_credit NUMERIC(15,2) DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','posted','reversed')),
  created_by UUID REFERENCES auth.users(id),
  created_by_name TEXT,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchase Vouchers (Vendor Invoices)
CREATE TABLE IF NOT EXISTS purchase_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_number TEXT UNIQUE NOT NULL,
  supplier_id UUID REFERENCES suppliers(id),
  supplier_name TEXT,
  invoice_number TEXT,
  voucher_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  po_reference TEXT,
  subtotal NUMERIC(15,2) DEFAULT 0,
  tax_amount NUMERIC(15,2) DEFAULT 0,
  amount NUMERIC(15,2) DEFAULT 0,
  description TEXT,
  line_items JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','rejected')),
  created_by UUID REFERENCES auth.users(id),
  created_by_name TEXT,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales Vouchers
CREATE TABLE IF NOT EXISTS sales_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_type TEXT DEFAULT 'walk_in',
  payment_method TEXT DEFAULT 'Cash',
  voucher_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal NUMERIC(15,2) DEFAULT 0,
  tax_amount NUMERIC(15,2) DEFAULT 0,
  amount NUMERIC(15,2) DEFAULT 0,
  description TEXT,
  income_account TEXT,
  line_items JSONB DEFAULT '[]',
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('draft','confirmed','paid','cancelled')),
  created_by UUID REFERENCES auth.users(id),
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tenders
CREATE TABLE IF NOT EXISTS tenders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  tender_type TEXT DEFAULT 'open',
  estimated_value NUMERIC(15,2),
  opening_date DATE,
  closing_date DATE NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','published','closed','evaluated','awarded','cancelled')),
  created_by UUID REFERENCES auth.users(id),
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bid Evaluations
CREATE TABLE IF NOT EXISTS bid_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id UUID REFERENCES tenders(id),
  tender_number TEXT,
  supplier_id UUID REFERENCES suppliers(id),
  supplier_name TEXT,
  bid_amount NUMERIC(15,2),
  technical_score NUMERIC(5,2),
  financial_score NUMERIC(5,2),
  total_score NUMERIC(5,2),
  recommendation TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','evaluated','recommended','awarded','rejected')),
  evaluated_by UUID REFERENCES auth.users(id),
  evaluated_by_name TEXT,
  evaluated_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quality Inspections
CREATE TABLE IF NOT EXISTS inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_number TEXT UNIQUE NOT NULL,
  grn_reference TEXT,
  po_reference TEXT,
  supplier_id UUID REFERENCES suppliers(id),
  supplier_name TEXT,
  item_id UUID REFERENCES items(id),
  item_name TEXT,
  batch_number TEXT,
  quantity_inspected NUMERIC(10,2),
  quantity_accepted NUMERIC(10,2),
  quantity_rejected NUMERIC(10,2),
  result TEXT DEFAULT 'pending' CHECK (result IN ('pending','pass','fail','conditional')),
  inspection_date DATE DEFAULT CURRENT_DATE,
  inspector_id UUID REFERENCES auth.users(id),
  inspector_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Non-Conformance Reports
CREATE TABLE IF NOT EXISTS non_conformance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ncr_number TEXT UNIQUE NOT NULL,
  inspection_id UUID REFERENCES inspections(id),
  supplier_id UUID REFERENCES suppliers(id),
  supplier_name TEXT,
  item_id UUID REFERENCES items(id),
  item_name TEXT,
  issue_description TEXT NOT NULL,
  severity TEXT DEFAULT 'minor' CHECK (severity IN ('minor','major','critical')),
  root_cause TEXT,
  corrective_action TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','under_review','resolved','closed')),
  raised_by UUID REFERENCES auth.users(id),
  raised_by_name TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chart of Accounts
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code TEXT UNIQUE NOT NULL,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('asset','liability','equity','revenue','expense')),
  category TEXT,
  parent_code TEXT,
  balance NUMERIC(15,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bank Accounts
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_number TEXT UNIQUE NOT NULL,
  account_name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  branch TEXT,
  account_type TEXT DEFAULT 'current',
  balance NUMERIC(15,2) DEFAULT 0,
  currency TEXT DEFAULT 'KES',
  status TEXT DEFAULT 'active',
  gl_account TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budgets
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_code TEXT UNIQUE NOT NULL,
  budget_name TEXT NOT NULL,
  department_id UUID REFERENCES departments(id),
  department_name TEXT,
  financial_year TEXT NOT NULL,
  allocated_amount NUMERIC(15,2) DEFAULT 0,
  spent_amount NUMERIC(15,2) DEFAULT 0,
  committed_amount NUMERIC(15,2) DEFAULT 0,
  category TEXT,
  status TEXT DEFAULT 'active',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fixed Assets
CREATE TABLE IF NOT EXISTS fixed_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_number TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  location TEXT,
  department_id UUID REFERENCES departments(id),
  acquisition_date DATE,
  acquisition_cost NUMERIC(15,2) DEFAULT 0,
  useful_life_years INTEGER DEFAULT 5,
  depreciation_method TEXT DEFAULT 'straight_line',
  salvage_value NUMERIC(15,2) DEFAULT 0,
  accumulated_depreciation NUMERIC(15,2) DEFAULT 0,
  net_book_value NUMERIC(15,2) DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','disposed','under_maintenance','written_off')),
  serial_number TEXT,
  supplier_id UUID REFERENCES suppliers(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Procurement Plans
CREATE TABLE IF NOT EXISTS procurement_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_number TEXT UNIQUE NOT NULL,
  item_description TEXT NOT NULL,
  item_id UUID REFERENCES items(id),
  department_id UUID REFERENCES departments(id),
  department_name TEXT,
  quantity NUMERIC(10,2),
  estimated_unit_cost NUMERIC(15,2),
  estimated_total_cost NUMERIC(15,2),
  procurement_method TEXT DEFAULT 'open_tender',
  planned_quarter TEXT,
  financial_year TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','approved','in_progress','completed','cancelled')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE payment_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE non_conformance ENABLE ROW LEVEL SECURITY;
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies (authenticated users can read all, insert own, admin can do everything)
DO $$ 
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['payment_vouchers','receipt_vouchers','journal_vouchers','purchase_vouchers','sales_vouchers','tenders','bid_evaluations','inspections','non_conformance','chart_of_accounts','bank_accounts','budgets','fixed_assets','procurement_plans']
  LOOP
    EXECUTE format('CREATE POLICY "Auth users read %s" ON %s FOR SELECT TO authenticated USING (true)', tbl, tbl);
    EXECUTE format('CREATE POLICY "Auth users insert %s" ON %s FOR INSERT TO authenticated WITH CHECK (true)', tbl, tbl);
    EXECUTE format('CREATE POLICY "Auth users update %s" ON %s FOR UPDATE TO authenticated USING (true)', tbl, tbl);
    EXECUTE format('CREATE POLICY "Auth users delete %s" ON %s FOR DELETE TO authenticated USING (true)', tbl, tbl);
  END LOOP;
END $$;

-- Enable realtime for all new tables
ALTER PUBLICATION supabase_realtime ADD TABLE payment_vouchers;
ALTER PUBLICATION supabase_realtime ADD TABLE receipt_vouchers;
ALTER PUBLICATION supabase_realtime ADD TABLE journal_vouchers;
ALTER PUBLICATION supabase_realtime ADD TABLE purchase_vouchers;
ALTER PUBLICATION supabase_realtime ADD TABLE sales_vouchers;
ALTER PUBLICATION supabase_realtime ADD TABLE tenders;
ALTER PUBLICATION supabase_realtime ADD TABLE bid_evaluations;
ALTER PUBLICATION supabase_realtime ADD TABLE inspections;
ALTER PUBLICATION supabase_realtime ADD TABLE non_conformance;
ALTER PUBLICATION supabase_realtime ADD TABLE chart_of_accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE bank_accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE budgets;
ALTER PUBLICATION supabase_realtime ADD TABLE fixed_assets;
ALTER PUBLICATION supabase_realtime ADD TABLE procurement_plans;

-- Seed Chart of Accounts
INSERT INTO chart_of_accounts (account_code, account_name, account_type, category) VALUES
('1100','Cash and Cash Equivalents','asset','Current Assets'),
('1200','Accounts Receivable','asset','Current Assets'),
('1300','Inventory / Stock','asset','Current Assets'),
('1400','Prepaid Expenses','asset','Current Assets'),
('1500','Fixed Assets','asset','Non-Current Assets'),
('1510','Accumulated Depreciation','asset','Non-Current Assets'),
('2100','Accounts Payable','liability','Current Liabilities'),
('2200','Accrued Expenses','liability','Current Liabilities'),
('2300','Short-Term Loans','liability','Current Liabilities'),
('3100','Government Fund','equity','Equity'),
('3200','Retained Surplus','equity','Equity'),
('4100','Revenue - Outpatient','revenue','Operating Revenue'),
('4200','Revenue - Inpatient','revenue','Operating Revenue'),
('4300','Revenue - Pharmacy','revenue','Operating Revenue'),
('4400','Revenue - Laboratory','revenue','Operating Revenue'),
('4500','Revenue - Theatre','revenue','Operating Revenue'),
('4600','NHIF Reimbursements','revenue','Grants & Transfers'),
('4700','Government Grants','revenue','Grants & Transfers'),
('5100','Medical Supplies Expense','expense','Operating Expenses'),
('5200','Pharmaceutical Expense','expense','Operating Expenses'),
('5300','Salaries & Wages','expense','Personnel Costs'),
('5400','Equipment Maintenance','expense','Operating Expenses'),
('5500','Utilities','expense','Operating Expenses'),
('5600','Administrative Expenses','expense','Operating Expenses'),
('5700','Depreciation Expense','expense','Non-Cash Expenses')
ON CONFLICT (account_code) DO NOTHING;
