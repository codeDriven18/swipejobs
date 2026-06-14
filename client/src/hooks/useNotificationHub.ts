import { useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { getAccessToken } from '@/lib/authStorage';
import { useAuth } from '@/context/AuthContext';
import type { AppNotification } from '@/models/personalization';
import { HUB_CONFIG } from '@/api/hubConfig';

export type HubConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

function logSignalR(message: string, detail?: unknown) {
  if (import.meta.env.DEV) {
    console.info(`[SignalR] ${message}`, detail ?? '');
  }
}

function mapHubState(state: signalR.HubConnectionState): HubConnectionState {
  switch (state) {
    case signalR.HubConnectionState.Connected:
      return 'connected';
    case signalR.HubConnectionState.Reconnecting:
      return 'reconnecting';
    case signalR.HubConnectionState.Connecting:
    case signalR.HubConnectionState.Disconnecting:
      return 'connecting';
    default:
      return 'disconnected';
  }
}

function canStart(state: signalR.HubConnectionState): boolean {
  return state === signalR.HubConnectionState.Disconnected;
}

function canStop(state: signalR.HubConnectionState): boolean {
  return (
    state === signalR.HubConnectionState.Connected
    || state === signalR.HubConnectionState.Connecting
    || state === signalR.HubConnectionState.Reconnecting
  );
}

interface HubSubscriber {
  onReceived: (notification: AppNotification) => void;
  onStateChange?: (state: HubConnectionState) => void;
}

/** Single shared hub connection for the app — avoids duplicate starts from remounts. */
class NotificationHubConnection {
  private static instance: NotificationHubConnection | null = null;

  private connection: signalR.HubConnection | null = null;
  private startPromise: Promise<void> | null = null;
  private starting = false;
  private stopping = false;
  private refCount = 0;
  private subscribers = new Map<number, HubSubscriber>();
  private nextSubscriberId = 0;

  static getInstance(): NotificationHubConnection {
    NotificationHubConnection.instance ??= new NotificationHubConnection();
    return NotificationHubConnection.instance;
  }

  subscribe(subscriber: HubSubscriber): () => void {
    const id = this.nextSubscriberId++;
    this.subscribers.set(id, subscriber);
    this.refCount += 1;

    const connection = this.connection;
    if (connection && connection.state !== signalR.HubConnectionState.Disconnected) {
      subscriber.onStateChange?.(mapHubState(connection.state));
    }

    void this.ensureStarted();

    return () => {
      this.subscribers.delete(id);
      this.refCount = Math.max(0, this.refCount - 1);
      if (this.refCount === 0) {
        void this.stopSafely();
      }
    };
  }

  private notifyState(state: HubConnectionState) {
    this.subscribers.forEach((subscriber) => {
      subscriber.onStateChange?.(state);
    });
  }

  private broadcastNotification(notification: AppNotification) {
    this.subscribers.forEach((subscriber) => {
      subscriber.onReceived(notification);
    });
  }

  private createConnection(): signalR.HubConnection {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_CONFIG.notificationsUrl, {
        accessTokenFactory: () => getAccessToken() ?? '',
        transport:
          signalR.HttpTransportType.WebSockets
          | signalR.HttpTransportType.ServerSentEvents
          | signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(
        import.meta.env.DEV ? signalR.LogLevel.Information : signalR.LogLevel.Warning,
      )
      .build();

    connection.on('NotificationReceived', (notification: AppNotification) => {
      this.broadcastNotification(notification);
    });

    connection.onreconnecting((error) => {
      logSignalR('Reconnecting...', error?.message);
      this.notifyState('reconnecting');
    });

    connection.onreconnected((connectionId) => {
      logSignalR('Reconnected', connectionId);
      this.notifyState('connected');
    });

    connection.onclose((error) => {
      if (error) {
        logSignalR('Connection closed with error', error.message);
      } else {
        logSignalR('Connection closed');
      }

      this.startPromise = null;
      this.starting = false;
      this.notifyState('disconnected');

      if (this.stopping || this.refCount === 0) return;

      // Reconnect after an unexpected drop while subscribers remain active.
      this.connection = null;
      void this.ensureStarted();
    });

    return connection;
  }

  private getOrCreateConnection(): signalR.HubConnection {
    this.connection ??= this.createConnection();
    return this.connection;
  }

  private async ensureStarted(): Promise<void> {
    if (this.refCount === 0 || this.stopping) return;

    const connection = this.getOrCreateConnection();
    const state = connection.state;

    if (
      state === signalR.HubConnectionState.Connected
      || state === signalR.HubConnectionState.Reconnecting
    ) {
      this.notifyState(mapHubState(state));
      return;
    }

    if (this.starting || state === signalR.HubConnectionState.Connecting) {
      await this.startPromise?.catch(() => undefined);
      if (this.refCount > 0 && connection.state === signalR.HubConnectionState.Connected) {
        this.notifyState('connected');
      }
      return;
    }

    if (!canStart(state)) return;

    this.starting = true;
    this.notifyState('connecting');
    logSignalR('Starting connection', HUB_CONFIG.notificationsUrl);

    this.startPromise = connection.start();
    try {
      await this.startPromise;
      if (this.refCount === 0) {
        await this.stopSafely();
        return;
      }
      logSignalR('Connected', connection.state);
      this.notifyState('connected');
    } catch (error) {
      if (this.refCount > 0) {
        logSignalR('Failed to start notification hub', error);
        this.notifyState('disconnected');
      }
    } finally {
      this.starting = false;
      this.startPromise = null;
    }
  }

  private async stopSafely(): Promise<void> {
    if (this.refCount > 0 || this.stopping) return;

    this.stopping = true;
    this.notifyState('disconnected');

    const connection = this.connection;
    if (!connection) {
      this.stopping = false;
      return;
    }

    try {
      if (this.startPromise) {
        await this.startPromise.catch(() => undefined);
      }

      const state = connection.state;
      if (canStop(state)) {
        await connection.stop();
      }
    } catch (error) {
      logSignalR('Error stopping notification hub', error);
    } finally {
      if (this.refCount === 0) {
        this.connection = null;
        this.startPromise = null;
        this.starting = false;
      }
      this.stopping = false;
    }
  }
}

interface UseNotificationHubOptions {
  onReceived: (notification: AppNotification) => void;
  onStateChange?: (state: HubConnectionState) => void;
}

export function useNotificationHub({ onReceived, onStateChange }: UseNotificationHubOptions) {
  const { isAuthenticated, user } = useAuth();
  const onReceivedRef = useRef(onReceived);
  const onStateChangeRef = useRef(onStateChange);
  onReceivedRef.current = onReceived;
  onStateChangeRef.current = onStateChange;

  useEffect(() => {
    if (!isAuthenticated || !user?.profileId) {
      onStateChangeRef.current?.('disconnected');
      return;
    }

    return NotificationHubConnection.getInstance().subscribe({
      onReceived: (notification) => {
        onReceivedRef.current(notification);
      },
      onStateChange: (state) => {
        onStateChangeRef.current?.(state);
      },
    });
  }, [isAuthenticated, user?.profileId]);
}
