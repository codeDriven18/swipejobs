import { ApiError } from '@/api/client';

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error instanceof ApiError) {
    if (error.body && typeof error.body === 'object' && 'error' in error.body) {
      return String((error.body as { error: string }).error);
    }
    return error.message;
  }
  return error instanceof Error ? error.message : fallback;
}
