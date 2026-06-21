import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { portalMessagingApi } from '@/api/messagingApi';
import { ChatConversationSkeleton } from '@/components/messaging/ChatConversationSkeleton';
import { ChatView } from '@/components/messaging/ChatView';
import { EmptyState } from '@/components/ui/EmptyState';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { ConversationContextPanel } from '@/portal/components/ConversationContextPanel';
import { RecruiterChatActions } from '@/portal/components/RecruiterChatActions';
import ws from '@/portal/workspace.module.css';
import type { ConversationDetail } from '@/models/messaging';

interface ConversationPaneProps {
  conversationId: string;
  mode?: 'primary' | 'split';
  showContext?: boolean;
  onClose?: () => void;
}

export function ConversationPane({
  conversationId,
  mode = 'primary',
  showContext = true,
  onClose,
}: ConversationPaneProps) {
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const { refresh: refreshUnread } = useUnreadMessages();
  const navigate = useNavigate();
  const isSplit = mode === 'split';

  const loadConversation = useCallback(
    (showSkeleton: boolean) => {
      if (!conversationId) return;
      if (showSkeleton) setLoading(true);
      portalMessagingApi.getConversation(conversationId)
        .then(setConversation)
        .catch(() => setConversation(null))
        .finally(() => setLoading(false));
    },
    [conversationId],
  );

  useEffect(() => {
    loadConversation(true);
  }, [loadConversation]);

  if (loading) {
    return (
      <div className={[ws.msgPane, isSplit ? ws.msgPaneSplit : ''].filter(Boolean).join(' ')}>
        <ChatConversationSkeleton />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className={[ws.msgPane, isSplit ? ws.msgPaneSplit : ''].filter(Boolean).join(' ')}>
        <EmptyState
          illustration="applications"
          title="Conversation not found"
          description="This chat may have been removed or you do not have access."
          actions={[{
            label: isSplit ? 'Close panel' : 'Back to inbox',
            onClick: () => (isSplit && onClose ? onClose() : navigate('/portal/messages')),
            primary: true,
          }]}
        />
      </div>
    );
  }

  return (
    <div className={[ws.msgPane, isSplit ? ws.msgPaneSplit : ''].filter(Boolean).join(' ')}>
      {isSplit && (
        <div className={ws.msgSplitHeader}>
          <span className={ws.msgSplitLabel}>Split view</span>
          <button type="button" className={ws.msgSplitClose} onClick={onClose} aria-label="Close split conversation">
            Close
          </button>
        </div>
      )}

      <div className={ws.msgPaneBody}>
        <div className={ws.msgPaneChat}>
          <RecruiterChatActions
            applicationId={conversation.applicationId}
            status={conversation.applicationStatus}
            variant={isSplit ? 'compact' : 'toolbar'}
            onChanged={() => loadConversation(false)}
          />
          <ChatView
            conversation={conversation}
            backTo="/portal/messages"
            backLabel="Back to inbox"
            title={conversation.candidateName}
            subtitle={conversation.jobTitle}
            layout="portal"
            fullscreen={false}
            embedded
            api={{
              getMessages: portalMessagingApi.getMessages,
              sendMessage: portalMessagingApi.sendMessage,
              sendAttachment: portalMessagingApi.sendAttachment,
              markRead: portalMessagingApi.markRead,
              downloadAttachment: portalMessagingApi.downloadAttachment,
            }}
            onMessagesRead={() => void refreshUnread()}
          />
        </div>

        {showContext && !isSplit && (
          <ConversationContextPanel
            applicationId={conversation.applicationId}
            onUpdated={() => loadConversation(false)}
          />
        )}
      </div>
    </div>
  );
}
