import { apiClient } from './client';
import { createRequestTimer } from '@/lib/apiDiagnostics';
import { getRefreshToken } from '@/lib/authStorage';
import type {
  AuthResponse,
  AuthUser,
  ChangePasswordRequest,
  LoginRequest,
  RegisterRequest,
  UserSession,
} from '@/models/auth';

export const authApi = {
  register: (data: RegisterRequest) =>
    apiClient<AuthResponse>('/auth/register', { method: 'POST', body: data, skipAuth: true }),

  login: (data: LoginRequest) =>
    apiClient<AuthResponse>('/auth/login', { method: 'POST', body: data, skipAuth: true }),

  refresh: (refreshToken: string) =>
    apiClient<AuthResponse>('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
      skipAuth: true,
    }),

  logout: (refreshToken: string) =>
    apiClient<void>('/auth/logout', {
      method: 'POST',
      body: { refreshToken },
      skipAuth: true,
    }),

  logoutAll: () => apiClient<void>('/auth/logout-all', { method: 'POST' }),

  getSessions: () => {
    const refreshToken = getRefreshToken();
    const query = refreshToken ? `?refreshToken=${encodeURIComponent(refreshToken)}` : '';
    return apiClient<UserSession[]>(`/auth/sessions${query}`);
  },

  revokeSession: (sessionId: string) =>
    apiClient<void>(`/auth/sessions/${sessionId}`, { method: 'DELETE' }),

  forgotPassword: (email: string) =>
    apiClient<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: { email },
      skipAuth: true,
    }),

  changePassword: (data: ChangePasswordRequest) =>
    apiClient<void>('/auth/change-password', { method: 'POST', body: data }),

  me: () => {
    const timer = createRequestTimer('auth/me');
    return apiClient<AuthUser>('/auth/me')
      .then((user) => {
        timer.end({ userId: user.id });
        return user;
      })
      .catch((error) => {
        const reason = error instanceof Error ? error.message : 'unknown';
        timer.error(reason);
        throw error;
      });
  },
};
