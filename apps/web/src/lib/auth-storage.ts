import type { AuthSession, AuthUser } from '@/types/auth';

const STORAGE_KEYS = {
  accessToken: 'moneyflow_access_token',
  refreshToken: 'moneyflow_refresh_token',
  user: 'moneyflow_user',
} as const;

export function readAuthSession(): {
  user: AuthUser | null;
} {
  if (typeof window === 'undefined') {
    return { user: null };
  }

  try {
    window.localStorage.removeItem(STORAGE_KEYS.accessToken);
    window.localStorage.removeItem(STORAGE_KEYS.refreshToken);
    const serializedUser = window.localStorage.getItem(STORAGE_KEYS.user);

    return {
      user: serializedUser ? (JSON.parse(serializedUser) as AuthUser) : null,
    };
  } catch {
    return { user: null };
  }
}

export function saveAuthSession(session: AuthSession): void {
  saveAuthUser(session.user);
}

export function saveAuthUser(user: AuthUser): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEYS.accessToken);
  window.localStorage.removeItem(STORAGE_KEYS.refreshToken);
  window.localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
}

export function getUser(): AuthUser | null {
  return readAuthSession().user;
}

export function clearAuthSession(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEYS.accessToken);
  window.localStorage.removeItem(STORAGE_KEYS.refreshToken);
  window.localStorage.removeItem(STORAGE_KEYS.user);
}
