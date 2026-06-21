import { NavLink, useLocation, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { WORKSPACE_NAV_PRIMARY, isWorkspaceNavActive } from '@/portal/nav';
import styles from './WorkspaceMobileNav.module.css';

interface WorkspaceMobileNavProps {
  unreadMessages: number;
}

export function WorkspaceMobileNav({ unreadMessages }: WorkspaceMobileNavProps) {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  return (
    <nav className={styles.nav} aria-label="Mobile hiring navigation">
      <div className={styles.inner}>
        {WORKSPACE_NAV_PRIMARY.map((item) => {
          const Icon = item.icon;
          const badge = item.badgeKey === 'messages' && unreadMessages > 0
            ? (unreadMessages > 9 ? '9+' : unreadMessages)
            : null;
          const active = isWorkspaceNavActive(location.pathname, searchParams, item);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={[styles.link, active ? styles.linkActive : ''].filter(Boolean).join(' ')}
              aria-current={active ? 'page' : undefined}
            >
              {active && (
                <motion.span
                  layoutId="workspace-mobile-indicator"
                  className={styles.indicator}
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                />
              )}
              <span className={styles.iconWrap}>
                <Icon className={styles.icon} />
                {badge && <span className={styles.badge}>{badge}</span>}
              </span>
              <span className={styles.label}>{item.shortLabel ?? item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
