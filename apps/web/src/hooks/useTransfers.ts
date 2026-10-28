'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { authenticatedRequest } from '@/lib/api-client';
import type { CreateTransferInput, TransferResponse, UpdateTransferInput } from '@/types/transfer';

export function useCreateTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTransferInput) =>
      authenticatedRequest<TransferResponse>('/transfers', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['accounts'] }),
      ]);
    },
  });
}

export function useUpdateTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ transferId, input }: { transferId: string; input: UpdateTransferInput }) =>
      authenticatedRequest<TransferResponse>(`/transfers/${transferId}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['accounts'] }),
      ]);
    },
  });
}

export function useDeleteTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (transferId: string) =>
      authenticatedRequest<void>(`/transfers/${transferId}`, {
        method: 'DELETE',
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['accounts'] }),
      ]);
    },
  });
}
