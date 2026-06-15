import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { messagingApi } from '@/api/messagingApi';
import { ChatView } from '@/components/messaging/ChatView';
import { EmptyState } from '@/components/ui/EmptyState';
import type { ConversationDetail } from '@/models/messaging';

export function ConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!conversationId) return;
    setLoading(true);
    messagingApi.getConversation(conversationId)
      .then(setConversation)
      .catch(() => setConversation(null))
      .finally(() => setLoading(false));
  }, [conversationId]);

  if (loading) return <p>Loading conversation…</p>;
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
    <ChatView
      conversation={conversation}
      backTo="/messages"
      backLabel="Messages"
      logoUrl={conversation.companyLogoUrl}
      api={{
        getMessages: messagingApi.getMessages,
        sendMessage: messagingApi.sendMessage,
        sendAttachment: messagingApi.sendAttachment,
        markRead: messagingApi.markRead,
        downloadAttachment: messagingApi.downloadAttachment,
      }}
    />
  );
}
