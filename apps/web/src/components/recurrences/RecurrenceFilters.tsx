'use client';

import { Button } from '@/components/ui/button';
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
import type { RecurrenceFilters as Filters, RecurrenceType } from '@/types/recurrence';

interface RecurrenceFiltersProps {
  filters: Filters;
  accounts: Account[];
  categories: Category[];
  onChange: (filters: Filters) => void;
  onReset: () => void;
}

export function RecurrenceFilters({
  filters,
  accounts,
  categories,
  onChange,
  onReset,
}: RecurrenceFiltersProps) {
  const update = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
      <div className="space-y-2">
        <Label htmlFor="recurrence-filter-active">Estado</Label>
        <Select
          value={filters.active === undefined ? '__all__' : String(filters.active)}
          onValueChange={(value) =>
            update({ active: value === '__all__' ? undefined : value === 'true' })
          }
        >
          <SelectTrigger id="recurrence-filter-active" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas</SelectItem>
            <SelectItem value="true">Activas</SelectItem>
            <SelectItem value="false">Inactivas</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="recurrence-filter-type">Tipo</Label>
        <Select
          value={filters.type ?? '__all__'}
          onValueChange={(value) =>
            update({ type: value === '__all__' ? undefined : (value as RecurrenceType) })
          }
        >
          <SelectTrigger id="recurrence-filter-type" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos</SelectItem>
            <SelectItem value="INCOME">Ingreso</SelectItem>
            <SelectItem value="EXPENSE">Egreso</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="recurrence-filter-account">Cuenta</Label>
        <Select
          value={filters.accountId ?? '__all__'}
          onValueChange={(value) => update({ accountId: value === '__all__' ? undefined : value })}
        >
          <SelectTrigger id="recurrence-filter-account" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas</SelectItem>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="recurrence-filter-category">Categoría</Label>
        <Select
          value={filters.categoryId ?? '__all__'}
          onValueChange={(value) => update({ categoryId: value === '__all__' ? undefined : value })}
        >
          <SelectTrigger id="recurrence-filter-category" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-end gap-3 pb-0.5">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(filters.includeDeleted)}
            onChange={(event) => update({ includeDeleted: event.target.checked || undefined })}
          />
          Mostrar eliminadas
        </label>
      </div>
      <div className="md:col-span-2 lg:col-span-5">
        <Button type="button" variant="ghost" size="sm" onClick={onReset}>Limpiar filtros</Button>
      </div>
    </div>
  );
}
