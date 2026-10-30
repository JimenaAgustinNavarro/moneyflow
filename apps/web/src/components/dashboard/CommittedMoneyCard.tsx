'use client';

import { CalendarClock } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format-currency';

interface Props {
  committedMoney: string | undefined;
  isLoading: boolean;
}

export function CommittedMoneyCard({ committedMoney, isLoading }: Props) {
  const isZero = committedMoney === '0.00' || committedMoney === '0';
  const colorClass = isZero
    ? 'text-foreground'
    : 'text-amber-600 dark:text-amber-400';

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Comprometido
        </CardTitle>
        <div className="flex items-center gap-2">
          <CalendarClock className={`h-4 w-4 ${colorClass}`} />
          <Link
            href="/obligations"
            className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            Ver todas
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading || committedMoney === undefined ? (
          <div className="h-8 w-24 animate-pulse rounded bg-muted" />
        ) : (
          <p className={`text-2xl font-semibold ${colorClass}`}>
            {formatCurrency(committedMoney, 'PEN')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
