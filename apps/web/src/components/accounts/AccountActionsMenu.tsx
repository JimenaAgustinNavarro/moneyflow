'use client';

import { MoreVertical } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Account } from '@/types/account';

interface AccountActionsMenuProps {
  account: Account;
  onEdit: (account: Account) => void;
  onRecalculate: (account: Account) => void;
  onToggleArchive: (account: Account) => void;
  isRecalculating?: boolean;
}

export function AccountActionsMenu({
  account,
  onEdit,
  onRecalculate,
  onToggleArchive,
  isRecalculating = false,
}: AccountActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Acciones de ${account.name}`}>
          <MoreVertical aria-hidden="true" className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(account)}>Editar</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onToggleArchive(account)}>
          {account.archived ? 'Desarchivar' : 'Archivar'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onRecalculate(account)} disabled={isRecalculating}>
          {isRecalculating ? 'Recalculando...' : 'Recalcular saldo'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
