'use client';

import { Pencil, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/format-currency';
import type { Transfer } from '@/types/transfer';

interface TransferListProps {
  transfers: Transfer[];
  accountNameById: Record<string, string>;
  onEdit: (transfer: Transfer) => void;
  onCancel: (transfer: Transfer) => void;
}

export function TransferList({ transfers, accountNameById, onEdit, onCancel }: TransferListProps) {
  if (transfers.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No hay transferencias.</p>;
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
              Cuenta origen
            </th>
            <th scope="col" className="px-3 py-3">
              Cuenta destino
            </th>
            <th scope="col" className="px-3 py-3 text-right">
              Monto
            </th>
            <th scope="col" className="px-3 py-3">
              Estado
            </th>
            <th scope="col" className="px-3 py-3 text-right">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {transfers.map((transfer) => {
            const confirmed = transfer.status === 'CONFIRMED';
            return (
              <tr
                key={transfer.id}
                className="border-b border-border/50 transition-colors last:border-0 hover:bg-accent/40"
              >
                <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                  {new Date(transfer.occurredAt).toLocaleDateString('es-PE', {
                    timeZone: 'America/Lima',
                  })}
                </td>
                <td className="px-3 py-3 text-muted-foreground">
                  {accountNameById[transfer.originAccountId] ?? 'Cuenta'}
                </td>
                <td className="px-3 py-3 text-muted-foreground">
                  {accountNameById[transfer.destinationAccountId] ?? 'Cuenta'}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-foreground">
                  {formatCurrency(transfer.amount, transfer.currency)}
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      confirmed
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {transfer.status === 'CONFIRMED'
                      ? 'Confirmada'
                      : transfer.status === 'CANCELLED'
                        ? 'Cancelada'
                        : 'Pendiente'}
                  </span>
                </td>
                <td className="px-3 py-3 text-right">
                  {confirmed && (
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(transfer)}
                        aria-label="Editar transferencia"
                      >
                        <Pencil aria-hidden="true" className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onCancel(transfer)}
                        aria-label="Cancelar transferencia"
                      >
                        <XCircle aria-hidden="true" className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
