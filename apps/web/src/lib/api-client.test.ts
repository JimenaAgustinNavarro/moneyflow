import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('api-client', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:3001');
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('loginUser devuelve la sesión cuando la respuesta es exitosa', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            accessToken: 'access-123',
            refreshToken: 'refresh-123',
            user: { id: '1', email: 'ana@example.com', name: 'Ana' },
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    const { loginUser } = await import('@/lib/api-client');
    const result = await loginUser({ email: 'ana@example.com', password: '12345678' });

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:3001/api/v1/auth/login',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      }),
    );
    expect(result.user.email).toBe('ana@example.com');
    expect(result.accessToken).toBe('access-123');
  });

  it('loginUser transforma errores 401 en un mensaje amigable', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'Credenciales inválidas' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { loginUser } = await import('@/lib/api-client');

    await expect(
      loginUser({ email: 'ana@example.com', password: 'wrong-password' }),
    ).rejects.toMatchObject({
      status: 401,
      message: 'Credenciales inválidas',
    });
  });

  it('loginUser resuelve 401 con el mensaje estándar del backend', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { loginUser } = await import('@/lib/api-client');

    await expect(
      loginUser({ email: 'ana@example.com', password: 'wrong-password' }),
    ).rejects.toMatchObject({
      status: 401,
      message: 'Credenciales inválidas',
    });
  });

  it('loginUser usa el mensaje del backend para un 409', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'El email ya está registrado' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { loginUser } = await import('@/lib/api-client');

    await expect(
      loginUser({ email: 'ana@example.com', password: '12345678' }),
    ).rejects.toMatchObject({
      status: 409,
      message: 'El email ya está registrado',
    });
  });

  it('usa un mensaje genérico para un 409 sin mensaje del backend', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({}), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { loginUser } = await import('@/lib/api-client');

    await expect(
      loginUser({ email: 'ana@example.com', password: '12345678' }),
    ).rejects.toMatchObject({
      status: 409,
      message: 'El recurso ya existe.',
    });
  });

  it('loginUser toma el primer mensaje de un 400 con mensajes en array', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          message: ['email must be an email', 'password too short'],
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    const { loginUser } = await import('@/lib/api-client');

    await expect(loginUser({ email: 'no-es-email', password: '1234' })).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining('email must be an email'),
    });
  });

  it('loginUser propaga el error de red cuando fetch falla', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    const { loginUser } = await import('@/lib/api-client');

    await expect(loginUser({ email: 'ana@example.com', password: '12345678' })).rejects.toThrow(
      'Failed to fetch',
    );
  });

  it('authenticatedRequest devuelve los datos de una request protegida exitosa', async () => {
    const { saveAuthSession } = await import('@/lib/auth-storage');
    saveAuthSession({
      accessToken: 'access-123',
      refreshToken: 'refresh-123',
      user: { id: '1', email: 'ana@example.com', name: 'Ana' },
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { name: 'Ana' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { authenticatedRequest } = await import('@/lib/api-client');

    await expect(authenticatedRequest<{ name: string }>('/auth/me')).resolves.toEqual({
      name: 'Ana',
    });
  });

  it('renueva la sesión y reintenta una request protegida tras 401', async () => {
    const { saveAuthSession } = await import('@/lib/auth-storage');
    saveAuthSession({
      accessToken: 'expired-access',
      refreshToken: 'refresh-123',
      user: { id: '1', email: 'ana@example.com', name: 'Ana' },
    });
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: { accessToken: 'new-access', refreshToken: 'new-refresh' },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { name: 'Ana' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

    const { authenticatedRequest } = await import('@/lib/api-client');
    const result = await authenticatedRequest<{ name: string }>('/auth/me');
    const retriedHeaders = new Headers(fetchSpy.mock.calls[2]?.[1]?.headers);

    expect(result).toEqual({ name: 'Ana' });
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(retriedHeaders.get('Authorization')).toBeNull();
    expect(localStorage.getItem('moneyflow_access_token')).toBeNull();
    expect(localStorage.getItem('moneyflow_refresh_token')).toBeNull();
    expect(localStorage.getItem('moneyflow_user')).toContain('Ana');
  });

  it('limpia la sesión y redirige si falla el refresh', async () => {
    const storage = window.localStorage;
    const browserMock = { localStorage: storage, location: { href: '' } };
    vi.stubGlobal('window', browserMock);

    const { saveAuthSession } = await import('@/lib/auth-storage');
    saveAuthSession({
      accessToken: 'expired-access',
      refreshToken: 'invalid-refresh',
      user: { id: '1', email: 'ana@example.com', name: 'Ana' },
    });
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Refresh token inválido' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

    const { ApiError, authenticatedRequest } = await import('@/lib/api-client');

    await expect(authenticatedRequest('/auth/me')).rejects.toBeInstanceOf(ApiError);
    expect(storage.getItem('moneyflow_access_token')).toBeNull();
    expect(storage.getItem('moneyflow_refresh_token')).toBeNull();
    expect(storage.getItem('moneyflow_user')).toBeNull();
    expect(browserMock.location.href).toBe('/login');
  });

  it('comparte un único refresh entre requests 401 concurrentes', async () => {
    const { saveAuthSession } = await import('@/lib/auth-storage');
    saveAuthSession({
      accessToken: 'expired-access',
      refreshToken: 'refresh-123',
      user: { id: '1', email: 'ana@example.com', name: 'Ana' },
    });

    let releaseRefresh: () => void = () => {};
    const refreshGate = new Promise<void>((resolve) => {
      releaseRefresh = resolve;
    });
    let protectedRequests = 0;
    let refreshRequests = 0;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);

      if (url.endsWith('/auth/refresh')) {
        refreshRequests += 1;
        await refreshGate;
        return new Response(
          JSON.stringify({
            data: { accessToken: 'new-access', refreshToken: 'new-refresh' },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }

      protectedRequests += 1;
      if (protectedRequests <= 2) {
        return new Response(JSON.stringify({ message: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ data: { ok: true } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const { authenticatedRequest } = await import('@/lib/api-client');
    const firstRequest = authenticatedRequest<{ ok: boolean }>('/auth/me');
    const secondRequest = authenticatedRequest<{ ok: boolean }>('/auth/me');

    await vi.waitFor(() => {
      expect(refreshRequests).toBe(1);
    });
    releaseRefresh();

    await expect(Promise.all([firstRequest, secondRequest])).resolves.toEqual([
      { ok: true },
      { ok: true },
    ]);
    expect(refreshRequests).toBe(1);
    expect(protectedRequests).toBe(4);
  });
});