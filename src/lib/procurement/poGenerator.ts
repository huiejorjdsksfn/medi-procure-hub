export const generatePONumber = (prefix: string = 'LPO/EL5H'): string => {
  const d = new Date();
  const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  const seq = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}/${dateStr}/${seq}`;
};

export const calculatePOTotal = (items: { quantity: number; unit_price: number }[]): number => {
  return items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
};

export const calculateTax = (amount: number, rate: number = 16): number => {
  return amount * (rate / 100);
};

export const calculateGrandTotal = (subtotal: number, taxRate: number = 16): { subtotal: number; tax: number; total: number } => {
  const tax = calculateTax(subtotal, taxRate);
  return { subtotal, tax, total: subtotal + tax };
};
