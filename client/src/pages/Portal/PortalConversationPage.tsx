import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { portalMessagingApi } from '@/api/messagingApi';
import { ChatConversationSkeleton } from '@/components/messaging/ChatConversationSkeleton';
import { ChatView } from '@/components/messaging/ChatView';
import { EmptyState } from '@/components/ui/EmptyState';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import type { ConversationDetail } from '@/models/messaging';

export function PortalConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const { refresh: refreshUnread } = useUnreadMessages();

  useEffect(() => {
    if (!conversationId) return;
    setLoading(true);
    portalMessagingApi.getConversation(conversationId)
      .then(setConversation)
      .catch(() => setConversation(null))
      .finally(() => setLoading(false));
  }, [conversationId]);

  if (loading) return <ChatConversationSkeleton />;
  if (!conversation || !conversationId) {
    return (
      <EmptyState
        illustration="applications"
        title="Conversation not found"
        description="This chat may have been removed or you do not have access."
        actions={[{ label: 'Back to inbox', to: '/portal/messages', primary: true }]}
      />
    );
  }

  return (
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
  );
}
