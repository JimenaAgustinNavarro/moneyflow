'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { authenticatedRequest } from '@/lib/api-client';
import type {
  CreateTransactionInput,
  Transaction,
  TransactionFilters,
  TransactionListResponse,
  UpdateTransactionInput,
} from '@/types/transaction';

export const transactionKeys = {
  all: ['transactions'] as const,
  list: (filters: TransactionFilters) =>
    [
      ...transactionKeys.all,
      'list',
      {
        accountId: filters.accountId,
        categoryId: filters.categoryId,
        type: filters.type,
        status: filters.status,
        from: filters.from,
        to: filters.to,
        page: filters.page ?? 1,
        limit: filters.limit ?? 20,
      },
    ] as const,
  detail: (id: string) => [...transactionKeys.all, 'detail', id] as const,
};

function buildQuery(filters: TransactionFilters): string {
  const params = new URLSearchParams();
  if (filters.accountId) params.set('accountId', filters.accountId);
  if (filters.categoryId) params.set('categoryId', filters.categoryId);
  if (filters.type) params.set('type', filters.type);
  if (filters.status) params.set('status', filters.status);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  params.set('page', String(filters.page ?? 1));
  params.set('limit', String(filters.limit ?? 20));
  return `?${params.toString()}`;
}

export function useTransactions(filters: TransactionFilters) {
  return useQuery({
    queryKey: transactionKeys.list(filters),
    queryFn: () =>
      authenticatedRequest<TransactionListResponse>(`/transactions${buildQuery(filters)}`),
  });
}

export function useTransaction(id: string | null | undefined) {
  return useQuery({
    queryKey: transactionKeys.detail(id ?? ''),
    queryFn: () => authenticatedRequest<Transaction>(`/transactions/${id}`),
    enabled: Boolean(id),
  });
}

function useInvalidateTransactionQueries() {
  const queryClient = useQueryClient();

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: transactionKeys.all }),
      queryClient.invalidateQueries({ queryKey: ['accounts'] }),
    ]);
  };
}

export function useCreateTransaction() {
  const invalidate = useInvalidateTransactionQueries();

  return useMutation({
    mutationFn: (input: CreateTransactionInput) =>
      authenticatedRequest<Transaction>('/transactions', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });
}

interface UpdateTransactionVariables {
  id: string;
  input: UpdateTransactionInput;
}

export function useUpdateTransaction() {
  const invalidate = useInvalidateTransactionQueries();

  return useMutation({
    mutationFn: ({ id, input }: UpdateTransactionVariables) =>
      authenticatedRequest<Transaction>(`/transactions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });
}

export function useDeleteTransaction() {
  const invalidate = useInvalidateTransactionQueries();

  return useMutation({
    mutationFn: (id: string) =>
      authenticatedRequest<void>(`/transactions/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}

export function useRestoreTransaction() {
  const invalidate = useInvalidateTransactionQueries();

  return useMutation({
    mutationFn: (id: string) =>
      authenticatedRequest<Transaction>(`/transactions/${id}/restore`, {
        method: 'POST',
      }),
    onSuccess: invalidate,
  });
}
