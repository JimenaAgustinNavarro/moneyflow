import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authenticatedRequest = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api-client', () => ({ authenticatedRequest }));

import {
  transactionKeys,
  useCreateTransaction,
  useDeleteTransaction,
  useRestoreTransaction,
  useTransaction,
  useTransactions,
  useUpdateTransaction,
} from './useTransactions';
import type { Transaction, TransactionListResponse } from '@/types/transaction';

const transaction: Transaction = {
  id: 'transaction-1',
  accountId: 'account-1',
  categoryId: 'category-1',
  type: 'EXPENSE',
  amount: '15.50',
  currency: 'PEN',
  description: 'Almuerzo',
  date: '2026-10-23T10:00:00.000Z',
  status: 'CONFIRMED',
  transferId: null,
  counterpartAccountId: null,
  obligationId: null,
  createdAt: '2026-10-23T10:00:00.000Z',
  updatedAt: '2026-10-23T10:00:00.000Z',
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return { queryClient, wrapper: Wrapper };
}

describe('hooks de movimientos', () => {
  beforeEach(() => {
    authenticatedRequest.mockReset();
  });

  it('consulta la lista paginada con todos los filtros y el detalle por id', async () => {
    const response: TransactionListResponse = {
      data: [transaction],
      meta: { page: 2, limit: 10, total: 11, totalPages: 2 },
    };
    authenticatedRequest.mockResolvedValueOnce(response).mockResolvedValueOnce(transaction);
    const { wrapper } = createWrapper();
    const filters = {
      accountId: 'account-1',
      categoryId: 'category-1',
      type: 'EXPENSE' as const,
      from: '2026-10-01',
      to: '2026-10-31',
      page: 2,
      limit: 10,
    };

    const { result: list } = renderHook(() => useTransactions(filters), { wrapper });
    await waitFor(() => expect(list.current.isSuccess).toBe(true));
    expect(list.current.data).toEqual(response);

    const { result: detail } = renderHook(() => useTransaction(transaction.id), { wrapper });
    await waitFor(() => expect(detail.current.isSuccess).toBe(true));

    expect(authenticatedRequest).toHaveBeenNthCalledWith(
      1,
      '/transactions?accountId=account-1&categoryId=category-1&type=EXPENSE&from=2026-10-01&to=2026-10-31&page=2&limit=10',
    );
    expect(authenticatedRequest).toHaveBeenNthCalledWith(2, '/transactions/transaction-1');
    expect(transactionKeys.list(filters)).toEqual([
      'transactions',
      'list',
      {
        accountId: 'account-1',
        categoryId: 'category-1',
        type: 'EXPENSE',
        from: '2026-10-01',
        to: '2026-10-31',
        page: 2,
        limit: 10,
      },
    ]);
  });

  it('usa valores por defecto y omite filtros vacíos en la consulta', async () => {
    authenticatedRequest.mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useTransactions({}), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(authenticatedRequest).toHaveBeenCalledWith('/transactions?page=1&limit=20');
  });

  it('invalida movimientos y cuentas después de todas las mutaciones', async () => {
    authenticatedRequest.mockResolvedValue(transaction);
    const { queryClient, wrapper } = createWrapper();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const { result: create } = renderHook(() => useCreateTransaction(), { wrapper });
    const { result: update } = renderHook(() => useUpdateTransaction(), { wrapper });
    const { result: remove } = renderHook(() => useDeleteTransaction(), { wrapper });
    const { result: restore } = renderHook(() => useRestoreTransaction(), { wrapper });

    await act(async () => {
      await create.current.mutateAsync({
        accountId: 'account-1',
        categoryId: 'category-1',
        type: 'EXPENSE',
        amount: '15.50',
        date: '2026-10-23',
      });
      await update.current.mutateAsync({
        id: transaction.id,
        input: { amount: '20.00' },
      });
      await remove.current.mutateAsync(transaction.id);
      await restore.current.mutateAsync(transaction.id);
    });

    expect(authenticatedRequest).toHaveBeenNthCalledWith(1, '/transactions', {
      method: 'POST',
      body: JSON.stringify({
        accountId: 'account-1',
        categoryId: 'category-1',
        type: 'EXPENSE',
        amount: '15.50',
        date: '2026-10-23',
      }),
    });
    expect(authenticatedRequest).toHaveBeenNthCalledWith(2, '/transactions/transaction-1', {
      method: 'PATCH',
      body: JSON.stringify({ amount: '20.00' }),
    });
    expect(authenticatedRequest).toHaveBeenNthCalledWith(3, '/transactions/transaction-1', {
      method: 'DELETE',
    });
    expect(authenticatedRequest).toHaveBeenNthCalledWith(4, '/transactions/transaction-1/restore', {
      method: 'POST',
    });
    expect(invalidateQueries).toHaveBeenCalledTimes(8);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: transactionKeys.all });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['accounts'] });
  });
});
