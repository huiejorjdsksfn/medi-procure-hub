export interface KPIMetric {
  label: string;
  value: number | string;
  trend: number | null;
  trendDirection: 'up' | 'down' | 'neutral';
  unit: string;
  color: string;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  category?: string;
}

export interface ReportConfig {
  id: string;
  name: string;
  description: string;
  type: 'procurement' | 'inventory' | 'financial' | 'supplier' | 'custom';
  filters: Record<string, any>;
  columns: string[];
  sort_by: string;
  sort_order: 'asc' | 'desc';
  created_by: string;
  is_scheduled: boolean;
  schedule_frequency: 'daily' | 'weekly' | 'monthly' | null;
}

export interface DashboardWidget {
  id: string;
  type: 'kpi' | 'chart' | 'table' | 'list';
  title: string;
  data_source: string;
  config: Record<string, any>;
  position: { x: number; y: number; w: number; h: number };
}
