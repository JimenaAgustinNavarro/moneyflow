'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { authenticatedRequest } from '@/lib/api-client';
import type {
  CreateRecurrenceInput,
  Recurrence,
  RecurrenceFilters,
  RecurrenceListResponse,
  UpdateRecurrenceInput,
} from '@/types/recurrence';

export const recurrenceKeys = {
  all: ['recurrences'] as const,
  list: (filters: RecurrenceFilters) => [...recurrenceKeys.all, 'list', filters] as const,
  detail: (id: string) => [...recurrenceKeys.all, 'detail', id] as const,
};

function buildQuery(filters: RecurrenceFilters): string {
  const params = new URLSearchParams();
  if (filters.active !== undefined) params.set('active', String(filters.active));
  if (filters.type) params.set('type', filters.type);
  if (filters.accountId) params.set('accountId', filters.accountId);
  if (filters.categoryId) params.set('categoryId', filters.categoryId);
  if (filters.includeDeleted) params.set('includeDeleted', 'true');
  if (filters.page !== undefined) params.set('page', String(filters.page));
  if (filters.limit !== undefined) params.set('limit', String(filters.limit));
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function useRecurrences(filters: RecurrenceFilters = {}) {
  return useQuery({
    queryKey: recurrenceKeys.list(filters),
    queryFn: () => authenticatedRequest<RecurrenceListResponse>(`/recurrences${buildQuery(filters)}`),
  });
}

export function useRecurrence(id: string | null | undefined) {
  return useQuery({
    queryKey: recurrenceKeys.detail(id ?? ''),
    queryFn: () => authenticatedRequest<{ data: Recurrence }>(`/recurrences/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateRecurrence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRecurrenceInput) =>
      authenticatedRequest<{ data: Recurrence }>('/recurrences', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: recurrenceKeys.all }),
  });
}

interface UpdateVariables {
  id: string;
  input: UpdateRecurrenceInput;
}

export function useUpdateRecurrence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: UpdateVariables) =>
      authenticatedRequest<{ data: Recurrence }>(`/recurrences/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: recurrenceKeys.all }),
  });
}

export function useDeleteRecurrence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => authenticatedRequest<void>(`/recurrences/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: recurrenceKeys.all }),
  });
}

export function useRestoreRecurrence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      authenticatedRequest<{ data: Recurrence }>(`/recurrences/${id}/restore`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: recurrenceKeys.all }),
  });
}

export function useToggleRecurrence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      authenticatedRequest<{ data: Recurrence }>(`/recurrences/${id}/toggle`, { method: 'PATCH' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: recurrenceKeys.all }),
  });
}
