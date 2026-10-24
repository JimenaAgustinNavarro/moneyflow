'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Account } from '@/types/account';
import type { Category } from '@/types/category';
import type { TransactionFilters as Filters, TransactionType } from '@/types/transaction';

interface TransactionFiltersProps {
  filters: Filters;
  accounts: Account[];
  categories: Category[];
  onChange: (filters: Filters) => void;
  onReset: () => void;
}

function isTransactionType(value: string): value is TransactionType {
  return value === 'INCOME' || value === 'EXPENSE' || value === 'TRANSFER';
}

export function TransactionFilters({
  filters,
  accounts,
  categories,
  onChange,
  onReset,
}: TransactionFiltersProps) {
  const update = (patch: Partial<Filters>) => onChange({ ...filters, ...patch, page: 1 });

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
      <div className="space-y-2">
        <Label htmlFor="filter-account">Cuenta</Label>
        <Select
          value={filters.accountId ?? '__all__'}
          onValueChange={(value) => update({ accountId: value === '__all__' ? undefined : value })}
        >
          <SelectTrigger id="filter-account" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas</SelectItem>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="filter-category">Categoría</Label>
        <Select
          value={filters.categoryId ?? '__all__'}
          onValueChange={(value) => update({ categoryId: value === '__all__' ? undefined : value })}
        >
          <SelectTrigger id="filter-category" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="filter-type">Tipo</Label>
        <Select
          value={filters.type ?? '__all__'}
          onValueChange={(value) =>
            update({
              type: value === '__all__' || !isTransactionType(value) ? undefined : value,
            })
          }
        >
          <SelectTrigger id="filter-type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos</SelectItem>
            <SelectItem value="INCOME">Ingreso</SelectItem>
            <SelectItem value="EXPENSE">Egreso</SelectItem>
            <SelectItem value="TRANSFER">Transferencia</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="filter-from">Desde</Label>
        <Input
          id="filter-from"
          type="date"
          value={filters.from ?? ''}
          onChange={(event) => update({ from: event.target.value || undefined })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="filter-to">Hasta</Label>
        <Input
          id="filter-to"
          type="date"
          value={filters.to ?? ''}
          onChange={(event) => update({ to: event.target.value || undefined })}
        />
      </div>

      <div className="md:col-span-2 lg:col-span-5">
        <Button type="button" variant="ghost" size="sm" onClick={onReset}>
          Limpiar filtros
        </Button>
      </div>
    </div>
  );
}
