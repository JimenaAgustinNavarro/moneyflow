import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authenticatedRequest = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api-client', () => ({ authenticatedRequest }));

import {
  budgetKeys, useBudgets, useBudget, useBudgetUsage, useCreateBudget,
  useUpdateBudget, useDeleteBudget, useRestoreBudget, useCopyBudget,
} from './useBudgets';

function wrapperFor() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

describe('hooks de presupuestos', () => {
  beforeEach(() => authenticatedRequest.mockReset());

  it('consulta presupuestos con filtros y obtiene detalle y uso', async () => {
    authenticatedRequest.mockResolvedValue([]);
    const { wrapper } = wrapperFor();
    const budgets = renderHook(() => useBudgets({ status: 'OVER_LIMIT', active: true, includeDeleted: true }), { wrapper });
    await waitFor(() => expect(budgets.result.current.isSuccess).toBe(true));
    expect(authenticatedRequest).toHaveBeenCalledWith('/budgets?status=OVER_LIMIT&active=true&includeDeleted=true');

    renderHook(() => useBudget('budget-1'), { wrapper });
    renderHook(() => useBudgetUsage('budget-1'), { wrapper });
    await waitFor(() => expect(authenticatedRequest).toHaveBeenCalledWith('/budgets/budget-1'));
    expect(authenticatedRequest).toHaveBeenCalledWith('/budgets/budget-1/usage');
  });

  it('invalida presupuestos, cuentas y movimientos en las mutaciones', async () => {
    authenticatedRequest.mockResolvedValue({});
    const { queryClient, wrapper } = wrapperFor();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const create = renderHook(() => useCreateBudget(), { wrapper });
    const update = renderHook(() => useUpdateBudget(), { wrapper });
    const remove = renderHook(() => useDeleteBudget(), { wrapper });
    const restore = renderHook(() => useRestoreBudget(), { wrapper });
    const copy = renderHook(() => useCopyBudget(), { wrapper });
    const input = { name: 'Hogar', limit: '500.00', periodType: 'MONTHLY' as const, startDate: '2026-10-01T00:00:00-05:00', categoryIds: ['11111111-1111-4111-8111-111111111111'] };

    await act(async () => {
      await create.result.current.mutateAsync(input);
      await update.result.current.mutateAsync({ id: 'budget-1', input: { limit: '600.00' } });
      await remove.result.current.mutateAsync('budget-1');
      await restore.result.current.mutateAsync('budget-1');
      await copy.result.current.mutateAsync({ id: 'budget-1', input: { startDate: '2026-11-01T00:00:00-05:00' } });
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: budgetKeys.all });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['accounts'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['transactions'] });
  });
});
