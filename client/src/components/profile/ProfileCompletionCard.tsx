import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import {
  dismissSuggestion,
  getDismissedSuggestions,
  getProfileSuggestions,
  type ProfileSuggestionId,
} from '@/lib/profileSuggestions';
import { getProfileCompletionPercent, shouldShowMandatoryCompletionPrompts } from '@/lib/profileCompletion';
import type { UserProfile } from '@/models/userProfile';
import styles from './ProfileCompletionCard.module.css';

interface ProfileCompletionCardProps {
  profile: UserProfile;
  onAction: (id: ProfileSuggestionId) => void;
}

export function ProfileCompletionCard({ profile, onAction }: ProfileCompletionCardProps) {
  const [dismissed, setDismissed] = useState<ProfileSuggestionId[]>(() => getDismissedSuggestions());

  const suggestions = useMemo(() => {
    return getProfileSuggestions(profile).filter((s) => !dismissed.includes(s.id));
  }, [profile, dismissed]);

  const percent = getProfileCompletionPercent(profile);

  if (!shouldShowMandatoryCompletionPrompts(profile) || suggestions.length === 0) return null;

  const handleDismiss = (id: ProfileSuggestionId) => {
    dismissSuggestion(id);
    setDismissed((prev) => [...prev, id]);
  };

  return (
    <aside className={styles.card} aria-label="Profile completion">
      <div className={styles.header}>
        <div>
          <p className={styles.label}>Profile completion</p>
          <p className={styles.percent}>{percent}% complete</p>
        </div>
        <div className={styles.barTrack} aria-hidden>
          <div className={styles.barFill} style={{ width: `${percent}%` }} />
        </div>
      </div>
      <ul className={styles.list}>
        {suggestions.map((item) => (
          <li key={item.id} className={styles.item}>
            <span className={styles.itemLabel}>{item.label}</span>
            <div className={styles.itemActions}>
              <button type="button" className={styles.actionBtn} onClick={() => onAction(item.id)}>
                {item.actionLabel}
              </button>
              <button
                type="button"
                className={styles.dismissBtn}
                aria-label={`Dismiss ${item.label}`}
                onClick={() => handleDismiss(item.id)}
              >
                ×
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className={styles.footer}>
        <Link to="/profile/complete" className={styles.completeLink}>Complete profile</Link>
        <p className={styles.hint}>Suggestions are optional — you can ignore any of them.</p>
      </div>
    </aside>
  );
}
