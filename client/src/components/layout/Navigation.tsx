import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { UserRole } from '@/models/auth';
import {
  IconApplications,
  IconDiscover,
  IconHome,
  IconProfile,
  IconSaved,
  IconSignIn,
} from './NavIcons';
import styles from './Navigation.module.css';

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
  avatar?: boolean;
  icon: React.ReactNode;
}

const guestItems: NavItem[] = [
  { to: '/', label: 'Home', end: true, icon: <IconHome /> },
  { to: '/swipe', label: 'Discover', icon: <IconDiscover /> },
  { to: '/login', label: 'Sign in', icon: <IconSignIn /> },
];

const seekerItems: NavItem[] = [
  { to: '/', label: 'Home', end: true, icon: <IconHome /> },
  { to: '/swipe', label: 'Discover', icon: <IconDiscover /> },
  { to: '/saved', label: 'Saved', icon: <IconSaved /> },
  { to: '/applications', label: 'Applications', icon: <IconApplications /> },
  { to: '/profile', label: 'Profile', avatar: true, icon: <IconProfile /> },
];

export function Navigation() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { profile } = useProfile();
  if (isLoading) return null;

  const navItems = isAuthenticated ? seekerItems : guestItems;

  return (
    <nav className={styles.nav} aria-label="Main navigation">
      <div className={styles.inner}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              [styles.link, isActive ? styles.active : ''].filter(Boolean).join(' ')
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="nav-indicator"
                    className={styles.indicator}
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  />
                )}
                <span className={styles.iconWrap}>
                  {item.avatar ? (
                    user?.role === UserRole.Company ? (
                      <span className={styles.icon}><IconProfile /></span>
                    ) : profile ? (
                      <UserAvatar profile={profile} size="sm" className={styles.navAvatar} />
                    ) : (
                      <span className={styles.icon}>{item.icon}</span>
                    )
                  ) : (
                    <span className={styles.icon}>{item.icon}</span>
                  )}
                </span>
                <span className={styles.label}>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
