import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DashboardFilters, DashboardSummary } from '@/types/dashboard';

const authenticatedRequest = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api-client', () => ({ authenticatedRequest }));

import { dashboardKeys, useDashboardSummary } from './useDashboardSummary';

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

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return { queryClient, Wrapper };
}

describe('useDashboardSummary', () => {
  beforeEach(() => {
    authenticatedRequest.mockReset();
  });

  it('obtiene el resumen usando el contrato desenvuelto por api-client', async () => {
    authenticatedRequest.mockResolvedValue(summary);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useDashboardSummary({ period: 'month' }), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.data).toEqual(summary));
    expect(authenticatedRequest).toHaveBeenCalledWith('/dashboard/summary?period=month');
  });

  it('incluye todos los filtros en la clave de consulta', () => {
    const filters: DashboardFilters = {
      period: 'custom',
      from: '2026-10-01',
      to: '2026-10-31',
      accountId: 'account-1',
    };

    expect(dashboardKeys.summary(filters)).toEqual([
      'dashboard',
      'summary',
      filters,
    ]);
  });

  it('no consulta un período custom hasta que estén ambas fechas', () => {
    const { Wrapper } = createWrapper();
    renderHook(() => useDashboardSummary({ period: 'custom', from: '2026-10-01' }), {
      wrapper: Wrapper,
    });

    expect(authenticatedRequest).not.toHaveBeenCalled();
  });

  it('consulta cuando el período custom tiene ambas fechas', async () => {
    authenticatedRequest.mockResolvedValue(summary);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useDashboardSummary({
          period: 'custom',
          from: '2026-10-01',
          to: '2026-10-31',
        }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(authenticatedRequest).toHaveBeenCalledWith(
      '/dashboard/summary?period=custom&from=2026-10-01&to=2026-10-31',
    );
  });

  it('propaga errores de red al estado de error de React Query', async () => {
    const networkError = new Error('Error de red');
    authenticatedRequest.mockRejectedValue(networkError);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useDashboardSummary({ period: 'month' }), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.error).toBe(networkError));
  });

  it('vuelve a consultar cuando se invalida la clave global del dashboard', async () => {
    authenticatedRequest.mockResolvedValue(summary);
    const { queryClient, Wrapper } = createWrapper();
    const { result } = renderHook(() => useDashboardSummary({ period: 'month' }), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(authenticatedRequest).toHaveBeenCalledTimes(1);

    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    });

    await waitFor(() => expect(authenticatedRequest).toHaveBeenCalledTimes(2));
  });
});
