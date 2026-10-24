'use client';

import { Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/format-currency';
import type { Transaction } from '@/types/transaction';

const TYPE_LABELS: Record<Transaction['type'], string> = {
  INCOME: 'Ingreso',
  EXPENSE: 'Egreso',
  TRANSFER: 'Transferencia',
};

const TYPE_COLORS: Record<Transaction['type'], string> = {
  INCOME: 'text-emerald-600 dark:text-emerald-400',
  EXPENSE: 'text-rose-600 dark:text-rose-400',
  TRANSFER: 'text-blue-600 dark:text-blue-400',
};

const TYPE_BADGES: Record<Transaction['type'], string> = {
  INCOME: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  EXPENSE: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  TRANSFER: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
};

interface TransactionListProps {
  transactions: Transaction[];
  categoryNameById: Record<string, string>;
  accountNameById: Record<string, string>;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  onDeleteTransfer: (transaction: Transaction) => void;
}

export function TransactionList({
  transactions,
  categoryNameById,
  accountNameById,
  onEdit,
  onDelete,
  onDeleteTransfer,
}: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No hay movimientos para mostrar.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border/80 bg-card/80">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <th scope="col" className="px-3 py-3">
              Fecha
            </th>
            <th scope="col" className="px-3 py-3">
              Descripción
            </th>
            <th scope="col" className="px-3 py-3">
              Categoría
            </th>
            <th scope="col" className="px-3 py-3">
              Cuenta
            </th>
            <th scope="col" className="px-3 py-3">
              Tipo
            </th>
            <th scope="col" className="px-3 py-3 text-right">
              Monto
            </th>
            <th scope="col" className="px-3 py-3 text-right">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => {
            const isTransfer = transaction.type === 'TRANSFER';

            return (
              <tr
                key={transaction.id}
                className="border-b border-border/50 transition-colors last:border-0 hover:bg-accent/40"
              >
                <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                  {new Date(transaction.date).toLocaleDateString('es-PE', {
                    timeZone: 'America/Lima',
                  })}
                </td>
                <td className="px-3 py-3 text-foreground">{transaction.description ?? '—'}</td>
                <td className="px-3 py-3 text-muted-foreground">
                  {transaction.categoryId
                    ? (categoryNameById[transaction.categoryId] ?? 'Categoría')
                    : 'Sin categoría'}
                </td>
                <td className="px-3 py-3 text-muted-foreground">
                  {accountNameById[transaction.accountId] ?? 'Cuenta'}
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGES[transaction.type]}`}
                  >
                    {TYPE_LABELS[transaction.type]}
                  </span>
                </td>
                <td
                  className={`whitespace-nowrap px-3 py-3 text-right font-semibold ${TYPE_COLORS[transaction.type]}`}
                >
                  {formatCurrency(transaction.amount, transaction.currency)}
                </td>
                <td className="px-3 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    {!isTransfer && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(transaction)}
                        aria-label="Editar movimiento"
                      >
                        <Pencil aria-hidden="true" className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        isTransfer ? onDeleteTransfer(transaction) : onDelete(transaction)
                      }
                      aria-label={isTransfer ? 'Borrar transferencia' : 'Eliminar movimiento'}
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
