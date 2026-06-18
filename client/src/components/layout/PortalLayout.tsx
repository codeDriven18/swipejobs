import { useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { EmployerWorkspaceProvider, useEmployerWorkspace } from '@/context/EmployerWorkspaceContext';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { PortalHeader } from '@/components/employer/PortalHeader';
import { PortalSidebar } from '@/components/employer/PortalSidebar';
import { PortalMobileNav } from '@/components/employer/PortalMobileNav';
import { resolvePortalPageTitle } from '@/components/employer/portalNav';
import '@/styles/employerDesignSystem.css';
import styles from './PortalLayout.module.css';

function PortalLayoutShell() {
  const location = useLocation();
  const { brandColor } = useEmployerWorkspace();
  const { count: unreadMessages } = useUnreadMessages();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isConversation = /^\/portal\/messages\/[^/]+$/.test(location.pathname);
  const isPipeline = location.pathname === '/portal/pipeline' || location.pathname.startsWith('/portal/pipeline/');
  const pageTitle = useMemo(
    () => resolvePortalPageTitle(location.pathname),
    [location.pathname],
  );

  const layoutStyle = useMemo(
    () => ({ '--employer-brand': brandColor }) as React.CSSProperties,
    [brandColor],
  );

  if (isConversation) {
    return (
      <div className={`${styles.layout} ${styles.layoutFullscreen} ${styles.employerWorkspace}`} style={layoutStyle}>
        <main className={styles.mainFullscreen}>
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className={`${styles.layout} ${styles.employerWorkspace}`} style={layoutStyle}>
      <PortalSidebar unreadMessages={unreadMessages} className={styles.desktopSidebar} />

      <AnimatePresence>
        {drawerOpen && (
          <div className={styles.drawer} role="presentation">
            <button
              type="button"
              className={styles.drawerBackdrop}
              aria-label="Close menu"
              onClick={() => setDrawerOpen(false)}
            />
            <PortalSidebar
              unreadMessages={unreadMessages}
              onNavigate={() => setDrawerOpen(false)}
              className={styles.drawerPanel}
            />
          </div>
        )}
      </AnimatePresence>

      <div className={styles.workspace}>
        <PortalHeader
          title={pageTitle}
          showMenuButton
          onOpenMenu={() => setDrawerOpen(true)}
        />

        <main className={[styles.main, isPipeline ? styles.mainPipelineReady : ''].filter(Boolean).join(' ')}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className={styles.page}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      <PortalMobileNav unreadMessages={unreadMessages} />
    </div>
  );
}

export function PortalLayout() {
  return (
    <EmployerWorkspaceProvider>
      <PortalLayoutShell />
    </EmployerWorkspaceProvider>
  );
}
