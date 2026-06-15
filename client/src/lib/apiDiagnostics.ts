const PREFIX = '[SwipeJobs API]';

export function logApiEvent(
  scope: string,
  phase: 'start' | 'end' | 'error' | 'cancel',
  detail?: Record<string, unknown>,
) {
  if (!import.meta.env.DEV && phase !== 'error') return;

  const payload = detail ? ` ${JSON.stringify(detail)}` : '';
  const message = `${PREFIX} ${scope} ${phase}${payload}`;

  if (phase === 'error') {
    console.error(message);
    return;
  }

  console.info(message);
}

export function createRequestTimer(scope: string) {
  const startedAt = performance.now();
  logApiEvent(scope, 'start');

  return {
    end(extra?: Record<string, unknown>) {
      logApiEvent(scope, 'end', {
        durationMs: Math.round(performance.now() - startedAt),
        ...extra,
      });
    },
    error(reason: string, extra?: Record<string, unknown>) {
      logApiEvent(scope, 'error', {
        durationMs: Math.round(performance.now() - startedAt),
        reason,
        ...extra,
      });
    },
    cancel(extra?: Record<string, unknown>) {
      logApiEvent(scope, 'cancel', {
        durationMs: Math.round(performance.now() - startedAt),
        ...extra,
      });
    },
  };
}
