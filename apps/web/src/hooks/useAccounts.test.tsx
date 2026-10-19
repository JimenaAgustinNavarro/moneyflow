import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authenticatedRequest = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api-client', () => ({ authenticatedRequest }));

import {
  useAccounts,
  useCreateAccount,
  useDeleteAccount,
  useRecalculateAccount,
  useRestoreAccount,
  useUpdateAccount,
} from './useAccounts';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('hooks de cuentas', () => {
  beforeEach(() => {
    authenticatedRequest.mockReset();
  });

  it('consulta listas independientes de cuentas activas y archivadas', async () => {
    authenticatedRequest.mockResolvedValue([]);
    const wrapper = createWrapper();

    const { result: activeResult } = renderHook(() => useAccounts(), { wrapper });
    await waitFor(() => expect(activeResult.current.isSuccess).toBe(true));

    const { result: archivedResult } = renderHook(() => useAccounts(true), { wrapper });
    await waitFor(() => expect(archivedResult.current.isSuccess).toBe(true));

    expect(authenticatedRequest).toHaveBeenCalledWith('/accounts?archived=false');
    expect(authenticatedRequest).toHaveBeenCalledWith('/accounts?archived=true');
  });

  it('envía create y actualizaciones con los métodos y cuerpos esperados', async () => {
    authenticatedRequest.mockResolvedValue({});
    const wrapper = createWrapper();
    const { result: create } = renderHook(() => useCreateAccount(), { wrapper });
    const { result: update } = renderHook(() => useUpdateAccount(), { wrapper });

    await act(async () => {
      await create.current.mutateAsync({
        name: 'Ahorros',
        type: 'BANK',
        initialBalance: '1000.00',
        currency: 'PEN',
      });
      await update.current.mutateAsync({
        id: 'account-1',
        input: { archived: true },
      });
    });

    expect(authenticatedRequest).toHaveBeenNthCalledWith(1, '/accounts', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Ahorros',
        type: 'BANK',
        initialBalance: '1000.00',
        currency: 'PEN',
      }),
    });
    expect(authenticatedRequest).toHaveBeenNthCalledWith(2, '/accounts/account-1', {
      method: 'PATCH',
      body: JSON.stringify({ archived: true }),
    });
  });

  it('expone delete, restore y recalculate sin presentar acciones de interfaz', async () => {
    authenticatedRequest.mockResolvedValue({});
    const wrapper = createWrapper();
    const { result: remove } = renderHook(() => useDeleteAccount(), { wrapper });
    const { result: restore } = renderHook(() => useRestoreAccount(), { wrapper });
    const { result: recalculate } = renderHook(() => useRecalculateAccount(), { wrapper });

    await act(async () => {
      await remove.current.mutateAsync('account-1');
      await restore.current.mutateAsync('account-1');
      await recalculate.current.mutateAsync('account-1');
    });

    expect(authenticatedRequest).toHaveBeenNthCalledWith(1, '/accounts/account-1', {
      method: 'DELETE',
    });
    expect(authenticatedRequest).toHaveBeenNthCalledWith(2, '/accounts/account-1/restore', {
      method: 'POST',
    });
    expect(authenticatedRequest).toHaveBeenNthCalledWith(3, '/accounts/account-1/recalculate', {
      method: 'POST',
    });
  });
});
