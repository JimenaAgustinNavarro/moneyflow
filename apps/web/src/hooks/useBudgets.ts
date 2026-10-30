'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authenticatedRequest } from '@/lib/api-client';
import type {
  Budget, BudgetFilters, BudgetUsage,
  CopyBudgetInput, CreateBudgetInput, UpdateBudgetInput,
} from '@/types/budget';

export const budgetKeys = {
  all: ['budgets'] as const,
  list: (filters: BudgetFilters) =>
    [...budgetKeys.all, 'list', filters] as const,
  detail: (id: string) => [...budgetKeys.all, 'detail', id] as const,
  usage: (id: string) => [...budgetKeys.all, 'usage', id] as const,
};

function buildQuery(filters: BudgetFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.active !== undefined) params.set('active', String(filters.active));
  if (filters.includeDeleted) params.set('includeDeleted', 'true');
  const query = params.toString();
  return query ? `?${query}` : '';
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: budgetKeys.all });
  qc.invalidateQueries({ queryKey: ['accounts'] });
  qc.invalidateQueries({ queryKey: ['transactions'] });
}

export function useBudgets(filters: BudgetFilters = {}) {
  return useQuery({
    queryKey: budgetKeys.list(filters),
    queryFn: () =>
      authenticatedRequest<Budget[]>(`/budgets${buildQuery(filters)}`),
  });
}

export function useBudget(id: string | null | undefined) {
  return useQuery({
    queryKey: budgetKeys.detail(id ?? ''),
    queryFn: () => authenticatedRequest<Budget>(`/budgets/${id}`),
    enabled: Boolean(id),
  });
}

export function useBudgetUsage(id: string | null | undefined) {
  return useQuery({
    queryKey: budgetKeys.usage(id ?? ''),
    queryFn: () => authenticatedRequest<BudgetUsage>(`/budgets/${id}/usage`),
    enabled: Boolean(id),
  });
}

export function useCreateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBudgetInput) =>
      authenticatedRequest<Budget>('/budgets', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateAll(qc),
  });
}

interface UpdateVars { id: string; input: UpdateBudgetInput; }

export function useUpdateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: UpdateVars) =>
      authenticatedRequest<Budget>(`/budgets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      authenticatedRequest<void>(`/budgets/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useRestoreBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      authenticatedRequest<Budget>(`/budgets/${id}/restore`, {
        method: 'POST',
      }),
    onSuccess: () => invalidateAll(qc),
  });
}

interface CopyVars { id: string; input: CopyBudgetInput; }

export function useCopyBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: CopyVars) =>
      authenticatedRequest<Budget>(`/budgets/${id}/copy`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateAll(qc),
  });
}
