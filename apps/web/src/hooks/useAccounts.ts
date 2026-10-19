'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { authenticatedRequest } from '@/lib/api-client';
import type {
  Account,
  CreateAccountInput,
  RecalculateResponse,
  UpdateAccountInput,
} from '@/types/account';

export const accountKeys = {
  all: ['accounts'] as const,
  list: (archived: boolean) => [...accountKeys.all, archived ? 'archived' : 'active'] as const,
};

export function useAccounts(archived = false) {
  return useQuery({
    queryKey: accountKeys.list(archived),
    queryFn: () => authenticatedRequest<Account[]>(`/accounts?archived=${archived}`),
  });
}

export function useAccount(id: string | null | undefined) {
  return useQuery({
    queryKey: ['accounts', 'detail', id],
    queryFn: () => authenticatedRequest<Account>(`/accounts/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateAccountInput) =>
      authenticatedRequest<Account>('/accounts', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountKeys.all }),
  });
}

interface UpdateAccountVariables {
  id: string;
  input: UpdateAccountInput;
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: UpdateAccountVariables) =>
      authenticatedRequest<Account>(`/accounts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountKeys.all }),
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => authenticatedRequest<void>(`/accounts/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountKeys.all }),
  });
}

export function useRestoreAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      authenticatedRequest<Account>(`/accounts/${id}/restore`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountKeys.all }),
  });
}

export function useRecalculateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      authenticatedRequest<RecalculateResponse>(`/accounts/${id}/recalculate`, {
        method: 'POST',
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountKeys.all }),
  });
}
