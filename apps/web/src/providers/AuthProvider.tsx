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

import { loginUser, logoutUser, registerUser } from '@/lib/api-client';
import { clearAuthSession, readAuthSession, saveAuthSession } from '@/lib/auth-storage';
import type { AuthSession, AuthUser, LoginInput, RegisterInput } from '@/types/auth';

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
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

  const login = useCallback(async (input: LoginInput) => {
    const session = await loginUser(input);
    persistSession(session);
  }, [persistSession]);

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
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      register,
      logout,
    }),
    [login, logout, register, user, isLoading],
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
