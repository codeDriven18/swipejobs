import type { ChatMessage, ConversationDetail, ConversationSummary } from '@/models/messaging';
import { apiClient, apiClientBlob } from './client';

export const messagingApi = {
  listConversations: () => apiClient<ConversationSummary[]>('/conversations'),

  getUnreadCount: () => apiClient<{ count: number }>('/conversations/unread-count'),

  getConversation: (id: string) => apiClient<ConversationDetail>(`/conversations/${id}`),

  getMessages: (id: string) => apiClient<ChatMessage[]>(`/conversations/${id}/messages`),

  sendMessage: (id: string, messageText: string) =>
    apiClient<ChatMessage>(`/conversations/${id}/messages`, {
      method: 'POST',
      body: { messageText },
    }),

  sendAttachment: async (id: string, file: File, messageText?: string) => {
    const form = new FormData();
    form.append('file', file);
    if (messageText) form.append('messageText', messageText);

    const token = await import('@/lib/authStorage').then((m) => m.getAccessToken());
    const { API_CONFIG } = await import('./config');
    const response = await fetch(`${API_CONFIG.baseUrl}/conversations/${id}/attachments`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => undefined);
      throw new Error((body as { error?: string })?.error ?? 'Failed to upload attachment');
    }
    return response.json() as Promise<ChatMessage>;
  },

  downloadAttachment: (conversationId: string, messageId: string) =>
    apiClientBlob(`/conversations/${conversationId}/attachments/${messageId}`),

  markRead: (id: string) =>
    apiClient<void>(`/conversations/${id}/read`, { method: 'POST' }),
};

export const portalMessagingApi = {
  listConversations: (filter?: string) => {
    const query = filter ? `?filter=${encodeURIComponent(filter)}` : '';
    return apiClient<ConversationSummary[]>(`/portal/conversations${query}`);
  },

  getConversation: (id: string) => apiClient<ConversationDetail>(`/portal/conversations/${id}`),

  getMessages: (id: string) => apiClient<ChatMessage[]>(`/portal/conversations/${id}/messages`),

  sendMessage: (id: string, messageText: string) =>
    apiClient<ChatMessage>(`/portal/conversations/${id}/messages`, {
      method: 'POST',
      body: { messageText },
    }),

  sendAttachment: async (id: string, file: File, messageText?: string) => {
    const form = new FormData();
    form.append('file', file);
    if (messageText) form.append('messageText', messageText);

    const token = await import('@/lib/authStorage').then((m) => m.getAccessToken());
    const { API_CONFIG } = await import('./config');
    const response = await fetch(`${API_CONFIG.baseUrl}/portal/conversations/${id}/attachments`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => undefined);
      throw new Error((body as { error?: string })?.error ?? 'Failed to upload attachment');
    }
    return response.json() as Promise<ChatMessage>;
  },

  markRead: (id: string) =>
    apiClient<void>(`/portal/conversations/${id}/read`, { method: 'POST' }),
};
