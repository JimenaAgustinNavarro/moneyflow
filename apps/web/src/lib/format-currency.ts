export function formatCurrency(amount: string, currency = 'PEN'): string {
  const formatter = new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formatter.format(Number(amount)).replace(/\u00a0/g, ' ');
}
