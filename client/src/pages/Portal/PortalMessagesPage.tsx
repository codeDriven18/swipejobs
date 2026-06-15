import { useEffect, useState } from 'react';
import { portalMessagingApi } from '@/api/messagingApi';
import { ConversationList } from '@/components/messaging/ConversationList';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import type { ConversationSummary } from '@/models/messaging';
import styles from './PortalMessagesPage.module.css';

const FILTERS = [
  { id: '', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'interviewing', label: 'Interviewing' },
  { id: 'offer', label: 'Offer Sent' },
  { id: 'unread', label: 'Unread' },
] as const;

export function PortalMessagesPage() {
  const [filter, setFilter] = useState('');
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    portalMessagingApi.listConversations(filter || undefined)
      .then(setConversations)
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <section className={styles.page}>
      <PageHeader title="Messages" subtitle="Hiring conversations tied to applications." />

      <div className={styles.filters} role="tablist" aria-label="Conversation filters">
        {FILTERS.map((item) => (
          <button
            key={item.id || 'all'}
            type="button"
            className={filter === item.id ? styles.filterActive : styles.filter}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className={styles.status}>Loading conversations…</p>
      ) : conversations.length === 0 ? (
        <EmptyState
          illustration="applications"
          title="No conversations yet"
          description="Invite candidates to interview to unlock messaging."
          actions={[{ label: 'View applicants', to: '/portal/applications', primary: true }]}
        />
      ) : (
        <ConversationList
          conversations={conversations}
          basePath="/portal/messages"
          showCandidate
        />
      )}
    </section>
  );
}
