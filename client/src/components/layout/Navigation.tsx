import { NavLink } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { usePwaInstallPrompt } from '@/context/PwaInstallContext';
import { useProfile } from '@/hooks/useProfile';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { UserRole } from '@/models/auth';
import styles from './Navigation.module.css';

const guestItems = [
  { to: '/', label: 'Home', icon: '▣' },
  { to: '/jobs', label: 'Jobs', icon: '☰' },
  { to: '/swipe', label: 'Swipe', icon: '⚡', featured: true },
  { to: '/login', label: 'Sign in', icon: '→' },
] as const;

const authBaseItems = [
  { to: '/', label: 'Home', icon: '▣' },
  { to: '/jobs', label: 'Jobs', icon: '☰' },
  { to: '/swipe', label: 'Swipe', icon: '⚡', featured: true },
  { to: '/saved', label: 'Saved', icon: '♡' },
  { to: '/profile', label: 'Profile', icon: '◎', avatar: true },
] as const;

export function Navigation() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { profile } = useProfile();
  const { canInstall, isStandalone, promptInstall } = usePwaInstallPrompt();

  if (isLoading) return null;

  const roleItems = [];
  if (isAuthenticated && user?.role === UserRole.Company) {
    roleItems.push({ to: '/portal', label: 'Portal', icon: '🏢' });
  }

  const navItems = isAuthenticated ? [...authBaseItems, ...roleItems] : guestItems;

  return (
    <nav className={styles.nav} aria-label="Main navigation">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) => {
            const classes = [styles.link];
            if (isActive) classes.push(styles.active);
            if ('featured' in item && item.featured) classes.push(styles.featured);
            return classes.join(' ');
          }}
        >
          {'avatar' in item && item.avatar ? (
            user?.role === UserRole.Company ? (
              <span className={styles.icon}>🏢</span>
            ) : profile ? (
              <UserAvatar profile={profile} size="sm" className={styles.navAvatar} />
            ) : (
              <span className={styles.icon}>{item.icon}</span>
            )
          ) : (
            <span className={styles.icon}>{item.icon}</span>
          )}
          <span className={styles.label}>{item.label}</span>
        </NavLink>
      ))}
      {canInstall && !isStandalone && (
        <button
          type="button"
          className={`${styles.link} ${styles.installLink}`}
          onClick={() => void promptInstall()}
        >
          <span className={styles.icon}>📱</span>
          <span className={styles.label}>Install</span>
        </button>
      )}
    </nav>
  );
}
