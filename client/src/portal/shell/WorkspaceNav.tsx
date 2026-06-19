import { NavLink } from 'react-router-dom';
import { WORKSPACE_NAV, type WorkspaceNavItem } from '@/portal/nav';
import navStyles from './WorkspaceNav.module.css';

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
  const Icon = item.icon;
  const badge = item.badgeKey === 'messages' && unreadMessages > 0
    ? (unreadMessages > 9 ? '9+' : unreadMessages)
    : null;

  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        [navStyles.link, isActive ? navStyles.linkActive : ''].filter(Boolean).join(' ')
      }
    >
      <Icon className={navStyles.linkIcon} />
      {item.label}
      {badge && <span className={navStyles.badge}>{badge}</span>}
    </NavLink>
  );
}

export function WorkspaceNav({ unreadMessages, onNavigate, className }: WorkspaceNavProps) {
  return (
    <aside className={[navStyles.nav, className].filter(Boolean).join(' ')}>
      <div className={navStyles.brand}>SwipeJobs</div>
      <nav className={navStyles.links} aria-label="Employer workspace">
        {WORKSPACE_NAV.map((item) => (
          <NavLinkItem key={item.to} item={item} unreadMessages={unreadMessages} onNavigate={onNavigate} />
        ))}
      </nav>
      <div className={navStyles.footer}>
        <a href="/">← Back to app</a>
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
