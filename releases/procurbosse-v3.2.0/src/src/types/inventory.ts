export interface Item {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  barcode: string | null;
  item_type: 'consumable' | 'equipment' | 'pharmaceutical' | 'reagent';
  category_id: string | null;
  department_id: string | null;
  supplier_id: string | null;
  unit_price: number;
  quantity_in_stock: number;
  reorder_level: number;
  unit_of_measure: string;
  location: string | null;
  batch_number: string | null;
  expiry_date: string | null;
  status: 'active' | 'inactive' | 'discontinued';
  created_at: string;
  updated_at: string;
}

export interface ItemCategory {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  created_at: string;
}

export interface StockMovement {
  id: string;
  item_id: string;
  movement_type: 'in' | 'out' | 'adjustment' | 'transfer';
  quantity: number;
  reference_number: string | null;
  notes: string | null;
  performed_by: string;
  created_at: string;
}

export interface InventoryValuation {
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_value: number;
  valuation_method: 'FIFO' | 'weighted_average';
}
