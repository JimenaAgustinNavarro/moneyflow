import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('api-client', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:3001');
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

  it('loginUser resuelve 409 con el mensaje de email duplicado', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'Conflict' }), {
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

    await expect(
      loginUser({ email: 'no-es-email', password: '1234' }),
    ).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining('email must be an email'),
    });
  });

  it('loginUser propaga el error de red cuando fetch falla', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    const { loginUser } = await import('@/lib/api-client');

    await expect(
      loginUser({ email: 'ana@example.com', password: '12345678' }),
    ).rejects.toThrow('Failed to fetch');
  });
});
