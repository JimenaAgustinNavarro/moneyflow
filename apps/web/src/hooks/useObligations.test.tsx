import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authenticatedRequest = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api-client', () => ({ authenticatedRequest }));

import { obligationKeys, useCreateObligation, useDeleteObligation, useGenerateObligations, useObligation, useObligations, usePayObligation, useRestoreObligation, useUpdateObligation, useUpcomingObligations } from './useObligations';

function wrapperFor() { const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }); const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>; return { queryClient, wrapper }; }

describe('hooks de obligaciones', () => {
  beforeEach(() => authenticatedRequest.mockReset());
  it('lista con filtros y obtiene detalle y próximos', async () => {
    authenticatedRequest.mockResolvedValue({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } }); const { wrapper } = wrapperFor();
    const list = renderHook(() => useObligations({ status: 'PENDING', overdue: true, accountId: 'account-1', includeDeleted: true, page: 2, limit: 20 }), { wrapper });
    await waitFor(() => expect(list.result.current.isSuccess).toBe(true));
    expect(authenticatedRequest).toHaveBeenCalledWith('/obligations?status=PENDING&overdue=true&accountId=account-1&includeDeleted=true&page=2&limit=20');
    renderHook(() => useUpcomingObligations(), { wrapper }); renderHook(() => useObligation('obligation-1'), { wrapper });
    await waitFor(() => expect(authenticatedRequest).toHaveBeenCalledWith('/obligations/upcoming'));
  });
  it('ejecuta las 6 mutaciones e invalida obligaciones, cuentas y movimientos', async () => {
    authenticatedRequest.mockResolvedValue({ data: {} }); const { queryClient, wrapper } = wrapperFor(); const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const create = renderHook(() => useCreateObligation(), { wrapper }); const update = renderHook(() => useUpdateObligation(), { wrapper }); const remove = renderHook(() => useDeleteObligation(), { wrapper }); const restore = renderHook(() => useRestoreObligation(), { wrapper }); const pay = renderHook(() => usePayObligation(), { wrapper }); const generate = renderHook(() => useGenerateObligations(), { wrapper });
    const input = { name: 'Luz', type: 'EXPENSE' as const, amount: '100.00', dueDate: '2026-11-01T00:00:00-05:00', accountId: '11111111-1111-4111-8111-111111111111' };
    await act(async () => { await create.result.current.mutateAsync(input); await update.result.current.mutateAsync({ id: 'obligation-1', input: { amount: '90.00' } }); await remove.result.current.mutateAsync('obligation-1'); await restore.result.current.mutateAsync('obligation-1'); await pay.result.current.mutateAsync({ id: 'obligation-1', input: { amount: '100.00', accountId: input.accountId } }); await generate.result.current.mutateAsync(); });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: obligationKeys.all }); expect(invalidate).toHaveBeenCalledWith({ queryKey: ['accounts'] }); expect(invalidate).toHaveBeenCalledWith({ queryKey: ['transactions'] });
  });
});
