import { apiClient } from './client';

export interface AiDiagnostics {
  provider: string;
  providerSource: string;
  model: string;
  modelSource: string;
  apiKeyConfigured: boolean;
  lastSuccessfulExtractionAt: string | null;
  lastExtractionFailureAt: string | null;
  lastExtractionFailure: string | null;
  messagesProcessed: number;
  successRate: number;
  queueMetrics: {
    queued: number;
    processing: number;
    completed: number;
    failed: number;
    rateLimited: number;
    isInCooldown: boolean;
    cooldownUntilUtc: string | null;
  };
}

export interface AiConnectionTestResult {
  provider: string;
  model: string;
  success: boolean;
  latencyMs: number;
  error: string | null;
  httpStatusCode: number | null;
}

export const aiApi = {
  getDiagnostics: () => apiClient<AiDiagnostics>('/admin/ai/diagnostics'),

  testConnection: () =>
    apiClient<AiConnectionTestResult>('/admin/ai/test-connection', { method: 'POST' }),
};
