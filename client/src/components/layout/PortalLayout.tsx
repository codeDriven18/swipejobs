import { NavLink, Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { IconChevronLeft } from '@/components/icons/Icons';
import { useAuth } from '@/context/AuthContext';
import { AppIcon } from '@/components/brand/AppIcon';
import styles from './PortalLayout.module.css';

const navItems = [
  { to: '/portal', label: 'Overview', end: true },
  { to: '/portal/jobs', label: 'Jobs' },
  { to: '/portal/applications', label: 'Applicants' },
  { to: '/portal/messages', label: 'Messages' },
  { to: '/profile', label: 'Company' },
  { to: '/account', label: 'Settings' },
] as const;

export function PortalLayout() {
  const { user } = useAuth();

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <AppIcon size="sm" />
          <div className={styles.brandText}>
            <span className={styles.brandTitle}>Workspace</span>
            <span className={styles.brandSub}>{user?.companyName ?? 'Your company'}</span>
          </div>
        </div>
        <nav className={styles.sidebarNav} aria-label="Portal navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={'end' in item ? item.end : false}
              className={({ isActive }) =>
                [styles.sidebarLink, isActive ? styles.sidebarActive : ''].filter(Boolean).join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <NavLink to="/" className={styles.backLink}>
          <IconChevronLeft size={16} /> Back to app
        </NavLink>
      </aside>

      <main className={styles.main}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <Outlet />
        </motion.div>
      </main>

      <nav className={styles.bottomNav} aria-label="Portal navigation">
        <div className={styles.bottomInner}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={'end' in item ? item.end : false}
              className={({ isActive }) =>
                [styles.bottomLink, isActive ? styles.bottomActive : ''].filter(Boolean).join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="portal-nav-indicator"
                      className={styles.bottomIndicator}
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    />
                  )}
                  <span className={styles.bottomLabel}>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
