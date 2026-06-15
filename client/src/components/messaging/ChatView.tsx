import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconChevronLeft } from '@/components/icons/Icons';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { useChatHub } from '@/hooks/useChatHub';
import { useKeyboardViewport } from '@/hooks/useKeyboardViewport';
import { getApiErrorMessage } from '@/lib/apiErrors';
import {
  formatDateSeparator,
  formatMessageTimestamp,
  isSameMessageDay,
} from '@/lib/messagingHelpers';
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
  onMessagesRead?: () => void;
  layout?: 'seeker' | 'portal';
}

function normalizeLoadedMessage(message: ChatMessage): ChatMessage {
  const isSystem = message.isSystem ?? message.type === 'System';
  return {
    ...message,
    type: isSystem ? 'System' : 'User',
    isSystem,
  };
}

export function ChatView({
  conversation,
  backTo,
  backLabel,
  subtitle,
  title,
  logoUrl,
  api,
  onMessagesRead,
  layout = 'seeker',
}: ChatViewProps) {
  useKeyboardViewport();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [typingUserId, setTypingUserId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const items = await api.getMessages(conversation.id);
      setMessages(items.map(normalizeLoadedMessage));
      await api.markRead(conversation.id);
      onMessagesRead?.();
    } catch {
      setError('Could not load messages.');
    } finally {
      setLoading(false);
    }
  }, [api, conversation.id, onMessagesRead]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUserId]);

  const handleIncoming = useCallback((message: ChatMessage) => {
    setMessages((current) => {
      if (current.some((m) => m.id === message.id)) return current;
      return [...current, message];
    });
    void api.markRead(conversation.id).then(() => onMessagesRead?.());
  }, [api, conversation.id, onMessagesRead]);

  const handleRead = useCallback((readerUserId: string) => {
    void readerUserId;
    setMessages((current) =>
      current.map((message) =>
        message.isMine && !message.readAt
          ? { ...message, readAt: new Date().toISOString() }
          : message,
      ),
    );
  }, []);

  const { sendTyping } = useChatHub({
    conversationId: conversation.id,
    onMessage: handleIncoming,
    onTyping: (senderUserId) => {
      setTypingUserId(senderUserId);
      window.setTimeout(() => setTypingUserId(null), 2000);
    },
    onRead: handleRead,
  });

  const timeline = useMemo(() => {
    const items: Array<{ kind: 'separator'; key: string; label: string } | { kind: 'message'; key: string; message: ChatMessage }> = [];

    messages.forEach((message, index) => {
      const previous = messages[index - 1];
      if (!previous || !isSameMessageDay(previous.sentAt, message.sentAt)) {
        items.push({
          kind: 'separator',
          key: `sep-${message.sentAt}-${index}`,
          label: formatDateSeparator(message.sentAt),
        });
      }
      items.push({ kind: 'message', key: message.id, message });
    });

    return items;
  }, [messages]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || !conversation.canSendMessages) return;

    setSending(true);
    setError(null);
    try {
      const message = normalizeLoadedMessage(await api.sendMessage(conversation.id, text));
      setMessages((current) => [...current, message]);
      setDraft('');
    } catch (sendError) {
      setError(getApiErrorMessage(sendError, 'Message could not be sent.'));
    } finally {
      setSending(false);
    }
  };

  const handleAttach = async (file: File) => {
    if (!conversation.canSendMessages) return;
    setSending(true);
    setError(null);
    try {
      const message = normalizeLoadedMessage(await api.sendAttachment(conversation.id, file));
      setMessages((current) => [...current, message]);
    } catch (attachError) {
      setError(getApiErrorMessage(attachError, 'Attachment could not be sent.'));
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
    <section className={`${styles.page} ${layout === 'portal' ? styles.pagePortal : ''}`}>
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
          <p className={styles.status}>
            {conversation.canSendMessages
              ? 'Say hello to start the conversation.'
              : 'Messages unlock after an interview invitation.'}
          </p>
        ) : (
          timeline.map((item) => {
            if (item.kind === 'separator') {
              return (
                <div key={item.key} className={styles.dateSeparator}>
                  <span>{item.label}</span>
                </div>
              );
            }

            const { message } = item;
            if (message.isSystem) {
              return (
                <div key={item.key} className={styles.systemMessage}>
                  <p>{message.messageText}</p>
                  <time dateTime={message.sentAt}>{formatMessageTimestamp(message.sentAt)}</time>
                </div>
              );
            }

            return (
              <article
                key={item.key}
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
            );
          })
        )}
        {typingUserId && <p className={styles.typing}>Typing…</p>}
        <div ref={bottomRef} className={styles.bottomAnchor} />
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
        <textarea
          className={styles.input}
          rows={1}
          placeholder={conversation.canSendMessages ? 'Write a message…' : 'Messaging locked'}
          value={draft}
          disabled={!conversation.canSendMessages || sending}
          onChange={(event) => {
            setDraft(event.target.value);
            sendTyping();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void handleSend();
            }
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
