import { Link } from 'react-router-dom';
import { IconMessageBubble } from '@/components/icons/Icons';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { closeActiveFloatingPanel } from '@/lib/floatingPanels';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import styles from './InboxHeaderActions.module.css';

export function InboxHeaderActions() {
  const { count: unreadMessages } = useUnreadMessages();

  return (
    <div className={styles.wrap}>
      <NotificationBell bellClassName={styles.iconBtn} />
      <Link
        to="/messages"
        className={styles.iconBtn}
        aria-label="Messages"
        onClick={() => closeActiveFloatingPanel()}
      >
        <IconMessageBubble size={22} className={styles.headerIcon} />
        {unreadMessages > 0 && (
          <span className={styles.badge}>
            {unreadMessages > 9 ? '9+' : unreadMessages}
          </span>
        )}
      </Link>
    </div>
  );
}
