'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { authenticatedRequest } from '@/lib/api-client';
import type {
  CreateTransferInput,
  TransferListResponse,
  TransferResponse,
  UpdateTransferInput,
} from '@/types/transfer';

export interface TransferFilters {
  accountId?: string;
  from?: string;
  to?: string;
  includeCancelled?: boolean;
  page?: number;
  limit?: number;
}

export const transferKeys = {
  all: ['transfers'] as const,
  list: (filters: TransferFilters) => [...transferKeys.all, 'list', filters] as const,
  detail: (id: string) => [...transferKeys.all, 'detail', id] as const,
};

function buildQuery(filters: TransferFilters): string {
  const params = new URLSearchParams();
  if (filters.accountId) params.set('accountId', filters.accountId);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.includeCancelled) params.set('includeCancelled', 'true');
  params.set('page', String(filters.page ?? 1));
  params.set('limit', String(filters.limit ?? 20));
  return `?${params.toString()}`;
}

export function useTransfers(filters: TransferFilters = {}) {
  return useQuery({
    queryKey: transferKeys.list(filters),
    queryFn: () => authenticatedRequest<TransferListResponse>(`/transfers${buildQuery(filters)}`),
  });
}

export function useTransfer(id: string | null | undefined) {
  return useQuery({
    queryKey: transferKeys.detail(id ?? ''),
    queryFn: () => authenticatedRequest<TransferResponse>(`/transfers/${id}`),
    enabled: Boolean(id),
  });
}

function useInvalidateTransferQueries() {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: transferKeys.all }),
      queryClient.invalidateQueries({ queryKey: ['accounts'] }),
    ]);
  };
}

export function useCreateTransfer() {
  const invalidate = useInvalidateTransferQueries();
  return useMutation({
    mutationFn: (input: CreateTransferInput) =>
      authenticatedRequest<TransferResponse>('/transfers', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });
}

interface UpdateTransferVariables {
  id: string;
  input: UpdateTransferInput;
}

export function useUpdateTransfer() {
  const invalidate = useInvalidateTransferQueries();
  return useMutation({
    mutationFn: ({ id, input }: UpdateTransferVariables) =>
      authenticatedRequest<TransferResponse>(`/transfers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });
}

export function useDeleteTransfer() {
  const invalidate = useInvalidateTransferQueries();
  return useMutation({
    mutationFn: (id: string) =>
      authenticatedRequest<void>(`/transfers/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: invalidate,
  });
}
