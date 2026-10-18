import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  logout: vi.fn(),
  user: { id: 'user-1', email: 'ana@example.com', name: 'Ana Ruiz' },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mocks.user,
    logout: mocks.logout,
  }),
}));

import { Header } from './Header';

describe('Header', () => {
  beforeEach(() => {
    mocks.logout.mockReset();
  });

  it('muestra el nombre del usuario y permite cerrar sesión', async () => {
    const user = userEvent.setup();
    render(<Header />);

    expect(screen.getByText('Ana Ruiz')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Abrir menú de usuario' }));

    const logoutItem = await screen.findByRole('menuitem', { name: 'Cerrar sesión' });
    fireEvent.click(logoutItem);

    await waitFor(() => {
      expect(mocks.logout).toHaveBeenCalledOnce();
    });
  });
});
