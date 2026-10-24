import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authenticatedRequest = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api-client', () => ({ authenticatedRequest }));

import { useCreateTransfer, useDeleteTransfer } from './useTransfers';

function createWrapper() {
  const queryClient = new QueryClient();
  const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return { wrapper: Wrapper, invalidateQueries };
}

describe('hooks de transferencias', () => {
  beforeEach(() => {
    authenticatedRequest.mockReset();
  });

  it('crea una transferencia e invalida movimientos y cuentas', async () => {
    const response = {
      transferId: 'transfer-1',
      origin: { id: 'origin-leg' },
      destination: { id: 'destination-leg' },
    };
    authenticatedRequest.mockResolvedValue(response);
    const { wrapper, invalidateQueries } = createWrapper();
    const { result } = renderHook(() => useCreateTransfer(), { wrapper });
    const input = {
      originAccountId: 'account-1',
      destinationAccountId: 'account-2',
      amount: '25.50',
      description: 'Ahorro',
      date: '2026-10-15T00:00:00-05:00',
    };

    await act(async () => {
      await result.current.mutateAsync(input);
    });

    expect(authenticatedRequest).toHaveBeenCalledWith('/transfers', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['transactions'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['accounts'] });
  });

  it('borra por transferId e invalida movimientos y cuentas', async () => {
    authenticatedRequest.mockResolvedValue(undefined);
    const { wrapper, invalidateQueries } = createWrapper();
    const { result } = renderHook(() => useDeleteTransfer(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync('transfer-1');
    });

    expect(authenticatedRequest).toHaveBeenCalledWith('/transfers/transfer-1', {
      method: 'DELETE',
    });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['transactions'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['accounts'] });
  });

  it('propaga el error de la solicitud', async () => {
    const networkError = new Error('Error de conexión');
    authenticatedRequest.mockRejectedValue(networkError);
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateTransfer(), { wrapper });

    await expect(
      act(async () =>
        result.current.mutateAsync({
          originAccountId: 'account-1',
          destinationAccountId: 'account-2',
          amount: '10.00',
          date: '2026-10-15T00:00:00-05:00',
        }),
      ),
    ).rejects.toBe(networkError);
  });
});
