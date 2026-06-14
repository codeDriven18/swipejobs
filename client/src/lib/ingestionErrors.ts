import { ApiError } from '@/api/client';

const INGESTION_ERROR_MESSAGES: Record<string, string> = {
  source_not_found: 'Source not found. Create it in Admin → Sources.',
  ingestion_disabled: 'Ingestion is disabled for this source.',
  telegram_auth_failed: 'Telegram authentication failed. Check AI and Telegram configuration.',
  gemini_api_key_missing: 'Gemini API key is missing. Set AI:ApiKey in server configuration.',
  invalid_telegram_message_id: 'Telegram message ID is required.',
  channel_not_found: 'Telegram channel not found or URL is missing.',
  gemini_extraction_failed: 'Gemini extraction failed.',
  gemini_rate_limited: 'Waiting for AI quota. Extraction will retry automatically.',
  invalid_ai_response: 'Invalid response from AI.',
  candidate_persistence_failed: 'Candidate persistence failed. Check database migrations.',
  duplicate_channel_url: 'A source with this channel URL already exists.',
};

export function getIngestionErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.body && typeof error.body === 'object') {
    const body = error.body as { error?: string; code?: string; message?: string };
    if (body.code && INGESTION_ERROR_MESSAGES[body.code]) {
      return INGESTION_ERROR_MESSAGES[body.code];
    }
    if (body.error) return body.error;
    if (body.message) return body.message;
  }
  return 'Ingestion failed. Check server logs for details.';
}
