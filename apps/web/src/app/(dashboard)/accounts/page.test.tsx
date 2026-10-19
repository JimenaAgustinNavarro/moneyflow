import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authenticatedRequest = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api-client', () => ({
  authenticatedRequest,
  ApiError: class ApiError extends Error {},
}));

import AccountsPage from './page';

const activeAccount = {
  id: 'active-1',
  name: 'Cuenta activa',
  type: 'BANK',
  currency: 'PEN',
  initialBalance: '50.00',
  balance: '50.00',
  archived: false,
  createdAt: '2026-10-18T00:00:00Z',
  updatedAt: '2026-10-18T00:00:00Z',
};

const archivedAccount = {
  ...activeAccount,
  id: 'archived-1',
  name: 'Cuenta archivada',
  archived: true,
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return render(<AccountsPage />, { wrapper: Wrapper });
}

describe('AccountsPage', () => {
  beforeEach(() => {
    authenticatedRequest.mockReset();
    let accountArchived = false;
    authenticatedRequest.mockImplementation((path: string, init?: RequestInit) => {
      if (path === '/accounts/active-1' && init?.method === 'PATCH') {
        const input = JSON.parse(String(init.body)) as { archived: boolean };
        accountArchived = input.archived;
        return Promise.resolve({ ...activeAccount, archived: accountArchived });
      }
      if (path === '/accounts?archived=true') {
        return Promise.resolve(
          accountArchived ? [{ ...activeAccount, archived: true }] : [archivedAccount],
        );
      }
      if (path === '/accounts?archived=false') {
        return Promise.resolve(accountArchived ? [] : [activeAccount]);
      }
      if (path === '/accounts/active-1/recalculate') {
        return Promise.resolve({
          id: 'active-1',
          balance: '1000.00',
          recalculatedAt: '2026-10-18T00:00:00Z',
        });
      }
      return Promise.resolve({});
    });
  });

  it('muestra cuentas activas y permite filtrar las archivadas', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Cuenta activa' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Archivadas' }));
    expect(await screen.findByRole('heading', { name: 'Cuenta archivada' })).toBeInTheDocument();

    expect(authenticatedRequest).toHaveBeenCalledWith('/accounts?archived=false');
    expect(authenticatedRequest).toHaveBeenCalledWith('/accounts?archived=true');
  });

  it('abre el formulario para crear una cuenta', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Nueva cuenta' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Nueva cuenta' })).toBeInTheDocument();
  });

  it('archiva y desarchiva desde los filtros correspondientes', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Cuenta activa' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Acciones de Cuenta activa' }));
    await user.click(await screen.findByText('Archivar'));
    expect(await screen.findByText('No hay cuentas todavía. Creá la primera.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Archivadas' }));
    expect(await screen.findByText('Cuenta activa')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Acciones de Cuenta activa' }));
    await user.click(await screen.findByText('Desarchivar'));
    expect(await screen.findByRole('heading', { name: 'Cuenta archivada' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Activas' }));
    expect(await screen.findByRole('heading', { name: 'Cuenta activa' })).toBeInTheDocument();
  });

  it('muestra el saldo recalculado en el aviso', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Acciones de Cuenta activa' }));
    await user.click(await screen.findByText('Recalcular saldo'));

    expect(await screen.findByRole('status')).toHaveTextContent('Saldo recalculado: S/ 1,000.00');
  });

  it('muestra un error del backend al fallar la consulta', async () => {
    authenticatedRequest.mockRejectedValueOnce(new Error('Servicio no disponible'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Servicio no disponible');
    });
  });
});
