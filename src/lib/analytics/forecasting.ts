export interface ForecastPoint {
  period: string;
  actual: number | null;
  forecast: number;
  lowerBound: number;
  upperBound: number;
}

export function simpleMovingAverage(data: number[], periods: number = 3): number {
  if (data.length < periods) return data.reduce((s, v) => s + v, 0) / data.length;
  const recent = data.slice(-periods);
  return recent.reduce((s, v) => s + v, 0) / periods;
}

export function exponentialSmoothing(data: number[], alpha: number = 0.3): number[] {
  if (data.length === 0) return [];
  const result = [data[0]];
  for (let i = 1; i < data.length; i++) {
    result.push(alpha * data[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
}

export function linearTrend(data: number[]): { slope: number; intercept: number } {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: data[0] || 0 };
  const sumX = (n * (n - 1)) / 2;
  const sumY = data.reduce((s, v) => s + v, 0);
  const sumXY = data.reduce((s, v, i) => s + i * v, 0);
  const sumX2 = data.reduce((s, _, i) => s + i * i, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

export function forecastDemand(historicalData: { period: string; value: number }[], periodsAhead: number = 3): ForecastPoint[] {
  const values = historicalData.map(d => d.value);
  const { slope, intercept } = linearTrend(values);
  const smoothed = exponentialSmoothing(values);
  const stdDev = Math.sqrt(values.reduce((s, v, i) => s + Math.pow(v - (intercept + slope * i), 2), 0) / values.length);

  const result: ForecastPoint[] = historicalData.map((d, i) => ({
    period: d.period, actual: d.value, forecast: Math.round(smoothed[i]),
    lowerBound: Math.round(smoothed[i] - 1.96 * stdDev), upperBound: Math.round(smoothed[i] + 1.96 * stdDev),
  }));

  for (let i = 0; i < periodsAhead; i++) {
    const idx = values.length + i;
    const fc = Math.round(intercept + slope * idx);
    result.push({
      period: `F+${i + 1}`, actual: null, forecast: fc,
      lowerBound: Math.round(fc - 1.96 * stdDev), upperBound: Math.round(fc + 1.96 * stdDev),
    });
  }
  return result;
}
