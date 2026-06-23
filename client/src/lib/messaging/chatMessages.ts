import type { ChatMessage } from '@/models/messaging';
import { isImageMimeType } from '@/lib/mediaUrl';

export function normalizeLoadedMessage(message: ChatMessage): ChatMessage {
  const isSystem = message.isSystem ?? message.type === 'System';
  return {
    ...message,
    type: isSystem ? 'System' : 'User',
    isSystem,
  };
}

/** Insert or replace by stable server id; pending client ids are replaced when server id arrives. */
export function upsertMessage(current: ChatMessage[], message: ChatMessage): ChatMessage[] {
  const normalized = normalizeLoadedMessage(message);
  const index = current.findIndex((m) => m.id === normalized.id);
  if (index >= 0) {
    const next = [...current];
    next[index] = { ...next[index], ...normalized };
    return next;
  }
  return [...current, normalized];
}

export function dedupeMessages(messages: ChatMessage[]): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();
  for (const message of messages) {
    byId.set(message.id, normalizeLoadedMessage(message));
  }
  return [...byId.values()].sort(
    (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
  );
}

/** Replace a pending optimistic message with the persisted server message. */
export function replacePendingMessage(
  current: ChatMessage[],
  pendingId: string,
  message: ChatMessage,
): ChatMessage[] {
  const normalized = normalizeLoadedMessage(message);
  const pending = current.find((m) => m.id === pendingId);
  if (pending?.localPreviewUrl?.startsWith('blob:')) {
    URL.revokeObjectURL(pending.localPreviewUrl);
  }
  const withoutPending = current.filter((m) => m.id !== pendingId);
  return upsertMessage(withoutPending, normalized);
}

/**
 * Merge realtime events with optimistic uploads.
 * Avoids duplicate bubbles when SignalR delivers the server event before the HTTP response returns.
 *
 * Matching strategy (in order of specificity):
 *  1. Exact filename match on an uploading pending message (original logic)
 *  2. Any uploading pending message when the server message has an attachmentUrl but no filename
 *     recorded on the pending side yet (race condition in some browsers)
 *  3. For text-only messages, server id deduplication via upsertMessage is sufficient
 */
export function reconcileIncomingMessage(current: ChatMessage[], message: ChatMessage): ChatMessage[] {
  const normalized = normalizeLoadedMessage(message);
  let next = current;

  if (normalized.isMine) {
    if (normalized.attachmentUrl) {
      const pendingIndex = current.findIndex((m) => (
        m.id.startsWith('pending-')
        && m.uploadStatus === 'uploading'
        && (
          m.attachmentFileName === normalized.attachmentFileName
          || !m.attachmentFileName
          || !normalized.attachmentFileName
        )
      ));
      if (pendingIndex >= 0) {
        const pending = current[pendingIndex];
        if (pending.localPreviewUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(pending.localPreviewUrl);
        }
        next = current.filter((_, i) => i !== pendingIndex);
      }
    } else if (!normalized.attachmentUrl) {
      next = current.filter((m) => !(
        m.id.startsWith('pending-')
        && m.uploadStatus === 'uploading'
        && !m.attachmentFileName
        && m.messageText === normalized.messageText
      ));
    }
  }

  return upsertMessage(next, normalized);
}

export function markPendingFailed(current: ChatMessage[], pendingId: string): ChatMessage[] {
  return current.map((m) =>
    m.id === pendingId ? { ...m, uploadStatus: 'failed' as const } : m,
  );
}

export function isAttachmentPlaceholderText(text: string, fileName?: string | null): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (!fileName) return trimmed.startsWith('Shared ');
  return trimmed === fileName
    || trimmed === `Shared ${fileName}`
    || trimmed.startsWith('Shared ');
}

export function isImageFile(file: File): boolean {
  return isImageMimeType(file.type, file.name);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10_240 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function createPendingAttachmentMessage(
  file: File,
  conversationId: string,
  caption?: string,
): ChatMessage {
  const isImage = isImageFile(file);
  return {
    id: `pending-${crypto.randomUUID()}`,
    conversationId,
    isMine: true,
    type: 'User',
    isSystem: false,
    messageText: caption?.trim() ?? '',
    attachmentFileName: file.name,
    attachmentContentType: file.type,
    attachmentFileSize: file.size,
    localPreviewUrl: isImage ? URL.createObjectURL(file) : undefined,
    uploadStatus: 'uploading',
    sentAt: new Date().toISOString(),
  };
}
