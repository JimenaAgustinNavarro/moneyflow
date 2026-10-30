'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authenticatedRequest } from '@/lib/api-client';
import type {
  CreateObligationInput,
  GenerateResult,
  Obligation,
  ObligationFilters,
  ObligationListResponse,
  PayObligationInput,
  UpdateObligationInput,
} from '@/types/obligation';

export const obligationKeys = {
  all: ['obligations'] as const,
  list: (filters: ObligationFilters) => [...obligationKeys.all, 'list', filters] as const,
  detail: (id: string) => [...obligationKeys.all, 'detail', id] as const,
  upcoming: () => [...obligationKeys.all, 'upcoming'] as const,
};

function buildQuery(filters: ObligationFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.overdue) params.set('overdue', 'true');
  if (filters.recurrenceId) params.set('recurrenceId', filters.recurrenceId);
  if (filters.accountId) params.set('accountId', filters.accountId);
  if (filters.categoryId) params.set('categoryId', filters.categoryId);
  if (filters.includeDeleted) params.set('includeDeleted', 'true');
  if (filters.page !== undefined) params.set('page', String(filters.page));
  if (filters.limit !== undefined) params.set('limit', String(filters.limit));
  const query = params.toString();
  return query ? `?${query}` : '';
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: obligationKeys.all });
  qc.invalidateQueries({ queryKey: ['accounts'] });
  qc.invalidateQueries({ queryKey: ['transactions'] });
}

export function useObligations(filters: ObligationFilters = {}) {
  return useQuery({
    queryKey: obligationKeys.list(filters),
    queryFn: () => authenticatedRequest<ObligationListResponse>(`/obligations${buildQuery(filters)}`),
  });
}

export function useObligation(id: string | null | undefined) {
  return useQuery({
    queryKey: obligationKeys.detail(id ?? ''),
    queryFn: () => authenticatedRequest<{ data: Obligation }>(`/obligations/${id}`),
    enabled: Boolean(id),
  });
}

export function useUpcomingObligations() {
  return useQuery({
    queryKey: obligationKeys.upcoming(),
    queryFn: () => authenticatedRequest<ObligationListResponse>('/obligations/upcoming'),
  });
}

export function useCreateObligation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateObligationInput) => authenticatedRequest<{ data: Obligation }>('/obligations', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => invalidateAll(qc),
  });
}

interface UpdateVars { id: string; input: UpdateObligationInput; }

export function useUpdateObligation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: UpdateVars) => authenticatedRequest<{ data: Obligation }>(`/obligations/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteObligation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => authenticatedRequest<void>(`/obligations/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useRestoreObligation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => authenticatedRequest<{ data: Obligation }>(`/obligations/${id}/restore`, { method: 'POST' }),
    onSuccess: () => invalidateAll(qc),
  });
}

interface PayVars { id: string; input: PayObligationInput; }

export function usePayObligation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: PayVars) => authenticatedRequest<{ data: Obligation }>(`/obligations/${id}/pay`, { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useGenerateObligations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => authenticatedRequest<{ data: GenerateResult }>('/obligations/generate', { method: 'POST' }),
    onSuccess: () => invalidateAll(qc),
  });
}
