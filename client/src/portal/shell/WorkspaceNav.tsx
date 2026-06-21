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

interface WorkspaceNavProps {
  unreadMessages: number;
  onNavigate?: () => void;
  className?: string;
}

function NavLinkItem({
  item,
  unreadMessages,
  onNavigate,
}: {
  item: WorkspaceNavItem;
  unreadMessages: number;
  onNavigate?: () => void;
}) {
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
    >
      <Icon className={navStyles.linkIcon} />
      {item.label}
      {badge && <span className={navStyles.badge}>{badge}</span>}
    </NavLink>
  );
}

export function WorkspaceNav({ unreadMessages, onNavigate, className }: WorkspaceNavProps) {
  const { company, stats } = useEmployerWorkspace();
  const companyName = company?.name ?? 'Hiring workspace';
  const status = company?.status ?? stats?.companyStatus;

  return (
    <aside className={[navStyles.nav, className].filter(Boolean).join(' ')}>
      <div className={navStyles.identity}>
        {company ? (
          <CompanyAvatar company={company} size="sm" className={navStyles.identityLogo} />
        ) : (
          <span className={navStyles.identityLogoFallback} aria-hidden />
        )}
        <div className={navStyles.identityText}>
          <p className={navStyles.identityName}>{companyName}</p>
          <p className={navStyles.identityTagline}>Hiring workspace</p>
          {status != null && status !== CompanyStatus.Approved && (
            <span className={navStyles.identityStatus}>{CompanyStatusLabels[status]}</span>
          )}
        </div>
      </div>

      <nav className={navStyles.links} aria-label="Hiring workflow">
        {WORKSPACE_NAV_PRIMARY.map((item) => (
          <NavLinkItem key={item.to} item={item} unreadMessages={unreadMessages} onNavigate={onNavigate} />
        ))}
      </nav>

      <nav className={navStyles.linksSecondary} aria-label="Workspace settings">
        <p className={navStyles.groupLabel}>Workspace</p>
        {WORKSPACE_NAV_SECONDARY.map((item) => (
          <NavLinkItem key={item.to} item={item} unreadMessages={unreadMessages} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className={navStyles.footer}>
        <span className={navStyles.poweredBy}>Powered by SwipeJobs</span>
      </div>
    </aside>
  );
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
  if (!open) return null;
  return (
    <div className={navStyles.drawer} role="presentation">
      <button type="button" className={navStyles.drawerBackdrop} aria-label="Close menu" onClick={onClose} />
      <WorkspaceNav unreadMessages={unreadMessages} onNavigate={onClose} className={navStyles.drawerNav} />
    </div>
  );
}
