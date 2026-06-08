import { API_CONFIG } from './config';

function resolveNotificationsHubUrl(): string {
  return new URL('/hubs/notifications', new URL(API_CONFIG.baseUrl).origin).toString();
}

export const HUB_CONFIG = {
  notificationsUrl: resolveNotificationsHubUrl(),
} as const;
