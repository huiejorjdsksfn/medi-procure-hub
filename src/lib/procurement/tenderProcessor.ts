export interface Tender {
  id: string;
  tenderNumber: string;
  title: string;
  description: string;
  category: string;
  estimatedValue: number;
  openingDate: string;
  closingDate: string;
  status: 'draft' | 'published' | 'evaluation' | 'awarded' | 'cancelled';
  procurementMethod: 'open' | 'restricted' | 'direct' | 'rfq';
}

export function generateTenderNumber(prefix = 'TND'): string {
  const d = new Date();
  const seq = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}/EL5H/${d.getFullYear()}/${seq}`;
}

export function validateTenderDates(opening: string, closing: string): { valid: boolean; error?: string } {
  const open = new Date(opening);
  const close = new Date(closing);
  if (close <= open) return { valid: false, error: "Closing date must be after opening date" };
  const diff = (close.getTime() - open.getTime()) / (1000 * 60 * 60 * 24);
  if (diff < 14) return { valid: false, error: "Minimum 14 days between opening and closing" };
  return { valid: true };
}

export function determineProcurementMethod(estimatedValue: number): string {
  if (estimatedValue <= 500000) return 'rfq';
  if (estimatedValue <= 5000000) return 'restricted';
  return 'open';
}

export function calculateTenderProgress(tender: Tender): number {
  const stages = ['draft', 'published', 'evaluation', 'awarded'];
  const idx = stages.indexOf(tender.status);
  return idx >= 0 ? Math.round(((idx + 1) / stages.length) * 100) : 0;
}
