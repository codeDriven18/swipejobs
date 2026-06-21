import { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useSearchParams } from 'react-router-dom';
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

function InboxListSkeleton() {
  return (
    <div className={ws.msgInboxSkeleton} aria-busy="true" aria-label="Loading conversations">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className={ws.msgInboxSkeletonRow}>
          <span className={ws.msgInboxSkeletonAvatar} />
          <span className={ws.msgInboxSkeletonLines}>
            <span />
            <span />
          </span>
        </div>
      ))}
    </div>
  );
}

export function InboxPage() {
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const splitId = searchParams.get('split');
  const { count: unreadCount, refresh: refreshUnread } = useUnreadMessages();
  const hasSelection = /\/portal\/messages\/[^/]+/.test(location.pathname);
  const hasSplit = Boolean(splitId && hasSelection);

  useEffect(() => {
    setLoading(true);
    portalMessagingApi.listConversations(filter || undefined)
      .then(setConversations)
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
    void refreshUnread();
  }, [filter, location.pathname, refreshUnread]);

  const query = search.trim().toLowerCase();
  const visibleConversations = useMemo(() => (
    query
      ? conversations.filter((c) =>
          c.candidateName.toLowerCase().includes(query) || c.jobTitle.toLowerCase().includes(query))
      : conversations
  ), [conversations, query]);

  const unreadConversations = visibleConversations.filter((c) => c.unreadCount > 0);
  const readConversations = visibleConversations.filter((c) => c.unreadCount === 0);

  const openSplit = (conversationId: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (next.get('split') === conversationId) {
        next.delete('split');
      } else {
        next.set('split', conversationId);
      }
      return next;
    }, { replace: true });
  };

  return (
    <div className={[
      ws.inbox,
      hasSelection ? ws.inboxActive : '',
      hasSplit ? ws.inboxSplit : '',
    ].filter(Boolean).join(' ')}>
      <div className={ws.inboxList}>
        <header className={ws.msgInboxHeader}>
          <div>
            <p className={ws.msgInboxMeta}>
              {conversations.length} conversations
              {unreadCount > 0 && (
                <>
                  {' · '}
                  <span className={ws.msgInboxUnread}>{unreadCount} need a reply</span>
                </>
              )}
            </p>
          </div>
          <Link to="/portal/pipeline" className={ws.btnGhost}>Pipeline</Link>
        </header>

        <input
          type="search"
          className={ws.inboxSearch}
          placeholder="Search candidates or roles…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search conversations"
        />

        <div className={ws.pillRow} role="tablist" aria-label="Conversation filters">
          {FILTERS.map((item) => (
            <button
              key={item.id || 'all'}
              type="button"
              className={filter === item.id ? ws.pillActive : ws.pill}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
              {item.id === 'unread' && unreadCount > 0 && (
                <span className={ws.pillCount}>{unreadCount}</span>
              )}
            </button>
          ))}
        </div>

        <div className={ws.msgInboxThreads}>
          {loading ? (
            <InboxListSkeleton />
          ) : conversations.length === 0 ? (
            <div className={ws.msgInboxEmpty}>
              <p className={ws.msgInboxEmptyTitle}>No conversations yet</p>
              <p className={ws.candidateSub}>Invite candidates to interview from the pipeline to unlock messaging.</p>
              <Link to="/portal/pipeline" className={ws.btnPrimary}>Open pipeline</Link>
            </div>
          ) : visibleConversations.length === 0 ? (
            <div className={ws.msgInboxEmpty}>
              <p className={ws.msgInboxEmptyTitle}>No matches</p>
              <p className={ws.candidateSub}>No conversations match “{search.trim()}”.</p>
            </div>
          ) : filter === 'unread' ? (
            <section className={ws.msgInboxSection}>
              {unreadConversations.map((conversation) => (
                <ConversationRow
                  key={conversation.id}
                  conversation={conversation}
                  onOpenSplit={hasSelection ? openSplit : undefined}
                  isSplitActive={splitId === conversation.id}
                />
              ))}
            </section>
          ) : (
            <>
              {unreadConversations.length > 0 && (
                <section className={ws.msgInboxSection}>
                  <p className={ws.msgInboxSectionLabel}>Needs reply · {unreadConversations.length}</p>
                  {unreadConversations.map((conversation) => (
                    <ConversationRow
                      key={conversation.id}
                      conversation={conversation}
                      onOpenSplit={hasSelection ? openSplit : undefined}
                      isSplitActive={splitId === conversation.id}
                    />
                  ))}
                </section>
              )}

              <section className={ws.msgInboxSection}>
                {unreadConversations.length > 0 && (
                  <p className={ws.msgInboxSectionLabel}>
                    {filter === 'interviewing' ? 'Interviewing' : 'Recent'}
                  </p>
                )}
                {(unreadConversations.length > 0 ? readConversations : visibleConversations).map((conversation) => (
                  <ConversationRow
                    key={conversation.id}
                    conversation={conversation}
                    onOpenSplit={hasSelection ? openSplit : undefined}
                    isSplitActive={splitId === conversation.id}
                  />
                ))}
              </section>
            </>
          )}
        </div>
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
      <p className={ws.candidateSub}>
        Choose a candidate thread to read and reply. On desktop you can open a second chat in split view while you compare candidates.
      </p>
      <Link to="/portal/pipeline" className={ws.btnPrimary}>Open pipeline</Link>
    </div>
  );
}
