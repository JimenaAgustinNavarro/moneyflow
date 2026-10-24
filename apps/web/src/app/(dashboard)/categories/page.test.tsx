import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authenticatedRequest = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api-client', () => ({
  authenticatedRequest,
  ApiError: class ApiError extends Error {},
}));

import CategoriesPage from './page';

const categories = [
  {
    id: 'income-1',
    name: 'Sueldo',
    type: 'INCOME',
    parentId: null,
    icon: 'wallet',
    color: '#10b981',
    isSystem: true,
    createdAt: '2026-10-23T00:00:00Z',
  },
  {
    id: 'expense-1',
    name: 'Alquiler',
    type: 'EXPENSE',
    parentId: null,
    icon: 'home',
    color: '#ef4444',
    isSystem: true,
    createdAt: '2026-10-23T00:00:00Z',
  },
  {
    id: 'expense-user',
    name: 'Mascotas',
    type: 'EXPENSE',
    parentId: null,
    icon: 'heart-pulse',
    color: '#ec4899',
    isSystem: false,
    createdAt: '2026-10-23T00:00:00Z',
  },
];

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return render(<CategoriesPage />, { wrapper: Wrapper });
}

describe('CategoriesPage', () => {
  beforeEach(() => {
    authenticatedRequest.mockReset();
  });

  it('agrupa categorías por tipo y permite abrir el formulario de creación', async () => {
    authenticatedRequest.mockResolvedValue(categories);
    renderPage();

    expect(await screen.findByText('Sueldo')).toBeInTheDocument();
    expect(screen.getByText('Alquiler')).toBeInTheDocument();
    expect(screen.getByText('Ingresos')).toBeInTheDocument();
    expect(screen.getByText('Egresos')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Nueva categoría' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Nueva categoría' })).toBeInTheDocument();
  });

  it('muestra estado vacío y error de carga', async () => {
    authenticatedRequest.mockResolvedValueOnce([]);
    const { unmount } = renderPage();
    expect(
      await screen.findByText('No hay categorías todavía. Crea la primera.'),
    ).toBeInTheDocument();
    unmount();

    authenticatedRequest.mockRejectedValueOnce(new Error('Servicio no disponible'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Servicio no disponible');
  });

  it('abre la confirmación de borrado y muestra el error del servidor al confirmar', async () => {
    authenticatedRequest.mockImplementation((path: string, init?: RequestInit) => {
      if (path === '/categories/expense-user' && init?.method === 'DELETE') {
        return Promise.reject(
          new Error('No se puede eliminar porque tiene subcategorías activas.'),
        );
      }
      return Promise.resolve(categories);
    });
    renderPage();

    await screen.findByRole('treeitem', { name: /Mascotas/ });
    fireEvent.click(screen.getByRole('button', { name: 'Borrar Mascotas' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('¿Seguro que quieres eliminar "Mascotas"?');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Eliminar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se puede eliminar porque tiene subcategorías activas.',
    );
    expect(authenticatedRequest).toHaveBeenCalledWith('/categories/expense-user', {
      method: 'DELETE',
    });
  });
});
