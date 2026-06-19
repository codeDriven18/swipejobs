import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { portalMessagingApi } from '@/api/messagingApi';
import { ConversationList } from '@/components/messaging/ConversationList';
import ui from '@/components/employer/ui/employerUi.module.css';
import { EmptyState } from '@/components/ui/EmptyState';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import type { ConversationSummary } from '@/models/messaging';
import styles from './PortalMessagesPage.module.css';

export function PortalMessagesPage() {
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const { refresh: refreshUnread } = useUnreadMessages();

  useEffect(() => {
    setLoading(true);
    portalMessagingApi.listConversations(showUnreadOnly ? 'unread' : undefined)
      .then(setConversations)
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
    void refreshUnread();
  }, [showUnreadOnly, location.pathname, refreshUnread]);

  return (
    <section className={`${ui.page} ${styles.inboxPage}`}>
      <div className={styles.inboxHeader}>
        <h1 className={styles.inboxTitle}>Messages</h1>
        <button
          type="button"
          className={showUnreadOnly ? ui.pillActive : ui.pill}
          onClick={() => setShowUnreadOnly((value) => !value)}
        >
          {showUnreadOnly ? 'Showing unread' : 'Unread only'}
        </button>
      </div>

      <div className={styles.inboxDominant}>
        {loading ? (
          <p className={ui.statusText}>Loading conversations…</p>
        ) : conversations.length === 0 ? (
          <EmptyState
            illustration="applications"
            title={showUnreadOnly ? 'No unread messages' : 'No conversations yet'}
            description={showUnreadOnly ? 'You are caught up on replies.' : 'Invite candidates to interview to unlock messaging.'}
            actions={[{ label: 'Open pipeline', to: '/portal/pipeline', primary: true }]}
          />
        ) : (
          <div className={ui.inboxPanel}>
            <ConversationList conversations={conversations} basePath="/portal/messages" showCandidate />
          </div>
        )}
      </div>
    </section>
  );
}
