import { useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { getAccessToken } from '@/lib/authStorage';
import { HUB_CONFIG } from '@/api/hubConfig';
import { useAuth } from '@/context/AuthContext';
import type { ChatMessage } from '@/models/messaging';

interface UseChatHubOptions {
  conversationId?: string;
  onMessage?: (message: ChatMessage) => void;
  onTyping?: (senderUserId: string) => void;
  onRead?: (readerUserId: string) => void;
}

export function useChatHub({
  conversationId,
  onMessage,
  onTyping,
  onRead,
}: UseChatHubOptions) {
  const { isAuthenticated } = useAuth();
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !conversationId) return;

    let cancelled = false;
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_CONFIG.chatUrl, {
        accessTokenFactory: () => getAccessToken() ?? '',
      })
      .withAutomaticReconnect()
      .build();

    connection.on('MessageReceived', (message: ChatMessage) => {
      onMessage?.(message);
    });
    connection.on('Typing', (payload: { senderUserId: string }) => {
      onTyping?.(payload.senderUserId);
    });
    connection.on('MessagesRead', (payload: { readerUserId: string }) => {
      onRead?.(payload.readerUserId);
    });

    connectionRef.current = connection;

    void (async () => {
      try {
        await connection.start();
        if (cancelled) return;
        await connection.invoke('JoinConversation', conversationId);
      } catch {
        // Realtime is optional; polling still works via page refresh.
      }
    })();

    return () => {
      cancelled = true;
      void connection.invoke('LeaveConversation', conversationId).catch(() => undefined);
      void connection.stop();
      connectionRef.current = null;
    };
  }, [conversationId, isAuthenticated, onMessage, onRead, onTyping]);

  const sendTyping = () => {
    const connection = connectionRef.current;
    if (!connection || connection.state !== signalR.HubConnectionState.Connected || !conversationId) {
      return;
    }

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    void connection.invoke('SendTyping', conversationId);
    typingTimeoutRef.current = window.setTimeout(() => {
      typingTimeoutRef.current = null;
    }, 1200);
  };

  return { sendTyping };
}
