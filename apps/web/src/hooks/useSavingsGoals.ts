'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authenticatedRequest } from '@/lib/api-client';
import type {
  CreateGoalContributionInput,
  CreateSavingsGoalInput,
  GoalContribution,
  SavingsGoal,
  SavingsGoalFilters,
  SavingsGoalListResponse,
  UpdateSavingsGoalInput,
} from '@/types/savings-goal';

export const savingsGoalKeys = {
  all: ['savings-goals'] as const,
  list: (filters: SavingsGoalFilters) =>
    [...savingsGoalKeys.all, 'list', filters] as const,
  detail: (id: string) => [...savingsGoalKeys.all, 'detail', id] as const,
  contributions: (goalId: string) =>
    [...savingsGoalKeys.all, 'contributions', goalId] as const,
};

function buildQuery(filters: SavingsGoalFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.includeDeleted) params.set('includeDeleted', 'true');
  if (filters.page !== undefined) params.set('page', String(filters.page));
  if (filters.limit !== undefined) params.set('limit', String(filters.limit));
  const query = params.toString();
  return query ? `?${query}` : '';
}

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: savingsGoalKeys.all });
  void queryClient.invalidateQueries({ queryKey: ['accounts'] });
}

export function useSavingsGoals(filters: SavingsGoalFilters = {}) {
  return useQuery({
    queryKey: savingsGoalKeys.list(filters),
    queryFn: () =>
      authenticatedRequest<SavingsGoalListResponse>(`/savings-goals${buildQuery(filters)}`),
  });
}

export function useSavingsGoal(id: string | null | undefined) {
  return useQuery({
    queryKey: savingsGoalKeys.detail(id ?? ''),
    queryFn: () => authenticatedRequest<SavingsGoal>(`/savings-goals/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateSavingsGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSavingsGoalInput) =>
      authenticatedRequest<SavingsGoal>('/savings-goals', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateAll(queryClient),
  });
}

interface UpdateSavingsGoalVariables {
  id: string;
  input: UpdateSavingsGoalInput;
}

export function useUpdateSavingsGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: UpdateSavingsGoalVariables) =>
      authenticatedRequest<SavingsGoal>(`/savings-goals/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useDeleteSavingsGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      authenticatedRequest<void>(`/savings-goals/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useRestoreSavingsGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      authenticatedRequest<SavingsGoal>(`/savings-goals/${id}/restore`, {
        method: 'POST',
      }),
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useContributions(goalId: string | null | undefined) {
  return useQuery({
    queryKey: savingsGoalKeys.contributions(goalId ?? ''),
    queryFn: () =>
      authenticatedRequest<GoalContribution[]>(`/savings-goals/${goalId}/contributions`),
    enabled: Boolean(goalId),
  });
}

export function useCreateContribution(goalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGoalContributionInput) =>
      authenticatedRequest<GoalContribution>(`/savings-goals/${goalId}/contributions`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useDeleteContribution(goalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      authenticatedRequest<void>(`/savings-goals/${goalId}/contributions/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useRestoreContribution(goalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      authenticatedRequest<GoalContribution>(
        `/savings-goals/${goalId}/contributions/${id}/restore`,
        { method: 'POST' },
      ),
    onSuccess: () => invalidateAll(queryClient),
  });
}
