import { ApiError } from '@/api/client';

function readValidationErrors(body: unknown): string | null {
  if (!body || typeof body !== 'object' || !('validationErrors' in body)) return null;

  const validationErrors = (body as { validationErrors?: Record<string, string[]> }).validationErrors;
  if (!validationErrors) return null;

  const messages = Object.values(validationErrors).flat().filter(Boolean);
  return messages.length > 0 ? messages.join(' ') : null;
}

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error instanceof ApiError) {
    if (error.body && typeof error.body === 'object') {
      const body = error.body as {
        error?: string;
        message?: string;
        code?: string;
        diagnostics?: { validationResult?: string };
      };

      if (body.diagnostics?.validationResult && body.diagnostics.validationResult !== 'Valid') {
        return body.diagnostics.validationResult;
      }

      const validation = readValidationErrors(body);
      if (validation) return validation;

      if (body.error) return String(body.error);
      if (body.message) return String(body.message);
    }

    return error.message;
  }

  return error instanceof Error ? error.message : fallback;
}
