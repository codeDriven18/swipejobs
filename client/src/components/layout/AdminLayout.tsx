import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  IconActivity,
  IconApplications,
  IconBell,
  IconBuilding,
  IconChart,
  IconChevronLeft,
  IconClipboard,
  IconFileText,
  IconGrid,
  IconList,
  IconSettings,
  IconUser,
} from '@/components/icons/Icons';
import type { ReactNode } from 'react';
import styles from './AdminLayout.module.css';

const navItems: { to: string; label: string; icon: ReactNode; end?: boolean }[] = [
  { to: '/admin', label: 'Dashboard', icon: <IconGrid size={18} />, end: true },
  { to: '/admin/jobs', label: 'Jobs', icon: <IconList size={18} /> },
  { to: '/admin/companies', label: 'Companies', icon: <IconBuilding size={18} /> },
  { to: '/admin/company-approvals', label: 'Approvals', icon: <IconApplications size={18} /> },
  { to: '/admin/users', label: 'Users', icon: <IconUser size={18} /> },
  { to: '/admin/applications', label: 'Applications', icon: <IconClipboard size={18} /> },
  { to: '/admin/reports', label: 'Reports', icon: <IconChart size={18} /> },
  { to: '/admin/audit', label: 'Audit Logs', icon: <IconFileText size={18} /> },
  { to: '/admin/system', label: 'System', icon: <IconActivity size={18} /> },
  { to: '/admin/notifications', label: 'Notifications', icon: <IconBell size={18} /> },
  { to: '/admin/settings', label: 'Settings', icon: <IconSettings size={18} /> },
];

const pageTitles: Record<string, string> = {
  '/admin': 'Admin Dashboard',
  '/admin/jobs': 'Job Management',
  '/admin/companies': 'Company Management',
  '/admin/company-approvals': 'Company Approvals',
  '/admin/users': 'User Management',
  '/admin/applications': 'Applications',
  '/admin/reports': 'Reports & Analytics',
  '/admin/audit': 'Audit Logs',
  '/admin/system': 'Platform Health',
  '/admin/notifications': 'Notifications',
  '/admin/settings': 'System Settings',
};

export function AdminLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const pageTitle = pageTitles[location.pathname] ?? 'Admin';

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.logo} />
          <div>
            <span className={styles.brandTitle}>SwipeJobs</span>
            <span className={styles.brandSub}>Admin Console</span>
          </div>
        </div>

        <nav className={styles.nav} aria-label="Admin navigation">
          {navItems.map((item) => (
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
        </nav>

        <div className={styles.sidebarFooter}>
          <NavLink to="/" className={styles.footerLink}>
            <IconChevronLeft size={16} />
            Back to app
          </NavLink>
        </div>
      </aside>

      <div className={styles.mainArea}>
        <header className={styles.topbar}>
          <span className={styles.topbarTitle}>{pageTitle}</span>
          <div className={styles.topbarRight}>
            <span>{user?.email}</span>
          </div>
        </header>
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
