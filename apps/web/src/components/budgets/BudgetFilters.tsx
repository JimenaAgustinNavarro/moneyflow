'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { BudgetFilters as Filters } from '@/types/budget';

interface Props {
  filters: Filters;
  onChange: (filters: Filters) => void;
  onReset: () => void;
}

export function BudgetFilters({ filters, onChange, onReset }: Props) {
  const update = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <div>
        <Label htmlFor="filter-status">Estado</Label>
        <Select
          value={filters.status ?? '__all__'}
          onValueChange={(v) =>
            update({ status: v === '__all__' ? undefined : (v as Filters['status']) })
          }
        >
          <SelectTrigger id="filter-status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos</SelectItem>
            <SelectItem value="UNDER_LIMIT">Bajo control</SelectItem>
            <SelectItem value="NEAR_LIMIT">Cerca del límite</SelectItem>
            <SelectItem value="OVER_LIMIT">Excedido</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="filter-active">Activo</Label>
        <Select
          value={filters.active === undefined ? '__all__' : String(filters.active)}
          onValueChange={(v) => update({ active: v === '__all__' ? undefined : v === 'true' })}
        >
          <SelectTrigger id="filter-active"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos</SelectItem>
            <SelectItem value="true">Activos</SelectItem>
            <SelectItem value="false">Inactivos</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-end gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(filters.includeDeleted)}
            onChange={(e) => update({ includeDeleted: e.target.checked || undefined })}
          />
          Mostrar eliminados
        </label>
        <Button variant="ghost" size="sm" onClick={onReset}>Limpiar</Button>
      </div>
    </div>
  );
}
