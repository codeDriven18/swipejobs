import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconChevronLeft } from '@/components/icons/Icons';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { useChatHub } from '@/hooks/useChatHub';
import { useKeyboardViewport } from '@/hooks/useKeyboardViewport';
import { getApiErrorMessage } from '@/lib/apiErrors';
import {
  formatBubbleTime,
  formatDateSeparator,
  isSameMessageDay,
} from '@/lib/messagingHelpers';
import { resolveMediaUrl } from '@/lib/mediaUrl';
import {
  createPendingAttachmentMessage,
  isAttachmentPlaceholderText,
  markPendingFailed,
  normalizeLoadedMessage,
  replacePendingMessage,
  upsertMessage,
  dedupeMessages,
  reconcileIncomingMessage,
} from '@/lib/messaging/chatMessages';
import type { ChatMessage, ConversationDetail } from '@/models/messaging';
import { MessageAttachment } from '@/components/messaging/MessageAttachment';
import {
  AttachmentComposer,
  createPendingAttachment,
  revokeAllPending,
  revokePendingAttachment,
  type PendingAttachment,
} from '@/components/messaging/AttachmentComposer';
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
  headerHint?: string;
  showStatusBadge?: boolean;
  onHeaderIdentityClick?: () => void;
  headerIdentityExpanded?: boolean;
  api: ChatApi;
  onMessagesRead?: () => void;
  layout?: 'seeker' | 'portal';
  fullscreen?: boolean;
  embedded?: boolean;
}

function MessageReceipt({ readAt }: { readAt?: string }) {
  if (readAt) {
    return (
      <span className={styles.receiptRead} aria-label="Read">
        <svg viewBox="0 0 16 11" className={styles.tgChecks} aria-hidden>
          <path d="M11.07 0.65 4.55 7.17 1.93 4.55 0.5 5.98l4.05 4.05 9.57-9.57L11.07 0.65Z" />
          <path d="M15.5 0.65 8.98 7.17 7.55 5.74 6.12 7.17 8.98 10.03 16.97 2.04 15.5 0.65Z" />
        </svg>
      </span>
    );
  }

  return (
    <span className={styles.receiptSent} aria-label="Sent">
      <svg viewBox="0 0 12 11" className={styles.tgCheck} aria-hidden>
        <path d="M11.07 0.65 4.55 7.17 1.93 4.55 0.5 5.98l4.05 4.05L11.07 0.65Z" />
      </svg>
    </span>
  );
}

export function ChatView({
  conversation,
  backTo,
  backLabel,
  subtitle,
  title,
  logoUrl,
  showStatusBadge = true,
  onHeaderIdentityClick,
  headerIdentityExpanded,
  api,
  onMessagesRead,
  layout = 'seeker',
  fullscreen = true,
  embedded = false,
}: ChatViewProps) {
  useKeyboardViewport();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [typingUserId, setTypingUserId] = useState<string | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [attachmentCaption, setAttachmentCaption] = useState('');
  const [avatarError, setAvatarError] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const displayName = title ?? conversation.companyName;
  const displaySubtitle = subtitle ?? conversation.jobTitle;
  const avatarSrc = resolveMediaUrl(logoUrl ?? conversation.candidateProfileImageUrl ?? conversation.companyLogoUrl);

  useEffect(() => {
    setAvatarError(false);
  }, [avatarSrc]);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const items = await api.getMessages(conversation.id);
      setMessages(dedupeMessages(items.map(normalizeLoadedMessage)));
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
    setMessages((current) => reconcileIncomingMessage(current, message));
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
    const items: Array<{ kind: 'separator'; key: string; label: string } | { kind: 'message'; key: string; message: ChatMessage; sameSender: boolean }> = [];
    let lastSenderMine: boolean | null = null;

    messages.forEach((message, index) => {
      const previous = messages[index - 1];
      if (!previous || !isSameMessageDay(previous.sentAt, message.sentAt)) {
        items.push({
          kind: 'separator',
          key: `sep-${message.sentAt}-${index}`,
          label: formatDateSeparator(message.sentAt),
        });
        lastSenderMine = null;
      }

      const sameSender = !message.isSystem && lastSenderMine === message.isMine;
      if (!message.isSystem) {
        lastSenderMine = message.isMine;
      }

      items.push({ kind: 'message', key: message.id, message, sameSender });
    });

    return items;
  }, [messages]);

  const closeAttachmentComposer = useCallback(() => {
    revokeAllPending(pendingAttachments);
    setPendingAttachments([]);
    setAttachmentCaption('');
    setComposerOpen(false);
  }, [pendingAttachments]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || !conversation.canSendMessages) return;

    setSending(true);
    setError(null);
    try {
      const message = normalizeLoadedMessage(await api.sendMessage(conversation.id, text));
      setMessages((current) => upsertMessage(current, message));
      setDraft('');
    } catch (sendError) {
      setError(getApiErrorMessage(sendError, 'Message could not be sent.'));
    } finally {
      setSending(false);
    }
  };

  const handleFilesSelected = (files: FileList | null) => {
    if (!files?.length || !conversation.canSendMessages) return;
    const added = Array.from(files).map(createPendingAttachment);
    setPendingAttachments((current) => [...current, ...added]);
    setComposerOpen(true);
  };

  const handleRemovePending = (id: string) => {
    setPendingAttachments((current) => {
      const item = current.find((entry) => entry.id === id);
      if (item) revokePendingAttachment(item);
      const next = current.filter((entry) => entry.id !== id);
      if (next.length === 0) setComposerOpen(false);
      return next;
    });
  };

  const handleConfirmAttachments = async () => {
    if (!pendingAttachments.length || !conversation.canSendMessages) return;

    setSending(true);
    setError(null);
    const caption = attachmentCaption.trim();
    const queue = [...pendingAttachments];
    revokeAllPending(pendingAttachments);
    setPendingAttachments([]);
    setAttachmentCaption('');
    setComposerOpen(false);

    try {
      for (let index = 0; index < queue.length; index += 1) {
        const item = queue[index];
        const fileCaption = index === 0 ? caption : undefined;
        const pending = createPendingAttachmentMessage(item.file, conversation.id, fileCaption);
        setMessages((current) => upsertMessage(current, pending));

        try {
          const saved = normalizeLoadedMessage(
            await api.sendAttachment(conversation.id, item.file, fileCaption),
          );
          setMessages((current) => replacePendingMessage(current, pending.id, saved));
        } catch (attachError) {
          setMessages((current) => markPendingFailed(current, pending.id));
          throw attachError;
        }
      }
    } catch (attachError) {
      setError(getApiErrorMessage(attachError, 'Attachment could not be sent.'));
    } finally {
      setSending(false);
    }
  };

  const handleDownload = async (message: ChatMessage) => {
    if (!message.attachmentUrl) return;
    if (api.downloadAttachment) {
      try {
        const blob = await api.downloadAttachment(conversation.id, message.id);
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = message.attachmentFileName ?? 'attachment';
        anchor.click();
        URL.revokeObjectURL(url);
        return;
      } catch {
        /* fall through to direct URL */
      }
    }
    const direct = message.attachmentUrl?.startsWith('http') || message.attachmentUrl?.startsWith('/')
      ? message.attachmentUrl
      : undefined;
    if (direct) window.open(direct, '_blank', 'noopener,noreferrer');
  };

  const isPortalEmbedded = layout === 'portal' && embedded;

  return (
    <section
      className={[
        styles.page,
        layout === 'portal' ? styles.pagePortal : '',
        embedded ? styles.pageEmbedded : '',
        fullscreen ? styles.pageFullscreen : '',
      ].filter(Boolean).join(' ')}
    >
      <header className={styles.header}>
        <div className={styles.headerBar}>
          <Link to={backTo} className={styles.backBtn} aria-label={backLabel}>
            <IconChevronLeft size={22} />
          </Link>
          <div className={styles.headerIdentity}>
            {onHeaderIdentityClick ? (
              <button
                type="button"
                className={[styles.headerIdentityBtn, headerIdentityExpanded ? styles.headerIdentityBtnActive : ''].filter(Boolean).join(' ')}
                onClick={onHeaderIdentityClick}
                aria-expanded={headerIdentityExpanded}
                aria-label={`${displayName} — toggle candidate profile`}
              >
                {avatarSrc && !avatarError ? (
                  <img
                    src={avatarSrc}
                    alt=""
                    className={styles.avatar}
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <span className={styles.avatarFallback}>{displayName.slice(0, 1)}</span>
                )}
                <div className={styles.headerText}>
                  <h1 className={styles.title}>{displayName}</h1>
                  <p className={styles.headerMeta}>
                    {isPortalEmbedded ? (
                      <>
                        <span className={styles.statusDot} aria-hidden />
                        <span className={styles.subtitle}>Active now</span>
                        <span className={styles.sidebarHint} aria-hidden>
                          {headerIdentityExpanded ? '◂' : '▸'}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className={styles.subtitle}>{displaySubtitle}</span>
                        {showStatusBadge && <StatusBadge status={conversation.applicationStatus} compact />}
                      </>
                    )}
                  </p>
                </div>
              </button>
            ) : (
              <>
                {avatarSrc && !avatarError ? (
                  <img
                    src={avatarSrc}
                    alt=""
                    className={styles.avatar}
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <span className={styles.avatarFallback}>{displayName.slice(0, 1)}</span>
                )}
                <div className={styles.headerText}>
                  <h1 className={styles.title}>{displayName}</h1>
                  <p className={styles.headerMeta}>
                    <span className={styles.subtitle}>{displaySubtitle}</span>
                    {showStatusBadge && <StatusBadge status={conversation.applicationStatus} compact />}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className={styles.messagesRegion}>
        {conversation.isReadOnly && (
          <p className={styles.readOnlyBanner}>This conversation is read-only.</p>
        )}

        <div ref={listRef} className={styles.messages} aria-live="polite">
        {loading ? (
          <div className={styles.loadingMessages} aria-busy="true" aria-label="Loading messages">
            <span className={styles.loader} aria-hidden />
          </div>
        ) : messages.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyStateText}>
              {conversation.canSendMessages
                ? 'Say hello to start the conversation.'
                : 'Messages unlock after an interview invitation.'}
            </p>
          </div>
        ) : (
          timeline.map((item) => {
            if (item.kind === 'separator') {
              return (
                <div key={item.key} className={styles.dateSeparator}>
                  <span>{item.label}</span>
                </div>
              );
            }

            const { message, sameSender } = item;
            if (message.isSystem) {
              return (
                <div key={item.key} className={styles.systemMessage}>
                  <p>{message.messageText}</p>
                </div>
              );
            }

            const hasAttachment = Boolean(
              message.attachmentUrl || message.localPreviewUrl || message.uploadStatus,
            );
            const hidePlaceholderText = isAttachmentPlaceholderText(message.messageText, message.attachmentFileName);
            const isImageAttachment = Boolean(
              message.localPreviewUrl
              || (message.attachmentContentType?.startsWith('image/'))
              || (message.attachmentFileName && /\.(jpe?g|png|gif|webp)$/i.test(message.attachmentFileName)),
            );
            const isImageOnly = hasAttachment && isImageAttachment && hidePlaceholderText;

            return (
              <article
                key={item.key}
                className={[
                  styles.message,
                  message.isMine ? styles.mine : styles.theirs,
                  sameSender ? styles.messageGrouped : styles.messageNewSender,
                  isImageOnly ? styles.messageImageOnly : '',
                ].join(' ')}
              >
                <div className={styles.bubbleInner}>
                  {!hidePlaceholderText && (
                    <p className={styles.messageText}>{message.messageText}</p>
                  )}
                  {hasAttachment ? (
                    <MessageAttachment
                      message={message}
                      conversationId={conversation.id}
                      downloadAttachment={api.downloadAttachment}
                      onExpandImage={setExpandedImage}
                      onDownload={handleDownload}
                    />
                  ) : null}
                  <footer className={styles.meta}>
                    <time dateTime={message.sentAt}>{formatBubbleTime(message.sentAt)}</time>
                    {message.isMine && <MessageReceipt readAt={message.readAt} />}
                  </footer>
                </div>
              </article>
            );
          })
        )}
        {typingUserId && <p className={styles.typing}>Typing…</p>}
        <div ref={bottomRef} className={styles.bottomAnchor} />
        </div>
      </div>

      <div className={styles.composerDock}>
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
          multiple
          accept=".pdf,.doc,.docx,image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className={styles.fileInput}
          onChange={(event) => {
            handleFilesSelected(event.target.files);
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
          +
        </button>
        <textarea
          className={styles.input}
          rows={1}
          placeholder={conversation.canSendMessages ? 'Message…' : 'Messaging locked'}
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
      </div>

      {expandedImage && (
        <div
          className={styles.imageLightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
          onClick={() => setExpandedImage(null)}
          onKeyDown={(e) => { if (e.key === 'Escape') setExpandedImage(null); }}
        >
          <button type="button" className={styles.imageLightboxClose} onClick={() => setExpandedImage(null)} aria-label="Close">
            ×
          </button>
          <img src={expandedImage} alt="" className={styles.imageLightboxImg} onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      <AttachmentComposer
        open={composerOpen}
        items={pendingAttachments}
        caption={attachmentCaption}
        sending={sending}
        onCaptionChange={setAttachmentCaption}
        onRemove={handleRemovePending}
        onCancel={closeAttachmentComposer}
        onSend={() => void handleConfirmAttachments()}
      />
    </section>
  );
}
