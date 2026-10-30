'use client';

import { Copy, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useBudgetUsage } from '@/hooks/useBudgets';
import { formatCurrency } from '@/lib/format-currency';
import type { Budget, BudgetPeriod } from '@/types/budget';

const PERIOD_LABELS: Record<BudgetPeriod, string> = {
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensual',
  QUARTERLY: 'Trimestral',
  YEARLY: 'Anual',
};

const STATUS_COLORS = {
  UNDER_LIMIT: {
    bar: 'bg-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    label: 'Bajo control',
  },
  NEAR_LIMIT: {
    bar: 'bg-yellow-500',
    text: 'text-yellow-600 dark:text-yellow-400',
    label: 'Cerca del límite',
  },
  OVER_LIMIT: {
    bar: 'bg-rose-500',
    text: 'text-rose-600 dark:text-rose-400',
    label: 'Excedido',
  },
};

interface Props {
  budget: Budget;
  onEdit: (b: Budget) => void;
  onCopy: (b: Budget) => void;
  onDelete: (b: Budget) => void;
  onRestore: (b: Budget) => void;
}

export function BudgetCard({ budget, onEdit, onCopy, onDelete, onRestore }: Props) {
  const usageQuery = useBudgetUsage(budget.id);
  const usage = usageQuery.data;
  const deleted = Boolean(budget.deletedAt);

  const percentage = usage?.percentage ?? 0;
  const status = usage?.status ?? 'UNDER_LIMIT';
  const colors = STATUS_COLORS[status];
  const barWidth = Math.min(percentage, 100);

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base">{budget.name}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {PERIOD_LABELS[budget.periodType]} ·{' '}
            {new Date(budget.startDate).toLocaleDateString('es-PE', {
              timeZone: 'America/Lima',
            })}
            {budget.endDate && ` → ${new Date(budget.endDate).toLocaleDateString('es-PE', { timeZone: 'America/Lima' })}`}
          </p>
        </div>
        {deleted ? (
          <Button variant="ghost" size="icon" onClick={() => onRestore(budget)} aria-label="Restaurar">
            <RotateCcw className="h-4 w-4" />
          </Button>
        ) : (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => onEdit(budget)} aria-label="Editar">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onCopy(budget)} aria-label="Duplicar">
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(budget)} aria-label="Eliminar">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-semibold text-foreground">
            {formatCurrency(budget.limit, budget.currency)}
          </span>
          <span className="text-xs text-muted-foreground">
            Límite {PERIOD_LABELS[budget.periodType].toLowerCase()}
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className={colors.text}>
              {usage
                ? `${formatCurrency(usage.spent, budget.currency)} · ${percentage.toFixed(1)}%`
                : 'Cargando...'}
            </span>
            <span className={colors.text}>{usage ? colors.label : ''}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full ${colors.bar} transition-all`}
              style={{ width: `${barWidth}%` }}
            />
          </div>
          {percentage > 100 && (
            <p className="text-xs text-rose-600 dark:text-rose-400">
              Excedido por{' '}
              {formatCurrency(
                (Number(usage?.spent ?? 0) - Number(budget.limit)).toFixed(2),
                budget.currency,
              )}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-1">
          {budget.categories.map((c) => (
            <span
              key={c.id}
              className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            >
              {c.name}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
