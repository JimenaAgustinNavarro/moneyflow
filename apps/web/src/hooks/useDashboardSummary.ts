'use client';

import { useQuery } from '@tanstack/react-query';

import { authenticatedRequest } from '@/lib/api-client';
import type { DashboardFilters, DashboardSummary } from '@/types/dashboard';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  summary: (filters: DashboardFilters) =>
    [
      ...dashboardKeys.all,
      'summary',
      {
        period: filters.period,
        from: filters.from,
        to: filters.to,
        accountId: filters.accountId,
      },
    ] as const,
};

function buildQuery(filters: DashboardFilters): string {
  const params = new URLSearchParams();
  params.set('period', filters.period);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.accountId) params.set('accountId', filters.accountId);
  return `?${params.toString()}`;
}

export function useDashboardSummary(filters: DashboardFilters) {
  return useQuery({
    queryKey: dashboardKeys.summary(filters),
    queryFn: () =>
      authenticatedRequest<DashboardSummary>(`/dashboard/summary${buildQuery(filters)}`),
    enabled: filters.period !== 'custom' || (Boolean(filters.from) && Boolean(filters.to)),
  });
}
