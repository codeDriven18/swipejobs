import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { Navigation } from './Navigation';
import { InboxHeaderActions } from './InboxHeaderActions';
import { AppIcon } from '@/components/brand/AppIcon';
import { useAuth } from '@/context/AuthContext';
import { usePwaInstallPrompt } from '@/context/PwaInstallContext';
import styles from './AppLayout.module.css';

const AUTH_PATHS = new Set(['/login', '/register', '/forgot-password']);

export function AppLayout() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { isStandalone } = usePwaInstallPrompt();
  const isSwipe = location.pathname === '/swipe';
  const isWelcome = location.pathname === '/welcome';
  const isAuthPage = AUTH_PATHS.has(location.pathname);
  const isChatConversation = /^\/messages\/[^/]+$/.test(location.pathname)
    || /^\/portal\/messages\/[^/]+$/.test(location.pathname);
  const hideHeader = isSwipe || isWelcome || isAuthPage || isChatConversation;
  const hideNav = isAuthPage || isChatConversation;
  const isProfileHub = location.pathname === '/profile' || location.pathname.startsWith('/profile/');
  const showInboxActions = isAuthenticated && !isProfileHub && !isSwipe && !isWelcome && !isAuthPage
    && (location.pathname === '/' || location.pathname === '/saved' || location.pathname === '/applications');
  const { scrollY } = useScroll();
  const headerFadeOpacity = useTransform(scrollY, [0, 72], [1, 0]);

  return (
    <div className={`${styles.layout} ${isStandalone ? styles.layoutStandalone : ''}`}>
      {!hideHeader && (
        <header className={`${styles.header} ${isStandalone ? styles.headerStandalone : ''}`}>
          <motion.div className={styles.brand} style={{ opacity: headerFadeOpacity }}>
            <AppIcon size="sm" />
            {!isStandalone && <span className={styles.title}>SwipeJobs</span>}
            {isStandalone && isProfileHub && <span className={styles.title}>Profile</span>}
          </motion.div>
          <motion.div className={styles.headerActions} style={{ opacity: headerFadeOpacity }}>
            {showInboxActions && <InboxHeaderActions />}
          </motion.div>
        </header>
      )}

      <main className={`${styles.main} ${isSwipe ? styles.mainSwipe : ''} ${isChatConversation ? styles.mainChat : ''} ${isWelcome ? styles.mainWelcome : ''} ${isAuthPage ? styles.mainWelcome : ''}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className={styles.pageContent}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {!hideNav && <Navigation />}
    </div>
  );
}
