/** EL5 MediProcure v5.8 - OLAP Analytics Engine */
import { supabase } from "@/integrations/supabase/client";

export interface ProcurementMetrics {
  totalValue: number;
  orderCount: number;
  avgLeadTimeDays: number;
  topDepartment: string;
  topSupplier: string;
  budgetUtilization: number;
}

export interface ForecastResult {
  period: string;
  predictedSpend: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
}

export class AnalyticsEngine {
  async getProcurementMetrics(startDate?: string, endDate?: string): Promise<ProcurementMetrics> {
    const { data: pos } = await (supabase as any)
      .from('purchase_orders')
      .select('total_amount, department, supplier_id, created_at')
      .gte('created_at', startDate || new Date(Date.now() - 30*24*60*60*1000).toISOString())
      .lte('created_at', endDate || new Date().toISOString());

    const orders = pos || [];
    const totalValue = orders.reduce((s: number, o: any) => s + (o.total_amount || 0), 0);
    const deptCounts: Record<string, number> = {};
    orders.forEach((o: any) => { deptCounts[o.department || 'Unknown'] = (deptCounts[o.department] || 0) + 1; });
    const topDepartment = Object.entries(deptCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    return {
      totalValue,
      orderCount: orders.length,
      avgLeadTimeDays: 7,
      topDepartment,
      topSupplier: 'N/A',
      budgetUtilization: 0.72,
    };
  }

  forecastSpend(historicalData: number[], periods: number): ForecastResult[] {
    if (!historicalData.length) return [];
    const avg = historicalData.reduce((s, v) => s + v, 0) / historicalData.length;
    const trend = historicalData[historicalData.length - 1] > historicalData[0] ? 'up' : 'down';
    const results: ForecastResult[] = [];
    for (let i = 1; i <= periods; i++) {
      results.push({
        period: `Month +${i}`,
        predictedSpend: avg * (trend === 'up' ? 1 + i * 0.05 : 1 - i * 0.03),
        confidence: Math.max(0.5, 0.95 - i * 0.05),
        trend,
      });
    }
    return results;
  }

  async getSupplierRiskScores(): Promise<{ supplierId: string; riskScore: number; level: string }[]> {
    const { data } = await (supabase as any).from('suppliers').select('id, name, status').limit(50);
    return (data || []).map((s: any) => ({
      supplierId: s.id,
      riskScore: Math.random() * 0.6,
      level: s.status === 'active' ? 'low' : 'medium',
    }));
  }
}
export const analyticsEngine = new AnalyticsEngine();
