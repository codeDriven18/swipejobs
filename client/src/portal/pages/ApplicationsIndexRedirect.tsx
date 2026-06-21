import { Navigate, useSearchParams } from 'react-router-dom';

/** Preserves jobId when redirecting legacy /portal/applications → pipeline list view. */
export function ApplicationsIndexRedirect() {
  const [searchParams] = useSearchParams();
  const next = new URLSearchParams({ view: 'list' });
  const jobId = searchParams.get('jobId');
  if (jobId) next.set('jobId', jobId);
  return <Navigate to={`/portal/pipeline?${next.toString()}`} replace />;
}
