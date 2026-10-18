import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { saveAuthSession } from '@/lib/auth-storage';
import { AuthProvider, useAuthContext } from '@/providers/AuthProvider';

const pushSpy = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushSpy }),
}));

function SessionReader() {
  const { user, isAuthenticated, isLoading, logout } = useAuthContext();

  return (
    <div>
      <span>{isLoading ? 'loading' : 'ready'}</span>
      <span>{user?.name ?? 'none'}</span>
      <button type="button" onClick={() => logout()}>
        logout
      </button>
      <span>{String(isAuthenticated)}</span>
    </div>
  );
}

describe('useAuth', () => {
  beforeEach(() => {
    localStorage.clear();
    pushSpy.mockReset();
    vi.restoreAllMocks();
  });

  it('hidrata la sesión desde localStorage', async () => {
    saveAuthSession({
      accessToken: 'access-123',
      refreshToken: 'refresh-123',
      user: { id: '1', email: 'ana@example.com', name: 'Ana' },
    });

    render(
      <AuthProvider>
        <SessionReader />
      </AuthProvider>,
    );

    expect(await screen.findByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('ready')).toBeInTheDocument();
    expect(screen.getByText('true')).toBeInTheDocument();
  });

  it('borra la sesión local al hacer logout', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    saveAuthSession({
      accessToken: 'access-123',
      refreshToken: 'refresh-123',
      user: { id: '1', email: 'ana@example.com', name: 'Ana' },
    });

    render(
      <AuthProvider>
        <SessionReader />
      </AuthProvider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'logout' }));

    expect(await screen.findByText('none')).toBeInTheDocument();
    expect(localStorage.getItem('moneyflow_access_token')).toBeNull();
  });

  it('logout limpia la sesión y redirige a /login', async () => {
    saveAuthSession({
      accessToken: 'access-123',
      refreshToken: 'refresh-123',
      user: { id: '1', email: 'ana@example.com', name: 'Ana' },
    });

    function LogoutRedirectHarness() {
      const { logout } = useAuthContext();
      const router = useRouter();

      return (
        <button
          type="button"
          onClick={async () => {
            await logout();
            router.push('/login');
          }}
        >
          logout
        </button>
      );
    }

    render(
      <AuthProvider>
        <LogoutRedirectHarness />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'logout' }));

    await waitFor(() => {
      expect(localStorage.getItem('moneyflow_access_token')).toBeNull();
      expect(localStorage.getItem('moneyflow_refresh_token')).toBeNull();
      expect(pushSpy).toHaveBeenCalledWith('/login');
    });
  });
});
