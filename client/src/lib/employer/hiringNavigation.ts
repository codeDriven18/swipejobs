export type HiringOrigin = 'today' | 'pipeline' | 'list' | 'inbox' | 'roles';

export function candidateProfilePath(
  applicationId: string,
  options?: { from?: HiringOrigin; jobId?: string },
): string {
  const params = new URLSearchParams();
  if (options?.from) params.set('from', options.from);
  if (options?.jobId) params.set('jobId', options.jobId);
  const query = params.toString();
  return `/portal/applications/${applicationId}${query ? `?${query}` : ''}`;
}

export function resolveBackNavigation(
  from: string | null,
  jobId: string | null,
): { label: string; to: string } {
  switch (from) {
    case 'today':
      return { label: 'Today', to: '/portal' };
    case 'inbox':
      return { label: 'Inbox', to: '/portal/messages' };
    case 'list': {
      const params = new URLSearchParams({ view: 'list' });
      if (jobId) params.set('jobId', jobId);
      return { label: 'Pipeline', to: `/portal/pipeline?${params}` };
    }
    case 'pipeline':
    case 'roles':
    default: {
      if (jobId) return { label: 'Pipeline', to: `/portal/pipeline?jobId=${jobId}` };
      return { label: 'Pipeline', to: '/portal/pipeline' };
    }
  }
}

export function pipelineListPath(jobId?: string): string {
  const params = new URLSearchParams({ view: 'list' });
  if (jobId) params.set('jobId', jobId);
  return `/portal/pipeline?${params}`;
}
