import { useMemo, useState, type CSSProperties, type ReactElement } from 'react';

function HamburgerIcon(): ReactElement {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden>
      <line x1="2" y1="4.5" x2="16" y2="4.5" />
      <line x1="2" y1="9" x2="16" y2="9" />
      <line x1="2" y1="13.5" x2="16" y2="13.5" />
    </svg>
  );
}
import { Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { useManifest } from '@/hooks/useManifest';
import { AnimatePresence, motion } from 'framer-motion';
import { EmployerWorkspaceProvider, useEmployerWorkspace } from '@/context/EmployerWorkspaceContext';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { resolveWorkspaceContext } from '@/portal/nav';
import { WorkspaceNav, WorkspaceNavDrawer, useNavCollapse } from '@/portal/shell/WorkspaceNav';
import { WorkspaceMobileNav } from '@/portal/shell/WorkspaceMobileNav';
import { PortalLoadingShell } from '@/portal/shell/PortalLoadingShell';
import '@/portal/tokens.css';
import ws from '@/portal/workspace.module.css';
import navStyles from '@/portal/shell/WorkspaceNav.module.css';

const NAV_FULL_WIDTH = '15.5rem';
const NAV_COLLAPSED_WIDTH = '3.75rem';

function WorkspaceShellInner() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { brandColor, loading: workspaceLoading } = useEmployerWorkspace();
  const { count: unreadMessages } = useUnreadMessages();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { collapsed, toggle } = useNavCollapse();

  const isPipeline = location.pathname.startsWith('/portal/pipeline')
    || location.pathname === '/portal/applications';
  const isInbox = location.pathname.startsWith('/portal/messages');

  const context = useMemo(
    () => resolveWorkspaceContext(location.pathname, searchParams),
    [location.pathname, searchParams],
  );

  const currentNavWidth = collapsed ? NAV_COLLAPSED_WIDTH : NAV_FULL_WIDTH;

  const style = useMemo(
    () => ({
      '--ws-brand': brandColor,
      '--employer-brand': brandColor,
      '--ws-nav-collapsed-width': NAV_COLLAPSED_WIDTH,
      '--ws-nav-current-width': currentNavWidth,
    }) as CSSProperties,
    [brandColor, currentNavWidth],
  );

  useManifest('/recruiter.webmanifest');

  if (workspaceLoading) {
    return <PortalLoadingShell />;
  }

  return (
    <div className={`employer-portal ${ws.shell}`} style={style}>
      {/* Fixed sidebar — never scrolls with page content */}
      <WorkspaceNav
        unreadMessages={unreadMessages}
        collapsed={collapsed}
      />

      {/* Mobile slide-out drawer */}
      <WorkspaceNavDrawer
        open={drawerOpen}
        unreadMessages={unreadMessages}
        onClose={() => setDrawerOpen(false)}
      />

      {/* Main content — offset by sidebar width and transitions smoothly */}
      <div
        className={ws.mainColumn}
        style={{
          marginLeft: `clamp(0px, ${currentNavWidth}, 100vw)`,
          transition: 'margin-left 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <header className={ws.header}>
          {/* Hamburger — mobile opens drawer, desktop toggles sidebar collapse */}
          <button
            type="button"
            className={navStyles.menuBtn}
            aria-label="Open navigation"
            onClick={() => setDrawerOpen(true)}
          >
            <HamburgerIcon />
          </button>
          <button
            type="button"
            className={navStyles.headerToggleBtn}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={toggle}
          >
            <HamburgerIcon />
          </button>
          <div className={ws.headerContext}>
            <p className={ws.headerBreadcrumb}>{context.breadcrumb}</p>
            <p className={ws.headerTitle}>{context.title}</p>
          </div>
        </header>

        <main className={[
          ws.main,
          ws.mainMobilePad,
          isPipeline ? ws.mainPipeline : '',
          isInbox ? ws.mainInbox : '',
        ].filter(Boolean).join(' ')}>
          <AnimatePresence mode="wait">
            <motion.div
              key={`${location.pathname}${location.search}`}
              className={ws.pageTransition}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -2 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <WorkspaceMobileNav unreadMessages={unreadMessages} />
    </div>
  );
}

export function WorkspaceShell() {
  return (
    <EmployerWorkspaceProvider>
      <WorkspaceShellInner />
    </EmployerWorkspaceProvider>
  );
}
