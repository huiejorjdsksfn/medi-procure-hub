import { exportToPDF } from '@/lib/export';

export interface ReportConfig {
  title: string;
  columns: string[];
  dateRange?: { start: string; end: string };
  filters?: Record<string, string>;
}

export const generateReport = (data: any[], config: ReportConfig): void => {
  exportToPDF(data, config.title, config.columns);
};

export const REPORT_TEMPLATES: Record<string, ReportConfig> = {
  requisitions_register: {
    title: 'Requisitions Register',
    columns: ['requisition_number', 'status', 'priority', 'total_amount'],
  },
  purchase_orders_register: {
    title: 'Purchase Orders Register',
    columns: ['po_number', 'status', 'total_amount', 'delivery_date'],
  },
  suppliers_list: {
    title: 'Suppliers Directory',
    columns: ['name', 'contact_person', 'phone', 'email', 'status'],
  },
  inventory_status: {
    title: 'Inventory Status Report',
    columns: ['name', 'sku', 'quantity_in_stock', 'unit_price', 'status'],
  },
  goods_received_register: {
    title: 'Goods Received Register',
    columns: ['grn_number', 'inspection_status', 'received_at'],
  },
  contracts_register: {
    title: 'Contracts Register',
    columns: ['contract_number', 'title', 'status', 'total_value', 'end_date'],
  },
};
