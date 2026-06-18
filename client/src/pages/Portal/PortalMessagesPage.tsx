import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { portalMessagingApi } from '@/api/messagingApi';
import { ConversationList } from '@/components/messaging/ConversationList';
import { EmployerPageHeader } from '@/components/employer/EmployerPageHeader';
import ui from '@/components/employer/ui/employerUi.module.css';
import { EmptyState } from '@/components/ui/EmptyState';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import type { ConversationSummary } from '@/models/messaging';

const FILTERS = [
  { id: '', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'interviewing', label: 'Interviewing' },
  { id: 'offer', label: 'Offer' },
  { id: 'unread', label: 'Unread' },
] as const;

export function PortalMessagesPage() {
  const [filter, setFilter] = useState('');
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const { refresh: refreshUnread } = useUnreadMessages();

  useEffect(() => {
    setLoading(true);
    portalMessagingApi.listConversations(filter || undefined)
      .then(setConversations)
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
    void refreshUnread();
  }, [filter, location.pathname, refreshUnread]);

  return (
    <section className={ui.page}>
      <EmployerPageHeader
        title="Messages"
        subtitle="Hiring conversations with your candidates."
        actions={<Link to="/portal/pipeline" className={ui.btnGhost}>Pipeline</Link>}
      />

      <div className={ui.pillRow} role="tablist" aria-label="Conversation filters">
        {FILTERS.map((item) => (
          <button key={item.id || 'all'} type="button" className={filter === item.id ? ui.pillActive : ui.pill} onClick={() => setFilter(item.id)}>
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className={ui.statusText}>Loading conversations…</p>
      ) : conversations.length === 0 ? (
        <EmptyState illustration="applications" title="No conversations yet" description="Invite candidates to interview to unlock messaging." actions={[{ label: 'Open pipeline', to: '/portal/pipeline', primary: true }]} />
      ) : (
        <div className={ui.inboxPanel}>
          <ConversationList conversations={conversations} basePath="/portal/messages" showCandidate />
        </div>
      )}
    </section>
  );
}
