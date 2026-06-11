import { getProfileDisplayName, getProfileInitials, type UserProfile } from '@/models/userProfile';
import styles from './UserAvatar.module.css';

interface UserAvatarProps {
  profile?: Pick<UserProfile, 'firstName' | 'lastName' | 'email' | 'profileImageUrl'> | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClass = {
  sm: styles.sm,
  md: styles.md,
  lg: styles.lg,
  xl: styles.xl,
} as const;

export function UserAvatar({ profile, size = 'md', className = '' }: UserAvatarProps) {
  const initials = getProfileInitials(profile);
  const alt = getProfileDisplayName(profile) || 'User avatar';

  if (profile?.profileImageUrl) {
    return (
      <img
        src={profile.profileImageUrl}
        alt={alt}
        className={`${styles.avatar} ${sizeClass[size]} ${className}`.trim()}
      />
    );
  }

  return (
    <span
      className={`${styles.avatar} ${styles.fallback} ${sizeClass[size]} ${className}`.trim()}
      aria-label={alt}
      role="img"
    >
      {initials}
    </span>
  );
}
