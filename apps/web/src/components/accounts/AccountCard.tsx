'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-foreground">{account.name}</h2>
          <p className="text-xs text-muted-foreground">
            {accountTypeLabels[account.type]}
            {account.archived && ' · Archivada'}
          </p>
        </div>
        <AccountActionsMenu
          account={account}
          onEdit={onEdit}
          onRecalculate={onRecalculate}
          onToggleArchive={onToggleArchive}
          isRecalculating={isRecalculating}
        />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-foreground">
          {formatCurrency(account.balance, account.currency)}
        </p>
      </CardContent>
    </Card>
  );
}
