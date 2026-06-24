import { useCallback, useEffect, useState } from 'react';
import { NavLink, useLocation, useSearchParams } from 'react-router-dom';
import { CompanyAvatar } from '@/components/profile/CompanyAvatar';
import { useEmployerWorkspace } from '@/context/EmployerWorkspaceContext';
import {
  WORKSPACE_NAV_PRIMARY,
  WORKSPACE_NAV_SECONDARY,
  isWorkspaceNavActive,
  type WorkspaceNavItem,
} from '@/portal/nav';
import navStyles from './WorkspaceNav.module.css';
import { CompanyStatus, CompanyStatusLabels } from '@/models/operations';

const COLLAPSE_KEY = 'swipejobs.portal.sidebarCollapsed';

interface NavLinkItemProps {
  item: WorkspaceNavItem;
  unreadMessages: number;
  onNavigate?: () => void;
  collapsed?: boolean;
}

function NavLinkItem({ item, unreadMessages, onNavigate, collapsed }: NavLinkItemProps) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const Icon = item.icon;
  const badge = item.badgeKey === 'messages' && unreadMessages > 0
    ? (unreadMessages > 9 ? '9+' : unreadMessages)
    : null;
  const active = isWorkspaceNavActive(location.pathname, searchParams, item);

  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={[navStyles.link, active ? navStyles.linkActive : ''].filter(Boolean).join(' ')}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? item.label : undefined}
    >
      <Icon className={navStyles.linkIcon} />
      <span className={navStyles.linkLabel}>{item.label}</span>
      {badge != null && <span className={navStyles.badge}>{badge}</span>}
    </NavLink>
  );
}

interface WorkspaceNavProps {
  unreadMessages: number;
  onNavigate?: () => void;
  className?: string;
  collapsed?: boolean;
  /** When true, renders without position:fixed (for drawer use) */
  drawer?: boolean;
}

export function WorkspaceNav({
  unreadMessages,
  onNavigate,
  className,
  collapsed = false,
  drawer = false,
}: WorkspaceNavProps) {
  const { company, stats } = useEmployerWorkspace();
  const companyName = company?.name ?? 'Hiring workspace';
  const status = company?.status ?? stats?.companyStatus;

  const navClass = [
    navStyles.nav,
    collapsed ? navStyles.navCollapsed : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <aside className={navClass} style={drawer ? { position: 'relative', width: '100%', height: '100dvh' } : undefined}>
      <div className={navStyles.navInner}>
        {/* Identity + collapse toggle */}
        <div className={navStyles.identity}>
          {company ? (
            <span title={collapsed ? companyName : undefined}>
              <CompanyAvatar
                company={company}
                size="sm"
                circular
                className={navStyles.identityLogo}
              />
            </span>
          ) : (
            <span
              className={navStyles.identityLogoFallback}
              aria-hidden
              title={collapsed ? companyName : undefined}
            />
          )}
          <div className={navStyles.identityText}>
            <p className={navStyles.identityName}>{companyName}</p>
            <p className={navStyles.identityTagline}>Hiring workspace</p>
            {status != null && status !== CompanyStatus.Approved && (
              <span className={navStyles.identityStatus}>{CompanyStatusLabels[status]}</span>
            )}
          </div>
          {/* Collapse toggle is now in the header — remove from sidebar */}
        </div>

        {/* Scrollable primary nav */}
        <div className={navStyles.navScroll}>
          <nav className={navStyles.links} aria-label="Hiring workflow">
            {WORKSPACE_NAV_PRIMARY.map((item) => (
              <NavLinkItem
                key={item.to}
                item={item}
                unreadMessages={unreadMessages}
                onNavigate={onNavigate}
                collapsed={collapsed}
              />
            ))}
          </nav>
        </div>

        {/* Pinned footer — Company + Settings */}
        <div className={navStyles.navBottom}>
          <nav className={navStyles.linksSecondary} aria-label="Workspace settings">
            <p className={navStyles.groupLabel}>Workspace</p>
            {WORKSPACE_NAV_SECONDARY.map((item) => (
              <NavLinkItem
                key={item.to}
                item={item}
                unreadMessages={unreadMessages}
                onNavigate={onNavigate}
                collapsed={collapsed}
              />
            ))}
          </nav>

          <div className={navStyles.footer}>
            <span className={navStyles.poweredBy}>Powered by SwipeJobs</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function useNavCollapse() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(COLLAPSE_KEY, String(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  return { collapsed, toggle };
}

export function WorkspaceNavDrawer({
  open,
  unreadMessages,
  onClose,
}: {
  open: boolean;
  unreadMessages: number;
  onClose: () => void;
}) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={navStyles.drawer} role="dialog" aria-modal aria-label="Navigation menu">
      <button
        type="button"
        className={navStyles.drawerBackdrop}
        aria-label="Close menu"
        onClick={onClose}
      />
      <WorkspaceNav
        unreadMessages={unreadMessages}
        onNavigate={onClose}
        className={navStyles.drawerNav}
        drawer
      />
    </div>
  );
}
