'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Account } from '@/types/account';
import type { ObligationFilters as Filters } from '@/types/obligation';

interface Props {
  filters: Filters;
  accounts: Account[];
  categories: import('@/types/category').Category[];
  onChange: (filters: Filters) => void;
  onReset: () => void;
}

export function ObligationFilters({ filters, accounts, onChange, onReset }: Props) {
  const update = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
      <div>
        <Label htmlFor="filter-status">Estado</Label>
        <Select value={filters.status ?? '__all__'} onValueChange={(v) => update({ status: v === '__all__' ? undefined : (v as Filters['status']) })}>
          <SelectTrigger id="filter-status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos</SelectItem><SelectItem value="PENDING">Pendiente</SelectItem><SelectItem value="PARTIALLY_PAID">Parcial</SelectItem><SelectItem value="PAID">Pagada</SelectItem><SelectItem value="OVERDUE">Vencida</SelectItem><SelectItem value="CANCELLED">Cancelada</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="filter-account">Cuenta</Label>
        <Select value={filters.accountId ?? '__all__'} onValueChange={(v) => update({ accountId: v === '__all__' ? undefined : v })}>
          <SelectTrigger id="filter-account"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="__all__">Todas</SelectItem>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label htmlFor="filter-from">Desde</Label><Input id="filter-from" type="date" value={filters.from ?? ''} onChange={(e) => update({ from: e.target.value || undefined })} /></div>
      <div><Label htmlFor="filter-to">Hasta</Label><Input id="filter-to" type="date" value={filters.to ?? ''} onChange={(e) => update({ to: e.target.value || undefined })} /></div>
      <div className="flex items-end gap-2 md:col-span-2 lg:col-span-4">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(filters.overdue)} onChange={(e) => update({ overdue: e.target.checked || undefined })} />Solo vencidas</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(filters.includeDeleted)} onChange={(e) => update({ includeDeleted: e.target.checked || undefined })} />Mostrar canceladas</label>
        <Button variant="ghost" size="sm" onClick={onReset}>Limpiar filtros</Button>
      </div>
    </div>
  );
}
