export interface Voucher {
  id: string;
  voucher_number: string;
  voucher_type: 'payment' | 'receipt' | 'journal' | 'purchase' | 'counter_requisition';
  copy_type: 'ORIGINAL' | 'DUPLICATE' | 'TRIPLICATE';
  ministry: string;
  department: string;
  unit: string;
  issue_point: string;
  point_of_use: string;
  account_no: string;
  requisitioning_officer: string;
  designation_req: string;
  issued_by: string;
  received_by: string;
  designation_recv: string;
  items: VoucherLineItem[];
  status: 'draft' | 'issued' | 'approved' | 'cancelled';
  created_by: string;
  created_at: string;
}

export interface VoucherLineItem {
  code_no: string;
  item_description: string;
  unit_of_issue: string;
  quantity_required: number;
  quantity_issued: number;
  value: number;
  remarks: string;
}

export interface PaymentVoucher {
  id: string;
  pv_number: string;
  payee: string;
  description: string;
  amount: number;
  tax_amount: number;
  net_amount: number;
  bank_account_id: string;
  payment_method: 'cheque' | 'eft' | 'cash' | 'mpesa';
  cheque_number: string | null;
  status: 'draft' | 'approved' | 'paid' | 'cancelled';
  approved_by: string | null;
  created_by: string;
  created_at: string;
}
