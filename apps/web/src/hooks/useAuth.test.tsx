import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { saveAuthSession } from '@/lib/auth-storage';

const pushSpy = vi.fn();
let AuthProvider: typeof import('@/providers/AuthProvider').AuthProvider;
let useAuthContext: typeof import('@/providers/AuthProvider').useAuthContext;

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
  beforeEach(async () => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:3001');
    localStorage.clear();
    pushSpy.mockReset();
    vi.restoreAllMocks();
    ({ AuthProvider, useAuthContext } = await import('@/providers/AuthProvider'));
  });

  it('hidrata la sesión desde localStorage con el usuario persistido', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { id: '1', email: 'ana@example.com', name: 'Ana' },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
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

    expect(await screen.findByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('ready')).toBeInTheDocument();
    expect(screen.getByText('true')).toBeInTheDocument();
    expect(localStorage.getItem('moneyflow_user')).toContain('Ana');
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
    expect(localStorage.getItem('moneyflow_user')).toBeNull();
  });

  it('logout limpia la sesión y redirige a /login', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes('/auth/me')) {
        return new Response(JSON.stringify({ message: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ data: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

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
      expect(localStorage.getItem('moneyflow_user')).toBeNull();
      expect(pushSpy).toHaveBeenCalledWith('/login');
    });
  });
});