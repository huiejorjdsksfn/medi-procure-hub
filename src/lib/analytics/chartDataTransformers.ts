export interface ChartDataPoint {
  name: string;
  value: number;
  color?: string;
}

export const groupByField = <T extends Record<string, any>>(
  data: T[], field: string, valueField: string = 'total_amount'
): ChartDataPoint[] => {
  const groups: Record<string, number> = {};
  data.forEach(item => {
    const key = String(item[field] || 'Other');
    groups[key] = (groups[key] || 0) + (Number(item[valueField]) || 0);
  });
  return Object.entries(groups).map(([name, value]) => ({ name, value }));
};

export const groupByMonth = <T extends Record<string, any>>(
  data: T[], dateField: string = 'created_at', valueField: string = 'total_amount'
): ChartDataPoint[] => {
  const months: Record<string, number> = {};
  data.forEach(item => {
    const date = new Date(item[dateField]);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    months[key] = (months[key] || 0) + (Number(item[valueField]) || 0);
  });
  return Object.entries(months).sort().map(([name, value]) => ({ name, value }));
};

export const topN = (data: ChartDataPoint[], n: number = 10): ChartDataPoint[] => {
  return [...data].sort((a, b) => b.value - a.value).slice(0, n);
};
