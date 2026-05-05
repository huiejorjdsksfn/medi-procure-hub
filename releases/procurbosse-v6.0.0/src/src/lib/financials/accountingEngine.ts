export interface LedgerEntry {
  id: string;
  date: string;
  accountCode: string;
  accountName: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  reference: string;
}

export interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  debitBalance: number;
  creditBalance: number;
}

export function calculateBalance(entries: LedgerEntry[]): number {
  return entries.reduce((bal, e) => bal + e.debit - e.credit, 0);
}

export function generateTrialBalance(entries: LedgerEntry[]): TrialBalanceRow[] {
  const accounts: Record<string, { name: string; debit: number; credit: number }> = {};
  entries.forEach(e => {
    if (!accounts[e.accountCode]) accounts[e.accountCode] = { name: e.accountName, debit: 0, credit: 0 };
    accounts[e.accountCode].debit += e.debit;
    accounts[e.accountCode].credit += e.credit;
  });
  return Object.entries(accounts).map(([code, acc]) => ({
    accountCode: code, accountName: acc.name,
    debitBalance: Math.max(0, acc.debit - acc.credit),
    creditBalance: Math.max(0, acc.credit - acc.debit),
  }));
}

export function validateDoubleEntry(entries: LedgerEntry[]): boolean {
  const totalDebits = entries.reduce((s, e) => s + e.debit, 0);
  const totalCredits = entries.reduce((s, e) => s + e.credit, 0);
  return Math.abs(totalDebits - totalCredits) < 0.01;
}

export function calculateDepreciation(
  cost: number, salvageValue: number, usefulLife: number, method: 'straight_line' | 'declining_balance', year: number
): number {
  if (method === 'straight_line') {
    return (cost - salvageValue) / usefulLife;
  }
  const rate = 2 / usefulLife;
  let bookValue = cost;
  for (let i = 0; i < year - 1; i++) {
    bookValue -= bookValue * rate;
  }
  return Math.max(0, bookValue * rate);
}
