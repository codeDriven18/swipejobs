import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconChevronLeft } from '@/components/icons/Icons';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { useChatHub } from '@/hooks/useChatHub';
import { formatMessageTimestamp } from '@/lib/messagingHelpers';
import type { ChatMessage, ConversationDetail } from '@/models/messaging';
import styles from './ChatView.module.css';

interface ChatApi {
  getMessages: (id: string) => Promise<ChatMessage[]>;
  sendMessage: (id: string, text: string) => Promise<ChatMessage>;
  sendAttachment: (id: string, file: File, messageText?: string) => Promise<ChatMessage>;
  markRead: (id: string) => Promise<void>;
  downloadAttachment?: (conversationId: string, messageId: string) => Promise<Blob>;
}

interface ChatViewProps {
  conversation: ConversationDetail;
  backTo: string;
  backLabel: string;
  subtitle?: string;
  title?: string;
  logoUrl?: string;
  api: ChatApi;
}

export function ChatView({
  conversation,
  backTo,
  backLabel,
  subtitle,
  title,
  logoUrl,
  api,
}: ChatViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [typingUserId, setTypingUserId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const items = await api.getMessages(conversation.id);
      setMessages(items);
      await api.markRead(conversation.id);
    } catch {
      setError('Could not load messages.');
    } finally {
      setLoading(false);
    }
  }, [api, conversation.id]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typingUserId]);

  const handleIncoming = useCallback((message: ChatMessage) => {
    setMessages((current) => {
      if (current.some((m) => m.id === message.id)) return current;
      return [...current, message];
    });
    void api.markRead(conversation.id);
  }, [api, conversation.id]);

  const { sendTyping } = useChatHub({
    conversationId: conversation.id,
    onMessage: handleIncoming,
    onTyping: (senderUserId) => {
      setTypingUserId(senderUserId);
      window.setTimeout(() => setTypingUserId(null), 2000);
    },
  });

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || !conversation.canSendMessages) return;

    setSending(true);
    setError(null);
    try {
      const message = await api.sendMessage(conversation.id, text);
      setMessages((current) => [...current, message]);
      setDraft('');
    } catch {
      setError('Message could not be sent.');
    } finally {
      setSending(false);
    }
  };

  const handleAttach = async (file: File) => {
    if (!conversation.canSendMessages) return;
    setSending(true);
    setError(null);
    try {
      const message = await api.sendAttachment(conversation.id, file);
      setMessages((current) => [...current, message]);
    } catch {
      setError('Attachment could not be sent.');
    } finally {
      setSending(false);
    }
  };

  const handleDownload = async (message: ChatMessage) => {
    if (!api.downloadAttachment || !message.attachmentUrl) return;
    try {
      const blob = await api.downloadAttachment(conversation.id, message.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = message.attachmentFileName ?? 'attachment';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Could not download attachment.');
    }
  };

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <Link to={backTo} className={styles.back}>
          <IconChevronLeft size={18} /> {backLabel}
        </Link>
        <div className={styles.headerMain}>
          {logoUrl ? (
            <img src={logoUrl} alt="" className={styles.logo} />
          ) : (
            <span className={styles.logoFallback}>{(title ?? conversation.companyName).slice(0, 1)}</span>
          )}
          <div>
            <h1 className={styles.title}>{title ?? conversation.companyName}</h1>
            <p className={styles.subtitle}>{subtitle ?? conversation.jobTitle}</p>
            <StatusBadge status={conversation.applicationStatus} />
          </div>
        </div>
      </header>

      {conversation.isReadOnly && (
        <p className={styles.readOnlyBanner}>This conversation is read-only.</p>
      )}

      <div ref={listRef} className={styles.messages} aria-live="polite">
        {loading ? (
          <p className={styles.status}>Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className={styles.status}>No messages yet. Start the conversation when you are ready.</p>
        ) : (
          messages.map((message) => (
            <article
              key={message.id}
              className={`${styles.message} ${message.isMine ? styles.mine : styles.theirs}`}
            >
              <p className={styles.messageText}>{message.messageText}</p>
              {message.attachmentUrl && (
                <button
                  type="button"
                  className={styles.attachment}
                  onClick={() => void handleDownload(message)}
                >
                  {message.attachmentFileName ?? 'Download attachment'}
                </button>
              )}
              <footer className={styles.meta}>
                <time dateTime={message.sentAt}>{formatMessageTimestamp(message.sentAt)}</time>
                {message.isMine && (
                  <span>{message.readAt ? 'Read' : 'Sent'}</span>
                )}
              </footer>
            </article>
          ))
        )}
        {typingUserId && <p className={styles.typing}>Typing…</p>}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <form
        className={styles.composer}
        onSubmit={(event) => {
          event.preventDefault();
          void handleSend();
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className={styles.fileInput}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleAttach(file);
            event.target.value = '';
          }}
        />
        <button
          type="button"
          className={styles.attachBtn}
          disabled={!conversation.canSendMessages || sending}
          onClick={() => fileInputRef.current?.click()}
          aria-label="Attach file"
        >
          Attach
        </button>
        <input
          type="text"
          className={styles.input}
          placeholder={conversation.canSendMessages ? 'Write a message…' : 'Messaging locked'}
          value={draft}
          disabled={!conversation.canSendMessages || sending}
          onChange={(event) => {
            setDraft(event.target.value);
            sendTyping();
          }}
        />
        <Button
          type="submit"
          size="compact"
          loading={sending}
          disabled={!conversation.canSendMessages || !draft.trim()}
        >
          Send
        </Button>
      </form>
    </section>
  );
}
