'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';

import { loginUser, logoutUser, refreshSessionTokens, registerUser } from '@/lib/api-client';
import { clearAuthSession, getUser, readAuthSession, saveAuthSession } from '@/lib/auth-storage';
import type { AuthSession, AuthUser, LoginInput, RegisterInput } from '@/types/auth';

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const hydrateSession = useCallback(() => {
    const session = readAuthSession();
    setUser(session.user);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  const persistSession = useCallback((session: AuthSession) => {
    saveAuthSession(session);
    setUser(session.user);
  }, []);

  const login = useCallback(
    async (input: LoginInput) => {
      const session = await loginUser(input);
      persistSession(session);
    },
    [persistSession],
  );

  const register = useCallback(async (input: RegisterInput) => {
    await registerUser(input);
  }, []);

  const logout = useCallback(async () => {
    const session = readAuthSession();

    if (session.accessToken && session.refreshToken) {
      try {
        await logoutUser(session.accessToken, session.refreshToken);
      } catch {
        // Se ignora el error del backend para continuar con limpieza local.
      }
    }

    clearAuthSession();
    setUser(null);
    router.push('/login');
  }, [router]);

  const refreshSession = useCallback(async () => {
    await refreshSessionTokens();
    setUser(getUser());
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      register,
      logout,
      refreshSession,
    }),
    [login, logout, refreshSession, register, user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuthContext debe usarse dentro de AuthProvider');
  }

  return context;
}
