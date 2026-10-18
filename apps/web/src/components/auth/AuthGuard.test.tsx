import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: {
    isAuthenticated: false,
    isLoading: false,
  },
  replace: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mocks.auth,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));

import { AuthGuard } from './AuthGuard';

describe('AuthGuard', () => {
  beforeEach(() => {
    mocks.auth.isAuthenticated = false;
    mocks.auth.isLoading = false;
    mocks.replace.mockReset();
  });

  it('redirige a login cuando no existe una sesión', async () => {
    render(
      <AuthGuard>
        <p>Contenido privado</p>
      </AuthGuard>,
    );

    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith('/login');
    });
    expect(screen.queryByText('Contenido privado')).not.toBeInTheDocument();
  });

  it('muestra el indicador mientras hidrata la sesión', () => {
    mocks.auth.isLoading = true;

    render(
      <AuthGuard>
        <p>Contenido privado</p>
      </AuthGuard>,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Cargando...');
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it('renderiza los hijos cuando hay una sesión', () => {
    mocks.auth.isAuthenticated = true;

    render(
      <AuthGuard>
        <p>Contenido privado</p>
      </AuthGuard>,
    );

    expect(screen.getByText('Contenido privado')).toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});
