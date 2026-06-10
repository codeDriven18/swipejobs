import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { savedJobsApi } from '@/api/savedJobsApi';
import { JobCard } from '@/components/jobs/JobCard';
import { useAuth } from '@/context/AuthContext';
import { EmptyState } from '@/components/ui/EmptyState';
import { JobCardSkeletonList } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/PageHeader';
import type { SavedJob } from '@/models/savedJob';
import styles from './SavedPage.module.css';

export function SavedPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [saved, setSaved] = useState<SavedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { setLoading(false); return; }
    savedJobsApi.getMine().then(setSaved).finally(() => setLoading(false));
  }, [isAuthenticated, authLoading]);

  if (authLoading || loading) {
    return (
      <section className={styles.page}>
        <PageHeader title="Saved" subtitle="Jobs you've bookmarked." />
        <JobCardSkeletonList count={3} />
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <section className={styles.page}>
        <PageHeader title="Saved" subtitle="Jobs you've bookmarked." />
        <EmptyState
          icon="♡"
          title="Sign in to save jobs"
          description="Create an account to bookmark jobs and access them anytime."
          actions={[
            { label: 'Sign in', to: '/login', primary: true },
            { label: 'Create account', to: '/register' },
          ]}
        />
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <PageHeader title="Saved" subtitle={`${saved.length} saved job${saved.length !== 1 ? 's' : ''}`} />
      {saved.length === 0 ? (
        <EmptyState
          icon="♡"
          title="No saved jobs yet"
          description="Swipe right on jobs you like, or tap ♡ on any listing to save it here."
          actions={[
            { label: 'Start swiping', to: '/swipe', primary: true },
            { label: 'Browse all jobs', to: '/jobs' },
          ]}
        />
      ) : (
        <div className={styles.list}>
          {saved.map((s) => s.job && (
            <JobCard
              key={s.id}
              job={s.job}
              saved
              onClick={() => navigate(`/jobs/${s.jobId}`)}
              onSaveToggle={async (e) => {
                e.stopPropagation();
                await savedJobsApi.unsave(s.id);
                setSaved((prev) => prev.filter((x) => x.id !== s.id));
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
