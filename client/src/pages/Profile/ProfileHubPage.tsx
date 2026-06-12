import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { applicationsApi } from '@/api/applicationsApi';
import { savedJobsApi } from '@/api/savedJobsApi';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { ProfileSkeleton } from '@/components/ui/Skeleton';
import { useProfile } from '@/hooks/useProfile';
import { getProfileCompletionPercent, shouldShowMandatoryCompletionPrompts } from '@/lib/profileCompletion';
import { getProfileSuggestions } from '@/lib/profileSuggestions';
import { getProfileDisplayName } from '@/models/userProfile';
import styles from './ProfilePage.module.css';

interface HubCard {
  to: string;
  title: string;
  description: string;
  icon: string;
}

const MANAGE_CARDS: HubCard[] = [
  { to: '/profile/details', title: 'Personal Information', description: 'Name, headline, about, location, photo', icon: '◎' },
  { to: '/profile/resume', title: 'Resume', description: 'Upload or replace your CV', icon: '📄' },
  { to: '/profile/skills', title: 'Skills', description: 'Technologies and strengths', icon: '⚡' },
  { to: '/profile/experience', title: 'Experience', description: 'Work history and roles', icon: '💼' },
  { to: '/profile/education', title: 'Education', description: 'Degrees and training', icon: '🎓' },
  { to: '/profile/preferences', title: 'Preferences', description: 'Salary, locations, remote', icon: '🎯' },
  { to: '/profile/notifications', title: 'Notifications', description: 'Email, push, job alerts', icon: '🔔' },
  { to: '/profile/privacy', title: 'Privacy', description: 'Profile and contact visibility', icon: '🔒' },
  { to: '/profile/app', title: 'App', description: 'Install, version, and updates', icon: '📱' },
  { to: '/account', title: 'Account', description: 'Password and sign out', icon: '👤' },
];

export function ProfileHubPage() {
  const { profile, loading } = useProfile();
  const [applicationsCount, setApplicationsCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    applicationsApi.getMine().then((a) => setApplicationsCount(a.length)).catch(() => setApplicationsCount(0));
    savedJobsApi.getMine().then((s) => setSavedCount(s.length)).catch(() => setSavedCount(0));
  }, []);

  const percent = useMemo(() => getProfileCompletionPercent(profile), [profile]);
  const missingCount = useMemo(() => getProfileSuggestions(profile).length, [profile]);

  if (loading || !profile) {
    return (
      <section className={styles.page}>
        <ProfileSkeleton />
      </section>
    );
  }

  const displayName = getProfileDisplayName(profile) || 'Your account';

  return (
    <section className={styles.page}>
      <div className={styles.identityBanner} aria-hidden />
      <header className={styles.identityCard}>
        <div className={styles.identityAvatarWrap}>
          <UserAvatar profile={profile} size="xl" className={styles.identityAvatar} />
        </div>
        <div className={styles.identityBody}>
          <h1 className={styles.name}>{displayName}</h1>
          <p className={styles.headline}>{profile.headline?.trim() || 'Add a professional headline'}</p>
          <p className={styles.meta}>
            {profile.location?.trim() ? `📍 ${profile.location}` : 'Add your location'}
          </p>
        </div>
      </header>

      {shouldShowMandatoryCompletionPrompts(profile) && (
        <aside className={styles.completionHubCard} aria-label="Profile completion">
          <div className={styles.completionHubTop}>
            <div>
              <p className={styles.completionHubLabel}>Profile {percent}% complete</p>
              {missingCount > 0 && (
                <p className={styles.completionHubMissing}>
                  {missingCount} item{missingCount !== 1 ? 's' : ''} remaining
                </p>
              )}
            </div>
            <div className={styles.barTrack} aria-hidden>
              <div className={styles.barFill} style={{ width: `${percent}%` }} />
            </div>
          </div>
          <Link to="/profile/complete" className={styles.completeProfileBtn}>
            Complete profile
          </Link>
        </aside>
      )}

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{percent}%</span>
          <span className={styles.statLabel}>Complete</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{applicationsCount}</span>
          <span className={styles.statLabel}>Applications</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{savedCount}</span>
          <span className={styles.statLabel}>Saved jobs</span>
        </div>
      </div>

      <section className={styles.hubSection}>
        <h2 className={styles.hubSectionTitle}>Your profile</h2>
        <p className={styles.hubSectionHint}>
          Tap a section to update. Each area opens a focused page — no long forms.
        </p>
        <div className={styles.hubGrid}>
          {MANAGE_CARDS.map((card) => (
            <Link key={card.to} to={card.to} className={styles.hubCard}>
              <span className={styles.hubCardIcon} aria-hidden>{card.icon}</span>
              <div>
                <span className={styles.hubCardTitle}>{card.title}</span>
                <span className={styles.hubCardDesc}>{card.description}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </section>
  );
}
