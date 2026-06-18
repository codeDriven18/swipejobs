import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { portalApi } from '@/api/portalApi';
import { CandidateTrustBadge } from '@/components/portal/CandidateTrustBadge';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { EmployerPageHeader } from '@/components/employer/EmployerPageHeader';
import ui from '@/components/employer/ui/employerUi.module.css';
import { EmptyState } from '@/components/ui/EmptyState';
import { ApplicationStatusLabels } from '@/models/enums';
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

  const filteredTitle = useMemo(() => {
    if (!jobIdFilter) return 'Candidates';
    const jobTitle = applications[0]?.jobTitle;
    return jobTitle ? `Candidates · ${jobTitle}` : 'Candidates';
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
      <EmployerPageHeader
        title={filteredTitle}
        subtitle={`${applications.length} candidate${applications.length === 1 ? '' : 's'} in your hiring pool`}
        actions={jobIdFilter ? <Link to="/portal/applications" className={ui.btnGhost}>View all</Link> : <Link to="/portal/pipeline" className={ui.btnPrimary}>Open pipeline</Link>}
      />

      {applications.length === 0 ? (
        <EmptyState illustration="applications" title="No candidates yet" description="Applications appear when candidates apply to your roles." actions={[{ label: 'View pipeline', to: '/portal/pipeline', primary: true }]} />
      ) : (
        <div className={ui.listStack}>
          {applications.map((app) => {
            const parts = app.applicantName.trim().split(/\s+/);
            return (
              <article key={app.id} className={ui.candidateCard}>
                <div className={ui.candidateRow}>
                  <UserAvatar profile={{ firstName: parts[0] ?? '', lastName: parts.slice(1).join(' '), email: app.applicantEmail, profileImageUrl: app.applicantProfileImageUrl }} size="lg" />
                  <div className={ui.candidateIdentity}>
                    <h2 className={ui.candidateName}>{app.applicantName || 'Candidate'}</h2>
                    <CandidateTrustBadge level={app.candidateTrustLevel} />
                    <p className={ui.candidateSub}>{app.jobTitle}</p>
                  </div>
                  <span className={ui.badge}>{ApplicationStatusLabels[app.status]}</span>
                </div>
                <p className={ui.candidateDetail}>
                  Applied {new Date(app.appliedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  {app.hasResume && ' · Resume on file'}
                  {app.unreadMessageCount > 0 && ` · ${app.unreadMessageCount} unread`}
                </p>
                <div className={ui.candidateActions}>
                  <Link to={`/portal/applications/${app.id}`} className={ui.btnPrimary}>Open profile</Link>
                  <Link to="/portal/pipeline" className={ui.btnGhost}>Pipeline</Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
