export interface InspectionResult {
  itemId: string;
  itemName: string;
  inspectedQty: number;
  passedQty: number;
  failedQty: number;
  defectType: string | null;
  remarks: string;
  status: 'pass' | 'fail' | 'conditional';
}

export function calculatePassRate(passed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((passed / total) * 100 * 10) / 10;
}

export function determineInspectionResult(passRate: number, threshold: number = 95): 'pass' | 'fail' | 'conditional' {
  if (passRate >= threshold) return 'pass';
  if (passRate >= threshold - 10) return 'conditional';
  return 'fail';
}

export function generateNCR(item: InspectionResult): { ncrNumber: string; severity: string; action: string } {
  const ncrNumber = `NCR/${new Date().getFullYear()}/${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const severity = item.failedQty > item.inspectedQty * 0.2 ? 'major' : 'minor';
  const action = severity === 'major' ? 'Return to supplier' : 'Accept with deviation';
  return { ncrNumber, severity, action };
}
