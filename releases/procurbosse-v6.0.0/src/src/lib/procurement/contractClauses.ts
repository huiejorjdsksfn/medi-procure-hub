export interface ContractClause {
  id: string;
  title: string;
  category: string;
  text: string;
  isMandatory: boolean;
}

export const STANDARD_CLAUSES: ContractClause[] = [
  { id: "1", title: "Delivery Terms", category: "delivery", text: "The Supplier shall deliver goods within the agreed timeline. Late delivery penalties of 1% per day of contract value apply.", isMandatory: true },
  { id: "2", title: "Payment Terms", category: "payment", text: "Payment shall be made within 30 days of receipt of goods and approved invoice. Payment via EFT/RTGS to supplier's bank account.", isMandatory: true },
  { id: "3", title: "Quality Assurance", category: "quality", text: "All goods must meet Kenya Bureau of Standards (KEBS) requirements. Non-conforming goods will be returned at supplier's cost.", isMandatory: true },
  { id: "4", title: "Warranty", category: "warranty", text: "Supplier warrants all goods for a minimum of 12 months from date of delivery.", isMandatory: false },
  { id: "5", title: "Force Majeure", category: "legal", text: "Neither party shall be liable for delays caused by force majeure events beyond reasonable control.", isMandatory: true },
  { id: "6", title: "Termination", category: "legal", text: "Either party may terminate with 30 days written notice. Immediate termination applies for material breach.", isMandatory: true },
  { id: "7", title: "Confidentiality", category: "legal", text: "Both parties shall maintain confidentiality of all proprietary information shared during contract period.", isMandatory: false },
  { id: "8", title: "Dispute Resolution", category: "legal", text: "Disputes shall first be resolved through negotiation, then mediation, and finally arbitration under Kenyan law.", isMandatory: true },
];

export function getClausesByCategory(category: string): ContractClause[] {
  return STANDARD_CLAUSES.filter(c => c.category === category);
}

export function getMandatoryClauses(): ContractClause[] {
  return STANDARD_CLAUSES.filter(c => c.isMandatory);
}

export function buildContractTemplate(selectedClauses: ContractClause[]): string {
  return selectedClauses.map((c, i) => `${i + 1}. ${c.title}\n${c.text}`).join("\n\n");
}
