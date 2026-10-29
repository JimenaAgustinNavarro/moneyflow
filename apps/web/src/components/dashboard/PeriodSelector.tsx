'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { DashboardFilters, DashboardPeriod } from '@/types/dashboard';

interface PeriodSelectorProps {
  filters: DashboardFilters;
  onChange: (filters: DashboardFilters) => void;
}

const PRESETS: { label: string; value: DashboardPeriod }[] = [
  { label: 'Mes actual', value: 'month' },
  { label: 'Mes anterior', value: 'last_month' },
  { label: 'Últimos 3 meses', value: 'last_3_months' },
  { label: 'Custom', value: 'custom' },
];

export function PeriodSelector({ filters, onChange }: PeriodSelectorProps) {
  const setPeriod = (period: DashboardPeriod) => {
    onChange(period === 'custom' ? { ...filters, period } : { period });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map(({ label, value }) => (
          <Button
            key={value}
            type="button"
            variant={filters.period === value ? 'default' : 'outline'}
            size="sm"
            aria-pressed={filters.period === value}
            onClick={() => setPeriod(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      {filters.period === 'custom' && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="dashboard-from" className="text-xs">
              Desde
            </Label>
            <Input
              id="dashboard-from"
              type="date"
              value={filters.from ?? ''}
              onChange={(event) => onChange({ ...filters, from: event.target.value || undefined })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="dashboard-to" className="text-xs">
              Hasta
            </Label>
            <Input
              id="dashboard-to"
              type="date"
              value={filters.to ?? ''}
              onChange={(event) => onChange({ ...filters, to: event.target.value || undefined })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
