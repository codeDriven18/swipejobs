import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { portalMessagingApi } from '@/api/messagingApi';
import { ConversationRow } from '@/portal/components/ConversationRow';
import ws from '@/portal/workspace.module.css';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import type { ConversationSummary } from '@/models/messaging';

const FILTERS = [
  { id: '', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'interviewing', label: 'Interviewing' },
] as const;

export function InboxPage() {
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
    <div className={[ws.inbox, hasSelection ? ws.inboxActive : ''].filter(Boolean).join(' ')}>
      <div className={ws.inboxList}>
        <div className={ws.pageHeader}>
          <p className={ws.pageMeta}>
            {conversations.length} conversations
            {unreadCount > 0 ? ` · ${unreadCount} unread` : ''}
          </p>
          <Link to="/portal/pipeline" className={ws.btnGhost}>Pipeline</Link>
        </div>

        <div className={ws.pillRow} role="tablist" aria-label="Conversation filters">
          {FILTERS.map((item) => (
            <button key={item.id || 'all'} type="button" className={filter === item.id ? ws.pillActive : ws.pill} onClick={() => setFilter(item.id)}>
              {item.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className={ws.statusText}>Loading…</p>
        ) : conversations.length === 0 ? (
          <div className={ws.panelMuted}>
            <p className={ws.candidateSub}>No conversations yet. Invite candidates to interview to unlock messaging.</p>
            <Link to="/portal/pipeline" className={ws.btnPrimary}>Open pipeline</Link>
          </div>
        ) : (
          conversations.map((conversation) => (
            <ConversationRow key={conversation.id} conversation={conversation} />
          ))
        )}
      </div>

      <div className={ws.inboxDetail}>
        <Outlet />
      </div>
    </div>
  );
}

export function InboxEmptyPanel() {
  return (
    <div className={ws.inboxEmpty}>
      <h2 className={ws.panelTitle}>Select a conversation</h2>
      <p className={ws.candidateSub}>Choose a candidate thread to read and reply, or open the pipeline to invite someone to interview.</p>
      <Link to="/portal/pipeline" className={ws.btnPrimary}>Open pipeline</Link>
    </div>
  );
}
