'use client';

import Link from 'next/link';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Animated } from '@/components/ui/motion';
import { getAccountTypeLabel } from '@/lib/account-type-labels';
import { formatCurrency } from '@/lib/format-currency';
import type { Account } from '@/types/account';

import { AccountActionsMenu } from './AccountActionsMenu';

interface AccountCardProps {
  account: Account;
  onEdit: (account: Account) => void;
  onRecalculate: (account: Account) => void;
  onToggleArchive: (account: Account) => void;
  onRestore?: (account: Account) => void;
  isRecalculating?: boolean;
}

export function AccountCard({
  account,
  onEdit,
  onRecalculate,
  onToggleArchive,
  onRestore,
  isRecalculating,
}: AccountCardProps) {
  return (
    <Animated variant="fadeIn" className="h-full">
      <Card className="moneyflow-card-hover relative h-full border border-border/80 bg-card/80 shadow-sm hover:border-primary/20">
        <Link
          href={`/accounts/${account.id}`}
          className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <CardHeader className="flex flex-row items-start justify-between gap-2 pr-14">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-foreground">{account.name}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <span>{getAccountTypeLabel(account.type)}</span>
                {account.archived && (
                  <span className="inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 font-medium text-amber-600 dark:text-amber-300">
                    Archivada
                  </span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-bold tracking-tight text-foreground">
              {formatCurrency(account.balance, account.currency)}
            </p>
          </CardContent>
        </Link>
        <div className="absolute right-3 top-3" onClick={(event) => event.stopPropagation()}>
          <AccountActionsMenu
            account={account}
            onEdit={onEdit}
            onRecalculate={onRecalculate}
            onToggleArchive={onToggleArchive}
            onRestore={onRestore}
            isRecalculating={isRecalculating}
          />
        </div>
      </Card>
    </Animated>
  );
}
