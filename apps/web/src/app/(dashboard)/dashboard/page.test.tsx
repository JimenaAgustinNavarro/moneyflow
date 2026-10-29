import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DashboardSummary } from '@/types/dashboard';

const mocks = vi.hoisted(() => ({
  useDashboardSummary: vi.fn(),
  useAccounts: vi.fn(),
}));

vi.mock('@/hooks/useDashboardSummary', () => ({
  useDashboardSummary: mocks.useDashboardSummary,
}));

vi.mock('@/hooks/useAccounts', () => ({
  useAccounts: mocks.useAccounts,
}));

import DashboardPage from './page';

Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
  configurable: true,
  value: () => false,
});
Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
  configurable: true,
  value: () => undefined,
});
Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
  configurable: true,
  value: () => undefined,
});

const summary: DashboardSummary = {
  period: {
    from: '2026-10-01T00:00:00.000-05:00',
    to: '2026-10-31T23:59:59.999-05:00',
  },
  totalBalance: '1500.00',
  periodIncome: '300.00',
  periodExpense: '100.00',
  netFlow: '200.00',
  topCategories: [],
  recentTransactions: [
    {
      id: 'transaction-1',
      type: 'EXPENSE',
      amount: '45.00',
      currency: 'PEN',
      date: '2026-10-28T12:30:00.000-05:00',
      description: 'Almuerzo',
      categoryId: 'category-1',
      categoryName: 'Alimentación',
    },
  ],
  committedMoney: null,
  upcomingPayments: [],
  topBudgets: [],
};

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <DashboardPage />
    </QueryClientProvider>,
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    mocks.useDashboardSummary.mockReset();
    mocks.useAccounts.mockReset();
    mocks.useAccounts.mockReturnValue({
      data: [{ id: 'account-1', name: 'Cuenta principal' }],
      isLoading: false,
      error: null,
    });
  });

  it('muestra las cuatro tarjetas, el selector y movimientos reales', () => {
    mocks.useDashboardSummary.mockReturnValue({
      data: summary,
      isLoading: false,
      error: null,
    });

    renderDashboard();

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByText('Saldo total')).toBeInTheDocument();
    expect(screen.getByText('Ingresos del período')).toBeInTheDocument();
    expect(screen.getByText('Egresos del período')).toBeInTheDocument();
    expect(screen.getByText('Flujo neto')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mes actual' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('combobox', { name: 'Cuenta' })).toHaveTextContent(
      'Todas las cuentas',
    );
    expect(screen.getByText('Almuerzo')).toBeInTheDocument();
    expect(screen.getByText('Alimentación')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Nuevo movimiento' })).toHaveAttribute(
      'href',
      '/transactions',
    );
    expect(screen.getByRole('link', { name: 'Nueva transferencia' })).toHaveAttribute(
      'href',
      '/transactions',
    );
    expect(screen.getByRole('link', { name: 'Cuentas' })).toHaveAttribute('href', '/accounts');
    expect(screen.getByRole('link', { name: 'Categorías' })).toHaveAttribute(
      'href',
      '/categories',
    );
  });

  it('actualiza el filtro de cuenta usado por el resumen', async () => {
    mocks.useDashboardSummary.mockReturnValue({
      data: summary,
      isLoading: false,
      error: null,
    });

    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getByRole('combobox', { name: 'Cuenta' }));
    await user.click(await screen.findByRole('option', { name: 'Cuenta principal' }));

    await waitFor(() => {
      expect(mocks.useDashboardSummary).toHaveBeenLastCalledWith({
        period: 'month',
        accountId: 'account-1',
      });
    });
  });

  it('muestra skeletons mientras carga el resumen', () => {
    mocks.useDashboardSummary.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    renderDashboard();

    expect(screen.getByLabelText('Cargando resumen')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Cargando movimientos...');
  });

  it('muestra un error de carga', () => {
    mocks.useDashboardSummary.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('No se pudo consultar el resumen'),
    });

    renderDashboard();

    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo consultar el resumen');
  });

  it('muestra el estado vacío si no hay movimientos', () => {
    mocks.useDashboardSummary.mockReturnValue({
      data: { ...summary, recentTransactions: [] },
      isLoading: false,
      error: null,
    });

    renderDashboard();

    expect(screen.getByText('No hay movimientos recientes.')).toBeInTheDocument();
  });
});
