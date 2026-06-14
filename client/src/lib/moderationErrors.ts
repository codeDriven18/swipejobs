import { ApiError } from '@/api/client';

const MODERATION_ERROR_MESSAGES: Record<string, string> = {
  candidate_not_found: 'Candidate not found.',
  candidate_not_approvable: 'This candidate cannot be approved in its current state.',
  approve_missing_title: 'Job title is required before approval. Edit the candidate first.',
  approve_missing_company: 'Company name is required before approval. Edit the candidate or set a channel name on the source.',
  publish_failed: 'Publishing failed. Check server logs for details.',
};

export function getModerationErrorMessage(error: unknown, fallback = 'Action failed.'): string {
  if (error instanceof ApiError && error.body && typeof error.body === 'object') {
    const body = error.body as { error?: string; code?: string; message?: string };
    if (body.code && MODERATION_ERROR_MESSAGES[body.code]) {
      return MODERATION_ERROR_MESSAGES[body.code];
    }
    if (body.error) return body.error;
    if (body.message) return body.message;
  }
  return error instanceof Error ? error.message : fallback;
}
