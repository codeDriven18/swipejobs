import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { applicationsApi } from '@/api/applicationsApi';
import { useAuth } from '@/context/AuthContext';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CompanyLink } from '@/components/jobs/CompanyLink';
import { JobCardSkeletonList } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/PageHeader';
import { JobCategoryLabels } from '@/models/enums';
import type { JobApplication } from '@/models/application';
import styles from './ApplicationsPage.module.css';

export function ApplicationsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { setLoading(false); return; }
    applicationsApi.getMine().then(setApplications).finally(() => setLoading(false));
  }, [isAuthenticated, authLoading]);

  if (authLoading || loading) {
    return (
      <section className={styles.page}>
        <PageHeader title="Applications" subtitle="Track your Quick Apply submissions." />
        <JobCardSkeletonList count={2} />
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <section className={styles.page}>
        <PageHeader title="Applications" subtitle="Track your Quick Apply submissions." />
        <EmptyState
          icon="✓"
          title="Sign in to track applications"
          description="Create an account to Quick Apply and see your submission history."
          actions={[
            { label: 'Sign in', to: '/login', primary: true },
            { label: 'Explore jobs', to: '/swipe' },
          ]}
        />
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <PageHeader title="Applications" subtitle={`${applications.length} submission${applications.length !== 1 ? 's' : ''}`} />
      {applications.length === 0 ? (
        <EmptyState
          icon="✓"
          title="No applications yet"
          description="Swipe up on a job in Discover mode, or tap Quick Apply on any listing."
          actions={[
            { label: 'Start swiping', to: '/swipe', primary: true },
            { label: 'Browse jobs', to: '/jobs' },
          ]}
        />
      ) : (
        <div className={styles.list}>
          {applications.map((app) => (
            <article key={app.id} className={styles.card}
              onClick={() => navigate(`/jobs/${app.jobId}`)} role="button" tabIndex={0}>
              <div className={styles.cardHeader}>
                <StatusBadge status={app.status} />
                <span className={styles.date}>{new Date(app.appliedAt).toLocaleDateString()}</span>
              </div>
              <h3 className={styles.title}>{app.job?.title ?? 'Job'}</h3>
              <CompanyLink
                name={app.job?.company ?? ''}
                slug={app.job?.companySlug}
                className={styles.company}
              />
              {app.job && (
                <span className={styles.badge}>{JobCategoryLabels[app.job.category]}</span>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
