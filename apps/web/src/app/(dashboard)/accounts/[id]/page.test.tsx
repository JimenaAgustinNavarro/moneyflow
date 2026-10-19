import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authenticatedRequest = vi.hoisted(() => vi.fn());
const useParamsMock = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useParams: useParamsMock,
}));

vi.mock('@/lib/api-client', () => {
  class ApiError extends Error {
    constructor(
      public readonly status: number,
      message: string,
    ) {
      super(message);
    }
  }

  return { authenticatedRequest, ApiError };
});

import AccountDetailPage from './page';
import { ApiError } from '@/lib/api-client';

const account = {
  id: 'account-1',
  name: 'Ahorros',
  type: 'BANK',
  currency: 'PEN',
  initialBalance: '100.00',
  balance: '125.50',
  archived: false,
  createdAt: '2026-10-18T00:00:00Z',
  updatedAt: '2026-10-18T00:00:00Z',
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return render(<AccountDetailPage />, { wrapper: Wrapper });
}

describe('AccountDetailPage', () => {
  beforeEach(() => {
    useParamsMock.mockReturnValue({ id: 'account-1' });
    authenticatedRequest.mockReset();
  });

  it('muestra el estado de carga mientras solicita el detalle', async () => {
    let resolveRequest: ((value: unknown) => void) | undefined;
    authenticatedRequest.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );

    renderPage();

    expect(screen.getByRole('status')).toHaveTextContent('Cargando...');
    await waitFor(() => expect(resolveRequest).toBeDefined());
    resolveRequest?.(account);
    expect(await screen.findByRole('heading', { name: 'Ahorros' })).toBeInTheDocument();
    expect(authenticatedRequest).toHaveBeenCalledWith('/accounts/account-1');
  });

  it('muestra el estado 404 cuando la cuenta no existe', async () => {
    authenticatedRequest.mockRejectedValue(new ApiError(404, 'Cuenta no encontrada.'));

    renderPage();

    expect(await screen.findByText('Cuenta no encontrada')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver a cuentas' })).toHaveAttribute(
      'href',
      '/accounts',
    );
  });

  it('muestra el detalle, permite recalcular y editar la cuenta', async () => {
    const user = userEvent.setup();
    let currentAccount = { ...account };
    authenticatedRequest.mockImplementation((path: string, init?: RequestInit) => {
      if (path === '/accounts/account-1/recalculate') {
        return Promise.resolve({
          id: 'account-1',
          balance: '200.00',
          recalculatedAt: '2026-10-19T00:00:00Z',
        });
      }
      if (path === '/accounts/account-1' && init?.method === 'PATCH') {
        const input = JSON.parse(String(init.body)) as { name: string };
        currentAccount = { ...currentAccount, name: input.name };
        return Promise.resolve(currentAccount);
      }
      return Promise.resolve(currentAccount);
    });

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Ahorros' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Los movimientos recientes estarán disponibles cuando se habilite la sección Movimientos.',
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Recalcular saldo' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Saldo recalculado: S/ 200.00');

    await user.click(screen.getByRole('button', { name: 'Editar' }));
    const nameInput = screen.getByLabelText('Nombre');
    await user.clear(nameInput);
    await user.type(nameInput, 'Ahorros editada');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Ahorros editada' })).toBeInTheDocument();
    });
    expect(authenticatedRequest).toHaveBeenCalledWith(
      '/accounts/account-1',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });
});
