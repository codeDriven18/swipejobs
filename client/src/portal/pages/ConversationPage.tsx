import { useParams, useSearchParams } from 'react-router-dom';
import { ConversationPane } from '@/portal/components/ConversationPane';

export function ConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const splitId = searchParams.get('split');

  if (!conversationId) return null;

  const closeSplit = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('split');
      return next;
    }, { replace: true });
  };

  return (
    <>
      <ConversationPane conversationId={conversationId} mode="primary" showContext={!splitId} />
      {splitId && splitId !== conversationId && (
        <ConversationPane
          conversationId={splitId}
          mode="split"
          showContext={false}
          onClose={closeSplit}
        />
      )}
    </>
  );
}
