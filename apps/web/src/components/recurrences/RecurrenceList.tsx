'use client';

import { Pencil, RotateCcw, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/format-currency';
import type { Recurrence, RecurrenceFrequency } from '@/types/recurrence';
import { RecurrenceToggleButton } from './RecurrenceToggleButton';

const FREQUENCY_LABELS: Record<RecurrenceFrequency, string> = {
  WEEKLY: 'Semanal',
  BIWEEKLY: 'Quincenal',
  MONTHLY: 'Mensual',
  QUARTERLY: 'Trimestral',
  YEARLY: 'Anual',
};

const TYPE_BADGES: Record<Recurrence['type'], string> = {
  INCOME: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  EXPENSE: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
};

interface RecurrenceListProps {
  recurrences: Recurrence[];
  onEdit: (recurrence: Recurrence) => void;
  onToggle: (recurrence: Recurrence) => void;
  onDelete: (recurrence: Recurrence) => void;
  onRestore: (recurrence: Recurrence) => void;
  isLoading?: boolean;
}

export function RecurrenceList({
  recurrences,
  onEdit,
  onToggle,
  onDelete,
  onRestore,
  isLoading = false,
}: RecurrenceListProps) {
  if (isLoading) {
    return (
      <p role="status" className="py-8 text-center text-sm text-muted-foreground">
        Cargando recurrencias...
      </p>
    );
  }

  if (recurrences.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No hay recurrencias. Crea la primera.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border/80 bg-card/80">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <th className="px-3 py-3">Nombre</th>
            <th className="px-3 py-3">Tipo</th>
            <th className="px-3 py-3">Frecuencia</th>
            <th className="px-3 py-3">Próxima</th>
            <th className="px-3 py-3">Cuenta</th>
            <th className="px-3 py-3">Categoría</th>
            <th className="px-3 py-3 text-right">Monto</th>
            <th className="px-3 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {recurrences.map((recurrence) => {
            const deleted = Boolean(recurrence.deletedAt);
            return (
              <tr key={recurrence.id} className="border-b border-border/50 last:border-0 hover:bg-accent/40">
                <td className="px-3 py-3">
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{recurrence.name}</span>
                    {!recurrence.active && !deleted && (
                      <span className="text-xs text-muted-foreground">Inactiva</span>
                    )}
                    {deleted && <span className="text-xs text-destructive">Eliminada</span>}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGES[recurrence.type]}`}>
                    {recurrence.type === 'INCOME' ? 'Ingreso' : 'Egreso'}
                  </span>
                </td>
                <td className="px-3 py-3 text-muted-foreground">
                  {FREQUENCY_LABELS[recurrence.frequency]}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                  {recurrence.nextDueDate
                    ? new Date(recurrence.nextDueDate).toLocaleDateString('es-PE', {
                        timeZone: 'America/Lima',
                      })
                    : 'Sin fecha'}
                </td>
                <td className="px-3 py-3 text-muted-foreground">{recurrence.accountName ?? '—'}</td>
                <td className="px-3 py-3 text-muted-foreground">
                  {recurrence.categoryName ?? 'Sin categoría'}
                </td>
                <td className="px-3 py-3 text-right font-semibold text-foreground">
                  {formatCurrency(recurrence.amount, recurrence.currency)}
                </td>
                <td className="px-3 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    {deleted ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onRestore(recurrence)}
                        aria-label={`Restaurar ${recurrence.name}`}
                      >
                        <RotateCcw aria-hidden="true" className="h-4 w-4" />
                      </Button>
                    ) : (
                      <>
                        <RecurrenceToggleButton recurrence={recurrence} onToggle={onToggle} />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(recurrence)}
                          aria-label={`Editar ${recurrence.name}`}
                        >
                          <Pencil aria-hidden="true" className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(recurrence)}
                          aria-label={`Eliminar ${recurrence.name}`}
                        >
                          <Trash2 aria-hidden="true" className="h-4 w-4" />
                        </Button>
                      </>
                    )}
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
