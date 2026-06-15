import { ApplicationStatus } from '@/models/enums';

export function isMessagingUnlocked(status: ApplicationStatus): boolean {
  return status === ApplicationStatus.InterviewInvited
    || status === ApplicationStatus.Interviewing
    || status === ApplicationStatus.OfferSent;
}

export function isConversationClosed(status: ApplicationStatus): boolean {
  return status === ApplicationStatus.Rejected
    || status === ApplicationStatus.Withdrawn
    || status === ApplicationStatus.Hired;
}

export function formatMessageTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatMessageTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
