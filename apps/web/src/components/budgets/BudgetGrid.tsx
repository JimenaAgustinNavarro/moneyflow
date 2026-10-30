'use client';

import { BudgetCard } from './BudgetCard';
import type { Budget } from '@/types/budget';

interface Props {
  budgets: Budget[];
  onEdit: (b: Budget) => void;
  onCopy: (b: Budget) => void;
  onDelete: (b: Budget) => void;
  onRestore: (b: Budget) => void;
  isLoading?: boolean;
}

export function BudgetGrid({
  budgets, onEdit, onCopy, onDelete, onRestore, isLoading,
}: Props) {
  if (isLoading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Cargando presupuestos...</p>;
  }
  if (budgets.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No hay presupuestos. Crea el primero.
      </p>
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {budgets.map((b) => (
        <BudgetCard
          key={b.id}
          budget={b}
          onEdit={onEdit}
          onCopy={onCopy}
          onDelete={onDelete}
          onRestore={onRestore}
        />
      ))}
    </div>
  );
}
