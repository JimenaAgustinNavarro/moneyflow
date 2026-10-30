'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format-currency';
import type { TopBudget } from '@/types/dashboard';

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
  budgets: TopBudget[];
  isLoading: boolean;
}

export function TopBudgets({ budgets, isLoading }: Props) {
  const items = budgets.slice(0, 3);

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Presupuestos</CardTitle>
        <Link
          href="/budgets"
          className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
        >
          Ver todos
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="py-4 text-sm text-muted-foreground">Cargando...</p>
        ) : items.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            Sin presupuestos activos.{' '}
            <Link href="/budgets" className="underline">
              Crear uno
            </Link>
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((budget) => {
              const colors = STATUS_COLORS[budget.status];
              const barWidth = Math.min(budget.percentage, 100);
              return (
                <li key={budget.id} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-foreground">{budget.name}</span>
                    <span className={colors.text}>{budget.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full ${colors.bar} transition-all`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {formatCurrency(budget.spent, budget.currency)} / {formatCurrency(budget.limit, budget.currency)}
                    </span>
                    <span className={colors.text}>{colors.label}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
