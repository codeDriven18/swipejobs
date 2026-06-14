import { useCallback, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { AdminGlobalSearch, useAdminSearchShortcut } from '@/components/admin/AdminGlobalSearch';
import { HeaderThemeToggle } from '@/components/theme/HeaderThemeToggle';
import { useDismissOnInteractOutside } from '@/hooks/useDismissOnInteractOutside';
import {
  IconActivity,
  IconApplications,
  IconBell,
  IconBuilding,
  IconChart,
  IconChevronLeft,
  IconClipboard,
  IconFileText,
  IconFilter,
  IconGrid,
  IconList,
  IconSettings,
  IconUser,
} from '@/components/icons/Icons';
import type { ReactNode } from 'react';
import styles from './AdminLayout.module.css';

const primaryNav: { to: string; label: string; icon: ReactNode; end?: boolean }[] = [
  { to: '/admin', label: 'Dashboard', icon: <IconGrid size={18} />, end: true },
  { to: '/admin/moderation', label: 'Moderation', icon: <IconFilter size={18} /> },
  { to: '/admin/sources', label: 'Sources', icon: <IconActivity size={18} /> },
  { to: '/admin/jobs', label: 'Jobs', icon: <IconList size={18} /> },
  { to: '/admin/companies', label: 'Companies', icon: <IconBuilding size={18} /> },
];

const secondaryNav: { to: string; label: string; icon: ReactNode }[] = [
  { to: '/admin/company-approvals', label: 'Approvals', icon: <IconApplications size={18} /> },
  { to: '/admin/users', label: 'Users', icon: <IconUser size={18} /> },
  { to: '/admin/applications', label: 'Applications', icon: <IconClipboard size={18} /> },
  { to: '/admin/reports', label: 'Reports', icon: <IconChart size={18} /> },
  { to: '/admin/audit', label: 'Audit', icon: <IconFileText size={18} /> },
  { to: '/admin/system', label: 'System', icon: <IconActivity size={18} /> },
  { to: '/admin/notifications', label: 'Notifications', icon: <IconBell size={18} /> },
  { to: '/admin/settings', label: 'Settings', icon: <IconSettings size={18} /> },
];

const pageTitles: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/moderation': 'Moderation',
  '/admin/sources': 'Sources',
  '/admin/jobs': 'Jobs',
  '/admin/companies': 'Companies',
  '/admin/company-approvals': 'Approvals',
  '/admin/users': 'Users',
  '/admin/applications': 'Applications',
  '/admin/reports': 'Reports',
  '/admin/audit': 'Audit',
  '/admin/system': 'System',
  '/admin/system/ai': 'AI',
  '/admin/notifications': 'Notifications',
  '/admin/settings': 'Settings',
};

export function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  useAdminSearchShortcut(openSearch);
  useDismissOnInteractOutside(menuOpen, () => setMenuOpen(false), userMenuRef);

  const pageTitle = pageTitles[location.pathname] ?? 'Admin';

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.logo} />
          <div>
            <span className={styles.brandTitle}>SwipeJobs</span>
            <span className={styles.brandSub}>Moderation Console</span>
          </div>
        </div>

        <nav className={styles.nav} aria-label="Admin navigation">
          <p className={styles.navGroupLabel}>Ingestion</p>
          {primaryNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end ?? false}
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navActive : ''}`
              }
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}

          <p className={styles.navGroupLabel}>Platform</p>
          {secondaryNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navActive : ''}`
              }
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <NavLink to="/" className={styles.footerLink}>
            <IconChevronLeft size={16} />
            Back to app
          </NavLink>
        </div>
      </aside>

      <div className={styles.mainArea}>
        <header className={styles.globalHeader}>
          <div className={styles.headerLeft}>
            <h1 className={styles.pageTitle}>{pageTitle}</h1>
          </div>

          <div className={styles.headerCenter}>
            <button type="button" className={styles.searchTrigger} onClick={() => setSearchOpen(true)}>
              <span>Search admin...</span>
              <kbd>Ctrl K</kbd>
            </button>
          </div>

          <div className={styles.headerRight}>
            <button type="button" className={styles.quickBtn} onClick={() => navigate('/admin/sources?new=1')}>
              + Source
            </button>
            <Link to="/admin/moderation" className={styles.quickBtnAccent}>
              Moderation
            </Link>
            <HeaderThemeToggle />
            <Link to="/admin/notifications" className={styles.iconBtn} aria-label="Notifications">
              <IconBell size={18} />
            </Link>
            <div className={styles.userMenuWrap} ref={userMenuRef}>
              <button
                type="button"
                className={styles.userMenuBtn}
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
              >
                <span className={styles.avatar}>{user?.email?.[0]?.toUpperCase() ?? 'A'}</span>
                <span className={styles.userEmail}>{user?.email}</span>
              </button>
              {menuOpen && (
                <div className={styles.userMenu}>
                  <Link to="/admin/settings" onClick={() => setMenuOpen(false)}>Settings</Link>
                  <button type="button" onClick={() => void logout()}>Log out</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className={styles.content}>
          <Outlet />
        </main>
      </div>

      <AdminGlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
