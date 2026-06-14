export type SourceHealthStatus =
  | 'Healthy'
  | 'Connected'
  | 'Disabled'
  | 'Syncing'
  | 'Rate Limited'
  | 'Extraction Failed'
  | 'Missing URL'
  | 'Unreachable'
  | 'Message deleted'
  | 'Needs review';

export interface SourceStatusBadge {
  label: SourceHealthStatus | string;
  tone: 'good' | 'muted' | 'syncing' | 'rateLimited' | 'failed' | 'warn';
}

export function resolveSourceStatusBadge(
  healthStatus?: string | null,
  ingestionEnabled?: boolean,
): SourceStatusBadge {
  const status = healthStatus ?? (ingestionEnabled ? 'Connected' : 'Disabled');

  switch (status) {
    case 'Healthy':
    case 'Connected':
      return { label: status, tone: 'good' };
    case 'Disabled':
      return { label: 'Disabled', tone: 'muted' };
    case 'Syncing':
      return { label: 'Syncing', tone: 'syncing' };
    case 'Rate Limited':
      return { label: 'Rate Limited', tone: 'rateLimited' };
    case 'Extraction Failed':
      return { label: 'Extraction Failed', tone: 'failed' };
    default:
      return { label: status, tone: 'warn' };
  }
}

export function formatRelativeTime(iso?: string | null): string {
  if (!iso) return 'Never';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Never';

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function getStatusDetailLabel(healthStatus?: string | null): string | undefined {
  if (!healthStatus) return undefined;
  if (healthStatus === 'Rate Limited') return 'Details available in logs.';
  if (healthStatus === 'Extraction Failed') return 'Details available in logs.';
  return undefined;
}
