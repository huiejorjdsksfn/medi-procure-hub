export interface BidSubmission {
  id: string;
  tenderId: string;
  supplierId: string;
  supplierName: string;
  technicalScore: number;
  financialScore: number;
  totalPrice: number;
  deliveryDays: number;
  isResponsive: boolean;
  documents: string[];
}

export interface EvaluationCriteria {
  name: string;
  weight: number;
  maxScore: number;
}

const DEFAULT_CRITERIA: EvaluationCriteria[] = [
  { name: "Technical Capability", weight: 0.30, maxScore: 100 },
  { name: "Financial Proposal", weight: 0.35, maxScore: 100 },
  { name: "Past Experience", weight: 0.15, maxScore: 100 },
  { name: "Delivery Timeline", weight: 0.10, maxScore: 100 },
  { name: "Compliance", weight: 0.10, maxScore: 100 },
];

export function evaluateBids(bids: BidSubmission[], criteria = DEFAULT_CRITERIA): (BidSubmission & { weightedScore: number; rank: number })[] {
  const scored = bids.filter(b => b.isResponsive).map(bid => {
    const weightedScore = (bid.technicalScore * 0.45) + (bid.financialScore * 0.55);
    return { ...bid, weightedScore };
  });
  scored.sort((a, b) => b.weightedScore - a.weightedScore);
  return scored.map((bid, i) => ({ ...bid, rank: i + 1 }));
}

export function calculateFinancialScore(bidPrice: number, lowestPrice: number): number {
  if (bidPrice <= 0) return 0;
  return Math.round((lowestPrice / bidPrice) * 100);
}

export function checkBidResponsiveness(bid: BidSubmission, mandatoryDocs: string[]): { responsive: boolean; missing: string[] } {
  const missing = mandatoryDocs.filter(doc => !bid.documents.includes(doc));
  return { responsive: missing.length === 0, missing };
}
