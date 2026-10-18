import type { AuthSession, AuthUser } from '@/types/auth';

const STORAGE_KEYS = {
  accessToken: 'moneyflow_access_token',
  refreshToken: 'moneyflow_refresh_token',
  user: 'moneyflow_user',
} as const;

export function readAuthSession(): {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
} {
  if (typeof window === 'undefined') {
    return { user: null, accessToken: null, refreshToken: null };
  }

  try {
    const accessToken = window.localStorage.getItem(STORAGE_KEYS.accessToken);
    const refreshToken = window.localStorage.getItem(STORAGE_KEYS.refreshToken);
    const serializedUser = window.localStorage.getItem(STORAGE_KEYS.user);

    return {
      user: serializedUser ? (JSON.parse(serializedUser) as AuthUser) : null,
      accessToken,
      refreshToken,
    };
  } catch {
    return { user: null, accessToken: null, refreshToken: null };
  }
}

export function saveAuthSession(session: AuthSession): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEYS.accessToken, session.accessToken);
  window.localStorage.setItem(STORAGE_KEYS.refreshToken, session.refreshToken);
  window.localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(session.user));
}

export function clearAuthSession(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEYS.accessToken);
  window.localStorage.removeItem(STORAGE_KEYS.refreshToken);
  window.localStorage.removeItem(STORAGE_KEYS.user);
}
