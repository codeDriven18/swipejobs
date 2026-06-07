import { API_CONFIG } from './config';
import {
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  setAuthSession,
  updateStoredAuthUser,
  type StoredAuthUser,
} from '@/lib/authStorage';
import { toStoredAuthUser } from '@/lib/authUser';
import type { AuthResponse } from '@/models/auth';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  skipAuth?: boolean;
}

let refreshPromise: Promise<boolean> | null = null;

function persistAuthResponse(response: AuthResponse) {
  setAuthSession(response.accessToken, response.refreshToken, toStoredAuthUser(response.user));
}

function parseResponseBody(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return undefined;

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return text;
  }
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text.trim()) return undefined as T;
  return JSON.parse(text) as T;
}

async function tryRefreshTokens(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const url = `${API_CONFIG.baseUrl}/auth/refresh`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      signal: AbortSignal.timeout(API_CONFIG.timeout),
    });
    if (!response.ok) {
      clearAuthSession();
      return false;
    }
    const data = await readJsonResponse<AuthResponse>(response);
    persistAuthResponse(data);
    return true;
  } catch {
    clearAuthSession();
    return false;
  }
}

export async function refreshAuthSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = tryRefreshTokens().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, headers, skipAuth, ...rest } = options;

  const url = `${API_CONFIG.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const buildHeaders = (): Record<string, string> => {
    const next: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(headers as Record<string, string> | undefined),
    };
    if (!skipAuth) {
      const token = getAccessToken();
      if (token) next.Authorization = `Bearer ${token}`;
    }
    return next;
  };

  const execute = () =>
    fetch(url, {
      ...rest,
      headers: buildHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(API_CONFIG.timeout),
    });

  let response = await execute();

  if (response.status === 401 && !skipAuth && getRefreshToken()) {
    const refreshed = await refreshAuthSession();
    if (refreshed) {
      response = await execute();
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    const errorBody = parseResponseBody(errorText);
    throw new ApiError(
      `API request failed: ${response.statusText}`,
      response.status,
      errorBody,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return readJsonResponse<T>(response);
}

export function applyAuthResponse(response: AuthResponse) {
  persistAuthResponse(response);
}

export function syncAuthUserProfileId(profileId: string) {
  const storedRaw = localStorage.getItem('swipejobs-auth-user');
  if (!storedRaw) return;
  try {
    const stored = JSON.parse(storedRaw) as StoredAuthUser;
    updateStoredAuthUser({ ...stored, profileId });
  } catch {
    /* ignore */
  }
}
