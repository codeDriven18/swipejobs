import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  applyAuthResponse,
  refreshAuthSessionDetailed,
  scheduleProactiveTokenRefresh,
  stopProactiveTokenRefresh,
} from '@/api/client';
import { authApi } from '@/api/authApi';
import {
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  getStoredAuthUser,
  hasAuthSession,
  isAccessTokenExpired,
  type StoredAuthUser,
} from '@/lib/authStorage';
import { toStoredAuthUser } from '@/lib/authUser';
import type { AuthResponse, LoginRequest, RegisterRequest } from '@/models/auth';

interface AuthContextValue {
  user: StoredAuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<StoredAuthUser>;
  register: (data: RegisterRequest) => Promise<StoredAuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function applySession(response: AuthResponse) {
  applyAuthResponse(response);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StoredAuthUser | null>(() => getStoredAuthUser());
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const me = await authApi.me();
      setUser(toStoredAuthUser(me));
    } catch {
      setUser(getStoredAuthUser());
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!getRefreshToken()) {
        if (!cancelled) {
          setUser(null);
          setIsLoading(false);
        }
        return;
      }

      const stored = getStoredAuthUser();
      if (stored) {
        setUser(stored);
      }

      const tokenReady = Boolean(getAccessToken()) && !isAccessTokenExpired();
      if (tokenReady) {
        if (!cancelled) {
          setIsLoading(false);
        }
        scheduleProactiveTokenRefresh();
        void refreshUser().catch(() => undefined);
        return;
      }

      const result = await refreshAuthSessionDetailed();
      if (cancelled) return;

      if (result === 'rejected') {
        setUser(null);
        setIsLoading(false);
        return;
      }

      setUser(getStoredAuthUser());
      if (!cancelled) {
        setIsLoading(false);
      }

      if (hasAuthSession()) {
        scheduleProactiveTokenRefresh();
        void refreshUser().catch(() => undefined);
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
      stopProactiveTokenRefresh();
    };
  }, [refreshUser]);

  const login = useCallback(async (data: LoginRequest) => {
    const response = await authApi.login(data);
    applySession(response);
    const stored = toStoredAuthUser(response.user);
    setUser(stored);
    return stored;
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    const response = await authApi.register(data);
    applySession(response);
    const stored = toStoredAuthUser(response.user);
    setUser(stored);
    return stored;
  }, []);

  const logout = useCallback(async () => {
    stopProactiveTokenRefresh();
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        /* ignore */
      }
    }
    clearAuthSession();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(getRefreshToken() && (user || getStoredAuthUser())),
      isLoading,
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, isLoading, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
