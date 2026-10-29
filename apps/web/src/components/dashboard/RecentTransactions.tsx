'use client';

import { formatCurrency } from '@/lib/format-currency';
import type { RecentTransaction, TransactionType } from '@/types/dashboard';

interface RecentTransactionsProps {
  transactions: RecentTransaction[];
  isLoading: boolean;
}

const TYPE_BADGES: Record<TransactionType, string> = {
  INCOME: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  EXPENSE: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
};

const TYPE_LABELS: Record<TransactionType, string> = {
  INCOME: 'Ingreso',
  EXPENSE: 'Egreso',
};

export function RecentTransactions({ transactions, isLoading }: RecentTransactionsProps) {
  if (isLoading) {
    return (
      <p className="py-4 text-sm text-muted-foreground" role="status">
        Cargando movimientos...
      </p>
    );
  }

  if (transactions.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No hay movimientos recientes.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border/80 bg-card/80">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <th scope="col" className="whitespace-nowrap px-3 py-3">
              Fecha
            </th>
            <th scope="col" className="px-3 py-3">
              Descripción
            </th>
            <th scope="col" className="px-3 py-3">
              Categoría
            </th>
            <th scope="col" className="px-3 py-3">
              Tipo
            </th>
            <th scope="col" className="whitespace-nowrap px-3 py-3 text-right">
              Monto
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <tr
              key={transaction.id}
              className="border-b border-border/50 last:border-0 hover:bg-accent/40"
            >
              <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                {new Date(transaction.date).toLocaleDateString('es-PE', {
                  timeZone: 'America/Lima',
                })}
              </td>
              <td className="px-3 py-3 text-foreground">{transaction.description ?? '—'}</td>
              <td className="px-3 py-3 text-muted-foreground">
                {transaction.categoryName ?? 'Sin categoría'}
              </td>
              <td className="px-3 py-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGES[transaction.type]}`}
                >
                  {TYPE_LABELS[transaction.type]}
                </span>
              </td>
              <td
                className={`whitespace-nowrap px-3 py-3 text-right font-semibold ${
                  transaction.type === 'INCOME'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {formatCurrency(transaction.amount, transaction.currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
