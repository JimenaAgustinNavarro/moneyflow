'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format-currency';
import type { UpcomingPayment } from '@/types/dashboard';

const STATUS_BADGES: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  PARTIALLY_PAID: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  OVERDUE: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  PARTIALLY_PAID: 'Parcial',
  OVERDUE: 'Vencida',
};

interface Props {
  payments: UpcomingPayment[];
  isLoading: boolean;
}

export function UpcomingPayments({ payments, isLoading }: Props) {
  const items = payments.slice(0, 5);

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Próximos pagos</CardTitle>
        <Link
          href="/obligations"
          className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
        >
          Ver todas
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="py-4 text-sm text-muted-foreground">Cargando...</p>
        ) : items.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            Sin obligaciones pendientes.{' '}
            <Link href="/obligations" className="underline">
              Crear una
            </Link>
          </p>
        ) : (
          <ul className="divide-y divide-border/50">
            {items.map((payment) => (
              <li key={payment.id} className="flex items-center justify-between py-2 text-sm">
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">{payment.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(payment.dueDate).toLocaleDateString('es-PE', {
                      timeZone: 'America/Lima',
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGES[payment.status]}`}>
                    {STATUS_LABELS[payment.status]}
                  </span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(payment.amount, payment.currency)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
