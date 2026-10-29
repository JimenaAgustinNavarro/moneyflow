import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { formatCurrency } from '@/lib/format-currency';
import type { DashboardSummary } from '@/types/dashboard';

import { SummaryCards } from './SummaryCards';

const summary: DashboardSummary = {
  period: { from: '2026-10-01', to: '2026-10-31' },
  totalBalance: '1500.00',
  periodIncome: '300.00',
  periodExpense: '100.00',
  netFlow: '200.00',
  topCategories: [],
  recentTransactions: [],
  committedMoney: null,
  upcomingPayments: [],
  topBudgets: [],
};

describe('SummaryCards', () => {
  it('renderiza las cuatro tarjetas con sus valores', () => {
    const { container } = render(<SummaryCards summary={summary} isLoading={false} />);

    expect(screen.getByText('Saldo total')).toBeInTheDocument();
    expect(screen.getByText('Ingresos del período')).toBeInTheDocument();
    expect(screen.getByText('Egresos del período')).toBeInTheDocument();
    expect(screen.getByText('Flujo neto')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-slot="card"]')).toHaveLength(4);
    expect(screen.getByText(formatCurrency('1500.00', 'PEN'))).toBeInTheDocument();
    expect(screen.getByText(formatCurrency('300.00', 'PEN'))).toBeInTheDocument();
    expect(screen.getByText(formatCurrency('100.00', 'PEN'))).toBeInTheDocument();
    expect(screen.getByText(formatCurrency('200.00', 'PEN'))).toBeInTheDocument();
  });

  it('muestra esqueletos durante la carga', () => {
    const { container } = render(<SummaryCards summary={undefined} isLoading />);

    expect(screen.getByLabelText('Cargando resumen')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-slot="card"]')).toHaveLength(4);
  });

  it('aplica tonos semánticos para ingresos, egresos y flujo neto', () => {
    const { rerender } = render(<SummaryCards summary={summary} isLoading={false} />);

    expect(screen.getByText(formatCurrency('300.00', 'PEN'))).toHaveClass('text-emerald-600');
    expect(screen.getByText(formatCurrency('100.00', 'PEN'))).toHaveClass('text-rose-600');
    expect(screen.getByText(formatCurrency('200.00', 'PEN'))).toHaveClass('text-emerald-600');

    rerender(<SummaryCards summary={{ ...summary, netFlow: '-50.00' }} isLoading={false} />);
    expect(screen.getByText(formatCurrency('-50.00', 'PEN'))).toHaveClass('text-rose-600');
  });
});
