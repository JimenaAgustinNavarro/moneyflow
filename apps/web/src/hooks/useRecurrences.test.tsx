import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authenticatedRequest = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api-client', () => ({ authenticatedRequest }));

import {
  recurrenceKeys,
  useCreateRecurrence,
  useDeleteRecurrence,
  useRecurrences,
  useRestoreRecurrence,
  useToggleRecurrence,
  useUpdateRecurrence,
} from './useRecurrences';
import type { Recurrence } from '@/types/recurrence';

const recurrence: Recurrence = {
  id: 'recurrence-1', userId: 'user-1', name: 'Alquiler', type: 'EXPENSE',
  amount: '1200.00', currency: 'PEN', description: null, frequency: 'MONTHLY',
  dayOfPeriod: 1, startDate: '2026-01-01T00:00:00-05:00', endDate: null,
  nextDueDate: '2026-11-01T00:00:00-05:00', active: true,
  accountId: 'account-1', accountName: 'Cuenta principal', categoryId: null,
  categoryName: null, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', deletedAt: null,
};

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { queryClient, wrapper: Wrapper };
}

describe('hooks de recurrencias', () => {
  beforeEach(() => authenticatedRequest.mockReset());

  it('lista y filtra recurrencias', async () => {
    authenticatedRequest.mockResolvedValue({ data: [recurrence] });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useRecurrences({ active: true, type: 'EXPENSE', includeDeleted: true }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(authenticatedRequest).toHaveBeenCalledWith('/recurrences?active=true&type=EXPENSE&includeDeleted=true');
  });

  it('ejecuta las mutaciones e invalida recurrencias', async () => {
    authenticatedRequest.mockResolvedValue({ data: recurrence });
    const { queryClient, wrapper } = createWrapper();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const { result: create } = renderHook(() => useCreateRecurrence(), { wrapper });
    const { result: update } = renderHook(() => useUpdateRecurrence(), { wrapper });
    const { result: remove } = renderHook(() => useDeleteRecurrence(), { wrapper });
    const { result: restore } = renderHook(() => useRestoreRecurrence(), { wrapper });
    const { result: toggle } = renderHook(() => useToggleRecurrence(), { wrapper });
    const input = { name: 'Alquiler', type: 'EXPENSE' as const, amount: '1200.00', frequency: 'MONTHLY' as const, startDate: '2026-01-01', accountId: 'account-1' };

    await act(async () => {
      await create.current.mutateAsync(input);
      await update.current.mutateAsync({ id: recurrence.id, input: { amount: '1300.00' } });
      await remove.current.mutateAsync(recurrence.id);
      await restore.current.mutateAsync(recurrence.id);
      await toggle.current.mutateAsync(recurrence.id);
    });

    expect(authenticatedRequest).toHaveBeenCalledWith('/recurrences', { method: 'POST', body: JSON.stringify(input) });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: recurrenceKeys.all });
    expect(authenticatedRequest).toHaveBeenCalledWith('/recurrences/recurrence-1/restore', { method: 'POST' });
    expect(authenticatedRequest).toHaveBeenCalledWith('/recurrences/recurrence-1/toggle', { method: 'PATCH' });
  });
});
