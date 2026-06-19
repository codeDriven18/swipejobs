import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { portalApi } from '@/api/portalApi';
import { EmptyState } from '@/components/ui/EmptyState';
import { CandidateCard } from '@/portal/components/CandidateCard';
import { PageFrame } from '@/portal/components/PageFrame';
import ws from '@/portal/workspace.module.css';
import type { PortalApplication } from '@/models/portal';

export function CandidatesPage() {
  const [searchParams] = useSearchParams();
  const jobIdFilter = searchParams.get('jobId') ?? undefined;
  const [applications, setApplications] = useState<PortalApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setFailed(false);
    portalApi.getApplications(jobIdFilter)
      .then(setApplications)
      .catch(() => { setApplications([]); setFailed(true); })
      .finally(() => setLoading(false));
  }, [jobIdFilter]);

  useEffect(() => { load(); }, [load]);

  const subtitle = useMemo(() => {
    if (!jobIdFilter) return `${applications.length} candidates across all roles`;
    return `${applications.length} candidates · ${applications[0]?.jobTitle ?? 'Filtered role'}`;
  }, [jobIdFilter, applications]);

  if (loading) return <p className={ws.statusText}>Loading candidates…</p>;

  if (failed) {
    return (
      <PageFrame>
        <EmptyState illustration="applications" title="Could not load candidates" description="Check your connection." actions={[{ label: 'Retry', onClick: load, primary: true }]} />
      </PageFrame>
    );
  }

  return (
    <PageFrame
      meta={(
        <>
          {subtitle}
          {jobIdFilter && (
            <>
              {' · '}
              <Link to="/portal/applications">All candidates</Link>
            </>
          )}
        </>
      )}
      actions={<Link to="/portal/pipeline" className={ws.btnPrimary}>Open pipeline</Link>}
    >
      {applications.length === 0 ? (
        <EmptyState
          illustration="applications"
          title="No candidates yet"
          description="Applications appear when candidates apply to your roles."
          actions={[{ label: 'View pipeline', to: '/portal/pipeline', primary: true }]}
        />
      ) : (
        <div className={[ws.cardGrid, ws.cardGridWide].join(' ')}>
          {applications.map((app) => (
            <CandidateCard key={app.id} application={app} />
          ))}
        </div>
      )}
    </PageFrame>
  );
}
