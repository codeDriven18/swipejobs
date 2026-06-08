const resolvedApiUrl =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? 'http://localhost:5123/api' : 'https://swipejobs.onrender.com/api');

export const API_CONFIG = {
  baseUrl: resolvedApiUrl,
  timeout: 10_000,
} as const;

console.info('API URL', API_CONFIG.baseUrl);

export const APP_ENV = import.meta.env.VITE_APP_ENV ?? import.meta.env.MODE;
