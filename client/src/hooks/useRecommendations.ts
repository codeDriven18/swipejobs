import { useCallback, useEffect, useRef, useState } from 'react';
import { recommendationsApi } from '@/api/recommendationsApi';
import { createRequestTimer } from '@/lib/apiDiagnostics';
import type { Job } from '@/models/job';

export type RecommendationsStatus = 'idle' | 'loading' | 'ready' | 'error';

export function useRecommendations(enabled: boolean) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [status, setStatus] = useState<RecommendationsStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async (): Promise<boolean> => {
    if (!enabled) {
      abortRef.current?.abort();
      setJobs([]);
      setStatus('idle');
      setError(null);
      return true;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    setStatus('loading');
    setError(null);

    const timer = createRequestTimer('recommendation-calculation');

    try {
      const next = await recommendationsApi.getMine(12);
      if (controller.signal.aborted || requestId !== requestIdRef.current) {
        timer.cancel({ reason: 'stale-response' });
        return true;
      }

      setJobs(next);
      setStatus('ready');
      timer.end({ count: next.length });
      return true;
    } catch (cause) {
      if (controller.signal.aborted || requestId !== requestIdRef.current) {
        timer.cancel({ reason: 'aborted' });
        return true;
      }

      const reason = cause instanceof Error ? cause.message : 'Failed to load recommendations';
      setJobs([]);
      setStatus('error');
      setError(reason);
      timer.error(reason);
      return false;
    }
  }, [enabled]);

  useEffect(() => {
    void load();
    return () => {
      abortRef.current?.abort();
    };
  }, [load]);

  return {
    jobs,
    status,
    loading: status === 'loading',
    ready: status === 'ready' || status === 'error',
    error,
    reload: load,
  };
}
