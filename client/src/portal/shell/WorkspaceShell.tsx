import { useMemo, useState, type CSSProperties } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { EmployerWorkspaceProvider, useEmployerWorkspace } from '@/context/EmployerWorkspaceContext';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { resolveWorkspaceTitle } from '@/portal/nav';
import { WorkspaceNav, WorkspaceNavDrawer } from '@/portal/shell/WorkspaceNav';
import '@/portal/tokens.css';
import ws from '@/portal/workspace.module.css';
import navStyles from '@/portal/shell/WorkspaceNav.module.css';

function WorkspaceShellInner() {
  const location = useLocation();
  const { brandColor } = useEmployerWorkspace();
  const { count: unreadMessages } = useUnreadMessages();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isPipeline = location.pathname.startsWith('/portal/pipeline');
  const isInbox = location.pathname.startsWith('/portal/messages');
  const pageTitle = useMemo(() => resolveWorkspaceTitle(location.pathname), [location.pathname]);

  const style = useMemo(
    () => ({ '--ws-brand': brandColor, '--employer-brand': brandColor }) as CSSProperties,
    [brandColor],
  );

  return (
    <div className={`employer-portal ${ws.shell}`} style={style}>
      <WorkspaceNav unreadMessages={unreadMessages} />
      <WorkspaceNavDrawer open={drawerOpen} unreadMessages={unreadMessages} onClose={() => setDrawerOpen(false)} />

      <div className={ws.mainColumn}>
        <header className={ws.header}>
          <button type="button" className={navStyles.menuBtn} aria-label="Open menu" onClick={() => setDrawerOpen(true)}>
            ☰
          </button>
          <h1 className={ws.headerTitle}>{pageTitle}</h1>
        </header>

        <main className={[
          ws.main,
          isPipeline ? ws.mainPipeline : '',
          isInbox ? ws.mainInbox : '',
        ].filter(Boolean).join(' ')}>
          <Outlet />
        </main>
      </div>
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
