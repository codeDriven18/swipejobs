import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { IconMapPin } from '@/components/icons/Icons';
import { profilesApi } from '@/api/profilesApi';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { usePageMeta } from '@/hooks/usePageMeta';
import { getProfileCanonicalUrl, resolveShareImageUrl } from '@/lib/shareUrls';
import type { PublicProfile } from '@/models/publicProfile';
import styles from './PublicProfilePage.module.css';

export function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setFailed(false);
    profilesApi.getPublic(id)
      .then(setProfile)
      .catch(() => {
        setProfile(null);
        setFailed(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const displayName = profile
    ? `${profile.firstName} ${profile.lastName}`.trim() || 'Candidate'
    : 'Profile';

  const pageMeta = useMemo(() => {
    if (!profile || !id) return null;
    return {
      title: `${displayName} · SwipeJobs`,
      description: profile.headline ?? profile.location ?? 'Candidate profile on SwipeJobs',
      image: resolveShareImageUrl(profile.profileImageUrl),
      url: getProfileCanonicalUrl(id),
      type: 'profile' as const,
    };
  }, [profile, id, displayName]);

  usePageMeta(pageMeta);

  if (loading) {
    return (
      <section className={styles.page}>
        <div className={styles.loadingHero} aria-busy="true" />
      </section>
    );
  }

  if (failed || !profile) {
    return (
      <section className={styles.page}>
        <EmptyState
          illustration="profile"
          title="Profile unavailable"
          description="This profile may be private or no longer exists."
          actions={[
            { label: 'Try again', onClick: load, primary: true },
            { label: 'Browse jobs', to: '/jobs' },
          ]}
        />
      </section>
    );
  }

  const proofSignals = [
    profile.hasLinkedIn ? 'LinkedIn verified' : '',
    profile.hasGitHub ? 'GitHub connected' : '',
    profile.hasPortfolio ? 'Portfolio linked' : '',
  ].filter(Boolean);

  return (
    <section className={styles.page}>
      <header className={styles.showcase}>
        <div className={styles.banner} aria-hidden />
        <div className={styles.identityCard}>
          <UserAvatar
            profile={{
              firstName: profile.firstName,
              lastName: profile.lastName,
              email: '',
              profileImageUrl: profile.profileImageUrl,
            }}
            size="xl"
            className={styles.avatar}
          />
          <div className={styles.identityText}>
            <h1 className={styles.name}>{displayName}</h1>
            {profile.headline && <p className={styles.headline}>{profile.headline}</p>}
            {profile.location && (
              <p className={styles.meta}>
                <IconMapPin size={15} /> {profile.location}
              </p>
            )}
          </div>
        </div>
      </header>

      {proofSignals.length > 0 && (
        <div className={styles.proofRow}>
          {proofSignals.map((signal) => (
            <span key={signal} className={styles.proofBadge}>{signal}</span>
          ))}
        </div>
      )}

      {profile.skills.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Skills</h2>
          <div className={styles.skills}>
            {profile.skills.map((skill) => (
              <span key={skill} className={styles.skill}>{skill}</span>
            ))}
          </div>
        </section>
      )}

      <footer className={styles.footer}>
        <Link to="/jobs" className={styles.cta}>Browse jobs on SwipeJobs</Link>
        <p className={styles.footerNote}>SwipeJobs profiles highlight skills and proof of work — not just résumé keywords.</p>
      </footer>
    </section>
  );
}
