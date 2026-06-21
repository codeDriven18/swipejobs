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

async function uploadImage(
  path: string,
  file: File,
): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await authorizedFetch(`${API_CONFIG.baseUrl}${path}`, { method: 'POST', body: formData });
  if (!response.ok) {
    const text = await response.text();
    let message = 'Upload failed';
    try {
      message = (JSON.parse(text) as { error?: string }).error ?? message;
    } catch { /* ignore */ }
    throw new Error(message);
  }
  const body = await response.json() as { logoUrl?: string; bannerUrl?: string };
  return body.logoUrl ?? body.bannerUrl ?? '';
}

export const companyUploadApi = {
  uploadLogo: (file: File) => uploadImage('/portal/company/logo', file),
  uploadBanner: (file: File) => uploadImage('/portal/company/banner', file),
};
