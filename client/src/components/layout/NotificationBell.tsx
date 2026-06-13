import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { IconBell, IconCheck, IconChevronRight } from '@/components/icons/Icons';
import { useNotifications } from '@/hooks/useNotifications';
import { useDismissibleOverlay } from '@/hooks/useDismissibleOverlay';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/models/auth';
import styles from './NotificationBell.module.css';

const PANEL_ID = 'notifications';

export function NotificationBell() {
  const { isAuthenticated, user } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useDismissibleOverlay({
    open,
    onClose: close,
    containerRef,
    panelId: PANEL_ID,
  });

  if (!isAuthenticated || user?.role !== UserRole.JobSeeker) return null;

  const handleNotificationNavigate = () => {
    close();
  };

  return (
    <div ref={containerRef} className={styles.wrap}>
      <button
        type="button"
        className={styles.bell}
        onClick={() => setOpen((v) => !v)}
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
                {unreadCount > 0 && (
                  <button type="button" className={styles.markAll} onClick={() => void markAllRead()}>
                    Mark all read
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <p className={styles.empty}>No notifications yet.</p>
              ) : (
                <ul className={styles.list}>
                  {notifications.map((n) => (
                    <li key={n.id} className={n.isRead ? styles.itemRead : styles.item}>
                      <div className={styles.itemTop}>
                        <strong>{n.title}</strong>
                        {!n.isRead && (
                          <button type="button" className={styles.readBtn} onClick={() => void markRead(n.id)} aria-label="Mark read">
                            <IconCheck size={16} />
                          </button>
                        )}
                      </div>
                      <p className={styles.msg}>{n.message}</p>
                      {n.relatedJobId && (
                        <Link
                          to={`/jobs/${n.relatedJobId}`}
                          className={styles.link}
                          onClick={handleNotificationNavigate}
                        >
                          View job <IconChevronRight size={14} />
                        </Link>
                      )}
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
