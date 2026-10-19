'use client';

import { ArrowLeft, Calculator, Pencil } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Animated } from '@/components/ui/motion';
import { getAccountTypeLabel } from '@/lib/account-type-labels';
import { formatCurrency } from '@/lib/format-currency';
import type { Account } from '@/types/account';

interface AccountDetailProps {
  account: Account;
  onEdit: () => void;
  onRecalculate: () => void;
  isRecalculating?: boolean;
}

export function AccountDetail({
  account,
  onEdit,
  onRecalculate,
  isRecalculating = false,
}: AccountDetailProps) {
  return (
    <Animated variant="slideUp" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost">
          <Link href="/accounts">
            <ArrowLeft aria-hidden="true" className="mr-2 h-4 w-4" />
            Volver a cuentas
          </Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onEdit}>
            <Pencil aria-hidden="true" className="mr-2 h-4 w-4" />
            Editar
          </Button>
          <Button onClick={onRecalculate} disabled={isRecalculating}>
            <Calculator aria-hidden="true" className="mr-2 h-4 w-4" />
            {isRecalculating ? 'Recalculando...' : 'Recalcular saldo'}
          </Button>
        </div>
      </div>

      <Card className="border border-border/80 bg-card/80 shadow-sm">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{account.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {getAccountTypeLabel(account.type)}
              </p>
            </div>
            {account.archived && (
              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-600 dark:text-amber-300">
                Archivada
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Saldo actual</p>
            <p className="mt-1 text-4xl font-bold tracking-tight text-foreground">
              {formatCurrency(account.balance, account.currency)}
            </p>
          </div>
          <dl className="grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Moneda</dt>
              <dd className="font-medium text-foreground">{account.currency}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Saldo inicial</dt>
              <dd className="font-medium text-foreground">
                {formatCurrency(account.initialBalance, account.currency)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Creada</dt>
              <dd className="font-medium text-foreground">
                {new Date(account.createdAt).toLocaleDateString('es-PE')}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </Animated>
  );
}
