import type { AuthSession, LoginInput, RegisterInput, RegisterResult } from '@/types/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

function getApiUrl(path: string): string {
  if (!API_BASE) {
    throw new Error('NEXT_PUBLIC_API_URL no está configurada.');
  }

  return `${API_BASE.replace(/\/$/, '')}/api/v1${path}`;
}

function getFriendlyErrorMessage(status: number, payload: unknown): string {
  const message = payload && typeof payload === 'object' && 'message' in payload
    ? String((payload as { message?: string }).message)
    : '';

  if (status === 400) {
    return message || 'La solicitud es inválida.';
  }

  if (status === 401) {
    return 'Credenciales inválidas';
  }

  if (status === 409) {
    return 'El email ya está registrado';
  }

  return message || 'Error de conexión';
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(getApiUrl(path), {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  let payload: unknown = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = new Error(getFriendlyErrorMessage(response.status, payload)) as Error & {
      status?: number;
    };
    error.status = response.status;
    throw error;
  }

  const result = payload && typeof payload === 'object' && 'data' in payload
    ? (payload as { data: T }).data
    : (payload as T);

  return result;
}

export async function loginUser(input: LoginInput): Promise<AuthSession> {
  return request<AuthSession>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function registerUser(input: RegisterInput): Promise<RegisterResult> {
  return request<RegisterResult>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function logoutUser(accessToken: string, refreshToken: string): Promise<void> {
  await request('/auth/logout', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ refreshToken }),
  });
}
