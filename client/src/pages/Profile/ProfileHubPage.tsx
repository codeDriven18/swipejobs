import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconCheck, IconChevronRight, IconCircle } from '@/components/icons/Icons';
import { applicationsApi } from '@/api/applicationsApi';
import { savedJobsApi } from '@/api/savedJobsApi';
import { ProfileShareMenu } from '@/components/profile/ProfileShareMenu';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { ProfileSkeleton } from '@/components/ui/Skeleton';
import { useProfile } from '@/hooks/useProfile';
import { getProfileCompletionPercent, isProfileSubstantiallyComplete, shouldShowMandatoryCompletionPrompts } from '@/lib/profileCompletion';
import { markProfileSubstantiallyComplete } from '@/lib/profileCompletionStorage';
import { getVerificationSignals, isVerifiedCandidate } from '@/lib/verification';
import { getProfileDisplayName } from '@/models/userProfile';
import styles from './ProfilePage.module.css';

export function ProfileHubPage() {
  const { profile, loading } = useProfile();
  const [applicationsCount, setApplicationsCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    if (profile && isProfileSubstantiallyComplete(profile)) {
      markProfileSubstantiallyComplete();
    }
  }, [profile]);

  useEffect(() => {
    applicationsApi.getMine().then((a) => setApplicationsCount(a.length)).catch(() => setApplicationsCount(0));
    savedJobsApi.getMine().then((s) => setSavedCount(s.length)).catch(() => setSavedCount(0));
  }, []);

  const percent = useMemo(() => getProfileCompletionPercent(profile), [profile]);
  const verified = useMemo(() => (profile ? isVerifiedCandidate(profile) : false), [profile]);
  const signals = useMemo(() => (profile ? getVerificationSignals(profile) : []), [profile]);

  if (loading || !profile) {
    return (
      <section className={styles.page}>
        <ProfileSkeleton />
      </section>
    );
  }

  const displayName = getProfileDisplayName(profile) || 'Your profile';
  const topSkills = profile.skills.slice(0, 8);
  const topExperience = profile.experiences.slice(0, 3);
  const topEducation = profile.educations.slice(0, 2);

  return (
    <section className={styles.page}>
      <div className={styles.identityBanner} aria-hidden />
      <header className={styles.identityCard}>
        <div className={styles.identityAvatarWrap}>
          <UserAvatar profile={profile} size="xl" className={styles.identityAvatar} />
        </div>
        <div className={styles.identityBody}>
          <div className={styles.identityTitleRow}>
            <h1 className={styles.name}>{displayName}</h1>
            {verified && <span className={styles.verifiedBadge}>Verified Candidate</span>}
            <button type="button" className={styles.shareBtn} onClick={() => setShareOpen(true)}>
              Share
            </button>
          </div>
          <p className={styles.headline}>{profile.headline?.trim() || 'Add a professional headline'}</p>
          <p className={styles.meta}>
            {profile.location?.trim() ? profile.location : 'Add your location'}
          </p>
          <div className={styles.completionInline}>
            <div className={styles.barTrack} aria-hidden>
              <div className={styles.barFill} style={{ width: `${percent}%` }} />
            </div>
            <span className={styles.completionPct}>{percent}% complete</span>
          </div>
        </div>
      </header>

      {shouldShowMandatoryCompletionPrompts(profile) && (
        <Link to="/profile/complete" className={styles.completionHubCard}>
          Complete your profile to unlock Quick Apply everywhere <IconChevronRight size={18} />
        </Link>
      )}

      <div className={styles.quickLinksRow}>
        <Link to="/applications" className={styles.quickLinkCard}>
          <span className={styles.quickLinkValue}>{applicationsCount}</span>
          <span className={styles.quickLinkLabel}>Applications</span>
        </Link>
        <Link to="/saved" className={styles.quickLinkCard}>
          <span className={styles.quickLinkValue}>{savedCount}</span>
          <span className={styles.quickLinkLabel}>Saved jobs</span>
        </Link>
        <Link to="/profile/resume" className={styles.quickLinkCard}>
          <span className={styles.quickLinkValue}>
            {profile.resumeFileName ? <IconCheck size={20} /> : '—'}
          </span>
          <span className={styles.quickLinkLabel}>Resume</span>
        </Link>
      </div>

      <section className={styles.identitySection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>About me</h2>
          <Link to="/profile/details" className={styles.sectionEdit}>Edit</Link>
        </div>
        <p className={profile.bio?.trim() ? `${styles.aboutText} copyable-content` : styles.placeholderText}>
          {profile.bio?.trim() || 'Tell employers who you are and what you are looking for.'}
        </p>
      </section>

      <section className={styles.identitySection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Verification</h2>
        </div>
        <ul className={styles.verificationList}>
          {signals.map((signal) => (
            <li key={signal.id} className={signal.met ? styles.verificationMet : styles.verificationPending}>
              <span className={styles.verificationIcon} aria-hidden>
                {signal.met ? <IconCheck size={16} /> : <IconCircle size={16} />}
              </span>
              {signal.label}
            </li>
          ))}
        </ul>
      </section>

      {topSkills.length > 0 && (
        <section className={styles.identitySection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Skills</h2>
            <Link to="/profile/skills" className={styles.sectionEdit}>Edit</Link>
          </div>
          <div className={styles.skillChips}>
            {topSkills.map((skill) => (
              <span key={skill.id ?? skill.name} className={styles.skillChip}>{skill.name}</span>
            ))}
          </div>
        </section>
      )}

      {topExperience.length > 0 && (
        <section className={styles.identitySection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Experience</h2>
            <Link to="/profile/experience" className={styles.sectionEdit}>Edit</Link>
          </div>
          <ul className={styles.timeline}>
            {topExperience.map((exp) => (
              <li key={exp.id ?? `${exp.company}-${exp.title}`} className={styles.timelineItem}>
                <span className={styles.timelineDot} aria-hidden />
                <div>
                  <strong>{exp.title}</strong>
                  <p className={styles.timelineMeta}>{exp.company}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {topEducation.length > 0 && (
        <section className={styles.identitySection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Education</h2>
            <Link to="/profile/education" className={styles.sectionEdit}>Edit</Link>
          </div>
          <ul className={styles.timeline}>
            {topEducation.map((edu) => (
              <li key={edu.id ?? `${edu.institution}-${edu.degree}`} className={styles.timelineItem}>
                <span className={styles.timelineDot} aria-hidden />
                <div>
                  <strong>{edu.degree}</strong>
                  <p className={styles.timelineMeta}>{edu.institution}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={styles.identitySection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Links</h2>
          <Link to="/profile/details" className={styles.sectionEdit}>Edit</Link>
        </div>
        <div className={styles.linkRow}>
          {profile.linkedInUrl && (
            <a href={profile.linkedInUrl} target="_blank" rel="noopener noreferrer" className={styles.linkPill}>LinkedIn</a>
          )}
          {profile.gitHubUrl && (
            <a href={profile.gitHubUrl} target="_blank" rel="noopener noreferrer" className={styles.linkPill}>GitHub</a>
          )}
          {profile.websiteUrl && (
            <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer" className={styles.linkPill}>Portfolio</a>
          )}
          {!profile.linkedInUrl && !profile.gitHubUrl && !profile.websiteUrl && (
            <p className={styles.placeholderText}>Add LinkedIn, GitHub, or your portfolio.</p>
          )}
        </div>
      </section>

      <footer className={styles.profileSettingsFooter}>
        <Link to="/profile/app" className={styles.settingsLink}>App settings & appearance</Link>
        <Link to="/profile/notifications" className={styles.settingsLink}>Notifications</Link>
        <Link to="/profile/privacy" className={styles.settingsLink}>Privacy</Link>
        <Link to="/account" className={styles.settingsLink}>Account</Link>
      </footer>

      <ProfileShareMenu
        profileId={profile.id}
        displayName={displayName}
        open={shareOpen}
        onClose={() => setShareOpen(false)}
      />
    </section>
  );
}
