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

import {
  ApiError,
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshSessionTokens,
  registerUser,
} from '@/lib/api-client';
import {
  clearAuthSession,
  readAuthSession,
  saveAuthSession,
  saveAuthUser,
} from '@/lib/auth-storage';
import type { AuthSession, AuthUser, LoginInput, RegisterInput } from '@/types/auth';

type AuthContextValue = {
  user: AuthUser | null;
  authError: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function isValidAuthUser(value: unknown): value is AuthUser {
  return !!value && typeof value === 'object' && 'id' in value && 'email' in value && 'name' in value;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const hydrateSession = useCallback(() => {
    const session = readAuthSession();
    setUser(session.user);
    void (async () => {
      try {
        let currentUser: AuthUser;
        try {
          currentUser = await getCurrentUser();
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 401) {
            throw error;
          }
          await refreshSessionTokens();
          currentUser = await getCurrentUser();
        }

        if (!isValidAuthUser(currentUser)) {
          throw new Error('La sesión no contiene un usuario válido.');
        }

        saveAuthUser(currentUser);
        setUser(currentUser);
        setAuthError(null);
      } catch (error) {
        clearAuthSession();
        setUser(null);
        setAuthError(error instanceof Error ? error.message : 'No se pudo validar la sesión.');
      } finally {
        setIsLoading(false);
      }
    })();
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
      setAuthError(null);
    },
    [persistSession],
  );

  const register = useCallback(async (input: RegisterInput) => {
    await registerUser(input);
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } catch {
      clearAuthSession();
      setUser(null);
      setAuthError(null);
      router.push('/login');
      return;
    }

    clearAuthSession();
    setUser(null);
    setAuthError(null);
    router.push('/login');
  }, [router]);

  const refreshSession = useCallback(async () => {
    await refreshSessionTokens();
    const user = await getCurrentUser();
    saveAuthUser(user);
    setUser(user);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      authError,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      register,
      logout,
      refreshSession,
    }),
    [login, logout, refreshSession, register, user, authError, isLoading],
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
