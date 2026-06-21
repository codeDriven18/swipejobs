import { useMemo, type CSSProperties } from 'react';
import { Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { EmployerWorkspaceProvider, useEmployerWorkspace } from '@/context/EmployerWorkspaceContext';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { resolveWorkspaceContext } from '@/portal/nav';
import { WorkspaceNav, WorkspaceNavDrawer } from '@/portal/shell/WorkspaceNav';
import { WorkspaceMobileNav } from '@/portal/shell/WorkspaceMobileNav';
import { PortalLoadingShell } from '@/portal/shell/PortalLoadingShell';
import '@/portal/tokens.css';
import ws from '@/portal/workspace.module.css';
import navStyles from '@/portal/shell/WorkspaceNav.module.css';
import { useState } from 'react';

function WorkspaceShellInner() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { brandColor, loading: workspaceLoading } = useEmployerWorkspace();
  const { count: unreadMessages } = useUnreadMessages();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isPipeline = location.pathname.startsWith('/portal/pipeline')
    || location.pathname === '/portal/applications';
  const isInbox = location.pathname.startsWith('/portal/messages');
  const context = useMemo(
    () => resolveWorkspaceContext(location.pathname, searchParams),
    [location.pathname, searchParams],
  );

  const style = useMemo(
    () => ({ '--ws-brand': brandColor, '--employer-brand': brandColor }) as CSSProperties,
    [brandColor],
  );

  if (workspaceLoading) {
    return <PortalLoadingShell />;
  }

  return (
    <div className={`employer-portal ${ws.shell}`} style={style}>
      <WorkspaceNav unreadMessages={unreadMessages} />
      <WorkspaceNavDrawer open={drawerOpen} unreadMessages={unreadMessages} onClose={() => setDrawerOpen(false)} />

      <div className={ws.mainColumn}>
        <header className={ws.header}>
          <button
            type="button"
            className={navStyles.menuBtn}
            aria-label="Open menu"
            onClick={() => setDrawerOpen(true)}
          >
            ☰
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
          <Outlet />
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
