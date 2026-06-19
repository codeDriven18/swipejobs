import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { portalApi } from '@/api/portalApi';
import { CandidateEntityCard } from '@/components/employer/entities/CandidateEntityCard';
import ui from '@/components/employer/ui/employerUi.module.css';
import layout from '@/styles/employerComposition.module.css';
import { EmptyState } from '@/components/ui/EmptyState';
import type { PortalApplication } from '@/models/portal';

export function PortalApplicationsPage() {
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

  const pageTitle = useMemo(() => {
    if (!jobIdFilter) return 'Candidates';
    return applications[0]?.jobTitle ?? 'Candidates';
  }, [jobIdFilter, applications]);

  if (loading) return <p className={ui.statusText}>Loading candidates…</p>;

  if (failed) {
    return (
      <section className={ui.page}>
        <EmptyState illustration="applications" title="Could not load candidates" description="Check your connection." actions={[{ label: 'Retry', onClick: load, primary: true }]} />
      </section>
    );
  }

  return (
    <section className={ui.page}>
      <header className={layout.workspaceSectionHeader}>
        <div>
          <h1 className={ui.workboardToolbarTitle}>{pageTitle}</h1>
          <p className={ui.workboardToolbarMeta}>
            {applications.length} candidates to evaluate
            {jobIdFilter && (
              <>
                {' · '}
                <Link to="/portal/applications">All candidates</Link>
              </>
            )}
          </p>
        </div>
        <Link to="/portal/pipeline" className={ui.btnPrimary}>Open pipeline</Link>
      </header>

      {applications.length === 0 ? (
        <EmptyState illustration="applications" title="No candidates yet" description="Applications appear when candidates apply to your roles." actions={[{ label: 'View pipeline', to: '/portal/pipeline', primary: true }]} />
      ) : (
        <div className={`${layout.entityGrid} ${layout.entityGridWide}`}>
          {applications.map((app) => (
            <CandidateEntityCard key={app.id} application={app} />
          ))}
        </div>
      )}
    </section>
  );
}
