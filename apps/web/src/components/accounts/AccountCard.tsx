'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Animated } from '@/components/ui/motion';
import { formatCurrency } from '@/lib/format-currency';
import type { Account, AccountType } from '@/types/account';

import { AccountActionsMenu } from './AccountActionsMenu';

const accountTypeLabels: Record<AccountType, string> = {
  CASH: 'Efectivo',
  BANK: 'Banco',
  WALLET: 'Billetera',
  CREDIT: 'Tarjeta de crédito',
};

interface AccountCardProps {
  account: Account;
  onEdit: (account: Account) => void;
  onRecalculate: (account: Account) => void;
  onToggleArchive: (account: Account) => void;
  isRecalculating?: boolean;
}

export function AccountCard({
  account,
  onEdit,
  onRecalculate,
  onToggleArchive,
  isRecalculating,
}: AccountCardProps) {
  return (
    <Animated variant="fadeIn" className="h-full">
      <Card className="moneyflow-card-hover h-full border border-border/80 bg-card/80 shadow-sm hover:border-primary/20">
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-foreground">{account.name}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <span>{accountTypeLabels[account.type]}</span>
              {account.archived && (
                <span className="inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 font-medium text-amber-600 dark:text-amber-300">
                  Archivada
                </span>
              )}
            </div>
          </div>
          <AccountActionsMenu
            account={account}
            onEdit={onEdit}
            onRecalculate={onRecalculate}
            onToggleArchive={onToggleArchive}
            isRecalculating={isRecalculating}
          />
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-2xl font-bold tracking-tight text-foreground">
            {formatCurrency(account.balance, account.currency)}
          </p>
        </CardContent>
      </Card>
    </Animated>
  );
}
