import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authenticatedRequest = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api-client', () => ({ authenticatedRequest }));

import {
  transferKeys,
  useCreateTransfer,
  useDeleteTransfer,
  useTransfer,
  useTransfers,
  useUpdateTransfer,
} from './useTransfers';

const transfer = {
  id: 'transfer-1',
  originAccountId: 'account-1',
  destinationAccountId: 'account-2',
  amount: '25.50',
  currency: 'PEN',
  description: 'Ahorro',
  occurredAt: '2026-10-15T15:00:00.000Z',
  status: 'CONFIRMED' as const,
  cancelledAt: null,
  createdAt: '2026-10-15T15:00:00.000Z',
  updatedAt: '2026-10-15T15:00:00.000Z',
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return { wrapper: Wrapper, invalidateQueries };
}

describe('hooks de transferencias', () => {
  beforeEach(() => authenticatedRequest.mockReset());

  it('consulta lista y detalle con el contrato v2', async () => {
    authenticatedRequest
      .mockResolvedValueOnce({
        data: [transfer],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      })
      .mockResolvedValueOnce({ data: transfer });
    const { wrapper } = createWrapper();
    const filters = { accountId: 'account-1', page: 1, limit: 20 };
    const list = renderHook(() => useTransfers(filters), { wrapper });
    await waitFor(() => expect(list.result.current.isSuccess).toBe(true));
    expect(authenticatedRequest).toHaveBeenNthCalledWith(
      1,
      '/transfers?accountId=account-1&page=1&limit=20',
    );

    const detail = renderHook(() => useTransfer('transfer-1'), { wrapper });
    await waitFor(() => expect(detail.result.current.isSuccess).toBe(true));
    expect(authenticatedRequest).toHaveBeenNthCalledWith(2, '/transfers/transfer-1');
  });

  it('crea y actualiza transferencias e invalida transfers y cuentas', async () => {
    authenticatedRequest.mockResolvedValue({ data: transfer });
    const { wrapper, invalidateQueries } = createWrapper();
    const create = renderHook(() => useCreateTransfer(), { wrapper });
    const input = {
      originAccountId: 'account-1',
      destinationAccountId: 'account-2',
      amount: '25.50',
      date: '2026-10-15T00:00:00-05:00',
    };

    await act(async () => create.result.current.mutateAsync(input));
    expect(authenticatedRequest).toHaveBeenCalledWith('/transfers', {
      method: 'POST',
      body: JSON.stringify(input),
    });

    const update = renderHook(() => useUpdateTransfer(), { wrapper });
    await act(async () =>
      update.result.current.mutateAsync({ id: 'transfer-1', input: { amount: '10.00' } }),
    );
    expect(authenticatedRequest).toHaveBeenLastCalledWith('/transfers/transfer-1', {
      method: 'PATCH',
      body: JSON.stringify({ amount: '10.00' }),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: transferKeys.all });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['accounts'] });
  });

  it('cancela una transferencia e invalida transfers y cuentas', async () => {
    authenticatedRequest.mockResolvedValue(undefined);
    const { wrapper, invalidateQueries } = createWrapper();
    const { result } = renderHook(() => useDeleteTransfer(), { wrapper });

    await act(async () => result.current.mutateAsync('transfer-1'));

    expect(authenticatedRequest).toHaveBeenCalledWith('/transfers/transfer-1', {
      method: 'DELETE',
    });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: transferKeys.all });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['accounts'] });
  });
});
