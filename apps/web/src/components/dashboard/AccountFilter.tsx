'use client';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAccounts } from '@/hooks/useAccounts';

interface AccountFilterProps {
  value: string | undefined;
  onChange: (accountId: string | undefined) => void;
}

export function AccountFilter({ value, onChange }: AccountFilterProps) {
  const { data: accounts = [], isLoading, error } = useAccounts(false);

  if (error) {
    return (
      <p role="alert" className="text-xs text-destructive">
        No se pudieron cargar las cuentas.
      </p>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Label htmlFor="account-filter" className="text-xs">
        Cuenta
      </Label>
      <Select
        value={value ?? '__all__'}
        onValueChange={(accountId) => onChange(accountId === '__all__' ? undefined : accountId)}
        disabled={isLoading}
      >
        <SelectTrigger id="account-filter" className="w-full md:w-48">
          <SelectValue placeholder="Todas las cuentas" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Todas las cuentas</SelectItem>
          {accounts.map((account) => (
            <SelectItem key={account.id} value={account.id}>
              {account.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
