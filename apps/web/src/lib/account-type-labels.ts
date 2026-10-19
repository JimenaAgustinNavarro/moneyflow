import type { AccountType } from '@/types/account';

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  CASH: 'Efectivo',
  BANK: 'Banco',
  WALLET: 'Billetera',
  CREDIT: 'Tarjeta de crédito',
};

export function getAccountTypeLabel(type: AccountType): string {
  return ACCOUNT_TYPE_LABELS[type] ?? type;
}
