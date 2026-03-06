export interface ChartOfAccount {
  id: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parent_id: string | null;
  is_active: boolean;
  balance: number;
}

export interface JournalEntry {
  id: string;
  voucher_number: string;
  date: string;
  description: string;
  debit_account_id: string;
  credit_account_id: string;
  amount: number;
  status: 'draft' | 'posted' | 'reversed';
  created_by: string;
  approved_by: string | null;
  created_at: string;
}

export interface Budget {
  id: string;
  fiscal_year: string;
  department_id: string;
  account_id: string;
  allocated_amount: number;
  spent_amount: number;
  remaining_amount: number;
  status: 'draft' | 'approved' | 'closed';
}

export interface FixedAsset {
  id: string;
  asset_code: string;
  name: string;
  description: string;
  purchase_date: string;
  purchase_cost: number;
  current_value: number;
  depreciation_method: 'straight_line' | 'declining_balance';
  useful_life_years: number;
  salvage_value: number;
  department_id: string;
  location: string;
  status: 'active' | 'disposed' | 'under_maintenance';
}

export interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  branch: string;
  currency: string;
  balance: number;
  is_active: boolean;
}

export interface PaymentRun {
  id: string;
  run_date: string;
  total_amount: number;
  payment_count: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_by: string;
}
