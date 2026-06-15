import { API_CONFIG } from './config';
import {
  clearAuthSession,
  getAccessToken,
  getAccessTokenExpiresAt,
  getRefreshToken,
  isAccessTokenExpired,
  setAuthSession,
  updateStoredAuthUser,
  type StoredAuthUser,
} from '@/lib/authStorage';
import { ACCESS_REFRESH_BUFFER_MS, type RefreshResult } from '@/lib/authSessionConstants';
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
  timeoutMs?: number;
  signal?: AbortSignal;
}

let refreshPromise: Promise<RefreshResult> | null = null;
let proactiveRefreshTimer: number | null = null;

function persistAuthResponse(response: AuthResponse) {
  setAuthSession(
    response.accessToken,
    response.refreshToken,
    toStoredAuthUser(response.user),
    response.expiresInSeconds,
    response.sessionId,
  );
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

async function tryRefreshTokens(): Promise<RefreshResult> {
  let refreshToken = getRefreshToken();
  if (!refreshToken) return 'rejected';

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const url = `${API_CONFIG.baseUrl}/auth/refresh`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        signal: AbortSignal.timeout(API_CONFIG.timeout),
      });

      if (response.ok) {
        const data = await readJsonResponse<AuthResponse>(response);
        persistAuthResponse(data);
        return 'success';
      }

      if (response.status === 401) {
        if (attempt === 0) {
          const latest = getRefreshToken();
          if (latest && latest !== refreshToken) {
            refreshToken = latest;
            continue;
          }
        }
        clearAuthSession();
        return 'rejected';
      }

      return 'transient';
    } catch {
      if (attempt === 0) {
        const latest = getRefreshToken();
        if (latest && latest !== refreshToken) {
          refreshToken = latest;
          continue;
        }
      }
      return 'transient';
    }
  }

  return 'transient';
}

export async function refreshAuthSession(): Promise<boolean> {
  const result = await refreshAuthSessionDetailed();
  return result === 'success';
}

export async function refreshAuthSessionDetailed(): Promise<RefreshResult> {
  if (!refreshPromise) {
    refreshPromise = tryRefreshTokens().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function ensureValidAccessToken(): Promise<boolean> {
  if (!getRefreshToken()) return false;

  const accessToken = getAccessToken();
  if (accessToken && !isAccessTokenExpired(ACCESS_REFRESH_BUFFER_MS)) {
    return true;
  }

  const result = await refreshAuthSessionDetailed();
  return result === 'success';
}

export function scheduleProactiveTokenRefresh(onRefresh?: () => void) {
  if (proactiveRefreshTimer !== null) {
    window.clearTimeout(proactiveRefreshTimer);
    proactiveRefreshTimer = null;
  }

  if (!getRefreshToken()) return;

  const expiresAt = getAccessTokenExpiresAt();
  const delay = expiresAt
    ? Math.max(5_000, expiresAt - Date.now() - ACCESS_REFRESH_BUFFER_MS)
    : 5 * 60_000;

  proactiveRefreshTimer = window.setTimeout(() => {
    void refreshAuthSessionDetailed().then((result) => {
      if (result === 'success') {
        onRefresh?.();
        scheduleProactiveTokenRefresh(onRefresh);
        return;
      }

      if (result === 'transient') {
        scheduleProactiveTokenRefresh(onRefresh);
      }
    });
  }, delay);
}

export function stopProactiveTokenRefresh() {
  if (proactiveRefreshTimer !== null) {
    window.clearTimeout(proactiveRefreshTimer);
    proactiveRefreshTimer = null;
  }
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, headers, skipAuth, timeoutMs, signal, ...rest } = options;

  const url = `${API_CONFIG.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const requestTimeout = timeoutMs ?? API_CONFIG.timeout;
  const requestSignal = signal ?? AbortSignal.timeout(requestTimeout);

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
      signal: requestSignal,
    });

  if (!skipAuth && getRefreshToken() && (!getAccessToken() || isAccessTokenExpired())) {
    await refreshAuthSession();
  }

  let response = await execute();

  if (response.status === 401 && !skipAuth && getRefreshToken()) {
    const refreshed = await refreshAuthSession();
    if (refreshed) {
      response = await execute();
    }
  }

  if (response.status === 403 && !skipAuth) {
    const errorText = await response.text();
    const errorBody = parseResponseBody(errorText);
    throw new ApiError('Forbidden', 403, errorBody);
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

export async function apiClientBlob(endpoint: string): Promise<Blob> {
  const url = `${API_CONFIG.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const buildHeaders = (): Record<string, string> => {
    const next: Record<string, string> = {};
    const token = getAccessToken();
    if (token) next.Authorization = `Bearer ${token}`;
    return next;
  };

  const execute = () =>
    fetch(url, {
      headers: buildHeaders(),
      signal: AbortSignal.timeout(API_CONFIG.timeout),
    });

  if (getRefreshToken() && (!getAccessToken() || isAccessTokenExpired())) {
    await refreshAuthSession();
  }

  let response = await execute();

  if (response.status === 401 && getRefreshToken()) {
    const refreshed = await refreshAuthSession();
    if (refreshed) {
      response = await execute();
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(`API request failed: ${response.statusText}`, response.status, errorText);
  }

  return response.blob();
}

export function applyAuthResponse(response: AuthResponse) {
  persistAuthResponse(response);
  scheduleProactiveTokenRefresh();
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
