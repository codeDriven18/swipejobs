import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { portalMessagingApi } from '@/api/messagingApi';
import { ConversationEntityCard } from '@/components/employer/entities/ConversationEntityCard';
import ui from '@/components/employer/ui/employerUi.module.css';
import layout from '@/styles/employerComposition.module.css';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import type { ConversationSummary } from '@/models/messaging';

const FILTERS = [
  { id: '', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'interviewing', label: 'Interviewing' },
] as const;

export function PortalMessagesLayout() {
  const [filter, setFilter] = useState('');
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const { count: unreadCount, refresh: refreshUnread } = useUnreadMessages();
  const hasSelection = /\/portal\/messages\/[^/]+/.test(location.pathname);

  useEffect(() => {
    setLoading(true);
    portalMessagingApi.listConversations(filter || undefined)
      .then(setConversations)
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
    void refreshUnread();
  }, [filter, location.pathname, refreshUnread]);

  return (
    <section className={`${ui.page} ${layout.splitInbox} ${hasSelection ? layout.splitInboxActive : ''}`}>
      <div className={layout.splitInboxList} style={hasSelection ? undefined : undefined}>
        <header className={layout.workspaceSectionHeader}>
          <div>
            <h1 className={ui.workboardToolbarTitle}>Inbox</h1>
            <p className={ui.workboardToolbarMeta}>
              {conversations.length} conversations
              {unreadCount > 0 ? ` · ${unreadCount} unread` : ''}
            </p>
          </div>
          <Link to="/portal/pipeline" className={ui.btnGhost}>Pipeline</Link>
        </header>

        <div className={ui.pillRow} role="tablist" aria-label="Conversation filters">
          {FILTERS.map((item) => (
            <button key={item.id || 'all'} type="button" className={filter === item.id ? ui.pillActive : ui.pill} onClick={() => setFilter(item.id)}>
              {item.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className={ui.statusText}>Loading…</p>
        ) : conversations.length === 0 ? (
          <div className={ui.surfaceMuted} style={{ padding: 'var(--space-4)' }}>
            <p className={ui.candidateDetail}>No conversations yet. Invite candidates to interview to unlock messaging.</p>
            <Link to="/portal/pipeline" className={ui.btnPrimary}>Open pipeline</Link>
          </div>
        ) : (
          conversations.map((conversation) => (
            <ConversationEntityCard key={conversation.id} conversation={conversation} />
          ))
        )}
      </div>

      <div className={layout.splitInboxDetail}>
        <div className={layout.splitInboxDetailInner}>
          <Outlet />
        </div>
      </div>
    </section>
  );
}
