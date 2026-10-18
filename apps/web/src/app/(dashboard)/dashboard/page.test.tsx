import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authenticatedRequest: vi.fn(),
}));

vi.mock('@/lib/api-client', () => ({
  authenticatedRequest: mocks.authenticatedRequest,
}));

import DashboardPage from './page';

describe('DashboardPage', () => {
  beforeEach(() => {
    mocks.authenticatedRequest.mockReset();
  });

  it('muestra la bienvenida con el nombre obtenido desde /auth/me', async () => {
    mocks.authenticatedRequest.mockResolvedValue({
      id: 'user-1',
      email: 'ana@example.com',
      name: 'Ana Ruiz',
      timezone: 'America/Lima',
      createdAt: '2026-10-18T10:00:00Z',
    });

    render(<DashboardPage />);

    expect(
      await screen.findByRole('heading', { name: 'Bienvenido, Ana Ruiz' }),
    ).toBeInTheDocument();
    expect(mocks.authenticatedRequest).toHaveBeenCalledWith('/auth/me');
    expect(screen.getByText('Saldo total')).toBeInTheDocument();
  });

  it('muestra el error si /auth/me falla sin romper las tarjetas', async () => {
    mocks.authenticatedRequest.mockRejectedValue(new Error('Perfil no disponible'));

    render(<DashboardPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Perfil no disponible');
    expect(screen.getByText('Saldo total')).toBeInTheDocument();
  });
});
