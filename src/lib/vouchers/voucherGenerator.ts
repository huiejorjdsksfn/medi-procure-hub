import type { Voucher, VoucherLineItem } from '@/types/vouchers';

export function generateVoucherNumber(type: string = 'CRV'): string {
  return `${Math.floor(5000000 + Math.random() * 5000000)}`;
}

export function calculateVoucherTotal(items: VoucherLineItem[]): number {
  return items.reduce((sum, item) => sum + (item.value || 0), 0);
}

export function validateVoucher(voucher: Partial<Voucher>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!voucher.ministry) errors.push("Ministry is required");
  if (!voucher.department) errors.push("Department is required");
  if (!voucher.items || voucher.items.length === 0) errors.push("At least one item is required");
  if (!voucher.requisitioning_officer) errors.push("Requisitioning officer is required");
  return { valid: errors.length === 0, errors };
}

export function formatVoucherForPrint(voucher: Voucher): string {
  const header = [
    `Form S 11`,
    `${voucher.copy_type}    ${voucher.voucher_number}`,
    `REPUBLIC OF KENYA`,
    `COUNTER REQUISITION AND ISSUE VOUCHER`,
    `Ministry: ${voucher.ministry}  Dept: ${voucher.department}  Unit: ${voucher.unit}`,
    `To (issue point): ${voucher.issue_point}`,
    `Point of use: ${voucher.point_of_use}`,
  ].join('\n');

  const itemLines = voucher.items.map(i =>
    `${i.code_no}\t${i.item_description}\t${i.unit_of_issue}\t${i.quantity_required}\t${i.quantity_issued}\t${i.value}\t${i.remarks}`
  ).join('\n');

  return `${header}\n\n${itemLines}`;
}
