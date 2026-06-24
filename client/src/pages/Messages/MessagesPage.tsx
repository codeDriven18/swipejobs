import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { messagingApi } from '@/api/messagingApi';
import { ConversationList } from '@/components/messaging/ConversationList';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import type { ConversationSummary } from '@/models/messaging';
import styles from './MessagesPage.module.css';

export function MessagesPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const location = useLocation();
  const { refresh: refreshUnread } = useUnreadMessages();

  const load = () => {
    setLoading(true);
    setFailed(false);
    messagingApi.listConversations()
      .then(setConversations)
      .catch(() => {
        setConversations([]);
        setFailed(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    void refreshUnread();
  }, [location.pathname, refreshUnread]);

  return (
    <section className={styles.page}>
      <PageHeader
        title="Messages"
        subtitle="Chat with employers after an interview invite."
      />

      {loading ? (
        <p className={styles.status}>Loading conversations…</p>
      ) : failed ? (
        <EmptyState
          illustration="applications"
          title="Could not load messages"
          description="Check your connection and try again."
          actions={[{ label: 'Retry', onClick: load, primary: true }]}
        />
      ) : conversations.length === 0 ? (
        <EmptyState
          illustration="applications"
          title="No conversations yet"
          description="When an employer invites you to interview, your hiring conversation will appear here."
          actions={[{ label: 'View applications', to: '/applications', primary: true }]}
        />
      ) : (
        <div className={styles.listCard}>
          <ConversationList conversations={conversations} basePath="/messages" />
        </div>
      )}
    </section>
  );
}
