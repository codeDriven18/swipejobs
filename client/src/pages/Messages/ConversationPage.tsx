import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { messagingApi } from '@/api/messagingApi';
import { ChatConversationSkeleton } from '@/components/messaging/ChatConversationSkeleton';
import { ChatView } from '@/components/messaging/ChatView';
import { EmptyState } from '@/components/ui/EmptyState';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import type { ConversationDetail } from '@/models/messaging';
import styles from './ConversationPage.module.css';

export function ConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const { refresh: refreshUnread } = useUnreadMessages();

  useEffect(() => {
    if (!conversationId) return;
    setLoading(true);
    messagingApi.getConversation(conversationId)
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
        actions={[{ label: 'Back to messages', to: '/messages', primary: true }]}
      />
    );
  }

  return (
    <div className={styles.shell}>
      <ChatView
        conversation={conversation}
        backTo="/messages"
        backLabel="Back to messages"
        logoUrl={conversation.companyLogoUrl}
        layout="seeker"
        fullscreen
        api={{
          getMessages: messagingApi.getMessages,
          sendMessage: messagingApi.sendMessage,
          sendAttachment: messagingApi.sendAttachment,
          markRead: messagingApi.markRead,
          downloadAttachment: messagingApi.downloadAttachment,
        }}
        onMessagesRead={() => void refreshUnread()}
      />
    </div>
  );
}
