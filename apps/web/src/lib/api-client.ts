import type { AuthSession, LoginInput, RegisterInput, RegisterResult } from '@/types/auth';
import type { AuthUser } from '@/types/auth';
import { clearAuthSession } from '@/lib/auth-storage';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let refreshPromise: Promise<void> | null = null;
let isRefreshing = false;

function getApiUrl(path: string): string {
  if (!API_BASE) {
    throw new Error('NEXT_PUBLIC_API_URL no está configurada.');
  }

  return `${API_BASE.replace(/\/$/, '')}/api/v1${path}`;
}

function getFriendlyErrorMessage(status: number, payload: unknown): string {
  const rawMessage =
    payload && typeof payload === 'object' && 'message' in payload
      ? (payload as { message?: unknown }).message
      : undefined;
  const message = Array.isArray(rawMessage)
    ? String(rawMessage[0] ?? '')
    : typeof rawMessage === 'string'
      ? rawMessage
      : '';

  if (status === 400) {
    return message || 'La solicitud es inválida.';
  }

  if (status === 401) {
    return 'Credenciales inválidas';
  }

  if (status === 409) {
    return message || 'El recurso ya existe.';
  }

  return message || 'Error de conexión';
}

async function readPayload(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function unwrapData<T>(payload: unknown): T {
  return payload && typeof payload === 'object' && 'data' in payload
    ? (payload as { data: T }).data
    : (payload as T);
}

function responseError(response: Response, payload: unknown): ApiError {
  return new ApiError(response.status, getFriendlyErrorMessage(response.status, payload));
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(getApiUrl(path), {
    ...init,
    credentials: 'include',
    headers,
  });

  const payload = await readPayload(response);

  if (!response.ok) {
    throw responseError(response, payload);
  }

  return unwrapData<T>(payload);
}

function redirectToLogin(): void {
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}

async function doRefresh(): Promise<void> {
  let response: Response;

  try {
    response = await fetch(getApiUrl('/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
  } catch {
    throw new ApiError(0, 'Error de conexión');
  }

  if (!response.ok) {
    throw new ApiError(401, 'Refresh token inválido');
  }
}

function getRefreshPromise(): Promise<void> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  if (!refreshPromise) {
    isRefreshing = true;
    refreshPromise = doRefresh().finally(() => {
      isRefreshing = false;
      refreshPromise = null;
    });
  }

  if (!refreshPromise) {
    throw new ApiError(500, 'No se pudo iniciar la renovación de sesión.');
  }

  return refreshPromise;
}

async function clearSessionAndRedirect(): Promise<void> {
  clearAuthSession();
  redirectToLogin();
}

async function sendAuthenticated<T>(
  path: string,
  init: RequestInit | undefined,
  isRetry: boolean,
): Promise<T> {
  const headers = new Headers(init?.headers);

  headers.set('Content-Type', 'application/json');

  let response: Response;

  try {
    response = await fetch(getApiUrl(path), {
      ...init,
      credentials: 'include',
      headers,
    });
  } catch {
    throw new ApiError(0, 'Error de conexión');
  }

  const payload = await readPayload(response);

  if (response.status !== 401) {
    if (!response.ok) {
      throw responseError(response, payload);
    }

    return unwrapData<T>(payload);
  }

  if (isRetry) {
    await clearSessionAndRedirect();
    throw responseError(response, payload);
  }

  try {
    await getRefreshPromise();
  } catch (error) {
    await clearSessionAndRedirect();
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(401, 'Refresh token inválido');
  }

  return sendAuthenticated<T>(path, init, true);
}

export async function authenticatedRequest<T>(path: string, init?: RequestInit): Promise<T> {
  return sendAuthenticated<T>(path, init, false);
}

export async function refreshSessionTokens(): Promise<void> {
  await getRefreshPromise();
}

export async function loginUser(input: LoginInput): Promise<AuthSession> {
  return request<AuthSession>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getCurrentUser(): Promise<AuthUser> {
  return request<AuthUser>('/auth/me');
}

export async function registerUser(input: RegisterInput): Promise<RegisterResult> {
  return request<RegisterResult>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function logoutUser(): Promise<void> {
  await request('/auth/logout', {
    method: 'POST',
  });
}
