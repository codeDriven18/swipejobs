import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { portalApi } from '@/api/portalApi';
import { UserAvatar } from '@/components/profile/UserAvatar';
import ui from '@/components/employer/ui/employerUi.module.css';
import { EmptyState } from '@/components/ui/EmptyState';
import { ApplicationStatusLabels } from '@/models/enums';
import type { PortalApplication } from '@/models/portal';
import styles from './PortalApplicationsPage.module.css';

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
    const jobTitle = applications[0]?.jobTitle;
    return jobTitle ?? 'Candidates';
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
      <header>
        <h1 className={styles.pageTitle}>{pageTitle}</h1>
        <p className={styles.pageMeta}>
          {applications.length} {applications.length === 1 ? 'person' : 'people'} to evaluate
          {jobIdFilter && (
            <>
              {' · '}
              <Link to="/portal/applications">All candidates</Link>
            </>
          )}
        </p>
      </header>

      {applications.length === 0 ? (
        <EmptyState illustration="applications" title="No candidates yet" description="Applications appear when candidates apply to your roles." actions={[{ label: 'View pipeline', to: '/portal/pipeline', primary: true }]} />
      ) : (
        <div className={styles.candidateList}>
          {applications.map((app) => {
            const parts = app.applicantName.trim().split(/\s+/);
            return (
              <Link key={app.id} to={`/portal/applications/${app.id}`} className={styles.candidateRow}>
                <UserAvatar profile={{ firstName: parts[0] ?? '', lastName: parts.slice(1).join(' '), email: app.applicantEmail, profileImageUrl: app.applicantProfileImageUrl }} size="lg" />
                <div className={styles.candidateRowMain}>
                  <h2 className={styles.candidateName}>{app.applicantName || 'Candidate'}</h2>
                  <p className={styles.candidateRole}>{app.jobTitle}</p>
                </div>
                <span className={ui.badge}>{ApplicationStatusLabels[app.status]}</span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
