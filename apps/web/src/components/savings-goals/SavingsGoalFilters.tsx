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
import type { SavingsGoalFilters as Filters, SavingsGoalStatus } from '@/types/savings-goal';

interface Props {
  filters: Filters;
  onChange: (filters: Filters) => void;
  onReset: () => void;
}

export function SavingsGoalFilters({ filters, onChange, onReset }: Props) {
  const update = (patch: Partial<Filters>) =>
    onChange({ ...filters, ...patch, page: 1 });

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <div>
        <Label htmlFor="savings-goal-status">Estado</Label>
        <Select
          value={filters.status ?? '__all__'}
          onValueChange={(value) =>
            update({
              status: value === '__all__' ? undefined : value as SavingsGoalStatus,
            })
          }
        >
          <SelectTrigger id="savings-goal-status" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos</SelectItem>
            <SelectItem value="ACTIVE">Activas</SelectItem>
            <SelectItem value="COMPLETED">Completadas</SelectItem>
            <SelectItem value="CANCELLED">Canceladas</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-end gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(filters.includeDeleted)}
            onChange={(event) =>
              update({ includeDeleted: event.target.checked || undefined })
            }
          />
          Mostrar eliminadas
        </label>
        <Button type="button" variant="ghost" size="sm" onClick={onReset}>
          Limpiar
        </Button>
      </div>
    </div>
  );
}
