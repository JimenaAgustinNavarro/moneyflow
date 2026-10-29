'use client';

import { Activity, TrendingDown, TrendingUp, Wallet } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format-currency';
import type { DashboardSummary } from '@/types/dashboard';

interface SummaryCardsProps {
  summary: DashboardSummary | undefined;
  isLoading: boolean;
}

interface CardSpec {
  title: string;
  value: string;
  Icon: typeof Wallet;
  colorClass: string;
}

export function SummaryCards({ summary, isLoading }: SummaryCardsProps) {
  if (isLoading) {
    return (
      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Cargando resumen"
      >
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} aria-hidden="true" className="border-border/60">
            <CardHeader>
              <CardTitle className="h-4 w-28 animate-pulse rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-32 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!summary) return null;

  const cards: CardSpec[] = [
    {
      title: 'Saldo total',
      value: formatCurrency(summary.totalBalance, 'PEN'),
      Icon: Wallet,
      colorClass: 'text-foreground',
    },
    {
      title: 'Ingresos del período',
      value: formatCurrency(summary.periodIncome, 'PEN'),
      Icon: TrendingUp,
      colorClass: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      title: 'Egresos del período',
      value: formatCurrency(summary.periodExpense, 'PEN'),
      Icon: TrendingDown,
      colorClass: 'text-rose-600 dark:text-rose-400',
    },
    {
      title: 'Flujo neto',
      value: formatCurrency(summary.netFlow, 'PEN'),
      Icon: Activity,
      colorClass:
        Number(summary.netFlow) >= 0
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-rose-600 dark:text-rose-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(({ title, value, Icon, colorClass }) => (
        <Card key={title} className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            <Icon aria-hidden="true" className={`h-4 w-4 ${colorClass}`} />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-semibold ${colorClass}`}>{value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
