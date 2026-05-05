export interface Requisition {
  id: string;
  requisition_number: string;
  department_id: string | null;
  requested_by: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'forwarded' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  justification: string | null;
  notes: string | null;
  total_amount: number;
  submitted_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RequisitionItem {
  id: string;
  requisition_id: string;
  item_id: string | null;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  requisition_id: string | null;
  supplier_id: string | null;
  total_amount: number;
  status: 'draft' | 'sent' | 'acknowledged' | 'delivered' | 'cancelled';
  delivery_date: string | null;
  created_by: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  tax_id: string | null;
  rating: number;
  status: 'active' | 'inactive' | 'blacklisted';
  created_at: string;
  updated_at: string;
}

export interface GoodsReceived {
  id: string;
  grn_number: string;
  po_id: string | null;
  received_by: string | null;
  inspection_status: 'pending' | 'passed' | 'failed' | 'partial';
  notes: string | null;
  received_at: string;
  created_at: string;
}
