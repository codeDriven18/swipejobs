import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { savedJobsApi } from '@/api/savedJobsApi';
import { applicationsApi } from '@/api/applicationsApi';
import { SavedCollectionCard } from '@/components/saved/SavedCollectionCard';
import { useAuth } from '@/context/AuthContext';
import { EmptyState } from '@/components/ui/EmptyState';
import { JobCardSkeletonList } from '@/components/ui/Skeleton';
import type { SavedJob } from '@/models/savedJob';
import styles from './SavedPage.module.css';

const RECENT_DAYS = 7;

export function SavedPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [saved, setSaved] = useState<SavedJob[]>([]);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { setLoading(false); return; }
    Promise.all([
      savedJobsApi.getMine(),
      applicationsApi.getMine(),
    ])
      .then(([savedList, apps]) => {
        setSaved(savedList);
        setAppliedJobIds(new Set(apps.map((a) => a.jobId)));
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated, authLoading]);

  const { recent, earlier, applied } = useMemo(() => {
    const cutoff = Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000;
    const recentItems: SavedJob[] = [];
    const earlierItems: SavedJob[] = [];
    const appliedItems: SavedJob[] = [];

    for (const item of saved) {
      if (!item.job) continue;
      if (appliedJobIds.has(item.jobId)) {
        appliedItems.push(item);
      } else if (new Date(item.savedAt).getTime() >= cutoff) {
        recentItems.push(item);
      } else {
        earlierItems.push(item);
      }
    }

    return { recent: recentItems, earlier: earlierItems, applied: appliedItems };
  }, [saved, appliedJobIds]);

  const renderSection = (title: string, items: SavedJob[], startIndex: number) => {
    if (items.length === 0) return null;
    return (
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        <div className={styles.grid}>
          {items.map((s, i) => s.job && (
            <SavedCollectionCard
              key={s.id}
              job={s.job}
              savedAt={s.savedAt}
              applied={appliedJobIds.has(s.jobId)}
              index={startIndex + i}
              onClick={() => navigate(`/jobs/${s.jobId}`)}
              onUnsave={appliedJobIds.has(s.jobId) ? undefined : async (e) => {
                e.stopPropagation();
                await savedJobsApi.unsave(s.id);
                setSaved((prev) => prev.filter((x) => x.id !== s.id));
              }}
            />
          ))}
        </div>
      </section>
    );
  };

  if (authLoading || loading) {
    return (
      <section className={styles.page}>
        <header className={styles.hero}>
          <h1 className={styles.heroTitle}>Your collection</h1>
          <p className={styles.heroSub}>Jobs you've saved along the way.</p>
        </header>
        <JobCardSkeletonList count={2} />
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <section className={styles.page}>
        <EmptyState
          illustration="saved"
          title="Start building your collection"
          description="Sign in to save roles you love and come back to them anytime."
          actions={[
            { label: 'Sign in', to: '/login', primary: true },
            { label: 'Explore jobs', to: '/swipe' },
          ]}
        />
      </section>
    );
  }

  if (saved.length === 0) {
    return (
      <section className={styles.page}>
        <EmptyState
          illustration="saved"
          title="Start building your collection"
          description="Swipe and save roles that catch your eye — they'll live here."
          actions={[
            { label: 'Start swiping', to: '/swipe', primary: true },
            { label: 'Browse Discover', to: '/jobs' },
          ]}
        />
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <h1 className={styles.heroTitle}>Your collection</h1>
        <p className={styles.heroSub}>{saved.length} saved role{saved.length !== 1 ? 's' : ''}</p>
      </header>

      {renderSection('Recently saved', recent, 0)}
      {renderSection('Earlier saved', earlier, recent.length)}
      {renderSection('Applied', applied, recent.length + earlier.length)}
    </section>
  );
}
