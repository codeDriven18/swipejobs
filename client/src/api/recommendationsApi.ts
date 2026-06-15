import type { Job } from '@/models/job';
import { createRequestTimer } from '@/lib/apiDiagnostics';
import { apiClient } from './client';

export const recommendationsApi = {
  getMine: async (limit = 12) => {
    const timer = createRequestTimer('recommendations/me');
    try {
      const jobs = await apiClient<Job[]>(`/recommendations/me?limit=${limit}`);
      timer.end({ count: jobs.length });
      return jobs;
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown';
      timer.error(reason);
      throw error;
    }
  },
};
