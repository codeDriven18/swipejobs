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

function logChatHub(message: string, detail?: unknown) {
  if (import.meta.env.DEV) {
    console.info(`[ChatHub] ${message}`, detail ?? '');
  }
}

function canStop(state: signalR.HubConnectionState): boolean {
  return (
    state === signalR.HubConnectionState.Connected
    || state === signalR.HubConnectionState.Connecting
    || state === signalR.HubConnectionState.Reconnecting
  );
}

function normalizeMessage(message: ChatMessage, currentUserId?: string): ChatMessage {
  const isSystem = message.isSystem ?? message.type === 'System';
  return {
    ...message,
    type: isSystem ? 'System' : 'User',
    isSystem,
    isMine: !isSystem && !!currentUserId && message.senderUserId === currentUserId,
  };
}

export function useChatHub({
  conversationId,
  onMessage,
  onTyping,
  onRead,
}: UseChatHubOptions) {
  const { isAuthenticated, user } = useAuth();
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const startPromiseRef = useRef<Promise<void> | null>(null);
  const startingRef = useRef(false);
  const stoppingRef = useRef(false);
  const activeConversationRef = useRef<string | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  const onMessageRef = useRef(onMessage);
  const onTypingRef = useRef(onTyping);
  const onReadRef = useRef(onRead);
  const userIdRef = useRef(user?.id);
  onMessageRef.current = onMessage;
  onTypingRef.current = onTyping;
  onReadRef.current = onRead;
  userIdRef.current = user?.id;

  useEffect(() => {
    if (!isAuthenticated || !conversationId) return;

    let cancelled = false;
    const sessionConversationId = conversationId;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_CONFIG.chatUrl, {
        accessTokenFactory: () => getAccessToken() ?? '',
      })
      .withAutomaticReconnect()
      .configureLogging(
        import.meta.env.DEV ? signalR.LogLevel.Warning : signalR.LogLevel.Error,
      )
      .build();

    connection.on('MessageReceived', (message: ChatMessage) => {
      onMessageRef.current?.(normalizeMessage(message, userIdRef.current));
    });
    connection.on('Typing', (payload: { senderUserId: string }) => {
      onTypingRef.current?.(payload.senderUserId);
    });
    connection.on('MessagesRead', (payload: { readerUserId: string }) => {
      onReadRef.current?.(payload.readerUserId);
    });

    connectionRef.current = connection;
    activeConversationRef.current = sessionConversationId;
    startingRef.current = true;

    logChatHub('Starting connection', sessionConversationId);

    const startPromise = (async () => {
      await connection.start();
      if (cancelled) return;
      await connection.invoke('JoinConversation', sessionConversationId);
    })();

    startPromiseRef.current = startPromise;

    void startPromise
      .then(() => {
        if (!cancelled) {
          logChatHub('Connected', sessionConversationId);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          logChatHub('Failed to start', error);
        }
      })
      .finally(() => {
        startingRef.current = false;
        if (startPromiseRef.current === startPromise) {
          startPromiseRef.current = null;
        }
      });

    return () => {
      cancelled = true;

      void (async () => {
        if (stoppingRef.current) return;
        stoppingRef.current = true;

        try {
          if (startPromiseRef.current) {
            await startPromiseRef.current.catch(() => undefined);
          } else if (startingRef.current) {
            await startPromise.catch(() => undefined);
          }

          const state = connection.state;
          if (state === signalR.HubConnectionState.Connected) {
            await connection.invoke('LeaveConversation', sessionConversationId).catch(() => undefined);
          }

          if (canStop(connection.state)) {
            await connection.stop();
          }
        } catch (error) {
          logChatHub('Error stopping connection', error);
        } finally {
          stoppingRef.current = false;
          startingRef.current = false;
          startPromiseRef.current = null;
          if (connectionRef.current === connection) {
            connectionRef.current = null;
          }
          if (activeConversationRef.current === sessionConversationId) {
            activeConversationRef.current = null;
          }
        }
      })();
    };
  }, [conversationId, isAuthenticated]);

  const sendTyping = () => {
    const connection = connectionRef.current;
    if (
      !connection
      || connection.state !== signalR.HubConnectionState.Connected
      || !activeConversationRef.current
      || stoppingRef.current
    ) {
      return;
    }

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    void connection.invoke('SendTyping', activeConversationRef.current);
    typingTimeoutRef.current = window.setTimeout(() => {
      typingTimeoutRef.current = null;
    }, 1200);
  };

  return { sendTyping };
}
