import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authenticatedRequest = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api-client', () => ({ authenticatedRequest }));

import {
  savingsGoalKeys,
  useContributions,
  useCreateContribution,
  useCreateSavingsGoal,
  useDeleteContribution,
  useDeleteSavingsGoal,
  useRestoreContribution,
  useRestoreSavingsGoal,
  useSavingsGoal,
  useSavingsGoals,
  useUpdateSavingsGoal,
} from './useSavingsGoals';
import type { SavingsGoal } from '@/types/savings-goal';

const goal: SavingsGoal = {
  id: 'goal-1',
  userId: 'user-1',
  name: 'Viaje',
  targetAmount: '1000.00',
  currentAmount: '250.00',
  percentage: 25,
  targetDate: null,
  accountId: null,
  status: 'ACTIVE',
  contributions: [],
  createdAt: '',
  updatedAt: '',
  deletedAt: null,
};

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { queryClient, wrapper: Wrapper };
}

describe('hooks de metas de ahorro', () => {
  beforeEach(() => authenticatedRequest.mockReset());

  it('lista con filtros y carga el detalle y los aportes', async () => {
    authenticatedRequest
      .mockResolvedValueOnce({
        data: [goal],
        meta: { page: 2, limit: 10, total: 11, totalPages: 2 },
      })
      .mockResolvedValueOnce(goal)
      .mockResolvedValueOnce([]);
    const { wrapper } = createWrapper();
    const filters = {
      status: 'ACTIVE' as const,
      includeDeleted: true,
      page: 2,
      limit: 10,
    };
    const { result: list } = renderHook(() => useSavingsGoals(filters), { wrapper });
    const { result: detail } = renderHook(() => useSavingsGoal(goal.id), { wrapper });
    const { result: contributions } = renderHook(() => useContributions(goal.id), { wrapper });

    await waitFor(() => {
      expect(list.current.isSuccess).toBe(true);
      expect(detail.current.isSuccess).toBe(true);
      expect(contributions.current.isSuccess).toBe(true);
    });

    expect(authenticatedRequest).toHaveBeenNthCalledWith(
      1,
      '/savings-goals?status=ACTIVE&includeDeleted=true&page=2&limit=10',
    );
    expect(authenticatedRequest).toHaveBeenNthCalledWith(2, '/savings-goals/goal-1');
    expect(authenticatedRequest).toHaveBeenNthCalledWith(
      3,
      '/savings-goals/goal-1/contributions',
    );
    expect(list.current.data?.meta.totalPages).toBe(2);
  });

  it('ejecuta las mutaciones e invalida metas y cuentas', async () => {
    authenticatedRequest.mockResolvedValue(goal);
    const { queryClient, wrapper } = createWrapper();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const { result: create } = renderHook(() => useCreateSavingsGoal(), { wrapper });
    const { result: update } = renderHook(() => useUpdateSavingsGoal(), { wrapper });
    const { result: remove } = renderHook(() => useDeleteSavingsGoal(), { wrapper });
    const { result: restore } = renderHook(() => useRestoreSavingsGoal(), { wrapper });
    const { result: addContribution } = renderHook(
      () => useCreateContribution(goal.id),
      { wrapper },
    );
    const { result: removeContribution } = renderHook(
      () => useDeleteContribution(goal.id),
      { wrapper },
    );
    const { result: restoreContribution } = renderHook(
      () => useRestoreContribution(goal.id),
      { wrapper },
    );

    await act(async () => {
      await create.current.mutateAsync({ name: 'Viaje', targetAmount: '1000.00' });
      await update.current.mutateAsync({ id: goal.id, input: { name: 'Viaje nuevo' } });
      await remove.current.mutateAsync(goal.id);
      await restore.current.mutateAsync(goal.id);
      await addContribution.current.mutateAsync({
        amount: '10.00',
        date: '2026-11-13T00:00:00-05:00',
        type: 'DEPOSIT',
      });
      await removeContribution.current.mutateAsync('contribution-1');
      await restoreContribution.current.mutateAsync('contribution-1');
    });

    expect(authenticatedRequest).toHaveBeenCalledWith('/savings-goals', {
      method: 'POST',
      body: JSON.stringify({ name: 'Viaje', targetAmount: '1000.00' }),
    });
    expect(authenticatedRequest).toHaveBeenCalledWith('/savings-goals/goal-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Viaje nuevo' }),
    });
    expect(authenticatedRequest).toHaveBeenCalledWith('/savings-goals/goal-1/restore', {
      method: 'POST',
    });
    expect(authenticatedRequest).toHaveBeenCalledWith('/savings-goals/goal-1/contributions', {
      method: 'POST',
      body: JSON.stringify({
        amount: '10.00',
        date: '2026-11-13T00:00:00-05:00',
        type: 'DEPOSIT',
      }),
    });
    expect(authenticatedRequest).toHaveBeenCalledWith(
      '/savings-goals/goal-1/contributions/contribution-1',
      { method: 'DELETE' },
    );
    expect(authenticatedRequest).toHaveBeenCalledWith(
      '/savings-goals/goal-1/contributions/contribution-1/restore',
      { method: 'POST' },
    );
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: savingsGoalKeys.all });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['accounts'] });
    expect(invalidateQueries).toHaveBeenCalledTimes(14);
  });
});
