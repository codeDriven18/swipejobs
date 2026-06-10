import { useEffect } from 'react';
import * as signalR from '@microsoft/signalr';
import { getAccessToken } from '@/lib/authStorage';
import { useAuth } from '@/context/AuthContext';
import type { AppNotification } from '@/models/personalization';
import { HUB_CONFIG } from '@/api/hubConfig';

const isDev = import.meta.env.DEV;

function logSignalR(message: string, detail?: unknown) {
  if (isDev) {
    console.info(`[SignalR] ${message}`, detail ?? '');
  }
}

export function useNotificationHub(onReceived: (notification: AppNotification) => void) {
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !user?.profileId) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_CONFIG.notificationsUrl, {
        accessTokenFactory: () => getAccessToken() ?? '',
        withCredentials: true,
        transport:
          signalR.HttpTransportType.WebSockets
          | signalR.HttpTransportType.ServerSentEvents
          | signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(isDev ? signalR.LogLevel.Information : signalR.LogLevel.Warning)
      .build();

    connection.on('NotificationReceived', (notification: AppNotification) => {
      onReceived(notification);
    });

    connection.onreconnecting((error) => {
      logSignalR('Reconnecting...', error?.message);
    });

    connection.onreconnected((connectionId) => {
      logSignalR('Reconnected', connectionId);
    });

    connection.onclose((error) => {
      if (error) {
        logSignalR('Connection closed with error', error.message);
      } else {
        logSignalR('Connection closed');
      }
    });

    let cancelled = false;

    void (async () => {
      try {
        logSignalR('Starting connection', HUB_CONFIG.notificationsUrl);
        await connection.start();
        logSignalR('Connected', connection.state);
      } catch (error) {
        if (!cancelled) {
          logSignalR('Failed to start notification hub', error);
        }
      }
    })();

    return () => {
      cancelled = true;
      void connection.stop();
    };
  }, [isAuthenticated, user?.profileId, onReceived]);
}
