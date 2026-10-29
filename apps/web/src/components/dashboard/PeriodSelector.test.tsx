import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { DashboardFilters } from '@/types/dashboard';

import { PeriodSelector } from './PeriodSelector';

describe('PeriodSelector', () => {
  it('renderiza cuatro períodos', () => {
    render(<PeriodSelector filters={{ period: 'month' }} onChange={vi.fn()} />);

    expect(screen.getAllByRole('button')).toHaveLength(4);
  });

  it('cambia al mes anterior y descarta los filtros del período previo', () => {
    const onChange = vi.fn();
    render(
      <PeriodSelector
        filters={{ period: 'custom', from: '2026-10-01', to: '2026-10-31' }}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mes anterior' }));

    expect(onChange).toHaveBeenCalledWith({ period: 'last_month' });
  });

  it('muestra campos de fecha y preserva los filtros al elegir Custom', () => {
    const onChange = vi.fn();
    const filters: DashboardFilters = { period: 'month', accountId: 'account-1' };
    const { rerender } = render(<PeriodSelector filters={filters} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Custom' }));

    expect(onChange).toHaveBeenCalledWith({ ...filters, period: 'custom' });
    rerender(
      <PeriodSelector filters={{ ...filters, period: 'custom' }} onChange={onChange} />,
    );
    expect(screen.getByLabelText('Desde')).toBeInTheDocument();
    expect(screen.getByLabelText('Hasta')).toBeInTheDocument();
  });

  it('notifica cambios en las fechas personalizadas', () => {
    const onChange = vi.fn();
    const filters: DashboardFilters = {
      period: 'custom',
      from: '2026-10-01',
      to: '2026-10-31',
    };
    render(<PeriodSelector filters={filters} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-10-05' } });

    expect(onChange).toHaveBeenCalledWith({ ...filters, from: '2026-10-05' });
  });

  it('marca el período activo con el estilo predeterminado', () => {
    render(<PeriodSelector filters={{ period: 'last_month' }} onChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Mes anterior' })).toHaveAttribute(
      'data-variant',
      'default',
    );
    expect(screen.getByRole('button', { name: 'Mes actual' })).toHaveAttribute(
      'data-variant',
      'outline',
    );
  });
});
