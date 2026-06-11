import { API_CONFIG } from './config';
import { getAccessToken, getRefreshToken } from '@/lib/authStorage';
import { refreshAuthSession } from './client';

async function authorizedFetch(url: string, init: RequestInit): Promise<Response> {
  const token = getAccessToken();
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response = await fetch(url, { ...init, headers, signal: AbortSignal.timeout(API_CONFIG.timeout) });

  if (response.status === 401 && getRefreshToken()) {
    const refreshed = await refreshAuthSession();
    if (refreshed) {
      const retryToken = getAccessToken();
      if (retryToken) headers.set('Authorization', `Bearer ${retryToken}`);
      response = await fetch(url, { ...init, headers, signal: AbortSignal.timeout(API_CONFIG.timeout) });
    }
  }

  return response;
}

export async function uploadProfileAvatar(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<{ profileImageUrl: string }> {
  onProgress?.(10);

  const formData = new FormData();
  formData.append('file', file);

  onProgress?.(40);

  const url = `${API_CONFIG.baseUrl}/profiles/me/avatar`;
  const response = await authorizedFetch(url, { method: 'POST', body: formData });

  onProgress?.(90);

  if (!response.ok) {
    const text = await response.text();
    let message = 'Avatar upload failed';
    try {
      const body = JSON.parse(text) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  onProgress?.(100);
  return response.json() as Promise<{ profileImageUrl: string }>;
}

export async function removeProfileAvatar(): Promise<void> {
  const url = `${API_CONFIG.baseUrl}/profiles/me/avatar`;
  const response = await authorizedFetch(url, { method: 'DELETE' });
  if (!response.ok && response.status !== 204) {
    throw new Error('Failed to remove avatar');
  }
}

export async function uploadProfileResume(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<{ resumeFileName: string; resumeUploadedAt: string }> {
  onProgress?.(10);

  const formData = new FormData();
  formData.append('file', file);

  onProgress?.(40);

  const url = `${API_CONFIG.baseUrl}/profiles/me/resume`;
  const response = await authorizedFetch(url, { method: 'POST', body: formData });

  onProgress?.(90);

  if (!response.ok) {
    const text = await response.text();
    let message = 'Resume upload failed';
    try {
      const body = JSON.parse(text) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  onProgress?.(100);
  return response.json() as Promise<{ resumeFileName: string; resumeUploadedAt: string }>;
}

export async function removeProfileResume(): Promise<void> {
  const url = `${API_CONFIG.baseUrl}/profiles/me/resume`;
  const response = await authorizedFetch(url, { method: 'DELETE' });
  if (!response.ok && response.status !== 204) {
    throw new Error('Failed to remove resume');
  }
}
