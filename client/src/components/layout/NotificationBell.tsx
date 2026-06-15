import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { IconBell, IconCheck, IconChevronRight } from '@/components/icons/Icons';
import { useNotifications } from '@/hooks/useNotifications';
import { useDismissibleOverlay } from '@/hooks/useDismissibleOverlay';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/models/auth';
import { NotificationType } from '@/models/personalization';
import styles from './NotificationBell.module.css';

const PANEL_ID = 'notifications';

interface NotificationBellProps {
  bellClassName?: string;
}

export function NotificationBell({ bellClassName }: NotificationBellProps = {}) {
  const { isAuthenticated, user } = useAuth();
  const { notifications, unreadCount, markAllRead, markRead, dismiss, dismissAll } = useNotifications();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  const toggleOpen = useCallback(() => {
    setOpen((wasOpen) => {
      if (!wasOpen) {
        void markAllRead();
      }
      return !wasOpen;
    });
  }, [markAllRead]);

  useDismissibleOverlay({
    open,
    onClose: close,
    containerRef,
    panelRef,
    panelId: PANEL_ID,
  });

  if (!isAuthenticated || user?.role !== UserRole.JobSeeker) return null;

  const handleNotificationOpen = (id: string, isRead: boolean) => {
    if (!isRead) void markRead(id);
  };

  const handleNotificationNavigate = (id: string, isRead: boolean) => {
    if (!isRead) void markRead(id);
    close();
  };

  const resolveNotificationLink = (n: typeof notifications[number]) => {
    if (n.relatedConversationId) {
      return `/messages/${n.relatedConversationId}`;
    }
    if (n.relatedApplicationId) {
      return '/applications';
    }
    if (n.type === NotificationType.NewJobFromFollowedCompany && n.relatedJobId) {
      return `/jobs/${n.relatedJobId}`;
    }
    if (n.relatedJobId) {
      return `/jobs/${n.relatedJobId}`;
    }
    return null;
  };

  return (
    <div ref={containerRef} className={styles.wrap}>
      <button
        type="button"
        className={[styles.bell, bellClassName].filter(Boolean).join(' ')}
        onClick={toggleOpen}
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <IconBell size={22} className={styles.bellIcon} />
        {unreadCount > 0 && (
          <span className={styles.count}>{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <button
              type="button"
              className={styles.backdrop}
              onClick={close}
              aria-label="Close notifications"
              tabIndex={-1}
            />
            <motion.div
              ref={panelRef}
              className={styles.panel}
              role="dialog"
              aria-label="Notifications"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              <div className={styles.panelHeader}>
                <span className={styles.panelTitle}>Notifications</span>
                {notifications.length > 0 && (
                  <button type="button" className={styles.markAll} onClick={() => void dismissAll()}>
                    Clear all
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <p className={styles.empty}>No notifications yet.</p>
              ) : (
                <ul className={styles.list}>
                  {notifications.map((n) => (
                    <li
                      key={n.id}
                      className={n.isRead ? styles.itemRead : styles.item}
                      onMouseEnter={() => handleNotificationOpen(n.id, n.isRead)}
                      onFocus={() => handleNotificationOpen(n.id, n.isRead)}
                    >
                      <div className={styles.itemTop}>
                        <strong>{n.title}</strong>
                        <button
                          type="button"
                          className={styles.readBtn}
                          onClick={() => void dismiss(n.id)}
                          aria-label="Dismiss notification"
                        >
                          <IconCheck size={16} />
                        </button>
                      </div>
                      <p className={styles.msg}>{n.message}</p>
                      {(() => {
                        const to = resolveNotificationLink(n);
                        if (!to) return null;
                        const label = n.type === NotificationType.NewMessage
                          ? 'Open conversation'
                          : n.type === NotificationType.InterviewInvited
                            ? 'View application'
                            : 'View details';
                        return (
                          <Link
                            to={to}
                            className={styles.link}
                            onClick={() => handleNotificationNavigate(n.id, n.isRead)}
                          >
                            {label} <IconChevronRight size={14} />
                          </Link>
                        );
                      })()}
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
