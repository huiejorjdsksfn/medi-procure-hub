export interface SupplierScore {
  supplierId: string;
  supplierName: string;
  qualityScore: number;
  deliveryScore: number;
  priceScore: number;
  serviceScore: number;
  overallScore: number;
  rating: 'A' | 'B' | 'C' | 'D' | 'F';
}

const WEIGHTS = { quality: 0.30, delivery: 0.25, price: 0.25, service: 0.20 };

export function calculateSupplierScore(
  quality: number, delivery: number, price: number, service: number
): { overallScore: number; rating: string } {
  const overall = quality * WEIGHTS.quality + delivery * WEIGHTS.delivery + price * WEIGHTS.price + service * WEIGHTS.service;
  const rating = overall >= 90 ? 'A' : overall >= 75 ? 'B' : overall >= 60 ? 'C' : overall >= 40 ? 'D' : 'F';
  return { overallScore: Math.round(overall * 10) / 10, rating };
}

export function rankSuppliers(suppliers: SupplierScore[]): SupplierScore[] {
  return [...suppliers].sort((a, b) => b.overallScore - a.overallScore);
}
